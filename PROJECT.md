# VAPS PVT Nexus — Digital PVT Laboratory

Standalone web app. Open `index.html` in any browser — no build step, no server,
no Claude Design canvas.

## Purpose

A visual digital model of the PVT laboratory workflow: how each procedure is
carried out, step by step. The displayed numbers are illustrative values chosen
to represent a realistic run — **the app does not calculate PVT properties**.

## Layout

```
index.html              page shell, font + stylesheet links, script order
timing.js               PROCESS_SPEED_MULTIPLIER - global speed of every process animation
runtime.js              template/component engine (replaces the Design canvas)
components/ProcCtl.js   shared procedure control: pausable process clock (PCLK), pause freeze, procedure panel
theme.css               global styles and CSS variables
assets/logo.png         VAPS logo
data/pure-components.js pure-component reference table (MW, Pc, Tc)
data/report-data.js     Final Report data set (window.PVT_REPORT) - all report tables/figures

components/
  PVTCellArt.js         the approved shared PVT cell drawing (see "PVT Cell — approved shared design")
  CellDetails.js        "Cell Details" overlay for the approved PVT cell (Exterior / Cutaway / Plumbing)
  Main.js               app shell markup + ALL process logic (41 methods)
  StageDiffLib.js       differential liberation
  StageSeparator.js     separator test (rebuilt 2026-09-30) - see "Separator Test" section below
  StageGC.js            GC (gas + oil). Oil = instrument view with autosampler (unchanged 2026-09-28).
                        GAS MODE WAS REBUILT 2026-09-30 - see "Gas GC — revised procedure (2026-09-30)" below;
                        the older gas notes in this entry and in the 2026-09-29 sections are superseded.
                        Gas (2026-09-28) reuses the Oil GC drawing (carrier cylinder, regulator, flow
                        controller, GC housing, oven/coil, detector, control panel, chromatogram + tabs)
                        with the autosampler replaced by a gas sample inlet (0.25 mL loop).
                        Gas layout (2026-09-28 b): Helium cylinder -> Gas Balloon Oven -> GC -> computer.
                        GC drawing shifted as one group (GQ_DX = 266), oven assembly as one group (GQ_OX = -732).
                        Helium line runs high (y 74) into the inlet top-right; sample line runs lower (y 132)
                        from the oven roof through the SAMPLE INJECTION VALVE (GIV, rotary, OFF/ON) to the
                        inlet top-left. GC vacuum port on the inlet's right face -> VACUUM ISOLATION VALVE (GVV,
                        quarter-turn) -> removable hose + pump (hidden except during evacuation). Short data
                        cable GC -> computer (old detector cable routed past the oven removed).
                        Sequence: vac -> iso (close valve, stop + remove pump) -> heat -> setflow -> carrier
                        (helium through inlet/loop/column/detector, IV OFF) -> ginj (IV ON, sample slug,
                        IV back OFF, helium sweeps slug to column head) -> run -> proc (gasActivate()).
                        Values in GC.gas.bal / GC.gas.vac unchanged: balloon 14.5 psia @ 25 C -> 80 C, vacuum
                        14.7 -> 0.005 psia (held after the valve closes), injection draw-down 15 %. GC line
                        pressure shows GC.head (18 psig, existing illustrative value) once helium flows.
                        Explain text per gas step: steps()[i].w / .e (read by StepGuide).
                        Backup: StageGC.js.bak_gasgc_injector (before this change)
  StagePVTest.js        PV / CCE test
  StageVisc.js          viscosity — ViscoLab PVT+ oscillating-piston principle
  StageViscKin.js       kinematic viscosity — U-tube viscometer, 114 °C silicone-oil bath,
                        timer Point 3 -> Point 4, nu = C x t (flow model + Explain text inside)
                        flow playback slowed for display only (VIEW_VMAX meniscus-speed cap;
                        trajectory, t3/t4 and flow time unchanged)
  StageViscSingle.js    single-phase viscosity vs pressure - pump -> SPS/PDS -> falling-body
                        viscometer (bottom in / top out, bleed valve on top outlet); load + 15 cc
                        flush at 5,500 psig, then measure 5,500 -> 3,000 psig in 500 psi steps
                        (mu = K x t; values from report Psat/mu via Vasquez-Beggs, illustrative)
                        Schematic = full bench assembly: inclined instrument (DEV_T: 30 deg tilt,
                        internals keep local coords so the body moves along the axis), jacket
                        cutaway window, base/pivot/leg/support arm, thermostat bath + hoses,
                        controller (live t / mu) + pressure display (live PT), waste glass
                        (live flushed volume). Chamber oil level stays horizontal in the tilted bore.
                        Page layout (simplified): short step instruction + live action line (derived
                        from state), numbered step selector, essential labels only; technical labels
                        behind "Show Components"; equipment not used in the current step is greyed
                        (INV map in renderVals); right panel = pressure / temperature / viscosity +
                        Graph|Table results shown after the first point.
                        Pressure: SPS/PDS is at 5,500 psig before injection (BOTTLE_P). The viscometer
                        PT is blank until sample enters, then reads 5,500 psig (equalized, bleed
                        closed) - not tied to % filled. Step 2 = "Flush 15 cc" at 5,500 psig held
                        by the pump; no separate pressurization. Oil drawn as continuous amber;
                        tubing corners are bent arcs (roundPts).
                        Layout (2026-09-28): schematic-first page. Before measurement only the schematic is shown
                        (full width); the results column (graph + table) slides in when the first
                        measurement starts (resOn = measured points or measuring) and hides again on
                        Reset. Table lists measured points + the point in progress only. Live readings
                        are compact chips in the head row; Show Components + Inclination sit in the
                        bottom control bar. Low hinge PIV y=447: instrument base sits on the plate.
                        Layout (2026-09-27): viscometer LEFT, SPS/PDS bottle + mirrored transfer pump RIGHT.
                        Sample line: bottle top -> overhead run (IN_TOP) -> riser IN_X -> bottom inlet;
                        top outlet -> waste run (TAIL_Y) -> waste glass top-LEFT. Controller, pressure
                        display and thermostat bath sit on a shelf under the bench; hoses/cables drawn
                        behind the stand. Flow arrows follow this route.
                        Instrument: anodized rail on the hinge line, stainless body, two coil collars,
                        hex end caps, cutaway (chamber + body); rotates as one assembly about the bottom
                        hinge PIN (local 578,596) fixed at PIV; upper end tilts LEFT (drawing angle =
                        -incl), clamp rides a fixed quadrant guide (vertical arm = 0 deg reference) with
                        a live angle badge. "Inclination" slider 0..90 deg = DEMONSTRATION only
                        (INCL0 = 32), locked while a step runs, NOT used in mu. All instrument-attached
                        geometry (tubing ends, hoses, cables, labels, chamber level) comes from geo(incl);
                        component labels stack outward at steep tilts. Backup: StageViscSingle.js.bak_swap_0to90
  BottomHoleSim.js      Module 01 Bottom Hole page (Open Hole + Cased Hole), native DOM/SVG module
                        mounted by Main.syncBhSim() into the bhHost div of showModule01.js.
                        ONE timeline (t) -> pure state functions ohState()/chState(): tool depth, probe,
                        valves, pump, chamber levels, flows and readings. drawOhTool()/drawSrsTool() draw
                        the tool; the same function draws the tool in the well (scaled K) and the enlarged
                        cutaway, so both always match. Pause/resume, replay, step navigation are exact.
                        Open hole: wireline truck -> lower/top sheave on drilling-rig mast -> BOP -> casing
                        -> open hole. MDT-type string: probe module (probe + backup) -> fluid analyzer ->
                        pumpout (exhaust to wellbore) -> MRMS with 2 MPSR bottles (piston, buffer vented).
                        Cased hole: wireline unit -> gin-pole sheaves -> grease head -> lubricator -> wireline
                        BOP -> tree; tubing/packer/perforations; flowline wing -> choke -> test separator
                        (gas/oil/water outlets). SRS: clock trigger, inlet valve, piston chamber, restrictor,
                        air chamber, N2 compensation.
                        Values: 8,450 ft, 4,820 psia, 238 F, Psat 2,515 psia from report data; mud 5,050,
                        pretest 4,600, flowing 4,700 / 4,640 psia, WHP 1,465 psia are ILLUSTRATIVE (ILL const).
                        Completion -> Main.state.phase = 'done' (Move to Lab). Explain = StepGuide card
                        (BottomHoleSim.describe()); the floating Explain pill is hidden on this page.
  StageDensity.js       density measurement
  RecombSim.js          Validation > Recombination (screen 'recomb', after Direct Density) - native DOM/SVG
                        module mounted by Main.syncRecomb() into rcHost (screens/showRecomb.js). See section below.
  StageReport.js        report stage (placeholder)
  PvtCalc.js            PVT Calculator page (Module 05): Oil / Gas, five views, Explain drawer - see "Calculators"
  PvtChart.js           interactive SVG property chart used by PvtCalc
  OilBatch.js           multi-sample oil batch evaluation (Measured Data view)

screens/                one file per screen, each registers a named slot
  showSplash.js         splash
  showDash.js           dashboard
  showModule01.js       field sampling  (largest: bottom hole, wellhead, separator)
  showXfer.js           SPMC chamber -> SPS/PDS transfer (source SPMC drawn by MRDraw.xfer, SPMC Details)
  showRestore.js        sample restoration
  showTest.js           charging + flash test
  showValidation.js     validation control centre
  showAnalysis.js       analysis menu
  showSeparator.js      separator test
  showVisc.js           viscosity stage
  showCalc.js           PVT Calculator host (PvtCalc mounts into it)
  showReport.js         report
  showAbout.js          about
  showSettings.js       settings
  showTopBar.js         top navigation bar
```

## Where things live

| I want to change… | Edit |
|---|---|
| A colour, font, spacing used everywhere | `theme.css` |
| What one screen looks like | `screens/<name>.js` |
| How a process animates or sequences | the matching method in `components/Main.js` |
| A displayed value or label | `renderVals()` at the bottom of `components/Main.js` |
| A stage's own behaviour | `components/Stage*.js` |

