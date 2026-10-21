/* ==========================================================================
   PVTCellArt — the ONE approved dual-cylinder PVT cell (prototype
   prototypes/pvt-cell, approved 2026-10-20), placed on every procedure page.

   Fixed design (identical everywhere): thermal enclosure + navy frame, lower
   piston drives, Pump B LEFT / Pump A RIGHT (never mirrored), two cylinder
   valves above the cylinders, matching isolation valves outside the enclosure
   at Port L and Port R, pressure sensor, sample-volume and temperature
   displays. Computer + controller on a table: desk(); signal cable: cable().

   Drawn in the prototype's world units, placed with ONE transform
   (translate + uniform scale). LEGACY is the placement that lands the cell on
   the coordinate frame every procedure page already uses: header y 190,
   Pump B tee x 866, Pump A tee x 1030, pressure sensor x 948, so page tubing
   and flow overlays keep their coordinates.

   Live state comes only from the page (its own values, never new ones):
     innerA / innerB  bore contents (sample, gas, bubbles) in the page's OLD
                      bore frame: B x 846-886, A x 1010-1050, y 219-401
                      (mapped onto the approved bore; the page keeps its maths)
     pistonA / pistonB  expression (template) or number (raw): piston-top y in
                      that old frame -> approved piston + rod + drive carriage
     valves { A, B, L, R }  expression / boolean: open
     ports  { L: { plug, nut }, R: ... }  expression / boolean: rated plug shown,
                      tubing nut shown (tubing attaches at port(o, k))
     disp   { P, B, A, T }  verbatim markup for the panel displays
   Default: markup for the template runtime ({{ }} bindings, sc-camel-*
   attributes); o.raw: plain SVG with values, for native string-built modules.
   Drawing only: no process values here.
   ========================================================================== */
