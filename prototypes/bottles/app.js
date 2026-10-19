/* ==========================================================================
   PVT Nexus — sample bottle design review · page controller
   Visual inspection only: bottle, view, orientation, labels, background.
   Every panel uses the same viewBox per orientation, so both bottles are
   drawn at one scale and can be compared directly.
   ========================================================================== */
(function () {
  'use strict';
  var D = window.PBDraw;
  var $ = function (id) { return document.getElementById(id); };
  var r1 = function (v) { return Math.round(v * 10) / 10; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var BOTTLES = {
    oil: { name: 'Oil Sample Bottle', ref: 'floating-piston cylinder · after Leutert PDC' },
    gas: { name: 'Gas Sample Bottle', ref: 'double-ended cylinder · after Swagelok' }
  };
  var st = { mode: '2d', show: 'both', b3: 'oil', view: 'cutaway', orient: 'upright', labels: true, auto: false };
  try { var th = localStorage.getItem('pbTheme'); if (th) document.documentElement.setAttribute('data-theme', th); } catch (e) {}
  var q = new URLSearchParams(location.search);
  if (/^(both|oil|gas)$/.test(q.get('show'))) st.show = q.get('show');
  if (/^(exterior|cutaway|pair)$/.test(q.get('view'))) st.view = q.get('view');
  if (/^(upright|horizontal)$/.test(q.get('orient'))) st.orient = q.get('orient');
  if (q.get('labels') === '0') st.labels = false;
  if (q.get('mode') === '3d') st.mode = '3d';
  if (/^(oil|gas)$/.test(q.get('show'))) st.b3 = q.get('show');
  if (/^(light|dark)$/.test(q.get('theme'))) document.documentElement.setAttribute('data-theme', q.get('theme'));

  function isLight() {
    var t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'light' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
  }
  /* ---------------------------------------------------------- panels (drawing: equipment/bottle-draw.js) */
  function panel(kind, view, idx) {
    var svg = D.svg(kind, view, st.orient, { ns: 'p' + idx + kind, labels: st.labels, title: BOTTLES[kind].name + ', ' + view + ' view' });
    return '<section class="card"><header><h2>' + esc(BOTTLES[kind].name) + '</h2><span class="tag' + (view === 'cutaway' ? ' cut' : '') + '">' +
      (view === 'cutaway' ? 'CUTAWAY · SECTION ON AXIS' : 'EXTERIOR') + '</span><span class="ref">' + esc(BOTTLES[kind].ref) + '</span></header>' + svg + '</section>';
  }

  function render() {
    var three = st.mode === '3d';
    $('grid').hidden = three; $('v3').hidden = !three;
    $('showSeg').querySelector('[data-v="both"]').disabled = three;
    $('viewSeg').querySelector('[data-v="pair"]').disabled = three;
    if (three) return render3d();
    if (viewer) viewer.pause();
    var kinds = st.show === 'both' ? ['oil', 'gas'] : [st.show];
    var views = st.view === 'pair' ? ['exterior', 'cutaway'] : [st.view];
    var list = [];
    kinds.forEach(function (k) { views.forEach(function (v) { list.push([k, v]); }); });
    var n = list.length, cols = st.orient === 'horizontal' ? (n >= 4 ? 2 : 1) : n;
    $('grid').style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0,1fr))';
    $('grid').innerHTML = list.map(function (p, i) { return panel(p[0], p[1], i); }).join('');
    segs();
    chrome();
  }
  function segs() {
    var three = st.mode === '3d';
    [['modeSeg', st.mode], ['showSeg', three ? st.b3 : st.show], ['viewSeg', three && st.view === 'pair' ? 'cutaway' : st.view], ['oriSeg', st.orient]].forEach(function (s) {
      $(s[0]).querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === s[1] ? 'true' : 'false'); });
    });
  }
  function chrome() {
    $('lblChk').checked = st.labels;
    var light = isLight();
    $('themeBtn').textContent = light ? 'Dark bg' : 'Light bg';
    $('themeBtn').setAttribute('aria-label', light ? 'Switch to dark background' : 'Switch to light background');
    var cut = st.view !== 'exterior', C = D.COL;
    $('legend').innerHTML = cut ? ['oil', 'drive', 'gas'].map(function (k) {
      return '<span><i style="background:linear-gradient(180deg,' + C[k].a + ',' + C[k].b + ')"></i>' + C[k].name + '</span>';
    }).join('') + '<span><i style="background:repeating-linear-gradient(45deg,#4a5566 0 1.5px,#aab4c2 1.5px 4px)"></i>Cut metal</span>' : '';
  }

  /* ------------------------------------------------------------ 3D view */
  var viewer = null, loading = null, need3dCut = false;
  function load3D() {
    if (window.PB3DReady) return window.PB3DReady;                 // single-file hosted build: module inlined
    return import('../../equipment/bottle3d.js');
  }
  function render3d() {
    segs(); chrome();
    if (st.view === 'pair') st.view = 'cutaway';
    $('v3title').textContent = BOTTLES[st.b3].name;
    $('v3tag').textContent = st.view === 'cutaway' ? 'CUTAWAY · QUARTER SECTION' : 'EXTERIOR';
    $('v3tag').className = 'tag' + (st.view === 'cutaway' ? ' cut' : '');
    $('autoChk').checked = st.auto;
    var go = function () {
      viewer.resume();
      viewer.set({ bottle: st.b3, cut: st.view === 'cutaway', horiz: st.orient === 'horizontal', labels: st.labels, auto: st.auto });
      partsList();
    };
    if (viewer) return go();
    if (loading) return;
    $('v3msg').hidden = false; $('v3msg').textContent = 'Loading 3D view…';
    loading = load3D().then(function (M) {
      viewer = M.mount($('v3canvas'), $('v3labels'), {
        onSelect: info3d,
        onNeedCut: function () { st.view = 'cutaway'; need3dCut = true; render(); }
      });
      if (!viewer) {
        $('v3msg').textContent = 'WebGL is not available in this browser, so the 3D view cannot be shown. The 2D technical view is still available.';
        $('v3msg').classList.add('err'); return;
      }
      $('v3msg').hidden = true; window.PB3D = viewer;
      if (st.mode === '3d') go();
    }).catch(function (e) {
      $('v3msg').textContent = 'The 3D view could not be loaded (' + e.message + '). The 2D technical view is still available.';
      $('v3msg').classList.add('err');
    });
  }
  function partsList() {
    var P = viewer.PARTS[st.b3], h = '';
    Object.keys(P).forEach(function (id) {
      h += '<button type="button" class="v3-part" data-part="' + id + '">' + esc(P[id].n) + (P[id].internal ? '<small>internal</small>' : '') + '</button>';
    });
    if ($('v3parts').getAttribute('data-b') !== st.b3) { $('v3parts').innerHTML = h; $('v3parts').setAttribute('data-b', st.b3); }
  }
  function info3d(id, info, cut) {
    $('v3parts').querySelectorAll('.v3-part').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-part') === id ? 'true' : 'false'); });
    if (!info) { $('v3info').innerHTML = '<h3>Select a part</h3><p>Click a part on the model, a label, or a name in the list.</p>'; return; }
    var note = info.internal ? (cut ? 'Internal part, shown in the cutaway.' : 'Internal part: switch to Cutaway to see it.') : '';
    if (need3dCut) { note = 'Internal part: switched to Cutaway to show it.'; need3dCut = false; }
    $('v3info').innerHTML = '<h3>' + esc(info.n) + '</h3><p>' + esc(info.d) + '</p>' + (note ? '<p class="note">' + esc(note) + '</p>' : '');
  }
  $('v3parts').addEventListener('click', function (e) { var b = e.target.closest('[data-part]'); if (b && viewer) viewer.select(b.getAttribute('data-part')); });
  $('resetBtn').addEventListener('click', function () { if (viewer) viewer.resetCamera(); });
  $('autoChk').addEventListener('change', function () { st.auto = this.checked; render(); });

  function seg(id, key) {
    $(id).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      var v = b.getAttribute('data-v');
      if (key === 'show' && st.mode === '3d') st.b3 = v; else st[key] = v;
      if (key === 'show' && v !== 'both') st.b3 = v;
      render();
    });
  }
  seg('modeSeg', 'mode'); seg('showSeg', 'show'); seg('viewSeg', 'view'); seg('oriSeg', 'orient');
  $('lblChk').addEventListener('change', function () { st.labels = this.checked; render(); });
  $('themeBtn').addEventListener('click', function () {
    var h = document.documentElement, l = isLight() ? 'dark' : 'light';
    h.setAttribute('data-theme', l);
    try { localStorage.setItem('pbTheme', l); } catch (e) {}
    render();
  });
  render();
})();
