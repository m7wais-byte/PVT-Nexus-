/* component: StageDensity */
(function () {
// Demonstration data — replace with measured values later.
const D = {
  MI1: 208.812, MF1: 213.578,
  MI2: 208.820, MF2: 213.584,
  V0: 30.0, XFER: 7.0, TOL: 0.0005, PRESSURE: 5000
};
const PXCC = 5;

/* ---- run timeline (ms, before PT scaling) ---- */
const T = { CONNECT: 2000, XFER: 3200, XFER_MS: 7500, FLASH: 5000, CLOSE: 10900, TO_BAL: 11500,
  WEIGH: 12200, CALC: 13900, CLEAN: 15300, DONE: 17100 };

/* ---- density coil geometry (local coords; origin = inlet fitting face, y = 0 = inlet line) ----
   One continuous stainless tube: inlet nut → block valve (red T-handle) → compression nut → lead
   bends down into a flat, compact helix (≈3½ horizontal turns, axis vertical, seen from slightly
   above: wide ellipses, small pitch so neighbouring turns touch) → outlet lead + nut + plug.
   Segments are listed in flow order so the sample fills the tube progressively. */
const CG = (function () {
  const CX = 178, RX = 80, RY = 21, CY = 20, P = 9, TURNS = 3.5, HX = 78, OUT = 284, YO = 36;
  const f1 = v => Math.round(v * 10) / 10;
  const hel = th => [CX - RX * Math.cos(th), CY + RY * Math.sin(th) + P * th / (2 * Math.PI)];
  const segs = [];
  const add = (pts, front, k) => segs.push({ pts, front, k, d: 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join(' L') });
  // inlet lead: straight through the valve, then a bend down into the top turn
  const lead = [[0, 0], [HX, 0]];
  for (let j = 1; j <= 10; j++) { const t = j / 10, u = 1 - t; lead.push([u * u * HX + 2 * u * t * (CX - RX) + t * t * (CX - RX), 2 * u * t * 0 + t * t * CY]); }
  add(lead, true, -1);
  // helix, split at half-turns: k even = front (near, lower) half, k odd = back (far, upper) half
  for (let k = 0; k < TURNS * 2; k++) {
    const pts = [];
    for (let j = 0; j <= 36; j++) pts.push(hel(Math.PI * (k + j / 36)));
    add(pts, k % 2 === 0, k);
  }
  // outlet lead: leaves the right side of the last turn, bends out to the outlet nut
  const e = hel(Math.PI * TURNS * 2), out = [e];
  for (let j = 1; j <= 10; j++) {
    const t = j / 10, u = 1 - t;
    out.push([u * u * u * e[0] + 3 * u * u * t * e[0] + 3 * u * t * t * (e[0] + 4) + t * t * t * (e[0] + 16),
              u * u * u * e[1] + 3 * u * u * t * (e[1] - 10) + 3 * u * t * t * YO + t * t * t * YO]);
  }
  out.push([OUT - 8, YO]);
  add(out, true, 99);
  // cumulative length (flow order) → fill fractions a..b per segment, plus one lookup polyline
  let tot = 0;
  const L = [], PT = [], SG = [];
  segs.forEach((s, si) => {
    let l = 0;
    for (let k = 0; k < s.pts.length; k++) {
      if (k > 0) l += Math.hypot(s.pts[k][0] - s.pts[k - 1][0], s.pts[k][1] - s.pts[k - 1][1]);
      if (k > 0 || si === 0) { PT.push(s.pts[k]); L.push(tot + l); SG.push(si); }
    }
    s.len = l; tot += l;
  });
  let acc = 0;
  segs.forEach(s => { s.a = acc / tot; acc += s.len; s.b = acc / tot; });
  // point, unit tangent and segment at path fraction f
  const at = f => {
    const d = Math.max(0, Math.min(1, f)) * tot;
    let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= d) lo = m; else hi = m; }
    const p = PT[lo], q = PT[hi], w = (d - L[lo]) / Math.max(1e-6, L[hi] - L[lo]);
    const dx = q[0] - p[0], dy = q[1] - p[1], n = Math.hypot(dx, dy) || 1;
    return { x: p[0] + dx * w, y: p[1] + dy * w, tx: dx / n, ty: dy / n, seg: segs[SG[hi]] };
  };
  return { segs, tot, at, OUT, YO, CX, RX, CY, RY, P };
})();

/* ---- two-phase model inside the coil (VISUAL ONLY — no measured data behind it) ----
   Plug flow: a fluid parcel that entered when the fill fraction was u sits at s = fill − u.
   Liberation level Λ = min(residence in coil, time since flash onset) / TAU, in fill units, so gas
   only starts once the flash stage begins and always increases downstream.
   Λ drives: nucleation (per-parcel threshold) → growth → clusters coalescing into one bubble →
   bubbles larger than the bore become elongated slugs (volume conserved, expanded as Λ rises). */
const FL = (function () {
  const F0 = (T.FLASH - T.XFER) / T.XFER_MS;   // fill fraction when the flash stage starts
  const TAU = 0.5, SLUG = 0.74;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const sm = v => v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
  // parcels (u, lateral, size, nucleation threshold) grouped into clusters with a coalescence threshold
  const field = (n, u0, u1, seed, big) => {
    const R = rng(seed), cl = [];
    let i = 0;
    while (i < n) {
      const m = Math.min(n - i, 2 + Math.floor(R() * (big ? 6 : 5)));
      const ps = [];
      for (let j = 0; j < m; j++, i++) ps.push({ u: u0 + (u1 - u0) * (i + .15 + .7 * R()) / n, lat: R() * 2 - 1, r0: .18 + .3 * R(), ln: .02 + .38 * R() });
      const uc = ps.reduce((a, p) => a + p.u, 0) / m;
      cl.push({ ps, uc, lm: R() < .28 ? 9 : .42 + .4 * R() });
    }
    return cl;
  };
  const lam = (s, fill) => Math.max(0, Math.min(1, Math.min(s, fill - F0) / TAU));
  // evaluate clusters → { b: [{s, lat, r}], g: [{s, len}] }  (r, len in bore radii; s in fill fraction)
  const evalF = (cls, fill, flash, sOf) => {
    const b = [], g = [];
    if (!flash) return { b, g };
    cls.forEach(c => {
      const sc = sOf(c.uc);
      if (sc < 0) return;
      const Lc = lam(sc, fill), mrg = sm((Lc - c.lm) / .16), E = 1 + 2 * sm((Lc - .45) / .55);
      let vol = 0;
      const live = [];
      c.ps.forEach(p => {
        const s = sOf(p.u);
        if (s < 0) return;
        const Lp = lam(s, fill);
        if (Lp <= p.ln) return;
        const r = p.r0 * (.14 + .86 * sm((Lp - p.ln) / .42)) * Math.cbrt(E);
        vol += r * r * r;
        live.push({ s, lat: p.lat, r });
      });
      if (!live.length) return;
      if (mrg >= .999 && live.length > 1) {
        const r = Math.cbrt(vol);
        if (r > SLUG) g.push({ s: sc, len: 2 * SLUG + 4 / 3 * (vol - SLUG * SLUG * SLUG) / (SLUG * SLUG) });
        else b.push({ s: sc, lat: -.15, r });
      } else live.forEach(p => {
        const lat = p.lat * (1 - mrg) * Math.max(0, 1 - Math.min(p.r, .9)) - .15 * mrg;
        b.push({ s: p.s + (sc - p.s) * mrg * .85, lat, r: Math.min(p.r, .95) });
      });
    });
    return { b, g };
  };
  return { F0, lam, field, evalF, coil: field(250, 0, 1, 7, false), zoom: field(74, .08, .66, 31, true) };
})();
const circ = (x, y, r) => 'M' + (x - r).toFixed(1) + ' ' + y.toFixed(1) + 'a' + r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 1 0 ' + (2 * r).toFixed(2) + ' 0a' + r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 1 0 ' + (-2 * r).toFixed(2) + ' 0';

// tube layers are static geometry: build them once (lower turns first so upper turns overlap them)
const order = front => CG.segs.filter(s => s.front === front).sort((p, q) => q.k - p.k);
const tube = front => order(front).map(s =>
  '<path d="' + s.d + '" fill="none" stroke="#0a0e16" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round"></path>' +
  '<path d="' + s.d + '" fill="none" stroke="' + (front ? '#aebbd0' : '#66778f') + '" stroke-width="8.2" stroke-linecap="round" stroke-linejoin="round"></path>' +
  '<path d="' + s.d + '" fill="none" stroke="' + (front ? '#7c8daa' : '#4f5d75') + '" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,1.2)"></path>' +
  '<path d="' + s.d + '" fill="none" stroke="' + (front ? '#f3f7fd' : '#a9b7cc') + '" stroke-width="1.5" stroke-linecap="round" opacity="' + (front ? .7 : .35) + '" transform="translate(-.4,-2.2)"></path>').join('');
