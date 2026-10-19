# Sample bottle designs (PVT Nexus prototype)

A standalone design review page for the two general bottle designs: the **Oil Sample Bottle** and the **Gas Sample Bottle**. It has a **2D technical view** (the approved SVG drawings) and an interactive **3D view**. It covers appearance and internal construction only. There are no procedures, capacities, pressures, temperatures or process animations. The page is not linked to the simulator.

## Preview

Serve the repository root over HTTP:

```bash
git fetch origin claude/awesome-goodall-e0qp90
git checkout claude/awesome-goodall-e0qp90
python3 -m http.server 8000          # from the repository root
# open http://localhost:8000/prototypes/bottles/
```

There is no build step and no package to install. The 2D view also works when `index.html` is opened directly from disk. The 3D view needs HTTP, because browsers block ES-module imports from `file://`.

### Hosted preview (separate from GitHub Pages)

A self-contained copy is published as a private claude.ai artifact: https://claude.ai/artifact/53yB3HqmbRZohdoryFoRvK. Only the owner can open it until it is shared from its Share menu. It is separate from the PVT Nexus GitHub Pages site, and the Pages workflow is unchanged.

To refresh that copy after a design change, run `python3 prototypes/bottles/build-preview.py OUT.html` and republish it to the same artifact. The script inlines the CSS, the JS (including the 3D module) and the logo into one file. The hosted page may load scripts only from approved CDNs, so its import map loads the identical pinned **three@0.160.0** from jsDelivr instead of `vendor/`.

URL options for review links: `?mode=2d|3d` · `&show=both|oil|gas` · `&view=exterior|cutaway|pair` · `&orient=upright|horizontal` · `&labels=0` · `&theme=light|dark`

## Controls

- **Mode:** 2D technical view · 3D view
- **Bottle:** Compare (2D only) · Oil Sample Bottle · Gas Sample Bottle
- **View:** Exterior · Cutaway · Exterior + cutaway (2D only)
- **Orientation:** Upright · Horizontal
- **Labels:** on / off
- **Background:** light / dark

Both bottles are drawn at the same scale, and the exterior and cutaway views use identical geometry.

**3D view only**
- Drag to rotate, scroll or pinch to zoom, and right-drag or two-finger drag to pan. Panning is limited to the model's extent, and zoom is limited so the model cannot be lost.
- **Reset camera**, and **Auto-rotate** (off by default).
- Click a part on the model, a label, or a name in the parts list to highlight it and read a short explanation in the side panel. Choosing an internal part while in Exterior switches to Cutaway.
- Labels are hidden when their part is behind an opaque surface, and they are kept inside the stage.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell |
| `bottles.css` | Styles; light and dark tokens from `theme.css` |
| `bottle-draw.js` | `PBDraw.oil()` / `PBDraw.gas()` editable SVG generators, label anchors, namespaced ids |
| `app.js` | View controls and 2D label layout; loads the 3D module on first use |
| `bottle3d.js` | ES module: 3D models (one group per part), quarter-section cutaway, picking, labels, on-demand rendering |
| `vendor/three-0.160.0/` | Pinned three.js r160 (MIT, `LICENSE` kept): `three.module.min.js`, `OrbitControls`, `RoomEnvironment`. Unmodified; source and checksum in `SOURCE.txt` |
| `build-preview.py` | Bundles the page into one HTML file for the hosted preview |
| `screenshots/` | 2D: `01`–`08`. 3D: `09`–`19` (1366×768, 1920×1080, details, horizontal, 390 px mobile) |

## References

| Reference | Access from the build environment |
|---|---|
| Leutert PDC datasheet (PDF) | **Not accessible.** Download and fetch were both blocked. Used the Leutert PDC product-page description returned by web search: a floating piston with a **mixing ball** (replaced in this prototype by a **mixing ring**, at your request), **valve protectors on both ends**, **right-angle needle valves** with **¼" NPT female** ports, and a **special fitting on the sample side for evacuation**. |
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
7. **Mixing ring** (replaces the mixing ball shown in the reference description): a loose metal ring, about 89 % of the bore diameter, with a centre hole of about 60 % of its outside diameter. It is drawn seen slightly from above so it reads as a ring. Its axis stays along the bore. It rests on the piston face when upright, and on the lower wall when horizontal. It is separate from the piston seals and guide ring. Its size, thickness and clearance are assumed.
8. The driving-fluid colour is generic. The fluid type is not specified.

