/* component: StageSeparator */
(function () {
// ===== Separator Test (rebuilt 2026-09-30) =====
// Six stages, one step engine (same structure as Differential Liberation, StageDiffLib.js):
//   1 Charge 35 cc at 5,000 psig / 114 C          (working pressure = reservoir 3,000 psig + 2,000 psi)
//   2 First PV test  - the Validation PV engine itself (StagePVTest via pv-config): 12 points, separate
//                      points, two fitted lines extended to their intersection = Psat, then the engine
//                      returns the cell to 5,000 psig at 114 C (working condition)
//   3 Separator conditions - cool 114 -> 35 C at 5,000 psig, then reduce 5,000 -> 200 psig
//   4 Agitation Pump A -> Pump B -> Pump A at 35 C / 200 psig (DL two-pump cycle), Pump B ends empty
//   5 Flash Unit - connect (all valves closed), then gas removal: balloon first, excess to the gasometer,
//                  flow-rate drop -> cell outlet closed (DL endpoint logic, no oil carry-over)
//   6 Final PV test on the remaining separator liquid at 35 C (same Validation PV engine)
// Reuses: window.PVT_PV (StagePVTest.js) and window.PVT_FX (Main.js) - read lazily, those files load after this one.
//
// ILLUSTRATIVE VALUES (not measured - replace with the laboratory run):
//   First PV Psat 2,500 psig @ 36.3475 cc   = DL Initial PV (2,500 psig @ 83.08 cc on 80 cc) scaled to 35 cc
//   two-phase slope 0.35 cc / 100 psi         = DL Initial PV slope (0.8 cc / 100 psi on 80 cc) scaled to 35 cc
//   cooled volume 33.0645 cc at 5,000 psig    = 35 cc x (1 - 0.0007 /C x 79 C) thermal contraction
//   gas onset while reducing at 35 C ~1,860 psig (animation only; bubble point lowered for 35 C)
//   separator gas 916 cc (balloon 14.75 psig = 254 cc + gasometer 662 cc) = DL total liberated gas x 35/80;
//     at 200 psig / 35 C that is 64.8 cc of free gas -> stabilized volume 92.7780 cc (fits the 100 cc Pump A)
//   remaining separator liquid 27.9780 cc     = 35 cc x (DL last-stage remaining 67.6952 / 80) x thermal factor
//   Final PV Psat 200 psig @ 27.9780 cc       = separator liquid saturated at separator pressure;
//     compressibility 1.2e-5 /psi above, 0.012 cc/psi below Psat
const P_WORK = 5000, P_RES = 3000, T_RES = 114, T_SEP = 35, P_SEP = 200, V_CHARGE = 35, FLOW = 0.5;
const r4 = (x) => Math.round(x * 10000) / 10000;
const fmtP = (p) => Number(p).toLocaleString('en-US') + ' psig';
const fmtT = (t) => Number(t).toFixed(1) + ' °C';
const PVX = () => window.PVT_PV;
const FXX = () => window.PVT_FX;

// ---- First PV : reservoir fluid at 114 C, Validation 12-point schedule (5 single-phase + 7 two-phase) ----
const PSAT1 = { p: 2500, v: r4(V_CHARGE * 83.08 / 80) };            // 36.3475 cc
const PV1_PTS = [5000, 4500, 4000, 3500, 3000].map(p => [p, r4(V_CHARGE + (PSAT1.v - V_CHARGE) * (P_WORK - p) / (P_WORK - PSAT1.p))])
  .concat([2300, 2200, 2100, 2000, 1900, 1800, 1700].map(p => [p, r4(PSAT1.v + (PSAT1.p - p) * 0.35 / 100)]));
const PV1_CFG = { data: PV1_PTS, bubbleIdx: 5, start: [P_WORK, V_CHARGE], dec: 4, pu: 'psig',
  xMin: 34.6, xMax: 39.6, yMin: 1550, yMax: 5150, xTicks: [35, 36, 37, 38, 39], xTickDec: 0, yTicks: [5000, 4000, 3000, 2000],
  psatLabel: '2,500 psig @ 36.35 cc', psatPTxt: '2,500 psig', psatVolTxt: '36.35 cc', psatBoxW: 150, boxW: 96,
  connectPts: false, fitSplit: 5, psatP: PSAT1.p, psatMarkTitle: 'Fitted-line intersection', psatMarkTxt: 'Psat = 2500 psig',
  psatAxisTxt: '2,500', fitMs: 12000, liquidAtStart: true, tempTxt: '114 °C' };

// ---- separator conditions / agitation / flash ----
const C_LIQ = 1.4829e-5;                                             // DL Initial PV compressibility, 1/psi
const V_COLD = r4(V_CHARGE * (1 - 0.0007 * (T_RES - T_SEP)));        // 33.0645 cc
const P_ONSET = 1860;                                                // gas starts to appear (animation only)
const V_ONSET = r4(V_COLD * (1 + C_LIQ * (P_WORK - P_ONSET)));
const SEP = { target: P_SEP, vPre: 80.5000, stab: 92.7780, remaining: 27.9780, balloon: 14.75, gasometer: 662, pumpB: 0 };
SEP.pumpA = SEP.stab;
SEP.cycles = [SEP.stab];                                             // one cycle to equilibrium + one confirmation cycle
SEP.gEq = r4(SEP.stab - SEP.remaining);                             // free gas at 200 psig / 35 C
SEP.gPre = r4(SEP.vPre - V_ONSET);                                  // free gas before agitation
SEP.balloonCc = 250 * SEP.balloon / 14.5;                           // Validation balloon scale: 250 cc = 14.5 psi
SEP.fBal = SEP.balloonCc / (SEP.balloonCc + SEP.gasometer);

// ---- Final PV : separator liquid at 35 C ----
const V_REM = SEP.remaining, PSAT2 = { p: P_SEP, v: V_REM };
const PV2_PTS = [1200, 1000, 800, 600, 400].map(p => [p, r4(V_REM * (1 - 1.2e-5 * (p - P_SEP)))])
  .concat([180, 160, 140, 120, 100, 80, 60].map(p => [p, r4(V_REM + (P_SEP - p) * 0.012)]));
const PV2_CFG = { data: PV2_PTS, bubbleIdx: 5, start: [P_SEP, V_REM], dec: 4, pu: 'psig',
  xMin: 27.4, xMax: 29.9, yMin: 0, yMax: 1300, xTicks: [27.5, 28, 28.5, 29, 29.5], xTickDec: 1, yTicks: [1200, 900, 600, 300],
  psatLabel: '200 psig @ 27.98 cc', psatPTxt: '200 psig', psatVolTxt: '27.98 cc', psatBoxW: 150, boxW: 96,
  connectPts: false, fitSplit: 5, psatP: PSAT2.p, psatMarkTitle: 'Fitted-line intersection', psatMarkTxt: 'Psat = 200 psig',
  psatAxisTxt: '200', fitMs: 12000, fitOVA: 0.035, fitOVB: 0.08, liquidAtStart: true, tempTxt: '35 °C' };

const IDS = ['charge', 'pv1', 'cond', 'agit', 'flash', 'pv2'];
const STEPS = { charge: 1, pv1: 1, cond: 2, agit: 1, flash: 2, pv2: 1 };
const SNAME = { charge: 'Charge 35 cc', pv1: 'First PV · 114 °C', cond: 'Separator Conditions', agit: 'Agitation A→B→A',
  flash: 'Flash Unit', pv2: 'Final PV · 35 °C' };
const STEPN = { charge: ['Charge 35 cc'], pv1: ['First PV Test'], cond: ['Cool 114 → 35 °C', 'Reduce 5,000 → 200 psig'],
  agit: ['Agitate A → B → A'], flash: ['Connect Flash Unit', 'Release Gas'], pv2: ['Final PV Test'] };
// durations (s), all scaled by PT() through tween()/wait()
const D_COOL = 11, D_REDUCE = 13, D_CONN = 5.5, D_DISC = 2.4, TS = 4.2, HOLD = 1.4, SETTLE = 2.8;
const PUMP_CAP = 100;
const DL_BUBS = Array.from({ length: 16 }, (_, k) => ({ fx: (k * 0.618034 + 0.07) % 1, ph: (k * 0.381966 + 0.13) % 1,
  sp: 0.75 + ((k * 0.7549) % 1) * 0.5, r: 1.0 + ((k * 0.5698) % 1) * 1.1, th: k / 16 }));
// approved flash equipment on this page's drawing (page units; approved cell on the legacy frame shifted -506,-20):
// gas lane Pump A -> header -> Port R, outlet line from the Port R fitting, Flash Unit, Gasometer (same placement as DL)
const SEP_FX = { cellPort: [641.6, 170], cellLane: [[524, 192], [524, 170], [641.6, 170]], lineX: 30, connLine: true, labelSize: 15,
  fu: { x: 700, y: 200, s: 0.46 }, ga: { x: 1075, y: 173, s: 0.46 } };

// explain-panel meaning of every non-PV step
const SEPSTEP = {
  charge0: { t: 'Charge 35 cc at 5,000 psig and 114 °C',
    w: '5,000 psig is the selected working pressure: 2,000 psi above the 3,000 psig reservoir pressure, so the sample stays single-phase liquid while it is transferred and measured. The cell is at reservoir temperature (114 °C). 35 cc is charged (not the 80 cc of the DL test) so the gas liberated later at 200 psig still fits in the 100 cc pump.',
    e: 'One click sets the charged condition: Pump A holds 35.0000 cc at 5,000 psig and 114 °C, Pump B 0.0000 cc.',
    o: 'Pressure equalising at 5,000 psig, then the volume rising 0 → 35.0000 cc with no gas phase.' },
  cond0: { t: 'Cool 114 → 35 °C at the working pressure',
    w: 'The separator test is run at the field separator temperature. Cooling is done at 5,000 psig, so the liquid only contracts and stays single-phase.',
    e: 'Air-bath temperature falling while the pumps hold 5,000 psig; the pistons follow the shrinking liquid.',
    o: 'Temperature and volume falling together: 35.0000 → ' + V_COLD.toFixed(4) + ' cc.' },
  cond1: { t: 'Reduce 5,000 → 200 psig — separator pressure',
    w: 'Lowering the pressure to the separator pressure reproduces the field separator. Above the bubble point at 35 °C the liquid expands only slightly; below it, gas comes out of solution and the volume rises quickly.',
    e: 'Pumps withdraw, pressure falls, a gas cap forms at the top of Pump A.',
    o: 'Final conditions: Separator Temperature 35 °C · Separator Pressure 200 psig.' },
  agit0: { t: 'Agitate Pump A → Pump B → Pump A',
    w: 'Moving the whole sample between the two pumps mixes gas and oil so the separator gas reaches equilibrium with the liquid at 35 °C and 200 psig. The cycle is repeated until the volume no longer changes.',
    e: 'Oil and gas travel together through the manifold into Pump B, are held, then return to Pump A, where the gas settles on top. Pump B ends empty.',
    o: 'Cell volume rising to the stabilized value, then no change on the confirmation cycle.' },
  flash0: { t: 'Connect the Flash Unit',
    w: 'The Flash Unit, balloon and gasometer are connected with every valve closed before any gas is released, so every cc leaving the cell is measured.',
    e: 'Outlet line made up from the cell manifold to the Flash Unit inlet; outlet, balloon and gasometer valves closed.',
    o: 'Line connected, all valves closed, balloon and gasometer at zero.' },
  flash1: { t: 'Release the separator gas',
    w: 'The gas cap is displaced from the top of Pump A at constant 200 psig and 35 °C: first into the balloon, then the excess into the gasometer. When liquid reaches the outlet the flow rate drops and the outlet is closed at once, so no oil is carried over.',
    e: 'Pump A piston rising, gas flowing through the Flash Unit; balloon inflating, then the gasometer piston moving. Remaining volume and gas readings change together.',
    o: 'The flow-rate drop, the outlet closing, and the remaining separator-liquid volume.' }
};

class Component extends DCLogic {
  state = { stage: 'charge', done: {} };
  constructor() { super(); this.state = Object.assign(this.state, this.freshNew('charge')); }

  componentWillUnmount() { this.stop(); }
  stop() { (this.timers || []).forEach(t => PCLK.clearTimeout(t)); this.timers = []; this.ivStop(); }
  at(ms, fn) { this.timers = this.timers || []; this.timers.push(PCLK.setTimeout(fn, PT(ms))); }
  ivStop() {
    (this.ivs || []).forEach(PCLK.clearInterval); this.ivs = [];
    (this.wts || []).forEach(PCLK.clearTimeout); this.wts = [];
    if (this.ticker) { PCLK.clearInterval(this.ticker); this.ticker = null; }
  }
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
  // one agitation stroke - Validation StagePVTest.stroke(), duration parameterised (same as DL)
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

  // cell volume / free gas while the pressure is reduced at 35 C
  reduceAt(P) {
    if (P >= P_ONSET) return { V: V_COLD * (1 + C_LIQ * (P_WORK - P)), G: 0 };
    const s = Math.pow(Math.max(0, Math.min(1, (P_ONSET - P) / (P_ONSET - P_SEP))), 1.6);
    return { V: V_ONSET + (SEP.vPre - V_ONSET) * s, G: SEP.gPre * s };
  }
  // free gas during agitation: grows from the pre-agitation gas to the equilibrium gas cap
  gasAgit(V) { const k = Math.max(0, Math.min(1, (V - SEP.vPre) / (SEP.stab - SEP.vPre))); return SEP.gPre + k * (SEP.gEq - SEP.gPre); }
  fwdPhi(V, pB) { const vA0 = V - pB; return vA0 > 1e-6 ? Math.max(0, Math.min(1, (PUMP_CAP - pB) / vA0)) : 1; }
  // one agitation cycle: A -> B (complete sample) -> hold -> B -> A -> gas settles on top of Pump A
  cycle(k) {
    const c = SEP, confirm = k >= c.cycles.length, target = confirm ? c.stab : c.cycles[k];
    const v0 = this.state.V;
    const pre = (confirm ? 'Confirmation cycle ' : 'Agitation cycle ') + (k + 1) + ' — ';
    this.setState({ pvPhase: 'a2b', action: pre + 'transferring the whole sample Pump A → Pump B (' + v0.toFixed(4) + ' cc).' });
    this.tween(TS * 2 + HOLD + SETTLE, 0, 1, (f) => { const V = v0 + (target - v0) * f; this.setState({ V, pB: 0, G: this.gasAgit(V) }); }, null, true);
    this.stroke('a2b', () => {
      this.setState({ pvPhase: 'hold', action: pre + 'complete sample in Pump B — oil and gas mixing at 35 °C / 200 psig.' });
      this.wait(HOLD * 1000, () => {
        this.setState({ action: pre + 'returning the sample Pump B → Pump A.' });
        this.stroke('b2a', () => {
          this.setState({ pvPhase: 'stab', action: pre + 'Pump B empty — gas separating to the top of Pump A.' });
          this.tween(SETTLE, this.state.pvAgit || 0, 0, (a) => this.setState({ pvAgit: a }), () => {
            const cyc = this.state.cyc.concat([{ n: k + 1, v: target, d: r4(target - v0), confirm }]);
            this.setState({ pvAgit: 0, pvXfer: 0, V: target, pB: 0, G: this.gasAgit(target), cyc, pvPhase: 'idle',
              action: confirm ? 'Confirmation cycle complete — no further volume change: equilibrium at separator conditions.'
                : 'Cycle ' + (k + 1) + ' recorded: ' + target.toFixed(4) + ' cc (+' + (target - v0).toFixed(4) + ' cc).' });
            this.wait(600, () => {
              if (!confirm) { this.cycle(k + 1); return; }
              this.done({ stabilized: c.stab, V: c.stab, pB: 0, G: c.gEq, stageTag: 'Volume stabilized',
                action: 'VOLUME STABILIZED — ' + c.stab.toFixed(4) + ' cc at 200 psig / 35 °C: oil ' + c.remaining.toFixed(4) +
                  ' cc under a ' + c.gEq.toFixed(4) + ' cc gas cap in Pump A. Pump B empty (0.0000 cc).' });
            });
          });
        }, TS);
      });
    }, TS);
  }
  // gas removal - DL timeline with gasometer: balloon first, then excess gas to the gasometer, then flow drop -> close
  collectGas() {
    const c = SEP, dur = 18.0, balEnd = 0.70, v0 = this.state.V, E = FXX().fxE, R = FXX().fxR;
    const durS = PT(dur * 1000) / 1000;
    this.setState({ busy: true, stageTag: 'Releasing gas', xStep: 'gas', xU: 0, gasClk: 0, closedNote: '', gaso: 0, balloon: 0 });
    this.tween(dur, 0, 1, (u) => {
      const bF = E(R(0.53, balEnd, u)), gF = E(R(0.77, 0.90, u));
      const removed = c.fBal * bF + (1 - c.fBal) * gF;
      const V = v0 + (c.remaining - v0) * removed;
      const holding = (u >= 0.38 && u < 0.50) || (u >= 0.70 && u < 0.76);
      const flow = u < 0.13 ? 0 : holding ? 0 : u < 0.90 ? FLOW : u < 0.95 ? FLOW * (1 - R(0.90, 0.93, u)) + 0.02 * R(0.90, 0.93, u) : 0;
      const act = u < 0.07 ? 'Preparing gas release — cell outlet valve closed.'
        : u < 0.13 ? 'Opening the cell outlet valve.'
        : u < 0.38 ? 'Separator gas leaving the top of Pump A — travelling to the Flash Unit.'
        : u < 0.44 ? 'Gas held at the closed balloon valve.'
        : u < 0.50 ? 'Opening the balloon valve.'
        : u < balEnd ? 'Gas flowing into the balloon at 0.5 mL/min — cell held at 200 psig / 35 °C.'
        : u < 0.76 ? 'Balloon at ' + c.balloon.toFixed(2) + ' psig — balloon valve closing, gasometer valve opening.'
        : u < 0.90 ? 'Excess gas flowing into the gasometer — ' + Math.round(c.gasometer * gF) + ' cc; cell volume ' + V.toFixed(4) + ' cc.'
        : u < 0.95 ? 'FLOW RATE DROP DETECTED — liquid reaching the outlet.' : 'Closing the cell outlet — no oil carried over.';
      this.setState({ xU: u, gasClk: u * durS, V, pB: 0, G: Math.max(0, V - c.remaining), P: c.target,
        balloon: c.balloon * bF, gaso: c.gasometer * gF, gasoRouting: u >= 0.74 && u < 0.95,
        flow, cellOpen: u >= 0.10 && u < 0.97, action: act });
    }, () => this.done({ xStep: '', xU: 1, V: c.remaining, pB: 0, G: 0, balloon: c.balloon, gaso: c.gasometer, gasoRouting: false,
      flow: 0, cellOpen: false, remaining: c.remaining, closedNote: 'CELL OUTLET CLOSED', stageTag: 'Gas removed',
      action: 'Gas removed — balloon ' + c.balloon.toFixed(2) + ' psig · gasometer ' + c.gasometer + ' cc · remaining separator liquid ' +
        c.remaining.toFixed(4) + ' cc at 200 psig / 35 °C. Outlet closed on the flow-rate drop.' }), false);
  }

  runNew() {
    const st = this.state, s = st.step, E = PVX().easeIO, C = PVX().clamp01;
    this.stop();
    this.startTicker();
    const id = st.stage;
    if (id === 'charge') {
      // Charge 35 cc: one click sets the completed charge condition directly (no intermediate values), as in the DL test
      this.stop();
      this.done({ cU: 1, P: P_WORK, V: V_CHARGE, T: T_RES, stageTag: 'Charge complete', done: { ...this.state.done, charge: true },
        action: 'CHARGE COMPLETE — Pump A 35.0000 cc, Pump B 0.0000 cc at 5,000 psig and 114 °C · sample inlet valve closed. Run the first PV test.' });
      return;
    }
    if (id === 'pv1' || id === 'pv2') {
      const first = id === 'pv1';
      if (first) {
        this.setState({ busy: true, pvRun: true, runKey: Date.now(), rows: [], pvN: 0, pvCount: 0, pvConfirmed: false, stageTag: 'First PV test',
          action: 'First PV test — Validation 12-point sequence on the 35 cc charge at 114 °C.' });
        return;
      }
      this.setState({ busy: true, stageTag: 'Disconnecting Flash Unit', xStep: 'disc', flow: 0,
        action: 'Flash Unit valves closed — disconnecting the outlet line. Balloon ' + SEP.balloon.toFixed(2) + ' psig and gasometer ' + SEP.gasometer + ' cc recorded.' });
      this.tween(D_DISC, 1, 0, (k) => this.setState({ conn: k }), () => {
        this.setState({ conn: 0, connected: false, xStep: '', pvRun: true, runKey: Date.now(), rows: [], pvN: 0, pvCount: 0, pvConfirmed: false,
          stageTag: 'Final PV test', action: 'Final PV test on the remaining separator liquid — ' + V_REM.toFixed(4) + ' cc at 200 psig, temperature held at 35 °C.' });
      }, true);
      return;
    }
    if (id === 'cond' && s === 0) {
      const v0 = st.V, t0 = st.T;
      this.setState({ busy: true, stageTag: 'Cooling', action: 'Cooling the cell from 114 °C to 35 °C at 5,000 psig — the liquid contracts.' });
      this.tween(D_COOL, 0, 1, (f) => this.setState({ T: t0 + (T_SEP - t0) * f, V: v0 + (V_COLD - v0) * f, P: P_WORK, G: 0,
        action: 'Cooling at 5,000 psig — ' + (t0 + (T_SEP - t0) * f).toFixed(1) + ' °C · ' + (v0 + (V_COLD - v0) * f).toFixed(4) + ' cc.' }),
      () => this.done({ T: T_SEP, V: V_COLD, P: P_WORK, stageTag: 'At 35 °C',
        action: 'Cell at 35 °C and 5,000 psig — liquid contracted to ' + V_COLD.toFixed(4) + ' cc, still single-phase. Reduce the pressure to 200 psig.' }), true);
      return;
    }
    if (id === 'cond' && s === 1) {
      const p0 = st.P;
      this.setState({ busy: true, stageTag: 'Reducing pressure', pvPhase: 'set', action: 'Reducing pressure from 5,000 psig to 200 psig at 35 °C.' });
      this.tween(D_REDUCE, 0, 1, (f) => {
        const P = p0 + (P_SEP - p0) * f, q = this.reduceAt(P);
        const D = q.G > 0 ? (f < 0.8 ? 0.7 : 0.7 * (1 - (f - 0.8) / 0.2)) : 0;
        this.setState({ P, V: q.V, G: q.G, pB: 0, D,
          action: P > P_ONSET ? 'Reducing pressure — ' + fmtP(Math.round(P)) + ': single-phase liquid expanding slightly.'
            : 'Reducing pressure — ' + fmtP(Math.round(P)) + ': gas coming out of solution, volume rising.' });
      }, () => this.done({ P: P_SEP, V: SEP.vPre, G: SEP.gPre, D: 0, pvPhase: 'idle', stageTag: 'Separator conditions', done: { ...this.state.done, cond: true },
        action: 'SEPARATOR CONDITIONS — Separator Temperature 35 °C · Separator Pressure 200 psig. Volume ' + SEP.vPre.toFixed(4) + ' cc with a gas cap. Agitate to equilibrium.' }), true);
      return;
    }
    if (id === 'agit') { this.setState({ busy: true, stageTag: 'Agitating', cyc: [], stabilized: null }); this.cycle(0); return; }
    if (id === 'flash' && s === 0) {
      this.setState({ busy: true, stageTag: 'Connecting Flash Unit', xStep: 'conn', conn: 0,
        action: 'Connecting the cell outlet line to the Flash Unit inlet — all valves closed.' });
      this.tween(D_CONN, 0, 1, (k) => this.setState({ conn: k }), () => this.done({ conn: 1, connected: true, xStep: '', stageTag: 'Flash Unit connected',
        action: 'Flash Unit connected — cell outlet, balloon and gasometer valves closed; balloon 0.00 psig, gasometer 0 cc. Release the gas.' }));
      return;
    }
    if (id === 'flash' && s === 1) { this.collectGas(); return; }
  }
  // live mirror of the embedded Validation PV engine
  pvSync(ps) {
    if (!this.state.pvRun) return;
    const n = ps.pvN || 0, first = this.state.stage === 'pv1';
    const pts = first ? PV1_PTS : PV2_PTS, psP = first ? PSAT1.p : PSAT2.p;
    this.setState({ P: ps.pvPressure, V: ps.pvVolume, pvN: n, pvCount: ps.pvCount || 0, pvConfirmed: !!ps.pvConfirmed, pvPhaseE: ps.pvPhase,
      rows: pts.slice(0, n).map(([p, v]) => ({ p, v, psat: p === psP })) });
  }
  pvDone() {
    if (!this.state.busy) return;
    if (this.state.stage === 'pv1') {
      this.done({ P: P_WORK, V: V_CHARGE, T: T_RES, done: { ...this.state.done, pv1: true }, stageTag: 'First PV complete',
        action: 'FIRST PV COMPLETE — Psat 2,500 psig @ 36.35 cc (fitted-line intersection). Sample returned to the working condition: 5,000 psig at 114 °C · 35.0000 cc.' });
      return;
    }
    this.done({ P: P_SEP, V: V_REM, T: T_SEP, G: 0, done: { ...this.state.done, pv2: true }, stageTag: 'Separator test complete',
      action: 'FINAL PV COMPLETE — separator liquid Psat 200 psig @ 27.98 cc at 35 °C. Cell back at 200 psig · ' + V_REM.toFixed(4) + ' cc.' });
  }
  // clean beginning state of a stage (inherits the previous stage's end condition)
  freshNew(id) {
    const base = { step: 0, busy: false, chain: false, P: P_WORK, V: V_CHARGE, T: T_RES, G: 0, pB: 0, D: 0,
      pvPhase: 'idle', pvPhaseE: 'idle', pvN: 0, pvCount: 0, pvXfer: 0, pvAgit: 0, pvFront: 0, pvTail: 0, pvFlowD: 0,
      pvConfirmed: false, rows: [], cyc: [], stabilized: null, conn: 0, connected: false, xStep: '', xU: 0, gasClk: 0,
      flow: 0, balloon: 0, gaso: 0, gasoRouting: false, cellOpen: false, closedNote: '', remaining: null,
      pvRun: false, runKey: 0, cU: 1, stageTag: 'Ready', action: '' };
    if (id === 'charge') return Object.assign(base, { P: 0, V: 0, cU: 0,
      action: 'PVT cell empty and evacuated at 114 °C — charge 35 cc at the 5,000 psig working pressure (reservoir 3,000 psig + 2,000 psi).' });
    if (id === 'pv1') return Object.assign(base, { action: 'Charged: 35.0000 cc at 5,000 psig and 114 °C — run the first PV test (12 points, fitted-line Psat).' });
    if (id === 'cond') return Object.assign(base, { action: 'Sample at the working condition 5,000 psig / 114 °C · 35.0000 cc. Cool to 35 °C, then reduce to 200 psig.' });
    if (id === 'agit') return Object.assign(base, { P: P_SEP, V: SEP.vPre, T: T_SEP, G: SEP.gPre,
      action: 'At separator conditions (35 °C · 200 psig), ' + SEP.vPre.toFixed(4) + ' cc with free gas. Agitate Pump A → Pump B → Pump A to equilibrium.' });
    if (id === 'flash') return Object.assign(base, { P: P_SEP, V: SEP.stab, T: T_SEP, G: SEP.gEq, stabilized: SEP.stab, cyc: this.cycList(),
      action: 'Equilibrium at 200 psig / 35 °C — ' + SEP.stab.toFixed(4) + ' cc in Pump A (gas cap ' + SEP.gEq.toFixed(4) + ' cc). Connect the Flash Unit.' });
    return Object.assign(base, { P: P_SEP, V: V_REM, T: T_SEP, stabilized: SEP.stab, balloon: SEP.balloon, gaso: SEP.gasometer, remaining: V_REM,
      closedNote: 'CELL OUTLET CLOSED', conn: 1, connected: true,
      action: 'Gas removed — ' + V_REM.toFixed(4) + ' cc of separator liquid at 200 psig / 35 °C. Disconnect the Flash Unit and run the final PV test.' });
  }
  cycList() {
    return SEP.cycles.concat([SEP.stab]).map((v, i, a) => ({ n: i + 1, v, d: r4(v - (i ? a[i - 1] : SEP.vPre)), confirm: i === a.length - 1 }));
  }
  // completed-stage view (navigation back to a finished stage)
  doneNew(id) {
    const f = this.freshNew(id), end = { step: STEPS[id], stageTag: 'Complete' };
    if (id === 'charge') return Object.assign(f, end, { P: P_WORK, V: V_CHARGE, cU: 1, action: 'Charge complete — 35.0000 cc at 5,000 psig and 114 °C.' });
    if (id === 'pv1' || id === 'pv2') {
      const pts = id === 'pv1' ? PV1_PTS : PV2_PTS, ps = id === 'pv1' ? PSAT1 : PSAT2;
      return Object.assign(f, end, { pvN: 12, pvCount: 12, pvConfirmed: true, rows: pts.map(([p, v]) => ({ p, v, psat: p === ps.p })),
        conn: 0, connected: false,
        action: id === 'pv1' ? 'First PV complete — Psat 2,500 psig @ 36.35 cc at 114 °C.' : 'Final PV complete — Psat 200 psig @ 27.98 cc at 35 °C.' });
    }
    if (id === 'cond') return Object.assign(f, end, { P: P_SEP, V: SEP.vPre, T: T_SEP, G: SEP.gPre,
      action: 'Separator conditions reached — Separator Temperature 35 °C · Separator Pressure 200 psig.' });
    if (id === 'agit') return Object.assign(f, end, { P: P_SEP, V: SEP.stab, T: T_SEP, G: SEP.gEq, stabilized: SEP.stab, cyc: this.cycList(),
      action: 'Volume stabilized — ' + SEP.stab.toFixed(4) + ' cc at 200 psig / 35 °C, Pump B empty.' });
    return Object.assign(f, end, { P: P_SEP, V: V_REM, T: T_SEP, G: 0, balloon: SEP.balloon, gaso: SEP.gasometer, remaining: V_REM,
      closedNote: 'CELL OUTLET CLOSED', conn: 1, connected: true, action: 'Gas removed — remaining separator liquid ' + V_REM.toFixed(4) + ' cc.' });
  }

  runStep() {
    if (this.state.busy) return;
    if (this.state.step >= STEPS[this.state.stage]) return;
    this.runNew();
  }
  done(extra) {
    const total = STEPS[this.state.stage];
    const step = Math.min(total, this.state.step + 1);
    const fin = step >= total ? { done: { ...this.state.done, ...((extra && extra.done) || {}), [this.state.stage]: true } } : {};
    this.setState(Object.assign({ busy: false, step }, extra || {}, fin));
    if (this.state.chain && step < total) { this.at(900, () => this.runStep()); return; }
    this.setState({ chain: false });
    if (this.ticker) { PCLK.clearInterval(this.ticker); this.ticker = null; }
  }
  runAll() {
    if (this.state.busy || this.state.chain) return;
    if (this.state.step >= STEPS[this.state.stage]) return;
    this.setState({ chain: true });
    this.runStep();
  }
  goStage(id) {
    if (id === this.state.stage) return;
    this.stop();
    const view = this.state.done[id] ? this.doneNew(id) : this.freshNew(id);
    this.setState(Object.assign(view, { stage: id }));
  }
  resetStage() {
    this.stop();
    const id = this.state.stage, done = { ...this.state.done };
    delete done[id];
    this.setState(Object.assign(this.freshNew(id), { stage: id, done }));
  }
  resetAll() { this.stop(); this.setState(Object.assign(this.freshNew('charge'), { stage: 'charge', done: {} })); }

  /* ---- shared procedure panel (ProcCtl.js): 6 stages; Pause / Restart / Next / Explain this stage ---- */
  pcInfo() {
    const st = this.state, id = st.stage, idx = IDS.indexOf(id);
    const total = STEPS[id], step = st.step, complete = step >= total, busy = !!st.busy || (!!st.chain && PCLK.busy()), pz = PCLK.paused();
    const names = STEPN[id], si = Math.min(step, total - 1);
    return { N: IDS.length, k: idx, unit: 'Stage',
      title: SNAME[id] + ' · ' + (complete ? 'complete' : (total > 1 ? 'Step ' + (si + 1) + ' / ' + total + ': ' : '') + names[si]), q: st.action || '',
      status: busy ? (pz ? 'paused' : 'running') : complete ? 'complete' : 'ready',
      allDone: IDS.every(k => !!st.done[k]), frac: (step + (busy ? 0.5 : 0)) / total, doneMask: IDS.map(k => !!st.done[k]),
      canPrev: idx > 0, canNext: idx < IDS.length - 1, canRestart: busy || step > 0 || !!st.done[id],
      runLabel: (total > 1 ? 'Run Step ' + (si + 1) + ': ' : 'Run: ') + names[si],
      runAll: total > 1 ? 'Run Whole Stage' : null, runAllDisabled: busy || complete || !!st.chain,
      again: 'Run Separator Test Again', reset: 'Reset Separator Test', resetTitle: 'Reset the whole Separator Test' };
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

  /* ---- Explain this stage (StepGuide drawer): pvp = StepGuide PV-phase texts, pe = live StagePVTest state ---- */
  describe(pvp, pe) {
    const st = this.state, id = st.stage, first = id === 'pv1';
    const num = (x, d) => (x == null || isNaN(x)) ? '—' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    const V = (l, v, u) => ({ l, v, u: u || '' });
    if ((id === 'pv1' || id === 'pv2') && (st.pvRun || st.done[id]) && pe && pvp) {
      const q = pvp[pe.pvPhase || 'idle'] || pvp.idle;
      const sc = first ? '5,000 psig and 35.0000 cc at 114 °C' : '200 psig and ' + V_REM.toFixed(4) + ' cc at 35 °C';
      const fix = (t) => String(t || '').replace(/5,000 psi and 30\.0 cc/g, sc).replace(/5,000 psi with 30\.0 cc/g, sc.replace(' and ', ' with '));
      return { title: 'Separator Test — ' + (first ? 'First PV test (reservoir fluid, 114 °C)' : 'Final PV test (separator liquid, 35 °C)') + ' — ' + q.t,
        tag: pe.pvRunning ? 'RUNNING · POINT ' + ((pe.pvStep || 0) + 1) + ' / 12' : (pe.pvReturned ? 'COMPLETE' : 'READY'), busy: !!pe.pvRunning,
        d: fix(q.d), w: q.w + (first ? ' This first PV test is run on the reservoir fluid at 114 °C before the separator stage.'
          : ' This final PV test is run on the liquid left after the separator flash, at the separator temperature of 35 °C: its Psat is expected close to the 200 psig separator pressure.'),
        e: q.e, o: q.o,
        vals: [V('Cell pressure', num(pe.pvPressure, 0), 'psig'), V('Cell volume', num(pe.pvVolume, 4), 'cc'),
          V('Temperature', first ? '114.0' : '35.0', '°C'), V('Points recorded', num(pe.pvN, 0) + ' / 12'),
          V(first ? 'First PV Psat' : 'Final PV Psat', pe.pvConfirmed ? (first ? '2,500 @ 36.35' : '200 @ 27.98') : '—', pe.pvConfirmed ? 'psig · cc' : '')] };
    }
    const key = id === 'pv1' ? 'pv1' : id === 'pv2' ? 'pv2' : id + Math.min(st.step, STEPS[id] - 1);
    const m = SEPSTEP[key] || (id === 'pv1' ? { t: 'First PV test — ' + (st.done.pv1 ? 'complete' : 'ready'), w: 'The Validation PV sequence (12 points: set pressure, agitate A → B → A, stabilize, record) is run on the 35 cc charge at 114 °C. Points are plotted one by one; after the last point two lines are fitted and extended — their intersection is Psat.', e: 'Cell at 5,000 psig and 114 °C, 35.0000 cc.', o: 'Press Run to start the 12-point sequence.' }
      : { t: 'Final PV test — ' + (st.done.pv2 ? 'complete' : 'ready'), w: 'The Flash Unit is disconnected (valves already closed), then the same 12-point PV sequence is run on the remaining separator liquid at 35 °C — its own volume, not the 35 cc charge.', e: 'Cell at 200 psig and 35 °C with the remaining liquid.', o: 'The new, much lower Psat of the separator liquid.' });
    return { title: 'Separator Test — Stage ' + (IDS.indexOf(id) + 1) + ' / 6 · ' + m.t,
      tag: (st.busy ? 'RUNNING · ' : '') + (STEPS[id] > 1 ? 'STEP ' + Math.min(STEPS[id], st.step + 1) + ' / ' + STEPS[id] + ' · ' : '') + (st.stageTag || ''),
      busy: !!st.busy, d: st.action || '', w: m.w, e: m.e, o: m.o,
      vals: [V('Cell pressure', num(st.P, 0), 'psig'), V('Cell volume', num(st.V, 4), 'cc'), V('Cell temperature', num(st.T, 1), '°C'),
        V('Balloon', num(st.balloon, 2), 'psig'), V('Gasometer', num(st.gaso, 0), 'cc'),
        V('Remaining liquid', st.remaining == null ? '—' : num(st.remaining, 4), st.remaining == null ? '' : 'cc')] };
  }

  // view model for the shared Flash Unit / Gasometer drawing (FlashHost): this page's own values and valve timing only
  fxView() {
    const st = this.state, id = st.stage, stageDn = !!st.done[id];
    if (!(id === 'flash' || (id === 'pv2' && !st.pvRun && !stageDn))) return null;
    const F = FXX(), R = F.fxR, E = F.fxE;
    const gasStep = st.xStep === 'gas', u = gasStep ? st.xU || 0 : 0, fade = gasStep ? 1 - R(0.95, 1, u) : 0;
    const vCell = gasStep ? E(R(0.07, 0.13, u)) * (1 - E(R(0.95, 1, u))) : 0;
    const vBal = gasStep ? E(R(0.44, 0.50, u)) * (1 - E(R(0.70, 0.74, u))) : 0;
    const vGas = gasStep ? E(R(0.72, 0.76, u)) * (1 - E(R(0.95, 1, u))) : 0;
    const bal = st.balloon || 0, gaso = st.gaso || 0, sp = Gasometer.split(gaso);
    const flow = {};
    if (gasStep && u >= 0.13 && fade > 0) {
      if (u >= 0.72) flow.capGas = { p: u, a: fade };
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
    return { mode: 'system', key: 'sep', opt: { inline: true, layout: SEP_FX, labels: true }, V: V };
  }

  renderVals() {
    const st = this.state, X = PVX(), F = FXX();
    const C = X.clamp01, R = F.fxR, E = F.fxE;
    const id = st.stage, idx = IDS.indexOf(id), total = STEPS[id], step = st.step, busy = !!st.busy, complete = step >= total;
    const P = st.P, V = st.V, T = st.T == null ? T_RES : st.T, phase = st.pvPhase || 'idle';
    const stageDn = !!st.done[id];
    // a value is shown once the procedure has reached it (current stage past that step, or a later stage)
    const reach = (sid, n) => { const i = IDS.indexOf(sid); return idx > i || (idx === i && step >= n) || !!st.done[sid]; };

    // ---- phase split between the pumps (100 cc = 173 px of bore); Pump B only ever holds sample in transit ----
    const xfer = C(st.pvXfer || 0), agit = C(st.pvAgit || 0);
    const Gt = Math.max(0, Math.min(V, st.G || 0));
    const Lq = Math.max(0, V - Gt);
    const mv = this.fwdPhi(V, 0) * xfer;
    const oilA = Lq * (1 - mv), gasA = Gt * (1 - mv), oilB = Lq * mv, gasB = Gt * mv;
    const vA = oilA + gasA, vB = oilB + gasB;
    const dsp = C(Math.max(st.D || 0, 0.8 * agit));
    const PXC = 1.73;
    const h = Math.min(173, PXC * vA), hB = Math.min(173, PXC * vB);
    const dA = dsp * C(oilA / Math.max(0.01, 0.15 * Lq)), dB = dsp * C(oilB / Math.max(0.01, 0.15 * Lq));
    const gh = Math.min(h, PXC * gasA * (1 - dA));
    const ghB = Math.min(hB, PXC * gasB * (1 - dB));
    const gasOn = Gt > 0.002;
    const gt = C(Gt / Math.max(0.01, SEP.gEq));
    const clk = this.bub || 0;
    const bubs = (x0, top, bot, gDisp) => {
      const nb = gasOn ? C(gDisp / Math.max(0.3, 0.25 * SEP.gEq)) : 0, grow = 0.55 + 0.45 * gt, H = bot - top;
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

    // ---- agitation route through the cell manifold (Validation) ----
    const xferOn = phase === 'a2b' || phase === 'b2a';
    const route = phase === 'b2a' ? X.ROUTE_BA : X.ROUTE_AB, L = X.LINE_L;
    const fl = L * C(st.pvFront || 0), tl = L * C(st.pvTail || 0), band = xferOn ? Math.max(0, fl - tl) : 0;
    const Dd = L * (st.pvFlowD || 0);
    const specks = [0, 1, 2, 3, 4, 5, 6].map((k) => {
      const sp = ((k * L / 7 + Dd) % L + L) % L, inside = band > 0.5 && sp > tl + 3 && sp < fl - 3;
      const gas = gasOn && k % 2 === 0, pt = X.routePt(route, sp);
      return { x: pt[0].toFixed(1), y: pt[1].toFixed(1), r: gas ? 1.7 : 1.05, fill: gas ? '#e2fff2' : '#fff3c4', o: inside ? (gas ? 0.95 : 0.8) : 0 };
    });
    const fp = X.routePt(route, fl), fr = st.pvFront || 0;

    // ---- readouts ----
    const pTxt = fmtP(Math.round(P)), vTxt = V.toFixed(4) + ' cc', tTxt = fmtT(T);
    const ang = (-140 + 100 * C((5000 - P) / 5000)) * Math.PI / 180;
    const empty = id === 'charge' && V < 0.005;
    const phaseText = empty ? 'CELL EMPTY · EVACUATED' : gasOn ? 'LIQUID + SEPARATOR GAS' : 'SINGLE-PHASE LIQUID · GAS IN SOLUTION';
    const phaseColor = gasOn ? 'var(--grn)' : 'var(--cap2)';
    // temperature: air-bath tint between reservoir (warm) and separator (cool) temperature
    const tf = C((T - T_SEP) / (T_RES - T_SEP));
    const mix = (a, b) => Math.round(b + (a - b) * tf);
    const rgb = mix(224, 74) + ',' + mix(118, 158) + ',' + mix(60, 232);
    const cooling = busy && id === 'cond' && step === 0;

    // ---- Flash Unit : DL sketch + transfer lanes ----
    const flashOn = id === 'flash' || (id === 'pv2' && !st.pvRun && !stageDn);
    const conn = C(st.conn || 0);
    const pl = { dur: 18.0, balEnd: 0.70, gaso: true };
    const gasStep = st.xStep === 'gas', u = gasStep ? st.xU || 0 : 0;
    // PVT-cell outlet valve (Port R); the Flash Unit / Gasometer valves are drawn by FlashHost (fxView)
    const vCell = gasStep ? E(R(0.07, 0.13, u)) * (1 - E(R(0.95, 1, u))) : 0;
    const valve = (a, cx, cy) => ({ tr: 'rotate(' + (90 * a).toFixed(1) + ' ' + cx + ' ' + cy + ')', c: a > 0.5 ? '#46d39a' : '#8fa3c2' });
    const XPH = F.FX_PHASES;
    let xPanel = null;
    if (st.xStep === 'disc') xPanel = { title: 'FLASH UNIT DISCONNECTION', detail: 'Valves closed · outlet line removed · gas readings recorded', ph: 4, col: '#9cc6ff' };
    else if (st.xStep === 'conn') xPanel = { title: 'FLASH UNIT CONNECTION', detail: 'Outlet line being made up · all valves closed', ph: conn < 1 ? 2 : 4, col: '#9cc6ff' };
    else if (gasStep) {
      const ph = u < 0.07 ? 0 : u < 0.13 ? 1 : u < 0.53 ? 2 : u < 0.90 ? 3 : 4;
      const det = u < 0.07 ? 'Cell outlet valve closed' : u < 0.13 ? 'Cell outlet valve opening'
        : u < 0.38 ? 'Gas cap → outlet line → Flash Unit' : u < 0.44 ? 'Gas held at the closed balloon valve'
        : u < 0.53 ? 'Balloon valve opening' : u < pl.balEnd ? 'Gas entering the balloon · ' + (st.balloon || 0).toFixed(2) + ' psig'
        : u < 0.76 ? 'Balloon full · routing excess gas to the gasometer'
        : u < 0.90 ? 'Gasometer ' + Math.round(st.gaso || 0) + ' cc · cell ' + V.toFixed(4) + ' cc'
        : u < 0.95 ? 'Flow-rate drop · liquid at the outlet' : 'Outlet closing · no oil carry-over';
      xPanel = { title: 'GAS RELEASE · ' + XPH[ph], detail: det, ph, col: '#8cc4ff' };
    }
    const seg = [0, 1, 2, 3, 4].map((i) => 'fill:' + (!xPanel ? 'none' : i < xPanel.ph || xPanel.ph === 4 ? '#46d39a' : i === xPanel.ph ? xPanel.col : 'rgba(150,175,210,.22)') + ';');

    // ---- layout ----
    const pvOn = (id === 'pv1' || id === 'pv2') && (!!st.pvRun || stageDn);

    // ---- cell tag ----
    let tag = empty ? 'Empty · evacuated · ' + tTxt : 'Stable · ' + pTxt + ' · ' + tTxt, tone = empty ? 'busy' : 'good';
    if (busy) {
      tone = 'busy';
      if (id === 'charge') tag = 'Charging · ' + vTxt + ' · ' + pTxt;
      else if (id === 'cond' && step === 0) tag = 'Cooling · ' + tTxt + ' · ' + pTxt;
      else if (id === 'cond') tag = 'Reducing pressure · ' + pTxt + ' · ' + tTxt;
      else if (id === 'agit') tag = (st.cyc.length >= SEP.cycles.length ? 'Confirmation cycle' : 'Agitation cycle ' + (st.cyc.length + 1)) + ' · ' + vTxt;
      else if (id === 'flash' && step === 0) tag = 'Connecting Flash Unit';
      else if (id === 'flash') tag = 'Releasing gas · ' + pTxt + ' · ' + tTxt;
      else if (id === 'pv2') tag = 'Disconnecting Flash Unit';
    } else if (reach('cond', 2) && idx <= IDS.indexOf('flash')) tag = 'Separator Temperature: 35 °C · Separator Pressure: 200 psig';
    const tagCol = tone === 'good' ? 'var(--grn)' : 'var(--accb3)';

    // ---- side panel ----
    const kv = (k, v, col) => ({ k, v, c: col || 'var(--txt)' });
    const dis = 'var(--dis)';
    const charged = reach('charge', 1);
    const rec = [
      kv('Charge (114 °C)', charged ? '35.0000 cc @ 5,000 psig' : busy && id === 'charge' ? vTxt : '—', charged ? 'var(--txt)' : dis),
      kv('Cooled @ 5,000 psig', reach('cond', 1) ? V_COLD.toFixed(4) + ' cc @ 35 °C' : '—', reach('cond', 1) ? 'var(--txt)' : dis),
      kv('At 200 psig (pre-agitation)', reach('cond', 2) ? SEP.vPre.toFixed(4) + ' cc' : '—', reach('cond', 2) ? 'var(--txt)' : dis),
      kv('Stabilized (Pump A / B)', reach('agit', 1) ? SEP.stab.toFixed(4) + ' / 0.0000 cc' : '—', reach('agit', 1) ? 'var(--amb)' : dis),
      kv('Balloon pressure', (st.balloon || 0) > 0.004 ? st.balloon.toFixed(2) + ' psig' : '—', (st.balloon || 0) > 0.004 ? 'var(--accb3)' : dis),
      kv('Gasometer', (st.gaso || 0) > 0.5 ? Math.round(st.gaso) + ' cc' : '—', (st.gaso || 0) > 0.5 ? '#0e8f7a' : dis),
      kv('Remaining separator liquid', reach('flash', 2) ? V_REM.toFixed(4) + ' cc' : '—', reach('flash', 2) ? 'var(--txt)' : dis)
    ];
    const psat1On = reach('pv1', 1), psat2On = reach('pv2', 1);
    const pvRes = [
      { k: 'First PV · reservoir fluid · 114 °C', v: psat1On ? '2,500 psig @ 36.35 cc' : '—', c: psat1On ? 'var(--red)' : dis },
      { k: 'Final PV · separator liquid · 35 °C', v: psat2On ? '200 psig @ 27.98 cc' : '—', c: psat2On ? 'var(--red)' : dis }
    ];
    const cycRows = st.cyc.map((cy) => ({ n: cy.confirm ? 'CHK' : String(cy.n), v: cy.v.toFixed(4), d: cy.confirm ? '0.0000  stable' : '+' + cy.d.toFixed(4),
      col: cy.confirm ? 'var(--grn)' : 'var(--amb)',
      row: "display:grid; grid-template-columns:34px 1fr 1fr; align-items:center; height:19px; padding:0 8px; border-bottom:1px solid var(--line); font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px; background:" + (cy.confirm ? 'rgba(29,138,90,.10)' : 'transparent') + ';' }));
    if (busy && id === 'agit') cycRows.push({ n: '•', v: V.toFixed(4), d: 'agitating', col: 'var(--blue)',
      row: "display:grid; grid-template-columns:34px 1fr 1fr; align-items:center; height:19px; padding:0 8px; border-bottom:1px solid var(--line); font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px; background:rgba(47,111,208,.08); color:var(--blue);" });

    // highlight card
    let big = '', big2 = '', bigT = '', bigCol = 'var(--txt2)';
    // (stage 1 working-pressure card removed 2026-10-21: the reasoning is in Explain This Stage, the reading in Live readings)
    if (id === 'cond' && step === 0 && !busy) { bigT = 'NEXT · COOL AT 5,000 psig'; big = '114 °C → 35 °C'; bigCol = 'var(--blue)'; }
    else if (id === 'cond' && step === 1 && !busy) { bigT = 'NEXT · REDUCE AT 35 °C'; big = '5,000 → 200 psig'; bigCol = 'var(--blue)'; }
    else if (reach('cond', 2) && idx <= IDS.indexOf('flash')) { bigT = 'SEPARATOR CONDITIONS'; big = 'Separator Temperature: 35 °C'; big2 = 'Separator Pressure: 200 psig'; bigCol = 'var(--grn)'; }
    else if (id === 'pv2') { bigT = 'AFTER FLASH · SEPARATOR LIQUID'; big = V_REM.toFixed(4) + ' cc @ 200 psig'; big2 = 'Temperature held at 35 °C'; bigCol = 'var(--grn)'; }
    else if (id === 'cond') { bigT = busy && step === 0 ? 'COOLING AT 5,000 psig' : 'REDUCING AT 35 °C'; big = tTxt + ' · ' + pTxt; bigCol = 'var(--blue)'; }

    // ---- stage navigation ----
    const dlStages = IDS.map((sid, i) => {
      const dn = !!st.done[sid], on = sid === id;
      const tg = dn ? 'Complete' : on ? (busy ? 'Running' : 'Active') : 'Ready';
      return { name: (i + 1) + ' · ' + SNAME[sid], tag: tg,
        tagColor: dn ? 'var(--grn)' : on ? 'var(--blue)' : 'var(--mut)', color: 'var(--txt)',
        onClick: () => { if (sid !== id) { PCLK.clearAll(); PCLK.resume(); this.goStage(sid); } },
        style: 'flex:1 1 0; min-width:0; display:flex; flex-direction:column; align-items:flex-start; text-align:left; font-family:inherit; padding:6px 10px; border-radius:9px; cursor:pointer; background:' +
          (on ? 'rgba(47,111,208,.12)' : dn ? 'rgba(29,138,90,.08)' : 'var(--panel)') +
          '; border:' + (on ? '2px solid var(--blue)' : '1px solid ' + (dn ? 'rgba(29,138,90,.35)' : 'var(--line)')) +
          '; box-shadow:' + (on ? '0 0 0 2px rgba(47,111,208,.15)' : '0 1px 2px rgba(20,35,60,.04)') + ';' };
    });
    const pillCol = stageDn ? 'var(--grn)' : busy ? 'var(--blue)' : 'var(--txt2)';

    // ---- top strip ----
    const first = id === 'pv1';
    const psat1Txt = psat1On || (first && st.pvConfirmed) ? '2,500 psig @ 36.35 cc' : '—';
    const psat2Txt = psat2On || (id === 'pv2' && st.pvConfirmed) ? '200 psig @ 27.98 cc' : '—';
    const S = (k, v, color) => ({ k, v, color: color || 'var(--txt)' });
    const cP = S('Cell Pressure', pTxt, 'var(--grn)'), cV = S('Cell Volume', vTxt, 'var(--amb)');
    const cT = S('Cell Temperature', tTxt, 'rgb(' + rgb + ')');
    let strip;
    if (id === 'charge') strip = [S('Stage', '1 · Charge 35 cc'), cP, cV, cT, S('Working Pressure', '5,000 psig', 'var(--blue)'), S('Reservoir Pressure', '3,000 psig')];
    else if (pvOn) strip = [S('PV Points', (st.pvCount || 0) + ' / 12', st.pvCount ? 'var(--accb3)' : 'var(--mut)'), cP, cV,
      S('Temperature', first ? '114.0 °C · reservoir' : '35.0 °C · separator', 'rgb(' + rgb + ')'),
      S('First PV Psat · 114 °C', psat1Txt, psat1Txt !== '—' ? 'var(--red)' : 'var(--mut)'),
      S('Final PV Psat · 35 °C', psat2Txt, psat2Txt !== '—' ? 'var(--red)' : 'var(--mut)')];
    else if (id === 'pv1') strip = [S('Stage', '2 · First PV'), cP, cV, cT, S('Charge', '35.0000 cc'), S('First PV Psat · 114 °C', '—', 'var(--mut)')];
    else if (id === 'cond') strip = [S('Stage', '3 · Separator Conditions'), cP, cV, cT,
      S('Target', 'Sep. T 35 °C · Sep. P 200 psig', 'var(--blue)'), S('First PV Psat · 114 °C', psat1Txt, psat1Txt !== '—' ? 'var(--red)' : 'var(--mut)')];
    else if (id === 'agit') strip = [S('Stage', '4 · Agitation'), cP, cV, cT,
      S('Pump A / Pump B', vA.toFixed(2) + ' / ' + vB.toFixed(2) + ' cc', 'var(--amb)'),
      S('Stabilized Volume', st.stabilized ? SEP.stab.toFixed(4) + ' cc' : '—', st.stabilized ? 'var(--grn)' : 'var(--mut)')];
    else if (id === 'flash') strip = [S('Stage', '5 · Flash Unit'), cP, cV,
      S('Flow Rate', (st.flow || 0).toFixed(2) + ' mL/min', (st.flow || 0) > 0.05 ? '#2f6fd0' : 'var(--mut)'),
      S('Balloon Pressure', (st.balloon || 0).toFixed(2) + ' psig', (st.balloon || 0) > 0.004 ? '#2f6fd0' : 'var(--mut)'),
      S('Gasometer', Math.round(st.gaso || 0) + ' cc', (st.gaso || 0) > 0.5 ? '#0e8f7a' : 'var(--mut)')];
    else strip = [S('Stage', '6 · Final PV'), cP, cV, cT, S('Gas Removed', SEP.balloon.toFixed(2) + ' psig · ' + SEP.gasometer + ' cc', '#2f6fd0'),
      S('First PV Psat · 114 °C', psat1Txt, psat1Txt !== '—' ? 'var(--red)' : 'var(--mut)')];

    return {
      onBack: this.props.onBack || (() => {}),
      dlPillText: st.stageTag, dlPillColor: pillCol,
      dlPillBg: pillCol === 'var(--grn)' ? 'rgba(29,138,90,.10)' : 'var(--chipbg)',
      dlPillBorder: pillCol === 'var(--grn)' ? 'rgba(29,138,90,.40)' : 'var(--line2)',
      dlPillDot: 'width:7px; height:7px; border-radius:50%; background:' + pillCol + ';',
      dlStrip: strip, dlStages,

      dlnPv1: pvOn && first, dlnPv2: pvOn && !first, dlnCellOn: !pvOn,
      dlnPv1Cfg: PV1_CFG, dlnPv2Cfg: PV2_CFG, dlnRunKey: st.runKey || 0,
      dlnShowDone: stageDn && !st.pvRun,
      dlnOnSync: (ps) => this.pvSync(ps), dlnOnDone: () => this.pvDone(),

      dlnVb: flashOn ? '0 76 1330 530' : '290 72 580 490',
      dlnCtlTr: flashOn ? 'translate(144,64) scale(.72)' : 'translate(180,44) scale(.72)',
      dlnSigD: flashOn ? 'M284 323 H326' : 'M320 303 H360',
      dlnSigLbl: flashOn ? { x: '305', y: '317' } : { x: '340', y: '297' },
      dlnCellTr: flashOn ? 'translate(-506,-20)' : 'translate(-446,-20)',
      dlnSideW: 'flex:0 0 ' + (flashOn ? 290 : 304) + 'px;',
      dlnTitleSub: flashOn ? 'PVT Cell → outlet line → Flash Unit → Balloon → Gasometer (excess gas)'
        : id === 'charge' ? 'Dual-Cylinder PVT Cell (air bath at 114 °C) · Computer → Control Box'
        : 'Computer → Control Box → Dual-Cylinder PVT Cell in the air bath',
      dlnTag: tag, dlnTagCol: tagCol,
      dlnTagBg: tone === 'good' ? 'rgba(29,138,90,.10)' : 'rgba(47,111,208,.10)',
      dlnTagBd: tone === 'good' ? 'rgba(29,138,90,.30)' : 'rgba(47,111,208,.32)',
      dlnP: pTxt, dlnV: vTxt, dlnT: tTxt, dlnPNum: Math.round(P).toLocaleString('en-US'),
      dlnValveA: true, dlnValveB: st.pvPhase === 'a2b' || st.pvPhase === 'hold' || st.pvPhase === 'b2a',
      dlnTCol: 'rgb(' + rgb + ')', dlnBathFill: 'rgba(' + rgb + ',.10)', dlnBathStroke: 'rgba(' + rgb + ',.55)',
      dlnBathLbl: (cooling ? 'AIR BATH · COOLING · ' : 'AIR BATH · ') + T.toFixed(1) + ' °C',
      dlnBathSt: cooling ? 'animation:pvtpulse calc(1.6s * var(--pm, 1)) ease-in-out infinite;' : '',
      dlnGasH: gh.toFixed(1), dlnLiqY: (219 + gh).toFixed(1), dlnLiqH: Math.max(0, h - gh).toFixed(1), dlnPistonY: (219 + h).toFixed(1),
      dlnBGasH: ghB.toFixed(1), dlnBLiqY: (219 + ghB).toFixed(1), dlnBLiqH: Math.max(0, hB - ghB).toFixed(1), dlnBPistonY: (219 + hB).toFixed(1),
      dlnIfStyle: 'opacity:' + (gasOn && gasA > 0.05 && oilA > 0.05 ? 0.55 * (1 - dA) : 0).toFixed(2) + ';',
      dlnDissStyle: 'animation:pvtdiss calc(3.4s * var(--pm, 1)) ease-in-out infinite; pointer-events:none;',
      dlnBubsA: bubs(1012, 219 + gh, 219 + h, gasA * dA), dlnBubsB: bubs(848, 219 + ghB, 219 + hB, gasB * dB),
      dlnPumpA: vA.toFixed(4) + ' cc', dlnPumpB: vB.toFixed(4) + ' cc',
      dlnXferStyle: 'opacity:' + (xferOn ? 1 : 0) + '; transition:opacity .35s ease;',
      dlnArrowD: phase === 'b2a' ? 'M 980 184 l 12 6 l -12 6 Z' : 'M 916 184 l -12 6 l 12 6 Z',
      dlnRouteD: 'M ' + route.map((q) => q[0] + ' ' + q[1]).join(' L '),
      dlnFluidDash: '0 ' + tl.toFixed(1) + ' ' + band.toFixed(1) + ' ' + (L + 20),
      dlnFluidStyle: 'opacity:' + (band > 0.5 ? 1 : 0) + ';',
      dlnSpecks: specks, dlnSlugX: fp[0].toFixed(1), dlnSlugY: fp[1].toFixed(1),
      dlnSlugStyle: 'opacity:' + (xferOn && fr > 0.02 && fr < 0.995 ? 1 : 0) + '; transition:opacity .3s ease; filter:drop-shadow(0 0 4px #ffcf3f);',
      dlnNeedleX: (948 + 11 * Math.cos(ang)).toFixed(1), dlnNeedleY: (240 + 11 * Math.sin(ang)).toFixed(1),
      dlnPhaseText: phaseText, dlnPhaseColor: phaseColor,

      dlnFlashOn: flashOn,
      dlnDisc: conn < 0.001,
      dlnValveOn: conn > 0.45,
      dlnVC: valve(vCell, 656, 170),
      dlnCellValveText: vCell > 0.5 ? 'OPEN' : 'CLOSED', dlnCellValveCol: vCell > 0.5 ? 'var(--grn)' : 'var(--mut)',
      dlnXOn: !!xPanel, dlnXTitle: xPanel ? xPanel.title : '', dlnXDetail: xPanel ? xPanel.detail : '',
      dlnXBd: xPanel ? (xPanel.ph === 4 ? '#46d39a' : xPanel.col) : 'none', dlnXBg: xPanel && xPanel.ph === 4 ? '#0e2019' : '#0f1a2c',
      dlnSeg0: seg[0], dlnSeg1: seg[1], dlnSeg2: seg[2], dlnSeg3: seg[3], dlnSeg4: seg[4],

      dlnRec: rec, dlnPvRes: pvRes, dlnCycRows: cycRows, dlnCycEmpty: !cycRows.length, dlnCycOn: id === 'agit',
      dlnStabText: st.stabilized ? 'VOLUME STABILIZED · PUMP B EMPTY' : (busy && id === 'agit' ? 'AGITATING' : 'NOT YET AGITATED'),
      dlnStabCol: st.stabilized ? 'var(--grn)' : busy && id === 'agit' ? 'var(--amb)' : 'var(--mut)',
      dlnBig2: big2, dlnBig2On: !!big2, dlnStripOn: pvOn, dlnSimCls: pvOn ? '' : 'vl-sim',
      dlnBig: big, dlnBigT: bigT, dlnBigCol: bigCol, dlnBigOn: !!big
    };
  }
}

DC.define('StageSeparator', {
  style: `/* Standalone-only fallback: matches only when this DC is opened on its own.
     When embedded in PVT Nexus the selector never matches, so the global theme
     (html / html[data-theme="light"]) in theme.css is used untouched. */
  #dc-root > .sc-host > [data-screen-label="Separator Test"] {
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
  #dc-root > .sc-host > [data-screen-label="Separator Test"] * { box-sizing:border-box; }
  @keyframes spndiss { 0%,100% { opacity:.16; } 50% { opacity:.34; } }
  @keyframes pvtpulse { 0%,100% { opacity:.35; } 50% { opacity:1; } }
  @keyframes spnFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }`,
  template: `<div data-screen-label="Separator Test" class="pg pg-stack">

  <!-- header (shared .pg-head, same treatment as Validation): eyebrow · title · status · description · equipment details -->
  <div class="pg-head">
    <div class="pg-titles">
      <span class="pg-eyebrow">Analysis</span>
      <h2 class="pg-title">Separator Test</h2>
      <span style="align-self:center; display:inline-flex; align-items:center; gap:6px; flex:0 0 auto; padding:3px 11px; border-radius:999px; background:{{ dlPillBg }}; border:1px solid {{ dlPillBorder }}; font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.7px; text-transform:uppercase; color:{{ dlPillColor }}; white-space:nowrap;"><span style="{{ dlPillDot }}"></span>{{ dlPillText }}</span>
      <p class="pg-desc">35 cc at 5,000 psig / 114 °C → first PV → separator conditions 35 °C / 200 psig → flash → final PV</p>
    </div>
    <div class="pg-end fx-btns"><button type="button" class="bd-btn" data-cd-open="" data-cd-ctx="Separator Test · sample inlet at Port L, outlet at Port R">Cell Details</button><button type="button" class="bd-btn" data-fd-open="fu" data-fd-src="StageSeparator:sep" data-fd-ctx="Separator Test · separator gas to the balloon">Flash Unit Details</button><button type="button" class="bd-btn" data-fd-open="ga" data-fd-src="StageSeparator:sep" data-fd-ctx="Separator Test · excess separator gas">Gasometer Details</button></div>
  </div>

  <!-- stage navigation : every stage is always reachable, regardless of completion -->
  <div style="display:flex; align-items:stretch; gap:6px; flex-wrap:wrap; flex:0 0 auto;">
    <sc-for list="{{ dlStages }}" as="s" hint-placeholder-count="6">
      <button onclick="{{ s.onClick }}" style="{{ s.style }}">
        <span style="font-size:11.5px; font-weight:600; color:{{ s.color }};">{{ s.name }}</span>
        <span style="font-family:'IBM Plex Mono'; font-size:8.5px; letter-spacing:.5px; text-transform:uppercase; color:{{ s.tagColor }}; margin-top:1px;">{{ s.tag }}</span>
      </button>
    </sc-for>
  </div>

  <div class="lab-body">
  <div class="lab-schem {{ dlnSimCls }}" style="gap:8px;">
  <!-- Stage 2 · First PV test : the Validation PV Test itself (35 cc charge, 114 °C) -->
  <sc-if value="{{ dlnPv1 }}" hint-placeholder-val="{{ false }}">
  <div style="flex:1 1 auto; min-height:0; display:flex; flex-direction:column; animation:spnFadeIn .45s ease both;">
    <dc-import name="StagePVTest" hint-size="100%,100%" embedded="{{ true }}" pv-config="{{ dlnPv1Cfg }}" run-key="{{ dlnRunKey }}" show-done="{{ dlnShowDone }}" on-sync="{{ dlnOnSync }}" on-done="{{ dlnOnDone }}"></dc-import>
  </div>
  </sc-if>
  <!-- Stage 6 · Final PV test : same Validation PV Test on the remaining separator liquid (35 °C) -->
  <sc-if value="{{ dlnPv2 }}" hint-placeholder-val="{{ false }}">
  <div style="flex:1 1 auto; min-height:0; display:flex; flex-direction:column; animation:spnFadeIn .45s ease both;">
    <dc-import name="StagePVTest" hint-size="100%,100%" embedded="{{ true }}" pv-config="{{ dlnPv2Cfg }}" run-key="{{ dlnRunKey }}" show-done="{{ dlnShowDone }}" on-sync="{{ dlnOnSync }}" on-done="{{ dlnOnDone }}"></dc-import>
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
          ${PVTCellArt.defs('spc')}
          <linearGradient id="spn-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"></stop><stop offset=".42" stop-color="#b3c1d8"></stop><stop offset=".58" stop-color="#7e90b0"></stop><stop offset="1" stop-color="#1f2a3e"></stop></linearGradient>
          <linearGradient id="spn-cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>
          <linearGradient id="spn-gcyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b2637"></stop><stop offset=".35" stop-color="#43556f"></stop><stop offset=".62" stop-color="#2c3a4f"></stop><stop offset="1" stop-color="#161f2e"></stop></linearGradient>
          <pattern id="spn-sample" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#c7a233"></rect><circle cx="4.5" cy="4.5" r="1.15" fill="#f2d879" opacity=".7"></circle></pattern>
          <pattern id="spn-diss" width="13" height="13" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".8" fill="#eafff4"></circle><circle cx="9.5" cy="8.5" r=".65" fill="#eafff4"></circle><circle cx="6" cy="11.5" r=".5" fill="#eafff4"></circle><circle cx="11.5" cy="2" r=".55" fill="#eafff4"></circle></pattern>
          <linearGradient id="spn-gas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fe3b4" stop-opacity=".34"></stop><stop offset="1" stop-color="#3fbf8c" stop-opacity=".62"></stop></linearGradient>
          <clipPath id="spn-a-clip"><rect x="1012" y="219" width="36" height="182" rx="3"></rect></clipPath>
          <clipPath id="spn-b-clip"><rect x="848" y="219" width="36" height="182" rx="3"></rect></clipPath>
        </defs>

        <!-- 1-2. computer + controller (approved desk) + signal cable from the cell -->
        <sc-if value="{{ dlnFlashOn }}" hint-placeholder-val="{{ false }}">
          <path d="M607.7 412.6 C 636 468, 628 506, 566 506 L 210 506 C 168 506, 154 430, 148 306" fill="none" stroke="#1e2733" stroke-width="3.2" stroke-linecap="round"></path>
          ${PVTCellArt.desk('spc', { x: 44, y: 230, s: .4, legs: 409, ctl: '{{ dlnPNum }}', rows: [['P', '{{ dlnP }}', '#7ff0bf'], ['V', '{{ dlnV }}', '#ffc56b'], ['T', '{{ dlnT }}', '#7ff0bf']] })}
        </sc-if>
        <sc-if value="{{ !dlnFlashOn }}" hint-placeholder-val="{{ true }}">
          ${PVTCellArt.cable({ at: { x: PVTCellArt.LEGACY.x - 446, y: PVTCellArt.LEGACY.y - 20, s: PVTCellArt.LEGACY.s } }, { x: 716, y: 250, s: .38 }, 24)}
          ${PVTCellArt.desk('spc', { x: 716, y: 250, s: .38, legs: 393, ctl: '{{ dlnPNum }}', rows: [['P', '{{ dlnP }}', '#7ff0bf'], ['V', '{{ dlnV }}', '#ffc56b'], ['T', '{{ dlnT }}', '#7ff0bf']] })}
        </sc-if>

        <!-- 3. dual-cylinder PVT cell (Validation PV cell geometry, true-scale 100 cc bore) -->
        <g transform="{{ dlnCellTr }}">
          <!-- approved PVT cell (PVTCellArt). Its thermal enclosure is the air bath: the tint follows the cell temperature.
               Pump A valve open to the sensor, Pump B valve open while the sample is in transit / held in Pump B,
               Port R valve = the PVT-cell outlet valve (flash stage) -->
          <rect x="736" y="104" width="424" height="420" rx="12" fill="none" stroke="{{ dlnBathStroke }}" stroke-width="1.6" stroke-dasharray="6 4" style="{{ dlnBathSt }}"></rect>
          <text x="1156" y="99" text-anchor="end" font-family="IBM Plex Mono" font-size="9" letter-spacing=".4" fill="{{ dlnTCol }}">{{ dlnBathLbl }}</text>
          ${PVTCellArt.cell('spc', {
            innerB: `<rect x="848" y="219" width="36" height="{{ dlnBGasH }}" fill="url(#spn-gas)"></rect>
            <rect x="848" y="{{ dlnBLiqY }}" width="36" height="{{ dlnBLiqH }}" fill="url(#spn-sample)"></rect>
            <rect x="848" y="{{ dlnBLiqY }}" width="36" height="{{ dlnBLiqH }}" fill="url(#spn-diss)" style="{{ dlnDissStyle }}"></rect>
            <sc-for list="{{ dlnBubsB }}" as="bb" hint-placeholder-count="10">
              <circle cx="{{ bb.x }}" cy="{{ bb.y }}" r="{{ bb.r }}" fill="#bff3da" opacity="{{ bb.o }}"></circle>
            </sc-for>`,
            innerA: `<rect x="1012" y="219" width="36" height="{{ dlnGasH }}" fill="url(#spn-gas)"></rect>
            <rect x="1012" y="{{ dlnLiqY }}" width="36" height="{{ dlnLiqH }}" fill="url(#spn-sample)"></rect>
            <rect x="1012" y="{{ dlnLiqY }}" width="36" height="{{ dlnLiqH }}" fill="url(#spn-diss)" style="{{ dlnDissStyle }}"></rect>
            <rect x="1012" y="{{ dlnLiqY }}" width="36" height="1.4" fill="#eafff4" style="{{ dlnIfStyle }}"></rect>
            <rect x="1012" y="219" width="36" height="3.5" fill="#ffffff" opacity=".18"></rect>
            <sc-for list="{{ dlnBubsA }}" as="ba" hint-placeholder-count="10">
              <circle cx="{{ ba.x }}" cy="{{ ba.y }}" r="{{ ba.r }}" fill="#bff3da" opacity="{{ ba.o }}"></circle>
            </sc-for>`,
            pistonB: 'dlnBPistonY', pistonA: 'dlnPistonY',
            valves: { A: 'dlnValveA', B: 'dlnValveB', R: "dlnVC.c === '#46d39a'" },
            ports: { R: { plug: '!(dlnFlashOn && !dlnDisc)', nut: 'dlnFlashOn && !dlnDisc' } },
            disp: { P: '{{ dlnPNum }}', B: '{{ dlnPumpB }}', A: '{{ dlnPumpA }}', T: '{{ dlnT }}' } })}
          <rect x="797" y="153" width="302" height="199" fill="{{ dlnBathFill }}" style="{{ dlnBathSt }}; pointer-events:none; mix-blend-mode:multiply;"></rect>
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
               from this page's own values by FlashHost: outlet line made up / broken out with conn, separator gas along the
               manifold past the closed Flask Valve into the balloon, excess on to the 2,000 cc section -->
          <g class="fx-host" data-fx="StageSeparator:sep"></g>
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

  <!-- sidebar (shared Validation layout): live readings · stage status · test record · PV results (first and final kept separate) -->
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
      <sc-if value="{{ dlnBigOn }}" hint-placeholder-val="{{ false }}">
        <div style="flex:0 0 auto; border:1.4px solid {{ dlnBigCol }}; border-radius:9px; padding:6px 10px; background:var(--icard);">
          <div style="font-family:'IBM Plex Mono'; font-size:9.5px; font-weight:600; letter-spacing:.6px; color:{{ dlnBigCol }};">{{ dlnBigT }}</div>
          <div style="font-family:'IBM Plex Mono'; font-size:13px; font-weight:700; color:var(--txt); margin-top:2px; white-space:nowrap;">{{ dlnBig }}</div>
          <sc-if value="{{ dlnBig2On }}" hint-placeholder-val="{{ false }}"><div style="font-family:'IBM Plex Mono'; font-size:13px; font-weight:700; color:var(--txt); margin-top:1px; white-space:nowrap;">{{ dlnBig2 }}</div></sc-if>
        </div>
      </sc-if>
      <div style="flex:0 0 auto; border:1px solid var(--line); border-radius:9px; padding:5px 0;">
        <div style="padding:2px 11px 4px; font-size:11.5px; font-weight:600; color:var(--txt);">Separator Test Record</div>
        <sc-for list="{{ dlnRec }}" as="r" hint-placeholder-count="7">
          <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px; padding:2px 11px; font-family:'IBM Plex Mono'; font-size:10px;"><span style="color:var(--mut); min-width:0;">{{ r.k }}</span><span style="font-weight:600; color:{{ r.c }}; text-align:right; flex:0 1 auto;">{{ r.v }}</span></div>
        </sc-for>
      </div>
      <div style="flex:0 0 auto; border:1px solid var(--line2); border-radius:9px; padding:5px 0; background:var(--panel2);">
        <div style="padding:2px 11px 3px; font-size:11.5px; font-weight:600; color:var(--txt);">PV Results · kept separate</div>
        <sc-for list="{{ dlnPvRes }}" as="q" hint-placeholder-count="2">
          <div style="padding:2px 11px 3px;"><div style="font-family:'IBM Plex Mono'; font-size:9.5px; color:var(--mut); white-space:nowrap;">{{ q.k }}</div><div style="font-family:'IBM Plex Mono'; font-size:12px; font-weight:700; color:{{ q.c }}; white-space:nowrap;">Psat {{ q.v }}</div></div>
        </sc-for>
      </div>
      <sc-if value="{{ dlnCycOn }}" hint-placeholder-val="{{ false }}">
        <div style="flex:1 1 auto; min-height:0; border:1px solid var(--line2); border-radius:9px; overflow:hidden; display:flex; flex-direction:column;">
          <div style="flex:0 0 auto; display:grid; grid-template-columns:34px 1fr 1fr; padding:0 8px; height:21px; align-items:center; background:var(--icard); border-bottom:1px solid var(--line2); font-family:'IBM Plex Mono'; font-size:9.5px; font-weight:700; color:var(--txt2);"><span>Cyc</span><span>Volume, cc</span><span>Change</span></div>
          <div style="flex:1 1 auto; min-height:0; overflow-y:auto;">
            <sc-for list="{{ dlnCycRows }}" as="c" hint-placeholder-count="3">
              <div style="{{ c.row }}"><span style="color:var(--mut2);">{{ c.n }}</span><span style="font-weight:600; color:var(--txt);">{{ c.v }}</span><span style="color:{{ c.col }};">{{ c.d }}</span></div>
            </sc-for>
            <sc-if value="{{ dlnCycEmpty }}" hint-placeholder-val="{{ false }}">
              <div style="padding:8px 10px; font-size:10.5px; color:var(--mut);">Each A → B → A cycle is logged here; agitation stops when the volume no longer changes.</div>
            </sc-if>
          </div>
          <div style="flex:0 0 auto; padding:5px 10px; border-top:1px solid var(--line2); font-size:11.5px; font-weight:700; color:{{ dlnStabCol }};">{{ dlnStabText }}</div>
        </div>
      </sc-if>
    </div>
    <div class="vl-dock">
      <div class="pc-host" data-pc="StageSeparator" data-pc-layout="side"></div>
      <div class="vl-fwd"></div>
    </div>
  </div>
  </div>
</div>`,
  logic: Component
});
})();
