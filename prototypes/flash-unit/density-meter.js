/* DensityMeter — DMA 4100 M–style digital density meter (rev. B; general educational drawing).
   Wide light-grey benchtop housing, sloped front with a large colour touchscreen, thin red accent strip
   along the lower front, side sample inlet/outlet assembly, inlet tube with a Luer adapter for the
   syringe, outlet tube to an external waste container with a red cap.
   Internal view: the oscillating U-tube in its temperature-control block, filled from the lower (inlet)
   adapter so air is displaced up and out through the outlet to waste.
   Screen (method "Crude Oil (API)"): Density, API SG 60 °F, API Density 60 °F, API Gravity 60 °F,
   Density set temperature, actual density temperature, U-tube cell view, status / progress, Start.
   Live state (view model V.dm): phase, fill, air, flush, waste, T, Tset, prog, start, osc, res. Drawing only. */
(function () {
  'use strict';
  var F = window.FX, R = F.R, C = F.C, E = F.E, P = F.P, L = F.L, T = F.T, MONO = F.MONO, SANS = F.SANS, r1 = F.r1;

  var G = {
    W: 620, H: 320, base: 312,
    body: { x0: 0, x1: 470, y0: 30, y1: 306 },
    scr: { x0: 34, x1: 366, y0: 50, y1: 250 },
    inlet: [500, 222], outlet: [500, 172], legA: 438, legB: 406, bend: 266,
    luer: [536, 128], waste: [574, 312]
  };
  var RT = {};
  RT.cell = F.path(G.inlet[0], G.inlet[1]).H(G.legA + 6).turn(G.legA, G.inlet[1], G.legA, G.bend, 6).V(G.bend - 14)
    .C(G.legA, G.bend + 6, G.legB, G.bend + 6, G.legB, G.bend - 14).V(G.outlet[1] + 6).turn(G.legB, G.outlet[1], G.outlet[0], G.outlet[1], 6).H(G.outlet[0]).end();
  RT.inTube = F.path(G.luer[0], G.luer[1]).V(G.inlet[1] - 8).turn(G.luer[0], G.inlet[1], G.inlet[0], G.inlet[1], 8).H(G.inlet[0]).end();
  var wp = [G.waste[0] + window.Parts.WG.ports[1][0], G.waste[1] + window.Parts.WG.ports[1][1]];
  RT.outTube = F.path(G.outlet[0], G.outlet[1]).H(G.outlet[0] + 30).C(G.outlet[0] + 60, G.outlet[1], wp[0], G.outlet[1] - 30, wp[0], wp[1]).end();
  // whole fill path: syringe Luer -> inlet tube -> U-tube -> outlet tube -> waste
  RT.all = F.geo('', RT.inTube.pts.concat(RT.cell.pts.slice(1), RT.outTube.pts.slice(1)));
  RT.cellFrom = RT.inTube.L / RT.all.L; RT.cellTo = (RT.inTube.L + RT.cell.L) / RT.all.L;

  // oil position along RT.all from the sim's injection / flush progress
  function fillState(dm) {
    var head = RT.cellTo + 0.10 * (1 - RT.cellTo), inj = dm.inj || 0, fl = dm.flush || 0;
    var f = inj * head;
    return { a: fl * 0.97, b: f + fl * (1 - f), waste: 0.12 * F.clamp((inj - 0.9) * 10, 0, 1) + 0.55 * fl };
  }
  function housing(cut) {
    var b = G.body, s = '';
    s += E(b.x1 / 2, G.base + 4, b.x1 / 2 + 10, 6, 'fill="#1b2a40" opacity=".14"');
    // main body with a sloped top-front edge
    s += P('M' + (b.x0 + 8) + ' ' + b.y1 + ' L' + b.x0 + ' ' + (b.y1 - 10) + ' V120 L' + (b.x0 + 34) + ' ' + b.y0 + ' H' + (b.x1 - 34) + ' L' + b.x1 + ' 120 V' + (b.y1 - 10) + ' L' + (b.x1 - 8) + ' ' + b.y1 + ' Z', 'fill="url(#fxDma)" stroke="#8e98a5" stroke-width="1.3"');
    s += P('M' + (b.x0 + 34) + ' ' + b.y0 + ' H' + (b.x1 - 34) + ' L' + (b.x1 - 26) + ' ' + (b.y0 + 10) + ' H' + (b.x0 + 26) + ' Z', 'fill="#c9d0d8" opacity=".9"');
    s += R(b.x0 + 4, b.y1 - 28, b.x1 - b.x0 - 8, 5, 'fill="#c8323c"');                                     // red accent strip
    [24, b.x1 - 56].forEach(function (x) { s += R(x, b.y1, 32, 7, 'rx="2" fill="#2b3036"'); });
    // touchscreen bezel + glass
    var sc = G.scr;
    s += R(sc.x0 - 10, sc.y0 - 10, sc.x1 - sc.x0 + 20, sc.y1 - sc.y0 + 20, 'rx="8" fill="#1b1f24" stroke="#0b0d10" stroke-width="1.2"');
    s += R(sc.x0, sc.y0, sc.x1 - sc.x0, sc.y1 - sc.y0, 'rx="3" fill="#f4f7fa"');
    s += T(36, b.y1 - 34, 'DIGITAL DENSITY METER', MONO + ' font-size="8.5" font-weight="600" letter-spacing="1.2" fill="#566578"');
    // side sample assembly
    s += P('M' + b.x1 + ' 136 L' + (b.x1 + 22) + ' 146 V256 L' + b.x1 + ' 266 Z', 'fill="#b6bec8" stroke="#8e98a5" stroke-width="1"');
    [G.inlet, G.outlet].forEach(function (p) { s += R(p[0] - 10, p[1] - 8, 14, 16, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"'); });
    if (cut) {
      // temperature-control block (Peltier) around the U-tube, shown in section
      s += R(G.legB - 22, G.outlet[1] - 18, G.legA - G.legB + 44, G.bend - G.outlet[1] + 34, 'rx="6" fill="url(#ppHatch2)" opacity=".8" stroke="#7a8594" stroke-width=".8"');
      s += R(G.legB - 30, G.outlet[1] - 10, 6, G.bend - G.outlet[1] + 18, 'rx="2" fill="#b8434e" opacity=".85"') + R(G.legA + 24, G.outlet[1] - 10, 6, G.bend - G.outlet[1] + 18, 'rx="2" fill="#2f6fd0" opacity=".85"');
    }
    return s;
  }
  function tubes(V) {
    var s = '', dm = V.dm || {};
    s += F.tube(RT.inTube, 'ptfe') + F.tube(RT.outTube, 'ptfe');
    // Luer adapter on the inlet tube (syringe connects here)
    s += R(G.luer[0] - 6, G.luer[1], 12, 12, 'rx="2" fill="#e9edf2" stroke="#5d6878" stroke-width=".8"');
    s += window.Parts.waste(fillState(dm).waste).replace(/^/, '<g transform="translate(' + G.waste[0] + ' ' + G.waste[1] + ')">') + '</g>';
    return s;
  }
  // sample in the tubes and U-tube: oil front advances along RT.all; air is pushed ahead toward waste
  function fluid(V, cut) {
    var s = '', dm = V.dm || {}, g = RT.all, fs = fillState(dm), f = fs.b, fl = fs.a;
    var cellG = RT.cell;
    if (cut) s += '<path d="' + cellG.d + '" fill="none" stroke="#7fa6c2" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="' + cellG.d + '" fill="none" stroke="#f3f8fc" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>';
    if (f > fl + 0.001) {
      var A = fl * g.L, B = f * g.L, off = 0;
      [[RT.inTube, true], [RT.cell, cut], [RT.outTube, true]].forEach(function (pc) {
        var gg = pc[0], a0 = F.clamp(A - off, 0, gg.L), b0 = F.clamp(B - off, 0, gg.L);
        if (pc[1] && b0 > a0 + .5) s += '<path d="' + gg.d + '" fill="none" stroke="#d99a26" stroke-width="' + (gg === RT.cell ? 5 : 3.6) + '" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 ' + r1(a0) + ' ' + r1(b0 - a0) + ' 99999"/>';
        off += gg.L;
      });
    }
    if (dm.air > 0.01) {
      // air displaced ahead of the oil front (small grey dots moving toward the outlet)
      var t = V.t || 0;
      for (var i = 0; i < 6; i++) { var sd = f * g.L + 8 + ((t * 40 + i * 14) % 80); if (sd < g.L) { var q = g.at(sd); s += C(q.x, q.y, 1.8, 'fill="#fff" stroke="#7d93b8" stroke-width=".8" opacity="' + r1(dm.air) + '"'); } }
    }
    if (dm.osc > 0 && cut) {
      var o = Math.sin((V.t || 0) * 40) * 1.6;
      s += '<path d="M' + (G.legA - 1) + ' ' + (G.bend - 40) + ' C ' + G.legA + ' ' + (G.bend + 6 + o) + ', ' + G.legB + ' ' + (G.bend + 6 + o) + ', ' + (G.legB + 1) + ' ' + (G.bend - 40) + '" fill="none" stroke="#2f6fd0" stroke-width="1.2" opacity=".7"/>';
    }
    return s;
  }
  function screen(V) {
    var dm = V.dm || {}, sc = G.scr, s = '', x0 = sc.x0 + 10, xr = sc.x0 + 238, ph = dm.phase || 'await', r = dm.res || {};
    var ST = { await: ['Awaiting sample', '#566578'], fill: ['Filling measuring cell', '#b0701a'], temp: ['Stabilizing temperature', '#b0701a'], meas: ['Measuring', '#2f6fd0'], calc: ['Calculating', '#2f6fd0'], done: ['Finished', '#1d8a5a'] }[ph];
    s += R(sc.x0, sc.y0, sc.x1 - sc.x0, 24, 'rx="3" fill="#1d3a66"');
    s += T(x0, sc.y0 + 17, 'Crude Oil (API)', SANS + ' font-size="13" font-weight="700" fill="#fff"');
    s += R(sc.x1 - 128, sc.y0 + 4, 120, 16, 'rx="8" fill="' + ST[1] + '"') + T(sc.x1 - 68, sc.y0 + 15.5, ST[0].toUpperCase(), 'text-anchor="middle" ' + MONO + ' font-size="7.6" font-weight="700" letter-spacing=".3" fill="#fff"');
    var rows = [
      ['Density', r.rho == null ? '—' : r.rho.toFixed(5), 'g/cm³'],
      ['API SG 60 °F', r.sg == null ? '—' : r.sg.toFixed(4), ''],
      ['API Density 60 °F', r.rho60 == null ? '—' : r.rho60.toFixed(5), 'g/cm³'],
      ['API Gravity 60 °F', r.api == null ? '—' : r.api.toFixed(1), '°API'],
      ['Density set T', (dm.Tset || 25).toFixed(2), '°C'],
      ['Actual density T', dm.T == null ? '—' : dm.T.toFixed(2), '°C']
    ];
    rows.forEach(function (rw, i) {
      var y = sc.y0 + 44 + i * 23, hi = i === 3 && r.api != null;
      s += R(x0 - 4, y - 15, xr - x0 - 4, 21, 'rx="2" fill="' + (hi ? '#e5f4ec' : i % 2 ? '#ffffff' : '#eef2f6') + '"');
      s += T(x0, y, rw[0], SANS + ' font-size="11" fill="#33404f"');
      s += T(xr - 48, y, rw[1], 'text-anchor="end" ' + MONO + ' font-size="13" font-weight="700" fill="' + (rw[1] === '—' ? '#9aa6b5' : hi ? '#14603f' : '#16202f') + '"');
      s += T(xr - 44, y, rw[2], MONO + ' font-size="9" fill="#566578"');
    });
    // measuring-cell view: U-tube status
    var ux = sc.x0 + 250, uy = sc.y0 + 32, uw = 70, uh = 104;
    s += R(ux, uy, uw, uh, 'rx="3" fill="#1b2533"');
    var ud = 'M' + (ux + 22) + ' ' + (uy + 10) + ' V' + (uy + 70) + ' Q' + (ux + 22) + ' ' + (uy + 84) + ' ' + (ux + 32) + ' ' + (uy + 84) + ' Q' + (ux + 42) + ' ' + (uy + 84) + ' ' + (ux + 42) + ' ' + (uy + 70) + ' V' + (uy + 10);
    s += '<path d="' + ud + '" fill="none" stroke="#5d6f86" stroke-width="7" stroke-linecap="round"/>';
    var fs = fillState(dm), cf = F.clamp((fs.b - RT.cellFrom) / (RT.cellTo - RT.cellFrom), 0, 1) * (1 - F.clamp((fs.a - RT.cellFrom) / (RT.cellTo - RT.cellFrom), 0, 1));
    if (cf > 0.01) s += '<path d="' + ud + '" fill="none" stroke="#e0a83a" stroke-width="4.5" stroke-linecap="round" pathLength="100" stroke-dasharray="' + r1(cf * 100) + ' 200"/>';
    s += T(ux + uw / 2, uy + uh + 11, cf > .99 ? 'no bubbles' : 'U-tube', 'text-anchor="middle" ' + MONO + ' font-size="7.5" fill="#566578"');
    // progress + Start
    var py = sc.y1 - 16;
    s += R(x0, py, 214, 6, 'rx="3" fill="#d9e0e8"') + R(x0, py, 214 * F.clamp(dm.prog || 0, 0, 1), 6, 'rx="3" fill="' + ST[1] + '"');
    s += T(x0, py - 5, ST[0], SANS + ' font-size="10" font-weight="600" fill="' + ST[1] + '"');
    var on = ph === 'done', pressed = dm.start > 0 && dm.start < 1;
    s += R(sc.x1 - 76, py - 14, 66, 22, 'rx="4" fill="' + (on ? '#1d8a5a' : pressed ? '#1d3a66' : '#2f6fd0') + '"');
    s += T(sc.x1 - 43, py + 2, on ? 'Finished' : 'Start', 'text-anchor="middle" ' + SANS + ' font-size="10" font-weight="700" fill="#fff"');
    return s;
  }

  function layers(o) {
    var cut = (o || {}).view !== 'exterior';
    return [
      { id: 'dm-body', html: housing(cut) },
      { id: 'dm-tube', fn: tubes },
      { id: 'dm-fluid', fn: function (V) { return fluid(V, cut); } },
      { id: 'dm-scr', fn: screen }
    ];
  }

  var LABELS = [
    { id: 'screen', n: 'Touchscreen', s: 'Crude Oil (API) method', a: [G.scr.x0 - 10, 64], p: [-40, 60], an: 'end' },
    { id: 'resDensity', n: 'Density result', s: 'at the set temperature', a: [G.scr.x0 + 4, G.scr.y0 + 40], p: [-40, 112], an: 'end' },
    { id: 'resSG', n: 'Specific gravity result', s: 'API SG 60/60 °F', a: [G.scr.x0 + 4, G.scr.y0 + 63], p: [-40, 164], an: 'end' },
    { id: 'resAPI', n: 'API gravity result', s: '°API at 60 °F', a: [G.scr.x0 + 4, G.scr.y0 + 109], p: [-40, 216], an: 'end' },
    { id: 'tempCtl', n: 'Temperature-control region', s: 'Peltier block · set 25.00 °C', a: [G.legB - 22, 286], p: [-40, 290], an: 'end' },
    { id: 'syringe', n: 'Syringe', s: 'manual injection', a: [G.luer[0] - 12, 60], p: [G.luer[0] - 40, -66], an: 'middle' },
    { id: 'utube', n: 'Oscillating U-tube cell', s: 'internal measuring cell', a: [G.legA + 2, 236], p: [700, 238], an: 'start' },
    { id: 'inlet', n: 'Sample inlet', s: 'lower side adapter', a: [G.inlet[0] + 4, G.inlet[1]], p: [700, 282], an: 'start' },
    { id: 'outlet', n: 'Sample outlet', s: 'upper side adapter', a: [G.outlet[0] + 4, G.outlet[1] - 4], p: [700, 144], an: 'start' },
    { id: 'wasteLine', n: 'Waste line', s: 'outlet → waste', a: [556, 150], p: [700, 96], an: 'start' },
    { id: 'waste', n: 'Waste container', s: 'red cap', a: [G.waste[0] + 30, 250], p: [700, 330], an: 'start' }
  ];

  window.DensityMeter = { G: G, RT: RT, layers: layers, LABELS: LABELS, port: { luer: G.luer } };
})();
