/* component: StageViscKin — Kinematic Viscosity (U-tube reverse-flow viscometer in a
   silicone-oil bath).  Mounted ONLY by the Kinematic Viscosity workspace in
   screens/showViscTest.js.  Own state, own steps, own reset — nothing shared.

   Procedure (5 stages) — the U-tube sits in the 114 °C silicone-oil bath from the start:
     1 Inject sample at Point 1 until the front reaches Point 2, then the stopper
       goes into Point 5 automatically (same stage)
     2 Condition for 1 hour (accelerated clock 00:00 -> 60:00 min, ~7 s)
     3 Remove stopper (Point 5 opens -> the sample starts to move)
     4 Flow timing: timer STARTS at Point 3, STOPS at Point 4
       (magnified timing zone + stopwatch shown only in this stage)
     5 ν = C × t   (C = 0.002636 mm²/s² fixed calibration constant, t measured)

   Fluid model: the liquid is one continuous column between the reservoir
   level (left) and the measuring-arm meniscus (right).  After the stopper is
   removed the flow is driven by the level difference and limited by the
   capillary leg:  Q = K·(yR − yL),  dyL/dt = Q/A_L(yL),  dyR/dt = −Q/A_R(yR)
   with A ∝ r² of the local glass bore.  Volume is conserved, so the meniscus
   slows in the timing bulb and speeds up in the narrow necks.  The whole
   trajectory is integrated once at load; the animation plays it back, so the
   timer start/stop are the exact Point 3 / Point 4 crossings.

   ILLUSTRATIVE VALUES (not measured data):
     K, the bulb geometry and TIME_ACCEL set the displayed flow time.
     The stopwatch shows accelerated lab time (TIME_ACCEL × animation time).
   ========================================================================= */
(function () {
'use strict';

/* ---------------- configuration ---------------- */
const BATH_T = 114;                 // °C — reservoir temperature (given)
const COND_MIN = 60;                // conditioning period, lab minutes (given)
const COND_ANIM = 4200;             // process ms for the 60 min (×1.7 speed multiplier ≈ 7 s on screen)
const TIME_ACCEL = 24;              // stopwatch: lab seconds per animation second (illustrative)
const VISC_C = 0.002636;            // mm²/s² — calibrated viscometer constant (fixed)
const K_FLOW = 1.4;                 // capillary conductance of the model (illustrative)

/* ---------------- U-tube geometry (tube-local units, from the reference photo) ---------------- */
const XL = 40, XR = 104, RB = 32;   // left arm, right arm centre lines; bend radius
const Y = { TOPL: -2, TOPR: -4, P1: 118, P2: 408, P3: 368, P4: 314, LEG: 452 };
const BEND_LEN = Math.PI * RB;
const sm = u => 0.5 - 0.5 * Math.cos(Math.PI * u);
/* inner bore radius */
function rL(y) {                     // filling reservoir -> taper -> capillary leg
  if (y < 180) return 16;
  if (y < 196) return 2.6 + 13.4 * (1 - sm((y - 180) / 16));
  return 2.6;
}
function rR(y) {                     // measuring arm: upper tube, P4 neck, timing bulb, P3/P2 neck, lower bulb
  if (y < 306) return 3.6;
  if (y < 312) return 3.6 - (y - 306) / 6;
  if (y < 322) return 2.6;
  if (y < 362) return 2.6 + 9.4 * Math.pow(Math.sin(Math.PI * (y - 322) / 40), .75);
  if (y < 414) return 2.6;
  if (y < 440) return 2.6 + 5.4 * Math.pow(Math.sin(Math.PI * (y - 414) / 26), .75);
  return 2.6;
}
const thL = y => (y < 186 ? 3 : 2.6), thR = () => 2.6;
const f1 = v => v.toFixed(1);
function tubePath(extra) {           // extra = 0 -> bore, 1 -> outer glass
  const p = [];
  for (let y = Y.TOPL; y <= Y.LEG; y += 2) p.push((XL - rL(y) - extra * thL(y)).toFixed(2) + ',' + y);
  const ro = RB + 2.6 + extra * 2.6, ri = RB - 2.6 - extra * 2.6;
  let d = 'M' + p.join(' L');
  d += ' A' + ro + ',' + ro + ' 0 0 0 ' + f1(XR + 2.6 + extra * 2.6) + ',' + Y.LEG;
  const q = [];
  for (let y = Y.LEG; y >= Y.TOPR; y -= 2) q.push((XR + rR(y) + extra * thR(y)).toFixed(2) + ',' + y);
  for (let y = Y.TOPR; y <= Y.LEG; y += 2) q.push((XR - rR(y) - extra * thR(y)).toFixed(2) + ',' + y);
  d += ' L' + q.join(' L');
  d += ' A' + ri + ',' + ri + ' 0 0 1 ' + f1(XL + 2.6 + extra * 2.6) + ',' + Y.LEG;
  const r = [];
  for (let y = Y.LEG; y >= Y.TOPL; y -= 2) r.push((XL + rL(y) + extra * thL(y)).toFixed(2) + ',' + y);
  return d + ' L' + r.join(' L') + ' Z';
}
const BORE_D = tubePath(0), GLASS_D = tubePath(1);
/* path coordinate s along the centre line (left top -> bend -> right top) */
const sLeft = y => y - Y.TOPL;
const sRight = y => (Y.LEG - Y.TOPL) + BEND_LEN + (Y.LEG - y);
const S_BEND0 = Y.LEG - Y.TOPL, S_BEND1 = S_BEND0 + BEND_LEN;

/* ---------------- flow trajectory (after stopper removal) ---------------- */
const TRAJ = (function () {
  let yL = Y.P1, yR = Y.P2, t = 0; const dt = 1 / 400, T = [0], L = [yL], R = [yR];
  let t3 = null, t4 = null, n = 0;
  while (t < 200) {
    const q = K_FLOW * (yR - yL);
    const nL = yL + q / (rL(yL) * rL(yL)) * dt, nR = yR - q / (rR(yR) * rR(yR)) * dt;
    if (t3 === null && nR <= Y.P3) t3 = t + dt * (yR - Y.P3) / (yR - nR);
    if (t4 === null && nR <= Y.P4) t4 = t + dt * (yR - Y.P4) / (yR - nR);
    yL = nL; yR = nR; t += dt; n++;
    if (n % 8 === 0) { T.push(t); L.push(yL); R.push(yR); }
    if (yR - yL < 2.5) break;
  }
  T.push(t); L.push(yL); R.push(yR);
  return { T, L, R, t3, t4, end: t, step: dt * 8 };
})();
function trajAt(t) {
  const i = Math.max(0, Math.min(TRAJ.T.length - 2, Math.floor(t / TRAJ.step)));
  const u = Math.max(0, Math.min(1, (t - TRAJ.T[i]) / (TRAJ.T[i + 1] - TRAJ.T[i])));
  return { yL: TRAJ.L[i] + (TRAJ.L[i + 1] - TRAJ.L[i]) * u, yR: TRAJ.R[i] + (TRAJ.R[i + 1] - TRAJ.R[i]) * u };
}
const FLOW_TIME = (TRAJ.t4 - TRAJ.t3) * TIME_ACCEL;     // lab seconds shown by the stopwatch

/* ---------------- flow playback clock (display only) ----------------
   The trajectory, t3/t4 and FLOW_TIME above are NOT changed.  Only the playback speed is:
   the on-screen meniscus speed is capped at VIEW_VMAX tube units per process second, so the
   fast narrow-neck sections (Point 2 -> Point 3 approach, the Point 3 and Point 4 crossings)
   play slower and can be followed; the timing bulb plays at its normal rate.
   Point 2 -> Point 3 ≈ 5 process s (≈ 8.5 s on screen at ×1.7).  The stopwatch reads
   (trajectory time − t3) × TIME_ACCEL, so it stays locked to the meniscus position. */
const VIEW_VMAX = 8;
const PLAY = (function () {
  const T = TRAJ.T, L = TRAJ.L, R = TRAJ.R, P = [0];
  for (let i = 0; i < T.length - 1; i++) {
    const d = T[i + 1] - T[i];
    if (d <= 0) { P.push(P[i]); continue; }
    const v = Math.max(Math.abs(R[i + 1] - R[i]), Math.abs(L[i + 1] - L[i])) / d;
    P.push(P[i] + d * Math.max(1, v / VIEW_VMAX));
  }
  return P;
})();
const PLAY_END = PLAY[PLAY.length - 1];
function seg(A, x) {                 // last index i with A[i] <= x (A non-decreasing)
  let lo = 0, hi = A.length - 2;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (A[m] <= x) lo = m; else hi = m - 1; }
  return lo;
}
function playAt(t) {                 // trajectory time -> playback (process) time
  const T = TRAJ.T, i = seg(T, t), d = T[i + 1] - T[i];
  const u = d > 0 ? Math.max(0, Math.min(1, (t - T[i]) / d)) : 0;
  return PLAY[i] + (PLAY[i + 1] - PLAY[i]) * u;
}
function trajAtPlay(p) {             // playback (process) time -> trajectory time
  const T = TRAJ.T, i = seg(PLAY, p), d = PLAY[i + 1] - PLAY[i];
  const u = d > 0 ? Math.max(0, Math.min(1, (p - PLAY[i]) / d)) : 0;
  return T[i] + (T[i + 1] - T[i]) * u;
}
let SAVED = null;                                          // test position kept while the page is closed

/* ---------------- scene positions (svg units) ---------------- */
const POS_BATH = { x: 438, y: 100 };              // U-tube installed in the bath from the start
const STOP_WAIT = { x: 0, y: -40 }, STOP_SEAT = { x: 0, y: 0 }, STOP_AWAY = { x: 0, y: -78 };
const INSET = { x: 770, y: 96, w: 210, h: 420, s: 3.5, y0: 300, x0: 74 };
const insY = y => INSET.y + (y - INSET.y0) * INSET.s;

const STAGES = [
  { name: 'Inject Sample & Install Stopper', btn: 'Inject Sample' },
  { name: 'Condition 1 h', btn: 'Start Conditioning' },
  { name: 'Remove Stopper', btn: 'Remove Stopper' },
  { name: 'Flow Timing 3→4', btn: 'Start Flow' },
  { name: 'Calculate ν', btn: 'Calculate ν' }
];

function mmss(min) {
  const s = Math.round(min * 60), m = Math.floor(s / 60), r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}
function mix(a, b, u) {
  const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const A = h(a), B = h(b);
  return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * u)).join(',') + ')';
}
function parseC(s) { const v = Number(String(s || '').replace(',', '.')); return isFinite(v) && v > 0 ? v : null; }
function sig(v) { return v >= 100 ? v.toFixed(2) : v >= 10 ? v.toFixed(3) : v.toFixed(4); }

