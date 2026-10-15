/* ============================================================================
   QcWaterSim — Validation > Step 3 Sample Water Drainage, settling model (2026-09-30)

   Oil bottle, drainage orientation (hydraulic water above the floating piston,
   oil sample below it). The sample's free water (Main.bottleModel FREEW_CC = 30 cc,
   existing value) starts as liquid droplets dispersed through the oil and settles
   under gravity during a simulated 24 h period.

   Pure function of the settling clock k (0..1): the whole trajectory table is
   pre-computed once per bore geometry with a fixed seed, so pause / resume /
   restart / instant replay (PCLK.flush) always give the same picture.

   Illustrative representation only (not a calculation):
     * droplet count / sizes are visual; the represented water volume is the sum
       of r^3 and always equals the existing 30 cc (conserved through merging and
       settling: water leaving the dispersion is added to the bottom layer);
     * settling velocity ~ r^2 (Stokes), so larger droplets fall faster;
     * droplets that touch coalesce into one larger droplet (volumes added);
     * a droplet reaching the oil-water interface joins the free-water layer.
   ========================================================================= */
(function (global) {
  'use strict';
  var N_BASE = 36, N_PAIR = 7, F = 600, SEED = 20260930;
  var R_MIN = 1.85, R_MAX = 2.7, END = 0.92;
  var cache = {};

  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* x0..x1 bore walls, top = underside of the piston, bot = bore bottom,
     layerMax = height of the fully settled 30 cc free-water layer (px) */
  function build(x0, x1, top, bot, layerMax, K) {
    var R = rng(SEED), d = [], i, H = bot - top;
    var place = function (r) { return x0 + r + 2 + (x1 - x0 - 2 * r - 4) * R(); };
    /* no two droplets touch at the start (rejection sampling), so merging only
       happens while they settle */
    var free = function (x, y, r) {
      for (var j = 0; j < d.length; j++) {
        var o = d[j], ro = Math.cbrt(o.v), dx = o.bx - x, dy = o.y - y;
        if (dx * dx + dy * dy < (ro + r + 2.2) * (ro + r + 2.2)) return false;
      }
      return true;
    };
    for (i = 0; i < N_BASE; i++) {
      var r = R_MIN + (R_MAX - R_MIN) * Math.pow(R(), 1.3), x, y, tries = 0;
      do { x = place(r); y = top + r + 3 + (H - layerMax - 2 * r - 10) * R(); } while (!free(x, y, r) && ++tries < 60);
      d.push({ bx: x, y: y, v: r * r * r, ph: R() * 6.283, on: true });
    }
    /* coalescence pairs: a larger droplet placed just above a smaller one in the
       same vertical path - the larger one falls faster and catches it */
    for (i = 0; i < N_PAIR; i++) {
      var ra = R_MAX - 0.35 * R(), rb = R_MIN + 0.3 * R();
      var bx, ya, yb, n2 = 0;
      do { bx = place(ra); ya = top + ra + 4 + (H * 0.85 - layerMax - 20) * R(); yb = ya + 9 + 12 * R(); }
      while (!(free(bx, ya, ra) && free(bx, yb, rb)) && ++n2 < 60);
      d.push({ bx: bx, y: ya, v: ra * ra * ra, ph: R() * 6.283, on: true });
      d.push({ bx: bx + (R() - 0.5) * 1.2, y: yb, v: rb * rb * rb, ph: R() * 6.283, on: true });
    }
    var total = 0; d.forEach(function (o) { total += o.v; });
    /* terminal velocity K r^2 (K calibrated in calib() so the last droplet
       reaches the interface at END of the period) */
    var frames = [], coll = 0, dt = 1 / F, last = 0;
    for (var f = 0; f <= F; f++) {
      var t = f * dt, lay = layerMax * coll / total, iface = bot - lay;
      if (f > 0) {
        d.forEach(function (o) {
          if (!o.on) return;
          var r = Math.cbrt(o.v);
          o.y += K * r * r * dt;
        });
        /* coalescence on contact (volumes added, position volume-weighted) */
        for (var a = 0; a < d.length; a++) {
          var A = d[a]; if (!A.on) continue;
          for (var b = a + 1; b < d.length; b++) {
            var B = d[b]; if (!B.on) continue;
            var rA = Math.cbrt(A.v), rB = Math.cbrt(B.v);
            var xa = A.bx + 0.6 * Math.sin(A.ph + 7 * t), xb = B.bx + 0.6 * Math.sin(B.ph + 7 * t);
            var dx = xa - xb, dy = A.y - B.y;
            if (dx * dx + dy * dy < (rA + rB) * (rA + rB) * 0.8) {
              var big = A.v >= B.v ? A : B, sm = big === A ? B : A, v = A.v + B.v;
              big.bx = (A.bx * A.v + B.bx * B.v) / v;
              big.y = (A.y * A.v + B.y * B.v) / v;
              big.v = v; sm.on = false; sm.v = 0;
              if (big !== A) break;
            }
          }
        }
        /* droplets reaching the interface join the free-water layer */
        d.forEach(function (o) {
          if (!o.on) return;
          var r = Math.cbrt(o.v);
          if (o.y + r >= iface) { coll += o.v; o.on = false; o.v = 0; }
        });
      }
      var fr = [];
      if (f < F) d.forEach(function (o) {
        if (!o.on) return;
        var r = Math.cbrt(o.v);
        fr.push(o.bx + 0.6 * Math.sin(o.ph + 7 * t), Math.min(o.y, bot - layerMax * coll / total - r), r);
      });
      frames.push({ p: fr, c: f < F ? Math.min(1, coll / total) : 1 });
      if (fr.length && f < F) last = f;
    }
    return { frames: frames, n: d.length, last: last };
  }
  /* choose K so the slowest droplet settles at END of the 24 h period */
  function calib(x0, x1, top, bot, layerMax) {
    var H = bot - top - layerMax, lo = H * 0.2, hi = H * 4, T = null;
    for (var i = 0; i < 16; i++) {
      var mid = (lo + hi) / 2;
      T = build(x0, x1, top, bot, layerMax, mid);
      if (T.last > END * F) lo = mid; else hi = mid;
    }
    return build(x0, x1, top, bot, layerMax, hi);
  }

  function f1(v) { return Math.round(v * 10) / 10; }

  /* k: settling clock 0..1 -> droplet markup (two path strings) + collected share */
  function state(k, g) {
    var key = [g.x0, g.x1, Math.round(g.top * 2), g.bot, Math.round(g.layerMax * 10)].join('|');
    var T = cache[key] || (cache[key] = calib(g.x0, g.x1, g.top, g.bot, g.layerMax));
    var fr = T.frames[Math.max(0, Math.min(F, Math.round((k || 0) * F)))];
    var dp = '', hp = '', p = fr.p;
    for (var i = 0; i < p.length; i += 3) {
      var x = p[i], y = p[i + 1], r = p[i + 2];
      dp += 'M' + f1(x - r) + ' ' + f1(y) + 'a' + f1(r) + ' ' + f1(r) + ' 0 1 0 ' + f1(2 * r) + ' 0a' + f1(r) + ' ' + f1(r) + ' 0 1 0 ' + f1(-2 * r) + ' 0Z';
      var hr = r * 0.34, hx = x - r * 0.36, hy = y - r * 0.36;
      hp += 'M' + f1(hx - hr) + ' ' + f1(hy) + 'a' + f1(hr) + ' ' + f1(hr) + ' 0 1 0 ' + f1(2 * hr) + ' 0a' + f1(hr) + ' ' + f1(hr) + ' 0 1 0 ' + f1(-2 * hr) + ' 0Z';
    }
    return { drops: dp, hi: hp, collected: fr.c, count: p.length / 3 };
  }

  /* drainage master clock dk 0..1 -> valves and drained share of the free water.
     wv: water-side (pump) valve, sv: bottom sample valve (0 closed .. 1 open),
     w : drained share 0..1 (x 30 cc) - flows only while the sample valve is fully open;
         the sample valve closes as soon as w reaches 1, before any oil reaches the outlet. */
  function lin(k, a, b) { return Math.min(1, Math.max(0, (k - a) / (b - a))); }
  function drain(dk) {
    dk = dk || 0;
    var x = lin(dk, FLOW[0], FLOW[1]);
    return {
      wv: lin(dk, 0, 0.06) * (1 - lin(dk, 0.93, 0.98)),
      sv: lin(dk, 0.05, FLOW[0]) * (1 - lin(dk, FLOW[1], 0.94)),
      w: (1 - Math.cos(Math.PI * x)) / 2,
      flow: dk > FLOW[0] && dk < FLOW[1]
    };
  }
  var FLOW = [0.12, 0.88];

  /* SETTLE_MS / DRAIN_MS are process time (x PROCESS_SPEED_MULTIPLIER via PT()):
     1.7 -> settling ~17 s for the simulated 24 h, drainage ~11 s */
  global.QcWaterSim = { state: state, drain: drain, HOURS: 24, SETTLE_MS: 10000, DRAIN_MS: 6500 };
})(window);
