/* DensityMeter — one benchtop oscillating U-tube density meter (general educational instrument,
   not a specific manufacturer model).

   Principle drawn (simplified schematic): the sample fills a glass U-tube held in a thermostated
   block. The tube is excited to oscillate; its period depends on the mass, and therefore the
   density, of the liquid inside. After temperature equilibrium the meter reads the period and
   converts it to density with its calibration constants. A built-in bubble check / camera view lets
   the operator confirm a bubble-free filling. Density at the measuring temperature is then converted
   to the 60 °F reference (petroleum measurement tables) to give SG 60/60 °F and °API.

   Live state (view model V.dm): fill (0..1 U-tube filled), T (°C shown), phase, prog, res {rho, T, sg, api}.
   Drawing only: values come from sim.js. */
(function () {
  'use strict';
  var F = window.FX, R = F.R, C = F.C, E = F.E, P = F.P, L = F.L, T = F.T, MONO = F.MONO, SANS = F.SANS, r1 = F.r1;

  var G = {
    W: 480, H: 300, base: 300,
    body: { x0: 0, x1: 480, y0: 70, y1: 286 },
    cell: { x0: 28, x1: 214, y0: 106, y1: 264 },
    inlet: [168, 86], outlet: [74, 86],
    legA: 140, legB: 102, tubeTop: 130, tubeBot: 236,
    scr: { x0: 236, x1: 460, y0: 84, y1: 246 },
    waste: { x: -66, y0: 206, y1: 292 }
  };
  var RT = {};
  // inlet Luer -> leg A down -> bend -> leg B up -> outlet Luer
  RT.fill = F.path(G.inlet[0], G.inlet[1]).V(112).turn(G.inlet[0], 118, G.legA, 118, 5).H(G.legA + 4).turn(G.legA, 118, G.legA, G.tubeTop, 4).V(G.tubeBot - 19)
    .C(G.legA, G.tubeBot + 2, G.legB, G.tubeBot + 2, G.legB, G.tubeBot - 19).V(118 + 4).turn(G.legB, 118, G.outlet[0], 118, 4).H(G.outlet[0] + 5).turn(G.outlet[0], 118, G.outlet[0], G.inlet[1], 5).V(G.inlet[1]).end();
  RT.waste = F.path(G.outlet[0], G.inlet[1] - 14).C(G.outlet[0], 30, G.waste.x + 6, 40, G.waste.x + 6, G.waste.y0 + 10).end();

  function body(cut) {
    var b = G.body, s = '';
    s += E(G.W / 2, b.y1 + 8, G.W / 2 + 6, 7, 'fill="#1b2a40" opacity=".12"');
    s += P('M' + (b.x0 + 10) + ' ' + b.y1 + ' L' + b.x0 + ' ' + (b.y1 - 8) + ' V' + (b.y0 + 14) + ' Q' + b.x0 + ' ' + b.y0 + ' ' + (b.x0 + 14) + ' ' + b.y0 + ' H' + (b.x1 - 14) + ' Q' + b.x1 + ' ' + b.y0 + ' ' + b.x1 + ' ' + (b.y0 + 14) + ' V' + (b.y1 - 8) + ' L' + (b.x1 - 10) + ' ' + b.y1 + ' Z', 'fill="url(#fxCase)" stroke="#8592a3" stroke-width="1.3"');
    s += R(b.x0 + 14, b.y0 + 3, b.x1 - b.x0 - 28, 3, 'rx="1.5" fill="#fff" opacity=".9"');
    s += R(b.x0, b.y1 - 22, b.x1 - b.x0, 14, 'fill="url(#ppNavyV)" opacity=".92"');
    s += T(b.x0 + 18, b.y1 - 12, 'DENSITY METER · OSCILLATING U-TUBE', MONO + ' font-size="8.5" font-weight="600" letter-spacing="1.1" fill="#e6ebf1"');
    [24, b.x1 - 48].forEach(function (x) { s += R(x, b.y1 - 6, 24, 12, 'rx="3" fill="url(#ppSteelD)" stroke="#3c4553" stroke-width=".8"'); });
    // measuring-cell bay with its window
    var c = G.cell;
    s += R(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0, 'rx="6" fill="#d7dde5" stroke="#8592a3" stroke-width="1"');
    s += R(c.x0 + 10, c.y0 + 12, c.x1 - c.x0 - 20, c.y1 - c.y0 - 24, 'rx="4" fill="' + (cut ? '#eef3f8' : '#25303d') + '" stroke="#5d6878" stroke-width="1"');
    if (cut) {
      // thermostated block (Peltier) shown in section, around the U-tube
      s += R(G.legB - 22, G.tubeTop - 8, G.legA - G.legB + 44, G.tubeBot - G.tubeTop + 26, 'rx="6" fill="url(#ppHatch2)" opacity=".7" stroke="#7a8594" stroke-width=".8"');
      s += R(G.legB - 34, G.tubeTop + 4, 10, G.tubeBot - G.tubeTop - 4, 'rx="2" fill="#b8434e" opacity=".8"') + R(G.legA + 24, G.tubeTop + 4, 10, G.tubeBot - G.tubeTop - 4, 'rx="2" fill="#2f6fd0" opacity=".8"');
      // exciter / pickup and Pt100
      s += R((G.legA + G.legB) / 2 - 9, G.tubeBot + 6, 18, 12, 'rx="2" fill="#2b3644"') + T((G.legA + G.legB) / 2, G.tubeBot + 15, 'EX', 'text-anchor="middle" ' + MONO + ' font-size="7" font-weight="700" fill="#e6ebf1"');
      s += R(G.legA + 8, G.tubeTop + 22, 6, 30, 'rx="3" fill="#e8873a"');
      // reference oscillator
      s += R(c.x1 - 44, c.y1 - 46, 26, 20, 'rx="3" fill="#cbd2db" stroke="#5d6878" stroke-width=".8"') + T(c.x1 - 31, c.y1 - 33, 'REF', 'text-anchor="middle" ' + MONO + ' font-size="7" font-weight="700" fill="#33404f"');
    } else {
      s += R(c.x0 + 14, c.y0 + 16, 40, c.y1 - c.y0 - 32, 'fill="#fff" opacity=".06"');
    }
    // inlet / outlet Luer adapters on top of the cell bay
    [G.inlet, G.outlet].forEach(function (p, i) {
      s += R(p[0] - 7, p[1], 14, G.cell.y0 - p[1] + 2, 'fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"');
      s += P('M' + (p[0] - 6) + ' ' + p[1] + ' L' + (p[0] - 4) + ' ' + (p[1] - 12) + ' H' + (p[0] + 4) + ' L' + (p[0] + 6) + ' ' + p[1] + ' Z', 'fill="#e9edf2" stroke="#5d6878" stroke-width=".8"');
    });
    // touchscreen bezel
    var sc = G.scr;
    s += R(sc.x0 - 8, sc.y0 - 8, sc.x1 - sc.x0 + 16, sc.y1 - sc.y0 + 16, 'rx="8" fill="#2b3340" stroke="#11161d" stroke-width="1.2"');
    s += R(sc.x0, sc.y0, sc.x1 - sc.x0, sc.y1 - sc.y0, 'rx="3" fill="url(#fxScreenG)"');
    s += R(sc.x0 + 2, sc.y0 + 2, 70, sc.y1 - sc.y0 - 4, 'fill="#fff" opacity=".03"');
    return s;
  }
  // U-tube glass + sample filling
  function utube(V, cut) {
    var s = '', dm = V.dm || {}, f = dm.fill || 0, g = RT.fill;
    var glass = '<path d="' + g.d + '" fill="none" stroke="' + (cut ? '#7fa6c2' : '#6c7f93') + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="' + (cut ? .9 : .5) + '"/>' +
      '<path d="' + g.d + '" fill="none" stroke="' + (cut ? '#f3f8fc' : '#3a4553') + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
    s += glass;
    if (f > 0.001) s += '<path d="' + g.d + '" fill="none" stroke="#d99a26" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + r1(f * g.L) + ' 9999"/>';
    if (dm.osc > 0 && cut) {
      // oscillation shown as a small lateral shimmer of the U-tube bend (illustrative)
      var a = Math.sin((V.t || 0) * 40) * 1.6 * dm.osc;
      s += '<path d="M' + (G.legA + a) + ' ' + (G.tubeBot - 30) + ' C ' + (G.legA + a) + ' ' + (G.tubeBot + 2) + ', ' + (G.legB + a) + ' ' + (G.tubeBot + 2) + ', ' + (G.legB + a) + ' ' + (G.tubeBot - 30) + '" fill="none" stroke="#2f6fd0" stroke-width="1.2" opacity=".6"/>';
    }
    return s;
  }
  function waste(V) {
    var s = '', w = G.waste, f = (V.dm || {}).waste || 0;
    s += F.tube(RT.waste, 'ptfe');
    s += P('M' + (w.x - 26) + ' ' + w.y0 + ' L' + (w.x - 22) + ' ' + w.y1 + ' H' + (w.x + 34) + ' L' + (w.x + 38) + ' ' + w.y0, 'fill="url(#fxGlass)" stroke="#7fa6c2" stroke-width="1.4"');
    if (f > 0) s += R(w.x - 21, w.y1 - 4 - 10 * f, 54, 10 * f + 3, 'fill="url(#fxOil)" opacity=".9"');
    s += T(w.x + 6, w.y1 + 14, 'waste', 'text-anchor="middle" ' + SANS + ' font-size="10" fill="#566578"');
    return s;
  }
  function screen(V) {
    var dm = V.dm || {}, sc = G.scr, s = '', x0 = sc.x0 + 12, x1 = sc.x1 - 12;
    s += T(x0, sc.y0 + 18, 'DENSITY · API', MONO + ' font-size="9" letter-spacing=".9" fill="#7f9bbd"');
    s += T(x1, sc.y0 + 18, (dm.Tset || 20).toFixed(2) + ' °C set', 'text-anchor="end" ' + MONO + ' font-size="9" fill="#7f9bbd"');
    s += L(x0, sc.y0 + 25, x1, sc.y0 + 25, 'stroke="#2c3d52" stroke-width="1"');
    var ph = dm.phase || 'ready';
    var msg = { ready: 'Ready — inject sample', load: 'Filling the U-tube…', bubble: 'Filling check: no bubbles', temp: 'Temperature equilibrium…', meas: 'Measuring period…', done: 'Result' }[ph] || '';
    s += T(x0, sc.y0 + 42, msg, SANS + ' font-size="11.5" font-weight="600" fill="' + (ph === 'done' ? '#7ff0bf' : '#e6ebf1') + '"');
    var row = function (y, k, v, u, col) { return T(x0, y, k, MONO + ' font-size="9.5" fill="#8fb3cc"') + T(x1 - 40, y, v, 'text-anchor="end" ' + MONO + ' font-size="15" font-weight="600" fill="' + (col || '#5fd4ff') + '"') + T(x1, y, u, 'text-anchor="end" ' + MONO + ' font-size="9" fill="#8fb3cc"'); };
    var T0 = dm.T == null ? null : dm.T;
    s += row(sc.y0 + 66, 'T cell', T0 == null ? '—' : T0.toFixed(2), '°C', Math.abs((T0 || 0) - (dm.Tset || 20)) < 0.005 ? '#7ff0bf' : '#ffc56b');
    var r = dm.res || {};
    s += row(sc.y0 + 90, 'ρ at T', r.rho == null ? '—' : r.rho.toFixed(5), 'g/cm³', '#ffc56b');
    s += row(sc.y0 + 114, 'SG 60/60°F', r.sg == null ? '—' : r.sg.toFixed(4), '', '#5fd4ff');
    s += row(sc.y0 + 138, 'API gravity', r.api == null ? '—' : r.api.toFixed(1), '°API', '#7ff0bf');
    // progress bar
    var pw = x1 - x0;
    s += R(x0, sc.y1 - 10, pw, 3, 'rx="1.5" fill="#22344a"') + R(x0, sc.y1 - 10, pw * F.clamp(dm.prog || 0, 0, 1), 3, 'rx="1.5" fill="' + (ph === 'done' ? '#2fbf7f' : '#5fd4ff') + '"');
    return s;
  }

  function layers(o) {
    o = o || {};
    var cut = o.view !== 'exterior';
    return [
      { id: 'dm-waste', fn: waste },
      { id: 'dm-body', html: body(cut) },
      { id: 'dm-tube', fn: function (V) { return utube(V, cut); } },
      { id: 'dm-scr', fn: screen }
    ];
  }

  var LABELS = [
    { id: 'inlet', n: 'Sample inlet', s: 'Luer · syringe', a: [168, 76], p: [168, -40], an: 'middle' },
    { id: 'outlet', n: 'Sample outlet', s: 'to waste', a: [74, 76], p: [40, -40], an: 'middle' },
    { id: 'utube', n: 'U-tube measuring cell', s: 'oscillating glass tube', a: [G.legB, 180], p: [-140, 132], an: 'end' },
    { id: 'thermo', n: 'Thermostat block', s: 'Peltier · Pt100', a: [G.legB - 30, 200], p: [-140, 186], an: 'end' },
    { id: 'exciter', n: 'Exciter / pickup', s: 'drives and reads oscillation', a: [121, 252], p: [-140, 240], an: 'end' },
    { id: 'waste', n: 'Waste container', s: 'flushed sample', a: [-40, 286], p: [-140, 300], an: 'end' },
    { id: 'screen', n: 'Touchscreen', s: 'progress and results', a: [460, 120], p: [520, 120], an: 'start' },
    { id: 'ref', n: 'Reference oscillator', s: 'drift compensation', a: [184, 228], p: [520, 228], an: 'start' }
  ];

  window.DensityMeter = { G: G, RT: RT, layers: layers, LABELS: LABELS, port: { inlet: G.inlet, outlet: G.outlet } };
})();