### Gas Sample Bottle

9. Body proportions: length about 4× diameter. The shoulder curve, wall thickness and neck length are assumed (no catalogue table was available).
10. The valve assembly at each end is representative, not a specific Swagelok part: hex nipple (¼" NPT male), inline needle valve with a side handle, and a male connector with a tube stub.
11. The marking band and engraved text are decorative placeholders.
12. Gas fills the whole chamber, shown as a uniform tint with scattered dots. There is no level.

## 3D models

**How the parts are built**
- The 3D models use the same dimensions as the 2D drawings (1 drawing unit = 0.01 scene units). Each part is a separately identifiable group.
- **Revolved parts** (barrel, caps, piston, seals, rings, fluids, gas body, nipples) are generated from their 2D section profiles.
- **Non-revolved parts** (valve bodies, handles, cage bars, side ports, evacuation fitting) are boxes, prisms and cylinders placed at the 2D positions.

**Cutaway**
- A genuine quarter section: the front-left quadrant is removed with two clipping planes.
- Revolved parts, boxes and prisms get real cut faces generated from their section profiles. Metal cut faces are hatched, and neighbouring parts use different hatch directions and tints.
- Drilled passages are dark. The sample oil and driving fluid are slightly translucent so the piston, seals and mixing ring stay readable. The metal is never transparent.
- The gas chamber is a faint unlit tint with evenly scattered dots, and has no level.

**Materials and lighting**
- Brushed stainless (metalness 1, roughness 0.3–0.38), dark polymer handles, black O-rings, PTFE back-up rings and a tan guide ring.
- Lit by a soft studio environment with ACES tone mapping, on a transparent background, so the page's light or dark background shows behind it.

**Rendering**
- A frame is drawn only on change. The loop runs only while the camera is moving or auto-rotate is on.
- Switching bottle, view or orientation disposes the previous model's geometry and materials. One renderer and one canvas are reused.
- Reduced motion turns off camera damping and slows auto-rotate.
- If WebGL is unavailable, a message is shown and the 2D view stays available.

### 3D construction details estimated (please review)
13. **Valve protector form differs from 2D.** In 3D it is two rings joined by four bars, so the valve stays visible; the 2D drawing shows a tube with a front window. Both are assumptions; please choose one.
14. Valve bodies are drawn as rectangular blocks, and the gas valve handles as plain knurled-style cylinders. The needle and stem are modelled only on the oil valves.
15. Threads are simplified: three ridges on the exposed gas-nipple thread, and hatched thread bands inside the oil caps in 2D only.
16. **Horizontal orientation differs from 2D.** The 3D model is turned so the cut quadrant faces the viewer from above. As a result the sample side is on the **right** in 3D horizontal, and on the left in 2D horizontal.
17. Mixing ring: 3D thickness and clearance match the 2D ring. In horizontal it stands across the bore mid-chamber.
18. Metal finish, roughness and the hatch tints are visual choices. No surface finish is specified in the references.

### Remaining limitations
- The evacuation passage and valve-inlet bores are visible only where they meet the cut planes. The side-outlet bores of the right-angle valves are not on a cut plane, so they are shown only as dark openings at the stub ends.
- Clipped non-revolved parts that have no cut face (cage bars, handle hubs) show their inside surfaces where the section passes through them.
- The canvas is mouse and touch driven. Keyboard users select parts through the parts list and labels, but cannot rotate the model with the keyboard.
- Tested in headless Chromium with software WebGL (SwiftShader). Real GPUs render faster, and damping settles in about two seconds.

## Scope

All changes are inside `prototypes/bottles/`. The simulator and the deployment workflow are untouched. The Pages workflow publishes `main` only, so this branch is not deployed.
