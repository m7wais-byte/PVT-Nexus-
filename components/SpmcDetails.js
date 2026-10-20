/* ==========================================================================
   SpmcDetails — contextual "SPMC Details" overlay for the source SPMC chamber in
   Validation > Sample Transfer. Recovered from the former Equipment Library MRMS
   page (commit 5de19e1, EquipmentLibrary.js mr*) and adapted to the same overlay
   pattern as BottleDetails.js.

   Opened from any element with data-spmc-open (the SPMC drawing in the transfer
   scene and the "SPMC Details" buttons). Opens on the individual SPMC chamber;
   inside the viewer:
     MRMS module assembly   six individually selectable SPMC chambers on the
                            common flowline; open a chamber, return to the assembly
     SPMC chamber           2D / 3D, exterior / cutaway, upright / horizontal,
                            labels, part descriptions
   The downhole Operating Principle of the former Equipment Library is not
   included (VAPS does not perform that procedure).
   2D  equipment/mrms-draw.js (MRDraw)
   3D  equipment/mrms3d.js, imported on first use; destroyed on close

   Opening holds the procedure (PC.hold) exactly as Bottle Details does: the running
   transfer is paused through its own Pause action and its animations freeze;
   closing returns to the same step and quantities. Nothing in the viewer touches
   the transfer state.
   ========================================================================== */
