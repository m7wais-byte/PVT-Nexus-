# PVT Calculator — equation verification matrix

Status as of 2026-11-04. This file separates **source verification** (does the code reproduce the
published equation, coefficients and units?) from **physical-consistency testing** (does the
calculator behave physically, whatever the source?). A method can pass one and not the other.

## Evidence levels

| Code | Evidence | What it proves |
|---|---|---|
| **P** | Primary paper read | Coefficients and units as published. **No primary paper was accessible for any method** (paywalled; this session's network also blocked `petrowiki.spe.org`, `ihsenergy.ca` and `creditmonitor.lsu.edu`). |
| **S** | Secondary literature, independently transcribed (textbook / vendor documentation / journal tables), seen through web search in this session or earlier | Coefficients agree with at least one independent transcription. Weaker than P: transcriptions copy each other's errors. |
| **C** | Independent code gives the same numbers: Rpvt (R), PRT (Rust), zFactor (R) — recorded in `PVTCorr.VERIFY`; **pyrestoolbox 2.x** (Python) — run in this session | Our implementation equals another implementation. Not a source check if both copied the same transcription. |
| **N** | Numerical reference data: digitized Standing-Katz chart (`tests/reference/`), GERG-2008 via CoolProp, CoolProp methane viscosity, IAPWS-95 water density | The result is physically accurate within the stated error. Does not prove that the coefficients are the published ones. |

“Corroborated” below means: at least two independent S/C sources agree with the code. Nothing is marked
“verified against the original publication”.

## Oil methods

| Method | Coefficients in code | Units / temperature | Gas gravity used | Published data range (status) | Evidence | Status |
|---|---|---|---|---|---|---|
| **Standing (1947) Rs / pb** | Rs = γg·[(p/18.2 + 1.4)·10^x]^1.2048, x = 0.0125·API − 0.00091·T; pb = 18.2·[(Rs/γg)^0.83·10^a − 1.4] | p psia, T °F, Rs scf/STB | γg (total gas, air = 1) | pb 130–7000 psia, T 100–258 °F, API 16.5–63.8, γg 0.59–0.95, Rs 20–1425 (T, API corroborated; others unverified) | S (pyRestToolbox formula reference; Ahmed Eq. 1.63; Whitson & Brulé Eq. 3.78 as cited by pyrestoolbox); C (Rpvt, PRT; pyrestoolbox Rsb within 0.011 % — exponent 1.2048 vs 1/0.83 = 1.204819) | **Corroborated** |
| **Standing Bo (p ≤ pb)** | Bo = 0.9759 + 0.00012·[Rs·(γg/γo)^0.5 + 1.25·T]^1.2 | T °F | γg | as Rs | S (Restec table, ScienceDirect topic page, petroleumengineers.net, Standing 1981); C (Rpvt, PRT) | **Corroborated.** A second published form, 0.972 + 1.47×10⁻⁴·F^1.175 (used by pyrestoolbox), gives Bob 0.6–0.7 % higher at Bob 1.25–1.36 — two forms exist in the literature; the code uses the majority form. |
| **Vasquez-Beggs (1980) Rs / pb** | API ≤ 30: C1 0.0362, C2 1.0937, C3 25.724; API > 30: 0.0178, 1.187, 23.931; Rs = C1·γgs·p^C2·exp[C3·API/(T + 460)] | p psia, **T + 460** (°R as printed; Rpvt uses + 459.67) | **γgs** at 100 psig separator; = γg if no separator data (shown as an assumption) | pb 50–5250, T 70–295, API 16–58, γg 0.56–1.18, Rs 20–2070 (unverified) | S (search summary of textbook forms); C (Rpvt) | Corroborated (S weak) |
| **Vasquez-Beggs γgs correction** | γgs = γg·[1 + 5.912×10⁻⁵·API·Tsep·log(psep/114.7)] | psep **psia** (114.7 psia = 100 psig), Tsep °F | — | — | S | Corroborated (S weak) |
| **Vasquez-Beggs Bo (p ≤ pb)** | API ≤ 30: 4.677×10⁻⁴, 1.751×10⁻⁵, −1.811×10⁻⁸; API > 30: 4.670×10⁻⁴, 1.100×10⁻⁵, **1.337×10⁻⁹** | T °F (T − 60) | γgs | as Rs | S: 1.337×10⁻⁹ in ScienceDirect topic table, IHS/S&P Harmony, PetroleumOffice, petrocalchub; **1.377×10⁻⁹** in the older Fekete page and in Rpvt | **Discrepancy investigated — see below** |
| **Vasquez-Beggs co, Bo above pb** | co = A/p, A = (−1433 + 5·Rsb + 17.2·T − 1180·γgs + 12.61·API)/10⁵; Bo = Bob·(pb/p)^A (exact integral) | p psia, T °F | γgs | p 111–9485 psia, API 15.3–59.5 (unverified; γgs range of the data set not found) | C (Rpvt); integral checked in tests | Equation corroborated by C only. **A can be ≤ 0** (low Rsb, low T or API, high γgs): see the regression case. |
| **Glasø (1980) Rs / pb** | pb* = (Rs/γg)^0.816·T^0.172/API^0.989; log pb = 1.7669 + 1.7447·log pb* − 0.30218·(log pb*)² | T °F | γg | pb 165–7142, T 80–280, API 22.3–48.1, γg 0.65–1.276, Rs 90–2637 (unverified) | S (2017 geology paper table); C (Rpvt) | Corroborated |
| **Glasø Bo** | Bo* = Rs·(γg/γo)^0.526 + 0.968·T; Bo = 1 + 10^(−6.58511 + 2.91329·log Bo* − 0.27683·(log Bo*)²) | T °F | γg | as Rs | C (Rpvt); S not found this session | C only |
| **Al-Marhoun (1988) pb / Rs** | pb = 5.38088×10⁻³·Rs^0.715082·γg^−1.87784·γo^3.1437·T^1.32657 | **T °R (= °F + 460)** | γg | pb 130–3573, T 74–240, API 19.4–44.6, γg 0.752–1.367, Rs 26–1602 (unverified) | S (2017 table; one 2011 paper prints 5.338088×10⁻³ — a typo); C (Rpvt) | Corroborated |
| **Al-Marhoun Bo** | 0.497069 + 8.62963×10⁻⁴·T + 1.82594×10⁻³·F + 3.18099×10⁻⁶·F², F = Rs^0.74239·γg^0.323294·γo^−1.20204 | T °R | γg | as pb | C (Rpvt) | C only |
| **Petrosky-Farshad (1993) Rs / pb** | Rs = [(p/112.727 + 12.340)·γg^0.8439·10^x]^1.73184, x = 7.916×10⁻⁴·API^1.5410 − 4.561×10⁻⁵·T^1.3911 | T °F | γg | pb 1574–6523, T 114–288, API 16.3–45, γg 0.5781–0.8519, Rs 217–1406 (unverified) | S (pb form); C (Rpvt). One search summary attributed Al-Marhoun's ranges to this method — treated as an error of that summary | Corroborated |
| **Petrosky-Farshad Bo, co** | Bo = 1.0113 + 7.2046×10⁻⁵·[Rs^0.3738·γg^0.2914/γo^0.6265 + 0.24626·T^0.5371]^3.0936; co = 1.705×10⁻⁷·Rsb^0.69357·γg^0.1885·API^0.3272·T^0.6729·p^−0.5906 | T °F | γg | p 1700–10692 (unverified) | C (Rpvt) | C only |
| **Beal (1946) dead oil** (Standing's fit) | μod = (0.32 + 1.8×10⁷/API^4.53)·[360/(T + 200)]^a, a = 10^(0.43 + 8.33/API) | T °F | — | T 98–250, API 10.1–52.5 (unverified) | none independent | **Not cross-checked** |
| **Beggs-Robinson (1975) dead / saturated** | μod = 10^x − 1, x = 10^(3.0324 − 0.02023·API)·T^−1.163; μo = a·μod^b, a = 10.715(Rs + 100)^−0.515, b = 5.44(Rs + 150)^−0.338 | T °F | — | T 70–295, API 16–58 (T, API corroborated) | C (Rpvt, PRT, pyrestoolbox constants identical) | **Corroborated** |
| **Glasø dead oil** | μod = 3.141×10¹⁰·T^−3.444·(log API)^a, a = 10.313·log T − 36.447 | T °F | — | T 50–300, API 20.1–48.1 (unverified) | none independent | Not cross-checked |
| **Vasquez-Beggs undersaturated μ** | μo = μob·(p/pb)^m, m = 2.6·p^1.187·10^(−3.9×10⁻⁵·p − 5) | p psia | — | p 141–9515, API 15.3–59.5, γg 0.511–1.351, Rs 9.3–2199 (unverified) | C (Rpvt) | Corroborated (C). pyrestoolbox cites Whitson & Brulé: it rises unphysically at high pressure. |
| **API from density** | γo = ρo(60 °F)/ρw(60 °F); **ρw = 999.016 kg/m³** (62.366 lbm/ft³); API = 141.5/γo − 131.5 | density at 60 °F, or at 15 °C converted with the user's α | — | — | S (ASTM D1250-08 value via Wikipedia); N (IAPWS-95 via CoolProp: 999.017 kg/m³ at 60 °F, 999.103 at 15 °C) | **Corrected 2026-11-04** — was 62.4 lbm/ft³ (999.55 kg/m³, 0.054 % high, ≈ +0.09 °API at 35 °API). |

## Gas methods

| Method | Coefficients | Units | Range (status) | Evidence | Status |
|---|---|---|---|---|---|
| Standing (1977) natural / condensate pseudo-criticals | Ppc = 677 + 15γg − 37.5γg²; Tpc = 168 + 325γg − 12.5γg² (natural) | psia, °R | none published | N (GERG sweet gas, with DAK: Z AARE 1.10 %) | Not cross-checked (N only) |
| Sutton (1985) | Ppc = 756.8 − 131.0γg − 3.6γg²; Tpc = 169.2 + 349.5γg − 74.0γg² | psia, °R | γg 0.57–1.68 (unverified) | C (PRT; **pyrestoolbox identical Tpc/Ppc to 0.01**); N (GERG Z AARE 0.46 %) | Corroborated |
| Kay (1936) | molar averages | — | — | definition | Verified by definition |
| Wichert-Aziz (1972) | ε = 120(A^0.9 − A^1.6) + 15(B^0.5 − B^4) | °R | yCO2 ≤ 0.5446, yH2S ≤ 0.7385 (unverified) | C (PRT, Rpvt); N (GERG sour gas 4.01 % → 0.66 %) | Corroborated |
| Carr-Kobayashi-Burrows | Tpc′ = Tpc − 80yCO2 + 130yH2S − 250yN2; Ppc′ = Ppc + 440yCO2 + 600yH2S − 170yN2 | °R, psia | — | N (GERG 3.71 %) | Not cross-checked |
| Dranchuk-Abou-Kassem (1975) | 11-constant BWR fit, Newton solve | — | Ppr 0.2–30, Tpr 1.05–3.0 (Ppr corroborated; Tpr disputed 1.0/1.05) | C (Rpvt, PRT, zFactor; **pyrestoolbox Z identical to 5 decimals** at 3 conditions); N (SK chart AARE 0.30 %) | **Corroborated** |
| Papay | Z = 1 − 3.53Ppr/10^(0.9813Tpr) + 0.274Ppr²/10^(0.8157Tpr) | — | none | N (SK chart) | Not cross-checked |
| Beggs-Brill | explicit fit | — | none | C (zFactor); N | Corroborated (C) |
| Lee-Gonzalez-Eakin (1966) | K = (9.379 + 0.01607Ma)T^1.5/(209.2 + 19.26Ma + T), X = 3.448 + 986.4/T + 0.01009Ma, Y = 2.447 − 0.2224X | T °R, ρ g/cm³ | p 100–8000, T 100–340 (unverified) | C (PRT; **pyrestoolbox μg within 0.05 %**); N (CoolProp methane 1.3–5.1 %) | Corroborated |
| Bg, ρg, Eg, v, cg | Bg = (psc/Tsc)·Z·T/p; ρ = pMa/(ZRT), R = 10.7316; cg = 1/p − (1/Z)dZ/dp | psc 14.696 psia, Tsc 519.67 / 518.67 °R | — | definitions; cg vs analytic DAK derivative (tests) | Verified by definition |

## Vasquez-Beggs Bo coefficient C3 for API > 30

* **Code:** 1.337×10⁻⁹ (unchanged).
* **Evidence for 1.337×10⁻⁹:** ScienceDirect engineering-topic coefficient table; IHS / S&P Harmony oil-correlation
  documentation (the successor of Fekete's software); PetroleumOffice; petrocalchub.
* **Evidence for 1.377×10⁻⁹:** the older Fekete “Vasquez and Beggs” theory page; the Rpvt R package.
* **Assessment:** 1.337 has more, and more independent, transcriptions, and the vendor whose older page shows
  1.377 now documents 1.337. A 3↔7 transposition is a typical transcription error. The primary paper (JPT 32(6)
  968–970) could not be read, so this is a judgement on secondary evidence, not a verification. The code is not
  changed to match any single implementation.
* **Effect:** ΔBo = 4×10⁻¹¹·Rs·(API/γgs)·(T − 60): 1.5×10⁻⁴ rb/STB at Rs 500, API/γgs 54, 200 °F; up to
  1.5×10⁻³ at Rs 2000, API/γgs 80, 300 °F. It affects only Bo below pb with the Vasquez-Beggs Bo method, API > 30,
  and Bob (hence Bo above pb) with that method. The reported case (API 28.1) is not affected.
* **Remaining uncertainty:** settled only by the primary paper.

## Reported case (regression, `tests/pvt-regression-cases.test.js`)

p = 13 835 kPa(a) = 2006.597 psia; T = 64.9 °C = 148.82 °F; API 28.1; γg 1.424; pb = 964 kPa(a) = 139.816 psia.

| Step | Value |
|---|---|
| Standing x = 0.0125·28.1 − 0.00091·148.82 | 0.215824 |
| Rsb = 1.424·[(139.816/18.2 + 1.4)·10^0.215824]^1.2048 | **36.980 scf/STB** (pyrestoolbox: 36.982) |
| State | p > pb → undersaturated, Rs = Rsb |
| Bob (Standing): F = 36.98·(1.424/0.88659)^0.5 + 1.25·148.82 | **1.05903 rb/STB** |
| μod (Beal) / μob (Beggs-Robinson at Rsb) / μo (Vasquez-Beggs) | 6.2078 / 4.6320 / **7.4941 cP** |
| γgs | 1.424 — **assumed equal to γg** (no separator data) |
| Vasquez-Beggs A = (−1433 + 5·36.980 + 17.2·148.82 − 1180·1.424 + 12.61·28.1)/10⁵ | **−1.4376×10⁻⁴** |
| co = A/p | **−7.1645×10⁻⁸ 1/psi — negative, not physical → reported as unavailable** |
| Bo above pb = Bob·(pb/p)^A | 1.05944 — would rise with pressure → **reported as unavailable** |
| Range warnings | γg 1.424 outside Standing (0.59–0.95) and Vasquez-Beggs μ (0.511–1.351) data |

Why A < 0: the −1180·γgs term (−1680) outweighs 5·Rsb + 17.2·T + 12.61·API (≈ 3099 − 1433). The oil has very
little dissolved gas (37 scf/STB) and the gas gravity is far above the correlation data. Petrosky-Farshad co
is positive for the same inputs. **Correction of an earlier statement:** “co is positive” held only for the
in-range oils of the consistency sweep; the Vasquez-Beggs equation itself returns co ≤ 0 whenever A ≤ 0.

## Physical-consistency tests (not source verification)

`tests/pvt-consistency.test.js`: for 36 in-range oils × every Rs/Bo/co/dead-oil method combination (5 400 cases: 5 Rs × 5 Bo × 2 co × 3 dead-oil methods × 36 oils):
continuity of Rs, Bo, μo at pb; Rs rising below pb and equal to Rsb above; Bo maximum and μo minimum at pb; co > 0
and decreasing above pb **for these in-range oils**; pb ↔ Rsb round trip; a curve point equals the single-pressure
result. Gas: Z → 1 at low pressure, Bg / ρg / Eg identities, ideal cg = 1/p. These say nothing about whether the
coefficients are the published ones.
