/* Differential Liberation — Stage 7 final flash: the one measured input and every value derived from it.

   Stage 6 ends at 203 psig, which is also its Psat (bubble point): the remaining 67.6952 cc of oil still holds
   dissolved gas (Rs > 0). Stage 7 recompresses that same sample to 2,500 psig (no oil or gas added) and flashes
   it to stock-tank conditions (15 °C, 101.325 kPa). The gas released there is the gas still dissolved at
   203 psig; Rs becomes 0 only after this flash.

   REQUIRED INPUT — not available in the project data:
     gasScc   gas liberated by the final flash, standard cc at 15 °C / 101.325 kPa (Gasometer reading
              corrected to standard conditions).
   While it is null, every value that depends on it is reported as "input required" (Stage 6 Rs, the DL Rs
   column and graph, Rs at Psat on the differential basis, final oil mass, residual-oil volume, cumulative
   gas). Nothing is assumed in its place.

   Derived when gasScc is entered:
     gas mass        = gasScc x gas gravity x 1.2250 kg/m3 (air at 15 °C, 101.325 kPa); report gas gravity
                       (one GC composition is reported for every DL stage)
     oil mass        = Stage 6 liquid mass (67.6952 cc x Stage 6 oil density, report) - gas mass
     residual oil    = oil mass / stock-tank oil density (report sto_den): the measured residual volume, which
                       replaces the report's assumed 0.965 shrinkage (v_sto) as the basis of Bo and Rs
     Rs(203 psig)    = gasScc / residual oil
     Rs(stage i)     = (gas liberated in the later stages + final-flash gas) / residual oil; the report stage
                       gas increments (gas_sc) are kept unchanged and the final-flash gas is added once
     Bo(stage i)     = stage oil volume / residual oil
     Rs at Psat (DL) = (all stage gas + final-flash gas) / residual oil
   While gasScc is missing, Bo stays on the report's v_sto basis (its listed shrinkage assumption). */
(function () {
  'use strict';
  var INPUT = { gasScc: null, source: '' };

  var R = window.PVT_REPORT;
  if (!R || !R.dl || !R.dl.length) return;
  var C = R.const || {}, F = R.flash || {};
  var last = R.dl[R.dl.length - 1];
  var known = INPUT.gasScc != null && isFinite(INPUT.gasScc) && INPUT.gasScc >= 0;
  var G = known ? Number(INPUT.gasScc) : null;
  var RHO_AIR = 1.2250;                                          // kg/m3, dry air at 15 °C and 101.325 kPa
  var rhoGas = (F.gas_sg || 0) * RHO_AIR;                        // kg/m3 = mg/cc
  var liqMass = last.rem * last.den / 1000;                      // g, Stage 6 liquid at 203 psig
  var oilMass = known ? liqMass - G * rhoGas / 1000 : null;
  var vSto = known ? oilMass / (F.sto_den / 1000) : C.v_sto;     // residual oil at stock tank (cc): measured, or report basis
  if (known) R.dl.forEach(function (r) { r.bo = r.rem / vSto; });
  var stageGas = R.dl.map(function (r) { return r.gas_sc; });    // scc per stage (unchanged)
  var stageTot = stageGas.reduce(function (a, b) { return a + b; }, 0);

  // Rs excluding the final flash (the old closure: Rs = 0 at 203 psig) -> kept only for reference
  R.dl.forEach(function (r, i) {
    var later = 0; for (var j = i + 1; j < stageGas.length; j++) later += stageGas[j];
    r.rs_stages = later / vSto;
    r.rs = known ? (later + G) / vSto : null;
  });

  R.dl_final = {
    input: INPUT, known: known,
    pStartPsig: 203, pRecompPsig: 2500,
    gasScc: G,
    gasMassG: known ? G * rhoGas / 1000 : null,
    liqMassG: liqMass,
    oilMassG: oilMass,
    vResCc: known ? vSto : null,                                 // measured residual-oil volume at stock tank
    rs6: known ? G / vSto : null,                                // sm3/sm3 at 203 psig (Stage 6 Psat)
    rsdb: known ? (stageTot + G) / vSto : null,                  // sm3/sm3 at Psat, differential basis
    stageGasScc: stageTot,
    cumGasScc: known ? stageTot + G : null,
    vSto: vSto,
    required: known ? [] : ['Final-flash gas volume from the Stage 6 residual oil (203 psig, recompressed to 2,500 psig) to stock-tank conditions, standard cc — data/dl-final-flash.js gasScc']
  };
  if (R.dl_sat) R.dl_sat.rs = R.dl_final.rsdb;
})();
