/* DensityMeter — DMA 4100 M–style digital density meter (rev. D; general educational drawing).
   Wide light-grey benchtop housing, sloped front with a large touchscreen, thin red accent strip along the
   lower front, side sample inlet/outlet adapters, inlet tube with a Luer adapter for the syringe, outlet
   tube to an external waste container with a red cap.
   Measuring cell: a LONG HORIZONTAL U-tube — two closely spaced legs running across the instrument and a
   rounded return bend at the far (left) end. The internal view shows it across the lower body as an
   enlarged educational view (no exact hidden dimensions are claimed). Sample enters the lower leg from the
   side inlet, passes the bend, returns along the upper leg and leaves by the outlet, so air is pushed out
   ahead of the oil to waste.
   Screen (method "Crude Oil (API)"): four result panels in a 2×2 grid (measured density at the set
   temperature, density at 60 °F, SG 60/60 °F, API gravity at 60 °F), a compact set/actual temperature
   line, a horizontal measuring-cell strip with the same orientation, and a status / progress / Start strip.
   Live state (view model V.dm): phase, inj, flush, air, T, Tset, prog, start, osc, res. Drawing only. */
(function () {
  'use strict';
  var F = window.FX, R = F.R, C = F.C, E = F.E, P = F.P, L = F.L, T = F.T, MONO = F.MONO, SANS = F.SANS, r1 = F.r1;

  var G = {
    W: 620, H: 372, base: 362,
    body: { x0: 0, x1: 470, y0: 30, y1: 356 },
    scr: { x0: 34, x1: 366, y0: 46, y1: 240 },
    cell: { x0: 70, x1: 470, up: 284, lo: 306, bendX: 50 },  // horizontal U-tube: upper leg / lower leg, bend at the left
    inlet: [500, 306], outlet: [500, 284],
    luer: [536, 214], waste: [574, 362]
  };
  var c = G.cell;
  var RT = {};
  // inlet (lower leg, from the right) -> left along the lower leg -> rounded bend -> right along the upper leg -> outlet
  RT.cell = F.path(G.inlet[0], c.lo).H(c.x0).C(c.bendX - 6, c.lo, c.bendX - 6, c.up, c.x0, c.up).H(G.outlet[0]).end();
  RT.inTube = F.path(G.luer[0], G.luer[1]).V(G.inlet[1] - 8).turn(G.luer[0], G.inlet[1], G.inlet[0], G.inlet[1], 8).H(G.inlet[0]).end();
  var wp = [G.waste[0] + window.Parts.WG.ports[1][0], G.waste[1] + window.Parts.WG.ports[1][1]];
  RT.outTube = F.path(G.outlet[0], G.outlet[1]).H(G.outlet[0] + 14).C(G.outlet[0] + 40, G.outlet[1], wp[0], G.outlet[1] - 70, wp[0], wp[1]).end();
  // whole fill path: syringe Luer -> inlet tube -> U-tube -> outlet tube -> waste (one continuous front)
  RT.all = F.geo('', RT.inTube.pts.concat(RT.cell.pts.slice(1), RT.outTube.pts.slice(1)));
  RT.cellFrom = RT.inTube.L / RT.all.L; RT.cellTo = (RT.inTube.L + RT.cell.L) / RT.all.L;

  // oil position along RT.all from the sim's injection / flush progress (the cell stays full until the flush)
  function fillState(dm) {
    var head = RT.cellTo + 0.10 * (1 - RT.cellTo), inj = dm.inj || 0, fl = dm.flush || 0;
    var f = inj * head;
    return { a: fl * 0.97, b: f + fl * (1 - f), waste: 0.12 * F.clamp((inj - 0.9) * 10, 0, 1) + 0.55 * fl };
  }
  function cellFill(dm) {
    var fs = fillState(dm), k = function (v) { return F.clamp((v - RT.cellFrom) / (RT.cellTo - RT.cellFrom), 0, 1); };
    return { a: k(fs.a), b: k(fs.b) };
  }

  function housing(cut) {
    var b = G.body, s = '';
    s += E(b.x1 / 2, G.base + 4, b.x1 / 2 + 10, 6, 'fill="#1b2a40" opacity=".14"');
    s += P('M' + (b.x0 + 8) + ' ' + b.y1 + ' L' + b.x0 + ' ' + (b.y1 - 10) + ' V120 L' + (b.x0 + 34) + ' ' + b.y0 + ' H' + (b.x1 - 34) + ' L' + b.x1 + ' 120 V' + (b.y1 - 10) + ' L' + (b.x1 - 8) + ' ' + b.y1 + ' Z', 'fill="url(#fxDma)" stroke="#8e98a5" stroke-width="1.3"');
    s += P('M' + (b.x0 + 34) + ' ' + b.y0 + ' H' + (b.x1 - 34) + ' L' + (b.x1 - 26) + ' ' + (b.y0 + 10) + ' H' + (b.x0 + 26) + ' Z', 'fill="#c9d0d8" opacity=".9"');
    s += R(b.x0 + 4, b.y1 - 24, b.x1 - b.x0 - 8, 5, 'fill="#c8323c"');                                     // red accent strip
    [24, b.x1 - 56].forEach(function (x) { s += R(x, b.y1, 32, 7, 'rx="2" fill="#2b3036"'); });
    var sc = G.scr;
    s += R(sc.x0 - 10, sc.y0 - 10, sc.x1 - sc.x0 + 20, sc.y1 - sc.y0 + 20, 'rx="8" fill="#1b1f24" stroke="#0b0d10" stroke-width="1.2"');
    s += R(sc.x0, sc.y0, sc.x1 - sc.x0, sc.y1 - sc.y0, 'rx="3" fill="#f4f7fa"');
    // measuring-cell bay across the lower body
    var y0 = c.up - 22, y1 = c.lo + 18;
    if (cut) {
      s += R(c.bendX - 24, y0, G.body.x1 - c.bendX + 18, y1 - y0, 'rx="6" fill="url(#ppHatch2)" opacity=".75" stroke="#7a8594" stroke-width=".8"');   // temperature-control block
      s += R(c.bendX - 18, y0 + 4, G.body.x1 - c.bendX + 8, 5, 'rx="2" fill="#b8434e" opacity=".85"') + R(c.bendX - 18, y1 - 9, G.body.x1 - c.bendX + 8, 5, 'rx="2" fill="#2f6fd0" opacity=".85"');
      s += R(250, y1 - 4, 30, 12, 'rx="2" fill="#2b3644"') + T(265, y1 + 5, 'EX', 'text-anchor="middle" ' + MONO + ' font-size="7.5" font-weight="700" fill="#e6ebf1"');
      s += R(180, y0 - 2, 8, 12, 'rx="3" fill="#e8873a"');                                                        // Pt100
      s += R(c.bendX - 20, y1 - 22, 22, 14, 'rx="2" fill="#cbd2db" stroke="#5d6878" stroke-width=".8"') + T(c.bendX - 9, y1 - 12, 'REF', 'text-anchor="middle" ' + MONO + ' font-size="6.5" font-weight="700" fill="#33404f"');
      s += P(RT.cell.d, 'fill="none" stroke="#7fa6c2" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"') + P(RT.cell.d, 'fill="none" stroke="#f3f8fc" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"');
    } else {
      s += R(c.bendX - 24, y0, G.body.x1 - c.bendX + 18, y1 - y0, 'rx="6" fill="#d9dee5" stroke="#aab4c0" stroke-width="1"');
      s += T(c.bendX - 10, y0 + 16, 'MEASURING CELL', MONO + ' font-size="8" font-weight="600" letter-spacing="1" fill="#7d8898"');
    }
    s += T(36, b.y1 - 8, 'DIGITAL DENSITY METER', MONO + ' font-size="8.5" font-weight="600" letter-spacing="1.2" fill="#566578"');
    // side sample adapters
    s += P('M' + b.x1 + ' 250 L' + (b.x1 + 22) + ' 258 V330 L' + b.x1 + ' 338 Z', 'fill="#b6bec8" stroke="#8e98a5" stroke-width="1"');
    [G.inlet, G.outlet].forEach(function (p) { s += R(p[0] - 10, p[1] - 8, 14, 16, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"'); });
    return s;
  }
  function tubes(V) {
    var s = '', dm = V.dm || {};
    s += F.tube(RT.inTube, 'ptfe') + F.tube(RT.outTube, 'ptfe');
    s += R(G.luer[0] - 6, G.luer[1], 12, 12, 'rx="2" fill="#e9edf2" stroke="#5d6878" stroke-width=".8"');
    s += '<g transform="translate(' + G.waste[0] + ' ' + G.waste[1] + ')">' + window.Parts.waste(fillState(dm).waste) + '</g>';
    return s;
  }
  // sample along the whole path: one continuous front (tubes always; the U-tube only in the internal view)
  function fluid(V, cut) {
    var s = '', dm = V.dm || {}, g = RT.all, fs = fillState(dm), A = fs.a * g.L, B = fs.b * g.L, off = 0;
    if (B > A + 0.5) {
      [[RT.inTube, true], [RT.cell, cut], [RT.outTube, true]].forEach(function (pc) {
        var gg = pc[0], a0 = F.clamp(A - off, 0, gg.L), b0 = F.clamp(B - off, 0, gg.L);
        if (pc[1] && b0 > a0 + .5) s += '<path d="' + gg.d + '" fill="none" stroke="#d99a26" stroke-width="' + (gg === RT.cell ? 6.4 : 3.6) + '" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 ' + r1(a0) + ' ' + r1(b0 - a0) + ' 99999"/>';
        off += gg.L;
      });
    }
    if (dm.air > 0.01) {
      var t = V.t || 0;
      for (var i = 0; i < 7; i++) { var sd = B + 8 + ((t * 50 + i * 16) % 110); if (sd < g.L) { var off2 = sd - RT.inTube.L, inCell = off2 > 0 && off2 < RT.cell.L; if (inCell && !cut) continue; var q = g.at(sd); s += C(q.x, q.y, 2, 'fill="#fff" stroke="#7d93b8" stroke-width=".8" opacity="' + r1(dm.air) + '"'); } }
    }
    if (dm.osc > 0 && cut) {
      var o = Math.sin((V.t || 0) * 40) * 1.4;
      s += '<path d="M' + (c.x0 + 30) + ' ' + (c.lo + 9 + o) + ' H' + (G.body.x1 - 30) + '" stroke="#2f6fd0" stroke-width="1" opacity=".55" stroke-dasharray="3 5"/>';
    }
    return s;
  }
  function screen(V) {
    var dm = V.dm || {}, sc = G.scr, s = '', ph = dm.phase || 'await', r = dm.res || {}, x0 = sc.x0 + 8, x1 = sc.x1 - 8;
    var ST = { await: ['Awaiting sample', '#566578'], fill: ['Filling measuring cell', '#b0701a'], temp: ['Stabilizing temperature', '#b0701a'], meas: ['Measuring', '#2f6fd0'], calc: ['Calculating', '#2f6fd0'], done: ['Finished', '#1d8a5a'] }[ph];
    // header
    s += R(sc.x0, sc.y0, sc.x1 - sc.x0, 22, 'rx="3" fill="#1d3a66"');
    s += T(x0 + 2, sc.y0 + 15.5, 'Crude Oil (API)', SANS + ' font-size="12.5" font-weight="700" fill="#fff"');
    s += R(x1 - 120, sc.y0 + 4, 120, 14, 'rx="7" fill="' + ST[1] + '"') + T(x1 - 60, sc.y0 + 14, ST[0].toUpperCase(), 'text-anchor="middle" ' + MONO + ' font-size="7.2" font-weight="700" fill="#fff"');
    // four result panels, 2 × 2
    var tset = (dm.Tset || 25).toFixed(2);
    var P4 = [
      ['Measured Density', r.rho == null ? '—' : r.rho.toFixed(5), 'g/cm³', 'at ' + tset + ' °C'],
      ['Density at 60 °F', r.rho60 == null ? '—' : r.rho60.toFixed(5), 'g/cm³', 'reference 60 °F'],
      ['Specific Gravity', r.sg == null ? '—' : r.sg.toFixed(4), '', '60/60 °F'],
      ['API Gravity', r.api == null ? '—' : r.api.toFixed(1), '°API', 'at 60 °F']
    ];
    var pw = (x1 - x0 - 6) / 2, ph2 = 40;
    P4.forEach(function (p, i) {
      var px = x0 + (i % 2) * (pw + 6), py = sc.y0 + 27 + Math.floor(i / 2) * (ph2 + 5), done = p[1] !== '—', hi = i === 3 && done;
      s += R(px, py, pw, ph2, 'rx="4" fill="' + (hi ? '#e5f4ec' : '#ffffff') + '" stroke="' + (hi ? '#7cc4a0' : '#d4dbe4') + '" stroke-width="1"');
      s += T(px + 7, py + 12, p[0], SANS + ' font-size="9" font-weight="700" fill="#33404f"');
      s += T(px + pw - 7, py + 12, p[3], 'text-anchor="end" ' + MONO + ' font-size="7.2" fill="#7d8898"');
      s += T(px + 7, py + 33, p[1], MONO + ' font-size="17" font-weight="700" fill="' + (done ? (hi ? '#14603f' : '#16202f') : '#9aa6b5') + '"');
      if (p[2]) s += T(px + pw - 7, py + 33, p[2], 'text-anchor="end" ' + MONO + ' font-size="9" fill="#566578"');
    });
    // compact temperature line
    var ty = sc.y0 + 27 + 2 * (ph2 + 5) + 9;
    s += T(x0, ty, 'Set T ' + tset + ' °C', MONO + ' font-size="8.5" fill="#566578"');
    var Tok = dm.T != null && Math.abs(dm.T - (dm.Tset || 25)) < 0.005;
    s += T(x0 + 104, ty, 'Actual T ' + (dm.T == null ? '—' : dm.T.toFixed(2)) + ' °C', MONO + ' font-size="8.5" font-weight="700" fill="' + (Tok ? '#1d8a5a' : '#b0701a') + '"');
    // horizontal measuring-cell strip (same orientation as the internal view)
    var uy0 = ty + 8, uy1 = uy0 + 12, ux0 = x0 + 14, ux1 = x1 - 6;
    var ud = 'M' + ux1 + ' ' + uy1 + ' H' + ux0 + ' C' + (ux0 - 12) + ' ' + uy1 + ' ' + (ux0 - 12) + ' ' + uy0 + ' ' + ux0 + ' ' + uy0 + ' H' + ux1;
    s += R(x0 - 2, uy0 - 6, x1 - x0 + 4, uy1 - uy0 + 12, 'rx="3" fill="#1b2533"');
    s += '<path d="' + ud + '" fill="none" stroke="#5d6f86" stroke-width="6" stroke-linecap="round"/>';
    var cf = cellFill(dm);
    if (cf.b > cf.a + 0.002) s += '<path d="' + ud + '" fill="none" stroke="#e0a83a" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="0 ' + r1(cf.a * 100) + ' ' + r1((cf.b - cf.a) * 100) + ' 300"/>';
    // status strip: text, progress, Start / Finished
    var sy = sc.y1 - 7;
    s += T(x0, sy - 6, ST[0] + (cf.b > 0.99 && ph !== 'await' && cf.a < 0.01 ? ' · cell full, no bubbles' : ''), SANS + ' font-size="8.5" font-weight="600" fill="' + ST[1] + '"');
    s += R(x0, sy - 2, 210, 4, 'rx="2" fill="#d9e0e8"') + R(x0, sy - 2, 210 * F.clamp(dm.prog || 0, 0, 1), 4, 'rx="2" fill="' + ST[1] + '"');
    var on = ph === 'done', pressed = dm.start > 0 && dm.start < 1;
    s += R(x1 - 64, sy - 17, 64, 19, 'rx="4" fill="' + (on ? '#1d8a5a' : pressed ? '#1d3a66' : '#2f6fd0') + '"');
    s += T(x1 - 32, sy - 4, on ? 'Finished' : 'Start', 'text-anchor="middle" ' + SANS + ' font-size="9.5" font-weight="700" fill="#fff"');
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
    { id: 'screen', n: 'Touchscreen', s: 'Crude Oil (API) method', a: [G.scr.x0 - 10, 58], p: [-40, 56], an: 'end' },
    { id: 'resDensity', n: 'Measured density', s: 'at the set temperature', a: [G.scr.x0 + 4, 92], p: [-40, 104], an: 'end' },
    { id: 'resSG', n: 'Specific gravity result', s: 'SG 60/60 °F', a: [G.scr.x0 + 4, 136], p: [-40, 152], an: 'end' },
    { id: 'cellStrip', n: 'Measuring-cell strip', s: 'horizontal U-tube on screen', a: [G.scr.x0 + 4, 192], p: [-40, 200], an: 'end' },
    { id: 'utube', n: 'Horizontal U-tube cell', s: 'enlarged educational view', a: [c.bendX - 4, 295], p: [-40, 262], an: 'end' },
    { id: 'tempCtl', n: 'Temperature-control region', s: 'Peltier block · set 25.00 °C', a: [c.bendX - 24, 316], p: [-40, 320], an: 'end' },
    { id: 'resAPI', n: 'API gravity result', s: '°API at 60 °F', a: [G.scr.x1 - 6, 136], p: [690, 120], an: 'start' },
    { id: 'syringe', n: 'Syringe', s: 'manual injection', a: [G.luer[0] - 12, 140], p: [690, 180], an: 'start' },
    { id: 'outlet', n: 'Sample outlet', s: 'upper leg → waste', a: [G.outlet[0] + 4, G.outlet[1]], p: [690, 236], an: 'start' },
    { id: 'inlet', n: 'Sample inlet', s: 'lower leg, from the syringe', a: [G.inlet[0] + 4, G.inlet[1]], p: [690, 290], an: 'start' },
    { id: 'wasteLine', n: 'Waste line', s: 'outlet → waste', a: [586, 260], p: [690, 340], an: 'start' },
    { id: 'waste', n: 'Waste container', s: 'red cap', a: [G.waste[0] + 30, 330], p: [690, 392], an: 'start' }
  ];

  window.DensityMeter = { G: G, RT: RT, layers: layers, LABELS: LABELS, port: { luer: G.luer } };
})();
