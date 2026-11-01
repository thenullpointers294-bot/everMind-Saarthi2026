// ============================================================================
//               EVERMIND - WEARABLE SMART PENDANT FIRMWARE
//        ESP32 + MPU-6050 + NEO-6M GPS + FIREBASE RTDB + TELEGRAM
//              Featuring Hampel Outlier Denoising Filter
// ============================================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>
#include <math.h>

// ---------------- PIN CONFIGURATION ----------------
#define BUZZER_PIN       25
#define CANCEL_BUTTON    27   // Push button to cancel false alarms (active LOW)
#define GPS_RX           16   // ESP32 RX2 <- NEO-6M TX
#define GPS_TX           17   // ESP32 TX2 -> NEO-6M RX

// ---------------- NETWORK CONFIGURATION ------------
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ---------------- FIREBASE CONFIGURATION -----------
// Your Firebase Realtime Database URL (Asia Southeast 1 regional endpoint)
const char* FIREBASE_HOST = "https://ever-mind-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* DEVICE_ID     = "mg-demo-01"; // Must match deviceId paired in EverMind app

// ---------------- TELEGRAM BACKUP (OPTIONAL) -------
const char* BOT_TOKEN     = "YOUR_TELEGRAM_BOT_TOKEN"; // e.g. 123456789:ABCdef...
const char* CHAT_ID       = "YOUR_CARETAKER_CHAT_ID";

// ---------------- HARDWARE OBJECTS -----------------
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// ============================================================================
//               HAMPEL OUTLIER FILTER IMPLEMENTATION
// ============================================================================
// The Hampel filter uses Median Absolute Deviation (MAD) to detect and remove
// erratic electrical spikes and sensor noise without blunting real impact falls.
#define HAMPEL_WINDOW    5     // Window size (must be odd: 3, 5, or 7)
#define HAMPEL_HALF      (HAMPEL_WINDOW / 2)
#define HAMPEL_THRESHOLD 3.0   // Number of MAD standard deviations (typically 3.0)

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
    for (int i = 0; i < HAMPEL_WINDOW; i++) buffer[i] = 1.0; // 1.0g resting
  }

  float filter(float newVal) {
    buffer[idx] = newVal;
    idx = (idx + 1) % HAMPEL_WINDOW;

    if (!filled) {
      if (idx == 0) filled = true;
      return newVal;
    }

    // 1. Compute median of current window
    float sorted[HAMPEL_WINDOW];
    for (int i = 0; i < HAMPEL_WINDOW; i++) sorted[i] = buffer[i];
    sortArray(sorted, HAMPEL_WINDOW);
    float median = sorted[HAMPEL_HALF];

    // 2. Compute absolute deviations from median
    float diffs[HAMPEL_WINDOW];
    for (int i = 0; i < HAMPEL_WINDOW; i++) {
      diffs[i] = fabs(sorted[i] - median);
    }
    sortArray(diffs, HAMPEL_WINDOW);
    float medianDiff = diffs[HAMPEL_HALF];

    // 3. Estimate standard deviation using 1.4826 * MAD
    float MAD = 1.4826 * medianDiff;

    // 4. Outlier detection
    if (fabs(newVal - median) > (HAMPEL_THRESHOLD * MAD) && MAD > 0.001) {
      return median; // Glitch/spike rejected, replaced by median
    }
    return newVal;
  }
};

HampelFilter accelFilter;

// ---------------- FALL DETECTION THRESHOLDS --------
const float FREE_FALL_THRESHOLD = 0.55;    // In G units: normal gravity = 1.0g
const float IMPACT_THRESHOLD    = 2.50;    // In G units: sudden deceleration spike
const unsigned long IMPACT_WINDOW   = 1200; // ms allowed between free-fall and impact
const unsigned long CANCEL_TIME     = 15000; // 15-sec pre-alarm for wearer to cancel
const unsigned long COOLDOWN_TIME   = 20000; // Cooldown after alert is resolved

// ---------------- STATE VARIABLES ------------------
bool freeFallDetected = false;
bool alertPending     = false;
bool cooldown         = false;
bool buzzerState      = false;

unsigned long freeFallTime     = 0;
unsigned long alertStartTime   = 0;
unsigned long lastBeepTime     = 0;
unsigned long cooldownStart    = 0;
unsigned long lastHeartbeat    = 0;

// ---------------- GPS VARIABLES --------------------
double latitude      = 0.0;
double longitude     = 0.0;
bool gpsAvailable    = false;
unsigned long lastFixTime = 0;

// ============================================================================
//                  WIFI CONNECTION
// ============================================================================
bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  Serial.println("[WiFi] Connecting...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(400);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
    return true;
  }

  Serial.println("\n[WiFi] Connection Failed!");
  return false;
}

