/* Scene — places the equipment, draws the connecting tubing from port anchors, composes the flow routes
   across instruments and renders the flow lanes, the temporary vacuum pump + hose (Stage 2 only), the
   blue gas-collection vessel and the Stage 7 syringe. The main preview and the Details views call the
   same instrument modules (FlashUnit, Gasometer, DensityMeter, Parts, PVTCellArt).

   Modes: 'system' (computer + controller, PVT Cell -> Flash Unit (flask + blue vessel inside) -> Gasometer), 'density' (Stage 7:
   Flash Unit + Density Meter), 'fu' / 'ga' / 'dm' (one instrument, with what it connects to). */
(function () {
  'use strict';
  var F = window.FX, R = F.R, C = F.C, P = F.P, L = F.L, T = F.T, r1 = F.r1, ramp = F.ramp, SANS = F.SANS, MONO = F.MONO;
  var FU = window.FlashUnit, GA = window.Gasometer, DM = window.DensityMeter, PA = window.PVTCellArt, PT = window.Parts;
  var NS = 'pp';

  function tf(at, p) { return [at.x + p[0] * at.s, at.y + p[1] * at.s]; }
  function tgeo(at, g) { return F.geo('', g.pts.map(function (p) { return tf(at, p); })); }
  function rgeo(g) { return F.geo('', g.pts.slice().reverse()); }
  function chain(parts) { var pts = []; parts.forEach(function (g) { if (g) pts = pts.concat(pts.length ? g.pts.slice(1) : g.pts); }); return F.geo('', pts); }
  function place(at) { return 'translate(' + r1(at.x) + ' ' + r1(at.y) + ') scale(' + at.s + ')'; }

  /* placements (world units). floor = 1000 in the system scene */
  var LAYOUT = {
    // left to right: computer + controller, full-size PVT Cell (same scale as the procedure pages' cell views), Flash Unit, Gasometer
    system: { vb: [-6, 372, 1842, 648], floor: 1000, desk: { x: 10, y: 700, s: 0.55, legs: 295 }, cell: { x: 56, y: 433, s: 0.75 }, fu: { x: 840, y: 470, s: 0.68 }, pump: { x: 1392, y: 1000, s: 0.6 }, ga: { x: 1500, y: 467, s: 0.62 } },
    density: { vb: [-10, 180, 1700, 840], floor: 1000, fu: { x: 40, y: 298, s: 0.9 }, dm: { x: 790, y: 353, s: 1.4 } },
    fu: { vb: [-300, -190, 1520, 1010], floor: 780, fu: { x: 0, y: 0, s: 1 }, pump: { x: 1110, y: 780, s: 1 } },
    ga: { vb: [-400, -40, 1340, 920], floor: 860, ga: { x: 0, y: 0, s: 1 } },
    dm: { vb: [-300, -110, 1180, 500], floor: 362, dm: { x: 0, y: 0, s: 1 } }
  };

  /* ------------------------------------------------------------ build */
  function build(host, mode, opt) {
    opt = opt || {};
    var Lo = LAYOUT[mode], vb = opt.vb || Lo.vb;
    var svg = '<svg class="scene-svg" viewBox="' + vb.join(' ') + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + (opt.title || 'Flash Process equipment') + '">';
    svg += '<defs>' + PA.defs(NS, { raw: true }) + F.defs() + '</defs>';
    var layers = [];
    var g = function (id, transform, inner) { return '<g data-l="' + id + '"' + (transform ? ' transform="' + transform + '"' : '') + '>' + (inner || '') + '</g>'; };

    var bg = '';
    if (Lo.floor != null) bg += L(vb[0], Lo.floor, vb[0] + vb[2], Lo.floor, 'stroke="#c9d1db" stroke-width="2"');
    if (Lo.dm && mode === 'density') {
      // bench for the density meter
      var bx0 = Lo.dm.x - 60, bx1 = Lo.dm.x + 640 * Lo.dm.s, by = Lo.dm.y + DM.G.base * Lo.dm.s;
      bg += R(bx0, by, bx1 - bx0, 14, 'fill="url(#fxBench)" stroke="#8a96a6" stroke-width="1"') + R(bx0 + 6, by + 14, bx1 - bx0 - 12, 6, 'fill="url(#ppNavyV)"');
      [bx0 + 14, bx1 - 32].forEach(function (x) { bg += R(x, by + 20, 18, Lo.floor - by - 20, 'fill="url(#ppNavy)"'); });
    }
    svg += g('bg', '', bg);

    // tubing between instruments (anchored to ports)
    var ext = {}, tubes = '';
    if (Lo.cell && Lo.fu) {
      var pr = PA.port({ at: Lo.cell }, 'R'), si = tf(Lo.fu, FU.port.sampleIn), xm = pr[0] + 24;
      ext.sample = F.path(pr[0], pr[1]).H(xm - 10).turn(xm, pr[1], xm, si[1], 10).V(si[1] + 10).turn(xm, si[1], si[0], si[1], 10).H(si[0]).end();
      tubes += F.tube(ext.sample) + F.nut(pr[0] + 6, pr[1], 'h', .9);
    }
    if (Lo.fu && Lo.ga) {
      var go = tf(Lo.fu, FU.port.gasOut), gi = tf(Lo.ga, GA.port.gas), xg = gi[0] - 30;
      ext.gas = F.path(go[0], go[1]).H(xg - 10).turn(xg, go[1], xg, gi[1], 10).V(gi[1] - 10).turn(xg, gi[1], gi[0], gi[1], 10).H(gi[0]).end();
      tubes += F.tube(ext.gas);
    }
    // computer + controller and the signal cable (approved shared desk drawing)
    if (Lo.desk && Lo.cell) {
      layers.push({ id: 'desk', fn: function (V) {
        return PA.desk(NS, { x: Lo.desk.x, y: Lo.desk.y, s: Lo.desk.s, legs: Lo.desk.legs, raw: true, ctl: '5,000',
          rows: [['CELL psig', '5,000', '#7ff0bf'], ['PUMP A cc', (V.pumpA == null ? 80 : V.pumpA).toFixed(1), '#ffc56b'], ['PUMP B cc', '0.0', '#ffc56b'], ['T °C', '114.0', '#7ff0bf']] }) +
          PA.cable({ at: Lo.cell }, Lo.desk, 40);
      } });
      svg += g('desk');
    }
    if (Lo.cell) { layers.push({ id: 'cell', fn: function (V) { return cellMarkup(Lo.cell, V); } }); svg += g('cell'); }
    svg += g('tubes', '', tubes);

    function inst(key, mod, at, view) {
      var ls = mod.layers({ view: view });
      var inner = ls.map(function (l) { if (l.fn) layers.push({ id: key + ':' + l.id, fn: l.fn }); return g(key + ':' + l.id, '', l.html || ''); }).join('');
      return g(key, place(at), inner);
    }
    if (Lo.fu) svg += inst('fu', FU, Lo.fu, opt.fuView || 'internal');
    if (Lo.ga) svg += inst('ga', GA, Lo.ga, opt.gaView || 'internal');
    if (Lo.dm) svg += inst('dm', DM, Lo.dm, opt.dmView || 'internal');

    // temporary vacuum pump + hose (Stage 2 only)
    if (Lo.fu && Lo.pump) {
      layers.push({ id: 'vac', fn: function (V) { return vacMarkup(Lo, V); } });
      svg += g('vac');
    }

    // flow routes (world geometry, assembled from port-anchored pieces) and their timing keyframes
    var routes = {};
    var gaIn = function (k) { return Lo.ga ? tgeo(Lo.ga, GA.RT['in' + k]) : null; };
    if (Lo.fu) {
      var sIn = tgeo(Lo.fu, FU.RT.sIn), vDist = FU.RT.sInValve * Lo.fu.s, pre = 0, parts = [];
      if (Lo.cell) {
        var cr = [[PA.G.x.A, PA.G.bore.top + 4], [PA.G.x.A, PA.G.hy], [PA.G.port.R.x, PA.G.hy]].map(function (p) { return PA.pt({ at: Lo.cell }, p[0], p[1]); });
        var cg = F.geo('', cr); parts.push(cg, ext.sample); pre = cg.L + ext.sample.L;
      }
      parts.push(sIn);
      var sg = chain(parts);
      routes.sample = { g: sg, kind: 'liq', gate: ['pumpA', 'inlet', 'flask'], kf: [[0.15, 0], [0.287, pre + vDist], [0.36, sg.L]] };
      var gOut = tgeo(Lo.fu, FU.RT.gOut);
      var gasG = chain([gOut, ext.gas, gaIn('2k')]);
      routes.gas = { g: gasG, kind: 'gas', gate: ['flask', 'gaso', 'in2k', 'iso2k'], kf: [[0.40, 0], [0.47, gasG.L]] };
      ['1k', '2k'].forEach(function (k) {
        var hg = chain([gaIn(k) && rgeo(gaIn(k)), ext.gas && rgeo(ext.gas), rgeo(gOut)]);
        routes['he' + k] = { g: hg, kind: 'he', gate: ['flask', 'gaso', 'in' + k, 'iso' + k], kf: k === '1k' ? [[0.15, 0], [0.36, hg.L]] : [[0.39, 0], [0.42, hg.L]] };
      });
      // evacuation: every branch of the section between the closed Port R and Gasometer inlet valves
      var hose = Lo.pump ? hoseGeo(Lo) : null, VK = [[0.15, 0], [0.32, 1]];
      var vpieces = [
        { g: chain([tgeo(Lo.fu, FU.RT.vac), hose]), gate: ['flask', 'vac'] },                                   // flask interior, up the shared connection
        { g: chain([ext.sample, tgeo(Lo.fu, FU.RT.vacIn), hose]), gate: ['inlet', 'vac'] },                     // Port R outward side -> sample line -> manifold
        { g: chain([gasVacPart(Lo, ext.gas), tgeo(Lo.fu, FU.RT.vacGas), hose]), gate: ['vac'] },               // Gasometer inlet valve -> line -> manifold
        { g: chain([tgeo(Lo.fu, FU.RT.vacBal), hose]), gate: ['vac'] }                                          // balloon stub (balloon valve closed)
      ];
      routes.vac = { list: vpieces.map(function (v) { return { g: v.g, kind: 'vac', gate: v.gate, need: 'vacHose', kf: VK.map(function (k) { return [k[0], k[1] * v.g.L]; }) }; }) };
      routes.vacSection = [ext.sample, tgeo(Lo.fu, FU.RT.vacIn), tgeo(Lo.fu, FU.RT.vac), gasVacPart(Lo, ext.gas), tgeo(Lo.fu, FU.RT.vacGas), tgeo(Lo.fu, FU.RT.vacBal)].filter(Boolean);
      var vesG = chain([gaIn('2k') && rgeo(gaIn('2k')), ext.gas && rgeo(ext.gas), tgeo(Lo.fu, FU.RT.ves)]);
      routes.vessel = { g: vesG, kind: 'gas', gate: ['gaso', 'in2k', 'iso2k', 'vessel'], kf: [[0.15, 0], [0.40, vesG.L]] };
    } else if (Lo.ga) {
      var g2 = gaIn('2k'), g1 = gaIn('1k');
      routes.gas = { g: g2, kind: 'gas', gate: ['in2k', 'iso2k'], kf: [[0.40, 0], [0.47, g2.L]] };
      routes.he1k = { g: rgeo(g1), kind: 'he', gate: ['in1k', 'iso1k'], kf: [[0.15, 0], [0.36, g1.L]] };
      routes.he2k = { g: rgeo(g2), kind: 'he', gate: ['in2k', 'iso2k'], kf: [[0.39, 0], [0.42, g2.L]] };
      routes.vessel = { g: rgeo(g2), kind: 'gas', gate: ['in2k', 'iso2k'], kf: [[0.15, 0], [0.40, g2.L]] };
    }
    layers.push({ id: 'vsec', fn: function (V) { return vacSection(Lo, routes, V); } });
    svg += g('vsec');
    layers.push({ id: 'lanes', fn: function (V) { return lanes(routes, V); } });
    svg += g('lanes');
    if (Lo.fu && Lo.dm) { layers.push({ id: 'syr', fn: function (V) { return syringeMarkup(Lo, V); } }); svg += g('syr'); }
    else if (Lo.dm) { layers.push({ id: 'syr', fn: function (V) { return syringeAtMeter(Lo, V); } }); svg += g('syr'); }
    if (opt.labels && opt.labelsFn) svg += g('labs', '', opt.labelsFn(Lo, tf));
    else if (opt.labels) { layers.push({ id: 'labs', fn: function (V) { return sceneLabels(mode, Lo, V); } }); svg += g('labs'); }
    svg += '</svg>';
    host.innerHTML = svg;

    var els = {}, last = {};
    host.querySelectorAll('[data-l]').forEach(function (el) { els[el.getAttribute('data-l')] = el; });
    return {
      Lo: Lo, routes: routes,
      update: function (V) {
        layers.forEach(function (l) {
          var m = l.fn(V);
          if (m !== last[l.id]) { last[l.id] = m; els[l.id].innerHTML = m; }
        });
      }
    };
  }

  /* ------------------------------------------------------------ PVT cell (Pump A volume, valves, displays) */
  function cellMarkup(at, V) {
    var fill = Math.max(0, Math.min(1, (V.pumpA == null ? 80 : V.pumpA) / 100)) * 176;          // Main.js fPumpFillH
    var open = (V.valve || {}).pumpA > 0.5;
    var inner = '<rect x="1010" y="219" width="40" height="' + r1(fill) + '" rx="3" fill="#d6a43a"/><rect x="1010" y="219" width="40" height="' + r1(fill) + '" fill="#fff" opacity=".12"/>';
    if (V.ver > 0) { var sy = 219 + fill * ((V.ver * 3) % 1); inner += '<rect x="1010" y="' + r1(sy) + '" width="40" height="3" fill="#2f6fd0" opacity=".7"/>'; }
    return PA.cell(NS, { raw: true, at: at, view: 'cutaway', labels: true, portLabel: { L: 'Port L', R: 'Port R' },
      pistonA: 219 + fill, pistonB: 219, innerA: inner,
      valves: { A: open, R: open }, ports: { L: { plug: true, nut: false }, R: { plug: false, nut: true } },
      disp: { P: '5,000', Pu: 'psig', B: '0.0 cc', A: (V.pumpA == null ? 80 : V.pumpA).toFixed(1) + ' cc', T: '114.0 °C' } });
  }

  /* ------------------------------------------------------------ temporary vacuum pump + hose */
  function hoseGeo(Lo) {
    var a = tf(Lo.fu, FU.port.vac), b = tf(Lo.pump, PT.PG.inlet);
    var k = Lo.fu.s, top = a[1] - 150 * k;
    return F.path(a[0], a[1]).C(a[0], top, b[0], top, b[0], b[1]).end();
  }
  function vacMarkup(Lo, V) {
    var show = V.vacPump || 0, h = V.vacHose || 0;
    if (show <= 0.001 && h <= 0.001) return '';
    var s = '', at = Lo.pump, off = (1 - show) * 140;
    s += '<g transform="translate(' + r1(at.x + off) + ' ' + r1(at.y) + ') scale(' + at.s + ')" opacity="' + r1(show) + '">' + PT.vacPump(V) + '</g>';
    if (h > 0.01) {
      var hg = hoseGeo(Lo), d = hg.d, len = hg.L;
      // hose grows from the pump toward the quick-connect (drawn from the pump end)
      var rev = F.geo('', hg.pts.slice().reverse());
      s += '<g fill="none" stroke-linecap="round"><path d="' + rev.d + '" stroke="#1f2833" stroke-width="10" stroke-dasharray="' + r1(h * len) + ' 9999"/><path d="' + rev.d + '" stroke="#3b4757" stroke-width="7.5" stroke-dasharray="' + r1(h * len) + ' 9999"/></g>';
      if (h > 0.98) { var a = tf(Lo.fu, FU.port.vac), k = Lo.fu.s; s += R(a[0] - 9 * k, a[1] - 14 * k, 18 * k, 16 * k, 'rx="3" fill="#1b1f24" stroke="#000" stroke-width=".8"'); }
    }
    return s;
  }

  // part of the Gasometer line on the evacuated side of the (closed) Gasometer inlet valve, flowing toward the Flash Unit
  function gasVacPart(Lo, ext) {
    if (!ext) return null;
    if (!Lo.ga) return null;
    var vp = tf(Lo.ga, GA.port.valve), pts = ext.pts.slice().reverse().filter(function (q) { return q[0] <= vp[0] - 12 * Lo.ga.s || q[1] !== vp[1]; });
    return F.geo('', [[vp[0] - 12 * Lo.ga.s, vp[1]]].concat(pts));
  }
  // Stage 2: the evacuated section is tinted; the two closed boundary valves are marked
  function vacSection(Lo, routes, V) {
    var a = V.vacTint || 0, s = '';
    if (a <= 0.01 || !routes.vacSection) return '';
    routes.vacSection.forEach(function (g) { s += P(g.d, 'fill="none" stroke="#7d93b8" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" opacity="' + r1(0.28 * a) + '"'); });
    var mark = function (p, txt) { return R(p[0] - 46, p[1] + 16, 92, 15, 'rx="7.5" fill="#fff4e5" stroke="#b0701a" stroke-width=".8" opacity="' + r1(a) + '"') + T(p[0], p[1] + 26.5, txt, 'text-anchor="middle" ' + MONO + ' font-size="8.5" font-weight="700" fill="#8a5410" opacity="' + r1(a) + '"'); };
    if (Lo.cell) { var pq = PA.port({ at: Lo.cell }, 'R'); s += mark([pq[0] + 54, pq[1]], 'BOUNDARY · SHUT'); }
    if (Lo.ga) s += mark(tf(Lo.ga, GA.port.valve), 'BOUNDARY · SHUT');
    return s;
  }

  /* ------------------------------------------------------------ flow lanes */
  function lanes(routes, V) {
    var s = '', fl = V.flow || {}, vv = V.valve || {};
    var one = function (r, k) {
      if (!r.g) return;
      var p = fl[k].p, a = fl[k].a;
      // a closed valve (or a disconnected temporary hose) anywhere on the route stops the flow
      r.gate.forEach(function (gk) { a *= ramp(0.35, 0.65, vv[gk] || 0); });
      if (r.need) a *= (V[r.need] || 0) > 0.98 ? 1 : 0;
      var kf = r.kf, d = 0;
      if (p <= kf[0][0]) return;
      for (var i = 1; i < kf.length; i++) { if (p <= kf[i][0]) { d = kf[i - 1][1] + (kf[i][1] - kf[i - 1][1]) * (p - kf[i - 1][0]) / (kf[i][0] - kf[i - 1][0]); break; } d = kf[i][1]; }
      s += F.lane(r.g, d / r.g.L, V.t, a, r.kind);
    };
    Object.keys(fl).forEach(function (k) {
      var r = routes[k]; if (!r) return;
      (r.list || [r]).forEach(function (x) { if (x.g) one(x, k); });
    });
    return s;
  }

  /* ------------------------------------------------------------ Stage 7 syringe */
  function syringeMarkup(Lo, V) {
    if (!V.syr) return '';
    var q = V.syr.q, sp = tf(Lo.fu, FU.port.sample), inl = tf(Lo.dm, [DM.port.luer[0], DM.port.luer[1] - 2]);
    var x = sp[0], y = sp[1], fill = 0;
    if (q < 0.10) { var a = F.ease(ramp(0, 0.10, q)); y = sp[1] - 110 * (1 - a); x = sp[0] + 90 * (1 - a); }
    else if (q < 0.30) fill = ramp(0.14, 0.26, q);
    else if (q < 0.42) { fill = 1; var b = F.ease(ramp(0.30, 0.42, q)); x = sp[0] + (inl[0] - sp[0]) * b; y = sp[1] + (inl[1] - sp[1]) * b - Math.sin(b * Math.PI) * 120; }
    else { x = inl[0]; y = inl[1]; fill = 1 - ramp(0.42, 0.54, q); }
    var sc = q >= 0.30 ? 1 + 0.25 * ramp(0.30, 0.42, q) : 1;
    return '<g transform="translate(' + r1(x) + ' ' + r1(y) + ') scale(' + r1(sc) + ')">' + PT.syringe(fill, 'down', window.FlashSim.ALIQ_ML.toFixed(1) + ' mL') + '</g>';
  }
  // dm-only view: the syringe is shown already connected at the Luer adapter
  function syringeAtMeter(Lo, V) {
    var q = V.dmQ || 0;
    if (q <= 0.30) return '';
    var p = tf(Lo.dm, [DM.port.luer[0], DM.port.luer[1] - 2]);
    return '<g transform="translate(' + r1(p[0]) + ' ' + r1(p[1]) + ') scale(' + r1(Lo.dm.s) + ')">' + PT.syringe(1 - ramp(0.42, 0.54, q), 'down', window.FlashSim.ALIQ_ML.toFixed(1) + ' mL') + '</g>';
  }

  /* ------------------------------------------------------------ light labels for the overall scenes */
  function sceneLabels(mode, Lo, V) {
    var s = '', lab = function (x, y, n, sub, an) {
      return T(x, y, n, 'text-anchor="' + (an || 'middle') + '" ' + SANS + ' font-size="18" font-weight="700" fill="#1d2836"') + (sub ? T(x, y + 18, sub, 'text-anchor="' + (an || 'middle') + '" ' + SANS + ' font-size="12.5" fill="#566578"') : '');
    };
    if (Lo.cell) { var cp = PA.pt({ at: Lo.cell }, 615, 8); s += lab(cp[0], cp[1], 'PVT Cell', ''); }
    if (Lo.fu) { var f0 = tf(Lo.fu, [FU.G.W / 2, -104]); s += lab(f0[0], f0[1], 'Flash Unit', ''); }
    if (Lo.ga) { var g0 = tf(Lo.ga, [GA.G.W / 2, -16]); s += lab(g0[0], g0[1] - 18, 'Gasometer', ''); }
    if (Lo.dm) { var d0 = tf(Lo.dm, [235, -30]); s += lab(d0[0], d0[1] - 18, 'Density Meter', 'DMA 4100 M–style'); }
    if ((V.vacPump || 0) > 0.3 && Lo.pump) { var p0 = tf(Lo.pump, [0, 0]); p0[1] += 15; s += T(p0[0], p0[1], 'Temporary vacuum pump', 'text-anchor="middle" ' + SANS + ' font-size="12.5" font-weight="700" fill="#2f6fd0" opacity="' + r1(V.vacPump) + '"'); }
    return s;
  }

  window.Scene = { build: build, LAYOUT: LAYOUT, tf: tf };
})();
