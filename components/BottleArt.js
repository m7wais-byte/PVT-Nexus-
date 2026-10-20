/* ==========================================================================
   BottleArt — places the two approved sample-bottle designs on the
   procedure pages.

   Every oil sample bottle is the approved Oil Sample Bottle and every gas
   sample bottle the approved Gas Sample Bottle (equipment/bottle-draw.js,
   PBDraw — the same drawings as Bottle Details), placed with one transform
   (translate · rotate · uniform scale). Only the live state comes from the
   page: fluid fills, piston position, valve-state ring and needle lift.

     oil(p, o)   o = { x, y (bottle centre), s (scale), rot (deg),
                       inner (bore contents) | sample / drive / piston styles + extra,
                       ring (false: no mixing ring), screen (inner drawn in the
                       un-rotated screen frame), ringT / ringB, needleT / needleB,
                       mirror (true: valve outlets on the other side - an inverted
                       bottle with rot 180 + mirror keeps its outlets on the right;
                       the cutaway carries no text, so nothing reads mirrored),
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

  function place(o) { return 'translate(' + r2(o.x) + ' ' + r2(o.y) + ')' + (o.rot ? ' rotate(' + o.rot + ')' : '') + ' scale(' + (o.mirror ? -o.s + ' ' + o.s : o.s) + ')'; }
  function bdAttrs(o) { return o.bd ? ' class="bd-hit" data-bd-open="' + o.bd + '"' + (o.ctx ? ' data-bd-ctx="' + o.ctx + '"' : '') : ''; }
  function toWorld(o, lx, ly) {
    var a = (o.rot || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    if (o.mirror) lx = -lx;
    return [r2(o.x + o.s * (lx * c - ly * sn)), r2(o.y + o.s * (lx * sn + ly * c))];
  }

  function oil(p, o) {
    var inner = o.inner != null ? o.inner : D().liveInside(p, { sample: o.sample, drive: o.drive, piston: o.piston, ring: o.ring, extra: o.extra });
    if (o.screen && (o.rot || o.mirror)) inner = '<g transform="' + (o.mirror ? 'scale(-1 1) ' : '') + 'rotate(' + (-(o.rot || 0)) + ')">' + inner + '</g>';
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

  window.BottleArt = { defs: defs, defsRaw: defsRaw, tpl: tpl, raw: raw, styles: styles, needle: needle, H: H, TRAVEL: TRAVEL,
    oil: oil, oilPort: oilPort, gas: gas, gasPort: gasPort, toWorld: toWorld, pill: pill };
})();
