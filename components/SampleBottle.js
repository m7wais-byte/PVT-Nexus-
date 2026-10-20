/* ==========================================================================
   SampleBottle — Sampling pages (showModule01) and RecombSim shells.

   Draws the approved Oil Sample Bottle / Gas Sample Bottle through
   components/BottleArt.js. Callers keep their old placement values
   (x, y = former top-port point, s = former scale); the bottle is centred
   where the former body was and scaled so its bore spans the former bore
   height. Tubing must end at ports(o) (side outlets of the right-angle
   valves for oil, end connections for gas).

     ${SampleBottle.defs('wb')}                       -> inside <defs>
     ${SampleBottle.markup({ p:'wb', x, y, s, sample:'{{ a }}', buffer:'{{ b }}', piston:'{{ c }}' })}
     mode:'gas' -> Gas Sample Bottle, sample = style of the gas fill
     styles(g)  -> fill / piston styles (BottleArt.styles), buffer = driving fluid
     Direct placement (2026-10-20): cx, cy = bottle centre, k = approved-drawing scale, rot, mirror
     (mirror: valve outlets on the left) - used by the Wellhead / Separator sampling scenes.
   ========================================================================== */
(function () {
  var K_OIL = 204 / 452, K_GAS = 0.62;      // old bore height -> approved bore height; gas bottle a little shorter
  function frame(o) {
    var gas = o.mode === 'gas';
    if (o.k) return { x: o.cx, y: o.cy, s: o.k, rot: o.rot || 0, mirror: !!o.mirror };
    return { x: o.x, y: o.y + 171.5 * o.s, s: +(o.s * (gas ? K_GAS * 343 / 496 : K_OIL)).toFixed(4), rot: o.rot || 0 };
  }
  function defs(p) { return window.BottleArt.defs(p); }
  function markup(o) {
    var A = window.BottleArt, f = frame(o);
    var bd = o.bd ? { bd: o.bd, ctx: o.bdCtx } : {};
    if (o.mode === 'gas') return A.gas(o.p, Object.assign(f, bd, { fillStyle: o.sample || '' }));
    return A.oil(o.p, Object.assign(f, bd, { sample: o.sample || '', drive: o.buffer || '', piston: o.piston || '', ring: o.mix, inner: o.inner,
      ringT: o.ringT, ringB: o.ringB, needleT: o.needleT, needleB: o.needleB, screen: o.screen }));
  }
  function ports(o) {
    var A = window.BottleArt, f = frame(o);
    return o.mode === 'gas' ? { T: A.gasPort(f, 'T'), B: A.gasPort(f, 'B') } : { T: A.oilPort(f, 'T'), B: A.oilPort(f, 'B') };
  }
  function styles(g, ease) { var s = window.BottleArt.styles(g, ease); s.buffer = s.drive; return s; }
  window.SampleBottle = { defs: defs, markup: markup, ports: ports, frame: frame, styles: styles };
})();
