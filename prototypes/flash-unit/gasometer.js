/* Gasometer — piston-displacement gas volume meter, 3,000 cc (the existing simulator capacity).

   Measurement principle drawn (simplified educational schematic): gas enters the top of a precision
   bore through one process port. A controller watches a differential-pressure sensor on the port line
   (chamber vs. atmosphere) and drives the piston down through a lead screw so the chamber stays at
   atmospheric pressure; the piston displacement is the gas volume shown on the display. Expelling gas
   (helium to the flash unit, gas to the balloon) is the same drive in reverse.
   This follows published descriptions of piston-type gas meters (motor-driven piston held at a set
   pressure, volume counted from the drive); the internals of a specific commercial model are not
   verified, so the cutaway is a schematic.

   Live state (view model V): V.gasoVol (cc in the chamber), V.gasoMode ('he' | 'gas'), V.valve.gaso,
   V.gasoMove (-1 out, 0, +1 in). Drawing only. */
(function () {
  'use strict';
  var F = window.FX, R = F.R, C = F.C, E = F.E, P = F.P, L = F.L, T = F.T, MONO = F.MONO, SANS = F.SANS, r1 = F.r1;

  var cx = 165;
  var G = {
    W: 330, H: 772, cap: 3000,
    post: 16, roof: 22, head1: 124, portY: 140,
    capTop: 150, bore0: 172, bore1: 412, capBot: 430, mid0: 430, mid1: 446, bot0: 748, bot1: 764,
    hw: 52, glassHW: 60, tie: 72, pist: 16,
    dpX: 108, valveX: 58, carOff: 300, motor0: 704, motor1: 744
  };
  G.stroke = G.bore1 - G.bore0 - G.pist;
  function pistonTop(v) { return G.bore0 + G.stroke * F.clamp(v / G.cap, 0, 1); }

  var RT = {};
  RT.port = F.path(0, G.portY).H(cx - 6).turn(cx, G.portY, cx, G.bore0 + 2, 6).V(G.bore0 + 2).end();
  RT.portOut = F.geo('', RT.port.pts.slice().reverse());

  function back() {
    var s = '';
    s += E(G.W / 2, G.H + 2, G.W / 2 + 10, 8, 'fill="#1b2a40" opacity=".10"');
    s += R(G.post, G.roof, G.W - 2 * G.post, G.bot0 - G.roof, 'fill="url(#ppPanel)"');
    s += R(G.post, G.mid1, G.W - 2 * G.post, G.bot0 - G.mid1, 'fill="url(#ppPanel)" opacity=".8"');
    s += R(G.post + 30, G.roof + 6, G.W - 2 * G.post - 60, 2.5, 'rx="1.2" fill="#fff" opacity=".9"');
    return s;
  }
  function headPanel() {
    var s = '', y0 = G.roof + 8, y1 = G.head1;
    s += R(G.post + 6, y0, G.W - 2 * G.post - 12, y1 - y0, 'rx="5" fill="url(#fxCase)" stroke="#8592a3" stroke-width="1"');
    s += T(30, 52, 'GASOMETER', SANS + ' font-size="12" font-weight="700" letter-spacing=".4" fill="#1d3a66"');
    s += T(30, 68, '3,000 cc', MONO + ' font-size="10.5" font-weight="600" fill="#33404f"');
    s += T(30, 82, 'piston displacement', SANS + ' font-size="8.5" fill="#566578"');
    s += R(122, 34, 188, 82, 'rx="5" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width="1"') + R(127, 39, 178, 72, 'rx="3" fill="url(#ppScreen)"');
    [0, 1, 2].forEach(function (i) { s += C(42 + i * 16, 104, 4, 'fill="' + ['#c9d0d9', '#c9d0d9', '#c9d0d9'][i] + '" stroke="#7d8898" stroke-width=".8"'); });
    return s;
  }
  function cylinder(cut) {
    var s = '', x0 = cx - G.glassHW, x1 = cx + G.glassHW;
    // tie rods
    [cx - G.tie, cx + G.tie].forEach(function (x) { s += R(x - 2.5, G.capTop, 5, G.capBot - G.capTop, 'fill="url(#ppSteelV)" stroke="#3c4553" stroke-width=".6"'); });
    // cylinder wall
    if (cut) {
      s += R(x0, G.bore0, G.glassHW - G.hw, G.bore1 - G.bore0, 'fill="url(#ppHatch)" stroke="#2a3443" stroke-width=".8"') + R(cx + G.hw, G.bore0, G.glassHW - G.hw, G.bore1 - G.bore0, 'fill="url(#ppHatch)" stroke="#2a3443" stroke-width=".8"');
      s += R(cx - G.hw, G.bore0, 2 * G.hw, G.bore1 - G.bore0, 'fill="#e3e8ee"') + R(cx - G.hw, G.bore0, 8, G.bore1 - G.bore0, 'fill="#c9d1db"');
    } else {
      s += R(x0, G.bore0, 2 * G.glassHW, G.bore1 - G.bore0, 'fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1"');
      s += R(cx - 13, G.bore0 + 8, 26, G.bore1 - G.bore0 - 16, 'rx="4" fill="#28313d" stroke="#2a3443" stroke-width="1"');   // sight window
    }
    // caps / flanges
    s += R(x0 - 18, G.capTop, 2 * G.glassHW + 36, G.bore0 - G.capTop, 'rx="3" fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1"');
    s += R(x0 - 18, G.bore1, 2 * G.glassHW + 36, G.capBot - G.bore1, 'rx="3" fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1"');
    [cx - G.tie, cx + G.tie].forEach(function (x) { [G.capTop - 3, G.capBot - 4].forEach(function (y) { s += R(x - 6, y, 12, 7, 'rx="1.5" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".7"'); }); });
    if (cut) s += R(cx - 2, G.capTop - 8, 4, G.bore0 - G.capTop + 10, 'fill="#28313d"');
    // volume scale (cc), right of the cylinder
    for (var v = 0; v <= G.cap; v += 250) {
      var y = pistonTop(v), big = v % 500 === 0;
      s += L(x1 + 18, y, x1 + (big ? 32 : 26), y, 'stroke="#2a3443" stroke-width="' + (big ? 1.2 : .8) + '"');
      if (big) s += T(x1 + 36, y + 3.5, v.toLocaleString('en-US'), MONO + ' font-size="9.5" fill="#33404f"');
    }
    s += T(x1 + 36, G.bore0 - 26, 'cc', MONO + ' font-size="9" fill="#566578"');
    return s;
  }
  function drive(cut) {
    var s = '', x0 = cx - 64, x1 = cx + 64;
    s += R(G.post, G.mid0, G.W - 2 * G.post, G.mid1 - G.mid0, 'fill="url(#ppNavyV)" stroke="#132845" stroke-width="1"');
    // bay window
    s += R(x0 - 10, G.mid1 + 10, x1 - x0 + 20, G.motor0 - G.mid1 - 6, 'rx="4" fill="' + (cut ? '#e9edf2' : '#dfe4ea') + '" stroke="#9aa6b5" stroke-width="1"');
    // guide rods + lead screw
    [cx - 46, cx + 46].forEach(function (x) { s += R(x - 3, G.mid1, 6, G.motor0 - G.mid1, 'fill="url(#ppSteelV)" stroke="#3c4553" stroke-width=".6"'); });
    s += R(cx + 24, G.mid1, 10, G.motor0 - G.mid1, 'fill="url(#fxScrew)" stroke="#3c4553" stroke-width=".7"');
    // stepper motor + coupling
    s += R(cx + 22, G.motor0 - 8, 14, 10, 'fill="#5d6878"');
    s += R(cx + 4, G.motor0, 52, G.motor1 - G.motor0, 'rx="3" fill="#2b3644" stroke="#11161d" stroke-width="1"');
    for (var i = 0; i < 5; i++) s += L(cx + 8, G.motor0 + 6 + i * 7, cx + 52, G.motor0 + 6 + i * 7, 'stroke="#46546a" stroke-width="1.5"');
    s += T(cx - 10, G.motor0 + 24, 'M', 'text-anchor="middle" ' + MONO + ' font-size="10" font-weight="700" fill="#566578"');
    // signal cable motor -> controller (dark, not tubing)
    s += P('M' + (cx + 56) + ' ' + (G.motor0 + 20) + ' C ' + (G.W - 30) + ' ' + (G.motor0 + 20) + ', ' + (G.W - 30) + ' ' + (G.head1 + 40) + ', ' + (G.W - 40) + ' ' + G.head1, 'fill="none" stroke="#1e2733" stroke-width="2.6" stroke-linecap="round"');
    // frame
    s += R(0, 0, G.W, G.roof, 'fill="url(#ppNavyV)" stroke="#132845" stroke-width="1"');
    [0, G.W - G.post].forEach(function (x) { s += R(x, 0, G.post, G.bot1, 'fill="url(#ppNavy)" stroke="#132845" stroke-width="1"'); });
    s += R(0, G.bot0, G.W, G.bot1 - G.bot0, 'fill="url(#ppNavyV)" stroke="#132845" stroke-width="1"');
    [8, G.W - 38].forEach(function (x) { s += R(x, G.bot1, 30, G.H - G.bot1, 'rx="3" fill="url(#ppSteelD)" stroke="#3c4553" stroke-width=".8"'); });
    s += R(G.W / 2 - 60, 6, 120, 11, 'rx="2" fill="#e6ebf1" opacity=".95"');
    s += T(G.W / 2, 14.5, '3,000 cc', 'text-anchor="middle" ' + MONO + ' font-size="8.5" font-weight="600" letter-spacing="1.4" fill="#1d3a66"');
    return s;
  }
  function portLine() {
    var s = '';
    s += F.tube(F.path(0, G.portY).H(cx).V(G.capTop).end());
    s += F.tee(G.dpX, G.portY);
    // differential-pressure sensor (chamber vs. atmosphere)
    s += R(G.dpX - 4, G.portY - 22, 8, 14, 'fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".7"') + R(G.dpX - 12, G.portY - 36, 24, 16, 'rx="3" fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1"');
    s += T(G.dpX, G.portY - 25, 'Δp', 'text-anchor="middle" ' + MONO + ' font-size="8.5" font-weight="700" fill="#33404f"');
    s += R(G.post - 4, G.portY - 11, 10, 22, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"') + F.nut(4, G.portY, 'h', .9);
    s += F.nut(cx, G.capTop - 6, 'v', .9);
    return s;
  }

  function chamber(V, cut) {
    var s = '', v = V.gasoVol || 0, pt = pistonTop(v), he = V.gasoMode === 'he';
    var x0 = cut ? cx - G.hw : cx - 11, w = cut ? 2 * G.hw : 22;
    if (v > 1) s += R(x0, G.bore0, w, pt - G.bore0, 'fill="url(#' + (he ? 'fxHe' : 'fxGas') + ')" opacity=".95"');
    if (v > 1 && cut) {
      var t = V.t || 0;
      for (var i = 0; i < 10; i++) { var px = x0 + 8 + (i * 37) % (w - 16), py = G.bore0 + 6 + ((i * 53 + t * 9) % Math.max(6, pt - G.bore0 - 10)); s += C(px, py, 1.5, 'fill="#fff" opacity=".6"'); }
    }
    // piston (+ seals), rod and carriage at the same displacement
    s += R(x0, pt, w, G.pist, 'fill="url(#ppSteelV)" stroke="#2a3443" stroke-width="1"');
    if (cut) { s += R(x0, pt + 4, w, 2.4, 'fill="#1d3a66"') + R(x0, pt + 10, w, 2.4, 'fill="#1d3a66"') + R(cx - G.hw + 4, pt + 1, 2 * G.hw - 8, 2, 'fill="#fff" opacity=".5"'); }
    if (cut) s += R(cx - 5, pt + G.pist, 10, G.bore1 - pt - G.pist, 'fill="url(#ppSteelV)" stroke="#3c4553" stroke-width=".6"');
    return s;
  }
  function carriage(V) {
    var v = V.gasoVol || 0, cy = pistonTop(v) + G.carOff, s = '';
    s += R(cx - 5, G.capBot, 10, cy - G.capBot, 'fill="url(#ppSteelV)" stroke="#3c4553" stroke-width=".6"');
    s += R(cx - 58, cy - 8, 116, 16, 'rx="2" fill="#d99a30" stroke="#7a5212" stroke-width="1"');
    s += R(cx + 20, cy - 10, 18, 20, 'rx="2" fill="#b67a1c" stroke="#7a5212" stroke-width=".8"');
    s += L(cx + 70, cy, cx + 84, cy, 'stroke="#b8434e" stroke-width="2"');
    return s;
  }
  function display(V) {
    var v = V.gasoVol || 0, he = V.gasoMode === 'he', s = '', mv = V.gasoMove || 0;
    s += T(134, 54, 'VOLUME', MONO + ' font-size="9" letter-spacing=".8" fill="#8fb3cc"');
    s += T(298, 72, Math.round(v).toLocaleString('en-US') + '<tspan font-size="11" fill="#8fb3cc"> cc</tspan>', 'text-anchor="end" ' + MONO + ' font-size="22" font-weight="600" fill="' + (he ? '#8fdcff' : v > 0.5 ? '#7ff0bf' : '#5fd4ff') + '"');
    s += T(134, 92, 'GAS', MONO + ' font-size="9" letter-spacing=".8" fill="#8fb3cc"');
    s += T(298, 92, he ? 'HELIUM' : 'FLASH GAS', 'text-anchor="end" ' + MONO + ' font-size="10.5" font-weight="700" letter-spacing=".6" fill="' + (he ? '#8fdcff' : '#7ff0bf') + '"');
    s += T(134, 106, 'P HOLD', MONO + ' font-size="9" letter-spacing=".8" fill="#8fb3cc"');
    s += T(298, 106, 'ATM', 'text-anchor="end" ' + MONO + ' font-size="10" font-weight="700" fill="#7ff0bf"');
    s += C(256, 103, 3, 'fill="#2fbf7f"');
    if (mv) s += T(210, 106, mv > 0 ? '▼ IN' : '▲ OUT', 'text-anchor="middle" ' + MONO + ' font-size="9.5" font-weight="700" fill="#ffc56b"');
    s += C(42, 104, 4, 'fill="' + (mv ? '#2fbf7f' : '#c9d0d9') + '" stroke="#7d8898" stroke-width=".8"');
    return s;
  }
  function valve(V) { return F.valve(G.valveX, G.portY, 'h', (V.valve || {}).gaso || 0, { side: 'down', tag: [0, 34] }); }

  function layers(o) {
    o = o || {};
    var cut = o.view !== 'exterior';
    return [
      { id: 'ga-back', html: back() + headPanel() },
      { id: 'ga-cyl', html: cylinder(cut) },
      { id: 'ga-ch', fn: function (V) { return chamber(V, cut); } },
      { id: 'ga-drv', html: drive(cut) },
      { id: 'ga-car', fn: carriage },
      { id: 'ga-port', html: portLine() },
      { id: 'ga-valve', fn: valve },
      { id: 'ga-disp', fn: display }
    ];
  }

  var LABELS = [
    { id: 'inlet', n: 'Gas port', s: 'in and out · one line', a: [8, 140], p: [-26, 140], an: 'end' },
    { id: 'valve', n: 'Gasometer valve', s: 'isolates the meter', a: [58, 162], p: [-26, 200], an: 'end' },
    { id: 'dp', n: 'Δp sensor', s: 'chamber vs. atmosphere', a: [96, 112], p: [-26, 84], an: 'end' },
    { id: 'chamber', n: 'Measuring chamber', s: 'gas above the piston', a: [cx - 60, 230], p: [-26, 262], an: 'end' },
    { id: 'piston', n: 'Piston', s: 'sealed · moves with the gas', a: [cx - 60, 330], p: [-26, 340], an: 'end' },
    { id: 'screw', n: 'Lead screw drive', s: 'piston rod + carriage', a: [cx - 58, 560], p: [-26, 560], an: 'end' },
    { id: 'motor', n: 'Stepper motor', s: 'driven by the controller', a: [cx + 4, 724], p: [-26, 724], an: 'end' },
    { id: 'display', n: 'Volume display', s: 'displacement → cc', a: [306, 60], p: [360, 52], an: 'start' },
    { id: 'scale', n: 'Volume scale', s: '0 – 3,000 cc', a: [296, 300], p: [360, 300], an: 'start' },
    { id: 'frame', n: 'Frame and cabinet', s: 'floor-standing', a: [322, 600], p: [360, 600], an: 'start' }
  ];

  window.Gasometer = { G: G, RT: RT, layers: layers, pistonTop: pistonTop, LABELS: LABELS, port: { gas: [0, G.portY] } };
})();
