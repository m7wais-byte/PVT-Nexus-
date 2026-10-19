/* ==========================================================================
   EquipmentLibrary — Dashboard > Equipment Library (screen key 'equipment')

   Native DOM module (same pattern as RecombSim.js), mounted by
   Main.syncEquip() into the host <div> of screens/showEquip.js.

   Catalogue: Oil Sample Bottle, Gas Sample Bottle (equipment/equipment-data.js).
   Inspection: the approved designs —
     2D technical drawing  equipment/bottle-draw.js  (loaded with the app, plain SVG)
     3D model              equipment/bottle3d.js     (ES module + three.js, imported only
                                                     when the user first opens the 3D view)
   Exterior / cutaway, upright / horizontal, labels, and part selection (2D label,
   3D model, 3D label or parts list) with a short explanation in the side panel.
   No process values or procedures are shown here.
   ========================================================================== */
(function () {
  'use strict';

  var E = function () { return window.EQUIPMENT; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ARROW = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var BACK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var host = null, root = null, viewer = null, loading = null;
  var S = { page: 'catalogue', kind: 'oil', mode: '2d', view: 'exterior', orient: 'upright', labels: true, auto: false, selected: null };

  /* ------------------------------------------------------------ catalogue */
  function catalogue() {
    var h = '<div class="eq-cat" role="list">';
    E().order.forEach(function (k) {
      var b = E()[k], parts = Object.keys(b.parts).filter(function (id) { return !b.parts[id].internal; }).slice(0, 4);
      h += '<button type="button" class="eq-card" role="listitem" data-open="' + k + '" aria-label="Inspect the ' + esc(b.name) + '">' +
        '<span class="eq-thumb">' + window.PBDraw.svg(k, 'exterior', 'upright', { ns: 'eqth' + k, labels: false, tight: true }) + '</span>' +
        '<span class="eq-txt"><span class="eq-type">' + esc(b.type) + '</span><h3>' + esc(b.name) + '</h3><p>' + esc(b.summary) + '</p>' +
        '<ul>' + parts.map(function (id) { return '<li>' + esc(b.parts[id].n) + '</li>'; }).join('') + '</ul>' +
        '<span class="eq-go"><i>' + ARROW + '</i>Inspect in 2D and 3D</span></span></button>';
    });
    h += '</div><p class="eq-note">Representative equipment designs for orientation and training. They are not replicas of a specific manufacturer\'s product.</p>';
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

  /* --------------------------------------------------------------- events */
  function onClick(e) {
    var t = e.target;
    var open = t.closest('[data-open]');
    if (open) { S.page = 'detail'; S.kind = open.getAttribute('data-open'); S.selected = null; render(); return; }
    var act = t.closest('[data-act]');
    if (act) {
      var a = act.getAttribute('data-act');
      if (a === 'catalogue') { S.page = 'catalogue'; render(); }
      if (a === 'reset' && viewer) viewer.resetCamera();
      return;
    }
    var sb = t.closest('[data-seg] button');
    if (sb) {
      var key = sb.parentNode.getAttribute('data-seg'), v = sb.getAttribute('data-v');
      if (S[key] === v) return;
      S[key] = v;
      if (key === 'kind') S.selected = null;
      detail(); return;
    }
    var part = t.closest('[data-part]');
    if (part && !t.closest('.v3-labels')) select(part.getAttribute('data-part'), !!t.closest('.eq-parts'));
  }
  function onKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.pb-lab[data-part]')) { e.preventDefault(); select(e.target.getAttribute('data-part'), false); }
  }
  function onChange(e) {
    var sw = e.target.getAttribute('data-sw'); if (!sw) return;
    S[sw] = e.target.checked; detail();
  }

  // rebuilding the page replaces the 3D canvas host, so the viewer is released first (re-created on demand)
  function render() {
    if (viewer) { viewer.destroy(); viewer = null; window.EQ3D = null; }
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
      if (root) { root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); root.removeEventListener('change', onChange); root.remove(); }
      root = null; host = null;
    },
    open: function (kind) { if (!root) return; S.page = 'detail'; S.kind = kind; S.selected = null; render(); },   // review hook
    state: function () { return Object.assign({}, S, { viewer: !!viewer }); }
  };
})();