// hex nut of a compression fitting, centred on (x, y)
const nut = (x, w, y) => { y = y || 0; return '<rect x="' + (x - w / 2) + '" y="' + (y - 8.5) + '" width="' + w + '" height="17" rx="1.6" fill="url(#dn-metalv)" stroke="#0a0e16" stroke-width="1"></rect>' +
  '<line x1="' + (x - w / 6) + '" y1="' + (y - 8) + '" x2="' + (x - w / 6) + '" y2="' + (y + 8) + '" stroke="#0a0e16" stroke-width=".7" opacity=".55"></line>' +
  '<line x1="' + (x + w / 6) + '" y1="' + (y - 8) + '" x2="' + (x + w / 6) + '" y2="' + (y + 8) + '" stroke="#0a0e16" stroke-width=".7" opacity=".55"></line>'; };

class Component extends DCLogic {
  state = {
    active: 1, busy: false, chain: false, done: { 1: false, 2: false },
    action: 'Coil is clean, dry and empty. Start Run 1.', stage: 'Ready',
    cellV: D.V0, xfer: 0, coilPos: 'balance', coilFill: 0, coilState: 'CLEAN · DRY · EMPTY',
    bal: null, weigh: null, flow: false, flash: false,
    mi1: null, mf1: null, v1i: null, v1f: null, r1: null,
    mi2: null, mf2: null, v2i: null, v2f: null, r2: null,
    verified: false, failed: false
  };

  componentWillUnmount() { this.stop(); }
  stop() {
    (this.timers || []).forEach(t => PCLK.clearTimeout(t));
    this.timers = [];
    if (this.raf) PCLK.cancelRaf(this.raf);
    this.raf = null;
  }
  at(ms, fn) { this.timers = this.timers || []; this.timers.push(PCLK.setTimeout(fn, PT(ms))); }
  tw(ms, apply, ease) {
    const t0 = PCLK.now();
    const tick = () => {
      const p = Math.min(1, (PCLK.now() - t0) / PT(ms));
      const e = ease === 'lin' ? p : p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      apply(e);
      if (p < 1) this.raf = PCLK.raf(tick);
      else this.raf = null;
    };
    this.raf = PCLK.raf(tick);
  }
  val(k, fb) { return this.props[k] != null ? Number(this.props[k]) : fb; }

  // one full measurement run: weigh empty coil → connect → transfer 7 cc (cell 30 → 23 cc) → weigh filled → calculate → clean
  startRun(n) {
    if (this.state.busy || this.state.done[n]) return;
    if (n === 2 && !this.state.done[1]) return;
    this.stop();
    const MI = n === 1 ? this.val('mi1', D.MI1) : this.val('mi2', D.MI2);
    const MF = n === 1 ? this.val('mf1', D.MF1) : this.val('mf2', D.MF2);
    const v0 = this.state.cellV;
    const K = n === 1 ? { mi: 'mi1', mf: 'mf1', vi: 'v1i', vf: 'v1f', r: 'r1' }
                      : { mi: 'mi2', mf: 'mf2', vi: 'v2i', vf: 'v2f', r: 'r2' };

    this._runT0 = PCLK.now();
    this.setState({ busy: true, active: n, xfer: 0, coilFill: 0, coilPos: 'balance', bal: 0, weigh: 'mi',
      stage: 'Weighing empty coil', action: 'Run ' + n + ' — weighing the clean, dry, empty coil on the balance (Mi).' });
    this.tw(1500, e => this.setState({ bal: MI * e }));

    this.at(T.CONNECT, () => this.setState({ [K.mi]: MI, bal: MI, weigh: null,
      stage: 'Connecting coil', action: 'Run ' + n + ' — Mi recorded. Lifting the coil and connecting its inlet fitting to the PVT cell sample line.', coilPos: 'cell' }));

    this.at(T.XFER, () => {
      this.setState({ flow: true, bal: null, [K.vi]: v0, [K.vf]: v0,
        stage: 'Transferring 7 cc', action: 'Run ' + n + ' — block valve open. The pump piston rises and the PVT cell volume falls from ' + v0.toFixed(1) + ' cc; the displaced sample travels through the stainless loops of the coil.' });
      this.tw(T.XFER_MS, e => this.setState({ cellV: v0 - D.XFER * e, xfer: D.XFER * e, coilFill: e, [K.vf]: v0 - D.XFER * e }), 'lin');
    });

    // the coil sits below cell pressure, so the fluid entering it flashes into liquid + gas
    this.at(T.FLASH, () => this.setState({ flash: true, coilState: 'OIL + EVOLVED GAS',
      stage: 'Flashing in coil', action: 'Run ' + n + ' — oil advances through the coil; below the bubble point gas evolves as bubbles inside the oil. Both phases stay sealed in the coil.' }));

    this.at(T.CLOSE, () => this.setState({ flow: false, cellV: v0 - D.XFER, xfer: D.XFER, coilFill: 1,
      [K.vf]: v0 - D.XFER, coilState: 'FILLED · 7.0 CC · OIL + GAS',
      stage: 'Closing block valve', action: 'Run ' + n + ' — cell volume ' + v0.toFixed(1) + ' → ' + (v0 - D.XFER).toFixed(1) + ' cc, so ΔV = 7.0 cc. Block valve closed (red T-handle turned) to seal the coil.' }));

    this.at(T.TO_BAL, () => this.setState({ coilPos: 'balance', bal: 0, weigh: 'mf',
      stage: 'Weighing filled coil', action: 'Run ' + n + ' — weighing the sealed coil (Mf). Oil and evolved gas are both still inside, so the full transferred mass is weighed.' }));
    this.at(T.WEIGH, () => this.tw(1500, e => this.setState({ bal: MF * e })));

    this.at(T.CALC, () => {
      const dM = MF - MI, dV = D.XFER;
      this.setState({ [K.mf]: MF, bal: MF, weigh: null, [K.r]: dM / dV,
        stage: 'Calculating density', action: 'Run ' + n + ' — ρ = ΔM / ΔV computed from the mass gained by the coil and the volume displaced from the cell.' });
    });

    this.at(T.CLEAN, () => this.setState({ coilFill: 0, flash: false, coilState: 'CLEANING · DRYING',
      stage: 'Cleaning coil', action: 'Run ' + n + ' — cleaning and drying the coil.' }));

    this.at(T.DONE, () => {
      const done = { ...this.state.done, [n]: true };
      const both = done[1] && done[2];
      const r1 = n === 1 ? (MF - MI) / D.XFER : this.state.r1;
      const r2 = n === 2 ? (MF - MI) / D.XFER : this.state.r2;
      const ok = both ? Math.abs(r1 - r2) <= D.TOL : false;
      this.setState({
        done, busy: false, coilState: 'CLEAN · DRY · EMPTY', bal: null, weigh: null, coilPos: 'balance', flash: false,
        active: both ? n : 2,
        verified: both && ok, failed: both && !ok,
        stage: both ? (ok ? 'Verified' : 'Repeat required') : 'Run 1 complete',
        action: both
          ? (ok ? 'Both runs agree within ±0.0005 g/cc — density verified.' : 'Densities differ by more than ±0.0005 g/cc — repeat the measurement.')
          : 'Run 1 complete. Coil cleaned and ready — start Run 2.'
      });
      if (both && ok && this.props.onVerified) this.props.onVerified();
      if (!both && this.state.chain) this.at(900, () => this.startRun(2));
      else this.setState({ chain: false });
    });
  }

  runBoth() {
    if (this.state.busy) return;
    const n = this.state.done[1] ? 2 : 1;
    if (this.state.done[1] && this.state.done[2]) return;
    this.setState({ chain: true });
    this.startRun(n);   // runtime setState is synchronous and takes no callback
  }
  /* ---- shared procedure panel (ProcCtl.js): stage 1 = Run 1, stage 2 = Run 2 ---- */
  pcK() { const st = this.state; return st.busy ? st.active - 1 : st.done[1] ? 1 : 0; }
  pcInfo() {
    const st = this.state, k = this.pcK(), pz = PCLK.paused(), live = !!st.busy || (!!st.chain && PCLK.busy());
    const all = !!(st.done[1] && st.done[2]);
    const cur = !st.busy && st.done[k + 1];
    return { N: 2, k, title: 'Run ' + (k + 1) + ' — ' + (k === 0 ? 'density measurement' : 'repeat measurement'), q: st.action || '', unit: 'Stage',
      status: live ? (pz ? 'paused' : 'running') : cur ? 'complete' : 'ready', allDone: all,
      frac: st.busy && this._runT0 != null ? Math.min(1, (PCLK.now() - this._runT0) / PT(T.DONE)) : null,
      doneMask: [!!st.done[1], !!st.done[2]],
      canPrev: k > 0, canNext: k < 1, canRestart: st.busy || cur,
      runLabel: 'Start Run ' + (k + 1), runAll: all ? null : 'Run Both Runs', runAllDisabled: st.busy,
      reset: 'Reset Direct Density', resetDisabled: !st.busy && !st.done[1] };
  }
  pcReplay(m) {
    PCLK.clearAll(); PCLK.resume();
    this.reset();
    for (let n = 1; n <= m; n++) { this.startRun(n); PCLK.flush(); }
  }
  pcAct(a) {
    const st = this.state, k = this.pcK();
    if (a === 'run') { if (!st.busy && !(st.chain && PCLK.busy())) { PCLK.resume(); this.startRun(k + 1); } }
    else if (a === 'pause') { if (st.busy || (st.chain && PCLK.busy())) PCLK.pause(); }
    else if (a === 'resume') PCLK.resume();
    else if (a === 'restart') this.pcReplay(k);
    else if (a === 'prev') this.pcReplay(k - 1);
    else if (a === 'next') { if (st.busy) { PCLK.resume(); this.setState({ chain: false }); PCLK.flush(); } else this.pcReplay(k + 1); }
    else if (a === 'runAll') { PCLK.resume(); this.runBoth(); }
    else if (a === 'reset') { PCLK.clearAll(); PCLK.resume(); this.reset(); }
  }
  reset() {
    this.stop();
    this.setState({
      active: 1, busy: false, chain: false, done: { 1: false, 2: false },
      action: 'Coil is clean, dry and empty. Start Run 1.', stage: 'Ready',
      cellV: D.V0, xfer: 0, coilPos: 'balance', coilFill: 0, coilState: 'CLEAN · DRY · EMPTY',
      bal: null, weigh: null, flow: false, flash: false,
      mi1: null, mf1: null, v1i: null, v1f: null, r1: null,
      mi2: null, mf2: null, v2i: null, v2f: null, r2: null,
      verified: false, failed: false
    });
  }

