/* PVT Cell prototype — preview controls, presets and the movement clock.
   All drawing is in pvt-cell.js (PVTCell) and plumbing.js (PVTPlumb); this file only changes the state. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var CELL = PVTCell.mount($('stage'));

  /* ---- timing: one full demonstration movement = MOVE seconds */
  var MOVE = 8.5, VALVE = 1.2, PORT = 2.4, CONNECT = 3.2, COND = 6;

  /* ---- existing simulator values used by the presets (not calculated here)
     PV: StagePVTest.js (Validation PV, 30 cc charge) — illustrative project dataset:
         above Psat V = 30.0 + (5000 - P) * 1.3 / 2300, below Psat V = 31.3 + 0.003 * (2700 - P)
     Charge (Main.js charge stages): cell vacuum -15 psig, transfer pump 100 -> 98 (line) -> 95 (2 cc dead space,
         equalized at 5,000 psig) -> 18 mL (80 cc into Pump A); bottle sample 450 cc at the 800 cc drawing scale
         (Main.js bottleModel: OIL0 450, CC 800 — a drawing scale, not a verified bottle capacity)
     Flash : 50 cc from Pump A (showTest.js)      Temperature 114 °C (Main.js reservoir temperature)
     Cylinder scale 100 cc each: existing simulator capacity (RecombSim CFG.CELL_CAP, StagePVTest PUMP_CAP),
         not a verified equipment specification                                                         */
  var PV = function (p) { return p >= 2700 ? 30.0 + (5000 - p) * 1.3 / 2300 : 31.3 + 0.003 * (2700 - p); };
  var PSAT = 2700, T_RES = 114, CAP = 100;
  var GAS_ILLUS = 0.18;   // gas share of the chamber in the illustrative two-phase state (NOT calculated)

  var BASE = { vA: 0, vB: 0, cap: CAP, P: 0, T: T_RES, valveA: 0, valveB: 0, connL: 0, connR: 0, plugL: 1, plugR: 1,
    cellValve: 0, Pext: 0, gas: 0, hdr: 0, tfL: 0, tfR: 0, btlValve: 0, btlV: 450, btlDraw: 800, tpV: 100, rcvV: 0, flow: null };
  var S = {}, preset = null;

  /* ---- movement queue: each step tweens numeric keys; pausing freezes the clock */
  var Q = [], cur = null, paused = false, clock = 0, last = performance.now();
  var ease = function (p) { return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
  function step(label, dur, to, o) { return Object.assign({ label: label, dur: dur, to: to || {} }, o || {}); }
  function run(steps, keep) {
    if (!keep) { Q = []; finishCur(true); }
    Q = Q.concat(steps);
  }
  function finishCur(stopHere) {
    if (!cur) return;
    if (!stopHere) Object.assign(S, cur.to);
    S.flow = null; cur = null;
  }
  function advance(dt) {
    if (paused) return;
    clock += dt;
    if (!cur && Q.length) {
      cur = Q.shift(); cur.t = 0; cur.from = {};
      var bad = cur.check && cur.check();
      if (bad) { note(bad, true); Q = []; cur = null; }
      else { Object.keys(cur.to).forEach(function (k) { cur.from[k] = S[k]; }); S.flow = cur.flow || null; if (cur.start) cur.start(); }
    }
    if (cur) {
      cur.t += dt;
      var p = cur.dur > 0 ? Math.min(1, cur.t / cur.dur) : 1, e = ease(p);
      Object.keys(cur.to).forEach(function (k) { S[k] = cur.from[k] + (cur.to[k] - cur.from[k]) * e; });
      if (cur.during) cur.during(e);
      if (p >= 1) { var done = cur; finishCur(false); if (done.end) done.end(); }
    }
    // Port L side of the Cell Valve (rear line + external tubing): follows the header while the Cell Valve is open,
    // holds its own pressure while it is closed
    if (S.cellValve >= .5) S.Pext = S.P;
  }
  function frame(now) {
    advance(Math.min(.1, (now - last) / 1000)); last = now;
    CELL.update(S, clock);
    panel();
    requestAnimationFrame(frame);
  }

  /* ---- checks (a movement only runs through an open, connected path; ports open only at 0 psig) */
  // pressure seen at a port: Port R is always on the header; Port L only through the Cell Valve
  var portP = function (k) { return k === 'L' && S.cellValve < .5 ? S.Pext : S.P; };
  var zeroAt = function (k) { return Math.abs(portP(k)) < .5; };
  var openPort = function () { return ['L', 'R'].filter(function (k) { return S['plug' + k] < .5 && S['conn' + k] < 1 && (k === 'R' || S.cellValve >= .5); })[0]; };
  var need = {
    AB: function () { return S.valveA > .98 && S.valveB > .98 ? '' : 'Open both cylinder valves first (Pump B and Pump A).'; },
    A: function () { return S.valveA > .98 ? '' : 'Open the Pump A valve first.'; },
    L: function () { return S.connL >= 1 ? '' : 'Connect the tubing at Port L first.'; },
    R: function () { return S.connR >= 1 ? '' : 'Connect the tubing at Port R first.'; },
    BTL: function () { return S.btlValve > .98 ? '' : 'Open the bottle valve first.'; },
    CV: function () { return S.cellValve > .98 ? '' : 'Open the Cell Valve first.'; },
    sealed: function () { var k = openPort(); return k ? 'Port ' + k + ' is open to the header. ' + (k === 'L' ? 'Close the Cell Valve or fit' : 'Fit') + ' its rated plug or tubing before changing the pressure.' : ''; },
    cvOpenOk: function () { return S.connL < 1 && S.plugL < .5 && Math.abs(S.P) >= .5 ? 'Port L is open. Fit its rated plug or tubing before opening the Cell Valve to a pressurised header.' : ''; }
  };
  function all() { var f = [].slice.call(arguments); return function () { for (var i = 0; i < f.length; i++) { var m = f[i](); if (m) return m; } return ''; }; }

  /* ---- elementary movements */
  function mValve(k, open) {
    var to = {}; to['valve' + k] = open ? 1 : 0;
    return step((open ? 'Open' : 'Close') + ' Pump ' + k + ' valve', VALVE, to);
  }
  function mBtlValve(open) { return step((open ? 'Open' : 'Close') + ' bottle valve', VALVE, { btlValve: open ? 1 : 0 }, { check: open ? need.L : null }); }
  function mCellValve(open) { return step((open ? 'Open' : 'Close') + ' Cell Valve (valve 3, rear)', VALVE, { cellValve: open ? 1 : 0 }, { check: open ? need.cvOpenOk : null }); }
  function mVentL() {
    return step('Release pressure from the isolated Port L line (Cell Valve closed; release route not drawn)', COND, { Pext: 0 },
      { check: function () { return S.cellValve < .5 ? '' : 'Close the Cell Valve first, so the cell stays pressurised.'; } });
  }
  // port changes: the plug comes off or the tubing comes away only at 0 psig
  function mUnplug(k) {
    var to = {}; to['plug' + k] = 0;
    return step('Remove the rated plug from Port ' + k + ' (0 psig)', PORT, to, { check: function () { return zeroAt(k) ? '' : 'Port ' + k + ' is under pressure. ' + (k === 'L' ? 'Close the Cell Valve and vent the Port L line' : 'Vent the header') + ' to 0 psig first.'; } });
  }
  function mPlug(k) { var to = {}; to['plug' + k] = 1; return step('Fit the rated plug to Port ' + k, PORT, to); }
  function mConn(k, on) {
    var to = {}; to['conn' + k] = on ? 1 : 0;
    var s = step((on ? 'Connect' : 'Disconnect') + ' external tubing at Port ' + k, CONNECT, to);
    if (on) s.check = function () { return S['plug' + k] >= .5 ? 'Remove the Port ' + k + ' plug first.' : ''; };
    else {
      s.check = function () {
        if (k === 'L' && (S.btlValve > .02 || S.cellValve > .02)) return 'Close the Cell Valve and the bottle valve before disconnecting.';
        if (!zeroAt(k)) return 'Port ' + k + ' is under pressure. ' + (k === 'L' ? 'Release the isolated Port L line' : 'Vent the header') + ' to 0 psig before disconnecting.';
        return '';
      };
      s.end = function () { S['tf' + k] = 0; };
    }
    return s;
  }
  // target a port state: 'plug' | 'open' | 'tube' (always passes through the open state)
  function toPort(k, want) {
    var steps = [], conn = S['conn' + k] >= .5, plug = S['plug' + k] >= .5;
    if (want === 'tube') { if (conn) return []; if (plug) steps.push(mUnplug(k)); steps.push(mConn(k, true)); }
    if (want === 'open') { if (conn) steps.push(mConn(k, false)); else if (plug) steps.push(mUnplug(k)); }
    if (want === 'plug') { if (plug && !conn) return []; if (conn) steps.push(mConn(k, false)); steps.push(mPlug(k)); }
    return steps;
  }
  function mTransfer(dir) {
    return step('Transfer ' + (dir === 'A2B' ? 'A → B' : 'B → A'), MOVE, {}, {
      flow: dir, check: need.AB,
      start: function () {
        var from = dir === 'A2B' ? 'vA' : 'vB', to = dir === 'A2B' ? 'vB' : 'vA';
        var dv = Math.min(S[from], S.cap - S[to]);   // never above the receiving cylinder's scale
        this.to = {}; this.to[from] = S[from] - dv; this.to[to] = S[to] + dv;
        this.from = {}; this.from[from] = S[from]; this.from[to] = S[to];
      },
      during: function () {  // fixed-condition demonstration: total sample volume preserved exactly
        var tot = this.from.vA + this.from.vB; if (dir === 'A2B') S.vA = tot - S.vB; else S.vB = tot - S.vA;
      }
    });
  }
  function mVol(k, dv) {
    return step('Pump ' + k + ' piston ' + (dv > 0 ? 'down (+' : 'up (') + dv + ' cc)', MOVE, {}, {
      start: function () { var key = 'v' + k; this.to = {}; this.to[key] = Math.max(0, Math.min(S.cap, S[key] + dv)); this.from = {}; this.from[key] = S[key]; }
    });
  }
  function mCond(key, d, abs) {
    var lim = key === 'P' ? [-15, 10000] : [20, 200];
    return step(key === 'P' ? (abs != null ? (abs === 0 ? 'Vent the header to 0 psig' : 'Header to ' + abs.toLocaleString('en-US') + ' psig') : 'Pressure ' + (d > 0 ? '+' : '') + d + ' psi') : 'Temperature ' + (d > 0 ? '+' : '') + d + ' °C', COND, {}, {
      check: key === 'P' ? function () { return abs === 0 ? '' : need.sealed(); } : null,
      start: function () { this.to = {}; this.to[key] = abs != null ? abs : Math.max(lim[0], Math.min(lim[1], S[key] + d)); this.from = {}; this.from[key] = S[key]; }
    });
  }
  function mPhase(two) { return step(two ? 'Illustrative two-phase state' : 'Single-phase liquid', MOVE, { gas: two ? GAS_ILLUS : 0 }); }
  function wait(s, label) { return step(label || 'Hold', s, {}); }
  // plumbing check: the four valve states, held long enough to read the plumbing view
  function valvesTo(a, b, label) {
    var out = [];
    if ((S.__a == null ? S.valveA >= .5 : S.__a) !== a) out.push(mValve('A', a));
    if ((S.__b == null ? S.valveB >= .5 : S.__b) !== b) out.push(mValve('B', b));
    S.__a = a; S.__b = b;
    return out.concat([wait(2.6, label)]);
  }
  function fourStates() {
    S.__a = null; S.__b = null;
    var s = [].concat(valvesTo(false, false, 'Both closed: header, sensor and both ports form one volume; A and B isolated'),
      valvesTo(true, false, 'Only A open: Pump A joins the header; Pump B isolated'),
      valvesTo(false, true, 'Only B open: Pump B joins the header; Pump A isolated'),
      valvesTo(true, true, 'Both open: A, B, header and sensor connected'));
    S.__a = S.__b = null;
    return s;
  }

  /* ---- presets: same cell; only attached equipment, tubing, valves and readings change */
  var PRESETS = {
    charge: {
      name: 'Charge', desc: 'SPS/PDS bottle (driven by the transfer pump) → Port L → Cell Valve (rear) → header → Pump A. After charging, the Cell Valve isolates the line, the line is released and the bottle is disconnected; the cell stays pressurised. Values are temporary preview values.',
      init: { P: 0, T: T_RES },
      seq: function () {
        return [
          mUnplug('L'), mConn('L', true), mCellValve(true),
          step('Vacuum the cell to −15 psig (vacuum source not drawn)', COND, { P: -15 }, { check: need.sealed }),
          mBtlValve(true),
          step('Fill the charge line (transfer pump 100.0 → 98.0 mL)', 3, { tpV: 98, btlV: 448, tfL: 1 }, { flow: 'L2A', check: all(need.BTL, need.CV) }),
          step('Equalize with the bottle: dead space 2.0 cc, header −15 → 5,000 psig', COND, { P: 5000, hdr: 1, tpV: 95, btlV: 445 }, { check: all(need.BTL, need.CV) }),
          mValve('A', true),
          step('Charge 80 cc into Pump A — piston moves down (pump 95.0 → 18.0 mL)', MOVE, { vA: 80, tpV: 18, btlV: 368 }, { flow: 'L2A', check: all(need.A, need.L, need.BTL, need.CV) }),
          mValve('A', false), mCellValve(false), mBtlValve(false),
          mVentL(), mConn('L', false), mPlug('L')
        ];
      }
    },
    pv: {
      name: 'Closed-cell PV', desc: 'Ports fitted with rated plugs; Pump A valve open to the pressure sensor. Pressure/volume points from the Validation PV dataset (StagePVTest).',
      init: { vA: PV(5000), P: 5000, T: T_RES, valveA: 1, hdr: 1 },
      seq: function () {
        var out = [];
        [4000, 3000, 2500, 2000].forEach(function (p) {
          out.push(step('Expand to ' + p.toLocaleString('en-US') + ' psig · ' + PV(p).toFixed(2) + ' cc', MOVE,
            { P: p, vA: PV(p), gas: p < PSAT ? (PSAT - p) / 700 * GAS_ILLUS : 0 }));
          out.push(wait(1.2, 'Read P and V'));
        });
        return out;
      }
    },
    agit: {
      name: 'A ↔ B agitation', desc: 'Ports plugged at 5,000 psig. Both cylinder valves open; 80 cc moved A → B and back at constant total volume (Charge agitation).',
      init: { vA: 80, P: 5000, T: T_RES, hdr: 1 },
      seq: function () { return [mValve('B', true), mValve('A', true), mTransfer('A2B'), wait(1, 'Hold'), mTransfer('B2A'), mValve('A', false), mValve('B', false)]; }
    },
    xfer: {
      name: 'Transfer out', desc: 'Header vented to 0 psig with Pump A isolated. Port R plug removed and tubing fitted at 0 psig, then 50 cc from Pump A (as in Flash). Receiver is a generic placeholder.',
      init: { vA: 80, P: 0, T: T_RES, hdr: 1 },
      seq: function () {
        return [mUnplug('R'), mConn('R', true), mValve('A', true),
          step('Header equalizes with Pump A at 5,000 psig', COND, { P: 5000 }, { check: all(need.A, need.sealed) }),
          step('Transfer 50 cc from Pump A — piston moves up', MOVE, { vA: 30, rcvV: 50, tfR: 1 }, { flow: 'A2R', check: all(need.A, need.R) }),
          mValve('A', false)];
      }
    },
    two: {
      name: 'Two-phase sample', desc: 'Ports plugged. Pump A expanded to 2,000 psig (below the 2,700 psig PV Psat). Gas share and bubbles are illustrative, not calculated.',
      init: { vA: PV(3000), P: 3000, T: T_RES, valveA: 1, hdr: 1 },
      seq: function () { return [step('Expand to 2,000 psig · ' + PV(2000).toFixed(2) + ' cc — gas appears (illustrative)', MOVE, { P: 2000, vA: PV(2000), gas: GAS_ILLUS })]; }
    },
    plumb: {
      name: 'Valve states', desc: 'The four cylinder-valve states in turn (both closed, only A, only B, both open). Best read in the Plumbing view. Arrangement inferred from existing simulator code.',
      init: { vA: 80, vB: 0, P: 5000, T: T_RES, hdr: 1 },
      seq: function () { return fourStates(); }
    }
  };

  function load(key) {
    preset = key;
    Q = []; cur = null; paused = false;
    S = Object.assign({}, BASE, key ? PRESETS[key].init : { vA: 80, P: 5000, hdr: 1 });
    if (key) run(PRESETS[key].seq());
    $('presetDesc').textContent = key ? PRESETS[key].desc : 'Free demonstration: Pump A holds 80 cc, header at 5,000 psig, both ports plugged. Use the controls below.';
    document.querySelectorAll('#presetSeg button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === (key || 'free')); });
    note('');
  }

  /* ---- panel */
  var msgT = 0;
  function note(m, warn) { var e = $('msg'); e.textContent = m; e.classList.toggle('warn', !!warn); msgT = performance.now(); }
  var fmt = function (v, d) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  function vtxt(o) { return o >= .5 ? 'Open' : 'Closed'; }
  function portState(k) { return S['conn' + k] >= .5 ? 'tube' : S['plug' + k] >= .5 ? 'plug' : 'open'; }
  function panel() {
    $('rP').textContent = fmt(Math.round(S.P), 0);
    $('rT').textContent = fmt(S.T, 1);
    $('rA').textContent = fmt(S.vA, 1);
    $('rB').textContent = fmt(S.vB, 1);
    $('rS').textContent = fmt(S.vA + S.vB, 1);
    $('rPh').textContent = S.gas > .005 ? 'Two-phase (illustrative)' : 'Single-phase liquid';
    $('btnVB').textContent = 'Pump B · ' + vtxt(S.valveB);
    $('btnVA').textContent = 'Pump A · ' + vtxt(S.valveA);
    $('btnVB').classList.toggle('on', S.valveB >= .5); $('btnVA').classList.toggle('on', S.valveA >= .5);
    ['L', 'R'].forEach(function (k) { var st = portState(k); document.querySelectorAll('#port' + k + ' button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === st); }); });
    $('btnBV').textContent = 'Bottle valve · ' + vtxt(S.btlValve);
    $('btnCV').textContent = 'Cell · ' + vtxt(S.cellValve);
    $('btnBV').disabled = $('btnVent').disabled = S.connL < 1;
    $('btnBV').classList.toggle('on', S.btlValve >= .5); $('btnCV').classList.toggle('on', S.cellValve >= .5);
    $('ph1').classList.toggle('on', S.gas <= .005); $('ph2').classList.toggle('on', S.gas > .005);
    $('btnPause').textContent = paused ? 'Resume' : 'Pause';
    $('btnPause').classList.toggle('on', paused);
    var lab = cur ? cur.label : (Q.length ? 'Waiting…' : 'Idle'), pr = cur && cur.dur ? Math.min(1, cur.t / cur.dur) : 0;
    $('act').textContent = (paused ? 'Paused · ' : '') + lab;
    $('bar').style.width = (pr * 100).toFixed(1) + '%';
    if ($('msg').textContent && performance.now() - msgT > 6000) note('');
  }

  /* ---- wiring */
  function on(id, f) { $(id).addEventListener('click', f); }
  document.querySelectorAll('#presetSeg button').forEach(function (b) { b.addEventListener('click', function () { load(b.dataset.v === 'free' ? null : b.dataset.v); }); });
  on('btnVB', function () { run([mValve('B', S.valveB < .5)]); });
  on('btnVA', function () { run([mValve('A', S.valveA < .5)]); });
  on('aUp', function () { run([mVol('A', -10)]); }); on('aDn', function () { run([mVol('A', 10)]); });
  on('bUp', function () { run([mVol('B', -10)]); }); on('bDn', function () { run([mVol('B', 10)]); });
  on('xAB', function () { run([mTransfer('A2B')]); }); on('xBA', function () { run([mTransfer('B2A')]); });
  on('pDn', function () { run([mCond('P', -500)]); }); on('pUp', function () { run([mCond('P', 500)]); });
  on('pVent', function () { run([mCond('P', 0, 0)]); });
  on('tDn', function () { run([mCond('T', -10)]); }); on('tUp', function () { run([mCond('T', 10)]); });
  on('ph1', function () { run([mPhase(false)]); }); on('ph2', function () { run([mPhase(true)]); });
  ['L', 'R'].forEach(function (k) {
    document.querySelectorAll('#port' + k + ' button').forEach(function (b) { b.addEventListener('click', function () { run(toPort(k, b.dataset.v)); }); });
  });
  on('btnBV', function () { run([mBtlValve(S.btlValve < .5)]); });
  on('btnCV', function () { run([mCellValve(S.cellValve < .5)]); });
  on('btnVent', function () { run([mVentL()]); });
  document.querySelectorAll('#vstates button').forEach(function (b) {
    b.addEventListener('click', function () { run([mValve('A', b.dataset.a === '1'), mValve('B', b.dataset.b === '1')]); });
  });
  on('btnFour', function () { load('plumb'); setView('plumbing'); });
  on('btnPause', function () { paused = !paused; });
  on('btnReset', function () { load(preset); });
  function setView(v) {
    CELL.setView(v);
    document.querySelectorAll('#viewSeg button').forEach(function (x) { x.classList.toggle('on', x.dataset.v === v); });
  }
  document.querySelectorAll('#viewSeg button').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.v); }); });
  $('lblChk').addEventListener('change', function (e) { CELL.setLabels(e.target.checked); });

  // review links: ?view=cutaway|plumbing&preset=charge&labels=0&t=12 (t: fast-forward seconds, for screenshots)
  var qs = new URLSearchParams(location.search);
  load(PRESETS[qs.get('preset')] ? qs.get('preset') : null);
  if (qs.get('view') === 'cutaway' || qs.get('view') === 'plumbing') setView(qs.get('view'));
  if (qs.get('labels') === '0') { $('lblChk').checked = false; CELL.setLabels(false); }
  var ff = +qs.get('t') || 0;
  for (var i = 0; i < Math.round(ff / .05); i++) advance(.05);
  requestAnimationFrame(function (t) { last = t; frame(t); });
})();
