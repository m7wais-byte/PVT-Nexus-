/* ============================================================================
   VAPS PVT Nexus — global process timing
   ONE value controls the speed of every technical process and learning
   animation in the app (field sampling, transfer, restoration, charging,
   flash, PV, DL, separator test, GC, viscosity, density ...).

     PROCESS_SPEED_MULTIPLIER = 1.0  -> original speed
     PROCESS_SPEED_MULTIPLIER = 1.7  -> every process takes 1.7x longer

   JavaScript timing uses PT(ms)  -> ms * multiplier
   CSS timing uses calc(<time> * var(--pm, 1)); --pm is set here from the same
   value, so JS timers and CSS animations always stay in step.

   Only process timing is scaled. Navigation, hover, tab switching, panel and
   modal transitions keep their original speed.
   ========================================================================= */
(function (global) {
  'use strict';
  global.PROCESS_SPEED_MULTIPLIER = 1.7;

  function m() {
    var v = Number(global.PROCESS_SPEED_MULTIPLIER);
    return (isFinite(v) && v > 0) ? v : 1;
  }
  // process time: scale a duration in ms
  global.PT = function (ms) { return ms * m(); };
  // current multiplier (read at call time)
  global.PSM = m;

  try { document.documentElement.style.setProperty('--pm', String(m())); } catch (e) {}
})(window);
