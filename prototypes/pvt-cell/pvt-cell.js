/* ==========================================================================
   PVT Nexus — PVT Cell prototype · drawing component (PVTCell)

   ONE permanent dual-cylinder PVT cell, drawn as SVG in fixed world units
   (viewBox 0 0 1480 800). Everything permanent is drawn once by mount():

     thermal enclosure + navy frame, Pump B (LEFT) and Pump A (RIGHT)
     cylinders, two cylinder valves (one valve block on top of each
     cylinder, T-handle above the roof), the built-in top header with the
     central pressure sensor, two fixed header ports (Port L / Port R),
     lower mechanical piston drives, panel displays, and the computer +
     controller on the desk to the right (signal cables).

   Only the operating state and the external connections vary, through
   update(state, timeSeconds). Exterior and cutaway are two layers over the
   SAME geometry (G), so switching view never moves a part.

   Volume -> piston position: pistonTop(v) is the only conversion. The sample
   always fills the chamber from the top of the bore down to the piston face.

   Drawing only: no thermodynamic calculation here.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------ geometry */
  var G = {
    W: 1480, H: 800, VB: '18 30 1400 768', ground: 756,
    cab: { x0: 330, x1: 900, post: 18, roof0: 100, roof1: 118, mid0: 470, mid1: 490, bot0: 722, bot1: 740 },
    x: { B: 470, A: 760 },        // cylinder axes: Pump B left, Pump A right (fixed)
    gx: 615,                      // pressure sensor axis
    hy: 183,                      // built-in header centreline
    blk: { y0: 162, y1: 198, hw: 24 },             // valve block on each cylinder top
    stem: { top: 70, hub: 62, bar: 55 },           // stem / T-handle (above the roof)
    fl: { t0: 198, t1: 214, b0: 438, b1: 454, hw: 56 },   // top / bottom flanges
    body: { y0: 214, y1: 438, hw: 42 },
    base: { y0: 454, y1: 470, hw: 48 },
    bore: { top: 222, bot: 430, hw: 27 },
    tie: 50,                      // tie-rod offset from the axis
    pist: 14,                     // piston height
    rodHW: 5,
    drive: { y0: 494, y1: 706, hw: 40, win0: 497, win1: 703, off: 282 },  // carriage centre = piston top + off
    // fixed ports on the frame posts; each has an isolation valve OUTSIDE the enclosure (v = valve axis).
    // x = outward-facing end of the valve: external tubing or the rated plug attaches here
    port: { L: { x: 262, wall: 330, v: 292 }, R: { x: 968, wall: 900, v: 938 } },
    pv: { hw: 14, hh: 14, bonnet: 12, stemTop: 132, bar: 126 },   // port isolation valve body / stem / T-handle
    cap: 100                      // cc per cylinder (project value, see README)
  };
  G.stroke = G.bore.bot - G.bore.top - G.pist;   // 194 units = full capacity

  // the single shared volume -> piston conversion (sample above the piston)
  function frac(v, cap) { cap = cap || G.cap; return Math.max(0, Math.min(1, v / cap)); }
  function pistonTop(v, cap) { return G.bore.top + G.stroke * frac(v, cap); }

  /* ------------------------------------------------------------- helpers */
  function r1(v) { return Math.round(v * 10) / 10; }
  function at(o) { var s = ''; for (var k in o) if (o[k] != null) s += ' ' + k + '="' + o[k] + '"'; return s; }
  function R(x, y, w, h, a) { return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '" ' + (a || '') + '/>'; }
  function C(x, y, r, a) { return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(r) + '" ' + (a || '') + '/>'; }
  function P(d, a) { return '<path d="' + d + '" ' + (a || '') + '/>'; }
  function L(x1, y1, x2, y2, a) { return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" ' + (a || '') + '/>'; }
  function T(x, y, s, a) { return '<text x="' + r1(x) + '" y="' + r1(y) + '" ' + (a || '') + '>' + s + '</text>'; }
  var K = 'stroke="#2a3443"';
  function fmt(v, d) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  // rounded orthogonal path through points (tubing bends)
  function bend(pts, r) {
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p = pts[i], p1 = pts[i + 1];
      var a = Math.min(r, Math.hypot(p[0] - p0[0], p[1] - p0[1]) / 2), b = Math.min(r, Math.hypot(p1[0] - p[0], p1[1] - p[1]) / 2);
      var ux = Math.sign(p[0] - p0[0]), uy = Math.sign(p[1] - p0[1]), vx = Math.sign(p1[0] - p[0]), vy = Math.sign(p1[1] - p[1]);
      d += ' L' + (p[0] - ux * a) + ' ' + (p[1] - uy * a) + ' Q' + p[0] + ' ' + p[1] + ' ' + (p[0] + vx * b) + ' ' + (p[1] + vy * b);
    }
    var e = pts[pts.length - 1];
    return d + ' L' + e[0] + ' ' + e[1];
  }

  var DESK_DX = -50;   // computer desk offset (behind the receiver position)
  /* ---------------------------------------------- external equipment spots */
  // SPS/PDS sample bottle (approved Oil Sample Bottle drawing, PBDraw) left of the cell
  var BTL = { x: 130, y: 522, s: 0.5 };
  BTL.out = [BTL.x + 48 * BTL.s, BTL.y - 281 * BTL.s];   // side outlet of the sample-side valve (top)
  BTL.drv = [BTL.x + 48 * BTL.s, BTL.y + 281 * BTL.s];   // side outlet of the driving-side valve (bottom)
  // transfer pump (driving fluid into the bottle's lower side, as on the Charge page) right of the bottle
  var TP = { x0: 190, x1: 300, y0: 600, y1: 706 };
  var TUBE_X = 236;   // external charge line riser (bottle -> Port L valve)
  // generic external receiver, right of the cell (placeholder for flash unit, viscometer, ...)
  var RCV = { x: 1000, y0: 300, y1: 470, hw: 30, cap: 100 };
  var ROUTE = {
    L: [BTL.out, [TUBE_X, BTL.out[1]], [TUBE_X, G.hy], [G.port.L.x, G.hy]],
    D: [[TP.x0, BTL.drv[1]], BTL.drv],
    R: [[G.port.R.x, G.hy], [RCV.x, G.hy], [RCV.x, RCV.y0 - 12]]
  };
  // internal flow paths (cylinder bore top -> riser -> header -> ...)
  var BT = G.bore.top;
  var FLOW = {
    A2B: [[G.x.A, BT], [G.x.A, G.hy], [G.x.B, G.hy], [G.x.B, BT]],
    L2A: ROUTE.L.concat([[G.x.A, G.hy], [G.x.A, BT]]),
    A2R: [[G.x.A, BT], [G.x.A, G.hy]].concat(ROUTE.R)
  };
  FLOW.D = ROUTE.D;   // driving fluid: transfer pump -> bottle (runs with L2A)
  FLOW.B2A = FLOW.A2B.slice().reverse();
  FLOW.A2L = FLOW.L2A.slice().reverse();
  FLOW.R2A = FLOW.A2R.slice().reverse();
  function poly(pts) { return 'M' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L'); }

  /* ---------------------------------------------------------------- defs */
  function defs() {
    var lg = function (id, stops, vert) {
      return '<linearGradient id="pc' + id + '" x1="0" y1="0" x2="' + (vert ? 0 : 1) + '" y2="' + (vert ? 1 : 0) + '">' +
        stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>';
    };
    var o = '';
    o += lg('Steel', [[0, '#5d6878'], [.1, '#9aa6b6'], [.28, '#d9dfe7'], [.36, '#f6f8fb'], [.46, '#c5ccd6'], [.7, '#8e99a8'], [.9, '#66717f'], [1, '#4a5361']]);
    o += lg('SteelD', [[0, '#4c5664'], [.3, '#a3adba'], [.42, '#dfe4ea'], [.6, '#939eac'], [1, '#434c59']]);
    o += lg('SteelV', [[0, '#eef1f5'], [.45, '#aeb7c3'], [1, '#6c7684']], true);
    o += lg('Panel', [[0, '#e9edf2'], [.5, '#f7f9fb'], [1, '#dfe4ea']]);
    o += lg('PanelV', [[0, '#f4f6f9'], [1, '#d9dee5']], true);
    o += lg('Navy', [[0, '#1d3a66'], [.5, '#28497a'], [1, '#183257']]);
    o += lg('NavyV', [[0, '#2b4c7e'], [1, '#183257']], true);
    o += lg('Oil', [[0, '#e0aa48'], [1, '#b47a22']], true);
    o += lg('Gas', [[0, '#e3eef4'], [1, '#c4dbe6']], true);
    o += lg('Bore', [[0, '#27303c'], [.5, '#3a4553'], [1, '#222a35']]);
    o += lg('Knob', [[0, '#1d222b'], [.4, '#4a5260'], [.55, '#5e6775'], [1, '#161a21']]);
    o += lg('Screen', [[0, '#0d1a2b'], [1, '#08111d']], true);
    o += lg('Desk', [[0, '#e7ebf0'], [1, '#c9d0d9']], true);
    o += '<pattern id="pcHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#c3cad4"/><line x1="0" y1="0" x2="0" y2="6" stroke="#6b7685" stroke-width="1.5"/></pattern>';
    o += '<pattern id="pcHatch2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="6" height="6" fill="#ccd2db"/><line x1="0" y1="0" x2="0" y2="6" stroke="#7a8594" stroke-width="1.3"/></pattern>';
    o += '<pattern id="pcThread" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#8f99a7"/><line x1="0" y1="0" x2="4" y2="2" stroke="#3c4553" stroke-width="1"/></pattern>';
    o += '<filter id="pcShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#1b2a40" flood-opacity=".18"/></filter>';
    return o;
  }

  /* ======================================================= static drawing */
  function desk() {
    var o = '<g id="pcDesk" transform="translate(' + DESK_DX + ' 0)">';
    var x0 = 1090, x1 = 1462, top = 522;
    // desk sits further back: smaller feet line, top drawn as a shallow slab
    o += P('M' + (x0 + 14) + ' ' + (top - 14) + ' H' + (x1 - 6) + ' L' + x1 + ' ' + top + ' H' + x0 + ' Z', 'fill="#dde3ea" stroke="#9aa6b5" stroke-width="1"');
    o += R(x0, top, x1 - x0, 12, 'fill="url(#pcDesk)" stroke="#9aa6b5" stroke-width="1"');
    o += R(x0 + 8, top + 12, x1 - x0 - 16, 8, 'fill="url(#pcNavyV)"');
    [x0 + 12, x1 - 26].forEach(function (x) { o += R(x, top + 20, 14, 722 - top - 20, 'fill="url(#pcNavy)"') + R(x - 5, 722, 24, 8, 'rx="2" fill="#8794a5"'); });
    o += R(x0 + 26, 676, x1 - x0 - 52, 9, 'fill="url(#pcNavyV)" opacity=".9"');
    // monitor
    var mx0 = 1116, mx1 = 1334, my0 = 318, my1 = 478;
    o += R(1212, my1, 26, 30, 'fill="#3a4350"') + R(1180, top - 16, 90, 8, 'rx="3" fill="#2f3743"');
    o += R(mx0, my0, mx1 - mx0, my1 - my0, 'rx="8" fill="#232b36" stroke="#141a22" stroke-width="1.5"');
    o += R(mx0 + 8, my0 + 8, mx1 - mx0 - 16, my1 - my0 - 22, 'rx="3" fill="url(#pcScreen)"');
    o += C((mx0 + mx1) / 2, my1 - 7, 2, 'fill="#5d6878"');
    o += '<g id="pcMon"></g>';
    // keyboard
    o += P('M1150 ' + (top - 6) + ' L1162 ' + (top - 13) + ' H1284 L1296 ' + (top - 6) + ' Z', 'fill="#4a5361" stroke="#2f3743" stroke-width="1"');
    // controller (control box)
    var cx0 = 1350, cx1 = 1450, cy0 = 432;
    o += R(cx0, cy0, cx1 - cx0, top - 14 - cy0, 'rx="6" fill="url(#pcPanelV)" stroke="#8592a3" stroke-width="1.3"');
    o += R(cx0, cy0, cx1 - cx0, 10, 'rx="5" fill="url(#pcNavyV)"');
    o += R(cx0 + 12, cy0 + 20, 76, 30, 'rx="3" fill="url(#pcScreen)" stroke="#3a4656" stroke-width="1"');
    o += '<text id="pcCtlP" x="' + (cx0 + 50) + '" y="' + (cy0 + 41) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="13" font-weight="600" fill="#5fd4ff">0</text>';
    [0, 1, 2].forEach(function (i) { o += C(cx0 + 18 + i * 14, cy0 + 64, 4, 'fill="' + ['#2fbf7f', '#c9d0d9', '#c9d0d9'][i] + '" stroke="#7d8898" stroke-width=".8"'); });
    o += R(cx0 + 62, cy0 + 58, 26, 12, 'rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"');
    return o + '</g>';
  }

  function cables() {
    // signal cables: dark sheathed, slack curves, plugs at both ends (never steel, never dashed)
    var o = '<g id="pcCables" fill="none" stroke-linecap="round" transform="translate(' + DESK_DX + ' 0)">';
    var c1 = 'M' + (G.cab.x1 + 8 - DESK_DX) + ' 612 C 1010 640, 1000 742, 1110 742 S 1300 742, 1340 690 S 1352 520, 1356 492';
    var c2 = 'M1350 470 C 1338 470, 1330 452, 1334 440';
    [c1, c2].forEach(function (d) { o += P(d, 'stroke="#1e2733" stroke-width="5"') + P(d, 'stroke="#47546a" stroke-width="1.6" opacity=".7"'); });
    // plugs
    o += R(G.cab.x1 - DESK_DX, 604, 12, 16, 'rx="2" fill="#2a3340" stroke="#11161d" stroke-width="1"');
    o += R(1350, 484, 10, 14, 'rx="2" fill="#2a3340" stroke="#11161d" stroke-width="1"');
    o += R(1344, 462, 10, 14, 'rx="2" fill="#2a3340" stroke="#11161d" stroke-width="1"');
    return o + '</g>';
  }

  function frame() {
    var c = G.cab, o = '';
    o += '<ellipse cx="' + ((c.x0 + c.x1) / 2) + '" cy="' + (G.ground + 2) + '" rx="320" ry="9" fill="#1b2a40" opacity=".10"/>';
    // stainless back panels (thermal enclosure, lower bay)
    o += R(c.x0 + c.post, c.roof1, c.x1 - c.x0 - 2 * c.post, c.mid0 - c.roof1, 'fill="url(#pcPanel)"');
    o += R(c.x0 + c.post, c.mid1, c.x1 - c.x0 - 2 * c.post, c.bot0 - c.mid1, 'fill="url(#pcPanel)" opacity=".85"');
    // enclosure inner shadow + light strip
    o += R(c.x0 + c.post, c.roof1, c.x1 - c.x0 - 2 * c.post, 8, 'fill="#1b2a40" opacity=".10"');
    o += R(c.x0 + 100, c.roof1 + 6, c.x1 - c.x0 - 160, 3, 'rx="1.5" fill="#ffffff" opacity=".95"');
    o += R(c.x0 + c.post, c.mid0 - 14, c.x1 - c.x0 - 2 * c.post, 14, 'fill="url(#pcSteelV)" opacity=".9"');   // enclosure floor plate
    // lower bay floor plate
    o += R(c.x0 + c.post, c.bot0 - 8, c.x1 - c.x0 - 2 * c.post, 8, 'fill="url(#pcSteelV)"');
    // panel fixing screws
    [[c.x1 - 34, c.roof1 + 22], [c.x0 + 34, c.mid0 - 24], [c.x1 - 34, c.mid0 - 24]].forEach(function (p) { o += C(p[0], p[1], 2.6, 'fill="#9aa5b3" stroke="#5d6878" stroke-width=".7"'); });
    return o;
  }
  function frameFront() {
    var c = G.cab, o = '';
    // navy frame: posts, roof, mid rail (enclosure floor), bottom rail, lower-bay centre post, feet
    o += R(c.x0, c.roof0, c.x1 - c.x0, c.roof1 - c.roof0, 'fill="url(#pcNavyV)" stroke="#132845" stroke-width="1"');
    o += R(c.x0, c.mid0, c.x1 - c.x0, c.mid1 - c.mid0, 'fill="url(#pcNavyV)" stroke="#132845" stroke-width="1"');
    o += R(c.x0, c.bot0, c.x1 - c.x0, c.bot1 - c.bot0, 'fill="url(#pcNavyV)" stroke="#132845" stroke-width="1"');
    [c.x0, c.x1 - c.post].forEach(function (x) { o += R(x, c.roof0, c.post, c.bot1 - c.roof0, 'fill="url(#pcNavy)" stroke="#132845" stroke-width="1"'); });
    o += R(G.gx - 8, c.mid1, 16, c.bot0 - c.mid1, 'fill="url(#pcNavy)" stroke="#132845" stroke-width="1"');
    [c.x0 + 8, c.x1 - 30, G.gx - 11].forEach(function (x) { o += R(x, c.bot1, 22, 6, 'fill="#5d6878"') + R(x - 4, c.bot1 + 6, 30, 10, 'rx="3" fill="url(#pcSteelD)" stroke="#3c4553" stroke-width=".8"'); });
    // roof grommets where the valve stems pass through
    ['B', 'A'].forEach(function (k) { o += R(G.x[k] - 11, c.roof0 - 3, 22, 4, 'rx="2" fill="#11203a"'); });
    // electrical connector plate (signal cables leave here)
    o += R(c.x1 - 2, 598, 10, 28, 'rx="2" fill="url(#pcSteelD)" stroke="#3c4553" stroke-width=".8"');
    // name plate
    o += R((c.x0 + c.x1) / 2 - 92, c.bot0 + 3, 184, 12, 'rx="2" fill="#e6ebf1" opacity=".95"');
    o += T((c.x0 + c.x1) / 2, c.bot0 + 12.5, 'DUAL-CYLINDER PVT CELL', 'text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9" font-weight="600" letter-spacing="1.2" fill="#1d3a66"');
    return o;
  }

  function header(cut) {
    var o = '', y = G.hy, x0 = G.port.L.x, x1 = G.port.R.x;
    // header tube (built-in, fixed): Port L - Pump B block - sensor tee - Pump A block - Port R
    var h0 = G.port.L.wall - 2, h1 = G.port.R.wall + 2;
    o += L(h0, y, h1, y, 'stroke="#4a5361" stroke-width="10" stroke-linecap="round"');
    o += L(h0, y, h1, y, 'stroke="url(#pcSteelV)" stroke-width="7.4"');
    o += L(h0 + 2, y - 2, h1 - 2, y - 2, 'stroke="#fff" stroke-width="1.3" opacity=".8"');
    if (cut) {
      o += L(h0, y, h1, y, 'stroke="#28313d" stroke-width="3.6"');
      // header fluid reaches each port valve seat (inner side of the valve)
      o += '<line id="pcHdrFluid" x1="' + (G.port.L.v + 3) + '" y1="' + y + '" x2="' + (G.port.R.v - 3) + '" y2="' + y + '" stroke="#d99a30" stroke-width="3.2" opacity="0"/>';
    }
    void x0; void x1;
    // sensor tee
    o += R(G.gx - 11, y - 10, 22, 20, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width="1"');
    if (cut) o += R(G.gx - 1.8, y, 3.6, 22, 'fill="#28313d"');
    // fixed bulkhead ports in the frame posts (Port L, Port R)
    ['L', 'R'].forEach(function (k) {
      var pp = G.port[k], s = k === 'L' ? -1 : 1, xw = pp.wall, xe = pp.x;
      o += R(Math.min(xw, xe), y - 3.6, Math.abs(xe - xw), 7.2, 'fill="url(#pcSteelV)" ' + K + ' stroke-width=".8"');      // stub: post -> valve -> outer end
      var nx = k === 'L' ? xw - 16 : xw;                                                                       // bulkhead nut on the post
      o += R(nx, y - 10, 16, 20, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width=".9"');
      o += L(nx + 5.3, y - 10, nx + 5.3, y + 10, 'stroke="#3c4553" stroke-width=".6" opacity=".6"') + L(nx + 10.7, y - 10, nx + 10.7, y + 10, 'stroke="#3c4553" stroke-width=".6" opacity=".6"');
      if (cut) {
        o += R(Math.min(xw, xe), y - 1.6, Math.abs(xe - xw), 3.2, 'fill="#28313d"');
        // outer side of the port valve (valve seat -> outward end): filled only by the external line
        var a0 = k === 'L' ? xe : pp.v + 3, a1 = k === 'L' ? pp.v - 3 : xe;
        o += '<line id="pcOut' + k + '" x1="' + a0 + '" y1="' + y + '" x2="' + a1 + '" y2="' + y + '" stroke="#d99a30" stroke-width="3.2" opacity="0"/>';
      }
      o += portValve(k, cut);
      // pressure-rated plug (unused port while the cell holds pressure or vacuum)
      var capX = k === 'L' ? xe - 14 : xe;
      o += '<g id="pcCap' + k + '">' + R(capX, y - 9.5, 14, 19, 'rx="2" fill="url(#pcSteelD)" stroke="#1d3a66" stroke-width="1.6"') +
        L(capX + 4.7, y - 9.5, capX + 4.7, y + 9.5, 'stroke="#2a3443" stroke-width=".7"') + L(capX + 9.3, y - 9.5, capX + 9.3, y + 9.5, 'stroke="#2a3443" stroke-width=".7"') +
        R(capX + (k === 'L' ? -4 : 14), y - 4, 4, 8, 'rx="1" fill="#1d3a66"') + '</g>';
      // open end (no plug, no tubing): allowed only at 0 psig
      o += '<g id="pcOpen' + k + '" opacity="0">' + C(xe, y, 5.5, 'fill="#28313d" stroke="#b0701a" stroke-width="1.6"') + '</g>';
      // tube nut of the external tubing (shown once connected)
      o += '<g id="pcNut' + k + '" opacity="0">' + R(capX + (k === 'L' ? 0 : 0), y - 8, 14, 16, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width=".9"') + '</g>';
      void s;
    });
    return o;
  }

  function valveBlock(k, cut) {
    var x = G.x[k], b = G.blk, o = '';
    // block: header passes straight through (side bores), cylinder bore below (needle seat), stem on top
    o += R(x - b.hw, b.y0, 2 * b.hw, b.y1 - b.y0, 'rx="3" fill="url(#pcSteelD)" ' + K + ' stroke-width="1.1"');
    o += R(x - b.hw + 4, b.y0 + 3, 5, b.y1 - b.y0 - 6, 'rx="2" fill="#fff" opacity=".35"');
    if (cut) {
      o += R(x - b.hw + 1, b.y0 + 1, 2 * b.hw - 2, b.y1 - b.y0 - 2, 'fill="url(#pcHatch2)" opacity=".85"');
      o += R(x - b.hw, G.hy - 1.8, 2 * b.hw, 3.6, 'fill="#28313d"');                 // header through-bore (always open)
      o += R(x - 1.8, G.hy, 3.6, b.y1 - G.hy + 16, 'fill="#28313d"');                // cylinder passage (to the bore)
      o += '<rect id="pcRiser' + k + '" x="' + (x - 1.6) + '" y="' + G.hy + '" width="3.2" height="' + (b.y1 - G.hy + 16) + '" fill="#d99a30" opacity="0"/>';
      // seat indication: a red bar across the cylinder passage while closed (internal mechanism not drawn)
      o += '<rect id="pcSeat' + k + '" x="' + (x - 7) + '" y="' + (G.hy + 6) + '" width="14" height="4" rx="1" fill="#c0392b"/>';
    }
    // bonnet + packing nut
    o += R(x - 13, b.y0 - 14, 26, 14, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width="1"');
    o += R(x - 9, b.y0 - 22, 18, 8, 'rx="1.5" fill="url(#pcSteelD)" ' + K + ' stroke-width=".9"');
    if (cut) o += R(x - 12, b.y0 - 13, 24, 12, 'fill="url(#pcHatch)" opacity=".8"');
    // stem + T-handle: drawn static (open/closed shown by the ring and tag; turns not verified)
    o += '<g id="pcStem' + k + '">';
    o += R(x - 3.5, G.stem.top, 7, b.y0 - 22 - G.stem.top + 2, 'fill="url(#pcSteelD)" ' + K + ' stroke-width=".7"');
    o += R(x - 8, G.stem.hub, 16, 10, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width=".8"');
    o += '<rect id="pcBar' + k + '" x="' + (x - 30) + '" y="' + G.stem.bar + '" width="60" height="8" rx="4" fill="url(#pcSteelD)" ' + K + ' stroke-width=".9"/>';
    o += C(x, G.stem.bar - 1, 6.5, 'fill="url(#pcSteelV)" ' + K + ' stroke-width=".8"');
    o += '</g>';
    o += '<rect id="pcVring' + k + '" x="' + (x - b.hw - 4) + '" y="' + (b.y0 - 4) + '" width="' + (2 * b.hw + 8) + '" height="' + (b.y1 - b.y0 + 8) + '" rx="6" fill="none" stroke="#2fa66f" stroke-width="3" opacity="0"/>';
    o += '<g id="pcTag' + k + '">' + R(x + 12, 76, 62, 18, 'rx="9" fill="#e4e8ee" stroke="#9aa6b5" stroke-width="1"') +
      '<text x="' + (x + 43) + '" y="89" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="600" letter-spacing=".6" fill="#566578">CLOSED</text></g>';
    return o;
  }

  // isolation valve directly at a port, outside the enclosure: inline body on the port stub, stem and T-handle on top
  function portValve(k, cut) {
    var x = G.port[k].v, v = G.pv, y = G.hy, o = '';
    o += R(x - v.hw, y - v.hh, 2 * v.hw, 2 * v.hh, 'rx="3" fill="url(#pcSteelD)" ' + K + ' stroke-width="1.1"');
    o += R(x - v.hw + 3, y - v.hh + 3, 4, 2 * v.hh - 6, 'rx="2" fill="#fff" opacity=".35"');
    if (cut) {
      o += R(x - v.hw + 1, y - v.hh + 1, 2 * v.hw - 2, 2 * v.hh - 2, 'fill="url(#pcHatch2)" opacity=".85"');
      o += R(x - v.hw, y - 1.8, 2 * v.hw, 3.6, 'fill="#28313d"');                                         // through-bore
      o += '<rect id="pcSeat' + k + '" x="' + (x - 2) + '" y="' + (y - 7) + '" width="4" height="14" rx="1" fill="#c0392b"/>';   // seat bar (closed)
    }
    o += R(x - 9, y - v.hh - v.bonnet, 18, v.bonnet, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width=".9"');
    if (cut) o += R(x - 8, y - v.hh - v.bonnet + 1, 16, v.bonnet - 2, 'fill="url(#pcHatch)" opacity=".8"');
    o += R(x - 3, v.stemTop, 6, y - v.hh - v.bonnet - v.stemTop, 'fill="url(#pcSteelD)" ' + K + ' stroke-width=".6"');
    o += R(x - 6.5, v.bar + 5, 13, 8, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width=".7"');
    o += R(x - 22, v.bar, 44, 7, 'rx="3.5" fill="url(#pcSteelD)" ' + K + ' stroke-width=".8"');
    o += C(x, v.bar - 1, 5, 'fill="url(#pcSteelV)" ' + K + ' stroke-width=".7"');
    o += '<rect id="pcVring' + k + '" x="' + (x - v.hw - 4) + '" y="' + (y - v.hh - 4) + '" width="' + (2 * v.hw + 8) + '" height="' + (2 * v.hh + 8) + '" rx="5" fill="none" stroke="#2fa66f" stroke-width="2.6" opacity="0"/>';
    o += '<g id="pcTag' + k + '">' + R(x - 31, 100, 62, 18, 'rx="9" fill="#e4e8ee" stroke="#9aa6b5" stroke-width="1"') +
      '<text x="' + x + '" y="113" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="600" letter-spacing=".6" fill="#566578">CLOSED</text></g>';
    return o;
  }

  function cylinder(k, cut) {
    var x = G.x[k], f = G.fl, bd = G.body, br = G.bore, o = '';
    // tie rods (both views)
    [-1, 1].forEach(function (s) { o += R(x + s * G.tie - 3, f.t0, 6, f.b1 - f.t0, 'fill="url(#pcSteelD)" ' + K + ' stroke-width=".7"'); });
    if (!cut) {
      o += R(x - bd.hw, bd.y0, 2 * bd.hw, bd.y1 - bd.y0, 'fill="url(#pcSteel)" ' + K + ' stroke-width="1.2"');
      o += R(x - bd.hw + 9, bd.y0 + 6, 5, bd.y1 - bd.y0 - 12, 'rx="2.5" fill="#fff" opacity=".45"');
      // grooves and the identity plate
      [bd.y0 + 22, bd.y1 - 22].forEach(function (y) { o += L(x - bd.hw, y, x + bd.hw, y, 'stroke="#4a5361" stroke-width="1" opacity=".45"'); });
      o += R(x - 17, 302, 34, 30, 'rx="4" fill="#1d3a66" stroke="#132845" stroke-width="1"');
      o += T(x, 324, k, 'text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="20" font-weight="700" fill="#ffffff"');
    } else {
      // section: hatched walls, open bore
      o += R(x - bd.hw, bd.y0, bd.hw - br.hw, bd.y1 - bd.y0, 'fill="url(#pcHatch)" ' + K + ' stroke-width="1"');
      o += R(x + br.hw, bd.y0, bd.hw - br.hw, bd.y1 - bd.y0, 'fill="url(#pcHatch)" ' + K + ' stroke-width="1"');
      o += R(x - br.hw, bd.y0, 2 * br.hw, bd.y1 - bd.y0, 'fill="url(#pcBore)"');
      o += '<g id="pcIn' + k + '"></g>';
      o += R(x - br.hw, br.top, 2 * br.hw, br.bot - br.top, 'fill="none" stroke="#6b7685" stroke-width=".8"');
    }
    // flanges (top + bottom) and base block
    o += R(x - f.hw, f.t0, 2 * f.hw, f.t1 - f.t0, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width="1"');
    o += R(x - f.hw, f.b0, 2 * f.hw, f.b1 - f.b0, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width="1"');
    o += R(x - G.base.hw, G.base.y0, 2 * G.base.hw, G.base.y1 - G.base.y0, 'fill="url(#pcSteelV)" ' + K + ' stroke-width="1"');
    [-1, 1].forEach(function (s) { o += C(x + s * G.tie, f.t0 + 8, 4.5, 'fill="url(#pcSteelV)" ' + K + ' stroke-width=".7"') + C(x + s * G.tie, f.b1 - 8, 4.5, 'fill="url(#pcSteelV)" ' + K + ' stroke-width=".7"'); });
    if (cut) {
      o += R(x - f.hw + 1, f.t0 + 1, 2 * f.hw - 2, f.t1 - f.t0 - 2, 'fill="url(#pcHatch2)" opacity=".8"');
      o += R(x - f.hw + 1, f.b0 + 1, 2 * f.hw - 2, f.b1 - f.b0 - 2, 'fill="url(#pcHatch2)" opacity=".8"');
      o += R(x - 1.8, f.t0, 3.6, br.top - f.t0, 'fill="#28313d"');            // top port drilling
      o += R(x - G.rodHW - 1, f.b0, 2 * G.rodHW + 2, G.base.y1 - f.b0, 'fill="#28313d"');   // rod gland bore
    }
    return o;
  }

  function drive(k, cut) {
    var x = G.x[k], d = G.drive, o = '';
    o += R(x - 14, G.cab.mid1, 28, d.y0 - G.cab.mid1, 'fill="url(#pcSteelD)" ' + K + ' stroke-width=".9"');      // coupling housing
    o += R(x - d.hw, d.y0, 2 * d.hw, d.y1 - d.y0, 'rx="3" fill="url(#pcSteel)" ' + K + ' stroke-width="1.2"');
    o += R(x - d.hw - 10, d.y1, 2 * d.hw + 20, G.cab.bot0 - 8 - d.y1, 'fill="url(#pcSteelV)" ' + K + ' stroke-width="1"');   // base plate
    [-1, 1].forEach(function (s) { o += C(x + s * (d.hw + 4), d.y1 + 3, 2, 'fill="#4a5361"'); });
    // window slot with a 0-100 cc scale (exterior shows the carriage = piston position)
    o += R(x - 9, d.win0, 18, d.win1 - d.win0, 'rx="3" fill="#3a4553" stroke="#2a3443" stroke-width="1"');
    if (cut) o += R(x - d.hw + 1, d.y0 + 1, 2 * d.hw - 2, d.y1 - d.y0 - 2, 'fill="url(#pcHatch)" opacity=".35"') +
      R(x - 9, d.win0, 18, d.win1 - d.win0, 'fill="#3a4553"') + R(x - 3, d.win0, 6, d.win1 - d.win0, 'fill="url(#pcThread)"');   // lead screw
    for (var i = 0; i <= 10; i++) {
      var y = G.bore.top + G.stroke * i / 10 + d.off, big = i % 5 === 0;
      o += L(x + 12, y, x + (big ? 24 : 18), y, 'stroke="#2a3443" stroke-width="' + (big ? 1.2 : .8) + '"');
      if (big) o += T(x + 27, y + 4, String(i * 10) + (i === 10 ? ' cc' : ''), 'font-family="IBM Plex Mono, monospace" font-size="11" fill="#2a3443"');
    }
    o += '<g id="pcCar' + k + '">' + R(x - 13, -7, 26, 14, 'rx="2" fill="#d99a30" stroke="#7a5212" stroke-width="1"') + L(x + 9, 0, x + 26, 0, 'stroke="#b8434e" stroke-width="2"') + '</g>';
    return o;
  }

  function sensor() {
    var x = G.gx, o = '';
    o += R(x - 5, G.hy + 10, 10, 16, 'fill="url(#pcSteelD)" ' + K + ' stroke-width=".8"');
    o += C(x, 232, 36, 'fill="url(#pcSteelD)" ' + K + ' stroke-width="1.2"');
    o += C(x, 232, 29, 'fill="url(#pcScreen)" stroke="#5d6878" stroke-width="1.5"');
    o += C(x, 232, 26, 'fill="none" stroke="#2fa6d6" stroke-width="1" opacity=".45"');
    o += '<text id="pcGaugeP" x="' + x + '" y="236" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="15" font-weight="600" fill="#5fd4ff">0</text>';
    o += T(x, 250, 'psig', 'text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9" fill="#8fb3cc"');
    // panel displays: sample volume and temperature
    var px = x - 72, w = 144;
    o += R(px, 282, w, 82, 'rx="6" fill="url(#pcSteelD)" ' + K + ' stroke-width="1"');
    o += R(px + 6, 288, w - 12, 70, 'rx="4" fill="url(#pcScreen)"');
    o += T(x, 304, 'SAMPLE VOLUME', 'text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" letter-spacing=".8" fill="#9fb3cc"');
    o += T(px + 14, 326, 'B', 'font-family="IBM Plex Mono, monospace" font-size="13" font-weight="600" fill="#9fb3cc"') + '<text id="pcVolB" x="' + (px + w - 14) + '" y="326" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="15" font-weight="600" fill="#ffc56b">0.0 cc</text>';
    o += T(px + 14, 348, 'A', 'font-family="IBM Plex Mono, monospace" font-size="13" font-weight="600" fill="#9fb3cc"') + '<text id="pcVolA" x="' + (px + w - 14) + '" y="348" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="15" font-weight="600" fill="#ffc56b">0.0 cc</text>';
    o += R(px, 374, w, 58, 'rx="6" fill="url(#pcSteelD)" ' + K + ' stroke-width="1"');
    o += R(px + 6, 380, w - 12, 46, 'rx="4" fill="url(#pcScreen)"');
    o += T(x, 396, 'TEMPERATURE', 'text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" letter-spacing=".8" fill="#9fb3cc"');
    o += '<text id="pcTemp" x="' + x + '" y="418" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="17" font-weight="600" fill="#7ff0bf">0 °C</text>';
    return o;
  }

  function receiver(cut) {
    var r = RCV, o = '<g id="pcRcv" opacity="0">';
    // floor stand
    o += R(r.x - 4, r.y1, 8, G.ground - r.y1 - 6, 'fill="url(#pcSteelD)" ' + K + ' stroke-width=".7"');
    o += R(r.x - 46, G.ground - 8, 92, 8, 'rx="2" fill="url(#pcSteelV)" ' + K + ' stroke-width=".8"');
    o += R(r.x - r.hw - 8, r.y1 - 4, 2 * r.hw + 16, 8, 'rx="2" fill="url(#pcSteelV)" ' + K + ' stroke-width=".8"');
    // vessel
    o += R(r.x - r.hw, r.y0, 2 * r.hw, r.y1 - r.y0 - 4, 'rx="8" fill="url(#pcSteel)" ' + K + ' stroke-width="1.1"');
    if (cut) {
      o += R(r.x - r.hw + 6, r.y0 + 8, 2 * r.hw - 12, r.y1 - r.y0 - 20, 'rx="4" fill="url(#pcBore)"');
      o += '<rect id="pcRcvFill" x="' + (r.x - r.hw + 6) + '" y="' + (r.y1 - 12) + '" width="' + (2 * r.hw - 12) + '" height="0" fill="url(#pcOil)"/>';
    } else {
      o += R(r.x - r.hw + 7, r.y0 + 8, 4, r.y1 - r.y0 - 22, 'rx="2" fill="#fff" opacity=".45"');
    }
    o += R(r.x - 9, r.y0 - 12, 18, 13, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width=".9"');   // inlet fitting
    return o + '</g>';
  }

  function bottle(cut) {
    var D = window.PBDraw;
    if (!D) return '';
    var ns = 'pcb', o = '<g id="pcBtl" opacity="0">';
    // support stand: rod behind the bottle, base on the floor, two jaw clamps
    o += R(BTL.x - 70, G.ground - 8, 140, 8, 'rx="2" fill="url(#pcSteelV)" ' + K + ' stroke-width=".8"');
    o += R(BTL.x - 52, 300, 6, G.ground - 308, 'fill="url(#pcSteelD)" ' + K + ' stroke-width=".7"');
    [430, 610].forEach(function (y) { o += R(BTL.x - 52, y - 4, 34, 8, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width=".7"'); });
    var inner = '<rect id="pcBtlDrive" x="-22" y="-226" width="44" height="452" fill="url(#' + ns + 'Drive)"/>' +
      '<rect id="pcBtlOil" x="-22" y="-226" width="44" height="0" fill="url(#' + ns + 'Oil)"/>' +
      '<g id="pcBtlPist">' + D.mixRing(ns, 0, -226 - 8.5) + D.piston(ns, -226) + '</g>';
    o += '<g transform="translate(' + BTL.x + ' ' + BTL.y + ') scale(' + BTL.s + ')" style="color:#8fa3c2">' +
      '<g id="pcBtlBody">' + D.oil(ns, { view: cut ? 'cutaway' : 'exterior', live: { inner: inner, ringT: 'currentColor', needleT: 'transform:translateY(var(--btlN,0px))',
        ringB: '#2fa66f', needleB: 'transform:translateY(-7px)' } }) + '</g></g>';   // driving-side valve open while the pump is connected (as on Charge)
    // pump line: transfer pump outlet -> bottle driving-side valve (driving fluid)
    var d = poly(ROUTE.D);
    o += P(d, 'fill="none" stroke="#4a5361" stroke-width="8.4" stroke-linecap="round"') + P(d, 'fill="none" stroke="url(#pcSteelV)" stroke-width="6" stroke-linecap="round"');
    if (cut) o += P(d, 'fill="none" stroke="#5b93c4" stroke-width="2.6"');
    o += transferPump(cut);
    return o + '</g>';
  }

  function transferPump(cut) {
    var t = TP, o = '', w = t.x1 - t.x0;
    [t.x0 + 10, t.x1 - 22].forEach(function (x) { o += R(x, t.y1, 12, G.ground - t.y1 - 4, 'fill="url(#pcSteelD)" ' + K + ' stroke-width=".7"') + R(x - 6, G.ground - 6, 24, 6, 'rx="2" fill="#8794a5"'); });
    o += R(t.x0, t.y0, w, t.y1 - t.y0, 'rx="6" fill="url(#pcPanelV)" stroke="#8592a3" stroke-width="1.3"');
    o += R(t.x0, t.y0, w, 9, 'rx="5" fill="url(#pcNavyV)"');
    o += R(t.x0 + 10, t.y0 + 18, w - 20, 26, 'rx="3" fill="url(#pcScreen)" stroke="#3a4656" stroke-width="1"');
    o += '<text id="pcTPv" x="' + (t.x0 + w / 2) + '" y="' + (t.y0 + 36) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="13" font-weight="600" fill="#5fd4ff">100.0 mL</text>';
    o += C(t.x1 - 26, t.y0 + 72, 14, 'fill="url(#pcSteelD)" ' + K + ' stroke-width="1"') + C(t.x1 - 26, t.y0 + 72, 9.5, 'fill="#f4f6f9" stroke="#5d6878" stroke-width=".8"') + L(t.x1 - 26, t.y0 + 72, t.x1 - 21, t.y0 + 65, 'stroke="#c0392b" stroke-width="1.6"');
    o += R(t.x0 + 12, t.y0 + 56, 40, 10, 'rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"') + R(t.x0 + 12, t.y0 + 72, 40, 10, 'rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"');
    o += R(t.x0 - 8, BTL.drv[1] - 8, 10, 16, 'rx="2" fill="url(#pcSteelD)" ' + K + ' stroke-width=".9"');   // outlet fitting
    void cut;
    return o;
  }

  function tubing(k) {
    var d = bend(ROUTE[k], 12);
    return '<g id="pcTube' + k + '" fill="none" stroke-linecap="round">' +
      '<path d="' + d + '" pathLength="1" stroke="#4a5361" stroke-width="8.4" stroke-dasharray="1 1" stroke-dashoffset="1"/>' +
      '<path d="' + d + '" pathLength="1" stroke="url(#pcSteelV)" stroke-width="6" stroke-dasharray="1 1" stroke-dashoffset="1"/>' +
      '<path d="' + d + '" pathLength="1" stroke="#ffffff" stroke-width="1.3" opacity=".75" stroke-dasharray="1 1" stroke-dashoffset="1"/>' +
      '<path id="pcTubeFluid' + k + '" d="' + d + '" stroke="#d99a30" stroke-width="2.6" opacity="0"/>' +
      '</g>';
  }
  function labels() {
    var o = '<g id="pcLabels" font-family="IBM Plex Sans, sans-serif" font-size="17" font-weight="600" fill="#1d2836" paint-order="stroke" stroke="#f3f6fa" stroke-width="4" stroke-linejoin="round">';
    var lead = function (x1, y1, x2, y2) { return L(x1, y1, x2, y2, 'stroke="#56657a" stroke-width="1.2" paint-order="normal"'); };
    var sub = 'font-size="14" font-weight="500" fill="#566578"';
    // valves
    o += lead(G.x.B + 32, 58, 504, 58) + T(508, 54, 'Pump B valve') + T(508, 72, 'cylinder valve 1', sub);

    o += lead(G.x.A + 32, 58, 826, 58) + T(830, 54, 'Pump A valve') + T(830, 72, 'cylinder valve 2', sub);
    // header ports
    ['L', 'R'].forEach(function (k) {
      var x = G.port[k].v;
      // name below the valve (the space above is shared with the cylinder-valve labels); state line under it
      o += T(x, 226, 'Port ' + k + ' valve', 'text-anchor="middle"');
      o += '<text id="pcPort' + k + 'Txt" x="' + x + '" y="244" text-anchor="middle" ' + sub + '>rated plug</text>';
    });
    o += T(G.gx, 154, 'Pressure sensor', 'text-anchor="middle" font-size="15"');
    o += T(G.gx, 460, 'Thermal enclosure', 'text-anchor="middle" ' + sub);
    o += T(G.x.B, 790, 'Pump B · piston drive', 'text-anchor="middle"');
    o += T(G.x.A, 790, 'Pump A · piston drive', 'text-anchor="middle"');
    o += T(1225 + DESK_DX, 302, 'Computer', 'text-anchor="middle"');
    o += T(1400 + DESK_DX, 420, 'Controller', 'text-anchor="middle"');
    o += T(1190 + DESK_DX, 734, 'Signal cables', 'text-anchor="middle" ' + sub);
    o += '<g id="pcLblBtl" opacity="0">' + T(BTL.x, 322, 'SPS/PDS sample bottle', 'text-anchor="middle"') + T(BTL.out[0] + 6, BTL.out[1] - 14, 'bottle valve', sub) +
      T((TP.x0 + TP.x1) / 2, 782, 'Transfer pump', 'text-anchor="middle"') + T(BTL.drv[0] + 4, BTL.drv[1] + 32, 'pump line', sub) + '</g>';
    o += '<g id="pcLblRcv" opacity="0">' + T(RCV.x + 14, 238, 'External equipment') + T(RCV.x + 14, 256, 'generic receiver (placeholder)', sub) + '</g>';
    return o + '</g>';
  }

  function flows() {
    var o = '<g id="pcFlows" fill="none" stroke-linecap="round" stroke-linejoin="round">';
    Object.keys(FLOW).forEach(function (k) {
      o += '<g id="pcFlow' + k + '" opacity="0"><path d="' + poly(FLOW[k]) + '" stroke="#ffffff" stroke-width="6.5" stroke-dasharray="8 12"/>' +
        '<path d="' + poly(FLOW[k]) + '" stroke="' + (k === 'D' ? '#2a6fb0' : '#e8590c') + '" stroke-width="3.6" stroke-dasharray="8 12"/></g>';
    });
    return o + '</g>';
  }

  function layer(cut) {
    var o = '<g class="' + (cut ? 'pc-cut' : 'pc-ext') + '">';
    o += header(cut);
    // training-view note in the free area above the desk (inside the drawing, so the layout never shifts between views)
    if (cut) o += '<g font-family="IBM Plex Sans, sans-serif" text-anchor="middle">' + R(1010, 92, 340, 54, 'rx="8" fill="#1d3a66" opacity=".94"') +
      T(1180, 115, 'CUTAWAY · TRAINING VIEW', 'font-family="IBM Plex Mono, monospace" font-size="14" font-weight="700" letter-spacing="1" fill="#ffffff"') +
      T(1180, 135, 'The real cylinders are opaque stainless steel.', 'font-size="13.5" fill="#dfe8f5"') + '</g>';
    ['B', 'A'].forEach(function (k) { o += cylinder(k, cut) + drive(k, cut) + valveBlock(k, cut); });
    o += sensor();
    o += receiver(cut) + bottle(cut);
    o += '</g>';
    return o;
  }

  /* ============================================================== mount */
  function mount(host) {
    var svg = '<svg class="pc-svg" viewBox="' + G.VB + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Dual-cylinder PVT cell">' +
      '<defs>' + defs() + (window.PBDraw ? window.PBDraw.defs('pcb') : '') + '</defs>' +
      '<rect x="0" y="0" width="' + G.W + '" height="' + G.H + '" fill="none"/>' +
      '<g id="pcEquip">' + L(10, G.ground, G.W - 10, G.ground, 'stroke="#c9d1db" stroke-width="1.5"') +
      desk() + cables() + frame() +
      '<g id="pcViewExt">' + layer(false) + '</g><g id="pcViewCut">' + layer(true) + '</g>' +
      frameFront() + tubing('L') + tubing('R') + flows() + labels() + '</g>' +
      '<g id="pcPlumb" style="display:none">' + window.PVTPlumb.svg() + '</g>' +
      '</svg>';
    host.innerHTML = svg;
    var root = host.querySelector('svg');
    // both layers carry the same ids: index them per view
    var views = { exterior: root.querySelector('#pcViewExt'), cutaway: root.querySelector('#pcViewCut') };
    function q(id) { return root.querySelector('#' + id); }
    function qa(id) { return [views.exterior.querySelector('#' + id), views.cutaway.querySelector('#' + id)].filter(Boolean); }
    var view = 'exterior';

    function setView(v) {
      view = v;
      q('pcEquip').style.display = v === 'plumbing' ? 'none' : '';
      q('pcPlumb').style.display = v === 'plumbing' ? '' : 'none';
      views.exterior.style.display = v === 'exterior' ? '' : 'none';
      views.cutaway.style.display = v === 'cutaway' ? '' : 'none';
      root.classList.toggle('is-cut', v === 'cutaway');
    }
    function setLabels(on) { q('pcLabels').style.display = on ? '' : 'none'; }
    setView('exterior');

    // ---- cylinder contents (cutaway): built per frame, small fixed element count
    var BUB = [[.18, .05, 1.0, 2.6], [.72, .38, .82, 2.1], [.44, .66, 1.15, 3.0], [.86, .14, .94, 1.8], [.3, .52, .76, 2.3], [.6, .86, 1.08, 2.0], [.1, .27, .88, 1.7], [.52, .1, 1.22, 2.7]];
    function inside(k, S, t) {
      var x = G.x[k], br = G.bore, v = S['v' + k], pt = pistonTop(v, S.cap), hw = br.hw;
      var sh = pt - br.top, gf = Math.max(0, Math.min(.9, S.gas || 0)), gh = sh * gf, lh = sh - gh, o = '';
      if (sh > .2) {
        if (gh > .2) {
          o += R(x - hw, br.top, 2 * hw, gh, 'fill="url(#pcGas)"');
          for (var j = 0; j < 6; j++) o += C(x - hw + 6 + ((j * 0.37) % 1) * (2 * hw - 12), br.top + gh * ((j * 0.61 + .2) % 1), 1.3, 'fill="#7aa3b8" opacity=".6"');
        }
        o += R(x - hw, br.top + gh, 2 * hw, lh, 'fill="url(#pcOil)"');
        if (gh > .2) o += L(x - hw, br.top + gh, x + hw, br.top + gh, 'stroke="#f3d9a0" stroke-width="1.2"');
        // free-gas bubbles rising through the liquid (two-phase only)
        if (gf > .01 && lh > 10) {
          var a = Math.min(1, gf * 8);
          BUB.forEach(function (b) {
            var yy = pt - 4 - ((t * 14 * b[2] + b[1] * lh) % (lh - 6));
            o += C(x - hw + 5 + b[0] * (2 * hw - 10), yy, b[3], 'fill="#eef6fa" stroke="#9cc0d2" stroke-width=".6" opacity="' + a.toFixed(2) + '"');
          });
        }
      }
      // piston (seals, guide ring) + rod down to the drive carriage
      o += R(x - G.rodHW, pt + G.pist, 2 * G.rodHW, G.drive.off - G.pist, 'fill="url(#pcSteelD)" ' + K + ' stroke-width=".6"');
      o += R(x - hw, pt, 2 * hw, G.pist, 'rx="1.5" fill="url(#pcSteelD)" ' + K + ' stroke-width=".9"');
      [pt + 3.5, pt + G.pist - 3.5].forEach(function (y) { o += R(x - hw, y - 1.6, 3.2, 3.2, 'fill="#141920"') + R(x + hw - 3.2, y - 1.6, 3.2, 3.2, 'fill="#141920"'); });
      o += R(x - hw, pt + G.pist / 2 - 1.2, 2 * hw, 2.4, 'fill="#d9cfae" opacity=".8"');
      return o;
    }

    function valve(k, open) {
      // state indication only: ring + tag cross-fade; the seat bar fades out as the valve opens
      setAll('pcVring' + k, 'opacity', open.toFixed(2));   // k = 'A' | 'B' (cylinder valves) | 'L' | 'R' (port valves)
      setAll('pcSeat' + k, 'opacity', (1 - open).toFixed(2));
      var st = open >= .5 ? 'OPEN' : 'CLOSED';
      qa('pcTag' + k).forEach(function (g) {
        if (g.dataset.s === st) return; g.dataset.s = st;
        var c = st === 'OPEN' ? ['#dff3e8', '#4fae80', '#14603f'] : ['#e4e8ee', '#9aa6b5', '#566578'];
        g.firstChild.setAttribute('fill', c[0]); g.firstChild.setAttribute('stroke', c[1]);
        g.lastChild.setAttribute('fill', c[2]); g.lastChild.textContent = st;
      });
    }

    var LAST = {};
    function setTxt(id, s) { if (LAST[id] !== s) { LAST[id] = s; var e = q(id); if (e) e.textContent = s; } }
    function setAll(id, attr, val) { qa(id).forEach(function (e) { e.setAttribute(attr, val); }); }

    function update(S, t) {
      ['B', 'A'].forEach(function (k) {
        var pt = pistonTop(S['v' + k], S.cap);
        qa('pcCar' + k).forEach(function (e) { e.setAttribute('transform', 'translate(0 ' + (pt + G.drive.off).toFixed(2) + ')'); });
        if (view === 'cutaway') views.cutaway.querySelector('#pcIn' + k).innerHTML = inside(k, S, t);
        valve(k, S['valve' + k]);
        var rz = views.cutaway.querySelector('#pcRiser' + k);
        if (rz) rz.setAttribute('opacity', (S.hdr * (S['v' + k] > .05 || S['valve' + k] > .5 ? 1 : 0)).toFixed(2));
      });
      valve('L', S.valveL || 0); valve('R', S.valveR || 0);
      var hf = views.cutaway.querySelector('#pcHdrFluid'); if (hf) hf.setAttribute('opacity', (S.hdr || 0).toFixed(2));
      ['L', 'R'].forEach(function (k) {   // outer side of each port valve: sample only once the external line is filled
        var e = views.cutaway.querySelector('#pcOut' + k); if (e) e.setAttribute('opacity', (S['conn' + k] >= 1 ? (S['tf' + k] || 0) : 0).toFixed(2));
      });
      // displays (panel, controller, monitor)
      var pTxt = fmt(Math.round(S.P), 0);
      root.querySelectorAll('#pcGaugeP').forEach(function (e) { e.textContent = pTxt; });
      root.querySelectorAll('#pcVolB').forEach(function (e) { e.textContent = fmt(S.vB, 1) + ' cc'; });
      root.querySelectorAll('#pcVolA').forEach(function (e) { e.textContent = fmt(S.vA, 1) + ' cc'; });
      root.querySelectorAll('#pcTemp').forEach(function (e) { e.textContent = fmt(S.T, 1) + ' °C'; });
      setTxt('pcCtlP', pTxt);
      // ports: pressure-rated plug, open end (0 psig only), or external tubing (equipment appears, then tubing, then nut)
      ['L', 'R'].forEach(function (k) {
        var c = Math.max(0, Math.min(1, S['conn' + k] || 0)), pl = Math.max(0, Math.min(1, S['plug' + k] || 0));
        var eq = Math.min(1, c / .25), tube = Math.max(0, (c - .25) / .75);
        setAll('pcCap' + k, 'opacity', pl.toFixed(2));
        setAll('pcOpen' + k, 'opacity', ((1 - pl) * (1 - eq)).toFixed(2));
        setAll('pcNut' + k, 'opacity', tube >= .999 ? '1' : '0');
        q('pcTube' + k).querySelectorAll('path[pathLength]').forEach(function (p) { p.setAttribute('stroke-dashoffset', (1 - tube).toFixed(4)); });
        q('pcTubeFluid' + k).setAttribute('opacity', (view === 'cutaway' && tube >= .999 ? (S['tf' + k] || 0) : 0).toFixed(2));
        var eqId = k === 'L' ? 'pcBtl' : 'pcRcv';
        setAll(eqId, 'opacity', eq.toFixed(2));
        var lb = q(k === 'L' ? 'pcLblBtl' : 'pcLblRcv'); if (lb) lb.setAttribute('opacity', eq.toFixed(2));
        var lineTxt = (S['valve' + k] || 0) < .5 && tube >= .999 ? ' · line ' + fmt(Math.round(S['Pext' + k] || 0), 0) + ' psig' : '';
        setTxt('pcPort' + k + 'Txt', c > 0 ? (tube >= .999 ? 'connected' + lineTxt : 'connecting') : pl >= .5 ? 'rated plug' : 'open · 0 psig');
      });
      // bottle (approved Oil Sample Bottle): valve ring colour, needle lift, sample above the piston
      var bo = Math.max(0, Math.min(1, S.btlValve || 0));
      root.querySelectorAll('#pcBtl > g').forEach(function (g) { g.style.color = bo > .5 ? '#2fa66f' : '#8fa3c2'; g.style.setProperty('--btlN', (-7 * bo).toFixed(2) + 'px'); });
      // bottle: sample quantity (btlV) drawn against the existing simulator drawing scale (btlDraw) — not a capacity
      var gB = Math.max(0, Math.min(1, (S.btlV || 0) / (S.btlDraw || 800)));
      root.querySelectorAll('#pcTPv').forEach(function (e) { e.textContent = fmt(S.tpV == null ? 100 : S.tpV, 1) + ' mL'; });
      root.querySelectorAll('#pcBtlOil').forEach(function (e) { e.setAttribute('height', (406 * gB).toFixed(2)); });
      root.querySelectorAll('#pcBtlPist').forEach(function (e) { e.setAttribute('transform', 'translate(0 ' + (406 * gB).toFixed(2) + ')'); });
      // receiver fill (cutaway)
      var rf = views.cutaway.querySelector('#pcRcvFill');
      if (rf) { var h = (RCV.y1 - RCV.y0 - 20) * Math.max(0, Math.min(1, (S.rcvV || 0) / RCV.cap)); rf.setAttribute('y', (RCV.y1 - 12 - h).toFixed(2)); rf.setAttribute('height', h.toFixed(2)); }
      // flow: only along an open, connected path, only while the movement runs
      Object.keys(FLOW).forEach(function (k) {
        var on = (S.flow === k || (k === 'D' && S.flow === 'L2A')) && flowOpen(k === 'D' ? 'L2A' : k, S) ? 1 : 0;
        var e = q('pcFlow' + k);
        e.setAttribute('opacity', on ? '1' : '0');
        if (on) e.querySelectorAll('path').forEach(function (p) { p.setAttribute('stroke-dashoffset', (-t * 34).toFixed(1)); });
      });
      monitor(S);
      if (view === 'plumbing') window.PVTPlumb.update(root, S);
    }

    function flowOpen(k, S) {
      var A = S.valveA > .98, B = S.valveB > .98;
      if (k === 'A2B' || k === 'B2A') return A && B;
      if (k === 'L2A' || k === 'A2L') return A && S.connL >= 1 && S.btlValve > .98 && S.valveL > .98;
      if (k === 'A2R' || k === 'R2A') return A && S.connR >= 1 && S.valveR > .98;
      return false;
    }

    // computer screen: the same state as a compact synoptic
    var monHost = q('pcMon');
    function monitor(S) {
      var x0 = 1124, y0 = 326, o = '';
      o += T(x0 + 8, y0 + 14, 'PVT NEXUS · CELL MONITOR', 'font-family="IBM Plex Mono, monospace" font-size="9.5" letter-spacing=".6" fill="#7f9bbd"');
      ['B', 'A'].forEach(function (k, i) {
        var cx = x0 + 32 + i * 58, top = y0 + 26, h = 100, f = frac(S['v' + k], S.cap), w = 22;
        o += R(cx - w / 2, top, w, h, 'rx="2" fill="#16273b" stroke="#5d7a9c" stroke-width="1"');
        if (f > 0) {
          var gh = f * h * Math.max(0, Math.min(.9, S.gas || 0));
          if (gh > .3) o += R(cx - w / 2 + 2, top + 1, w - 4, gh, 'fill="#bcd6e3"');
          o += R(cx - w / 2 + 2, top + 1 + gh, w - 4, Math.max(0, f * h - gh - 1), 'fill="#e0aa48"');
        }
        o += R(cx - w / 2 + 1, top + f * h, w - 2, 4, 'fill="#c9d0d9"');
        o += T(cx, top + h + 14, k, 'text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="600" fill="#c9d6e6"');
        o += C(cx, top - 6, 3.5, 'fill="' + (S['valve' + k] > .98 ? '#2fd08a' : S['valve' + k] > .02 ? '#ffc56b' : '#5d6878') + '"');
      });
      var tx = x0 + 128, row = function (y, a, b, c) { return T(tx, y, a, 'font-family="IBM Plex Mono, monospace" font-size="9" fill="#7f9bbd"') + T(tx + 72, y, b, 'text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="600" fill="' + c + '"'); };
      o += row(y0 + 36, 'P psig', fmt(Math.round(S.P), 0), '#5fd4ff');
      o += row(y0 + 56, 'T °C', fmt(S.T, 1), '#7ff0bf');
      o += row(y0 + 76, 'B cc', fmt(S.vB, 1), '#ffc56b');
      o += row(y0 + 96, 'A cc', fmt(S.vA, 1), '#ffc56b');
      o += row(y0 + 116, 'Σ cc', fmt(S.vA + S.vB, 1), '#ffc56b');
      o += T(tx, y0 + 136, (S.gas || 0) > .005 ? 'two-phase (illus.)' : 'single-phase', 'font-family="IBM Plex Mono, monospace" font-size="9" fill="' + ((S.gas || 0) > .005 ? '#ffc56b' : '#7f9bbd') + '"');
      monHost.innerHTML = o;
    }

    return { root: root, update: update, setView: setView, setLabels: setLabels, flowOpen: flowOpen };
  }

  window.PVTCell = { G: G, pistonTop: pistonTop, frac: frac, mount: mount, FLOW: FLOW, ROUTE: ROUTE, BTL: BTL, RCV: RCV };
})();
