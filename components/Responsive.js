/* ============================================================================
   PVT Nexus — Responsive helper (2026-10-30)
   Layout only: it never touches procedure state, values, valves or animations.

   * html classes  vp-phone (≤ 760 px) · vp-tablet (761–1100 px) · vp-desk,
                   vp-stack (the procedure pages stack equipment above controls:
                   phone, and tablet in portrait) · vp-portrait / vp-landscape.
   * --app-h       the real visible height (window.innerHeight), so a mobile
                   browser bar that appears or hides re-sizes the page.
   * equipment zoom: in stacked layouts the main drawing of every equipment
                   frame (.lab-schem, [data-rz-frame], .bhs-scene) is marked
                   [data-rz-svg]. It is shown at full width with its own aspect
                   ratio (nothing clipped) and gets a small zoom bar
                   (fit · − · +). Zoomed drawings pan inside their frame, so the
                   page itself never scrolls sideways.
   The DC runtime only rewrites attributes bound in a template; the data-*
   attributes and the zoom bar added here are never bound, so re-renders keep them.
   ========================================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var STEPS = [1, 1.5, 2, 3];
  var FRAMES = '.lab-schem, [data-rz-frame], .bhs-scene';

  function mode() {
    var w = window.innerWidth, h = window.innerHeight;
    var phone = w <= 760, tablet = !phone && w <= 1100, portrait = h >= w;
    var stack = phone || (tablet && portrait);
    root.classList.toggle('vp-phone', phone);
    root.classList.toggle('vp-tablet', tablet);
    root.classList.toggle('vp-desk', !phone && !tablet);
    root.classList.toggle('vp-stack', stack);
    root.classList.toggle('vp-portrait', portrait);
    root.classList.toggle('vp-landscape', !portrait);
    root.style.setProperty('--app-h', h + 'px');
    return stack;
  }

  /* the drawing of a frame: the largest top-level <svg> (not an icon, not nested in another svg) */
  function mainSvg(frame) {
    var best = null, area = 0;
    frame.querySelectorAll('svg').forEach(function (s) {
      if (s.parentElement && s.parentElement.closest('svg')) return;
      if (s.closest('.rz-bar')) return;
      if (s.parentElement.closest(FRAMES) !== frame) return;   // belongs to a nested frame
      var r = s.getBoundingClientRect(), a = r.width * r.height;
      if (a > area && r.width > 120) { area = a; best = s; }
    });
    return best;
  }

  var ICON = {
    fit: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  function bar(frame) {
    var b = document.createElement('div');
    b.className = 'rz-bar'; b.setAttribute('role', 'group'); b.setAttribute('aria-label', 'Equipment zoom');
    b.innerHTML = '<button type="button" data-rz="fit" aria-label="Fit drawing to width" title="Fit">' + ICON.fit + '</button>'
      + '<button type="button" data-rz="-" aria-label="Zoom out" title="Zoom out">' + ICON.minus + '</button>'
      + '<span class="rz-val" aria-live="polite">100%</span>'
      + '<button type="button" data-rz="+" aria-label="Zoom in" title="Zoom in">' + ICON.plus + '</button>';
    b.addEventListener('click', function (e) {
      var t = e.target.closest('[data-rz]'); if (!t) return;
      var z = +(frame.getAttribute('data-rz-z') || 1), i = STEPS.indexOf(z);
      if (t.dataset.rz === 'fit') z = 1;
      else if (t.dataset.rz === '+') z = STEPS[Math.min(STEPS.length - 1, i + 1)];
      else z = STEPS[Math.max(0, i - 1)];
      setZoom(frame, z, true);
    });
    return b;
  }
  function setZoom(frame, z, keepCentre) {
    var sc = frame, cx = sc.scrollLeft + sc.clientWidth / 2, cy = sc.scrollTop + sc.clientHeight / 2;
    var old = +(frame.getAttribute('data-rz-z') || 1);
    frame.setAttribute('data-rz-z', z);
    frame.style.setProperty('--rz', z);
    frame.classList.toggle('rz-zoomed', z > 1);
    var v = frame.querySelector('.rz-val'); if (v) v.textContent = Math.round(z * 100) + '%';
    if (keepCentre && old) { sc.scrollLeft = cx * z / old - sc.clientWidth / 2; sc.scrollTop = cy * z / old - sc.clientHeight / 2; }
  }

  function apply() {
    var stack = mode();
    document.querySelectorAll(FRAMES).forEach(function (frame) {
      if (!frame.getClientRects().length) return;
      var on = stack && !frame.hasAttribute('data-rz-off') && !frame.querySelector(FRAMES);   // the inner frame zooms
      frame.classList.toggle('rz-on', on);
      var cur = frame.querySelector('[data-rz-svg]'), s = on ? (cur && cur.isConnected ? cur : mainSvg(frame)) : null;
      if (cur && cur !== s) cur.removeAttribute('data-rz-svg');
      if (s && s !== cur) s.setAttribute('data-rz-svg', '');
      var b = frame.querySelector(':scope > .rz-bar');
      if (on && s && !b) { frame.insertBefore(bar(frame), frame.firstChild); setZoom(frame, +(frame.getAttribute('data-rz-z') || 1), false); }
      if ((!on || !s) && b) { b.remove(); setZoom(frame, 1, false); }
    });
  }

  var queued = false;
  function schedule() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; apply(); }); }
  mode();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  document.addEventListener('DOMContentLoaded', function () {
    var app = document.getElementById('app') || document.body;
    /* screens mount and unmount with navigation: re-check after DOM changes (child lists only, not attributes,
       so animations that rewrite attributes every frame cost nothing here) */
    new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
    schedule();
  });
  window.PVTResponsive = { apply: apply };
})();
