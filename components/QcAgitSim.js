/* ==========================================================================
   QcAgitSim — Validation · Step 4 Sample Homogenization (2026-09-30)

   Same motion as the Recombination stage-9 agitation (components/RecombSim.js):
   slow 180° inversion 0° -> 180° -> 0°, ROCK_N cycles, angle
       ang = 180 · (1 - cos(2π · N · rk)) / 2        (gentle start / stop at each end)
   then a short stabilizing hold upright. Mixing progress uses the same curve as
   Recombination: mix = 0.9 · smooth(rk) while rotating, 0.9 -> 1 while stabilizing.

   The bottle is the Validation SPS/PDS bottle (showRestore.js restoration coordinates,
   bore x 263..337 / y 134..338, 12 px floating piston). Step 4 starts and ends with the
   bottle turned so the OIL sample is above the piston and the hydraulic WATER below it; the
   pump line is on the lower water-side port. Screen angle = 180 - ang (the drawing is
   Restoration-inverted, so +180 flips it; turning counter-clockwise swings the water port
   toward the pump). Local fills never change: water / piston / oil stay in their own
   compartments at every angle. Piston position = the
   shared bottleModel() split (passed in as waterFrac) — pressure and temperature are
   held at the restoration values, so the split does not change during agitation.

   Everything drawn is a pure function of k (0..1 progress, Main.state.agitP) so
   pause / resume / restart / replay are exact (Main drives k from the PCLK clock).
   Main mounts the markup into an empty <g ref="qcAgHost"> inside the Validation svg
   (it uses the q* gradients defined in screens/showRestore.js).
   ========================================================================== */
