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
  var st = { show: 'both', view: 'cutaway', orient: 'upright', labels: true };
  try { var th = localStorage.getItem('pbTheme'); if (th) document.documentElement.setAttribute('data-theme', th); } catch (e) {}
  var q = new URLSearchParams(location.search);
  if (/^(both|oil|gas)$/.test(q.get('show'))) st.show = q.get('show');
  if (/^(exterior|cutaway|pair)$/.test(q.get('view'))) st.view = q.get('view');
  if (/^(upright|horizontal)$/.test(q.get('orient'))) st.orient = q.get('orient');
  if (q.get('labels') === '0') st.labels = false;
  if (/^(light|dark)$/.test(q.get('theme'))) document.documentElement.setAttribute('data-theme', q.get('theme'));

  function vb() {
    return st.orient === 'horizontal' ? { w: 1200, h: 420, cx: 600, cy: 210, ang: -90, s: 1.25 } : { w: 640, h: 790, cx: 320, cy: 395, ang: 0, s: 1 };
  }
  function rot(p, deg) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }

  /* ---------------------------------------------------------- labels */
  function labels(kind, view, V) {
    var g = [Math.sin(V.ang * Math.PI / 180), Math.cos(V.ang * Math.PI / 180)];
    var nrm = rot([1, 0], V.ang), horiz = st.orient === 'horizontal', o = '', tx = '';
    var items = D.anchors(kind, view, g).map(function (a) {
      var q = rot([a.x * V.s, a.y * V.s], V.ang);
      return { a: a, p: [V.cx + q[0], V.cy + q[1]], w: Math.max(a.n.length * 7.2, a.d.length * 6.4) + 12 };
    });
    [1, -1].forEach(function (side) {
      var L = items.filter(function (i) { return i.a.s === side; });
      if (!horiz) {
        var x = V.cx + side * 104, sp = 33;
        L.sort(function (p, q) { return p.p[1] - q.p[1]; });
        L.forEach(function (i, k) { i.y = Math.max(i.p[1] + 4, k ? L[k - 1].y + sp : 22); });
        for (var k = L.length - 1; k >= 0; k--) { var lim = k === L.length - 1 ? V.h - 20 : L[k + 1].y - sp; if (L[k].y > lim) L[k].y = lim; }
        L.forEach(function (i, k) {
          var xm = x - side * (10 + 6 * (k % 3)), an = side > 0 ? 'start' : 'end';
          o += '<path class="lead" d="M' + r1(i.p[0]) + ' ' + r1(i.p[1]) + ' H' + r1(xm) + ' V' + r1(i.y - 4) + ' H' + r1(x - side * 4) + '"/>';
          o += '<circle class="dot" cx="' + r1(i.p[0]) + '" cy="' + r1(i.p[1]) + '" r="2.2"/>';
          tx += '<text class="lab-n" x="' + r1(x) + '" y="' + r1(i.y) + '" text-anchor="' + an + '">' + esc(i.a.n) + '</text>';
          tx += '<text class="lab-s" x="' + r1(x) + '" y="' + r1(i.y + 13) + '" text-anchor="' + an + '">' + esc(i.a.d) + '</text>';
        });
      } else {
        var up = nrm[1] * side < 0, nt = L.length > 6 ? 3 : 2;
        var rows = [0, 1, 2].map(function (t) { return up ? V.cy - 100 - 36 * t : V.cy + 104 + 36 * t; });
        L.sort(function (p, q) { return p.p[0] - q.p[0]; });
        var tiers = [[], [], []];
        L.forEach(function (i, k) { i.t = k % nt; tiers[i.t].push(i); });
        tiers.forEach(function (T) {
          T.forEach(function (i, k) { var x0 = i.p[0]; if (k) x0 = Math.max(x0, T[k - 1].x + T[k - 1].w / 2 + i.w / 2 + 6); i.x = Math.max(x0, 10 + i.w / 2); });
          for (var k = T.length - 1; k >= 0; k--) { var lim = k === T.length - 1 ? V.w - 10 - T[k].w / 2 : T[k + 1].x - T[k + 1].w / 2 - T[k].w / 2 - 6; if (T[k].x > lim) T[k].x = lim; }
        });
        L.forEach(function (i) {
          var y = rows[i.t], end = up ? y + 18 : y - 13, ym = up ? end + 6 + 4 * i.t : end - 6 - 4 * i.t;
          o += '<path class="lead" d="M' + r1(i.p[0]) + ' ' + r1(i.p[1]) + ' V' + r1(ym) + ' H' + r1(i.x) + ' V' + r1(end) + '"/>';
          o += '<circle class="dot" cx="' + r1(i.p[0]) + '" cy="' + r1(i.p[1]) + '" r="2.2"/>';
          tx += '<text class="lab-n" x="' + r1(i.x) + '" y="' + r1(y) + '" text-anchor="middle">' + esc(i.a.n) + '</text>';
          tx += '<text class="lab-s" x="' + r1(i.x) + '" y="' + r1(y + 13) + '" text-anchor="middle">' + esc(i.a.d) + '</text>';
        });
      }
    });
    return o + tx;
  }

  /* ---------------------------------------------------------- panels */
  function panel(kind, view, idx) {
    var V = vb(), ns = 'p' + idx + kind, g = [Math.sin(V.ang * Math.PI / 180), Math.cos(V.ang * Math.PI / 180)];
    var textRot = Math.abs(((V.ang - 90) % 360 + 540) % 360 - 180) > 90 ? 90 : -90;   // body marking always reads upright
    var body = D[kind](ns, { view: view, g: g, textRot: textRot });
    var svg = '<svg viewBox="0 0 ' + V.w + ' ' + V.h + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(BOTTLES[kind].name + ', ' + view + ' view') + '">' +
      '<defs>' + D.defs(ns) + '</defs>' +
      '<g transform="translate(' + V.cx + ' ' + V.cy + ') rotate(' + V.ang + ') scale(' + V.s + ')">' + body + '</g>' +
      (st.labels ? labels(kind, view, V) : '') + '</svg>';
    return '<section class="card"><header><h2>' + esc(BOTTLES[kind].name) + '</h2><span class="tag' + (view === 'cutaway' ? ' cut' : '') + '">' +
      (view === 'cutaway' ? 'CUTAWAY · SECTION ON AXIS' : 'EXTERIOR') + '</span><span class="ref">' + esc(BOTTLES[kind].ref) + '</span></header>' + svg + '</section>';
  }

  function render() {
    var kinds = st.show === 'both' ? ['oil', 'gas'] : [st.show];
    var views = st.view === 'pair' ? ['exterior', 'cutaway'] : [st.view];
    var list = [];
    kinds.forEach(function (k) { views.forEach(function (v) { list.push([k, v]); }); });
    var n = list.length, cols = st.orient === 'horizontal' ? (n >= 4 ? 2 : 1) : n;
    $('grid').style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0,1fr))';
    $('grid').innerHTML = list.map(function (p, i) { return panel(p[0], p[1], i); }).join('');
    [['showSeg', st.show], ['viewSeg', st.view], ['oriSeg', st.orient]].forEach(function (s) {
      $(s[0]).querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === s[1] ? 'true' : 'false'); });
    });
    $('lblChk').checked = st.labels;
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    $('themeBtn').textContent = light ? 'Dark background' : 'Light background';
    var cut = st.view !== 'exterior', C = D.COL;
    $('legend').innerHTML = cut ? ['oil', 'drive', 'gas'].map(function (k) {
      return '<span><i style="background:linear-gradient(180deg,' + C[k].a + ',' + C[k].b + ')"></i>' + C[k].name + '</span>';
    }).join('') + '<span><i style="background:repeating-linear-gradient(45deg,#4a5566 0 1.5px,#aab4c2 1.5px 4px)"></i>Cut metal</span>' : '';
  }

  function seg(id, key) {
    $(id).addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { st[key] = b.getAttribute('data-v'); render(); } });
  }
  seg('showSeg', 'show'); seg('viewSeg', 'view'); seg('oriSeg', 'orient');
  $('lblChk').addEventListener('change', function () { st.labels = this.checked; render(); });
  $('themeBtn').addEventListener('click', function () {
    var h = document.documentElement, l = h.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    h.setAttribute('data-theme', l);
    try { localStorage.setItem('pbTheme', l); } catch (e) {}
    render();
  });
  render();
})();
