# PVT Calculator — calculation core

Pure JavaScript, no DOM. The same files load in the browser (`window.PVTUnits`,
`PVTCorr`, `PVTEngine`, `PVTMeasured`) and in Node for the tests.

| File | Contents |
|---|---|
| `pvt-units.js` | unit systems, absolute / gauge pressure, standard conditions |
| `pvt-correlations.js` | the published equations and their metadata (`META`: equation text, published data range, references) |
| `pvt-engine.js` | input validation, evaluation over a pressure set, per-point detail with substituted values |
| `pvt-measured.js` | measured-data template and parser, error statistics |

Tests: `node --test tests/*.test.js` (engine) and `node tests/ui.e2e.js` (browser, Playwright).

## Basis

* **Internal units** (all correlations): p psia, T °F (°R = °F + 460 where the
  original correlation uses it, as stated per method), Rs scf/STB, Bo rb/STB,
  Bg ft³/scf, ρ lbm/ft³, μ cP, c 1/psi.
* **Standard conditions — two bases, both at 101.325 kPa (14.6959 psia):**
  * *Correlation basis* 60 °F (Tsc = 519.67 °R). Every correlation was fitted on it, so every oil
    result (Rs, Rsb, Bo, Bob) is on it, always.
  * *Laboratory basis* 15 °C (Tsc = 518.67 °R; 15 °C = 59 °F). Offered for gas only (Bg, Eg). With the gas
    ideal at standard conditions, `Bg = psc·Z·T/(Tsc·p)` so Bg(15 °C) = Bg(60 °F)·519.67/518.67
    (× 1.001928) and Eg the inverse. Z, ρg, μg and cg do not depend on the basis.
  * Oil volumes are **not** converted to 15 °C: that needs the stock-tank oil's thermal expansion and its
    flash at 15 °C, which these inputs do not define. No liquid volume is ever scaled by a gas
    temperature ratio. The calculator states this instead of offering the conversion.
  * The basis is shown in the context strip, chart header, table headers (`· 60 °F`), point details,
    CSV header (`Bg (ft³/scf @ 15 °C)` and a `# Standard basis:` line) and the PNG footer.
  * Measured data: the basis of measured Rs, Bo or Bg must be declared before they are compared
    (`PVTMeasured.checkBasis`). Same basis → compared; gas Bg on the other basis → converted by the
    Tsc ratio and reported; oil Rs/Bo on 15 °C → not compared, with the reason. Z, ρ, μ, co and cg are
    compared without a basis.
  * The previous calculator used the rounded 0.02827 constant (14.7/520); the difference is 0.03 %.
* **Gauge pressure:** p(abs) = p(gauge) + 1 atm (14.6959 psi = 1.01325 bar). Correlations
  always receive absolute pressure.
* **Metric display:** 1 bar = 14.50377 psi; 1 scf/STB = 0.178108 sm³/sm³; 1 lbm/ft³ = 16.01846 kg/m³;
  cP = mPa·s; Bo and Bg are ratios (rb/STB = rm³/sm³, ft³/scf = rm³/sm³). Switching Field / Metric
  changes units only, never the standard basis (sm³ in metric output is on the selected basis).
* **Pressure tolerance:** `P_TOL = 0.01 psi` (0.0007 bar), in canonical psia, is the only pressure
  tolerance. It is used for the range endpoint, merging pasted pressures, snapping a point onto pb and
  the saturated / bubble point / undersaturated test (`phaseOf`). It sits far below the displayed
  resolution (0.1 psi, 0.01 bar) and far above floating-point noise.
* **Pressure grid:** p_i = pMin + i·step, computed by index in psia, never by cumulative addition. The
  exact maximum is always the last point, exactly once: it replaces a grid point within P_TOL of it,
  otherwise it is appended. A point within P_TOL of pb becomes exactly pb; otherwise pb is inserted when
  it lies inside the range. Increments are pressure differences, so no gauge offset is ever applied to them.
* **Canonical inputs:** the UI passes full-precision values in internal units (`inp.canon`). Unit and gauge
  switches only re-render the displayed text; a rounded display is never parsed back into an input.
* **Gas constants:** Ma(air) = 28.96 lb/lbmol, R = 10.7316 psia·ft³/(lbmol·°R); oil γo = ρo/62.4 lbm/ft³.

## Oil workflow

