/* Gasometer — two-section gas meter (rev. B): a tall stainless cabinet with a 2,000 cc section (left)
   and a 1,000 cc section (right); combined 3,000 cc, the existing simulator capacity.
   Each section: volume display (cc), temperature display (°C), compound gauge, inlet / vent /
   isolation valves with black handles and a printed connection diagram, a tall transparent measuring
   chamber with a graduated scale, and a lower manual control knob.

   Measurement logic drawn (no internal mechanism claimed): the total reading is the existing simulator
   value. It is split across the sections in a fixed order — the 2,000 cc section is used first, the
   1,000 cc section takes the remainder — so left + right always equals the total shown elsewhere.
   The chamber fill is shown as a tinted gas column with a boundary line; the knob turns with the
   section volume. How the real knob and chamber work internally is not modelled.

   Live state (view model V): V.gaso2k, V.gaso1k (cc), V.gasoMode ('he' | 'gas'), V.gasoT (°C example),
   V.valve.{in2k, iso2k, in1k, iso1k}. Drawing only. */
(function () {
  'use strict';
  var F = window.FX, R = F.R, C = F.C, E = F.E, P = F.P, L = F.L, T = F.T, MONO = F.MONO, SANS = F.SANS, r1 = F.r1;

  var G = {
    inV: -48,                                                // Gasometer inlet isolation valve on the external gas line
    W: 520, H: 860, foot: 840, supY: 254, valveY: 292, isoY: 330,
    ch0: 372, ch1: 744,
    sec: [
      { k: '2k', cap: 2000, x0: 20, x1: 250, cx: 135, hw: 52, lab: '2,000 cc' },
      { k: '1k', cap: 1000, x0: 270, x1: 500, cx: 385, hw: 36, lab: '1,000 cc' }
    ]
  };
  G.sec.forEach(function (s) { s.inX = s.x0 + 40; s.ventX = s.x0 + 196; });
  function gasH(sec, v) { return (G.ch1 - G.ch0 - 8) * F.clamp(v / sec.cap, 0, 1); }

  /* routes: external inlet (left side) -> supply line -> section inlet valve -> junction -> isolation -> chamber top */
  var RT = {};
  G.sec.forEach(function (s) {
    RT['in' + s.k] = F.path(G.inV - 26, G.supY).H(s.inX - 8).turn(s.inX, G.supY, s.inX, G.valveY, 8).V(G.valveY - 8).turn(s.inX, G.valveY, s.cx, G.valveY, 8)
      .H(s.cx - 8).turn(s.cx, G.valveY, s.cx, G.ch0 + 4, 8).V(G.ch0 + 4).end();
    RT['out' + s.k] = F.geo('', RT['in' + s.k].pts.slice().reverse());
  });

  function cabinet() {
    var s = '', w = G.W;
    s += E(w / 2, G.H + 2, w / 2 + 12, 8, 'fill="#1b2a40" opacity=".12"');
    s += R(0, 0, w, G.foot, 'rx="6" fill="url(#fxBrushed)" stroke="#8e98a5" stroke-width="1.4"');
    s += R(6, 6, w - 12, G.foot - 12, 'rx="4" fill="none" stroke="#fff" stroke-width="1" opacity=".7"');
    // plinth + feet
    s += R(0, G.foot - 30, w, 30, 'fill="#b6bec8" stroke="#8e98a5" stroke-width="1"');
    [14, w - 54].forEach(function (x) { s += R(x, G.foot, 40, G.H - G.foot, 'rx="3" fill="#2b3036"'); });
    // the two control sections
    G.sec.forEach(function (sc) {
      s += R(sc.x0, 16, sc.x1 - sc.x0, 336, 'rx="5" fill="url(#fxCaseH)" stroke="#8592a3" stroke-width="1.2"');
      [[sc.x0 + 8, 24], [sc.x1 - 8, 24], [sc.x0 + 8, 344], [sc.x1 - 8, 344]].forEach(function (q) { s += C(q[0], q[1], 2.6, 'fill="#9aa5b3" stroke="#5d6878" stroke-width=".6"'); });
      s += T((sc.x0 + sc.x1) / 2, 36, sc.lab + ' SECTION', 'text-anchor="middle" ' + MONO + ' font-size="10" font-weight="700" letter-spacing="1" fill="#1d3a66"');
      // volume + temperature displays
      s += R(sc.x0 + 16, 44, sc.x1 - sc.x0 - 32, 48, 'rx="4" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width="1"') + R(sc.x0 + 20, 48, sc.x1 - sc.x0 - 40, 40, 'rx="3" fill="url(#ppScreen)"');
      s += T(sc.x0 + 26, 60, 'VOLUME', MONO + ' font-size="8" letter-spacing=".8" fill="#8fb3cc"');
      s += R(sc.x0 + 16, 98, sc.x1 - sc.x0 - 32, 30, 'rx="4" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width="1"') + R(sc.x0 + 20, 102, sc.x1 - sc.x0 - 40, 22, 'rx="3" fill="url(#ppScreen)"');
      s += T(sc.x0 + 26, 117, 'TEMP', MONO + ' font-size="8" letter-spacing=".8" fill="#8fb3cc"');
      // compound gauge
      var gx = (sc.x0 + sc.x1) / 2, gy = 186;
      s += C(gx, gy, 48, 'fill="url(#ppSteelV)" stroke="#2a3443" stroke-width="1.2"') + C(gx, gy, 41, 'fill="#fbfcfd" stroke="#5d6878" stroke-width="1"');
      for (var i = 0; i <= 12; i++) {
        var a = (-225 + i * 22.5) * Math.PI / 180, big = i % 3 === 0;
        s += L(gx + Math.cos(a) * (big ? 31 : 34), gy + Math.sin(a) * (big ? 31 : 34), gx + Math.cos(a) * 39, gy + Math.sin(a) * 39, 'stroke="' + (i < 6 ? '#b8434e' : '#1d2836') + '" stroke-width="' + (big ? 1.4 : .8) + '"');
      }
      s += T(gx, gy + 18, 'inHg | psi', 'text-anchor="middle" ' + MONO + ' font-size="7.5" fill="#566578"');
      s += T(gx, gy - 14, 'COMPOUND', 'text-anchor="middle" ' + MONO + ' font-size="6.5" letter-spacing=".6" fill="#566578"');
      // printed connection diagram + valve names
      s += T(sc.inX, G.valveY + 32, 'INLET', 'text-anchor="middle" ' + MONO + ' font-size="8" font-weight="600" fill="#33404f"');
      s += T(sc.ventX, G.valveY + 32, 'VENT', 'text-anchor="middle" ' + MONO + ' font-size="8" font-weight="600" fill="#33404f"');
      s += T(sc.cx + 30, G.isoY + 4, 'ISOL.', MONO + ' font-size="8" font-weight="600" fill="#33404f"');
      s += P('M' + sc.cx + ' ' + G.valveY + ' H' + sc.ventX + ' M' + sc.ventX + ' ' + G.valveY + ' V' + 270 + ' H' + (sc.ventX + 22), 'fill="none" stroke="#33404f" stroke-width="1.4"');
      s += T(sc.ventX + 24, 266, 'atm', MONO + ' font-size="7.5" fill="#566578"');
    });
    // external inlet bulkhead (left side) + supply line
    s += F.tube(F.path(0, G.supY).H(G.sec[1].inX).end());
    G.sec.forEach(function (sc) { s += F.tube(F.path(sc.inX, G.supY).V(G.valveY - 8).turn(sc.inX, G.valveY, sc.cx, G.valveY, 8).H(sc.cx - 8).turn(sc.cx, G.valveY, sc.cx, G.ch0, 8).V(G.ch0).end()); s += F.tee(sc.inX, G.supY); });
    s += F.tube(F.path(G.inV - 26, G.supY).H(-8).end());
    s += R(-8, G.supY - 11, 14, 22, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"') + F.nut(-12, G.supY, 'h', .9);
    s += T(12, G.supY - 14, 'GAS IN', MONO + ' font-size="8.5" font-weight="700" letter-spacing=".6" fill="#33404f"');
    return s;
  }
  function chambers(cut) {
    var s = '';
    G.sec.forEach(function (sc) {
      var x0 = sc.cx - sc.hw, x1 = sc.cx + sc.hw;
      // flanges + tie rods
      s += R(x0 - 14, G.ch0 - 12, 2 * sc.hw + 28, 12, 'rx="2" fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1"');
      s += R(x0 - 14, G.ch1, 2 * sc.hw + 28, 12, 'rx="2" fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1"');
      [x0 - 8, x1 + 8].forEach(function (x) { s += R(x - 2, G.ch0, 4, G.ch1 - G.ch0, 'fill="url(#ppSteelV)" stroke="#3c4553" stroke-width=".5"'); });
      // transparent chamber (back)
      s += R(x0, G.ch0, 2 * sc.hw, G.ch1 - G.ch0, 'fill="url(#fxCyl)" stroke="#7fa6c2" stroke-width="1.4"');
      // graduated scale (outside, left of the chamber)
      var step = sc.cap / 8;
      for (var v = 0; v <= sc.cap; v += step) {
        var y = G.ch0 + 4 + gasH(sc, v), big = (v / step) % 2 === 0;
        s += L(x0 - 26, y, x0 - (big ? 12 : 18), y, 'stroke="#2a3443" stroke-width="' + (big ? 1.2 : .8) + '"');
        if (big) s += T(x0 - 30, y + 3.5, v.toLocaleString('en-US'), 'text-anchor="end" ' + MONO + ' font-size="9" fill="#33404f"');
      }
    });
    return s;
  }
  function chamberFill(V) {
    var s = '', he = V.gasoMode === 'he', t = V.t || 0;
    G.sec.forEach(function (sc) {
      var v = V['gaso' + sc.k] || 0, h = gasH(sc, v), x0 = sc.cx - sc.hw + 3, w = 2 * sc.hw - 6;
      if (h > 0.5) {
        s += R(x0, G.ch0 + 3, w, h, 'fill="url(#' + (he ? 'fxHe' : 'fxGas') + ')" opacity=".85"');
        for (var i = 0; i < 6; i++) { var px = x0 + 6 + (i * 29) % (w - 12), py = G.ch0 + 6 + ((i * 41 + t * 8) % Math.max(4, h - 6)); s += C(px, py, 1.5, 'fill="#fff" opacity=".6"'); }
      }
      // gas boundary
      s += R(x0, G.ch0 + 3 + h, w, 5, 'fill="#5d6878" opacity=".85"') + R(x0, G.ch0 + 3 + h, w, 1.4, 'fill="#fff" opacity=".6"');
      // highlights (front glass)
      s += R(sc.cx - sc.hw + 8, G.ch0 + 4, 5, G.ch1 - G.ch0 - 8, 'rx="2.5" fill="#fff" opacity=".45"');
    });
    return s;
  }
  function knobs(V) {
    var s = '';
    G.sec.forEach(function (sc) {
      var v = V['gaso' + sc.k] || 0, ang = 720 * v / sc.cap, y = 798;
      s += R(sc.cx - 6, G.ch1 + 12, 12, y - G.ch1 - 34, 'fill="url(#ppSteelV)" stroke="#3c4553" stroke-width=".6"');
      s += C(sc.cx, y, 26, 'fill="#1b1f24" stroke="#000" stroke-width="1.2"') + C(sc.cx, y, 18, 'fill="url(#fxBlack)"');
      s += '<g transform="rotate(' + r1(ang) + ' ' + sc.cx + ' ' + y + ')">' + R(sc.cx - 3, y - 24, 6, 12, 'rx="2" fill="#c9d0d9"') + '</g>';
    });
    return s;
  }
  function displays(V) {
    var s = '', he = V.gasoMode === 'he';
    G.sec.forEach(function (sc) {
      var v = V['gaso' + sc.k] || 0;
      // V.gasoTxt: gas received but its volume is a required input (2,000 cc section display)
      if (V.gasoTxt && sc.k === '2k') s += T(sc.x1 - 26, 80, V.gasoTxt, 'text-anchor="end" ' + MONO + ' font-size="12" font-weight="700" fill="#ffc56b"');
      else s += T(sc.x1 - 26, 82, Math.round(v).toLocaleString('en-US') + '<tspan font-size="10" fill="#8fb3cc"> cc</tspan>', 'text-anchor="end" ' + MONO + ' font-size="20" font-weight="600" fill="' + (v < 0.5 ? '#5fd4ff' : he ? '#8fdcff' : '#7ff0bf') + '"');
      s += T(sc.x1 - 26, 119, (V.gasoT || 22).toFixed(1) + '<tspan font-size="9" fill="#8fb3cc"> °C</tspan>', 'text-anchor="end" ' + MONO + ' font-size="13" font-weight="600" fill="#ffc56b"');
      s += T(sc.x0 + 26, 82, V.gasoTxt && sc.k === '2k' ? 'GAS' : he && v > 0.5 ? 'He' : v > 0.5 ? 'GAS' : '', MONO + ' font-size="10" font-weight="700" fill="' + (he ? '#8fdcff' : '#7ff0bf') + '"');
      // gauge needle: the meter holds the chamber near atmospheric, so the needle stays near 0 (moves slightly while gas flows)
      var gx = (sc.x0 + sc.x1) / 2, gy = 186, act = (V.valve || {})['iso' + sc.k] || 0, a = (-90 + act * 6 * Math.sin((V.t || 0) * 3)) * Math.PI / 180;
      s += L(gx, gy, gx + Math.cos(a) * 34, gy + Math.sin(a) * 34, 'stroke="#b8434e" stroke-width="1.8" stroke-linecap="round"') + C(gx, gy, 3, 'fill="#1d2836"');
    });
    return s;
  }
  function valves(V) {
    var s = '', v = V.valve || {};
    s += F.valve(G.inV, G.supY, 'h', v.gaso || 0, { side: 'up', tag: [0, -42] });
    G.sec.forEach(function (sc) {
      s += F.valve(sc.inX, (G.supY + G.valveY) / 2 + 2, 'v', v['in' + sc.k] || 0, { side: 'right', ring: true });
      s += F.valve(sc.ventX, G.valveY, 'h', 0, { side: 'down' });
      s += F.valve(sc.cx, G.isoY, 'v', v['iso' + sc.k] || 0, { side: 'right' });
    });
    return s;
  }

  function layers(o) {
    var cut = (o || {}).view !== 'exterior';
    return [
      { id: 'ga-cab', html: cabinet() },
      { id: 'ga-ch', html: chambers(cut) },
      { id: 'ga-fill', fn: chamberFill },
      { id: 'ga-knob', fn: knobs },
      { id: 'ga-valve', fn: valves },
      { id: 'ga-disp', fn: displays }
    ];
  }

  var LABELS = [
    { id: 'mainInlet', n: 'Gasometer inlet valve', s: 'isolates the meter · closed in Stage 2', a: [G.inV, G.supY - 22], p: [-90, 190], an: 'end' },
    { id: 'inlets', n: 'Inlets', s: 'gas in · section inlet valves', a: [-10, G.supY + 8], p: [-90, G.supY + 30], an: 'end' },
    { id: 'isolation', n: 'Isolation valves', s: 'one per chamber', a: [G.sec[0].cx - 10, G.isoY], p: [-90, G.isoY + 50], an: 'end' },
    { id: 'chamber2k', n: '2,000 cc chamber', s: 'used first', a: [G.sec[0].cx - G.sec[0].hw - 30, 450], p: [-90, 440], an: 'end' },
    { id: 'chambers', n: 'Transparent chambers', s: 'gas column + boundary', a: [G.sec[0].cx - G.sec[0].hw, 560], p: [-90, 540], an: 'end' },
    { id: 'scales', n: 'Graduated scales', s: 'cc', a: [G.sec[0].cx - G.sec[0].hw - 20, 650], p: [-90, 640], an: 'end' },
    { id: 'knobs', n: 'Lower control knobs', s: 'manual volume control', a: [G.sec[0].cx - 26, 798], p: [-90, 790], an: 'end' },
    { id: 'volDisp', n: 'Volume displays', s: 'cc per section', a: [G.sec[1].x1 - 16, 68], p: [560, 60], an: 'start' },
    { id: 'tempDisp', n: 'Temperature displays', s: 'example ambient value', a: [G.sec[1].x1 - 16, 113], p: [560, 116], an: 'start' },
    { id: 'gauges', n: 'Compound gauges', s: 'vacuum | pressure', a: [(G.sec[1].x0 + G.sec[1].x1) / 2 + 48, 186], p: [560, 186], an: 'start' },
    { id: 'vents', n: 'Vents', s: 'to atmosphere · closed', a: [G.sec[1].ventX + 14, G.valveY], p: [560, 262], an: 'start' },
    { id: 'chamber1k', n: '1,000 cc chamber', s: 'takes gas above 2,000 cc', a: [G.sec[1].cx + G.sec[1].hw + 10, 470], p: [560, 450], an: 'start' },
    { id: 'total', n: 'Combined 3,000 cc', s: 'total = 2,000 cc + 1,000 cc readings', a: [G.W, 700], p: [560, 700], an: 'start' }
  ];

  // split of the existing total reading across the two sections (2,000 cc first)
  function split(total) { var a = Math.min(Math.max(total, 0), 2000); return { k2: a, k1: Math.max(0, total - 2000) }; }

  window.Gasometer = { G: G, RT: RT, layers: layers, LABELS: LABELS, split: split, port: { gas: [G.inV - 26, G.supY], valve: [G.inV, G.supY] } };
})();
