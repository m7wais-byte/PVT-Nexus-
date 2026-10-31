/* ============================================================================
   BottomHoleSim — Module 01 · Bottom-hole sampling (Open Hole / Cased Hole)

   Native DOM + SVG module, mounted by Main.js into the host <div> of the
   Bottom Hole page (same mount pattern as the PVT Calculator, PvtCalc).

   ONE timeline drives everything. Every drawn state (tool position, probe,
   valves, pump, chamber levels, flows, readings) is a pure function of the
   timeline time t, so:
     - the tool in the well and the enlarged cutaway are drawn by the SAME
       function from the SAME state object (drawOhTool / drawSrsTool) —
       the inset is only a magnified copy, never a separate illustration;
     - pause / resume / replay / step navigation are exact.

   Open hole  : MDT-type formation tester, wireline truck + drilling-rig mast.
                Probe module (probe + backup pistons) -> fluid analyzer ->
                pumpout module (exhaust to wellbore) -> MRMS multisample
                module with 2 MPSR bottles (floating piston, buffer vented
                to wellbore). Generic layout — no manufacturer internals.
   Cased hole : SRS (Single-phase Reservoir Sampler) on wireline through a
                lubricator, in the production tubing of a flowing well.
                Clock trigger -> inlet valve -> piston sample chamber ->
                restrictor -> air chamber, N2 pressure compensation.
                Flowline: tree wing outlet -> choke manifold -> test separator.

   Values: 8,450 ft TVD, 4,820 psia reservoir pressure, 238 °F and Psat
   2,515 psia come from the simulator / report data (PVT_REPORT).
   Mud hydrostatic, pretest and flowing drawdown pressures are ILLUSTRATIVE.
   ========================================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------------ helpers */
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var ease = function (t) { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var f1 = function (v) { return (Math.round(v * 10) / 10).toString(); };
  var n0 = function (v) { return Math.round(v).toLocaleString('en-US'); };
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function mixC(a, b, t) {
    var x = hex(a), y = hex(b), r = [0, 1, 2].map(function (i) { return Math.round(lerp(x[i], y[i], clamp(t, 0, 1))); });
    return '#' + r.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  function psm() { return (typeof window.PSM === 'function') ? window.PSM() : 1; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'; }); }

  // polyline length and partial polyline (for advancing fluid fronts)
  function plen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function ppart(pts, frac) {
    if (frac <= 0) return [];
    if (frac >= 1) return pts.slice();
    var target = plen(pts) * frac, out = [pts[0]], acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + d >= target) { var k = (target - acc) / d; out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]); return out; }
      acc += d; out.push(pts[i]);
    }
    return out;
  }
  function pd(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join(' '); }
  // bottom external tangent between two circles -> [p1, p2]
  function botTangent(c1, r1, c2, r2) {
    var dx = c2[0] - c1[0], dy = c2[1] - c1[1], L = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    var ph = Math.acos((r1 - r2) / L), best = null;
    [th + ph, th - ph].forEach(function (a) {
      var p1 = [c1[0] + r1 * Math.cos(a), c1[1] + r1 * Math.sin(a)], p2 = [c2[0] + r2 * Math.cos(a), c2[1] + r2 * Math.sin(a)];
      if (!best || p1[1] + p2[1] > best[0][1] + best[1][1]) best = [p1, p2];
    });
    return best;
  }

  /* line with fluid: base pipe + optional fluid + optional moving dashes */
  function flow(pts, o) {
    if (!pts || pts.length < 2) return '';
    var d = pd(pts), s = '';
    if (o.fluid) s += '<path d="' + d + '" fill="none" stroke="' + o.fluid + '" stroke-width="' + o.w + '" stroke-linecap="round" stroke-linejoin="round" opacity="' + (o.op == null ? 1 : o.op) + '"/>';
    if (o.dash) s += '<path d="' + d + '" fill="none" stroke="' + (o.dashC || '#ffffff') + '" stroke-width="' + (o.w * .55).toFixed(2) + '" stroke-linecap="round" stroke-dasharray="' + o.dash + '" stroke-dashoffset="' + (o.off || 0).toFixed(2) + '" opacity=".9"/>';
    return s;
  }
  function valve(x, y, st, o) {
    // st: 'closed' | 'open' | 'sealed' ; o.v = vertical flow direction
    var r = o && o.r || 4.2, open = st === 'open';
    var fill = open ? (o.c || '#1fa9dc') : st === 'sealed' ? '#2e8a5e' : '#8b97a8';
    var tri = o && o.v
      ? 'M' + (x - r) + ' ' + (y - r) + ' L' + (x + r) + ' ' + (y - r) + ' L' + (x - r) + ' ' + (y + r) + ' L' + (x + r) + ' ' + (y + r) + ' Z'
      : 'M' + (x - r) + ' ' + (y - r) + ' L' + (x + r) + ' ' + (y + r) + ' L' + (x + r) + ' ' + (y - r) + ' L' + (x - r) + ' ' + (y + r) + ' Z';
    var s = '<path d="' + tri + '" fill="' + fill + '" stroke="#0b1320" stroke-width=".8" stroke-linejoin="round"/>';
    if (!open) s += (o && o.v) ? '<line x1="' + (x - r - 1.5) + '" y1="' + y + '" x2="' + (x + r + 1.5) + '" y2="' + y + '" stroke="#0b1320" stroke-width="1.3"/>'
                               : '<line x1="' + x + '" y1="' + (y - r - 1.5) + '" x2="' + x + '" y2="' + (y + r + 1.5) + '" stroke="#0b1320" stroke-width="1.3"/>';
    return s;
  }

  var C = {
    clean: '#e2772f',     // cleanup / waste route
    samp: '#1aa6db',      // sample-collection route
    prod: '#d6932a',      // production stream
    oil: '#e0a33e', oilD: '#a86a1c',
    filt: '#a8763a',      // mud filtrate
    buf: '#7fb3dc',       // water buffer (MPSR)
    hyd: '#9a8fd4',       // hydraulic oil (SRS)
    n2: '#cfe3f3',
    cable: '#1f2a3a', cableHi: '#a9bad0',
    steel: '#8494ad'
  };

  var RES = { depth: 8450, P: 4820, T: 238, psat: 2515 };      // simulator / report values
  var ILL = { mud: 5050, pretestLow: 4600, flowP: 4700, fbhp: 4640, whp: 1465, whT: 140, surfT: 78 };  // illustrative
  var CONT_LIMIT = 6;

  /* ======================================================================
     TIMELINES
     ==================================================================== */
  var OH_STEPS = [
    { k: 'rih',   t: 'Lower tool to sampling depth', q: 'Tool runs down on wireline to 8,450 ft.', s: 'Wireline pays out from the truck reel; the toolstring runs through the casing into the open-hole interval.', b: 5.2, h: .7 },
    { k: 'set',   t: 'Set probe and backup pistons', q: 'Backup pistons and probe packer seal on the wall.', s: 'Tool stopped at 8,450 ft. Backup pistons push the tool across; the probe packer seals on the borehole wall.', b: 3.4, h: .7 },
    { k: 'comm',  t: 'Establish formation communication', q: 'Pretest: pressure drops, then builds to formation pressure.', s: 'Pretest: a small volume is drawn. Pressure falls from mud hydrostatic, then builds up to formation pressure.', b: 3.8, h: .7 },
    { k: 'clean', t: 'Pump out contaminated fluid', q: 'Mud filtrate pumped to the wellbore. Bottles stay closed.', s: 'Pumpout module draws formation fluid through the probe and discharges it to the wellbore. Sample bottles stay closed.', b: 7.2, h: .6 },
    { k: 'div',   t: 'Quality met · divert to bottle 1', q: 'Contamination at the limit. Flow switched to bottle 1.', s: 'Contamination is at or below the sampling limit. Exhaust valve closes and bottle 1 valve opens.', b: 2.8, h: .7 },
    { k: 'fill',  t: 'Fill and seal sample bottles', q: 'Bottle 1, then bottle 2, filled and sealed.', s: 'Pumped fluid fills bottle 1 against its piston, the valve is sealed, then bottle 2 is filled and sealed.', b: 10.5, h: .7 },
    { k: 'ret',   t: 'Retract probe and backup', q: 'Pump stopped. Probe and backup retract.', s: 'Flow stopped. Probe and backup pistons retract, freeing the tool from the borehole wall.', b: 2.8, h: .7 },
    { k: 'pooh',  t: 'Retrieve tool to surface', q: 'Tool pulled to surface with both bottles sealed.', s: 'Tool pulled out of hole with both bottles sealed; ready for laboratory transfer.', b: 5.2, h: .9 }
  ];
  var CH_STEPS = [
    { k: 'rih',   t: 'Run sampler through pressure control', q: 'Sampler runs through the tree into the tubing.', s: 'Swab valve opened; the SRS runs from the lubricator, through the tree, down the production tubing.', b: 5.6, h: .7 },
    { k: 'stab',  t: 'Confirm stable sampling conditions', q: 'Flow steady and above Psat at 8,450 ft.', s: 'Tool held at 8,450 ft. Flowing pressure and temperature must be steady and above saturation pressure.', b: 4.6, h: .7 },
    { k: 'open',  t: 'Trigger · open sampler inlet', q: 'Clock opens the sampler inlet.', s: 'The sampler clock reaches its set time and opens the inlet valve to the flowing stream.', b: 2.4, h: .7 },
    { k: 'fill',  t: 'Fill sample chamber', q: 'Well fluid fills the chamber; piston moves down.', s: 'Well fluid enters the inlet ports; the floating piston moves down as buffer oil is metered into the air chamber.', b: 6.4, h: .7 },
    { k: 'seal',  t: 'Seal sample · N₂ compensation', q: 'Inlet closed. N₂ keeps the sample above Pres.', s: 'Inlet valve closes. N₂ pressure acts on the buffer side of the piston so the sample stays above reservoir pressure.', b: 3.2, h: .7 },
    { k: 'pooh',  t: 'Retrieve sealed sampler', q: 'Sealed sampler pulled up into the lubricator.', s: 'Sampler pulled up the tubing into the lubricator; the piston compensates for cooling while the sample stays sealed.', b: 5.6, h: .7 },
    { k: 'out',   t: 'Close in · ready for lab transfer', q: 'Well secured. Sampler laid down for the lab.', s: 'Swab valve closed, lubricator bled off, sampler laid down with the sealed single-phase sample.', b: 2.4, h: .9 }
  ];

  function buildTL(steps) {
    var k = psm(), t = 0;
    var st = steps.map(function (s) { var o = { st: t, d: s.b * k, h: s.h * k }; t += o.d + o.h; return o; });
    return { steps: st, total: t };
  }
  // progress of every step (0..1) at time t
  function progress(tl, t) {
    return tl.steps.map(function (s) { return clamp((t - s.st) / s.d, 0, 1); });
  }
  function stepAt(tl, t) {
    for (var i = tl.steps.length - 1; i >= 0; i--) if (t >= tl.steps[i].st) return i;
    return 0;
  }

  /* ======================================================================
     OPEN-HOLE SCENE GEOMETRY  (viewBox 0 0 1000 600)
     ==================================================================== */
  var G = 212;                 // ground
  var OH = {
    WX: 150, K: .22, HB: 44,   // well x, tool scale in well, borehole half-width (tool units)
    floor: 172, shoe: 430, td: 592, sampY: 500, probeL: 112, toolL: 470,
    topStage: 66,
    drum: [290, 166], lowS: [174, 160], topS: [158, 34], rS: 8,
    inset: { x: 536, y: 12, w: 454, h: 580, tx: 626, ty: 56 }
  };
  OH.topDepth = OH.sampY - OH.probeL * OH.K;
  var CH = {
    WX: 240, K: .2, HB: 35, CB: 75, // tool scale, tubing / casing half-width (tool units)
    inletL: 100, toolL: 440, topStage: 48, sampY: 412,
    tail: 488, packer: 470, perf0: 500, perf1: 550, td: 592,
    drum: [172, 166], lowS: [219, 200], topS: [233, 22], rS: 7,
    inset: { x: 536, y: 12, w: 454, h: 580, tx: 650, ty: 70 }
  };
  CH.topDepth = CH.sampY - CH.inletL * CH.K;

  function strat(y) {   // stratum fill at scene y (shared by both scenes and the insets)
    if (y < G) return null;
    if (y < 226) return 'var(--fm-soil)';
    if (y < 300) return 'var(--fm-shale)';
    if (y < 380) return 'var(--fm-silt)';
    if (y < 458) return 'var(--fm-seal)';
    return 'var(--fm-sand)';
  }
  function payAt(y) { return y >= 458 && y < 560 ? 'pay' : y >= 560 ? 'water' : null; }

  /* ======================================================================
     STATE — open hole
     ==================================================================== */
  // intake: probe -> analyzer -> pump ; out: pump -> junction ; exhaust ; bus to bottles
  var OT = {
    intakeA: [[24, 112], [12, 112], [12, 176]],                 // probe -> analyzer exit
    intakeB: [[12, 176], [12, 192], [-7, 192], [-7, 198]],      // analyzer -> pump inlet
    pumpOut: [[-7, 242], [-7, 252], [12, 252]],
    exhaust: [[12, 252], [24, 252], [34, 252]],
    bus1: [[12, 252], [12, 268], [0, 268], [0, 276]],
    bus2: [[12, 268], [12, 360], [0, 360], [0, 368]]
  };
  function ohState(tl, t, playing) {
    var P = progress(tl, t), i = stepAt(tl, t), done = t >= tl.total - 1e-6, started = t > 0;
    var down = ease(P[0]) * (1 - ease(P[7]));
    var top = lerp(OH.topStage, OH.topDepth, down);
    var probeY = top + OH.probeL * OH.K;
    var depthFrac = clamp((probeY - G) / (OH.sampY - G), 0, 1);
    var depth = depthFrac * RES.depth;
    var ext = ease(seg(P[1], .12, .85)) * (1 - ease(seg(P[6], .1, .8)));
    var bext = ease(seg(P[1], 0, .6)) * (1 - ease(seg(P[6], .25, .95)));
    // fluid fronts
    var fA = seg(P[2], .28, .9);                         // pretest draws fluid to the analyzer
    var fB = seg(P[3], 0, .12), fOut = seg(P[3], .1, .2), fEx = seg(P[3], .18, .26);
    var ev = P[3] > .16 && P[4] < .3 ? 'open' : 'closed';
    var v1 = P[4] < .45 ? 'closed' : P[5] < .44 ? 'open' : 'sealed';
    var v2 = P[5] < .5 ? 'closed' : P[5] < .93 ? 'open' : 'sealed';
    var fBus1 = seg(P[4], .5, .95);
    var fBus2 = seg(P[5], .5, .58);
    var fill1 = seg(P[5], .02, .42), fill2 = seg(P[5], .58, .92);
    var pumpOn = (P[3] > .06 && P[4] < .3) || (P[4] > .5 && P[5] < .42) || (P[5] > .54 && P[5] < .92);
    var route = !started ? 'none' : (P[3] > 0 && P[4] < .3) ? 'waste' : (P[4] >= .45 && P[5] < .42) ? 'b1' : (P[5] >= .5 && P[5] < .92) ? 'b2' : (P[2] > 0 && P[2] < 1 && fA > 0 && fA < 1) ? 'pretest' : 'none';
    if (P[4] >= .3 && P[4] < .45) route = 'switch';
    // contamination (optical fluid analyzer) — reading appears once fluid reaches the analyzer
    var contLive = P[2] >= .9;
    var cont = !contLive ? null : P[3] <= 0 ? 70 : 5 + 65 * Math.pow(1 - P[3], 2.2);
    if (contLive && P[3] >= 1) cont = 5;
    var qual = cont == null ? null : cont > 25 ? 'contaminated' : cont > CONT_LIMIT ? 'improving' : 'acceptable';
    // pressure
    var mudP = 14.7 + (ILL.mud - 14.7) * depthFrac;
    var set = ext > .98;
    var probeP = null;
    if (P[2] > 0 && P[6] < .2) {
      var q = P[2];
      probeP = q < .25 ? ILL.mud : q < .5 ? lerp(ILL.mud, ILL.pretestLow, smooth(seg(q, .25, .5))) : lerp(ILL.pretestLow, RES.P, smooth(seg(q, .5, .92)));
      if (P[3] > 0) probeP = pumpOn || route === 'switch' ? lerp(RES.P, ILL.flowP, smooth(seg(P[3], 0, .15))) : RES.P;
      if (P[5] >= .92) probeP = lerp(ILL.flowP, RES.P, smooth(seg(P[5], .92, 1)));
    }
    var pLabel = probeP != null ? 'Probe pressure' : 'Wellbore (mud) pressure';
    var pVal = probeP != null ? probeP : (started ? mudP : null);
    var T = started ? ILL.surfT + (RES.T - ILL.surfT) * depthFrac : null;
    return {
      mode: 'open', P: P, i: i, done: done, started: started, playing: playing, t: t,
      top: top, down: down, depth: depth, depthFrac: depthFrac,
      ext: ext, bext: bext, fA: fA, fB: fB, fOut: fOut, fEx: fEx, fBus1: fBus1, fBus2: fBus2,
      ev: ev, v1: v1, v2: v2, fill1: fill1, fill2: fill2, pumpOn: pumpOn, route: route,
      cont: cont, qual: qual, pVal: pVal, pLabel: pLabel, T: T, set: set,
      drawing: route === 'waste' || route === 'b1' || route === 'b2' || route === 'pretest' || route === 'switch'
    };
  }

  /* ======================================================================
     STATE — cased hole
     ==================================================================== */
  function chState(tl, t, playing, amb) {
    var P = progress(tl, t), i = stepAt(tl, t), done = t >= tl.total - 1e-6, started = t > 0;
    var down = ease(seg(P[0], .12, 1)) * (1 - ease(seg(P[5], 0, 1)));
    var top = lerp(CH.topStage, CH.topDepth, down);
    var inY = top + CH.inletL * CH.K;
    var depthFrac = clamp((inY - G) / (CH.sampY - G), 0, 1);
    var swab = !started ? 'closed' : (P[0] < .08 ? 'closed' : P[6] > .35 ? 'closed' : 'open');
    var trig = seg(P[2], 0, .45);                       // clock trigger
    var inlet = P[2] < .5 ? 'closed' : P[4] < .28 ? 'open' : 'sealed';
    var fill = P[3] > 0 ? Math.min(1, seg(P[3], .02, .95)) : 0;
    var n2 = seg(P[4], .45, .7);                        // N2 compensation armed
    var comp = n2 * (.4 + .6 * seg(P[5], 0, 1));        // piston shift as the sample cools
    // readings
    var pTool = started ? lerp(ILL.whp, ILL.fbhp, depthFrac) : null;
    var stabAmp = P[1] > 0 ? 26 * (1 - smooth(seg(P[1], 0, .8))) : 0;
    if (pTool != null && P[1] > 0 && P[5] <= 0) pTool += stabAmp * Math.sin(amb * 2.1);
    if (pTool != null && P[6] > 0) pTool = lerp(pTool, 14.7, smooth(seg(P[6], .4, .9)));
    var T = started ? lerp(ILL.whT, RES.T, depthFrac) : null;
    var stab = P[1] <= 0 ? null : P[1] < .8 ? 'checking' : 'stable';
    if (P[5] > 0) stab = null;
    return {
      mode: 'cased', P: P, i: i, done: done, started: started, playing: playing, t: t,
      top: top, down: down, depthFrac: depthFrac, depth: depthFrac * RES.depth,
      swab: swab, trig: trig, inlet: inlet, fill: fill, n2: n2, comp: comp,
      pVal: pTool, T: T, stab: stab,
      sampFlow: P[3] > 0 && P[3] < .96
    };
  }

  window.__BHS_INTERNAL = { ohState: ohState, chState: chState, buildTL: buildTL, OH_STEPS: OH_STEPS, CH_STEPS: CH_STEPS };
  /* ======================================================================
     TOOL DRAWINGS — used for BOTH the tool in the well and the enlarged
     cutaway (the inset is the same markup, only scaled).
     Local units: tool axis x = 0, cable head y = 0, y downward.
     ==================================================================== */
  function drawOhTool(s) {
    var o = '', t = s.t, P = s.P;
    var E = s.ext * (OH.HB - 24), B = s.bext * (OH.HB - 24);
    // backup pistons (left) — drawn first so the body overlaps their rods
    [88, 136].forEach(function (y) {
      o += '<rect x="' + (-24 - B - 1).toFixed(2) + '" y="' + (y - 3) + '" width="' + (B + 6).toFixed(2) + '" height="6" fill="#9aa9bf" stroke="#0b1320" stroke-width=".6"/>';
      o += '<rect x="' + (-24 - B - 4).toFixed(2) + '" y="' + (y - 9) + '" width="5" height="18" rx="1.5" fill="#56657d" stroke="#0b1320" stroke-width=".7"/>';
    });
    // probe (right): piston + packer
    o += '<rect x="18" y="108" width="' + (E + 4).toFixed(2) + '" height="8" fill="#b8c5d8" stroke="#0b1320" stroke-width=".6"/>';
    o += '<rect x="' + (20 + E).toFixed(2) + '" y="99" width="5" height="26" rx="2" fill="#20252e" stroke="#0b1320" stroke-width=".6"/>';
    o += '<rect x="' + (24.2 + E).toFixed(2) + '" y="109.5" width="1" height="5" fill="' + (s.drawing ? '#f3c27a' : '#3a4454') + '"/>';
    // cable head
    o += '<rect x="-3" y="-5" width="6" height="7" rx="1" fill="#4b5b75" stroke="#0b1320" stroke-width=".5"/>';
    o += '<path d="M-7 0 L7 0 L15 24 L-15 24 Z" fill="url(#bhsMetal)" stroke="#0b1320" stroke-width=".9"/>';
    // body shell + cutaway interior
    o += '<rect x="-24" y="24" width="48" height="428" rx="3" fill="url(#bhsMetal)" stroke="#0b1320" stroke-width="1"/>';
    o += '<rect x="-20" y="28" width="40" height="420" rx="2" fill="#0f1a2a"/>';
    o += modules([[28, 80, '#13231f'], [80, 146, '#142034'], [146, 184, '#1a1d36'], [184, 260, '#172339'], [260, 448, '#101b2b']], 20, 24);
    o += '<path d="M-24 452 L24 452 L15 470 L-15 470 Z" fill="url(#bhsMetal)" stroke="#0b1320" stroke-width=".9"/>';
    // power / telemetry cartridge
    for (var k = 0; k < 4; k++) o += '<rect x="-15" y="' + (33 + k * 10) + '" width="30" height="6" rx="1" fill="#1f3a34" stroke="#2f5a4f" stroke-width=".5"/>';
    // probe module hydraulics block
    o += '<rect x="-14" y="84" width="16" height="56" rx="2" fill="#1a2638" stroke="#33445e" stroke-width=".6"/>';
    o += '<rect x="-24" y="84" width="4" height="10" fill="#2b3a52"/><rect x="-24" y="130" width="4" height="10" fill="#2b3a52"/>';
    o += '<rect x="18" y="104" width="6" height="16" fill="#2b3a52"/>';
    // fluid analyzer cell
    var anC = s.cont == null ? '#223047' : mixC(C.filt, C.oil, clamp((65 - (s.cont - 5)) / 65, 0, 1));
    o += '<rect x="-16" y="158" width="10" height="18" rx="1.5" fill="#2c3a50"/>';
    o += '<line x1="-6" y1="167" x2="6" y2="167" stroke="' + (s.cont == null ? '#3a4a63' : '#ffe39a') + '" stroke-width="1" stroke-dasharray="1.5 1.5"/>';
    o += '<rect x="6" y="156" width="12" height="22" rx="2" fill="' + anC + '" stroke="#9fb3cf" stroke-width="1"/>';
    // pump cylinder + piston
    var pp = s.pumpOn ? (1 + Math.sin(t * 5.2)) / 2 : .5;
    o += '<rect x="-17" y="196" width="20" height="48" rx="2" fill="#1d2a3d" stroke="#6d7f9c" stroke-width="1"/>';
    o += '<rect x="-13" y="186" width="12" height="8" rx="1" fill="#34465f"/>';
    var py = 200 + pp * 34;
    o += '<rect x="-8" y="186" width="2" height="' + (py - 186).toFixed(2) + '" fill="#9fb0c8"/>';
    o += '<rect x="-16" y="' + py.toFixed(2) + '" width="18" height="5" fill="#aebbd0" stroke="#0b1320" stroke-width=".5"/>';
    // exhaust port in the shell
    o += '<rect x="21" y="249" width="4" height="6" fill="#05090f"/>';
    // bottles (MPSR) in the multisample module
    [[272, s.fill1, s.v1], [364, s.fill2, s.v2]].forEach(function (b, bi) {
      var y0 = b[0], f = b[1];
      o += '<rect x="-15" y="' + y0 + '" width="30" height="82" rx="4" fill="#3b4a63" stroke="#0b1320" stroke-width=".8"/>';
      var i0 = y0 + 4, i1 = y0 + 78, pyb = i0 + f * (i1 - i0 - 6);
      o += '<rect x="-11" y="' + i0 + '" width="22" height="' + (i1 - i0) + '" fill="' + C.buf + '" opacity=".75"/>';
      if (f > 0) o += '<rect x="-11" y="' + i0 + '" width="22" height="' + (pyb - i0).toFixed(2) + '" fill="url(#bhsOil)"/>';
      o += '<rect x="-12" y="' + pyb.toFixed(2) + '" width="24" height="6" rx="1" fill="#c9d3e1" stroke="#0b1320" stroke-width=".6"/>';
      o += '<rect x="-12" y="' + (pyb + 2.4).toFixed(2) + '" width="24" height="1.1" fill="#56657c"/>';
      o += '<rect x="-16" y="' + (y0 - 1) + '" width="32" height="5" rx="1.5" fill="url(#bhsMetalV)" stroke="#0b1320" stroke-width=".5"/><rect x="-16" y="' + (y0 + 78) + '" width="32" height="5" rx="1.5" fill="url(#bhsMetalV)" stroke="#0b1320" stroke-width=".5"/>';
      // buffer vent to wellbore (bottom left)
      o += '<path d="M-11 ' + (i1 - 3) + ' L-22 ' + (i1 - 3) + '" stroke="#51627e" stroke-width="2"/>';
      o += '<rect x="-25" y="' + (i1 - 6) + '" width="4" height="6" fill="#05090f"/>';
      var filling = (bi === 0 && s.route === 'b1') || (bi === 1 && s.route === 'b2');
      if (filling) o += flow([[-11, i1 - 3], [-24, i1 - 3], [-34, i1 - 3]], { fluid: C.buf, w: 2, dash: '2 3', off: t * 14, dashC: '#e8f4ff' });
    });
    // flowline network (base)
    [OT.intakeA, OT.intakeB, OT.pumpOut, OT.exhaust, OT.bus1, OT.bus2].forEach(function (p) {
      o += '<path d="' + pd(p) + '" fill="none" stroke="#475872" stroke-width="2.6" stroke-linejoin="round"/>';
    });
    // fluid in lines
    var rt = s.route, off = t * 16;
    var inCol = rt === 'b1' || rt === 'b2' ? C.samp : (rt === 'waste' || rt === 'pretest') ? C.clean : '#8f7d5f';
    var inAct = rt === 'waste' || rt === 'pretest' || rt === 'b1' || rt === 'b2';
    var fullIn = P[3] > 0;
    o += flow(ppart(OT.intakeA, fullIn ? 1 : s.fA), { fluid: inCol, w: 2.2, op: inAct ? 1 : .55, dash: inAct ? '2.5 3.5' : null, off: -off });
    o += flow(ppart(OT.intakeB, s.fB), { fluid: inCol, w: 2.2, op: inAct && rt !== 'pretest' ? 1 : .55, dash: inAct && rt !== 'pretest' ? '2.5 3.5' : null, off: -off });
    o += flow(ppart(OT.pumpOut, s.fOut), { fluid: inCol, w: 2.2, op: inAct && rt !== 'pretest' ? 1 : .55, dash: inAct && rt !== 'pretest' ? '2.5 3.5' : null, off: -off });
    var exOn = rt === 'waste' && s.ev === 'open';
    o += flow(ppart(OT.exhaust, s.fEx), { fluid: exOn ? C.clean : '#8f7d5f', w: 2.2, op: exOn ? 1 : .45, dash: exOn ? '2.5 3.5' : null, off: -off });
    if (exOn && s.fEx >= 1) {
      for (var d = 0; d < 5; d++) {
        var ph = ((t * .9 + d / 5) % 1);
        o += '<circle cx="' + (34 + ph * 8).toFixed(2) + '" cy="' + (252 + Math.sin((ph + d) * 6) * 4 - ph * 6).toFixed(2) + '" r="' + (1.6 - ph).toFixed(2) + '" fill="' + C.clean + '" opacity="' + (1 - ph).toFixed(2) + '"/>';
      }
    }
    o += flow(ppart(OT.bus1, s.fBus1), { fluid: rt === 'b1' ? C.samp : '#6f8fa8', w: 2.2, op: rt === 'b1' ? 1 : .5, dash: rt === 'b1' ? '2.5 3.5' : null, off: -off });
    o += flow(ppart(OT.bus2, s.fBus2), { fluid: rt === 'b2' ? C.samp : '#6f8fa8', w: 2.2, op: rt === 'b2' ? 1 : .5, dash: rt === 'b2' ? '2.5 3.5' : null, off: -off });
    // valves
    o += valve(18, 252, s.ev, { r: 3.6, c: C.clean });
    o += valve(6, 268, s.v1, { r: 3.6, c: C.samp });
    o += valve(6, 360, s.v2, { r: 3.6, c: C.samp });
    // check valves at pump in/out
    o += '<path d="M-10 196 L-4 196 L-7 192 Z" fill="#9fb0c8"/><path d="M-10 246 L-4 246 L-7 250 Z" fill="#9fb0c8"/>';
    return o;
  }

  /* housing sections: tinted module bays, divider lines and tool-joint collars on the housing */
  function modules(list, iw, ow) {
    var o = '';
    list.forEach(function (m, k) {
      o += '<rect x="' + (-iw) + '" y="' + m[0] + '" width="' + (2 * iw) + '" height="' + (m[1] - m[0]) + '" fill="' + m[2] + '"/>';
      if (k) {
        o += '<line x1="' + (-iw) + '" y1="' + m[0] + '" x2="' + iw + '" y2="' + m[0] + '" stroke="#3a4b66" stroke-width="1"/>';
        o += '<rect x="' + (-ow - 2.5) + '" y="' + (m[0] - 3) + '" width="' + (ow - iw + 3.5) + '" height="6" rx="1" fill="url(#bhsMetalV)" stroke="#0b1320" stroke-width=".6"/>';
        o += '<rect x="' + (iw - 1) + '" y="' + (m[0] - 3) + '" width="' + (ow - iw + 3.5) + '" height="6" rx="1" fill="url(#bhsMetalV)" stroke="#0b1320" stroke-width=".6"/>';
      }
    });
    return o;
  }
  var ST = { inTop: 124, inBot: 258, stroke: 126 };   // SRS sample chamber
  function drawSrsTool(s) {
    var o = '', t = s.t, P = s.P;
    o += '<rect x="-3" y="-5" width="6" height="7" rx="1" fill="#4b5b75" stroke="#0b1320" stroke-width=".5"/>';
    o += '<path d="M-5 0 L5 0 L13 22 L-13 22 Z" fill="url(#bhsMetal)" stroke="#0b1320" stroke-width=".9"/>';
    o += '<rect x="-20" y="22" width="40" height="402" rx="3" fill="url(#bhsMetal)" stroke="#0b1320" stroke-width="1"/>';
    o += '<rect x="-16" y="26" width="32" height="394" rx="2" fill="#0f1a2a"/>';
    o += '<path d="M-20 424 L20 424 L12 440 L-12 440 Z" fill="url(#bhsMetal)" stroke="#0b1320" stroke-width=".9"/>';
    o += modules([[26, 82, '#152035'], [82, 122, '#141d30'], [122, 262, '#0f1a2a'], [262, 282, '#172339'], [282, 352, '#121c2c'], [352, 420, '#16213a']], 16, 20);
    // clock / trigger
    var a = -Math.PI / 2 + s.trig * Math.PI * 1.7;
    o += '<circle cx="0" cy="50" r="11" fill="#1a2638" stroke="#8fa2bf" stroke-width="1.2"/>';
    for (var k = 0; k < 8; k++) { var aa = k * Math.PI / 4; o += '<line x1="' + (8 * Math.cos(aa)).toFixed(2) + '" y1="' + (50 + 8 * Math.sin(aa)).toFixed(2) + '" x2="' + (10 * Math.cos(aa)).toFixed(2) + '" y2="' + (50 + 10 * Math.sin(aa)).toFixed(2) + '" stroke="#8fa2bf" stroke-width=".7"/>'; }
    o += '<line x1="0" y1="50" x2="' + (8 * Math.cos(a)).toFixed(2) + '" y2="' + (50 + 8 * Math.sin(a)).toFixed(2) + '" stroke="#ffd27a" stroke-width="1.4" stroke-linecap="round"/>';
    o += '<circle cx="0" cy="70" r="2.4" fill="' + (s.trig >= 1 ? '#46d39a' : '#3a4a63') + '"/>';
    // inlet ports + passages + inlet valve
    o += '<rect x="-21" y="97" width="5" height="6" fill="#05090f"/><rect x="16" y="97" width="5" height="6" fill="#05090f"/>';
    var passL = [[-16, 100], [0, 100]], passR = [[16, 100], [0, 100]], down = [[0, 100], [0, 124]];
    [passL, passR, down].forEach(function (p) { o += '<path d="' + pd(p) + '" fill="none" stroke="#475872" stroke-width="2.6"/>'; });
    if (s.sampFlow) {
      var off = t * 16;
      o += flow([[-30, 92], [-21, 100], [0, 100]], { fluid: C.samp, w: 2.2, dash: '2.5 3.5', off: -off });
      o += flow([[30, 92], [21, 100], [0, 100]], { fluid: C.samp, w: 2.2, dash: '2.5 3.5', off: -off });
      o += flow(down, { fluid: C.samp, w: 2.2, dash: '2.5 3.5', off: -off });
    } else if (s.fill > 0) {
      o += flow(down, { fluid: C.oil, w: 2.2, op: .7 });
    }
    o += valve(0, 112, s.inlet, { r: 3.8, v: true, c: C.samp });
    // sample chamber: sample above the floating piston, buffer oil below
    var py = ST.inTop + s.fill * ST.stroke - s.comp * 6;
    o += '<rect x="-13" y="' + ST.inTop + '" width="26" height="' + (ST.inBot - ST.inTop) + '" fill="' + C.hyd + '" opacity=".8"/>';
    if (py > ST.inTop + .3) o += '<rect x="-13" y="' + ST.inTop + '" width="26" height="' + (py - ST.inTop).toFixed(2) + '" fill="url(#bhsOil)"/>';
    o += '<rect x="-14" y="' + py.toFixed(2) + '" width="28" height="7" rx="1" fill="#c9d3e1" stroke="#0b1320" stroke-width=".6"/>';
    o += '<rect x="-14" y="' + (py + 3).toFixed(2) + '" width="28" height="1.2" fill="#2d3a4f"/>';
    // N2 compensation: N2 pressure transmitted up the buffer line to the underside of the piston
    o += '<path d="M9 352 L9 ' + ST.inBot + '" stroke="#34465f" stroke-width="1.6"/>';
    if (s.n2 > 0) {
      var op = (.35 + .65 * s.n2).toFixed(2);
      o += '<path d="M9 352 L9 ' + (py + 8).toFixed(2) + '" stroke="#8fc4ea" stroke-width="1.8" opacity="' + op + '"/>';
      for (var cy = 340; cy > py + 14; cy -= 18) o += '<path d="M5 ' + (cy + 4) + ' L9 ' + cy + ' L13 ' + (cy + 4) + '" fill="none" stroke="#dff0ff" stroke-width="1.2" opacity="' + op + '"/>';
      o += '<rect x="-13" y="' + (py + 7).toFixed(2) + '" width="26" height="2" fill="#8fc4ea" opacity="' + op + '"/>';
    }
    // restrictor (metering orifice)
    o += '<path d="M0 258 L0 286" stroke="#475872" stroke-width="2.6"/>';
    o += '<path d="M-6 268 L-1 272 L-6 276 Z M6 268 L1 272 L6 276 Z" fill="#9fb0c8"/>';
    var metering = s.sampFlow;
    if (metering) o += flow([[0, 258], [0, 288]], { fluid: C.hyd, w: 2.2, dash: '2 3', off: -t * 10, dashC: '#f1eeff' });
    // air chamber receiving buffer oil
    o += '<rect x="-13" y="286" width="26" height="62" fill="#c9d6e4" opacity=".16"/>';
    var h = s.fill * 52;
    if (h > .2) o += '<rect x="-13" y="' + (348 - h).toFixed(2) + '" width="26" height="' + h.toFixed(2) + '" fill="' + C.hyd + '" opacity=".8"/>';
    // N2 chamber
    o += '<rect x="-13" y="360" width="26" height="58" fill="' + C.n2 + '" opacity="' + (.55 + .35 * s.n2).toFixed(2) + '"/>';
    for (var d = 0; d < 9; d++) o += '<circle cx="' + (-8 + (d % 3) * 8) + '" cy="' + (368 + Math.floor(d / 3) * 16) + '" r="1.2" fill="#6f93b3"/>';
    o += valve(0, 355, s.n2 > .5 ? 'open' : 'closed', { r: 3.4, v: true, c: '#8fc4ea' });
    return o;
  }

  /* ======================================================================
     STATIC SCENE PIECES
     ==================================================================== */
  function defs() {
    // FieldSketch defs (overview metal / shell / fluid gradients, handwheel symbol) are shared so the
    // surface equipment reused from the overview renders identically; DC template attributes converted.
    var fs = (window.FieldSketch ? window.FieldSketch.defs : '').replace(/sc-camel-([a-z-]+)=/g, function (m, n) {
      return n.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }) + '=';
    });
    return '<defs>' + fs +
      '<linearGradient id="bhsMetal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a374c"/><stop offset=".18" stop-color="#6c7fa0"/><stop offset=".45" stop-color="#c3cfe0"/><stop offset=".62" stop-color="#8697b3"/><stop offset=".86" stop-color="#435270"/><stop offset="1" stop-color="#222c3d"/></linearGradient>' +
      '<linearGradient id="bhsMetalV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ea1c0"/><stop offset=".35" stop-color="#c9d5e7"/><stop offset=".6" stop-color="#5a6b88"/><stop offset="1" stop-color="#222d41"/></linearGradient>' +
      '<linearGradient id="bhsOil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a5b16"/><stop offset=".3" stop-color="#e3a13d"/><stop offset=".55" stop-color="#ffd07a"/><stop offset=".8" stop-color="#d88d28"/><stop offset="1" stop-color="#8c4f12"/></linearGradient>' +
      '<linearGradient id="bhsSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sky1)"/><stop offset="1" stop-color="var(--sky2)"/></linearGradient>' +
      '<linearGradient id="bhsTruck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f9fc"/><stop offset=".55" stop-color="#dfe6ef"/><stop offset="1" stop-color="#b9c4d2"/></linearGradient>' +
      '<linearGradient id="bhsCabGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9d4ee"/><stop offset="1" stop-color="#5f86ad"/></linearGradient>' +
      '<linearGradient id="bhsShale" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fm-shale)"/><stop offset="1" stop-color="var(--fm-shale2)"/></linearGradient>' +
      '<linearGradient id="bhsSilt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fm-silt)"/><stop offset="1" stop-color="var(--fm-silt2)"/></linearGradient>' +
      '<linearGradient id="bhsSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fm-sand)"/><stop offset="1" stop-color="var(--fm-sand2)"/></linearGradient>' +
      '<pattern id="bhsSeal" width="14" height="8" patternUnits="userSpaceOnUse"><path d="M0 4 L14 4" stroke="var(--fm-seal-line)" stroke-width="1.1"/><path d="M0 8 L7 8" stroke="var(--fm-seal-line)" stroke-width=".9" opacity=".6"/></pattern>' +
      '<pattern id="bhsGrain" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".9" fill="var(--fm-grain)"/><circle cx="10" cy="9" r="1.1" fill="var(--fm-grain)"/><circle cx="6" cy="12" r=".7" fill="var(--fm-grain)"/></pattern>' +
      '<pattern id="bhsCement" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#aab2bd"/><line x1="0" y1="0" x2="0" y2="6" stroke="#8b949f" stroke-width="1.4"/></pattern>' +
      '</defs>';
  }
  // wavy layer boundary (overview style); the offset is zero on the well axis W, so the enlarged
  // cutaway (which reads the layer at the axis) always matches the scene
  function waveLine(y0, W, amp, ph) {
    var pts = [];
    for (var x = -3000; x <= 4000; x += 40) {
      var d = x - W;
      pts.push([x, y0 + amp * (Math.sin(d * .012 + ph) - Math.sin(ph)) + amp * .45 * (Math.sin(d * .031 + 2 * ph) - Math.sin(2 * ph))]);
    }
    return pts;
  }
  function bandPath(top, bot) { return pd(top) + ' ' + pd(bot.slice().reverse()).replace('M', 'L') + ' Z'; }
  function strata(W) {
    // drawn far past the 1000 x 600 viewBox (the SVG overflows): the sky, every layer and the water
    // leg run to the schematic edges at any window shape
    var X0 = -3000, XW = 7000, YB = 2600;
    var s = '<rect x="' + X0 + '" y="-2000" width="' + XW + '" height="2000" fill="var(--sky1)"/>';
    s += '<rect x="' + X0 + '" y="0" width="' + XW + '" height="' + G + '" fill="url(#bhsSky)"/>';
    var flat = function (y) { return [[X0, y], [X0 + XW, y]]; };
    var b226 = waveLine(226, W, 2, .6), b300 = waveLine(300, W, 4, 1.7), b380 = waveLine(380, W, 5, 2.4), b458 = waveLine(458, W, 5, .9), b560 = waveLine(560, W, 4, 2.9);
    s += '<path d="' + bandPath(flat(G), b226) + '" fill="var(--fm-soil)"/>';
    s += '<path d="' + bandPath(b226, b300) + '" fill="url(#bhsShale)"/>';
    s += '<path d="' + bandPath(b300, b380) + '" fill="url(#bhsSilt)"/>';
    s += '<path d="' + bandPath(b380, b458) + '" fill="var(--fm-seal)"/><path d="' + bandPath(b380, b458) + '" fill="url(#bhsSeal)" opacity=".55"/>';
    s += '<path d="' + bandPath(b458, flat(YB)) + '" fill="url(#bhsSand)"/>';
    s += '<path d="' + bandPath(b458, b560) + '" fill="var(--fm-pay)"/>';
    s += '<path d="' + bandPath(b560, flat(YB)) + '" fill="var(--fm-water)"/>';
    s += '<rect x="' + X0 + '" y="' + G + '" width="' + XW + '" height="' + (YB - G) + '" fill="url(#bhsGrain)"/>';
    [[250, 2.5, 1.1], [274, 3, 2.2], [326, 3.5, .3], [352, 4, 1.4]].forEach(function (l) { s += '<path d="' + pd(waveLine(l[0], W, l[1], l[2])) + '" fill="none" stroke="var(--fm-line)" stroke-width="1" opacity=".55"/>'; });
    s += '<path d="' + pd(b380) + '" fill="none" stroke="var(--fm-seal-edge)" stroke-width="1.4"/>';
    s += '<path d="' + pd(b458) + '" fill="none" stroke="var(--fm-pay-edge)" stroke-width="1.1" stroke-dasharray="7 7"/>';
    s += '<path d="' + pd(b560) + '" fill="none" stroke="var(--fm-owc)" stroke-width="1.4"/>';
    s += '<rect x="' + X0 + '" y="' + (G - 1.5) + '" width="' + XW + '" height="3" fill="var(--fm-seal-edge)" opacity=".7"/>';
    // focus: the rock away from the well is shown with reduced contrast (visual emphasis only)
    s += '<linearGradient id="bhsVeil' + W + '" gradientUnits="userSpaceOnUse" x1="' + (W - 330) + '" y1="0" x2="' + (W + 330) + '" y2="0">' +
      '<stop offset="0" stop-color="var(--sky2)" stop-opacity=".42"/><stop offset=".4" stop-color="var(--sky2)" stop-opacity="0"/>' +
      '<stop offset=".6" stop-color="var(--sky2)" stop-opacity="0"/><stop offset="1" stop-color="var(--sky2)" stop-opacity=".42"/></linearGradient>';
    s += '<rect x="' + X0 + '" y="' + (G + 2) + '" width="' + XW + '" height="' + (YB - G) + '" fill="url(#bhsVeil' + W + ')"/>';
    return s;
  }
  function depthBreak(x0, x1) {
    var y = 318, top = [], bot = [];
    for (var x = x0; x <= x1; x += 8) { top.push([x, y]); top.push([x + 4, y - 3]); bot.push([x, y + 8]); bot.push([x + 4, y + 5]); }
    top.push([x1 + 8, y]); bot.push([x1 + 8, y + 8]);
    return '<path d="' + pd(top) + ' ' + pd(bot.slice().reverse()).replace('M', 'L') + ' Z" fill="var(--sky2)" opacity=".92"/>' +
      '<path d="' + pd(top) + '" fill="none" stroke="var(--fm-label)" stroke-width="1"/><path d="' + pd(bot) + '" fill="none" stroke="var(--fm-label)" stroke-width="1"/>';
  }
  function lbl(x, y, t, o) {
    o = o || {};
    var a = o.a || 'start';
    var s = '';
    if (o.to) s += '<path d="M' + o.to[0] + ' ' + o.to[1] + ' L' + (o.via ? o.via[0] + ' ' + o.via[1] + ' L' : '') + (a === 'end' ? x + 3 : a === 'start' ? x - 3 : x) + ' ' + (y - 3) + '" fill="none" stroke="var(--cap)" stroke-width=".7"/><circle cx="' + o.to[0] + '" cy="' + o.to[1] + '" r="1.4" fill="var(--cap2)"/>';
    s += '<text x="' + x + '" y="' + y + '" text-anchor="' + a + '" font-family="IBM Plex Mono, monospace" font-size="' + (o.fs || 8.6) + '" letter-spacing=".5" fill="' + (o.c || 'var(--lbl2)') + '" font-weight="' + (o.w || 500) + '">' + esc(t) + '</text>';
    return s;
  }
  function wheel(cx, cy) {
    var s = '<circle cx="' + cx + '" cy="' + cy + '" r="10.5" fill="#1b212b"/><circle cx="' + cx + '" cy="' + cy + '" r="9" fill="none" stroke="#2c3542" stroke-width="1.2"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="5.6" fill="url(#bhsMetal)" stroke="#0b1320" stroke-width=".8"/>';
    for (var k = 0; k < 5; k++) { var a = k * Math.PI * .4; s += '<circle cx="' + (cx + 3.4 * Math.cos(a)).toFixed(2) + '" cy="' + (cy + 3.4 * Math.sin(a)).toFixed(2) + '" r=".7" fill="#1b212b"/>'; }
    return s + '<circle cx="' + cx + '" cy="' + cy + '" r="1.5" fill="#1b212b"/>';
  }
  // wireline logging truck, local x 0..178; reel at local x 28 (rear, open skid); flip mirrors it
  function truck(x0, flip) {
    var s = '<g transform="' + (flip ? 'translate(' + (x0 + 178) + ',0) scale(-1,1)' : 'translate(' + x0 + ',0)') + '">';
    s += '<ellipse cx="89" cy="' + (G + 1) + '" rx="94" ry="3.2" fill="rgba(0,0,0,.2)"/>';
    // chassis
    s += '<rect x="0" y="184" width="178" height="8" rx="1.5" fill="#2a3240" stroke="#0b1320" stroke-width=".7"/>';
    // rear reel skid: open frame so the drum and the spooled cable stay visible
    s += '<rect x="1" y="132" width="56" height="52" rx="2" fill="#1f2937" stroke="#0b1320" stroke-width="1"/>';
    s += '<rect x="5" y="136" width="48" height="46" rx="1.5" fill="#2a3850"/>';
    s += '<rect x="0" y="128" width="58" height="5" rx="1.5" fill="url(#ovMetalH)" stroke="#0b1320" stroke-width=".7"/>';
    s += '<path d="M28 166 L15 184 M28 166 L41 184" stroke="#56657d" stroke-width="2.4" stroke-linecap="round"/>';
    s += '<rect x="2" y="150" width="3" height="30" fill="#56657d"/>';
    // acquisition / control cabin
    s += '<rect x="58" y="122" width="76" height="64" rx="4" fill="url(#bhsTruck)" stroke="#6c7a8f" stroke-width="1"/>';
    s += '<rect x="68" y="116" width="24" height="6" rx="1.5" fill="url(#ovMetalH)" stroke="#0b1320" stroke-width=".6"/>';
    s += '<rect x="58" y="152" width="76" height="4" fill="#2f6fd0"/><rect x="58" y="157" width="76" height="1.4" fill="#4d9dff" opacity=".7"/>';
    s += '<rect x="64" y="128" width="40" height="18" rx="2" fill="#16202e" stroke="#526079" stroke-width=".8"/>';
    s += '<polyline points="67,142 71,137 75,140 79,133 83,139 87,135 91,141 95,134 101,138" fill="none" stroke="#5fd0ff" stroke-width="1.1"/>';
    s += '<rect x="109" y="128" width="19" height="18" rx="2" fill="url(#bhsCabGlass)" stroke="#526079" stroke-width=".8"/>';
    s += '<rect x="107" y="160" width="22" height="25" rx="1.5" fill="none" stroke="#8a97aa" stroke-width=".8"/><rect x="110" y="171" width="6" height="1.6" rx=".8" fill="#6c7a8f"/>';
    // driver cab
    s += '<path d="M134 186 L134 142 Q134 136 140 136 L157 136 Q162 136 165 140 L176 157 Q178 160 178 165 L178 186 Z" fill="url(#bhsTruck)" stroke="#6c7a8f" stroke-width="1"/>';
    s += '<path d="M140 141 L156 141 Q159 141 161 144 L170 158 L140 158 Z" fill="url(#bhsCabGlass)" stroke="#526079" stroke-width=".8"/>';
    s += '<line x1="140" y1="162" x2="140" y2="184" stroke="#8a97aa" stroke-width=".8"/><rect x="143" y="166" width="6" height="1.6" rx=".8" fill="#6c7a8f"/>';
    s += '<rect x="171" y="167" width="7" height="5" rx="1" fill="#f4d27a" stroke="#8a6d2a" stroke-width=".5"/>';
    s += '<rect x="172" y="178" width="8" height="7" rx="1.5" fill="url(#ovMetalH)" stroke="#0b1320" stroke-width=".6"/>';
    s += '<rect x="131" y="112" width="3" height="26" rx="1" fill="url(#bhsMetal)" stroke="#0b1320" stroke-width=".5"/>';
    // fenders + wheels
    [24, 46, 154].forEach(function (x) { s += '<path d="M' + (x - 13) + ' 191 A13 13 0 0 1 ' + (x + 13) + ' 191" fill="none" stroke="#1b2331" stroke-width="2.2"/>'; });
    s += wheel(24, 202) + wheel(46, 202) + wheel(154, 202);
    s += '</g>';
    return s;
  }
  function sheave(cx, cy, r) {
    var s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#bhsMetal)" stroke="#1b2533" stroke-width="1.3"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * .78).toFixed(2) + '" fill="#26324a" stroke="#8a98ad" stroke-width=".6"/>';
    for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3; s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * .74 * Math.cos(a)).toFixed(2) + '" y2="' + (cy + r * .74 * Math.sin(a)).toFixed(2) + '" stroke="#9fb0c8" stroke-width=".9"/>'; }
    return s + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * .28).toFixed(2) + '" fill="url(#bhsMetal)" stroke="#0b1320" stroke-width=".6"/>';
  }
  // flanged pressure-control / wellhead block (overview style): body + flanges + bolt heads
  function pcBlock(x, y, w, h, o) {
    o = o || {};
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.rx || 1.5) + '" fill="url(#ovMetal)" stroke="#0a0e16" stroke-width=".8"/>';
    if (o.fl) {
      var fw = w + o.fl * 2;
      [y, y + h - 2.4].forEach(function (fy) {
        s += '<rect x="' + (x - o.fl) + '" y="' + (fy - .6) + '" width="' + fw + '" height="3" rx="1" fill="url(#ovMetalH)" stroke="#0a0e16" stroke-width=".6"/>';
        for (var b = 0; b < 4; b++) s += '<circle cx="' + (x - o.fl + 2 + b * (fw - 4) / 3).toFixed(2) + '" cy="' + (fy + .9) + '" r=".55" fill="#0a0e16"/>';
      });
    }
    return s;
  }
  function pipeRun(pts, w) {
    var d = pd(pts);
    return '<path d="' + d + '" fill="none" stroke="#0a0e16" stroke-width="' + (w + 2) + '" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="#63779a" stroke-width="' + w + '" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="#dbe6f5" stroke-width="' + (w * .22).toFixed(2) + '" stroke-linejoin="round" opacity=".4" transform="translate(0,' + (-w * .22).toFixed(2) + ')"/>';
  }
  function legend(items, x0) {
    var x = x0 || 250, s = '<g font-family="IBM Plex Mono, monospace" font-size="7.8" fill="var(--lbl2)">';
    var xs = [], acc = x;
    items.forEach(function (it) { xs.push(acc); acc += 32 + it[1].length * 4.7; });
    s += '<rect x="' + (x - 8) + '" y="6" width="' + (acc - x - 2) + '" height="18" rx="9" fill="var(--panel)" opacity=".86" stroke="var(--line2)" stroke-width=".8"/>';
    items.forEach(function (it, i) {
      var xx = xs[i];
      s += it[2] ? '<line x1="' + xx + '" y1="15" x2="' + (xx + 16) + '" y2="15" stroke="' + it[0] + '" stroke-width="' + it[2] + '" stroke-dasharray="' + (it[3] || '') + '"/>' : '';
      s += '<text x="' + (xx + 21) + '" y="18">' + esc(it[1]) + '</text>';
    });
    return s + '</g>';
  }

  /* ---------------------------------------------------------- open hole */
  function ohStatic() {
    var W = OH.WX, hb = OH.HB * OH.K, bg = '', fg = '';
    bg += strata(W);
    // cement + casing (upper, cased section)
    bg += '<rect x="' + (W - hb - 5) + '" y="' + G + '" width="' + (2 * hb + 10) + '" height="' + (OH.shoe - G) + '" fill="url(#bhsCement)"/>';
    // open-hole bore: irregular wall, exposed formation, mud cake
    var L = [], R = [];
    for (var y = OH.shoe; y <= OH.td; y += 6) { var w = hb + .8 + Math.sin(y * .37) * .7 + Math.sin(y * 1.3) * .5; L.push([W - w, y]); R.push([W + w, y]); }
    bg += '<path d="' + pd(L) + ' ' + pd(R.slice().reverse()).replace('M', 'L') + ' Z" fill="#8a6a3e" opacity=".55"/>';
    bg += '<path d="' + pd(L) + '" fill="none" stroke="#6b4a22" stroke-width="1.4"/><path d="' + pd(R) + '" fill="none" stroke="#6b4a22" stroke-width="1.4"/>';
    bg += '<path d="M' + (W - hb - 3) + ' ' + OH.td + ' Q' + W + ' ' + (OH.td + 6) + ' ' + (W + hb + 3) + ' ' + OH.td + '" fill="#8a6a3e" opacity=".55"/>';
    // cased bore (mud) + steel casing with highlight
    bg += '<rect x="' + (W - hb) + '" y="' + (OH.floor + 6) + '" width="' + (2 * hb) + '" height="' + (OH.shoe - OH.floor - 6) + '" fill="#8a6a3e" opacity=".5"/>';
    bg += '<rect x="' + (W - hb - 2.4) + '" y="' + (G - 2) + '" width="2.4" height="' + (OH.shoe - G + 2) + '" fill="#56657c"/><rect x="' + (W + hb) + '" y="' + (G - 2) + '" width="2.4" height="' + (OH.shoe - G + 2) + '" fill="#56657c"/>';
    bg += '<rect x="' + (W - hb - 1.6) + '" y="' + (G - 2) + '" width=".8" height="' + (OH.shoe - G + 2) + '" fill="#c9d5e7" opacity=".8"/><rect x="' + (W + hb + .8) + '" y="' + (G - 2) + '" width=".8" height="' + (OH.shoe - G + 2) + '" fill="#c9d5e7" opacity=".8"/>';
    bg += '<path d="M' + (W - hb - 6) + ' ' + OH.shoe + ' L' + (W - hb) + ' ' + OH.shoe + ' L' + (W - hb) + ' ' + (OH.shoe - 7) + ' Z M' + (W + hb + 6) + ' ' + OH.shoe + ' L' + (W + hb) + ' ' + OH.shoe + ' L' + (W + hb) + ' ' + (OH.shoe - 7) + ' Z" fill="#3f4b5e"/>';
    bg += depthBreak(W - 50, W + 42);
    // ---- drilling rig: substructure towers, rig floor, drawworks, mast, crown, travelling block
    bg += '<rect x="58" y="' + (G - 3) + '" width="186" height="4" rx="1" fill="#2a3342" stroke="#0a0e16" stroke-width=".6"/>';
    [[70, 112], [188, 230]].forEach(function (t) {
      bg += '<g stroke="#56657d" fill="none">';
      bg += '<path d="M' + t[0] + ' 178 V' + (G - 3) + ' M' + t[1] + ' 178 V' + (G - 3) + '" stroke-width="3"/>';
      bg += '<path d="M' + t[0] + ' 180 L' + t[1] + ' ' + (G - 4) + ' M' + t[1] + ' 180 L' + t[0] + ' ' + (G - 4) + ' M' + t[0] + ' 194 H' + t[1] + '" stroke-width="1.1"/></g>';
      bg += '<path d="M' + (t[0] + 1) + ' 178 V' + (G - 3) + '" stroke="#c9d5e7" stroke-width=".7" opacity=".6"/>';
    });
    // BOP stack under the rig floor (annular, double ram, spool) - bore window so cable / tool read as inside
    bg += '<path d="M' + (W - 13) + ' 191 L' + (W - 13) + ' 184 Q' + W + ' 176 ' + (W + 13) + ' 184 L' + (W + 13) + ' 191 Z" fill="url(#ovMetal)" stroke="#0a0e16" stroke-width=".8"/>';
    bg += pcBlock(W - 16, 191, 32, 12, { fl: 2 });
    bg += '<rect x="' + (W - 27) + '" y="193.5" width="11" height="7" rx="1.2" fill="url(#ovMetalH)" stroke="#0a0e16" stroke-width=".6"/><rect x="' + (W + 16) + '" y="193.5" width="11" height="7" rx="1.2" fill="url(#ovMetalH)" stroke="#0a0e16" stroke-width=".6"/>';
    bg += pcBlock(W - 11, 203, 22, 9, { fl: 3 });
    bg += '<rect x="' + (W - hb) + '" y="178" width="' + (2 * hb) + '" height="34" fill="#27344a" opacity=".82"/>';
    // rig floor with handrail, rotary table, drawworks
    bg += '<rect x="62" y="172" width="178" height="6" rx="1" fill="url(#ovMetalH)" stroke="#1b2533" stroke-width=".8"/>';
    bg += '<g stroke="#8a98ad" stroke-width="1.1" fill="none"><path d="M64 172 V158 H96 M80 172 V158 M96 172 V158"/><path d="M64 165 H96" stroke-width=".7"/></g>';
    bg += '<rect x="68" y="160" width="22" height="12" rx="1.5" fill="url(#ovMetal)" stroke="#0a0e16" stroke-width=".7"/><circle cx="79" cy="166" r="3.6" fill="#26324a" stroke="#8a98ad" stroke-width=".8"/>';
    bg += '<rect x="' + (W - 15) + '" y="168" width="30" height="4" rx="1" fill="url(#ovMetalH)" stroke="#0a0e16" stroke-width=".6"/>';
    // mast: two tapered legs with girts and K-bracing
    bg += '<g fill="none">';
    bg += '<path d="M100 172 L138 20 M200 172 L162 20" stroke="#4f5d74" stroke-width="3.6" stroke-linecap="round"/>';
    bg += '<path d="M101 171 L138.6 21 M199 171 L161.4 21" stroke="#c9d5e7" stroke-width=".8" opacity=".55"/>';
    var yy = [150, 124, 98, 72, 46];
    yy.forEach(function (y, k) {
      var xl = 100 + (172 - y) * 38 / 152, xr = 200 - (172 - y) * 38 / 152;
      bg += '<line x1="' + xl.toFixed(1) + '" y1="' + y + '" x2="' + xr.toFixed(1) + '" y2="' + y + '" stroke="#5c6b84" stroke-width="1.3"/>';
      var y2 = y + 26, xl2 = 100 + (172 - y2) * 38 / 152, xr2 = 200 - (172 - y2) * 38 / 152, xm = (xl2 + xr2) / 2;
      bg += '<path d="M' + xl.toFixed(1) + ' ' + y + ' L' + xm.toFixed(1) + ' ' + y2 + ' L' + xr.toFixed(1) + ' ' + y + '" stroke="#5c6b84" stroke-width=".8"/>';
    });
    bg += '</g>';
    bg += '<rect x="112" y="71" width="16" height="3" fill="#5c6b84"/>';   // monkey board
    bg += '<rect x="128" y="13" width="44" height="8" rx="1.5" fill="url(#ovMetalH)" stroke="#1b2533" stroke-width=".8"/>';
    bg += '<circle cx="140" cy="17" r="2.6" fill="#26324a" stroke="#9fb0c8" stroke-width=".7"/><circle cx="160" cy="17" r="2.6" fill="#26324a" stroke="#9fb0c8" stroke-width=".7"/>';
    // travelling block carries the top sheave; the lower sheave is chained to the rig floor
    bg += '<path d="M' + (OH.topS[0] - 4) + ' 21 L' + (OH.topS[0] - 4) + ' ' + (OH.topS[1] - OH.rS) + ' M' + (OH.topS[0] + 4) + ' 21 L' + (OH.topS[0] + 4) + ' ' + (OH.topS[1] - OH.rS) + '" stroke="#6c7a8f" stroke-width="1"/>';
    bg += '<path d="M' + OH.lowS[0] + ' ' + (OH.lowS[1] + OH.rS) + ' L' + OH.lowS[0] + ' 172" stroke="#6c7a8f" stroke-width="2" stroke-dasharray="2 1.2"/>';
    // truck
    bg += truck(262, false);
    // ---- labels
    fg += lbl(196, 58, 'DRILLING RIG · MAST', { to: [177, 70] });
    fg += lbl(62, 196, 'BOP STACK', { a: 'end', to: [W - 27, 197] });
    fg += lbl(196, 112, 'WIRELINE SHEAVES', { to: [OH.lowS[0] + 5, OH.lowS[1] - 6] });
    fg += lbl(196, 121, 'top + lower sheave', { fs: 7.6, c: 'var(--cap)', w: 400 });
    fg += lbl(351, 94, 'WIRELINE LOGGING TRUCK', { a: 'middle' });
    fg += lbl(351, 103, 'reel · acquisition cabin', { a: 'middle', fs: 7.6, c: 'var(--cap)', w: 400 });
    fg += lbl(W - 22, 270, 'CASING (CEMENTED)', { a: 'end', to: [W - hb - 3, 266] });
    fg += lbl(W - 22, 432, 'CASING SHOE', { a: 'end', to: [W - hb - 5, OH.shoe - 1] });
    fg += lbl(W - 22, 458, 'OPEN HOLE', { a: 'end', to: [W - hb - 1, 456] });
    fg += lbl(W - 22, 467, 'bare formation wall', { a: 'end', fs: 7.6, c: 'var(--cap)', w: 400 });
    fg += '<line x1="6" y1="' + OH.sampY + '" x2="' + (W - hb - 3) + '" y2="' + OH.sampY + '" stroke="var(--accb)" stroke-width="1" stroke-dasharray="3 3"/>';
    fg += lbl(8, OH.sampY - 4, '8,450 FT TVD · SAMPLING', { c: 'var(--accb)', w: 600 });
    fg += lbl(8, G + 12, '0 FT', { c: 'var(--fm-label)' });
    fg += lbl(W + 50, 322, 'depth not to scale', { fs: 7.4, c: 'var(--fm-label)', w: 400 });
    fg += lbl(250, 480, 'PAY ZONE · OIL', { c: 'var(--fm-label-pay)', w: 600 });
    fg += lbl(250, 576, 'OWC', { c: 'var(--fm-owc-label)' });
    fg += lbl(8, 588, 'TD', { c: 'var(--fm-label)' });
    fg += legend([[C.cable, 'Wireline cable', 1.6], [C.clean, 'Cleanup flow', 2.4, '3 3'], [C.samp, 'Sample flow', 2.4, '3 3']], 250);
    return { bg: bg, fg: fg };
  }
  // surface equipment reused 1:1 from the overview drawing (components/FieldSketch.js)
  var CHT = { s: .32, top: 152, wingX: 261.1, flowY: 170 };          // tree scale / top / wing outlet / flowline
  function fsPart(k, tx, ty, sc) { return window.FieldSketch ? '<g class="bhs-fs" transform="translate(' + tx + ',' + ty + ') scale(' + sc + ')">' + window.FieldSketch[k] + '</g>' : ''; }
  function chStatic() {
    var W = CH.WX, K = CH.K, tb = CH.HB * K, cb = CH.CB * K, bg = '', fg = '';
    bg += strata(W);
    // cement, casing bore, tubing, packer, perforations
    bg += '<rect x="' + (W - cb - 4) + '" y="' + G + '" width="' + (2 * cb + 8) + '" height="' + (CH.td - G) + '" fill="url(#bhsCement)"/>';
    bg += '<rect x="' + (W - cb) + '" y="' + (G - 4) + '" width="' + (2 * cb) + '" height="' + (CH.packer - G + 4) + '" fill="#8ea3ba" opacity=".45"/>';   // completion fluid in annulus
    bg += '<rect x="' + (W - cb) + '" y="' + CH.packer + '" width="' + (2 * cb) + '" height="' + (CH.td - CH.packer) + '" fill="' + C.prod + '" opacity=".32"/>';
    bg += '<rect x="' + (W - cb - 1.8) + '" y="' + (G - 4) + '" width="1.8" height="' + (CH.td - G + 4) + '" fill="#56657c"/><rect x="' + (W + cb) + '" y="' + (G - 4) + '" width="1.8" height="' + (CH.td - G + 4) + '" fill="#56657c"/>';
    bg += '<rect x="' + (W - cb - 1.2) + '" y="' + (G - 4) + '" width=".7" height="' + (CH.td - G + 4) + '" fill="#c9d5e7" opacity=".8"/><rect x="' + (W + cb + .5) + '" y="' + (G - 4) + '" width=".7" height="' + (CH.td - G + 4) + '" fill="#c9d5e7" opacity=".8"/>';
    bg += '<rect x="' + (W - tb) + '" y="186" width="' + (2 * tb) + '" height="' + (CH.tail - 186) + '" fill="' + C.prod + '" opacity=".38"/>';
    bg += '<rect x="' + (W - tb - 1.5) + '" y="186" width="1.5" height="' + (CH.tail - 186) + '" fill="#4d5d76"/><rect x="' + (W + tb) + '" y="186" width="1.5" height="' + (CH.tail - 186) + '" fill="#4d5d76"/>';
    bg += '<rect x="' + (W - tb - 1.1) + '" y="186" width=".5" height="' + (CH.tail - 186) + '" fill="#dbe6f5" opacity=".75"/>';
    // packer: elastomer element with ribs
    [[W - cb, cb - tb - 1.5], [W + tb + 1.5, cb - tb - 1.5]].forEach(function (p) {
      bg += '<rect x="' + p[0] + '" y="' + (CH.packer - 5) + '" width="' + p[1] + '" height="10" rx="1" fill="#2d3747" stroke="#0a0e16" stroke-width=".5"/>';
      [-2.5, 0, 2.5].forEach(function (dy) { bg += '<line x1="' + p[0] + '" y1="' + (CH.packer + dy) + '" x2="' + (p[0] + p[1]) + '" y2="' + (CH.packer + dy) + '" stroke="#56657c" stroke-width=".7"/>'; });
    });
    // perforation tunnels (overview style)
    for (var y = CH.perf0; y <= CH.perf1; y += 10) {
      bg += '<path d="M' + (W - cb - 4) + ' ' + (y - 1.8) + ' L' + (W - cb - 22) + ' ' + y + ' L' + (W - cb - 4) + ' ' + (y + 1.8) + ' Z M' + (W + cb + 4) + ' ' + (y - 1.8) + ' L' + (W + cb + 22) + ' ' + y + ' L' + (W + cb + 4) + ' ' + (y + 1.8) + ' Z" fill="#e7a24a" opacity=".85"/>';
    }
    bg += '<path d="M' + (W - cb) + ' ' + CH.td + ' L' + (W + cb) + ' ' + CH.td + '" stroke="#56657c" stroke-width="2"/>';
    bg += depthBreak(W - 60, W + 52);
    // flowline: wing outlet -> choke -> test separator (dimmed: background to the sampling)
    bg += '<g class="bhs-bgdim">';
    bg += pipeRun([[CHT.wingX, CHT.flowY], [302, CHT.flowY]], 4.2) + pipeRun([[322, CHT.flowY], [370, CHT.flowY]], 4.2);
    bg += fsPart('choke', 172, 54, .5);
    bg += fsPart('sep', 132, 93.2, .33);
    bg += '</g>';
    // Christmas tree (overview artwork, cap + gauge replaced by the pressure-control stack)
    bg += fsPart('tree', +(W - 120 * CHT.s).toFixed(2), +(G - 363 * CHT.s).toFixed(2), CHT.s);
    bg += '<rect x="' + (W - 2.2) + '" y="' + CHT.top + '" width="4.4" height="' + (G - CHT.top) + '" fill="#27344a" opacity=".45"/>';
    // pressure-control stack: adapter, wireline BOP, lubricator (cutaway), grease head
    bg += pcBlock(W - 9, 147, 18, 5, { rx: 1 });
    bg += '<rect x="' + (W - 21) + '" y="136" width="10" height="7" rx="1.2" fill="url(#ovMetalH)" stroke="#0a0e16" stroke-width=".6"/><rect x="' + (W + 11) + '" y="136" width="10" height="7" rx="1.2" fill="url(#ovMetalH)" stroke="#0a0e16" stroke-width=".6"/>';
    bg += pcBlock(W - 11, 132, 22, 15, { fl: 2 });
    bg += '<rect x="' + (W - 5) + '" y="46" width="10" height="86" fill="#b8c7d8" opacity=".22"/>';
    bg += '<rect x="' + (W - 7.5) + '" y="46" width="2.5" height="86" fill="url(#ovMetal)"/><rect x="' + (W + 5) + '" y="46" width="2.5" height="86" fill="url(#ovMetal)"/>';
    [72, 102].forEach(function (u) { bg += pcBlock(W - 9, u, 18, 4, { rx: 1 }); });
    bg += pcBlock(W - 8, 30, 16, 16, { rx: 2 });
    bg += '<path d="M' + (W - 4) + ' 30 L' + (W - 2) + ' 25 L' + (W + 2) + ' 25 L' + (W + 4) + ' 30 Z" fill="url(#ovMetal)" stroke="#0a0e16" stroke-width=".6"/>';
    // gin pole (truss) + boom to the top sheave, stabiliser arm to the lubricator
    bg += '<g fill="none" stroke="#5c6b84"><path d="M203 ' + G + ' L207 10 M211 ' + G + ' L213 10" stroke-width="2"/>';
    var zz = 'M205 ' + G; for (var zy = G - 14, k = 0; zy > 12; zy -= 14, k++) zz += ' L' + (k % 2 ? 204.6 + (G - zy) * 4 / 202 : 210.8 + (G - zy) * 2 / 202).toFixed(1) + ' ' + zy;
    bg += '<path d="' + zz + '" stroke-width=".8"/>';
    bg += '<path d="M207 10 L' + (CH.topS[0] + 4) + ' 10 M213 18 L' + CH.topS[0] + ' 10" stroke-width="2"/>';
    bg += '<path d="M211 90 L' + (W - 7.5) + ' 90" stroke-width="1.2"/><path d="M207 12 L150 ' + G + '" stroke-width=".6" stroke-dasharray="3 2" opacity=".7"/></g>';
    bg += '<line x1="' + CH.topS[0] + '" y1="10" x2="' + CH.topS[0] + '" y2="' + (CH.topS[1] - CH.rS) + '" stroke="#6c7a8f" stroke-width="1.6"/>';
    bg += '<path d="M' + CH.lowS[0] + ' ' + (CH.lowS[1] + CH.rS) + ' L' + CH.lowS[0] + ' ' + G + '" stroke="#6c7a8f" stroke-width="2" stroke-dasharray="2 1.2"/>';
    bg += truck(22, true);
    // labels
    fg += lbl(188, 38, 'GREASE HEAD', { a: 'end', to: [W - 8, 37] });
    fg += lbl(188, 84, 'LUBRICATOR', { a: 'end', to: [W - 7.5, 80] });
    fg += lbl(W + 26, 127, 'WIRELINE BOP', { to: [W + 21, 139] });
    fg += lbl(W + 26, 198, 'CHRISTMAS TREE', { to: [W + 12, 186] });
    fg += lbl(W + 26, 207, 'master · wing · swab', { fs: 7.4, c: 'var(--cap)', w: 400 });
    fg += '<g class="bhs-bgdim">';
    fg += lbl(312, 141, 'CHOKE', { a: 'middle' });
    fg += lbl(426, 136, 'TEST SEPARATOR', { a: 'middle' });
    fg += lbl(521, 145, 'GAS', { a: 'end', c: 'var(--hdb2)', w: 600 });
    fg += lbl(521, 187, 'OIL', { a: 'end', c: 'var(--acca2)', w: 600 });
    fg += lbl(521, 203, 'WATER', { a: 'end', c: 'var(--accw)', w: 600 });
    fg += '</g>';
    fg += lbl(100, 102, 'WIRELINE UNIT', { a: 'middle' });
    fg += lbl(100, 111, 'reel · control cabin', { a: 'middle', fs: 7.6, c: 'var(--cap)', w: 400 });
    fg += lbl(W - 26, 262, 'PRODUCTION TUBING', { a: 'end', to: [W - tb - 1, 258] });
    fg += lbl(W - 26, 290, 'CASING (CEMENTED)', { a: 'end', to: [W - cb - 2, 286] });
    fg += lbl(W - 26, CH.packer + 3, 'PACKER', { a: 'end', to: [W - cb, CH.packer] });
    fg += lbl(W - 26, 522, 'PERFORATIONS', { a: 'end', to: [W - cb - 14, 520] });
    fg += lbl(W - 26, 531, 'producing interval', { a: 'end', fs: 7.4, c: 'var(--cap)', w: 400 });
    fg += '<line x1="6" y1="' + CH.sampY + '" x2="' + (W - cb - 3) + '" y2="' + CH.sampY + '" stroke="var(--accb)" stroke-width="1" stroke-dasharray="3 3"/>';
    fg += lbl(8, CH.sampY - 4, '8,450 FT TVD · SAMPLER', { c: 'var(--accb)', w: 600 });
    fg += lbl(8, G + 12, '0 FT', { c: 'var(--fm-label)' });
    fg += lbl(W + 60, 322, 'depth not to scale', { fs: 7.4, c: 'var(--fm-label)', w: 400 });
    fg += lbl(340, 480, 'PAY ZONE · OIL', { c: 'var(--fm-label-pay)', w: 600 });
    fg += lbl(340, 576, 'OWC', { c: 'var(--fm-owc-label)' });
    fg += legend([[C.cable, 'Wireline cable', 1.6], [C.prod, 'Production flow', 3, '4 3'], [C.samp, 'Sample flow', 2.4, '3 3']], 250);
    return { bg: bg, fg: fg };
  }
  /* ======================================================================
     DYNAMIC LAYERS
     ==================================================================== */
  function drum(c, rc, ang) {
    var s = '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="17" fill="#3a475e" stroke="#0b1320" stroke-width="1"/>';
    s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + rc.toFixed(2) + '" fill="' + C.cable + '"/>';
    for (var k = 0; k < 3; k++) s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (rc - 1.6 - k * 1.6).toFixed(2) + '" fill="none" stroke="#3b4a60" stroke-width=".5"/>';
    s += '<g transform="rotate(' + ang.toFixed(1) + ' ' + c[0] + ' ' + c[1] + ')">';
    for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; s += '<line x1="' + c[0] + '" y1="' + c[1] + '" x2="' + (c[0] + 15 * Math.cos(a)).toFixed(2) + '" y2="' + (c[1] + 15 * Math.sin(a)).toFixed(2) + '" stroke="#8a98ad" stroke-width="1.1" opacity=".55"/>'; }
    s += '</g><circle cx="' + c[0] + '" cy="' + c[1] + '" r="3" fill="#aebccf" stroke="#0b1320" stroke-width=".6"/>';
    return s;
  }
  function cablePath(d) { return '<path d="' + d + '" fill="none" stroke="' + C.cable + '" stroke-width="1.7" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="' + C.cableHi + '" stroke-width=".5" opacity=".7"/>'; }
  // magnifier link: highlighted frame on the tool in the well + soft zoom cone to the enlarged cutaway
  function bracket(W, top, bot, hw, I, tag) {
    var a = [W + hw, top - 3], b = [W + hw, bot + 3], c = [I.x, I.y + 27], d = [I.x, I.y + I.h - 2];
    var s = '<path d="M' + a[0] + ' ' + a[1] + ' L' + c[0] + ' ' + c[1] + ' L' + d[0] + ' ' + d[1] + ' L' + b[0] + ' ' + b[1] + ' Z" fill="var(--blue)" opacity=".05"/>';
    s += '<path d="M' + a[0] + ' ' + a[1] + ' L' + c[0] + ' ' + c[1] + ' M' + b[0] + ' ' + b[1] + ' L' + d[0] + ' ' + d[1] + '" stroke="var(--blue)" stroke-width=".8" opacity=".3"/>';
    s += '<rect x="' + (W - hw) + '" y="' + (top - 3) + '" width="' + (2 * hw) + '" height="' + (bot - top + 6) + '" rx="3" fill="rgba(77,157,255,.10)" stroke="var(--blue)" stroke-width="1.2"/>';
    s += '<rect x="' + (W + hw + 3) + '" y="' + (top - 3) + '" width="22" height="11" rx="5.5" fill="var(--blue)"/>';
    s += '<text x="' + (W + hw + 14) + '" y="' + (top + 5) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="7.6" font-weight="700" fill="#fff">' + tag + '</text>';
    return s;
  }
  function ohDyn(s) {
    var W = OH.WX, K = OH.K, hb = OH.HB * K, o = '';
    // invaded zone around the open hole, cleaned locally at the probe during pump-out
    o += '<rect x="' + (W - hb - 10) + '" y="458" width="9" height="102" fill="' + C.filt + '" opacity=".35"/><rect x="' + (W + hb + 1) + '" y="458" width="9" height="102" fill="' + C.filt + '" opacity=".35"/>';
    var cl = s.cont == null ? 0 : clamp((70 - s.cont) / 65, 0, 1);
    if (cl > 0) o += '<ellipse cx="' + (W + hb + 4) + '" cy="' + OH.sampY + '" rx="' + (3 + 5 * cl).toFixed(2) + '" ry="' + (6 + 8 * cl).toFixed(2) + '" fill="' + C.oil + '" opacity="' + (.25 + .45 * cl).toFixed(2) + '"/>';
    // cable: truck reel -> lower sheave -> top sheave -> tool
    var rc = 13 - 4 * s.depthFrac, tp = botTangent(OH.lowS, OH.rS, OH.drum, rc), r = OH.rS;
    var d = 'M' + tp[1][0].toFixed(2) + ' ' + tp[1][1].toFixed(2) + ' L' + tp[0][0].toFixed(2) + ' ' + tp[0][1].toFixed(2) +
      ' A' + r + ' ' + r + ' 0 0 1 ' + (OH.lowS[0] - r) + ' ' + OH.lowS[1] + ' L' + (OH.topS[0] + r) + ' ' + OH.topS[1] +
      ' A' + r + ' ' + r + ' 0 0 0 ' + (OH.topS[0] - r) + ' ' + OH.topS[1] + ' L' + (OH.topS[0] - r) + ' ' + (s.top - 4 * K).toFixed(2);
    o += drum(OH.drum, rc, s.depth * .35) + cablePath(d);
    o += sheave(OH.lowS[0], OH.lowS[1], r) + sheave(OH.topS[0], OH.topS[1], r);
    // tool (same drawing as the inset, scaled)
    o += '<g transform="translate(' + W + ',' + s.top.toFixed(2) + ') scale(' + K + ')">' + drawOhTool(s) + '</g>';
    o += bracket(W, s.top - 2, s.top + OH.toolL * K, 13, OH.inset, '×4.5');
    return o;
  }

  function chDyn(s, amb) {
    var W = CH.WX, K = CH.K, tb = CH.HB * K, cb = CH.CB * K, o = '';
    var off = amb * 20;
    // production: perforations -> casing -> tubing tail -> tubing -> tree -> flowline -> choke -> separator
    for (var y = CH.perf0; y <= CH.perf1; y += 10) {
      o += flow([[W - cb - 18, y + 1], [W - cb, y]], { fluid: C.prod, w: 1.6, dash: '3 3', off: -off, dashC: '#fff3d6' });
      o += flow([[W + cb + 18, y + 1], [W + cb, y]], { fluid: C.prod, w: 1.6, dash: '3 3', off: -off, dashC: '#fff3d6' });
    }
    var dim = s.sampFlow ? .55 : 1;
    [-1, 1].forEach(function (sg) {
      o += flow([[W + sg * 9, CH.perf1], [W + sg * 9, CH.tail + 4], [W + sg * 3.6, CH.tail - 2]], { fluid: null, w: 2, dash: '4 5', off: -off, dashC: C.prod });
    });
    var up = [[W + 3.6, CH.tail - 2], [W + 3.6, CHT.flowY], [CHT.wingX, CHT.flowY]];
    o += '<g opacity="' + dim + '">' + flow(up, { w: 2.4, dash: '4 5', off: -off, dashC: C.prod }) + flow([[W - 3.6, CH.tail - 2], [W - 3.6, 176]], { w: 2.4, dash: '4 5', off: -off, dashC: C.prod }) + '</g>';
    o += '<g class="bhs-bgdim" opacity="' + dim + '">' + flow([[CHT.wingX, CHT.flowY], [302, CHT.flowY]], { w: 2.2, dash: '4 5', off: -off, dashC: C.prod }) +
      flow([[322, CHT.flowY], [370, CHT.flowY]], { w: 2.2, dash: '4 5', off: -off, dashC: '#ffd27a' }) + '</g>';
    // tree valve states (swab, upper master, wing) on the overview tree artwork
    var sy = G - (363 - 196) * CHT.s, my = G - (363 - 247) * CHT.s;
    o += valve(W, sy, s.swab, { r: 3.4, v: true, c: '#2e8a5e' });
    o += valve(W, my, 'open', { r: 3, v: true, c: '#2e8a5e' });
    o += valve(W + (165 - 120) * CHT.s, CHT.flowY, 'open', { r: 3, c: '#2e8a5e' });
    // cable: reel -> lower sheave -> top sheave (gin pole) -> grease head -> tool
    var rc = 13 - 4 * s.depthFrac, r = CH.rS, tp = botTangent(CH.drum, rc, CH.lowS, r);
    var d = 'M' + tp[0][0].toFixed(2) + ' ' + tp[0][1].toFixed(2) + ' L' + tp[1][0].toFixed(2) + ' ' + tp[1][1].toFixed(2) +
      ' A' + r + ' ' + r + ' 0 0 0 ' + (CH.lowS[0] + r) + ' ' + CH.lowS[1] + ' L' + (CH.topS[0] - r) + ' ' + CH.topS[1] +
      ' A' + r + ' ' + r + ' 0 0 1 ' + (CH.topS[0] + r) + ' ' + CH.topS[1] + ' L' + (CH.topS[0] + r) + ' ' + (s.top - 4 * K).toFixed(2);
    o += drum(CH.drum, rc, -s.depth * .35) + cablePath(d);
    o += sheave(CH.lowS[0], CH.lowS[1], r) + sheave(CH.topS[0], CH.topS[1], r);
    o += '<g transform="translate(' + W + ',' + s.top.toFixed(2) + ') scale(' + K + ')">' + drawSrsTool(s) + '</g>';
    o += bracket(W, s.top - 2, s.top + CH.toolL * K, 10, CH.inset, '×5');
    return o;
  }
  function insetFrame(mode) {
    var I = mode === 'open' ? OH.inset : CH.inset;
    var s = '<rect x="' + I.x + '" y="' + I.y + '" width="' + I.w + '" height="' + I.h + '" rx="10" fill="var(--panel)" stroke="var(--line2)" stroke-width="1"/>';
    s += '<text x="' + (I.x + 14) + '" y="' + (I.y + 18) + '" font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="1" fill="var(--accb)" font-weight="600">ENLARGED CUTAWAY · SAME TOOL ×' + (mode === 'open' ? '4.5' : '5') + '</text>';
    s += '<text x="' + (I.x + I.w - 14) + '" y="' + (I.y + 18) + '" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="8.6" letter-spacing=".6" fill="var(--mut)">' + (mode === 'open' ? 'MDT toolstring · MRMS (2 MPSR)' : 'SRS · Single-phase Reservoir Sampler') + '</text>';
    s += '<line x1="' + (I.x + 1) + '" y1="' + (I.y + 26) + '" x2="' + (I.x + I.w - 1) + '" y2="' + (I.y + 26) + '" stroke="var(--line2)"/>';
    return s;
  }
  function runs(ly0, ly1, stepL, keyAt) {
    var out = [], cur = null;
    for (var ly = ly0; ly < ly1; ly += stepL) {
      var k = keyAt(ly), key = JSON.stringify(k);
      if (cur && cur.key === key) cur.b = ly + stepL; else { cur = { key: key, k: k, a: ly, b: ly + stepL }; out.push(cur); }
    }
    return out;
  }
  function band(ox, oy, x0, x1, a, b, fill, op) {
    var s = '';
    [[x0, x1], [-x1, -x0]].forEach(function (r) { s += '<rect x="' + (ox + r[0]).toFixed(2) + '" y="' + (oy + a).toFixed(2) + '" width="' + (r[1] - r[0]).toFixed(2) + '" height="' + (b - a + .4).toFixed(2) + '" fill="' + fill + '"' + (op != null ? ' opacity="' + op + '"' : '') + '/>'; });
    return s;
  }
  // cutaway callout: dot on the part, orthogonal leader (horizontal -> vertical -> horizontal), label column
  function ilabel(ox, oy, ax, ly, lx, lyText, t, sub, subC) {
    var y = oy + lyText, x0 = ox + ax, y0 = oy + ly, xm = lx - 20;
    var s = '<path d="M' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' H' + xm + ' V' + y + ' H' + (lx - 5) + '" fill="none" stroke="var(--cap2)" stroke-width=".9" stroke-linejoin="round"/><circle cx="' + x0.toFixed(2) + '" cy="' + y0.toFixed(2) + '" r="2.2" fill="var(--accb)" stroke="var(--panel)" stroke-width=".8"/>';
    s += '<text x="' + lx + '" y="' + (y + 4) + '" font-family="IBM Plex Sans, sans-serif" font-size="11.2" font-weight="600" fill="var(--lbl)">' + esc(t) + '</text>';
    if (sub) s += '<text x="' + lx + '" y="' + (y + 17) + '" font-family="IBM Plex Mono, monospace" font-size="9.4" fill="' + (subC || 'var(--mut)') + '">' + esc(sub) + '</text>';
    return s;
  }
  function bottleTxt(f, v, rt, n) {
    if (v === 'sealed') return ['Sealed · full', 'var(--grn)'];
    if (rt === n) return ['Filling ' + Math.round(f * 100) + '%', C.samp];
    if (v === 'open') return ['Valve open', C.samp];
    return ['Empty', 'var(--mut)'];
  }

  function ohInset(s) {
    var I = OH.inset, ox = I.tx, oy = I.ty, K = OH.K, HB = OH.HB, XW = 86, o = '';
    o += '<g clip-path="url(#bhsInsetClipO)">';
    var rr = runs(-40, 520, 4, function (ly) {
      var sy = s.top + ly * K;
      if (sy < OH.floor) return ['air'];
      if (sy < OH.floor + 6) return ['floor'];
      if (sy < G) return ['bop'];
      if (sy < OH.shoe) return ['cased', strat(sy), payAt(sy)];
      return ['open', strat(sy), payAt(sy)];
    });
    rr.forEach(function (r) {
      var k = r.k, a = r.a, b = r.b;
      if (k[0] === 'floor') o += '<rect x="' + (ox - XW) + '" y="' + (oy + a) + '" width="' + (2 * XW) + '" height="' + (b - a) + '" fill="#4b5870"/>' + '<rect x="' + (ox - HB) + '" y="' + (oy + a) + '" width="' + (2 * HB) + '" height="' + (b - a) + '" fill="#27344a"/>';
      if (k[0] === 'bop') o += band(ox, oy, HB, HB + 20, a, b, '#5d6c84') + '<rect x="' + (ox - HB) + '" y="' + (oy + a) + '" width="' + (2 * HB) + '" height="' + (b - a) + '" fill="#27344a" opacity=".85"/>';
      if (k[0] === 'cased' || k[0] === 'open') {
        o += band(ox, oy, HB, XW, a, b, k[1]) + band(ox, oy, HB, XW, a, b, 'url(#bhsGrain)');
        if (k[2] === 'pay') o += band(ox, oy, HB, XW, a, b, 'var(--fm-pay)');
        if (k[2] === 'water') o += band(ox, oy, HB, XW, a, b, 'var(--fm-water)');
        o += '<rect x="' + (ox - HB) + '" y="' + (oy + a) + '" width="' + (2 * HB) + '" height="' + (b - a + .4) + '" fill="#8a6a3e" opacity=".42"/>';
      }
      if (k[0] === 'cased') o += band(ox, oy, HB + 7, HB + 24, a, b, 'url(#bhsCement)') + band(ox, oy, HB, HB + 7, a, b, '#5d6c84');
      if (k[0] === 'open') {
        if (k[2] === 'pay') o += band(ox, oy, HB, HB + 30, a, b, C.filt, .32);
        o += band(ox, oy, HB - 2.5, HB, a, b, '#6b4a22');
      }
    });
    // cleaned zone in front of the probe + formation fluid moving to the probe
    var atWall = s.P[1] > 0 && s.P[6] < 1 && s.down > .99;
    if (atWall) {
      var cl = s.cont == null ? 0 : clamp((70 - s.cont) / 65, 0, 1);
      if (cl > 0) o += '<ellipse cx="' + (ox + HB + 4) + '" cy="' + (oy + 112) + '" rx="' + (10 + 22 * cl).toFixed(1) + '" ry="' + (18 + 26 * cl).toFixed(1) + '" fill="' + C.oil + '" opacity="' + (.2 + .4 * cl).toFixed(2) + '"/>';
      if (s.drawing && s.route !== 'switch') {
        var pc = s.route === 'b1' || s.route === 'b2' ? C.oil : mixC(C.filt, C.oil, cl);
        for (var k = 0; k < 9; k++) {
          var ph = (s.t * .45 + k / 9) % 1, sy0 = 112 + (k % 3 - 1) * 26 + (k % 2 ? 8 : -8);
          var x = lerp(HB + 38, HB + 4, ph), y = lerp(sy0, 112, ph);
          o += '<circle cx="' + (ox + x).toFixed(1) + '" cy="' + (oy + y).toFixed(1) + '" r="1.9" fill="' + pc + '" opacity="' + (.35 + .6 * ph).toFixed(2) + '"/>';
        }
      }
    }
    o += '<g transform="translate(' + ox + ',' + oy + ')">' + drawOhTool(s) + '</g></g>';
    // callouts (right)
    var lx = 734, E = s.ext * (HB - 24);
    var b1 = bottleTxt(s.fill1, s.v1, s.route, 'b1'), b2 = bottleTxt(s.fill2, s.v2, s.route, 'b2');
    o += ilabel(ox, oy, 12, 14, lx, 10, 'Cable head', 'wireline attachment');
    o += ilabel(ox, oy, 24, 52, lx, 48, 'Power & telemetry', 'surface link · hydraulics');
    o += ilabel(ox, oy, 25 + E, 112, lx, 96, 'Probe module', s.ext > .98 ? 'probe packer sealed on wall' : s.ext > .02 ? 'probe / backup moving' : 'probe + backup retracted', s.ext > .98 ? 'var(--grn)' : null);
    o += ilabel(ox, oy, 24, 167, lx, 148, 'Fluid analyzer (optical)', s.cont == null ? 'no fluid yet' : 'contamination ' + Math.round(s.cont) + '%', s.qual === 'acceptable' ? 'var(--grn)' : s.cont == null ? null : C.clean);
    o += ilabel(ox, oy, 24, 222, lx, 196, 'Pumpout module', s.pumpOn ? 'pumping' : 'stopped', s.pumpOn ? 'var(--accb)' : null);
    o += ilabel(ox, oy, 25, 252, lx, 238, 'Exhaust valve → wellbore', s.ev === 'open' ? 'open · cleanup discharge' : 'closed', s.ev === 'open' ? C.clean : null);
    o += ilabel(ox, oy, 15, 312, lx, 300, 'Sample bottle 1 · MPSR', b1[0], b1[1]);
    o += ilabel(ox, oy, 15, 404, lx, 392, 'Sample bottle 2 · MPSR', b2[0], b2[1]);
    o += '<text x="' + (lx) + '" y="' + (oy + 452) + '" font-family="IBM Plex Mono, monospace" font-size="8" fill="var(--mut)">piston · buffer side vented to wellbore</text>';
    var where = !s.started ? 'At surface · in the derrick' : s.done ? 'At surface · samples sealed' : s.depthFrac <= 0 ? 'At surface' : s.top < OH.shoe - OH.toolL * K ? 'In casing · ' + n0(s.depth) + ' ft' : 'Open hole · ' + n0(s.depth) + ' ft';
    o += '<text x="' + (I.x + 14) + '" y="' + (I.y + I.h - 10) + '" font-family="IBM Plex Mono, monospace" font-size="8.6" fill="var(--accb)" font-weight="600">' + esc(where.toUpperCase()) + '</text>';
    return o;
  }

  function chInset(s, amb) {
    var I = CH.inset, ox = I.tx, oy = I.ty, K = CH.K, TB = CH.HB, CB = CH.CB, XW = 100, o = '';
    o += '<g clip-path="url(#bhsInsetClipC)">';
    var rr = runs(-40, 500, 4, function (ly) {
      var sy = s.top + ly * K;
      if (sy < 30) return ['air'];
      if (sy < 46) return ['gh'];
      if (sy < 132) return ['lub'];
      if (sy < 147) return ['bop'];
      if (sy >= 153 && sy < 164) return ['swab'];
      if (sy < G) return ['tree'];
      if (sy < CH.tail) return ['tbg', strat(sy), payAt(sy), sy >= CH.packer - 4 && sy < CH.packer + 4 ? 'pk' : sy >= CH.packer ? 'pr' : 'cf'];
      return ['csg', strat(sy), payAt(sy), sy >= CH.perf0 - 2 && sy <= CH.perf1 + 2 ? 'pf' : ''];
    });
    rr.forEach(function (r) {
      var k = r.k, a = r.a, b = r.b;
      if (k[0] === 'gh') o += band(ox, oy, 6, 40, a, b, '#6c7a8f');
      if (k[0] === 'lub') o += band(ox, oy, 33, 40, a, b, '#7b8aa3') + '<rect x="' + (ox - 33) + '" y="' + (oy + a) + '" width="66" height="' + (b - a + .4) + '" fill="#b8c7d8" opacity=".16"/>';
      if (k[0] === 'bop' || k[0] === 'tree' || k[0] === 'swab') o += band(ox, oy, 33, k[0] === 'bop' ? 62 : 52, a, b, '#6c7a8f') + '<rect x="' + (ox - 33) + '" y="' + (oy + a) + '" width="66" height="' + (b - a + .4) + '" fill="' + C.prod + '" opacity="' + (k[0] === 'tree' ? .3 : .1) + '"/>';
      if (k[0] === 'swab' && s.swab !== 'open') o += '<rect x="' + (ox - 33) + '" y="' + (oy + (a + b) / 2 - 5) + '" width="66" height="10" fill="#5d6c84" stroke="#1b2533" stroke-width=".8"/>';
      if (k[0] === 'tbg' || k[0] === 'csg') {
        o += band(ox, oy, CB + 14, XW, a, b, k[1]) + band(ox, oy, CB + 14, XW, a, b, 'url(#bhsGrain)');
        if (k[2] === 'pay') o += band(ox, oy, CB + 14, XW, a, b, 'var(--fm-pay)');
        o += band(ox, oy, CB + 6, CB + 14, a, b, 'url(#bhsCement)') + band(ox, oy, CB, CB + 6, a, b, '#4f5d73');
      }
      if (k[0] === 'tbg') {
        o += band(ox, oy, TB + 6, CB, a, b, k[3] === 'pk' ? '#2b2f36' : k[3] === 'pr' ? C.prod : '#8ea3ba', k[3] === 'pk' ? null : .4);
        o += band(ox, oy, TB, TB + 6, a, b, '#44536b');
        o += '<rect x="' + (ox - TB) + '" y="' + (oy + a) + '" width="' + (2 * TB) + '" height="' + (b - a + .4) + '" fill="' + C.prod + '" opacity=".3"/>';
      }
      if (k[0] === 'csg') {
        o += '<rect x="' + (ox - CB) + '" y="' + (oy + a) + '" width="' + (2 * CB) + '" height="' + (b - a + .4) + '" fill="' + C.prod + '" opacity=".32"/>';
        if (k[3] === 'pf') o += band(ox, oy, CB, CB + 30, a + 1, a + 3, '#3a2a14');
      }
    });
    // upward production stream past the sampler inside the tubing
    var la = (G - s.top) / K, lb = (CH.tail - s.top) / K;
    la = Math.max(la, -40); lb = Math.min(lb, 500);
    if (lb > la) [-27, 27].forEach(function (x) { o += '<path d="M' + (ox + x) + ' ' + (oy + lb).toFixed(1) + ' L' + (ox + x) + ' ' + (oy + la).toFixed(1) + '" stroke="' + C.prod + '" stroke-width="2.2" stroke-dasharray="6 7" stroke-dashoffset="' + (-amb * 40).toFixed(1) + '" opacity="' + (s.sampFlow ? .5 : .85) + '"/>'; });
    o += '<g transform="translate(' + ox + ',' + oy + ')">' + drawSrsTool(s) + '</g></g>';
    var lx = 770;
    var trigTxt = s.trig >= 1 ? 'triggered' : s.trig > 0 ? 'triggering' : 'counting to set time';
    var inTxt = s.inlet === 'open' ? 'open · well fluid entering' : s.inlet === 'sealed' ? 'closed · sealed' : 'closed';
    var chTxt = s.inlet === 'sealed' ? 'sample sealed · piston separates it' : s.fill > 0 ? 'filling ' + Math.round(s.fill * 100) + '% · piston moving down' : 'empty · piston at top';
    o += ilabel(ox, oy, 12, 12, lx, 10, 'Rope socket', 'wireline attachment');
    o += ilabel(ox, oy, 20, 50, lx, 48, 'Clock / trigger section', trigTxt, s.trig >= 1 ? 'var(--grn)' : null);
    o += ilabel(ox, oy, 21, 100, lx, 98, 'Inlet ports & inlet valve', inTxt, s.inlet === 'open' ? C.samp : s.inlet === 'sealed' ? 'var(--grn)' : null);
    o += ilabel(ox, oy, 20, 170, lx, 160, 'Sample chamber', chTxt, s.fill > 0 ? (s.inlet === 'sealed' ? 'var(--grn)' : C.samp) : null);
    o += ilabel(ox, oy, 20, 272, lx, 232, 'Restrictor', 'meters buffer oil · slow, steady fill');
    o += ilabel(ox, oy, 20, 318, lx, 290, 'Air chamber', 'receives displaced buffer oil');
    o += ilabel(ox, oy, 20, 388, lx, 360, 'N₂ compensation', s.n2 >= 1 ? 'active · holds sample above Pres' : s.n2 > 0 ? 'arming' : 'standby', s.n2 >= 1 ? 'var(--grn)' : null);
    var where = !s.started ? 'At surface · in the lubricator' : s.done ? 'At surface · sample sealed' : s.depthFrac <= 0 ? 'At surface · pressure-control stack' : 'Production tubing · ' + n0(s.depth) + ' ft';
    o += '<text x="' + (I.x + 14) + '" y="' + (I.y + I.h - 10) + '" font-family="IBM Plex Mono, monospace" font-size="8.6" fill="var(--accb)" font-weight="600">' + esc(where.toUpperCase()) + '</text>';
    return o;
  }
  /* ======================================================================
     EXPLAIN texts (used by the StepGuide "Explain" card)
     w = why, e = equipment, o = what to watch
     ==================================================================== */
  var OH_EX = [
    { w: 'The sample must come from the reservoir interval of interest, so the tool is positioned on depth before anything is opened.', e: 'Truck reel pays out; cable runs over the lower and top sheaves, through the BOP and casing, into the open hole.', o: 'Depth, wellbore pressure and temperature rising together; cable stays attached from reel to tool.' },
    { w: 'The probe packer isolates a small area of the borehole wall from the mud column. The backup pistons provide the opposing force that keeps the seal tight.', e: 'Backup pistons extend on one side; the probe extends on the other until the packer seals on the formation.', o: 'Probe tight on the bare formation wall — this only works in open hole, not behind casing.' },
    { w: 'The pretest proves the seal holds and gives formation pressure. If pressure stayed at mud hydrostatic, the probe would still be seeing the wellbore.', e: 'Small pretest volume drawn through the probe; flowline fills up to the fluid analyzer.', o: 'Pressure falls from mud hydrostatic (drawdown), then builds up and stabilises at formation pressure (4,820 psia).' },
    { w: 'The first fluid produced is mud filtrate that invaded the formation while drilling. It is pumped to the wellbore until the analyzer shows clean formation fluid.', e: 'Pumpout module running; exhaust valve open; both bottle valves closed so nothing enters the bottles.', o: 'Contamination falling toward the ' + CONT_LIMIT + '% limit; orange cleanup flow leaving through the exhaust port.' },
    { w: 'Only fluid that meets the quality condition is allowed into a bottle. The route is switched without stopping the flow from the formation.', e: 'Exhaust valve closes, bottle 1 valve opens; the flowline downstream of the pump now leads to bottle 1.', o: 'Flow colour changes from cleanup (orange) to sample (blue) and the front moving toward bottle 1.' },
    { w: 'Pumping into the bottle against its piston keeps the sample above saturation pressure (Psat 2,515 psia) while it fills — no gas breaks out.', e: 'Bottle 1 fills and its valve is sealed; then bottle 2 valve opens, fills and is sealed. The piston pushes buffer to the wellbore.', o: 'Oil entering from the top of each bottle, piston moving down, then the valve changing to sealed.' },
    { w: 'The tool must be freed from the wall before it can move. Flow is stopped first so the sealed bottles are not disturbed.', e: 'Probe and backup pistons retract into the tool body; pump stopped; all valves closed.', o: 'Probe leaving the wall; pressure reading returns to wellbore (mud) pressure.' },
    { w: 'The sealed bottles keep the reservoir fluid on the way up. The laboratory restores it to reservoir conditions before transfer and analysis.', e: 'Cable reeled in on the truck; tool pulled through the open hole, casing and BOP to the rig floor.', o: 'Depth returning to surface with both bottles full and sealed; then Move Samples to Lab.' }
  ];
  var CH_EX = [
    { w: 'The well keeps producing while the sampler is run, so it must enter the well through pressure-control equipment.', e: 'Tool rigged up inside the lubricator; swab valve opened; cable runs from the reel over the gin-pole sheave into the grease head.', o: 'Swab valve opening, tool leaving the lubricator and running down the production tubing.' },
    { w: 'A representative sample needs steady flow and a pressure at the sampler above saturation pressure, so the fluid at the inlet is single phase.', e: 'Sampler held at 8,450 ft in the flowing stream; well flowing through the tree and choke to the test separator.', o: 'Pressure oscillation settling; pressure well above Psat (2,515 psia) before the inlet opens.' },
    { w: 'The sampler has its own clock, so the inlet opens at a set time without any signal from surface.', e: 'Clock reaches its set time and opens the inlet valve to the flowing stream.', o: 'Trigger indicator turning green and the inlet valve opening.' },
    { w: 'Filling slowly against a metered buffer keeps the pressure drop at the inlet small, so the sample does not flash while it enters.', e: 'Well fluid enters through the inlet ports above the floating piston; buffer oil below the piston passes the restrictor into the air chamber.', o: 'Blue sample flow through the inlet, piston moving down, buffer oil level rising in the air chamber.' },
    { w: 'Once sealed, cooling on the way up would lower the sample pressure. N₂ pressure acting behind the piston keeps it above reservoir pressure so it stays single phase.', e: 'Inlet valve closes; N₂ section opens to the buffer side. The piston keeps the N₂ and buffer oil separate from the sample.', o: 'Inlet valve changing to sealed and the compensation arrows appearing below the piston.' },
    { w: 'The sample is retrieved without being opened; the separator is not involved — it only receives the surface production stream.', e: 'Cable reeled in; the sampler returns up the tubing, through the tree into the lubricator.', o: 'Depth decreasing, sample chamber still full and sealed, piston moving slightly as it compensates for cooling.' },
    { w: 'The well is secured before the lubricator is opened, then the sampler is laid down for transfer to the laboratory.', e: 'Swab valve closed, lubricator bled off, sampler removed.', o: 'Swab valve closed; sealed sample ready for laboratory transfer.' }
  ];

  /* ======================================================================
     COMPONENT
     ==================================================================== */
  var CSS = '' +
    '.bhs-root{position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1fr) var(--m01-side, 336px);min-height:0;}' +
    /* scene fills the whole schematic area; the SVG overflows so the strata reach every edge */
    '.bhs-scene{position:relative;min-width:0;min-height:0;overflow:hidden;background:var(--sky2);}' +
    '.bhs-scene svg{position:absolute;inset:0;display:block;width:100%;height:100%;overflow:visible;}' +
    /* side panel: matches .m01-panel (theme.css) used by Wellhead / Separator */
    '.bhs-panel{display:flex;flex-direction:column;gap:9px;min-width:0;min-height:0;overflow:hidden;padding:12px;background:var(--rail);border-left:1px solid var(--line);box-sizing:border-box;font-family:var(--font-main);}' +
    '.bhs-ph{display:flex;align-items:center;gap:8px;flex:0 0 auto;}' +
    '.bhs-ic{width:22px;height:22px;border-radius:7px;background:rgba(77,157,255,.14);color:var(--blue);display:flex;align-items:center;justify-content:center;flex:0 0 auto;}' +
    '.bhs-ic svg{width:13px;height:13px;}' +
    '.bhs-ttl{flex:1;font-size:13px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.bhs-tag{font-family:var(--font-mono);font-size:9px;letter-spacing:.8px;color:var(--mut);background:var(--icard);border:1px solid var(--line2);border-radius:5px;padding:3px 7px;flex:0 0 auto;}' +
    '.bhs-live{display:flex;flex-direction:column;gap:6px;flex:0 0 auto;}' +
    '.bhs-lk{display:flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:8px;letter-spacing:1px;color:var(--mut);}' +
    '.bhs-lk i{width:7px;height:7px;border-radius:50%;background:var(--mut);flex:0 0 auto;}' +
    '.bhs-rd{display:grid;grid-template-columns:1fr 1fr;gap:7px;}' +
    '.bhs-c{background:var(--icard);border:1px solid var(--line2);border-radius:8px;padding:7px 10px;min-width:0;}' +
    '.bhs-c .l{font-family:var(--font-mono);font-size:8px;letter-spacing:.7px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;}' +
    '.bhs-c .v{font-family:var(--font-mono);font-size:14px;font-weight:600;color:var(--accb);white-space:nowrap;display:block;margin-top:2px;overflow:hidden;text-overflow:ellipsis;}' +
    '.bhs-c .v small{font-size:9px;font-weight:400;color:var(--mut);margin-left:4px;}' +
    '.bhs-fs .fz-lbl,.bhs-fs .fz-sp,.bhs-fs .fz-cap,.bhs-fs .fz-minor{display:none;}' +
    '.bhs-bgdim{opacity:.5;filter:grayscale(.5);}' +
    '.bhs-fig{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;background:var(--icard);border:1px solid var(--line2);border-radius:10px;padding:8px 8px 6px;box-sizing:border-box;}' +
    '.bhs-fk{font-family:var(--font-mono);font-size:8.5px;letter-spacing:.9px;color:var(--mut);padding:0 2px 4px 4px;flex:0 0 auto;}' +
    '.bhs-fig svg{flex:1 1 auto;min-height:0;width:100%;display:block;}' +
    '.bhs-proc{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;background:var(--icard);border:1px solid var(--line2);border-radius:10px;padding:8px 8px 6px;box-sizing:border-box;}' +
    '.bhs-pk{display:flex;align-items:center;gap:6px;padding:0 2px 6px 4px;flex:0 0 auto;}' +
    '.bhs-pk .k{font-family:var(--font-mono);font-size:8.5px;letter-spacing:.9px;color:var(--mut);}' +
    '.bhs-pk b{flex:1;font-family:var(--font-mono);font-size:8.5px;letter-spacing:.8px;font-weight:600;color:var(--accb);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.bhs-nb{width:26px;height:24px;flex:0 0 auto;border-radius:6px;border:1px solid var(--line2);background:var(--chipbg);color:var(--chipt);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}' +
    '.bhs-nb svg{width:11px;height:11px;} .bhs-nb:hover{border-color:var(--blue);} .bhs-nb:disabled{opacity:.4;cursor:not-allowed;border-color:var(--line2);}' +
    '.bhs-steps{display:flex;flex-direction:column;gap:1px;flex:1 1 auto;min-height:0;overflow-y:auto;}' +
    '.bhs-st{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:6px;border:0;background:transparent;cursor:pointer;text-align:left;font-family:inherit;flex:0 0 auto;}' +
    '.bhs-st:hover{background:var(--track);}' +
    '.bhs-st .n{width:16px;height:16px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:8px;font-weight:600;border:1px solid var(--ringpend);color:var(--dis);}' +
    '.bhs-st .l{flex:1;font-size:11.5px;color:var(--dis);line-height:1.3;}' +
    '.bhs-st.done .n{border-color:var(--accg);color:var(--accg);background:rgba(70,211,154,.12);} .bhs-st.done .l{color:var(--fgdone);}' +
    '.bhs-st.on{background:rgba(77,157,255,.10);} .bhs-st.on .n{border-color:var(--blue);color:var(--blue);background:rgba(77,157,255,.16);} .bhs-st.on .l{color:var(--txt);font-weight:600;}' +
    /* current instruction: one short line under the active step (or under the list header before start) */
    '.bhs-d{flex:0 0 auto;margin:0 0 4px 30px;padding:2px 6px 4px 0;display:flex;flex-direction:column;gap:5px;}' +
    '.bhs-d .t{font-size:11px;line-height:1.4;color:var(--txt2);}' +
    '.bhs-d.idle{margin-left:4px;}' +
    '.bhs-bar{height:3px;border-radius:3px;background:var(--track);overflow:hidden;}' +
    '.bhs-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2f6fd0,#5fb0ff);border-radius:3px;}' +
    /* action buttons: identical to Take Sample / Move Sample to Lab on Wellhead / Separator (_actBtn_d in Main.js) */
    '.bhs-act{flex:0 0 36px;height:36px;box-sizing:border-box;padding:0 12px;border-radius:8px;font-family:inherit;font-size:12px;font-weight:500;letter-spacing:.2px;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:8px;color:var(--chipt);background:var(--chipbg);border:1px solid var(--line2);cursor:pointer;transition:border-color .15s ease, filter .15s ease;}' +
    '.bhs-act.pri{font-weight:600;color:#fff;background:linear-gradient(180deg,#4d9dff,#2f6fd0);border-color:var(--blue);}' +
    '.bhs-act:hover{border-color:var(--blue);filter:brightness(1.08);} .bhs-act:disabled{cursor:not-allowed;} .bhs-act:disabled:hover{border-color:var(--line2);filter:none;}' +
    '.bhs-act svg{width:15px;height:15px;flex:0 0 auto;}' +
    '@media (max-height:760px){.bhs-panel{gap:7px;}.bhs-st{padding:3px 6px;}.bhs-c{padding:6px 10px;}}';

  var ICON = {
    prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5" stroke-linecap="round"/></svg>',
    take: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v10m0 0-4-4m4 4 4-4M6 19h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" style="width:16px;height:16px"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tool: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 12l4 5 4-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 21h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };

  var M = { host: null, root: null, mode: 'open', t: 0, playing: false, amb: 0, raf: 0, last: 0, lastDraw: 0, tl: null, opts: {}, el: {}, doneSent: null, cache: {} };

  function steps() { return M.mode === 'open' ? OH_STEPS : CH_STEPS; }
  function stateNow() { return M.mode === 'open' ? ohState(M.tl, M.t, M.playing) : chState(M.tl, M.t, M.playing, M.amb); }

  function buildDom() {
    var st = steps();
    if (!document.getElementById('bhs-css')) { var cs = document.createElement('style'); cs.id = 'bhs-css'; cs.textContent = CSS; document.head.appendChild(cs); }
    var S = M.mode === 'open' ? ohStatic() : chStatic();
    var I = M.mode === 'open' ? OH.inset : CH.inset;
    var clip = '<clipPath id="bhsInsetClip' + (M.mode === 'open' ? 'O' : 'C') + '"><rect x="' + (I.x + 1) + '" y="' + (I.y + 27) + '" width="' + (I.w - 2) + '" height="' + (I.h - 28) + '" rx="9"/></clipPath>';
    var svg = '<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMax meet">' + defs().replace('</defs>', clip + '</defs>') + S.bg + '<g class="bhs-dyn"></g>' + S.fg + insetFrame(M.mode) + '<g class="bhs-idyn"></g></svg>';
    var open = M.mode === 'open';
    var p = '<div class="bhs-panel">' +
      '<div class="bhs-ph"><span class="bhs-ic">' + ICON.tool + '</span><span class="bhs-ttl">' + (open ? 'MDT toolstring · MRMS' : 'SRS sampler') + '</span><span class="bhs-tag">BHS-001</span></div>' +
      '<div class="bhs-live"><div class="bhs-lk"><i data-r="ldot"></i>LIVE DATA</div>' +
      '<div class="bhs-rd">' + [0, 1, 2, 3].map(function (i) { return '<div class="bhs-c"><span class="l" data-r="l' + i + '"></span><span class="v" data-r="v' + i + '"></span></div>'; }).join('') + '</div></div>' +
      '<div class="pc-host bhs-pc" data-pc="BottomHoleSim" data-pc-layout="side" style="flex:0 0 auto; margin-top:auto;"></div>' +
      '<button class="bhs-act" data-a="lab">' + (open ? 'Move Samples to Lab' : 'Move Sample to Lab') + ICON.arrow + '</button>' +
      '</div>';
    M.root.innerHTML = '<div class="bhs-scene">' + svg + '</div>' + p;
    M.el = { dyn: M.root.querySelector('.bhs-dyn'), idyn: M.root.querySelector('.bhs-idyn') };
    [].slice.call(M.root.querySelectorAll('[data-r]')).forEach(function (n) { M.el[n.getAttribute('data-r')] = n; });
    [].slice.call(M.root.querySelectorAll('[data-a]')).forEach(function (n) { M.el['b_' + n.getAttribute('data-a')] = n; n.addEventListener('click', function () { act(n.getAttribute('data-a')); }); });
    M.cache = {};
    if (window.PC) window.PC.refresh();
  }

  function setText(k, v) { var n = M.el[k]; if (n && M.cache[k] !== v) { n.textContent = v; M.cache[k] = v; } }
  function setHTML(k, v) { var n = M.el[k]; if (n && M.cache[k] !== v) { n.innerHTML = v; M.cache[k] = v; } }
  function setStyle(n, k, v) { if (n && n.style[k] !== v) n.style[k] = v; }

  function readings(s) {
    var R = [];
    var dep = !s.started ? ['—', ''] : s.depthFrac <= 0 ? ['Surface', ''] : [n0(s.depth), 'ft'];
    R.push(['TOOL DEPTH (TVD)', dep, s.started ? (s.depthFrac >= 1 ? 'on sampling depth' : s.depthFrac > 0 ? 'moving' : '') : 'tool staged', null]);
    if (s.mode === 'open') {
      var pv = (s.pLabel !== 'Probe pressure' && s.depthFrac <= 0) ? null : s.pVal;
      R.push([s.pLabel === 'Probe pressure' ? 'PROBE PRESSURE' : 'MUD PRESSURE', pv == null ? ['—', ''] : [n0(pv), 'psia'], pv == null ? '' : s.pLabel === 'Probe pressure' ? 'Psat ' + n0(RES.psat) + ' psia' : 'hydrostatic at tool', null]);
      R.push(['TEMPERATURE', s.T == null ? ['—', ''] : [n0(s.T), '°F'], '', null]);
      var qc = s.qual === 'acceptable' ? 'var(--grn)' : s.qual ? C.clean : null;
      R.push(['CONTAMINATION', s.cont == null ? ['—', ''] : [String(Math.round(s.cont)), '%'], s.cont == null ? 'limit ≤ ' + CONT_LIMIT + '%' : (s.qual === 'acceptable' ? 'acceptable ≤ ' + CONT_LIMIT + '%' : s.qual), qc]);
      var b1 = bottleTxt(s.fill1, s.v1, s.route, 'b1'), b2 = bottleTxt(s.fill2, s.v2, s.route, 'b2');
      R.push(['BOTTLE 1 · MPSR', [b1[0], ''], s.v1 === 'sealed' ? 'valve sealed' : s.v1 === 'open' ? 'valve open' : 'valve closed · isolated', b1[1]]);
      R.push(['BOTTLE 2 · MPSR', [b2[0], ''], s.v2 === 'sealed' ? 'valve sealed' : s.v2 === 'open' ? 'valve open' : 'valve closed · isolated', b2[1]]);
    } else {
      R.push(['PRESSURE AT SAMPLER', s.pVal == null ? ['—', ''] : [n0(s.pVal), 'psia'], s.pVal == null ? '' : 'Psat ' + n0(RES.psat) + ' psia', null]);
      R.push(['TEMPERATURE', s.T == null ? ['—', ''] : [n0(s.T), '°F'], '', null]);
      R.push(['FLOW STABILITY', s.stab == null ? ['—', ''] : s.stab === 'checking' ? ['Checking', ''] : ['Stable ✓', ''], s.stab === 'stable' ? 'steady · above Psat' : '', s.stab === 'stable' ? 'var(--grn)' : s.stab ? 'var(--amb)' : null]);
      var chT = s.inlet === 'sealed' ? 'Sealed' : s.fill > 0 ? 'Filling ' + Math.round(s.fill * 100) + '%' : 'Empty';
      R.push(['SAMPLE CHAMBER', [chT, ''], s.inlet === 'sealed' ? 'inlet valve closed' : '', s.inlet === 'sealed' ? 'var(--grn)' : s.fill > 0 ? C.samp : null]);
      R.push(['N₂ COMPENSATION', [s.n2 >= 1 ? 'Active' : s.n2 > 0 ? 'Arming' : 'Standby', ''], s.n2 >= 1 ? 'sample kept above Pres' : '', s.n2 >= 1 ? 'var(--grn)' : null]);
    }
    return R;
  }

  /* side-panel figure: the downhole sample chambers, same state as the tool (fill, piston, valves) */
  function figBottle(cx, f, v, bufC, title, sub, subC, letter) {
    var y0 = 40, y1 = 176, py = y0 + 6 + f * (y1 - y0 - 18), o = '';
    o += '<rect x="' + (cx - 5) + '" y="14" width="10" height="16" fill="url(#bhsFigM)" stroke="#0b1320" stroke-width=".8"/>';
    o += valve(cx, 22, v, { r: 6.5, v: true, c: C.samp });
    o += '<rect x="' + (cx - 30) + '" y="' + (y0 - 10) + '" width="60" height="' + (y1 - y0 + 20) + '" rx="14" fill="url(#bhsFigM)" stroke="#0b1320" stroke-width="1.2"/>';
    o += '<rect x="' + (cx - 21) + '" y="' + y0 + '" width="42" height="' + (y1 - y0) + '" rx="3" fill="#0f1a2a"/>';
    o += '<rect x="' + (cx - 21) + '" y="' + py.toFixed(1) + '" width="42" height="' + (y1 - py).toFixed(1) + '" fill="' + bufC + '" opacity=".8"/>';
    if (f > 0) o += '<rect x="' + (cx - 21) + '" y="' + y0 + '" width="42" height="' + (py - y0).toFixed(1) + '" fill="url(#bhsFigO)"/>';
    o += '<rect x="' + (cx - 22) + '" y="' + (py - 1).toFixed(1) + '" width="44" height="9" rx="1.5" fill="#c9d3e1" stroke="#0b1320" stroke-width=".8"/><rect x="' + (cx - 22) + '" y="' + (py + 3).toFixed(1) + '" width="44" height="1.4" fill="#56657c"/>';
    o += '<rect x="' + (cx - 17) + '" y="' + (y0 + 4) + '" width="4" height="' + (y1 - y0 - 8) + '" rx="2" fill="#fff" opacity=".18"/>';
    if (letter && y1 - py > 26) o += '<text x="' + cx + '" y="' + ((py + 8 + y1) / 2 + 3.5).toFixed(1) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="600" fill="#0b2033" opacity=".75">' + letter + '</text>';
    o += '<text x="' + cx + '" y="210" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="12" font-weight="600" fill="var(--txt)">' + esc(title) + '</text>';
    o += '<text x="' + cx + '" y="226" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="' + (subC || 'var(--mut)') + '">' + esc(sub) + '</text>';
    return o;
  }
  function panelFig(s) {
    if (s.mode === 'open') {
      var b1 = bottleTxt(s.fill1, s.v1, s.route, 'b1'), b2 = bottleTxt(s.fill2, s.v2, s.route, 'b2');
      return figBottle(62, s.fill1, s.v1, C.buf, 'Bottle 1 · MPSR', b1[0], b1[1], 'BUF') + figBottle(178, s.fill2, s.v2, C.buf, 'Bottle 2 · MPSR', b2[0], b2[1], 'BUF');
    }
    var chT = s.inlet === 'sealed' ? 'Sealed · full' : s.fill > 0 ? 'Filling ' + Math.round(s.fill * 100) + '%' : 'Empty';
    var o = figBottle(62, s.fill, s.inlet, C.hyd, 'Sample chamber', chT, s.inlet === 'sealed' ? 'var(--grn)' : s.fill > 0 ? C.samp : null, 'BUF');
    // N2 compensation section
    var a = s.n2, cx = 180;
    o += '<rect x="' + (cx - 26) + '" y="54" width="52" height="116" rx="12" fill="url(#bhsFigM)" stroke="#0b1320" stroke-width="1.2"/>';
    o += '<rect x="' + (cx - 18) + '" y="64" width="36" height="96" rx="3" fill="' + C.n2 + '" opacity="' + (.45 + .45 * a).toFixed(2) + '"/>';
    for (var d = 0; d < 9; d++) o += '<circle cx="' + (cx - 10 + (d % 3) * 10) + '" cy="' + (80 + Math.floor(d / 3) * 26) + '" r="2" fill="#6f93b3"/>';
    o += '<text x="' + cx + '" y="120" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="600" fill="#1d3a52">N₂</text>';
    o += valve(cx, 44, a > .5 ? 'open' : 'closed', { r: 6, v: true, c: '#8fc4ea' });
    o += '<text x="' + cx + '" y="210" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="12" font-weight="600" fill="var(--txt)">N₂ compensation</text>';
    o += '<text x="' + cx + '" y="226" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="' + (a >= 1 ? 'var(--grn)' : 'var(--mut)') + '">' + (a >= 1 ? 'Active' : a > 0 ? 'Arming' : 'Standby') + '</text>';
    return o;
  }

  function draw() {
    if (!M.root) return;
    var s = stateNow(), st = steps(), tl = M.tl;
    M.el.dyn.innerHTML = s.mode === 'open' ? ohDyn(s) : chDyn(s, M.amb);
    M.el.idyn.innerHTML = s.mode === 'open' ? ohInset(s) : chInset(s, M.amb);
    // panel: live readings, sample-chamber figure, procedure control (ProcCtl) and Move to Lab.
    // The step list and the current instruction live in the Explain card (describe()).
    var idle = !s.started;
    // four essential readings (depth, pressure, temperature, contamination / flow stability);
    // the full set stays in the Explain card (describe())
    readings(s).slice(0, 4).forEach(function (r, k) {
      setText('l' + k, r[0]);
      setHTML('v' + k, esc(r[1][0]) + (r[1][1] ? '<small>' + esc(r[1][1]) + '</small>' : ''));
      setStyle(M.el['v' + k], 'color', r[3] || 'var(--accb)');
    });
    setStyle(M.el.ldot, 'background', idle ? 'var(--mut)' : s.done ? 'var(--accg)' : 'var(--blue)');
    if (M.el.b_lab) { M.el.b_lab.disabled = !s.done; M.el.b_lab.className = 'bhs-act' + (s.done ? ' pri' : ''); }
    if (M.doneSent !== s.done) { M.doneSent = s.done; if (M.opts.onDone) try { M.opts.onDone(s.done); } catch (e) {} }
  }

  function loop(now) {
    if (!M.root) return;
    var dt = M.last ? Math.min(.06, (now - M.last) / 1000) : 0;
    M.last = now;
    var started = M.t > 0, done = M.tl && M.t >= M.tl.total;
    if (M.playing) {
      M.t += dt;
      if (M.t >= M.tl.total) { M.t = M.tl.total; M.playing = false; }
    }
    if (M.playing || !started || done) M.amb += dt;   // ambient (production flow) freezes only on user pause
    if (now - M.lastDraw > 32) { M.lastDraw = now; draw(); }
    M.raf = requestAnimationFrame(loop);
  }

  function jump(k) {
    var st = M.tl.steps;
    if (k >= st.length) { M.t = M.tl.total; M.playing = false; }
    else M.t = Math.max(1e-3, st[k].st);
    if (M.t <= 1e-3 && !M.playing) M.t = 1e-3;
    draw();
  }
  function act(a) {
    var s = stateNow();
    if (a === 'play') {
      if (!s.started || s.done) { M.tl = buildTL(steps()); M.t = 1e-3; M.playing = true; }
      else M.playing = !M.playing;
    } else if (a === 'replay') { M.tl = buildTL(steps()); M.t = 1e-3; M.playing = true; }
    else if (a === 'prev') {
      if (!s.started) return;
      var i = s.done ? M.tl.steps.length - 1 : s.i;
      var k = (M.t - M.tl.steps[i].st > 1.2 || s.done) ? i : Math.max(0, i - 1);
      jump(k);
    } else if (a === 'next') {
      if (s.done) return;
      if (!s.started) { jump(1); return; }
      jump(s.i + 1);
    } else if (a === 'explain') { if (window.__SG && window.__SG.toggle) window.__SG.toggle(); }
    else if (a === 'lab') { if (s.done && M.opts.onLab) M.opts.onLab(); }
    draw();
  }

  function reset() { M.tl = buildTL(steps()); M.t = 0; M.playing = false; M.doneSent = null; M.rdy = false; }

  /* shared procedure panel (ProcCtl.js): one stage = one procedure step of the timeline */
  function pcInfo() {
    if (!M.root || !M.tl) return null;
    var s = stateNow(), st = steps(), N = st.length, tl = M.tl;
    var k = s.done ? N - 1 : (s.started ? s.i : 0);
    var status = s.done ? 'complete' : !s.started ? 'ready' : M.playing ? 'running' : M.rdy ? 'ready' : 'paused';
    var fr = !s.started ? 0 : s.done ? 1 : clamp((M.t - tl.steps[k].st) / (tl.steps[k].d + tl.steps[k].h), 0, 1);
    return { N: N, k: k, title: st[k].t, q: '', unit: 'Step', status: status, frac: fr, allDone: s.done, frozen: M.rdy,
      canPrev: s.started && k > 0, canNext: !s.done, canRestart: s.started && !s.done && (M.playing || !M.rdy || M.t > tl.steps[k].st + 1e-3) || s.done,
      runLabel: !s.started ? 'Take Sample' : null, again: 'Take Sample Again', reset: 'Reset Sampling', resetDisabled: !s.started };
  }
  function pcAct(a) {
    var s = stateNow(), st = M.tl.steps, N = st.length;
    var k = s.done ? N - 1 : (s.started ? s.i : 0);
    if (a === 'run' || a === 'resume') { if (!s.started) act('play'); else if (!s.done) M.playing = true; M.rdy = false; }
    else if (a === 'pause') { M.playing = false; M.rdy = false; }
    else if (a === 'restart') { M.playing = false; jump(k); M.rdy = true; }
    else if (a === 'prev') { M.playing = false; jump(Math.max(0, k - 1)); M.rdy = true; }
    else if (a === 'next') { M.playing = false; jump(s.started ? k + 1 : 1); M.rdy = true; }
    else if (a === 'again') { act('replay'); M.rdy = false; }
    else if (a === 'reset') { reset(); }
    draw();
  }

  window.BottomHoleSim = {
    pcInfo: pcInfo,
    pcAct: pcAct,
    mount: function (host, opts) {
      this.unmount();
      M.host = host; M.opts = opts || {}; M.mode = (opts && opts.mode) || 'open';
      M.root = document.createElement('div'); M.root.className = 'bhs-root'; host.appendChild(M.root);
      reset(); buildDom(); M.last = 0; draw();
      M.raf = requestAnimationFrame(loop);
    },
    unmount: function () {
      if (M.raf) cancelAnimationFrame(M.raf);
      M.raf = 0;
      if (M.root && M.root.parentNode) M.root.parentNode.removeChild(M.root);
      M.root = null; M.host = null;
    },
    isMounted: function (host) { return !!M.root && M.host === host && M.root.isConnected; },
    mode: function () { return M.mode; },
    setMode: function (mode) {
      if (!M.root || mode === M.mode) return;
      M.mode = mode; reset(); buildDom(); draw();
    },
    setOpts: function (o) { M.opts = o || M.opts; },
    /* test hooks */
    _seek: function (t, play) { M.t = t; M.playing = !!play; draw(); },
    _tl: function () { return M.tl; },
    /* read-only description for the StepGuide Explain card */
    describe: function () {
      if (!M.root) return null;
      var s = stateNow(), st = steps(), ex = M.mode === 'open' ? OH_EX : CH_EX;
      var name = M.mode === 'open' ? 'Open hole (MDT · MRMS)' : 'Cased hole (SRS)';
      var vals = readings(s).map(function (r) { return { l: r[0].charAt(0) + r[0].slice(1).toLowerCase(), v: r[1][0], u: r[1][1] }; });
      if (!s.started) return { title: 'Bottom-hole sampling · ' + name + ' — ready', tag: 'READY', busy: false,
        d: M.mode === 'open' ? 'The MDT toolstring hangs in the rig mast, rigged up on the wireline truck cable.' : 'The well is producing to the test separator; the SRS sits in the lubricator above the closed swab valve.',
        w: M.mode === 'open' ? 'Open-hole sampling takes formation fluid directly from the borehole wall of an uncased interval, before the well is completed.' : 'Cased-hole sampling takes the fluid flowing in the production tubing of a completed, producing well.',
        e: 'Nothing is moving yet.', o: 'Press Take Sample, or use Next to step through the procedure.', vals: vals,
        proc: { items: st.map(function (x) { return x.t; }), cur: -1, q: M.mode === 'open' ? 'Toolstring hangs in the rig mast. Press Take Sample to start.' : 'Sampler waits in the lubricator. Press Take Sample to start.' } };
      var i = s.done ? st.length - 1 : s.i;
      return { title: 'Bottom-hole sampling · ' + name + ' — ' + (s.done ? 'Ready for laboratory transfer' : st[i].t),
        tag: s.done ? 'COMPLETE' : 'STEP ' + (i + 1) + ' / ' + st.length, busy: M.playing,
        d: st[i].s, w: ex[i].w, e: ex[i].e, o: ex[i].o, vals: vals,
        proc: { items: st.map(function (x) { return x.t; }), cur: i, done: s.done,
          q: s.done ? (M.mode === 'open' ? 'Both bottles full and sealed at surface.' : 'Sample chamber sealed and N₂-compensated.') : st[i].q } };
    }
  };


})();
