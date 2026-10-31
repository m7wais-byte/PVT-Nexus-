<p align="center">
  <img src="assets/logo.png" alt="VAPS" height="64">
</p>

<h1 align="center">VAPS PVT Nexus</h1>
<p align="center"><b>An Integrated Digital Reservoir Fluid Workflow — from field sampling to the final PVT report</b></p>

<p align="center">
  <a href="https://m7wais-byte.github.io/PVT-Nexus-/"><b>Launch the simulator</b></a> ·
  <a href="https://m7wais-byte.github.io/PVT-Nexus-/overview.html">Project overview</a> ·
  <a href="PROJECT.md">Developer notes</a>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-v2.4-4d9dff">
  <img alt="status" src="https://img.shields.io/badge/status-interactive%20prototype-46d39a">
  <img alt="stack" src="https://img.shields.io/badge/stack-HTML%20%C2%B7%20CSS%20%C2%B7%20JavaScript-e7b15a">
  <img alt="build" src="https://img.shields.io/badge/build-none%20required-38cdb8">
</p>

---

## Overview

**VAPS PVT Nexus** is an interactive engineering simulator that shows how reservoir-fluid (PVT) work is actually carried out — from collecting the sample in the field, through laboratory quality control, to the PVT test programme, property calculations and the final report.

Every module follows the real order of operations. One action unlocks the next, so the sequence itself teaches the procedure. Valves, pistons, fluid levels, pressures and volumes are driven by one shared sample state, so the equipment on screen stays consistent from step to step.

| | |
|---|---|
| **Purpose** | Make complex PVT workflows easier to understand, practise and review |
| **Users** | Engineers, laboratory personnel, trainees and technical learners |
| **Stage** | Interactive prototype under continuous technical development |
| **Version** | v2.4 · 2026 |

> [!NOTE]
> **Representative values.** Readings in the sampling, validation and test modules are illustrative values chosen to represent a realistic run; the simulator does not derive PVT properties from measured data. The **Oil and Gas Calculators** are the exception — they compute live from published industry correlations.

---

## Workflow

```
 Field Sampling ──► Sample Transfer ──► Validation (QC) ──► PVT Analysis ──► Calculations ──► Final Report
```

### 01 · PVT Sampling
Three field sampling routes, each with live tool, bottle and flow behaviour.

| Route | What the simulator shows |
|---|---|
| **Bottom hole — open hole** | Wireline truck and drilling-rig mast, formation tester string (probe, fluid analyser, pump-out), pump-out clean-up with contamination monitoring, filling and sealing of piston sample bottles (MPSR) |
| **Bottom hole — cased hole** | Wireline unit, lubricator and pressure-control stack, single-phase reservoir sampler (SRS) with clock trigger and N₂ compensation |
| **Wellhead** | Dedicated sampling line into a piston bottle |
| **Separator** | Independent paths — separator oil into a piston bottle, separator gas into a pressurised gas bottle |

The downhole programme runs step by step: running in hole → setting the tool → formation communication → pump-out clean-up → sampling → sealing → pulling out of hole.

### Sample Transfer
Transfer of the bottom-hole sample from one **SPMC chamber** (taken from the MDT multisample module, MRMS) into an SPS/PDS laboratory bottle. The pump drives the SPMC through its end connection; the SPMC cutaway shows the piston train sweeping the sample out while the drive fluid stays behind the pistons, and a gauge on the transfer line shows the line pressure. The receiving bottle's floating piston and oil / water levels follow the same transfer clock. **SPMC Details** (or a click on the chamber) opens the MRMS module assembly with its six selectable chambers and the individual SPMC in 2D and 3D.

### 02 · Validation (Sample Quality Control)
Run any procedure directly, or the full validation sequence.

| Procedure | Purpose |
|---|---|
| Opening Pressure | Record cylinder opening pressure and confirm sample integrity |
| Restoration | Restore the sample to its restoration pressure and temperature |
| Water Check | Check and quantify free water; drain it while retaining the oil |
| Agitation | Homogenise the sample by slow 180° inversion at restored conditions |
| Direct Density | Determine density from measured mass and transferred volume |
| Recombination | Measure separator gas and oil, then combine and mix them in one bottle |

