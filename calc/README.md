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
* **Standard conditions:** 60 °F (519.67 °R) and 1 atm = 14.6959 psia (shown as 14.696).
  `Bg = (psc/Tsc)·Z·T/p`. The previous calculator used the rounded 0.02827 constant (14.7/520);
  the difference is 0.03 %.
* **Gauge pressure:** p(abs) = p(gauge) + 1 atm (14.6959 psi = 1.01325 bar). Correlations
  always receive absolute pressure.
* **Metric display:** 1 bar = 14.50377 psi; 1 scf/STB = 0.178108 sm³/sm³; 1 lbm/ft³ = 16.01846 kg/m³;
  cP = mPa·s; Bo and Bg are ratios (rb/STB = rm³/sm³, ft³/scf = rm³/sm³). Standard conditions stay
  60 °F / 1 atm in both systems: metric results are unit conversions, not a 15 °C re-basing.
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
| Dranchuk-Abou-Kassem | Z | 0.2 ≤ Ppr ≤ 30, 1.0 < Tpr ≤ 3.0 | Dranchuk & Abou-Kassem (1975) |
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

* **Against worked examples:** Standing Rs for Ahmed's Oil 1 (T = 250 °F, pb = 2377 psig, API 47.1,
  γg 0.851) gives 838 scf/STB and +11.6 % against the measured 751, matching the textbook example.
  Standing Bo at the same conditions matches an independent hand calculation (1.50616).
* **Internal consistency:** every Rs/pb pair round-trips (pb(Rs(p)) = p within 0.05 %); undersaturated
  Bo equals the closed-form integral of co; Rs, Bo and μo are continuous at pb for every Bo/co pair;
  real-gas cg matches the analytic Papay derivative; ideal-gas identities (ρ = pM/RT, Bg·Eg = 1,
  v·ρ = 1, cg = 1/p) hold.
* **Independent fit cross-check:** the Dranchuk-Abou-Kassem solver agrees with Hall-Yarborough (1973),
  an independent fit of the same Standing-Katz chart implemented only in the test, within 2 % for
  Tpr 1.2–3.0 and Ppr 0.5–12 (largest difference 1.6 %, at the near-critical Tpr 1.2). It agrees within
  0.6 % at Tpr ≥ 1.5.
* **Not done:** this session had no network access to the primary papers or SPE/PetroWiki pages.
  Coefficients were checked against the forms reproduced in Ahmed (2019), McCain (1990) and Whitson &
  Brulé (2000) and against the previous calculator's implementation, not re-read from the original
  papers. The data ranges come from the same textbook tabulations.

### References

Full citations are in `META`/`REF` in `pvt-correlations.js` and are shown in the app's *Methods &
References* view: Standing 1947, 1977 · Vasquez & Beggs 1980 · Glasø 1980 · Al-Marhoun 1988 ·
Petrosky & Farshad 1993 · Beal 1946 · Beggs & Robinson 1975 · Sutton 1985 · Kay 1936 ·
Wichert & Aziz 1972 · Carr, Kobayashi & Burrows 1954 · Dranchuk & Abou-Kassem 1975 · Papay 1968 ·
Beggs & Brill 1973 · Lee, Gonzalez & Eakin 1966 · Ahmed 2019 · McCain 1990 · Whitson & Brulé 2000.
