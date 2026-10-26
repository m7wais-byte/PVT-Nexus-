/* Flash Unit prototype — shared drawing helpers.
   FX.path()   path builder that returns BOTH the SVG "d" and a sampled polyline, so a flow
               animation follows exactly the tube that is drawn (endpoints come from port anchors).
   FX.tube()   stainless tube / flexible PTFE line markup for a path.
   FX.lane()   animated flow along a path: lit tube, fluid core, moving particles, leading front.
   FX.defs()   gradients used by the three instruments (the PVT Cell keeps its own PVTCellArt defs).
   Drawing only: no process values here. */
(function () {
  'use strict';
  var r1 = function (v) { return Math.round(v * 100) / 100; };
  function R(x, y, w, h, a) { return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '" ' + (a || '') + '/>'; }
  function C(x, y, r, a) { return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(r) + '" ' + (a || '') + '/>'; }
  function E(x, y, rx, ry, a) { return '<ellipse cx="' + r1(x) + '" cy="' + r1(y) + '" rx="' + r1(rx) + '" ry="' + r1(ry) + '" ' + (a || '') + '/>'; }
  function P(d, a) { return '<path d="' + d + '" ' + (a || '') + '/>'; }
  function L(x1, y1, x2, y2, a) { return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" ' + (a || '') + '/>'; }
  function T(x, y, s, a) { return '<text x="' + r1(x) + '" y="' + r1(y) + '" ' + (a || '') + '>' + s + '</text>'; }
  var MONO = 'font-family="IBM Plex Mono, monospace"', SANS = 'font-family="IBM Plex Sans, sans-serif"';
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ramp = function (a, b, p) { return clamp((p - a) / (b - a), 0, 1); };
  var ease = function (x) { return x * x * (3 - 2 * x); };

  /* ------------------------------------------------------------ path builder */
  function path(x, y) {
    var pts = [[x, y]], d = 'M' + r1(x) + ' ' + r1(y), cx = x, cy = y;
    var api = {
      L: function (x2, y2) { d += ' L' + r1(x2) + ' ' + r1(y2); pts.push([x2, y2]); cx = x2; cy = y2; return api; },
      H: function (x2) { return api.L(x2, cy); },
      V: function (y2) { return api.L(cx, y2); },
      C: function (x1, y1, x2, y2, x3, y3) {
        d += ' C' + [x1, y1, x2, y2, x3, y3].map(r1).join(' ');
        for (var i = 1; i <= 16; i++) {
          var t = i / 16, u = 1 - t;
          pts.push([u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]);
        }
        cx = x3; cy = y3; return api;
      },
      // orthogonal corner with radius r: from the current point go to the corner (kx,ky) then on toward (nx,ny)
      turn: function (kx, ky, nx, ny, r) {
        var dx0 = Math.sign(kx - cx), dy0 = Math.sign(ky - cy), dx1 = Math.sign(nx - kx), dy1 = Math.sign(ny - ky);
        var ax = kx - dx0 * r, ay = ky - dy0 * r, bx = kx + dx1 * r, by = ky + dy1 * r;
        api.L(ax, ay);
        d += ' Q' + r1(kx) + ' ' + r1(ky) + ' ' + r1(bx) + ' ' + r1(by);
        for (var i = 1; i <= 8; i++) { var t = i / 8, u = 1 - t; pts.push([u * u * ax + 2 * u * t * kx + t * t * bx, u * u * ay + 2 * u * t * ky + t * t * by]); }
        cx = bx; cy = by; return api;
      },
      end: function () { return geo(d, pts); }
    };
    return api;
  }
  // joins two built paths (second must start where the first ends)
  function join(a, b) { return geo(a.d + ' ' + b.d.replace(/^M[^LCQ]*/, ''), a.pts.concat(b.pts.slice(1))); }
  function geo(d, pts) {
    if (!d) d = 'M' + pts.map(function (p) { return r1(p[0]) + ' ' + r1(p[1]); }).join(' L');
    var segs = [], Lt = 0;
    for (var i = 1; i < pts.length; i++) {
      var l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push({ a: pts[i - 1], b: pts[i], l: l, s0: Lt }); Lt += l;
    }
    function at(s) {
      s = clamp(s, 0, Lt);
      for (var k = 0; k < segs.length; k++) {
        var g = segs[k];
        if (s <= g.s0 + g.l || k === segs.length - 1) {
          var q = g.l ? (s - g.s0) / g.l : 0;
          return { x: g.a[0] + (g.b[0] - g.a[0]) * q, y: g.a[1] + (g.b[1] - g.a[1]) * q, ang: Math.atan2(g.b[1] - g.a[1], g.b[0] - g.a[0]) * 180 / Math.PI };
        }
      }
      return { x: pts[0][0], y: pts[0][1], ang: 0 };
    }
    return { d: d, pts: pts, L: Lt, at: at, start: pts[0], end: pts[pts.length - 1] };
  }

  /* ------------------------------------------------------------ tubing */
  // kind: 'ss' stainless 1/8" tube, 'ptfe' flexible translucent line, 'hose' vacuum hose
  function tube(g, kind) {
    if (kind === 'ptfe') return '<g class="tube ptfe" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      P(g.d, 'stroke="#8d9aab" stroke-width="7"') + P(g.d, 'stroke="#eef3f8" stroke-width="5"') + P(g.d, 'stroke="#ffffff" stroke-width="1.4" opacity=".9" transform="translate(-.8 -.8)"') + '</g>';
    if (kind === 'hose') return '<g class="tube hose" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      P(g.d, 'stroke="#1f2833" stroke-width="10"') + P(g.d, 'stroke="#3b4757" stroke-width="7.5"') + P(g.d, 'stroke="#6d7b8d" stroke-width="1.6" opacity=".7" transform="translate(-1.2 -1.2)"') + '</g>';
    return '<g class="tube ss" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      P(g.d, 'stroke="#4a5361" stroke-width="7.2"') + P(g.d, 'stroke="#aeb8c5" stroke-width="5"') + P(g.d, 'stroke="#ffffff" stroke-width="1.2" opacity=".75" transform="translate(-.7 -.7)"') + '</g>';
  }
  // compression fitting (nut) centred on a point, oriented 'h' or 'v'
  function nut(x, y, o, sc) {
    var s = sc || 1, w = (o === 'v' ? 12 : 14) * s, h = (o === 'v' ? 14 : 12) * s;
    return R(x - w / 2, y - h / 2, w, h, 'rx="1.6" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"') +
      (o === 'v' ? L(x - w / 2, y - h / 6, x + w / 2, y - h / 6, 'stroke="#2a3443" stroke-width=".5" opacity=".6"') + L(x - w / 2, y + h / 6, x + w / 2, y + h / 6, 'stroke="#2a3443" stroke-width=".5" opacity=".6"')
                 : L(x - w / 6, y - h / 2, x - w / 6, y + h / 2, 'stroke="#2a3443" stroke-width=".5" opacity=".6"') + L(x + w / 6, y - h / 2, x + w / 6, y + h / 2, 'stroke="#2a3443" stroke-width=".5" opacity=".6"'));
  }
  // tee body at a junction
  function tee(x, y) { return R(x - 8, y - 8, 16, 16, 'rx="2.4" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"') + C(x, y, 2.2, 'fill="#5d6878"'); }

  /* ------------------------------------------------------------ valves
     Inline ball / needle valve: body on the tube, bonnet + handle. open 0..1.
     Open = handle parallel to the flow + green tag; closed = across the flow + grey tag.
     axis: 'h' (tube horizontal) or 'v'; side: where the bonnet points ('up','down','left','right'). */
  function valve(x, y, axis, open, o) {
    o = o || {};
    var on = open > 0.5, s = '', side = o.side || (axis === 'h' ? 'up' : 'right');
    var vx = side === 'left' ? -1 : side === 'right' ? 1 : 0, vy = side === 'up' ? -1 : side === 'down' ? 1 : 0;
    var bw = axis === 'h' ? 26 : 16, bh = axis === 'h' ? 16 : 26;
    var bx = x + vx * 16, by = y + vy * 16;
    s += L(x, y, bx, by, 'stroke="#2a3443" stroke-width="9.5" stroke-linecap="round"') + L(x, y, bx, by, 'stroke="#c3cad4" stroke-width="7.5" stroke-linecap="round"');
    s += R(x - bw / 2, y - bh / 2, bw, bh, 'rx="3" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width="1"') + R(x - bw / 2 + 2, y - bh / 2 + 2, bw - 4, 2.2, 'fill="#fff" opacity=".45"');
    // handle: lever along (open) or across (closed) the flow axis
    var hx = x + vx * 22, hy = y + vy * 22, ang = (axis === 'h' ? 0 : 90) + (1 - clamp(open, 0, 1)) * 90;
    // black handles as on the photographed equipment; the state is read from the lever angle, ring and tag
    if (o.kind === 'knob') {
      s += C(hx, hy, 9, 'fill="#1b1f24" stroke="#000" stroke-width="1"') + C(hx, hy, 5.5, 'fill="none" stroke="#5d6672" stroke-width="1"');
    } else {
      s += '<g transform="rotate(' + r1(ang) + ' ' + r1(hx) + ' ' + r1(hy) + ')">' + R(hx - 15, hy - 3.2, 30, 6.4, 'rx="3" fill="#1b1f24" stroke="#000" stroke-width=".8"') + '</g>' + C(hx, hy, 3.2, 'fill="#c5ccd6" stroke="#2a3443" stroke-width=".8"');
    }
    if (o.ring !== false) s += C(x, y, 19, 'fill="none" stroke="#1d8a5a" stroke-width="2" opacity="' + (on ? .9 : 0) + '"');
    if (o.tag) {
      var tx = x + (o.tag[0] || 0), ty = y + (o.tag[1] || 0);
      s += R(tx - 25, ty - 8, 50, 16, 'rx="8" fill="' + (on ? '#dff3e8' : '#e4e8ee') + '" stroke="' + (on ? '#4fae80' : '#9aa6b5') + '" stroke-width=".9"') +
        T(tx, ty + 4, on ? 'OPEN' : 'CLOSED', 'text-anchor="middle" ' + MONO + ' font-size="9" font-weight="700" letter-spacing=".5" fill="' + (on ? '#14603f' : '#566578') + '"');
    }
    return '<g class="valve">' + s + '</g>';
  }

  /* ------------------------------------------------------------ flow lane
     g: geometry; front 0..1 (how far the fluid has advanced); t: clock (s); a: opacity;
     kind 'liq' | 'gas' | 'he' | 'vac' */
  var COL = { liq: '#d79a1e', gas: '#2fa88a', he: '#3aa6d8', vac: '#7d93b8', air: '#7d93b8' };
  function lane(g, front, t, a, kind, o) {
    o = o || {};
    if (!g || front <= 0 || a <= 0.01) return '';
    var col = o.col || COL[kind] || '#2fa88a', liq = kind === 'liq', lit = front * g.L, s = '';
    s += P(g.d, 'fill="none" stroke="' + col + '" stroke-width="' + (liq ? 9 : 8) + '" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + r1(lit) + ' 99999" opacity="' + r1(.22 * a) + '"');
    s += P(g.d, 'fill="none" stroke="' + col + '" stroke-width="' + (liq ? 3.4 : 2) + '" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + r1(lit) + ' 99999" opacity="' + r1((liq ? .95 : .75) * a) + '"');
    var v = o.speed || (liq ? 70 : 120), gap = liq ? 22 : 26, n = Math.ceil(g.L / gap) + 1, off = (t * v) % gap;
    for (var i = 0; i < n; i++) {
      var sd = i * gap + off;
      if (sd > lit - 3 || sd > g.L - 2) continue;
      var q = g.at(sd);
      s += liq ? C(q.x, q.y, 1.3, 'fill="#fff4cf" opacity="' + r1(.85 * a) + '"')
               : C(q.x, q.y, 2.1, 'fill="#fff" stroke="' + col + '" stroke-width="1.1" opacity="' + r1(.95 * a) + '"');
    }
    if (front < 1) { var h = g.at(lit); s += C(h.x, h.y, 4 + Math.sin(t * 9) * 0.8, 'fill="' + col + '" stroke="#fff" stroke-width="1.2" opacity="' + r1(a) + '"'); }
    else if (o.arrows !== false) {
      [0.3, 0.7].forEach(function (f) { var q = g.at(f * g.L); s += '<path d="M-4 -4 L2 0 L-4 4" transform="translate(' + r1(q.x) + ' ' + r1(q.y) + ') rotate(' + r1(q.ang) + ')" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="' + r1(a) + '"/>'; });
    }
    return '<g class="lane">' + s + '</g>';
  }

  /* ------------------------------------------------------------ defs */
  function defs() {
    var lg = function (id, stops, vert, extra) {
      return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (vert ? 0 : 1) + '" y2="' + (vert ? 1 : 0) + '"' + (extra || '') + '>' +
        stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>';
    };
    var o = '';
    o += lg('fxTubeV', [[0, '#f3f6f9'], [.45, '#b7c0cc'], [1, '#78828f']], true);
    o += lg('fxGlass', [[0, '#cfe6f5', .55], [.12, '#ffffff', .15], [.3, '#e8f3fa', .06], [.7, '#e8f3fa', .06], [.86, '#ffffff', .2], [1, '#bcd9ec', .55]]);
    o += lg('fxGlassEdge', [[0, '#7fa6c2'], [1, '#9cc0d8']], true);
    o += lg('fxOil', [[0, '#f0c24e'], [.5, '#d99a26'], [1, '#a8701a']], true);
    o += lg('fxOilH', [[0, '#8a5a12', .5], [.25, '#000', 0], [.75, '#000', 0], [1, '#8a5a12', .5]]);
    o += lg('fxHe', [[0, '#bfe7fa'], [1, '#8fd0ef']], true);
    o += lg('fxGas', [[0, '#c8f0e3'], [1, '#93dcc4']], true);
    o += lg('fxRubber', [[0, '#b9d4ee', .9], [.45, '#e9f3fc', .85], [1, '#8fb4d8', .95]]);
    o += lg('fxCase', [[0, '#f6f8fa'], [1, '#dde3ea']], true);
    o += lg('fxCaseH', [[0, '#d6dce4'], [.5, '#f4f6f9'], [1, '#cdd4dd']]);
    o += lg('fxBench', [[0, '#d9dfe6'], [1, '#b8c1cc']], true);
    o += lg('fxCyl', [[0, '#9fb3c8', .55], [.1, '#ffffff', .25], [.25, '#eaf2f9', .08], [.8, '#eaf2f9', .08], [.92, '#ffffff', .3], [1, '#9fb3c8', .55]]);
    o += lg('fxBlue', [[0, '#0f2448'], [.18, '#1f4a8a'], [.42, '#2c63ad'], [.62, '#1d4682'], [1, '#0c1e3d']]);
    o += lg('fxBrass', [[0, '#8a6a1e'], [.35, '#e7c86a'], [.55, '#c9a23e'], [1, '#7a5a14']]);
    o += lg('fxPumpBlue', [[0, '#1f4f8f'], [.5, '#3a78c4'], [1, '#183f73']]);
    o += lg('fxBlack', [[0, '#14181d'], [.45, '#3a424d'], [.6, '#262c34'], [1, '#101317']]);
    o += lg('fxBlackV', [[0, '#3a424d'], [1, '#14181d']], true);
    o += lg('fxBrushed', [[0, '#c3cad3'], [.2, '#e9edf1'], [.5, '#d2d8df'], [.8, '#eef1f4'], [1, '#bcc4cd']]);
    o += lg('fxDma', [[0, '#eef1f4'], [.5, '#e1e6eb'], [1, '#cfd6de']], true);
    o += lg('fxScreenG', [[0, '#14263b'], [1, '#0b1726']], true);
    o += '<radialGradient id="fxKnob" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#e9edf2"/><stop offset="1" stop-color="#7e8896"/></radialGradient>';
    o += '<radialGradient id="fxBalloonR" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f2f8ff" stop-opacity=".95"/><stop offset=".6" stop-color="#b8d3ee" stop-opacity=".8"/><stop offset="1" stop-color="#7ea6cf" stop-opacity=".9"/></radialGradient>';
    o += '<pattern id="fxKnurl" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#8e99a8"/><line x1="0" y1="0" x2="0" y2="3" stroke="#4a5361" stroke-width="1"/></pattern>';
    o += '<pattern id="fxScrew" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#9aa5b3"/><line x1="0" y1="0" x2="5" y2="2.5" stroke="#4a5361" stroke-width="1"/></pattern>';
    return o;
  }

  /* label callouts (shared by the main preview and the Details views)
     L = { id, n, s, a:[x,y] anchor, p:[x,y] label point, an:'start'|'end'|'middle' } in drawing units */
  function callouts(list, sel, scale) {
    var k = scale || 1, lead = '', text = '';
    list.forEach(function (c) {
      var ax = c.a[0], ay = c.a[1], x = c.p[0], y = c.p[1], an = c.an || 'start', d;
      if (an === 'middle') d = 'M' + ax + ' ' + ay + ' V' + (y + (y < ay ? 26 * k : -12 * k)) + (ax !== x ? ' H' + x : '');
      else { var sg = an === 'end' ? 1 : -1; d = 'M' + ax + ' ' + ay + (ay === y ? '' : ' H' + (x + sg * 18 * k) + ' V' + y) + ' H' + (x + sg * 5 * k); }
      lead += '<path class="lead" d="' + d + '" style="stroke-width:' + r1(1.2 * k) + 'px"/>' + C(ax, ay, 3 * k, 'class="dot"');
      var w = Math.max(c.n.length * 8.6, (c.s || '').length * 6.6) * k + 10;
      var x0 = an === 'start' ? x - 4 : an === 'end' ? x - w : x - w / 2;
      text += '<g class="pb-lab' + (c.id === sel ? ' on' : '') + '" data-part="' + c.id + '" tabindex="0" role="button" aria-label="' + c.n + '">' +
        R(x0, y - 16 * k, w + 4, 36 * k, 'fill="transparent"') +
        T(x, y, c.n, 'class="lab-n" text-anchor="' + an + '" style="font-size:' + r1(15 * k) + 'px"') +
        (c.s ? T(x, y + 15 * k, c.s, 'class="lab-s" text-anchor="' + an + '" style="font-size:' + r1(11.5 * k) + 'px"') : '') + '</g>';
    });
    return '<g class="labs">' + lead + text + '</g>';
  }

  window.FX = { r1: r1, R: R, C: C, E: E, P: P, L: L, T: T, MONO: MONO, SANS: SANS, clamp: clamp, ramp: ramp, ease: ease,
    path: path, join: join, geo: geo, tube: tube, nut: nut, tee: tee, valve: valve, lane: lane, COL: COL, defs: defs, callouts: callouts };
})();