1. API is entered, or derived from stock-tank density: γo = ρo/62.4, API = 141.5/γo − 131.5.
2. One independent characterisation input: measured **pb** → Rsb = Rs_corr(pb), or measured
   **Rsb** → pb = pb_corr(Rsb), using the selected Rs/pb family (the pb form is the algebraic inverse
   of the Rs form). It is never derived from the current pressure.
3. p < pb (saturated): Rs(p) = Rs_corr(p)·[Rsb/Rs_corr(pb)]. The factor makes Rs continuous at pb;
   it differs from 1 only by the rounding of the published inverse exponents and is reported.
   Bo = Bo_corr(Rs(p)); μo = Beggs-Robinson(μod, Rs(p)).
4. p ≥ pb (undersaturated, fixed composition): Rs = Rsb; Bo = Bob·exp(−∫ co dp) with the selected
   co correlation (closed forms below); μo = Vasquez-Beggs from μob at pb.
5. co below pb is **not calculated**. The saturated apparent compressibility needs the liberated-gas
   Bg and dBo/dp, dRs/dp, which these inputs do not define.
6. Vasquez-Beggs needs γgs (separator gas gravity corrected to 100 psig):
   γgs = γg·[1 + 5.912×10⁻⁵·API·Tsep·log(psep/114.7)]. Without separator conditions γgs = γg is
   assumed, and it is shown as an *Assumed* value.
7. Material-balance Bo needs the measured reservoir oil density at the same pressure, so it is
   available only in the batch evaluation, where that column exists.

## Gas workflow

γg (or composition Σyi·Mi) → Ppc, Tpc → optional sour-gas correction → Ppr, Tpr → Z →
Bg, ρg = p·Ma/(Z·R·T), v = 1/ρg, Eg = 1/Bg, μg (Lee-Gonzalez-Eakin, ρ in g/cm³), and
cg = 1/p − (1/Z)(dZ/dp) by central difference (±0.1 % of p). Ideal gas sets Z = 1 for all of them.
A manual Standing-Katz reading is valid at one pressure only and gives no cg.

## Equations, data ranges and sources

The equation text shown in the app comes from `META` in `pvt-correlations.js`. Data ranges are those
reported with the original correlation as tabulated by Ahmed (2019) and McCain (1990). Outside a range
the value is kept and a warning names the affected properties.

| Method | Used for | Published data range (field units) | Primary source |
|---|---|---|---|
| Standing | Rs, pb, Bo | pb 130–7000 psia, T 100–258 °F, API 16.5–63.8, γg 0.59–0.95, Rs 20–1425 | Standing (1947) |
| Vasquez-Beggs | Rs, pb, Bo, co | pb 50–5250 psia, T 70–295 °F, API 16–58, γg 0.56–1.18, Rs 20–2070; co: p 111–9485 psia, API 15.3–59.5 | Vasquez & Beggs (1980) |
| Glasø | Rs, pb, Bo, μod | pb 165–7142 psia, T 80–280 °F, API 22.3–48.1, γg 0.65–1.276, Rs 90–2637; μod T 50–300 °F, API 20.1–48.1 | Glasø (1980) |
| Al-Marhoun | Rs, pb, Bo | pb 130–3573 psia, T 74–240 °F, API 19.4–44.6, γg 0.752–1.367, Rs 26–1602 | Al-Marhoun (1988) |
| Petrosky-Farshad | Rs, pb, Bo, co | pb 1574–6523 psia, T 114–288 °F, API 16.3–45.0, γg 0.5781–0.8519, Rs 217–1406; co p 1700–10692 psia | Petrosky & Farshad (1993) |
| Beal | μod | T 98–250 °F, API 10.1–52.5 | Beal (1946); equation form by Standing |
| Beggs-Robinson | μod, μo saturated | p 132–5265 psia, T 70–295 °F, API 16–58, Rs 20–2070 | Beggs & Robinson (1975) |
| Vasquez-Beggs | μo undersaturated | p 141–9515 psia, API 15.3–59.5, γg 0.511–1.351, Rs 9.3–2199 | Vasquez & Beggs (1980) |
| Standing natural / condensate | Ppc, Tpc | not given in the references available | Standing (1977), fit of Brown et al. (1948) |
| Sutton | Ppc, Tpc | γg 0.57–1.68 | Sutton (1985) |
| Kay | Ppc, Tpc | — | Kay (1936) |
| Wichert-Aziz | sour correction | CO2 ≤ 54.46 %, H2S ≤ 73.85 % | Wichert & Aziz (1972) |
| Carr-Kobayashi-Burrows | sour correction | not given in the references available | Carr, Kobayashi & Burrows (1954) |
| Dranchuk-Abou-Kassem | Z | 0.2 ≤ Ppr ≤ 30, 1.05 ≤ Tpr ≤ 3.0 (lower Tpr bound: sources give 1.0 or 1.05) | Dranchuk & Abou-Kassem (1975) |
| Papay | Z | not given in the references available | Papay (1968) |
| Beggs-Brill | Z | mathematically defined only for Tpr > 0.92 | Beggs & Brill (1973) |
| Lee-Gonzalez-Eakin | μg | p 100–8000 psia, T 100–340 °F; sweet gas | Lee, Gonzalez & Eakin (1966); coefficients per Whitson & Brulé (2000) |

