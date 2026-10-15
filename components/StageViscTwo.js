/* component: StageViscTwo — Two-Phase Viscosity (below Psat) with the falling-body viscometer.
   Mounted ONLY by the Two-Phase Viscosity workspace in screens/showViscTest.js.
   Own state, own stages, own reset — nothing shared with the other tests.

   Connected system (PVT cell only - no sample cylinder on this page). Layout 2026-09-28:
   viscometer LEFT (same inclined falling-body instrument as StageViscSingle.js), PVT cell RIGHT.
     Dual-cylinder PVT cell (Pump A holds the sample, Pump B stays empty)
       ├─ GAS OUTLET  : sample manifold line (right branch from the Pump A tee) -> out through the frame ->
       │                gas outlet valve -> tube end submerged in the water glass (far right)
       └─ OIL TRANSFER: Pump A -> sample manifold -> out of the cell's LEFT side -> oil transfer valve ->
                        riser -> BOTTOM inlet of the viscometer
     viscometer 3 cc chamber (falling body) -> TOP outlet -> bleed valve (seated on the port) -> waste glass (top-left).
   Inclination slider = demonstration only (0-90 deg, locked while a step runs), not used in mu.

   Sequence — repeated for six decreasing pressures (same reduction / agitation / gas-removal
   order as the Differential Liberation module):
     1 Reduce       Pump A retracts, cell pressure falls smoothly to the target, gas comes out of solution
     2 Agitate      oil + gas mixed (dispersed bubbles), then allowed to separate into a gas cap
     3 Vent gas     gas outlet valve open, Pump A advances at constant pressure, gas bubbles through the water
     4 First drop   gas cap gone -> oil rises to the outlet; the first oil drop is the cue to CLOSE the valve
     5 Transfer     XFER_CC of oil through the oil line into the viscometer bottom inlet (3 cc retained,
                    the rest flushes the old oil out of the top outlet to waste)
     6 Measure      stabilize, falling-body timing, mu = K x t, point added to table and graph

   DATA SOURCES (nothing new invented here):
     pressures, cell volumes (pre-agitation, stabilized, remaining oil) -> window.PVT_DL, exported by
                  components/StageDiffLib.js (the Differential Liberation stage data)
     mu at each pressure -> window.PVT_REPORT.visc (report sub-Psat trend: Beggs-Robinson scaled to the
                  4.80 cP measured at Psat)  => ILLUSTRATIVE simulation data, not measured values
     K = 1.50 cP/s  -> same calibration as StageViscSingle.js / StageVisc.js
   ILLUSTRATIVE only: XFER_CC (configurable), line / stub / tail volumes.
   Cell volumes: the DL volumes are scaled by the oil actually left in the cell after each transfer
   (the DL itself never removes oil for viscosity), so the cell level stays physically consistent.
   ========================================================================= */
