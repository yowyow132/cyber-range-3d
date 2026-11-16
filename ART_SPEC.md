# CYBER RANGE 3D — ART_SPEC.md

## 1. Visual Direction
- **Style**: High-contrast Neon Cyberpunk 3D Arena FPS (Three.js `r128`, default linear crisp neon lighting).
- **Typography**: `'Segoe UI', system-ui, sans-serif` for clean tabular HUD numerals paired with bold Traditional Chinese display headers.

## 2. Strict 5-Color Cyber Palette
| Role | Hex | Usage |
|---|---|---|
| **Background** | `#04101f` | Night sky void gradient, overlay backdrop |
| **Surface** | `#0f172a` | Translucent HUD panels, Pause Build Inspector, Loadout Cards |
| **Primary** | `#00ffcc` | Player weapon energy rails, reticle, active loadout borders, Jump Pads |
| **Accent** | `#38bdf8` / `#facc15` | EXP bar, Shield UI, Critical/Legendary alerts & telegraphed charge lanes |
| **Hazard / Text** | `#ff1f5a` / `#f8fafc` | Boss health & danger circles (`#ff1f5a`), crisp body text (`#f8fafc`) |

## 3. Production Assets Inventory
- `assets/cyber_sky.jpg`: Equirectangular cyberpunk night skyline sky-sphere texture.
- `assets/holo_ad_1.jpg` & `assets/holo_ad_2.jpg`: Floating animated holographic skyline billboard textures.
- `models/PrimaryIonDrive.glb`: Animated uncompressed glTF core suspended above the central arena reactor pylon.
- **Procedural Architectural & VFX Assemblies (`world-art.js`)**:
  - 6 procedural skyline tower archetypes + outer elevated viaduct ring + searchlights + beveled Wedge Spinner hovercars.
  - Multi-layer 3D weapon viewmodels (`pistol`, `smg`, `shotgun`, `railgun`, `plasma`) + 3D forked chain-lightning cylinder arcs + Boss floor telegraph danger zones (`createDangerZoneMesh`, `createChargeLaneMesh`, `createGroundRingWaveMesh`).
