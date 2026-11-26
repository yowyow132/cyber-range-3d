# CYBER RANGE 3D: ROGUELITE

> 📌 **目前開發進度總結與跨電腦接手指南請看：[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)**

A fast-paced 3D Cyberpunk Arena Roguelite FPS built with **Three.js (r128)** and procedural **Web Audio Synthwave BGM + Layered SFX**, featuring telegraphed multi-phase Boss battles, jump-pad aerial combat, 3D time-freeze upgrade card shooting, Demo Mode, Mobile-only touch controls, and optional ESP32 hardware gun integration.

## Features
- **3 Starter Weapon Loadouts**: Pulse Assault Rifle (full-auto mobile), Plasma Grenade Launcher (arc AoE & shield-breaker), Armor-Piercing Railgun Sniper (piercing beam & high crit).
- **Roguelite Synergy & Awakening System**: Shoot 3D holographic cards during Time-Freeze level-ups to stack traits and unlock Awakening / Evolution tiers (`firerate 3/3`, `survival 3/3`, `firepower 3/3`, `exclusive 2/2`).
- **Multi-Phase Telegraphed Bosses**: Orbital red danger circles, jumpable ground shockwave rings (`+100 Air Dodge`), locked charge lanes, and Phase 2 Enraged escort summons.
- **Cyberpunk 3D Arena**: 6 skyline tower archetypes, floating animated billboards, Wedge Spinner hovercars, central `PrimaryIonDrive.glb` reactor core, jump pads, explosive chain barrels, and dynamic arena events.
- **Web Audio Synthwave Engine**: Dynamic `124 BPM` F-Minor synthwave BGM (adapts between Menu, Combat, and Boss Battle) + noise-layered SFX with pitch variation and master volume / sensitivity sliders.
- **Optional ESP32 Controller**: Supports USB Web Serial & Wi-Fi WebSocket physical gun controls.

## Controls
- **Move**: `W` `A` `S` `D`
- **Aim**: Mouse (`Pointer Lock` or automatic compatible fallback mode + `Arrow` keys)
- **Fire / Select 3D Card**: `Left Click` (or `1` / `2` / `3` on cards)
- **Jump / Dodge Shockwave**: `Space` (or Arena Jump Pads)
- **Invulnerable Dash**: `Shift`
- **Reload**: `R`
- **Pause & Build Inspector**: `ESC` or `P`

## Run Locally / GitHub Pages
### One-Click Launcher (Windows, Recommended for Mobile 5G Gyro)
Double-click [`run.bat`](./run.bat) to automatically set up `.venv`, install Python dependencies (`websockets`, `cryptography`), download `cloudflared.exe` if needed, open `http://localhost:8088/`, and start a Cloudflare HTTPS/WSS tunnel for firewall-free phone gyro QR pairing.

### Manual HTTP Server
Serve the directory over HTTP (required for textures & `.glb` model loading):
```bash
python -m http.server 8088
```
Then open `http://localhost:8088/`.

*(Also compatible with GitHub Pages directly from the `main` branch root.)*

## ESP32 Firmware (`esp32-firmware/`)
- `fps_gun.py` (USB Web Serial) includes external analog joystick support on EZ Start Kit+ `IO8` (`GPIO 35`, VRx), `IO9` (`GPIO 32`, VRy), and `IO10` (`GPIO 17`, SW -> `DASH`). Set `ENABLE_JOYSTICK = False` if no joystick is attached.
- To flash the ESP32 gun controller on another PC:
1. Edit `esp32-firmware/esp32/demos/fps_gun_wifi.py` and fill in your `WIFI_SSID` and `WIFI_PASS` (for Wi-Fi wireless mode).
2. Install `uv` (or `pip install mpremote pyserial`) and make sure your ESP32 USB COM driver (CH340 / CP210x) is installed.
3. Run from `esp32-firmware/`:
   ```powershell
   uv sync
   .\tools\upload.ps1 -Lesson fps_gun_wifi
   ```
   *(Or use `-Lesson fps_gun` for USB Web Serial mode.)*

