/* ==========================================================================
   BottleArt — shared sample-bottle drawing kit for the workflow pages.

   One visual foundation for every sample bottle in the procedures: the
   approved Oil Sample Bottle and Gas Sample Bottle designs
   (equipment/bottle-draw.js), drawn at each page's own scale and with the
   page's own bore window, so fluid fills, piston travel, valves and tubing
   keep their existing coordinates.

   Oil Sample Bottle (floating-piston cylinder), cutaway:
     oilBody(p, g)   barrel with hatched wall section + screwed end caps
                     (spigot, cap seal, central port), drawn BEHIND the page's
                     bore contents. g = { cx, rb, y0, y1, R?, capR?, capH? }
                     cx axis · rb bore half-width · y0/y1 bore ends (unchanged)
     oilFront(p, g)  bore edge + highlight, drawn after the contents
     cage(p, cx, yCap, yEnd, half)  valve protector (posts + end ring) around
                     the page's own valve, between the cap face and yEnd
     piston(p, x, w, y, h)    floating piston with two seals and a guide ring
     ring(p, cx, rb, yc)      loose mixing ring centred at yc (sample side only)
   Gas Sample Bottle (double-ended seamless cylinder):
     gasPaths(g)     outer / inner outline, g = { cx, R, y0, y1, rn, sh }
     gasBody(p, g)   shell with tapered shoulders and necks (no piston, no level)
   Shared:
     defs(p)         gradients / patterns, ids prefixed with p. Uses the
                     template dialect (sc-camel-*); raw() converts it for
                     modules that build SVG strings for innerHTML.
     pill(x, y, spec, o)  "Bottle Details" button drawn in the page SVG;
                     spec = 'oil' | 'oilN2' | 'gas' | 'oil|gas' (selector).
   Drawing only: no process values here.
   ========================================================================== */
