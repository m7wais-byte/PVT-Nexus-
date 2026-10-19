/* ==========================================================================
   BottleDetails — contextual "Bottle Details" overlay (replaces the former
   standalone Equipment Library).

   Opened from any element with data-bd-open="oil" | "oilN2" | "gas" |
   "oil|gas" (several types: a small selector opens first), e.g. the
   "Bottle Details" pill (BottleArt.pill) or a clickable bottle body
   (class bd-hit). data-bd-ctx = one line naming the bottle on that page.

   Full-screen overlay outside #app, using the approved bottle viewer:
     2D technical drawing  equipment/bottle-draw.js (PBDraw)
     3D model              equipment/bottle3d.js, imported on first use;
                           destroyed (renderer, geometry, textures) on close
   Exterior / cutaway, upright / horizontal, labels, clickable parts with
   short explanations, and the operating principle of the variant.

   Opening holds the procedure (PC.hold): a running stage is paused through
   its own Pause action and animations freeze; closing returns to the same
   stage and values, and the user resumes from the procedure panel.
   General equipment view only: no live readings.
   ========================================================================== */
(function () {
  'use strict';

  var E = function () { return window.EQUIPMENT; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var BACK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var NAME = { oil: 'Oil Sample Bottle', oilN2: 'Oil Sample Bottle', gas: 'Gas Sample Bottle' };

  var ov = null, root = null, viewer = null, loading = null, lastFocus = null, menu = null;
  var S = { kinds: ['oil'], kind: 'oil', ctx: '', mode: '2d', view: 'cutaway', orient: 'upright', labels: true, auto: false, selected: null };

  function seg(key, items) {
    return '<div class="eq-seg" role="group" data-seg="' + key + '">' + items.map(function (it) {
      return '<button type="button" data-v="' + it[0] + '" aria-pressed="false">' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function frame() {
    root.innerHTML =
      '<header class="bd-head">' +
        '<div class="bd-titles"><span class="bd-eyebrow">Bottle Details</span><h2 data-ref="name"></h2><span class="bd-variant" data-ref="variant"></span></div>' +
        '<p class="bd-ctx" data-ref="ctx"></p>' +
        '<button type="button" class="ui-btn ui-btn-primary bd-close" data-act="close">' + BACK + '<span>Back to Procedure</span></button>' +
      '</header>' +
      '<div class="eq-bar">' +
        '<span class="bd-kinds" data-ref="kinds"></span>' +
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
        '<aside class="eq-side" aria-label="Bottle parts and operating principle">' +
          '<div class="eq-info" data-ref="info" aria-live="polite"></div>' +
          '<h4 class="eq-h">Operating principle</h4><div class="eq-about bd-principle" data-ref="principle"></div>' +
          '<h4 class="eq-h">Parts</h4><div class="eq-parts" data-ref="parts"></div>' +
          '<h4 class="eq-h">About this bottle</h4><div class="eq-about" data-ref="about"></div>' +
          '<p class="bd-note">General equipment view. It does not show live readings from the procedure.</p>' +
        '</aside>' +
      '</div>';
  }
  function ref(n) { return root.querySelector('[data-ref="' + n + '"]'); }

  function render() {
    var b = E()[S.kind], three = S.mode === '3d';
    root.querySelectorAll('[data-seg]').forEach(function (g) {
      var v = S[g.getAttribute('data-seg')];
      g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === v ? 'true' : 'false'); });
    });
    root.querySelector('[data-sw="labels"]').checked = S.labels;
    root.querySelector('[data-sw="auto"]').checked = S.auto;
    root.querySelectorAll('.eq-3d-only').forEach(function (x) { x.hidden = !three; });
    ref('name').textContent = b.name;
    ref('variant').textContent = b.variant || '';
    ref('ctx').textContent = S.ctx ? 'On this page: ' + S.ctx : '';
    ref('kinds').innerHTML = S.kinds.length > 1 ? seg('kind', S.kinds.map(function (k) { return [k, esc(NAME[k])]; })) : '';
    ref('kinds').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === S.kind ? 'true' : 'false'); });
    ref('title').textContent = b.name + (S.kind === 'oilN2' ? ' · nitrogen-compensated' : '');
    ref('tag').textContent = S.view === 'cutaway' ? (three ? 'CUTAWAY · QUARTER SECTION' : 'CUTAWAY · SECTION ON AXIS') : 'EXTERIOR';
    ref('tag').className = 'eq-tag' + (S.view === 'cutaway' ? ' cut' : '');
    ref('basis').textContent = b.type;
    ref('help').textContent = three ? 'Drag to rotate · scroll or pinch to zoom · right-drag or two-finger drag to pan · click a part to inspect it'
      : 'Click a label or a name in the parts list to read about that part';
    ref('d2').hidden = three; ref('d3').hidden = !three;
    if (!three) ref('d2').innerHTML = window.PBDraw.svg(S.kind, S.view, S.orient, { ns: 'bd2d', labels: S.labels, selected: S.selected, title: b.name + ', ' + S.view + ' view' });
    ref('principle').innerHTML = (b.principle || []).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
    ref('about').innerHTML = b.about.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '<p class="eq-basis2">' + esc(b.basis) + '</p>';
    partsList(); info();
    if (three) show3d(); else if (viewer) viewer.pause();
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
    render();
  }

  /* ----------------------------------------------------------------- 3D */
  function sync3d() { var keep = S.selected; viewer.set({ bottle: S.kind, cut: S.view === 'cutaway', horiz: S.orient === 'horizontal', labels: S.labels, auto: S.auto }); if (keep) viewer.select(keep); }
  function show3d() {
    if (viewer) { viewer.resume(); sync3d(); return; }
    if (loading) return;
    var msg = ref('msg'); msg.hidden = false; msg.className = 'eq-msg'; msg.textContent = 'Loading 3D view…';
    loading = (window.PB3DReady || import(new URL('equipment/bottle3d.js', document.baseURI).href)).then(function (M) {
      loading = null;
      if (!ov || !root) return;                                    // closed while loading
      viewer = M.mount(ref('canvas'), ref('labels'), {
        onSelect: function (id) { if (id !== S.selected) { S.selected = id; partsList(); info(); } },
        onNeedCut: function () { S.view = 'cutaway'; flag = 'Internal part: switched to Cutaway to show it.'; render(); }
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

  /* -------------------------------------------------------------- events */
  function onClick(e) {
    var t = e.target;
    if (t === ov) { close(); return; }
    var act = t.closest('[data-act]');
    if (act) {
      var a = act.getAttribute('data-act');
      if (a === 'close') close();
      if (a === 'reset' && viewer) viewer.resetCamera();
      return;
    }
    var sb = t.closest('[data-seg] button');
    if (sb) {
      var key = sb.parentNode.getAttribute('data-seg'), v = sb.getAttribute('data-v');
      if (S[key] === v) return;
      S[key] = v;
      if (key === 'kind') S.selected = null;
      render(); return;
    }
    var part = t.closest('[data-part]');
    if (part && !t.closest('.v3-labels')) select(part.getAttribute('data-part'), !!t.closest('.eq-parts'));
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.pb-lab[data-part]')) { e.preventDefault(); select(e.target.getAttribute('data-part'), false); }
    if (e.key === 'Tab') {                                         // keep focus inside the dialog
      var f = [].filter.call(root.querySelectorAll('button, [tabindex="0"], input'), function (x) { return x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  function onChange(e) {
    var sw = e.target.getAttribute('data-sw'); if (!sw) return;
    S[sw] = e.target.checked; render();
  }

  /* ----------------------------------------------------------------- API */
  function open(spec, ctx) {
    closeMenu();
    var kinds = String(spec || 'oil').split('|').filter(function (k) { return E()[k]; });
    if (!kinds.length) kinds = ['oil'];
    if (ov) close();
    lastFocus = document.activeElement;
    if (window.PC && PC.hold) PC.hold(true);
    S.kinds = kinds; S.kind = kinds[0]; S.ctx = ctx || ''; S.selected = null;
    ov = document.createElement('div'); ov.className = 'bd-ov';
    root = document.createElement('div'); root.className = 'bd-win eq';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Bottle Details');
    ov.appendChild(root); document.body.appendChild(ov);
    document.documentElement.classList.add('bd-open');
    ov.addEventListener('click', onClick); ov.addEventListener('keydown', onKey); ov.addEventListener('change', onChange);
    frame(); render();
    var c = root.querySelector('[data-act="close"]'); if (c) c.focus();
  }
  function close() {
    if (!ov) return;
    if (viewer) { viewer.destroy(); viewer = null; window.EQ3D = null; }
    ov.removeEventListener('click', onClick); ov.removeEventListener('keydown', onKey); ov.removeEventListener('change', onChange);
    ov.remove(); ov = null; root = null;
    document.documentElement.classList.remove('bd-open');
    if (window.PC && PC.hold) PC.hold(false);
    if (lastFocus && lastFocus.isConnected && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }

  /* small selector when the page shows more than one bottle type */
  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  function openMenu(el, kinds, ctx) {
    closeMenu();
    var r = el.getBoundingClientRect();
    menu = document.createElement('div'); menu.className = 'bd-menu'; menu.setAttribute('role', 'menu');
    menu.innerHTML = '<p>Bottles on this page</p>' + kinds.map(function (k) {
      return '<button type="button" role="menuitem" data-k="' + k + '">' + esc(NAME[k]) + (k === 'oilN2' ? ' · nitrogen-compensated' : '') + '</button>';
    }).join('');
    document.body.appendChild(menu);
    var mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.left)) + 'px';
    menu.style.top = (r.bottom + mh + 8 < window.innerHeight ? r.bottom + 6 : Math.max(8, r.top - mh - 6)) + 'px';
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return;
      var k = b.getAttribute('data-k'), rest = kinds.filter(function (x) { return x !== k; });
      open([k].concat(rest).join('|'), ctx);
    });
    var f = menu.querySelector('button'); if (f) f.focus();
  }

  /* delegated triggers: pill, clickable bottle, keyboard */
  function trigger(el) {
    var spec = el.getAttribute('data-bd-open'), ctx = el.getAttribute('data-bd-ctx') || '';
    var kinds = spec.split('|');
    if (kinds.length > 1 && (el.classList.contains('bd-pill') || el.classList.contains('bd-btn'))) openMenu(el, kinds, ctx);
    else open(spec, ctx);
  }
  document.addEventListener('click', function (e) {
    if (menu && !menu.contains(e.target)) { var on = e.target.closest && e.target.closest('[data-bd-open]'); closeMenu(); if (on && (on.classList.contains('bd-pill') || on.classList.contains('bd-btn'))) { e.stopPropagation(); return; } }
    var el = e.target.closest && e.target.closest('#app [data-bd-open]');
    if (el) { e.preventDefault(); trigger(el); }
  });
  document.addEventListener('keydown', function (e) {
    if (menu && e.key === 'Escape') { closeMenu(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('#app .bd-pill[data-bd-open], #app .bd-hit[data-bd-open][tabindex]')) { e.preventDefault(); trigger(e.target); }
  });

  window.BottleDetails = { open: open, close: close, isOpen: function () { return !!ov; }, state: function () { return Object.assign({}, S, { open: !!ov, viewer: !!viewer }); } };
})();
