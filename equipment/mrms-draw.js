/* ==========================================================================
   PVT Nexus — MRMS / SPMC drawing library (MRDraw)

   Educational 2D drawings, same conventions as bottle-draw.js: editable SVG in
   LOCAL coordinates, vessel axis vertical, origin at the centre, "top" end at
   negative y; the caller wraps the markup in one transform.

     spmc(ns, o)    SPMC single-phase multisample chamber (SPMC-T), inlet at the
                    top, nitrogen at the bottom. Axial order (verified as a
                    sequence, not as dimensions): reservoir fluid | sample piston
                    (with the integrated agitation piston) | pressure-compensating
                    fluid | nitrogen piston | nitrogen charge.
                    o.st = piston positions and function states (STATES.*).
     module(ns, o)  MRMS module carrying six SPMC chambers on a common flowline.
                    Placement and routing are simplified (not published).
     xfer(ns, o)    the SPMC cutaway for Validation > Sample Transfer: the same
                    drawing, with style hooks (o.live) for the sample, the piston
                    train (sample piston + buffer + nitrogen piston), the drive
                    fluid behind it, the inlet and end-port passages and the sample
                    isolation, so the page can drive them from its transfer clock.
                    The pump connects at the END connection (nitrogen end).
                    Geometry for the page: XFER.

   Dimensions are drawing units, NOT scaled from a product drawing: the chamber is
   drawn shorter and wider than the real tool so the internals are readable.
   Valves whose design is not published are drawn as dashed FUNCTION BLOCKS.
   Sources / assumptions: equipment/MRMS-SPMC-SOURCES.md
   ========================================================================== */
