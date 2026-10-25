/* Flash equipment prototype — preview controller: clock (pause / speed), stage controls, view
   selection, readings, explanation panel and route check. Drawing: scene.js + instrument modules. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var FS = window.FlashSim, sim = FS.create();
  var RES = FS.RES;

  /* ---------------- explanation panel (established explanation area; no banners over the equipment) */
  var EX = {
    0: { t: 'Flash unit idle', d: 'The flash unit is at atmospheric pressure, waiting for a verified sample.', w: 'Flashing an unverified sample would give a meaningless GOR.', o: 'Run Stage 1 to verify the sample in Pump A.' },
    1: { t: 'Stage 1 · Verify the stable sample', d: 'The charge in Pump A is re-checked as single phase at 80 cc and 5,000 psi.', w: 'The flash result is only valid if the feed is a homogeneous single-phase sample of known volume.', o: 'Reading step — no flow. "Stable · 80 cc @ 5,000 psi".' },
    2: { t: 'Stage 2 · Vacuum the flash unit', d: 'The vacuum valve opens. Air is drawn from the flask headspace, out through the <b>gas outlet</b> and along the gas header to the vacuum pump.', w: 'Air left in the flask or lines would be counted as produced gas and would contaminate the GC analysis.', o: 'Unit pressure falls from 14.7 to 0 psia; the inlet control valve stays closed.' },
    3: { t: 'Stage 3 · Fill the dead space with helium', d: 'The gasometer valve opens and the gasometer piston rises, pushing helium along the gas line, in through the <b>gas outlet</b> and into the evacuated flask until the unit reads atmospheric.', w: 'Helium is inert and not part of the reservoir fluid, so it can be identified and subtracted in the GC. It gives a known starting condition at 14.7 psia.', o: 'Gasometer helium 3,000 → 0 cc; unit pressure 0 → 14.7 psia.' },
    4: { t: 'Stage 4 · Flash the sample', d: 'Pump A displaces 50 cc through Port R. The sample passes the <b>inlet control valve</b> (where its pressure is let down) and is delivered through the head into the flask. At the <b>delivery tip</b> it falls as drops: the <b>oil collects</b> in the flask while the released <b>gas rises</b> into the headspace and leaves through the <b>gas outlet</b> to the gasometer.', w: 'Separation and liquid collection happen in the flask; only gas leaves, from the headspace. Collection and gas release run together — the flask does not have to fill first.', o: 'Pump A 80 → 30 cc · balance 200 → 240 g (40 g oil) · gasometer 0 → 400 cc.' },
    5: { t: 'Stage 5 · Collect gas into the balloon', d: 'The gasometer and balloon valves open. The gasometer piston rises and pushes part of the flashed gas along the gas line into the balloon branch. The inlet control valve stays closed.', w: 'The balloon is the gas sample for the chromatograph; the gasometer keeps the remainder for the volume record.', o: 'Gasometer 400 → 150 cc; balloon 0 → 250 cc at 14.5 psi.' },
    6: { t: 'Stage 6 · Measure oil and gas', d: 'The oil collected in the flask is read from the balance (gross − tare) and the gas from the gasometer and balloon.', w: 'GOR = gas volume at standard conditions ÷ residual oil. These readings are the basis of the flash result.', o: 'Recorded: oil 40 g (240 − 200 g tare), gas in balloon 14.5 psi, 150 cc left in the gasometer.' },
    7: { t: 'Stage 7 · Density & API (new)', d: 'A small aliquot of the flashed oil is drawn through the sampling side-arm of the flask (stopcock, closed during flashing) and injected into the density meter. The U-tube fills, the cell reaches its set temperature, and the oscillation period gives the density at that temperature.', w: 'API gravity is defined on specific gravity at 60/60 °F, so the reading at 20 °C is first converted to the 60 °F reference. The 40 g recorded at Stage 6 stays the flash result; the aliquot does not overwrite it.', o: 'calc' }
  };
  function calcBlock() {
    var r = RES;
    return '<div class="calc">ρ(20.00 °C) measured = ' + r.rho.toFixed(5) + ' g/cm³<br>' +
      'ρ60 = ρT ÷ CTL, CTL = ' + r.ctl.toFixed(5) + ' (iterated)<br>' +
      '→ ρ60 = ' + r.rho60.toFixed(5) + ' g/cm³<br>' +
      'SG 60/60 °F = ρ60 ÷ ρw60 (0.999016) = ' + r.sg.toFixed(4) + '<br>' +
      'API = 141.5 ÷ SG − 131.5 = <b>' + r.api.toFixed(1) + ' °API</b></div>' +
      '<p style="margin-top:6px">CTL from API MPMS Ch. 11.1 / ASTM D1250 crude-oil tables (α60 = 341.0957 / ρ60², simplified form). ' +
      '<b>Example values:</b> the 20 °C reading is back-calculated from the project stock-tank oil density (' + FS.STO60.toFixed(1) + ' kg/m³ at 60 °F, report data). Aliquot ' + FS.ALIQ_ML.toFixed(1) + ' mL (≈' + FS.ALIQ_G.toFixed(1) + ' g) is illustrative.</p>';
  }

  /* ---------------- view / scene */
  var view = 'auto', labels = true, sc = null, scKey = '';
  function modeFor() {
    if (view !== 'auto') return view;
    var n = sim.S.fBusy ? sim.S.fStage : sim.S.fStep;
    return n === 7 ? 'density' : 'system';
  }
  var HEAD = {
    system: ['SYSTEM', 'PVT Cell → sample line → Flash Unit (flask) → gas line → Gasometer'],
    density: ['STAGE 7', 'Flash Unit (collected oil) → syringe aliquot → Density Meter'],
    fu: ['FLASH UNIT', 'Sample inlet → flask → headspace → gas outlet · internal passages shown'],
    ga: ['GASOMETER', 'Piston-displacement gas meter · cutaway (simplified schematic)'],
    dm: ['DENSITY METER', 'Oscillating U-tube density meter · cutaway (simplified schematic)']
  };
  function ensureScene() {
    var m = modeFor(), key = m + '|' + labels;
    if (key === scKey) return;
    scKey = key;
    sc = Scene.build($('stage'), m, { labels: labels, labelsFn: labels && (m === 'fu' || m === 'ga' || m === 'dm') ? singleLabels(m) : null });
    $('shK').textContent = HEAD[m][0]; $('shT').textContent = HEAD[m][1];
  }
  function singleLabels(m) {
    var mod = { fu: FlashUnit, ga: Gasometer, dm: DensityMeter }[m];
    return function (Lo, tf) {
      var at = Lo[m];
      var list = mod.LABELS.map(function (c) { return { id: c.id, n: c.n, s: c.s, a: tf(at, c.a), p: tf(at, c.p), an: c.an }; });
      return FX.callouts(list, null, { fu: 1, ga: 1.5, dm: 1.15 }[m]);
    };
  }
  // the single-instrument views need room for callouts
  Scene.LAYOUT.fu.vb = [-260, -60, 1160, 680];
  Scene.LAYOUT.ga.vb = [-330, -30, 1000, 830];
  Scene.LAYOUT.dm.vb = [-330, -100, 1080, 460];

  /* ---------------- clock */
  var paused = false, speed = 1, clock = 0, last = performance.now();
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!paused) { clock += dt * speed; sim.tick(dt * speed); }
    ensureScene();
    var V = sim.vm(clock);
    sc.update(V);
    panel(V);
    requestAnimationFrame(frame);
  }

  /* ---------------- panel */
  var lastEx = -1, lastSteps = '';
  function nextStage() { return sim.S.fBusy ? 0 : Math.min(7, sim.S.fStep + 1); }
  function panel(V) {
    var S = sim.S, n = S.fBusy ? S.fStage : S.fStep, done = S.fStep >= 7 && !S.fBusy;
    // run button
    var nx = nextStage();
    $('btnRun').textContent = S.fBusy ? 'Running…' : done ? 'Reset Flash Process' : FS.ACTIONS[nx - 1];
    $('btnRun').disabled = S.fBusy;
    $('btnPause').textContent = paused ? 'Resume' : 'Pause';
    $('btnReplay').disabled = !n;
    // stage tracker
    var html = FS.NAMES.map(function (nm, i) {
      var k = i + 1, cls = k <= S.fStep && !(S.fBusy && S.fStage === k) ? 'done' : (S.fBusy ? S.fStage === k : nx === k) ? 'act' : '';
      return '<button type="button" class="st ' + cls + (S.fBusy && S.fStage === k ? ' busy' : '') + (k === 7 ? ' new' : '') + '" data-stage="' + k + '" title="Jump to stage ' + k + '"><i>0' + k + '</i><span>' + nm + '</span><b></b></button>';
    }).join('');
    if (html !== lastSteps) { $('steps').innerHTML = html; lastSteps = html; }
    // status
    var pi = sim.phaseInfo();
    $('act').textContent = pi ? 'Stage ' + pi.n + ' · ' + FS.NAMES[pi.n - 1] + ' — ' + pi.phase : 'Idle — run Stage 1';
    $('msg').textContent = pi ? pi.msg : S.fStatus;
    $('bar').style.width = (S.fBusy ? S.fPr * 100 : pi ? 100 : 0).toFixed(1) + '%';
    $('bar').style.background = S.fBusy ? 'var(--blue)' : 'var(--grn)';
    // readings (same quantities as the live page; Stage 7 adds the density results)
    var flowing = S.fBusy && S.fStage === 4 && S.fPr >= FS.FXP.flow && S.fPr < FS.FXP.end;
    var cells = [
      ['Cell pressure', '5,000', 'psi'], ['Pump A', Math.round(V.pumpA), 'cc'], ['Flash unit', V.fuP.toFixed(1), 'psia'],
      ['Flashed volume', Math.round(V.flashed), 'cc'], ['Flow rate', flowing ? '0.3' : '0.0', 'mL/min'], ['Glass mass', V.bal.toFixed(1), 'g'],
      ['Oil collected', Math.round(S.fOil), 'g', S.fMeasured ? 'recorded' : ''], ['Gasometer', Math.round(V.gasoVol) + (V.gasoMode === 'he' ? ' He' : ''), 'cc'],
      ['Balloon', (14.5 * Math.min(1, V.balloon / 250)).toFixed(1), 'psi']
    ];
    if (S.fStep >= 6 || (S.fBusy && S.fStage === 7)) {
      var r = V.dm.res || {};
      cells.push(['ρ 20 °C · ex.', r.rho ? r.rho.toFixed(5) : '—', 'g/cm³', 'ex'], ['SG 60/60 · ex.', r.sg ? r.sg.toFixed(4) : '—', '', 'ex'], ['API · ex.', r.api ? r.api.toFixed(1) : '—', '°API', 'ex']);
    }
    $('read').innerHTML = cells.map(function (c) { return '<div' + (c[3] === 'ex' ? ' class="ex"' : '') + '><span>' + c[0] + (c[3] === 'recorded' ? ' · recorded' : '') + '</span><b>' + c[1] + '</b><i>' + c[2] + '</i></div>'; }).join('');
    // explanation
    if (n !== lastEx) {
      lastEx = n;
      var e = EX[n] || EX[0];
      $('explain').innerHTML = '<div class="ek">EXPLAIN THIS STAGE</div><h3>' + e.t + '</h3><p>' + e.d + '</p><p><b>Why:</b> ' + e.w + '</p>' + (e.o === 'calc' ? calcBlock() : '<p><b>Watch:</b> ' + e.o + '</p>');
    }
    // route check (from valve states, live)
    var v = V.valve, op = function (x) { return x > 0.5; };
    var rows = [
      ['Pump A → flask inlet tip', op(v.pumpA) && op(v.inlet)],
      ['Flask headspace → gasometer', op(v.gaso) && S.fStage === 4],
      ['Gasometer → flask (helium)', op(v.gaso) && S.fStage === 3],
      ['Flask headspace → vacuum pump', op(v.vac)],
      ['Gasometer → balloon', op(v.gaso) && op(v.bal)],
      ['Direct sample → gasometer', false]
    ];
    $('route').innerHTML = rows.map(function (r, i) { return '<div class="' + (r[1] ? 'on' : 'off') + '"><span>' + r[0] + '</span><b>' + (i === 5 ? 'NO SUCH PATH' : r[1] ? 'OPEN · FLOWING' : 'CLOSED') + '</b></div>'; }).join('');
  }

  /* ---------------- controls */
  function runNext() {
    if (sim.S.fBusy) return;
    if (sim.S.fStep >= 7) { sim.reset(); return; }
    paused = false; sim.start(sim.S.fStep + 1);
  }
  function goTo(k) {          // replay: earlier stages at their own end values, then run stage k
    var list = []; for (var i = 1; i < k; i++) list.push(i);
    sim.jump(list); paused = false; sim.start(k);
  }
  $('btnRun').onclick = runNext;
  $('btnNext').onclick = function () { if (sim.S.fBusy) { sim.S.fClk = sim.S.fDur; sim.tick(0); } else if (sim.S.fStep < 7) { sim.start(sim.S.fStep + 1); sim.S.fClk = sim.S.fDur; sim.tick(0); } };
  $('btnPrev').onclick = function () { var n = sim.S.fBusy ? sim.S.fStage - 1 : sim.S.fStep - 1; var list = []; for (var i = 1; i <= Math.max(0, n); i++) list.push(i); sim.jump(list); };
  $('btnAll').onclick = function () { sim.jump([1, 2, 3, 4, 5, 6, 7]); };
  $('btnReplay').onclick = function () { var n = sim.S.fBusy ? sim.S.fStage : sim.S.fStep; if (n) goTo(n); };
  $('btnReset').onclick = function () { sim.reset(); paused = false; };
  $('btnPause').onclick = function () { paused = !paused; };
  $('steps').addEventListener('click', function (e) { var b = e.target.closest('[data-stage]'); if (b) goTo(+b.getAttribute('data-stage')); });
  $('viewSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    view = b.getAttribute('data-v');
    $('viewSeg').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
  });
  $('spdSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    speed = +b.getAttribute('data-v');
    $('spdSeg').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
  });
  $('lblChk').onchange = function () { labels = this.checked; };
  document.querySelectorAll('[data-details]').forEach(function (b) {
    b.onclick = function () { var was = paused; paused = true; Details.open(b.getAttribute('data-details'), function () { paused = was; }); };
  });

  /* review links: ?stage=n (jump to the end of stage n) · &run=1 (run stage n) · &t=s (fast-forward) · &view= · &labels=0 · &details=fu|ga|dm */
  var q = new URLSearchParams(location.search);
  if (q.get('view')) { view = q.get('view'); $('viewSeg').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-v') === view); }); }
  if (q.get('labels') === '0') { labels = false; $('lblChk').checked = false; }
  if (q.get('stage')) {
    var k = +q.get('stage');
    if (q.get('run')) { goTo(k); if (q.get('t')) { var tt = +q.get('t'); clock += tt; sim.tick(tt); } if (q.get('hold')) paused = true; }
    else { var l = []; for (var i = 1; i <= k; i++) l.push(i); sim.jump(l); }
  }
  window.__app = { sim: sim, get paused() { return paused; }, set paused(v) { paused = v; }, setClock: function (t) { clock = t; } };
  requestAnimationFrame(frame);
  if (q.get('details')) setTimeout(function () { paused = true; Details.open(q.get('details'), null, { view: q.get('dview'), demo: q.get('demo'), t: +q.get('dt') || 0 }); }, 50);
})();