(function () {
  'use strict';
  var CFG = {
    ROCK_MS: 12000,    // process ms for the 3 inversion cycles (x PROCESS_SPEED_MULTIPLIER)
    STAB_MS: 3000,     // process ms stabilizing upright after the last cycle
    N: 3,              // 180° inversion cycles (same as Recombination)
    PX: 360, PY: 266,  // pivot on the inversion stand (screen coords, viewBox 0 22 900 492)
    S: 1.0,            // bottle drawing scale (clears the base at 180°: bottom valve at y 438 < 456)
    NB: 28             // free-gas bubbles drawn (visual only, no gas volume is modelled)
  };
  var TOT = CFG.ROCK_MS + CFG.STAB_MS;
  var X0 = 263, X1 = 337, Y0 = 134, YB = 338, PIST = 12, USE = 204 - 12, CX = 300, CY = 245.5;
  var PUMP_PX = 688, PUMP_PY = 420;   // pump outlet on its left face (hose end)

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function h(i, s) { var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); }
  function n0(v) { return Math.round(v).toLocaleString('en-US'); }

  function angAt(u) { if (u <= 0 || u >= CFG.ROCK_MS) return 0; return 180 * (1 - Math.cos(2 * Math.PI * CFG.N * u / CFG.ROCK_MS)) / 2; }
  // axial position of "up" inside the oil side: 0 = piston face, 1 = far (sample-valve) end
  // start orientation (ang 0) = oil above the piston, so the far (sample-valve) end is up
  function upEnd(u) { return (1 + Math.cos(angAt(u) * Math.PI / 180)) / 2; }
  function scrAng(a) { return 180 - a; }

  /* timeline state from progress k (0..1) */
  function info(k) {
    k = clamp(k || 0, 0, 1);
    var u = k * TOT, rk = clamp(u / CFG.ROCK_MS, 0, 1), se = clamp((u - CFG.ROCK_MS) / CFG.STAB_MS, 0, 1);
    var mix = se > 0 ? 0.9 + 0.1 * smooth(se) : 0.9 * smooth(rk);
    var phase = k <= 0 ? 'ready' : k >= 1 ? 'done' : u < CFG.ROCK_MS ? 'agitating' : 'stabilizing';
    var cyc = phase === 'ready' ? 0 : phase === 'agitating' ? Math.min(CFG.N, Math.floor(rk * CFG.N) + 1) : CFG.N;
    var gas = phase === 'done' ? 'None' : phase === 'ready' ? 'Under piston' : mix < 0.9 ? 'Dispersing · dissolving' : 'Last traces dissolving';
    return { k: k, u: u, rk: rk, se: se, mix: mix, ang: angAt(u), cyc: cyc, N: CFG.N, phase: phase,
      label: { ready: 'Ready', agitating: 'Agitating', stabilizing: 'Stabilizing', done: 'Homogeneous sample' }[phase],
      gas: gas, elapsed: u * (typeof PSM === 'function' ? PSM() : 1) / 1000, total: TOT * (typeof PSM === 'function' ? PSM() : 1) / 1000 };
  }

  /* ---------------- bottle interior (local restoration coordinates) ---------------- */
  function interior(st, wf) {
    var pistTop = Y0 + USE * clamp(wf, 0, 1), oilTop = pistTop + PIST, L = YB - oilTop, u = st.u, mix = st.mix;
    var run = st.phase === 'agitating' || st.phase === 'stabilizing';
    var o = '<g clip-path="url(#qAgChm)">';
    o += '<rect x="' + X0 + '" y="' + Y0 + '" width="74" height="' + r1(pistTop - Y0) + '" fill="url(#qWater)" opacity="0.9"/>';
    o += '<rect x="' + X0 + '" y="' + r1(oilTop) + '" width="74" height="' + r1(L) + '" fill="url(#qSample)" opacity="0.94"/>';
    // compositional layering: heavier (darker) oil lies toward the lower end, lighter toward the upper end.
    // Each band follows gravity with a lag behind the bottle angle and fades as the sample becomes uniform.
    var lay = 1 - mix;
    if (lay > 0.01) {
      var hb = 0.44 * L, sh = (u > 0 && u < CFG.ROCK_MS) ? 7 * Math.sin(2 * Math.PI * CFG.N * (u - 500) / CFG.ROCK_MS) * lay : 0;
      var band = function (s, id, op) {
        var yc = oilTop + hb / 2 + s * (L - hb), a = yc - hb / 2, b = yc + hb / 2;
        return '<path d="M' + X0 + ',' + r1(a - sh) + ' L' + X1 + ',' + r1(a + sh) + ' L' + X1 + ',' + r1(b + sh) + ' L' + X0 + ',' + r1(b - sh) + ' Z" fill="url(#' + id + ')" opacity="' + r1(op * 100) / 100 + '"/>';
      };
      o += band(1 - upEnd(u - 650), 'qAgHeavy', 0.55 * lay);
      o += band(upEnd(u - 900), 'qAgLight', 0.45 * lay);
    }
    // free gas: collected under the piston at rest; during inversion each bubble rises toward whichever
    // end of the oil side is up (lagging the rotation), spreads through the oil and shrinks as it dissolves.
    // Bubbles are confined to the oil side (oilTop..YB) - they never reach the piston or the water.
    var disp = smooth(u / (CFG.ROCK_MS * 0.35)) * (1 - smooth(st.se));
    for (var i = 0; i < CFG.NB; i++) {
      var mi = 0.22 + 0.76 * h(i, 6);                       // mixing level at which this bubble has dissolved
      var rr = (1.5 + 2.3 * h(i, 7)) * Math.pow(clamp(1 - mix / mi, 0, 1), 0.55);
      if (st.phase === 'done' || rr < 0.35) continue;
      var tau = 350 + 950 * h(i, 1), ul = u - tau;
      var e = Math.max(h(i, 3) * 0.07, h(i, 2) * 0.42 * disp);
      var s = e + (1 - 2 * e) * upEnd(ul);
      var hz = Math.sin(angAt(ul) * Math.PI / 180);          // horizontal: bubbles ride the upper wall (local -x)
      var bx = X0 + 6 + (X1 - X0 - 12) * h(i, 4);
      var x = bx + (X0 + 5 + 7 * h(i, 5) - bx) * 0.75 * hz * (1 - e * 1.4);
      if (run) x += 1.3 * Math.sin(u * 0.004 + i * 1.7);
      var y = oilTop + 3 + rr + s * (L - 6 - 2 * rr);
      o += '<circle cx="' + r1(clamp(x, X0 + rr + 1, X1 - rr - 1)) + '" cy="' + r1(y) + '" r="' + r1(rr) + '" fill="#fff3d0" opacity="' + (0.55 + 0.25 * h(i, 8)).toFixed(2) + '" stroke="rgba(70,45,12,.35)" stroke-width="0.5"/>';
    }
    // floating piston (fixed: P and T held, so the bottleModel split does not change)
    o += '<rect x="' + X0 + '" y="' + r1(pistTop) + '" width="74" height="' + PIST + '" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="1"/>';
    o += '<rect x="' + X0 + '" y="' + r1(pistTop + 1.6) + '" width="74" height="2" fill="#eef4fb" opacity=".45"/>';
    o += '</g>';
    // phase letters, counter-rotated so they stay upright on screen
    var lab = function (x, y, s, sz, col, w) {
      return '<text x="' + x + '" y="' + r1(y) + '" text-anchor="middle" dominant-baseline="central" font-family="IBM Plex Mono, monospace" font-size="' + sz + '" font-weight="' + (w || 600) + '" fill="' + col + '"' +
        ' transform="rotate(' + r1(-scrAng(st.ang)) + ' ' + x + ' ' + r1(y) + ')"' + '>' + s + '</text>';
    };
    if (pistTop - Y0 > 22) o += lab(CX, (Y0 + pistTop) / 2, 'W', 17, '#e6f3ff');
    if (st.phase === 'done') { o += lab(CX, oilTop + L / 2 - 7, 'O', 17, '#3d2606'); o += lab(CX, oilTop + L / 2 + 10, 'SINGLE PHASE', 7.5, '#3d2606', 700); }
    else o += lab(CX, oilTop + L / 2, 'O', 17, '#3d2606');
    return { svg: o, pistTop: pistTop, oilTop: oilTop };
  }

  /* SPS/PDS shell (same drawing as Restoration), clamps and heating jacket - all rotate together */
  function bottle(st, wf) {
    var o = '';
    // rotating cradle: back plate + arm to the pivot hub (behind the bottle)
    o += '<rect x="232" y="239" width="36" height="13" rx="3" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.8"/>';
    o += '<rect x="220" y="122" width="13" height="248" rx="3" fill="url(#qCyl)" stroke="#0a0e16" stroke-width="1"/>';
    // heating jacket (holds the restoration temperature)
    o += '<rect x="244" y="112" width="112" height="246" rx="13" fill="rgba(231,117,46,.10)" stroke="#e7752e" stroke-width="1.6"/>';
    // water-side valve (pump connection, open) on top
    o += '<rect x="294" y="74" width="12" height="15" rx="1.5" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"/>';
    o += '<rect x="284" y="89" width="32" height="17" rx="3" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.9"/>';
    o += '<circle cx="327.5" cy="97.5" r="11.5" fill="none" stroke="#46d39a" stroke-width="1.6"/>';
    o += '<use href="#qhw" x="318" y="88" width="19" height="19"/>';
    o += '<rect x="291" y="106" width="18" height="13" rx="2" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.8"/>';
    o += '<ellipse cx="300" cy="128" rx="42" ry="11" fill="url(#qCyl)" stroke="#0a0e16" stroke-width="1.2"/>';
    o += '<rect x="258" y="128" width="84" height="216" fill="url(#qCyl)" stroke="#0a0e16" stroke-width="1.2"/>';
    o += '<ellipse cx="300" cy="344" rx="42" ry="11" fill="url(#qCyl)" stroke="#0a0e16" stroke-width="1.2"/>';
    o += '<rect x="263" y="134" width="74" height="204" fill="#0a1420" stroke="#33445e" stroke-width="1"/>';
    o += interior(st, wf).svg;
    o += '<rect x="268" y="138" width="6" height="196" rx="3" fill="#ffffff" opacity="0.18"/>';
    o += '<rect x="326" y="140" width="3" height="192" fill="#ffffff" opacity="0.08"/>';
    o += '<rect x="263" y="134" width="74" height="204" fill="none" stroke="rgba(150,175,210,.3)" stroke-width="1"/>';
    // oil-side sample valve (closed)
    o += '<rect x="294" y="356" width="12" height="20" rx="1.5" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"/>';
    o += '<rect x="284" y="376" width="32" height="17" rx="3" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.9"/>';
    o += '<use href="#qhw" x="318" y="375" width="19" height="19"/>';
    o += '<rect x="294" y="393" width="12" height="17" rx="1.5" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"/>';
    o += '<rect x="290" y="410" width="20" height="7" rx="2" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.7"/>';
    // two clamp straps from the cradle around the bottle
    // clamp brackets: cradle plate -> bottle wall only (nothing crosses in front of the bore)
    [170, 318].forEach(function (y) {
      o += '<rect x="231" y="' + (y - 5) + '" width="29" height="10" rx="2.5" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.8"/>';
      o += '<rect x="254" y="' + (y - 8) + '" width="7" height="16" rx="2" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.8"/>';
    });
    return o;
  }

  function rot(p, a) {   // local restoration coords -> screen
    var t = a * Math.PI / 180, dx = (p[0] - CX) * CFG.S, dy = (p[1] - CY) * CFG.S;
    return [CFG.PX + dx * Math.cos(t) - dy * Math.sin(t), CFG.PY + dx * Math.sin(t) + dy * Math.cos(t)];
  }

  function T(x, y, s, o) {
    o = o || {};
    return '<text x="' + r1(x) + '" y="' + r1(y) + '"' + (o.a ? ' text-anchor="' + o.a + '"' : '') + ' font-family="' + (o.sans ? 'IBM Plex Sans, sans-serif' : 'IBM Plex Mono, monospace') + '" font-size="' + (o.s || 9) + '"' +
      (o.w ? ' font-weight="' + o.w + '"' : '') + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') + ' fill="' + (o.c || 'rgba(185,210,240,.8)') + '">' + s + '</text>';
  }

  /* ---------------- full step-4 scene ---------------- */
  function svg(o) {
    var st = info(o.k), a = st.ang, sa = scrAng(a), P = o.P || 0, Tc = o.T || 0;
    var s = '<defs>' +
      '<clipPath id="qAgChm"><rect x="263" y="134" width="74" height="204"/></clipPath>' +
      '<linearGradient id="qAgHeavy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e3d0c" stop-opacity="0"/><stop offset=".5" stop-color="#6e3d0c" stop-opacity=".75"/><stop offset="1" stop-color="#6e3d0c" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="qAgLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a6" stop-opacity="0"/><stop offset=".5" stop-color="#ffe2a6" stop-opacity=".7"/><stop offset="1" stop-color="#ffe2a6" stop-opacity="0"/></linearGradient>' +
      '</defs>';
    var PX = CFG.PX, PY = CFG.PY;
    // ---- inversion stand (static, behind the bottle) ----
    s += '<ellipse cx="' + PX + '" cy="468" rx="118" ry="7" fill="rgba(0,0,0,.35)"/>';
    s += '<rect x="' + (PX - 104) + '" y="456" width="208" height="12" rx="3" fill="url(#qCyl)" stroke="#0a0e16" stroke-width="1.1"/>';
    s += '<path d="M' + (PX - 60) + ',456 L' + (PX - 10) + ',' + PY + ' L' + (PX + 10) + ',' + PY + ' L' + (PX + 60) + ',456 Z" fill="url(#qCyl)" stroke="#0a0e16" stroke-width="1" opacity=".9"/>';
    s += '<circle cx="' + PX + '" cy="' + PY + '" r="24" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="1.2"/>';
    // ---- pressure pump (stationary), same drawing as the Restoration transfer pump ----
    var ledOn = true;
    s += '<ellipse cx="765" cy="466" rx="86" ry="7" fill="rgba(0,0,0,.32)"/>';
    s += '<rect x="688" y="452" width="154" height="12" rx="3" fill="#1a2030" stroke="#0a0e16" stroke-width="1"/>';
    s += '<rect x="702" y="290" width="126" height="162" rx="7" fill="url(#qCyl)" stroke="#0a0e16" stroke-width="1.3"/>';
    s += '<rect x="710" y="298" width="8" height="146" rx="4" fill="#ffffff" opacity="0.16"/>';
    s += '<rect x="714" y="304" width="102" height="8" rx="3" fill="#1a2030" stroke="#0a0e16" stroke-width="0.6"/>';
    var ga = (-140 + 280 * clamp(P / 6000, 0, 1)) * Math.PI / 180;
    s += '<circle cx="765" cy="352" r="26" fill="url(#qGauge)" stroke="#46566f" stroke-width="2"/>';
    s += '<line x1="765" y1="352" x2="' + r1(765 + 17 * Math.sin(ga)) + '" y2="' + r1(352 - 17 * Math.cos(ga)) + '" stroke="#5fb0ff" stroke-width="1.8" stroke-linecap="round"/>';
    s += '<circle cx="765" cy="352" r="2.4" fill="#aebccf"/>';
    s += '<circle cx="765" cy="410" r="14" fill="#0d1a16" stroke="#2f6f52" stroke-width="1.4"/>';
    s += '<circle cx="765" cy="410" r="7" fill="' + (ledOn ? '#3ddc8a' : '#1f6b48') + '"' + (ledOn ? ' style="filter:drop-shadow(0 0 6px #3ddc8a)"' : '') + '/>';
    s += '<rect x="726" y="432" width="78" height="8" rx="3" fill="#101a26" stroke="#2b3a52" stroke-width="0.7"/>';
    s += '<rect x="' + (PUMP_PX + 2) + '" y="' + (PUMP_PY - 6) + '" width="14" height="12" rx="1.5" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"/>';
    s += '<rect x="' + (PUMP_PX - 4) + '" y="' + (PUMP_PY - 9) + '" width="9" height="18" rx="2.5" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.8"/>';
    s += T(765, 486, 'PRESSURE PUMP', { a: 'middle', sans: 1, s: 11.5, w: 600, ls: 0.8, c: '#f0913f' });
    s += T(765, 499, 'holding ' + n0(P) + ' psig', { a: 'middle', s: 8.5, c: 'var(--cap2)' });
    // ---- flexible line: pump outlet -> water-side valve on the rotating bottle ----
    var port = rot([300, 74], sa), dirA = sa * Math.PI / 180, dir = [Math.sin(dirA), -Math.cos(dirA)];
    var c1 = [port[0] + dir[0] * 72, Math.min(462, port[1] + dir[1] * 72)];
    var hp = 'M' + r1(port[0]) + ',' + r1(port[1]) + ' C' + r1(c1[0]) + ',' + r1(c1[1]) + ' ' + (PUMP_PX - 110) + ',' + PUMP_PY + ' ' + (PUMP_PX - 4) + ',' + PUMP_PY;
    var hose = '<path d="' + hp + '" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="' + hp + '" fill="none" stroke="#2c3a50" stroke-width="5.6" stroke-linecap="round"/>' +
      '<path d="' + hp + '" fill="none" stroke="#5aa6d8" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>';
    s += T(702, 262, 'FLEXIBLE LINE', { s: 8.5, w: 600, ls: 0.8, c: 'var(--txt2)' });
    s += T(702, 274, 'pump → lower water-side port', { s: 8, c: 'var(--cap2)' });
    // ---- rotating bottle ----
    var tr = 'rotate(' + r1(sa) + ' ' + PX + ' ' + PY + ') translate(' + PX + ' ' + PY + ') scale(' + CFG.S + ') translate(' + (-CX) + ' ' + (-CY) + ')';
    s += '<g transform="' + tr + '">' + bottle(st, o.waterFrac) + '</g>';
    s += hose;
    s += '<circle cx="' + r1(port[0]) + '" cy="' + r1(port[1]) + '" r="4.2" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.8"/>';
    s += T(PX - 112, 452, 'INVERSION STAND', { a: 'end', s: 8.5, ls: 1, c: 'var(--cap2)' }) + T(PX - 112, 464, 'SPS/PDS · ~800 cc', { a: 'end', s: 8, c: 'var(--cap)' });

    // ---- compact readout card: angle, cycle, pressure, temperature ----
    var cx0 = 18, cy0 = 34, cw = 188, chh = 150;
    var phC = st.phase === 'done' ? '#5fd9a8' : st.phase === 'ready' ? 'rgba(185,210,240,.8)' : st.phase === 'stabilizing' ? '#f5c46b' : '#5fb0ff';
    s += '<rect x="' + cx0 + '" y="' + cy0 + '" width="' + cw + '" height="' + chh + '" rx="11" fill="rgba(9,16,29,.86)" stroke="rgba(120,150,190,.28)" stroke-width="1.1"/>';
    s += T(cx0 + 13, cy0 + 18, '180° INVERSION AGITATION', { s: 8.5, ls: 1.1, c: 'rgba(185,210,240,.8)' });
    s += T(cx0 + 13, cy0 + 33, st.label, { s: 11, w: 600, c: phC });
    var dx = cx0 + 42, dy = cy0 + 80, R = 25, aa = a * Math.PI / 180;
    s += '<circle cx="' + dx + '" cy="' + dy + '" r="' + R + '" fill="none" stroke="rgba(120,150,190,.25)" stroke-width="3"/>';
    s += '<path d="M' + dx + ',' + (dy - R) + ' A' + R + ',' + R + ' 0 0 1 ' + dx + ',' + (dy + R) + '" fill="none" stroke="rgba(95,176,255,.22)" stroke-width="3"/>';
    if (a > 0.5) s += '<path d="M' + dx + ',' + (dy - R) + ' A' + R + ',' + R + ' 0 0 1 ' + r1(dx + R * Math.sin(aa)) + ',' + r1(dy - R * Math.cos(aa)) + '" fill="none" stroke="#5fb0ff" stroke-width="3"/>';
    s += '<line x1="' + dx + '" y1="' + dy + '" x2="' + r1(dx + (R - 6) * Math.sin(aa)) + '" y2="' + r1(dy - (R - 6) * Math.cos(aa)) + '" stroke="#cfe0fb" stroke-width="2" stroke-linecap="round"/>';
    s += '<circle cx="' + dx + '" cy="' + dy + '" r="2.6" fill="#8fa3c2"/>';
    s += T(dx, dy - R - 4, '0°', { a: 'middle', s: 7.5, c: 'rgba(160,188,220,.7)' }) + T(dx, dy + R + 10, '180°', { a: 'middle', s: 7.5, c: 'rgba(160,188,220,.7)' });
    var vx = cx0 + 84, row = function (y, l, v, u, c) { return T(vx, y, l, { s: 7.5, ls: 0.7, c: 'rgba(160,188,220,.75)' }) + T(vx, y + 14, v + (u ? ' <tspan font-size="8.5" font-weight="400" fill="rgba(160,188,220,.75)">' + u + '</tspan>' : ''), { s: 12.5, w: 600, c: c }); };
    s += row(cy0 + 52, 'ANGLE', Math.round(a) + '°', '', '#cfe0fb');
    s += row(cy0 + 80, 'CYCLE', st.cyc + ' / ' + st.N, '', '#cfe0fb');
    s += '<line x1="' + (cx0 + 12) + '" y1="' + (cy0 + 118) + '" x2="' + (cx0 + cw - 12) + '" y2="' + (cy0 + 118) + '" stroke="rgba(120,150,190,.2)"/>';
    s += T(cx0 + 13, cy0 + 136, n0(P) + ' <tspan font-size="8.5" font-weight="400" fill="rgba(160,188,220,.75)">psig</tspan>', { s: 12.5, w: 600, c: '#5fb0ff' });
    s += T(cx0 + cw - 13, cy0 + 136, Math.round(Tc) + ' <tspan font-size="8.5" font-weight="400" fill="rgba(160,188,220,.75)">°C</tspan>', { a: 'end', s: 12.5, w: 600, c: '#f0913f' });

    // ---- progression: Ready -> Agitating -> Stabilizing -> Homogeneous sample ----
    var steps = ['Ready', 'Agitating', 'Stabilizing', 'Homogeneous sample'], cur = { ready: 0, agitating: 1, stabilizing: 2, done: 3 }[st.phase];
    var sx0 = 40, sp = 118, sy = 506;
    for (var j = 0; j < 4; j++) {
      var x = sx0 + j * sp, dn = j < cur || st.phase === 'done', ac = j === cur;
      var col = dn ? 'var(--accg)' : ac ? 'var(--blue)' : 'var(--mut2)';
      if (j < 3) s += '<line x1="' + (x + 6) + '" y1="' + sy + '" x2="' + (x + sp - 6) + '" y2="' + sy + '" stroke="' + (j < cur ? 'var(--accg)' : 'var(--mut2)') + '" stroke-opacity="' + (j < cur ? 1 : .5) + '" stroke-width="1.4"/>';
      s += '<circle cx="' + x + '" cy="' + sy + '" r="4.5" fill="' + (dn || ac ? col : 'none') + '" stroke="' + col + '" stroke-width="1.4"/>';
      s += T(x, sy - 9, steps[j], { a: 'middle', s: 8.5, w: ac ? 600 : 400, c: dn || ac ? col : 'var(--mut)' });
    }
    return s;
  }

  window.QcAgitSim = { CFG: CFG, TOT: TOT, info: info, svg: svg };
})();
