/* component: StageViscSingle — Single-Phase Viscosity vs Pressure (falling-body viscometer).
   Mounted ONLY by the Single-Phase Viscosity workspace in screens/showViscTest.js.
   Own state, own stages, own reset — nothing shared with the other tests.

   Connected system:
     transfer pump --water--> SPS/PDS water side (below the floating piston)
     SPS/PDS sample side --oil--> bottle valve --> BOTTOM inlet of the viscometer
     viscometer 3 cc chamber (falling body) --> TOP outlet --> BLEED VALVE (seated on the
     top outlet port) --> waste.  PT on a side port of the chamber passage.   Oil always moves bottom -> top through the device.

   Sequence (9 navigable stages):
     1 Connect & Fill          SPS/PDS is already at 5,500 psig (pump holds it). Lines made up,
                               bottle valve opens, oil fills line + 3 cc chamber (bleed CLOSED);
                               the viscometer equalizes with the bottle -> PT reads 5,500 psig
                               as soon as sample enters it (not tied to % filled)
     2 Flush 15 cc             bleed opens, pump holds 5,500 psig, 15 cc flushed, bleed closes,
                               pump stops, bottle valve closes (viscometer isolated at 5,500)
     3 Measure 5,500           driving coil lifts the body, it falls, sensing coil times it
     4-8 Reduce · 5,000 … 3,000  bleed valve throttled -> pressure released DOWN 500 psig,
                               bleed closed, pressure stable, measurement
     9 Results                 six (P, mu) pairs, pressure–viscosity curve
   The viscometer has no piston of its own, so it can only go from high to low pressure;
   the pump is never used to repressurize between points.

   DATA SOURCES (no new laboratory values are invented here):
     test temperature, Psat and mu at Psat  -> window.PVT_REPORT (data/report-data.js)
     mu(P) above Psat -> Vasquez-Beggs undersaturated relation from mu at Psat — the same
                        relation that produced the report's viscosity table (5,000–3,000 psig
                        match the report exactly; 5,500 psig is the same relation extended)
     mu = K x t, K = 1.50 cP/s -> calibration used by components/StageVisc.js (medium crude)
     => values are ILLUSTRATIVE (correlation-based), not measured data.
   ILLUSTRATIVE geometry only: bottle 100 cc oil, line volumes, C_EFF (piston travel).
   ========================================================================= */
(function () {
'use strict';

/* ---------------- configuration ---------------- */
const PTS = [5500, 5000, 4500, 4000, 3500, 3000];   // psig, measurement order (high -> low)
const CHAMBER_CC = 3.0, FLUSH_CC = 15.0;             // given
const K_CAL = 1.50;                                  // cP/s  (StageVisc.js, medium crude)
const BOTTLE_CAP = 160, BOTTLE_OIL0 = 100;           // cc (illustrative)
const LINE_IN_CC = 0.60, STUB_CC = 0.20, TAIL_CC = 0.20;  // cc (illustrative)
const C_EFF = 1.0e-5;                                // 1/psi (illustrative, piston travel only)
const PSI_KPA = 6.894757, ATM = 14.696;

const REP = window.PVT_REPORT || {};
const TEST_T = REP.header && REP.header.test_t_C ? REP.header.test_t_C : 114.4444;
const PSAT_PSIA = REP.flash && REP.flash.psat ? REP.flash.psat / PSI_KPA : 2514.696;
const PSAT_G = PSAT_PSIA - ATM;
const MU_SAT = (function () { const v = (REP.visc || []).filter(r => r.tag === 'Sp')[0]; return v ? v.mu : 4.80; })();
function muVB(psig) {                     // Vasquez-Beggs undersaturated oil viscosity
  const p = psig + ATM, m = 2.6 * Math.pow(p, 1.187) * Math.exp(-11.513 - 8.98e-5 * p);
  return MU_SAT * Math.pow(p / PSAT_PSIA, m);
}
/* fall time the device would record, and the viscosity reported from it (mu = K x t) */
const RES = PTS.map(p => { const t = Math.round(muVB(p) / K_CAL * 100) / 100; return { p, t, mu: K_CAL * t }; });
const BOTTLE_P = PTS[0];                           // SPS/PDS is held at 5,500 psig before injection

/* ---------------- geometry (svg units) ---------------- */
/* The bench layout is drawn in WORLD units (svg viewBox).
   The viscometer internals keep their original LOCAL coordinates (chamber axis x = 620,
   bore y 222–472). The whole instrument (housing, chamber, body, valve, fittings) is one
   rigid assembly that ROTATES ABOUT ITS BOTTOM HINGE PIN (local PIN) fixed at world PIV:
      world = translate(PIV) · rotate(incl) · scale(DEV_S) · translate(-PIN)
   incl = inclination from vertical (deg), set by the demonstration slider. */
const DEV_S = 0.70;
const PIN = [578, 596];                           // hinge pin on the instrument rail (local)
const PIV = [460, 447];                           // hinge pin on the fixed base bracket (world) — low clevis: the instrument sits right on the base plate (rail clears the plate at every angle)
const INCL0 = 32;                                 // initial inclination — resembles the reference photograph
const INCL_MIN = 0, INCL_MAX = 90;                // DEMONSTRATION range only (not a manufacturer specification)
/* the upper end tilts to the LEFT (away from the SPS/PDS bottle on the right):
   rotation angle in the drawing = -incl */
const CLAMP_L = [578, 200];                       // rail point that rides on the arc guide (local)
const ARC_R = (PIN[1] - CLAMP_L[1]) * DEV_S;      // arc guide radius, centred on the hinge pin
const r1 = v => Math.round(v * 10) / 10;
function mkW(th) {
  const a = th * Math.PI / 180, c = Math.cos(a), n = Math.sin(a);
  return (x, y) => { const dx = (x - PIN[0]) * DEV_S, dy = (y - PIN[1]) * DEV_S; return [r1(PIV[0] + dx * c - dy * n), r1(PIV[1] + dx * n + dy * c)]; };
}
const devT = th => `translate(${PIV[0]},${PIV[1]}) rotate(${r1(th)}) scale(${DEV_S}) translate(${-PIN[0]},${-PIN[1]})`;
const arcPt = (th, rr) => { const a = th * Math.PI / 180, R = rr || ARC_R; return [r1(PIV[0] + R * Math.sin(a)), r1(PIV[1] - R * Math.cos(a))]; };

/* SPS/PDS bottle = the approved Oil Sample Bottle, placed as on the charging page (screens/showTest.js):
   centre (565.3, 330), scale 0.41, bore -226..226 (local units) with a 46-unit floating piston; the
   sample-valve side outlet ends on the riser (585, 214.8), the driving-side outlet at (585, 445.2).
   Whole rig shifted by RIG_DX / RIG_DY */
const BOT = { iy: -226, ih: 452, pist: 46 }, BOT_C = [565.3, 330], BOT_S = 0.41;
const RIG_DX = 255, RIG_DY = -40;              // bottle rig on the RIGHT of the bench
const BTX = x => r1(585 + (x - 585) * 0.6 + RIG_DX), BTY = y => r1(474 + (y - 474) * 0.74 + RIG_DY);
const PX_CC = (BOT.ih - BOT.pist) / BOTTLE_CAP;
const BORE = { x: 608, y: 222, w: 24, h: 250 };
const B_REST = 356, B_TOP = 240;                 // falling-body top edge: bottom stop / top stop (local)
const SENSE = [338, 430];                        // sensing-coil zone (local y)
/* world flow paths */
const IN_X = 728;                                // riser of the sample line (between the viscometer sweep and the bottle rig)
const IN_TOP = 22;                               // overhead run of the sample line (bottle -> riser)
const BOT_CX = 585 + RIG_DX;                     // bottle axis (world x)
const P_ST = [[620, 222], [620, 150]];             // chamber -> top port = bleed-valve seat (local)
const WASTE = { x: 30, y: 66, w: 52, h: 88, cap: 25 };    // waste collection glass, top-left (cc scale illustrative)
const TAIL_Y = 22, WASTE_CX = WASTE.x + WASTE.w / 2;
const WASTE_MARKS = [5, 10, 15, 20].map(c => { const y = r1(WASTE.y + WASTE.h - 4 - WASTE.h * 0.86 * c / WASTE.cap); return `<line x1="${WASTE.x + WASTE.w - 14}" y1="${y}" x2="${WASTE.x + WASTE.w - 4}" y2="${y}"></line>`; }).join('');
const dOf = pts => 'M' + pts.map(p => p[0] + ',' + p[1]).join(' L');
const lenOf = pts => { let L = 0; for (let k = 1; k < pts.length; k++) L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); return L; };
function ptAt(pts, f) {
  let tgt = lenOf(pts) * Math.max(0, Math.min(1, f));
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (tgt <= l || k === pts.length - 1) { const u = l ? Math.min(1, tgt / l) : 0; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }
    tgt -= l;
  }
  return pts[pts.length - 1];
}
/* tubing is bent, not mitred: each corner becomes a smooth arc (sampled so the oil front
   position — ptAt() — follows exactly the drawn tube) */