// ============================================================================
//                  GPS ROUTINE
// ============================================================================
void updateGPS() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (gps.location.isValid() && gps.location.age() < 5000) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
    gpsAvailable = true;
    lastFixTime = millis();
  } else {
    // If no recent lock within 10 seconds, mark as unavailable
    if (millis() - lastFixTime > 10000) {
      gpsAvailable = false;
    }
  }
}

// ============================================================================
//                  BUZZER HELPERS
// ============================================================================
void buzzerOn()  { digitalWrite(BUZZER_PIN, HIGH); }
void buzzerOff() { digitalWrite(BUZZER_PIN, LOW); }

bool cancelPressed() {
  if (digitalRead(CANCEL_BUTTON) == LOW) {
    delay(35); // Simple debounce
    if (digitalRead(CANCEL_BUTTON) == LOW) return true;
  }
  return false;
}

// ============================================================================
//                  FIREBASE REST POST EVENT
// ============================================================================
// Posts real-time telemetry events to:
//   https://<HOST>/devices/<DEVICE_ID>/events.json
// Handled event types: "possible_fall", "location", "ok", "sos"
bool postFirebaseEvent(const char* eventType) {
  if (!connectWiFi()) return false;

  WiFiClientSecure client;
  client.setInsecure(); // SSL verification bypass for embedded device

  HTTPClient https;
  https.setTimeout(10000);

  String url = String(FIREBASE_HOST) + "/devices/" + String(DEVICE_ID) + "/events.json";

  if (!https.begin(client, url)) {
    Serial.println("[Firebase] Failed to connect to host");
    return false;
  }

  https.addHeader("Content-Type", "application/json");

  // Construct JSON payload expected by EverMind app
  String payload = "{";
  payload += "\"type\":\"" + String(eventType) + "\",";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"hasFix\":" + String(gpsAvailable ? "true" : "false") + ",";

  if (gpsAvailable) {
    payload += "\"lat\":" + String(latitude, 6) + ",";
    payload += "\"lon\":" + String(longitude, 6) + ",";
    payload += "\"fixAgeMs\":" + String(gps.location.age()) + ",";
  } else {
    payload += "\"lat\":null,";
    payload += "\"lon\":null,";
  }

  if (String(eventType) == "possible_fall") {
    payload += "\"experimental\":true,";
  }

  payload += "\"uptimeMs\":" + String(millis()) + ",";
  payload += "\"createdAt\":{\".sv\":\"timestamp\"}"; // Server-side atomic timestamp
  payload += "}";

  Serial.print("[Firebase] Posting event: ");
  Serial.println(payload);

  int httpCode = https.POST(payload);
  String response = https.getString();
  https.end();

  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("[Firebase] Success! Response code: %d\n", httpCode);
    return true;
  } else {
    Serial.printf("[Firebase] Failed! HTTP Error: %d | Resp: %s\n", httpCode, response.c_str());
    return false;
  }
}

// ============================================================================
//                  TELEGRAM ALERT (BACKUP)
// ============================================================================
bool sendTelegramAlert() {
  if (strlen(BOT_TOKEN) < 10 || String(BOT_TOKEN) == "YOUR_TELEGRAM_BOT_TOKEN") {
    return false; // Skip if user hasn't configured bot
  }
  if (!connectWiFi()) return false;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  https.setTimeout(12000);

  String url = "https://api.telegram.org/bot" + String(BOT_TOKEN) + "/sendMessage";
  if (!https.begin(client, url)) return false;

  https.addHeader("Content-Type", "application/json");

  String msg = "🚨 *EVERMIND FALL ALERT* 🚨\n\n";
  msg += "Possible fall detected on wearable pendant!\n\n";
  if (gpsAvailable) {
    msg += "📍 *Location:* " + String(latitude, 6) + ", " + String(longitude, 6) + "\n";
    msg += "🗺️ https://www.google.com/maps?q=" + String(latitude, 6) + "," + String(longitude, 6);
  } else {
    msg += "📍 GPS fix unavailable (indoors/acquiring).\n";
  }

  String payload = "{\"chat_id\":\"" + String(CHAT_ID) + "\",\"text\":\"" + msg + "\",\"parse_mode\":\"Markdown\"}";
  int httpCode = https.POST(payload);
  https.end();

  return (httpCode >= 200 && httpCode < 300);
}