  /* liberated gas inside the coil + magnified "flow inside coil" view (visual only) */
  twoPhase(st) {
    const fill = st.coilFill, flash = st.flash;
    const RIN = 1.5;                                   // bore radius in the coil drawing (px)
    const res = FL.evalF(FL.coil, fill, flash, u => fill - u);
    const gb = { true: [], false: [] }, sl = { true: [], false: [] };
    res.b.forEach(q => {
      const p = CG.at(q.s), r = Math.max(.42, q.r * RIN), o = q.lat * (RIN - r * .6);
      gb[p.seg.front].push(circ(p.x - p.ty * o, p.y + p.tx * o, r));
    });
    res.g.forEach(q => {
      const h = (q.len - 2 * .74) * RIN / 2 / CG.tot, pts = [];
      for (let j = 0; j <= 6; j++) { const p = CG.at(q.s - h + 2 * h * j / 6); pts.push(p.x.toFixed(1) + ' ' + p.y.toFixed(1)); }
      sl[CG.at(q.s).seg.front].push('M' + pts.join(' L'));
    });
    // magnified window: moves along with the flow at 30 % of the fluid speed, so the oil drifts left → right
    const ZX0 = 1140, ZW = 248, XC = ZX0 + ZW / 2, ZY = 353, RZ = 15, SC = ZW / .2;
    const uc = FL.F0 + .3 * Math.max(0, fill - FL.F0), sc = Math.max(0, fill - uc);
    const zr = FL.evalF(FL.zoom, fill, flash, u => fill - u);
    const X = s => XC + (uc - fill + s) * SC;
    const zb = [], zs = [];
    zr.b.forEach(q => { const x = X(q.s); if (x > ZX0 - 14 && x < ZX0 + ZW + 14) zb.push(circ(x, ZY + q.lat * (RZ - q.r * RZ * .9), Math.max(.7, q.r * RZ))); });
    zr.g.forEach(q => { const x = X(q.s), h = (q.len - 2 * .74) * RZ / 2; if (x + h > ZX0 - 20 && x - h < ZX0 + ZW + 20) zs.push('M' + (x - h).toFixed(1) + ' ' + (ZY - 1.5) + ' H' + (x + h).toFixed(1)); });
    const lc = FL.lam(sc, fill);
    const cap = !flash ? '' : lc < .04 ? 'Single-phase oil — gas still dissolved'
      : lc < .22 ? 'Gas nuclei appear in the oil'
      : lc < .45 ? 'Many fine bubbles dispersed in the oil'
      : lc < .7 ? 'Bubbles grow and start to coalesce'
      : 'Two-phase flow — gas pockets between oil';
    const zoomOn = flash && st.coilPos === 'cell' && fill > 0;
    const m = CG.at(sc), mx = 1118 + m.x, my = 190 + m.y, xin = X(0);
    return {
      dnGasB: gb.false.join('') || 'M0 0', dnGasF: gb.true.join('') || 'M0 0',
      dnSlugB: sl.false.join('') || 'M0 0', dnSlugF: sl.true.join('') || 'M0 0',
      dnZoomStyle: 'opacity:' + (zoomOn ? 1 : 0) + '; transition:opacity .5s ease; pointer-events:none;',
      dnMarkX: m.x.toFixed(1), dnMarkY: m.y.toFixed(1),
      dnLeadD: 'M' + mx.toFixed(1) + ' ' + (my + 7).toFixed(1) + ' L' + Math.max(ZX0 + 20, Math.min(ZX0 + ZW - 20, mx)).toFixed(1) + ' 314',
      dnZGas: zb.join('') || 'M0 0', dnZSlug: zs.join('') || 'M0 0',
      dnZInD: xin > ZX0 + 4 && xin < ZX0 + ZW - 4 ? 'M' + xin.toFixed(1) + ' ' + (ZY - RZ) + ' V' + (ZY + RZ) : 'M0 0',
      dnZInX: xin.toFixed(1), dnZInStyle: 'opacity:' + (xin > ZX0 + 4 && xin < ZX0 + ZW - 4 ? 1 : 0) + ';',
      dnZCap: cap,
      dnZWall: ((sc * SC) % 12).toFixed(2)
    };
  }

