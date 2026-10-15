/* ============================================================================
   RecombSim — Validation · Recombination (screen key 'recomb')
   Separator samples only: Main.valMeta() lists it as the last Separator validation step.

   Native DOM + SVG module (same pattern as BottomHoleSim.js), mounted by
   Main.syncRecomb() into the host <div> of screens/showRecomb.js.

   Stages (revised 2026-09-30, v3):
     1 Connect + vacuum   GSP -> booster IN (left) ; booster OUT (right) -> titanium top (no bypass line);
                          titanium bottom -> water pump (300 cc). Titanium starts with 30 cc water, piston
                          directly above it. Vacuum pump on the titanium top via isolation valve; the gas line is
                          evacuated through the booster check valves; GSP valve stays closed.
     2 Boost              hydraulic valve opened, water pump = pressure monitor at CONSTANT volume (300 cc);
                          gas enters, booster raises it; pump + cylinder read 0 -> CFG.BOOST_P (1,000 psig here).
     3 Pressurize         water pump delivers into the titanium bottom; gas 1,000 -> 5,000 psig.
     4 Charge 60 cc gas   PVT cell evacuated first, then exactly 60 cc gas into Pump A at 5,000 psig.
     5 Gas -> bottle      40 cc (measured at 5,000 psig) delivered, Pump A 60 -> 20 cc; the 20 cc STAYS in the
                          cell (no vent). Stage 6 hides the cell with it (no draining), then an empty cell is used.
     6 Charge oil         oil bottle held at 315 psig ~2.6 s, pumped to 3,000 psig, A 100 + B 80 cc.
     7 Agitate oil        stroke = free space of the receiving pump (capacity 100 cc): 20 cc A -> B, 20 cc back;
                          4 strokes, total 180 cc throughout, ends A 100 / B 80.
     8 Oil -> bottle      water pump on the bottle water-side port (monitor, constant volume);
                          A 100 -> 1 (99) · B -> A refill (A 1 -> 81) · A 81 -> 1 (80) = 179 cc in the bottle;
                          1.00 cc stays in Pump A, cell held at 3,000 psig, sample + inlet valves closed.
     9 Mix                heating jacket (cutaway) from the start, turns with the bottle; pump raises the bottle to
                          the 5,000 psig WORKING pressure (reservoir pressure 3,000 psig shown as reference) and
                          holds it during 3 x 180 deg inversions; pump and bottle readings identical.

   ONE timeline per stage. Every drawn value is a pure function of (stage, time), so pause / resume /
   restart / stage navigation are exact and every stage starts from the end state of the stage before.

   DATA — DEMONSTRATION INPUTS (edit CFG). Specified by the user: 30 cc water, 300 cc pump, 1,000 and
   5,000 psig gas, 60 cc / 40 cc gas charges, 315 -> 3,000 psig oil, 100 + 80 cc oil, 99 + 80 cc transfers,
   100 cc pump capacity, 1 cc final residual, 5,000 psig working / 3,000 psig reservoir pressure.
   Chosen here for drawing / consistency (not validated data): titanium 330 cc, bottle 275 cc,
   oil bottle 200 cc, the 1,000 -> 5,000 psig gas volume ratio (0.23, same ratio as the
   previous version) and the gas pressure-volume path P·V^n = const derived from it. There is no separator
   GOR in the project data, so the quantities are NOT a validated recombination ratio.
   Temperature: laboratory transfer temperature (22 °C). Stage 9 heating jacket: no set point exists in the
   project data, so none is shown (CFG.JACKET_T = null; set a value to display it).
   ========================================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------------ configuration */
  var CFG = {
    GSP_P0: 315,        // psig  separator-gas source pressure (GSP)
    GSP_P1: 296,        // psig  GSP pressure after boosting (illustrative draw-down)
    VAC_P: -14.7,       // psig  full vacuum reading
    BOOST_P: 1000,      // psig  booster target in the titanium cylinder
    GAS_P: 5000,        // psig  gas pressurization / gas measurement pressure
    OIL_P0: 315,        // psig  separator-oil bottle at separator conditions
    OIL_P: 3000,        // psig  oil pressurization / oil measurement pressure
    LAB_T: 22,          // °C    laboratory transfer temperature
    TI_CAP: 330,        // cc    titanium cylinder internal volume (drawing / demonstration)
    TI_W0: 30,          // cc    water initially in the titanium cylinder
    TI_SV_VAC: 12,      // cc    sample-side volume left when the piston has risen during vacuuming (visual)
    GAS_BOOST_V: 300,   // cc    gas volume at 1,000 psig (= free space above the 30 cc water)
    GAS_TI_V: 69.0,     // cc    same gas at 5,000 psig (demonstration ratio 0.23; depends on Z-factor)
    PUMP_V0: 300,       // cc    water pump barrel at the start
    PUMP_REFILL: 300,   // cc    water pump refilled from its reservoir before the oil stage
    GAS_CHARGE: 60,     // cc    gas charged into the PVT cell at 5,000 psig
    GAS_TO_BOT: 40,     // cc    gas (measured at 5,000 psig) delivered to the Recombination Bottle
    OIL_V0: 200,        // cc    separator oil in its bottle at 315 psig (demonstration)
    OIL_COMP: 1.4,      // cc    water injected to raise the oil bottle 315 -> 3,000 psig (demonstration)
    OIL_A: 100,         // cc    oil charged into Pump A
    OIL_B: 80,          // cc    oil charged into Pump B
    OIL_A_LEFT: 1,      // cc    left in Pump A after the first measured transfer
    OIL_A_END: 1,       // cc    left in Pump A (PVT cell) after the final transfer — not sent to the bottle
    BOTTLE_CAP: 275,    // cc    Recombination / oil bottle internal volume (drawing / demonstration)
    BOT_W0: 30,         // cc    water initially in the Recombination Bottle
    CELL_CAP: 100,      // cc    PVT cell Pump A / Pump B capacity (user-specified 2026-09-30)
    WORK_P: 5000,       // psig  final recombination working pressure (bottle agitation, stage 9)
    RES_P: 3000,        // psig  reservoir pressure (reference label; = oil measurement pressure here)
    JACKET_T: null,     // °C    heating-jacket set point: NOT defined in the project data — set a number to display it
    MIX_SHRINK: 0.30,   // visual only: share of the free-gas volume lost as it dissolves (NOT reported)
    ROCK_N: 3           // 180° inversion cycles
  };
  var OIL_TOT = CFG.OIL_A + CFG.OIL_B;                       // 180
  var OIL_T1 = CFG.OIL_A - CFG.OIL_A_LEFT;                   // 99
  var OIL_T2 = CFG.OIL_A_LEFT + CFG.OIL_B - CFG.OIL_A_END;   // 80 (81 -> 1 cc)
  var OIL_IN = OIL_T1 + OIL_T2;                              // 179 cc actually delivered to the bottle
  // two-pump agitation stroke = the largest volume the RECEIVING pump can take (never above capacity):
  // A -> B limited by B's free space (100 - 80 = 20 cc) and by what A holds; B -> A returns the same volume.
  var AGIT_DV = Math.max(0, Math.min(CFG.CELL_CAP - CFG.OIL_B, CFG.OIL_A));
  var OIL_AFTER_P = CFG.OIL_V0 - CFG.OIL_COMP;               // oil in bottle once at 3,000 psig
  var PUMP_OIL0 = CFG.PUMP_REFILL - CFG.OIL_COMP - OIL_TOT;  // water pump after the oil charge
  // gas path between the two configured points (1,000 psig / 300 cc and 5,000 psig / 69 cc): P·V^n = const
  var N_COMP = Math.log(CFG.GAS_P / CFG.BOOST_P) / Math.log(CFG.GAS_BOOST_V / CFG.GAS_TI_V);
  // pressure of a gas charge q (cc measured at 5,000 psig) occupying V cc, and its volume at P
  function pCharge(q, V) { return q > 0 && V > 0 ? CFG.GAS_P * Math.pow(q / V, N_COMP) : 0; }
  function vCharge(q, P) { return q * Math.pow(CFG.GAS_P / P, 1 / N_COMP); }
  var BOT_SS = CFG.BOTTLE_CAP - CFG.BOT_W0;                  // bottle sample side before any water is added
  var P_B1 = pCharge(CFG.GAS_TO_BOT, BOT_SS);                // bottle after the 40 cc gas charge
  var P_B2 = pCharge(CFG.GAS_TO_BOT, BOT_SS - OIL_IN);       // bottle after the oil charge (no dissolution drawn)
  var G_B3 = vCharge(CFG.GAS_TO_BOT, CFG.WORK_P);            // free gas once the bottle is held at the working pressure
  var DW_B3 = (BOT_SS - OIL_IN) - G_B3;                      // water added to bring the bottle to the working pressure
  var SHRINK = CFG.MIX_SHRINK * G_B3;
  var DONE_MSG = 'Recombination complete — ' + CFG.GAS_TO_BOT + ' cc gas (' + n0g(CFG.GAS_P) + ' psig) + ' + OIL_IN + ' cc oil (' + n0g(CFG.OIL_P) + ' psig) mixed to a single phase at ' + n0g(CFG.WORK_P) + ' psig working pressure.';

  /* ------------------------------------------------------------ helpers */
  function n0g(v) { return Math.round(v).toLocaleString('en-US'); }
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var n0 = function (v) { return Math.round(v).toLocaleString('en-US'); };
  var f1 = function (v) { return (Math.round(v * 10) / 10).toFixed(1); };
  var f2 = function (v) { return (Math.round(v * 100) / 100).toFixed(2); };
  var r1 = function (v) { return Math.round(v * 10) / 10; };
  function psm() { return (typeof window.PSM === 'function') ? window.PSM() : 1; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'; }); }
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
  function pd(pts) { return pts.length < 2 ? '' : 'M' + pts.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' L'); }
  // point + direction at fraction f along a polyline
  function pat(pts, f) {
    var target = plen(pts) * clamp(f, 0, 1), acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + d >= target || i === pts.length - 1) { var k = d ? (target - acc) / d : 0;
        return { x: lerp(pts[i - 1][0], pts[i][0], k), y: lerp(pts[i - 1][1], pts[i][1], k), a: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) * 180 / Math.PI }; }
      acc += d;
    }
    return { x: pts[0][0], y: pts[0][1], a: 0 };
  }

  /* fluid colours (fixed in both themes, like every fluid in the app) */
  var FL = {
    gas: { line: '#5cc79a', dash: '#e9fff4', name: 'Separator gas' },
    oil: { line: '#d8973a', dash: '#fff1cf', name: 'Separator oil' },
    water: { line: '#4a93c9', dash: '#dff1ff', name: 'Hydraulic water' },
    air: { line: '#aab6c6', dash: '#ffffff', name: 'Air' },
    vac: { line: '#56637a', dash: '#dfe6f0', name: 'Vacuum' }
  };
  function pf(P) { return P < -0.05 ? '−' + f1(-P) : n0(P > 0 ? P : 0); }        // pressure text (vacuum shown to 0.1)

  /* ------------------------------------------------------------ geometry (svg units) */
  var VB = '20 98 1170 548';
  var SLOT_X = 430, PORT_Y = 190;           // connection slot at the PVT cell (titanium / bottles), top port level
  var A_TI_X = 820, A_PUMP_X = 560;         // stage 1-3 positions
  var B_PUMP_X = 70;                        // water pump position beside the PVT cell
  var PUMP_Y = 470, PUMP_W = 180, PUMP_H = 132, PUMP_PORT_Y = 560;
  var GSP_X = 130;
  // vertical air-driven booster: air drive on top, gas head below; gas IN on the left wall, OUT on the right wall
  var BOO = { x: 430, inX: 380, outX: 480, portY: 330, riseX: 300, dropX: 600, vIn: 215, vOut: 700 };
  var CELL_S = 1.18;                        // PVT cell drawing (Direct Density / DL coordinates) scaled + placed
  var CELL_T = 'translate(' + r1(800 - 806 * CELL_S) + ',' + r1(120 - 150 * CELL_S) + ') scale(' + CELL_S + ')';
  var CW = function (x, y) { return [x * CELL_S + 800 - 806 * CELL_S, y * CELL_S + 120 - 150 * CELL_S]; };
  var CELL_IN = CW(790, 190);               // manifold end outside the frame (world)
  var CELL_VALVE_X = 748;
  var PXC = 182 / CFG.CELL_CAP;             // px per cc in the cell pump bore (local): 182 px = 105 cc
  var BOT_S = 1.1;                          // sample bottle scale
  var BOT_PX = 192 / CFG.BOTTLE_CAP;        // bottle: px per cc (192 px usable stroke)
  var TI = { top: 190, ch0: 246, ch1: 554, pist: 10 };
  var TI_PX = (TI.ch1 - TI.ch0 - TI.pist) / CFG.TI_CAP;
  var STAND = { x: 500, py: 372 };          // inversion stand pivot (stage 9) = bottle body centre
  var PIV_DY = (236 - 74) * BOT_S;          // top port -> body centre of the bottle
  var VACP = {                              // vacuum pump placements
    ti: { x: 880, y: 127, pts: [[880, 152], [A_TI_X, 152]], vx: 852, vy: 152, h: true },
    cell: { x: 612, y: 252, pts: null, vx: 667, vy: 222, h: false }
  };
  VACP.cell.pts = [[667, 252], [667, CELL_IN[1]], CELL_IN];

  /* ------------------------------------------------------------ stages */
  var STAGES = [
    { n: 'Connect & vacuum', t: 'Connect the gas boosting system and evacuate', sub: [
      { k: 'layout', d: 2.8, q: 'Equipment in place. Titanium cylinder: 30 cc of water at the bottom, piston directly above it, the rest empty. Water pump: 300 cc. All valves closed.' },
      { k: 'c1', d: 2.2, q: 'Connect the GSP outlet to the booster gas inlet.' },
      { k: 'c2', d: 2.2, q: 'Connect the booster outlet to the titanium cylinder sample (gas) side at the top.' },
      { k: 'c3', d: 2.2, q: 'Connect the titanium hydraulic (water) side at the bottom to the water pump.' },
      { k: 'vbring', d: 2.6, q: 'A vacuum pump is placed behind the titanium cylinder and connected to its top through an isolation valve.' },
      { k: 'vopen', d: 2.4, q: 'Open the vacuum isolation valve, the titanium top valve and the booster inlet and outlet valves. The GSP valve stays CLOSED.' },
      { k: 'evac', d: 9, q: 'Vacuum pump running: the titanium sample side and the gas line (through the booster) are evacuated. The piston rises toward the top; the 30 cc of water stays at the bottom.' },
      { k: 'vclose', d: 2.4, q: 'Vacuum complete: close the vacuum isolation valve. The pump stops.' },
      { k: 'vremove', d: 2.6, q: 'Disconnect and remove the vacuum pump. The gas pathway is left under vacuum.' },
      { k: 'chk', d: 2.0, q: 'Ready for boosting: sample side under vacuum, GSP valve closed, hydraulic valve closed.' } ] },
    { n: 'Boost', t: 'Boost gas into the titanium cylinder', sub: [
      { k: 'start', d: 2.4, q: 'Open the titanium hydraulic valve: the water pump (volume fixed) now reads the cylinder pressure. Air supply on.' },
      { k: 'fill', d: 2.6, q: 'Open the GSP valve: boosting begins. Gas flows GSP → booster inlet → booster outlet → titanium top; the piston moves down onto the water.' },
      { k: 'boost', d: 13, q: 'The booster draws gas in, compresses it with each stroke and discharges it to the titanium cylinder. The water pump reads the pressure rising to ' + n0g(CFG.BOOST_P) + ' psig; its volume does not change.' },
      { k: 'stop', d: 2.6, q: n0g(CFG.BOOST_P) + ' psig reached: stop the booster, close the titanium gas inlet, the booster valves and the GSP valve. The pump reading holds at ' + n0g(CFG.BOOST_P) + ' psig.' } ] },
    { n: 'Pressurize 5,000', t: 'Pressurize the titanium gas to 5,000 psig', sub: [
      { k: 'set', d: 2.4, q: 'Start: 300 cc water in the pump, 30 cc water in the titanium cylinder, gas at 1,000 psig. The hydraulic valve is already open: the pump switches from monitoring to delivering.' },
      { k: 'comp', d: 13, q: 'The water pump delivers water into the bottom of the titanium cylinder: the piston rises and the gas is compressed from 1,000 to 5,000 psig.' },
      { k: 'hold', d: 2.2, q: 'Gas held at 5,000 psig: the same gas in a smaller volume.' } ] },
    { n: 'Charge 60 cc gas', t: 'Vacuum the PVT cell and charge 60 cc of gas', sub: [
      { k: 'move', d: 3.4, q: 'Move the isolated titanium cylinder, with its water pump, to the PVT cell. The receiving cell is empty.' },
      { k: 'vconn', d: 2.4, q: 'Connect a vacuum pump to the cell inlet line through its isolation valve.' },
      { k: 'evac', d: 7, q: 'Open the vacuum valve, the cell inlet valve and the Pump A / Pump B valves: the empty cell is evacuated.' },
      { k: 'vclose', d: 2.2, q: 'Close the vacuum isolation valve and the cell valves. The cell stays under vacuum.' },
      { k: 'vremove', d: 2.4, q: 'Disconnect and remove the vacuum pump.' },
      { k: 'conn', d: 2.2, q: 'Connect the titanium sample outlet (top) to the cell inlet valve.' },
      { k: 'open', d: 2.4, q: 'Open the titanium outlet, the cell inlet valve and the Pump A valve: gas fills the evacuated line and the cell reads 5,000 psig.' },
      { k: 'xfer', d: 10, q: 'Pump A retracts at 5,000 psig while the water pump pushes the gas out: the cell volume rises toward 60 cc.' },
      { k: 'close', d: 2.4, q: '60.00 cc reached: the transfer stops automatically. Close the valves; 9 cc of gas stays in the titanium cylinder.' },
      { k: 'rec', d: 2.2, q: 'Record the gas charge: 60.00 cc at 5,000 psig and 22 °C.' } ] },
    { n: 'Gas → bottle', t: 'Transfer 40 cc of gas into the Recombination Bottle', sub: [
      { k: 'swap', d: 3.2, q: 'Remove the titanium cylinder and water pump. Bring the Recombination Bottle: 30 cc water, piston directly above it, sample side empty.' },
      { k: 'conn', d: 2.2, q: 'Connect the cell outlet to the bottle sample valve (top). The bottle hydraulic valve stays closed.' },
      { k: 'open', d: 2.2, q: 'Open the Pump A valve, the cell inlet valve and the bottle sample valve. Pump A holds 5,000 psig.' },
      { k: 'xfer', d: 10, q: 'Pump A advances at constant 5,000 psig: 60 → 20 cc. Gas enters above the bottle piston; the water stays below it.' },
      { k: 'close', d: 2.4, q: '40.00 cc delivered (measured at 5,000 psig): the transfer stops automatically. Close the valves; the bottle is isolated.' },
      { k: 'keep', d: 2.6, q: 'The remaining 20 cc stays in Pump A at 5,000 psig. It is not used for the recombination.' } ] },
    { n: 'Charge oil', t: 'Pressurize and charge the separator oil', sub: [
      { k: 'bring', d: 3.8, q: 'Bottle set aside; the PVT cell leaves view with its unused 20 cc and an empty cell is set in place. Bring the oil bottle and connect it to the water pump (300 cc).' },
      { k: 'wait', d: 2.6, q: 'Connected. The oil is still at 315 psig — the pump has not started yet.' },
      { k: 'press', d: 8, q: 'Pumping: water enters behind the oil-bottle piston and the oil pressure rises from 315 to 3,000 psig.' },
      { k: 'stab', d: 2.2, q: 'Pump stopped: oil stable at 3,000 psig.' },
      { k: 'conn', d: 2.2, q: 'Connect the oil bottle sample outlet (top) to the cell inlet valve.' },
      { k: 'xferA', d: 9, q: 'Open the valves: 100 cc of oil is charged into Pump A at 3,000 psig.' },
      { k: 'xferB', d: 8, q: 'Close the Pump A valve, open Pump B: 80 cc of oil is charged into Pump B.' },
      { k: 'close', d: 2.2, q: 'Charge complete: 180 cc (A 100 + B 80). Close the bottle and cell valves.' } ] },
    { n: 'Agitate oil', t: 'Agitate the oil between Pump A and Pump B', sub: [
      { k: 'open', d: 2.4, q: 'Open the Pump A and Pump B valves. Capacity ' + CFG.CELL_CAP + ' cc per pump: Pump B has ' + AGIT_DV + ' cc free, so each stroke moves ' + AGIT_DV + ' cc.' },
      { k: 's1', d: 6.5, q: 'Stroke 1: ' + AGIT_DV + ' cc from Pump A to Pump B (A ' + CFG.OIL_A + ' → ' + (CFG.OIL_A - AGIT_DV) + ', B ' + CFG.OIL_B + ' → ' + (CFG.OIL_B + AGIT_DV) + ').' },
      { k: 's2', d: 6.5, q: 'Stroke 2: ' + AGIT_DV + ' cc back from Pump B to Pump A (A ' + (CFG.OIL_A - AGIT_DV) + ' → ' + CFG.OIL_A + ', B ' + (CFG.OIL_B + AGIT_DV) + ' → ' + CFG.OIL_B + ').' },
      { k: 's3', d: 6.5, q: 'Stroke 3: A → B, ' + AGIT_DV + ' cc (B reaches its ' + CFG.CELL_CAP + ' cc capacity).' },
      { k: 's4', d: 6.5, q: 'Stroke 4: B → A, ' + AGIT_DV + ' cc. Pump A ' + CFG.OIL_A + ' cc, Pump B ' + CFG.OIL_B + ' cc; total ' + OIL_TOT + ' cc throughout.' },
      { k: 'stab', d: 3.4, q: 'Hold at 3,000 psig until the readings are stable.' },
      { k: 'rec', d: 2.2, q: 'Record the oil charge: Pump A 100 cc + Pump B 80 cc = 180 cc at 3,000 psig and 22 °C.' } ] },
    { n: 'Oil → bottle', t: 'Transfer the oil into the bottle', sub: [
      { k: 'swap', d: 3.2, q: 'Bring back the Recombination Bottle, still holding the 40 cc gas charge, and the water pump.' },
      { k: 'conn', d: 2.4, q: 'Connect the cell outlet to the bottle sample valve (top) and the bottle water-side port (bottom) to the water pump.' },
      { k: 'open', d: 2.4, q: 'Open the bottle hydraulic valve: the pump reads the bottle pressure. Open the Pump A valve, the cell inlet valve and the bottle sample valve; the cell is held at 3,000 psig.' },
      { k: 'x1', d: 9, q: 'First measured transfer: Pump A advances from 100 cc toward 1 cc; oil enters the bottle.' },
      { k: 'p1', d: 2.2, q: 'Stop with 1 cc in Pump A and close the bottle valve. Recorded: 100 − 1 = 99 cc.' },
      { k: 'refill', d: 7, q: 'Refill Pump A from Pump B: open the Pump B valve and move all 80 cc (A 1 → 81, B 80 → 0). The bottle keeps its 99 cc.' },
      { k: 'p2', d: 1.8, q: 'Close the Pump B valve and reopen the bottle sample valve.' },
      { k: 'x2', d: 8, q: 'Second measured transfer: Pump A advances from 81 cc and stops with 1 cc left in the cell.' },
      { k: 'close', d: 2.6, q: 'Close the bottle sample valve and the cell inlet valve; Pump A holds the 1 cc at 3,000 psig. Recorded: 81 − 1 = 80 cc. Oil in the bottle = 99 + 80 = 179 cc.' } ] },
    { n: 'Mix', t: 'Agitate the Recombination Bottle (180° inversion)', sub: [
      { k: 'mount', d: 3.4, q: 'The heating jacket is fitted around the bottle and switched on. Mount the bottle on the inversion stand; its water side stays on the water pump through the flexible line.' },
      { k: 'press', d: 5.0, q: 'The water pump raises the bottle gradually from its current pressure to the ' + n0g(CFG.WORK_P) + ' psig working pressure.' },
      { k: 'rock', d: 24, q: 'Invert the bottle slowly 0° → 180° → 0° inside the heating jacket: gas bubbles disperse through the oil and go into solution. The pump holds ' + n0g(CFG.WORK_P) + ' psig.' },
      { k: 'settle', d: 3.4, q: 'Stop agitating. The last free gas disappears and the pressure settles at ' + n0g(CFG.WORK_P) + ' psig.' },
      { k: 'done', d: 1.6, q: 'Recombination complete: uniform single-phase sample at ' + n0g(CFG.WORK_P) + ' psig working pressure (reservoir pressure ' + n0g(CFG.RES_P) + ' psig).' } ] }
  ];
  STAGES.forEach(function (s) { var T = 0; s.starts = s.sub.map(function (x) { var a = T; T += x.d; return a; }); s.T = T; });
  var NS = STAGES.length;

  /* Explain text per stage (why / what changes / what to watch) */
  var EX = [
    { w: 'Air and moisture must be removed from the titanium cylinder and the gas line before separator gas is boosted in, so only separator gas is collected.',
      e: 'Gas route: GSP → booster → titanium sample side (top); hydraulic route: titanium water side (bottom) → water pump. The titanium cylinder starts with 30 cc of water, the piston directly above it and the rest empty; the pump holds 300 cc. The vacuum pump is connected to the titanium top through an isolation valve; the titanium top valve and the booster inlet and outlet valves are opened while the GSP valve stays closed; the gas line is evacuated through the booster. During evacuation the piston is drawn up toward the top (educational depiction); the 30 cc of water stays at the bottom. Then the vacuum valve is closed and the pump removed.',
      o: 'GSP valve CLOSED throughout, the pressure reaching vacuum, the piston rising while the water stays at 30 cc, and the vacuum pump being isolated before removal.' },
    { w: 'The booster raises low-pressure separator gas to 1,000 psig in the titanium cylinder.',
      e: 'Gas route: GSP → booster inlet (left) → booster outlet (right) → titanium top. The titanium hydraulic valve is opened and the water pump is held at constant volume, so it acts as the pressure monitor. When the GSP valve opens, gas enters above the piston and the piston moves down onto the 30 cc of water. The air-driven booster then cycles: on each intake stroke gas enters the compression chamber through the inlet check valve, the plunger compresses it, and it leaves through the outlet check valve to the titanium cylinder. The pump pressure rises from 0 to ' + n0g(CFG.BOOST_P) + ' psig (the target for this run) while its volume, 300 cc, does not change.',
      o: 'Gas entering, compressed and leaving the booster chamber in step with its piston; the pump and cylinder pressures rising together to ' + n0g(CFG.BOOST_P) + ' psig; the pump volume staying at 300.00 cc.' },
    { w: 'Hydraulic water compresses the collected gas to 5,000 psig before the measured charge.',
      e: 'The stage starts with 300 cc of water in the pump, 30 cc in the titanium cylinder and the gas at 1,000 psig. The gas inlet stays closed. The water pump delivers water into the bottom: the piston rises, the gas volume falls and the pressure rises to 5,000 psig. The water leaving the pump equals the water gained by the cylinder.',
      o: 'Pump volume falling while titanium water rises, the piston moving up, and pressure 1,000 → 5,000 psig.' },
    { w: 'The empty PVT cell is evacuated so the gas charge is not contaminated, then exactly 60 cc of gas is charged at 5,000 psig.',
      e: 'A vacuum pump on the cell inlet line evacuates the empty cell; its valve is closed and the pump removed before the titanium cylinder is connected. Pump A retracts at constant 5,000 psig while the water pump pushes the gas out of the titanium cylinder. The transfer stops automatically at 60.00 cc; 9 cc of gas stays in the titanium cylinder.',
      o: 'Cell pressure going to vacuum, then 5,000 psig; Pump A volume rising and stopping exactly at 60.00 cc.' },
    { w: 'Only 40 cc of the measured gas (at 5,000 psig and 22 °C) goes into the Recombination Bottle.',
      e: 'The bottle starts with 30 cc water, the piston directly above it and an empty sample side. Pump A advances at constant 5,000 psig from 60 to 20 cc, so 40 cc at measurement conditions leaves the cell. In the bottle the gas expands to fill the sample side above the piston at a much lower pressure — the charge is recorded at its measurement conditions, not as the volume it occupies in the bottle. The remaining 20 cc stays in Pump A and is not used; the cell is taken out of view with it at the start of the next stage.',
      o: 'Pump A 60 → 20 cc at 5,000 psig, the bottle pressure rising only to about ' + n0(P_B1) + ' psig, water staying below the piston.' },
    { w: 'The separator oil is raised from separator pressure to 3,000 psig and charged into Pump A and Pump B.',
      e: 'After the hydraulic connection, the oil pressure stays at 315 psig for a moment; then the water pump starts and raises it to 3,000 psig (only a small water volume is needed because oil is nearly incompressible). With the bottle stable at 3,000 psig, 100 cc is charged into Pump A and 80 cc into Pump B. The cell used here is empty: the earlier cell, holding the unused 20 cc of gas, was taken out of view at the start of this stage.',
      o: 'Pressure held at 315 psig after connection, then rising gradually to 3,000 psig; the pumps filling to 100 and 80 cc.' },
    { w: 'The oil is agitated between the two pumps before its volume is accepted.',
      e: 'Each stroke moves the largest volume the receiving pump can take. Capacity is ' + CFG.CELL_CAP + ' cc per pump: with A ' + CFG.OIL_A + ' / B ' + CFG.OIL_B + ' cc, Pump B has ' + AGIT_DV + ' cc free, so ' + AGIT_DV + ' cc moves A → B (A ' + (CFG.OIL_A - AGIT_DV) + ', B ' + (CFG.OIL_B + AGIT_DV) + ') and the same ' + AGIT_DV + ' cc returns B → A. The total stays ' + OIL_TOT + ' cc, neither pump exceeds ' + CFG.CELL_CAP + ' cc, and the pressure stays at 3,000 psig. The agitation ends with Pump A ' + CFG.OIL_A + ' cc and Pump B ' + CFG.OIL_B + ' cc.',
      o: 'Oil moving through the connecting line in the stroke direction, the pistons moving in opposite directions, and the total staying ' + OIL_TOT + ' cc.' },
    { w: 'Transferred oil = initial − final pump volume for each transfer.',
      e: 'The bottle water side is connected to the water pump, which reads the bottle pressure at constant volume. First transfer: Pump A 100 → 1 cc = 99 cc into the bottle. Refill: the bottle valve is closed and Pump B moves its 80 cc into Pump A (A 1 → 81, B 80 → 0) — nothing goes to the bottle. Second transfer: Pump A 81 → 1 cc = 80 cc; 1 cc stays in the cell. Oil in the bottle = 99 + 80 = 179 cc. The transfer ends with the bottle sample valve and cell inlet valve closed and Pump A holding 3,000 psig. In the bottle the oil settles on the piston and compresses the gas above it.',
      o: 'Pump readings, flow direction, the 1.00 cc left in Pump A, the bottle pressure on the water pump, and the transfer record table.' },
    { w: 'Inverting the bottle makes the oil travel through the gas so the gas disperses and dissolves at 3,000 psig.',
      e: 'A heating jacket is fitted around the bottle from the start (cutaway view, so the sample stays visible) and turns with it. The water pump stays connected to the bottle water side through the flexible line and raises the pressure gradually from its current value to the ' + n0g(CFG.WORK_P) + ' psig working pressure, then holds it. This is the recombination working pressure, not the reservoir pressure (' + n0g(CFG.RES_P) + ' psig). The bottle turns slowly 0° → 180° → 0°; gas bubbles disperse through the oil and shrink as they go into solution. As gas dissolves the piston moves and the pump advances to keep the pressure; the reading dips slightly and settles. The final volume is not the sum of gas and oil and is not reported. Agitation alone does not prove the reservoir-fluid composition has been reproduced.',
      o: 'The jacket turning with the bottle, bubbles reducing, the piston moving, and the pump and bottle both reading ' + n0g(CFG.WORK_P) + ' psig.' }
  ];

  /* ------------------------------------------------------------ state */
  function line(c) { return { part: 0, c: c || null, flow: 0, a: 1 }; }
  function baseWorld(k) {
    var w = {
      gsp: { P: CFG.GSP_P0, open: false, a: 1 },
      boo: { run: false, air: false, a: 1, env: 0, vin: false, vout: false, gas: false },
      vac: { a: 0, at: 'ti', run: false, open: false, dx: 0, lvl: 0 },
      ti: { x: A_TI_X, sv: CFG.TI_CAP - CFG.TI_W0, water: CFG.TI_W0, gas: false, P: 0, top: false, bot: false, a: 1 },
      pump: { x: A_PUMP_X, P: 0, V: CFG.PUMP_V0, mode: 'IDLE', a: 1 },
      cell: { a: 0, A: 0, Af: null, B: 0, P: 0, valve: false, aV: false, bV: false, man: null, manSeg: null, manDir: 0, stab: 0 },
      bot: { kind: null, x: SLOT_X, y: PORT_Y, a: 0, water: CFG.BOT_W0, q: 0, oil: 0, P: 0, top: false, bv: false, mix: 0, ang: 0, drops: false },
      stand: 0, agCard: 0, rockCard: 0, xfCard: 0, summary: 0, hose: false, jacket: 0, heat: false,
      L: { gas1: line(), gas2: line(), hyd: { part: 0, c: 'water', flow: 0, a: 1, to: 'ti' }, cellL: line(), vacL: line('vac') },
      rec: { gas: false, bot: false, oil: false, oilBot: false },
      xf: { s1: 0, s2: 0, s3: 0 }, hl: null, stroke: 0, strokeDir: 0, cyc: 0, rockP: 0, pSet: false
    };
    if (k >= 1) {          // after connect + vacuum
      w.L.gas1.part = w.L.gas2.part = w.L.hyd.part = 1;
      w.L.gas1.c = w.L.gas2.c = 'vac';
      w.ti.sv = CFG.TI_SV_VAC; w.ti.P = CFG.VAC_P; w.ti.top = true; w.boo.vin = w.boo.vout = true;
    }
    if (k >= 2) {          // after boosting to 1,000 psig
      w.gsp.P = CFG.GSP_P1; w.ti.sv = CFG.GAS_BOOST_V; w.ti.gas = true; w.ti.P = CFG.BOOST_P; w.ti.top = false;
      w.boo.vin = w.boo.vout = false; w.boo.gas = true; w.L.gas1.c = w.L.gas2.c = 'gas';
      w.ti.bot = true; w.pump.P = CFG.BOOST_P; w.pump.mode = 'MONITOR · FIXED VOL.';   // pump monitors at constant volume
    }
    if (k >= 3) {          // after pressurizing to 5,000 psig
      w.ti.sv = CFG.GAS_TI_V; w.ti.water = CFG.TI_CAP - CFG.GAS_TI_V; w.ti.P = CFG.GAS_P; w.ti.bot = true;
      w.pump.V = CFG.PUMP_V0 - (w.ti.water - CFG.TI_W0); w.pump.P = CFG.GAS_P; w.pump.mode = 'HOLD 5,000 psig';
    }
    if (k >= 4) {          // after the 60 cc gas charge
      w.gsp.a = 0; w.boo.a = 0; w.L.gas1.a = w.L.gas2.a = 0;
      w.ti.x = SLOT_X; w.ti.sv -= CFG.GAS_CHARGE; w.ti.water += CFG.GAS_CHARGE; w.pump.x = B_PUMP_X; w.pump.V -= CFG.GAS_CHARGE;
      w.cell.a = 1; w.cell.A = CFG.GAS_CHARGE; w.cell.Af = 'gas'; w.cell.P = CFG.GAS_P; w.cell.stab = 1;
      w.L.cellL.part = 1; w.L.cellL.c = 'gas'; w.rec.gas = true;
    }
    if (k >= 5) {          // after 40 cc to the bottle; the unused 20 cc stays in Pump A (no vent)
      w.ti.a = 0; w.pump.a = 0; w.L.hyd.part = 0;
      w.bot.kind = 'recomb'; w.bot.a = 1; w.bot.q = CFG.GAS_TO_BOT; w.bot.P = P_B1;
      w.cell.A = CFG.GAS_CHARGE - CFG.GAS_TO_BOT; w.cell.Af = 'gas'; w.cell.P = CFG.GAS_P; w.rec.bot = true;
    }
    if (k >= 6) {          // after the oil charge (A 100 + B 80)
      w.bot.kind = 'oil'; w.bot.q = 0; w.bot.oil = OIL_AFTER_P - OIL_TOT; w.bot.water = CFG.BOTTLE_CAP - w.bot.oil; w.bot.P = CFG.OIL_P; w.bot.bv = true;
      w.pump.a = 1; w.pump.V = PUMP_OIL0; w.pump.P = CFG.OIL_P; w.pump.mode = 'HOLD 3,000 psig'; w.L.hyd.part = 1; w.L.hyd.to = 'bot';
      w.cell.A = CFG.OIL_A; w.cell.B = CFG.OIL_B; w.cell.Af = 'oil'; w.cell.P = CFG.OIL_P; w.cell.stab = .35; w.L.cellL.c = 'oil';
    }
    if (k >= 7) {          // after agitation between the pumps
      w.bot.a = 0; w.pump.a = 0; w.L.cellL.part = 0; w.L.hyd.part = 0; w.rec.oil = true; w.cell.stab = 1;
    }
    if (k >= 8) {          // after the two oil transfers (1 cc left in Pump A); bottle water side on the water pump
      w.bot.kind = 'recomb'; w.bot.a = 1; w.bot.q = CFG.GAS_TO_BOT; w.bot.oil = OIL_IN; w.bot.water = CFG.BOT_W0; w.bot.P = P_B2; w.bot.bv = true;
      w.cell.A = CFG.OIL_A_END; w.cell.B = 0; w.cell.Af = 'oil'; w.cell.P = CFG.OIL_P; w.cell.aV = true; w.L.cellL.part = 1; w.L.cellL.c = 'oil';
      w.pump.a = 1; w.pump.x = B_PUMP_X; w.pump.V = PUMP_OIL0; w.pump.P = P_B2; w.pump.mode = 'MONITOR · FIXED VOL.';
      w.L.hyd.part = 1; w.L.hyd.to = 'bot'; w.L.hyd.a = 1; w.hose = true;
      w.xf.s1 = w.xf.s2 = w.xf.s3 = 1; w.xfCard = 1; w.rec.oilBot = true;
    }
    return w;
  }

  var STAGE_FN = [
    /* 1 connect + vacuum */
    function (w, pr, key) {
      w.L.gas1.part = ease(pr('c1')); w.L.gas2.part = ease(pr('c2')); w.L.hyd.part = ease(pr('c3'));
      var vb = pr('vbring'), vo = pr('vopen'), ev = pr('evac'), vc = pr('vclose'), vr = pr('vremove');
      w.vac.at = 'ti';
      w.vac.a = vr > 0 ? 1 - smooth(vr * 1.3) : smooth(vb * 1.8);
      w.vac.dx = vr > 0 ? 70 * smooth(vr) : 70 * (1 - smooth(vb * 1.5));
      w.L.vacL.part = vr > 0 ? 1 - ease(clamp(vr * 2, 0, 1)) : ease(clamp((vb - .45) / .55, 0, 1));
      var on = vo > .3;
      w.vac.open = on && vc < .4; w.ti.top = on; w.boo.vin = w.boo.vout = on;
      w.vac.run = (ev > 0 && ev < 1) || (vo > .7 && ev === 0);
      var e = ease(ev);
      w.ti.P = CFG.VAC_P * e; w.vac.lvl = e;
      w.ti.sv = lerp(CFG.TI_CAP - CFG.TI_W0, CFG.TI_SV_VAC, e);
      var c = on ? 'vac' : null, fl = ev > 0 && ev < 1 ? 1 : 0;
      w.L.gas1.c = w.L.gas2.c = c; w.L.gas1.flow = w.L.gas2.flow = fl; w.L.vacL.flow = -fl;
      w.pump.mode = 'IDLE · 300 cc';
      w.hl = key === 'c1' ? ['gsp', 'boo'] : key === 'c2' ? ['boo', 'ti'] : key === 'c3' ? ['ti', 'pump'] : key === 'vbring' ? ['vac'] : null;
    },
    /* 2 boost gas into the titanium cylinder (1,000 psig) */
    function (w, pr, key) {
      var st = pr('start'), fi = pr('fill'), b = pr('boost'), s = pr('stop');
      var running = st > .4 && s < .3;
      w.boo.run = w.boo.air = running;
      w.boo.env = st > 0 && s < .5 ? smooth((st - .3) / .7) * (1 - smooth(s * 2.2)) : 0;
      w.boo.vin = w.boo.vout = s < .6; w.ti.top = s < .45;
      w.gsp.open = fi > 0 && s < .6;
      w.boo.gas = fi > 0;
      var e1 = 1 - Math.pow(1 - fi, 3);                            // quick descent, visibly animated
      w.ti.gas = fi > 0; w.ti.sv = lerp(CFG.TI_SV_VAC, CFG.GAS_BOOST_V, e1);
      // one continuous pressure path: equalization with the GSP during 'fill', then the booster raises it
      // to the run's configured target (CFG.BOOST_P) with a decelerating rise that stops exactly on target
      var P0 = CFG.GSP_P0;                                          // equalized with the GSP when boosting takes over
      w.ti.P = fi < 1 ? lerp(CFG.VAC_P, P0, e1) : lerp(P0, CFG.BOOST_P, 1 - Math.pow(1 - clamp(b, 0, 1), 2));
      w.gsp.P = CFG.GSP_P0 - (CFG.GSP_P0 - CFG.GSP_P1) * b;
      var c = fi > 0 ? 'gas' : 'vac';
      w.L.gas1.c = w.L.gas2.c = c;
      var fl = fi > 0 && b < 1 && running ? 1 : 0;
      w.L.gas1.flow = w.L.gas2.flow = fl;
      // water pump = pressure monitor on the titanium water side: hydraulic valve open, volume held constant
      var mon = st > .35;
      w.ti.bot = mon;
      w.pump.V = CFG.PUMP_V0; w.ti.water = CFG.TI_W0;
      w.pump.P = mon ? Math.max(0, w.ti.P) : 0;
      w.pump.mode = !mon ? 'IDLE · VALVE CLOSED' : 'MONITOR · FIXED VOL.';
      w.hl = key === 'fill' ? ['ti'] : null;
    },
    /* 3 pressurize the titanium gas 1,000 -> 5,000 psig */
    function (w, pr) {
      var se = pr('set'), c = pr('comp'), e = ease(c);
      w.ti.bot = true;                                             // opened in stage 2 (pump was monitoring)
      var P = CFG.BOOST_P + (CFG.GAS_P - CFG.BOOST_P) * e;
      var sv = c >= 1 ? CFG.GAS_TI_V : CFG.GAS_BOOST_V * Math.pow(CFG.BOOST_P / P, 1 / N_COMP);
      w.ti.P = P; w.ti.sv = sv; w.ti.water = CFG.TI_CAP - sv;
      w.pump.V = CFG.PUMP_V0 - (w.ti.water - CFG.TI_W0);
      w.pump.P = P;
      w.pump.mode = c > 0 && c < 1 ? 'DELIVERING · COMPRESS' : c >= 1 ? 'HOLD 5,000 psig' : se > .45 ? 'SET: DELIVER' : 'MONITOR · FIXED VOL.';
      w.L.hyd.flow = c > 0 && c < 1 ? -1 : 0;
    },
    /* 4 vacuum the PVT cell, then charge exactly 60 cc of gas */
    function (w, pr, key) {
      var mv = pr('move'), m = ease(mv), vc = pr('vconn'), ev = pr('evac'), vcl = pr('vclose'), vr = pr('vremove');
      var cn = pr('conn'), op = pr('open'), x = pr('xfer'), cl = pr('close'), rc = pr('rec');
      w.gsp.a = w.boo.a = clamp(1 - mv * 2.2, 0, 1); w.L.gas1.a = w.L.gas2.a = clamp(1 - mv * 4, 0, 1);
      w.cell.a = clamp(mv * 1.6 - .3, 0, 1);
      w.ti.x = lerp(A_TI_X, SLOT_X, m); w.pump.x = lerp(A_PUMP_X, B_PUMP_X, m);
      // vacuum on the empty cell
      w.vac.at = 'cell';
      w.vac.a = vr > 0 ? 1 - smooth(vr * 1.3) : smooth(vc * 1.8);
      w.vac.dx = vr > 0 ? 70 * smooth(vr) : 70 * (1 - smooth(vc * 1.5));
      w.L.vacL.part = vr > 0 ? 1 - ease(clamp(vr * 2, 0, 1)) : ease(clamp((vc - .45) / .55, 0, 1));
      var vOpen = ev > 0 && vcl < .4;
      w.vac.open = vOpen; w.vac.run = ev > 0 && ev < 1; w.vac.lvl = ease(ev);
      var fl = ev > 0 && ev < 1 ? 1 : 0;
      w.L.vacL.c = vc >= 1 && ev > 0 ? 'vac' : null; w.L.vacL.flow = -fl;
      // gas charge
      w.L.cellL.part = ease(cn);
      var open = op > .35 && cl < .45;
      w.ti.top = open; w.cell.valve = vOpen || open; w.cell.aV = vOpen || open; w.cell.bV = vOpen;
      w.cell.P = op > .35 ? CFG.GAS_P : CFG.VAC_P * ease(ev);
      var moved = CFG.GAS_CHARGE * x;
      w.ti.sv = CFG.GAS_TI_V - moved; w.ti.water = CFG.TI_CAP - w.ti.sv;
      w.cell.A = moved; w.cell.Af = op > .35 ? 'gas' : null;
      w.pump.V = CFG.PUMP_V0 - (CFG.TI_CAP - CFG.GAS_TI_V - CFG.TI_W0) - moved;
      w.pump.mode = x > 0 && x < 1 ? 'DELIVERING · 5,000 psig' : 'HOLD 5,000 psig';
      w.L.cellL.c = op > .35 ? 'gas' : null;
      var fx = x > 0 && x < 1;
      w.L.cellL.flow = fx ? 1 : 0; w.L.hyd.flow = fx ? -1 : 0;
      w.cell.man = fl ? 'vac' : op > .35 ? 'gas' : null; w.cell.manSeg = fl ? 'all' : 'out'; w.cell.manDir = fl ? -1 : fx ? 1 : 0;
      w.cell.stab = x < 1 ? 0 : smooth(cl);
      w.rec.gas = rc > .4;
      w.hl = mv > 0 && mv < 1 ? ['ti', 'pump'] : key === 'vconn' ? ['vac'] : rc > 0 && rc < 1 ? ['cell'] : null;
    },
    /* 5 deliver 40 cc (measured at 5,000 psig) to the Recombination Bottle; the other 20 cc stays in Pump A */
    function (w, pr) {
      var sw = pr('swap'), cn = pr('conn'), op = pr('open'), x = pr('xfer'), cl = pr('close');
      w.ti.a = clamp(1 - sw * 2.4, 0, 1); w.ti.x = SLOT_X - 70 * smooth(sw * 2);
      w.pump.a = clamp(1 - sw * 2.4, 0, 1); w.L.hyd.a = w.pump.a;
      w.bot.kind = 'recomb'; w.bot.a = clamp(sw * 2.2 - 1.1, 0, 1); w.bot.y = PORT_Y + 40 * (1 - smooth(sw * 2 - 1));
      w.L.cellL.part = sw > 0 ? (sw < 1 ? clamp(1 - sw * 3, 0, 1) : ease(cn)) : 1;
      w.L.cellL.c = op > .35 ? 'gas' : null;
      var open = op > .35 && cl < .45;
      w.bot.top = open; w.cell.valve = open; w.cell.aV = open;
      var q = CFG.GAS_TO_BOT * x;
      w.bot.q = q; w.bot.P = pCharge(q, BOT_SS);
      w.cell.A = CFG.GAS_CHARGE - q; w.cell.Af = 'gas';              // 20 cc remains visibly in Pump A
      w.cell.P = CFG.GAS_P;
      var fl = x > 0 && x < 1;
      w.L.cellL.flow = fl ? -1 : 0;
      w.cell.man = fl ? 'gas' : null; w.cell.manSeg = 'out'; w.cell.manDir = fl ? -1 : 0;
      w.cell.stab = 1;
      w.rec.bot = cl > .4;
      w.hl = cl > 0 && cl < 1 ? ['bot'] : null;
    },
    /* 6 oil: connect, hold 315 psig, pressurize to 3,000 psig, charge A 100 + B 80 */
    function (w, pr, key) {
      var br = pr('bring'), wt = pr('wait'), ps = pr('press'), sb = pr('stab'), cn = pr('conn'), xa = pr('xferA'), xb = pr('xferB'), cl = pr('close');
      if (br < .5) { w.bot.a = clamp(1 - br * 2.4, 0, 1); w.bot.x = SLOT_X - 70 * smooth(br * 2); }
      else {
        w.bot.kind = 'oil'; w.bot.a = clamp(br * 2.2 - 1.1, 0, 1); w.bot.x = SLOT_X; w.bot.y = PORT_Y + 40 * (1 - smooth(br * 2 - 1));
        w.bot.q = 0; w.bot.oil = CFG.OIL_V0; w.bot.water = CFG.BOTTLE_CAP - CFG.OIL_V0; w.bot.P = CFG.OIL_P0; w.bot.bv = br >= 1; w.bot.top = false;
      }
      w.pump.a = smooth((br - .35) / .65); w.pump.x = B_PUMP_X; w.pump.V = CFG.PUMP_REFILL;
      w.L.hyd.to = 'bot'; w.L.hyd.part = br < .5 ? 0 : smooth((br - .6) / .4); w.L.hyd.a = 1;
      w.L.cellL.part = br > 0 ? (br < 1 ? clamp(1 - br * 3, 0, 1) : ease(cn)) : 1;
      w.L.cellL.c = xa > 0 ? 'oil' : null;
      var pe = ease(ps), dv = CFG.OIL_COMP * pe;
      if (w.bot.kind === 'oil') { w.bot.P = CFG.OIL_P0 + (CFG.OIL_P - CFG.OIL_P0) * pe; }
      w.pump.P = br >= 1 ? w.bot.P : 0;
      w.pump.mode = br < 1 ? 'REFILLED · 300 cc' : ps === 0 ? 'CONNECTED · NOT PUMPING' : ps < 1 ? 'PRESSURIZING' : xa > 0 && xb < 1 ? 'DELIVERING · 3,000 psig' : 'HOLD 3,000 psig';
      var mA = CFG.OIL_A * ease(xa), mB = CFG.OIL_B * ease(xb);
      if (w.bot.kind === 'oil') { w.bot.oil = CFG.OIL_V0 - dv - mA - mB; w.bot.water = CFG.BOTTLE_CAP - w.bot.oil; }
      w.pump.V = CFG.PUMP_REFILL - dv - mA - mB;
      var open = xa > 0 && cl < .45;
      w.bot.top = open && w.bot.kind === 'oil'; w.cell.valve = open; w.cell.aV = xa > 0 && xb === 0; w.cell.bV = xb > 0 && cl < .45;
      w.cell.A = mA; w.cell.B = mB; w.cell.Af = mA > 0 ? 'oil' : null;
      w.cell.P = xa > 0 ? CFG.OIL_P : 0;
      // the cell leaves view WITH its unused 20 cc (no draining), then an empty cell is in place for the oil
      if (br < .5) { w.cell.a = 1 - smooth(br / .4); w.cell.A = CFG.GAS_CHARGE - CFG.GAS_TO_BOT; w.cell.Af = 'gas'; w.cell.P = CFG.GAS_P; w.cell.stab = 1; }
      else w.cell.a = smooth((br - .6) / .4);
      var fa = xa > 0 && xa < 1, fb = xb > 0 && xb < 1;
      w.L.cellL.flow = fa || fb ? 1 : 0; w.L.hyd.flow = fa || fb || (ps > 0 && ps < 1) ? -1 : 0;
      w.cell.man = xa > 0 ? 'oil' : null; w.cell.manSeg = xb > 0 ? 'toB' : 'out'; w.cell.manDir = fa || fb ? 1 : 0;
      w.cell.stab = xa >= 1 && xb >= 1 ? .35 : 0;
      w.pSet = key === 'wait';
      w.hl = key === 'bring' ? ['bot', 'pump'] : key === 'wait' ? ['bot'] : null;
    },
    /* 7 agitate the oil between Pump A and Pump B: stroke = largest volume the receiving pump can take */
    function (w, pr) {
      var op = pr('open'), st = pr('stab'), rc = pr('rec');
      var fade = clamp(1 - op * 1.6, 0, 1);
      w.bot.a = fade; w.pump.a = fade; w.L.hyd.a = fade; w.L.cellL.a = fade;
      w.agCard = clamp(op * 1.6 - .5, 0, 1);
      w.cell.aV = w.cell.bV = op > .5 && st < .3;
      var s = [pr('s1'), pr('s2'), pr('s3'), pr('s4')];
      var k = s[3] > 0 ? 3 : s[2] > 0 ? 2 : s[1] > 0 ? 1 : s[0] > 0 ? 0 : -1;
      var d = 0, dir = 0;
      if (k >= 0) { var e = ease(s[k]); d = (k % 2 === 0) ? AGIT_DV * e : AGIT_DV * (1 - e); dir = (s[k] > 0 && s[k] < 1) ? (k % 2 === 0 ? 1 : -1) : 0; }
      w.cell.A = clamp(CFG.OIL_A - d, 0, CFG.CELL_CAP); w.cell.B = clamp(CFG.OIL_B + d, 0, CFG.CELL_CAP);   // A + B = 180 cc always
      w.cell.Af = 'oil'; w.cell.P = CFG.OIL_P;
      w.cell.man = w.cell.bV ? 'oil' : null; w.cell.manSeg = 'ab'; w.cell.manDir = dir;
      w.stroke = k + 1; w.strokeDir = dir; w.cyc = s.filter(function (v) { return v >= 1; }).length;
      w.cell.stab = st > 0 ? .35 + .65 * smooth(st) : .35;
      w.rec.oil = rc > .4;
      w.hl = rc > 0 && rc < 1 ? ['cell'] : null;
    },
    /* 8 oil into the bottle: 99 cc, B -> A refill, 80 cc (1 cc stays in Pump A); bottle water side on the water pump */
    function (w, pr, key) {
      var sw = pr('swap'), cn = pr('conn'), op = pr('open'), x1 = pr('x1'), p1 = pr('p1'), rf = pr('refill'), p2 = pr('p2'), x2 = pr('x2'), cl = pr('close');
      w.agCard = clamp(1 - sw * 2.5, 0, 1); w.xfCard = clamp(sw * 2 - .8, 0, 1);
      w.bot.kind = 'recomb'; w.bot.a = clamp(sw * 1.8 - .5, 0, 1); w.bot.y = PORT_Y + 40 * (1 - smooth(sw * 1.6 - .4));
      w.bot.q = CFG.GAS_TO_BOT; w.bot.water = CFG.BOT_W0;
      w.L.cellL.part = ease(cn); w.L.cellL.c = op > .35 ? 'oil' : null; w.L.cellL.a = 1;
      // pressure-control (water) pump on the bottle water-side port: brought in with the bottle, connected, valve opened
      w.pump.a = clamp(sw * 1.8 - .5, 0, 1); w.pump.x = B_PUMP_X; w.pump.V = PUMP_OIL0;
      w.hose = true; w.L.hyd.part = ease(cn); w.L.hyd.to = 'bot'; w.L.hyd.flow = 0;
      w.bot.bv = op > .2;
      var e1 = ease(x1), er = ease(rf), e2 = ease(x2);
      var into = OIL_T1 * e1 + OIL_T2 * e2;
      w.cell.A = CFG.OIL_A - OIL_T1 * e1 + CFG.OIL_B * er - OIL_T2 * e2; w.cell.B = CFG.OIL_B * (1 - er);
      if (w.cell.A < .005) w.cell.A = 0;
      w.cell.Af = 'oil'; w.cell.P = CFG.OIL_P;                       // Pump A keeps the cell at 3,000 psig (no reset)
      w.bot.oil = into; w.bot.P = pCharge(CFG.GAS_TO_BOT, BOT_SS - into);
      w.pump.P = w.bot.bv ? w.bot.P * smooth((op - .2) / .5) : 0;   // pump reading = bottle pressure once the valve is open
      w.pump.mode = w.bot.bv ? 'MONITOR · FIXED VOL.' : sw < 1 ? 'IDLE' : 'CONNECTING';
      var bOpen = (op > .35 && p1 < .5) || (p2 > .5 && cl < .45);
      w.bot.top = bOpen; w.cell.valve = bOpen; w.cell.aV = op > .35; w.cell.bV = rf > 0 && p2 < .5;
      var f1 = x1 > 0 && x1 < 1, fr = rf > 0 && rf < 1, f2 = x2 > 0 && x2 < 1;
      w.bot.drops = f1 || f2;
      w.L.cellL.flow = f1 || f2 ? -1 : 0;
      w.cell.man = f1 || f2 || fr || bOpen ? 'oil' : null;
      w.cell.manSeg = fr || (rf > 0 && p2 < .5) ? 'ab' : 'out'; w.cell.manDir = fr ? -1 : f1 || f2 ? -1 : 0;
      w.cell.stab = 1;
      w.xf.s1 = x1 >= 1 ? (p1 > .3 ? 1 : .99) : x1; w.xf.s2 = rf; w.xf.s3 = x2 >= 1 ? (cl > .3 ? 1 : .99) : x2;
      w.rec.oilBot = cl > .4;
      w.hl = key === 'p1' || key === 'close' ? ['xf'] : key === 'conn' ? ['bot', 'pump'] : null;
    },
    /* 9 heating jacket + 180° inversion agitation; water pump raises and holds the working pressure (CFG.WORK_P) */
    function (w, pr) {
      var mt = pr('mount'), ps = pr('press'), rk = pr('rock'), se = pr('settle'), dn = pr('done');
      var m = smooth(mt);
      w.cell.a = clamp(1 - mt * 2, 0, 1); w.L.cellL.a = clamp(1 - mt * 3, 0, 1); w.xfCard = clamp(1 - mt * 2.5, 0, 1);
      w.stand = clamp(mt * 1.6 - .2, 0, 1); w.rockCard = clamp(mt * 2 - 1, 0, 1);
      w.bot.x = lerp(SLOT_X, STAND.x, m); w.bot.y = lerp(PORT_Y, STAND.py - PIV_DY, m);
      w.pump.a = 1; w.pump.x = B_PUMP_X; w.hose = true; w.bot.bv = true; w.bot.top = false;   // pump stays put, line stays on
      w.L.hyd.part = 1; w.L.hyd.to = 'bot';
      w.jacket = 1; w.heat = true;                                   // jacket fitted and heating from the start of the stage
      var pe = ease(ps);
      w.bot.ang = 180 * (1 - Math.cos(rk * Math.PI * 2 * CFG.ROCK_N)) / 2;
      w.rockP = rk; w.cyc = Math.min(CFG.ROCK_N, Math.floor(rk * CFG.ROCK_N + 1e-6));
      var mix = se > 0 ? .9 + .1 * smooth(se) : .9 * smooth(rk);
      w.bot.mix = mix;
      var sh = SHRINK * mix;
      w.bot.water = CFG.BOT_W0 + DW_B3 * pe + sh;
      w.bot.oil = OIL_IN + (G_B3 - SHRINK) * mix;                  // liquid volume (oil + dissolved gas)
      var dip = rk > 0 ? 70 * (1 - mix) * (.55 + .45 * Math.sin(rk * Math.PI * 2 * CFG.ROCK_N * 2)) * smooth(rk / .06) : 0;
      if (se > 0) dip = 70 * .1 * .55 * (1 - smooth(se));
      w.bot.P = ps < 1 && rk === 0 ? lerp(P_B2, CFG.WORK_P, pe) : CFG.WORK_P - dip;
      w.bot.settle = se >= 1 ? 1 : 0;
      w.pump.P = w.bot.P; w.pump.V = PUMP_OIL0 - DW_B3 * pe - sh;   // pump and bottle readings are the same line pressure
      var wp = n0(CFG.WORK_P);
      w.pump.mode = ps > 0 && ps < 1 ? 'PRESSURIZING → ' + wp : rk > 0 && rk < 1 ? 'HOLDING ' + wp + ' psig' : se > 0 && se < 1 ? 'SETTLING' : ps >= 1 ? 'HOLD ' + wp + ' psig' : 'MONITOR';
      w.L.hyd.flow = (ps > 0 && ps < 1) || (rk > 0 && rk < 1) ? -1 : 0;
      w.summary = clamp(dn * 3, 0, 1);
    }
  ];

  function stateAt(k, t) {
    var S = STAGES[k], tt = clamp(t, 0, S.T), i = 0;
    for (i = S.sub.length - 1; i > 0; i--) if (tt >= S.starts[i]) break;
    var pr = function (key) {
      for (var j = 0; j < S.sub.length; j++) if (S.sub[j].k === key) return clamp((tt - S.starts[j]) / S.sub[j].d, 0, 1);
      return 0;
    };
    var w = baseWorld(k);
    STAGE_FN[k](w, pr, t > 0 ? S.sub[i].k : null, tt);
    w.k = k; w.i = i; w.tt = tt; w.started = t > 0; w.done = t >= S.T; w.u = pr(S.sub[i].k);
    w.prog = tt / S.T;
    return w;
  }

  /* ------------------------------------------------------------ drawing primitives */
  function T(x, y, s, o) {
    o = o || {};
    return '<text x="' + r1(x) + '" y="' + r1(y) + '"' + (o.a ? ' text-anchor="' + o.a + '"' : '') +
      ' font-family="' + (o.m ? 'IBM Plex Mono, monospace' : 'IBM Plex Sans, sans-serif') + '" font-size="' + (o.s || 12) + '"' +
      (o.w ? ' font-weight="' + o.w + '"' : '') + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') +
      ' fill="' + (o.c || 'var(--txt2)') + '">' + esc(s) + '</text>';
  }
  function lcd(x, y, w, label, val, col, bd) {
    return (label ? T(x + w / 2, y - 5, label, { a: 'middle', m: 1, s: 9.5, ls: .6, c: 'var(--mut)' }) : '') +
      '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + w + '" height="22" rx="4" fill="#0a1420" stroke="' + (bd || '#2a5f9d') + '" stroke-width="1.2"/>' +
      T(x + w / 2, y + 15.5, val, { a: 'middle', m: 1, s: 12, w: 600, c: col || '#6fb7ff' });
  }
  function vtag(x, y, open, anchor) {
    var w = open ? 36 : 46, xx = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
    return '<rect x="' + r1(xx) + '" y="' + r1(y - 8) + '" width="' + w + '" height="12" rx="6" fill="' + (open ? 'rgba(70,211,154,.16)' : 'rgba(127,147,179,.12)') +
      '" stroke="' + (open ? '#2f9d72' : 'rgba(127,147,179,.55)') + '" stroke-width=".8"/>' +
      T(xx + w / 2, y + .8, open ? 'OPEN' : 'CLOSED', { a: 'middle', m: 1, s: 7.6, w: 600, ls: .5, c: open ? 'var(--grn)' : 'var(--mut)' });
  }
  // valve on a vertical line (flow up/down), handwheel to the right
  function valveV(x, y, open) {
    var f = open ? '#46d39a' : '#8a9ab2';
    return '<line x1="' + x + '" y1="' + y + '" x2="' + (x + 13) + '" y2="' + y + '" stroke="#0a0e16" stroke-width="2.4"/>' +
      '<circle cx="' + (x + 17) + '" cy="' + y + '" r="5" fill="none" stroke="#0a0e16" stroke-width="3"/><circle cx="' + (x + 17) + '" cy="' + y + '" r="5" fill="none" stroke="#aebccf" stroke-width="1.6"/>' +
      '<path d="M' + (x - 8) + ' ' + (y - 9) + ' L' + (x + 8) + ' ' + (y - 9) + ' L' + x + ' ' + y + ' Z M' + (x - 8) + ' ' + (y + 9) + ' L' + (x + 8) + ' ' + (y + 9) + ' L' + x + ' ' + y + ' Z" fill="' + f + '" stroke="#0a0e16" stroke-width="1.1" stroke-linejoin="round"/>';
  }
  // valve on a horizontal line, handwheel above
  function valveH(x, y, open) {
    var f = open ? '#46d39a' : '#8a9ab2';
    return '<line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y - 13) + '" stroke="#0a0e16" stroke-width="2.4"/>' +
      '<circle cx="' + x + '" cy="' + (y - 17) + '" r="5" fill="none" stroke="#0a0e16" stroke-width="3"/><circle cx="' + x + '" cy="' + (y - 17) + '" r="5" fill="none" stroke="#aebccf" stroke-width="1.6"/>' +
      '<path d="M' + (x - 9) + ' ' + (y - 8) + ' L' + (x - 9) + ' ' + (y + 8) + ' L' + x + ' ' + y + ' Z M' + (x + 9) + ' ' + (y - 8) + ' L' + (x + 9) + ' ' + (y + 8) + ' L' + x + ' ' + y + ' Z" fill="' + f + '" stroke="#0a0e16" stroke-width="1.1" stroke-linejoin="round"/>';
  }
  // tubing: dark outline + steel + fluid core + moving dashes (flow) + chevron
  function tube(pts, L, tt, ghost) {
    if (!L || L.a <= .01) return '';
    var o = '<g opacity="' + r1(L.a * 100) / 100 + '">';
    if (ghost && L.part < 1) o += '<path d="' + pd(pts) + '" fill="none" stroke="var(--mut)" stroke-width="1.4" stroke-dasharray="4 5" opacity=".55"/>';
    var p = ppart(pts, L.part);
    if (p.length >= 2) {
      var d = pd(p);
      o += '<path d="' + d + '" fill="none" stroke="#0a0e16" stroke-width="7.4" stroke-linecap="round" stroke-linejoin="round"/>';
      o += '<path d="' + d + '" fill="none" stroke="#a9b8cd" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>';
      if (L.c) o += '<path d="' + d + '" fill="none" stroke="' + FL[L.c].line + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
      if (L.c && L.flow && L.part >= 1) {
        o += '<path d="' + d + '" fill="none" stroke="' + FL[L.c].dash + '" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 10" stroke-dashoffset="' + r1(-L.flow * tt * 26) + '"/>';
        var q = pat(pts, .5), ang = q.a + (L.flow < 0 ? 180 : 0);
        o += '<g transform="translate(' + r1(q.x) + ',' + r1(q.y) + ') rotate(' + r1(ang) + ')"><circle r="8.5" fill="' + FL[L.c].line + '" stroke="#0a0e16" stroke-width="1"/><path d="M-3 -4 L2.5 0 L-3 4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>';
      }
      if (L.part < 1) { var e = p[p.length - 1]; o += '<circle cx="' + r1(e[0]) + '" cy="' + r1(e[1]) + '" r="4" fill="var(--blue)"/>'; }
    }
    return o + '</g>';
  }
  function glow(on, x, y, w, h) {
    return on ? '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + w + '" height="' + h + '" rx="12" fill="rgba(77,157,255,.07)" stroke="var(--blue)" stroke-width="1.4" stroke-dasharray="5 4"/>' : '';
  }
  function hl(w, id) { return !!(w.hl && w.hl.indexOf(id) >= 0); }

  /* ------------------------------------------------------------ equipment */
  function drawGSP(w) {
    var g = w.gsp; if (g.a <= .01) return '';
    var x = GSP_X, fillA = .35 + .6 * clamp(g.P / CFG.GSP_P0, 0, 1);
    var o = '<g opacity="' + r1(g.a * 100) / 100 + '">' + glow(hl(w, 'gsp'), x - 62, 146, 124, 420);
    o += '<rect x="' + (x - 5) + '" y="160" width="10" height="14" fill="url(#rcPipe)" stroke="#0a0e16" stroke-width=".7"/>';
    o += valveV(x, 184, g.open);
    o += '<rect x="' + (x - 9) + '" y="194" width="18" height="22" rx="2" fill="url(#rcMetal)" stroke="#0a0e16"/>';
    o += '<rect x="' + (x - 40) + '" y="214" width="80" height="340" rx="36" fill="url(#rcCylG)" stroke="#0a0e16" stroke-width="1.3"/>';
    o += '<rect x="' + (x - 31) + '" y="228" width="62" height="312" rx="28" fill="url(#rcGasG)" opacity="' + r1(fillA * 100) / 100 + '"/>';
    o += '<rect x="' + (x - 31) + '" y="228" width="62" height="312" rx="28" fill="url(#rcGasDots)" opacity=".7"/>';
    o += '<rect x="' + (x - 22) + '" y="240" width="7" height="286" rx="3.5" fill="#fff" opacity=".22"/>';
    o += T(x, 392, 'G', { a: 'middle', m: 1, s: 20, w: 700, c: '#0d3b28' });
    o += vtag(x - 30, 187, g.open, 'end');
    o += T(x, 574, 'GSP Gas Cylinder', { a: 'middle', s: 14, w: 600, c: 'var(--txt)' });
    o += T(x, 589, 'separator gas', { a: 'middle', s: 11, c: 'var(--mut)' });
    o += lcd(x - 48, 606, 96, '', n0(g.P) + ' psig', '#7fe0b4', '#2f9d72');
    return o + '</g>';
  }


  /* air-driven gas booster (vertical): air drive on top -> rod -> gas plunger in a visible compression chamber
     below. Gas IN through the inlet check valve on the LEFT wall, OUT through the outlet check valve on the
     RIGHT wall, both opening into the compression space under the plunger. Intake stroke (plunger rising):
     inlet check open, gas drawn in. Compression stroke: chamber volume falls, gas darkens and its particles
     bunch; near the end the outlet check opens and compressed gas leaves toward the titanium cylinder. */
  function drawBooster(w) {
    var b = w.boo; if (b.a <= .01) return '';
    var om = Math.PI * 2 * .8, env = b.env || 0;
    var ph = Math.sin(w.tt * om) * env, vel = Math.cos(w.tt * om) * env;
    var X = BOO.x, CX0 = X - 26, CX1 = X + 26, CY0 = 272, CY1 = 344, PY = BOO.portY;
    var yf = 300 + 24 * ph;                                    // plunger face (276..324)
    var space = CY1 - yf, dens = clamp((68 - space) / 48, 0, 1);
    var intake = b.run && vel < -.08, comp = b.run && vel > .08, disch = comp && dens > .42;
    var py = 192 + 22 * ph;                                    // air piston
    var gasC = b.gas ? '#5cc79a' : '#26324a';
    var o = '<g opacity="' + r1(b.a * 100) / 100 + '">' + glow(hl(w, 'boo'), X - 92, 138, 184, 290);
    // air supply (from the top right into the air drive)
    o += '<path d="M' + (X + 46) + ' 184 H' + (X + 84) + ' V146" fill="none" stroke="#0a0e16" stroke-width="6" stroke-linejoin="round"/>';
    o += '<path d="M' + (X + 46) + ' 184 H' + (X + 84) + ' V146" fill="none" stroke="' + (b.air ? '#c7d3e3' : '#8392a8') + '" stroke-width="3.4" stroke-linejoin="round"/>';
    if (b.air) o += '<path d="M' + (X + 84) + ' 146 V184 H' + (X + 46) + '" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="2 8" stroke-dashoffset="' + r1(-w.tt * 30) + '"/>';
    o += '<circle cx="' + (X + 84) + '" cy="164" r="9" fill="url(#rcMetal)" stroke="#0a0e16"/><circle cx="' + (X + 84) + '" cy="164" r="6.3" fill="#0c1626"/>';
    o += '<line x1="' + (X + 84) + '" y1="164" x2="' + (X + 84 + (b.air ? 4 : -4)) + '" y2="159.5" stroke="#46e0ff" stroke-width="1.5" stroke-linecap="round"/>';
    o += T(X + 98, 160, 'AIR SUPPLY', { m: 1, s: 9, ls: .6, c: 'var(--mut)' });
    o += T(X + 98, 172, b.air ? 'ON · DRIVING' : 'OFF', { m: 1, s: 8.6, w: 600, c: b.air ? 'var(--grn)' : 'var(--mut)' });
    // air drive cylinder (top)
    o += '<rect x="' + (X - 46) + '" y="150" width="92" height="84" rx="8" fill="url(#rcAirDrive)" stroke="#0a0e16" stroke-width="1.3"/>';
    o += '<rect x="' + (X - 50) + '" y="146" width="100" height="8" rx="2" fill="url(#rcMetal)" stroke="#0a0e16"/><rect x="' + (X - 50) + '" y="230" width="100" height="8" rx="2" fill="url(#rcMetal)" stroke="#0a0e16"/>';
    o += '<rect x="' + (X - 34) + '" y="160" width="68" height="66" rx="4" fill="#0a1420" stroke="#33445e"/>';
    if (b.air) {                                                // driving air on the pushing side of the air piston
      var ay0 = vel >= 0 ? 161 : py + 6, ay1 = vel >= 0 ? py - 6 : 225;
      o += '<rect x="' + (X - 33) + '" y="' + r1(ay0) + '" width="66" height="' + r1(Math.max(0, ay1 - ay0)) + '" fill="#c7d3e3" opacity=".22"/>';
    }
    // rod: air piston -> gas plunger (through the neck)
    o += '<rect x="' + (X - 3) + '" y="' + r1(py) + '" width="6" height="' + r1(Math.max(0, yf - 12 - py)) + '" fill="url(#rcMetalH)" stroke="#05080f" stroke-width=".6"/>';
    o += '<rect x="' + (X - 32) + '" y="' + r1(py - 6) + '" width="64" height="12" rx="2" fill="url(#rcMetal)" stroke="#05080f"/>';
    o += T(X - 54, 196, 'AIR', { a: 'end', m: 1, s: 8.5, w: 600, ls: .8, c: 'var(--mut)' }) + T(X - 54, 207, 'DRIVE', { a: 'end', m: 1, s: 8.5, w: 600, ls: .8, c: 'var(--mut)' });
    // neck + gas head (bottom)
    o += '<rect x="' + (X - 12) + '" y="238" width="24" height="22" fill="url(#rcMetalH)" stroke="#0a0e16"/>';
    o += '<rect x="' + (X - 40) + '" y="258" width="80" height="100" rx="6" fill="url(#rcSteelV)" stroke="#0a0e16" stroke-width="1.2"/>';
    o += '<rect x="' + CX0 + '" y="' + CY0 + '" width="' + (CX1 - CX0) + '" height="' + (CY1 - CY0) + '" rx="3" fill="#0a1420" stroke="#33445e"/>';
    if (b.gas) {                                                // gas in the compression space (shade + particles follow the plunger)
      o += '<rect x="' + (CX0 + 1) + '" y="' + r1(yf) + '" width="' + (CX1 - CX0 - 2) + '" height="' + r1(Math.max(0, space - 1)) + '" fill="url(#rcGasG)" opacity="' + r1((.38 + .6 * dens) * 100) / 100 + '"/>';
      for (var i = 0; i < 14; i++) {
        var fx = ((i * .7548776 + .21) % 1), fy = ((i * .5698403 + .37) % 1);
        var jy = Math.sin(w.tt * 5 + i * 1.7) * 1.2 * env;
        o += '<circle cx="' + r1(CX0 + 5 + (CX1 - CX0 - 10) * fx) + '" cy="' + r1(yf + 3 + (space - 6) * fy + jy) + '" r="' + r1(1.2 + .5 * dens) + '" fill="#2f9d72" opacity="' + r1((.5 + .45 * dens) * 100) / 100 + '"/>';
      }
    }
    o += '<rect x="' + (CX0 + 1) + '" y="' + r1(yf - 12) + '" width="' + (CX1 - CX0 - 2) + '" height="12" rx="1.5" fill="url(#rcMetal)" stroke="#05080f"/>';
    // inlet port + check valve (LEFT wall) and outlet port + check valve (RIGHT wall), both into the compression space
    o += '<rect x="' + (X - 52) + '" y="' + (PY - 6) + '" width="12" height="12" fill="url(#rcPipe)" stroke="#0a0e16" stroke-width=".7"/>';
    o += '<rect x="' + (X - 40) + '" y="' + (PY - 3) + '" width="14" height="6" fill="' + gasC + '" opacity="' + (b.gas ? .75 : 1) + '"/>';
    o += '<path d="M' + (X - 38) + ' ' + (PY - 7) + ' L' + (X - 38) + ' ' + (PY + 7) + ' L' + (X - 29) + ' ' + PY + ' Z" fill="' + (intake ? '#46d39a' : '#6f7f98') + '" stroke="#0a0e16" stroke-width=".8"/>';
    o += '<rect x="' + (X + 40) + '" y="' + (PY - 6) + '" width="12" height="12" fill="url(#rcPipe)" stroke="#0a0e16" stroke-width=".7"/>';
    o += '<rect x="' + (X + 26) + '" y="' + (PY - 3) + '" width="14" height="6" fill="' + gasC + '" opacity="' + (b.gas ? .75 : 1) + '"/>';
    o += '<path d="M' + (X + 29) + ' ' + (PY - 7) + ' L' + (X + 29) + ' ' + (PY + 7) + ' L' + (X + 38) + ' ' + PY + ' Z" fill="' + (disch ? '#46d39a' : '#6f7f98') + '" stroke="#0a0e16" stroke-width=".8"/>';
    if (b.gas && intake) {
      for (var j = 0; j < 3; j++) { var xi = X - 54 + ((w.tt * 40 + j * 9) % 28); o += '<circle cx="' + r1(xi) + '" cy="' + PY + '" r="1.8" fill="#e9fff4" stroke="#2f9d72" stroke-width=".6"/>'; }
    }
    if (b.gas && disch) {
      for (var q = 0; q < 3; q++) { var xo = X + 26 + ((w.tt * 46 + q * 9) % 28); o += '<circle cx="' + r1(xo) + '" cy="' + PY + '" r="2" fill="#e9fff4" stroke="#2f9d72" stroke-width=".6"/>'; }
    }
    o += T(X, 268, 'GAS CHAMBER', { a: 'middle', m: 1, s: 7.2, w: 600, ls: .4, c: '#1b2a3e' });
    o += T(X, 354, !b.run ? (b.gas ? 'IDLE · GAS' : 'IDLE') : disch ? 'DISCHARGE →' : comp ? 'COMPRESS' : intake ? '→ INTAKE' : '·', { a: 'middle', m: 1, s: 7.6, w: 700, c: disch ? '#1d7a55' : comp ? '#8a5a1a' : '#1b2a3e' });
    o += T(X - 54, PY - 12, 'IN', { a: 'end', m: 1, s: 9, w: 600, c: 'var(--txt2)' }) + T(X + 54, PY - 12, 'OUT', { m: 1, s: 9, w: 600, c: 'var(--txt2)' });
    // stand
    o += '<rect x="' + (X - 58) + '" y="362" width="116" height="8" rx="2" fill="url(#rcMetal)" stroke="#0a0e16"/>';
    o += '<rect x="' + (X - 30) + '" y="358" width="8" height="5" fill="#3a485f"/><rect x="' + (X + 22) + '" y="358" width="8" height="5" fill="#3a485f"/>';
    o += T(X, 390, 'Booster Pump', { a: 'middle', s: 14, w: 600, c: 'var(--txt)' });
    o += T(X, 405, 'air-driven gas booster', { a: 'middle', s: 11, c: 'var(--mut)' });
    o += '<rect x="' + (X - 34) + '" y="412" width="68" height="14" rx="7" fill="' + (b.run ? 'rgba(70,211,154,.16)' : 'rgba(127,147,179,.12)') + '" stroke="' + (b.run ? '#2f9d72' : 'rgba(127,147,179,.55)') + '" stroke-width=".8"/>';
    o += T(X, 422.5, b.run ? 'RUNNING' : 'STOPPED', { a: 'middle', m: 1, s: 8.5, w: 600, ls: .6, c: b.run ? 'var(--grn)' : 'var(--mut)' });
    return o + '</g>';
  }
  // booster inlet / outlet valves on the gas lines (no bypass)
  function drawBooValves(w) {
    var b = w.boo; if (b.a <= .01) return '';
    var o = '<g opacity="' + r1(b.a * 100) / 100 + '">';
    if (w.L.gas1.part >= 1 && w.L.gas1.a > .01) o += valveH(BOO.vIn, 120, b.vin) + vtag(BOO.vIn, 140, b.vin, 'middle') + T(BOO.vIn, 156, 'BOOSTER IN', { a: 'middle', m: 1, s: 7.5, ls: .4, c: 'var(--mut)' });
    if (w.L.gas2.part >= 1 && w.L.gas2.a > .01) o += valveH(BOO.vOut, 120, b.vout) + vtag(BOO.vOut, 140, b.vout, 'middle') + T(BOO.vOut, 156, 'BOOSTER OUT', { a: 'middle', m: 1, s: 7.5, ls: .4, c: 'var(--mut)' });
    return o + '</g>';
  }

  /* titanium cylinder: sample side (top) · floating piston · (empty gap) · hydraulic water (bottom) */
  function drawTi(w) {
    var t = w.ti; if (t.a <= .01) return '';
    var svH = t.sv * TI_PX, wH = t.water * TI_PX, pistY = TI.ch0 + svH, wTop = TI.ch1 - wH;
    var gapY = pistY + TI.pist, gapH = Math.max(0, wTop - gapY);
    var o = '<g opacity="' + r1(t.a * 100) / 100 + '">' + glow(hl(w, 'ti'), t.x - 44, 176, 88, 440);
    o += '<g transform="translate(' + r1(t.x) + ',0)">';
    o += '<rect x="-5" y="190" width="10" height="9" fill="url(#rcPipe)" stroke="#0a0e16" stroke-width=".7"/>';
    o += valveV(0, 208, t.top);
    o += '<rect x="-8" y="217" width="16" height="16" rx="2" fill="url(#rcMetal)" stroke="#0a0e16"/>';
    o += '<rect x="-32" y="232" width="64" height="334" rx="11" fill="url(#rcTi)" stroke="#0a0e16" stroke-width="1.3"/>';
    o += '<rect x="-36" y="231" width="72" height="11" rx="3" fill="url(#rcMetal)" stroke="#0a0e16"/><rect x="-36" y="556" width="72" height="11" rx="3" fill="url(#rcMetal)" stroke="#0a0e16"/>';
    o += '<rect x="-22" y="' + TI.ch0 + '" width="44" height="' + (TI.ch1 - TI.ch0) + '" fill="#0a1420" stroke="#33445e"/>';
    if (svH > .3) {
      if (t.gas) {
        var ga = .5 + .5 * clamp(t.P / CFG.GAS_P, 0, 1);
        o += '<rect x="-22" y="' + TI.ch0 + '" width="44" height="' + r1(svH) + '" fill="url(#rcGasG)" opacity="' + r1(ga * 100) / 100 + '"/><rect x="-22" y="' + TI.ch0 + '" width="44" height="' + r1(svH) + '" fill="url(#rcGasDots)"/>';
      } else if (t.P < -.05) o += '<rect x="-22" y="' + TI.ch0 + '" width="44" height="' + r1(svH) + '" fill="url(#rcVacDots)"/>';
    }
    if (gapH > .3) o += '<rect x="-21.5" y="' + r1(gapY) + '" width="43" height="' + r1(gapH) + '" fill="none" stroke="#33445e" stroke-dasharray="3 3"/>';
    if (wH > .3) o += '<rect x="-22" y="' + r1(wTop) + '" width="44" height="' + r1(wH) + '" fill="url(#rcWaterG)"/>';
    o += '<rect x="-22" y="' + r1(pistY) + '" width="44" height="' + TI.pist + '" rx="1.5" fill="url(#rcMetal)" stroke="#05080f"/>';
    o += '<rect x="-17" y="250" width="5" height="298" rx="2.5" fill="#fff" opacity=".16"/>';
    if (svH > 22) o += T(0, TI.ch0 + svH / 2 + 5, t.gas ? 'G' : t.P < -.05 ? 'VAC' : 'EMPTY', { a: 'middle', m: 1, s: t.gas ? 16 : 8.5, w: 700, c: t.gas ? '#0d3b28' : '#7f93b3' });
    if (gapH > 26) o += T(0, gapY + gapH / 2 + 4, 'EMPTY', { a: 'middle', m: 1, s: 8.5, w: 600, c: '#7f93b3' });
    if (wH > 18) o += T(0, wTop + wH / 2 + 6, 'W', { a: 'middle', m: 1, s: 16, w: 700, c: '#e6f3ff' });
    o += '<rect x="-6" y="566" width="12" height="8" fill="url(#rcPipe)" stroke="#0a0e16" stroke-width=".7"/>';
    o += valveV(0, 584, t.bot);
    o += '<rect x="-5" y="593" width="10" height="11" fill="url(#rcPipe)" stroke="#0a0e16" stroke-width=".7"/>';
    var lx = 52;
    o += vtag(-30, 211, t.top, 'end') + vtag(26, 596, t.bot, 'start');
    o += T(lx, 252, 'SAMPLE (GAS) SIDE', { m: 1, s: 8.5, ls: .5, c: FL.gas.line });
    o += T(lx, 548, 'HYDRAULIC (WATER) SIDE', { m: 1, s: 8.5, ls: .5, c: FL.water.line });
    o += T(lx, 322, 'Titanium Cylinder', { s: 14, w: 600, c: 'var(--txt)' });
    o += T(lx, 337, 'floating piston · ' + CFG.TI_CAP + ' cc', { s: 11, c: 'var(--mut)' });
    o += lcd(lx, 362, 104, 'CYLINDER P', pf(t.P) + ' psig', '#7fe0b4', '#2f9d72');
    o += lcd(lx, 408, 104, 'GAS VOLUME', f1(t.gas ? t.sv : 0) + ' cc', '#7fe0b4', '#2f9d72');
    o += lcd(lx, 454, 104, 'WATER', f1(t.water) + ' cc', '#9fd8ff', '#2a5f9d');
    return o + '</g></g>';
  }

  /* portable vacuum pump (appears, connects through an isolation valve, is removed) */
  function drawVac(w) {
    var v = w.vac; if (v.a <= .01) return '';
    var P = VACP[v.at], x = P.x + v.dx, y = P.y;
    var o = '<g opacity="' + r1(v.a * 100) / 100 + '">' + glow(hl(w, 'vac'), x - 10, y - 10, 130, 100);
    o += '<g transform="translate(' + r1(x) + ',' + y + ')">';
    o += '<ellipse cx="55" cy="54" rx="58" ry="4" fill="rgba(0,0,0,.18)"/>';
    o += '<rect x="0" y="42" width="110" height="8" rx="2" fill="url(#rcMetal)" stroke="#0a0e16"/>';
    o += '<rect x="4" y="8" width="54" height="34" rx="7" fill="url(#rcAirDrive)" stroke="#0a0e16" stroke-width="1.1"/>';
    for (var i = 0; i < 5; i++) o += '<line x1="' + (12 + i * 9) + '" y1="12" x2="' + (12 + i * 9) + '" y2="38" stroke="#1b2f4d" stroke-width="1.4" opacity=".7"/>';
    o += '<rect x="58" y="4" width="48" height="38" rx="5" fill="url(#rcSteelV)" stroke="#0a0e16" stroke-width="1.1"/>';
    o += '<circle cx="82" cy="23" r="11" fill="url(#rcMetalH)" stroke="#0a0e16"/><circle cx="82" cy="23" r="8" fill="#0c1626"/>';
    var a = (-120 - 100 * (v.lvl || 0)) * Math.PI / 180;
    o += '<line x1="82" y1="23" x2="' + r1(82 + 6.5 * Math.cos(a)) + '" y2="' + r1(23 + 6.5 * Math.sin(a)) + '" stroke="#46e0ff" stroke-width="1.5" stroke-linecap="round"/>';
    if (v.run) o += '<circle cx="31" cy="25" r="9" fill="none" stroke="#9fd8ff" stroke-width="1.6" stroke-dasharray="4 5" stroke-dashoffset="' + r1(-w.tt * 40) + '"/>';
    o += '</g>';
    var lx = x + 55, ly = y + 66;
    o += T(lx, ly, 'Vacuum Pump', { a: 'middle', s: 12.5, w: 600, c: 'var(--txt)' });
    o += '<rect x="' + r1(lx - 32) + '" y="' + (ly + 5) + '" width="64" height="13" rx="6.5" fill="' + (v.run ? 'rgba(70,211,154,.16)' : 'rgba(127,147,179,.12)') + '" stroke="' + (v.run ? '#2f9d72' : 'rgba(127,147,179,.55)') + '" stroke-width=".8"/>';
    o += T(lx, ly + 14.5, v.run ? 'RUNNING' : 'STOPPED', { a: 'middle', m: 1, s: 8, w: 600, ls: .6, c: v.run ? 'var(--grn)' : 'var(--mut)' });
    return o + '</g>';
  }
  function drawVacLine(w) {
    var v = w.vac; if (v.a <= .01 && w.L.vacL.part <= 0) return '';
    var P = VACP[v.at], L = { part: w.L.vacL.part, c: w.L.vacL.c, flow: w.L.vacL.flow, a: 1 };
    var o = tube(P.pts, L, w.tt, false);
    if (w.L.vacL.part >= 1) {
      o += (P.h ? valveH(P.vx, P.vy, v.open) + vtag(P.vx, P.vy + 20, v.open, 'middle') : valveV(P.vx, P.vy, v.open) + vtag(P.vx - 12, P.vy + 3, v.open, 'end'));
      o += P.h ? '' : T(P.vx - 12, P.vy - 10, 'VACUUM VALVE', { a: 'end', m: 1, s: 7.5, c: 'var(--mut)' });
    }
    return o;
  }

  function drawPump(w) {
    var p = w.pump; if (p.a <= .01) return '';
    var x = p.x, y = PUMP_Y;
    var o = '<g opacity="' + r1(p.a * 100) / 100 + '">' + glow(hl(w, 'pump'), x - 10, y - 12, PUMP_W + 20, PUMP_H + 58);
    o += '<ellipse cx="' + (x + 90) + '" cy="' + (y + PUMP_H + 6) + '" rx="96" ry="6" fill="rgba(0,0,0,.18)"/>';
    o += '<rect x="' + x + '" y="' + y + '" width="' + PUMP_W + '" height="' + PUMP_H + '" rx="12" fill="url(#rcPumpBody)" stroke="#0a0e16" stroke-width="1.4"/>';
    o += '<rect x="' + (x + 8) + '" y="' + (y + 7) + '" width="' + (PUMP_W - 16) + '" height="5" rx="2.5" fill="#1b2433" opacity=".6"/>';
    o += '<rect x="' + (x + 14) + '" y="' + (y + 18) + '" width="' + (PUMP_W - 28) + '" height="58" rx="5" fill="#06101e" stroke="#2a3852"/>';
    o += T(x + 22, y + 36, 'P', { m: 1, s: 9, c: '#7f93b3' }) + T(x + PUMP_W - 22, y + 38, pf(p.P) + ' psig', { a: 'end', m: 1, s: 13.5, w: 600, c: '#46d39a' });
    o += T(x + 22, y + 61, 'V', { m: 1, s: 9, c: '#7f93b3' }) + T(x + PUMP_W - 22, y + 63, f2(p.V) + ' cc', { a: 'end', m: 1, s: 13.5, w: 600, c: '#e2c65a' });
    var act = /DELIVER|RECEIV|PRESSUR|HOLDING|SETTLING|MONITOR/.test(p.mode);
    o += '<rect x="' + (x + 14) + '" y="' + (y + 84) + '" width="' + (PUMP_W - 28) + '" height="18" rx="4" fill="rgba(10,20,32,.55)"/>';
    o += T(x + PUMP_W / 2 + 6, y + 97, p.mode, { a: 'middle', m: 1, s: 8.6, w: 600, ls: .4, c: act ? '#9fd8ff' : '#aab6c6' });
    o += '<circle cx="' + (x + 24) + '" cy="' + (y + 93) + '" r="3.6" fill="' + (act ? '#46d39a' : '#54657f') + '"/>';
    o += '<rect x="' + (x + 14) + '" y="' + (y + 110) + '" width="' + (PUMP_W - 28) + '" height="6" rx="3" fill="#0b1422"/>';
    o += '<rect x="' + (x + 14) + '" y="' + (y + 110) + '" width="' + r1((PUMP_W - 28) * clamp(p.V / CFG.PUMP_V0, 0, 1)) + '" height="6" rx="3" fill="#4a93c9"/>';
    o += '<rect x="' + (x + PUMP_W) + '" y="' + (PUMP_PORT_Y - 6) + '" width="10" height="12" fill="url(#rcPipe)" stroke="#0a0e16" stroke-width=".7"/>';
    o += T(x + PUMP_W / 2, y + PUMP_H + 22, 'Water Pump', { a: 'middle', s: 14, w: 600, c: 'var(--txt)' });
    o += T(x + PUMP_W / 2, y + PUMP_H + 37, 'hydraulic water · barrel volume', { a: 'middle', s: 10.5, c: 'var(--mut)' });
    return o + '</g>';
  }

  /* PVT cell = the Direct Density / DL dual-cylinder drawing (local coordinates) */
  function pumpFluid(x, v, f, id) {
    var h = Math.max(0, v * PXC), o = '<g clip-path="url(#' + id + ')">';
    if (v >= .5 && h < 4) h = 4;                                  // keep a small residual (e.g. the 1 cc left in Pump A) visible
    if (h > .3) {
      if (f === 'gas') o += '<rect x="' + x + '" y="219" width="36" height="' + r1(h) + '" fill="url(#rcGasG)"/><rect x="' + x + '" y="219" width="36" height="' + r1(h) + '" fill="url(#rcGasDots)"/>';
      else o += '<rect x="' + x + '" y="219" width="36" height="' + r1(h) + '" fill="url(#rcOilPat)"/>';
    }
    o += '<rect x="' + x + '" y="' + r1(Math.min(219 + h, 219 + 182 - 9)) + '" width="36" height="9" rx="1.5" fill="url(#rcMetal)" stroke="#05080f" stroke-width="1.1"/>';
    return o + '</g>';
  }
  function drawCell(w) {
    var c = w.cell; if (c.a <= .01) return '';
    var o = '<g opacity="' + r1(c.a * 100) / 100 + '">';
    var tot = c.A + c.B;
    o += '<g transform="' + CELL_T + '">';
    if (hl(w, 'cell')) o += '<rect x="796" y="140" width="304" height="400" rx="14" fill="rgba(77,157,255,.06)" stroke="var(--blue)" stroke-width="1.2" stroke-dasharray="5 4"/>';
    [[806, 150, 284, 12], [806, 454, 284, 12], [806, 150, 12, 316], [1078, 150, 12, 316], [812, 466, 10, 28], [1074, 466, 10, 28]].forEach(function (r) {
      o += '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" fill="url(#rcMetalH)" stroke="#0a0e16"/>'; });
    o += '<line x1="790" y1="190" x2="1030" y2="190" stroke="#0a0e16" stroke-width="6" stroke-linecap="round"/><line x1="790" y1="190" x2="1030" y2="190" stroke="#9fb0c8" stroke-width="3.4" stroke-linecap="round"/>';
    [866, 948, 1030].forEach(function (xx) { o += '<line x1="' + xx + '" y1="190" x2="' + xx + '" y2="' + (xx === 948 ? 212 : 215) + '" stroke="#0a0e16" stroke-width="5"/><line x1="' + xx + '" y1="190" x2="' + xx + '" y2="' + (xx === 948 ? 212 : 215) + '" stroke="#9fb0c8" stroke-width="3"/>'; });
    if (c.man) {
      var col = FL[c.man].line;
      var segs = c.manSeg === 'ab' ? ['M866 215 V190 H1030 V215'] : c.manSeg === 'toB' ? ['M790 190 H866 V215'] : c.manSeg === 'all' ? ['M790 190 H1030 V215', 'M866 190 V215'] : ['M790 190 H1030 V215'];
      segs.forEach(function (seg) {
        o += '<path d="' + seg + '" fill="none" stroke="' + col + '" stroke-width="2.6" stroke-linejoin="round"/>';
        if (c.manDir) o += '<path d="' + seg + '" fill="none" stroke="' + FL[c.man].dash + '" stroke-width="1.8" stroke-dasharray="3 8" stroke-dashoffset="' + r1(c.manDir * (c.manSeg === 'ab' ? 1 : -1) * w.tt * 22) + '"/>';
      });
    }
    if (c.man && c.manDir && c.manSeg === 'ab') {                // flow-direction chevrons on the A-B connecting line
      var toB = c.manDir > 0;
      [905, 990].forEach(function (xx) {
        o += '<g transform="translate(' + xx + ',190) rotate(' + (toB ? 180 : 0) + ')"><circle r="7" fill="' + FL[c.man].line + '" stroke="#0a0e16" stroke-width=".9"/><path d="M-2.5 -3.4 L2.2 0 L-2.5 3.4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>';
      });
    }
    o += '<g transform="translate(866,203) scale(.62)">' + valveV(0, 0, c.bV) + '</g>';
    o += '<g transform="translate(1030,203) scale(.62)">' + valveV(0, 0, c.aV) + '</g>';
    o += T(852, 184, 'B VALVE', { a: 'middle', m: 1, s: 7.5, c: c.bV ? 'var(--grn)' : 'var(--mut)' }) + T(1044, 184, 'A VALVE', { a: 'middle', m: 1, s: 7.5, c: c.aV ? 'var(--grn)' : 'var(--mut)' });
    // Pump B
    o += '<rect x="838" y="206" width="56" height="12" rx="2" fill="url(#rcMetalH)" stroke="#0a0e16"/><rect x="846" y="215" width="40" height="190" rx="4" fill="url(#rcCyl)" stroke="#0a0e16" stroke-width="1.2"/>';
    o += '<rect x="848" y="219" width="36" height="182" rx="3" fill="' + (c.P < -.05 ? '#070d16' : '#0a1420') + '"/>' + pumpFluid(848, c.B, 'oil', 'rcPumpB');
    o += '<rect x="838" y="405" width="56" height="14" rx="2" fill="url(#rcMetalH)" stroke="#0a0e16"/>';
    // Pump A
    o += '<rect x="1002" y="206" width="56" height="12" rx="2" fill="url(#rcMetalH)" stroke="#0a0e16"/><rect x="1010" y="215" width="40" height="190" rx="4" fill="url(#rcCyl)" stroke="#0a0e16" stroke-width="1.2"/>';
    o += '<rect x="1012" y="219" width="36" height="182" rx="3" fill="' + (c.P < -.05 ? '#070d16' : '#0a1420') + '"/>' + pumpFluid(1012, c.A, c.Af || 'gas', 'rcPumpA');
    o += '<rect x="1002" y="405" width="56" height="14" rx="2" fill="url(#rcMetalH)" stroke="#0a0e16"/>';
    o += '<line x1="856" y1="222" x2="856" y2="398" stroke="#eef4fb" stroke-width="1.2" opacity=".25"/><line x1="1020" y1="222" x2="1020" y2="398" stroke="#eef4fb" stroke-width="1.2" opacity=".25"/>';
    // sensor + readouts
    o += '<rect x="942" y="210" width="12" height="11" rx="1.5" fill="url(#rcMetalH)" stroke="#0a0e16"/><circle cx="948" cy="240" r="20" fill="url(#rcMetalH)" stroke="#0a0e16" stroke-width="1.3"/><circle cx="948" cy="240" r="14.5" fill="#0c1626" stroke="#2a3852"/>';
    var ang = -140 + 280 * clamp(c.P / 6000, 0, 1), a = ang * Math.PI / 180;
    o += '<line x1="948" y1="240" x2="' + r1(948 + 11 * Math.sin(a)) + '" y2="' + r1(240 - 11 * Math.cos(a)) + '" stroke="#46e0ff" stroke-width="1.8" stroke-linecap="round"/><circle cx="948" cy="240" r="2.4" fill="#8fa3c2"/>';
    o += T(948, 280, 'Pressure Sensor', { a: 'middle', s: 12, c: 'var(--txt2)' });
    o += T(948, 302, 'CELL PRESSURE', { a: 'middle', m: 1, s: 9.5, ls: .5, c: 'var(--mut)' });
    o += '<rect x="906" y="307" width="84" height="21" rx="4" fill="#0a1420" stroke="#3a9d63" stroke-width="1.2"/>' + T(948, 321.5, pf(c.P) + ' psig', { a: 'middle', m: 1, s: 11.5, w: 600, c: '#46d39a' });
    o += T(948, 348, 'CELL VOLUME', { a: 'middle', m: 1, s: 9.5, ls: .5, c: 'var(--mut)' });
    o += '<rect x="906" y="353" width="84" height="21" rx="4" fill="#0a1420" stroke="#8a6a20" stroke-width="1.2"/>' + T(948, 367.5, f2(tot) + ' cc', { a: 'middle', m: 1, s: 11.5, w: 600, c: '#e2c65a' });
    o += T(948, 392, 'TEMP ' + CFG.LAB_T + ' °C', { a: 'middle', m: 1, s: 9.5, ls: .5, c: 'var(--mut)' });
    o += T(866, 434, 'Pump B · ' + f2(c.B) + ' cc', { a: 'middle', s: 10, c: 'var(--txt2)' });
    o += T(1030, 434, 'Pump A · ' + f2(c.A) + ' cc', { a: 'middle', s: 10, c: 'var(--txt2)' });
    o += T(948, 449, 'capacity ' + CFG.CELL_CAP + ' cc per pump', { a: 'middle', m: 1, s: 8.5, c: 'var(--mut)' });
    o += T(948, 514, 'PVT CELL · CALIBRATED', { a: 'middle', m: 1, s: 11, ls: .9, c: 'var(--txt2)' });
    var cont = c.P < -.05 && tot < .01 ? 'EMPTY · VACUUM' : tot < .01 ? 'EMPTY' : (c.Af === 'oil' ? 'SEPARATOR OIL' : 'SEPARATOR GAS') + ' · ' + (c.stab >= 1 ? 'STABLE' : c.stab > 0 ? 'STABILIZING' : 'TRANSFER');
    o += T(948, 529, cont, { a: 'middle', m: 1, s: 9, ls: .5, c: tot < .01 ? 'var(--mut)' : c.Af === 'oil' ? '#c07f2e' : '#2f9d72' });
    o += '</g>';
    o += valveH(CELL_VALVE_X, CELL_IN[1], c.valve) + vtag(CELL_VALVE_X, CELL_IN[1] + 20, c.valve, 'middle');
    o += T(CELL_VALVE_X, CELL_IN[1] - 28, 'Cell inlet valve', { a: 'middle', s: 10.5, c: 'var(--txt2)' });
    return o + '</g>';
  }

  /* bottle interior (SampleBottle local coordinates). Sample side = CAP - water, from the top cap down to the
     piston; water always stays below the piston. The liquid lies on the side that is currently DOWN: its free
     surface is kept level (perpendicular to gravity) whatever the bottle angle, and the free gas / empty space
     fills the rest of the sample side. */
  function clipHalf(poly, n, c) {             // part of a convex polygon with dot(p, n) <= c
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      var da = a[0] * n[0] + a[1] * n[1] - c, db = b[0] * n[0] + b[1] * n[1] - c;
      if (da <= 0) out.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) { var k = da / (da - db); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
    }
    return out;
  }
  function parea(p) { var s = 0; for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  function pcen(p) { var x = 0, y = 0; p.forEach(function (q) { x += q[0]; y += q[1]; }); return [x / p.length, y / p.length]; }
  function ppath(p) { return p.length < 3 ? '' : 'M' + p.map(function (q) { return r1(q[0]) + ',' + r1(q[1]); }).join(' L') + ' Z'; }
  function bottleLayers(w, b) {
    var y0 = 134, yb = 338, PX = BOT_PX, X0 = 263, X1 = 337;
    var samp = Math.max(0, CFG.BOTTLE_CAP - b.water), pistY = y0 + samp * PX;
    var liq = clamp(b.oil, 0, samp), mix = b.mix || 0, tt = w.tt;
    var a = (b.ang || 0) * Math.PI / 180, n = [-Math.sin(a), -Math.cos(a)];     // local "up"
    var R = [[X0, y0], [X1, y0], [X1, pistY], [X0, pistY]], target = liq * PX * (X1 - X0);
    var ds = R.map(function (q) { return q[0] * n[0] + q[1] * n[1]; }), lo = Math.min.apply(null, ds), hi = Math.max.apply(null, ds), c = lo;
    if (target >= parea(R) - .01) c = hi; else if (target > .01) { for (var it = 0; it < 32; it++) { c = (lo + hi) / 2; if (parea(clipHalf(R, n, c)) < target) lo = c; else hi = c; } }
    var liqP = target > .01 ? clipHalf(R, n, c) : [], topP = target >= parea(R) - .01 ? [] : clipHalf(R, [-n[0], -n[1]], -c);
    var o = '<g clip-path="url(#rcbChm)">';
    o += '<rect x="263" y="' + r1(pistY + 12) + '" width="74" height="' + r1(Math.max(0, yb - pistY - 12)) + '" fill="url(#rcWaterG)"/>';
    if (liqP.length > 2) {
      o += '<path d="' + ppath(liqP) + '" fill="url(#' + (b.kind === 'oil' || mix < .02 ? 'rcOilG' : 'rcMixG') + ')"/>';
      if (b.kind !== 'oil' && mix >= .02 && mix < 1) o += '<path d="' + ppath(liqP) + '" fill="url(#rcOilG)" opacity="' + r1((1 - mix) * 100) / 100 + '"/>';
    }
    var gasOn = b.q > 0 && topP.length > 2 && parea(topP) > 4;
    if (gasOn) {
      var ga = .5 + .45 * clamp(b.P / CFG.OIL_P, 0, 1), gp = ppath(topP);
      o += '<path d="' + gp + '" fill="url(#rcGasG)" opacity="' + r1(ga * 100) / 100 + '"/><path d="' + gp + '" fill="url(#rcGasDots)"/>';
    }
    // dispersed bubbles while inverting: rise from inside the oil toward the free gas, shrinking as they dissolve
    if (b.kind === 'recomb' && b.q > 0 && mix > 0 && mix < 1 && liqP.length > 2 && w.rockP > 0) {
      var nb = Math.round(34 * Math.min(1, (1 - mix) * 1.35) * Math.min(1, w.rockP / .05));
      for (var i = 0; i < nb; i++) {
        var sx = X0 + 4 + (X1 - X0 - 8) * ((i * .7548776 + .31) % 1), sy = y0 + 3 + (pistY - y0 - 6) * ((i * .5698403 + .17) % 1);
        var d0 = sx * n[0] + sy * n[1]; if (d0 >= c - 2) continue;
        var ph = (tt * (.32 + (i % 5) * .07) + i * .37) % 1, L = c - d0;
        var rr = (1.3 + (i % 3) * .9) * (1 - .7 * mix);
        o += '<circle cx="' + r1(sx + n[0] * L * ph + 1.5 * Math.sin(tt * 3 + i)) + '" cy="' + r1(sy + n[1] * L * ph) + '" r="' + r1(rr) + '" fill="#e9fff4" stroke="#2f9d72" stroke-width=".5" opacity="' + r1((1 - ph * .45) * 90) / 100 + '"/>';
      }
    }
    // oil entering at the top port and falling through the gas onto the oil (upright only)
    var gasH = b.q > 0 ? (samp - liq) * PX : 0;
    if (b.drops && gasOn && !b.ang) {
      o += '<rect x="297" y="' + y0 + '" width="6" height="' + r1(Math.max(0, gasH)) + '" fill="#d8973a" opacity=".35"/>';
      for (var j = 0; j < 5; j++) {
        var yd = y0 + ((tt * 60 + j * gasH / 5) % Math.max(4, gasH));
        o += '<ellipse cx="300" cy="' + r1(yd) + '" rx="2.6" ry="3.6" fill="#d8973a" stroke="#8a5a1a" stroke-width=".5"/>';
      }
    }
    o += '<rect x="263" y="' + r1(pistY) + '" width="74" height="12" fill="url(#rcbMetal)" stroke="#0a0e16"/><rect x="263" y="' + r1(pistY + 1.6) + '" width="74" height="2" fill="#eef4fb" opacity=".45"/>';
    o += '</g>';
    // phase letters (counter-rotated so they stay readable)
    var lab = function (p, s, sz, col) {
      return '<text x="' + r1(p[0]) + '" y="' + r1(p[1] + sz * .35) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="' + sz + '" font-weight="700" fill="' + col + '"' +
        (b.ang ? ' transform="rotate(' + r1(-b.ang) + ' ' + r1(p[0]) + ' ' + r1(p[1]) + ')"' : '') + '>' + esc(s) + '</text>';
    };
    if (topP.length > 2 && parea(topP) > 74 * 20) o += lab(pcen(topP), gasOn ? 'G' : 'EMPTY', gasOn ? 16 : 10, gasOn ? '#0d3b28' : '#7f93b3');
    if (liqP.length > 2 && parea(liqP) > 74 * 20) o += lab(pcen(liqP), mix >= 1 ? 'SINGLE PHASE' : 'O', mix >= 1 ? 8.5 : 16, '#3d2606');
    var wh = yb - pistY - 12;
    if (wh > 18) o += lab([300, pistY + 12 + wh / 2], 'W', 16, '#e6f3ff');
    o += '<rect x="268" y="138" width="6" height="196" rx="3" fill="#fff" opacity=".16"/>';
    return o;
  }
  /* heating jacket (stage 9), SampleBottle local coordinates. Cutaway: only the two side shells, the end
     collars and dashed cut edges are drawn, so the bore (sample, piston, water, mixing) stays in view.
     Drawn inside the bottle's rotation group, so it turns with the bottle. */
  function jacketMarkup(w) {
    var on = !!w.heat, pul = on ? .5 + .35 * Math.sin(w.tt * 3.2) : .25;
    var o = '<g opacity="' + r1(w.jacket * 100) / 100 + '">';
    [244, 342].forEach(function (x) {
      o += '<rect x="' + x + '" y="122" width="14" height="230" rx="5" fill="url(#rcJacket)" stroke="#0a0e16" stroke-width="1"/>';
      for (var y = 132; y <= 342; y += 13) o += '<line x1="' + (x + 3) + '" y1="' + y + '" x2="' + (x + 11) + '" y2="' + y + '" stroke="#ffb070" stroke-width="1.6" stroke-linecap="round" opacity="' + r1(pul * 100) / 100 + '"/>';
    });
    o += '<rect x="244" y="117" width="112" height="9" rx="3" fill="url(#rcJacket)" stroke="#0a0e16" stroke-width="1"/>';
    o += '<rect x="244" y="348" width="112" height="9" rx="3" fill="url(#rcJacket)" stroke="#0a0e16" stroke-width="1"/>';
    o += '<line x1="258.5" y1="126" x2="258.5" y2="348" stroke="#e7752e" stroke-width="1.2" stroke-dasharray="4 3"/>';
    o += '<line x1="341.5" y1="126" x2="341.5" y2="348" stroke="#e7752e" stroke-width="1.2" stroke-dasharray="4 3"/>';
    return o + '</g>';
  }
  function drawJacketLabel(w) {
    if (!(w.jacket > .01)) return '';
    var x = 632, y = 196, on = !!w.heat, la = Math.min(w.jacket, w.stand);   // label once the bottle is on the stand
    if (la <= .01) return '';
    var o = '<g opacity="' + r1(la * 100) / 100 + '">';
    o += T(x, y, 'Heating Jacket', { s: 12.5, w: 600, c: 'var(--txt)' });
    o += T(x, y + 13, 'cutaway · turns with the bottle', { s: 9.5, c: 'var(--mut)' });
    var pill = on ? (CFG.JACKET_T != null ? 'HEATING · ' + CFG.JACKET_T + ' °C' : 'HEATING · ON') : 'OFF';
    var pw = pill.length * 5.6 + 16;
    o += '<rect x="' + x + '" y="' + (y + 19) + '" width="' + r1(pw) + '" height="14" rx="7" fill="' + (on ? 'rgba(231,117,46,.16)' : 'rgba(127,147,179,.12)') + '" stroke="' + (on ? '#e7752e' : 'rgba(127,147,179,.55)') + '" stroke-width=".8"/>';
    o += T(x + pw / 2, y + 29.5, pill, { a: 'middle', m: 1, s: 8.5, w: 600, ls: .5, c: on ? '#f0913f' : 'var(--mut)' });
    return o + '</g>';
  }
  function bottlePorts(b, x, y) { return { top: [x, y], bot: [x, y + (417 - 74) * BOT_S] }; }
  function drawBottle(w) {
    var b = w.bot; if (!b.kind || b.a <= .01) return '';
    var x = b.x, y = b.y, tr = SampleBottle.place(x, y, BOT_S);
    var shell = SampleBottle.markup({ p: 'rcb', x: x, y: y, s: BOT_S, sample: 'opacity:0', buffer: 'opacity:0', piston: 'display:none', ring: b.top ? '#46d39a' : '#8fa3c2', shadow: !b.ang && w.stand <= .01 });
    var body = shell + '<g transform="' + tr + '">' + bottleLayers(w, b) + (w.jacket > .01 ? jacketMarkup(w) : '') + '</g>';
    var o = '<g opacity="' + r1(b.a * 100) / 100 + '">' + glow(hl(w, 'bot'), x - 60, y - 14, 120, 410);
    if (b.ang) o += '<g transform="rotate(' + r1(b.ang) + ' ' + r1(x) + ' ' + r1(y + PIV_DY) + ')">' + body + '</g>';
    else o += body;
    var name = b.kind === 'oil' ? 'Separator Oil Bottle' : 'Recombination Bottle';
    if (w.stand <= 0) {
      var ty = y + (97 - 74) * BOT_S, by = y + (384 - 74) * BOT_S;
      o += vtag(x - 50, ty + 3, b.top, 'end') + T(x - 50, ty - 8, 'SAMPLE VALVE', { a: 'end', m: 1, s: 8, c: 'var(--mut)' });
      o += vtag(x - 50, by + 3, b.bv, 'end') + T(x - 50, by - 8, 'HYDRAULIC VALVE', { a: 'end', m: 1, s: 8, c: 'var(--mut)' });
      var lx = x + 58;
      o += T(lx, 256, name, { s: 14, w: 600, c: 'var(--txt)' });
      o += T(lx, 271, 'floating piston · ' + CFG.BOTTLE_CAP + ' cc', { s: 10.5, c: 'var(--mut)' });
      o += lcd(lx, 294, 134, 'BOTTLE P', pf(b.P) + ' psig', '#7fe0b4', '#2f9d72');
      var yy = 338, row = function (i, l, v, c) { return T(lx, yy + i * 15, l, { m: 1, s: 9.5, c: c }) + T(lx + 134, yy + i * 15, v, { a: 'end', m: 1, s: 10, w: 600, c: 'var(--txt)' }); };
      if (b.kind === 'recomb') {
        o += row(0, 'Gas charge', f2(b.q) + ' cc', FL.gas.line);
        o += T(lx, yy + 12, '(measured at 5,000 psig)', { m: 1, s: 8, c: 'var(--mut)' });
        o += row(2, 'Oil charged', f2(b.oil) + ' cc', '#c07f2e');
        o += row(3, 'Water', f1(b.water) + ' cc', FL.water.line);
      } else {
        o += row(0, 'Oil', f2(b.oil) + ' cc', '#c07f2e');
        o += row(1, 'Water', f1(b.water) + ' cc', FL.water.line);
        o += T(lx, yy + 30, b.P > CFG.OIL_P0 + 1 ? 'pressurized from separator conditions' : 'at separator conditions (' + n0(CFG.OIL_P0) + ' psig)', { m: 1, s: 8, c: 'var(--mut)' });
      }
    }
    return o + '</g>';
  }

  function drawStand(w) {
    if (w.stand <= .01) return '';
    var x = STAND.x, y = STAND.py;
    var o = '<g opacity="' + r1(w.stand * 100) / 100 + '">';
    o += '<ellipse cx="' + x + '" cy="618" rx="130" ry="7" fill="rgba(0,0,0,.18)"/>';
    o += '<rect x="' + (x - 120) + '" y="604" width="240" height="12" rx="3" fill="url(#rcMetal)" stroke="#0a0e16"/>';
    // two uprights either side of the bottle, carrying the pivot shaft
    o += '<rect x="' + (x - 78) + '" y="' + (y - 6) + '" width="12" height="' + (610 - y) + '" fill="url(#rcMetalH)" stroke="#0a0e16"/>';
    o += '<rect x="' + (x + 66) + '" y="' + (y - 6) + '" width="12" height="' + (610 - y) + '" fill="url(#rcMetalH)" stroke="#0a0e16"/>';
    o += '<rect x="' + (x - 78) + '" y="' + (y - 4) + '" width="156" height="8" rx="3" fill="url(#rcMetal)" stroke="#0a0e16" opacity=".9"/>';
    o += T(x + 120, 632, 'INVERSION STAND', { a: 'end', m: 1, s: 9, ls: .6, c: 'var(--mut)' });
    return o + '</g>';
  }
  function standHub() { return '<circle cx="' + STAND.x + '" cy="' + STAND.py + '" r="11" fill="url(#rcMetal)" stroke="#0a0e16" stroke-width="1.3"/><circle cx="' + STAND.x + '" cy="' + STAND.py + '" r="4" fill="#0a1420"/>'; }

  function rotPt(p, ang, c) {
    var a = ang * Math.PI / 180, dx = p[0] - c[0], dy = p[1] - c[1];
    return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
  }
  function drawHose(w) {
    var b = w.bot, port = bottlePorts(b, b.x, b.y).bot;
    if (b.ang) port = rotPt(port, b.ang, [b.x, b.y + PIV_DY]);
    var px = w.pump.x + PUMP_W + 10, py = PUMP_PORT_Y;
    var dir = rotPt([0, 1], b.ang || 0, [0, 0]);
    var c1 = [port[0] + dir[0] * 80, port[1] + dir[1] * 80];
    var d = 'M' + r1(port[0]) + ',' + r1(port[1]) + ' C' + r1(c1[0]) + ',' + r1(c1[1]) + ' ' + r1(px + 120) + ',' + py + ' ' + px + ',' + py;
    var ha = Math.min(w.pump.a, w.L.hyd.part); if (ha <= .01) return '';
    var o = '<g opacity="' + r1(ha * 100) / 100 + '"><path d="' + d + '" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="#2c3a50" stroke-width="5.6" stroke-linecap="round"/>';
    o += '<path d="' + d + '" fill="none" stroke="' + FL.water.line + '" stroke-width="3" stroke-linecap="round"/>';
    if (w.L.hyd.flow) o += '<path d="' + d + '" fill="none" stroke="' + FL.water.dash + '" stroke-width="1.8" stroke-dasharray="3 10" stroke-dashoffset="' + r1(w.L.hyd.flow * w.tt * 26) + '"/>';
    o += T(272, 640, 'flexible line · bottle water side', { m: 1, s: 9, c: 'var(--mut)' });
    return o + '</g>';
  }

  function card(x, y, wd, ht, a) {
    return '<g opacity="' + r1(a * 100) / 100 + '"><rect x="' + x + '" y="' + y + '" width="' + wd + '" height="' + ht + '" rx="14" fill="var(--panel)" stroke="var(--line2)" stroke-width="1.2"/>';
  }
  function drawAgCard(w) {
    if (w.agCard <= .01) return '';
    var x = 110, y = 176, wd = 440, ht = 330;
    var o = card(x, y, wd, ht, w.agCard);
    o += T(x + 22, y + 32, 'PVT CELL AGITATION', { m: 1, s: 11, w: 600, ls: 1.2, c: 'var(--blue)' });
    o += T(x + 22, y + 52, 'Max stroke = free space in the receiving pump: ' + CFG.CELL_CAP + ' − ' + CFG.OIL_B + ' = ' + AGIT_DV + ' cc (capacity ' + CFG.CELL_CAP + ' cc each)', { s: 11, c: 'var(--mut)' });
    var labs = ['A → B', 'B → A', 'A → B', 'B → A'];
    for (var i = 0; i < 4; i++) {
      var sx = x + 22 + i * 102, done = w.stroke > i + 1 || (w.stroke === i + 1 && !w.strokeDir && w.cyc > i), on = w.stroke === i + 1 && w.strokeDir;
      o += '<rect x="' + sx + '" y="' + (y + 72) + '" width="92" height="52" rx="9" fill="' + (on ? 'rgba(77,157,255,.10)' : done ? 'rgba(70,211,154,.08)' : 'var(--icard)') + '" stroke="' + (on ? 'var(--blue)' : done ? 'rgba(70,211,154,.55)' : 'var(--line2)') + '"/>';
      o += T(sx + 46, y + 89, 'STROKE ' + (i + 1), { a: 'middle', m: 1, s: 8.5, ls: .6, c: 'var(--mut)' });
      o += T(sx + 46, y + 106, labs[i], { a: 'middle', m: 1, s: 13, w: 600, c: on ? 'var(--blue)' : done ? 'var(--grn)' : 'var(--txt2)' });
      o += T(sx + 46, y + 119, AGIT_DV + ' cc', { a: 'middle', m: 1, s: 8.5, c: 'var(--mut)' });
    }
    var c = w.cell;
    o += T(x + 22, y + 152, 'PUMP A', { m: 1, s: 9, ls: .6, c: 'var(--mut)' }) + T(x + 22, y + 176, f2(c.A) + ' cc', { m: 1, s: 18, w: 600, c: 'var(--amb)' });
    o += T(x + 160, y + 152, 'PUMP B', { m: 1, s: 9, ls: .6, c: 'var(--mut)' }) + T(x + 160, y + 176, f2(c.B) + ' cc', { m: 1, s: 18, w: 600, c: 'var(--amb)' });
    o += T(x + 298, y + 152, 'PRESSURE', { m: 1, s: 9, ls: .6, c: 'var(--mut)' }) + T(x + 298, y + 176, n0(c.P) + ' psig', { m: 1, s: 18, w: 600, c: 'var(--grn)' });
    o += T(x + 22, y + 210, 'READING STABILITY', { m: 1, s: 9, ls: .6, c: 'var(--mut)' });
    o += '<rect x="' + (x + 22) + '" y="' + (y + 218) + '" width="396" height="8" rx="4" fill="var(--icard)" stroke="var(--line)"/>';
    o += '<rect x="' + (x + 22) + '" y="' + (y + 218) + '" width="' + r1(396 * c.stab) + '" height="8" rx="4" fill="' + (c.stab >= 1 ? 'var(--grn)' : 'var(--amb)') + '"/>';
    o += T(x + 22, y + 246, c.stab >= 1 ? 'Stable at 3,000 psig · ' + CFG.LAB_T + ' °C · total ' + f1(c.A + c.B) + ' cc' : w.stroke ? 'Agitating: total stays ' + f1(c.A + c.B) + ' cc' : 'Waiting for agitation', { m: 1, s: 10.5, w: 600, c: c.stab >= 1 ? 'var(--grn)' : 'var(--mut)' });
    o += T(x + 22, y + 276, 'Visible free gas', { s: 11.5, c: 'var(--txt2)' }) + T(x + 418, y + 276, c.stab >= 1 ? 'none visible (simulated stable state)' : '—', { a: 'end', m: 1, s: 10.5, c: c.stab >= 1 ? 'var(--grn)' : 'var(--mut)' });
    o += T(x + 22, y + 304, 'The readings are accepted only once they are stable.', { s: 10.5, c: 'var(--mut)' });
    return o + '</g>';
  }

  /* oil transfer record (stage 8): initial -> final pump volumes decide the transferred amount */
  function drawXfCard(w) {
    if (w.xfCard <= .01) return '';
    var x = 28, y = 110, wd = 278, ht = 336, s = w.xf, c = w.cell;
    var o = card(x, y, wd, ht, w.xfCard) + glow(hl(w, 'xf'), x - 4, y - 4, wd + 8, ht + 8);
    o += T(x + 16, y + 26, 'OIL TRANSFER RECORD', { m: 1, s: 10.5, w: 600, ls: 1.1, c: 'var(--blue)' });
    o += T(x + 16, y + 43, 'Pump volumes at 3,000 psig · ' + CFG.LAB_T + ' °C', { s: 10.5, c: 'var(--mut)' });
    var cx = [x + 16, x + 138, x + 200, x + wd - 14];
    o += T(cx[0], y + 68, 'STEP', { m: 1, s: 8, ls: .5, c: 'var(--mut)' }) + T(cx[1], y + 68, 'PUMP A', { a: 'middle', m: 1, s: 8, ls: .5, c: 'var(--mut)' }) +
      T(cx[2], y + 68, 'PUMP B', { a: 'middle', m: 1, s: 8, ls: .5, c: 'var(--mut)' }) + T(cx[3], y + 68, 'BOTTLE', { a: 'end', m: 1, s: 8, ls: .5, c: 'var(--mut)' });
    var liveA = f1(c.A), liveB = f1(c.B);
    var rows = [
      { n: '1 · A → bottle', p: s.s1, A: ['100', s.s1 >= 1 ? '1' : liveA], B: ['80', '80'], t: s.s1 >= 1 ? '99' : f1(OIL_T1 * ease(s.s1)), note: '100 − 1 = 99 cc' },
      { n: '2 · B → A refill', p: s.s2, A: ['1', s.s2 >= 1 ? '81' : liveA], B: ['80', s.s2 >= 1 ? '0' : liveB], t: '0', note: 'bottle valve closed' },
      { n: '3 · A → bottle', p: s.s3, A: ['81', s.s3 >= 1 ? String(CFG.OIL_A_END) : liveA], B: ['0', '0'], t: s.s3 >= 1 ? String(OIL_T2) : f1(OIL_T2 * ease(s.s3)), note: '81 − ' + CFG.OIL_A_END + ' = ' + OIL_T2 + ' cc (' + CFG.OIL_A_END + ' cc stays)' }
    ];
    rows.forEach(function (r, i) {
      var yy = y + 80 + i * 62, act = r.p > 0 && r.p < 1, done = r.p >= 1, pend = r.p <= 0;
      o += '<rect x="' + (x + 10) + '" y="' + yy + '" width="' + (wd - 20) + '" height="54" rx="8" fill="' + (act ? 'rgba(77,157,255,.08)' : 'var(--icard)') + '" stroke="' + (act ? 'var(--blue)' : done ? 'rgba(70,211,154,.5)' : 'var(--line)') + '"/>';
      var col = pend ? 'var(--mut)' : 'var(--txt)';
      o += T(cx[0], yy + 20, r.n, { s: 11, w: 600, c: act ? 'var(--blue)' : done ? 'var(--txt)' : 'var(--mut)' });
      o += T(cx[0], yy + 40, pend ? 'pending' : r.note, { m: 1, s: 8.5, c: done ? 'var(--grn)' : 'var(--mut)' });
      o += T(cx[1], yy + 22, pend ? '—' : r.A[0] + ' → ' + r.A[1], { a: 'middle', m: 1, s: 10, w: 600, c: col });
      o += T(cx[2], yy + 22, pend ? '—' : r.B[0] === r.B[1] ? r.B[0] : r.B[0] + ' → ' + r.B[1], { a: 'middle', m: 1, s: 10, w: 600, c: col });
      o += T(cx[3], yy + 22, pend ? '—' : r.t + ' cc', { a: 'end', m: 1, s: 11, w: 700, c: pend ? 'var(--mut)' : i === 1 ? 'var(--mut)' : 'var(--amb)' });
    });
    var tot = OIL_T1 * ease(s.s1) + OIL_T2 * ease(s.s3), fin = s.s3 >= 1;
    o += '<line x1="' + (x + 12) + '" y1="' + (y + 274) + '" x2="' + (x + wd - 12) + '" y2="' + (y + 274) + '" stroke="var(--line2)"/>';
    o += T(x + 16, y + 296, 'Oil in the bottle', { s: 11.5, w: 600, c: 'var(--txt)' });
    o += T(x + wd - 14, y + 297, fin ? OIL_T1 + ' + ' + OIL_T2 + ' = ' + OIL_IN + ' cc' : f1(tot) + ' cc', { a: 'end', m: 1, s: 12.5, w: 700, c: fin ? 'var(--grn)' : 'var(--amb)' });
    o += T(x + 16, y + 320, 'Transferred = initial − final pump volume', { m: 1, s: 8.5, c: 'var(--mut)' });
    return o + '</g>';
  }

  function drawRockCard(w) {
    if (w.rockCard <= .01) return '';
    var x = 760, y = 150, wd = 400, ht = 360, b = w.bot;
    var o = card(x, y, wd, ht, w.rockCard);
    if (w.summary > 0) {
      o += '<g opacity="' + r1(w.summary * 100) / 100 + '">';
      o += T(x + 22, y + 32, 'RECOMBINATION SUMMARY', { m: 1, s: 11, w: 600, ls: 1.2, c: 'var(--grn)' });
      var rows = [
        ['Gas charge', f2(CFG.GAS_TO_BOT) + ' cc', 'measured at ' + n0(CFG.GAS_P) + ' psig · ' + CFG.LAB_T + ' °C · PVT cell'],
        ['Oil to bottle', OIL_T1 + ' + ' + OIL_T2 + ' = ' + OIL_IN + ' cc', 'measured at ' + n0(CFG.OIL_P) + ' psig · ' + CFG.OIL_A_END + ' cc left in Pump A'],
        ['Working pressure', n0(b.P) + ' psig', 'held by the water pump · reservoir pressure ' + n0(CFG.RES_P) + ' psig'],
        ['Mixing status', 'Single phase', 'uniform, no visible free gas']
      ];
      rows.forEach(function (r, i) {
        var yy = y + 66 + i * 58;
        o += '<rect x="' + (x + 18) + '" y="' + (yy - 18) + '" width="' + (wd - 36) + '" height="50" rx="9" fill="var(--icard)" stroke="var(--line)"/>';
        o += T(x + 32, yy, r[0], { s: 11.5, c: 'var(--mut)' }) + T(x + wd - 32, yy + 2, r[1], { a: 'end', m: 1, s: 15, w: 600, c: i === 3 ? 'var(--grn)' : 'var(--txt)' });
        o += T(x + 32, yy + 20, r[2], { m: 1, s: 9.5, c: 'var(--mut)' });
      });
      o += T(x + 22, y + 306, 'Final mixture volume is not reported: gas dissolves in', { s: 10.5, c: 'var(--mut)' });
      o += T(x + 22, y + 321, 'the oil, so the two volumes are not additive.', { s: 10.5, c: 'var(--mut)' });
      o += T(x + 22, y + 342, 'Quantities are demonstration inputs, not a validated GOR ratio.', { s: 10.5, c: 'var(--amb)' });
      return o + '</g></g>';
    }
    o += T(x + 22, y + 32, '180° INVERSION AGITATION', { m: 1, s: 11, w: 600, ls: 1.2, c: 'var(--blue)' });
    o += T(x + 22, y + 52, 'Slow inversion 0° → 180° → 0° · ' + CFG.ROCK_N + ' cycles', { s: 11.5, c: 'var(--mut)' });
    // angle gauge: 0° = upright (needle up), 180° = inverted (needle down)
    var cx = x + 100, cy = y + 160, R = 62, ang = b.ang || 0, aa = ang * Math.PI / 180;
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="var(--line2)" stroke-width="1.5" stroke-dasharray="3 4"/>';
    o += '<path d="M' + cx + ',' + (cy - R) + ' A' + R + ',' + R + ' 0 0 1 ' + cx + ',' + (cy + R) + '" fill="none" stroke="var(--line2)" stroke-width="3"/>';
    if (ang > .5) o += '<path d="M' + cx + ',' + (cy - R) + ' A' + R + ',' + R + ' 0 0 1 ' + r1(cx + R * Math.sin(aa)) + ',' + r1(cy - R * Math.cos(aa)) + '" fill="none" stroke="var(--blue)" stroke-width="3"/>';
    o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + r1(cx + (R - 6) * Math.sin(aa)) + '" y2="' + r1(cy - (R - 6) * Math.cos(aa)) + '" stroke="var(--blue)" stroke-width="3" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="5" fill="var(--blue)"/>';
    o += T(cx, cy - R - 8, '0°', { a: 'middle', m: 1, s: 9.5, c: 'var(--mut)' }) + T(cx + R + 8, cy + 4, '90°', { m: 1, s: 9.5, c: 'var(--mut)' }) + T(cx, cy + R + 16, '180°', { a: 'middle', m: 1, s: 9.5, c: 'var(--mut)' });
    o += T(cx - 20, cy + 26, Math.round(ang) + '°', { a: 'end', m: 1, s: 13, w: 600, c: 'var(--txt)' });
    var cyc = Math.min(CFG.ROCK_N, w.cyc + (w.rockP > 0 && w.rockP < 1 ? 1 : 0));
    o += T(x + 222, y + 100, 'CYCLE', { m: 1, s: 9, ls: .6, c: 'var(--mut)' }) + T(x + 222, y + 128, cyc + ' / ' + CFG.ROCK_N, { m: 1, s: 22, w: 600, c: 'var(--txt)' });
    var stable = (b.settle || 0) >= 1 || w.summary > 0;
    o += T(x + 222, y + 154, 'WORKING PRESSURE', { m: 1, s: 9, ls: .6, c: 'var(--mut)' }) + T(x + 222, y + 178, n0(b.P) + ' psig', { m: 1, s: 17, w: 600, c: 'var(--grn)' });
    o += T(x + 222, y + 194, stable ? 'STABLE · TARGET ' + n0(CFG.WORK_P) : w.rockP > 0 ? 'SETTLING · TARGET ' + n0(CFG.WORK_P) : 'TARGET ' + n0(CFG.WORK_P) + ' psig', { m: 1, s: 8.5, w: 600, ls: .5, c: stable ? 'var(--grn)' : 'var(--mut)' });
    o += T(x + 222, y + 222, 'RESERVOIR PRESSURE', { m: 1, s: 9, ls: .6, c: 'var(--mut)' }) + T(x + 222, y + 240, n0(CFG.RES_P) + ' psig (reference)', { m: 1, s: 11.5, w: 600, c: 'var(--txt2)' });
    o += T(x + 22, y + 256, 'MIXING', { m: 1, s: 9, ls: .6, c: 'var(--mut)' });
    o += '<rect x="' + (x + 22) + '" y="' + (y + 264) + '" width="356" height="8" rx="4" fill="var(--icard)" stroke="var(--line)"/>';
    o += '<rect x="' + (x + 22) + '" y="' + (y + 264) + '" width="' + r1(356 * (b.mix || 0)) + '" height="8" rx="4" fill="' + ((b.mix || 0) >= 1 ? 'var(--grn)' : 'var(--blue)') + '"/>';
    var st = (b.mix || 0) >= 1 ? 'Single phase · stable at ' + n0(CFG.WORK_P) + ' psig' : (b.mix || 0) > 0 ? 'Gas bubbles dispersing through the oil, shrinking' : 'Free gas above the oil (not yet mixed)';
    o += T(x + 22, y + 294, st, { m: 1, s: 10.5, w: 600, c: (b.mix || 0) >= 1 ? 'var(--grn)' : 'var(--txt2)' });
    o += T(x + 22, y + 322, 'The water pump holds the ' + n0(CFG.WORK_P) + ' psig working pressure on the', { s: 10.5, c: 'var(--mut)' });
    o += T(x + 22, y + 337, 'water side; it advances (piston moves) as the gas dissolves.', { s: 10.5, c: 'var(--mut)' });
    return o + '</g>';
  }

  function hydPts(w) {
    var b = w.L.hyd.to === 'bot' && w.bot.kind, x = b ? w.bot.x : w.ti.x;
    var yb = b ? w.bot.y + (417 - 74) * BOT_S : 604;
    var pp = w.pump.x + PUMP_W + 10;
    return [[x, yb], [x, 626], [pp + 30, 626], [pp + 30, PUMP_PORT_Y], [pp, PUMP_PORT_Y]];
  }
  function cellPts(w) {
    var useBot = w.bot.kind && w.bot.a > .01 && w.k >= 4;
    var x = useBot ? w.bot.x : w.ti.x, y = useBot ? w.bot.y : PORT_Y;
    return [[x, y], [x, CELL_IN[1]], CELL_IN];
  }

  function scene(w) {
    var o = '';
    // --- back: lines
    if (w.gsp.a > .01) {
      // GSP -> booster inlet (left) ; booster outlet (right) -> titanium top
      o += tube([[GSP_X, 160], [GSP_X, 120], [BOO.riseX, 120], [BOO.riseX, BOO.portY], [BOO.inX, BOO.portY]], w.L.gas1, w.tt, w.k === 0);
      o += tube([[BOO.outX, BOO.portY], [BOO.dropX, BOO.portY], [BOO.dropX, 120], [w.ti.x, 120], [w.ti.x, 190]], w.L.gas2, w.tt, w.k === 0);
    }
    if (w.hose) o += drawHose(w);
    else if (w.pump.a > .01) {
      var hL = { part: w.L.hyd.part, c: 'water', flow: w.L.hyd.flow, a: Math.min(w.L.hyd.a, w.pump.a) };
      o += tube(hydPts(w), hL, w.tt, w.k === 0);
    }
    if (w.cell.a > .01) {
      var cL = { part: w.L.cellL.part, c: w.L.cellL.c, flow: w.L.cellL.flow, a: Math.min(w.L.cellL.a, w.cell.a) };
      o += tube(cellPts(w), cL, w.tt, true);
    }
    o += drawVacLine(w);
    // --- equipment (vacuum pump first = behind)
    o += drawVac(w);
    o += drawGSP(w) + drawBooster(w) + drawBooValves(w);
    o += drawStand(w);
    o += drawTi(w) + drawBottle(w) + drawPump(w) + drawCell(w);
    if (w.stand > .01) o += '<g opacity="' + r1(w.stand * 100) / 100 + '">' + standHub() + '</g>';
    o += drawJacketLabel(w);
    o += drawAgCard(w) + drawXfCard(w) + drawRockCard(w);
    if (w.summary > 0) {
      o += '<g opacity="' + r1(w.summary * 100) / 100 + '"><rect x="130" y="104" width="940" height="36" rx="20" fill="rgba(70,211,154,.14)" stroke="#2f9d72" stroke-width="1.3"/>' +
        T(600, 127.5, DONE_MSG, { a: 'middle', s: 13, w: 600, c: 'var(--grn)' }) + '</g>';
    }
    return o;
  }

  function defs() {
    var sb = (window.SampleBottle ? SampleBottle.defs('rcb') : '').replace(/sc-camel-view-box/g, 'viewBox');
    return '<defs>' + sb +
      '<linearGradient id="rcMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3c1d8"/><stop offset=".5" stop-color="#7e90b0"/><stop offset="1" stop-color="#3a485f"/></linearGradient>' +
      '<linearGradient id="rcMetalH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"/><stop offset=".42" stop-color="#b3c1d8"/><stop offset=".58" stop-color="#7e90b0"/><stop offset="1" stop-color="#1f2a3e"/></linearGradient>' +
      '<linearGradient id="rcCyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"/><stop offset=".2" stop-color="#8094b2"/><stop offset=".5" stop-color="#aebcd2"/><stop offset=".8" stop-color="#54657f"/><stop offset="1" stop-color="#222c3e"/></linearGradient>' +
      '<linearGradient id="rcCylG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#34594a"/><stop offset=".25" stop-color="#6fa58c"/><stop offset=".5" stop-color="#9cc9b4"/><stop offset=".8" stop-color="#4a7a64"/><stop offset="1" stop-color="#1f3a2e"/></linearGradient>' +
      '<linearGradient id="rcTi" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#474b52"/><stop offset=".22" stop-color="#8e929a"/><stop offset=".5" stop-color="#c9ccd2"/><stop offset=".78" stop-color="#6f737b"/><stop offset="1" stop-color="#2e3238"/></linearGradient>' +
      '<linearGradient id="rcSteelV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6dfeb"/><stop offset=".45" stop-color="#a6b4c8"/><stop offset="1" stop-color="#5d6d86"/></linearGradient>' +
      '<linearGradient id="rcAirDrive" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d8fbf"/><stop offset=".5" stop-color="#3f6394"/><stop offset="1" stop-color="#27456f"/></linearGradient>' +
      '<linearGradient id="rcPumpBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"/><stop offset=".25" stop-color="#8094b2"/><stop offset=".55" stop-color="#9fb0c8"/><stop offset=".85" stop-color="#54657f"/><stop offset="1" stop-color="#26324a"/></linearGradient>' +
      '<linearGradient id="rcPipe" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#41526c"/><stop offset=".5" stop-color="#9cb0cd"/><stop offset="1" stop-color="#232f44"/></linearGradient>' +
      '<linearGradient id="rcGasG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3f8ee"/><stop offset="1" stop-color="#8fd6b4"/></linearGradient>' +
      '<pattern id="rcGasDots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="3" r=".9" fill="#2f9d72" opacity=".45"/><circle cx="7.5" cy="7.5" r=".7" fill="#2f9d72" opacity=".4"/></pattern>' +
      '<linearGradient id="rcWaterG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa6d8"/><stop offset="1" stop-color="#2f6f9c"/></linearGradient>' +
      '<linearGradient id="rcOilG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7b15a"/><stop offset="1" stop-color="#c07f2e"/></linearGradient>' +
      '<linearGradient id="rcJacket" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6a3514"/><stop offset=".5" stop-color="#c8662a"/><stop offset="1" stop-color="#5a2c10"/></linearGradient>' +
      '<linearGradient id="rcMixG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ecc377"/><stop offset="1" stop-color="#cf9442"/></linearGradient>' +
      '<pattern id="rcOilPat" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#d8a23f"/><circle cx="4.5" cy="4.5" r="1.1" fill="#f2d879" opacity=".6"/></pattern>' +
      '<pattern id="rcVacDots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="#7f93b3" opacity=".35"/><circle cx="6" cy="6" r=".5" fill="#7f93b3" opacity=".3"/></pattern>' +
      '<clipPath id="rcPumpA"><rect x="1012" y="219" width="36" height="182" rx="3"/></clipPath>' +
      '<clipPath id="rcPumpB"><rect x="848" y="219" width="36" height="182" rx="3"/></clipPath>' +
      '</defs>';
  }


  /* ------------------------------------------------------------ DOM / panel */
  var CSS = '' +
    '.rc-root{position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1fr) var(--m01-side,340px);min-height:0;font-family:var(--font-main,"IBM Plex Sans",sans-serif);}' +
    '.rc-main{min-width:0;min-height:0;display:flex;flex-direction:column;gap:8px;padding:10px 12px;box-sizing:border-box;container-type:inline-size;}' +
    '.rc-chips{flex:0 0 auto;display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:6px;}' +
    '.rc-chip{min-width:0;height:40px;display:flex;align-items:center;gap:7px;padding:0 8px;border-radius:9px;border:1px solid var(--line2);background:var(--panel);color:var(--txt2);cursor:pointer;font-family:inherit;text-align:left;box-sizing:border-box;}' +
    '.rc-chip .n{flex:0 0 auto;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"IBM Plex Mono",monospace;font-size:10.5px;font-weight:600;background:var(--chipbg);color:var(--mut);}' +
    '.rc-chip .l{min-width:0;font-size:11px;font-weight:600;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.rc-chip.on{border-color:var(--blue);background:rgba(77,157,255,.10);color:var(--blue);box-shadow:inset 0 -2.5px 0 var(--blue);}' +
    '.rc-chip.on .n{background:var(--blue);color:#fff;}' +
    '.rc-chip.done .n{background:rgba(70,211,154,.18);color:var(--grn);}' +
    '.rc-chip.lock{opacity:.5;cursor:not-allowed;border-style:dashed;}' +
    '.rc-line{flex:0 0 auto;display:flex;align-items:center;gap:10px;height:46px;padding:6px 12px;border-radius:9px;background:var(--panel);border:1px solid var(--line);box-sizing:border-box;}' +
    '.rc-line i{width:8px;height:8px;border-radius:50%;flex:0 0 auto;background:var(--mut);}' +
    '.rc-line span.t{flex:1 1 auto;min-width:0;font-size:12.5px;color:var(--txt);line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}' +
    '.rc-line span.k{flex:0 0 auto;font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:.6px;color:var(--mut);padding:2px 8px;border:1px solid var(--line2);border-radius:6px;white-space:nowrap;}' +
    '.rc-scene{position:relative;flex:1 1 auto;min-height:0;border-radius:12px;background:var(--panel);border:1px solid var(--line);overflow:hidden;}' +
    '.rc-scene svg{position:absolute;inset:0;width:100%;height:100%;display:block;}' +
    '.rc-leg{flex:0 0 auto;display:flex;gap:10px;font-family:"IBM Plex Mono",monospace;font-size:9.5px;color:var(--txt2);white-space:nowrap;}' +
    '@container (max-width:1100px){.rc-leg{display:none;}}' +
    '.rc-leg b{display:inline-block;width:14px;height:8px;border-radius:2px;margin-right:5px;vertical-align:-1px;}' +
    '.rc-panel{display:flex;flex-direction:column;gap:9px;min-width:0;min-height:0;overflow:hidden;padding:12px;background:var(--rail,var(--bg));border-left:1px solid var(--line);box-sizing:border-box;}' +
    '.rc-card{background:var(--icard);border:1px solid var(--line2);border-radius:10px;padding:10px 12px;box-sizing:border-box;flex:0 0 auto;}' +
    '.rc-sh{display:flex;align-items:center;gap:6px;}' +
    '.rc-sh .k{font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:.9px;color:var(--blue);font-weight:600;}' +
    '.rc-sh b{margin-left:auto;font-family:"IBM Plex Mono",monospace;font-size:9px;letter-spacing:.7px;font-weight:600;color:var(--mut);}' +
    '.rc-nb{width:26px;height:24px;border-radius:6px;border:1px solid var(--line2);background:var(--panel);color:var(--txt2);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}' +
    '.rc-nb:disabled{opacity:.4;cursor:default;}.rc-nb svg{width:12px;height:12px;}' +
    '.rc-tt{font-size:14.5px;font-weight:700;color:var(--txt);margin-top:6px;line-height:1.25;}' +
    '.rc-q{font-size:11.5px;color:var(--txt2);line-height:1.45;margin-top:5px;min-height:50px;}' +
    '.rc-bar{height:4px;border-radius:2px;background:var(--line);margin-top:8px;overflow:hidden;}.rc-bar i{display:block;height:100%;width:0;background:var(--blue);}' +
    '.rc-exp{margin-top:9px;width:100%;height:30px;border-radius:8px;border:1px solid var(--line2);background:var(--panel);color:var(--blue);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;}' +
    '.rc-exp svg{width:14px;height:14px;}' +
    '.rc-k2{font-family:"IBM Plex Mono",monospace;font-size:9px;letter-spacing:.9px;color:var(--mut);display:flex;justify-content:space-between;}' +
    '.rc-rd{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px;}' +
    '.rc-c{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:6px 9px;min-width:0;}' +
    '.rc-c .l{display:block;font-family:"IBM Plex Mono",monospace;font-size:8.3px;letter-spacing:.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.rc-c .v{display:block;font-family:"IBM Plex Mono",monospace;font-size:15px;font-weight:600;color:var(--txt);margin-top:2px;white-space:nowrap;}' +
    '.rc-c .v small{font-size:10px;font-weight:500;color:var(--mut);margin-left:3px;}' +
    '.rc-rec{margin-top:7px;display:flex;flex-direction:column;gap:5px;}' +
    '.rc-r{display:flex;align-items:baseline;gap:8px;padding:6px 9px;border-radius:8px;background:var(--panel);border:1px solid var(--line);}' +
    '.rc-r .l{font-size:11.5px;color:var(--txt2);flex:0 0 auto;}' +
    '.rc-r .v{margin-left:auto;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;font-family:"IBM Plex Mono",monospace;font-size:10.5px;font-weight:600;color:var(--mut);}' +
    '.rc-r.ok{border-color:rgba(70,211,154,.45);}.rc-r.ok .v{color:var(--txt);}' +
    '.rc-note{font-size:10px;line-height:1.4;color:var(--mut);margin-top:6px;}' +
    '.rc-sp{flex:1 1 auto;min-height:0;}' +
    '.rc-act{flex:0 0 auto;height:36px;border-radius:9px;border:1px solid var(--line2);background:var(--panel);color:var(--txt2);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;}' +
    '.rc-act.pri{background:linear-gradient(180deg,#46d39a,#2f9d72);border-color:#2f9d72;color:#06231a;}' +
    '.rc-act svg{width:14px;height:14px;}' +
    '@media (max-height:780px){.rc-panel{gap:6px;padding:9px;}.rc-card{padding:8px 10px;}.rc-q{min-height:0;}.rc-note{display:none;}.rc-chip{height:34px;}}' +
    '@container (max-width:1150px){.rc-chip .n{display:none;}.rc-chip{padding:0 5px;justify-content:center;}.rc-chip .l{font-size:10.3px;}.rc-chips{gap:4px;}}';

  var ICON = {
    prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  // module state survives navigation (the page reopens where the user left it); Reset clears it
  var M = { host: null, root: null, k: 0, t: 0, playing: false, done: [], raf: 0, last: 0, lastDraw: 0, dirty: true, el: {}, cache: {}, opts: {} };
  function resetState() { M.k = 0; M.t = 0; M.playing = false; M.done = STAGES.map(function () { return false; }); M.dirty = true; }
  resetState();
  function unlocked(k) { return k === 0 || !!M.done[k - 1]; }
  function allDone() { return !!M.done[NS - 1]; }

  function buildDom() {
    if (!document.getElementById('rc-css')) { var cs = document.createElement('style'); cs.id = 'rc-css'; cs.textContent = CSS; document.head.appendChild(cs); }
    /* 2026-09-29: the nine-stage strip, the status line under it and the Recorded Measurements card
       were removed; stage, status, progress and all controls are in the shared procedure panel
       (components/ProcCtl.js) at the top of the side panel. */
    M.root.innerHTML =
      '<div class="rc-main">' +
      '<div class="rc-scene"><svg viewBox="' + VB + '" preserveAspectRatio="xMidYMid meet">' + defs() + '<g data-r="dyn"></g></svg></div></div>' +
      '<div class="rc-panel">' +
        '<div class="rc-card"><div class="rc-k2"><span>LIVE READINGS</span><span data-r="temp"></span></div><div class="rc-rd">' +
          [0, 1, 2, 3].map(function (i) { return '<div class="rc-c"><span class="l" data-r="l' + i + '"></span><span class="v" data-r="v' + i + '"></span></div>'; }).join('') + '</div></div>' +
        '<div class="rc-sp"></div>' +
        '<div class="pc-host" data-pc="RecombSim" data-pc-layout="side"></div>' +
      '</div>';
    M.el = {};
    [].slice.call(M.root.querySelectorAll('[data-r]')).forEach(function (n) { M.el[n.getAttribute('data-r')] = n; });
    M.cache = {}; M.dirty = true;
    if (window.PC) window.PC.refresh();
  }
  function setText(k, v) { var n = M.el[k]; if (n && M.cache[k] !== v) { n.textContent = v; M.cache[k] = v; } }
  function setHTML(k, v) { var n = M.el[k]; if (n && M.cache[k] !== v) { n.innerHTML = v; M.cache[k] = v; } }


  function readings(w) {
    var R = [], k = w.k, V = function (l, v, u, c) { R.push({ l: l, v: v, u: u || '', c: c }); };
    if (k === 0) { V('TITANIUM PRESSURE', pf(w.ti.P), 'psig'); V('TITANIUM WATER', f1(w.ti.water), 'cc', FL.water.line); V('SAMPLE SIDE', w.ti.P < -.05 ? 'Vacuum' : 'Empty', ''); V('WATER PUMP', f2(w.pump.V), 'cc'); }
    else if (k === 1) { V('TITANIUM PRESSURE', pf(w.ti.P), 'psig'); V('TITANIUM GAS VOLUME', f1(w.ti.gas ? w.ti.sv : 0), 'cc', FL.gas.line); V('PUMP PRESSURE', n0(w.pump.P), 'psig', '#46d39a'); V('PUMP VOLUME', f2(w.pump.V), 'cc'); }
    else if (k === 2) { V('TITANIUM PRESSURE', n0(w.ti.P), 'psig'); V('TITANIUM GAS VOLUME', f1(w.ti.sv), 'cc', FL.gas.line); V('TITANIUM WATER', f1(w.ti.water), 'cc', FL.water.line); V('WATER PUMP', f2(w.pump.V), 'cc'); }
    else if (k === 3) { V('CELL PRESSURE', pf(w.cell.P), 'psig'); V('PUMP A GAS', f2(w.cell.A), 'cc', FL.gas.line); V('TITANIUM GAS VOLUME', f1(w.ti.sv), 'cc', FL.gas.line); V('WATER PUMP', f2(w.pump.V), 'cc'); }
    else if (k === 4) { V('CELL PRESSURE', n0(w.cell.P), 'psig'); V('PUMP A GAS', f2(w.cell.A), 'cc', FL.gas.line); V('GAS CHARGED @ 5,000', f2(w.bot.kind === 'recomb' ? w.bot.q : 0), 'cc', FL.gas.line); V('BOTTLE PRESSURE', n0(w.bot.P), 'psig'); }
    else if (k === 5) { var ob = w.bot.kind === 'oil'; V('OIL BOTTLE PRESSURE', ob ? n0(w.bot.P) : '—', ob ? 'psig' : ''); V('OIL IN BOTTLE', ob ? f2(w.bot.oil) : '—', ob ? 'cc' : '', '#c07f2e'); var cg = w.cell.Af === 'gas'; V(cg ? 'PUMP A GAS' : 'PUMP A OIL', f2(w.cell.A), 'cc', cg ? FL.gas.line : '#c07f2e'); V('PUMP B OIL', f2(w.cell.B), 'cc', '#c07f2e'); }
    else if (k === 6) { V('PUMP A OIL', f2(w.cell.A), 'cc', '#c07f2e'); V('PUMP B OIL', f2(w.cell.B), 'cc', '#c07f2e'); V('CELL PRESSURE', n0(w.cell.P), 'psig'); V('AGITATION STROKE', w.stroke ? w.stroke + ' / 4' : '—', ''); }
    else if (k === 7) { V('PUMP A', f2(w.cell.A), 'cc', '#c07f2e'); V('PUMP B', f2(w.cell.B), 'cc', '#c07f2e'); V('OIL IN BOTTLE', f2(w.bot.oil), 'cc', '#c07f2e'); V('BOTTLE PRESSURE', n0(w.bot.P), 'psig'); }
    else { V('WORKING PRESSURE', n0(w.bot.P), 'psig'); V('BOTTLE ANGLE', Math.round(w.bot.ang || 0) + '', '°'); V('MIXING', Math.round((w.bot.mix || 0) * 100) + '', '%', (w.bot.mix || 0) >= 1 ? 'var(--grn)' : null); V('WATER PUMP', f2(w.pump.V), 'cc'); }
    return R;
  }
  function recTexts(w) {
    var g = w.rec.gas ? f2(CFG.GAS_CHARGE) + ' cc · ' + n0(CFG.GAS_P) + ' psig · ' + CFG.LAB_T + ' °C' : 'pending';
    var gb = w.rec.bot ? f2(CFG.GAS_TO_BOT) + ' cc (at ' + n0(CFG.GAS_P) + ' psig)' : 'pending';
    var oo = w.rec.oil ? 'A 100 + B 80 = 180 cc · ' + n0(CFG.OIL_P) + ' psig · ' + CFG.LAB_T + ' °C' : 'pending';
    var ob = w.rec.oilBot ? OIL_T1 + ' + ' + OIL_T2 + ' = ' + OIL_IN + ' cc (' + CFG.OIL_A_END + ' cc left in cell)' : 'pending';
    return { g: g, gb: gb, o: oo, ob: ob };
  }


  function draw() {
    if (!M.root) return;
    var w = stateAt(M.k, M.t), S = STAGES[M.k];
    M.el.dyn.innerHTML = scene(w);
    var idle = !w.started;
    setText('temp', w.jacket > .01 ? (CFG.JACKET_T != null ? 'JACKET ' + CFG.JACKET_T + ' °C' : 'HEATING JACKET ON') : 'TEMP ' + CFG.LAB_T + ' °C (LAB)');
    readings(w).forEach(function (r, i) {
      setText('l' + i, r.l);
      setHTML('v' + i, esc(r.v) + (r.u ? '<small>' + esc(r.u) + '</small>' : ''));
      M.el['v' + i].style.color = r.c || 'var(--txt)';
    });
    var st = { done: allDone(), started: M.done.some(Boolean) || M.t > 0, stage: M.k };
    var key = st.done + '|' + st.started;
    if (M.stKey !== key) { M.stKey = key; if (M.opts.onStatus) try { M.opts.onStatus(st); } catch (e) {} }
  }

  function loop(now) {
    if (!M.root) return;
    var dt = M.last ? Math.min(.06, (now - M.last) / 1000) : 0;
    M.last = now;
    if (M.playing) {
      M.t += dt / psm();
      var T2 = STAGES[M.k].T;
      if (M.t >= T2) { M.t = T2; M.playing = false; M.done[M.k] = true; }
      M.dirty = true;
    }
    if (M.dirty && now - M.lastDraw > 30) { M.lastDraw = now; M.dirty = false; draw(); }
    M.raf = requestAnimationFrame(loop);
  }
  function jump(k) { M.k = clamp(k, 0, NS - 1); M.t = 0; M.playing = false; M.dirty = true; draw(); }
  function act(a) {
    var w = stateAt(M.k, M.t);
    if (a === 'play') {
      if (w.done) {
        if (M.k < NS - 1) { M.k++; M.t = 0; M.playing = true; }
        else { resetState(); M.playing = true; }
      } else M.playing = !M.playing;
    } else if (a === 'replay') { M.t = 0; M.playing = false; }
    else if (a === 'prev') { if (M.k > 0) { M.k--; M.t = 0; M.playing = false; } }
    else if (a === 'next') { if (M.k < NS - 1) { M.k++; M.t = 0; M.playing = false; } }
    else if (a === 'reset') { resetState(); }
    else if (a === 'explain') { if (window.__SG && window.__SG.toggle) window.__SG.toggle(true); }
    M.dirty = true; draw();
  }

  /* shared procedure panel (ProcCtl.js) */
  function pcInfo() {
    if (!M.root) return null;
    var w = stateAt(M.k, M.t), S = STAGES[M.k];
    var st = w.done ? 'complete' : M.playing ? 'running' : w.started ? 'paused' : 'ready';
    return { N: NS, k: M.k, title: S.t, unit: 'Stage',
      q: !w.started ? S.sub[0].q : w.done ? (M.k === NS - 1 ? DONE_MSG : 'Stage complete. Continue with stage ' + (M.k + 2) + ': ' + STAGES[M.k + 1].t + '.') : S.sub[w.i].q,
      status: st, frac: w.prog, doneMask: M.done.slice(), allDone: allDone() && M.k === NS - 1,
      canPrev: M.k > 0, canNext: M.k < NS - 1, canRestart: w.started,
      again: 'Run Recombination Again', reset: 'Reset Recombination' };
  }
  function pcAct(a) {
    var w = stateAt(M.k, M.t);
    if (a === 'run' || a === 'resume') { if (!w.done) M.playing = true; }
    else if (a === 'pause') M.playing = false;
    else if (a === 'restart') act('replay');
    else if (a === 'prev' || a === 'next' || a === 'reset') act(a);
    else if (a === 'runNext' || a === 'again') act('play');
    M.dirty = true; draw();
  }

  window.RecombSim = {
    CFG: CFG,
    pcInfo: pcInfo,
    pcAct: pcAct,
    mount: function (host, opts) {
      this.unmount();
      M.host = host; M.opts = opts || {};
      M.root = document.createElement('div'); M.root.className = 'rc-root'; host.appendChild(M.root);
      buildDom(); M.last = 0; M.stKey = null; draw();
      M.raf = requestAnimationFrame(loop);
    },
    unmount: function () {
      if (M.raf) cancelAnimationFrame(M.raf);
      M.raf = 0; M.playing = false;
      if (M.root && M.root.parentNode) M.root.parentNode.removeChild(M.root);
      M.root = null; M.host = null;
    },
    isMounted: function (host) { return !!M.root && M.host === host && M.root.isConnected; },
    setOpts: function (o) { M.opts = o || M.opts; },
    reset: function () { resetState(); if (M.root) draw(); },
    isDone: allDone,
    /* test hooks */
    _seek: function (k, t, play) { M.k = k; M.t = t; M.playing = !!play; for (var i = 0; i < k; i++) M.done[i] = true; if (t >= STAGES[k].T) M.done[k] = true; M.dirty = true; draw(); },
    _state: function () { return stateAt(M.k, M.t); },
    _stages: STAGES,
    /* read-only description for the StepGuide Explain card */
    describe: function () {
      if (!M.root) return null;
      var w = stateAt(M.k, M.t), S = STAGES[M.k], ex = EX[M.k];
      var vals = readings(w).map(function (r) { return { l: r.l.charAt(0) + r.l.slice(1).toLowerCase(), v: r.v, u: r.u }; });
      if (w.jacket > .01) vals.push({ l: 'Heating jacket', v: CFG.JACKET_T != null ? String(CFG.JACKET_T) : 'On', u: CFG.JACKET_T != null ? '°C' : '' });
      else vals.push({ l: 'Temperature', v: String(CFG.LAB_T), u: '°C' });
      var rt = recTexts(w);
      vals.push({ l: 'Gas charge (cell)', v: rt.g, u: '' }, { l: 'Gas to bottle', v: rt.gb, u: '' }, { l: 'Oil charge (cell)', v: rt.o, u: '' }, { l: 'Oil to bottle', v: rt.ob, u: '' });
      var d = !w.started ? S.sub[0].q : w.done ? (M.k === NS - 1 ? DONE_MSG : 'Stage complete.') : S.sub[w.i].q;
      return { title: 'Recombination · Stage ' + (M.k + 1) + ' — ' + S.t,
        tag: 'STAGE ' + (M.k + 1) + ' / ' + NS + (w.done ? ' · COMPLETE' : M.playing ? ' · RUNNING' : w.started ? ' · PAUSED' : ' · READY'),
        busy: M.playing, d: d, w: ex.w, e: ex.e, o: ex.o, vals: vals };
    }
  };
})();
