# PVT Cell — Prototype 01 (design review)

A standalone, interactive review page for the one permanent dual-cylinder PVT cell that will later replace the cells on the procedure pages. It is not linked to the simulator, and no existing page, cell or value was changed.

## Preview

```bash
python3 -m http.server 8000          # from the repository root
# open http://localhost:8000/prototypes/pvt-cell/
```

There is no build step. `build-preview.py OUT.html` bundles the page into one file for the hosted claude.ai preview.

Review links: `?preset=charge|pv|agit|xfer|two|plumb` · `&view=cutaway|plumbing` · `&labels=0` · `&t=<s>` (fast-forward, for screenshots).

## Files

| File | Purpose |
|---|---|
| `plumbing.js` | `PVTPlumb`: plumbing schematic and connectivity read-out (same state) |
| `pvt-cell.js` | `PVTCell`: the cell drawing (fixed geometry `G`), the shared `pistonTop(v)` conversion, `mount()` → `update(state, t)`, `setView()`, `setLabels()` |
| `app.js` | Preview only: movement clock (pause/resume), presets, manual controls |
| `index.html`, `cell.css` | Page shell and light-theme styles |
| `../../equipment/bottle-draw.js` | Approved Oil Sample Bottle drawing (reused unchanged for the Charge preset) |
| `screenshots/` | Charge and A ↔ B in exterior, cutaway and plumbing; four valve states; transfer out (1366×768, 1920×1080) |

## Views

- **Exterior**: the equipment as it looks.
- **Cutaway**: a training section of the same geometry, showing sample chambers, pistons and internal passages. The real cylinders are opaque.
- **Plumbing**: a schematic of the built-in plumbing, drawn from the same live state. Colour shows which volumes are connected to the header and pressure sensor. The Cell Valve position is confirmed. **The cylinder-valve arrangement is still inferred from existing simulator code.** *Check all 4 valve states* steps through both closed, only A, only B and both open.

## Fixed design (identical in every use)

- Thermal enclosure in a navy frame. **Pump B is on the left and Pump A is on the right**, with a lower mechanical piston drive under each cylinder.
- **Three permanent cell valves**:
  - **Pump B valve** and **Pump A valve**: one valve block on top of each cylinder, with a T-handle above the roof.
  - **Cell Valve (valve 3)**: at the **upper rear, behind the enclosure** (confirmed). It sits between Port L and the header. Its stem rises at the rear through the roof to a T-handle beside the Pump B handle. In the exterior view its body and rear line are drawn as hidden (dashed) lines behind the back panel. In the cutaway they are revealed in section inside a dashed outline. Its position is the same in every procedure.
  - All three valves show **open/closed only**: a green ring and OPEN/CLOSED tag, plus a red seat bar in the cutaway. The operating mechanism is not verified, so nothing turns.
- **Built-in plumbing**: Port L → rear line → **Cell Valve** → header tee → Pump B tee → pressure sensor → Pump A tee → Port R.
  - **Closing the Cell Valve isolates Port L's external line from the header and from Port R.**
  - Each cylinder valve isolates only its own cylinder (inferred).
  - Port R has no valve and is always on the header.
- **Two fixed ports**: Port L and Port R, on the frame posts. Neither is defined as gas or liquid. Charge feeds the left end and Flash takes sample from the right end.
- Panel displays: header pressure (psig), sample volume for B and A (cc), and temperature (°C). The controller and computer stand on a desk to the right, behind the cell. Signal cables are dark sheathed curves, never steel tubing.

Only these change between uses: valve states, piston positions, readings, phase, port closures, and attached equipment or tubing.

## Port rules

Each port is in one of three states: **rated plug** (a pressure-rated closure), **open**, or **tubing**. A plug or tubing comes off only when **that port** reads 0 psig.

- Port R reads the header pressure.
- Port L reads the header pressure when the Cell Valve is open, and its own isolated line pressure when the Cell Valve is closed.
- The header cannot be pressurised while a port is open to it.

**Bottle disconnection**, at the end of the Charge preset:
1. Close the Pump A valve.
2. Close the Cell Valve. The cell stays at its pressure.
3. Close the bottle valve.
4. Release the isolated Port L line to 0 psig. The release route is not drawn.
5. Disconnect the tubing.
6. Fit the rated plug.

## External equipment in the Charge preset

SPS/PDS bottle (approved Oil Sample Bottle drawing) → bottle valve → external tubing → Port L → Cell Valve → header. The **transfer pump** feeds driving fluid into the bottle's lower (driving-side) valve, as on the Charge page. The bottle quantity and drawing scale follow the bottle model the simulator already uses for this drawing (`Main.js bottleModel()`). All displayed numbers are temporary preview values.

## Volume → piston

`pistonTop(v) = boreTop + stroke × v / scale`. The sample always fills the chamber from the top of the bore down to the piston face. More volume moves the piston down. The exterior shows the same position through the drive window (0–100 cc scale). A↔B transfers keep `vA + vB` exactly constant.

The scale is **100 cc per cylinder, the existing simulator capacity** (`RecombSim.js CFG.CELL_CAP`, `StagePVTest.js PUMP_CAP`). It is **not a verified Expro or manufacturer specification**.

## Values used by the presets (taken from the simulator, not calculated)

| Preset | Source |
|---|---|
| Charge | Charge page stages: −15 psig vacuum, line fill, 2 cc dead space at 5,000 psig, 80 cc into Pump A, transfer pump 100 → 18 mL |
| Closed-cell PV | Validation PV dataset in `StagePVTest.js` (30.0 cc at 5,000 psig, Psat 2,700 psig at 31.3 cc) |
| A ↔ B agitation | 80 cc A → B and back (Charge agitation) |
| Transfer out | 50 cc from Pump A (Flash). Port R is opened at 0 psig with Pump A isolated, then the header equalizes at 5,000 psig |
| Two-phase | PV dataset point at 2,000 psig, 33.4 cc |

Temperature is 114 °C, the project reservoir temperature. The gas share (18 %) and the bubbles are **illustrative only**. The manual volume, pressure and temperature buttons set values directly; no pressure or phase relationship is calculated.

## Open items for review

1. **Cylinder-valve arrangement**: inferred from simulator code. Confirm against the real cell that the Pump B and Pump A valves sit on tees of the header.
2. **Port L line release**: the route used to release the isolated line before disconnection is not drawn.
3. **Drive mechanism**: drawn as a lead-screw drive with a carriage. The real drive type is not specified.
4. **Receiver at Port R**: a generic placeholder.
5. **Preview numbers**: all values are temporary. After approval, each procedure keeps its own numbers, sequence and timing, with its connections mapped to Port L, Port R and the three cell valves.