Closed forms of the undersaturated Bo (both the exact integral of the matching co):

* Vasquez-Beggs: co = A/p, A = (−1433 + 5Rsb + 17.2T − 1180γgs + 12.61API)/10⁵ → Bo = Bob·(pb/p)^A
* Petrosky-Farshad: co = 1.705×10⁻⁷·Rsb^0.69357·γg^0.1885·API^0.3272·T^0.6729·p^−0.5906 →
  Bo = Bob·exp[−A(p^0.4094 − pb^0.4094)], A = (1.705×10⁻⁷/0.4094)·Rsb^0.69357·γg^0.1885·API^0.3272·T^0.6729.
  The exponent 0.4094 = 1 − 0.5906 and the factor 4.1646×10⁻⁷ = 1.705×10⁻⁷/0.4094 both follow from
  integrating the co equation, so Bo and co cannot disagree.

### How the equations were checked

The original papers and SPE/PetroWiki pages could not be reached from the development environment (the
network policy allows GitHub, PyPI and npm only). Nothing is therefore described as verified against
the primary paper. Each method carries a `verify` record (`VERIFY` in `pvt-correlations.js`) that the
*Methods & References* view shows: equation status, range status, cross-check source, numerical check and
limitation. Tests: `tests/pvt-verification.test.js`.

**Evidence used** (agreement between two correlations is never used as validation):

* *Independent transcriptions* of the equations — Rpvt 0.1.1 (F. Tabasinejad, CRAN mirror on GitHub,
  `src/pvtoil.cpp`, git 85101b6) and pyResToolbox / PRT (git b6d1845, source read only; it could not be
  executed here). The Rpvt forms are re-typed in the test with Rpvt's own constants. Agreement checks this
  code for transcription slips, not the papers.
* *Reference data* — the Standing-Katz chart digitization from the zFactor R package 0.1.9
  (A. R. Reyes, git 2226d31; 163-point subset in `tests/reference/standing-katz-subset.json`, full
  statistics by `standing-katz-stats.js`), and CoolProp 8.0.0 HEOS with GERG-2008 mixing (git ae81610)
  for a sweet and a sour gas and methane viscosity (`gas-reference.json`, generated by
  `generate_gas_reference.py`).
* *Exact relations* — analytic DAK derivative for cg, closed-form integral of co for Bo above pb, ideal-gas
  identities, Rs/pb round trips.

