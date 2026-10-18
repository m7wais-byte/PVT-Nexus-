/* ==========================================================================
   PVT Nexus — bottle design prototype · equipment types and operating timelines

   Every value below is taken from the project unless it is tagged
   ASSUMPTION (see README.md, "Assumptions to review"). Sources:
     SampleBottle.js            shared piston bottle shell (all sampling bottles)
     Main.js valSrcMap()        capacities / pressures / temperatures per source
     Main.js bottleModel()      800 cc SPS/PDS split, 450 cc charge, 82 cc drawn
     StepGuide.js               wellhead + separator sampling sequence, N2 2,000 psig
     RecombSim.js CFG           GSP, titanium cylinder, oil bottle, recombination bottle

   A timeline is a list of phases. state(t) replays the phases from the initial
   state, so every frame is a pure function of time: pause / seek / replay are exact.
   ========================================================================== */
(function () {
  'use strict';

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, u) { return a + (b - a) * u; };
  var ease = function (u) { u = clamp(u, 0, 1); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  var live = function (u) { return u > 0 && u < 1; };

  /* RecombSim.js CFG (demonstration inputs, copied — not changed) */
  var RC = { GAS_P: 5000, BOOST_P: 1000, GAS_BOOST_V: 300, GAS_TI_V: 69.0, VAC_P: -14.7, TI_CAP: 330, TI_W0: 30,
    TI_SV_VAC: 12, GAS_CHARGE: 60, GSP_P0: 315, GSP_P1: 296, OIL_P0: 315, OIL_P: 3000, OIL_V0: 200, OIL_COMP: 1.4,
    OIL_A: 100, OIL_B: 80, OIL_A_LEFT: 1, OIL_A_END: 1, BOTTLE_CAP: 275, BOT_W0: 30, GAS_TO_BOT: 40, WORK_P: 5000,
    MIX_SHRINK: 0.30, LAB_T: 22, ROCK_N: 3 };
  var OIL_IN = (RC.OIL_A - RC.OIL_A_LEFT) + (RC.OIL_A_LEFT + RC.OIL_B - RC.OIL_A_END);   // 179 cc
  /* project gas model (RecombSim.js): P·Vⁿ = const through 1,000 psig / 300 cc and 5,000 psig / 69 cc */
  var N_COMP = Math.log(RC.GAS_P / RC.BOOST_P) / Math.log(RC.GAS_BOOST_V / RC.GAS_TI_V);
  function pCharge(q, V) { return q > 0 && V > 0 ? RC.GAS_P * Math.pow(q / V, N_COMP) : 0; }   // q = cc measured at 5,000 psig
  function amtAt(P, V) { return P > 0 ? V * Math.pow(P / RC.GAS_P, 1 / N_COMP) : 0; }
  var BOT_SS = RC.BOTTLE_CAP - RC.BOT_W0;                       // 245 cc
  var G_B3 = RC.GAS_TO_BOT * Math.pow(RC.GAS_P / RC.WORK_P, 1 / N_COMP);   // free gas at working pressure (40 cc)
  var DW_B3 = (BOT_SS - OIL_IN) - G_B3;                          // water to reach the working pressure (26 cc)
  var SHRINK = RC.MIX_SHRINK * G_B3;                             // visual only (RecombSim)

  var SRC = {
    project: 'project value',
    model: 'project model (RecombSim P·Vⁿ)',
    ramp: 'project end points · ramp drawn linearly',
    none: 'not modelled in the project'
  };
  function rd(l, v, u, src, note) { return { l: l, v: v, u: u || '', src: src, note: note || '' }; }

  /* ---------------------------------------------------------------- configs
     state fields: sample (cc, sample side) · water (cc, hydraulic water when the buffer side
     can hold a gap) · oil / gasV / amt / mix / inv (recombination) · gas (0..1, gas bottle)
     valves {top,bot} · flow {top,bot} (+1 into the bottle) · line {top,bot} fluid in the line
     conn {top,bot} what the port is connected to · read [] instrument readings · drops / bubbles */
  var C = {};

  /* 1a  piston bottle — wellhead, N2 back-pressure (constant-pressure sampling) */
  C.wh = {
    type: 'piston', name: 'Wellhead · N₂ back-pressure', short: 'Wellhead',
    sub: 'Constant-pressure sampling: oil above the floating piston, N₂ cushion below.',
    cap: 600, capSrc: 'StepGuide.js note "Bottle 600 cc"', buf: 'n2', sampleKind: 'oil',
    plate: ['PISTON SAMPLE BOTTLE', '600 cc · N₂ BUFFER'],
    names: { top: 'Sample-side valve', bot: 'N₂-side valve', sample: 'Sample chamber', buffer: 'N₂ chamber' },
    noDischarge: 'Not defined for the N₂ configuration: in Validation the project treats every oil bottle with hydraulic water behind the piston, and the N₂ → water changeover is not described.',
    slider: { on: true, needs: ['top', 'bot'], down: false, downWhy: 'Moving the piston back would need N₂ pushed in through the bleed side — not defined in the project.' },
    init: { sample: 0, valves: { top: false, bot: false }, line: { top: null, bot: null },
      conn: { top: { t: 'Wellhead sampling valve', s: 'flowline · after X-tree' }, bot: { t: 'N₂ bleed', s: 'controlled displacement · ASSUMED' } },
      read: [rd('N₂ pre-charge', 2000, 'psig', 'project', 'behind the piston'), rd('Bottle pressure', null, '', 'none')] },
    phases: [
      { k: 'connect', grp: 'prep', d: 3, name: 'Connect bottle', desc: 'Bottle made up on the wellhead sampling line. All valves closed; N₂ at 2,000 psig behind the piston.', fn: function (s) {} },
      { k: 'flush', grp: 'prep', d: 3, name: 'Flush line', desc: 'Fresh flowline fluid is flushed through the line to drain. The bottle inlet stays closed.', fn: function (s, u) {
        s.line.top = u > 0 ? 'oil' : null;
        s.read = [rd('Line pressure', 1450, 'psig', 'project', 'wellhead'), rd('Line temperature', 60, '°C', 'project'), rd('N₂ pre-charge', 2000, 'psig', 'project'), rd('Bottle pressure', null, '', 'none')]; } },
      { k: 'open', grp: 'prep', d: 2.5, name: 'Open valves gradually', desc: 'The sample-side valve is opened slowly, then the N₂-side bleed (ASSUMED order).', fn: function (s, u) {
        s.valves.top = u >= .35; s.valves.bot = u >= .7; } },
      { k: 'fill', grp: 'fill', d: 12, name: 'Fill sample chamber', desc: 'Well fluid enters above the piston; the piston moves down and N₂ is displaced in a controlled way, so the sample fills under back-pressure.', fn: function (s, u) {
        s.sample = 490 * ease(u); s.line.bot = 'n2';
        if (live(u)) { s.flow.top = 1; s.flow.bot = -1; } } },
      { k: 'close', grp: 'hold', d: 3, name: 'Close valves', desc: 'Required volume reached. N₂ bleed closed, then the sample-side valve (ASSUMED order); the sample is trapped under pressure.', fn: function (s, u) {
        s.valves.bot = u < .35; s.valves.top = u < .7; } },
      { k: 'seal', grp: 'hold', d: 4, name: 'Sealed for the lab', desc: 'Line pressure bled off, bottle disconnected and capped. Pressure after sealing is not tracked in the project.', fn: function (s, u) {
        if (u > .35) { s.line.top = null; s.line.bot = null; }
        if (u > .55) { s.conn.top = null; s.conn.bot = null; s.capTop = true; s.capBot = true; } } }
    ]
  };

  /* 1b  piston bottle — separator oil (water below the piston) + lab charge (RecombSim stage 6) */
  C.sep = {
    type: 'piston', name: 'Separator oil · water buffer', short: 'Separator oil',
    sub: 'Oil above the floating piston, water below; water is displaced as the oil fills.',
    cap: 600, capSrc: 'Main.js valSrcMap "Oil piston bottle · ~600 cc"', buf: 'water', sampleKind: 'oil',
    plate: ['PISTON SAMPLE BOTTLE', '600 cc · SEP. OIL'],
    names: { top: 'Sample-side valve', bot: 'Water-side valve', sample: 'Sample chamber', buffer: 'Water chamber' },
    slider: { on: true, needs: ['top', 'bot'], down: true },
    init: { sample: 0, valves: { top: false, bot: false }, line: { top: null, bot: null },
      conn: { top: { t: 'Separator oil outlet', s: 'oil sampling valve' }, bot: { t: 'Water outlet', s: 'displaced water' } },
      read: [rd('Separator pressure', 200, 'psig', 'project'), rd('Separator temperature', 35, '°C', 'project')] },
    phases: [
      { k: 'connect', grp: 'prep', d: 2.5, name: 'Connect bottle', desc: 'Oil piston bottle connected to the separator oil sampling point; valves closed. Bottle full of water below the piston.', fn: function () {} },
      { k: 'flush', grp: 'prep', d: 3, name: 'Flush line', desc: 'Fresh separator oil flushed through the line; bottle valves closed.', fn: function (s, u) { s.line.top = u > 0 ? 'oil' : null; } },
      { k: 'open', grp: 'prep', d: 2.5, name: 'Open valves slowly', desc: 'Sample-side valve opened slowly, then the water-side valve.', fn: function (s, u) { s.valves.top = u >= .35; s.valves.bot = u >= .7; } },
      { k: 'fill', grp: 'fill', d: 12, name: 'Oil displaces water', desc: 'Oil enters above the piston; the piston moves down and pushes the water out through the bottom valve at a controlled rate. Fill volume 200 cc (RecombSim OIL_V0).', fn: function (s, u) {
        s.sample = RC.OIL_V0 * ease(u); s.line.bot = 'water';
        if (live(u)) { s.flow.top = 1; s.flow.bot = -1; } } },
      { k: 'close', grp: 'hold', d: 3, name: 'Close and seal', desc: 'Water-side valve closed, then the sample-side valve (ASSUMED order). Oil trapped at separator conditions.', fn: function (s, u) { s.valves.bot = u < .35; s.valves.top = u < .7; } },
      { k: 'trans', grp: 'hold', d: 3, name: 'Transport to lab', desc: 'Lines removed; bottle capped for transport.', fn: function (s, u) {
        if (u > .3) { s.line.top = s.line.bot = null; s.conn.top = s.conn.bot = null; s.capTop = s.capBot = true; } } },
      { k: 'lab', grp: 'discharge', d: 3, name: 'Connect in the lab', desc: 'Bottle connected: sample side to the PVT cell inlet, water side to the water pump (300 cc). Oil at 315 psig (RecombSim OIL_P0).', fn: function (s, u) {
        s.capTop = s.capBot = false;
        s.conn.top = { t: 'PVT cell inlet', s: 'Pump A / Pump B' }; s.conn.bot = { t: 'Water pump', s: '300 cc barrel' };
        s.line.bot = 'water';
        s.read = [rd('Bottle pressure', RC.OIL_P0, 'psig', 'project', 'lab, before pumping'), rd('Temperature', RC.LAB_T, '°C', 'project', 'lab transfer')]; } },
      { k: 'press', grp: 'discharge', d: 6, name: 'Pressurise 315 → 3,000 psig', desc: 'Water pump injects 1.4 cc behind the piston; the oil is compressed from 315 to 3,000 psig. Sample valve closed.', fn: function (s, u) {
        s.valves.bot = true; s.sample = RC.OIL_V0 - RC.OIL_COMP * ease(u);
        if (live(u)) s.flow.bot = 1;
        s.read = [rd('Bottle pressure', Math.round(lerp(RC.OIL_P0, RC.OIL_P, ease(u))), 'psig', 'ramp'), rd('Water injected', +(RC.OIL_COMP * ease(u)).toFixed(1), 'cc', 'project'), rd('Temperature', RC.LAB_T, '°C', 'project')]; } },
      { k: 'deliver', grp: 'discharge', d: 12, name: 'Deliver 180 cc to the PVT cell', desc: 'Sample valve open: the water pump pushes the piston up and 180 cc of oil (Pump A 100 + Pump B 80) leaves at 3,000 psig.', fn: function (s, u) {
        s.valves.bot = true; s.valves.top = u > .04; s.line.top = 'oil';
        var v = (RC.OIL_A + RC.OIL_B) * ease(clamp((u - .04) / .96, 0, 1));
        s.sample = RC.OIL_V0 - RC.OIL_COMP - v;
        if (live(u) && u > .04) { s.flow.top = -1; s.flow.bot = 1; }
        s.read = [rd('Bottle pressure', RC.OIL_P, 'psig', 'project', 'held by the pump'), rd('Oil delivered', +v.toFixed(1), 'cc', 'project'), rd('Temperature', RC.LAB_T, '°C', 'project')]; } },
      { k: 'end', grp: 'discharge', d: 2.5, name: 'Close valves', desc: 'Charge complete; bottle valves closed.', fn: function (s, u) { s.valves.top = u < .4; s.valves.bot = u < .7; } }
    ]
  };

  /* 1c  piston bottle — bottom-hole SPS/PDS lab bottle (MPSR transfer + charging) */
  C.bh = {
    type: 'piston', name: 'Bottom hole · SPS/PDS lab bottle', short: 'SPS/PDS',
    sub: 'Receives the 450 cc bottom-hole sample from the MPSR tool; hydraulic water below the piston.',
    cap: 800, capSrc: 'Main.js bottleModel CC = 800', buf: 'water', sampleKind: 'oil',
    plate: ['SPS/PDS BOTTLE', '800 cc · H₂O SIDE'],
    names: { top: 'Sample-side valve', bot: 'Water-side valve', sample: 'Sample chamber', buffer: 'Water chamber' },
    slider: { on: true, needs: ['top', 'bot'], down: true },
    init: { sample: 0, valves: { top: false, bot: false }, line: { top: null, bot: null },
      conn: { top: { t: 'MPSR tool · sample side', s: 'transfer line' }, bot: { t: 'Receiver', s: 'displaced water' } },
      read: [rd('Transfer pressure', 5000, 'psi', 'project', 'Main.js transfer'), rd('Temperature', 114, '°C', 'project')] },
    phases: [
      { k: 'connect', grp: 'prep', d: 2.5, name: 'Connect to MPSR', desc: 'SPS/PDS bottle full of water below the piston, connected to the MPSR sample outlet and to the receiver. Valves closed.', fn: function () {} },
      { k: 'open', grp: 'prep', d: 2.5, name: 'Open bottle valves', desc: 'Bottle top valve opens before any sample arrives; water port open to the receiver.', fn: function (s, u) { s.valves.top = u >= .3; s.valves.bot = u >= .6; s.line.top = u > .3 ? 'oil' : null; } },
      { k: 'xfer', grp: 'fill', d: 14, name: 'Transfer 450 cc', desc: 'Pump pressurises the MPSR water side; the sample displaces into the SPS/PDS bottle, the piston moves down and the water side shrinks by the same volume.', fn: function (s, u) {
        s.sample = 450 * ease(u); s.line.bot = 'water';
        if (live(u)) { s.flow.top = 1; s.flow.bot = -1; }
        s.read = [rd('Transfer pressure', 5000, 'psi', 'project'), rd('Temperature', 114, '°C', 'project'), rd('Transferred', Math.round(450 * ease(u)), 'cc', 'project')]; } },
      { k: 'close', grp: 'hold', d: 2.5, name: 'Close valves', desc: 'Sample secured in the SPS/PDS bottle at 5,000 psi · 114 °C.', fn: function (s, u) { s.valves.top = u < .4; s.valves.bot = u < .7; } },
      { k: 'hold', grp: 'hold', d: 3, name: 'Hold sealed', desc: 'Bottle sealed; ready for laboratory QC (restoration, water check, agitation — not shown here).', fn: function (s, u) {
        if (u > .3) { s.line.top = s.line.bot = null; s.conn.top = s.conn.bot = null; s.capTop = s.capBot = true; } } },
      { k: 'lab', grp: 'discharge', d: 2.5, name: 'Connect for charging', desc: 'Sample side to the PVT cell charging line, water side to the hydraulic pump. Bottle held at 5,000 psig.', fn: function (s) {
        s.capTop = s.capBot = false; s.conn.top = { t: 'PVT cell', s: 'charging line' }; s.conn.bot = { t: 'Hydraulic pump', s: 'water' }; s.line.bot = 'water';
        s.read = [rd('Bottle pressure', 5000, 'psig', 'project', 'StepGuide charging'), rd('Temperature', 114, '°C', 'project')]; } },
      { k: 'charge', grp: 'discharge', d: 10, name: 'Charge 82 cc to the PVT cell', desc: 'Sample drawn out to the PVT cell; the pump replaces it with water at constant pressure (Main.js DRAWN_CC = 82).', fn: function (s, u) {
        s.valves.top = s.valves.bot = true; s.line.top = 'oil'; s.sample = 450 - 82 * ease(u);
        if (live(u)) { s.flow.top = -1; s.flow.bot = 1; } } },
      { k: 'end', grp: 'discharge', d: 2.5, name: 'Close valves', desc: 'Charging complete; 368 cc remain in the bottle.', fn: function (s, u) { s.valves.top = u < .4; s.valves.bot = u < .7; } }
    ]
  };

  /* 1d  piston bottle — recombination bottle (RecombSim stages 5, 8, 9) */
  C.rc = {
    type: 'piston', name: 'Recombination bottle', short: 'Recombination',
    sub: 'Same piston-bottle design: 40 cc separator gas + 179 cc separator oil above the piston, mixed by 180° inversion.',
    cap: RC.BOTTLE_CAP, capSrc: 'RecombSim CFG.BOTTLE_CAP (chosen for drawing)', buf: 'water', sampleKind: 'recomb',
    plate: ['RECOMBINATION BOTTLE', '275 cc · H₂O SIDE'],
    names: { top: 'Sample-side valve', bot: 'Hydraulic valve', sample: 'Sample chamber', buffer: 'Water chamber' },
    noDischarge: 'Not defined: the project ends Recombination with the mixed sample held at 5,000 psig.',
    slider: { on: false, why: 'Gas and oil share the sample side: volumes change only through the recombination steps.' },
    init: { sample: BOT_SS, water: RC.BOT_W0, oil: 0, amt: 0, gasV: BOT_SS, mix: 0, inv: 0, gone: 0,
      valves: { top: false, bot: false }, line: { top: null, bot: null },
      conn: { top: { t: 'PVT cell · Pump A', s: 'gas at 5,000 psig' }, bot: null },
      read: [rd('Bottle pressure', null, '', 'none', 'sample side empty'), rd('Temperature', RC.LAB_T, '°C', 'project')] },
    phases: [
      { k: 'connect', grp: 'prep', d: 3, name: 'Connect to the cell', desc: '30 cc water, piston directly above it, sample side empty. Cell outlet to the sample valve; hydraulic valve closed.', fn: function () {} },
      { k: 'gas', grp: 'fill', d: 10, name: 'Receive 40 cc gas', desc: 'Pump A advances at 5,000 psig: 40 cc of gas (measured at 5,000 psig) enters above the piston and expands into the 245 cc sample side. Water stays below.', fn: function (s, u) {
        s.valves.top = u > .03; s.line.top = 'gas'; s.amt = RC.GAS_TO_BOT * ease(clamp((u - .03) / .97, 0, 1));
        if (live(u) && u > .03) s.flow.top = 1;
        s.read = [rd('Bottle pressure', Math.round(pCharge(s.amt, s.gasV)), 'psig', 'model'), rd('Pump A', 5000, 'psig', 'project'), rd('Temperature', RC.LAB_T, '°C', 'project')]; } },
      { k: 'gclose', grp: 'hold', d: 2.5, name: 'Isolate', desc: '40 cc delivered: valves closed, bottle isolated.', fn: function (s, u) {
        s.valves.top = u < .4; if (u > .6) s.line.top = null; } },
      { k: 'oconn', grp: 'prep', d: 3, name: 'Connect for oil', desc: 'Cell outlet to the sample valve; water side to the water pump. Hydraulic valve opened: the pump reads the bottle pressure at constant volume.', fn: function (s, u) {
        s.conn.top = { t: 'PVT cell · Pump A', s: 'oil at 3,000 psig' }; s.conn.bot = { t: 'Water pump', s: 'monitor · constant volume' };
        s.line.bot = 'water'; s.valves.bot = u > .5; } },
      { k: 'oil', grp: 'fill', d: 14, name: 'Receive 179 cc oil', desc: 'Oil enters at the top and falls through the gas onto the oil; the gas above it is compressed (99 + 80 = 179 cc; the two strokes are drawn as one).', fn: function (s, u) {
        s.valves.bot = true; s.valves.top = u > .03; s.line.top = 'oil'; s.oil = OIL_IN * ease(clamp((u - .03) / .97, 0, 1));
        s.gasV = s.sample - s.oil; s.drops = live(u) && u > .03;
        if (live(u) && u > .03) s.flow.top = 1;
        s.read = [rd('Bottle pressure', Math.round(pCharge(s.amt, s.gasV)), 'psig', 'model'), rd('Cell', RC.OIL_P, 'psig', 'project'), rd('Temperature', RC.LAB_T, '°C', 'project')]; } },
      { k: 'oclose', grp: 'hold', d: 2.5, name: 'Close sample valve', desc: 'Bottle sample valve and cell inlet closed.', fn: function (s, u) {
        s.valves.top = u < .4; if (u > .6) { s.line.top = null; s.conn.top = null; s.capTop = true; } } },
      { k: 'press', grp: 'hold', d: 6, name: 'Pressurise to 5,000 psig', desc: 'Water pump raises the bottle to the 5,000 psig working pressure: water enters behind the piston and the free gas is compressed.', fn: function (s, u) {
        s.water = RC.BOT_W0 + DW_B3 * ease(u); s.sample = RC.BOTTLE_CAP - s.water; s.gasV = s.sample - s.oil;
        if (live(u)) s.flow.bot = 1;
        s.conn.bot = { t: 'Water pump', s: 'flexible line · pressurising' };
        s.read = [rd('Bottle pressure', Math.round(pCharge(s.amt, s.gasV)), 'psig', 'model'), rd('Temperature', RC.LAB_T, '°C', 'project', 'jacket set point not defined')]; } },
      { k: 'invert', grp: 'hold', d: 24, name: 'Invert 3 × 180°', desc: 'Bottle inverted slowly 0° → 180° → 0° three times: bubbles disperse through the oil and go into solution. The pump holds 5,000 psig.', fn: function (s, u) {
        s.inv = 180 * (1 - Math.cos(2 * Math.PI * RC.ROCK_N * u)) / 2;
        s.mix = u; s.water = RC.BOT_W0 + DW_B3 + SHRINK * u; s.sample = RC.BOTTLE_CAP - s.water; s.gasV = s.sample - s.oil;
        s.bubbles = live(u) ? Math.min(1, (1 - u) * 1.4) : 0;
        if (live(u)) s.flow.bot = 1;
        s.conn.bot = { t: 'Water pump', s: 'flexible line · holding 5,000' };
        s.read = [rd('Bottle pressure', RC.WORK_P, 'psig', 'project', 'held by the pump'), rd('Reservoir P (ref.)', 3000, 'psig', 'project'), rd('Temperature', RC.LAB_T, '°C', 'project', 'jacket set point not defined')]; } },
      { k: 'settle', grp: 'hold', d: 3.5, name: 'Single phase', desc: 'Agitation stopped: the last free gas disappears; uniform single-phase sample at 5,000 psig.', fn: function (s, u) {
        s.inv = 0; s.mix = 1; s.gone = ease(u);
        s.read = [rd('Bottle pressure', RC.WORK_P, 'psig', 'project'), rd('Temperature', RC.LAB_T, '°C', 'project', 'jacket set point not defined')]; } }
    ]
  };

  /* 2a  separator gas bottle — field fill at the separator gas outlet */
  C.gspField = {
    type: 'gas', name: 'Field · separator gas outlet', short: 'Field fill',
    sub: 'No piston, no water — one gas chamber filled on its own line.',
    cap: null, capSrc: 'not defined in the project', plate: ['GAS SAMPLE BOTTLE', 'SEPARATOR GAS'],
    names: { top: 'Gas valve', bot: 'Bottom valve', sample: 'Gas chamber' },
    noDischarge: 'Discharge happens in the lab (see "Lab · recombination source").',
    slider: { on: false, why: 'Fixed-volume gas bottle with no piston: the chamber volume cannot change.' },
    init: { gas: 0, valves: { top: false, bot: false }, line: { top: null, bot: null }, capBot: true,
      conn: { top: { t: 'Separator gas outlet', s: 'gas sampling valve' }, bot: null },
      read: [rd('Separator pressure', 200, 'psig', 'project'), rd('Separator temperature', 35, '°C', 'project'), rd('Bottle pressure', null, '', 'none', 'initial state not defined (shown empty)')] },
    phases: [
      { k: 'connect', grp: 'prep', d: 2.5, name: 'Connect bottle', desc: 'Gas bottle connected to the gas-outlet sampling point; valves closed. Bottom port plugged (not used in the field drawing).', fn: function () {} },
      { k: 'flush', grp: 'prep', d: 3, name: 'Flush line', desc: 'Fresh separator gas flushed through the line to vent; bottle valve closed.', fn: function (s, u) { s.line.top = u > 0 ? 'gas' : null; } },
      { k: 'fill', grp: 'fill', d: 10, name: 'Gas fills the bottle', desc: 'Gas-side valve opened: separator gas flows into the bottle until it reaches separator pressure (200 psig).', fn: function (s, u) {
        s.valves.top = u > .04; s.gas = ease(clamp((u - .04) / .96, 0, 1));
        if (live(u) && u > .04) s.flow.top = 1;
        s.read = [rd('Separator pressure', 200, 'psig', 'project'), rd('Separator temperature', 35, '°C', 'project'),
          u >= 1 ? rd('Bottle pressure', 200, 'psig', 'project', 'reaches separator pressure') : rd('Bottle pressure', null, '', 'none', 'rising — no model')]; } },
      { k: 'close', grp: 'hold', d: 2.5, name: 'Close and seal', desc: 'Bottle valve closed, then the gas sampling valve; bottle sealed at separator pressure.', fn: function (s, u) {
        s.valves.top = u < .4; if (u > .7) s.line.top = null; } },
      { k: 'seal', grp: 'hold', d: 3, name: 'Sealed for the lab', desc: 'Disconnected, capped and labelled with the separator conditions.', fn: function (s, u) { if (u > .3) { s.conn.top = null; s.capTop = true; } } }
    ]
  };

  /* 2b  separator gas bottle — GSP gas source in Recombination (RecombSim stage 2) */
  C.gspLab = {
    type: 'gas', name: 'Lab · recombination source (GSP)', short: 'GSP source',
    sub: 'GSP gas cylinder feeding the air-driven booster; only the top valve is used.',
    cap: null, capSrc: 'not defined in the project', plate: ['GAS SAMPLE BOTTLE', 'GSP · SEP. GAS'],
    names: { top: 'GSP valve', bot: 'Bottom valve', sample: 'Gas chamber' },
    noFill: 'Filling happens in the field (see "Field · separator gas outlet").',
    slider: { on: false, why: 'Fixed-volume gas bottle with no piston: the chamber volume cannot change.' },
    init: { gas: 1, valves: { top: false, bot: false }, line: { top: null, bot: null }, capBot: true,
      conn: { top: { t: 'Booster inlet', s: 'via BOOSTER IN valve' }, bot: null },
      read: [rd('GSP pressure', RC.GSP_P0, 'psig', 'project'), rd('Temperature', RC.LAB_T, '°C', 'project')] },
    phases: [
      { k: 'connect', grp: 'prep', d: 3, name: 'Connect to booster', desc: 'GSP outlet connected to the booster gas inlet; the gas line is evacuated through the booster while the GSP valve stays CLOSED.', fn: function (s, u) { s.line.top = u > .5 ? 'vac' : null; } },
      { k: 'open', grp: 'prep', d: 2.5, name: 'Open GSP valve', desc: 'GSP valve opened: gas flows to the booster.', fn: function (s, u) { s.valves.top = u > .4; s.line.top = u > .4 ? 'gas' : 'vac'; } },
      { k: 'boost', grp: 'discharge', d: 13, name: 'Booster draws gas', desc: 'The booster draws gas from the GSP and compresses it into the titanium cylinder. GSP pressure falls 315 → 296 psig (illustrative draw-down in the project).', fn: function (s, u) {
        s.valves.top = true; s.line.top = 'gas'; var P = lerp(RC.GSP_P0, RC.GSP_P1, u);
        s.gas = P / RC.GSP_P0; if (live(u)) s.flow.top = -1;
        s.read = [rd('GSP pressure', Math.round(P), 'psig', 'ramp'), rd('Temperature', RC.LAB_T, '°C', 'project')]; } },
      { k: 'close', grp: 'hold', d: 2.5, name: 'Close GSP valve', desc: '1,000 psig reached in the titanium cylinder: booster stopped, GSP valve closed. Remaining gas held in the GSP.', fn: function (s, u) { s.valves.top = u < .45; if (u > .7) s.line.top = null; } }
    ]
  };

  /* 3  titanium transfer cylinder (RecombSim stages 1–4) */
  C.ti = {
    type: 'ti', name: 'Titanium transfer cylinder', short: 'Titanium',
    sub: 'Gas side on top, floating piston, hydraulic water at the bottom. Boost, compress, deliver.',
    cap: RC.TI_CAP, capSrc: 'RecombSim CFG.TI_CAP (chosen for drawing)', buf: 'water', sampleKind: 'tigas',
    plate: ['TITANIUM CYLINDER', '330 cc · FLOATING PISTON'],
    names: { top: 'Gas-side valve', bot: 'Hydraulic valve', sample: 'Gas (sample) side', buffer: 'Hydraulic side' },
    slider: { on: true, needs: ['bot'], closed: ['top'], gasOnly: true, min: 9, max: RC.TI_CAP - RC.TI_W0 },
    init: { sample: RC.TI_CAP - RC.TI_W0, water: RC.TI_W0, amt: 0, fluid: 'empty',
      valves: { top: false, bot: false }, line: { top: null, bot: null },
      conn: { top: { t: 'Booster outlet', s: 'gas line' }, bot: { t: 'Water pump', s: '300 cc barrel' } },
      read: [rd('Cylinder pressure', null, '', 'none', 'before vacuum'), rd('Temperature', RC.LAB_T, '°C', 'project')] },
    phases: [
      { k: 'connect', grp: 'prep', d: 3, name: 'Layout', desc: '30 cc of water at the bottom, piston directly above it, the rest empty. Valves closed.', fn: function () {} },
      { k: 'vac', grp: 'prep', d: 9, name: 'Evacuate gas side', desc: 'Vacuum pump on the top through its isolation valve: the sample side is evacuated and the piston rises toward the top; the 30 cc of water stays at the bottom (project logic — please review).', fn: function (s, u) {
        s.conn.top = { t: 'Vacuum pump', s: 'via isolation valve' }; s.valves.top = u > .04; s.line.top = 'vac';
        var e = ease(clamp((u - .04) / .96, 0, 1));
        s.sample = lerp(RC.TI_CAP - RC.TI_W0, RC.TI_SV_VAC, e); s.fluid = 'vac';
        if (live(u) && u > .04) s.flow.top = -1;
        s.read = [rd('Cylinder pressure', +(RC.VAC_P * e).toFixed(1), 'psig', 'ramp', 'full vacuum −14.7'), rd('Temperature', RC.LAB_T, '°C', 'project')]; } },
      { k: 'viso', grp: 'prep', d: 2.5, name: 'Isolate vacuum', desc: 'Vacuum isolation valve closed and the pump removed; top connected to the booster outlet.', fn: function (s, u) {
        s.valves.top = u < .4; if (u > .6) { s.line.top = null; s.conn.top = { t: 'Booster outlet', s: 'gas from GSP' }; } } },
      { k: 'boost', grp: 'fill', d: 13, name: 'Boost gas to 1,000 psig', desc: 'Hydraulic valve opened (pump = pressure monitor, constant volume). Gas from the GSP is boosted in at the top: the piston moves down onto the water; pressure rises to 1,000 psig.', fn: function (s, u) {
        s.valves.bot = true; s.line.bot = 'water'; s.valves.top = u > .04 && u < 1; s.line.top = 'gas';
        var a = clamp((u - .04) / .96, 0, 1), fi = clamp(a / .2, 0, 1), b = clamp((a - .2) / .8, 0, 1);
        s.sample = lerp(RC.TI_SV_VAC, RC.GAS_BOOST_V, ease(fi)); s.fluid = a > 0 ? 'gas' : 'vac';
        var P = fi < 1 ? lerp(RC.VAC_P, RC.GSP_P0, ease(fi)) : lerp(RC.GSP_P0, RC.BOOST_P, 1 - Math.pow(1 - b, 2));
        s.amt = amtAt(P, s.sample);
        if (live(u) && u > .04) s.flow.top = 1;
        s.read = [rd('Cylinder pressure', Math.round(P), 'psig', 'ramp', 'equalise with GSP, then boost'), rd('Temperature', RC.LAB_T, '°C', 'project')]; } },
      { k: 'bclose', grp: 'hold', d: 2.5, name: 'Stop booster', desc: '1,000 psig reached: titanium gas inlet closed. 300 cc of gas held at 1,000 psig.', fn: function (s, u) {
        s.valves.top = false; if (u > .5) s.line.top = null;
        s.read = [rd('Cylinder pressure', RC.BOOST_P, 'psig', 'project'), rd('Temperature', RC.LAB_T, '°C', 'project')]; } },
      { k: 'comp', grp: 'hold', d: 13, name: 'Compress 1,000 → 5,000 psig', desc: 'GAS COMPRESSION by LIQUID TRANSFER: the water pump delivers into the bottom, the piston rises and the same gas is squeezed from 300 to 69 cc.', fn: function (s, u) {
        s.sample = lerp(RC.GAS_BOOST_V, RC.GAS_TI_V, ease(u)); s.water = RC.TI_CAP - s.sample;
        if (live(u)) s.flow.bot = 1;
        s.read = [rd('Cylinder pressure', Math.round(pCharge(s.amt, s.sample)), 'psig', 'model'), rd('Water pumped in', +(s.water - RC.TI_W0).toFixed(1), 'cc', 'project'), rd('Temperature', RC.LAB_T, '°C', 'project')]; } },
      { k: 'move', grp: 'discharge', d: 3, name: 'Connect to PVT cell', desc: 'Cylinder and water pump moved to the evacuated PVT cell; top outlet to the cell inlet valve.', fn: function (s) {
        s.conn.top = { t: 'PVT cell · Pump A', s: 'evacuated, receives at 5,000 psig' };
        s.read = [rd('Cylinder pressure', RC.GAS_P, 'psig', 'project'), rd('Temperature', RC.LAB_T, '°C', 'project')]; } },
      { k: 'deliver', grp: 'discharge', d: 11, name: 'Deliver 60 cc at 5,000 psig', desc: 'Pump A retracts at 5,000 psig while the water pump pushes the piston up: 60 cc of gas leaves; 9 cc stays in the cylinder.', fn: function (s, u) {
        s.valves.top = u > .04; s.line.top = 'gas'; var v = RC.GAS_CHARGE * ease(clamp((u - .04) / .96, 0, 1));
        s.sample = RC.GAS_TI_V - v; s.water = RC.TI_CAP - s.sample; s.amt = RC.GAS_TI_V - v;
        if (live(u) && u > .04) { s.flow.top = -1; s.flow.bot = 1; }
        s.read = [rd('Cylinder pressure', RC.GAS_P, 'psig', 'project', 'constant during delivery'), rd('Gas delivered', +v.toFixed(1), 'cc', 'project'), rd('Temperature', RC.LAB_T, '°C', 'project')]; } },
      { k: 'end', grp: 'discharge', d: 2.5, name: 'Close valves', desc: '60.00 cc delivered; valves closed with 9 cc of gas left in the cylinder.', fn: function (s, u) { s.valves.top = u < .4; s.valves.bot = u < .7; } }
    ]
  };

  var TYPES = [
    { id: 'piston', name: 'Piston sample bottle', tag: 'SPS/PDS type', geom: 'piston', configs: ['wh', 'sep', 'bh', 'rc'],
      about: 'One physical design (SampleBottle.js) used for every oil sample bottle and for the recombination bottle.' },
    { id: 'gas', name: 'Separator gas bottle', tag: 'GSP', geom: 'gas', configs: ['gspField', 'gspLab'],
      about: 'Pressurised gas bottle with no piston and no water — gas only.' },
    { id: 'ti', name: 'Titanium transfer cylinder', tag: '330 cc', geom: 'ti', configs: ['ti'],
      about: 'Floating-piston cylinder used to boost and compress separator gas for recombination.' }
  ];

  /* ---------------------------------------------------------------- engine */
  Object.keys(C).forEach(function (k) {
    var c = C[k], T = 0; c.id = k;
    c.phases.forEach(function (p) { p.t0 = T; T += p.d; });
    c.T = T;
  });
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function base(c) {
    var s = clone(c.init);
    s.flow = { top: 0, bot: 0 };
    if (s.capTop == null) s.capTop = false;
    if (s.capBot == null) s.capBot = false;
    s.read = s.read || [];
    return s;
  }
  function stateAt(c, t) {
    var s = base(c), i;
    for (i = 0; i < c.phases.length; i++) {
      var p = c.phases[i];
      if (t < p.t0 && i > 0) break;
      var u = clamp((t - p.t0) / p.d, 0, 1);
      s.flow = { top: 0, bot: 0 }; s.drops = false; s.bubbles = 0;
      p.fn(s, u);
      s.phase = i; s.u = u;
      if (u < 1) break;
    }
    return enforce(s);
  }
  // physical guards: nothing flows through a closed valve or a capped port
  function enforce(s) {
    if (s.capTop) s.valves.top = false;
    if (s.capBot) s.valves.bot = false;
    ['top', 'bot'].forEach(function (k) { if (!s.valves[k]) s.flow[k] = 0; });
    return s;
  }

  window.PBConfig = { TYPES: TYPES, CONFIGS: C, stateAt: stateAt, enforce: enforce, clone: clone, SRC: SRC, RC: RC,
    pCharge: pCharge, amtAt: amtAt, N_COMP: N_COMP, OIL_IN: OIL_IN };
})();
