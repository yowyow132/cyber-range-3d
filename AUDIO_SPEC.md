# CYBER RANGE 3D — AUDIO_SPEC.md

## 1. Sonic Identity
- **Genre**: Driving F-Minor Cyberpunk Synthwave + layered retro-futuristic Web Audio SFX synthesis.
- **Safety & Controls**: Unlocks `AudioContext` cleanly on first user click (`#start-btn` / `#mute-btn`), master volume slider (`0–100%`, persisted in `cyber_range_vol`), and HUD mute toggle.

## 2. Dynamic Multi-Track BGM (`124 BPM`, Key: F Minor)
- **Bassline**: Resonant lowpass `sawtooth` 8th-note sequence (`F1 - G#1 - A#1 - C2`).
- **Arpeggiator**: `triangle` 16th-note minor 7th pattern (`Fm7`) in combat, shifting to softer filtered `sine` quarter-note pulses when paused or selecting upgrades.
- **Dynamic Percussion & Boss Escalation**: Combat activates kick (`sine` pitch-drop `110→38 Hz`) + off-beat `highpass` noise snare; active Boss waves open filter cutoff (`420 Hz`), double hi-hat density, and add high-octave lead stabs.

## 3. Layered SFX & Anti-Monotony Design
- **Randomized Detune**: Core weapon shots, hits, zaps, drones, and pickups apply `±7–10%` frequency jitter so rapid fire never sounds mechanical.
- **Filtered Noise Transients**: Railgun, shotgun, plasma, damage, reload mechanical click, and explosions combine oscillator sweeps with shaped `bandpass` / `lowpass` / `highpass` white-noise buffers.
- **Combo Pitch Escalation**: Enemy kill chimes ascend progressively with active `comboCount` up to `1.45x` pitch.