| Method | Equation status | Cross-check source | Numerical check | Limitation |
|---|---|---|---|---|
| Standing Rs/pb, Bo | cross-checked | Rpvt PB/RSi/BOB_STANDING; PRT | Rs, pb, Bob = Rpvt within 2×10⁻³ (rel.) | T, API ranges corroborated (PRT); others unverified |
| Vasquez-Beggs Rs/pb | cross-checked | Rpvt (T + 459.67 vs + 460 here) | as above | ranges unverified |
| Vasquez-Beggs Bo | **discrepancy** | Rpvt BOB_VASQUEZ_BEGGS | C3 (API > 30) 1.337×10⁻⁹ here, 1.377×10⁻⁹ in Rpvt; offset pinned in the test | ΔBo = 4×10⁻¹¹·Rs·(API/γgs)·(T − 60): 1.5×10⁻⁴ at Rs 500, 200 °F; up to 1.5×10⁻³ at Rs 2000, 300 °F |
| Glasø Rs/pb, Bo | cross-checked | Rpvt | within 2×10⁻³ | ranges unverified |
| Al-Marhoun Rs/pb, Bo | cross-checked | Rpvt | Bo offset from T + 460 vs 459.67 pinned (8.6×10⁻⁴ × 0.33) | ranges unverified |
| Petrosky-Farshad Rs/pb, Bo, co | cross-checked | Rpvt | co = Rpvt; Bo above pb = Simpson integral of co | ranges unverified |
| Vasquez-Beggs co | cross-checked | Rpvt | co = Rpvt; Bo = exact integral | range from a search snippet, unverified |
| Beggs-Robinson μod, μo | cross-checked | Rpvt; PRT | chain within 3×10⁻⁵ | T, API corroborated (PRT) |
| Vasquez-Beggs μo (p > pb) | cross-checked | Rpvt | identical form | ranges unverified |
| Beal μod | **unverified** | none available | — | equation not cross-checked |
| Glasø μod | **unverified** | none available | — | equation not cross-checked |
| Standing pseudo-criticals | **unverified** | none available | GERG sweet gas + DAK: Z AARE 1.10 % (natural), 0.97 % (condensate) | coefficients not cross-checked |
| Sutton | cross-checked | PRT | GERG sweet + DAK: Z AARE 0.46 % | γg range unverified |
| Kay | cross-checked | definition | GERG sweet + DAK: Z AARE 0.93 % | — |
| Wichert-Aziz | cross-checked | PRT; Rpvt | GERG sour (10 % CO₂, 13 % H₂S): Z AARE 0.66 % (uncorrected 4.01 %) | concentration range unverified |
| Carr-Kobayashi-Burrows | **unverified** | none available | GERG sour, gravity pseudo-criticals: Z AARE 3.71 % | blocked with Kay (double counts acid gas: 5.95 %) |
| Dranchuk-Abou-Kassem | cross-checked | Rpvt; PRT; zFactor | SK chart AARE 0.30 % (Tpr ≥ 1.2), 3.2 % (Tpr 1.05–1.1); GERG cg 1.40 %; cg = analytic derivative within 2×10⁻⁵ | Tpr lower bound 1.0 vs 1.05 between sources; Tpr < 1.2 flagged |
| Papay | **unverified** | none (zFactor "Papp" differs) | SK chart AARE 2.3 % (Ppr ≤ 3) → 54 % (Ppr > 10); GERG cg AARE 11 % | warned at Ppr > 3 or Tpr < 1.2 |
| Beggs-Brill | cross-checked | zFactor Beggs-Brill.R | SK chart: Z ≤ 0 at 15 of 649 points; AARE 1.3 % (Ppr ≤ 3) | warned at Ppr > 3 or Tpr < 1.2 |
| Lee-Gonzalez-Eakin | cross-checked | PRT | CoolProp methane, 100–300 °F, 500–5000 psia: 1.3–5.1 % | sweet gas; sour-gas accuracy not established |

**Solver and failure handling (tested):** DAK converges on the whole Ppr 0.2–30 × Tpr 1.05–3 grid with
residual < 10⁻⁹; outside that grid it returns either a true root or no value, never a substitute (at Ppr 0.919,
Tpr 1.0 it gives 0.4926). A Z failure becomes a gap with its reason in every dependent property. cg uses
the same Z method and the same (sour-corrected) pseudo-criticals as Z. Characterisation failures
(e.g. pb ≤ 0 from a correlation) stop the calculation with a "Calculation failed" message.

**Range status:** *corroborated* (same limit in an independent source), *unverified* (textbook
tabulation only), *sources disagree*. A mathematical domain limit (Z ≤ 0, Tpr ≤ 0.92 for Beggs-Brill) is
not a range; the value is shown as unavailable with the reason.

**Earlier checks kept:** Standing Rs for Ahmed's Oil 1 = 838 scf/STB (value recalled from the textbook
example; the book was not re-checked here); Rs/pb round trips within 0.05 %; Rs, Bo, μo continuous at pb.

### References

Full citations are in `META`/`REF` in `pvt-correlations.js` and are shown in the app's *Methods &
References* view: Standing 1947, 1977 · Vasquez & Beggs 1980 · Glasø 1980 · Al-Marhoun 1988 ·
Petrosky & Farshad 1993 · Beal 1946 · Beggs & Robinson 1975 · Sutton 1985 · Kay 1936 ·
Wichert & Aziz 1972 · Carr, Kobayashi & Burrows 1954 · Dranchuk & Abou-Kassem 1975 · Papay 1968 ·
Beggs & Brill 1973 · Lee, Gonzalez & Eakin 1966 · Ahmed 2019 · McCain 1990 · Whitson & Brulé 2000.
