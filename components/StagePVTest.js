/* component: StagePVTest */
(function () {
// 2026-09-30: Psat = 2,700 psig at 31.3 cc. 2,700 psig is NOT a measured point: the 6th measurement is
// taken at 2,500 psig (two-phase). Illustrative volumes lie exactly on two straight trends through
// (2,700 psig, 31.3 cc), so the line fitted to the 5 single-phase points (5,000-3,000 psig) and the line
// fitted to the 7 two-phase points (2,500-1,900 psig) intersect exactly at Psat:
//   above Psat: 5,000 psig / 30.0 cc -> 2,700 psig / 31.3 cc (single-phase compressibility)
//   below Psat: 31.3 cc + 0.003 cc/psi x (2,700 - P)            (two-phase expansion)
const PSAT_PV = [2700, 31.3];
const _vAbove = (p) => +(30.0 + (5000 - p) * (PSAT_PV[1] - 30.0) / (5000 - PSAT_PV[0])).toFixed(6);
const _vBelow = (p) => +(PSAT_PV[1] + (PSAT_PV[0] - p) * 0.003).toFixed(6);
const DATA = [
  [5000, _vAbove(5000)], [4500, _vAbove(4500)], [4000, _vAbove(4000)], [3500, _vAbove(3500)], [3000, _vAbove(3000)], [2500, _vBelow(2500)],
  [2400, _vBelow(2400)], [2300, _vBelow(2300)], [2200, _vBelow(2200)], [2100, _vBelow(2100)], [2000, _vBelow(2000)], [1900, _vBelow(1900)]
];
const BUBBLE_IDX = 5;   // first two-phase measurement (2,500 psig)
const FIT_SPLIT = 5;    // points 0-4 single-phase fit, points 5-11 two-phase fit
const NPTS = DATA.length;
// per-point lab cycle (unchanged order): set condition -> agitate A->B -> agitate B->A -> stabilize -> read -> record
// durations: tween values in seconds, wait values in ms; all scaled by PT() (PROCESS_SPEED_MULTIPLIER)
const T_SET = 5.0, T_SET_PAUSE = 600, T_A2B = 5.0, T_HOLD = 1200, T_B2A = 5.0, T_STAB = 5.0,
      T_READ = 2.4, T_REC = 1800, T_COUNT = 900, T_NEXT = 800, T_FIT = 6300, T_SHOW = 3500, T_RETURN = 5.0;
// sample line route (SVG units): Pump A port -> header -> Pump B port
const ROUTE_AB = [[1030, 215], [1030, 190], [866, 190], [866, 215]];
const ROUTE_BA = ROUTE_AB.slice().reverse();
const LINE_L = 214;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeIO = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const routePt = (route, s) => {
  let rem = Math.max(0, s);
  for (let k = 0; k < route.length - 1; k++) {
    const [x1, y1] = route[k], [x2, y2] = route[k + 1];
    const len = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    if (rem <= len || k === route.length - 2) {
      const f = len ? Math.min(1, rem / len) : 0;
      return [x1 + (x2 - x1) * f, y1 + (y2 - y1) * f];
    }
    rem -= len;
  }
  return route[route.length - 1];
};
// fixed bubble seeds (deterministic, no random jumps between renders)
const BUB_SEEDS = [
  { fx: .15, ph: .05, sp: 1.00, r: 1.9, th: .00 }, { fx: .72, ph: .38, sp: .82, r: 1.5, th: .08 },
  { fx: .44, ph: .66, sp: 1.15, r: 2.2, th: .16 }, { fx: .88, ph: .14, sp: .94, r: 1.3, th: .26 },
  { fx: .30, ph: .52, sp: .76, r: 1.7, th: .34 }, { fx: .60, ph: .86, sp: 1.08, r: 1.4, th: .44 },
  { fx: .08, ph: .27, sp: .88, r: 1.2, th: .54 }, { fx: .52, ph: .10, sp: 1.22, r: 2.0, th: .64 },
  { fx: .80, ph: .60, sp: .70, r: 1.6, th: .74 }, { fx: .36, ph: .92, sp: .98, r: 1.3, th: .84 }
];

const SKIP_PHASES = ['set', 'a2b', 'hold', 'b2a', 'stab', 'read', 'rec', 'next'];
// shared, read-only: the proven Validation PV cycle (timing, agitation route, bubble seeds) is
// reused by Differential Liberation (StageDiffLib) so both tests follow the same sequence.
window.PVT_PV = {
  T: { SET: T_SET, SET_PAUSE: T_SET_PAUSE, A2B: T_A2B, HOLD: T_HOLD, B2A: T_B2A, STAB: T_STAB, READ: T_READ,
       REC: T_REC, COUNT: T_COUNT, NEXT: T_NEXT, FIT: T_FIT, SHOW: T_SHOW, RETURN: T_RETURN },
  ROUTE_AB: ROUTE_AB, ROUTE_BA: ROUTE_BA, LINE_L: LINE_L, BUB_SEEDS: BUB_SEEDS, SKIP_PHASES: SKIP_PHASES,
  routePt: routePt, easeIO: easeIO, clamp01: clamp01
};

// Test configuration. Validation uses DEF_CFG (30 cc charge) unchanged; another test (Differential
// Liberation Initial PV, 80 cc) passes its own dataset through the pv-config prop and runs this same engine.
const DEF_CFG = {
  data: DATA, bubbleIdx: BUBBLE_IDX, start: [5000, 30.0], dec: 1, pu: 'psig',
  xMin: 29.6, xMax: 33.9, yMin: 1750, yMax: 5150, xTicks: [30, 31, 32, 33], xTickDec: 0, yTicks: [5000, 4000, 3000, 2000],
  psatLabel: '2,700 psig @ 31.3 cc', psatPTxt: '2,700 psig', psatVolTxt: '31.3 cc', psatBoxW: 150, boxW: 96,
  connectPts: false,  // measured points are plotted as separate points (no point-to-point trace)
  // Validation: two regional straight-line fits (single-phase / two-phase), drawn over their data, then
  // extended to their intersection; Psat is read from that intersection (not from a measured point)
  fitSplit: FIT_SPLIT, psatP: PSAT_PV[0], psatMarkTitle: 'Fitted-line intersection', psatMarkTxt: 'Psat = 2700 psig',
  psatAxisTxt: '2,700', fitMs: 12000
};

class Component extends DCLogic {
  cfg() { return (this.props && this.props.pvConfig) || DEF_CFG; }
  state = { pvN: 0, pvCount: 0, pvRunning: false, pvPressure: 5000, pvVolume: 30.0, pvConfirmed: false, pvReturned: false, pvPhase: 'idle', pvStep: 0, pvXfer: 0,
    pvAgit: 0, pvFront: 0, pvTail: 0, pvFlowD: 0, pvSig: 0, pvFit: false, pvSetDone: false, pvTick: 0 };

  componentWillUnmount() { this.stop(); }
  componentDidMount() { this.syncHost(); }
  componentDidUpdate() { this.syncHost(); }
  // host control (embedded use only): run-key starts a run, reset-key resets, show-done shows the finished test;
  // on-sync mirrors the live P / V / point count to the host, on-done fires once the cell is back at the start condition
  syncHost() {
    const pr = this.props || {};
    // embedded use: a new test configuration (another DL stage) starts from its own clean condition
    if (pr.pvConfig !== this._cfgRef) {
      const first = this._cfgRef === undefined && !this._cfgSeen; this._cfgSeen = true; this._cfgRef = pr.pvConfig;
      if (!first) { this._shownDone = false; this._runKey = undefined; this.pvReset(); }
    }
    if (pr.resetKey != null && pr.resetKey !== this._resetKey) { this._resetKey = pr.resetKey; this.pvReset(); }
    if (pr.showDone && !this._shownDone) { this._shownDone = true; this.pvShowDone(); }
    if (!pr.showDone) this._shownDone = false;
    if (pr.runKey && pr.runKey !== this._runKey) { this._runKey = pr.runKey; this.pvReset(); this.pvStart(); }
    if (pr.onSync) {
      const st = this.state, k = [Math.round(st.pvPressure * 10), Math.round(st.pvVolume * 1e4), st.pvN, st.pvCount, st.pvPhase, st.pvConfirmed, st.pvReturned, st.pvRunning].join('|');
      if (k !== this._syncK) { this._syncK = k; pr.onSync(st); }
    }
  }
  pvShowDone() {
    const C = this.cfg(), NPTS = C.data.length;
    this.stop();
    this.setState({ pvN: NPTS, pvCount: NPTS, pvRunning: false, pvPressure: C.start[0], pvVolume: C.start[1], pvConfirmed: true, pvReturned: true,
      pvPhase: 'done', pvStep: NPTS - 1, pvXfer: 0, pvAgit: 0, pvFront: 0, pvTail: 0, pvFlowD: 0, pvSig: 0, pvFit: true, pvSetDone: true });
  }
  stop() {
    (this.rafs || []).forEach((id) => PCLK.clearInterval(id)); this.rafs = [];
    (this.t || []).forEach(PCLK.clearTimeout); this.t = [];
    if (this.ticker) { PCLK.clearInterval(this.ticker); this.ticker = null; }
  }
  // interval-driven so the automatic sequence always completes, even when
  // requestAnimationFrame is throttled (background tab / hidden frame)
  tween(dur, from, to, onT, done, ease) {
    this.rafs = this.rafs || [];
    const t0 = PCLK.now();
    const id = PCLK.setInterval(() => {
      const p = Math.min(1, (PCLK.now() - t0) / PT(dur * 1000));
      const e = ease ? easeIO(p) : p;
      onT(from + (to - from) * e);
      if (p >= 1) {
        PCLK.clearInterval(id);
        this.rafs = (this.rafs || []).filter((x) => x !== id);
        if (done) done();
      }
    }, 16);
    this.rafs.push(id);
  }
  // visual clock for bubble motion: runs only while the test is running
  startTicker() {
    if (this.ticker) return;
    this.bub = this.bub || 0;
    this.lastTick = PCLK.now();
    this.ticker = PCLK.setInterval(() => {
      const now = PCLK.now();
      const dt = Math.min(0.1, (now - this.lastTick) / 1000);
      this.lastTick = now;
      const ag = this.state.pvAgit || 0;
      // slow rise when settled, lively while agitated
      this.bub += dt * (0.06 + 0.42 * ag);
      this.setState({ pvTick: now });
    }, 33);
  }

  pvStart() {
    if (this.state.pvRunning || this.state.pvReturned) return;
    this.setState({ pvRunning: true });
    this.startTicker();
    this.runPoint(0);
  }
  wait(ms, fn) { this.t = this.t || []; this.t.push(PCLK.setTimeout(fn, PT(ms))); }
  // every point follows the full physical sequence before it is recorded
  runPoint(i) {
    const C = this.cfg(), DATA = C.data, NPTS = DATA.length;
    const from = i === 0 ? C.start : DATA[i - 1];
    const to = DATA[i];
    this.setState({ pvStep: i, pvPhase: 'set', pvSetDone: false });
    // 1-2 : pressure is lowered while the sample expands (one coupled, smooth move)
    this.tween(i === 0 ? T_SET * 0.4 : T_SET, 0, 1, (f) => this.setState({
      pvPressure: from[0] + (to[0] - from[0]) * f,
      pvVolume: from[1] + (to[1] - from[1]) * f
    }), () => {
      this.setState({ pvPressure: to[0], pvVolume: to[1], pvSetDone: true });
      this.wait(T_SET_PAUSE, () => {
        // 3 : agitate A -> B
        this.stroke('a2b', () => {
          this.setState({ pvPhase: 'hold' });
          this.wait(T_HOLD, () => {
            // 4 : return B -> A
            this.stroke('b2a', () => {
              // 5 : stabilize - dispersed gas settles, motion dies out
              this.setState({ pvPhase: 'stab' });
              this.tween(T_STAB, 1, 0, (a) => this.setState({ pvAgit: a }), () => {
                // 6 : sensor reading travels to the control box and computer
                this.setState({ pvAgit: 0, pvPhase: 'read', pvSig: 0 });
                this.tween(T_READ, 0, 1, (g) => this.setState({ pvSig: g }), () => {
                  // 7-8 : table row + graph point, counter after the point is on the chart
                  this.setState({ pvSig: 0, pvPhase: 'rec', pvN: i + 1 });
                  this.wait(T_COUNT, () => this.setState({ pvCount: i + 1 }));
                  this.wait(T_REC, () => {
                    if (i < NPTS - 1) {
                      // 9 : continue to the next pressure point
                      this.setState({ pvPhase: 'next' });
                      this.wait(T_NEXT, () => this.runPoint(i + 1));
                    } else this.fitLines();
                  });
                });
              });
            });
          });
        });
      });
    }, true);
  }
  // one agitation stroke: fluid front leaves the source pump, fills the line
  // section by section, volume transfers, then the tail clears into the receiving pump
  stroke(dir, done) {
    const x0 = dir === 'a2b' ? 0 : 1, x1 = 1 - x0;
    const ag0 = this.state.pvAgit || 0;
    this.setState({ pvPhase: dir, pvFront: 0, pvTail: 0, pvFlowD: 0, pvXfer: x0 });
    this.tween(dir === 'a2b' ? T_A2B : T_B2A, 0, 1, (u) => {
      const front = easeIO(clamp01(u / 0.18));
      const tail = easeIO(clamp01((u - 0.84) / 0.16));
      const xp = easeIO(clamp01((u - 0.12) / 0.76));
      const ag = dir === 'a2b' ? Math.max(ag0, easeIO(clamp01(u / 0.3))) : 1;
      this.setState({ pvFront: front, pvTail: tail, pvXfer: x0 + (x1 - x0) * xp, pvAgit: ag, pvFlowD: front + 2.2 * xp + tail });
    }, () => {
      this.setState({ pvFront: 0, pvTail: 0, pvFlowD: 0, pvXfer: x1 });
      done();
    });
  }
  // after all 12 points: draw both fit lines, locate the intersection, then report Psat
  fitLines() {
    this.setState({ pvPhase: 'fit', pvFit: true });
    this.wait(this.cfg().fitMs || T_FIT, () => {
      this.setState({ pvConfirmed: true, pvPhase: 'psat' });
      this.wait(T_SHOW, () => this.autoReturn());
    });
  }
  autoReturn() {
    const p0 = this.state.pvPressure, v0 = this.state.pvVolume;
    this.setState({ pvPhase: 'return' });
    const S0 = this.cfg().start;
    this.tween(T_RETURN, 0, 1, (f) => this.setState({ pvPressure: p0 + (S0[0] - p0) * f, pvVolume: v0 + (S0[1] - v0) * f }), () => {
      if (this.ticker) { PCLK.clearInterval(this.ticker); this.ticker = null; }
      this.setState({ pvReturned: true, pvRunning: false, pvPhase: 'done', pvPressure: S0[0], pvVolume: S0[1] });
      if (this.props && this.props.onDone) this.props.onDone();
    }, true);
  }
  // skip the rest of the current point: finish it with its exact final values,
  // record it once, then start the next point (or the Psat determination) from step 1
  pvSkip() {
    const st = this.state;
    if (!st.pvRunning || st.pvReturned || SKIP_PHASES.indexOf(st.pvPhase) < 0) return;
    const i = st.pvStep || 0;
    this.stop();
    const C = this.cfg(), DATA = C.data, NPTS = DATA.length;
    const to = DATA[i];
    this.setState({ pvPressure: to[0], pvVolume: to[1], pvXfer: 0, pvAgit: 0, pvFront: 0, pvTail: 0, pvFlowD: 0, pvSig: 0,
      pvSetDone: true, pvN: Math.max(st.pvN || 0, i + 1), pvCount: Math.max(st.pvCount || 0, i + 1), pvPhase: 'rec' });
    this.startTicker();
    if (i < NPTS - 1) this.runPoint(i + 1); else this.fitLines();
  }
  /* ---- shared procedure panel (ProcCtl.js): stages = 12 pressure points, Psat, return ---- */
  pcStage() {
    const st = this.state, N = this.cfg().data.length;
    if (st.pvReturned) return N + 1;
    if (!st.pvRunning) return 0;
    if (st.pvPhase === 'return') return N + 1;
    if (st.pvPhase === 'fit' || st.pvPhase === 'psat') return N;
    return st.pvStep || 0;
  }
  pcInfo() {
    if (this.props && this.props.embedded) return null;
    const st = this.state, C = this.cfg(), D = C.data, N = D.length + 2, k = this.pcStage();
    const PH = ['set', 'a2b', 'hold', 'b2a', 'stab', 'read', 'rec', 'next'];
    const title = k < D.length ? 'Point ' + (k + 1) + ' of ' + D.length + ' · ' + Number(D[k][0]).toLocaleString('en-US') + ' ' + C.pu
      : k === D.length ? 'Determine the bubble point (Psat)' : 'Return to the initial condition';
    const pz = PCLK.paused(), running = st.pvRunning && !st.pvReturned;
    const ix = PH.indexOf(st.pvPhase);
    return { N, k, title, q: '', unit: 'Stage',
      status: st.pvReturned ? 'complete' : running ? (pz ? (this._pcReady ? 'ready' : 'paused') : 'running') : 'ready',
      allDone: !!st.pvReturned, frac: running && k < D.length && ix >= 0 ? (ix + 0.5) / PH.length : null, frozen: this._pcReady,
      canPrev: k > 0, canNext: k < N - 1, canRestart: running || !!st.pvReturned,
      runLabel: !running && !st.pvReturned ? 'Start PV Test' : null, again: 'Run PV Test Again', reset: 'Reset PV Test', resetDisabled: !running && !st.pvReturned && !(st.pvN > 0) };
  }
  pcSeek(k) {
    this._pcReady = false;
    if (k <= 0) { PCLK.clearAll(); PCLK.resume(); this.pvReset(); return; }
    PC.seek(() => this.pvReset(), () => this.pvStart(), () => this.pcStage() >= k || !!this.state.pvReturned);
    if (this.state.pvReturned) PCLK.resume(); else this._pcReady = true;
  }
  pcAct(a) {
    const st = this.state, k = this.pcStage(), running = st.pvRunning && !st.pvReturned;
    if (a === 'run' || a === 'resume') { this._pcReady = false; if (running) PCLK.resume(); else if (!st.pvReturned) { PCLK.resume(); this.pvStart(); } }
    else if (a === 'pause') { if (running) { this._pcReady = false; PCLK.pause(); } }
    else if (a === 'restart') this.pcSeek(st.pvReturned ? this.cfg().data.length + 1 : k);
    else if (a === 'prev') this.pcSeek(k - 1);
    else if (a === 'next') this.pcSeek(k + 1);
    else if (a === 'again') { this.pcSeek(0); this.pvStart(); }
    else if (a === 'reset') { this._pcReady = false; PCLK.clearAll(); PCLK.resume(); this.pvReset(); }
  }
  pvReset() {
    this.stop();
    this.bub = 0;
    const S0 = this.cfg().start;
    this.setState({ pvN: 0, pvCount: 0, pvRunning: false, pvPressure: S0[0], pvVolume: S0[1], pvConfirmed: false, pvReturned: false, pvPhase: 'idle', pvStep: 0, pvXfer: 0,
      pvAgit: 0, pvFront: 0, pvTail: 0, pvFlowD: 0, pvSig: 0, pvFit: false, pvSetDone: false, pvTick: 0 });
  }

  renderVals() {
    const C = this.cfg(), DATA = C.data, NPTS = DATA.length, BUBBLE_IDX = C.bubbleIdx, dec = C.dec, pu = C.pu;
    const embedded = !!(this.props && this.props.embedded);
    /* 2026-09-28 layout: the standalone page uses the same packed setup geometry as the embedded
       one (Computer / Control Box / cell centred as one group, pump labels below the rack) */
    const PK = true;
    if (C !== DEF_CFG && !this._cfgInit) { this._cfgInit = true; this.state.pvPressure = C.start[0]; this.state.pvVolume = C.start[1]; }
    const _fmtP = (p) => Number(p).toLocaleString('en-US') + ' ' + pu;
    const _psatTxt = C.psatPTxt || _fmtP(DATA[BUBBLE_IDX][0]);
    const n = this.state.pvN || 0;
    const busy = !!this.state.pvRunning;
    const confirmed = !!this.state.pvConfirmed;
    const returned = !!this.state.pvReturned;
    const pressure = this.state.pvPressure === undefined ? C.start[0] : this.state.pvPressure;
    const volume = this.state.pvVolume === undefined ? C.start[1] : this.state.pvVolume;

    const pvPressureText = Math.round(pressure).toLocaleString('en-US') + ' ' + pu;
    const pvVolumeText = volume.toFixed(dec) + ' cc';
    const pvPressureBox = pvPressureText;
    const pvVolumeBox = pvVolumeText;

    // Pump A : sample column hangs from the top port, piston rides directly beneath it.
    // during agitation part of the sample is displaced into Pump B and comes back.
    const phase = this.state.pvPhase || 'idle';
    const xfer = Math.max(0, Math.min(1, this.state.pvXfer || 0));
    // true-scale fill: pump capacity 100 cc. usable bore = 182 px (y 219-401) minus the 9 px
    // floating piston = 173 px, so 100 cc fills the bore with the piston seated at the bottom.
    const PUMP_CAP = 100, BORE_H = 173;
    const _frac = Math.max(0, Math.min(1, volume / PUMP_CAP));
    const _hTotal = BORE_H * _frac;
    const _h = _hTotal * (1 - xfer);
    const _hB = _hTotal * xfer;
    const pvSampleH = _h.toFixed(1);
    const pvPistonY = (219 + _h).toFixed(1);
    const pvSampleTrans = { transition: 'height .09s linear, y .09s linear, cy .09s linear' };
    const pvVolumeAText = (volume * (1 - xfer)).toFixed(Math.min(dec, 2)) + ' cc';
    const pvVolumeBText = (volume * xfer).toFixed(Math.min(dec, 2)) + ' cc';
    // transfer-line flow: direction reverses physically between the two half-cycles
    const _xferOn = phase === 'a2b' || phase === 'b2a';
    const pvXferFlowStyle = { opacity: _xferOn ? 1 : 0, transition: 'opacity .35s ease' };
    // arrow points in the direction the sample is travelling (A is right, B is left)
    const pvXferArrowD = phase === 'b2a' ? 'M 980 184 l 12 6 l -12 6 Z' : 'M 916 184 l -12 6 l 12 6 Z';
    const pvPistonLabelY = (223 + _h).toFixed(1);
    const pvPistonLabelText = (226.5 + _h).toFixed(1);

    // gas evolves out of the oil once the cell drops to / below the bubble point
    const PSAT = C.psatP || DATA[BUBBLE_IDX][0];
    const SPLIT = C.fitSplit;   // defined: regional fits, no measured point is flagged as Psat
    const _isAbove = (i) => (SPLIT != null ? i < SPLIT : i <= BUBBLE_IDX);
    const _isPsatPt = (i) => SPLIT == null && i === BUBBLE_IDX;
    const PMIN = DATA[NPTS - 1][0];
    const _gt = n > 0 ? Math.max(0, Math.min(1, (PSAT - pressure) / (PSAT - PMIN))) : 0;
    // at Psat a first tiny indication (~1.5%), growing progressively to ~14% at the lowest pressure
    let gasFrac = (n > 0 && pressure <= PSAT + 1) ? 0.015 + 0.125 * _gt : 0;
    // optional (embedded configs only): the return leg ends as single-phase liquid at the start condition
    if (C.liquidAtStart && (phase === 'return' || returned)) {
      const _rt = Math.max(0, Math.min(1, (pressure - PMIN) / Math.max(1, C.start[0] - PMIN)));
      gasFrac *= returned ? 0 : 1 - _rt;
    }
    // while the sample is being agitated the free gas is dispersed with the fluid
    // and re-settles at the top once the cell stabilizes
    const _agit = clamp01(this.state.pvAgit || 0);
    const _settle = 1 - 0.75 * _agit;
    const _gh = _h * gasFrac * _settle;
    const pvGasH = _gh.toFixed(1);
    const pvLiquidY = (219 + _gh).toFixed(1);
    const pvLiquidH = (_h - _gh).toFixed(1);
    const _ghB = _hB * gasFrac * _settle;
    const pvBGasH = _ghB.toFixed(1);
    const pvBLiquidY = (219 + _ghB).toFixed(1);
    const pvBLiquidH = Math.max(0, _hB - _ghB).toFixed(1);
    const pvBPistonY = (219 + _hB).toFixed(1);
    const pvInterfaceStyle = { opacity: gasFrac > 0 ? 0.55 * _settle : 0, transition: 'opacity .35s ease, y .12s linear' };
    const pvBubbleGasStyle = { opacity: gasFrac > 0 ? 1 : 0, transition: 'opacity .35s ease' };
    // dissolved gas in solution : faint micro-bubble shimmer, strongest while single-phase
    const pvDissStyle = { animation: 'pvtdiss calc(3.4s * var(--pm, 1)) ease-in-out infinite', pointerEvents: 'none',
      transform: gasFrac > 0 ? 'scaleY(.5)' : 'none', transformOrigin: 'center' };
    // evolved-gas bubbles: few and slow just below Psat, more with falling pressure,
    // dispersed and lively while agitated, calming down during stabilization.
    // they rise inside the liquid only and fade in/out, so none pop or leave the fluid.
    const _gasOn = gasFrac > 0;
    const _bl = _gasOn ? Math.min(1, 0.16 + 0.44 * _gt + 0.5 * _agit) : 0;
    const _clk = this.bub || 0;
    const _bubs = (x0, top, bot, off) => BUB_SEEDS.map((sd, k) => {
      const H = bot - top;
      const f = (((sd.ph + off + _clk * sd.sp) % 1) + 1) % 1;
      const vis = H > 10 ? clamp01((_bl - sd.th) / 0.12) * Math.min(1, f / 0.2, (1 - f) / 0.2) : 0;
      const x = Math.max(x0 + 3, Math.min(x0 + 33, x0 + 5 + sd.fx * 26 + Math.sin(_clk * 6.5 + k * 1.7) * (0.5 + 2.2 * _agit)));
      const y = bot - 3.5 - f * (H - 7);
      return { x: x.toFixed(1), y: y.toFixed(1), r: sd.r, o: (0.8 * vis).toFixed(2) };
    });
    const pvBubsA = _bubs(1012, 219 + _gh, 219 + _h, 0);
    const pvBubsB = _bubs(848, 219 + _ghB, 219 + _hB, 0.37);

    // sample in the connecting line: continuous band between the tail and the advancing front
    const _route = phase === 'b2a' ? ROUTE_BA : ROUTE_AB;
    const pvRouteD = 'M ' + _route.map((p) => p[0] + ' ' + p[1]).join(' L ');
    const _fl = LINE_L * clamp01(this.state.pvFront || 0);
    const _tl = LINE_L * clamp01(this.state.pvTail || 0);
    const _band = _xferOn ? Math.max(0, _fl - _tl) : 0;
    const pvFluidDash = '0 ' + _tl.toFixed(1) + ' ' + _band.toFixed(1) + ' ' + (LINE_L + 20);
    const pvFluidStyle = { opacity: _band > 0.5 ? 1 : 0 };
    // specks / gas bubbles carried with the flow (only inside the filled section)
    const _D = LINE_L * (this.state.pvFlowD || 0);
    const pvLineSpecks = [0, 1, 2, 3, 4, 5, 6].map((k) => {
      const sp = ((k * LINE_L / 7 + _D) % LINE_L + LINE_L) % LINE_L;
      const inside = _band > 0.5 && sp > _tl + 3 && sp < _fl - 3;
      const gas = _gasOn && k % 2 === 0;
      const pt = routePt(_route, sp);
      return { x: pt[0].toFixed(1), y: pt[1].toFixed(1), r: gas ? 1.7 : 1.05,
        fill: gas ? '#e2fff2' : '#fff3c4', o: inside ? (gas ? 0.95 : 0.8) : 0 };
    });
    // leading edge of the sample while it advances through the line
    const _fp = routePt(_route, _fl);
    const pvSlugX = _fp[0].toFixed(1);
    const pvSlugY = _fp[1].toFixed(1);
    const _fr = this.state.pvFront || 0;
    const pvSlugTrans = { opacity: (_xferOn && _fr > 0.02 && _fr < 0.995) ? 1 : 0, transition: 'opacity .3s ease', filter: 'drop-shadow(0 0 4px #ffcf3f)' };
    const _phase = gasFrac === 0 ? 'above' : (gasFrac <= 0.02 ? 'at' : 'below');
    const pvPhaseText = _phase === 'above' ? 'LIQUID \u00b7 GAS IN SOLUTION' : _phase === 'at' ? 'BUBBLE POINT' : 'LIQUID + GAS';
    const pvPhaseColor = _phase === 'above' ? 'var(--cap2)' : _phase === 'at' ? 'var(--red)' : 'var(--grn)';

    const _stepNo = ('0' + ((this.state.pvStep || 0) + 1)).slice(-2);
    const _lastRec = n > 0 ? DATA[n - 1] : null;
    const pvSeqText = phase === 'set' ? ('Setting Point ' + _stepNo)
      : phase === 'a2b' ? 'Agitating Sample \u2014 A to B'
      : phase === 'hold' ? 'Transfer A to B Complete'
      : phase === 'b2a' ? 'Agitating Sample \u2014 B to A'
      : phase === 'stab' ? 'Stabilizing'
      : phase === 'read' ? ('Reading Point ' + _stepNo)
      : ((phase === 'rec' || phase === 'next') && _lastRec) ? ('Point ' + _stepNo + ' Recorded \u2014 ' + _lastRec[0].toLocaleString('en-US') + ' ' + pu + ' / ' + _lastRec[1].toFixed(dec) + ' cc')
      : phase === 'fit' ? 'Fitting Lines \u2014 Locating Psat'
      : phase === 'psat' ? 'Bubble Point Determined \u2014 ' + _psatTxt
      : phase === 'return' ? 'Returning to Initial Condition'
      : returned ? 'Test Complete' : 'Ready';

    const _to = DATA[this.state.pvStep || 0];
    const _stepHint = phase === 'set' ? (this.state.pvSetDone
        ? ('Pressure reached \u00b7 ' + _to[0].toLocaleString('en-US') + ' ' + pu + ' \u00b7 sample volume ' + _to[1].toFixed(dec) + ' cc')
        : ('Step 1\u20132 / 9 \u00b7 Reducing pressure and allowing sample expansion'))
      : phase === 'a2b' ? 'Step 3 / 9 \u00b7 Agitating sample from Pump A to Pump B'
      : phase === 'hold' ? 'Transfer A \u2192 B complete \u00b7 sample held in Pump B'
      : phase === 'b2a' ? 'Step 4 / 9 \u00b7 Returning sample from Pump B to Pump A'
      : phase === 'stab' ? 'Step 5 / 9 \u00b7 Stabilizing sample at the selected pressure'
      : phase === 'read' ? 'Step 6 / 9 \u00b7 Reading pressure and volume from the cell'
      : phase === 'rec' ? 'Step 7\u20138 / 9 \u00b7 Recording point in the table and on the graph'
      : phase === 'next' ? 'Step 9 / 9 \u00b7 Continuing to the next pressure point'
      : phase === 'fit' ? 'All ' + NPTS + ' points recorded \u00b7 fitting above- and below-Psat lines'
      : phase === 'psat' ? 'Intersection of the two fitted lines = Psat (bubble point)'
      : phase === 'return' ? 'Returning the cell to the initial condition'
      : pvSeqText;

    const pvCellTag = busy ? (pvSeqText + ' \u00b7 ' + pvPressureText) : returned ? 'Returned \u00b7 ' + pvPressureText : 'Stable \u00b7 ' + pvPressureText;
    // optional (embedded configs only): cell temperature shown with the pressure, e.g. Separator Test 114 / 35 C
    const pvCellTagT = C.tempTxt ? pvCellTag + ' \u00b7 ' + C.tempTxt : pvCellTag;
    const _cellGood = !busy;
    const pvCellTagColor = _cellGood ? 'var(--grn)' : 'var(--accb3)';
    const pvCellTagBg = _cellGood ? 'rgba(29,138,90,.10)' : 'rgba(47,111,208,.10)';
    const pvCellTagBorder = _cellGood ? 'rgba(29,138,90,.30)' : 'rgba(47,111,208,.32)';

    const _ang = (-140 + 100 * Math.max(0, Math.min(1, (C.start[0] - pressure) / (C.start[0] - DATA[NPTS - 1][0])))) * Math.PI / 180;
    const pvNeedleX = (948 + 11 * Math.cos(_ang)).toFixed(1);
    const pvNeedleY = (240 + 11 * Math.sin(_ang)).toFixed(1);
    const pvNeedleTrans = { transition: 'x2 .15s linear, y2 .15s linear' };

    const _sig = phase === 'read' ? clamp01(this.state.pvSig || 0) : 0;
    const _sOn = phase === 'read';
    const pvSensorPulse = { opacity: _sOn && _sig < 0.3 ? Math.sin(Math.PI * _sig / 0.3).toFixed(2) : 0 };
    const _hp = clamp01((_sig - 0.18) / 0.36), _vp = clamp01((_sig - 0.62) / 0.28);
    const _hOn = _sOn && _sig > 0.18 && _sig < 0.56, _vOn = _sOn && _sig > 0.62 && _sig < 0.92;
    const _hx = (100 - 100 * _hp).toFixed(1), _vy = (100 - 100 * _vp).toFixed(1);
    const pvSigHStyle = 'width:100%; height:1.5px; background:' +
      (_hOn ? 'linear-gradient(90deg,transparent calc(' + _hx + '% - 1px),#46e0ff calc(' + _hx + '% - 1px),#46e0ff calc(' + _hx + '% + 9px),transparent calc(' + _hx + '% + 9px)),' : '') +
      'repeating-linear-gradient(90deg,var(--blue) 0 4px,transparent 4px 8px);' + (_hOn ? ' filter:drop-shadow(0 0 3px #46e0ff);' : '');
    const pvSigVStyle = 'flex:0 0 auto; align-self:center; width:1.5px; height:18px; background:' +
      (_vOn ? 'linear-gradient(180deg,transparent calc(' + _vy + '% - 1px),#46e0ff calc(' + _vy + '% - 1px),#46e0ff calc(' + _vy + '% + 7px),transparent calc(' + _vy + '% + 7px)),' : '') +
      'repeating-linear-gradient(180deg,var(--blue) 0 4px,transparent 4px 8px);' + (_vOn ? ' filter:drop-shadow(0 0 3px #46e0ff);' : '');
    const _boxOn = _sOn && _sig > 0.5 && _sig < 0.8;
    const _disp = 'min-width:0; background:#06101e; border:1px solid ' + (_boxOn ? '#46d39a' : '#1d3350') + '; border-radius:4px; padding:5px 8px; text-align:right; transition:border-color .3s ease, box-shadow .3s ease;' + (_boxOn ? ' box-shadow:0 0 6px rgba(70,211,154,.45);' : '');
    const pvDispPStyle = _disp, pvDispVStyle = _disp;
    const pvCompStyle = (embedded ? 'width:100px; height:78px; ' : '') + 'transition:filter .3s ease;' + (_sOn && _sig > 0.86 ? ' filter:drop-shadow(0 0 5px rgba(70,211,154,.85));' : '');

    const xMin = C.xMin, xMax = C.xMax, yMin = C.yMin, yMax = C.yMax;
    const left = 56, top = 14, w = 368, h = 310;
    const px = (v) => (left + (v - xMin) / (xMax - xMin) * w).toFixed(1);
    const py = (p) => (top + (1 - (p - yMin) / (yMax - yMin)) * h).toFixed(1);

    const pvYTicks = C.yTicks.map((p) => ({ y: py(p), label: p.toLocaleString('en-US') }));
    const pvXTicks = C.xTicks.map((v) => ({ x: px(v), label: v.toFixed(C.xTickDec) }));

    const revealed = DATA.slice(0, n);
    const pvGraphPoints = revealed.map(([p, v], i) => ({
      x: px(v), y: py(p), r: _isPsatPt(i) && confirmed ? 5.5 : 4,
      fill: 'var(--panel2)',
      stroke: (_isPsatPt(i) && confirmed) ? 'var(--red)' : (_isAbove(i) ? 'var(--blue)' : 'var(--amb)'),
      style: 'transform-box:fill-box; transform-origin:center; animation:pvtpin calc(.7s * var(--pm, 1)) ease-out;'
    }));
    // expanding ring around the point that was just recorded
    const pvNewPtOn = phase === 'rec' && n > 0;
    const _np = n > 0 ? DATA[n - 1] : DATA[0];
    const pvNewPtX = px(_np[1]), pvNewPtY = py(_np[0]);
    const pvNewPtStroke = _isAbove(n - 1) ? 'var(--blue)' : 'var(--amb)';
    const pvNewPtStyle = { transformBox: 'fill-box', transformOrigin: 'center', animation: 'pvtring calc(1.1s * var(--pm, 1)) ease-out 2 both' };

    // live P-V trace: joins the recorded points as each one is added (above-Psat segment blue,
    // below-Psat segment amber, same colours as the points); the fit lines below still locate Psat.
    const _ptStr = (arr) => arr.map(([p, v]) => px(v) + ',' + py(p)).join(' ');
    const pvLineAbove = C.connectPts && n > 1 ? _ptStr(revealed.slice(0, BUBBLE_IDX + 1)) : '';
    const pvLineBelow = C.connectPts && n > BUBBLE_IDX + 1 ? _ptStr(revealed.slice(BUBBLE_IDX)) : '';

    const linfit = (pts) => {
      const cnt = pts.length, sx = pts.reduce((a, [, v]) => a + v, 0), sy = pts.reduce((a, [p]) => a + p, 0);
      const sxy = pts.reduce((a, [p, v]) => a + p * v, 0), sxx = pts.reduce((a, [, v]) => a + v * v, 0);
      const m = (cnt * sxy - sx * sy) / (cnt * sxx - sx * sx);
      const b = (sy - m * sx) / cnt;
      return { m, b };
    };
    let pvFitAbove = '', pvFitBelow = '', pvFitAboveExt = '', pvFitBelowExt = '', pvShowBubbleMark = false;
    const _len = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
    let _lA = 640, _lB = 640, _lAe = 0, _lBe = 0, _gLen = 0;
    let pvBubbleX = px(DATA[BUBBLE_IDX][1]), pvBubbleY = py(DATA[BUBBLE_IDX][0]);
    if (n >= NPTS && this.state.pvFit && SPLIT != null) {
      // regional least-squares fits: single-phase points only / two-phase points only
      const aboveFit = linfit(DATA.slice(0, SPLIT));
      const belowFit = linfit(DATA.slice(SPLIT, NPTS));
      const vI = (belowFit.b - aboveFit.b) / (aboveFit.m - belowFit.m);
      const pI = aboveFit.m * vI + aboveFit.b;
      const PA = (v) => aboveFit.m * v + aboveFit.b, PB = (v) => belowFit.m * v + belowFit.b;
      const OV = 0.12;   // short overshoot (cc) so the two lines visibly cross
      const vA0 = DATA[0][1], vA1 = DATA[SPLIT - 1][1], vB0 = DATA[SPLIT][1], vB1 = DATA[NPTS - 1][1];
      // optional per-config overshoot (Separator Test final PV has a very steep single-phase line)
      const OVA = C.fitOVA != null ? C.fitOVA : OV, OVB = C.fitOVB != null ? C.fitOVB : OV;
      const vAe = vI + OVA * Math.sign(vI - vA1), vBe = vI + OVB * Math.sign(vI - vB0);
      const xy = (v, P) => [+px(v), +py(P(v))];
      const a0 = xy(vA0, PA), a1 = xy(vA1, PA), ae = xy(vAe, PA), b0 = xy(vB0, PB), b1 = xy(vB1, PB), be = xy(vBe, PB);
      pvFitAbove = a0.join(',') + ' ' + a1.join(',');     // fitted over the single-phase data
      pvFitBelow = b0.join(',') + ' ' + b1.join(',');     // fitted over the two-phase data
      pvFitAboveExt = a1.join(',') + ' ' + ae.join(',');  // extension toward the intersection
      pvFitBelowExt = b0.join(',') + ' ' + be.join(',');
      _lA = _len(a0[0], a0[1], a1[0], a1[1]) + 2; _lB = _len(b0[0], b0[1], b1[0], b1[1]) + 2;
      _lAe = _len(a1[0], a1[1], ae[0], ae[1]) + 2; _lBe = _len(b0[0], b0[1], be[0], be[1]) + 2;
      pvShowBubbleMark = true;
      pvBubbleX = px(vI); pvBubbleY = py(pI);
      _gLen = Math.max(1, +pvBubbleX - 56);
    } else if (n >= NPTS && this.state.pvFit) {
      const aboveFit = linfit(DATA.slice(0, BUBBLE_IDX + 1));
      const belowFit = linfit(DATA.slice(BUBBLE_IDX, NPTS));
      const vIntersect = (belowFit.b - aboveFit.b) / (aboveFit.m - belowFit.m);
      const pIntersect = aboveFit.m * vIntersect + aboveFit.b;
      const vFirst = DATA[0][1], vLast = DATA[NPTS - 1][1];
      pvFitAbove = px(vFirst) + ',' + py(aboveFit.m * vFirst + aboveFit.b) + ' ' + px(vIntersect) + ',' + py(pIntersect);
      pvFitBelow = px(vIntersect) + ',' + py(pIntersect) + ' ' + px(vLast) + ',' + py(belowFit.m * vLast + belowFit.b);
      pvShowBubbleMark = true;
      pvBubbleX = px(vIntersect); pvBubbleY = py(pIntersect);
    }
    // fit lines are drawn on after all 12 points are on the chart: above-Psat first, then below
    const _fitHidden = { opacity: 0 };
    let pvFitAboveStyle = pvShowBubbleMark
      ? { strokeDasharray: 640, strokeDashoffset: 640, animation: 'pvtdraw calc(2.4s * var(--pm, 1)) ease-in-out calc(.3s * var(--pm, 1)) forwards' } : _fitHidden;
    let pvFitBelowStyle = pvShowBubbleMark
      ? { strokeDasharray: 640, strokeDashoffset: 640, animation: 'pvtdraw calc(2.4s * var(--pm, 1)) ease-in-out calc(2.9s * var(--pm, 1)) forwards' } : _fitHidden;
    let pvPsatMarkStyle = { animation: 'pvtfade calc(.6s * var(--pm, 1)) ease calc(5.4s * var(--pm, 1)) both' };
    let pvPsatRingStyle = { transformBox: 'fill-box', transformOrigin: 'center', animation: 'pvtring calc(1.4s * var(--pm, 1)) ease-out calc(5.5s * var(--pm, 1)) 3 both' };
    let pvFitAboveExtStyle = _fitHidden, pvFitBelowExtStyle = _fitHidden, pvPsatGuideStyle = {}, pvPsatVGuideStyle = {}, pvPsatLabelStyle = {};
    if (pvShowBubbleMark && SPLIT != null) {
      // sequence: single-phase fit (slow) -> two-phase fit (slow) -> both extended to the crossing ->
      // intersection symbol -> dashed guide to the pressure axis -> Psat label
      const _draw = (L, dur, del, ease) => ({ strokeDasharray: L.toFixed(1), strokeDashoffset: L.toFixed(1),
        animation: 'pvtdraw calc(' + dur + 's * var(--pm, 1)) ' + ease + ' calc(' + del + 's * var(--pm, 1)) forwards' });
      pvFitAboveStyle = _draw(_lA, 3.0, 0.4, 'ease-in-out');
      pvFitBelowStyle = _draw(_lB, 3.0, 3.8, 'ease-in-out');
      pvFitAboveExtStyle = _draw(_lAe, 2.4, 7.2, 'ease-out');
      pvFitBelowExtStyle = _draw(_lBe, 2.4, 7.2, 'ease-out');
      pvPsatMarkStyle = { animation: 'pvtfade calc(.5s * var(--pm, 1)) ease calc(9.7s * var(--pm, 1)) both' };
      pvPsatRingStyle = { transformBox: 'fill-box', transformOrigin: 'center', animation: 'pvtring calc(1.4s * var(--pm, 1)) ease-out calc(9.8s * var(--pm, 1)) 3 both' };
      pvPsatGuideStyle = { transformBox: 'fill-box', transformOrigin: 'right center', animation: 'pvtgrowx calc(1s * var(--pm, 1)) ease-out calc(10.2s * var(--pm, 1)) both' };
      pvPsatLabelStyle = { animation: 'pvtfade calc(.6s * var(--pm, 1)) ease calc(11.1s * var(--pm, 1)) both' };
    }
    const pvPsatAxisTxt = pvShowBubbleMark && SPLIT != null ? (C.psatAxisTxt || '') : '';
    const pvPsatMarkTitle = C.psatMarkTitle || 'Psat \u2014 Bubble Point';
    // compact label sits just off the intersection, clamped inside the plot frame
    const _bx = parseFloat(pvBubbleX), _by = parseFloat(pvBubbleY);
    const LW = C.psatBoxW || 116, LH = 27;
    const pvPsatLabelX = Math.max(60, Math.min(420 - LW, _bx + 14)).toFixed(1);
    const pvPsatLabelY = Math.max(18, Math.min(320 - LH, _by - 40)).toFixed(1);
    const pvPsatLabelTitleY = (parseFloat(pvPsatLabelY) + 3).toFixed(1);
    const pvPsatLabelValY = (parseFloat(pvPsatLabelY) + 13).toFixed(1);
    const pvPsatLeader = _bx + ',' + _by + ' ' + (parseFloat(pvPsatLabelX) + 8).toFixed(1) + ',' + (parseFloat(pvPsatLabelY) + LH).toFixed(1);

    // recorded-point worksheet — same DATA that drives the graph, shown as a B/V data sheet
    const _rh = embedded ? 23 : 17;
    const pvSheet = DATA.map(([p, v], i) => {
      const rev = i < n;
      const isBubble = _isPsatPt(i) && confirmed && rev;
      const isActive = busy && i === n - 1;
      const bg = isBubble ? 'rgba(195,58,82,.08)' : isActive ? 'rgba(47,111,208,.09)' : rev ? 'var(--panel)' : 'transparent';
      const cell = 'padding:0 ' + (embedded ? 8 : 6) + 'px; height:' + _rh + 'px; display:flex; align-items:center; border-left:1px solid var(--line); font-family:\'IBM Plex Mono\',ui-monospace,monospace; font-size:' + (embedded ? 12 : 10) + 'px; white-space:nowrap; overflow:hidden;';
      return {
        n: (i < 9 ? '0' : '') + (i + 1),
        b: rev ? p.toLocaleString('en-US') : '',
        v: rev ? v.toFixed(dec) : '',
        rowStyle: 'display:grid; grid-template-columns:' + (embedded ? 30 : 26) + 'px minmax(0,1fr) minmax(0,1fr); border-bottom:1px solid var(--line); background:' + bg + '; transition:background .25s ease;' + ((phase === 'rec' && i === n - 1) ? ' animation:pvtrow calc(1.6s * var(--pm, 1)) ease-out;' : ''),
        numStyle: "padding:0 5px; height:" + _rh + "px; display:flex; align-items:center; justify-content:center; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:" + (embedded ? 10 : 8.5) + "px; color:" + (rev ? 'var(--mut)' : 'var(--dis)') + '; background:var(--icard);',
        bStyle: cell + 'justify-content:flex-end; font-weight:600; color:' + (isBubble ? 'var(--red)' : rev ? 'var(--txt)' : 'var(--dis)') + ';',
        vStyle: cell + 'justify-content:flex-end; color:' + (isBubble ? 'var(--red)' : rev ? 'var(--txt2)' : 'var(--dis)') + ';'
      };
    });

    const wfLabels = [
      'Start PV Test', 'Set Condition', 'Agitate Sample', 'Stabilize',
      'Record Point', 'Repeat \u00d7 12', 'Determine Psat', 'Return to Initial'
    ];
    let wfActive = 0;
    if (returned) wfActive = 8;
    else if (phase === 'return') wfActive = 7;
    else if (phase === 'psat' || phase === 'fit') wfActive = 6;
    else if (phase === 'set') wfActive = 1;
    else if (phase === 'a2b' || phase === 'hold' || phase === 'b2a') wfActive = 2;
    else if (phase === 'stab') wfActive = 3;
    else if (phase === 'read' || phase === 'rec') wfActive = 4;
    else if (phase === 'next') wfActive = 5;
    else if (busy) wfActive = 1;
    const pvWorkflow = wfLabels.map((label, i) => {
      const done = returned || i < wfActive;
      const active = !done && i === wfActive;
      const c = done ? 'var(--accg)' : active ? 'var(--blue)' : 'var(--dis)';
      const bg = done ? 'rgba(29,138,90,.12)' : active ? 'rgba(47,111,208,.12)' : 'var(--icard)';
      return { num: '0' + (i + 1), label: label, color: c,
        chip: "flex:0 0 auto; width:19px; height:19px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:9.5px; font-weight:700; background:" + bg + '; border:1.3px solid ' + c + '; color:' + c + ';' + ((active && busy) ? ' animation:pvtpulse 1.2s ease-in-out infinite;' : ''),
        connector: 'flex:1 1 10px; min-width:8px; height:1.5px; border-radius:1px; background:' + (i === 7 ? 'transparent' : (done ? 'var(--accg)' : 'var(--track)')) + ';' };
    });

    const cnt = Math.min(n, this.state.pvCount || 0);
    const pvPointsOfText = (returned ? NPTS : cnt) + ' / ' + NPTS;
    const pvPointsColor = cnt > 0 ? 'var(--accb3)' : 'var(--mut)';
    // Psat stays at 0 psi until the slope change is actually identified from the recorded points
    const pvPsatText = confirmed ? (C.psatLabel || _psatTxt) : '0 ' + pu;
    const pvBubbleStatColor = confirmed ? 'var(--amb)' : 'var(--mut)';
    const pvTestStatusText = returned ? 'Complete' : busy ? pvSeqText : n >= NPTS ? 'Awaiting Confirmation' : 'Ready';
    const pvTestStatusColor = returned ? 'var(--grn)' : busy ? 'var(--accb3)' : 'var(--txt2)';

    const pvBtnText = returned ? 'Test Complete' : busy ? ('Running\u2026 ' + cnt + ' / ' + NPTS) : 'Start PV Test';
    const pvBtnBg = (busy || returned) ? 'var(--icard)' : 'linear-gradient(180deg,#3f8ae0,#2f6fd0)';
    const pvBtnBorder = busy ? 'var(--line2)' : returned ? 'var(--line2)' : '#5a9bea';
    const pvBtnColor = busy ? 'var(--accb3)' : returned ? 'var(--mut)' : '#fff';
    const pvBtnCursor = (busy || returned) ? 'default' : 'pointer';
    // enabled once the run has started (or finished); disabled only while idle
    const _nextOn = busy || returned || n > 0;
    const pvNextBg = returned ? 'rgba(29,138,90,.10)' : 'var(--icard)';
    const pvNextBorder = returned ? 'rgba(29,138,90,.40)' : _nextOn ? 'var(--line2)' : 'var(--line)';
    const pvNextColor = returned ? 'var(--grn)' : _nextOn ? 'var(--txt2)' : 'var(--dis)';
    const pvNextCursor = _nextOn ? 'pointer' : 'not-allowed';
    const pvHintText = returned ? 'Psat = ' + (C.psatPTxt ? C.psatLabel : _psatTxt) + ' \u00b7 ' + NPTS + ' points \u00b7 back at ' + _fmtP(C.start[0]) + ' & ' + C.start[1].toFixed(dec) + ' cc'
      : busy ? _stepHint
      : 'Set \u2192 agitate A\u21c4B \u2192 stabilize \u2192 record, \u00d7 12 points';
    const pvHintColor = returned ? 'var(--grn)' : 'var(--mut)';

    // skip button: label follows the upcoming point; active only while points are being run
    const _skipOn = busy && SKIP_PHASES.indexOf(phase) >= 0;
    const _cur = this.state.pvStep || 0;
    const pvSkipText = (_skipOn ? _cur >= NPTS - 1 : (n >= NPTS || returned)) ? 'Determine Psat \u2192' : ('Go to Point ' + (_skipOn ? _cur + 2 : 2) + ' \u2192');
    const pvSkipStyle = "font-family:inherit; font-size:11px; font-weight:600; white-space:nowrap; padding:7px 15px; border-radius:8px; transition:background .2s ease, border-color .2s ease, color .2s ease; " +
      (_skipOn ? 'cursor:pointer; background:rgba(47,111,208,.10); border:1px solid rgba(47,111,208,.40); color:var(--accb3);'
               : 'cursor:not-allowed; background:var(--icard); border:1px solid var(--line); color:var(--dis);');

    const _tone = returned ? 'good' : busy ? 'busy' : n > 0 ? 'good' : 'idle';
    const pvPillColor = _tone === 'good' ? 'var(--grn)' : _tone === 'busy' ? 'var(--accb3)' : 'var(--mut)';
    const pvPillBg = _tone === 'good' ? 'rgba(29,138,90,.10)' : _tone === 'busy' ? 'rgba(47,111,208,.10)' : 'var(--icard)';
    const pvPillBorder = _tone === 'good' ? 'rgba(29,138,90,.35)' : _tone === 'busy' ? 'rgba(47,111,208,.32)' : 'var(--line2)';
    const pvPillDot = 'width:7px;height:7px;border-radius:50%;flex:0 0 auto;background:' + pvPillColor + ';' + (busy ? 'animation:pvtpulse 1.2s ease-in-out infinite;' : '');
    const pvStatusText = returned ? 'Returned to Initial Condition' : busy ? pvSeqText : n >= NPTS ? ('All ' + NPTS + ' Points Recorded') : 'Ready to Start';

    return {
      pvEmbedded: embedded, pvStandalone: !embedded,
      // embedded (Differential Liberation): larger PVT-cell column, wider worksheet; standalone Validation layout unchanged
      /* results (graph + recorded points) appear only once the PV run starts; before that the
         setup panel takes the whole row (no reserved empty space) */
      pvResOn: busy || n > 0 || returned,
      pvGridCols: !(busy || n > 0 || returned) ? 'minmax(0,1fr)' : embedded ? 'minmax(0,0.84fr) minmax(0,1.16fr)' : 'minmax(0,1fr) minmax(0,1fr)',
      pvSheetW: embedded ? '212px' : '158px',
      pvSheetHdGrid: embedded ? '30px minmax(0,1fr) minmax(0,1fr)' : '26px minmax(0,1fr) minmax(0,1fr)',
      pvCtlW: PK ? '128px' : '112px',
      // embedded (Differential Liberation): Computer / Control Box / signal / cell packed as one centred group; the Control
      // Box is centred on the cell readouts (column top padding = cell-title height) and values never wrap
      pvSetupRowStyle: PK ? 'display:flex; flex-direction:row; align-items:stretch; justify-content:center; gap:0; flex:1 1 auto; min-height:0;'
        : 'display:flex; flex-direction:row; align-items:stretch; gap:4px; flex:1 1 auto; min-height:0;',
      pvCtlColStyle: PK ? 'display:flex; flex-direction:column; align-items:stretch; justify-content:center; gap:6px; flex:0 0 128px; min-width:0; padding-top:24px;'
        : 'display:flex; flex-direction:column; align-items:stretch; justify-content:center; gap:6px; flex:0 0 112px; min-width:0;',
      // embedded: computer + link fill the space above, an equal spacer below, so the Control Box sits on the column centre
      pvCtlTopStyle: PK ? 'flex:1 1 0; min-height:0; display:flex; flex-direction:column; align-items:stretch; justify-content:flex-end; gap:6px;' : 'display:contents;',
      pvCompLblStyle: PK ? "font-family:'IBM Plex Mono'; font-size:9.5px; letter-spacing:.6px; text-transform:uppercase; color:var(--mut);"
        : "font-family:'IBM Plex Mono'; font-size:8.5px; letter-spacing:.6px; text-transform:uppercase; color:var(--mut);",
      pvCtlBotStyle: PK ? 'flex:1 1 0; min-height:0;' : 'display:none;',
      pvSigColStyle: PK ? 'position:relative; flex:0 0 44px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:0; padding-top:24px;'
        : 'flex:0 0 30px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; min-width:0;',
      pvSigLblStyle: PK ? "position:absolute; left:0; right:0; top:calc(50% + 12px - 17px); text-align:center; font-family:'IBM Plex Mono'; font-size:8.5px; letter-spacing:.5px; color:var(--mut2);"
        : "font-family:'IBM Plex Mono'; font-size:7px; letter-spacing:.4px; color:var(--mut2);",
      pvCellColStyle: PK ? 'display:flex; flex-direction:column; gap:3px; min-width:0; flex:0 1 auto; min-height:0;'
        : 'display:flex; flex-direction:column; gap:3px; min-width:0; flex:1 1 auto; min-height:0;',
      pvCellSvgStyle: PK ? 'display:block; height:100%; max-width:100%; aspect-ratio:309 / 392; flex:1 1 auto; min-height:0; overflow:visible;'
        : 'display:block; width:100%; flex:1 1 auto; min-height:0;',
      // embedded: Pump A / Pump B readings sit below the rack (clear of the frame), captions shifted to match
      pvCellVb: PK ? '805 146 309 392' : '788 140 318 384',
      pvPumpLblY: PK ? '472' : '430', pvCellCapY: PK ? '510' : '490', pvPhaseY: PK ? '530' : '512',
      pvRootStyle: embedded ? 'display:flex; flex-direction:column; flex:1 1 auto; height:100%; min-height:0; overflow:hidden; padding:0; gap:6px; box-sizing:border-box;' : '',
      // standalone (Validation): shared Validation layout (theme.css .pg / .lab-body / .vl-sim / .vl-dock, 2026-10-21);
      // embedded (Differential Liberation, Separator Test): the wrappers below are display:contents, so that layout is unchanged
      pvRootCls: embedded ? '' : 'pg pg-stack',
      pvBodyCls: embedded ? '' : 'lab-body', pvBodyStyle: embedded ? 'display:contents;' : '',
      pvSimCls: embedded ? '' : 'lab-schem vl-sim', pvSimStyle: embedded ? 'display:contents;' : 'gap:8px;',
      pvSetupCardStyle: embedded ? 'background:var(--panel); border:1px solid var(--line); box-shadow:0 1px 2px rgba(20,35,60,.05); border-radius:12px; padding:8px 12px 7px; display:flex; flex-direction:column; min-height:0;'
        : 'display:flex; flex-direction:column; min-height:0; min-width:0;',
      pvInitText: _fmtP(C.start[0]) + ' \u00b7 ' + C.start[1].toFixed(dec) + ' cc',
      pvBoxX: String(948 - (C.boxW || 72) / 2), pvBoxW: String(C.boxW || 72),
      pvPsatLabel: C.psatMarkTxt || C.psatLabel || _psatTxt, pvPsatBoxW: String(LW), pvPsatVolText: C.psatVolTxt || (DATA[BUBBLE_IDX][1].toFixed(Math.min(dec, 2)) + ' cc'), pvPU: pu, pvPAxis: 'Pressure (' + pu + ')',
      pvPressureText, pvVolumeText, pvPressureBox, pvVolumeBox,
      // approved PVT cell displays / valve indication (presentation only)
      pvCellPNum: Math.round(pressure).toLocaleString('en-US'), pvCellTempTxt: C.tempTxt || '—',
      pvValveB: phase === 'a2b' || phase === 'hold' || phase === 'b2a',
      pvSampleH, pvPistonY, pvSampleTrans, pvPistonLabelY, pvPistonLabelText,
      pvBubbleGasStyle, pvBubsA, pvBubsB,
      pvGasH, pvLiquidY, pvLiquidH, pvInterfaceStyle, pvPhaseText, pvPhaseColor,
      pvBGasH, pvBLiquidY, pvBLiquidH, pvBPistonY, pvVolumeBText, pvVolumeAText,
      pvXferFlowStyle, pvXferArrowD, pvSlugX, pvSlugY, pvSlugTrans, pvDissStyle, pvSeqText,
      pvRouteD, pvFluidDash, pvFluidStyle, pvLineSpecks,
      pvSensorPulse, pvSigHStyle, pvSigVStyle, pvDispPStyle, pvDispVStyle, pvCompStyle,
      pvNewPtOn, pvNewPtX, pvNewPtY, pvNewPtStroke, pvNewPtStyle, pvPsatRingStyle,
      pvCellTag: pvCellTagT, pvCellTagColor, pvCellTagBg, pvCellTagBorder,
      pvNeedleX, pvNeedleY, pvNeedleTrans,
      pvYTicks, pvXTicks, pvFitAbove, pvFitBelow, pvFitAboveStyle, pvFitBelowStyle,
      pvFitAboveExt, pvFitBelowExt, pvFitAboveExtStyle, pvFitBelowExtStyle, pvPsatGuideStyle, pvPsatVGuideStyle, pvPsatLabelStyle, pvPsatAxisTxt, pvPsatMarkTitle,
      pvGraphPoints, pvLineAbove, pvLineBelow, pvShowBubbleMark, pvBubbleX, pvBubbleY, pvPsatMarkStyle,
      pvPsatLabelX, pvPsatLabelY, pvPsatLabelTitleY, pvPsatLabelValY, pvPsatLeader,
      pvSheet, pvWorkflow,
      pvPointsOfText, pvPointsColor, pvPsatText, pvBubbleStatColor, pvTestStatusText, pvTestStatusColor,
      pvBtnText, pvBtnBg, pvBtnBorder, pvBtnColor, pvBtnCursor,
      pvNextBg, pvNextBorder, pvNextColor, pvNextCursor, pvHintText, pvHintColor,
      pvAdvance: () => this.pvStart(), pvReset: () => this.pvReset(),
      pvSkip: () => this.pvSkip(), pvSkipText, pvSkipStyle,
      pvPillColor, pvPillBg, pvPillBorder, pvPillDot, pvStatusText,
      onBack: this.props.onBack || (() => {}),
      onValidation: this.props.onValidation || (() => {}),
      onNext: _nextOn ? (this.props.onNext || (() => {})) : (() => {})
    };
  }
}

DC.define('StagePVTest', {
  style: `/* Standalone-only fallback: matches only when this DC is opened on its own.
     When embedded in PVT Nexus the selector never matches, so the global theme
     (html / html[data-theme="light"]) is used untouched. */
  #dc-root > .sc-host > [data-screen-label="PV Test"] {
    --bg:#eef1f6; --board:#ffffff; --panel:#ffffff; --panel2:#f4f6fa;
    --line:rgba(40,60,90,.12); --line2:rgba(40,60,90,.20);
    --txt:#16202f; --txt2:#3a4759; --mut:#566578; --mut2:#8492a4;
    --blue:#2f6fd0; --blued:#2f6fd0; --grn:#1d8a5a; --amb:#b9831f;
    --inset:#eef2f8; --cap:rgba(38,56,80,.68); --cap2:rgba(38,56,80,.78);
    --accb3:#1f74c4; --accg:#0e7a4f; --dis:#7b8797; --icard:#f1f4f9;
    --track:rgba(40,60,90,.14);
    font-family:'IBM Plex Sans',system-ui,sans-serif;
    background:var(--bg); color:var(--txt);
    -webkit-font-smoothing:antialiased;
  }
  #dc-root > .sc-host > [data-screen-label="PV Test"] * { box-sizing:border-box; }
  @keyframes pvtpulse { 0%,100% { opacity:.35; } 50% { opacity:1; } }
  @keyframes pvtdiss { 0%,100% { opacity:.16; } 50% { opacity:.34; } }
  @keyframes pvtdash { to { stroke-dashoffset:-24; } }
  @keyframes pvtdraw { to { stroke-dashoffset:0; } }
  @keyframes pvtgrowx { from { transform:scaleX(0); } to { transform:scaleX(1); } }
  @keyframes pvtfade { from { opacity:0; } to { opacity:1; } }
  @keyframes pvtpin { 0%,100% { transform:scale(1); } 35% { transform:scale(1.45); } }
  @keyframes pvtpop { 0% { transform:scale(0); opacity:0; } 60% { transform:scale(1.35); opacity:1; } 100% { transform:scale(1); opacity:1; } }
  @keyframes pvtring { 0% { transform:scale(1); opacity:.85; } 100% { transform:scale(3.4); opacity:0; } }
  @keyframes pvtrow { 0% { background:rgba(47,111,208,.34); } 100% { background:rgba(47,111,208,.09); } }`,
  template: `<div data-screen-label="PV Test" class="{{ pvRootCls }}" style="{{ pvRootStyle }}">

  <!-- header (shared Validation .pg-head) -->
  <sc-if value="{{ pvStandalone }}" hint-placeholder-val="{{ true }}">
  <div class="pg-head">
    <div class="pg-titles">
      <span class="pg-eyebrow">Validation</span>
      <h2 class="pg-title">PV Test</h2>
      <span style="align-self:center; display:inline-flex; align-items:center; gap:6px; flex:0 0 auto; padding:3px 11px; border-radius:999px; background:{{ pvPillBg }}; border:1px solid {{ pvPillBorder }}; font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.7px; text-transform:uppercase; color:{{ pvPillColor }}; white-space:nowrap;"><span style="{{ pvPillDot }}"></span>{{ pvStatusText }}</span>
      <span class="vl-chip">{{ srcContext }}</span>
      <p class="pg-desc">Automatically record 12 pressure-volume points from the PVT cell to determine the bubble point (Psat)</p>
    </div>
    <div class="pg-end"><button type="button" class="bd-btn" data-cd-open="" data-cd-ctx="PV / Bsat · closed cell, Pump A open to the pressure sensor">Cell Details</button></div>
  </div>
  </sc-if>

  <div class="{{ pvBodyCls }}" style="{{ pvBodyStyle }}">
  <div class="{{ pvSimCls }}" style="{{ pvSimStyle }}">
  <!-- schematic + graph/points -->
  <div style="display:grid; grid-template-columns:{{ pvGridCols }}; gap:8px; flex:1 1 auto; min-height:0;">

    <!-- Integrated PVT Setup -->
    <div style="{{ pvSetupCardStyle }}">

      <div style="flex:0 0 auto; margin-bottom:4px;">
        <div style="font-size:13px; font-weight:600; color:var(--txt);">Integrated PVT Setup</div>
        <div style="font-size:10px; color:var(--mut); margin-top:1px;">Computer &#8594; Control Box &#8594; PVT Cell</div>
      </div>

      <div style="{{ pvSetupRowStyle }}">

        <!-- PVT Cell (approved shared design, PVTCellArt) centred, computer + controller to the right: one drawing -->
        <div style="{{ pvCellColStyle }}">
          <div style="display:flex; align-items:center; justify-content:center; gap:8px; flex:0 0 auto;">
            <span style="font-size:15px; font-weight:700; color:var(--txt); letter-spacing:-.2px; white-space:nowrap;">PVT Cell</span>
            <button type="button" class="bd-btn bd-inline" data-cd-open="" data-cd-ctx="PV / Bsat · closed cell, Pump A open to the pressure sensor">Cell Details</button>
            <span style="display:inline-flex; align-items:center; padding:2px 9px; border-radius:999px; background:{{ pvCellTagBg }}; border:1px solid {{ pvCellTagBorder }}; font-family:'IBM Plex Mono'; font-size:9.5px; letter-spacing:.5px; color:{{ pvCellTagColor }}; white-space:nowrap;">{{ pvCellTag }}</span>
          </div>
          <svg viewBox="735 96 628 470" preserveAspectRatio="xMidYMid meet" style="display:block; width:100%; height:100%; flex:1 1 auto; min-height:0;">
        <defs>
          <pattern id="pv-sample" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#c7a233"></rect><circle cx="4.5" cy="4.5" r="1.15" fill="#f2d879" opacity=".7"></circle></pattern>
          <pattern id="pv-diss" width="13" height="13" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".8" fill="#eafff4"></circle><circle cx="9.5" cy="8.5" r=".65" fill="#eafff4"></circle><circle cx="6" cy="11.5" r=".5" fill="#eafff4"></circle><circle cx="11.5" cy="2" r=".55" fill="#eafff4"></circle></pattern>
          <linearGradient id="pv-gas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fe3b4" stop-opacity=".34"></stop><stop offset="1" stop-color="#3fbf8c" stop-opacity=".62"></stop></linearGradient>
          ${PVTCellArt.defs('pvc')}
        </defs>
        ${PVTCellArt.cable({}, { x: 1168, y: 300, s: .5 }, 26)}
        ${PVTCellArt.desk('pvc', { x: 1168, y: 300, s: .5, legs: 178, ctl: '{{ pvCellPNum }}',
          rows: [['P {{ pvPU }}', '{{ pvCellPNum }}', '#7ff0bf'], ['V cc', '{{ pvVolumeText }}', '#ffc56b'], ['PUMP A', '{{ pvVolumeAText }}', '#ffc56b'], ['PUMP B', '{{ pvVolumeBText }}', '#ffc56b']] })}
        ${PVTCellArt.cell('pvc', {
          pistonB: 'pvBPistonY', pistonA: 'pvPistonY',
          // the sensor reads the sample in Pump A (valve open); Pump B's valve is open while the sample moves to / sits in / returns from Pump B
          valves: { A: 'true', B: 'pvValveB' },
          innerB: `<rect x="848" y="219" width="36" height="{{ pvBGasH }}" fill="url(#pv-gas)" style="{{ pvSampleTrans }}"></rect>
          <rect x="848" y="{{ pvBLiquidY }}" width="36" height="{{ pvBLiquidH }}" fill="url(#pv-sample)" style="{{ pvSampleTrans }}"></rect>
          <rect x="848" y="{{ pvBLiquidY }}" width="36" height="{{ pvBLiquidH }}" fill="url(#pv-diss)" style="{{ pvDissStyle }}"></rect>
          <sc-for list="{{ pvBubsB }}" as="bb" hint-placeholder-count="10">
            <circle cx="{{ bb.x }}" cy="{{ bb.y }}" r="{{ bb.r }}" fill="#bff3da" opacity="{{ bb.o }}"></circle>
          </sc-for>`,
          innerA: `<rect x="1012" y="219" width="36" height="{{ pvGasH }}" fill="url(#pv-gas)" style="{{ pvSampleTrans }}"></rect>
          <rect x="1012" y="{{ pvLiquidY }}" width="36" height="{{ pvLiquidH }}" fill="url(#pv-sample)" style="{{ pvSampleTrans }}"></rect>
          <rect x="1012" y="{{ pvLiquidY }}" width="36" height="{{ pvLiquidH }}" fill="url(#pv-diss)" style="{{ pvDissStyle }}"></rect>
          <rect x="1012" y="{{ pvLiquidY }}" width="36" height="1.4" fill="#eafff4" style="{{ pvInterfaceStyle }}"></rect>
          <rect x="1012" y="219" width="36" height="3.5" fill="#ffffff" opacity=".18"></rect>
          <sc-for list="{{ pvBubsA }}" as="ba" hint-placeholder-count="10">
            <circle cx="{{ ba.x }}" cy="{{ ba.y }}" r="{{ ba.r }}" fill="#bff3da" opacity="{{ ba.o }}"></circle>
          </sc-for>`,
          disp: { P: '{{ pvCellPNum }}', Pu: '{{ pvPU }}', B: '{{ pvVolumeBText }}', A: '{{ pvVolumeAText }}', T: '{{ pvCellTempTxt }}' } })}
        <g style="{{ pvXferFlowStyle }}">
          <path d="{{ pvRouteD }}" fill="none" stroke="#d9ad2f" stroke-width="3.4" stroke-linecap="butt" stroke-linejoin="round" stroke-dasharray="{{ pvFluidDash }}" style="{{ pvFluidStyle }}"></path>
          <path d="{{ pvRouteD }}" fill="none" stroke="#fff0b8" stroke-width="1.1" stroke-linecap="butt" stroke-linejoin="round" stroke-dasharray="{{ pvFluidDash }}" opacity=".55" style="{{ pvFluidStyle }}"></path>
          <sc-for list="{{ pvLineSpecks }}" as="sp" hint-placeholder-count="7">
            <circle cx="{{ sp.x }}" cy="{{ sp.y }}" r="{{ sp.r }}" fill="{{ sp.fill }}" opacity="{{ sp.o }}"></circle>
          </sc-for>
          <path d="{{ pvXferArrowD }}" fill="#ffcf3f"></path>
          <circle cx="{{ pvSlugX }}" cy="{{ pvSlugY }}" r="5.5" fill="none" stroke="#ffcf3f" stroke-width="1.4" style="{{ pvSlugTrans }}"></circle>
        </g>
        <circle cx="948" cy="217.7" r="24" fill="none" stroke="#46e0ff" stroke-width="1.6" style="{{ pvSensorPulse }}"></circle>
        <text x="948" y="174" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" letter-spacing=".5" fill="var(--cap2)">SAMPLE</text>
        <foreignObject x="790" y="520" width="152" height="17"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif; font-size:12.5px; color:var(--txt2);">Pump B &#183; <span style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:600; color:var(--amb);">{{ pvVolumeBText }}</span></div></foreignObject>
        <foreignObject x="952" y="520" width="156" height="17"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif; font-size:12.5px; color:var(--txt2);">Pump A &#183; <span style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:600; color:var(--amb);">{{ pvVolumeAText }}</span></div></foreignObject>
        <text x="948" y="554" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" letter-spacing=".8" fill="{{ pvPhaseColor }}">{{ pvPhaseText }}</text>
          </svg>
        </div>
      </div>
    </div>

    <!-- PV graph + compact points -->
    <sc-if value="{{ pvResOn }}" hint-placeholder-val="{{ false }}">
    <div style="background:var(--panel); border:1px solid var(--line); box-shadow:0 1px 2px rgba(20,35,60,.05); border-radius:12px; padding:8px 11px; display:flex; flex-direction:column; min-height:0; gap:5px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex:0 0 auto; flex-wrap:wrap;">
        <div style="font-size:12.5px; font-weight:600; color:var(--txt);">Pressure &#8211; Volume Relationship</div>
        <div style="display:flex; align-items:center; gap:12px; font-size:9.5px; color:var(--mut); white-space:nowrap;">
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:12px; height:2.5px; background:var(--blue); display:inline-block;"></span>Fit &#183; Above Psat</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:12px; height:2.5px; background:var(--amb); display:inline-block;"></span>Fit &#183; Below Psat</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:7px; height:7px; border-radius:50%; background:var(--red); display:inline-block;"></span>Psat</span>
        </div>
      </div>
      <div style="display:flex; flex-direction:row; align-items:stretch; gap:10px; flex:1 1 auto; min-height:0; min-width:0; flex-wrap:nowrap;">
      <!-- recorded P/V worksheet -->
      <div style="flex:0 0 {{ pvSheetW }}; min-width:0; align-self:flex-start; max-height:100%; display:flex; flex-direction:column; border:1px solid var(--line2); border-radius:8px; overflow:hidden; background:var(--panel2);">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding:5px 7px; background:var(--icard); border-bottom:1px solid var(--line2);">
          <span style="font-family:'IBM Plex Mono'; font-size:7.5px; letter-spacing:.6px; text-transform:uppercase; white-space:nowrap; color:var(--mut);">Recorded Points</span>
          <span style="font-family:'IBM Plex Mono'; font-size:8px; white-space:nowrap; color:{{ pvPointsColor }};">{{ pvPointsOfText }}</span>
        </div>
        <div style="display:grid; grid-template-columns:{{ pvSheetHdGrid }}; border-bottom:1.4px solid var(--line2); background:var(--icard);">
          <span style="height:19px;"></span>
          <span style="height:19px; display:flex; align-items:center; justify-content:center; border-left:1px solid var(--line2); font-family:'IBM Plex Mono'; font-size:10px; font-weight:700; color:var(--txt2);">P</span>
          <span style="height:19px; display:flex; align-items:center; justify-content:center; border-left:1px solid var(--line2); font-family:'IBM Plex Mono'; font-size:10px; font-weight:700; color:var(--txt2);">V</span>
        </div>
        <div style="display:grid; grid-template-columns:{{ pvSheetHdGrid }}; border-bottom:1px solid var(--line2); background:var(--panel2);">
          <span style="height:15px;"></span>
          <span style="height:15px; display:flex; align-items:center; justify-content:center; border-left:1px solid var(--line); font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.5px; color:var(--mut2);">{{ pvPU }}</span>
          <span style="height:15px; display:flex; align-items:center; justify-content:center; border-left:1px solid var(--line); font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.5px; color:var(--mut2);">cc</span>
        </div>
        <div style="flex:0 1 auto; min-height:0; overflow-y:auto;">
          <sc-for list="{{ pvSheet }}" as="r" hint-placeholder-count="12">
            <div style="{{ r.rowStyle }}">
              <span style="{{ r.numStyle }}">{{ r.n }}</span>
              <span style="{{ r.bStyle }}">{{ r.b }}</span>
              <span style="{{ r.vStyle }}">{{ r.v }}</span>
            </div>
          </sc-for>
        </div>
      </div>

      <svg viewBox="0 0 460 360" preserveAspectRatio="xMidYMid meet" style="display:block; flex:1 1 auto; min-width:0; min-height:0; width:100%;">
        <rect x="56" y="14" width="368" height="310" fill="var(--panel2)" stroke="var(--line)" stroke-width="1"></rect>
        <sc-for list="{{ pvYTicks }}" as="t" hint-placeholder-count="4">
          <line x1="56" y1="{{ t.y }}" x2="424" y2="{{ t.y }}" stroke="var(--line)" stroke-width="1"></line>
          <text x="50" y="{{ t.y }}" text-anchor="end" dominant-baseline="middle" font-family="IBM Plex Mono" font-size="9.5" fill="var(--mut)">{{ t.label }}</text>
        </sc-for>
        <sc-for list="{{ pvXTicks }}" as="t" hint-placeholder-count="4">
          <line x1="{{ t.x }}" y1="14" x2="{{ t.x }}" y2="324" stroke="var(--line)" stroke-width="1"></line>
          <text x="{{ t.x }}" y="337" text-anchor="middle" font-family="IBM Plex Mono" font-size="9.5" fill="var(--mut)">{{ t.label }}</text>
        </sc-for>
        <line x1="56" y1="14" x2="56" y2="324" stroke="var(--line2)" stroke-width="1.3"></line>
        <line x1="56" y1="324" x2="424" y2="324" stroke="var(--line2)" stroke-width="1.3"></line>
        <text x="240" y="353" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" fill="var(--txt2)">Volume (cc)</text>
        <text x="15" y="169" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" fill="var(--txt2)" transform="rotate(-90 15 169)">{{ pvPAxis }}</text>

        <polyline points="{{ pvLineAbove }}" fill="none" stroke="var(--blue)" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" opacity=".55"></polyline>
        <polyline points="{{ pvLineBelow }}" fill="none" stroke="var(--amb)" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" opacity=".55"></polyline>
        <polyline points="{{ pvFitAbove }}" fill="none" stroke="var(--blue)" stroke-width="2.2" stroke-linecap="round" style="{{ pvFitAboveStyle }}"></polyline>
        <polyline points="{{ pvFitBelow }}" fill="none" stroke="var(--amb)" stroke-width="2.2" stroke-linecap="round" style="{{ pvFitBelowStyle }}"></polyline>
        <polyline points="{{ pvFitAboveExt }}" fill="none" stroke="var(--blue)" stroke-width="1.8" stroke-linecap="round" opacity=".8" style="{{ pvFitAboveExtStyle }}"></polyline>
        <polyline points="{{ pvFitBelowExt }}" fill="none" stroke="var(--amb)" stroke-width="1.8" stroke-linecap="round" opacity=".8" style="{{ pvFitBelowExtStyle }}"></polyline>

        <sc-for list="{{ pvGraphPoints }}" as="pt" hint-placeholder-count="12">
          <circle cx="{{ pt.x }}" cy="{{ pt.y }}" r="{{ pt.r }}" fill="{{ pt.fill }}" stroke="{{ pt.stroke }}" stroke-width="1.7" style="{{ pt.style }}"></circle>
        </sc-for>
        <sc-if value="{{ pvNewPtOn }}" hint-placeholder-val="{{ false }}">
          <circle cx="{{ pvNewPtX }}" cy="{{ pvNewPtY }}" r="4.5" fill="none" stroke="{{ pvNewPtStroke }}" stroke-width="1.4" style="{{ pvNewPtStyle }}"></circle>
        </sc-if>

        <sc-if value="{{ pvShowBubbleMark }}" hint-placeholder-val="{{ false }}">
        <g style="{{ pvPsatMarkStyle }}">
          <line x1="56" y1="{{ pvBubbleY }}" x2="{{ pvBubbleX }}" y2="{{ pvBubbleY }}" stroke="var(--red)" stroke-width="1.1" stroke-dasharray="3 4" opacity=".7" style="{{ pvPsatGuideStyle }}"></line>
          <line x1="{{ pvBubbleX }}" y1="{{ pvBubbleY }}" x2="{{ pvBubbleX }}" y2="324" stroke="var(--red)" stroke-width="1" stroke-dasharray="3 4" opacity=".45" style="{{ pvPsatVGuideStyle }}"></line>
          <text x="52" y="{{ pvBubbleY }}" dy="3.3" text-anchor="end" font-family="IBM Plex Mono" font-size="9.5" font-weight="700" fill="var(--red)" style="{{ pvPsatLabelStyle }}">{{ pvPsatAxisTxt }}</text>
          <circle cx="{{ pvBubbleX }}" cy="{{ pvBubbleY }}" r="7.5" fill="none" stroke="var(--red)" stroke-width="1.6"></circle>
          <circle cx="{{ pvBubbleX }}" cy="{{ pvBubbleY }}" r="7.5" fill="none" stroke="var(--red)" stroke-width="1.2" style="{{ pvPsatRingStyle }}"></circle>
          <circle cx="{{ pvBubbleX }}" cy="{{ pvBubbleY }}" r="2.6" fill="var(--red)"></circle>
          <g style="{{ pvPsatLabelStyle }}">
          <polyline points="{{ pvPsatLeader }}" fill="none" stroke="var(--red)" stroke-width="1" opacity=".7"></polyline>
          <rect x="{{ pvPsatLabelX }}" y="{{ pvPsatLabelY }}" width="{{ pvPsatBoxW }}" height="27" rx="5" fill="var(--panel)" stroke="var(--red)" stroke-width="1"></rect>
          <foreignObject x="{{ pvPsatLabelX }}" y="{{ pvPsatLabelTitleY }}" width="{{ pvPsatBoxW }}" height="11"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:.4px; font-weight:600; color:var(--red);">{{ pvPsatMarkTitle }}</div></foreignObject>
          <foreignObject x="{{ pvPsatLabelX }}" y="{{ pvPsatLabelValY }}" width="{{ pvPsatBoxW }}" height="12"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px; font-weight:700; color:var(--txt);">{{ pvPsatLabel }}</div></foreignObject>
          </g>
        </g>
        </sc-if>
      </svg>

      </div>
      </div>

    </div>
    </sc-if>

  <!-- workflow tracker (standalone only; the sequence still runs internally when embedded) -->
  <sc-if value="{{ pvStandalone }}" hint-placeholder-val="{{ true }}">
  <div style="display:flex; align-items:center; gap:0; flex:0 0 auto; padding:5px 10px; background:var(--panel); border:1px solid var(--line); box-shadow:0 1px 2px rgba(20,35,60,.05); border-radius:11px; flex-wrap:wrap;">
    <sc-for list="{{ pvWorkflow }}" as="w" hint-placeholder-count="8">
      <div style="display:flex; align-items:center; gap:6px; flex:1 1 108px; min-width:0;">
        <span style="{{ w.chip }}">{{ w.num }}</span>
        <span style="font-size:9.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:{{ w.color }};">{{ w.label }}</span>
        <span style="{{ w.connector }}"></span>
      </div>
    </sc-for>
  </div>
  </sc-if>

  </div>

  <sc-if value="{{ pvStandalone }}" hint-placeholder-val="{{ true }}">
  <div class="lab-side">
    <div class="vl-scroll">
      <div class="vl-sec">
        <div class="vl-k">Test summary</div>
        <div class="vl-cards" style="grid-template-columns:minmax(0,1fr);">
          <div class="vl-c"><div class="vl-cl">Initial Condition</div><div class="vl-cv">{{ pvInitText }}</div></div>
          <div class="vl-c"><div class="vl-cl">Points Recorded</div><div class="vl-cv" style="color:{{ pvPointsColor }};">{{ pvPointsOfText }}</div></div>
          <div class="vl-c"><div class="vl-cl">Bubble Point</div><div class="vl-cv" style="color:{{ pvBubbleStatColor }};">{{ pvPsatText }}</div></div>
          <div class="vl-c"><div class="vl-cl">Test Status</div><div class="vl-cv" style="color:{{ pvTestStatusColor }};">{{ pvTestStatusText }}</div></div>
        </div>
      </div>
    </div>
    <!-- shared Validation procedure dock (theme.css .vl-dock) -->
    <div class="vl-dock">
      <div class="pc-host" data-pc="StagePVTest" data-pc-layout="side"></div>
      <div class="vl-fwd"><button class="ui-btn ui-btn-ghost" onclick="{{ onBack }}">&#8592; Back to Flash</button><button onclick="{{ onNext }}" style="cursor:{{ pvNextCursor }}; background:{{ pvNextBg }}; border:1px solid {{ pvNextBorder }}; color:{{ pvNextColor }};">Move to Direct Density</button></div>
    </div>
  </div>
  </sc-if>
  </div>

  <!-- embedded hint (Differential Liberation / Separator Test host shows its own controls) -->
  <sc-if value="{{ pvEmbedded }}" hint-placeholder-val="{{ false }}">
  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex:0 0 auto;">
    <div style="font-family:'IBM Plex Mono'; font-size:10px; color:{{ pvHintColor }}; white-space:nowrap;">{{ pvHintText }}</div>
  </div>
  </sc-if>
</div>`,
  logic: Component
});
})();