(function () {
  'use strict';

  function r1(v) { return Math.round(v * 10) / 10; }
  function R(x, y, w, h, a) { return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '" ' + (a || '') + '></rect>'; }
  function C(x, y, r, a) { return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(r) + '" ' + (a || '') + '></circle>'; }
  function E(x, y, rx, ry, a) { return '<ellipse cx="' + r1(x) + '" cy="' + r1(y) + '" rx="' + r1(rx) + '" ry="' + r1(ry) + '" ' + (a || '') + '></ellipse>'; }
  var K = 'stroke="#0a0e16"';

  /* ------------------------------------------------------------------ defs
     Same palette as the approved drawings (bottle-draw.js) */
  function defs(p) {
    var lg = function (id, stops, vert) {
      return '<linearGradient id="' + p + id + '" x1="0" y1="0" x2="' + (vert ? 0 : 1) + '" y2="' + (vert ? 1 : 0) + '">' +
        stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '></stop>'; }).join('') + '</linearGradient>';
    };
    return lg('BkSt', [[0, '#3b4656'], [.12, '#7d8a9c'], [.3, '#c3ccd8'], [.38, '#e6ebf1'], [.46, '#b5bfcc'], [.7, '#7a8698'], [.9, '#4c5768'], [1, '#2c3442']]) +
      lg('BkStD', [[0, '#2f3846'], [.3, '#8e9aab'], [.42, '#c9d1dc'], [.6, '#7c889a'], [1, '#262e3a']]) +
      lg('BkStV', [[0, '#c9d1dc'], [.45, '#8a96a8'], [1, '#3c4656']], true) +
      lg('BkRing', [[0, '#e9eef4'], [.55, '#a9b4c3'], [1, '#5d6879']], true) +
      lg('BkGas', [[0, '#d5ebe0', .92], [1, '#a3cbb8', .92]], true) +
      '<pattern id="' + p + 'BkHatch" width="6" height="6" sc-camel-pattern-units="userSpaceOnUse" sc-camel-pattern-transform="rotate(45)"><rect width="6" height="6" fill="#aab4c2"></rect><line x1="0" y1="0" x2="0" y2="6" stroke="#4a5566" stroke-width="1.6"></line></pattern>' +
      '<pattern id="' + p + 'BkThread" width="4" height="4" sc-camel-pattern-units="userSpaceOnUse"><rect width="4" height="4" fill="#7f8b9c"></rect><line x1="0" y1="0" x2="4" y2="4" stroke="#2c3442" stroke-width="1.1"></line></pattern>';
  }
  function raw(s) { return s.replace(/sc-camel-([a-z-]+)=/g, function (m, n) { return n.replace(/-([a-z])/g, function (x, c) { return c.toUpperCase(); }) + '='; }); }

  /* ------------------------------------------------------------ oil bottle */
  function geo(g) {
    var o = { cx: g.cx, rb: g.rb, y0: g.y0, y1: g.y1 };
    o.R = g.R || g.rb + Math.max(4, g.rb * 0.16);            // barrel outer half-width
    o.capR = g.capR || o.R + Math.max(3, g.rb * 0.12);       // end cap half-width
    o.capH = g.capH || Math.max(10, g.rb * 0.55);            // cap height (outside the bore)
    o.sk = Math.max(3, o.capH * 0.35);                        // cap skirt over the barrel
    return o;
  }
  function oilBody(p, g) {
    var G = geo(g), cx = G.cx, h = 'url(#' + p + 'BkHatch)', s = '';
    var bT = G.y0 - G.sk, bB = G.y1 + G.sk;                   // barrel ends (under the cap skirts)
    // barrel: brushed stainless, hatched wall section, dark bore
    s += R(cx - G.R, bT, 2 * G.R, bB - bT, 'fill="url(#' + p + 'BkSt)" ' + K + ' stroke-width="1"');
    s += R(cx - G.R + .5, bT, G.R - G.rb - .5, bB - bT, 'fill="' + h + '" opacity=".6"');
    s += R(cx + G.rb, bT, G.R - G.rb - .5, bB - bT, 'fill="' + h + '" opacity=".6"');
    s += R(cx - G.rb, G.y0, 2 * G.rb, G.y1 - G.y0, 'fill="#0a1420"');
    // end caps: screwed over the barrel, spigot closes the bore, cap seal, central port
    [-1, 1].forEach(function (sg) {
      var face = sg < 0 ? G.y0 - G.capH : G.y1 + G.capH, yA = Math.min(face, sg < 0 ? G.y0 : G.y1), hh = G.capH;
      s += R(cx - G.capR, yA, 2 * G.capR, hh, 'rx="' + r1(Math.min(3, hh / 4)) + '" fill="url(#' + p + 'BkStD)" ' + K + ' stroke-width="1"');
      s += R(cx - G.capR + .6, yA + .6, 2 * G.capR - 1.2, hh - 1.2, 'rx="2" fill="' + h + '" opacity=".55"');
      // thread engagement where the cap skirt overlaps the barrel
      var ty = sg < 0 ? G.y0 - G.sk : G.y1;
      s += R(cx - G.R - 1.6, ty, 1.6, G.sk, 'fill="url(#' + p + 'BkThread)"') + R(cx + G.R, ty, 1.6, G.sk, 'fill="url(#' + p + 'BkThread)"');
      // cap seal (O-ring + back-up ring) at the bore end
      var sy = sg < 0 ? G.y0 - 1.6 : G.y1 + 1.6, rs = Math.max(1.1, G.rb * 0.06);
      s += C(cx - G.rb + rs, sy, rs, 'fill="#141920" stroke="#5e6878" stroke-width=".4"') + C(cx + G.rb - rs, sy, rs, 'fill="#141920" stroke="#5e6878" stroke-width=".4"');
      // central port through the cap
      var pr = Math.max(1.2, G.rb * 0.06);
      s += R(cx - pr, yA, 2 * pr, hh, 'fill="#0b1018"');
      // spanner holes on the cap face
      s += C(cx - G.capR * .62, yA + hh / 2, Math.max(.9, hh * .12), 'fill="#1b2029" opacity=".8"') + C(cx + G.capR * .62, yA + hh / 2, Math.max(.9, hh * .12), 'fill="#1b2029" opacity=".8"');
    });
    // cut-plane edges (cutaway convention)
    s += '<path d="M' + r1(cx - G.R) + ' ' + r1(bT) + ' V' + r1(bB) + ' M' + r1(cx + G.R) + ' ' + r1(bT) + ' V' + r1(bB) + '" fill="none" stroke="#e7752e" stroke-width=".9" opacity=".45"></path>';
    return s;
  }
  function oilFront(p, g) {
    var G = geo(g), cx = G.cx;
    return R(cx - G.rb, G.y0, 2 * G.rb, G.y1 - G.y0, 'fill="none" stroke="rgba(170,190,215,.45)" stroke-width=".8"') +
      R(cx - G.rb + Math.max(2, G.rb * .1), G.y0 + 4, Math.max(2, G.rb * .08), Math.max(0, G.y1 - G.y0 - 8), 'rx="1.5" fill="#ffffff" opacity=".12"');
  }
  /* valve protector: two posts and an end ring around the page's own valve (end at yEnd, cap face at yCap) */
  function cage(p, cx, yCap, yEnd, half) {
    var dn = yEnd > yCap, y0 = Math.min(yCap, yEnd), H = Math.abs(yEnd - yCap), t = Math.max(2.2, half * 0.1), rh = Math.max(3, t * 1.3);
    var ry = dn ? yEnd - rh : yEnd, s = '';
    s += R(cx - half, y0, t, H, 'fill="url(#' + p + 'BkSt)" ' + K + ' stroke-width=".7"');
    s += R(cx + half - t, y0, t, H, 'fill="url(#' + p + 'BkSt)" ' + K + ' stroke-width=".7"');
    // end ring, open in the middle for the line
    var gap = Math.max(7, half * 0.3);
    s += R(cx - half - 1, ry, half + 1 - gap, rh, 'rx="1.2" fill="url(#' + p + 'BkStD)" ' + K + ' stroke-width=".7"');
    s += R(cx + gap, ry, half + 1 - gap, rh, 'rx="1.2" fill="url(#' + p + 'BkStD)" ' + K + ' stroke-width=".7"');
    return s;
  }
  /* floating piston: body, two seals (O-ring in a groove) and a guide ring between them */
  function piston(p, x, w, y, h, a) {
    var s = R(x, y, w, h, 'fill="url(#' + p + 'BkStD)" ' + K + ' stroke-width="1"' + (a ? ' ' + a : ''));
    s += R(x + 2, y + 1.4, w - 4, Math.max(1, h * .12), 'fill="#eef4fb" opacity=".4"');
    var rs = Math.max(1, Math.min(h * .14, 2.6)), dy = Math.max(rs + .6, h * .24);
    [y + dy, y + h - dy].forEach(function (yy) {
      s += R(x, yy - rs - .4, rs * 2 + 1, 2 * rs + .8, 'fill="#0b1018"') + R(x + w - rs * 2 - 1, yy - rs - .4, rs * 2 + 1, 2 * rs + .8, 'fill="#0b1018"');
      s += C(x + rs + .5, yy, rs, 'fill="#141920" stroke="#5e6878" stroke-width=".4"') + C(x + w - rs - .5, yy, rs, 'fill="#141920" stroke="#5e6878" stroke-width=".4"');
    });
    var gh = Math.max(1.6, h * .2);
    s += R(x, y + h / 2 - gh / 2, Math.max(1, rs), gh, 'fill="#d9cfae" stroke="#6c6244" stroke-width=".3"') + R(x + w - Math.max(1, rs), y + h / 2 - gh / 2, Math.max(1, rs), gh, 'fill="#d9cfae" stroke="#6c6244" stroke-width=".3"');
    return s;
  }
  /* loose mixing ring (approved design): ring seen slightly from above, centred at yc */
  function ringDim(rb) { var ro = rb * .86; return { ro: ro, ri: rb * .52, t: Math.max(3, rb * .2), ry: ro * .2, iy: rb * .52 * .2 }; }
  function ring(p, cx, rb, yc) {
    var m = ringDim(rb), hh = m.t / 2, s = '';
    s += E(cx, yc + hh + .8, m.ro, m.ry, 'fill="#000" opacity=".22"');
    s += E(cx, yc + hh, m.ro, m.ry, 'fill="#4a5466" stroke="#141920" stroke-width=".5"');
    s += R(cx - m.ro, yc - hh, 2 * m.ro, m.t, 'fill="url(#' + p + 'BkStD)"');
    s += '<path d="M' + r1(cx - m.ro) + ' ' + r1(yc - hh) + ' V' + r1(yc + hh) + ' M' + r1(cx + m.ro) + ' ' + r1(yc - hh) + ' V' + r1(yc + hh) + '" stroke="#141920" stroke-width=".5" fill="none"></path>';
    s += E(cx, yc - hh, m.ro, m.ry, 'fill="url(#' + p + 'BkRing)" stroke="#141920" stroke-width=".5"');
    s += E(cx, yc - hh, m.ri, m.iy, 'fill="#0b1018" opacity=".55" stroke="#141920" stroke-width=".5"');
    return s;
  }
  /* height the ring occupies above / below its centre (for placing it on a surface) */
  function ringHalf(rb) { var m = ringDim(rb); return m.t / 2 + m.ry; }

  /* ------------------------------------------------------------ gas bottle
     seamless shell, barrel half-width R between y0 + sh and y1 - sh, tapered shoulders to necks rn */
  function gasPaths(g) {
    var cx = g.cx, Rr = g.R, rn = g.rn, y0 = g.y0, y1 = g.y1, sh = g.sh, w = g.wall || Math.max(3, Rr * 0.12), nk = g.nk || Math.max(6, sh * 0.3);
    var f = function (v) { return r1(v); };
    var path = function (R0, rN, inset) {
      var a = y0 + nk + inset * .4, b = y1 - nk - inset * .4, t0 = y0 + sh, t1 = y1 - sh;
      return 'M' + f(cx - rN) + ',' + f(y0) + ' L' + f(cx + rN) + ',' + f(y0) + ' L' + f(cx + rN) + ',' + f(a) +
        ' C' + f(cx + R0 * .7) + ',' + f(a + (t0 - a) * .1) + ' ' + f(cx + R0) + ',' + f(a + (t0 - a) * .4) + ' ' + f(cx + R0) + ',' + f(t0) +
        ' L' + f(cx + R0) + ',' + f(t1) + ' C' + f(cx + R0) + ',' + f(b - (b - t1) * .4) + ' ' + f(cx + R0 * .7) + ',' + f(b - (b - t1) * .1) + ' ' + f(cx + rN) + ',' + f(b) +
        ' L' + f(cx + rN) + ',' + f(y1) + ' L' + f(cx - rN) + ',' + f(y1) + ' L' + f(cx - rN) + ',' + f(b) +
        ' C' + f(cx - R0 * .7) + ',' + f(b - (b - t1) * .1) + ' ' + f(cx - R0) + ',' + f(b - (b - t1) * .4) + ' ' + f(cx - R0) + ',' + f(t1) +
        ' L' + f(cx - R0) + ',' + f(t0) + ' C' + f(cx - R0) + ',' + f(a + (t0 - a) * .4) + ' ' + f(cx - R0 * .7) + ',' + f(a + (t0 - a) * .1) + ' ' + f(cx - rN) + ',' + f(a) + ' Z';
    };
    return { outer: path(Rr, rn, 0), inner: path(Rr - w, Math.max(1.2, rn - w * .5), w) };
  }
  function gasBody(p, g) {
    var P = gasPaths(g), cx = g.cx, s = '';
    s += '<path d="' + P.outer + '" fill="url(#' + p + 'BkSt)" ' + K + ' stroke-width="1"></path>';
    if (g.cut !== false) s += '<path d="' + P.outer + '" fill="url(#' + p + 'BkHatch)" opacity=".5"></path><path d="' + P.inner + '" fill="#0a1420"></path>';
    else s += R(cx - g.R * .62, g.y0 + g.sh, Math.max(2, g.R * .12), g.y1 - g.y0 - 2 * g.sh, 'rx="2" fill="#fff" opacity=".2"');
    return s;
  }
  // hex nipple at a gas-bottle neck (thread into the neck, hex outside). dir = -1 upward, +1 downward
  function gasNipple(p, cx, y, rn, dir, len) {
    var L = len || rn * 1.6, hx = rn * 1.8, y0 = dir < 0 ? y - L : y;
    return R(cx - hx / 2 - rn * .4, y0 + L * .2, hx + rn * .8, L * .6, 'rx="1" fill="url(#' + p + 'BkStD)" ' + K + ' stroke-width=".7"') +
      R(cx - rn * .45, y0, rn * .9, L, 'fill="url(#' + p + 'BkStV)" ' + K + ' stroke-width=".5"');
  }

  /* gas bottle lying horizontally (GC balloon oven): x0 / x1 neck ends, cy axis. o.fill(lx, ly, lw, lh) returns the
     gas contents in the bottle's local frame (clipped to the inner wall); o.capR = closed far end (plugged). */
  function gasH(p, o) {
    var L = o.x1 - o.x0, g = { cx: 0, R: o.R, y0: -L / 2, y1: L / 2, rn: o.rn, sh: o.sh, wall: o.wall, cut: o.cut };
    var s = '<g transform="translate(' + r1((o.x0 + o.x1) / 2) + ' ' + r1(o.cy) + ') rotate(-90)">';
    s += gasBody(p, g);
    if (o.fill) s += '<clipPath id="' + o.clipId + '"><path d="' + gasPaths(g).inner + '"></path></clipPath><g clip-path="url(#' + o.clipId + ')">' + o.fill(-o.R, -L / 2, 2 * o.R, L) + '</g>';
    s += R(-o.R * .62, -L / 2 + o.sh, Math.max(1.5, o.R * .14), L - 2 * o.sh, 'rx="1" fill="#fff" opacity=".22"');
    if (o.plug) s += R(-o.rn - 1, L / 2, 2 * o.rn + 2, 5, 'rx="1" fill="url(#' + p + 'BkStD)" ' + K + ' stroke-width=".7"');
    return s + '</g>';
  }

  /* ------------------------------------- charging-rig bottle (showTest, StageViscSingle)
     Drawn in that rig's own frame (bore 508..662 x 152..406, top port 585,84, bottom port 585,474);
     the pages wrap it in their existing scale(0.6, 0.74) transform. o.fill = clipped bore contents,
     o.pistonOpen = the opening <g ...> tag that moves the piston, o.mix = false hides the ring. */
  var RIG = { cx: 585, rb: 77, y0: 152, y1: 406, R: 91, capR: 97, capH: 20 };
  function rigBottle(p, o) {
    var s = '', cx = 585;
    s += cage(p, cx, 132, 86, 72) + cage(p, cx, 426, 472, 72);
    // top / bottom port fittings (positions unchanged) + adaptors into the caps
    s += '<path d="M568 104 V92 Q568 84 585 84 Q602 84 602 92 V104 Z" fill="url(#' + p + 'BkStD)" ' + K + ' stroke-width="1"></path>';
    s += R(560, 104, 50, 28, 'rx="3" fill="url(#' + p + 'BkStD)" ' + K + ' stroke-width="1"');
    s += '<path d="M568 454 V466 Q568 474 585 474 Q602 474 602 466 V454 Z" fill="url(#' + p + 'BkStD)" ' + K + ' stroke-width="1"></path>';
    s += R(560, 426, 50, 28, 'rx="3" fill="url(#' + p + 'BkStD)" ' + K + ' stroke-width="1"');
    s += '<g class="bd-hit" data-bd-open="oil"' + (o.ctx ? ' data-bd-ctx="' + o.ctx + '"' : '') + '>';
    s += oilBody(p, RIG);
    s += '<g clip-path="url(#' + o.clip + ')">' + (o.fill || '') + '</g>';
    s += o.pistonOpen + (o.mix !== false ? ring(p, cx, 77, o.pistonY - ringHalf(77)) : '') + piston(p, 508, 154, o.pistonY, o.pistonH || 22) + '</g>';
    s += oilFront(p, RIG) + '</g>';
    return s;
  }

  /* --------------------------------------------------- Bottle Details pill */
  function pill(x, y, spec, o) {
    o = o || {};
    var w = o.w || 104, h = 22, s = o.s || 1;
    return '<g class="bd-pill" data-bd-open="' + spec + '"' + (o.ctx ? ' data-bd-ctx="' + o.ctx + '"' : '') + ' role="button" tabindex="0" aria-label="Bottle Details" transform="translate(' + r1(x) + ' ' + r1(y) + ') scale(' + s + ')">' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="11"></rect>' +
      '<circle cx="12" cy="11" r="5.2" fill="none" stroke-width="1.4"></circle><path d="M12 9.6 V14 M12 7.6 V7.7" stroke-width="1.5" stroke-linecap="round" fill="none"></path>' +
      '<text x="' + (w / 2 + 7) + '" y="15" text-anchor="middle">Bottle Details</text></g>';
  }

  window.BottleArt = { defs: defs, raw: raw, geo: geo, oilBody: oilBody, oilFront: oilFront, cage: cage, piston: piston, ring: ring, ringHalf: ringHalf,
    gasPaths: gasPaths, gasBody: gasBody, gasNipple: gasNipple, rigBottle: rigBottle, gasH: gasH, pill: pill };
})();
