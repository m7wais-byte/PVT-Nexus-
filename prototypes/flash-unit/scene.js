/* Scene — places the instruments, draws the connecting tubing from their port anchors, composes the
   flow routes across instruments and renders flow lanes, the Stage 7 syringe and simple labels.
   The same instrument modules (FlashUnit, Gasometer, DensityMeter, PVTCellArt) are used here and in
   the Details views, so geometry and connections are identical everywhere.

   Modes: 'system' (PVT Cell -> Flash Unit -> Gasometer), 'density' (Stage 7: Flash Unit + Density
   Meter, enlarged), 'fu' / 'ga' / 'dm' (one instrument). */
(function () {
  'use strict';
  var F = window.FX, R = F.R, C = F.C, P = F.P, L = F.L, T = F.T, r1 = F.r1, ramp = F.ramp, SANS = F.SANS, MONO = F.MONO;
  var FU = window.FlashUnit, GA = window.Gasometer, DM = window.DensityMeter, PA = window.PVTCellArt;
  var NS = 'pp';

  function tf(at, p) { return [at.x + p[0] * at.s, at.y + p[1] * at.s]; }
  function tgeo(at, g) { return F.geo('', g.pts.map(function (p) { return tf(at, p); })); }
  function rgeo(g) { return F.geo('', g.pts.slice().reverse()); }
  function chain(parts) { var pts = []; parts.forEach(function (g) { pts = pts.concat(pts.length ? g.pts.slice(1) : g.pts); }); return F.geo('', pts); }
  function place(at) { return 'translate(' + r1(at.x) + ' ' + r1(at.y) + ') scale(' + at.s + ')'; }

  /* placements per mode (world units) */
  var LAYOUT = {
    system: { vb: [-6, 170, 1500, 880], cell: { x: -140, y: 547, s: 0.6 }, fu: { x: 500, y: 228, s: 1 }, ga: { x: 1196, y: 344, s: 0.85 }, bench: [480, 1140, 820], floor: 1000 },
    density: { vb: [-10, 80, 1430, 710], fu: { x: 40, y: 120, s: 1 }, dm: { x: 790, y: 337, s: 1.25 }, bench: [10, 1410, 712], floor: 780 },
    fu: { vb: [-20, -10, 700, 640], fu: { x: 30, y: 10, s: 1 }, bench: [10, 670, 602] },
    ga: { vb: [-20, -10, 420, 800], ga: { x: 40, y: 10, s: 1 } },
    dm: { vb: [-110, -20, 680, 360], dm: { x: 30, y: 0, s: 1 }, bench: [-110, 560, 300] }
  };

  /* ------------------------------------------------------------ build */
  function build(host, mode, opt) {
    opt = opt || {};
    var Lo = LAYOUT[mode], vb = opt.vb || Lo.vb;
    var svg = '<svg class="scene-svg" viewBox="' + vb.join(' ') + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + (opt.title || 'Flash Process equipment') + '">';
    svg += '<defs>' + PA.defs(NS, { raw: true }) + F.defs() + '</defs>';
    var layers = [];   // { el id, fn | html }
    var g = function (id, transform, inner) { return '<g data-l="' + id + '"' + (transform ? ' transform="' + transform + '"' : '') + '>' + (inner || '') + '</g>'; };

    // floor and bench
    var bg = '';
    if (Lo.floor) bg += L(vb[0], Lo.floor, vb[0] + vb[2], Lo.floor, 'stroke="#c9d1db" stroke-width="2"');
    if (Lo.bench) {
      var b = Lo.bench;
      bg += R(b[0], b[2], b[1] - b[0], 14, 'fill="url(#fxBench)" stroke="#8a96a6" stroke-width="1"') + R(b[0] + 6, b[2] + 14, b[1] - b[0] - 12, 6, 'fill="url(#ppNavyV)"');
      if (Lo.floor) [b[0] + 14, b[1] - 32].forEach(function (x) { bg += R(x, b[2] + 20, 18, Lo.floor - b[2] - 20, 'fill="url(#ppNavy)"') + R(x - 5, Lo.floor - 6, 28, 6, 'rx="2" fill="#8794a5"'); });
    }
    svg += g('bg', '', bg);

    // tubing between instruments (anchored to ports)
    var ext = {}, tubes = '';
    if (Lo.cell && Lo.fu) {
      var pr = PA.port({ at: Lo.cell }, 'R'), si = tf(Lo.fu, FU.port.sampleIn), xm = pr[0] + 26;
      ext.sample = F.path(pr[0], pr[1]).H(xm - 10).turn(xm, pr[1], xm, si[1], 10).V(si[1] + 10).turn(xm, si[1], si[0], si[1], 10).H(si[0]).end();
      tubes += F.tube(ext.sample) + F.nut(pr[0] + 6, pr[1], 'h', .9);
    }
    if (Lo.fu && Lo.ga) {
      var go = tf(Lo.fu, FU.port.gasOut), gi = tf(Lo.ga, GA.port.gas), xg = (go[0] + gi[0]) / 2;
      ext.gas = F.path(go[0], go[1]).H(xg - 10).turn(xg, go[1], xg, gi[1], 10).V(gi[1] - 10).turn(xg, gi[1], gi[0], gi[1], 10).H(gi[0]).end();
      tubes += F.tube(ext.gas);
    }

    // PVT cell (approved shared drawing) — re-rendered only when its inputs change
    if (Lo.cell) layers.push({ id: 'cell', fn: function (V) { return cellMarkup(Lo.cell, V); } });
    if (Lo.cell) svg += g('cell');
    svg += g('tubes', '', tubes);

    function inst(key, mod, at, view) {
      var ls = mod.layers({ view: view });
      var inner = ls.map(function (l) { if (l.fn) layers.push({ id: key + ':' + l.id, fn: l.fn }); return g(key + ':' + l.id, '', l.html || ''); }).join('');
      return g(key, place(at), inner);
    }
    if (Lo.fu) svg += inst('fu', FU, Lo.fu, opt.fuView || 'internal');
    if (Lo.ga) svg += inst('ga', GA, Lo.ga, opt.gaView || 'cutaway');
    if (Lo.dm) svg += inst('dm', DM, Lo.dm, opt.dmView || 'cutaway');

    // flow routes (world geometry, assembled from port-anchored pieces) and their timing keyframes
    var routes = {};
    if (Lo.fu) {
      var sIn = tgeo(Lo.fu, FU.RT.sIn), vDist = FU.RT.sInValve * Lo.fu.s;
      var parts = [], pre = 0;
      if (Lo.cell) {
        var cr = [[PA.G.x.A, PA.G.bore.top + 4], [PA.G.x.A, PA.G.hy], [PA.G.port.R.x, PA.G.hy]].map(function (p) { return PA.pt({ at: Lo.cell }, p[0], p[1]); });
        var cg = F.geo('', cr); parts.push(cg, ext.sample); pre = cg.L + ext.sample.L;
      }
      parts.push(sIn);
      var sg = chain(parts);
      routes.sample = { g: sg, kind: 'liq', gate: ['pumpA', 'inlet'], kf: [[0.15, 0], [0.287, pre + vDist], [0.36, sg.L]] };
      var gOut = tgeo(Lo.fu, FU.RT.gOut), gaPort = Lo.ga ? tgeo(Lo.ga, GA.RT.port) : null;
      var gasG = chain(Lo.ga ? [gOut, ext.gas, gaPort] : [gOut]);
      routes.gas = { g: gasG, kind: 'gas', gate: ['gaso'], kf: [[0.40, 0], [0.47, gasG.L]] };
      var heG = chain(Lo.ga ? [rgeo(gaPort), rgeo(ext.gas), rgeo(gOut)] : [rgeo(gOut)]);
      routes.he = { g: heG, kind: 'he', gate: ['gaso'], kf: [[0.15, 0], [0.36, heG.L]] };
      var vg = tgeo(Lo.fu, FU.RT.vac);
      routes.vac = { g: vg, kind: 'vac', gate: ['vac'], kf: [[0.15, 0], [0.38, vg.L]] };
      var bg2 = chain(Lo.ga ? [rgeo(gaPort), rgeo(ext.gas), tgeo(Lo.fu, FU.RT.bal)] : [tgeo(Lo.fu, FU.RT.bal)]);
      routes.balloon = { g: bg2, kind: 'gas', gate: ['gaso', 'bal'], kf: [[0.15, 0], [0.40, bg2.L]] };
    } else if (Lo.ga) {
      var gp = tgeo(Lo.ga, GA.RT.port);
      routes.gas = { g: gp, kind: 'gas', gate: ['gaso'], kf: [[0.40, 0], [0.47, gp.L]] };
      routes.he = { g: rgeo(gp), kind: 'he', gate: ['gaso'], kf: [[0.15, 0], [0.36, gp.L]] };
      routes.balloon = { g: rgeo(gp), kind: 'gas', gate: ['gaso'], kf: [[0.15, 0], [0.40, gp.L]] };
    }
    if (Lo.dm) routes.dmFill = { g: tgeo(Lo.dm, DM.RT.fill), kind: 'liq', gate: [], dm: true };
    layers.push({ id: 'lanes', fn: function (V) { return lanes(routes, V); } });
    svg += g('lanes');
    if (Lo.fu && Lo.dm) { layers.push({ id: 'syr', fn: function (V) { return syringe(Lo, V); } }); svg += g('syr'); }
    if (opt.labels && opt.labelsFn) svg += g('labs', '', opt.labelsFn(Lo, tf));
    else if (opt.labels) svg += g('labs', '', sceneLabels(mode, Lo));
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

  /* ------------------------------------------------------------ flow lanes */
  function lanes(routes, V) {
    var s = '', fl = V.flow || {}, vv = V.valve || {};
    Object.keys(fl).forEach(function (k) {
      var r = routes[k]; if (!r) return;
      var p = fl[k].p, a = fl[k].a;
      // a closed valve anywhere on the route stops the flow
      r.gate.forEach(function (gk) { a *= ramp(0.35, 0.65, vv[gk] || 0); });
      var kf = r.kf, d = 0;
      if (p <= kf[0][0]) return;
      for (var i = 1; i < kf.length; i++) { if (p <= kf[i][0]) { d = kf[i - 1][1] + (kf[i][1] - kf[i - 1][1]) * (p - kf[i - 1][0]) / (kf[i][0] - kf[i - 1][0]); break; } d = kf[i][1]; }
      s += F.lane(r.g, d / r.g.L, V.t, a, r.kind);
    });
    return s;
  }

  /* ------------------------------------------------------------ Stage 7 syringe (world units) */
  function syringe(Lo, V) {
    if (!V.syr) return '';
    var q = V.syr.q, sp = tf(Lo.fu, FlashUnit.port.sample), inl = tf(Lo.dm, [DM.port.inlet[0], DM.port.inlet[1] - 12]);
    var x = sp[0], y = sp[1], fillF = 0;
    if (q < 0.10) { var a = F.ease(ramp(0, 0.10, q)); y = sp[1] - 90 * (1 - a); x = sp[0] + 80 * (1 - a); }
    else if (q < 0.30) fillF = ramp(0.14, 0.26, q);
    else if (q < 0.46) {
      fillF = 1;
      var b = F.ease(ramp(0.30, 0.46, q));
      x = sp[0] + (inl[0] - sp[0]) * b; y = sp[1] + (inl[1] - sp[1]) * b - Math.sin(b * Math.PI) * 90;
    } else { x = inl[0]; y = inl[1]; fillF = 1 - ramp(0.46, 0.56, q); }
    var s = '', bw = 18, bh = 96, by0 = y - 10 - bh;
    s += R(x - 3.5, y - 10, 7, 10, 'fill="#e9edf2" stroke="#7d8898" stroke-width=".8"');                 // Luer tip
    s += R(x - bw / 2, by0, bw, bh, 'rx="3" fill="#f6f9fc" fill-opacity=".85" stroke="#7d8898" stroke-width="1.1"');
    var fh = (bh - 10) * fillF;
    if (fh > .3) s += R(x - bw / 2 + 2, by0 + bh - 2 - fh, bw - 4, fh, 'fill="url(#fxOil)"');
    for (var i = 1; i < 6; i++) s += L(x + bw / 2 - 6, by0 + bh - 4 - i * 15, x + bw / 2 - 1, by0 + bh - 4 - i * 15, 'stroke="#566578" stroke-width=".7"');
    var plTop = by0 + bh - 4 - fh - 6;
    s += R(x - bw / 2 + 1, plTop, bw - 2, 6, 'fill="#3a4553"') + R(x - 2, plTop - 58, 4, 58, 'fill="#c9d0d9" stroke="#7d8898" stroke-width=".6"') + R(x - 12, plTop - 62, 24, 5, 'rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"');
    s += R(x - bw / 2 - 6, by0 - 2, bw + 12, 4, 'rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"');
    s += T(x + 16, by0 + 24, ALIQ() + ' mL', SANS + ' font-size="12" font-weight="600" fill="#33404f"');
    return s;
  }
  function Scene0(Lo) { return tf(Lo.fu, FU.port.sampleIn)[1]; }
  function ALIQ() { return window.FlashSim.ALIQ_ML.toFixed(1); }

  /* ------------------------------------------------------------ light labels for the overall scenes */
  function sceneLabels(mode, Lo) {
    var s = '', lab = function (x, y, n, sub, an) {
      return T(x, y, n, 'text-anchor="' + (an || 'middle') + '" ' + SANS + ' font-size="17" font-weight="700" fill="#1d2836"') + (sub ? T(x, y + 17, sub, 'text-anchor="' + (an || 'middle') + '" ' + SANS + ' font-size="12" fill="#566578"') : '');
    };
    if (Lo.cell) { var cp = PA.pt({ at: Lo.cell }, 615, 800); s += lab(cp[0], cp[1], 'PVT Cell', 'source · Pump A → Port R'); }
    if (Lo.fu) {
      var f = function (p) { return tf(Lo.fu, p); };
      s += lab(f([310, -34])[0], f([310, -34])[1], 'Flash Unit', 'atmospheric flash · glass flask on balance');
    }
    if (Lo.ga) { var g0 = tf(Lo.ga, [165, -30]); s += lab(g0[0], g0[1], 'Gasometer', '3,000 cc · cutaway'); }
    if (Lo.dm) { var d0 = tf(Lo.dm, [348, 40]); s += lab(d0[0], d0[1] - 14, 'Density Meter', 'oscillating U-tube · cutaway'); }
    if (mode === 'system') {
      var ps = PA.port({ at: Lo.cell }, 'R'), sx = ps[0] + 40, sy = (ps[1] + Scene0(Lo)) / 2;
      s += T(sx, sy, 'Sample line', SANS + ' font-size="12" font-weight="600" fill="#566578" transform="rotate(-90 ' + sx + ' ' + sy + ')" text-anchor="middle"');
    }
    return s;
  }

  window.Scene = { build: build, LAYOUT: LAYOUT, tf: tf };
})();
