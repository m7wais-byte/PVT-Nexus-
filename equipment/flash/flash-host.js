/* FlashHost — binds the shared flash-equipment scene (equipment/flash/scene.js) to a procedure page.

   A page places  <div class="fx-host" data-fx="Comp:arg"></div>  (or an SVG <g class="fx-host" ...> for an
   inline drawing). Comp is the live DC component (PC.LIVE registry) and must implement fxView(arg), returning
     { mode, key?, opt?, V, vb? }   or null to leave the host empty.
   mode / opt go to Scene.build; V is the view model for this frame (the page's own state, never new values);
   vb (div hosts) is the target viewBox, eased so a stage can focus on the flask without a jump.
   The animation clock is the pausable process clock (PCLK), so Pause freezes the drawing with the readings.
   No simulation runs here: the page's own timers drive its state. */
(function () {
  'use strict';
  var EASE = 0.12;
  function clockS() { return (window.PCLK && PCLK.now ? PCLK.now() : performance.now()) / 1000; }
  function owner(spec) {
    var i = spec.indexOf(':'), name = i < 0 ? spec : spec.slice(0, i), arg = i < 0 ? undefined : spec.slice(i + 1);
    var o = (window.PC && PC.LIVE && PC.LIVE[name]) || null;
    return o && typeof o.fxView === 'function' ? { o: o, arg: arg } : null;
  }
  function view(spec) { var w = owner(spec); if (!w) return null; try { return w.o.fxView(w.arg); } catch (e) { console.error(e); return null; } }
  function sameVb(a, b) { for (var i = 0; i < 4; i++) if (Math.abs(a[i] - b[i]) > 0.5) return false; return true; }

  function frame() {
    var hosts = document.querySelectorAll('.fx-host[data-fx]');
    for (var k = 0; k < hosts.length; k++) {
      var h = hosts[k], v = view(h.getAttribute('data-fx'));
      if (!v) { if (h.__fx) { h.innerHTML = ''; h.__fx = null; h.__fxKey = null; } continue; }
      var key = v.key || v.mode, opt = v.opt || {};
      if (!h.__fx || h.__fxKey !== key || !h.firstChild) {
        h.__fx = Scene.build(h, v.mode, opt); h.__fxKey = key;
        h.__vb = !opt.inline && v.vb ? v.vb.slice() : null;
        if (h.__vb) h.firstChild.setAttribute('viewBox', h.__vb.join(' '));
      }
      v.V.t = clockS();
      h.__fx.update(v.V);
      if (h.__vb && v.vb && !sameVb(h.__vb, v.vb)) {
        for (var i = 0; i < 4; i++) h.__vb[i] += (v.vb[i] - h.__vb[i]) * EASE;
        if (sameVb(h.__vb, v.vb)) h.__vb = v.vb.slice();
        h.firstChild.setAttribute('viewBox', h.__vb.map(function (x) { return x.toFixed(1); }).join(' '));
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.FlashHost = { view: view };
})();