## Screen keys

`Main.js` switches on `this.state.screen`:

| Key | Screen |
|---|---|
| `splash` | splash |
| `dashboard` | dashboard |
| `module01` | field sampling |
| `mdtXfer` | sample transfer |
| `module02` | restoration |
| `module03` | charging + flash |
| `module04` | report |
| `module05` | calculators |
| `analysis` | analysis menu |
| `difflib` `separator` `gc` `visc` `pvTest` `density` | analysis stages |
| `validation` `about` `settings` | support screens |

## Sample bottles and Bottle Details (2026-10-19)

Every sample bottle in the procedures is the approved **Oil Sample Bottle** or **Gas Sample Bottle** — the same
drawing as Bottle Details (`equipment/bottle-draw.js`, PBDraw), placed with one transform (translate · rotate ·
uniform scale) through `components/BottleArt.js` (window.BottleArt). There are no other bottle variants.
- `BottleArt.oil(p, o)` — floating piston, loose mixing ring, sample and driving-fluid chambers, end caps and
  right-angle needle valves; the page supplies only live state (fill / piston styles or its own bore contents in the
  approved bore units -226..226 with a 46-unit piston, valve-state ring and needle lift). `oilPort` gives the world
  point of each valve's side outlet, where the page tubing ends. `BottleArt.gas(p, o)` / `gasPort` likewise for the
  gas bottle. `pill` — SVG "Bottle Details" button.
- `components/SampleBottle.js` (Sampling pages) places the same oil / gas drawings in the old Sampling frame.
- Tubing was re-routed to the approved side outlets; flow connections, valve states, values, timing and stage
  order are unchanged. Line valves that belong to the rig stay separate from the bottle's own valves.
- Visual standardization only: where a procedure text describes another bottle arrangement (for example nitrogen
  back-pressure in the wellhead guide), the drawing does not depict that mechanism.

| Page | Bottle | Bottle Details |
|---|---|---|
| Sampling · Wellhead (`showModule01`) | field oil bottle | `oil` |
| Sampling · Separator | oil bottle + gas bottle | `oil` + `gas` (selector) |
| Validation · Sample Transfer (`showXfer`) | SPS/PDS receiving bottle | `oil` |
| Validation · steps 1–3 (`showRestore`) | SPS/PDS, inverted (driving side up) | `oil` |
| Validation · step 4 (`QcAgitSim`) | SPS/PDS on the inversion stand | `oil` |
| Validation · Charging (`showTest`) | SPS/PDS charging rig | `oil` |
| Validation · Recombination (`RecombSim`) | GSP gas bottle, gas receiving bottle, separator oil bottle, recombination bottle | `gas` + `oil` (selector with functional names, `data-bd-labels`) |
| Analysis · Single-phase viscosity (`StageViscSingle`) | SPS/PDS rig | `oil` |
| Analysis · GC gas (`StageGC`) | active and spare gas bottles in the balloon oven | `gas` |

Not sample bottles (unchanged): MDT/MPSR downhole bottles (BottomHoleSim), the source SPMC chamber on showXfer
(see "SPMC source and SPMC Details" below), PVT cells, pumps, flash balloon, helium cylinder.

**Bottle Details** (`components/BottleDetails.js`): any element with `data-bd-open="oil|gas"` (both types separated
by `|` open a selector) and optional `data-bd-ctx` opens a full-screen overlay outside #app with the approved
viewer — 2D (`equipment/bottle-draw.js`) / 3D (`equipment/bottle3d.js`, imported on first use and destroyed on close),
exterior / cutaway, upright / horizontal, labels, clickable parts and operating principle
(`EQUIPMENT.*.principle` in `equipment/equipment-data.js`).
Opening calls `PC.hold(true)` (ProcCtl.js): a running stage is paused through its own Pause action, animations freeze;
closing returns to the same stage and values and the user resumes from the panel. General equipment view only.

## PVT Cell — approved shared design (2026-10-20)

Every PVT cell in the procedures is the ONE approved dual-cylinder cell from the design review
(`prototypes/pvt-cell/`), drawn by `components/PVTCellArt.js` (window.PVTCellArt). There are no other cell drawings.
- **Fixed design:** thermal enclosure + navy frame, lower piston drives, Pump B LEFT / Pump A RIGHT (never mirrored),
  two cylinder valves above the cylinders, matching isolation valves outside the enclosure at **Port L** and **Port R**
  (external tubing attaches to their outward ends), pressure sensor, sample-volume and temperature displays.
  `PVTCellArt.desk()` = computer + controller on their table, `PVTCellArt.cable()` = signal cable from the cell.
- **Placement:** `PVTCellArt.LEGACY` lands the cell on the coordinate frame the pages already used (header y 190,
  Pump B tee x 866, Pump A tee x 1030, sensor x 948), so page flow overlays keep their coordinates. Pages move it only
  with their existing group transforms.
- **Live state only from the page:** `innerA` / `innerB` = the page's own bore contents in its old bore frame
  (x 846-886 / 1010-1050, y 219-401), mapped onto the approved bore; `pistonA` / `pistonB` = the page's piston-top y in
  that frame (approved piston, rod and drive carriage follow); `valves { A, B, L, R }`, `ports { L/R: { plug, nut } }`,
  `disp { P, B, A, T }`. Template pages pass `{{ }}` expressions; RecombSim passes values (`raw: true`).
  `oldMap()` gives the same old-frame mapping for overlays outside the bore (Density Vi/Vf marks).
- Calculations, datasets, quantities, timing, sequences and controls are unchanged; only drawing geometry constants
  moved (connection points, lane points / path lengths, viewBoxes).

| Page | File | Port L | Port R | Valve mapping (existing action -> cell valve) |
|---|---|---|---|---|
| Charge | `screens/showTest.js`, `Main.js` | SPS/PDS charge line | rated plug | Cell Valve -> Port L valve; Pump A / Pump B valves |
| Flash | `screens/showTest.js`, `Main.js` | rated plug | sample line -> Flash Unit | Pump A outlet valve -> Pump A + Port R valves |
| PV test (Validation, DL embedded) | `StagePVTest.js` | plug | plug | Pump A open (sensor); Pump B open while the sample is in Pump B / in transit |
| Differential Liberation | `StageDiffLib.js` | plug | outlet line -> Flash Unit (Stage 1-6) | PVT-cell outlet valve -> Port R valve |
| Separator Test | `StageSeparator.js` | sample inlet (charge) | outlet line -> Flash Unit | inlet valve -> Port L, outlet valve -> Port R |
| Direct Density | `StageDensity.js` | plug | density coil inlet | cell isolation valve -> Port R |
| Two-Phase Viscosity | `StageViscTwo.js` | oil transfer line | gas outlet line | oil transfer valve -> Port L, gas outlet valve -> Port R |
| Recombination | `RecombSim.js` | cell inlet (sample + vacuum lines) | plug | cell inlet valve -> Port L; Pump A / Pump B valves |

## SPMC source and SPMC Details (2026-10-20)

Validation › Sample Transfer (`showXfer`) takes its sample from ONE **SPMC chamber** (removed from the MRMS), not
from an MPSR. The MRMS/SPMC implementation from commit 5de19e1 (former Equipment Library) was recovered selectively:
`equipment/mrms-draw.js` (MRDraw), `equipment/mrms3d.js`, the `EQUIPMENT.mrms` / `EQUIPMENT.spmc` data and the
`mr-*` styles. The downhole Operating Principle was not kept (VAPS does not perform that procedure). The Equipment Library page, card and
navigation entry stay removed. Sources and assumptions: `equipment/MRMS-SPMC-SOURCES.md`.
- **Scene.** `MRDraw.xfer(ns, o)` draws the same SPMC cutaway (horizontal, inlet left) with style hooks (`o.live`):
  sample, piston train (sample piston + compensating fluid + nitrogen piston), drive fluid, inlet and end-port
  passages, sample isolation. Placement `MX_SPMC`, end connection `MX_SPMC_END` (MRDraw.toPage) in `screens/showXfer.js`.
- **Transfer coupling** (`Main.js`, `mxSp*`): the existing clock is unchanged. The sample piston travels the full
  sample length (`MRDraw.XFER.travel`, no dead volume) with the existing swept fraction `mxVm`. The pump drives the
  SPMC END connection: drive fluid fills the space behind the nitrogen piston (nitrogen charge taken as released) and
  the whole piston train moves toward the inlet; the compensating fluid stays trapped between the pistons. Sample
  isolation opens with the existing valve (`mxValve`). Only the sample enters the transfer line.
- **Transfer-line gauge.** The former line valve is a pressure gauge on a tee (`mxLinePText`, `mxLineGaugeStyle`,
  0–10,000 psi dial) showing the existing transfer pressure; indicator only. The bottle's own valves are unchanged.
- **SPMC Details** (`components/SpmcDetails.js`): any `#app [data-spmc-open]` (the SPMC drawing, the scene pill and
  the header button) opens an overlay on the individual SPMC chamber, with MRMS module assembly (six selectable
  chambers, open a chamber / Back to MRMS assembly) and SPMC chamber.
  2D / 3D, exterior / cutaway, upright / horizontal, labels, light background, parts, camera controls; 3D imported
  on first use and destroyed on close. Opening calls `PC.hold(true)` like Bottle Details; Back to Transfer
  returns to the same step and quantities.
- **Cell Details** (`components/CellDetails.js`): any `#app [data-cd-open]` (a `bd-btn` in the cell heading, or
  `PVTCellArt.pill()` in the drawing on Charge and Two-Phase Viscosity) opens one shared overlay on the approved cell:
  Exterior / Cutaway (complete device with drives, stand, computer, controller, signal cable) and Plumbing (built-in
  routing, marked as a schematic assumption). Labels and parts list; no live readings, valve states or prototype
  numbers. Opening calls `PC.hold(true, true)`: the procedure pauses, and on close it resumes only if it was running.