function roundPts(pts, r) {
  const out = [pts[0]];
  for (let k = 1; k < pts.length - 1; k++) {
    const a = pts[k - 1], b = pts[k], c = pts[k + 1];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const p1 = [b[0] - (b[0] - a[0]) / l1 * rr, b[1] - (b[1] - a[1]) / l1 * rr];
    const p2 = [b[0] + (c[0] - b[0]) / l2 * rr, b[1] + (c[1] - b[1]) / l2 * rr];
    for (let j = 0; j <= 8; j++) {
      const u = j / 8, v = 1 - u;
      out.push([r1(v * v * p1[0] + 2 * v * u * b[0] + u * u * p2[0]), r1(v * v * p1[1] + 2 * v * u * b[1] + u * u * p2[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const D_ST = dOf(P_ST);
const C_W = `M${712 + RIG_DX},${458 + RIG_DY} H${640 + RIG_DX} V${445.2 + RIG_DY} H${585 + RIG_DX}`;   // pump (right of the bottle, mirrored drawing) -> driving-side valve outlet
function arrowD(x, y, dir) {
  const s = 7.5, a = (dir === 'r' ? 0 : dir === 'd' ? 90 : dir === 'u' ? -90 : dir === 'l' ? 180 : dir) * Math.PI / 180;
  const c = Math.cos(a), n = Math.sin(a);
  const P = (u, v) => r1(x + u * c - v * n) + ',' + r1(y + u * n + v * c);
  return `M${P(-s, -s)} L${P(s, 0)} L${P(-s, s)} Z`;
}
const fmtP = v => Math.round(v).toLocaleString('en-US');

const STAGES = [
  { name: 'Connect & Fill', btn: 'Connect & Fill Chamber' },
  { name: 'Flush 15 cc', btn: 'Flush 15 cc' },
  { name: 'Measure 5,500', btn: 'Measure at 5,500 psig' }
].concat(PTS.slice(1).map(p => ({ name: 'Reduce · ' + fmtP(p), btn: 'Reduce to ' + fmtP(p) + ' & Measure' })))
 .concat([{ name: 'Results', btn: 'Show Results' }]);
const NS = STAGES.length;          // 9
const MSG = i => i === 0 ? 'SPS/PDS bottle at 5,500 psig; viscometer on the bench — lines not connected. Chamber evacuated and EMPTY. All valves CLOSED.'
  : i === 1 ? 'Chamber full (3 cc) at 5,500 psig — equalized with the bottle. Bleed valve CLOSED. Flush 15 cc through the top outlet.'
  : i === 2 ? 'Loaded: chamber full at 5,500 psig, bleed CLOSED, bottle valve CLOSED (viscometer isolated). Ready for point 1.'
  : i < NS - 1 ? 'Point ' + (i - 2) + ' recorded at ' + fmtP(PTS[i - 3]) + ' psig. Next: release pressure to ' + fmtP(PTS[i - 2]) + ' psig through the top bleed valve, then measure.'
  : 'All six points measured (5,500 → 3,000 psig). Show the pressure–viscosity result.';

let SAVED = null;

/* state at the START of stage i — rebuilds fill, valves, pressure and completed points */
function snapshot(i) {
  const filled = i >= 1, loaded = i >= 2;
  const n = i <= 2 ? 0 : (i >= NS - 1 ? 6 : i - 2);
  return {
    cur: i, done: STAGES.map((_, k) => k < i), busy: false, auto: false, paused: false, complete: false,
    conn: filled ? [1, 1, 1] : [0, 0, 0], connHot: -1,
    vB: i === 1 ? 1 : 0, bTxt: i === 1 ? 'OPEN' : (loaded ? 'CLOSED' : 'CLOSED'),
    vL: 0, lTxt: 'CLOSED',
    vIn: filled ? LINE_IN_CC : 0, vCh: filled ? CHAMBER_CC : 0, vSt: filled ? STUB_CC : 0, vTail: loaded ? TAIL_CC : 0,
    pumped: filled ? LINE_IN_CC + CHAMBER_CC + STUB_CC + (loaded ? TAIL_CC + FLUSH_CC : 0) : 0,
    flush: loaded ? FLUSH_CC : 0, flushing: false,
    P: i === 0 ? null : i === 1 ? BOTTLE_P : (n === 0 ? PTS[0] : PTS[Math.min(5, n - 1)]),
    pStage: i === 0 ? 'none' : i === 1 ? 'equal' : 'stable',
    pump: i === 1 ? 'hold' : 'off', pumpUsed: filled,
    flowIn: false, flowUp: false, flowTail: false, pumpFlow: false,
    body: B_REST, drive: false, falling: false, sense: false,
    tRun: null, measuring: -1, meas: RES.slice(0, n), newest: -1,
    msg: MSG(i)
  };
}

class Component extends DCLogic {
  state = Object.assign(snapshot(0), { showComp: false, resTab: 'graph', incl: INCL0 });   // view options only (incl = demo inclination, not used in mu)   // showComp / resTab = view options only

  /* ---------- paused-aware process clock (same pattern as StageViscKin) ---------- */
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

  /* results graph is drawn in true pixels: its viewBox follows the host size (text never shrinks) */
  gHost = { current: null }; gRO = null;
  watchGraph() {
    const el = this.gHost.current;
    if (!el || this.gRO || typeof ResizeObserver === 'undefined') return;
    this.gRO = new ResizeObserver(() => {
      const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight);
      if (w > 0 && h > 0 && (w !== this.state.gw || h !== this.state.gh)) this.setState({ gw: w, gh: h });
    });
    this.gRO.observe(el);
  }
  componentDidUpdate() { this.watchGraph(); }
  componentDidMount() {
    requestAnimationFrame(() => this.watchGraph());
    const sv = SAVED; if (!sv) return;
    this.setState(snapshot(sv.cur));
    if (sv.complete) this.setState({ done: STAGES.map(() => true), complete: true, msg: 'Test complete — six pressure–viscosity points from 5,500 to 3,000 psig.' });
  }
  componentWillUnmount() { if (this.gRO) { this.gRO.disconnect(); this.gRO = null; } this.stopAll(); SAVED = { cur: this.state.cur, complete: this.state.complete }; }
  status(s) { if (this.props.onStatus) this.props.onStatus(s); }

  /* ---------- navigation ---------- */
  goStage(i) {
    i = Math.max(0, Math.min(NS - 1, i));
    this.stopAll();
    this.setState(snapshot(i));
    this.status(i === 0 ? 'Not Started' : 'In Progress');
  }
  finish(i, msg, extra) {
    const done = this.state.done.slice(); done[i] = true;
    const last = i === NS - 1;
    this.setState(Object.assign({ done, busy: false, cur: last ? i : i + 1, msg }, extra || {}));
    if (last) return;
    if (this.state.auto) this.wait(1600, () => this.run(i + 1));
  }
  run(i) {
    const st = this.state;
    if (st.busy || st.paused || st.complete) return;
    if (i !== st.cur || st.done[i]) return;
    this.status('In Progress');
    this.setState({ busy: true, newest: -1 });
    if (i === 0) this.sFill();
    else if (i === 1) this.sFlush();
    else if (i === 2) this.sMeasure(0, 2);
    else if (i < NS - 1) this.sReduce(i - 2, i);
    else this.sResults();
  }

  /* 1 — connect, open bottle valve, pump fills the line and the 3 cc chamber bottom -> top */
  sFill() {
    const names = ['transfer pump → SPS/PDS water side', 'SPS/PDS sample outlet → viscometer BOTTOM inlet', 'viscometer TOP outlet → bleed valve → waste line'];
    const step = k => {
      if (k > 2) {
        this.setState({ connHot: -1, bTxt: 'OPENING', msg: 'Lines connected. Opening the bottle valve — the bottle (5,500 psig) opens to the line; bleed valve stays CLOSED.' });
        this.tw(900, e => this.setState({ vB: e }), () => {
          this.setState({ bTxt: 'OPEN', pump: 'run', pumpUsed: true, pumpFlow: true, flowIn: true,
            msg: 'Pump holding 5,500 psig on the water side — the floating piston rises and oil moves through the line to the viscometer bottom inlet.' });
          const p0 = this.state.pumped;
          this.tw(4000, e => this.setState({ vIn: LINE_IN_CC * e, pumped: p0 + LINE_IN_CC * e }), () => {
            this.setState({ flowUp: true, P: BOTTLE_P, pStage: 'equal', msg: 'Sample entering the viscometer (bleed CLOSED) — pressure equalizes with the bottle at 5,500 psig; the chamber fills from the BOTTOM.' });
            this.tw(5000, e => this.setState({ vCh: CHAMBER_CC * e, pumped: p0 + LINE_IN_CC + CHAMBER_CC * e }), () => {
              this.setState({ msg: 'Chamber full (3 cc). Oil rises into the top outlet and STOPS at the closed bleed valve.' });
              this.tw(900, e => this.setState({ vSt: STUB_CC * e, pumped: p0 + LINE_IN_CC + CHAMBER_CC + STUB_CC * e }), () => {
                this.finish(0, 'Chamber full — 3 cc at 5,500 psig, oil held at the CLOSED bleed valve. Pump holding pressure.',
                  { pump: 'hold', pumpFlow: false, flowIn: false, flowUp: false });
              }, true);
            }, true);
          }, true);
        });
        return;
      }
      this.setState({ connHot: k, msg: 'Connecting ' + names[k] + '…' });
      this.tw(1100, e => { const c = this.state.conn.slice(); c[k] = e; this.setState({ conn: c }); }, () => step(k + 1));
    };
    step(0);
  }
  /* 2 — flush 15 cc at 5,500 psig (pump holds pressure), close bleed, stop pump, isolate */
  sFlush() {
    this.setState({ P: BOTTLE_P, pStage: 'hold', pump: 'hold', pumpFlow: false, lTxt: 'OPENING', msg: 'Opening the top bleed valve — the pump holds 5,500 psig.' });
    this.tw(900, e => this.setState({ vL: e }), () => {
        const p1 = this.state.pumped;
        this.setState({ lTxt: 'OPEN', pump: 'run', pumpFlow: true, flowIn: true, flowUp: true, flowTail: true, flushing: true });
        this.tw(5000, e => {
          const fl = FLUSH_CC * e;
          this.setState({ flush: fl, vTail: Math.min(TAIL_CC, fl), pumped: p1 + TAIL_CC * Math.min(1, e * 8) + fl,
            msg: 'Flushing at 5,500 psig — fresh oil in at the bottom, up through the chamber, out of the top outlet: ' + fl.toFixed(1) + ' / 15 cc.' });
        }, () => {
          this.setState({ flushing: false, flowIn: false, flowUp: false, flowTail: false, pumpFlow: false, pump: 'hold', lTxt: 'CLOSING',
            msg: '15 cc flushed (5 × chamber volume). Closing the bleed valve…' });
          this.tw(900, e => this.setState({ vL: 1 - e }), () => {
            this.setState({ lTxt: 'CLOSED', pump: 'off', bTxt: 'CLOSING', msg: 'Pump stopped. Closing the bottle valve — the viscometer is isolated at 5,500 psig.' });
            this.tw(900, e => this.setState({ vB: 1 - e }), () => {
              this.finish(1, 'Loaded: 3 cc chamber full at 5,500 psig, bleed and bottle valves CLOSED. Ready for point 1.', { bTxt: 'CLOSED', pStage: 'stable' });
            });
          });
        }, true);
      });
  }
  /* falling-body measurement at point k (existing coil logic: drive up, fall, sense, mu = K x t) */
  sMeasure(k, stage) {
    const R = RES[k];
    this.setState({ measuring: k, drive: true, tRun: null,
      msg: 'Point ' + (k + 1) + ' · ' + fmtP(R.p) + ' psig — driving coil energized, lifting the falling body to the top stop…' });
    this.tw(2400, e => this.setState({ body: B_REST + (B_TOP - B_REST) * e }), () => {
      this.setState({ drive: false, falling: true, tRun: 0, msg: 'Driving coil OFF — the body falls through the oil; the sensing coil times its travel.' });
      this.tw(R.t * 1000, e => {
        const y = B_TOP + (B_REST - B_TOP) * e, tip = y + 98;
        this.setState({ body: y, tRun: R.t * e, sense: tip > SENSE[0] && tip < SENSE[1] + 20 });
      }, () => {
        const meas = this.state.meas.concat([R]);
        this.setState({ falling: false, sense: false, tRun: R.t, measuring: -1, meas, newest: k,
          msg: 'Point ' + (k + 1) + ' recorded: t = ' + R.t.toFixed(2) + ' s → μ = K × t = ' + K_CAL.toFixed(2) + ' × ' + R.t.toFixed(2) + ' = ' + R.mu.toFixed(2) + ' cP at ' + fmtP(R.p) + ' psig.' });
        this.wait(1400, () => this.finish(stage, this.state.msg));
      }, true);
    });
  }
  /* reduce pressure 500 psig through the top bleed valve (throttled), close, stabilize, measure */
  sReduce(k, stage) {
    const Pa = PTS[k - 1], Pb = PTS[k];
    this.setState({ lTxt: 'OPENING', pStage: 'release', msg: 'Cracking the top bleed valve — controlled release from ' + fmtP(Pa) + ' psig. Pump stays OFF.' });
    this.tw(800, e => this.setState({ vL: .4 * e }), () => {
      this.setState({ lTxt: 'THROTTLED', flowTail: true, msg: 'Releasing pressure through the top outlet: a few hundredths of a cc leave — the chamber stays full.' });
      this.tw(4200, e => this.setState({ P: Pa + (Pb - Pa) * e }), () => {
        this.setState({ P: Pb, flowTail: false, lTxt: 'CLOSING', msg: fmtP(Pb) + ' psig reached. Closing the bleed valve…' });
        this.tw(800, e => this.setState({ vL: .4 * (1 - e) }), () => {
          this.setState({ vL: 0, lTxt: 'CLOSED', pStage: 'settle', msg: 'Bleed valve CLOSED — confirming the pressure is stable at ' + fmtP(Pb) + ' psig…' });
          this.wait(1500, () => { this.setState({ pStage: 'stable' }); this.sMeasure(k, stage); });
        });
      });
    });
  }
  sResults() {
    this.setState({ msg: 'Compiling the pressure–viscosity result…' });
    this.wait(900, () => {
      this.finish(NS - 1, 'Test complete — viscosity decreases steadily as pressure is lowered from 5,500 to 3,000 psig (all above Psat).', { complete: true, auto: false });
      this.status('Completed');
    });
  }

  runAll() { const st = this.state; if (st.busy || st.complete) return; this.setState({ auto: true }); this.run(st.cur); }
  /* ---- shared procedure panel (ProcCtl.js): stages use the existing snapshot navigation (goStage) ---- */
  pcRunning() { const st = this.state; return !!st.busy || this.waits.length > 0 || (!!st.auto && !st.complete); }
  pcInfo() {
    const st = this.state, N = NS, k = Math.max(0, Math.min(N - 1, st.cur));
    return { N, k, unit: 'Step', title: STAGES[k].name, q: st.msg || '',
      status: st.paused ? 'paused' : this.pcRunning() ? 'running' : st.complete ? 'complete' : 'ready',
      allDone: !!st.complete, frac: null, doneMask: (st.done || []).slice(),
      canPrev: k > 0, canNext: k < N - 1, canRestart: !!(st.busy || st.paused || st.complete || this.jobs.length || (st.done || [])[k]),
      runLabel: STAGES[k].btn, runAll: 'Run Full Procedure', runAllDisabled: !!(st.busy || st.complete || st.auto),
      again: 'Run Test Again', reset: 'Reset Single-Phase Test', resetDisabled: false };
  }
  pcAct(a) {
    const st = this.state, N = NS, k = Math.max(0, Math.min(N - 1, st.cur));
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
    const st = this.state, live = st.busy || this.jobs.length;
    if (!live && !st.paused) return;
    this.setState({ paused: !st.paused });
    if (!this.state.paused) { this.last = performance.now(); this.ensureLoop(); }
  }
  reset() { this.goStage(0); }

  /* ---------- live text for the Explain panel (read by StepGuide) ---------- */
  guide(V) {
    const st = this.state, i = st.cur, busy = st.busy;
    const last = st.meas.length ? st.meas[st.meas.length - 1] : null;
    let t, d, w, e, o;
    if (i === 0) {
      t = 'Step 1 · Connect & fill the 3 cc chamber';
      d = 'The SPS/PDS bottle is already at 5,500 psig, held by the transfer pump on the water side. Opening the bottle valve lets oil flow through the line into the BOTTOM inlet of the evacuated viscometer, filling the 3 cc chamber from bottom to top. With the bleed valve closed, the viscometer equalizes with the bottle at 5,500 psig as soon as sample enters it.';
      w = 'Filling from the bottom lets the rising oil sweep the chamber, so the falling body ends up completely surrounded by liquid. No separate pressurization is needed — the sample stays at its single-phase pressure throughout.';
      e = 'Piston rising in the bottle, oil front travelling along the line, level rising in the chamber; PT reading 5,500 psig once sample enters.'; o = 'Oil stops at the CLOSED bleed valve on the top outlet; pressure stays at 5,500 psig.';
    } else if (i === 1) {
      t = 'Step 2 · Flush 15 cc at 5,500 psig';
      d = 'The top bleed valve is opened while the pump holds 5,500 psig, and 15 cc (5 × chamber volume) is flushed out through the top outlet. Then the bleed valve is closed, the pump stopped and the bottle valve closed — the viscometer is isolated at 5,500 psig.';
      w = 'The flush replaces the first oil that met the evacuated lines with representative sample. Loading at the HIGHEST pressure is required because the viscometer has no piston of its own — once isolated its pressure can only be lowered.';
      e = 'Continuous flow bottom → top → bleed valve at constant 5,500 psig.'; o = 'Pressure staying at 5,500 psig during the flush; valves closing in order: bleed, then bottle.';
    } else if (i < NS - 1) {
      const k = i - 2, R = RES[k];
      t = 'Step ' + (i + 1) + ' · Point ' + (k + 1) + ' of 6 · ' + fmtP(R.p) + ' psig';
      d = (k === 0 ? 'At 5,500 psig the driving coil lifts the falling body to its top stop and releases it. ' :
        'The top bleed valve is cracked to release pressure smoothly from ' + fmtP(PTS[k - 1]) + ' to ' + fmtP(R.p) + ' psig, closed, and the pressure is confirmed stable. Then the driving coil lifts the body and releases it. ') +
        'The sensing coil detects the body’s travel; the fall time t gives μ = K × t.';
      w = 'Viscosity is measured in a static, single-phase liquid at a known, stable pressure. All six pressures are above Psat (' + fmtP(PSAT_G) + ' psig), so no gas comes out of solution. Pressure only goes DOWN between points — the pump is not used again.';
      e = 'Bleed valve throttled then closed; falling body lifted and falling inside the chamber.'; o = 'The fall time — and the viscosity — decreasing at each lower pressure.';
    } else {
      t = 'Step 9 · Pressure–viscosity result';
      d = 'Six points from 5,500 to 3,000 psig define the undersaturated viscosity curve at ' + TEST_T.toFixed(1) + ' °C.';
      w = 'Above the bubble point, lowering pressure lets the liquid expand slightly, so its viscosity falls. The curve is reported with Psat (' + fmtP(PSAT_G) + ' psig, ' + MU_SAT.toFixed(2) + ' cP).';
      e = 'None — static.'; o = 'A smooth, near-linear decrease of μ with decreasing pressure.';
    }
    const dash = '—';
    return {
      title: 'Single-Phase Viscosity — ' + t,
      tag: st.paused ? 'PAUSED' : (busy ? 'RUNNING · ' : '') + 'STEP ' + (i + 1) + ' / ' + NS,
      busy: busy && !st.paused, d, w, e, o,
      vals: [
        V('Pressure', st.P == null ? dash : fmtP(st.P), st.P == null ? '' : 'psig'),
        V('Temperature', TEST_T.toFixed(1), '°C'),
        V('Points', st.meas.length + ' / 6', ''),
        V('Last μ', last ? last.mu.toFixed(2) : dash, last ? 'cP' : '')
      ]
    };
  }

  renderVals() {
    const st = this.state, i = st.cur, busy = st.busy;

    /* bottle */
    const oilH = (BOTTLE_OIL0 - st.pumped) * PX_CC, pistY = BOT.iy + oilH, waterY = pistY + BOT.pist;
    /* fluid */
    const fIn = st.vIn / LINE_IN_CC, fSt = st.vSt / STUB_CC, fTl = st.vTail / TAIL_CC;
    const gm = geo(st.incl == null ? INCL0 : st.incl);             // instrument geometry at the current inclination
    const inclTxt = (Math.round(gm.th * 2) / 2).toFixed(Number.isInteger(Math.round(gm.th * 2) / 2) ? 0 : 1) + '°';   // same value as the drawing
    const front = ptAt(gm.P_INR, fIn), frontSt = ptAt(P_ST, fSt), frontTl = ptAt(gm.P_TAILR, fTl);
    const fCh = Math.min(1, st.vCh / CHAMBER_CC);
    const chLvl = gm.low - (gm.low - gm.high) * fCh;         // world y of the horizontal oil surface
    const wasteCC = st.flush + 0.02 * Math.max(0, st.meas.length - 1);   // 15 cc flush + tiny bleed releases (illustrative)
    const wasteH = WASTE.h * 0.86 * Math.min(1, wasteCC / WASTE.cap);

    const tagOf = txt => {
      const open = txt === 'OPEN' || txt === 'OPENING' || txt === 'THROTTLED';
      const col = txt === 'THROTTLED' ? '#f0913f' : open ? '#46d39a' : txt === 'CLOSING' ? '#f0c574' : '#e0564f';
      return { text: txt, fill: 'rgba(0,0,0,0)', stroke: col, color: col };
    };
    const tB = tagOf(st.bTxt), tL = tagOf(st.lTxt);

    const A = (x, y, dir, on, col) => ({ d: arrowD(x, y, dir), col, style: 'opacity:' + (on ? 1 : 0) + '; transition:opacity .4s ease;' });
    const upOn = st.flowUp && st.vCh >= CHAMBER_CC;
    const IN_MX = (IN_X + gm.IN_A[0]) / 2, UPA = gm.UPA;
    /* arrows follow the tubing route: bottle top -> overhead run (leftwards) -> riser (down) ->
       viscometer bottom inlet (leftwards) -> up the chamber -> top outlet -> waste run (leftwards) -> glass */
    const arrows = [
      A(BOT_CX, 50, 'u', st.flowIn && fIn > .01, '#ffcf3f'),
      A(r1((BOT_CX + IN_X) / 2), IN_TOP, 'l', st.flowIn && fIn > .1, '#ffcf3f'),
      A(IN_X, 230, 'd', st.flowIn && fIn > .4, '#ffcf3f'),
      A(r1(IN_MX), gm.IN_A[1], 'l', st.flowIn && fIn > .78, '#ffcf3f'),
      A(r1(UPA[0]), r1(UPA[1]), gm.AXUP, upOn || st.flowTail, '#ffcf3f'),
      A(gm.TAIL_MX, TAIL_Y, 'l', st.flowTail && fTl > .5, '#ffcf3f'),
      A(WASTE_CX, 44, 'd', st.flowTail && fTl > .9, '#ffcf3f'),
      A(r1((712 + 585) / 2 + RIG_DX + 20), 458 + RIG_DY, 'l', st.pumpFlow, '#46e0ff')
    ];

    const chips = STAGES.map((s, k) => {
      const dn = st.done[k], on = (k === i && !st.complete) || (st.complete && k === NS - 1);
      return { n: dn && !on ? '✓' : String(k + 1), title: 'Step ' + (k + 1) + ' · ' + s.name, onClick: () => this.goStage(k),
        style: 'width:30px; height:30px; flex:0 0 auto; border-radius:50%; cursor:pointer; font-family:inherit; font-size:12.5px; font-weight:700; display:flex; align-items:center; justify-content:center; padding:0; transition:all .2s; ' +
          (on ? 'background:var(--blue); color:#fff; border:none; box-shadow:0 0 0 4px rgba(47,111,208,.22);'
              : dn ? 'background:rgba(29,138,90,.16); color:var(--grn); border:none;'
                   : 'background:transparent; color:var(--mut); border:1.5px solid var(--line2);') };
    });
    const bars = STAGES.slice(1).map((_, k) => ({ style: 'flex:1 1 6px; min-width:4px; max-width:22px; height:2px; border-radius:2px; background:' + (st.done[k] ? 'var(--grn)' : 'var(--line2)') + ';' }));

    const canRun = !busy && !st.paused && !st.complete && !st.done[i];
    const canAuto = !busy && !st.paused && !st.complete;
    const canPause = busy || st.paused || this.jobs.length > 0;
    const btnMain = on => 'font-family:inherit; font-size:14px; font-weight:600; white-space:nowrap; height:42px; padding:0 26px; border-radius:10px; cursor:' + (on ? 'pointer' : 'default') +
      '; background:' + (on ? 'linear-gradient(180deg,#46d39a,#2f9d72)' : 'var(--icard)') + '; border:1px solid ' + (on ? '#2f9d72' : 'var(--line2)') + '; color:' + (on ? '#06231a' : 'var(--mut)') + '; box-shadow:' + (on ? '0 4px 14px rgba(47,157,114,.28)' : 'none') + ';';
    const btnSub = (on, act) => 'height:36px; font-size:13px; opacity:' + (on || act ? 1 : .45) + '; cursor:' + (on || act ? 'pointer' : 'default') + ';' + (act ? ' border-color:var(--blue); color:var(--blue);' : '');

    /* pressure readout */
    const dash = '—';
    const ps = st.pStage;
    const pState = st.P == null ? 'NO READING' : ps === 'equal' ? 'EQUALIZED' : ps === 'zero' ? '≈ 0 psig' : ps === 'rising' ? 'RISING' : ps === 'hold' ? 'HELD BY PUMP' :
      ps === 'release' ? 'RELEASING ↓' : ps === 'settle' ? 'STABILIZING' : 'STABLE';
    const pCol = st.P == null ? 'var(--mut)' : ps === 'rising' ? 'var(--amb)' : ps === 'release' ? '#f0913f' : ps === 'settle' ? 'var(--blue)' : ps === 'zero' ? 'var(--blue)' : 'var(--grn)';
    const n = st.meas.length;
    const tgtTxt = i === 0 ? dash : i === 1 ? '5,500' : i === NS - 1 || st.complete ? fmtP(PTS[5]) : fmtP(PTS[Math.min(5, i - 2)]);
    const ptTxt = st.complete || n === 6 ? '6 / 6 complete' : i < 2 ? 'Loading' : 'Point ' + (i - 1) + ' / 6';

    /* measurement card */
    const kNow = st.measuring >= 0 ? st.measuring : -1;
    const lastM = n ? st.meas[n - 1] : null;
    const tTxt = st.tRun != null ? st.tRun.toFixed(2) : (lastM ? lastM.t.toFixed(2) : dash);
    const muTxt = kNow >= 0 ? (st.falling || st.drive ? '…' : dash) : (lastM ? lastM.mu.toFixed(2) : dash);
    const measTag = st.drive ? 'LIFTING' : st.falling ? 'TIMING' : kNow >= 0 ? '' : (lastM ? 'RECORDED' : 'IDLE');
    const measCol = st.drive ? 'var(--blue)' : st.falling ? 'var(--grn)' : lastM ? 'var(--amb)' : 'var(--mut)';

    /* graph: Pressure (psig) on x, Viscosity (cP) on y */
    const GW = Math.max(240, st.gw || 560), GH = Math.max(140, st.gh || 260);
    const G = { x0: 60, x1: GW - 16, y0: 12, y1: GH - 50 }, XMIN = 2750, XMAX = 5750;   // graph viewBox 0 0 GW GH (pixels)
    const mus = RES.map(r => r.mu), YMIN = Math.floor((Math.min.apply(null, mus) - .15) * 2) / 2, YMAX = Math.ceil((Math.max.apply(null, mus) + .15) * 2) / 2;
    const gx = p => G.x0 + (p - XMIN) / (XMAX - XMIN) * (G.x1 - G.x0), gy = m => G.y1 - (m - YMIN) / (YMAX - YMIN) * (G.y1 - G.y0);
    const xt = [3000, 3500, 4000, 4500, 5000, 5500].map(p => ({ x: gx(p).toFixed(1), lbl: fmtP(p) }));
    const yt = []; for (let m = YMIN; m <= YMAX + 1e-9; m += .5) yt.push({ y: gy(m).toFixed(1), ty: (gy(m) + 4.5).toFixed(1), lbl: m.toFixed(1) });
    const sorted = st.meas.slice().sort((a, b) => a.p - b.p);
    const isNew = k => k === n - 1 && st.newest >= 0;          // the point just recorded (graph + table highlight)
    const gpts = st.meas.map((r, k) => ({ cx: gx(r.p).toFixed(1), cy: gy(r.mu).toFixed(1), r: isNew(k) ? 8.5 : 6,
      fill: isNew(k) ? '#ffcf3f' : '#d6b03c' }));
    const nw = n && st.newest >= 0 ? st.meas[n - 1] : null;
    const newPt = nw ? { cx: gx(nw.p).toFixed(1), cy: gy(nw.mu).toFixed(1), lx: (gx(nw.p) - 12).toFixed(1), ly: (gy(nw.mu) - 16).toFixed(1), lbl: nw.mu.toFixed(2) + ' cP' } : null;
    const resOn = n > 0 || st.measuring >= 0;                   // results area appears when the first measurement starts
    const curP = st.P != null && st.P > 100 ? gx(Math.max(XMIN, Math.min(XMAX, st.P))) : null;

    const actK = busy && i >= 2 && i < NS - 1 && n < 6 ? n : -1;                  // point being reduced to / measured right now
    const rows = RES.slice(0, actK >= 0 ? n + 1 : n).map((r, k) => {
      const m = k < n, act = k === actK, nu = isNew(k);
      return { k: String(k + 1), p: fmtP(r.p), t: m ? r.t.toFixed(2) : (st.tRun != null && st.measuring === k ? st.tRun.toFixed(2) : '…'), mu: m ? r.mu.toFixed(2) : '…',
        style: 'display:grid; grid-template-columns:28px 1.2fr 1fr 1fr; align-items:center; gap:6px; padding:0 10px; border-radius:7px; transition:background .4s, box-shadow .4s; background:' +
          (nu ? 'rgba(255,207,63,.16)' : act ? 'rgba(47,111,208,.10)' : 'transparent') + '; box-shadow:' + (nu ? 'inset 3px 0 0 #ffcf3f' : act ? 'inset 3px 0 0 var(--blue)' : 'none') + '; color:' + (m ? 'var(--txt)' : 'var(--mut)') + ';' };
    });

    const tabS = on => 'font-family:inherit; font-size:12.5px; font-weight:600; padding:5px 14px; border-radius:7px; cursor:pointer; border:none; background:' + (on ? 'var(--panel)' : 'transparent') + '; color:' + (on ? 'var(--txt)' : 'var(--mut)') + '; box-shadow:' + (on ? '0 1px 3px rgba(0,0,0,.18)' : 'none') + ';';
    const pumpTxt = st.pump === 'run' ? 'RUNNING' : st.pump === 'hold' ? 'HOLD P' : 'OFF';
    const pumpCol = st.pump === 'run' ? '#46d39a' : st.pump === 'hold' ? '#4d9dff' : '#e0564f';
    const pill = (txt, col) => ({ txt, style: 'font-family:\'IBM Plex Mono\',monospace; font-size:9px; font-weight:700; letter-spacing:.6px; padding:2px 6px; border-radius:5px; color:' + col + '; border:1px solid ' + col + '; white-space:nowrap;' });
    const chamberLbl = st.vCh <= 0 ? (st.conn[1] >= 1 ? 'EVACUATED · EMPTY' : 'EMPTY') : st.vCh < CHAMBER_CC ? 'FILLING' : (st.flushing ? 'FULL · FLUSHING' : 'FULL');
    const dy = st.body - B_REST;

    /* ---- short instruction for the stage + short live action (derived from state only) ---- */
    const instr = st.complete ? 'Test complete — review the pressure–viscosity results.'
      : i === 0 ? 'Fill the chamber — connect the lines and open the bottle valve (bottle at 5,500 psig).'
      : i === 1 ? 'Flush 15 cc at 5,500 psig — open the bleed valve while the pump holds pressure.'
      : i === 2 ? 'Measure at 5,500 psig — lift the body and time its fall.'
      : i < NS - 1 ? 'Release pressure to ' + fmtP(PTS[i - 2]) + ' psig with the bleed valve, then measure.'
      : 'Show the pressure–viscosity results.';
    const Ptxt = st.P == null ? '' : fmtP(st.P) + ' psig';
    let live;
    if (st.paused) live = 'Paused';
    else if (!busy) {
      live = st.complete ? 'All 6 points recorded (5,500 → 3,000 psig).'
        : st.newest >= 0 && lastM ? 'Point ' + n + ' recorded — μ = ' + lastM.mu.toFixed(2) + ' cP at ' + fmtP(lastM.p) + ' psig.'
        : i === 1 ? 'Chamber full at 5,500 psig — equalized with the bottle, bleed valve closed.'
        : i === 2 ? 'Loaded at 5,500 psig — viscometer isolated.'
        : 'Ready — press “' + STAGES[i].btn + '”.';
    }
    else if (st.connHot >= 0) live = ['Connecting pump → bottle water side', 'Connecting bottle outlet → viscometer inlet', 'Connecting top outlet → bleed valve → waste'][st.connHot];
    else if (st.bTxt === 'OPENING') live = 'Opening the bottle valve';
    else if (st.bTxt === 'CLOSING') live = 'Closing the bottle valve — viscometer isolated';
    else if (st.drive) live = 'Driving coil lifts the body to the top stop';
    else if (st.falling) live = 'Body falling — sensing coil timing: ' + (st.tRun || 0).toFixed(2) + ' s';
    else if (st.flushing) live = 'Flushing at 5,500 psig — ' + st.flush.toFixed(1) + ' / 15 cc';
    else if (ps === 'rising') live = 'Pressurizing — ' + Ptxt;
    else if (ps === 'release') live = st.lTxt === 'THROTTLED' ? 'Releasing pressure — ' + Ptxt : 'Cracking the bleed valve';
    else if (st.lTxt === 'OPENING') live = 'Opening the bleed valve (pump holds 5,500 psig)';
    else if (st.lTxt === 'CLOSING') live = 'Closing the bleed valve';
    else if (ps === 'settle') live = 'Checking the pressure is stable at ' + Ptxt;
    else if (i === 0 && st.vSt > 0) live = 'Chamber full — oil stops at the closed bleed valve';
    else if (i === 0 && st.vCh > 0) live = 'Chamber filling from the bottom — pressure equalized at 5,500 psig';
    else if (i === 0 && st.flowIn) live = 'Bottle valve open — oil moving to the viscometer inlet';
    else if (st.measuring >= 0 || st.newest >= 0) live = lastM ? 'Point ' + n + ' recorded — μ = ' + lastM.mu.toFixed(2) + ' cP' : 'Measuring…';
    else live = 'Working…';

    /* ---- highlight only what the current step uses ---- */
    const INV = st.complete || i === NS - 1 ? 'pump bottle in tail coil ctl pdu vl'
      : i === 0 ? 'pump bottle in pdu' : i === 1 ? 'pump bottle in tail pdu vl' : i === 2 ? 'coil ctl pdu' : 'coil ctl pdu tail vl';
    const SOFT = { ctl: 1, pdu: 1 };   // electronics: only toned down, never 'disabled'
    const dim = key => INV.indexOf(key) >= 0 ? 'opacity:1; filter:none; transition:opacity .5s, filter .5s;'
      : SOFT[key] ? 'opacity:.82; filter:saturate(.45); transition:opacity .5s, filter .5s;' : 'opacity:.6; filter:saturate(.3); transition:opacity .5s, filter .5s;';
    const glow = on => 'opacity:' + (on ? 1 : 0) + '; transition:opacity .4s;';

    return {
      vsDevT: gm.T, vsBx0: gm.bx0, vsBw: r1(gm.bx1 - gm.bx0), vsBx1: gm.bx1,
      vsHose1: gm.HOSE1, vsHose2: gm.HOSE2, vsCabCoil: gm.CAB_COIL, vsCabPt100: gm.CAB_PT100, vsCabPt: gm.CAB_PT,
      vsInl: gm.INL, vsLch: gm.L.ch, vsLbody: gm.L.body, vsLdrive: gm.L.drive, vsLsense: gm.L.sense, vsLpt100: gm.L.pt100, vsLpt: gm.L.pt,
      vsVL: gm.VL, vsVLTag: { x: gm.VL.x, y: r1(gm.VL.y + 8), tx: r1(gm.VL.x + 40), ty: r1(gm.VL.y + 21) },
      vsClampT: 'translate(' + gm.CLAMP[0] + ',' + gm.CLAMP[1] + ') rotate(' + r1(-st.incl) + ')',
      vsAng: gm.ANG, vsAngTxt: inclTxt,
      vsTickLbls: ARC_TICKS.filter(k => k.t === 0 || k.t === 90).map(k => ({ x: k.x, y: k.y, t: k.t + '°', st: 'opacity:' + (Math.abs(k.t - gm.th) < 12 || (k.t === 0 && gm.th < 78) ? 0 : 1) + ';' }))   /* 0° tick label hidden while the tilted instrument's component leaders sweep past it (live badge shows the angle) */, vsRefOn: st.incl >= 3,
      vsIncl: String(st.incl), vsInclTxt: inclTxt, vsInclDis: busy,
      vsInclTip: busy ? 'Inclination is locked while a step is running' : 'Demonstration only — tilts the instrument about its fixed bottom hinge (0° vertical … 90° horizontal). Not used in the viscosity calculation.',
      vsInclIn: e => { if (this.state.busy) { e.target.value = this.state.incl; return; } this.setState({ incl: Math.max(INCL_MIN, Math.min(INCL_MAX, +e.target.value)) }); },
      vsInclRow: 'opacity:' + (busy ? .55 : 1) + ';',
      vsStages: chips, vsBars: bars,
      vsInstr: instr, vsLive: live, vsStepNo: 'STEP ' + (i + 1) + ' / ' + NS,
      vsDimPump: dim('pump'), vsDimBottle: dim('bottle'), vsDimIn: dim('in'), vsDimTail: dim('tail'), vsDimCoil: dim('coil'),
      vsDimCtl: dim('ctl'), vsDimPdu: dim('pdu'), vsDimVL: dim('vl'),
      vsGlowW: glow(st.pumpFlow), vsGlowIn: glow(st.flowIn), vsGlowTail: glow(st.flowTail),
      vsCompStyle: 'opacity:' + (st.showComp ? 1 : 0) + '; transition:opacity .3s; pointer-events:none;',
      vsComp: () => this.setState({ showComp: !this.state.showComp }), vsCompTxt: st.showComp ? 'Hide Components' : 'Show Components',
      vsCompBtn: 'flex:0 0 auto; height:36px; font-size:13px; padding:0 14px;' + (st.showComp ? ' border-color:var(--blue); color:var(--blue);' : ''),
      vsResEmpty: n === 0, vsResOn: resOn, vsVB: VB,
      vsSideStyle: 'flex:0 0 ' + (resOn ? 'calc(var(--vs-resw) + 12px)' : '0px') + '; min-width:0; overflow:hidden; display:flex; opacity:' + (resOn ? 1 : 0) +
        '; transition:flex-basis .75s cubic-bezier(.4,0,.2,1), opacity .5s ease ' + (resOn ? '.25s' : '0s') + ';', vsTabG: st.resTab === 'graph', vsTabT: st.resTab === 'table',
      vsTabGo: () => this.setState({ resTab: 'graph' }), vsTabTo: () => this.setState({ resTab: 'table' }),
      vsTabGS: tabS(st.resTab === 'graph'), vsTabTS: tabS(st.resTab === 'table'),
      vsPSub: i === 0 ? (st.P == null ? 'Viscometer — bottle at ' + fmtP(BOTTLE_P) + ' psig' : 'Equalized with the bottle') : (st.complete || n === 6 ? '6 of 6 points complete' : i < 2 ? 'Held at 5,500 psig by the pump (bottle valve open)' : 'Point ' + (i - 1) + ' of 6 · target ' + tgtTxt + ' psig'),
      vsMuSub: 't = ' + tTxt + (tTxt === dash ? '' : ' s') + '  ·  μ = K × t,  K = ' + K_CAL.toFixed(2) + ' cP/s',
      vsMsg: st.msg,
      vsMsgCol: st.paused ? 'var(--amb)' : busy ? 'var(--blue)' : st.complete ? 'var(--grn)' : 'var(--txt2)',
      vsMsgDot: 'width:7px; height:7px; flex:0 0 auto; border-radius:50%; background:' + (st.paused ? 'var(--amb)' : busy ? 'var(--blue)' : st.complete ? 'var(--grn)' : 'var(--mut2)') + ';' + (busy && !st.paused ? ' animation:vsBlink 1.1s ease-in-out infinite;' : ''),
      vsStepTag: st.paused ? 'PAUSED' : 'STEP ' + (i + 1) + ' / ' + NS,
      vsAnim: st.paused ? 'vs-paused' : '',

      vsCW: C_W, vsCIn: gm.C_IN, vsCOut: gm.D_TAIL,
      vsC0: (st.conn[0] * 1000).toFixed(1) + ' 1000', vsC1: (st.conn[1] * 1000).toFixed(1) + ' 1000', vsC2: (st.conn[2] * 1000).toFixed(1) + ' 1000',
      vsHot0: 'opacity:' + (st.connHot === 0 ? 1 : 0) + ';', vsHot1: 'opacity:' + (st.connHot === 1 ? 1 : 0) + ';', vsHot2: 'opacity:' + (st.connHot === 2 ? 1 : 0) + ';',
      vsWaterLine: 'opacity:' + (st.conn[0] >= 1 ? 1 : 0) + '; transition:opacity .4s;',
      vsWaterDash: 'opacity:' + (st.pumpFlow ? 1 : 0) + '; transition:opacity .3s;',

      vsOilH: f(oilH), vsPistY: f(pistY), vsWaterY: f(waterY), vsWaterH: f(Math.max(0, BOT.iy + BOT.ih - waterY)), vsPistLblY: r1(BOT_C[1] + BOT_S * (pistY + BOT.pist / 2) + RIG_DY),

      vsDIn: gm.D_IN, vsDSt: D_ST, vsDTail: gm.D_TAIL,
      vsIn: (fIn * 1000).toFixed(1) + ' 1000', vsSt: (fSt * 1000).toFixed(1) + ' 1000', vsTl: (fTl * 1000).toFixed(1) + ' 1000',
      vsInDash: 'opacity:' + (st.flowIn && fIn >= 1 ? 1 : 0) + '; transition:opacity .3s;',
      vsStDash: 'opacity:' + ((upOn && st.vL > .5) || st.flowTail ? 1 : 0) + '; transition:opacity .3s;',
      vsTlDash: 'opacity:' + (st.flowTail && fTl > 0 ? 1 : 0) + '; transition:opacity .3s;',
      vsTlSlow: st.flushing ? '' : 'vs-slow',
      vsFrontOn: fIn > 0 && fIn < 1, vsFx: f(front[0]), vsFy: f(front[1]),
      vsFrontStOn: fSt > 0 && fSt < 1, vsFsx: f(frontSt[0]), vsFsy: f(frontSt[1]),
      vsFrontTlOn: fTl > 0 && fTl < 1, vsFtx: f(frontTl[0]), vsFty: f(frontTl[1]),
      vsTeeOn: st.vSt >= STUB_CC,
      vsArrows: arrows,

      vsChY: f(chLvl), vsChH: f(fCh > 0 ? gm.low - chLvl + 6 : 0),
      vsChMen: fCh > 0.01 && fCh < 0.99, vsChMenY: f(chLvl),
      vsWasteY: f(WASTE.y + WASTE.h - 4 - wasteH), vsWasteH: f(wasteH), vsWasteTxt: wasteCC > 0 ? wasteCC.toFixed(1) + ' cc' : 'empty',
      vsDrip: st.flowTail && fTl >= 1, vsWasteOn: wasteCC > 0.05, vsPistDY: f(pistY - BOT.iy),
      vsHaloPump: 'opacity:' + (st.pump === 'run' ? .55 : st.pump === 'hold' ? .3 : 0) + '; transition:opacity .4s;',
      vsHaloVB: 'opacity:' + (st.bTxt === 'OPENING' || st.bTxt === 'CLOSING' || (st.bTxt === 'OPEN' && busy) ? .55 : 0) + '; transition:opacity .4s;',
      vsHaloVL: 'opacity:' + (st.lTxt !== 'CLOSED' ? .55 : 0) + '; transition:opacity .4s;',
      vsHaloCh: 'opacity:' + (st.drive || st.falling ? .5 : 0) + '; transition:opacity .4s;',
      vsHaloPT: 'opacity:' + (ps === 'rising' || ps === 'release' || ps === 'settle' ? .55 : 0) + '; transition:opacity .4s;',
      vsCtlT: st.tRun != null ? st.tRun.toFixed(2) : (lastM ? lastM.t.toFixed(2) : '--.--'),
      vsCtlMu: lastM && kNow < 0 ? lastM.mu.toFixed(2) : '--.--',
      vsCtlState: st.drive ? 'LIFT' : st.falling ? 'TIMING' : kNow >= 0 ? 'WAIT' : (lastM ? 'DONE' : 'READY'),
      vsCtlCol: st.drive ? '#4d9dff' : st.falling ? '#46d39a' : '#9fe0a8',
      vsBathT: TEST_T.toFixed(1),
      vsChArrows: 'opacity:' + (upOn ? 1 : 0) + '; transition:opacity .4s;',
      vsChLbl: chamberLbl, vsChLblCol: st.vCh >= CHAMBER_CC ? '#46d39a' : st.vCh > 0 ? '#ffcf3f' : 'var(--vs-lbl)',

      vsBodyT: 'translate(0,' + f(dy) + ')',
      vsDriveGlow: 'opacity:' + (st.drive ? .4 : 0) + '; transition:opacity .35s;',
      vsSenseGlow: 'opacity:' + (st.sense ? .4 : 0) + '; transition:opacity .2s;',
      vsDriveTxt: st.drive ? 'ENERGIZED' : '', vsSenseTxt: st.falling ? (st.sense ? 'SIGNAL' : 'LISTENING') : '',
      vsLiveCoil: 'opacity:' + (st.showComp ? 0 : 1) + '; transition:opacity .3s;',

      vsVBHot: 'opacity:' + st.vB + ';', vsBtlRingT: st.vB > .5 ? '#46d39a' : '#8fa3c2', vsBtlNeedleT: BottleArt.needle(st.vB), vsBtlRingB: st.conn[0] >= 1 ? '#46d39a' : '#8fa3c2', vsBtlNeedleB: BottleArt.needle(st.conn[0] >= 1 ? 1 : 0), vsVBWheel: 'transform:rotate(' + (st.vB * 90).toFixed(1) + 'deg); transform-box:fill-box; transform-origin:center;',
      vsVLHot: 'opacity:' + Math.min(1, st.vL * 1.6) + ';', vsVLWheel: 'transform:rotate(' + (st.vL * 90).toFixed(1) + 'deg); transform-box:fill-box; transform-origin:center;',
      vsTB: tB, vsTL: tL,

      vsPumpLcd: st.pumpUsed ? st.pumped.toFixed(2) : '--.--',
      vsPumpLed: pumpCol, vsPumpLedAnim: st.pump === 'run' && !st.paused ? 'animation:vsBlink .8s ease-in-out infinite;' : '',
      vsPumpState: pumpTxt,
      vsPtLcd: st.P == null ? '----' : fmtP(st.P),
      vsPtCol: st.P == null ? '#6b7a90' : '#ff4a3a',

      /* right panel */
      vsPTxt: st.P == null ? dash : fmtP(st.P), vsPUnit: st.P == null ? '' : 'psig', vsPState: pState, vsPCol: pCol,
      vsTgt: tgtTxt, vsTemp: TEST_T.toFixed(1), vsPsat: fmtP(PSAT_G), vsPtTxt: ptTxt,
      vsTTxt: tTxt, vsTUnit: tTxt === dash ? '' : 's', vsMuTxt: muTxt, vsMuUnit: muTxt === dash || muTxt === '…' ? '' : 'cP',
      vsMeasTag: measTag, vsMeasCol: measCol, vsK: K_CAL.toFixed(2),
      vsGHost: this.gHost, vsGBox: '0 0 ' + GW + ' ' + GH,
      vsG: { x0: G.x0, x1: G.x1, y0: G.y0, y1: G.y1, tx: G.x0 - 8, xl: G.y1 + 21, cx: r1((G.x0 + G.x1) / 2), cy: r1((G.y0 + G.y1) / 2), xt: GH - 8, yt: r1((G.y0 + G.y1) / 2) },
      vsYTitleT: 'rotate(-90 15 ' + r1((G.y0 + G.y1) / 2) + ')',
      vsXt: xt, vsYt: yt, vsGPts: gpts, vsNewOn: !!newPt, vsNew: newPt || { cx: 0, cy: 0, lx: 0, ly: 0, lbl: '' }, vsNPts: n + ' of 6 points',
      vsGLine: sorted.map(r => gx(r.p).toFixed(1) + ',' + gy(r.mu).toFixed(1)).join(' '),
      vsGLineOn: n >= 2,
      vsCurOn: curP != null, vsCurX: curP == null ? '0' : curP.toFixed(1),
      vsGEmpty: n === 0,
      vsRows: rows,

      vsPillB: pill('BOTTLE ' + st.bTxt, tB.color), vsPillL: pill('BLEED ' + st.lTxt, tL.color), vsPillP: pill('PUMP ' + pumpTxt, pumpCol),

      vsRun: () => this.run(i), vsRunText: st.complete ? 'Test Complete ✓' : busy ? (STAGES[i].name + '…') : STAGES[i].btn, vsRunStyle: btnMain(canRun), vsRunCls: '',
      vsAuto: () => this.runAll(), vsAutoText: st.auto && !st.complete ? 'Running Procedure…' : 'Run Full Procedure', vsAutoStyle: btnSub(canAuto, st.auto && !st.complete),
      vsPause: () => this.togglePause(), vsPauseText: st.paused ? 'Resume' : 'Pause', vsPauseStyle: btnSub(canPause, st.paused),
      vsPrev: () => { if (i > 0) this.goStage(i - 1); }, vsPrevStyle: 'opacity:' + (i > 0 ? 1 : .4) + '; cursor:' + (i > 0 ? 'pointer' : 'default') + ';',
      vsNext: () => { if (i < NS - 1) this.goStage(i + 1); }, vsNextStyle: 'opacity:' + (i < NS - 1 ? 1 : .4) + '; cursor:' + (i < NS - 1 ? 'pointer' : 'default') + ';',
      vsReset: () => this.reset()
    };
  }
}
function f(v) { return Number(v).toFixed(1); }


/* ---------------- bench layout (world units, viewBox 0 0 1220 600) ----------------
   LEFT : viscometer on its stand (tilts left about the fixed bottom hinge, 0–90°), waste glass top-left,
          controller / pressure display / thermostat bath on the shelf under the bench
   RIGHT: SPS/PDS bottle + transfer pump. Sample line: bottle top -> overhead run -> riser (IN_X) -> bottom inlet */
const BASE_Y = 458, BASE_X0 = 150, BASE_X1 = 590;                  // instrument base plate
const CTL = { x: 30, y: 510, w: 180, h: 68 };                      // viscometer controller (coils, PT100, timing)
const PDU = { x: 222, y: 514, w: 164, h: 60 };                     // pressure display (PT)
const BATH = { x: 404, y: 500, w: 112, h: 86 };                    // thermostat bath
const GRP = { x: 20, y: 490, w: 508, h: 104 };                     // shelf backing for controller + display + bath
const ARC = { a0: 4, a1: -90 };                                    // fixed quadrant guide (rotation angle, deg): just right of vertical -> horizontal (level with the low hinge)
const ARC_P0 = arcPt(ARC.a0), ARC_P1 = arcPt(ARC.a1);
const ARC_D = `M${ARC_P0} A${r1(ARC_R)},${r1(ARC_R)} 0 0 0 ${ARC_P1}`;
const ARC_TICKS = [0, 15, 30, 45, 60, 75, 90].map(t => { const i0 = ARC_R - (t % 30 ? 5 : 8), i1 = ARC_R + (t % 30 ? 5 : 8);
  const p0 = arcPt(-t, i0), p1 = arcPt(-t, i1), q = arcPt(-t, ARC_R + 20);
  return { t, d: `M${p0} L${p1}`, x: q[0], y: r1(q[1] + 4) }; });
const LEG_X = 640;
const VB = '2 8 1150 590';                                         // schematic viewBox, trimmed to the drawing (legend + shelf included)
const VIS = { x: 596, y: 74 };                                     // 'Viscometer' title (clear of the sweep at every angle)
/* everything attached to the moving instrument, for one inclination (cached) */
const GEO = {};
function geo(th) {
  th = Math.max(INCL_MIN, Math.min(INCL_MAX, Math.round(th * 10) / 10));
  if (GEO[th]) return GEO[th];
  const rot = -th, Wr = mkW(rot), a = rot * Math.PI / 180;
  const nx = Math.cos(a), ny = Math.sin(a);                           // world direction of the instrument's local +x (fitting side)
  const IN_A = Wr(620, 604);                                          // axis extension below the inlet fitting
  const P_IN = [[BOT_CX, 120 + RIG_DY], [BOT_CX, IN_TOP], [IN_X, IN_TOP], [IN_X, IN_A[1]], IN_A, Wr(620, 472)];
  const T0 = Wr(620, 126), T1 = Wr(620, 108);
  const P_TAIL = [T0, T1, [T1[0], TAIL_Y], [WASTE_CX, TAIL_Y], [WASTE_CX, WASTE.y - 6]];
  const P_INR = roundPts(P_IN, 20), P_TAILR = roundPts(P_TAIL, 18);
  const BW = [Wr(608, 472), Wr(632, 472), Wr(608, 222), Wr(632, 222)];
  const J1 = Wr(662, 475), J2 = Wr(662, 491), CC = Wr(662, 328), PH = Wr(666, 449), PS = Wr(696, 189);
  const out = (P, d) => r1(P[0] + nx * d) + ',' + r1(P[1] + ny * d);
  const hose = (J, yb) => `M${J} C${out(J, 36)} ${BATH.x - 46},${BATH.y + yb} ${BATH.x},${BATH.y + yb}`;
  const cable = (P, X, Y) => `M${P} C${out(P, 46)} ${X},${Y - 90} ${X},${Y}`;
  /* component labels: all on the fitting side (+x); leaders step further out as the instrument tilts so
     the labels stack instead of overlapping (rank 0 = nearest the hinge) */
  const sn = Math.max(0, Math.min(1, (Math.abs(Math.sin(a)) - 0.5) / 0.5));   // stacking only needed at steep tilts
  function lab(ax, ay, ey, rank) {
    const A = Wr(ax, ay), E0 = Wr(734, ey), sh = rank * 28 * sn;
    const E = [r1(E0[0] + nx * sh), r1(E0[1] + ny * sh)], T = [r1(E[0] + 10), E[1]];
    return { d: `M${A} L${E} L${T}`, x: r1(T[0] + 5), y: r1(T[1] + 5) };
  }
  const CL = arcPt(rot);                                              // clamp on the quadrant guide (rides with the upper end)
  const g = {
    th, T: devT(rot), IN_A, P_INR, P_TAILR,
    D_IN: dOf(P_INR), D_TAIL: dOf(P_TAILR),
    C_IN: dOf(roundPts([[BOT_CX, 132 + RIG_DY], [BOT_CX, IN_TOP], [IN_X, IN_TOP], [IN_X, IN_A[1]], IN_A, Wr(620, 592)], 20)),
    low: Math.max(BW[0][1], BW[1][1]), high: Math.min(BW[2][1], BW[3][1]),
    bx0: r1(Math.min.apply(null, BW.map(p => p[0])) - 4), bx1: r1(Math.max.apply(null, BW.map(p => p[0])) + 4),
    UPA: Wr(620, 200), AXUP: r1(Math.atan2(-Math.cos(a), Math.sin(a)) * 180 / Math.PI),
    TAIL_MX: r1((T1[0] + WASTE_CX) / 2),
    HOSE1: hose(J1, 54), HOSE2: hose(J2, 70),
    CAB_COIL: cable(CC, CTL.x + CTL.w - 34, CTL.y),
    CAB_PT100: cable(PH, CTL.x + CTL.w - 16, CTL.y),
    CAB_PT: cable(PS, PDU.x + PDU.w - 30, PDU.y),
    L: {
      pt: lab(696, 189, 180, 5),
      drive: lab(658, 262, 262, 4),
      ch: lab(632, 300, 306, 3),
      sense: lab(658, 384, 372, 2),
      body: lab(626, 404, 414, 1),
      pt100: lab(666, 449, 452, 0)
    },
    VL: { x: r1(T1[0] + 14), y: 42 },                                 // bleed-valve label: right of the outlet riser, under the waste run
    INL: { x: IN_X - 12, y: r1(IN_A[1] + 24) },                       // 'Inlet' label beside the inlet line
    CLAMP: CL,
    /* live angle badge: just outside the guide, on the free side of the instrument */
    ANG: (function () { const sa = Math.sin(a) * Math.sin(a), sd = 22 * Math.abs(Math.cos(a)), o = arcPt(rot, ARC_R + 24 + 24 * sa);
      const cx = r1(o[0] - nx * sd), cy = r1(Math.min(o[1] - ny * sd, BASE_Y - 13));      /* near horizontal: step outward along the guide, never down onto the base plate */
      return { x: r1(cx - 18), y: r1(cy - 9), tx: cx, ty: r1(cy + 4) }; })()
  };
  return (GEO[th] = g);
}
const LBL = "font-family:'IBM Plex Sans',sans-serif; font-size:14px; font-weight:500; fill:var(--vs-lbl2);";
const LBL2 = "font-family:'IBM Plex Sans',sans-serif; font-size:15px; font-weight:600; fill:var(--accb3);";
const ESS = "font-family:'IBM Plex Sans',sans-serif; font-size:20px; font-weight:600; fill:var(--txt);";
const SUB = "font-family:'IBM Plex Sans',sans-serif; font-size:14px; fill:var(--mut);";
const MONO = "font-family:'IBM Plex Mono',monospace;";

DC.define('StageViscSingle', {
  style: `
  .vs-root { --vs-win:#0b1320; --vs-cab:rgba(150,165,190,.45); --vs-hose:#2a313d; --vs-frame:#56637a; --vs-base:#262d38; --vs-plate:#394456; --vs-case:#66748a; --vs-tube:#7d8ba1; --vs-grp:rgba(255,255,255,.028); --vs-lbl:rgba(170,195,225,.75); --vs-lbl2:#c3d2e6; --vs-bore:#0a1420; --vs-ghost:rgba(150,180,215,.35); --vs-lead:rgba(150,180,215,.45); --vs-grid:rgba(150,180,215,.14); --vs-ax:rgba(150,180,215,.55); }
  html[data-theme="light"] .vs-root { --vs-win:#16233a; --vs-cab:rgba(60,75,100,.35); --vs-hose:#9aa3b0; --vs-frame:#9aa6b8; --vs-base:#c5ccd6; --vs-plate:#b6bfcc; --vs-case:#d3dae3; --vs-tube:#98a4b5; --vs-grp:rgba(20,40,70,.04); --vs-lbl:rgba(38,56,80,.72); --vs-lbl2:#2b3a4f; --vs-bore:#0f1b2b; --vs-ghost:rgba(38,56,80,.35); --vs-lead:rgba(38,56,80,.4); --vs-grid:rgba(38,56,80,.10); --vs-ax:rgba(38,56,80,.5); }
  @keyframes vsBlink { 0%,100% { opacity:1; } 50% { opacity:.3; } }
  @keyframes vsDash { to { stroke-dashoffset:-24; } }
  @keyframes vsUp { from { transform:translateY(14px); opacity:0; } 30% { opacity:1; } 70% { opacity:1; } to { transform:translateY(-14px); opacity:0; } }
  .vs-flow { animation:vsDash calc(.9s * var(--pm,1)) linear infinite; }
  .vs-slow .vs-flow, .vs-flow.vs-slow { animation-duration:calc(2.6s * var(--pm,1)); }
  @keyframes vsDrip { from { transform:translateY(0); opacity:1; } to { transform:translateY(40px); opacity:0; } }
  .vs-drip { animation:vsDrip calc(.9s * var(--pm,1)) ease-in infinite; }
  .vs-paused .vs-drip { animation-play-state:paused; }
  .vs-up path { animation:vsUp calc(1.6s * var(--pm,1)) linear infinite; }
  .vs-paused .vs-flow, .vs-paused .vs-up path { animation-play-state:paused; }
  .vs-root { --vs-resw:clamp(340px, 29vw, 450px); }
  .vs-chip { display:flex; align-items:baseline; gap:5px; height:30px; box-sizing:border-box; padding:6px 11px 0; border-radius:9px; background:var(--panel2); white-space:nowrap; font-family:'IBM Plex Mono',monospace; }
  .vs-chip b { font-size:15px; font-weight:700; color:var(--txt); }
  .vs-chl { font-family:'IBM Plex Sans',sans-serif; font-size:11.5px; font-weight:500; color:var(--mut); margin-right:2px; }
  .vs-chu { font-size:11px; color:var(--mut); }
  .vs-cht { font-size:9.5px; font-weight:700; letter-spacing:.5px; margin-left:4px; }
  .vs-halo text { paint-order:stroke; stroke:var(--panel2); stroke-width:4px; stroke-linejoin:round; }
  .vs-row { height:26px; }
  @media (max-width:1400px) { .vs-demo { display:none; } .vs-cht { display:none; } }
  @media (max-height:860px) {
    .vs-row { height:21px; font-size:13px; }
    .vs-res { padding:9px 12px 8px !important; gap:4px !important; }
  }
  @media (max-height:790px) {
    .vs-side .vs-note { display:none; }
    .vs-row { height:19px; font-size:12.5px; }
  }
  `,
  template: `<div class="vs-root {{ vsAnim }}" data-screen-label="Single-Phase Viscosity Test" style="flex:1 1 auto; min-height:0; width:100%; display:flex; flex-direction:column; gap:12px; text-align:left;">

  <!-- current step: instruction + step selector (row 1) · live action + live readings (row 2) -->
  <div class="vs-head" style="flex:0 0 auto; display:flex; flex-direction:column; gap:6px; padding:0 2px;">
    <div style="display:flex; align-items:center; gap:16px; min-width:0;">
      <span style="flex:0 0 auto; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:1px; font-weight:700; color:var(--blue); background:rgba(47,111,208,.12); padding:4px 9px; border-radius:6px;">{{ vsStepNo }}</span>
      <span style="flex:1 1 auto; min-width:0; font-size:17px; font-weight:600; color:var(--txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ vsInstr }}</span>
      <div style="flex:0 0 auto; display:flex; align-items:center; gap:4px;" title="Go to any step">
        <sc-for list="{{ vsStages }}" as="s" hint-placeholder-count="9">
          <button onclick="{{ s.onClick }}" title="{{ s.title }}" style="{{ s.style }}">{{ s.n }}</button>
        </sc-for>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:14px; min-width:0;">
      <div style="flex:1 1 auto; min-width:0; display:flex; align-items:center; gap:9px; padding-left:2px;">
        <span style="{{ vsMsgDot }}"></span>
        <span style="min-width:0; font-size:14px; font-weight:500; color:{{ vsMsgCol }}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ vsLive }}</span>
      </div>
      <!-- live readings (compact) -->
      <div class="vs-read" style="flex:0 0 auto; display:flex; align-items:center; gap:8px;">
        <div class="vs-chip" title="Viscometer pressure transmitter"><span class="vs-chl">Pressure</span><b style="color:{{ vsPCol }};">{{ vsPTxt }}</b><span class="vs-chu">{{ vsPUnit }}</span><span class="vs-cht" style="color:{{ vsPCol }};">{{ vsPState }}</span></div>
        <div class="vs-chip" title="Test temperature (thermostat bath)"><span class="vs-chl">Temp</span><b>{{ vsTemp }}</b><span class="vs-chu">°C</span></div>
        <div class="vs-chip" title="Falling-body time and viscosity (μ = K × t)"><span class="vs-chl">Viscosity</span><b style="color:#d6b03c;">{{ vsMuTxt }}</b><span class="vs-chu">{{ vsMuUnit }}</span><span class="vs-chu" style="margin-left:4px;">t = {{ vsTTxt }} {{ vsTUnit }}</span><span class="vs-cht" style="color:{{ vsMeasCol }};">{{ vsMeasTag }}</span></div>
      </div>
    </div>
  </div>
  <div style="flex:1 1 auto; min-height:0; display:flex;">

    <!-- ============ schematic ============ -->
    <div style="flex:1 1 auto; min-width:0; position:relative; display:flex; flex-direction:column; border-radius:14px; background:var(--panel2); overflow:hidden;">
      <svg sc-camel-view-box="{{ vsVB }}" preserveAspectRatio="xMidYMid meet" style="flex:1 1 auto; min-height:0; width:100%; height:100%; display:block; padding:6px 8px; box-sizing:border-box;">
        <defs>
          ${BottleArt.defs('vs')}
          <!-- project palette (same gradients as screens/showTest.js) -->
          <linearGradient id="vsMetal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"></stop><stop offset=".42" stop-color="#b3c1d8"></stop><stop offset=".58" stop-color="#7e90b0"></stop><stop offset="1" stop-color="#1f2a3e"></stop></linearGradient>
          <linearGradient id="vsCyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>
          <linearGradient id="vsSS" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6d7b92"></stop><stop offset=".18" stop-color="#b9c5d6"></stop><stop offset=".42" stop-color="#e9eef5"></stop><stop offset=".62" stop-color="#c3cddb"></stop><stop offset=".85" stop-color="#dfe6ef"></stop><stop offset="1" stop-color="#76849a"></stop></linearGradient>
          <linearGradient id="vsCollar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d6b82"></stop><stop offset=".35" stop-color="#aab6c8"></stop><stop offset=".6" stop-color="#8d9ab0"></stop><stop offset="1" stop-color="#56637a"></stop></linearGradient>
          <linearGradient id="vsRail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b3342"></stop><stop offset=".35" stop-color="#5d6a80"></stop><stop offset=".6" stop-color="#46526a"></stop><stop offset="1" stop-color="#232a36"></stop></linearGradient>
          <linearGradient id="vsCylV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aebcd2"></stop><stop offset=".5" stop-color="#7e90b0"></stop><stop offset="1" stop-color="#3a485f"></stop></linearGradient>
          <linearGradient id="vsWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa6d8"></stop><stop offset="1" stop-color="#2f6f9c"></stop></linearGradient>
          <!-- sample oil: project colour, continuous (single phase, no bubble dots) -->
          <linearGradient id="vsOilC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6b03c"></stop><stop offset="1" stop-color="#b08a22"></stop></linearGradient>
          <pattern id="vsHatch" width="7" height="7" sc-camel-pattern-units="userSpaceOnUse" sc-camel-pattern-transform="rotate(45)"><rect width="7" height="7" fill="#5f6f88"></rect><line x1="0" y1="0" x2="0" y2="7" stroke="#8595ad" stroke-width="2"></line></pattern>
          <pattern id="vsCoil" width="6" height="4" sc-camel-pattern-units="userSpaceOnUse"><rect width="6" height="4" fill="#3b2616"></rect><line x1="0" y1="2" x2="6" y2="2" stroke="#c07a3c" stroke-width="1.8"></line></pattern>
          <clipPath id="vsBotClip"><rect x="508" y="152" width="154" height="254" rx="10"></rect></clipPath>
          <clipPath id="vsBoreClip"><rect x="608" y="222" width="24" height="250" rx="4"></rect></clipPath>
          <clipPath id="vsBoreClipW"><rect x="608" y="222" width="24" height="250" rx="4" transform="{{ vsDevT }}"></rect></clipPath>
          <clipPath id="vsWasteClip"><path d="M${WASTE.x + 3},${WASTE.y} V${WASTE.y + WASTE.h - 7} Q${WASTE.x + 3},${WASTE.y + WASTE.h - 2} ${WASTE.x + 9},${WASTE.y + WASTE.h - 2} H${WASTE.x + WASTE.w - 9} Q${WASTE.x + WASTE.w - 3},${WASTE.y + WASTE.h - 2} ${WASTE.x + WASTE.w - 3},${WASTE.y + WASTE.h - 7} V${WASTE.y} Z"></path></clipPath>
        </defs>

        <rect x="${GRP.x}" y="${GRP.y}" width="${GRP.w}" height="${GRP.h}" rx="12" fill="var(--vs-grp)"></rect>

        <!-- ================= hoses + signal cables (run BEHIND the stand and instrument, down to the shelf) ================= -->
        <g fill="none" stroke-linecap="round">
          <path d="{{ vsHose1 }}" stroke="#0a0e16" stroke-width="8"></path><path d="{{ vsHose2 }}" stroke="#0a0e16" stroke-width="8"></path>
          <path d="{{ vsHose1 }}" stroke="#2a3446" stroke-width="4.8" stroke-dasharray="2 2.4"></path><path d="{{ vsHose2 }}" stroke="#2a3446" stroke-width="4.8" stroke-dasharray="2 2.4"></path>
        </g>
        <g fill="none" stroke="#5fb0ff" stroke-width="1.4" stroke-dasharray="1 6" stroke-linecap="round">
          <path d="{{ vsCabCoil }}" style="{{ vsDimCtl }}"></path>
          <path d="{{ vsCabPt100 }}" style="{{ vsDimCtl }}"></path>
          <path d="{{ vsCabPt }}" style="{{ vsDimPdu }}"></path>
        </g>

        <!-- ================= stationary stand: base plate, quadrant guide (0–90°), hinge bracket ================= -->
        <g>
          <ellipse cx="${(BASE_X0 + BASE_X1) / 2}" cy="${BASE_Y + 19}" rx="${(BASE_X1 - BASE_X0) / 2}" ry="4.5" fill="rgba(0,0,0,.26)"></ellipse>
          <!-- quadrant guide: two radial arms from the hinge + graduated arc (fixed) -->
          <g stroke-linecap="round">
            <path d="M${PIV[0]},${PIV[1]} L${arcPt(0)}" stroke="#56647c" stroke-width="7"></path>
            <path d="M${PIV[0]},${PIV[1]} L${arcPt(0)}" stroke="#c8d2df" stroke-width="3.6"></path>
            <path d="M${PIV[0]},${PIV[1]} L${ARC_P1}" stroke="#56647c" stroke-width="7"></path>
            <path d="M${PIV[0]},${PIV[1]} L${ARC_P1}" stroke="#c8d2df" stroke-width="3.6"></path>
            <path d="${ARC_D}" fill="none" stroke="#56647c" stroke-width="9"></path>
            <path d="${ARC_D}" fill="none" stroke="#c8d2df" stroke-width="5.4"></path>
            <path d="${ARC_D}" fill="none" stroke="#f3f6fa" stroke-width="1.2" opacity=".55"></path>
          </g>
          <g stroke="#56647c" stroke-width="1.4">${ARC_TICKS.map(k => `<path d="${k.d}"></path>`).join('')}</g>
          <rect x="${ARC_P1[0] - 5}" y="${ARC_P1[1]}" width="10" height="${r1(BASE_Y - ARC_P1[1])}" rx="2" fill="url(#vsSS)" stroke="rgba(10,14,22,.55)" stroke-width=".8"></rect>
          <!-- base plate + feet -->
          <rect x="${BASE_X0}" y="${BASE_Y}" width="${BASE_X1 - BASE_X0}" height="14" rx="4" fill="#1b1f26" stroke="rgba(0,0,0,.6)"></rect>
          <line x1="${BASE_X0 + 4}" y1="${BASE_Y + 1.2}" x2="${BASE_X1 - 4}" y2="${BASE_Y + 1.2}" stroke="#eef4fb" stroke-width=".8" opacity=".16"></line>
          <rect x="${BASE_X0 + 10}" y="${BASE_Y + 14}" width="16" height="5" rx="1.5" fill="#0e1116"></rect>
          <rect x="${BASE_X1 - 26}" y="${BASE_Y + 14}" width="16" height="5" rx="1.5" fill="#0e1116"></rect>
          <!-- fixed hinge bracket (clevis) under the instrument's lower end -->
          <path d="M${PIV[0] - 24},${BASE_Y} L${PIV[0] - 14},${PIV[1] + 2} A14,14 0 0 1 ${PIV[0] + 14},${PIV[1] + 2} L${PIV[0] + 24},${BASE_Y} Z" fill="url(#vsSS)" stroke="rgba(10,14,22,.6)" stroke-width=".9"></path>
          <line x1="${PIV[0] - 16}" y1="${BASE_Y - 6}" x2="${PIV[0] + 16}" y2="${BASE_Y - 6}" stroke="rgba(10,14,22,.35)" stroke-width="1"></line>
        </g>

        <!-- ================= thermostat bath (shelf) ================= -->
        <g>
          <ellipse cx="${BATH.x + BATH.w / 2}" cy="${BATH.y + BATH.h + 3}" rx="${BATH.w / 2 + 4}" ry="4" fill="rgba(0,0,0,.3)"></ellipse>
          <rect x="${BATH.x}" y="${BATH.y + 40}" width="${BATH.w}" height="${BATH.h - 40}" rx="6" fill="url(#vsCyl)" stroke="#0a0e16" stroke-width="1.2"></rect>
          <g stroke="#0a0e16" stroke-width="1.3" opacity=".45">
            <line x1="${BATH.x + 16}" y1="${BATH.y + BATH.h - 26}" x2="${BATH.x + BATH.w - 16}" y2="${BATH.y + BATH.h - 26}"></line>
            <line x1="${BATH.x + 16}" y1="${BATH.y + BATH.h - 18}" x2="${BATH.x + BATH.w - 16}" y2="${BATH.y + BATH.h - 18}"></line>
            <line x1="${BATH.x + 16}" y1="${BATH.y + BATH.h - 10}" x2="${BATH.x + BATH.w - 16}" y2="${BATH.y + BATH.h - 10}"></line>
          </g>
          <rect x="${BATH.x + 7}" y="${BATH.y}" width="${BATH.w - 14}" height="44" rx="5" fill="url(#vsMetal)" stroke="#0a0e16" stroke-width="1.1"></rect>
          <rect x="${BATH.x + 15}" y="${BATH.y + 9}" width="56" height="20" rx="2" fill="#06101e" stroke="#1d3350"></rect>
          <text x="${BATH.x + 66}" y="${BATH.y + 24}" text-anchor="end" style="${MONO} font-size:12.5px; font-weight:700; fill:#ff6a4a;">{{ vsBathT }}</text>
          <text x="${BATH.x + 74}" y="${BATH.y + 23}" style="${MONO} font-size:8px; fill:#0a0e16;">°C</text>
          <circle cx="${BATH.x + BATH.w - 22}" cy="${BATH.y + 20}" r="8" fill="url(#vsMetal)" stroke="#0a0e16"></circle>
          <circle cx="${BATH.x + BATH.w - 22}" cy="${BATH.y + 36}" r="2.6" fill="#46d39a"></circle>
          <g fill="url(#vsMetal)" stroke="#0a0e16" stroke-width=".7"><rect x="${BATH.x - 4}" y="${BATH.y + 50}" width="6" height="8" rx="1"></rect><rect x="${BATH.x - 4}" y="${BATH.y + 66}" width="6" height="8" rx="1"></rect></g>
        </g>

        <!-- ================= viscometer instrument (rotates about the bottom hinge as one assembly) =================
             local drawing: mounting rail on the hinge line (x 578), stainless measuring body with two coil
             collars, hex end caps, top outlet gland, bottom inlet block; narrow cutaway shows chamber + body -->
        <g transform="{{ vsDevT }}">
          <!-- mounting rail (anodized bar, hinge lug at the bottom, guide clamp lug at the top) -->
          <rect x="566" y="190" width="24" height="416" rx="6" fill="url(#vsRail)" stroke="rgba(10,14,22,.7)" stroke-width="1"></rect>
          <line x1="570" y1="196" x2="570" y2="600" stroke="#eef4fb" stroke-width="1.2" opacity=".22"></line>
          <circle cx="578" cy="596" r="17" fill="url(#vsSS)" stroke="rgba(10,14,22,.65)" stroke-width="1"></circle>
          <circle cx="578" cy="596" r="11" fill="none" stroke="rgba(10,14,22,.3)" stroke-width="1"></circle>
          <circle cx="578" cy="200" r="11" fill="url(#vsSS)" stroke="rgba(10,14,22,.65)" stroke-width="1"></circle>
          <!-- rail-to-body brackets -->
          <g fill="url(#vsCollar)" stroke="rgba(10,14,22,.6)" stroke-width=".8"><rect x="584" y="236" width="10" height="16" rx="2"></rect><rect x="584" y="470" width="10" height="16" rx="2"></rect></g>
          <!-- measuring body (thermostatic jacket) -->
          <rect x="590" y="184" width="62" height="326" rx="12" fill="url(#vsSS)" stroke="rgba(10,14,22,.65)" stroke-width="1"></rect>
          <rect x="595" y="192" width="5" height="310" rx="2" fill="#ffffff" opacity=".3"></rect>
          <!-- coil collars (driving / sensing) -->
          <g style="{{ vsDimCoil }}">
            <rect x="585" y="226" width="72" height="92" rx="6" fill="url(#vsCollar)" stroke="rgba(10,14,22,.6)" stroke-width=".9"></rect>
            <rect x="585" y="338" width="72" height="92" rx="6" fill="url(#vsCollar)" stroke="rgba(10,14,22,.6)" stroke-width=".9"></rect>
            <g stroke="rgba(10,14,22,.3)" stroke-width="1"><line x1="587" y1="236" x2="655" y2="236"></line><line x1="587" y1="308" x2="655" y2="308"></line><line x1="587" y1="348" x2="655" y2="348"></line><line x1="587" y1="420" x2="655" y2="420"></line></g>
            <rect x="585" y="226" width="72" height="92" rx="6" fill="#4d9dff" style="{{ vsDriveGlow }}"></rect>
            <rect x="585" y="338" width="72" height="92" rx="6" fill="#46d39a" style="{{ vsSenseGlow }}"></rect>
          </g>
          <!-- top cap (hex) + outlet gland -->
          <rect x="596" y="158" width="50" height="28" rx="4" fill="url(#vsCollar)" stroke="rgba(10,14,22,.65)" stroke-width="1"></rect>
          <g stroke="rgba(10,14,22,.35)" stroke-width="1"><line x1="609" y1="160" x2="609" y2="184"></line><line x1="633" y1="160" x2="633" y2="184"></line></g>
          <rect x="610" y="146" width="20" height="13" rx="2" fill="url(#vsSS)" stroke="rgba(10,14,22,.65)" stroke-width=".9"></rect>
          <!-- bottom cap (hex) + inlet block + inlet nipple -->
          <rect x="596" y="508" width="50" height="28" rx="4" fill="url(#vsCollar)" stroke="rgba(10,14,22,.65)" stroke-width="1"></rect>
          <g stroke="rgba(10,14,22,.35)" stroke-width="1"><line x1="609" y1="510" x2="609" y2="534"></line><line x1="633" y1="510" x2="633" y2="534"></line></g>
          <rect x="604" y="536" width="32" height="44" rx="4" fill="url(#vsSS)" stroke="rgba(10,14,22,.65)" stroke-width="1"></rect>
          <rect x="612" y="580" width="16" height="20" rx="2.5" fill="url(#vsSS)" stroke="rgba(10,14,22,.65)" stroke-width=".9"></rect>
          <!-- side fittings: thermostat ports, coil connector, PT100 head -->
          <g fill="url(#vsSS)" stroke="rgba(10,14,22,.6)" stroke-width=".8"><rect x="650" y="470" width="14" height="10" rx="2"></rect><rect x="650" y="486" width="14" height="10" rx="2"></rect></g>
          <rect x="651" y="322" width="13" height="12" rx="2" fill="#2a3240"></rect>
          <g style="{{ vsDimCtl }}"><rect x="651" y="442" width="16" height="14" rx="2" fill="#2a3240"></rect></g>
          <!-- narrow cutaway: chamber + measuring body -->
          <rect x="599" y="212" width="42" height="274" rx="7" fill="var(--vs-win)" stroke="#0a0e16" stroke-width="1.1"></rect>
          <rect x="600.5" y="214" width="7.5" height="270" fill="url(#vsHatch)"></rect>
          <rect x="632" y="214" width="7.5" height="270" fill="url(#vsHatch)"></rect>
          <g style="{{ vsDimCtl }}"><rect x="632" y="446" width="9" height="6" rx="1" fill="url(#vsMetal)"></rect></g>
          <rect x="616" y="148" width="8" height="76" fill="var(--vs-bore)"></rect>
          <rect x="624" y="186" width="28" height="6" fill="var(--vs-bore)"></rect>
          <rect x="616" y="470" width="8" height="114" fill="var(--vs-bore)"></rect>
          <rect x="608" y="222" width="24" height="250" rx="4" fill="var(--vs-bore)" stroke="#33445e"></rect>
          <rect x="601" y="215" width="38" height="264" rx="8" fill="none" stroke="#4d9dff" stroke-width="3" style="{{ vsHaloCh }}"></rect>
        </g>

        <!-- ================= tubing: pump line (water) ================= -->
        <g style="{{ vsDimPump }}" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="{{ vsCW }}" stroke="var(--vs-ghost)" stroke-width="1.4" stroke-dasharray="4 5"></path>
          <path d="{{ vsCW }}" stroke="#46e0ff" stroke-width="13" opacity=".18" style="{{ vsGlowW }}"></path>
          <path d="{{ vsCW }}" stroke="#0a0e16" stroke-width="8" sc-camel-path-length="1000" stroke-dasharray="{{ vsC0 }}"></path>
          <path d="{{ vsCW }}" stroke="#7e90b0" stroke-width="4" sc-camel-path-length="1000" stroke-dasharray="{{ vsC0 }}"></path>
          <path d="{{ vsCW }}" stroke="#4d9dff" stroke-width="12" opacity=".25" style="{{ vsHot0 }}"></path>
          <g style="{{ vsWaterLine }}"><path d="{{ vsCW }}" stroke="#46e0ff" stroke-width="2.4"></path><path class="vs-flow" d="{{ vsCW }}" stroke="#eaf9ff" stroke-width="2" stroke-dasharray="2 10" style="{{ vsWaterDash }}"></path></g>
        </g>
        <!-- ================= tubing: bottle -> viscometer inlet ================= -->
        <g style="{{ vsDimIn }}" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="{{ vsCIn }}" stroke="var(--vs-ghost)" stroke-width="1.4" stroke-dasharray="4 5"></path>
          <path d="{{ vsCIn }}" stroke="#ffcf3f" stroke-width="15" opacity=".15" style="{{ vsGlowIn }}"></path>
          <path d="{{ vsCIn }}" stroke="#0a0e16" stroke-width="8" sc-camel-path-length="1000" stroke-dasharray="{{ vsC1 }}"></path>
          <path d="{{ vsCIn }}" stroke="#7e90b0" stroke-width="4" sc-camel-path-length="1000" stroke-dasharray="{{ vsC1 }}"></path>
          <path d="{{ vsCIn }}" stroke="#4d9dff" stroke-width="12" opacity=".25" style="{{ vsHot1 }}"></path>
          <path d="{{ vsDIn }}" stroke="#d6b03c" stroke-width="2.6" stroke-linecap="butt" sc-camel-path-length="1000" stroke-dasharray="{{ vsIn }}"></path>
          <path class="vs-flow" d="{{ vsDIn }}" stroke="#fff2c0" stroke-width="2" stroke-dasharray="2 10" style="{{ vsInDash }}"></path>
        </g>
        <!-- ================= tubing: bleed valve -> waste glass ================= -->
        <g style="{{ vsDimTail }}" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="{{ vsCOut }}" stroke="var(--vs-ghost)" stroke-width="1.4" stroke-dasharray="4 5"></path>
          <path d="{{ vsCOut }}" stroke="#ffcf3f" stroke-width="15" opacity=".15" style="{{ vsGlowTail }}"></path>
          <path d="{{ vsCOut }}" stroke="#0a0e16" stroke-width="8" sc-camel-path-length="1000" stroke-dasharray="{{ vsC2 }}"></path>
          <path d="{{ vsCOut }}" stroke="#7e90b0" stroke-width="4" sc-camel-path-length="1000" stroke-dasharray="{{ vsC2 }}"></path>
          <path d="{{ vsCOut }}" stroke="#4d9dff" stroke-width="12" opacity=".25" style="{{ vsHot2 }}"></path>
          <path d="{{ vsDTail }}" stroke="#d6b03c" stroke-width="2.6" stroke-linecap="butt" sc-camel-path-length="1000" stroke-dasharray="{{ vsTl }}"></path>
          <g class="{{ vsTlSlow }}"><path class="vs-flow" d="{{ vsDTail }}" stroke="#fff2c0" stroke-width="2" stroke-dasharray="2 10" style="{{ vsTlDash }}"></path></g>
        </g>

        <!-- ================= chamber oil (horizontal level in the inclined bore) ================= -->
        <g clip-path="url(#vsBoreClipW)">
          <rect x="{{ vsBx0 }}" y="{{ vsChY }}" width="{{ vsBw }}" height="{{ vsChH }}" fill="url(#vsOilC)"></rect>
          <sc-if value="{{ vsChMen }}" hint-placeholder-val="{{ false }}"><line x1="{{ vsBx0 }}" y1="{{ vsChMenY }}" x2="{{ vsBx1 }}" y2="{{ vsChMenY }}" stroke="#fff2c0" stroke-width="1.6"></line></sc-if>
        </g>

        <!-- ================= viscometer · moving parts, top outlet, bleed valve, PT (same rotation) ================= -->
        <g transform="{{ vsDevT }}">
          <g clip-path="url(#vsBoreClip)">
            <g class="vs-up" style="{{ vsChArrows }}" fill="#fff2c0"><path d="M615,236 L620,229 L625,236 Z"></path></g>
          </g>
          <g fill="none">
            <path d="{{ vsDSt }}" stroke="#d6b03c" stroke-width="5" sc-camel-path-length="1000" stroke-dasharray="{{ vsSt }}"></path>
            <g class="{{ vsTlSlow }}"><path class="vs-flow" d="{{ vsDSt }}" stroke="#fff2c0" stroke-width="2" stroke-dasharray="4 8" style="{{ vsStDash }}"></path></g>
            <sc-if value="{{ vsTeeOn }}" hint-placeholder-val="{{ false }}"><path d="M624,189 H652" stroke="#d6b03c" stroke-width="4"></path></sc-if>
          </g>
          <sc-if value="{{ vsFrontStOn }}" hint-placeholder-val="{{ false }}"><circle cx="{{ vsFsx }}" cy="{{ vsFsy }}" r="4.2" fill="#ffe08a" stroke="#fff6d6"></circle></sc-if>
          <line x1="608" y1="236" x2="632" y2="236" stroke="#8fa3c2" stroke-width="1" stroke-dasharray="2 2"></line>
          <line x1="608" y1="456" x2="632" y2="456" stroke="#8fa3c2" stroke-width="1.6"></line>
          <g transform="{{ vsBodyT }}">
            <path d="M612,364 Q612,356 620,356 Q628,356 628,364 V440 L620,454 L612,440 Z" fill="url(#vsMetal)" stroke="#0a0e16"></path>
            <line x1="615" y1="364" x2="615" y2="438" stroke="#eef4fb" stroke-width="1" opacity=".45"></line>
          </g>
          <!-- pressure transmitter on the side port -->
          <g style="{{ vsDimPdu }}">
            <path d="M652,189 H666" stroke="#56647c" stroke-width="6"></path>
            <path d="M652,189 H666" stroke="#c8d2df" stroke-width="3"></path>
            <sc-if value="{{ vsTeeOn }}" hint-placeholder-val="{{ false }}"><path d="M652,189 H664" stroke="#d6b03c" stroke-width="2.2"></path></sc-if>
            <rect x="660" y="174" width="42" height="30" rx="6" fill="#ff9a3a" style="{{ vsHaloPT }}"></rect>
            <rect x="664" y="179" width="28" height="20" rx="4" fill="url(#vsSS)" stroke="rgba(10,14,22,.55)" stroke-width=".8"></rect>
            <rect x="691" y="183" width="6" height="12" rx="1.5" fill="#2a3240"></rect>
          </g>
          <!-- bleed valve on the top outlet (project valve style) -->
          <g style="{{ vsDimVL }}">
            <rect x="603" y="121" width="50" height="34" rx="7" fill="#46d39a" opacity=".5" style="{{ vsHaloVL }}"></rect>
            <line x1="632" y1="138" x2="637" y2="138" stroke="#8fa3c2" stroke-width="2.4"></line>
            <path d="M607 125 L633 125 L620 138 Z" fill="url(#vsCyl)" stroke="#0a0e16" stroke-width="1.3"></path>
            <path d="M607 151 L633 151 L620 138 Z" fill="url(#vsCyl)" stroke="#0a0e16" stroke-width="1.3"></path>
            <g style="{{ vsVLHot }}"><path d="M607 125 L633 125 L620 138 Z" fill="#46d39a"></path><path d="M607 151 L633 151 L620 138 Z" fill="#46d39a"></path></g>
            <circle cx="644" cy="138" r="7" fill="#0c1626" stroke="#8fa3c2" stroke-width="2"></circle>
            <g stroke="#8fa3c2" stroke-width="1.5" stroke-linecap="round" style="{{ vsVLWheel }}"><line x1="637" y1="138" x2="651" y2="138"></line><line x1="644" y1="131" x2="644" y2="145"></line></g>
          </g>
        </g>

        <!-- ================= guide lock clamp (rides the quadrant with the upper end) + fixed hinge pin ================= -->
        <g transform="{{ vsClampT }}">
          <rect x="-9" y="-9" width="18" height="18" rx="3" fill="#2a3240" stroke="rgba(0,0,0,.6)" stroke-width=".8"></rect>
          <line x1="0" y1="-9" x2="0" y2="-17" stroke="#8fa3c2" stroke-width="2.4" stroke-linecap="round"></line>
          <circle cx="0" cy="-20" r="4.5" fill="#1b1f26" stroke="#8fa3c2" stroke-width="1.2"></circle>
        </g>
        <!-- live inclination badge on the guide (same value as the slider) -->
        <rect x="{{ vsAng.x }}" y="{{ vsAng.y }}" width="36" height="18" rx="4" fill="var(--panel)" stroke="var(--blue)" stroke-width="1.2"></rect>
        <text x="{{ vsAng.tx }}" y="{{ vsAng.ty }}" text-anchor="middle" style="${MONO} font-size:11.5px; font-weight:700; fill:var(--blue);">{{ vsAngTxt }}</text>
        <circle cx="${PIV[0]}" cy="${PIV[1]}" r="6" fill="#1b1f26" stroke="#c8d2df" stroke-width="1.8"></circle>
        <circle cx="${PIV[0] - 1.6}" cy="${PIV[1] - 1.6}" r="1.5" fill="#eef4fb" opacity=".7"></circle>

        <!-- ================= control box: controller + pressure display (project control-box style) ================= -->
        <g style="{{ vsDimCtl }}">
          <rect x="${CTL.x}" y="${CTL.y}" width="${CTL.w}" height="${CTL.h}" rx="6" fill="rgba(10,17,30,.55)" stroke="#33445e" stroke-width="1.2"></rect>
          <rect x="${CTL.x + 10}" y="${CTL.y + 8}" width="${CTL.w - 20}" height="${CTL.h - 16}" rx="3" fill="url(#vsMetal)" stroke="#0a0e16"></rect>
          <rect x="${CTL.x + 18}" y="${CTL.y + 13}" width="126" height="${CTL.h - 26}" rx="1.5" fill="#06101e" stroke="#1d3350"></rect>
          <text x="${CTL.x + 26}" y="${CTL.y + 30}" style="${MONO} font-size:11px; font-weight:600; fill:#7ff0bf;">t</text>
          <text x="${CTL.x + 124}" y="${CTL.y + 30}" text-anchor="end" style="${MONO} font-size:13px; font-weight:600; fill:#7ff0bf;">{{ vsCtlT }}</text>
          <text x="${CTL.x + 128}" y="${CTL.y + 30}" style="${MONO} font-size:7.5px; fill:var(--cap);">s</text>
          <text x="${CTL.x + 26}" y="${CTL.y + 47}" style="${MONO} font-size:11px; font-weight:600; fill:#ffe08a;">μ</text>
          <text x="${CTL.x + 124}" y="${CTL.y + 47}" text-anchor="end" style="${MONO} font-size:13px; font-weight:600; fill:#ffe08a;">{{ vsCtlMu }}</text>
          <text x="${CTL.x + 128}" y="${CTL.y + 47}" style="${MONO} font-size:7.5px; fill:var(--cap);">cP</text>
          <text x="${CTL.x + 26}" y="${CTL.y + 57}" style="${MONO} font-size:7px; letter-spacing:.8px; fill:var(--cap);">{{ vsCtlState }}</text>
          <circle cx="${CTL.x + CTL.w - 22}" cy="${CTL.y + 24}" r="4" fill="{{ vsCtlCol }}"></circle>
          <text x="${CTL.x + CTL.w - 22}" y="${CTL.y + 48}" text-anchor="middle" style="${MONO} font-size:7px; fill:#0a0e16;">VISC</text>
        </g>
        <g style="{{ vsDimPdu }}">
          <rect x="${PDU.x}" y="${PDU.y}" width="${PDU.w}" height="${PDU.h}" rx="6" fill="rgba(10,17,30,.55)" stroke="#33445e" stroke-width="1.2"></rect>
          <rect x="${PDU.x + 10}" y="${PDU.y + 8}" width="${PDU.w - 20}" height="${PDU.h - 16}" rx="3" fill="url(#vsMetal)" stroke="#0a0e16"></rect>
          <rect x="${PDU.x + 18}" y="${PDU.y + 13}" width="${PDU.w - 72}" height="${PDU.h - 26}" rx="1.5" fill="#06101e" stroke="#1d3350"></rect>
          <text x="${PDU.x + PDU.w - 60}" y="${PDU.y + 37}" text-anchor="end" style="${MONO} font-size:19px; font-weight:700; fill:{{ vsPtCol }};">{{ vsPtLcd }}</text>
          <text x="${PDU.x + PDU.w - 44}" y="${PDU.y + 34}" text-anchor="middle" style="${MONO} font-size:7.5px; fill:#0a0e16;">PT psig</text>
        </g>

        <!-- ================= waste glass ================= -->
        <g style="{{ vsDimTail }}">
          <g clip-path="url(#vsWasteClip)">
            <rect x="${WASTE.x}" y="{{ vsWasteY }}" width="${WASTE.w}" height="{{ vsWasteH }}" fill="url(#vsOilC)"></rect>
            <sc-if value="{{ vsWasteOn }}" hint-placeholder-val="{{ false }}"><line x1="${WASTE.x}" y1="{{ vsWasteY }}" x2="${WASTE.x + WASTE.w}" y2="{{ vsWasteY }}" stroke="#fff2c0" stroke-width="1.6"></line></sc-if>
          </g>
          <path d="M${WASTE.x + 3},${WASTE.y} V${WASTE.y + WASTE.h - 7} Q${WASTE.x + 3},${WASTE.y + WASTE.h - 2} ${WASTE.x + 9},${WASTE.y + WASTE.h - 2} H${WASTE.x + WASTE.w - 9} Q${WASTE.x + WASTE.w - 3},${WASTE.y + WASTE.h - 2} ${WASTE.x + WASTE.w - 3},${WASTE.y + WASTE.h - 7} V${WASTE.y}" fill="rgba(143,163,194,.10)" stroke="#8fa3c2" stroke-width="1.8" stroke-linejoin="round"></path>
          <path d="M${WASTE.x - 4},${WASTE.y - 3} Q${WASTE.x + 1},${WASTE.y - 2} ${WASTE.x + 2},${WASTE.y + 2} M${WASTE.x + 4},${WASTE.y - 1.5} H${WASTE.x + WASTE.w + 1}" fill="none" stroke="#b3c1d8" stroke-width="3" stroke-linecap="round"></path>
          <line x1="${WASTE.x + 8}" y1="${WASTE.y + 8}" x2="${WASTE.x + 8}" y2="${WASTE.y + WASTE.h - 12}" stroke="#eef4fb" stroke-width="2" opacity=".25" stroke-linecap="round"></line>
          <g stroke="#8fa3c2" stroke-width="1">${WASTE_MARKS}</g>
          <sc-if value="{{ vsDrip }}" hint-placeholder-val="{{ false }}"><circle class="vs-drip" cx="${WASTE_CX}" cy="${WASTE.y - 4}" r="2.4" fill="#d6b03c"></circle></sc-if>
        </g>

        <!-- ================= SPS/PDS bottle rig + transfer pump (same drawing as screens/showTest.js) ================= -->
        <g transform="translate(${RIG_DX},${RIG_DY})">
          <g style="{{ vsDimBottle }}">
            <!-- clamp stand behind the bottle -->
            <rect x="581" y="258" width="8" height="302" fill="url(#vsMetal)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <rect x="506" y="258" width="158" height="9" rx="3" fill="url(#vsMetal)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <g fill="#0a0e16" opacity=".5"><circle cx="514" cy="262" r="1.6"></circle><circle cx="656" cy="262" r="1.6"></circle></g>
            <rect x="506" y="368" width="158" height="9" rx="3" fill="url(#vsMetal)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <g fill="#0a0e16" opacity=".5"><circle cx="514" cy="372" r="1.6"></circle><circle cx="656" cy="372" r="1.6"></circle></g>
            <rect x="500" y="556" width="170" height="8" rx="2" fill="#1a2030" stroke="#0a0e16"></rect>
            <ellipse cx="585" cy="566" rx="90" ry="6" fill="rgba(0,0,0,.3)"></ellipse>
            <!-- outlet riser (sample side, always full) -->
            <path d="M585 214.8 V${132}" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></path>
            <path d="M585 214.8 V${132}" fill="none" stroke="#d6b03c" stroke-width="2.4" stroke-linecap="round"></path>
            <!-- approved Oil Sample Bottle (components/BottleArt.js); fills / piston in bore units -->
            ${BottleArt.oil('vs', { x: BOT_C[0], y: BOT_C[1], s: BOT_S, bd: 'oil', ctx: 'SPS/PDS sample bottle · feeding the viscometer',
              inner: `<rect x="-22" y="-226" width="44" height="{{ vsOilH }}" fill="url(#vsOil)"></rect>
              <rect x="-22" y="{{ vsWaterY }}" width="44" height="{{ vsWaterH }}" fill="url(#vsDrive)"></rect>
              <g transform="translate(0,{{ vsPistDY }})">${PBDraw.mixRing('vs', 0, -226 - 8.5)}${PBDraw.piston('vs', -226)}</g>`,
              ringT: '{{ vsBtlRingT }}', needleT: '{{ vsBtlNeedleT }}', ringB: '{{ vsBtlRingB }}', needleB: '{{ vsBtlNeedleB }}' })}
            <!-- bottle valve (project valve) -->
            <circle cx="585" cy="120" r="19" fill="#46d39a" opacity=".35" style="{{ vsHaloVB }}"></circle>
            <line x1="563" y1="120" x2="573" y2="120" stroke="#8fa3c2" stroke-width="2.4"></line>
            <path d="M572 108 L598 108 L585 120 Z" fill="url(#vsCyl)" stroke="#0a0e16" stroke-width="1.3"></path>
            <path d="M572 132 L598 132 L585 120 Z" fill="url(#vsCyl)" stroke="#0a0e16" stroke-width="1.3"></path>
            <g style="{{ vsVBHot }}"><path d="M572 108 L598 108 L585 120 Z" fill="#46d39a"></path><path d="M572 132 L598 132 L585 120 Z" fill="#46d39a"></path></g>
            <circle cx="557" cy="120" r="7" fill="#0c1626" stroke="#8fa3c2" stroke-width="2"></circle>
            <g stroke="#8fa3c2" stroke-width="1.5" stroke-linecap="round" style="{{ vsVBWheel }}"><line x1="550" y1="120" x2="564" y2="120"></line><line x1="557" y1="113" x2="557" y2="127"></line></g>
            <text x="604" y="116" style="font-family:'IBM Plex Sans',sans-serif; font-size:13px; font-weight:600; fill:var(--accb3);">Bottle Valve</text>
            <rect x="604" y="122" width="62" height="15" rx="3" fill="{{ vsTB.fill }}" stroke="{{ vsTB.stroke }}"></rect>
            <text x="635" y="133" text-anchor="middle" style="${MONO} font-size:9px; font-weight:600; letter-spacing:.6px; fill:{{ vsTB.color }};">{{ vsTB.text }}</text>
          </g>
          <text x="${BTX(676) - RIG_DX + 30}" y="196" style="${ESS}">SPS/PDS</text>
          <text x="${BTX(676) - RIG_DX + 30}" y="214" style="${SUB}">sample bottle</text>
          <text x="${BTX(676) - RIG_DX + 30}" y="232" style="${MONO} font-size:12.5px; font-weight:700; fill:var(--grn);">${fmtP(BOTTLE_P)} psig</text>
          ${BottleArt.pill(BTX(676) - RIG_DX + 30, 244, 'oil', { ctx: 'SPS/PDS sample bottle · feeding the viscometer' })}

          <!-- transfer pump (project drawing, mirrored to sit RIGHT of the bottle; its outlet faces the bottle) -->
          <g style="{{ vsDimPump }}"><g transform="translate(1170,0) scale(-1,1)">
            <rect x="294" y="424" width="162" height="72" rx="9" fill="none" stroke="#46d39a" stroke-width="2.4" style="{{ vsHaloPump }}"></rect>
            <rect x="292" y="490" width="10" height="12" fill="url(#vsMetal)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <rect x="448" y="490" width="10" height="12" fill="url(#vsMetal)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <rect x="280" y="486" width="190" height="10" rx="2" fill="#1a2030" stroke="#0a0e16"></rect>
            <rect x="300" y="430" width="150" height="60" rx="6" fill="url(#vsCyl)" stroke="#0a0e16" stroke-width="1.3"></rect>
            <g stroke="#0a0e16" stroke-width="1.4" opacity=".5"><line x1="382" y1="440" x2="390" y2="480"></line><line x1="392" y1="440" x2="400" y2="480"></line><line x1="402" y1="440" x2="410" y2="480"></line></g>
            <circle cx="424" cy="440" r="2.6" fill="{{ vsPumpLed }}" style="{{ vsPumpLedAnim }}"></circle>
            <line x1="304" y1="436" x2="446" y2="436" stroke="#eef4fb" stroke-width="1" opacity=".28"></line>
            <rect x="308" y="474" width="56" height="10" rx="2" fill="#0a1420" stroke="#33445e" stroke-width="0.7"></rect>
            <circle cx="340" cy="458" r="17" fill="url(#vsMetal)" stroke="#0a0e16" stroke-width="1.6"></circle>
            <circle cx="340" cy="458" r="12.5" fill="none" stroke="#0a0e16" stroke-width="1"></circle>
            <g stroke="#0a0e16" stroke-width="1"><line x1="340" y1="443" x2="340" y2="447"></line><line x1="340" y1="469" x2="340" y2="473"></line><line x1="325" y1="458" x2="329" y2="458"></line><line x1="351" y1="458" x2="355" y2="458"></line></g>
            <line x1="340" y1="458" x2="340" y2="446" stroke="#0a0e16" stroke-width="2"></line>
            <circle cx="340" cy="458" r="3.4" fill="#0a0e16"></circle>
            <rect x="440" y="450" width="18" height="16" rx="2" fill="url(#vsMetal)" stroke="#0a0e16" stroke-width="0.8"></rect>
            <circle cx="458" cy="458" r="5" fill="url(#vsMetal)" stroke="#0a0e16" stroke-width="0.8"></circle>
          </g>
            <text x="${1170 - 336}" y="482" text-anchor="middle" style="${MONO} font-size:6.5px; letter-spacing:.5px; fill:var(--accb3);">PUMP</text>
            <circle cx="585" cy="474" r="5" fill="url(#vsMetal)" stroke="#0a0e16" stroke-width="0.8"></circle>
          </g>
          <text x="${1170 - 375}" y="522" text-anchor="middle" style="${ESS}">Transfer Pump</text>
          <text x="${1170 - 375}" y="540" text-anchor="middle" style="${MONO} font-size:12px; fill:{{ vsPumpLed }};">{{ vsPumpLcd }} cc · {{ vsPumpState }}</text>
          <text x="${1170 - 505}" y="448" text-anchor="middle" style="${MONO} font-size:11px; letter-spacing:.5px; fill:var(--cap2);">Pump Line</text>
        </g>
        <!-- ================= essential labels ================= -->
        <text x="${VIS.x}" y="${VIS.y}" style="${ESS}">Viscometer</text>
        <text x="${VIS.x}" y="${VIS.y + 18}" style="${SUB}">falling body · 3 cc</text>
        <text x="${VIS.x}" y="${VIS.y + 36}" style="${MONO} font-size:12px; font-weight:700; letter-spacing:.5px; fill:{{ vsChLblCol }};">{{ vsChLbl }}</text>
        <text x="{{ vsInl.x }}" y="{{ vsInl.y }}" text-anchor="end" style="${ESS}">Inlet</text>
        <text x="{{ vsVL.x }}" y="{{ vsVL.y }}" style="${ESS}">Bleed Valve</text>
        <rect x="{{ vsVLTag.x }}" y="{{ vsVLTag.y }}" width="80" height="18" rx="4" fill="{{ vsTL.fill }}" stroke="{{ vsTL.stroke }}"></rect>
        <text x="{{ vsVLTag.tx }}" y="{{ vsVLTag.ty }}" text-anchor="middle" style="${MONO} font-size:10px; font-weight:700; letter-spacing:.6px; fill:{{ vsTL.color }};">{{ vsTL.text }}</text>
        <text x="${WASTE_CX}" y="${WASTE.y + WASTE.h + 20}" text-anchor="middle" style="${ESS} font-size:17px;">Waste Glass</text>
        <text x="${WASTE_CX}" y="${WASTE.y + WASTE.h + 37}" text-anchor="middle" style="${MONO} font-size:12px; font-weight:600; fill:#d6b03c;">{{ vsWasteTxt }}</text>
        <!-- live coil state (only while that coil is working) -->
        <g class="vs-halo" style="{{ vsLiveCoil }}">
          <text x="{{ vsLdrive.x }}" y="{{ vsLdrive.y }}" style="${MONO} font-size:11px; font-weight:700; letter-spacing:.6px; fill:#4d9dff;">{{ vsDriveTxt }}</text>
          <text x="{{ vsLsense.x }}" y="{{ vsLsense.y }}" style="${MONO} font-size:11px; font-weight:700; letter-spacing:.6px; fill:#46d39a;">{{ vsSenseTxt }}</text>
        </g>

        <!-- ================= component labels (Show Components) ================= -->
        <g style="{{ vsCompStyle }}">
          <g class="vs-halo" style="${LBL}"><path d="{{ vsLch.d }}" fill="none" stroke="var(--vs-lead)"></path><text x="{{ vsLch.x }}" y="{{ vsLch.y }}">Chamber · 3 cc</text><path d="{{ vsLbody.d }}" fill="none" stroke="var(--vs-lead)"></path><text x="{{ vsLbody.x }}" y="{{ vsLbody.y }}">Falling body</text><path d="{{ vsLdrive.d }}" fill="none" stroke="var(--vs-lead)"></path><text x="{{ vsLdrive.x }}" y="{{ vsLdrive.y }}" text-anchor="start">Driving coil <tspan style="${MONO} font-size:11px; font-weight:700; fill:#4d9dff;">{{ vsDriveTxt }}</tspan></text><path d="{{ vsLsense.d }}" fill="none" stroke="var(--vs-lead)"></path><text x="{{ vsLsense.x }}" y="{{ vsLsense.y }}" text-anchor="start">Sensing coil <tspan style="${MONO} font-size:11px; font-weight:700; fill:#46d39a;">{{ vsSenseTxt }}</tspan></text><path d="{{ vsLpt100.d }}" fill="none" stroke="var(--vs-lead)"></path><text x="{{ vsLpt100.x }}" y="{{ vsLpt100.y }}" text-anchor="start">PT100 · temperature</text><path d="{{ vsLpt.d }}" fill="none" stroke="var(--vs-lead)"></path><text x="{{ vsLpt.x }}" y="{{ vsLpt.y }}" text-anchor="start">Pressure transmitter</text><sc-for list="{{ vsTickLbls }}" as="k" hint-placeholder-count="2"><text x="{{ k.x }}" y="{{ k.y }}" text-anchor="middle" style="font-size:11px; fill:var(--mut); {{ k.st }}">{{ k.t }}</text></sc-for><text x="${PIV[0]}" y="${BASE_Y + 10.5}" text-anchor="middle" style="font-size:10px; font-weight:600; letter-spacing:.3px; fill:#c3d2e6; stroke:none;">Hinge (pivot)</text><text x="${r1((PIV[0] + ARC_P1[0]) / 2 - 20)}" y="${BASE_Y + 10.5}" text-anchor="middle" style="font-size:10px; font-weight:600; letter-spacing:.3px; fill:#c3d2e6; stroke:none;">Quadrant guide</text></g>
          <g style="${LBL}">
            <line x1="${BOT_CX - 4}" y1="258" x2="${BTX(676) + 26}" y2="258" stroke="var(--vs-lead)"></line>
            <text x="${BTX(676) + 30}" y="262">Sample side (oil)</text>
            <line x1="${BOT_CX - 4}" y1="{{ vsPistLblY }}" x2="${BTX(676) + 26}" y2="{{ vsPistLblY }}" stroke="var(--vs-lead)"></line>
            <text x="${BTX(676) + 30}" y="{{ vsPistLblY }}" dy="4">Floating piston</text>
            <line x1="${BOT_CX - 4}" y1="352" x2="${BTX(676) + 26}" y2="352" stroke="var(--vs-lead)"></line>
            <text x="${BTX(676) + 30}" y="356">Water side</text>
          </g>
          <text x="${CTL.x + CTL.w / 2}" y="${CTL.y - 8}" text-anchor="middle" style="${LBL}">Viscometer controller</text>
          <text x="${PDU.x + PDU.w / 2}" y="${PDU.y - 9}" text-anchor="middle" style="${LBL}">Pressure display</text>
          <text x="${BATH.x + BATH.w + 10}" y="${BATH.y + 62}" style="${LBL}">Thermostat bath</text>
          <g transform="translate(${LEG_X},590)">
            <line x1="0" y1="-4" x2="26" y2="-4" stroke="#0a0e16" stroke-width="8"></line><line x1="0" y1="-4" x2="26" y2="-4" stroke="#7e90b0" stroke-width="4"></line><line x1="0" y1="-4" x2="26" y2="-4" stroke="#d6b03c" stroke-width="2.4"></line>
            <text x="32" y="0" style="${SUB}">Sample tubing</text>
            <line x1="146" y1="-4" x2="172" y2="-4" stroke="#0a0e16" stroke-width="9"></line><line x1="146" y1="-4" x2="172" y2="-4" stroke="#2a3446" stroke-width="5.5" stroke-dasharray="2 2.4"></line>
            <text x="178" y="0" style="${SUB}">Bath hose</text>
            <line x1="264" y1="-4" x2="290" y2="-4" stroke="#5fb0ff" stroke-width="1.4" stroke-dasharray="1 6" stroke-linecap="round"></line>
            <text x="296" y="0" style="${SUB}">Signal cable</text>
          </g>
        </g>

        <!-- flow fronts + arrows -->
        <sc-if value="{{ vsFrontOn }}" hint-placeholder-val="{{ false }}"><circle cx="{{ vsFx }}" cy="{{ vsFy }}" r="4.6" fill="#ffe08a" stroke="#fff6d6"></circle></sc-if>
        <sc-if value="{{ vsFrontTlOn }}" hint-placeholder-val="{{ false }}"><circle cx="{{ vsFtx }}" cy="{{ vsFty }}" r="4.6" fill="#ffe08a" stroke="#fff6d6"></circle></sc-if>
        <sc-for list="{{ vsArrows }}" as="a" hint-placeholder-count="9">
          <path d="{{ a.d }}" fill="{{ a.col }}" stroke="#0a0e16" stroke-width="1" style="{{ a.style }}"></path>
        </sc-for>
      </svg>
    </div>

    <!-- ============ results (hidden until the first measurement starts, then slides in) ============ -->
    <div class="vs-side" style="{{ vsSideStyle }}">
      <div class="vs-res" style="width:var(--vs-resw); height:100%; box-sizing:border-box; margin-left:12px; display:flex; flex-direction:column; gap:6px; padding:12px 14px 10px; border-radius:14px; background:var(--panel2);">
        <div style="flex:0 0 auto; display:flex; align-items:baseline; justify-content:space-between; gap:8px;">
          <span style="font-size:15px; font-weight:600; color:var(--txt);">Pressure – Viscosity <span style="font-weight:400; color:var(--mut); font-size:13px;">· {{ vsTemp }} °C</span></span>
          <span style="font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--txt2);">{{ vsNPts }}</span>
        </div>
        <div ref="{{ vsGHost }}" style="flex:1 1 auto; min-height:130px; position:relative;">
        <svg sc-camel-view-box="{{ vsGBox }}" style="position:absolute; left:0; top:0; width:100%; height:100%; display:block; overflow:visible;">
          <sc-for list="{{ vsYt }}" as="g" hint-placeholder-count="5">
            <line x1="{{ vsG.x0 }}" y1="{{ g.y }}" x2="{{ vsG.x1 }}" y2="{{ g.y }}" stroke="var(--vs-grid)"></line>
            <text x="{{ vsG.tx }}" y="{{ g.ty }}" text-anchor="end" style="${MONO} font-size:13px; fill:var(--txt2);">{{ g.lbl }}</text>
          </sc-for>
          <sc-for list="{{ vsXt }}" as="g" hint-placeholder-count="6">
            <line x1="{{ g.x }}" y1="{{ vsG.y0 }}" x2="{{ g.x }}" y2="{{ vsG.y1 }}" stroke="var(--vs-grid)"></line>
            <text x="{{ g.x }}" y="{{ vsG.xl }}" text-anchor="middle" style="${MONO} font-size:13px; fill:var(--txt2);">{{ g.lbl }}</text>
          </sc-for>
          <line x1="{{ vsG.x0 }}" y1="{{ vsG.y1 }}" x2="{{ vsG.x1 }}" y2="{{ vsG.y1 }}" stroke="var(--vs-ax)" stroke-width="1.4"></line>
          <line x1="{{ vsG.x0 }}" y1="{{ vsG.y0 }}" x2="{{ vsG.x0 }}" y2="{{ vsG.y1 }}" stroke="var(--vs-ax)" stroke-width="1.4"></line>
          <sc-if value="{{ vsCurOn }}" hint-placeholder-val="{{ false }}">
            <line x1="{{ vsCurX }}" y1="{{ vsG.y0 }}" x2="{{ vsCurX }}" y2="{{ vsG.y1 }}" stroke="#4d9dff" stroke-width="1.4" stroke-dasharray="4 4" opacity=".85"></line>
          </sc-if>
          <sc-if value="{{ vsGLineOn }}" hint-placeholder-val="{{ false }}">
            <polyline points="{{ vsGLine }}" fill="none" stroke="#d6b03c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></polyline>
          </sc-if>
          <sc-if value="{{ vsNewOn }}" hint-placeholder-val="{{ false }}">
            <circle cx="{{ vsNew.cx }}" cy="{{ vsNew.cy }}" r="16" fill="#ffcf3f" opacity=".22"></circle>
          </sc-if>
          <sc-for list="{{ vsGPts }}" as="p" hint-placeholder-count="0">
            <circle cx="{{ p.cx }}" cy="{{ p.cy }}" r="{{ p.r }}" fill="{{ p.fill }}" stroke="#0a0e16" stroke-width="1.4"></circle>
          </sc-for>
          <sc-if value="{{ vsNewOn }}" hint-placeholder-val="{{ false }}">
            <text x="{{ vsNew.lx }}" y="{{ vsNew.ly }}" text-anchor="end" style="${MONO} font-size:14px; font-weight:700; fill:#ffcf3f;">{{ vsNew.lbl }}</text>
          </sc-if>
          <sc-if value="{{ vsGEmpty }}" hint-placeholder-val="{{ false }}">
            <text x="{{ vsG.cx }}" y="{{ vsG.cy }}" text-anchor="middle" style="font-family:'IBM Plex Sans',sans-serif; font-size:14px; fill:var(--mut);">Points appear here as they are measured</text>
          </sc-if>
          <text x="{{ vsG.cx }}" y="{{ vsG.xt }}" text-anchor="middle" style="font-family:'IBM Plex Sans',sans-serif; font-size:14px; font-weight:600; fill:var(--txt2);">Pressure (psig)</text>
          <text x="15" y="{{ vsG.yt }}" text-anchor="middle" transform="{{ vsYTitleT }}" style="font-family:'IBM Plex Sans',sans-serif; font-size:14px; font-weight:600; fill:var(--txt2);">Viscosity (cP)</text>
        </svg>
        </div>

        <div class="vs-tbl" style="flex:0 0 auto; display:flex; flex-direction:column; gap:1px; font-family:'IBM Plex Mono',monospace; font-size:14px; border-top:1px solid var(--line); padding-top:6px;">
          <div style="display:grid; grid-template-columns:28px 1.2fr 1fr 1fr; gap:6px; padding:0 10px 3px; font-family:'IBM Plex Sans',sans-serif; font-size:12.5px; font-weight:600; color:var(--mut);">
            <span>#</span><span>Pressure (psig)</span><span>Time (s)</span><span>Viscosity (cP)</span>
          </div>
          <sc-for list="{{ vsRows }}" as="r" hint-placeholder-count="6">
            <div class="vs-row" style="{{ r.style }}"><span style="color:var(--mut); font-size:12px;">{{ r.k }}</span><span>{{ r.p }}</span><span>{{ r.t }}</span><span style="font-weight:700;">{{ r.mu }}</span></div>
          </sc-for>
          <span class="vs-note" style="font-family:'IBM Plex Sans',sans-serif; font-size:11px; color:var(--mut); padding:3px 10px 0;">Illustrative values (correlation, not lab data)</span>
        </div>
      </div>
    </div>
  </div>

  <!-- controls: one primary action, the rest secondary -->
  <div style="flex:0 0 auto; display:flex; align-items:center; gap:8px 10px; flex-wrap:wrap;">
    <div class="pc-host" data-pc="StageViscSingle" data-pc-layout="bar" style="flex:1 1 100%; min-width:0;"></div>
    <!-- view tools (demonstration only) -->
    <div style="flex:0 0 auto; display:flex; align-items:center; gap:8px; margin-left:auto;">
    <button class="ui-btn ui-btn-ghost act" onclick="{{ vsComp }}" style="{{ vsCompBtn }}">{{ vsCompTxt }}</button>
    <div title="{{ vsInclTip }}" style="flex:0 0 auto; display:flex; align-items:center; gap:8px; height:36px; padding:0 12px; border-radius:10px; background:var(--panel2); border:1px solid var(--line2); box-sizing:border-box; {{ vsInclRow }}">
      <span style="font-size:12.5px; font-weight:600; color:var(--txt2);">Inclination</span>
      <input type="range" min="${INCL_MIN}" max="${INCL_MAX}" step="0.5" value="{{ vsIncl }}" oninput="{{ vsInclIn }}" disabled="{{ vsInclDis }}" style="width:110px; margin:0; accent-color:var(--blue); cursor:pointer;">
      <span style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:700; color:var(--txt); min-width:34px;">{{ vsInclTxt }}</span>
      <span class="vs-demo" style="font-size:11px; color:var(--mut); white-space:nowrap;">demo only</span>
    </div>
    </div>
  </div>
</div>`,
  logic: Component
});
})();
