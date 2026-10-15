# VAPS PVT Nexus — Digital PVT Laboratory

An interactive engineering simulator that shows, step by step, how a reservoir-fluid sample moves from the well to the PVT laboratory and through the main PVT tests.

Developed by **Mohammed Hilal Al Awaisi** at Vision Advanced Petroleum Solutions (VAPS), Oman — 2026.

> **Note:** This is a visual training tool. The numbers shown are illustrative values chosen to represent a realistic run. The app does **not** calculate PVT properties from measured data (the separate calculators use published correlations).

## Run it

No install, no build, no server.

- **Online:** open the GitHub Pages link (see *Publish with GitHub Pages* below).
- **Locally:** download or clone the repo and open `index.html` in Chrome or Edge.

## What it covers

| Module | Content |
|---|---|
| 01 · Field Sampling | Overview, bottom-hole sampling (open hole · MRMS, cased hole · SRS), wellhead and separator sampling |
| Sample Transfer | MPSR → SPS/PDS transfer |
| Validation | Opening pressure, restoration, water drainage, homogenization, direct density, recombination |
| 03 · Charging + Flash | Cell charging and single-stage flash |
| Analysis | PV / CCE test, differential liberation, separator test, gas and oil GC, density, viscosity (oscillating piston, kinematic U-tube, single-phase, two-phase) |
| 04 · Report | Final report assembled from the simulator's stage values |
| 05 · Calculators | Oil and gas property correlations |

Each procedure has step controls (play, pause, replay, step selection) and an **Explain** guide describing what is happening physically at each step.

## Project structure

```
index.html          app entry point (script load order)
theme.css           global styles, light/dark theme variables
timing.js           global process-animation speed
runtime.js          template/component engine
assets/             logo
data/               pure-component table, report data set (demonstration values)
components/         process logic and stage simulations (Main.js, Stage*.js, ...)
screens/            one file per screen
PROJECT.md          detailed developer notes for every module
```

See [PROJECT.md](PROJECT.md) for the full developer notes: where each screen lives, layout rules, and the change log for each module.

## Publish with GitHub Pages

1. On GitHub, open the repo → **Settings** → **Pages**.
2. Under *Build and deployment*, choose **Deploy from a branch** → `main` → `/ (root)` → **Save**.
3. After about a minute the app is live at `https://m7wais-byte.github.io/PVT-Nexus-/`.

## Data

All well, field and client names in the report (`DEMO-1`, `Demonstration Field`, `Demonstration Client`) are placeholders. No company or client data is included.

## Credits

- Concept, simulator design and development: Mohammed Hilal Al Awaisi
- Oil and gas property calculator logic: Khalid, integrated into the PVT Nexus workflow
- Organisation: Vision Advanced Petroleum Solutions (VAPS)
