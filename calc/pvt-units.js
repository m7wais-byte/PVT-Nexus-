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
  /* Standard-condition bases. Both are at 101.325 kPa, so only the temperature differs.
     'corr' — the basis the correlations were developed on (US practice: 60 °F). Every correlation
              result (Rs, Rsb, Bo, Bob, and Bg unless stated) is on this basis.
     'lab'  — the PVT-laboratory basis used in our reports: 15 °C (= 59 °F exactly).
     Conversion that can be justified with the information available: gas standard volumes only,
     treating gas at standard conditions as ideal (Zsc = 1 at both bases):
         V_lab / V_corr = Tsc,lab / Tsc,corr = 518.67 / 519.67 = 0.998076
     so Bg and Eg follow exactly from Bg = (psc/Tsc)·Z·T/p with the chosen Tsc.
     NOT converted: Rs, Rsb, Bo, Bob. Their stock-tank oil volume (and the gas liberated in the flash
     to standard conditions) depend on the oil's thermal expansion and phase behaviour between 15 °C
     and 60 °F, which these inputs do not define. They always stay on the correlation basis. */
  var STD_BASES = {
    corr: { key: 'corr', pPsia: P_ATM_PSIA, tF: 60, tR: 519.67, short: '60 °F, 101.325 kPa', label: 'Correlation basis: 60 °F, 101.325 kPa (14.696 psia)' },
    lab: { key: 'lab', pPsia: P_ATM_PSIA, tF: 59, tR: 518.67, short: '15 °C, 101.325 kPa', label: 'Laboratory basis: 15 °C, 101.325 kPa (14.696 psia)' }
  };
  var STD = Object.assign({}, STD_BASES.corr, { label: '60 °F and 14.696 psia (15.56 °C, 1.01325 bar)' });
  function stdBasis(key) { return STD_BASES[key] || STD_BASES.corr; }
  /* factor applied to a gas standard volume (scf or sm³) to move it from basis `from` to basis `to` */
  function gasVolumeFactor(from, to) { return stdBasis(to).tR / stdBasis(from).tR; }
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
    STD: STD, STD_BASES: STD_BASES, stdBasis: stdBasis, gasVolumeFactor: gasVolumeFactor, P_ATM_PSIA: P_ATM_PSIA, P_ATM_BAR: P_ATM_BAR, PSI_PER_BAR: PSI_PER_BAR,
    KGM3_PER_LBFT3: KGM3_PER_LBFT3, FT3_PER_BBL: FT3_PER_BBL, SM3SM3_PER_SCFSTB: SM3SM3_PER_SCFSTB,
    SYSTEMS: SYSTEMS,
    pToPsia: pToPsia, pFromPsia: pFromPsia, dpToPsi: dpToPsi,
    tToF: tToF, tFromF: tFromF, fToR: fToR,
    toDisplay: toDisplay, fromDisplay: fromDisplay, unit: unit, isNum: isNum
  };

  root.PVTUnits = PVTUnits;
  if (typeof module !== 'undefined' && module.exports) module.exports = PVTUnits;
})(typeof window !== 'undefined' ? window : globalThis);
