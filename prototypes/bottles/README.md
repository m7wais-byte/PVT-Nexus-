# Bottle design prototype (PVT Nexus)

A standalone design study of the sampling bottles and cylinders used in PVT Nexus. It is **not linked to the simulator**: no simulator file, navigation, data file or workflow was changed. The animation is **illustrative only, not a validated physical simulation**.

## Preview

Serve the repository root over HTTP and open the prototype:

```bash
python3 -m http.server 8000      # from the repository root
# http://localhost:8000/prototypes/bottles/
```

Plain HTML, CSS and JavaScript. No build step and no packages. The only external request is the IBM Plex font link the simulator already uses; system fonts are used when offline. The logo comes from `../../assets/logo.png`.

You can open a specific view straight from the URL, which is useful for reviews:
`?cfg=wh|sep|bh|rc|gspField|gspLab|ti` · `&t=<seconds>` · `&view=exterior|cutaway` · `&orient=upright|horizontal` · `&labels=0|1`

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell |
| `bottles.css` | Styles; light and dark tokens copied from `theme.css` |
| `bottle-draw.js` | `PBDraw`: SVG generators for the 3 vessel designs. Uses local coordinates and namespaced ids |
| `bottle-configs.js` | `PBConfig`: bottle types, configurations, values and timelines (each frame is a pure function of time) |
| `app.js` | Controls, instrument panel, one `requestAnimationFrame` loop |
| `screenshots/` | Preview captures at 1366×768 and 1920×1080 |

## Bottle types found in the repository

Only 3 physical designs are supported by the code. Uses that share one physical bottle are configurations of that design.

1. **Piston sample bottle (SPS/PDS type)** (`SampleBottle.js`). A barrel with screwed end caps, a floating piston with 2 O-rings, and a needle valve at each end. It has 4 configurations:
   - **Wellhead, N₂ back-pressure** (the constant-pressure sampling bottle): 600 cc, N₂ at 2,000 psig behind the piston, line at 1,450 psig and 60 °C. Sequence: fill, then close and seal.
   - **Separator oil, water buffer**: 600 cc at 200 psig and 35 °C. Oil fills from the top and displaces water out of the bottom. In the lab the bottle is pressurised from 315 to 3,000 psig (1.4 cc of water), then delivers 180 cc to the PVT cell (taken from RecombSim stage 6).
   - **Bottom hole, SPS/PDS lab bottle**: 800 cc. Receives the 450 cc MPSR transfer at 5,000 psi and 114 °C, then charges 82 cc to the PVT cell.
   - **Recombination bottle**: 275 cc with 30 cc of water. It receives 40 cc of gas (measured at 5,000 psig), then 179 cc of oil. It is pressurised to 5,000 psig and inverted 3 × 180° until single phase.
2. **Separator gas bottle (GSP)**: a rounded-shoulder gas bottle with no piston and no water. It has 2 configurations: the **field fill** at the separator gas outlet (to 200 psig), and the **lab GSP source** feeding the booster (315 → 296 psig).
3. **Titanium transfer cylinder**: 330 cc with bolted end flanges and a floating piston. Sequence: vacuum, boost to 1,000 psig, compress to 5,000 psig with water, then deliver 60 cc at constant 5,000 psig, leaving 9 cc.

The MPSR and SRS downhole tool chambers are left out. The project describes them as tool modules, not transport bottles.

## Operating logic used

- Each port connects only to its own chamber. Flow is drawn only through open valves, and nothing crosses the piston.
- The piston position and the chamber volumes come from the same cc values: sample side + buffer side = capacity.
- Gas inventory is drawn as dots. Compression packs the same dots into less space. Liquid is drawn as a solid fill that moves by transfer.
- Pressure is shown only from project values, from linear ramps between project end points (labelled), or from the project's RecombSim model P·Vⁿ = const (titanium cylinder, recombination bottle). Every other pressure shows "not modelled".
- When the bottle is tilted or inverted, the liquid surface stays level and the free gas stays on top. Internal parts rotate with the vessel.

## Assumptions to review

1. **Wellhead N₂ side**: the project says N₂ is "displaced in a controlled way". I have drawn this as a bleed through the bottom valve. The valve opening and closing order is also assumed. Discharge is disabled because changing over from N₂ to water is not described.
2. **Valve closing order** for the separator oil bottle: water side first, then sample side (assumed).
3. **Capacity conflicts** in the project: the separator oil bottle is 600 cc in Sampling but 200 cc in RecombSim, and Validation's `bottleModel` uses 800 cc for every source. The fill volume here is 200 cc (RecombSim). The wellhead fill of 490 cc comes from the drawing fraction (0.82 × 600).
4. **Separator gas pressure**: 200 psig at the separator but 315 psig as the GSP in Recombination. That is why they are 2 separate configurations.
5. **Gas bottle**: the capacity and the state before filling are not defined (it is drawn empty). There are two drawings in the project: Sampling has 2 valves, Recombination has 1. I kept both valves and plugged the bottom one. The green service band is a design choice.
6. **Titanium vacuum step** (repository logic): the piston rises to 12 cc and leaves an empty gap above the 30 cc of water. Please confirm this is physically intended.
7. **Recombination**: the two oil strokes (99 + 80 cc) are drawn as one. Gas shrinkage while mixing (`MIX_SHRINK`) is visual only, as in RecombSim. No heating-jacket set point is defined in the project.
8. **Dimensions and construction** are representative, not a manufacturer's design. All piston-bottle configurations are drawn at the same size, as `SampleBottle.js` does. No bottle has a gauge in the project, so readings are in the instrument panel.
9. **Fluid colours**: the project uses pale blue for gas in `SampleBottle.js` but green in `RecombSim.js`. The prototype uses the green "Separator gas" colour throughout.
10. **Manual titanium slider**: limited to between the volume at 5,000 psig and 300 cc. Pressure readings below 1,000 psig are marked as extrapolated.

## Note before integration

The Pages workflow publishes the repository root on pushes to `main`. If this folder is merged, it becomes publicly reachable at `/prototypes/bottles/`.