  renderVals() {
    const st = this.state;
    const a = st.active, busy = st.busy;
    const both = st.done[1] && st.done[2];
    const sub = a === 1 ? '₁' : '₂';
    const MUT = '#52627d', GOLD = '#e2c65a', BLUE = '#6fb7ff', GRN = '#46d39a';

    // active-run values: mass from the balance, volume from the PVT cell
    const mi = a === 1 ? st.mi1 : st.mi2, mf = a === 1 ? st.mf1 : st.mf2;
    const vi = a === 1 ? st.v1i : st.v2i, vf = a === 1 ? st.v1f : st.v2f;
    const r = a === 1 ? st.r1 : st.r2;
    // live balance reading while a weighing is in progress
    const miLive = mi != null ? mi : (st.weigh === 'mi' && st.bal != null ? st.bal : null);
    const mfLive = mf != null ? mf : (st.weigh === 'mf' && st.bal != null ? st.bal : null);
    const dM = mi != null && mf != null ? mf - mi : null;
    const dV = vi != null && vf != null ? vi - vf : null;
    const xferLive = st.flow;
    const diff = st.r1 != null && st.r2 != null ? Math.abs(st.r1 - st.r2) : null;
    const avg = st.r1 != null && st.r2 != null ? (st.r1 + st.r2) / 2 : null;
    const fx = (v, d) => v == null ? '—' : v.toFixed(d);

    const tickV = vi != null ? vi : st.cellV;
    const coilY = st.coilPos === 'cell' ? 190 : 404;   // 404: lowest turn rests on the balance pan (y 480)
    const pillCol = st.verified ? 'var(--grn)' : st.failed ? 'var(--red)' : busy ? 'var(--blue)' : 'var(--txt2)';
    const clamp = v => Math.max(0, Math.min(1, v));
    const segStyle = s => 'stroke-dashoffset:' + (100 - clamp((st.coilFill - s.a) / (s.b - s.a)) * 100).toFixed(2) + '; transition:stroke-dashoffset .2s linear;';

    // main highlighted result
    let resLabel, resVal, resNote, resCol;
    if (both && st.verified) { resLabel = 'DENSITY · VERIFIED'; resVal = 'ρ = ' + avg.toFixed(4) + ' g/cc'; resNote = 'Average of Run 1 and Run 2'; resCol = GRN; }
    else if (both && st.failed) { resLabel = 'DENSITY · NOT ACCEPTED'; resVal = 'Repeat required'; resNote = '|ρ₁ − ρ₂| exceeds ±0.0005 g/cc'; resCol = '#ff7a8c'; }
    else if (r != null) { resLabel = 'DENSITY · RUN ' + a; resVal = 'ρ' + sub + ' = ' + r.toFixed(4) + ' g/cc'; resNote = 'ΔM / ΔV = ' + dM.toFixed(3) + ' g ÷ ' + dV.toFixed(1) + ' cc'; resCol = GRN; }
    else {
      resLabel = 'DENSITY · RUN ' + a; resVal = 'ρ' + sub + ' = —'; resCol = MUT;
      resNote = st.weigh === 'mf' ? 'Weighing the filled coil — Mf'
        : xferLive ? 'Transferring — cell volume falling, ΔV rising'
        : vf != null && dV != null && dV > 0 ? 'ΔV recorded — awaiting Mf'
        : mi != null ? 'Mi recorded — connect and transfer'
        : st.weigh === 'mi' ? 'Weighing the empty coil — Mi'
        : 'Awaiting the first measured value';
    }

    const runRow = n => {
      const rv = n === 1 ? st.r1 : st.r2, on = busy && a === n, dn = st.done[n];
      return { name: 'Run ' + n, rho: 'ρ' + (n === 1 ? '₁' : '₂'), v: rv == null ? '—' : rv.toFixed(4),
        col: rv == null ? MUT : GRN,
        tag: dn ? 'STORED' : on ? 'RUNNING' : (n === 2 && !st.done[1]) ? 'LOCKED' : 'PENDING',
        tagCol: dn ? GRN : on ? BLUE : MUT,
        style: 'display:grid; grid-template-columns:3.6em 1.6em minmax(0,1fr) 2.6em 4.6em; align-items:baseline; column-gap:6px; padding:3px 8px; border-radius:6px; background:' +
          (on ? 'rgba(111,183,255,.08)' : 'transparent') + ';' };
    };

    return {
      srcContext: this.props.srcContext || 'Bottom Hole Sample',
      onBack: this.props.onBack || (() => {}),
      onValidation: this.props.onValidation || (() => {}),

      dnPillText: st.stage, dnPillColor: pillCol,
      dnPillBg: pillCol === 'var(--grn)' ? 'rgba(29,138,90,.10)' : pillCol === 'var(--red)' ? 'rgba(195,58,82,.10)' : 'var(--chipbg)',
      dnPillBorder: pillCol === 'var(--grn)' ? 'rgba(29,138,90,.40)' : pillCol === 'var(--red)' ? 'rgba(195,58,82,.40)' : 'var(--line2)',
      dnPillDot: 'width:7px; height:7px; border-radius:50%; background:' + pillCol + ';',

      dnRunText: both ? 'Both Runs' : 'Run ' + a + ' of 2',
      dnCellVText: st.cellV.toFixed(1) + ' cc',
      dnXferText: st.xfer.toFixed(1) + ' cc',
      dnRhoText: (both && st.verified ? avg : r) == null ? '—' : (both && st.verified ? avg : r).toFixed(4) + ' g/cc',
      dnRhoColor: r == null ? 'var(--mut)' : 'var(--grn)',
      dnPressureText: D.PRESSURE.toLocaleString() + ' psi',
      dnPNum: D.PRESSURE.toLocaleString(), dnFlowOn: !!st.flow, dnCoilAtCell: st.coilPos === 'cell',
      dnActionText: st.action, dnActionColor: busy ? 'var(--blue)' : 'var(--mut)',

      /* ---- schematic ---- */
      dnSampleH: Math.max(6, st.cellV * PXCC).toFixed(1),
      dnPistonY: (219 + Math.max(6, st.cellV * PXCC)).toFixed(1),
      dnTickHiY: (219 + tickV * PXCC).toFixed(1), dnTickHiT: (222 + tickV * PXCC).toFixed(1), dnTickHi: tickV.toFixed(0),
      dnTickLoY: (219 + (tickV - D.XFER) * PXCC).toFixed(1), dnTickLoT: (222 + (tickV - D.XFER) * PXCC).toFixed(1), dnTickLo: (tickV - D.XFER).toFixed(0),
      dnDvTxtY: (219 + tickV * PXCC - 7).toFixed(1),
      dnSweptStyle: 'opacity:' + (st.xfer > 0.05 || (vi != null && vf != null && vi - vf > .05) ? 1 : 0) + '; transition:opacity .4s ease;',
      dnFlowStyle: 'opacity:' + (st.flow ? 1 : 0) + '; transition:opacity .3s ease;',
      dnLineLabel: st.flow ? 'SAMPLE TRANSFER → COIL' : st.coilPos === 'cell' ? 'COIL CONNECTED' : 'SAMPLE LINE',
      dnLineLabelColor: st.flow ? 'var(--amb)' : 'var(--cap)',
      dnValveFill: st.flow ? '#ffcf3f' : '#54657f',
      dnCoilStyle: 'transform:translate(1118px,' + coilY + 'px); transition:transform calc(.9s * var(--pm, 1)) cubic-bezier(.4,0,.2,1);',
      // quarter-turn T-handle: bar in line with the tube = open, turned across it (seen end-on) = closed
      dnHandleStyle: 'transform-box:fill-box; transform-origin:center; transform:scaleX(' + (st.flow ? 1 : .26) + '); transition:transform .45s ease;',
      dnValveTag: st.flow ? 'BLOCK VALVE OPEN' : 'BLOCK VALVE CLOSED',
      dnValveTagCol: st.flow ? 'var(--grn)' : 'var(--mut)',
      dnSegB: CG.segs.filter(s => !s.front).map(s => ({ d: s.d, st: segStyle(s) })),
      dnSegF: CG.segs.filter(s => s.front).map(s => ({ d: s.d, st: segStyle(s) })),
      ...this.twoPhase(st),
      dnFlashLabelStyle: 'opacity:' + (st.flash ? 1 : 0) + '; transition:opacity .4s ease;',
      dnCoilState: st.coilState,
      dnCoilStateColor: st.coilFill > .5 ? 'var(--amb)' : 'var(--mut)',
      dnBalText: st.bal == null ? '0.000 g' : st.bal.toFixed(3) + ' g',
      dnBalLed: st.coilPos === 'balance' ? '#46d39a' : '#54657f',
      dnOnBalance: st.coilPos === 'balance' ? 'COIL ON PAN' : 'PAN EMPTY',

      /* ---- run chips (unchanged controls) ---- */
      dnStepBadge: both ? 'RUNS 1 + 2 COMPLETE' : 'RUN ' + a + ' OF 2',
      dnRunChips: [1, 2].map(n => {
        const on = a === n && !both, dn = st.done[n];
        const rr = n === 1 ? st.r1 : st.r2;
        const locked = n === 2 && !st.done[1];
        const run = busy && a === n;
        const accent = dn ? 'var(--grn)' : (on ? 'var(--blue)' : 'var(--line2)');
        return {
          name: 'Run ' + n,
          tag: dn ? 'Complete' : run ? 'Running' : locked ? 'Locked' : 'Ready',
          tagColor: dn ? 'var(--grn)' : run ? 'var(--blue)' : on ? 'var(--blue)' : 'var(--mut)',
          color: dn || on ? 'var(--txt)' : 'var(--mut)',
          rho: rr == null ? '—' : rr.toFixed(4),
          rhoColor: rr == null ? 'var(--mut2)' : 'var(--grn)',
          lockStyle: 'display:' + (locked ? 'inline-block' : 'none') + '; width:9px; height:10px; flex:0 0 auto;',
          style: 'flex:1 1 0; min-width:0; display:flex; flex-direction:column; gap:3px; padding:7px 11px 7px; border-radius:10px; opacity:' +
            (dn || on ? '1' : '.62') + '; background:' +
            (dn ? 'rgba(29,138,90,.08)' : on ? 'rgba(47,111,208,.09)' : 'var(--icard)') + '; border:1px solid ' +
            (dn ? 'rgba(29,138,90,.35)' : on ? 'rgba(47,111,208,.45)' : 'var(--line)') +
            '; box-shadow:inset 0 -2.5px 0 ' + accent + ';' + (locked ? ' border-style:dashed;' : '')
        };
      }),

      /* ---- working equation + results (single dark panel) ---- */
      dnEqMi: miLive == null ? 'Mi' : miLive.toFixed(3), dnEqMiColor: miLive == null ? MUT : GOLD,
      dnEqMf: mfLive == null ? 'Mf' : mfLive.toFixed(3), dnEqMfColor: mfLive == null ? MUT : GOLD,
      dnEqVi: vi == null ? 'Vi' : vi.toFixed(1), dnEqViColor: vi == null ? MUT : BLUE,
      dnEqVf: vf == null ? 'Vf' : vf.toFixed(1), dnEqVfColor: vf == null ? MUT : BLUE,
      dnEqMass: [
        { k: 'Mi', d: 'Empty coil', v: fx(miLive, 3), u: 'g', color: miLive == null ? MUT : GOLD, live: st.weigh === 'mi' ? '●' : '' },
        { k: 'Mf', d: 'Filled coil', v: fx(mfLive, 3), u: 'g', color: mfLive == null ? MUT : GOLD, live: st.weigh === 'mf' ? '●' : '' },
        { k: 'ΔM', d: 'Mf − Mi', v: fx(dM, 3), u: 'g', color: dM == null ? MUT : GOLD, live: '' }
      ],
      dnEqVol: [
        { k: 'Vi', d: 'Initial cell volume', v: fx(vi, 1), u: 'cc', color: vi == null ? MUT : BLUE, live: '' },
        { k: 'Vf', d: 'Final cell volume', v: fx(vf, 1), u: 'cc', color: vf == null ? MUT : BLUE, live: xferLive ? '●' : '' },
        { k: 'ΔV', d: 'Transferred Vi − Vf', v: fx(dV, 1), u: 'cc', color: dV == null ? MUT : BLUE, live: xferLive ? '●' : '' }
      ],
      dnResLabel: resLabel, dnResVal: resVal, dnResNote: resNote, dnResCol: resCol,
      dnResBox: 'flex:0 0 auto; display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 10px 9px; border-radius:10px; background:' +
        (resCol === GRN ? 'rgba(70,211,154,.10)' : resCol === MUT ? 'rgba(127,147,179,.05)' : 'rgba(255,122,140,.10)') + '; border:1px solid ' +
        (resCol === GRN ? 'rgba(70,211,154,.55)' : resCol === MUT ? '#2a3852' : 'rgba(255,122,140,.55)') + ';' +
        (resCol === GRN ? ' box-shadow:0 0 0 3px rgba(70,211,154,.08), inset 0 0 18px rgba(70,211,154,.06);' : ''),
      dnRuns: [runRow(1), runRow(2)],
      dnCmpText: diff == null ? '—' : diff.toFixed(4) + ' g/cc',
      dnCmpColor: diff == null ? MUT : diff <= D.TOL ? GRN : '#ff7a8c',
      dnVerdict: st.verified ? 'VERIFIED ✓' : st.failed ? 'REPEAT' : both ? 'COMPARING' : 'AWAITING RUN 2',
      dnVerdictColor: st.verified ? GRN : st.failed ? '#ff7a8c' : MUT,
      dnShowRepeat: st.failed, dnRepeat: () => this.reset()
    };
  }
}