- The 450 cc transfer volume, pressures, temperatures, timing, valve sequence and step order are unchanged.
  **Open modelling issue:** 450 cc transferred vs the documented 250 cm³ SPMC-T sample (see MRMS-SPMC-SOURCES.md).
`equipment/build-preview.py OUT.html` bundles the whole app into one file for a hosted review preview.

## Template syntax

The markup is the original export's dialect, handled by `runtime.js`:

| Syntax | Meaning |
|---|---|
| `{{ expr }}` | value from `renderVals()`, in text or attributes |
| `<sc-if value="{{ cond }}">` | show block when true |
| `<sc-for list="{{ arr }}" as="x">` | repeat block |
| `<dc-import name="StageGC" on-back="{{ fn }}">` | mount a component |
| `sc-camel-view-box="0 0 24 24"` | becomes `viewBox` |
| `onclick="{{ handler }}"` | event binding |

Rendering patches the DOM in place rather than rebuilding it, so CSS transitions
keep working across state changes.

## Calculators (module05)

One full-page **PVT Calculator** (rebuilt 2026-10-29). `screens/showCalc.js` renders only a host
`<div ref="{{ pvCalcHost }}">`; `Main.syncPvtCalc()` mounts `components/PvtCalc.js` into it and keeps
`state.calcMode` ('oil' | 'gas') in step with the page's Oil / Gas selector. Dashboard: *Oil Calculator* /
*Gas Calculator* open that mode, *PVT Calculator* reopens the last one (default oil). Back = top-bar Back.

Layers (each testable on its own; equations and sources in `calc/README.md`):

| File | Role |
|---|---|
| `calc/pvt-units.js` | Field / Metric units, absolute / gauge pressure (+1 atm = 14.6959 psi), standard bases `STD_BASES`: correlation 60 °F and laboratory 15 °C, both 101.325 kPa |
| `calc/pvt-correlations.js` | published equations (pure, NaN outside their mathematical domain, never clamped) + META: labels, equation text, published data ranges, references + `VERIFY`: per-method cross-check source, numerical check, range status, limitation |
| `calc/pvt-engine.js` | validation (per-field errors) + evaluation over a pressure set; point detail with substituted values |
| `calc/pvt-measured.js` | measured-data template / parser (line + column errors, `#` comment lines), `checkBasis` (declared standard basis of measured Rs / Bo / Bg) and ARE / AARE statistics |
| `components/PvtChart.js` | SVG chart: hover tooltip, click / arrow-key selection, gaps for invalid values, pb marker, measured markers, PNG export |
| `components/PvtCalc.js` | page: views Inputs · Charts · Results Table · Measured Data · Methods & References, Explain drawer, CSV export |
| `components/OilBatch.js` | the former oil calculator's multi-sample batch tables (renamed from OilCalc.js; correlations now from PVTCorr) |

Rules kept by the engine:
* blank required field -> "Input required"; nothing is defaulted behind the scenes (example values are written into the visible fields);
* invalid input blocks the calculation and clears the results (status chip shows "Invalid input");
* outside an equation's domain -> value null + reason (chart gap, table "—" with a numbered note);
* outside a published data range -> value kept + warning naming the correlation, variable, range and affected properties;
* oil: one measured input (pb or Rsb), the other derived once; p < pb saturated, p >= pb Rs = Rsb, Bo = Bob·exp(-∫co dp);
* gas: ideal mode sets Z = 1 for every dependent property; a manual chart Z is single-pressure only (no curve, no cg);
* unit switching (2026-10-30 fix): unit-bearing fields keep a full-precision canonical value (`f.canon` in
  PvtCalc: psia, psi for the increment, °F, lbm/ft³, scf/STB). Switching units or gauge only re-renders the
  text; the engine receives the canonical values. All pressure comparisons use `PVTEngine.P_TOL` (0.01 psi);
  ranges are generated by index; the selected point is tracked by its pressure, not its row number;
* errors carry a kind — missing / invalid / failure — and a field label; the status chip reads "Input needed",
  "Invalid input", "Calculation failed" or "Valid" (with range warnings, accuracy notes and assumptions counted),
  and the summary above the inputs names the fields;
* standard basis (2026-10-30): oil always 60 °F; gas Bg / Eg on 60 °F or 15 °C (Tsc ratio). Measured Rs / Bo / Bg
  need a declared basis; oil on 15 °C is not compared. See `calc/README.md`.

Page layout follows the Validation page: eyebrow + title + Fluid pills, tab bar with context and status, cards
with a 2.5 px accent foot. Inputs: numbered required cards, correlations with an expandable advanced section,
"Load example" / "Clear inputs", "View results" / "View charts". Charts: full-width plot, a compact point strip
(details in the drawer via "Show equation"), a summary instead of a plot for one pressure. Field help (?) and the
point equation open in the Explain drawer (StepGuide's .sgSec classes).

Styling: the `.pv-*` block at the end of `theme.css` (theme variables only; oil amber / gas blue accent; focus rings,
icons with every warning so nothing relies on colour). Verification references: `tests/pvt-verification.test.js`, `tests/reference/`.
The `.oc-*` block is still used by the batch tables. Tests: `node --test tests/*.test.js` (engine, no browser) and
`node tests/ui.e2e.js` (Playwright, starts its own server; screenshots in `tests/out/`, git-ignored).
`components/GasCalc.js` was removed: every working gas feature moved into the new page (composition table,
Standing-chart reading, sour corrections); the "Matthews", "Whitson-Brulé" and "Brown 1948" Z options had no
implementation of their own (they returned Papay) and the Carr-Kobayashi-Burrows viscosity option returned no value.

## Rebuilding from the original export

`unbundle.py` regenerates this whole folder from
`Digital PVT Laboratory (Standalone).html`. It is only needed if you go back to
the Design canvas — normal work is done directly on the files above.


## Report (module04)

`components/StageReport.js` renders the whole Final Report natively: cover, summary,
Tables 1-14, Figures 1-10 (inline SVG) and the appendices, following the client's
`Final Report.docx` layout. Everything is read from `window.PVT_REPORT` in
`data/report-data.js` - edit that file to change a number, never the component.
Two actions in the header: **Print / PDF** (print stylesheet, chrome hidden) and
**Export Word** (.doc download).

Measured inputs come from the stage components (StageDiffLib volumes, StagePVTest
points, StageGC compositions, StageVisc, StageDensity). Derived columns and their
correlations, plus every assumption, are listed in the report's Appendix B.

## Theme (light / dark)

`theme.css` holds the whole palette twice: `html { ... }` is **dark**,
`html[data-theme="light"] { ... }` is **light**. `Main.js` reads/writes
`localStorage.pvtTheme` and sets/removes `data-theme="light"` on `<html>`.

Two places switch it:

* the toggle at the right of the top bar (`screens/showTopBar.js`)
* the **Appearance** row in Settings (`screens/showSettings.js`)

The top bar is shown on every screen except the splash, so the dashboard
also carries About / Settings / theme toggle.

Rules when editing:

* Any text, panel or border colour must come from a variable
  (`var(--txt)`, `var(--mut)`, `var(--panel)`, `var(--line)`, ...).
* Fixed colours are only for things that keep the same appearance in both
  themes: fluid colours (oil / water / gas), instrument bodies, LCD-style
  readout panels, and text that sits on a coloured button or on such a
  fixed dark readout. Those keep a hardcoded light value on purpose.
* Semantic accents available: `--blue --grn --amb --red --teal` plus the
  accent set `--accb --accb3 --accb4 --accg --acca --acca2 --accw --hdb3`.
* Stage components (`StageDiffLib`, `StageSeparator`, `StageGC`,
  `StageDensity`, `StagePVTest`) carry a standalone-only palette scoped to
  `#dc-root > .sc-host > [data-screen-label="..."]`. That selector never
  matches inside PVT Nexus - do **not** change it back to `body { ... }`,
  which would force the whole app into one palette.

## Navigation and layout rules

**One screen, no scrolling.** Every screen is sized to
`height:calc(100vh - 52px)` (52px = top bar) with `overflow:hidden`, and its
inner blocks use `flex:1; min-height:0` so they shrink to fit instead of
pushing the page. Nothing on the page scrolls. The single exception is the
Final Report (`module04`), whose document pane scrolls internally like a PDF
viewer - the shell, header and section list stay fixed.

When adding content to a screen, give the new block a flex basis and let an
existing block shrink; do not add height that has nowhere to go.

**One Back control.** `screens/showTopBar.js` renders a single `← Back`
button at the left of the top bar on every screen except the splash and the
dashboard. Where it goes is the `BACK_PARENT` map in `Main.js`:

| From | Back to |
|---|---|
| about, settings, module01, validation, analysis, module04, module05 | dashboard |
| mdtXfer | module01 |
| module02, module03, pvTest, density | validation |
| difflib, separator, gc, visc, analysisTest | analysis |

Add a screen -> add one line to `BACK_PARENT`; nothing else is needed. Do
**not** add per-screen back links - the only in-page back buttons left are
*step* moves inside a sequence (`← Back to Charging`, `← Back to Flash`,
`← Back to PV`), which move sideways, not up a level.

**Shared button classes** (in `theme.css`) - use these instead of new inline
button CSS:

| Class | Use |
|---|---|
| `.ui-btn` | base: 34px tall, 9px radius, 12px/500 text |
| `.ui-btn-primary` | main forward action |
| `.ui-btn-ghost` | secondary on the page background (Back, toggles) |
| `.ui-btn-sub` | quiet action inside a card (Reset ...) |
| `.ui-actionbar` / `.ui-actionbar-end` | bottom bar row, right-aligned group |

### Validation procedure cards

`.val-card` in `theme.css` carries the whole card: white `--panel` face, soft
shadow, 1px `--line` border with a 2.5px tinted bottom border, 50px circular
tinted icon, status pill, 17px bold title, description, 36px round arrow
bottom-right - the same visual language as the Detailed PVT Analysis cards.
`buildValCards()` in `Main.js` supplies **only** the colours (tint + status),
never the geometry, so the size can adapt:

* full metrics on a tall screen;
* compact metrics under `max-height:820px`, and under `max-height:1010px` for
  `.is-3row` (the 9-procedure bottom-hole path, which needs three rows).

`valGridStyle()` caps the grid at `rows x 232px + gaps`, so the cards reach
their natural size on a large monitor and share the leftover height on a
laptop instead of clipping or forcing a scroll. `.card-desc` clamps the
description to whole lines (one fewer on short screens) so text is never cut
through the middle of a line.

When changing a card, edit `.val-card` in `theme.css` - do not put padding,
font sizes or icon sizes back into the inline style, or the responsive
compacting stops working.

## Process speed (timing.js)

`timing.js` holds **one** value, `PROCESS_SPEED_MULTIPLIER` (currently `1.7`),
that sets the speed of every technical process and learning animation.
`1.0` = original speed, `1.7` = every process takes 1.7x longer.

* JavaScript: all process timers go through `PT(ms)` (= ms x multiplier) -
  `cAt/cTween`, `fAt/fTween`, `stepPh`, `bhLogAt`, `rstep`, `tweenVal`,
  `rampMechAt/tweenMech` in `Main.js`, `at/tw` in the Stage components,
  `tween/wait` in `StagePVTest`, the stroke in `StageVisc`, and the paused-aware
  clock in `StageGC` (runs at 1/multiplier).
* CSS: process animations and long equipment transitions use
  `calc(<time> * var(--pm, 1))`; `--pm` is set on `<html>` from the same value.
  Flow dashes, bubbles, agitation, tool spin, piston / fill / tool travel are
  scaled; status blinks/pulses, splash, hover and short (< 0.6 s) smoothing
  transitions are not.
* `StepGuide.js` maps elapsed time back to the animation timeline
  (elapsed / multiplier), so the explanation panel stays on the right step.

When adding a new process timer, wrap its duration in `PT()` (JS) or
`calc(... * var(--pm, 1))` (CSS) - never hard-code a slower number.

## Viscosity module (structure only)

Detailed PVT Analysis → **Viscosity Analysis** (`viscMenu`) → one of three tests:
`viscKin` (Kinematic), `viscSingle` (Single-Phase), `viscTwo` (Two-Phase).

| File | Role |
|---|---|
| `components/ViscModule.js` | registry: per-test config, icon, texts, hash route, `steps`, `schematic`, `calc`, `initialState()` (own state + reset), Explain text |
| `screens/showViscMenu.js` | selection page (same layout as `showAnalysis`) |
| `screens/showViscTest.js` | shared page shell; each test has its own workspace `sc-if` block |

`Main.state.viscState = { kinematic, single, two }` — independent status/state; `viscReset(id)` resets one test only.
Browser back/forward and reload work through hash routes `#/viscosity`, `#/viscosity/kinematic|single-phase|two-phase`.
The old ViscoLab stage (`StageVisc.js`, screen `visc`) is kept on disk but no longer linked from the Viscosity card.

### Two-Phase Viscosity (`viscTwo`, components/StageViscTwo.js)

Layout (2026-09-28): viscometer LEFT = the Single-Phase instrument drawing (inclined body on its stand, quadrant
guide, fixed bottom hinge, controller t/mu + pressure display + thermostat bath, bleed valve -> waste glass
top-left; geometry copied into StageViscTwo.js, StageViscSingle.js untouched). PVT cell RIGHT (DL drawing).
Oil: Pump A -> sample manifold -> out of the cell's left side -> oil transfer valve -> riser IN_X -> bottom inlet.
Gas: side fitting on the upper side of Pump A -> gas outlet valve -> tube submerged in the water glass (far right).
Inclination slider (demo only) + Show Components in the control bar; unused equipment greyed per sub-step.
Agitation (2026-09-28) = the PV test's two-pump cycle (window.PVT_PV from StagePVTest.js: stroke profile, manifold
route, T.A2B / T.HOLD / T.B2A / T.STAB): full sample A -> B, hold in B while gas reaches equilibrium (Pump B holds P,
vPre -> stab over EQ_MS), B -> A, stabilize (gas cap forms in Pump A). A + B = V during each stroke; ends with Pump B
empty. Gas outlet + oil transfer valves stay closed. State: agX (share in Pump B), agDir, agFront/agTail/agFlowD.
Backup before this change: _backup_app_20260928_before_twovisc_layout. Six points at the DL pressures
(2,161 / 1,798 / 1,435 / 1,000 / 565 / 203 psig, read from `window.PVT_DL`, exported by StageDiffLib.js).
Per point: reduce -> agitate -> vent gas -> first oil drop (close valve) -> transfer `XFER_CC` -> measure.
37 navigable steps (6 x 6 + Results). mu from the report's sub-Psat trend (illustrative), K = 1.50 cP/s.
`XFER_CC` (default 10 cc) and `PTS_OVERRIDE` are at the top of the file. Cell volumes are the DL volumes
scaled by the oil left after each transfer, so everything fits in Pump A (Pump B stays empty).

