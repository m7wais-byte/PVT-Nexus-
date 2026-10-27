/* Differential Liberation — Stage 7 final flash: the one missing input and every value derived from it.

   Stage 6 ends at 203 psig, which is also its Psat (bubble point): the remaining 67.6952 cc of oil still holds
   dissolved gas (Rs > 0). Stage 7 recompresses that same sample to 2,500 psig (no oil or gas added) and flashes
   it to stock-tank conditions. Rs becomes 0 only after this flash.

   Reference conditions (one basis for the whole DL): 60 °F (15.56 °C) and 14.696 psia (101.325 kPa) for gas
   volumes, residual oil, Bo and Rs.

   Value classes (shown on the page and in the report):
     MEASURED    Stage 6 remaining volume 67.6952 cc (simulator stage data); the final-flash gas once entered
     REPORT      data/report-data.js values, kept unchanged: stage gas increments (gas_sc), stage oil volumes
                 (rem), Stage 6 oil density (773.21 kg/m3), gas gravity (0.7398), stock-tank oil density
                 (801.26 kg/m3), Vsat 83.08 cc (= bo_sat x v_sto) and v_sto 65.3259 cc
     ASSUMED     - report gas_sc and stock-tank density taken at the 60 °F reference (report labels them STP /
                   15 °C; difference about 0.05 %)
                 - final-flash gas gravity = the report stage-gas gravity (one GC composition for every stage)
                 - ideal gas (z = 1) at the reference conditions
                 - residual-oil density = the report stock-tank oil density (no measurement on the DL residue)
                 - while gasScc is missing: residual oil = report v_sto (67.6952 x 0.965 shrinkage)
     CALCULATED  every result below
     MISSING     gasScc (required)

   Equations (gasScc entered):
     rho_air(60 °F, 101.325 kPa) = P M / (R T) = 101325 x 0.0289647 / (8.314463 x 288.706) = 1.2226 kg/m3
     rho_gas  = gas gravity x rho_air                                   kg/m3 = mg per std cc
     m_gas    = gasScc x rho_gas / 1000                                 g
     m_liq    = 67.6952 cc x Stage 6 oil density / 1000                 g  (report density; it was derived by the
                report with no final-flash gas, so m_oil below is a mass balance on report data, not a weighing)
     m_oil    = m_liq - m_gas                                           g  stock-tank oil (calculated)
     V_res    = m_oil / rho_STO(60 °F)                                  cc residual oil at 60 °F (calculated)
     Rs(203)  = gasScc / V_res                                          std m3/m3
     Rs(i)    = (report gas of the later stages + gasScc) / V_res      final-flash gas added once
     Rs(Psat) = (all report stage gas + gasScc) / V_res
     Bo(i)    = report stage oil volume rem_i / V_res
     Bo(p >= Psat) = Vsat x V/Vsat / V_res                              same residual-oil basis as the DL rows */
(function () {
  'use strict';
  var INPUT = { gasScc: null, source: '' };                       // MISSING: final-flash gas, std cc at 60 °F

  var R = window.PVT_REPORT;
  if (!R || !R.dl || !R.dl.length) return;
  var C = R.const || {}, F = R.flash || {};
  var last = R.dl[R.dl.length - 1];
  var known = INPUT.gasScc != null && isFinite(INPUT.gasScc) && INPUT.gasScc >= 0;
  var G = known ? Number(INPUT.gasScc) : null;

  var T_REF = (60 - 32) / 1.8 + 273.15, P_REF = 101325;             // 60 °F, 14.696 psia
  var RHO_AIR = P_REF * 0.0289647 / (8.314462618 * T_REF);          // 1.2226 kg/m3, ideal dry air
  var rhoGas = (F.gas_sg || 0) * RHO_AIR;                           // kg/m3 = mg per std cc (assumed gravity)
  var rhoSto = F.sto_den;                                           // kg/m3 at 60 °F (report value, assumed basis)
  var liqMass = last.rem * last.den / 1000;                         // g, Stage 6 liquid (report density)
  var gasMass = known ? G * rhoGas / 1000 : null;
  var oilMass = known ? liqMass - gasMass : null;                   // calculated mass balance
  var vRes = known ? oilMass / (rhoSto / 1000) : C.v_sto;           // calculated, or assumed report shrinkage basis
  var vSat = C.bo_sat * C.v_sto;                                    // 83.08 cc, report (Initial PV Psat volume)

  // one residual-oil basis for every Bo and Rs of the DL table
  var stageGas = R.dl.map(function (r) { return r.gas_sc; });       // report stage increments, unchanged
  var stageTot = stageGas.reduce(function (a, b) { return a + b; }, 0);
  R.dl.forEach(function (r, i) {
    var later = 0; for (var j = i + 1; j < stageGas.length; j++) later += stageGas[j];
    r.bo = r.rem / vRes;
    r.rs = known ? (later + G) / vRes : null;
  });

  R.dl_final = {
    input: INPUT, known: known, ref: '60 °F, 14.696 psia (101.325 kPa)',
    pStartPsig: 203, pRecompPsig: 2500,
    gasScc: G,                                                      // measured once entered
    rhoAir: RHO_AIR, rhoGas: rhoGas, rhoSto: rhoSto,
    gasMassG: gasMass, liqMassG: liqMass, oilMassG: oilMass,        // calculated
    vRes: vRes, vResBasis: known ? 'calculated' : 'assumed',        // residual oil at 60 °F
    vSat: vSat,
    boSat: vSat / vRes,                                             // Bo at Psat on the DL residual-oil basis
    rs6: known ? G / vRes : null,
    rsdb: known ? (stageTot + G) / vRes : null,
    stageGasScc: stageTot,
    cumGasScc: known ? stageTot + G : null,
    required: known ? [] : ['Final-flash gas volume (std cc at 60 °F, 14.696 psia) from the Stage 6 oil at 203 psig, recompressed to 2,500 psig and flashed to stock-tank conditions — data/dl-final-flash.js gasScc']
  };
  if (R.dl_sat) { R.dl_sat.rs = R.dl_final.rsdb; R.dl_sat.bo = R.dl_final.boSat; }
})();
