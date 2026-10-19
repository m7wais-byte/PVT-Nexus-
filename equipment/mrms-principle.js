/* ==========================================================================
   PVT Nexus — SPMC Operating Principle player (MRPrinciple)

   Equipment-principle demonstration only: not connected to the sampling or
   validation workflows. Four stages (EQUIPMENT.spmc.stages), ~8.5 s each:
     0 Ready to capture · 1 Controlled sample filling · 2 Sample isolation ·
     3 Pressure compensation during retrieval
   The chamber is the MRDraw.spmc section drawn horizontally (inlet on the left).
   Volumes are lengths along a constant bore, so the sample that enters equals
   the fluid displaced behind the sample piston, and the sample contraction on
   retrieval equals the nitrogen expansion. Indicators are qualitative: no
   pressures, temperatures or volumes are given. Contraction is exaggerated.

   mount(stageEl, explainEl, opts) -> { play, pause, toggle, go, next, prev, reset, labels, state, destroy }
   Rendering runs only while playing; destroy() stops it and clears the DOM.
   ========================================================================== */
(function () {
  'use strict';

  var DUR = 8500;                                       // ms per stage
  var K = 1.35, TX = 640, TY = 196;                     // chamber: local (x, y) -> (TX + K*y, TY - K*x)
  var P_SAT = 0.42, P_RES = 0.62;                       // qualitative pressure scale positions

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function cl(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { v = cl(v); return v * v * (3 - 2 * v); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function hex(a, b, t) {
    var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), o = '#';
    [16, 8, 0].forEach(function (s) { var v = Math.round(mix((A >> s) & 255, (B >> s) & 255, t)); o += (v < 16 ? '0' : '') + v.toString(16); });
    return o;
  }

  /* state of the chamber and the indicators at stage i, progress p (0..1), clock t (s) */
  function frame(i, p, t) {
    var D = window.MRDraw.STATES, f = {
      sp: D.ready.sp, np: D.ready.np, iso: 0, out: 0, act: 0, chv: 0, temp: 1, pS: null, pU: null, clean: 1,
      main: 1, fin: 0, fout: 0, press: 0, loc: 'Downhole · at sampling depth', t: t
    };
    if (i === 0) {
      f.clean = ease(p / .85);
    } else if (i === 1) {
      var o = ease(p / .08), fill = ease((p - .1) / .8), done = ease((p - .9) / .1);
      f.chv = f.iso = f.out = o;
      f.sp = mix(D.ready.sp, D.filled.sp, fill);
      f.fin = o * (1 - done); f.fout = f.fin; f.main = 1 - .7 * o;
      f.pS = P_RES;
    } else if (i === 2) {
      var shut = 1 - ease((p - .05) / .2);
      f.sp = D.filled.sp; f.np = D.filled.np;
      f.chv = f.iso = shut; f.out = 1 - ease((p - .25) / .15);
      f.act = ease((p - .5) / .12); f.press = ease((p - .62) / .15);
      f.pS = mix(P_RES, .82, ease((p - .62) / .23)); f.main = .3;
    } else {
      var c = ease((p - .05) / .85), d = (D.filled.sp - D.retrieved.sp) * c;
      f.sp = D.filled.sp - d; f.np = D.filled.np - d;
      f.act = 1; f.press = 1; f.temp = 1 - c; f.main = 0;
      f.pS = mix(.82, .72, c); f.pU = mix(P_RES, .3, c);
      f.loc = c < .98 ? 'Pulling out of the well' : 'At surface';
    }
    return f;
  }

  /* --------------------------------------------------------------- drawing */
  function X(y) { return TX + K * y; }
  function Y(x) { return TY - K * x; }

  function figure(ns, i, f, labels) {
    var G = window.MRDraw.G, COL = window.MRDraw.COL, s = '';
    // temperature halo behind the chamber (hot -> cool)
    var halo = hex('#e7752e', '#4d9dff', 1 - f.temp);
    s += '<ellipse cx="' + X(-7) + '" cy="' + TY + '" rx="' + (K * 360) + '" ry="74" fill="' + halo + '" opacity="' + r1(.10 + .05 * Math.abs(f.temp - .5) * 2) + '"/>';
    // MDT flowline (vertical) + branch with the MRMS chamber valve into the chamber inlet
    var fx = 104, ix = X(G.top), fluid = hex('#8a8173', COL.res.sw, f.clean);
    s += '<rect x="' + (fx - 7) + '" y="60" width="14" height="262" rx="3" fill="#5c6878" stroke="#0a0e16" stroke-width=".8"/>';
    s += '<rect x="' + (fx - 3.5) + '" y="60" width="7" height="262" fill="' + fluid + '"/>';
    s += '<rect x="' + fx + '" y="' + (TY - 6) + '" width="' + (ix - fx) + '" height="12" fill="#5c6878" stroke="#0a0e16" stroke-width=".8"/>';
    s += '<rect x="' + fx + '" y="' + (TY - 3) + '" width="' + (ix - fx) + '" height="6" fill="' + (f.chv > .5 || i > 1 ? COL.res.sw : '#0b1018') + '"/>';
    if (f.main > .02) for (var k = 0; k < 6; k++) {                  // flow along the tool flowline (toward the pumpout)
      var yy = 66 + ((t2(f) * 34 + k * 50) % 250);
      s += '<path d="M' + (fx - 3) + ' ' + r1(yy - 3) + ' L' + fx + ' ' + r1(yy + 1) + ' L' + (fx + 3) + ' ' + r1(yy - 3) + '" fill="none" stroke="#fff" stroke-width="1.3" opacity="' + r1(.7 * f.main) + '"/>';
    }
    if (f.fin > .02) for (var j = 0; j < 3; j++) {                   // into the branch
      var xx = fx + 10 + ((t2(f) * 30 + j * 22) % (ix - fx - 14));
      s += '<path d="M' + r1(xx - 3) + ' ' + (TY - 3) + ' L' + r1(xx + 1) + ' ' + TY + ' L' + r1(xx - 3) + ' ' + (TY + 3) + '" fill="none" stroke="#fff" stroke-width="1.3" opacity="' + r1(f.fin) + '"/>';
    }
    // MRMS chamber valve on the branch (function block)
    var vx = (fx + ix) / 2;
    s += '<g transform="translate(' + vx + ' ' + TY + ') rotate(90) scale(.55)">' + fnValve(f.chv, COL) + '</g>';
    // the chamber
    var st = { sp: f.sp, np: f.np, iso: f.iso, out: f.out, act: f.act };
    s += '<g transform="translate(' + TX + ' ' + TY + ') rotate(-90) scale(' + K + ')">' +
      window.MRDraw.spmc(ns, { view: 'cutaway', st: st, fx: { in: f.fin, outF: f.fout, press: f.press, t: f.t } }) + '</g>';
    // outlet destination (not published)
    if (f.fout > .02 || i === 1) s += '<text class="lab-s" x="' + X(G.outY) + '" y="' + (Y(-G.R) + 70) + '" text-anchor="middle" opacity="' + r1(Math.max(.55, f.fout)) + '">to a controlled exit · route not published</text>';
    if (labels) s += figLabels(f, G, fx, vx, ix);
    return s;
  }
  function t2(f) { return f.t || 0; }
  function fnValve(state, COL) {
    var on = state > .5, col = on ? COL.open : COL.shut;
    var o = '<rect x="-12" y="-14" width="24" height="28" rx="2.5" fill="#1a2029" stroke="' + COL.fn + '" stroke-width="1.4" stroke-dasharray="3 2"/>';
    o += '<path d="M-6.5 -7 H6.5 L-6.5 7 H6.5 Z" fill="' + col + '" stroke="#0a0e16" stroke-width=".5"/>';
    if (!on) o += '<rect x="-8" y="-1" width="16" height="2" fill="#0a0e16"/>';
    return o;
  }
  function figLabels(f, G, fx, vx, ix) {
    var items = [
      { x: X(-264), y: Y(12), n: 'Sample isolation', d: f.iso > .5 ? 'open' : 'closed · self-closing' },
      { x: X((G.chT + f.sp) / 2), y: Y(10), n: 'Reservoir fluid', d: 'sample', hide: f.sp - G.chT < 24 },
      { x: X(f.sp + 25), y: Y(17), n: 'Sample piston', d: 'with agitation piston' },
      { x: X((f.sp + 40 + f.np) / 2), y: Y(10), n: 'Compensating fluid', d: 'synthetic oil buffer' },
      { x: X(f.np + 13), y: Y(17), n: 'Nitrogen piston', d: 'floating' },
      { x: X((f.np + 26 + G.chB) / 2), y: Y(10), n: 'Nitrogen charge', d: f.act > .5 ? 'acting on the sample' : 'preset · isolated' },
      { x: X(264), y: Y(12), n: 'Charge activation', d: f.act > .5 ? 'released' : 'held' }
    ].filter(function (a) { return !a.hide; });
    var o = '', tx = '';
    items.forEach(function (a, k) {
      var ly = 58 + (k % 2) * 34;
      o += '<path class="lead" d="M' + r1(a.x) + ' ' + r1(a.y) + ' V' + (ly + 18) + '"/><circle class="dot" cx="' + r1(a.x) + '" cy="' + r1(a.y) + '" r="2.2"/>';
      tx += '<text class="lab-n" x="' + r1(a.x) + '" y="' + ly + '" text-anchor="middle">' + esc(a.n) + '</text><text class="lab-s" x="' + r1(a.x) + '" y="' + (ly + 13) + '" text-anchor="middle">' + esc(a.d) + '</text>';
    });
    // below: flowline, chamber valve, outlet
    var bo = Y(-G.R - 7);
    tx += '<text class="lab-n" x="' + (fx - 12) + '" y="340" text-anchor="start">MDT flowline</text><text class="lab-s" x="' + (fx - 12) + '" y="353" text-anchor="start">' + (f.clean < .98 ? 'cleanup in progress' : 'clean formation fluid') + '</text>';
    o += '<path class="lead" d="M' + vx + ' ' + (TY + 9) + ' V' + (TY + 40) + ' H' + (vx + 6) + '"/>';
    tx += '<text class="lab-n" x="' + (vx + 10) + '" y="' + (TY + 44) + '" text-anchor="start">Chamber valve</text><text class="lab-s" x="' + (vx + 10) + '" y="' + (TY + 57) + '" text-anchor="start">MRMS · ' + (f.chv > .5 ? 'open' : 'closed') + '</text>';
    o += '<path class="lead" d="M' + X(G.outY) + ' ' + r1(bo + 6) + ' V' + r1(bo + 34) + '"/>';
    tx += '<text class="lab-n" x="' + X(G.outY) + '" y="' + r1(bo + 48) + '" text-anchor="middle">Displacement outlet</text>';
    return o + tx;
  }

  /* qualitative indicators: temperature, pressure, relative volumes */
  function gauges(i, f) {
    var D = window.MRDraw.STATES, COL = window.MRDraw.COL, s = '', y0 = 392, W = 340, gx = [40, 430, 820];
    function track(x, y, w) { return '<rect class="mp-track" x="' + x + '" y="' + y + '" width="' + w + '" height="10" rx="5"/>'; }
    function head(x, n, d) { return '<text class="lab-n" x="' + x + '" y="' + y0 + '">' + esc(n) + '</text><text class="lab-s" x="' + x + '" y="' + (y0 + 14) + '">' + esc(d) + '</text>'; }
    // temperature
    var x = gx[0], ty = y0 + 40;
    s += head(x, 'Sample temperature', f.loc);
    s += '<rect x="' + x + '" y="' + ty + '" width="' + W + '" height="10" rx="5" fill="url(#mpTemp)" opacity=".85"/>';
    var tx = x + W * mix(.06, .94, f.temp);
    s += '<path d="M' + r1(tx) + ' ' + (ty - 3) + ' l-6 -9 h12 z" class="mp-mark"/>';
    s += '<text class="lab-s" x="' + x + '" y="' + (ty + 28) + '">Surface</text><text class="lab-s" x="' + (x + W) + '" y="' + (ty + 28) + '" text-anchor="end">Reservoir</text>';
    // pressure
    x = gx[1];
    s += head(x, 'Sample pressure', 'qualitative · not to scale');
    s += track(x, ty, W);
    [[P_SAT, 'Saturation'], [P_RES, 'Reservoir']].forEach(function (q) {
      var px = x + W * q[0];
      s += '<line x1="' + px + '" y1="' + (ty - 6) + '" x2="' + px + '" y2="' + (ty + 16) + '" class="mp-tick"/><text class="lab-s" x="' + px + '" y="' + (ty + 28) + '" text-anchor="middle">' + q[1] + '</text>';
    });
    if (f.pU != null) {
      var ux = x + W * f.pU;
      s += '<path d="M' + r1(ux) + ' ' + (ty + 13) + ' l-5 8 h10 z" fill="none" class="mp-ghost"/><text class="lab-s mp-ghost-t" x="' + r1(ux) + '" y="' + (ty + 46) + '" text-anchor="middle">without compensation</text>';
    }
    if (f.pS != null) {
      var sx = x + W * f.pS;
      s += '<rect x="' + x + '" y="' + ty + '" width="' + r1(sx - x) + '" height="10" rx="5" fill="' + COL.res.sw + '" opacity=".75"/>';
      s += '<path d="M' + r1(sx) + ' ' + (ty - 3) + ' l-6 -9 h12 z" class="mp-mark"/>';
    } else s += '<text class="lab-s" x="' + (x + W) + '" y="' + (ty - 8) + '" text-anchor="end">no sample yet</text>';
    // relative volumes
    x = gx[2];
    var sample = f.sp - D.ready.sp, comp0 = D.ready.np - D.ready.sp - 40, disp = comp0 - (f.np - f.sp - 40), n2 = 222 - f.np - 26, full = 200;
    s += head(x, 'Relative volumes', 'equal lengths = equal volumes');
    [['Sample in', sample, COL.res.sw], ['Displaced out', disp, COL.comp.sw], ['Nitrogen', n2, COL.n2.sw]].forEach(function (b, k) {
      var by = ty - 8 + k * 20, w = (W - 104) * cl(b[1] / full);
      s += '<text class="lab-s" x="' + x + '" y="' + (by + 8) + '">' + b[0] + '</text>';
      s += track(x + 104, by, W - 104);
      if (w > .5) s += '<rect x="' + (x + 104) + '" y="' + by + '" width="' + r1(w) + '" height="10" rx="5" fill="' + b[2] + '"/>';
    });
    return s;
  }

  /* ------------------------------------------------------------------ mount */
  function mount(el, explainEl, opts) {
    opts = opts || {};
    var E = window.EQUIPMENT.spmc, ST = E.stages, ns = 'mp';
    var S = { i: 0, t0: 0, el: 0, playing: false, labels: opts.labels !== false }, raf = 0, last = 0, clock = 0;
    el.innerHTML =
      '<div class="mp">' +
        '<ol class="mp-steps">' + ST.map(function (s, k) { return '<li><button type="button" data-mp-go="' + k + '" title="' + esc(s.t) + '"><b>' + (k + 1) + '</b><span>' + esc(s.b || s.t) + '</span></button></li>'; }).join('') + '</ol>' +
        '<div class="mp-fig"><svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid meet" role="img" aria-label="SPMC operating principle, chamber section">' +
          '<defs>' + window.MRDraw.defs(ns) + '<linearGradient id="mpTemp" x1="0" x2="1"><stop offset="0" stop-color="#4d9dff"/><stop offset="1" stop-color="#e7752e"/></linearGradient></defs>' +
          '<g data-mp="fig"></g><g data-mp="gauges"></g></svg>' +
          '<p class="mp-note" data-mp="note"></p></div>' +
        '<div class="mp-ctl">' +
          '<button type="button" class="ui-btn ui-btn-ghost" data-mp="prev" aria-label="Previous stage">‹ Previous</button>' +
          '<button type="button" class="ui-btn ui-btn-primary mp-play" data-mp="play">Play</button>' +
          '<button type="button" class="ui-btn ui-btn-ghost" data-mp="next" aria-label="Next stage">Next ›</button>' +
          '<button type="button" class="ui-btn ui-btn-ghost" data-mp="reset">Reset</button>' +
          '<span class="mp-bar" aria-hidden="true"><i data-mp="bar"></i></span>' +
          '<span class="mp-time" data-mp="time"></span>' +
        '</div>' +
      '</div>';
    var q = function (k) { return el.querySelector('[data-mp="' + k + '"]'); };
    var fig = q('fig'), gau = q('gauges'), bar = q('bar'), time = q('time'), note = q('note'), playBtn = q('play');

    function draw() {
      var p = cl(S.el / DUR), f = frame(S.i, p, clock / 1000);
      fig.innerHTML = figure(ns, S.i, f, S.labels);
      gau.innerHTML = gauges(S.i, f);
      bar.style.width = (p * 100).toFixed(1) + '%';
      time.textContent = 'Stage ' + (S.i + 1) + ' of ' + ST.length + ' · ' + (S.el / 1000).toFixed(1) + ' / ' + (DUR / 1000).toFixed(1) + ' s';
    }
    function ui() {
      el.querySelectorAll('[data-mp-go]').forEach(function (b, k) { b.setAttribute('aria-current', k === S.i ? 'step' : 'false'); b.classList.toggle('done', k < S.i); });
      playBtn.textContent = S.playing ? 'Pause' : (S.i === ST.length - 1 && S.el >= DUR ? 'Replay' : 'Play');
      q('prev').disabled = S.i === 0; q('next').disabled = S.i === ST.length - 1;
      note.textContent = S.i === 3 ? 'Not to scale: the contraction is exaggerated. The piston motion shown is pressure compensation; agitation is a separate step at surface, during restoration.'
        : S.i === 2 ? 'White chevrons show pressure carried through the pistons and the buffer. No fluid crosses between the three regions.'
        : S.i === 1 ? 'Sample in and fluid displaced out are equal at every moment. The nitrogen piston does not move.'
        : 'Supporting MDT modules clean up the flowline fluid first. The chamber stays closed.';
      var s = ST[S.i];
      if (explainEl) explainEl.innerHTML = '<p class="mp-k">Stage ' + (S.i + 1) + ' of ' + ST.length + '</p><h4>' + esc(s.t) + '</h4><p class="mp-s">' + esc(s.s) + '</p>' + s.x.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
      if (opts.onStage) opts.onStage(S.i);
    }
    function loop(ts) {
      raf = 0;
      if (!S.playing || !el.isConnected) { S.playing = false; ui(); return; }
      var dt = last ? Math.min(ts - last, 100) : 0; last = ts; clock += dt; S.el += dt;
      if (S.el >= DUR) {
        if (S.i < ST.length - 1) { S.i++; S.el = 0; ui(); }
        else { S.el = DUR; S.playing = false; draw(); ui(); return; }
      }
      draw();
      raf = requestAnimationFrame(loop);
    }
    function play() { if (S.i === ST.length - 1 && S.el >= DUR) { S.el = 0; } S.playing = true; last = 0; ui(); if (!raf) raf = requestAnimationFrame(loop); }
    function pause() { S.playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; ui(); draw(); }
    function go(k) { S.i = Math.max(0, Math.min(ST.length - 1, k)); S.el = 0; draw(); ui(); }
    function reset() { pause(); clock = 0; go(0); }
    function onClick(e) {
      var g = e.target.closest('[data-mp-go]'); if (g) { go(+g.getAttribute('data-mp-go')); return; }
      var b = e.target.closest('[data-mp]'); if (!b) return;
      var a = b.getAttribute('data-mp');
      if (a === 'play') { if (S.playing) pause(); else play(); }
      if (a === 'next') go(S.i + 1);
      if (a === 'prev') go(S.i - 1);
      if (a === 'reset') reset();
    }
    el.addEventListener('click', onClick);
    draw(); ui();
    return {
      play: play, pause: pause, go: go, reset: reset,
      next: function () { go(S.i + 1); }, prev: function () { go(S.i - 1); },
      toggle: function () { if (S.playing) pause(); else play(); },
      labels: function (on) { S.labels = !!on; draw(); },
      seek: function (ms) { S.el = Math.max(0, Math.min(DUR, ms)); clock = S.el; draw(); ui(); },     // review / screenshot hook
      state: function () { return { stage: S.i, elapsed: Math.round(S.el), playing: S.playing, raf: !!raf, frame: frame(S.i, cl(S.el / DUR), clock / 1000) }; },
      destroy: function () { S.playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; el.removeEventListener('click', onClick); el.innerHTML = ''; if (explainEl) explainEl.innerHTML = ''; }
    };
  }

  window.MRPrinciple = { mount: mount, DUR: DUR, frame: frame };
})();
