/*
============================================================================
              EVERMIND - WEARABLE SMART PENDANT FIRMWARE
    ESP32 + MPU-6050 + NEO-6M GPS + ML + FIREBASE RTDB + HAMPEL FILTER
                      + PHYSICAL SOS BUTTON (GPIO 32)
============================================================================

FEATURES INTEGRATED:
1. Physical Emergency SOS Button on GPIO 32 (Instant cloud dispatch)
2. Physical Cancel / Disarm Button on GPIO 27 (Disarms alarms & clears alert)
3. Hampel Outlier Denoising Filter (removes electrical glitches & false noise)
4. 50 Hz MPU6050 IMU sampling with sliding 2-second ML feature extraction
5. Precision 2-Phase Fall Detection:
   - Phase 1: Free-fall weightlessness (< 0.48g)
   - Phase 2: Impact collision peak (> 2.80g) within 60-850ms
   - Filters out normal hand gestures, walking, & movement
6. Piezo Buzzer Alarm with pure PWM tone (2500 Hz resonant frequency)
7. Real-time Firebase RTDB cloud sync (Device: mg-demo-01)
8. GPS location streaming (NEO-6M on Serial2: Pins 16/17)
9. Telegram alert backup support (optional)
============================================================================
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>
#include <math.h>

// Disable hardware brownout detector in case of USB power dips
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ========================================================
// 1. PIN CONFIGURATION
// ========================================================
#define BUZZER_PIN         25
#define CANCEL_BUTTON_PIN  27  // Push button to cancel / disarm alarm (active LOW)
#define SOS_BUTTON_PIN     32  // Dedicated Emergency SOS Panic button (active LOW)

#define GPS_RX_PIN         16  // ESP32 RX2 <- GPS TX
#define GPS_TX_PIN         17  // ESP32 TX2 -> GPS RX

#define SDA_PIN            21
#define SCL_PIN            22

// ========================================================
// 2. NETWORK & CLOUD CONFIGURATION
// ========================================================
const char* WIFI_SSID     = "ARUBA5";
const char* WIFI_PASSWORD = "internet";

// Firebase Realtime Database
const char* FIREBASE_HOST = "https://ever-mind-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* DEVICE_ID     = "mg-demo-01"; // Paired device ID in EverMind app

// Optional Telegram Backup Bot
const char* BOT_TOKEN     = "YOUR_TELEGRAM_BOT_TOKEN"; 
const char* CHAT_ID       = "YOUR_CARETAKER_CHAT_ID";

// ========================================================
// 3. HARDWARE OBJECTS
// ========================================================
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial GPSSerial(2);

// ========================================================
// 4. HAMPEL OUTLIER DENOISING FILTER
// ========================================================
#define HAMPEL_WINDOW    5
#define HAMPEL_HALF      (HAMPEL_WINDOW / 2)
#define HAMPEL_THRESHOLD 3.0f

class HampelFilter {
private:
  float buffer[HAMPEL_WINDOW];
  int idx;
  bool filled;

  void sortArray(float* arr, int n) {
    for (int i = 0; i < n - 1; i++) {
      for (int j = i + 1; j < n; j++) {
        if (arr[i] > arr[j]) {
          float tmp = arr[i];
          arr[i] = arr[j];
          arr[j] = tmp;
        }
      }
    }
  }

public:
  HampelFilter() : idx(0), filled(false) {
    for (int i = 0; i < HAMPEL_WINDOW; i++) buffer[i] = 1.0f; // 1.0g resting baseline
  }

  float filter(float newVal) {
    buffer[idx] = newVal;
    idx = (idx + 1) % HAMPEL_WINDOW;

    if (!filled) {
      if (idx == 0) filled = true;
      return newVal;
    }

    float sorted[HAMPEL_WINDOW];
    for (int i = 0; i < HAMPEL_WINDOW; i++) sorted[i] = buffer[i];
    sortArray(sorted, HAMPEL_WINDOW);
    float median = sorted[HAMPEL_HALF];

    float diffs[HAMPEL_WINDOW];
    for (int i = 0; i < HAMPEL_WINDOW; i++) {
      diffs[i] = fabsf(sorted[i] - median);
    }
    sortArray(diffs, HAMPEL_WINDOW);
    float medianDiff = diffs[HAMPEL_HALF];

    float MAD = 1.4826f * medianDiff;

    if (fabsf(newVal - median) > (HAMPEL_THRESHOLD * MAD) && MAD > 0.001f) {
      return median; // Outlier detected: replace with median
    }
    return newVal;
  }
};

HampelFilter accelFilter;

// ========================================================
// 5. SENSOR & ML CONFIGURATION
// ========================================================
#define GRAVITY 9.80665f

const uint32_t SAMPLE_INTERVAL = 20000; // 20,000 microseconds = 50 Hz
const int WINDOW_SIZE = 100;            // 100 samples at 50 Hz = 2.0 seconds

// Calibrated physics thresholds
const float FREE_FALL_THRESHOLD = 0.48f; // Genuine weightlessness drop (< 0.48g)
const float IMPACT_THRESHOLD    = 2.80f; // Real collision impact spike (> 2.80g)
const uint32_t MIN_FALL_TIME_MS = 60;    // Drop must last at least 60ms (filters noise)
const uint32_t MAX_FALL_TIME_MS = 850;   // Impact must follow within 850ms of drop

float accelerationWindow[WINDOW_SIZE];
float gyroscopeWindow[WINDOW_SIZE];
int sampleIndex = 0;
uint32_t nextSampleTime = 0;

// GPS variables
double latitude = 0.0;
double longitude = 0.0;
bool gpsValid = false;

// Fall detection state
bool freeFallDetected = false;
uint32_t freeFallTime = 0;

// Alert state
bool alertActive   = false;
bool sosActive     = false;
bool alertDelivered = false;
bool buzzerState   = false;

uint32_t alertStartTime   = 0;
uint32_t lastAlertTime   = 0;
uint32_t lastBuzzerTime  = 0;
uint32_t lastHeartbeatTime = 0;

const uint32_t CANCEL_COUNTDOWN = 15000; // 15 seconds to cancel fall alert
const uint32_t ALERT_COOLDOWN   = 10000; // 10 seconds cooldown between alerts

// Button debounce variables
int lastCancelReading = HIGH;
int stableCancelState = HIGH;
uint32_t cancelChangeTime = 0;

int lastSosReading = HIGH;
int stableSosState = HIGH;
uint32_t sosChangeTime = 0;

// ========================================================
// 6. BUZZER CONTROL (PASSIVE & ACTIVE PIEZO COMPATIBLE)
// ========================================================
void controlBuzzer(bool state) {
  if (state) {
    tone(BUZZER_PIN, 2500); // 2.5 kHz resonant square wave
  } else {
    noTone(BUZZER_PIN);
  }
}

// ========================================================
// 7. FIREBASE DISPATCH HELPER
// ========================================================
bool postFirebaseEvent(const char* eventType) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Cloud] WiFi disconnected. Skipping dispatch.");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  https.setTimeout(8000);

  String url = String(FIREBASE_HOST) + "/devices/" + String(DEVICE_ID) + "/events.json";
  if (!https.begin(client, url)) {
    Serial.println("[Cloud] Error connecting to Firebase host");
    return false;
  }

  https.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"type\":\"" + String(eventType) + "\",";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"hasFix\":" + String(gpsValid ? "true" : "false") + ",";

  if (gpsValid) {
    payload += "\"lat\":" + String(latitude, 6) + ",";
    payload += "\"lon\":" + String(longitude, 6) + ",";
  } else {
    payload += "\"lat\":null,\"lon\":null,";
  }

  if (String(eventType) == "possible_fall") {
    payload += "\"experimental\":true,";
  }

  payload += "\"uptimeMs\":" + String(millis()) + ",";
  payload += "\"createdAt\":{\".sv\":\"timestamp\"}";
  payload += "}";

  int code = https.POST(payload);
  https.end();
  Serial.printf("[Cloud] Event '%s' dispatched -> HTTP Code: %d\n", eventType, code);
  return (code >= 200 && code < 300);
}

// ========================================================
// 8. TELEGRAM ALERT (BACKUP)
// ========================================================
bool sendTelegramAlert(bool isSOS = false) {
  if (strlen(BOT_TOKEN) < 10 || String(BOT_TOKEN) == "YOUR_TELEGRAM_BOT_TOKEN") {
    return false; // Telegram not configured
  }
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  https.setTimeout(10000);

  String url = "https://api.telegram.org/bot" + String(BOT_TOKEN) + "/sendMessage";
  if (!https.begin(client, url)) return false;

  https.addHeader("Content-Type", "application/json");

  String msg = isSOS ? "🆘 *EVERMIND EMERGENCY SOS PANIC ALERT* 🆘\n\nWearer pressed the physical SOS button on their pendant!\n\n"
                     : "🚨 *EVERMIND FALL ALERT* 🚨\n\nPossible fall detected on wearable pendant!\n\n";

  if (gpsValid) {
    msg += "📍 *Location:* " + String(latitude, 6) + ", " + String(longitude, 6) + "\n";
    msg += "🗺️ https://maps.google.com/?q=" + String(latitude, 6) + "," + String(longitude, 6);
  } else {
    msg += "📍 GPS fix acquiring indoors.\n";
  }

  String payload = "{\"chat_id\":\"" + String(CHAT_ID) + "\",\"text\":\"" + msg + "\",\"parse_mode\":\"Markdown\"}";
  int httpCode = https.POST(payload);
  https.end();
  return (httpCode >= 200 && httpCode < 300);
}

// ========================================================
// 9. GPS LOCATION
// ========================================================
void updateGPS() {
  while (GPSSerial.available()) {
    gps.encode(GPSSerial.read());
  }

  if (gps.location.isValid() && gps.location.age() < 5000) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
    gpsValid = true;
  }
}

// ========================================================
// 10. ML MODEL & FEATURE EXTRACTION
// ========================================================
int predictFallModel(const float features[6]) {
  if (features[1] <= 0.31500663f) {
    return 0; // Normal movement
  } else {
    return 1; // Fall-like high variance
  }
}

float calculateMean(float values[], int n) {
  float sum = 0.0f;
  for (int i = 0; i < n; i++) sum += values[i];
  return sum / n;
}

float calculateStandardDeviation(float values[], int n, float mean) {
  float sum = 0.0f;
  for (int i = 0; i < n; i++) {
    float diff = values[i] - mean;
    sum += diff * diff;
  }
  return sqrtf(sum / n);
}

float calculateMinimum(float values[], int n) {
  float minVal = values[0];
  for (int i = 1; i < n; i++) if (values[i] < minVal) minVal = values[i];
  return minVal;
}

float calculateMaximum(float values[], int n) {
  float maxVal = values[0];
  for (int i = 1; i < n; i++) if (values[i] > maxVal) maxVal = values[i];
  return maxVal;
}

// ========================================================
// 11. START / CANCEL / SOS ALERTS
// ========================================================
void startFallAlert() {
  if (alertActive) return;
  if (millis() - lastAlertTime < ALERT_COOLDOWN) return;

  alertActive = true;
  sosActive = false;
  alertDelivered = false;
  alertStartTime = millis();
  lastBuzzerTime = millis();
  buzzerState = true;

  controlBuzzer(true);

  Serial.println("\n");
  Serial.println("===========================================");
  Serial.println("  🚨🚨 POSSIBLE FALL DETECTED! 🚨🚨        ");
  Serial.println("===========================================");
  Serial.println("🔊 BUZZER SOUNDING! Wearer has 15s to cancel.");
  Serial.println("👉 Press button on Pin 27 to CANCEL alert.");
  Serial.println("===========================================\n");
}

void triggerSosAlert() {
  if (millis() - lastAlertTime < 5000) return; // Debounce duplicate triggers

  Serial.println("\n");
  Serial.println("===========================================");
  Serial.println("  🆘🚨 EMERGENCY SOS BUTTON PRESSED! 🚨🆘   ");
  Serial.println("===========================================");
  Serial.println("📡 Dispatching immediate SOS alert to Caregiver!");
  Serial.println("🔊 Sounding emergency siren on buzzer.");
  Serial.println("👉 Press CANCEL button (Pin 27) to disarm.");
  Serial.println("===========================================\n");

  alertActive = true;
  sosActive = true;
  alertDelivered = true; // SOS dispatches immediately without 15s delay
  alertStartTime = millis();
  lastBuzzerTime = millis();
  buzzerState = true;
  controlBuzzer(true);

  // 1. Post immediate SOS event to Firebase RTDB
  postFirebaseEvent("sos");

  // 2. Dispatch immediate Telegram SOS alert
  sendTelegramAlert(true);

  lastAlertTime = millis();
}

void cancelAlert() {
  alertActive = false;
  sosActive = false;
  alertDelivered = false;
  controlBuzzer(false);

  Serial.println("\n===========================================");
  Serial.println("       ✅ ALERT CANCELLED BY WEARER        ");
  Serial.println("===========================================");

  // Inform Caregiver App via Firebase that wearer is OK
  postFirebaseEvent("ok");
  lastAlertTime = millis();
}

// ========================================================
// 12. PHYSICAL BUTTONS HANDLING (PINS 27 & 32)
// ========================================================
void updateButtons() {
  uint32_t now = millis();

  // --- 1. Cancel / Disarm Button (Pin 27) ---
  int cancelRead = digitalRead(CANCEL_BUTTON_PIN);
  if (cancelRead != lastCancelReading) {
    cancelChangeTime = now;
  }
  if (now - cancelChangeTime > 40) {
    if (cancelRead != stableCancelState) {
      stableCancelState = cancelRead;
      if (stableCancelState == LOW && alertActive) {
        cancelAlert();
      }
    }
  }
  lastCancelReading = cancelRead;

  // --- 2. Emergency SOS Button (Pin 32) ---
  int sosRead = digitalRead(SOS_BUTTON_PIN);
  if (sosRead != lastSosReading) {
    sosChangeTime = now;
  }
  if (now - sosChangeTime > 40) {
    if (sosRead != stableSosState) {
      stableSosState = sosRead;
      if (stableSosState == LOW && !alertActive) {
        triggerSosAlert();
      }
    }
  }
  lastSosReading = sosRead;
}

// ========================================================
// 13. ALERT COUNTDOWN & BUZZER PULSING
// ========================================================
void updateAlertCountdown() {
  if (!alertActive) {
    controlBuzzer(false);
    return;
  }

  // Rapid pulsing alarm sound (150ms ON, 100ms OFF)
  if (buzzerState && (millis() - lastBuzzerTime >= 150)) {
    buzzerState = false;
    controlBuzzer(false);
    lastBuzzerTime = millis();
  } else if (!buzzerState && (millis() - lastBuzzerTime >= 100)) {
    buzzerState = true;
    controlBuzzer(true);
    lastBuzzerTime = millis();
  }

  // If this was a Fall Alert (not SOS), 15-second countdown to auto-dispatch:
  if (!sosActive && (millis() - alertStartTime >= CANCEL_COUNTDOWN) && !alertDelivered) {
    alertDelivered = true;
    alertActive = false;
    controlBuzzer(false);

    Serial.println("\n===========================================");
    Serial.println("  🚨 15s COUNTDOWN EXPIRED: DISPATCHING ALERT!");
    Serial.println("===========================================");

    // 1. Post to EverMind Caregiver App via Firebase RTDB
    postFirebaseEvent("possible_fall");

    // 2. Post to Telegram Bot backup
    sendTelegramAlert(false);

    lastAlertTime = millis();
  }

  // Auto-silence SOS siren after 45 seconds if not cancelled
  if (sosActive && (millis() - alertStartTime >= 45000)) {
    alertActive = false;
    sosActive = false;
    controlBuzzer(false);
    Serial.println("[SOS] Siren auto-silenced after 45s.");
  }
}

// ========================================================
// 14. FREE-FALL AND IMPACT DETECTION
// ========================================================
void detectPhysicalFall(float filteredAccel, float gyroMagnitude) {
  uint32_t currentTime = millis();

  // Phase 1: True weightlessness free-fall (< 0.48g)
  if (filteredAccel < FREE_FALL_THRESHOLD) {
    if (!freeFallDetected) {
      freeFallDetected = true;
      freeFallTime = currentTime;
    }
  }

  // Phase 2: Collision impact (> 2.80g) within 60ms to 850ms of free-fall
  if (freeFallDetected) {
    uint32_t fallDuration = currentTime - freeFallTime;

    if (fallDuration >= MIN_FALL_TIME_MS && fallDuration <= MAX_FALL_TIME_MS) {
      if (filteredAccel > IMPACT_THRESHOLD) {
        Serial.printf("[Sensor] 💥 GENUINE FALL DETECTED! (Acc: %.2fg after %ums drop)\n", 
                      filteredAccel, fallDuration);
        freeFallDetected = false;
        startFallAlert(); // Immediate trigger on verified fall!
        return;
      }
    } else if (fallDuration > MAX_FALL_TIME_MS) {
      freeFallDetected = false;
    }
  }

  // Phase 3: Direct severe collision impact (> 4.5g with angular spin > 220 deg/s)
  if (filteredAccel > 4.5f && gyroMagnitude > 220.0f) {
    Serial.printf("[Sensor] 💥 HIGH-G VIOLENT COLLISION! (Acc: %.2fg, Gyro: %.1f deg/s)\n", 
                  filteredAccel, gyroMagnitude);
    startFallAlert();
    return;
  }
}

// ========================================================
// 15. ML CLASSIFICATION (MULTI-FEATURE VALIDATION)
// ========================================================
void classifySensorWindow() {
  float accMean = calculateMean(accelerationWindow, WINDOW_SIZE);
  float accStd  = calculateStandardDeviation(accelerationWindow, WINDOW_SIZE, accMean);
  float accMin  = calculateMinimum(accelerationWindow, WINDOW_SIZE);
  float accMax  = calculateMaximum(accelerationWindow, WINDOW_SIZE);

  float gyroMean = calculateMean(gyroscopeWindow, WINDOW_SIZE);
  float gyroMax  = calculateMaximum(gyroscopeWindow, WINDOW_SIZE);

  float features[6] = { accMean, accStd, accMin, accMax, gyroMean, gyroMax };

  int prediction = predictFallModel(features);

  // Requires high variance, free-fall dip, AND impact peak
  if (prediction == 1 && accMin < FREE_FALL_THRESHOLD && accMax > IMPACT_THRESHOLD && !alertActive) {
    Serial.printf("\n[ML Classifier] Fall window verified! (Min: %.2fg, Max: %.2fg, Std: %.3f)\n", 
                  accMin, accMax, accStd);
    startFallAlert();
  }

  sampleIndex = 0;
}

// ========================================================
// 16. MPU6050 SENSOR READING
// ========================================================
void readMPU6050() {
  uint32_t currentTime = micros();
  if ((int32_t)(currentTime - nextSampleTime) < 0) return;

  nextSampleTime = currentTime + SAMPLE_INTERVAL;

  sensors_event_t a, g, temp;
  if (!mpu.getEvent(&a, &g, &temp)) {
    return; // Safely skip sample if I2C read encountered glitch
  }

  float ax = a.acceleration.x / GRAVITY;
  float ay = a.acceleration.y / GRAVITY;
  float az = a.acceleration.z / GRAVITY;

  float gx = g.gyro.x * 57.2957795f;
  float gy = g.gyro.y * 57.2957795f;
  float gz = g.gyro.z * 57.2957795f;

  float rawMagnitude       = sqrtf(ax * ax + ay * ay + az * az);
  float gyroscopeMagnitude = sqrtf(gx * gx + gy * gy + gz * gz);

  // Apply Hampel Outlier Denoising Filter to eliminate electrical jitter
  float filteredAccel = accelFilter.filter(rawMagnitude);

  detectPhysicalFall(filteredAccel, gyroscopeMagnitude);

  accelerationWindow[sampleIndex] = filteredAccel;
  gyroscopeWindow[sampleIndex]    = gyroscopeMagnitude;
  sampleIndex++;

  if (sampleIndex >= WINDOW_SIZE) {
    classifySensorWindow();
  }
}

// ========================================================
// 17. SETUP
// ========================================================
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(1000);

  // Buzzer starts completely silent
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);

  // Hardware buttons with internal pullups (active LOW)
  pinMode(CANCEL_BUTTON_PIN, INPUT_PULLUP);
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000); // 100 kHz standard stable I2C
  Wire.setTimeOut(50);   // 50ms timeout prevents crash on wire bounce

  GPSSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  Serial.println("\n=========================================");
  Serial.println("      EVERMIND WEARABLE SMART PENDANT     ");
  Serial.println("=========================================");

  if (!mpu.begin()) {
    Serial.println("❌ ERROR: MPU6050 NOT FOUND! Check SDA(21)/SCL(22) wiring.");
    while (true) delay(1000);
  }
  Serial.println("✅ MPU6050 IMU connected successfully");

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_44_HZ);

  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected! Assigned IP: " + WiFi.localIP().toString());
    postFirebaseEvent("location");
  } else {
    Serial.println("\n⚠️ WiFi not yet connected. Will retry in background.");
  }

  nextSampleTime = micros();
  Serial.println("=========================================");
  Serial.println("✅ PENDANT READY & ACTIVELY MONITORING!");
  Serial.println("🆘 SOS Panic Button Active on GPIO 32");
  Serial.println("🛡️ Cancel / Disarm Button Active on GPIO 27");
  Serial.println("🏃 Sampling MPU6050 at 50 Hz with Decision Tree ML");
  Serial.println("💡 Commands: 's' = SOS, 'b' = beep, 'f' = fall");
  Serial.println("=========================================\n");
}

// ========================================================
// 18. MAIN LOOP
// ========================================================
void loop() {
  updateGPS();
  updateButtons();
  updateAlertCountdown();
  readMPU6050();

  // Serial monitor test triggers
  if (Serial.available()) {
    char cmd = Serial.read();
    if (cmd == 's' || cmd == 'S') {
      Serial.println("\n[Test] Manually triggering simulated SOS Panic alert!");
      triggerSosAlert();
    } else if (cmd == 'b' || cmd == 'B') {
      Serial.println("\n[Test] Testing buzzer for 1 second...");
      controlBuzzer(true);
      delay(1000);
      controlBuzzer(false);
      Serial.println("[Test] Buzzer test complete.");
    } else if (cmd == 'f' || cmd == 'F') {
      Serial.println("\n[Test] Manually triggering simulated fall alert!");
      startFallAlert();
    }
  }

  // Periodic heartbeat every 30s to keep Caregiver app "Online"
  if (millis() - lastHeartbeatTime >= 30000) {
    lastHeartbeatTime = millis();
    Serial.println("\n[Heartbeat] Sending periodic telemetry to Firebase...");
    postFirebaseEvent("location");
  }
}