(function () {
  'use strict';

  var G = {
    cab: { x0: 330, x1: 900, post: 18, roof0: 100, roof1: 118, mid0: 470, mid1: 490, bot0: 722, bot1: 740 },
    x: { B: 470, A: 760 }, gx: 615, hy: 183, ground: 756,
    blk: { y0: 162, y1: 198, hw: 24 }, stem: { top: 70, hub: 62, bar: 55 },
    fl: { t0: 198, t1: 214, b0: 438, b1: 454, hw: 56 }, body: { y0: 214, y1: 438, hw: 42 },
    base: { y0: 454, y1: 470, hw: 48 }, bore: { top: 222, bot: 430, hw: 27 }, tie: 50, pist: 14, rodHW: 5,
    drive: { y0: 494, y1: 706, hw: 40, win0: 497, win1: 703, off: 282 },
    port: { L: { x: 262, wall: 330, v: 292 }, R: { x: 968, wall: 900, v: 938 } },
    pv: { hw: 14, hh: 14, bonnet: 12, stemTop: 132, bar: 126 }
  };
  G.stroke = G.bore.bot - G.bore.top - G.pist;
  // page placement shared by every procedure (see header): Pump B tee -> 866, Pump A tee -> 1030, header -> 190
  var LS = 164 / 290;
  var LEGACY = { x: 866 - 470 * LS, y: 190 - 183 * LS, s: LS };
  // old page bore frame -> approved bore (cell units)
  var OLD = { B: 846, A: 1010, w: 40, top: 219, h: 182 };
  var KX = 2 * G.bore.hw / OLD.w, KY = (G.bore.bot - G.bore.top) / OLD.h;

  function r1(v) { return Math.round(v * 100) / 100; }
  function R(x, y, w, h, a) { return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '" ' + (a || '') + '/>'; }
  function C(x, y, r, a) { return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(r) + '" ' + (a || '') + '/>'; }
  function P(d, a) { return '<path d="' + d + '" ' + (a || '') + '/>'; }
  function L(x1, y1, x2, y2, a) { return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" ' + (a || '') + '/>'; }
  function T(x, y, s, a) { return '<text x="' + r1(x) + '" y="' + r1(y) + '" ' + (a || '') + '>' + s + '</text>'; }
  var K = 'stroke="#2a3443"', MONO = 'font-family="IBM Plex Mono, monospace"', SANS = 'font-family="IBM Plex Sans, sans-serif"';
  var CAMEL = ['patternUnits', 'patternTransform', 'gradientUnits', 'gradientTransform', 'viewBox', 'preserveAspectRatio', 'clipPathUnits', 'pathLength'];
  function tplAttrs(s) { CAMEL.forEach(function (a) { s = s.split(' ' + a + '=').join(' sc-camel-' + a.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }) + '='); }); return s; }

  // a live value: template expression -> {{ }} binding; raw mode -> the value itself
  function live(o, expr, f) { return o.raw ? f(expr) : '{{ ' + f.src(expr) + ' }}'; }
  // single quotes in bindings: they sit inside double-quoted attributes
  var F = {
    on: function (t, e) { var g = function (v) { return v ? t[0] : t[1]; }; g.src = function (x) { return '(' + x + ") ? '" + t[0] + "' : '" + t[1] + "'"; };return g; },
    dy: function () { var g = function (v) { return r1((+v - OLD.top) * KY); }; g.src = function (x) { return '((' + x + ') - ' + OLD.top + ') * ' + KY.toFixed(6); }; return g; }
  };

  /* ---------------------------------------------------------------- defs */
  function defs(ns) {
    var lg = function (id, stops, vert) {
      return '<linearGradient id="' + ns + id + '" x1="0" y1="0" x2="' + (vert ? 0 : 1) + '" y2="' + (vert ? 1 : 0) + '">' +
        stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>'; }).join('') + '</linearGradient>';
    };
    var o = '';
    o += lg('Steel', [[0, '#5d6878'], [.1, '#9aa6b6'], [.28, '#d9dfe7'], [.36, '#f6f8fb'], [.46, '#c5ccd6'], [.7, '#8e99a8'], [.9, '#66717f'], [1, '#4a5361']]);
    o += lg('SteelD', [[0, '#4c5664'], [.3, '#a3adba'], [.42, '#dfe4ea'], [.6, '#939eac'], [1, '#434c59']]);
    o += lg('SteelV', [[0, '#eef1f5'], [.45, '#aeb7c3'], [1, '#6c7684']], true);
    o += lg('Panel', [[0, '#e9edf2'], [.5, '#f7f9fb'], [1, '#dfe4ea']]);
    o += lg('PanelV', [[0, '#f4f6f9'], [1, '#d9dee5']], true);
    o += lg('Navy', [[0, '#1d3a66'], [.5, '#28497a'], [1, '#183257']]);
    o += lg('NavyV', [[0, '#2b4c7e'], [1, '#183257']], true);
    o += lg('Bore', [[0, '#27303c'], [.5, '#3a4553'], [1, '#222a35']]);
    o += lg('Screen', [[0, '#0d1a2b'], [1, '#08111d']], true);
    o += lg('Desk', [[0, '#e7ebf0'], [1, '#c9d0d9']], true);
    o += '<pattern id="' + ns + 'Hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#c3cad4"/><line x1="0" y1="0" x2="0" y2="6" stroke="#6b7685" stroke-width="1.5"/></pattern>';
    o += '<pattern id="' + ns + 'Hatch2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="6" height="6" fill="#ccd2db"/><line x1="0" y1="0" x2="0" y2="6" stroke="#7a8594" stroke-width="1.3"/></pattern>';
    o += '<pattern id="' + ns + 'Thread" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#8f99a7"/><line x1="0" y1="0" x2="4" y2="2" stroke="#3c4553" stroke-width="1"/></pattern>';
    ['B', 'A'].forEach(function (k) { o += '<clipPath id="' + ns + 'Bore' + k + '">' + R(G.x[k] - G.bore.hw, G.bore.top, 2 * G.bore.hw, G.bore.bot - G.bore.top) + '</clipPath>'; });
    return o;
  }
  function u(ns, id) { return 'url(#' + ns + id + ')'; }

  /* ---------------------------------------------------------------- parts */
  function back(ns) {
    var c = G.cab, o = '';
    o += '<ellipse cx="' + ((c.x0 + c.x1) / 2) + '" cy="' + (G.ground + 2) + '" rx="320" ry="9" fill="#1b2a40" opacity=".10"/>';
    o += R(c.x0 + c.post, c.roof1, c.x1 - c.x0 - 2 * c.post, c.mid0 - c.roof1, 'fill="' + u(ns, 'Panel') + '"');
    o += R(c.x0 + c.post, c.mid1, c.x1 - c.x0 - 2 * c.post, c.bot0 - c.mid1, 'fill="' + u(ns, 'Panel') + '" opacity=".85"');
    o += R(c.x0 + c.post, c.roof1, c.x1 - c.x0 - 2 * c.post, 8, 'fill="#1b2a40" opacity=".10"');
    o += R(c.x0 + 60, c.roof1 + 6, c.x1 - c.x0 - 120, 3, 'rx="1.5" fill="#ffffff" opacity=".95"');
    o += R(c.x0 + c.post, c.mid0 - 14, c.x1 - c.x0 - 2 * c.post, 14, 'fill="' + u(ns, 'SteelV') + '" opacity=".9"');
    o += R(c.x0 + c.post, c.bot0 - 8, c.x1 - c.x0 - 2 * c.post, 8, 'fill="' + u(ns, 'SteelV') + '"');
    [[c.x0 + 34, c.roof1 + 22], [c.x1 - 34, c.roof1 + 22], [c.x0 + 34, c.mid0 - 24], [c.x1 - 34, c.mid0 - 24]].forEach(function (p) { o += C(p[0], p[1], 2.6, 'fill="#9aa5b3" stroke="#5d6878" stroke-width=".7"'); });
    return o;
  }
  function front(ns) {
    var c = G.cab, o = '';
    o += R(c.x0, c.roof0, c.x1 - c.x0, c.roof1 - c.roof0, 'fill="' + u(ns, 'NavyV') + '" stroke="#132845" stroke-width="1"');
    o += R(c.x0, c.mid0, c.x1 - c.x0, c.mid1 - c.mid0, 'fill="' + u(ns, 'NavyV') + '" stroke="#132845" stroke-width="1"');
    o += R(c.x0, c.bot0, c.x1 - c.x0, c.bot1 - c.bot0, 'fill="' + u(ns, 'NavyV') + '" stroke="#132845" stroke-width="1"');
    [c.x0, c.x1 - c.post].forEach(function (x) { o += R(x, c.roof0, c.post, c.bot1 - c.roof0, 'fill="' + u(ns, 'Navy') + '" stroke="#132845" stroke-width="1"'); });
    o += R(G.gx - 8, c.mid1, 16, c.bot0 - c.mid1, 'fill="' + u(ns, 'Navy') + '" stroke="#132845" stroke-width="1"');
    [c.x0 + 8, c.x1 - 30, G.gx - 11].forEach(function (x) { o += R(x, c.bot1, 22, 6, 'fill="#5d6878"') + R(x - 4, c.bot1 + 6, 30, 10, 'rx="3" fill="' + u(ns, 'SteelD') + '" stroke="#3c4553" stroke-width=".8"'); });
    ['B', 'A'].forEach(function (k) { o += R(G.x[k] - 11, c.roof0 - 3, 22, 4, 'rx="2" fill="#11203a"'); });
    o += R(c.x1 - 2, 598, 10, 28, 'rx="2" fill="' + u(ns, 'SteelD') + '" stroke="#3c4553" stroke-width=".8"');   // signal connector plate
    o += R((c.x0 + c.x1) / 2 - 92, c.bot0 + 3, 184, 12, 'rx="2" fill="#e6ebf1" opacity=".95"');
    o += T((c.x0 + c.x1) / 2, c.bot0 + 12.5, 'DUAL-CYLINDER PVT CELL', 'text-anchor="middle" ' + MONO + ' font-size="9" font-weight="600" letter-spacing="1.2" fill="#1d3a66"');
    return o;
  }

  // OPEN / CLOSED indication (ring, cutaway seat bar, tag); no operating mechanism is implied
  function vstate(o, k, x, ty, cut) {
    if (o.state === false) return { ring: '0', seat: '0', tag: '' };   // general view (Cell Details): no valve state shown
    var on = (o.valves || {})[k];
    if (on == null) on = o.raw ? false : 'false';   // unused valve: shown closed
    var ring = live(o, on, F.on(['1', '0'])), seat = live(o, on, F.on(['0', '1']));
    return { ring: ring, seat: seat,
      tag: '<g>' + R(x - 33, ty, 66, 20, 'rx="10" fill="' + live(o, on, F.on(['#dff3e8', '#e4e8ee'])) + '" stroke="' + live(o, on, F.on(['#4fae80', '#9aa6b5'])) + '" stroke-width="1"') +
        '<text x="' + x + '" y="' + (ty + 14.5) + '" text-anchor="middle" ' + MONO + ' font-size="13" font-weight="700" letter-spacing=".6" fill="' + live(o, on, F.on(['#14603f', '#566578'])) + '">' + live(o, on, F.on(['OPEN', 'CLOSED'])) + '</text></g>' };
  }

  function header(ns, o, cut) {
    var y = G.hy, s = '', h0 = G.port.L.wall - 2, h1 = G.port.R.wall + 2;
    s += L(h0, y, h1, y, 'stroke="#4a5361" stroke-width="10" stroke-linecap="round"') + L(h0, y, h1, y, 'stroke="' + u(ns, 'SteelV') + '" stroke-width="7.4"') + L(h0 + 2, y - 2, h1 - 2, y - 2, 'stroke="#fff" stroke-width="1.3" opacity=".8"');
    if (cut) s += L(h0, y, h1, y, 'stroke="#28313d" stroke-width="3.6"');
    s += R(G.gx - 11, y - 10, 22, 20, 'rx="2" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width="1"');
    if (cut) s += R(G.gx - 1.8, y, 3.6, 22, 'fill="#28313d"');
    ['L', 'R'].forEach(function (k) {
      var pp = G.port[k], xw = pp.wall, xe = pp.x, pt = (o.ports || {})[k] || {};
      s += R(Math.min(xw, xe), y - 3.6, Math.abs(xe - xw), 7.2, 'fill="' + u(ns, 'SteelV') + '" ' + K + ' stroke-width=".8"');
      var nx = k === 'L' ? xw - 16 : xw;
      s += R(nx, y - 10, 16, 20, 'rx="2" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".9"');
      s += L(nx + 5.3, y - 10, nx + 5.3, y + 10, 'stroke="#3c4553" stroke-width=".6" opacity=".6"') + L(nx + 10.7, y - 10, nx + 10.7, y + 10, 'stroke="#3c4553" stroke-width=".6" opacity=".6"');
      if (cut) s += R(Math.min(xw, xe), y - 1.6, Math.abs(xe - xw), 3.2, 'fill="#28313d"');
      s += portValve(ns, o, k, cut);
      var capX = k === 'L' ? xe - 14 : xe;
      var plug = pt.plug == null ? (o.raw ? true : 'true') : pt.plug, nut = pt.nut == null ? (o.raw ? false : 'false') : pt.nut;
      s += '<g opacity="' + live(o, plug, F.on(['1', '0'])) + '">' + R(capX, y - 9.5, 14, 19, 'rx="2" fill="' + u(ns, 'SteelD') + '" stroke="#1d3a66" stroke-width="1.6"') +
        L(capX + 4.7, y - 9.5, capX + 4.7, y + 9.5, 'stroke="#2a3443" stroke-width=".7"') + L(capX + 9.3, y - 9.5, capX + 9.3, y + 9.5, 'stroke="#2a3443" stroke-width=".7"') +
        R(capX + (k === 'L' ? -4 : 14), y - 4, 4, 8, 'rx="1" fill="#1d3a66"') + '</g>';
      s += '<g opacity="' + live(o, nut, F.on(['1', '0'])) + '">' + R(capX, y - 8, 14, 16, 'rx="2" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".9"') + '</g>';
    });
    return s;
  }

  function portValve(ns, o, k, cut) {
    var x = G.port[k].v, v = G.pv, y = G.hy, s = '', st = vstate(o, k, x, 98, cut);
    s += R(x - v.hw, y - v.hh, 2 * v.hw, 2 * v.hh, 'rx="3" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width="1.1"');
    s += R(x - v.hw + 3, y - v.hh + 3, 4, 2 * v.hh - 6, 'rx="2" fill="#fff" opacity=".35"');
    if (cut) {
      s += R(x - v.hw + 1, y - v.hh + 1, 2 * v.hw - 2, 2 * v.hh - 2, 'fill="' + u(ns, 'Hatch2') + '" opacity=".85"');
      s += R(x - v.hw, y - 1.8, 2 * v.hw, 3.6, 'fill="#28313d"');
      s += R(x - 2, y - 7, 4, 14, 'rx="1" fill="#c0392b" opacity="' + st.seat + '" style="transition:opacity .35s"');
    }
    s += R(x - 9, y - v.hh - v.bonnet, 18, v.bonnet, 'rx="2" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".9"');
    s += R(x - 3, v.stemTop, 6, y - v.hh - v.bonnet - v.stemTop, 'fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".6"');
    s += R(x - 6.5, v.bar + 5, 13, 8, 'rx="2" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".7"');
    s += R(x - 22, v.bar, 44, 7, 'rx="3.5" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".8"');
    s += C(x, v.bar - 1, 5, 'fill="' + u(ns, 'SteelV') + '" ' + K + ' stroke-width=".7"');
    s += R(x - v.hw - 4, y - v.hh - 4, 2 * v.hw + 8, 2 * v.hh + 8, 'rx="5" fill="none" stroke="#2fa66f" stroke-width="2.8" opacity="' + st.ring + '" style="transition:opacity .35s"');
    return s + st.tag;
  }

  function valveBlock(ns, o, k, cut) {
    var x = G.x[k], b = G.blk, s = '', st = vstate(o, k, x + 46, 74, cut);
    s += R(x - b.hw, b.y0, 2 * b.hw, b.y1 - b.y0, 'rx="3" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width="1.1"');
    s += R(x - b.hw + 4, b.y0 + 3, 5, b.y1 - b.y0 - 6, 'rx="2" fill="#fff" opacity=".35"');
    if (cut) {
      s += R(x - b.hw + 1, b.y0 + 1, 2 * b.hw - 2, b.y1 - b.y0 - 2, 'fill="' + u(ns, 'Hatch2') + '" opacity=".85"');
      s += R(x - b.hw, G.hy - 1.8, 2 * b.hw, 3.6, 'fill="#28313d"');
      s += R(x - 1.8, G.hy, 3.6, b.y1 - G.hy + 16, 'fill="#28313d"');
      s += R(x - 7, G.hy + 6, 14, 4, 'rx="1" fill="#c0392b" opacity="' + st.seat + '" style="transition:opacity .35s"');
    }
    s += R(x - 13, b.y0 - 14, 26, 14, 'rx="2" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width="1"');
    s += R(x - 9, b.y0 - 22, 18, 8, 'rx="1.5" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".9"');
    if (cut) s += R(x - 12, b.y0 - 13, 24, 12, 'fill="' + u(ns, 'Hatch') + '" opacity=".8"');
    s += R(x - 3.5, G.stem.top, 7, b.y0 - 22 - G.stem.top + 2, 'fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".7"');
    s += R(x - 8, G.stem.hub, 16, 10, 'rx="2" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".8"');
    s += R(x - 30, G.stem.bar, 60, 8, 'rx="4" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".9"');
    s += C(x, G.stem.bar - 1, 6.5, 'fill="' + u(ns, 'SteelV') + '" ' + K + ' stroke-width=".8"');
    s += R(x - b.hw - 4, b.y0 - 4, 2 * b.hw + 8, b.y1 - b.y0 + 8, 'rx="6" fill="none" stroke="#2fa66f" stroke-width="3" opacity="' + st.ring + '" style="transition:opacity .35s"');
    return s + st.tag;
  }

  function cylinder(ns, o, k, cut) {
    var x = G.x[k], f = G.fl, bd = G.body, br = G.bore, s = '';
    [-1, 1].forEach(function (sg) { s += R(x + sg * G.tie - 3, f.t0, 6, f.b1 - f.t0, 'fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".7"'); });
    var pist = o['piston' + k], dy = pist == null ? '0' : live(o, pist, F.dy());
    if (!cut) {
      s += R(x - bd.hw, bd.y0, 2 * bd.hw, bd.y1 - bd.y0, 'fill="' + u(ns, 'Steel') + '" ' + K + ' stroke-width="1.2"');
      s += R(x - bd.hw + 9, bd.y0 + 6, 5, bd.y1 - bd.y0 - 12, 'rx="2.5" fill="#fff" opacity=".45"');
      [bd.y0 + 22, bd.y1 - 22].forEach(function (y) { s += L(x - bd.hw, y, x + bd.hw, y, 'stroke="#4a5361" stroke-width="1" opacity=".45"'); });
      s += R(x - 17, 302, 34, 30, 'rx="4" fill="#1d3a66" stroke="#132845" stroke-width="1"') + T(x, 324, k, 'text-anchor="middle" ' + SANS + ' font-size="20" font-weight="700" fill="#ffffff"');
    } else {
      s += R(x - bd.hw, bd.y0, bd.hw - br.hw, bd.y1 - bd.y0, 'fill="' + u(ns, 'Hatch') + '" ' + K + ' stroke-width="1"');
      s += R(x + br.hw, bd.y0, bd.hw - br.hw, bd.y1 - bd.y0, 'fill="' + u(ns, 'Hatch') + '" ' + K + ' stroke-width="1"');
      s += R(x - br.hw, bd.y0, 2 * br.hw, bd.y1 - bd.y0, 'fill="' + u(ns, 'Bore') + '"');
      // page bore contents, in the page's old bore frame, mapped onto this bore
      var ox = OLD[k];
      s += '<g clip-path="url(#' + ns + 'Bore' + k + ')"><g transform="translate(' + r1(x - br.hw - ox * KX) + ' ' + r1(br.top - OLD.top * KY) + ') scale(' + KX + ' ' + r1(KY * 1e4) / 1e4 + ')">' + (o['inner' + k] || '') + '</g>' +
        // approved piston (seals, guide ring) + rod to the drive carriage
        '<g transform="translate(0 ' + dy + ')">' + R(x - G.rodHW, br.top + G.pist, 2 * G.rodHW, G.drive.off - G.pist, 'fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".6"') +
        R(x - br.hw, br.top, 2 * br.hw, G.pist, 'rx="1.5" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".9"') +
        [br.top + 3.5, br.top + G.pist - 3.5].map(function (y) { return R(x - br.hw, y - 1.6, 3.2, 3.2, 'fill="#141920"') + R(x + br.hw - 3.2, y - 1.6, 3.2, 3.2, 'fill="#141920"'); }).join('') +
        R(x - br.hw, br.top + G.pist / 2 - 1.2, 2 * br.hw, 2.4, 'fill="#d9cfae" opacity=".8"') + '</g></g>';
      s += R(x - br.hw, br.top, 2 * br.hw, br.bot - br.top, 'fill="none" stroke="#6b7685" stroke-width=".8"');
    }
    s += R(x - f.hw, f.t0, 2 * f.hw, f.t1 - f.t0, 'rx="2" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width="1"');
    s += R(x - f.hw, f.b0, 2 * f.hw, f.b1 - f.b0, 'rx="2" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width="1"');
    s += R(x - G.base.hw, G.base.y0, 2 * G.base.hw, G.base.y1 - G.base.y0, 'fill="' + u(ns, 'SteelV') + '" ' + K + ' stroke-width="1"');
    [-1, 1].forEach(function (sg) { s += C(x + sg * G.tie, f.t0 + 8, 4.5, 'fill="' + u(ns, 'SteelV') + '" ' + K + ' stroke-width=".7"') + C(x + sg * G.tie, f.b1 - 8, 4.5, 'fill="' + u(ns, 'SteelV') + '" ' + K + ' stroke-width=".7"'); });
    if (cut) {
      s += R(x - f.hw + 1, f.t0 + 1, 2 * f.hw - 2, f.t1 - f.t0 - 2, 'fill="' + u(ns, 'Hatch2') + '" opacity=".8"');
      s += R(x - f.hw + 1, f.b0 + 1, 2 * f.hw - 2, f.b1 - f.b0 - 2, 'fill="' + u(ns, 'Hatch2') + '" opacity=".8"');
      s += R(x - 1.8, f.t0, 3.6, br.top - f.t0, 'fill="#28313d"');
    }
    s += drive(ns, k, cut, dy);
    return s;
  }

  function drive(ns, k, cut, dy) {
    var x = G.x[k], d = G.drive, s = '';
    s += R(x - 14, G.cab.mid1, 28, d.y0 - G.cab.mid1, 'fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".9"');
    s += R(x - d.hw, d.y0, 2 * d.hw, d.y1 - d.y0, 'rx="3" fill="' + u(ns, 'Steel') + '" ' + K + ' stroke-width="1.2"');
    s += R(x - d.hw - 10, d.y1, 2 * d.hw + 20, G.cab.bot0 - 8 - d.y1, 'fill="' + u(ns, 'SteelV') + '" ' + K + ' stroke-width="1"');
    s += R(x - 9, d.win0, 18, d.win1 - d.win0, 'rx="3" fill="#3a4553" stroke="#2a3443" stroke-width="1"');
    if (cut) s += R(x - d.hw + 1, d.y0 + 1, 2 * d.hw - 2, d.y1 - d.y0 - 2, 'fill="' + u(ns, 'Hatch') + '" opacity=".35"') + R(x - 3, d.win0, 6, d.win1 - d.win0, 'fill="' + u(ns, 'Thread') + '"');
    for (var i = 0; i <= 10; i++) {
      var y = G.bore.top + G.stroke * i / 10 + d.off, big = i % 5 === 0;
      s += L(x + 12, y, x + (big ? 24 : 18), y, 'stroke="#2a3443" stroke-width="' + (big ? 1.2 : .8) + '"');
    }
    // carriage = piston position (same offset as the piston group)
    s += '<g transform="translate(0 ' + dy + ')">' + R(x - 13, G.bore.top + d.off - 7, 26, 14, 'rx="2" fill="#d99a30" stroke="#7a5212" stroke-width="1"') + L(x + 9, G.bore.top + d.off, x + 26, G.bore.top + d.off, 'stroke="#b8434e" stroke-width="2"') + '</g>';
    return s;
  }

  function sensor(ns, o) {
    var x = G.gx, s = '', dp = o.disp || {};
    s += R(x - 5, G.hy + 10, 10, 16, 'fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width=".8"');
    s += C(x, 232, 36, 'fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width="1.2"') + C(x, 232, 29, 'fill="' + u(ns, 'Screen') + '" stroke="#5d6878" stroke-width="1.5"');
    s += T(x, 238, dp.P == null ? '' : dp.P, 'text-anchor="middle" ' + MONO + ' font-size="17" font-weight="600" fill="#5fd4ff"');
    s += T(x, 252, dp.Pu || 'psig', 'text-anchor="middle" ' + MONO + ' font-size="9.5" fill="#8fb3cc"');
    var px = x - 72, w = 144;
    s += R(px, 282, w, 82, 'rx="6" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width="1"') + R(px + 6, 288, w - 12, 70, 'rx="4" fill="' + u(ns, 'Screen') + '"');
    s += T(x, 303, 'SAMPLE VOLUME', 'text-anchor="middle" ' + MONO + ' font-size="10.5" letter-spacing=".8" fill="#9fb3cc"');
    s += T(px + 11, 327, 'B', MONO + ' font-size="14" font-weight="600" fill="#9fb3cc"') + T(px + w - 11, 327, dp.B == null ? '' : dp.B, 'text-anchor="end" ' + MONO + ' font-size="15.5" font-weight="600" fill="#ffc56b"');
    s += T(px + 11, 350, 'A', MONO + ' font-size="14" font-weight="600" fill="#9fb3cc"') + T(px + w - 11, 350, dp.A == null ? '' : dp.A, 'text-anchor="end" ' + MONO + ' font-size="15.5" font-weight="600" fill="#ffc56b"');
    s += R(px, 374, w, 58, 'rx="6" fill="' + u(ns, 'SteelD') + '" ' + K + ' stroke-width="1"') + R(px + 6, 380, w - 12, 46, 'rx="4" fill="' + u(ns, 'Screen') + '"');
    s += T(x, 395, 'TEMPERATURE', 'text-anchor="middle" ' + MONO + ' font-size="10.5" letter-spacing=".8" fill="#9fb3cc"');
    s += T(x, 419, dp.T == null ? '—' : dp.T, 'text-anchor="middle" ' + MONO + ' font-size="19" font-weight="600" fill="#7ff0bf"');
    return s;
  }

  function labels(o) {
    var lb = 'font-family="IBM Plex Sans, sans-serif" font-size="22" font-weight="600" fill="var(--txt, #1d2836)"';
    var s = '<g>';
    s += T(G.x.B - 38, 62, 'Pump B valve', 'text-anchor="end" ' + lb);
    s += T(G.x.A + 84, 62, 'Pump A valve', lb);
    var pl = o.portLabel || {};
    s += T(G.port.L.v, 236, pl.L || 'Port L', 'text-anchor="middle" ' + lb);
    s += T(G.port.R.v, 236, pl.R || 'Port R', 'text-anchor="middle" ' + lb);
    return s + '</g>';
  }

  /* ============================================================== public */
  function place(o) { var q = o.at || LEGACY; return 'translate(' + r1(q.x) + ' ' + r1(q.y) + ') scale(' + q.s.toFixed(6) + ')'; }
  // cell -> page point
  function pt(o, x, y) { var q = o.at || LEGACY; return [r1(q.x + x * q.s), r1(q.y + y * q.s)]; }

  function cell(ns, o) {
    o = o || {};
    var cut = o.view !== 'exterior', s = '';
    s += '<g class="pvtcell" transform="' + place(o) + '">';
    s += back(ns) + header(ns, o, cut);
    ['B', 'A'].forEach(function (k) { s += cylinder(ns, o, k, cut) + valveBlock(ns, o, k, cut); });
    s += sensor(ns, o) + front(ns);
    if (o.labels !== false) s += labels(o);
    s += '</g>';
    return o.raw ? s : tplAttrs(s);
  }
  function defsMarkup(ns, o) { var s = defs(ns); return o && o.raw ? s : tplAttrs(s); }

  /* computer + controller on their table (approved desk), placed by the page; texts verbatim */
  var DK = { x0: 1040, y0: 300 };
  function desk(ns, o) {
    var s = '<g transform="translate(' + r1(o.x - DK.x0 * o.s) + ' ' + r1(o.y - DK.y0 * o.s) + ') scale(' + o.s + ')">';
    var x0 = 1040, x1 = 1412, top = 522;
    s += P('M' + (x0 + 14) + ' ' + (top - 14) + ' H' + (x1 - 6) + ' L' + x1 + ' ' + top + ' H' + x0 + ' Z', 'fill="#dde3ea" stroke="#9aa6b5" stroke-width="1"');
    s += R(x0, top, x1 - x0, 12, 'fill="' + u(ns, 'Desk') + '" stroke="#9aa6b5" stroke-width="1"') + R(x0 + 8, top + 12, x1 - x0 - 16, 8, 'fill="' + u(ns, 'NavyV') + '"');
    [x0 + 12, x1 - 26].forEach(function (x) { s += R(x, top + 20, 14, (o.legs || 200), 'fill="' + u(ns, 'Navy') + '"') + R(x - 5, top + 20 + (o.legs || 200), 24, 8, 'rx="2" fill="#8794a5"'); });
    var mx0 = 1066, mx1 = 1284, my0 = 318, my1 = 478;
    s += R(1162, my1, 26, 30, 'fill="#3a4350"') + R(1130, top - 16, 90, 8, 'rx="3" fill="#2f3743"');
    s += R(mx0, my0, mx1 - mx0, my1 - my0, 'rx="8" fill="#232b36" stroke="#141a22" stroke-width="1.5"') + R(mx0 + 8, my0 + 8, mx1 - mx0 - 16, my1 - my0 - 22, 'rx="3" fill="' + u(ns, 'Screen') + '"');
    s += T(mx0 + 16, my0 + 24, o.title || 'PVT NEXUS · CELL MONITOR', MONO + ' font-size="10.5" letter-spacing=".6" fill="#7f9bbd"');
    (o.rows || []).forEach(function (r, i) {
      var y = my0 + 48 + i * 21;
      s += '<g' + (r[3] ? ' style="' + r[3] + '"' : '') + '>' + T(mx0 + 16, y, r[0], MONO + ' font-size="12" fill="#7f9bbd"') + T(mx1 - 16, y, r[1], 'text-anchor="end" ' + MONO + ' font-size="15" font-weight="600" fill="' + (r[2] || '#5fd4ff') + '"') + '</g>';
    });
    if (o.hi) s += R(mx0 - 5, my0 - 5, mx1 - mx0 + 10, my1 - my0 + 10, 'rx="10" fill="none" stroke="#46d39a" stroke-width="3" style="' + o.hi + '"');
    s += P('M1100 ' + (top - 6) + ' L1112 ' + (top - 13) + ' H1234 L1246 ' + (top - 6) + ' Z', 'fill="#4a5361" stroke="#2f3743" stroke-width="1"');
    var cx0 = 1300, cx1 = 1400, cy0 = 432;
    s += R(cx0, cy0, cx1 - cx0, top - 14 - cy0, 'rx="6" fill="' + u(ns, 'PanelV') + '" stroke="#8592a3" stroke-width="1.3"') + R(cx0, cy0, cx1 - cx0, 10, 'rx="5" fill="' + u(ns, 'NavyV') + '"');
    s += R(cx0 + 10, cy0 + 18, 80, 32, 'rx="3" fill="' + u(ns, 'Screen') + '" stroke="#3a4656" stroke-width="1"');
    s += T(cx0 + 50, cy0 + 40, o.ctl == null ? '' : o.ctl, 'text-anchor="middle" ' + MONO + ' font-size="15" font-weight="600" fill="#5fd4ff"');
    [0, 1, 2].forEach(function (i) { s += C(cx0 + 18 + i * 14, cy0 + 64, 4, 'fill="' + ['#2fbf7f', '#c9d0d9', '#c9d0d9'][i] + '" stroke="#7d8898" stroke-width=".8"'); });
    s += R(cx0 + 62, cy0 + 58, 26, 12, 'rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"');
    // monitor <-> controller cable
    s += P('M1300 470 C 1288 470, 1280 452, 1284 440', 'fill="none" stroke="#1e2733" stroke-width="5" stroke-linecap="round"') + R(1294, 462, 10, 14, 'rx="2" fill="#2a3340" stroke="#11161d" stroke-width="1"');
    if (o.label !== false) s += T(1175, 304, 'Computer', 'text-anchor="middle" ' + SANS + ' font-size="20" font-weight="600" fill="var(--txt, #1d2836)"') + T(1350, 424, 'Controller', 'text-anchor="middle" ' + SANS + ' font-size="20" font-weight="600" fill="var(--txt, #1d2836)"');
    s += '</g>';
    return o.raw ? s : tplAttrs(s);
  }
  function deskPt(o, x, y) { return [r1(o.x + (x - DK.x0) * o.s), r1(o.y + (y - DK.y0) * o.s)]; }
  /* signal cable: cell connector plate -> controller (dark sheathed, slack; never steel, never dashed) */
  function cable(co, dk, sag) {
    var a = pt(co, G.cab.x1 + 8, 612), b = deskPt(dk, 1300, 491), yb = Math.max(a[1], b[1]) + (sag || 40);
    var d = 'M' + a[0] + ' ' + a[1] + ' C ' + (a[0] + 30) + ' ' + yb + ', ' + (b[0] - 60) + ' ' + yb + ', ' + b[0] + ' ' + b[1];
    return '<g fill="none" stroke-linecap="round"><path d="' + d + '" stroke="#1e2733" stroke-width="3.2"/><path d="' + d + '" stroke="#47546a" stroke-width="1" opacity=".7"/></g>';
  }

  /* "Cell Details" pill drawn in a page SVG (opens components/CellDetails.js); same look as the Bottle Details pill */
  function pill(x, y, ctx, sc) {
    var w = 96, s = sc || 1;
    return '<g class="bd-pill" data-cd-open=""' + (ctx ? ' data-cd-ctx="' + ctx + '"' : '') + ' role="button" tabindex="0" aria-label="Cell Details" transform="translate(' + r1(x) + ' ' + r1(y) + ') scale(' + s + ')">' +
      '<rect x="0" y="0" width="' + w + '" height="22" rx="11"></rect>' +
      '<circle cx="12" cy="11" r="5.2" fill="none" stroke-width="1.4"></circle><path d="M12 9.6 V14 M12 7.6 V7.7" stroke-width="1.5" stroke-linecap="round" fill="none"></path>' +
      '<text x="' + (w / 2 + 7) + '" y="15" text-anchor="middle">Cell Details</text></g>';
  }

  window.PVTCellArt = {
    pill: pill,
    G: G, LEGACY: LEGACY, OLD: OLD, defs: defsMarkup, cell: cell, desk: desk, cable: cable, pt: pt, deskPt: deskPt,
    // outward-facing end of a port valve (external tubing attaches here), page coordinates
    port: function (o, k) { return pt(o || {}, G.port[k].x, G.hy); },
    // page y of the approved bore top/bottom and the old-frame -> page mapping, for pages that place overlays
    oldY: function (o, y) { return pt(o || {}, 0, G.bore.top + (y - OLD.top) * KY)[1]; },
    // transform (page coordinates) that maps the old page bore frame of pump k onto the approved bore, for overlays outside the clip
    oldMap: function (o, k) {
      var q = (o && o.at) || LEGACY, tx = G.x[k] - G.bore.hw - OLD[k] * KX, ty = G.bore.top - OLD.top * KY;
      return 'translate(' + r1(q.x + tx * q.s) + ' ' + r1(q.y + ty * q.s) + ') scale(' + (KX * q.s).toFixed(5) + ' ' + (KY * q.s).toFixed(5) + ')';
    }
  };
})();
