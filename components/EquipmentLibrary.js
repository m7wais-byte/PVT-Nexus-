/* ==========================================================================
   EquipmentLibrary — Dashboard > Equipment Library (screen key 'equipment')

   Native DOM module (same pattern as RecombSim.js), mounted by
   Main.syncEquip() into the host <div> of screens/showEquip.js.

   Catalogue: Oil Sample Bottle, Gas Sample Bottle, MRMS (equipment/equipment-data.js).
   Inspection: the approved designs —
     2D technical drawing  equipment/bottle-draw.js  (loaded with the app, plain SVG)
     3D model              equipment/bottle3d.js     (ES module + three.js, imported only
                                                     when the user first opens the 3D view)
   Exterior / cutaway, upright / horizontal, labels, and part selection (2D label,
   3D model, 3D label or parts list) with a short explanation in the side panel.
   No process values or procedures are shown here.

   MRMS (MDT Multisample Module) has its own page (mr* functions below):
     Module assembly · SPMC chamber · Operating principle
     2D  equipment/mrms-draw.js (MRDraw)      principle  equipment/mrms-principle.js (MRPrinciple)
     3D  equipment/mrms3d.js (imported on first use, like bottle3d.js)
   ========================================================================== */
(function () {
  'use strict';

  var E = function () { return window.EQUIPMENT; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ARROW = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var BACK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var host = null, root = null, viewer = null, loading = null;
  var mview = null, mloading = null, player = null;            // MRMS page: 3D viewer, Operating Principle player
  var S = { page: 'catalogue', kind: 'oil', mode: '2d', view: 'exterior', orient: 'upright', labels: true, auto: false, selected: null,
            sub: 'module', chamber: 1, bg: '' };

  /* ------------------------------------------------------------ catalogue */
  function catalogue() {
    var h = '<div class="eq-cat" role="list">';
    (E().catalogue || E().order).forEach(function (k) {
      if (k === 'mrms') { h += mrCard(); return; }
      var b = E()[k], parts = Object.keys(b.parts).filter(function (id) { return !b.parts[id].internal; }).slice(0, 4);
      h += '<button type="button" class="eq-card" role="listitem" data-open="' + k + '" aria-label="Inspect the ' + esc(b.name) + '">' +
        '<span class="eq-thumb">' + window.PBDraw.svg(k, 'exterior', 'upright', { ns: 'eqth' + k, labels: false, tight: true }) + '</span>' +
        '<span class="eq-txt"><span class="eq-type">' + esc(b.type) + '</span><h3>' + esc(b.name) + '</h3><p>' + esc(b.summary) + '</p>' +
        '<ul>' + parts.map(function (id) { return '<li>' + esc(b.parts[id].n) + '</li>'; }).join('') + '</ul>' +
        '<span class="eq-go"><i>' + ARROW + '</i>Inspect in 2D and 3D</span></span></button>';
    });
    h += '</div><p class="eq-note">Representative equipment designs for orientation and training. They are not replicas of a specific manufacturer\'s product. The MRMS entry is an educational representation based on published SLB descriptions.</p>';
    root.innerHTML = h;
  }

  /* --------------------------------------------------------- inspection page */
  function seg(key, items) {
    return '<div class="eq-seg" role="group" data-seg="' + key + '">' + items.map(function (it) {
      return '<button type="button" data-v="' + it[0] + '" aria-pressed="false">' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function detailFrame() {
    root.innerHTML =
      '<div class="eq-bar">' +
        '<button type="button" class="ui-btn ui-btn-ghost" data-act="catalogue">' + BACK + '<span>All equipment</span></button>' +
        '<span class="eq-sep"></span>' +
        seg('kind', E().order.map(function (k) { return [k, esc(E()[k].name)]; })) +
        seg('mode', [['2d', '2D technical view'], ['3d', '3D view']]) +
        seg('view', [['exterior', 'Exterior'], ['cutaway', 'Cutaway']]) +
        seg('orient', [['upright', 'Upright'], ['horizontal', 'Horizontal']]) +
        '<label class="eq-sw"><input type="checkbox" data-sw="labels"><span></span>Labels</label>' +
        '<span class="eq-3d-only" hidden><button type="button" class="ui-btn ui-btn-ghost" data-act="reset">Reset camera</button></span>' +
        '<label class="eq-sw eq-3d-only" hidden><input type="checkbox" data-sw="auto"><span></span>Auto-rotate</label>' +
      '</div>' +
      '<div class="eq-main">' +
        '<section class="eq-stage">' +
          '<div class="eq-stage-head"><h3 data-ref="title"></h3><span class="eq-tag" data-ref="tag"></span><span class="eq-basis" data-ref="basis"></span></div>' +
          '<div class="eq-view">' +
            '<div class="eq-2d" data-ref="d2"></div>' +
            '<div class="eq-3d" data-ref="d3" hidden><div class="v3-canvas" data-ref="canvas"></div><div class="v3-labels" data-ref="labels"></div><p class="eq-msg" data-ref="msg" hidden></p></div>' +
            '<p class="eq-help" data-ref="help"></p>' +
          '</div>' +
        '</section>' +
        '<aside class="eq-side" aria-label="Parts">' +
          '<div class="eq-info" data-ref="info" aria-live="polite"></div>' +
          '<h4 class="eq-h">Parts</h4><div class="eq-parts" data-ref="parts"></div>' +
          '<h4 class="eq-h">About this bottle</h4><div class="eq-about" data-ref="about"></div>' +
        '</aside>' +
      '</div>';
  }
  function ref(n) { return root.querySelector('[data-ref="' + n + '"]'); }

  function detail() {
    if (S.kind === 'mrms') { mrDetail(); return; }
    if (!root.querySelector('.eq-main')) detailFrame();
    var b = E()[S.kind], three = S.mode === '3d';
    root.querySelectorAll('[data-seg]').forEach(function (g) {
      var v = S[g.getAttribute('data-seg')];
      g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === v ? 'true' : 'false'); });
    });
    root.querySelector('[data-sw="labels"]').checked = S.labels;
    root.querySelector('[data-sw="auto"]').checked = S.auto;
    root.querySelectorAll('.eq-3d-only').forEach(function (x) { x.hidden = !three; });
    ref('title').textContent = b.name;
    ref('tag').textContent = S.view === 'cutaway' ? (three ? 'CUTAWAY · QUARTER SECTION' : 'CUTAWAY · SECTION ON AXIS') : 'EXTERIOR';
    ref('tag').className = 'eq-tag' + (S.view === 'cutaway' ? ' cut' : '');
    ref('basis').textContent = b.type;
    ref('help').textContent = three ? 'Drag to rotate · scroll or pinch to zoom · right-drag or two-finger drag to pan · click a part to inspect it'
      : 'Click a label or a name in the parts list to read about that part';
    ref('d2').hidden = three; ref('d3').hidden = !three;
    if (!three) draw2d();
    partsList(); about(); info();
    if (three) show3d(); else if (viewer) viewer.pause();
  }
  function draw2d() {
    ref('d2').innerHTML = window.PBDraw.svg(S.kind, S.view, S.orient, { ns: 'eq2d', labels: S.labels, selected: S.selected, title: E()[S.kind].name + ', ' + S.view + ' view' });
  }
  function partsList() {
    var P = E()[S.kind].parts, el = ref('parts');
    if (el.getAttribute('data-k') !== S.kind) {
      el.innerHTML = Object.keys(P).map(function (id) {
        return '<button type="button" class="eq-part" data-part="' + id + '" aria-pressed="false">' + esc(P[id].n) + (P[id].internal ? '<small>internal</small>' : '') + '</button>';
      }).join('');
      el.setAttribute('data-k', S.kind);
    }
    el.querySelectorAll('.eq-part').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-part') === S.selected ? 'true' : 'false'); });
  }
  function about() {
    var b = E()[S.kind];
    ref('about').innerHTML = b.about.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '<p class="eq-basis2">' + esc(b.basis) + '</p>';
  }
  var flag = '';
  function info() {
    var p = S.selected && E()[S.kind].parts[S.selected], el = ref('info');
    if (!p) { el.innerHTML = '<h4>Select a part</h4><p>Click a label' + (S.mode === '3d' ? ', a part on the model,' : '') + ' or a name in the parts list.</p>'; return; }
    var note = flag || (p.internal ? (S.view === 'cutaway' ? 'Internal part, shown in the cutaway.' : 'Internal part: switch to Cutaway to see it.') : '');
    flag = '';
    el.innerHTML = '<h4>' + esc(p.n) + '</h4><p>' + esc(p.d) + '</p>' + (note ? '<p class="eq-flag">' + esc(note) + '</p>' : '');
  }
  function select(id, fromList) {
    var p = id && E()[S.kind].parts[id];
    S.selected = p ? id : null;
    if (p && p.internal && S.view !== 'cutaway' && fromList) { S.view = 'cutaway'; flag = 'Internal part: switched to Cutaway to show it.'; }
    if (S.mode === '3d' && viewer) sync3d();
    detail();
  }

  /* ----------------------------------------------------------------- 3D */
  // apply the page state to the viewer; set() reports the viewer's own selection, so the page's is restored after it
  function sync3d() { var keep = S.selected; viewer.set(state3d()); if (keep) viewer.select(keep); }
  function state3d() { return { bottle: S.kind, cut: S.view === 'cutaway', horiz: S.orient === 'horizontal', labels: S.labels, auto: S.auto }; }
  function load3d() {
    if (window.PB3DReady) return window.PB3DReady;                // single-file preview build
    return import(new URL('equipment/bottle3d.js', document.baseURI).href);   // relative to index.html, not this file
  }
  function show3d() {
    if (viewer) { viewer.resume(); sync3d(); return; }
    if (loading) return;
    var msg = ref('msg'); msg.hidden = false; msg.className = 'eq-msg'; msg.textContent = 'Loading 3D view…';
    loading = load3d().then(function (M) {
      loading = null;
      if (!root || !root.isConnected) return;                       // left the page while loading
      viewer = M.mount(ref('canvas'), ref('labels'), {
        onSelect: function (id) { if (id !== S.selected) { S.selected = id; partsList(); info(); } },
        onNeedCut: function () { S.view = 'cutaway'; flag = 'Internal part: switched to Cutaway to show it.'; detail(); }
      });
      if (!viewer) { msg.className = 'eq-msg err'; msg.textContent = 'WebGL is not available in this browser, so the 3D view cannot be shown. The 2D technical view is still available.'; return; }
      msg.hidden = true;
      window.EQ3D = viewer;                                        // review hook
      if (S.mode === '3d') sync3d();
    }).catch(function (e) {
      loading = null;
      if (!root) return;
      msg.className = 'eq-msg err'; msg.textContent = 'The 3D view could not be loaded (' + e.message + '). The 2D technical view is still available.';
    });
  }

  /* =================================================================== MRMS
     Module assembly (module) · SPMC chamber (spmc) · Operating principle (principle) */
  function mrCard() {
    var m = E().mrms;
    return '<button type="button" class="eq-card" role="listitem" data-open="mrms" aria-label="Inspect the ' + esc(m.name) + '">' +
      '<span class="eq-thumb">' + window.MRDraw.svg('module', 'exterior', 'upright', { ns: 'eqthmr', tight: true }) + '</span>' +
      '<span class="eq-txt"><span class="eq-type">' + esc(m.type) + '</span><h3>' + esc(m.name) + '</h3><p>' + esc(m.summary) + '</p>' +
      '<ul>' + m.chips.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
      '<span class="eq-go"><i>' + ARROW + '</i>Module, chamber and principle</span></span></button>';
  }
  function mrParts() { return S.sub === 'module' ? E().mrms.parts : E().spmc.parts; }
  function mrFrame() {
    root.innerHTML =
      '<div class="eq-bar">' +
        '<button type="button" class="ui-btn ui-btn-ghost" data-act="catalogue">' + BACK + '<span>All equipment</span></button>' +
        '<span class="eq-sep"></span>' +
        seg('sub', [['module', 'Module assembly'], ['spmc', 'SPMC chamber'], ['principle', 'Operating principle']]) +
        '<span class="mr-insp">' + seg('mode', [['2d', '2D technical view'], ['3d', '3D view']]) +
        seg('view', [['exterior', 'Exterior'], ['cutaway', 'Cutaway']]) +
        seg('orient', [['upright', 'Upright'], ['horizontal', 'Horizontal']]) + '</span>' +
        '<label class="eq-sw"><input type="checkbox" data-sw="labels"><span></span>Labels</label>' +
        '<label class="eq-sw"><input type="checkbox" data-sw="lightbg"><span></span>Light bg</label>' +
      '</div>' +
      '<div class="eq-main">' +
        '<section class="eq-stage" data-ref="stage">' +
          '<div class="eq-stage-head"><button type="button" class="ui-btn ui-btn-ghost mr-back" data-act="toModule" data-ref="back" hidden>' + BACK + '<span>Back to module assembly</span></button>' +
            '<h3 data-ref="title"></h3><span class="eq-tag" data-ref="tag"></span><span class="eq-basis" data-ref="basis"></span>' +
            '<span class="eq-3d-only mr-cam" hidden><label class="eq-sw"><input type="checkbox" data-sw="auto"><span></span>Auto-rotate</label>' +
            '<button type="button" class="ui-btn ui-btn-ghost" data-act="reset">Reset camera</button></span></div>' +
          '<div class="eq-view">' +
            '<div class="eq-2d" data-ref="d2"></div>' +
            '<div class="eq-3d" data-ref="d3" hidden><div class="v3-canvas" data-ref="canvas"></div><div class="v3-labels" data-ref="labels"></div><p class="eq-msg" data-ref="msg" hidden></p></div>' +
            '<div class="mr-pr" data-ref="pr" hidden></div>' +
            '<div class="mr-legend" data-ref="legend" hidden></div>' +
            '<p class="eq-help" data-ref="help"></p>' +
          '</div>' +
        '</section>' +
        '<aside class="eq-side" aria-label="Parts">' +
          '<div class="eq-info" data-ref="info" aria-live="polite"></div>' +
          '<div class="mr-explain" data-ref="explain" hidden></div>' +
          '<div class="mr-legend mr-legend-side" data-ref="legendSide" hidden></div>' +
          '<h4 class="eq-h" data-ref="partsH">Parts</h4><div class="eq-parts" data-ref="parts"></div>' +
          '<h4 class="eq-h" data-ref="aboutH"></h4><div class="eq-about" data-ref="about"></div>' +
        '</aside>' +
      '</div>';
  }
  function mrBg() {
    if (S.bg) return S.bg;
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
  function mrDetail() {
    if (!root.querySelector('.mr-insp')) mrFrame();
    var pr = S.sub === 'principle', three = S.mode === '3d' && !pr, mod = S.sub === 'module', cut = S.view === 'cutaway';
    var bg = mrBg();
    root.querySelectorAll('[data-seg]').forEach(function (g) {
      var v = S[g.getAttribute('data-seg')];
      g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === v ? 'true' : 'false'); });
    });
    root.querySelector('.mr-insp').hidden = pr;
    root.querySelector('[data-sw="labels"]').checked = S.labels;
    root.querySelector('[data-sw="lightbg"]').checked = bg === 'light';
    root.querySelector('[data-sw="auto"]').checked = S.auto;
    root.querySelectorAll('.eq-3d-only').forEach(function (x) { x.hidden = !three; });
    var st = ref('stage'); st.classList.toggle('eq-bg-light', bg === 'light'); st.classList.toggle('eq-bg-dark', bg === 'dark');
    var item = mod ? E().mrms : E().spmc;
    ref('back').hidden = S.sub !== 'spmc';
    ref('title').textContent = mod ? 'MRMS — Multisample Module' : pr ? 'SPMC — Operating Principle' : 'SPMC — Single-Phase Multisample Chamber';
    ref('tag').textContent = pr ? 'EDUCATIONAL SEQUENCE' : S.sub === 'spmc' ? 'CHAMBER ' + S.chamber + ' · ' + (cut ? (three ? 'QUARTER SECTION' : 'SECTION ON AXIS') : 'EXTERIOR')
      : cut ? (three ? 'CUTAWAY · HALF SECTION' : 'CUTAWAY · SECTION ON AXIS') : 'EXTERIOR';
    ref('tag').className = 'eq-tag' + (cut && !pr ? ' cut' : '');
    ref('basis').textContent = mod ? 'Educational representation · six chambers' : 'SPMC-T · educational representation';
    ref('help').textContent = pr ? '' : three ? 'Drag to rotate · scroll or pinch to zoom · right-drag or two-finger drag to pan · click a part to inspect it' + (mod ? ' · double-click a chamber to open it' : '')
      : 'Click a label or a name in the parts list to read about that part' + (mod ? ' · double-click a chamber to open it' : '');
    ref('d2').hidden = three || pr; ref('d3').hidden = !three; ref('pr').hidden = !pr;
    mrLegend(pr, cut);
    ref('info').hidden = pr; ref('explain').hidden = !pr;
    ref('partsH').hidden = pr; ref('parts').hidden = pr;
    ref('aboutH').textContent = mod ? 'About the MRMS' : 'About the SPMC';
    ref('about').innerHTML = item.about.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '<p class="eq-basis2">' + esc(item.basis) + '</p>';
    if (pr) {
      if (mview) mview.pause();
      if (!player) player = window.MRPrinciple.mount(ref('pr'), ref('explain'), { labels: S.labels });
      else player.labels(S.labels);
      return;
    }
    if (player) { player.destroy(); player = null; }
    if (!three) mrDraw2d();
    mrPartsList(); mrInfo();
    if (three) mrShow3d(); else if (mview) mview.pause();
  }
  function mrLegend(pr, cut) {
    var L = ref('legend'), C = window.MRDraw.COL, sw = { res: C.res.sw, comp: C.comp.sw, n2: C.n2.sw, metal: 'metal' };
    var show = pr || (cut && S.sub === 'spmc') || (cut && S.sub === 'module'), side = ref('legendSide');
    side.hidden = !pr; if (pr) { L.hidden = true; L = side; } else L.hidden = !show;
    if (!show) return;
    var items = S.sub === 'module' && !pr ? [] : E().spmc.legend.map(function (l) { return '<li><i class="mr-sw' + (sw[l[0]] === 'metal' ? ' metal' : '') + '" style="' + (sw[l[0]] === 'metal' ? '' : 'background:' + sw[l[0]]) + '"></i>' + esc(l[1]) + '</li>'; });
    items.push('<li><i class="mr-sw fn"></i>Function block · design not published</li>');
    L.innerHTML = '<ul>' + items.join('') + '</ul>';
  }
  function mrDraw2d() {
    var mod = S.sub === 'module';
    ref('d2').innerHTML = window.MRDraw.svg(mod ? 'module' : 'spmc', S.view, S.orient, { ns: 'eqmr', labels: S.labels, selected: S.selected, num: S.chamber,
      title: (mod ? 'MRMS module' : 'SPMC chamber') + ', ' + S.view + ' view' });
  }
  function mrPartsList() {
    var P = mrParts(), el = ref('parts');
    if (el.getAttribute('data-k') !== S.sub) {
      el.innerHTML = Object.keys(P).map(function (id) {
        return '<button type="button" class="eq-part" data-part="' + id + '" aria-pressed="false">' + esc(P[id].n) + (P[id].internal ? '<small>internal</small>' : '') + '</button>';
      }).join('');
      el.setAttribute('data-k', S.sub);
    }
    el.querySelectorAll('.eq-part').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-part') === S.selected ? 'true' : 'false'); });
  }
  function mrInfo() {
    var p = S.selected && mrParts()[S.selected], el = ref('info');
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
  function mrSelect(id, fromList) {
    var p = id && mrParts()[id];
    S.selected = p ? id : null;
    if (p && p.internal && !p.chamber && S.view !== 'cutaway' && fromList) { S.view = 'cutaway'; flag = 'Internal part: switched to Cutaway to show it.'; }
    if (S.mode === '3d' && mview) mrSync3d();
    mrDetail();
  }
  function mrSub(v, sel) {
    if (S.sub === v && !sel) return;
    S.sub = v; S.selected = sel || null;
    ref('parts').removeAttribute('data-k');
    mrDetail();
  }
  function mrOpenChamber(n) {
    S.chamber = n || 1;
    if (S.view !== 'cutaway') S.view = 'cutaway';                   // the chamber is opened to show its internals
    mrSub('spmc');
  }
  /* 3D: equipment/mrms3d.js, imported on first use */
  function mrSync3d() { var keep = S.selected; mview.set({ item: S.sub === 'module' ? 'module' : 'spmc', cut: S.view === 'cutaway', horiz: S.orient === 'horizontal', labels: S.labels, auto: S.auto }); if (keep) mview.select(keep); }
  function mrShow3d() {
    if (mview) { mview.resume(); mrSync3d(); return; }
    if (mloading) return;
    var msg = ref('msg'); msg.hidden = false; msg.className = 'eq-msg'; msg.textContent = 'Loading 3D view…';
    mloading = (window.MR3DReady || import(new URL('equipment/mrms3d.js', document.baseURI).href)).then(function (M) {
      mloading = null;
      if (!root || !root.isConnected || S.kind !== 'mrms') return;
      mview = M.mount(ref('canvas'), ref('labels'), {
        onSelect: function (id) { if (id !== S.selected) { S.selected = id; mrPartsList(); mrInfo(); } },
        onNeedCut: function () { S.view = 'cutaway'; flag = 'Internal part: switched to Cutaway to show it.'; mrDetail(); },
        onOpen: function (n) { mrOpenChamber(n); }
      });
      if (!mview) { msg.className = 'eq-msg err'; msg.textContent = 'WebGL is not available in this browser, so the 3D view cannot be shown. The 2D technical view is still available.'; return; }
      msg.hidden = true;
      window.EQ3D = mview;                                         // review hook
      if (S.mode === '3d' && S.sub !== 'principle') mrSync3d();
    }).catch(function (e) {
      mloading = null;
      if (!root) return;
      msg.className = 'eq-msg err'; msg.textContent = 'The 3D view could not be loaded (' + e.message + '). The 2D technical view is still available.';
    });
  }
  function mrRelease() {
    if (mview) { mview.destroy(); mview = null; window.EQ3D = null; }
    if (player) { player.destroy(); player = null; }
  }

  /* --------------------------------------------------------------- events */
  function onClick(e) {
    var t = e.target;
    var open = t.closest('[data-open]');
    if (open) { S.page = 'detail'; S.kind = open.getAttribute('data-open'); S.selected = null; if (S.kind === 'mrms') S.sub = 'module'; render(); return; }
    if (t.closest('.mp')) return;                                  // Operating Principle player handles its own buttons
    var act = t.closest('[data-act]');
    if (act) {
      var a = act.getAttribute('data-act');
      if (a === 'catalogue') { S.page = 'catalogue'; render(); }
      if (a === 'reset' && viewer) viewer.resetCamera();
      if (a === 'reset' && mview) mview.resetCamera();
      if (a === 'openChamber') mrOpenChamber(+act.getAttribute('data-n'));
      if (a === 'toModule') mrSub('module', 'ch' + S.chamber);
      return;
    }
    var sb = t.closest('[data-seg] button');
    if (sb) {
      var key = sb.parentNode.getAttribute('data-seg'), v = sb.getAttribute('data-v');
      if (key === 'sub') { mrSub(v); return; }
      if (S[key] === v) return;
      S[key] = v;
      if (key === 'kind') S.selected = null;
      detail(); return;
    }
    var part = t.closest('[data-part]');
    // MRMS 2D: a double-click on a chamber opens it (the first click re-draws the SVG, so a dblclick event would not reach it)
    if (part && e.detail === 2 && S.kind === 'mrms' && S.sub === 'module' && part.matches('.mr-ch')) { mrOpenChamber(+part.getAttribute('data-part').slice(2)); return; }
    if (part && !t.closest('.v3-labels')) (S.kind === 'mrms' ? mrSelect : select)(part.getAttribute('data-part'), !!t.closest('.eq-parts'));
  }
  function onKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.pb-lab[data-part], .mr-ch[data-part]')) { e.preventDefault(); (S.kind === 'mrms' ? mrSelect : select)(e.target.getAttribute('data-part'), false); }
  }
  function onChange(e) {
    var sw = e.target.getAttribute('data-sw'); if (!sw) return;
    if (sw === 'lightbg') { S.bg = e.target.checked ? 'light' : 'dark'; detail(); return; }   // MRMS stage background
    S[sw] = e.target.checked; detail();
  }

  // rebuilding the page replaces the 3D canvas host, so the viewer is released first (re-created on demand)
  function render() {
    if (viewer) { viewer.destroy(); viewer = null; window.EQ3D = null; }
    mrRelease();
    if (S.page === 'catalogue') catalogue(); else { root.innerHTML = ''; detail(); }
  }

  /* ------------------------------------------------------------------ API */
  window.EquipmentLibrary = {
    mount: function (el) {
      if (host === el && root) return;
      this.unmount();
      host = el;
      root = document.createElement('div'); root.className = 'eq';
      host.appendChild(root);
      root.addEventListener('click', onClick);
      root.addEventListener('keydown', onKey);
      root.addEventListener('change', onChange);
      S.page = 'catalogue'; S.selected = null;
      render();
    },
    isMounted: function (el) { return !!root && host === el; },
    unmount: function () {
      if (viewer) { viewer.destroy(); viewer = null; window.EQ3D = null; }
      mrRelease();
      if (root) { root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); root.removeEventListener('change', onChange); root.remove(); }
      root = null; host = null;
    },
    open: function (kind, sub) { if (!root) return; S.page = 'detail'; S.kind = kind; S.selected = null; if (kind === 'mrms') S.sub = sub || 'module'; render(); },   // review hook
    state: function () { return Object.assign({}, S, { viewer: !!viewer, mview: !!mview, player: !!player }); },
    player: function () { return player; }
  };
})();
