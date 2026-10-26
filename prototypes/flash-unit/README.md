# Flash Unit, Gasometer & Density Meter — Prototype 02, rev. B (design review)

Standalone review page for the redesigned Validation → Flash Process equipment. It is not linked to the simulator. No existing page, component or value was changed; `components/PVTCellArt.js` and `data/report-data.js` are only read.

## Preview

```bash
python3 -m http.server 8000          # from the repository root
# open http://localhost:8000/prototypes/flash-unit/
```

No build step. `build-preview.py OUT.html` bundles the page into one file for the hosted preview.
`node prototypes/flash-unit/tools/verify.js` runs the geometry and process checks (Playwright).

Review links: `?stage=n` (end of stage n) · `&run=1&t=<s>&hold=1` (run stage n, fast-forward, pause) · `&view=auto|system|fu|ga|dm` · `&labels=0` · `&details=fu|ga|dm&dview=overall|internal&demo=<stage>&dt=<s>`.

## Rev. C — layout (this revision)

- System view arranged left to right like the live Flash Process page: computer + controller (shared `PVTCellArt.desk` + signal cable), the **full-size PVT Cell** (scale 0.75, shared drawing), Flash Unit, Gasometer.
- The **blue gas-collection vessel stands inside the Flash Unit** frame, right bay, on the lower deck with a strap clamp; the large flask moved left within the frame (same size). Gas-collection line: Gasometer → gas line → Flash Unit manifold → vessel branch → the vessel's own top valve (no extra valve). Vessel pressure display above the vessel.
- Vacuum branch moved to a quick-connect high on the right post; the temporary pump stands between the Flash Unit and the Gasometer during Stage 2 only.
- Same components in System, Flash Unit, Stage 7 and Details views. Values and timings unchanged.

## Rev. B

Equipment redrawn from the written description of the laboratory photographs. **The photographs themselves were not available in the session**, so proportions come from the description; please compare against the photos.

- **Flash Unit**: black rectangular frame with transparent panels; upper stainless mounting plate with the inlet-control (isolation) valve, solenoid flow-control valve, delivery line and pressure transducer; a much larger glass flask with a sealed stainless head (two passages); balance on an adjustable lab jack; lower controller with PRESSURE and FLOW displays. Black valve handles.
- **No permanent vacuum pump.** A portable pump is wheeled in during Stage 2, its hose attaches to a capped quick-connect, then it is disconnected and removed. Stage 2 gets a short connect / disconnect phase before and after the unchanged Stage 2 timeline (prototype addition). Route Check shows *Not installed → Connecting → Connected · Active → Disconnected*.
- **Gasometer**: two-section stainless cabinet — 2,000 cc (left) and 1,000 cc (right); per section a volume display, temperature display, compound gauge, inlet / vent / isolation valves, a transparent chamber with a scale and a lower control knob.
- **Blue gas-collection vessel** replaces the soft balloon: tall dark-blue cylinder, brass top valve with a black knob and a side connection. Its own valve is the isolation valve (no extra valve in the line).
- **Density meter**: DMA 4100 M–style housing (grey, sloped touchscreen, red strip, side adapters, waste bottle with red cap, syringe). Screen method *Crude Oil (API)* with Density, API SG 60 °F, API Density 60 °F, API Gravity 60 °F, set and actual temperature, U-tube view, status and Start / Finished.

### Values (unchanged from Main.js unless noted)

Stages 1–6: Pump A 80 → 30 cc, flashed 50 cc, oil 40 g (balance 200 → 240 g), Gasometer helium 3,000 → 0 cc then gas 0 → 400 → 150 cc, vessel (balloon) 0 → 250 cc / 14.5 psi, unit pressure 14.7 → 0 → 14.7 psia, flow 0.3 mL/min, valve timing FXP.

- **Gasometer split (prototype rule):** the existing total is shown as 2,000 cc section first + 1,000 cc section for the rest, so left + right always equals the total. Helium therefore leaves the 1,000 cc section first; flashed gas uses only the 2,000 cc section.
- **Gasometer temperature:** not carried by the simulator; the displays show an example 22.0 °C.
- **Stage 7 (example values):** set temperature 25.00 °C; ρ(25 °C) = 0.79400 g/cm³ back-calculated from the report stock-tank oil density 801.26 kg/m³ at 60 °F with the API MPMS 11.1 / ASTM D1250 crude-oil correction (simplified 1980 form: α60 = 341.0957/ρ60², CTL = exp(−αΔT(1+0.8αΔT))). Meter output: API density 60 °F 0.80126 g/cm³, SG 60/60 °F 0.8020, **44.9 °API** (report 44.9 °API). Aliquot 2.0 mL (≈1.6 g) illustrative; recorded oil stays 40 g.

### Remaining assumptions

1. Internal gasometer mechanics (what the knobs move) are not modelled; the chamber shows a gas column and boundary only.
2. The 2,000-cc-first split order is a prototype rule unless the lab procedure says otherwise.
3. Oil sampling through a flask side-arm with a stopcock (no flask photo detail for this).
4. Temperature correction uses the simplified crude-oil form; the instrument applies the full standard.

## Files

