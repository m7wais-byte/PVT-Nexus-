/* FlashUnit — atmospheric flash unit (Prototype 02, rev. B).
   Black rectangular support frame with transparent protective panels; upper stainless-steel manifold
   carrying the inlet-control (isolation) valve, the solenoid flow-control valve and the delivery line;
   pressure transducer on the gas manifold; large glass flask with a sealed stainless head (two separate
   passages: sample delivery tube to an internal tip, headspace gas outlet); balance on an adjustable
   lifting platform (lab jack); lower controller with pressure and flow displays.
   Ports on the right post: gas line to the Gasometer, gas-collection vessel line, and a capped
   quick-connect for the TEMPORARY vacuum pump (Stage 2 only; the pump is not part of the unit).

   Local units, one fixed geometry G. The scene places the unit with one transform; tubing and flow lanes
   use the port anchors and routes exported here.
   Live state (view model V from sim.js): V.oil, V.fuP, V.flowOn, V.valve.{inlet,vac}, V.vacHose (0..1),
   V.heTint, V.gasTint, V.heIn, V.airOut, V.drip, V.bubbles, V.cock, V.bal. Drawing only. */
(function () {
  'use strict';
  var F = window.FX, R = F.R, C = F.C, E = F.E, P = F.P, L = F.L, T = F.T, MONO = F.MONO, SANS = F.SANS, r1 = F.r1;

  var cx = 262;
  var G = {
    W: 720, H: 780, post: 18, rail: 22, box0: 690, box1: 752,
    flask: { cx: cx, neckTop: 268, neckBot: 318, neckHW: 32, wallIn: 4, bodyBot: 586, bodyHW: 150, bot: 600, botHW: 132 },
    head: { x0: cx - 46, x1: cx + 46, y0: 236, y1: 268, insertBot: 292 },
    inlet: { x: cx - 22, tip: 392 },
    outlet: { x: cx + 22, open: 300 },
    sY: 72, gY: 120, iso: 84, sol: 160, pt: 380, vacX: 660, vacValveY: 162, vesX: 500, vesY: 350, vacY: 214,
    ves: { x: 600, y: 690 },                                 // blue gas-collection vessel, standing inside the frame (right bay)
    plate: { x0: 34, x1: 702, y0: 34, y1: 148 },
    balance: { x0: cx - 130, x1: cx + 130, pan: 600, top: 614, bot: 652 },
    jack: { top: 652, bot: 690, hw: 140 },
    arm: { y: 566, x1: cx + 172, top: 532, cock: cx + 158 },
    oilMaxH: 52                                              // drawing scale: 40 g (existing flash result) fills 52 units
  };
  var fl = G.flask;

  function hwIn(y) {
    if (y <= fl.neckBot) return fl.neckHW - fl.wallIn;
    if (y >= fl.bodyBot) return fl.bodyHW - fl.wallIn;
    return (fl.neckHW - fl.wallIn) + (fl.bodyHW - fl.neckHW) * (y - fl.neckBot) / (fl.bodyBot - fl.neckBot);
  }
  var yBotIn = fl.bot - fl.wallIn;
  var VOL = (function () {
    var tab = [0], acc = 0;
    for (var h = 1; h <= 260; h++) { var y = yBotIn - h + .5, w = h < 14 ? hwIn(y) - (14 - h) * 1.3 : hwIn(y); acc += w * w; tab.push(acc); }
    return tab;
  })();
  function oilTop(g) {
    var target = VOL[G.oilMaxH] * F.clamp(g / 40, 0, 1.2);
    for (var h = 0; h < VOL.length - 1; h++) if (VOL[h + 1] >= target) return yBotIn - (h + (target - VOL[h]) / (VOL[h + 1] - VOL[h] || 1));
    return yBotIn - 260;
  }
  function flaskPath(o) {
    o = o || 0;
    var x = cx, nt = fl.neckTop + (o ? 2 : 0), nh = fl.neckHW - o, bh = fl.bodyHW - o, bb = fl.bot - o, bth = fl.botHW - o;
    return 'M' + (x - nh) + ' ' + nt + ' V' + fl.neckBot + ' L' + (x - bh) + ' ' + fl.bodyBot + ' Q' + (x - bh - 2) + ' ' + bb + ' ' + (x - bth) + ' ' + bb +
      ' H' + (x + bth) + ' Q' + (x + bh + 2) + ' ' + bb + ' ' + (x + bh) + ' ' + fl.bodyBot + ' L' + (x + nh) + ' ' + fl.neckBot + ' V' + nt;
  }
  var INNER = flaskPath(fl.wallIn) + ' Z';

  /* ------------------------------------------------------------ routes (local units) */
  var RT = {};
  (function () {
    var g = G, ix = g.inlet.x, ox = g.outlet.x;
    // sample: inlet bulkhead -> inlet-control valve -> solenoid flow control -> manifold -> delivery tube -> head -> internal tip
    RT.sIn = F.path(0, g.sY).H(ix - 8).turn(ix, g.sY, ix, g.inlet.tip, 8).V(g.inlet.tip).end();
    RT.sInValve = g.sol;                                     // distance at which the sample passes the flow-control valve
    // gas: headspace opening -> outlet passage -> gas manifold -> Gasometer bulkhead
    RT.gOut = F.path(ox, g.outlet.open).V(g.gY + 8).turn(ox, g.gY, g.W, g.gY, 8).H(g.W).end();
    // evacuation: opening -> gas manifold -> vacuum valve -> quick-connect on the right post
    RT.vac = F.path(ox, g.outlet.open).V(g.gY + 8).turn(ox, g.gY, g.vacX, g.gY, 8).H(g.vacX - 8).turn(g.vacX, g.gY, g.vacX, g.vacY, 8).V(g.vacY - 8).turn(g.vacX, g.vacY, g.W, g.vacY, 8).H(g.W).end();
    // gas-collection vessel: from the Gasometer bulkhead along the manifold to the vessel bulkhead
    // gas-collection: from the Gasometer bulkhead along the manifold, down the vessel branch, into the vessel's own top valve
    var vsx = g.ves.x + Parts.VG.side[0] - 6, vtop = g.ves.y - Parts.VG.h + 4;
    RT.ves = F.path(g.W, g.gY).H(g.vesX + 8).turn(g.vesX, g.gY, g.vesX, g.vesY, 8).V(g.vesY - 8).turn(g.vesX, g.vesY, vsx, g.vesY, 8).H(g.ves.x).V(vtop).end();
  })();
  RT.heIn = F.geo('', RT.gOut.pts.slice().reverse());

  /* ------------------------------------------------------------ static parts */
  function frameBack() {
    var s = '', w = G.W;
    s += E(w / 2, G.H + 2, w / 2 + 12, 8, 'fill="#1b2a40" opacity=".12"');
    s += R(G.post, G.rail, w - 2 * G.post, G.box0 - G.rail, 'fill="#eef3f7"');
    s += R(G.post, G.rail, w - 2 * G.post, G.box0 - G.rail, 'fill="#cfdde8" opacity=".35"');
    // stainless mounting plate for the upper manifold
    var p = G.plate;
    s += R(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0, 'rx="3" fill="url(#fxBrushed)" stroke="#9aa5b2" stroke-width="1"');
    [[p.x0 + 10, p.y0 + 10], [p.x1 - 10, p.y0 + 10], [p.x0 + 10, p.y1 - 10], [p.x1 - 10, p.y1 - 10]].forEach(function (q) { s += C(q[0], q[1], 2.6, 'fill="#9aa5b3" stroke="#5d6878" stroke-width=".6"'); });
    return s;
  }
  function frameFront() {
    var s = '', w = G.W;
    // transparent protective panels: edges and restrained reflections
    s += R(G.post, G.rail, w - 2 * G.post, G.box0 - G.rail, 'fill="#bcd6ea" opacity=".07"');
    s += P('M' + (G.post + 30) + ' ' + (G.box0 - 20) + ' L' + (G.post + 150) + ' ' + (G.rail + 20), 'stroke="#fff" stroke-width="10" opacity=".22" fill="none"');
    s += P('M' + (G.post + 64) + ' ' + (G.box0 - 20) + ' L' + (G.post + 172) + ' ' + (G.rail + 40), 'stroke="#fff" stroke-width="3" opacity=".25" fill="none"');
    s += R(G.post + 2, G.rail + 2, w - 2 * G.post - 4, G.box0 - G.rail - 4, 'fill="none" stroke="#9fc0d8" stroke-width="1.2" opacity=".7"');
    // black aluminium frame
    s += R(0, 0, w, G.rail, 'fill="url(#fxBlackV)" stroke="#0b0d10" stroke-width="1"');
    [0, w - G.post].forEach(function (x) { s += R(x, 0, G.post, G.box1, 'fill="url(#fxBlack)" stroke="#0b0d10" stroke-width="1"'); });
    s += L(G.post / 2, 6, G.post / 2, G.box1 - 6, 'stroke="#59626e" stroke-width="1" opacity=".6"') + L(w - G.post / 2, 6, w - G.post / 2, G.box1 - 6, 'stroke="#59626e" stroke-width="1" opacity=".6"');
    [[G.post + 6, G.rail + 6], [w - G.post - 6, G.rail + 6], [G.post + 6, G.box0 - 6], [w - G.post - 6, G.box0 - 6]].forEach(function (q) { s += C(q[0], q[1], 2.4, 'fill="#4a525d"'); });
    // lower controller box with displays
    s += R(0, G.box0, w, G.box1 - G.box0, 'fill="url(#fxBlackV)" stroke="#0b0d10" stroke-width="1"');
    s += T(36, G.box0 + 20, 'PRESSURE', MONO + ' font-size="9" letter-spacing=".8" fill="#9aa6b5"') + R(36, G.box0 + 26, 132, 28, 'rx="3" fill="url(#ppScreen)" stroke="#3a4656" stroke-width="1"');
    s += T(196, G.box0 + 20, 'FLOW', MONO + ' font-size="9" letter-spacing=".8" fill="#9aa6b5"') + R(196, G.box0 + 26, 132, 28, 'rx="3" fill="url(#ppScreen)" stroke="#3a4656" stroke-width="1"');
    s += T(w - 40, G.box0 + 38, 'FLASH UNIT', 'text-anchor="end" ' + MONO + ' font-size="10" font-weight="600" letter-spacing="1.4" fill="#c9d0d9"');
    s += C(w - 196, G.box0 + 31, 6, 'fill="#1b1f24" stroke="#59626e" stroke-width="1"') + C(w - 172, G.box0 + 31, 3.4, 'fill="#2fbf7f"');
    [10, w - 46].forEach(function (x) { s += R(x, G.box1, 36, 10, 'fill="#1b1f24"') + C(x + 18, G.box1 + 18, 9, 'fill="#2b3036" stroke="#0b0d10" stroke-width="1"'); });
    return s;
  }
  function jackAndBalance() {
    var j = G.jack, b = G.balance, s = '', x0 = cx - j.hw, x1 = cx + j.hw, mid = (j.top + 8 + j.bot - 6) / 2;
    // adjustable lifting platform (scissor lab jack)
    s += R(x0, j.bot - 6, x1 - x0, 6, 'rx="1.5" fill="url(#ppSteelV)" stroke="#5d6878" stroke-width=".8"');
    s += R(x0, j.top, x1 - x0, 8, 'rx="1.5" fill="url(#ppSteelV)" stroke="#5d6878" stroke-width=".8"');
    s += L(x0 + 30, j.top + 8, x1 - 30, j.bot - 6, 'stroke="#7d8898" stroke-width="4"') + L(x0 + 30, j.bot - 6, x1 - 30, j.top + 8, 'stroke="#7d8898" stroke-width="4"');
    s += C(cx, mid, 4, 'fill="#4a5361"') + L(cx, mid, x1 + 10, mid, 'stroke="#9aa5b3" stroke-width="3"') + R(x1 + 8, mid - 8, 14, 16, 'rx="3" fill="#1b1f24"');
    // balance housing and pan
    s += P('M' + (b.x0 + 4) + ' ' + b.bot + ' L' + (b.x0 + 12) + ' ' + b.top + ' H' + (b.x1 - 12) + ' L' + (b.x1 - 4) + ' ' + b.bot + ' Z', 'fill="url(#fxCase)" stroke="#8592a3" stroke-width="1.2"');
    s += R(cx - 7, b.pan + 7, 14, b.top - b.pan - 7, 'fill="url(#ppSteelD)" stroke="#3c4553" stroke-width=".7"');
    s += R(cx - 116, b.pan, 232, 7, 'rx="2" fill="url(#ppSteelV)" stroke="#5d6878" stroke-width="1"');
    s += R(cx - 56, b.top + 6, 112, 28, 'rx="4" fill="url(#ppScreen)" stroke="#3a4656" stroke-width="1"');
    s += T(b.x0 + 22, b.top + 24, 'BALANCE', MONO + ' font-size="8.5" font-weight="600" letter-spacing=".8" fill="#566578"');
    [0, 1].forEach(function (i) { s += R(cx + 72 + i * 22, b.top + 14, 16, 11, 'rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".7"'); });
    return s;
  }
  function flaskBack() { return P(flaskPath(0) + ' Z', 'fill="url(#fxGlass)" opacity=".55"') + P(INNER, 'fill="#f6fafd" opacity=".45"'); }
  function flaskFront() {
    var s = '', x = cx;
    s += P(flaskPath(0), 'fill="none" stroke="#7fa6c2" stroke-width="1.8" stroke-linejoin="round"');
    s += P(flaskPath(fl.wallIn), 'fill="none" stroke="#a9c8dd" stroke-width="1.1" stroke-linejoin="round" opacity=".9"');
    s += P('M' + (x - fl.bodyHW + 26) + ' ' + (fl.bodyBot - 14) + ' L' + (x - fl.neckHW - 4) + ' ' + (fl.neckBot + 24), 'stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".5" fill="none"');
    s += P('M' + (x + fl.bodyHW - 34) + ' ' + (fl.bodyBot - 30) + ' L' + (x + fl.bodyHW - 58) + ' ' + (fl.bodyBot - 110), 'stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".45" fill="none"');
    s += L(x - fl.neckHW + 6, fl.neckTop + 8, x - fl.neckHW + 6, fl.neckBot - 4, 'stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"');
    // ground-glass joint band
    s += R(x - fl.neckHW, fl.neckTop, 2 * fl.neckHW, 26, 'fill="#e9eef2" opacity=".55"');
    return s;
  }
  function headInsert() {
    var h = G.head, x = cx;
    return P('M' + (x - 29) + ' ' + h.y1 + ' L' + (x - 26) + ' ' + h.insertBot + ' H' + (x + 26) + ' L' + (x + 29) + ' ' + h.y1 + ' Z', 'fill="#eef1f4" stroke="#aab4c0" stroke-width=".8" opacity=".9"');
  }
  function internalTubes() {
    var h = G.head, ix = G.inlet.x, ox = G.outlet.x, s = '';
    s += L(ix, h.insertBot - 2, ix, G.inlet.tip, 'stroke="#4a5361" stroke-width="6.2"') + L(ix, h.insertBot - 2, ix, G.inlet.tip, 'stroke="#c3cad4" stroke-width="4.2"');
    s += L(ix - 1.2, h.insertBot, ix - 1.2, G.inlet.tip - 4, 'stroke="#fff" stroke-width="1" opacity=".7"');
    s += P('M' + (ix - 3.1) + ' ' + G.inlet.tip + ' L' + (ix + 3.1) + ' ' + (G.inlet.tip + 3.5) + ' V' + G.inlet.tip + ' Z', 'fill="#4a5361"');
    s += L(ox, h.insertBot - 2, ox, G.outlet.open, 'stroke="#4a5361" stroke-width="7.2"') + L(ox, h.insertBot - 2, ox, G.outlet.open, 'stroke="#c3cad4" stroke-width="5.2"');
    s += E(ox, G.outlet.open, 3.6, 1.4, 'fill="#28313d"');
    return s;
  }
  function head(cut) {
    var h = G.head, s = '', ix = G.inlet.x, ox = G.outlet.x;
    s += R(h.x0 - 6, h.y1 - 10, h.x1 - h.x0 + 12, 12, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"');      // clamp ring
    s += R(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0 - 8, 'rx="4" fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1.1"');
    s += R(h.x0 + 4, h.y0 + 3, h.x1 - h.x0 - 8, 3, 'fill="#fff" opacity=".6"');
    [h.x0 + 6, h.x1 - 6].forEach(function (x) { s += C(x, h.y1 - 4, 2.4, 'fill="#5d6878"'); });
    // two bosses on top: sample delivery (left), headspace gas outlet (right), each with a compression nut
    [ix, ox].forEach(function (x) { s += R(x - 7, h.y0 - 12, 14, 12, 'fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"') + F.nut(x, h.y0 - 16, 'v', 1); });
    if (cut) {
      s += R(h.x0 + 2, h.y0 + 6, h.x1 - h.x0 - 4, h.y1 - h.y0 - 16, 'fill="url(#ppHatch)" opacity=".5"');
      [ix, ox].forEach(function (x) { s += L(x, h.y0 - 10, x, h.y1 + 1, 'stroke="#28313d" stroke-width="3.6"'); });
    }
    return s;
  }
  function manifold() {
    var g = G, s = '', ix = g.inlet.x, ox = g.outlet.x;
    // stainless tubing (drawn along the same routes as the flow lanes)
    s += F.tube(F.path(0, g.sY).H(ix - 8).turn(ix, g.sY, ix, g.head.y0 - 16, 8).V(g.head.y0 - 16).end());
    s += F.tube(F.path(ox, g.head.y0 - 16).V(g.gY + 8).turn(ox, g.gY, g.W, g.gY, 8).H(g.W).end());
    s += F.tube(F.path(g.vacX, g.gY).V(g.vacY - 8).turn(g.vacX, g.vacY, g.W, g.vacY, 8).H(g.W).end());
    s += F.tube(F.path(g.vesX, g.gY).V(g.vesY - 8).turn(g.vesX, g.vesY, g.ves.x + Parts.VG.side[0] - 6, g.vesY, 8).H(g.ves.x + Parts.VG.side[0] - 6).end());
    s += F.tube(F.path(g.pt, g.gY).V(g.gY - 26).end());
    [g.pt, g.vacX, g.vesX].forEach(function (x) { s += F.tee(x, g.gY); });
    [[124, g.sY], [206, g.sY], [ox + 44, g.gY], [440, g.gY], [580, g.gY]].forEach(function (q) { s += F.nut(q[0], q[1], 'h', .9); });
    s += F.nut(ix, 160, 'v', .9) + F.nut(ox, 170, 'v', .9) + F.nut(g.vesX, 250, 'v', .9);
    // bulkheads on the posts
    [[0, g.sY], [g.W, g.gY], [g.W, g.vacY]].forEach(function (q) { var x = q[0] ? g.W - g.post : 0; s += R(x - 2, q[1] - 11, g.post + 4, 22, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"'); });
    // solenoid flow-control valve: body on the line, coil above, cable
    var sx = g.sol;
    s += R(sx - 15, g.sY - 11, 30, 22, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width="1"');
    s += R(sx - 6, g.sY - 22, 12, 12, 'fill="url(#ppSteelV)" stroke="#2a3443" stroke-width=".8"');
    s += R(sx - 15, g.sY - 52, 30, 32, 'rx="4" fill="#1b1f24" stroke="#000" stroke-width="1"') + R(sx - 11, g.sY - 46, 22, 3, 'fill="#4a525d"');
    s += P('M' + (sx + 15) + ' ' + (g.sY - 40) + ' C ' + (sx + 40) + ' ' + (g.sY - 40) + ', ' + (sx + 50) + ' ' + (g.sY - 56) + ', ' + (sx + 70) + ' ' + (g.sY - 56) + ' H ' + (g.pt - 30), 'fill="none" stroke="#1e2733" stroke-width="2.4" stroke-linecap="round"');
    // pressure transducer on the gas manifold
    s += R(g.pt - 11, g.gY - 62, 22, 38, 'rx="4" fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1"') + R(g.pt - 6, g.gY - 70, 12, 9, 'fill="#3c4553"');
    s += P('M' + g.pt + ' ' + (g.gY - 70) + ' C ' + g.pt + ' ' + (g.gY - 84) + ', ' + (g.pt - 20) + ' ' + (g.gY - 76) + ', ' + (g.pt - 30) + ' ' + (g.gY - 76), 'fill="none" stroke="#1e2733" stroke-width="2.4" stroke-linecap="round"');
    // labels printed on the mounting plate
    s += T(116, 110, 'SAMPLE IN', MONO + ' font-size="9" font-weight="600" letter-spacing=".7" fill="#566578"');
    s += T(g.W - 30, g.gY - 14, 'TO GASOMETER', 'text-anchor="end" ' + MONO + ' font-size="9" font-weight="600" letter-spacing=".7" fill="#566578"');
    s += T(g.vesX + 12, g.vesY - 10, 'TO VESSEL', MONO + ' font-size="9" font-weight="600" letter-spacing=".7" fill="#566578"');
    s += T(g.W - 30, g.vacY + 24, 'VACUUM QC', 'text-anchor="end" ' + MONO + ' font-size="9" font-weight="600" letter-spacing=".7" fill="#566578"');
    return s;
  }

  /* ------------------------------------------------------------ dynamic parts */
  function contents(V) {
    var s = '', top = oilTop(V.oil || 0), x = cx;
    s += '<clipPath id="fuClip"><path d="' + INNER + '"/></clipPath><g clip-path="url(#fuClip)">';
    if (V.heTint > 0.01) s += R(x - 160, fl.neckTop, 320, fl.bot - fl.neckTop, 'fill="url(#fxHe)" opacity="' + r1(.26 * V.heTint) + '"');
    if (V.gasTint > 0.01) s += R(x - 160, fl.neckTop, 320, top - fl.neckTop, 'fill="url(#fxGas)" opacity="' + r1(.30 * V.gasTint) + '"');
    if (V.vacTint > 0.01) s += R(x - 160, fl.neckTop, 320, fl.bot - fl.neckTop, 'fill="#7d93b8" opacity="' + r1(.10 * V.vacTint) + '"');
    if (V.oil > 0.05) {
      var wob = Math.sin((V.t || 0) * 2.4) * (V.dripOn ? 1 : 0.3);
      s += P('M' + (x - 160) + ' ' + r1(top + wob) + ' Q' + x + ' ' + r1(top - wob) + ' ' + (x + 160) + ' ' + r1(top + wob) + ' V' + fl.bot + ' H' + (x - 160) + ' Z', 'fill="url(#fxOil)"');
      s += R(x - 160, top, 320, fl.bot - top, 'fill="url(#fxOilH)"');
      s += E(x, top + .6, hwIn(top) - 1, 2.6, 'fill="#f7d77a" opacity=".55"');
    }
    s += '</g>';
    return s;
  }
  function drops(V) {
    var s = '', top = oilTop(V.oil || 0), tip = G.inlet.tip + 4, ix = G.inlet.x, t = V.t || 0;
    if (V.drip) {
      // drop k lands when the oil reaches 2.5 k g (16 drops = 40 g, the existing oil result)
      var u = V.drip.u, N = 16, I = 1 / N;
      if (V.drip.pre > 0 && u <= 0) { var r0 = 1.2 + 3.4 * V.drip.pre; s += E(ix, tip + r0 * .9, r0, r0 * 1.15, 'fill="url(#fxOil)" stroke="#c48a1c" stroke-width=".5"'); }
      for (var k = 1; k <= N; k++) {
        var land = k * I, fall = land - .7 * I, grow = fall - .9 * I;
        if (u < grow || u > land + .5 * I) continue;
        if (u < fall) { var q = (u - grow) / (.9 * I), r = 1.4 + 3.2 * q; s += E(ix, tip + r * .9, r, r * (1 + .25 * q), 'fill="url(#fxOil)" stroke="#c48a1c" stroke-width=".5"'); }
        else if (u < land) { var q2 = (u - fall) / (.7 * I), y = tip + 5 + (top - tip - 7) * q2 * q2; s += E(ix, y, 3.6, 5, 'fill="url(#fxOil)" stroke="#c48a1c" stroke-width=".5"'); }
        else { var q3 = (u - land) / (.5 * I); s += E(ix, top + .5, 5 + 22 * q3, 1.2 + 1.8 * q3, 'fill="none" stroke="#f6dc8a" stroke-width="1.1" opacity="' + r1(.8 * (1 - q3)) + '"'); }
      }
    }
    if (V.bubbles > 0.01) {
      // gas released from the sample: bubbles in the oil and along the drop path, rising through the headspace to the outlet
      var a = V.bubbles;
      for (var i = 0; i < 16; i++) {
        var inOil = i % 2 === 0, ph = (t * (.30 + (i % 4) * .05) + i * .131) % 1;
        var x0 = inOil ? cx - 110 + (i * 53) % 220 : ix + Math.sin(i) * 6, src = inOil ? fl.bot - 10 : tip + 10;
        var yT = G.outlet.open + 6, y = src - (src - yT) * ph, xx = x0 + (G.outlet.x - x0) * Math.pow(ph, 2.4) * .9 + Math.sin(t * 2 + i) * 2;
        var rr = 1.8 + (i % 3) * .7, inLiquid = y > top;
        s += C(xx, y, rr, 'fill="' + (inLiquid ? '#fff4d6' : '#e6fbf4') + '" stroke="' + (inLiquid ? '#b9861b' : '#2fa88a') + '" stroke-width=".9" opacity="' + r1(a * (1 - ph * .5)) + '"');
      }
    }
    if (V.heIn > 0.01) {
      for (var j = 0; j < 10; j++) {
        var pj = (t * .4 + j / 10) % 1, yy = G.outlet.open + pj * 230, xj = G.outlet.x + Math.sin(j * 1.9 + t) * 6 + (j - 5) * 14 * pj;
        s += C(xj, yy, 2, 'fill="#e8f7ff" stroke="#3aa6d8" stroke-width=".9" opacity="' + r1(V.heIn * (1 - pj)) + '"');
      }
    }
    if (V.airOut > 0.01) {
      for (var m = 0; m < 10; m++) {
        var pm = (t * .45 + m / 10) % 1, sx = cx - 110 + (m * 31) % 220, sy = fl.bodyBot - 30 - (m * 29) % 170;
        s += C(sx + (G.outlet.x - sx) * pm, sy + (G.outlet.open - sy) * pm, 1.8, 'fill="#eef3fb" stroke="#7d93b8" stroke-width=".8" opacity="' + r1(V.airOut * (1 - pm * .6)) + '"');
      }
    }
    return s;
  }
  function arm(V) {
    var a = G.arm, s = '', x0 = cx + fl.bodyHW - 6, open = (V.cock || 0) > 0.5, full = oilTop(V.oil || 0) < a.y - 4;
    var d = 'M' + x0 + ' ' + a.y + ' H' + (a.x1 - 6) + ' Q' + a.x1 + ' ' + a.y + ' ' + a.x1 + ' ' + (a.y - 6) + ' V' + (a.top + 6);
    s += P(d, 'fill="none" stroke="#7fa6c2" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"') + P(d, 'fill="none" stroke="#f3f8fc" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"');
    if (full) s += P('M' + (x0 - 2) + ' ' + a.y + ' H' + (open ? a.x1 - 6 : a.cock - 5) + (open ? ' Q' + a.x1 + ' ' + a.y + ' ' + a.x1 + ' ' + (a.y - 6) + ' V' + (a.top + 6) : ''), 'fill="none" stroke="#d99a26" stroke-width="4.8" stroke-linejoin="round"');
    s += C(a.cock, a.y, 9, 'fill="#f4f6f8" stroke="#7d8898" stroke-width="1.2"');
    s += '<g transform="rotate(' + (open ? 0 : 90) + ' ' + a.cock + ' ' + a.y + ')">' + R(a.cock - 16, a.y - 2.8, 32, 5.6, 'rx="2.8" fill="#1b1f24"') + '</g>';
    s += R(a.x1 - 7, a.top - 8, 14, 12, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"') + R(a.x1 - 5, a.top - 13, 10, 6, 'rx="1" fill="#e9edf2" stroke="#5d6878" stroke-width=".7"');
    return s;
  }
  // blue gas-collection vessel inside the right bay: stands on the lower deck, strap clamp to the right post
  function vesselSupport() {
    var v = G.ves, s = '', yc = v.y - 150;
    s += R(v.x - 44, v.y - 6, 88, 6, 'rx="1.5" fill="url(#ppSteelV)" stroke="#5d6878" stroke-width=".8"');
    s += R(v.x + 30, yc - 4, G.W - G.post - v.x - 30, 8, 'fill="url(#ppSteelV)" stroke="#5d6878" stroke-width=".7"');
    return s;
  }
  function vessel(V) {
    var v = G.ves, s = '', yc = v.y - 150;
    s += '<g transform="translate(' + v.x + ' ' + v.y + ')">' + Parts.vessel(V) + '</g>';
    s += R(v.x - 33, yc - 6, 66, 12, 'rx="3" fill="none" stroke="#1b1f24" stroke-width="3"');
    var bp = 14.5 * F.clamp((V.balloon || 0) / 250, 0, 1), ty = v.y - Parts.VG.h - 142;
    s += R(v.x - 40, ty, 80, 24, 'rx="3" fill="url(#ppScreen)" stroke="#3a4656" stroke-width="1"');
    s += T(v.x + 32, ty + 17, bp.toFixed(1) + '<tspan font-size="9" fill="#8fb3cc"> psi</tspan>', 'text-anchor="end" ' + MONO + ' font-size="13" font-weight="600" fill="' + (bp > 0.05 ? '#7ff0bf' : '#5fd4ff') + '"');
    s += T(v.x, ty - 6, 'GAS VESSEL', 'text-anchor="middle" ' + MONO + ' font-size="8.5" font-weight="600" letter-spacing=".7" fill="#566578"');
    return s;
  }
  function valves(V) {
    var g = G, v = V.valve || {}, s = '';
    s += F.valve(g.iso, g.sY, 'h', v.inlet || 0, { side: 'up', tag: [0, 34] });
    // solenoid state lamp (energised = open)
    s += C(g.sol, g.sY - 30, 3.6, 'fill="' + ((v.inlet || 0) > 0.5 ? '#2fbf7f' : '#59626e') + '"');
    s += F.valve(g.vacX, g.vacValveY, 'v', v.vac || 0, { side: 'left', tag: [-58, 2] });
    // quick-connect: capped unless the temporary vacuum hose is attached
    var h = V.vacHose || 0;
    s += R(g.W + 2, g.vacY - 8, 14, 16, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"');
    if (h < 0.98) s += R(g.W + 14, g.vacY - 7, 8, 14, 'rx="2" fill="#c8323c" stroke="#7e1a22" stroke-width=".8" opacity="' + r1(1 - h) + '"');
    return s;
  }
  function displays(V) {
    var s = '', y = G.box0 + 46;
    var pc = V.fuP < 0.5 ? '#7ff0bf' : V.path === 'vac' ? '#5fd4ff' : '#ffc56b';
    s += T(160, y, (V.fuP == null ? 14.7 : V.fuP).toFixed(1) + '<tspan font-size="10" fill="#8fb3cc"> psia</tspan>', 'text-anchor="end" ' + MONO + ' font-size="17" font-weight="600" fill="' + pc + '"');
    s += T(320, y, (V.flowOn ? '0.3' : '0.0') + '<tspan font-size="10" fill="#8fb3cc"> mL/min</tspan>', 'text-anchor="end" ' + MONO + ' font-size="17" font-weight="600" fill="' + (V.flowOn ? '#ffc56b' : '#5fd4ff') + '"');
    s += T(cx + 48, G.balance.top + 27, (V.bal == null ? 200 : V.bal).toFixed(1) + '<tspan font-size="10" fill="#8fb3cc"> g</tspan>', 'text-anchor="end" ' + MONO + ' font-size="17" font-weight="600" fill="' + ((V.oil || 0) > 0.5 ? '#ffc56b' : '#5fd4ff') + '"');
    return s;
  }

  function layers(o) {
    o = o || {};
    var cut = o.view !== 'exterior';
    return [
      { id: 'fu-back', html: frameBack() },
      { id: 'fu-man', html: manifold() },
      { id: 'fu-jack', html: jackAndBalance() },
      { id: 'fu-fback', html: flaskBack() + headInsert() },
      { id: 'fu-in', fn: contents },
      { id: 'fu-int', html: internalTubes() },
      { id: 'fu-drop', fn: drops },
      { id: 'fu-ffront', html: flaskFront() + head(cut) },
      { id: 'fu-arm', fn: arm },
      { id: 'fu-vsup', html: vesselSupport() },
      { id: 'fu-ves', fn: vessel },
      { id: 'fu-valves', fn: valves },
      { id: 'fu-front', html: frameFront() },
      { id: 'fu-disp', fn: displays }
    ];
  }

  // label callouts (local units) — shared by the Flash Unit view and Flash Unit Details
  var LABELS = [
    { id: 'inletValve', n: 'Inlet-control valve', s: 'isolation · black lever', a: [G.iso, 46], p: [-34, 18], an: 'end' },
    { id: 'sampleIn', n: 'Sample inlet', s: 'from Pump A · Port R', a: [6, G.sY], p: [-34, G.sY], an: 'end' },
    { id: 'manifold', n: 'Stainless-steel manifold', s: 'upper mounting plate', a: [40, 128], p: [-34, 130], an: 'end' },
    { id: 'tube', n: 'Sample delivery tube', s: 'through the head', a: [G.inlet.x - 3, 200], p: [-34, 196], an: 'end' },
    { id: 'head', n: 'Flask head', s: 'sealed · 2 passages', a: [G.head.x0, 250], p: [-34, 258], an: 'end' },
    { id: 'tip', n: 'Delivery tip', s: 'inside the flask', a: [G.inlet.x - 4, G.inlet.tip], p: [-34, 330], an: 'end' },
    { id: 'flask', n: 'Large glass flask', s: 'separation happens here', a: [cx - 130, 470], p: [-34, 420], an: 'end' },
    { id: 'oil', n: 'Collected oil', s: 'weighed on the balance', a: [cx - 126, 586], p: [-34, 520], an: 'end' },
    { id: 'balance', n: 'Balance', s: 'tare + oil', a: [cx - 128, 630], p: [-34, 610], an: 'end' },
    { id: 'platform', n: 'Adjustable platform', s: 'lab jack', a: [cx - 140, 672], p: [-34, 680], an: 'end' },
    { id: 'flowCtl', n: 'Flow-control component', s: 'solenoid valve', a: [G.sol, 20], p: [G.sol + 40, -40], an: 'middle' },
    { id: 'pt', n: 'Pressure transducer', s: 'unit pressure · psia', a: [G.pt, 58], p: [G.pt + 70, -40], an: 'middle' },
    { id: 'gasLine', n: 'Gasometer line', s: 'headspace gas out', a: [G.W + 4, G.gY], p: [770, 96], an: 'start' },
    { id: 'vacConn', n: 'Temporary vacuum connection', s: 'quick-connect · pump is external', a: [G.W + 20, G.vacY], p: [770, 176], an: 'start' },
    { id: 'outlet', n: 'Headspace gas outlet', s: 'opening above the liquid', a: [G.outlet.x + 4, G.outlet.open], p: [770, 256], an: 'start' },
    { id: 'vesselConn', n: 'Gas-collection vessel connection', s: 'branch to the vessel valve', a: [G.vesX + 4, 300], p: [770, 316], an: 'start' },
    { id: 'headspace', n: 'Gas headspace', s: 'gas gathers here', a: [cx + 50, 380], p: [770, 376], an: 'start' },
    { id: 'vessel', n: 'Blue gas-collection vessel', s: 'own top valve · inside the frame', a: [G.ves.x + 30, 470], p: [770, 450], an: 'start' },
    { id: 'release', n: 'Gas-release region', s: 'bubbles rise through the oil', a: [cx + 80, 556], p: [770, 520], an: 'start' },
    { id: 'arm', n: 'Oil sampling side-arm', s: 'stopcock · Stage 7', a: [G.arm.x1 + 6, G.arm.top + 4], p: [770, 590], an: 'start' }
  ];

  window.FlashUnit = {
    G: G, RT: RT, layers: layers, oilTop: oilTop, LABELS: LABELS,
    port: { sampleIn: [0, G.sY], gasOut: [G.W, G.gY], vac: [G.W + 16, G.vacY], sample: [G.arm.x1, G.arm.top - 13] }
  };
})();
