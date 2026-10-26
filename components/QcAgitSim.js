/* ==========================================================================
   QcAgitSim — Validation · Step 4 Sample Homogenization (2026-09-30)

   Same motion as the Recombination stage-9 agitation (components/RecombSim.js):
   slow 180° inversion 0° -> 180° -> 0°, ROCK_N cycles, angle
       ang = 180 · (1 - cos(2π · N · rk)) / 2        (gentle start / stop at each end)
   then a short stabilizing hold upright. Mixing progress uses the same curve as
   Recombination: mix = 0.9 · smooth(rk) while rotating, 0.9 -> 1 while stabilizing.

   The bottle is the approved Oil Sample Bottle (equipment/bottle-draw.js frame, bore
   x -22..22 / y -226..226, 46-unit floating piston, scale 0.56 about the pivot). Step 4 starts
   and ends upright: the OIL sample above the piston and the hydraulic WATER below it; the
   pump hose is on the side outlet of the lower (driving-side) right-angle valve.
   Screen angle = -ang. Local fills never change: water / piston / oil stay in their own
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
    PX: 405, PY: 245,  // pivot on the inversion stand (screen coords, viewBox 0 22 900 492); the swept
                       // circle (r ~199) clears the readout card, the base plate and the pump
    NB: 28             // free-gas bubbles drawn (visual only, no gas volume is modelled)
  };
  var TOT = CFG.ROCK_MS + CFG.STAB_MS;
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
  function scrAng(a) { return -a; }                 // approved bottle: upright (sample above the piston) at angle 0

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

  /* ---------------- bottle interior (approved Oil Sample Bottle frame) ----------------
     Local frame = equipment/bottle-draw.js: bore x -22..22, y -226 (sample end) .. 226 (driving end),
     piston 46 long. At angle 0 the sample (oil) is above the piston and the hydraulic water below it. */
  var BX0 = -22, BX1 = 22, BT = -226, BB = 226, BP = 46, BUSE = 452 - 46, S2 = 0.56;
  function interior(st, wf) {
    var wh = BUSE * clamp(wf, 0, 1), pistBot = BB - wh, pt = pistBot - BP, L = pt - BT, u = st.u, mix = st.mix;
    var Y = function (sv, pad) { return pt - pad - sv * (L - 2 * pad); };      // axial: 0 = piston face, 1 = far (sample-valve) end
    var run = st.phase === 'agitating' || st.phase === 'stabilizing';
    var o = '';
    o += '<rect x="' + BX0 + '" y="' + r1(pistBot) + '" width="44" height="' + r1(wh) + '" fill="url(#qDrive)"/>';
    o += '<rect x="' + BX0 + '" y="' + BT + '" width="44" height="' + r1(L) + '" fill="url(#qOil)"/>';
    // compositional layering: heavier (darker) oil lies toward the lower end, lighter toward the upper end.
    // Each band follows gravity with a lag behind the bottle angle and fades as the sample becomes uniform.
    var lay = 1 - mix;
    if (lay > 0.01) {
      var hb = 0.44 * L, sh = (u > 0 && u < CFG.ROCK_MS) ? 7 * Math.sin(2 * Math.PI * CFG.N * (u - 500) / CFG.ROCK_MS) * lay : 0;
      var band = function (sv, id, op) {
        var yc = Y(sv, hb / 2), a = yc - hb / 2, b = yc + hb / 2;
        return '<path d="M' + BX0 + ',' + r1(a - sh) + ' L' + BX1 + ',' + r1(a + sh) + ' L' + BX1 + ',' + r1(b + sh) + ' L' + BX0 + ',' + r1(b - sh) + ' Z" fill="url(#' + id + ')" opacity="' + r1(op * 100) / 100 + '"/>';
      };
      o += band(1 - upEnd(u - 650), 'qAgHeavy', 0.55 * lay);
      o += band(upEnd(u - 900), 'qAgLight', 0.45 * lay);
    }
    // free gas: collected under the piston at rest; during inversion each bubble rises toward whichever
    // end of the oil side is up (lagging the rotation), spreads through the oil and shrinks as it dissolves.
    // Bubbles are confined to the oil side - they never reach the piston or the water.
    var disp = smooth(u / (CFG.ROCK_MS * 0.35)) * (1 - smooth(st.se));
    for (var i = 0; i < CFG.NB; i++) {
      var mi = 0.22 + 0.76 * h(i, 6);
      var rr = (1.5 + 2.3 * h(i, 7)) * Math.pow(clamp(1 - mix / mi, 0, 1), 0.55);
      if (st.phase === 'done' || rr < 0.35) continue;
      var tau = 350 + 950 * h(i, 1), ul = u - tau;
      var e = Math.max(h(i, 3) * 0.07, h(i, 2) * 0.42 * disp);
      var sv = e + (1 - 2 * e) * upEnd(ul);
      var hz = Math.sin(angAt(ul) * Math.PI / 180);          // horizontal: bubbles ride the upper wall
      var bx = BX0 + 4 + (BX1 - BX0 - 8) * h(i, 4);
      var x = bx + (BX1 - 4 - 4 * h(i, 5) - bx) * 0.75 * hz * (1 - e * 1.4);
      if (run) x += 1.0 * Math.sin(u * 0.004 + i * 1.7);
      o += '<circle cx="' + r1(clamp(x, BX0 + rr + 1, BX1 - rr - 1)) + '" cy="' + r1(Y(sv, 3 + rr)) + '" r="' + r1(rr) + '" fill="#fff3d0" opacity="' + (0.55 + 0.25 * h(i, 8)).toFixed(2) + '" stroke="rgba(70,45,12,.35)" stroke-width="0.5"/>';
    }
    // loose mixing ring (oil side): lies on whichever end of the oil side is down and travels through
    // the sample as the bottle turns, lagging the rotation like the heavier oil
    var m = PBDraw.OIL.ring, hr = m.t / 2 + m.ry + .5;
    o += PBDraw.mixRing('q', 0, Y(1 - upEnd(u - 600), hr));
    // floating piston (fixed: P and T held, so the bottleModel split does not change)
    o += PBDraw.piston('q', pt);
    return o;
  }

  /* inversion stand + rotating cradle - shared with Validation · Recombination stage 9 (RecombSim), which draws
     the same parts around its own bottle. id = gradient ids { steelV, steelD, pipe, cyl, metal }; this page uses the
     q* gradients of screens/showRestore.js. Coordinates: stand in page units around the pivot (px, py), base plate
     210-225 below it; cradle in the bottle frame (approved bottle units, bottle centre on the pivot). */
  var QID = { steelV: 'qSteelV', steelD: 'qSteelD', pipe: 'qPipe', cyl: 'qCyl', metal: 'qMetal' };
  // static stand (behind the bottle): base plate on levelling feet, twin-leg column with a lightening window,
  // bearing housing at the pivot (same styling as the Validation clamp stands, BottleArt.stand)
  function stand(id, PX, PY) {
    var s = '', K = 'stroke="#0a0e16"';
    s += '<ellipse cx="' + PX + '" cy="' + (PY + 223) + '" rx="112" ry="6" fill="rgba(0,0,0,.3)"/>';
    [PX - 92, PX + 84].forEach(function (fx) { s += '<rect x="' + fx + '" y="' + (PY + 220) + '" width="8" height="5" rx="1" fill="#1d2430" ' + K + ' stroke-width=".6"/>'; });
    s += '<rect x="' + (PX - 100) + '" y="' + (PY + 210) + '" width="200" height="11" rx="3" fill="url(#' + id.steelV + ')" ' + K + ' stroke-width="1"/>';
    s += '<rect x="' + (PX - 96) + '" y="' + (PY + 211.5) + '" width="192" height="1.6" rx=".8" fill="#fff" opacity=".35"/>';
    s += '<path d="M' + (PX - 46) + ',' + (PY + 210) + ' L' + (PX - 15) + ',' + (PY + 20) + ' L' + (PX + 15) + ',' + (PY + 20) + ' L' + (PX + 46) + ',' + (PY + 210) + ' Z ' +
      'M' + (PX - 24) + ',' + (PY + 198) + ' L' + (PX - 7) + ',' + (PY + 52) + ' L' + (PX + 7) + ',' + (PY + 52) + ' L' + (PX + 24) + ',' + (PY + 198) + ' Z" fill="url(#' + id.steelD + ')" fill-rule="evenodd" ' + K + ' stroke-width="1"/>';
    s += '<rect x="' + (PX - 52) + '" y="' + (PY + 198) + '" width="104" height="12" rx="2.5" fill="url(#' + id.steelD + ')" ' + K + ' stroke-width=".9"/>';
    s += '<circle cx="' + PX + '" cy="' + PY + '" r="26" fill="url(#' + id.steelD + ')" ' + K + ' stroke-width="1.2"/>';
    s += '<circle cx="' + PX + '" cy="' + PY + '" r="18" fill="none" stroke="#0a0e16" stroke-width=".8" opacity=".55"/>';
    for (var bi = 0; bi < 6; bi++) { var ba = bi * Math.PI / 3; s += '<circle cx="' + r1(PX + 22 * Math.cos(ba)) + '" cy="' + r1(PY + 22 * Math.sin(ba)) + '" r="1.8" fill="#1f2630" stroke="#8b97a8" stroke-width=".5"/>'; }
    return s;
  }
  // rotating cradle, bottle frame: back = plate + arm to the pivot hub (behind the bottle);
  // front = the two clamp brackets from the cradle plate to the bottle wall (nothing crosses in front of the bore)
  function cradle(id) {
    var back = '<rect x="-52" y="-12" width="52" height="24" rx="5" fill="url(#' + id.pipe + ')" stroke="#0a0e16" stroke-width="1.4"/>' +
      '<rect x="-74" y="-196" width="22" height="392" rx="5" fill="url(#' + id.cyl + ')" stroke="#0a0e16" stroke-width="1.6"/>', front = '';
    [-110, 110].forEach(function (y) {
      front += '<rect x="-54" y="' + (y - 8) + '" width="22" height="16" rx="4" fill="url(#' + id.pipe + ')" stroke="#0a0e16" stroke-width="1.2"/>';
      front += '<rect x="-40" y="' + (y - 13) + '" width="8" height="26" rx="3" fill="url(#' + id.metal + ')" stroke="#0a0e16" stroke-width="1.2"/>';
    });
    return { back: back, front: front };
  }

  /* approved Oil Sample Bottle on its cradle, clamps and heating jacket - all rotate together (bottle frame) */
  function bottle(st, wf) {
    var c = cradle(QID), o = c.back;
    // heating jacket (holds the restoration temperature), between the end caps
    o += '<rect x="-44" y="-212" width="88" height="424" rx="14" fill="rgba(231,117,46,.10)" stroke="#e7752e" stroke-width="2.6"/>';
    o += '<g class="bd-hit" data-bd-open="oil" data-bd-ctx="SPS/PDS sample bottle · inversion agitation">' +
      BottleArt.raw(BottleArt.oil('q', { x: 0, y: 0, s: 1, inner: interior(st, wf), ringB: '#46d39a', needleB: BottleArt.needle(1) })) + '</g>';
    return o + c.front;
  }

  function rot(p, a) {   // local bottle coords -> screen
    var t = a * Math.PI / 180, dx = p[0] * S2, dy = p[1] * S2;
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
      '<linearGradient id="qAgHeavy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e3d0c" stop-opacity="0"/><stop offset=".5" stop-color="#6e3d0c" stop-opacity=".75"/><stop offset="1" stop-color="#6e3d0c" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="qAgLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a6" stop-opacity="0"/><stop offset=".5" stop-color="#ffe2a6" stop-opacity=".7"/><stop offset="1" stop-color="#ffe2a6" stop-opacity="0"/></linearGradient>' +
      '</defs>';
    var PX = CFG.PX, PY = CFG.PY;
    s += stand(QID, PX, PY);
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
    // hose end = side outlet of the driving-side (lower at rest) right-angle valve of the approved bottle
    var port = rot([48, 281], sa), dirA = sa * Math.PI / 180, dir = [Math.cos(dirA), Math.sin(dirA)];
    var c1 = [port[0] + dir[0] * 72, Math.min(462, port[1] + dir[1] * 72)];
    var hp = 'M' + r1(port[0]) + ',' + r1(port[1]) + ' C' + r1(c1[0]) + ',' + r1(c1[1]) + ' ' + (PUMP_PX - 110) + ',' + PUMP_PY + ' ' + (PUMP_PX - 4) + ',' + PUMP_PY;
    var hose = '<path d="' + hp + '" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="' + hp + '" fill="none" stroke="#2c3a50" stroke-width="5.6" stroke-linecap="round"/>' +
      '<path d="' + hp + '" fill="none" stroke="#5aa6d8" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>';
    s += T(702, 262, 'FLEXIBLE LINE', { s: 8.5, w: 600, ls: 0.8, c: 'var(--txt2)' });
    s += T(702, 274, 'pump → lower water-side port', { s: 8, c: 'var(--cap2)' });
    // ---- rotating bottle ----
    var tr = 'rotate(' + r1(sa) + ' ' + PX + ' ' + PY + ') translate(' + PX + ' ' + PY + ') scale(' + S2 + ')';
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

  window.QcAgitSim = { CFG: CFG, TOT: TOT, info: info, svg: svg, stand: stand, cradle: cradle, S2: S2 };
})();
