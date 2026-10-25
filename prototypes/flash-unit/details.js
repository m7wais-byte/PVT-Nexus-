/* Details — "Flash Unit Details", "Gasometer Details", "Density Meter Details".
   Same interaction pattern as the live Cell Details (components/CellDetails.js): header with eyebrow,
   name and variant, Back to Procedure, view segments + Labels switch, enlarged drawing with selectable
   callouts, side panel with the selected part, operating principle, parts list and basis.
   Added for these instruments: a flow demonstration (choose a route, replay, pause) driven by its own
   simulation instance, so the procedure behind the overlay is not disturbed.
   The drawing is the SAME module used in the main preview (scene.js + flash-unit.js / gasometer.js /
   density-meter.js), so geometry and connections are identical. */
(function () {
  'use strict';
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var BACK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var B = ['overall', 'internal'], I = ['internal'];

  var D = {
    fu: {
      eyebrow: 'Flash Unit Details', name: 'Atmospheric Flash Unit', variant: 'Prototype design', mod: 'FlashUnit', mode: 'fu',
      views: [['overall', 'Overall'], ['internal', 'Internal / flow']], viewArg: { overall: 'exterior', internal: 'internal' },
      vb: [-250, -50, 1140, 670], ls: 1.05,
      demos: [[4, 'Sample → flask → gas out'], [2, 'Evacuation'], [3, 'Helium fill'], [5, 'Balloon collection']],
      principle: [
        'Sample from Pump A arrives through the sample inlet and passes the inlet control (metering) valve, where its pressure is let down.',
        'A flexible line carries it to the sealed flask head. The head has two separate passages: the sample inlet passage feeds a dip tube whose delivery tip is inside the flask; the gas outlet passage opens into the headspace near the top of the neck.',
        'At the tip the sample falls as drops. The oil collects at the bottom of the flask on the balance; the released gas rises into the headspace and leaves only through the gas outlet, up to the gas header and on to the gasometer.',
        'The same gas header carries the vacuum branch (Stage 2), the helium fill from the gasometer (Stage 3) and the balloon branch (Stage 5). The inlet control valve opens only in Stage 4.'
      ],
      parts: {
        sampleIn: { n: 'Sample inlet', d: 'Bulkhead fitting where the sample line from the PVT Cell (Pump A through the Port R valve) enters the unit.', in: B },
        inletValve: { n: 'Inlet control valve', d: 'Metering (needle) valve on the sample inlet. It controls the transfer and is where the sample pressure is let down. Open only during Stage 4, with the Pump A and Port R valves.', in: B },
        flexLines: { n: 'Flexible PTFE lines', d: 'Short flexible lines from the panel fittings to the flask head, so the stainless tubing does not carry the flask and the balance reads the flask freely.', in: B },
        head: { n: 'Flask head', d: 'Sealed stainless head on the ground-glass joint, held by a joint clip. It carries exactly two process passages — the sample inlet and the gas outlet — which do not connect inside the head.', in: B },
        tip: { n: 'Sample delivery tip', d: 'End of the dip tube inside the flask, above the highest oil level. The sample leaves here as drops.', in: B },
        flask: { n: 'Glass flask', d: 'Transparent receiver where the flashed sample separates. Oil collects at the bottom; gas fills the space above it.', in: B },
        oil: { n: 'Collected oil', d: 'The residual oil. It stays in the flask and is weighed on the balance (gross minus the 200 g tare).', in: B },
        headspace: { n: 'Gas headspace', d: 'Space above the oil. Released gas rises here and leaves only through the gas outlet.', in: B },
        outlet: { n: 'Gas outlet', d: 'Opening of the outlet passage in the flask neck, in the headspace and never in the oil. It leads up through the head to the gas header.', in: B },
        arm: { n: 'Oil sampling side-arm', d: 'Short glass arm through the lower flask wall with a PTFE stopcock and an upward Luer fitting. Closed during flashing; in Stage 7 a syringe is fitted and a small oil aliquot drawn for the density meter. It is below the oil level, so only oil can leave here.', in: B },
        balance: { n: 'Electronic balance', d: 'Weighs the flask and its contents. Reading 200 g with the empty flask (tare); the oil collected is the gain.', in: B },
        pt: { n: 'Pressure transducer', d: 'Reads the unit pressure on the gas header (psia), shown on the panel meter: 14.7 → 0 psia during evacuation, back to 14.7 with helium.', in: B },
        vacuum: { n: 'Vacuum branch', d: 'Tee on the gas header with the vacuum valve, quick-connect and hose to the vacuum pump. Open only in Stage 2.', in: B },
        balloon: { n: 'Gas collection balloon', d: 'GC sample container on its own branch of the gas header, with its own valve and pressure readout. It is filled only in Stage 5, from the gasometer.', in: B },
        gasoConn: { n: 'Gasometer connection', d: 'End of the gas header: the gas line to the gasometer valve. Gas reaches it only from the flask headspace (or from the gasometer, for helium and balloon filling).', in: B }
      },
      about: ['General educational instrument based on the existing PVT Nexus atmospheric flash workflow (glass flask on a balance, gasometer, balloon). It is not a specific manufacturer model.'],
      basis: 'Construction details (glass receiver, sealed head, metering valve, flexible lines, gas header) follow common GOR / flash-separator practice. No capacities or ratings are given; the flask graduations carry no values because the balance is the measurement.'
    },
    ga: {
      eyebrow: 'Gasometer Details', name: 'Piston-Displacement Gasometer', variant: '3,000 cc · simulator capacity', mod: 'Gasometer', mode: 'ga',
      views: [['overall', 'Overall'], ['internal', 'Internal / flow']], viewArg: { overall: 'exterior', internal: 'cutaway' },
      vb: [-330, -40, 1000, 840], ls: 1.55,
      demos: [[4, 'Gas in from the flask'], [3, 'Helium out to the flask'], [5, 'Gas out to the balloon']],
      principle: [
        'One process port connects the measuring chamber to the gas line from the Flash Unit; the gasometer valve isolates it.',
        'A Δp sensor compares the chamber with the atmosphere. The controller drives the piston through a lead screw so the chamber stays at atmospheric pressure: incoming gas makes the piston move down, delivering gas makes it move up.',
        'The piston displacement is the gas volume, shown on the display in cc (0 – 3,000 cc). Helium (Stage 3) and flashed gas (Stages 4–5) use the same chamber, shown in different colours.',
        'The internal view is a simplified educational schematic of this principle, not the internals of a specific commercial model.'
      ],
      parts: {
        inlet: { n: 'Gas port', d: 'Single process connection: gas from the flask headspace enters here (Stage 4); helium (Stage 3) and balloon gas (Stage 5) leave here.', in: B },
        valve: { n: 'Gasometer valve', d: 'Isolates the gasometer from the gas line. Open in Stages 3, 4 and 5 only.', in: B },
        dp: { n: 'Δp sensor', d: 'Differential pressure between the chamber line and the atmosphere. The controller moves the piston to keep it at zero (atmospheric hold).', in: B },
        chamber: { n: 'Measuring chamber', d: 'Precision bore above the piston. The gas volume in it is the reading.', in: I },
        piston: { n: 'Piston', d: 'Sealed piston that rides directly under the gas; its travel is the volume reading.', in: I },
        screw: { n: 'Lead screw drive', d: 'Piston rod, carriage and lead screw in the lower bay. The carriage position matches the piston.', in: B },
        motor: { n: 'Stepper motor', d: 'Turns the lead screw on the controller\'s command; its steps give the displacement.', in: B },
        display: { n: 'Volume display', d: 'Shows the chamber volume (cc), the gas (HELIUM / FLASH GAS) and the atmospheric hold status. It follows the simulator gasometer reading exactly.', in: B },
        scale: { n: 'Volume scale', d: '0 – 3,000 cc against the piston position (existing simulator capacity, not a verified product specification).', in: B },
        frame: { n: 'Frame and cabinet', d: 'Floor-standing navy frame matching the PVT Cell, with the measuring cylinder above and the drive bay below.', in: B }
      },
      about: ['Replaces the earlier single-tank illustration. Capacity 3,000 cc is kept from the current procedure.'],
      basis: 'Mechanism basis: published descriptions of piston-type gas meters — a motor-driven piston held at a set pressure by a pressure sensor and controller, with gas volume taken from the drive (e.g. US 4,823,598), and a floating-piston gas meter in a graduated cylinder (US 8,991,233). The Chandler 2331D page could not be opened from this environment, so its internals are NOT claimed. No temperature value is shown: the current workflow does not carry a gasometer temperature.'
    },
    dm: {
      eyebrow: 'Density Meter Details', name: 'Oscillating U-Tube Density Meter', variant: 'Benchtop · Stage 7', mod: 'DensityMeter', mode: 'dm',
      views: [['overall', 'Overall'], ['internal', 'Internal / flow']], viewArg: { overall: 'exterior', internal: 'cutaway' },
      vb: [-330, -90, 1080, 450], ls: 1.15,
      demos: [[7, 'Sample loading & measurement']],
      principle: [
        'The oil aliquot is injected through the Luer inlet and fills a glass U-tube; the excess leaves through the outlet to the waste container.',
        'The U-tube sits in a thermostated block (Peltier heating/cooling, Pt100 sensor) held at the set temperature, here 20.00 °C.',
        'An exciter makes the U-tube oscillate and a pickup measures its period. A heavier (denser) liquid gives a longer period; with the calibration constants the period gives the density at the measuring temperature. A reference oscillator compensates drift.',
        'The density at 20 °C is converted to the 60 °F reference with the petroleum measurement tables (API MPMS 11.1 / ASTM D1250) to give SG 60/60 °F, and API = 141.5 / SG − 131.5.'
      ],
      parts: {
        inlet: { n: 'Sample inlet', d: 'Luer adapter: the syringe is fitted here and the sample injected.', in: B },
        outlet: { n: 'Sample outlet', d: 'Luer adapter on the other leg of the U-tube; the displaced sample flows to waste.', in: B },
        utube: { n: 'U-tube measuring cell', d: 'Glass U-tube filled bubble-free with sample. Its oscillation period depends on the density of the liquid inside.', in: B },
        thermo: { n: 'Thermostat block', d: 'Holds the U-tube at the set temperature (Peltier elements, Pt100 sensor). The reading is taken only at equilibrium.', in: I },
        exciter: { n: 'Exciter / pickup', d: 'Drives the U-tube oscillation and measures its period.', in: I },
        ref: { n: 'Reference oscillator', d: 'Second oscillator used to compensate long-term drift of the measurement.', in: I },
        screen: { n: 'Touchscreen', d: 'Shows filling check, cell temperature, density at the measuring temperature, SG 60/60 °F and °API.', in: B },
        waste: { n: 'Waste container', d: 'Collects the sample flushed through the cell.', in: B }
      },
      about: ['One consistent benchtop instrument (not a combination of models). The collected-oil result recorded at Stage 6 is not changed by the aliquot.'],
      basis: 'Principle: oscillating U-tube density measurement as covered by ASTM D4052 (density, relative density and API gravity of liquids); manufacturers of such meters describe U-tube oscillation, temperature control and bubble checking. The internal view is a simplified educational schematic. Results shown are EXAMPLE values back-calculated from the project stock-tank oil density.'
    }
  };

  var ov = null, root = null, lastFocus = null, onClose = null, raf = 0, sim = null, sc = null;
  var S = { k: 'fu', view: 'internal', labels: true, selected: null, demo: 4, paused: false, clock: 0, hold: 0 };

  function seg(key, items, cur) {
    return '<div class="seg" role="group" data-seg="' + key + '">' + items.map(function (it) {
      return '<button type="button" data-v="' + it[0] + '" aria-pressed="' + (String(it[0]) === String(cur) ? 'true' : 'false') + '">' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function frame() {
    var d = D[S.k];
    root.innerHTML =
      '<header class="bd-head"><div class="bd-titles"><span class="bd-eyebrow">' + esc(d.eyebrow) + '</span><h2>' + esc(d.name) + '</h2><span class="bd-variant">' + esc(d.variant) + '</span></div>' +
      '<button type="button" class="bd-close" data-act="close">' + BACK + '<span>Back to Procedure</span></button></header>' +
      '<div class="eq-bar"><span data-ref="vseg"></span><label class="sw"><input type="checkbox" data-sw="labels"><span></span><em>Labels</em></label></div>' +
      '<div class="eq-main"><section class="eq-stage">' +
        '<div class="eq-stage-head"><h3>' + esc(d.name) + '</h3><span class="eq-tag" data-ref="tag"></span><span class="eq-basis" data-ref="dstat"></span></div>' +
        '<div class="eq-view" data-ref="d2"></div>' +
        '<div class="eq-help"><span>Click a label or a part name to read about it.</span><span class="demo"><span class="gh">Flow demo</span><span data-ref="dseg"></span>' +
        '<button class="btn" type="button" data-act="replay">Replay</button><button class="btn" type="button" data-act="pause">Pause</button></span></div>' +
      '</section><aside class="eq-side">' +
        '<div class="eq-info" data-ref="info" aria-live="polite"></div>' +
        '<h4 class="eq-h">Operating principle</h4><div class="eq-about">' + d.principle.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' +
        '<h4 class="eq-h">Parts</h4><div class="eq-parts" data-ref="parts">' + Object.keys(d.parts).map(function (id) {
          var p = d.parts[id]; return '<button type="button" class="eq-part" data-part="' + id + '" aria-pressed="false">' + esc(p.n) + (p.in.length === 1 ? '<small>internal</small>' : '') + '</button>';
        }).join('') + '</div>' +
        '<h4 class="eq-h">About</h4><div class="eq-about">' + d.about.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '<p class="eq-basis2">' + esc(d.basis) + '</p></div>' +
        '<p class="bd-note">Prototype equipment view. The flow demo runs its own copy of the procedure values; closing returns to the procedure where it was.</p>' +
      '</aside></div>';
  }
  function ref(n) { return root.querySelector('[data-ref="' + n + '"]'); }

  function build() {
    var d = D[S.k], mod = window[d.mod];
    var opt = { vb: d.vb, title: d.name + ', ' + S.view + ' view', fuView: d.viewArg[S.view], gaView: d.viewArg[S.view], dmView: d.viewArg[S.view] };
    if (S.labels) {
      opt.labels = true;
      opt.labelsFn = function (Lo, tf) {
        var at = Lo[d.mode];
        var list = mod.LABELS.filter(function (c) { var p = d.parts[c.id]; return !p || p.in.indexOf(S.view) >= 0; })
          .map(function (c) { return { id: c.id, n: c.n, s: c.s, a: tf(at, c.a), p: tf(at, c.p), an: c.an }; });
        return FX.callouts(list, S.selected, d.ls || 1);
      };
    }
    sc = Scene.build(ref('d2'), d.mode, opt);
  }
  function render() {
    var d = D[S.k];
    ref('vseg').innerHTML = seg('view', d.views, S.view);
    ref('dseg').innerHTML = seg('demo', d.demos, S.demo);
    root.querySelector('[data-sw="labels"]').checked = S.labels;
    ref('tag').textContent = S.view === 'overall' ? 'OVERALL' : (S.k === 'fu' ? 'INTERNAL PASSAGES · TRAINING VIEW' : 'CUTAWAY · SIMPLIFIED SCHEMATIC');
    ref('tag').className = 'eq-tag' + (S.view !== 'overall' ? ' cut' : '');
    root.querySelector('[data-act="pause"]').textContent = S.paused ? 'Resume' : 'Pause';
    ref('parts').querySelectorAll('.eq-part').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-part') === S.selected ? 'true' : 'false'); });
    build(); info();
  }
  var flag = '';
  function info() {
    var d = D[S.k], p = S.selected && d.parts[S.selected], el = ref('info');
    if (!p) { el.innerHTML = '<h4>Select a part</h4><p>Click a label or a name in the parts list.</p>'; return; }
    var note = flag || (p.in.indexOf(S.view) < 0 ? 'Not drawn in this view: switch to Internal / flow to see it.' : '');
    flag = '';
    el.innerHTML = '<h4>' + esc(p.n) + '</h4><p>' + esc(p.d) + '</p>' + (note ? '<p class="eq-flag">' + esc(note) + '</p>' : '');
  }
  function select(id, fromList) {
    var d = D[S.k], p = id && d.parts[id];
    S.selected = p ? id : null;
    if (p && fromList && p.in.indexOf(S.view) < 0) { S.view = 'internal'; flag = 'Not drawn in the previous view: switched to Internal / flow to show it.'; }
    render();
  }

  /* demo clock: its own simulation instance */
  function startDemo() {
    sim = FlashSim.create();
    var list = []; for (var i = 1; i < S.demo; i++) list.push(i);
    sim.jump(list); sim.start(S.demo); S.hold = 0;
  }
  var last = 0;
  function loop(now) {
    var dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    if (!S.paused) {
      S.clock += dt;
      if (sim.S.fBusy) sim.tick(dt); else { S.hold += dt; if (S.hold > 2) startDemo(); }
    }
    if (sc) sc.update(sim.vm(S.clock));
    var pi = sim.phaseInfo(); ref('dstat').textContent = pi ? 'Stage ' + pi.n + ' · ' + pi.msg : '';
    raf = requestAnimationFrame(loop);
  }

  function onClick(e) {
    var t = e.target;
    if (t === ov) { close(); return; }
    var act = t.closest('[data-act]');
    if (act) {
      var a = act.getAttribute('data-act');
      if (a === 'close') close();
      else if (a === 'replay') { S.paused = false; startDemo(); render(); }
      else if (a === 'pause') { S.paused = !S.paused; act.textContent = S.paused ? 'Resume' : 'Pause'; }
      return;
    }
    var sb = t.closest('[data-seg] button');
    if (sb) {
      var key = sb.parentNode.getAttribute('data-seg'), v = sb.getAttribute('data-v');
      if (key === 'view') S.view = v; else { S.demo = +v; S.paused = false; startDemo(); }
      render(); return;
    }
    var part = t.closest('[data-part]');
    if (part) select(part.getAttribute('data-part'), !!t.closest('.eq-parts'));
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.pb-lab[data-part]')) { e.preventDefault(); select(e.target.getAttribute('data-part'), false); }
    if (e.key === 'Tab') {
      var f = [].filter.call(root.querySelectorAll('button, [tabindex="0"], input'), function (x) { return x.offsetParent || x.closest('svg'); });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  function onChange(e) { if (e.target.getAttribute('data-sw') === 'labels') { S.labels = e.target.checked; render(); } }

  function open(k, cb, o) {
    o = o || {};
    if (ov) close();
    lastFocus = document.activeElement; onClose = cb || null;
    S.k = k; S.view = o.view || 'internal'; S.selected = null; S.demo = +(o.demo || D[k].demos[0][0]); S.paused = false; S.clock = 0;
    ov = document.createElement('div'); ov.className = 'bd-ov';
    root = document.createElement('div'); root.className = 'bd-win eq';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', D[k].eyebrow);
    ov.appendChild(root); document.body.appendChild(ov);
    document.documentElement.classList.add('bd-open');
    ov.addEventListener('click', onClick); ov.addEventListener('keydown', onKey); ov.addEventListener('change', onChange);
    frame(); startDemo();
    if (o.t) { sim.tick(o.t); S.clock = o.t; S.paused = true; }
    render();
    last = 0; raf = requestAnimationFrame(loop);
    var c = root.querySelector('[data-act="close"]'); if (c) c.focus();
  }
  function close() {
    if (!ov) return;
    cancelAnimationFrame(raf);
    ov.remove(); ov = null; root = null; sc = null;
    document.documentElement.classList.remove('bd-open');
    if (onClose) onClose();
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }

  window.Details = { open: open, close: close, isOpen: function () { return !!ov; }, D: D };
})();
