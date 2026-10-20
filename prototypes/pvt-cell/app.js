/* PVT Cell prototype — preview controls, presets and the movement clock.
   All drawing is in pvt-cell.js (PVTCell); this file only changes the state. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var CELL = PVTCell.mount($('stage'));

  /* ---- timing: one full demonstration movement = MOVE seconds */
  var MOVE = 8.5, VALVE = 2.4, CONNECT = 3.2, COND = 6;

  /* ---- project values used by the presets (not calculated here)
     PV: StagePVTest.js (Validation PV, 30 cc charge) — illustrative project dataset:
         above Psat V = 30.0 + (5000 - P) * 1.3 / 2300, below Psat V = 31.3 + 0.003 * (2700 - P)
     Charge: 80 cc into Pump A at 5,000 psi (showTest.js / Main.js), agitation A <-> B 80 cc
     Flash : 50 cc from Pump A (showTest.js)      Temperature 114 °C (Main.js reservoir temperature)
     Capacity 100 cc per cylinder (RecombSim CFG.CELL_CAP, StagePVTest PUMP_CAP)            */
  var PV = function (p) { return p >= 2700 ? 30.0 + (5000 - p) * 1.3 / 2300 : 31.3 + 0.003 * (2700 - p); };
  var PSAT = 2700, T_RES = 114, CAP = 100;
  var GAS_ILLUS = 0.18;   // gas share of the chamber in the illustrative two-phase state (NOT calculated)

  var BASE = { vA: 0, vB: 0, cap: CAP, P: 0, T: T_RES, valveA: 0, valveB: 0, connL: 0, connR: 0, gas: 0, hdr: 0,
    tfL: 0, tfR: 0, btlValve: 0, btlV: 200, btlCap: 275, rcvV: 0, flow: null };
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
    if (!paused) {
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
    }
  }
  function frame(now) {
    advance(Math.min(.1, (now - last) / 1000)); last = now;
    CELL.update(S, clock);
    panel();
    requestAnimationFrame(frame);
  }

  /* ---- checks (a movement only runs through an open, connected path) */
  var need = {
    AB: function () { return S.valveA > .98 && S.valveB > .98 ? '' : 'Open both cylinder valves first (Pump B and Pump A).'; },
    A: function () { return S.valveA > .98 ? '' : 'Open the Pump A valve first.'; },
    L: function () { return S.connL >= 1 ? '' : 'Connect the tubing at Port L first.'; },
    R: function () { return S.connR >= 1 ? '' : 'Connect the tubing at Port R first.'; },
    BTL: function () { return S.btlValve > .98 ? '' : 'Open the bottle valve first.'; }
  };
  function all() { var f = [].slice.call(arguments); return function () { for (var i = 0; i < f.length; i++) { var m = f[i](); if (m) return m; } return ''; }; }

  /* ---- elementary movements */
  function mValve(k, open) { return step((open ? 'Open' : 'Close') + ' Pump ' + k + ' valve', VALVE, (function () { var o = {}; o['valve' + k] = open ? 1 : 0; return o; })()); }
  function mBtlValve(open) { return step((open ? 'Open' : 'Close') + ' bottle valve', VALVE, { btlValve: open ? 1 : 0 }, { check: open ? need.L : null }); }
  function mConn(k, on) {
    var to = {}; to['conn' + k] = on ? 1 : 0;
    var s = step((on ? 'Connect' : 'Disconnect') + ' external tubing at Port ' + k, CONNECT, to);
    if (!on) { s.check = function () { return (k === 'L' && S.btlValve > .02) ? 'Close the bottle valve before disconnecting.' : ''; }; s.end = function () { S['tf' + k] = 0; }; }
    return s;
  }
  function mTransfer(dir) {
    return step('Transfer ' + (dir === 'A2B' ? 'A → B' : 'B → A'), MOVE, {}, {
      flow: dir, check: need.AB,
      start: function () {
        var from = dir === 'A2B' ? 'vA' : 'vB', to = dir === 'A2B' ? 'vB' : 'vA';
        var dv = Math.min(S[from], S.cap - S[to]);   // never above the receiving cylinder's capacity
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
  function mCond(key, d) {
    var lim = key === 'P' ? [0, 10000] : [20, 200];
    return step((key === 'P' ? 'Pressure ' : 'Temperature ') + (d > 0 ? '+' : '') + d + (key === 'P' ? ' psi' : ' °C'), COND, {}, {
      start: function () { this.to = {}; this.to[key] = Math.max(lim[0], Math.min(lim[1], S[key] + d)); this.from = {}; this.from[key] = S[key]; }
    });
  }
  function mPhase(two) { return step(two ? 'Illustrative two-phase state' : 'Single-phase liquid', MOVE, { gas: two ? GAS_ILLUS : 0 }); }
  function wait(s, label) { return step(label || 'Hold', s, {}); }

  /* ---- presets: same cell; only attached equipment, tubing, valves and readings change */
  var PRESETS = {
    charge: {
      name: 'Charge', desc: '80 cc charged from the SPS/PDS sample bottle into Pump A through Port L at 5,000 psi.',
      init: { P: 0, T: T_RES },
      seq: function () {
        return [
          mConn('L', true), mBtlValve(true),
          step('Pressurise the line to 5,000 psi (transfer pump not drawn)', COND, { P: 5000, hdr: 1, tfL: 1 }, { check: need.BTL }),
          mValve('A', true),
          step('Charge 80 cc into Pump A — piston moves down', MOVE, { vA: 80, btlV: 120 }, { flow: 'L2A', check: all(need.A, need.L, need.BTL) }),
          mValve('A', false), mBtlValve(false)
        ];
      }
    },
    pv: {
      name: 'Closed-cell PV', desc: 'Ports capped, Pump A valve open to the pressure sensor. Pressure/volume points from the Validation PV dataset (StagePVTest).',
      init: { vA: PV(5000), P: 5000, T: T_RES, valveA: 1, hdr: 1 },
      seq: function () {
        var pts = [4000, 3000, 2500, 2000], out = [];
        pts.forEach(function (p) {
          out.push(step('Expand to ' + p.toLocaleString('en-US') + ' psig · ' + PV(p).toFixed(2) + ' cc', MOVE,
            { P: p, vA: PV(p), gas: p < PSAT ? (PSAT - p) / 700 * GAS_ILLUS : 0 }));
          out.push(wait(1.2, 'Read P and V'));
        });
        return out;
      }
    },
    agit: {
      name: 'A ↔ B agitation', desc: 'Both cylinder valves open; 80 cc moved A → B and back at constant total volume (Charge agitation).',
      init: { vA: 80, P: 5000, T: T_RES, hdr: 1 },
      seq: function () { return [mValve('B', true), mValve('A', true), mTransfer('A2B'), wait(1, 'Hold'), mTransfer('B2A'), mValve('A', false), mValve('B', false)]; }
    },
    xfer: {
      name: 'Transfer out', desc: '50 cc from Pump A to external equipment through Port R (as in Flash). Receiver is a generic placeholder.',
      init: { vA: 80, P: 5000, T: T_RES, hdr: 1 },
      seq: function () {
        return [mConn('R', true), mValve('A', true),
          step('Transfer 50 cc from Pump A — piston moves up', MOVE, { vA: 30, rcvV: 50, tfR: 1 }, { flow: 'A2R', check: all(need.A, need.R) }),
          mValve('A', false)];
      }
    },
    two: {
      name: 'Two-phase sample', desc: 'Pump A at 2,000 psig (below the 2,700 psig PV Psat). Gas share and bubbles are illustrative, not calculated.',
      init: { vA: PV(3000), P: 3000, T: T_RES, valveA: 1, hdr: 1 },
      seq: function () {
        return [step('Expand to 2,000 psig · ' + PV(2000).toFixed(2) + ' cc — gas appears (illustrative)', MOVE, { P: 2000, vA: PV(2000), gas: GAS_ILLUS })];
      }
    }
  };

  function load(key) {
    preset = key;
    Q = []; cur = null; paused = false;
    S = Object.assign({}, BASE, key ? PRESETS[key].init : { vA: 80, P: 5000, hdr: 1 });
    if (key) run(PRESETS[key].seq());
    $('presetDesc').textContent = key ? PRESETS[key].desc : 'Free demonstration: Pump A holds 80 cc at 5,000 psi. Use the controls below.';
    document.querySelectorAll('#presetSeg button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === (key || 'free')); });
    note('');
  }

  /* ---- panel */
  var msgT = 0;
  function note(m, warn) { var e = $('msg'); e.textContent = m; e.classList.toggle('warn', !!warn); msgT = performance.now(); }
  var fmt = function (v, d) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  function vtxt(o) { return o > .98 ? 'Open' : o < .02 ? 'Closed' : 'Turning'; }
  function panel() {
    $('rP').textContent = fmt(Math.round(S.P), 0);
    $('rT').textContent = fmt(S.T, 1);
    $('rA').textContent = fmt(S.vA, 1);
    $('rB').textContent = fmt(S.vB, 1);
    $('rS').textContent = fmt(S.vA + S.vB, 1);
    $('rPh').textContent = S.gas > .005 ? 'Two-phase (illustrative)' : 'Single-phase liquid';
    $('btnVB').textContent = 'Pump B valve · ' + vtxt(S.valveB);
    $('btnVA').textContent = 'Pump A valve · ' + vtxt(S.valveA);
    $('btnVB').classList.toggle('on', S.valveB > .5); $('btnVA').classList.toggle('on', S.valveA > .5);
    $('btnL').textContent = 'Port L · ' + (S.connL >= 1 ? 'Connected' : S.connL > 0 ? '…' : 'Capped');
    $('btnR').textContent = 'Port R · ' + (S.connR >= 1 ? 'Connected' : S.connR > 0 ? '…' : 'Capped');
    $('btnL').classList.toggle('on', S.connL > .5); $('btnR').classList.toggle('on', S.connR > .5);
    $('btnBV').textContent = 'Bottle valve · ' + vtxt(S.btlValve);
    $('btnBV').disabled = S.connL < 1;
    $('btnBV').classList.toggle('on', S.btlValve > .5);
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
  on('tDn', function () { run([mCond('T', -10)]); }); on('tUp', function () { run([mCond('T', 10)]); });
  on('ph1', function () { run([mPhase(false)]); }); on('ph2', function () { run([mPhase(true)]); });
  on('btnL', function () { run([mConn('L', S.connL < .5)]); });
  on('btnR', function () { run([mConn('R', S.connR < .5)]); });
  on('btnBV', function () { run([mBtlValve(S.btlValve < .5)]); });
  on('btnPause', function () { paused = !paused; });
  on('btnReset', function () { load(preset); });
  document.querySelectorAll('#viewSeg button').forEach(function (b) {
    b.addEventListener('click', function () {
      CELL.setView(b.dataset.v);
      document.querySelectorAll('#viewSeg button').forEach(function (x) { x.classList.toggle('on', x === b); });
      $('cutNote').hidden = b.dataset.v !== 'cutaway';
    });
  });
  $('lblChk').addEventListener('change', function (e) { CELL.setLabels(e.target.checked); });

  // review links: ?view=cutaway&preset=charge&labels=0&t=12 (t: fast-forward seconds, for screenshots)
  var qs = new URLSearchParams(location.search);
  load(PRESETS[qs.get('preset')] ? qs.get('preset') : null);
  if (qs.get('view') === 'cutaway') document.querySelector('#viewSeg button[data-v="cutaway"]').click();
  if (qs.get('labels') === '0') { $('lblChk').checked = false; CELL.setLabels(false); }
  var ff = +qs.get('t') || 0;
  for (var i = 0; i < Math.round(ff / .05); i++) advance(.05);
  requestAnimationFrame(function (t) { last = t; frame(t); });
})();
