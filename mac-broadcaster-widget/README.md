# 🍎 S.D. Public School - macOS Desktop Broadcaster Widget

A standalone, native macOS Desktop Widget & App built specifically for school Mac computers on the **same local Wi-Fi / Ethernet LAN network** as the Audislave Audio Broadcasting Controller & Smart Bell Hardware.

---

## 🌟 Key Features

1. **Direct LAN Local Control (Zero Tunneling)**:
   - Connects directly to the hardware IP (e.g. `192.168.29.252` or `192.168.1.100`) on the local school network without going through Cloudflare or remote proxies.
2. **IP Input & Persistence**:
   - Save your school Broadcaster Local IP at the top. Auto-saved in local storage.
3. **Real-time LAN Status Indicator**:
   - Pings local hardware every 3 seconds to display **🟢 LAN ONLINE** (with ping latency in ms) or **🔴 OFFLINE**.
4. **Push-to-Talk Live Mic Broadcast**:
   - One-click / Push-to-talk microphone stream with live audio visualizer volume meter.
5. **Instant 1-Click Bell Chimes**:
   - Assembly Bell, Period Bell, Lunch Chime, School Dispersal, Emergency Siren, National Anthem.
6. **Zone & Audio Source Switcher**:
   - Switch between Live Mic (`sMic`), MP3 Tracks (`sFile`), and Line-In Aux (`sAux`).
   - Select room zones (All Rooms `1-200`, Primary `1-50`, Senior `51-120`, Playground `121-150`, Admin `151-200`).
7. **Emergency Stop / Cancel All**:
   - One-click instant cancellation of active broadcasts.
8. **Schedule Profile Switcher & Time Sync**:
   - Switch active bell profiles (Summer, Winter, Exam, Off) and sync Mac system clock to hardware clock in 1 click.

---

## 🚀 How to Run & Install on macOS

### Option 1: Run via Browser / Double-Click HTML
1. Open the file `mac-broadcaster-widget/index.html` in Safari or Chrome.
2. Click the **Share / Settings** button in Safari -> **Add to Dock** to install it as a native Mac app icon on your Mac desktop dock!

### Option 2: Run as Native macOS Desktop App (Electron)
1. Open Terminal and navigate to the directory:
   ```bash
   cd mac-broadcaster-widget
   ```
2. Launch the app directly:
   ```bash
   npm start
   ```

### Option 3: Build Standalone `.app` or `.dmg` macOS Installer
1. Build installer:
   ```bash
   npm run build:mac
   ```
2. The standalone `.app` and `.dmg` file will be generated in `dist/`. Drag and drop into your Mac `/Applications` folder!

---

## 🛠️ Configuration & Customization
- Default Broadcaster IP: `192.168.29.252`
- Default Hardware Port: `80` / `8000`
- Configured for S.D. Public School, Patna.
