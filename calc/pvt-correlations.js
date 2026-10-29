/* ============================================================================
   PVT Nexus — PVTCorr
   Published black-oil and natural-gas correlations, in the field units they
   were published in (p psia, T °F unless stated, Rs scf/STB, Bo rb/STB, μ cP).

   Rules for this file
   * Pure functions. A value outside the mathematical domain of an equation
     returns NaN — nothing is clamped to a "reasonable" number.
   * Every method carries its reference, equation text and the data range the
     authors reported (META). The engine turns the ranges into warnings.
   * Equations were checked against the primary publications as reproduced in
     the references listed in META and calc/README.md (Ahmed 2019; McCain 1990;
     Whitson & Brulé 2000). Data ranges are the ones reported with the original
     correlation; where a source gives none, `range` is omitted and the UI says so.
   ========================================================================= */
(function (root) {
  'use strict';

  var log10 = Math.log10, pow = Math.pow, exp = Math.exp, sqrt = Math.sqrt;
  function fin(x) { return typeof x === 'number' && isFinite(x); }
  function gammaO(api) { return 141.5 / (api + 131.5); }

  /* ======================================================== oil: Rs and pb
     Each family has Rs(p) and its algebraic inverse pb(Rs), so a fluid
     characterised by pb gives Rsb = Rs(pb) and one characterised by Rsb gives
     pb with Rs(pb) = Rsb — the two directions are consistent. */

  /* Standing (1947): T in °F */
  function standingRs(p, tF, api, gg) {
    if (!(p > 0)) return NaN;
    var x = 0.0125 * api - 0.00091 * tF;
    return gg * pow((p / 18.2 + 1.4) * pow(10, x), 1.2048);
  }
  function standingPb(rs, tF, api, gg) {
    if (!(rs > 0) || !(gg > 0)) return NaN;
    var a = 0.00091 * tF - 0.0125 * api;
    return 18.2 * (pow(rs / gg, 0.83) * pow(10, a) - 1.4);
  }

  /* Vasquez & Beggs (1980): T in °R = °F + 460, γgs = separator-corrected gravity */
  function vbCoef(api) {
    return api <= 30 ? { c1: 0.0362, c2: 1.0937, c3: 25.7240 } : { c1: 0.0178, c2: 1.1870, c3: 23.931 };
  }
  function vbRs(p, tF, api, ggs) {
    if (!(p > 0)) return NaN;
    var c = vbCoef(api);
    return c.c1 * ggs * pow(p, c.c2) * exp(c.c3 * api / (tF + 460));
  }
  function vbPb(rs, tF, api, ggs) {
    if (!(rs > 0) || !(ggs > 0)) return NaN;
    var c = vbCoef(api);
    return pow(rs / (c.c1 * ggs * exp(c.c3 * api / (tF + 460))), 1 / c.c2);
  }
  /* separator gas-gravity correction to 100 psig (Vasquez & Beggs 1980); psep psia, Tsep °F */
  function vbGammaGs(gg, api, psepPsia, tsepF) {
    return gg * (1 + 5.912e-5 * api * tsepF * log10(psepPsia / 114.7));
  }

  /* Glasø (1980): T in °F */
  function glasoRs(p, tF, api, gg) {
    if (!(p > 0) || !(tF > 0) || !(api > 0)) return NaN;
    var d = 14.1811 - 3.3093 * log10(p);
    if (d < 0) return NaN;
    var x = 2.8869 - sqrt(d);
    return gg * pow((pow(api, 0.989) / pow(tF, 0.172)) * pow(10, x), 1.2255);
  }
  function glasoPb(rs, tF, api, gg) {
    if (!(rs > 0) || !(gg > 0) || !(tF > 0) || !(api > 0)) return NaN;
    var star = pow(rs / gg, 0.816) * pow(tF, 0.172) / pow(api, 0.989);
    var L = log10(star);
    return pow(10, 1.7669 + 1.7447 * L - 0.30218 * L * L);
  }

  /* Al-Marhoun (1988): T in °R = °F + 460 */
  function marhounRs(p, tF, api, gg) {
    if (!(p > 0)) return NaN;
    var inside = 185.843208 * pow(gg, 1.87784) * pow(gammaO(api), -3.1437) * pow(tF + 460, -1.32657) * p;
    return inside > 0 ? pow(inside, 1.398441) : NaN;
  }
  function marhounPb(rs, tF, api, gg) {
    if (!(rs > 0) || !(gg > 0)) return NaN;
    return 5.38088e-3 * pow(rs, 0.715082) * pow(gg, -1.87784) * pow(gammaO(api), 3.1437) * pow(tF + 460, 1.32657);
  }

  /* Petrosky & Farshad (1993): T in °F */
  function pfX(api, tF) { return 7.916e-4 * pow(api, 1.5410) - 4.561e-5 * pow(tF, 1.3911); }
  function pfRs(p, tF, api, gg) {
    if (!(p > 0) || !(api >= 0) || !(tF >= 0)) return NaN;
    return pow((p / 112.727 + 12.340) * pow(gg, 0.8439) * pow(10, pfX(api, tF)), 1.73184);
  }
  function pfPb(rs, tF, api, gg) {
    if (!(rs > 0) || !(gg > 0) || !(api >= 0) || !(tF >= 0)) return NaN;
    return 112.727 * (pow(rs, 1 / 1.73184) / (pow(gg, 0.8439) * pow(10, pfX(api, tF))) - 12.340);
  }

  /* ============================================================== oil: Bo at p <= pb */
  function standingBo(rs, tF, api, gg) {
    var t = rs * sqrt(gg / gammaO(api)) + 1.25 * tF;
    return t > 0 ? 0.9759 + 0.00012 * pow(t, 1.2) : NaN;
  }
  function vbBo(rs, tF, api, ggs) {
    var c = api <= 30 ? [4.677e-4, 1.751e-5, -1.811e-8] : [4.670e-4, 1.100e-5, 1.337e-9];
    return 1 + c[0] * rs + (tF - 60) * (api / ggs) * (c[1] + c[2] * rs);
  }
  function glasoBo(rs, tF, api, gg) {
    var star = rs * pow(gg / gammaO(api), 0.526) + 0.968 * tF;
    if (!(star > 0)) return NaN;
    var L = log10(star);
    return 1 + pow(10, -6.58511 + 2.91329 * L - 0.27683 * L * L);
  }
  function marhounBo(rs, tF, api, gg) {
    if (!(rs > 0)) return NaN;
    var F = pow(rs, 0.74239) * pow(gg, 0.323294) * pow(gammaO(api), -1.20204);
    return 0.497069 + 8.62963e-4 * (tF + 460) + 1.82594e-3 * F + 3.18099e-6 * F * F;
  }
  function pfBo(rs, tF, api, gg) {
    if (!(rs > 0) || !(tF > 0)) return NaN;
    var t = pow(rs, 0.3738) * (pow(gg, 0.2914) / pow(gammaO(api), 0.6265)) + 0.24626 * pow(tF, 0.5371);
    return 1.0113 + 7.2046e-5 * pow(t, 3.0936);
  }
  /* material balance (Ahmed 2019): needs the measured reservoir oil density at the same p */
  function materialBalanceBo(rs, api, gg, rhoOil) {
    if (!(rhoOil > 0)) return NaN;
    return (62.4 * gammaO(api) + 0.0136 * rs * gg) / rhoOil;
  }

  /* ======================================= oil: undersaturated compressibility, p >= pb
     Bo above pb comes from integrating co between pb and p, so Bo and co always agree. */
  function vbCoA(rsb, tF, api, ggs) {   // co = A / p
    return (-1433 + 5 * rsb + 17.2 * tF - 1180 * ggs + 12.61 * api) / 1e5;
  }
  function vbCo(p, rsb, tF, api, ggs) { return p > 0 ? vbCoA(rsb, tF, api, ggs) / p : NaN; }
  function vbBoAbove(p, pb, bob, rsb, tF, api, ggs) {
    var A = vbCoA(rsb, tF, api, ggs);
    return bob * exp(-A * Math.log(p / pb));
  }
  function pfCoK(rsb, tF, api, gg) {
    return pow(rsb, 0.69357) * pow(gg, 0.1885) * pow(api, 0.3272) * pow(tF, 0.6729);
  }
  function pfCo(p, rsb, tF, api, gg) { return p > 0 ? 1.705e-7 * pfCoK(rsb, tF, api, gg) * pow(p, -0.5906) : NaN; }
  function pfBoAbove(p, pb, bob, rsb, tF, api, gg) {
    var A = (1.705e-7 / 0.4094) * pfCoK(rsb, tF, api, gg);   // = 4.1646e-7 · K
    return bob * exp(-A * (pow(p, 0.4094) - pow(pb, 0.4094)));
  }

  /* ========================================================= oil viscosity */
  function deadBeal(tF, api) {
    if (!(api > 0) || !(tF > -200)) return NaN;
    var a = pow(10, 0.43 + 8.33 / api);
    return (0.32 + 1.8e7 / pow(api, 4.53)) * pow(360 / (tF + 200), a);
  }
  function deadBeggsRobinson(tF, api) {
    if (!(tF > 0)) return NaN;
    var x = pow(10, 3.0324 - 0.02023 * api) * pow(tF, -1.163);
    return pow(10, x) - 1;
  }
  function deadGlaso(tF, api) {
    if (!(tF > 0) || !(api > 1)) return NaN;
    return 3.141e10 * pow(tF, -3.444) * pow(log10(api), 10.313 * log10(tF) - 36.447);
  }
  function satBeggsRobinson(muDead, rs) {
    if (!(muDead > 0) || !(rs >= 0)) return NaN;
    var a = 10.715 * pow(rs + 100, -0.515), b = 5.44 * pow(rs + 150, -0.338);
    return a * pow(muDead, b);
  }
  function vbMuExponent(p) { return 2.6 * pow(p, 1.187) * pow(10, -3.9e-5 * p - 5); }
  function underVB(muB, p, pb) {
    if (!(muB > 0) || !(p > 0) || !(pb > 0)) return NaN;
    return muB * pow(p / pb, vbMuExponent(p));
  }

  /* ============================================================ gas: pseudo-criticals (psia, °R) */
  function pcStandingNatural(gg) { return { ppc: 677 + 15 * gg - 37.5 * gg * gg, tpc: 168 + 325 * gg - 12.5 * gg * gg }; }
  function pcStandingCondensate(gg) { return { ppc: 706 - 51.7 * gg - 11.1 * gg * gg, tpc: 187 + 330 * gg - 71.5 * gg * gg }; }
  function pcSutton(gg) { return { ppc: 756.8 - 131.0 * gg - 3.6 * gg * gg, tpc: 169.2 + 349.5 * gg - 74.0 * gg * gg }; }
  /* Kay (1936) molar mixing; entries [{y, pc, tc}] with Σy = 1 */
  function pcKay(entries) {
    var ppc = 0, tpc = 0;
    entries.forEach(function (e) { ppc += e.y * e.pc; tpc += e.y * e.tc; });
    return { ppc: ppc, tpc: tpc };
  }

  /* ============================================================ gas: sour-gas corrections */
  function wichertAziz(ppc, tpc, yCO2, yH2S) {
    var A = yCO2 + yH2S, B = yH2S;
    var eps = 120 * (pow(A, 0.9) - pow(A, 1.6)) + 15 * (sqrt(B) - pow(B, 4));
    var tpc2 = tpc - eps;
    var den = tpc + B * (1 - B) * eps;
    return { ppc: den > 0 ? ppc * tpc2 / den : NaN, tpc: tpc2, eps: eps };
  }
  function carrKobayashiBurrows(ppc, tpc, yCO2, yH2S, yN2) {
    return { ppc: ppc + 440 * yCO2 + 600 * yH2S - 170 * yN2, tpc: tpc - 80 * yCO2 + 130 * yH2S - 250 * yN2 };
  }

  /* ============================================================ gas: Z factor */
  function zPapay(ppr, tpr) {
    if (!(ppr >= 0) || !(tpr > 0)) return NaN;
    return 1 - 3.53 * ppr / pow(10, 0.9813 * tpr) + 0.274 * ppr * ppr / pow(10, 0.8157 * tpr);
  }
  function zBeggsBrill(ppr, tpr) {
    if (!(ppr >= 0) || !(tpr > 0.92) || Math.abs(tpr - 0.86) < 1e-9) return NaN;
    var A = 1.39 * sqrt(tpr - 0.92) - 0.36 * tpr - 0.101;
    var B = (0.62 - 0.23 * tpr) * ppr + (0.066 / (tpr - 0.86) - 0.037) * ppr * ppr + 0.32 * pow(ppr, 6) / pow(10, 9 * (tpr - 1));
    var C = 0.132 - 0.32 * log10(tpr);
    var D = pow(10, 0.3106 - 0.49 * tpr + 0.1824 * tpr * tpr);
    return A + (1 - A) / exp(B) + C * pow(ppr, D);
  }
  /* Dranchuk & Abou-Kassem (1975): 11-constant fit of the Standing-Katz chart, solved for the
     reduced density ρr = 0.27 Ppr / (Z Tpr) by Newton-Raphson. Returns NaN if it does not converge. */
  var DAK = [0, 0.3265, -1.0700, -0.5339, 0.01569, -0.05165, 0.5475, -0.7361, 0.1844, 0.1056, 0.6134, 0.7210];
  function zDAK(ppr, tpr) {
    if (!(ppr >= 0) || !(tpr > 0)) return NaN;
    if (ppr === 0) return 1;
    var A = DAK, t = tpr;
    var c1 = A[1] + A[2] / t + A[3] / pow(t, 3) + A[4] / pow(t, 4) + A[5] / pow(t, 5);
    var c2 = A[6] + A[7] / t + A[8] / (t * t);
    var c3 = A[9] * (A[7] / t + A[8] / (t * t));
    var c4 = A[10] / pow(t, 3);
    var k = 0.27 * ppr / t;
    function f(r) {
      var r2 = r * r;
      return 1 + c1 * r + c2 * r2 - c3 * pow(r, 5) + c4 * r2 * (1 + A[11] * r2) * exp(-A[11] * r2) - k / r;
    }
    function df(r) {
      var r2 = r * r, e = exp(-A[11] * r2);
      return c1 + 2 * c2 * r - 5 * c3 * pow(r, 4)
        + c4 * e * (2 * r + 4 * A[11] * r2 * r - 2 * A[11] * r * r2 * (1 + A[11] * r2)) + k / r2;
    }
    var r = k; // start from Z = 1
    for (var i = 0; i < 100; i++) {
      var fx = f(r), d = df(r);
      if (!fin(fx) || !fin(d) || d === 0) return NaN;
      var rn = r - fx / d;
      if (rn <= 0) rn = r / 2;
      if (Math.abs(rn - r) < 1e-12 * Math.max(1, r)) { r = rn; return k / r; }
      r = rn;
    }
    return Math.abs(f(r)) < 1e-9 ? k / r : NaN;
  }

  /* ============================================================ gas: viscosity
     Lee, Gonzalez & Eakin (1966) with the coefficients given by Whitson & Brulé (2000).
     T in °R, ρ in g/cm³, Ma in lb/lbmol; returns cP. */
  function muLGE(tR, ma, rhoGcc) {
    if (!(tR > 0) || !(ma > 0) || !(rhoGcc >= 0)) return NaN;
    var K = (9.379 + 0.01607 * ma) * pow(tR, 1.5) / (209.2 + 19.26 * ma + tR);
    var X = 3.448 + 986.4 / tR + 0.01009 * ma;
    var Y = 2.447 - 0.2224 * X;
    return 1e-4 * K * exp(X * pow(rhoGcc, Y));
  }

  /* ============================================================ metadata
     range keys: p (psia), T (°F), api, gg, rs (scf/STB), ppr, tpr. Units shown in the UI. */
  var REF = {
    standing47: 'Standing, M.B. (1947). A Pressure-Volume-Temperature Correlation for Mixtures of California Oils and Gases. Drilling and Production Practice, API, 275–287.',
    vb80: 'Vasquez, M. and Beggs, H.D. (1980). Correlations for Fluid Physical Property Prediction. JPT 32(6), 968–970. SPE-6719-PA.',
    glaso80: 'Glasø, Ø. (1980). Generalized Pressure-Volume-Temperature Correlations. JPT 32(5), 785–795. SPE-8016-PA.',
    marhoun88: 'Al-Marhoun, M.A. (1988). PVT Correlations for Middle East Crude Oils. JPT 40(5), 650–666. SPE-13718-PA.',
    pf93: 'Petrosky, G.E. Jr. and Farshad, F.F. (1993). Pressure-Volume-Temperature Correlations for Gulf of Mexico Crude Oils. SPE-26644-MS (SPEREE 1998, SPE-51395-PA).',
    beal46: 'Beal, C. (1946). The Viscosity of Air, Water, Natural Gas, Crude Oil and Its Associated Gases at Oil Field Temperatures and Pressures. Trans. AIME 165, 94–115 (equation form by Standing 1981).',
    br75: 'Beggs, H.D. and Robinson, J.R. (1975). Estimating the Viscosity of Crude Oil Systems. JPT 27(9), 1140–1141. SPE-5434-PA.',
    standing77: 'Standing, M.B. (1977). Volumetric and Phase Behavior of Oil Field Hydrocarbon Systems. SPE, Dallas (fit of the Brown et al. 1948 pseudo-critical chart).',
    sutton85: 'Sutton, R.P. (1985). Compressibility Factors for High-Molecular-Weight Reservoir Gases. SPE-14265-MS.',
    kay36: 'Kay, W.B. (1936). Density of Hydrocarbon Gases and Vapors at High Temperature and Pressure. Ind. Eng. Chem. 28, 1014–1019.',
    wa72: 'Wichert, E. and Aziz, K. (1972). Calculate Z\'s for Sour Gases. Hydrocarbon Processing 51(5), 119–122.',
    ckb54: 'Carr, N.L., Kobayashi, R. and Burrows, D.B. (1954). Viscosity of Hydrocarbon Gases Under Pressure. Trans. AIME 201, 264–272 (pseudo-critical adjustment as given by Ahmed 2019).',
    dak75: 'Dranchuk, P.M. and Abou-Kassem, J.H. (1975). Calculation of Z Factors for Natural Gases Using Equations of State. JCPT 14(3), 34–36.',
    papay: 'Papay, J. (1968). A Termelestechnologiai Parameterek Valtozasa a Gazlelepk Muvelese Soran. OGIL Musz. Tud. Kozl., Budapest (as given by Ahmed 2019).',
    bb73: 'Beggs, H.D. and Brill, J.P. (1973). A Study of Two-Phase Flow in Inclined Pipes. JPT 25(5), 607–617 (Z-factor fit as given by Standing 1981).',
    lge66: 'Lee, A.L., Gonzalez, M.H. and Eakin, B.E. (1966). The Viscosity of Natural Gases. JPT 18(8), 997–1000. SPE-1340-PA (coefficients per Whitson & Brulé 2000).',
    ahmed: 'Ahmed, T. (2019). Reservoir Engineering Handbook, 5th ed. Gulf Professional Publishing, Ch. 2 (Reservoir-Fluid Properties).',
    mccain90: 'McCain, W.D. Jr. (1990). The Properties of Petroleum Fluids, 2nd ed. PennWell.',
    wb00: 'Whitson, C.H. and Brulé, M.R. (2000). Phase Behavior. SPE Monograph Vol. 20.'
  };

  var META = {
    rsFamily: {
      standing: { label: 'Standing (1947)', ref: ['standing47', 'ahmed'], tUnit: '°F',
        eq: 'Rs = γg·[(p/18.2 + 1.4)·10^x]^1.2048,  x = 0.0125·API − 0.00091·T',
        eqPb: 'pb = 18.2·[(Rs/γg)^0.83·10^a − 1.4],  a = 0.00091·T − 0.0125·API',
        range: { pb: [130, 7000], T: [100, 258], api: [16.5, 63.8], gg: [0.59, 0.95], rs: [20, 1425] },
        note: 'California oils.' },
      vasquez_beggs: { label: 'Vasquez-Beggs (1980)', ref: ['vb80', 'ahmed'], tUnit: '°R (= °F + 460)',
        eq: 'Rs = C1·γgs·p^C2·exp[C3·API/(T + 460)];  API ≤ 30: C1 0.0362, C2 1.0937, C3 25.724;  API > 30: 0.0178, 1.187, 23.931',
        eqPb: 'pb = {Rs / [C1·γgs·exp(C3·API/(T + 460))]}^(1/C2)',
        range: { pb: [50, 5250], T: [70, 295], api: [16, 58], gg: [0.56, 1.18], rs: [20, 2070] },
        note: 'Uses the separator-corrected gas gravity γgs (100 psig basis). Without separator conditions γgs = γg is assumed.' },
      glaso: { label: 'Glasø (1980)', ref: ['glaso80', 'ahmed'], tUnit: '°F',
        eq: 'Rs = γg·[(API^0.989 / T^0.172)·pb*]^1.2255,  pb* = 10^x,  x = 2.8869 − (14.1811 − 3.3093·log p)^0.5',
        eqPb: 'log pb = 1.7669 + 1.7447·log pb* − 0.30218·(log pb*)²,  pb* = (Rs/γg)^0.816·T^0.172 / API^0.989',
        range: { pb: [165, 7142], T: [80, 280], api: [22.3, 48.1], gg: [0.65, 1.276], rs: [90, 2637] },
        note: 'North Sea oils.' },
      marhoun: { label: 'Al-Marhoun (1988)', ref: ['marhoun88', 'ahmed'], tUnit: '°R (= °F + 460)',
        eq: 'Rs = [185.843208·γg^1.87784·γo^−3.1437·T^−1.32657·p]^1.398441',
        eqPb: 'pb = 5.38088×10⁻³·Rs^0.715082·γg^−1.87784·γo^3.1437·T^1.32657',
        range: { pb: [130, 3573], T: [74, 240], api: [19.4, 44.6], gg: [0.752, 1.367], rs: [26, 1602] },
        note: 'Middle East oils.' },
      petrosky_farshad: { label: 'Petrosky-Farshad (1993)', ref: ['pf93', 'ahmed'], tUnit: '°F',
        eq: 'Rs = [(p/112.727 + 12.340)·γg^0.8439·10^x]^1.73184,  x = 7.916×10⁻⁴·API^1.5410 − 4.561×10⁻⁵·T^1.3911',
        eqPb: 'pb = 112.727·[Rs^0.577421 / (γg^0.8439·10^x) − 12.340]',
        range: { pb: [1574, 6523], T: [114, 288], api: [16.3, 45.0], gg: [0.5781, 0.8519], rs: [217, 1406] },
        note: 'Gulf of Mexico oils.' }
    },
    bo: {
      standing: { label: 'Standing (1947)', ref: ['standing47', 'ahmed'], eq: 'Bo = 0.9759 + 0.00012·[Rs·(γg/γo)^0.5 + 1.25·T]^1.2', range: { T: [100, 258], api: [16.5, 63.8], gg: [0.59, 0.95], rs: [20, 1425] } },
      vasquez_beggs: { label: 'Vasquez-Beggs (1980)', ref: ['vb80', 'ahmed'], eq: 'Bo = 1 + C1·Rs + (T − 60)·(API/γgs)·(C2 + C3·Rs);  API ≤ 30: 4.677×10⁻⁴, 1.751×10⁻⁵, −1.811×10⁻⁸;  API > 30: 4.670×10⁻⁴, 1.100×10⁻⁵, 1.337×10⁻⁹', range: { T: [70, 295], api: [16, 58], gg: [0.56, 1.18], rs: [20, 2070] } },
      glaso: { label: 'Glasø (1980)', ref: ['glaso80', 'ahmed'], eq: 'Bo = 1 + 10^A,  A = −6.58511 + 2.91329·log Bo* − 0.27683·(log Bo*)²,  Bo* = Rs·(γg/γo)^0.526 + 0.968·T', range: { T: [80, 280], api: [22.3, 48.1], gg: [0.65, 1.276], rs: [90, 2637] } },
      marhoun: { label: 'Al-Marhoun (1988)', ref: ['marhoun88', 'ahmed'], eq: 'Bo = 0.497069 + 8.62963×10⁻⁴·T + 1.82594×10⁻³·F + 3.18099×10⁻⁶·F²,  F = Rs^0.74239·γg^0.323294·γo^−1.20204,  T in °R', range: { T: [74, 240], api: [19.4, 44.6], gg: [0.752, 1.367], rs: [26, 1602] } },
      petrosky_farshad: { label: 'Petrosky-Farshad (1993)', ref: ['pf93', 'ahmed'], eq: 'Bo = 1.0113 + 7.2046×10⁻⁵·[Rs^0.3738·(γg^0.2914/γo^0.6265) + 0.24626·T^0.5371]^3.0936', range: { T: [114, 288], api: [16.3, 45.0], gg: [0.5781, 0.8519], rs: [217, 1406] } }
    },
    co: {
      vasquez_beggs: { label: 'Vasquez-Beggs (1980)', ref: ['vb80', 'ahmed'],
        eq: 'co = A/p,  A = (−1433 + 5·Rsb + 17.2·T − 1180·γgs + 12.61·API)/10⁵;  Bo = Bob·(pb/p)^A',
        range: { p: [111, 9485], api: [15.3, 59.5] } },
      petrosky_farshad: { label: 'Petrosky-Farshad (1993)', ref: ['pf93', 'ahmed'],
        eq: 'co = 1.705×10⁻⁷·Rsb^0.69357·γg^0.1885·API^0.3272·T^0.6729·p^−0.5906;  Bo = Bob·exp[−A·(p^0.4094 − pb^0.4094)],  A = (1.705×10⁻⁷/0.4094)·Rsb^0.69357·γg^0.1885·API^0.3272·T^0.6729',
        range: { p: [1700, 10692], T: [114, 288], api: [16.3, 45.0], gg: [0.5781, 0.8519], rs: [217, 1406] } }
    },
    muDead: {
      beal: { label: 'Beal (1946)', ref: ['beal46', 'ahmed'], eq: 'μod = (0.32 + 1.8×10⁷/API^4.53)·[360/(T + 200)]^a,  a = 10^(0.43 + 8.33/API)', range: { T: [98, 250], api: [10.1, 52.5] } },
      beggs_robinson: { label: 'Beggs-Robinson (1975)', ref: ['br75', 'ahmed'], eq: 'μod = 10^x − 1,  x = Y·T^−1.163,  Y = 10^Z,  Z = 3.0324 − 0.02023·API', range: { T: [70, 295], api: [16, 58] } },
      glaso: { label: 'Glasø (1980)', ref: ['glaso80', 'ahmed'], eq: 'μod = 3.141×10¹⁰·T^−3.444·(log API)^a,  a = 10.313·log T − 36.447', range: { T: [50, 300], api: [20.1, 48.1] } }
    },
    muSat: {
      beggs_robinson: { label: 'Beggs-Robinson (1975)', ref: ['br75', 'ahmed'], eq: 'μo = a·μod^b,  a = 10.715·(Rs + 100)^−0.515,  b = 5.44·(Rs + 150)^−0.338', range: { p: [132, 5265], T: [70, 295], api: [16, 58], rs: [20, 2070] } }
    },
    muUnder: {
      vasquez_beggs: { label: 'Vasquez-Beggs (1980)', ref: ['vb80', 'ahmed'], eq: 'μo = μob·(p/pb)^m,  m = 2.6·p^1.187·10^a,  a = −3.9×10⁻⁵·p − 5', range: { p: [141, 9515], api: [15.3, 59.5], gg: [0.511, 1.351], rs: [9.3, 2199] } }
    },
    pc: {
      standing_natural: { label: 'Standing (1977) — natural gas', ref: ['standing77', 'ahmed'], eq: 'Ppc = 677 + 15·γg − 37.5·γg²,  Tpc = 168 + 325·γg − 12.5·γg²' },
      standing_condensate: { label: 'Standing (1977) — gas-condensate / wet gas', ref: ['standing77', 'ahmed'], eq: 'Ppc = 706 − 51.7·γg − 11.1·γg²,  Tpc = 187 + 330·γg − 71.5·γg²' },
      sutton: { label: 'Sutton (1985)', ref: ['sutton85', 'ahmed'], eq: 'Ppc = 756.8 − 131.0·γg − 3.6·γg²,  Tpc = 169.2 + 349.5·γg − 74.0·γg²', range: { gg: [0.57, 1.68] } },
      kay: { label: 'Kay (1936) mixing rule — composition', ref: ['kay36', 'ahmed'], eq: 'Ppc = Σ yi·Pci,  Tpc = Σ yi·Tci' }
    },
    sour: {
      none: { label: 'None', eq: 'Pseudo-critical properties used as calculated.' },
      wichert_aziz: { label: 'Wichert-Aziz (1972)', ref: ['wa72', 'ahmed'], eq: 'ε = 120·(A^0.9 − A^1.6) + 15·(B^0.5 − B^4);  Tpc\' = Tpc − ε;  Ppc\' = Ppc·Tpc\' / [Tpc + B·(1 − B)·ε];  A = yH2S + yCO2,  B = yH2S', range: { yCO2: [0, 0.5446], yH2S: [0, 0.7385] } },
      carr_kobayashi_burrows: { label: 'Carr-Kobayashi-Burrows (1954)', ref: ['ckb54', 'ahmed'], eq: 'Tpc\' = Tpc − 80·yCO2 + 130·yH2S − 250·yN2;  Ppc\' = Ppc + 440·yCO2 + 600·yH2S − 170·yN2' }
    },
    z: {
      dak: { label: 'Dranchuk-Abou-Kassem (1975)', ref: ['dak75', 'ahmed'], eq: 'Z = 1 + (A1 + A2/Tpr + A3/Tpr³ + A4/Tpr⁴ + A5/Tpr⁵)·ρr + (A6 + A7/Tpr + A8/Tpr²)·ρr² − A9·(A7/Tpr + A8/Tpr²)·ρr⁵ + A10·(1 + A11·ρr²)·(ρr²/Tpr³)·exp(−A11·ρr²),  ρr = 0.27·Ppr/(Z·Tpr); solved by Newton-Raphson', range: { ppr: [0.2, 30], tpr: [1.0, 3.0] } },
      papay: { label: 'Papay (1968)', ref: ['papay', 'ahmed'], eq: 'Z = 1 − 3.53·Ppr/10^(0.9813·Tpr) + 0.274·Ppr²/10^(0.8157·Tpr)', note: 'Explicit approximation. No validity range is given in the references available here; compare it with Dranchuk-Abou-Kassem at high Ppr.' },
      beggs_brill: { label: 'Beggs-Brill (1973)', ref: ['bb73', 'ahmed'], eq: 'Z = A + (1 − A)/e^B + C·Ppr^D  (A, B, C, D functions of Tpr and Ppr)', note: 'Explicit approximation; mathematically defined only for Tpr > 0.92. No validity range is given in the references available here.' },
      manual: { label: 'Manual chart value (single pressure)', eq: 'Z read by the user from the Standing-Katz chart at the displayed Ppr and Tpr.' }
    },
    muGas: {
      lee_gonzalez_eakin: { label: 'Lee-Gonzalez-Eakin (1966)', ref: ['lge66', 'wb00'], eq: 'μg = 10⁻⁴·K·exp(X·ρg^Y),  K = (9.379 + 0.01607·Ma)·T^1.5/(209.2 + 19.26·Ma + T),  X = 3.448 + 986.4/T + 0.01009·Ma,  Y = 2.447 − 0.2224·X;  T in °R, ρg in g/cm³', range: { p: [100, 8000], T: [100, 340] }, note: 'Developed on sweet natural gases; not intended for sour gas.' }
    }
  };

  var PVTCorr = {
    gammaO: gammaO,
    oil: {
      rs: { standing: standingRs, vasquez_beggs: vbRs, glaso: glasoRs, marhoun: marhounRs, petrosky_farshad: pfRs },
      pb: { standing: standingPb, vasquez_beggs: vbPb, glaso: glasoPb, marhoun: marhounPb, petrosky_farshad: pfPb },
      bo: { standing: standingBo, vasquez_beggs: vbBo, glaso: glasoBo, marhoun: marhounBo, petrosky_farshad: pfBo },
      co: { vasquez_beggs: vbCo, petrosky_farshad: pfCo },
      boAbove: { vasquez_beggs: vbBoAbove, petrosky_farshad: pfBoAbove },
      muDead: { beal: deadBeal, beggs_robinson: deadBeggsRobinson, glaso: deadGlaso },
      satBeggsRobinson: satBeggsRobinson, underVB: underVB, vbMuExponent: vbMuExponent,
      vbGammaGs: vbGammaGs, vbCoA: vbCoA, pfCoK: pfCoK, pfX: pfX, materialBalanceBo: materialBalanceBo,
      /* named exports kept for the batch evaluation tables */
      standingRs: standingRs, vbRs: vbRs, glasoRs: glasoRs, marhounRs: marhounRs, petroskyFarshadRs: pfRs,
      standingPb: standingPb, vbPb: vbPb, glasoPb: glasoPb, marhounPb: marhounPb, petroskyFarshadPb: pfPb,
      standingBo: standingBo, vbBo: vbBo, glasoBo: glasoBo, marhounBo: marhounBo, petroskyFarshadBo: pfBo,
      deadBeal: deadBeal, deadBeggsRobinson: deadBeggsRobinson, deadGlaso: deadGlaso
    },
    gas: {
      pc: { standing_natural: pcStandingNatural, standing_condensate: pcStandingCondensate, sutton: pcSutton },
      pcKay: pcKay, wichertAziz: wichertAziz, carrKobayashiBurrows: carrKobayashiBurrows,
      z: { dak: zDAK, papay: zPapay, beggs_brill: zBeggsBrill },
      muLGE: muLGE
    },
    META: META, REF: REF
  };

  root.PVTCorr = PVTCorr;
  if (typeof module !== 'undefined' && module.exports) module.exports = PVTCorr;
})(typeof window !== 'undefined' ? window : globalThis);
