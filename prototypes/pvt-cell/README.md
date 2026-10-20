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
- **Plumbing**: a schematic of the built-in plumbing, drawn from the same live state. Colour shows which volumes are connected to the header and pressure sensor in each valve state. **The arrangement is inferred from existing simulator code** and must be confirmed against the real equipment. *Check all 4 valve states* steps through both closed, only A, only B and both open.

## Fixed design (identical in every use)

- Thermal enclosure in a navy frame. **Pump B is on the left and Pump A is on the right**, with a lower mechanical piston drive under each cylinder.
- **Two cylinder valves**: Pump B valve and Pump A valve, one valve block on top of each cylinder, with a T-handle above the roof. These match the two valves on the Charge page header. Valves show **open/closed only**: a green ring and OPEN/CLOSED tag, plus a red seat bar in the cutaway. The handle does not turn, because the operating mechanism (number of turns, needle type) is not verified.
- **Built-in header (inferred)**: Port L → Pump B tee → pressure sensor → Pump A tee → Port R. Each cylinder valve isolates only its own cylinder, so **Port L stays connected to Port R in every valve state**. The sensor reads only the header plus whichever cylinders are open.
- **Two fixed ports**: Port L and Port R, on the frame posts. Neither is defined as gas or liquid. Charge feeds the left end and Flash takes sample from the right end.
- Panel displays: header pressure (psig), sample volume for B and A (cc), and temperature (°C). The controller and computer stand on a desk to the right, behind the cell. Signal cables are dark sheathed curves, never steel tubing.

Only these change between uses: valve states, piston positions, readings, phase, port closures, and attached equipment or tubing.

## Port rules

Each port is in one of three states: **rated plug** (a pressure-rated closure), **open**, or **tubing**. A plug or tubing comes off only when the header reads 0 psig. The header cannot be pressurized or vacuumed while a port is open. The Port L tubing also cannot be removed while the bottle valve or the Cell Valve is open. Pressurized presets always show unused ports plugged.

## External equipment in the Charge preset

SPS/PDS bottle (approved Oil Sample Bottle drawing) → bottle valve → **Cell Valve** → Port L. The **transfer pump** feeds driving fluid into the bottle's lower (driving-side) valve, as on the Charge page.

- The Cell Valve stays at its Charge-page location on the external charge line. Its ownership is unconfirmed: it is not drawn as part of the cell, and it is labelled "owner unconfirmed".
- Transfer pump volumes come from Charge: 100.0 → 98.0 mL (line fill) → 95.0 mL (2.0 cc dead space, equalized at 5,000 psig) → 18.0 mL (80 cc into Pump A).
- The bottle **sample quantity** (450 cc, then 368 cc) is kept separate from its **drawing scale** (800 cc). Both come from `Main.js bottleModel()`. The drawing scale is not a verified bottle capacity.

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

1. **Header arrangement**: inferred from simulator code. Confirm against the real cell that the two cylinder valves sit on tees of one header with no valve between Port L and Port R.
2. **Cell Valve ownership**: Charge disconnects the bottle after closing the Cell Valve while the cell stays at 5,000 psig. That suggests the Cell Valve isolates Port L. If it belongs to the cell, it becomes a third permanent valve at Port L. If it belongs to the charge line, Port L has no isolation of its own.
3. **Charge order**: Charge vacuums the cell before connecting the bottle. Here Port L is connected first, so the cell can be vacuumed while Port L is sealed. The vacuum source is not drawn.
4. **Scale mismatch in the existing pages**: Charge draws 100 cc as 176 px and StagePVTest as 173 px. Using one shared `pistonTop()` will resolve this at integration.
5. **Drive mechanism**: drawn as a lead-screw drive with a carriage. The real drive type is not specified.
6. **Receiver at Port R**: a generic placeholder. Flash, viscometers and other equipment will attach to the same fitting.
7. **Ranges**: the manual limits (−15 to 10,000 psig, 20–200 °C) are preview limits, not equipment ratings.