/* state at the START of stage i (used by Reset, Previous/Next and the stage chips) */
function snapshot(i) {
  /* 0 inject+stopper · 1 condition · 2 remove stopper · 3 flow timing · 4 calculate */
  const filled = i >= 1;
  const s = {
    cur: i, done: STAGES.map((_, k) => k < i), busy: false, auto: false, paused: false,
    tx: POS_BATH.x, ty: POS_BATH.y, inBath: true,
    sA: filled ? sLeft(Y.P1) : 0, sB: filled ? sRight(Y.P2) : 0,
    syr: 0, syrPush: 0, stream: false,
    stp: i === 0 ? STOP_WAIT : (i <= 2 ? STOP_SEAT : STOP_AWAY), stpO: i >= 1 && i <= 2 ? 1 : 0, closed: i >= 1 && i <= 2,
    setOn: true, condMin: i >= 2 ? COND_MIN : 0, condOn: false, stable: i >= 2,
    flowT: 0, fphase: i >= 3 ? 'ready' : 'idle', tMeas: null, calcStep: 0, complete: false,
    flash: '', moving: false
  };
  if (i >= 4) {
    const p = trajAt(TRAJ.t4);
    s.flowT = TRAJ.t4; s.sA = sLeft(p.yL); s.sB = sRight(p.yR); s.fphase = 'stopped'; s.tMeas = FLOW_TIME;
  }
  s.msg = [
    'Clean, dry, EMPTY U-tube installed in the 114 °C silicone-oil bath. Inject the sample at Point 1.',
    'Sample at Point 2 and Point 5 CLOSED by the stopper. Start the 1-hour conditioning at 114 °C.',
    'Temperature stabilized at 114 °C. Remove the stopper from Point 5.',
    'Stopper removed — Point 5 is OPEN. Timer READY: it starts only when the meniscus reaches Point 3.',
    'Flow time recorded between Point 3 and Point 4. Calculate ν = C × t with C = 0.002636 mm²/s².'
  ][i];
  return s;
}

class Component extends DCLogic {
  state = Object.assign(snapshot(0), { C: String(VISC_C) });

  /* ---------- paused-aware process clock (same pattern as StageGC) ---------- */
  clock = 0; jobs = []; waits = []; raf = null;
  schedule() { this.raf = true; this.rafId = requestAnimationFrame(this.tick); this.toId = setTimeout(this.tick, 40); }
  clearHandles() { if (this.rafId) cancelAnimationFrame(this.rafId); if (this.toId) clearTimeout(this.toId); this.rafId = null; this.toId = null; this.raf = null; }
  ensureLoop() { if (this.raf) return; this.last = performance.now(); this.schedule(); }
  tick = () => {
    this.clearHandles();
    const now = performance.now();
    const dt = Math.min(50, now - this.last); this.last = now;
    if (!this.state.paused) {
      this.advanceClock(dt);
    }
    if (this.jobs.length || this.waits.length) this.schedule();
  };
  /* one step of the process clock (split out of tick so the procedure panel can run a step
     to completion instantly: ffAll) */
  advanceClock(dt) {
    this.clock += dt / PSM();
    const keep = [];
    this.jobs.forEach(j => {
      const p = Math.min(1, (this.clock - j.t0) / j.dur);
      j.apply(j.lin ? p : (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2));
      if (p < 1) keep.push(j); else if (j.done) this.waits.push({ due: this.clock, fn: j.done });
    });
    this.jobs = keep;
    if (this.waits.length) {
      const due = this.waits.filter(w => w.due <= this.clock);
      this.waits = this.waits.filter(w => w.due > this.clock);
      due.forEach(w => w.fn());
    }
  }
  ffAll() {
    let g = 0;
    while ((this.jobs.length || this.waits.length) && g++ < 200000) this.advanceClock(50 * PSM());
    this.clearHandles();
  }

  tw(dur, apply, done, lin) { this.jobs.push({ t0: this.clock, dur, apply, done, lin: !!lin }); this.ensureLoop(); }
  wait(ms, fn) { this.waits.push({ due: this.clock + ms, fn }); this.ensureLoop(); }
  stopAll() { this.jobs = []; this.waits = []; this.clearHandles(); }
  /* leaving the page keeps the test where it was (a running stage restarts from its beginning) */
  componentDidMount() {
    const sv = SAVED; if (!sv) return;
    this.setState(Object.assign(snapshot(sv.cur), { C: String(VISC_C) }));
    if (sv.complete) this.setState({ done: STAGES.map(() => true), complete: true, calcStep: 3, msg: 'Kinematic viscosity calculated: ν = C × t.' });
    if (sv.cur >= 4) this.bgFlow(TRAJ.t4);
  }
  componentWillUnmount() {
    this.stopAll();
    SAVED = { cur: this.state.cur, C: this.state.C, complete: this.state.complete };
  }

  status(s) { if (this.props.onStatus) this.props.onStatus(s); }

  /* ---------- navigation ---------- */
  goStage(i) {
    i = Math.max(0, Math.min(STAGES.length - 1, i));
    this.stopAll();
    this.setState(snapshot(i));
    if (i >= 4) this.bgFlow(TRAJ.t4);           // liquid keeps levelling out behind the result
    this.status(i === 0 ? 'Not Started' : 'In Progress');
  }
  finish(i, msg, extra) {
    const done = this.state.done.slice(); done[i] = true;
    const last = i === STAGES.length - 1;
    this.setState(Object.assign({ done, busy: false, moving: false, cur: last ? i : i + 1, msg }, extra || {}));
    if (last) return;
    if (i === 2) { this.wait(250, () => this.run(3, true)); return; }      // Point 5 open -> the sample moves by itself
    if (this.state.auto) this.wait(i === 1 ? 2600 : 1800, () => this.run(i + 1));   // pause to see each completed result
  }

  run(i, chained) {
    const st = this.state;
    if (st.busy || st.paused || st.complete) return;
    if (i !== st.cur || st.done[i]) return;
    this.status('In Progress');
    this.setState({ busy: true, flash: '' });
    [this.sInjectStop, this.sCondition, this.sUnstop, this.sFlow, this.sCalc][i].call(this, chained);
  }

  /* 1 — injection at Point 1 (U-tube already in the bath); front follows the glass path to Point 2,
         then the stopper goes into Point 5 automatically — one stage */
  sInjectStop() {
    const s0 = sLeft(196), s1 = sLeft(Y.P1), sEnd = sRight(Y.P2);
    this.setState({ msg: 'Syringe positioned at the top opening of the filling arm (Point 1).', flash: 'p1' });
    this.tw(900, e => this.setState({ syr: e }), () => {
      this.setState({ stream: true, sA: s0, sB: s0, msg: 'Injecting sample through Point 1 — the liquid front moves down the filling arm…' });
      this.tw(11000, e => {
        const sB = s0 + (sEnd - s0) * e;
        this.setState({
          syrPush: e,
          sA: s0 - (s0 - s1) * Math.sqrt(e),            // reservoir level rises towards the Point 1 mark
          sB,
          msg: sB < S_BEND0 ? 'Injecting through Point 1 — the liquid front moves down the filling arm…'
             : sB < S_BEND1 ? 'The liquid front passes round the bottom of the U-tube…'
             : 'The liquid front rises in the measuring arm towards the Point 2 fill mark…',
          flash: sB > sRight(Y.P2 + 30) ? 'p2' : 'p1'
        });
      }, () => {
        /* Point 2 reached: injection stops, no overfill */
        this.setState({ stream: false, sA: s1, sB: sEnd, flash: 'p2', msg: 'Sample at Point 2 — injection stopped.' });
        this.wait(900, () => {                         // short hold: completed fill visible before the stopper
          this.setState({ msg: 'Sample at Point 2 — injection stopped. Installing the stopper at Point 5…' });
          this.tw(700, e => this.setState({ syr: 1 - e }));
          this.setState({ stp: STOP_WAIT });
          this.tw(400, e => this.setState({ stpO: e }), () => {
            this.setState({ flash: 'p5' });
            this.tw(1400, e => this.setState({ stp: { x: 0, y: STOP_WAIT.y * (1 - e) } }), () => {
              this.finish(0, 'Sample at Point 2 · Point 5 → CLOSED. The trapped air holds the sample in its loaded position.', { closed: true, stp: STOP_SEAT, stpO: 1, flash: 'p5' });
            });
          });
        });
      }, true);
    });
  }
  /* 2 — one hour at 114 °C, accelerated */
  sCondition() {
    this.setState({ condOn: true, msg: 'Conditioning at 114 °C — heater holding the bath at set point; the sample is approaching bath temperature.' });
    this.tw(COND_ANIM, e => this.setState({ condMin: COND_MIN * e }), () => {
      this.finish(1, 'Temperature stabilized at 114 °C. Conditioning complete (60:00 min).', { condOn: false, stable: true, condMin: COND_MIN });
    }, true);
  }
  /* 3 — stopper out: Point 5 opens */
  sUnstop() {
    this.setState({ msg: 'Removing the stopper from Point 5…', flash: 'p5' });
    this.tw(1000, e => this.setState({ stp: { x: 0, y: -30 * e } }), () => {
      this.setState({ closed: false, fphase: 'ready', msg: 'Point 5 OPEN — the air above the sample is released. Timer READY.' });
      this.tw(1100, e => this.setState({ stp: { x: 0, y: -30 + (STOP_AWAY.y + 30) * e }, stpO: 1 - e }), () => {
        this.finish(2, 'Point 5 OPEN. The sample starts to move up the measuring arm.', { stpO: 0, stp: STOP_AWAY });
      });
    });
  }
  /* 4 — flow: approach P3 (timer READY) -> START at P3 -> run -> STOP at P4 */
  sFlow() {
    this.setState({ fphase: 'approach', msg: 'Liquid rising towards Point 3 — timer READY (not started).' });
    this.flowFrom(0);
  }
  flowFrom(t0) {
    const p0 = playAt(t0);                          // slowed playback, same trajectory
    this.tw((PLAY_END - p0) * 1000, e => this.setFlow(trajAtPlay(p0 + (PLAY_END - p0) * e)), null, true);
  }
  bgFlow(t0) { this.flowFrom(t0); }
  setFlow(t) {
    const p = trajAt(t), st = this.state, patch = { flowT: t, sA: sLeft(p.yL), sB: sRight(p.yR) };
    if (st.fphase === 'approach' && t >= TRAJ.t3) {
      patch.fphase = 'timing'; patch.flash = 'p3';
      patch.msg = 'Meniscus at Point 3 — TIMING STARTED. Timing the travel from Point 3 to Point 4.';
    }
    if (st.fphase === 'timing' && t >= TRAJ.t4) {
      patch.fphase = 'stopped'; patch.flash = 'p4'; patch.tMeas = FLOW_TIME;
      patch.msg = 'Meniscus at Point 4 — TIMER STOPPED. Measured flow time = ' + FLOW_TIME.toFixed(2) + ' s.';
      this.setState(patch);
      this.wait(1600, () => this.finish(3, 'Flow time recorded: t = ' + FLOW_TIME.toFixed(2) + ' s (Point 3 → Point 4).'));
      return;
    }
    this.setState(patch);
  }
  /* 5 — ν = C × t */
  sCalc() {
    if (parseC(this.state.C) == null) {
      this.setState({ busy: false, auto: false, msg: 'Enter the viscometer constant C (mm²/s²) to calculate ν.' });
      return;
    }
    this.setState({ calcStep: 1, msg: 'Viscometer constant C entered.' });
    this.wait(700, () => { this.setState({ calcStep: 2, msg: 'Measured flow time t inserted automatically.' });
      this.wait(700, () => { this.setState({ calcStep: 3 });
        this.finish(4, 'Kinematic viscosity calculated: ν = C × t.', { complete: true, auto: false });
        this.status('Completed');
      });
    });
  }

