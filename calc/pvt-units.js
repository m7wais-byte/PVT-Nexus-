/* ============================================================================
   PVT Nexus — PVTUnits
   Unit systems, pressure conventions and standard conditions for the PVT
   Calculator. Pure functions; no DOM. Loaded in the browser (window.PVTUnits)
   and in Node tests (module.exports).

   Internal basis (all correlations are evaluated in it):
     pressure      psia (absolute)        temperature   °F  (°R where a correlation asks)
     Rs            scf/STB                Bo            rb/STB
     Bg            ft³/scf (= res vol / std vol, dimensionless)
     density       lbm/ft³                viscosity     cP
     compressibility 1/psi                specific vol. ft³/lbm
   ========================================================================= */
(function (root) {
  'use strict';

  /* standard / reference conditions used everywhere in the calculator */
  var PSI_PER_BAR = 14.503773773;      // 1 bar = 100 kPa
  /* one standard atmosphere, 101.325 kPa = 14.6959488 psi (shown as 14.696):
     the gauge reference and the standard-condition pressure; psig and bar(g) use the same value */
  var P_ATM_BAR = 1.01325;
  var P_ATM_PSIA = P_ATM_BAR * PSI_PER_BAR;
  var STD = {
    pPsia: P_ATM_PSIA,
    tF: 60,                 // 60 °F = 519.67 °R = 15.56 °C
    tR: 519.67,
    label: '60 °F and 14.696 psia (15.56 °C, 1.01325 bar)'
  };
  var KGM3_PER_LBFT3 = 16.01846337;
  var M3_PER_FT3 = 0.028316846592;
  var M3_PER_BBL = 0.158987294928;
  var FT3_PER_BBL = 5.614583333;
  var SM3SM3_PER_SCFSTB = M3_PER_FT3 / M3_PER_BBL;   // 0.178107607
  var M3KG_PER_FT3LB = 1 / KGM3_PER_LBFT3;          // 0.0624279606

  var SYSTEMS = {
    field: {
      pAbs: 'psia', pGauge: 'psig', T: '°F', density: 'lbm/ft³', Rs: 'scf/STB', Bo: 'rb/STB',
      Bg: 'ft³/scf', BgRb: 'rb/scf', Eg: 'scf/ft³', mu: 'cP', comp: '1/psi', v: 'ft³/lbm'
    },
    metric: {
      pAbs: 'bar(a)', pGauge: 'bar(g)', T: '°C', density: 'kg/m³', Rs: 'sm³/sm³', Bo: 'rm³/sm³',
      Bg: 'rm³/sm³', BgRb: 'rm³/sm³', Eg: 'sm³/rm³', mu: 'mPa·s', comp: '1/bar', v: 'm³/kg'
    }
  };

  function isNum(x) { return typeof x === 'number' && isFinite(x); }

  /* ---- pressure: display value -> internal psia (absolute) ---- */
  function pToPsia(v, system, gauge) {
    if (!isNum(v)) return NaN;
    if (system === 'metric') return (gauge ? v + P_ATM_BAR : v) * PSI_PER_BAR;
    return gauge ? v + P_ATM_PSIA : v;
  }
  /* internal psia -> display value in the chosen system and convention */
  function pFromPsia(psia, system, gauge) {
    if (!isNum(psia)) return NaN;
    if (system === 'metric') { var bar = psia / PSI_PER_BAR; return gauge ? bar - P_ATM_BAR : bar; }
    return gauge ? psia - P_ATM_PSIA : psia;
  }
  /* pressure differences (increments) carry no gauge offset */
  function dpToPsi(v, system) { return system === 'metric' ? v * PSI_PER_BAR : v; }

  function tToF(v, system) { return system === 'metric' ? v * 9 / 5 + 32 : v; }
  function tFromF(f, system) { return system === 'metric' ? (f - 32) * 5 / 9 : f; }
  function fToR(f) { return f + 459.67; }

  /* property conversion internal(field) -> display; one factor per quantity */
  var FACTOR = {
    Rs: SM3SM3_PER_SCFSTB, Bo: 1, Bg: 1, BgRb: FT3_PER_BBL, Eg: 1, density: KGM3_PER_LBFT3,
    mu: 1, comp: PSI_PER_BAR, v: M3KG_PER_FT3LB, none: 1
  };
  /* BgRb in metric is reported as rm³/sm³ (same ratio as Bg), hence × 5.6146 back from rb/scf */
  function toDisplay(q, val, system) {
    if (!isNum(val)) return val;
    if (system !== 'metric') return val;
    return val * (FACTOR[q] || 1);
  }
  function fromDisplay(q, val, system) {
    if (!isNum(val)) return val;
    if (system !== 'metric') return val;
    return val / (FACTOR[q] || 1);
  }
  function unit(q, system, gauge) {
    var s = SYSTEMS[system] || SYSTEMS.field;
    if (q === 'p') return gauge ? s.pGauge : s.pAbs;
    if (q === 'dp') return system === 'metric' ? 'bar' : 'psi';
    if (q === 'none') return '–';
    return s[q] || '';
  }

  var PVTUnits = {
    STD: STD, P_ATM_PSIA: P_ATM_PSIA, P_ATM_BAR: P_ATM_BAR, PSI_PER_BAR: PSI_PER_BAR,
    KGM3_PER_LBFT3: KGM3_PER_LBFT3, FT3_PER_BBL: FT3_PER_BBL, SM3SM3_PER_SCFSTB: SM3SM3_PER_SCFSTB,
    SYSTEMS: SYSTEMS,
    pToPsia: pToPsia, pFromPsia: pFromPsia, dpToPsi: dpToPsi,
    tToF: tToF, tFromF: tFromF, fToR: fToR,
    toDisplay: toDisplay, fromDisplay: fromDisplay, unit: unit, isNum: isNum
  };

  root.PVTUnits = PVTUnits;
  if (typeof module !== 'undefined' && module.exports) module.exports = PVTUnits;
})(typeof window !== 'undefined' ? window : globalThis);
