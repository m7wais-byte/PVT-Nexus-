/* component: StageDiffLib */
(function () {
// ===== Differential Liberation =====
// One stage engine drives Stages 1-6; each stage supplies only its own numbers (STAGE_DATA).
// Initial PV and every stage PV test run the Validation PV Test itself (StagePVTest) with a stage configuration.
const V_CHARGE = 80.0000, P_CHARGE = 5000, FLOW = 0.5;
const r4 = (x) => Math.round(x * 10000) / 10000;
const fmtP = (p) => Number(p).toLocaleString('en-US') + ' psig';
// shared Validation engines (read lazily: StagePVTest.js / Main.js load after this file)
const PVX = () => window.PVT_PV;
const FXX = () => window.PVT_FX;

// ---- Initial PV on the 80 cc charge : the Validation PV schedule (12 points, same pressures) ----
// Measured anchors: 80.00 cc @ 5,000 psig (charge) and Psat 2,500 psig @ 83.08 cc.
// Above Psat : linear between the two anchors.  Below Psat : the Validation two-phase slope
// (0.3 cc per 100 psi on 30 cc) scaled to the 80 cc charge = 0.8 cc per 100 psi — illustrative, not measured.
const PV_INIT_PTS = [5000, 4500, 4000, 3500, 3000, 2500].map(p => [p, r4(80 + (83.08 - 80) * (5000 - p) / 2500)])
  .concat([2400, 2300, 2200, 2100, 2000, 1900].map(p => [p, r4(83.08 + (2500 - p) * 0.8 / 100)]));
const PV_INIT = { psat: { p: 2500, v: 83.08 }, pts: PV_INIT_PTS };
const PV_INIT_CFG = { data: PV_INIT_PTS, bubbleIdx: 5, start: [5000, 80], dec: 4, pu: 'psig',
  xMin: 79.4, xMax: 88.6, yMin: 1750, yMax: 5150, xTicks: [80, 82, 84, 86, 88], xTickDec: 0, yTicks: [5000, 4000, 3000, 2000],
  psatLabel: '2,500 psig @ 83.08 cc', psatBoxW: 150, boxW: 96 };

// ---- Stage 1 measured behaviour (supplied values, kept verbatim) ----
const S1_STAB = 86.4999, S1_VPRE = 84.5, S1_INC = 0.3;
// agitation targets: +0.3 cc per cycle, last increment trimmed so the series lands exactly on 86.4999
const S1_CYCLES = (() => { const a = []; let v = S1_VPRE; while (S1_STAB - v > S1_INC + 1e-9) { v = r4(v + S1_INC); a.push(v); } a.push(S1_STAB); return a; })();
// Stage 1 PV on the remaining sample. Above Psat : compressibility of the Initial PV. Below Psat : straight line
// through Psat (2,190 / 81.55) and the recorded 2,161 psig / 81.6815 cc.
const C_INIT = (83.08 - 80) / (83.08 * 2500);
const S1_PTS = [5000, 4500, 4000, 3500, 3000, 2500].map(p => [p, r4(81.55 * (1 - C_INIT * (p - 2190)))])
  .concat([[2190, 81.55]])
  .concat([2090, 1990, 1890, 1790, 1690].map(p => [p, r4(81.55 + (2190 - p) * (81.6815 - 81.55) / (2190 - 2161))]));
const PV_S1_CFG = { data: S1_PTS, bubbleIdx: 6, start: [2161, 81.6815], dec: 4, pu: 'psig',
  xMin: 77.6, xMax: 84.4, yMin: 1550, yMax: 5150, xTicks: [78, 80, 82, 84], xTickDec: 0, yTicks: [5000, 4000, 3000, 2000],
  psatLabel: '2,190 psig @ 81.55 cc', psatBoxW: 150, boxW: 96, liquidAtStart: true };

// ---- stage dataset : existing project values (psig / cc); nothing here is copied between stages ----
const STAGE_DATA = [
  { n: 1, target: 2161, vPre: S1_VPRE, cycles: S1_CYCLES, stab: S1_STAB, balloon: 9.91, gasometer: 0, remaining: 81.6815,
    psat: { p: 2190, v: 81.55 }, pts: S1_PTS, pvCfg: PV_S1_CFG, gPre: 1.30 },
  // Stage 6 : the remaining liquid at 203 psig is saturated (Psat = bubble point = 203 psig, volume at Psat = the
  // remaining 67.6952 cc, as Stage 3) and still holds dissolved gas, released by the Stage 7 final flash.
  // Stages 2-6 : supplied values (Sep 2026). pumpA / pumpB = stabilized pump readings; the stabilized cell volume
  // (stab) is Pump A + Pump B. psat.vs keeps the volume at Psat exactly as supplied (decimal places preserved).
  { n: 2, target: 1798, vPre: 86.5000, pumpA: 87.9785, pumpB: 0,       balloon: 14.82, gasometer: 28,  remaining: 79.0335, psat: { p: 1840, v: 79.035,  vs: '79.035' } },
  { n: 3, target: 1435, vPre: 86.3000, pumpA: 87.6695, pumpB: 0,       balloon: 14.75, gasometer: 0,   remaining: 76.5930, psat: { p: 1435, v: 76.5930, vs: '76.5930' } },
  { n: 4, target: 1000, vPre: 90.2000, pumpA: 92.9588, pumpB: 0,       balloon: 14.34, gasometer: 204, remaining: 73.7971, psat: { p: 1025, v: 73.55,   vs: '73.55' } },
  { n: 5, target: 565,  vPre: 94.8000, pumpA: 96.1584, pumpB: 10.9404, balloon: 14.75, gasometer: 217, remaining: 70.9411, psat: { p: 575,  v: 70.56,   vs: '70.56' } },
  { n: 6, target: 203,  vPre: 94.6000, pumpA: 97.6758, pumpB: 72.1726, balloon: 14.73, gasometer: 210, remaining: 67.6952, psat: { p: 203,  v: 67.6952, vs: '67.6952' } }
];
STAGE_DATA.forEach(d => { if (d.pumpA != null) d.stab = r4(d.pumpA + d.pumpB); else { d.pumpA = d.stab; d.pumpB = 0; } });
// the project's existing agitation schedule for stages without a measured cycle series:
// progressive expansion toward the stabilized volume (last target = stabilized volume exactly)
function expand(v0, vf) { return [.60, .862, .962, .991, 1].map(k => r4(v0 + (vf - v0) * k)); }
// the project's existing P-V generator (two legs meeting at the stage Psat), extended to the 12-point Validation count
function pvPoints(vr, psat) {
  const rA = Math.max(Math.abs((psat.v - vr) / (P_CHARGE - psat.p)), vr * 1.05e-5);
  const rB = Math.max(rA * 5.9, vr * 6e-5);
  const pts = [5000, 4500, 4000, 3500, 3000, 2500].filter(p => p > psat.p).map(p => [p, r4(psat.v - rA * (p - psat.p))]);
  pts.push([psat.p, r4(psat.v)]);
  for (let k = 1; pts.length < 12 && k < 12; k++) {
    const d = psat.p * 0.08 * k, p = Math.round(psat.p - d);
    if (p > 40) pts.push([p, r4(psat.v + rB * d)]);
  }
  return pts;
}
function niceStep(r) { return r <= 5 ? 1 : r <= 10 ? 2 : r <= 25 ? 5 : 10; }
function pvCfgFor(start, pts, psat) {
  const vs = pts.map(q => q[1]).concat([start[1]]), ps = pts.map(q => q[0]).concat([start[0]]);
  const vMin = Math.min.apply(null, vs), vMax = Math.max.apply(null, vs), pMin = Math.min.apply(null, ps);
  const pad = Math.max(0.4, (vMax - vMin) * 0.08), xMin = Math.floor((vMin - pad) * 10) / 10, xMax = Math.ceil((vMax + pad) * 10) / 10;
  const stp = niceStep(xMax - xMin), xTicks = [];
  for (let t = Math.ceil(xMin / stp) * stp; t <= xMax; t += stp) xTicks.push(t);
  const yMin = Math.max(0, Math.floor((pMin - 150) / 50) * 50);
  return { data: pts, bubbleIdx: pts.findIndex(q => q[0] === psat.p), start: start, dec: 4, pu: 'psig',
    xMin, xMax, yMin, yMax: 5150, xTicks, xTickDec: 0, yTicks: [5000, 4000, 3000, 2000, 1000].filter(p => p > yMin + 120),
    psatLabel: psat.p + ' psig @ ' + (psat.vs || psat.v.toFixed(2)) + ' cc', psatPTxt: psat.p + ' psig', psatVolTxt: (psat.vs || psat.v.toFixed(2)) + ' cc',
    psatBoxW: 150, boxW: 96, liquidAtStart: true };
}
// full per-stage configuration: inherited start, schedule, gas split, PV data, and any missing fields
const CFG = {};
STAGE_DATA.forEach((d, i) => {
  const prev = i ? STAGE_DATA[i - 1] : null;
  const c = Object.assign({}, d);
  c.id = 'stage' + d.n;
  c.pStart = prev ? prev.target : P_CHARGE;            // inherited condition = previous stage's remaining liquid
  c.vStart = prev ? prev.remaining : V_CHARGE;
  c.gasFrom = prev ? prev.target : PV_INIT.psat.p;     // pressure below which liberated gas appears
  c.missing = []; c.notes = [];
  if (!c.cycles) {
    // supplied pre-agitation volume; cycle increments keep the existing progressive expansion shape, last target = stabilized
    c.cycles = [.655, .905, .9775, 1].map(k => k === 1 ? c.stab : r4(c.vPre + (c.stab - c.vPre) * k));
    c.notes.push('Cycle increments between the supplied pre-agitation and stabilized volumes follow the existing progressive expansion schedule.');
  }
  c.gEq = c.stab - c.remaining;                        // gas cap at equilibrium = stabilized - remaining liquid
  if (c.gPre == null) c.gPre = c.gEq * (c.vPre - c.vStart) / (c.stab - c.vStart);
  c.balloonCc = 250 * c.balloon / 14.5;                // Validation balloon scale: 250 cc = 14.5 psi
  const gasTot = c.balloonCc + c.gasometer;
  c.fBal = gasTot > 0 ? c.balloonCc / gasTot : 1;      // share of the removed cell volume taken by the balloon
  if (!c.psat) c.missing.push('Psat and volume at Psat (not in the dataset)');
  else if (!(c.psat.v >= c.remaining * 0.9 && c.psat.v <= c.stab)) c.missing.push('Volume at Psat — dataset value ' + c.psat.v + ' cc is outside the cell range (' + c.remaining.toFixed(2) + '–' + c.stab.toFixed(2) + ' cc)');
  c.pvOK = !c.missing.length;
  if (c.pvOK && !c.pts) { c.pts = pvPoints(c.remaining, c.psat); c.notes.push('P–V points from the existing two-leg generator anchored at the stage Psat.'); }
  if (c.pvOK && !c.pvCfg) c.pvCfg = pvCfgFor([c.target, c.remaining], c.pts, c.psat);
  c.psatVs = c.psat ? (c.psat.vs || c.psat.v.toFixed(2)) : '';
  c.psatStr = c.psat && c.pvOK ? c.psat.p + ' psig @ ' + c.psatVs + ' cc' : null;
  c.psatPre = c.n >= 2 ? 'Psat = ' : 'Psat: ';
  CFG[c.id] = c;
});

// read-only copy for the Two-Phase Viscosity test (StageViscTwo.js) - same pressures and cell volumes as this module
window.PVT_DL = { charge: { p: P_CHARGE, v: V_CHARGE }, stages: STAGE_DATA.map(d => {
  const c = CFG['stage' + d.n]; return { n: d.n, target: d.target, vPre: d.vPre, stab: d.stab, remaining: d.remaining, gPre: c.gPre, gEq: c.gEq };
}) };

// ---- Stage 7 · Final flash: the remaining Stage 6 liquid (203 psig = its Psat, gas still dissolved) is recompressed
// to 2,500 psig, then flashed to stock-tank conditions through the approved Flash Process. Recompression only: no oil
// or gas is added, no recombination, the sample is not replaced. Rs becomes 0 only after this flash.
//  * Volume along the recompression: the Stage 6 P-V table of this module above its Psat (two-leg generator);
//    above Psat that table is illustrative (generated compressibility), not a measured volume.
//  * Final-flash gas, oil mass, Rs at 203 psig and the residual-oil volume come from data/dl-final-flash.js
//    (PVT_REPORT.dl_final). The gas volume is a REQUIRED INPUT not held in the project data: while it is missing,
//    the gas is drawn separating and reaching the Gasometer, and its readings say "input required".
//  * Density & API: the density-meter example values (FlashSim.RES, stock-tank oil density of the project).
const P_FINAL = 2500, S6 = CFG.stage6;
const FINAL_PATH = [[S6.target, S6.remaining]]
  .concat(S6.pts.filter(q => q[0] > S6.target && q[0] <= P_FINAL).sort((a, b) => a[0] - b[0]));
const V_FINAL = FINAL_PATH[FINAL_PATH.length - 1][1];          // 2,500 psig point of the Stage 6 P-V table
function volAt(P) {
  const pts = FINAL_PATH;
  if (P <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (P <= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (P - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
  return pts[pts.length - 1][1];
}
const DLF = () => (window.PVT_REPORT && window.PVT_REPORT.dl_final) || { known: false };
let FINAL_PROF = null;                                          // built on first use (FlashSim / report data loaded by then)
function finalProf() {
  if (FINAL_PROF) return FINAL_PROF;
  const D = (window.PVT_REPORT && window.PVT_REPORT.dl_final) || { known: false, gasScc: null, oilMassG: null, liqMassG: 0, required: [] };
  const RES = FlashSim.RES, gas = D.known ? D.gasScc : null, oil = D.known ? D.oilMassG : null;
  FINAL_PROF = { key: 'dlFinal', pumpA0: V_FINAL, flashed: V_FINAL, oil, oilVis: D.liqMassG, gas, bal: gas == null ? 0 : Math.min(250, gas), he: 3000, vDec: 4,
    stable: 'Stable · ' + V_FINAL.toFixed(4) + ' cc @ 2,500 psig', res: RES, D,
    vSto: D.known ? D.vRes : null,                               // residual oil at 60 °F, calculated (mass / stock-tank density, data/dl-final-flash.js)
    noGas: 'no gas evolves' };
  return FINAL_PROF;
}
// readings that depend on the final-flash gas volume (required input)
const gTxt = (FP) => FP.gas == null ? 'input required' : Math.round(FP.gas).toLocaleString('en-US') + ' scc';
const oTxt = (FP) => FP.oil == null ? 'input required' : FP.oil.toFixed(2) + ' g';
const FINAL_STEPS = ['Recompress to 2,500 psig'].concat(['Stable Sample', 'Vacuum Unit', 'Fill Helium', 'Flash Sample', 'Collect Gas', 'Collect Oil', 'Density & API']);

const IDS = ['initpv', 'stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'final'];
const STEPS = { initpv: 2, stage1: 5, stage2: 5, stage3: 5, stage4: 5, stage5: 5, stage6: 5, final: 8 };
// ---- agitation transfer model (visual phase split only; stage numbers unchanged) ----
const PUMP_CAP = 100;                                 // one pump bore = 100 cc (173 px, Validation true scale)
// deterministic bubble seeds (no random jumps between renders)
const DL_BUBS = Array.from({ length: 16 }, (_, k) => ({ fx: (k * 0.618034 + 0.07) % 1, ph: (k * 0.381966 + 0.13) % 1,
  sp: 0.75 + ((k * 0.7549) % 1) * 0.5, r: 1.0 + ((k * 0.5698) % 1) * 1.1, th: k / 16 }));
// approved flash equipment on this page's drawing (page units; approved cell on the legacy frame shifted -506,-20):
// gas lane Pump A -> header -> Port R, outlet line from the Port R fitting, Flash Unit, Gasometer
const DL_FX = { cellPort: [641.6, 170], cellLane: [[524, 192], [524, 170], [641.6, 170]], lineX: 30, connLine: true, labelSize: 15,
  fu: { x: 700, y: 200, s: 0.46 }, ga: { x: 1075, y: 173, s: 0.46 } };
// final flash: room for the temporary vacuum pump between the Flash Unit and the Gasometer; Stage 7 swaps the
// Gasometer for the density meter on its bench (floor = Flash Unit wheels)
const DLF_FX = Object.assign({}, DL_FX, { ga: { x: 1140, y: 173, s: 0.46 }, pump: { x: 1086, y: 559, s: 0.4 } });
const DLF_DM = { cellPort: DL_FX.cellPort, cellLane: DL_FX.cellLane, lineX: 30, connLine: true, labelSize: 15, floor: 559, syrS: 0.5,
  fu: DL_FX.fu, dm: { x: 1058, y: 300, s: 0.5 } };

class Component extends DCLogic {
  state = { stage: 'initpv', done: {}, res: {}, pending: {}, initPsat: null };
  constructor() { super(); this.state = Object.assign(this.state, this.freshNew('initpv')); }

  componentWillUnmount() { this.stop(); }
  stop() {
    (this.timers || []).forEach(t => PCLK.clearTimeout(t)); this.timers = [];
    this.ivStop();
  }
  at(ms, fn) { this.timers = this.timers || []; this.timers.push(PCLK.setTimeout(fn, PT(ms))); }
  ivStop() {
    (this.ivs || []).forEach(PCLK.clearInterval); this.ivs = [];
    (this.wts || []).forEach(PCLK.clearTimeout); this.wts = [];
    if (this.ticker) { PCLK.clearInterval(this.ticker); this.ticker = null; }
  }
  // interval tween (same as the Validation PV engine: survives throttled rAF)
  tween(dur, from, to, onT, done, ease) {
    this.ivs = this.ivs || [];
    const t0 = PCLK.now(), E = PVX().easeIO;
    const id = PCLK.setInterval(() => {
      const p = Math.min(1, (PCLK.now() - t0) / PT(dur * 1000));
      onT(from + (to - from) * (ease ? E(p) : p));
      if (p >= 1) { PCLK.clearInterval(id); this.ivs = (this.ivs || []).filter(x => x !== id); if (done) done(); }
    }, 16);
    this.ivs.push(id);
  }
  wait(ms, fn) { this.wts = this.wts || []; this.wts.push(PCLK.setTimeout(fn, PT(ms))); }
  startTicker() {
    if (this.ticker) return;
    this.bub = this.bub || 0; this.lastTick = PCLK.now();
    this.ticker = PCLK.setInterval(() => {
      const now = PCLK.now(), dt = Math.min(0.1, (now - this.lastTick) / 1000);
      this.lastTick = now;
      this.bub += dt * (0.22 + 0.33 * (this.state.pvAgit || 0));
      this.setState({ pvTick: now });
    }, 33);
  }
  // one agitation stroke — Validation StagePVTest.stroke(), duration parameterised
  stroke(dir, done, dur) {
    const C = PVX().clamp01, E = PVX().easeIO;
    const x0 = dir === 'a2b' ? 0 : 1, x1 = 1 - x0, ag0 = this.state.pvAgit || 0;
    this.setState({ pvPhase: dir, pvFront: 0, pvTail: 0, pvFlowD: 0, pvXfer: x0 });
    this.tween(dur, 0, 1, (u) => {
      const front = E(C(u / 0.18)), tail = E(C((u - 0.84) / 0.16)), xp = E(C((u - 0.12) / 0.76));
      const ag = dir === 'a2b' ? Math.max(ag0, E(C(u / 0.3))) : 1 - 0.55 * E(C((u - 0.5) / 0.5));
      this.setState({ pvFront: front, pvTail: tail, pvXfer: x0 + (x1 - x0) * xp, pvAgit: ag, pvFlowD: front + 2.2 * xp + tail });
    }, () => { this.setState({ pvFront: 0, pvTail: 0, pvFlowD: 0, pvXfer: x1 }); done(); });
  }

  cfg(id) { return CFG[id || this.state.stage] || null; }
  // liberated gas held in the cell during reduction / agitation (visual split of the cell volume)
  gasAt(c, P, V) {
    if (P >= c.gasFrom) return 0;
    if (V <= c.vPre + 1e-6) return c.gPre * Math.min(1, (c.gasFrom - P) / Math.max(1, c.gasFrom - c.target));
    const k = Math.min(1, (V - c.vPre) / Math.max(1e-6, c.stab - c.vPre));
    return c.gPre + k * (c.gEq - c.gPre);
  }
  // Pump B volume at rest (between strokes): grows with the agitation volume rise to the stabilized Pump B reading,
  // then empties with the gas removal so the remaining liquid ends in Pump A. Zero for stages without a Pump B reading.
  pBAgit(c, V) { return c.pumpB ? r4(c.pumpB * Math.max(0, Math.min(1, (V - c.vPre) / Math.max(1e-6, c.stab - c.vPre)))) : 0; }
  pBGas(c, V) { return c.pumpB ? c.pumpB * Math.max(0, Math.min(1, (V - c.remaining) / Math.max(1e-6, c.stab - c.remaining))) : 0; }
  // share of the Pump A contents that the forward stroke moves into Pump B (1 = complete sample;
  // < 1 only when Pump A contents + gas already in Pump B exceed the 100 cc Pump B bore)
  fwdPhi(V, pB) { const vA0 = V - pB; return vA0 > 1e-6 ? Math.max(0, Math.min(1, (PUMP_CAP - pB) / vA0)) : 1; }
  // one agitation cycle: A -> B (complete sample) -> hold -> B -> A (all oil back, only excess gas left in B) -> settle
  cycle(c, k) {
    const confirm = k >= c.cycles.length, target = confirm ? c.stab : c.cycles[k];
    const v0 = this.state.V, TS = 2.2, HOLD = 0.9, SETTLE = 1.8;
    const pre = (confirm ? 'Confirmation cycle ' : 'Agitation cycle ') + (k + 1) + ' — ';
    this.setState({ pvPhase: 'a2b', action: pre + 'Transferring sample: Pump A → Pump B.' });
    this.tween(TS * 2 + HOLD + SETTLE, 0, 1, (f) => { const V = v0 + (target - v0) * f; this.setState({ V, pB: this.pBAgit(c, V), G: this.gasAt(c, c.target, V) }); }, null, true);
    this.stroke('a2b', () => {
      const full = this.fwdPhi(this.state.V, this.state.pB || 0) >= 0.9999;
      this.setState({ pvPhase: 'hold', action: pre + (full ? 'Complete sample in Pump B.'
        : 'Pump B full (100 cc bore) — the rest of the sample waits in Pump A.') });
      this.wait(HOLD * 1000, () => {
        this.setState({ action: pre + 'Returning sample: Pump B → Pump A.' });
        this.wait(TS * 450, () => this.setState({ action: pre + 'Oil returning to Pump A.' }));
        this.stroke('b2a', () => {
          this.setState({ pvPhase: 'stab', action: pre + 'Separating oil and liberated gas.' });
          if (c.pumpB) this.wait(SETTLE * 550, () => this.setState({ action: pre + 'Excess gas retained in Pump B — ' + (this.state.pB || 0).toFixed(4) + ' cc (gas only).' }));
          this.tween(SETTLE, this.state.pvAgit || 0, 0, (a) => this.setState({ pvAgit: a }), () => {
        const cyc = this.state.cyc.concat([{ n: k + 1, v: target, d: r4(target - v0), confirm }]);
        this.setState({ pvAgit: 0, pvXfer: 0, V: target, pB: this.pBAgit(c, target), G: this.gasAt(c, c.target, target), cyc, pvPhase: 'idle',
          action: confirm ? 'Agitation cycle complete — confirmation: no further volume change, equilibrium reached.'
                          : 'Agitation cycle complete — cycle ' + (k + 1) + ' recorded: ' + target.toFixed(4) + ' cc (+' + (target - v0).toFixed(4) + ' cc).' });
        this.wait(450, () => {
          if (!confirm) { this.cycle(c, k + 1); return; }
          this.done({ stabilized: c.stab, V: c.stab, pB: c.pumpB, stageTag: 'Volume stabilized',
            action: 'VOLUME STABILIZED — ' + (c.pumpB ? 'Pump A ' + c.pumpA.toFixed(4) + ' cc · Pump B ' + c.pumpB.toFixed(4) + ' cc' : c.stab.toFixed(4) + ' cc') +
              ' at ' + fmtP(c.target) + '. ' + (c.pumpB ? 'All oil in Pump A under its gas cap; excess gas only in Pump B.' : 'All oil in Pump A under its gas cap.') });
        });
          });
        }, TS);
      });
    }, TS);
  }
  // gas-collection timeline (fractions of the step). Balloon only = the proven Stage 1 timeline;
  // with a gasometer the balloon fills first, then its valve closes and the excess goes to the gasometer.
  gasPlan(c) {
    if (c.gasometer > 0) return { dur: 16.0, balEnd: 0.70, gaso: true };
    return { dur: 13.0, balEnd: 0.90, gaso: false };
  }
  collectGas(c) {
    const pl = this.gasPlan(c), v0 = this.state.V, E = FXX().fxE, R = FXX().fxR;
    const durS = PT(pl.dur * 1000) / 1000;
    this.setState({ busy: true, stageTag: 'Collecting gas', xStep: 'gas', xU: 0, gasClk: 0, closedNote: '', gaso: 0, balloon: 0 });
    this.tween(pl.dur, 0, 1, (u) => {
      const bF = E(R(0.53, pl.balEnd, u)), gF = pl.gaso ? E(R(0.77, 0.90, u)) : 0;
      const removed = pl.gaso ? c.fBal * bF + (1 - c.fBal) * gF : bF;
      const V = v0 + (c.remaining - v0) * removed;
      const holding = (u >= 0.38 && u < 0.50) || (pl.gaso && u >= 0.70 && u < 0.76);
      const flow = u < 0.13 ? 0 : holding ? 0 : u < 0.90 ? FLOW : u < 0.95 ? FLOW * (1 - R(0.90, 0.93, u)) + 0.02 * R(0.90, 0.93, u) : 0;
      const act = u < 0.07 ? 'Preparing gas collection — PVT-cell outlet valve closed.'
        : u < 0.13 ? 'Opening the PVT-cell outlet valve.'
        : u < 0.38 ? 'Liberated gas leaving the gas cap — travelling to the Flash Unit.'
        : u < 0.44 ? 'Gas held at the closed balloon valve.'
        : u < 0.50 ? 'Opening the balloon valve.'
        : u < pl.balEnd ? 'Gas flowing into the balloon at 0.5 mL/min — cell held at ' + fmtP(c.target) + '.'
        : pl.gaso && u < 0.76 ? 'Balloon at ' + c.balloon.toFixed(2) + ' psig — balloon valve closing, gasometer valve opening.'
        : pl.gaso && u < 0.90 ? 'Excess gas flowing into the gasometer — ' + Math.round(c.gasometer * gF) + ' cc.'
        : u < 0.95 ? 'FLOW RATE DROP DETECTED — liquid reaching the outlet.' : 'Closing the PVT-cell outlet, balloon and gasometer valves.';
      this.setState({ xU: u, gasClk: u * durS, V, pB: this.pBGas(c, V), G: Math.max(0, V - c.remaining), P: c.target,
        balloon: c.balloon * bF, gaso: c.gasometer * gF, gasoRouting: pl.gaso && u >= 0.74 && u < 0.95,
        flow, cellOpen: u >= 0.10 && u < 0.97, action: act });
    }, () => this.done({ xStep: '', xU: 1, V: c.remaining, pB: 0, G: 0, balloon: c.balloon, gaso: c.gasometer, gasoRouting: false,
      flow: 0, cellOpen: false, remaining: c.remaining, closedNote: 'PVT CELL CLOSED', stageTag: 'Gas removed',
      action: 'Gas removed — balloon ' + c.balloon.toFixed(2) + ' psig' + (c.gasometer > 0 ? ' · gasometer ' + c.gasometer + ' cc' : '') +
        ' · remaining liquid ' + c.remaining.toFixed(4) + ' cc at ' + fmtP(c.target) + '.' }), false);
  }
  stageRecord(c) {
    return { target: c.target, stabilized: c.stab, balloon: c.balloon, gasometer: c.gasometer, remaining: c.remaining,
      psat: c.pvOK ? c.psat : null };
  }

  runNew() {
    const st = this.state, s = st.step;
    this.stop();
    this.startTicker();
    if (st.stage === 'initpv') {
      if (s === 0) {
        // Charge 80 cc: one click sets the completed charge condition directly (no intermediate values)
        this.stop();
        this.done({ cU: 1, P: P_CHARGE, V: V_CHARGE, G: 0, pvXfer: 0, pvAgit: 0, stageTag: 'Charge Complete',
          action: 'CHARGE COMPLETE — Pump A 80.00 cc, Pump B 0.00 cc at 5,000 psig · sample inlet valve closed. Run the PV Determination.' });
        return;
      }
      if (s === 1) {
        this.setState({ busy: true, pvRun: true, runKey: Date.now(), rows: [], stageTag: 'PV determination',
          action: 'PV Determination — Validation 12-point sequence on the 80 cc charge.' });
        return;
      }
      return;
    }
    if (st.stage === 'final') { this.runFinal(s); return; }
    // ---- Stages 1-6 : one engine, stage numbers from CFG ----
    const c = this.cfg();
    if (s === 0) {
      const p0 = st.P, v0 = st.V;
      this.setState({ busy: true, stageTag: 'Reducing pressure', pvPhase: 'set',
        action: 'Reducing cell pressure from ' + fmtP(Math.round(p0)) + ' to ' + fmtP(c.target) + ' — the sample expands.' });
      this.tween(PVX().T.SET, 0, 1, (f) => {
        const P = p0 + (c.target - p0) * f, V = v0 + (c.vPre - v0) * f;
        const D = f < 0.7 ? 1 - 0.5 * f : 0.65 * (1 - (f - 0.7) / 0.3);
        this.setState({ P, V, pB: 0, D, G: this.gasAt(c, P, V) });
      }, () => this.done({ P: c.target, V: c.vPre, pB: 0, D: 0, G: this.gasAt(c, c.target, c.vPre), pvPhase: 'idle', stageTag: 'At ' + fmtP(c.target),
        action: 'Cell at ' + fmtP(c.target) + ' — sample expanded to ' + c.vPre.toFixed(4) + ' cc; liberated gas forming above the liquid. Agitate to equilibrium.' }), true);
      return;
    }
    if (s === 1) {
      this.setState({ busy: true, stageTag: 'Agitating', cyc: [], stabilized: null });
      this.cycle(c, 0);
      return;
    }
    if (s === 2) {
      this.setState({ busy: true, stageTag: 'Connecting Flash Unit', xStep: 'conn', conn: 0,
        action: 'Connecting the PVT-cell outlet line to the Flash Unit inlet — all valves closed.' });
      this.tween(5.0, 0, 1, (k) => this.setState({ conn: k }), () => this.done({ conn: 1, connected: true, xStep: '',
        stageTag: 'Flash Unit connected', action: 'Flash Unit connected — PVT-cell outlet and balloon valves closed; gasometer ' +
          (c.gasometer > 0 ? 'valve closed, standing by for excess gas.' : 'isolated for this stage.') }));
      return;
    }
    if (s === 3) { this.collectGas(c); return; }
    if (s === 4) {
      // valves already closed: the outlet line is broken out and the Flash Unit taken off the workspace,
      // then the full Validation PV workspace runs the 12-point test on the remaining sample
      this.setState({ busy: true, stageTag: 'Disconnecting Flash Unit', xStep: 'disc', flow: 0,
        action: 'Flash Unit valves closed — disconnecting the outlet line. Balloon ' + c.balloon.toFixed(2) + ' psig' +
          (c.gasometer > 0 ? ' and gasometer ' + c.gasometer + ' cc' : '') + ' recorded.' });
      this.tween(2.0, 1, 0, (k) => this.setState({ conn: k }), () => {
        if (!c.pvOK) {
          this.done({ conn: 0, connected: false, xStep: '', done: { ...this.state.done, [c.id]: true },
            pending: { ...this.state.pending, [c.id]: true }, res: { ...this.state.res, [c.id]: this.stageRecord(c) },
            stageTag: 'Stage ' + c.n + ' recorded · PV pending',
            action: 'STAGE ' + c.n + ' RECORDED — gas results and remaining liquid saved. PV test not run: missing ' + c.missing.join('; ') + '.' });
          return;
        }
        this.setState({ conn: 0, connected: false, xStep: '', pvRun: true, runKey: Date.now(), rows: [], pvN: 0, pvCount: 0,
          pvConfirmed: false, stageTag: 'PV determination',
          action: 'PV test on the remaining sample — ' + c.remaining.toFixed(4) + ' cc at ' + fmtP(c.target) + '; Validation 12-point sequence.' });
      }, true);
      return;
    }
  }
  // ---- Final flash: step 0 recompresses the remaining Stage 6 liquid, steps 1-7 run the approved Flash Process
  // (FlashSim stages with this sample's profile; equipment preparation and timing as in Validation) ----
  runFinal(s) {
    const FP = finalProf();
    if (s === 0) {
      const p0 = S6.target;
      this.setState({ busy: true, stageTag: 'Recompressing', P: p0, V: S6.remaining, G: 0, pB: 0,
        action: 'Recompressing the remaining Stage 6 liquid from ' + fmtP(p0) + ' to ' + fmtP(P_FINAL) + ' — Pump A advancing; no oil or gas added.' });
      this.tween(8.0, 0, 1, (f) => {
        const P = p0 + (P_FINAL - p0) * f;
        this.setState({ P, V: volAt(P), action: 'Recompressing — ' + fmtP(Math.round(P)) + ' · above the Stage 6 Psat (203 psig): single-phase liquid, dissolved gas held in solution, ' + volAt(P).toFixed(4) + ' cc.' });
      }, () => {
        this.setState({ P: P_FINAL, V: V_FINAL, stageTag: 'Stabilizing', action: 'Holding at 2,500 psig — pressure and volume stabilizing.' });
        this.wait(2200, () => this.done({ P: P_FINAL, V: V_FINAL, recompressed: true, stageTag: 'Stable at 2,500 psig',
          action: 'RECOMPRESSED — 2,500 psig · ' + V_FINAL.toFixed(4) + ' cc (Stage 6 P–V model). Run the Flash Process from 2,500 psig.' }));
      }, true);
      return;
    }
    const n = s;
    const extra = (o, q) => {
      const x = { action: o.fStatus || this.state.fStatus };
      if (n === 1) x.conn = q;                                       // outlet line made up (all valves closed) while the sample is checked
      if (o.fPumpA != null) x.V = Math.max(0, o.fPumpA);              // Pump A displaces the sample at constant 2,500 psig
      return x;
    };
    this.setState(Object.assign(FlashSim.stageStart(n, FP), { busy: true, stageTag: 'Final flash · ' + FlashSim.NAMES[n - 1] }, n === 1 ? { conn: 0 } : {}));
    this.tween(FlashSim.dur(n) / PSM(), 0, 1, (q) => { const o = FlashSim.stageAt(n, q, FP); this.setState(Object.assign(o, extra(o, q))); }, () => {
      const o = FlashSim.stageDone(n, FP), x = Object.assign(o, extra(o, 1), { stageTag: n === 7 ? 'Final flash complete' : 'Final flash · ' + FlashSim.NAMES[n - 1] + ' done' });
      if (n === 1) x.conn = 1;
      if (n === 7) Object.assign(x, { done: { ...this.state.done, final: true }, res: { ...this.state.res, final: this.finalRecord() },
        rs0: true, action: 'STAGE 7 FINAL FLASH COMPLETE — gas ' + gTxt(FP) + ' · oil ' + oTxt(FP) + ' · ' + FP.res.api.toFixed(1) + ' °API (example). Rs = 0 after the flash. Recorded separately from Stages 1–6.' });
      this.done(x);
    });
  }
  // final-flash record: kept under its own key, replaced (never added) on a re-run, so nothing is counted twice
  finalRecord() {
    const FP = finalProf(), r = FP.res;
    return { pStart: S6.target, vStart: S6.remaining, pFlash: P_FINAL, vFlash: V_FINAL, flashed: FP.flashed, oilG: FP.oil, gasScc: FP.gas,
      rho: r.rho, rho60: r.rho60, sg: r.sg, api: r.api, vSto: FP.vSto, rs6: FP.D.rs6, rsAfter: 0, required: FP.D.required };
  }
  // live mirror of the embedded Validation PV Test (strip, control readouts, Explain panel)
  pvSync(ps) {
    if (!this.state.pvRun) return;
    const n = ps.pvN || 0, isInit = this.state.stage === 'initpv', c = this.cfg();
    const pts = isInit ? PV_INIT_PTS : c.pts, psP = isInit ? PV_INIT.psat.p : c.psat.p;
    this.setState({ P: ps.pvPressure, V: ps.pvVolume, pvN: n, pvCount: ps.pvCount || 0, pvConfirmed: !!ps.pvConfirmed,
      rows: pts.slice(0, n).map(([p, v]) => ({ p, v, psat: p === psP })) });
  }
  pvDone() {
    if (!this.state.busy) return;
    if (this.state.stage === 'initpv') {
      this.done({ P: P_CHARGE, V: V_CHARGE, initPsat: PV_INIT.psat, done: { ...this.state.done, initpv: true },
        stageTag: 'Initial PV complete', action: 'INITIAL PV COMPLETE — Psat 2,500 psig @ 83.08 cc. Cell returned to 5,000 psig · 80.0000 cc.' });
      return;
    }
    const c = this.cfg();
    this.done({ P: c.target, V: c.remaining, G: 0, pvPhase: 'done', done: { ...this.state.done, [c.id]: true },
      res: { ...this.state.res, [c.id]: this.stageRecord(c) }, stageTag: 'Stage ' + c.n + ' complete',
      action: 'STAGE ' + c.n + ' COMPLETE — ' + c.psatPre + c.psatStr + '. Cell back at ' + fmtP(c.target) + ' · ' + c.remaining.toFixed(4) + ' cc.' });
  }
  // clean beginning state of a stage (inherited condition of the previous stage)
  freshNew(id) {
    const base = { step: 0, busy: false, chain: false, P: P_CHARGE, V: V_CHARGE, G: 0, pB: 0, D: 0,
      pvPhase: 'idle', pvStep: 0, pvN: 0, pvCount: 0, pvXfer: 0, pvAgit: 0, pvFront: 0, pvTail: 0, pvFlowD: 0, pvSig: 0,
      pvConfirmed: false, rows: [], cyc: [], stabilized: null, conn: 0, connected: false, xStep: '', xU: 0, gasClk: 0,
      flow: 0, balloon: 0, gaso: 0, gasoRouting: false, cellOpen: false, closedNote: '', remaining: null,
      pvRun: false, runKey: 0, cU: 0, psatTxt: '', startTxt: '' };
    if (id === 'initpv') return Object.assign(base, { P: 0, V: 0, stageTag: 'Ready', startTxt: '5,000 psig and 80.0000 cc', psatTxt: '2,500 @ 83.08',
      action: 'PVT cell empty and evacuated — charge 80 cc of sample at 5,000 psig.' });
    if (id === 'final') return Object.assign(base, FlashSim.initial(finalProf()), { P: S6.target, V: S6.remaining, recompressed: false, stageTag: 'Ready',
      startTxt: fmtP(P_FINAL) + ' and ' + V_FINAL.toFixed(4) + ' cc',
      action: 'Stage 7 — inherited Stage 6 remaining liquid at its Psat: ' + fmtP(S6.target) + ' · ' + S6.remaining.toFixed(4) + ' cc, gas still dissolved. Recompress it to ' + fmtP(P_FINAL) + ', then run the Flash Process to stock-tank conditions.' });
    const c = CFG[id], from = c.n === 1 ? 'Initial PV charge' : 'Stage ' + (c.n - 1) + ' remaining liquid';
    return Object.assign(base, { P: c.pStart, V: c.vStart, stageTag: 'Ready',
      startTxt: fmtP(c.target) + ' and ' + c.remaining.toFixed(4) + ' cc', psatTxt: c.pvOK ? c.psat.p + ' @ ' + c.psatVs : '',
      action: 'Stage ' + c.n + ' — inherited ' + from + ': ' + fmtP(c.pStart) + ' · ' + c.vStart.toFixed(4) + ' cc. Reduce the pressure to ' + fmtP(c.target) + '.' });
  }
  // completed-stage view (navigation back to a finished stage)
  doneNew(id) {
    const f = this.freshNew(id);
    if (id === 'initpv') {
      const rows = PV_INIT_PTS.map(([p, v]) => ({ p, v, psat: p === PV_INIT.psat.p }));
      return Object.assign(f, { step: STEPS[id], P: P_CHARGE, V: V_CHARGE, pvPhase: 'done', pvN: 12, pvCount: 12, pvConfirmed: true,
        rows, cU: 1, initPsat: PV_INIT.psat, stageTag: 'Complete', action: 'Initial PV complete — Psat 2,500 psig @ 83.08 cc.' });
    }
    if (id === 'final') {
      const FP = finalProf();
      [1, 2, 3, 4, 5, 6, 7].forEach((n) => Object.assign(f, FlashSim.stageDone(n, FP)));
      return Object.assign(f, { step: STEPS.final, P: P_FINAL, V: Math.max(0, f.fPumpA), conn: 1, recompressed: true, stageTag: 'Complete',
        rs0: true, action: 'Stage 7 final flash complete — gas ' + gTxt(FP) + ' · oil ' + oTxt(FP) + ' · ' + FP.res.api.toFixed(1) + ' °API (example). Rs = 0 after the flash.' });
    }
    const c = CFG[id], pend = !!this.state.pending[id];
    const cyc = c.cycles.concat([c.stab]).map((v, i, a) => ({ n: i + 1, v, d: r4(v - (i ? a[i - 1] : c.vPre)), confirm: i === a.length - 1 }));
    Object.assign(f, { step: STEPS[id], P: c.target, V: c.remaining, cyc, stabilized: c.stab, balloon: c.balloon, gaso: c.gasometer,
      remaining: c.remaining, closedNote: 'PVT CELL CLOSED', stageTag: pend ? 'Recorded · PV pending' : 'Complete' });
    if (c.pvOK) {
      const rows = c.pts.map(([p, v]) => ({ p, v, psat: p === c.psat.p }));
      Object.assign(f, { pvPhase: 'done', pvN: rows.length, pvCount: rows.length, pvConfirmed: true, rows,
        action: 'Stage ' + c.n + ' complete — ' + c.psatPre + c.psatStr + '.' });
    } else f.action = 'Stage ' + c.n + ' recorded — PV test pending: missing ' + c.missing.join('; ') + '.';
    return f;
  }

  runStep() {
    if (this.state.busy) return;
    if (this.state.step >= STEPS[this.state.stage]) return;
    this.runNew();
  }
  done(extra) {
    const total = STEPS[this.state.stage];
    const step = Math.min(total, this.state.step + 1);
    this.setState({ busy: false, step, ...(extra || {}) });
    if (this.state.chain && step < total) { this.at(900, () => this.runStep()); return; }
    // each stage stops once its own steps are complete — moving on is always an explicit click
    this.setState({ chain: false });
    if (this.ticker) { PCLK.clearInterval(this.ticker); this.ticker = null; }
  }
  runAll() {
    if (this.state.busy || this.state.chain) return;
    if (this.state.step >= STEPS[this.state.stage]) return;
    // the runtime's setState applies synchronously and takes no callback — start the chain directly
    this.setState({ chain: true });
    this.runStep();
  }
  goStage(id) {
    if (id === this.state.stage) return;
    this.stop();
    const view = this.state.done[id] ? this.doneNew(id) : this.freshNew(id);
    this.setState(Object.assign(view, { stage: id }));
  }
  // Reset Stage: only the selected stage returns to its inherited start; completed data of other stages is kept
  resetStage() {
    this.stop();
    const id = this.state.stage, done = { ...this.state.done }, res = { ...this.state.res }, pending = { ...this.state.pending };
    delete done[id]; delete res[id]; delete pending[id];
    const extra = id === 'initpv' ? { initPsat: null } : {};
    this.setState(Object.assign(this.freshNew(id), { stage: id, done, res, pending }, extra));
  }
  /* ---- shared procedure panel (ProcCtl.js): stage = Initial PV / Stage 1-6 (existing navigation),
     Run = the current step of that stage, Restart = the existing Reset Stage ---- */
  pcInfo() {
    const st = this.state, idx = IDS.indexOf(st.stage), isInit = st.stage === 'initpv', isFinal = st.stage === 'final', c = isInit || isFinal ? null : this.cfg();
    const total = STEPS[st.stage], step = st.step, complete = step >= total, busy = !!st.busy || (!!st.chain && PCLK.busy()), pz = PCLK.paused();
    const names = isInit ? ['Charge 80 cc', 'Run PV Determination'] : isFinal ? ['Recompress to 2,500 psig'].concat(FlashSim.ACTIONS)
      : ['Reduce Pressure', 'Agitate', 'Connect Flash Unit', 'Collect Gas', c.pvOK ? 'Run PV Test' : 'Disconnect & Record'];
    const lbl = isInit ? 'Initial PV' : isFinal ? 'Stage 7 · Final Flash' : 'Stage ' + c.n;
    const si = Math.min(step, total - 1);
    // stage naming of this test: Initial PV, Stages 1-6, Stage 7 (final flash) — not the tab position
    const tabName = (id) => id === 'initpv' ? 'Initial PV' : id === 'final' ? 'Stage 7 · Final Flash' : 'Stage ' + id.slice(5);
    return { N: IDS.length, k: idx, unit: 'Stage',
      kText: isInit ? 'INITIAL PV' : 'STAGE ' + (isFinal ? 7 : c.n) + ' / 7' + (isFinal ? ' · FINAL FLASH' : ''),
      nextLabel: idx < IDS.length - 1 ? 'Run ' + tabName(IDS[idx + 1]) : '',
      title: lbl + ' · ' + (complete ? 'complete' : 'Step ' + (si + 1) + ' / ' + total + ': ' + names[si]), q: st.action || '',
      status: busy ? (pz ? 'paused' : 'running') : complete ? 'complete' : 'ready',
      allDone: IDS.every(id => !!st.done[id]), frac: (step + (busy ? 0.5 : 0)) / total,
      doneMask: IDS.map(id => !!st.done[id]),
      canPrev: idx > 0, canNext: idx < IDS.length - 1, canRestart: busy || step > 0 || !!st.done[st.stage],
      runLabel: 'Run Step ' + (si + 1) + ': ' + names[si],
      runAll: 'Run Whole Stage', runAllDisabled: busy || complete || !!st.chain,
      reset: 'Reset All Stages', resetTitle: 'Reset the whole Differential Liberation test' };
  }
  pcAct(a) {
    const st = this.state, idx = IDS.indexOf(st.stage);
    const go = (i) => { PCLK.clearAll(); PCLK.resume(); this.goStage(IDS[i]); };
    if (a === 'run') { if (st.chain && PCLK.busy()) return; PCLK.resume(); this.runStep(); }
    else if (a === 'pause') { if (st.busy || (st.chain && PCLK.busy())) PCLK.pause(); }
    else if (a === 'resume') PCLK.resume();
    else if (a === 'restart') { PCLK.clearAll(); PCLK.resume(); this.resetStage(); }
    else if (a === 'prev') { if (idx > 0) go(idx - 1); }
    else if (a === 'next') { if (idx < IDS.length - 1) go(idx + 1); }
    else if (a === 'runNext') { if (idx < IDS.length - 1) { go(idx + 1); this.runStep(); } }
    else if (a === 'runAll') { PCLK.resume(); this.runAll(); }
    else if (a === 'again' || a === 'reset') { PCLK.clearAll(); PCLK.resume(); this.resetAll(); }
  }
  // full reset of the whole Differential Liberation test
  resetAll() {
    this.stop();
    this.setState(Object.assign(this.freshNew('initpv'), { stage: 'initpv', done: {}, res: {}, pending: {}, initPsat: null }));
  }

  // view model for the shared Flash Unit / Gasometer drawing (FlashHost): this page's own values and valve timing only
  fxView() {
    const st = this.state;
    if (st.stage === 'initpv') return null;
    if (st.stage === 'final') return this.fxFinal();
    const stageDn = !!st.done[st.stage], pend = !!st.pending[st.stage];
    if ((stageDn && pend) || st.step < 2 || st.pvRun || (stageDn && !pend)) return null;
    const c = this.cfg(), F = FXX(), R = F.fxR, E = F.fxE, pl = this.gasPlan(c);
    const gasStep = st.xStep === 'gas', u = gasStep ? st.xU || 0 : 0, fade = gasStep ? 1 - R(0.95, 1, u) : 0;
    const vCell = gasStep ? E(R(0.07, 0.13, u)) * (1 - E(R(0.95, 1, u))) : 0;
    const vBal = gasStep ? E(R(0.44, 0.50, u)) * (1 - E(pl.gaso ? R(0.70, 0.74, u) : R(0.95, 1, u))) : 0;
    const vGas = gasStep && pl.gaso ? E(R(0.72, 0.76, u)) * (1 - E(R(0.95, 1, u))) : 0;
    const bal = st.balloon || 0, gaso = st.gaso || 0, sp = Gasometer.split(gaso);
    const flow = {};
    if (gasStep && u >= 0.13 && fade > 0) {
      if (pl.gaso && u >= 0.72) flow.capGas = { p: u, a: fade };
      else flow.capBal = { p: u, a: fade };
    }
    // no Flash Unit pressure in this procedure's data: the display shows the unit status; the flask is not used here
    const fuPTxt = st.xStep === 'conn' ? 'CONNECTING' : st.xStep === 'disc' ? 'DISCONNECTING'
      : !gasStep || u < 0.13 || u >= 0.95 ? 'STANDBY' : flow.capGas ? 'GAS → GASOMETER' : u >= 0.44 ? 'GAS → BALLOON' : 'GAS IN LINE';
    const V = { busy: !!st.busy, stage: 0, p: u, step: 0, path: 'cap', fuP: null, fuPTxt: fuPTxt, balTxt: 'NOT USED', balNote: 'NOT USED IN THIS STAGE',
      flowTxt: (st.flow || 0).toFixed(2), flowOn: (st.flow || 0) > 0.05, pumpA: null,
      flashed: 0, oil: 0, oilRec: 0, bal: 200, heTint: 0, gasTint: 0, vacTint: 0, heIn: 0, airOut: 0, drip: null, bubbles: 0,
      balloon: 250 * Math.min(1, bal / 14.5), balloonTxt: bal.toFixed(2), balloonUnit: 'psig',
      gasoVol: gaso, gasoMode: 'gas', gaso: gaso, heGas: 0, gaso2k: sp.k2, gaso1k: sp.k1, gasoT: FlashSim.GASO_T, gasoSec: '2k',
      valve: { pumpA: vCell, inlet: vCell, flask: 0, vac: 0, vessel: vBal, in2k: vGas, iso2k: vGas, in1k: 0, iso1k: 0, gaso: vGas },
      vacPump: 0, vacHose: 0, conn: st.conn || 0, flow: flow, cock: 0, aliq: 0, dmQ: 0,
      dm: { phase: 'await', inj: 0, flush: 0, air: 0, T: 0, Tset: 0, prog: 0, start: 0, osc: 0, res: {} } };
    return { mode: 'system', key: 'dl', opt: { inline: true, layout: DL_FX, labels: true }, V: V };
  }

  // final flash: the approved Flash Process view model on this procedure's own state and sample profile;
  // the cell (2,500 psig) stays on the page's cell drawing, the Flash Unit shows its own atmospheric pressure
  fxFinal() {
    const st = this.state, FP = finalProf(), n = st.fBusy ? st.fStage : st.fStep;
    const V = FlashSim.vmOf(st, 0, FP);
    V.conn = st.conn || 0;
    const dens = n === 7;
    return dens ? { mode: 'density', key: 'dlfd', opt: { inline: true, layout: DLF_DM, labels: true }, V }
      : { mode: 'system', key: 'dlf', opt: { inline: true, layout: DLF_FX, labels: true }, V };
  }
  // phase of the final flash for the status panel and the Explain panel
  finalPhase() {
    const st = this.state, n = st.fBusy ? st.fStage : st.fStep;
    if (st.busy && st.step === 0) return 'RECOMPRESSING';
    if (!st.recompressed) return 'NOT STARTED';
    if (!st.fBusy) return n >= 7 ? 'COMPLETE' : 'READY';
    return { 1: 'PREPARING', 2: 'EVACUATING', 3: 'PREPARING · HELIUM', 4: 'FLASHING', 5: 'COLLECTING GAS', 6: 'COLLECTING OIL', 7: 'DENSITY & API' }[n] || 'RUNNING';
  }
  // Explain panel (StepGuide) for the final flash
  describe() {
    const st = this.state;
    if (st.stage !== 'final') return null;
    const FP = finalProf(), step = st.step || 0, nm = FINAL_STEPS[Math.min(step, 7)];
    const W = ['Brings the remaining Stage 6 liquid back above its bubble point so the flash starts from one known single-phase condition. Only pressure changes: no oil or gas is added.',
      'Confirms the sample is stable at 2,500 psig and makes up the outlet line to the Flash Unit with every valve closed.',
      'Removes air from the whole section between the closed Port R valve and the closed Gasometer inlet valve, so only sample gas is measured.',
      'Fills the evacuated flask with helium from the gasometer, so the flask starts at atmospheric pressure with a known gas.',
      'Pump A pushes the sample at 2,500 psig through Port R into the flask; at atmospheric pressure the gas still dissolved at the Stage 6 Psat (203 psig) separates and rises to the gasometer, the oil collects on the balance.',
      'Transfers part of the flash gas to the balloon for analysis. The gas volume itself is a required input here (not in the project data).',
      'Records the stock-tank oil mass on the balance (gross − tare) and the gas volume; Rs falls to 0 only now.',
      'Measures the collected oil density at 25 °C, converts it to 60 °F and reports SG and API gravity.'];
    return { title: 'Differential Liberation — Stage 7 Final Flash · Stage 6 Psat 203 psig → recompressed to 2,500 psig', tag: (st.busy ? 'RUNNING · ' : '') + 'STEP ' + Math.min(8, step + 1) + ' / 8 · ' + this.finalPhase(),
      busy: !!st.busy, d: st.action || '', w: W[Math.min(step, 7)] + '', e: 'Step: ' + nm + '. The cell keeps its own pressure (psig); the Flash Unit display is the unit\'s own pressure (psia).',
      o: 'Final-flash results are recorded separately from Stages 1–6; the final-flash gas is added once to the cumulative gas.' + (FP.D.known ? '' : ' Required input missing: final-flash gas volume (data/dl-final-flash.js).'),
      vals: [
        { l: 'Cell pressure', v: Math.round(st.P || 0).toLocaleString('en-US'), u: 'psig' },
        { l: 'Cell volume', v: (st.V || 0).toFixed(4), u: 'cc' },
        { l: 'Flash Unit', v: (st.fuP == null ? 14.7 : st.fuP).toFixed(1), u: 'psia' },
        { l: 'Oil collected', v: FP.oil == null ? 'input required' : (st.fOil || 0).toFixed(2), u: FP.oil == null ? '' : 'g' },
        { l: 'Flash gas', v: FP.gas == null ? 'input required' : String(Math.round(st.fGasoProduced || 0)), u: FP.gas == null ? '' : 'scc' } ] };
  }

  renderVals() {
    const st = this.state, X = PVX(), F = FXX();
    const C = X.clamp01, R = F.fxR, E = F.fxE;
    const isInit = st.stage === 'initpv', isFinal = st.stage === 'final';
    const c = isInit ? null : isFinal ? S6 : this.cfg();            // final flash: Stage 6 liquid (cell drawing only)
    const total = STEPS[st.stage], step = st.step, busy = st.busy, complete = step >= total;
    const P = st.P, V = st.V, phase = st.pvPhase || 'idle';
    const stageDn = !!st.done[st.stage], pend = !!st.pending[st.stage];
    const lbl = isInit ? 'Initial PV' : isFinal ? 'Stage 7 · Final Flash' : 'Stage ' + c.n;
    const FP = isFinal ? finalProf() : null, fVm = isFinal ? FlashSim.vmOf(st, 0, FP) : null;

    // ---- phase split between the pumps (all volumes in cc; 100 cc = 173 px of bore) ----
    // At rest : Pump A = all oil + its gas, Pump B = excess gas only (pB).
    // Forward stroke moves the Pump A contents (oil + gas together) into Pump B; the return stroke brings
    // them back. Material leaving one pump appears in the other at the same instant (A + B = V always).
    const xfer = C(st.pvXfer || 0), agit = C(st.pvAgit || 0);
    const Gt = !isInit ? Math.max(0, Math.min(V, st.G || 0)) : 0;
    const Lq = Math.max(0, V - Gt);                                   // liquid oil
    const pBr = !isInit ? Math.max(0, Math.min(st.pB || 0, Gt)) : 0;  // excess gas resting in Pump B
    const gA0 = Math.max(0, Gt - pBr);                                // gas belonging to Pump A at rest
    const mv = this.fwdPhi(V, pBr) * xfer;                            // share of Pump A contents now in Pump B
    const oilA = Lq * (1 - mv), gasA = gA0 * (1 - mv), oilB = Lq * mv, gasBin = gA0 * mv;
    const vA = oilA + gasA, vB = pBr + gasBin;
    const vBt = vB + oilB;
    const dsp = C(Math.max(st.D || 0, 0.8 * agit));                   // share of moving gas dispersed as bubbles in the oil
    const PXC = 1.73;
    const h = Math.min(173, PXC * vA), hB = Math.min(173, PXC * vBt);
    // gas can only be dispersed where oil is present; a pump holding no oil shows its gas as a clear gas region
    const dA = dsp * C(oilA / Math.max(0.01, 0.15 * Lq)), dB = dsp * C(oilB / Math.max(0.01, 0.15 * Lq));
    const gh = Math.min(h, PXC * gasA * (1 - dA));                    // Pump A gas cap
    const ghB = Math.min(hB, PXC * (pBr + gasBin * (1 - dB)));        // Pump B gas (resting excess gas + separated part)
    const gasOn = Gt > 0.002;
    const gt = !isInit ? C(Gt / Math.max(0.01, c.gEq)) : 0;
    const clk = this.bub || 0;
    // bubbles : count follows the dispersed gas in that pump, so they travel with the sample and never stay behind;
    // at rest they rise and merge at the interface, while mixing they circulate through the oil
    const bubs = (x0, top, bot, gDisp) => {
      const nb = gasOn && c ? C(gDisp / Math.max(0.3, 0.25 * c.gEq)) : 0, grow = 0.55 + 0.45 * gt, H = bot - top;
      return DL_BUBS.map((sd, k) => {
        if (H < 10 || sd.th >= nb) return { x: String(x0 + 18), y: String(bot), r: 0, o: '0' };
        const f = (((sd.ph + clk * sd.sp) % 1) + 1) % 1;
        const yR = bot - 4 - f * (H - 8), yS = top + 4 + (H - 8) * (0.5 + 0.46 * Math.sin(clk * 5.2 * sd.sp + sd.ph * 6.283));
        const x = Math.max(x0 + 3, Math.min(x0 + 33, x0 + 4 + sd.fx * 28 + Math.sin(clk * (5 + 6 * agit) + k * 1.7) * (0.6 + 3 * agit)));
        const fade = agit + (1 - agit) * Math.min(1, f / 0.1, (1 - f) / 0.1);
        return { x: x.toFixed(1), y: (agit * yS + (1 - agit) * yR).toFixed(1), r: (sd.r * grow * (1 + 0.9 * (1 - agit) * f * f)).toFixed(2),
          o: (0.85 * C((nb - sd.th) / 0.1) * C(fade)).toFixed(2) };
      });
    };
    const gasFrac = V > 0 ? Gt / V : 0, settle = 1 - dsp;

    // ---- agitation route through the cell manifold (Validation) ----
    const xferOn = phase === 'a2b' || phase === 'b2a';
    const route = phase === 'b2a' ? X.ROUTE_BA : X.ROUTE_AB, L = X.LINE_L;
    const fl = L * C(st.pvFront || 0), tl = L * C(st.pvTail || 0), band = xferOn ? Math.max(0, fl - tl) : 0;
    const D = L * (st.pvFlowD || 0);
    const specks = [0, 1, 2, 3, 4, 5, 6].map((k) => {
      const sp = ((k * L / 7 + D) % L + L) % L, inside = band > 0.5 && sp > tl + 3 && sp < fl - 3;
      const gas = gasOn && k % 2 === 0, pt = X.routePt(route, sp);
      return { x: pt[0].toFixed(1), y: pt[1].toFixed(1), r: gas ? 1.7 : 1.05, fill: gas ? '#e2fff2' : '#fff3c4', o: inside ? (gas ? 0.95 : 0.8) : 0 };
    });
    const fp = X.routePt(route, fl), fr = st.pvFront || 0;

    // ---- readouts ----
    const pTxt = fmtP(Math.round(P)), vTxt = V.toFixed(4) + ' cc';
    const ang = (-140 + 100 * C((5000 - P) / 5000)) * Math.PI / 180;
    const phaseText = isInit && V < 0.005 ? 'CELL EMPTY · EVACUATED' : isFinal && (st.fStep || 0) >= 4 && V < 0.005 ? 'PUMP A EMPTY · SAMPLE FLASHED' : gasOn ? 'LIQUID + LIBERATED GAS' : 'SINGLE-PHASE LIQUID · GAS IN SOLUTION';
    const phaseColor = gasOn ? 'var(--grn)' : 'var(--cap2)';

    // ---- Flash Unit (stages) : Validation sketch + transfer lanes ----
    const flashOn = isFinal || (!isInit && !(stageDn && pend) && step >= 2);
    const conn = C(st.conn || 0);
    const pl = c ? this.gasPlan(c) : { dur: 13, balEnd: 0.9, gaso: false };
    const gasStep = st.xStep === 'gas', u = gasStep ? st.xU || 0 : 0;
    // PVT-cell outlet valve (Port R); the Flash Unit / Gasometer valves are drawn by FlashHost (fxView)
    const vCell = isFinal ? fVm.valve.pumpA : gasStep ? E(R(0.07, 0.13, u)) * (1 - E(R(0.95, 1, u))) : 0;
    const valve = (a, cx, cy) => ({ tr: 'rotate(' + (90 * a).toFixed(1) + ' ' + cx + ' ' + cy + ')', c: a > 0.5 ? '#46d39a' : '#8fa3c2' });
    const gasoUsed = !!(c && c.gasometer > 0);
    const XPH = F.FX_PHASES;
    let xPanel = null;
    if (isFinal) {
      const fph = this.finalPhase(), pi = FlashSim.phaseInfoOf(st, FP);
      const det = busy && step === 0 ? 'Cell ' + fmtP(Math.round(P)) + ' · ' + V.toFixed(4) + ' cc'
        : st.fBusy ? (st.fStatus || '') : !st.recompressed ? 'Starting pressure 2,500 psig · recompress first' : step >= total ? 'Gas ' + gTxt(FP) + ' · ' + FP.res.api.toFixed(1) + ' °API (example) · Rs = 0' : 'Next: ' + FINAL_STEPS[step];
      xPanel = { title: 'FINAL FLASH · ' + fph, detail: det.length > 58 ? det.slice(0, 56) + '…' : det,
        ph: busy && step === 0 ? 2 : st.fBusy && pi ? pi.k : step >= total ? 4 : 0, col: '#8cc4ff' };
    } else if (st.xStep === 'disc') xPanel = { title: 'FLASH UNIT DISCONNECTION', detail: 'Valves closed · outlet line removed · ' + (c ? c.balloon.toFixed(2) : '') + ' psig recorded', ph: 4, col: '#9cc6ff' };
    else if (st.xStep === 'conn') xPanel = { title: 'FLASH UNIT CONNECTION', detail: 'Outlet line being made up · valves closed', ph: conn < 1 ? 2 : 4, col: '#9cc6ff' };
    else if (gasStep) {
      const ph = u < 0.07 ? 0 : u < 0.13 ? 1 : u < 0.53 ? 2 : u < 0.90 ? 3 : 4;
      const det = u < 0.07 ? 'PVT-cell outlet valve closed' : u < 0.13 ? 'PVT-cell outlet valve opening'
        : u < 0.38 ? 'Gas cap → outlet line → Flash Unit' : u < 0.44 ? 'Gas held at the closed balloon valve'
        : u < 0.53 ? 'Balloon valve opening' : u < pl.balEnd ? 'Gas entering the balloon · ' + (st.balloon || 0).toFixed(2) + ' psig'
        : pl.gaso && u < 0.76 ? 'Balloon full · routing excess gas to the gasometer'
        : pl.gaso && u < 0.90 ? 'Gas entering the gasometer · ' + Math.round(st.gaso || 0) + ' cc'
        : u < 0.95 ? 'Flow-rate drop · liquid at the outlet' : 'Valves closing';
      xPanel = { title: 'GAS COLLECTION · ' + XPH[ph], detail: det, ph, col: '#8cc4ff' };
    }
    const seg = [0, 1, 2, 3, 4].map((i) => 'fill:' + (!xPanel ? 'none' : i < xPanel.ph || xPanel.ph === 4 ? '#46d39a' : i === xPanel.ph ? xPanel.col : 'rgba(150,175,210,.22)') + ';');

    // ---- layout : PV workspace (Validation PV Test) or cell / Flash Unit workspace ----
    const pvOn = !isFinal && (!!st.pvRun || (stageDn && !pend));
    const pvInit = pvOn && isInit, pvSt = pvOn && !isInit;

    // ---- cell tag ----
    const phaseEmpty = isInit && V < 0.005;
    let tag = phaseEmpty ? 'Empty · evacuated' : 'Stable · ' + pTxt, tagTone = phaseEmpty ? 'busy' : 'good';
    if (busy && c) {
      tagTone = 'busy';
      if (step === 0) tag = 'Reducing pressure · ' + pTxt;
      else if (step === 1) tag = (st.cyc.length >= c.cycles.length ? 'Confirmation agitation' : 'Agitation cycle ' + (st.cyc.length + 1)) + ' · ' + vTxt;
      else if (step === 2) tag = 'Connecting Flash Unit';
      else if (step === 3) tag = 'Removing liberated gas · ' + pTxt;
      else if (step === 4) tag = 'Disconnecting Flash Unit';
    } else if (c && step === 2 && st.stabilized) tag = 'VOLUME STABILIZED · ' + c.stab.toFixed(4) + ' cc';
    else if (c && pend && stageDn) { tag = 'Recorded · PV test pending'; tagTone = 'busy'; }
    if (isFinal) { tag = busy && step === 0 ? 'Recompressing · ' + pTxt : 'Final Flash · ' + this.finalPhase().toLowerCase() + ' · cell ' + pTxt; tagTone = busy ? 'busy' : 'good'; }
    const tagCol = tagTone === 'good' ? 'var(--grn)' : 'var(--accb3)';

    // ---- side panel : stage record ----
    const cell = "font-family:'IBM Plex Mono',ui-monospace,monospace;";
    const kv = (k, v, col) => ({ k, v, c: col || 'var(--txt)' });
    const dis = 'var(--dis)';
    const frec = isFinal ? this.finalRecord() : null, fdone = isFinal && step >= total;
    const rec = isFinal ? [
      kv('Stage 6 at its Psat · measured', fmtP(S6.target) + ' · ' + S6.remaining.toFixed(4) + ' cc'),
      kv('Rs at 203 psig · ' + (FP.D.known ? 'calculated' : 'missing input'), FP.D.known ? FP.D.rs6.toFixed(2) + ' sm³/sm³' : '> 0 · input required', FP.D.known ? 'var(--txt)' : 'var(--amb)'),
      kv('Volume at 2,500 psig · calculated', st.recompressed ? V_FINAL.toFixed(4) + ' cc' : '—', st.recompressed ? 'var(--grn)' : dis),
      kv('Volume basis · assumed', 'Stage 6 P–V table (illustrative)', 'var(--mut)'),
      kv('Flashed from Pump A · calculated', (st.fFlashed || 0) > 0.0001 ? (st.fFlashed || 0).toFixed(4) + ' cc' : '—', (st.fFlashed || 0) > 0.0001 ? 'var(--amb)' : dis),
      kv('Final-flash gas, std 60 °F · ' + (FP.gas == null ? 'missing' : 'measured'), (st.fStep || 0) >= 4 ? gTxt(FP) : '—', (st.fStep || 0) >= 4 ? (FP.gas == null ? 'var(--amb)' : 'var(--txt)') : dis),
      kv('Stock-tank oil mass · ' + (FP.oil == null ? 'missing' : 'calculated'), (st.fOil || 0) > 0.005 ? (FP.oil == null ? 'input required' : (st.fOil || 0).toFixed(2) + ' g') : '—', (st.fOil || 0) > 0.005 ? (FP.oil == null ? 'var(--amb)' : 'var(--txt)') : dis),
      kv('Cumulative gas · report + final', FP.D.known ? Math.round(FP.D.cumGasScc).toLocaleString('en-US') + ' scc' : Math.round(FP.D.stageGasScc || 0).toLocaleString('en-US') + ' scc + final (missing)', FP.D.known ? 'var(--txt)' : 'var(--amb)'),
      kv('Rs after final flash', fdone ? '0 sm³/sm³' : '—', fdone ? 'var(--grn)' : dis),
      kv('Density 25 °C / 60 °F · example', fdone ? frec.rho.toFixed(5) + ' / ' + frec.rho60.toFixed(5) + ' g/cm³' : '—', fdone ? 'var(--amb)' : dis),
      kv('SG 60/60 · API · example', fdone ? frec.sg.toFixed(4) + ' · ' + frec.api.toFixed(1) + ' °API' : '—', fdone ? 'var(--grn)' : dis),
      kv('Residual oil at 60 °F · ' + (FP.D.known ? 'calculated' : 'missing'), fdone ? (frec.vSto == null ? 'input required' : frec.vSto.toFixed(4) + ' cc (mass ÷ ρ60)') : '—', fdone ? (frec.vSto == null ? 'var(--amb)' : 'var(--txt)') : dis),
      kv('Bo / Rs basis · ' + (FP.D.known ? 'calculated' : 'assumed'), FP.D.vRes.toFixed(4) + ' cc residual oil at 60 °F', 'var(--mut)')
    ] : c ? [
      kv('Inherited (' + (c.n === 1 ? 'Initial PV' : 'Stage ' + (c.n - 1)) + ')', fmtP(c.pStart) + ' · ' + c.vStart.toFixed(4) + ' cc'),
      kv('Stage pressure', step > 0 || (busy && step === 0) ? fmtP(c.target) : '—', step > 0 ? 'var(--grn)' : dis),
      kv('Pre-agitation volume', step > 0 ? c.vPre.toFixed(4) + ' cc' : '—', step > 0 ? 'var(--txt)' : dis),
      kv(c.pumpB ? 'Stabilized volume (A + B)' : 'Stabilized volume', st.stabilized ? c.stab.toFixed(4) + ' cc' : '—', st.stabilized ? 'var(--amb)' : dis),
      ...(c.n >= 2 ? [kv('Pump A / Pump B (stabilized)', st.stabilized ? c.pumpA.toFixed(4) + ' / ' + c.pumpB.toFixed(4) + ' cc' : '—', st.stabilized ? 'var(--amb)' : dis)] : []),
      kv('Balloon pressure', (st.balloon || 0) > 0.004 ? st.balloon.toFixed(2) + ' psig' : '—', (st.balloon || 0) > 0.004 ? 'var(--accb3)' : dis),
      kv('Gasometer', !gasoUsed ? 'isolated · 0 cc' : (st.gaso || 0) > 0.5 ? Math.round(st.gaso) + ' cc' : '—', gasoUsed && (st.gaso || 0) > 0.5 ? '#0e8f7a' : dis),
      kv('Remaining liquid', st.remaining ? c.remaining.toFixed(4) + ' cc @ ' + fmtP(c.target) : '—', st.remaining ? 'var(--txt)' : dis),
      ...(c.n === 6 ? [kv('Rs at 203 psig · ' + (DLF().known ? 'calculated' : 'missing input'), !st.remaining ? '—' : DLF().known ? DLF().rs6.toFixed(2) + ' sm³/sm³' : '> 0 · needs Stage 7 gas', !st.remaining ? dis : 'var(--amb)')] : []),
      kv(lbl + ' Psat', c.pvOK ? (st.pvConfirmed ? c.psatStr : '—') : 'MISSING', c.pvOK ? (st.pvConfirmed ? 'var(--red)' : dis) : 'var(--amb)')
    ] : [];
    const cycRows = st.cyc.map((cy) => ({ n: cy.confirm ? 'CHK' : String(cy.n), v: cy.v.toFixed(4), d: cy.confirm ? '0.0000  stable' : '+' + cy.d.toFixed(4),
      col: cy.confirm ? 'var(--grn)' : 'var(--amb)',
      row: 'display:grid; grid-template-columns:34px 1fr 1fr; align-items:center; height:19px; padding:0 8px; border-bottom:1px solid var(--line);' + cell + 'font-size:10.5px; background:' + (cy.confirm ? 'rgba(29,138,90,.10)' : 'transparent') + ';' }));
    if (c && busy && step === 1) cycRows.push({ n: '•', v: V.toFixed(4), d: 'agitating', col: 'var(--blue)',
      row: 'display:grid; grid-template-columns:34px 1fr 1fr; align-items:center; height:19px; padding:0 8px; border-bottom:1px solid var(--line);' + cell + 'font-size:10.5px; background:rgba(47,111,208,.08); color:var(--blue);' });

    // ---- result card ----
    let big = '', bigT = '', bigCol = 'var(--txt2)';
    if (isFinal) {
      if (fdone) { bigT = 'STAGE 7 COMPLETE · RECORDED SEPARATELY · Rs = 0'; big = 'Gas ' + gTxt(FP) + ' · ' + frec.api.toFixed(1) + ' °API (ex.)'; bigCol = FP.D.known ? 'var(--grn)' : 'var(--amb)'; }
      else { bigT = 'STAGE 7 · FINAL FLASH'; big = 'Starting Pressure: 2,500 psig'; bigCol = 'var(--blue)'; }
    } else if (isInit) {
      if (stageDn) { bigT = 'INITIAL PV COMPLETE'; big = 'Psat: 2500 psig @ 83.08 cc'; bigCol = 'var(--grn)'; }
    } else if (stageDn && pend) { bigT = 'STAGE ' + c.n + ' RECORDED · PV PENDING'; big = 'Remaining ' + c.remaining.toFixed(4) + ' cc'; bigCol = 'var(--amb)'; }
    else if (stageDn) { bigT = 'STAGE ' + c.n + ' COMPLETE'; big = c.psatPre + c.psatStr; bigCol = 'var(--grn)'; }
    else if (st.stabilized && step === 2 && !busy) { bigT = 'VOLUME STABILIZED'; big = (c.pumpB ? 'A ' + c.pumpA.toFixed(4) + ' · B ' + c.pumpB.toFixed(4) + ' cc' : c.stab.toFixed(4) + ' cc') + ' @ ' + fmtP(c.target); bigCol = 'var(--grn)'; }

    // ---- progress / buttons / navigation ----
    const progNames = isInit ? ['Charge 80 cc', 'PV Determination · 12 Points → Psat'] : isFinal ? FINAL_STEPS
      : ['Reduce to ' + fmtP(c.target), 'Agitate & Stabilize', 'Connect Flash Unit', 'Collect Gas', c.pvOK ? 'PV Test · Remaining Sample → Psat' : 'PV Test · data missing'];
    const progress = progNames.map((nm, i) => {
      const isDone = i < step, on = (i === step && !complete) || (complete && i === total - 1);
      return { n: String(i + 1).padStart(2, '0') + ' ', name: nm, numColor: isDone ? 'var(--grn)' : on ? 'var(--blue)' : 'var(--mut2)',
        style: 'display:inline-flex; align-items:center; gap:6px; padding:3px 9px; border-radius:999px; font-size:10px; font-weight:' + (on ? '600' : '400') +
          '; white-space:nowrap; color:' + (isDone ? 'var(--txt2)' : on ? 'var(--txt)' : 'var(--mut)') + '; background:' + (isDone ? 'rgba(29,138,90,.08)' : on ? 'rgba(47,111,208,.10)' : 'var(--icard)') +
          '; border:1px solid ' + (isDone ? 'rgba(29,138,90,.30)' : on ? 'rgba(47,111,208,.35)' : 'var(--line)') + ';' };
    });
    const stepNames = isInit ? ['Charge 80 cc', 'Run PV Determination'] : isFinal ? ['Recompress to 2,500 psig'].concat(FlashSim.ACTIONS)
      : ['Reduce Pressure', 'Agitate', 'Connect Flash Unit', 'Collect Gas', c.pvOK ? 'Run PV Test' : 'Disconnect & Record'];
    const dlStages = IDS.map(id => {
      const num = id === 'initpv' ? 0 : id === 'final' ? -1 : Number(id.slice(5)), dn = !!st.done[id], on = id === st.stage, pn = !!st.pending[id];
      const tg = dn ? (pn ? 'PV pending' : 'Complete') : on ? (busy ? 'Running' : 'Active') : num < 0 ? 'From 2,500 psig' : 'Ready';
      return { name: num === 0 ? 'Initial PV' : num < 0 ? 'Stage 7 · Final Flash' : 'Stage ' + num, tag: tg,
        tagColor: dn ? (pn ? 'var(--amb)' : 'var(--grn)') : on ? 'var(--blue)' : 'var(--mut)', color: 'var(--txt)',
        onClick: () => this.goStage(id),
        style: 'flex:1 1 0; min-width:0; display:flex; flex-direction:column; align-items:flex-start; text-align:left; font-family:inherit; padding:6px 10px; border-radius:9px; cursor:pointer; background:' +
          (on ? 'rgba(47,111,208,.12)' : dn ? (pn ? 'rgba(185,131,31,.08)' : 'rgba(29,138,90,.08)') : 'var(--panel)') +
          '; border:' + (on ? '2px solid var(--blue)' : '1px solid ' + (dn ? (pn ? 'rgba(185,131,31,.35)' : 'rgba(29,138,90,.35)') : 'var(--line)')) +
          '; box-shadow:' + (on ? '0 0 0 2px rgba(47,111,208,.15)' : '0 1px 2px rgba(20,35,60,.04)') + ';' };
    });
    const pillCol = stageDn ? (pend ? 'var(--amb)' : 'var(--grn)') : busy ? 'var(--blue)' : 'var(--txt2)';
    const idx = IDS.indexOf(st.stage), hasPrev = idx > 0, hasNext = idx < IDS.length - 1;
    const idle = busy || complete || st.chain;

    // ---- top strip ----
    let strip;
    if (isFinal) strip = [
      { k: 'Stage', v: 'Stage 7 · Final Flash from 2,500 psig', color: 'var(--txt)' },
      { k: 'Cell Pressure', v: pTxt, color: 'var(--grn)' },
      { k: 'Cell Volume', v: vTxt, color: 'var(--amb)' },
      { k: 'Flash Unit', v: (st.fuP == null ? 14.7 : st.fuP).toFixed(1) + ' psia', color: st.fBusy && st.fStage === 2 ? 'var(--accb3)' : 'var(--txt2)' },
      { k: 'Stock-tank Oil (calc.)', v: FP.oil == null ? ((st.fOil || 0) > 0.005 ? 'input required' : '—') : (st.fOil || 0).toFixed(2) + ' g', color: FP.oil == null && (st.fOil || 0) > 0.005 ? 'var(--amb)' : (st.fOil || 0) > 0.005 ? 'var(--amb)' : 'var(--mut)' },
      { k: 'Final-flash Gas (meas.)', v: (st.fStep || 0) >= 4 || (st.fBusy && st.fStage === 4) ? gTxt(FP) : '—', color: FP.gas == null ? 'var(--amb)' : 'var(--txt)' }];
    else if (isInit) strip = [
      { k: 'Stage', v: 'Initial PV', color: 'var(--txt)' },
      { k: 'Cell Pressure', v: pTxt, color: 'var(--grn)' },
      { k: 'Cell Volume', v: vTxt, color: 'var(--amb)' },
      { k: 'Charge', v: '80.0000 cc @ 5,000 psig', color: V >= 79.9999 || step > 0 ? 'var(--txt)' : 'var(--mut)' },
      { k: 'PV Points', v: (st.pvCount || 0) + ' / 12', color: st.pvCount ? 'var(--accb3)' : 'var(--mut)' },
      { k: 'Initial Psat', v: st.pvConfirmed || stageDn ? '2,500 psig @ 83.08 cc' : '—', color: st.pvConfirmed || stageDn ? 'var(--red)' : 'var(--mut)' }];
    else if (pvSt) strip = [
      { k: lbl + ' · Pressure', v: fmtP(c.target), color: 'var(--grn)' },
      { k: c.pumpB ? 'Stabilized · Pump A / B' : 'Stabilized Volume', v: c.pumpB ? c.pumpA.toFixed(4) + ' / ' + c.pumpB.toFixed(4) + ' cc' : c.stab.toFixed(4) + ' cc', color: 'var(--amb)' },
      { k: 'Balloon Pressure', v: c.balloon.toFixed(2) + ' psig', color: '#2f6fd0' },
      { k: 'Gasometer', v: gasoUsed ? c.gasometer + ' cc' : '0 cc · isolated', color: gasoUsed ? '#0e8f7a' : 'var(--mut)' },
      { k: 'Remaining Liquid', v: c.remaining.toFixed(4) + ' cc @ ' + fmtP(c.target), color: 'var(--txt)' },
      { k: lbl + ' Psat', v: st.pvConfirmed || stageDn ? c.psatStr : '—', color: st.pvConfirmed || stageDn ? 'var(--red)' : 'var(--mut)' }];
    else strip = [
      { k: 'Stage', v: lbl, color: 'var(--txt)' },
      { k: 'Cell Pressure', v: pTxt, color: 'var(--grn)' },
      { k: 'Cell Volume', v: vTxt, color: 'var(--amb)' },
      { k: 'Flow Rate', v: (st.flow || 0).toFixed(2) + ' mL/min', color: (st.flow || 0) > 0.05 ? '#2f6fd0' : 'var(--mut)' },
      { k: 'Balloon Pressure', v: (st.balloon || 0).toFixed(2) + ' psig', color: (st.balloon || 0) > 0.004 ? '#2f6fd0' : 'var(--mut)' },
      { k: 'Gasometer', v: gasoUsed ? Math.round(st.gaso || 0) + ' cc' : '0 cc · isolated', color: (st.gaso || 0) > 0.5 ? '#2f6fd0' : 'var(--mut)' }];

    // ---- Initial PV charge line (static: charge is set in one click) ----
    return {
      onBack: this.props.onBack || (() => {}),
      dlPillText: st.stageTag, dlPillColor: pillCol,
      dlPillBg: pillCol === 'var(--grn)' ? 'rgba(29,138,90,.10)' : pillCol === 'var(--amb)' ? 'rgba(185,131,31,.10)' : 'var(--chipbg)',
      dlPillBorder: pillCol === 'var(--grn)' ? 'rgba(29,138,90,.40)' : pillCol === 'var(--amb)' ? 'rgba(185,131,31,.40)' : 'var(--line2)',
      dlPillDot: 'width:7px; height:7px; border-radius:50%; background:' + pillCol + ';',
      dlStrip: strip, dlStages, dlProgress: progress,
      dlHint: isFinal ? 'Recompress the Stage 6 liquid to 2,500 psig → approved Flash Process → Density & API' : isInit ? (stageDn ? 'Psat 2,500 psig @ 83.08 cc · continue with Stage 1' : 'Charge 80 cc → PV Determination (12 points) → Psat → return to 5,000 psig')
        : stageDn ? (pend ? 'PV pending — missing: ' + c.missing.join('; ') : c.psatPre + c.psatStr)
        : 'Reduce → agitate → connect → collect gas → PV test',
      dlRunStep: () => this.runStep(),
      dlBtnText: busy ? 'Running…' : complete ? lbl + (pend ? ' Recorded' : ' Complete') : stepNames[step],
      dlBtnCursor: idle ? 'default' : 'pointer',
      dlBtnBg: idle ? 'var(--icard)' : 'linear-gradient(180deg,#46d39a,#2f9d72)',
      dlBtnBorder: idle ? 'var(--line2)' : '#2f9d72', dlBtnColor: idle ? 'var(--mut)' : '#06231a',
      dlRunAll: () => this.runAll(),
      dlAutoText: st.chain ? 'Running…' : 'Run Whole Stage',
      dlAutoCursor: idle ? 'default' : 'pointer',
      dlAutoBg: st.chain ? 'rgba(47,111,208,.10)' : 'var(--icard)',
      dlAutoBorder: st.chain ? 'var(--blue)' : 'var(--line2)', dlAutoColor: st.chain ? 'var(--blue)' : complete || busy ? 'var(--mut)' : 'var(--txt2)',
      dlPrevStage: () => { if (hasPrev) this.goStage(IDS[idx - 1]); },
      dlNextStage: () => { if (hasNext) this.goStage(IDS[idx + 1]); },
      dlPrevStyle: 'opacity:' + (hasPrev ? 1 : .4) + '; cursor:' + (hasPrev ? 'pointer' : 'default') + ';',
      dlNextStyle: 'opacity:' + (hasNext ? 1 : .4) + '; cursor:' + (hasNext ? 'pointer' : 'default') + ';',
      dlReset: () => this.resetStage(), dlResetAll: () => this.resetAll(),
      dlResetText: 'Reset ' + lbl,

      dlnPvInit: pvInit, dlnPvSt: pvSt, dlnCellOn: !pvOn, dlnSideOn: !isInit,
      // embedded PV brings its own cards; the cell / Flash Unit scene uses the shared simulation frame
      dlnSimCls: pvOn ? '' : 'vl-sim',
      dlnPvCfg: PV_INIT_CFG, dlnPvStCfg: c && c.pvOK ? c.pvCfg : PV_INIT_CFG, dlnRunKey: st.runKey || 0,
      dlnShowDone: stageDn && !pend && !st.pvRun,
      dlnOnSync: (ps) => this.pvSync(ps), dlnOnDone: () => this.pvDone(),
      dlnChargeOn: isInit,
      dlnChDash: '0 9999', dlnChStyle: 'opacity:0;',
      dlnChHead: { x: '752', y: '190', st: 'opacity:0;' },
      dlnChValve: 'rotate(0 784 190)', dlnChValveC: '#8fa3c2', dlnChValveText: 'INLET CLOSED', dlnChValveCol: 'var(--mut)',
      // layout only: cell-only view (charge, reduction, agitation) is framed tightly on the cell; the Flash Unit view
      // keeps the computer / control box secondary (scaled) so the cell, Flash Unit and gasometer get the width
      // compact setup: Computer above Control Box, Control Box centred on the cell pressure / volume readouts,
      // short signal line ending on the cell frame (cell view: frame x 360, readouts y 303; Flash view: frame x 326, readouts y 323)
      dlnVb: isFinal ? '0 76 1400 540' : flashOn ? '0 76 1330 530' : '290 72 580 490',
      dlnCtlTr: flashOn ? 'translate(144,64) scale(.72)' : 'translate(180,44) scale(.72)',
      dlnSigD: flashOn ? 'M284 323 H326' : 'M320 303 H360',
      dlnSigLbl: flashOn ? { x: '305', y: '317' } : { x: '340', y: '297' },
      // Flash Unit view: PVT cell enlarged about its outlet (manifold end above Pump A stays at 584,170, where the outlet line starts)
      dlnCellTr: flashOn ? 'translate(-506,-20)' : 'translate(-446,-20)',
      dlnSideW: 'flex:0 0 ' + (flashOn ? 286 : 300) + 'px;',
      dlnTitleSub: isFinal ? 'Stage 7 Final Flash — Starting Pressure: 2,500 psig (Stage 6 Psat 203 psig) · PVT Cell → Port R → flask → Gasometer · Density Meter'
        : isInit ? 'Computer → Control Box → Dual-Cylinder PVT Cell'
        : flashOn ? 'PVT Cell → outlet line → Flash Unit → Balloon' + (gasoUsed ? ' → Gasometer (excess gas)' : ' · Gasometer isolated')
        : 'Computer → Control Box → Dual-Cylinder PVT Cell · Flash Unit disconnected',
      dlnTag: tag, dlnTagCol: tagCol,
      dlnTagBg: tagTone === 'good' ? 'rgba(29,138,90,.10)' : 'rgba(47,111,208,.10)',
      dlnTagBd: tagTone === 'good' ? 'rgba(29,138,90,.30)' : 'rgba(47,111,208,.32)',
      dlnP: pTxt, dlnPNum: Math.round(P).toLocaleString('en-US'), dlnV: vTxt, dlnVNum: V.toFixed(4),
      dlnGasH: gh.toFixed(1), dlnLiqY: (219 + gh).toFixed(1), dlnLiqH: Math.max(0, h - gh).toFixed(1), dlnPistonY: (219 + h).toFixed(1),
      dlnBGasH: ghB.toFixed(1), dlnBLiqY: (219 + ghB).toFixed(1), dlnBLiqH: Math.max(0, hB - ghB).toFixed(1), dlnBPistonY: (219 + hB).toFixed(1),
      dlnIfStyle: 'opacity:' + (gasOn && gasA > 0.05 && oilA > 0.05 ? 0.55 * (1 - dA) : 0).toFixed(2) + ';',
      dlnDissStyle: 'animation:pvtdiss calc(3.4s * var(--pm, 1)) ease-in-out infinite; pointer-events:none;',
      dlnBubsA: bubs(1012, 219 + gh, 219 + h, gasA * dA), dlnBubsB: bubs(848, 219 + ghB, 219 + hB, gasBin * dB),
      dlnPumpA: vA.toFixed(c && c.n >= 2 ? 4 : 2) + ' cc', dlnPumpB: vBt.toFixed(c && c.n >= 2 ? 4 : 2) + ' cc',
      dlnXferStyle: 'opacity:' + (xferOn ? 1 : 0) + '; transition:opacity .35s ease;',
      dlnArrowD: phase === 'b2a' ? 'M 980 184 l 12 6 l -12 6 Z' : 'M 916 184 l -12 6 l 12 6 Z',
      dlnRouteD: 'M ' + route.map((q) => q[0] + ' ' + q[1]).join(' L '),
      dlnFluidDash: '0 ' + tl.toFixed(1) + ' ' + band.toFixed(1) + ' ' + (L + 20),
      dlnFluidStyle: 'opacity:' + (band > 0.5 ? 1 : 0) + ';',
      dlnSpecks: specks, dlnSlugX: fp[0].toFixed(1), dlnSlugY: fp[1].toFixed(1),
      dlnSlugStyle: 'opacity:' + (xferOn && fr > 0.02 && fr < 0.995 ? 1 : 0) + '; transition:opacity .3s ease; filter:drop-shadow(0 0 4px #ffcf3f);',
      dlnNeedleX: (948 + 11 * Math.cos(ang)).toFixed(1), dlnNeedleY: (240 + 11 * Math.sin(ang)).toFixed(1),
      dlnSensorPulse: 'opacity:0;', dlnBoxGlow: '#1d3350',
      dlnPhaseText: phaseText, dlnPhaseColor: phaseColor,

      dlnFlashOn: flashOn,
      dlnValveA: true, dlnValveB: st.pvPhase === 'a2b' || st.pvPhase === 'hold' || st.pvPhase === 'b2a',
dlnDisc: conn < 0.001,
      dlnValveOn: conn > 0.45,
      dlnVC: valve(vCell, 656, 170),
      dlnCellValveText: vCell > 0.5 ? 'OPEN' : 'CLOSED', dlnCellValveCol: vCell > 0.5 ? 'var(--grn)' : 'var(--mut)',
      dlnXOn: !!xPanel, dlnXTitle: xPanel ? xPanel.title : '', dlnXDetail: xPanel ? xPanel.detail : '',
      dlnXBd: xPanel ? (xPanel.ph === 4 ? '#46d39a' : xPanel.col) : 'none', dlnXBg: xPanel && xPanel.ph === 4 ? '#0e2019' : '#0f1a2c',
      dlnSeg0: seg[0], dlnSeg1: seg[1], dlnSeg2: seg[2], dlnSeg3: seg[3], dlnSeg4: seg[4],

      dlnRecTitle: lbl + ' Record', dlnS1Rec: rec, dlnCycRows: cycRows, dlnCycEmpty: !cycRows.length, dlnCycOn: !isFinal,
      dlnFinOn: isFinal, dlnFinSteps: isFinal ? FINAL_STEPS.map((nm, i) => ({ n: String(i + 1).padStart(2, '0'), name: nm,
        st: i < step ? 'DONE' : i === step && busy ? 'RUNNING' : i === step ? 'NEXT' : '',
        col: i < step ? 'var(--grn)' : i === step ? 'var(--blue)' : 'var(--mut2)' })) : [],
      dlnStabText: st.stabilized ? 'VOLUME STABILIZED' : (busy && step === 1 ? 'AGITATING' : 'NOT YET AGITATED'),
      dlnStabCol: st.stabilized ? 'var(--grn)' : busy && step === 1 ? 'var(--amb)' : 'var(--mut)',
      dlnMissOn: !!(c && c.missing.length), dlnMissText: c ? c.missing.join(' · ') : '',
      dlnBig: big, dlnBigT: bigT, dlnBigCol: bigCol, dlnBigOn: !!big
    };
  }
}

DC.define('StageDiffLib', {
  style: `/* Standalone-only fallback: matches only when this DC is opened on its own.
     When embedded in PVT Nexus the selector never matches, so the global theme
     (html / html[data-theme="light"]) in theme.css is used untouched. */
  #dc-root > .sc-host > [data-screen-label="Differential Liberation"] {
    --bg:#eef1f6; --panel:#ffffff; --panel2:#f4f6fa;
    --line:rgba(40,60,90,.12); --line2:rgba(40,60,90,.20);
    --txt:#16202f; --txt2:#3a4759; --mut:#566578; --mut2:#8492a4;
    --blue:#2f6fd0; --grn:#1d8a5a; --amb:#b9831f; --red:#c33a52; --teal:#0e8f7a;
    --cap:rgba(38,56,80,.68); --cap2:rgba(38,56,80,.78);
    --chipbg:#eaeff7; --chipt:#3a4759; --icard:#f4f6fa; --dis:#9aa7b8;
    font-family:'IBM Plex Sans',system-ui,sans-serif;
    background:var(--bg); color:var(--txt);
    -webkit-font-smoothing:antialiased;
  }
  #dc-root > .sc-host > [data-screen-label="Differential Liberation"] * { box-sizing:border-box; }
  @keyframes dldash { to { stroke-dashoffset:-24; } }
  @keyframes dlnFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }`,
  template: `<div data-screen-label="Differential Liberation" class="pg pg-stack">

  <!-- header (shared .pg-head, same treatment as Validation): eyebrow · title · status · description · equipment details -->
  <div class="pg-head">
    <div class="pg-titles">
      <span class="pg-eyebrow">Analysis</span>
      <h2 class="pg-title">Differential Liberation</h2>
      <span style="align-self:center; display:inline-flex; align-items:center; gap:6px; flex:0 0 auto; padding:3px 11px; border-radius:999px; background:{{ dlPillBg }}; border:1px solid {{ dlPillBorder }}; font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.7px; text-transform:uppercase; color:{{ dlPillColor }}; white-space:nowrap;"><span style="{{ dlPillDot }}"></span>{{ dlPillText }}</span>
      <p class="pg-desc">Initial PV determination on an 80 cc charge, stage-wise pressure reduction with liberated-gas removal, then a final flash from 2,500 psig</p>
    </div>
    <div class="pg-end fx-btns"><button type="button" class="bd-btn" data-cd-open="" data-cd-ctx="Differential Liberation · cell outlet at Port R">Cell Details</button><button type="button" class="bd-btn" data-fd-open="fu" data-fd-src="StageDiffLib:dl" data-fd-ctx="Differential Liberation · liberated gas to the balloon">Flash Unit Details</button><button type="button" class="bd-btn" data-fd-open="ga" data-fd-src="StageDiffLib:dl" data-fd-ctx="Differential Liberation · excess liberated gas">Gasometer Details</button><button type="button" class="bd-btn" data-fd-open="dm" data-fd-src="StageDiffLib:dl" data-fd-ctx="Differential Liberation · final flash Density &amp; API">Density Meter Details</button></div>
  </div>

  <!-- stage navigation : every stage is always reachable, regardless of completion -->
  <div class="stage-strip" style="display:flex; align-items:stretch; gap:6px; flex-wrap:wrap; flex:0 0 auto;">
    <sc-for list="{{ dlStages }}" as="s" hint-placeholder-count="7">
      <button onclick="{{ s.onClick }}" style="{{ s.style }}">
        <span style="font-size:11.5px; font-weight:600; color:{{ s.color }};">{{ s.name }}</span>
        <span style="font-family:'IBM Plex Mono'; font-size:8.5px; letter-spacing:.5px; text-transform:uppercase; color:{{ s.tagColor }}; margin-top:1px;">{{ s.tag }}</span>
      </button>
    </sc-for>
  </div>

  <div class="lab-body">
  <div class="lab-schem {{ dlnSimCls }}" style="gap:8px;">
  <!-- ===== Initial PV + Stage 1 : one connected schematic (Validation PV cell + Validation Flash Unit) ===== -->
  <!-- Initial PV · PV Determination : the Validation PV Test itself (cell, P-V table, P-V graph, 12-point sequence) on the 80 cc configuration -->
  <sc-if value="{{ dlnPvInit }}" hint-placeholder-val="{{ false }}">
  <div style="flex:1 1 auto; min-height:0; display:flex; flex-direction:column; animation:dlnFadeIn .45s ease both;">
    <dc-import name="StagePVTest" hint-size="100%,100%" embedded="{{ true }}" pv-config="{{ dlnPvCfg }}" run-key="{{ dlnRunKey }}" show-done="{{ dlnShowDone }}" on-sync="{{ dlnOnSync }}" on-done="{{ dlnOnDone }}"></dc-import>
  </div>
  </sc-if>
  <!-- Stages 1-6 · PV test on the remaining sample : the same Validation PV Test with the stage configuration (Flash Unit removed) -->
  <sc-if value="{{ dlnPvSt }}" hint-placeholder-val="{{ false }}">
  <div style="flex:1 1 auto; min-height:0; display:flex; flex-direction:column; animation:dlnFadeIn .45s ease both;">
    <dc-import name="StagePVTest" hint-size="100%,100%" embedded="{{ true }}" pv-config="{{ dlnPvStCfg }}" run-key="{{ dlnRunKey }}" show-done="{{ dlnShowDone }}" on-sync="{{ dlnOnSync }}" on-done="{{ dlnOnDone }}"></dc-import>
  </div>
  </sc-if>

  <sc-if value="{{ dlnCellOn }}" hint-placeholder-val="{{ true }}">
  <div style="display:flex; flex:1 1 auto; min-height:0; min-width:0;">
    <div style="flex:1 1 auto; min-width:0; min-height:0; display:flex; flex-direction:column;">
      <div style="flex:0 0 auto; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <div style="min-width:0;">
          <div style="font-size:12.5px; font-weight:600; color:var(--txt);">Integrated PVT Setup</div>
          <div style="font-size:10px; color:var(--mut); margin-top:1px;">{{ dlnTitleSub }}</div>
        </div>
        <div style="flex:1 1 10px;"></div>
        <span style="display:inline-flex; align-items:center; padding:3px 10px; border-radius:999px; background:{{ dlnTagBg }}; border:1px solid {{ dlnTagBd }}; font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.5px; color:{{ dlnTagCol }}; white-space:nowrap;">{{ dlnTag }}</span>
      </div>
      <svg viewBox="{{ dlnVb }}" preserveAspectRatio="xMidYMid meet" style="display:block; width:100%; flex:1 1 auto; min-height:0; margin-top:4px;">
        <defs>
          ${PVTCellArt.defs('dlc')}
          <linearGradient id="dln-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"></stop><stop offset=".42" stop-color="#b3c1d8"></stop><stop offset=".58" stop-color="#7e90b0"></stop><stop offset="1" stop-color="#1f2a3e"></stop></linearGradient>
          <linearGradient id="dln-cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>
          <linearGradient id="dln-gcyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b2637"></stop><stop offset=".35" stop-color="#43556f"></stop><stop offset=".62" stop-color="#2c3a4f"></stop><stop offset="1" stop-color="#161f2e"></stop></linearGradient>
          <pattern id="dln-sample" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#c7a233"></rect><circle cx="4.5" cy="4.5" r="1.15" fill="#f2d879" opacity=".7"></circle></pattern>
          <pattern id="dln-diss" width="13" height="13" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".8" fill="#eafff4"></circle><circle cx="9.5" cy="8.5" r=".65" fill="#eafff4"></circle><circle cx="6" cy="11.5" r=".5" fill="#eafff4"></circle><circle cx="11.5" cy="2" r=".55" fill="#eafff4"></circle></pattern>
          <linearGradient id="dln-gas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fe3b4" stop-opacity=".34"></stop><stop offset="1" stop-color="#3fbf8c" stop-opacity=".62"></stop></linearGradient>
          <clipPath id="dln-a-clip"><rect x="1012" y="219" width="36" height="182" rx="3"></rect></clipPath>
          <clipPath id="dln-b-clip"><rect x="848" y="219" width="36" height="182" rx="3"></rect></clipPath>
        </defs>

        <!-- 1-2. computer + controller (approved desk) + signal cable from the cell -->
        <sc-if value="{{ dlnFlashOn }}" hint-placeholder-val="{{ false }}">
          <path d="M607.7 412.6 C 636 468, 628 506, 566 506 L 210 506 C 168 506, 154 430, 148 306" fill="none" stroke="#1e2733" stroke-width="3.2" stroke-linecap="round"></path>
          ${PVTCellArt.desk('dlc', { x: 44, y: 230, s: .4, legs: 409, ctl: '{{ dlnPNum }}', rows: [['P psig', '{{ dlnPNum }}', '#7ff0bf'], ['V cc', '{{ dlnVNum }}', '#ffc56b']] })}
        </sc-if>
        <sc-if value="{{ !dlnFlashOn }}" hint-placeholder-val="{{ true }}">
          ${PVTCellArt.cable({ at: { x: PVTCellArt.LEGACY.x - 446, y: PVTCellArt.LEGACY.y - 20, s: PVTCellArt.LEGACY.s } }, { x: 716, y: 250, s: .38 }, 24)}
          ${PVTCellArt.desk('dlc', { x: 716, y: 250, s: .38, legs: 393, ctl: '{{ dlnPNum }}', rows: [['P psig', '{{ dlnPNum }}', '#7ff0bf'], ['V cc', '{{ dlnVNum }}', '#ffc56b']] })}
        </sc-if>

        <!-- 3. dual-cylinder PVT cell (Validation PV cell geometry, true-scale 100 cc bore) -->
        <g transform="{{ dlnCellTr }}">
          <!-- approved PVT cell (PVTCellArt) on the legacy frame; Pump A valve open to the sensor, Pump B valve open while
               the sample is in transit / held in Pump B, Port R valve = the PVT-cell outlet valve of the Flash-Unit stage -->
          ${PVTCellArt.cell('dlc', {
            innerB: `<rect x="848" y="219" width="36" height="{{ dlnBGasH }}" fill="url(#dln-gas)"></rect>
            <rect x="848" y="{{ dlnBLiqY }}" width="36" height="{{ dlnBLiqH }}" fill="url(#dln-sample)"></rect>
            <rect x="848" y="{{ dlnBLiqY }}" width="36" height="{{ dlnBLiqH }}" fill="url(#dln-diss)" style="{{ dlnDissStyle }}"></rect>
            <sc-for list="{{ dlnBubsB }}" as="bb" hint-placeholder-count="10">
              <circle cx="{{ bb.x }}" cy="{{ bb.y }}" r="{{ bb.r }}" fill="#bff3da" opacity="{{ bb.o }}"></circle>
            </sc-for>`,
            innerA: `<rect x="1012" y="219" width="36" height="{{ dlnGasH }}" fill="url(#dln-gas)"></rect>
            <rect x="1012" y="{{ dlnLiqY }}" width="36" height="{{ dlnLiqH }}" fill="url(#dln-sample)"></rect>
            <rect x="1012" y="{{ dlnLiqY }}" width="36" height="{{ dlnLiqH }}" fill="url(#dln-diss)" style="{{ dlnDissStyle }}"></rect>
            <rect x="1012" y="{{ dlnLiqY }}" width="36" height="1.4" fill="#eafff4" style="{{ dlnIfStyle }}"></rect>
            <rect x="1012" y="219" width="36" height="3.5" fill="#ffffff" opacity=".18"></rect>
            <sc-for list="{{ dlnBubsA }}" as="ba" hint-placeholder-count="10">
              <circle cx="{{ ba.x }}" cy="{{ ba.y }}" r="{{ ba.r }}" fill="#bff3da" opacity="{{ ba.o }}"></circle>
            </sc-for>`,
            pistonB: 'dlnBPistonY', pistonA: 'dlnPistonY',
            valves: { A: "dlnValveA", B: 'dlnValveB', R: "dlnVC.c === '#46d39a'" },
            ports: { R: { plug: '!(dlnFlashOn && !dlnDisc)', nut: 'dlnFlashOn && !dlnDisc' } },
            disp: { P: '{{ dlnPNum }}', B: '{{ dlnPumpB }}', A: '{{ dlnPumpA }}' } })}
          <g style="{{ dlnXferStyle }}">
            <path d="{{ dlnRouteD }}" fill="none" stroke="#d9ad2f" stroke-width="3.4" stroke-linecap="butt" stroke-linejoin="round" stroke-dasharray="{{ dlnFluidDash }}" style="{{ dlnFluidStyle }}"></path>
            <path d="{{ dlnRouteD }}" fill="none" stroke="#fff0b8" stroke-width="1.1" stroke-linecap="butt" stroke-linejoin="round" stroke-dasharray="{{ dlnFluidDash }}" opacity=".55" style="{{ dlnFluidStyle }}"></path>
            <sc-for list="{{ dlnSpecks }}" as="sp" hint-placeholder-count="7">
              <circle cx="{{ sp.x }}" cy="{{ sp.y }}" r="{{ sp.r }}" fill="{{ sp.fill }}" opacity="{{ sp.o }}"></circle>
            </sc-for>
            <path d="{{ dlnArrowD }}" fill="#ffcf3f"></path>
            <circle cx="{{ dlnSlugX }}" cy="{{ dlnSlugY }}" r="5.5" fill="none" stroke="#ffcf3f" stroke-width="1.4" style="{{ dlnSlugStyle }}"></circle>
          </g>
          <circle cx="948" cy="217.7" r="24" fill="none" stroke="#46e0ff" stroke-width="1.6" style="{{ dlnSensorPulse }}"></circle>
          <text x="948" y="174" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" letter-spacing=".5" fill="var(--cap2)">SAMPLE MANIFOLD</text>
          <foreignObject x="790" y="520" width="152" height="18"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif; font-size:12.5px; color:var(--txt2);">Pump B &#183;&#160;<span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-weight:600; color:var(--amb);">{{ dlnPumpB }}</span></div></foreignObject>
          <foreignObject x="952" y="520" width="156" height="18"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif; font-size:12.5px; color:var(--txt2);">Pump A &#183;&#160;<span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-weight:600; color:var(--amb);">{{ dlnPumpA }}</span></div></foreignObject>
          <foreignObject x="798" y="540" width="300" height="16"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:.6px; color:{{ dlnPhaseColor }};">{{ dlnPhaseText }}</div></foreignObject>
        </g>

        <!-- ===== Stage 1 : Flash Unit (Validation sketch) connected to the PVT cell outlet ===== -->
        <sc-if value="{{ dlnFlashOn }}" hint-placeholder-val="{{ false }}">
          <sc-if value="{{ dlnDisc }}" hint-placeholder-val="{{ true }}">
            <text text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" letter-spacing=".3" fill="var(--amb)"><tspan x="672" y="251">NOT</tspan><tspan x="672" y="262">CONNECTED</tspan></text>
            <line x1="652" y1="170" x2="686" y2="215" stroke="var(--mut2)" stroke-width="1" stroke-dasharray="3 5" opacity=".6"></line>
          </sc-if>
          <!-- approved Flash Unit (flask isolated, balloon on the manifold) + two-section Gasometer (equipment/flash), drawn
               from this page's own values by FlashHost: outlet line made up / broken out with conn, gas-cap gas along the
               manifold past the closed Flask Valve into the balloon, excess on to the 2,000 cc section -->
          <g class="fx-host" data-fx="StageDiffLib:dl"></g>
          <!-- (PVT-cell outlet valve = the cell's Port R isolation valve; its OPEN/CLOSED tag is on the cell) -->
          <!-- phase panel (Validation Flash status panel) -->
          <sc-if value="{{ dlnXOn }}" hint-placeholder-val="{{ false }}">
            <rect x="690" y="80" width="330" height="50" rx="7" fill="{{ dlnXBg }}" stroke="{{ dlnXBd }}" stroke-width="1.4"></rect>
            <foreignObject x="690" y="84" width="330" height="20"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:13px; font-weight:600; letter-spacing:.8px; color:{{ dlnXBd }};">{{ dlnXTitle }}</div></foreignObject>
            <foreignObject x="690" y="103" width="330" height="18"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif; font-size:12px; color:#e8f1fb;">{{ dlnXDetail }}</div></foreignObject>
            <rect x="703" y="124" width="58" height="2.6" rx="1.3" style="{{ dlnSeg0 }}"></rect>
            <rect x="765" y="124" width="58" height="2.6" rx="1.3" style="{{ dlnSeg1 }}"></rect>
            <rect x="827" y="124" width="58" height="2.6" rx="1.3" style="{{ dlnSeg2 }}"></rect>
            <rect x="889" y="124" width="58" height="2.6" rx="1.3" style="{{ dlnSeg3 }}"></rect>
            <rect x="951" y="124" width="58" height="2.6" rx="1.3" style="{{ dlnSeg4 }}"></rect>
          </sc-if>
        </sc-if>
      </svg>
    </div>

  </div>
  </sc-if>
  </div>

  <!-- sidebar (shared Validation layout): live readings · stage record · agitation log above the procedure dock -->
  <div class="lab-side">
    <div class="vl-scroll">
      <div class="vl-sec">
        <div class="vl-k">Live readings</div>
        <div class="vl-cards">
          <sc-for list="{{ dlStrip }}" as="r" hint-placeholder-count="6">
            <div class="vl-c"><div class="vl-cl" style="white-space:normal;">{{ r.k }}</div><div class="vl-cv" style="color:{{ r.color }}; font-size:12px; white-space:normal; line-height:1.25;">{{ r.v }}</div></div>
          </sc-for>
        </div>
      </div>
    <!-- side panel : live step record (Stage 1) -->
    <sc-if value="{{ dlnSideOn }}" hint-placeholder-val="{{ false }}">
    <div style="flex:0 0 auto; min-width:0; display:flex; flex-direction:column; gap:8px;">
      <sc-if value="{{ dlnBigOn }}" hint-placeholder-val="{{ false }}">
        <div style="flex:0 0 auto; border:1.4px solid {{ dlnBigCol }}; border-radius:9px; padding:6px 10px; background:var(--icard);">
          <div style="font-family:'IBM Plex Mono'; font-size:9.5px; font-weight:600; letter-spacing:.6px; color:{{ dlnBigCol }};">{{ dlnBigT }}</div>
          <div style="font-family:'IBM Plex Mono'; font-size:13px; font-weight:700; color:var(--txt); margin-top:2px; white-space:nowrap;">{{ dlnBig }}</div>
        </div>
      </sc-if>

      <!-- Stage 1 : stage record -->
      <sc-if value="{{ dlnSideOn }}" hint-placeholder-val="{{ false }}">
        <div style="flex:0 0 auto; border:1px solid var(--line); border-radius:9px; padding:5px 0;">
          <div style="padding:2px 11px 4px; font-size:11.5px; font-weight:600; color:var(--txt);">{{ dlnRecTitle }}</div>
          <sc-for list="{{ dlnS1Rec }}" as="r" hint-placeholder-count="7">
            <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px; padding:2px 11px; font-family:'IBM Plex Mono'; font-size:10px;"><span style="color:var(--mut); min-width:0;">{{ r.k }}</span><span style="font-weight:600; color:{{ r.c }}; text-align:right; flex:0 1 auto;">{{ r.v }}</span></div>
          </sc-for>
        </div>
      </sc-if>
      <sc-if value="{{ dlnMissOn }}" hint-placeholder-val="{{ false }}">
        <div style="flex:0 0 auto; border:1.4px solid var(--amb); border-radius:9px; padding:6px 10px; background:rgba(185,131,31,.08);">
          <div style="font-family:'IBM Plex Mono'; font-size:9.5px; font-weight:700; letter-spacing:.6px; color:var(--amb);">DATASET · MISSING FOR PV TEST</div>
          <div style="font-size:10.5px; color:var(--txt2); margin-top:2px; line-height:1.35;">{{ dlnMissText }}</div>
        </div>
      </sc-if>
      <sc-if value="{{ dlnFinOn }}" hint-placeholder-val="{{ false }}">
        <div style="flex:0 0 auto; border:1px solid var(--line2); border-radius:9px; overflow:hidden;">
          <div style="padding:4px 10px; background:var(--icard); border-bottom:1px solid var(--line2); font-family:'IBM Plex Mono'; font-size:9.5px; font-weight:700; letter-spacing:.5px; color:var(--mut);">FINAL FLASH STEPS</div>
          <sc-for list="{{ dlnFinSteps }}" as="fs" hint-placeholder-count="8">
            <div style="display:grid; grid-template-columns:24px 1fr auto; align-items:center; height:19px; padding:0 10px; border-bottom:1px solid var(--line); font-family:'IBM Plex Mono'; font-size:10px;"><span style="color:var(--mut2);">{{ fs.n }}</span><span style="color:var(--txt);">{{ fs.name }}</span><span style="font-weight:700; color:{{ fs.col }};">{{ fs.st }}</span></div>
          </sc-for>
        </div>
      </sc-if>
      <sc-if value="{{ dlnCycOn }}" hint-placeholder-val="{{ false }}">
        <div style="flex:1 1 auto; min-height:0; border:1px solid var(--line2); border-radius:9px; overflow:hidden; display:flex; flex-direction:column;">
          <div style="flex:0 0 auto; display:grid; grid-template-columns:34px 1fr 1fr; padding:0 8px; height:21px; align-items:center; background:var(--icard); border-bottom:1px solid var(--line2); font-family:'IBM Plex Mono'; font-size:9.5px; font-weight:700; color:var(--txt2);"><span>Cyc</span><span>Volume, cc</span><span>Change</span></div>
          <div style="flex:1 1 auto; min-height:0; overflow-y:auto;">
            <sc-for list="{{ dlnCycRows }}" as="c" hint-placeholder-count="8">
              <div style="{{ c.row }}"><span style="color:var(--mut2);">{{ c.n }}</span><span style="font-weight:600; color:var(--txt);">{{ c.v }}</span><span style="color:{{ c.col }};">{{ c.d }}</span></div>
            </sc-for>
            <sc-if value="{{ dlnCycEmpty }}" hint-placeholder-val="{{ false }}">
              <div style="padding:8px 10px; font-size:10.5px; color:var(--mut);">Agitation cycles are logged here: the volume rises each cycle until it stops changing.</div>
            </sc-if>
          </div>
          <div style="flex:0 0 auto; padding:5px 10px; border-top:1px solid var(--line2); font-size:11.5px; font-weight:700; color:{{ dlnStabCol }};">{{ dlnStabText }}</div>
        </div>
      </sc-if>
    </div>
    </sc-if>
    </div>
    <div class="vl-dock">
      <div class="pc-host" data-pc="StageDiffLib" data-pc-layout="side"></div>
      <div class="vl-fwd"></div>
    </div>
  </div>
  </div>
</div>`,
  logic: Component
});
})();