| File | Purpose |
|---|---|
| `parts.js` | Blue gas vessel, portable vacuum pump, syringe, waste container |
| `common.js` | `FX`: path builder (SVG path + sampled polyline), tubing, fittings, valves, flow lanes, callouts, gradients |
| `flash-unit.js` | `FlashUnit`: frame, sample inlet + inlet control valve, flexible lines, flask head, flask, balance, gas header, vacuum and balloon branches, oil sampling side-arm; port anchors and internal routes |
| `gasometer.js` | `Gasometer`: two-section gas meter, 2,000 + 1,000 cc |
| `density-meter.js` | `DensityMeter`: DMA 4100 M–style meter, Crude Oil (API) screen |
| `sim.js` | `FlashSim`: Stages 1–6 copied from `Main.js runFlashStage()`; Stage 7 timeline and the 60 °F / API calculation |
| `scene.js` | Places instruments, draws inter-instrument tubing from port anchors, assembles flow routes, syringe |
| `details.js` | Flash Unit / Gasometer / Density Meter Details (same pattern as `CellDetails.js`) |
| `app.js`, `index.html`, `flash.css` | Preview page |
| `screenshots/` | 1366×768 and 1920×1080 captures |

The main preview and the Details views call the same instrument modules, so geometry and connections are identical.

## Rev. A notes (superseded where rev. B differs)

## Corrected flow (Flash Unit)

- **Sample route:** Pump A → Port R valve → sample line → bulkhead → **inlet control (metering) valve** → flexible PTFE line → flask head **inlet passage** → dip tube → **delivery tip inside the flask** (above the highest oil level).
- **Gas route:** **gas outlet opening in the neck** (headspace, never in the oil) → head **outlet passage** → flexible line → gas header → gasometer valve → gasometer chamber.
- The two passages are separate inside the head. There is no tee between the sample line and the gas line: the only connection between them is the flask.
- Animation in Stage 4: the sample front reaches the inlet valve when the flashed-volume counter starts (0.287, existing value), reaches the tip at 0.36; the first drop forms 0.36–0.42; oil collects from 0.42 (existing); bubbles rise from 0.37; gas leaves the outlet at 0.40 and reaches the gasometer at 0.47, when the gasometer reading starts (existing).
- Lanes are gated by the valves on their route; a closed valve stops the animation.

## Valve route changes (smallest adjustment)

| Valve | Before | Now |
|---|---|---|
| "Flask valve" (open in Stage 4) | on the down-leg from the manifold to the flask | **inlet control valve** on the sample inlet; same timing |
| Gasometer valve (3, 4, 5) | manifold → gasometer | unchanged, at the gasometer port |
| Balloon valve (5), vacuum valve (2) | manifold tees | tees on the gas header; unchanged timing |

Helium (Stage 3) now visibly enters the flask through the gas outlet passage, the reverse of the gas route. Balloon filling (Stage 5) runs gasometer → gas header → balloon branch only; the inlet valve stays closed.

## Gasometer

Exterior: floor-standing navy frame (matches the PVT Cell), control head with volume display (cc), gas (HELIUM / FLASH GAS) and atmospheric-hold status, single process port with gasometer valve and a Δp sensor, measuring cylinder with a 0–3,000 cc scale, lower drive bay. Internal view (simplified schematic): gas above a sealed piston, rod, carriage, lead screw, stepper motor. The display follows the existing `fGaso` / `fHeGas` values exactly.

**Mechanism assumption.** The manufacturer pages (Chandler 2331D, Vinci GOR) could not be opened from this environment. The drawn principle (motor-driven piston held at atmospheric pressure by a pressure sensor and controller, volume from the displacement) follows published piston-gas-meter descriptions (US 4,823,598; US 8,991,233). It is labelled a simplified schematic and does not claim any product's internals. No gasometer temperature is shown because the workflow does not carry one.

## Stage 7 · Density & API (new)

1. Syringe fitted to the flask **oil sampling side-arm** (PTFE stopcock, closed during flashing, below the oil level).
2. Stopcock opens, 2.0 mL aliquot drawn (illustrative), stopcock closes. The balance drops by ≈1.6 g; the **recorded oil (40 g, Stage 6) is unchanged**.
3. Syringe carried to the density-meter Luer inlet; U-tube fills, excess to waste; bubble check.
4. Temperature equilibrium at 20.00 °C, period measurement, results.

Calculation (`sim.js`):

- ρ60 from the reading at T by iteration: ρT = ρ60 · CTL, CTL = exp(−α ΔT (1 + 0.8 α ΔT)), α = 341.0957 / ρ60², ΔT in °F from 60 (API MPMS Ch. 11.1 / ASTM D1250 crude-oil form, 1980 coefficients, simplified).
- SG 60/60 °F = ρ60 / 999.016 kg/m³; API = 141.5 / SG − 131.5.
- **Example values:** the project stock-tank oil density (report data, 801.26 kg/m³) gives the 20 °C reading 0.79785 g/cm³ → ρ60 0.80126 g/cm³ → SG 0.8020 → **44.9 °API** (report: 44.9 °API).

The flask side-arm replaces a septum on the head: a needle long enough to reach the oil from the head would need ~300 drawing units of clearance above the unit. The head keeps exactly two passages.

## References used

- Vinci GOR Apparatus; Vinci Equilibrium Flash Separator; Chandler 2353 Equilibrium Flash Separator; Chandler 2331D Digital Gasometer (links given in the request; pages not reachable from this environment, so only general construction was used).
- US 4,823,598 (motor-driven piston gas meter held at set pressure); US 8,991,233 (floating-piston gasometer, graduated cylinder; flash flask).
- ASTM D4052 (oscillating U-tube density, relative density, API gravity); API MPMS Ch. 11.1 / ASTM D1250 (temperature correction to 60 °F).

## Open items for review

1. Gasometer internals: confirm against the real instrument used in the lab.
2. Side-arm for oil sampling vs. another sampling method used in the lab.
3. Measuring temperature (20 °C) and aliquot volume are example choices.
4. After approval: replace the Flash Process drawing in `screens/showTest.js` / `Main.js`, add Stage 7 to the live sequence, and move these modules into `equipment/`.
