/* Main shell + all process logic */
(function () {
/* ===== transfer timing helpers (shared, read-only: Differential Liberation / Separator Test use them) =====
   Phase timing (fraction of a stage): Preparing 0-.07 · Valve Open .07-.15 · Flowing .15-arrival ·
   Receiving arrival-.90 · Transfer Complete .90-1 (valves close).
   The Validation Flash Process runs on the shared flash equipment (equipment/flash: FlashSim stage
   functions + Scene), see runFlashStage / fxView. */
const FXP = { valve: 0.07, flow: 0.15, end: 0.90, shut: 0.97 };
const FX_PHASES = ['PREPARING', 'VALVE OPEN', 'FLOWING', 'RECEIVING', 'TRANSFER COMPLETE'];
const fxR = (a, b, p) => Math.max(0, Math.min(1, (p - a) / (b - a)));
const fxE = (x) => x * x * (3 - 2 * x);
// shared, read-only: phase names and easing reused by Differential Liberation / Separator Test (gas-collection timing)
window.PVT_FX = { FXP, FX_PHASES, fxR, fxE };
class Component extends DCLogic {
  state = { bhMode: 'open', bhDepth: 0, bhP: 0, bhT: 78, screen: 'splash', m01View: 'overview', m01Method: null, m01Phase: 'idle', m01Pressure: 0, activePoint: 'bottomhole', phase: 'idle', mechPressure: 0, restorePhase: 'idle', curP: 1500, qcStep: 1, qcPhase: 'idle', xfer: 0, resP: 0, resT: 75, water: 0, qcSettle: 0, qcDk: 0, agitate: false, qcDone: { 1:false, 2:false, 3:false, 4:false }, curT: 80, calcMode: '', test03: 'cce', repSec: 'cover', aboutTab: 'modules', chargeStep: 0, chargeStage: 0, chargeBusy: false, chargeFront: 0, chargeValveOpen: false, drainBack: false, cellVac: 0, cellP: 0, cellStatus: 'Cell Ready', tpVol: 100, pumpA: 0, pumpB: 0, deadVol: 0, initRead: 0, vBottle: false, vCell: false, vPumpA: false, vPumpB: false, bottleOn: false, agCycle: 0, agHalf: 0, agDir: 'idle', agStable: false, agResult: '', baro: [], fStep: 0, fStage: 0, fBusy: false, fuP: 14.7, fHe: 0, fHeGas: 3000, fPumpA: 80, fFlashed: 0, fOil: 0, fGaso: 0, fBalloon: 0, fVac: false, fMeasured: false, fPath: 'idle', fPr: 0, fQ: 0, dmP: 0, dmDone: false, fStatus: 'Awaiting Stable Sample', theme: 'dark', viscState: (window.VISC_MODULE ? window.VISC_MODULE.initialState() : {}) };

  pvCalcHost = { current: null };   // Module 05: the PVT Calculator (components/PvtCalc.js) mounts here
  bhHost = { current: null };   // Bottom Hole page: native BottomHoleSim module mounts here
  rcHost = { current: null };   // Validation > Recombination: native RecombSim module mounts here
  qcAgHost = { current: null }; // Validation > Step 4 Sample Homogenization: QcAgitSim scene (svg <g>)

  componentDidMount() {
    let saved = 'light';
    try { saved = localStorage.getItem('pvtTheme') || 'light'; } catch (e) {}
    this.applyTheme(saved);
    this.setState({ theme: saved });
    this.viscHistInit();
  }
  applyTheme(theme) {
    try {
      const el = document.documentElement;
      if (theme === 'light') el.setAttribute('data-theme', 'light');
      else el.removeAttribute('data-theme');
    } catch (e) {}
  }

  componentDidUpdate() {
    const pcKey = this.state.screen + '|' + this.state.activePoint + '|' + this.state.bhMode;
    if (this._pcKey !== pcKey) { this._pcKey = pcKey; this._pcReady = false; if (PCLK.paused()) PCLK.resume(); }
    this.viscSyncHash();
    this.syncPvtCalc();
    this.syncBhSim();
    this.syncRecomb();
    this.syncQcAgit();
    this.qc3Guard();
  }
  /* Validation > Step 4 Sample Homogenization - 180 deg inversion scene (components/QcAgitSim.js).
     Pure function of agitP (PCLK-driven) + the restored P / T and the shared bottleModel() split. */
  syncQcAgit() {
    const mod = window.QcAgitSim, host = this.qcAgHost.current;
    if (!mod || !host || !host.isConnected) return;
    if (!(this.state.screen === 'module02' && (this.state.qcStep || 1) === 4)) return;
    const s = this.state, done = s.qcPhase === 'done' || !!(s.qcDone || {})[4];
    const k = s.agitate ? (s.agitP || 0) : (done ? 1 : 0);
    const markup = mod.svg({ k, P: s.resP || 0, T: s.resT || 22, waterFrac: this.bottleModel().waterFrac });
    if (host._qcAg !== markup) { host._qcAg = markup; host.innerHTML = markup; }
  }
  /* Validation > Recombination - own timeline in components/RecombSim.js (reports progress back) */
  syncRecomb() {
    const mod = window.RecombSim;
    if (!mod) return;
    // Recombination belongs to Separator validation only: never show it for bottom-hole / wellhead
    if (this.state.screen === 'recomb' && this.valSource() !== 'separator') { mod.unmount(); this.setState({ screen: 'validation' }); return; }
    const on = this.state.screen === 'recomb';
    const host = this.rcHost.current;
    if (on && host && host.isConnected) {
      const opts = { onStatus: (st) => {
        if (this.state.rcDone !== st.done || this.state.rcStarted !== st.started) this.setState({ rcDone: st.done, rcStarted: st.started });
      } };
      if (!mod.isMounted(host)) mod.mount(host, opts); else mod.setOpts(opts);
    } else if (!on) {
      mod.unmount();
      this.rcHost.current = null;
    }
  }
  /* Bottom Hole page (open / cased) — own timeline in components/BottomHoleSim.js.
     It reports completion back so "Move to Lab" keeps using state.phase === 'done'. */
  syncBhSim() {
    const mod = window.BottomHoleSim;
    if (!mod) return;
    const on = this.state.screen === 'module01' && !!this.state.m01Picked && this.state.activePoint === 'bottomhole';
    const host = this.bhHost.current;
    const mode = this.state.bhMode === 'cased' ? 'cased' : 'open';
    if (on && host && host.isConnected) {
      const opts = {
        mode: mode,
        onDone: (d) => { const ph = d ? 'done' : 'idle'; if (this.state.phase !== ph) this.setState({ phase: ph }); },
        onLab: () => { if (this.state.phase === 'done') this.setState({ screen: 'mdtXfer', xfrPhase: 'idle', xfrP: 0, xfrH: 0 }); }
      };
      if (!mod.isMounted(host)) mod.mount(host, opts);
      else { mod.setOpts(opts); if (mod.mode() !== mode) mod.setMode(mode); }
    } else {
      mod.unmount();
      if (!on) this.bhHost.current = null;
    }
  }
  /* Module 05: mount / unmount the PVT Calculator; its Oil / Gas selector reports back into calcMode */
  syncPvtCalc() {
    const mod = window.PvtCalc;
    if (!mod) return;
    const on = this.state.screen === 'module05';
    const host = this.pvCalcHost.current;
    const fluid = this.state.calcMode === 'gas' ? 'gas' : 'oil';
    if (on && host && host.isConnected) {
      if (!mod.isMounted(host)) mod.mount(host, { fluid, onFluid: (f) => { if (this.state.calcMode !== f) this.setState({ calcMode: f }); },
        onTheme: (t) => { this.applyTheme(t); try { localStorage.setItem('pvtTheme', t); } catch (e) {} this.setState({ theme: t }); } });
      else if (mod.fluid() !== fluid) mod.setFluid(fluid);
    } else {
      mod.unmount();
      if (!on) this.pvCalcHost.current = null;
    }
  }

  componentWillUnmount() { if (this._viscPop) window.removeEventListener('popstate', this._viscPop); this.clearTimers(); if (this.uiClock) { PCLK.clearInterval(this.uiClock); this.uiClock = null; } }
  clearTimers() { (this.timers || []).forEach(PCLK.clearTimeout); this.timers = []; if (this.clockInt) { PCLK.clearInterval(this.clockInt); this.clockInt = null; } if (this.raf) PCLK.cancelRaf(this.raf); if (this.chargeRAF) { PCLK.cancelRaf(this.chargeRAF); this.chargeRAF = null; if (this.state.chargePlaying) this.setState({ chargePlaying: false }); } if (this.pInt) { PCLK.clearInterval(this.pInt); this.pInt = null; } if (this.mInt) { PCLK.clearInterval(this.mInt); this.mInt = null; } if (this.rInt) { PCLK.clearInterval(this.rInt); this.rInt = null; } (this._ivs || []).forEach(PCLK.clearInterval); this._ivs = [];
    // also cancel a charge / flash stage that is still running, so navigation never leaves a
    // pending stage timer behind (it would fire later on another screen or run the stage twice)
    // a stage cut off by navigation returns to its own starting state (earlier stages replayed instantly)
    const cBusy0 = !!this.state.chargeBusy, fBusy0 = !!this.state.fBusy, fStage0 = this.state.fStage || 0;
    if ((this.cT && this.cT.length) || this.state.chargeBusy) { this.cStop(); if (this.state.chargeBusy) this.setState({ chargeBusy: false, chargeStage: 0 }); }
    if ((this.fT && this.fT.length) || this.fRAF || this.state.fBusy) { this.fStop(); if (this.state.fBusy) this.setState({ fBusy: false, fStage: 0 }); }
    if (!this._pcRep && (cBusy0 || fBusy0)) {
      this._pcRep = true;
      try {
        if (cBusy0) this.pcReplay('charge', (this._chH || []).slice(0, -1));
        if (fBusy0) { const l = []; for (let i = 1; i < fStage0; i++) l.push(i); this.pcReplay('flash', l); }
      } finally { this._pcRep = false; }
    }
  }
  // ===== Charge to PVT Cell — 12-stage charging + agitation sequence =====
  cStop() {
    if (this.chargeRAF) PCLK.cancelRaf(this.chargeRAF);
    this.chargeRAF = null;
    (this.cT || []).forEach(PCLK.clearTimeout);
    this.cT = [];
  }
  cAt(ms, fn) { this.cT = this.cT || []; this.cT.push(PCLK.setTimeout(fn, PT(ms))); }
  cTween(dur, onT, done) {
    if (this.chargeRAF) PCLK.cancelRaf(this.chargeRAF);
    let t0 = null;
    const tick = (ts) => {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / PT(dur * 1000));
      onT(p);
      if (p < 1) { this.chargeRAF = PCLK.raf(tick); }
      else { this.chargeRAF = null; if (done) done(); }
    };
    this.chargeRAF = PCLK.raf(tick);
  }
  baroPush(v) {
    this._baro = this._baro || [];
    this._baro.push(v);
    if (this._baro.length > 90) this._baro.shift();
    return this._baro.slice();
  }
  chargeReset() {
    this.cStop();
    this._chH = [];
    this._baro = [];
    this.setState({
      chargeStep: 0, chargeStage: 0, chargeBusy: false, chargeFront: 0,
      cellVac: 0, cellP: 0, cellStatus: 'Cell Ready',
      tpVol: 100, pumpA: 0, pumpB: 0, deadVol: 0, initRead: 0,
      vBottle: false, vCell: false, vPumpA: false, vPumpB: false, bottleOn: false,
      chargeValveOpen: false, drainBack: false, agCycle: 0, agHalf: 0, agDir: 'idle',
      agStable: false, agResult: '', baro: [],
      connGrow: 0, discP: 0, vAct: '', cFlow: false, recFlash: false, balPh: 0, isoPh: 0
    });
  }
  chargeAction() {
    if (this.state.chargeBusy) return;
    const done = this.state.chargeStep || 0;
    if (done >= 12) { this.chargeReset(); return; }
    if (done === 11) return; // stage 12 is only reachable through the gated flash button
    this.runChargeStage(done + 1);
  }
  chargeReadyFinal() {
    const s = this.state;
    const tp = s.tpVol === undefined ? 100 : s.tpVol;
    return (s.chargeStep || 0) >= 11 && !s.chargeBusy && !!s.agStable &&
      Math.round(s.pumpA || 0) === 80 && Math.round(s.pumpB || 0) === 0 &&
      Math.round(s.deadVol || 0) === 2 && Math.round(tp) === 18 &&
      Math.abs((s.cellP || 0) - 5000) <= 5;
  }
  chargeGoFlash() {
    if (this.state.chargeBusy) return;
    if ((this.state.chargeStep || 0) >= 12) return;
    this.runChargeStage(12);
  }
  runChargeStage(n) {
    this.cStop();
    (this._chH = this._chH || []).push(n);   // stage history (procedure panel: restart / previous replay it)
    const S = (o) => this.setState(o);
    const fin = (extra) => this.setState(Object.assign({ chargeBusy: false, chargeStage: 0, chargeStep: n }, extra || {}));
    S({ chargeBusy: true, chargeStage: n });
    // ---- stages 1-8: values, order and results are unchanged. The extra state written here
    // (vAct = valve currently moving, cFlow = fluid actually moving, recFlash, balPh, isoPh, discP)
    // is presentation-only: it drives highlights, tags and the monitor card, never a calculation.
    if (n === 1) {
      S({ cellStatus: 'Vacuuming PVT Cell' });
      this.cTween(7.5, (p) => { S({ cellVac: -15 * p }); }, () => { S({ cellVac: -15, cellStatus: 'Vacuum Reached · −15 psig' }); this.cAt(1400, () => fin({ cellVac: -15, cellStatus: 'Vacuum Reached · Cell Held at −15 psig' })); });
    } else if (n === 2) {
      S({ bottleOn: true, connGrow: 0, discP: 0, tpVol: 100, cellStatus: 'Connecting Sample Bottle' });
      this.cTween(2.4, (p) => S({ connGrow: p }), () => {
        S({ connGrow: 1, cellStatus: 'Sample Bottle Connected · All Valves Closed' });
        this.cAt(900, () => fin({ connGrow: 1, cellStatus: 'Sample Bottle Connected · All Valves Closed' }));
      });
    } else if (n === 3) {
      // valve turns first, then the fluid moves; the front stops at each closed valve
      S({ vBottle: true, vAct: 'bottle:opening', cFlow: false, cellStatus: 'Opening Sample Flow Path · Bottle Valve Opening' });
      this.cAt(1000, () => {
        S({ vAct: '', cFlow: true, cellStatus: 'Opening Sample Flow Path · Sample Flowing to Cell Valve' });
        this.cTween(2.2, (p) => S({ chargeFront: 310 * p }), () => {
          S({ cFlow: false, cellStatus: 'Flow Stopped at Closed Cell Valve' });
          this.cAt(900, () => {
            S({ vCell: true, chargeValveOpen: true, vAct: 'cell:opening', cellStatus: 'Opening Sample Flow Path · Cell Valve Opening' });
            this.cAt(1000, () => {
              S({ vAct: '', cFlow: true, cellStatus: 'Opening Sample Flow Path · Sample Flowing to Pump B Valve' });
              this.cTween(2.0, (p) => S({ chargeFront: 310 + 101 * p }), () => {
                S({ cFlow: false, cellStatus: 'Flow Stopped at Closed Pump B Valve' });
                this.cAt(900, () => fin({ chargeFront: 411, cFlow: false, cellStatus: 'Flow Path Open · Stopped at Closed Pump B Valve' }));
              });
            });
          });
        });
      });
    } else if (n === 4) {
      S({ cFlow: true, recFlash: false, cellStatus: 'Recording Initial Transfer-Pump Volume' });
      this.cTween(2.6, (p) => S({ tpVol: 100 - 2 * p }), () => {
        S({ tpVol: 98, initRead: 98, cFlow: false, recFlash: true, cellStatus: 'Initial Volume V₁ = 98.0 mL · Stored for Volume Balance' });
        this.cAt(1800, () => fin({ tpVol: 98, initRead: 98, recFlash: false, cellStatus: 'Initial Volume V₁ = 98.0 mL Recorded' }));
      });
    } else if (n === 5) {
      S({ cFlow: true, cellStatus: 'Filling Dead Space and Equalizing with Bottle Pressure' });
      // the SPS/PDS bottle is already held at 5,000 psig: opening the path lets the pressurised sample
      // flow into the evacuated line / dead space / Pump A inlet, and the receiving volume rises
      // naturally until it equalizes with the bottle. No pressure target is being pumped to here.
      // pressure uses an ease-out (fast rise, then levelling off at bottle pressure); the end values
      // are written explicitly so the readouts always land on exactly 5,000 psig.
      const eq = (p) => 1 - (1 - p) * (1 - p);
      this.cTween(4.2, (p) => S({ tpVol: 98 - 3 * p, deadVol: 2 * p, chargeFront: 411 + 156 * p, cellP: p >= 1 ? 5000 : -15 + 5015 * eq(p) }), () => {
        const end = { tpVol: 95, deadVol: 2, chargeFront: 567, cellP: 5000, cFlow: false };
        S(Object.assign({ cellStatus: 'Equalized with Bottle Pressure · 5,000 psig' }, end));
        this.cAt(1400, () => fin(Object.assign({ cellStatus: 'Dead Space Filled 2.0 cc · Equalized at 5,000 psig' }, end)));
      });
    } else if (n === 6) {
      S({ vPumpA: true, vAct: 'pumpA:opening', cFlow: false, cellP: 5000, cellStatus: 'Charging Pump A — Pump A Valve Opening' });
      this.cAt(1000, () => {
        S({ vAct: '', cFlow: true, cellStatus: 'Charging Pump A — Valve Open' });
        this.cTween(7.0, (p) => S({ pumpA: p >= 1 ? 80 : 80 * p, tpVol: p >= 1 ? 18 : 95 - 77 * p, cellP: 5000 }), () => {
          S({ pumpA: 80, tpVol: 18, cellP: 5000, chargeFront: 600, cFlow: false, vAct: 'pumpA:closing', cellStatus: 'Pump A at 80.0 cc — Closing Pump A Valve' });
          this.cAt(1000, () => S({ vPumpA: false }));
          this.cAt(2100, () => fin({ pumpA: 80, tpVol: 18, cellP: 5000, vPumpA: false, chargeFront: 600, vAct: '', cellStatus: 'Pump A Charged 80.0 cc · Pump A Valve Closed' }));
        });
      });
    } else if (n === 7) {
      // reading / check step: the volume-balance lines appear one at a time (balPh 1..4)
      S({ balPh: 1, cellStatus: 'Calculating Final Volume' });
      this.cAt(1500, () => S({ balPh: 2 }));
      this.cAt(3000, () => S({ balPh: 3 }));
      this.cAt(4500, () => S({ balPh: 4, cellStatus: 'Volume Balance Confirmed' }));
      this.cAt(6000, () => fin({ tpVol: 18, balPh: 4, cellStatus: 'Volume Balance Confirmed' }));
    } else if (n === 8) {
      // 1 Pump A valve already closed at the end of stage 6 -> 80 cc sealed in Pump A
      // 2 residual sample in the charge line / dead space returns to the bottle (valves still open,
      //   so the path is continuous); it starts at the Pump A valve (path 575) - nothing leaves Pump A
      // 3-5 remaining valves close one at a time in the existing reverse order (Pump B, cell, bottle)
      // 6 path isolated, 7-8 bottle separated. End values are identical to before.
      S({ vPumpA: false, vAct: 'pumpA:closing', isoPh: 1, cellStatus: 'Pump A Valve Closed — 80.0 cc Sealed in Pump A' });
      this.cAt(1600, () => {
        S({ vAct: '', isoPh: 2, drainBack: true, chargeFront: 575, cellStatus: 'Clearing Charge-Line Dead Space' });
        this.cTween(3.6, (p) => S({ chargeFront: 575 * (1 - p) }), () => {
          S({ chargeFront: 0, drainBack: false, cellStatus: 'Charge-Line Dead Space Cleared' });
          this.cAt(900, () => S({ vPumpB: false, vAct: 'pumpB:closing', isoPh: 3, cellStatus: 'Closing Pump B Valve' }));
          this.cAt(2200, () => S({ vAct: 'cell:closing', isoPh: 4, cellStatus: 'Closing Cell Valve' }));
          this.cAt(3000, () => S({ vCell: false, chargeValveOpen: false }));
          this.cAt(3900, () => S({ vAct: 'bottle:closing', isoPh: 5, cellStatus: 'Closing Bottle Valve' }));
          this.cAt(4700, () => S({ vBottle: false }));
          this.cAt(5600, () => S({ vAct: '', isoPh: 6, cellStatus: 'Sample Path Isolated' }));
          this.cAt(7000, () => {
            S({ isoPh: 7, cellStatus: 'Disconnecting SPS/PDS Bottle' });
            this.cTween(1.8, (p) => S({ discP: p }), () => {
              S({ bottleOn: false, discP: 1, isoPh: 8, cellStatus: 'Bottle Disconnected — PVT Cell Isolated' });
              this.cAt(900, () => fin({ bottleOn: false, chargeFront: 0, drainBack: false, discP: 1, isoPh: 8, vAct: '', cellStatus: 'Bottle Disconnected — PVT Cell Isolated' }));
            });
          });
        });
      });
    } else if (n === 9) {
      S({ cellStatus: 'Holding Cell at 5,000 psi' });
      const from = this.state.cellP || 5000;
      // the cell already equalised with the bottle at 5,000 psi; this stage trims the pump
      // back onto the setpoint and proves it holds with the cell isolated
      this.cTween(4.6, (p) => { const v = from + (5000 - from) * p + Math.sin(p * Math.PI * 3) * 2.5 * (1 - p); S({ cellP: v, baro: this.baroPush(v) }); },
        () => { S({ cellP: 5000, baro: this.baroPush(5000) }); this.cAt(1400, () => fin({ cellP: 5000, cellStatus: 'Constant Pressure 5,000 psi' })); });
    } else if (n === 10) {
      this.runAgitationCycle();
    } else if (n === 11) {
      const cyc = this.state.agCycle || 1;
      const target = cyc >= 2 ? 5002 : 5013;
      const from = this.state.cellP || 5000;
      S({ cellStatus: 'Reading Barogram' });
      this.cTween(3.0, (p) => { const v = from + (target - from) * p; S({ cellP: v, baro: this.baroPush(v) }); }, () => {
        if (Math.abs(target - 5000) <= 5) {
          this.setState({ chargeBusy: false, chargeStage: 0, chargeStep: 11, cellP: target, agStable: true, agResult: 'stable', vPumpA: false, vPumpB: false, cellStatus: 'Stable — Single Phase' });
        } else {
          this.setState({ chargeBusy: false, chargeStage: 0, chargeStep: 9, cellP: target, agStable: false, agResult: 'repeat', cellStatus: 'Not Stable — Repeat Cycle' });
        }
      });
    } else if (n === 12) {
      S({ cellStatus: 'Released to Flash Process' });
      this.cAt(500, () => { fin({}); this.flashReset(); this.setState({ fStatus: 'Sample released from cell — ready to flash' }); });
    }
  }
  runAgitationCycle() {
    const HALF = 5.0; // one half-cycle of 80 cc at 10 cc/min, time-compressed
    const wob = (p) => 5000 + Math.sin(p * Math.PI * 5) * 3.4;
    this.setState({ chargeBusy: true, chargeStage: 10, vPumpA: true, vPumpB: true, agResult: '', agStable: false, agHalf: 1, agDir: 'AB', cellStatus: 'Agitating · A → B' });
    this.cTween(HALF, (p) => { const v = wob(p); this.setState({ pumpA: 80 * (1 - p), pumpB: 80 * p, cellP: v, baro: this.baroPush(v) }); }, () => {
      this.setState({ pumpA: 0, pumpB: 80, agHalf: 2, agDir: 'BA', cellStatus: 'Agitating · B → A' });
      this.cTween(HALF, (p) => { const v = wob(p); this.setState({ pumpA: 80 * p, pumpB: 80 * (1 - p), cellP: v, baro: this.baroPush(v) }); }, () => {
        this.setState({ pumpA: 80, pumpB: 0, agHalf: 0, agDir: 'idle', agCycle: (this.state.agCycle || 0) + 1, chargeBusy: false, chargeStage: 0, chargeStep: 10, cellP: 5000, baro: this.baroPush(5000), cellStatus: 'Cycle Complete' });
      });
    });
  }
  // ===== Flash Process — 7-stage sequence (stage values / timing: FlashSim, equipment/flash/sim.js) =====
  fStop() {
    if (this.fRAF) PCLK.cancelRaf(this.fRAF);
    this.fRAF = null;
    (this.fT || []).forEach(PCLK.clearTimeout);
    this.fT = [];
  }
  fAt(ms, fn) { this.fT = this.fT || []; this.fT.push(PCLK.setTimeout(fn, PT(ms))); }
  fTween(dur, onT, done) {
    if (this.fRAF) PCLK.cancelRaf(this.fRAF);
    let t0 = null;
    const tick = (ts) => {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / PT(dur * 1000));
      onT(p);
      if (p < 1) { this.fRAF = PCLK.raf(tick); }
      else { this.fRAF = null; if (done) done(); }
    };
    this.fRAF = PCLK.raf(tick);
  }
  flashReset() {
    this.fStop();
    this.setState(Object.assign(FlashSim.initial(), { fBusy: false, fStage: 0, fStep: 0 }));
  }
  flashAction() {
    if (this.state.fBusy) return;
    const d = this.state.fStep || 0;
    if (d >= 7) { this.flashReset(); return; }
    this.runFlashStage(d + 1);
  }
  runFlashStage(n) {
    // Stages 1-6 keep the existing values and pace (5.0 s base, 5.3 s for the flash, x PROCESS_SPEED_MULTIPLIER);
    // Stage 2 adds the temporary vacuum-pump connect / disconnect around the unchanged evacuation;
    // Stage 7 (Density & API) uses the collected oil, the recorded oil mass is never changed.
    this.fStop();
    const S = (o) => this.setState(o);
    S(FlashSim.stageStart(n));
    this.fTween(FlashSim.dur(n) / PSM(), (q) => S(FlashSim.stageAt(n, q)), () => S(FlashSim.stageDone(n)));
  }
  stepPh(phase, ms) { this.timers.push(PCLK.setTimeout(() => this.setState({ phase }), PT(ms))); }
  bhLog(text) {
    const d = new Date();
    const t = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
    const rows = (this.state.bhLog || []).concat([{ t: t, text: text }]);
    this.setState({ bhLog: rows.slice(-5) });
  }
  bhLogAt(ms, text) { this.timers.push(PCLK.setTimeout(() => this.bhLog(text), PT(ms))); }
  // second half of the programme — only reachable once the fluid is clean enough
  bhStartSampling() {
    if (this.state.phase !== 'ready') return;
    this.bhLog('Flow valve switched \u00b7 clean fluid routed to chamber 01');
    if (this.clockInt) PCLK.clearInterval(this.clockInt);
    this.sampleT0 = PCLK.now();
    this.clockInt = PCLK.setInterval(() => this.setState({ nowTs: Date.now(), sampleSecs: Math.floor((PCLK.now() - this.sampleT0) / 1000) }), 500);
    this.stepPh('fill', 200);
    this.setState({ bhFilled: 0 });
    this.timers.push(PCLK.setTimeout(() => { this.setState({ bhFilled: 1 }); this.bhLog('Chamber 01 filled \u00b7 chamber 02 filling'); }, PT(5200)));
    this.timers.push(PCLK.setTimeout(() => this.setState({ bhFilled: 2 }), PT(10000)));
    this.stepPh('seal', 10600);
    this.bhLogAt(10800, 'Both chambers sealed at reservoir conditions');
    this.stepPh('retract', 12800);
    this.bhLogAt(13000, 'Probe retracted \u00b7 flow path closed');
    this.stepPh('asc', 14400);
    this.tweenVal('bhDepth', 0, 14400, 5400);
    this.bhLogAt(14600, 'Pulling out of hole');
    this.stepPh('done', 20200);
    this.bhLogAt(20300, '2 sealed samples at surface \u00b7 ready for lab transfer');
    this.timers.push(PCLK.setTimeout(() => { if (this.clockInt) { PCLK.clearInterval(this.clockInt); this.clockInt = null; } }, PT(20600)));
  }

  rampMechAt(delay, target) {
    this.timers.push(PCLK.setTimeout(() => this.tweenMech(target), PT(delay)));
    this.timers.push(PCLK.setTimeout(() => { if (this.mInt) { PCLK.clearInterval(this.mInt); this.mInt = null; } this.setState({ mechPressure: target }); }, PT(delay + 3600)));
  }
  tweenMech(target) {
    if (this.mInt) PCLK.clearInterval(this.mInt);
    const start = this.state.mechPressure || 0;
    const steps = Math.round(64 * PSM()); let i = 0;   // 55 ms ticks: more ticks = slower ramp, same end value
    this.mInt = PCLK.setInterval(() => {
      i++;
      const t = i / steps;
      const e = 1 - Math.pow(1 - t, 3);
      this.setState({ mechPressure: Math.round(start + (target - start) * e) });
      if (i >= steps) { PCLK.clearInterval(this.mInt); this.mInt = null; this.setState({ mechPressure: target }); }
    }, 55);
  }
  pick(p) {
    this.clearTimers();
    this.setState({ activePoint: p, phase: 'idle', mechPressure: 0, m01Picked: true, sampleSecs: 0, nowTs: Date.now(), bhDepth: 0, bhP: 0, bhT: 78, bhCont: 0, bhFilled: 0, bhCsFill: 0, bhLog: [] });
  }
  runSample() {
    const p = this.state.activePoint || 'bottomhole';
    const ph = this.state.phase;
    if (ph !== 'idle' && ph !== 'done') return;
    this.clearTimers();
    this.setState({ phase: 'idle', mechPressure: 0, sampleSecs: 0, nowTs: Date.now() });
    this.sampleT0 = PCLK.now();
    if (this.clockInt) PCLK.clearInterval(this.clockInt);
    this.clockInt = PCLK.setInterval(() => this.setState({ nowTs: Date.now(), sampleSecs: Math.floor((PCLK.now() - this.sampleT0) / 1000) }), 500);
    var doneMs = p === 'bottomhole' ? (this.state.bhMode === 'cased' ? 25900 : 18000) : p === 'wellhead' ? 6200 : 5000;
    this.timers.push(PCLK.setTimeout(() => { if (this.clockInt) { PCLK.clearInterval(this.clockInt); this.clockInt = null; } }, PT(doneMs + 300)));
    if (p === 'bottomhole' && this.state.bhMode === 'cased') {
      // Cased hole / SRS : sample the producing wellbore fluid at depth
      this.setState({ bhDepth: 0, bhP: 0, bhT: 78, bhCsFill: 0, bhLog: [] });
      this.bhLog('SRS tool rigged up \u00b7 well producing');
      this.stepPh('desc', 300);
      this.stepPh('set', 6000);
      this.stepPh('comm', 8400);
      this.stepPh('fill', 11000);
      this.stepPh('seal', 17800);
      this.stepPh('asc', 20000);
      this.stepPh('done', 25800);
      this.tweenVal('bhDepth', 8450, 320, 5400);
      this.tweenVal('bhP', 4820, 320, 5400);
      this.tweenVal('bhT', 238, 320, 5400);
      this.tweenVal('bhCsFill', 100, 11400, 6000);
      this.tweenVal('bhDepth', 0, 20000, 5400);
      this.bhLogAt(5900, 'Tool at sampling depth \u00b7 8,450 ft TVD');
      this.bhLogAt(8500, 'Producing conditions stable \u00b7 flow confirmed');
      this.bhLogAt(11100, 'Sample chamber opened to the wellbore');
      this.bhLogAt(17900, 'Sample chamber sealed at downhole conditions');
      this.bhLogAt(20100, 'Pulling out of hole');
      this.bhLogAt(25900, 'SRS tool at surface \u00b7 sample ready for lab transfer');
    } else if (p === 'bottomhole') {
      // Open-hole cycle: run in → set probe → formation communication → cleanup →
      // fill chambers → seal → pull out of hole → ready for lab
      // Part 1 — run in, set probe, communicate, clean up. The programme then WAITS:
      // chamber filling is only unlocked once fluid quality reaches the sampling limit.
      this.setState({ bhDepth: 0, bhP: 0, bhT: 78, bhCont: 0, bhFilled: 0, bhCsFill: 0, bhLog: [] });
      this.bhLog('Sampling programme started \u00b7 tool at surface');
      this.stepPh('desc', 300);
      this.stepPh('set',  6000);
      this.stepPh('comm', 7900);
      this.stepPh('clean', 10000);
      this.stepPh('ready', 17600);
      this.tweenVal('bhDepth', 8450, 320, 5400);
      this.tweenVal('bhP', 4820, 320, 5400);
      this.tweenVal('bhT', 238, 320, 5400);
      this.bhLogAt(5900, 'Tool reached 8,450 ft TVD');
      this.bhLogAt(7800, 'Probe set \u00b7 seal against formation confirmed');
      this.bhLogAt(8100, 'Formation communication established');
      this.bhLogAt(10100, 'Pump-out started \u00b7 flow routed to wellbore (waste)');
      this.timers.push(PCLK.setTimeout(() => this.setState({ bhCont: 68 }), PT(9900)));
      this.tweenVal('bhCont', 5, 10100, 7000);
      this.bhLogAt(13500, 'Contamination reduced \u00b7 cleanup continuing');
      this.bhLogAt(17600, 'Fluid quality acceptable \u00b7 ready to sample');
    } else if (p === 'wellhead') {
      this.stepPh('connect', 200);
      this.stepPh('xfer',    1900);
      this.stepPh('done',    6200);
      this.rampMechAt(2000, 1000);
    } else {
      this.stepPh('connect', 200);
      this.stepPh('xfer',    1600);
      this.stepPh('done',    5000);
      this.rampMechAt(1700, 500);
    }
  }

  rstep(restorePhase, ms) { this.timers.push(PCLK.setTimeout(() => this.setState({ restorePhase }), PT(ms))); }
  tweenVal(key, target, delay, dur0) {
    const dur = PT(dur0);   // process time (global multiplier)
    this.timers.push(PCLK.setTimeout(() => {
      const start = this.state[key];
      const steps = Math.max(12, Math.round(dur / 110)); let i = 0;
      const iv = PCLK.setInterval(() => {
        i++; const t = i / steps; const e = 1 - Math.pow(1 - t, 3);
        this.setState({ [key]: Math.round(start + (target - start) * e) });
        if (i >= steps) { PCLK.clearInterval(iv); this.setState({ [key]: target }); }
      }, 110);
      (this._ivs = this._ivs || []).push(iv);
      this.timers.push(PCLK.setTimeout(() => { PCLK.clearInterval(iv); this.setState({ [key]: target }); }, dur + 700));
    }, PT(delay)));
  }
  startRestore() {
    this.clearTimers();
    this.setState({ restorePhase: 'received', curP: 0 });
    this.rstep('connected', 700);
    this.rstep('valvetest', 1600);
    this.rstep('bleed', 3600);
    this.rstep('bleeding', 5000);
    this.rstep('oil', 6800);
    this.rstep('complete', 8400);
    this.tweenVal('curP', 1250, 1600, 1500);
  }
  xfrRun() {
    const ph = this.state.xfrPhase;
    if (ph === 'heat' || ph === 'run') return;      // already heating / transferring
    this.clearTimers();
    // --- Step 1: heating. The jacket closes over the SPMC and the sample is
    // brought from lab temperature up to the 114 degC reservoir temperature.
    this.setState({ xfrPhase: 'heat', xfrH: 0, xfrP: 0 });
    this.tweenVal('xfrH', 100, 900, 4200);          // jacket seats (0.9 s), then the ramp
    // --- Step 2: soak at 114 degC, then start the fluid transfer.
    this.timers.push(PCLK.setTimeout(() => {
      this.setState({ xfrPhase: 'run', xfrH: 100, xfrP: 0 });
      // Linear, time-based master clock (float 0..100, ~25 fps). Every line front, piston,
      // volume and readout is derived from this one value in render, so they cannot drift apart.
      const T = PT(5000), t0 = PCLK.now();
      const iv = PCLK.setInterval(() => {
        const k = Math.min(1, (PCLK.now() - t0) / T);
        if (k >= 1) { PCLK.clearInterval(iv); this.setState({ xfrPhase: 'done', xfrP: 100 }); return; }
        this.setState({ xfrP: k * 100 });
      }, 40);
      (this._ivs = this._ivs || []).push(iv);
    }, PT(7000)));
  }
  // ===== shared Validation sample-source state (one source of truth for all Validation pages) =====
  valSrcMap() {
    return {
      // resvP - reservoir pressure quoted for the sample (null when the source has none)
      // restP - working / restoration pressure the bottle is taken to in step 2
      // restT - restoration temperature held by the heating jacket
      bottomhole: { key:'bottomhole', name:'Bottom Hole', sample:'Bottom Hole Sample', bottle:'SPS/PDS \u00b7 ~800 cc', open:4500, openT:22,
        src:'transferred from the SPMC chamber (MDT MRMS)', resvP:3000, resvT:114, restP:5000, restT:114, atResv:true,
        pLabel:'BOTTOM-HOLE PRESSURE', pVal:(4200).toLocaleString('en-US'), pUnit:'psia',
        tLabel:'BOTTOM-HOLE TEMPERATURE', tVal:'114', btLabel:'BOTTLE TEMP.' },
      wellhead: { key:'wellhead', name:'Wellhead', sample:'Wellhead Sample', bottle:'Piston bottle \u00b7 ~600 cc', open:1450, openT:22,
        src:'filled on the wellhead sampling line', resvP:3000, resvT:114, restP:5000, restT:114, atResv:true,
        pLabel:'WELLHEAD PRESSURE', pVal:(1450).toLocaleString('en-US'), pUnit:'psig',
        tLabel:'WELLHEAD TEMP.', tVal:'60', btLabel:'BOTTLE TEMP. / COND.' },
      separator: { key:'separator', name:'Separator', sample:'Separator Sample', bottle:'Oil piston bottle \u00b7 ~600 cc', open:200, openT:35,
        src:'drawn from the separator oil outlet', resvP:null, restP:2500, restT:35, atResv:false,
        pLabel:'SEPARATOR PRESSURE', pVal:(200).toLocaleString('en-US'), pUnit:'psig',
        tLabel:'SEPARATOR TEMPERATURE', tVal:'35', tUnit:'\u00b0C', btLabel:'BOTTLE TEMP. / COND.' }
    };
  }
  // ===== SPS/PDS bottle contents - one source of truth for every Validation screen =====
  // 800 cc bottle. The MDT transfer charges it with the 450 cc bottom-hole sample, so the
  // oil side starts at 450 cc and the water side at 350 cc, either side of the floating piston.
  // The bottle is rigid: the two sides always sum to 800 cc, so the piston position IS the split.
  //   restoration  - pump injects water, oil compresses (piston down); the jacket heats the oil,
  //                  which expands and eases the piston back up
  //   water check  - 30 cc of free water is bled off the oil side, the pump replaces it with water
  //   charging     - 82 cc of sample is drawn out to the PVT cell, the pump replaces it with water
  // Assumed fluid coefficients (illustrative, same order as a light reservoir oil):
  //   isothermal compressibility ~1e-5 /psi, thermal expansion ~5e-4 /degC.
  bottleModel() {
    const CC = 800, OIL0 = 450, FREEW_CC = 30, DRAWN_CC = 82;
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const _src = this.valSrcMap()[this.valSource()];
    const open = _src.open, restP = _src.restP, restT = _src.restT;
    const resP = this.state.resP || 0, resT = this.state.resT || 22;
    const presFrac = clamp01((resP - open) / Math.max(1, restP - open));
    const heatFrac = clamp01((resT - 22) / Math.max(1, restT - 22));
    const bledFrac = clamp01(this.state.water || 0);
    const tpVol = this.state.tpVol === undefined ? 100 : this.state.tpVol;
    const drawnFrac = clamp01((100 - tpVol) / 82);
    const comp  = OIL0 * 1e-5 * (restP - open) * presFrac;  // oil compressed by the restore pressure
    const therm = OIL0 * 5e-4 * (restT - 22) * heatFrac;    // oil expanded by the heating jacket
    const oil = Math.min(CC, Math.max(0, OIL0 - comp + therm - FREEW_CC * bledFrac - DRAWN_CC * drawnFrac));
    return { cc: CC, oil: oil, water: CC - oil, oilFrac: oil / CC, waterFrac: (CC - oil) / CC,
             freeWaterFrac: (FREEW_CC / CC) * (1 - bledFrac), drawn: DRAWN_CC * drawnFrac };
  }
  valSource() {
    const s = this.state.valSrc;
    if (s === 'wellhead' || s === 'separator' || s === 'bottomhole') return s;
    if (this.state.qcFromBH === false) return this.state.activePoint === 'separator' ? 'separator' : 'wellhead';
    return 'bottomhole';
  }
  valSetSource(k) {
    if (this.valSource() === k) return;
    this.clearTimers();
    this.setState({ valSrc: k, qcFromBH: k === 'bottomhole', qcStep: 1, qcPhase: 'idle',
      qcDone: { 1:false, 2:false, 3:false, 4:false }, resP: 0, resT: this.qcOpenT(k), water: 0, qcSettle: 0, qcDk: 0, agitate: false, agitP: 0 });
  }
  valSrcBtns() {
    const cur = this.valSource();
    return ['bottomhole','wellhead','separator'].map(k => {
      const on = cur === k, m = this.valSrcMap()[k];
      return { label: m.name, onClick: () => this.valSetSource(k),
        style: 'white-space:nowrap; font-family:inherit; font-size:11px; font-weight:' + (on ? '600' : '400') + '; letter-spacing:.3px; padding:6px 12px; border-radius:7px; cursor:pointer; background:' + (on ? 'rgba(77,157,255,.14)' : 'var(--chipbg)') + '; border:1px solid ' + (on ? 'var(--blue)' : 'var(--line2)') + '; color:' + (on ? 'var(--blue)' : 'var(--txt2)') + '; transition:background .15s ease, border-color .15s ease, color .15s ease;' };
    });
  }
  qcOpenP() { return this.valSrcMap()[this.valSource()].open; }
  // as-received bottle temperature before restoration: ambient for BH/WH, separator temp for a separator sample
  qcOpenT(k) { const m = this.valSrcMap()[k || this.valSource()]; return (m && m.openT != null) ? m.openT : 22; }
  qcRestP() { return this.valSrcMap()[this.valSource()].restP; }
  qcRestT() { return this.valSrcMap()[this.valSource()].restT; }
  qcRun() {
    const s = this.state.qcStep || 1;
    this.clearTimers();
    this.setState({ qcPhase: 'run' });
    const markDone = (extra) => this.setState({ qcPhase:'done', qcDone: { ...this.state.qcDone, [s]: true }, ...(extra||{}) });
    if (s === 1) { this.setState({ resP: 0, resT: this.qcOpenT() }); this.tweenVal('resP', this.qcOpenP(), 90, 2400); this.timers.push(PCLK.setTimeout(markDone, PT(2700))); }
    else if (s === 2) {
      // Restoration: one linear master clock qcRk (0..1, ~25 fps, 5000 ms process time = 8.5 s at x1.7).
      // Pressure and temperature are written from the same clock, so line flow, valve, piston,
      // readouts and bars stay in step. Timeline (see qcRestTimeline in render):
      //   jacket + pump on at 0 · valve opens 0.02-0.07 · water front pump -> bottle 0.03-0.22
      //   pressure open -> target 0.22-0.90 (flow stops exactly there) · temperature 0.03-0.90
      //   water-side valve closes 0.92-0.97 · complete at 1.
      const P0 = this.qcOpenP(), P1 = this.qcRestP(), T0 = this.qcOpenT(), T1 = this.qcRestT();
      const eio = (k, a, b) => { const x = Math.min(1, Math.max(0, (k - a) / (b - a))); return (1 - Math.cos(Math.PI * x)) / 2; };
      this.setState({ qcRk: 0, resP: P0, resT: T0 });
      const T = PT(5000), t0 = PCLK.now();
      const iv = PCLK.setInterval(() => {
        const k = Math.min(1, (PCLK.now() - t0) / T);
        const p = Math.min(P1, P0 + (P1 - P0) * eio(k, 0.22, 0.90));
        const t = T0 + (T1 - T0) * eio(k, 0.03, 0.90);
        if (k >= 1) { PCLK.clearInterval(iv); this.setState({ qcRk: 1, resP: P1, resT: T1 }); markDone(); return; }
        this.setState({ qcRk: k, resP: p, resT: t });
      }, 40);
      (this._ivs = this._ivs || []).push(iv);
    }
    else if (s === 3) {
      // Step 3 Sample Water Drainage - two user-controlled sub-steps on one page (components/QcWaterSim.js):
      //   settling - qcSettle 0..1 = simulated 0..24 h (accelerated demonstration). Bottle upright and still,
      //              pump + jacket hold the restored P / T (resP / resT carried forward, never reset here),
      //              sample valve closed, receiver empty. Ends READY for drainage (qcPhase 'idle', qcSettle 1).
      //   drainage - qcDk 0..1 master clock: sample valve opens, the settled free water (FREEW_CC 30 cc) drains
      //              to the receiver (water 0..1), the pump follows the discharged volume at constant pressure
      //              (piston moves down via bottleModel), the sample valve closes when the water is gone.
      const QW = window.QcWaterSim;
      if ((this.state.qcSettle || 0) < 1) {
        const T = PT(QW ? QW.SETTLE_MS : 10000), t0 = PCLK.now();
        this.setState({ qcSettle: 0, qcDk: 0, water: 0 });
        const iv = PCLK.setInterval(() => {
          const k = Math.min(1, (PCLK.now() - t0) / T);
          if (k >= 1) { PCLK.clearInterval(iv); this.setState({ qcSettle: 1, qcPhase: 'idle' }); return; }
          this.setState({ qcSettle: k });
        }, 40);
        (this._ivs = this._ivs || []).push(iv);
      } else {
        const T = PT(QW ? QW.DRAIN_MS : 6500), t0 = PCLK.now();
        this.setState({ qcDk: 0, water: 0 });
        const iv = PCLK.setInterval(() => {
          const k = Math.min(1, (PCLK.now() - t0) / T);
          if (k >= 1) { PCLK.clearInterval(iv); this.setState({ qcDk: 1, water: 1 }); markDone(); return; }
          this.setState({ qcDk: k, water: QW ? QW.drain(k).w : k });
        }, 40);
        (this._ivs = this._ivs || []).push(iv);
      }
    }
    else {
      // Step 4: slow 180 deg inversion (QcAgitSim timeline). One linear clock agitP 0..1 on PCLK, so
      // bottle angle, bubbles, cycle counter and elapsed time all freeze / resume together.
      // resP / resT are not touched: the pump and jacket hold the restoration conditions.
      const T = PT(window.QcAgitSim ? window.QcAgitSim.TOT : 15000), t0 = PCLK.now();
      this.setState({ agitate:true, agitP:0 });
      const iv = PCLK.setInterval(() => {
        const k = Math.min(1, (PCLK.now() - t0) / T);
        if (k >= 1) { PCLK.clearInterval(iv); markDone({ agitate:false, agitP:1 }); return; }
        this.setState({ agitP: k });
      }, 40);
      (this._ivs = this._ivs || []).push(iv);
    }
  }
  qcNext() {
    const s = this.state.qcStep || 1;
    if (!(this.state.qcDone||{})[s]) return;
    if (s < 4) { this.clearTimers(); this.setState({ qcStep: s+1, qcPhase: (this.state.qcDone||{})[s+1] ? 'done' : 'idle' }); }
    else this.setState({ screen: 'module03' });
  }
  valMeta() {
    const list = [
      { id:'opening', name:'Opening Pressure', desc:'Record cylinder opening pressure and confirm sample integrity', icon:'M4 16a8 8 0 1 1 16 0M12 16l4.2-4.6', tint:'#4d9dff' },
      { id:'restoration', name:'Restoration', desc:'Restore the sample to its restoration pressure and temperature', icon:'M12 3v8.2a3.4 3.4 0 1 0 0 6.6 3.4 3.4 0 0 0 0-6.6M15.5 6H12M15.5 9H12', tint:'#46d39a' },
      { id:'water', name:'Water Check', desc:'Check and quantify free water in the sample cylinder', icon:'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z', tint:'#38b6d6' },
      { id:'agitation', name:'Agitation', desc:'Homogenise the sample by slow 180\u00b0 inversion at the restored conditions', icon:'M4 8h11a3 3 0 0 1 0 6H8m0 0l3 3m-3-3l3-3', tint:'#9a7ee8' },
      { id:'charging', name:'Charging', desc:'Charge the validated sample into the PVT cell', icon:'M9 3h6v4.6l2 3V21H7V10.6l2-3V3zM7 15h10', tint:'#e7b15a' },
      { id:'flash', name:'Flash', desc:'Single-stage flash of the cell sample to standard conditions', icon:'M9 3h6M10 3v5.2l-5.1 8.5A2.4 2.4 0 0 0 7 20.4h10a2.4 2.4 0 0 0 2.1-3.7L14 8.2V3', tint:'#e8894a' },
      { id:'pv', name:'PV', desc:'Pressure\u2013volume relation at constant composition', icon:'M4 4v16h16M7.5 16l3.5-5.6 3 2.8 3.8-6.4', tint:'#2fb3a3' },
      { id:'density', name:'Direct Density', desc:'Determine sample density from measured mass and transferred volume', icon:'M12 3v3M4.5 6h15M12 6l-5 7h10l-5-7M7 13a5 5 0 0 0 10 0M9 21h6', tint:'#c05f8d' },
      { id:'recomb', name:'Recombination', desc:'Measure separator gas and oil in the PVT cell, then combine and mix them in one bottle', icon:'M5 3h4v7l-2.5 3M19 3h-4v7l2.5 3M6.5 13l5.5 4 5.5-4M12 17v4', tint:'#6e9a3a' }
    ];
    // Recombination is the final validation step for Separator samples only (2026-09-30):
    // Bottom-hole and Wellhead validation end at Direct Density.
    if (this.valSource() !== 'separator') list.pop();
    // Bottom-hole samples arrive in the MPSR tool and must be transferred to the SPS/PDS
    // bottle before validation starts. Wellhead / separator samples are already in their bottle.
    if (this.valSource() === 'bottomhole') {
      list.unshift({ id:'transfer', name:'Sample Transfer', desc:'Transfer the bottom-hole sample from the SPMC chamber into the SPS/PDS bottle', icon:'M4 6h5v14H4zM15 10h5v10h-5zM10.2 12h3.6M13.8 12l-1.7-1.7M13.8 12l-1.7 1.7', tint:'#5f6fd8' });
    }
    return list;
  }
  valStatus(id) {
    const d = this.state.qcDone || {}, cs = this.state.chargeStep || 0, fs = this.state.fStep || 0;
    const scr = this.state.screen, q = this.state.qcStep || 1;
    const m = { opening:1, restoration:2, water:3, agitation:4 };
    if (id === 'transfer') { if (this.state.xfrPhase === 'done') return 'Complete'; return scr === 'mdtXfer' ? 'Active' : 'Not Started'; }
    if (m[id]) { const n = m[id]; if (d[n]) return 'Complete'; return (scr === 'module02' && q === n) ? 'Active' : 'Not Started'; }
    if (id === 'charging') return cs >= 12 ? 'Complete' : ((scr === 'module03' || cs > 0) ? 'Active' : 'Not Started');
    if (id === 'flash') return fs >= 7 ? 'Complete' : ((scr === 'module03' && cs >= 12) ? 'Active' : 'Not Started');
    if (id === 'density') {
      if (this.state.dsVerified) return 'Complete';
      return scr === 'density' ? 'Active' : 'Not Started';
    }
    if (id === 'recomb') {
      if (this.state.rcDone) return 'Complete';
      return (scr === 'recomb' || this.state.rcStarted) ? 'Active' : 'Not Started';
    }
    return scr === 'pvTest' ? 'Active' : 'Not Started';
  }
  valOpen(id) {
    this.clearTimers();
    const m = { opening:1, restoration:2, water:3, agitation:4 };
    if (id === 'transfer') { this.setState({ screen:'mdtXfer', valSeq:false }); return; }
    if (m[id]) {
      const n = m[id], d = this.state.qcDone || {};
      // Water check opened directly: restoration is its starting point, so replay steps 1-2 with their
      // own actions (restored P / T carried forward, never 0 psig)
      if (n === 3 && !d[3] && !d[2]) { this.setState({ screen:'module02', valSeq:false }); this.pcReplay('qc', [1, 2]); return; }
      this.setState({ screen:'module02', valSeq:false, qcStep:n, qcPhase:d[n] ? 'done' : 'idle' }); return;
    }
    if (id === 'charging') {
      if ((this.state.chargeStep||0) >= 12) this.chargeReset();
      this.setState({ screen:'module03', valSeq:false });
      return;
    }
    if (id === 'flash') {
      if ((this.state.chargeStep||0) < 12) { this.flashReset(); this.setState({ chargeStep:12, chargeStage:12, chargeBusy:false }); }
      this.setState({ screen:'module03', valSeq:false });
      return;
    }
    if (id === 'density') { this.setState({ screen:'density', valSeq:false }); return; }
    if (id === 'recomb') { if (this.valSource() !== 'separator') return; this.setState({ screen:'recomb', valSeq:false }); return; }
    this.setState({ screen:'pvTest', valSeq:false });
  }
  valRunAll() {
    this.clearTimers();
    if (window.RecombSim) window.RecombSim.reset();
    this.setState({ rcDone:false, rcStarted:false });
    this.chargeReset();
    this.flashReset();
    if (this.valSource() === 'bottomhole') {
      this.setState({ screen:'mdtXfer', valSeq:true, xfrPhase:'idle', xfrP:0, xfrH:0, qcStep:1, qcPhase:'idle',
        qcDone:{1:false,2:false,3:false,4:false}, xfer:0, resP:0, resT:22, water:0, qcSettle:0, qcDk:0, agitate:false, agitP:0, dsVerified:false });
      return;
    }
    this.setState({ screen:'module02', valSeq:true, qcStep:1, qcPhase:'idle',
      qcDone:{1:false,2:false,3:false,4:false}, xfer:0, resP:0, resT:this.qcOpenT(), water:0, qcSettle:0, qcDk:0, agitate:false, agitP:0, dsVerified:false });
  }
  // Grid keeps 4 cards per row for the 8-procedure paths; the 9-card bottom-hole path
  // switches to a 3 x 3 grid so no row is left half empty.
  valCardSpan() { return this.valMeta().length === 9 ? 3 : 2; }   // 10 cards (bottom-hole path) -> 2 rows of 5
  valGridStyle() {
    const n = this.valMeta().length;
    const cols = n === 9 ? 9 : n === 10 ? 10 : 8;
    const rows = this.valMeta().length === 9 ? 3 : 2;
    // Same card metrics as the Detailed PVT Analysis grid (210px rows, 20px gap).
    // The cap keeps them at exactly that size on a tall screen; on a short one the
    // rows share what is left instead of pushing the page into a scroll.
    const cap = rows * 238 + (rows - 1) * 20;
    return 'flex:1 1 auto; min-height:0; max-height:' + cap + 'px; display:grid; grid-template-columns:repeat(' + cols +
           ',minmax(0,1fr)); gap:20px; grid-auto-rows:minmax(0,1fr); align-content:start;';
  }
  buildValCards() {
    return this.valMeta().map((p, i) => {
      const st = this.valStatus(p.id);
      const col = st === 'Complete' ? 'var(--grn)' : st === 'Active' ? 'var(--blue)' : 'var(--mut)';
      const bg = st === 'Complete' ? 'rgba(70,211,154,.10)' : st === 'Active' ? 'rgba(77,157,255,.10)' : 'var(--chipbg)';
      const bd = st === 'Complete' ? 'rgba(70,211,154,.40)' : st === 'Active' ? 'rgba(77,157,255,.40)' : 'var(--line2)';
      const tint = p.tint;
      return {
        name: p.name, desc: p.desc, status: st, icon: p.icon,
        onClick: () => this.valOpen(p.id),
        iconStyle: 'background:' + tint + '1f; color:' + tint + ';',
        openStyle: 'border-color:' + tint + '; color:' + tint + ';',
        cls: 'val-card' + (this.valCardSpan() === 3 ? ' is-3row' : ''),
        style: 'grid-column:span ' + this.valCardSpan() + '; border-color:' + (st === 'Not Started' ? 'var(--line)' : bd) + '; border-bottom-color:' + tint + ';',
        pillStyle: 'flex:0 0 auto; white-space:nowrap; font-size:11px; font-weight:600; padding:4px 10px; border-radius:20px; background:' + bg + '; border:1px solid ' + bd + '; color:' + col + ';'
      };
    });
  }
  // ===== PVT Analysis control centre (presentation only \u2014 test logic comes later) =====
  anaMeta() {
    return [
      { id:'dv', name:'Differential Liberation', desc:'Evaluate reservoir-fluid behavior as pressure is progressively reduced.', icon:'M4 5v14h16M8 8v11M12 12v7M16 15v4', tint:'#4d9dff' },
      { id:'sep', name:'Separator Test', desc:'Evaluate fluid behavior under separator conditions.', icon:'M4 8h16v8H4zM4 12h16M8 16v3M16 16v3', tint:'#e7b15a' },
      { id:'visc', name:'Viscosity', desc:'Measure fluid viscosity under selected pressure and temperature conditions.', icon:'M12 4s5 5.5 5 9.5a5 5 0 0 1-10 0C7 9.5 12 4 12 4zM9.4 13.6c1.6 1 3.6 1 5.2 0', tint:'#2fb3a3' },
      { id:'gc', name:'GC \u2014 Gas Chromatography', desc:'Determine the composition of gas and oil samples.', icon:'M4 20h16M6 20V9m4 11V5m4 15v-7m4 7V11M6 9l4-4 4 8 4-2', tint:'#0e8f7a' }
    ];
  }
  buildAnaCards() {
    return this.anaMeta().map((a, i) => ({
      name: a.name, desc: a.desc, icon: a.icon, status: 'Not Started',
      onClick: () => this.setState({ screen: a.id === 'dv' ? 'difflib' : (a.id === 'sep' ? 'separator' : (a.id === 'gc' ? 'gc' : (a.id === 'visc' ? 'viscMenu' : 'analysisTest'))), anaTest: a.id }),
      iconStyle: 'width:50px; height:50px; flex:0 0 auto; border-radius:50%; display:flex; align-items:center; justify-content:center; background:' + a.tint + '1f; color:' + a.tint + ';',
      openStyle: 'width:36px; height:36px; flex:0 0 auto; border-radius:50%; border:1.5px solid ' + a.tint + '; color:' + a.tint + '; display:flex; align-items:center; justify-content:center;',
      style: 'width:100%; height:100%; min-width:0; box-sizing:border-box; text-align:left; cursor:pointer; font-family:inherit; background:var(--panel); border:1px solid var(--line); border-bottom:2.5px solid ' + a.tint + '; border-radius:14px; padding:26px 26px 20px; display:flex; flex-direction:column; align-items:stretch; color:var(--txt); transition:transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s ease, border-color .18s ease; box-shadow:0 1px 2px rgba(10,20,40,.04), 0 8px 20px rgba(10,20,40,.03);',
      pillStyle: 'flex:0 0 auto; white-space:nowrap; font-size:11px; font-weight:600; padding:4px 10px; border-radius:20px; background:var(--chipbg); border:1px solid var(--line2); color:var(--mut);'
    }));
  }
  // ===== Viscosity module (structure only \u2014 each test is developed separately) =====
  viscPillStyle(status) {
    /* same pill as the analysis cards; later statuses get their own colours here */
    const c = status === 'Completed' ? ['rgba(29,138,90,.10)', 'rgba(29,138,90,.40)', 'var(--grn)']
      : status === 'In Progress' ? ['rgba(47,111,208,.10)', 'rgba(47,111,208,.40)', 'var(--blue)']
      : ['var(--chipbg)', 'var(--line2)', 'var(--mut)'];
    return 'flex:0 0 auto; white-space:nowrap; font-size:11px; font-weight:600; padding:4px 10px; border-radius:20px; background:' + c[0] + '; border:1px solid ' + c[1] + '; color:' + c[2] + ';';
  }
  /* status reported by one test component (only that test's entry changes) */
  viscSetStatus(id, status) {
    const cur = this.viscTestState(id);
    if (cur.status === status) return;
    const next = Object.assign({}, this.state.viscState || {});
    next[id] = Object.assign({}, cur, { status });
    this.setState({ viscState: next });
  }
  viscTestState(id) {
    const all = this.state.viscState || {};
    return all[id] || { status: 'Not Started' };
  }
  buildViscCards() {
    const VM = window.VISC_MODULE; if (!VM) return [];
    const tint = VM.accent;
    return VM.tests.map(t => {
      const st = this.viscTestState(t.id).status;
      return {
        name: t.name, desc: t.cardDesc, icon: t.icon, status: st,
        onClick: () => this.setState({ screen: t.screen }),
        iconStyle: 'width:50px; height:50px; flex:0 0 auto; border-radius:50%; display:flex; align-items:center; justify-content:center; background:' + tint + '1f; color:' + tint + ';',
        openStyle: 'width:36px; height:36px; flex:0 0 auto; border-radius:50%; border:1.5px solid ' + tint + '; color:' + tint + '; display:flex; align-items:center; justify-content:center;',
        style: 'width:100%; height:100%; min-width:0; box-sizing:border-box; text-align:left; cursor:pointer; font-family:inherit; background:var(--panel); border:1px solid var(--line); border-bottom:2.5px solid ' + tint + '; border-radius:14px; padding:26px 26px 20px; display:flex; flex-direction:column; align-items:stretch; color:var(--txt); transition:transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s ease, border-color .18s ease; box-shadow:0 1px 2px rgba(10,20,40,.04), 0 8px 20px rgba(10,20,40,.03);',
        pillStyle: this.viscPillStyle(st)
      };
    });
  }
  /* reset ONE test only \u2014 the other two keep their own state */
  viscReset(id) {
    const VM = window.VISC_MODULE; const t = VM && VM.byId(id); if (!t) return;
    const next = Object.assign({}, this.state.viscState || {});
    next[id] = t.initialState();
    this.setState({ viscState: next });
  }
  /* browser back / forward for Analysis -> Viscosity -> Test (hash routes) */
  viscHistInit() {
    const VM = window.VISC_MODULE; if (!VM) return;
    this._viscStack = [];
    this._viscPop = () => {
      const h = location.hash, scr = VM.screenForHash(h);
      const s = this._viscStack, i = s.lastIndexOf(h);
      if (scr) { if (i >= 0) s.length = i + 1; else s.push(h); }
      else s.length = 0;
      if (scr) { if (this.state.screen !== scr) this.setState({ screen: scr }); }
      else if (VM.isViscScreen(this.state.screen)) this.setState({ screen: 'analysis' });
    };
    window.addEventListener('popstate', this._viscPop);
    /* reload on a viscosity page keeps that page */
    const start = VM.screenForHash(location.hash);
    if (start) { this._viscStack.push(location.hash); this.setState({ screen: start }); }
  }
  viscSyncHash() {
    const VM = window.VISC_MODULE; if (!VM || !this._viscStack) return;
    const want = VM.hashFor(this.state.screen) || '', cur = location.hash;
    if (want === cur) return;
    try {
      if (want) { history.pushState({ vaps: 'visc' }, '', want); this._viscStack.push(want); }
      else if (VM.screenForHash(cur)) { history.replaceState(null, '', location.pathname + location.search); this._viscStack.length = 0; }
    } catch (e) {}
  }
  /* in-app Back inside the viscosity module: step the browser history when the
     parent page is the previous entry, so browser Back/Forward stay in step */
  viscGoUp(target) {
    const VM = window.VISC_MODULE;
    if (!VM || !VM.isViscScreen(this.state.screen)) return false;
    const s = this._viscStack || [], th = VM.hashFor(target) || '';
    const prev = s.length >= 2 ? s[s.length - 2] : (s.length === 1 ? '' : null);
    if (s.length && s[s.length - 1] === location.hash && prev === th) { history.back(); return true; }
    this.setState({ screen: target });
    return true;
  }
  aboutTabs() {
    const cur = this.state.aboutTab || 'modules';
    return [
      { id:'modules', label:'Main Modules' },
      { id:'how',     label:'How It Works' },
      { id:'evo',     label:'Project Evolution' },
      { id:'paths',   label:'Sampling Paths' }
    ].map(t => {
      const on = cur === t.id;
      return {
        label: t.label,
        onClick: () => this.setState({ aboutTab: t.id }),
        style: 'white-space:nowrap; font-family:inherit; font-size:11.5px; font-weight:' + (on ? '600' : '400')
             + '; letter-spacing:.3px; padding:8px 14px; border-radius:8px; cursor:pointer; transition:border-color .15s ease, filter .15s ease; background:'
             + (on ? 'linear-gradient(180deg,#4d9dff,#2f6fd0)' : 'var(--chipbg)')
             + '; border:1px solid ' + (on ? 'var(--blue)' : 'var(--line2)')
             + '; color:' + (on ? '#fff' : 'var(--chipt)') + ';'
      };
    });
  }

  qcGoStep(n) {
    const d = this.state.qcDone || {};
    const reachable = n === 1 || d[n-1];
    if (!reachable) return;
    this.clearTimers();
    this.setState({ qcStep: n, qcPhase: d[n] ? 'done' : 'idle' });
  }



  /* ===================================================================================
     Shared procedure panel (components/ProcCtl.js) - one adapter per Main-driven procedure.
     Every stage is initialised by the procedure's OWN actions: restart / previous / next
     reset the procedure and replay the earlier stages instantly on the pausable process
     clock (PCLK.flush / PCLK.advance). No value is set here that the procedure does not set.
     =================================================================================== */
  pcNames(which) {
    const I = (window.__SG && window.__SG.info) || {};
    const strip = (t) => String(t || '').replace(/^(Stage|Step)\s*\d+\s*·\s*/, '');
    if (which === 'charge') return [1,2,3,4,5,6,7,8,9,10,11,12].map(n => strip(I.CHARGE && I.CHARGE[n] && I.CHARGE[n].t));
    if (which === 'flash') return [1,2,3,4,5,6,7].map(n => strip(I.FLASH && I.FLASH[n] && I.FLASH[n].t));
    if (which === 'xfer') return [1,2,3,4,5,6,7].map(n => strip(I.XFER && I.XFER[n] && I.XFER[n].t));
    if (which === 'qc') return [1,2,3,4].map(n => strip(I.qcText ? I.qcText(n, this.valSource()).t : ''));
    if (which === 'm01') {
      const T = this.state.activePoint === 'separator' ? I.SEP : I.WH, N = this.state.activePoint === 'separator' ? 9 : 8;
      const a = []; for (let n = 1; n <= N; n++) a.push(strip(T && T[n] && T[n].t)); return a;
    }
    return [];
  }
  /* timeline procedures (one continuous run): current stage, 0-based */
  pcTlStage(which) {
    const I = (window.__SG && window.__SG.info) || {}, s = this.state;
    if (which === 'xfer') return I.xferStage ? I.xferStage(s.xfrPhase || 'idle', s.xfrH || 0, (s.xfrP || 0) / 100) - 1 : 0;
    const ph = s.phase || 'idle';
    if (ph === 'idle' && !this.clockInt) return 0;
    const f = s.activePoint === 'separator' ? I.sepStage : I.whStage;
    return f ? f(this, ph) - 1 : 0;
  }
  pcTlActive(which) {
    const s = this.state;
    if (which === 'xfer') return s.xfrPhase === 'heat' || s.xfrPhase === 'run';
    return (s.phase !== 'idle' && s.phase !== 'done') || (s.phase === 'idle' && !!this.clockInt);
  }
  pcTlDone(which) { return which === 'xfer' ? this.state.xfrPhase === 'done' : this.state.phase === 'done'; }
  pcTlReset(which) {
    this.clearTimers();
    if (which === 'xfer') this.setState({ xfrPhase: 'idle', xfrP: 0, xfrH: 0 });
    else this.pick(this.state.activePoint);
  }
  pcTlStart(which) { if (which === 'xfer') this.xfrRun(); else this.runSample(); }
  pcTlSeek(which, k) {
    this._pcReady = false;
    if (k <= 0) { PCLK.clearAll(); PCLK.resume(); this.pcTlReset(which); return; }
    PC.seek(() => this.pcTlReset(which), () => this.pcTlStart(which), () => this.pcTlStage(which) >= k || this.pcTlDone(which));
    if (this.pcTlDone(which)) PCLK.resume(); else this._pcReady = true;
  }
  /* step procedures (one click per stage): replay a list of stages instantly */
  pcReplay(which, list) {
    PCLK.clearAll(); PCLK.resume();
    if (which === 'charge') {
      this.cStop(); this.chargeReset();
      list.forEach(n => { this.runChargeStage(n); PCLK.flush(); });
    } else if (which === 'flash') {
      this.fStop(); this.flashReset();
      list.forEach(n => { this.runFlashStage(n); PCLK.flush(); });
    } else if (which === 'qc') {
      this.clearTimers();
      this.setState({ qcStep: 1, qcPhase: 'idle', qcDone: { 1: false, 2: false, 3: false, 4: false }, resP: 0, resT: this.qcOpenT(), water: 0, qcSettle: 0, qcDk: 0, agitate: false, agitP: 0 });
      this._pcRepQc = true;
      try {
        // step 3 is two sub-steps (settling, then drainage): replay both
        list.forEach(n => { this.setState({ qcStep: n, qcPhase: 'idle' }); this.qcRun(); PCLK.flush(); if (n === 3) { this.qcRun(); PCLK.flush(); } });
        const nx = list.length ? Math.min(4, list[list.length - 1] + 1) : 1;
        this.setState({ qcStep: nx, qcPhase: (this.state.qcDone || {})[nx] ? 'done' : 'idle' });
      } finally { this._pcRepQc = false; }
    }
  }
  /* Step 3 sub-step seek: 'settle' = original dispersed droplets, timer 0 h, receiver empty;
     'drain' = settled free-water layer, 24 / 24 h, receiver empty, ready to drain */
  qc3Seek(target) {
    this.pcReplay('qc', [1, 2]);
    if (target === 'drain') { this._pcRepQc = true; try { this.qcRun(); PCLK.flush(); } finally { this._pcRepQc = false; } }
  }
  /* leaving Step 3 (other screen / other step) cleanly stops its animation; an interrupted
     sub-step returns to its own starting state (a completed step keeps its result) */
  qc3Guard() {
    if (this._pcRepQc) return;
    const s = this.state, on = s.screen === 'module02' && (s.qcStep || 1) === 3;
    if (on) { this._qc3On = true; return; }
    if (!this._qc3On) return;
    this._qc3On = false;
    if ((s.qcDone || {})[3]) return;
    const st = s.qcSettle || 0, dk = s.qcDk || 0;
    const settling = st > 0 && st < 1, draining = st >= 1 && dk > 0;
    if (!settling && !draining) return;
    this.clearTimers();
    const back = settling ? { qcSettle: 0, qcDk: 0, water: 0 } : { qcDk: 0, water: 0 };
    if ((s.qcStep || 1) === 3) back.qcPhase = 'idle';
    this.setState(back);
  }
  /* Validation Flash Process drawing: shared flash equipment (equipment/flash) bound by FlashHost.
     The view model is the page's own flash state; the frame focuses on the Flash Unit and Gasometer
     while gas or sample moves (Stages 2-6) so the flask is readable in the main view. */
  fxView(arg) {
    const s = this.state;
    if (arg !== 'flash' || s.screen !== 'module03' || (s.chargeStep || 0) < 12) return null;
    const n = s.fBusy ? s.fStage : s.fStep, dens = n === 7;
    const mode = dens ? 'density' : 'system';
    // one full frame for every stage (no automatic zoom): PVT Cell, Flash Unit, balloon and Gasometer stay visible;
    // the enlarged views remain in the Details windows
    const vb = dens ? [-10, 236, 1700, 784] : Scene.LAYOUT.system.vb;
    return { mode, key: mode, opt: { labels: true, title: 'Validation Flash Process equipment' }, V: FlashSim.vmOf(s, 0), vb };
  }
  pcChargeNext() { return Math.min(12, (this.state.chargeStep || 0) + 1); }
  pcInfo(which) {
    const s = this.state, names = this.pcNames(which), N = names.length;
    const pz = PCLK.paused();
    if (which === 'charge') {
      if (s.screen !== 'module03' || (s.chargeStep || 0) >= 12) return null;
      const busy = !!s.chargeBusy, n = busy ? (s.chargeStage || 1) : this.pcChargeNext(), hist = this._chH || [];
      const canFinal = this.chargeReadyFinal();
      return { N, k: n - 1, title: names[n - 1], q: s.cellStatus || '', unit: 'Stage',
        status: busy ? (pz ? 'paused' : 'running') : 'ready', frac: busy ? null : 0,
        canRun: n < 12 || canFinal, runLabel: n === 12 ? 'Run Stage 12: Release to Flash' : null,
        canPrev: n > 1, canNext: n < 12, canRestart: busy,
        reset: 'Reset Charging', resetDisabled: !busy && !(s.chargeStep || 0) && !hist.length };
    }
    if (which === 'flash') {
      if (s.screen !== 'module03' || (s.chargeStep || 0) < 12) return null;
      const busy = !!s.fBusy, d = s.fStep || 0, all = d >= 7;
      const k = busy ? (s.fStage || 1) - 1 : Math.min(6, d);
      return { N, k, title: names[k], q: s.fStatus || '', unit: 'Stage',
        status: busy ? (pz ? 'paused' : 'running') : all ? 'complete' : 'ready', allDone: all,
        frac: busy ? (s.fQ != null ? s.fQ : null) : 0,
        canPrev: k > 0, canNext: k < 6 && !all, canRestart: busy || all,
        again: 'Run Flash Again', reset: 'Reset Flash', resetDisabled: !busy && !d };
    }
    if (which === 'qc') {
      if (s.screen !== 'module02') return null;
      const k = (s.qcStep || 1) - 1, ph = s.qcPhase || 'idle';
      const I = (window.__SG && window.__SG.info) || {}, tx = I.qcText ? I.qcText(k + 1, this.valSource()) : null;
      // Step 3: settling and drainage are separate user-controlled sub-steps (same page, same panel)
      let q3 = null, run3 = null, frac3 = null;
      if (k === 2) {
        const st = s.qcSettle || 0, dk = s.qcDk || 0;
        run3 = st < 1 ? 'Start Settling (24 h)' : 'Drain Free Water';
        frac3 = ph === 'done' ? 1 : 0.5 * st + 0.5 * dk;
        q3 = ph === 'done' ? 'Free-water drainage complete \u2014 sample valve closed, oil retained.'
           : st <= 0 ? 'Water droplets are dispersed in the oil. Start the simulated 24-hour settling with the bottle upright and still.'
           : st < 1 ? 'Settling \u2014 droplets descend under gravity and collect as free water below the oil. Outlet closed.'
           : dk <= 0 ? 'Settling complete \u2014 free water ready for drainage. Select Drain Free Water.'
           : 'Draining the settled free water through the bottom sample valve into the receiver.';
      }
      return { N, k, title: names[k], q: q3 || (tx ? tx.d : ''), unit: 'Step',
        status: ph === 'run' ? (!PCLK.busy() ? 'ready' : pz ? 'paused' : 'running') : ph === 'done' ? 'complete' : 'ready',
        allDone: ph === 'done' && k === 3, frac: frac3,
        runLabel: run3,
        doneMask: [1, 2, 3, 4].map(n => !!(s.qcDone || {})[n]),
        canPrev: k > 0, canNext: k < 3, canRestart: ph !== 'idle' || (k === 2 && (s.qcSettle || 0) > 0) };
    }
    if (which === 'xfer' || which === 'm01') {
      if (which === 'xfer' && s.screen !== 'mdtXfer') return null;
      if (which === 'm01' && !(s.screen === 'module01' && (s.activePoint === 'wellhead' || s.activePoint === 'separator'))) return null;
      const done = this.pcTlDone(which), act = this.pcTlActive(which), stale = act && !PCLK.busy();
      const k = done ? N - 1 : Math.max(0, Math.min(N - 1, this.pcTlStage(which)));
      const I = (window.__SG && window.__SG.info) || {};
      const T = which === 'xfer' ? I.XFER : (s.activePoint === 'separator' ? I.SEP : I.WH);
      let frac = null;
      if (which === 'xfer') frac = s.xfrPhase === 'heat' ? (s.xfrH || 0) / 100 : s.xfrPhase === 'run' ? (s.xfrP || 0) / 100 : null;
      return { N, k, title: names[k], q: T && T[k + 1] ? T[k + 1].d : '', unit: 'Stage',
        status: done ? 'complete' : stale ? 'ready' : act ? (pz ? (this._pcReady ? 'ready' : 'paused') : 'running') : 'ready',
        allDone: done, frac,
        canPrev: k > 0, canNext: k < N - 1, canRestart: act || done,
        again: which === 'xfer' ? 'Run Transfer Again' : 'Take Sample Again',
        runLabel: !act && !done ? (which === 'xfer' ? 'Start Heating & Transfer' : 'Take Sample') : null };
    }
    return null;
  }
  pcAct(a, which) {
    const s = this.state;
    if (which === 'xfer' || which === 'm01') {
      const N = this.pcNames(which).length, done = this.pcTlDone(which), act = this.pcTlActive(which);
      const k = done ? N - 1 : Math.max(0, this.pcTlStage(which));
      if (act && !PCLK.busy() && (a === 'run' || a === 'resume')) { this.pcTlSeek(which, k); this._pcReady = false; PCLK.resume(); return; }
      if (a === 'run' || a === 'resume') {
        if (act) { this._pcReady = false; PCLK.resume(); }
        else if (!done) { PCLK.clearAll(); PCLK.resume(); this._pcReady = false; this.pcTlStart(which); }
      } else if (a === 'pause') { if (act) { this._pcReady = false; PCLK.pause(); } }
      else if (a === 'restart') this.pcTlSeek(which, k);
      else if (a === 'prev') this.pcTlSeek(which, k - 1);
      else if (a === 'next') this.pcTlSeek(which, k + 1);
      else if (a === 'again') { this.pcTlSeek(which, 0); PCLK.resume(); this.pcTlStart(which); }
      return;
    }
    if (which === 'charge') {
      const busy = !!s.chargeBusy, hist = (this._chH || []).slice(), done = busy ? hist.slice(0, -1) : hist;
      if (a === 'run') { if (busy) return; PCLK.resume(); const n = this.pcChargeNext(); if (n === 12) this.chargeGoFlash(); else this.chargeAction(); }
      else if (a === 'pause') { if (busy) PCLK.pause(); }
      else if (a === 'resume') PCLK.resume();
      else if (a === 'restart') { if (busy) this.pcReplay('charge', done); }
      else if (a === 'prev') this.pcReplay('charge', done.slice(0, -1));
      else if (a === 'next') {
        PCLK.resume();
        if (busy) PCLK.flush();
        else { const n = this.pcChargeNext(); if (n === 12) { if (this.chargeReadyFinal()) { this.chargeGoFlash(); PCLK.flush(); } } else { this.chargeAction(); PCLK.flush(); } }
      }
      else if (a === 'reset') { PCLK.clearAll(); PCLK.resume(); this.chargeReset(); }
      return;
    }
    if (which === 'flash') {
      const busy = !!s.fBusy, d = s.fStep || 0;
      const k = busy ? (s.fStage || 1) - 1 : Math.min(6, d);
      const upto = (m) => { const l = []; for (let i = 1; i <= m; i++) l.push(i); return l; };
      if (a === 'run') { if (!busy) { PCLK.resume(); this.flashAction(); } }
      else if (a === 'pause') { if (busy) PCLK.pause(); }
      else if (a === 'resume') PCLK.resume();
      else if (a === 'restart') this.pcReplay('flash', upto(k));
      else if (a === 'prev') this.pcReplay('flash', upto(Math.max(0, k - 1)));
      else if (a === 'next') { PCLK.resume(); if (busy) PCLK.flush(); else if (d < 7) { this.runFlashStage(d + 1); PCLK.flush(); } }
      else if (a === 'again') { this.pcReplay('flash', []); this.flashAction(); }
      else if (a === 'reset') { PCLK.clearAll(); PCLK.resume(); this.flashReset(); }
      return;
    }
    if (which === 'qc') {
      const k = (s.qcStep || 1) - 1, ph = s.qcPhase || 'idle';
      const upto = (m) => { const l = []; for (let i = 1; i <= m; i++) l.push(i); return l; };
      // Step 3 sub-steps: restart during / after drainage -> settled layer + empty receiver;
      // restart while settling or when ready to drain -> original dispersed droplets, 0 h, empty receiver
      const drain3 = k === 2 && (s.qcSettle || 0) >= 1 && ((s.qcDk || 0) > 0 || ph === 'done');
      if (a === 'run') {
        if (ph === 'run' && !PCLK.busy()) { if (k === 2) this.qc3Seek(drain3 ? 'drain' : 'settle'); else this.pcReplay('qc', upto(k)); this.qcRun(); }
        else if (ph !== 'run') { PCLK.resume(); this.qcRun(); }
      }
      else if (a === 'pause') { if (ph === 'run') PCLK.pause(); }
      else if (a === 'resume') PCLK.resume();
      else if (a === 'restart') { if (k === 2) this.qc3Seek(drain3 ? 'drain' : 'settle'); else this.pcReplay('qc', upto(k)); }
      else if (a === 'prev') this.pcReplay('qc', upto(Math.max(0, k - 1)));
      else if (a === 'next') { const upd = upto(k + 1); this.pcReplay('qc', upd); }
      else if (a === 'runNext') { if (k < 3) { this.pcReplay('qc', upto(k + 1)); this.qcRun(); } }
      return;
    }
  }

  renderVals() {

    // ===== Module 01 (draft) derivations =====
    const DRAFT_DATA = {
      bottomhole: { id:'BHS-001', name:'Bottom Hole Sample', location:'Bottom Hole', collection:'TVD 8,450 ft', bottle:'High-pressure PVT sample bottle', pressure:'4,820 psia', temp:'238 °F', fluid:'Single-phase reservoir fluid', status:'Representative Sample', ok:true },
      wellhead:   { id:'WHS-002', name:'Wellhead Sample', location:'Wellhead', collection:'Christmas tree wing outlet', bottle:'High-pressure PVT sample bottle', pressure:'1,212 psia', temp:'198 °F', fluid:'Wellhead live fluid', status:'Conditioning Required', ok:false },
      separator:  { id:'SEP-003', name:'Separator Sample', location:'3-Phase Separator', collection:'Liquid & gas outlets', bottle:'Recombination sample set', pressure:'315 psia', temp:'92 °F', fluid:'Separator oil + gas', status:'Recombination Required', ok:false },
      overview:   { id:'FS-000', name:'Field Sampling Overview', location:'Full System', collection:'Three sampling locations', bottle:'—', pressure:'—', temp:'—', fluid:'—', status:'System Overview', ok:true },
    };
    const ap_d = this.state.activePoint || 'bottomhole', ph_d = this.state.phase || 'idle';
    const bhScene_v = !!this.state.m01Picked && ap_d === 'bottomhole';
    const mbtn_d = (on) => 'white-space:nowrap; font-family:inherit; font-size:10.5px; font-weight:' + (on ? '600' : '400') + '; padding:6px 10px; border-radius:7px; cursor:pointer; letter-spacing:.3px; background:' + (on ? 'linear-gradient(180deg,#4d9dff,#2f6fd0)' : 'var(--chipbg)') + '; border:1px solid ' + (on ? 'var(--blue)' : 'var(--line2)') + '; color:' + (on ? '#fff' : 'var(--chipt)') + ';';
    const sample_d = DRAFT_DATA[ap_d];
    const toolDown_d = (ap_d === 'bottomhole') && (ph_d === 'desc' || ph_d === 'acq');
    const toolShow_d = (ap_d === 'bottomhole') && (ph_d === 'desc' || ph_d === 'acq' || ph_d === 'asc');
    const toolStyle_d = { transform: `translateY(${toolDown_d ? 188 : 0}px)`, opacity: toolShow_d ? 1 : 0, transition: 'transform calc(4.2s * var(--pm, 1)) cubic-bezier(.45,.05,.55,.95), opacity calc(.8s * var(--pm, 1)) ease' };
    const acqOn_d = (ap_d === 'bottomhole') && (ph_d === 'acq' || ph_d === 'asc');
    const acqFillStyle_d = { transform: `scaleY(${acqOn_d ? 1 : 0})`, transformBox: 'fill-box', transformOrigin: 'center bottom', transition: 'transform calc(1.8s * var(--pm, 1)) ease' };
    const filling_d = (ph_d === 'xfer' || ph_d === 'stab' || ph_d === 'done');
    const bottleFillStyle_d = { transform: `scaleY(${filling_d ? 1 : 0})`, transformBox: 'fill-box', transformOrigin: 'center bottom', transition: 'transform calc(3.2s * var(--pm, 1)) ease', opacity: filling_d ? 0.92 : 0 };
    const labels_d = { bottomhole: 'BHS-001 · Bottom Hole', wellhead: 'WHS-002 · Wellhead', separator: 'SEP-003 · Separator', overview: 'FS-000 · Field Overview' };
    const statusMap_d = {
      bottomhole: { idle:'Wireline tool staged at surface · click Bottom Hole to run', desc:'Running sampling tool in hole…', acq:'Acquiring sample at reservoir depth…', asc:'Pulling tool out of hole…', dock:'MPSR docked at surface transfer station', conn:'Receiving bottle connected · couplings made up', pump:'Transfer pump on — pressurizing water side', xfer:'Displacing sample from MPSR into receiving bottle…', stab:'Bottle pressure stabilizing…', done:'Sample secured in PVT bottle' },
      wellhead:   { idle:'Ready', connect:'Connecting PVT bottle to wellhead…', xfer:'Transferring fluid to PVT bottle…', done:'Sample secured in PVT bottle' },
      separator:  { idle:'Ready', connect:'Connecting PVT bottle to separator outlet…', xfer:'Transferring fluid to PVT bottle…', done:'Sample secured in PVT bottle' },
    };
    const statusText_d = (statusMap_d[ap_d] && statusMap_d[ap_d][ph_d]) || 'Standby';
    const stageIdx_d = (ap_d === 'bottomhole' ? { idle:0, desc:0, acq:1, asc:2, done:3 } : { idle:0, connect:1, xfer:2, done:3 })[ph_d] ?? 0;
    const mechFilled_d = stageIdx_d >= 2;
    const connected_d = stageIdx_d >= 1;
    const entering_d = stageIdx_d === 2;
    const pressurized_d = stageIdx_d >= 3;
    const sampleEmptyScale_d = 0.0001, sampleFullScale_d = 0.607, pistonShift_d = 202;
    const fillEase_d = 'transform calc(3.4s * var(--pm, 1)) cubic-bezier(.4,.1,.3,1)';
    const sampleFillStyle_d = { transform: `scaleX(${mechFilled_d ? sampleFullScale_d : sampleEmptyScale_d})`, transformBox: 'fill-box', transformOrigin: 'left center', transition: fillEase_d };
    const pistonStyle_d = { transform: `translateX(${mechFilled_d ? pistonShift_d : 0}px)`, transition: fillEase_d };
    const pistonLabelStyle_d = { transform: `translateX(${mechFilled_d ? pistonShift_d : 0}px)`, transition: fillEase_d };
    const inflowStyle_d = { opacity: entering_d ? 1 : 0, transition: 'opacity .45s ease' };
    const MAXP_d = 2000;
    const angle_d = -120 + 240 * Math.min(1, (this.state.mechPressure || 0) / MAXP_d);
    const needleStyle_d = { transform: `rotate(${angle_d}deg)`, transformOrigin: '86px 50px', transformBox: 'view-box', transition: 'transform calc(2.6s * var(--pm, 1)) cubic-bezier(.3,.7,.2,1)' };
    const mechPressureText_d = (this.state.mechPressure || 0).toLocaleString('en-US');
    const mechMap_d = {
      bottomhole: { idle:'Ready to receive sample · 0 psig', desc:'Awaiting downhole sample…', acq:'Awaiting downhole sample…', asc:'Tool returning to surface…', dock:'MPSR docked · awaiting hook-up', conn:'Sample inlet connected', pump:'Pump on · water side pressurizing', xfer:'Sample entering · piston moving up', stab:'Pressure stabilizing…', done:'Bottom-hole sample secured in PVT bottle' },
      wellhead:   { idle:'Ready to receive sample', connect:'Transfer line connected', xfer:'Sample entering bottle · piston moving', done:'Wellhead sample secured in PVT bottle' },
      separator:  { idle:'Ready to receive sample', connect:'Transfer line connected', xfer:'Sample entering bottle · piston moving', done:'Separator sample secured in PVT bottle' },
    };
    const mechStatusText_d = (mechMap_d[ap_d] && mechMap_d[ap_d][ph_d]) || 'Ready to receive sample';
    const connectText_d = connected_d ? 'Transfer line connected' : 'Awaiting source connection';
    const connectIcon_d = connected_d ? 'var(--accg)' : 'var(--dis)';
    const stageDefs_d = ['Ready', 'Connected', 'Filling', 'Pressurized'];
    const stages_d = stageDefs_d.map((label, i) => {
      const done = i < stageIdx_d, active = i === stageIdx_d;
      const c = done ? 'var(--accg)' : active ? 'var(--blue)' : 'var(--dis)';
      return { label, dotStyle: `width:11px;height:11px;border-radius:50%;flex:0 0 auto;border:1.6px solid ${c};background:${(active || done) ? c : 'transparent'};box-shadow:${active ? '0 0 8px ' + c : 'none'};`, txtStyle: `font-size:12.5px;color:${(done || active) ? 'var(--lbl)' : 'var(--dis)'};font-weight:${active ? 500 : 300};` };
    });
    const pillColor_d = pressurized_d ? 'var(--grn)' : entering_d ? 'var(--blue)' : 'var(--mut)';
    const pillBg_d = pressurized_d ? 'rgba(70,211,154,.10)' : entering_d ? 'rgba(77,157,255,.10)' : 'rgba(150,175,210,.06)';
    const pillBorder_d = pressurized_d ? 'rgba(70,211,154,.32)' : entering_d ? 'rgba(77,157,255,.32)' : 'var(--line)';
    const bottleStatusShort_d = stageDefs_d[stageIdx_d] || 'Ready';
    const bottleStatusColor_d = pressurized_d ? 'var(--grn)' : entering_d ? 'var(--blue)' : connected_d ? '#7fb4ff' : 'var(--mut)';
    const stBlue_d = 'var(--blue)', stGrey_d = 'var(--line2)';
    const whScene_v = !!this.state.m01Picked && ap_d === 'wellhead';
    const sepScene_v = !!this.state.m01Picked && ap_d === 'separator';
    const running_d = ph_d !== 'idle' && ph_d !== 'done';
    const labReady_d = ph_d === 'done';
    const takeSampleText_d = running_d ? 'Sampling…' : (ph_d === 'done' ? 'Restart Sample' : 'Take Sample');
    // action buttons share the nav-tab design language (see mbtn_d): same type, radius, border and blue fill
    const _actBtn_d = (on) => ({ whiteSpace:'nowrap', fontFamily:'inherit', fontSize:'12px', fontWeight: on ? 600 : 500, letterSpacing:'.2px', height:'36px', boxSizing:'border-box', flex:'0 0 36px', padding:'0 12px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', color: on ? '#fff' : 'var(--chipt)', background: on ? 'linear-gradient(180deg,#4d9dff,#2f6fd0)' : 'var(--chipbg)', border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line2)'), cursor: on ? 'pointer' : 'not-allowed', transition: 'border-color .15s ease, filter .15s ease' });
    const takeBtnStyle_d = { ..._actBtn_d(!running_d), marginTop:'auto' };
    const labBtnStyle_d = _actBtn_d(labReady_d);
const hi_d = (on) => on ? 'opacity:1; transition:opacity .5s ease;' : 'opacity:.30; transition:opacity .5s ease;';
    const ovw_d = ap_d === 'overview';
    const whHi_d = ovw_d ? 'display:none;' : hi_d(ap_d === 'wellhead');
    const sepHi_d = ovw_d ? 'display:none;' : hi_d(ap_d === 'separator');
    const bhHi_d = hi_d(ap_d === 'bottomhole' || ovw_d);
    const whConnColor_d = ap_d === 'wellhead' ? '#5fd0ff' : '#4a5b74';
    const sepConnColor_d = ap_d === 'separator' ? '#5fd0ff' : '#4a5b74';
    const surfaceFlow_d = (ap_d === 'wellhead' || ap_d === 'separator');
    const fillMap_d = { idle:0, connect:0.12, desc:0.06, acq:0.42, xfer:0.55, asc:0.74, done:1 };
    const f_d = fillMap_d[ph_d] != null ? fillMap_d[ph_d] : 0;
    const spsSampleStyle_d = 'transform:scaleY(' + (0.62*f_d).toFixed(3) + '); transform-box:fill-box; transform-origin:top center; transition:transform calc(2.8s * var(--pm, 1)) ease;';
    const schFillStyle_d = 'transform:scaleY(' + f_d.toFixed(3) + '); transform-box:fill-box; transform-origin:top center; transition:transform calc(2.8s * var(--pm, 1)) ease;';
    const spsPistonStyle_d = 'transform:translateY(' + (0.62*f_d*268).toFixed(1) + 'px); transition:transform calc(2.8s * var(--pm, 1)) ease;';
    const oilG_d = 0.10 + 0.58 * f_d;
    const oilFill_d = 'transform:scaleY(' + oilG_d.toFixed(3) + '); transform-box:fill-box; transform-origin:top center; opacity:' + (f_d > 0.02 ? '1' : '0') + '; transition:transform calc(2.8s * var(--pm, 1)) ease, opacity calc(1.4s * var(--pm, 1)) ease;';
    const oilWater_d = 'transform:scaleY(' + (1 - oilG_d).toFixed(3) + '); transform-box:fill-box; transform-origin:bottom center; transition:transform calc(2.8s * var(--pm, 1)) ease;';
    const oilPiston_d = 'transform:translateY(' + (oilG_d * 105).toFixed(1) + 'px); transition:transform calc(2.8s * var(--pm, 1)) ease;';
    const panPiston_d = 'transform:translateY(' + (oilG_d * 216).toFixed(1) + 'px); transition:transform calc(2.8s * var(--pm, 1)) ease;';
    // wellhead bottle: tall oil chamber above, smaller N2 back-pressure chamber below
    const whOilG_d = 0.12 + 0.70 * f_d;
    const whOilFill_d = 'transform:scaleY(' + whOilG_d.toFixed(3) + '); transform-box:fill-box; transform-origin:top center; opacity:' + (f_d > 0.02 ? '1' : '0') + '; transition:transform calc(2.8s * var(--pm, 1)) ease, opacity calc(1.2s * var(--pm, 1)) ease;';
    const whN2Fill_d = 'transform:scaleY(' + (1 - whOilG_d).toFixed(3) + '); transform-box:fill-box; transform-origin:bottom center; transition:transform calc(2.8s * var(--pm, 1)) ease;';
    const whPiston_d = 'transform:translateY(' + (whOilG_d * 252).toFixed(1) + 'px); transition:transform calc(2.8s * var(--pm, 1)) ease;';
    const whOilLabel_d = 'opacity:' + (f_d > 0.25 ? '1' : '0') + '; transition:opacity calc(1.2s * var(--pm, 1)) ease;';
    const miniPiston_d = 'transform:translateY(' + (oilG_d * 84).toFixed(1) + 'px); transition:transform calc(2.8s * var(--pm, 1)) ease;';
    const miniPistonY_d = +(45 + oilG_d * 84).toFixed(1);
    const gasFill_d = 'opacity:' + (0.4 + 0.55 * f_d).toFixed(2) + '; transition:opacity calc(2.2s * var(--pm, 1)) ease;';
    // Sampling bottles = Validation/Restoration bottle (components/SampleBottle.js); same fill model,
    // fill fractions unchanged: wellhead whOilG_d (N2 buffer), separator oilG_d (water buffer)
    const _sbOp_d = '; opacity:' + (f_d > 0.02 ? '1' : '0') + ';';
    const _sbWh_d = window.SampleBottle ? window.SampleBottle.styles(whOilG_d) : { sample:'', buffer:'', piston:'' };
    const _sbSep_d = window.SampleBottle ? window.SampleBottle.styles(oilG_d) : { sample:'', buffer:'', piston:'' };
    const _sbFade_d = ', opacity calc(1.2s * var(--pm, 1)) ease;';
    const whBtlSample_d = _sbWh_d.sample.replace(/;$/, _sbFade_d) + _sbOp_d;
    const sepBtlSample_d = _sbSep_d.sample.replace(/;$/, _sbFade_d) + _sbOp_d;
    const sepOilLabel_d = whOilLabel_d;
    const sampleFlow_d = (ph_d === 'xfer' || ph_d === 'stab' || ph_d === 'connect');
    const bhToolFillStyle_d = 'transform:scaleY(' + ((ph_d==='acq'||ph_d==='asc'||ph_d==='done')?1:0) + '); transform-box:fill-box; transform-origin:center bottom; transition:transform calc(1.6s * var(--pm, 1)) ease;';
    const bhUp_d = (ph_d==='asc'||ph_d==='dock'||ph_d==='conn'||ph_d==='pump'||ph_d==='xfer'||ph_d==='stab'||ph_d==='done');
    const bhCableStyle_d = 'transform:scaleY(' + (bhUp_d ? 0.001 : 1) + '); transform-box:fill-box; transform-origin:center top; transition:transform calc(2.6s * var(--pm, 1)) cubic-bezier(.45,.05,.55,.95);';
    // ===== Bottom-hole wireline page =====
    const BH_CONT_LIMIT = 6;   // sampling is unlocked at or below this contamination (%)
    const _atDepth_d = ['acq','set','comm','clean','ready','fill','seal','retract'].indexOf(ph_d) >= 0;
    const bhDown_d = ph_d === 'desc' || _atDepth_d;
    const bhTravel_d = 'transform calc(5.4s * var(--pm, 1)) cubic-bezier(.42,0,.58,1)';
    const bhToolXY_d = 'transform:translateY(' + (bhDown_d ? 300 : 0) + 'px); transition:' + bhTravel_d + ';';
    const bhCableK_d = 'transform:scaleY(' + (bhDown_d ? 1 : 0.085) + '); transform-box:fill-box; transform-origin:center top; transition:' + bhTravel_d + ';';
    const bhHasSample_d = ['acq','fill','seal','retract','asc','done'].indexOf(ph_d) >= 0;
    const bhChamberFill_d = 'transform:scaleY(' + (bhHasSample_d ? 1 : 0) + '); transform-box:fill-box; transform-origin:center bottom; transition:transform calc(2.6s * var(--pm, 1)) ease;';
    const _drawing_d = ['comm','clean','ready','fill','acq'].indexOf(ph_d) >= 0;
    const bhPortGlow_d = 'opacity:' + (_drawing_d ? 1 : (ph_d === 'set' ? .45 : 0)) + '; transition:opacity calc(.6s * var(--pm, 1)) ease;';
    const bhInflow_d = 'opacity:' + (_drawing_d ? 1 : 0) + '; transition:opacity .5s ease; animation:streamflow calc(.8s * var(--pm, 1)) linear infinite;';
    // contamination / fluid quality — the reason the tool pumps before it samples
    const _cont_d = Math.max(0, Math.round(this.state.bhCont || 0));
    const _contLive_d = ['clean','ready','fill','seal','retract','asc','done'].indexOf(ph_d) >= 0;
    const bhContText_d = _contLive_d ? _cont_d + '%' : '\u2014';
    const bhContBarW_d = (_contLive_d ? 200 * Math.min(1, _cont_d / 70) : 0).toFixed(1);
    const bhQual_d = !_contLive_d ? 'unknown' : _cont_d > 25 ? 'contaminated' : _cont_d > BH_CONT_LIMIT ? 'improving' : 'acceptable';
    const bhQualText_d = !_contLive_d ? '\u2014' : bhQual_d === 'contaminated' ? 'CONTAMINATED' : bhQual_d === 'improving' ? 'IMPROVING' : 'ACCEPTABLE';
    const bhQualColor_d = !_contLive_d ? 'var(--mut)' : bhQual_d === 'contaminated' ? '#e0a52c' : bhQual_d === 'improving' ? '#e7c95a' : 'var(--grn)';
    const bhFlowColor_d = (!_contLive_d || bhQual_d === 'contaminated') ? '#e0a52c' : bhQual_d === 'improving' ? '#e7c95a' : '#5fd0ff';
    const bhFlowStyle_d = 'opacity:' + (_drawing_d ? 1 : 0) + '; transition:opacity .5s ease; animation:flowup calc(1s * var(--pm, 1)) linear infinite;';
    const bhPumpSpin_d = 'transform-box:fill-box; transform-origin:center; animation:' + ((ph_d === 'clean' || ph_d === 'fill') ? 'toolspin calc(1.6s * var(--pm, 1)) linear infinite' : 'none') + ';';
    const bhQualNote_d = !_contLive_d ? 'cleanup required' : bhQual_d === 'acceptable' ? 'sample quality acceptable' : 'not ready to sample';
    // flow routing: waste while cleaning up, sample chamber once quality is acceptable
    const bhRoute_d = (ph_d === 'comm' || ph_d === 'clean') ? 'waste' : (ph_d === 'fill' || ph_d === 'acq') ? 'sample' : 'idle';
    const _dash_d = 'animation:flowup calc(1s * var(--pm, 1)) linear infinite;';
    const bhWasteColor_d = bhRoute_d === 'waste' ? '#e0752e' : 'rgba(150,180,215,.28)';
    const bhSampColor_d = bhRoute_d === 'sample' ? 'var(--grn)' : 'rgba(150,180,215,.28)';
    const bhWasteBg_d = bhRoute_d === 'waste' ? 'rgba(224,117,46,.12)' : 'rgba(12,20,34,.8)';
    const bhSampBg_d = bhRoute_d === 'sample' ? 'rgba(70,211,154,.12)' : 'rgba(12,20,34,.8)';
    const bhWasteStyle_d = 'opacity:' + (bhRoute_d === 'waste' ? 1 : .35) + '; ' + (bhRoute_d === 'waste' ? _dash_d : '');
    const bhSampStyle_d = 'opacity:' + (bhRoute_d === 'sample' ? 1 : .35) + '; ' + (bhRoute_d === 'sample' ? _dash_d : '');
    const bhProbeStyle_d = 'transform:translateX(' + (_atDepth_d ? 0 : -8) + 'px); transition:transform calc(1.2s * var(--pm, 1)) ease; opacity:' + (_atDepth_d ? 1 : 0) + ';';
    const bhProbeCutStyle_d = 'transform:translateX(' + (_atDepth_d ? 0 : 10) + 'px); transition:transform calc(1.2s * var(--pm, 1)) ease; opacity:' + (_atDepth_d ? 1 : .25) + ';';
    const bhProbeStyleL_d = 'transform:translateX(' + (_atDepth_d ? 0 : 8) + 'px); transition:transform calc(1.2s * var(--pm, 1)) ease; opacity:' + (_atDepth_d ? 1 : 0) + ';';
    const bhProbeCutStyleL_d = 'transform:translateX(' + (_atDepth_d ? 0 : 10) + 'px); transition:transform calc(1.2s * var(--pm, 1)) ease; opacity:' + (_atDepth_d ? 1 : .25) + ';';
    const bhProbeCutStyleR_d = 'transform:translateX(' + (_atDepth_d ? 0 : -10) + 'px); transition:transform calc(1.2s * var(--pm, 1)) ease; opacity:' + (_atDepth_d ? 1 : .25) + ';';
    const bhInvadeStyle_d = 'opacity:' + (_contLive_d ? Math.max(0.06, Math.min(0.9, _cont_d / 70)) : 0.75) + '; transition:opacity .4s linear;';
    const bhProbeText_d = _atDepth_d ? 'Set \u00b7 sealed' : (ph_d === 'asc' || ph_d === 'done') ? 'Retracted' : 'Retracted';
    const bhProbeColor_d = _atDepth_d ? 'var(--grn)' : 'var(--mut)';
    // six sample chambers in the multisample section
    const _filled_d = this.state.bhFilled || 0;
    const _sealed_d = ph_d === 'seal' || ph_d === 'retract' || ph_d === 'asc' || ph_d === 'done';
    const bhChambers_d = [0, 1].map((i) => {
      const state = i < _filled_d ? (_sealed_d ? 'SEALED' : 'FILLED')
        : (ph_d === 'fill' && i === _filled_d) ? 'FILLING' : 'READY';
      const full = state !== 'READY';
      const color = state === 'SEALED' ? 'var(--grn)' : state === 'FILLED' ? '#f0b45a' : state === 'FILLING' ? '#e7c95a' : 'var(--mut)';
      return {
        n: '0' + (i + 1), state: state, color: color,
        ring: state === 'READY' ? 'var(--line2)' : color,
        cx: (52 + i * 24).toFixed(0),
        ly: (170 + i * 40).toFixed(0),
        foy: (152 + i * 40).toFixed(0),
        foy2: (166 + i * 40).toFixed(0),
        xIn: (243 + i * 9).toFixed(0),
        cardY: (384 + i * 58).toFixed(0),
        cardYf: (385.4 + i * 58).toFixed(1),
        cardLabY: (396 + i * 58).toFixed(0),
        cardSubY: (410 + i * 58).toFixed(0),
        cardLeadY: (400 + i * 58).toFixed(0),
        fillStyle: 'transform:scaleY(' + (full ? 1 : 0) + '); transform-box:fill-box; transform-origin:center bottom; transition:transform ' + (state === 'FILLING' ? 'calc(3.4s * var(--pm, 1))' : 'calc(1s * var(--pm, 1))') + ' ease;'
      };
    });
    const bhRouteText_d = bhRoute_d === 'waste' ? 'Formation \u2192 Probe \u2192 Cleanup / Pump \u2192 Wellbore (waste)'
      : bhRoute_d === 'sample' ? 'Formation \u2192 Probe \u2192 Sample Chamber ' + ('0' + Math.min(2, (this.state.bhFilled || 0) + 1))
      : ph_d === 'done' ? 'Flow path closed \u00b7 sample sealed in the tool'
      : 'Flow path closed';
    const bhRouteColor_d = bhRoute_d === 'waste' ? '#e7a55a' : bhRoute_d === 'sample' ? '#7ce0b4' : 'rgba(180,205,235,.6)';
    const bhActiveChText_d = ph_d === 'fill' ? '0' + Math.min(2, _filled_d + 1) : (_filled_d > 0 ? '0' + _filled_d : '\u2014');
    const bhChFilledText_d = _filled_d + ' / 2';
    const _wave_d = (x0, y0, w) => { let p = []; for (let i = 0; i <= 12; i++) { const q = i / 12; const amp = _contLive_d ? (2 + 7 * Math.min(1, _cont_d / 60)) : 4; p.push((x0 + q * w).toFixed(1) + ',' + (y0 + Math.sin(q * Math.PI * 3.2) * amp).toFixed(1)); } return p.join(' '); };
    const bhAnzWave_d = _wave_d(42, 139, 48);
    const bhAnzWave2_d = _wave_d(316, 214, 148);
    const bhAnzWaveStyle_d = 'opacity:' + (_drawing_d ? 1 : .3) + '; transition:opacity .4s ease;';
    const bhAnzStroke_d = _drawing_d ? bhQualColor_d : 'rgba(120,155,200,.35)';
    const _pathOn_d = (on) => on ? 1 : .35;
    const bhPathNodes_d = [
      { label: 'FORMATION', y: 44, on: _drawing_d },
      { label: 'PROBE INTAKE', y: 104, on: _drawing_d },
      { label: 'FLOW VALVE', y: 164, on: bhRoute_d !== 'idle' }
    ].map((n, i) => ({
      label: n.label, y: String(n.y), ty: String(n.y + 9),
      bg: n.on ? 'rgba(18,30,48,.95)' : 'rgba(12,20,34,.8)',
      ring: n.on ? 'rgba(120,170,235,.55)' : 'rgba(120,155,200,.25)',
      fg: n.on ? '#dceafb' : 'rgba(190,215,245,.5)',
      link: i === 0 ? 'M406 44 V44' : 'M406 ' + (n.y - 26) + ' V' + n.y,
      linkColor: bhFlowColor_d,
      linkStyle: 'opacity:' + (_drawing_d && n.on ? 1 : .25) + '; ' + (_drawing_d && n.on ? _dash_d : '')
    }));
    const bhSampSub_d = ph_d === 'fill' ? 'chamber ' + ('0' + Math.min(2, (this.state.bhFilled || 0) + 1)) : 'awaiting clean fluid';
    const bhModeText_d = ({ idle:'STANDBY', desc:'RUN IN HOLE', set:'SET PROBE', comm:'FORMATION COMMUNICATION', clean:'CLEANUP / PUMP-OUT', ready:'READY TO SAMPLE', fill:'SAMPLE COLLECTION', acq:'SAMPLE COLLECTION', seal:'SEALING CHAMBERS', retract:'RETRACTING PROBE', asc:'PULL OUT', done:'AT SURFACE' })[ph_d] || 'STANDBY';
    const _modeTone_d = ph_d === 'done' ? 'good' : (ph_d === 'clean' || ph_d === 'comm') ? 'warn' : ph_d === 'idle' ? 'idle' : 'busy';
    const bhModeColor_d = _modeTone_d === 'good' ? 'var(--grn)' : _modeTone_d === 'warn' ? 'var(--amb)' : _modeTone_d === 'busy' ? '#7fb4ff' : 'rgba(190,215,245,.6)';
    const bhModeBg_d = _modeTone_d === 'good' ? 'rgba(70,211,154,.12)' : _modeTone_d === 'warn' ? 'rgba(231,177,90,.12)' : _modeTone_d === 'busy' ? 'rgba(80,150,235,.14)' : 'rgba(150,175,210,.08)';
    const bhModeBorder_d = _modeTone_d === 'good' ? 'rgba(70,211,154,.4)' : _modeTone_d === 'warn' ? 'rgba(231,177,90,.4)' : _modeTone_d === 'busy' ? 'rgba(80,150,235,.4)' : 'rgba(150,175,210,.22)';
    const bhLogRows_d = (this.state.bhLog || []);
    const bhProbeNote_d = _atDepth_d ? 'sealed against formation' : 'retracted';
    const bhCutNote_d = ph_d === 'clean' ? 'pumping filtrate to wellbore \u00b7 not sampling yet'
      : ph_d === 'fill' ? 'clean fluid routed into chamber ' + bhActiveChText_d
      : ph_d === 'seal' ? 'chamber valves closed \u00b7 samples sealed'
      : ph_d === 'comm' ? 'formation communication established'
      : ph_d === 'set' ? 'probe setting against formation'
      : _contLive_d ? 'clean fluid captured at reservoir conditions'
      : 'cleanup required before sampling';
    // Cased-hole (SRS): the page's resting view is the sample-acquired state at depth
    const _cased_d = this.state.bhMode === 'cased';
    const csIdle_d = false;
    const _csFill_d = Math.max(0, Math.min(100, this.state.bhCsFill || 0));
    const csDown_d = csIdle_d || bhDown_d;
    const csFilled_d = csIdle_d || bhHasSample_d;
    const bhCsToolXY_d = 'transform:translateY(' + (csDown_d ? 320 : 0) + 'px); transition:' + bhTravel_d + ';';
    const bhCsCableK_d = 'transform:scaleY(' + (csDown_d ? 1 : 0.06) + '); transform-box:fill-box; transform-origin:center top; transition:' + bhTravel_d + ';';
    const bhCsChamberFill_d = 'transform:scaleY(' + ((ph_d === 'fill' || ph_d === 'seal' || ph_d === 'asc' || ph_d === 'done') ? 1 : 0) + '); transform-box:fill-box; transform-origin:center bottom; transition:' + (ph_d === 'fill' ? 'transform calc(6s * var(--pm, 1)) linear' : 'transform .35s ease') + '; will-change:transform;';
    const bhCsPortGlow_d = 'opacity:' + (ph_d === 'fill' ? 1 : ph_d === 'seal' ? .5 : 0) + '; transition:opacity calc(.6s * var(--pm, 1)) ease;';
    const bhCsCalloutXY_d = 'transform:translateY(' + (_atDepth_d || ph_d === 'acq' ? 200 : 0) + 'px); transition:transform calc(5.4s * var(--pm, 1)) cubic-bezier(.42,0,.58,1);';
    // the chamber level is driven by ONE long CSS transition rather than per-frame writes
    const _fillOn_d = ph_d === 'fill' || ph_d === 'seal' || ph_d === 'asc' || ph_d === 'done';
    const _fillEase_d = ph_d === 'fill' ? 'transform calc(6s * var(--pm, 1)) linear' : 'transform .35s ease';
    const bhCsBigFill_d = 'transform:scaleY(' + (_fillOn_d ? 1 : 0) + '); transform-box:fill-box; transform-origin:center bottom; transition:' + _fillEase_d + '; will-change:transform;';
    const bhCsBarW_d = (132 * _csFill_d / 100).toFixed(1);
    const bhCsFillText_d = _csFill_d + ' %';
    const bhCsIntake_d = 'opacity:' + (ph_d === 'fill' ? 1 : 0) + '; transition:opacity .4s ease;';
    const bhCsSampleText_d = ph_d === 'fill' ? (_csFill_d >= 100 ? 'Filled' : 'Filling') : (ph_d === 'seal' || ph_d === 'asc' || ph_d === 'done') ? 'Sealed' : 'Ready';
    const bhCsSampleColor_d = ph_d === 'fill' ? 'var(--amb)' : (ph_d === 'seal' || ph_d === 'asc' || ph_d === 'done') ? 'var(--grn)' : 'var(--mut)';
    const bhCsStage_d = ({ idle:'Staged at surface', desc:'Running SRS tool to depth', set:'Sampling depth reached', comm:'Confirming stable producing conditions', fill:'Collecting wellbore sample', seal:'Sample sealed', asc:'Retrieving sampling tool', done:'Sampling complete \u2014 tool at surface' })[ph_d] || 'Staged at surface';
    const bhCsNote_d = ({ idle:'Well producing \u00b7 tool ready to run', desc:'Tool descending through the producing well', set:'Tool positioned at 8,450 ft TVD in the flowing column', comm:'Wellbore flow steady \u00b7 representative sample possible', fill:'Producing oil entering the SRS sample chamber', seal:'Sample chamber isolated at downhole conditions', asc:'SRS tool returning to surface \u00b7 sample sealed', done:'Sealed sample at surface \u00b7 ready for lab transfer' })[ph_d] || 'Well producing \u00b7 tool ready to run';
    const bhCsChip_d = ({ idle:'STAGED AT SURFACE \u00b7 WELL PRODUCING', desc:'RUNNING TO DEPTH \u00b7 ' + (this.state.bhDepth || 0).toLocaleString('en-US') + ' FT', set:'AT DEPTH \u00b7 8,450 FT', comm:'STABLE PRODUCING CONDITIONS', fill:'FILLING SAMPLE CHAMBER \u00b7 ' + _csFill_d + '%', seal:'SAMPLE ACQUIRED \u00b7 SEALED', asc:'PULLING OUT \u00b7 ' + (this.state.bhDepth || 0).toLocaleString('en-US') + ' FT', done:'SAMPLE SEALED \u00b7 AT SURFACE' })[ph_d] || 'STAGED AT SURFACE \u00b7 WELL PRODUCING';
    const _csStepIdx_d = ({ idle:-1, desc:0, set:1, comm:2, fill:(_csFill_d < 12 ? 3 : 4), seal:5, asc:6, done:7 })[ph_d] ?? -1;
    const bhCsBtnText_d = ph_d === 'idle' ? 'Run SRS Sampling Programme' : ph_d === 'done' ? 'Restart Sampling Programme'
      : ({ desc:'Running in Hole\u2026', set:'At Sampling Depth\u2026', comm:'Confirming Flow\u2026', fill:'Filling Sample Chamber\u2026', seal:'Sealing Sample\u2026', asc:'Pulling Out of Hole\u2026' })[ph_d] || 'Sampling\u2026';
    const bhDepthText_d = (this.state.bhDepth || 0).toLocaleString('en-US');
    const bhPText_d = (this.state.bhP || 0).toLocaleString('en-US');
    const bhTText_d = String(this.state.bhT || 78);
    const bhToolStatus_d = ({ idle:'Staged at surface', desc:'Running in hole', set:'Setting probe at depth', comm:'Formation communication', clean:'Cleanup \u00b7 pumping out filtrate', ready:'Fluid quality acceptable \u2014 ready to sample', fill:'Filling sample chambers', seal:'Sealing sample chambers', retract:'Retracting probe', acq:'Acquiring sample at depth', asc:'Pulling out of hole', done:'At surface \u2014 samples sealed in tool' })[ph_d] || 'Staged at surface';
    const bhPhaseNote_d = ({
      idle: (_cased_d ? 'Tool in lubricator \u00b7 ready to run' : 'Tool racked in the derrick \u00b7 ready to run in hole'),
      desc:'Wireline paying out \u00b7 tool descending to 8,450 ft',
      set:'Probe extending \u00b7 sealing against the open-hole wall',
      comm:'Flow path open to the formation \u00b7 first fluid is filtrate',
      clean:'Pump-out running \u00b7 contamination falling toward the sampling limit',
      ready:'Cleanup complete \u00b7 start sample collection to open the chamber valves',
      fill:'Clean fluid routed to the selected chamber',
      seal:'Chambers closed and sealed at reservoir conditions',
      retract:'Probe retracting \u00b7 preparing to pull out of hole',
      acq:'Formation fluid entering chamber at reservoir conditions',
      asc:'Wireline reeling in \u00b7 sample sealed in chamber',
      done:'Sampling complete \u00b7 ready to move to lab (QC)'
    })[ph_d] || (_cased_d ? 'Tool in lubricator \u00b7 ready to run' : 'Tool racked in the derrick \u00b7 ready to run in hole');
    const bhStatusColor_d = ph_d === 'done' ? 'var(--grn)' : (ph_d === 'idle' ? 'var(--mut)' : ph_d === 'ready' ? 'var(--grn)' : (ph_d === 'clean' || ph_d === 'comm') ? 'var(--amb)' : 'var(--blue)');
    const _bhReady_d = ph_d === 'ready';
    const _bhIdleBtn_d = ph_d === 'idle' || ph_d === 'done';
    const bhBtnText_d = _bhReady_d ? 'Start Sample Collection'
      : _bhIdleBtn_d ? (ph_d === 'done' ? 'Restart Sampling Programme' : 'Run Sampling Programme')
      : ({ desc:'Running in Hole\u2026', set:'Setting Probe\u2026', comm:'Establishing Communication\u2026',
           clean:'Sample Not Ready \u2014 Cleaning Up', fill:'Collecting Sample\u2026', acq:'Collecting Sample\u2026',
           seal:'Sealing Chambers\u2026', retract:'Retracting Probe\u2026', asc:'Pulling Out of Hole\u2026' })[ph_d] || 'Sampling\u2026';
    const _bhLive_d = ((_bhReady_d && !_cased_d) || _bhIdleBtn_d);
    const bhBtnStyle_d = { ..._actBtn_d(_bhLive_d), marginTop:'auto' };
    const bhBtnAction_d = () => { if (_cased_d) { if (_bhIdleBtn_d) this.runSample(); return; } if (_bhReady_d) this.bhStartSampling(); else if (_bhIdleBtn_d) this.runSample(); };
    const bhProgPct_d = ({ idle:0, desc:14, set:24, comm:34, clean:48, ready:56, fill:70, seal:78, retract:85, acq:70, asc:93, done:100 })[ph_d] ?? 0;
    const bhProgStyle_d = 'height:100%; width:' + bhProgPct_d + '%; border-radius:3px; background:linear-gradient(90deg,#2f6fd0,#5fb0ff); transition:width calc(1.2s * var(--pm, 1)) ease;';
    const bhChipLine_d = ({
      idle:'RACKED IN DERRICK \u00b7 READY TO RIH',
      desc:'RUNNING IN HOLE \u00b7 ' + bhDepthText_d + ' FT',
      set:'PROBE SET \u00b7 8,450 FT',
      comm:'FORMATION COMMUNICATION \u00b7 8,450 FT',
      clean:'CLEANUP \u00b7 CONTAMINATION ' + bhContText_d,
      ready:'READY TO SAMPLE \u00b7 ' + bhContText_d,
      retract:'PROBE RETRACTED \u00b7 8,450 FT',
      fill:'FILLING CHAMBER ' + bhActiveChText_d + ' \u00b7 8,450 FT',
      seal:'CHAMBERS SEALED \u00b7 ' + bhChFilledText_d,
      acq:'FILLING CHAMBER \u00b7 8,450 FT',
      asc:'PULLING OUT \u00b7 ' + bhDepthText_d + ' FT',
      done:'SEALED \u00b7 AT SURFACE'
    })[ph_d] || 'RACKED IN DERRICK \u00b7 READY TO RIH';
    const bhChipColor_d = ph_d === 'done' ? 'var(--grn)' : 'var(--mut)';
    const bhCsChipLine_d = _cased_d ? bhCsChip_d : bhChipLine_d;
    const bhCsChipColor_d = (ph_d === 'seal' || ph_d === 'asc' || ph_d === 'done') ? 'var(--amb)' : bhChipColor_d;
    const bhSampleStatus_d = (ph_d === 'fill' || ph_d === 'acq') ? 'Acquiring' : ph_d === 'ready' ? 'Ready to sample' : ph_d === 'clean' ? 'Cleanup' : (bhHasSample_d ? 'Sealed in tool' : 'Not acquired');
    const bhSampleColor_d = (ph_d === 'fill' || ph_d === 'acq' || ph_d === 'clean') ? 'var(--amb)' : (bhHasSample_d ? 'var(--grn)' : 'var(--mut)');
    const bhStepIdx_d = csIdle_d ? 4 : (({ idle:-1, desc:0, set:1, comm:2, clean:3, ready:3, fill:4, acq:4, seal:5, retract:5, asc:6, done:7 })[ph_d] ?? -1);
    const bhAllDone_d = ph_d === 'done';
    const _csLabels_d = ['Run in hole', 'Reach sampling depth', 'Confirm producing condition', 'Open sample chamber', 'Fill sample chamber', 'Seal sample', 'Pull out of hole', 'Ready for lab transfer'];
    const bhSteps_d = (_cased_d ? _csLabels_d : ['Run in hole', 'Set at depth', 'Establish formation communication', 'Cleanup \u00b7 reduce contamination', 'Fill sample chamber', 'Seal sample', 'Pull out of hole', 'Ready for lab transfer']).map((label, i) => {
      const _idx = _cased_d ? _csStepIdx_d : bhStepIdx_d;
      const done = bhAllDone_d || i < _idx, active = !bhAllDone_d && i === _idx;
      return {
        n: String(i + 1), label,
        bg: done ? 'rgba(70,211,154,.07)' : active ? 'rgba(77,157,255,.10)' : 'transparent',
        ring: done ? 'var(--accg)' : active ? 'var(--blue)' : 'var(--ringpend)',
        dot: done ? 'rgba(70,211,154,.16)' : active ? 'rgba(77,157,255,.2)' : 'transparent',
        fg: done ? 'var(--fgdone)' : active ? 'var(--txt)' : 'var(--dis)',
        tag: done ? 'DONE' : active ? 'ACTIVE' : 'PENDING',
        tagColor: done ? 'var(--accg)' : active ? 'var(--accb)' : 'var(--tagpend)'
      };
    });
    const showBhPanel_d = ap_d === 'bottomhole';
    const showBottlePanel_d = ap_d === 'wellhead' || ap_d === 'separator';
    const runningNow_d = ph_d !== 'idle' && ph_d !== 'done';
    const doneNow_d = ph_d === 'done';
    const modeCfg_d = ({ wellhead:{t:60}, separator:{t:50}, bottomhole:{t:108} })[ap_d] || {t:60};
    const bottleP_d = this.state.mechPressure || 0;
    const rtBottlePressure_d = bottleP_d.toLocaleString('en-US');
    const rtTemp_d = (25 + (modeCfg_d.t - 25) * f_d).toFixed(1);
    const rtStatus_d = doneNow_d ? 'Sample Collected' : runningNow_d ? 'Acquiring' : 'Ready';
    const rtStatusColor_d = doneNow_d ? 'var(--accg)' : runningNow_d ? 'var(--blue)' : 'var(--mut)';
    const rtStatusTextStyle_d = 'font-size:12.5px; font-weight:600; color:' + rtStatusColor_d + ';';
    const _now_d = new Date(this.state.nowTs || Date.now());
    const _p2_d = (n) => (n < 10 ? '0' + n : '' + n);
    const _h12_d = ((_now_d.getHours() + 11) % 12) + 1;
    const rtUpdated_d = _p2_d(_h12_d) + ':' + _p2_d(_now_d.getMinutes()) + ':' + _p2_d(_now_d.getSeconds()) + ' ' + (_now_d.getHours() < 12 ? 'AM' : 'PM');
    const _secs_d = this.state.sampleSecs || 0;
    const rtDuration_d = (runningNow_d || doneNow_d) ? (_p2_d(Math.floor(_secs_d/60)) + ':' + _p2_d(_secs_d % 60)) : '00:00';
    const _vst_d = (c) => 'font-size:14px; font-weight:600; color:' + c + '; white-space:nowrap;';
    const _mkCard_d = (l, v, u, c) => ({ l: l, v: v, u: u || '', vstyle: _vst_d(c || 'var(--txt)') });
    let bottomCards_d;
    const whTempFixed_d = '60.0';
    const sepTempFixed_d = '35.0';
    if (ap_d === 'wellhead') bottomCards_d = [ _mkCard_d('Wellhead Pressure', (1450).toLocaleString('en-US'), 'psig'), _mkCard_d('Wellhead Temperature', whTempFixed_d, '\u00B0C') ];
    else if (ap_d === 'separator') bottomCards_d = [ _mkCard_d('Separator Pressure', (200).toLocaleString('en-US'), 'psig'), _mkCard_d('Separator Temp.', sepTempFixed_d, '\u00B0C') ];
    else bottomCards_d = [ _mkCard_d('Bottom-Hole Pressure', (4200).toLocaleString('en-US'), 'psia'), _mkCard_d('Bottom-Hole Temp.', rtTemp_d, '\u00B0C'), _mkCard_d('Depth', (8500).toLocaleString('en-US'), 'ft'), _mkCard_d('Sampling Duration', rtDuration_d, ''), _mkCard_d('Sample Status', rtStatus_d, '', rtStatusColor_d) ];
    const liveCards_d = ap_d === 'wellhead'
      ? [ { l:'WELLHEAD PRESSURE', v:(1450).toLocaleString('en-US'), u:'psig' }, { l:'WELLHEAD TEMPERATURE', v:whTempFixed_d, u:'\u00B0C' } ]
      : ap_d === 'separator'
      ? [ { l:'SEPARATOR PRESSURE', v:(200).toLocaleString('en-US'), u:'psig' }, { l:'SEPARATOR TEMP.', v:sepTempFixed_d, u:'\u00B0C' } ]
      : [];
    const subMap_d = { overview:'Full sampling system and locations', wellhead:'Dedicated sampling line into the oil bottle', separator:'Independent oil and gas sampling paths', bottomhole:'MDT formation tester \u00b7 MRMS multisample module \u00b7 open-hole interval' };
    const m01Subtitle_dd = subMap_d[ap_d] || 'Select a sampling point to begin acquisition';
    const whFillFrac_d = pressurized_d ? 0.68 : mechFilled_d ? 0.5 : connected_d ? 0.14 : 0.05;
    const whFillEase_d = 'transform calc(3s * var(--pm, 1)) cubic-bezier(.4,.1,.3,1)';
    const whMechSampleStyle_d = { transform: `scaleY(${whFillFrac_d})`, transformBox: 'fill-box', transformOrigin: 'top', transition: whFillEase_d };
    const whMechPistonStyle_d = { transform: `translateY(${whFillFrac_d * 290}px)`, transition: whFillEase_d };

    // ===== Module 01 — Sampling (overview + 3 focused pages) =====
    const view = this.state.m01View;
    const ph = this.state.m01Phase;
    const method = this.state.m01Method;
    const scr = this.state.screen;
    const inM01 = scr === 'module01';

    // helper: derive phase index per method
    const bhIdx = { idle:0, descend:1, acquire:2, ascend:3, connect:4, transfer:5, done:6 }[ph] ?? 0;
    const surfIdx = { idle:0, connect:1, open:2, transfer:3, done:4 }[ph] ?? 0;

    const navBase = 'display:flex; align-items:center; gap:8px; padding:7px 13px; border-radius:8px; font-family:inherit; font-size:12.5px; cursor:pointer; text-align:left; width:auto; white-space:nowrap; transition:background .15s ease;';
    const navActive = navBase + 'border:1px solid rgba(77,157,255,.3); background:linear-gradient(90deg,rgba(77,157,255,.16),rgba(77,157,255,.04)); color:var(--blue); font-weight:500;';
    const navIdle = navBase + 'border:1px solid transparent; background:none; color:var(--mut);';

    /* ---- one global Back control: screen -> parent screen ---- */
    const BACK_PARENT = {
      about:'dashboard', settings:'dashboard',
      module01:'dashboard', mdtXfer:'validation',
      validation:'dashboard', module02:'validation', module03:'validation',
      pvTest:'validation', density:'validation', recomb:'validation',
      analysis:'dashboard', difflib:'analysis', separator:'analysis',
      gc:'analysis', visc:'analysis', analysisTest:'analysis',
      viscMenu:'analysis', viscKin:'viscMenu', viscSingle:'viscMenu', viscTwo:'viscMenu',
      module04:'dashboard', module05:'dashboard'
    };
    const BACK_NAME = {
      dashboard:'Dashboard', module01:'Field Sampling',
      validation:'Validation', analysis:'PVT Analysis', viscMenu:'Viscosity Tests'
    };
    const backTo = BACK_PARENT[scr] || null;

    // ===== Module 01b — Bottom-hole SPMC chamber (from the MDT MRMS) -> SPS/PDS transfer (bottom hole only) =====
    const xfP = (this.state.xfrP || 0) / 100;
    const xfH = (this.state.xfrH || 0) / 100;          // heating progress, 0..1
    const xfPh = this.state.xfrPhase || 'idle';
    const mxHeating = xfPh === 'heat';
    const mxRunning = xfPh === 'run', mxDone = xfPh === 'done';
    const mxHeated = mxRunning || mxDone || (mxHeating && xfH >= 1);   // at 114 degC and stable
    // Styles here are CSS STRINGS: the runtime writes attributes with String(value),
    // so a style object would render as "[object Object]" and be ignored.
    // The tween pushes ~200 frames over the run, so the transition only needs to be
    // long enough to smooth a frame - anything longer lags the volume readout.
    const mxEase = 'transform .12s linear';

    // ---- Transfer sequence, all derived from the one master clock xfP (0..1).
    // Each fluid starts at its real source and travels to its destination; all
    // volumes stop together when the pump stops (xfP = 1).
    //   valve    0.00-0.05  bottle top valve opens (before any sample arrives)
    //   F1       0.03-0.15  pump drive front: pump outlet -> drive line -> SPMC end connection
    //   Vm       0.15-1.00  SPMC piston train sweeps the sample out (drive side grows)
    //   F2       0.15-0.27  sample front: SPMC sample inlet -> transfer line -> valve -> bottle top
    //   Vb       0.27-1.00  sample enters SPS/PDS, piston moves down, water side shrinks by the same volume
    //   F3       0.27-0.37  displaced-water front: bottle water port -> lower line -> receiver
    //   Vr       0.37-1.00  receiver fills with the displaced water (ends equal to the sample volume)
    const mxCl = (v) => Math.min(1, Math.max(0, v));
    const mxLin = (a, b) => mxCl((xfP - a) / (b - a));
    const mxEio = (a, b) => { const x = mxLin(a, b); return (1 - Math.cos(Math.PI * x)) / 2; };
    const mxValve = (mxRunning || mxDone) ? mxLin(0, 0.05) : 0;          // 0 closed .. 1 open
    const mxF1 = mxLin(0.03, 0.15);
    const mxVm = mxEio(0.15, 1);
    // the sample front waits behind the SPMC sample isolation and the bottle sample valve (both open with mxValve)
    const mxF2 = mxValve >= 1 ? mxLin(0.15, 0.27) : 0;
    const mxVb = mxEio(0.27, 1);
    const mxF3 = mxLin(0.27, 0.37);
    const mxVr = mxEio(0.37, 1);
    const mxFrontStyle = (L, f) => `stroke-dashoffset:${(L + 4 - f * L).toFixed(2)}; opacity:${f > 0.001 ? 1 : 0}; transition:stroke-dashoffset .12s linear;`;
    const mxPulseStyle = (f) => `opacity:${(mxRunning && f > 0.001) ? 1 : 0}; transition:opacity .35s ease;`;
    const mxArrowStyle = (f, at) => `opacity:${f >= at ? 0.95 : 0.22}; transition:opacity .25s ease;`;
    const mxPumpFrontStyle = mxFrontStyle(365.2, mxF1), mxPumpPulseStyle = mxPulseStyle(mxF1);
    const mxXferFrontStyle = mxFrontStyle(175, mxF2),   mxXferPulseStyle = mxPulseStyle(mxF2);
    const mxWoutFrontStyle = mxFrontStyle(86.8, mxF3), mxWoutPulseStyle = mxPulseStyle(mxF3);
    const mxArrowPumpStyle = mxArrowStyle(mxF1, 168 / 365.2);
    const mxArrowX1Style = mxArrowStyle(mxF2, 38 / 175);
    const mxArrowX2Style = mxArrowStyle(mxF2, 1);
    const mxArrowWStyle = mxArrowStyle(mxF3, 28.5 / 86.8);
    // bottle valve state ring (the bottle's own sample and driving-fluid valves)
    const mxValveRing = mxValve >= 1 ? '#46d39a' : '#8fa3c2';

    // ---- Source SPMC chamber (equipment/mrms-draw.js MRDraw.xfer, local chamber units).
    // The pump is connected at the SPMC END connection: drive fluid enters behind the nitrogen piston and
    // pushes the piston train (nitrogen piston, trapped compensating fluid, sample piston) toward the inlet.
    // The sample piston sweeps the full sample length (no dead volume) as the swept fraction mxVm goes
    // 0 -> 1, so the sample left in the SPMC always equals the volume that has left it, and the drive
    // side grows by the same amount. Only the sample leaves through the inlet.
    const MXS = window.MRDraw ? window.MRDraw.XFER : { sp0: -21, travel: 200, np: 86, resH: 211, driveH: 310 };
    const mxChT = window.MRDraw ? window.MRDraw.G.chT : -222, mxChB = window.MRDraw ? window.MRDraw.G.chB : 222;
    const mxShift = -MXS.travel * mxVm;                                 // piston-train displacement (local units)
    const mxSp = MXS.sp0 + mxShift, mxNp = MXS.np + mxShift;
    const mxSpResStyle = `transform:scaleY(${((mxSp + 10 - mxChT) / MXS.resH).toFixed(4)}); transform-box:fill-box; transform-origin:top; transition:${mxEase};`;
    const mxSpDriveStyle = `transform:scaleY(${((mxChB - mxNp - 26) / MXS.driveH).toFixed(4)}); transform-box:fill-box; transform-origin:bottom; transition:${mxEase};`;
    const mxSpPistonStyle = `transform:translateY(${mxShift.toFixed(2)}px); transition:${mxEase};`;
    // sample isolation opens with the sampler/transfer valves; the end-port passage fills when the drive front arrives
    const mxSpIsoStyle = `opacity:${mxValve.toFixed(3)}; transition:opacity .3s ease;`;
    const mxSpInletStyle = `opacity:${mxF2 > 0.001 ? 1 : 0}; transition:opacity .3s ease;`;
    const mxSpPortStyle = `opacity:${mxF1 >= 1 ? 1 : 0}; transition:opacity .3s ease;`;
    const mxSampleLabelStyle = `opacity:${mxVm < 0.3 ? 1 : 0}; transition:opacity .3s ease;`;
    // BUFFER label rides with the piston train (page scale of the chamber drawing, rotated -90: local +y = page +x)
    const mxSpScale = (window.MX_SPMC && window.MX_SPMC.s) || 0.6;
    const mxBufferLabelStyle = `transform:translateX(${(mxShift * mxSpScale).toFixed(2)}px); transition:${mxEase};`;

    // Heating step: the jacket is fitted on the SPMC at all times - it never moves.
    // Only its heat (fill sweep, glow and the temperature readout) changes.
    const mxHeatFrac = mxHeated ? 1 : (mxHeating ? xfH : 0);
    const mxJacketStyle = `opacity:${(mxHeating || mxRunning || mxDone) ? 1 : 0.75}; transition:opacity .5s ease;`;
    const mxJacketFillStyle = `transform:scaleX(${mxHeatFrac.toFixed(4)}); transform-box:fill-box; transform-origin:left center; transition:transform .4s linear;`;
    const mxHeatingActive = mxHeating && mxHeatFrac < 1;
    const mxJacketGlowStyle = `animation:${mxHeatingActive ? 'glowpulse 1.4s ease-in-out infinite' : 'none'}; opacity:${(mxHeatingActive || mxHeated) ? 1 : 0}; transition:opacity .4s ease;`;
    const mxTempText = Math.round(22 + (114 - 22) * mxHeatFrac);
    const mxTempBoxText = mxTempText + ' °C' + (mxHeated ? ' · STABLE' : '');

    // ---- SPS/PDS bottle (vertical): bore y 174..426 (252 tall) = ~800 cc.
    // 450 cc of sample enters from the top, so the sample column ends at 450/800 of the bore
    // and exactly that volume of water leaves through the water port.
    // The floating piston itself takes 14 px of the 252 px bore, so the two fluid columns
    // share the remaining 238 px: sample above the piston, water below it, no gap at either face.
    const mxBore = 452, mxPistonH = 46, mxUsable = mxBore - mxPistonH;   // approved Oil Sample Bottle bore (drawing units)
    const mxBFrac = (450 / 800) * mxVb;
    const mxBotFluidTextStyle = `opacity:${mxVb > 0.30 ? 1 : 0}; transition:opacity .4s ease;`;
    const mxBotFluidStyle = `transform:scaleY(${((mxUsable / mxBore) * mxBFrac).toFixed(4)}); transform-box:fill-box; transform-origin:top; transition:${mxEase};`;
    const mxBotWaterStyle = `transform:scaleY(${((mxUsable / mxBore) * (1 - mxBFrac)).toFixed(4)}); transform-box:fill-box; transform-origin:bottom; transition:${mxEase};`;
    const mxBotNeedleT = window.BottleArt ? window.BottleArt.needle(mxValve) : '';
    const mxBotPistonStyle = `transform:translateY(${(mxUsable * mxBFrac).toFixed(1)}px); transition:${mxEase};`;
    const mxBeakerStyle = `transform:scaleY(${(0.76 * mxVr).toFixed(4)}); transform-box:fill-box; transform-origin:bottom; transition:${mxEase};`;
    const mxFlowStyle = `opacity:${mxRunning ? 1 : 0}; transition:opacity .4s ease;`;
    const mxLed = mxRunning ? '#3ddc8a' : mxDone ? '#46d39a' : '#1f6b48';
    const mxLedStyle = 'filter:' + ((mxRunning || mxDone) ? 'drop-shadow(0 0 7px ' + mxLed + ')' : 'none') + '; transition:filter .4s ease;';
    const mxLiveColor = mxDone ? 'var(--grn)' : mxRunning ? 'var(--blue)' : mxHeating ? '#e7752e' : 'var(--mut)';
    const mxLiveLabel = mxDone ? 'Transfer Complete' : mxRunning ? 'Transferring'
      : mxHeating ? (mxHeated ? 'Heated · 114 °C' : 'Heating') : 'Idle';
    const mxXferText = Math.round(450 * mxVb) + ' cc';
    const mxStatusText = mxDone
      ? 'Transfer complete \u2014 sample secured in the SPS/PDS bottle at 5,000 psi \u00b7 114 \u00b0C. Ready for laboratory QC.'
      : mxRunning
        ? 'Transferring \u2014 pump driving the SPMC end connection, piston train displacing the sample into the SPS/PDS bottle\u2026'
        : mxHeated
          ? 'Heated \u2014 sample stabilised at 114 \u00b0C (reservoir temperature). Starting the transfer\u2026'
          : mxHeating
            ? 'Heating \u2014 jacket closed over the SPMC, sample warming from lab temperature to 114 \u00b0C\u2026'
            : 'Ready \u2014 SPMC chamber docked, sample inlet connected to the bottle top valve, pump on the SPMC end connection.';
    const mxBarStyle = `width:100%; height:100%; border-radius:3px; background:linear-gradient(90deg,#3f8ae0,#46d39a); transform:scaleX(${(0.02 + 0.98 * xfP).toFixed(4)}); transform-origin:left center; transition:transform .2s linear;`;
    const mxSampleId = 'BHS-001';
    const mxXferP = Math.round(5000*((mxRunning||mxDone) ? Math.min(1, xfP*5) : 0));
    // transfer-line pressure gauge: the same transfer pressure, on a 0-10,000 psi dial (-135 .. +135 deg)
    const mxLinePText = mxXferP.toLocaleString('en-US') + ' psi';
    const mxLineGaugeStyle = `transform:rotate(${(-135 + 270 * mxXferP / 10000).toFixed(1)}deg); transform-box:view-box; transform-origin:392px 58px; transition:transform .2s linear;`;
    const mxRows = [
      { l:'TRANSFER PRESSURE',    v:mxXferP.toLocaleString('en-US'), u:'psi',  c:'var(--accb)' },
      { l:'TRANSFER TEMPERATURE', v:String(mxTempText),                                  u:'°C', c:'#e7752e' },
      { l:'RESERVOIR PRESSURE',   v:(3000).toLocaleString('en-US'),                      u:'psig', c:'var(--accb)' },
      { l:'RESERVOIR TEMPERATURE',v:'114',                                               u:'°C', c:'#e7752e' },
    ];
    const mxSteps = [
      { label:'Heating jacket closed over the SPMC \u00b7 sample at 114 \u00b0C', th:-1 },
      { label:'Transfer pump pressurises the SPMC drive side', th:0.12 },
      { label:'Sample fluid displaced out of the SPMC', th:0.55 },
      { label:'Sample enters the SPS/PDS bottle \u00b7 water displaced', th:0.99 },
    ].map((s, i_) => {
      const isDone = s.th < 0 ? mxHeated : (mxDone || xfP >= s.th);
      const active = s.th < 0 ? (mxHeating && !mxHeated) : (mxRunning && !isDone);
      const c = isDone ? 'var(--accg)' : active ? 'var(--blue)' : 'var(--dis)';
      return { label:s.label,
        bg: active ? 'rgba(77,157,255,.10)' : isDone ? 'rgba(70,211,154,.09)' : 'var(--chipbg)',
        dotStyle:`width:11px;height:11px;border-radius:50%;flex:0 0 auto;border:1.6px solid ${c};background:${(active||isDone)?c:'transparent'};box-shadow:${active?'0 0 8px '+c:'none'};`,
        txtStyle:`flex:1;font-size:11.5px;color:${(isDone||active)?'var(--lbl)':'var(--dis)'};font-weight:${active?500:300};line-height:1.35;` };
    });
    const mxBtnBase = 'display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:11px 14px; border-radius:10px; font-family:inherit; font-size:13px; font-weight:500; ';
    const mxBusy = mxRunning || mxHeating;
    const mxRunText = mxHeating ? (mxHeated ? 'Heated \u00b7 starting transfer\u2026' : 'Heating to 114 \u00b0C\u2026')
      : mxRunning ? 'Transferring\u2026' : mxDone ? 'Re-run Heating & Transfer' : 'Start Heating & Transfer';
    const mxRunStyle = mxBtnBase + `background:${mxBusy?'rgba(150,175,210,.06)':'linear-gradient(180deg,#3f8ae0,#2f6fd0)'}; border:1px solid ${mxBusy?'var(--line)':'#5a9bea'}; color:${mxBusy?'var(--mut2)':'#ffffff'}; cursor:${mxBusy?'default':'pointer'};`;
    const mxNextStyle = mxBtnBase + `background:var(--icard); border:1px solid ${mxDone?'#5a9bea':'var(--line2)'}; color:${mxDone?'var(--accb)':'var(--txt2)'}; cursor:pointer;`;

    // ===== Module 02 — Quality Check (QC) =====
    const rp = this.state.restorePhase;
    const qIdx = { idle:-1, received:0, connected:1, valvetest:2, bleed:3, bleeding:4, oil:5, complete:6 }[rp] ?? -1;
    const rRunning = rp !== 'idle' && rp !== 'complete';
    const restored = rp === 'complete';
    const waterFlow = rp === 'bleed' || rp === 'bleeding';
    const oilFlow = rp === 'oil' || rp === 'complete';
    const dischargeOn = waterFlow || rp === 'oil';
    const curP = this.state.curP;
    const curPText = curP.toLocaleString('en-US');
    const curTText = '';

    // bottle internal free-water layer drains away as bleeding proceeds
    const waterShrink = restored ? 0 : (rp === 'oil') ? 0.15 : (rp === 'bleeding') ? 0.5 : 1;
    const bottleWaterStyle = { transform: `scaleY(${waterShrink})`, transformBox: 'fill-box', transformOrigin: 'center bottom', transition: 'transform calc(1.4s * var(--pm, 1)) ease', opacity: waterShrink < 0.02 ? 0 : 0.9 };

    const dischargeColor = (rp === 'oil') ? 'var(--amb)' : waterFlow ? 'var(--accw)' : oilFlow ? 'var(--amb)' : 'var(--line2)';
    const dischargeLabel = restored ? 'Stopped' : (rp === 'oil') ? 'Oil' : waterFlow ? 'Water' : 'Idle';
    const waterMeasured = (oilFlow || rp === 'oil') ? '10 cc' : '—';
    const dischargeStyle = { opacity: dischargeOn ? 1 : 0, transition: 'opacity .4s ease' };
    const cupFill = restored ? 1 : oilFlow ? 0.9 : (rp === 'bleeding') ? 0.7 : (rp === 'bleed') ? 0.35 : 0;
    const cupFillStyle = { transform: `scaleY(${cupFill})`, transformBox: 'fill-box', transformOrigin: 'center bottom', transition: 'transform calc(1.2s * var(--pm, 1)) ease', opacity: cupFill < 0.02 ? 0 : 1 };
    const cupLabel = oilFlow ? 'oil' : waterFlow ? 'water' : '';

    // pressure gauge needle -> opening pressure (scale 0..2000 psig)
    const pAng = -130 + 260 * Math.min(1, curP / 2000);
    const pNeedleStyle = { transform: `rotate(${pAng}deg)`, transformOrigin: '560px 180px', transformBox: 'view-box', transition: 'transform .5s ease' };

    const qStatusMap = { idle:'Standby — mount bottle in QC station and start', received:'Bottle connected to QC station', connected:'Connected to QC station', valvetest:'Testing fluid-side valve opening pressure…', bleed:'Opening sample-side valve slowly — water detected', bleeding:'Water removal in progress…', oil:'Oil appearance confirmed — free water cleared', complete:'QC complete — sample ready for PVT Testing + GC' };
    const restoreStatusText = qStatusMap[rp] || 'Standby';
    const restoreLiveColor = restored ? 'var(--grn)' : rRunning ? 'var(--blue)' : 'var(--mut)';
    const restoreLiveLabel = restored ? 'QC Passed' : rRunning ? 'QC Live' : 'Idle';

    // valve test card
    const valveTested = qIdx >= 2;
    const valveMeasured = valveTested ? '1,250 psig' : '—';
    const valveResult = valveTested ? 'Pass' : (qIdx >= 1 ? 'Testing' : 'Idle');
    const valveResultColor = valveTested ? 'var(--grn)' : (qIdx >= 1 ? 'var(--accb3)' : 'var(--mut)');
    const valvePillBg = valveTested ? 'rgba(70,211,154,.10)' : 'rgba(77,157,255,.10)';
    const valvePillBorder = valveTested ? 'rgba(70,211,154,.3)' : 'rgba(77,157,255,.3)';

    // water check card
    const waterPresence = restored || rp === 'oil' ? 'Cleared' : waterFlow ? 'Detected' : '—';
    const waterPresenceColor = (restored || rp === 'oil') ? 'var(--grn)' : waterFlow ? 'var(--amb)' : 'var(--mut)';
    const finalQC = restored ? 'Pass' : 'Pending';
    const finalQCColor = restored ? 'var(--grn)' : 'var(--mut)';

    const rStepDefs = ['Bottle Received', 'Connected to QC Station', 'Valve Opening Pressure Tested', 'Water Bleed Started', 'Water Removed', 'Oil Appearance Confirmed', 'QC Complete'];
    const rSteps = rStepDefs.map((label, i) => {
      const done = i < qIdx, active = i === qIdx;
      const c = done ? 'var(--accg)' : active ? 'var(--blue)' : 'var(--dis)';
      return {
        label,
        dotStyle: `width:11px;height:11px;border-radius:50%;flex:0 0 auto;border:1.6px solid ${c};background:${(active || done) ? c : 'transparent'};box-shadow:${active ? '0 0 8px ' + c : 'none'};`,
        txtStyle: `font-size:12.5px;color:${(done || active) ? 'var(--lbl)' : 'var(--dis)'};font-weight:${active ? 500 : 300};`,
      };
    });
    const rPillColor = restored ? 'var(--grn)' : rRunning ? 'var(--blue)' : 'var(--mut)';
    const rPillText = restored ? 'COMPLETE' : rRunning ? 'IN PROGRESS' : 'READY';
    const rPillBg = restored ? 'rgba(70,211,154,.10)' : rRunning ? 'rgba(77,157,255,.10)' : 'rgba(150,175,210,.06)';
    const rPillBorder = restored ? 'rgba(70,211,154,.3)' : rRunning ? 'rgba(77,157,255,.3)' : 'var(--line)';

    const startBtnText = rRunning ? 'Running QC…' : restored ? 'Restart QC' : 'Start QC Check';
    const startBtnBg = rRunning ? 'rgba(150,175,210,.06)' : 'rgba(77,157,255,.12)';
    const startBtnBorder = rRunning ? 'var(--line)' : 'var(--line2)';
    const startBtnColor = rRunning ? 'var(--mut2)' : 'var(--btnt)';

    const nextBtnText = restored ? 'Approve & Continue to PVT Testing + GC' : 'Awaiting QC';
    const nextBtnBg = restored ? 'linear-gradient(180deg,#46d39a,#2f9d72)' : 'rgba(150,175,210,.05)';
    const nextBtnBorder = restored ? '#2f9d72' : 'var(--line)';
    const nextBtnColor = restored ? '#06241a' : 'var(--mut2)';
    const nextBtnCursor = restored ? 'pointer' : 'default';

    // ===== Flash Process — derived values (drawing: shared scene via fxView) =====
    const fStep = this.state.fStep || 0;
    const fStage = this.state.fStage || 0;
    const fBusy = !!this.state.fBusy;
    const fStatusText = this.state.fStatus || 'Awaiting Stable Sample';
    const fV = FlashSim.vmOf(this.state, 0);
    const fRes = fV.dm.res || {};
    const _ex = (fStep >= 6 || (fBusy && fStage === 7));
    const fReadouts = [
      { label: 'Cell Pressure', value: '5,000 psi', color: 'var(--accg)', sub: 'PVT cell' },
      { label: 'Pump A', value: fV.pumpA.toFixed(1) + ' cc', color: 'var(--amb)', sub: 'sample side' },
      { label: 'Flash Unit', value: fV.fuP.toFixed(1) + ' psia', color: fV.fuP < 0.5 ? 'var(--accg)' : fV.path === 'vac' ? 'var(--accb3)' : 'var(--amb)', sub: fBusy && fStage === 2 ? 'evacuated section' : 'unit pressure' },
      { label: 'Flashed Volume', value: Math.round(fV.flashed) + ' cc', color: fV.flashed > 0.5 ? 'var(--amb)' : 'var(--mut)', sub: 'from Pump A' },
      { label: 'Flow Rate', value: (fV.flowOn ? '0.3' : '0.0') + ' mL/min', color: 'var(--txt2)', sub: 'controlled' },
      { label: 'Glass Mass', value: fV.bal.toFixed(1) + ' g', color: 'var(--accb3)', sub: fV.oil < 0.05 ? 'empty flask / tare' : fV.bal < 200 + (this.state.fOil || 0) - 0.05 ? 'tare 200 g + oil · after density aliquot' : 'tare 200 g + oil' },
      { label: 'Oil Collected', value: Math.round(this.state.fOil || 0) + ' g', color: this.state.fMeasured ? 'var(--accg)' : 'var(--txt2)', sub: this.state.fMeasured ? 'recorded' : 'in flask' },
      { label: 'Gasometer', value: Math.round(fV.gasoVol).toLocaleString('en-US') + ' cc', color: fV.gasoMode === 'he' ? 'var(--accb3)' : fV.gaso > 1 ? '#0e8f7a' : 'var(--dis)', sub: fV.gasoMode === 'he' && fV.gasoVol > 0.5 ? 'helium · of 3,000 cc' : 'flash gas · of 3,000 cc' },
      { label: '2,000 | 1,000 cc', value: Math.round(fV.gaso2k).toLocaleString('en-US') + ' | ' + Math.round(fV.gaso1k).toLocaleString('en-US'), color: 'var(--txt2)', sub: 'section readings, cc' },
      { label: 'Balloon', value: (14.5 * Math.min(1, fV.balloon / 250)).toFixed(1) + ' psi', color: fV.balloon > 0 ? 'var(--accg)' : 'var(--txt2)', sub: 'gas sample' }
    ].concat(_ex ? [
      { label: 'Density · 25 °C', value: fRes.rho ? fRes.rho.toFixed(5) : '—', color: 'var(--amb)', sub: 'g/cm³ · example' },
      { label: 'Density · 60 °F', value: fRes.rho60 ? fRes.rho60.toFixed(5) : '—', color: 'var(--amb)', sub: 'g/cm³ · example' },
      { label: 'SG 60/60 °F', value: fRes.sg ? fRes.sg.toFixed(4) : '—', color: 'var(--txt2)', sub: 'example' },
      { label: 'API Gravity', value: fRes.api ? fRes.api.toFixed(1) + ' °API' : '—', color: 'var(--accg)', sub: 'example' }
    ] : []);
    // route check: live valve states and temporary connections
    const _op = (x) => x > 0.5, _vv = fV.valve, _busy = (k) => fBusy && fStage === k, _flowAt = (k, a) => _busy(k) && (this.state.fPr || 0) >= a && (this.state.fPr || 0) < 0.9;
    const _st = (active, open, done) => active ? ['ACTIVE', 'on'] : open ? ['OPEN', 'on'] : done ? ['COMPLETE', 'done'] : ['CLOSED', 'off'];
    const _vac = _busy(2) ? (fV.vacHose > 0.98 ? (_op(_vv.vac) ? ['CONNECTED · ACTIVE', 'on'] : ['CONNECTED · CLOSED', 'on']) : fV.vacPump > 0.02 ? ['CONNECTING', 'on'] : ['NOT INSTALLED', 'off'])
      : fStep >= 2 ? ['DISCONNECTED', 'done'] : ['NOT INSTALLED', 'off'];
    const fRoutes = [
      ['Pump A → Flash Unit inlet', _st(_flowAt(4, 0.15) && (this.state.fPr || 0) < 0.36, _op(_vv.pumpA), fStep >= 4)],
      ['Manifold → flask (shared connection, down)', _st(_flowAt(4, 0.287), _busy(4) && _op(_vv.inlet), fStep >= 4)],
      ['Flask headspace → shared connection → Gasometer', _st(_flowAt(4, 0.40), _busy(4) && _op(_vv.in2k), fStep >= 4)],
      ['Gasometer helium → flask', _st(_flowAt(3, 0.15), _busy(3) && _op(_vv.gaso), fStep >= 3)],
      ['Gasometer → balloon', _st(_flowAt(5, 0.15), _busy(5) && _op(_vv.vessel), fStep >= 5)],
      ['Port R ⇢ line ⇢ flask ⇢ Gasometer inlet valve → temporary pump', _vac],
      ['Boundaries: Port R · Gasometer inlet valve · Balloon Valve', _busy(2) ? ['ALL CLOSED', 'on'] : ['—', 'off']],
      ['Collected oil → Density Meter syringe', _busy(7) && (this.state.dmP || 0) < 0.54 ? ['ACTIVE', 'on'] : (fStep >= 7 || (this.state.dmP || 0) >= 0.54) ? ['COMPLETE', 'done'] : ['NOT STARTED', 'off']],
      ['Direct sample → Gasometer', ['NO SUCH PATH', 'off']]
    ].map((r) => ({ name: r[0], state: r[1][0], cls: r[1][1] }));

    // horizontal step tracker
    const fAct = fBusy ? fStage : Math.min(7, fStep + 1);
    const fStepLabels = FlashSim.NAMES;
    const fSteps = fStepLabels.map((label, i) => {
      const n = i + 1, done = n <= fStep, active = n === fAct && !done;
      const c = done ? 'var(--accg)' : active ? 'var(--blue)' : 'var(--dis)';
      const bg = done ? 'rgba(70,211,154,.16)' : active ? 'rgba(77,157,255,.18)' : 'rgba(150,175,210,.06)';
      return { num: '0' + n, label: label, color: c,
        chip: 'flex:0 0 auto; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center;' +
          "font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10px; font-weight:700; background:" + bg +
          '; border:1.5px solid ' + c + '; color:' + c + ';' + ((active && fBusy) ? ' animation:pvtpulse 1.2s ease-in-out infinite;' : ''),
        connector: 'flex:1 1 12px; min-width:10px; height:1.5px; border-radius:1px; background:' + (n === 7 ? 'transparent' : (done ? 'var(--accg)' : 'var(--track)')) + ';' };
    });
    const _fTone = this.state.fMeasured ? 'good' : fBusy ? 'busy' : fStep >= 1 ? 'good' : 'idle';
    const fPillColor = _fTone === 'good' ? 'var(--accg)' : _fTone === 'busy' ? 'var(--blue)' : 'var(--mut)';
    const fPillBg = _fTone === 'good' ? 'rgba(70,211,154,.10)' : _fTone === 'busy' ? 'rgba(80,150,235,.12)' : 'rgba(150,175,210,.06)';
    const fPillBorder = _fTone === 'good' ? 'rgba(70,211,154,.35)' : _fTone === 'busy' ? 'rgba(80,150,235,.35)' : 'var(--line2)';
    const fPillDot = 'width:7px;height:7px;border-radius:50%;flex:0 0 auto;background:' + fPillColor + ';' + (fBusy ? 'animation:pvtpulse 1.2s ease-in-out infinite;' : '');

    // ===== Charge to PVT Cell — 12-stage sequence =====
    const cStep = this.state.chargeStep || 0;              // completed stages
    const cStage = this.state.chargeStage || 0;            // stage currently running
    const cBusy = !!this.state.chargeBusy;
    const cActiveStage = cBusy ? cStage : Math.min(12, cStep + 1);
    const tpVol = this.state.tpVol === undefined ? 100 : this.state.tpVol;
    const pumpA = this.state.pumpA || 0;
    const pumpB = this.state.pumpB || 0;
    const deadVol = this.state.deadVol || 0;
    const cellVac = this.state.cellVac || 0;
    const cellP = this.state.cellP || 0;
    const vBottle = !!this.state.vBottle, vCell = !!this.state.vCell;
    const vPumpA = !!this.state.vPumpA, vPumpB = !!this.state.vPumpB;
    const bottleOn = !!this.state.bottleOn;
    const agDir = this.state.agDir || 'idle';
    const agCycle = this.state.agCycle || 0;
    const agHalf = this.state.agHalf || 0;
    const agResult = this.state.agResult || '';
    const cFront = this.state.chargeFront || 0;
    const nf = (n) => Math.round(n).toLocaleString('en-US');
    const sgn = (n) => (n > 0 ? '+' : n < 0 ? '\u2212' : '') + nf(Math.abs(n));
    // one formatter for every volume readout so the monitor, labels and control box always agree
    const fmtV = (v) => { const r = Math.round(v * 10) / 10; return (Math.abs(r) < 0.05 ? 0 : r).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); };
    const psiW = (v) => { const r = Math.round(v); return r < 0 ? '\u2212' + nf(-r) : nf(r); };
    const cFlowOn = !!this.state.cFlow;
    // the cell is at its 5,000 psi setpoint from the dead-space equalisation onwards
    const pressurised = cStep >= 5 || cStage >= 5;

    // drawing: approved Oil Sample Bottle bore y -226..226 (452 units) with a 46-unit floating piston -> 406 units
    // of fluid, drawn at scale 0.47. Oil above the piston, water below it; the split comes from the shared
    // bottleModel(), which subtracts the sample drawn to the PVT cell as the transfer pump empties (100 -> 18 mL).
    const cBot = this.bottleModel();
    const C_BORE = 452, C_PIST = 46, C_USE = C_BORE - C_PIST;
    const pistonDY = C_USE * cBot.oilFrac;
    const chargeOilH = pistonDY;
    const chargeWaterY = -226 + C_PIST + pistonDY;
    const chargeWaterH = 226 - chargeWaterY;
    // bottle piston, line fluid and Pump A piston all track the same tween — keep their transitions identical
    const chargePistonStyle = 'transform:translateY(' + pistonDY.toFixed(1) + 'px); transition:transform .12s linear;';
    const chargePistonLabelStyle = 'transform:translateY(' + (pistonDY * 0.47).toFixed(1) + 'px); transition:transform .12s linear;';

    // fluid front: bottle sample-valve outlet (585,197.9) -> (730,197.9) -> (730,190) -> Port L outward end (748,190) -> Port L valve (765)
    // -> header -> (1030,190) -> (1030,215). Same 600-unit front as before (Port L outward end = 293): the short external
    // charge line (170.9 drawn units) is scaled onto front units 0..293, the cell part keeps 1 unit = 1 drawn unit
    // during the Pump A charge (stage 6) the head sweeps the whole path repeatedly,
    // driven by the same tween that empties the bottle and fills Pump A
    const _charging6 = cBusy && cStage === 6 && cFlowOn;
    const cFrontDraw = _charging6 ? (((pumpA / 80) * 3) % 1) * 600 : cFront;
    let cHeadX = 585, cHeadY = 197.9;
    const _ext = cFrontDraw * 170.9 / 293;
    if (cFrontDraw <= 293) {
      if (_ext <= 145) { cHeadX = 585 + _ext; cHeadY = 197.9; }
      else if (_ext <= 152.9) { cHeadX = 730; cHeadY = 197.9 - (_ext - 145); }
      else { cHeadX = 730 + (_ext - 152.9); cHeadY = 190; }
    }
    else if (cFrontDraw <= 575) { cHeadX = 748 + (cFrontDraw - 293); cHeadY = 190; }
    else { cHeadX = 1030; cHeadY = 190 + (cFrontDraw - 575); }
    const chargeHeadX = cHeadX, chargeHeadY = cHeadY;
    const draining = !!this.state.drainBack;
    const cHeadVis = _charging6 ? true : (cFront > 0.5 && (cFront < 600 || draining));
    const chargeHeadStyle = { opacity: cHeadVis ? 1 : 0, transition: 'opacity .2s ease', filter: 'drop-shadow(0 0 5px #ffcf3f)' };
    const chargeRevealStyle = { strokeDashoffset: 600 - cFront, opacity: cFront > 0.5 ? 1 : 0 };
    // every charge-path segment is drawn in the bottle -> cell direction (riser upward, header toward Pump A),
    // so forward dashes = sample leaving the bottle; reversed dashes only while the dead space is cleared
    const _fa = 'dashflow calc(1s * var(--pm, 1)) linear infinite';           // bottle -> cell / Pump A
    const _fb = 'dashflow calc(1s * var(--pm, 1)) linear infinite reverse';   // dead space -> bottle (clearing)
    // fluid only moves while a valve is actually open and a stage is running;
    // when the line drains back the same dashes run the other way
    const flowing = cBusy && cStage >= 3 && cStage <= 6 && cFlowOn && (vBottle || vCell);
    const _segAnim = draining ? _fb : (flowing ? _fa : 'none');
    const _segLive = vCell || draining;
    const seg1FlowStyle = { opacity: cFront >= 10 ? 1 : 0, animation: _segAnim };
    const seg2FlowStyle = { opacity: (_segLive && cFront >= 250) ? 1 : 0, animation: _segAnim };
    const seg3FlowStyle = { opacity: (_segLive && cFront >= 320) ? 1 : 0, animation: _segAnim };
    // the header is split at the Pump B valve (x 866, path position 411): the run before the
    // valve fills as soon as the front arrives, the run after it only once the valve is passed
    const seg4FlowStyle = { opacity: (_segLive && cFront >= 400) ? 1 : 0, animation: _segAnim };
    const seg4bFlowStyle = { opacity: (_segLive && cFront >= 425) ? 1 : 0, animation: _segAnim };
    const chargeValveHotStyle = { opacity: vCell ? 1 : 0, transition: 'opacity .3s ease' };
    const chargeValveWheelStyle = { transform: vCell ? 'rotate(90deg)' : 'rotate(0deg)', transformOrigin: '770px 111px', transition: 'transform .9s ease' };
    const chargeLineFluidStyle = { opacity: cFront >= 8 ? 1 : 0, transition: 'opacity .3s ease' };
    // horizontal charge line (bottle top -> cell valve inlet, 215 units of the 600 path) fills and empties with the front
    // external charge line bottle top -> Port L outward fitting: 293 units of the 600 path
    const chargeHLineStyle = { strokeDasharray: 293, strokeDashoffset: (293 - Math.max(0, Math.min(293, cFront))).toFixed(1), opacity: cFront > 0.5 ? 1 : 0 };
    const chargeArrowStyle = { opacity: (cFront >= 8 && !draining) ? 1 : 0, transition: 'opacity .3s ease' };
    const chargePumpFlowStyle = { opacity: flowing ? 1 : 0, animation: flowing ? 'dashflow calc(1s * var(--pm, 1)) linear infinite' : 'none' };
    const pumpLineFluidStyle = { opacity: bottleOn ? 1 : 0, transition: 'opacity .3s ease' };
    // bottle's own right-angle valves (drawing): sample valve open with the bottle valve, driving-side valve open while the pump is connected
    const chargeBtlRing = vBottle ? '#46d39a' : '#8fa3c2', chargeBtlNeedle = window.BottleArt ? window.BottleArt.needle(vBottle ? 1 : 0) : '';
    const chargePumpRing = bottleOn ? '#46d39a' : '#8fa3c2', chargePumpNeedle = window.BottleArt ? window.BottleArt.needle(bottleOn ? 1 : 0) : '';

    // pump cylinders
    const _pumpMax = 176;
    const chargePumpAFillH = Math.max(0, Math.min(1, pumpA / 100)) * _pumpMax;
    // Pump A is charged through its top inlet: the sample column hangs from the top, piston rides below it
    const chargePumpAFillY = '219';
    const chargePumpAFillStyle = { opacity: chargePumpAFillH > 0.5 ? 0.9 : 0, transition: 'opacity .2s ease, y .12s linear, height .12s linear' };
    // Pump B is fed through the same top manifold — its column hangs from the top too,
    // so an A -> B transfer reads as one column shrinking while the other grows
    const chargePumpBFillH = Math.max(0, Math.min(1, pumpB / 100)) * _pumpMax;
    const chargePumpBFillY = '219';
    const chargePumpBFillStyle = { opacity: chargePumpBFillH > 0.5 ? 0.9 : 0, transition: 'opacity .2s ease, y .12s linear, height .12s linear' };
    const pumpAPistonY = (219 + chargePumpAFillH).toFixed(1);
    const pumpBPistonY = (219 + chargePumpBFillH).toFixed(1);
    const pumpPistonTrans = { transition: 'y .12s linear' };
    const _abSum = Math.abs(pumpA + pumpB - 80) < 0.01 && pumpA > 0.001 && pumpB > 0.001;
    const pumpAShow = Math.round(pumpA * 10) / 10;
    const pumpBShow = _abSum ? Math.round((80 - pumpAShow) * 10) / 10 : Math.round(pumpB * 10) / 10;
    const pumpAText = fmtV(pumpAShow) + ' cc';
    const pumpAVal = fmtV(pumpAShow), pumpBVal = fmtV(pumpBShow);
    const pumpBText = fmtV(pumpBShow) + ' cc';
    const pumpAColor = pumpA > 0.5 ? 'var(--amb)' : 'var(--mut)';
    const pumpBColor = pumpB > 0.5 ? 'var(--amb)' : 'var(--mut)';
    const showPumpASealed = (cStep >= 8 && cStep <= 9 && !cBusy) || cStep >= 12;

    // transfer pump + control box
    const tpText = fmtV(tpVol) + ' mL';
    const chargePumpLabel = ((cStep >= 6 && Math.abs(tpVol - 18) < 0.05) ? tpText + ' remaining' : tpText + (cStep >= 2 ? '' : ' loaded'));
    const chargePumpLabelColor = (cStep >= 6 && Math.abs(tpVol - 18) < 0.05) ? 'var(--accg)' : 'var(--accb3)';
    const vacText = psiW(cellVac) + ' psi';
    // the control box always shows the cell's real current pressure: vacuum, then equalised, then charged
    const cellLive = cellP > 0.5;
    const _vacStr = psiW(cellVac);
    // both pressure displays (control box + cell panel) read the same live value: once the
    // dead space is being filled they follow cellP continuously through -15 -> 5,000
    // cellP is still 0 on the first frame of stage 5 - keep showing the vacuum until the rise starts
    const _cbVal = (cellLive || ((cStage >= 5 || cStep >= 5) && cellP < 0)) ? cellP : cellVac;
    const cbPsi = psiW(_cbVal);
    const cbPsiColor = cellLive ? (Math.abs(cellP - 5000) <= 5 ? 'var(--grn)' : 'var(--amb)') : (cellVac < 0 ? 'var(--amb)' : 'var(--accb)');
    // large vacuum readout (stage 1)
    const _vacFrac = Math.max(0, Math.min(1, -cellVac / 15));
    const vacBig = _vacStr;
    const vacBarW = (252 * _vacFrac).toFixed(1);
    const vacAtTarget = cellVac <= -14.9;
    const vacPanelColor = vacAtTarget ? 'var(--grn)' : 'var(--amb)';
    const vacPanelStroke = vacAtTarget ? 'rgba(70,211,154,.55)' : 'rgba(231,177,90,.5)';

    // ===== active process monitor: whichever parameter is currently changing =====
    const _stg = cBusy ? (this.state.chargeStage || 0) : 0;
    const _agDir = this.state.agDir || 'idle';
    const _psi = (v) => psiW(v);
    const _mon = (label, value, unit, start, target, frac) => ({
      label: label, value: value, unit: unit, start: start, target: target,
      frac: Math.max(0, Math.min(1, frac))
    });
    let _m = null;
    if (_stg === 1) _m = _mon('CELL PRESSURE', _psi(cellVac), 'psig', 'START: 0 psig', 'TARGET: \u221215 psig', -cellVac / 15);
    else if (_stg === 4) _m = _mon('TRANSFER PUMP VOLUME', fmtV(tpVol), 'mL', 'START: 100.0 mL', 'LINE FILLED: 2.0 mL', (100 - tpVol) / 2);
    else if (_stg === 5) _m = _mon('CELL PRESSURE', _psi(_cbVal), 'psig', '', 'EQUALIZING WITH BOTTLE PRESSURE: 5,000 psig', (_cbVal + 15) / 5015);
    else if (_stg === 6) _m = _mon('PUMP A VOLUME', fmtV(pumpAShow), 'cc', 'START: 0.0 cc', 'TARGET: 80.0 cc', pumpA / 80);
    else if (_stg === 7) _m = _mon('TRANSFER PUMP REMAINING VOLUME', fmtV(tpVol), 'mL', 'START: 100.0 mL', 'USED: ' + fmtV(100 - tpVol) + ' mL', (100 - tpVol) / 82);
    else if (_stg === 9) _m = _mon('CELL PRESSURE', _psi(cellP), 'psig', 'SETPOINT: 5,000 psig', 'HOLD: 5,000 \u00b15 psig', 1 - Math.min(1, Math.abs(cellP - 5000) / 20));
    else if (_stg === 10) _m = (_agDir === 'BA')
      ? _mon('PUMP A VOLUME', fmtV(pumpAShow), 'cc', 'START: 0.0 cc', 'TARGET: 80.0 cc', pumpA / 80)
      : _mon('PUMP B VOLUME', fmtV(pumpBShow), 'cc', 'START: 0.0 cc', 'TARGET: 80.0 cc', pumpB / 80);
    else if (_stg === 11) _m = _mon('CELL PRESSURE', _psi(cellP), 'psig', 'STABILISING', 'TARGET: 5,000 \u00b15 psig', 1 - Math.min(1, Math.abs(cellP - 5000) / 20));
    const showBottleRig = !(cStep >= 9 || cStage >= 9);
    const monShow = !!_m;
    const monLabel = _m ? _m.label : '';
    const monBig = _m ? _m.value : '';
    const monUnit = _m ? _m.unit : '';
    const monStartText = _m ? _m.start : '';
    let monTargetText = _m ? _m.target : '';
    const monBarW = _m ? (252 * _m.frac).toFixed(1) : '0';
    const monDone = !!_m && _m.frac >= 0.995;
    const monColor = monDone ? 'var(--grn)' : 'var(--amb)';
    const monStroke = !_m ? 'rgba(150,175,210,.22)' : monDone ? 'rgba(70,211,154,.55)' : 'rgba(231,177,90,.5)';
    const vacHeadline = vacAtTarget ? 'PVT CELL \u00b7 VACUUM HELD' : 'PVT CELL \u00b7 EVACUATING';
    const connPipeStyle = { opacity: bottleOn ? 1 : 0, transition: 'opacity .35s ease' };
    const _connGrow = bottleOn ? Math.max(0, Math.min(1, this.state.connGrow === undefined ? 1 : this.state.connGrow)) : 0;
    const connRevealStyle = { strokeDasharray: 420, strokeDashoffset: (420 * (1 - _connGrow)).toFixed(1), transition: 'stroke-dashoffset .12s linear' };
    const bottleOff = !bottleOn;
    // once the bottle rig leaves the bench, pull the computer/control-box desk across to the
    // cell so the pressurising + agitation stages stay one connected system instead of two islands
    // one fixed view for all 12 stages (Validation layout 2026-10-21): bottle rig + transfer pump left (enlarged about the
    // bottle outlet to the Restoration bottle size), approved PVT cell, computer/controller right; the bottle stays on the bench
    const chargeViewBox = '362 58 912 572';
    const chargeDeskStyle = { transform: showBottleRig ? 'translate(0px,0px)' : 'translate(560px,150px)', transition: 'transform calc(.7s * var(--pm, 1)) cubic-bezier(.4,0,.2,1)' };
    const chargeMonWrapStyle = { animation: 'monFade .4s ease' };   // monitor card now sits in the sidebar
    const chargeSigD = showBottleRig ? 'M210 222 H500' : 'M770 372 H806';
    const chargeSig2D = showBottleRig ? 'M670 300 H860' : 'M506 300 H600';
    const chargeSigStyle = { strokeWidth: showBottleRig ? 1.6 : 2.6, opacity: showBottleRig ? 0.7 : 0.95, transition: 'opacity .4s ease' };
    const chargeSig2Style = { strokeWidth: showBottleRig ? 1.6 : 2.2, opacity: showBottleRig ? 0.7 : 0.9, transition: 'opacity .4s ease' };
    const cbMl = fmtV(pumpAShow);
    const initDone = (this.state.initRead || 0) > 0;
    const initReadText = initDone ? fmtV(this.state.initRead) + ' mL' : '\u2014';
    const initReadStroke = initDone ? '#46d39a' : '#33445e';
    const initReadColor = initDone ? 'var(--grn)' : 'var(--accb)';
    const deadText = fmtV(deadVol) + ' cc';
    const showDead = deadVol > 0.05;

    // agitation circulation overlay
    const agActive = agDir === 'AB' || agDir === 'BA';
    const agFlowStyle = { opacity: agActive ? 1 : 0, transition: 'opacity .25s ease' };
    const agDashStyle = { animation: agActive ? ('dashflow calc(0.9s * var(--pm, 1)) linear infinite' + (agDir === 'AB' ? ' reverse' : '')) : 'none' };
    const agArrowD = agDir === 'AB' ? 'M 916 184 l -12 6 l 12 6 Z' : 'M 980 184 l 12 6 l -12 6 Z';
    // travelling slug on the top manifold, positioned by the live transfer fraction
    const _agFrac = agDir === 'AB' ? Math.max(0, Math.min(1, pumpB / 80)) : agDir === 'BA' ? Math.max(0, Math.min(1, pumpA / 80)) : 0;
    const agMarkX = (agDir === 'AB' ? 1030 - 164 * _agFrac : 866 + 164 * _agFrac).toFixed(1);
    const agMarkTrans = { transition: 'cx .12s linear', filter: 'drop-shadow(0 0 5px #ffcf3f)' };
    const agDirText = agDir === 'AB' ? 'A \u2192 B' : agDir === 'BA' ? 'B \u2192 A' : 'Idle';

    // ===== pump branch valves + branch fluid =====
    // a branch only carries fluid while its own valve is open; the dashes animate only
    // while that fluid is actually being displaced (pump A charge, or an agitation half-cycle)
    const _pumpAMoving = (cBusy && cStage === 6) || (agActive && agDir === 'BA');
    const _pumpBMoving = agActive;
    const pumpABranchFluidStyle = { opacity: (vPumpA || pumpA > 0.5) ? 1 : 0, transition: 'opacity .3s ease' };
    const pumpBBranchFluidStyle = { opacity: (vPumpB || pumpB > 0.5) ? 1 : 0, transition: 'opacity .3s ease' };
    const pumpABranchFlowStyle = { opacity: (vPumpA && _pumpAMoving) ? 1 : 0,
      animation: _pumpAMoving ? ('dashflow calc(.9s * var(--pm, 1)) linear infinite' + (agDir === 'AB' ? ' reverse' : '')) : 'none' };
    const pumpBBranchFlowStyle = { opacity: (vPumpB && _pumpBMoving) ? 1 : 0,
      animation: _pumpBMoving ? ('dashflow calc(.9s * var(--pm, 1)) linear infinite' + (agDir === 'BA' ? ' reverse' : '')) : 'none' };
    // small inlet valve on the Pump B branch
    const pumpBValveHotStyle = { opacity: vPumpB ? 1 : 0, transition: 'opacity .3s ease' };
    const pumpBValveLeverStyle = { transform: vPumpB ? 'rotate(90deg)' : 'rotate(0deg)', transformOrigin: '850px 174px', transition: 'transform .9s ease' };
    // fluid held at the closed valve: marker shown once the front has arrived and the valve is shut
    const pumpBHeldStyle = { opacity: (!vPumpB && cFront >= 405 && (cBusy ? cStage : cStep) === 3) ? 1 : 0, transition: 'opacity .3s ease' };
    const pumpBValveLabelColor = vPumpB ? 'var(--amb)' : 'var(--accb3)';
    // Pump A inlet valve: same look and behaviour as the Pump B valve
    const pumpAValveHotStyle = { opacity: vPumpA ? 1 : 0, transition: 'opacity .3s ease' };
    const pumpAValveLeverStyle = { transform: vPumpA ? 'rotate(90deg)' : 'rotate(0deg)', transformOrigin: '1014px 174px', transition: 'transform .9s ease' };
    const pumpAHeldStyle = { opacity: (!vPumpA && cFront >= 560 && cFront < 599 && !draining && (cBusy ? cStage : cStep) === 5) ? 1 : 0, transition: 'opacity .3s ease' };
    const pumpAValveLabelColor = vPumpA ? 'var(--amb)' : 'var(--accb3)';
    const agCycleText = String(agCycle);
    const agHalfText = agHalf ? agHalf + ' of 2' : '\u2014';
    const cellPText = nf(cellP) + ' psi';
    const agDev = pressurised ? cellP - 5000 : 0;
    const agDevText = pressurised ? sgn(Math.round(agDev)) + ' psi' : '\u2014';
    const agDevColor = Math.abs(agDev) <= 5 ? 'var(--accg)' : 'var(--amb)';
    const agResultText = agResult === 'stable' ? 'Stable' : agResult === 'repeat' ? 'Repeat Cycle' : agCycle > 0 ? 'Check Stability' : 'Pending';
    const agResultBg = agResult === 'stable' ? 'rgba(70,211,154,.10)' : agResult === 'repeat' ? 'rgba(231,177,90,.10)' : 'rgba(150,175,210,.06)';
    const agResultBorder = agResult === 'stable' ? 'rgba(70,211,154,.35)' : agResult === 'repeat' ? 'rgba(231,177,90,.35)' : 'var(--line2)';
    const agResultColor = agResult === 'stable' ? 'var(--accg)' : agResult === 'repeat' ? 'var(--amb)' : 'var(--mut)';
    const chargeShowAgit = cStep >= 9 || cStage >= 9;
    // agitation / stability readout cards (left of the schematic, replaces the old bottom strip)
    const _agRun = cBusy && cStage === 10;
    const agStatusText = _agRun ? 'Running' : agResult === 'stable' ? 'Cycle Complete' : agResult === 'repeat' ? 'Repeat Cycle' : agCycle > 0 ? 'Checking Stability' : 'Idle';
    const agStatusColor = _agRun ? 'var(--blue)' : agResult === 'stable' ? 'var(--accg)' : agResult === 'repeat' ? 'var(--amb)' : 'var(--txt)';
    const agCards1 = [
      { label: 'AGITATION MODE', value: agDir === 'idle' ? 'A \u2194 B' : agDirText, sub: 'pump A \u2194 pump B', color: 'var(--accb)' },
      { label: 'STATUS', value: agStatusText, sub: 'process state', color: agStatusColor },
      { label: 'CYCLE NUMBER', value: agCycleText, sub: 'completed cycles', color: 'var(--txt)' },
      { label: 'HALF-CYCLE', value: agHalfText, sub: 'current half', color: 'var(--txt)' }
    ];
    const agCards2 = [
      { label: 'RATE', value: '10 cc/min', sub: 'transfer rate', color: 'var(--txt)' },
      { label: 'PUMP A VOLUME', value: pumpAText, sub: 'current volume', color: pumpAColor },
      { label: 'PUMP B VOLUME', value: pumpBText, sub: 'current volume', color: pumpBColor }
    ];
    const agCards3 = [
      { label: 'CELL PRESSURE', value: '5,000 psia', sub: 'target setpoint', color: 'var(--txt)' },
      { label: 'CURRENT PRESSURE', value: nf(cellP) + ' psia', sub: 'live reading', color: Math.abs(cellP - 5000) <= 5 ? 'var(--accg)' : 'var(--amb)' },
      { label: 'PRESSURE DIFFERENCE', value: agDevText, sub: 'from setpoint', color: agDevColor },
      { label: 'LIMIT / TOLERANCE', value: '\u00b15 psia', sub: 'stability limit', color: 'var(--txt)' }
    ];
    const _baroArr = this.state.baro || [];
    const baroPoints = _baroArr.length < 2 ? '' : _baroArr.map((v, i) => {
      const x = (i / (_baroArr.length - 1)) * 298 + 1;
      const y = Math.max(3, Math.min(59, 6 + (5040 - v) * 0.625));
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');

    // cell status pill
    const cellStatusText = this.state.cellStatus || 'Cell Ready';
    let chargeStageTag = '';
    const _tone = agResult === 'repeat' ? 'warn' : cBusy ? 'busy' : (this.state.agStable || cStep >= 1) ? 'good' : 'idle';
    const cellStatusColor = _tone === 'warn' ? 'var(--amb)' : _tone === 'good' ? 'var(--accg)' : _tone === 'busy' ? 'var(--blue)' : 'var(--mut)';
    const cellStatusBg = _tone === 'warn' ? 'rgba(231,177,90,.10)' : _tone === 'good' ? 'rgba(70,211,154,.10)' : _tone === 'busy' ? 'rgba(80,150,235,.12)' : 'rgba(150,175,210,.06)';
    const cellStatusBorder = _tone === 'warn' ? 'rgba(231,177,90,.35)' : _tone === 'good' ? 'rgba(70,211,154,.35)' : _tone === 'busy' ? 'rgba(80,150,235,.35)' : 'var(--line2)';
    const cellStatusDot = 'width:7px;height:7px;border-radius:50%;flex:0 0 auto;background:' + cellStatusColor + ';' + (cBusy ? 'animation:pvtpulse 1.2s ease-in-out infinite;' : '');

    // readout tiles
    const chargeReadouts = [
      { label: 'Bottle', value: bottleOn ? '5,000 psi' : '\u2014', sub: bottleOn ? 'connected to cell' : 'not connected', color: bottleOn ? 'var(--accg)' : 'var(--mut)' },
      { label: 'Cell', value: cellLive ? nf(cellP) + ' psi' : vacText, sub: (cellLive && bottleOn) ? 'equalised with bottle \u00b7 5,000 psi' : pressurised ? 'setpoint 5,000 psi' : 'vacuum target \u221215 psi', color: cellLive ? (Math.abs(cellP - 5000) <= 5 ? 'var(--accg)' : 'var(--amb)') : 'var(--amb)' },
      { label: 'Transfer Pump', value: tpText, sub: 'of 100 mL loaded', color: 'var(--accb3)' },
      { label: 'Pump A', value: pumpAText, sub: 'sample', color: pumpAColor },
      { label: 'Pump B', value: pumpBText, sub: 'agitation', color: pumpBColor },
      { label: 'Dead Space', value: deadText, sub: 'top manifold', color: showDead ? 'var(--accg)' : 'var(--mut)' }
    ];

    // valve / connection chips
    const _vc = (open) => open
      ? { state: 'Open', color: 'var(--accg)', bg: 'rgba(70,211,154,.10)', border: 'rgba(70,211,154,.35)' }
      : { state: 'Closed', color: '#c2453c', bg: 'rgba(224,71,92,.09)', border: 'rgba(224,71,92,.30)' };
    const chargeValves = [
      Object.assign({ label: 'Bottle Valve' }, _vc(vBottle)),
      Object.assign({ label: 'Cell Valve' }, _vc(vCell)),
      Object.assign({ label: 'Pump A Valve' }, _vc(vPumpA)),
      Object.assign({ label: 'Pump B Valve' }, _vc(vPumpB)),
      { label: 'Bottle', state: bottleOn ? 'Connected' : 'Disconnected', color: bottleOn ? 'var(--accg)' : 'var(--mut)', bg: bottleOn ? 'rgba(70,211,154,.10)' : 'var(--icard)', border: bottleOn ? 'rgba(70,211,154,.35)' : 'var(--line2)' }
    ].map((v) => Object.assign(v, { dot: 'width:7px;height:7px;border-radius:50%;flex:0 0 auto;background:' + v.color + ';' }));

    // stage callouts (one at a time)
    const _noteAt = (n) => cBusy ? cStage === n : cStep === n;
    const noteVacuum = _noteAt(1);
    const noteValveClosed = false;
    const noteInitRead = false;
    const noteDead = false;
    const noteIso = false;
    const noteAgit = false; // duplicated the header banner and sat on the PVT Cell title

    // zone badges keyed to their stage
    const chargeBadges = [
      { n: '02', cx: 272, cy: 430, s: 2 },
      { n: '03', cx: 744, cy: 126, s: 3 },
      { n: '05', cx: 900, cy: 355, s: 5 },
      { n: '06', cx: 1063, cy: 380, s: 6 },
      { n: '10', cx: 272, cy: 500, s: 10 }
    ].map((b) => {
      const done = b.s <= cStep, active = b.s === cActiveStage;
      const c = done ? { bg: '#2f7d55', stroke: '#46d39a', fg: '#eafff4' }
        : active ? { bg: '#2f6fd0', stroke: '#7fb4ff', fg: '#ffffff' }
        : { bg: 'rgba(12,20,34,.9)', stroke: '#3a4a63', fg: '#7a8aa4' };
      return { n: b.n, cx: b.cx, cy: b.cy, fx: b.cx - 12, fy: b.cy - 7, bg: c.bg, stroke: c.stroke, fg: c.fg };
    });

    // ===== clarity layer for stages 1-8 (presentation only) =====
    const vs = cBusy ? cStage : cStep;                 // stage the learner is looking at
    const inRig = showBottleRig;
    const _va = String(this.state.vAct || '').split(':');
    const actId = _va[0] || '', actMode = _va[1] || '';
    const isoPh = this.state.isoPh || 0, balPh = this.state.balPh || 0;
    const discP = Math.max(0, Math.min(1, this.state.discP || 0));
    const _pad = (n) => (n < 10 ? '0' + n : String(n));
    // header stage banner
    chargeStageTag = cBusy ? 'STAGE ' + _pad(cStage) + ' / 12' : cStep > 0 ? 'STAGE ' + _pad(cStep) + ' ✓' : 'READY';
    // short cell state above the PVT Cell title (the full action message is in the header banner)
    let _cs = cellStatusText;
    if (vs <= 8) {
      if (vs === 0) _cs = 'Cell Ready';
      else if (cBusy && cStage === 1) _cs = vacAtTarget ? 'Vacuum Reached · −15 psig' : 'Evacuating · ' + _vacStr + ' psig';
      else if (vs <= 4) _cs = 'Under Vacuum · −15 psig';
      else if (cBusy && cStage === 5) _cs = 'Equalizing · ' + nf(cellP) + ' psig';
      else if (cBusy && cStage === 6) _cs = 'Charging Pump A · 5,000 psig';
      else if (cBusy && cStage === 8 && isoPh < 5) _cs = 'Isolating · 5,000 psig';
      else if (vs >= 8) _cs = 'Isolated · 5,000 psig';
      else _cs = 'At Bottle Pressure · 5,000 psig';
    }
    const cellStateShort = _cs;

    // --- valve tags: shown only for valves that matter in the current stage ---
    const _tagKinds = {
      open:    { fill: 'rgba(16,48,34,.96)', stroke: '#46d39a', color: '#7ff0bf', anim: 'none' },
      closed:  { fill: 'rgba(44,14,20,.96)', stroke: '#e0475c', color: '#ff8a98', anim: 'none' },
      stop:    { fill: 'rgba(44,14,20,.96)', stroke: '#e0475c', color: '#ff8a98', anim: 'pvtpulse 1.4s ease-in-out infinite' },
      moving:  { fill: 'rgba(52,38,10,.96)', stroke: '#ffcf3f', color: '#ffe08a', anim: 'pvtpulse 1s ease-in-out infinite' }
    };
    const _vOpen = { bottle: vBottle, cell: vCell, pumpA: vPumpA, pumpB: vPumpB };
    const _vTag = (id) => {
      if (!inRig || vs < 2 || vs === 4 || vs === 7) return null;
      const open = _vOpen[id];
      if (actId === id) {
        if (actMode === 'opening') return ['OPENING', 'moving'];
        if (actMode === 'closing') return open ? ['CLOSING', 'moving'] : ['CLOSED', 'closed'];
      }
      if (vs === 2) return ['CLOSED', 'closed'];
      if (vs === 3) {
        if (id === 'bottle') return open ? ['OPEN', 'open'] : null;
        if (id === 'cell') return open ? ['OPEN', 'open'] : (cFront >= 250 ? ['CLOSED', 'stop'] : ['CLOSED', 'closed']);
        if (id === 'pumpB') return cFront >= 400 ? ['CLOSED', 'stop'] : null;
        return null;
      }
      if (vs === 5) {
        if (id === 'bottle' || id === 'cell') return ['OPEN', 'open'];
        if (id === 'pumpA') return cFront >= 555 ? ['CLOSED', 'stop'] : ['CLOSED', 'closed'];
        return null;
      }
      if (vs === 6) {
        if (id === 'bottle' || id === 'cell') return ['OPEN', 'open'];
        if (id === 'pumpA') return open ? ['OPEN', 'open'] : ['CLOSED', 'closed'];
        return null;
      }
      if (vs === 8) {
        const order = { pumpA: 1, pumpB: 3, cell: 4, bottle: 5 };
        if (id === 'bottle' && !bottleOn) return null;
        if (!cBusy || isoPh >= order[id]) return open ? ['CLOSING', 'moving'] : ['CLOSED', 'closed'];
        return open ? ['OPEN', 'open'] : null;
      }
      return null;
    };
    const _mkTag = (id) => {
      const t = _vTag(id);
      const k = _tagKinds[t ? t[1] : 'closed'];
      return { show: !!t, text: t ? t[0] : '', fill: k.fill, stroke: k.stroke, color: k.color,
        style: { opacity: t ? 1 : 0, transition: 'opacity .3s ease', animation: t ? k.anim : 'none' } };
    };
    const tagBottle = _mkTag('bottle'), tagCell = _mkTag('cell'), tagPumpA = _mkTag('pumpA'), tagPumpB = _mkTag('pumpB');
    // amber ring on the valve that is moving right now
    const _ring = (id) => ({ opacity: (inRig && actId === id) ? 1 : 0, transition: 'opacity .3s ease' });
    const ringBottle = _ring('bottle'), ringCell = _ring('cell'), ringPumpA = _ring('pumpA'), ringPumpB = _ring('pumpB');
    // cell valve holding the front (stage 3, before it opens)
    const _cellHeld = vs === 3 && !vCell && cFront >= 250 && actId !== 'cell';
    const cellHeldStyle = { opacity: _cellHeld ? 1 : 0, transition: 'opacity .3s ease', animation: _cellHeld ? 'pvtpulse 1.4s ease-in-out infinite' : 'none' };
    // bottle valve graphic on the bottle outlet riser (same look as the cell valve)
    const bottleValveHotStyle = { opacity: vBottle ? 1 : 0, transition: 'opacity .3s ease' };
    const bottleValveWheelStyle = { transform: vBottle ? 'rotate(90deg)' : 'rotate(0deg)', transformOrigin: '557px 120px', transition: 'transform .9s ease' };
    const bottleValveLabelColor = vBottle ? 'var(--amb)' : 'var(--accb3)';

    // --- stage 1: PVT cell + evacuated volume highlighted ---
    const _vacView = inRig && ((cBusy && cStage === 1) || (!cBusy && cStep === 1));
    const _vacCol = vacAtTarget ? '#46d39a' : '#e7b15a';
    const cellHaloStyle = { opacity: _vacView ? 1 : 0, transition: 'opacity .4s ease, stroke .4s ease', stroke: _vacCol,
      animation: (_vacView && !vacAtTarget) ? 'glowpulse 1.6s ease-in-out infinite' : 'none' };
    const vacPathStyle = { opacity: _vacView ? 1 : 0, transition: 'opacity .4s ease', stroke: _vacCol,
      animation: (_vacView && !vacAtTarget) ? 'glowpulse 1.6s ease-in-out infinite' : 'none' };
    const vacSigStyle = { opacity: (cBusy && cStage === 1) ? 1 : 0, transition: 'opacity .3s ease', animation: (cBusy && cStage === 1) ? 'dashflow calc(1.2s * var(--pm, 1)) linear infinite reverse' : 'none' };

    // --- stage 2: connection points ---
    const connPointStyle = { opacity: (cBusy && cStage === 2) ? 1 : 0, transition: 'opacity .3s ease' };

    // --- stage 4 / 7: transfer-pump reading highlighted; values logged on the computer ---
    const tpHiOn = inRig && ((cBusy && (cStage === 4 || cStage === 7)) || (!cBusy && (cStep === 4 || cStep === 7)));
    const tpHiStyle = { opacity: tpHiOn ? 1 : 0, transition: 'opacity .3s ease', animation: (tpHiOn && cBusy) ? 'glowpulse 1.4s ease-in-out infinite' : 'none' };
    const pcV1Show = (this.state.initRead || 0) > 0 && inRig;
    const pcV2Show = pcV1Show && (cStep >= 7 || (cBusy && cStage === 7 && balPh >= 1));
    const pcV1Style = { opacity: pcV1Show ? 1 : 0, transition: 'opacity .4s ease' };
    const pcV2Style = { opacity: pcV2Show ? 1 : 0, transition: 'opacity .4s ease' };
    const _pcFlash = !!this.state.recFlash || (cBusy && cStage === 7 && balPh === 1);
    const pcFlashStyle = { opacity: _pcFlash ? 1 : 0, transition: 'opacity .3s ease', animation: _pcFlash ? 'pvtpulse 1s ease-in-out infinite' : 'none' };
    const pcSavedStyle = { opacity: this.state.recFlash ? 1 : 0, transition: 'opacity .3s ease' };

    // --- stage 5: dead space glow along the manifold ---
    const deadGlowOn = inRig && cBusy && cStage === 5;
    const deadGlowStyle = { opacity: deadGlowOn ? 1 : 0, transition: 'opacity .4s ease', animation: deadGlowOn ? 'glowpulse 1.6s ease-in-out infinite' : 'none' };

    // --- stage 6: Pump A outlined (outline only, never covers the fluid or piston) ---
    const pumpAHaloOn = inRig && cBusy && cStage === 6;
    const pumpAHaloStyle = { opacity: pumpAHaloOn ? 1 : 0, transition: 'opacity .4s ease' };
    // sealed indicator: a green ring on the closed Pump A valve (no overlay on the cylinder)
    const pumpASealRingStyle = { opacity: (showPumpASealed || (!cBusy && cStep === 8)) ? 1 : 0, transition: 'opacity .4s ease' };

    // --- stage 8: fluid retained beyond the closed cell valve; line separation ---
    const retainedOn = false;
    const retainedStyle = { opacity: retainedOn ? 1 : 0, transition: 'opacity .3s ease' };
    const connPipeStyle2 = { opacity: bottleOn ? (1 - discP) : 0, transform: 'translate(' + (-10 * discP).toFixed(1) + 'px,' + (-16 * discP).toFixed(1) + 'px)', transition: 'opacity .12s linear' };
    const discGapStyle = { opacity: (cBusy && cStage === 8 && isoPh >= 7) ? 1 : 0, transition: 'opacity .3s ease' };
    const rigDimStyle = { opacity: (!bottleOn && cStep >= 8) ? 0.42 : 1, transition: 'opacity calc(.8s * var(--pm, 1)) ease' };
    const bottleOffText = cStep >= 8 || isoPh >= 8 ? 'BOTTLE DISCONNECTED' : 'BOTTLE NOT CONNECTED';

    // --- monitor card: gauge (1,4,5,6,9-11), volume balance (7), isolation sequence / final (8) ---
    let monSub = '';
    if (_stg === 1 && vacAtTarget) monTargetText = '✓ VACUUM REACHED: −15 psig';
    if (_stg === 4 && (this.state.initRead || 0) > 0) { monTargetText = '✓ RECORDED V₁ = ' + fmtV(this.state.initRead) + ' mL'; monSub = 'STORED FOR THE FINAL VOLUME-BALANCE CALCULATION'; }
    if (_stg === 5) { monSub = 'DEAD SPACE ' + deadText + '   ·   TRANSFER PUMP ' + tpText; if (monDone) monTargetText = '✓ EQUALIZED WITH BOTTLE: 5,000 psig'; }
    if (_stg === 6) { monSub = 'TRANSFER PUMP ' + tpText + '   ·   CELL ' + nf(cellP) + ' psig'; if (monDone) monTargetText = '✓ PUMP A CHARGED: 80.0 cc'; }
    const monGauge = monShow && _stg !== 7;
    const monCalc = inRig && ((cBusy && cStage === 7) || (!cBusy && cStep === 7));
    const monIso = inRig && ((cBusy && cStage === 8) || (!cBusy && cStep === 8));
    const monCard = monGauge || monCalc || monIso;
    const _calcDone = !cBusy || balPh >= 4;
    const calcColor = _calcDone ? '#46d39a' : '#e7b15a';
    const calcStroke = _calcDone ? 'rgba(70,211,154,.55)' : 'rgba(231,177,90,.5)';
    const _bp = cBusy ? balPh : 4;
    const _crow = (on) => 'opacity:' + (on ? 1 : 0.14) + '; transition:opacity .5s ease;';
    // volume balance, built only from the existing values (initial reading, final pump reading,
    // Pump A charge, dead space, 100 mL loaded) - no new numbers
    const _v1 = this.state.initRead || 0;
    const calcV1 = fmtV(_v1) + ' mL', calcV2 = fmtV(tpVol) + ' mL';
    const calcDiffEq = 'Transferred = V\u2081 \u2212 V\u2082 = ' + fmtV(_v1) + ' \u2212 ' + fmtV(tpVol);
    const calcDiff = fmtV(_v1 - tpVol) + ' mL';
    const calcTotalEq = 'Total from 100.0 mL: ' + fmtV(100 - tpVol) + ' mL = ' + fmtV(pumpA) + ' + ' + fmtV(deadVol);
    const calcTitle = _calcDone ? 'VOLUME BALANCE CONFIRMED' : 'CALCULATING FINAL VOLUME';
    const calcRow1 = _crow(_bp >= 1), calcRow2 = _crow(_bp >= 2), calcRow3 = _crow(_bp >= 3), calcRow4 = _crow(_bp >= 4);
    const calcV2Hi = (cBusy && balPh === 1) ? 'background:rgba(231,177,90,.16); border-radius:4px;' : '';
    const _isoFinal = !cBusy && cStep === 8;
    const isoColor = (_isoFinal || isoPh >= 8) ? '#46d39a' : '#e7b15a';
    const isoStroke = (_isoFinal || isoPh >= 8) ? 'rgba(70,211,154,.55)' : 'rgba(231,177,90,.5)';
    const isoTitle = (_isoFinal || isoPh >= 8) ? 'BOTTLE DISCONNECTED — PVT CELL ISOLATED' : isoPh === 2 ? 'CLEARING CHARGE-LINE DEAD SPACE' : 'ISOLATING SAMPLE PATH · REVERSE ORDER';
    const _ip = _isoFinal ? 9 : isoPh;
    const _isoValve = { 1: 'pumpA', 3: 'pumpB', 4: 'cell', 5: 'bottle' };
    const _isoItem = (k, label, doneText, runText) => {
      const vid = _isoValve[k];
      const done = _ip > k || (vid && _ip === k && !_vOpen[vid]);
      const run = !done && _ip === k;
      return { label: label, state: done ? doneText : run ? runText : 'pending',
        mark: done ? '✓' : run ? '▸' : '○',
        color: done ? '#7ff0bf' : run ? '#ffe08a' : 'var(--mut)',
        weight: run ? '600' : '400' };
    };
    const isoRows = _isoFinal ? [
      { label: 'All valves', state: 'closed', mark: '✓', color: '#7ff0bf', weight: '400' },
      { label: 'Pump A', state: pumpAText + ' sealed', mark: '✓', color: '#7ff0bf', weight: '600' },
      { label: 'Cell pressure', state: nf(cellP) + ' psig', mark: '✓', color: '#7ff0bf', weight: '400' },
      { label: 'Charge-line dead space', state: 'cleared', mark: '✓', color: '#7ff0bf', weight: '400' },
      { label: 'Transfer pump', state: tpText + ' remaining', mark: '✓', color: '#7ff0bf', weight: '400' }
    ] : [
      _isoItem(1, '1  Pump A valve', 'closed · 80.0 cc sealed', 'closing'),
      _isoItem(2, '2  Dead space', 'cleared to bottle', 'clearing'),
      _isoItem(3, '3  Pump B valve', 'closed', 'closing'),
      _isoItem(4, '4  Cell valve', 'closed', 'closing'),
      _isoItem(5, '5  Bottle valve', 'closed', 'closing'),
      _isoItem(7, '6  SPS/PDS bottle', 'disconnected', 'disconnecting')
    ];

    // 12-step progress strip
    const chargeStepMeta = [
      'Vacuum Cell to \u221215 psi', 'Connect Bottle', 'Open Bottle and Cell Valves',
      'Record Initial Reading \u2014 98 mL', 'Fill Dead Space \u2014 Equalise 5,000 psi', 'Charge Pump A \u2014 80 cc',
      'Transfer Pump Remaining \u2014 18 mL', 'Disconnect Bottle', 'Hold 5,000 psi \u00b7 Isolated',
      'Agitate A \u2194 B', 'Confirm Stability \u2014 \u00b15 psi', 'Move to Flash Process'
    ];
    const chargeProgress_ = chargeStepMeta.map((label, i) => {
      const n = i + 1, done = n <= cStep, active = n === cActiveStage && !done;
      const c = done ? 'var(--accg)' : active ? 'var(--blue)' : 'var(--dis)';
      return {
        label: (n < 10 ? '0' + n : String(n)) + '. ' + label,
        color: c,
        dotStyle: 'width:8px;height:8px;border-radius:50%;flex:0 0 auto;border:1.5px solid ' + c + ';background:' + ((active || done) ? c : 'transparent') + ';' + ((active && cBusy) ? 'animation:pvtpulse 1.2s ease-in-out infinite;' : '')
      };
    });

    // actions
    const _stageName = ['Vacuum PVT Cell', 'Connect SPS/PDS Bottle', 'Open Charging Path', 'Record Initial Volume', 'Fill Dead Space', 'Charge Pump A', 'Final Volume', 'Disconnect Bottle', 'Hold Cell Pressure', 'Agitate A \u2194 B', 'Check Pressure Stability', 'Move to Flash Process'];
    const cDone12 = cStep >= 12;
    const atFinal = !cBusy && cStep === 11;
    const chargeBtnText = cBusy ? 'Running\u2026' : cDone12 ? 'Reset Sequence' : atFinal ? 'Awaiting flash handoff' : (agResult === 'repeat' && cActiveStage === 10) ? 'Repeat Agitation Cycle' : _stageName[cActiveStage - 1];
    const _btnIdle = cBusy || cDone12 || atFinal;
    const chargeBtnBg = _btnIdle ? 'rgba(150,175,210,.07)' : 'linear-gradient(180deg,#3f8ae0,#2f6fd0)';
    const chargeBtnBorder = cBusy ? '#3f6fae' : _btnIdle ? 'var(--line2)' : '#5a9bea';
    const chargeBtnColor = cBusy ? 'var(--mut)' : _btnIdle ? 'var(--mut)' : '#fff';
    const chargeBtnCursor = (cBusy || atFinal) ? 'default' : 'pointer';
    const readyFinal = this.chargeReadyFinal();
    const flashLive = !cBusy && !cDone12;
    const flashBtnBg = flashLive ? (readyFinal ? 'linear-gradient(180deg,#46d39a,#2f9d72)' : 'linear-gradient(180deg,#3a9d72,#276b52)') : 'rgba(150,175,210,.05)';
    const flashBtnBorder = flashLive ? '#2f9d72' : 'var(--line)';
    const flashBtnColor = flashLive ? (readyFinal ? '#06231a' : '#dff5ea') : 'var(--dis)';
    const flashBtnCursor = flashLive ? 'pointer' : 'default';
    const readyText = cDone12 ? 'Sample released to flash process' : readyFinal ? 'All acceptance conditions met' : 'Accept at: A 80 cc \u00b7 B 0 cc \u00b7 dead 2 cc \u00b7 pump 18 mL \u00b7 5,000 \u00b15 psi';
    const readyColor = readyFinal || cDone12 ? 'var(--accg)' : 'var(--mut)';

    // ===== Module 02 \u2014 Quality Check (QC): 4-step process =====
    const qStep = this.state.qcStep || 1;
    const qPhase = this.state.qcPhase || 'idle';
    const qDone = this.state.qcDone || {1:false,2:false,3:false,4:false};
    const qRunning = qPhase === 'run';
    const qStepDone = qPhase === 'done' || !!qDone[qStep];
    const xfer = this.state.xfer || 0;
    const resP = this.state.resP || 0;
    const resT = this.state.resT || 22;
    const water = this.state.water || 0;
    const agitate = !!this.state.agitate;
    const qcPathKey = this.valSource();
    const qcPathMap = this.valSrcMap();
    const qcPath = qcPathMap[qcPathKey];
    const qcOpenText = qcPath.open.toLocaleString('en-US');
    const qcGasNote = qcPathKey === 'separator';
    const qcPathBadge = qcPath.name + ' sample \u00b7 ' + qcPath.bottle;
    // restoration targets are per sample source: bottom-hole / wellhead go to the 5,000 psig
    // working pressure at 114 C (reservoir 3,000 psig); separator goes to 2,500 psig at 35 C.
    const qcRestP = qcPath.restP, qcRestT = qcPath.restT;
    const qcRestPText = qcRestP.toLocaleString('en-US');
    const qcRestTText = String(qcRestT);
    const qcResvPText = qcPath.resvP ? qcPath.resvP.toLocaleString('en-US') : null;
    const qcRestTargetText = qcRestPText + ' psig \u00b7 ' + qcRestTText + ' \u00b0C';
    const qcRestCondName = qcPath.atResv ? 'reservoir conditions' : 'separator restoration conditions';
    const qMeta = {
      1:{ name:'Record opening pressure', title:'Record Opening Pressure', desc:'Record the as-received opening pressure at the water side valve before any restoration begins \u2014 about ' + qcOpenText + ' psig at 22 \u00b0C for this ' + qcPath.name + ' sample (' + qcPath.src + '). This is the reference reading for the whole QC run.' },
      2:{ name: qcPath.atResv ? 'Restore reservoir conditions' : 'Restore sample conditions',
          title: qcPath.atResv ? 'Restore Reservoir Conditions' : 'Restore Sample Conditions',
          desc:'Pressurise the water side through the water side valve to drive the floating piston down, while the heating jacket raises the bottle from ' + qcOpenText + ' psig / 22 \u00b0C to a restoration pressure of ' + qcRestPText + ' psig at ' + qcRestTText + ' \u00b0C'
            + (qcPath.atResv ? ' \u2014 the working pressure held above the ' + qcResvPText + ' psig reservoir pressure to keep the sample single phase.' : ' \u2014 the separator sample is restored to separator conditions, not reservoir conditions.') },
      3:{ name:'Sample Water Drainage', title:'Sample Water Drainage', desc:'Hold the upright bottle still at the restored conditions for a simulated 24 h so the dispersed water droplets settle below the oil, then drain only the collected free water through the bottom sample valve \u2014 no oil sample lost.' },
      4:{ name:'Sample Homogenization', title:'Sample Homogenization', desc:'Invert the mounted bottle slowly 0\u00b0 \u2192 180\u00b0 \u2192 0\u00b0 (3 cycles) while the pump and heating jacket hold ' + qcRestTargetText + '. The oil mixes on its own side of the floating piston and any free gas redissolves until the sample is homogeneous.' },
    };
    const qcStepTitle = qMeta[qStep].title, qcStepDesc = qMeta[qStep].desc;
    const qcS1 = qStep===1, qcS2 = qStep===2, qcS3 = qStep===3, qcS4 = qStep===4;
    const qcTabs = [1,2,3,4].map((n, idx_) => {
      const reached = n===1 || !!qDone[n-1], isDone = !!qDone[n], active = n===qStep;
      const c = isDone?'var(--accg)':active?'var(--blue)':reached?'var(--mut)':'var(--dis)';
      const bg = active?'rgba(77,157,255,.12)':isDone?'rgba(70,211,154,.10)':'var(--chipbg)';
      const bd = active?'var(--blue)':isDone?'rgba(70,211,154,.45)':'var(--line2)';
      return { n:String(idx_+1), name:qMeta[n].name, onClick: () => this.qcGoStep(n),
        wrapStyle:`flex:1; min-width:0; cursor:${reached?'pointer':'default'}; display:flex; align-items:center; gap:8px; padding:6px 11px; border-radius:9px; background:${bg}; border:1px solid ${bd};`,
        numStyle:`width:22px; height:22px; flex:0 0 auto; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'IBM Plex Mono'; font-size:11px; font-weight:600; color:${active||isDone?'var(--onacc)':'var(--mut)'}; background:${active?'var(--blue)':isDone?'var(--accg)':'transparent'}; border:1.4px solid ${c};`,
        nameStyle:`font-size:12px; font-weight:${active?600:400}; color:${active?'var(--txt)':reached?'var(--chipt)':'var(--dis)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;` };
    });
    const QC_OPEN = qcPath.open, QC_RES = qcRestP, QC_T0 = (qcPath.openT != null ? qcPath.openT : 22), QC_T1 = qcRestT;
    const resPText = Math.round(resP).toLocaleString('en-US'), resTText = String(Math.round(resT));
    // separator sample is already at its restoration temperature, so the jacket span is zero - guard the divide
    const heatFrac = Math.min(1, Math.max(0, (resT-QC_T0)/Math.max(1e-6, (QC_T1-QC_T0))));
    const presFrac = Math.min(1, Math.max(0, (resP-QC_OPEN)/(QC_RES-QC_OPEN)));
    const qcPBarStyle = { transform:`scaleX(${(0.06+0.94*presFrac).toFixed(3)})`, transformBox:'fill-box', transformOrigin:'left center', transition:(qcS2 && qRunning) ? 'transform .12s linear' : 'transform .5s linear' };
    const qcTBarStyle = { transform:`scaleX(${(0.06+0.94*heatFrac).toFixed(3)})`, transformBox:'fill-box', transformOrigin:'left center', transition:(qcS2 && qRunning) ? 'transform .12s linear' : 'transform .5s linear' };
    const resJacketStyle = { opacity: ((qcS2 && (qRunning||qStepDone)) || qcS3) ? 1 : 0.6, transition:'opacity .5s ease' };
    // ---- Step 2 restoration sequence, derived from the master clock qcRk (see qcRun) ----
    const qcRk = qcS2 ? (qRunning ? (this.state.qcRk || 0) : (qStepDone ? 1 : 0)) : 0;
    const rCl = (v) => Math.min(1, Math.max(0, v));
    const rLin = (a, b) => rCl((qcRk - a) / (b - a));
    const rsRun = qcS2 && qRunning;
    // Step 3 drainage (QcWaterSim.drain): the pump follows the discharged water through the same
    // water-side valve and injection line, holding the restored pressure
    const qc3D = (qcS3 && window.QcWaterSim) ? window.QcWaterSim.drain((this.state.qcSettle || 0) >= 1 ? (this.state.qcDk || 0) : 0) : { wv: 0, sv: 0, w: 0, flow: false };
    const qc3Flow = qcS3 && qRunning && qc3D.flow;
    const rsFlowOn = (rsRun && qcRk < 0.90) || qc3Flow;       // pump + water flow stop exactly at target pressure
    const rsValve = qcS2 ? rLin(0.02, 0.07) * (1 - rLin(0.92, 0.97)) : qcS3 ? qc3D.wv : 0;   // 0 closed .. 1 open
    const RS_L = 774, RS_VALVE_AT = 770 / 774;                // pump outlet -> water-side valve side port (approved bottle, inverted)
    const rsFrontRaw = qcS2 ? rLin(0.03, 0.22) : (qcS3 && qc3D.wv > 0) ? 1 : 0;
    // before the valve is fully open the front halts at the valve face; after the valve closes (0.92+) the filled line simply holds
    const rsFront = (rsValve < 1 && qcRk < 0.92) ? Math.min(rsFrontRaw, RS_VALVE_AT) : rsFrontRaw;
    const rsFrontStyle = `stroke-dashoffset:${(RS_L + 4 - rsFront * RS_L).toFixed(2)}; opacity:${rsFront > 0.001 ? 1 : 0}; transition:stroke-dashoffset .12s linear, opacity .3s ease;`;
    const rsPulseStyle = `opacity:${(rsFlowOn && rsFront > 0.001) ? 1 : 0}; transition:opacity .3s ease;`;
    const rsArrowUpStyle = `opacity:${(rsFlowOn && rsFront >= 110 / RS_L) ? 0.95 : 0.22}; transition:opacity .3s ease;`;
    const rsArrowLStyle = `opacity:${(rsFlowOn && rsFront >= 330 / RS_L) ? 0.95 : 0.22}; transition:opacity .3s ease;`;
    const rsValveWheelStyle = `transform:rotate(${(180 * rsValve).toFixed(1)}deg); transform-box:view-box; transform-origin:327.5px 97.5px; transition:transform .12s linear;`;
    const rsValveRing = rsValve >= 0.999 ? '#46d39a' : '#8fa3c2';
    const rsNeedleStyle = window.BottleArt ? window.BottleArt.needle(rsValve) : '';
    const rsValveText = 'Pump connection · ' + (rsValve >= 0.999 ? 'OPEN' : 'CLOSED');
    // soft orange glow: pulses while the bottle is heating, holds steady once the target is stable
    const rsHeating = rsRun && qcRk < 0.90;
    const resJacketGlowStyle = `animation:${rsHeating ? 'glowpulse calc(1.6s * var(--pm, 1)) ease-in-out infinite' : 'none'}; opacity:${rsHeating ? 1 : ((qcS2 && (rsRun || qStepDone)) || qcS3) ? 0.55 : 0}; transition:opacity .5s ease;`;
    const resTempFillStyle = { transform:`scaleY(${heatFrac.toFixed(3)})`, transformBox:'fill-box', transformOrigin:'bottom', transition:(qcS2 && qRunning) ? 'transform .12s linear' : 'transform .4s linear' };
    const resStable = qcS2 && qStepDone;
    // inverted bottle: water on top, piston mid, oil below. Injecting water drives the piston down.
    // pressure compresses (piston down); heating to 95 C expands the oil, easing the piston a little
    // back up into the water side. bleeding free water off the oil side lets it settle down again.
    // Drawing frame = approved Oil Sample Bottle bore, screen-aligned, centre (300, 238), scale 0.55:
    // bore y -226..226 (452 units) with a 46-unit floating piston, so the two columns share 406 units.
    // Split, piston travel and free-water band all come from the shared bottleModel() (drawing only).
    const qcBot = this.bottleModel();
    const QC_BORE = 452, QC_PIST = 46, QC_USE = QC_BORE - QC_PIST, QC_T = -226, QC_B = 226, QC_CY = 238, QC_S = 0.55;
    const qcPistFrac = qcBot.waterFrac;
    const qcPistEase = ((qcS2 || qcS3) && qRunning) ? 'transform .12s linear' : 'transform calc(1s * var(--pm, 1)) ease-out';   // restoration: track the clock
    const qcWaterStyle = `transform:scaleY(${((QC_USE / QC_BORE) * qcPistFrac).toFixed(4)}); transform-box:fill-box; transform-origin:top; transition:${qcPistEase};`;
    const qcOilStyle = `transform:scaleY(${((QC_USE / QC_BORE) * (1 - qcPistFrac)).toFixed(4)}); transform-box:fill-box; transform-origin:bottom; transition:${qcPistEase};`;
    const qcPistonStyle = `transform:translateY(${(QC_USE * qcPistFrac).toFixed(1)}px); transition:${qcPistEase};`;
    // free water sits at the bottom of the oil side and shrinks as it is bled to the beaker
    // ---- Step 3 Sample Water Drainage (components/QcWaterSim.js) ----
    // The 30 cc free water (FREEW_CC) starts as droplets dispersed through the oil, settles during the
    // simulated 24 h into a bottom layer (settled share = collected), then drains (drained share = water).
    // Layer = 30 cc x (collected - water): water leaving the dispersion is added to the layer, and the
    // layer shrinks exactly as the receiver fills. The oil column (piston underside -> layer top) is constant.
    const QC_FW_H = QC_USE * (30 / 800);
    const qc3Settle = this.state.qcSettle || 0, qc3Dk = this.state.qcDk || 0;
    const qc3PistBot = QC_T + QC_PIST + QC_USE * qcPistFrac;                   // underside of the piston
    const qc3Top0 = QC_T + QC_PIST + QC_USE * (qcPistFrac - (30 / 800) * water);   // same, before any drainage
    const qc3Sim = (qcS3 && window.QcWaterSim)
      ? window.QcWaterSim.state(qc3Settle, { x0: -22, x1: 22, top: qc3Top0, bot: QC_B, layerMax: QC_FW_H })
      : { drops: '', hi: '', collected: 0, count: 0 };
    const qc3Coll = qc3Settle >= 1 ? 1 : qc3Sim.collected;
    const qc3Layer = qcS3 ? QC_FW_H * Math.max(0, qc3Coll - water) : 0;
    const qcFreeWaterStyle = '';
    const qcFreeWaterH = qc3Layer.toFixed(2);
    const qcFreeWaterY = (QC_B - qc3Layer).toFixed(2);
    const qc3Drops = qc3Sim.drops, qc3DropHi = qc3Sim.hi;
    // oil turns from cloudy (dispersed water) to clear as the droplets settle out
    const qc3HazeY = qc3PistBot.toFixed(2), qc3HazeH = Math.max(0, QC_B - qc3Layer - qc3PistBot).toFixed(2);
    const qc3HazeOp = qcS3 ? (0.24 * (1 - qc3Coll)).toFixed(3) : '0';
    const qc3IfOp = qc3Layer > 0.4 ? '0.9' : '0';
    const qc3SvOpen = qc3D.sv;
    const qc3SvWheelStyle = `transform:rotate(${(180 * qc3SvOpen).toFixed(1)}deg); transform-box:view-box; transform-origin:327.5px 384.5px; transition:transform .12s linear;`;
    const qc3SvRing = qc3SvOpen >= 0.999 ? '#46d39a' : qc3SvOpen > 0.001 ? '#e7b15a' : '#8fa3c2';
    const qc3SvNeedleStyle = window.BottleArt ? window.BottleArt.needle(qc3SvOpen) : '';
    const qc3SvText = 'Oil / sample outlet \u00b7 ' + (!qcS3 || qc3SvOpen <= 0.001 ? 'closed' : qc3SvOpen >= 0.999 ? 'OPEN' : (qc3Dk < 0.5 ? 'opening' : 'closing'));
    const qc3Hours = Math.min(24, Math.floor(qc3Settle * 24 + 1e-6));
    const qc3HoursText = qc3Hours + ' / 24 hours';
    const qc3BarStyle = `transform:scaleX(${Math.max(0.02, qc3Settle).toFixed(4)}); transform-box:fill-box; transform-origin:left center; transition:transform .12s linear;`;
    const qc3DrainText = (30 * water).toFixed(1);
    const qc3BeakerText = 'receiver \u00b7 ' + (30 * water).toFixed(1) + ' cc';
    const qc3LayerCc = Math.max(0, 30 * (qc3Coll - water));
    const qc3Settled = qcS3 && qc3Settle >= 1;
    const qc3Msg = qcS3 && qStepDone ? 'Free-water drainage complete.' : (qc3Settled && !qRunning && qc3Dk <= 0) ? 'Settling complete \u2014 free water ready for drainage.' : '';
    const qc3MsgOn = !!qc3Msg;
    const qc3OilSub = qStepDone ? 'clear oil \u00b7 retained' : qc3Coll >= 1 ? 'clear \u00b7 free water below' : qc3Settle > 0 ? 'water droplets settling' : 'dispersed water droplets';
    const qc3FwSub = qStepDone ? 'drained \u00b7 ' + qc3DrainText + ' cc to receiver' : qc3LayerCc > 0.05 ? 'settled layer \u00b7 ' + qc3LayerCc.toFixed(1) + ' cc' : 'none yet \u00b7 water dispersed';
    const qc3OilY = (QC_CY + QC_S * (qc3PistBot + QC_B - qc3Layer) / 2).toFixed(1);   // callout leader (screen)
    const qc3FwY = (QC_CY + QC_S * (QC_B - qc3Layer / 2)).toFixed(1);
    const qcRig = qcS1 || qcS2 || qcS3;
    const qcPumpOn = qRunning && (qcS1 || (qcS2 && (this.state.qcRk || 0) < 0.90) || qc3Flow);
    const qcPumpFlowStyle = { opacity: (qRunning && qcS2) ? 1 : 0, transition:'opacity .4s ease' };
    const qcPumpLed = qcPumpOn ? '#3ddc8a' : '#1f6b48';
    const qcPumpLedStyle = { filter: qcPumpOn ? 'drop-shadow(0 0 7px #3ddc8a)' : 'none', transition:'filter .4s ease' };
    const qcGaugeCap = qcS3 ? 'RESTORED \u00b7 HELD' : qcS1 ? 'OPENING CONDITIONS' : qcS2 ? (qRunning ? 'RESTORING \u2014 LIVE' : qStepDone ? (qcPath.atResv ? 'RESERVOIR CONDITIONS' : 'RESTORED CONDITIONS') : 'READY TO RESTORE') : 'BOTTLE CONDITIONS';
    // at step 1 the gauge is reading the as-received opening pressure, not a restored bottle pressure
    const qcGaugePLabel = qcS1 ? 'OPENING PRESSURE' : 'BOTTLE PRESSURE';
    const qcOpenRecorded = (qcS1 && qStepDone) || (qcS2 && resStable);
    const qcOpenBadge = qcS1 ? 'Opening recorded \u2713' : 'At ' + qcRestPText + ' psig \u00b7 ' + qcRestTText + ' \u00b0C \u2713';
    // The receiver starts empty and fills with exactly the water leaving the bottle:
    // `water` (0..1) drives the beaker level, the free-water band in the bottle, the piston
    // and the cc readout, so all four move together. Transition ~ the 110 ms tween tick.
    const waterDropStyle = `opacity:${qc3Flow ? 1 : 0}; transition:opacity .3s ease;`;
    const beakerFillStyle = `transform:scaleY(${water.toFixed(4)}); transform-box:fill-box; transform-origin:bottom; transition:transform .15s linear;`;
    const waterCheckDone = qcS3 && qStepDone;
    const agitP = this.state.agitP || 0;
    const agitOn = !!agitate;
    // Step 4: 180 deg inversion timeline (components/QcAgitSim.js) - same progress value the scene uses
    const qcAg = window.QcAgitSim ? window.QcAgitSim.info(agitOn ? agitP : (qcS4 && qStepDone ? 1 : 0)) : { phase:'ready', label:'Ready', ang:0, cyc:0, N:3, gas:'-' };
    const qcAgRun = qcAg.phase === 'agitating'
      ? 'Agitating \u2014 cycle ' + qcAg.cyc + ' / ' + qcAg.N + ' \u00b7 bottle at ' + Math.round(qcAg.ang) + '\u00b0 \u00b7 gas bubbles dispersing and dissolving at ' + resPText + ' psig\u2026'
      : 'Stabilizing \u2014 bottle upright, last free gas going into solution \u00b7 pump holding ' + resPText + ' psig\u2026';
    const qcStatusMap = {
      idle:{1:'Ready \u2014 bottle clamped, pump on the upper water-side valve. Record the opening pressure.',2:'Ready \u2014 start restoration to ' + qcRestTargetText + ' (water injection + heating jacket)',3:(qc3Settle >= 1 ? 'Settling complete \u2014 free water ready for drainage.' : 'Ready \u2014 bottle upright at ' + qcRestTargetText + ', water droplets dispersed in the oil. Start the simulated 24 h settling.'),4:'Ready \u2014 bottle clamped on the inversion stand, pump holding ' + qcRestTargetText + '. Start the 180\u00b0 inversion.'},
      run:{1:'Reading opening pressure at the upper valve\u2026',2:(qcRk < 0.07 ? 'Heating jacket on \u00b7 transfer pump started \u00b7 opening the water-side valve\u2026' : qcRk < 0.22 ? 'Water moving from the pump through the injection line to the water-side valve\u2026' : qcRk < 0.90 ? 'Injecting water above the floating piston and heating \u2014 restoring to ' + qcRestTargetText + '\u2026' : 'Target reached \u00b7 pump stopped \u00b7 closing the water-side valve\u2026'),3:(qc3Settle < 1 ? 'Settling (accelerated) \u2014 hour ' + qc3Hours + ' / 24 \u00b7 droplets descending under gravity, sample valve closed\u2026' : qc3Dk < 0.12 ? 'Opening the bottom sample valve slowly\u2026' : qc3Dk < 0.88 ? 'Draining free water to the receiver \u2014 pump follows at ' + resPText + ' psig, piston moving down\u2026' : 'Free water removed \u2014 closing the sample valve before oil reaches the outlet\u2026'),4:qcAgRun},
      done:{1:'Opening pressure recorded \u2014 restoration can begin',2:'Restoration Complete \u2014 stable at ' + qcRestTargetText + ' (' + qcRestCondName + ') \u00b7 water-side valve closed',3:'Free-water drainage complete \u2014 sample valve closed, oil retained. Sample ready to mix',4:'Homogeneous sample \u2014 single phase, no free gas, stable at ' + qcRestTargetText + ' \u00b7 ready for charging'},
    };
    const qcStatusText = (qcStatusMap[qRunning?'run':(qStepDone?'done':'idle')])[qStep];
    const qcLiveColor = (qStepDone || (qc3Settled && !qRunning)) ? 'var(--accg)' : qRunning ? 'var(--blue)' : 'var(--mut)';
    const qcLiveLabel = qcS4 ? qcAg.label : qcS3 ? (qStepDone ? 'Drainage Complete' : qRunning ? (qc3Settle < 1 ? 'Settling' : 'Draining') : qc3Settled ? 'Settling Complete' : 'Idle') : qStepDone ? (qcS2 ? 'Restoration Complete' : 'Step Complete') : qRunning ? 'Running' : 'Idle';
    const qcSampleId = { bottomhole:'BHS-001', wellhead:'WHS-002', separator:'SEP-003' }[qcPathKey];
    const qcSourceLine = 'From ' + qcPath.name + ' sampling \u00b7 ' + qcPath.src;
    const qcRestorePct = Math.max(0, Math.min(100, Math.round(100 * (resP - QC_OPEN) / (QC_RES - QC_OPEN))));
    // live cards: reservoir pressure only where the source has one, then the restoration
    // targets for this source, then the live bottle readings.
    // separator path: the sample sits at separator conditions, so only those two cards are meaningful
    const qcLiveCards = qcPathKey === 'separator'
      ? [
          { l:qcPath.pLabel, v:qcPath.pVal, u:qcPath.pUnit, c:'var(--accb)' },
          { l:qcPath.tLabel, v:qcPath.tVal, u:'\u00B0C', c:'var(--acca)' }
        ]
      : qcPathKey === 'wellhead'
      ? [
          { l:qcPath.pLabel, v:qcPath.pVal, u:qcPath.pUnit, c:'var(--accb)' },
          { l:qcPath.tLabel, v:qcPath.tVal, u:'°C', c:'var(--acca)' },
          { l:'RESERVOIR PRESSURE', v:qcResvPText, u:'psig', c:'var(--accb)' },
          { l:'RESERVOIR TEMPERATURE', v:String(qcPath.resvT), u:'°C', c:'var(--acca)' }
        ]
      : qcPathKey === 'bottomhole'
      ? [
          { l:'RESERVOIR PRESSURE', v:qcResvPText, u:'psig', c:'var(--accb)' },
          { l:'RESERVOIR TEMPERATURE', v:String(qcPath.resvT), u:'°C', c:'var(--acca)' }
        ]
      : [
      qcResvPText ? { l:'RESERVOIR PRESSURE', v:qcResvPText, u:'psig', c:'var(--accb)' }
                  : { l:qcPath.pLabel, v:qcPath.pVal, u:qcPath.pUnit, c:'var(--accb)' },
      { l:'OPENING PRESSURE', v:qcOpenText, u:'psig', c:'var(--txt)' },
      { l:'RESTORATION PRESSURE', v:qcRestPText, u:'psig', c:'var(--accb)' },
      { l:'RESTORATION TEMPERATURE', v:qcRestTText, u:'\u00B0C', c:'var(--acca)' },
      { l:'BOTTLE PRESSURE', v:resPText, u:'psig', c:'var(--accb)' },
      { l:qcPath.btLabel, v:resTText, u:'\u00B0C', c:'var(--txt)' }
    ];
    let qcRows = [];
    if (qStep===1) qcRows = [ {label:'Bottle',value:qcPath.bottle,vc:'var(--lbl)'}, {label:'Opening Pressure',value:qStepDone?resPText+' psig':qRunning?'Reading\u2026':'\u2014',vc:qStepDone?'var(--accg)':'var(--accb)'}, {label:'Bottle Temperature',value:resTText+' \u00b0C',vc:'var(--acca)'}, {label:'Restoration',value:qStepDone?'Cleared to start':'Locked',vc:qStepDone?'var(--accg)':'var(--mut)'} ];
    else if (qStep===2) qcRows = [ {label:'Start Conditions',value:qcOpenText+' psig \u00b7 22 \u00b0C',vc:'var(--mut)'},
      ...(qcResvPText ? [{label:'Reservoir Pressure',value:qcResvPText+' psig',vc:'var(--mut)'}] : []),
      {label:'Bottle Pressure',value:resPText+' psig',vc:'var(--accb)'}, {label:'Bottle Temperature',value:resTText+' \u00b0C',vc:'var(--acca)'}, {label:'Restoration Target',value:qcRestTargetText,vc:'var(--mut)'}, {label:'Stabilization',value:resStable?'Stable':qRunning?'Restoring\u2026':'\u2014',vc:resStable?'var(--accg)':'var(--mut)'} ];
    else if (qStep===3) qcRows = [ {label:'Settling Time',value:qc3HoursText,vc:qc3Settled?'var(--accg)':'var(--accb)'}, {label:'Free Water Settled',value:qc3LayerCc.toFixed(1)+' cc',vc:'var(--accw)'}, {label:'Water to Receiver',value:qc3DrainText+' cc',vc:'var(--accw)'}, {label:'Sample',value:waterCheckDone?'Ready to mix':'Preserved',vc:'var(--lbl)'} ];
    else { const agC = qcAg.phase === 'done' ? 'var(--accg)' : qcAg.phase === 'ready' ? 'var(--lbl)' : 'var(--accb)';
      qcRows = [ {label:'Phase',value:qcAg.label,vc:agC}, {label:'Bottle Angle',value:Math.round(qcAg.ang)+'\u00b0 \u00b7 0\u2013180\u00b0',vc:'var(--accb4)'}, {label:'Inversion Cycle',value:qcAg.cyc+' / '+qcAg.N,vc:'var(--lbl)'}, {label:'Free Gas',value:qcAg.gas,vc:qcAg.phase==='done'?'var(--accg)':'var(--acca2)'}, {label:'Bottle Pressure',value:resPText+' psig',vc:'var(--accb)'}, {label:'Bottle Temperature',value:resTText+' \u00b0C',vc:'var(--acca)'} ]; }
    const qcProgress = [1,2,3,4].map(n => {
      const isDone=!!qDone[n], active=n===qStep, c=isDone?'var(--accg)':active?'var(--blue)':'var(--dis)';
      return { label:qMeta[n].name, dotStyle:`width:11px;height:11px;border-radius:50%;flex:0 0 auto;border:1.6px solid ${c};background:${(active||isDone)?c:'transparent'};box-shadow:${active?'0 0 8px '+c:'none'};`, txtStyle:`font-size:12.5px;color:${(isDone||active)?'var(--lbl)':'var(--dis)'};font-weight:${active?500:300};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;` };
    });
    const qcRunText = qRunning?'Running\u2026':qStepDone?'Re-run Step':(qStep===1?'Record Opening Pressure':qStep===2?'Start Restoration':qStep===3?'Sample Water Drainage':'Start Agitation');
    const qcRunBg = qRunning?'var(--chipbg)':'rgba(77,157,255,.14)';
    const qcRunBorder = qRunning?'var(--line)':'var(--line2)';
    const qcRunColor = qRunning?'var(--mut2)':'var(--btnt)';
    const qcRunCursor = qRunning?'default':'pointer';
    const qcLastStep = qStep===4, qcNextEnabled = qStepDone && !qRunning;
    const qcNextText = qcLastStep?'Start Charging \u2192':'Next Step \u2192';
    const qcNextBg = qcNextEnabled?(qcLastStep?'linear-gradient(180deg,#46d39a,#2f9d72)':'linear-gradient(180deg,#3f8ae0,#2f6fd0)'):'rgba(150,175,210,.05)';
    const qcNextBorder = qcNextEnabled?(qcLastStep?'#2f9d72':'#5a9bea'):'var(--line)';
    const qcNextColor = qcNextEnabled?(qcLastStep?'#06241a':'#fff'):'var(--mut2)';
    const qcNextCursor = qcNextEnabled?'pointer':'default';

    return {
      showXfer: scr === 'mdtXfer',
      mxStart: () => this.xfrRun(),
      mxBack: () => { this.clearTimers(); this.setState({ screen: 'validation' }); },
      mxNext: () => { this.clearTimers(); this.setState({ screen: 'module02', qcStep: 1, qcPhase: 'idle', xfer: 1, resP: 0, resT: 22, water: 0, qcSettle: 0, qcDk: 0, agitate: false, agitP: 0, qcFromBH: true, valSrc: 'bottomhole', qcDone: { 1:false, 2:false, 3:false, 4:false } }); },
      mxSpResStyle, mxSpDriveStyle, mxSpPistonStyle, mxSpIsoStyle, mxSpInletStyle, mxSpPortStyle, mxSampleLabelStyle, mxBufferLabelStyle, mxLinePText, mxLineGaugeStyle,
      mxJacketStyle, mxJacketFillStyle, mxJacketGlowStyle, mxTempBoxText,
      mxBotFluidTextStyle, mxBotFluidStyle, mxBotWaterStyle, mxBotPistonStyle, mxBotNeedleT,
      mxBeakerStyle, mxFlowStyle, mxPumpFrontStyle, mxPumpPulseStyle, mxXferFrontStyle, mxXferPulseStyle, mxWoutFrontStyle, mxWoutPulseStyle, mxArrowPumpStyle, mxArrowX1Style, mxArrowX2Style, mxArrowWStyle, mxValveRing, mxLed, mxLedStyle, mxLiveColor, mxLiveLabel, mxStatusText, mxXferText, mxBarStyle,
      mxRows, mxSampleId, mxSteps, mxRunText, mxRunStyle, mxNextStyle,
      showRestore: scr === 'module02',
      goRestore: () => this.setState({ screen: 'module02', qcStep:1, qcPhase:'idle', xfer:0, resP:0, resT:this.qcOpenT(), water:0, qcSettle:0, qcDk:0, agitate:false, agitP:0, qcDone:{1:false,2:false,3:false,4:false}, qcFromBH:true }),
      backToQC: () => this.setState({ screen: 'validation' }),
      showTest: scr === 'module03',
      goTest: () => this.setState({ screen: 'module03' }),
      test03: this.state.test03,
      setCce: () => this.setState({ test03: 'cce' }),
      setDl: () => this.setState({ test03: 'dl' }),
      setSep: () => this.setState({ test03: 'sep' }),
      setVisc: () => this.setState({ test03: 'visc' }),
      setGc: () => this.setState({ test03: 'gc' }),
      t03Cce: this.state.test03 === 'cce', t03Dl: this.state.test03 === 'dl', t03Sep: this.state.test03 === 'sep', t03Visc: this.state.test03 === 'visc', t03Gc: this.state.test03 === 'gc',
      cceBorder: this.state.test03 === 'cce' ? 'var(--blue)' : 'transparent', cceColor: this.state.test03 === 'cce' ? 'var(--txt)' : 'var(--mut)',
      dlBorder: this.state.test03 === 'dl' ? 'var(--blue)' : 'transparent', dlColor: this.state.test03 === 'dl' ? 'var(--txt)' : 'var(--mut)',
      sepBorder: this.state.test03 === 'sep' ? 'var(--blue)' : 'transparent', sepColor: this.state.test03 === 'sep' ? 'var(--txt)' : 'var(--mut)',
      viscBorder: this.state.test03 === 'visc' ? 'var(--blue)' : 'transparent', viscColor: this.state.test03 === 'visc' ? 'var(--txt)' : 'var(--mut)',
      gcBorder: this.state.test03 === 'gc' ? 'var(--blue)' : 'transparent', gcColor: this.state.test03 === 'gc' ? 'var(--txt)' : 'var(--mut)',
      fAdvance: () => this.flashAction(), fRestart: () => this.flashReset(),
      showFlashStep: (this.state.chargeStep || 0) >= 12 && scr !== 'pvTest',
      showChargeStep: (this.state.chargeStep || 0) < 12 && scr !== 'pvTest',
      showPvTest: scr === 'pvTest',
      goPvTest: () => this.setState({ screen: 'pvTest' }),
      showDensity: scr === 'density',
      showRecomb: scr === 'recomb',
      rcHost: this.rcHost,
      rcPillText: this.state.rcDone ? 'Complete' : this.state.rcStarted ? 'In Progress' : 'Not Started',
      rcPillStyle: 'flex:0 0 auto; align-self:center; white-space:nowrap; font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; ' +
        (this.state.rcDone ? 'background:rgba(70,211,154,.10); border:1px solid rgba(70,211,154,.40); color:var(--grn);'
          : this.state.rcStarted ? 'background:rgba(77,157,255,.10); border:1px solid rgba(77,157,255,.40); color:var(--blue);'
          : 'background:var(--chipbg); border:1px solid var(--line2); color:var(--mut);'),
      goDensity: () => { this.clearTimers(); this.setState({ screen: 'density' }); },
      dsMarkVerified: () => this.setState({ dsVerified: true }),
      pvBtnBgAct: 'linear-gradient(180deg,#46d39a,#2f9d72)', pvBtnBorderAct: '#2f9d72', pvBtnColorAct: '#06231a',
      pvBackToFlash: () => this.setState({ screen: 'module03' }),
      fReadouts, fRoutes, fSteps, fStatusText, fPillBg, fPillBorder, fPillColor, fPillDot,
      showReport: scr === 'module04',
      goReport: () => this.setState({ screen: 'module04' }),
      setRepSec: (e) => { const s = e && e.currentTarget && e.currentTarget.getAttribute('data-sec'); if (s) this.setState({ repSec: s }); },
      repNav: [
        ['cover','01','Cover Page'],['summary','02','Executive Summary'],['sample','03','Sample Information'],
        ['method','04','Sampling Method'],['restoration','05','Restoration Summary'],['conditions','06','PVT Test Conditions'],
        ['cce','07','CCE Results'],['dl','08','DL Results'],['separator','09','Separator Test'],
        ['viscosity','10','Viscosity & Density'],['gc','11','GC Composition'],['tables','12','PVT Property Tables'],
        ['graphs','13','Graphs & Plots'],['eos','14','EOS / Calculator Input'],['qc','15','Quality Control'],
        ['conclusions','16','Final Conclusions'],['export','17','Export / Deliverables'],
      ].map((s) => ({
        key: s[0], num: s[1], label: s[2],
        style: 'display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:8px; cursor:pointer; font-size:12px; border:1px solid ' +
          (this.state.repSec === s[0] ? 'rgba(77,157,255,.3); background:linear-gradient(90deg,rgba(77,157,255,.14),rgba(77,157,255,.03)); color:var(--blue);' : 'transparent; background:none; color:var(--mut);'),
        numStyle: 'font-family:\'IBM Plex Mono\'; font-size:10px; ' + (this.state.repSec === s[0] ? 'color:var(--blue);' : 'color:var(--mut2);'),
      })),
      rsCover: this.state.repSec === 'cover', rsSummary: this.state.repSec === 'summary', rsSample: this.state.repSec === 'sample',
      rsMethod: this.state.repSec === 'method', rsRestoration: this.state.repSec === 'restoration', rsConditions: this.state.repSec === 'conditions',
      rsCce: this.state.repSec === 'cce', rsDl: this.state.repSec === 'dl', rsSeparator: this.state.repSec === 'separator',
      rsViscosity: this.state.repSec === 'viscosity', rsGc: this.state.repSec === 'gc', rsTables: this.state.repSec === 'tables',
      rsGraphs: this.state.repSec === 'graphs', rsEos: this.state.repSec === 'eos', rsQc: this.state.repSec === 'qc',
      rsConclusions: this.state.repSec === 'conclusions', rsExport: this.state.repSec === 'export',
      showCalc: scr === 'module05',
      goCalc: () => this.setState({ screen: 'module05', calcMode: this.state.calcMode || 'oil' }),
      goOilCalc: () => this.setState({ screen: 'module05', calcMode: 'oil' }),
      goGasCalc: () => this.setState({ screen: 'module05', calcMode: 'gas' }),
      pvCalcHost: this.pvCalcHost,
      bhHost: this.bhHost,
      startRestore: () => this.startRestore(),
      sendNext: () => { if (this.state.restorePhase === 'complete') this.setState({ screen: 'module03' }); },
      qcStepTitle, qcStepDesc, qcS1, qcS2, qcS3, qcS4, qcTabs, qcRig,
      qcOpenText, qcGasNote, qcPathBadge, qcSampleId, qcSourceLine, qcLiveCards,
      qcWaterStyle, qcOilStyle, qcPistonStyle, qcFreeWaterStyle, qcFreeWaterH, qcFreeWaterY,
      qcAgHost: this.qcAgHost,
      qcPumpFlowStyle, rsFrontStyle, rsPulseStyle, rsArrowUpStyle, rsArrowLStyle, rsValveWheelStyle, rsValveRing, rsValveText, resJacketGlowStyle, qcPumpLed, qcPumpLedStyle, qcGaugeCap, qcGaugePLabel, qcOpenRecorded, qcOpenBadge,
      agitOn,
      qcGo1: () => this.qcGoStep(1), qcGo2: () => this.qcGoStep(2), qcGo3: () => this.qcGoStep(3), qcGo4: () => this.qcGoStep(4),
      qcRun: () => this.qcRun(), qcNext: () => this.qcNext(),
      // ===== Charge to PVT Cell: 12-stage sequence =====
      chargeProgress: chargeProgress_, chargeAdvance: () => this.chargeAction(),
      chargeFlash: () => this.chargeGoFlash(), chargeRestart: () => this.chargeReset(),
      chargeBtnText, chargeBtnBg, chargeBtnBorder, chargeBtnColor, chargeBtnCursor,
      flashBtnBg, flashBtnBorder, flashBtnColor, flashBtnCursor, readyText, readyColor,
      chargeOilH, chargeWaterY, chargeWaterH, chargePistonStyle, chargePistonLabelStyle, chargeBtlRing, chargeBtlNeedle, chargePumpRing, chargePumpNeedle,
      chargePumpLabel, chargePumpLabelColor, chargePumpFlowStyle, chargePumpAFillStyle,
      chargePumpAFillH, chargePumpAFillY, chargePumpBFillH, chargePumpBFillY, chargePumpBFillStyle,
      chargeHeadX, chargeHeadY, chargeHeadStyle, chargeRevealStyle,
      // approved PVT cell (PVTCellArt): Pump A / Pump B valves, Port L isolation valve = the Charge cell valve; Port L tubing while the bottle is connected
      cellV: { A: vPumpA, B: vPumpB, L: vCell, Lconn: bottleOn },
      seg1FlowStyle, seg2FlowStyle, seg3FlowStyle, seg4FlowStyle, chargeValveHotStyle, chargeValveWheelStyle,
      chargeLineFluidStyle, pumpLineFluidStyle,
      pumpABranchFluidStyle, pumpBBranchFluidStyle, pumpABranchFlowStyle, pumpBBranchFlowStyle,
      pumpBValveHotStyle, pumpBValveLeverStyle, pumpBValveLabelColor, pumpBHeldStyle, seg4bFlowStyle,
      cbPsi, cbPsiColor, cbMl, initReadText, initReadStroke, initReadColor,
      vacBig, vacBarW, vacPanelColor, vacPanelStroke, vacHeadline, connPipeStyle, connRevealStyle, bottleOff,
      chargeViewBox, chargeDeskStyle, chargeMonWrapStyle, chargeSigD, chargeSig2D, chargeSigStyle, chargeSig2Style, agMarkX, agMarkTrans,
      showBottleRig, monShow, monLabel, monBig, monUnit, monStartText, monTargetText, monBarW, monColor, monStroke,
      pumpAText, pumpBText, pumpAColor, pumpBColor, showPumpASealed, pumpAPistonY, pumpBPistonY, pumpPistonTrans, tpText, vacText, deadText, showDead,
      agFlowStyle, agDashStyle, agArrowD, agDirText, agCycleText, agHalfText, cellPText,
      agDevText, agDevColor, agResultText, agResultBg, agResultBorder, agResultColor,
      chargeShowAgit, baroPoints, chargeReadouts, chargeValves, agCards1, agCards2, agCards3,
      cellStatusText, cellStatusColor, cellStatusBg, cellStatusBorder, cellStatusDot,
      noteVacuum, noteValveClosed, noteInitRead, noteDead, noteIso, noteAgit, chargeBadges,
      chargeStageTag, cellStateShort, tagBottle, tagCell, tagPumpA, tagPumpB, ringBottle, ringCell, ringPumpA, ringPumpB, cellHeldStyle,
      bottleValveHotStyle, bottleValveWheelStyle, bottleValveLabelColor, cellHaloStyle, vacPathStyle, vacSigStyle, connPointStyle,
      tpHiStyle, pcV1Style, pcV2Style, pcFlashStyle, pcSavedStyle, deadGlowStyle, pumpAHaloStyle, pumpASealRingStyle,
      pumpAVal, pumpBVal, retainedStyle, chargeHLineStyle, chargeArrowStyle, connPipeStyle2, discGapStyle, rigDimStyle, bottleOffText,
      monSub, monGauge, monCalc, monIso, monCard, calcColor, calcStroke, calcTitle, calcRow1, calcRow2, calcRow3, calcRow4, calcV2Hi,
      isoColor, isoStroke, isoTitle, isoRows, calcV1, calcV2, calcDiffEq, calcDiff, calcTotalEq,
      pumpAValveHotStyle, pumpAValveLeverStyle, pumpAHeldStyle, pumpAValveLabelColor,
      resPText, resTText, resJacketStyle, resTempFillStyle, resStable, qcPBarStyle, qcTBarStyle,
      waterDropStyle, beakerFillStyle, waterCheckDone,
      qc3Drops, qc3DropHi, qc3HazeY, qc3HazeH, qc3HazeOp, qc3IfOp, qc3SvWheelStyle, qc3SvRing, qc3SvText, qc3BeakerText,
      qc3HoursText, qc3BarStyle, qc3DrainText, qc3Msg, qc3MsgOn, qc3OilSub, qc3FwSub, qc3OilY, qc3FwY, qc3SvNeedleStyle, rsNeedleStyle,
      qcStatusText, qcLiveColor, qcLiveLabel, qcRows, qcProgress,
      qcRunText, qcRunBg, qcRunBorder, qcRunColor, qcRunCursor,
      qcLastStep, qcNextText, qcNextBg, qcNextBorder, qcNextColor, qcNextCursor,
      restored, pNeedleStyle,
      curPText, curTText, restoreStatusText, restoreLiveColor, restoreLiveLabel,
      bottleWaterStyle, dischargeColor, dischargeLabel, dischargeStyle, cupFillStyle, cupLabel,
      valveMeasured, valveResult, valveResultColor, valvePillBg, valvePillBorder,
      waterPresence, waterPresenceColor, finalQC, finalQCColor, waterMeasured,
      rSteps, rPillColor, rPillText, rPillBg, rPillBorder,
      startBtnText, startBtnBg, startBtnBorder, startBtnColor,
      nextBtnText, nextBtnBg, nextBtnBorder, nextBtnColor, nextBtnCursor,
      valSrcBtns: this.valSrcBtns(),
      valSrcName: this.valSrcMap()[this.valSource()].sample,
      valSrcBottle: this.valSrcMap()[this.valSource()].bottle,
      valSrcContext: this.valSrcMap()[this.valSource()].sample + ' \u00b7 ' + this.valSrcMap()[this.valSource()].bottle,
      showValidation: scr === 'validation',
      goValidation: () => { this.clearTimers(); this.setState({ screen: 'validation' }); },
      valCards: this.buildValCards(),
      valGridStyle: this.valGridStyle(),
      valCardsA: this.buildValCards().slice(0, 4),
      valCardsB: this.buildValCards().slice(4),
      valRunAll: () => this.valRunAll(),
      showAnalysis: scr === 'analysis',
      showDiffLib: scr === 'difflib',
      showSeparator: scr === 'separator',
      showGC: scr === 'gc',
      showVisc: scr === 'visc',
      showViscMenu: scr === 'viscMenu',
      viscCards: this.buildViscCards(),
      showViscTest: !!(window.VISC_MODULE && window.VISC_MODULE.byScreen(scr)),
      vtIsKin: scr === 'viscKin', vtIsSingle: scr === 'viscSingle', vtIsTwo: scr === 'viscTwo',
      ...(() => {
        const VM = window.VISC_MODULE, t = (VM && VM.byScreen(scr)) || (VM && VM.tests[0]);
        if (!t) return {};
        const st = this.viscTestState(t.id).status, tint = VM.accent;
        return {
          vtName: t.name, vtDesc: t.pageDesc, vtIcon: t.icon, vtStatus: st,
          vtPillStyle: this.viscPillStyle(st),
          vtIconStyle: 'background:' + tint + '1f; color:' + tint + ';',
          // the three tests use the shared Validation layout (tabs + simulation area + sidebar dock) without an extra frame
          vtWorkStyle: (scr === 'viscKin' || scr === 'viscSingle' || scr === 'viscTwo') ? 'flex:1 1 auto; min-height:0; min-width:0; display:flex; flex-direction:column; text-align:left;'
            : 'flex:1 1 auto; min-height:0; border-radius:14px; background:var(--panel); border:1px solid var(--line); border-bottom:2.5px solid ' + tint + '; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:24px; box-shadow:0 1px 2px rgba(10,20,40,.04), 0 8px 20px rgba(10,20,40,.03);',
          vtIsTwoCell: scr === 'viscTwo', vtIsSingleBtl: scr === 'viscSingle'
        };
      })(),
      viscBackToMenu: () => { this.clearTimers(); this.viscGoUp('viscMenu'); },
      viscKinStatus: s => this.viscSetStatus('kinematic', s),
      viscSingleStatus: s => this.viscSetStatus('single', s),
      viscTwoStatus: s => this.viscSetStatus('two', s),
      goAnalysis: () => this.setState({ screen: 'analysis' }),
      anaCards: this.buildAnaCards(),
      showAnaTest: scr === 'analysisTest',
      anaTestName: (this.anaMeta().filter(a => a.id === this.state.anaTest)[0] || this.anaMeta()[0]).name,
      anaTestDesc: (this.anaMeta().filter(a => a.id === this.state.anaTest)[0] || this.anaMeta()[0]).desc,
      backToAnalysis: () => this.setState({ screen: 'analysis' }),
      showDash: scr === 'dashboard',
      showSplash: scr === 'splash',
      enterDashboard: () => this.setState({ screen: 'dashboard' }),
      showTopBar: scr !== 'splash',
      showNav: scr === 'dashboard' || scr === 'about' || scr === 'settings',
      isLight: this.state.theme === 'light',
      isDark: this.state.theme !== 'light',
      themeName: this.state.theme === 'light' ? 'Light' : 'Dark',
      themeDesc: this.state.theme === 'light' ? 'Light interface for bright rooms and printing' : 'Dark interface for low-light laboratory use',
      themeTrackStyle: 'width:40px; height:22px; border-radius:20px; background:' + (this.state.theme === 'light' ? 'rgba(77,157,255,.40)' : 'var(--track)') + '; border:1px solid ' + (this.state.theme === 'light' ? 'var(--blue)' : 'var(--line2)') + '; position:relative; cursor:pointer; transition:background .2s ease, border-color .2s ease; flex:0 0 auto;',
      themeKnobStyle: 'position:absolute; top:1.5px; left:' + (this.state.theme === 'light' ? '20px' : '2px') + '; width:17px; height:17px; border-radius:50%; background:var(--txt2); transition:left .2s ease;',
      toggleTheme: () => {
        const next = this.state.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(next);
        try { localStorage.setItem('pvtTheme', next); } catch (e) {}
        this.setState({ theme: next });
      },
      // ===== Module 01 draft exports =====
      showModule01: scr === 'module01',
      m01Picked: true,
      // overview: schematic uses the full width; sampling pages: schematic | side panel (var(--m01-side), same on
      // Wellhead / Separator and inside BottomHoleSim for Bottom Hole)
      m01GridStyle: 'flex:1; min-height:0; overflow:hidden; display:grid; grid-template-columns:' + ((ovw_d || ap_d === 'bottomhole') ? 'minmax(0,1fr)' : 'minmax(0,1fr) var(--m01-side)') + '; gap:0; padding:0; align-items:stretch; min-width:0; width:100%;',
      prodVB: '0 0 1000 560',
      // one field-system drawing (FieldSketch.js) for Overview / Wellhead / Separator; inactive groups dimmed
      fieldVis: ovw_d || ap_d === 'wellhead' || ap_d === 'separator',
      fieldVB: ovw_d ? '0 86 1320 560' : '0 30 1340 560',
      fzWellCls: (ap_d === 'wellhead' || ap_d === 'separator') ? 'fz-dim' : 'fz-g',
      fzTreeCls: ap_d === 'separator' ? 'fz-dim' : 'fz-g',
      fzMidCls: (ap_d === 'wellhead' || ap_d === 'separator') ? 'fz-dim' : 'fz-g',
      fzSepCls: ap_d === 'wellhead' ? 'fz-dim' : 'fz-g',
      whValveFill: sampleFlow_d ? '#5fd0ff' : '#dfe8f4',
      sepValveFill: sampleFlow_d ? '#5fd0ff' : '#dfe8f4',
      showDataBar: false,
      showLiveRow: ap_d === 'wellhead' || ap_d === 'separator',
      liveCards: liveCards_d,
      whBottleMode: ap_d === 'wellhead',
      panelTitle: ap_d === 'separator' ? 'Oil & Gas Sample Bottles' : 'Oil Sample Bottle',
      whBtlSample: whBtlSample_d, whBtlBuffer: _sbWh_d.buffer, whBtlPiston: _sbWh_d.piston, sepBtlSample: sepBtlSample_d, sepBtlBuffer: _sbSep_d.buffer, sepBtlPiston: _sbSep_d.piston, sepGasFill: gasFill_d, sepOilLabel: sepOilLabel_d,
      actOv: ovw_d,
      mbOv: mbtn_d(ovw_d),
      selOv: () => this.pick('overview'),
      oilFill: oilFill_d, oilWater: oilWater_d, oilPiston: oilPiston_d, panPiston: panPiston_d, whOilFill: whOilFill_d, whN2Fill: whN2Fill_d, whPiston: whPiston_d, whOilLabel: whOilLabel_d, miniPiston: miniPiston_d, miniPistonY: miniPistonY_d, gasFill: gasFill_d, sampleFlow: sampleFlow_d,
      m01SvgStyle: 'display:block; width:100%; height:100%; flex:1 1 auto; min-width:0;',
      m01BhScene: bhScene_v, m01ProdVis: !bhScene_v,
      showWhPanel: whScene_v,
      showSepPanel: sepScene_v,
      m01Subtitle: (ap_d === 'bottomhole' && this.state.bhMode === 'cased') ? 'SRS single-phase reservoir sampler on wireline \u00b7 producing well' : m01Subtitle_dd,
      mbBh: mbtn_d(ap_d === 'bottomhole'), mbWh: mbtn_d(ap_d === 'wellhead'), mbSep: mbtn_d(ap_d === 'separator'),
      selBh: () => this.pick('bottomhole'),
      selWh: () => this.pick('wellhead'),
      selSep: () => this.pick('separator'),
      runSample: () => this.runSample(),
      takeSampleText: takeSampleText_d, takeBtnStyle: takeBtnStyle_d, labBtnStyle: labBtnStyle_d, labReady: labReady_d,
      whHi: whHi_d, sepHi: sepHi_d, bhHi: bhHi_d, whConnColor: whConnColor_d, sepConnColor: sepConnColor_d, surfaceFlow: surfaceFlow_d,
      schFillStyle: schFillStyle_d, spsSampleStyle: spsSampleStyle_d, spsPistonStyle: spsPistonStyle_d, bhToolFillStyle: bhToolFillStyle_d, bhCableStyle: bhCableStyle_d,
      rtBottlePressure: rtBottlePressure_d, rtTemp: rtTemp_d, rtStatus: rtStatus_d, rtStatusColor: rtStatusColor_d, rtStatusTextStyle: rtStatusTextStyle_d, rtUpdated: rtUpdated_d, rtDuration: rtDuration_d,
      bottomCards: bottomCards_d,
      sendToLab: () => { if (this.state.phase !== 'done') return; const bh = this.state.activePoint === 'bottomhole'; if (bh) { this.clearTimers(); this.setState({ screen: 'mdtXfer', xfrPhase: 'idle', xfrP: 0, xfrH: 0 }); return; } this.setState({ screen: 'module02', qcStep: 1, qcPhase: 'idle', xfer: 1, resP: 0, resT: this.qcOpenT(this.state.activePoint === 'separator' ? 'separator' : 'wellhead'), water: 0, qcSettle: 0, qcDk: 0, agitate: false, agitP: 0, qcFromBH: bh, valSrc: this.state.activePoint === 'separator' ? 'separator' : 'wellhead', qcDone: { 1: false, 2: false, 3: false, 4: false } }); },
      sample: sample_d, activePoint: ap_d, activeLabel: labels_d[ap_d], statusText: statusText_d,
      actBh: ap_d === 'bottomhole', actWh: ap_d === 'wellhead', actSep: ap_d === 'separator',
      prodVis: ap_d !== 'bottomhole' && !ovw_d, // overview draws its own field-system svg (showModule01.js)
      showBhPanel: false, showBottlePanel: showBottlePanel_d,
      bhToolXY: bhToolXY_d, bhCableK: bhCableK_d, bhChamberFill: bhChamberFill_d, bhPortGlow: bhPortGlow_d, bhInflow: bhInflow_d,
      bhCsToolXY: bhCsToolXY_d, bhCsCableK: bhCsCableK_d, bhCsChamberFill: bhCsChamberFill_d, bhCsPortGlow: bhCsPortGlow_d,
      bhCsChipLine: bhCsChipLine_d, bhCsChipColor: bhCsChipColor_d,
      bhChipLine: bhChipLine_d, bhChipColor: bhChipColor_d,
      bhChambers: bhChambers_d, bhContText: bhContText_d, bhContBarW: bhContBarW_d,
      bhQualNote: bhQualNote_d, bhWasteColor: bhWasteColor_d, bhSampColor: bhSampColor_d,
      bhWasteBg: bhWasteBg_d, bhSampBg: bhSampBg_d, bhWasteStyle: bhWasteStyle_d, bhSampStyle: bhSampStyle_d,
      bhPathNodes: bhPathNodes_d, bhAnzWave: bhAnzWave_d, bhAnzWave2: bhAnzWave2_d,
      bhAnzWaveStyle: bhAnzWaveStyle_d, bhAnzStroke: bhAnzStroke_d, bhSampSub: bhSampSub_d,
      bhModeText: bhModeText_d, bhModeColor: bhModeColor_d, bhModeBg: bhModeBg_d, bhModeBorder: bhModeBorder_d,
      bhRouteText: bhRouteText_d, bhRouteColor: bhRouteColor_d, bhLogRows: bhLogRows_d, bhProbeNote: bhProbeNote_d,
      bhBtnText: _cased_d ? bhCsBtnText_d : bhBtnText_d, bhBtnStyle: bhBtnStyle_d, bhBtnAction: bhBtnAction_d,
      bhCsIntake: bhCsIntake_d, bhCsCalloutXY: bhCsCalloutXY_d,
      bhCsInletFlow: bhCsIntake_d + (ph_d === 'fill' ? ' animation:streamflow calc(1.1s * var(--pm, 1)) linear infinite; will-change:stroke-dashoffset;' : ''),
      bhCsBigFill: bhCsBigFill_d, bhCsBarW: bhCsBarW_d, bhCsFillText: bhCsFillText_d, bhLabBtnText: _cased_d ? 'Move Sample to Lab \u2192' : 'Move Samples to Lab \u2192',
      m01Title: ap_d === 'bottomhole' ? (this.state.bhMode === 'cased' ? 'Bottom-Hole Sampling \u2014 Cased Hole' : 'Bottom-Hole Sampling \u2014 Open Hole') : ap_d === 'wellhead' ? 'Wellhead Sampling' : ap_d === 'separator' ? 'Separator Sampling' : 'Field Sampling Schematic',
      // one header for the overview and all four sampling pages: same height, padding and button row
      m01HeadStyle: 'position:relative; z-index:5; flex:0 0 62px; height:62px; box-sizing:border-box; display:flex; align-items:center; gap:20px; border-bottom:1px solid var(--line); background:var(--rail); padding:0 22px; min-width:0;',
      m01BtnColStyle: 'flex:0 0 auto; min-width:0; display:flex; flex-direction:row; align-items:center; justify-content:flex-end; gap:10px;',
      bhQualText: bhQualText_d, bhQualColor: bhQualColor_d, bhFlowColor: bhFlowColor_d,
      bhFlowStyle: bhFlowStyle_d, bhPumpSpin: bhPumpSpin_d, bhProbeStyle: bhProbeStyle_d,
      bhProbeCutStyle: bhProbeCutStyle_d, bhProbeCutStyleR: bhProbeCutStyleR_d, bhProbeCutStyleL: bhProbeCutStyleL_d, bhProbeStyleL: bhProbeStyleL_d, bhInvadeStyle: bhInvadeStyle_d,
      bhProbeText: bhProbeText_d, bhProbeColor: bhProbeColor_d,
      bhActiveChText: bhActiveChText_d, bhChFilledText: bhChFilledText_d, bhCutNote: bhCutNote_d,
      bhToolStatus: _cased_d ? bhCsStage_d : bhToolStatus_d,
      bhStatusColor: csIdle_d ? 'var(--grn)' : bhStatusColor_d,
      bhProgStyle: csIdle_d ? 'height:100%; width:60%; border-radius:3px; background:linear-gradient(90deg,#2f6fd0,#5fb0ff); transition:width calc(1.2s * var(--pm, 1)) ease;' : bhProgStyle_d,
      bhPhaseNote: _cased_d ? bhCsNote_d : bhPhaseNote_d,
      bhFlow: bhSteps_d,
      bhDepthText: csIdle_d ? '8,450' : bhDepthText_d,
      bhSampleDepthText: (csIdle_d || bhHasSample_d || ph_d === 'acq') ? '8,450' : '0',
      bhSampleDepthColor: (csIdle_d || bhHasSample_d || ph_d === 'acq') ? 'var(--accb)' : 'var(--mut)',
      bhPText: csIdle_d ? '4,820' : bhPText_d,
      bhTText: csIdle_d ? '238' : bhTText_d,
      bhSampleStatus: _cased_d ? bhCsSampleText_d : bhSampleStatus_d,
      bhSampleColor: _cased_d ? bhCsSampleColor_d : bhSampleColor_d,
      bhLabelStroke: ap_d === 'bottomhole' ? stBlue_d : stGrey_d,
      bhSampleFlow: toolDown_d,
      bhOpenScene: (ap_d === 'bottomhole') && this.state.bhMode !== 'cased',
      bhCasedScene: (ap_d === 'bottomhole') && this.state.bhMode === 'cased',
      mbOpenHole: mbtn_d(this.state.bhMode !== 'cased'), mbCasedHole: mbtn_d(this.state.bhMode === 'cased'),
      selOpenHole: () => { if (this.state.bhMode !== 'open') this.setState({ bhMode: 'open', phase: 'idle' }); },
      selCasedHole: () => { if (this.state.bhMode !== 'cased') this.setState({ bhMode: 'cased', phase: 'idle' }); },
      whLabelStroke: ap_d === 'wellhead' ? stBlue_d : stGrey_d,
      sepLabelStroke: ap_d === 'separator' ? stBlue_d : stGrey_d,
      toolStyle: toolStyle_d, acqFillStyle: acqFillStyle_d, bottleFillStyle: bottleFillStyle_d,
      whMechSampleStyle: whMechSampleStyle_d, whMechPistonStyle: whMechPistonStyle_d,
      whBottlePressureText: mechPressureText_d, whBottleStatusLine: mechStatusText_d, whBottleStatusColor: bottleStatusColor_d,
      showBhBottle: false,
      showWhBottle: ap_d === 'wellhead' && (ph_d === 'connect' || ph_d === 'xfer' || ph_d === 'done'),
      showSepBottle: ap_d === 'separator' && (ph_d === 'connect' || ph_d === 'xfer' || ph_d === 'done'),
      showWhStream: ap_d === 'wellhead' && ph_d === 'xfer',
      showSepStream: ap_d === 'separator' && ph_d === 'xfer',
      statusBg: sample_d.ok ? 'rgba(70,211,154,.10)' : 'rgba(231,177,90,.10)',
      statusBorder: sample_d.ok ? 'rgba(70,211,154,.35)' : 'rgba(231,177,90,.35)',
      statusColor: sample_d.ok ? 'var(--grn)' : 'var(--amb)',
      stages: stages_d, sampleFillStyle: sampleFillStyle_d, pistonStyle: pistonStyle_d, pistonLabelStyle: pistonLabelStyle_d, inflowStyle: inflowStyle_d, needleStyle: needleStyle_d, mechPressureText: mechPressureText_d,
      mechStatusText: mechStatusText_d, connectText: connectText_d, connectIcon: connectIcon_d, pressurized: pressurized_d,
      pillColor: pillColor_d, pillBg: pillBg_d, pillBorder: pillBorder_d, bottleStatusShort: bottleStatusShort_d, bottleStatusColor: bottleStatusColor_d,
      showAbout: scr === 'about',
      abTabs: this.aboutTabs(),
      abIsModules: (this.state.aboutTab || 'modules') === 'modules',
      abIsHow: this.state.aboutTab === 'how',
      abIsEvo: this.state.aboutTab === 'evo',
      abIsPaths: this.state.aboutTab === 'paths',
      showSettings: scr === 'settings',
      goDashboard: () => this.setState({ screen: 'dashboard' }),
      goModule: () => { this.clearTimers(); this.setState({ screen: 'module01', m01View: 'overview', m01Method: null, m01Phase: 'idle', m01Pressure: 0, m01Picked: true, activePoint: 'overview', phase: 'idle', mechPressure: 0, sampleSecs: 0, nowTs: Date.now() }); if (!this.uiClock) this.uiClock = setInterval(() => this.setState({ nowTs: Date.now() }), 1000); },
      goAbout: () => this.setState({ screen: 'about' }),
      goSettings: () => this.setState({ screen: 'settings' }),
      showBack: !!backTo,
      backLabel: 'Back',
      backTitle: backTo ? ('Back to ' + (BACK_NAME[backTo] || 'previous screen')) : 'Back',
      goBack: () => { this.clearTimers(); if (backTo && this.viscGoUp(backTo)) return; this.setState({ screen: backTo || 'dashboard' }); },
      navDashStyle: (scr === 'dashboard') ? navActive : navIdle,
      navAboutStyle: scr === 'about' ? navActive : navIdle,
      navSetStyle: scr === 'settings' ? navActive : navIdle,
    };
  }
}

DC.define('Main', {
  template: `<div style="font-family:'IBM Plex Sans',system-ui,sans-serif; display:flex; flex-direction:column; min-height:100vh; width:100%; background:var(--bg); color:var(--txt); -webkit-font-smoothing:antialiased;">

  <!-- ============ TOP BAR ============ -->
  <sc-slot name="showTopBar"></sc-slot>

  <!-- ============ MAIN ============ -->
  <main style="flex:1; min-width:0; display:flex; flex-direction:column;">

    <!-- ===== SPLASH / OPENING SCREEN ===== -->
    <sc-slot name="showSplash"></sc-slot>

    <!-- ===== DASHBOARD SCREEN ===== -->
    <sc-slot name="showDash"></sc-slot>


<!-- ===== VALIDATION LANDING SCREEN ===== -->
    <sc-slot name="showValidation"></sc-slot>

    <!-- ===== PVT ANALYSIS CONTROL CENTRE ===== -->
    <sc-slot name="showAnalysis"></sc-slot>

    <!-- ===== DIFFERENTIAL LIBERATION ===== -->
    <sc-slot name="showDiffLib"></sc-slot>

    <!-- ===== SEPARATOR TEST ===== -->
    <sc-slot name="showSeparator"></sc-slot>

    <!-- ===== GC \\u2014 GAS CHROMATOGRAPHY ===== -->
    <sc-slot name="showGC"></sc-slot>

    <!-- ===== PVT ANALYSIS TEST PLACEHOLDER ===== -->
    <!-- ===== VISCOSITY ===== -->
    <sc-slot name="showVisc"></sc-slot>
    <sc-slot name="showViscMenu"></sc-slot>
    <sc-slot name="showViscTest"></sc-slot>

    <sc-slot name="showAnaTest"></sc-slot>

<!-- ===== MODULE 01 SCREEN ===== -->
    <sc-slot name="showModule01"></sc-slot>



    <!-- ===== MODULE 01b SCREEN — BOTTOM HOLE SAMPLE TRANSFER (SPMC chamber -> SPS/PDS) ===== -->
    <sc-slot name="showXfer"></sc-slot>

    <!-- ===== MODULE 02 SCREEN — QUALITY CHECK (QC) ===== -->
    <sc-slot name="showRestore"></sc-slot>

    <!-- ===== MODULE 05 SCREEN — PVT CALCULATOR (embedded) ===== -->
    <sc-slot name="showCalc"></sc-slot>

    <!-- ===== MODULE 03 SCREEN — PVT TESTING + GC ===== -->
    <sc-slot name="showTest"></sc-slot>

    <!-- ===== PV TEST SCREEN ===== -->
    <sc-slot name="showPvTest"></sc-slot>

    <!-- ===== DIRECT DENSITY SCREEN ===== -->
    <sc-slot name="showDensity"></sc-slot>

    <!-- ===== RECOMBINATION SCREEN (Validation) ===== -->
    <sc-slot name="showRecomb"></sc-slot>

    <!-- ===== MODULE 04 SCREEN — REPORT ===== -->
    <sc-slot name="showReport"></sc-slot>


    <!-- ===== ABOUT SCREEN ===== -->
    <sc-slot name="showAbout"></sc-slot>

    <!-- ===== SETTINGS SCREEN ===== -->
    <sc-slot name="showSettings"></sc-slot>

  </main>
</div>`,
  logic: Component
});
})();