DC.define('StageDensity', {
  style: `/* Standalone-only fallback: matches only when this DC is opened on its own.
     When embedded in PVT Nexus the selector never matches, so the global theme
     (html / html[data-theme="light"]) in theme.css is used untouched. */
  #dc-root > .sc-host > [data-screen-label="Direct Density"] {
    --bg:#eef1f6; --board:#ffffff; --panel:#ffffff; --panel2:#f4f6fa;
    --line:rgba(40,60,90,.12); --line2:rgba(40,60,90,.20);
    --txt:#16202f; --txt2:#3a4759; --mut:#566578; --mut2:#8492a4;
    --blue:#2f6fd0; --grn:#1d8a5a; --amb:#b9831f; --red:#c33a52;
    --inset:#eef2f8; --cap:rgba(38,56,80,.68); --cap2:rgba(38,56,80,.78);
    --chipbg:#eaeff7; --chipt:#3a4759; --icard:#f4f6fa; --dis:#9aa7b8;
    --accb3:#2f6fd0;
    font-family:'IBM Plex Sans',system-ui,sans-serif;
    background:var(--bg); color:var(--txt);
    -webkit-font-smoothing:antialiased;
  }
  #dc-root > .sc-host > [data-screen-label="Direct Density"] * { box-sizing:border-box; }
  @keyframes dndash { to { stroke-dashoffset:-24; } }
  /* a gas bubble nucleating in the oil, growing, then drifting along the tube */
  @keyframes dnbub {
    0%   { opacity:0;   transform:translate(0,0) scale(.2); }
    22%  { opacity:.95; transform:translate(2px,0) scale(.7); }
    70%  { opacity:.95; transform:translate(8px,-.8px) scale(1); }
    100% { opacity:0;   transform:translate(13px,-1.4px) scale(1.12); }
  }
  /* bubble nucleating and growing in place inside the coil tube */
  @keyframes dnbub2 {
    0%   { opacity:0;   transform:scale(.25); }
    30%  { opacity:.95; transform:scale(.8); }
    75%  { opacity:.95; transform:scale(1.05); }
    100% { opacity:0;   transform:scale(1.15); }
  }`,
  template: `<div data-screen-label="Direct Density" style="display:flex; flex-direction:column; height:var(--page-h); overflow:hidden; padding:var(--page-pad-y) var(--page-pad-x) 12px; gap:8px; box-sizing:border-box;">

  <!-- 1 · header + test summary -->
  <div style="flex:0 0 auto; background:var(--panel); border:1px solid var(--line); border-radius:12px; box-shadow:0 1px 2px rgba(20,35,60,.05); display:flex; align-items:center; gap:14px; padding:8px 12px 8px 16px; min-width:0;">
    <div style="flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:3px;">
      <div style="display:flex; align-items:center; gap:10px; min-width:0;">
        <h2 class="pg-title">Direct Density</h2>
        <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10px; letter-spacing:.5px; padding:2px 8px; border-radius:6px; background:var(--chipbg); border:1px solid var(--line2); color:var(--chipt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;">{{ srcContext }}</span>
      </div>
      <div style="font-size:11px; line-height:1.35; color:var(--mut); overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">Transfer a known volume from the PVT cell into a weighed density coil, then determine density from the mass gained</div>
    </div>
    <div style="flex:0 0 auto; display:flex; align-items:stretch; padding:3px 0; border-left:1px solid var(--line);">
      <div style="display:flex; flex-direction:column; justify-content:center; gap:2px; padding:0 16px; min-width:104px; border-left:1px solid var(--line);">
        <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:.9px; text-transform:uppercase; color:var(--mut); white-space:nowrap;">Run</span>
        <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:13.5px; font-weight:600; color:var(--txt); white-space:nowrap; font-variant-numeric:tabular-nums;">{{ dnRunText }}</span>
      </div>
      <div style="display:flex; flex-direction:column; justify-content:center; gap:2px; padding:0 16px; min-width:104px; border-left:1px solid var(--line);">
        <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:.9px; text-transform:uppercase; color:var(--mut); white-space:nowrap;">Cell Volume</span>
        <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:13.5px; font-weight:600; color:var(--amb); white-space:nowrap; font-variant-numeric:tabular-nums;">{{ dnCellVText }}</span>
      </div>
      <div style="display:flex; flex-direction:column; justify-content:center; gap:2px; padding:0 16px; min-width:104px; border-left:1px solid var(--line);">
        <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:.9px; text-transform:uppercase; color:var(--mut); white-space:nowrap;">Transferred</span>
        <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:13.5px; font-weight:600; color:var(--blue); white-space:nowrap; font-variant-numeric:tabular-nums;">{{ dnXferText }}</span>
      </div>
      <div style="display:flex; flex-direction:column; justify-content:center; gap:2px; padding:0 16px; min-width:104px; border-left:1px solid var(--line);">
        <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:.9px; text-transform:uppercase; color:var(--mut); white-space:nowrap;">Density</span>
        <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:13.5px; font-weight:600; color:{{ dnRhoColor }}; white-space:nowrap; font-variant-numeric:tabular-nums;">{{ dnRhoText }}</span>
      </div>
    </div>
    <div style="display:flex; align-items:center; justify-content:center; gap:6px; flex:0 0 auto; min-width:128px; padding:6px 12px; border-radius:999px; background:{{ dnPillBg }}; border:1px solid {{ dnPillBorder }}; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10px; letter-spacing:.7px; text-transform:uppercase; color:{{ dnPillColor }}; white-space:nowrap;">
      <span style="{{ dnPillDot }}"></span>{{ dnPillText }}
    </div>
  </div>

  <!-- 2 + 3 · schematic | run selection + working equation / results -->
  <div style="display:grid; grid-template-columns:minmax(0,1.62fr) minmax(330px,1fr); gap:8px; flex:1 1 auto; min-height:0;">

    <div style="background:var(--panel); border:1px solid var(--line); border-radius:12px; box-shadow:0 1px 2px rgba(20,35,60,.05); padding:9px 12px 6px; display:flex; flex-direction:column; min-height:0; min-width:0;">
      <div style="flex:0 0 auto; display:flex; align-items:baseline; gap:10px; min-width:0;">
        <div style="font-size:12.5px; font-weight:600; color:var(--txt); white-space:nowrap;">Density Measurement Setup</div>
        <div style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:9px; letter-spacing:.5px; color:var(--mut); white-space:nowrap;">PVT CELL &#8594; DENSITY COIL &#8594; BALANCE</div>
      </div>
      <div style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:9.5px; letter-spacing:.3px; line-height:1.35; color:{{ dnActionColor }}; margin-top:3px; padding:4px 8px; border-radius:6px; background:var(--icard); border:1px solid var(--line); flex:0 0 auto; min-height:22px;">{{ dnActionText }}</div>
      <svg viewBox="700 92 724 482" preserveAspectRatio="xMidYMid meet" style="display:block; width:100%; height:100%; flex:1 1 auto; min-height:0;">
        <defs>
          ${PVTCellArt.defs('dnc')}
          <linearGradient id="dn-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"></stop><stop offset=".42" stop-color="#b3c1d8"></stop><stop offset=".58" stop-color="#7e90b0"></stop><stop offset="1" stop-color="#1f2a3e"></stop></linearGradient>
          <linearGradient id="dn-metalv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3eaf4"></stop><stop offset=".35" stop-color="#b3c1d8"></stop><stop offset=".7" stop-color="#7e90b0"></stop><stop offset="1" stop-color="#3a4a64"></stop></linearGradient>
          <linearGradient id="dn-valve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe6f0"></stop><stop offset=".5" stop-color="#a9b7cc"></stop><stop offset="1" stop-color="#5c6c86"></stop></linearGradient>
          <linearGradient id="dn-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b6b"></stop><stop offset=".55" stop-color="#d7262e"></stop><stop offset="1" stop-color="#8e1218"></stop></linearGradient>
          <linearGradient id="dn-cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>
          <pattern id="dn-sample" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#c7a233"></rect><circle cx="4.5" cy="4.5" r="1.15" fill="#f2d879" opacity=".7"></circle></pattern>
          <pattern id="dn-diss" width="13" height="13" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".8" fill="#eafff4"></circle><circle cx="9.5" cy="8.5" r=".65" fill="#eafff4"></circle><circle cx="6" cy="11.5" r=".5" fill="#eafff4"></circle></pattern>
          <clipPath id="dn-pumpa-clip"><rect x="1012" y="219" width="36" height="182" rx="3"></rect></clipPath>
          <clipPath id="dn-pumpb-clip"><rect x="848" y="219" width="36" height="182" rx="3"></rect></clipPath>
        </defs>

        <!-- approved PVT cell (PVTCellArt) + its overlays, shifted so the Port R outward fitting sits at the coil inlet (1118, 190).
             Port R valve = the former cell isolation valve on the sample line (open while the sample flows to the coil) -->
        <g transform="translate(-29.6 0)">
        ${PVTCellArt.cell('dnc', {
          innerA: `<rect x="1012" y="219" width="36" height="{{ dnSampleH }}" fill="url(#dn-sample)"></rect><rect x="1012" y="219" width="36" height="{{ dnSampleH }}" fill="url(#dn-diss)" opacity=".45"></rect><rect x="1012" y="219" width="36" height="3.5" fill="#ffffff" opacity=".18"></rect><g style="{{ dnSweptStyle }}"><rect x="1012" y="{{ dnTickLoY }}" width="36" height="35" fill="rgba(47,111,208,.38)"></rect><text x="1030" y="{{ dnDvTxtY }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" font-weight="600" fill="#dcebff">&#916;V</text></g>`,
          pistonB: '219', pistonA: 'dnPistonY',
          valves: { A: 'true', R: 'dnFlowOn' },
          ports: { R: { plug: '!dnCoilAtCell', nut: 'dnCoilAtCell' } },
          disp: { P: '{{ dnPNum }}', Pu: 'psi', B: '0.0 cc', A: '{{ dnCellVText }}' } })}
        <!-- live flow : pump A -> manifold -> coil -->
        <g style="{{ dnFlowStyle }}">
          <path d="M1030 212 V190 H1147.6" fill="none" stroke="#ffcf3f" stroke-width="2.4" stroke-dasharray="3 9" stroke-linecap="round" style="animation:dndash calc(.7s * var(--pm, 1)) linear infinite;"></path>
        </g>
        <foreignObject x="848" y="540" width="200" height="13"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:.5px; color:{{ dnLineLabelColor }};">{{ dnLineLabel }}</div></foreignObject>

        <g transform="${PVTCellArt.oldMap({}, 'A')}">
        <!-- Vi / Vf level marks (active run) -->
        <line x1="1012" y1="{{ dnTickHiY }}" x2="1050" y2="{{ dnTickHiY }}" stroke="#b9831f" stroke-width="1" stroke-dasharray="3 2"></line>
        <text x="1056" y="{{ dnTickHiT }}" font-family="IBM Plex Mono" font-size="8.5" font-weight="600" fill="var(--amb)">{{ dnTickHi }}</text>
        <g style="{{ dnSweptStyle }}">
          <line x1="1012" y1="{{ dnTickLoY }}" x2="1050" y2="{{ dnTickLoY }}" stroke="#2f6fd0" stroke-width="1" stroke-dasharray="3 2"></line>
          <text x="1056" y="{{ dnTickLoT }}" font-family="IBM Plex Mono" font-size="8.5" font-weight="600" fill="var(--blue)">{{ dnTickLo }}</text>
        </g>
        </g>
        <foreignObject x="822" y="518" width="88" height="30"><div style="margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif; font-size:11.5px; color:var(--txt2);">Pump B<span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:11px; font-weight:600; color:var(--amb);">0.0 cc</span></div></foreignObject>
        <foreignObject x="986" y="518" width="88" height="30"><div style="margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif; font-size:11.5px; color:var(--txt2);">Pump A<span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:11px; font-weight:600; color:var(--amb);">{{ dnCellVText }}</span></div></foreignObject>
        </g>

        <!-- transferred volume readout -->
        <text x="1368" y="146" text-anchor="middle" font-family="IBM Plex Mono" font-size="9.5" letter-spacing=".6" fill="var(--mut)">TRANSFERRED &#916;V</text>
        <rect x="1326" y="151" width="84" height="23" rx="4" fill="#0a1420" stroke="#2a5f9d" stroke-width="1.2"></rect>
        <foreignObject x="1326" y="153" width="84" height="19"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:12.5px; font-weight:600; color:var(--accb);">{{ dnXferText }}</div></foreignObject>

        <!-- coil label + valve + state (top, clear of the coil in both positions) -->
        <foreignObject x="1190" y="133" width="132" height="48">
          <div style="margin:0; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:2px; height:100%; font-family:'IBM Plex Mono',ui-monospace,monospace; white-space:nowrap; overflow:hidden;">
            <span style="font-size:10px; font-weight:600; letter-spacing:.8px; color:var(--cap2);">DENSITY COIL</span>
            <span style="font-size:8px; letter-spacing:.5px; color:{{ dnValveTagCol }};">{{ dnValveTag }}</span>
            <span style="font-size:8px; letter-spacing:.2px; color:{{ dnCoilStateColor }};">{{ dnCoilState }}</span>
          </div>
        </foreignObject>
        <!-- two-phase legend (lower left, beside the balance) -->
        <foreignObject x="1092" y="486" width="106" height="52">
          <div style="{{ dnFlashLabelStyle }} margin:0; display:flex; flex-direction:column; justify-content:center; gap:2px; height:100%; box-sizing:border-box; padding:4px 6px; border-radius:5px; background:rgba(185,131,31,.12); border:1px solid var(--amb); font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:7.5px; line-height:1.2; color:var(--amb); white-space:nowrap;">
            <span>Below bubble point:</span><span>gas evolves in coil</span>
            <span style="display:flex; align-items:center; gap:8px; color:var(--cap2);">
              <span style="display:flex; align-items:center; gap:3px;"><span style="width:8px; height:4px; border-radius:1px; background:#e2c65a;"></span>oil</span>
              <span style="display:flex; align-items:center; gap:3px;"><span style="width:5px; height:5px; border-radius:50%; background:#8ef0c0; border:.5px solid #2f9d72;"></span>gas</span>
            </span>
          </div>
        </foreignObject>

        <!-- digital balance -->
        <rect x="1200" y="480" width="196" height="9" rx="2.5" fill="url(#dn-metalv)" stroke="#0a0e16" stroke-width="1"></rect>
        <rect x="1288" y="489" width="20" height="7" fill="url(#dn-metal)" stroke="#0a0e16" stroke-width="1"></rect>
        <rect x="1212" y="496" width="172" height="50" rx="6" fill="#0d1728" stroke="#3a4c66" stroke-width="1.4"></rect>
        <rect x="1250" y="505" width="96" height="24" rx="3" fill="#06101e" stroke="#1d3350" stroke-width="1"></rect>
        <foreignObject x="1250" y="507" width="96" height="20"><div style="margin:0; display:flex; align-items:center; justify-content:flex-end; padding-right:7px; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:13px; font-weight:600; color:var(--grn);">{{ dnBalText }}</div></foreignObject>
        <circle cx="1228" cy="536" r="3.2" fill="{{ dnBalLed }}"></circle>
        <text x="1300" y="541" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" letter-spacing=".6" fill="#6a7f9f">{{ dnOnBalance }}</text>
        <text x="1298" y="563" text-anchor="middle" font-family="IBM Plex Mono" font-size="10.5" letter-spacing=".8" fill="var(--cap2)">DIGITAL BALANCE</text>

        <!-- density coil : one continuous stainless tube wound into a flat, compact coil (~3 horizontal
             turns seen from slightly above), block valve with red T-handle on the inlet -->
        <g style="{{ dnCoilStyle }}">
          <!-- far (back) half-turns, then the sample seen through their cut-away bore -->
          ${tube(false)}
          <sc-for list="{{ dnSegB }}" as="s" hint-placeholder-count="3">
            <path d="{{ s.d }}" fill="none" stroke="#8a6d22" stroke-width="2.4" stroke-linecap="butt" opacity=".75" pathLength="100" stroke-dasharray="100 100" style="{{ s.st }}"></path>
          </sc-for>
          <path d="{{ dnSlugB }}" fill="none" stroke="#bfe9d3" stroke-width="2" stroke-linecap="round" opacity=".7"></path>
          <path d="{{ dnGasB }}" fill="#bfe9d3" opacity=".7"></path>
          <!-- near (front) half-turns + leads -->
          ${tube(true)}
          <!-- cut-away bore on the near side: dark bore wall, oil core advancing along the tube -->
          <sc-for list="{{ dnSegF }}" as="s" hint-placeholder-count="6">
            <path d="{{ s.d }}" fill="none" stroke="#262a33" stroke-width="4.2" stroke-linecap="butt" pathLength="100" stroke-dasharray="100 100" style="{{ s.st }}"></path>
            <path d="{{ s.d }}" fill="none" stroke="#d9b64a" stroke-width="3" stroke-linecap="butt" pathLength="100" stroke-dasharray="100 100" style="{{ s.st }}"></path>
          </sc-for>
          <!-- liberated gas: fine bubbles, growing / coalescing bubbles, elongated gas slugs -->
          <path d="{{ dnSlugF }}" fill="none" stroke="#2f9d72" stroke-width="3" stroke-linecap="round"></path>
          <path d="{{ dnSlugF }}" fill="none" stroke="#e9fff5" stroke-width="2.2" stroke-linecap="round"></path>
          <path d="{{ dnGasF }}" fill="#f1fff8" stroke="#2f9d72" stroke-width=".35"></path>
          <!-- section shown in the magnified view -->
          <g style="{{ dnZoomStyle }}">
            <circle cx="{{ dnMarkX }}" cy="{{ dnMarkY }}" r="7.5" fill="none" stroke="#6fb7ff" stroke-width="1.6"></circle>
            <circle cx="{{ dnMarkX }}" cy="{{ dnMarkY }}" r="10" fill="none" stroke="#6fb7ff" stroke-width=".8" opacity=".45"></circle>
          </g>
          <!-- inlet fitting -->
          ${nut(6, 12)}
          <!-- manual block valve -->
          <rect x="20" y="-13" width="34" height="26" rx="3" fill="url(#dn-valve)" stroke="#0a0e16" stroke-width="1.1"></rect>
          <rect x="24" y="-9" width="26" height="18" rx="2" fill="none" stroke="#0a0e16" stroke-width=".6" opacity=".35"></rect>
          <circle cx="27" cy="7" r="1.3" fill="#3a4a64"></circle><circle cx="47" cy="7" r="1.3" fill="#3a4a64"></circle>
          <rect x="34.5" y="-24" width="5" height="11" fill="url(#dn-metal)" stroke="#0a0e16" stroke-width=".8"></rect>
          <rect x="19" y="-31" width="36" height="8" rx="3.5" fill="url(#dn-red)" stroke="#6e0d12" stroke-width="1" style="{{ dnHandleStyle }}"></rect>
          <circle cx="37" cy="-27" r="2.2" fill="#8e1218" stroke="#5a0a0e" stroke-width=".6"></circle>
          <!-- outlet compression fitting on the valve -->
          ${nut(62, 12)}
          <!-- outlet end : compression nut + plug -->
          ${nut(CG.OUT - 2, 12, CG.YO)}
          <rect x="${CG.OUT + 4}" y="${CG.YO - 6}" width="10" height="12" rx="4" fill="url(#dn-metalv)" stroke="#0a0e16" stroke-width="1"></rect>
          <text x="37" y="-38" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" letter-spacing=".5" fill="var(--mut)">BLOCK VALVE</text>
        </g>

        <!-- magnified view : flow inside the coil (visual illustration, not to scale) -->
        <g style="{{ dnZoomStyle }}">
          <defs>
            <clipPath id="dn-zclip"><rect x="1140" y="338" width="248" height="30"></rect></clipPath>
            <linearGradient id="dn-zoil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8922c"></stop><stop offset=".45" stop-color="#e2c65a"></stop><stop offset="1" stop-color="#a07c22"></stop></linearGradient>
          </defs>
          <path d="{{ dnLeadD }}" fill="none" stroke="#6fb7ff" stroke-width="1" stroke-dasharray="3 3" opacity=".8"></path>
          <rect x="1128" y="300" width="272" height="114" rx="7" fill="#0d1728" stroke="#3a4c66" stroke-width="1.2"></rect>
          <text x="1138" y="315" font-family="IBM Plex Mono" font-size="8.5" font-weight="600" letter-spacing=".8" fill="#9cc8ff">FLOW INSIDE COIL</text>
          <text x="1390" y="315" text-anchor="end" font-family="IBM Plex Mono" font-size="7" letter-spacing=".5" fill="#7f93b3">MAGNIFIED · NOT TO SCALE</text>
          <text x="1138" y="327" font-family="IBM Plex Mono" font-size="7" letter-spacing=".4" fill="#7f93b3">upstream</text>
          <text x="1388" y="327" text-anchor="end" font-family="IBM Plex Mono" font-size="7" letter-spacing=".4" fill="#7f93b3">downstream &#8594; flow</text>
          <!-- tube wall (cut open) -->
          <rect x="1136" y="331" width="256" height="7" fill="url(#dn-metalv)" stroke="#0a0e16" stroke-width=".8"></rect>
          <rect x="1136" y="368" width="256" height="7" fill="url(#dn-metalv)" stroke="#0a0e16" stroke-width=".8"></rect>
          <line x1="1136" y1="334.5" x2="1392" y2="334.5" stroke="#0a0e16" stroke-width="1" stroke-dasharray="1 11" opacity=".5" style="stroke-dashoffset:{{ dnZWall }};"></line>
          <line x1="1136" y1="371.5" x2="1392" y2="371.5" stroke="#0a0e16" stroke-width="1" stroke-dasharray="1 11" opacity=".5" style="stroke-dashoffset:{{ dnZWall }};"></line>
          <g clip-path="url(#dn-zclip)">
            <rect x="1140" y="338" width="248" height="30" fill="url(#dn-zoil)"></rect>
            <path d="{{ dnZSlug }}" fill="none" stroke="#2f9d72" stroke-width="23" stroke-linecap="round"></path>
            <path d="{{ dnZSlug }}" fill="none" stroke="#e9fff5" stroke-width="21.4" stroke-linecap="round"></path>
            <path d="{{ dnZSlug }}" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".8" transform="translate(0,-6.3)"></path>
            <path d="{{ dnZGas }}" fill="#f1fff8" stroke="#2f9d72" stroke-width="1.1"></path>
            <!-- fill-only pass: touching bubbles read as one merging gas body -->
            <path d="{{ dnZGas }}" fill="#f1fff8"></path>
            <path d="{{ dnZInD }}" fill="none" stroke="#6fb7ff" stroke-width="1" stroke-dasharray="2 2"></path>
          </g>
          <text x="{{ dnZInX }}" y="384" text-anchor="middle" font-family="IBM Plex Mono" font-size="6.5" letter-spacing=".4" fill="#6fb7ff" style="{{ dnZInStyle }}">COIL INLET</text>
          <foreignObject x="1134" y="389" width="260" height="22"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:9px; font-weight:600; color:#e2c65a;">{{ dnZCap }}</div></foreignObject>
        </g>
      </svg>
    </div>

    <div style="background:var(--panel); border:1px solid var(--line); border-radius:12px; box-shadow:0 1px 2px rgba(20,35,60,.05); padding:9px 10px 10px; display:flex; flex-direction:column; gap:8px; min-height:0; min-width:0;">

      <!-- run selection -->
      <div style="display:flex; align-items:stretch; gap:6px; flex:0 0 auto;">
        <sc-for list="{{ dnRunChips }}" as="rc" hint-placeholder-count="2">
          <div style="{{ rc.style }}">
            <span style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <span style="display:flex; align-items:center; gap:5px; font-size:12px; font-weight:700; letter-spacing:-.1px; color:{{ rc.color }};">
                <svg viewBox="0 0 9 10" style="{{ rc.lockStyle }}"><rect x=".5" y="4.3" width="8" height="5.2" rx="1.2" fill="none" stroke="currentColor" stroke-width="1"></rect><path d="M2.3 4.3 V3 a2.2 2.2 0 0 1 4.4 0 V4.3" fill="none" stroke="currentColor" stroke-width="1"></path></svg>{{ rc.name }}
              </span>
              <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8px; letter-spacing:.7px; text-transform:uppercase; color:{{ rc.tagColor }};">{{ rc.tag }}</span>
            </span>
            <span style="display:flex; align-items:baseline; gap:5px; font-family:'IBM Plex Mono',ui-monospace,monospace; white-space:nowrap;">
              <span style="font-size:10px; color:var(--mut);">&#961;</span>
              <span style="font-size:12px; font-weight:600; color:{{ rc.rhoColor }}; font-variant-numeric:tabular-nums;">{{ rc.rho }}</span>
              <span style="font-size:9px; color:var(--mut2);">g/cc</span>
            </span>
          </div>
        </sc-for>
      </div>

      <!-- working equation : live calculation + results -->
      <div style="flex:1 1 auto; min-height:0; background:#0d1728; border:1px solid #3a4c66; border-radius:11px; padding:9px 12px 10px; display:flex; flex-direction:column; align-items:stretch; gap:8px; overflow:hidden;">

        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex:0 0 auto;">
          <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:1px; text-transform:uppercase; color:#7f93b3;">Working Equation &#183; Results</span>
          <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; font-weight:600; letter-spacing:.7px; padding:2px 7px; border-radius:5px; background:rgba(111,183,255,.10); border:1px solid rgba(111,183,255,.35); color:#9cc8ff;">{{ dnStepBadge }}</span>
        </div>

        <div style="flex:1 1 auto; min-height:0; display:flex; flex-direction:column; justify-content:space-evenly; gap:8px;">
          <!-- definition + expanded form -->
          <div style="flex:0 0 auto; display:flex; align-items:center; justify-content:center; gap:14px; font-family:'IBM Plex Mono',ui-monospace,monospace;">
            <span style="display:flex; align-items:center; gap:6px; color:#8fa3c2;">
              <span style="font-size:clamp(14px,1.8vh,18px); font-weight:600;">&#961;</span>
              <span style="font-size:clamp(13px,1.6vh,16px);">=</span>
              <span style="display:flex; flex-direction:column; align-items:center;">
                <span style="font-size:clamp(12px,1.5vh,15px); font-weight:600; padding:0 6px 1px;">&#916;M</span>
                <span style="width:100%; height:1px; background:#4a6088;"></span>
                <span style="font-size:clamp(12px,1.5vh,15px); font-weight:600; padding:1px 6px 0;">&#916;V</span>
              </span>
            </span>
            <span style="font-size:clamp(14px,1.7vh,18px); color:#8fa3c2;">=</span>
            <span style="display:flex; flex-direction:column; align-items:center; color:#c8d6ea;">
              <span style="font-size:clamp(16px,2.1vh,22px); font-weight:600; padding:0 10px 4px; white-space:nowrap;">
                <span style="color:{{ dnEqMfColor }};">{{ dnEqMf }}</span><span style="color:#8fa3c2;"> &#8722; </span><span style="color:{{ dnEqMiColor }};">{{ dnEqMi }}</span>
              </span>
              <span style="width:100%; height:1.5px; background:#5a749e;"></span>
              <span style="font-size:clamp(16px,2.1vh,22px); font-weight:600; padding:4px 10px 0; white-space:nowrap;">
                <span style="color:{{ dnEqViColor }};">{{ dnEqVi }}</span><span style="color:#8fa3c2;"> &#8722; </span><span style="color:{{ dnEqVfColor }};">{{ dnEqVf }}</span>
              </span>
            </span>
          </div>

          <!-- measured values : mass (balance) | volume (PVT cell) -->
          <div style="flex:0 0 auto; display:grid; grid-template-columns:repeat(auto-fit,minmax(228px,1fr)); gap:8px;">
            <div style="display:flex; flex-direction:column; gap:5px; padding:7px 10px; border-radius:8px; background:rgba(226,198,90,.05); border:1px solid rgba(226,198,90,.20); min-width:0;">
              <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8px; letter-spacing:.9px; text-transform:uppercase; color:#b9a254; margin-bottom:1px;">Mass &#183; balance</span>
              <sc-for list="{{ dnEqMass }}" as="q" hint-placeholder-count="3">
                <span style="display:grid; grid-template-columns:2.1em minmax(0,1fr) .7em auto 1.5em; align-items:baseline; column-gap:4px; font-family:'IBM Plex Mono',ui-monospace,monospace; white-space:nowrap;">
                  <span style="font-size:clamp(10.5px,1.35vh,13.5px); font-weight:600; color:#c8d6ea;">{{ q.k }}</span>
                  <span style="font-size:clamp(8.5px,1.05vh,10.5px); color:#6a7f9f; overflow:hidden; text-overflow:ellipsis;">{{ q.d }}</span>
                  <span style="font-size:7px; color:#46d39a;">{{ q.live }}</span>
                  <span style="font-size:clamp(12px,1.5vh,15.5px); font-weight:600; color:{{ q.color }}; text-align:right; font-variant-numeric:tabular-nums;">{{ q.v }}</span>
                  <span style="font-size:8.5px; color:#6a7f9f;">{{ q.u }}</span>
                </span>
              </sc-for>
            </div>
            <div style="display:flex; flex-direction:column; gap:5px; padding:7px 10px; border-radius:8px; background:rgba(111,183,255,.05); border:1px solid rgba(111,183,255,.20); min-width:0;">
              <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8px; letter-spacing:.9px; text-transform:uppercase; color:#6f9ccc; margin-bottom:1px;">Volume &#183; PVT cell</span>
              <sc-for list="{{ dnEqVol }}" as="q" hint-placeholder-count="3">
                <span style="display:grid; grid-template-columns:2.1em minmax(0,1fr) .7em auto 1.5em; align-items:baseline; column-gap:4px; font-family:'IBM Plex Mono',ui-monospace,monospace; white-space:nowrap;">
                  <span style="font-size:clamp(10.5px,1.35vh,13.5px); font-weight:600; color:#c8d6ea;">{{ q.k }}</span>
                  <span style="font-size:clamp(8.5px,1.05vh,10.5px); color:#6a7f9f; overflow:hidden; text-overflow:ellipsis;">{{ q.d }}</span>
                  <span style="font-size:7px; color:#46d39a;">{{ q.live }}</span>
                  <span style="font-size:clamp(12px,1.5vh,15.5px); font-weight:600; color:{{ q.color }}; text-align:right; font-variant-numeric:tabular-nums;">{{ q.v }}</span>
                  <span style="font-size:8.5px; color:#6a7f9f;">{{ q.u }}</span>
                </span>
              </sc-for>
            </div>
          </div>

          <!-- highlighted result -->
          <div style="{{ dnResBox }}">
            <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:1px; color:#7f93b3;">{{ dnResLabel }}</span>
            <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:clamp(19px,2.6vh,28px); font-weight:700; letter-spacing:.3px; color:{{ dnResCol }}; white-space:nowrap;">{{ dnResVal }}</span>
            <span style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:9px; letter-spacing:.3px; color:#7f93b3; text-align:center; line-height:1.3;">{{ dnResNote }}</span>
          </div>

          <!-- compact two-run record + comparison -->
          <div style="flex:0 0 auto; display:flex; flex-direction:column; gap:2px; padding:6px 4px 6px; border-top:1px solid #22314a;">
            <sc-for list="{{ dnRuns }}" as="rr" hint-placeholder-count="2">
              <span style="{{ rr.style }} font-family:'IBM Plex Mono',ui-monospace,monospace; white-space:nowrap;">
                <span style="font-size:10.5px; font-weight:600; color:#c8d6ea;">{{ rr.name }}</span>
                <span style="font-size:10.5px; color:#8fa3c2;">{{ rr.rho }}</span>
                <span style="font-size:12.5px; font-weight:600; color:{{ rr.col }}; text-align:right; font-variant-numeric:tabular-nums;">{{ rr.v }}</span>
                <span style="font-size:8.5px; color:#6a7f9f;">g/cc</span>
                <span style="font-size:7.5px; letter-spacing:.7px; color:{{ rr.tagCol }}; text-align:right;">{{ rr.tag }}</span>
              </span>
            </sc-for>
            <span style="display:flex; align-items:center; gap:8px; margin-top:3px; padding:4px 8px; border-radius:6px; background:rgba(127,147,179,.06); font-family:'IBM Plex Mono',ui-monospace,monospace; white-space:nowrap; min-width:0;">
              <span style="font-size:10px; color:#8fa3c2;">|&#961;&#8321; &#8722; &#961;&#8322;| =</span>
              <span style="font-size:11px; font-weight:600; color:{{ dnCmpColor }};">{{ dnCmpText }}</span>
              <span style="font-size:8.5px; color:#6a7f9f;">tol &#177;0.0005</span>
              <span style="flex:1 1 4px; min-width:0;"></span>
              <sc-if value="{{ dnShowRepeat }}" hint-placeholder-val="{{ false }}">
                <button onclick="{{ dnRepeat }}" style="font-family:inherit; font-size:10px; font-weight:600; white-space:nowrap; padding:3px 9px; border-radius:6px; cursor:pointer; background:rgba(255,122,140,.10); border:1px solid #ff7a8c; color:#ff7a8c;" style-hover="background:rgba(255,122,140,.18);">Repeat</button>
              </sc-if>
              <span style="font-size:10px; font-weight:700; letter-spacing:.5px; color:{{ dnVerdictColor }};">{{ dnVerdict }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 4 · action toolbar: shared procedure panel (components/ProcCtl.js) -->
  <div style="display:flex; align-items:center; gap:8px; flex:0 0 auto; min-width:0;">
    <div class="pc-host" data-pc="StageDensity" data-pc-layout="bar" style="flex:1 1 auto;"></div>
    <div style="flex:0 1 auto; min-width:0; display:flex; align-items:center; justify-content:flex-end; gap:12px;">
      <button class="ui-btn ui-btn-ghost act" onclick="{{ onBack }}">&#8592; Back to PV</button>
    </div>
  </div>
</div>`,
  logic: Component
});
})();
