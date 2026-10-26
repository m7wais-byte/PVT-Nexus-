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
      eyebrow: 'Flash Unit Details', name: 'Atmospheric Flash Unit', variant: 'Black frame · clear panels', mod: 'FlashUnit', mode: 'fu',
      views: [['overall', 'Overall'], ['internal', 'Internal / flow']], viewArg: { overall: 'exterior', internal: 'internal' },
      vb: [-330, -200, 1560, 1020], ls: 1.15,
      demos: [[4, 'Sample down · gas back up'], [2, 'Evacuation (whole section)'], [3, 'Helium fill'], [5, 'Gas to balloon']],
      measures: 'Measures the collected oil (balance: gross − tare) and passes the flashed gas, from the flask headspace only, to the Gasometer.',
      principle: [
        'One upper horizontal stainless manifold runs under the top panel: sample inlet, inlet-control (isolation) valve, solenoid flow-control valve, the Flask Valve junction, pressure transducer, the balloon branch, the vacuum branch and the Gasometer outlet.',
        'Two connections go down from it. The flask has ONE shared connection through its neck: the sample goes down it and drops from its open end into the flask; gas released inside the flask rises into the headspace and returns up the same connection to the manifold and on to the Gasometer.',
        'The blue gas balloon hangs in the right bay from its own valve assembly: the balloon branch reaches the side fitting of its brass valve, and the valve’s stem housing runs up to a collar under the top panel; the valve is worked from above the panel (Balloon Valve). There is no second valve in the line and no stand or clamp.',
        'Flask Valve and Balloon Valve handles and the red-capped vacuum quick-connect sit above the top panel. In Stage 2 the temporary pump evacuates the whole section between the closed Port R valve and the closed Gasometer inlet valve — sample line, manifold, shared connection, flask and Gasometer line — with the Balloon Valve closed.'
      ],
      parts: {
        sampleIn: { n: 'Sample inlet', d: 'Bulkhead on the left post where the sample line from the PVT Cell (Pump A through the Port R valve) enters the manifold.', in: B },
        inletValve: { n: 'Inlet-control valve', d: 'Isolation valve with a black lever on the manifold. Open only in Stage 4, with Pump A, Port R and the flow-control valve.', in: B },
        flowCtl: { n: 'Flow-control component', d: 'Solenoid valve on the manifold; its lamp shows when it is energised (open). The sample pressure is let down across these valves.', in: B },
        manifold: { n: 'Upper manifold', d: 'One horizontal stainless line under the top panel joining the inlet, the flask, the balloon, the vacuum branch and the Gasometer.', in: B },
        flaskValve: { n: 'Flask Valve', d: 'Valve at the manifold junction above the flask, worked by the T-handle above the top panel. Open in Stages 2–4 (evacuation, helium fill, flash); closed in Stage 5 so balloon gas does not enter the flask.', in: B },
        shared: { n: 'Shared flask connection', d: 'One tube through the flask neck. Sample goes down it; gas released in the flask returns up it. Oil never goes up: it drops from the open end and stays in the flask.', in: B },
        head: { n: 'Flask head', d: 'Sealed stainless head on the ground-glass joint with a single fitting for the shared connection.', in: B },
        tip: { n: 'Open end in the flask', d: 'Bottom of the shared connection, inside the flask and above the highest oil level. Oil drops from here; headspace gas enters here.', in: B },
        flask: { n: 'Large glass flask', d: 'Where separation is shown: oil collects at the bottom, gas gathers above it.', in: B },
        oil: { n: 'Collected oil', d: 'Residual oil; it stays in the flask and is weighed on the balance.', in: B },
        release: { n: 'Gas-release region', d: 'Gas comes out of the sample in the flask; bubbles rise through the oil and from the falling drops.', in: B },
        headspace: { n: 'Gas headspace', d: 'Space above the oil where gas gathers before rising up the shared connection.', in: B },
        pt: { n: 'Pressure transducer', d: 'On the manifold; reads the unit pressure shown on the lower PRESSURE display.', in: B },
        gasLine: { n: 'Gasometer line', d: 'Manifold outlet on the right post to the Gasometer inlet.', in: B },
        balloonValve: { n: 'Balloon Valve', d: 'The balloon’s own brass valve, worked from above the top panel through an extension stem. Open only in Stage 5.', in: B },
        balloonConn: { n: 'Balloon connection', d: 'Branch from the manifold down to the side fitting of the balloon valve.', in: B },
        vessel: { n: 'Blue gas balloon', d: 'Tall dark-blue cylinder suspended from its own brass valve assembly (no stand or clamps), clear of the lower deck. Holds the GC gas sample; its pressure is shown below it.', in: B },
        vacConn: { n: 'Temporary vacuum connection', d: 'Vacuum valve on the branch rising from the manifold, and a red-capped quick-connect above the top panel. The pump is external: its hose connects there for Stage 2 only, then it is disconnected and removed.', in: B },
        balance: { n: 'Balance', d: 'Weighs the flask and contents: 200 g tare, the oil collected is the gain.', in: B },
        platform: { n: 'Adjustable platform', d: 'Lab jack under the balance.', in: B },
        arm: { n: 'Oil sampling side-arm', d: 'Glass arm with a stopcock below the oil level, closed during flashing; used in Stage 7 to draw the oil aliquot by syringe.', in: B }
      },
      about: ['General educational drawing of the photographed flash unit construction (black frame, clear panels, upper manifold, lab jack, lower displays). Not a specific manufacturer model.'],
      basis: 'The real photographs were not available in this session; the arrangement follows the written description. Uncertain: where exactly the sample and gas paths meet inside the Flask Valve body (drawn as one junction), and the valve’s position in Stages 2–3. Drawing scale: 40 g oil fills the bottom layer.'
    },
    ga: {
      eyebrow: 'Gasometer Details', name: 'Two-Section Gasometer', variant: '2,000 cc + 1,000 cc = 3,000 cc', mod: 'Gasometer', mode: 'ga',
      views: [['overall', 'Overall'], ['internal', 'Sections']], viewArg: { overall: 'exterior', internal: 'internal' },
      vb: [-420, -50, 1380, 940], ls: 1.5,
      demos: [[4, 'Gas in from the flask'], [3, 'Helium out (1,000 cc first)'], [5, 'Gas out to the vessel']],
      measures: 'Measures gas volume at atmospheric pressure in two sections. Total = 2,000 cc section + 1,000 cc section.',
      principle: [
        'Gas from the Flash Unit enters at the left side and reaches each section through its inlet valve; an isolation valve connects the section’s transparent chamber; a vent valve to atmosphere stays closed.',
        'The 2,000 cc section is used first. Gas above 2,000 cc goes to the 1,000 cc section. Each volume display shows its own section; the total reading is the sum (the existing simulator value).',
        'Helium (Stage 3) leaves the 1,000 cc section first, then the 2,000 cc section, so the order is the reverse of filling. Flashed gas (Stages 4–5) uses only the 2,000 cc section, because the collected volume stays below 2,000 cc.',
        'Compound gauges show chamber pressure around atmospheric; the lower knobs are the manual volume controls. Their internal mechanism is not modelled.'
      ],
      parts: {
        chamber2k: { n: '2,000 cc chamber', d: 'Left transparent chamber, used first.', in: B },
        chamber1k: { n: '1,000 cc chamber', d: 'Right transparent chamber; takes gas above 2,000 cc (helium in this procedure).', in: B },
        volDisp: { n: 'Volume displays', d: 'One per section, in cc. Left + right = total Gasometer reading.', in: B },
        tempDisp: { n: 'Temperature displays', d: 'One per section, °C. The simulator does not carry a gasometer temperature, so an example ambient value (22.0 °C) is shown.', in: B },
        gauges: { n: 'Compound gauges', d: 'Vacuum and pressure scale; the needle stays near atmospheric while the section measures.', in: B },
        mainInlet: { n: 'Gasometer inlet valve', d: 'Isolation valve on the external gas line at the Gasometer. Open in Stages 3–5; closed in Stage 2 so the evacuation stops here and the measuring chambers are not evacuated.', in: B },
        inlets: { n: 'Inlets', d: 'External gas connection and each section’s inlet valve (black handle).', in: B },
        vents: { n: 'Vents', d: 'Vent valve per section to atmosphere; closed throughout this procedure.', in: B },
        isolation: { n: 'Isolation valves', d: 'Connect each chamber to its section line; open only while that section is measuring.', in: B },
        chambers: { n: 'Transparent chambers', d: 'Tall clear chambers showing the gas column and its boundary moving with the volume.', in: B },
        knobs: { n: 'Lower control knobs', d: 'Manual volume controls, one per section; drawn turning with the section volume.', in: B },
        scales: { n: 'Graduated scales', d: '0 – 2,000 cc and 0 – 1,000 cc beside the chambers.', in: B },
        total: { n: 'Combined 3,000 cc total', d: 'Existing simulator capacity, represented by the two sections.', in: B }
      },
      about: ['Replaces the earlier single-cylinder drawing. Capacity 3,000 cc is kept from the current procedure.'],
      basis: 'The real photograph was not available in this session; the cabinet layout follows the written description. The split of the existing total reading (2,000 cc section first) is a prototype rule; no internal mechanism is claimed.'
    },
    dm: {
      eyebrow: 'Density Meter Details', name: 'Digital Density Meter', variant: 'DMA 4100 M–style', mod: 'DensityMeter', mode: 'dm',
      views: [['overall', 'Overall'], ['internal', 'Internal / flow']], viewArg: { overall: 'exterior', internal: 'internal' },
      vb: [-300, -110, 1180, 500], ls: 1.0,
      demos: [[7, 'Sample loading & measurement']],
      measures: 'Measures oil density at the set temperature (25.00 °C), converts it to 60 °F and reports SG 60/60 °F and API gravity (method Crude Oil (API)).',
      principle: [
        'The syringe is connected to the inlet tube. Oil enters the lower leg of the long horizontal U-tube, runs along it, round the return bend at the far end and back along the upper leg to the outlet, pushing the air out to the waste container.',
        'The U-tube sits in a temperature-control block (Peltier) held at 25.00 °C. The reading is taken only after the actual temperature equals the set temperature.',
        'The oscillation period of the filled U-tube gives the density at 25 °C. The meter converts it to the 60 °F reference (API MPMS 11.1 / ASTM D1250 crude-oil tables) and reports SG 60/60 °F and API gravity = 141.5 / SG − 131.5.',
        'The screen shows the four results in a 2×2 grid, the set and actual temperature, the same horizontal U-tube as a strip, and the status. After the result the used sample is pushed to waste.'
      ],
      parts: {
        screen: { n: 'Touchscreen', d: 'Method Crude Oil (API): status, Start, results and the measuring-cell view.', in: B },
        inlet: { n: 'Sample inlet', d: 'Lower side adapter, fed by the inlet tube from the syringe.', in: B },
        outlet: { n: 'Sample outlet', d: 'Upper side adapter; air and excess sample leave here.', in: B },
        syringe: { n: 'Syringe', d: 'Manual injection of the oil aliquot through the Luer adapter on the inlet tube.', in: B },
        utube: { n: 'Horizontal U-tube cell', d: 'Long horizontal U-tube: two closely spaced legs across the instrument and a rounded return bend. Filled bubble-free, its oscillation period gives the density. Drawn as an enlarged educational view.', in: I },
        cellStrip: { n: 'Measuring-cell strip', d: 'The same horizontal U-tube on the screen; it fills along the whole path as the sample is injected.', in: B },
        tempCtl: { n: 'Temperature-control region', d: 'Peltier block around the U-tube; set 25.00 °C.', in: I },
        wasteLine: { n: 'Waste line', d: 'Tube from the outlet adapter to the waste container.', in: B },
        waste: { n: 'Waste container', d: 'External container with a red cap; receives air, excess and used sample.', in: B },
        resDensity: { n: 'Measured density', d: 'Density at the set temperature (25.00 °C), g/cm³. The Density at 60 °F panel shows the reference-temperature value.', in: B },
        resSG: { n: 'Specific gravity result', d: 'API SG 60 °F (60/60 °F), after the temperature correction.', in: B },
        resAPI: { n: 'API gravity result', d: '141.5 / SG − 131.5, in °API.', in: B }
      },
      about: ['One consistent benchtop instrument in the arrangement of the DMA 4100 M (wide grey housing, sloped touchscreen, red strip, side adapters, external waste container). The aliquot does not change the oil recorded at Stage 6.'],
      basis: 'Principle per ASTM D4052 (oscillating U-tube). The photographs were not available in this session. Results are EXAMPLE values back-calculated from the project stock-tank oil density, not a live measurement.'
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
        '<h4 class="eq-h">What is measured</h4><div class="eq-about"><p>' + esc(d.measures) + '</p></div>' +
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
    ref('tag').textContent = S.view === 'overall' ? 'OVERALL' : ({ fu: 'INTERNAL PASSAGES · TRAINING VIEW', ga: 'SECTIONS · LIVE READINGS', dm: 'INTERNAL U-TUBE · SIMPLIFIED' })[S.k];
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
