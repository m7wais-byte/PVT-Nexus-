/* ==========================================================================
   BottleArt — places the two approved sample-bottle designs on the
   procedure pages.

   Every oil sample bottle is the approved Oil Sample Bottle and every gas
   sample bottle the approved Gas Sample Bottle (equipment/bottle-draw.js,
   PBDraw — the same drawings as Bottle Details), placed with one transform
   (translate · rotate · uniform scale). Only the live state comes from the
   page: fluid fills, piston position, valve-state ring and needle lift.

     oil(p, o)   o = { x, y (bottle centre), s (scale), rot (deg),
                       flip (true: mirror left-right, so the right-angle outlets face the
                       other way; set per page, the shared drawing is unchanged),
                       inner (bore contents) | sample / drive / piston styles + extra,
                       ring (false: no mixing ring), screen (inner drawn in the
                       un-rotated screen frame), ringT / ringB, needleT / needleB,
                       bd / ctx (Bottle Details trigger) }
     oilPort(o, 'T'|'B')  world point of the side outlet of the sample-side (T)
                       or driving-side (B) right-angle valve: tubing ends here
     gas(p, o)   o = { x, y, s, rot, fillStyle, extra (drawn over the gas, inside the chamber), bd, ctx }
     gasPort(o, 'T'|'B')  world point of the end connection
     styles(g, ease)  fill / piston styles for sample fraction g (0..1) of the
                       piston stroke, in the approved bore (local units)
     defs(p)     PBDraw.defs in the template dialect (sc-camel-*); defsRaw(p)
                 for modules that build SVG strings for innerHTML
     needle(open)  style that lifts a valve needle off its seat (open 0..1)
     pill(x, y, spec, o)  "Bottle Details" button drawn in a page SVG
     stand(p, o)  laboratory support stand (Validation pages), world units:
                 o = { x (bottle axis), rodX, ground, top, clamps: [{ y, h }] (h = half
                 width gripped), rest: { y, h } (ledge under a cap), baseL, baseR }
                 -> { back (draw before the bottle), front (jaw pads, after it) }.
                 Pads only touch the sides, so bore, piston and valves stay visible.
   Drawing only: no process values here.
   ========================================================================== */