## Page layout system (2026-09-28)

One layout frame for every module (defined at the end of `theme.css`):

- `--page-h` = working height under the 52 px top bar, never below `--page-min-h` (600 px);
  shorter windows / high zoom scroll the page instead of clipping. `--page-h` follows the real visible
  height (`--app-h`, set by `components/Responsive.js`), so a mobile browser bar resizes the page.
  `#app` no longer has a 768 px minimum (see "Responsive layer").
- `.pg` page frame, `.pg-head` one compact header row (`.pg-eyebrow` · `.pg-title` 18 px ·
  status · `.pg-desc` one line, ellipsis · `.pg-end` page actions on the right).
- `.lab-body` / `.lab-schem` / `.lab-side`: schematic | side-panel grid (Transfer, Opening
  pressure, Restoration, Water check, Agitation). On phones and portrait tablets (`.pg-stack`) the side
  panel drops under the schematic and the page scrolls; a landscape tablet keeps the side-by-side layout.
- `.act`: one size for every page action button (34 px, 12.5 px text); colours stay with
  each page's state logic.
- Explain Current Step: button lives in the top bar (`#sgSlot`, same place on every page).
  The card is a docked right drawer (`html.sg-open main` gets a right margin), so it never
  covers the schematic or controls, scrolls internally and can stay open while a process runs.
  Below 1000 px wide it becomes a bottom sheet.
- Results appear with the first measurement and reserve no space before it:
  PV test (graph + recorded points, `pvResOn`), Separator test (`dlResOn`), Direct density
  (results table, `dnResOn`), GC (chromatogram when the sample is injected, `gcResOn`),
  Two-phase viscosity (graph + table, `v2ResOn`), Single-phase viscosity (already `resOn`).
- Bottom Hole panel: step list scrolls, play / Explain / Move-to-Lab controls stay pinned.
- Tightened viewBoxes: validation bottle scenes `0 22 900 492`, two-phase `24 22 992 616`.

## Responsive layer (2026-10-30)

Desktop (> 1100 px) is unchanged (1366 px screenshots of every page compared pixel by pixel before and after).
Everything else is additive: class hooks in the screens plus the "RESPONSIVE LAYER" block at the end of
`theme.css`, all inside phone / tablet media queries or `html.vp-stack`.

- Breakpoints: phone ≤ 760 px; tablet 761–1100 px. Stacked layout (`html.vp-stack`): phone, and tablet in
  portrait. Landscape tablets and landscape phones wider than 760 px keep equipment and panel side by side.
- `components/Responsive.js` (layout only, loaded right after timing.js): sets `vp-phone / vp-tablet / vp-desk /
  vp-stack / vp-portrait / vp-landscape` and `--app-h` on `<html>`; re-checks on resize, rotation and DOM changes
  (child lists only).
- Equipment frames: `.lab-schem`, `[data-rz-frame]` (Module 01 board) and `.bhs-scene` (Bottom Hole). In stacked
  layouts the largest top-level SVG of a frame is marked `[data-rz-svg]` and drawn at full width with its own
  aspect ratio (no clipping), and the frame gets a zoom bar (fit · − · + : 100 / 150 / 200 / 300 %). A zoomed
  drawing pans inside its frame; the page never scrolls sideways. A frame that contains another frame is
  skipped, so only the inner drawing zooms. Add `data-rz-off` to a frame to opt out.
- The runtime only rewrites bound attributes, so the `data-rz-*` attributes and the zoom bar survive re-renders.
- Hooks added to the screens: top bar `.tb .tb-nav .tb-logo`, dashboard `.dash .dash-grid .dash-strip`,
  Module 01 `.m01 .m01-head .m01-btns .m01-grid .m01-board .m01-bh .m01-bhpanel`, menu pages `.menu-page
  .menu-hero .menu-grid (.val-grid)`, About `.about`, stage tabs `.stage-strip` (DL, Separator, viscosity).
- Phone: top-bar labels hidden (icons and accessible names stay); page headers wrap; card grids one column;
  stage tabs scroll as one row; Report sections become a horizontal strip above the document (the document
  keeps its own scroller, so section highlighting still works); the Explain drawer is the existing bottom sheet.
- Touch (`pointer:coarse`): procedure buttons 44 px (`--pc-h`), other buttons 40 px, zoom buttons 38 px,
  overview sample-point tags tappable over their whole box.
- Tests: `tests/ui.e2e.js` "responsive layer" — 11 pages × 390×844, 768×1024, 1024×768, 844×390 (no sideways
  scroll, no clipped drawing, zoom bar in stacked layouts, side-by-side on landscape tablets), zoom panning,
  rotation, browser-height change, touch target sizes, phone Explain drawer.

## Validation layout (2026-10-21)

Every Validation procedure page uses one frame, taken from Restoration (CSS at the end of `theme.css`):

- `.pg.pg-stack` page, `.pg-head` header: `Validation` eyebrow · title · status · source chip · one-line
  description · equipment-details buttons (`.pg-end`).
- `.lab-body` grid: simulation area `.lab-schem.vl-sim` (grid background, 16 px radius, drawing in `.vl-fig`)
  | fixed sidebar `.lab-side` (`clamp(280px,21vw,330px)`).
