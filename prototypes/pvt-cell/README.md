# PVT Cell — Prototype 01 (design review)

A standalone, interactive review page for the one permanent dual-cylinder PVT cell that will later replace the cells on the procedure pages. It is not linked to the simulator, and no existing page, cell or value was changed.

## Preview

```bash
python3 -m http.server 8000          # from the repository root
# open http://localhost:8000/prototypes/pvt-cell/
```

There is no build step. `build-preview.py OUT.html` bundles the page into one file for the hosted claude.ai preview.

Review links: `?preset=charge|pv|agit|xfer|two` · `&view=cutaway` · `&labels=0` · `&t=<s>` (fast-forward, for screenshots).

## Files

| File | Purpose |
|---|---|
| `pvt-cell.js` | `PVTCell`: the cell drawing (fixed geometry `G`), the shared `pistonTop(v)` conversion, `mount()` → `update(state, t)`, `setView()`, `setLabels()` |
| `app.js` | Preview only: movement clock (pause/resume), presets, manual controls |
| `index.html`, `cell.css` | Page shell and light-theme styles |
| `../../equipment/bottle-draw.js` | Approved Oil Sample Bottle drawing (reused unchanged for the Charge preset) |
| `screenshots/` | Exterior and cutaway, 1366×768 and 1920×1080 |

## Fixed design (identical in every use)

- Thermal enclosure in a navy frame. **Pump B is on the left and Pump A is on the right**, with a lower mechanical piston drive under each cylinder.
- **Two cylinder valves**: Pump B valve and Pump A valve, one valve block on top of each cylinder, with a T-handle above the roof. These match the two valves on the Charge page header.
- **Built-in header**: Port L → Pump B block → pressure sensor tee → Pump A block → Port R. The header passes straight through each valve block, and each valve isolates only its own cylinder. This is the same behaviour as Charge, where the Pump B valve sits on the header tee and Charge fills Pump A past it.
- **Two fixed header ports**: Port L and Port R, on the frame posts. Neither port is defined as gas or liquid. In the current pages, Charge feeds the left end of the header and Flash takes sample from the right end. An unused port is shown capped (red).
- Panel displays: pressure (psig), sample volume for B and A (cc), and temperature (°C). The controller and computer stand on a desk to the right, behind the cell. Signal cables are dark sheathed curves, never steel tubing.

Only these change between uses: valve states, piston positions, readings, phase, and which external equipment or tubing is attached.

## Volume → piston

`pistonTop(v) = boreTop + stroke × v / capacity`. The sample always fills the chamber from the top of the bore down to the piston face. More volume moves the piston down. The exterior shows the same position through the drive window (0–100 cc scale). A↔B transfers keep `vA + vB` exactly constant, and a transfer never exceeds the receiving cylinder's capacity.

Capacity is **100 cc per cylinder**, from `RecombSim.js CFG.CELL_CAP` ("user-specified 2026-09-30") and `StagePVTest.js PUMP_CAP`.

## Values used by the presets (taken from the project, not calculated)

| Preset | Source |
|---|---|
| Charge | 80 cc into Pump A at 5,000 psi (Charge page) |
| Closed-cell PV | Validation PV dataset in `StagePVTest.js` (30.0 cc at 5,000 psig, Psat 2,700 psig at 31.3 cc) |
| A ↔ B agitation | 80 cc A → B and back (Charge agitation) |
| Transfer out | 50 cc from Pump A (Flash) |
| Two-phase | PV dataset point at 2,000 psig, 33.4 cc |

Temperature is 114 °C, the project reservoir temperature. The gas share (18 %) and the bubbles are **illustrative only**. The manual volume, pressure and temperature buttons set values directly; no pressure or phase relationship is calculated.

## Open items for review

1. **Charge "Cell Valve"**: the Charge page has a third valve on the inlet line, outside the rack. The prototype treats it as part of the external charge line, so it is not a permanent cell valve and is not drawn. Confirm whether it belongs to the cell (that would add a permanent valve at Port L) or to the line.
2. **Port isolation**: with this layout, Port L and Port R have no valve of their own on the cell side. They are open to the header and the sensor whenever they are uncapped.
3. **Scale mismatch in the existing pages**: Charge draws 100 cc as 176 px and StagePVTest as 173 px. Using one shared `pistonTop()` will resolve this at integration.
4. **Drive mechanism**: drawn as a lead-screw drive with a carriage. The real drive type is not specified.
5. **Valve handle**: shown as a quarter turn (T-bar seen end-on when open), the same as Charge. Real needle valves need several turns.
6. **Not drawn**: the transfer pump that pushes the bottle's driving side during Charge. The bottle sample volume uses a 275 cc drawing capacity (RecombSim `BOTTLE_CAP`) with 200 cc at the start.
7. **Receiver at Port R**: a generic placeholder. Flash, viscometers and other equipment will attach to the same fitting.
8. **Ranges**: the manual limits (0–10,000 psi, 20–200 °C) are preview limits, not equipment ratings.
