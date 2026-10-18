/* ==========================================================================
   PVT Nexus — bottle design prototype · drawing library (PBDraw)

   Editable SVG generators for the three physical vessel designs found in the
   project. Everything is drawn in LOCAL coordinates: vessel axis vertical,
   origin at the body centre, sample (top) port at negative y. The caller wraps
   the markup in one transform (translate + rotate), so every internal part
   stays aligned with the vessel in any orientation.

   Every gradient / pattern / clip id is prefixed with a namespace (ns), so
   several bottles can share one page without id collisions.

   Fluid colours are the project's own (SampleBottle.js / RecombSim.js FL),
   fixed in both themes like every fluid in the simulator.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- fluids */
  var FLUID = {
    oil:    { name: 'Sample oil',        a: '#e7b15a', b: '#c07f2e', line: '#d8973a', dash: '#fff1cf' },
    gas:    { name: 'Sample gas',        a: '#e3f8ee', b: '#8fd6b4', line: '#5cc79a', dash: '#e9fff4', dot: '#2f9d72' },
    n2:     { name: 'Nitrogen (N₂)',     a: '#8fb6c9', b: '#3d6577', line: '#7fa6ba', dash: '#e8f4fb', dot: '#e8f4fb' },
    water:  { name: 'Hydraulic water',   a: '#5aa6d8', b: '#2f6f9c', line: '#4a93c9', dash: '#dff1ff' },
    recomb: { name: 'Recombined fluid',  a: '#ecc377', b: '#cf9442', line: '#d8973a', dash: '#fff1cf' },
    vac:    { name: 'Vacuum / empty',    a: '#0a1420', b: '#0a1420', line: '#56637a', dash: '#dfe6f0', dot: '#56637a' }
  };

  /* -------------------------------------------------------------- geometry
     R  barrel outer half-width   rb bore half-width     body*  barrel span
     end 'cap' screwed end cap | 'flange' bolted flange | 'dome' rounded shoulder
     ch* internal chamber span    pist piston thickness (0 = no piston)       */
  var GEOM = {
    piston: { R: 44, rb: 33, bodyT: -152, bodyB: 152, end: 'cap', capR: 50, capH: 24,
              chT: -140, chB: 140, pist: 24, body: 'Cyl', collars: [-104, 96] },
    ti:     { R: 32, rb: 22, bodyT: -172, bodyB: 172, end: 'flange', capR: 41, capH: 14,
              chT: -165, chB: 165, pist: 14, body: 'Ti', collars: [] },
    gas:    { R: 48, rb: 40, bodyT: -178, bodyB: 178, end: 'dome', domeR: 46,
              chT: -170, chB: 170, pist: 0, body: 'Cyl', collars: [], band: [-118, -100] }
  };
  var STACK = { neckHW: 10, neckH: 16, valveHW: 19, valveH: 30, fitHW: 6, fitH: 18, nutHW: 10, nutH: 9 };
  Object.keys(GEOM).forEach(function (k) {
    var g = GEOM[k], s = STACK;
    g.endTop = g.end === 'dome' ? g.bodyT : g.bodyT - g.capH;   // outer face of the end closure
    g.neckT = g.endTop - s.neckH;
    g.yv = g.neckT - s.valveH / 2;                                // valve centre
    g.fitT = g.neckT - s.valveH - s.fitH;
    g.conn = g.fitT - s.nutH;                                     // connection point (tube end)
    g.halfW = Math.max(g.capR || g.R, s.valveHW + 37);            // incl. handwheel
  });

  /* ------------------------------------------------------------- helpers */
  function r1(v) { return Math.round(v * 10) / 10; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rect(x, y, w, h, a) { return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(Math.max(0, w)) + '" height="' + r1(Math.max(0, h)) + '" ' + (a || '') + '/>'; }
  function poly(p) { return p.length < 3 ? '' : 'M' + p.map(function (q) { return r1(q[0]) + ',' + r1(q[1]); }).join(' L') + ' Z'; }

  // convex polygon clip: keep the part with dot(p, n) <= c
  function clipHalf(P, n, c) {
    var out = [];
    for (var i = 0; i < P.length; i++) {
      var a = P[i], b = P[(i + 1) % P.length];
      var da = a[0] * n[0] + a[1] * n[1] - c, db = b[0] * n[0] + b[1] * n[1] - c;
      if (da <= 0) out.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) { var k = da / (da - db); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
    }
    return out;
  }
  function area(P) { var s = 0; for (var i = 0; i < P.length; i++) { var a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  function inside(P, x, y) {               // convex polygon, either winding
    var sgn = 0;
    for (var i = 0; i < P.length; i++) {
      var a = P[i], b = P[(i + 1) % P.length], c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
      if (c !== 0) { if (sgn === 0) sgn = c > 0 ? 1 : -1; else if ((c > 0 ? 1 : -1) !== sgn) return false; }
    }
    return true;
  }
  /* Liquid of a given area inside a convex region, lying on the side that is DOWN.
     g = gravity in local coordinates. Its free surface stays perpendicular to gravity. */
  function settle(R, liqArea, g) {
    var up = [-g[0], -g[1]], tot = area(R);
    if (liqArea <= .01) return { liq: [], rest: R };
    if (liqArea >= tot - .01) return { liq: R, rest: [] };
    var ds = R.map(function (q) { return q[0] * up[0] + q[1] * up[1]; });
    var lo = Math.min.apply(null, ds), hi = Math.max.apply(null, ds), c = lo;
    for (var it = 0; it < 34; it++) { c = (lo + hi) / 2; if (area(clipHalf(R, up, c)) < liqArea) lo = c; else hi = c; }
    return { liq: clipHalf(R, up, c), rest: clipHalf(R, [-up[0], -up[1]], -c) };
  }
  function bbox(P) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    P.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    return [x0, y0, x1, y1];
  }
  function halton(i, b) { var f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
  /* gas inventory drawn as n dots spread through the region: the same n in a smaller
     region reads denser (compression), fewer dots = less gas (discharge) */
  function dots(P, n, col, rad, t, motion, seed) {
    if (!P.length || n < 1) return '';
    var b = bbox(P), o = '', k = 0, i = 1 + (seed || 0) * 97;
    while (k < n && i < 4000) {
      var x = b[0] + 2.5 + (b[2] - b[0] - 5) * halton(i, 2), y = b[1] + 2.5 + (b[3] - b[1] - 5) * halton(i, 3);
      if (motion) { x += 1.1 * Math.sin(t * 2.1 + i * 1.7); y += 1.1 * Math.cos(t * 1.7 + i * 2.3); }
      if (inside(P, x, y)) { o += '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + rad + '"/>'; k++; }
      i++;
    }
    return '<g fill="' + col + '" opacity=".75">' + o + '</g>';
  }

  /* ----------------------------------------------------------------- defs */
  function defs(ns) {
    var lg = function (id, stops, vert) {
      return '<linearGradient id="' + ns + id + '" x1="0" y1="0" x2="' + (vert ? 0 : 1) + '" y2="' + (vert ? 1 : 0) + '">' +
        stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>';
    };
    var o = '';
    o += lg('Cyl', [[0, '#3a485f'], [.2, '#8094b2'], [.5, '#aebcd2'], [.8, '#54657f'], [1, '#222c3e']]);
    o += lg('Metal', [[0, '#283750'], [.15, '#6377a0'], [.42, '#b3c1d8'], [.58, '#7e90b0'], [.8, '#41506e'], [1, '#1f2a3e']]);
    o += lg('Ti', [[0, '#474b52'], [.22, '#8e929a'], [.5, '#c9ccd2'], [.78, '#6f737b'], [1, '#2e3238']]);
    o += lg('Pipe', [[0, '#6e82a4'], [.4, '#9cb0cd'], [.55, '#41526c'], [1, '#232f44']]);
    o += lg('PipeV', [[0, '#41526c'], [.45, '#9cb0cd'], [.6, '#6e82a4'], [1, '#232f44']]);
    o += lg('Plate', [[0, '#d7dee8'], [1, '#a9b5c6']], true);
    Object.keys(FLUID).forEach(function (k) {
      var f = FLUID[k];
      o += lg('F_' + k, k === 'n2' ? [[0, f.a, .9], [1, f.b, .95]] : [[0, f.a], [1, f.b]], true);
    });
    o += '<pattern id="' + ns + 'Hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#9aa8bd"/><line x1="0" y1="0" x2="0" y2="7" stroke="#3b475b" stroke-width="2.2"/></pattern>';
    o += '<pattern id="' + ns + 'HatchTi" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#b3b6bc"/><line x1="0" y1="0" x2="0" y2="7" stroke="#55585f" stroke-width="2.2"/></pattern>';
    o += '<symbol id="' + ns + 'Hw" viewBox="0 0 30 30" overflow="visible"><circle cx="15" cy="15" r="12.5" fill="none" stroke="#0a0e16" stroke-width="4.5"/><circle cx="15" cy="15" r="12.5" fill="none" stroke="#aebccf" stroke-width="2.6"/><g stroke="#9fb0c8" stroke-width="2.2" stroke-linecap="round"><line x1="15" y1="15" x2="15" y2="3.5"/><line x1="15" y1="15" x2="15" y2="26.5"/><line x1="15" y1="15" x2="3.5" y2="15"/><line x1="15" y1="15" x2="26.5" y2="15"/></g><circle cx="15" cy="15" r="4" fill="url(#' + ns + 'Metal)" stroke="#0a0e16" stroke-width="1"/></symbol>';
    Object.keys(GEOM).forEach(function (k) {
      var g = GEOM[k];
      o += '<clipPath id="' + ns + 'Bore_' + k + '">' + boreShape(g) + '</clipPath>';
      o += '<clipPath id="' + ns + 'Body_' + k + '">' + bodyShape(g) + '</clipPath>';
    });
    return o;
  }
  function boreShape(g, a) {
    if (g.end === 'dome') return rect(-g.rb, g.chT, 2 * g.rb, g.chB - g.chT, 'rx="' + (g.rb - 2) + '" ry="' + (g.domeR - 8) + '" ' + (a || ''));
    return rect(-g.rb, g.chT, 2 * g.rb, g.chB - g.chT, a || '');
  }
  function bodyShape(g, a) {
    if (g.end === 'dome') return rect(-g.R, g.bodyT, 2 * g.R, g.bodyB - g.bodyT, 'rx="' + g.R + '" ry="' + g.domeR + '" ' + (a || ''));
    return rect(-g.R, g.bodyT, 2 * g.R, g.bodyB - g.bodyT, a || '');
  }

  /* --------------------------------------------------------- end fittings
     Drawn for the TOP end; the bottom end is the same group mirrored in y.
     e = { open, capped, lineFluid, chamberFluid, flow (+1 into bottle), cut } */
  function endStack(ns, g, e, t, motion) {
    var s = STACK, o = '', cut = e.cut, hatch = 'url(#' + ns + (g.body === 'Ti' ? 'HatchTi' : 'Hatch') + ')';
    var vT = g.neckT - s.valveH, ring = e.open ? '#46d39a' : '#8fa3c2';
    // neck / port boss
    o += rect(-s.neckHW, g.neckT, 2 * s.neckHW, s.neckH + (g.end === 'dome' ? 4 : 1), 'fill="url(#' + ns + 'Metal)" stroke="#0a0e16" stroke-width=".8"');
    // tube fitting + nut (or blanking plug when the port is capped)
    o += rect(-s.fitHW, g.fitT, 2 * s.fitHW, s.fitH, 'fill="url(#' + ns + 'Pipe)" stroke="#0a0e16" stroke-width=".7"');
    if (e.capped) {
      o += '<path d="M' + (-s.nutHW) + ' ' + r1(g.fitT) + ' V' + r1(g.conn + 4) + ' Q' + (-s.nutHW) + ' ' + r1(g.conn - 2) + ' 0 ' + r1(g.conn - 2) + ' Q' + s.nutHW + ' ' + r1(g.conn - 2) + ' ' + s.nutHW + ' ' + r1(g.conn + 4) + ' V' + r1(g.fitT) + ' Z" fill="url(#' + ns + 'Metal)" stroke="#0a0e16" stroke-width=".8"/>';
    } else {
      o += rect(-s.nutHW, g.conn, 2 * s.nutHW, s.nutH, 'rx="1.5" fill="url(#' + ns + 'Metal)" stroke="#0a0e16" stroke-width=".8"');
      o += '<line x1="-3.5" y1="' + r1(g.conn + 1) + '" x2="-3.5" y2="' + r1(g.conn + s.nutH - 1) + '" stroke="#0a0e16" stroke-width=".6" opacity=".6"/><line x1="3.5" y1="' + r1(g.conn + 1) + '" x2="3.5" y2="' + r1(g.conn + s.nutH - 1) + '" stroke="#0a0e16" stroke-width=".6" opacity=".6"/>';
    }
    // valve body (needle valve) + bonnet + handwheel
    o += rect(-s.valveHW, vT, 2 * s.valveHW, s.valveH, 'rx="4" fill="url(#' + ns + 'Metal)" stroke="#0a0e16" stroke-width=".9"');
    o += rect(-s.valveHW + 3, vT + 3, 2 * s.valveHW - 6, 3, 'rx="1.5" fill="#ffffff" opacity=".16"');
    o += rect(s.valveHW, g.yv - 6, 7, 12, 'rx="1.5" fill="url(#' + ns + 'PipeV)" stroke="#0a0e16" stroke-width=".7"');   // packing nut
    o += rect(s.valveHW + 7, g.yv - 2.5, 9, 5, 'fill="url(#' + ns + 'PipeV)" stroke="#0a0e16" stroke-width=".6"');       // stem
    o += '<circle cx="' + (s.valveHW + 26) + '" cy="' + g.yv + '" r="13.5" fill="none" stroke="' + ring + '" stroke-width="1.8"/>';
    o += '<use href="#' + ns + 'Hw" x="' + (s.valveHW + 15) + '" y="' + (g.yv - 11) + '" width="22" height="22"/>';
    if (cut) {
      // section: hatched metal, drilled passage, needle seat
      [[-s.neckHW, g.neckT, 2 * s.neckHW, s.neckH], [-s.valveHW, vT, 2 * s.valveHW, s.valveH], [-s.fitHW, g.fitT, 2 * s.fitHW, s.fitH]].forEach(function (r) {
        o += rect(r[0] + .6, r[1] + .6, r[2] - 1.2, r[3] - 1.2, 'fill="' + hatch + '" opacity=".55"');
      });
      var pTop = e.capped ? g.fitT + 2 : g.conn, pBot = g.end === 'dome' ? g.chT + 6 : g.chT;
      o += rect(-2.6, pTop, 5.2, pBot - pTop, 'fill="#0a1420"');
      var fIn = e.chamberFluid, fOut = e.lineFluid;
      if (fIn && fIn !== 'vac') o += rect(-2.6, g.yv + 3, 5.2, pBot - g.yv - 3, 'fill="' + FLUID[fIn].line + '"');
      if (fOut && fOut !== 'vac' && (e.open || !e.capped)) o += rect(-2.6, pTop, 5.2, g.yv - 3 - pTop, 'fill="' + FLUID[fOut].line + '"');
      if (e.open && fIn && fIn !== 'vac' && fOut === fIn) o += rect(-2.6, g.yv - 3.2, 5.2, 6.4, 'fill="' + FLUID[fIn].line + '"');
      // needle: seated across the passage when closed, withdrawn when open
      var nx = e.open ? 6.5 : -3.4;
      o += '<path d="M' + r1(nx) + ' ' + g.yv + ' L' + r1(nx + 5) + ' ' + (g.yv - 3.4) + ' H' + (s.valveHW + 1) + ' V' + (g.yv + 3.4) + ' H' + r1(nx + 5) + ' Z" fill="url(#' + ns + 'PipeV)" stroke="#0a0e16" stroke-width=".6"/>';
      // flow chevrons travelling through the open passage
      if (e.flow && e.open) {
        var dir = e.flow > 0 ? 1 : -1, span = pBot - pTop, ph = motion ? (t * 0.9) % 1 : .5;
        for (var i = 0; i < 3; i++) {
          var f = (ph + i / 3) % 1, y = dir > 0 ? pTop + span * f : pBot - span * f;
          if (Math.abs(y - g.yv) < 5) continue;
          o += '<path d="M-2.4 ' + r1(y - 2 * dir) + ' L0 ' + r1(y + 1.6 * dir) + ' L2.4 ' + r1(y - 2 * dir) + '" fill="none" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>';
        }
      }
    }
    return o;
  }

  /* ------------------------------------------------------------ the vessel
     S = { geom, view:'exterior'|'cutaway', cap, regions…, valves, flow, line,
           g (gravity, local), t, motion, plate:[l1,l2], bandCol, capBot }          */
  function vessel(ns, S) {
    var g = GEOM[S.geom], cut = S.view === 'cutaway', o = '';
    var bodyFill = 'url(#' + ns + g.body + ')', hatch = 'url(#' + ns + (g.body === 'Ti' ? 'HatchTi' : 'Hatch') + ')';
    var ends = [
      { open: S.valves.top, capped: !!S.capTop, lineFluid: S.line.top, chamberFluid: S.portFluid.top, flow: S.flow.top, cut: cut },
      { open: S.valves.bot, capped: !!S.capBot, lineFluid: S.line.bot, chamberFluid: S.portFluid.bot, flow: S.flow.bot, cut: cut }
    ];
    o += '<g>' + endStack(ns, g, ends[0], S.t, S.motion) + '</g>';
    o += '<g transform="scale(1,-1)">' + endStack(ns, g, ends[1], S.t, S.motion) + '</g>';

    // ---- end closures + barrel
    if (g.end === 'cap') {
      [-1, 1].forEach(function (sg) {
        var y = sg < 0 ? g.bodyT - g.capH : g.bodyB - 4;
        o += rect(-g.capR, y, 2 * g.capR, g.capH + 4, 'rx="6" fill="url(#' + ns + 'Metal)" stroke="#0a0e16" stroke-width="1.1"');
        for (var i = -4; i <= 4; i++) o += '<line x1="' + (i * 10) + '" y1="' + r1(y + 4) + '" x2="' + (i * 10) + '" y2="' + r1(y + g.capH) + '" stroke="#0a0e16" stroke-width=".7" opacity=".35"/>';
      });
      o += bodyShape(g, 'fill="' + bodyFill + '" stroke="#0a0e16" stroke-width="1.2"');
    } else if (g.end === 'flange') {
      o += bodyShape(g, 'fill="' + bodyFill + '" stroke="#0a0e16" stroke-width="1.2"');
      [-1, 1].forEach(function (sg) {
        var y = sg < 0 ? g.bodyT - g.capH : g.bodyB;
        o += rect(-g.capR, y, 2 * g.capR, g.capH, 'rx="2" fill="url(#' + ns + 'Metal)" stroke="#0a0e16" stroke-width="1.1"');
        [-31, 31].forEach(function (bx) {         // bolt heads on the outer flange face
          var by = sg < 0 ? y - 5 : y + g.capH;
          o += rect(bx - 4.5, by, 9, 5, 'rx="1" fill="url(#' + ns + 'PipeV)" stroke="#0a0e16" stroke-width=".6"');
        });
      });
    } else {
      o += bodyShape(g, 'fill="' + bodyFill + '" stroke="#0a0e16" stroke-width="1.2"');
      o += rect(-14, g.bodyT - 3, 28, 7, 'rx="2" fill="url(#' + ns + 'Metal)" stroke="#0a0e16" stroke-width=".8"');   // neck collar
      o += rect(-14, g.bodyB - 4, 28, 7, 'rx="2" fill="url(#' + ns + 'Metal)" stroke="#0a0e16" stroke-width=".8"');
    }
    // clamp / handling collars (piston bottle)
    g.collars.forEach(function (y) { o += rect(-g.R - 2, y, 2 * g.R + 4, 8, 'rx="2" fill="url(#' + ns + 'Metal)" stroke="#0a0e16" stroke-width=".8"'); });

    if (!cut) {
      // ---- exterior: opaque, lighting strips, identification band, nameplate
      o += rect(-g.R + 7, g.bodyT + (g.end === 'dome' ? 26 : 6), 6, g.bodyB - g.bodyT - (g.end === 'dome' ? 52 : 12), 'rx="3" fill="#ffffff" opacity=".18"');
      o += rect(g.R - 9, g.bodyT + (g.end === 'dome' ? 30 : 8), 3, g.bodyB - g.bodyT - (g.end === 'dome' ? 60 : 16), 'fill="#ffffff" opacity=".08"');
      if (g.band) o += '<g clip-path="url(#' + ns + 'Body_' + S.geom + ')">' + rect(-g.R, g.band[0], 2 * g.R, g.band[1] - g.band[0], 'fill="' + (S.bandCol || '#2f9d72') + '" opacity=".9"') + '</g>';
      if (S.plate) {
        var py = g.end === 'dome' ? -62 : -58;
        o += rect(-12, py, 24, 120, 'rx="2" fill="url(#' + ns + 'Plate)" stroke="#0a0e16" stroke-width=".7"');
        o += '<circle cx="0" cy="' + (py + 5) + '" r="1.4" fill="#4b5a70"/><circle cx="0" cy="' + (py + 115) + '" r="1.4" fill="#4b5a70"/>';
        o += '<g transform="rotate(' + (S.plateRot || -90) + ')" font-family="IBM Plex Mono, monospace" font-weight="600" fill="#26324a" text-anchor="middle">' +
          '<text x="0" y="-1.5" font-size="7.6" letter-spacing=".6">' + esc(S.plate[0]) + '</text>' +
          '<text x="0" y="7.5" font-size="6.6" letter-spacing=".4">' + esc(S.plate[1]) + '</text></g>';
      }
      return o;
    }

    // ---- cutaway: section through the vessel axis
    o += '<g clip-path="url(#' + ns + 'Body_' + S.geom + ')">' + bodyShape(g, 'fill="' + hatch + '" opacity=".5"') + '</g>';
    if (g.end !== 'dome') [-1, 1].forEach(function (sg) {
      var y = sg < 0 ? g.bodyT - g.capH : (g.end === 'cap' ? g.bodyB - 4 : g.bodyB);
      o += rect(-g.capR + 1, y + 1, 2 * g.capR - 2, g.capH + (g.end === 'cap' ? 2 : -2), 'rx="5" fill="' + hatch + '" opacity=".5"');
      // closure plug reaching the bore + its seal
      var yp = sg < 0 ? g.chT - 6 : g.chB;
      o += rect(-g.rb, yp, 2 * g.rb, 6, 'fill="url(#' + ns + 'Metal)" stroke="#0a0e16" stroke-width=".6"');
      o += '<circle cx="' + (-g.rb + 2.4) + '" cy="' + (yp + 3) + '" r="2.2" fill="#10151f"/><circle cx="' + (g.rb - 2.4) + '" cy="' + (yp + 3) + '" r="2.2" fill="#10151f"/>';
    });
    o += boreShape(g, 'fill="#0a1420" stroke="#33445e" stroke-width="1"');
    o += '<g clip-path="url(#' + ns + 'Bore_' + S.geom + ')">' + contents(ns, g, S) + '</g>';
    o += boreShape(g, 'fill="none" stroke="rgba(150,175,210,.35)" stroke-width="1"');
    o += rect(-g.rb + 4, g.chT + 8, 4, g.chB - g.chT - 16, 'rx="2" fill="#ffffff" opacity=".1"');
    // cut-plane edges
    var cy0 = g.end === 'dome' ? g.bodyT + g.domeR : g.bodyT, cy1 = g.end === 'dome' ? g.bodyB - g.domeR : g.bodyB;
    [-g.R, g.R].forEach(function (x) { o += '<line x1="' + x + '" y1="' + cy0 + '" x2="' + x + '" y2="' + cy1 + '" stroke="#e7752e" stroke-width="1" stroke-dasharray="5 4" opacity=".55"/>'; });
    return o;
  }

  /* chamber contents (cutaway). Volumes in cc are mapped linearly onto the usable stroke. */
  function contents(ns, g, S) {
    var o = '', X0 = -g.rb, X1 = g.rb, gv = S.g || [0, 1];
    var fill = function (P, k) { return P.length > 2 ? '<path d="' + poly(P) + '" fill="url(#' + ns + 'F_' + k + ')"/>' : ''; };
    var R = function (y0, y1) { return [[X0, y0], [X1, y0], [X1, y1], [X0, y1]]; };
    if (!g.pist) {                                    // gas bottle: one chamber
      var gc = S.gasFrac || 0;
      o += rect(X0, g.chT, 2 * g.rb, g.chB - g.chT, 'fill="url(#' + ns + 'F_gas)" opacity="' + r1((.12 + .8 * gc) * 100) / 100 + '"');
      o += dots(R(g.chT + 10, g.chB - 10), Math.round(70 * gc), FLUID.gas.dot, 1.6, S.t, S.motion, 1);
      return o;
    }
    var px = (g.chB - g.chT - g.pist) / S.cap;
    var pY = g.chT + S.sample * px, hT = pY + g.pist;
    // ---- sample side
    var sR = R(g.chT, pY);
    if (S.sampleKind === 'oil') o += fill(sR, 'oil');
    else if (S.sampleKind === 'gas') {
      o += '<path d="' + poly(sR) + '" fill="url(#' + ns + 'F_gas)" opacity="' + r1((.35 + .6 * clamp(S.gasDens || 0, 0, 1)) * 100) / 100 + '"/>';
      o += dots(sR, S.gasDots || 0, FLUID.gas.dot, 1.5, S.t, S.motion, 2);
    } else if (S.sampleKind === 'vac') o += dots(sR, Math.round(sR.length ? (pY - g.chT) / 9 : 0), FLUID.vac.dot, 1, 0, false, 3);
    else if (S.sampleKind === 'recomb') {
      var sp = settle(sR, (S.liquid || 0) * px * (X1 - X0), gv);
      var mix = clamp(S.mix || 0, 0, 1);
      o += fill(sp.liq, 'oil');
      if (mix > 0 && sp.liq.length > 2) o += '<path d="' + poly(sp.liq) + '" fill="url(#' + ns + 'F_recomb)" opacity="' + r1(mix * 100) / 100 + '"/>';
      if (sp.rest.length > 2 && area(sp.rest) > 6 && (S.gasDots || 0) > 0) {
        o += '<path d="' + poly(sp.rest) + '" fill="url(#' + ns + 'F_gas)" opacity="' + r1((.35 + .6 * clamp(S.gasDens || 0, 0, 1)) * 100) / 100 + '"/>';
        o += dots(sp.rest, S.gasDots, FLUID.gas.dot, 1.5, S.t, S.motion, 4);
      }
      // dispersed bubbles while the bottle is being inverted (inside the liquid only)
      if (S.bubbles && sp.liq.length > 2) {
        var nb = Math.round(26 * S.bubbles), bb = bbox(sp.liq), bo = '';
        for (var i = 1, k = 0; k < nb && i < 600; i++) {
          var bx = bb[0] + 3 + (bb[2] - bb[0] - 6) * halton(i + 40, 2), by = bb[1] + 3 + (bb[3] - bb[1] - 6) * halton(i + 40, 3);
          if (S.motion) { bx += 1.6 * Math.sin(S.t * 2.6 + i); by += 1.6 * Math.cos(S.t * 2.2 + i * 1.3); }
          if (inside(sp.liq, bx, by)) { bo += '<circle cx="' + r1(bx) + '" cy="' + r1(by) + '" r="' + r1(1.1 + (i % 3) * .55) + '"/>'; k++; }
        }
        o += '<g fill="#e9fff4" stroke="#2f9d72" stroke-width=".5" opacity=".85">' + bo + '</g>';
      }
      // oil entering at the top port falls through the free gas onto the oil (axis vertical only)
      if (S.drops && sp.rest.length > 2 && Math.abs(gv[0]) < .02 && gv[1] > 0) {
        var sb = bbox(sp.rest), gh = sb[3] - g.chT;
        o += rect(-2.5, g.chT, 5, gh, 'fill="' + FLUID.oil.line + '" opacity=".35"');
        for (var j = 0; j < 4; j++) {
          var yd = g.chT + (((S.motion ? S.t * 70 : 0) + j * gh / 4) % Math.max(4, gh));
          o += '<ellipse cx="0" cy="' + r1(yd) + '" rx="2.4" ry="3.4" fill="' + FLUID.oil.line + '" stroke="#8a5a1a" stroke-width=".5"/>';
        }
      }
    }
    // ---- hydraulic / buffer side (may hold an empty gap: titanium cylinder under vacuum)
    var hR = R(hT, g.chB), bufCC = S.cap - S.sample, liqCC = S.bufKind === 'n2' ? 0 : Math.min(bufCC, S.bufLiquid == null ? bufCC : S.bufLiquid);
    if (S.bufKind === 'n2') {
      o += fill(hR, 'n2');
      o += dots(hR, Math.round(bufCC / 15), FLUID.n2.dot, 1.4, S.t, S.motion, 5);
    } else {
      var hp = settle(hR, liqCC * px * (X1 - X0), gv);
      o += fill(hp.liq, 'water');
      if (hp.rest.length > 2 && area(hp.rest) > 10) o += '<path d="' + poly(hp.rest) + '" fill="none" stroke="#33445e" stroke-dasharray="3 3"/>';
    }
    // ---- floating piston with two O-ring seals
    o += rect(X0, pY, X1 - X0, g.pist, 'fill="url(#' + ns + 'Metal)" stroke="#05080f" stroke-width="1"');
    o += rect(X0, pY + 1.5, X1 - X0, 2, 'fill="#eef4fb" opacity=".4"');
    [.3, .7].forEach(function (f) {
      var y = pY + g.pist * f;
      o += rect(X0, y - 2.6, 5, 5.2, 'fill="#0a1420"') + rect(X1 - 5, y - 2.6, 5, 5.2, 'fill="#0a1420"');
      o += '<circle cx="' + (X0 + 2.5) + '" cy="' + r1(y) + '" r="2.3" fill="#141a24" stroke="#5a6478" stroke-width=".5"/><circle cx="' + (X1 - 2.5) + '" cy="' + r1(y) + '" r="2.3" fill="#141a24" stroke="#5a6478" stroke-width=".5"/>';
    });
    return o;
  }

  /* label anchors in local coordinates. side: +1 = handwheel side (+x), -1 = opposite */
  function anchors(S) {
    var g = GEOM[S.geom], cut = S.view === 'cutaway', A = [], s = STACK;
    var add = function (id, x, y, side, internal) { if (!internal || cut) A.push({ id: id, x: x, y: y, side: side }); };
    add('valveTop', -s.valveHW, g.yv, -1);
    add('valveBot', -s.valveHW, -g.yv, -1);
    if (g.end === 'cap') { add('capTop', -g.capR, g.bodyT - g.capH / 2, -1); add('capBot', -g.capR, g.bodyB + g.capH / 2 - 2, -1); }
    if (g.end === 'flange') { add('capTop', -g.capR, g.bodyT - g.capH / 2, -1); add('capBot', -g.capR, g.bodyB + g.capH / 2, -1); }
    add('body', -g.R, g.end === 'dome' ? 40 : 30, -1);
    if (!cut) { add('fitTop', -s.nutHW, g.conn + s.nutH / 2, -1); add('fitBot', -s.nutHW, -g.conn - s.nutH / 2, -1); if (S.plate) add('plate', 12, 0, 1); if (g.band) add('band', g.R, (g.band[0] + g.band[1]) / 2, 1); }
    if (cut) {
      if (!g.pist) { add('chamber', g.rb - 8, 20, 1, true); add('passTop', 2.6, g.chT - 14, 1, true); return A; }
      var px = (g.chB - g.chT - g.pist) / S.cap, pY = g.chT + S.sample * px, hT = pY + g.pist;
      if (pY - g.chT > 10) add('sample', g.rb - 8, (g.chT + pY) / 2, 1, true);
      add('piston', g.rb, pY + g.pist * .3, 1, true);
      if (g.chB - hT > 10) add('buffer', g.rb - 8, (hT + g.chB) / 2, 1, true);
      add('passTop', 2.6, g.chT - 14, 1, true);
    }
    return A;
  }

  window.PBDraw = { FLUID: FLUID, GEOM: GEOM, STACK: STACK, defs: defs, vessel: vessel, anchors: anchors };
})();
