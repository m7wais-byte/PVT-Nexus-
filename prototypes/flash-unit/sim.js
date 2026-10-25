/* Flash Process — prototype simulation model.

   Stages 1–6 reproduce components/Main.js runFlashStage() exactly: same values, same ramps, same
   valve timing (FXP), same stage durations (5.0 s base, 5.3 s for the flash, x PROCESS_SPEED_MULTIPLIER
   1.7 from timing.js). Only the flow-lane timing inside the drawing changes, because the lanes now
   follow the corrected route (sample -> flask -> headspace -> gasometer).

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
  var RECV = { 2: 0.38, 3: 0.36, 4: 0.287, 5: 0.40 };                    // Main.js FX[n].recv
  var NAMES = ['Stable Sample', 'Vacuum Unit', 'Fill Helium', 'Flash Sample', 'Collect Gas', 'Collect Oil', 'Density & API'];
  var ACTIONS = ['Confirm Stable Sample', 'Vacuum Flash Unit', 'Fill with Helium', 'Start Flash', 'Collect Gas into Balloon', 'Collect Oil and Gas', 'Measure Density & API'];
  var PHASES = ['PREPARING', 'VALVE OPEN', 'FLOWING', 'RECEIVING', 'TRANSFER COMPLETE'];
  var TXT = {
    2: ['Preparing evacuation · vacuum valve closed', 'Vacuum valve opening', 'Air drawn from the flask headspace through the gas outlet to the vacuum pump', 'Air drawn from the flask headspace through the gas outlet to the vacuum pump', 'Vacuum valve closed · Flash Unit at 0 psia'],
    3: ['Preparing helium transfer · gasometer valve closed', 'Gasometer valve opening', 'Helium flowing from the gasometer along the gas line', 'Helium entering the flask through the gas outlet', 'Gasometer valve closed · helium charged'],
    4: ['Preparing transfer · Pump A and inlet control valves closed', 'Pump A, Port R and inlet control valves opening', 'Sample travelling from Pump A to the flask inlet', 'Sample flashing in the flask · oil collects, gas leaves the headspace to the gasometer', 'Valves closed · 50 cc flashed'],
    5: ['Preparing collection · balloon valve closed', 'Gasometer and balloon valves opening', 'Gas flowing from the gasometer along the gas line', 'Gas entering the balloon', 'Valves closed · balloon filled']
  };
  var DONE = {                                                // Main.js FX_DONE
    2: 'Flash Unit evacuated · 0.0 psia',
    3: 'Helium charged · 14.7 psia · Gasometer empty',
    4: '50 cc flashed · 40 g oil · 400 cc gas',
    5: 'Balloon 250 cc · 14.5 psi · 150 cc left in gasometer'
  };
  function dur(n) { return BASE[n] * PSM; }
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
  var T_MEAS = 20.00;                                           // example measuring temperature, deg C
  var T_START = 22.4;                                           // illustrative sample temperature at injection
  var ALIQ_ML = 2.0;                                            // illustrative syringe aliquot, mL
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
    S = { fStep: 0, fStage: 0, fBusy: false, fuP: 14.7, fHe: 0, fHeGas: 3000, fPumpA: 80, fFlashed: 0, fOil: 0, fGaso: 0, fGasoProduced: 0,
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
    7: { dmP: 1, dmDone: true, fStatus: 'Density ' + RES.rho.toFixed(5) + ' g/cm³ @ 20 °C · ' + RES.api.toFixed(1) + ' °API' }
  };
  function start(n) {
    if (n < 1 || n > 7) return;
    S.fBusy = true; S.fStage = n; S.fPr = 0; S.fClk = 0; S.fDur = dur(n);
    var path = { 2: 'vac', 3: 'he', 4: 'sample', 5: 'balloon' }[n] || 'idle';
    S.fPath = path; S.fVac = n === 2;
    S.fStatus = n === 1 ? 'Verifying Stable Sample' : n === 6 ? 'Measuring Oil and Gas' : n === 7 ? 'Sampling flashed oil for density' : TXT[n][0];
  }
  function finish() {
    var n = S.fStage;
    Object.assign(S, DONEVALS[n] || {}, { fBusy: false, fStage: 0, fStep: n, fPath: 'idle', fPr: 1 });
  }
  function tick(dt) {
    if (!S.fBusy) return;
    var n = S.fStage;
    S.fClk += dt; var p = Math.min(1, S.fClk / S.fDur); S.fPr = p;
    if (n === 1) S.fVer = p;
    else if (n >= 2 && n <= 5) { Object.assign(S, vals(n, p)); S.fStatus = TXT[n][phaseOf(n, p)]; }
    else if (n === 7) { S.dmP = p; S.fStatus = dmPhase(p).msg; }
    if (p >= 1) finish();
  }
  // run stages instantly (replay / jump), using each stage's own end values
  function jump(list) { reset(); list.forEach(function (n) { start(n); S.fClk = S.fDur; tick(0); }); }

  /* ---------------- stage 7 timeline ---------------- */
  function dmPhase(p) {
    if (p < 0.10) return { k: 'move', msg: 'Syringe fitted to the flask side-arm (stopcock closed)' };
    if (p < 0.14) return { k: 'open', msg: 'Side-arm stopcock opening' };
    if (p < 0.26) return { k: 'draw', msg: 'Drawing a ' + ALIQ_ML.toFixed(1) + ' mL oil aliquot from the collected oil' };
    if (p < 0.30) return { k: 'close', msg: 'Stopcock closed · aliquot taken' };
    if (p < 0.46) return { k: 'carry', msg: 'Syringe carried to the density-meter inlet' };
    if (p < 0.58) return { k: 'inject', msg: 'Injecting: U-tube filling, excess to waste' };
    if (p < 0.62) return { k: 'bubble', msg: 'Filling check: no bubbles in the U-tube' };
    if (p < 0.78) return { k: 'temp', msg: 'Temperature equilibrium at 20.00 °C' };
    if (p < 0.92) return { k: 'meas', msg: 'Measuring the oscillation period' };
    return { k: 'done', msg: 'Density, SG 60/60 °F and °API recorded' };
  }

  /* ---------------- view model for the drawings ---------------- */
  function vm(t) {
    var busy = S.fBusy, n = busy ? S.fStage : 0, p = S.fPr, act = function (st) { return busy && st.indexOf(n) >= 0 ? fxValve(p) : 0; };
    var fade = busy ? 1 - R(FXP.end, FXP.shut, p) : 0;
    var V = { t: t, busy: busy, stage: n, p: p, step: S.fStep, path: S.fPath, fuP: S.fuP, pumpA: S.fPumpA, flashed: S.fFlashed, oil: S.fOil, oilRec: S.fOil,
      balloon: S.fBalloon, measured: S.fMeasured, ver: n === 1 ? S.fVer : 0, status: S.fStatus };
    V.valve = { pumpA: act([4]), inlet: act([4]), gaso: act([3, 4, 5]), bal: act([5]), vac: act([2]) };
    // flow routes: progress p plus fade (the scene maps p onto the route geometry with its own keyframes)
    V.flow = {};
    if (n === 2) V.flow.vac = { p: p, a: fade };
    if (n === 3) V.flow.he = { p: p, a: fade };
    if (n === 4) { V.flow.sample = { p: p, a: fade }; V.flow.gas = { p: p, a: fade }; }
    if (n === 5) V.flow.balloon = { p: p, a: fade };
    // flask contents
    var gasShare = n === 4 ? R(0.40, 0.90, p) : (S.fStep >= 4 ? 1 : 0);
    V.heTint = S.fHe * (1 - gasShare);
    V.gasTint = gasShare;
    V.heIn = n === 3 ? R(0.34, 0.38, p) * (1 - R(0.85, 0.93, p)) : 0;
    V.airOut = n === 2 ? R(0.12, 0.16, p) * (1 - R(0.80, 0.90, p)) : 0;
    V.drip = n === 4 && p < 0.97 ? { u: S.fOil / 40, pre: R(0.36, 0.42, p) } : null;
    V.dripOn = n === 4 && p > 0.36 && p < 0.90;
    V.bubbles = n === 4 ? R(0.37, 0.42, p) * (1 - R(0.86, 0.95, p)) : 0;
    // gasometer: one chamber, helium first, then the same chamber for flashed gas (Main.js _usingGas)
    var usingGas = S.fGaso > 0.5;
    V.gasoVol = usingGas ? S.fGaso : S.fHeGas; V.gasoMode = usingGas ? 'gas' : 'he'; V.gaso = S.fGaso; V.heGas = S.fHeGas;
    V.gasoMove = (n === 3 && p > 0.15 && p < 0.9) || (n === 5 && p > 0.15 && p < 0.9) ? -1 : (n === 4 && p > 0.47 && p < 0.9) ? 1 : 0;
    // stage 7: aliquot + density meter (illustrative timeline, results from RES)
    var q = S.dmDone ? 1 : (n === 7 ? S.dmP : 0), aliq = ALIQ_G * R(0.14, 0.26, q);
    V.oil = S.fOil - aliq * (S.fStep >= 6 || n === 7 ? 1 : 0);
    V.bal = 200 + V.oil;
    V.aliq = aliq;
    V.cock = n === 7 ? R(0.10, 0.14, q) * (1 - R(0.26, 0.30, q)) : 0;
    V.dm = { phase: 'ready', fill: 0, waste: 0, T: null, Tset: T_MEAS, prog: 0, osc: 0, res: {} };
    if (q > 0) {
      var ph = dmPhase(q).k;
      V.dm.fill = R(0.46, 0.56, q); V.dm.waste = R(0.54, 0.58, q);
      V.dm.phase = q < 0.46 ? 'ready' : q < 0.58 ? 'load' : q < 0.62 ? 'bubble' : q < 0.78 ? 'temp' : q < 0.92 ? 'meas' : 'done';
      V.dm.T = q < 0.46 ? T_MEAS : q < 0.62 ? T_START : q < 0.78 ? T_MEAS + (T_START - T_MEAS) * Math.exp(-6 * R(0.62, 0.76, q)) * (1 - R(0.74, 0.78, q)) : T_MEAS;
      V.dm.prog = R(0.46, 0.92, q);
      V.dm.osc = q >= 0.62 && q < 0.92 ? 1 : 0;
      if (q >= 0.92) V.dm.res = RES;
      V.syr = { q: q, ph: ph };
    }
    V.dmQ = q;
    return V;
  }

  function phaseInfo() {
    var n = S.fBusy ? S.fStage : S.fStep;
    if (!n) return null;
    var p = S.fBusy ? S.fPr : 1;
    if (n >= 2 && n <= 5) { var k = S.fBusy ? phaseOf(n, p) : 4; return { n: n, phase: PHASES[k], k: k, msg: S.fBusy ? TXT[n][k] : DONE[n] }; }
    if (n === 7) { var d = dmPhase(p); return { n: n, phase: S.fBusy ? 'MEASURING' : 'COMPLETE', k: S.fBusy ? Math.min(3, Math.floor(p * 4)) : 4, msg: d.msg }; }
    return { n: n, phase: S.fBusy ? 'RUNNING' : 'COMPLETE', k: S.fBusy ? 2 : 4, msg: S.fStatus };
  }

  return { reset: reset, start: start, tick: tick, jump: jump, vm: vm, phaseInfo: phaseInfo, get S() { return S; } };
  }

  window.FlashSim = {
    NAMES: NAMES, ACTIONS: ACTIONS, PHASES: PHASES, RECV: RECV, FXP: FXP, RES: RES, DC: DC, STO60: STO60, T_MEAS: T_MEAS, T_START: T_START,
    ALIQ_ML: ALIQ_ML, ALIQ_G: ALIQ_G, dur: dur, create: create
  };
})();
