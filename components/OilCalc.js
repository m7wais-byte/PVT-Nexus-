/* ============================================================================
   VAPS PVT Nexus — OilCalc
   Native Oil Properties Calculator (no iframe, no external page).

   Mounted by Main.js into the host <div> rendered by screens/showCalc.js:
       OilCalc.mount(el)   /   OilCalc.unmount()

   All correlations are carried over unchanged from the standalone
   "PVT calculator" build (app.js) — Standing, Vasquez-Beggs, Glaso,
   Marhoun, Petrosky-Farshad, material balance, Beal / Beggs-Robinson /
   Glaso dead-oil viscosity, Beggs-Robinson saturated, Vazquez-Beggs
   undersaturated.  Styling only lives in theme.css (.oc-* block).
   ========================================================================= */
(function (global) {
  'use strict';

  var host = null;
  var mounted = false;

  var state = {
    tab: 'calc',
    batchTab: 'rs',
    oilRsEval: { rows: [], aaes: {} },
    oilPbEval: { rows: [], aaes: {} },
    oilBoEval: { rows: [], aaes: {} },
    oilMuEval: { rows: [], aaes: {} }
  };

  /* ids are namespaced with oc- so they cannot collide with the app shell */
  function $(id) { return document.getElementById('oc-' + id); }

  function toNum(id) {
    var el = $(id);
    if (!el) return NaN;
    var v = Number(el.value);
    if (el.value === '' || el.value === null) return NaN;
    return Number.isFinite(v) ? v : NaN;
  }

  function round(value, digits) {
    if (digits === undefined) digits = 5;
    if (!Number.isFinite(value)) return '-';
    return Number(value).toFixed(digits);
  }

  function getTemperatureRankine() {
    var t = toNum('temperature');
    var unit = ($('temperatureUnit') && $('temperatureUnit').value) || 'F';
    if (!Number.isFinite(t)) return NaN;
    if (unit === 'R') return t;
    if (unit === 'F') return t + 459.67;
    if (unit === 'C') return (t + 273.15) * 9 / 5;
    if (unit === 'K') return t * 9 / 5;
    return t + 459.67;
  }

  function rankineToFahrenheit(tR) { return tR - 459.67; }

  function addResult(rows, property, value, unit, method) {
    rows.push({ property: property, value: value, unit: unit, method: method });
  }

  /* ------------------------------------------------------ Rs correlations */

  function standingRs(p, tF, api, gg) {
    // Standing Rs correlation (lecture Eq. 4-23 style):
    // p in psia, T in deg F, API in deg API, gg = gas specific gravity.
    var x = (p / 18.2 + 1.4) * Math.pow(10, 0.0125 * api - 0.00091 * tF);
    return gg * Math.pow(x, 1.2048);
  }

  function vbRs(p, tF, api, gg) {
    // Vasquez-Beggs Rs correlation (lecture Eqs. 4-24/4-25):
    // p in psia, T in deg R, gg is separator-corrected gas gravity when available.
    var tR = tF + 460;
    var c1 = api <= 30 ? 0.0362 : 0.0178;
    var c2 = api <= 30 ? 1.0937 : 1.187;
    var c3 = api <= 30 ? 25.724 : 23.931;
    return c1 * gg * Math.pow(p, c2) * Math.exp((c3 * api) / tR);
  }

  function glasoRs(pPsia, tF, api, gg) {
    // Glaso Rs correlation (lecture Eq. 4-26 style), p in psia, T in deg F.
    var x = 2.8869 - Math.sqrt(Math.max(14.1811 - 3.3093 * Math.log10(Math.max(pPsia, 1e-6)), 1e-12));
    var A = Math.pow(10, x);
    var tTermF = Math.max(tF, 1e-6);
    return gg * Math.pow((Math.pow(api, 0.989) / Math.pow(tTermF, 0.172)) * A, 1.2255);
  }

  function marhounRs(pPsia, tF, api, gg) {
    // Marhoun Rs correlation form used in lecture examples: p in psia, T in deg R.
    var a = 185.843208;
    var b = 1.87784;
    var c = -3.1437;
    var d = -1.32657;
    var e = 1.39844;
    var go = 141.5 / (api + 131.5);
    var tR = tF + 460;
    var inside = a * Math.pow(gg, b) * Math.pow(go, c) * Math.pow(Math.max(tR, 1e-6), d) * Math.max(pPsia, 1e-6);
    return Math.pow(Math.max(inside, 1e-12), e);
  }

  function petroskyFarshadRs(pPsia, tF, api, gg) {
    // Petrosky-Farshad Rs correlation (lecture slide 124 form): p in psia, T in deg F.
    var x = 7.916e-4 * Math.pow(api, 1.5410) - 4.561e-5 * Math.pow(tF, 1.3911);
    var inside = (pPsia / 112.727 + 12.340) * Math.pow(gg, 0.8439) * Math.pow(10, x);
    return Math.pow(Math.max(inside, 1e-12), 1.73184);
  }

  /* ------------------------------------------------------ pb correlations */

  function standingPb(rs, tF, api, gg) {
    return 18.2 * (Math.pow(rs / gg, 0.83) * Math.pow(10, 0.00091 * tF - 0.0125 * api) - 1.4);
  }

  function vbPb(rs, tF, api, gg) {
    // Keep the same lecture basis used in Rs implementation (T in deg R = T_F + 460).
    var tR = tF + 460;
    var c1 = api <= 30 ? 0.0362 : 0.0178;
    var c2 = api <= 30 ? 1.0937 : 1.187;
    var c3 = api <= 30 ? 25.724 : 23.931;
    var base = rs / (c1 * gg * Math.exp((c3 * api) / tR));
    return Math.pow(base, 1 / c2);
  }

  function glasoPb(rs, tF, api, gg) {
    var pbStar = Math.pow(rs / Math.max(gg, 1e-12), 0.816) * (Math.pow(Math.max(tF, 1e-12), 0.172) / Math.pow(Math.max(api, 1e-12), 0.989));
    var logStar = Math.log10(Math.max(pbStar, 1e-12));
    return Math.pow(10, 1.7669 + 1.7447 * logStar - 0.30218 * logStar * logStar);
  }

  function marhounPb(rs, tF, api, gg) {
    // Marhoun (1988) bubble-point pressure correlation.
    var go = 141.5 / (api + 131.5);
    var tR = tF + 460;
    return 5.38088e-3
      * Math.pow(Math.max(rs, 1e-12), 0.715082)
      * Math.pow(Math.max(gg, 1e-12), -1.87784)
      * Math.pow(Math.max(go, 1e-12), 3.1437)
      * Math.pow(Math.max(tR, 1e-12), 1.32657);
  }

  function petroskyFarshadPb(rs, tF, api, gg) {
    // Inverse form of Petrosky-Farshad Rs correlation (slide 138-139 workflow).
    var x = 7.916e-4 * Math.pow(api, 1.5410) - 4.561e-5 * Math.pow(tF, 1.3911);
    var rsPow = Math.pow(Math.max(rs, 1e-12), 1 / 1.73184);
    var denom = Math.pow(Math.max(gg, 1e-12), 0.8439) * Math.pow(10, x);
    return 112.727 * (rsPow / Math.max(denom, 1e-12) - 12.340);
  }

  /* ------------------------------------------------------ Bo correlations */

  function standingBo(rs, tF, api, gg) {
    var rsSafe = Math.max(rs, 0);
    var tFSafe = Math.max(tF, 0);
    var ggSafe = Math.max(gg, 1e-12);
    var go = 141.5 / (Math.max(api, 1e-12) + 131.5);
    var term = rsSafe * Math.sqrt(ggSafe / go) + 1.25 * tFSafe;
    return 0.9759 + 0.00012 * Math.pow(term, 1.2);
  }

  function vbBo(rs, tF, api, ggSep) {
    // Vasquez-Beggs (1980) Bo at bubble-point pressure.
    var rsSafe = Math.max(rs, 0);
    var tFSafe = Math.max(tF, 0);
    var ggSepSafe = Math.max(ggSep, 1e-12);
    var apiSafe = Math.max(api, 1e-12);
    var c1 = api <= 30 ? 4.677e-4 : 4.67e-4;
    var c2 = api <= 30 ? 1.751e-5 : 1.1e-5;
    var c3 = api <= 30 ? -1.811e-8 : 1.337e-9;
    var ratio = apiSafe / ggSepSafe;
    return 1 + c1 * rsSafe + (tFSafe - 60) * ratio * (c2 + c3 * rsSafe);
  }

  function glasoBo(rs, tF, api, gg) {
    // Glaso (1980) Bo at bubble-point pressure.
    var rsSafe = Math.max(rs, 0);
    var tFSafe = Math.max(tF, 0);
    var ggSafe = Math.max(gg, 1e-12);
    var go = 141.5 / (Math.max(api, 1e-12) + 131.5);
    var boStar = rsSafe * Math.pow(Math.max(ggSafe / Math.max(go, 1e-12), 1e-12), 0.526) + 0.968 * tFSafe;
    var logStar = Math.log10(Math.max(boStar, 1e-12));
    return 1 + Math.pow(10, -6.58511 + 2.91329 * logStar - 0.27683 * logStar * logStar);
  }

  function marhounBo(rs, tF, api, gg) {
    // Marhoun (1988) Bo at bubble-point pressure.
    // Lecture basis uses absolute temperature in Rankine in this form.
    var tR = Math.max(tF + 460, 1e-12);
    var go = 141.5 / (Math.max(api, 1e-12) + 131.5);
    var f = Math.pow(Math.max(rs, 1e-12), 0.74239)
      * Math.pow(Math.max(gg, 1e-12), 0.323294)
      * Math.pow(Math.max(go, 1e-12), -1.20204);
    return 0.497069 + 8.62963e-4 * tR + 1.82594e-3 * f + 3.18099e-6 * f * f;
  }

  function petroskyFarshadBo(rs, tF, api, gg) {
    // Petrosky-Farshad (1993) Bo at bubble-point pressure.
    var rsSafe = Math.max(rs, 1e-12);
    var tFSafe = Math.max(tF, 1e-12);
    var ggSafe = Math.max(gg, 1e-12);
    var go = 141.5 / (Math.max(api, 1e-12) + 131.5);
    var term = Math.pow(rsSafe, 0.3738)
      * (Math.pow(ggSafe, 0.2914) / Math.pow(Math.max(go, 1e-12), 0.6265))
      + 0.24626 * Math.pow(tFSafe, 0.5371);
    return 1.0113 + 7.2046e-5 * Math.pow(term, 3.0936);
  }

  function materialBalanceBo(rs, api, gg, rhoOil) {
    // Material-balance Bo from mass conservation:
    // Bo = (62.4*gamma_o + 0.0136*Rs*gamma_g) / rho_o
    // where rho_o is reservoir oil density, lb/ft^3.
    if (!Number.isFinite(rhoOil) || rhoOil <= 0) return NaN;
    var go = 141.5 / (api + 131.5);
    return (62.4 * go + 0.0136 * rs * gg) / rhoOil;
  }

  /* ----------------------------------------------- viscosity correlations */

  function deadOilViscosityBeal(tF, api) {
    var a = Math.pow(10, 0.43 + 8.33 / api);
    return (0.32 + 1.8e7 / Math.pow(api, 4.53)) * Math.pow(360 / (tF + 200), a);
  }

  function deadOilViscosityBeggsRobinson(tF, api) {
    var z = 3.0324 - 0.02023 * api;
    var y = Math.pow(10, z);
    var x = y * Math.pow(Math.max(tF, 1e-12), -1.163);
    return Math.pow(10, x) - 1;
  }

  function deadOilViscosityGlaso(tF, api) {
    var t = Math.max(tF, 1e-12);
    var logApi = Math.log10(Math.max(api, 1e-12));
    var exponent = 10.313 * Math.log10(t) - 36.447;
    return 3.141e10 * Math.pow(t, -3.444) * Math.pow(logApi, exponent);
  }

  function deadOilViscosityByMethod(tF, api, method) {
    if (method === 'beggs_robinson') return deadOilViscosityBeggsRobinson(tF, api);
    if (method === 'glaso') return deadOilViscosityGlaso(tF, api);
    return deadOilViscosityBeal(tF, api);
  }

  function satOilViscosityBeggs(muDead, rs) {
    var a = 10.715 * Math.pow(rs + 100, -0.515);
    var b = 5.44 * Math.pow(rs + 150, -0.338);
    return a * Math.pow(muDead, b);
  }

  function underSatViscosityVb(muSat, p, pb) {
    if (p <= pb) return muSat;
    var m = 2.6 * Math.pow(p, 1.187) * Math.exp(-11.513 - 8.98e-5 * p);
    return muSat * Math.pow(p / pb, m);
  }

  function satOilViscosityByMethod(muDead, rs, method) {
    // Current lecture implementation for saturated oil viscosity.
    if (method === 'beggs_robinson') return satOilViscosityBeggs(muDead, rs);
    return satOilViscosityBeggs(muDead, rs);
  }

  function underSatViscosityByMethod(muSat, p, pb, method) {
    // Current lecture implementation for undersaturated oil viscosity.
    if (method === 'vasquez_beggs') return underSatViscosityVb(muSat, p, pb);
    return underSatViscosityVb(muSat, p, pb);
  }

  global.__OilCalcCore = {
    standingRs: standingRs, vbRs: vbRs, glasoRs: glasoRs, marhounRs: marhounRs, petroskyFarshadRs: petroskyFarshadRs,
    standingPb: standingPb, vbPb: vbPb, glasoPb: glasoPb, marhounPb: marhounPb, petroskyFarshadPb: petroskyFarshadPb,
    standingBo: standingBo, vbBo: vbBo, glasoBo: glasoBo, marhounBo: marhounBo, petroskyFarshadBo: petroskyFarshadBo,
    materialBalanceBo: materialBalanceBo
  };

  /* ------------------------------------------------------- batch parsing */

  function parseOilEvaluationRows(text) {
    var lines = text.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!lines.length) return [];

    var rows = [];
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var cols = line.indexOf('|') !== -1
        ? line.split('|').map(function (s) { return s.trim(); }).filter(Boolean)
        : line.split(/\t|,|;/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (cols.length < 5) continue;
      if (cols.every(function (c) { return /^:?-{2,}:?$/.test(c); })) continue;

      // Layout A (example table): Oil, T, pb, Rs_exp, ... , API, gg
      // Layout B (minimal): T, pb, Rs_exp, API, gg
      var parseNum = function (v) {
        var cleaned = String(v).replace(/[^0-9.+-]/g, '');
        if (!cleaned || cleaned === '+' || cleaned === '-' || cleaned === '.' || cleaned === '+.' || cleaned === '-.') return NaN;
        return Number(cleaned);
      };
      var tF, pbPsig, rsExp, boExp = NaN, rhoExp = NaN, api, gg, psep = NaN, tsep = NaN;
      if (cols.length >= 10) {
        tF = parseNum(cols[1]);
        pbPsig = parseNum(cols[2]);
        rsExp = parseNum(cols[3]);
        boExp = parseNum(cols[4]);
        rhoExp = parseNum(cols[5]);
        psep = parseNum(cols[cols.length - 4]);
        tsep = parseNum(cols[cols.length - 3]);
        api = parseNum(cols[cols.length - 2]);
        gg = parseNum(cols[cols.length - 1]);
      } else {
        tF = parseNum(cols[0]);
        pbPsig = parseNum(cols[1]);
        rsExp = parseNum(cols[2]);
        api = parseNum(cols[3]);
        gg = parseNum(cols[4]);
      }
      if (![tF, pbPsig, rsExp, api, gg].every(Number.isFinite)) continue;
      if (tF <= 0 || pbPsig <= 0 || rsExp <= 0 || api <= 0 || gg <= 0) continue;

      var pbPsia = pbPsig + 14.7;
      var tR = tF + 460;
      var go = 141.5 / (api + 131.5);
      var rsStanding = standingRs(pbPsia, tF, api, gg);
      var vbGammaGs = Number.isFinite(psep) && Number.isFinite(tsep) && psep >= 0
        ? gg * (1 + 5.912e-5 * api * tsep * Math.log10((psep + 14.7) / 114.7))
        : gg;
      var rsVB = vbRs(pbPsia, tF, api, vbGammaGs);
      var glasoX = 2.8869 - Math.sqrt(Math.max(14.1811 - 3.3093 * Math.log10(Math.max(pbPsia, 1e-6)), 1e-12));
      var glasoA = Math.pow(10, glasoX);
      var tTermF = Math.max(tF, 1e-6);
      var rsGlaso = gg * Math.pow((Math.pow(api, 0.989) / Math.pow(tTermF, 0.172)) * glasoA, 1.2255);
      var rsMarhoun = marhounRs(pbPsia, tF, api, gg);
      var pfX = 7.916e-4 * Math.pow(api, 1.5410) - 4.561e-5 * Math.pow(tF, 1.3911);
      var pfTenPowX = Math.pow(10, pfX);
      var rsPF = petroskyFarshadRs(pbPsia, tF, api, gg);
      var xStanding = 0.0125 * api - 0.00091 * tF;
      var tenPowXStanding = Math.pow(10, xStanding);
      var pbStandingTerm = Math.pow(rsExp / gg, 0.83) * Math.pow(10, 0.00091 * tF - 0.0125 * api);
      var pbStandingPred = 18.2 * (pbStandingTerm - 1.4);
      var vbTR = tF + 460;
      var vbApiGroup = api <= 30 ? '<=30 API' : '>30 API';
      var vbC1 = api <= 30 ? 0.0362 : 0.0178;
      var vbC2 = api <= 30 ? 1.0937 : 1.187;
      var vbC3 = api <= 30 ? 25.724 : 23.931;
      var pbVBBase = rsExp / (vbC1 * vbGammaGs * Math.exp((vbC3 * api) / vbTR));
      var pbVBPred = Math.pow(Math.max(pbVBBase, 1e-12), 1 / vbC2);
      var pbGlasoStar = Math.pow(rsExp / Math.max(gg, 1e-12), 0.816) * (Math.pow(tF, 0.172) / Math.pow(api, 0.989));
      var pbGlasoLogStar = Math.log10(Math.max(pbGlasoStar, 1e-12));
      var pbGlasoPred = Math.pow(10, 1.7669 + 1.7447 * pbGlasoLogStar - 0.30218 * Math.pow(pbGlasoLogStar, 2));
      var pbMarhounPred = marhounPb(rsExp, tF, api, gg);
      var pbPFX = 7.916e-4 * Math.pow(api, 1.5410) - 4.561e-5 * Math.pow(tF, 1.3911);
      var pbPFTenPowX = Math.pow(10, pbPFX);
      var pbPFRsPow = Math.pow(rsExp, 1 / 1.73184);
      var pbPFPred = petroskyFarshadPb(rsExp, tF, api, gg);
      var boStandingPred = standingBo(rsExp, tF, api, gg);
      var boVBPred = vbBo(rsExp, tF, api, vbGammaGs);
      var boGlasoPred = glasoBo(rsExp, tF, api, gg);
      var boMarhounPred = marhounBo(rsExp, tF, api, gg);
      var boPFPred = petroskyFarshadBo(rsExp, tF, api, gg);
      var boMBPred = materialBalanceBo(rsExp, api, gg, rhoExp);
      var err = function (v) { return rsExp !== 0 ? Math.abs((v - rsExp) / rsExp) * 100 : NaN; };
      var errSigned = function (v) { return rsExp !== 0 ? ((v - rsExp) / rsExp) * 100 : NaN; };
      var errPb = function (v) { return pbPsia !== 0 ? Math.abs((v - pbPsia) / pbPsia) * 100 : NaN; };
      var errPbSigned = function (v) { return pbPsia !== 0 ? ((v - pbPsia) / pbPsia) * 100 : NaN; };
      var errBo = function (v) { return (Number.isFinite(boExp) && boExp !== 0) ? Math.abs((v - boExp) / boExp) * 100 : NaN; };
      rows.push({
        tF: tF, tR: tR, go: go, pbPsig: pbPsig, pbPsia: pbPsia, rsExp: rsExp, boExp: boExp, rhoExp: rhoExp, api: api, gg: gg,
        pfX: pfX, pfTenPowX: pfTenPowX,
        pbStandingTerm: pbStandingTerm, pbStandingPred: pbStandingPred, pbVBBase: pbVBBase, pbVBPred: pbVBPred,
        pbGlasoStar: pbGlasoStar, pbGlasoLogStar: pbGlasoLogStar, pbGlasoPred: pbGlasoPred, pbMarhounPred: pbMarhounPred,
        pbPFX: pbPFX, pbPFTenPowX: pbPFTenPowX, pbPFRsPow: pbPFRsPow, pbPFPred: pbPFPred,
        boStandingPred: boStandingPred, boVBPred: boVBPred, boGlasoPred: boGlasoPred, boMarhounPred: boMarhounPred,
        boPFPred: boPFPred, boMBPred: boMBPred,
        vbApiGroup: vbApiGroup, vbPbC1: vbC1, vbPbC2: vbC2, vbPbC3: vbC3,
        xStanding: xStanding, tenPowXStanding: tenPowXStanding, glasoX: glasoX, glasoA: glasoA,
        vbGammaGs: vbGammaGs, rsStanding: rsStanding, rsVB: rsVB, rsGlaso: rsGlaso, rsMarhoun: rsMarhoun, rsPF: rsPF,
        errExp: 0,
        errStanding: err(rsStanding),
        errVB: err(rsVB),
        errVBsigned: errSigned(rsVB),
        errGlaso: err(rsGlaso),
        errGlasoSigned: errSigned(rsGlaso),
        errMarhoun: err(rsMarhoun),
        errMarhounSigned: errSigned(rsMarhoun),
        errPF: err(rsPF),
        errPFsigned: errSigned(rsPF),
        errPbStanding: errPb(pbStandingPred),
        errPbStandingSigned: errPbSigned(pbStandingPred),
        errPbVB: errPb(pbVBPred),
        errPbVBsigned: errPbSigned(pbVBPred),
        errPbGlaso: errPb(pbGlasoPred),
        errPbGlasoSigned: errPbSigned(pbGlasoPred),
        errPbMarhoun: errPb(pbMarhounPred),
        errPbMarhounSigned: errPbSigned(pbMarhounPred),
        errPbPF: errPb(pbPFPred),
        errPbPFsigned: errPbSigned(pbPFPred),
        errBoStanding: errBo(boStandingPred),
        errBoVB: errBo(boVBPred),
        errBoGlaso: errBo(boGlasoPred),
        errBoMarhoun: errBo(boMarhounPred),
        errBoPF: errBo(boPFPred),
        errBoMB: errBo(boMBPred)
      });
    }
    return rows;
  }

  function parseOilViscosityRows(text) {
    var lines = text.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!lines.length) return [];
    var rows = [];
    var parseNum = function (v) {
      var cleaned = String(v).replace(/[^0-9.+-]/g, '');
      if (!cleaned || cleaned === '+' || cleaned === '-' || cleaned === '.' || cleaned === '+.' || cleaned === '-.') return NaN;
      return Number(cleaned);
    };
    var deadMethod = ($('o-mu-dead-method') && $('o-mu-dead-method').value) || 'beal';
    var satMethod = ($('o-mu-sat-method') && $('o-mu-sat-method').value) || 'beggs_robinson';
    var undMethod = ($('o-mu-und-method') && $('o-mu-und-method').value) || 'vasquez_beggs';
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var cols = line.indexOf('|') !== -1
        ? line.split('|').map(function (s) { return s.trim(); }).filter(Boolean)
        : line.split(/\t|,|;/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (cols.length < 5) continue;
      if (cols.every(function (c) { return /^:?-{2,}:?$/.test(c); })) continue;
      var tF, pbPsig, rsExp, api, gg, muExp = NaN;
      if (cols.length >= 11 && Number.isFinite(parseNum(cols[8])) && Number.isFinite(parseNum(cols[9]))) {
        tF = parseNum(cols[1]);
        pbPsig = parseNum(cols[2]);
        rsExp = parseNum(cols[3]);
        api = parseNum(cols[8]);
        gg = parseNum(cols[9]);
        muExp = parseNum(cols[10]);
      } else {
        var hasOilId = Number.isFinite(parseNum(cols[0])) && parseNum(cols[0]) <= 50 && cols.length >= 6;
        var offset = hasOilId ? 1 : 0;
        tF = parseNum(cols[offset + 0]);
        pbPsig = parseNum(cols[offset + 1]);
        rsExp = parseNum(cols[offset + 2]);
        api = parseNum(cols[offset + 3]);
        gg = parseNum(cols[offset + 4]);
        muExp = parseNum(cols[offset + 5]);
      }
      if (![tF, pbPsig, rsExp, api, gg].every(Number.isFinite)) continue;
      var pbPsia = pbPsig + 14.7;
      var pInput = toNum('pressure');
      var pForUnd = Number.isFinite(pInput) && pInput > 0 ? pInput : pbPsia;
      var muDeadPred = deadOilViscosityByMethod(tF, api, deadMethod);
      var muSatPred = satOilViscosityByMethod(muDeadPred, rsExp, satMethod);
      var muUndPred = underSatViscosityByMethod(muSatPred, pForUnd, pbPsia, undMethod);
      var err = function (v) { return (Number.isFinite(muExp) && muExp !== 0) ? Math.abs((v - muExp) / muExp) * 100 : NaN; };
      rows.push({
        tF: tF, pbPsig: pbPsig, pbPsia: pbPsia, rsExp: rsExp, api: api, gg: gg, muExp: muExp, pForUnd: pForUnd,
        muDeadPred: muDeadPred, muSatPred: muSatPred, muUndPred: muUndPred,
        errMuDead: err(muDeadPred),
        errMuSat: err(muSatPred),
        errMuUnd: err(muUndPred)
      });
    }
    return rows;
  }

  /* ---------------------------------------------------------- table render */

  function mean(rows, pick) {
    var vals = rows.map(pick).filter(Number.isFinite);
    return vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : NaN;
  }

  function setTxt(id, v, d) {
    var el = $(id);
    if (el) el.textContent = Number.isFinite(v) ? round(v, d === undefined ? 4 : d) : '-';
  }

  function fill(bodyId, rows, rowHtml) {
    var body = $(bodyId);
    if (!body) return false;
    body.innerHTML = '';
    if (!rows.length) {
      var tr0 = document.createElement('tr');
      tr0.className = 'oc-empty';
      var span = body.closest('table').querySelectorAll('thead th').length || 1;
      tr0.innerHTML = '<td colspan="' + span + '">No data — paste a table above and press Evaluate.</td>';
      body.appendChild(tr0);
      return true;
    }
    rows.forEach(function (r, idx) {
      var tr = document.createElement('tr');
      tr.innerHTML = rowHtml(r, idx);
      body.appendChild(tr);
    });
    return true;
  }

  function renderOilRsEvaluation(rows) {
    var cell = function (rs, err) { return (Number.isFinite(rs) && Number.isFinite(err)) ? (round(rs, 3) + ' | ' + round(err, 3) + '%') : '-'; };
    fill('oRsEvalBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td>'
        + '<td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.pbPsig, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td>'
        + '<td>' + round(r.gg, 5) + '</td>'
        + '<td>' + cell(r.rsExp, r.errExp) + '</td>'
        + '<td>' + cell(r.rsStanding, r.errStanding) + '</td>'
        + '<td>' + cell(r.rsVB, r.errVB) + '</td>'
        + '<td>' + cell(r.rsGlaso, r.errGlaso) + '</td>'
        + '<td>' + cell(r.rsMarhoun, r.errMarhoun) + '</td>'
        + '<td>' + cell(r.rsPF, r.errPF) + '</td>';
    });
    var aaes = {
      experimental_pvt: mean(rows, function (r) { return r.errExp; }),
      standing: mean(rows, function (r) { return r.errStanding; }),
      vasquez_beggs: mean(rows, function (r) { return r.errVB; }),
      glaso: mean(rows, function (r) { return r.errGlaso; }),
      marhoun: mean(rows, function (r) { return r.errMarhoun; }),
      petrosky_farshad: mean(rows, function (r) { return r.errPF; })
    };
    setTxt('o_rs_aae_exp', aaes.experimental_pvt);
    setTxt('o_rs_aae_st', aaes.standing);
    setTxt('o_rs_aae_vb', aaes.vasquez_beggs);
    setTxt('o_rs_aae_gl', aaes.glaso);
    setTxt('o_rs_aae_mh', aaes.marhoun);
    setTxt('o_rs_aae_pf', aaes.petrosky_farshad);
    state.oilRsEval = { rows: rows, aaes: aaes };
  }

  function renderOilRsStandingDetail(rows) {
    fill('oRsStandingBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.tF, 3) + '</td><td>' + round(r.api, 3) + '</td>'
        + '<td>' + round(r.xStanding, 3) + '</td><td>' + round(r.tenPowXStanding, 3) + '</td>'
        + '<td>' + round(r.rsStanding, 3) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.errStanding, 3) + '</td>';
    });
    setTxt('o_rs_standing_aae', mean(rows, function (r) { return r.errStanding; }));
  }

  function renderOilRsVbDetail(rows) {
    fill('oRsVbBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.vbGammaGs, 4) + '</td><td>' + round(r.rsVB, 3) + '</td>'
        + '<td>' + round(r.rsExp, 3) + '</td><td>' + round(r.errVBsigned, 3) + '</td>';
    });
    setTxt('o_rs_vb_aae', mean(rows, function (r) { return Math.abs(r.errVBsigned); }));
  }

  function renderOilRsGlasoDetail(rows) {
    fill('oRsGlasoBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.glasoX, 3) + '</td>'
        + '<td>' + round(r.glasoA, 3) + '</td><td>' + round(r.rsGlaso, 3) + '</td><td>' + round(r.rsExp, 3) + '</td>'
        + '<td>' + round(r.errGlasoSigned, 3) + '</td>';
    });
    setTxt('o_rs_glaso_aae', mean(rows, function (r) { return Math.abs(r.errGlasoSigned); }));
  }

  function renderOilRsMarhounDetail(rows) {
    fill('oRsMarhounBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.go, 5) + '</td>'
        + '<td>' + round(r.tR, 3) + '</td><td>' + round(r.rsMarhoun, 3) + '</td><td>' + round(r.rsExp, 3) + '</td>'
        + '<td>' + round(r.errMarhounSigned, 3) + '</td>';
    });
    setTxt('o_rs_marhoun_aae', mean(rows, function (r) { return Math.abs(r.errMarhounSigned); }));
  }

  function renderOilRsPfDetail(rows) {
    fill('oRsPfBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.pfX, 5) + '</td>'
        + '<td>' + round(r.pfTenPowX, 5) + '</td><td>' + round(r.rsPF, 3) + '</td><td>' + round(r.rsExp, 3) + '</td>'
        + '<td>' + round(r.errPFsigned, 3) + '</td>';
    });
    setTxt('o_rs_pf_aae', mean(rows, function (r) { return Math.abs(r.errPFsigned); }));
  }

  function renderOilRsExperimentalDetail(rows) {
    fill('oRsExpBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.pbPsig, 3) + '</td><td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.rsExp, 3) + '</td><td>' + round(r.rsExp, 3) + '</td><td>0.000</td>';
    });
    if ($('o_rs_exp_aae')) $('o_rs_exp_aae').textContent = rows.length ? '0.0000' : '-';
  }

  function renderOilPbEvaluation(rows) {
    var cell = function (pb, err) { return (Number.isFinite(pb) && Number.isFinite(err)) ? (round(pb, 3) + ' | ' + round(err, 3) + '%') : '-'; };
    fill('oPbEvalBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.tF, 3) + '</td><td>' + round(r.pbPsia, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td>'
        + '<td>' + cell(r.pbStandingPred, r.errPbStanding) + '</td>'
        + '<td>' + cell(r.pbVBPred, r.errPbVB) + '</td>'
        + '<td>' + cell(r.pbGlasoPred, r.errPbGlaso) + '</td>'
        + '<td>' + cell(r.pbMarhounPred, r.errPbMarhoun) + '</td>'
        + '<td>' + cell(r.pbPFPred, r.errPbPF) + '</td>';
    });
    var st = mean(rows, function (r) { return r.errPbStanding; });
    var vb = mean(rows, function (r) { return r.errPbVB; });
    var gl = mean(rows, function (r) { return r.errPbGlaso; });
    var mh = mean(rows, function (r) { return r.errPbMarhoun; });
    var pf = mean(rows, function (r) { return r.errPbPF; });
    setTxt('o_pb_aae_st', st); setTxt('o_pb_aae_vb', vb); setTxt('o_pb_aae_glaso', gl);
    setTxt('o_pb_aae_marhoun', mh); setTxt('o_pb_aae_pf', pf);
    state.oilPbEval = { rows: rows, aaes: { standing: st, vasquez_beggs: vb, glaso: gl, marhoun: mh, petrosky_farshad: pf } };
  }

  function renderOilPbStandingDetail(rows) {
    fill('oPbStandingBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td><td>' + round(r.pbStandingTerm, 6) + '</td>'
        + '<td>' + round(r.pbStandingPred, 3) + '</td><td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.errPbStandingSigned, 3) + '</td>';
    });
    setTxt('o_pb_standing_aae', mean(rows, function (r) { return Math.abs(r.errPbStandingSigned); }));
  }

  function renderOilPbVbDetail(rows) {
    fill('oPbVbBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + r.vbApiGroup + '</td><td>' + round(r.vbGammaGs, 5) + '</td>'
        + '<td>' + round(r.vbPbC1, 6) + '</td><td>' + round(r.vbPbC2, 6) + '</td><td>' + round(r.vbPbC3, 6) + '</td>'
        + '<td>' + round(r.pbVBBase, 6) + '</td><td>' + round(r.pbVBPred, 3) + '</td><td>' + round(r.pbPsia, 3) + '</td>'
        + '<td>' + round(r.errPbVBsigned, 3) + '</td>';
    });
    setTxt('o_pb_vb_aae', mean(rows, function (r) { return Math.abs(r.errPbVBsigned); }));
  }

  function renderOilPbGlasoDetail(rows) {
    fill('oPbGlasoBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td><td>' + round(r.pbGlasoStar, 6) + '</td>'
        + '<td>' + round(r.pbGlasoLogStar, 6) + '</td><td>' + round(r.pbGlasoPred, 3) + '</td>'
        + '<td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.errPbGlasoSigned, 3) + '</td>';
    });
    setTxt('o_pb_glaso_aae', mean(rows, function (r) { return Math.abs(r.errPbGlasoSigned); }));
  }

  function renderOilPbMarhounDetail(rows) {
    fill('oPbMarhounBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.tR, 3) + '</td>'
        + '<td>' + round(r.go, 5) + '</td><td>' + round(r.gg, 5) + '</td><td>' + round(r.pbMarhounPred, 3) + '</td>'
        + '<td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.errPbMarhounSigned, 3) + '</td>';
    });
    setTxt('o_pb_marhoun_aae', mean(rows, function (r) { return Math.abs(r.errPbMarhounSigned); }));
  }

  function renderOilPbPfDetail(rows) {
    fill('oPbPfBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td><td>' + round(r.pbPFX, 6) + '</td>'
        + '<td>' + round(r.pbPFTenPowX, 6) + '</td><td>' + round(r.pbPFRsPow, 6) + '</td>'
        + '<td>' + round(r.pbPFPred, 3) + '</td><td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.errPbPFsigned, 3) + '</td>';
    });
    setTxt('o_pb_pf_aae', mean(rows, function (r) { return Math.abs(r.errPbPFsigned); }));
  }

  function renderOilBoEvaluation(rows) {
    var cell = function (bo, err) { return (Number.isFinite(bo) && Number.isFinite(err)) ? (round(bo, 5) + ' | ' + round(err, 3) + '%') : '-'; };
    fill('oBoEvalBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.tF, 3) + '</td><td>' + round(r.rsExp, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td>'
        + '<td>' + (Number.isFinite(r.rhoExp) ? round(r.rhoExp, 5) : '-') + '</td>'
        + '<td>' + (Number.isFinite(r.boExp) ? round(r.boExp, 5) : '-') + '</td>'
        + '<td>' + cell(r.boStandingPred, r.errBoStanding) + '</td>'
        + '<td>' + cell(r.boVBPred, r.errBoVB) + '</td>'
        + '<td>' + cell(r.boGlasoPred, r.errBoGlaso) + '</td>'
        + '<td>' + cell(r.boMarhounPred, r.errBoMarhoun) + '</td>'
        + '<td>' + cell(r.boPFPred, r.errBoPF) + '</td>'
        + '<td>' + cell(r.boMBPred, r.errBoMB) + '</td>';
    });
    var aaes = {
      standing: mean(rows, function (r) { return r.errBoStanding; }),
      vasquez_beggs: mean(rows, function (r) { return r.errBoVB; }),
      glaso: mean(rows, function (r) { return r.errBoGlaso; }),
      marhoun: mean(rows, function (r) { return r.errBoMarhoun; }),
      petrosky_farshad: mean(rows, function (r) { return r.errBoPF; }),
      material_balance: mean(rows, function (r) { return r.errBoMB; })
    };
    setTxt('o_bo_aae_st', aaes.standing);
    setTxt('o_bo_aae_vb', aaes.vasquez_beggs);
    setTxt('o_bo_aae_glaso', aaes.glaso);
    setTxt('o_bo_aae_marhoun', aaes.marhoun);
    setTxt('o_bo_aae_pf', aaes.petrosky_farshad);
    setTxt('o_bo_aae_mb', aaes.material_balance);
    state.oilBoEval = { rows: rows, aaes: aaes };
  }

  var BO_LABELS = {
    standing: 'Standing',
    vasquez_beggs: 'Vasquez-Beggs',
    glaso: 'Glaso',
    marhoun: 'Marhoun',
    petrosky_farshad: 'Petrosky-Farshad',
    material_balance: 'Material balance'
  };

  function renderOilBoDetail(rows) {
    var bom = ($('o-bo-method') && $('o-bo-method').value) || 'standing';
    var boValue = function (r) {
      return {
        standing: r.boStandingPred,
        vasquez_beggs: r.boVBPred,
        glaso: r.boGlasoPred,
        marhoun: r.boMarhounPred,
        petrosky_farshad: r.boPFPred,
        material_balance: r.boMBPred
      }[bom];
    };
    var boErr = function (r) {
      return {
        standing: r.errBoStanding,
        vasquez_beggs: r.errBoVB,
        glaso: r.errBoGlaso,
        marhoun: r.errBoMarhoun,
        petrosky_farshad: r.errBoPF,
        material_balance: r.errBoMB
      }[bom];
    };
    fill('oBoDetailBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + (BO_LABELS[bom] || bom) + '</td><td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td><td>' + round(r.rsExp, 3) + '</td>'
        + '<td>' + (Number.isFinite(boValue(r)) ? round(boValue(r), 5) : '-') + '</td>'
        + '<td>' + (Number.isFinite(r.boExp) ? round(r.boExp, 5) : '-') + '</td>'
        + '<td>' + (Number.isFinite(boErr(r)) ? round(boErr(r), 3) : '-') + '</td>';
    });
    setTxt('o_bo_detail_aae', mean(rows, boErr));
  }

  function renderOilMuEvaluation(rows) {
    var cell = function (mu, err) {
      return Number.isFinite(mu) ? (round(mu, 5) + (Number.isFinite(err) ? (' | ' + round(err, 3) + '%') : ' | -')) : '-';
    };
    fill('oMuEvalBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.tF, 3) + '</td><td>' + round(r.pbPsig, 3) + '</td>'
        + '<td>' + round(r.rsExp, 3) + '</td><td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td>'
        + '<td>' + (Number.isFinite(r.muExp) ? round(r.muExp, 5) : '-') + '</td>'
        + '<td>' + cell(r.muDeadPred, r.errMuDead) + '</td>'
        + '<td>' + cell(r.muSatPred, r.errMuSat) + '</td>'
        + '<td>' + cell(r.muUndPred, r.errMuUnd) + '</td>';
    });
    var aaes = {
      dead: mean(rows, function (r) { return r.errMuDead; }),
      saturated: mean(rows, function (r) { return r.errMuSat; }),
      undersaturated: mean(rows, function (r) { return r.errMuUnd; })
    };
    setTxt('o_mu_aae_dead', aaes.dead);
    setTxt('o_mu_aae_sat', aaes.saturated);
    setTxt('o_mu_aae_und', aaes.undersaturated);
    state.oilMuEval = { rows: rows, aaes: aaes };
  }

  var DEAD_LABELS = { beal: 'Beal', beggs_robinson: 'Beggs-Robinson', glaso: 'Glaso' };

  function renderOilMuDetail(rows) {
    var mum = ($('o-mu-method') && $('o-mu-method').value) || 'dead';
    var deadMethod = ($('o-mu-dead-method') && $('o-mu-dead-method').value) || 'beal';
    var deadLabel = DEAD_LABELS[deadMethod] || 'Beal';
    var methodLabel = {
      dead: 'Dead oil viscosity (' + deadLabel + ')',
      saturated: 'Saturated oil viscosity (dead from ' + deadLabel + ')',
      undersaturated: 'Undersaturated oil viscosity (dead from ' + deadLabel + ')'
    }[mum] || mum;
    var muValue = function (r) { return { dead: r.muDeadPred, saturated: r.muSatPred, undersaturated: r.muUndPred }[mum]; };
    var muErr = function (r) { return { dead: r.errMuDead, saturated: r.errMuSat, undersaturated: r.errMuUnd }[mum]; };
    fill('oMuDetailBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + methodLabel + '</td><td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.pbPsia, 3) + '</td>'
        + '<td>' + round(r.pForUnd, 3) + '</td>'
        + '<td>' + (Number.isFinite(muValue(r)) ? round(muValue(r), 5) : '-') + '</td>'
        + '<td>' + (Number.isFinite(r.muExp) ? round(r.muExp, 5) : '-') + '</td>'
        + '<td>' + (Number.isFinite(muErr(r)) ? round(muErr(r), 3) : '-') + '</td>';
    });
    setTxt('o_mu_detail_aae', mean(rows, muErr));
  }

  /* -------------------------------------------------------- main calculate */

  function calculateOil() {
    var rows = [];
    var p = toNum('pressure');
    var tF = rankineToFahrenheit(getTemperatureRankine());
    var gg = Number.isFinite(toNum('gasGravity')) ? toNum('gasGravity') : 0.75;
    var apiInput = Number.isFinite(toNum('api')) ? toNum('api') : 35;
    var rhoOil = Number.isFinite(toNum('oilDensity')) ? toNum('oilDensity') : 53.04;
    var sgOil = rhoOil / 62.4;
    var rsInput = Number.isFinite(toNum('rs')) ? toNum('rs') : 600;
    var pbInput = Number.isFinite(toNum('pb')) ? toNum('pb') : 2200;
    // Rs correlations require pressure; fallback to bubble-point pressure if common pressure is empty.
    var rsPressurePsia = (Number.isFinite(p) && p > 0) ? p : (pbInput + 14.7);
    if (!Number.isFinite(tF)) tF = 150;

    var api = apiInput;
    if ($('o-api').checked) {
      if ($('o-api-method').value === 'from_density') {
        api = 141.5 / sgOil - 131.5;
        addResult(rows, 'API gravity', round(api, 4), 'deg API', 'From oil density (ρo/62.4 → SG → API)');
      } else {
        addResult(rows, 'API gravity', round(apiInput, 4), 'deg API', 'User input');
      }
    } else if ($('o-api-method').value === 'from_density') {
      api = 141.5 / sgOil - 131.5;
    }

    var rs = rsInput;
    var rsm = $('o-rs-method').value;
    if (rsm === 'standing') rs = standingRs(rsPressurePsia, tF, api, gg);
    if (rsm === 'vasquez_beggs') rs = vbRs(rsPressurePsia, tF, api, gg);
    if (rsm === 'glaso') rs = glasoRs(rsPressurePsia, tF, api, gg);
    if (rsm === 'marhoun') rs = marhounRs(rsPressurePsia, tF, api, gg);
    if (rsm === 'petrosky_farshad') rs = petroskyFarshadRs(rsPressurePsia, tF, api, gg);
    if (rsm === 'experimental_pvt') rs = rsInput;
    if ($('o-rs').checked) {
      var rsMethodLabel = {
        standing: 'Standing (p in psia)',
        vasquez_beggs: 'Vasquez-Beggs (p in psia, T in deg R)',
        glaso: 'Glaso (p in psia)',
        marhoun: 'Marhoun (p in psia, T in deg R)',
        petrosky_farshad: 'Petrosky-Farshad (p in psia)',
        experimental_pvt: 'Experimental PVT (manual Rs input)'
      };
      addResult(rows, 'Gas solubility, Rs', round(rs, 4), 'scf/STB', rsMethodLabel[rsm] || rsm);
      var aaes = state.oilRsEval.aaes || {};
      if (Number.isFinite(aaes.standing)) addResult(rows, 'Standing Rs batch AAE', round(aaes.standing, 4), '%', 'From pasted Rs evaluation table');
      if (Number.isFinite(aaes.vasquez_beggs)) addResult(rows, 'Vasquez-Beggs Rs batch AAE', round(aaes.vasquez_beggs, 4), '%', 'From pasted Rs evaluation table');
      if (Number.isFinite(aaes.glaso)) addResult(rows, 'Glaso Rs batch AAE', round(aaes.glaso, 4), '%', 'Using current build method implementation');
      if (Number.isFinite(aaes.marhoun)) addResult(rows, 'Marhoun Rs batch AAE', round(aaes.marhoun, 4), '%', 'Using current build method implementation');
      if (Number.isFinite(aaes.petrosky_farshad)) addResult(rows, 'Petrosky-Farshad Rs batch AAE', round(aaes.petrosky_farshad, 4), '%', 'Using current build method implementation');
    }

    var pb = pbInput;
    var pbm = $('o-pb-method').value;
    if (pbm === 'standing') pb = standingPb(rs, tF, api, gg);
    if (pbm === 'vasquez_beggs') pb = vbPb(rs, tF, api, gg);
    if (pbm === 'glaso') pb = glasoPb(rs, tF, api, gg);
    if (pbm === 'marhoun') pb = marhounPb(rs, tF, api, gg);
    if (pbm === 'petrosky_farshad') pb = petroskyFarshadPb(rs, tF, api, gg);
    if (pbm === 'input') pb = pbInput;
    if ($('o-pb').checked) {
      var pbMethodLabel = {
        standing: 'Standing (inverse)',
        vasquez_beggs: 'Vasquez-Beggs (inverse)',
        glaso: 'Glaso',
        marhoun: 'Marhoun',
        petrosky_farshad: 'Petrosky-Farshad',
        input: 'User input'
      };
      addResult(rows, 'Bubble-point pressure, pb', round(pb, 4), 'psia', pbMethodLabel[pbm] || pbm);
      var pbAaes = state.oilPbEval.aaes || {};
      if (Number.isFinite(pbAaes.standing)) addResult(rows, 'Standing pb batch AAE', round(pbAaes.standing, 4), '%', 'From pasted BVT table');
      if (Number.isFinite(pbAaes.vasquez_beggs)) addResult(rows, 'Vasquez-Beggs pb batch AAE', round(pbAaes.vasquez_beggs, 4), '%', 'From pasted BVT table');
      if (Number.isFinite(pbAaes.glaso)) addResult(rows, 'Glaso pb batch AAE', round(pbAaes.glaso, 4), '%', 'From pasted BVT table');
      if (Number.isFinite(pbAaes.marhoun)) addResult(rows, 'Marhoun pb batch AAE', round(pbAaes.marhoun, 4), '%', 'From pasted BVT table');
      if (Number.isFinite(pbAaes.petrosky_farshad)) addResult(rows, 'Petrosky-Farshad pb batch AAE', round(pbAaes.petrosky_farshad, 4), '%', 'From pasted BVT table');
    }

    if ($('o-bo').checked) {
      var bom = ($('o-bo-method') && $('o-bo-method').value) || 'standing';
      var bo = standingBo(rs, tF, api, gg);
      if (bom === 'vasquez_beggs') bo = vbBo(rs, tF, api, gg);
      if (bom === 'glaso') bo = glasoBo(rs, tF, api, gg);
      if (bom === 'marhoun') bo = marhounBo(rs, tF, api, gg);
      if (bom === 'petrosky_farshad') bo = petroskyFarshadBo(rs, tF, api, gg);
      if (bom === 'material_balance') bo = materialBalanceBo(rs, api, gg, rhoOil);
      var boMethodLabel = {
        standing: 'Standing',
        vasquez_beggs: 'Vasquez-Beggs',
        glaso: 'Glaso',
        marhoun: 'Marhoun (T in deg R)',
        petrosky_farshad: 'Petrosky-Farshad',
        material_balance: 'Material balance'
      };
      addResult(rows, 'Oil FVF, Bo', round(bo, 5), 'rb/STB', boMethodLabel[bom] || bom);
      var boAaes = state.oilBoEval.aaes || {};
      if (Number.isFinite(boAaes.standing)) addResult(rows, 'Standing Bo batch AAE', round(boAaes.standing, 4), '%', 'From pasted BVT table');
      if (Number.isFinite(boAaes.vasquez_beggs)) addResult(rows, 'Vasquez-Beggs Bo batch AAE', round(boAaes.vasquez_beggs, 4), '%', 'From pasted BVT table');
      if (Number.isFinite(boAaes.glaso)) addResult(rows, 'Glaso Bo batch AAE', round(boAaes.glaso, 4), '%', 'From pasted BVT table');
      if (Number.isFinite(boAaes.marhoun)) addResult(rows, 'Marhoun Bo batch AAE', round(boAaes.marhoun, 4), '%', 'From pasted BVT table');
      if (Number.isFinite(boAaes.petrosky_farshad)) addResult(rows, 'Petrosky-Farshad Bo batch AAE', round(boAaes.petrosky_farshad, 4), '%', 'From pasted BVT table');
      if (Number.isFinite(boAaes.material_balance)) addResult(rows, 'Material-balance Bo batch AAE', round(boAaes.material_balance, 4), '%', 'From pasted BVT table');
    }

    if ($('o-mu').checked) {
      var mum = ($('o-mu-method') && $('o-mu-method').value) || 'dead';
      var muDeadMethod = ($('o-mu-dead-method') && $('o-mu-dead-method').value) || 'beal';
      var muSatMethod = ($('o-mu-sat-method') && $('o-mu-sat-method').value) || 'beggs_robinson';
      var muUndMethod = ($('o-mu-und-method') && $('o-mu-und-method').value) || 'vasquez_beggs';
      var pForUnd = (Number.isFinite(p) && p > 0) ? p : pb;
      var muDead = deadOilViscosityByMethod(tF, api, muDeadMethod);
      var muSat = satOilViscosityByMethod(muDead, rs, muSatMethod);
      var muUnd = underSatViscosityByMethod(muSat, pForUnd, pb, muUndMethod);
      var deadLabel = DEAD_LABELS[muDeadMethod] || 'Beal';
      var satLabel = { beggs_robinson: 'Beggs-Robinson' }[muSatMethod] || 'Beggs-Robinson';
      var undLabel = { vasquez_beggs: 'Vazquez-Beggs' }[muUndMethod] || 'Vazquez-Beggs';
      if (mum === 'dead') addResult(rows, 'Oil viscosity, μo', round(muDead, 5), 'cP', 'Dead oil (' + deadLabel + ')');
      if (mum === 'saturated') addResult(rows, 'Oil viscosity, μo', round(muSat, 5), 'cP', 'Saturated oil (' + satLabel + ', dead from ' + deadLabel + ')');
      if (mum === 'undersaturated') addResult(rows, 'Oil viscosity, μo', round(muUnd, 5), 'cP', 'Undersaturated oil (' + undLabel + ', dead from ' + deadLabel + ')');
    }

    return rows;
  }

  var KEY_PROPS = ['API gravity', 'Gas solubility, Rs', 'Bubble-point pressure, pb', 'Oil FVF, Bo', 'Oil viscosity, μo'];

  function renderResults(rows) {
    var body = $('resultsBody');
    var meta = $('resultMeta');
    var tiles = $('resultTiles');
    if (!body) return;
    body.innerHTML = '';
    if (tiles) tiles.innerHTML = '';
    if (!rows.length) {
      meta.textContent = 'No properties selected.';
      body.innerHTML = '<tr class="oc-empty"><td colspan="4">Select at least one property.</td></tr>';
      return;
    }
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      if (KEY_PROPS.indexOf(row.property) !== -1) tr.className = 'is-key';
      tr.innerHTML = '<td>' + row.property + '</td><td class="oc-num">' + row.value + '</td><td class="oc-unit">'
        + row.unit + '</td><td class="oc-method">' + row.method + '</td>';
      body.appendChild(tr);
    });
    if (tiles) {
      rows.filter(function (r) { return KEY_PROPS.indexOf(r.property) !== -1; }).forEach(function (r) {
        var d = document.createElement('div');
        d.className = 'oc-tile';
        d.innerHTML = '<span class="oc-tile-lbl">' + r.property + '</span>'
          + '<span class="oc-tile-val">' + r.value + '</span>'
          + '<span class="oc-tile-unit">' + r.unit + '</span>';
        tiles.appendChild(d);
      });
    }
    meta.textContent = 'Calculated ' + rows.length + ' propert' + (rows.length > 1 ? 'ies' : 'y') + ' — oil mode.';
  }

  function calculate() {
    syncPanels();
    renderResults(calculateOil());
    if ($('pressure')) snapshot = capture();
  }

  /* ------------------------------------------------------------- markup */

  function th(cols) {
    return cols.map(function (c) { return '<th>' + c + '</th>'; }).join('');
  }

  function tbl(cols, bodyId, foot) {
    return '<div class="oc-tablewrap"><table><thead><tr>' + th(cols) + '</tr></thead>'
      + '<tbody id="oc-' + bodyId + '"></tbody>'
      + (foot ? '<tfoot><tr><td colspan="' + cols.length + '">' + foot + '</td></tr></tfoot>' : '')
      + '</table></div>';
  }

  function detail(id, title, cols, bodyId, foot) {
    return '<div class="oc-detail" id="oc-' + id + '"><h4>' + title + '</h4>' + tbl(cols, bodyId, foot) + '</div>';
  }

  function pasteBlock(id, btnId, btnLabel, hint, placeholder) {
    return '<div class="oc-paste">'
      + '<label class="oc-field oc-field-wide"><span>' + hint + '</span>'
      + '<textarea id="oc-' + id + '" rows="4" spellcheck="false" placeholder="' + placeholder + '"></textarea></label>'
      + '<button type="button" class="oc-btn oc-btn-ghost" id="oc-' + btnId + '">' + btnLabel + '</button>'
      + '</div>';
  }

  var PH_BVT = 'Oil&#9;T&#9;pb&#9;Rs_exp&#9;Bo&#9;rho&#9;psep&#9;Tsep&#9;API&#9;gg&#10;1&#9;250&#9;2377&#9;751&#9;1.528&#9;38.13&#9;150&#9;60&#9;47.1&#9;0.851';
  var PH_MU = 'Oil&#9;T&#9;pb&#9;Rs_exp&#9;Bo&#9;rho&#9;psep&#9;Tsep&#9;API&#9;gg&#9;mu_exp&#10;1&#9;250&#9;2377&#9;751&#9;1.528&#9;38.13&#9;150&#9;60&#9;47.1&#9;0.851&#9;0.62';

  function inputsHtml() {
    return ''
      + '<label class="oc-field"><span>Pressure, p <em>psia</em></span><input id="oc-pressure" type="number" step="any" placeholder="e.g. 2500"></label>'
      + '<label class="oc-field"><span>Temperature, T</span><input id="oc-temperature" type="number" step="any" placeholder="e.g. 250"></label>'
      + '<label class="oc-field"><span>Temperature unit</span><select id="oc-temperatureUnit">'
      + '<option value="F" selected>Fahrenheit (&deg;F)</option><option value="R">Rankine (&deg;R)</option>'
      + '<option value="C">Celsius (&deg;C)</option><option value="K">Kelvin (K)</option></select></label>'
      + '<label class="oc-field"><span>Gas specific gravity, &gamma;g <em>air = 1</em></span><input id="oc-gasGravity" type="number" step="any" placeholder="default 0.75"></label>'
      + '<label class="oc-field"><span>Oil density, &rho;o <em>lb/ft&sup3;</em></span><input id="oc-oilDensity" type="number" step="any" placeholder="default 53.04"></label>'
      + '<label class="oc-field"><span>API gravity <em>&deg;API, manual</em></span><input id="oc-api" type="number" step="any" placeholder="default 35"></label>'
      + '<label class="oc-field"><span>Gas solubility, Rs <em>scf/STB, manual</em></span><input id="oc-rs" type="number" step="any" placeholder="default 600"></label>'
      + '<label class="oc-field"><span>Bubble-point, pb <em>psia, manual</em></span><input id="oc-pb" type="number" step="any" placeholder="default 2200"></label>';
  }

  function prop(n, title, sub, chk, controls) {
    return '<div class="oc-prop">'
      + '<div class="oc-prop-head"><span class="oc-prop-n">' + n + '</span>'
      + '<div class="oc-prop-meta"><span class="oc-prop-title">' + title + '</span>'
      + (sub ? '<span class="oc-prop-sub">' + sub + '</span>' : '') + '</div>'
      + '<label class="oc-chk"><input type="checkbox" id="oc-' + chk + '" checked><span>Include</span></label></div>'
      + '<div class="oc-prop-ctl">' + controls + '</div></div>';
  }

  function propsHtml() {
    return ''
      + prop('1', 'API gravity', '', 'o-api',
        '<select id="oc-o-api-method"><option value="from_density" selected>From oil density (API from &rho;o)</option>'
        + '<option value="input">Use input API</option></select>')
      + prop('2', 'Gas solubility, R<sub>s</sub>', 'Standing &middot; Vasquez-Beggs &middot; Glaso &middot; Marhoun &middot; Petrosky-Farshad &middot; experimental PVT', 'o-rs',
        '<select id="oc-o-rs-method"><option value="standing" selected>Method 1: Standing</option>'
        + '<option value="vasquez_beggs">Method 2: Vasquez-Beggs</option><option value="glaso">Method 3: Glaso</option>'
        + '<option value="marhoun">Method 4: Marhoun</option><option value="petrosky_farshad">Method 5: Petrosky-Farshad</option>'
        + '<option value="experimental_pvt">Experimental PVT data (manual Rs input)</option></select>')
      + prop('3', 'Bubble-point pressure, p<sub>b</sub>', '', 'o-pb',
        '<select id="oc-o-pb-method"><option value="standing" selected>Standing (inverse)</option>'
        + '<option value="vasquez_beggs">Vasquez-Beggs (inverse)</option><option value="glaso">Glaso</option>'
        + '<option value="marhoun">Marhoun</option><option value="petrosky_farshad">Petrosky-Farshad</option>'
        + '<option value="input">Use input pb</option></select>')
      + prop('4', 'Oil formation volume factor, B<sub>o</sub>', '', 'o-bo',
        '<select id="oc-o-bo-method"><option value="standing" selected>Standing</option>'
        + '<option value="vasquez_beggs">Vasquez-Beggs</option><option value="glaso">Glaso</option>'
        + '<option value="marhoun">Marhoun</option><option value="petrosky_farshad">Petrosky-Farshad</option>'
        + '<option value="material_balance">Material balance</option></select>')
      + prop('5', 'Oil viscosity, &mu;<sub>o</sub>', 'Dead &rarr; saturated &rarr; undersaturated chain', 'o-mu',
        '<select id="oc-o-mu-method"><option value="dead" selected>Dead oil viscosity</option>'
        + '<option value="saturated">Saturated oil viscosity</option>'
        + '<option value="undersaturated">Undersaturated oil viscosity</option></select>'
        + '<select id="oc-o-mu-dead-method"><option value="beal" selected>Dead correlation: Beal</option>'
        + '<option value="beggs_robinson">Dead correlation: Beggs-Robinson</option>'
        + '<option value="glaso">Dead correlation: Glaso</option></select>'
        + '<select id="oc-o-mu-sat-method"><option value="beggs_robinson" selected>Saturated correlation: Beggs-Robinson</option></select>'
        + '<select id="oc-o-mu-und-method"><option value="vasquez_beggs" selected>Undersaturated correlation: Vazquez-Beggs</option></select>');
  }

  function rsBatchHtml() {
    var foot = '<strong>AAE (%)</strong> &mdash; Experimental PVT: <span id="oc-o_rs_aae_exp">-</span> | Standing: <span id="oc-o_rs_aae_st">-</span> | Vasquez-Beggs: <span id="oc-o_rs_aae_vb">-</span> | Glaso: <span id="oc-o_rs_aae_gl">-</span> | Marhoun: <span id="oc-o_rs_aae_mh">-</span> | Petrosky-Farshad: <span id="oc-o_rs_aae_pf">-</span>';
    return '<div class="oc-batch" id="oc-batch-rs">'
      + '<p class="oc-meta">Paste a BVT table and compare six methods. Error % is computed against the experimental (BVT) Rs.</p>'
      + pasteBlock('oRsPaste', 'applyORsPasteBtn', 'Evaluate Rs methods', 'Rs evaluation data', PH_BVT)
      + tbl(['#', 'T (&deg;F)', 'pb (psig)', 'API', '&gamma;g', 'Experimental: Rs | Err%', 'Standing: Rs | Err%', 'Vasquez-Beggs: Rs | Err%', 'Glaso: Rs | Err%', 'Marhoun: Rs | Err%', 'Petrosky-Farshad: Rs | Err%'], 'oRsEvalBody', foot)
      + detail('oRsStandingDetail', 'Standing &mdash; detailed calculation', ['Oil', 'T (&deg;F)', 'API', 'x', '10^x', 'Predicted Rs', 'Measured Rs (BVT)', '% Error'], 'oRsStandingBody', '<strong>Standing AAE = <span id="oc-o_rs_standing_aae">-</span> %</strong>')
      + detail('oRsVbDetail', 'Vasquez-Beggs &mdash; detailed calculation', ['Oil', '&gamma;gs (Eq. 4-25)', 'Predicted Rs (Eq. 4-24)', 'Measured Rs (BVT)', '% Error'], 'oRsVbBody', '<strong>Vasquez-Beggs AAE = <span id="oc-o_rs_vb_aae">-</span> %</strong>')
      + detail('oRsGlasoDetail', 'Glaso &mdash; detailed calculation', ['Oil', 'pb (psia)', 'x', 'A = 10^x', 'Predicted Rs', 'Measured Rs (BVT)', '% Error'], 'oRsGlasoBody', '<strong>Glaso AAE = <span id="oc-o_rs_glaso_aae">-</span> %</strong>')
      + detail('oRsMarhounDetail', 'Marhoun &mdash; detailed calculation', ['Oil', 'pb (psia)', '&gamma;o', 'T (&deg;R)', 'Predicted Rs', 'Measured Rs (BVT)', '% Error'], 'oRsMarhounBody', '<strong>Marhoun AAE = <span id="oc-o_rs_marhoun_aae">-</span> %</strong>')
      + detail('oRsPfDetail', 'Petrosky-Farshad &mdash; detailed calculation', ['Oil', 'pb (psia)', 'X', '10^X', 'Predicted Rs', 'Measured Rs (BVT)', '% Error'], 'oRsPfBody', '<strong>Petrosky-Farshad AAE = <span id="oc-o_rs_pf_aae">-</span> %</strong>')
      + detail('oRsExpDetail', 'Experimental BVT &mdash; detailed table', ['Oil', 'pb (psig)', 'T (&deg;F)', 'Rs (BVT)', 'Reported Rs', '% Error'], 'oRsExpBody', '<strong>Experimental BVT AAE = <span id="oc-o_rs_exp_aae">-</span> %</strong>')
      + '</div>';
  }

  function pbBatchHtml() {
    var foot = '<strong>AAE (%)</strong> &mdash; Standing: <span id="oc-o_pb_aae_st">-</span> | Vasquez-Beggs: <span id="oc-o_pb_aae_vb">-</span> | Glaso: <span id="oc-o_pb_aae_glaso">-</span> | Marhoun: <span id="oc-o_pb_aae_marhoun">-</span> | Petrosky-Farshad: <span id="oc-o_pb_aae_pf">-</span>';
    return '<div class="oc-batch" id="oc-batch-pb" hidden>'
      + '<p class="oc-meta">Paste a BVT table and compare bubble-point methods. Error % is computed against the measured pb.</p>'
      + pasteBlock('oPbPaste', 'applyOPbPasteBtn', 'Evaluate pb methods', 'pb evaluation data', PH_BVT)
      + tbl(['Oil', 'T (&deg;F)', 'Measured pb (psia)', 'API', '&gamma;g', 'Standing: pb | Err%', 'Vasquez-Beggs: pb | Err%', 'Glaso: pb | Err%', 'Marhoun: pb | Err%', 'Petrosky-Farshad: pb | Err%'], 'oPbEvalBody', foot)
      + detail('oPbStandingDetail', 'Standing pb &mdash; detailed calculation', ['Oil', 'Rs (scf/STB)', 'T (&deg;F)', 'API', '&gamma;g', 'Term', 'Predicted pb (psia)', 'Measured pb (psia)', '% Error'], 'oPbStandingBody', '<strong>Standing pb AAE = <span id="oc-o_pb_standing_aae">-</span> %</strong>')
      + detail('oPbVbDetail', 'Vasquez-Beggs pb &mdash; detailed calculation', ['Oil', 'API group', '&gamma;gs', 'C1', 'C2', 'C3', 'Base', 'Predicted pb (psia)', 'Measured pb (psia)', '% Error'], 'oPbVbBody', '<strong>Vasquez-Beggs pb AAE = <span id="oc-o_pb_vb_aae">-</span> %</strong>')
      + detail('oPbGlasoDetail', 'Glaso pb &mdash; detailed calculation', ['Oil', 'Rs (scf/STB)', 'T (&deg;F)', 'API', '&gamma;g', 'pb*', 'log10(pb*)', 'Predicted pb (psia)', 'Measured pb (psia)', '% Error'], 'oPbGlasoBody', '<strong>Glaso pb AAE = <span id="oc-o_pb_glaso_aae">-</span> %</strong>')
      + detail('oPbMarhounDetail', 'Marhoun pb &mdash; detailed calculation', ['Oil', 'Rs (scf/STB)', 'T (&deg;R)', '&gamma;o', '&gamma;g', 'Predicted pb (psia)', 'Measured pb (psia)', '% Error'], 'oPbMarhounBody', '<strong>Marhoun pb AAE = <span id="oc-o_pb_marhoun_aae">-</span> %</strong>')
      + detail('oPbPfDetail', 'Petrosky-Farshad pb &mdash; detailed calculation', ['Oil', 'Rs (scf/STB)', 'T (&deg;F)', 'API', '&gamma;g', 'X', '10^X', 'Rs^(1/1.73184)', 'Predicted pb (psia)', 'Measured pb (psia)', '% Error'], 'oPbPfBody', '<strong>Petrosky-Farshad pb AAE = <span id="oc-o_pb_pf_aae">-</span> %</strong>')
      + '</div>';
  }

  function boBatchHtml() {
    var foot = '<strong>AAE (%)</strong> &mdash; Standing: <span id="oc-o_bo_aae_st">-</span> | Vasquez-Beggs: <span id="oc-o_bo_aae_vb">-</span> | Glaso: <span id="oc-o_bo_aae_glaso">-</span> | Marhoun: <span id="oc-o_bo_aae_marhoun">-</span> | Petrosky-Farshad: <span id="oc-o_bo_aae_pf">-</span> | Material balance: <span id="oc-o_bo_aae_mb">-</span>';
    return '<div class="oc-batch" id="oc-batch-bo" hidden>'
      + '<p class="oc-meta">Paste a BVT table and compare Bo methods. Error % is computed against the measured Bo.</p>'
      + pasteBlock('oBoPaste', 'applyOBoPasteBtn', 'Evaluate Bo methods', 'Bo evaluation data', PH_BVT)
      + tbl(['Oil', 'T (&deg;F)', 'Rs (scf/STB)', 'API', '&gamma;g', '&rho;o (lb/ft&sup3;)', 'Measured Bo', 'Standing: Bo | Err%', 'Vasquez-Beggs: Bo | Err%', 'Glaso: Bo | Err%', 'Marhoun: Bo | Err%', 'Petrosky-Farshad: Bo | Err%', 'Material balance: Bo | Err%'], 'oBoEvalBody', foot)
      + detail('oBoDetail', 'Selected method &mdash; detailed calculation', ['Oil', 'Method', 'T (&deg;F)', 'API', '&gamma;g', 'Rs (scf/STB)', 'Predicted Bo', 'Measured Bo', '% Error'], 'oBoDetailBody', '<strong>Selected method Bo AAE = <span id="oc-o_bo_detail_aae">-</span> %</strong>')
      + '</div>';
  }

  function muBatchHtml() {
    var foot = '<strong>AAE (%)</strong> &mdash; Dead: <span id="oc-o_mu_aae_dead">-</span> | Saturated: <span id="oc-o_mu_aae_sat">-</span> | Undersaturated: <span id="oc-o_mu_aae_und">-</span>';
    return '<div class="oc-batch" id="oc-batch-mu" hidden>'
      + '<p class="oc-meta">Paste table data and evaluate dead / saturated / undersaturated viscosity. If a measured &mu;o column is present, % error is computed.</p>'
      + pasteBlock('oMuPaste', 'applyOMuPasteBtn', 'Evaluate oil viscosity', 'Viscosity evaluation data', PH_MU)
      + tbl(['Oil', 'T (&deg;F)', 'pb (psig)', 'Rs (scf/STB)', 'API', '&gamma;g', 'Measured &mu;o', 'Dead &mu;o | Err%', 'Saturated &mu;o | Err%', 'Undersaturated &mu;o | Err%'], 'oMuEvalBody', foot)
      + detail('oMuDetail', 'Selected method &mdash; detailed calculation', ['Oil', 'Method', 'T (&deg;F)', 'API', 'Rs (scf/STB)', 'pb (psia)', 'p used (psia)', 'Predicted &mu;o', 'Measured &mu;o', '% Error'], 'oMuDetailBody', '<strong>Selected method &mu;o AAE = <span id="oc-o_mu_detail_aae">-</span> %</strong>')
      + '</div>';
  }

  function template() {
    return '<div class="oc">'
      + '<div class="oc-bar">'
      + '<div class="oc-tabs">'
      + '<button type="button" class="oc-tab is-on" data-tab="calc">Calculator</button>'
      + '<button type="button" class="oc-tab" data-tab="batch">Batch evaluation</button>'
      + '</div>'
      + '<div class="oc-bar-actions">'
      + '<button type="button" class="oc-btn oc-btn-ghost" id="oc-resetBtn">Reset defaults</button>'
      + '<button type="button" class="oc-btn oc-btn-amber" id="oc-calculateBtn">Calculate selected properties</button>'
      + '</div></div>'

      + '<div class="oc-view" data-view="calc">'
      + '<div class="oc-grid">'
      + '<div class="oc-col">'
      + '<section class="oc-card"><h3>Fluid inputs</h3><div class="oc-fields">' + inputsHtml() + '</div></section>'
      + '<section class="oc-card"><h3>Property selection</h3><div class="oc-props">' + propsHtml() + '</div></section>'
      + '</div>'
      + '<div class="oc-col">'
      + '<section class="oc-card oc-card-res"><h3>Results</h3>'
      + '<div class="oc-tiles" id="oc-resultTiles"></div>'
      + '<div class="oc-meta" id="oc-resultMeta">No calculation yet.</div>'
      + '<div class="oc-tablewrap oc-res-table"><table><thead><tr><th>Property</th><th>Value</th><th>Units</th><th>Method</th></tr></thead>'
      + '<tbody id="oc-resultsBody"></tbody></table></div>'
      + '</section>'
      + '</div></div></div>'

      + '<div class="oc-view" data-view="batch" hidden>'
      + '<div class="oc-subtabs">'
      + '<button type="button" class="oc-subtab is-on" data-batch="rs">Gas solubility, Rs</button>'
      + '<button type="button" class="oc-subtab" data-batch="pb">Bubble point, pb</button>'
      + '<button type="button" class="oc-subtab" data-batch="bo">Oil FVF, Bo</button>'
      + '<button type="button" class="oc-subtab" data-batch="mu">Oil viscosity, &mu;o</button>'
      + '</div>'
      + '<section class="oc-card oc-card-batch">' + rsBatchHtml() + pbBatchHtml() + boBatchHtml() + muBatchHtml() + '</section>'
      + '</div>'
      + '</div>';
  }

  /* ------------------------------------------------------------ behaviour */

  function show(id, on) {
    var el = $(id);
    if (el) el.hidden = !on;
  }

  function syncPanels() {
    var rsOn = $('o-rs') && $('o-rs').checked;
    var pbOn = $('o-pb') && $('o-pb').checked;
    var boOn = $('o-bo') && $('o-bo').checked;
    var muOn = $('o-mu') && $('o-mu').checked;
    var rsm = ($('o-rs-method') && $('o-rs-method').value) || 'standing';
    var pbm = ($('o-pb-method') && $('o-pb-method').value) || 'standing';

    show('oRsStandingDetail', rsOn && rsm === 'standing');
    show('oRsVbDetail', rsOn && rsm === 'vasquez_beggs');
    show('oRsGlasoDetail', rsOn && rsm === 'glaso');
    show('oRsMarhounDetail', rsOn && rsm === 'marhoun');
    show('oRsPfDetail', rsOn && rsm === 'petrosky_farshad');
    show('oRsExpDetail', rsOn && rsm === 'experimental_pvt');

    show('oPbStandingDetail', pbOn && pbm === 'standing');
    show('oPbVbDetail', pbOn && pbm === 'vasquez_beggs');
    show('oPbGlasoDetail', pbOn && pbm === 'glaso');
    show('oPbMarhounDetail', pbOn && pbm === 'marhoun');
    show('oPbPfDetail', pbOn && pbm === 'petrosky_farshad');

    show('oBoDetail', boOn);
    show('oMuDetail', muOn);

    /* manual inputs are only live for the methods that read them */
    mark('api', ($('o-api-method') && $('o-api-method').value) === 'input');
    mark('rs', rsm === 'experimental_pvt');
    mark('pb', pbm === 'input');

    if (host) {
      host.querySelectorAll('.oc-subtab').forEach(function (b) {
        var k = b.getAttribute('data-batch');
        var live = (k === 'rs' && rsOn) || (k === 'pb' && pbOn) || (k === 'bo' && boOn) || (k === 'mu' && muOn);
        b.classList.toggle('is-off', !live);
      });
    }
  }

  function mark(id, active) {
    var el = $(id);
    if (el && el.parentNode) el.parentNode.classList.toggle('is-manual', !!active);
  }

  function setTab(tab) {
    state.tab = tab;
    if (!host) return;
    host.querySelectorAll('.oc-tab').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-tab') === tab);
    });
    host.querySelectorAll('.oc-view').forEach(function (v) {
      v.hidden = v.getAttribute('data-view') !== tab;
    });
  }

  function setBatchTab(key) {
    state.batchTab = key;
    if (!host) return;
    host.querySelectorAll('.oc-subtab').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-batch') === key);
    });
    ['rs', 'pb', 'bo', 'mu'].forEach(function (k) { show('batch-' + k, k === key); });
  }

  function applyOilRsPaste() {
    var box = $('oRsPaste');
    if (!box) return;
    var rows = parseOilEvaluationRows(box.value || '');
    renderOilRsEvaluation(rows);
    renderOilRsStandingDetail(rows);
    renderOilRsVbDetail(rows);
    renderOilRsGlasoDetail(rows);
    renderOilRsMarhounDetail(rows);
    renderOilRsPfDetail(rows);
    renderOilRsExperimentalDetail(rows);
    calculate();
  }

  function applyOilPbPaste() {
    var box = $('oPbPaste');
    if (!box) return;
    var rows = parseOilEvaluationRows(box.value || '');
    renderOilPbEvaluation(rows);
    renderOilPbStandingDetail(rows);
    renderOilPbVbDetail(rows);
    renderOilPbGlasoDetail(rows);
    renderOilPbMarhounDetail(rows);
    renderOilPbPfDetail(rows);
    calculate();
  }

  function applyOilBoPaste() {
    var box = $('oBoPaste');
    if (!box) return;
    var rows = parseOilEvaluationRows(box.value || '');
    renderOilBoEvaluation(rows);
    renderOilBoDetail(rows);
    calculate();
  }

  function applyOilMuPaste() {
    var box = $('oMuPaste');
    if (!box) return;
    var rows = parseOilViscosityRows(box.value || '');
    renderOilMuEvaluation(rows);
    renderOilMuDetail(rows);
    calculate();
  }

  function resetDefaults() {
    ['pressure', 'temperature', 'gasGravity', 'oilDensity', 'api', 'rs', 'pb'].forEach(function (id) {
      if ($(id)) $(id).value = '';
    });
    if ($('temperatureUnit')) $('temperatureUnit').value = 'F';
    calculate();
  }

  /* inputs survive leaving and re-entering the screen */
  var FIELDS = ['pressure', 'temperature', 'temperatureUnit', 'gasGravity', 'oilDensity', 'api', 'rs', 'pb',
    'o-api-method', 'o-rs-method', 'o-pb-method', 'o-bo-method',
    'o-mu-method', 'o-mu-dead-method', 'o-mu-sat-method', 'o-mu-und-method',
    'oRsPaste', 'oPbPaste', 'oBoPaste', 'oMuPaste'];
  var CHECKS = ['o-api', 'o-rs', 'o-pb', 'o-bo', 'o-mu'];
  var snapshot = null;

  function capture() {
    var v = {}, c = {};
    FIELDS.forEach(function (id) { if ($(id)) v[id] = $(id).value; });
    CHECKS.forEach(function (id) { if ($(id)) c[id] = $(id).checked; });
    return { v: v, c: c };
  }

  function restore(snap) {
    if (!snap) return;
    FIELDS.forEach(function (id) { if ($(id) && snap.v[id] !== undefined) $(id).value = snap.v[id]; });
    CHECKS.forEach(function (id) { if ($(id) && snap.c[id] !== undefined) $(id).checked = snap.c[id]; });
  }

  function renderAllTables() {
    renderOilRsEvaluation(state.oilRsEval.rows || []);
    renderOilRsStandingDetail(state.oilRsEval.rows || []);
    renderOilRsVbDetail(state.oilRsEval.rows || []);
    renderOilRsGlasoDetail(state.oilRsEval.rows || []);
    renderOilRsMarhounDetail(state.oilRsEval.rows || []);
    renderOilRsPfDetail(state.oilRsEval.rows || []);
    renderOilRsExperimentalDetail(state.oilRsEval.rows || []);
    renderOilPbEvaluation(state.oilPbEval.rows || []);
    renderOilPbStandingDetail(state.oilPbEval.rows || []);
    renderOilPbVbDetail(state.oilPbEval.rows || []);
    renderOilPbGlasoDetail(state.oilPbEval.rows || []);
    renderOilPbMarhounDetail(state.oilPbEval.rows || []);
    renderOilPbPfDetail(state.oilPbEval.rows || []);
    renderOilBoEvaluation(state.oilBoEval.rows || []);
    renderOilBoDetail(state.oilBoEval.rows || []);
    renderOilMuEvaluation(state.oilMuEval.rows || []);
    renderOilMuDetail(state.oilMuEval.rows || []);
  }

  function clearAllTables() {
    renderOilRsEvaluation([]);
    renderOilRsStandingDetail([]);
    renderOilRsVbDetail([]);
    renderOilRsGlasoDetail([]);
    renderOilRsMarhounDetail([]);
    renderOilRsPfDetail([]);
    renderOilRsExperimentalDetail([]);
    renderOilPbEvaluation([]);
    renderOilPbStandingDetail([]);
    renderOilPbVbDetail([]);
    renderOilPbGlasoDetail([]);
    renderOilPbMarhounDetail([]);
    renderOilPbPfDetail([]);
    renderOilBoEvaluation([]);
    renderOilBoDetail([]);
    renderOilMuEvaluation([]);
    renderOilMuDetail([]);
  }

  function on(id, evt, fn) {
    var el = $(id);
    if (el) el.addEventListener(evt, fn);
  }

  function bind() {
    host.querySelectorAll('.oc-tab').forEach(function (b) {
      b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); });
    });
    host.querySelectorAll('.oc-subtab').forEach(function (b) {
      b.addEventListener('click', function () { setBatchTab(b.getAttribute('data-batch')); });
    });

    on('calculateBtn', 'click', calculate);
    on('resetBtn', 'click', resetDefaults);
    on('applyORsPasteBtn', 'click', applyOilRsPaste);
    on('applyOPbPasteBtn', 'click', applyOilPbPaste);
    on('applyOBoPasteBtn', 'click', applyOilBoPaste);
    on('applyOMuPasteBtn', 'click', applyOilMuPaste);

    ['pressure', 'temperature', 'gasGravity', 'oilDensity', 'api', 'rs', 'pb'].forEach(function (id) {
      on(id, 'input', calculate);
    });
    on('temperatureUnit', 'change', calculate);

    ['o-api', 'o-rs', 'o-pb', 'o-bo', 'o-mu', 'o-api-method', 'o-rs-method', 'o-pb-method'].forEach(function (id) {
      on(id, 'change', calculate);
    });
    on('o-bo-method', 'change', function () {
      renderOilBoDetail(state.oilBoEval.rows || []);
      calculate();
    });
    ['o-mu-method', 'o-mu-dead-method', 'o-mu-sat-method', 'o-mu-und-method'].forEach(function (id) {
      on(id, 'change', function () {
        renderOilMuDetail(state.oilMuEval.rows || []);
        calculate();
      });
    });
  }

  /* ------------------------------------------------------------------ API */

  var OilCalc = {
    mount: function (el) {
      if (!el) return;
      if (mounted && host === el) return;
      host = el;
      host.innerHTML = template();
      bind();
      restore(snapshot);
      setTab(state.tab || 'calc');
      setBatchTab(state.batchTab || 'rs');
      renderAllTables();
      calculate();
      mounted = true;
    },
    unmount: function () {
      if (host && mounted && $('pressure')) snapshot = capture();
      if (host) host.innerHTML = '';
      host = null;
      mounted = false;
    },
    isMounted: function (el) { return mounted && host === el; },
    recalc: calculate
  };

  global.OilCalc = OilCalc;
})(window);