- Sidebar = `.vl-scroll` (page sections `.vl-sec`, readout cards `.vl-c`, live monitor `.vl-mon`; scrolls on its
  own) above `.vl-dock`. The dock has fixed rows: stage card (fixed height) · Previous / Restart / Next ·
  Explain This Stage · Run / Pause · [Run All | Reset All] · `.vl-fwd` page navigation. Empty rows keep their
  height, so every common control sits at the same place on every Validation page and stage.
- Pages: Sample Transfer (`showXfer`), Opening Pressure / Restoration / Water Check / Agitation (`showRestore`),
  Charge to PVT Cell + Flash (`showTest`), PV (`StagePVTest`, standalone only - when embedded in Differential
  Liberation / Separator Test its wrappers are `display:contents`, layout unchanged), Direct Density
  (`StageDensity`), Recombination (`RecombSim` CSS + `showRecomb`).
- Charge: one view for all 12 stages (`chargeViewBox` fixed); the bottle rig (stand, bottle, transfer pump, pump
  line, labels) is scaled 1.16 about the bottle sample-valve outlet (585, 197.9), so the charge line, fluid front
  and all rig coordinates are unchanged and the bottle matches the Restoration bottle size; the bottle stays on
  the bench (dimmed, disconnected) after stage 8. Computer / controller to the right of the cell (s 0.40). The
  live monitor card and the agitation readouts moved from the drawing into the sidebar.
- PV graph (2026-10-25): the fitted-line intersection annotation reads `Psat = 2700 psig @ 31.3 cc`; it and the
  Test Summary value are built from the same `PSAT_PV` point (StagePVTest.js); the box widens to its text.
- PV (Validation only): the Pressure-Volume panel shows a horizontal point table (points 01-12 across, P and V rows,
  counter in the corner, the point just recorded outlined) above the graph. The graph is drawn at the measured size of
  its area (`syncGraphBox`, 1 SVG unit = 1 px) so it fills the panel. Since 2026-10-21 embedded PV (Differential
  Liberation, Separator Test) uses the same presentation (`pvHTOn`); its table font is sized from the longest value of
  the dataset (e.g. 35.0000 cc) and the graph column takes 1.14 : 0.86 of the PV area.

## Direct Density page layout (2026-10-21)

`components/StageDensity.js` only (presentation; data, timeline, valve logic and drawing coordinates unchanged).
- Simulation area = heading · calculation panel `.dn-calc` (light, 2026-10-25: Working equation | Mass · balance |
  Volume · PVT cell, then one results row: density (current run or accepted average) · Run 1 · Run 2 · |ρ1 − ρ2|
  vs ±0.0005 · verdict / Repeat; theme colours, placeholders `—`) · action line · equipment
  `.dn-fig` (same SVG / viewBox as before, now using the full width and remaining height). The former tall
  calculation column and the Run 1 / Run 2 chips are gone; run state (STORED / RUNNING / PENDING / LOCKED),
  |rho1 - rho2|, tolerance, verdict and Repeat are in the Results group.
- Explain This Stage: shared overlay drawer (see "Explain drawer" below).
- Sample flow inside the PVT cell (Pump A -> Port R): one continuous fluid-coloured line (single phase) with a
  travelling glint and a fixed direction chevron; no dashes or gaps. The two-phase coil depiction is unchanged.

## Explain drawer — overlay on every page (2026-10-21)

`components/StepGuide.js` (`anchor()`, LAYOUT v3 CSS) is the one implementation for every page with Explain
(sampling, Validation, analysis). Nothing is reserved on `main` any more (`--sg-w` margin removed), so opening /
closing never resizes or moves the simulation, equipment, graphs or calculation panels.
- Placed by measurement every tick: over the procedure sidebar (the <= 480 px column that holds a
  `data-pc-layout="side"` procedure panel: `.lab-side`, `.m01-panel`, `.bhs-panel`, `.rc-panel`); on pages with a
  bottom procedure bar (DL, Separator, GC, viscosity) at the right edge, sidebar width
  `clamp(280px,21vw,330px)`, ending above the bar so Pause / Explain stay usable. <= 1000 px: bottom sheet overlay.
- Card scrolls internally; head (title · stage / status tag · close) is sticky at the top.
- Content, live readings, stage tracking and playback unchanged (Explain never pauses / resumes).
- Focus (2026-10-21): the drawer is a non-modal `role="dialog"`. While open, the covered sidebar is `inert`
  (+ `aria-hidden`), so its hidden controls cannot take focus or clicks; opening moves focus to the close button,
  closing (close button or Escape) returns it to the control that opened it. Escape is ignored while a Bottle / Cell /
  SPMC Details viewer is open on top. Since every procedure page now has the shared sidebar, the "bottom bar" placement
  in `anchor()` is only a fallback.

## Analysis pages — shared procedure layout (2026-10-21)

Differential Liberation, Separator Test, GC (oil + gas) and the three viscosity tests use the Validation layout
(`.pg.pg-stack` · `.pg-head` · `.lab-body` = simulation area + `.lab-side` sidebar with `.vl-scroll` sections above the
`.vl-dock` procedure dock, `data-pc-layout="side"`). The former bottom procedure bars are gone; every common control sits
at the same place as on Validation pages. Presentation only - data, calculations, timing, valve logic and stage counts
are unchanged (final procedure states compared with `main`: identical apart from timestamps / measured layout sizes).
- Header: eyebrow (`Analysis` / `Viscosity`) · title · status pill · one-line description · equipment details buttons
  (Cell Details on DL / Separator / Two-Phase, Bottle Details on Gas GC / Single-Phase) · Viscosity Tests back link.
  Procedure tabs (DL stages, Separator stages, Kinematic stages, Two-Phase points + sub-steps) stay under the header.
- DL / Separator: sidebar = Live readings (the existing `dlStrip` values, previously unused / shown only on PV stages)
  · stage status card · stage / test record · agitation log; Separator keeps "PV Results · kept separate" (first PV
  114 °C and final PV 35 °C are separate datasets and results). The stage-1 "Working pressure = reservoir + 2,000 psi"
  card was removed: the reasoning is in Explain This Stage (SEPSTEP.charge0), the 5,000 psig reading stays in Live
  readings. Embedded PV stages use the PV cards directly (no extra frame).
- GC: sidebar = Current action (status + `gcEdu`) · Readiness checklist; Mode Selection is the dock navigation row.
  The chromatogram / composition-table column appears in the simulation area once the sample is injected
  (`gcResOn`); the table view widens that column so every column fits (gas min 470 px, oil min 570 px).
- Viscosity shell (`showViscTest`): no outer frame for the three tests (`vtWorkStyle`). Kinematic: readings card in the
  sidebar (constant C shown read-only, CALIBRATED, as before). Single-Phase: the numbered 1-9 step row was removed
  (stage + progress in the dock; Previous / Restart / Next unchanged); live readings + View settings (Show Components,
  Inclination) in the sidebar; the results graph + table keep their own column in the simulation area. Two-Phase:
  readouts + valve statuses + View settings in the sidebar; graph + table moved to a results column (`.v2-resc`) in the
  simulation area.
- Single-Phase bottle (drawing only): the separate "Bottle Valve" symbol above the bottle duplicated the bottle's own
  sample valve and was removed; the sample line starts at the built-in valve outlet, and the label, OPEN / CLOSED tag and
  activity halo sit at that valve (same `vB` state / action, same step count). Bottle + stand are drawn 1.36x
  (`RIG_K`, about the stand axis, `RIG_Y0`) - limited by the overhead sample run - with bar / base lengths compensated;
  pump unchanged, pump line re-ended at the moved driving-side outlet. Capacities, quantities, piston model unchanged.

## Sampling section layout (module01, 2026-09-28)

- One page frame for Overview + the four sampling pages (Bottom Hole open / cased, Wellhead, Separator):
  full-width header row (62 px: title + one-line subtitle left; Open/Cased toggle then the
  Overview / Bottom Hole / Wellhead / Separator buttons right, so the nav never moves), then the body.
- Overview: schematic only, full width. Sampling pages: schematic | side panel of width
  `--m01-side` (theme.css, clamp(336px, 21vw, 400px)). Wellhead / Separator use `.m01-panel`;
  BottomHoleSim.js `.bhs-panel` uses the same geometry. Bottom two buttons on all four pages:
  Take Sample (primary; Pause / Resume / Restart Sample on Bottom Hole) and Move Sample(s) to Lab,
  36 px, 12 px text (`_actBtn_d` in Main.js = `.bhs-act` in BottomHoleSim.js).
- Bottom Hole panel: 4 live readings (depth, pressure, temperature, contamination / flow stability),
  procedure list with the one-line instruction (`q` in OH_STEPS / CH_STEPS) under the active step,
  step prev / next / replay icons in the list header. The long text (`s`, OH_EX / CH_EX) and all six
  readings stay in the top-bar Explain Current Step card (describe()). The in-panel Explain button was removed.
- Bottom Hole strata are drawn far past the 1000 x 600 viewBox (svg overflow visible, xMidYMax meet),
  so the layers reach every edge of the schematic at any window size.
- `components/SampleBottle.js`: the Validation/Restoration SPS/PDS bottle (same geometry, gradients,
  valves, piston model as showRestore.js) as a generator used for every Sampling bottle: wellhead
  schematic + panel (oil over N2 buffer), separator oil bottle (oil over water) and gas bottle (same
  shell, no piston). Field orientation = sample side up (Restoration shows it inverted in the lab).
  Fill fractions unchanged (whOilG_d, oilG_d, gasFill_d). Downhole MPSR / SRS tool chambers are not
  transport bottles and keep their own drawing.

## Gas GC — dual channel (2026-09-29)