(function () {
  'use strict';

  function r2(v) { return Math.round(v * 100) / 100; }
  function D() { return window.PBDraw; }
  var CAMEL = ['patternUnits', 'patternTransform', 'gradientUnits', 'gradientTransform', 'viewBox', 'preserveAspectRatio', 'clipPathUnits', 'maskUnits'];
  function tpl(s) { CAMEL.forEach(function (a) { s = s.split(' ' + a + '=').join(' sc-camel-' + a.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }) + '='); }); return s; }
  function raw(s) { return s.replace(/sc-camel-([a-z-]+)=/g, function (m, n) { return n.replace(/-([a-z])/g, function (x, c) { return c.toUpperCase(); }) + '='; }); }
  function defs(p) { return tpl(D().defs(p)); }
  function defsRaw(p) { return D().defs(p); }

  /* approved bore: chT -226 .. chB 226, piston 46 long -> stroke 406 */
  var H = 452, TRAVEL = 406;
  function styles(g, ease) {
    var e = ease || 'calc(2.8s * var(--pm, 1)) ease';
    g = Math.max(0, Math.min(1, g));
    return {
      sample: 'transform:scaleY(' + (TRAVEL * g / H).toFixed(4) + '); transform-box:fill-box; transform-origin:top; transition:transform ' + e + ';',
      drive: 'transform:scaleY(' + ((TRAVEL * (1 - g) + 23) / H).toFixed(4) + '); transform-box:fill-box; transform-origin:bottom; transition:transform ' + e + ';',
      piston: 'transform:translateY(' + (TRAVEL * g).toFixed(1) + 'px); transition:transform ' + e + ';'
    };
  }
  function needle(open) { return 'transform:translateY(' + (-7 * Math.max(0, Math.min(1, open))).toFixed(2) + 'px); transition:transform .3s ease;'; }

  function place(o) { return 'translate(' + r2(o.x) + ' ' + r2(o.y) + ')' + (o.rot ? ' rotate(' + o.rot + ')' : '') + (o.flip ? ' scale(' + (-o.s) + ' ' + o.s + ')' : ' scale(' + o.s + ')'); }
  function bdAttrs(o) { return o.bd ? ' class="bd-hit" data-bd-open="' + o.bd + '"' + (o.ctx ? ' data-bd-ctx="' + o.ctx + '"' : '') : ''; }
  function toWorld(o, lx, ly) {
    var a = (o.rot || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    if (o.flip) lx = -lx;
    return [r2(o.x + o.s * (lx * c - ly * sn)), r2(o.y + o.s * (lx * sn + ly * c))];
  }

  function oil(p, o) {
    var inner = o.inner != null ? o.inner : D().liveInside(p, { sample: o.sample, drive: o.drive, piston: o.piston, ring: o.ring, extra: o.extra });
    if (o.screen && (o.rot || o.flip)) inner = '<g transform="' + (o.flip ? 'scale(-1 1) ' : '') + (o.rot ? 'rotate(' + (-o.rot) + ')' : '') + '">' + inner + '</g>';
    var body = D().oil(p, { view: 'cutaway', live: { inner: inner, ringT: o.ringT, ringB: o.ringB, needleT: o.needleT, needleB: o.needleB } });
    return '<g transform="' + place(o) + '"' + bdAttrs(o) + '>' + body + '</g>';
  }
  function oilPort(o, end) { return toWorld(o, 48, end === 'B' ? 281 : -281); }
  function gas(p, o) {
    return '<g transform="' + place(o) + '"' + bdAttrs(o) + '>' + D().gas(p, { view: 'cutaway', fillStyle: o.fillStyle, extra: o.extra }) + '</g>';
  }
  function gasPort(o, end) { return toWorld(o, 0, end === 'B' ? 248 : -248); }

  /* --------------------------------------------------- Bottle Details pill */
  function pill(x, y, spec, o) {
    o = o || {};
    var w = o.w || 104, h = 22, s = o.s || 1;
    return '<g class="bd-pill" data-bd-open="' + spec + '"' + (o.ctx ? ' data-bd-ctx="' + o.ctx + '"' : '') + ' role="button" tabindex="0" aria-label="Bottle Details" transform="translate(' + r2(x) + ' ' + r2(y) + ') scale(' + s + ')">' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="11"></rect>' +
      '<circle cx="12" cy="11" r="5.2" fill="none" stroke-width="1.4"></circle><path d="M12 9.6 V14 M12 7.6 V7.7" stroke-width="1.5" stroke-linecap="round" fill="none"></path>' +
      '<text x="' + (w / 2 + 7) + '" y="15" text-anchor="middle">Bottle Details</text></g>';
  }

  /* ------------------------------------------------- laboratory stand */
  function stand(p, o) {
    var x = o.x, rx = o.rodX, g = o.ground, top = o.top, K = 'stroke="#0a0e16"';
    var left = rx < x, bL = o.baseL != null ? o.baseL : Math.min(rx, x) - 34, bR = o.baseR != null ? o.baseR : Math.max(rx, x) + 34;
    var b = '', f = '';
    // heavy base plate on levelling feet
    b += '<ellipse cx="' + r2((bL + bR) / 2) + '" cy="' + r2(g - 1) + '" rx="' + r2((bR - bL) / 2 + 8) + '" ry="5" fill="rgba(0,0,0,.28)"></ellipse>';
    [bL + 10, bR - 18].forEach(function (fx) { b += '<rect x="' + r2(fx) + '" y="' + r2(g - 5) + '" width="8" height="5" rx="1" fill="#1d2430" ' + K + ' stroke-width=".6"></rect>'; });
    b += '<rect x="' + r2(bL) + '" y="' + r2(g - 15) + '" width="' + r2(bR - bL) + '" height="11" rx="3" fill="url(#' + p + 'SteelV)" ' + K + ' stroke-width="1"></rect>';
    b += '<rect x="' + r2(bL + 4) + '" y="' + r2(g - 13.5) + '" width="' + r2(bR - bL - 8) + '" height="1.6" rx=".8" fill="#fff" opacity=".35"></rect>';
    // support rod: threaded foot boss, rod, top cap
    b += '<rect x="' + r2(rx - 9) + '" y="' + r2(g - 24) + '" width="18" height="10" rx="2" fill="url(#' + p + 'SteelD)" ' + K + ' stroke-width=".8"></rect>';
    b += '<rect x="' + r2(rx - 4) + '" y="' + r2(top) + '" width="8" height="' + r2(g - 24 - top) + '" fill="url(#' + p + 'SteelD)" ' + K + ' stroke-width=".7"></rect>';
    b += '<rect x="' + r2(rx - 5.5) + '" y="' + r2(top - 4) + '" width="11" height="5" rx="2" fill="url(#' + p + 'SteelD)" ' + K + ' stroke-width=".7"></rect>';
    function arm(y, reach) {   // boss head on the rod + arm out to the bottle
      var a0 = left ? rx + 4 : x + reach, a1 = left ? x - reach : rx - 4, o2 = '';
      o2 += '<rect x="' + r2(Math.min(a0, a1)) + '" y="' + r2(y - 3) + '" width="' + r2(Math.abs(a1 - a0)) + '" height="6" rx="2.5" fill="url(#' + p + 'SteelV)" ' + K + ' stroke-width=".7"></rect>';
      o2 += '<rect x="' + r2(rx - 8) + '" y="' + r2(y - 8) + '" width="16" height="16" rx="2.5" fill="url(#' + p + 'SteelD)" ' + K + ' stroke-width=".8"></rect>';
      var kx = left ? rx - 8 : rx + 8, kd = left ? -1 : 1;     // thumb screw on the outer face of the boss
      o2 += '<rect x="' + r2(kd > 0 ? kx : kx - 6) + '" y="' + r2(y - 1.5) + '" width="6" height="3" fill="url(#' + p + 'SteelV)" ' + K + ' stroke-width=".5"></rect>';
      o2 += '<rect x="' + r2(kd > 0 ? kx + 6 : kx - 10) + '" y="' + r2(y - 5) + '" width="4" height="10" rx="1.5" fill="url(#' + p + 'Knob)" ' + K + ' stroke-width=".5"></rect>';
      return o2;
    }
    (o.clamps || []).forEach(function (c) {
      var h = c.h;
      b += arm(c.y, h + 7);
      // clamp band behind the bottle (hidden by it except at the sides)
      b += '<rect x="' + r2(x - h - 7) + '" y="' + r2(c.y - 4) + '" width="' + r2(2 * h + 14) + '" height="8" rx="3" fill="url(#' + p + 'SteelV)" ' + K + ' stroke-width=".7"></rect>';
      // jaw pads (cork-lined) touching each side + the tightening nut on the far jaw
      [-1, 1].forEach(function (sd) {
        var jx = sd < 0 ? x - h - 7 : x + h;
        f += '<rect x="' + r2(jx) + '" y="' + r2(c.y - 11) + '" width="7" height="22" rx="2.5" fill="url(#' + p + 'SteelD)" ' + K + ' stroke-width=".8"></rect>';
        f += '<rect x="' + r2(sd < 0 ? jx + 5 : jx) + '" y="' + r2(c.y - 9) + '" width="2" height="18" fill="#a07a4a" opacity=".9"></rect>';
      });
      var nx = left ? x + h + 7 : x - h - 7;
      f += '<rect x="' + r2(left ? nx : nx - 7) + '" y="' + r2(c.y - 4) + '" width="7" height="8" rx="1.5" fill="url(#' + p + 'Knob)" ' + K + ' stroke-width=".6"></rect>';
    });
    if (o.rest) {   // ledge the lower cap sits on: fork plate (behind the valve) with lips each side
      var r = o.rest, h2 = r.h;
      b += arm(r.y + 3, h2 + 8);
      b += '<rect x="' + r2(x - h2 - 8) + '" y="' + r2(r.y) + '" width="' + r2(2 * h2 + 16) + '" height="6" rx="2" fill="url(#' + p + 'SteelV)" ' + K + ' stroke-width=".8"></rect>';
      [-1, 1].forEach(function (sd) {
        var lx = sd < 0 ? x - h2 - 8 : x + h2 + 4;
        f += '<rect x="' + r2(lx) + '" y="' + r2(r.y - 7) + '" width="4" height="13" rx="1.5" fill="url(#' + p + 'SteelD)" ' + K + ' stroke-width=".7"></rect>';
      });
    }
    return { back: b, front: f };
  }

  window.BottleArt = { defs: defs, defsRaw: defsRaw, tpl: tpl, raw: raw, styles: styles, needle: needle, H: H, TRAVEL: TRAVEL,
    oil: oil, oilPort: oilPort, gas: gas, gasPort: gasPort, toWorld: toWorld, pill: pill, stand: stand };
})();