  runAll() {
    const st = this.state;
    if (st.busy || st.complete) return;
    this.setState({ auto: true });
    this.run(st.cur);
  }
  /* ---- shared procedure panel (ProcCtl.js): stages use the existing snapshot navigation (goStage) ---- */
  pcRunning() { const st = this.state; return !!st.busy || this.waits.length > 0 || (!!st.auto && !st.complete); }
  pcInfo() {
    const st = this.state, N = STAGES.length, k = Math.max(0, Math.min(N - 1, st.cur));
    return { N, k, unit: 'Stage', title: STAGES[k].name, q: st.msg || '',
      status: st.paused ? 'paused' : this.pcRunning() ? 'running' : st.complete ? 'complete' : 'ready',
      allDone: !!st.complete, frac: null, doneMask: (st.done || []).slice(),
      canPrev: k > 0, canNext: k < N - 1, canRestart: !!(st.busy || st.paused || st.complete || this.jobs.length || (st.done || [])[k]),
      runLabel: STAGES[k].btn, runAll: 'Run Full Procedure', runAllDisabled: !!(st.busy || st.complete || st.auto),
      again: 'Run Test Again', reset: 'Reset Kinematic Viscosity', resetDisabled: false };
  }
  pcAct(a) {
    const st = this.state, N = STAGES.length, k = Math.max(0, Math.min(N - 1, st.cur));
    if (a === 'run') this.run(k);
    else if (a === 'pause') { if (!st.paused && (this.pcRunning() || this.jobs.length)) this.setState({ paused: true }); }
    else if (a === 'resume') { if (st.paused) { this.setState({ paused: false }); this.last = performance.now(); this.ensureLoop(); } }
    else if (a === 'restart') this.goStage(k);
    else if (a === 'prev') this.goStage(k - 1);
    else if (a === 'next') this.goStage(k + 1);
    else if (a === 'runAll') this.runAll();
    else if (a === 'again') { this.reset(); this.run(0); }
    else if (a === 'reset') this.reset();
  }
  togglePause() {
    const st = this.state;
    const live = st.busy || this.jobs.length;
    if (!live && !st.paused) return;
    this.setState({ paused: !st.paused });
    if (!this.state.paused) { this.last = performance.now(); this.ensureLoop(); }
  }
  reset() { this.goStage(0); }

  /* ---------- live text for the Explain panel (read by StepGuide) ---------- */
  guide(V, num) {
    const st = this.state, i = st.cur, busy = st.busy;
    const C = parseC(st.C), nu = C != null && st.tMeas != null ? C * st.tMeas : null;
    let t, d, w, e, o;
    if (i === 0) {
      const stopping = busy && st.sB >= sRight(Y.P2) - 0.5;
      t = 'Step 1 · Inject sample & install stopper';
      d = !busy ? 'The clean, dry, empty U-tube is already installed in the 114 °C silicone-oil bath.'
        : stopping ? 'The liquid front has reached the Point 2 fill mark. Injection stops and the stopper is placed in Point 5 straight away.'
        : 'The sample is introduced through the filling arm (Point 1) until the required initial level is reached. The front follows the glass path: filling arm → U-bend → measuring arm.';
      w = 'A fixed, repeatable charge gives the same liquid head in every test, so filling stops exactly at Point 2 (no overfill). Closing Point 5 immediately traps the air above the sample so it stays at its loaded position during heating.';
      e = 'Syringe at Point 1; the liquid column advancing continuously through the tube; then the stopper pressed into Point 5.';
      o = 'The front stopping exactly at Point 2, the reservoir level at the Point 1 mark, and Point 5 changing to CLOSED.';
    } else if (i === 1) {
      t = 'Step 2 · Temperature conditioning (1 hour)';
      d = 'The viscometer is immersed in a silicone oil bath at 114 °C and conditioned for one hour so the sample reaches the required measurement temperature.' +
          (st.stable ? ' Temperature stabilized at 114 °C.' : '');
      w = 'Viscosity depends strongly on temperature. Timing a sample that is still heating would give a wrong (too long) flow time. The clock is accelerated: 00:00 → 60:00 min represents one real hour.';
      e = 'No movement — U-tube stationary, stopper still installed, heater holding the bath at its set point.'; o = 'The conditioning clock reaching 60:00 min and the sample reaching thermal equilibrium.';
    } else if (i === 2) {
      t = 'Step 3 · Remove stopper';
      d = 'The stopper is lifted from Point 5, opening the measuring arm to atmosphere.';
      w = 'Opening Point 5 releases the trapped air. The liquid head in the filling reservoir is now higher than the level in the measuring arm, so the sample starts to flow through the capillary under gravity.';
      e = 'Stopper lifting away.'; o = 'Point 5 changing to OPEN and the liquid starting to move.';
    } else if (i === 3) {
      const ph = st.fphase;
      t = 'Step 4 · Flow timing, Point 3 → Point 4';
      d = ph === 'timing' ? 'The time required for the meniscus to travel between the two calibrated timing marks is being measured.'
        : ph === 'stopped' ? 'The meniscus has reached the second timing mark. The stopwatch stops and the measured flow time is used to calculate kinematic viscosity.'
        : ph === 'approach' ? 'The liquid is rising towards Point 3. The timer is READY but not running.'
        : 'Point 5 is open. Start the flow and watch the meniscus approach Point 3.';
      if (ph === 'timing' && st.flowT - TRAJ.t3 < 1.2) d = 'The liquid meniscus has reached the first timing mark. The stopwatch starts here.';
      w = 'Points 3 and 4 enclose a calibrated volume (the timing bulb). The time this volume takes to drain through the capillary is proportional to kinematic viscosity. Timing before Point 3 or after Point 4 would not correspond to the calibrated volume.';
      e = 'Meniscus moving continuously: fast in the narrow neck, slower through the timing bulb.';
      o = 'Timer starting exactly as the meniscus crosses Point 3 and freezing as it crosses Point 4. Stopwatch shows accelerated lab time.';
    } else {
      t = 'Step 5 · Kinematic viscosity';
      d = 'Kinematic viscosity is calculated by multiplying the measured flow time by the calibration constant of the viscometer: ν = C × t.';
      w = 'C = 0.002636 mm²/s² is the calibrated constant of this viscometer. It converts flow time into kinematic viscosity in mm²/s (cSt).';
      e = 'None — the liquid levels out in the tube after the measurement.'; o = 'ν = ' + VISC_C + ' × ' + (st.tMeas == null ? 't' : st.tMeas.toFixed(2)) + ' = ' + (nu == null || st.calcStep < 3 ? '—' : sig(nu)) + ' cSt.';
    }
    return {
      title: 'Kinematic Viscosity — ' + t,
      tag: st.paused ? 'PAUSED' : (busy ? 'RUNNING · ' : '') + 'STEP ' + (i + 1) + ' / ' + STAGES.length,
      busy: busy && !st.paused, d, w, e, o,
      vals: [
        V('Bath', BATH_T.toFixed(1), '°C'),
        V('Conditioning', mmss(st.condMin), 'min'),
        V('Flow time', st.tMeas == null ? (st.fphase === 'timing' ? ((st.flowT - TRAJ.t3) * TIME_ACCEL).toFixed(2) : '—') : st.tMeas.toFixed(2), st.tMeas == null && st.fphase !== 'timing' ? '' : 's'),
        V('C', C == null ? '—' : String(C), C == null ? '' : 'mm²/s²'),
        V('Viscosity', nu == null || st.calcStep < 3 ? '—' : sig(nu), nu == null || st.calcStep < 3 ? '' : 'cSt')
      ]
    };
  }

