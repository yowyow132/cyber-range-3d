# CYBER RANGE 3D — GAME_SPEC.md

## 1. Core Gameplay Loop (5–30s Loop)
1. **Loadout Selection**: Choose one of 3 starter classes before entering the arena (`脈衝突擊步槍` auto-fire mobile rifle, `電漿榴彈砲` AoE shield-breaker launcher, `穿甲磁軌狙擊` piercing high-crit beam).
2. **Arena Combat & Movement**: 360° FPS movement (`WASD` + `Shift` invulnerable dash + `Space` jump + perimeter Jump Pads) around stepped parkour bunkers and explosive chain barrels.
3. **Collect & Level Up**: Defeated enemies drop EXP gems and (from Bosses / Golden Drones) Heal Orbs. Collecting enough EXP triggers **Time-Freeze 3D Card Selection** — shoot or press `1 / 2 / 3` to equip upgrades toward **Awakening / Evolution Prerequisites** (`firerate x3`, `survival x3`, `firepower x3`, `exclusive x2`).
4. **Dynamic Arena Events & Bosses**: Capture tactical EMP beacons, crack airdrop supply crates, hunt golden drones, and fight multi-phase telegraphed Bosses every 3 waves (`Wave 3, 6, 9...`).

## 2. Controls & Accessibility
- **Aim**: Mouse 360° via Pointer Lock, with automatic **Fallback Cursor/Arrow Aim Mode** (`ArrowLeft/Right/Up/Down` + cursor movement) when Pointer Lock is blocked or unavailable. Sensitivity adjustable (`0.8 – 5.0`) and persisted via `localStorage`.
- **Combat**: Left Click (Fire), `R` (Reload with damped multi-stage weapon animation), `Shift` (Dash with i-frames & FOV speed lines), `Space` (Jump), `P` / `ESC` (Pause & Build Inspector).
- **Optional Hardware**: USB Web Serial & WebSocket Wi-Fi (`esp_wifi_host`) ESP32 physical gun controller support.

## 3. Scoring, Progression & Boss Design
- **Killstreak Combo**: Consecutive kills within `4.2s` scale kill score (`5+ -> 1.25x`, `10+ -> 1.5x`, `20+ -> 2.0x`).
- **Multi-Phase Telegraphed Bosses**: Every Boss enters visible `windup` states before attacks:
  - `orbital_strike`: Filling red floor target circles + guide pillars (`1.0–1.2s` warning).
  - `ground_shockwave`: Expanding horizontal ground energy wave jumpable via `Space` or Jump Pads (`+100 Air Dodge` bonus).
  - `charge_dash`: Locked red floor lane path prior to high-speed rush.
  - `fan` / `spiral`: Multi-wave plasma barrages; **Phase 2 Enraged (`<= 45% HP`)** accelerates cooldowns and summons escort drones.
- **Persistent Records**: Per-loadout best score, wave, and kills saved in `localStorage` (`cyber_range_records_v1`).
