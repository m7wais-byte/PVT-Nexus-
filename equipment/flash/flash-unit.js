/* FlashUnit — atmospheric flash unit (Prototype 02, rev. D).
   Black rectangular frame with transparent panels. ONE upper horizontal stainless manifold under the top
   panel: sample inlet -> inlet-control valve -> solenoid flow-control -> FLASK VALVE (junction) ->
   pressure transducer -> balloon branch -> vacuum branch -> Gasometer bulkhead.
   Two downward vessel connections:
     - the glass flask: ONE shared connection through the neck. Sample goes down it and drops from its
       open end inside the flask; gas released in the flask rises into the headspace and returns up the
       same connection to the manifold and on to the Gasometer.
     - the blue gas balloon (vessel): hung from the right post by two ring clamps; the branch reaches the
       side fitting of its own brass valve. That valve is operated from above the top panel through an
       extension stem; no second valve is drawn.
   Flask Valve and Balloon Valve handles sit above the top panel, aligned with what they control.
   The vacuum quick-connect on the right post is used only with the TEMPORARY pump in Stage 2.
   Live state (view model V from sim.js). Drawing only. */
(function () {
  'use strict';
  var F = window.FX, R = F.R, C = F.C, E = F.E, P = F.P, L = F.L, T = F.T, MONO = F.MONO, SANS = F.SANS, r1 = F.r1;

  var cx = 262;
  var G = {
    W: 720, H: 780, post: 18, rail: 24, box0: 690, box1: 752,
    flask: { cx: cx, neckTop: 268, neckBot: 318, neckHW: 32, wallIn: 4, bodyBot: 586, bodyHW: 150, bot: 600, botHW: 132 },
    head: { x0: cx - 40, x1: cx + 40, y0: 240, y1: 268 },
    tip: 334,                                                // open end of the shared connection, inside the flask
    M: 70, iso: 70, sol: 150, pt: 384, balT: 600, vacX: 470, vacValveY: 46, vacY: -10,   // vacuum QC on top of the panel
    ves: { x: 600, y: 468 },                                 // vessel origin (base centre); side fitting at y 128
    handleY: -16,                                            // handle level above the top panel
    balance: { x0: cx - 130, x1: cx + 130, pan: 600, top: 614, bot: 652 },
    jack: { top: 652, bot: 690, hw: 140 },
    arm: { y: 566, x1: cx + 172, top: 532, cock: cx + 158 },
    oilMaxH: 52                                              // drawing scale: 40 g (existing flash result) fills 52 units
  };
  // balloon on the same vertical centreline as its valve: handle, junction on the manifold, straight tube, balloon neck
  G.vesNeck = G.ves.y - Parts.VG.h - Parts.VG.sh - 10;     // top of the neck fitting
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
    var target = VOL[G.oilMaxH] * F.clamp(g / 40, 0, 1.6);
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

  /* ------------------------------------------------------------ routes (local units)
     The sample and the returning gas share the flask connection (x = cx). In the animation the liquid core
     runs on the left of the bore and the gas on the right (GX), so both directions stay readable. */
  var GX = 2.6, SX = -1.6;
  var RT = {};
  (function () {
    var g = G, M = g.M;
    RT.sIn = F.path(0, M).H(cx + SX - 8).turn(cx + SX, M, cx + SX, g.tip, 8).V(g.tip).end();
    RT.sInValve = g.sol;
    RT.gOut = F.path(cx + GX, g.tip).V(M + 8).turn(cx + GX, M, g.W, M, 8).H(g.W).end();
    RT.vac = F.path(cx + GX, g.tip).V(M + 8).turn(cx + GX, M, g.vacX, M, 8).H(g.vacX - 8).turn(g.vacX, M, g.vacX, g.vacY, 8).V(g.vacY - 14).end();
    RT.ves = F.path(g.W, M).H(g.balT + 8).turn(g.balT, M, g.balT, g.vesNeck, 8).V(g.vesNeck)
      .H(g.ves.x).V(g.ves.y - Parts.VG.h + 4).end();
  })();
  RT.heIn = F.geo('', RT.gOut.pts.slice().reverse());
  // Stage 2 evacuation covers the whole section between the closed boundary valves (Port R at the PVT Cell,
  // Gasometer inlet valve): each connected branch is drawn toward the vacuum branch and up to the QC.
  (function () {
    var g = G, M = g.M, up = function (p) { return p.turn(g.vacX, M, g.vacX, g.vacY, 8).V(g.vacY - 14).end(); };
    RT.vacIn = up(F.path(0, M).H(g.vacX - 8));                                     // sample line + manifold (inlet valves open)
    RT.vacGas = up(F.path(g.W, M).H(g.vacX + 8));                                  // Gasometer line up to the Flash Unit
    // gas-cap collection used by Differential Liberation / Separator Test (Flask Valve closed)
    RT.capBal = F.path(0, M).H(g.balT - 8).turn(g.balT, M, g.balT, g.vesNeck, 8).V(g.ves.y - Parts.VG.h + 4).end();
    RT.capGas = F.path(0, M).H(g.W).end();
    RT.vacBal = up(F.path(g.balT - 12, M).H(g.vacX + 8));                          // manifold up to the CLOSED Balloon Valve junction (balloon side isolated)
  })();
  RT.shared = { x: cx, y0: G.M, y1: G.tip };

  /* ------------------------------------------------------------ static parts */
  function frameBack() {
    var s = '', w = G.W;
    s += E(w / 2, G.H + 2, w / 2 + 12, 8, 'fill="#1b2a40" opacity=".12"');
    s += R(G.post, G.rail, w - 2 * G.post, G.box0 - G.rail, 'fill="#eef3f7"');
    s += R(G.post, G.rail, w - 2 * G.post, G.box0 - G.rail, 'fill="#cfdde8" opacity=".35"');
    // slim stainless mounting bar behind the manifold
    s += R(G.post, G.M - 16, w - 2 * G.post, 32, 'fill="url(#fxBrushed)" opacity=".75"');
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
    return P('M' + (x - 29) + ' ' + h.y1 + ' L' + (x - 26) + ' ' + (h.y1 + 22) + ' H' + (x + 26) + ' L' + (x + 29) + ' ' + h.y1 + ' Z', 'fill="#eef1f4" stroke="#aab4c0" stroke-width=".8" opacity=".9"');
  }
  // the one shared connection: a single wider-bore tube from the head into the flask, open at the bottom
  function internalTubes() {
    var h = G.head, s = '', y0 = h.y1 + 20;
    s += L(cx, y0, cx, G.tip, 'stroke="#4a5361" stroke-width="10"') + L(cx, y0, cx, G.tip, 'stroke="#d9e0e8" stroke-width="7.6"');
    s += L(cx - 2.6, y0 + 2, cx - 2.6, G.tip - 3, 'stroke="#fff" stroke-width="1" opacity=".7"');
    s += E(cx, G.tip, 4.6, 1.6, 'fill="#28313d"');
    return s;
  }
  function head(cut) {
    var h = G.head, s = '';
    s += R(h.x0 - 6, h.y1 - 10, h.x1 - h.x0 + 12, 12, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"');      // clamp ring
    s += R(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0 - 8, 'rx="4" fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1.1"');
    s += R(h.x0 + 4, h.y0 + 3, h.x1 - h.x0 - 8, 3, 'fill="#fff" opacity=".6"');
    [h.x0 + 6, h.x1 - 6].forEach(function (x) { s += C(x, h.y1 - 4, 2.4, 'fill="#5d6878"'); });
    s += R(cx - 8, h.y0 - 12, 16, 12, 'fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"') + F.nut(cx, h.y0 - 16, 'v', 1.1);   // single fitting
    if (cut) { s += R(h.x0 + 2, h.y0 + 6, h.x1 - h.x0 - 4, h.y1 - h.y0 - 16, 'fill="url(#ppHatch)" opacity=".5"') + L(cx, h.y0 - 10, cx, h.y1 + 1, 'stroke="#28313d" stroke-width="5"'); }
    return s;
  }
  function manifold() {
    var g = G, s = '', M = g.M;
    s += F.tube(F.path(0, M).H(g.W).end());                                                        // the one upper manifold
    s += F.tube(F.path(cx, M).V(g.head.y0 - 16).end());                                             // flask connection (down)
    s += F.tube(F.path(g.balT, M).V(g.vesNeck).end());                                           // balloon connection: straight down to the neck
    s += F.tube(F.path(g.vacX, M).V(g.vacY).end());                                                // vacuum branch, up through the top panel
    s += F.tube(F.path(g.pt, M).V(M + 26).end());
    [g.pt, g.vacX].forEach(function (x) { s += F.tee(x, M); });
    [[112, M], [206, M], [326, M], [510, M], [620, M]].forEach(function (q) { s += F.nut(q[0], q[1], 'h', .9); });
    s += F.nut(cx, 170, 'v', .9) + F.nut(g.balT, 110, 'v', .9);
    s += R(g.balT - 17, M - 13, 34, 26, 'rx="3" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width="1.1"') + R(g.balT - 14, M - 10, 28, 3, 'fill="#fff" opacity=".45"');   // Balloon Valve body at the junction
    [[0, M], [g.W, M]].forEach(function (q) { var x = q[0] ? g.W - g.post : 0; s += R(x - 2, q[1] - 11, g.post + 4, 22, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"'); });
    // solenoid flow-control valve on the manifold
    var sx = g.sol;
    s += R(sx - 15, M - 11, 30, 22, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width="1"');
    s += R(sx - 6, M - 18, 12, 8, 'fill="url(#ppSteelV)" stroke="#2a3443" stroke-width=".8"');
    s += R(sx - 15, M - 44, 30, 26, 'rx="4" fill="#1b1f24" stroke="#000" stroke-width="1"') + R(sx - 11, M - 40, 22, 3, 'fill="#4a525d"');
    // pressure transducer, hanging below the manifold
    s += R(g.pt - 11, M + 24, 22, 34, 'rx="4" fill="url(#ppSteel)" stroke="#2a3443" stroke-width="1"') + R(g.pt - 6, M + 58, 12, 8, 'fill="#3c4553"');
    // flask-valve body at the junction, balloon valve extension stem guide
    s += R(cx - 17, M - 13, 34, 26, 'rx="3" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width="1.1"') + R(cx - 14, M - 10, 28, 3, 'fill="#fff" opacity=".45"');
    s += T(26, M + 30, 'SAMPLE IN', MONO + ' font-size="9" font-weight="600" letter-spacing=".7" fill="#566578"');
    s += T(g.W - 28, M + 30, 'TO GASOMETER', 'text-anchor="end" ' + MONO + ' font-size="9" font-weight="600" letter-spacing=".7" fill="#566578"');
    return s;
  }
  // top-panel controls: stems through the panel, handles above it (Flask Valve, Balloon Valve)
  function topControls(V) {
    var g = G, v = V.valve || {}, s = '', y = g.handleY;
    var ctl = function (x, yBody, open, name, knob) {
      var on = open > 0.5, o = '';
      var w = 7;
      o += L(x, yBody, x, y + 6, 'stroke="#2a3443" stroke-width="' + w + '"') + L(x, yBody, x, y + 6, 'stroke="#c3cad4" stroke-width="' + (w - 2) + '"');
      o += R(x - 9, -2, 18, 6, 'rx="1.5" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"');            // gland on the panel
      if (knob) o += R(x - 18, y - 8, 36, 16, 'rx="5" fill="#1b1f24" stroke="#000" stroke-width="1"') + L(x - 12, y - 5, x - 12, y + 5, 'stroke="#3a414b" stroke-width="1.4"') + L(x, y - 5, x, y + 5, 'stroke="#3a414b" stroke-width="1.4"') + L(x + 12, y - 5, x + 12, y + 5, 'stroke="#3a414b" stroke-width="1.4"');
      else o += '<g transform="rotate(' + (on ? 90 : 0) + ' ' + x + ' ' + y + ')">' + R(x - 22, y - 3.6, 44, 7.2, 'rx="3.6" fill="#1b1f24" stroke="#000" stroke-width=".8"') + '</g>' + C(x, y, 4, 'fill="#c5ccd6" stroke="#2a3443" stroke-width=".8"');
      o += R(x - 27, y - 40, 54, 16, 'rx="8" fill="' + (on ? '#dff3e8' : '#e4e8ee') + '" stroke="' + (on ? '#4fae80' : '#9aa6b5') + '" stroke-width=".9"') +
        T(x, y - 28, on ? 'OPEN' : 'CLOSED', 'text-anchor="middle" ' + MONO + ' font-size="9" font-weight="700" fill="' + (on ? '#14603f' : '#566578') + '"');
      o += T(x, y - 48, name, 'text-anchor="middle" ' + SANS + ' font-size="12" font-weight="700" fill="var(--txt, #1d2836)"');
      if (on) o += C(x, y, 24, 'fill="none" stroke="#1d8a5a" stroke-width="2" opacity=".9"');
      return o;
    };
    s += ctl(cx, g.M - 13, v.flask || 0, 'Flask Valve', false);
    s += ctl(g.balT, g.M - 13, v.vessel || 0, 'Balloon Valve', true);
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
  // direction marks on the shared connection: oil down (left of the bore), gas up (right of the bore)
  function sharedMarks(V) {
    if (V.stage !== 4) return '';
    var p = V.p || 0, s = '', t = V.t || 0, y0 = G.M + 24, y1 = G.head.y0 - 22;
    var dn = F.ramp(0.287, 0.32, p) * (1 - F.ramp(0.9, 0.97, p)), up = F.ramp(0.40, 0.44, p) * (1 - F.ramp(0.9, 0.97, p));
    for (var i = 0; i < 3; i++) {
      var f = ((t * 0.9 + i / 3) % 1), yd = y0 + (y1 - y0) * f, yu = y1 - (y1 - y0) * f;
      if (dn > 0.01) s += '<path d="M' + (cx - 9) + ' ' + r1(yd - 4) + ' L' + (cx - 5) + ' ' + r1(yd + 1) + ' L' + (cx - 1) + ' ' + r1(yd - 4) + '" fill="none" stroke="#d79a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="' + r1(dn * (0.4 + 0.6 * Math.sin(f * Math.PI))) + '"/>';
      if (up > 0.01) s += '<path d="M' + (cx + 1) + ' ' + r1(yu + 4) + ' L' + (cx + 5) + ' ' + r1(yu - 1) + ' L' + (cx + 9) + ' ' + r1(yu + 4) + '" fill="none" stroke="#2fa88a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="' + r1(up * (0.4 + 0.6 * Math.sin(f * Math.PI))) + '"/>';
    }
    return s;
  }
  function drops(V) {
    var s = '', top = oilTop(V.oil || 0), tip = G.tip + 4, ix = cx, t = V.t || 0;
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
        var x0 = inOil ? cx - 110 + (i * 53) % 220 : ix + 8 + Math.sin(i) * 8, src = inOil ? fl.bot - 10 : tip + 60;
        var yT = G.tip + 8, y = src - (src - yT) * ph, xx = x0 + (cx + 3 - x0) * Math.pow(ph, 2.4) * .95 + Math.sin(t * 2 + i) * 2;
        var rr = 1.8 + (i % 3) * .7, inLiquid = y > top;
        s += C(xx, y, rr, 'fill="' + (inLiquid ? '#fff4d6' : '#e6fbf4') + '" stroke="' + (inLiquid ? '#b9861b' : '#2fa88a') + '" stroke-width=".9" opacity="' + r1(a * (1 - ph * .5)) + '"');
      }
    }
    if (V.heIn > 0.01) {
      for (var j = 0; j < 10; j++) {
        var pj = (t * .4 + j / 10) % 1, yy = G.tip + pj * 220, xj = cx + Math.sin(j * 1.9 + t) * 6 + (j - 5) * 14 * pj;
        s += C(xj, yy, 2, 'fill="#e8f7ff" stroke="#3aa6d8" stroke-width=".9" opacity="' + r1(V.heIn * (1 - pj)) + '"');
      }
    }
    if (V.airOut > 0.01) {
      for (var m = 0; m < 10; m++) {
        var pm = (t * .45 + m / 10) % 1, sx = cx - 110 + (m * 31) % 220, sy = fl.bodyBot - 30 - (m * 29) % 170;
        s += C(sx + (cx - sx) * pm, sy + (G.tip - sy) * pm, 1.8, 'fill="#eef3fb" stroke="#7d93b8" stroke-width=".8" opacity="' + r1(V.airOut * (1 - pm * .6)) + '"');
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
  // the balloon hangs from its own valve assembly: branch to the side fitting + stem housing up to the top-panel gland
  function vesselSupport() { return ''; }
  function vessel(V) {
    var v = G.ves, s = '';
    s += '<g transform="translate(' + v.x + ' ' + v.y + ')">' + Parts.vessel(V, { neck: true }) + '</g>';
    // a page with its own balloon reading (Differential Liberation psig, two decimals) passes it as V.balloonTxt
    var bp = 14.5 * F.clamp((V.balloon || 0) / 250, 0, 1), ty = v.y + 18;
    s += R(v.x - 40, ty, 80, 24, 'rx="3" fill="url(#ppScreen)" stroke="#3a4656" stroke-width="1"');
    s += T(v.x + 32, ty + 17, (V.balloonTxt != null ? V.balloonTxt : bp.toFixed(1)) + '<tspan font-size="9" fill="#8fb3cc"> ' + (V.balloonUnit || 'psi') + '</tspan>', 'text-anchor="end" ' + MONO + ' font-size="13" font-weight="600" fill="' + (bp > 0.05 ? '#7ff0bf' : '#5fd4ff') + '"');
    s += T(v.x, ty + 38, 'BALLOON', 'text-anchor="middle" ' + MONO + ' font-size="8.5" font-weight="600" letter-spacing=".7" fill="#566578"');
    return s;
  }
  function valves(V) {
    var g = G, v = V.valve || {}, s = '';
    s += F.valve(g.iso, g.M, 'h', v.inlet || 0, { side: 'down', tag: [0, 46] });
    s += C(g.sol, g.M - 28, 3.6, 'fill="' + ((v.inlet || 0) > 0.5 ? '#2fbf7f' : '#59626e') + '"');      // solenoid lamp (energised = open)
    s += F.valve(g.vacX, g.vacValveY, 'v', v.vac || 0, { side: 'left' });
    // vacuum quick-connect above the top panel: red cap unless the temporary hose is attached
    var h = V.vacHose || 0, qy = g.vacY;
    s += R(g.vacX - 9, -2, 18, 6, 'rx="1.5" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"');
    s += R(g.vacX - 7, qy - 10, 14, 12, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".9"');
    if (h < 0.98) s += R(g.vacX - 8, qy - 20, 16, 11, 'rx="2.5" fill="#c8323c" stroke="#7e1a22" stroke-width=".8" opacity="' + r1(1 - h) + '"');
    var lx = g.vacX - 62;
    s += T(lx, qy - 30, 'Vacuum QC', 'text-anchor="middle" ' + SANS + ' font-size="12" font-weight="700" fill="var(--txt, #1d2836)"');
    s += R(lx - 27, qy - 22, 54, 16, 'rx="8" fill="' + (h > 0.98 ? '#dff3e8' : '#e4e8ee') + '" stroke="' + (h > 0.98 ? '#4fae80' : '#9aa6b5') + '" stroke-width=".9"') +
      T(lx, qy - 10, h > 0.98 ? 'HOSE ON' : 'CAPPED', 'text-anchor="middle" ' + MONO + ' font-size="9" font-weight="700" fill="' + (h > 0.98 ? '#14603f' : '#566578') + '"');
    return s;
  }
  function displays(V) {
    var s = '', y = G.box0 + 46;
    var pc = V.fuP < 0.5 ? '#7ff0bf' : V.path === 'vac' ? '#5fd4ff' : '#ffc56b';
    // no unit pressure in the page's data: the display shows the unit status instead of a number (V.fuPTxt)
    if (V.fuPTxt) s += T(160, y - 1, V.fuPTxt, 'text-anchor="end" ' + MONO + ' font-size="11" font-weight="700" letter-spacing=".6" fill="#8fb3cc"');
    else s += T(160, y, (V.fuP == null ? '—' : V.fuP.toFixed(1)) + '<tspan font-size="10" fill="#8fb3cc"> psia</tspan>', 'text-anchor="end" ' + MONO + ' font-size="17" font-weight="600" fill="' + pc + '"');
    s += T(320, y, (V.flowTxt != null ? V.flowTxt : V.flowOn ? '0.3' : '0.0') + '<tspan font-size="10" fill="#8fb3cc"> mL/min</tspan>', 'text-anchor="end" ' + MONO + ' font-size="17" font-weight="600" fill="' + (V.flowOn || V.flowTxt ? '#ffc56b' : '#5fd4ff') + '"');
    // balance: V.balTxt replaces the reading where weighing is not part of the procedure step; an empty flask
    // reads the glass tare, captioned as such so 200.0 g is never read as collected oil
    var b = G.balance;
    if (V.balTxt) s += T(cx, b.top + 25, V.balTxt, 'text-anchor="middle" ' + MONO + ' font-size="10" font-weight="700" letter-spacing=".5" fill="#8fb3cc"');
    else s += T(cx + 48, b.top + 27, (V.bal == null ? 200 : V.bal).toFixed(1) + '<tspan font-size="10" fill="#8fb3cc"> g</tspan>', 'text-anchor="end" ' + MONO + ' font-size="17" font-weight="600" fill="' + ((V.oil || 0) > 0.5 ? '#ffc56b' : '#5fd4ff') + '"');
    var note = V.balNote != null ? V.balNote : !V.balTxt && (V.oil || 0) < 0.05 ? 'EMPTY FLASK · TARE' : '';
    if (note) s += R(cx - 78, b.bot + 3, 156, 15, 'rx="7.5" fill="#eef2f6" stroke="#9aa6b5" stroke-width=".8"') +
      T(cx, b.bot + 13.5, note, 'text-anchor="middle" ' + MONO + ' font-size="8.5" font-weight="700" letter-spacing=".5" fill="#3a4759"');
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
      { id: 'fu-top', fn: topControls },
      { id: 'fu-marks', fn: sharedMarks },
      { id: 'fu-disp', fn: displays }
    ];
  }

  // label callouts (local units) — shared by the Flash Unit view and Flash Unit Details
  var LABELS = [
    { id: 'sampleIn', n: 'Sample inlet', s: 'from Pump A · Port R', a: [6, G.M], p: [-34, 70], an: 'end' },
    { id: 'inletValve', n: 'Inlet-control valve', s: 'isolation · black lever', a: [G.iso - 4, 92], p: [-34, 130], an: 'end' },
    { id: 'flowCtl', n: 'Flow-control component', s: 'solenoid valve', a: [G.sol - 15, 40], p: [-34, 190], an: 'end' },
    { id: 'shared', n: 'Shared flask connection', s: 'sample down · gas back up', a: [cx - 5, 200], p: [-34, 250], an: 'end' },
    { id: 'head', n: 'Flask head', s: 'sealed · one fitting', a: [G.head.x0, 252], p: [-34, 310], an: 'end' },
    { id: 'tip', n: 'Open end in the flask', s: 'oil drops · gas enters', a: [cx - 5, G.tip], p: [-34, 370], an: 'end' },
    { id: 'flask', n: 'Large glass flask', s: 'separation happens here', a: [cx - 130, 470], p: [-34, 440], an: 'end' },
    { id: 'oil', n: 'Collected oil', s: 'weighed on the balance', a: [cx - 126, 586], p: [-34, 530], an: 'end' },
    { id: 'balance', n: 'Balance', s: 'tare + oil', a: [cx - 128, 630], p: [-34, 610], an: 'end' },
    { id: 'platform', n: 'Adjustable platform', s: 'lab jack', a: [cx - 140, 672], p: [-34, 680], an: 'end' },
    { id: 'manifold', n: 'Upper manifold', s: 'one horizontal stainless line', a: [G.W - 70, G.M + 4], p: [770, 40], an: 'start' },
    { id: 'gasLine', n: 'Gasometer line', s: 'gas from the flask headspace', a: [G.W + 4, G.M], p: [770, 96], an: 'start' },
    { id: 'pt', n: 'Pressure transducer', s: 'unit pressure · psia', a: [G.pt + 11, G.M + 40], p: [770, 150], an: 'start' },
    { id: 'vacConn', n: 'Temporary vacuum connection', s: 'QC on the top panel · pump is external', a: [G.vacX + 10, G.vacY - 4], p: [770, -20], an: 'start' },
    { id: 'balloonConn', n: 'Balloon connection', s: 'straight down to the balloon neck', a: [G.balT + 4, 110], p: [770, 274], an: 'start' },
    { id: 'headspace', n: 'Gas headspace', s: 'gas gathers, then rises up the connection', a: [cx + 40, 380], p: [770, 334], an: 'start' },
    { id: 'vessel', n: 'Blue gas balloon', s: 'hangs below the Balloon Valve', a: [G.ves.x + 30, 330], p: [770, 394], an: 'start' },
    { id: 'release', n: 'Gas-release region', s: 'bubbles rise through the oil', a: [cx + 80, 556], p: [770, 470], an: 'start' },
    { id: 'arm', n: 'Oil sampling side-arm', s: 'stopcock · Stage 7', a: [G.arm.x1 + 6, G.arm.top + 4], p: [770, 540], an: 'start' }
  ];

  window.FlashUnit = {
    G: G, RT: RT, layers: layers, oilTop: oilTop, LABELS: LABELS,
    port: { sampleIn: [0, G.M], gasOut: [G.W, G.M], vac: [G.vacX, G.vacY - 12], sample: [G.arm.x1, G.arm.top - 13] }
  };
})();
