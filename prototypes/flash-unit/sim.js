/* Flash Process — prototype simulation model.

   Stages 1–6 reproduce components/Main.js runFlashStage() exactly: same values, same ramps, same
   valve timing (FXP), same stage durations (5.0 s base, 5.3 s for the flash, x PROCESS_SPEED_MULTIPLIER
   1.7 from timing.js). Only the flow-lane timing inside the drawing changes, because the lanes now
   follow the corrected route (sample -> flask -> headspace -> gasometer).
   Stage 2 is wrapped in a short connect phase (temporary vacuum pump wheeled in, hose attached) and a
   matching disconnect phase; the existing Stage 2 timeline and values run unchanged between them.

   Stage 7 (Density & API) is new. Its density result comes from the project's stock-tank oil
   density (data/report-data.js PVT_REPORT.flash.sto_den, kg/m3 at the 60 F reference); the reading at
   the measuring temperature is back-calculated from it so every displayed value is consistent with the
   report. These are EXAMPLE values, labelled as such in the preview. */
(function () {
  'use strict';
  var R = function (a, b, p) { return Math.max(0, Math.min(1, (p - a) / (b - a))); };
  var E = function (x) { return x * x * (3 - 2 * x); };
  var PSM = 1.7;                                             // timing.js PROCESS_SPEED_MULTIPLIER
  var FXP = { valve: 0.07, flow: 0.15, end: 0.90, shut: 0.97 };   // Main.js
  var fxValve = function (p) { return E(R(FXP.valve, FXP.flow, p)) * (1 - E(R(FXP.end, FXP.shut, p))); };
  var BASE = { 1: 5.0, 2: 5.0, 3: 5.0, 4: 5.3, 5: 5.0, 6: 5.0, 7: 9.0 };   // s, before PSM (stage 7: new)
  var RECV = { 2: 0.38, 3: 0.36, 4: 0.287, 5: 0.40 };
  var CONN = 1.4 * PSM;                                                  // s: temporary vacuum pump connect / disconnect (prototype addition)                    // Main.js FX[n].recv
  var NAMES = ['Stable Sample', 'Vacuum Unit', 'Fill Helium', 'Flash Sample', 'Collect Gas', 'Collect Oil', 'Density & API'];
  var ACTIONS = ['Confirm Stable Sample', 'Vacuum Flash Unit', 'Fill with Helium', 'Start Flash', 'Collect Gas into Balloon', 'Collect Oil and Gas', 'Measure Density & API'];
  var PHASES = ['PREPARING', 'VALVE OPEN', 'FLOWING', 'RECEIVING', 'TRANSFER COMPLETE'];
  var TXT = {
    2: ['Temporary vacuum pump connected · vacuum valve closed', 'Vacuum valve opening', 'Air drawn from the flask up the shared connection to the temporary vacuum pump', 'Air drawn from the flask up the shared connection to the temporary vacuum pump', 'Vacuum valve closed · Flash Unit at 0 psia'],
    3: ['Preparing helium transfer · gasometer valves closed', 'Gasometer inlet and isolation valves opening', 'Helium leaving the gasometer (1,000 cc section first) along the gas line', 'Helium entering the flask down the shared connection', 'Gasometer valves closed · helium charged'],
    4: ['Preparing transfer · Pump A and inlet-control valves closed', 'Pump A, Port R, inlet-control, flow-control and Flask valves opening', 'Sample travelling from Pump A to the flask inlet', 'Oil drops and collects in the flask · gas rises back up the shared connection to the 2,000 cc section', 'Valves closed · 50 cc flashed'],
    5: ['Preparing collection · Balloon Valve closed', 'Gasometer valves and the Balloon Valve opening', 'Gas leaving the 2,000 cc section along the gas line', 'Gas entering the blue balloon', 'Valves closed · balloon filled']
  };
  var DONE = {                                                // Main.js FX_DONE
    2: 'Flash Unit evacuated · 0.0 psia',
    3: 'Helium charged · 14.7 psia · Gasometer empty',
    4: '50 cc flashed · 40 g oil · 400 cc gas',
    5: 'Balloon 250 cc · 14.5 psi · 150 cc left in gasometer'
  };
  function dur(n) { return BASE[n] * PSM + (n === 2 ? 2 * CONN : 0); }
  var phaseOf = function (n, p) { return p < FXP.valve ? 0 : p < FXP.flow ? 1 : p < RECV[n] ? 2 : p < FXP.end ? 3 : 4; };

  /* ---------------- density -> 60 F reference (API MPMS Ch. 11.1 / ASTM D1250, crude oil) ----------------
     Simplified 1980-table form: alpha60 = K0 / rho60^2 + K1 / rho60 (crude oil K0 = 341.0957, K1 = 0),
     CTL = exp(-alpha60 dT (1 + 0.8 alpha60 dT)), dT = t(F) - 60, rho in kg/m3. Atmospheric pressure: CPL = 1.
     rho60 is found by iteration from the reading at the measuring temperature. */
  var DC = {
    K0: 341.0957, K1: 0, RHOW60: 999.016,                     // water at 60 F, kg/m3 (API MPMS 11.1)
    ctl: function (rho60, tC) { var dT = tC * 1.8 + 32 - 60, a = this.K0 / (rho60 * rho60) + this.K1 / rho60; return Math.exp(-a * dT * (1 + 0.8 * a * dT)); },
    rho60: function (rhoT, tC) { var r = rhoT; for (var i = 0; i < 30; i++) r = rhoT / this.ctl(r, tC); return r; },
    api: function (sg) { return 141.5 / sg - 131.5; }
  };
  var REP = (window.PVT_REPORT && window.PVT_REPORT.flash) || {};
  var STO60 = REP.sto_den || 801.2574;                          // kg/m3, project stock-tank oil density (60 F basis)
  var T_MEAS = 25.00;                                           // example density set temperature, deg C
  var T_START = 22.4;                                           // illustrative sample temperature at injection
  var ALIQ_ML = 2.0;                                            // illustrative syringe aliquot, mL
  var GASO_T = 22.0;                                            // example gasometer temperature display, deg C (not carried by the simulator)
  var RHO_T = Math.round(STO60 * DC.ctl(STO60, T_MEAS) / 1000 * 1e5) / 1e5;   // displayed reading, g/cm3 (5 dp)
  var RES = (function () {
    var r60 = DC.rho60(RHO_T * 1000, T_MEAS), sg = r60 / DC.RHOW60;
    return { rho: RHO_T, T: T_MEAS, rho60: r60 / 1000, sg: sg, api: DC.api(sg), ctl: DC.ctl(r60, T_MEAS) };
  })();
  var ALIQ_G = Math.round(ALIQ_ML * RHO_T * 100) / 100;

  /* ---------------- state (one instance per view: the preview and each Details demo) ---------------- */
  function create() {
  var S;
  function reset() {
    S = { fQ: 0, fStep: 0, fStage: 0, fBusy: false, fuP: 14.7, fHe: 0, fHeGas: 3000, fPumpA: 80, fFlashed: 0, fOil: 0, fGaso: 0, fGasoProduced: 0,
      fBalloon: 0, fVac: false, fMeasured: false, fPath: 'idle', fPr: 0, fClk: 0, fDur: 1, fVer: 0, fStatus: 'Awaiting Stable Sample',
      dmP: 0, dmDone: false };
  }
  reset();

  function vals(n, p) {
    if (n === 2) return { fuP: 14.7 * (1 - E(R(0.15, 0.88, p))) };
    if (n === 3) return { fHeGas: 3000 * (1 - R(0.15, 0.90, p)), fHe: R(0.36, 0.88, p), fuP: 14.7 * E(R(0.36, 0.88, p)) };
    if (n === 4) { var g = 400 * R(0.47, 0.90, p); return { fPumpA: 80 - 50 * R(0.15, 0.90, p), fFlashed: 50 * R(RECV[4], 0.90, p), fOil: 40 * R(0.42, 0.90, p), fGaso: g, fGasoProduced: g }; }
    if (n === 5) return { fGaso: 400 - 250 * R(0.15, 0.90, p), fBalloon: 250 * R(0.40, 0.90, p) };
    return {};
  }
  var DONEVALS = {
    1: { fVer: 1, fStatus: 'Stable · 80 cc @ 5,000 psi' },
    2: { fuP: 0, fVac: false, fStatus: 'Vacuumed · 0 psia' },
    3: { fHe: 1, fHeGas: 0, fuP: 14.7, fStatus: 'Helium Charged · Gasometer Empty' },
    4: { fPumpA: 30, fFlashed: 50, fOil: 40, fGaso: 400, fGasoProduced: 400, fStatus: 'Flash Complete · 50 cc' },
    5: { fGaso: 150, fBalloon: 250, fStatus: 'Balloon Filled · 14.5 psi' },
    6: { fMeasured: true, fStatus: 'Oil in Glass · Gas in Balloon' },
    7: { dmP: 1, dmDone: true, fStatus: 'Density ' + RES.rho.toFixed(5) + ' g/cm³ @ 25 °C · ' + RES.api.toFixed(1) + ' °API' }
  };
  function start(n) {
    if (n < 1 || n > 7) return;
    S.fBusy = true; S.fStage = n; S.fPr = 0; S.fQ = 0; S.fClk = 0; S.fDur = dur(n);
    var path = { 2: 'vac', 3: 'he', 4: 'sample', 5: 'balloon' }[n] || 'idle';
    S.fPath = path; S.fVac = n === 2;
    S.fStatus = n === 1 ? 'Verifying Stable Sample' : n === 2 ? 'Connecting the temporary vacuum pump' : n === 6 ? 'Measuring Oil and Gas' : n === 7 ? 'Sampling flashed oil for density' : TXT[n][0];
  }
  function finish() {
    var n = S.fStage;
    Object.assign(S, DONEVALS[n] || {}, { fBusy: false, fStage: 0, fStep: n, fPath: 'idle', fPr: 1 });
  }
  function tick(dt) {
    if (!S.fBusy) return;
    var n = S.fStage;
    S.fClk += dt; var q = Math.min(1, S.fClk / S.fDur), c0 = n === 2 ? CONN / S.fDur : 0, p = n === 2 ? R(c0, 1 - c0, q) : q;
    S.fPr = p; S.fQ = q;
    if (n === 1) S.fVer = p;
    else if (n >= 2 && n <= 5) {
      Object.assign(S, vals(n, p)); S.fStatus = TXT[n][phaseOf(n, p)];
      if (n === 2 && q < c0) S.fStatus = 'Temporary vacuum pump placed beside the unit · hose connected to the vacuum quick-connect';
      if (n === 2 && q > 1 - c0) S.fStatus = 'Vacuum valve closed · hose disconnected · pump removed';
    }
    else if (n === 7) { S.dmP = p; S.fStatus = dmPhase(p).msg; }
    if (q >= 1) finish();
  }
  // run stages instantly (replay / jump), using each stage's own end values
  function jump(list) { reset(); list.forEach(function (n) { start(n); S.fClk = S.fDur; tick(0); }); }

  /* ---------------- stage 7 timeline ---------------- */
  function dmPhase(p) {
    if (p < 0.10) return { k: 'move', msg: 'Syringe fitted to the flask side-arm (stopcock closed)' };
    if (p < 0.14) return { k: 'open', msg: 'Side-arm stopcock opening' };
    if (p < 0.26) return { k: 'draw', msg: 'Drawing a ' + ALIQ_ML.toFixed(1) + ' mL aliquot of the collected oil into the syringe' };
    if (p < 0.30) return { k: 'close', msg: 'Stopcock closed · aliquot taken (recorded oil unchanged)' };
    if (p < 0.42) return { k: 'carry', msg: 'Syringe connected to the density-meter inlet tube' };
    if (p < 0.54) return { k: 'inject', msg: 'Injecting: oil fills the U-tube, air is displaced to waste' };
    if (p < 0.58) return { k: 'check', msg: 'Filling check: U-tube full, no bubbles' };
    if (p < 0.72) return { k: 'temp', msg: 'Start · stabilizing the cell at 25.00 °C' };
    if (p < 0.84) return { k: 'meas', msg: 'Measuring the U-tube oscillation period' };
    if (p < 0.90) return { k: 'calc', msg: 'Calculating density at 60 °F, SG 60/60 °F and °API' };
    if (p < 0.92) return { k: 'done', msg: 'Finished · results recorded' };
    return { k: 'flush', msg: 'Finished · used sample pushed to the waste container' };
  }

  var DMK = { move: 'SYRINGE TO FLASK', open: 'STOPCOCK OPEN', draw: 'DRAWING ALIQUOT', close: 'STOPCOCK CLOSED', carry: 'CONNECTING SYRINGE', inject: 'FILLING CELL', check: 'FILLING CHECK', temp: 'STABILIZING', meas: 'MEASURING', calc: 'CALCULATING', done: 'FINISHED', flush: 'FINISHED · FLUSH' };
  /* ---------------- view model for the drawings ---------------- */
  function vm(t) {
    var busy = S.fBusy, n = busy ? S.fStage : 0, p = S.fPr, act = function (st) { return busy && st.indexOf(n) >= 0 ? fxValve(p) : 0; };
    var fade = busy ? 1 - R(FXP.end, FXP.shut, p) : 0;
    var V = { t: t, busy: busy, stage: n, p: p, step: S.fStep, path: S.fPath, fuP: S.fuP, pumpA: S.fPumpA, flashed: S.fFlashed, oil: S.fOil, oilRec: S.fOil,
      balloon: S.fBalloon, measured: S.fMeasured, ver: n === 1 ? S.fVer : 0, status: S.fStatus };
    // Gasometer: the existing total, split 2,000 cc section first, 1,000 cc section for the rest
    var usingGas = S.fGaso > 0.5, total = usingGas ? S.fGaso : S.fHeGas, sp = window.Gasometer ? window.Gasometer.split(total) : { k2: Math.min(total, 2000), k1: Math.max(0, total - 2000) };
    V.gasoVol = total; V.gasoMode = usingGas ? 'gas' : 'he'; V.gaso = S.fGaso; V.heGas = S.fHeGas; V.gaso2k = sp.k2; V.gaso1k = sp.k1; V.gasoT = GASO_T;
    var sec = n === 3 && S.fHeGas > 2000 ? '1k' : '2k', g = act([3, 4, 5]);
    V.gasoSec = sec;
    V.valve = { pumpA: act([4]), inlet: act([4]), flask: act([2, 3, 4]), vac: act([2]), vessel: act([5]),
      in2k: sec === '2k' ? g : 0, iso2k: sec === '2k' ? g : 0, in1k: sec === '1k' ? g : 0, iso1k: sec === '1k' ? g : 0, gaso: g };
    // temporary vacuum pump (Stage 2 only): wheeled in, hose attached, then detached and removed
    var qq = S.fQ, c0 = n === 2 ? CONN / S.fDur : 0;
    V.vacPump = n === 2 ? R(0, c0 * 0.5, qq) * (1 - R(1 - c0 * 0.5, 1, qq)) : 0;
    V.vacHose = n === 2 ? R(c0 * 0.5, c0, qq) * (1 - R(1 - c0, 1 - c0 * 0.5, qq)) : 0;
    // flow routes: progress p plus fade (the scene maps p onto the route geometry with its own keyframes)
    V.flow = {};
    if (n === 2) V.flow.vac = { p: p, a: fade };
    if (n === 3) { V.flow['he' + sec] = { p: p, a: fade }; }
    if (n === 4) { V.flow.sample = { p: p, a: fade }; V.flow.gas = { p: p, a: fade }; }
    if (n === 5) V.flow.vessel = { p: p, a: fade };
    V.flowOn = n === 4 && p >= FXP.flow && p < FXP.end;
    // flask contents
    var gasShare = n === 4 ? R(0.40, 0.90, p) : (S.fStep >= 4 ? 1 : 0);
    V.heTint = S.fHe * (1 - gasShare);
    V.gasTint = gasShare;
    V.vacTint = n === 2 ? R(0.15, 0.88, p) * (1 - R(0.9, 1, p)) : 0;
    V.heIn = n === 3 ? R(0.34, 0.38, p) * (1 - R(0.85, 0.93, p)) : 0;
    V.airOut = n === 2 ? R(0.12, 0.16, p) * (1 - R(0.80, 0.90, p)) : 0;
    V.drip = n === 4 && p < 0.97 ? { u: S.fOil / 40, pre: R(0.36, 0.42, p) } : null;
    V.dripOn = n === 4 && p > 0.36 && p < 0.90;
    V.bubbles = n === 4 ? R(0.37, 0.42, p) * (1 - R(0.86, 0.95, p)) : 0;
    // stage 7: aliquot + density meter (illustrative timeline, results from RES)
    var q = S.dmDone ? 1 : (n === 7 ? S.dmP : 0), aliq = ALIQ_G * R(0.14, 0.26, q);
    V.oil = S.fOil - aliq;
    V.bal = 200 + V.oil;
    V.aliq = aliq;
    V.cock = n === 7 ? R(0.10, 0.14, q) * (1 - R(0.26, 0.30, q)) : 0;
    V.dm = { phase: 'await', inj: 0, flush: 0, air: 0, T: T_MEAS, Tset: T_MEAS, prog: 0, start: 0, osc: 0, res: {} };
    if (q > 0) {
      var bump = R(0.42, 0.54, q) * (1 - R(0.58, 0.70, q));
      V.dm.inj = R(0.42, 0.54, q); V.dm.flush = R(0.92, 0.99, q);
      V.dm.air = q > 0.42 && q < 0.55 ? 1 : 0;
      V.dm.phase = q < 0.42 ? 'await' : q < 0.58 ? 'fill' : q < 0.72 ? 'temp' : q < 0.84 ? 'meas' : q < 0.90 ? 'calc' : 'done';
      V.dm.T = T_MEAS - (T_MEAS - T_START) * 0.6 * bump * (q < 0.58 ? 1 : Math.exp(-3 * R(0.58, 0.70, q)));
      V.dm.prog = R(0.42, 0.90, q);
      V.dm.start = R(0.575, 0.585, q) * (1 - R(0.60, 0.61, q));
      V.dm.osc = q >= 0.58 && q < 0.84 ? 1 : 0;
      if (q >= 0.90) V.dm.res = RES;
      V.syr = { q: q, ph: dmPhase(q).k };
    }
    V.dmQ = q;
    return V;
  }

  function phaseInfo() {
    var n = S.fBusy ? S.fStage : S.fStep;
    if (!n) return null;
    var p = S.fBusy ? S.fPr : 1;
    if (n === 2 && S.fBusy && (S.fQ < CONN / S.fDur || S.fQ > 1 - CONN / S.fDur)) return { n: 2, phase: S.fQ < 0.5 ? 'CONNECTING PUMP' : 'DISCONNECTING PUMP', k: S.fQ < 0.5 ? 0 : 4, msg: S.fStatus };
    if (n >= 2 && n <= 5) { var k = S.fBusy ? phaseOf(n, p) : 4; return { n: n, phase: PHASES[k], k: k, msg: S.fBusy ? TXT[n][k] : DONE[n] }; }
    if (n === 7) { var d = dmPhase(p); return { n: n, phase: S.fBusy ? DMK[d.k] : 'COMPLETE', k: S.fBusy ? Math.min(3, Math.floor(p * 4)) : 4, msg: d.msg }; }
    return { n: n, phase: S.fBusy ? 'RUNNING' : 'COMPLETE', k: S.fBusy ? 2 : 4, msg: S.fStatus };
  }

  return { reset: reset, start: start, tick: tick, jump: jump, vm: vm, phaseInfo: phaseInfo, get S() { return S; } };
  }

  window.FlashSim = {
    NAMES: NAMES, ACTIONS: ACTIONS, PHASES: PHASES, RECV: RECV, FXP: FXP, RES: RES, DC: DC, STO60: STO60, T_MEAS: T_MEAS, T_START: T_START,
    ALIQ_ML: ALIQ_ML, ALIQ_G: ALIQ_G, GASO_T: GASO_T, CONN: CONN, dur: dur, create: create
  };
})();
