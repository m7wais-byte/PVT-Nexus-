/* ==========================================================================
   CellDetails — contextual "Cell Details" overlay for the approved
   dual-cylinder PVT cell, same pattern as BottleDetails.js / SpmcDetails.js.

   Opened from any element with data-cd-open (the "Cell Details" buttons in the
   cell headings, or the pill drawn by PVTCellArt.pill). data-cd-ctx = one line
   naming the cell's role on that page.

   One shared viewer, drawn with the same component as the procedure pages
   (components/PVTCellArt.js):
     Exterior / Cutaway  the complete device: enclosure and frame, cylinders,
                         piston drives, stand, port and cylinder valves, sensor,
                         displays, plus the computer, controller and signal cable
     Plumbing            schematic of the built-in routing, marked as an
                         assumption (inferred from the simulator, not confirmed)
   Labels and a parts list with short explanations. No live readings, valve
   states or prototype numbers: a general equipment view only.

   Opening holds the procedure (PC.hold with restore): a running stage is paused
   and animations freeze; closing returns to the same step and values and
   resumes playback only if it was running when the viewer opened.
   ========================================================================== */
(function () {
  'use strict';

  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var BACK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var EX = ['exterior', 'cutaway'], ALL = ['exterior', 'cutaway', 'plumbing'], CUT = ['cutaway', 'plumbing'];

  /* ---------------------------------------------------------------- data */
  var CELL = {
    name: 'Dual-Cylinder PVT Cell',
    variant: 'Approved simulator design',
    principle: [
      'Two sample cylinders, Pump B (left) and Pump A (right), share one built-in header with a pressure sensor.',
      'Each cylinder valve connects or isolates its own cylinder. With both open, sample can move between Pump A and Pump B.',
      'External lines attach only at Port L and Port R. Each port has its own isolation valve outside the enclosure, which connects or isolates that line.',
      'A piston drive under each cylinder moves its piston. The sample volume above the piston changes, and the panel displays it.'
    ],
    parts: {
      pumpB: { n: 'Pump B cylinder', d: 'Left sample cylinder. Sample fills the bore above the piston; moving the piston down increases the sample volume. Pump B is always on the left; the cell is never mirrored.', in: ALL },
      pumpA: { n: 'Pump A cylinder', d: 'Right sample cylinder, identical to Pump B. Sample fills the bore above the piston.', in: ALL },
      valveB: { n: 'Pump B valve', d: 'Cylinder valve on top of Pump B. Open, it connects Pump B to the header and pressure sensor; closed, it isolates Pump B only.', in: ALL },
      valveA: { n: 'Pump A valve', d: 'Cylinder valve on top of Pump A. Open, it connects Pump A to the header and pressure sensor; closed, it isolates Pump A only.', in: ALL },
      portL: { n: 'Port L isolation valve', d: 'Valve directly at Port L, outside the enclosure. External tubing or a pressure-rated plug attaches to its outward end. Closed, it isolates the Port L line from the header, the sensor and Port R.', in: ALL },
      portR: { n: 'Port R isolation valve', d: 'Matching valve at Port R, outside the enclosure. External tubing or a pressure-rated plug attaches to its outward end. Closed, it isolates the Port R line.', in: ALL },
      sensor: { n: 'Pressure sensor', d: 'Reads the pressure in the header between the Pump B and Pump A tees, so it reads whichever volumes are open to the header.', in: ALL },
      header: { n: 'Built-in header', d: 'Internal line from the Port L valve past the Pump B tee, the pressure sensor and the Pump A tee to the Port R valve. This routing is a schematic assumption inferred from the simulator, not confirmed against the real cell.', in: CUT, internal: true },
      piston: { n: 'Piston and rod', d: 'Sealed piston in each bore, with a rod down to its drive carriage. It separates the sample above it from the drive below.', in: ['cutaway'], internal: true },
      volDisp: { n: 'Sample volume display', d: 'Panel display of the sample volume in Pump B and Pump A, in cc.', in: EX },
      tempDisp: { n: 'Temperature display', d: 'Panel display of the cell temperature, in °C.', in: EX },
      drive: { n: 'Piston drives', d: 'One mechanical drive under each cylinder. Its carriage follows the piston, so the drive window shows the piston position. Drawn as a lead-screw drive; the real drive type is not specified.', in: ALL },
      enclosure: { n: 'Thermal enclosure', d: 'Insulated enclosure in a navy frame around both cylinders, the header and the cylinder valves. The port valves sit outside it.', in: EX },
      stand: { n: 'Frame base and feet', d: 'Lower frame of the enclosure, standing on feet. The drives sit in the lower bay.', in: EX },
      cable: { n: 'Signal cable', d: 'Dark sheathed cable from the cell connector plate to the controller. It carries signals only, never sample.', in: EX },
      controller: { n: 'Controller', d: 'Links the cell to the computer through the signal cable.', in: EX },
      computer: { n: 'Computer', d: 'Runs the cell monitor, showing the readings received through the controller.', in: EX }
    },
    about: [
      'The one permanent PVT cell used on every procedure page. Procedures differ only in valve states, piston positions, readings and the equipment attached at Port L and Port R.'
    ],
    basis: 'Approved simulator design (PVT Cell prototype). The cylinder-valve arrangement and internal routing are schematic assumptions, and the drive type is not specified. No capacities or ratings are given here: each procedure page keeps its own values.'
  };

  /* ------------------------------------------------------------ drawings */
  var AT = { x: 0, y: 0, s: 1 }, DESK = { x: 1250, y: 300, s: 1, legs: 206 };
  var PA = 299;                                       // illustrative Pump A piston, old page bore frame (219-401)
  // callouts: id, part, name, sub, anchor, label point, text-anchor, views
  var LAB = [
    ['valveB', 'Pump B valve', 'cylinder valve', [470, 55], [470, -62], 'middle', ALL],
    ['valveA', 'Pump A valve', 'cylinder valve', [760, 55], [760, -62], 'middle', ALL],
    ['portL', 'Port L valve', 'isolation · outside enclosure', [292, 126], [262, 18], 'middle', EX],
    ['sensor', 'Pressure sensor', 'on the header', [615, 197], [615, 18], 'middle', EX],
    ['portR', 'Port R valve', 'isolation · outside enclosure', [938, 126], [968, 18], 'middle', EX],
    ['header', 'Built-in header', 'schematic assumption', [395, 183], [225, 150], 'end', ['cutaway']],
    ['pumpB', 'Pump B', 'left cylinder', [428, 262], [225, 262], 'end', EX],
    ['enclosure', 'Thermal enclosure', 'navy frame', [330, 410], [225, 410], 'end', EX],
    ['drive', 'Piston drive', 'Pump B', [430, 600], [225, 600], 'end', EX],
    ['stand', 'Frame base', 'feet', [342, 750], [225, 750], 'end', EX],
    ['pumpA', 'Pump A', 'right cylinder', [802, 262], [1000, 262], 'start', EX],
    ['piston', 'Piston and rod', 'illustrative position', [786, 320], [1000, 320], 'start', ['cutaway']],
    ['volDisp', 'Sample volume', 'display · B and A', [687, 345], [1000, 385], 'start', EX],
    ['tempDisp', 'Temperature', 'display', [687, 410], [1000, 450], 'start', EX],
    ['drive', 'Piston drive', 'Pump A', [800, 600], [1000, 600], 'start', EX],
    ['cable', 'Signal cable', 'not tubing', [1002, 630], [1010, 708], 'start', EX],
    ['computer', 'Computer', 'cell monitor', [1385, 318], [1385, 256], 'middle', EX],
    ['controller', 'Controller', 'cell ↔ computer', [1560, 432], [1560, 392], 'middle', EX]
  ];
  function r1(v) { return Math.round(v * 10) / 10; }
  function label(L, sel) {
    var id = L[0], ax = L[3][0], ay = L[3][1], x = L[4][0], y = L[4][1], an = L[5];
    var w = Math.max(L[1].length * 11.2, L[2].length * 8.2) + 12, lead;
    if (an === 'middle') lead = 'M' + ax + ' ' + ay + ' V' + (y + 24) + (ax !== x ? ' H' + x + ' V' + (y + 22) : '');
    else if (id === 'cable') lead = 'M' + ax + ' ' + ay + ' V' + (y - 6) + ' H' + (x - 6);
    else { var s = an === 'end' ? 1 : -1, xm = x + s * 22; lead = 'M' + ax + ' ' + ay + (ay === y ? '' : ' H' + xm + ' V' + y) + ' H' + (x + s * 6); }
    var x0 = an === 'start' ? x - 4 : an === 'end' ? x - w : x - w / 2;
    return { lead: '<path class="lead" d="' + lead + '"/><circle class="dot" cx="' + ax + '" cy="' + ay + '" r="3.2"/>',
      text: '<g class="pb-lab' + (id === sel ? ' on' : '') + '" data-part="' + id + '" tabindex="0" role="button" aria-label="' + esc(CELL.parts[id].n) + '">' +
        '<rect x="' + r1(x0) + '" y="' + (y - 20) + '" width="' + r1(w + 4) + '" height="44" fill="transparent"/>' +
        '<text class="lab-n" x="' + x + '" y="' + y + '" text-anchor="' + an + '">' + esc(L[1]) + '</text>' +
        '<text class="lab-s" x="' + x + '" y="' + (y + 18) + '" text-anchor="' + an + '">' + esc(L[2]) + '</text></g>' };
  }
  function labels(view, sel, list) {
    var lead = '', text = '';
    list.forEach(function (L) { if (L[6].indexOf(view) < 0) return; var l = label(L, sel); lead += l.lead; text += l.text; });
    return '<g class="cd-labs">' + lead + text + '</g>';           // text after leaders, so leaders never cross a label
  }

  function device(view, showLabels, sel, title) {
    var A = window.PVTCellArt, cut = view === 'cutaway';
    var s = '<svg class="cd-svg" viewBox="0 -100 1660 900" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(title) + '">';
    s += '<defs>' + A.defs('cdx', { raw: true }) + '</defs>';
    s += '<line x1="180" y1="757" x2="1650" y2="757" class="cd-floor"/>';
    s += A.desk('cdx', { x: DESK.x, y: DESK.y, s: DESK.s, legs: DESK.legs, raw: true, label: false, ctl: '—',
      rows: [['P psig', '—'], ['PUMP A cc', '—'], ['PUMP B cc', '—'], ['T °C', '—']] });
    s += A.cable({ at: AT }, DESK, 40);
    s += A.cell('cdx', { raw: true, at: AT, view: cut ? 'cutaway' : 'exterior', labels: false, state: false,
      pistonA: PA, innerA: '<rect x="1010" y="219" width="40" height="' + (PA - 219) + '" fill="#e0aa48"/><rect x="1010" y="219" width="40" height="' + (PA - 219) + '" fill="#fff" opacity=".12"/>',
      pistonB: 219, disp: { P: '—', B: '—', A: '—', T: '—' } });
    if (showLabels) s += labels(view, sel, LAB);
    return s + '</svg>';
  }

  /* plumbing schematic (after prototypes/pvt-cell/plumbing.js), static: no valve states or values */
  var PY = 330, PL = 150, VL = 262, VR = 1174, PR = 1286, XB = 520, XA = 916, XS = 718, VY = 402, CY0 = 470, CY1 = 640;
  function bowtie(x, y, vert) {
    var d = vert ? 'M' + (x - 16) + ' ' + (y - 22) + ' H' + (x + 16) + ' L' + (x - 16) + ' ' + (y + 22) + ' H' + (x + 16) + ' Z'
                 : 'M' + (x - 22) + ' ' + (y - 16) + ' V' + (y + 16) + ' L' + (x + 22) + ' ' + (y - 16) + ' V' + (y + 16) + ' Z';
    return '<path class="cd-valve" d="' + d + '"/>';
  }
  var PLAB = [
    ['portL', 'Port L valve', 'outside the enclosure', [VL, PY - 18], [VL, PY - 112], 'middle', ['plumbing']],
    ['portR', 'Port R valve', 'outside the enclosure', [VR, PY - 18], [VR, PY - 112], 'middle', ['plumbing']],
    ['sensor', 'Pressure sensor', 'reads the header', [XS + 26, 240], [XS + 120, 236], 'start', ['plumbing']],
    ['header', 'Built-in header', 'schematic assumption', [620, PY], [640, PY + 80], 'start', ['plumbing']],
    ['valveB', 'Pump B valve', 'own cylinder only', [XB - 18, VY], [XB - 50, VY], 'end', ['plumbing']],
    ['valveA', 'Pump A valve', 'own cylinder only', [XA + 18, VY], [XA + 50, VY], 'start', ['plumbing']],
    ['pumpB', 'Pump B', 'left cylinder', [XB - 50, 560], [XB - 80, 560], 'end', ['plumbing']],
    ['pumpA', 'Pump A', 'right cylinder', [XA + 50, 560], [XA + 80, 560], 'start', ['plumbing']],
    ['drive', 'Piston drive', 'Pump B', [XB - 40, 682], [XB - 80, 682], 'end', ['plumbing']],
    ['drive', 'Piston drive', 'Pump A', [XA + 40, 682], [XA + 80, 682], 'start', ['plumbing']]
  ];
  function plumbing(showLabels, sel, title) {
    var o = '<svg class="cd-svg" viewBox="40 60 1356 700" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(title) + '">';
    // assumption banner
    o += '<rect x="60" y="74" width="1316" height="64" rx="8" class="cd-banner"/>';
    o += '<text x="80" y="101" class="cd-ban-h">SCHEMATIC ASSUMPTION · INTERNAL ROUTING NOT CONFIRMED</text>';
    o += '<text x="80" y="124" class="cd-ban-s">Inferred from the simulator: cylinder valves on tees of one header, sensor between them, each port reaching the header only through its isolation valve.</text>';
    // enclosure (port valves outside it)
    o += '<rect x="' + (VL + 42) + '" y="' + (PY - 66) + '" width="' + (VR - VL - 84) + '" height="' + (726 - PY + 66) + '" rx="10" class="cd-encl"/>';
    o += '<text x="' + (VL + 54) + '" y="716" class="cd-note">thermal enclosure</text>';
    // external lines + port ends
    [['L', PL, VL, 70], ['R', PR, VR, 1366]].forEach(function (p) {
      var k = p[0], x = p[1], v = p[2], xe = p[3];
      o += '<path class="cd-ext" d="M' + x + ' ' + PY + ' H' + xe + '"/>';
      o += '<path class="cd-line" d="M' + Math.min(x, v + (k === 'L' ? -22 : 22)) + ' ' + PY + ' H' + Math.max(x, v + (k === 'L' ? -22 : 22)) + '"/>';
      o += '<circle cx="' + x + '" cy="' + PY + '" r="7" class="cd-end"/>';
      o += '<text x="' + x + '" y="' + (PY + 40) + '" text-anchor="middle" class="cd-note">Port ' + k + ' outward end</text>';
      o += '<text x="' + x + '" y="' + (PY + 60) + '" text-anchor="middle" class="cd-note">tubing or rated plug</text>';
      o += bowtie(v, PY, false);
    });
    // header, sensor tee, cylinder tees
    o += '<path class="cd-line" d="M' + (VL + 22) + ' ' + PY + ' H' + (VR - 22) + ' M' + XS + ' ' + PY + ' V266 M' + XB + ' ' + PY + ' V' + (VY - 22) + ' M' + XA + ' ' + PY + ' V' + (VY - 22) + '"/>';
    [XB, XS, XA].forEach(function (x) { o += '<circle cx="' + x + '" cy="' + PY + '" r="6" class="cd-tee"/>'; });
    o += '<circle cx="' + XS + '" cy="240" r="26" class="cd-valve"/><text x="' + XS + '" y="246" text-anchor="middle" class="cd-pt">PT</text>';
    [XB, XA].forEach(function (x) {
      o += bowtie(x, VY, true);
      o += '<path class="cd-line" d="M' + x + ' ' + (VY + 22) + ' V' + CY0 + '"/>';
      o += '<rect x="' + (x - 50) + '" y="' + CY0 + '" width="100" height="' + (CY1 - CY0) + '" rx="6" class="cd-cyl"/>';
      o += '<rect x="' + (x - 47) + '" y="' + (CY0 + 60) + '" width="94" height="8" class="cd-pist"/>';
      o += '<path class="cd-rod" d="M' + x + ' ' + (CY0 + 68) + ' V' + (CY1 + 22) + '"/>';
      o += '<rect x="' + (x - 40) + '" y="' + (CY1 + 22) + '" width="80" height="40" rx="4" class="cd-drv"/>';
    });
    if (showLabels) o += labels('plumbing', sel, PLAB);
    return o + '</svg>';
  }

  /* -------------------------------------------------------------- viewer */
  var ov = null, root = null, lastFocus = null;
  var S = { ctx: '', view: 'cutaway', labels: true, selected: null };

  function seg(key, items) {
    return '<div class="eq-seg" role="group" data-seg="' + key + '">' + items.map(function (it) {
      return '<button type="button" data-v="' + it[0] + '" aria-pressed="false">' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function frame() {
    root.innerHTML =
      '<header class="bd-head">' +
        '<div class="bd-titles"><span class="bd-eyebrow">Cell Details</span><h2>' + esc(CELL.name) + '</h2><span class="bd-variant">' + esc(CELL.variant) + '</span></div>' +
        '<p class="bd-ctx" data-ref="ctx"></p>' +
        '<button type="button" class="ui-btn ui-btn-primary bd-close" data-act="close">' + BACK + '<span>Back to Procedure</span></button>' +
      '</header>' +
      '<div class="eq-bar">' +
        seg('view', [['exterior', 'Exterior'], ['cutaway', 'Cutaway'], ['plumbing', 'Plumbing']]) +
        '<label class="eq-sw"><input type="checkbox" data-sw="labels"><span></span>Labels</label>' +
      '</div>' +
      '<div class="eq-main">' +
        '<section class="eq-stage">' +
          '<div class="eq-stage-head"><h3>' + esc(CELL.name) + '</h3><span class="eq-tag" data-ref="tag"></span><span class="eq-basis">Pump B left · Pump A right</span></div>' +
          '<div class="eq-view"><div class="eq-2d cd-2d" data-ref="d2"></div><p class="eq-help" data-ref="help"></p></div>' +
        '</section>' +
        '<aside class="eq-side" aria-label="Cell parts and operating principle">' +
          '<div class="eq-info" data-ref="info" aria-live="polite"></div>' +
          '<h4 class="eq-h">Operating principle</h4><div class="eq-about bd-principle">' + CELL.principle.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' +
          '<h4 class="eq-h">Parts</h4><div class="eq-parts" data-ref="parts">' + Object.keys(CELL.parts).map(function (id) {
            var p = CELL.parts[id];
            return '<button type="button" class="eq-part" data-part="' + id + '" aria-pressed="false">' + esc(p.n) + (p.internal ? '<small>internal</small>' : '') + '</button>';
          }).join('') + '</div>' +
          '<h4 class="eq-h">About this cell</h4><div class="eq-about">' + CELL.about.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '<p class="eq-basis2">' + esc(CELL.basis) + '</p></div>' +
          '<p class="bd-note">General equipment view. It does not show live readings or valve states from the procedure; piston positions in the cutaway are illustrative.</p>' +
        '</aside>' +
      '</div>';
  }
  function ref(n) { return root.querySelector('[data-ref="' + n + '"]'); }

  var TAG = { exterior: 'EXTERIOR', cutaway: 'CUTAWAY · TRAINING SECTION', plumbing: 'PLUMBING · SCHEMATIC ASSUMPTION' };
  function render() {
    root.querySelectorAll('[data-seg] button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === S.view ? 'true' : 'false'); });
    root.querySelector('[data-sw="labels"]').checked = S.labels;
    ref('ctx').textContent = S.ctx ? 'On this page: ' + S.ctx : '';
    ref('tag').textContent = TAG[S.view];
    ref('tag').className = 'eq-tag' + (S.view !== 'exterior' ? ' cut' : '');
    ref('help').textContent = 'Click a label or a name in the parts list to read about that part';
    var title = CELL.name + ', ' + S.view + ' view';
    ref('d2').innerHTML = S.view === 'plumbing' ? plumbing(S.labels, S.selected, title) : device(S.view, S.labels, S.selected, title);
    ref('parts').querySelectorAll('.eq-part').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-part') === S.selected ? 'true' : 'false'); });
    info();
  }
  var flag = '';
  function info() {
    var p = S.selected && CELL.parts[S.selected], el = ref('info');
    if (!p) { el.innerHTML = '<h4>Select a part</h4><p>Click a label or a name in the parts list.</p>'; return; }
    var note = flag || (p.in.indexOf(S.view) < 0 ? 'Not drawn in this view: switch to ' + (p.in.indexOf('cutaway') >= 0 ? 'Cutaway' : 'Exterior') + ' to see it.' : p.internal && S.view === 'cutaway' ? 'Internal part, shown in the cutaway.' : '');
    flag = '';
    el.innerHTML = '<h4>' + esc(p.n) + '</h4><p>' + esc(p.d) + '</p>' + (note ? '<p class="eq-flag">' + esc(note) + '</p>' : '');
  }
  function select(id, fromList) {
    var p = id && CELL.parts[id];
    S.selected = p ? id : null;
    if (p && fromList && p.in.indexOf(S.view) < 0) {
      S.view = p.in.indexOf('cutaway') >= 0 ? 'cutaway' : 'exterior';
      flag = 'Not drawn in the previous view: switched to ' + (S.view === 'cutaway' ? 'Cutaway' : 'Exterior') + ' to show it.';
    }
    render();
    if (!fromList) { var f = root.querySelector('.pb-lab[data-part="' + S.selected + '"]'); if (f) f.focus(); }
  }

  /* -------------------------------------------------------------- events */
  function onClick(e) {
    var t = e.target;
    if (t === ov) { close(); return; }
    var act = t.closest('[data-act]');
    if (act) { if (act.getAttribute('data-act') === 'close') close(); return; }
    var sb = t.closest('[data-seg] button');
    if (sb) { var v = sb.getAttribute('data-v'); if (S.view !== v) { S.view = v; render(); } return; }
    var part = t.closest('[data-part]');
    if (part) select(part.getAttribute('data-part'), !!t.closest('.eq-parts'));
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.pb-lab[data-part]')) { e.preventDefault(); select(e.target.getAttribute('data-part'), false); }
    if (e.key === 'Tab') {                                         // keep focus inside the dialog
      var f = [].filter.call(root.querySelectorAll('button, [tabindex="0"], input'), function (x) { return x.offsetParent || x.closest('svg'); });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  function onChange(e) {
    if (e.target.getAttribute('data-sw') === 'labels') { S.labels = e.target.checked; render(); }
  }

  /* ----------------------------------------------------------------- API */
  function open(ctx) {
    if (window.BottleDetails && BottleDetails.isOpen()) BottleDetails.close();
    if (window.SpmcDetails && SpmcDetails.isOpen()) SpmcDetails.close();
    if (window.FlashDetails && FlashDetails.isOpen()) FlashDetails.close();
    if (ov) close();
    lastFocus = document.activeElement;
    if (window.PC && PC.hold) PC.hold(true, true);                 // pause; restore the previous playback on close
    S.view = 'cutaway'; S.selected = null; S.ctx = ctx || '';
    ov = document.createElement('div'); ov.className = 'bd-ov';
    root = document.createElement('div'); root.className = 'bd-win eq';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Cell Details');
    ov.appendChild(root); document.body.appendChild(ov);
    document.documentElement.classList.add('bd-open');
    ov.addEventListener('click', onClick); ov.addEventListener('keydown', onKey); ov.addEventListener('change', onChange);
    frame(); render();
    var c = root.querySelector('[data-act="close"]'); if (c) c.focus();
  }
  function close() {
    if (!ov) return;
    ov.removeEventListener('click', onClick); ov.removeEventListener('keydown', onKey); ov.removeEventListener('change', onChange);
    ov.remove(); ov = null; root = null;
    document.documentElement.classList.remove('bd-open');
    if (window.PC && PC.hold) PC.hold(false);
    if (lastFocus && lastFocus.isConnected && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }

  /* delegated triggers: Cell Details buttons and pills, keyboard */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('#app [data-cd-open]');
    if (el) { e.preventDefault(); open(el.getAttribute('data-cd-ctx') || ''); }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('#app [data-cd-open][tabindex]')) { e.preventDefault(); open(e.target.getAttribute('data-cd-ctx') || ''); }
  });

  window.CellDetails = { open: open, close: close, isOpen: function () { return !!ov; }, state: function () { return Object.assign({}, S, { open: !!ov }); } };
})();