`components/StageGC.js`, gas mode only (Oil GC untouched). One oven, two columns, two detectors:
injected slug -> sample loop -> SPLIT TEE (local 432,336) -> Path 1 capillary column (thin amber coil,
upper-left, GCAP) -> TCD (HC + non-HC) | Path 2 packed column (thick stainless coil, lower-right, GPAK,
outlet up the right wall and along the deck) -> FID (HC only). Geometry: GCAP / GPAK / gPath() block
before bandF(). Vacuum, helium sweep, sample plug (splits at the tee), bands and flow colours run on
both paths (amber = capillary/TCD, teal = packed/FID). Non-HC bands on the packed path are hollow grey:
they reach the FID but give no signal.
Data: existing GAS_COMPS only (added hc flag). Same rt / peak heights used for both channels (no
separate packed-column data exists). TCD signal = GAS_SIG (all), FID signal = GAS_SIG_FID (HC only).
TCD axis unit mV, FID pA. Results: channel selector (state gch 'TCD' | 'FID', reset to TCD), computer
screen shows both mini traces, composition table has a Channel column (reported channel: N2/CO2 TCD,
HC FID) + Non-HC (TCD) / HC (FID) subtotals. Table tab widens the results column (1.3fr : 1fr).
Explain text for run / proc / vac / carrier / ginj updated in steps().
Backup: components/StageGC.js.bak_dualgc_before, _backup_app_20260928_before_dualgc/

### Gas GC — injection pressure + balloon oven (2026-09-29)
- Balloon-oven display renamed INJECTION PRESSURE (`GC.gas.injP`): 14.7 at open -> 0 during vacuum (synced to the vacuum tween) -> held 0 -> 0 to 9 over the sample-flow period of `ginj` -> held. Reset (resetRun / pick) restores 14.7.
- Unit shown as neutral "psi" until confirmed (14.7/0 read as psia, 9 was given as psig). Change `injP.unit` in one place.
- Balloon oven held at 80 °C from page open (GAS0 balT = Tset, heat = 1); Heat Gas Balloon step no longer ramps temperature. Column-oven programme (60 -> 120 °C) unchanged.


## Recombination (Validation, revised 2026-09-30)

SEPARATOR samples only: last card after Direct Density (`valMeta` drops `recomb` unless `valSource()` is
'separator'; `valOpen` / `syncRecomb` refuse it for bottom-hole / wellhead). Grids: bottom hole 9 cards
(3 x 3), wellhead 8 (2 x 4), separator 9 (3 x 3). `components/RecombSim.js` = one timeline per stage, every
drawn value a pure function of (stage, time), so pause / resume / restart / revisit are exact and each stage
starts from the end state of the previous one. Main keeps `rcDone` / `rcStarted` via `opts.onStatus`.
Explain = StepGuide card via `RecombSim.describe()` (per-stage text in `EX`).

Stages (v3, 2026-09-30): 1 Connect + vacuum (receiving-bottle 30 cc water / piston on it, water pump 300 cc; vacuum pump
behind the receiving-bottle top via isolation valve; booster in / out valves open, GSP closed; gas line evacuated through
the booster check valves) · 2 Boost (hydraulic valve opened, water pump = pressure MONITOR at constant 300 cc;
pump + cylinder read 0 -> CFG.BOOST_P, 1,000 psig in this example) · 3 water pump 300 -> 69 cc into the receiving-bottle
bottom, gas 1,000 -> 5,000 psig · 4 empty PVT cell evacuated, then exactly 60 cc gas into Pump A at 5,000 psig ·
5 bottle receives 40 cc measured at 5,000 psig (Pump A 60 -> 20); the 20 cc STAYS in Pump A (no vent) ·
6 cell leaves view with its 20 cc (no draining), empty cell fades in; oil bottle held 315 psig, pumped to
3,000 psig, A 100 + B 80 cc · 7 agitation stroke = free space of the receiving pump (CELL_CAP 100 cc -> 20 cc):
A 100/B 80 -> 80/100 -> 100/80, 4 strokes, chevrons on the A-B line · 8 "Transfer the oil into the bottle":
water pump on the bottle water-side port (monitor, constant volume, reads bottle P), A 100 -> 1 (99),
B -> A refill, A 81 -> 1 (80) = 179 cc; 1.00 cc left in Pump A (min drawn height 4 px), cell stays 3,000 psig,
sample + cell inlet valves closed · 9 heating jacket (cutaway side shells, coil pulse, rotates with the bottle,
label beside the stand) from t = 0; pump raises the bottle P_B2 -> 5,000 psig WORKING pressure and holds it;
pump P = bottle P; reservoir pressure 3,000 psig shown as a reference. Stage 9 title "Agitate the
Recombination Bottle (180° inversion)".

Booster (v3): vertical — air drive on top, gas head below; gas IN check valve on the left wall, OUT check valve
on the right wall. Routes: GSP -> (y 120) -> BOOSTER IN valve -> down x 300 -> IN port; OUT port -> x 600 ->
(y 120) -> BOOSTER OUT valve -> receiving-bottle top. Bypass valve, bypass line and its labels removed.

CFG - DEMONSTRATION INPUTS. User-specified: 30 cc, 300 cc, 1,000 / 5,000 psig gas, 60 / 40 cc gas,
315 -> 3,000 psig oil, 100 + 80 cc, 99 + 80 cc, CELL_CAP 100 cc, OIL_A_END 1 cc, WORK_P 5,000, RES_P 3,000.
Chosen for drawing / consistency: receiving-bottle 330 cc, bottle 275 cc, oil bottle 200 cc (1.4 cc water to reach
3,000 psig), gas ratio 300 -> 69 cc (0.23) and P*V^n = const through it (also used for the bottle pressures),
water pump refilled to 300 cc before the oil stage, MIX_SHRINK visual only. JACKET_T = null (no set point in the
project data; set a number to show it). Not a validated GOR ratio (labelled on screen).
Water pump barrel: 300 -> 69 -> 9 | refilled 300 -> 298.6 -> 118.6 (stage 8 monitor) -> ~80.6 cc (stage 9 hold).
Backups: _backup_app_20260929_before_recomb/ (v1), _backup_app_20260930_before_recomb_v2/ (v2),
_backup_app_20260930_before_recomb_v3/ (before this revision).

## Module 01 Overview — field system (2026-09-29)
screens/showModule01.js: the Overview tab now draws its own SVG (block "OVERVIEW: complete field system",
viewBox 0 86 1320 560, xMidYMin meet, ids prefixed "ov"). Wellhead / Separator pages still use the shared
svg above it (unchanged); Main.js prodVis is now false on the overview.
Layout: X-tree -> wellhead sample tap -> choke -> test/production manifold (W-01 lined up to TEST,
W-02..04 to PRODUCTION; open valve = light, closed = dark/red) -> 3-phase test separator (cutaway: inlet
diverter, gas/oil/water, weir, oil compartment, mist eliminator, PI + LT) with gas / oil / water outlets.
Production header -> buried line "TO PRODUCTION STATION". Markers: Bottom hole -> selBh, Wellhead -> selWh,
Separator gas + Separator oil -> selSep. No new state, values or steps.
Backups: showModule01.js.bak_ovfield, Main.js.bak_ovfield

### Overview simplified (2026-09-29 b)
Generated by a one-off script from the previous overview block (equipment drawings reused verbatim).
Straight route wellhead -> Wellhead Sample tap -> choke -> compact manifold (tee: TEST valve open to the
separator, PRODUCTION valve closed; one grouped "Other wells" riser into the production header; short
buried "To production" run) -> separator inlet (inlet stub moved to y 232 so the line has no bends).
Visible text: Wellhead, Choke, Manifold, Three-Phase Separator, Gas / Oil / Water, TEST / PRODUCTION /
OTHER WELLS / TO PRODUCTION (small), Pay zone + OWC, the four sample pills. Casing, tubing, packer,
perforations, tree valves, choke, test / production valves, other wells, inlet diverter, mist eliminator,
weir, oil compartment, PI, LT = hover / keyboard-focus tips (`.ovh` groups, CSS at the end of theme.css).
Separator internals: flow arrows, bubbles and weir-overflow dashes removed; outlet runs end at x 1180.
One flow indicator per section (flowline, test line, tubing, each outlet). Sample pills keep selBh /
selWh / selSep. Backup of the previous overview: _backup_app_20260929_before_ovsimple/

## Procedure controls (2026-09-29)

`components/ProcCtl.js` (loaded right after runtime.js) gives every procedure the same control panel,
modelled on Recombination. A page places `<div class="pc-host" data-pc="NAME" data-pc-layout="side|bar">`;
the widget calls `pcInfo()` / `pcAct(action)` on the module (`NAME` = live component name, a window
module such as `RecombSim`, or `Main:which` for Main-driven procedures).

Panel (same order, labels, sizes everywhere): STAGE k / N + READY / RUNNING / PAUSED / COMPLETE, stage title,
instruction (side layout), segmented progress (done stages green, current stage filled) - Previous ·
Restart Stage · Next - Explain This Stage - Run Stage k / Pause / Resume Stage k / Run Stage k+1 -
optional existing auto-run (Run Full Procedure, Run Whole Stage, Run Both Runs) - Reset All (tooltip
names the procedure). Side layout = bottom of side panels (Sampling, Transfer, Validation steps,
Recombination, Bottom Hole); bar layout = bottom action bars (Charge, Flash, PV, Density, DL, Separator,
GC, Viscosity). Page-specific forward buttons (Move to Lab, Continue to Validation, Start Charging,
Move to Flash Process, Back to Charging, Start PV Test, Back to Flash, Move to Direct Density, Mode
Selection, Show Components, Inclination) stay beside the panel.

Explain: the top-bar "Explain Current Step" button is removed. "Explain This Stage" in the panel opens
the same StepGuide drawer (same content, `window.__SG.toggle`). The drawer only shows on pages with a
procedure panel; opening / closing it never touches the process.

Pause / resume:
* `PCLK` (pausable virtual clock): process timers in Main.js (sampling, transfer, validation steps,
  charge, flash), StagePVTest, StageDensity, StageDiffLib, StageSeparator use PCLK.setTimeout /
  setInterval / raf / now. Pause freezes all of them together; resume continues from the paused instant.