(function () {
  'use strict';

  var COL = {
    res:   { name: 'Reservoir fluid (sample)', a: '#d39a4c', b: '#9c6526', sw: '#c58a3d' },
    comp:  { name: 'Pressure-compensating fluid', a: '#a596e6', b: '#6c5bb8', sw: '#8e7fd6' },
    n2:    { name: 'Nitrogen charge', a: '#d6e4f6', b: '#a9bfdc', dot: '#4f6f9c', sw: '#b9cde8' },
    drive: { name: 'Laboratory drive fluid', a: '#5aa6d8', b: '#2f6f9c' },
    open:  '#2fbf7f', shut: '#e0702a', fn: '#d9a514'
  };
  function r1(v) { return Math.round(v * 10) / 10; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function R(x, y, w, h, a) { return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '" ' + (a || '') + '/>'; }
  function C(x, y, r, a) { return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(r) + '" ' + (a || '') + '/>'; }
  function P(d, a) { return '<path d="' + d + '" ' + (a || '') + '/>'; }
  var K = 'stroke="#0a0e16"';

  /* ------------------------------------------------------------------ defs */
  function defs(ns) {
    var lg = function (id, stops, vert) {
      return '<linearGradient id="' + ns + id + '" x1="0" y1="0" x2="' + (vert ? 0 : 1) + '" y2="' + (vert ? 1 : 0) + '">' +
        stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>';
    };
    var o = '';
    // nickel alloy (Inconel / Hastelloy): a slightly warmer, darker grey than the stainless bottles
    o += lg('Alloy', [[0, '#3a3f47'], [.12, '#7e858f'], [.3, '#c4c8cd'], [.38, '#e9ebed'], [.46, '#b7bcc3'], [.7, '#7b828c'], [.9, '#4d535c'], [1, '#2c3038']]);
    o += lg('AlloyD', [[0, '#2f343c'], [.3, '#8f959e'], [.42, '#caced3'], [.6, '#7d838d'], [1, '#262a31']]);
    o += lg('AlloyV', [[0, '#cacdd2'], [.45, '#8b919a'], [1, '#3d424a']], true);
    // module housing: tool steel, cooler tone
    o += lg('Steel', [[0, '#36414f'], [.12, '#76849a'], [.3, '#bcc6d3'], [.38, '#e1e7ee'], [.46, '#adb8c6'], [.7, '#72809a'], [.9, '#475266'], [1, '#2a3240']]);
    o += lg('SteelD', [[0, '#2c3543'], [.3, '#8996a8'], [.42, '#c4ccd7'], [.6, '#778397'], [1, '#232b37']]);
    o += lg('Inner', [[0, '#141a23'], [.5, '#2a323e'], [1, '#10151c']]);
    o += lg('Res', [[0, COL.res.a], [1, COL.res.b]], true);
    o += lg('Comp', [[0, COL.comp.a], [1, COL.comp.b]], true);
    o += lg('N2', [[0, COL.n2.a, .95], [1, COL.n2.b, .95]], true);
    o += lg('Drive', [[0, COL.drive.a], [1, COL.drive.b]], true);
    o += lg('Agit', [[0, '#5b4a2a'], [.35, '#b39a5f'], [.5, '#dcc690'], [.75, '#8e7843'], [1, '#463818']]);
    o += '<pattern id="' + ns + 'Hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#aeb3ba"/><line x1="0" y1="0" x2="0" y2="6" stroke="#4d535d" stroke-width="1.6"/></pattern>';
    o += '<pattern id="' + ns + 'HatchB" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="6" height="6" fill="#bcc1c8"/><line x1="0" y1="0" x2="0" y2="6" stroke="#59606b" stroke-width="1.4"/></pattern>';
    o += '<pattern id="' + ns + 'Thread" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#80868f"/><line x1="0" y1="0" x2="4" y2="4" stroke="#2c3038" stroke-width="1.1"/></pattern>';
    o += '<pattern id="' + ns + 'Dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1.05" fill="' + COL.n2.dot + '" opacity=".55"/><circle cx="6.5" cy="7.5" r=".95" fill="' + COL.n2.dot + '" opacity=".5"/></pattern>';
    o += '<clipPath id="' + ns + 'Bore">' + R(-G.rb, G.chT, 2 * G.rb, G.chB - G.chT) + '</clipPath>';
    return o;
  }

  /* ============================================================ SPMC
     body    x ±26, y ±230 (threaded ends under the heads)
     heads   x ±28, y -292..-224 / 224..292; spigots close the bore at y ±222
     bore    x ±17, y ±222
     sample-piston assembly 40 tall: agitation piston 6 + neck 4 + piston 30
     nitrogen piston 26 tall                                                   */
  var G = { R: 26, rb: 17, body: 230, headR: 28, headO: 292, headI: 224, chT: -222, chB: 222, top: -326, bot: 312, outY: 40 };
  // sp = top of the sample-piston assembly (agitation-piston face), np = top of the nitrogen piston.
  // Lengths are proportional to volume (constant bore): sample = sp - chT, compensating fluid = np - (sp + 40),
  // nitrogen = chB - (np + 26). The compensating fluid is constant once the displacement path is closed.
  var STATES = {
    ready:     { sp: -221, np: 86 },                    // no dead volume: piston at the inlet end
    filled:    { sp: -21,  np: 86 },                    // sample in = fluid displaced out (200 each)
    retrieved: { sp: -45,  np: 62 }                     // sample contracted 24 (exaggerated); nitrogen expanded 24
  };

  function fnBlock(x, y, w, h, kind, state, ns) {
    // dashed outline = function block (mechanism not published); symbol colour = state
    var o = R(x, y, w, h, 'rx="2.5" fill="#1a2029" stroke="' + COL.fn + '" stroke-width="1" stroke-dasharray="3 2"');
    var cx = x + w / 2, cy = y + h / 2, on = state > .5, col = on ? COL.open : COL.shut;
    if (kind === 'valve') {
      // valve symbol across the passage (vertical flow): two triangles meeting at the centre
      o += P('M' + (cx - 6.5) + ' ' + (cy - 7) + ' H' + (cx + 6.5) + ' L' + (cx - 6.5) + ' ' + (cy + 7) + ' H' + (cx + 6.5) + ' Z', 'fill="' + col + '" opacity=".95" stroke="#0a0e16" stroke-width=".5"');
      if (!on) o += R(cx - 8, cy - 1, 16, 2, 'fill="#0a0e16"');
    } else {
      // charge activation: gate symbol — bar across (held) or turned aside (released)
      o += C(cx, cy, 6.5, 'fill="none" stroke="' + col + '" stroke-width="1.6"');
      o += on ? R(cx - 1, cy - 6, 2, 12, 'fill="' + col + '"') : R(cx - 6, cy - 1, 12, 2, 'fill="' + col + '"');
    }
    return o;
  }

  // exterior or section of one chamber. o = { view, st:{sp,np,iso,out,act}, fx:{in,outF,press}, num }
  function spmc(ns, o) {
    var lv = o.live || null;
    if (lv) o = Object.assign({}, o, { view: 'cutaway', st: STATES.filled });
    var cut = o.view === 'cutaway', st = o.st || STATES.filled, fx = o.fx || {}, h = 'url(#' + ns + 'Hatch)', hb = 'url(#' + ns + 'HatchB)';
    var iso = st.iso == null ? 0 : st.iso, out = st.out == null ? 0 : st.out, act = st.act == null ? 1 : st.act;
    var s = '';
    // ---- inlet connection (top): hex + stub
    s += R(-6, G.top, 12, 18, 'fill="url(#' + ns + 'AlloyV)" ' + K + ' stroke-width=".7"');
    s += R(-13, G.top + 18, 26, 16, 'rx="1.5" fill="url(#' + ns + 'AlloyD)" ' + K + ' stroke-width=".8"');
    [-4.5, 4.5].forEach(function (x) { s += '<line x1="' + x + '" y1="' + (G.top + 18) + '" x2="' + x + '" y2="' + (G.top + 34) + '" stroke="#0a0e16" stroke-width=".5" opacity=".5"/>'; });
    // ---- nitrogen charging port (bottom): hex + plug
    s += R(-11, G.headO, 22, 12, 'rx="1.5" fill="url(#' + ns + 'AlloyD)" ' + K + ' stroke-width=".8"');
    s += R(-7, G.headO + 12, 14, 8, 'rx="1" fill="url(#' + ns + 'AlloyV)" ' + K + ' stroke-width=".7"');
    // ---- body
    s += R(-G.R, -G.body, 2 * G.R, 2 * G.body, 'fill="url(#' + ns + 'Alloy)" ' + K + ' stroke-width="1.2"');
    if (!cut) {
      s += R(-G.R + 5, -G.headI + 8, 4, 2 * G.headI - 16, 'rx="2" fill="#fff" opacity=".22"');
      s += R(-8, -70, 16, 140, 'rx="1.5" fill="none" stroke="#2c3038" stroke-width=".7" opacity=".55"');
      s += '<g transform="rotate(' + (o.textRot || -90) + ')" font-family="IBM Plex Mono, monospace" font-size="6.4" font-weight="600" letter-spacing=".7" fill="#2c3038" text-anchor="middle" opacity=".75"><text x="0" y="2.3">SAMPLE CHAMBER' + (o.num ? ' · ' + o.num : '') + '</text></g>';
      // controlled-displacement outlet boss on the wall (schematic)
      s += R(-G.R - 7, G.outY - 6, 7, 12, 'rx="1" fill="url(#' + ns + 'AlloyD)" ' + K + ' stroke-width=".7"');
    } else {
      s += R(-G.R + .6, -G.body + .6, 2 * G.R - 1.2, 2 * G.body - 1.2, 'fill="' + h + '" opacity=".62"');
      s += R(-G.rb, -G.body, 2 * G.rb, 2 * G.body, 'fill="#0b1018"');
      s += '<g clip-path="url(#' + ns + 'Bore)">' + (lv ? insideLive(ns, lv) : inside(ns, st, fx)) + '</g>';
      s += R(-G.rb, G.chT, 2 * G.rb, G.chB - G.chT, 'fill="none" stroke="rgba(170,190,215,.45)" stroke-width=".8"');
      // outlet: boss + passage through the wall (schematic)
      s += R(-G.R - 7, G.outY - 6, 7, 12, 'fill="' + hb + '" ' + K + ' stroke-width=".6"');
      s += R(-G.R - 7, G.outY - 1.8, G.R + 7 - G.rb, 3.6, 'fill="#0b1018"');
      s += R(-G.R - 10.5, G.outY - 5, 3, 10, 'rx="1" fill="#1a2029" stroke="' + COL.fn + '" stroke-width=".8" stroke-dasharray="2 1.5"');
      // live (Sample Transfer): the displacement outlet stays closed; the pump uses the end connection
      s += R(-G.R - 9.8, G.outY - 4.2, 1.6, 8.4, 'fill="' + (!lv && out > .5 ? COL.open : COL.shut) + '"');
    }
    // ---- heads
    s += head(ns, cut, -1, iso, act, lv) + head(ns, cut, 1, iso, act, lv);
    if (cut) {
      // inlet + charging passages in section
      s += R(-2.2, G.top, 4.4, G.top * -1 - G.headO + 4, 'fill="#0b1018"');
      s += R(-2.2, G.headO - 4, 4.4, 24, 'fill="#0b1018"');
      if (lv) s += R(-2.2, G.headO - 4, 4.4, 24, 'fill="' + COL.drive.a + '" style="' + (lv.port || 'opacity:0') + '"');
      // cut-plane edges of the body
      s += P('M' + (-G.R) + ' ' + (-G.body) + ' V' + G.body + ' M' + G.R + ' ' + (-G.body) + ' V' + G.body, 'stroke="#e7752e" stroke-width="1.2" opacity=".5" fill="none"');
      if (!lv) s += flows(ns, st, fx);
    }
    return s;
  }

  // head on the sample side (s = -1) or nitrogen side (s = +1)
  function head(ns, cut, sg, iso, act, lv) {
    var y0 = sg < 0 ? -G.headO : G.headI, hgt = G.headO - G.headI, s = '', h = 'url(#' + ns + 'Hatch)';
    s += R(-G.headR, y0, 2 * G.headR, hgt, 'rx="4" fill="url(#' + ns + 'AlloyD)" ' + K + ' stroke-width="1"');
    if (!cut) {
      for (var i = -3; i <= 3; i++) s += '<line x1="' + (i * 7.5) + '" y1="' + (y0 + 5) + '" x2="' + (i * 7.5) + '" y2="' + (y0 + hgt - 5) + '" stroke="#0a0e16" stroke-width=".6" opacity=".22"/>';
      s += R(-G.headR + 3, y0 + 4, 4, hgt - 8, 'rx="2" fill="#fff" opacity=".2"');
      return s;
    }
    s += R(-G.headR + .6, y0 + .6, 2 * G.headR - 1.2, hgt - 1.2, 'rx="3.5" fill="' + h + '" opacity=".62"');
    // spigot into the bore + seal
    var sy = sg < 0 ? -G.headI : G.chB, sh = G.headI - G.chB;
    s += R(-G.rb, sy, 2 * G.rb, sh, 'fill="' + h + '" ' + K + ' stroke-width=".5"');
    // threads where the head skirt overlaps the body
    [-1, 1].forEach(function (x) { s += R(x > 0 ? G.R : -G.R - 2, sg < 0 ? -G.body : G.headI, 2, G.body - G.headI, 'fill="url(#' + ns + 'Thread)"'); });
    // passage through the head + function block
    var by = sg < 0 ? -278 : 250;
    s += R(-2.2, sg < 0 ? -G.headO : G.chB, 4.4, G.headO - G.chB, 'fill="#0b1018"');
    if (lv && sg < 0) {
      // live: sample in the inlet passage, and the isolation shown closed / open (cross-faded by the page)
      s += R(-2.2, G.top, 4.4, G.chT - G.top, 'fill="' + COL.res.a + '" style="' + (lv.inlet || 'opacity:0') + '"');
      s += '<g>' + fnBlock(-12, by, 24, 28, 'valve', 0, ns) + '</g><g style="' + (lv.isoOpen || 'opacity:0') + '">' + fnBlock(-12, by, 24, 28, 'valve', 1, ns) + '</g>';
      return s;
    }
    if (lv) s += R(-2.2, G.chB, 4.4, G.headO - G.chB, 'fill="' + COL.drive.a + '" style="' + (lv.port || 'opacity:0') + '"');   // drive fluid in the end passage
    s += fnBlock(-12, by, 24, 28, sg < 0 ? 'valve' : 'gate', sg < 0 ? iso : act, ns);
    return s;
  }

  function seals(x0, x1, y, o) {
    [x0, x1].forEach(function (x, k) {
      o.s += C(x + (k ? -2.5 : 2.5), y, 2.4, 'fill="#141920" stroke="#5e6878" stroke-width=".5"');
    });
  }
  function inside(ns, st, fx) {
    var o = { s: '' }, rb = G.rb, sp = st.sp, np = st.np;
    // fluids
    o.s += R(-rb, G.chT, 2 * rb, sp + 10 - G.chT, 'fill="url(#' + ns + 'Res)"');
    o.s += R(-rb, sp + 40, 2 * rb, np - sp - 40, 'fill="url(#' + ns + 'Comp)"');
    o.s += R(-rb, np + 26, 2 * rb, G.chB - np - 26, 'fill="url(#' + ns + 'N2)"');
    o.s += R(-rb, np + 26, 2 * rb, G.chB - np - 26, 'fill="url(#' + ns + 'Dots)"');
    // sample piston assembly: agitation piston (schematic) on a short neck, then the sample piston
    o.s += R(-14, sp, 28, 6, 'rx="1.5" fill="url(#' + ns + 'Agit)" ' + K + ' stroke-width=".6"');
    o.s += R(-6, sp + 6, 12, 4, 'fill="url(#' + ns + 'AlloyD)" ' + K + ' stroke-width=".5"');
    o.s += R(-rb, sp + 10, 2 * rb, 30, 'fill="url(#' + ns + 'AlloyD)" ' + K + ' stroke-width=".9"');
    o.s += R(-rb + 3, sp + 12, 2 * rb - 6, 2, 'fill="#fff" opacity=".35"');
    seals(-rb, rb, sp + 19, o); seals(-rb, rb, sp + 31, o);
    // nitrogen piston
    o.s += R(-rb, np, 2 * rb, 26, 'fill="url(#' + ns + 'AlloyD)" ' + K + ' stroke-width=".9"');
    o.s += R(-rb + 3, np + 2, 2 * rb - 6, 2, 'fill="#fff" opacity=".35"');
    seals(-rb, rb, np + 8, o); seals(-rb, rb, np + 18, o);
    return o.s;
  }

  /* live interior for Sample Transfer (o.live), drawn at the filled state (STATES.filled).
     The pump is connected at the END connection, so laboratory drive fluid fills the space behind the
     nitrogen piston (the nitrogen charge is taken as released before the transfer: assumption, see
     MRMS-SPMC-SOURCES.md). Pumping in pushes the whole piston train toward the inlet: nitrogen piston,
     the trapped compensating fluid (constant volume) and the sample piston move together, and only
     the sample leaves through the inlet. The page moves it with CSS transforms in these local units:
       sample   rect chT .. filled sp + 10            scaleY, origin top      = (sp + 10 - chT) / XFER.resH
       train    sample piston + buffer + N2 piston    translateY              = sp - XFER.sp0
       drive    rect (np_end + 26) .. chB             scaleY, origin bottom   = (chB - np - 26) / XFER.driveH
     with np = XFER.np + (sp - XFER.sp0); the sample piston ends at its ready position (no dead volume). */
  var XFER = { sp0: STATES.filled.sp, spEnd: STATES.ready.sp, np: STATES.filled.np, travel: STATES.filled.sp - STATES.ready.sp,
               resH: STATES.filled.sp + 10 - G.chT };
  XFER.driveH = G.chB - (XFER.np - XFER.travel + 26);
  function insideLive(ns, lv) {
    var o = { s: '' }, rb = G.rb, sp = XFER.sp0, np = XFER.np;
    o.s += R(-rb, G.chB - XFER.driveH, 2 * rb, XFER.driveH, 'fill="url(#' + ns + 'Drive)" style="' + (lv.drive || '') + '"');
    o.s += R(-rb, G.chT, 2 * rb, XFER.resH, 'fill="url(#' + ns + 'Res)" style="' + (lv.res || '') + '"');
    var p = { s: '' };
    p.s += R(-rb, sp + 40, 2 * rb, np - sp - 40, 'fill="url(#' + ns + 'Comp)"');
    p.s += R(-14, sp, 28, 6, 'rx="1.5" fill="url(#' + ns + 'Agit)" ' + K + ' stroke-width=".6"');
    p.s += R(-6, sp + 6, 12, 4, 'fill="url(#' + ns + 'AlloyD)" ' + K + ' stroke-width=".5"');
    p.s += R(-rb, sp + 10, 2 * rb, 30, 'fill="url(#' + ns + 'AlloyD)" ' + K + ' stroke-width=".9"');
    p.s += R(-rb + 3, sp + 12, 2 * rb - 6, 2, 'fill="#fff" opacity=".35"');
    seals(-rb, rb, sp + 19, p); seals(-rb, rb, sp + 31, p);
    p.s += R(-rb, np, 2 * rb, 26, 'fill="url(#' + ns + 'AlloyD)" ' + K + ' stroke-width=".9"');
    p.s += R(-rb + 3, np + 2, 2 * rb - 6, 2, 'fill="#fff" opacity=".35"');
    seals(-rb, rb, np + 8, p); seals(-rb, rb, np + 18, p);
    o.s += '<g style="' + (lv.piston || '') + '">' + p.s + '</g>';
    return o.s;
  }
  // the live SPMC cutaway as one group in page coordinates. o = { x, y, s, rot, live, attrs }
  function xfer(ns, o) {
    return '<g transform="translate(' + o.x + ' ' + o.y + ') rotate(' + (o.rot || 0) + ') scale(' + o.s + ')"' + (o.attrs || '') + '>' +
      spmc(ns, { live: o.live || {} }) + '</g>';
  }
  // local SPMC point -> page point for the same placement (used to attach tubing to the ports)
  function toPage(o, lx, ly) {
    var a = (o.rot || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    return [r1(o.x + o.s * (lx * c - ly * sn)), r1(o.y + o.s * (lx * sn + ly * c))];
  }

  // flow and pressure cues (cutaway only). fx.in / fx.outF: 0..1 strength, fx.t: phase (s); fx.press: 0..1
  function flows(ns, st, fx) {
    var s = '', t = fx.t || 0;
    if (fx.in > .01) {      // formation fluid entering through the inlet passage
      for (var k = 0; k < 4; k++) {
        var y = G.top + 6 + ((t * 38 + k * 26) % 104);
        if (y < G.chT) s += P('M-3.4 ' + r1(y - 3) + ' L0 ' + r1(y + 1) + ' L3.4 ' + r1(y - 3), 'fill="none" stroke="' + COL.res.a + '" stroke-width="1.6" stroke-linecap="round" opacity="' + r1(fx.in) + '"');
      }
    }
    if (fx.outF > .01) {    // fluid behind the sample piston leaving at a controlled rate (route not published)
      for (var j = 0; j < 3; j++) {
        var x = -G.rb - 4 - ((t * 26 + j * 15) % 45);
        s += P('M' + r1(x + 3) + ' ' + (G.outY - 3) + ' L' + r1(x - 1) + ' ' + G.outY + ' L' + r1(x + 3) + ' ' + (G.outY + 3), 'fill="none" stroke="' + COL.comp.a + '" stroke-width="1.5" stroke-linecap="round" opacity="' + r1(fx.outF) + '"');
      }
      s += P('M' + (-G.R - 12) + ' ' + G.outY + ' H' + (-G.R - 40), 'stroke="' + COL.comp.a + '" stroke-width="1.2" stroke-dasharray="3 3" opacity="' + r1(fx.outF * .8) + '" fill="none"');
    }
    if (fx.press > .01) {   // pressure transmitted toward the sample (hollow chevrons = pressure, not flow)
      var a = fx.press, ys = [G.chB - 18, (st.np + 26 + G.chB) / 2, st.np - 10, (st.sp + 40 + st.np) / 2, st.sp - 8];
      ys.forEach(function (y, i) {
        if (i === 4 && y - G.chT < 14) return;
        var pulse = .55 + .45 * Math.sin(t * 3.2 - i * .8);
        s += P('M-6 ' + r1(y + 3) + ' L0 ' + r1(y - 3) + ' L6 ' + r1(y + 3), 'fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linejoin="round" opacity="' + r1(a * pulse) + '"');
        s += P('M-6 ' + r1(y + 3) + ' L0 ' + r1(y - 3) + ' L6 ' + r1(y + 3), 'fill="none" stroke="#18324f" stroke-width=".6" stroke-linejoin="round" opacity="' + r1(a * pulse) + '"');
      });
    }
    return s;
  }

  /* ============================================================ MRMS module
     housing x ±56, y ±400; connectors to y ±486
     chambers: SPMC at scale CK, x ±28, tiers at y = -262 / 0 / 262; number = tier*2 + (left ? 1 : 2)
     common flowline on the axis; one branch + chamber valve per chamber (simplified routing) */
  var M = { R: 56, wall: 6, L: 400, CK: .38, cx: 28, tiers: [-262, 0, 262] };
  function chamberPos(n) { var t = Math.floor((n - 1) / 2), left = n % 2 === 1; return { x: left ? -M.cx : M.cx, y: M.tiers[t] + 7 * M.CK, left: left }; }
  function chTop(n) { return chamberPos(n).y + G.top * M.CK; }

  function module(ns, o) {
    var cut = o.view === 'cutaway', s = '', h = 'url(#' + ns + 'Hatch)', sel = o.selected || '';
    // connectors
    s += modHead(ns, -1) + modHead(ns, 1);
    // housing
    s += R(-M.R, -M.L, 2 * M.R, 2 * M.L, 'fill="url(#' + ns + 'Steel)" ' + K + ' stroke-width="1.3"');
    if (!cut) {
      s += R(-M.R + 7, -M.L + 10, 5, 2 * M.L - 20, 'rx="2.5" fill="#fff" opacity=".2"');
      for (var n = 1; n <= 6; n++) s += bay(ns, n, sel);
      return s;
    }
    // section: hatched walls, open bay behind
    s += R(-M.R + M.wall, -M.L, 2 * (M.R - M.wall), 2 * M.L, 'fill="url(#' + ns + 'Inner)"');
    [-1, 1].forEach(function (x) { s += R(x > 0 ? M.R - M.wall : -M.R, -M.L, M.wall, 2 * M.L, 'fill="' + h + '" ' + K + ' stroke-width=".6"'); });
    // tier support plates (simplified)
    [-M.L + 4, -131, 131, M.L - 10].forEach(function (y) { s += R(-M.R + M.wall, y, 2 * (M.R - M.wall), 6, 'fill="url(#' + ns + 'SteelD)" opacity=".85" ' + K + ' stroke-width=".4"'); });
    // common flowline
    s += '<g data-part="flowline" class="mr-hit' + (sel === 'flowline' ? ' on' : '') + '">' + R(-2.6, -486, 5.2, 972, 'fill="#5c6878" stroke="#0a0e16" stroke-width=".5"') + R(-1.1, -486, 2.2, 972, 'fill="#0b1018"') + '</g>';
    // chambers + their own branch and valve: each sample is isolated from the others
    for (var c = 1; c <= 6; c++) {
      var p = chamberPos(c), yb = chTop(c) - 8;
      s += '<g data-part="valves" class="mr-hit' + (sel === 'valves' ? ' on' : '') + '">' +
        R(Math.min(0, p.x), yb - 1.6, Math.abs(p.x), 3.2, 'fill="#5c6878" stroke="#0a0e16" stroke-width=".4"') +
        R(p.x - 1.6, yb, 3.2, 8, 'fill="#5c6878" stroke="#0a0e16" stroke-width=".4"') +
        '<g transform="translate(' + (p.x / 2) + ' ' + yb + ') rotate(90) scale(.42)">' + fnBlock(-12, -14, 24, 28, 'valve', 0, ns) + '</g></g>';
      s += chamber(ns, c, sel);
    }
    s += P('M' + (-M.R) + ' ' + (-M.L) + ' V' + M.L + ' M' + M.R + ' ' + (-M.L) + ' V' + M.L, 'stroke="#e7752e" stroke-width="1.2" opacity=".5" fill="none"');
    return s;
  }
  function chamber(ns, n, sel) {
    var p = chamberPos(n), id = 'ch' + n, on = sel === id;
    var s = '<g data-part="' + id + '" class="mr-hit mr-ch' + (on ? ' on' : '') + '" tabindex="0" role="button" aria-label="Chamber ' + n + '">';
    s += '<g transform="translate(' + p.x + ' ' + p.y + ') scale(' + M.CK + ')">' + spmc(ns, { view: 'exterior', textRot: -90 }) + '</g>';
    if (on) s += R(p.x - 13, chTop(n) - 2, 26, (G.bot - G.top) * M.CK + 4, 'rx="5" fill="none" stroke="#2f78e0" stroke-width="2"');
    s += C(p.x + (p.left ? -1 : 1) * 17, p.y, 7.2, 'fill="' + (on ? '#2f78e0' : '#e9eef4') + '" stroke="#0a0e16" stroke-width=".8"');
    s += '<text x="' + (p.x + (p.left ? -1 : 1) * 17) + '" y="' + r1(p.y + 3.4) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" font-weight="700" fill="' + (on ? '#fff' : '#1b2330') + '">' + n + '</text>';
    return s + '</g>';
  }
  function bay(ns, n, sel) {
    var p = chamberPos(n), id = 'ch' + n, y0 = chTop(n) + 2, hgt = (G.bot - G.top) * M.CK - 4, x0 = p.x - 15, on = sel === id;
    var s = '<g data-part="' + id + '" class="mr-hit mr-ch' + (on ? ' on' : '') + '" tabindex="0" role="button" aria-label="Chamber bay ' + n + '">';
    s += R(x0, y0, 30, hgt, 'rx="4" fill="url(#' + ns + 'SteelD)" opacity=".9" stroke="' + (on ? '#2f78e0' : '#0a0e16') + '" stroke-width="' + (on ? 2 : 1) + '"');
    s += R(x0 + 3, y0 + 3, 3, hgt - 6, 'rx="1.5" fill="#fff" opacity=".22"');
    [[x0 + 5, y0 + 6], [x0 + 25, y0 + 6], [x0 + 5, y0 + hgt - 6], [x0 + 25, y0 + hgt - 6]].forEach(function (b) { s += C(b[0], b[1], 2, 'fill="#1f2630" stroke="#8b97a8" stroke-width=".5"'); });
    s += C(p.x, p.y, 8, 'fill="' + (on ? '#2f78e0' : '#e9eef4') + '" stroke="#0a0e16" stroke-width=".8"');
    s += '<text x="' + p.x + '" y="' + r1(p.y + 3.6) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="' + (on ? '#fff' : '#1b2330') + '">' + n + '</text>';
    return s + '</g>';
  }
  function modHead(ns, sg) {
    var s = '', Y = function (v) { return sg * v; }, rr = function (x, a, b, w, at) { return R(x, Math.min(Y(a), Y(b)), w, Math.abs(b - a), at); };
    s += P('M-46 ' + Y(400) + ' L-46 ' + Y(430) + ' L-38 ' + Y(452) + ' L38 ' + Y(452) + ' L46 ' + Y(430) + ' L46 ' + Y(400) + ' Z', 'fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width="1"');
    s += rr(-30, 452, 474, 60, 'fill="url(#' + ns + 'Steel)" ' + K + ' stroke-width=".9"');
    s += rr(-34, 474, 480, 68, 'rx="1.5" fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".8"');
    s += rr(-20, 480, 486, 40, 'fill="url(#' + ns + 'Inner)" ' + K + ' stroke-width=".6"');
    for (var i = -2; i <= 2; i++) s += '<line x1="' + (i * 14) + '" y1="' + Y(404) + '" x2="' + (i * 14) + '" y2="' + Y(428) + '" stroke="#0a0e16" stroke-width=".6" opacity=".22"/>';
    return s;
  }

  /* ------------------------------------------------------------ labels
     anchors in local coordinates; p = part id (selection target); ext / cut = only in that view */
  function anchors(item, view, st) {
    st = st || STATES.filled;
    var A = item === 'module' ? [
      { p: 'headU', x: 34, y: -463, s: 1, n: 'Upper module connector', d: 'to the module above' },
      { p: 'housing', x: -56, y: -330, s: -1, n: 'Module housing', d: 'carrier for six chambers' },
      { p: 'bays', x: 43, y: -200, s: 1, ext: 1, n: 'Chamber bays 1–6', d: 'one chamber per bay' },
      { p: 'valves', x: 14, y: chTop(2) - 8, s: 1, cut: 1, n: 'Chamber valve', d: 'one per chamber · function' },
      { p: 'flowline', x: 0, y: -131 - 20, s: -1, cut: 1, n: 'Common flowline', d: 'tool flowline · simplified' }
    ] : [
      { p: 'inlet', x: 6, y: -317, s: 1, n: 'Sample inlet', d: 'to the MRMS chamber valve' },
      { p: 'headU', x: 28, y: -246, s: 1, n: 'Upper head', d: 'sample side' },
      { p: 'body', x: -26, y: 150, s: -1, n: 'Pressure body', d: 'nickel alloy' },
      { p: 'outlet', x: -G.R - 10, y: G.outY, s: -1, n: 'Displacement outlet', d: 'schematic' },
      { p: 'headL', x: 28, y: 240, s: 1, n: 'Lower head', d: 'nitrogen side' },
      { p: 'n2Port', x: -11, y: 300, s: -1, n: 'Nitrogen charging port', d: 'plugged' },
      { p: 'isoValve', x: -12, y: -264, s: -1, cut: 1, n: 'Sample isolation', d: 'self-closing · function' },
      { p: 'resFluid', x: 6, y: (G.chT + st.sp) / 2, s: 1, cut: 1, n: 'Reservoir-fluid chamber', d: 'sample' },
      { p: 'agit', x: -14, y: st.sp + 3, s: -1, cut: 1, n: 'Agitation piston', d: 'integrated · schematic' },
      { p: 'sPiston', x: 12, y: st.sp + 25, s: 1, cut: 1, n: 'Sample piston', d: 'separating piston' },
      { p: 'seals', x: -15, y: st.sp + 31, s: -1, cut: 1, n: 'Piston seals', d: 'both pistons' },
      { p: 'comp', x: 6, y: (st.sp + 40 + st.np) / 2, s: 1, cut: 1, n: 'Compensating fluid', d: 'synthetic oil buffer' },
      { p: 'nPiston', x: -12, y: st.np + 13, s: -1, cut: 1, n: 'Nitrogen piston', d: 'floating piston' },
      { p: 'n2', x: 6, y: (st.np + 26 + G.chB) / 2, s: 1, cut: 1, n: 'Nitrogen chamber', d: 'preset charge' },
      { p: 'activation', x: -12, y: 264, s: -1, cut: 1, n: 'Charge activation', d: 'function' }
    ];
    if (item === 'module') {
      for (var n = 1; n <= 6; n++) { var q = chamberPos(n); A.push({ p: 'ch' + n, x: q.x + (q.left ? -10 : 10), y: q.y + 60, s: q.left ? -1 : 1, cut: 1, n: 'Chamber ' + n, d: 'SPMC · separate sample' }); }
      A.push({ p: 'headL', x: 34, y: 463, s: 1, n: 'Lower module connector', d: 'to the module below' });
    }
    return A.filter(function (a) { return view === 'cutaway' ? !a.ext : !a.cut; });
  }
  function rot(p, deg) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
  function vbox(item, orient) {
    if (item === 'module') return orient === 'horizontal' ? { w: 1200, h: 440, cx: 600, cy: 220, ang: -90, s: 1.1 } : { w: 640, h: 790, cx: 320, cy: 395, ang: 0, s: .76 };
    return orient === 'horizontal' ? { w: 1200, h: 420, cx: 600, cy: 210, ang: -90, s: 1.3 } : { w: 640, h: 790, cx: 320, cy: 395, ang: 0, s: 1.12 };
  }
  // same layout rules as the bottle drawings (bottle-draw.js labelLayer)
  function labelLayer(item, view, V, selected, st) {
    var nrm = rot([1, 0], V.ang), horiz = V.ang !== 0, o = '', tx = '';
    var items = anchors(item, view, st).map(function (a) {
      var q = rot([a.x * V.s, a.y * V.s], V.ang);
      return { a: a, p: [V.cx + q[0], V.cy + q[1]], w: Math.max(a.n.length * 7.2, a.d.length * 6.4) + 12 };
    });
    var lab = function (i, x, y, an) {
      var x0 = an === 'start' ? x - 4 : an === 'end' ? x - i.w : x - i.w / 2;
      return '<g class="pb-lab' + (i.a.p === selected ? ' on' : '') + '" data-part="' + i.a.p + '" tabindex="0" role="button">' +
        '<rect x="' + r1(x0) + '" y="' + r1(y - 13) + '" width="' + r1(i.w + 4) + '" height="30" fill="transparent"/>' +
        '<text class="lab-n" x="' + r1(x) + '" y="' + r1(y) + '" text-anchor="' + an + '">' + esc(i.a.n) + '</text>' +
        '<text class="lab-s" x="' + r1(x) + '" y="' + r1(y + 13) + '" text-anchor="' + an + '">' + esc(i.a.d) + '</text></g>';
    };
    var off = item === 'module' ? 112 : 96;
    [1, -1].forEach(function (side) {
      var L = items.filter(function (i) { return i.a.s === side; });
      if (!horiz) {
        var x = V.cx + side * off, sp = 33;
        L.sort(function (p, q) { return p.p[1] - q.p[1]; });
        L.forEach(function (i, k) { i.y = Math.max(i.p[1] + 4, k ? L[k - 1].y + sp : 22); });
        for (var k = L.length - 1; k >= 0; k--) { var lim = k === L.length - 1 ? V.h - 20 : L[k + 1].y - sp; if (L[k].y > lim) L[k].y = lim; }
        L.forEach(function (i, k) {
          var xm = x - side * (10 + 6 * (k % 3));
          o += '<path class="lead" d="M' + r1(i.p[0]) + ' ' + r1(i.p[1]) + ' H' + r1(xm) + ' V' + r1(i.y - 4) + ' H' + r1(x - side * 4) + '"/>';
          o += '<circle class="dot" cx="' + r1(i.p[0]) + '" cy="' + r1(i.p[1]) + '" r="2.2"/>';
          tx += lab(i, x, i.y, side > 0 ? 'start' : 'end');
        });
      } else {
        var up = nrm[1] * side < 0, nt = L.length > 6 ? 3 : 2, gap = item === 'module' ? 58 : 34;
        var rows = [0, 1, 2].map(function (t) { return up ? V.cy - gap - 52 - 36 * t : V.cy + gap + 56 + 36 * t; });
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
          tx += lab(i, i.x, y, 'middle');
        });
      }
    });
    return o + tx;
  }

  /* svg(item, view, orient, o) -> complete <svg>. item 'module' | 'spmc'.
     o = { ns, labels, selected, title, tight (thumbnail), num (chamber number on the SPMC) } */
  function svg(item, view, orient, o) {
    o = o || {};
    var V = vbox(item, orient), ns = o.ns || ('mr' + item);
    if (o.tight && !o.labels) V = orient === 'horizontal' ? { w: 1000, h: 170, cx: 500, cy: 85, ang: -90, s: .98 } : { w: 150, h: 740, cx: 75, cy: 370, ang: 0, s: .74 };
    var textRot = V.ang ? 90 : -90;
    var st = Object.assign({}, STATES.filled, { iso: 0, out: 0, act: 1 });
    var body = item === 'module' ? module(ns, { view: view, selected: o.selected }) : spmc(ns, { view: view, st: st, textRot: textRot, num: o.num });
    return '<svg class="pb-svg mr-svg" viewBox="0 0 ' + V.w + ' ' + V.h + '" preserveAspectRatio="xMidYMid meet" role="img"' + (o.title ? ' aria-label="' + esc(o.title) + '"' : '') + '>' +
      '<defs>' + defs(ns) + '</defs>' +
      '<g transform="translate(' + V.cx + ' ' + V.cy + ') rotate(' + V.ang + ') scale(' + V.s + ')">' + body + '</g>' +
      (o.labels ? labelLayer(item, view, V, o.selected, st) : '') + '</svg>';
  }

  window.MRDraw = { COL: COL, G: G, M: M, STATES: STATES, XFER: XFER, defs: defs, spmc: spmc, module: module, xfer: xfer, toPage: toPage, anchors: anchors, chamberPos: chamberPos, svg: svg };
})();