  renderVals() {
    const st = this.state, i = st.cur, busy = st.busy;
    const inBath = st.inBath || st.tx > 200;
    const C = parseC(st.C);
    const nu = C != null && st.tMeas != null ? C * st.tMeas : null;
    const liquid = st.sB - st.sA > 0.5;
    const eq = st.stable ? 1 : Math.min(1, 1 - Math.exp(-4.2 * st.condMin / COND_MIN)) / (1 - Math.exp(-4.2));
    const oil = inBath && (st.condMin > 0 || st.stable) ? mix('#9a5c14', '#d8952e', eq) : '#a86a1c';

    /* right meniscus — only while the right end of the column is in a straight part of the measuring arm */
    let mR = null, yR = null;
    if (liquid && st.sB > S_BEND1 + 2) { yR = Y.LEG - (st.sB - S_BEND1); const r = rR(yR); mR = 'M' + f1(XR - r) + ',' + f1(yR - Math.min(2.2, r * .5)) + ' Q' + XR + ',' + f1(yR + Math.min(2.4, r * .45)) + ' ' + f1(XR + r) + ',' + f1(yR - Math.min(2.2, r * .5)); }
    let mL = null;
    if (liquid && st.sA < S_BEND0 - 2) { const yL = st.sA + Y.TOPL, r = rL(yL); mL = 'M' + f1(XL - r) + ',' + f1(yL - 2) + ' Q' + XL + ',' + f1(yL + 2.6) + ' ' + f1(XL + r) + ',' + f1(yL - 2); }

    /* timer */
    const ph = st.fphase;
    const running = ph === 'timing';
    const tNow = running ? (st.flowT - TRAJ.t3) * TIME_ACCEL : (ph === 'stopped' ? st.tMeas : 0);
    const timerTxt = ph === 'stopped' || running ? tNow.toFixed(2) : (ph === 'idle' ? '0.00' : 'READY');
    const timerTag = running ? 'TIMING' : ph === 'stopped' ? 'STOPPED' : ph === 'idle' ? 'IDLE' : 'READY';
    const timerCol = running ? 'var(--grn)' : ph === 'stopped' ? 'var(--amb)' : ph === 'idle' ? 'var(--mut)' : 'var(--blue)';

    /* point labels + highlights */
    const fl = st.flash;
    const hot = {
      p1: fl === 'p1' && busy,
      p2: fl === 'p2',
      p3: running || fl === 'p3',
      p4: ph === 'stopped' || (running && yR != null && yR < Y.P4 + 20),
      p5: fl === 'p5' && busy
    };
    const PT = (id, n, x, y, lx, ly, col) => {
      const on = hot[id];
      return { n: String(n), cx: x, cy: y, lx, ly, lx2: x, ly2: y,
        ring: on ? col : '#e0564f', fill: on ? col : 'var(--panel)', txt: on ? '#07121e' : '#e0564f',
        glow: 'opacity:' + (on ? .55 : 0) + '; transition:opacity .35s ease;', glowCol: col };
    };
    const pts = [
      PT('p1', 1, -18, Y.P1, XL - 21, Y.P1, '#4d9dff'),
      PT('p2', 2, 150, Y.P2, XR + 9, Y.P2, '#4d9dff'),
      PT('p3', 3, 150, Y.P3, XR + 9, Y.P3, '#46d39a'),
      PT('p4', 4, 150, Y.P4, XR + 9, Y.P4, '#f0913f'),
      PT('p5', 5, 72, -34, XR - 8, -10, '#4d9dff')
    ];

    /* stage chips */
    const chips = STAGES.map((s, k) => {
      const dn = st.done[k], on = k === i && !st.complete || (st.complete && k === STAGES.length - 1);
      const tg = dn ? 'Complete' : on ? (busy ? 'Running' : 'Active') : 'Ready';
      return { n: String(k + 1), name: s.name, tag: tg,
        tagColor: dn ? 'var(--grn)' : on ? 'var(--blue)' : 'var(--mut)',
        onClick: () => this.goStage(k),
        style: 'flex:1 1 0; min-width:0; display:flex; flex-direction:column; align-items:flex-start; text-align:left; font-family:inherit; padding:5px 9px; border-radius:9px; cursor:pointer; background:' +
          (on ? 'rgba(47,111,208,.12)' : dn ? 'rgba(29,138,90,.08)' : 'var(--panel)') + '; border:' + (on ? '2px solid var(--blue)' : '1px solid ' + (dn ? 'rgba(29,138,90,.35)' : 'var(--line)')) +
          '; box-shadow:' + (on ? '0 0 0 2px rgba(47,111,208,.15)' : 'none') + ';' };
    });

    const canRun = !busy && !st.paused && !st.complete && !st.done[i];
    const canAuto = !busy && !st.paused && !st.complete;
    const canPause = busy || st.paused || this.jobs.length > 0;
    const syrY = -70 + 60 * st.syr;
    const heatOn = inBath && !st.moving;
    const heatAmt = st.condOn ? 0.85 : (st.stable ? 0.35 : (heatOn ? 0.25 : 0));
    const btnMain = on => 'font-family:inherit; font-size:11px; font-weight:600; white-space:nowrap; padding:8px 16px; border-radius:8px; cursor:' + (on ? 'pointer' : 'default') +
      '; background:' + (on ? 'linear-gradient(180deg,#46d39a,#2f9d72)' : 'var(--icard)') + '; border:1px solid ' + (on ? '#2f9d72' : 'var(--line2)') + '; color:' + (on ? '#06231a' : 'var(--mut)') + ';';
    const btnSub = (on, act) => 'font-family:inherit; font-size:10.5px; font-weight:600; white-space:nowrap; padding:8px 13px; border-radius:8px; cursor:' + (on ? 'pointer' : 'default') +
      '; background:' + (act ? 'rgba(47,111,208,.10)' : 'var(--icard)') + '; border:1px solid ' + (act ? 'var(--blue)' : 'var(--line2)') + '; color:' + (act ? 'var(--blue)' : on ? 'var(--txt2)' : 'var(--mut)') + '; opacity:' + (on || act ? 1 : .55) + ';';

    const condFrac = st.condMin / COND_MIN;
    const insetOn = i === 3 && !st.complete;
    const calcOn = st.calcStep > 0 || st.complete;
    const insetYR = yR != null && yR > INSET.y0 - 4 && yR < INSET.y0 + INSET.h / INSET.s + 4 ? insY(yR) : null;

    return {
      kvStages: chips,
      kvMsg: st.msg,
      kvMsgCol: st.paused ? 'var(--amb)' : busy ? 'var(--blue)' : st.complete ? 'var(--grn)' : 'var(--txt2)',
      kvMsgDot: 'width:7px; height:7px; flex:0 0 auto; border-radius:50%; background:' + (st.paused ? 'var(--amb)' : busy ? 'var(--blue)' : st.complete ? 'var(--grn)' : 'var(--mut2)') + ';' + (busy && !st.paused ? ' animation:kvBlink 1.1s ease-in-out infinite;' : ''),
      kvStepTag: st.paused ? 'PAUSED' : 'STEP ' + (i + 1) + ' / ' + STAGES.length,

      /* schematic */
      kvBore: BORE_D, kvGlass: GLASS_D,
      kvTubeT: 'translate(' + f1(st.tx) + ',' + f1(st.ty) + ')',
      kvDash: liquid ? '0 ' + st.sA.toFixed(2) + ' ' + (st.sB - st.sA).toFixed(2) + ' 99999' : '0 99999',
      kvOil: oil, kvLiqOn: liquid,
      kvMR: mR || 'M0,0', kvMROn: !!mR, kvML: mL || 'M0,0', kvMLOn: !!mL,
      kvPts: pts,
      kvSyrStyle: 'opacity:' + (st.syr > 0.02 ? 1 : 0) + '; transition:opacity .2s ease;',
      kvSyrT: 'translate(' + XL + ',' + f1(syrY) + ')',
      kvPlungerY: f1(-58 + 34 * st.syrPush), kvSyrLiqY: f1(-40 + 34 * st.syrPush), kvSyrLiqH: f1(Math.max(0, 34 - 34 * st.syrPush)),
      kvStreamOn: st.stream, kvStreamY2: f1(Math.max(4, st.sA + Y.TOPL - 1)),
      kvStopT: 'translate(' + f1(XR + st.stp.x) + ',' + f1(Y.TOPR + st.stp.y) + ')',
      kvStopStyle: 'opacity:' + st.stpO + ';',
      kvP5Txt: st.closed ? 'CLOSED' : 'OPEN',
      kvP5Col: st.closed ? '#f0913f' : '#46d39a',
      kvP5On: st.cur >= 1 || st.stpO > 0,
      kvPtsStyle: 'opacity:' + (st.moving ? 0 : 1) + '; transition:opacity .3s ease;',
      kvHolderOn: st.inBath,
      kvHeatStyle: 'opacity:' + heatAmt + '; transition:opacity 1.2s ease;' + (st.paused ? ' animation-play-state:paused;' : ''),
      kvHeatAnim: st.paused ? 'animation-play-state:paused;' : '',
      kvGlowStyle: 'opacity:' + (st.condOn ? .12 + .25 * eq : (st.stable && inBath ? .18 : 0)) + '; transition:opacity 1s ease;',
      kvBathPV: BATH_T.toFixed(1),
      kvBathSP: st.setOn ? 'SP ' + BATH_T.toFixed(1) : 'SP ---.-',
      kvBathLbl: st.condOn ? 'HEAT·HOLD' : st.stable ? 'STABLE' : 'AT SP', kvBathStCol: st.condOn ? '#f0c574' : '#46d39a',
      kvHeaterStyle: st.condOn ? 'opacity:.9;' + (st.paused ? '' : ' animation:kvBlink calc(1.4s * var(--pm,1)) ease-in-out infinite;') : 'opacity:0; transition:opacity .6s ease;',
      kvInsetOn: insetOn, kvVB: insetOn ? '270 0 730 668' : '145 0 730 668',
      kvSwOn: i >= 3, kvSwOff: i < 3,

      /* magnified timing zone */
      kvInsetT: 'translate(' + f1(INSET.x - INSET.x0 * INSET.s) + ',' + f1(INSET.y - INSET.y0 * INSET.s) + ') scale(' + INSET.s + ')',
      kvInsetBg: inBath ? 'var(--kv-oilwin)' : 'var(--kv-win)',
      kvIY4: f1(insY(Y.P4)), kvIY3: f1(insY(Y.P3)), kvIY2: f1(insY(Y.P2)),
      kvIY4t: f1(insY(Y.P4) - 6), kvIY3t: f1(insY(Y.P3) - 6), kvIY2t: f1(insY(Y.P2) - 6),
      kvI3Col: hot.p3 ? '#46d39a' : 'var(--kv-mark)', kvI4Col: hot.p4 ? '#f0913f' : 'var(--kv-mark)', kvI2Col: hot.p2 ? '#4d9dff' : 'var(--kv-mark)',
      kvI3W: hot.p3 ? 2 : 1, kvI4W: hot.p4 ? 2 : 1,
      kvIArrowOn: insetYR != null && liquid,
      kvIArrowT: 'translate(' + (INSET.x + INSET.w - 36) + ',' + f1(insetYR || 0) + ')',
      kvIMenTxt: running ? 'meniscus · timing' : 'meniscus',
      kvTimerTxt: timerTxt, kvTimerCol: timerCol, kvTimerTag: timerTag,
      kvTimerUnit: timerTxt === 'READY' ? '' : 's',
      kvTimingBand: 'opacity:' + (running ? .16 : 0) + '; transition:opacity .3s ease;',
      kvTimingBandY: f1(insY(Y.P4)), kvTimingBandH: f1(insY(Y.P3) - insY(Y.P4)),

      /* right panel */
      kvCondTxt: mmss(st.condMin), kvCondBar: 'height:100%; width:' + (condFrac * 100).toFixed(1) + '%; border-radius:3px; background:' + (st.stable ? 'var(--grn)' : 'var(--amb)') + '; transition:width .1s linear;',
      kvCondNote: st.stable ? 'Temperature stabilized at 114 °C' : st.condOn ? 'Accelerated · bath holding 114 °C · sample equilibrating' : 'Accelerated clock · 00:00 → 60:00 = 1 hour',
      kvCondNoteCol: st.stable ? 'var(--grn)' : st.condOn ? 'var(--amb)' : 'var(--mut)',
      kvSetTxt: st.setOn ? 'SET ✓' : 'NOT SET',
      kvSetCol: st.setOn ? 'var(--grn)' : 'var(--mut)',
      kvSwStyle: 'display:flex; flex-direction:column; gap:3px; padding:10px 12px; border-radius:10px; background:' +
        (running ? 'rgba(70,211,154,.08)' : ph === 'stopped' ? 'rgba(240,145,63,.08)' : 'var(--icard)') + '; border:1px solid ' +
        (running ? 'rgba(70,211,154,.45)' : ph === 'stopped' ? 'rgba(240,145,63,.5)' : 'var(--line)') + '; transition:background .3s ease, border-color .3s ease;',
      kvSwDot: 'width:7px; height:7px; border-radius:50%; background:' + timerCol + ';' + (running && !st.paused ? ' animation:kvBlink .8s ease-in-out infinite;' : ''),
      kvSwNote: running ? 'Meniscus between Point 3 and Point 4' : ph === 'stopped' ? 'Stopped at Point 4 · recorded' : ph === 'idle' ? 'Starts at Point 3 · stops at Point 4' : 'Waiting for the meniscus at Point 3',
      kvOnC: e => { this.setState({ C: e.target.value }); },
      kvCVal: st.C,
      kvCOk: C != null, kvCState: 'CALIBRATED',
      kvCStateCol: 'var(--grn)',
      kvEqC: calcOn && C != null ? String(C) : 'C',
      kvEqCCol: calcOn && C != null ? '#e2c65a' : 'var(--mut2)',
      kvEqT: calcOn && st.calcStep >= 2 && st.tMeas != null ? st.tMeas.toFixed(2) : 't',
      kvEqTCol: calcOn && st.calcStep >= 2 ? '#6fb7ff' : 'var(--mut2)',
      kvNuTxt: st.calcStep >= 3 && nu != null ? sig(nu) : '—',
      kvNuUnit: st.calcStep >= 3 && nu != null ? 'cSt' : '',
      kvNuCol: st.calcStep >= 3 && nu != null ? 'var(--grn)' : 'var(--mut2)',
      kvNuBox: 'display:flex; align-items:baseline; justify-content:space-between; gap:8px; padding:9px 12px; border-radius:10px; background:' +
        (st.calcStep >= 3 && nu != null ? 'rgba(70,211,154,.08)' : 'var(--icard)') + '; border:1px solid ' + (st.calcStep >= 3 && nu != null ? 'rgba(70,211,154,.45)' : 'var(--line)') + ';',
      kvNuNote: st.calcStep >= 3 && nu != null ? 'ν = ' + C + ' × ' + st.tMeas.toFixed(2) + ' = ' + sig(nu) + ' mm²/s'
        : st.tMeas == null ? 'Available after the flow time is measured' : C == null ? 'Enter C, then press Calculate ν' : 'Press Calculate ν',

      /* controls */
      kvRun: () => this.run(i), kvRunText: st.complete ? 'Test Complete' : busy ? (STAGES[i].name + '…') : STAGES[i].btn, kvRunStyle: btnMain(canRun),
      kvAuto: () => this.runAll(), kvAutoText: st.auto && !st.complete ? 'Running Procedure…' : 'Run Full Procedure', kvAutoStyle: btnSub(canAuto, st.auto && !st.complete),
      kvPause: () => this.togglePause(), kvPauseText: st.paused ? 'Resume' : 'Pause', kvPauseStyle: btnSub(canPause, st.paused),
      kvPrev: () => { if (i > 0) this.goStage(i - 1); }, kvPrevStyle: 'opacity:' + (i > 0 ? 1 : .4) + '; cursor:' + (i > 0 ? 'pointer' : 'default') + ';',
      kvNext: () => { if (i < STAGES.length - 1) this.goStage(i + 1); }, kvNextStyle: 'opacity:' + (i < STAGES.length - 1 ? 1 : .4) + '; cursor:' + (i < STAGES.length - 1 ? 'pointer' : 'default') + ';',
      kvReset: () => this.reset()
    };
  }
}