* GC and the three viscosity tests keep their own paused-aware clock (state.paused); `advanceClock` /
  `ffAll` were split out of `tick` (same maths). Recombination and Bottom Hole are pure functions of time.
* While paused the page's CSS animations, running CSS transitions and SVG SMIL animations are frozen
  (`html.pc-paused`, Web Animations pause).

Restart / Previous / Next initialise stages only with the procedure's own actions:
* timeline procedures (wellhead / separator sampling, transfer, PV): reset, start, run the timers
  instantly (`PCLK.advance`) up to the start of the target stage, hold there (READY).
* step procedures (validation steps, charge, flash, density, GC, separator test): reset and replay
  the earlier stages instantly (`PCLK.flush` / `ffAll`); charge keeps its stage history (`_chH`) so the
  repeat-agitation loop replays exactly.
* existing snapshot navigation is reused: viscosity `goStage(i)`, DL `goStage` / `resetStage`,
  Recombination / Bottom Hole timeline positions.
* Next = the current stage is completed by its own actions (instantly) and the next stage is READY.
  Stages passed with Next therefore show as completed.
* Leaving a page cancels its pending actions; a charge / flash stage cut off by navigation is returned
  to its start; a transfer / sampling timeline cut off by navigation shows READY and Run restarts that stage.

Recombination: the nine-stage strip, the status line under it and the Recorded Measurements card were
removed (their stage / status / progress now live in the panel). Live readings, schematic, final
summary unchanged. The "demonstration inputs" note remains in the stage-9 summary on the schematic.

Other control fixes: Separator Test "Run Whole Stage" now starts (setState callback was ignored by the
runtime); GC gained Pause (it had none on screen); PV "Go to Point n" skip replaced by Next.
Backup before this change: _backup_app_20260929_before_controls/

## Validation Step 4 — Sample Homogenization (2026-09-30)
`components/QcAgitSim.js` draws the step-4 scene into `<g ref="qcAgHost">` (screens/showRestore.js, Main.syncQcAgit);
pure function of `agitP`, driven by one PCLK interval in `qcRun` step 4 (pause / resume / restart exact).
Same motion as Recombination: 0 -> 180 -> 0 deg, 3 cycles, then stabilize. Starts / ends with OIL above the piston and
hydraulic WATER below (screen angle = 180 - ang); stationary pressure pump, flexible line to the lower water-side port.
Side clamp brackets only (no bars across the bottle). resP / resT held; piston = bottleModel() split (unchanged).
Bubbles / layering bands visual only, confined to the oil side, gone at the end (single phase).
Backup: _backup_app_20260930_before_agit180/

## Validation Step 3 — Sample Water Drainage (revised 2026-09-30)

Oil bottle, drainage orientation (hydraulic water above the piston, oil sample below). Same page, two
user-controlled sub-steps in the Step 3 panel: **Start Settling (24 h)** then **Drain Free Water**.
Applies to every oil-bottle source (Bottom Hole, Wellhead, Separator oil bottle); the separator gas-bottle
note is unchanged.

* `components/QcWaterSim.js` — pure function of the settling clock (seeded, pre-computed per bore geometry):
  the existing 30 cc free water (`bottleModel` FREEW_CC) starts as liquid droplets dispersed through the oil,
  settles with v ~ r² (K calibrated so the last droplet arrives at 92 % of the period), droplets coalesce
  on contact (volumes added), droplets reaching the interface join the bottom layer. Represented volume
  (Σr³) is conserved. Also `drain(dk)`: water-side valve, sample valve, drained share, flow window.
  SETTLE_MS 10,000 / DRAIN_MS 6,500 (× PROCESS_SPEED_MULTIPLIER → ~17 s / ~11 s).
* State: `qcSettle` (0..1 = 0..24 h simulated), `qcDk` (drain clock), `water` (drained share, drives
  bottleModel / piston / receiver as before). Settling ends READY (qcPhase idle, qcSettle 1);
  drainage ends the step (qcDone[3]). resP / resT carried forward from restoration (never reset here);
  opening the Water Check card before restoration replays steps 1–2 first.
* Render (Main.renderVals, `qc3*` values; screens/showRestore.js): cloudy haze over the oil fades as water
  settles; droplets drawn as one SVG path; layer = 30 cc × (settled − drained); sample valve wheel + ring;
  pump-side valve / injection-line flow and pump LED active while the pump follows the discharge at
  constant pressure; callouts HYDRAULIC WATER / OIL SAMPLE / FREE WATER; timer card "x / 24 hours" +
  ACCELERATED DEMONSTRATION + water to receiver; messages "Settling complete — free water ready for
  drainage." and "Free-water drainage complete."
* Controls: Restart while settling or ready-to-drain → dispersed droplets, 0 h, empty receiver; Restart
  during / after drainage → settled layer, empty receiver (`qc3Seek`). pcReplay runs both sub-steps for
  Step 3. Leaving Step 3 mid-run (`qc3Guard`, componentDidUpdate) stops timers and returns the sub-step
  to its start. Explain text: StepGuide qcText(3) + "Settling time" value.
* The 24 h is a simulated outcome for this demonstration; it does not claim every real sample fully
  separates in 24 h.
Backup: _backup_app_20260930_before_watersettle/

### Recombination layout (revised 2026-10-25)
`components/RecombSim.js` drawing / layout only; quantities, pressures, timings and stage order unchanged except
where noted. One fixed viewBox (`VB 6 102 1240 584`) for all nine stages, everything on one floor (`FLOOR` 646).
- Vessels (gas receiving bottle, separator oil bottle, recombination bottle) have both valve outlets facing RIGHT at
  the same heights (sample `PORT_Y` 200, hydraulic `HYD_Y`). The water pump stands right of the vessel with its port
  on its LEFT face at `HYD_Y`: the hydraulic line is one short straight run with fittings at both ends. Tubing has
  rounded bends (`roundPts`) and hex fittings at connected ends; hydraulic lines are drawn wider than sample lines.
- Stages 1-3: GSP = approved Gas Sample Bottle; its built-in top valve is the GSP valve (state ring + tag) and the
  gas line ends on its outlet (the separate line valve is gone). Booster In / Booster Out valves sit on the booster
  ports (check valves unchanged inside the gas head). Vacuum pump below a tee in the booster-OUT -> receiving-bottle line;
  the vacuum isolation valve stays on the tee stub, the hose to the pump inlet is connected / removed.
- Gas receiving bottle (2026-10-25 b, formerly the titanium cylinder): the approved Oil Sample Bottle (`BottleArt.oil`,
  same placement as the sample bottles) with its own 330 cc capacity mapped onto the approved bore (`tiLayers`); its
  own needle valves are the sample / hydraulic valves. All titanium drawing and wording removed (internal ids `ti`,
  `TI_*` kept). Bottle Details lists it as "Gas receiving bottle · Oil Sample Bottle".
- Stage 9 heating jacket = the Validation Restoration jacket markup (showRestore.js) mapped into the bottle frame
  (`jacketMarkup`, x2.0407 about 300, 250), behind the bottle, turning with it; glow pulse computed from the stage clock.
- Stage 4: no external vacuum pump; the empty cell is evacuated by the integrated cell setup (status pill above the
  cell, Port L plugged until the receiving bottle is connected). Text / Explain updated.
- Stages 4-8: complete integrated setup = approved PVT cell (`CELL_S` 0.95, standing on the floor) + signal cable +
  computer / controller (`PVTCellArt.desk`, `DESK`) to its right. Sample line: vessel sample outlet -> overhead ->
  drop at `CELL_DROP` -> Port L.
- Stage 5: the water pump stays (no pumping) and is connected to the bottle hydraulic valve; with that valve open it
  reads the bottle pressure (fixed volume 9.00 cc). Stage 6: pump refilled 9 -> 300 cc from its reservoir while the
  bottles are swapped (the existing 300 cc refill, now shown in place).
- Stage 9 (2026-10-26): the inversion stand is the Validation · Agitation stand + rotating cradle, shared through
  `QcAgitSim.stand(id, px, py)` / `QcAgitSim.cradle(id)` (Validation output unchanged, byte-identical), drawn at
  `STAND_K` = 0.67 / 0.56 so the mounting proportions match, base on FLOOR, pivot `STAND` (660, FLOOR - 225 K). The
  bottle turns counter-clockwise as on Validation (`sAng`); cradle + Restoration jacket + bottle + clamps rotate
  together. Pump at `C_PUMP_X` 990; the flexible line goes through a waypoint that moves round the bottle end
  when the inverted outlet faces away from the pump. Jacket label under the agitation card.
- Page-header Details buttons follow the equipment in view (`syncDetails`): Cell Details only while the cell is
  shown (stages 4-8), Bottle Details = `gas` (stages 1-3) / `oil` (bottle in view), hidden when no sample bottle.

## Direct Density — coil + two-phase visual (2026-09-30)
`components/StageDensity.js`, drawing only (timeline T, values D, equations, controls unchanged).
Coil (CG): one continuous tube — inlet nut -> block valve (red T-handle) -> lead bends down into a flat, compact
helix, 3.5 horizontal turns (axis vertical, seen from slightly above: RX 80, RY 21, pitch 9 < tube 10.5 so turns
touch) -> outlet lead + nut + plug on the right. Half-turns drawn back first, lower turns before upper. Fill front
follows the path (per-segment dash). Balance position coilY 335 -> 404 so the bottom turn rests on the pan.
Two-phase model (FL, VISUAL ONLY, no measured data): plug flow, parcel at s = fill - u; liberation
L = min(s, fill - F0)/0.5, F0 = fill at T.FLASH. Seeded parcels: nucleation threshold -> growth -> cluster
coalescence (volume conserved, expanded with L) -> slugs when merged radius > 0.74 bore.
Near half-turns show a cut-away bore (dark wall + oil core); gas = bubbles + slug strokes.
"FLOW INSIDE COIL" magnified inset (x 1128-1400, y 300-414) shown while flash && coil at cell; window follows a
fluid element (drifts at 30 % of fluid speed), ring marker + dashed leader on the coil, stage caption from L.
Backup: _backup_app_20260930_before_densitycoil2/


