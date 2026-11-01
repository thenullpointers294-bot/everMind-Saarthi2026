# 🧠 EverMind (Saarthi 2026)
### *Remember. Stay Safe. Stay Connected.*

**EverMind** is an intelligent, IoT-enabled wearable pendant and cross-platform companion application designed for elderly care, dementia support, and Alzheimer's assistance. It pairs real-time biomechanical machine learning on the edge with cloud synchronization, multi-channel emergency dispatch, geofenced location oversight, and cognitive health assessment tools.

---

## 🌟 Key Features

### 1. 📿 Smart Wearable Hardware Pendant (ESP32)
* **50 Hz High-Speed Biomechanical Sampling:** Continuously samples an MPU-6050 6-Axis IMU every 20ms using non-blocking microsecond timers.
* **Hampel Outlier Denoising Filter:** Utilizes a 5-sample rolling median window with a $3\sigma$ threshold to eliminate voltage spikes and sensor jitter without dampening real high-$g$ collision signals.
* **Two-Phase Fall Detection:**
  * **Phase 1 (Free-Fall Drop):** Detects near-weightlessness drop ($< 0.48g$).
  * **Phase 2 (Collision Impact):** Detects high-impact deceleration ($> 2.80g$) within a $60\text{ms}–850\text{ms}$ window.
* **Decision Tree Machine Learning (On-Device):** Evaluates multi-axial statistical moments (variance, std-dev, min/max) across sliding 100-sample (2.0s) windows.
* **Dual Physical Buttons:**
  * **Emergency SOS Panic Button (GPIO 32):** Instant cloud and local siren dispatch.
  * **Cancel / Disarm Button (GPIO 27):** Wearer has a 15-second grace window to cancel accidental fall triggers before cloud escalation.
* **NEO-6M GPS Module:** Continuous NMEA latitude/longitude streaming over hardware Serial2.
* **Resonant Piezo Audio Siren:** High-penetration 2.5 kHz square-wave alarm on GPIO 25.

### 2. 📱 Caregiver Dashboard & Oversight Suite
* **Real-Time Telemetry & Safe Zones:** Live map plotting with auto-calculated distances from the wearer's home safe zone.
* **Doctor Cognitive Summary:** Tracks patient scores, reaction latency, and stability trends across cognitive games (*Memory Word Match, Color Sequence Recall, Family Face Recall, Daily Quiz*) with copyable clinical reports for physicians.
* **Multi-Channel Emergency Delivery:**
  * **Native Audio Alarm Chime:** Synthesizes emergency warning tones using Web Audio API on phones/laptops.
  * **Haptic Vibration:** Emergency vibration patterns (`[500, 200, 500, 200, 800]`) on mobile devices.
  * **Heads-Up Alert Overlay Banner:** Persistent global banner displayed across all screens with 1-tap navigation to the Alert Console.
  * **PWA & Native Push Notifications:** Service Worker background notifications with auto-request permissions.
* **Turn-by-Turn Navigation:** One-tap **"Take Me Home"** and **"Navigate to Wearer"** directed straight into Google Maps.
* **Routine & Medication Management:** Real-time synchronized daily schedules for medications, hydration breaks, and walks.

---

## 🛠️ System Architecture

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     EverMind Wearable Pendant   │       │      Caregiver / Wearer App     │
│  (ESP32 + MPU6050 + NEO-6M GPS) │       │  (React 19 + Vite + Tailwind)   │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
        WiFi / HTTPS JSON                         WebSockets / Realtime DB
                 │                                         │
                 ▼                                         ▼
   ┌───────────────────────────────────────────────────────────────┐
   │                  Firebase Realtime Database                   │
   │  • devices/{id}/events (500-event windowed telemetry)         │
   │  • pairings/{code}     (Secure 6-digit cryptographic pairing) │
   │  • patients/{code}     (Reminders, contacts, cognitive games) │
   └───────────────────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

* **Embedded Hardware & Firmware:**
  * ESP32 (Xtensa Dual-Core 32-bit MCU with Hardware Single-Precision FPU)
  * C / C++ with Arduino Framework
  * Adafruit MPU6050, TinyGPSPlus, WiFiClientSecure, HTTPClient
* **Frontend Web & Mobile App:**
  * React 19, TypeScript, Vite, Tailwind CSS
  * Lucide Icons, Leaflet / OpenStreetMap
  * Web Audio API, Web Vibration API, Web Push Service Worker
* **Mobile Packaging:**
  * Capacitor 7 (Android PWA / Native wrapper)
* **Backend & Cloud Infrastructure:**
  * Firebase Realtime Database (Asia Southeast 1)
  * Client-side salted SHA-256 account security with pairing handshake

---

## 🚀 Getting Started

### 1. Web / Companion App Setup

```bash
# Clone the repository
git clone https://github.com/thenullpointers294-bot/everMind-Saarthi2026.git
cd everMind-Saarthi2026

# Install dependencies
npm install

# Run the local development server (accessible over LAN)
npm run dev -- --host
```

Open `https://localhost:5173` or your local LAN IP (`https://<your-ip>:5173`) on your phone.

### 2. Flashing the ESP32 Firmware

1. Open [`firmware/EverMind_ESP32_Wearable_ML.ino`](firmware/EverMind_ESP32_Wearable_ML.ino) in Arduino IDE or VS Code PlatformIO.
2. Install required libraries:
   * `Adafruit MPU6050`
   * `Adafruit Unified Sensor`
   * `TinyGPSPlus`
3. Configure your Wi-Fi credentials in lines 53–54:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_NAME";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```
4. Connect your ESP32 board and click **Upload**.

---

## 📌 Hardware Pinout Reference

| Peripheral | ESP32 GPIO Pin | Description |
| :--- | :--- | :--- |
| **MPU-6050 SDA** | `GPIO 21` | I2C Data (100 kHz) |
| **MPU-6050 SCL** | `GPIO 22` | I2C Clock (100 kHz) |
| **NEO-6M GPS TX** | `GPIO 16` | Connects to ESP32 RX2 |
| **NEO-6M GPS RX** | `GPIO 17` | Connects to ESP32 TX2 |
| **SOS Panic Button** | `GPIO 32` | Push Button (`INPUT_PULLUP`, Active LOW) |
| **Cancel Button** | `GPIO 27` | Push Button (`INPUT_PULLUP`, Active LOW) |
| **Piezo Buzzer** | `GPIO 25` | 2.5 kHz PWM Square Wave |

---

## 🛡️ Disclaimer
*EverMind is a supportive routine companion and personal safety monitoring prototype developed for academic and hackathon evaluation. It is not an FDA-approved medical device.*