(function () {
  'use strict';

  var E = function () { return window.EQUIPMENT; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ARROW = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var BACK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var ov = null, root = null, mview = null, mloading = null, lastFocus = null;
  var S = { sub: 'spmc', chamber: 1, ctx: '', mode: '2d', view: 'cutaway', orient: 'upright', labels: true, auto: false, selected: null, bg: '' };

  function seg(key, items) {
    return '<div class="eq-seg" role="group" data-seg="' + key + '">' + items.map(function (it) {
      return '<button type="button" data-v="' + it[0] + '" aria-pressed="false">' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function frame() {
    root.innerHTML =
      '<header class="bd-head">' +
        '<div class="bd-titles"><span class="bd-eyebrow">SPMC Details</span><h2 data-ref="name"></h2><span class="bd-variant">SPMC-T · educational</span></div>' +
        '<p class="bd-ctx" data-ref="ctx"></p>' +
        '<button type="button" class="ui-btn ui-btn-primary bd-close" data-act="close">' + BACK + '<span>Back to Transfer</span></button>' +
      '</header>' +
      '<div class="eq-bar">' +
        '<span class="sd-subs">' + seg('sub', [['module', 'MRMS module assembly'], ['spmc', 'SPMC chamber']]) + '</span>' +
        '<span class="mr-insp">' + seg('mode', [['2d', '2D technical view'], ['3d', '3D view']]) +
        seg('view', [['exterior', 'Exterior'], ['cutaway', 'Cutaway']]) +
        seg('orient', [['upright', 'Upright'], ['horizontal', 'Horizontal']]) + '</span>' +
        '<label class="eq-sw"><input type="checkbox" data-sw="labels"><span></span>Labels</label>' +
        '<label class="eq-sw"><input type="checkbox" data-sw="lightbg"><span></span>Light bg</label>' +
      '</div>' +
      '<div class="eq-main">' +
        '<section class="eq-stage" data-ref="stage">' +
          '<div class="eq-stage-head"><button type="button" class="ui-btn ui-btn-ghost mr-back" data-act="toModule" data-ref="back" hidden>' + BACK + '<span>Back to MRMS assembly</span></button>' +
            '<h3 data-ref="title"></h3><span class="eq-tag" data-ref="tag"></span><span class="eq-basis" data-ref="basis"></span>' +
            '<span class="eq-3d-only mr-cam" hidden><label class="eq-sw"><input type="checkbox" data-sw="auto"><span></span>Auto-rotate</label>' +
            '<button type="button" class="ui-btn ui-btn-ghost" data-act="reset">Reset camera</button></span></div>' +
          '<div class="eq-view">' +
            '<div class="eq-2d" data-ref="d2"></div>' +
            '<div class="eq-3d" data-ref="d3" hidden><div class="v3-canvas" data-ref="canvas"></div><div class="v3-labels" data-ref="labels"></div><p class="eq-msg" data-ref="msg" hidden></p></div>' +
            '<div class="mr-legend" data-ref="legend" hidden></div>' +
            '<p class="eq-help" data-ref="help"></p>' +
          '</div>' +
        '</section>' +
        '<aside class="eq-side" aria-label="Parts">' +
          '<div class="eq-info" data-ref="info" aria-live="polite"></div>' +
          '<h4 class="eq-h" data-ref="partsH">Parts</h4><div class="eq-parts" data-ref="parts"></div>' +
          '<h4 class="eq-h" data-ref="aboutH"></h4><div class="eq-about" data-ref="about"></div>' +
          '<p class="bd-note">General equipment view. It does not show live readings from the transfer.</p>' +
        '</aside>' +
      '</div>';
  }
  function ref(n) { return root.querySelector('[data-ref="' + n + '"]'); }
  function parts() { return S.sub === 'module' ? E().mrms.parts : E().spmc.parts; }
  function bg() {
    if (S.bg) return S.bg;
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function render() {
    var three = S.mode === '3d', mod = S.sub === 'module', cut = S.view === 'cutaway', b = bg();
    root.querySelectorAll('[data-seg]').forEach(function (g) {
      var v = S[g.getAttribute('data-seg')];
      g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === v ? 'true' : 'false'); });
    });
    root.querySelector('[data-sw="labels"]').checked = S.labels;
    root.querySelector('[data-sw="lightbg"]').checked = b === 'light';
    root.querySelector('[data-sw="auto"]').checked = S.auto;
    root.querySelectorAll('.eq-3d-only').forEach(function (x) { x.hidden = !three; });
    var st = ref('stage'); st.classList.toggle('eq-bg-light', b === 'light'); st.classList.toggle('eq-bg-dark', b === 'dark');
    var item = mod ? E().mrms : E().spmc;
    ref('name').textContent = mod ? 'MRMS — Multisample Module' : 'SPMC — Single-Phase Multisample Chamber';
    ref('ctx').textContent = S.ctx ? 'On this page: ' + S.ctx : '';
    ref('back').hidden = S.sub !== 'spmc';
    ref('title').textContent = mod ? 'MRMS module assembly' : 'SPMC chamber';
    ref('tag').textContent = !mod ? 'CHAMBER ' + S.chamber + ' · ' + (cut ? (three ? 'QUARTER SECTION' : 'SECTION ON AXIS') : 'EXTERIOR')
      : cut ? (three ? 'CUTAWAY · HALF SECTION' : 'CUTAWAY · SECTION ON AXIS') : 'EXTERIOR';
    ref('tag').className = 'eq-tag' + (cut ? ' cut' : '');
    ref('basis').textContent = mod ? 'Educational representation · six chambers' : 'SPMC-T · educational representation';
    ref('help').textContent = three ? 'Drag to rotate · scroll or pinch to zoom · right-drag or two-finger drag to pan · click a part to inspect it' + (mod ? ' · double-click a chamber to open it' : '')
      : 'Click a label or a name in the parts list to read about that part' + (mod ? ' · double-click a chamber to open it' : '');
    ref('d2').hidden = three; ref('d3').hidden = !three;
    legend(cut);
    ref('aboutH').textContent = mod ? 'About the MRMS' : 'About the SPMC';
    ref('about').innerHTML = item.about.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '<p class="eq-basis2">' + esc(item.basis) + '</p>';
    if (!three) draw2d();
    partsList(); info();
    if (three) show3d(); else if (mview) mview.pause();
  }
  function legend(cut) {
    var L = ref('legend'), C = window.MRDraw.COL, sw = { res: C.res.sw, comp: C.comp.sw, n2: C.n2.sw, metal: 'metal' };
    L.hidden = !cut;
    if (!cut) return;
    var items = S.sub === 'module' ? [] : E().spmc.legend.map(function (l) { return '<li><i class="mr-sw' + (sw[l[0]] === 'metal' ? ' metal' : '') + '" style="' + (sw[l[0]] === 'metal' ? '' : 'background:' + sw[l[0]]) + '"></i>' + esc(l[1]) + '</li>'; });
    items.push('<li><i class="mr-sw fn"></i>Function block · design not published</li>');
    L.innerHTML = '<ul>' + items.join('') + '</ul>';
  }
  function draw2d() {
    var mod = S.sub === 'module';
    ref('d2').innerHTML = window.MRDraw.svg(mod ? 'module' : 'spmc', S.view, S.orient, { ns: 'sdmr', labels: S.labels, selected: S.selected, num: S.chamber,
      title: (mod ? 'MRMS module' : 'SPMC chamber') + ', ' + S.view + ' view' });
  }
  function partsList() {
    var P = parts(), el = ref('parts');
    if (el.getAttribute('data-k') !== S.sub) {
      el.innerHTML = Object.keys(P).map(function (id) {
        return '<button type="button" class="eq-part" data-part="' + id + '" aria-pressed="false">' + esc(P[id].n) + (P[id].internal ? '<small>internal</small>' : '') + '</button>';
      }).join('');
      el.setAttribute('data-k', S.sub);
    }
    el.querySelectorAll('.eq-part').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-part') === S.selected ? 'true' : 'false'); });
  }
  var flag = '';
  function info() {
    var p = S.selected && parts()[S.selected], el = ref('info');
    if (!p) {
      el.innerHTML = S.sub === 'module'
        ? '<h4>Select a part or chamber</h4><p>Click a chamber, a label or a name in the parts list. Open any of the six chambers to inspect the SPMC in detail.</p>'
        : '<h4>Select a part</h4><p>Click a label' + (S.mode === '3d' ? ', a part on the model,' : '') + ' or a name in the parts list.</p>';
      return;
    }
    var note = flag || (p.internal && !p.chamber ? (S.view === 'cutaway' ? 'Internal part, shown in the cutaway.' : 'Internal part: switch to Cutaway to see it.') : '');
    flag = '';
    el.innerHTML = '<h4>' + esc(p.n) + '</h4><p>' + esc(p.d) + '</p>' + (note ? '<p class="eq-flag">' + esc(note) + '</p>' : '') +
      (p.chamber ? '<button type="button" class="ui-btn ui-btn-primary mr-open" data-act="openChamber" data-n="' + p.chamber + '">Open chamber ' + p.chamber + ' in detail' + ARROW + '</button>' : '');
  }
  function select(id, fromList) {
    var p = id && parts()[id];
    S.selected = p ? id : null;
    if (p && p.internal && !p.chamber && S.view !== 'cutaway' && fromList) { S.view = 'cutaway'; flag = 'Internal part: switched to Cutaway to show it.'; }
    if (S.mode === '3d' && mview) sync3d();
    render();
  }
  function sub(v, sel) {
    if (S.sub === v && !sel) return;
    S.sub = v; S.selected = sel || null;
    ref('parts').removeAttribute('data-k');
    render();
  }
  function openChamber(n) {
    S.chamber = n || 1;
    if (S.view !== 'cutaway') S.view = 'cutaway';                   // the chamber is opened to show its internals
    sub('spmc');
  }

  /* ----------------------------------------------------------------- 3D */
  function sync3d() { var keep = S.selected; mview.set({ item: S.sub === 'module' ? 'module' : 'spmc', cut: S.view === 'cutaway', horiz: S.orient === 'horizontal', labels: S.labels, auto: S.auto }); if (keep) mview.select(keep); }
  function show3d() {
    if (mview) { mview.resume(); sync3d(); return; }
    if (mloading) return;
    var msg = ref('msg'); msg.hidden = false; msg.className = 'eq-msg'; msg.textContent = 'Loading 3D view…';
    mloading = (window.MR3DReady || import(new URL('equipment/mrms3d.js', document.baseURI).href)).then(function (M) {
      mloading = null;
      if (!ov || !root) return;                                    // closed while loading
      mview = M.mount(ref('canvas'), ref('labels'), {
        onSelect: function (id) { if (id !== S.selected) { S.selected = id; partsList(); info(); } },
        onNeedCut: function () { S.view = 'cutaway'; flag = 'Internal part: switched to Cutaway to show it.'; render(); },
        onOpen: function (n) { openChamber(n); }
      });
      if (!mview) { msg.className = 'eq-msg err'; msg.textContent = 'WebGL is not available in this browser, so the 3D view cannot be shown. The 2D technical view is still available.'; return; }
      msg.hidden = true;
      window.EQ3D = mview;                                         // review hook
      if (S.mode === '3d') sync3d();
    }).catch(function (e) {
      mloading = null;
      if (!root) return;
      msg.className = 'eq-msg err'; msg.textContent = 'The 3D view could not be loaded (' + e.message + '). The 2D technical view is still available.';
    });
  }

  /* -------------------------------------------------------------- events */
  function onClick(e) {
    var t = e.target;
    if (t === ov) { close(); return; }
    var act = t.closest('[data-act]');
    if (act) {
      var a = act.getAttribute('data-act');
      if (a === 'close') close();
      if (a === 'reset' && mview) mview.resetCamera();
      if (a === 'openChamber') openChamber(+act.getAttribute('data-n'));
      if (a === 'toModule') sub('module', 'ch' + S.chamber);
      return;
    }
    var sb = t.closest('[data-seg] button');
    if (sb) {
      var key = sb.parentNode.getAttribute('data-seg'), v = sb.getAttribute('data-v');
      if (key === 'sub') { sub(v); return; }
      if (S[key] === v) return;
      S[key] = v;
      render(); return;
    }
    var part = t.closest('[data-part]');
    // 2D: a double-click on a chamber opens it (the first click re-draws the SVG, so a dblclick event would not reach it)
    if (part && e.detail === 2 && S.sub === 'module' && part.matches('.mr-ch')) { openChamber(+part.getAttribute('data-part').slice(2)); return; }
    if (part && !t.closest('.v3-labels')) select(part.getAttribute('data-part'), !!t.closest('.eq-parts'));
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.pb-lab[data-part], .mr-ch[data-part]')) { e.preventDefault(); select(e.target.getAttribute('data-part'), false); }
    if (e.key === 'Tab') {                                         // keep focus inside the dialog
      var f = [].filter.call(root.querySelectorAll('button, [tabindex="0"], input'), function (x) { return x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  function onChange(e) {
    var sw = e.target.getAttribute('data-sw'); if (!sw) return;
    if (sw === 'lightbg') { S.bg = e.target.checked ? 'light' : 'dark'; render(); return; }   // stage background only
    S[sw] = e.target.checked; render();
  }

  /* ----------------------------------------------------------------- API */
  function open(ctx) {
    if (window.BottleDetails && BottleDetails.isOpen()) BottleDetails.close();
    if (ov) close();
    lastFocus = document.activeElement;
    if (window.PC && PC.hold) PC.hold(true);
    S.sub = 'spmc'; S.chamber = 1; S.view = 'cutaway'; S.selected = null; S.ctx = ctx || '';
    ov = document.createElement('div'); ov.className = 'bd-ov';
    root = document.createElement('div'); root.className = 'bd-win eq';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'SPMC Details');
    ov.appendChild(root); document.body.appendChild(ov);
    document.documentElement.classList.add('bd-open');
    ov.addEventListener('click', onClick); ov.addEventListener('keydown', onKey); ov.addEventListener('change', onChange);
    frame(); render();
    var c = root.querySelector('[data-act="close"]'); if (c) c.focus();
  }
  function close() {
    if (!ov) return;
    if (mview) { mview.destroy(); mview = null; window.EQ3D = null; }
    ov.removeEventListener('click', onClick); ov.removeEventListener('keydown', onKey); ov.removeEventListener('change', onChange);
    ov.remove(); ov = null; root = null;
    document.documentElement.classList.remove('bd-open');
    if (window.PC && PC.hold) PC.hold(false);
    if (lastFocus && lastFocus.isConnected && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }

  /* delegated triggers: SPMC drawing, SPMC Details buttons, keyboard */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('#app [data-spmc-open]');
    if (el) { e.preventDefault(); open(el.getAttribute('data-spmc-ctx') || ''); }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('#app [data-spmc-open][tabindex]')) { e.preventDefault(); open(e.target.getAttribute('data-spmc-ctx') || ''); }
  });

  window.SpmcDetails = { open: open, close: close, isOpen: function () { return !!ov; },
    state: function () { return Object.assign({}, S, { open: !!ov, mview: !!mview }); } };
})();
