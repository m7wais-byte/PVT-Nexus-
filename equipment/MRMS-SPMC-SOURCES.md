# MRMS / SPMC — sources, version and assumptions

Equipment Library entry: **MRMS — MDT Multisample Module**, with the inspectable **SPMC — Single-Phase Multisample Chamber**.
Files: `equipment/equipment-data.js` (text), `equipment/mrms-draw.js` (2D), `equipment/mrms3d.js` (3D),
`equipment/mrms-principle.js` (Operating Principle), page logic in `components/EquipmentLibrary.js` (`mr*`).

This is an **educational representation**. It is not a manufacturer drawing, and it is not connected to the
sampling or validation workflows.

## 1. Reference access (2026-10-19)

The build environment's network policy blocks `slb.com`, as well as mirror sites (studylib, pdfcoffee, scribd,
slideshare) and the patent sites. **The three requested documents could not be opened directly:**

| Reference | Direct access | What was used |
|---|---|---|
| MDT brochure — `slb.com/-/media/files/fe/brochure/mdt-br.ashx` | blocked | search-engine excerpts of the brochure and of the older *MDT Multisample Module* product sheet (`mdt-multisample-module-ps.ashx`, FE_04_027, 2004) |
| SPMC-T product sheet — `slb.com/-/media/files/testing-services/product-sheet/reservoir-singlephase-multisample-ps.ashx` | blocked | search-engine excerpts of the sheet text, including its figure labels |
| Single-phase sampling page — `slb.com/.../single-phase-fluid-sample-collection` | blocked | search-engine excerpts of the page text |

**Not seen:** the illustrated chamber in the SPMC-T product sheet, and the MRMS photographs. Only the figure
*labels* (nitrogen, reservoir fluid, pressure-compensating fluid) were available. Everything geometric below is
therefore an assumption. It should be checked against the illustration when it can be opened.

## 2. Documented facts used

**MRMS (MDT brochure / MRMS product sheet)**
- Part of the MDT modular formation tester. It carries six sample bottles on the common tool flowline.
- Bottles are filled individually, at different depths, under surface control.
- It may carry MPSR bottles, SPMC chambers or a mix. Several MRMS can be combined in one toolstring.
- Fluid reaches the bottles from the probe / pumpout path. Fluid-analysis modules monitor the fluid (cleanup)
  before sampling.

**SPMC-T (product sheet + single-phase page)**
- Pressure-compensated sample chamber run with the MDT. Up to six per MRMS.
- A **preset nitrogen charge acts through a piston floating on a synthetic oil buffer** (the pressure-compensating
  fluid). It overpressures the sample so the sample stays in single phase during retrieval, offsetting the
  pressure drop caused by cooling.
- The nitrogen charge is **independent** and **activates with sample capture**.
- Filling by **controlled displacement**: no sample flashing and **no dead volume**.
- **Downhole self-closure** of the chamber.
- **Integrated sample agitation piston**, used after retrieval, during restoration to reservoir conditions, for
  sample mixing.
- Material: Inconel or Hastelloy; Dursan nonreactive coating.

## 3. Version and values

**Version shown: SPMC-T** (the current product sheet that the request named). No dimensions or ratings are drawn
or shown. Values found during research are recorded here only. They are kept out of the educational view, and
they do not all belong to the same generation:

| Value | Source / generation | Note |
|---|---|---|
| 250 cm³ sample | SPMC-T sheet; also 2004 MRMS sheet | consistent |
| 20,000 psi max. working pressure | SPMC-T sheet | |
| Restoration up to 25,000 psi / 400 °F | SPMC-T sheet text | conflicts with the SLB web page (20,000 psi / 400 °F) |
| > 1,600 psi added by the nitrogen charge | single-phase sampling page | |
| 2 in diameter, 36 in long | older SPMC presentation (not SPMC-T) | **not used**: different generation |
| MRMS 392 °F, 20,000 psi, 5 in OD | 2004 MRMS overview | **not used** |

## 4. Geometric and functional assumptions (educational)

1. **Proportions.** The SPMC is drawn shorter and wider than the real tool so that the internals can be read. The
   MRMS housing and connectors are generic.
2. **Axial order inside the SPMC**, from the inlet: reservoir fluid | sample piston (with the agitation piston on
   its sample face) | pressure-compensating fluid | nitrogen piston | nitrogen. The order follows the documented
   pressure path: nitrogen → piston → buffer → sample. The positions are assumed.
3. **Agitation piston.** Its form, placement and drive are not published. It is shown schematically as a disc at
   the sample piston and is not animated. The text keeps it separate from pressure compensation.
4. **Function blocks** (dashed outlines): the sample isolation (self-closing), the nitrogen charge activation, the
   MRMS chamber valves and the controlled-displacement outlet. They show *what* happens, not *how*. No valve
   internals are drawn.
5. **Controlled displacement.** The fluid behind the sample piston is shown leaving through a schematic outlet.
   Its route and the throttling part are not published. Closing this path at isolation is an inference: the buffer
   must be trapped for the nitrogen to pressurize the sample.
6. **MRMS layout.** Six chambers in three tiers of two, one branch and valve per chamber off the common flowline,
   bay cover plates on the exterior. Placement and routing are **not verified**.
7. **Operating principle.** Volumes are proportional to lengths in a constant bore. Sample in = fluid displaced out
   during filling. Sample contraction = nitrogen expansion on retrieval. The contraction is **exaggerated** (12 %
   of the sample length) for visibility. Pressure and temperature indicators are qualitative (no numbers). The
   "without compensation" marker shows the general effect of cooling a non-compensated sample.

## 5. Not implemented (by request)

- SRS (single-phase reservoir sampler): separate step, after MRMS review.
- Links to the sampling / validation workflows.
