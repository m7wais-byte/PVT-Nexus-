/* FlashUnit — atmospheric flash unit: mounting frame + panel, sample inlet with metering (inlet control)
   valve, sealed flask head with SEPARATE inlet and gas-outlet passages, glass flask on an electronic
   balance, gas header with pressure transducer, vacuum branch and the gas-collection balloon branch.

   Local drawing units (one fixed geometry G). The scene places the unit with one transform; tubing
   and flow lanes use the port anchors and route geometries exported here, so nothing detaches.

   Live state (view model V from sim.js, never calculated here):
     V.oil (g), V.fuP (psia), V.balloon (cc), V.valve.{inlet,vac,bal}, V.he (0..1 helium in the unit),
     V.drip (flash-stage visual progress: drop / bubble timing), V.aliq (Stage 7 aliquot), V.bal (g on balance)
   Drawing only. */
(function () {
  'use strict';
  var F = window.FX, R = F.R, C = F.C, E = F.E, P = F.P, L = F.L, T = F.T, MONO = F.MONO, SANS = F.SANS, r1 = F.r1;

  var cx = 240;
  var G = {
    W: 620, H: 592,
    frame: { x0: 0, x1: 620, post: 16, rail: 30, plinth0: 548, plinth1: 580 },
    flask: { cx: cx, neckTop: 206, neckBot: 258, neckHW: 26, wallIn: 3.5, shoulderHW: 26, bodyBot: 462, bodyHW: 94, bot: 480, botHW: 76 },
    head: { x0: cx - 40, x1: cx + 40, y0: 164, y1: 206, insertBot: 236 },
    inlet: { x: cx - 16, sideY: 180, tip: 318 },          // dip tube: sample delivery tip inside the flask
    outlet: { x: cx + 16, open: 244 },                     // gas outlet opening in the neck (headspace)
    arm: { y: 466, x1: cx + 122, top: 440, cock: cx + 106 },     // oil sampling side-arm (Stage 7), stopcock closed during flashing
    hdrY: 96, sampleY: 120,
    bulkIn: [16, 120], inValve: [92, 120], inPanel: [136, 120],
    outPanel: [310, 96], pt: 362, vacX: 440, balX: 530, bulkOut: [604, 96],
    balloonNeck: 178, vacQC: 452,
    balance: { x0: 110, x1: 370, top: 494, panTop: 480 },
    pump: { x0: 400, x1: 592, y0: 494 },
    oilMaxH: 58                                            // drawing scale: 40 g (existing flash result) fills 58 units
  };
  var fl = G.flask;

  /* inner wall half-width at height y (glass interior) */
  function hwIn(y) {
    if (y <= fl.neckBot) return fl.neckHW - fl.wallIn;
    if (y >= fl.bodyBot) return fl.bodyHW - fl.wallIn;
    return (fl.neckHW - fl.wallIn) + (fl.bodyHW - fl.neckHW) * (y - fl.neckBot) / (fl.bodyBot - fl.neckBot);
  }
  var yBotIn = fl.bot - fl.wallIn;
  // oil surface for a given oil mass: equal volume per gram, solid of revolution (drawing scale)
  var VOL = (function () {
    var tab = [0], acc = 0;
    for (var h = 1; h <= 200; h++) { var y = yBotIn - h + .5, w = h < 14 ? hwIn(y) - (14 - h) * .9 : hwIn(y); acc += w * w; tab.push(acc); }
    return tab;
  })();
  function oilTop(g) {
    var target = VOL[G.oilMaxH] * F.clamp(g / 40, 0, 1.2);
    for (var h = 0; h < VOL.length - 1; h++) if (VOL[h + 1] >= target) return yBotIn - (h + (target - VOL[h]) / (VOL[h + 1] - VOL[h] || 1));
    return yBotIn - 200;
  }

  function flaskPath(off) {
    var o = off || 0, x = cx, nt = fl.neckTop + (o ? 2 : 0), nh = fl.neckHW - o, bh = fl.bodyHW - o, bb = fl.bot - o, bth = fl.botHW - o;
    return 'M' + (x - nh) + ' ' + nt + ' V' + fl.neckBot + ' L' + (x - bh) + ' ' + (fl.bodyBot) + ' Q' + (x - bh - 2) + ' ' + bb + ' ' + (x - bth) + ' ' + bb +
      ' H' + (x + bth) + ' Q' + (x + bh + 2) + ' ' + bb + ' ' + (x + bh) + ' ' + fl.bodyBot + ' L' + (x + nh) + ' ' + fl.neckBot + ' V' + nt;
  }
  var INNER = flaskPath(fl.wallIn) + ' Z';

  /* ------------------------------------------------------------ routes (local units) */
  var RT = {};
  (function () {
    var g = G, h = g.head, ix = g.inlet.x, ox = g.outlet.x;
    // sample: bulkhead -> inlet control valve -> panel fitting -> flexible PTFE line -> head inlet port -> inlet passage -> dip tube -> tip
    RT.sIn = F.path(0, g.sampleY).H(g.inValve[0]).H(g.inPanel[0])
      .C(g.inPanel[0] + 34, g.sampleY, h.x0 - 50, g.inlet.sideY, h.x0 - 20, g.inlet.sideY)
      .H(ix + 4).turn(ix, g.inlet.sideY, ix, g.inlet.tip, 4).V(g.inlet.tip).end();
    // distance along sIn where the sample passes the inlet control valve / enters the head
    RT.sInValve = g.inValve[0];
    // gas: outlet opening in the headspace -> outlet passage -> flexible line -> header -> bulkhead to the gasometer
    RT.gOut = F.path(ox, g.outlet.open).V(h.y0 - 14)
      .C(ox, g.hdrY + 8, ox + 20, g.hdrY, g.outPanel[0], g.hdrY).H(g.W).end();
    // vacuum: opening -> header -> vacuum tee -> vacuum valve -> quick-connect -> hose -> pump
    RT.vac = F.path(ox, g.outlet.open).V(h.y0 - 14)
      .C(ox, g.hdrY + 8, ox + 20, g.hdrY, g.outPanel[0], g.hdrY).H(g.vacX - 6).turn(g.vacX, g.hdrY, g.vacX, g.vacQC, 6).V(g.vacQC)
      .C(g.vacX, g.vacQC + 24, g.vacX + 30, g.pump.y0 - 20, g.vacX + 30, g.pump.y0 + 6).end();
    // balloon branch: from the bulkhead (gas arriving from the gasometer) -> balloon tee -> balloon valve -> neck
    RT.bal = F.path(g.W, g.hdrY).H(g.balX + 6).turn(g.balX, g.hdrY, g.balX, g.balloonNeck, 6).V(g.balloonNeck + 10).end();
    RT.balTee = g.W - g.balX;
  })();
  function rev(geo) { return F.geo('', geo.pts.slice().reverse()); }
  RT.heIn = rev(RT.gOut);

  /* ------------------------------------------------------------ static parts */
  function frameBack() {
    var f = G.frame, s = '';
    s += E(G.W / 2, f.plinth1 + 10, G.W / 2 + 10, 8, 'fill="#1b2a40" opacity=".10"');
    s += R(f.post, f.rail, G.W - 2 * f.post, f.plinth0 - f.rail, 'fill="url(#ppPanel)"');
    s += R(f.post, f.rail, G.W - 2 * f.post, 8, 'fill="#1b2a40" opacity=".08"');
    s += R(f.post + 40, f.rail + 6, G.W - 2 * f.post - 80, 2.5, 'rx="1.2" fill="#fff" opacity=".9"');
    // mounting rails (strut channel) the fittings and clips are bolted to
    [G.sampleY + 26, G.hdrY - 26].forEach(function (y) { s += R(f.post, y - 4, G.W - 2 * f.post, 8, 'fill="#d3d9e1" stroke="#b3bcc8" stroke-width=".6"'); });
    for (var i = 0; i < 4; i++) { var px = 60 + i * 168; s += C(px, f.rail + 18, 2.4, 'fill="#9aa5b3" stroke="#5d6878" stroke-width=".6"') + C(px, f.plinth0 - 16, 2.4, 'fill="#9aa5b3" stroke="#5d6878" stroke-width=".6"'); }
    return s;
  }
  function frameFront() {
    var f = G.frame, s = '';
    s += R(0, 0, G.W, f.rail, 'fill="url(#ppNavyV)" stroke="#132845" stroke-width="1"');
    [0, G.W - f.post].forEach(function (x) { s += R(x, 0, f.post, f.plinth1, 'fill="url(#ppNavy)" stroke="#132845" stroke-width="1"'); });
    s += R(0, f.plinth0, G.W, f.plinth1 - f.plinth0, 'fill="url(#ppNavyV)" stroke="#132845" stroke-width="1"');
    s += R(G.W / 2 - 112, 8, 224, 14, 'rx="2" fill="#e6ebf1" opacity=".95"');
    s += T(G.W / 2, 18.5, 'ATMOSPHERIC FLASH UNIT', 'text-anchor="middle" ' + MONO + ' font-size="9.5" font-weight="600" letter-spacing="1.4" fill="#1d3a66"');
    [8, G.W - 38].forEach(function (x) { s += R(x, f.plinth1, 30, 12, 'rx="3" fill="url(#ppSteelD)" stroke="#3c4553" stroke-width=".8"'); });
    return s;
  }
  // tube clip bolted to the strut
  function clip(x, y, o) { return o === 'v' ? R(x - 7, y - 3, 14, 6, 'rx="2" fill="#5d6878"') : R(x - 3, y - 7, 6, 14, 'rx="2" fill="#5d6878"'); }
  function bulkhead(x, y, lbl, side) {
    var s = R(x - 6, y - 11, 12, 22, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"') + F.nut(x + (side === 'L' ? -10 : 10), y, 'h', .9);
    if (lbl) s += T(x + (side === 'L' ? 14 : -14), y - 16, lbl, (side === 'L' ? '' : 'text-anchor="end" ') + MONO + ' font-size="9" font-weight="600" letter-spacing=".6" fill="#566578"');
    return s;
  }

  function balance() {
    var b = G.balance, s = '', w = b.x1 - b.x0;
    s += R(b.x0 + 10, G.frame.plinth0 - 4, w - 20, 4, 'fill="#1b2a40" opacity=".15"');
    s += P('M' + (b.x0 + 6) + ' ' + G.frame.plinth0 + ' L' + (b.x0 + 14) + ' ' + b.top + ' H' + (b.x1 - 14) + ' L' + (b.x1 - 6) + ' ' + G.frame.plinth0 + ' Z', 'fill="url(#fxCase)" stroke="#8592a3" stroke-width="1.2"');
    s += R(b.x0 + 14, b.top, w - 28, 4, 'fill="#fff" opacity=".8"');
    s += R(cx - 6, b.panTop + 6, 12, b.top - b.panTop - 6, 'fill="url(#ppSteelD)" stroke="#3c4553" stroke-width=".7"');
    s += R(cx - 88, b.panTop, 176, 7, 'rx="2" fill="url(#ppSteelV)" stroke="#5d6878" stroke-width="1"');
    // display + keys on the sloped front
    s += R(cx - 58, b.top + 12, 116, 30, 'rx="4" fill="url(#ppScreen)" stroke="#3a4656" stroke-width="1"');
    s += T(b.x0 + 24, b.top + 31, 'BALANCE', MONO + ' font-size="8.5" font-weight="600" letter-spacing=".8" fill="#566578"');
    s += T(b.x0 + 24, b.top + 43, '0.01 g', MONO + ' font-size="8" fill="#7d8898"');
    [0, 1].forEach(function (i) { s += R(cx + 72 + i * 22, b.top + 22, 16, 11, 'rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".7"'); });
    s += T(cx + 80, b.top + 30.5, 'T', 'text-anchor="middle" ' + MONO + ' font-size="7.5" font-weight="700" fill="#33404f"');
    s += T(cx + 102, b.top + 30.5, '⏻', 'text-anchor="middle" font-size="7.5" fill="#33404f"');
    return s;
  }

  function vacuumPump() {
    var p = G.pump, s = '', y1 = G.frame.plinth0;
    s += R(p.x0, p.y0 + 10, p.x1 - p.x0, y1 - p.y0 - 10, 'rx="6" fill="url(#fxCaseH)" stroke="#7d8898" stroke-width="1.2"');
    s += R(p.x0 + 8, p.y0 + 18, 70, 28, 'rx="3" fill="#2b3644" stroke="#11161d" stroke-width=".8"');
    for (var i = 0; i < 6; i++) s += L(p.x0 + 14 + i * 10, p.y0 + 22, p.x0 + 14 + i * 10, p.y0 + 42, 'stroke="#5d6878" stroke-width="2"');
    s += C(p.x1 - 40, p.y0 + 32, 16, 'fill="url(#fxKnob)" stroke="#3c4553" stroke-width="1"') + C(p.x1 - 40, p.y0 + 32, 6, 'fill="#3c4553"');
    s += R(G.vacX + 22, p.y0 + 2, 16, 12, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"');
    s += T(p.x0 + 92, p.y0 + 30, 'VACUUM', MONO + ' font-size="8.5" font-weight="600" letter-spacing=".8" fill="#566578"');
    s += T(p.x0 + 92, p.y0 + 42, 'PUMP', MONO + ' font-size="8.5" font-weight="600" letter-spacing=".8" fill="#566578"');
    return s;
  }

  // the flask: back wall (behind contents) and front glass (in front of contents)
  function flaskBack() {
    return P(flaskPath(0) + ' Z', 'fill="url(#fxGlass)" opacity=".55"') + P(INNER, 'fill="#f4f9fd" opacity=".35"');
  }
  function flaskFront() {
    var s = '', x = cx;
    s += P(flaskPath(0), 'fill="none" stroke="#7fa6c2" stroke-width="1.6" stroke-linejoin="round"');
    s += P(flaskPath(fl.wallIn), 'fill="none" stroke="#a9c8dd" stroke-width="1" stroke-linejoin="round" opacity=".9"');
    // highlights
    s += P('M' + (x - fl.bodyHW + 18) + ' ' + (fl.bodyBot - 8) + ' L' + (x - fl.neckHW - 2) + ' ' + (fl.neckBot + 16), 'stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55" fill="none"');
    s += P('M' + (x + fl.bodyHW - 24) + ' ' + (fl.bodyBot - 20) + ' L' + (x + fl.bodyHW - 40) + ' ' + (fl.bodyBot - 70), 'stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".45" fill="none"');
    s += L(x - fl.neckHW + 5, fl.neckTop + 6, x - fl.neckHW + 5, fl.neckBot - 4, 'stroke="#fff" stroke-width="2.5" opacity=".6" stroke-linecap="round"');
    // graduations (approximate, as on a flask) — no values: the balance is the measurement
    [0, 1, 2].forEach(function (i) { var y = fl.bodyBot - 26 - i * 34, w = 14; s += L(x + 30, y, x + 30 + w, y, 'stroke="#6f93ad" stroke-width="1" opacity=".7"'); });
    // ground-glass joint band (frosted) and the joint clip
    s += R(x - fl.neckHW, fl.neckTop, 2 * fl.neckHW, 22, 'fill="#e9eef2" opacity=".55"');
    s += P('M' + (x - fl.neckHW - 3) + ' ' + (fl.neckTop + 4) + ' h' + (2 * fl.neckHW + 6) + ' v9 h-' + (2 * fl.neckHW + 6) + ' Z', 'fill="#f0a73a" stroke="#a8691a" stroke-width=".8" opacity=".95"');
    s += R(x + fl.neckHW + 3, fl.neckTop + 2, 6, 13, 'rx="2" fill="#f0a73a" stroke="#a8691a" stroke-width=".8"');
    return s;
  }
  // head assembly: PTFE insert in the neck (behind glass), steel head with three bosses
  function headInsert() {
    var h = G.head, x = cx, s = '';
    s += P('M' + (x - 22) + ' ' + h.y1 + ' L' + (x - 19) + ' ' + h.insertBot + ' H' + (x + 19) + ' L' + (x + 22) + ' ' + h.y1 + ' Z', 'fill="#eef1f4" stroke="#aab4c0" stroke-width=".8" opacity=".9"');
    return s;
  }
  function headInternal() {
    // internal passages inside the head and insert (drawn as bores), plus the dip tube and outlet stub
    var h = G.head, ix = G.inlet.x, ox = G.outlet.x, s = '';
    s += L(ix, h.insertBot - 2, ix, G.inlet.tip, 'stroke="#4a5361" stroke-width="5.4" stroke-linecap="butt"') + L(ix, h.insertBot - 2, ix, G.inlet.tip, 'stroke="#c3cad4" stroke-width="3.6"');
    s += L(ix - 1, h.insertBot, ix - 1, G.inlet.tip - 4, 'stroke="#fff" stroke-width=".9" opacity=".7"');
    s += P('M' + (ix - 2.7) + ' ' + G.inlet.tip + ' L' + (ix + 2.7) + ' ' + (G.inlet.tip + 3) + ' V' + G.inlet.tip + ' Z', 'fill="#4a5361"');
    s += L(ox, h.insertBot - 2, ox, G.outlet.open, 'stroke="#4a5361" stroke-width="6.4"') + L(ox, h.insertBot - 2, ox, G.outlet.open, 'stroke="#c3cad4" stroke-width="4.6"');
    s += E(ox, G.outlet.open, 3.2, 1.3, 'fill="#28313d"');
    return s;
  }
  function head(cut) {
    var h = G.head, x = cx, s = '', ix = G.inlet.x, ox = G.outlet.x;
    s += R(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0, 'rx="4" fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1.1"');
    s += R(h.x0 + 3, h.y0 + 3, h.x1 - h.x0 - 6, 3, 'fill="#fff" opacity=".6"');
    s += R(h.x0 - 4, h.y1 - 8, h.x1 - h.x0 + 8, 8, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"');
    // bosses: inlet (side), outlet (top right) — two separate passages, nothing else enters the head
    s += R(h.x0 - 16, G.inlet.sideY - 6, 16, 12, 'fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"') + F.nut(h.x0 - 20, G.inlet.sideY, 'h');
    s += R(ox - 6, h.y0 - 12, 12, 12, 'fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"') + F.nut(ox, h.y0 - 14, 'v', .9);
    if (cut) {
      // section through the head: the two separate process passages
      s += R(h.x0 + 2, h.y0 + 8, h.x1 - h.x0 - 4, h.y1 - h.y0 - 12, 'fill="url(#ppHatch)" opacity=".55"');
      s += P('M' + (h.x0 - 16) + ' ' + G.inlet.sideY + ' H' + ix + ' V' + (h.y1 + 1), 'fill="none" stroke="#28313d" stroke-width="3.4"');
      s += L(ox, h.y0 - 8, ox, h.y1 + 1, 'stroke="#28313d" stroke-width="3.6"');
    }
    return s;
  }

  function header() {
    var g = G, s = '';
    // sample inlet: bulkhead -> inlet control valve -> panel fitting (stainless)
    var sIn = F.path(g.bulkIn[0], g.sampleY).H(g.inPanel[0]).end();
    s += F.tube(sIn);
    // flexible PTFE inlet line to the head (keeps the balance free)
    var flexIn = F.path(g.inPanel[0], g.sampleY).C(g.inPanel[0] + 34, g.sampleY, g.head.x0 - 50, g.inlet.sideY, g.head.x0 - 20, g.inlet.sideY).end();
    s += F.tube(flexIn, 'ptfe');
    // flexible PTFE gas line from the head outlet to the panel, then the stainless gas header
    var flexOut = F.path(g.outlet.x, g.head.y0 - 14).C(g.outlet.x, g.hdrY + 8, g.outlet.x + 20, g.hdrY, g.outPanel[0], g.hdrY).end();
    s += F.tube(flexOut, 'ptfe');
    s += F.tube(F.path(g.outPanel[0], g.hdrY).H(g.bulkOut[0]).end());
    // pressure transducer stem, vacuum and balloon branches
    s += F.tube(F.path(g.pt, g.hdrY).V(g.hdrY - 18).end());
    s += F.tube(F.path(g.vacX, g.hdrY).V(g.vacQC).end());
    s += F.tube(F.path(g.balX, g.hdrY).V(g.balloonNeck).end());
    // vacuum hose (QC -> pump)
    s += F.tube(F.path(g.vacX, g.vacQC).C(g.vacX, g.vacQC + 24, g.vacX + 30, g.pump.y0 - 20, g.vacX + 30, g.pump.y0 + 6).end(), 'hose');
    s += R(g.vacX - 9, g.vacQC - 12, 18, 16, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"');
    // fittings
    s += F.nut(g.inPanel[0], g.sampleY, 'h') + F.nut(g.outPanel[0], g.hdrY, 'h');
    [g.pt, g.vacX, g.balX].forEach(function (x) { s += F.tee(x, g.hdrY); });
    s += bulkhead(g.bulkIn[0], g.sampleY, 'SAMPLE IN', 'L') + bulkhead(g.bulkOut[0], g.hdrY, 'TO GASOMETER', 'R');
    // tube clips on the strut
    [56, 128].forEach(function (x) { s += clip(x, g.sampleY); });
    [340, 410, 500, 576].forEach(function (x) { s += clip(x, g.hdrY); });
    // pressure transducer + panel meter
    s += R(g.pt - 9, g.hdrY - 44, 18, 26, 'rx="3" fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1"') + R(g.pt - 5, g.hdrY - 52, 10, 9, 'fill="#3c4553"');
    s += P('M' + g.pt + ' ' + (g.hdrY - 52) + ' C ' + g.pt + ' ' + (g.hdrY - 62) + ', ' + (g.pt + 12) + ' ' + (g.hdrY - 62) + ', ' + (g.pt + 22) + ' ' + (g.hdrY - 58), 'fill="none" stroke="#1e2733" stroke-width="2.4"');
    s += R(g.pt + 22, 38, 92, 40, 'rx="4" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width="1"') + R(g.pt + 26, 42, 84, 32, 'rx="3" fill="url(#ppScreen)"');
    s += T(g.pt + 68, 51, 'PRESSURE', 'text-anchor="middle" ' + MONO + ' font-size="7.5" letter-spacing=".8" fill="#8fb3cc"');
    // balloon neck fitting + support arm
    s += R(g.balX - 34, g.balloonNeck - 20, 34, 6, 'fill="#5d6878"') + R(g.balX - 40, g.balloonNeck - 26, 10, 18, 'rx="2" fill="#4a5361"');
    s += R(g.balX - 9, g.balloonNeck - 4, 18, 12, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"');
    s += R(g.balX - 7, g.balloonNeck + 8, 14, 6, 'rx="1" fill="url(#ppSteelV)" stroke="#2a3443" stroke-width=".7"');
    s += T(g.balX, g.balloonNeck + 164, 'BALLOON', 'text-anchor="middle" ' + MONO + ' font-size="8.5" font-weight="600" letter-spacing=".8" fill="#566578"');
    s += R(g.balX - 36, g.balloonNeck + 170, 72, 22, 'rx="3" fill="url(#ppScreen)" stroke="#3a4656" stroke-width="1"');
    return s;
  }

  /* ------------------------------------------------------------ dynamic parts */
  // contents of the flask: helium / gas tint in the headspace, oil layer with its surface
  function contents(V, cut) {
    var s = '', top = oilTop(V.oil || 0), x = cx;
    s += '<clipPath id="fuClip"><path d="' + INNER + '"/></clipPath><g clip-path="url(#fuClip)">';
    if (V.heTint > 0.01) s += R(x - 100, fl.neckTop, 200, fl.bot - fl.neckTop, 'fill="url(#fxHe)" opacity="' + r1(.28 * V.heTint) + '"');
    if (V.gasTint > 0.01) s += R(x - 100, fl.neckTop, 200, top - fl.neckTop, 'fill="url(#fxGas)" opacity="' + r1(.32 * V.gasTint) + '"');
    if (V.oil > 0.05) {
      var wob = Math.sin((V.t || 0) * 2.2) * (V.dripOn ? 0.8 : 0.25);
      s += P('M' + (x - 100) + ' ' + r1(top + wob) + ' Q' + x + ' ' + r1(top - wob) + ' ' + (x + 100) + ' ' + r1(top + wob) + ' V' + fl.bot + ' H' + (x - 100) + ' Z', 'fill="url(#fxOil)"');
      s += R(x - 100, top, 200, fl.bot - top, 'fill="url(#fxOilH)"');
      s += E(x, top + .6, hwIn(top) - 1, 2.2, 'fill="#f7d77a" opacity=".55"');
    }
    s += '</g>';
    return s;
  }
  // droplets falling from the tip, bubbles of released gas rising into the headspace
  function drops(V) {
    var s = '', top = oilTop(V.oil || 0), tip = G.inlet.tip + 3, ix = G.inlet.x, t = V.t || 0;
    if (V.drip) {
      // drop k lands when the oil reaches 2.5 k g (16 drops for 40 g); V.drip = { u: oil fraction 0..1, pre: 0..1 first drop forming }
      var u = V.drip.u, N = 16, I = 1 / N;
      if (V.drip.pre > 0 && u <= 0) { var r0 = 1 + 3 * V.drip.pre; s += E(ix, tip + r0 * .9, r0, r0 * 1.15, 'fill="url(#fxOil)" stroke="#c48a1c" stroke-width=".5"'); }
      for (var k = 1; k <= N; k++) {
        var land = k * I, fall = land - .7 * I, grow = fall - .9 * I;
        if (u < grow || u > land + .5 * I) continue;
        if (u < fall) { var q = (u - grow) / (.9 * I), r = 1.2 + 2.8 * q; s += E(ix, tip + r * .9, r, r * (1 + .25 * q), 'fill="url(#fxOil)" stroke="#c48a1c" stroke-width=".5"'); }
        else if (u < land) { var q2 = (u - fall) / (.7 * I), y = tip + 4 + (top - tip - 6) * q2 * q2; s += E(ix, y, 3, 4.2, 'fill="url(#fxOil)" stroke="#c48a1c" stroke-width=".5"'); }
        else { var q3 = (u - land) / (.5 * I); s += E(ix, top + .5, 4 + 16 * q3, 1 + 1.5 * q3, 'fill="none" stroke="#f6dc8a" stroke-width="1" opacity="' + r1(.8 * (1 - q3)) + '"'); }
      }
    }
    if (V.bubbles > 0.01) {
      // gas released as the sample flashes: from the drop path and the oil surface, rising to the neck
      var a = V.bubbles;
      for (var i = 0; i < 14; i++) {
        var ph = (t * (.32 + (i % 4) * .05) + i * .137) % 1, src = i % 3 === 0 ? tip + 8 : top - 2;
        var x0 = (i % 3 === 0 ? ix : cx - 60 + (i * 37) % 120) + Math.sin(t * 2 + i) * 3;
        var yT = fl.neckBot + 4, y = src - (src - yT) * ph;
        var xx = x0 + (G.outlet.x - x0) * Math.pow(ph, 2.2) * .8;
        var rr = 1.6 + (i % 3) * .6;
        if (y > top - 1) continue;
        s += C(xx, y, rr, 'fill="#e6fbf4" stroke="#2fa88a" stroke-width=".9" opacity="' + r1(a * (1 - ph * .55)) + '"');
      }
    }
    if (V.heIn > 0.01) {
      // helium entering through the outlet opening, spreading down into the flask
      for (var j = 0; j < 8; j++) {
        var pj = (t * .45 + j / 8) % 1, yy = G.outlet.open + pj * 160, xj = G.outlet.x + Math.sin(j * 1.9 + t) * 6 + (j - 4) * 9 * pj;
        s += C(xj, yy, 1.8, 'fill="#e8f7ff" stroke="#3aa6d8" stroke-width=".9" opacity="' + r1(V.heIn * (1 - pj)) + '"');
      }
    }
    if (V.airOut > 0.01) {
      // air drawn out of the flask toward the outlet opening during evacuation
      for (var m = 0; m < 9; m++) {
        var pm = (t * .5 + m / 9) % 1, sx = cx - 70 + (m * 29) % 140, sy = fl.bodyBot - 20 - (m * 23) % 120;
        var xm = sx + (G.outlet.x - sx) * pm, ym = sy + (G.outlet.open - sy) * pm;
        s += C(xm, ym, 1.6, 'fill="#eef3fb" stroke="#7d93b8" stroke-width=".8" opacity="' + r1(V.airOut * (1 - pm * .6)) + '"');
      }
    }
    return s;
  }
  // oil sampling side-arm: glass arm through the lower wall, PTFE stopcock, Luer fitting facing up
  function arm(V) {
    var a = G.arm, s = '', x0 = cx + fl.bodyHW - 4, open = (V.cock || 0) > 0.5, full = oilTop(V.oil || 0) < a.y - 4;
    var d = 'M' + x0 + ' ' + a.y + ' H' + (a.x1 - 6) + ' Q' + a.x1 + ' ' + a.y + ' ' + a.x1 + ' ' + (a.y - 6) + ' V' + (a.top + 6);
    s += P(d, 'fill="none" stroke="#7fa6c2" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"') + P(d, 'fill="none" stroke="#f3f8fc" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"');
    if (full) s += P('M' + (x0 - 2) + ' ' + a.y + ' H' + (open ? a.x1 - 6 : a.cock - 4) + (open ? ' Q' + a.x1 + ' ' + a.y + ' ' + a.x1 + ' ' + (a.y - 6) + ' V' + (a.top + 6) : ''), 'fill="none" stroke="#d99a26" stroke-width="4.4" stroke-linejoin="round"');
    s += C(a.cock, a.y, 8, 'fill="#f4f6f8" stroke="#7d8898" stroke-width="1.2"');
    s += '<g transform="rotate(' + (open ? 0 : 90) + ' ' + a.cock + ' ' + a.y + ')">' + R(a.cock - 15, a.y - 2.6, 30, 5.2, 'rx="2.6" fill="' + (open ? '#1d8a5a' : '#2f4f7f') + '"') + '</g>';
    s += R(a.x1 - 6, a.top - 8, 12, 12, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"') + R(a.x1 - 4.5, a.top - 12, 9, 5, 'rx="1" fill="#e9edf2" stroke="#5d6878" stroke-width=".7"');
    return s;
  }
  function balloon(V) {
    var g = G, f = F.clamp((V.balloon || 0) / 250, 0, 1), ry = 16 + 50 * f, rx = 13 + 45 * f, cy = g.balloonNeck + 14 + ry, x = g.balX, s = '';
    s += P('M' + (x - 6) + ' ' + (g.balloonNeck + 14) + ' Q' + (x - 7) + ' ' + (g.balloonNeck + 20) + ' ' + (x - rx * .35) + ' ' + (cy - ry * .9) + ' L' + (x + rx * .35) + ' ' + (cy - ry * .9) + ' Q' + (x + 7) + ' ' + (g.balloonNeck + 20) + ' ' + (x + 6) + ' ' + (g.balloonNeck + 14) + ' Z', 'fill="url(#fxBalloonR)" stroke="#6d93bb" stroke-width="1"');
    s += E(x, cy, rx, ry, 'fill="url(#fxBalloonR)" stroke="#6d93bb" stroke-width="1.2"');
    s += E(x - rx * .38, cy - ry * .35, rx * .18, ry * .26, 'fill="#fff" opacity=".55"');
    if ((V.balloon || 0) > 1) s += E(x, cy, rx * .82, ry * .82, 'fill="#2fa88a" opacity=".10"');
    s += R(x - 8, g.balloonNeck + 10, 16, 6, 'rx="2" fill="#5d6878"');
    return s;
  }
  function displays(V) {
    var g = G, s = '';
    var pc = V.fuP < 0.5 ? '#7ff0bf' : V.path === 'vac' ? '#5fd4ff' : '#ffc56b';
    s += T(g.pt + 68, 69, (V.fuP == null ? 14.7 : V.fuP).toFixed(1) + '<tspan font-size="9" fill="#8fb3cc"> psia</tspan>', 'text-anchor="middle" ' + MONO + ' font-size="14" font-weight="600" fill="' + pc + '"');
    s += T(cx, G.balance.top + 33, (V.bal == null ? 200 : V.bal).toFixed(1) + '<tspan font-size="10" fill="#8fb3cc"> g</tspan>', 'text-anchor="middle" ' + MONO + ' font-size="16" font-weight="600" fill="' + ((V.oil || 0) > 0.5 ? '#ffc56b' : '#5fd4ff') + '"');
    var bp = 14.5 * F.clamp((V.balloon || 0) / 250, 0, 1);
    s += T(g.balX, g.balloonNeck + 186, bp.toFixed(1) + '<tspan font-size="9" fill="#8fb3cc"> psi</tspan>', 'text-anchor="middle" ' + MONO + ' font-size="13" font-weight="600" fill="' + (bp > 0.05 ? '#7ff0bf' : '#5fd4ff') + '"');
    return s;
  }
  function valves(V) {
    var g = G, v = V.valve || {};
    return F.valve(g.inValve[0], g.sampleY, 'h', v.inlet || 0, { kind: 'needle', side: 'up', tag: [0, -44] }) +
      F.valve(g.vacX, (g.hdrY + g.vacQC) / 2 - 40, 'v', v.vac || 0, { side: 'right', tag: [52, 0] }) +
      F.valve(g.balX, g.hdrY + 42, 'v', v.bal || 0, { side: 'left', tag: [-52, 0] });
  }

  /* ------------------------------------------------------------ assembly
     layers in z-order; each { id, fn(V) | html } — the scene sets innerHTML only when the markup changes */
  function layers(o) {
    o = o || {};
    var cut = o.view === 'internal';
    return [
      { id: 'fu-back', html: frameBack() + vacuumPump() },
      { id: 'fu-hdr', html: header() },
      { id: 'fu-bal', html: balance() },
      { id: 'fu-fback', html: flaskBack() + headInsert() },
      { id: 'fu-in', fn: function (V) { return contents(V, cut); } },
      { id: 'fu-int', html: headInternal() },
      { id: 'fu-drop', fn: drops },
      { id: 'fu-ffront', html: flaskFront() + head(cut) },
      { id: 'fu-arm', fn: arm },
      { id: 'fu-balloon', fn: balloon },
      { id: 'fu-valves', fn: valves },
      { id: 'fu-disp', fn: displays },
      { id: 'fu-front', html: frameFront() }
    ];
  }

  // label callouts (local units) — the same list is used by the preview labels and Flash Unit Details
  var LABELS = [
    { id: 'sampleIn', n: 'Sample inlet', s: 'from Pump A · Port R', a: [24, 120], p: [-30, 120], an: 'end' },
    { id: 'inletValve', n: 'Inlet control valve', s: 'metering · pressure drop', a: [92, 104], p: [-30, 52], an: 'end' },
    { id: 'flexLines', n: 'Flexible PTFE lines', s: 'keep the balance free', a: [150, 134], p: [-30, 186], an: 'end' },
    { id: 'head', n: 'Flask head', s: 'sealed · 2 process passages', a: [200, 192], p: [-30, 246], an: 'end' },
    { id: 'tip', n: 'Sample delivery tip', s: 'inside the flask', a: [cx - 16, 320], p: [-30, 320], an: 'end' },
    { id: 'flask', n: 'Glass flask', s: 'oil collects here', a: [cx - 70, 400], p: [-30, 392], an: 'end' },
    { id: 'oil', n: 'Collected oil', s: 'weighed on the balance', a: [cx - 40, 466], p: [-30, 458], an: 'end' },
    { id: 'balance', n: 'Electronic balance', s: 'tare + oil', a: [130, 530], p: [-30, 530], an: 'end' },
    { id: 'balloon', n: 'Gas collection balloon', s: 'GC sample · own valve', a: [556, 214], p: [660, 168], an: 'start' },
    { id: 'vacuum', n: 'Vacuum branch', s: 'valve + pump', a: [446, 300], p: [660, 236], an: 'start' },
    { id: 'outlet', n: 'Gas outlet', s: 'opening in the headspace', a: [cx + 19, 246], p: [660, 300], an: 'start' },
    { id: 'headspace', n: 'Gas headspace', s: 'above the oil', a: [cx + 40, 330], p: [660, 360], an: 'start' },
    { id: 'arm', n: 'Oil sampling side-arm', s: 'stopcock · Stage 7', a: [cx + 122, 432], p: [660, 432], an: 'start' },
    { id: 'pt', n: 'Pressure transducer', s: 'unit pressure · psia', a: [362, 52], p: [420, -22], an: 'middle' },
    { id: 'gasoConn', n: 'Gasometer connection', s: 'gas header outlet', a: [612, 96], p: [660, 96], an: 'start' }
  ];

  window.FlashUnit = {
    G: G, RT: RT, layers: layers, oilTop: oilTop, LABELS: LABELS,
    // port anchors (local units): external tubing attaches at these points
    port: { sampleIn: [G.bulkIn[0] - 16, G.sampleY], gasOut: [G.bulkOut[0] + 16, G.hdrY], sample: [G.arm.x1, G.arm.top - 12] }
  };
})();
