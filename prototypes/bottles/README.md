# Sample bottle designs (PVT Nexus prototype)

A standalone design review page for the two general bottle designs: the **Oil Sample Bottle** and the **Gas Sample Bottle**. It covers appearance and internal construction only. There are no procedures, capacities, pressures, temperatures or animations. The page is not linked to the simulator.

## Preview

Serve the repository root over HTTP:

```bash
git fetch origin claude/awesome-goodall-e0qp90
git checkout claude/awesome-goodall-e0qp90
python3 -m http.server 8000          # from the repository root
# open http://localhost:8000/prototypes/bottles/
```

Opening `prototypes/bottles/index.html` directly from disk also works. There is no build step and no package to install.

URL options for review links: `?show=both|oil|gas` · `&view=exterior|cutaway|pair` · `&orient=upright|horizontal` · `&labels=0` · `&theme=light|dark`

## Controls

- **Bottle:** Compare both · Oil Sample Bottle · Gas Sample Bottle
- **View:** Exterior · Cutaway · Exterior + cutaway (side by side)
- **Orientation:** Upright · Horizontal
- **Labels:** on / off
- **Background:** light / dark

Both bottles are drawn at the same scale, and the exterior and cutaway views use identical geometry.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell |
| `bottles.css` | Styles; light and dark tokens from `theme.css` |
| `bottle-draw.js` | `PBDraw.oil()` / `PBDraw.gas()` editable SVG generators, label anchors, namespaced ids |
| `app.js` | View controls and label layout |
| `screenshots/` | Captures at 1366×768 and 1920×1080 |

## References

| Reference | Access from the build environment |
|---|---|
| Leutert PDC datasheet (PDF) | **Not accessible.** Download and fetch were both blocked. Used the Leutert PDC product-page description returned by web search: a floating piston with a **mixing ball**, **valve protectors on both ends**, **right-angle needle valves** with **¼" NPT female** ports, and a **special fitting on the sample side for evacuation**. |
| Swagelok MS-01-177 catalogue (PDF) | **Not accessible.** Used general Swagelok information returned by web search: **double-ended**, **seamless** construction, heavy-duty ends with **¼" FNPT** at both ends, 304L / 316L stainless steel. |

Because neither PDF could be read, no catalogue dimension tables were used. Proportions are representative.

## Construction details assumed (please review)

### Oil Sample Bottle

1. Proportions: a long, slim barrel with bore length to diameter of about 10:1.
2. End caps screw over the barrel. Each has a spigot into the bore with an O-ring and back-up ring.
3. The valve protector is drawn as a tube with a front window, an open top ring and a side slot for the outlet. Its exact form is assumed.
4. The right-angle needle valve stands on the cap axis: inlet from the cylinder, outlet to the side, vertical stem with a T-handle. Valves are drawn closed (needle seated).
5. Evacuation fitting: drawn as a radial plugged port on the sample-side cap, drilled into the sample chamber. Its position and form are assumed; the reference only says a special fitting on the sample side.
6. Piston: two seal grooves (O-ring plus back-up rings) with a guide ring (wear band) between them. The piston is shown at a fixed, representative position.
7. Mixing ball size is assumed. It rests on the piston upright, or on the lower wall when the bottle is horizontal.
8. The driving-fluid colour is generic. The fluid type is not specified.

### Gas Sample Bottle

9. Body proportions: length about 4× diameter. The shoulder curve, wall thickness and neck length are assumed (no catalogue table was available).
10. The valve assembly at each end is representative, not a specific Swagelok part: hex nipple (¼" NPT male), inline needle valve with a side handle, and a male connector with a tube stub.
11. The marking band and engraved text are decorative placeholders.
12. Gas fills the whole chamber, shown as a uniform tint with scattered dots. There is no level.

## Scope

All changes are inside `prototypes/bottles/`. The simulator and the deployment workflow are untouched. The Pages workflow publishes `main` only, so this branch is not deployed.