### 03 · Charging and Flash
- **Charging** — charge the validated sample into the PVT cell.
- **Flash** — single-stage flash to standard conditions, with flash-unit evacuation, helium charge from the gasometer, and gas collection into the balloon.

### Detailed PVT Analysis

| Test | What the simulator shows |
|---|---|
| **PV / CCE** | Constant-composition expansion: two-pump agitation cycle, stabilisation, P–V points, and bubble point taken from the intersection of the two trends |
| **Differential Liberation** | Fluid behaviour as pressure is reduced in stages, with gas removal at each stage |
| **Separator Test** | Fluid behaviour at separator conditions |
| **Gas Chromatography** | Gas and oil composition — gas sample inlet with injection valve, oil autosampler, carrier gas, oven / column, detector and chromatogram |
| **Viscosity** | Four methods: oscillating-piston viscometer, kinematic U-tube (ν = C × t), single-phase falling-body viscosity versus pressure, and two-phase viscosity from the PVT cell |

### 04 · Report
A full **Final Report** assembled from the simulator's own stage values: cover, summary, Tables 1–14, Figures 1–10 and appendices (including a list of every assumption). Exports through **Print / PDF** and **Export Word**.

### Sample bottles and Bottle Details
Every sample bottle in the procedures uses the approved **Oil Sample Bottle** (floating-piston cylinder with valve protectors, seals, guide ring and a loose mixing ring) and **Gas Sample Bottle** (seamless double-ended cylinder) designs — the same two drawings on every page and in Bottle Details, with the page tubing connected to their valve outlets. Each page has a **Bottle Details** button (and the bottle itself is clickable) that opens the bottle in a 2D technical view or an interactive 3D model, exterior or cutaway, with part explanations and the operating principle. Opening it pauses the running stage; **Back to Procedure** returns to the same stage and values, and the procedure resumes when you press Resume.

### 05 · PVT Calculator
A full-page engineering calculator with an Oil / Gas selector and five views — **Inputs · Charts · Results Table · Measured Data · Methods & References** — plus the right-side *Explain This Stage* drawer.

| | Properties and methods |
|---|---|
| **Oil** | Rs, Bo, μo and undersaturated co versus pressure; API, pb / Rsb, Bob, μod, μob. Rs/pb: Standing, Vasquez-Beggs, Glasø, Al-Marhoun, Petrosky-Farshad. Bo (p ≤ pb): the same five. co and Bo (p > pb): Vasquez-Beggs, Petrosky-Farshad. μ: Beal / Beggs-Robinson / Glasø dead oil → Beggs-Robinson saturated → Vasquez-Beggs undersaturated. One measured input (pb **or** Rsb) controls the saturated / undersaturated split at every pressure. |
| **Gas** | Z, Bg, ρg, μg and cg versus pressure; Ma, γg, Ppc/Tpc, Ppr/Tpr, v, Eg. Pseudo-criticals: Standing natural / condensate, Sutton, Kay (composition). Sour gas: Wichert-Aziz, Carr-Kobayashi-Burrows. Z: Dranchuk-Abou-Kassem, Papay, Beggs-Brill, or a manual Standing-Katz chart reading (single pressure). μg: Lee-Gonzalez-Eakin. Ideal-gas mode sets Z = 1 for every dependent property. |

Single pressure, pressure range or a pasted pressure list; Field or Metric units with absolute or gauge pressure; interactive charts (hover, click-to-select with the equation and substituted values, correlation comparison, measured-data overlay, gaps for invalid values); CSV and PNG export; measured-data error statistics and the multi-sample oil batch evaluation. Equations, units, data ranges and sources: [calc/README.md](calc/README.md).

---

## Features