## Separator Test (StageSeparator.js, rebuilt 2026-09-30)

Six stages on the shared procedure panel (Pause / Restart / Next / Explain This Stage):
1. Charge 35 cc at 5,000 psig / 114 C (working pressure = reservoir 3,000 psig + 2,000 psi); inlet valve -> manifold -> Pump A.
2. First PV - the Validation PV engine itself (StagePVTest, pv-config PV1_CFG): 12 points, points plotted unconnected,
   two fitted lines extended to their intersection (fitSplit), Psat 2,500 psig @ 36.35 cc; engine returns to 5,000 psig / 114 C.
3. Separator conditions - cool 114 -> 35 C at 5,000 psig, then reduce 5,000 -> 200 psig (Separator Temperature 35 C /
   Separator Pressure 200 psig labels). Cell temperature readout + air-bath tint in the cell drawing.
4. Agitation Pump A -> B -> A (DL cycle, slower strokes), cycle + confirmation, Pump B ends empty.
5. Flash Unit (DL drawing/lanes/valves): connect with valves closed, then balloon -> gasometer, flow-rate drop -> outlet closed.
6. Final PV on the remaining 27.9780 cc at 35 C (PV2_CFG), Psat 200 psig @ 27.98 cc. First / final results kept separate.
All numbers are ILLUSTRATIVE and derived (see header comment in the file): DL Initial PV scaled to 35 cc, 0.0007 /C thermal
contraction, DL total liberated gas x 35/80 split balloon 14.75 psig + gasometer 662 cc, stabilized 92.7780 cc.
Explain text: describe() in StageSeparator.js (StepGuide separator branch calls it).
StagePVTest additions (config-only, Validation/DL unchanged): tempTxt (cell-tag temperature), fitOVA / fitOVB (fit overshoot).
Backup before this change: _backup_app_20260930_before_septest


## Gas GC — revised procedure (2026-09-30)

`components/StageGC.js` gas mode only (Oil GC untouched). Supersedes the 2026-09-28 / 2026-09-29 gas notes.
Backup before this change: `_backup_app_20260930_before_gasgc_v2/`.

Connections: split tee -> PACKED column (upper-left coil, thick stainless, `GPAK`) -> TCD | CAPILLARY column
(lower-right coil, thin amber, `GCAP`) -> FID. Column subtitles removed; detector sub-labels name the column.

Sample handling (absolute drawing coordinates, geometry block "GAS schematic geometry"):
- 6-port gas sampling valve on the GC deck (`GV`, ports 1-6 at 30°..330°): 1 carrier in, 2 to columns, 3 / 6 loop ends,
  4 sample in, 5 capped vent. LOAD channels 1-2, 3-4, 5-6; INJECT (rotor +60°) 6-1, 2-3, 4-5.
- Helium line (cylinder -> regulator -> flow controller -> overhead run) enters port 1 only. Sample line enters port 4 only.
- External sample loop (0.25 mL) 3 -> 6; its riser jumps over the sample line with a hop + gap (no connection).
- BOTTLE OUTLET VALVE (`BV`) on the gas-bottle outlet inside the balloon oven. Vacuum branch: tee on the sample line
  (`GTEE`) -> VACUUM VALVE (`GVV`, fixed, stays visible and CLOSED after evacuation) -> removable hose + pump.
  Evacuation (purple) is drawn only on bottle valve -> line -> port 4 -> loop -> port 5 and the branch.
- Injection-pressure display (values unchanged 14.7 -> 0 -> 9) is tapped off the sample line.

Steps (6): carrier (open cylinder, set FC 2.40 mL/min, He through LOAD 1->2 to both columns, detectors ready) ·
vac "Evacuate Sample Line and Loop" (bottle valve closed) · iso "Isolate the Vacuum" (valve CLOSED, pump removed) ·
load (bottle valve open, loop fills, sample not in columns) · ginj (valve to INJECT, carrier sweeps the slug to the
split tee) · run (GC oven 35 -> 325 °C linear over 75 min; ends with integration -> results / table). The old
"Heat Gas Balloon" and "Set Helium Flow" steps were removed; balloon oven shows 80 °C from page open.
Guards: load refused while the vacuum valve is open; injection refused without stable carrier flow / with vacuum open.

Chromatograms: `TCD_SIG` / `FID_SIG` built from independent ILLUSTRATIVE peak lists (`GAS_COMPS.rtT/hT` packed-TCD,
`rtF/hF` capillary-FID, `FID_SUB` simulated C6+ peaks, `FID_MINOR` trace peaks, tailing + baseline drift / bleed).
Table RT = RT on the reported channel (non-HC TCD, HC FID); mol% unchanged. Results column: compact GC-oven
programme chart (`tempChart`, with the 80 °C balloon-oven reference line) + TCD over FID (`mkChart`, shared L/R so
time axes align, labels spread sideways with leaders). Expand = both channels with one shared zoom.
Playback: `GC.gas.runMs` 60 s (x PROCESS_SPEED_MULTIPLIER).

## Sampling module visual update (2026-09-30)

- `components/FieldSketch.js`: the Field Sampling Overview artwork moved out of showModule01.js and split into
  groups (strata, well, tree, mid = choke + manifold, sep). ONE drawing is used by Overview, Wellhead and
  Separator (`fieldVis` / `fieldVB` in Main.renderVals). Sampling pages add `.fz-dim` (theme.css) to the
  inactive groups - visual focus only, flows keep moving; secondary labels (`.fz-minor`) hide when dimmed.
- Wellhead overlay: needle sampling valve on the flowline riser (x 206) -> tubing -> piston bottle (x 372).
  Separator overlay: gas outlet valve (x 1110) -> gas bottle above the gas line; oil outlet valve (x 1120) ->
  oil piston bottle standing right of the outlets. Same bindings as before (sampleFlow, whBtl*, sepBtl*, sepGasFill);
  valve colour = whValveFill / sepValveFill (open while sampleFlow).
- Side panels (all four sampling pages): header, live data, sample-container figure, step card (number, short
  title, progress - `.m01-pc .pc-q` / `.bhs-pc .pc-q` hidden), controls, Move to Lab. "Pressure maintenance",
  "Separate phases" and the Bottom Hole procedure list + instruction moved into Explain This Stage
  (StepGuide: `note`, `proc`, overview `note`).
- BottomHoleSim.js: wavy overview-style strata with a reduced-contrast veil away from the well; new truck,
  sheaves, rig (substructure, floor, drawworks, mast, crown), BOP stack; cased hole reuses the overview
  tree / choke / separator (FieldSketch parts, scaled) under a new pressure-control stack; flowline + test
  separator dimmed (`.bhs-bgdim`). Tool cutaways: tinted module bays + joint collars, bottle end caps,
  orthogonal callout leaders, larger text, magnifier frame + zoom cone to the inset. Side-panel figure shows the
  MPSR bottles / SRS chamber + N2 from the same state. Timeline, states and values unchanged.
- Backup: _backup_app_20260930_before_sampling_visual/

## Bottle scale, valve direction and stands (2026-10-20)
- `BottleArt` placement option `flip` (mirror left-right) sets valve direction per page; the shared drawing is
  unchanged and `oilPort` / `SampleBottle.ports` follow it. Validation: valves face RIGHT (Steps 1-3 bottle is
  inverted + flipped; transfer, step 4 at 0°, charging and recombination were already right). Sampling: wellhead
  bottle (field + panel) and separator oil bottle are flipped so their valves face LEFT toward the incoming line.
- `BottleArt.stand(p, o)` = shared lab support stand (base plate on feet, rod, boss clamps, side jaw pads only,
  optional fork ledge under the lower cap) used by Steps 1-3, Sample Transfer (restored) and Charging.
  Step 4 inversion stand (QcAgitSim) and Recombination stage-9 stand restyled to match; motion unchanged.
  `rodX == x` puts the rod behind the bottle (Charging: keeps the moving Floating Piston pointer clear).
  Recombination stages before inversion: slot stand (rod right, two clamps) at the connection slot, fades out
  as the stage-9 inversion stand takes the bottle (RecombSim drawSlotStand).
- Scales: Steps 1-3 0.49 -> 0.55 (centre 300, 238; Main QC_CY / QC_S), Step 4 0.5 -> 0.56 (pivot 405, 245),
  transfer 0.49 -> 0.55 (centre 300, 300), charging 0.41 -> 0.47, wellhead 0.42 -> 0.55 (rests on ground y 360),
  separator gas 0.36 -> 0.52, oil 0.33 -> 0.48. Recombination (0.67) unchanged.
- Step 3 drain: reverse-L outlet (horizontal run, one 90° elbow, open end down at 372, 418), air gap above the
  receiver; drops form at the opening and fall only while `qc3Flow` (waterDropStyle). Volumes / timing unchanged.


## Calculator live workspace (2026-10-31)

`components/PvtCalc.js` now opens essential inputs and the live property chart together.
Calculator and Results Table are the only primary views; Measured Data and Methods &
References remain in More tools. Property names use full labels. Options contains
correlation selection, pressure increment, composition, sour gas and standard-basis
settings; existing defaults and all `calc/` equations are unchanged. Comparison curves
are optional behind Compare methods. Example data is visibly marked; invalid inputs
clear the chart, and errors inside nested options open their containing disclosures.
The `.pv-workspace` CSS is scoped to this screen: compact inputs beside the chart on
desktop, stacked inputs then chart on phones. Full-precision canonical inputs and all
existing scientific limitations remain in force.

Verification for this UI change: `node --test tests/*.test.js` — 55 passed; syntax
checks for PvtCalc and the updated browser suite passed. Browser smoke test on the
branch preview covered simultaneous inputs/chart, live temperature changes, invalid
pressure clearing, Field/Metric retention (25 oil points), property selection, Gas
mode, keyboard point selection, equation drawer and reference navigation. The full
browser suite was adapted to the new navigation and compact chart dimensions but
was not rerun in this session; phone/device layout and exports need that broader run.