// ============================================================================
//                  FALL DETECTION ENGINE
// ============================================================================
void detectFall() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Convert raw acceleration from m/s^2 into Gs (1g = 9.80665 m/s^2)
  float ax = a.acceleration.x / 9.80665;
  float ay = a.acceleration.y / 9.80665;
  float az = a.acceleration.z / 9.80665;

  float rawTotal = sqrt(ax * ax + ay * ay + az * az);

  // --- HAMPEL FILTER DENOISING STEP ---
  float cleanTotal = accelFilter.filter(rawTotal);

  unsigned long now = millis();

  // 1. FREE-FALL DETECTION (Weightlessness: total acceleration drops below 0.55g)
  if (cleanTotal < FREE_FALL_THRESHOLD) {
    if (!freeFallDetected) {
      freeFallDetected = true;
      freeFallTime = now;
      Serial.printf("[Sensor] Free fall detected! (Accel: %.2fg)\n", cleanTotal);
    }
  }

  // 2. IMPACT DETECTION (Sharp deceleration spike > 2.5g shortly after free fall)
  if (freeFallDetected && cleanTotal > IMPACT_THRESHOLD) {
    if (now - freeFallTime < IMPACT_WINDOW) {
      Serial.printf("[Sensor] IMPACT DETECTED! (Peak: %.2fg)\n", cleanTotal);
      freeFallDetected = false;
      alertPending = true;
      alertStartTime = now;
      lastBeepTime = 0;
      buzzerOn();
    }
  }

  // 3. EXPIRE OLD FREE-FALL (If no impact occurs within 1.2s, reset)
  if (freeFallDetected && (now - freeFallTime > IMPACT_WINDOW)) {
    freeFallDetected = false;
  }
}

// ============================================================================
//                  ALERT HANDLING & COUNTDOWN
// ============================================================================
void handleAlert() {
  unsigned long now = millis();

  // Beep buzzer every 500ms to warn user
  if (now - lastBeepTime >= 400) {
    lastBeepTime = now;
    buzzerState = !buzzerState;
    digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);
  }

  // Check if wearer presses the cancel button to stop false alarm
  if (cancelPressed()) {
    Serial.println("[Alert] Cancel button pressed by wearer! Disarming...");
    alertPending = false;
    buzzerOff();
    buzzerState = false;
    cooldown = true;
    cooldownStart = now;

    // Notify Firebase app that wearer is OK
    postFirebaseEvent("ok");
    return;
  }

  // If 15 seconds elapsed without cancellation -> DISPATCH EMERGENCY ALERTS
  if (now - alertStartTime >= CANCEL_TIME) {
    Serial.println("[Alert] 15s elapsed! Dispatching emergency notifications...");
    buzzerOff();
    buzzerState = false;

    // Brief attempt to update GPS fix
    unsigned long waitGPS = millis();
    while (millis() - waitGPS < 4000) {
      updateGPS();
      if (gpsAvailable) break;
      delay(20);
    }

    // 1. Send alert to EverMind Caregiver Web App via Firebase RTDB
    postFirebaseEvent("possible_fall");

    // 2. Send Telegram alert to family chat
    sendTelegramAlert();

    alertPending = false;
    cooldown = true;
    cooldownStart = now;
  }
}

// ============================================================================
//                  ARDUINO SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- EVERMIND SMART PENDANT INITIALIZING ---");

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(CANCEL_BUTTON, INPUT_PULLUP);
  buzzerOff();

  // Initialize GPS on Serial2
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("[Hardware] NEO-6M GPS Serial initialized on pins 16/17");

  // Initialize MPU6050 over I2C
  Wire.begin(21, 22); // Standard SDA=21, SCL=22
  if (!mpu.begin()) {
    Serial.println("[Hardware] ERROR: MPU-6050 sensor not found! Check wiring.");
  } else {
    Serial.println("[Hardware] MPU-6050 successfully initialized");
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ); // Hardware low-pass filter
  }

  // Connect to WiFi
  connectWiFi();

  // Send initial startup location heartbeat
  postFirebaseEvent("location");
  lastHeartbeat = millis();
}

// ============================================================================
//                  MAIN LOOP
// ============================================================================
void loop() {
  // 1. Keep GPS parser continuously fed
  updateGPS();

  // 2. Handle cooldown timer after an alert
  if (cooldown) {
    if (millis() - cooldownStart >= COOLDOWN_TIME) {
      cooldown = false;
      Serial.println("[State] Sensor ready for detection.");
    }
    delay(20);
    return;
  }

  // 3. Handle pending fall alert countdown
  if (alertPending) {
    handleAlert();
    delay(10);
    return;
  }

  // 4. Normal detection state: Sample accelerometer
  detectFall();

  // 5. Periodic Heartbeat & Live GPS Location (Every 30 seconds)
  // Ensures the Caregiver Dashboard displays "Online" and live GPS coordinates
  if (millis() - lastHeartbeat >= 30000) {
    lastHeartbeat = millis();
    postFirebaseEvent("location");
  }

  delay(15); // ~60-70 Hz sampling rate
}