DC.define('StageViscKin', {
  style: `
  .kv-root { --kv-glass:rgba(190,222,255,.13); --kv-glass-edge:rgba(205,230,255,.62); --kv-bore:rgba(3,8,16,.62);
    --kv-mark:rgba(235,242,252,.9); --kv-win:#07101c; --kv-oilwin:#1a1a12; --kv-oil:rgba(236,196,110,.06); --kv-oil-top:rgba(240,205,120,.65);
    --kv-steel1:#b9c5d4; --kv-steel2:#667589; --kv-steel3:#e6ecf3; --kv-body1:#8e9cb0; --kv-body2:#56647a; --kv-body3:#b3bfcf; --kv-edge:rgba(0,0,0,.45); --kv-cable:#3a4454; --kv-glass-wall:rgba(210,232,255,.22); --kv-lbl:rgba(170,195,225,.75); }
  html[data-theme="light"] .kv-root { --kv-glass:rgba(120,160,210,.14); --kv-glass-edge:rgba(50,85,130,.55); --kv-bore:rgba(245,249,253,.92);
    --kv-mark:rgba(30,45,65,.85); --kv-win:#eef2f7; --kv-oilwin:#f6ecd2; --kv-oil:rgba(214,165,60,.08); --kv-oil-top:rgba(170,120,30,.6);
    --kv-steel1:#e3e9f0; --kv-steel2:#98a6b9; --kv-steel3:#fbfcfe; --kv-body1:#e2e8ef; --kv-body2:#a9b5c5; --kv-body3:#f5f8fb; --kv-edge:rgba(40,60,90,.35); --kv-cable:#1d232c; --kv-glass-wall:rgba(40,70,110,.28); --kv-lbl:rgba(38,56,80,.72); }
  @keyframes kvBlink { 0%,100% { opacity:1; } 50% { opacity:.3; } }
  @keyframes kvRise { from { transform:translateY(24px); } to { transform:translateY(-24px); } }
  @keyframes kvSpin { 0%,100% { transform:scaleX(1); } 50% { transform:scaleX(-1); } }
  .kv-heat path { animation:kvRise calc(3.2s * var(--pm,1)) linear infinite; }
  .kv-heat path:nth-child(2n) { animation-duration:calc(4.1s * var(--pm,1)); animation-delay:-1.3s; }
  .kv-heat path:nth-child(3n) { animation-duration:calc(3.6s * var(--pm,1)); animation-delay:-2.1s; }
  .kv-imp { transform-box:fill-box; transform-origin:center; animation:kvSpin calc(.5s * var(--pm,1)) linear infinite; }
  .kv-root input::placeholder { color:var(--mut2); }
  @media (max-height:820px) {
    .kv-side { gap:5px !important; padding:7px 10px !important; }
    .kv-side > div:not(.kv-hdr) { padding:6px 10px !important; gap:3px !important; }
    .kv-side .kv-hdr { display:none; }
    .kv-side .kv-big { font-size:21px !important; }
    .kv-side .kv-cval { height:26px !important; }
  }
  `,
  template: `<div class="kv-root" data-screen-label="Kinematic Viscosity Test" style="flex:1 1 auto; min-height:0; width:100%; display:flex; flex-direction:column; gap:8px; text-align:left;">

  <!-- stage chips -->
  <div class="stage-strip" style="flex:0 0 auto; display:flex; gap:6px;">
    <sc-for list="{{ kvStages }}" as="s" hint-placeholder-count="7">
      <button onclick="{{ s.onClick }}" style="{{ s.style }}">
        <span style="font-size:11.5px; font-weight:600; color:var(--txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;"><span style="color:var(--mut2); font-family:'IBM Plex Mono',monospace; font-size:10px; margin-right:5px;">{{ s.n }}</span>{{ s.name }}</span>
        <span style="font-family:'IBM Plex Mono',monospace; font-size:8.5px; letter-spacing:.5px; text-transform:uppercase; color:{{ s.tagColor }}; margin-top:1px;">{{ s.tag }}</span>
      </button>
    </sc-for>
  </div>

  <!-- shared Validation layout: simulation area (.vl-sim) | fixed sidebar (readings + procedure dock) -->
  <div class="lab-body">

    <!-- ============ schematic ============ -->
    <div class="lab-schem vl-sim" style="padding:0;">
      <div style="flex:0 0 auto; display:flex; align-items:center; gap:9px; padding:7px 12px; border-bottom:1px solid var(--line);">
        <span style="{{ kvMsgDot }}"></span>
        <span style="flex:1 1 auto; min-width:0; font-size:12.5px; font-weight:500; color:{{ kvMsgCol }};">{{ kvMsg }}</span>
        <span style="flex:0 0 auto; font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.8px; font-weight:600; color:var(--mut); padding:2px 8px; border:1px solid var(--line2); border-radius:6px; background:var(--chipbg);">{{ kvStepTag }}</span>
      </div>
      <svg sc-camel-view-box="{{ kvVB }}" preserveAspectRatio="xMidYMid meet" style="flex:1 1 auto; min-height:0; width:100%; height:100%; display:block;">
        <defs>
          <clipPath id="kvBoreClip"><path d="{{ kvBore }}"></path></clipPath>
          <clipPath id="kvGlassClip"><path d="{{ kvGlass }}"></path></clipPath>
          <clipPath id="kvWinClip"><rect x="324" y="180" width="372" height="426" rx="6"></rect></clipPath>
          <clipPath id="kvInsetClip"><rect x="770" y="96" width="210" height="420" rx="8"></rect></clipPath>
          <linearGradient id="kvSteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--kv-steel1)"></stop><stop offset="1" stop-color="var(--kv-steel2)"></stop></linearGradient>
          <linearGradient id="kvBody" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="var(--kv-body2)"></stop><stop offset=".06" stop-color="var(--kv-body1)"></stop><stop offset=".12" stop-color="var(--kv-body3)"></stop>
            <stop offset=".5" stop-color="var(--kv-body1)"></stop><stop offset=".88" stop-color="var(--kv-body3)"></stop><stop offset=".95" stop-color="var(--kv-body1)"></stop><stop offset="1" stop-color="var(--kv-body2)"></stop></linearGradient>
          <linearGradient id="kvLidTop" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--kv-steel2)"></stop><stop offset=".3" stop-color="var(--kv-steel1)"></stop><stop offset=".55" stop-color="var(--kv-steel3)"></stop><stop offset=".8" stop-color="var(--kv-steel1)"></stop><stop offset="1" stop-color="var(--kv-steel2)"></stop></linearGradient>
          <linearGradient id="kvLidEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--kv-steel3)"></stop><stop offset=".25" stop-color="var(--kv-steel1)"></stop><stop offset="1" stop-color="var(--kv-steel2)"></stop></linearGradient>
          <linearGradient id="kvBezel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--kv-steel2)"></stop><stop offset=".5" stop-color="var(--kv-steel1)"></stop><stop offset="1" stop-color="var(--kv-steel3)"></stop></linearGradient>
          <linearGradient id="kvRod" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5e6d83"></stop><stop offset=".35" stop-color="#e3e9f1"></stop><stop offset=".55" stop-color="#a9b6c7"></stop><stop offset="1" stop-color="#56647a"></stop></linearGradient>
          <linearGradient id="kvBoss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe6ef"></stop><stop offset=".5" stop-color="#9aa8ba"></stop><stop offset="1" stop-color="#5b6980"></stop></linearGradient>
          <linearGradient id="kvOilG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(240,204,122,.10)"></stop><stop offset=".6" stop-color="rgba(222,172,82,.15)"></stop><stop offset="1" stop-color="rgba(204,150,62,.20)"></stop></linearGradient>
          <linearGradient id="kvDepth" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgba(0,0,0,.38)"></stop><stop offset=".14" stop-color="rgba(0,0,0,0)"></stop><stop offset=".86" stop-color="rgba(0,0,0,0)"></stop><stop offset="1" stop-color="rgba(0,0,0,.38)"></stop></linearGradient>
          <linearGradient id="kvLidShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(0,0,0,.45)"></stop><stop offset="1" stop-color="rgba(0,0,0,0)"></stop></linearGradient>
          <linearGradient id="kvSurf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,236,190,.28)"></stop><stop offset="1" stop-color="rgba(255,236,190,0)"></stop></linearGradient>
          <linearGradient id="kvSheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="rgba(255,255,255,.06)"></stop><stop offset=".14" stop-color="rgba(255,255,255,.42)"></stop><stop offset=".3" stop-color="rgba(255,255,255,.07)"></stop>
            <stop offset=".62" stop-color="rgba(0,0,0,0)"></stop><stop offset=".86" stop-color="rgba(255,255,255,.16)"></stop><stop offset="1" stop-color="rgba(0,0,0,.18)"></stop></linearGradient>
          <linearGradient id="kvPane" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgba(255,255,255,.10)"></stop><stop offset=".35" stop-color="rgba(255,255,255,0)"></stop></linearGradient>
          <linearGradient id="kvHousing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#343d4d"></stop><stop offset=".08" stop-color="#262e3b"></stop><stop offset="1" stop-color="#151a23"></stop></linearGradient>
          <linearGradient id="kvLcd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgba(255,255,255,.10)"></stop><stop offset=".4" stop-color="rgba(255,255,255,0)"></stop></linearGradient>
          <radialGradient id="kvBtn" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#5a6678"></stop><stop offset="1" stop-color="#20262f"></stop></radialGradient>
          <radialGradient id="kvFloor" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="rgba(0,0,0,.45)"></stop><stop offset="1" stop-color="rgba(0,0,0,0)"></stop></radialGradient>
          <radialGradient id="kvHeatG" cx=".5" cy=".75" r=".7"><stop offset="0" stop-color="rgba(255,120,60,.55)"></stop><stop offset="1" stop-color="rgba(255,120,60,0)"></stop></radialGradient>
          <filter id="kvDrop" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".35"></feDropShadow></filter>
        </defs>

        <!-- floor shadow under the bath -->
        <ellipse cx="510" cy="634" rx="236" ry="9" fill="url(#kvFloor)"></ellipse>

        <!-- ===== bath: back (window + oil) ===== -->
        <g>
          <rect x="324" y="180" width="372" height="426" rx="6" fill="var(--kv-win)"></rect>
          <rect x="326" y="206" width="368" height="398" fill="url(#kvOilG)"></rect>
          <rect x="324" y="180" width="372" height="426" fill="url(#kvDepth)" opacity=".55"></rect>
          <rect x="324" y="180" width="372" height="30" fill="url(#kvLidShade)" opacity=".7"></rect>
          <rect x="326" y="207" width="368" height="16" fill="url(#kvSurf)"></rect>
          <g clip-path="url(#kvWinClip)"><rect x="326" y="330" width="368" height="276" fill="url(#kvHeatG)" style="{{ kvGlowStyle }}"></rect></g>
          <!-- temperature probe (stainless sheath + handle) -->
          <rect x="352" y="126" width="8" height="340" rx="3" fill="url(#kvRod)"></rect>
          <path d="M352 462 h8 l-1.5 8 h-5 z" fill="#8391a5"></path>
          <rect x="348.5" y="110" width="15" height="22" rx="3.5" fill="url(#kvHousing)" stroke="#0e1218" stroke-width=".8"></rect>
          <rect x="350.5" y="112" width="3" height="18" rx="1.5" fill="rgba(255,255,255,.12)"></rect>
          <!-- stirrer shaft + impeller -->
          <rect x="665" y="150" width="6" height="408" rx="2" fill="url(#kvRod)"></rect>
          <g class="kv-imp" style="{{ kvHeatAnim }}"><path d="M650 556 h36 v7 h-36 z" fill="#8a98ac"></path><path d="M650 556 h36 v2 h-36 z" fill="rgba(255,255,255,.35)"></path></g>
          <!-- heater loop along the bottom -->
          <path d="M340 592 H640 M340 584 H640" stroke="#b5553a" stroke-width="3" stroke-linecap="round" opacity=".6"></path>
          <path d="M340 592 H640 M340 584 H640" stroke="#ff7a3c" stroke-width="3.4" stroke-linecap="round" style="{{ kvHeaterStyle }}"></path>
          <path d="M340 583 H640" stroke="rgba(255,255,255,.18)" stroke-width="1" stroke-linecap="round"></path>
        </g>

        <!-- ===== U-tube + its holder (moves as one piece) ===== -->
        <g transform="{{ kvTubeT }}">
          <!-- holder: support rod between the arms, hanging from the holder plate on the lid (behind the glass) -->
          <rect x="75" y="40" width="6" height="392" rx="3" fill="url(#kvRod)"></rect>
          <circle cx="78" cy="432" r="3" fill="#7d8ba0"></circle>
          <rect x="14" y="146" width="112" height="7" rx="3" fill="url(#kvBoss)" opacity=".95"></rect>
          <rect x="28" y="264" width="98" height="6" rx="3" fill="url(#kvBoss)" opacity=".95"></rect>
          <g id="kvTubeInner">
            <rect x="59" y="66" width="40" height="7" rx="3" fill="var(--kv-glass)" stroke="var(--kv-glass-edge)" stroke-width=".8"></rect>
            <path d="{{ kvGlass }}" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="2.4" stroke-linejoin="round"></path>
            <path d="{{ kvGlass }}" fill="var(--kv-glass)" stroke="var(--kv-glass-edge)" stroke-width="1.1" stroke-linejoin="round"></path>
            <path d="{{ kvBore }}" fill="var(--kv-bore)"></path>
            <sc-if value="{{ kvLiqOn }}" hint-placeholder-val="{{ false }}">
              <path d="M40,-2 V452 A32,32 0 0 0 104,452 V-4" fill="none" stroke="{{ kvOil }}" stroke-width="40" stroke-dasharray="{{ kvDash }}" clip-path="url(#kvBoreClip)"></path>
            </sc-if>
            <sc-if value="{{ kvMROn }}" hint-placeholder-val="{{ false }}">
              <path d="{{ kvMR }}" fill="none" stroke="#ffe3a6" stroke-width="1.3" stroke-linecap="round"></path>
            </sc-if>
            <sc-if value="{{ kvMLOn }}" hint-placeholder-val="{{ false }}">
              <path d="{{ kvML }}" fill="none" stroke="#ffe3a6" stroke-width="1.3" stroke-linecap="round"></path>
            </sc-if>
            <!-- glass wall (inner surface) + cylindrical sheen over glass and sample -->
            <path d="{{ kvBore }}" fill="none" stroke="var(--kv-glass-wall)" stroke-width=".8"></path>
            <g clip-path="url(#kvGlassClip)">
              <rect x="21" y="-4" width="38" height="200" fill="url(#kvSheen)"></rect>
              <rect x="34.8" y="190" width="10.4" height="264" fill="url(#kvSheen)"></rect>
              <rect x="97.8" y="-6" width="12.4" height="312" fill="url(#kvSheen)"></rect>
              <rect x="89" y="306" width="30" height="62" fill="url(#kvSheen)"></rect>
              <rect x="98.8" y="366" width="10.4" height="48" fill="url(#kvSheen)"></rect>
              <rect x="93" y="412" width="22" height="32" fill="url(#kvSheen)"></rect>
              <rect x="98.8" y="440" width="10.4" height="14" fill="url(#kvSheen)"></rect>
              <path d="M40,452 A32,32 0 0 0 104,452" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="3"></path>
            </g>
            <!-- fire-polished rims -->
            <ellipse cx="40" cy="-2" rx="19" ry="2.6" fill="rgba(4,10,20,.35)" stroke="var(--kv-glass-edge)" stroke-width="1"></ellipse>
            <ellipse cx="104" cy="-4" rx="6.2" ry="1.4" fill="rgba(4,10,20,.35)" stroke="var(--kv-glass-edge)" stroke-width=".9"></ellipse>
            <!-- etched marks: 1 (ring on the reservoir), 2, 3, 4 on the measuring arm -->
            <path d="M19,118 Q40,123 61,118" fill="none" stroke="var(--kv-mark)" stroke-width="1.3"></path>
            <path d="M19,118 Q40,114 61,118" fill="none" stroke="var(--kv-mark)" stroke-width=".6" opacity=".5"></path>
            <line x1="95" y1="408" x2="113" y2="408" stroke="var(--kv-mark)" stroke-width="1.2"></line>
            <line x1="95" y1="368" x2="113" y2="368" stroke="var(--kv-mark)" stroke-width="1.2"></line>
            <line x1="95" y1="314" x2="113" y2="314" stroke="var(--kv-mark)" stroke-width="1.2"></line>
            <!-- glass highlight -->
            <path d="M26,6 V170 M106.5,300 V10" stroke="rgba(255,255,255,.34)" stroke-width="1.2" fill="none"></path>
            <path d="M55,10 V168" stroke="rgba(255,255,255,.12)" stroke-width="1" fill="none"></path>
          </g>
          <!-- holder clamps: bosses on the rod + rubber-lined jaws gripping the glass (in front) -->
          <g>
            <rect x="70" y="141" width="16" height="17" rx="2.5" fill="url(#kvBoss)" stroke="#44505f" stroke-width=".7"></rect>
            <rect x="86" y="146.5" width="6" height="6" rx="1" fill="#8a97a9"></rect>
            <rect x="15" y="143" width="5" height="13" rx="1.5" fill="#23272e"></rect><rect x="60" y="143" width="5" height="13" rx="1.5" fill="#23272e"></rect>
            <rect x="95" y="143" width="4.5" height="13" rx="1.5" fill="#23272e"></rect><rect x="108.5" y="143" width="4.5" height="13" rx="1.5" fill="#23272e"></rect>
            <rect x="113" y="145.5" width="12" height="8" rx="2" fill="url(#kvBoss)" stroke="#44505f" stroke-width=".6"></rect>
            <rect x="70" y="258" width="16" height="17" rx="2.5" fill="url(#kvBoss)" stroke="#44505f" stroke-width=".7"></rect>
            <rect x="86" y="263.5" width="6" height="6" rx="1" fill="#8a97a9"></rect>
            <rect x="30" y="260" width="4.5" height="13" rx="1.5" fill="#23272e"></rect><rect x="45.5" y="260" width="4.5" height="13" rx="1.5" fill="#23272e"></rect>
            <rect x="95" y="260" width="4.5" height="13" rx="1.5" fill="#23272e"></rect><rect x="108.5" y="260" width="4.5" height="13" rx="1.5" fill="#23272e"></rect>
            <rect x="113" y="262.5" width="12" height="8" rx="2" fill="url(#kvBoss)" stroke="#44505f" stroke-width=".6"></rect>
          </g>
          <!-- stopper (Point 5) -->
          <g transform="{{ kvStopT }}" style="{{ kvStopStyle }}">
            <path d="M-10,-14 H10 L7,6 H-7 Z" fill="#7a3b33" stroke="#4d211c" stroke-width="1"></path>
            <path d="M-8,-11 H8" stroke="rgba(255,255,255,.25)" stroke-width="1.2"></path>
            <path d="M-8,-12 L-6,4" stroke="rgba(255,255,255,.14)" stroke-width="1.6"></path>
          </g>
          <!-- syringe at the filling arm (Point 1) -->
          <g style="{{ kvSyrStyle }}">
            <g transform="{{ kvSyrT }}">
              <rect x="-7" y="-60" width="14" height="56" rx="3" fill="var(--kv-glass)" stroke="var(--kv-glass-edge)" stroke-width="1"></rect>
              <rect x="-5.5" y="{{ kvSyrLiqY }}" width="11" height="{{ kvSyrLiqH }}" fill="{{ kvOil }}"></rect>
              <rect x="-6" y="{{ kvPlungerY }}" width="12" height="4" fill="#5c6b82"></rect>
              <rect x="-5" y="-58" width="2.5" height="52" rx="1.2" fill="rgba(255,255,255,.22)"></rect>
              <line x1="0" y1="-58" x2="0" y2="-80" stroke="#8a98ac" stroke-width="3"></line>
              <line x1="0" y1="-4" x2="0" y2="12" stroke="#b9c4d2" stroke-width="1.4"></line>
            </g>
          </g>
          <sc-if value="{{ kvStreamOn }}" hint-placeholder-val="{{ false }}">
            <line x1="40" y1="2" x2="40" y2="{{ kvStreamY2 }}" stroke="{{ kvOil }}" stroke-width="2.4" stroke-linecap="round"></line>
          </sc-if>
        </g>

        <!-- ===== bath: front (oil tint over the immersed tube, frame, lid, controller) ===== -->
        <g clip-path="url(#kvWinClip)">
          <rect x="326" y="206" width="368" height="398" fill="var(--kv-oil)"></rect>
          <path d="M326 206 Q360 203 395 206 T465 206 T535 206 T605 206 T694 206" fill="none" stroke="var(--kv-oil-top)" stroke-width="1.6"></path>
          <path d="M326 208.5 Q360 206 395 208.5 T465 208.5 T535 208.5 T605 208.5 T694 208.5" fill="none" stroke="rgba(255,240,200,.18)" stroke-width="1"></path>
          <g class="kv-heat" style="{{ kvHeatStyle }}" fill="none" stroke="rgba(255,170,90,.55)" stroke-width="1.3" stroke-linecap="round">
            <path d="M380 560 q6 -14 0 -28 t0 -28 t0 -28"></path>
            <path d="M430 520 q-6 -14 0 -28 t0 -28 t0 -28"></path>
            <path d="M590 545 q6 -14 0 -28 t0 -28 t0 -28"></path>
            <path d="M640 500 q-6 -14 0 -28 t0 -28 t0 -28"></path>
            <path d="M410 420 q6 -14 0 -28 t0 -28"></path>
            <path d="M615 400 q-6 -14 0 -28 t0 -28"></path>
            <path d="M470 580 q6 -12 0 -24 t0 -24"></path>
            <path d="M560 585 q-6 -12 0 -24 t0 -24"></path>
          </g>
          <!-- front glass pane reflections -->
          <rect x="324" y="180" width="372" height="426" fill="url(#kvPane)"></rect>
          <path d="M600 180 L640 180 L470 606 L430 606 Z" fill="rgba(255,255,255,.035)"></path>
          <path d="M652 180 L664 180 L494 606 L482 606 Z" fill="rgba(255,255,255,.03)"></path>
        </g>
        <!-- stainless-steel housing with the front window -->
        <path d="M302 164 H718 V628 H302 Z M330 180 Q324 180 324 186 V600 Q324 606 330 606 H690 Q696 606 696 600 V186 Q696 180 690 180 Z" fill="url(#kvBody)" fill-rule="evenodd" stroke="var(--kv-edge)" stroke-width="1" filter="url(#kvDrop)"></path>
        <path d="M303 166 H717" stroke="rgba(255,255,255,.35)" stroke-width="1"></path>
        <path d="M303.5 166 V627" stroke="rgba(255,255,255,.22)" stroke-width="1"></path>
        <path d="M303 627 H717" stroke="rgba(0,0,0,.35)" stroke-width="1.2"></path>
        <rect x="322.5" y="178.5" width="375" height="429" rx="7" fill="none" stroke="url(#kvBezel)" stroke-width="3"></rect>
        <rect x="324" y="180" width="372" height="426" rx="6" fill="none" stroke="rgba(200,225,255,.30)" stroke-width="1"></rect>
        <path d="M336 190 L360 190 L336 260 Z" fill="rgba(255,255,255,.05)"></path>
        <!-- top plate: top face + front edge -->
        <path d="M300 141 H720 L724 148 H296 Z" fill="url(#kvLidTop)"></path>
        <rect x="296" y="148" width="428" height="17" rx="2" fill="url(#kvLidEdge)" stroke="var(--kv-edge)" stroke-width=".8"></rect>
        <path d="M297 149.2 H723" stroke="rgba(255,255,255,.55)" stroke-width="1"></path>
        <path d="M297 164.5 H723" stroke="rgba(0,0,0,.30)" stroke-width="1"></path>
        <g fill="var(--kv-steel2)">
          <circle cx="314" cy="200" r="2.4"></circle><circle cx="706" cy="200" r="2.4"></circle>
          <circle cx="314" cy="410" r="2.4"></circle><circle cx="706" cy="410" r="2.4"></circle>
          <circle cx="314" cy="614" r="2.4"></circle><circle cx="706" cy="614" r="2.4"></circle>
        </g>
        <g fill="rgba(255,255,255,.55)">
          <circle cx="313.3" cy="199.3" r=".8"></circle><circle cx="705.3" cy="199.3" r=".8"></circle>
          <circle cx="313.3" cy="409.3" r=".8"></circle><circle cx="705.3" cy="409.3" r=".8"></circle>
          <circle cx="313.3" cy="613.3" r=".8"></circle><circle cx="705.3" cy="613.3" r=".8"></circle>
        </g>
        <!-- drain valve + feet -->
        <rect x="662" y="628" width="16" height="8" rx="2" fill="url(#kvRod)"></rect>
        <rect x="666" y="634" width="8" height="5" rx="1.5" fill="#56647a"></rect>
        <rect x="312" y="628" width="26" height="6" rx="2" fill="#262c35"></rect><rect x="682" y="628" width="26" height="6" rx="2" fill="#262c35"></rect>
        <!-- viscometer holder plate on the top plate (tube passes through it) -->
        <sc-if value="{{ kvHolderOn }}" hint-placeholder-val="{{ false }}">
          <g transform="{{ kvTubeT }}">
            <path d="M8 34 H130 L133 41 H5 Z" fill="url(#kvLidTop)"></path>
            <rect x="5" y="41" width="128" height="7" rx="1.5" fill="url(#kvLidEdge)" stroke="var(--kv-edge)" stroke-width=".7"></rect>
            <path d="M6 41.8 H132" stroke="rgba(255,255,255,.5)" stroke-width=".8"></path>
            <ellipse cx="40" cy="37.5" rx="21" ry="2.4" fill="rgba(0,0,0,.35)"></ellipse>
            <ellipse cx="104" cy="37.5" rx="8" ry="1.6" fill="rgba(0,0,0,.35)"></ellipse>
            <rect x="21" y="30" width="38" height="11" fill="var(--kv-glass)" stroke="var(--kv-glass-edge)" stroke-width=".9"></rect>
            <rect x="97.8" y="30" width="12.4" height="11" fill="var(--kv-glass)" stroke="var(--kv-glass-edge)" stroke-width=".9"></rect>
            <rect x="72" y="35" width="12" height="6" rx="1.5" fill="url(#kvBoss)"></rect>
            <circle cx="122" cy="44.5" r="2" fill="#56647a"></circle><circle cx="16" cy="44.5" r="2" fill="#56647a"></circle>
          </g>
        </sc-if>
        <!-- probe cable to the controller -->
        <path d="M580 64 C 520 4, 380 8, 356 110" fill="none" stroke="var(--kv-cable)" stroke-width="3" stroke-linecap="round"></path>
        <path d="M580 64 C 520 4, 380 8, 356 110" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="1" stroke-linecap="round"></path>
        <!-- temperature controller head -->
        <g>
          <rect x="590" y="138" width="114" height="8" rx="2" fill="#1a1f28"></rect>
          <g filter="url(#kvDrop)"><rect x="580" y="36" width="134" height="106" rx="7" fill="url(#kvHousing)" stroke="#0d1117" stroke-width="1"></rect></g>
          <path d="M586 37.5 H708" stroke="rgba(255,255,255,.20)" stroke-width="1"></path>
          <rect x="586" y="43" width="122" height="92" rx="4" fill="rgba(0,0,0,.18)" stroke="rgba(255,255,255,.06)"></rect>
          <rect x="592" y="48" width="110" height="40" rx="3" fill="#07090d" stroke="#2c3544"></rect>
          <text x="696" y="77" text-anchor="end" style="font-family:'IBM Plex Mono',monospace; font-size:24px; font-weight:700; fill:#ff4a3a; letter-spacing:1px;">{{ kvBathPV }}</text>
          <rect x="592" y="48" width="110" height="40" rx="3" fill="url(#kvLcd)"></rect>
          <text x="598" y="59" style="font-family:'IBM Plex Mono',monospace; font-size:7.5px; fill:#ff8a7a;">°C</text>
          <text x="598" y="102" style="font-family:'IBM Plex Mono',monospace; font-size:9px; fill:#7fd0a8; letter-spacing:.6px;">{{ kvBathSP }}</text>
          <text x="702" y="102" text-anchor="end" style="font-family:'IBM Plex Mono',monospace; font-size:8px; font-weight:700; letter-spacing:.6px; fill:{{ kvBathStCol }};">{{ kvBathLbl }}</text>
          <circle cx="612" cy="122" r="6" fill="url(#kvBtn)" stroke="#0d1117"></circle><circle cx="632" cy="122" r="6" fill="url(#kvBtn)" stroke="#0d1117"></circle>
          <circle cx="652" cy="122" r="6" fill="url(#kvBtn)" stroke="#0d1117"></circle>
          <circle cx="686" cy="120" r="10" fill="url(#kvBtn)" stroke="#0d1117"></circle>
          <path d="M686 112 V117" stroke="#c9d4e2" stroke-width="1.6" stroke-linecap="round"></path>
          <circle cx="704" cy="56" r="2.6" fill="#46d39a"></circle>
          <text x="647" y="30" text-anchor="middle" style="font-family:'IBM Plex Mono',monospace; font-size:9px; fill:var(--kv-lbl); letter-spacing:1px;">TEMP. CONTROLLER</text>
        </g>
        <text x="510" y="656" text-anchor="middle" style="font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:1.4px; fill:var(--kv-lbl);">KINEMATIC VISCOSITY BATH · SILICONE OIL</text>

        <!-- ===== point labels (move with the tube, drawn above the bath) ===== -->
        <g transform="{{ kvTubeT }}" style="{{ kvPtsStyle }}">
          <sc-for list="{{ kvPts }}" as="p" hint-placeholder-count="5">
            <g>
              <line x1="{{ p.cx }}" y1="{{ p.cy }}" x2="{{ p.lx }}" y2="{{ p.ly }}" stroke="{{ p.ring }}" stroke-width="1" stroke-dasharray="2 2"></line>
              <circle cx="{{ p.cx }}" cy="{{ p.cy }}" r="15" fill="{{ p.glowCol }}" style="{{ p.glow }}"></circle>
              <circle cx="{{ p.cx }}" cy="{{ p.cy }}" r="9.5" fill="{{ p.fill }}" stroke="{{ p.ring }}" stroke-width="1.6"></circle>
              <text x="{{ p.cx }}" y="{{ p.cy }}" dy="3.8" text-anchor="middle" style="font-family:'IBM Plex Sans',sans-serif; font-size:11px; font-weight:700; fill:{{ p.txt }};">{{ p.n }}</text>
            </g>
          </sc-for>
          <sc-if value="{{ kvP5On }}" hint-placeholder-val="{{ false }}">
            <text x="72" y="-52" text-anchor="middle" style="font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:700; letter-spacing:.8px; fill:{{ kvP5Col }};">{{ kvP5Txt }}</text>
          </sc-if>
        </g>

        <!-- ===== magnified timing zone + stopwatch: Flow Timing stage only ===== -->
        <sc-if value="{{ kvInsetOn }}" hint-placeholder-val="{{ false }}">
        <g>
          <text x="875" y="70" text-anchor="middle" style="font-family:'IBM Plex Mono',monospace; font-size:10.5px; font-weight:600; letter-spacing:1.2px; fill:var(--kv-lbl);">TIMING ZONE · MAGNIFIED</text>
          <text x="875" y="86" text-anchor="middle" style="font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:.8px; fill:var(--mut2);">Points 2 · 3 · 4</text>
          <rect x="770" y="96" width="210" height="420" rx="8" fill="{{ kvInsetBg }}" stroke="var(--line2)" stroke-width="1"></rect>
          <rect x="770" y="{{ kvTimingBandY }}" width="210" height="{{ kvTimingBandH }}" fill="#46d39a" style="{{ kvTimingBand }}"></rect>
          <g clip-path="url(#kvInsetClip)"><use href="#kvTubeInner" transform="{{ kvInsetT }}"></use></g>
          <line x1="776" y1="{{ kvIY4 }}" x2="974" y2="{{ kvIY4 }}" stroke="{{ kvI4Col }}" stroke-width="{{ kvI4W }}" stroke-dasharray="4 4"></line>
          <line x1="776" y1="{{ kvIY3 }}" x2="974" y2="{{ kvIY3 }}" stroke="{{ kvI3Col }}" stroke-width="{{ kvI3W }}" stroke-dasharray="4 4"></line>
          <line x1="776" y1="{{ kvIY2 }}" x2="974" y2="{{ kvIY2 }}" stroke="{{ kvI2Col }}" stroke-width="1" stroke-dasharray="4 4"></line>
          <text x="778" y="{{ kvIY4t }}" style="font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:700; fill:{{ kvI4Col }};">4 · STOP</text>
          <text x="778" y="{{ kvIY3t }}" style="font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:700; fill:{{ kvI3Col }};">3 · START</text>
          <text x="778" y="{{ kvIY2t }}" style="font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:700; fill:{{ kvI2Col }};">2 · FILL</text>
          <sc-if value="{{ kvIArrowOn }}" hint-placeholder-val="{{ false }}">
            <g transform="{{ kvIArrowT }}">
              <path d="M0,0 L12,-6 L12,6 Z" fill="#ffe3a6"></path>
            </g>
          </sc-if>
          <rect x="770" y="528" width="210" height="54" rx="8" fill="var(--panel)" stroke="var(--line2)"></rect>
          <text x="782" y="546" style="font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:1px; fill:var(--mut);">STOPWATCH</text>
          <text x="968" y="546" text-anchor="end" style="font-family:'IBM Plex Mono',monospace; font-size:9px; font-weight:700; letter-spacing:1px; fill:{{ kvTimerCol }};">{{ kvTimerTag }}</text>
          <text x="968" y="573" text-anchor="end" style="font-family:'IBM Plex Mono',monospace; font-size:22px; font-weight:700; fill:{{ kvTimerCol }};">{{ kvTimerTxt }} {{ kvTimerUnit }}</text>
        </g>
        </sc-if>
      </svg>
    </div>

    <!-- ============ live information panel ============ -->
    <div class="lab-side">
    <div class="vl-scroll">
    <div class="kv-side" style="flex:0 0 auto; min-width:0; display:flex; flex-direction:column; gap:8px; border:1px solid var(--line); border-radius:12px; background:var(--panel); padding:10px 12px;">
      <div class="kv-hdr" style="font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:1.4px; font-weight:600; color:var(--mut); text-transform:uppercase;">Live Measurement</div>

      <div style="display:flex; align-items:baseline; justify-content:space-between; gap:8px; padding:8px 12px; border-radius:10px; background:var(--icard); border:1px solid var(--line);">
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span style="font-size:11px; color:var(--mut); font-weight:500;">Bath Temperature</span>
          <span style="font-size:9.5px; font-family:'IBM Plex Mono',monospace; color:{{ kvSetCol }};">{{ kvSetTxt }} · reservoir T</span>
        </div>
        <span style="font-family:'IBM Plex Mono',monospace; font-size:20px; font-weight:700; color:var(--red);">114.0 <span style="font-size:11px; color:var(--mut);">°C</span></span>
      </div>

      <div style="display:flex; flex-direction:column; gap:5px; padding:8px 12px; border-radius:10px; background:var(--icard); border:1px solid var(--line);">
        <div style="display:flex; align-items:baseline; justify-content:space-between; gap:8px;">
          <span style="font-size:11px; color:var(--mut); font-weight:500;">Conditioning Time</span>
          <span style="font-family:'IBM Plex Mono',monospace; font-size:18px; font-weight:700; color:var(--txt);">{{ kvCondTxt }} <span style="font-size:11px; color:var(--mut);">/ 60:00 min</span></span>
        </div>
        <div style="height:5px; border-radius:3px; background:var(--track); overflow:hidden;"><div style="{{ kvCondBar }}"></div></div>
        <span style="font-size:10px; color:{{ kvCondNoteCol }}; font-weight:500;">{{ kvCondNote }}</span>
      </div>

      <sc-if value="{{ kvSwOn }}" hint-placeholder-val="{{ false }}">
      <div style="{{ kvSwStyle }}">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <span style="font-size:11px; color:var(--mut); font-weight:500;">Flow Time, t</span>
          <span style="display:inline-flex; align-items:center; gap:6px; font-family:'IBM Plex Mono',monospace; font-size:9.5px; font-weight:700; letter-spacing:.8px; color:{{ kvTimerCol }};"><span style="{{ kvSwDot }}"></span>{{ kvTimerTag }}</span>
        </div>
        <span class="kv-big" style="font-family:'IBM Plex Mono',monospace; font-size:28px; font-weight:700; color:{{ kvTimerCol }}; line-height:1.1;">{{ kvTimerTxt }} <span style="font-size:13px; color:var(--mut);">{{ kvTimerUnit }}</span></span>
        <span style="font-size:10px; color:var(--mut);">{{ kvSwNote }}</span>
      </div>
      </sc-if>
      <sc-if value="{{ kvSwOff }}" hint-placeholder-val="{{ false }}">
        <div style="display:flex; align-items:baseline; justify-content:space-between; gap:8px; padding:8px 12px; border-radius:10px; background:var(--icard); border:1px dashed var(--line2);">
          <span style="font-size:11px; color:var(--mut); font-weight:500;">Flow Time, t</span>
          <span style="font-size:10px; color:var(--mut2);">measured in Flow Timing stage</span>
        </div>
      </sc-if>

      <div style="display:flex; flex-direction:column; gap:5px; padding:8px 12px; border-radius:10px; background:var(--icard); border:1px solid var(--line);">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <span style="font-size:11px; color:var(--mut); font-weight:500;">Viscometer Constant, C</span>
          <span style="font-family:'IBM Plex Mono',monospace; font-size:9px; font-weight:700; letter-spacing:.8px; color:{{ kvCStateCol }};">{{ kvCState }}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="kv-cval" style="flex:1 1 auto; min-width:0; height:30px; box-sizing:border-box; padding:0 10px; border-radius:7px; border:1px solid var(--line); background:var(--panel); color:var(--txt); font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600; display:flex; align-items:center;">{{ kvCVal }}</div>
          <span style="flex:0 0 auto; font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--mut);">mm²/s²</span>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:6px; padding:8px 12px; border-radius:10px; background:var(--icard); border:1px solid var(--line); flex:1 1 auto; min-height:0;">
        <span style="font-size:11px; color:var(--mut); font-weight:500;">Kinematic Viscosity</span>
        <div style="display:flex; align-items:baseline; justify-content:center; gap:7px; font-family:'IBM Plex Mono',monospace; font-size:17px; font-weight:700; color:var(--txt); padding:2px 0;">
          <span>ν =</span><span style="color:{{ kvEqCCol }};">{{ kvEqC }}</span><span style="color:var(--mut);">×</span><span style="color:{{ kvEqTCol }};">{{ kvEqT }}</span>
        </div>
        <div style="{{ kvNuBox }}">
          <span style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:700; color:var(--txt2);">ν</span>
          <span class="kv-big" style="font-family:'IBM Plex Mono',monospace; font-size:24px; font-weight:700; color:{{ kvNuCol }};">{{ kvNuTxt }} <span style="font-size:12px; color:var(--mut);">{{ kvNuUnit }}</span></span>
        </div>
        <span style="font-size:10px; color:var(--mut); line-height:1.4;">{{ kvNuNote }}</span>
      </div>
    </div>
    </div>
    <div class="vl-dock">
      <div class="pc-host" data-pc="StageViscKin" data-pc-layout="side"></div>
      <div class="vl-fwd"></div>
    </div>
    </div>
  </div>
</div>`,
  logic: Component
});
})();
