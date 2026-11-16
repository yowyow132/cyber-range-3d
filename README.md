# CYBER RANGE 3D: ROGUELITE

A fast-paced 3D Cyberpunk Arena Roguelite FPS built with **Three.js (r128)** and procedural **Web Audio Synthwave BGM + Layered SFX**, featuring telegraphed multi-phase Boss battles, jump-pad aerial combat, 3D time-freeze upgrade card shooting, and optional ESP32 hardware gun integration.

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
Serve the directory over HTTP (required for textures & `.glb` model loading):
```bash
python -m http.server 8088
```
Then open `http://localhost:8088/`.

*(Also compatible with GitHub Pages directly from the `main` branch root.)*