- **Guided procedures** — real operational order; each step unlocks the next.
- **Linked process model** — one shared sample state drives every valve, piston, level, pressure and volume.
- **Explain panel** — a step-by-step guide describing what is happening physically at each stage.
- **Procedure controls** — play, pause, replay and step selection on every process.
- **Continuous record** — the same sample carries through sampling, validation and testing into the report.
- **Light and dark themes** — toggle in the top bar or in Settings.
- **Adjustable animation speed** — one global value in `timing.js`.
- **No installation** — plain HTML, CSS and JavaScript; runs offline in any modern browser.

---

## Getting started

**Online:** open the [live simulator](https://m7wais-byte.github.io/PVT-Nexus-/).

**Locally:**
```bash
git clone https://github.com/m7wais-byte/PVT-Nexus-.git
cd PVT-Nexus-
# open index.html in Chrome or Edge (double-click works — no server needed)
```

The Bottle Details **3D view** uses ES modules, which browsers do not load from `file://`. To use it locally, serve the folder instead, e.g. `python3 -m http.server 8000` and open `http://localhost:8000/`. Everything else, including the 2D equipment drawings, works from a double-click.

Recommended: a desktop browser at 1366 × 768 or larger.

---

## Project structure

```
PVT-Nexus-/
├── index.html          Simulator entry point (page shell and script load order)
├── overview.html       Project overview page
├── theme.css           Global styles and light / dark theme variables
├── timing.js           Global process-animation speed (PROCESS_SPEED_MULTIPLIER)
├── runtime.js          Lightweight template / component engine
├── assets/             Logo
├── equipment/          Bottle / SPMC Details: equipment data, 2D drawings (bottle-draw.js, mrms-draw.js), 3D viewers (bottle3d.js, mrms3d.js), SPMC principle, styles
├── vendor/             three.js r160 (MIT) for the 3D viewer, loaded on demand
├── prototypes/bottles/ Standalone bottle design review page (uses equipment/ and vendor/)
├── data/
│   ├── pure-components.js   Pure-component reference table (MW, Pc, Tc)
│   └── report-data.js       Final Report data set (demonstration values)
├── components/         Process logic and stage simulations
│   ├── Main.js              App shell and shared process logic
│   ├── BottomHoleSim.js     Open-hole and cased-hole sampling
│   ├── RecombSim.js         Recombination
│   ├── StagePVTest.js       PV / CCE test
│   ├── StageDiffLib.js      Differential liberation
│   ├── StageSeparator.js    Separator test
│   ├── StageGC.js           Gas and oil chromatography
│   ├── StageVisc*.js        Viscosity methods
│   ├── StageDensity.js      Direct density
│   ├── StageReport.js       Final Report
│   ├── PvtCalc.js / PvtChart.js / OilBatch.js   PVT Calculator (page, chart, batch tool)
│   ├── BottleArt.js         Shared sample-bottle drawings for the procedures
│   ├── BottleDetails.js     Bottle Details overlay
│   ├── SpmcDetails.js       SPMC Details overlay (MRMS assembly, SPMC chamber)
│   └── StepGuide.js         Explain panel content
├── calc/               PVT Calculator core: units, correlations, engine, measured data (pure, tested)
├── tests/              node --test tests/*.test.js  ·  node tests/ui.e2e.js
├── screens/            One file per screen
└── PROJECT.md          Detailed developer notes
```

See **[PROJECT.md](PROJECT.md)** for where each screen lives, layout and theme rules, and the change log of every module.

---

## Deploying with GitHub Pages

1. Repository → **Settings** → **Pages**
2. **Deploy from a branch** → `main` → `/ (root)` → **Save**
3. The simulator goes live at `https://m7wais-byte.github.io/PVT-Nexus-/`

---

## Data and confidentiality

All names in the report data set — `Demonstration Client`, `Demonstration Field`, `DEMO-1`, `Reservoir A` — are placeholders. No company or client data is included. Every assumption used to complete the report is listed in its Appendix B.

---

## Credits

| Role | |
|---|---|
| Concept, simulator design and development | **Mohammed Hilal Al Awaisi** |
| Oil and gas calculator logic | Khalid — integrated into the PVT Nexus workflow |
| Organisation | Vision Advanced Petroleum Solutions (VAPS), Oman |