(function () {
'use strict';

/* ---------------- configuration ---------------- */
const XFER_CC = 10.0;            // cc of oil transferred per point (configurable; >= 3 cc chamber + line)
const PTS_OVERRIDE = null;       // e.g. [2161, 1798, 1435, 1000, 565, 203] — only used if the DL data is missing
const CHAMBER_CC = 3.0, K_CAL = 1.50;                         // chamber (given) · cP/s (StageViscSingle.js)
const LINE_IN_CC = 0.60, STUB_CC = 0.20, TAIL_CC = 0.20;       // cc (illustrative)
const PSI_KPA = 6.894757, ATM = 14.696;

const REP = window.PVT_REPORT || {};
const TEST_T = REP.header && REP.header.test_t_C ? REP.header.test_t_C : 114.4444;
const PSAT_G = REP.flash && REP.flash.psat ? Math.round(REP.flash.psat / PSI_KPA - ATM) : 2500;
const DL = window.PVT_DL || null;
const CHG = DL ? DL.charge : { p: 5000, v: 80 };
const DLS = DL ? DL.stages.slice(0, 6) : [];
const PTS = DLS.length === 6 ? DLS.map(d => d.target) : (PTS_OVERRIDE || []);
const muAt = psig => {                       // report viscosity at that pressure (matched in psig)
  const r = (REP.visc || []).filter(v => Math.abs((v.p / PSI_KPA - ATM) - psig) < 1)[0];
  return r ? r.mu : null;
};
const RES = PTS.map(p => { const mu0 = muAt(p); if (mu0 == null) return { p, t: null, mu: null };
  const t = Math.round(mu0 / K_CAL * 100) / 100; return { p, t, mu: K_CAL * t }; });
const NP = PTS.length;

/* per-point cell volumes (cc): DL volumes scaled by the oil really left in the cell */
const PD = (function () {
  const out = []; let v0 = CHG.v;
  for (let k = 0; k < NP; k++) {
    const d = DLS[k];
    if (!d) { out.push({ p: PTS[k], pPrev: k ? PTS[k - 1] : CHG.p, v0, vPre: v0, stab: v0, rem: v0, gEq: 0, gPre: 0, after: v0 - XFER_CC }); v0 -= XFER_CC; continue; }
    const s = v0 / (k ? DLS[k - 1].remaining : CHG.v);
    const vPre = d.vPre * s, stab = d.stab * s, rem = d.remaining * s;
    const o = { p: d.target, pPrev: k ? PTS[k - 1] : CHG.p, v0, vPre, stab, rem, gEq: stab - rem, gPre: Math.max(0, d.gPre * s), after: rem - XFER_CC, scale: s };
    out.push(o); v0 = o.after;
  }
  return out;
})();

/* ---------------- geometry (svg units) ----------------
   WORLD layout (2026-09-28): falling-body viscometer LEFT (the Single-Phase bench drawing: inclined
   instrument on its stand, quadrant guide, hinge, controller / pressure display / thermostat bath on
   the shelf, waste glass top-left for the bleed outlet) - dual-cylinder PVT cell RIGHT - water glass
   (gas vent) far right.
   Oil  : Pump A head -> sample manifold -> out of the cell's LEFT side -> oil transfer valve -> riser IN_X
          -> viscometer BOTTOM inlet (same inlet approach as the Single-Phase page).
   Gas  : fitting on the UPPER SIDE of Pump A (top of the gas cap) -> sideways through the frame ->
          gas outlet valve -> down into the water glass (tube end submerged).
   Viscometer internals keep their LOCAL coordinates (chamber axis x = 620, bore y 222-472); the whole
   instrument rotates about its bottom hinge PIN fixed at world PIV (identical to StageViscSingle.js):
      world = translate(PIV) · rotate(-incl) · scale(DEV_S) · translate(-PIN)                          */
const DEV_S = 0.70;
const PIN = [578, 596];                           // hinge pin on the instrument rail (local)
const PIV = [460, 447];                           // hinge pin on the fixed base bracket (world)
const INCL0 = 32, INCL_MIN = 0, INCL_MAX = 90;    // demonstration inclination (NOT used in mu)
const CLAMP_L = [578, 200];
const ARC_R = (PIN[1] - CLAMP_L[1]) * DEV_S;
const r1 = v => Math.round(v * 10) / 10;
function mkW(th) {
  const a = th * Math.PI / 180, c = Math.cos(a), n = Math.sin(a);
  return (x, y) => { const dx = (x - PIN[0]) * DEV_S, dy = (y - PIN[1]) * DEV_S; return [r1(PIV[0] + dx * c - dy * n), r1(PIV[1] + dx * n + dy * c)]; };
}
const devT = th => `translate(${PIV[0]},${PIV[1]}) rotate(${r1(th)}) scale(${DEV_S}) translate(${-PIN[0]},${-PIN[1]})`;
const arcPt = (th, rr) => { const a = th * Math.PI / 180, R = rr || ARC_R; return [r1(PIV[0] + R * Math.sin(a)), r1(PIV[1] - R * Math.cos(a))]; };
const BORE = { x: 608, y: 222, w: 24, h: 250 };
const B_REST = 356, B_TOP = 240;                  // falling-body top edge: bottom stop / top stop (local)
const SENSE = [338, 430];                         // sensing-coil zone (local y)
const P_ST = [[620, 222], [620, 150]];            // chamber -> top port = bleed-valve seat (local)
const WASTE = { x: 30, y: 66, w: 52, h: 88, cap: 60 };    // waste glass (bleed), top-left - cc scale illustrative
const TAIL_Y = 22, WASTE_CX = WASTE.x + WASTE.w / 2;
const WASTE_MARKS = [10, 20, 30, 40, 50].map(c => { const y = r1(WASTE.y + WASTE.h - 4 - WASTE.h * 0.86 * c / WASTE.cap); return `<line x1="${WASTE.x + WASTE.w - 14}" y1="${y}" x2="${WASTE.x + WASTE.w - 4}" y2="${y}"></line>`; }).join('');
const BASE_Y = 458, BASE_X0 = 150, BASE_X1 = 590;
const CTL = { x: 30, y: 510, w: 180, h: 68 };
const PDU = { x: 222, y: 514, w: 164, h: 60 };
const BATH = { x: 404, y: 500, w: 112, h: 86 };
const GRP = { x: 20, y: 490, w: 508, h: 104 };
const ARC = { a0: 4, a1: -90 };
const ARC_P0 = arcPt(ARC.a0), ARC_P1 = arcPt(ARC.a1);
const ARC_D = `M${ARC_P0} A${r1(ARC_R)},${r1(ARC_R)} 0 0 0 ${ARC_P1}`;
const ARC_TICKS = [0, 15, 30, 45, 60, 75, 90].map(t => { const i0 = ARC_R - (t % 30 ? 5 : 8), i1 = ARC_R + (t % 30 ? 5 : 8);
  const p0 = arcPt(-t, i0), p1 = arcPt(-t, i1), q = arcPt(-t, ARC_R + 20);
  return { t, d: `M${p0} L${p1}`, x: q[0], y: r1(q[1] + 4) }; });
const VIS = { x: 596, y: 74 };                    // 'Viscometer' title
const VB = '2 8 1332 592';

/* PVT cell = the DL drawing (unchanged), placed right of the viscometer */
const CELL_DX = 30, CELL_DY = 40;
const PXC = 1.73;                                 // px per cc in a 100 cc pump bore (DL / Validation scale)
const A_TOP = 219, A_X = 1012;                    // Pump A bore (DL / cell-local coordinates)
const CW = (x, y) => [x + CELL_DX, y + CELL_DY];  // cell-local -> world
const MAN_Y = 190 + CELL_DY;                      // sample manifold level (world)
const IN_X = 728;                                 // riser to the viscometer inlet (between the viscometer sweep and the cell)
const VO = { x: 782, y: MAN_Y };                  // oil transfer valve (horizontal run, cell left side)
const GAS_Y = MAN_Y;                             // gas outlet: RIGHT branch of the sample manifold line (not on the pump)
const GLASS = { cx: 1268, x: 1226, w: 84, y: 318, h: 140, water: 352, tube: 434 };   // water glass (gas vent)
const VG = { x: 1178, y: GAS_Y };                 // gas outlet valve
const G_PTS = [CW(1030, 190), [GLASS.cx, GAS_Y], [GLASS.cx, GLASS.tube]];   // manifold tee above Pump A -> right through the frame -> valve -> glass
const R_PTS = [CW(1030, 219), CW(1030, 190), [VG.x + 12, GAS_Y]];         // oil front after the gas cap: Pump A top -> manifold -> valve outlet
const dropPt = [VG.x + 22, GAS_Y + 2];

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
/* tubing is bent, not mitred (same helper as StageViscSingle.js) */
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
const G_PTSR = roundPts(G_PTS, 16);
const D_G = dOf(G_PTSR), D_R = dOf(R_PTS), D_ST = dOf(P_ST);
const D_GT = dOf(roundPts([CW(1090, 190), [GLASS.cx, GAS_Y], [GLASS.cx, GLASS.tube]], 16));   // external gas tubing (frame edge -> glass)
function arrowD(x, y, dir) {
  const s = 6.5, a = (dir === 'r' ? 0 : dir === 'd' ? 90 : dir === 'u' ? -90 : dir === 'l' ? 180 : dir) * Math.PI / 180;
  const c = Math.cos(a), n = Math.sin(a);
  const P = (u, v) => r1(x + u * c - v * n) + ',' + r1(y + u * n + v * c);
  return `M${P(-s, -s)} L${P(s, 0)} L${P(-s, s)} Z`;
}
/* everything attached to the moving instrument, for one inclination (cached) */
const GEO = {};
function geo(th) {
  th = Math.max(INCL_MIN, Math.min(INCL_MAX, Math.round(th * 10) / 10));
  if (GEO[th]) return GEO[th];
  const rot = -th, Wr = mkW(rot), a = rot * Math.PI / 180;
  const nx = Math.cos(a), ny = Math.sin(a);
  const IN_A = Wr(620, 604);
  /* oil route: Pump A bore top -> manifold (straight, inside the cell) -> left out of the cell -> riser -> inlet */
  const P_IN = [CW(1030, 219), CW(1030, 190)].concat(roundPts([CW(1030, 190), [IN_X, MAN_Y], [IN_X, IN_A[1]], IN_A, Wr(620, 472)], 20).slice(1));
  const T0 = Wr(620, 126), T1 = Wr(620, 108);
  const P_TAIL = [T0, T1, [T1[0], TAIL_Y], [WASTE_CX, TAIL_Y], [WASTE_CX, WASTE.y - 6]];
  const P_TAILR = roundPts(P_TAIL, 18);
  const BW = [Wr(608, 472), Wr(632, 472), Wr(608, 222), Wr(632, 222)];
  const J1 = Wr(662, 475), J2 = Wr(662, 491), CC = Wr(662, 328), PH = Wr(666, 449), PS = Wr(696, 189);
  const out = (P, d) => r1(P[0] + nx * d) + ',' + r1(P[1] + ny * d);
  const hose = (J, yb) => `M${J} C${out(J, 36)} ${BATH.x - 46},${BATH.y + yb} ${BATH.x},${BATH.y + yb}`;
  const cable = (P, X, Y) => `M${P} C${out(P, 46)} ${X},${Y - 90} ${X},${Y}`;
  const sn = Math.max(0, Math.min(1, (Math.abs(Math.sin(a)) - 0.5) / 0.5));
  function lab(ax, ay, ey, rank) {
    const A = Wr(ax, ay), E0 = Wr(734, ey), sh = rank * 28 * sn;
    const E = [r1(E0[0] + nx * sh), r1(E0[1] + ny * sh)], T = [r1(E[0] + 10), E[1]];
    return { d: `M${A} L${E} L${T}`, x: r1(T[0] + 5), y: r1(T[1] + 5) };
  }
  const CL = arcPt(rot);
  const g = {
    th, T: devT(rot), IN_A, P_IN, P_TAILR,
    D_IN: dOf(P_IN), D_INX: dOf(roundPts([CW(806, 190), [IN_X, MAN_Y], [IN_X, IN_A[1]], IN_A, Wr(620, 592)], 20)),   // external tubing (cell wall -> inlet nipple)
    D_TAIL: dOf(P_TAILR),
    low: Math.max(BW[0][1], BW[1][1]), high: Math.min(BW[2][1], BW[3][1]),
    bx0: r1(Math.min.apply(null, BW.map(p => p[0])) - 4), bx1: r1(Math.max.apply(null, BW.map(p => p[0])) + 4),
    UPA: Wr(620, 200), AXUP: r1(Math.atan2(-Math.cos(a), Math.sin(a)) * 180 / Math.PI),
    TAIL_MX: r1((T1[0] + WASTE_CX) / 2),
    HOSE1: hose(J1, 54), HOSE2: hose(J2, 70),
    CAB_COIL: cable(CC, CTL.x + CTL.w - 34, CTL.y),
    CAB_PT100: cable(PH, CTL.x + CTL.w - 16, CTL.y),
    CAB_PT: cable(PS, PDU.x + PDU.w - 30, PDU.y),
    L: { pt: lab(696, 189, 180, 5), drive: lab(658, 262, 262, 4), ch: lab(632, 300, 306, 3), sense: lab(658, 384, 372, 2), body: lab(626, 404, 414, 1), pt100: lab(666, 449, 452, 0) },
    VL: { x: r1(T1[0] + 14), y: 42 },
    INL: { x: IN_X - 12, y: r1(IN_A[1] + 24) },
    CLAMP: CL,
    ANG: (function () { const sa = Math.sin(a) * Math.sin(a), sd = 22 * Math.abs(Math.cos(a)), o = arcPt(rot, ARC_R + 24 + 24 * sa);
      const cx = r1(o[0] - nx * sd), cy = r1(Math.min(o[1] - ny * sd, BASE_Y - 13));
      return { x: r1(cx - 18), y: r1(cy - 9), tx: cx, ty: r1(cy + 4) }; })()
  };
  return (GEO[th] = g);
}
const C = x => Math.max(0, Math.min(1, x));
/* agitation = the PV test's two-pump cycle (components/StagePVTest.js, shared read-only as window.PVT_PV):
   A -> B stroke, hold, B -> A stroke, stabilize. Same stroke profile, route through the sample manifold and
   durations (T.A2B / T.HOLD / T.B2A / T.STAB); local fallback only if the PV module is not loaded. */
const PVE = () => window.PVT_PV || {
  T: { A2B: 5.0, HOLD: 1200, B2A: 5.0, STAB: 5.0 },
  ROUTE_AB: [[1030, 215], [1030, 190], [866, 190], [866, 215]], ROUTE_BA: [[866, 215], [866, 190], [1030, 190], [1030, 215]], LINE_L: 214,
  easeIO: p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2), clamp01: C,
  routePt: (route, s0) => { let rem = Math.max(0, s0); for (let k = 0; k < route.length - 1; k++) { const [x1, y1] = route[k], [x2, y2] = route[k + 1], len = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    if (rem <= len || k === route.length - 2) { const f = len ? Math.min(1, rem / len) : 0; return [x1 + (x2 - x1) * f, y1 + (y2 - y1) * f]; } rem -= len; } return route[route.length - 1]; }
};
const EQ_MS = 3000;          // hold in Pump B while the liberated gas reaches equilibrium (pump holds P, volume vPre -> stab)
const fmtP = v => Math.round(v).toLocaleString('en-US');
const cc = v => Number(v).toFixed(2);
/* deterministic bubble seeds */
const BUBS = Array.from({ length: 16 }, (_, k) => ({ fx: (k * 0.618034 + 0.07) % 1, ph: (k * 0.381966 + 0.13) % 1,
  sp: 0.75 + ((k * 0.7549) % 1) * 0.5, r: 1.0 + ((k * 0.5698) % 1) * 1.1, th: k / 16 }));
const GBUBS = Array.from({ length: 12 }, (_, k) => ({ ph: (k * 0.618034) % 1, sp: 0.8 + ((k * 0.7549) % 1) * 0.5, r: 1.6 + ((k * 0.5698) % 1) * 1.8, wob: (k * 0.381966) % 1 }));

/* ---------------- stages: 6 sub-steps per point + Results ---------------- */
const SUBS = ['Reduce Pressure', 'Agitate', 'Vent Gas', 'First Oil Drop', 'Transfer ' + XFER_CC + ' cc', 'Measure μ'];
const STAGES = [];
PTS.forEach((p, k) => SUBS.forEach((s, j) => STAGES.push({ k, s: j, name: s,
  btn: ['Reduce to ' + fmtP(p) + ' psig', 'Agitate A → B → A', 'Open Gas Outlet', 'Watch for First Oil Drop', 'Transfer ' + XFER_CC + ' cc Oil', 'Measure Viscosity'][j] })));
STAGES.push({ k: NP, s: 0, name: 'Results', btn: 'Show Results' });
const NS = STAGES.length;

function msgFor(i) {
  const st = STAGES[i]; if (!st) return '';
  if (st.k >= NP) return 'All six points measured (' + fmtP(PTS[0]) + ' → ' + fmtP(PTS[NP - 1]) + ' psig). Show the pressure–viscosity result.';
  const d = PD[st.k], n = 'Point ' + (st.k + 1) + ' · ';
  return [
    n + (st.k === 0 ? 'Cell charged: ' + cc(d.v0) + ' cc single-phase oil at ' + fmtP(d.pPrev) + ' psig. All valves CLOSED. Reduce to ' + fmtP(d.p) + ' psig.'
      : 'Cell holds ' + cc(d.v0) + ' cc oil at ' + fmtP(d.pPrev) + ' psig. Reduce to ' + fmtP(d.p) + ' psig.'),
    n + fmtP(d.p) + ' psig reached — liberated gas present. Agitate to reach equilibrium.',
    n + 'Equilibrium: gas cap above the oil. Open the gas outlet and vent the gas into the water glass at constant pressure.',
    n + 'Gas cap vented, gas outlet still OPEN. Advance slowly and watch the outlet for the first oil drop.',
    n + 'Gas outlet CLOSED. Transfer ' + XFER_CC + ' cc of the equilibrium oil to the viscometer bottom inlet.',
    n + 'Viscometer loaded with fresh oil at ' + fmtP(d.p) + ' psig, valves CLOSED. Stabilize and measure.'
  ][st.s];
}

let SAVED = null;

/* state at the START of stage i — rebuilds cell, valves, viscometer and completed points */
function snapshot(i) {
  const g = STAGES[Math.max(0, Math.min(NS - 1, i))], k = g.k, s = g.s;
  const res = k >= NP;
  const kk = res ? NP - 1 : k, d = PD[kk] || { p: 0, pPrev: 0, v0: 0, vPre: 0, stab: 0, rem: 0, gEq: 0, gPre: 0, after: 0 };
  const base = {
    cur: i, done: STAGES.map((_, j) => j < i), busy: false, auto: false, paused: false, complete: false,
    agit: 0, disp: 0, nuc: 0, pump: 'hold', gasFlow: 0, riser: 0, drop: 0,
    agX: 0, agDir: '', agFront: 0, agTail: 0, agFlowD: 0,
    vG: 0, gTxt: 'CLOSED', vO: 0, oTxt: 'CLOSED', vT: 0, tTxt: 'CLOSED',
    flowIn: false, flowUp: false, flowTail: false, xfer: 0,
    body: B_REST, drive: false, falling: false, sense: false, tRun: null, measuring: -1, newest: -1,
    pvStage: 'none', msg: msgFor(i)
  };
  /* viscometer at the start of point kk */
  const vFull = kk > 0 || res;
  Object.assign(base, {
    vIn: vFull ? LINE_IN_CC : 0, vCh: vFull ? CHAMBER_CC : 0, vSt: vFull ? STUB_CC : 0, vTail: vFull ? TAIL_CC : 0,
    PV: vFull ? (res ? PTS[NP - 1] : d.pPrev) : null,
    waste: (function () { let w = 0; for (let j = 0; j < (res ? NP : kk); j++) w += XFER_CC - (j === 0 ? LINE_IN_CC + CHAMBER_CC + STUB_CC : 0); return w; })(),
    meas: RES.slice(0, res ? NP : kk)
  });
  if (vFull) base.pvStage = 'stable';
  if (res) return Object.assign(base, { P: d.p, V: d.after, G: 0 });
  base.P = d.pPrev; base.V = d.v0; base.G = 0;
  if (s >= 1) { base.P = d.p; base.V = d.vPre; base.G = d.gPre; base.nuc = 1; }
  if (s >= 2) { base.V = d.stab; base.G = d.gEq; base.nuc = 0; }
  if (s >= 3) { base.V = d.rem; base.G = 0; base.vG = 1; base.gTxt = 'OPEN'; }
  if (s >= 4) { base.vG = 0; base.gTxt = 'CLOSED'; base.riser = 1; }
  if (s >= 5) {
    base.V = d.after; base.xfer = XFER_CC; base.PV = d.p; base.pvStage = 'stable';
    base.vIn = LINE_IN_CC; base.vCh = CHAMBER_CC; base.vSt = STUB_CC; base.vTail = TAIL_CC;
    base.waste += XFER_CC - (kk === 0 ? LINE_IN_CC + CHAMBER_CC + STUB_CC : 0);
  }
  return base;
}

class Component extends DCLogic {
  state = Object.assign(snapshot(0), { incl: INCL0, showComp: false });   // incl = demonstration inclination (view only, kept across steps / Reset)

  /* ---------- paused-aware process clock (same pattern as StageViscSingle) ---------- */
  clock = 0; jobs = []; waits = []; raf = null; bclk = 0;
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
    this.bclk += dt / 1000 / PSM();
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

  componentDidMount() {
    const sv = SAVED; if (!sv) return;
    this.setState(snapshot(sv.cur));
    if (sv.complete) this.setState({ done: STAGES.map(() => true), complete: true, msg: 'Test complete — six pressure–viscosity points below Psat.' });
  }
  componentWillUnmount() { this.stopAll(); SAVED = { cur: this.state.cur, complete: this.state.complete }; }
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
    if (st.busy || st.paused || st.complete || !NP) return;
    if (i !== st.cur || st.done[i]) return;
    this.status('In Progress');
    this.setState({ busy: true, newest: -1 });
    const g = STAGES[i];
    if (g.k >= NP) return this.sResults(i);
    [this.sReduce, this.sAgitate, this.sVent, this.sDrop, this.sXfer, this.sMeasure][g.s].call(this, g.k, i);
  }

  /* 1 — reduce cell pressure smoothly (Pump A retracts), gas comes out of solution */
  sReduce(k, i) {
    const d = PD[k], gasFrom = k === 0 ? PSAT_G : d.pPrev;
    this.setState({ pump: 'retract', pvStage: this.state.PV == null ? 'none' : 'isolated', riser: 0,
      msg: 'Pump A retracting — cell volume increases and the pressure falls from ' + fmtP(d.pPrev) + ' toward ' + fmtP(d.p) + ' psig.' });
    this.tw(5200, e => {
      const P = d.pPrev + (d.p - d.pPrev) * e;
      const gf = C((gasFrom - P) / Math.max(1, gasFrom - d.p));
      this.setState({ P, V: d.v0 + (d.vPre - d.v0) * e, G: d.gPre * gf, nuc: gf > 0 ? 1 : 0,
        msg: P > gasFrom ? 'Reducing pressure: ' + fmtP(P) + ' psig — still single-phase above ' + fmtP(gasFrom) + ' psig.'
          : 'Reducing pressure: ' + fmtP(P) + ' psig — below the saturation pressure, gas bubbles form in the oil.' });
    }, () => {
      this.setState({ pump: 'hold' });
      this.wait(900, () => this.finish(i, fmtP(d.p) + ' psig reached. Liberated gas is dispersed in the oil — not yet at equilibrium. Agitate next.'));
    });
  }
  /* 2 — agitation = the PV test's two-pump cycle through the sample manifold, at constant pressure:
         A -> B (complete sample, oil + gas together) -> hold in B (gas reaches equilibrium, Pump B retracts
         to hold P: vPre -> stab) -> B -> A (all of it back) -> stabilize (gas separates into a cap in Pump A).
         Total volume is constant during each stroke (A + B = V at every instant). Gas outlet + oil valves CLOSED. */
  agStroke(dir, done) {
    const X = PVE(), E = X.easeIO, x0 = dir === 'a2b' ? 0 : 1, x1 = 1 - x0, ag0 = this.state.agit || 0;
    this.setState({ agDir: dir, agFront: 0, agTail: 0, agFlowD: 0, agX: x0 });
    this.tw((dir === 'a2b' ? X.T.A2B : X.T.B2A) * 1000, u => {
      const front = E(C(u / 0.18)), tail = E(C((u - 0.84) / 0.16)), xp = E(C((u - 0.12) / 0.76));
      const ag = dir === 'a2b' ? Math.max(ag0, E(C(u / 0.3))) : 1;
      this.setState({ agFront: front, agTail: tail, agX: x0 + (x1 - x0) * xp, agit: ag, disp: Math.max(this.state.disp, ag), agFlowD: front + 2.2 * xp + tail });
    }, () => { this.setState({ agFront: 0, agTail: 0, agFlowD: 0, agX: x1 }); done(); }, true);
  }
  sAgitate(k, i) {
    const d = PD[k], X = PVE(), P = fmtP(d.p);
    this.setState({ pump: 'agitate', V: d.vPre, G: d.gPre,
      msg: 'Agitating at ' + P + ' psig — transferring the full sample (oil + liberated gas) Pump A → Pump B through the manifold. Gas outlet and oil transfer valves CLOSED.' });
    this.agStroke('a2b', () => {
      this.setState({ agDir: 'hold', msg: 'Transfer A → B complete — whole sample in Pump B (' + cc(d.vPre) + ' cc). Pump A empty. Mixing at ' + P + ' psig…' });
      this.wait(X.T.HOLD, () => {
        this.setState({ msg: 'Gas coming out of solution to equilibrium — Pump B retracts to hold ' + P + ' psig.' });
        this.tw(EQ_MS, e => this.setState({ V: d.vPre + (d.stab - d.vPre) * e, G: d.gPre + (d.gEq - d.gPre) * e,
          msg: 'Equilibrating in Pump B at ' + P + ' psig — sample volume ' + cc(d.vPre + (d.stab - d.vPre) * e) + ' cc (pump retracting to hold pressure).' }), () => {
          this.setState({ V: d.stab, G: d.gEq, msg: 'Returning the sample Pump B → Pump A through the manifold (oil + gas together).' });
          this.agStroke('b2a', () => {
            this.setState({ agDir: 'stab', pump: 'hold', nuc: 0, msg: 'Transfer B → A complete — Pump B empty. Stabilizing: the gas separates from the oil and rises to a cap in Pump A.' });
            this.tw(X.T.STAB * 1000, a => this.setState({ agit: 1 - a, disp: 1 - a }), () => {
              this.finish(i, 'Agitation complete — all oil back in Pump A under a ' + cc(d.gEq) + ' cc gas cap (cell ' + cc(d.stab) + ' cc), Pump B empty. Ready to vent the gas.',
                { agit: 0, disp: 0, agX: 0, agDir: '' });
            }, true);
          });
        }, true);
      });
    });
  }
  /* 3 — vent the gas cap through the gas outlet into the water glass at constant pressure */
  sVent(k, i) {
    const d = PD[k];
    this.setState({ gTxt: 'OPENING', msg: 'Opening the gas outlet valve…' });
    this.tw(900, e => this.setState({ vG: e }), () => {
      this.setState({ gTxt: 'OPEN', pump: 'advance', gasFlow: 1 });
      this.tw(7000, e => this.setState({ G: d.gEq * (1 - e), V: d.stab - d.gEq * e, gasFlow: e < .88 ? 1 : (1 - e) / .12,
        msg: 'Venting gas at ' + fmtP(d.p) + ' psig — Pump A advances to hold pressure; gas bubbles through the water: ' + cc(d.gEq * e) + ' / ' + cc(d.gEq) + ' cc (cell volume).' }), () => {
        this.setState({ gasFlow: 0, pump: 'hold', G: 0, V: d.rem });
        this.wait(700, () => this.finish(i, 'Gas cap gone — oil now fills Pump A to the top. The gas outlet is still OPEN: watch for the first oil drop.'));
      }, true);
    });
  }
  /* 4 — oil rises to the outlet; the first small drop is the cue to close the valve immediately */
  sDrop(k, i) {
    this.setState({ pump: 'advance', msg: 'Pump A advancing slowly — the oil front rises through the riser toward the gas outlet valve.' });
    this.tw(2200, e => this.setState({ riser: e }), () => {
      this.setState({ pump: 'hold', msg: 'FIRST OIL DROP at the gas outlet — close the valve immediately.' });
      this.tw(900, e => this.setState({ drop: e }), () => {
        this.setState({ gTxt: 'CLOSING' });
        this.tw(600, e => this.setState({ vG: 1 - e }), () => {
          this.setState({ gTxt: 'CLOSED' });
          this.tw(1600, e => this.setState({ drop: 1 - e * .6 }), () => {
            this.finish(i, 'Gas outlet CLOSED on the first oil drop — no oil drained into the glass. The drop is only the closing cue, not proof that every trace of dissolved gas is gone.', { drop: 0 });
          });
        });
      });
    });
  }
  /* 5 — transfer XFER_CC of equilibrium oil through the oil line to the viscometer bottom inlet */
  sXfer(k, i) {
    const d = PD[k], first = k === 0, st0 = this.state;
    const V0 = st0.V, w0 = st0.waste;
    const openTop = next => {
      this.setState({ tTxt: 'OPENING', msg: first ? 'Cracking the viscometer top outlet valve (evacuated chamber) to let the incoming oil flush through.'
        : 'Cracking the viscometer top outlet valve — the old oil trapped at ' + fmtP(d.pPrev) + ' psig is released to the new test pressure.' });
      this.tw(800, e => this.setState({ vT: .4 * e }), () => {
        this.setState({ tTxt: 'THROTTLED' });
        if (first) return next();
        this.setState({ flowTail: true, pvStage: 'release' });
        this.tw(2600, e => this.setState({ PV: d.pPrev + (d.p - d.pPrev) * e, msg: 'Viscometer pressure easing down: ' + fmtP(d.pPrev + (d.p - d.pPrev) * e) + ' psig → ' + fmtP(d.p) + ' psig.' }), () => {
          this.setState({ flowTail: false, PV: d.p, pvStage: 'stable' }); next();
        });
      });
    };
    openTop(() => {
      this.setState({ oTxt: 'OPENING', msg: 'Opening the oil transfer valve — Pump A will push the equilibrium oil at ' + fmtP(d.p) + ' psig.' });
      this.tw(900, e => this.setState({ vO: e }), () => {
        this.setState({ oTxt: 'OPEN', pump: 'advance', flowIn: true, pvStage: first ? 'filling' : 'hold' });
        const fillCC = LINE_IN_CC + CHAMBER_CC + STUB_CC;
        this.tw(8000, e => {
          const x = XFER_CC * e, S = { xfer: x, V: V0 - x };
          if (first) {
            S.vIn = Math.min(LINE_IN_CC, x);
            S.vCh = C((x - LINE_IN_CC) / CHAMBER_CC) * CHAMBER_CC;
            S.vSt = C((x - LINE_IN_CC - CHAMBER_CC) / STUB_CC) * STUB_CC;
            S.vTail = C((x - fillCC) / TAIL_CC) * TAIL_CC;
            S.flowUp = x > LINE_IN_CC; S.flowTail = x > fillCC;
            S.waste = w0 + Math.max(0, x - fillCC);
            S.PV = d.p * C(x / fillCC);
            S.msg = x < LINE_IN_CC ? 'Oil travelling along the transfer line: ' + cc(x) + ' cc.'
              : x < LINE_IN_CC + CHAMBER_CC ? 'Oil entering the chamber from the BOTTOM inlet — filling 3 cc around the falling body.'
              : 'Chamber full (3 cc retained). The rest flushes out of the top outlet to waste: ' + cc(x) + ' / ' + XFER_CC + ' cc transferred.';
          } else {
            S.flowUp = true; S.flowTail = true; S.waste = w0 + x;
            S.msg = 'Transferring: ' + cc(x) + ' / ' + XFER_CC + ' cc — fresh oil enters at the bottom and displaces the old oil out of the top outlet. The chamber still holds 3 cc.';
          }
          this.setState(S);
        }, () => {
          this.setState({ flowIn: false, flowUp: false, flowTail: false, pump: 'hold', tTxt: 'CLOSING', PV: d.p,
            msg: XFER_CC + ' cc transferred. Closing the top outlet valve…' });
          this.tw(800, e => this.setState({ vT: .4 * (1 - e) }), () => {
            this.setState({ vT: 0, tTxt: 'CLOSED', oTxt: 'CLOSING', msg: 'Closing the oil transfer valve — the viscometer is isolated at ' + fmtP(d.p) + ' psig.' });
            this.tw(800, e => this.setState({ vO: 1 - e }), () => {
              this.finish(i, 'Viscometer loaded: 3 cc of fresh equilibrium oil at ' + fmtP(d.p) + ' psig, both valves CLOSED. Cell now holds ' + cc(this.state.V) + ' cc.',
                { oTxt: 'CLOSED', pvStage: 'stable' });
            });
          });
        }, true);
      });
    });
  }
  /* 6 — stabilize, falling-body measurement (drive up, fall, sense, mu = K x t), record the point */
  sMeasure(k, i) {
    const R = RES[k];
    this.setState({ pvStage: 'settle', msg: 'Confirming the viscometer pressure and temperature are stable at ' + fmtP(R.p) + ' psig, ' + TEST_T.toFixed(1) + ' °C…' });
    this.wait(1600, () => {
      if (R.t == null) { this.finish(i, 'No viscosity value is defined for ' + fmtP(R.p) + ' psig in the project data.', { pvStage: 'stable' }); return; }
      this.setState({ pvStage: 'stable', measuring: k, drive: true, tRun: null,
        msg: 'Point ' + (k + 1) + ' · ' + fmtP(R.p) + ' psig — driving coil energized, lifting the falling body to the top stop…' });
      this.tw(2400, e => this.setState({ body: B_REST + (B_TOP - B_REST) * e }), () => {
        this.setState({ drive: false, falling: true, tRun: 0, msg: 'Driving coil OFF — the body falls through the oil; the sensing coil times its travel.' });
        this.tw(R.t * 1000, e => {
          const y = B_TOP + (B_REST - B_TOP) * e, tip = y + 98;
          this.setState({ body: y, tRun: R.t * e, sense: tip > SENSE[0] && tip < SENSE[1] + 20 });
        }, () => {
          const meas = this.state.meas.concat([R]);
          this.setState({ falling: false, sense: false, tRun: R.t, measuring: -1, meas, newest: k,
            msg: 'Point ' + (k + 1) + ' recorded: t = ' + R.t.toFixed(2) + ' s → μ = ' + K_CAL.toFixed(2) + ' × ' + R.t.toFixed(2) + ' = ' + R.mu.toFixed(2) + ' cP at ' + fmtP(R.p) + ' psig.' });
          this.wait(1400, () => this.finish(i, this.state.msg + (k < NP - 1 ? ' Next: reduce to ' + fmtP(PTS[k + 1]) + ' psig.' : '')));
        }, true);
      });
    });
  }
  sResults(i) {
    this.setState({ msg: 'Compiling the pressure–viscosity result…' });
    this.wait(900, () => {
      this.finish(i, 'Test complete — below Psat the oil viscosity rises as pressure falls, because each lower pressure leaves less gas dissolved in the oil.', { complete: true, auto: false });
      this.status('Completed');
    });
  }

  runAll() { const st = this.state; if (st.busy || st.complete) return; this.setState({ auto: true }); this.run(st.cur); }
  /* ---- shared procedure panel (ProcCtl.js): stages use the existing snapshot navigation (goStage) ---- */
  pcRunning() { const st = this.state; return !!st.busy || this.waits.length > 0 || (!!st.auto && !st.complete); }
  pcInfo() {
    const st = this.state, N = NS, k = Math.max(0, Math.min(N - 1, st.cur));
    return { N, k, unit: 'Step', title: (STAGES[k].k < NP ? 'Point ' + (STAGES[k].k + 1) + ' · ' + fmtP(PTS[STAGES[k].k]) + ' psig · ' : '') + STAGES[k].name, q: st.msg || '',
      status: st.paused ? 'paused' : this.pcRunning() ? 'running' : st.complete ? 'complete' : 'ready',
      allDone: !!st.complete, frac: null, doneMask: (st.done || []).slice(),
      canPrev: k > 0, canNext: k < N - 1, canRestart: !!(st.busy || st.paused || st.complete || this.jobs.length || (st.done || [])[k]),
      runLabel: STAGES[k].btn, runAll: 'Run Full Procedure', runAllDisabled: !!(st.busy || st.complete || st.auto),
      again: 'Run Test Again', reset: 'Reset Two-Phase Test', resetDisabled: false };
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
  reset() { SAVED = null; this.goStage(0); }

  /* ---------- live text for the Explain panel (read by StepGuide) ---------- */
  guide(V) {
    const st = this.state, i = st.cur, g = STAGES[i], busy = st.busy;
    const last = st.meas.length ? st.meas[st.meas.length - 1] : null, dash = '—';
    let t, d, w, e, o;
    if (!NP) { t = 'No pressure points'; d = 'The Differential Liberation stage data was not found and no override is set.'; w = e = o = dash; }
    else if (g.k >= NP) {
      t = 'Pressure–viscosity result';
      d = 'Six points from ' + fmtP(PTS[0]) + ' to ' + fmtP(PTS[NP - 1]) + ' psig define the two-phase (saturated oil) viscosity curve at ' + TEST_T.toFixed(1) + ' °C.';
      w = 'Below Psat (' + fmtP(PSAT_G) + ' psig) every pressure step releases more gas. The oil left behind has less dissolved gas, so it is heavier and more viscous.';
      e = 'None — static.'; o = 'Viscosity increasing as pressure decreases — the opposite trend to the single-phase curve above Psat.';
    } else {
      const P = PD[g.k], pre = 'Point ' + (g.k + 1) + ' of ' + NP + ' · ' + fmtP(P.p) + ' psig · ';
      if (g.s === 0) {
        t = pre + 'Reduce pressure';
        d = 'Pump A retracts, increasing the cell volume, so the pressure falls smoothly from ' + fmtP(P.pPrev) + ' to ' + fmtP(P.p) + ' psig — the same pressure step as the Differential Liberation stage.';
        w = 'Lowering the pressure below the saturation pressure lets part of the dissolved gas come out of solution.';
        e = 'Piston moving down, pressure falling, small gas bubbles forming in the oil.'; o = 'The first bubbles appear once the pressure drops below the saturation pressure.';
      } else if (g.s === 1) {
        t = pre + 'Agitate';
        d = 'Same two-pump agitation as the PV test: the complete sample (oil + liberated gas) is transferred from Pump A to Pump B through the sample manifold, held while the gas reaches equilibrium (Pump B retracts to hold pressure), then returned from Pump B to Pump A. The gas then separates into a cap above the oil in Pump A. Gas outlet and oil transfer valves stay CLOSED.';
        w = 'Moving the sample through the line mixes oil and gas, bringing them to equilibrium at this pressure, so the oil sent to the viscometer is saturated at the test pressure.';
        e = 'Pump A emptying while Pump B fills (A → B), sample flowing through the manifold, then the reverse (B → A); dispersed gas travelling with the oil.'; o = 'Pump B empty at the end, all oil in Pump A, then a sharp gas–oil interface — agitation complete, gas venting can begin.';
      } else if (g.s === 2) {
        t = pre + 'Vent gas into water';
        d = 'The gas outlet valve opens and Pump A advances at constant pressure, pushing the gas cap out through the gas line into the glass of water.';
        w = 'Removing the liberated gas leaves only equilibrium oil in the cell. Bubbling through water makes the gas flow visible.';
        e = 'Gas cap shrinking; bubbles rising through the water glass. The oil line stays closed.'; o = 'The bubbling slowing down as the gas cap disappears.';
      } else if (g.s === 3) {
        t = pre + 'First oil drop — close the outlet';
        d = 'With the gas cap gone, oil rises to the gas outlet. The first small drop of oil at the outlet is the signal to close the gas outlet valve immediately.';
        w = 'Closing on the first drop stops oil being drained into the glass. It is a visual closing cue, not proof that all dissolved gas has been removed.';
        e = 'Oil front rising in the riser; one drop at the outlet; valve closing.'; o = 'The valve closing at once — no oil flows into the water.';
      } else if (g.s === 4) {
        t = pre + 'Transfer ' + XFER_CC + ' cc to the viscometer';
        d = 'The oil transfer valve and the top outlet valve are opened. Pump A pushes ' + XFER_CC + ' cc of equilibrium oil at ' + fmtP(P.p) + ' psig through the oil line into the BOTTOM inlet of the viscometer. The chamber keeps its 3 cc; the rest flushes the previous oil out of the top outlet to waste. Both valves are then closed.';
        w = 'Flushing replaces the old oil (saturated at the previous, higher pressure) with oil in equilibrium at the new test pressure.';
        e = 'Oil moving only through the open oil line; the gas line stays closed.'; o = 'Transferred volume counting up to ' + XFER_CC + ' cc while the chamber stays at 3 cc.';
      } else {
        t = pre + 'Measure viscosity';
        d = 'After the pressure is confirmed stable, the driving coil lifts the falling body and releases it. The sensing coil times its fall; μ = K × t.';
        w = 'The measurement is made on a static liquid at a known, stable pressure and temperature.';
        e = 'Falling body lifted, then falling through the chamber.'; o = 'The point appearing in the table and on the pressure–viscosity graph.';
      }
    }
    return {
      title: 'Two-Phase Viscosity — ' + t,
      tag: st.paused ? 'PAUSED' : (busy ? 'RUNNING · ' : '') + 'STEP ' + (i + 1) + ' / ' + NS,
      busy: busy && !st.paused, d, w, e, o,
      vals: [
        V('Cell pressure', fmtP(st.P), 'psig'),
        V('Viscometer', st.PV == null ? dash : fmtP(st.PV), st.PV == null ? '' : 'psig'),
        V('Points', st.meas.length + ' / ' + NP, ''),
        V('Last μ', last ? last.mu.toFixed(2) : dash, last ? 'cP' : '')
      ]
    };
  }

  renderVals() {
    const st = this.state, i = st.cur, g = STAGES[i], busy = st.busy, clk = this.bclk;
    const dash = '—';

    /* ---------- PVT cell (DL coordinates) — two-pump phase split (PV / DL model) ----------
       At rest everything is in Pump A. A stroke moves the Pump A contents (oil + gas together) into Pump B;
       material leaving one pump appears in the other at the same instant: vA + vB = V always. */
    const V = Math.max(0, st.V), G = Math.max(0, Math.min(V, st.G));
    const xf = C(st.agX || 0), agit = C(st.agit || 0);
    const Lq = Math.max(0, V - G);
    const oilA = Lq * (1 - xf), gasA = G * (1 - xf), oilB = Lq * xf, gasB = G * xf;
    const vA = oilA + gasA, vB = oilB + gasB;
    const dsp = C(Math.max(st.disp || 0, 0.8 * agit));                // share of the gas dispersed as bubbles in the oil
    const h = Math.min(180, PXC * vA), hB = Math.min(180, PXC * vB);  // contents height from the bore top
    const pistY = A_TOP + h, pistYB = A_TOP + hB;
    const capH = Math.min(h, PXC * gasA * (1 - dsp)), capHB = Math.min(hB, PXC * gasB * (1 - dsp));
    const oilY = A_TOP + capH, oilH = Math.max(0, pistY - oilY);
    const oilYB = A_TOP + capHB, oilHB = Math.max(0, pistYB - oilYB);
    const nb0 = Math.max(dsp, st.nuc * 0.45) * (G > 0.01 ? 1 : 0);
    /* bubbles travel with the sample: each pump shows them in proportion to the oil it holds */
    const bubsIn = (x0, top, bot, share, ph0) => BUBS.map((sd, k) => {
      const nb = nb0 * C(share * 1.6), H = bot - top;
      if (H < 10 || sd.th >= nb) return { x: '0', y: '0', r: 0, o: '0' };
      const f = (((sd.ph + ph0 + clk * sd.sp * 0.45) % 1) + 1) % 1;
      const yR = bot - 4 - f * (H - 8), yS = top + 4 + (H - 8) * (0.5 + 0.46 * Math.sin(clk * 5.2 * sd.sp + sd.ph * 6.283));
      const x = Math.max(x0 + 3, Math.min(x0 + 33, x0 + 4 + sd.fx * 28 + Math.sin(clk * (4 + 6 * agit) + k * 1.7) * (0.6 + 3 * agit)));
      const fade = agit + (1 - agit) * Math.min(1, f / 0.1, (1 - f) / 0.1);
      return { x: x.toFixed(1), y: (agit * yS + (1 - agit) * yR).toFixed(1), r: (sd.r * (0.8 + 0.5 * (1 - agit) * f)).toFixed(2), o: (0.85 * C((nb - sd.th) / 0.1) * C(fade)).toFixed(2) };
    });
    const bubsA = bubsIn(A_X, oilY, pistY, 1 - xf, 0), bubsB = bubsIn(848, oilYB, pistYB, xf, 0.37);
    /* sample in the connecting manifold (PV test: continuous band between tail and front + carried specks) */
    const X = PVE(), agOn = st.agDir === 'a2b' || st.agDir === 'b2a';
    const route = st.agDir === 'b2a' ? X.ROUTE_BA : X.ROUTE_AB, LL = X.LINE_L;
    const fl = LL * C(st.agFront || 0), tl = LL * C(st.agTail || 0), band = agOn ? Math.max(0, fl - tl) : 0;
    const DD = LL * (st.agFlowD || 0);
    const agSpecks = [0, 1, 2, 3, 4, 5, 6].map(k => {
      const sp = ((k * LL / 7 + DD) % LL + LL) % LL, inside = band > 0.5 && sp > tl + 3 && sp < fl - 3;
      const gas = G > 0.01 && k % 2 === 0, pt = X.routePt(route, sp);
      return { x: pt[0].toFixed(1), y: pt[1].toFixed(1), r: gas ? 1.8 : 1.1, fill: gas ? '#e2fff2' : '#fff3c4', o: inside ? (gas ? 0.95 : 0.8) : 0 };
    });
    const agFp = X.routePt(route, fl), agFr = st.agFront || 0;
    const ang = (-140 + 100 * C((5000 - st.P) / 5000)) * Math.PI / 180;
    const phaseTxt = st.agDir === 'a2b' ? 'AGITATING · SAMPLE A → B' : st.agDir === 'b2a' ? 'AGITATING · SAMPLE B → A' : st.agDir === 'hold' ? 'SAMPLE IN PUMP B · EQUILIBRATING' : st.agDir === 'stab' ? 'STABILIZING · GAS SEPARATING' : st.agit > .05 ? 'AGITATING · OIL + GAS MIXING' : G > 0.01 ? (st.disp > .05 || st.nuc ? 'OIL + LIBERATED GAS (DISPERSED)' : 'GAS CAP OVER OIL')
      : g.k === 0 && g.s === 0 && !busy ? 'SINGLE-PHASE OIL · GAS IN SOLUTION' : 'OIL ONLY · GAS CAP REMOVED';
    const phaseCol = st.agit > .05 ? 'var(--blue)' : G > 0.01 ? 'var(--grn)' : 'var(--cap2)';
    const pumpTxt = st.agDir === 'a2b' ? 'TRANSFER A → B' : st.agDir === 'b2a' ? 'TRANSFER B → A' : st.agDir === 'hold' ? 'PUMP B · HOLD P' : 'PUMP A · ' + ({ hold: 'HOLD P', retract: 'RETRACTING', advance: 'ADVANCING', agitate: 'AGITATING' }[st.pump] || 'HOLD P');
    const pumpCol = st.pump === 'retract' ? '#f0913f' : st.pump === 'advance' ? '#46d39a' : st.pump === 'agitate' ? '#4d9dff' : '#9fb0c8';

    /* ---------- gas line + water glass (gas vent) ---------- */
    const gasOn = st.gasFlow > 0.02;
    const gb = GBUBS.map((b, k) => {
      if (!gasOn || k / GBUBS.length >= st.gasFlow) return { x: '0', y: '0', r: 0, o: '0' };
      const f = (((b.ph + clk * b.sp * 0.8) % 1) + 1) % 1;
      const y0 = GLASS.tube - 2, y1 = GLASS.water + 3;
      const y = y0 - f * (y0 - y1), x = GLASS.cx + Math.sin(clk * 3 + b.wob * 6.28 + f * 5) * (3 + f * 10);
      return { x: x.toFixed(1), y: y.toFixed(1), r: (b.r * (0.9 + 0.6 * f)).toFixed(2), o: (0.9 * Math.min(1, (1 - f) / 0.08)).toFixed(2) };
    });
    const ripple = gasOn ? (1.2 * Math.sin(clk * 7)).toFixed(2) : '0';
    /* gas moving through the tubing: dashes along the gas line + a train of small gas slugs */
    const gSlugs = [0, 1, 2, 3, 4].map(k => {
      if (!gasOn) return { x: '0', y: '0', o: '0' };
      const p = ptAt(G_PTSR, (((clk * 0.55 + k / 5) % 1) + 1) % 1);
      return { x: f(p[0]), y: f(p[1]), o: (0.95 * C(st.gasFlow * 1.5)).toFixed(2) };
    });

    /* ---------- viscometer (Single-Phase instrument, inclined) + oil line ---------- */
    const gm = geo(st.incl == null ? INCL0 : st.incl);
    const inclR = Math.round(gm.th * 2) / 2, inclTxt = inclR.toFixed(Number.isInteger(inclR) ? 0 : 1) + '°';
    const fIn = st.vIn / LINE_IN_CC, fSt = st.vSt / STUB_CC, fTl = st.vTail / TAIL_CC;
    const front = ptAt(gm.P_IN, fIn), frontSt = ptAt(P_ST, fSt), frontTl = ptAt(gm.P_TAILR, fTl);
    const fCh = Math.min(1, st.vCh / CHAMBER_CC);
    const chLvl = gm.low - (gm.low - gm.high) * fCh;            // world y of the horizontal oil surface in the tilted bore
    const upOn = st.flowUp && st.vCh >= CHAMBER_CC;
    const wasteH = WASTE.h * 0.86 * Math.min(1, st.waste / WASTE.cap);

    const tagOf = txt => {
      const open = txt === 'OPEN' || txt === 'OPENING' || txt === 'THROTTLED';
      const col = txt === 'THROTTLED' ? '#f0913f' : open ? '#46d39a' : txt === 'CLOSING' ? '#f0c574' : '#e0564f';
      return { text: txt, fill: 'rgba(0,0,0,0)', stroke: col, color: col };
    };
    const tG = tagOf(st.gTxt), tO = tagOf(st.oTxt), tT = tagOf(st.tTxt);
    const A = (x, y, dir, on, col) => ({ d: arrowD(x, y, dir), col, style: 'opacity:' + (on ? 1 : 0) + '; transition:opacity .4s ease;' });
    /* arrows follow the tubing: cell -> (left) transfer valve -> riser (down) -> inlet (left) -> up the chamber
       -> top outlet -> waste run (left) -> waste glass;  gas: side outlet -> (right) valve -> down into the water */
    const arrows = [
      A(846, MAN_Y, 'l', st.flowIn, '#ffcf3f'),
      A(IN_X, 330, 'd', st.flowIn && fIn > .35, '#ffcf3f'),
      A(r1((IN_X + gm.IN_A[0]) / 2), gm.IN_A[1], 'l', st.flowIn && fIn > .75, '#ffcf3f'),
      A(r1(gm.UPA[0]), r1(gm.UPA[1]), gm.AXUP, upOn || st.flowTail, '#ffcf3f'),
      A(gm.TAIL_MX, TAIL_Y, 'l', st.flowTail && fTl > .5, '#ffcf3f'),
      A(WASTE_CX, 44, 'd', st.flowTail && fTl > .9, '#ffcf3f'),
      A(1140, GAS_Y, 'r', gasOn, '#7fe3b4'),
      A(1222, GAS_Y, 'r', gasOn, '#7fe3b4'),
      A(GLASS.cx, 300, 'd', gasOn, '#7fe3b4')
    ];

    /* equipment used in the current step at full strength; the rest toned down (same rule as Single-Phase) */
    const sNow = g.k >= NP || st.complete ? -1 : g.s;
    const INV = sNow < 0 ? 'in tail vl coil ctl pdu gas' : sNow <= 1 ? '' : sNow <= 3 ? 'gas' : sNow === 4 ? 'in tail vl pdu' : 'coil ctl pdu';
    const SOFT = { ctl: 1, pdu: 1 };
    const dim = key => INV.indexOf(key) >= 0 ? 'opacity:1; filter:none; transition:opacity .5s, filter .5s;'
      : SOFT[key] ? 'opacity:.82; filter:saturate(.45); transition:opacity .5s, filter .5s;' : 'opacity:.6; filter:saturate(.3); transition:opacity .5s, filter .5s;';
    const lastM0 = st.meas.length ? st.meas[st.meas.length - 1] : null;

    /* ---------- chips ---------- */
    const kNow = g.k;
    const chips = PTS.map((p, k) => {
      const i0 = k * 6, dn = st.done[i0 + 5], on = kNow === k && !st.complete;
      const tg = dn ? 'Complete' : on ? (busy ? 'Running' : 'Active') : 'Ready';
      return { n: String(k + 1), name: fmtP(p) + ' psig', tag: tg, tagColor: dn ? 'var(--grn)' : on ? 'var(--blue)' : 'var(--mut)',
        onClick: () => this.goStage(i0), style: chipStyle(on, dn) };
    }).concat([(() => { const dn = st.complete, on = kNow >= NP && !dn;
      return { n: '7', name: 'Results', tag: dn ? 'Complete' : on ? (busy ? 'Running' : 'Active') : 'Ready', tagColor: dn ? 'var(--grn)' : on ? 'var(--blue)' : 'var(--mut)',
        onClick: () => this.goStage(NS - 1), style: chipStyle(on || dn && kNow >= NP, dn) }; })()]);
    const subs = SUBS.map((s, j) => {
      const idx = Math.min(kNow, NP - 1) * 6 + j, dn = st.done[idx], on = idx === i && kNow < NP;
      const col = on ? 'var(--blue)' : dn ? 'var(--grn)' : 'var(--mut)';
      return { n: String(j + 1), name: s, onClick: () => this.goStage(idx),
        style: 'flex:1 1 0; min-width:0; display:flex; align-items:center; gap:5px; font-family:inherit; font-size:10.5px; font-weight:600; padding:3px 7px; border-radius:7px; cursor:pointer; white-space:nowrap; overflow:hidden; color:' + col +
          '; background:' + (on ? 'rgba(47,111,208,.10)' : 'transparent') + '; border:1px solid ' + (on ? 'var(--blue)' : dn ? 'rgba(29,138,90,.35)' : 'var(--line)') + ';',
        dot: 'width:6px; height:6px; flex:0 0 auto; border-radius:50%; background:' + col + ';' };
    });

    const canRun = !busy && !st.paused && !st.complete && !st.done[i] && NP > 0;
    const canAuto = !busy && !st.paused && !st.complete && NP > 0;
    const canPause = busy || st.paused || this.jobs.length > 0;
    const btnMain = on => 'font-family:inherit; font-size:11px; font-weight:600; white-space:nowrap; padding:8px 16px; border-radius:8px; cursor:' + (on ? 'pointer' : 'default') +
      '; background:' + (on ? 'linear-gradient(180deg,#46d39a,#2f9d72)' : 'var(--icard)') + '; border:1px solid ' + (on ? '#2f9d72' : 'var(--line2)') + '; color:' + (on ? '#06231a' : 'var(--mut)') + ';';
    const btnSub = (on, act) => 'font-family:inherit; font-size:10.5px; font-weight:600; white-space:nowrap; padding:8px 13px; border-radius:8px; cursor:' + (on ? 'pointer' : 'default') +
      '; background:' + (act ? 'rgba(47,111,208,.10)' : 'var(--icard)') + '; border:1px solid ' + (act ? 'var(--blue)' : 'var(--line2)') + '; color:' + (act ? 'var(--blue)' : on ? 'var(--txt2)' : 'var(--mut)') + '; opacity:' + (on || act ? 1 : .55) + ';';

    /* ---------- readouts ---------- */
    const pState = st.pump === 'retract' ? 'REDUCING ↓' : st.pump === 'agitate' ? 'AGITATING' : st.pump === 'advance' ? 'HELD BY PUMP' : 'STABLE';
    const pCol = st.pump === 'retract' ? '#f0913f' : st.pump === 'agitate' ? 'var(--blue)' : 'var(--grn)';
    const pvs = st.pvStage;
    const pvTxt = st.PV == null ? 'NO READING' : pvs === 'release' ? 'RELEASING ↓' : pvs === 'filling' ? 'FILLING' : pvs === 'settle' ? 'STABILIZING' : pvs === 'isolated' ? 'ISOLATED' : 'STABLE';
    const n = st.meas.length;
    const tgtTxt = kNow >= NP ? fmtP(PTS[NP - 1]) : fmtP(PTS[kNow] || 0);
    const ptTxt = st.complete || n === NP ? NP + ' / ' + NP + ' complete' : 'Point ' + (Math.min(kNow, NP - 1) + 1) + ' / ' + NP;
    const kM = st.measuring;
    const lastM = n ? st.meas[n - 1] : null;
    const tTxt = st.tRun != null ? st.tRun.toFixed(2) : (lastM ? lastM.t.toFixed(2) : dash);
    const muTxt = kM >= 0 ? (st.falling || st.drive ? '…' : dash) : (lastM ? lastM.mu.toFixed(2) : dash);
    const measTag = st.drive ? 'LIFTING' : st.falling ? 'TIMING' : kM >= 0 ? '' : (lastM ? 'RECORDED' : 'IDLE');
    const measCol = st.drive ? 'var(--blue)' : st.falling ? 'var(--grn)' : lastM ? 'var(--amb)' : 'var(--mut)';

    /* graph: Pressure (psig) on x, Viscosity (cP) on y */
    const Gx = { x0: 42, x1: 292, y0: 12, y1: 128 }, XMIN = 0, XMAX = 2400;
    const mus = RES.filter(r => r.mu != null).map(r => r.mu);
    const YMIN = mus.length ? Math.floor(Math.min.apply(null, mus) - .5) : 0, YMAX = mus.length ? Math.ceil(Math.max.apply(null, mus) + .5) : 10;
    const gx = p => Gx.x0 + (p - XMIN) / (XMAX - XMIN) * (Gx.x1 - Gx.x0), gy = m => Gx.y1 - (m - YMIN) / (YMAX - YMIN) * (Gx.y1 - Gx.y0);
    const xt = [0, 400, 800, 1200, 1600, 2000, 2400].map(p => ({ x: gx(p).toFixed(1), lbl: p.toLocaleString('en-US') }));
    const yStep = YMAX - YMIN > 6 ? 2 : 1;
    const yt = []; for (let m = YMIN; m <= YMAX + 1e-9; m += yStep) yt.push({ y: gy(m).toFixed(1), ty: (gy(m) + 3).toFixed(1), lbl: m.toFixed(0) });
    const sorted = st.meas.slice().sort((a, b) => a.p - b.p);
    const gpts = st.meas.map((r, k) => ({ cx: gx(r.p).toFixed(1), cy: gy(r.mu).toFixed(1), r: k === n - 1 && st.newest >= 0 ? 5 : 3.6,
      fill: k === n - 1 && st.newest >= 0 ? '#ffcf3f' : '#e0b53a' }));
    const curP = kNow < NP && st.P <= XMAX ? gx(Math.max(XMIN, st.P)) : null;
    const resOn = n > 0 || kM >= 0 || !!st.complete;   // results appear with the first measurement
    const rows = RES.map((r, k) => {
      const m = k < n, act = k === n && kNow === k && !st.complete;
      return { p: fmtP(r.p), t: m ? r.t.toFixed(2) : dash, mu: m ? r.mu.toFixed(2) : dash,
        style: 'display:grid; grid-template-columns:1.1fr .9fr .9fr; gap:4px; padding:1px 4px; border-radius:4px; background:' + (act ? 'rgba(47,111,208,.10)' : 'transparent') + '; color:' + (m ? 'var(--txt)' : 'var(--mut)') + ';' };
    });
    const pill = (txt, col) => ({ txt, style: 'font-family:\'IBM Plex Mono\',monospace; font-size:9px; font-weight:700; letter-spacing:.6px; padding:2px 6px; border-radius:5px; color:' + col + '; border:1px solid ' + col + '; white-space:nowrap;' });
    const chamberLbl = st.vCh <= 0 ? 'EVACUATED · EMPTY' : st.vCh < CHAMBER_CC ? 'FILLING' : (st.flowUp ? 'FULL · FLUSHING' : 'FULL');
    const valve = (v, x, y) => ({ hot: 'opacity:' + Math.min(1, v * 1.6) + ';', wheel: 'transform:rotate(' + (v * 90).toFixed(1) + 'deg); transform-box:fill-box; transform-origin:center;' });

    return {
      v2Stages: chips, v2Subs: subs,
      v2Msg: st.msg,
      v2MsgCol: st.paused ? 'var(--amb)' : busy ? 'var(--blue)' : st.complete ? 'var(--grn)' : 'var(--txt2)',
      v2MsgDot: 'width:7px; height:7px; flex:0 0 auto; border-radius:50%; background:' + (st.paused ? 'var(--amb)' : busy ? 'var(--blue)' : st.complete ? 'var(--grn)' : 'var(--mut2)') + ';' + (busy && !st.paused ? ' animation:v2Blink 1.1s ease-in-out infinite;' : ''),
      v2StepTag: st.paused ? 'PAUSED' : 'STEP ' + (i + 1) + ' / ' + NS,
      v2Anim: st.paused ? 'v2-paused' : '',

      /* cell */
      v2CellTr: 'translate(' + CELL_DX + ',' + CELL_DY + ')',
      v2GasH: f(capH), v2LiqY: f(oilY), v2LiqH: f(oilH), v2PistY: f(pistY), v2IfOn: capH > 1 && oilH > 1, v2IfY: f(oilY),
      v2Bubs: bubsA, v2BubsB: bubsB,
      v2GasHB: f(capHB), v2LiqYB: f(oilYB), v2LiqHB: f(oilHB), v2PistYB: f(pistYB), v2IfOnB: capHB > 1 && oilHB > 1, v2IfYB: f(oilYB),
      v2PumpB: cc(vB) + ' cc',
      v2AgRoute: 'M ' + route.map(q => q[0] + ' ' + q[1]).join(' L '), v2AgDash: '0 ' + tl.toFixed(1) + ' ' + band.toFixed(1) + ' ' + (LL + 20),
      v2AgBandOn: 'opacity:' + (band > 0.5 ? 1 : 0) + ';', v2AgSpecks: agSpecks,
      v2AgSlug: 'opacity:' + (agOn && agFr > 0.02 && agFr < 0.995 ? 1 : 0) + '; transition:opacity .3s ease;', v2AgSx: f(agFp[0]), v2AgSy: f(agFp[1]),
      v2AgArrow: st.agDir === 'b2a' ? 'M 980 184 l 12 6 l -12 6 Z' : 'M 916 184 l -12 6 l 12 6 Z', v2AgArrowOn: 'opacity:' + (agOn ? 1 : 0) + '; transition:opacity .35s ease;', v2DissStyle: 'opacity:' + (G < 0.01 && !(g.k === 0 && g.s === 0) ? 0 : .5) + ';',
      v2NeedleX: f(948 + 12 * Math.cos(ang)), v2NeedleY: f(240 + 12 * Math.sin(ang)),
      v2SensorPulse: 'opacity:' + (st.pump === 'retract' && !st.paused ? .8 : 0) + '; transition:opacity .3s;',
      v2P: fmtP(st.P) + ' psig', v2V: cc(V) + ' cc',
      v2PumpA: cc(vA) + ' cc', v2PhaseTxt: phaseTxt, v2PhaseCol: phaseCol,
      v2PumpTxt: pumpTxt, v2PumpCol: pumpCol,

      /* gas line + water glass */
      v2DG: D_G, v2DR: D_R,
      v2GasDash: 'opacity:' + (gasOn ? 1 : 0) + '; transition:opacity .3s;',
      v2GSlugs: gSlugs,
      v2Riser: (C(st.riser) * 1000).toFixed(1) + ' 1000',
      v2VG: valve(st.vG), v2TG: tG,
      v2DropOn: st.drop > 0.02, v2DropX: f(dropPt[0]), v2DropY: f(dropPt[1] + 4 + 7 * C(st.drop)), v2DropR: f(1.8 + 3 * C(st.drop)),
      v2DropO: 'opacity:' + C(st.drop * 1.4).toFixed(2) + ';',
      v2GBubs: gb, v2Ripple: 'translate(0,' + ripple + ')',
      v2GlassTxt: gasOn ? 'GAS BUBBLING' : 'NO FLOW', v2GlassCol: gasOn ? '#46d39a' : 'var(--v2-lbl)',
      v2DimGas: dim('gas'),
      v2HaloVG: 'opacity:' + (st.gTxt !== 'CLOSED' ? .5 : 0) + '; transition:opacity .4s;',
      v2HaloVO: 'opacity:' + (st.oTxt !== 'CLOSED' ? .5 : 0) + '; transition:opacity .4s;',

      /* viscometer instrument (inclined, Single-Phase drawing) */
      v2DevT: gm.T, v2Bx0: gm.bx0, v2Bw: r1(gm.bx1 - gm.bx0), v2Bx1: gm.bx1,
      v2Hose1: gm.HOSE1, v2Hose2: gm.HOSE2, v2CabCoil: gm.CAB_COIL, v2CabPt100: gm.CAB_PT100, v2CabPt: gm.CAB_PT,
      v2Inl: gm.INL, v2Lch: gm.L.ch, v2Lbody: gm.L.body, v2Ldrive: gm.L.drive, v2Lsense: gm.L.sense, v2Lpt100: gm.L.pt100, v2Lpt: gm.L.pt,
      v2VL: gm.VL, v2VLTag: { x: gm.VL.x, y: r1(gm.VL.y + 8), tx: r1(gm.VL.x + 40), ty: r1(gm.VL.y + 21) },
      v2ClampT: 'translate(' + gm.CLAMP[0] + ',' + gm.CLAMP[1] + ') rotate(' + r1(-gm.th) + ')',
      v2Ang: gm.ANG, v2AngTxt: inclTxt,
      v2TickLbls: ARC_TICKS.filter(k => k.t === 0 || k.t === 90).map(k => ({ x: k.x, y: k.y, t: k.t + '°', st: 'opacity:' + (Math.abs(k.t - gm.th) < 12 || (k.t === 0 && gm.th < 78) ? 0 : 1) + ';' })),
      v2Incl: String(st.incl), v2InclTxt: inclTxt, v2InclDis: busy,
      v2InclTip: busy ? 'Inclination is locked while a step is running' : 'Demonstration only — tilts the viscometer about its fixed bottom hinge (0° vertical … 90° horizontal). Not used in the viscosity calculation.',
      v2InclIn: e => { if (this.state.busy) { e.target.value = this.state.incl; return; } this.setState({ incl: Math.max(INCL_MIN, Math.min(INCL_MAX, +e.target.value)) }); },
      v2InclRow: 'opacity:' + (busy ? .55 : 1) + ';',
      v2DimIn: dim('in'), v2DimTail: dim('tail'), v2DimVL: dim('vl'), v2DimCoil: dim('coil'), v2DimCtl: dim('ctl'), v2DimPdu: dim('pdu'),
      v2GlowIn: 'opacity:' + (st.flowIn ? 1 : 0) + '; transition:opacity .4s;', v2GlowTail: 'opacity:' + (st.flowTail ? 1 : 0) + '; transition:opacity .4s;',
      v2HaloCh: 'opacity:' + (st.drive || st.falling ? .5 : 0) + '; transition:opacity .4s;',
      v2HaloPT: 'opacity:' + (pvs === 'release' || pvs === 'settle' || pvs === 'filling' ? .55 : 0) + '; transition:opacity .4s;',
      v2HaloVL: 'opacity:' + (st.tTxt !== 'CLOSED' ? .55 : 0) + '; transition:opacity .4s;',

      /* oil line + chamber */
      v2DIn: gm.D_IN, v2CIn: gm.D_INX, v2DSt: D_ST, v2DTail: gm.D_TAIL,
      v2In: (fIn * 1000).toFixed(1) + ' 1000', v2St: (fSt * 1000).toFixed(1) + ' 1000', v2Tl: (fTl * 1000).toFixed(1) + ' 1000',
      v2InDash: 'opacity:' + (st.flowIn && fIn >= 1 ? 1 : 0) + '; transition:opacity .3s;',
      v2StDash: 'opacity:' + (upOn || st.flowTail ? 1 : 0) + '; transition:opacity .3s;',
      v2TlDash: 'opacity:' + (st.flowTail && fTl > 0 ? 1 : 0) + '; transition:opacity .3s;',
      v2TlSlow: st.flowIn ? '' : 'v2-slow',
      v2FrontOn: fIn > 0 && fIn < 1, v2Fx: f(front[0]), v2Fy: f(front[1]),
      v2FrontStOn: fSt > 0 && fSt < 1, v2Fsx: f(frontSt[0]), v2Fsy: f(frontSt[1]),
      v2FrontTlOn: fTl > 0 && fTl < 1, v2Ftx: f(frontTl[0]), v2Fty: f(frontTl[1]),
      v2TeeOn: st.vSt >= STUB_CC,
      v2Arrows: arrows,
      v2ChY: f(chLvl), v2ChH: f(fCh > 0 ? gm.low - chLvl + 6 : 0),
      v2ChMen: fCh > 0.01 && fCh < 0.99, v2ChMenY: f(chLvl),
      v2ChArrows: 'opacity:' + (upOn ? 1 : 0) + '; transition:opacity .4s;',
      v2ChLbl: chamberLbl, v2ChLblCol: st.vCh >= CHAMBER_CC ? '#46d39a' : st.vCh > 0 ? '#ffcf3f' : 'var(--v2-lbl)',
      v2BodyT: 'translate(0,' + f(st.body - B_REST) + ')',
      v2DriveGlow: 'opacity:' + (st.drive ? .4 : 0) + '; transition:opacity .35s;',
      v2SenseGlow: 'opacity:' + (st.sense ? .4 : 0) + '; transition:opacity .2s;',
      v2DriveTxt: st.drive ? 'ENERGIZED' : '', v2SenseTxt: st.falling ? (st.sense ? 'SIGNAL' : 'LISTENING') : '',
      v2LiveCoil: 'opacity:' + (st.showComp ? 0 : 1) + '; transition:opacity .3s;',
      v2CompStyle: 'opacity:' + (st.showComp ? 1 : 0) + '; transition:opacity .3s; pointer-events:none;',
      v2Comp: () => this.setState({ showComp: !this.state.showComp }), v2CompTxt: st.showComp ? 'Hide Components' : 'Show Components',
      v2CompBtn: st.showComp ? 'border-color:var(--blue); color:var(--blue);' : '',
      v2VO: valve(st.vO), v2TO: tO, v2VT: valve(st.vT), v2TT: tT,
      v2PtLcd: st.PV == null ? '----' : fmtP(st.PV), v2PtCol: st.PV == null ? '#6b7a90' : '#ff4a3a',
      v2CtlT: st.tRun != null ? st.tRun.toFixed(2) : (lastM0 ? lastM0.t.toFixed(2) : '--.--'),
      v2CtlMu: lastM0 && st.measuring < 0 ? lastM0.mu.toFixed(2) : '--.--',
      v2CtlState: st.drive ? 'LIFT' : st.falling ? 'TIMING' : st.measuring >= 0 ? 'WAIT' : (lastM0 ? 'DONE' : 'READY'),
      v2CtlCol: st.drive ? '#4d9dff' : st.falling ? '#46d39a' : '#9fe0a8',
      v2BathT: TEST_T.toFixed(1),
      v2XferLbl: 'Transferred ' + cc(st.xfer) + ' / ' + XFER_CC + ' cc',
      v2XferCol: st.flowIn ? '#ffcf3f' : st.xfer > 0 ? '#46d39a' : 'var(--v2-lbl)',
      v2WasteY: f(WASTE.y + WASTE.h - 4 - wasteH), v2WasteH: f(wasteH), v2WasteOn: st.waste > 0.05,
      v2WasteTxt: st.waste > 0.05 ? cc(st.waste) + ' cc' : 'empty', v2Drip: st.flowTail && fTl >= 1,

      /* right panel */
      v2PTxt: fmtP(st.P), v2PState: pState, v2PCol: pCol,
      v2Tgt: tgtTxt, v2PvTxt: st.PV == null ? dash : fmtP(st.PV), v2PvState: pvTxt, v2PtTxt: ptTxt, v2Temp: TEST_T.toFixed(1), v2Psat: fmtP(PSAT_G),
      v2TTxt: tTxt, v2TUnit: tTxt === dash ? '' : 's', v2MuTxt: muTxt, v2MuUnit: muTxt === dash || muTxt === '…' ? '' : 'cP',
      v2MeasTag: measTag, v2MeasCol: measCol, v2K: K_CAL.toFixed(2),
      v2Xt: xt, v2Yt: yt, v2GPts: gpts,
      v2GLine: sorted.map(r => gx(r.p).toFixed(1) + ',' + gy(r.mu).toFixed(1)).join(' '), v2GLineOn: n >= 2,
      v2CurOn: curP != null, v2CurX: curP == null ? '0' : curP.toFixed(1),
      v2GEmpty: n === 0, v2Rows: rows.filter((r, k) => k < n || (k === n && kM === k)),
      v2ResOn: resOn, v2ResCls: resOn ? 'v2-res' : '',
      v2PillG: pill('GAS OUTLET ' + st.gTxt, tG.color), v2PillO: pill('OIL LINE ' + st.oTxt, tO.color), v2PillT: pill('BLEED ' + st.tTxt, tT.color),

      v2Run: () => this.run(i), v2RunText: st.complete ? 'Test Complete ✓' : busy ? (g.k < NP && g.s === 1 ? 'Agitating A → B → A…' : STAGES[i].name + '…') : STAGES[i].btn, v2RunStyle: btnMain(canRun),
      v2Auto: () => this.runAll(), v2AutoText: st.auto && !st.complete ? 'Running Procedure…' : 'Run Full Procedure', v2AutoStyle: btnSub(canAuto, st.auto && !st.complete),
      v2Pause: () => this.togglePause(), v2PauseText: st.paused ? 'Resume' : 'Pause', v2PauseStyle: btnSub(canPause, st.paused),
      v2Prev: () => { if (i > 0) this.goStage(i - 1); }, v2PrevStyle: 'opacity:' + (i > 0 ? 1 : .4) + '; cursor:' + (i > 0 ? 'pointer' : 'default') + ';',
      v2Next: () => { if (i < NS - 1) this.goStage(i + 1); }, v2NextStyle: 'opacity:' + (i < NS - 1 ? 1 : .4) + '; cursor:' + (i < NS - 1 ? 'pointer' : 'default') + ';',
      v2Reset: () => this.reset()
    };
  }
}
function f(v) { return Number(v).toFixed(1); }
function chipStyle(on, dn) {
  return 'flex:1 1 0; min-width:0; display:flex; flex-direction:column; align-items:flex-start; text-align:left; font-family:inherit; padding:5px 8px; border-radius:9px; cursor:pointer; background:' +
    (on ? 'rgba(47,111,208,.12)' : dn ? 'rgba(29,138,90,.08)' : 'var(--panel)') + '; border:' + (on ? '2px solid var(--blue)' : '1px solid ' + (dn ? 'rgba(29,138,90,.35)' : 'var(--line)')) +
    '; box-shadow:' + (on ? '0 0 0 2px rgba(47,111,208,.15)' : 'none') + ';';
}

const LBL = "font-family:'IBM Plex Sans',sans-serif; font-size:12.5px; fill:var(--v2-lbl2);";
const SUB = "font-family:'IBM Plex Sans',sans-serif; font-size:10.5px; fill:var(--mut);";
const MONO = "font-family:'IBM Plex Mono',monospace;";
const LBLV = "font-family:'IBM Plex Sans',sans-serif; font-size:14px; font-weight:500; fill:var(--v2-lbl2);";
const ESS = "font-family:'IBM Plex Sans',sans-serif; font-size:20px; font-weight:600; fill:var(--txt);";
const FO = "margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1;";

/* valve symbol: horizontal pipe run (triangles point left/right) or vertical run (triangles point up/down) */
function valveSvg(x, y, vert, key, label, lx, ly, anchor) {
  const tri = vert
    ? `<path d="M${x - 12} ${y - 12} L${x + 12} ${y - 12} L${x} ${y} Z" fill="url(#v2Cyl)" stroke="#0a0e16" stroke-width="1.2"></path>
       <path d="M${x - 12} ${y + 12} L${x + 12} ${y + 12} L${x} ${y} Z" fill="url(#v2Cyl)" stroke="#0a0e16" stroke-width="1.2"></path>
       <g style="{{ ${key}.hot }}"><path d="M${x - 12} ${y - 12} L${x + 12} ${y - 12} L${x} ${y} Z" fill="#46d39a"></path><path d="M${x - 12} ${y + 12} L${x + 12} ${y + 12} L${x} ${y} Z" fill="#46d39a"></path></g>
       <line x1="${x + 12}" y1="${y}" x2="${x + 17}" y2="${y}" stroke="#8fa3c2" stroke-width="2.4"></line>
       <circle cx="${x + 24}" cy="${y}" r="7" fill="#0c1626" stroke="#8fa3c2" stroke-width="2"></circle>
       <g stroke="#8fa3c2" stroke-width="1.5" stroke-linecap="round" style="{{ ${key}.wheel }}"><line x1="${x + 17}" y1="${y}" x2="${x + 31}" y2="${y}"></line><line x1="${x + 24}" y1="${y - 7}" x2="${x + 24}" y2="${y + 7}"></line></g>`
    : `<path d="M${x - 12} ${y - 12} L${x - 12} ${y + 12} L${x} ${y} Z" fill="url(#v2Cyl)" stroke="#0a0e16" stroke-width="1.2"></path>
       <path d="M${x + 12} ${y - 12} L${x + 12} ${y + 12} L${x} ${y} Z" fill="url(#v2Cyl)" stroke="#0a0e16" stroke-width="1.2"></path>
       <g style="{{ ${key}.hot }}"><path d="M${x - 12} ${y - 12} L${x - 12} ${y + 12} L${x} ${y} Z" fill="#46d39a"></path><path d="M${x + 12} ${y - 12} L${x + 12} ${y + 12} L${x} ${y} Z" fill="#46d39a"></path></g>
       <line x1="${x}" y1="${y - 12}" x2="${x}" y2="${y - 17}" stroke="#8fa3c2" stroke-width="2.4"></line>
       <circle cx="${x}" cy="${y - 24}" r="7" fill="#0c1626" stroke="#8fa3c2" stroke-width="2"></circle>
       <g stroke="#8fa3c2" stroke-width="1.5" stroke-linecap="round" style="{{ ${key}.wheel }}"><line x1="${x - 7}" y1="${y - 24}" x2="${x + 7}" y2="${y - 24}"></line><line x1="${x}" y1="${y - 31}" x2="${x}" y2="${y - 17}"></line></g>`;
  const tk = key.replace('v2V', 'v2T');
  return tri + `
       <text x="${lx}" y="${ly}" text-anchor="${anchor}" style="font-family:'IBM Plex Sans',sans-serif; font-size:15px; font-weight:600; fill:var(--accb3);">${label}</text>
       <rect x="${anchor === 'end' ? lx - 76 : anchor === 'middle' ? lx - 38 : lx}" y="${ly + 6}" width="76" height="17" rx="4" fill="{{ ${tk}.fill }}" stroke="{{ ${tk}.stroke }}"></rect>
       <text x="${anchor === 'end' ? lx - 38 : anchor === 'middle' ? lx : lx + 38}" y="${ly + 18.5}" text-anchor="middle" style="${MONO} font-size:10px; font-weight:700; letter-spacing:.6px; fill:{{ ${tk}.color }};">{{ ${tk}.text }}</text>`;
}

DC.define('StageViscTwo', {
  style: `
  .v2-root { --v2-win:#0b1320; --v2-grp:rgba(255,255,255,.028); --v2-lbl:rgba(170,195,225,.75); --v2-lbl2:#c3d2e6; --v2-bore:#0a1420; --v2-ghost:rgba(150,180,215,.35); --v2-lead:rgba(150,180,215,.45); --v2-grid:rgba(150,180,215,.14); --v2-ax:rgba(150,180,215,.55); }
  html[data-theme="light"] .v2-root { --v2-win:#16233a; --v2-grp:rgba(20,40,70,.04); --v2-lbl:rgba(38,56,80,.72); --v2-lbl2:#2b3a4f; --v2-bore:#0f1b2b; --v2-ghost:rgba(38,56,80,.35); --v2-lead:rgba(38,56,80,.4); --v2-grid:rgba(38,56,80,.10); --v2-ax:rgba(38,56,80,.5); }
  @keyframes v2Blink { 0%,100% { opacity:1; } 50% { opacity:.3; } }
  @keyframes v2Dash { to { stroke-dashoffset:-24; } }
  @keyframes v2Up { from { transform:translateY(14px); opacity:0; } 30% { opacity:1; } 70% { opacity:1; } to { transform:translateY(-14px); opacity:0; } }
  @keyframes v2Ring { 0% { r:4; opacity:.9; } 100% { r:13; opacity:0; } }
  .v2-flow { animation:v2Dash calc(.9s * var(--pm,1)) linear infinite; }
  .v2-slow .v2-flow, .v2-flow.v2-slow { animation-duration:calc(2.6s * var(--pm,1)); }
  .v2-up path { animation:v2Up calc(1.6s * var(--pm,1)) linear infinite; }
  .v2-ring { animation:v2Ring 1.2s ease-out infinite; }
  @keyframes v2Drip { from { transform:translateY(0); opacity:1; } to { transform:translateY(40px); opacity:0; } }
  .v2-drip { animation:v2Drip calc(.9s * var(--pm,1)) ease-in infinite; }
  .v2-paused .v2-drip { animation-play-state:paused; }
  .v2-halo text { paint-order:stroke; stroke:var(--panel2); stroke-width:4px; stroke-linejoin:round; }
  @media (max-width:1400px) { .v2-demo { display:none; } }
  .v2-paused .v2-flow, .v2-paused .v2-up path, .v2-paused .v2-ring { animation-play-state:paused; }
  .v2-root:not(.v2-res) .v2-side { flex-basis:clamp(262px,18vw,290px) !important; }
  .v2-root.v2-res .v2-side { flex-basis:clamp(300px,23vw,380px) !important; }
  @media (max-height:900px) { .v2-root.v2-res .v2-pills { display:none !important; } }
  @media (max-height:820px) {
    .v2-side { gap:5px !important; padding:7px 10px !important; }
    .v2-side > div:not(.v2-hdr) { padding:6px 10px !important; }
    .v2-side .v2-hdr { display:none; }
    .v2-side .v2-big { font-size:20px !important; }
  }
  `,
  template: `<div class="v2-root {{ v2Anim }} {{ v2ResCls }}" data-screen-label="Two-Phase Viscosity Test" style="flex:1 1 auto; min-height:0; width:100%; display:flex; flex-direction:column; gap:6px; text-align:left;">

  <!-- point chips (6 pressures + results) -->
  <div style="flex:0 0 auto; display:flex; gap:5px;">
    <sc-for list="{{ v2Stages }}" as="s" hint-placeholder-count="7">
      <button onclick="{{ s.onClick }}" style="{{ s.style }}">
        <span style="font-size:11px; font-weight:600; color:var(--txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;"><span style="color:var(--mut2); font-family:'IBM Plex Mono',monospace; font-size:10px; margin-right:4px;">{{ s.n }}</span>{{ s.name }}</span>
        <span style="font-family:'IBM Plex Mono',monospace; font-size:8.5px; letter-spacing:.5px; text-transform:uppercase; color:{{ s.tagColor }}; margin-top:1px;">{{ s.tag }}</span>
      </button>
    </sc-for>
  </div>
  <!-- sub-steps of the current point -->
  <div style="flex:0 0 auto; display:flex; gap:4px;">
    <sc-for list="{{ v2Subs }}" as="u" hint-placeholder-count="6">
      <button onclick="{{ u.onClick }}" style="{{ u.style }}"><span style="{{ u.dot }}"></span><span style="font-family:'IBM Plex Mono',monospace; opacity:.7;">{{ u.n }}</span><span style="overflow:hidden; text-overflow:ellipsis;">{{ u.name }}</span></button>
    </sc-for>
  </div>

  <div style="flex:1 1 auto; min-height:0; display:flex; gap:10px;">

    <!-- ============ schematic ============ -->
    <div style="flex:1 1 auto; min-width:0; display:flex; flex-direction:column; border:1px solid var(--line); border-radius:12px; background:var(--panel2); overflow:hidden;">
      <div style="flex:0 0 auto; display:flex; align-items:center; gap:9px; padding:7px 12px; border-bottom:1px solid var(--line);">
        <span style="{{ v2MsgDot }}"></span>
        <span style="flex:1 1 auto; min-width:0; font-size:12.5px; font-weight:500; color:{{ v2MsgCol }};">{{ v2Msg }}</span>
        <span style="flex:0 0 auto; font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.8px; font-weight:600; color:var(--mut); padding:2px 8px; border:1px solid var(--line2); border-radius:6px; background:var(--chipbg);">{{ v2StepTag }}</span>
      </div>
      <svg sc-camel-view-box="${VB}" preserveAspectRatio="xMidYMid meet" style="flex:1 1 auto; min-height:0; width:100%; height:100%; display:block; padding:4px 6px; box-sizing:border-box;">
        <defs>
          <linearGradient id="v2Metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"></stop><stop offset=".42" stop-color="#b3c1d8"></stop><stop offset=".58" stop-color="#7e90b0"></stop><stop offset="1" stop-color="#1f2a3e"></stop></linearGradient>
          <linearGradient id="v2Cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>
          <linearGradient id="v2SS" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6d7b92"></stop><stop offset=".18" stop-color="#b9c5d6"></stop><stop offset=".42" stop-color="#e9eef5"></stop><stop offset=".62" stop-color="#c3cddb"></stop><stop offset=".85" stop-color="#dfe6ef"></stop><stop offset="1" stop-color="#76849a"></stop></linearGradient>
          <linearGradient id="v2Collar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d6b82"></stop><stop offset=".35" stop-color="#aab6c8"></stop><stop offset=".6" stop-color="#8d9ab0"></stop><stop offset="1" stop-color="#56637a"></stop></linearGradient>
          <linearGradient id="v2Rail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b3342"></stop><stop offset=".35" stop-color="#5d6a80"></stop><stop offset=".6" stop-color="#46526a"></stop><stop offset="1" stop-color="#232a36"></stop></linearGradient>
          <linearGradient id="v2OilC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6b03c"></stop><stop offset="1" stop-color="#b08a22"></stop></linearGradient>
          <linearGradient id="v2Gas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fe3b4" stop-opacity=".34"></stop><stop offset="1" stop-color="#3fbf8c" stop-opacity=".62"></stop></linearGradient>
          <linearGradient id="v2Water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa6d8" stop-opacity=".55"></stop><stop offset="1" stop-color="#2f6f9c" stop-opacity=".75"></stop></linearGradient>
          <pattern id="v2Oil" width="9" height="9" sc-camel-pattern-units="userSpaceOnUse"><rect width="9" height="9" fill="#c7a233"></rect><circle cx="4.5" cy="4.5" r="1.15" fill="#f2d879" opacity=".7"></circle></pattern>
          <pattern id="v2Diss" width="13" height="13" sc-camel-pattern-units="userSpaceOnUse"><circle cx="3" cy="4" r=".8" fill="#eafff4"></circle><circle cx="9.5" cy="8.5" r=".65" fill="#eafff4"></circle><circle cx="6" cy="11.5" r=".5" fill="#eafff4"></circle><circle cx="11.5" cy="2" r=".55" fill="#eafff4"></circle></pattern>
          <pattern id="v2Hatch" width="7" height="7" sc-camel-pattern-units="userSpaceOnUse" sc-camel-pattern-transform="rotate(45)"><rect width="7" height="7" fill="#5f6f88"></rect><line x1="0" y1="0" x2="0" y2="7" stroke="#8595ad" stroke-width="2"></line></pattern>
          <clipPath id="v2BClip"><rect x="848" y="219" width="36" height="182" rx="3"></rect></clipPath>
          <clipPath id="v2AClip"><rect x="1012" y="219" width="36" height="182" rx="3"></rect></clipPath>
          <clipPath id="v2BoreClip"><rect x="608" y="222" width="24" height="250" rx="4"></rect></clipPath>
          <clipPath id="v2BoreClipW"><rect x="608" y="222" width="24" height="250" rx="4" transform="{{ v2DevT }}"></rect></clipPath>
          <clipPath id="v2GlassClip"><path d="M${GLASS.x + 2} ${GLASS.y} L${GLASS.x + 7} ${GLASS.y + GLASS.h - 4} Q${GLASS.x + 7} ${GLASS.y + GLASS.h} ${GLASS.x + 11} ${GLASS.y + GLASS.h} L${GLASS.x + GLASS.w - 11} ${GLASS.y + GLASS.h} Q${GLASS.x + GLASS.w - 7} ${GLASS.y + GLASS.h} ${GLASS.x + GLASS.w - 7} ${GLASS.y + GLASS.h - 4} L${GLASS.x + GLASS.w - 2} ${GLASS.y} Z"></path></clipPath>
          <clipPath id="v2WasteClip"><path d="M${WASTE.x + 3},${WASTE.y} V${WASTE.y + WASTE.h - 7} Q${WASTE.x + 3},${WASTE.y + WASTE.h - 2} ${WASTE.x + 9},${WASTE.y + WASTE.h - 2} H${WASTE.x + WASTE.w - 9} Q${WASTE.x + WASTE.w - 3},${WASTE.y + WASTE.h - 2} ${WASTE.x + WASTE.w - 3},${WASTE.y + WASTE.h - 7} V${WASTE.y} Z"></path></clipPath>
        </defs>

        <rect x="${GRP.x}" y="${GRP.y}" width="${GRP.w}" height="${GRP.h}" rx="12" fill="var(--v2-grp)"></rect>

        <!-- ================= VISCOMETER BENCH (identical drawing to StageViscSingle.js) ================= -->
        <!-- hoses + signal cables (behind the stand) -->
        <g fill="none" stroke-linecap="round">
          <path d="{{ v2Hose1 }}" stroke="#0a0e16" stroke-width="8"></path><path d="{{ v2Hose2 }}" stroke="#0a0e16" stroke-width="8"></path>
          <path d="{{ v2Hose1 }}" stroke="#2a3446" stroke-width="4.8" stroke-dasharray="2 2.4"></path><path d="{{ v2Hose2 }}" stroke="#2a3446" stroke-width="4.8" stroke-dasharray="2 2.4"></path>
        </g>
        <g fill="none" stroke="#5fb0ff" stroke-width="1.4" stroke-dasharray="1 6" stroke-linecap="round">
          <path d="{{ v2CabCoil }}" style="{{ v2DimCtl }}"></path>
          <path d="{{ v2CabPt100 }}" style="{{ v2DimCtl }}"></path>
          <path d="{{ v2CabPt }}" style="{{ v2DimPdu }}"></path>
        </g>
        <!-- stationary stand: base plate, quadrant guide (0–90°), hinge bracket -->
        <g>
          <ellipse cx="${(BASE_X0 + BASE_X1) / 2}" cy="${BASE_Y + 19}" rx="${(BASE_X1 - BASE_X0) / 2}" ry="4.5" fill="rgba(0,0,0,.26)"></ellipse>
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
          <rect x="${ARC_P1[0] - 5}" y="${ARC_P1[1]}" width="10" height="${r1(BASE_Y - ARC_P1[1])}" rx="2" fill="url(#v2SS)" stroke="rgba(10,14,22,.55)" stroke-width=".8"></rect>
          <rect x="${BASE_X0}" y="${BASE_Y}" width="${BASE_X1 - BASE_X0}" height="14" rx="4" fill="#1b1f26" stroke="rgba(0,0,0,.6)"></rect>
          <line x1="${BASE_X0 + 4}" y1="${BASE_Y + 1.2}" x2="${BASE_X1 - 4}" y2="${BASE_Y + 1.2}" stroke="#eef4fb" stroke-width=".8" opacity=".16"></line>
          <rect x="${BASE_X0 + 10}" y="${BASE_Y + 14}" width="16" height="5" rx="1.5" fill="#0e1116"></rect>
          <rect x="${BASE_X1 - 26}" y="${BASE_Y + 14}" width="16" height="5" rx="1.5" fill="#0e1116"></rect>
          <path d="M${PIV[0] - 24},${BASE_Y} L${PIV[0] - 14},${PIV[1] + 2} A14,14 0 0 1 ${PIV[0] + 14},${PIV[1] + 2} L${PIV[0] + 24},${BASE_Y} Z" fill="url(#v2SS)" stroke="rgba(10,14,22,.6)" stroke-width=".9"></path>
          <line x1="${PIV[0] - 16}" y1="${BASE_Y - 6}" x2="${PIV[0] + 16}" y2="${BASE_Y - 6}" stroke="rgba(10,14,22,.35)" stroke-width="1"></line>
        </g>
        <!-- thermostat bath (shelf) -->
        <g>
          <ellipse cx="${BATH.x + BATH.w / 2}" cy="${BATH.y + BATH.h + 3}" rx="${BATH.w / 2 + 4}" ry="4" fill="rgba(0,0,0,.3)"></ellipse>
          <rect x="${BATH.x}" y="${BATH.y + 40}" width="${BATH.w}" height="${BATH.h - 40}" rx="6" fill="url(#v2Cyl)" stroke="#0a0e16" stroke-width="1.2"></rect>
          <g stroke="#0a0e16" stroke-width="1.3" opacity=".45">
            <line x1="${BATH.x + 16}" y1="${BATH.y + BATH.h - 26}" x2="${BATH.x + BATH.w - 16}" y2="${BATH.y + BATH.h - 26}"></line>
            <line x1="${BATH.x + 16}" y1="${BATH.y + BATH.h - 18}" x2="${BATH.x + BATH.w - 16}" y2="${BATH.y + BATH.h - 18}"></line>
            <line x1="${BATH.x + 16}" y1="${BATH.y + BATH.h - 10}" x2="${BATH.x + BATH.w - 16}" y2="${BATH.y + BATH.h - 10}"></line>
          </g>
          <rect x="${BATH.x + 7}" y="${BATH.y}" width="${BATH.w - 14}" height="44" rx="5" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="1.1"></rect>
          <rect x="${BATH.x + 15}" y="${BATH.y + 9}" width="56" height="20" rx="2" fill="#06101e" stroke="#1d3350"></rect>
          <text x="${BATH.x + 66}" y="${BATH.y + 24}" text-anchor="end" style="${MONO} font-size:12.5px; font-weight:700; fill:#ff6a4a;">{{ v2BathT }}</text>
          <text x="${BATH.x + 74}" y="${BATH.y + 23}" style="${MONO} font-size:8px; fill:#0a0e16;">°C</text>
          <circle cx="${BATH.x + BATH.w - 22}" cy="${BATH.y + 20}" r="8" fill="url(#v2Metal)" stroke="#0a0e16"></circle>
          <circle cx="${BATH.x + BATH.w - 22}" cy="${BATH.y + 36}" r="2.6" fill="#46d39a"></circle>
          <g fill="url(#v2Metal)" stroke="#0a0e16" stroke-width=".7"><rect x="${BATH.x - 4}" y="${BATH.y + 50}" width="6" height="8" rx="1"></rect><rect x="${BATH.x - 4}" y="${BATH.y + 66}" width="6" height="8" rx="1"></rect></g>
        </g>
        <!-- instrument (rotates about the bottom hinge as one assembly) -->
        <g transform="{{ v2DevT }}">
          <rect x="566" y="190" width="24" height="416" rx="6" fill="url(#v2Rail)" stroke="rgba(10,14,22,.7)" stroke-width="1"></rect>
          <line x1="570" y1="196" x2="570" y2="600" stroke="#eef4fb" stroke-width="1.2" opacity=".22"></line>
          <circle cx="578" cy="596" r="17" fill="url(#v2SS)" stroke="rgba(10,14,22,.65)" stroke-width="1"></circle>
          <circle cx="578" cy="596" r="11" fill="none" stroke="rgba(10,14,22,.3)" stroke-width="1"></circle>
          <circle cx="578" cy="200" r="11" fill="url(#v2SS)" stroke="rgba(10,14,22,.65)" stroke-width="1"></circle>
          <g fill="url(#v2Collar)" stroke="rgba(10,14,22,.6)" stroke-width=".8"><rect x="584" y="236" width="10" height="16" rx="2"></rect><rect x="584" y="470" width="10" height="16" rx="2"></rect></g>
          <rect x="590" y="184" width="62" height="326" rx="12" fill="url(#v2SS)" stroke="rgba(10,14,22,.65)" stroke-width="1"></rect>
          <rect x="595" y="192" width="5" height="310" rx="2" fill="#ffffff" opacity=".3"></rect>
          <g style="{{ v2DimCoil }}">
            <rect x="585" y="226" width="72" height="92" rx="6" fill="url(#v2Collar)" stroke="rgba(10,14,22,.6)" stroke-width=".9"></rect>
            <rect x="585" y="338" width="72" height="92" rx="6" fill="url(#v2Collar)" stroke="rgba(10,14,22,.6)" stroke-width=".9"></rect>
            <g stroke="rgba(10,14,22,.3)" stroke-width="1"><line x1="587" y1="236" x2="655" y2="236"></line><line x1="587" y1="308" x2="655" y2="308"></line><line x1="587" y1="348" x2="655" y2="348"></line><line x1="587" y1="420" x2="655" y2="420"></line></g>
            <rect x="585" y="226" width="72" height="92" rx="6" fill="#4d9dff" style="{{ v2DriveGlow }}"></rect>
            <rect x="585" y="338" width="72" height="92" rx="6" fill="#46d39a" style="{{ v2SenseGlow }}"></rect>
          </g>
          <rect x="596" y="158" width="50" height="28" rx="4" fill="url(#v2Collar)" stroke="rgba(10,14,22,.65)" stroke-width="1"></rect>
          <g stroke="rgba(10,14,22,.35)" stroke-width="1"><line x1="609" y1="160" x2="609" y2="184"></line><line x1="633" y1="160" x2="633" y2="184"></line></g>
          <rect x="610" y="146" width="20" height="13" rx="2" fill="url(#v2SS)" stroke="rgba(10,14,22,.65)" stroke-width=".9"></rect>
          <rect x="596" y="508" width="50" height="28" rx="4" fill="url(#v2Collar)" stroke="rgba(10,14,22,.65)" stroke-width="1"></rect>
          <g stroke="rgba(10,14,22,.35)" stroke-width="1"><line x1="609" y1="510" x2="609" y2="534"></line><line x1="633" y1="510" x2="633" y2="534"></line></g>
          <rect x="604" y="536" width="32" height="44" rx="4" fill="url(#v2SS)" stroke="rgba(10,14,22,.65)" stroke-width="1"></rect>
          <rect x="612" y="580" width="16" height="20" rx="2.5" fill="url(#v2SS)" stroke="rgba(10,14,22,.65)" stroke-width=".9"></rect>
          <g fill="url(#v2SS)" stroke="rgba(10,14,22,.6)" stroke-width=".8"><rect x="650" y="470" width="14" height="10" rx="2"></rect><rect x="650" y="486" width="14" height="10" rx="2"></rect></g>
          <rect x="651" y="322" width="13" height="12" rx="2" fill="#2a3240"></rect>
          <g style="{{ v2DimCtl }}"><rect x="651" y="442" width="16" height="14" rx="2" fill="#2a3240"></rect></g>
          <rect x="599" y="212" width="42" height="274" rx="7" fill="var(--v2-win)" stroke="#0a0e16" stroke-width="1.1"></rect>
          <rect x="600.5" y="214" width="7.5" height="270" fill="url(#v2Hatch)"></rect>
          <rect x="632" y="214" width="7.5" height="270" fill="url(#v2Hatch)"></rect>
          <g style="{{ v2DimCtl }}"><rect x="632" y="446" width="9" height="6" rx="1" fill="url(#v2Metal)"></rect></g>
          <rect x="616" y="148" width="8" height="76" fill="var(--v2-bore)"></rect>
          <rect x="624" y="186" width="28" height="6" fill="var(--v2-bore)"></rect>
          <rect x="616" y="470" width="8" height="114" fill="var(--v2-bore)"></rect>
          <rect x="608" y="222" width="24" height="250" rx="4" fill="var(--v2-bore)" stroke="#33445e"></rect>
          <rect x="601" y="215" width="38" height="264" rx="8" fill="none" stroke="#4d9dff" stroke-width="3" style="{{ v2HaloCh }}"></rect>
        </g>

        <!-- ================= gas outlet line: Pump A side fitting -> gas valve -> water glass (tube end submerged) ================= -->
        <g style="{{ v2DimGas }}" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="{{ v2DG }}" stroke="#7fe3b4" stroke-width="15" opacity=".14" style="{{ v2GasDash }}"></path>
          <path d="${D_GT}" stroke="#12382c" stroke-width="8"></path>
          <path d="${D_GT}" stroke="#86a4a0" stroke-width="4"></path>
        </g>
        <!-- ================= oil transfer tubing: cell left side -> transfer valve -> riser -> viscometer bottom inlet ================= -->
        <g style="{{ v2DimIn }}" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="{{ v2CIn }}" stroke="#ffcf3f" stroke-width="15" opacity=".15" style="{{ v2GlowIn }}"></path>
          <path d="{{ v2CIn }}" stroke="#0a0e16" stroke-width="8"></path>
          <path d="{{ v2CIn }}" stroke="#7e90b0" stroke-width="4"></path>
        </g>
        <!-- ================= bleed line: viscometer top outlet -> waste glass ================= -->
        <g style="{{ v2DimTail }}" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="{{ v2DTail }}" stroke="#ffcf3f" stroke-width="15" opacity=".15" style="{{ v2GlowTail }}"></path>
          <path d="{{ v2DTail }}" stroke="#0a0e16" stroke-width="8"></path>
          <path d="{{ v2DTail }}" stroke="#7e90b0" stroke-width="4"></path>
          <path d="{{ v2DTail }}" stroke="#d6b03c" stroke-width="2.6" stroke-linecap="butt" sc-camel-path-length="1000" stroke-dasharray="{{ v2Tl }}"></path>
          <g class="{{ v2TlSlow }}"><path class="v2-flow" d="{{ v2DTail }}" stroke="#fff2c0" stroke-width="2" stroke-dasharray="2 10" style="{{ v2TlDash }}"></path></g>
        </g>

        <!-- ================= dual-cylinder PVT cell (DL drawing, placed RIGHT of the viscometer) ================= -->
        <g transform="{{ v2CellTr }}">
          <text x="948" y="132" text-anchor="middle" style="font-family:'IBM Plex Sans',sans-serif; font-size:18px; font-weight:700; fill:var(--txt);">PVT Cell</text>
          <rect x="806" y="150" width="284" height="12" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="806" y="454" width="284" height="12" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="806" y="150" width="12" height="316" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="1078" y="150" width="12" height="316" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <line x1="822" y1="190" x2="1030" y2="190" stroke="#0a0e16" stroke-width="6" stroke-linecap="round"></line>
          <line x1="822" y1="190" x2="1030" y2="190" stroke="#9fb0c8" stroke-width="3.4" stroke-linecap="round"></line>
          <circle cx="822" cy="190" r="4.5" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="0.8"></circle>
          <line x1="866" y1="190" x2="866" y2="215" stroke="#9fb0c8" stroke-width="3"></line>
          <line x1="948" y1="190" x2="948" y2="212" stroke="#9fb0c8" stroke-width="3"></line>
          <line x1="1030" y1="190" x2="1030" y2="215" stroke="#9fb0c8" stroke-width="3"></line>
          <text x="920" y="182" text-anchor="middle" style="${MONO} font-size:10px; letter-spacing:.5px; fill:var(--cap2);">SAMPLE MANIFOLD</text>

          <!-- Pump B : empty at rest (piston at the top); receives the whole sample during agitation (A -> B -> A) -->
          <rect x="838" y="206" width="56" height="12" rx="2" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="846" y="215" width="40" height="190" rx="4" fill="url(#v2Cyl)" stroke="#0a0e16" stroke-width="1.2"></rect>
          <g clip-path="url(#v2BClip)">
            <rect x="848" y="219" width="36" height="182" fill="#0a1420"></rect>
            <rect x="848" y="219" width="36" height="{{ v2GasHB }}" fill="url(#v2Gas)"></rect>
            <rect x="848" y="{{ v2LiqYB }}" width="36" height="{{ v2LiqHB }}" fill="url(#v2Oil)"></rect>
            <sc-if value="{{ v2IfOnB }}" hint-placeholder-val="{{ false }}"><rect x="848" y="{{ v2IfYB }}" width="36" height="1.4" fill="#eafff4"></rect></sc-if>
            <sc-for list="{{ v2BubsB }}" as="b" hint-placeholder-count="16">
              <circle cx="{{ b.x }}" cy="{{ b.y }}" r="{{ b.r }}" fill="#bff3da" opacity="{{ b.o }}"></circle>
            </sc-for>
            <rect x="848" y="{{ v2PistYB }}" width="36" height="9" rx="1.5" fill="url(#v2Metal)" stroke="#05080f" stroke-width="1.1"></rect>
          </g>
          <line x1="856" y1="222" x2="856" y2="398" stroke="#eef4fb" stroke-width="1.2" opacity=".3"></line>
          <rect x="838" y="405" width="56" height="14" rx="2" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <foreignObject x="790" y="470" width="152" height="18"><div style="${FO} font-family:'IBM Plex Sans',sans-serif; font-size:12.5px; color:var(--txt2);">Pump B &#183;&#160;<span style="font-family:'IBM Plex Mono',monospace; font-weight:600; color:var(--amb);">{{ v2PumpB }}</span></div></foreignObject>

          <!-- pressure sensor + live readouts -->
          <rect x="942" y="210" width="12" height="11" rx="1.5" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <circle cx="948" cy="240" r="20" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="1.3"></circle>
          <circle cx="948" cy="240" r="14.5" fill="#0c1626" stroke="#2a3852" stroke-width="1"></circle>
          <line x1="948" y1="240" x2="{{ v2NeedleX }}" y2="{{ v2NeedleY }}" stroke="#46e0ff" stroke-width="1.8" stroke-linecap="round"></line>
          <circle cx="948" cy="240" r="2.4" fill="#8fa3c2"></circle>
          <circle cx="948" cy="240" r="23.5" fill="none" stroke="#46e0ff" stroke-width="1.6" style="{{ v2SensorPulse }}"></circle>
          <text x="948" y="282" text-anchor="middle" style="${MONO} font-size:10px; letter-spacing:.5px; fill:var(--mut);">CELL PRESSURE</text>
          <rect x="902" y="288" width="92" height="22" rx="4" fill="#0a1420" stroke="#3a9d63" stroke-width="1.2"></rect>
          <foreignObject x="902" y="290" width="92" height="18"><div style="${FO} font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:600; color:#46d39a;">{{ v2P }}</div></foreignObject>
          <text x="948" y="330" text-anchor="middle" style="${MONO} font-size:10px; letter-spacing:.5px; fill:var(--mut);">CELL VOLUME</text>
          <rect x="902" y="336" width="92" height="22" rx="4" fill="#0a1420" stroke="#8a6a20" stroke-width="1.2"></rect>
          <foreignObject x="902" y="338" width="92" height="18"><div style="${FO} font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:600; color:#e7b15a;">{{ v2V }}</div></foreignObject>
          <text x="948" y="380" text-anchor="middle" style="${MONO} font-size:9px; letter-spacing:.5px; font-weight:700; fill:{{ v2PumpCol }};">{{ v2PumpTxt }}</text>

          <!-- Pump A : gas cap on top, oil below, piston beneath -->
          <rect x="1002" y="206" width="56" height="12" rx="2" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="1010" y="215" width="40" height="190" rx="4" fill="url(#v2Cyl)" stroke="#0a0e16" stroke-width="1.2"></rect>
          <g clip-path="url(#v2AClip)">
            <rect x="1012" y="219" width="36" height="182" fill="#0a1420"></rect>
            <rect x="1012" y="219" width="36" height="{{ v2GasH }}" fill="url(#v2Gas)"></rect>
            <rect x="1012" y="{{ v2LiqY }}" width="36" height="{{ v2LiqH }}" fill="url(#v2Oil)"></rect>
            <rect x="1012" y="{{ v2LiqY }}" width="36" height="{{ v2LiqH }}" fill="url(#v2Diss)" style="{{ v2DissStyle }}"></rect>
            <sc-if value="{{ v2IfOn }}" hint-placeholder-val="{{ false }}"><rect x="1012" y="{{ v2IfY }}" width="36" height="1.4" fill="#eafff4"></rect></sc-if>
            <sc-for list="{{ v2Bubs }}" as="b" hint-placeholder-count="16">
              <circle cx="{{ b.x }}" cy="{{ b.y }}" r="{{ b.r }}" fill="#bff3da" opacity="{{ b.o }}"></circle>
            </sc-for>
            <rect x="1012" y="{{ v2PistY }}" width="36" height="9" rx="1.5" fill="url(#v2Metal)" stroke="#05080f" stroke-width="1.1"></rect>
          </g>
          <line x1="1020" y1="222" x2="1020" y2="398" stroke="#eef4fb" stroke-width="1.2" opacity=".3"></line>
          <rect x="1002" y="405" width="56" height="14" rx="2" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <!-- GAS OUTLET: sample manifold continues RIGHT from the Pump A tee, out through the frame -->
          <line x1="1030" y1="190" x2="1090" y2="190" stroke="#0a0e16" stroke-width="6" stroke-linecap="round"></line>
          <line x1="1030" y1="190" x2="1090" y2="190" stroke="#9fb0c8" stroke-width="3.4" stroke-linecap="round"></line>
          <circle cx="1030" cy="190" r="4" fill="url(#v2Metal)" stroke="#0a0e16" stroke-width=".8"></circle>
          <foreignObject x="952" y="470" width="156" height="18"><div style="${FO} font-family:'IBM Plex Sans',sans-serif; font-size:12.5px; color:var(--txt2);">Pump A &#183;&#160;<span style="font-family:'IBM Plex Mono',monospace; font-weight:600; color:var(--amb);">{{ v2PumpA }}</span></div></foreignObject>
          <foreignObject x="798" y="494" width="300" height="16"><div style="${FO} font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.6px; color:{{ v2PhaseCol }};">{{ v2PhaseTxt }}</div></foreignObject>
          <text x="948" y="528" text-anchor="middle" style="${MONO} font-size:11px; letter-spacing:.9px; fill:var(--cap2);">DUAL-CYLINDER PVT CELL</text>
        </g>


        <!-- oil in the transfer route (drawn over the cell: Pump A -> manifold -> line -> inlet) -->
        <g style="{{ v2DimIn }}" fill="none">
          <path d="{{ v2DIn }}" stroke="#d6b03c" stroke-width="2.8" stroke-linecap="butt" stroke-linejoin="round" sc-camel-path-length="1000" stroke-dasharray="{{ v2In }}"></path>
          <path class="v2-flow" d="{{ v2DIn }}" stroke="#fff2c0" stroke-width="2" stroke-dasharray="2 10" style="{{ v2InDash }}"></path>
        </g>
        <g transform="{{ v2CellTr }}">
          <!-- agitation: sample moving through the manifold between the pumps (PV test drawing) -->
          <path d="{{ v2AgRoute }}" fill="none" stroke="#d6b03c" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="{{ v2AgDash }}" style="{{ v2AgBandOn }}"></path>
          <sc-for list="{{ v2AgSpecks }}" as="q" hint-placeholder-count="7">
            <circle cx="{{ q.x }}" cy="{{ q.y }}" r="{{ q.r }}" fill="{{ q.fill }}" opacity="{{ q.o }}"></circle>
          </sc-for>
          <circle cx="{{ v2AgSx }}" cy="{{ v2AgSy }}" r="3.6" fill="#ffcf3f" stroke="#fff6d6" stroke-width=".8" style="{{ v2AgSlug }}"></circle>
          <path d="{{ v2AgArrow }}" fill="#ffcf3f" stroke="#0a0e16" stroke-width=".8" style="{{ v2AgArrowOn }}"></path>
        </g>
        <!-- gas travelling in the gas line; oil front after the gas cap (only up to the valve outlet) -->
        <path class="v2-flow" d="{{ v2DG }}" fill="none" stroke="#dffbee" stroke-width="2.2" stroke-dasharray="3 7" style="{{ v2GasDash }}"></path>
        <sc-for list="{{ v2GSlugs }}" as="q" hint-placeholder-count="5">
          <circle cx="{{ q.x }}" cy="{{ q.y }}" r="2.6" fill="#eafff4" stroke="#3fbf8c" stroke-width=".8" opacity="{{ q.o }}"></circle>
        </sc-for>
        <path d="{{ v2DR }}" fill="none" stroke="#e0b53a" stroke-width="3" sc-camel-path-length="1000" stroke-dasharray="{{ v2Riser }}"></path>

        <!-- ================= oil transfer valve (cell left side, horizontal run) ================= -->
        <circle cx="${VO.x}" cy="${VO.y}" r="19" fill="#46d39a" style="{{ v2HaloVO }}"></circle>
        <g style="{{ v2DimIn }}">${valveSvg(VO.x, VO.y, false, 'v2VO', 'Oil Transfer Valve', VO.x, VO.y - 62, 'middle')}</g>
        <text x="${VO.x}" y="${MAN_Y - 86}" text-anchor="middle" style="${MONO} font-size:11px; font-weight:600; letter-spacing:.3px; fill:{{ v2XferCol }};">{{ v2XferLbl }}</text>

        <!-- ================= gas outlet valve (on the side gas line) ================= -->
        <circle cx="${VG.x}" cy="${VG.y}" r="19" fill="#46d39a" style="{{ v2HaloVG }}"></circle>
        <g style="{{ v2DimGas }}">${valveSvg(VG.x, VG.y, false, 'v2VG', 'Gas Outlet Valve', VG.x + 20, VG.y - 62, 'middle')}</g>
        <!-- first oil drop at the valve outlet -->
        <sc-if value="{{ v2DropOn }}" hint-placeholder-val="{{ false }}">
          <g style="{{ v2DropO }}">
            <circle class="v2-ring" cx="{{ v2DropX }}" cy="{{ v2DropY }}" r="4" fill="none" stroke="#ffcf3f" stroke-width="1.4"></circle>
            <circle cx="{{ v2DropX }}" cy="{{ v2DropY }}" r="{{ v2DropR }}" fill="#e0b53a" stroke="#fff2c0" stroke-width=".8"></circle>
            <text x="1127" y="${GAS_Y + 46}" style="${MONO} font-size:11px; font-weight:700; letter-spacing:.5px; fill:#ffcf3f;">FIRST OIL DROP</text>
            <text x="1127" y="${GAS_Y + 61}" style="${MONO} font-size:10.5px; letter-spacing:.3px; fill:#ffcf3f;">→ close valve</text>
          </g>
        </sc-if>

        <!-- ================= water glass (gas vent — separate from the viscometer waste glass) ================= -->
        <g style="{{ v2DimGas }}">
          <g clip-path="url(#v2GlassClip)">
            <g transform="{{ v2Ripple }}"><rect x="${GLASS.x - 10}" y="${GLASS.water}" width="${GLASS.w + 20}" height="${GLASS.h}" fill="url(#v2Water)"></rect></g>
            <line x1="${GLASS.x}" y1="${GLASS.water}" x2="${GLASS.x + GLASS.w}" y2="${GLASS.water}" stroke="#bfe4ff" stroke-width="1" opacity=".7"></line>
            <sc-for list="{{ v2GBubs }}" as="q" hint-placeholder-count="12">
              <circle cx="{{ q.x }}" cy="{{ q.y }}" r="{{ q.r }}" fill="rgba(230,250,255,.25)" stroke="#e6faff" stroke-width=".9" opacity="{{ q.o }}"></circle>
            </sc-for>
          </g>
          <path d="M${GLASS.x + 2} ${GLASS.y} L${GLASS.x + 7} ${GLASS.y + GLASS.h - 4} Q${GLASS.x + 7} ${GLASS.y + GLASS.h} ${GLASS.x + 11} ${GLASS.y + GLASS.h} L${GLASS.x + GLASS.w - 11} ${GLASS.y + GLASS.h} Q${GLASS.x + GLASS.w - 7} ${GLASS.y + GLASS.h} ${GLASS.x + GLASS.w - 7} ${GLASS.y + GLASS.h - 4} L${GLASS.x + GLASS.w - 2} ${GLASS.y}" fill="rgba(159,208,245,.06)" stroke="#9fd0f5" stroke-width="2" stroke-linejoin="round"></path>
          <line x1="${GLASS.x - 2}" y1="${GLASS.y}" x2="${GLASS.x + 4}" y2="${GLASS.y}" stroke="#9fd0f5" stroke-width="2"></line><line x1="${GLASS.x + GLASS.w - 4}" y1="${GLASS.y}" x2="${GLASS.x + GLASS.w + 2}" y2="${GLASS.y}" stroke="#9fd0f5" stroke-width="2"></line>
          <line x1="${GLASS.x + 12}" y1="${GLASS.y + 10}" x2="${GLASS.x + 16}" y2="${GLASS.y + GLASS.h - 12}" stroke="#ffffff" stroke-width="1.4" opacity=".25"></line>
          <text x="${GLASS.cx}" y="${GLASS.y + GLASS.h + 22}" text-anchor="middle" style="${ESS} font-size:17px;">Water Glass</text>
          <text x="${GLASS.cx}" y="${GLASS.y + GLASS.h + 38}" text-anchor="middle" style="${SUB} font-size:12.5px;">gas vent</text>
          <text x="${GLASS.cx}" y="${GLASS.y + GLASS.h + 55}" text-anchor="middle" style="${MONO} font-size:11px; font-weight:700; letter-spacing:.5px; fill:{{ v2GlassCol }};">{{ v2GlassTxt }}</text>
        </g>

        <!-- ================= viscometer · chamber oil (horizontal level in the inclined bore) ================= -->
        <g clip-path="url(#v2BoreClipW)">
          <rect x="{{ v2Bx0 }}" y="{{ v2ChY }}" width="{{ v2Bw }}" height="{{ v2ChH }}" fill="url(#v2OilC)"></rect>
          <sc-if value="{{ v2ChMen }}" hint-placeholder-val="{{ false }}"><line x1="{{ v2Bx0 }}" y1="{{ v2ChMenY }}" x2="{{ v2Bx1 }}" y2="{{ v2ChMenY }}" stroke="#fff2c0" stroke-width="1.6"></line></sc-if>
        </g>
        <!-- viscometer · moving parts, top outlet, bleed valve, PT (same rotation) -->
        <g transform="{{ v2DevT }}">
          <g clip-path="url(#v2BoreClip)">
            <g class="v2-up" style="{{ v2ChArrows }}" fill="#fff2c0"><path d="M615,236 L620,229 L625,236 Z"></path></g>
          </g>
          <g fill="none">
            <path d="{{ v2DSt }}" stroke="#d6b03c" stroke-width="5" sc-camel-path-length="1000" stroke-dasharray="{{ v2St }}"></path>
            <g class="{{ v2TlSlow }}"><path class="v2-flow" d="{{ v2DSt }}" stroke="#fff2c0" stroke-width="2" stroke-dasharray="4 8" style="{{ v2StDash }}"></path></g>
            <sc-if value="{{ v2TeeOn }}" hint-placeholder-val="{{ false }}"><path d="M624,189 H652" stroke="#d6b03c" stroke-width="4"></path></sc-if>
          </g>
          <sc-if value="{{ v2FrontStOn }}" hint-placeholder-val="{{ false }}"><circle cx="{{ v2Fsx }}" cy="{{ v2Fsy }}" r="4.2" fill="#ffe08a" stroke="#fff6d6"></circle></sc-if>
          <line x1="608" y1="236" x2="632" y2="236" stroke="#8fa3c2" stroke-width="1" stroke-dasharray="2 2"></line>
          <line x1="608" y1="456" x2="632" y2="456" stroke="#8fa3c2" stroke-width="1.6"></line>
          <g transform="{{ v2BodyT }}">
            <path d="M612,364 Q612,356 620,356 Q628,356 628,364 V440 L620,454 L612,440 Z" fill="url(#v2Metal)" stroke="#0a0e16"></path>
            <line x1="615" y1="364" x2="615" y2="438" stroke="#eef4fb" stroke-width="1" opacity=".45"></line>
          </g>
          <g style="{{ v2DimPdu }}">
            <path d="M652,189 H666" stroke="#56647c" stroke-width="6"></path>
            <path d="M652,189 H666" stroke="#c8d2df" stroke-width="3"></path>
            <sc-if value="{{ v2TeeOn }}" hint-placeholder-val="{{ false }}"><path d="M652,189 H664" stroke="#d6b03c" stroke-width="2.2"></path></sc-if>
            <rect x="660" y="174" width="42" height="30" rx="6" fill="#ff9a3a" style="{{ v2HaloPT }}"></rect>
            <rect x="664" y="179" width="28" height="20" rx="4" fill="url(#v2SS)" stroke="rgba(10,14,22,.55)" stroke-width=".8"></rect>
            <rect x="691" y="183" width="6" height="12" rx="1.5" fill="#2a3240"></rect>
          </g>
          <g style="{{ v2DimVL }}">
            <rect x="603" y="121" width="50" height="34" rx="7" fill="#46d39a" opacity=".5" style="{{ v2HaloVL }}"></rect>
            <line x1="632" y1="138" x2="637" y2="138" stroke="#8fa3c2" stroke-width="2.4"></line>
            <path d="M607 125 L633 125 L620 138 Z" fill="url(#v2Cyl)" stroke="#0a0e16" stroke-width="1.3"></path>
            <path d="M607 151 L633 151 L620 138 Z" fill="url(#v2Cyl)" stroke="#0a0e16" stroke-width="1.3"></path>
            <g style="{{ v2VT.hot }}"><path d="M607 125 L633 125 L620 138 Z" fill="#46d39a"></path><path d="M607 151 L633 151 L620 138 Z" fill="#46d39a"></path></g>
            <circle cx="644" cy="138" r="7" fill="#0c1626" stroke="#8fa3c2" stroke-width="2"></circle>
            <g stroke="#8fa3c2" stroke-width="1.5" stroke-linecap="round" style="{{ v2VT.wheel }}"><line x1="637" y1="138" x2="651" y2="138"></line><line x1="644" y1="131" x2="644" y2="145"></line></g>
          </g>
        </g>
        <!-- guide lock clamp + live angle badge + fixed hinge pin -->
        <g transform="{{ v2ClampT }}">
          <rect x="-9" y="-9" width="18" height="18" rx="3" fill="#2a3240" stroke="rgba(0,0,0,.6)" stroke-width=".8"></rect>
          <line x1="0" y1="-9" x2="0" y2="-17" stroke="#8fa3c2" stroke-width="2.4" stroke-linecap="round"></line>
          <circle cx="0" cy="-20" r="4.5" fill="#1b1f26" stroke="#8fa3c2" stroke-width="1.2"></circle>
        </g>
        <rect x="{{ v2Ang.x }}" y="{{ v2Ang.y }}" width="36" height="18" rx="4" fill="var(--panel)" stroke="var(--blue)" stroke-width="1.2"></rect>
        <text x="{{ v2Ang.tx }}" y="{{ v2Ang.ty }}" text-anchor="middle" style="${MONO} font-size:11.5px; font-weight:700; fill:var(--blue);">{{ v2AngTxt }}</text>
        <circle cx="${PIV[0]}" cy="${PIV[1]}" r="6" fill="#1b1f26" stroke="#c8d2df" stroke-width="1.8"></circle>
        <circle cx="${PIV[0] - 1.6}" cy="${PIV[1] - 1.6}" r="1.5" fill="#eef4fb" opacity=".7"></circle>

        <!-- controller (t, μ) + pressure display (viscometer PT) -->
        <g style="{{ v2DimCtl }}">
          <rect x="${CTL.x}" y="${CTL.y}" width="${CTL.w}" height="${CTL.h}" rx="6" fill="rgba(10,17,30,.55)" stroke="#33445e" stroke-width="1.2"></rect>
          <rect x="${CTL.x + 10}" y="${CTL.y + 8}" width="${CTL.w - 20}" height="${CTL.h - 16}" rx="3" fill="url(#v2Metal)" stroke="#0a0e16"></rect>
          <rect x="${CTL.x + 18}" y="${CTL.y + 13}" width="126" height="${CTL.h - 26}" rx="1.5" fill="#06101e" stroke="#1d3350"></rect>
          <text x="${CTL.x + 26}" y="${CTL.y + 30}" style="${MONO} font-size:11px; font-weight:600; fill:#7ff0bf;">t</text>
          <text x="${CTL.x + 124}" y="${CTL.y + 30}" text-anchor="end" style="${MONO} font-size:13px; font-weight:600; fill:#7ff0bf;">{{ v2CtlT }}</text>
          <text x="${CTL.x + 128}" y="${CTL.y + 30}" style="${MONO} font-size:7.5px; fill:var(--cap);">s</text>
          <text x="${CTL.x + 26}" y="${CTL.y + 47}" style="${MONO} font-size:11px; font-weight:600; fill:#ffe08a;">μ</text>
          <text x="${CTL.x + 124}" y="${CTL.y + 47}" text-anchor="end" style="${MONO} font-size:13px; font-weight:600; fill:#ffe08a;">{{ v2CtlMu }}</text>
          <text x="${CTL.x + 128}" y="${CTL.y + 47}" style="${MONO} font-size:7.5px; fill:var(--cap);">cP</text>
          <text x="${CTL.x + 26}" y="${CTL.y + 57}" style="${MONO} font-size:7px; letter-spacing:.8px; fill:var(--cap);">{{ v2CtlState }}</text>
          <circle cx="${CTL.x + CTL.w - 22}" cy="${CTL.y + 24}" r="4" fill="{{ v2CtlCol }}"></circle>
          <text x="${CTL.x + CTL.w - 22}" y="${CTL.y + 48}" text-anchor="middle" style="${MONO} font-size:7px; fill:#0a0e16;">VISC</text>
        </g>
        <g style="{{ v2DimPdu }}">
          <rect x="${PDU.x}" y="${PDU.y}" width="${PDU.w}" height="${PDU.h}" rx="6" fill="rgba(10,17,30,.55)" stroke="#33445e" stroke-width="1.2"></rect>
          <rect x="${PDU.x + 10}" y="${PDU.y + 8}" width="${PDU.w - 20}" height="${PDU.h - 16}" rx="3" fill="url(#v2Metal)" stroke="#0a0e16"></rect>
          <rect x="${PDU.x + 18}" y="${PDU.y + 13}" width="${PDU.w - 72}" height="${PDU.h - 26}" rx="1.5" fill="#06101e" stroke="#1d3350"></rect>
          <text x="${PDU.x + PDU.w - 60}" y="${PDU.y + 37}" text-anchor="end" style="${MONO} font-size:19px; font-weight:700; fill:{{ v2PtCol }};">{{ v2PtLcd }}</text>
          <text x="${PDU.x + PDU.w - 44}" y="${PDU.y + 34}" text-anchor="middle" style="${MONO} font-size:7.5px; fill:#0a0e16;">PT psig</text>
        </g>

        <!-- waste glass (viscometer bleed) -->
        <g style="{{ v2DimTail }}">
          <g clip-path="url(#v2WasteClip)">
            <rect x="${WASTE.x}" y="{{ v2WasteY }}" width="${WASTE.w}" height="{{ v2WasteH }}" fill="url(#v2OilC)"></rect>
            <sc-if value="{{ v2WasteOn }}" hint-placeholder-val="{{ false }}"><line x1="${WASTE.x}" y1="{{ v2WasteY }}" x2="${WASTE.x + WASTE.w}" y2="{{ v2WasteY }}" stroke="#fff2c0" stroke-width="1.6"></line></sc-if>
          </g>
          <path d="M${WASTE.x + 3},${WASTE.y} V${WASTE.y + WASTE.h - 7} Q${WASTE.x + 3},${WASTE.y + WASTE.h - 2} ${WASTE.x + 9},${WASTE.y + WASTE.h - 2} H${WASTE.x + WASTE.w - 9} Q${WASTE.x + WASTE.w - 3},${WASTE.y + WASTE.h - 2} ${WASTE.x + WASTE.w - 3},${WASTE.y + WASTE.h - 7} V${WASTE.y}" fill="rgba(143,163,194,.10)" stroke="#8fa3c2" stroke-width="1.8" stroke-linejoin="round"></path>
          <path d="M${WASTE.x - 4},${WASTE.y - 3} Q${WASTE.x + 1},${WASTE.y - 2} ${WASTE.x + 2},${WASTE.y + 2} M${WASTE.x + 4},${WASTE.y - 1.5} H${WASTE.x + WASTE.w + 1}" fill="none" stroke="#b3c1d8" stroke-width="3" stroke-linecap="round"></path>
          <line x1="${WASTE.x + 8}" y1="${WASTE.y + 8}" x2="${WASTE.x + 8}" y2="${WASTE.y + WASTE.h - 12}" stroke="#eef4fb" stroke-width="2" opacity=".25" stroke-linecap="round"></line>
          <g stroke="#8fa3c2" stroke-width="1">${WASTE_MARKS}</g>
          <sc-if value="{{ v2Drip }}" hint-placeholder-val="{{ false }}"><circle class="v2-drip" cx="${WASTE_CX}" cy="${WASTE.y - 4}" r="2.4" fill="#d6b03c"></circle></sc-if>
        </g>

        <!-- essential labels (viscometer side) -->
        <text x="${VIS.x}" y="${VIS.y}" style="${ESS}">Viscometer</text>
        <text x="${VIS.x}" y="${VIS.y + 18}" style="${SUB} font-size:14px;">falling body · 3 cc</text>
        <text x="${VIS.x}" y="${VIS.y + 36}" style="${MONO} font-size:12px; font-weight:700; letter-spacing:.5px; fill:{{ v2ChLblCol }};">{{ v2ChLbl }}</text>
        <text x="{{ v2Inl.x }}" y="{{ v2Inl.y }}" text-anchor="end" style="${ESS} font-size:17px;">Inlet</text>
        <text x="{{ v2VL.x }}" y="{{ v2VL.y }}" style="${ESS}">Bleed Valve</text>
        <rect x="{{ v2VLTag.x }}" y="{{ v2VLTag.y }}" width="80" height="18" rx="4" fill="{{ v2TT.fill }}" stroke="{{ v2TT.stroke }}"></rect>
        <text x="{{ v2VLTag.tx }}" y="{{ v2VLTag.ty }}" text-anchor="middle" style="${MONO} font-size:10px; font-weight:700; letter-spacing:.6px; fill:{{ v2TT.color }};">{{ v2TT.text }}</text>
        <text x="${WASTE_CX}" y="${WASTE.y + WASTE.h + 20}" text-anchor="middle" style="${ESS} font-size:17px;">Waste Glass</text>
        <text x="${WASTE_CX}" y="${WASTE.y + WASTE.h + 37}" text-anchor="middle" style="${MONO} font-size:12px; font-weight:600; fill:#d6b03c;">{{ v2WasteTxt }}</text>
        <g class="v2-halo" style="{{ v2LiveCoil }}">
          <text x="{{ v2Ldrive.x }}" y="{{ v2Ldrive.y }}" style="${MONO} font-size:11px; font-weight:700; letter-spacing:.6px; fill:#4d9dff;">{{ v2DriveTxt }}</text>
          <text x="{{ v2Lsense.x }}" y="{{ v2Lsense.y }}" style="${MONO} font-size:11px; font-weight:700; letter-spacing:.6px; fill:#46d39a;">{{ v2SenseTxt }}</text>
        </g>
        <!-- component labels (Show Components) -->
        <g style="{{ v2CompStyle }}">
          <g class="v2-halo" style="${LBLV}"><path d="{{ v2Lch.d }}" fill="none" stroke="var(--v2-lead)"></path><text x="{{ v2Lch.x }}" y="{{ v2Lch.y }}">Chamber · 3 cc</text><path d="{{ v2Lbody.d }}" fill="none" stroke="var(--v2-lead)"></path><text x="{{ v2Lbody.x }}" y="{{ v2Lbody.y }}">Falling body</text><path d="{{ v2Ldrive.d }}" fill="none" stroke="var(--v2-lead)"></path><text x="{{ v2Ldrive.x }}" y="{{ v2Ldrive.y }}">Driving coil <tspan style="${MONO} font-size:11px; font-weight:700; fill:#4d9dff;">{{ v2DriveTxt }}</tspan></text><path d="{{ v2Lsense.d }}" fill="none" stroke="var(--v2-lead)"></path><text x="{{ v2Lsense.x }}" y="{{ v2Lsense.y }}">Sensing coil <tspan style="${MONO} font-size:11px; font-weight:700; fill:#46d39a;">{{ v2SenseTxt }}</tspan></text><path d="{{ v2Lpt100.d }}" fill="none" stroke="var(--v2-lead)"></path><text x="{{ v2Lpt100.x }}" y="{{ v2Lpt100.y }}">PT100 · temperature</text><path d="{{ v2Lpt.d }}" fill="none" stroke="var(--v2-lead)"></path><text x="{{ v2Lpt.x }}" y="{{ v2Lpt.y }}">Pressure transmitter</text><sc-for list="{{ v2TickLbls }}" as="k" hint-placeholder-count="2"><text x="{{ k.x }}" y="{{ k.y }}" text-anchor="middle" style="font-size:11px; fill:var(--mut); {{ k.st }}">{{ k.t }}</text></sc-for></g>
          <text x="${CTL.x + CTL.w / 2}" y="${CTL.y - 8}" text-anchor="middle" style="${LBLV}">Viscometer controller</text>
          <text x="${PDU.x + PDU.w / 2}" y="${PDU.y - 9}" text-anchor="middle" style="${LBLV}">Pressure display</text>
          <text x="${BATH.x + BATH.w + 10}" y="${BATH.y + 62}" style="${LBLV}">Thermostat bath</text>
        </g>

        <!-- flow fronts + arrows -->
        <sc-if value="{{ v2FrontOn }}" hint-placeholder-val="{{ false }}"><circle cx="{{ v2Fx }}" cy="{{ v2Fy }}" r="4.6" fill="#ffe08a" stroke="#fff6d6"></circle></sc-if>
        <sc-if value="{{ v2FrontTlOn }}" hint-placeholder-val="{{ false }}"><circle cx="{{ v2Ftx }}" cy="{{ v2Fty }}" r="4.6" fill="#ffe08a" stroke="#fff6d6"></circle></sc-if>
        <sc-for list="{{ v2Arrows }}" as="a" hint-placeholder-count="8">
          <path d="{{ a.d }}" fill="{{ a.col }}" stroke="#0a0e16" stroke-width="1" style="{{ a.style }}"></path>
        </sc-for>
      </svg>
    </div>

    <!-- ============ live readouts + result ============ -->
    <div class="v2-side" style="flex:0 0 330px; min-width:0; display:flex; flex-direction:column; gap:7px; border:1px solid var(--line); border-radius:12px; background:var(--panel2); padding:10px 12px; overflow:hidden;">
      <div class="v2-hdr" style="font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:1.4px; font-weight:600; color:var(--mut); text-transform:uppercase;">Test Conditions &amp; Result</div>

      <div style="display:flex; flex-direction:column; gap:4px; padding:8px 12px; border-radius:10px; background:var(--icard); border:1px solid var(--line);">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <span style="font-size:11px; color:var(--mut); font-weight:500;">PVT Cell Pressure</span>
          <span style="font-family:'IBM Plex Mono',monospace; font-size:9px; font-weight:700; letter-spacing:.8px; color:{{ v2PCol }};">{{ v2PState }}</span>
        </div>
        <span class="v2-big" style="font-family:'IBM Plex Mono',monospace; font-size:26px; font-weight:700; color:{{ v2PCol }}; line-height:1.1;">{{ v2PTxt }} <span style="font-size:12px; color:var(--mut);">psig</span></span>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--txt2);">
          <span><span style="display:block; font-family:'IBM Plex Sans',sans-serif; font-size:9.5px; color:var(--mut);">Target</span>{{ v2Tgt }}</span>
          <span><span style="display:block; font-family:'IBM Plex Sans',sans-serif; font-size:9.5px; color:var(--mut);">Viscometer PT</span>{{ v2PvTxt }}</span>
          <span><span style="display:block; font-family:'IBM Plex Sans',sans-serif; font-size:9.5px; color:var(--mut);">Current</span>{{ v2PtTxt }}</span>
        </div>
        <span style="font-size:9.5px; color:var(--mut);">{{ v2Temp }} °C · Psat {{ v2Psat }} psig · viscometer {{ v2PvState }}</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:3px; padding:8px 12px; border-radius:10px; background:var(--icard); border:1px solid var(--line);">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <span style="font-size:11px; color:var(--mut); font-weight:500;">Measured Viscosity · μ = K × t</span>
          <span style="font-family:'IBM Plex Mono',monospace; font-size:9px; font-weight:700; letter-spacing:.8px; color:{{ v2MeasCol }};">{{ v2MeasTag }}</span>
        </div>
        <div style="display:flex; align-items:baseline; justify-content:space-between; gap:8px;">
          <span style="font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--txt2);">t = {{ v2TTxt }} {{ v2TUnit }}</span>
          <span class="v2-big" style="font-family:'IBM Plex Mono',monospace; font-size:24px; font-weight:700; color:#e0b53a;">{{ v2MuTxt }} <span style="font-size:11px; color:var(--mut);">{{ v2MuUnit }}</span></span>
        </div>
        <span style="font-size:9.5px; color:var(--mut);">K = {{ v2K }} cP/s (device calibration)</span>
      </div>

      <!-- results (graph + table): only once the first viscosity measurement starts -->
      <sc-if value="{{ v2ResOn }}" hint-placeholder-val="{{ false }}">
      <div style="flex:1 1 auto; min-height:150px; display:flex; flex-direction:column; gap:3px; padding:8px 10px; border-radius:10px; background:var(--icard); border:1px solid var(--line);">
        <span style="font-size:11px; color:var(--mut); font-weight:500;">Pressure vs Viscosity · {{ v2Temp }} °C</span>
        <svg sc-camel-view-box="0 0 300 168" preserveAspectRatio="xMidYMid meet" style="width:100%; flex:1 1 auto; min-height:110px; display:block;">
          <sc-for list="{{ v2Yt }}" as="g" hint-placeholder-count="5">
            <line x1="42" y1="{{ g.y }}" x2="292" y2="{{ g.y }}" stroke="var(--v2-grid)"></line>
            <text x="37" y="{{ g.ty }}" text-anchor="end" style="${MONO} font-size:8.5px; fill:var(--mut);">{{ g.lbl }}</text>
          </sc-for>
          <sc-for list="{{ v2Xt }}" as="g" hint-placeholder-count="7">
            <line x1="{{ g.x }}" y1="12" x2="{{ g.x }}" y2="128" stroke="var(--v2-grid)"></line>
            <text x="{{ g.x }}" y="140" text-anchor="middle" style="${MONO} font-size:8px; fill:var(--mut);">{{ g.lbl }}</text>
          </sc-for>
          <line x1="42" y1="128" x2="292" y2="128" stroke="var(--v2-ax)"></line>
          <line x1="42" y1="12" x2="42" y2="128" stroke="var(--v2-ax)"></line>
          <sc-if value="{{ v2CurOn }}" hint-placeholder-val="{{ false }}">
            <line x1="{{ v2CurX }}" y1="12" x2="{{ v2CurX }}" y2="128" stroke="#4d9dff" stroke-width="1" stroke-dasharray="3 3" opacity=".8"></line>
          </sc-if>
          <sc-if value="{{ v2GLineOn }}" hint-placeholder-val="{{ false }}">
            <polyline points="{{ v2GLine }}" fill="none" stroke="#e0b53a" stroke-width="1.8" stroke-linejoin="round"></polyline>
          </sc-if>
          <sc-for list="{{ v2GPts }}" as="p" hint-placeholder-count="0">
            <circle cx="{{ p.cx }}" cy="{{ p.cy }}" r="{{ p.r }}" fill="{{ p.fill }}" stroke="#0a0e16" stroke-width="1"></circle>
          </sc-for>
          <sc-if value="{{ v2GEmpty }}" hint-placeholder-val="{{ false }}">
            <text x="167" y="74" text-anchor="middle" style="font-family:'IBM Plex Sans',sans-serif; font-size:10px; fill:var(--mut);">No points measured yet</text>
          </sc-if>
          <text x="167" y="160" text-anchor="middle" style="font-family:'IBM Plex Sans',sans-serif; font-size:9.5px; font-weight:600; fill:var(--txt2);">Pressure (psig)</text>
          <text x="10" y="70" text-anchor="middle" transform="rotate(-90 10 70)" style="font-family:'IBM Plex Sans',sans-serif; font-size:9.5px; font-weight:600; fill:var(--txt2);">Viscosity (cP)</text>
        </svg>
      </div>

      <div style="flex:0 1 auto; min-height:60px; overflow-y:auto; display:flex; flex-direction:column; gap:1px; padding:6px 10px; border-radius:10px; background:var(--icard); border:1px solid var(--line); font-family:'IBM Plex Mono',monospace; font-size:10.5px;">
        <div style="display:grid; grid-template-columns:1.1fr .9fr .9fr; gap:4px; padding:0 4px 2px; font-family:'IBM Plex Sans',sans-serif; font-size:9.5px; color:var(--mut); border-bottom:1px solid var(--line);">
          <span>Pressure, psig</span><span>t, s</span><span>μ, cP</span>
        </div>
        <sc-for list="{{ v2Rows }}" as="r" hint-placeholder-count="6">
          <div style="{{ r.style }}"><span>{{ r.p }}</span><span>{{ r.t }}</span><span style="font-weight:600;">{{ r.mu }}</span></div>
        </sc-for>
        <span style="font-family:'IBM Plex Sans',sans-serif; font-size:8.5px; color:var(--mut); margin-top:2px;">Illustrative simulation data — report sub-Psat trend (scaled to 4.80 cP at Psat), not lab data</span>
      </div>
      </sc-if>

      <div class="v2-pills" style="display:flex; flex-wrap:wrap; gap:5px;">
        <span style="{{ v2PillG.style }}">{{ v2PillG.txt }}</span>
        <span style="{{ v2PillO.style }}">{{ v2PillO.txt }}</span>
        <span style="{{ v2PillT.style }}">{{ v2PillT.txt }}</span>
      </div>
    </div>
  </div>

  <!-- controls -->
  <div style="flex:0 0 auto; display:flex; align-items:center; gap:8px 10px; flex-wrap:wrap;">
    <div class="pc-host" data-pc="StageViscTwo" data-pc-layout="bar" style="flex:1 1 100%; min-width:0;"></div>
    <!-- view tools (demonstration only) -->
    <div style="flex:0 0 auto; display:flex; align-items:center; gap:8px; margin-left:auto;">
    <button class="ui-btn ui-btn-ghost act" onclick="{{ v2Comp }}" style="{{ v2CompBtn }}">{{ v2CompTxt }}</button>
    <div title="{{ v2InclTip }}" style="flex:0 0 auto; display:flex; align-items:center; gap:8px; height:34px; padding:0 12px; border-radius:10px; background:var(--panel2); border:1px solid var(--line2); box-sizing:border-box; {{ v2InclRow }}">
      <span style="font-size:12.5px; font-weight:600; color:var(--txt2);">Inclination</span>
      <input type="range" min="${INCL_MIN}" max="${INCL_MAX}" step="0.5" value="{{ v2Incl }}" oninput="{{ v2InclIn }}" disabled="{{ v2InclDis }}" style="width:100px; margin:0; accent-color:var(--blue); cursor:pointer;">
      <span style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:700; color:var(--txt); min-width:34px;">{{ v2InclTxt }}</span>
      <span class="v2-demo" style="font-size:11px; color:var(--mut); white-space:nowrap;">demo only</span>
    </div>
    </div>
  </div>
</div>`,
  logic: Component
});
})();
