/* ==========================================================================
   PVT Nexus — bottle design prototype · drawing library (PBDraw)

   Two representative designs, drawn as editable SVG in LOCAL coordinates:
   vessel axis vertical, origin at the body centre, "top" end at negative y.
   The caller wraps the markup in one transform (translate + rotate), so the
   internal parts always stay aligned with the vessel.

     oil(ns, o)  Oil Sample Bottle — floating-piston sample cylinder
                 (after the Leutert PDC description: floating piston, mixing
                 ring, right-angle needle valves, valve protectors at both
                 ends, evacuation fitting on the sample side)
     gas(ns, o)  Gas Sample Bottle — double-ended seamless sample cylinder
                 with tapered shoulders and an isolation valve at each end
                 (after the Swagelok double-ended cylinder; valves representative)

   o = { view:'exterior'|'cutaway', g:[gx,gy] gravity in local coords }
   Exterior and cutaway share every dimension; the cutaway is a section
   through the vessel axis. All ids are prefixed with ns.
   ========================================================================== */
(function () {
  'use strict';

  var COL = {
    oil:   { name: 'Oil sample',     a: '#cfa060', b: '#9a6a2e' },
    drive: { name: 'Driving fluid',  a: '#6f9cc0', b: '#3d6688' },
    gas:   { name: 'Gas sample',     a: '#d5ebe0', b: '#a3cbb8', dot: '#4f8f74' }
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
    // brushed stainless: dark edge, soft key light left of centre, narrow specular, dark far edge
    o += lg('Steel', [[0, '#3b4656'], [.12, '#7d8a9c'], [.3, '#c3ccd8'], [.38, '#e6ebf1'], [.46, '#b5bfcc'], [.7, '#7a8698'], [.9, '#4c5768'], [1, '#2c3442']]);
    o += lg('SteelD', [[0, '#2f3846'], [.3, '#8e9aab'], [.42, '#c9d1dc'], [.6, '#7c889a'], [1, '#262e3a']]);   // fittings / caps
    o += lg('SteelV', [[0, '#c9d1dc'], [.45, '#8a96a8'], [1, '#3c4656']], true);                               // horizontal parts
    o += lg('Brass', [[0, '#5b4a2a'], [.35, '#b39a5f'], [.5, '#dcc690'], [.75, '#8e7843'], [1, '#463818']]);
    o += lg('Inner', [[0, '#1a212c'], [.5, '#3a4452'], [1, '#141a23']]);
    o += lg('Knob', [[0, '#1d222b'], [.4, '#4a5260'], [.55, '#5e6775'], [1, '#161a21']]);
    o += lg('Oil', [[0, COL.oil.a], [1, COL.oil.b]], true);
    o += lg('Drive', [[0, COL.drive.a], [1, COL.drive.b]], true);
    o += lg('Gas', [[0, COL.gas.a, .92], [1, COL.gas.b, .92]], true);
    o += lg('RingTop', [[0, '#e9eef4'], [.55, '#a9b4c3'], [1, '#5d6879']], true);
    o += '<pattern id="' + ns + 'Hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#aab4c2"/><line x1="0" y1="0" x2="0" y2="6" stroke="#4a5566" stroke-width="1.6"/></pattern>';
    o += '<pattern id="' + ns + 'Thread" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#7f8b9c"/><line x1="0" y1="0" x2="4" y2="4" stroke="#2c3442" stroke-width="1.1"/></pattern>';
    o += '<clipPath id="' + ns + 'OilBore">' + R(-OIL.rb, OIL.chT, 2 * OIL.rb, OIL.chB - OIL.chT) + '</clipPath>';
    o += '<clipPath id="' + ns + 'GasIn"><path d="' + gasInner() + '"/></clipPath>';
    return o;
  }

  /* ============================================================ OIL BOTTLE
     barrel  x ±34, y ±236 (threaded ends under the caps)
     caps    x ±39, outer face y ±250, skirt over the barrel to y ±214
     bore    x ±22, chamber y ±226 (cap spigots close the bore)
     piston  46 long, sample share of the stroke = OIL.split               */
  var OIL = { R: 34, rb: 22, capR: 39, capFace: 250, capIn: 236, skirt: 214, chT: -226, chB: 226, pist: 46, split: .55, ring: { ro: 19.5, ri: 12, t: 6, ry: 5, iy: 3 } };
  OIL.pistY = OIL.chT + (OIL.chB - OIL.chT - OIL.pist) * OIL.split;   // piston top face

  /* valve protector + right-angle needle valve, drawn for the TOP end in end
     coordinates (origin = cap outer face centre, outward = negative y)       */
  // L (live, procedure pages): { ring: valve-state colour, needle: style that lifts the needle when open }
  function oilEnd(ns, cut, back, L) {
    var o = '', hatch = 'url(#' + ns + 'Hatch)';
    var cageR = 38, cageT = -104, win = { x0: -25, x1: 25, y0: -90, y1: -12 };
    if (back) {                                       // inside of the protector seen through its window
      o += R(-cageR + 3, cageT + 8, 2 * cageR - 6, -cageT - 8, 'fill="url(#' + ns + 'Inner)"');
      return o;
    }
    // adaptor hex
    o += R(-11, -8, 22, 8, 'fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".8"');
    o += '<line x1="-4" y1="-8" x2="-4" y2="0" stroke="#0a0e16" stroke-width=".5" opacity=".5"/><line x1="4" y1="-8" x2="4" y2="0" stroke="#0a0e16" stroke-width=".5" opacity=".5"/>';
    // valve body (right-angle needle valve): inlet from the cylinder, outlet to the side
    o += R(-15, -50, 30, 42, 'rx="3" fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".9"');
    if (L && L.ring) o += R(-19.5, -54.5, 39, 51, 'rx="6" fill="none" stroke="' + L.ring + '" stroke-width="2.6" opacity=".9"');   // valve state (open / closed)
    o += R(-12, -47, 5, 36, 'rx="2" fill="#fff" opacity=".18"');
    o += R(15, -40, 10, 18, 'fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".8"');             // outlet boss (female port)
    o += R(25, -38, 8, 14, 'rx="1" fill="url(#' + ns + 'SteelV)" ' + K + ' stroke-width=".7"');         // male connector hex
    o += R(33, -34.5, 15, 7, 'fill="url(#' + ns + 'SteelV)" ' + K + ' stroke-width=".7"');              // connection stub
    // bonnet, packing nut, stem, T-handle
    o += R(-10, -64, 20, 14, 'fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".8"');
    o += R(-12, -60, 24, 6, 'rx="1" fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".7"');
    o += R(-3, -84, 6, 20, 'fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".6"');
    o += R(-6, -89, 12, 7, 'rx="1.5" fill="url(#' + ns + 'Knob)" ' + K + ' stroke-width=".6"');
    o += R(-19, -93, 38, 6, 'rx="3" fill="url(#' + ns + 'Knob)" ' + K + ' stroke-width=".7"');
    if (cut) {
      // section through valve: hatched metal, inlet + outlet passages, needle seated (valve closed)
      o += R(-14.4, -49.4, 28.8, 40.8, 'fill="' + hatch + '" opacity=".55"');
      o += R(15.6, -39.4, 9, 16.8, 'fill="' + hatch + '" opacity=".55"');
      o += R(-2, -33, 4, 33, 'fill="#0b1018"');                 // inlet bore
      o += R(0, -33, 48, 4, 'fill="#0b1018"');                  // outlet bore
      o += R(25, -36, 8, 10, 'fill="url(#' + ns + 'Thread)"');   // NPT thread engagement
      o += (L && L.needle ? '<g style="' + L.needle + '">' : '<g>') + P('M-2.2 -64 V-37 L0 -32 L2.2 -37 V-64 Z', 'fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".5"') + '</g>';   // needle on its seat
      o += R(-10, -58, 20, 3, 'fill="#20262f"');                 // stem packing
      // protector in section: side walls + top ring only, so the valve stays in view
      [-cageR, cageR - 3].forEach(function (x) { o += R(x, cageT, 3, -cageT, 'fill="' + hatch + '" ' + K + ' stroke-width=".6"'); });
      o += R(-cageR, cageT, 2 * cageR, 6, 'fill="' + hatch + '" ' + K + ' stroke-width=".6"');
      o += R(cageR - 3.2, -40, 3.6, 18, 'fill="url(#' + ns + 'Inner)"');   // side slot for the outlet
      return o;
    }
    // protector front: tube with a large window, a side slot for the outlet and an open top ring
    var d = 'M' + (-cageR) + ' ' + cageT + ' H' + cageR + ' V0 H' + (-cageR) + ' Z ' +
      'M' + win.x0 + ' ' + win.y0 + ' V' + win.y1 + ' H' + win.x1 + ' V' + win.y0 + ' Z ' +
      'M' + (cageR - 4) + ' -40 V-22 H' + (cageR + 1) + ' V-40 Z';
    o += P(d, 'fill="url(#' + ns + 'Steel)" fill-rule="evenodd" ' + K + ' stroke-width="1"');
    o += P('M' + win.x0 + ' ' + win.y0 + ' H' + win.x1, 'stroke="#0a0e16" stroke-width="1.6" opacity=".55"');   // window edge shadow
    o += R(-cageR - 1, cageT - 1, 2 * cageR + 2, 7, 'rx="2" fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".8"');
    o += R(-cageR - 1, -6, 2 * cageR + 2, 6, 'rx="1.5" fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".8"');
    [-31, 31].forEach(function (x) { o += C(x, -52, 2.2, 'fill="#1f2630" stroke="#8b97a8" stroke-width=".5"'); });   // retaining screws
    return o;
  }

  function oilCap(ns, cut) {
    var o = '', y0 = -OIL.capFace, h = OIL.capFace - OIL.skirt, hatch = 'url(#' + ns + 'Hatch)';
    o += R(-OIL.capR, y0, 2 * OIL.capR, h, 'rx="4" fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width="1"');
    if (!cut) {
      for (var i = -3; i <= 3; i++) o += '<line x1="' + (i * 11) + '" y1="' + (y0 + 5) + '" x2="' + (i * 11) + '" y2="' + (y0 + h - 5) + '" stroke="#0a0e16" stroke-width=".6" opacity=".25"/>';
      o += C(-24, y0 + h / 2, 3, 'fill="#1b2029" stroke="#0a0e16" stroke-width=".5"') + C(24, y0 + h / 2, 3, 'fill="#1b2029" stroke="#0a0e16" stroke-width=".5"');   // spanner holes
      return o;
    }
    o += R(-OIL.capR + .6, y0 + .6, 2 * OIL.capR - 1.2, h - 1.2, 'rx="3.5" fill="' + hatch + '" opacity=".6"');
    // spigot closing the bore with its O-ring + back-up ring
    o += R(-OIL.rb, -OIL.capIn, 2 * OIL.rb, OIL.capIn + OIL.chT, 'fill="' + hatch + '" ' + K + ' stroke-width=".5"');
    [-1, 1].forEach(function (s) {
      o += C(s * (OIL.rb - 2.4), -231, 2.4, 'fill="#141920" stroke="#5e6878" stroke-width=".5"');
      o += R(s > 0 ? OIL.rb - 1.4 : -OIL.rb, -228.6, 1.4, 2.4, 'fill="#e8e2d0"');
    });
    // thread engagement cap skirt / barrel end
    [-1, 1].forEach(function (s) { o += R(s > 0 ? OIL.R : -OIL.R - 2.5, -OIL.capIn, 2.5, OIL.capIn - OIL.skirt, 'fill="url(#' + ns + 'Thread)"'); });
    o += R(-2, -OIL.capFace, 4, OIL.capFace + OIL.chT, 'fill="#0b1018"');      // central port
    return o;
  }

  /* evacuation fitting on the sample-side cap (radial port + sealing plug) */
  function oilEvac(ns, cut) {
    var y = -243, o = '';
    o += R(-48, y - 6, 9, 12, 'fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".8"');
    o += R(-57, y - 7.5, 9, 15, 'rx="1.2" fill="url(#' + ns + 'SteelV)" ' + K + ' stroke-width=".7"');
    o += '<line x1="-52.5" y1="' + (y - 7.5) + '" x2="-52.5" y2="' + (y + 7.5) + '" stroke="#0a0e16" stroke-width=".5" opacity=".5"/>';
    o += R(-61, y - 4, 4, 8, 'rx="1" fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".6"');
    if (cut) {
      o += R(-48, y - 1.6, 36, 3.2, 'fill="#0b1018"');                 // radial passage through the cap
      o += R(-14.6, y - 1.6, 3.2, OIL.chT - y + 1.6, 'fill="#0b1018"');  // down into the sample chamber
      o += R(-48, y - 4, 7, 8, 'fill="url(#' + ns + 'Thread)"');
    }
    return o;
  }

  function oil(ns, op) {
    var cut = op.view === 'cutaway', g = op.g || [0, 1], o = '', hatch = 'url(#' + ns + 'Hatch)';
    var top = 'translate(0 ' + (-OIL.capFace) + ')', bot = 'translate(0 ' + OIL.capFace + ') scale(1,-1)';
    if (!cut) { o += '<g transform="' + top + '">' + oilEnd(ns, false, true) + '</g><g transform="' + bot + '">' + oilEnd(ns, false, true) + '</g>'; }
    // barrel
    o += R(-OIL.R, -OIL.capIn, 2 * OIL.R, 2 * OIL.capIn, 'fill="url(#' + ns + 'Steel)" ' + K + ' stroke-width="1.2"');
    if (!cut) {
      o += R(-OIL.R + 6, -OIL.skirt + 4, 4, 2 * OIL.skirt - 8, 'rx="2" fill="#fff" opacity=".22"');
      o += R(-9, -60, 18, 120, 'rx="1.5" fill="none" stroke="#2c3442" stroke-width=".7" opacity=".55"');                  // engraved marking field
      o += '<g transform="rotate(' + (op.textRot || -90) + ')" font-family="IBM Plex Mono, monospace" font-size="6.6" font-weight="600" letter-spacing=".7" fill="#2c3442" text-anchor="middle" opacity=".75"><text x="0" y="2.4">PISTON SAMPLE CYLINDER</text></g>';
    } else {
      o += R(-OIL.R + .6, -OIL.capIn + .6, 2 * OIL.R - 1.2, 2 * OIL.capIn - 1.2, 'fill="' + hatch + '" opacity=".6"');
      o += R(-OIL.rb, -OIL.capIn, 2 * OIL.rb, 2 * OIL.capIn, 'fill="#0b1018"');
      o += '<g clip-path="url(#' + ns + 'OilBore)">' + (op.live ? op.live.inner || '' : oilInside(ns, g)) + '</g>';
      o += R(-OIL.rb, OIL.chT, 2 * OIL.rb, OIL.chB - OIL.chT, 'fill="none" stroke="rgba(170,190,215,.45)" stroke-width=".8"');
      o += R(-OIL.rb + 3, OIL.chT + 6, 3, OIL.chB - OIL.chT - 12, 'rx="1.5" fill="#fff" opacity=".12"');
    }
    o += '<g>' + oilCap(ns, cut) + '</g><g transform="scale(1,-1)">' + oilCap(ns, cut) + '</g>';
    o += oilEvac(ns, cut);
    var LV = op.live || {};
    o += '<g transform="' + top + '">' + oilEnd(ns, cut, false, { ring: LV.ringT, needle: LV.needleT }) + '</g><g transform="' + bot + '">' + oilEnd(ns, cut, false, { ring: LV.ringB, needle: LV.needleB }) + '</g>';
    if (cut) o += cutEdges(-OIL.R, OIL.R, -OIL.capIn, OIL.capIn);
    return o;
  }

  function oilInside(ns, g) {
    var o = '', rb = OIL.rb, pt = OIL.pistY, pb = pt + OIL.pist;
    o += R(-rb, OIL.chT, 2 * rb, pt - OIL.chT, 'fill="url(#' + ns + 'Oil)"');
    o += R(-rb, pb, 2 * rb, OIL.chB - pb, 'fill="url(#' + ns + 'Drive)"');
    o += piston(ns, pt);
    // mixing ring: loose ring, its axis kept along the bore by the small wall clearance
    var rp = ringPos(g);
    o += mixRing(ns, rp[0], rp[1]);
    return o;
  }
  function piston(ns, pt) {
    var o = '', rb = OIL.rb, pb = pt + OIL.pist;
    // floating piston: body, two seal grooves (O-ring + back-up rings), guide ring between them
    o += R(-rb, pt, 2 * rb, OIL.pist, 'fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".9"');
    o += R(-rb + 3, pt + 2, 2 * rb - 6, 2, 'fill="#fff" opacity=".35"');
    [pt + 9, pb - 9].forEach(function (y) {
      [-1, 1].forEach(function (s) {
        var x = s > 0 ? rb - 5 : -rb;
        o += R(x, y - 3.2, 5, 6.4, 'fill="#0b1018"');
        o += C(s * (rb - 2.6), y, 2.5, 'fill="#141920" stroke="#5e6878" stroke-width=".5"');
        o += R(s > 0 ? rb - 1.2 : -rb, y - 3.2, 1.2, 1.1, 'fill="#e8e2d0"') + R(s > 0 ? rb - 1.2 : -rb, y + 2.1, 1.2, 1.1, 'fill="#e8e2d0"');
      });
    });
    var gy = pt + OIL.pist / 2;
    [-1, 1].forEach(function (s) { o += R(s > 0 ? rb - 2.2 : -rb, gy - 6, 2.2, 12, 'fill="#d9cfae" stroke="#6c6244" stroke-width=".4"'); });   // guide ring (wear band)
    return o;
  }
  /* live bore contents for the procedure pages (screen frame: y down, sample side up). Styles come from
     the page state (see BottleArt.styles): sample / drive fills and the piston group (piston top at chT
     when the sample side is empty). The mixing ring rides on the piston face unless o.ring === false. */
  function liveInside(ns, o) {
    var rb = OIL.rb, T = OIL.chT, H = OIL.chB - OIL.chT, m = OIL.ring;
    var s = R(-rb, T, 2 * rb, H, 'fill="url(#' + ns + 'Drive)" style="' + (o.drive || '') + '"');
    s += R(-rb, T, 2 * rb, H, 'fill="url(#' + ns + 'Oil)" style="' + (o.sample || '') + '"');
    s += o.extra || '';
    s += '<g style="' + (o.piston || '') + '">' + (o.ring === false ? '' : mixRing(ns, 0, T - (m.t / 2 + m.ry + .5))) + piston(ns, T) + '</g>';
    return s;
  }

  /* ring seen slightly obliquely (elliptical faces) so it reads as a ring, not a plate:
     lower face, outer band, upper face, centre hole showing the oil through it */
  function mixRing(ns, cx, cy) {
    var m = OIL.ring, h = m.t / 2, E = function (y, rx, ry, a) { return '<ellipse cx="' + r1(cx) + '" cy="' + r1(y) + '" rx="' + rx + '" ry="' + ry + '" ' + a + '/>'; };
    var o = E(cy + h + 1.2, m.ro, m.ry, 'fill="#000" opacity=".22"');
    o += E(cy + h, m.ro, m.ry, 'fill="#4a5466" stroke="#141920" stroke-width=".6"');
    o += R(cx - m.ro, cy - h, 2 * m.ro, m.t, 'fill="url(#' + ns + 'SteelD)"');
    o += '<line x1="' + r1(cx - m.ro) + '" y1="' + r1(cy - h) + '" x2="' + r1(cx - m.ro) + '" y2="' + r1(cy + h) + '" stroke="#141920" stroke-width=".6"/><line x1="' + r1(cx + m.ro) + '" y1="' + r1(cy - h) + '" x2="' + r1(cx + m.ro) + '" y2="' + r1(cy + h) + '" stroke="#141920" stroke-width=".6"/>';
    o += E(cy - h, m.ro, m.ry, 'fill="url(#' + ns + 'RingTop)" stroke="#141920" stroke-width=".6"');
    o += E(cy - h, m.ri, m.iy, 'fill="url(#' + ns + 'Oil)" stroke="#141920" stroke-width=".6"');
    o += E(cy - h + .9, m.ri, m.iy - .9, 'fill="#000" opacity=".28"');                 // bore of the ring
    return o;
  }
  function ringPos(g) {
    var m = OIL.ring, pt = OIL.pistY, dy = m.t / 2 + m.ry + .5;
    if (Math.abs(g[0]) > .5) return [g[0] > 0 ? 1.8 : -1.8, OIL.chT + (pt - OIL.chT) * .5];   // lying down: rests on the lower wall
    return g[1] > 0 ? [0, pt - dy] : [0, OIL.chT + dy];                                       // upright: on the piston face
  }

  /* ============================================================ GAS BOTTLE
     seamless shell: barrel R 42 (y ±118), tapered shoulders to necks R 12
     (y ±160 .. ±172); wall 5; female NPT ports in the necks               */
  var GAS = { R: 42, y: 118, neck: 160, end: 172, rn: 12, wall: 5 };
  function gasOuter() {
    return 'M-12,-172 L12,-172 L12,-160 C30,-157 42,-146 42,-118 L42,118 C42,146 30,157 12,160 L12,172 L-12,172 L-12,160 C-30,157 -42,146 -42,118 L-42,-118 C-42,-146 -30,-157 -12,-160 Z';
  }
  function gasInner() {
    return 'M-6,-172 L6,-172 L6,-156 C24,-152 37,-142 37,-118 L37,118 C37,142 24,152 6,156 L6,172 L-6,172 L-6,156 C-24,152 -37,142 -37,118 L-37,-118 C-37,-142 -24,-152 -6,-156 Z';
  }
  /* hex nipple + inline needle valve + outlet connector, TOP end, origin = neck face */
  function gasEnd(ns, cut) {
    var o = '', hatch = 'url(#' + ns + 'Hatch)';
    o += R(-11, -14, 22, 12, 'rx="1" fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".8"');      // nipple hex
    o += '<line x1="-4" y1="-14" x2="-4" y2="-2" stroke="#0a0e16" stroke-width=".5" opacity=".5"/><line x1="4" y1="-14" x2="4" y2="-2" stroke="#0a0e16" stroke-width=".5" opacity=".5"/>';
    o += R(-6, -2, 12, 2, 'fill="url(#' + ns + 'Thread)"') + R(-6, -20, 12, 6, 'fill="url(#' + ns + 'Thread)"');
    o += R(-14, -50, 28, 30, 'rx="3" fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".9"');      // valve body
    o += R(-11, -47, 4, 24, 'rx="2" fill="#fff" opacity=".18"');
    o += R(14, -41, 8, 12, 'fill="url(#' + ns + 'SteelV)" ' + K + ' stroke-width=".7"');              // bonnet
    o += R(22, -37, 8, 4, 'fill="url(#' + ns + 'SteelV)" ' + K + ' stroke-width=".5"');               // stem
    o += R(30, -46, 12, 22, 'rx="3" fill="url(#' + ns + 'Knob)" ' + K + ' stroke-width=".7"');        // handle
    for (var i = 0; i < 4; i++) o += '<line x1="' + (32 + i * 2.6) + '" y1="-44" x2="' + (32 + i * 2.6) + '" y2="-26" stroke="#9aa3b0" stroke-width=".5" opacity=".5"/>';
    o += R(-10, -60, 20, 10, 'rx="1" fill="url(#' + ns + 'SteelD)" ' + K + ' stroke-width=".8"');      // male connector hex
    o += R(-3.5, -76, 7, 16, 'fill="url(#' + ns + 'SteelV)" ' + K + ' stroke-width=".7"');            // connection stub
    if (cut) {
      o += R(-13.4, -49.4, 26.8, 28.8, 'fill="' + hatch + '" opacity=".55"');
      o += R(-10.4, -13.4, 20.8, 10.8, 'fill="' + hatch + '" opacity=".55"');
      o += R(-2, -76, 4, 88, 'fill="#0b1018"');                                  // through bore (axial)
      o += P('M22 -36.6 H3.5 L-.5 -35 L3.5 -33.4 H22 Z', 'fill="url(#' + ns + 'SteelV)" ' + K + ' stroke-width=".4"');   // needle seated across the bore
    }
    return o;
  }
  function gas(ns, op) {
    var cut = op.view === 'cutaway', o = '', hatch = 'url(#' + ns + 'Hatch)';
    o += P(gasOuter(), 'fill="url(#' + ns + 'Steel)" ' + K + ' stroke-width="1.2"');
    if (!cut) {
      // shoulder shading + highlight + stamped marking band
      o += P('M-42,-118 C-42,-146 -30,-157 -12,-160 L12,-160 C30,-157 42,-146 42,-118 Z', 'fill="#0a0e16" opacity=".12"');
      o += P('M-42,118 C-42,146 -30,157 -12,160 L12,160 C30,157 42,146 42,118 Z', 'fill="#0a0e16" opacity=".18"');
      o += R(-35, -112, 5, 224, 'rx="2.5" fill="#fff" opacity=".24"');
      o += R(-42, -96, 84, 12, 'fill="#0a0e16" opacity=".08"');
      o += '<g transform="rotate(' + (op.textRot || -90) + ')" font-family="IBM Plex Mono, monospace" font-size="6.4" font-weight="600" letter-spacing=".8" fill="#2c3442" text-anchor="middle" opacity=".7"><text x="0" y="2.3">DOUBLE-ENDED SAMPLE CYLINDER</text></g>';
    } else {
      o += P(gasOuter(), 'fill="' + hatch + '" opacity=".6"');
      o += P(gasInner(), 'fill="#0b1018"');
      o += '<g clip-path="url(#' + ns + 'GasIn)"><g' + (op.fillStyle ? ' style="' + op.fillStyle + '"' : '') + '>' + P(gasInner(), 'fill="url(#' + ns + 'Gas)"') + gasDots() + '</g>' + (op.extra || '') + '</g>';
      o += P(gasInner(), 'fill="none" stroke="rgba(170,190,215,.45)" stroke-width=".8"');
      [-1, 1].forEach(function (s) { o += R(-6, s < 0 ? -172 : 160, 12, 12, 'fill="url(#' + ns + 'Thread)"') + R(-2, s < 0 ? -172 : 160, 4, 12, 'fill="#0b1018"'); });   // female NPT + nipple
      o += cutEdges(-GAS.R, GAS.R, -GAS.y, GAS.y);
    }
    o += '<g transform="translate(0 -172)">' + gasEnd(ns, cut) + '</g><g transform="translate(0 172) scale(1,-1)">' + gasEnd(ns, cut) + '</g>';
    return o;
  }
  // gas fills the whole chamber: uniform, evenly scattered molecules (no level)
  function gasDots() {
    var o = '';
    for (var i = 1; i < 260; i++) {
      var x = -36 + 72 * hal(i, 2), y = -170 + 340 * hal(i, 3);
      o += '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="1.25"/>';
    }
    return '<g fill="' + COL.gas.dot + '" opacity=".55">' + o + '</g>';
  }
  function hal(i, b) { var f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
  function cutEdges(x0, x1, y0, y1) {
    return [x0, x1].map(function (x) { return '<line x1="' + x + '" y1="' + y0 + '" x2="' + x + '" y2="' + y1 + '" stroke="#e7752e" stroke-width=".9" stroke-dasharray="5 4" opacity=".6"/>'; }).join('');
  }

  /* ------------------------------------------------------- label anchors
     side +1 = valve-handle / outlet side (+x), -1 = opposite; cut = cutaway only, ext = exterior only */
  var ANCHORS = {
    oil: [
      { id: 'handleT', x: -19, y: -340, s: -1, n: 'Needle-valve handle', d: 'sample side' },
      { id: 'cageT', x: -38, y: -300, s: -1, n: 'Valve protector', d: 'guards the valve in transport' },
      { id: 'valveT', x: 15, y: -290, s: 1, n: 'Sample valve', d: 'right-angle needle valve' },
      { id: 'portT', x: 48, y: -281, s: 1, n: 'Sample connection', d: '¼" NPT female port' },
      { id: 'evac', x: -61, y: -243, s: -1, n: 'Evacuation fitting', d: 'sample side · plugged' },
      { id: 'capT', x: 39, y: -224, s: 1, n: 'End cap', d: 'screwed · sample side' },
      { id: 'capSeal', x: 20, y: -231, s: 1, cut: 1, n: 'Cap seal', d: 'O-ring + back-up ring' },
      { id: 'body', x: -34, y: 40, s: -1, n: 'Pressure vessel', d: 'stainless barrel' },
      { id: 'oil', x: 12, y: (OIL.chT + OIL.pistY) / 2 - 30, s: 1, cut: 1, n: 'Sample chamber', d: 'oil sample' },
      { id: 'ring', x: -19.5, y: 0, s: -1, cut: 1, n: 'Mixing ring', d: 'loose ring in the sample chamber' },
      { id: 'piston', x: -12, y: OIL.pistY + OIL.pist / 2 + 12, s: -1, cut: 1, n: 'Floating piston', d: 'separates the two fluids' },
      { id: 'seal', x: 20, y: OIL.pistY + 9, s: 1, cut: 1, n: 'Piston seals', d: 'O-ring + back-up rings (×2)' },
      { id: 'guide', x: 21, y: OIL.pistY + OIL.pist / 2, s: 1, cut: 1, n: 'Guide ring', d: 'wear band' },
      { id: 'drive', x: 12, y: (OIL.pistY + OIL.pist + OIL.chB) / 2, s: 1, cut: 1, n: 'Driving-fluid chamber', d: 'hydraulic side' },
      { id: 'capB', x: 39, y: 232, s: 1, n: 'End cap', d: 'screwed · driving side' },
      { id: 'portB', x: 48, y: 281, s: 1, n: 'Driving-fluid connection', d: '¼" NPT female port' },
      { id: 'valveB', x: -15, y: 290, s: -1, n: 'Driving-fluid valve', d: 'right-angle needle valve' },
      { id: 'cageB', x: -38, y: 322, s: -1, n: 'Valve protector', d: 'driving side' }
    ],
    gas: [
      { id: 'portT', x: 3.5, y: -240, s: 1, n: 'Connection', d: 'top end' },
      { id: 'valveT', x: 42, y: -207, s: 1, n: 'Isolation valve', d: 'representative needle valve' },
      { id: 'nipT', x: -11, y: -180, s: -1, n: 'Hex nipple', d: '¼" NPT male' },
      { id: 'neck', x: -12, y: -166, s: -1, n: 'Neck', d: '¼" NPT female port' },
      { id: 'shoulder', x: 30, y: -146, s: 1, n: 'Tapered shoulder', d: 'seamless, formed' },
      { id: 'body', x: -42, y: 30, s: -1, n: 'Cylinder body', d: 'seamless stainless steel' },
      { id: 'mark', x: 42, y: -90, s: 1, ext: 1, n: 'Marking band', d: 'stamped data area' },
      { id: 'chamber', x: 18, y: 10, s: 1, cut: 1, n: 'Gas chamber', d: 'one continuous volume' },
      { id: 'wall', x: 40, y: 70, s: 1, cut: 1, n: 'Wall section', d: 'uniform thickness' },
      { id: 'valveB', x: 42, y: 207, s: 1, n: 'Isolation valve', d: 'bottom end' },
      { id: 'portB', x: -3.5, y: 240, s: -1, n: 'Connection', d: 'bottom end' }
    ]
  };
  function anchors(kind, view, g) {
    return ANCHORS[kind].filter(function (a) { return view === 'cutaway' ? !a.ext : !a.cut; }).map(function (a) {
      if (a.id !== 'ring') return a;
      var p = ringPos(g || [0, 1]);                       // the label follows the ring
      return { id: a.id, x: p[0] - OIL.ring.ro, y: p[1], s: a.s, n: a.n, d: a.d };
    });
  }
  var EXTENT = { oil: { hl: 362, hw: 62 }, gas: { hl: 248, hw: 46 } };

  /* ------------------------------------------------------- full 2D drawing
     svg(kind, view, orient, o) -> complete <svg> with the bottle and (optionally) its labels.
     Both bottles use one viewBox per orientation, so they are drawn at the same scale.
     o = { ns (id namespace), labels (bool), selected (part id), title (aria label) }
     Each label is a <g class="pb-lab" data-part=…> so a page can make it clickable. */
  function rot(p, deg) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
  function vbox(orient) {
    return orient === 'horizontal' ? { w: 1200, h: 420, cx: 600, cy: 210, ang: -90, s: 1.25 } : { w: 640, h: 790, cx: 320, cy: 395, ang: 0, s: 1 };
  }
  function partOf(kind, id) {
    var E = window.EQUIPMENT && window.EQUIPMENT[kind];
    return E && E.map2d && E.map2d[id] || '';
  }
  function labelLayer(kind, view, V, selected) {
    var g = [Math.sin(V.ang * Math.PI / 180), Math.cos(V.ang * Math.PI / 180)];
    var nrm = rot([1, 0], V.ang), horiz = V.ang !== 0, o = '', tx = '';
    var items = anchors(kind, view, g).map(function (a) {
      var q = rot([a.x * V.s, a.y * V.s], V.ang);
      return { a: a, p: [V.cx + q[0], V.cy + q[1]], w: Math.max(a.n.length * 7.2, a.d.length * 6.4) + 12 };
    });
    var lab = function (i, x, y, an) {
      var part = partOf(kind, i.a.id);
      var x0 = an === 'start' ? x - 4 : an === 'end' ? x - i.w : x - i.w / 2;      // whole label area is clickable, not just the glyphs
      return '<g class="pb-lab' + (part && part === selected ? ' on' : '') + '"' + (part ? ' data-part="' + part + '" tabindex="0" role="button"' : '') + '>' +
        (part ? '<rect x="' + r1(x0) + '" y="' + r1(y - 13) + '" width="' + r1(i.w + 4) + '" height="30" fill="transparent"/>' : '') +
        '<text class="lab-n" x="' + r1(x) + '" y="' + r1(y) + '" text-anchor="' + an + '">' + esc(i.a.n) + '</text>' +
        '<text class="lab-s" x="' + r1(x) + '" y="' + r1(y + 13) + '" text-anchor="' + an + '">' + esc(i.a.d) + '</text></g>';
    };
    [1, -1].forEach(function (side) {
      var L = items.filter(function (i) { return i.a.s === side; });
      if (!horiz) {
        var x = V.cx + side * 104, sp = 33;
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
          tx += lab(i, i.x, y, 'middle');
        });
      }
    });
    return o + tx;                                      // text after leaders, so leaders never cross a label
  }
  function svg(kind, view, orient, o) {
    o = o || {};
    var V = vbox(orient), ns = o.ns || ('pb' + kind);
    if (o.tight && !o.labels) V = orient === 'horizontal' ? { w: 1000, h: 170, cx: 500, cy: 85, ang: -90, s: 1.25 } : { w: 150, h: 740, cx: 75, cy: 370, ang: 0, s: 1 };   // thumbnails: no label margins
    var g = [Math.sin(V.ang * Math.PI / 180), Math.cos(V.ang * Math.PI / 180)];
    var textRot = Math.abs(((V.ang - 90) % 360 + 540) % 360 - 180) > 90 ? 90 : -90;   // body marking always reads upright
    var body = (kind === 'oil' ? oil : gas)(ns, { view: view, g: g, textRot: textRot });
    return '<svg class="pb-svg" viewBox="0 0 ' + V.w + ' ' + V.h + '" preserveAspectRatio="xMidYMid meet" role="img"' + (o.title ? ' aria-label="' + esc(o.title) + '"' : '') + '>' +
      '<defs>' + defs(ns) + '</defs>' +
      '<g transform="translate(' + V.cx + ' ' + V.cy + ') rotate(' + V.ang + ') scale(' + V.s + ')">' + body + '</g>' +
      (o.labels ? labelLayer(kind, view, V, o.selected) : '') + '</svg>';
  }

  window.PBDraw = { COL: COL, defs: defs, oil: oil, gas: gas, anchors: anchors, EXTENT: EXTENT, svg: svg,
    OIL: OIL, GAS: GAS, piston: piston, mixRing: mixRing, liveInside: liveInside, gasInner: gasInner };
})();
