/* ============================================================================
   StepGuide — fixed "Explain Current Step" button + collapsible bottom panel.

   READ-ONLY. It observes the live component state and describes it. It never
   writes app state, never touches timers and never pauses a running process.
   The whole widget lives outside the DC tree (appended to <body>), so no page
   layout and no existing logic is affected.
   ========================================================================= */
(function () {
  'use strict';
  if (!window.DC || window.__SG_ON) return;
  window.__SG_ON = true;

  /* ---------- live component registry (non-invasive hook on DC.define) ---- */
  var LIVE = Object.create(null);
  var _define = DC.define.bind(DC);
  DC.define = function (name, def) {
    try {
      var P = def.logic.prototype;
      var dm = P.componentDidMount, wu = P.componentWillUnmount;
      P.componentDidMount = function () { LIVE[name] = this; if (dm) dm.call(this); };
      P.componentWillUnmount = function () { if (LIVE[name] === this) delete LIVE[name]; if (wu) wu.call(this); };
    } catch (e) {}
    return _define(name, def);
  };
  function ST(name) { var c = LIVE[name]; return (c && c.state) ? c.state : null; }

  /* ---------- formatting helpers ---------------------------------------- */
  function num(v, d) {
    var x = Number(v);
    if (v === null || v === undefined || isNaN(x)) return '—';
    return x.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function V(label, value, unit) { return { l: label, v: value, u: unit || '' }; }

  /* ======================================================================
     KNOWLEDGE BASE
     Each entry: what is happening now, why it is done, what to watch.
     ==================================================================== */

  /* ---- Module 03 : charging the PVT cell (12 stages) ---- */
  var CHARGE = {
    0:  { t: 'Cell ready · nothing running',
          d: 'The PVT cell is closed, empty and at atmospheric pressure. No valve is open.',
          w: 'Nothing is charged yet. The first stage must evacuate the cell before any live fluid enters it.',
          e: 'All valves shown closed; transfer pump full at 100 mL.',
          o: 'Press the stage button to start stage 1 (vacuum).' },
    1:  { t: 'Stage 1 · Vacuum the PVT cell',
          d: 'The vacuum pump is pulling the cell and its lines down to about −15 psi.',
          w: 'Air trapped in the cell would dissolve into the live sample and shift the measured bubble point and composition. Every dead volume must be evacuated first.',
          e: 'Vacuum line open to the cell; the cell gauge sweeps below zero.',
          o: 'Cell vacuum falling 0 → −15 psi, then the status locking to "Cell Vacuumed".' },
    2:  { t: 'Stage 2 · Connect the sample bottle',
          d: 'The SPS/PDS bottle is being connected to the charge line at the cell manifold.',
          w: 'The bottle holds the restored, homogenised sample at reservoir pressure. It has to be coupled before any valve is opened so the sample never sees a pressure drop.',
          e: 'Bottle appears on the charge line; the connection grows into place.',
          o: 'The connection completing and the status reading "Bottle Connected".' },
    3:  { t: 'Stage 3 · Open bottle valve, then cell valve',
          d: 'The bottle valve opens and the sample front advances along the charge line; the cell valve then opens and the front continues up to the Pump B valve.',
          w: 'Opening in sequence keeps the sample under pressure and pushes the line contents forward in one direction, so no air pocket is left in the path.',
          e: 'Fluid front travelling along the charge line; two valve icons switch to open.',
          o: 'The advancing front stopping at the Pump B valve, which stays closed.' },
    4:  { t: 'Stage 4 · Record the initial transfer-pump volume',
          d: 'The transfer pump reading is taken as the reference volume before any fluid is displaced (98 mL).',
          w: 'Everything charged into the cell is measured by difference from this reading. Without a recorded starting volume the charged volume cannot be quantified.',
          e: 'Transfer pump volume settles and is logged as the initial reading.',
          o: 'Transfer pump 100 → 98 mL, and "Initial Reading 98 mL" on the status line.' },
    5:  { t: 'Stage 5 · Fill the dead space',
          d: 'Filling dead space and equalizing with the 5,000 psig sample bottle. The SPS/PDS bottle is already held at 5,000 psig; with the valves open, pressurised sample flows into the evacuated line, the dead volume of the fittings (about 2 cc) and the Pump A inlet, so the receiving section rises naturally to bottle pressure. No pressure target is being pumped to.',
          w: 'The dead space must be liquid-filled and its volume known, otherwise it is wrongly counted as charged sample and the cell pressure never equalises.',
          e: 'Pressurised sample moving from the SPS/PDS bottle along the charge line toward Pump A, stopping at the closed Pump A valve; the cell pressure climbs from vacuum and levels off at the bottle pressure.',
          o: 'Cell pressure equalizing at exactly 5,000 psig (bottle pressure) and dead volume settling at 2 cc.' },
    6:  { t: 'Stage 6 · Charge Pump A with 80 cc',
          d: 'The Pump A valve opens and live sample is displaced from the bottle through the charge line into Pump A until 80 cc is in the pump; the Pump A valve then closes.',
          w: '80 cc at 5,000 psig is the working charge for the PVT programme — constant-composition expansion and differential liberation start from it (the separator test uses its own 35 cc charge).',
          e: 'Pump A valve open, Pump A piston withdrawing and the transfer pump volume falling by the same amount; cell pressure held at 5,000 psig.',
          o: 'Pump A 0 → 80 cc while the transfer pump drops 95 → 18 mL — the two must agree.' },
    7:  { t: 'Stage 7 · Confirm the volume balance',
          d: 'The volume taken out of the bottle is checked against the volume now in Pump A plus the dead space.',
          w: 'A mismatch means a leak, a trapped gas pocket or a mis-set valve. The charge is only accepted when the balance closes.',
          e: 'No movement — this is a reading and check step.',
          o: 'Transfer pump 18 mL, Pump A 80 cc, dead volume 2 cc — balanced against the 98 mL start.' },
    8:  { t: 'Stage 8 · Close valves and drain the charge line',
          d: 'Pump A, Pump B, cell and bottle valves close in sequence; the fluid held in the charge line then relaxes back toward the bottle and the bottle is disconnected.',
          w: 'The cell must be isolated with a known volume before any measurement. Draining the line back prevents live sample being trapped and lost at the connection.',
          e: 'Valves close one by one, the line front retreats to zero, the bottle is removed.',
          o: 'Charge line emptying and the status reaching "Bottle Disconnected".' },
    9:  { t: 'Stage 9 · Hold the cell at 5,000 psi',
          d: 'The pump trims the isolated cell back onto the 5,000 psi setpoint and proves it holds.',
          w: 'The sample must sit above its saturation pressure in a single phase before agitation. A pressure that will not hold indicates a leak or a valve not fully closed.',
          e: 'Pump A makes small corrections; the barogram trace flattens.',
          o: 'Cell pressure settling on 5,000 psi with the barogram going flat.' },
    10: { t: 'Stage 10 · Agitation cycle (A → B → A)',
          d: 'The whole 80 cc is displaced from Pump A into Pump B and back again at constant pressure.',
          w: 'Passing the sample back and forth mixes it and dissolves any gas that came out of solution during transfer. A charge that is not single-phase gives a wrong bubble point.',
          e: 'Pump A empties as Pump B fills, then the stroke reverses.',
          o: 'Pump A + Pump B always summing to 80 cc, and only a few psi of pressure wobble.' },
    11: { t: 'Stage 11 · Read the barogram (stability check)',
          d: 'The cell pressure is read after the agitation cycle and compared with the 5,000 psi setpoint.',
          w: 'This is the single-phase test. Within ±5 psi the sample is homogeneous and accepted; a larger drift means gas is still coming into solution and the agitation cycle is repeated.',
          e: 'Barogram trace extends; the pumps stand still.',
          o: 'Whether the trace stays inside ±5 psi — "Stable — Single Phase" or "Repeat Cycle".' },
    12: { t: 'Stage 12 · Release to the flash process',
          d: 'The verified single-phase charge is released to the flash unit.',
          w: 'Only a stable, single-phase, volumetrically known charge may go forward to flash separation and GC.',
          e: 'Control passes to the flash unit; the flash sequence resets to stage 1.',
          o: 'The screen switching to the flash sequence with "ready to flash".' }
  };

  /* ---- Module 03 : flash process (6 stages) ---- */
  var FLASH = {
    0: { t: 'Flash unit idle',
         d: 'The flash unit is at atmospheric pressure and waiting for a verified sample.',
         w: 'Flashing an unverified sample would give a meaningless GOR.',
         e: 'No flow; all paths idle.',
         o: 'The status line — it must confirm a stable sample before stage 1.' },
    1: { t: 'Stage 1 · Verify the stable sample',
         d: 'The charge is re-checked as single phase at 80 cc and 5,000 psi.',
         w: 'The flash result (GOR, oil and gas volumes) is only valid if the feed was a homogeneous single-phase sample of known volume.',
         e: 'Reading step — no movement.',
         o: '"Stable · 80 cc @ 5,000 psi" before continuing.' },
    2: { t: 'Stage 2 · Vacuum the flash unit',
         d: 'The flash unit and its lines are pulled from 14.7 psia down to zero.',
         w: 'Any air left in the unit would be counted as produced gas and would inflate the GOR and contaminate the GC gas analysis.',
         e: 'Vacuum path opens; the flash-unit gauge falls.',
         o: 'Flash-unit pressure reaching 0 psia and holding.' },
    3: { t: 'Stage 3 · Fill the dead space with helium',
         d: 'Helium is admitted to the evacuated dead volume until the unit reads atmospheric.',
         w: 'Helium is inert and is not part of the reservoir fluid, so it can be identified and subtracted in the GC. It gives a known, non-reactive starting condition at 14.7 psia.',
         e: 'Helium flows from the cylinder into the flash unit; the gasometer empties.',
         o: 'Flash unit returning to 14.7 psia with helium, gasometer at 0 cc.' },
    4: { t: 'Stage 4 · Flash the sample',
         d: '50 cc of live sample is displaced from Pump A into the flash unit, where it drops to atmospheric conditions and separates into oil and gas.',
         w: 'Flashing to standard conditions is what defines the solution gas–oil ratio: the gas that comes out of solution and the residual oil are both measured from this one step.',
         e: 'Pump A empties by 50 cc; liquid collects in the glass, gas rises to the gasometer.',
         o: 'Pump A 80 → 30 cc, residual oil building to 40 cc, gas to about 400 cc.' },
    5: { t: 'Stage 5 · Collect gas into the balloon',
         d: 'Part of the flashed gas is transferred from the gasometer into the sampling balloon.',
         w: 'The balloon is the sample container for the gas chromatograph; the gasometer keeps the remainder for the volume measurement.',
         e: 'Gas moves from the gasometer to the balloon, which inflates.',
         o: 'Balloon filling to about 250 cc at roughly 14.5 psi.' },
    6: { t: 'Stage 6 · Measure oil and gas',
         d: 'Residual oil volume in the glass and gas volume in the gasometer/balloon are read off.',
         w: 'GOR = gas volume at standard conditions ÷ residual oil volume. These two readings are the basis of the flash result and of the recombination check.',
         e: 'Reading step — oil in the glass, gas in the balloon.',
         o: 'Both volumes stable before they are recorded.' }
  };

  /* ---- Module 01 : field sampling phases ---- */
  var BH = {
    idle:    { t: 'Programme not started', d: 'The tool is at surface and the sampling programme has not been started.', w: 'Sampling point and hole condition are selected first because they set the whole procedure.', e: 'No movement.', o: 'Choose the sampling point, then start the run.' },
    desc:    { t: 'Running in hole', d: 'The sampling tool is being run down to the target depth on wireline.', w: 'The sample must be taken at the depth where the fluid is representative of the reservoir interval of interest.', e: 'Tool descending; depth, pressure and temperature climbing to downhole values.', o: 'Depth, pressure and temperature rising together toward 8,450 ft, ~4,820 psi and ~238 °F.' },
    set:     { t: 'Setting the tool', d: 'The probe (open hole) or the packer/tool string (cased hole) is set against the wall.', w: 'A tight seal is what isolates the formation from wellbore fluid — without it the sample is contaminated by mud or wellbore liquid.', e: 'Probe extends; packer elements expand.', o: 'The seal confirmation message before flow is attempted.' },
    comm:    { t: 'Formation communication', d: 'The tool is drawing from the formation and confirming a live flow path.', w: 'Communication proves the seal holds and that formation fluid — not wellbore fluid — is reaching the tool.', e: 'Flow line opens; pressure responds to drawdown.', o: 'A clean pressure response and "communication established".' },
    clean:   { t: 'Pump-out cleanup', d: 'Fluid is being pumped out to the wellbore while contamination is monitored.', w: 'The first fluid produced is mud filtrate. It has to be pumped away until the optical/contamination reading is low enough for a representative sample.', e: 'Pump-out running, flow routed to waste.', o: 'Contamination falling toward the sampling limit — chamber filling stays locked until then.' },
    ready:   { t: 'Ready to sample', d: 'Fluid quality has reached the sampling limit; the programme is waiting for the operator.', w: 'Chambers are only opened to clean fluid, so the decision point is deliberate.', e: 'Pump-out continues; chambers still closed.', o: 'Contamination around 5% — then start the chamber filling.' },
    fill:    { t: 'Filling the sample chambers', d: 'Clean formation fluid is routed into the sample chambers one after the other.', w: 'Two chambers give a duplicate sample, so one can be opened in the lab and one kept as a check.', e: 'Flow valve switches from waste to chamber 01, then chamber 02.', o: 'Chambers filling in sequence and the drawdown staying above bubble point.' },
    seal:    { t: 'Sealing the chambers', d: 'The chambers are closed and sealed at downhole pressure and temperature.', w: 'Sealing at reservoir conditions is what keeps the sample single phase on the way up. If it drops below bubble point, gas breaks out and the sample is no longer representative.', e: 'Chamber valves close and lock.', o: 'The confirmation that both chambers are sealed at downhole conditions.' },
    retract: { t: 'Retracting the probe', d: 'The probe is retracted and the flow path is closed.', w: 'The tool must be freed before it can be pulled out of hole.', e: 'Probe pulls back into the tool body.', o: 'Flow path closed before the tool starts up.' },
    asc:     { t: 'Pulling out of hole', d: 'The tool is being pulled back to surface with the sealed samples.', w: 'The sample cools and its pressure falls on the way up — this is exactly why it must be restored to reservoir conditions in the lab before analysis.', e: 'Tool ascending; depth falling to zero.', o: 'Depth returning to surface; the samples stay sealed throughout.' },
    done:    { t: 'Samples at surface', d: 'Sealed samples are at surface, ready for transfer into lab bottles.', w: 'The next step is a pressure-maintained transfer into SPS/PDS bottles for the laboratory.', e: 'Tool at surface.', o: 'Both chambers reported sealed — then move to the transfer module.' },
    connect: { t: 'Connecting the sampling bottle', d: 'The sample bottle is being connected to the sampling line.', w: 'A leak-free, purged connection prevents air ingress and loss of light ends.', e: 'Bottle couples to the line; line pressure builds.', o: 'The line pressure stabilising before flow is allowed in.' },
    xfer:    { t: 'Filling the bottle', d: 'Fluid is flowing from the sampling point into the bottle.', w: 'The bottle is filled slowly and under pressure so the fluid stays single phase during filling.', e: 'Flow stream into the bottle; line pressure held.', o: 'Steady flow and no pressure drop that could flash the sample.' }
  };

  /* ---- Module 01 : wellhead sampling — 8 stages synced to the animation ----
     The animation itself only has three phases (connect → xfer → done), so the
     stage is read from the time since Take Sample (Main.sampleT0) and clamped to
     the phase actually showing. Start times (ms) match runSample():
       connect 200 · xfer 1900 · bottle gauge ramp 2000–5500 · piston 1900–4900 · done 6200 */
  var WH_START = [0, 1000, 1900, 2600, 3500, 4500, 5500];   // stages 1–7; stage 8 = phase 'done'
  var WH = {
    1: { t: 'Connect the sample bottle',
         d: 'The piston sample bottle is coupled to the dedicated sampling valve just downstream of the wellhead / X-tree, on the production flowline before the separator. All valves are still closed.',
         w: 'The connection must be tight and leak-free before any fluid moves, so no air gets in and no light ends escape at the fitting.',
         e: 'Bottle hooked up to the sampling valve; transfer line made up.',
         o: '"Transfer line connected" — no flow yet.' },
    2: { t: 'Flush the sampling line',
         d: 'Well fluid is flushed through the sampling valve and line to drain before the bottle is opened.',
         w: 'Fluid standing in the valve and line has cooled and may have separated, so it no longer represents the flowing stream. Flushing replaces it with fresh live fluid.',
         e: 'Flow through the line to drain only; bottle inlet still closed.',
         o: 'The line filled with fresh fluid before the bottle is opened.' },
    3: { t: 'Open the valve gradually',
         d: 'The sampling valve and the bottle inlet valve are opened slowly. Flowline fluid at 1,450 psig and 60 °C starts to enter the bottle.',
         w: 'A slow opening avoids a sudden pressure drop across the valve. A sharp drop can take the fluid below its saturation pressure and flash gas out of solution.',
         e: 'Valve opening; bottle pressure gauge starts to rise.',
         o: 'Bottle pressure rising smoothly, not in a jump.' },
    4: { t: 'Wellhead fluid flows into the bottle',
         d: 'Fluid flows from the flowline, through the sampling valve and transfer line, into the sample chamber above the piston.',
         w: 'The sample comes from the flowing stream before the separator, so oil and dissolved gas are captured together as one fluid.',
         e: 'Flow stream entering the sample chamber.',
         o: 'Fluid entering the bottle while the line pressure stays steady.' },
    5: { t: 'Floating piston moves',
         d: 'As the sample chamber fills, the floating piston is pushed down toward the nitrogen chamber.',
         w: 'The piston separates the well fluid from the nitrogen. It moves with the sample, so the chamber fills with no empty space where gas could break out.',
         e: 'Piston travelling down; sample volume growing above it.',
         o: 'Sample level and piston moving together.' },
    6: { t: 'Nitrogen holds back-pressure',
         d: 'The nitrogen below the piston pushes back on it and is displaced only in a controlled way, so the sample fills under pressure.',
         w: 'This back-pressure keeps the pressure loss small, so gas stays dissolved and the sample stays single phase — as it was in the flowline.',
         e: 'Nitrogen chamber getting smaller; bottle pressure levelling off.',
         o: 'Bottle pressure stabilising rather than dropping.' },
    7: { t: 'Close the valves',
         d: 'The required sample volume is reached. The bottle inlet valve is closed first, then the wellhead sampling valve.',
         w: 'Closing at full pressure traps the sample at sampling conditions. Closing the bottle first isolates the sample before the line is depressurised.',
         e: 'Valves closed; flow stops.',
         o: 'Flow stopping with the bottle still under pressure.' },
    8: { t: 'Seal the bottle for the lab',
         d: 'The trapped line pressure is bled off, the bottle is disconnected, capped, labelled and prepared for laboratory transfer.',
         w: 'The bottle stays sealed under pressure so the single-phase sample is preserved until it is validated and restored in the lab.',
         e: 'Bottle isolated and sealed.',
         o: '"Wellhead sample secured in PVT bottle" — then Move Sample to Lab.' }
  };
  var WH_OVERVIEW = {
    kind: 'wellhead',
    intro: 'The sample is collected at surface from a dedicated sampling valve located immediately downstream of the wellhead / X-tree on the production flowline — before the fluid reaches the separator.',
    cards: [
      { n: 'Sampling point', t: 'Dedicated valve on the flowline just after the X-tree. Fluid is taken from the flowing stream, with oil and dissolved gas still together.' },
      { n: 'Piston sample bottle', t: 'A floating piston separates the well fluid (sample chamber) from the nitrogen chamber below it.' },
      { n: 'Nitrogen back-pressure', t: 'The nitrogen pushes back on the piston during filling. This limits pressure loss and gas breakout, so the sample stays single phase.' }
    ],
    cond: 'Sampling conditions: wellhead pressure 1,450 psig · wellhead temperature 60 °C.',
    steps: ['Connect bottle', 'Flush line', 'Open valve gradually', 'Fluid enters bottle', 'Piston moves', 'N₂ back-pressure', 'Close valves', 'Seal for lab'],
    guide: 'Press Take Sample. The panel then explains each stage as the animation runs.',
    note: { k: 'Pressure maintenance', t: 'N₂ at 2,000 psig behind the piston keeps the sample above bubble point while it fills. Bottle 600 cc.' }
  };
  function whStage(main, ph) {
    if (ph === 'done') return 8;
    var el = (main && main.sampleT0) ? ((window.PCLK ? PCLK.now() : Date.now()) - main.sampleT0) / (window.PSM ? PSM() : 1) : 0;   // back to animation-timeline ms
    var s = 1;
    for (var i = 0; i < WH_START.length; i++) if (el >= WH_START[i]) s = i + 1;
    if (ph === 'xfer') return Math.max(3, Math.min(7, s));
    return Math.min(2, s);   // connect (or the 200 ms before it)
  }

  /* ---- Module 01 : separator sampling — 9 stages mapped onto the animation ----
     The animation is not changed. It has three phases, started by runSample():
       connect 200 · xfer 1600 · done 5000  (oil + gas lines animate together in xfer)
     The stage is read from the time since Take Sample and clamped to the phase
     showing: connect → stages 1–3 · xfer → stages 4–8 · done → stage 9. */
  var SEP_START = [0, 600, 1100, 1600, 2300, 3000, 3600, 4400];   // stages 1–8; stage 9 = phase 'done'
  var SEP_PATH = {
    both: 'OIL + GAS LINES',
    oil:  'LIQUID PATH · OIL OUTLET → OIL BOTTLE',
    gas:  'GAS PATH · GAS OUTLET → GAS BOTTLE'
  };
  var SEP = {
    1: { p: 'both', t: 'Confirm stable separator conditions',
         d: 'The separator is checked for stable pressure (200 psig) and temperature (35 °C) before any sampling valve is opened.',
         w: 'Oil and gas are only in equilibrium at steady conditions. Samples taken during a pressure or temperature swing would not match each other or the measured GOR.',
         e: 'No valve movement; the separator is flowing normally.',
         o: 'Separator pressure 200 psig and temperature 35 °C holding steady.' },
    2: { p: 'both', t: 'Connect both sample bottles',
         d: 'The oil piston bottle is connected to the oil outlet sampling point, and the gas bottle to the gas outlet sampling point.',
         w: 'Each phase has its own line and its own bottle, so separator oil and gas are never mixed in the field.',
         e: 'Bottles made up on their sampling lines; all valves still closed.',
         o: 'Oil bottle on the oil line, gas bottle on the gas line.' },
    3: { p: 'both', t: 'Flush both sampling lines',
         d: 'Fresh separator fluid is flushed through each sampling line to drain or vent before the bottles are opened.',
         w: 'Fluid standing in the lines has cooled and may have changed composition. Flushing replaces it with fluid at current separator conditions.',
         e: 'Flow through both lines to drain / vent; bottle valves closed.',
         o: 'Both lines filled with fresh fluid before the bottles are opened.' },
    4: { p: 'oil', t: 'Oil enters the piston bottle',
         d: 'The oil-side valve is opened slowly. Separator oil flows from the oil outlet into the sample chamber above the floating piston.',
         w: 'Separator oil is at its bubble point at separator conditions. A slow opening avoids a pressure drop that would release gas from the oil.',
         e: 'Oil-side valve open; oil flowing along the oil line into the bottle.',
         o: 'Oil (amber) appearing at the top of the oil bottle.' },
    5: { p: 'oil', t: 'Floating piston displaces the water',
         d: 'As oil fills the chamber, the floating piston moves down and pushes the water below it out through the bottom valve.',
         w: 'The water is let out at a controlled rate, so the oil fills under pressure with no gas space and stays single phase.',
         e: 'Piston travelling down; oil volume growing, water volume shrinking.',
         o: 'Oil level and piston moving together as the water leaves.' },
    6: { p: 'oil', t: 'Close and seal the oil bottle',
         d: 'The required oil volume is reached. The bottle valve is closed, then the oil sampling valve, and the oil bottle is sealed.',
         w: 'Closing at separator pressure traps the oil at sampling conditions, with its dissolved gas kept in solution.',
         e: 'Oil-side valves closed; oil bottle isolated.',
         o: 'Oil bottle holding pressure after isolation.' },
    7: { p: 'gas', t: 'Separator gas fills the gas bottle',
         d: 'The gas-side valve is opened. Separator gas flows from the gas outlet into the pressurised gas bottle.',
         w: 'The gas is taken at the same separator conditions as the oil, so the two samples form one matched pair for recombination.',
         e: 'Gas-side valve open; gas flowing along the gas line into the bottle.',
         o: 'Gas bottle filling on its own line — no piston and no water.' },
    8: { p: 'gas', t: 'Close and seal the gas bottle',
         d: 'The gas bottle reaches separator pressure. Its valve is closed, then the gas sampling valve, and the bottle is sealed.',
         w: 'Sealing at separator pressure keeps the full gas composition, including the light ends.',
         e: 'Gas-side valves closed; gas bottle isolated.',
         o: 'Both bottles now sealed.' },
    9: { p: 'both', t: 'Prepare both samples for the lab',
         d: 'The lines are depressurised and both bottles are disconnected, capped and labelled with the separator conditions and measured GOR.',
         w: 'In the laboratory, the separator oil and gas samples are recombined using the measured separator gas–oil ratio to recreate the reservoir-fluid composition for PVT analysis.',
         e: 'Both bottles isolated and sealed.',
         o: 'Take Sample changes to Restart Sample — then Move Sample to Lab.' }
  };
  var SEP_OVERVIEW = {
    kind: 'separator',
    intro: 'The produced reservoir fluid enters the three-phase separator and splits into gas, oil and water. Because the fluid is now multiphase, separator oil and separator gas are collected separately, each on its own sampling line.',
    cards: [
      { n: 'Three-phase separator', t: 'Gas leaves from the top outlet, oil from the oil outlet, and water is drained. Oil and gas are in equilibrium at separator conditions.' },
      { n: 'Liquid path · oil', c: 'oil', t: 'Oil outlet → oil piston bottle. A floating piston keeps oil above and water below, so the oil fills under pressure.' },
      { n: 'Gas path · vapour', c: 'gas', t: 'Gas outlet → pressurised gas bottle on its own line. No piston and no water — gas only.' }
    ],
    cond: 'Separator conditions: pressure 200 psig · temperature 35 °C.',
    steps: ['Confirm stable P & T', 'Connect both bottles', 'Flush both lines', 'Oil enters bottle', 'Piston displaces water', 'Seal oil bottle', 'Gas fills gas bottle', 'Seal gas bottle', 'Prepare for lab'],
    stepCls: ['', '', '', 'oil', 'oil', 'oil', 'gas', 'gas', ''],
    guide: 'Press Take Sample. The panel then explains each stage as the animation runs. In the lab, oil and gas are recombined at the measured separator GOR.',
    note: { k: 'Separate phases', t: 'Oil from the oil outlet and gas from the gas outlet, each on its own line at separator conditions.' }
  };
  function sepStage(main, ph) {
    if (ph === 'done') return 9;
    var el = (main && main.sampleT0) ? ((window.PCLK ? PCLK.now() : Date.now()) - main.sampleT0) / (window.PSM ? PSM() : 1) : 0;   // back to animation-timeline ms
    var s = 1;
    for (var i = 0; i < SEP_START.length; i++) if (el >= SEP_START[i]) s = i + 1;
    if (ph === 'xfer') return Math.max(4, Math.min(8, s));
    return Math.min(3, s);   // connect (or the 200 ms before it)
  }

  /* ---- Validation : bottom-hole sample transfer (mdtXfer) ----
     7 explanation stages mapped onto the existing animation phases:
       idle → 1 · heat, jacket seating (xfrH = 0) → 2 · heat ramp / soak → 3
       run: pressure ramp → 4 · valves opening → 5 · transfer → 6 · done → 7   */
  var XFER = {
    1: { t: 'Prepare and connect the sampler',
         d: 'The bottom-hole sampler has arrived at the laboratory containing fluid captured at reservoir conditions. It is connected to the laboratory transfer system and the receiving bottle.',
         w: 'A prepared, leak-free connection lets the sample move into the receiving bottle under controlled conditions.',
         e: 'Sampler docked; transfer line connected to the receiving bottle. Valves closed, pump off.',
         o: 'Start the transfer — the sampler is heated before any fluid moves.' },
    2: { t: 'Apply the heating jacket',
         d: 'The heating jacket is placed around the sampler before heating begins.',
         w: 'The jacket must remain around the sampler throughout the transfer to prevent cooling and fluid separation.',
         e: 'Heating jacket closing over the sampler body.',
         o: 'The jacket seated on the sampler before the temperature starts to rise.' },
    3: { t: 'Heat the sampler to 114 °C',
         d: 'The sample is heated gradually to the reservoir temperature of 114 °C.',
         dh: 'The sample has reached 114 °C and is held there until stable. The jacket keeps this temperature for the rest of the transfer.',
         w: 'The sample must be back at reservoir temperature before it is moved. Heating gradually, with the jacket kept in place, prevents cooling and fluid separation.',
         e: 'Jacket heating; temperature rising. Pump off — no fluid moving yet.',
         o: 'Temperature rising to 114 °C and holding steady.' },
    4: { t: 'Increase and stabilise the pressure',
         d: 'With the sample at 114 °C, the pump raises the system pressure and holds it steady.',
         w: 'Pressure must be raised and stable before the valves open, so the sample never sees a pressure drop that could release gas.',
         e: 'Transfer pump running; transfer pressure rising.',
         o: 'Transfer pressure rising and levelling off.' },
    5: { t: 'Open the valves gradually',
         d: 'With pressure and temperature stable, the sampler and transfer valves are opened gradually.',
         w: 'A slow opening avoids a sudden pressure drop across the valves that could cause gas breakout.',
         e: 'Sampler and transfer valves opening; flow path to the receiving bottle established.',
         o: 'Pressure holding steady as the valves open.' },
    6: { t: 'Transfer the sample',
         d: 'The sample moves into the receiving bottle while the pump maintains pressure and the jacket holds 114 °C.',
         w: 'Maintaining sufficient pressure prevents gas breakout and preserves the original fluid composition.',
         e: 'Sample leaving the sampler through the transfer line; receiving bottle filling.',
         o: 'Transferred volume increasing while pressure and temperature stay constant.' },
    7: { t: 'Close and seal the receiving bottle',
         d: 'The transfer is complete. The receiving bottle is closed and sealed with the sample held under pressure.',
         w: 'Sealing under pressure preserves the original fluid composition for the validation steps that follow.',
         e: 'Transfer pump stopped; valves closed.',
         o: 'Sample held in the receiving bottle — continue to the opening-pressure check.' }
  };
  function xferStage(xp, xfH, xfP) {
    if (xp === 'done') return 7;
    if (xp === 'heat') return xfH > 0 ? 3 : 2;
    if (xp === 'run') return xfP < 0.35 ? 4 : (xfP < 0.6 ? 5 : 6);
    return 1;
  }

  /* ---- Validation : opening pressure / restoration / free water / agitation (module02) ----
     Texts depend on the active sample source (bottomhole / wellhead / separator). */
  function qcText(step, src) {
    var sep = src === 'separator';
    if (step === 1) return { t: 'Step 1 · Opening-pressure check',
      d: 'Before restoration, the bottle is connected to the pressure pump and its valve is opened slowly. Pump pressure is increased gradually until communication with the sample is detected.',
      w: 'The pressure at the moment the sample begins to respond is recorded as the opening pressure. ' +
         (src === 'bottomhole'
           ? 'It indicates the pressure retained in the bottle after the laboratory transfer.'
           : 'It indicates the pressure retained in the bottle and helps identify pressure loss during transportation.'),
      e: 'Pressure pump connected; bottle valve opened slowly; pressure rising gradually.',
      o: 'The live pressure reading at the moment the sample responds — that is the opening pressure.' };
    if (step === 2) return sep ? { t: 'Step 2 · Sample restoration',
      d: 'The separator sample was collected at 200 psig and 35 °C. It is restored gradually to 2,500 psig while the separator temperature of 35 °C is maintained.',
      w: 'The higher pressure prepares the sample for controlled laboratory handling and keeps the fluid in the required condition before the next validation step.',
      e: 'Pump raising the pressure; heating jacket holding 35 °C.',
      o: 'Pressure reaching 2,500 psig at 35 °C — hold until the readings stabilise.' }
    : { t: 'Step 2 · Sample restoration',
      d: 'The sample is restored to 5,000 psig and 114 °C. Pressure and temperature are increased gradually, then held until the sample stabilises.',
      w: 'Reservoir pressure is 3,000 psig and reservoir temperature is 114 °C. The working pressure is set 2,000 psig above reservoir pressure as a safety margin — this keeps the fluid above its bubble-point pressure and single phase even if a small pressure drop occurs during handling or later laboratory operations.',
      e: 'Pump raising the pressure; heating jacket raising the temperature.',
      o: 'Pressure reaching 5,000 psig and temperature 114 °C, then holding steady.' };
    if (step === 3) return { t: 'Step 3 · Free-water settling and drainage (oil bottle)',
      d: 'After restoration the oil sample may carry free water as small liquid droplets dispersed through the oil (not gas bubbles). The bottle stays upright and still, with the pump and heating jacket holding the restored pressure and temperature, and is left to settle for 24 hours — shown here as an accelerated demonstration.',
      w: 'Water is denser than oil, so each droplet sinks under gravity; larger droplets fall faster, and droplets that meet coalesce into bigger ones. They collect as a free-water layer below the oil while the oil above clears. The bottom sample valve stays closed throughout settling. Then, as a separate action, only this settled water is drained through the bottom valve into the receiver: the pump follows the discharged volume at constant pressure, so the floating piston moves down and no gap forms in the bottle. The valve is closed as soon as the water is gone, before oil reaches the outlet. The water above the piston is hydraulic (pump-side) water — it never passes the piston or mixes with the sample. In this demonstration all of the represented free water settles within the simulated 24 h; a real sample may need longer or may not separate completely.',
      e: 'Settling: droplets descending and merging, bottom water layer growing, oil clearing, timer 0 → 24 h. Drainage: sample valve opening, water falling into the receiver, layer shrinking, piston moving down, valve closing.',
      o: 'The receiver volume equals the free water removed from the bottle, while the oil quantity and bottle pressure stay unchanged.' };
    var tgt = sep ? '2,500 psig and 35 °C' : '5,000 psig and 114 °C';
    return { t: 'Step 4 · Sample agitation',
      d: 'After restoration and free-water removal, the bottle is clamped on the inversion stand and turned slowly 0° → 180° → 0° (3 cycles), then held upright to stabilize, while the pump and heating jacket maintain ' + tgt + '.',
      w: 'Each inversion moves the oil along the cylinder on its own side of the floating piston: free gas bubbles rise through the oil, disperse and shrink as they redissolve, and compositional layering is removed. The pump stays connected to the water side through a flexible line, so the pressure is held throughout. The result is a homogeneous single-phase sample.',
      e: 'Bottle inverting slowly on the stand; gas bubbles moving through the oil and dissolving; pump and jacket holding the restoration conditions.',
      o: 'The bottle angle and cycle count, the bubbles getting smaller and disappearing, and pressure / temperature staying at ' + tgt + '.' };
  }

  /* ---- PV test (constant composition expansion) phases ---- */
  var PVP = {
    idle:   { t: 'Ready', d: 'The cell is at 5,000 psi with 30.0 cc and no point recorded yet.', w: 'The P–V test steps the pressure down and records the volume at each condition.', e: 'Pumps at rest.', o: 'Start the run to take the first point.' },
    set:    { t: 'Setting the condition', d: 'The pumps are moving the cell to the next pressure and the volume is responding.', w: 'Each point of the P–V curve must be taken at a stabilised pressure, one step at a time.', e: 'Pump piston moves; pressure and volume change together.', o: 'The volume change per psi — small above bubble point, much larger below it.' },
    a2b:    { t: 'Agitation stroke A → B', d: 'The full sample is displaced from Pump A into Pump B at constant pressure.', w: 'Mixing at each pressure step lets the fluid reach equilibrium before the volume is read, otherwise the point is recorded on a fluid that is still changing.', e: 'Pump A empties into Pump B through the transfer line.', o: 'Volume A + volume B staying constant during the stroke.' },
    b2a:    { t: 'Return stroke B → A', d: 'The sample is returned from Pump B to Pump A, completing one full agitation cycle.', w: 'A complete cycle returns the fluid to the measuring pump so the volume can be read on the same device every time.', e: 'Flow direction reverses in the transfer line.', o: 'The reversed flow arrow and the sample returning to Pump A.' },
    stab:   { t: 'Stabilising', d: 'The cell is held still and allowed to reach equilibrium.', w: 'Pressure and volume must stop drifting before a point is valid — this is where the fluid finishes coming to equilibrium.', e: 'Nothing moves.', o: 'The pressure reading going quiet.' },
    rec:    { t: 'Recording the point', d: 'The stabilised pressure and volume pair is added to the P–V table and plotted.', w: 'The plotted points build the two straight-line trends whose intersection is the saturation pressure.', e: 'A new point appears on the plot.', o: 'Where the point falls relative to the trend — the break in slope is the bubble point.' },
    psat:   { t: 'Bubble point confirmed', d: 'The two trends are extended and their intersection is taken as the saturation pressure.', w: 'Above Psat the fluid is single-phase liquid and only slightly compressible; below it, gas comes out of solution and the slope changes sharply. The break gives Psat.', e: 'Fit lines drawn to their intersection.', o: 'The intersection point — that is the bubble-point pressure and volume.' },
    'return': { t: 'Returning to the start condition', d: 'The cell is being taken back to 5,000 psi and 30.0 cc.', w: 'The sample is recompressed into single phase so it can be used for the next test.', e: 'Pumps recompress the cell.', o: 'Pressure and volume returning to the original charge condition.' },
    done:   { t: 'Test complete', d: 'All points are recorded and the cell is back at the starting condition.', w: 'The P–V data set and Psat are ready for the report.', e: 'Pumps at rest.', o: 'The complete curve and the reported saturation pressure.' }
  };

  /* ---- Differential liberation / separator test : step meanings ---- */
  var DLSTEP = {
    'initpv0': { w: 'The evacuated cell is charged with a known 80 cc of sample at 5,000 psig, so every later volume refers to one known quantity of fluid kept in single phase.', o: 'The sample front crossing the manifold, then Pump A filling while its piston retracts at a constant 5,000 psig until the cell reads 80.0000 cc.' },
    'initpv1': { w: 'The Validation PV sequence on the 80 cc charge: set each pressure, agitate Pump A \u2192 B \u2192 A, stabilize, read and record 12 points; the two fitted trends meet at the saturation pressure.', o: 'Volume rising slowly above Psat and faster below it; Psat 2,500 psig @ 83.08 cc.' },
    's0': { w: 'Differential liberation drops the pressure in stages. Each stage lets a defined amount of gas come out of solution at that stage pressure.', o: 'Pressure falling to the stage target while the cell volume expands.' },
    's1': { w: 'Agitation is continued until the volume stops changing — that is the point where gas evolution at this pressure is complete and the two phases are in equilibrium.', o: 'Successive cycle volumes converging; the last increments becoming very small.' },
    's2': { w: 'The gas train must be connected and its condition known before gas is removed, so that every cc leaving the cell is accounted for.', o: 'Balloon empty and the gasometer either standing by or isolated for this stage.' },
    's3': { w: 'The liberated gas is removed at constant stage pressure. This removal is what makes the process differential rather than flash — the composition left in the cell changes stage by stage.', o: 'The flow-rate drop that signals liquid reaching the outlet — that is when the cell is closed.' },
    's4': { w: 'A new P–V determination on the remaining oil gives the saturation pressure of the fluid that is left after this stage of gas removal.', o: 'A new, lower saturation pressure than the previous stage.' },
    's5': { w: 'Fitting the two trends gives the stage saturation condition, which is recorded with the stage volumes and gas quantities.', o: 'The recorded Psat and remaining oil volume for this stage.' }
  };

  /* ---- viscometer fluids (mirrors StageVisc) ---- */
  var VFL = { cond: { n: 'Gas condensate', mu: '0.35' }, oil: { n: 'Medium crude', mu: '4.80' }, heavy: { n: 'Heavy oil', mu: '180' } };

  /* ---- static screens ---- */
  var STATIC = {
    dashboard: { t: 'Dashboard', d: 'Module selection screen. No process is running.', w: 'The modules follow the real laboratory sequence: field sampling → transfer → quality check and restoration → PVT testing and GC → report.', e: 'None.', o: 'Pick the module you want; this panel then explains each step as it runs.' },
    validation: { t: 'Sample validation — overview', d: 'Landing page for the sample quality checks.', w: 'A PVT programme is only as good as the sample. Opening pressure, restoration, free-water check and homogenisation must all pass before the sample is charged into the cell.', e: 'None.', o: 'Work the checks in order — each one gates the next.' },
    analysis: { t: 'PVT analysis control centre', d: 'Selection screen for the analysis tests.', w: 'Groups the measurements made on the restored sample: constant composition expansion, differential liberation, separator tests, viscosity, density and GC.', e: 'None.', o: 'Choose a test to run its animated procedure.' },
    analysisTest: { t: 'PVT analysis test', d: 'Test selection / placeholder screen.', w: 'Holds the analysis routines that run on the charged cell.', e: 'None.', o: 'Select a test to continue.' },
    module04: { t: 'Report', d: 'Report assembly screen.', w: 'Collects the measured results — sample validation, PV/CCE, differential liberation, separator, viscosity, density and composition — into the deliverable report.', e: 'None.', o: 'Check that each section carries the measured values it should.' },
    module05: { t: 'PVT calculator', d: 'Correlation calculator for oil and gas properties.', w: 'Gives quick property estimates (correlations) to sanity-check measured laboratory data.', e: 'None.', o: 'Correlations are estimates — compare them with the measured values, do not replace them.' },
    about: { t: 'About', d: 'Information screen.', w: 'Describes the modules and the workflow the simulator follows.', e: 'None.', o: '—' },
    settings: { t: 'Settings', d: 'Application settings.', w: 'Theme and display options.', e: 'None.', o: '—' },
    mdtXfer: { t: 'Sample transfer to lab bottle', d: 'Transfer of the downhole sample from the sampling tool into an SPS/PDS bottle.', w: 'The transfer is made under pressure so the sample never drops below its saturation pressure and stays single phase for the laboratory.', e: 'Tool coupled to the bottle; fluid displaced across under pressure.', o: 'Transfer progress and the pressure being maintained throughout.' }
  };

  /* ---- dashboard: project overview (own layout, not the lab-step grid) ---- */
  var OVERVIEW = {
    intro: 'PVT Nexus is an interactive reservoir-fluid learning platform that demonstrates the complete PVT workflow, from collecting a representative fluid sample to validating it, performing laboratory analyses, and producing the final results.',
    steps: [
      { n: 'PVT Sampling', d: 'Explore how representative reservoir-fluid samples are collected using bottom-hole, wellhead, separator, and open-hole sampling methods.' },
      { n: 'Validation', d: 'Check the sample condition, transfer it safely to laboratory equipment, and restore it to the required pressure and temperature before testing.' },
      { n: 'Detailed PVT Analysis', d: 'Perform simulated laboratory procedures such as pressure-volume analysis, differential liberation, separator testing, flash analysis, and gas chromatography.' },
      { n: 'Report', d: 'Review and export the results produced from the completed workflow.' }
    ],
    tools: 'The Oil Calculator and Gas Calculator provide quick fluid-property calculations and correlations independently from the main laboratory workflow.',
    guide: 'Select any module to begin. The explanation panel will then update during each process to describe what is happening, why it is required, and the important changes the user should observe.'
  };

  /* ---- Module 01 : field sampling schematic overview (own layout) ---- */
  var FIELD_OVERVIEW = {
    kind: 'field',
    intro: 'This schematic shows the fluid-production path from the reservoir to the surface facilities and identifies the three main PVT sampling locations: bottom hole, wellhead, and separator. The best sampling method depends on the well condition, fluid phase behavior, and the required laboratory analysis.',
    points: [
      { n: 'Bottom-Hole Sampling', loc: 'Downhole · at the producing interval',
        p: ['The sample is collected inside the well, close to the producing reservoir interval. Because the fluid is captured near reservoir pressure and temperature, this method can provide a highly representative reservoir-fluid sample when the fluid remains single phase.'],
        sub: [
          { b: 'Cased-Hole Sampling', t: 'Collected inside a completed and cased well using a downhole sampling tool lowered to the required depth.' },
          { b: 'Open-Hole Sampling', t: 'Collected directly from the formation before the well is cased. A formation-testing tool isolates the selected interval, cleans the formation fluid, and captures the sample.' }
        ] },
      { n: 'Wellhead Sampling', loc: 'Surface · downstream of the X-tree',
        p: ['The sample is collected through a dedicated sampling valve located immediately downstream of the wellhead or X-tree on the production flowline. It is convenient because the sample is taken at surface without running a downhole tool.',
            'The sample must be collected carefully at the flowing wellhead pressure and temperature. A constant-pressure sampling bottle helps prevent additional phase separation and preserves the sample condition. Most suitable when the produced fluid remains single phase at the sampling point.'] },
      { n: 'Separator Sampling', loc: 'Surface · three-phase separator',
        p: ['The produced fluid enters the three-phase separator, where it separates into gas, oil, and water under separator pressure and temperature. Oil and gas samples are collected separately from their respective sampling points.',
            'In the laboratory, the separator oil and gas are recombined using the measured producing gas–oil ratio to reconstruct the original reservoir-fluid composition. Commonly used when the fluid has already become multiphase before reaching the surface.'] }
    ],
    compare: [
      { b: 'Bottom hole', t: 'Sample collected closest to reservoir conditions.' },
      { b: 'Wellhead', t: 'Surface sample collected before the fluid reaches the separator.' },
      { b: 'Separator', t: 'Oil and gas phases collected separately after surface separation.' }
    ],
    guide: 'Use the Bottom Hole, Wellhead, and Separator tabs to explore the equipment, procedure, and fluid behavior for each sampling method in more detail.'
  };

  /* ======================================================================
     DESCRIBE — read the live state and return the explanation for it
     ==================================================================== */
  function pack(o) {
    return { title: o.title, tag: o.tag || '', busy: !!o.busy, now: o.d || '', why: o.w || '',
             eq: o.e || '', watch: o.o || '', vals: o.vals || [], path: '', pathText: '',
             note: o.note || null, proc: o.proc || null };
  }

  function describe() {
    var m = ST('Main');
    if (!m) return null;
    var scr = m.screen || 'splash';
    if (scr === 'splash') return null;

    /* ---------------- Dashboard : project overview ---------------- */
    if (scr === 'dashboard') {
      var o = pack({ title: 'PVT Nexus Workflow', tag: 'PROJECT OVERVIEW' });
      o.overview = OVERVIEW;
      return o;
    }

    /* ---------------- Module 03 : charge + flash ---------------- */
    if (scr === 'module03') {
      var cStep = m.chargeStep || 0;
      if (cStep < 12) {
        /* 2026-09-29: between stages the card explains the stage that is ready next (the one the
           procedure panel shows), not the one just completed */
        var idx = m.chargeBusy ? (m.chargeStage || cStep) : (cStep > 0 ? Math.min(12, cStep + 1) : 0);
        var k = CHARGE[idx] || CHARGE[0];
        return pack({
          title: 'Charge to PVT Cell — ' + k.t,
          tag: m.chargeBusy ? 'RUNNING · STAGE ' + (m.chargeStage || 0) + ' / 12' : (cStep > 0 ? 'READY · STAGE ' + idx + ' / 12' : 'READY · STAGE 1 / 12'),
          busy: !!m.chargeBusy,
          d: k.d + (m.cellStatus ? '  Status: ' + m.cellStatus + '.' : ''),
          w: k.w, e: k.e, o: k.o,
          vals: [
            V('Cell pressure', num(m.cellP, 0), 'psi'),
            V('Cell vacuum', num(m.cellVac, 1), 'psi'),
            V('Transfer pump', num(m.tpVol === undefined ? 100 : m.tpVol, 1), 'mL'),
            V('Pump A', num(m.pumpA, 1), 'cc'),
            V('Pump B', num(m.pumpB, 1), 'cc'),
            V('Dead volume', num(m.deadVol, 1), 'cc'),
            V('Agitation cycles', num(m.agCycle, 0), '')
          ]
        });
      }
      var fs0 = m.fStep || 0;
      var f = m.fBusy ? (m.fStage || 0) : (fs0 > 0 && fs0 < 6 ? fs0 + 1 : fs0);
      var fk = FLASH[f] || FLASH[0];
      return pack({
        title: 'Flash Process — ' + fk.t,
        tag: m.fBusy ? 'RUNNING · STAGE ' + (m.fStage || 0) + ' / 6' : (fs0 >= 6 ? 'STAGE 6 / 6 COMPLETE' : 'READY · STAGE ' + Math.max(1, f) + ' / 6'),
        busy: !!m.fBusy,
        d: fk.d + (m.fStatus ? '  Status: ' + m.fStatus + '.' : ''),
        w: fk.w, e: fk.e, o: fk.o,
        vals: [
          V('Flash unit pressure', num(m.fuP, 1), 'psia'),
          V('Pump A', num(m.fPumpA, 1), 'cc'),
          V('Flashed volume', num(m.fFlashed, 1), 'cc'),
          V('Residual oil', num(m.fOil, 1), 'cc'),
          V('Gasometer', num(m.fGaso, 0), 'cc'),
          V('Balloon', num(m.fBalloon, 0), 'cc')
        ]
      });
    }

    /* ---------------- Module 01 : field sampling ---------------- */
    if (scr === 'module01') {
      var ph = m.phase || 'idle';
      var pt = m.activePoint || 'bottomhole';
      if (pt === 'overview') {
        var fo = pack({ title: 'Field Sampling Locations', tag: 'FIELD OVERVIEW' });
        fo.overview = FIELD_OVERVIEW;
        return fo;
      }
      /* ---- wellhead: short overview before sampling, then one stage at a time ---- */
      if (pt === 'wellhead') {
        var mi = LIVE.Main;
        var starting = ph === 'idle' && mi && mi.clockInt;          // the 200 ms before 'connect'
        if (ph === 'idle' && !starting) {
          var wo = pack({ title: 'Wellhead Sampling — Overview', tag: 'READY · 8 STAGES' });
          wo.overview = WH_OVERVIEW;
          return wo;
        }
        var sn = whStage(mi, ph), ws = WH[sn];
        return pack({
          title: 'Wellhead Sampling · Stage ' + sn + ' — ' + ws.t,
          tag: ph === 'done' ? 'COMPLETE · STAGE 8 / 8' : 'RUNNING · STAGE ' + sn + ' / 8',
          busy: ph !== 'done',
          d: ws.d, w: ws.w, e: ws.e, o: ws.o, note: WH_OVERVIEW.note,
          vals: [ V('Wellhead pressure', '1,450', 'psig'), V('Wellhead temperature', '60.0', '°C'),
                  V('Bottle gauge', num(m.mechPressure, 0), 'psig'), V('Elapsed', num(m.sampleSecs, 0), 's') ]
        });
      }
      /* ---- separator: method overview before sampling, then the active stage only ---- */
      if (pt === 'separator') {
        var ms = LIVE.Main;
        var sStarting = ph === 'idle' && ms && ms.clockInt;          // the 200 ms before 'connect'
        if (ph === 'idle' && !sStarting) {
          var so = pack({ title: 'Separator Sampling — Method Overview', tag: 'READY · 9 STAGES' });
          so.overview = SEP_OVERVIEW;
          return so;
        }
        var sq = sepStage(ms, ph), ss = SEP[sq];
        var sp = pack({
          title: 'Separator Sampling · Stage ' + sq + ' — ' + ss.t,
          tag: ph === 'done' ? 'COMPLETE · STAGE 9 / 9' : 'RUNNING · STAGE ' + sq + ' / 9',
          busy: ph !== 'done',
          d: ss.d, w: ss.w, e: ss.e, o: ss.o, note: SEP_OVERVIEW.note,
          vals: [ V('Separator pressure', '200', 'psig'), V('Separator temperature', '35.0', '°C'),
                  V('Elapsed', num(m.sampleSecs, 0), 's') ]
        });
        sp.path = ss.p; sp.pathText = SEP_PATH[ss.p];
        return sp;
      }
      /* bottom hole: the BottomHoleSim module owns its timeline and describes its own step */
      if (pt === 'bottomhole' && window.BottomHoleSim && window.BottomHoleSim.describe) {
        var bd = window.BottomHoleSim.describe();
        if (bd) return pack(bd);
      }
      var b = BH[ph] || BH.idle;
      var ptName = pt === 'bottomhole' ? ('Bottom-hole sampling · ' + ((m.bhMode === 'cased') ? 'cased hole (SRS)' : 'open hole (MDT/MPSR)'))
                 : pt === 'wellhead' ? 'Wellhead sampling' : 'Separator sampling';
      var vals = (pt === 'bottomhole')
        ? [ V('Depth', num(m.bhDepth, 0), 'ft'), V('Pressure', num(m.bhP, 0), 'psi'),
            V('Temperature', num(m.bhT, 0), '°F'), V('Contamination', num(m.bhCont, 0), '%'),
            V('Elapsed', num(m.sampleSecs, 0), 's') ]
        : [ V('Line pressure', num(m.mechPressure, 0), 'psi'), V('Elapsed', num(m.sampleSecs, 0), 's') ];
      return pack({
        title: ptName + ' — ' + b.t,
        tag: (ph === 'idle' || ph === 'done') ? ph.toUpperCase() : 'RUNNING · ' + ph.toUpperCase(),
        busy: ph !== 'idle' && ph !== 'done',
        d: b.d, w: b.w, e: b.e, o: b.o, vals: vals
      });
    }

    /* ---------------- Module 01b : transfer ---------------- */
    if (scr === 'mdtXfer') {
      var xp = m.xfrPhase || 'idle';
      // live values — same formulas the schematic animates on
      var xfP  = (m.xfrP || 0) / 100;                // fluid transfer progress
      var xfH  = (m.xfrH || 0) / 100;                // heating progress
      var xHot = (xp === 'run' || xp === 'done' || (xp === 'heat' && xfH >= 1));
      var xfPa = Math.min(1, xfP * 5);               // pump pressure ramp
      var xfCc = 450 * xfP;                          // sample transferred, cc
      var xfPs = (xp === 'run' || xp === 'done') ? 5000 * xfPa : 0;
      var xfT  = 22 + (114 - 22) * (xHot ? 1 : (xp === 'heat' ? xfH : 0));

      /* ---- one explanation per stage; values panel unchanged ---- */
      var xs = xferStage(xp, m.xfrH || 0, xfP), xk = XFER[xs];
      var xVals = (xp === 'heat') ? [
            V('Heating', num(m.xfrH, 0), '%'),
            V('Sample temperature', num(xfT, 0), '°C'),
            V('Target temperature', num(114, 0), '°C'),
            V('Reservoir temperature', num(114, 0), '°C'),
            V('Reservoir pressure', num(3000, 0), 'psig'),
            V('Transfer pump', 'Off', ''),
            V('Sample', 'In MPSR', '')
          ] : [
          V('Transfer', num(m.xfrP, 0), '%'),
          V('Heating', num(xHot ? 100 : 0, 0), '%'),
          V('Transferred', num(xfCc, 0) + ' / 450', 'cc'),
          V('Transfer pressure', num(xfPs, 0), 'psi'),
          V('Transfer temperature', num(xfT, 0), '°C'),
          V('Reservoir pressure', num(3000, 0), 'psi'),
          V('Reservoir temperature', num(114, 0), '°C'),
          V('Transfer pump', xp === 'run' ? 'Running' : xp === 'done' ? 'Stopped' : 'Off', ''),
          V('Sample', xp === 'done' ? 'In SPS/PDS bottle' : xp === 'run' ? 'Transferring' : 'In MPSR', '')
        ];
      return pack({
        title: 'Bottom-Hole Sample Transfer · Stage ' + xs + ' of 7 — ' + xk.t,
        tag: xp === 'done' ? 'COMPLETE · STAGE 7 / 7' : xp === 'idle' ? 'READY · STAGE 1 / 7' : 'RUNNING · STAGE ' + xs + ' / 7',
        busy: xp === 'heat' || xp === 'run',
        d: (xs === 3 && xHot && xk.dh) ? xk.dh : xk.d,
        w: xk.w, e: xk.e, o: xk.o,
        vals: xVals
      });
    }

    /* ---------------- Module 02 : QC / restoration ---------------- */
    if (scr === 'module02') {
      var q = m.qcStep || 1, qp = m.qcPhase || 'idle';
      var mv = LIVE.Main, qSrc = (mv && mv.valSource) ? mv.valSource() : 'bottomhole';
      var qk = qcText(q, qSrc);
      return pack({
        title: 'Sample Quality Check — ' + qk.t,
        tag: (q === 3 && qp !== 'done') ? ((m.qcSettle || 0) < 1 ? (qp === 'run' ? 'SETTLING · STEP 3 / 4' : 'READY TO SETTLE · STEP 3 / 4') : (qp === 'run' ? 'DRAINING · STEP 3 / 4' : 'SETTLED · READY TO DRAIN · STEP 3 / 4'))
           : qp === 'run' ? 'RUNNING · STEP ' + q + ' / 4' : (qp === 'done' ? 'STEP ' + q + ' / 4 COMPLETE' : 'STEP ' + q + ' / 4 READY'),
        busy: qp === 'run',
        d: qk.d, w: qk.w, e: qk.e, o: qk.o,
        vals: [
          V('Sample pressure', num(m.resP, 0), 'psi'),
          V('Sample temperature', num(m.resT, 0), '°C'),
          V('Settling time', num(Math.floor((m.qcSettle || 0) * 24 + 1e-6), 0) + ' / 24', 'h (simulated)'),
          V('Free water bled', num((m.water || 0) * 30, 1), 'cc'),
          V('Agitation', num((m.agitP || 0) * 100, 0), '%'),
          V('Bottle angle', num(window.QcAgitSim && q === 4 ? window.QcAgitSim.info(m.agitate ? (m.agitP || 0) : ((m.qcDone || {})[4] ? 1 : 0)).ang : 0, 0), '°')
        ]
      });
    }

    /* ---------------- PV test (CCE) ---------------- */
    if (scr === 'pvTest') {
      var p = ST('StagePVTest');
      if (p) {
        var pk = PVP[p.pvPhase || 'idle'] || PVP.idle;
        return pack({
          title: 'PV Test (bubble-point determination) — ' + pk.t,
          tag: p.pvRunning ? 'RUNNING · POINT ' + ((p.pvStep || 0) + 1) + ' / 12' : (p.pvReturned ? 'COMPLETE' : 'READY'),
          busy: !!p.pvRunning,
          d: pk.d, w: pk.w, e: pk.e, o: pk.o,
          vals: [
            V('Cell pressure', num(p.pvPressure, 0), 'psig'),
            V('Cell volume', num(p.pvVolume, 2), 'cc'),
            V('Points recorded', num(p.pvN, 0) + ' / 12', ''),
            V('Bubble point', p.pvConfirmed ? '2,700' : '—', p.pvConfirmed ? 'psig · 31.3 cc' : '')
          ]
        });
      }
    }

    /* ---------------- Direct density ---------------- */
    if (scr === 'density') {
      var dst = ST('StageDensity');
      if (dst) {
        return pack({
          title: 'Direct Density — ' + (dst.stage || 'Ready'),
          tag: dst.busy ? 'RUNNING · RUN ' + (dst.active || 1) + ' / 2' : (dst.verified ? 'VERIFIED' : 'RUN ' + (dst.active || 1) + ' / 2'),
          busy: !!dst.busy,
          d: dst.action || '',
          w: 'Density is measured directly as ρ = ΔM / ΔV. The clean, dry, empty coil is weighed (Mi); the PVT cell volume then falls from Vi = 30.0 cc to Vf = 23.0 cc as 7.0 cc of live sample is pushed into the coil (ΔV = Vi − Vf); the sealed coil is weighed again (Mf, ΔM = Mf − Mi). Two runs must agree within ±0.0005 g/cc before the value is accepted.',
          e: 'The coil moves between the balance and the PVT cell. With the block valve open (red T-handle in line with the tube) the pump piston rises, the cell volume falls by 7.0 cc and the sample travels progressively through the three stainless loops; the valve is then closed to seal the coil. Oil fills the coil first; because the coil sits below cell pressure, once the pressure falls below the bubble point gas comes out of solution and forms bubbles inside the oil, so the coil may hold two-phase fluid. The coil is sealed, so neither phase leaves it: the density is still calculated from the total mass change and the coil volume, ρ = ΔM / ΔV, and it is the density of the fluid as transferred, not of the liquid phase alone.',
          o: 'The two run densities — they must agree within ±0.0005 g/cc, otherwise the measurement is repeated.',
          vals: [
            V('Cell volume', num(dst.cellV, 2), 'cc'),
            V('Transferred', num(dst.xfer, 2), 'cc'),
            V('Balance', dst.bal == null ? '—' : num(dst.bal, 3), dst.bal == null ? '' : 'g'),
            V('Run 1 density', dst.r1 == null ? '—' : num(dst.r1, 4), dst.r1 == null ? '' : 'g/cc'),
            V('Run 2 density', dst.r2 == null ? '—' : num(dst.r2, 4), dst.r2 == null ? '' : 'g/cc'),
            V('Coil', dst.coilState || '—', '')
          ]
        });
      }
    }

    /* ---------------- Recombination (text lives in RecombSim.js) ---------------- */
    if (scr === 'recomb' && window.RecombSim && window.RecombSim.describe) {
      var rcd = window.RecombSim.describe();
      if (rcd) return pack(rcd);
    }

    /* ---------------- Differential liberation / separator ---------------- */
    if (scr === 'difflib' || scr === 'separator') {
      var isSep = scr === 'separator';
      // Separator Test (2026-09-30): the stage supplies its own explanation (six stages, embedded PV engine)
      var sepI = isSep ? LIVE['StageSeparator'] : null;
      if (sepI && sepI.describe) { var sd = sepI.describe(PVP, ST('StagePVTest')); if (sd) return pack(sd); }
      var d = ST(isSep ? 'StageSeparator' : 'StageDiffLib');
      if (d) {
        var stg = d.stage || 'initpv';
        // Initial PV determination runs the Validation PV Test itself: explain it with the PV-test meanings
        var pe = ST('StagePVTest');
        var s1pv = !isSep && stg !== 'initpv' && (d.pvRun || d.done && d.done[stg]) && pe;
        if (!isSep && ((stg === 'initpv' && (d.step || 0) >= 1) || s1pv) && pe) {
          var pq = PVP[pe.pvPhase || 'idle'] || PVP.idle;
          var sc = d.startTxt || '5,000 psig and 80.0000 cc', sw = sc.replace(' and ', ' with ');
          var fix = function (t) { return String(t || '').replace(/5,000 psi and 30\.0 cc/g, sc).replace(/5,000 psi with 30\.0 cc/g, sw); };
          return pack({
            title: 'Differential Liberation — ' + (s1pv ? 'Stage ' + stg.slice(5) + ' PV test (remaining sample)' : 'Initial PV determination') + ' — ' + pq.t,
            tag: pe.pvRunning ? 'RUNNING · POINT ' + ((pe.pvStep || 0) + 1) + ' / 12' : (pe.pvReturned ? 'COMPLETE' : 'READY'),
            busy: !!pe.pvRunning,
            d: fix(pq.d), w: pq.w, e: pq.e, o: pq.o,
            vals: [
              V('Cell pressure', num(pe.pvPressure, 0), 'psig'),
              V('Cell volume', num(pe.pvVolume, 4), 'cc'),
              V('Points recorded', num(pe.pvN, 0) + ' / 12', ''),
              V(s1pv ? 'Stage ' + stg.slice(5) + ' Psat' : 'Initial Psat', pe.pvConfirmed ? (d.psatTxt || '—') : '—', pe.pvConfirmed ? 'psig · cc' : '')
            ]
          });
        }
        var key = stg === 'initpv' ? ('initpv' + (d.step || 0)) : ('s' + (d.step || 0));
        var meta = DLSTEP[key] || { w: '', o: '' };
        var stgName = stg === 'initpv' ? 'Initial PV determination'
          : (isSep ? 'Separator stage' : 'Liberation stage ' + stg.slice(5));
        var nSteps = stg === 'initpv' ? 2 : 5;
        return pack({
          title: (isSep ? 'Separator Test' : 'Differential Liberation') + ' — ' + stgName,
          tag: (d.busy ? 'RUNNING · ' : '') + 'STEP ' + Math.min(nSteps, (d.step || 0) + 1) + ' / ' + nSteps + ' · ' + (d.stageTag || ''),
          busy: !!d.busy,
          d: d.action || '',
          w: meta.w, 
          e: 'Cell pressure and volume follow the stage; the gas train (balloon and gasometer) takes the liberated gas.',
          o: meta.o,
          vals: [
            V('Cell pressure', num(d.P, 0), 'psig'),
            V('Cell volume', num(d.V, 4), 'cc'),
            V('Balloon', num(d.balloon, 2), isSep ? 'psi' : 'psig'),
            V('Gasometer', num(d.gaso, 0), 'cc'),
            V('Points recorded', num((d.rows || []).length, 0), ''),
            V('Remaining sample', d.remaining == null ? '—' : num(d.remaining, 4), d.remaining == null ? '' : 'cc')
          ]
        });
      }
    }

    /* ---------------- Gas chromatography ---------------- */
    if (scr === 'gc') {
      var g = LIVE['StageGC'];
      if (g && g.state) {
        var gs = g.state, steps = [];
        try { steps = g.steps() || []; } catch (e) {}
        var cur = steps[gs.cur] || null;
        return pack({
          title: 'Gas Chromatography — ' + (cur ? cur.name : (gs.mode ? 'Analysis complete' : 'Select sample phase')),
          tag: gs.paused ? 'PAUSED' : (gs.busy || gs.running ? 'RUNNING · ' : '') + (steps.length ? 'STEP ' + ((gs.cur || 0) + 1) + ' / ' + steps.length : 'READY'),
          busy: !!(gs.busy || gs.running),
          d: (gs.status || '') + (gs.edu ? '  ' + gs.edu : ''),
          w: (cur && cur.w) || 'The GC separates the sample into its components: carrier gas sweeps the injected sample through a heated column where each component travels at its own speed. Retention time identifies the component and peak area, divided by its response factor, gives how much of it there is.',
          e: (cur && cur.e) || 'Carrier gas from the cylinder, sample injected at the inlet, oven temperature programme running, components eluting one by one into the detector.',
          o: gs.mode === 'gas'
            ? (gs.running ? 'Each detector builds its own chromatogram: the TCD (packed column) shows N₂ and CO₂ as well as hydrocarbons; the FID (capillary column) shows sharp hydrocarbon peaks only. GC oven ramps 35 → 325 °C while the balloon oven stays at 80 °C.' : 'Watch which valve is open and where each gas can flow: helium never meets the vacuum, and the sample reaches the columns only when the 6-port valve is switched to INJECT.')
            : (gs.running ? 'Peaks appearing in retention-time order — light components first, heavier ones later.' : 'Each preparation step must be complete before injection: a run started on an unconditioned system gives shifted retention times.'),
          vals: gs.mode === 'gas' ? [
            V('Carrier (He)', gs.flow ? num(gs.flow, 2) : '—', gs.flow ? 'mL/min' : ''),
            V('Injection valve', gs.ivOn > 0.5 ? 'INJECT' : 'LOAD', ''),
            V('Vacuum valve', gs.vvOpen > 0.5 ? 'OPEN' : 'CLOSED', ''),
            V('Bottle valve', gs.bvOpen > 0.5 ? 'OPEN' : 'CLOSED', ''),
            V('Injection pressure', gs.injP == null ? '—' : num(gs.injP, 1), 'psi'),
            V('Balloon oven', num(gs.balT, 0), '°C'),
            V('GC oven', gs.ovenT == null ? '—' : num(gs.ovenT, 0), gs.ovenT == null ? '' : '°C'),
            V('Run time', num(gs.runMin, 2), 'min'),
            V('Peaks (TCD / FID)', num(gs.nDet, 0) + ' / ' + num(gs.nDetF, 0), '')
          ] : [
            V('Phase', gs.mode ? (gs.mode === 'gas' ? 'Gas' : 'Oil') : '—', ''),
            V('Run time', num(gs.runMin, 2), 'min'),
            V('Oven', gs.ovenT == null ? '—' : num(gs.ovenT, 0), gs.ovenT == null ? '' : '°C'),
            V('Inlet', gs.injT == null ? '—' : num(gs.injT, 0), gs.injT == null ? '' : '°C'),
            V('Components detected', num(gs.nDet, 0), '')
          ]
        });
      }
    }

    /* ---------------- Viscosity ---------------- */
    if (scr === 'visc') {
      var v = ST('StageVisc');
      if (v) {
        return pack({
          title: 'Viscosity — ' + (v.running ? 'piston travelling ' + (v.coil === 'DOWN' ? 'down' : 'up') : 'ready'),
          tag: v.running ? 'RUNNING' : 'READY',
          busy: !!v.running,
          d: v.running
            ? 'The electromagnetic coils drive the piston through the sample; the time it takes to travel the measured distance is being recorded.'
            : 'The viscometer is loaded and idle. Select a fluid and start the piston.',
          w: 'In an electromagnetic (falling/driven piston) viscometer the travel time is proportional to viscosity: µ = K × travel time, with K the calibration constant of the piston. A thicker fluid resists the piston more, so it takes longer to cross.',
          e: 'The two coils energise alternately; the piston shuttles up and down inside the measurement chamber.',
          o: 'How much slower the piston moves as you switch from thin to thick fluid — that time difference is the measurement.',
          vals: [
            V('Fluid', VFL[v.fluid] ? VFL[v.fluid].n : '—', ''),
            V('Travel time', v.t == null ? '—' : num(v.t, 2), v.t == null ? '' : 's'),
            V('Viscosity', (v.t == null || !VFL[v.fluid]) ? '—' : VFL[v.fluid].mu, v.t == null ? '' : 'cP'),
            V('Stroke', v.coil || '—', '')
          ]
        });
      }
    }

    /* ---------------- Kinematic viscosity test (text lives in StageViscKin.js) ---------------- */
    if (scr === 'viscKin') {
      var kv = LIVE['StageViscKin'];
      if (kv && kv.guide) { try { return pack(kv.guide(V, num)); } catch (e) {} }
    }

    /* ---------------- Single-phase viscosity test (text lives in StageViscSingle.js) ---------------- */
    if (scr === 'viscSingle') {
      var vs = LIVE['StageViscSingle'];
      if (vs && vs.guide) { try { return pack(vs.guide(V, num)); } catch (e) {} }
    }

    /* ---------------- Two-phase viscosity test (text lives in StageViscTwo.js) ---------------- */
    if (scr === 'viscTwo') {
      var v2 = LIVE['StageViscTwo'];
      if (v2 && v2.guide) { try { return pack(v2.guide(V, num)); } catch (e) {} }
    }

    /* ---------------- Viscosity module pages (text lives in ViscModule.js) ---------------- */
    var vx = window.VISC_MODULE && window.VISC_MODULE.explainFor(scr);
    if (vx) return pack({ title: vx.t, tag: 'NO PROCESS RUNNING', d: vx.d, w: vx.w, e: vx.e, o: vx.o, vals: [] });

    /* ---------------- static screens ---------------- */
    var s2 = STATIC[scr];
    if (s2) return pack({ title: s2.t, tag: 'NO PROCESS RUNNING', d: s2.d, w: s2.w, e: s2.e, o: s2.o, vals: [] });

    return pack({ title: 'Current screen', tag: '', d: 'No animated process is running on this screen.',
      w: 'Open a laboratory module to see its procedure explained step by step.', e: 'None.', o: '—', vals: [] });
  }

  /* ======================================================================
     UI — small floating button at the bottom centre + slide-up overlay.

     Nothing is reserved and nothing is resized: the page keeps its original
     one-screen layout (no scrollbars). The panel is a temporary floating
     card that slides up over the middle of the screen, clear of the action
     rows the screens keep at their bottom corners, and is dismissed again.
     ==================================================================== */
  var CSS = '' +
  '#sgWrap{position:fixed;left:0;right:0;bottom:0;z-index:9500;display:flex;flex-direction:column;' +
  'align-items:center;justify-content:flex-end;pointer-events:none;font-family:var(--font-main);}' +

  /* ---- floating card (overlay, does not affect page layout) ---- */
  '#sgPanel{pointer-events:auto;width:min(1000px,calc(100vw - 320px));min-width:min(560px,calc(100vw - 24px));' +
  'max-height:min(38vh,320px);margin-bottom:8px;overflow:auto;background:var(--panel);' +
  'border:1px solid var(--line2);border-radius:12px;box-shadow:0 16px 44px rgba(0,0,0,.34);' +
  'opacity:0;visibility:hidden;transform:translateY(14px);' +
  'transition:opacity .22s ease,transform .26s ease,visibility 0s linear .26s;}' +
  '#sgWrap.open #sgPanel{opacity:1;visibility:visible;transform:none;transition:opacity .22s ease,transform .26s ease,visibility 0s;}' +

  /* ---- small pill button, exact bottom centre ---- */
  '#sgBtn{pointer-events:auto;margin-bottom:12px;display:inline-flex;align-items:center;justify-content:center;' +
  'gap:8px;max-width:min(560px,92vw);padding:7px 14px;border-radius:20px;cursor:pointer;' +
  'background:var(--panel);border:1px solid var(--line2);color:var(--txt2);font-family:inherit;' +
  'font-size:12.5px;font-weight:600;letter-spacing:.2px;box-shadow:0 5px 16px rgba(0,0,0,.22);' +
  'transition:border-color .15s ease,color .15s ease,background .15s ease;}' +
  '#sgBtn:hover{border-color:var(--blue);color:var(--txt);}' +
  '#sgWrap.open #sgBtn{border-color:var(--blue);color:var(--txt);background:rgba(77,157,255,.10);}' +
  '#sgDot{width:6px;height:6px;border-radius:50%;background:var(--mut2);flex:0 0 auto;}' +
  '#sgWrap.busy #sgDot{background:var(--blue);animation:sgPulse 1.15s ease-in-out infinite;}' +
  '@keyframes sgPulse{0%,100%{opacity:.35;}50%{opacity:1;}}' +
  '#sgBtnStep{font-weight:400;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
  'font-size:11px;letter-spacing:.2px;}' +
  '#sgChev{color:var(--mut);font-size:10px;transition:transform .25s ease;}' +
  '#sgWrap.open #sgChev{transform:rotate(180deg);}' +

  /* ---- card contents ---- */
  '#sgIn{padding:12px 16px 14px;}' +
  '#sgHead{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;' +
  'border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:10px;}' +
  '#sgTitle{font-size:15px;font-weight:700;color:var(--txt);letter-spacing:-.2px;flex:1 1 auto;min-width:170px;}' +
  '#sgTag{font-size:var(--fs-status-badge);font-weight:var(--fw-status-badge);letter-spacing:var(--ls-status-badge);' +
  'color:var(--accb);background:var(--chipbg);border:1px solid var(--line2);border-radius:6px;padding:3px 8px;' +
  'white-space:nowrap;text-transform:uppercase;}' +
  '#sgClose{cursor:pointer;background:none;border:none;color:var(--mut);font-size:15px;line-height:1;' +
  'padding:2px 3px;font-family:inherit;}' +
  '#sgClose:hover{color:var(--txt);}' +
  '.sgGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:11px 22px;}' +
  '.sgSec{min-width:0;}' +
  '.sgLbl{font-size:var(--fs-tech-caption);font-weight:var(--fw-tech-caption);letter-spacing:var(--ls-tech-caption);' +
  'text-transform:uppercase;color:var(--lbl2);margin-bottom:4px;}' +
  '.sgTxt{font-size:13px;line-height:1.5;color:var(--txt2);}' +
  '#sgVals{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-top:9px;border-top:1px solid var(--line);}' +
  '.sgVal{background:var(--icard);border:1px solid var(--line);border-radius:7px;padding:4px 9px;min-width:94px;}' +
  '.sgVal b{display:block;font-size:10px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;' +
  'color:var(--lbl2);margin-bottom:1px;}' +
  '.sgVal span{font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--txt);}' +
  '.sgVal span i{font-style:normal;font-size:10px;color:var(--mut);margin-left:3px;}' +
  /* ---- project overview layout (dashboard only) ---- */
  '#sgOv{display:none;}' +
  '#sgWrap.ov #sgOv{display:block;}' +
  '#sgWrap.ov .sgGrid,#sgWrap.ov #sgVals{display:none !important;}' +
  '.sgOvIntro{font-size:13px;line-height:1.5;color:var(--txt2);margin-bottom:10px;}' +
  '.sgOvFlow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px;}' +
  '.sgOvStep{background:var(--icard);border:1px solid var(--line);border-top:2px solid var(--blue);' +
  'border-radius:8px;padding:8px 10px 9px;min-width:0;}' +
  '.sgOvStep h4{margin:0 0 4px;display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--txt);}' +
  '.sgOvNum{flex:0 0 auto;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;' +
  'justify-content:center;font-size:10.5px;font-weight:700;background:var(--blue);color:var(--onacc);}' +
  '.sgOvStep p{margin:0;font-size:11.8px;line-height:1.45;color:var(--txt2);}' +
  '.sgOvFoot{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px;padding-top:9px;border-top:1px solid var(--line);}' +
  /* ---- field sampling overview (module 01 schematic) ---- */
  '#sgWrap.ov #sgHead{position:sticky;top:-12px;z-index:2;background:var(--panel);padding-top:12px;margin-top:-12px;}' +
  '.sgFdGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px;}' +
  '.sgFdCard{background:var(--icard);border:1px solid var(--line);border-top:2px solid var(--blue);' +
  'border-radius:8px;padding:8px 10px 9px;min-width:0;}' +
  '.sgFdCard h4{margin:0 0 2px;display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--txt);}' +
  '.sgFdLoc{font-size:10px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--mut);margin:0 0 5px 25px;}' +
  '.sgFdCard p{margin:0 0 5px;font-size:11.8px;line-height:1.45;color:var(--txt2);}' +
  '.sgFdCard p:last-child{margin-bottom:0;}' +
  '.sgFdList{margin:4px 0 0;padding:0 0 0 14px;font-size:11.8px;line-height:1.45;color:var(--txt2);}' +
  '.sgFdList li{margin:0 0 3px;}' +
  '.sgFdList li:last-child{margin-bottom:0;}' +
  '.sgFdList b{color:var(--txt);font-weight:600;}' +
  '.sgFdCmp{font-size:13px;line-height:1.5;margin-top:0;}' +
  /* ---- wellhead sampling overview ---- */
  '.sgWhCond{font-size:12px;font-weight:600;color:var(--txt);margin:0 0 10px;padding:6px 10px;border-radius:7px;' +
  'background:var(--icard);border:1px solid var(--line);border-left:2px solid var(--blue);}' +
  '.sgWhSeq{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:10px;}' +
  '.sgWhStep{display:flex;align-items:center;gap:7px;font-size:11.8px;color:var(--txt2);padding:5px 8px;' +
  'border:1px solid var(--line);border-radius:7px;background:var(--icard);min-width:0;}' +
  '.sgWhStep b{flex:0 0 auto;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;' +
  'justify-content:center;font-size:10.5px;font-weight:700;background:var(--blue);color:var(--onacc);}' +
  /* ---- separator sampling: liquid (oil) path vs gas path ---- */
  '.sgFdCard.oil,.sgWhStep.oil{border-top-color:var(--amb);}' +
  '.sgFdCard.gas,.sgWhStep.gas{border-top-color:#38b6d8;}' +
  '.sgWhStep.oil,.sgWhStep.gas{border-top-width:2px;}' +
  '.sgFdCard.oil .sgOvNum,.sgWhStep.oil b{background:var(--amb);color:#1a1206;}' +
  '.sgFdCard.gas .sgOvNum,.sgWhStep.gas b{background:#38b6d8;color:#04141c;}' +
  '.sgWhSeq.sep{grid-template-columns:repeat(3,minmax(0,1fr));}' +
  '#sgNote,.sgNoteBox{display:flex;flex-direction:column;gap:3px;margin:0 0 10px;padding:7px 10px;border-radius:7px;border:1px solid var(--line2);background:var(--icard);}' +
  '#sgNote b,.sgNoteBox b{font-family:"IBM Plex Mono",monospace;font-size:9px;letter-spacing:.9px;text-transform:uppercase;color:var(--mut);font-weight:600;}' +
  '#sgNote span,.sgNoteBox span{font-size:12px;line-height:1.45;color:var(--txt2);}' +
  '#sgWrap.ov #sgNote,#sgWrap.ov #sgProc{display:none !important;}' +
  '#sgProc{margin:10px 0 0;}' +
  '.sgProcQ{margin:2px 0 6px;}' +
  '.sgProcL{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;}' +
  '.sgProcL li{display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:6px;font-size:12px;color:var(--dis,var(--mut));}' +
  '.sgProcL li b{width:17px;height:17px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-family:"IBM Plex Mono",monospace;font-size:8.5px;border:1px solid var(--line2);}' +
  '.sgProcL li.d{color:var(--txt2);} .sgProcL li.d b{border-color:var(--accg);color:var(--accg);background:rgba(70,211,154,.12);}' +
  '.sgProcL li.on{background:rgba(77,157,255,.10);color:var(--txt);font-weight:600;} .sgProcL li.on b{border-color:var(--blue);color:var(--blue);background:rgba(77,157,255,.16);}' +
  '#sgPath{display:none;}' +
  '#sgPath.on{display:inline-flex;align-items:center;gap:7px;margin:-2px 0 10px;padding:3px 9px;border-radius:6px;' +
  'font-size:10.5px;font-weight:700;letter-spacing:.7px;border:1px solid var(--line2);background:var(--chipbg);color:var(--txt2);}' +
  '#sgPath.on::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--mut2);flex:0 0 auto;}' +
  '#sgPath.oil{color:var(--amb);border-color:rgba(231,177,90,.45);background:rgba(231,177,90,.10);}' +
  '#sgPath.oil::before{background:var(--amb);}' +
  '#sgPath.gas{color:#2fa3c6;border-color:rgba(56,182,216,.45);background:rgba(56,182,216,.10);}' +
  '#sgPath.gas::before{background:#38b6d8;}' +
  '#sgPath.both::before{background:linear-gradient(90deg,var(--amb) 50%,#38b6d8 50%);}' +
  '#sgWrap.ov #sgPath{display:none !important;}' +
  /* Bottom Hole page: card kept over the schematic, clear of the right process panel */
  '#sgWrap.dock{right:300px;}' +
  '#sgWrap.dock #sgPanel{width:min(900px,calc(100vw - 340px));min-width:0;}' +
  '@media (max-width:900px){.sgWhSeq{grid-template-columns:repeat(2,minmax(0,1fr));}}' +
  '@media (max-width:900px){.sgFdGrid{grid-template-columns:1fr;}}' +
  '@media (max-width:900px){.sgOvFlow{grid-template-columns:repeat(2,minmax(0,1fr));}.sgOvFoot{grid-template-columns:1fr;}}' +
  '@media (max-width:900px){#sgPanel{width:calc(100vw - 20px);min-width:0;max-height:46vh;}' +
  '#sgBtnStep{display:none;}}' +
  /* ==== LAYOUT v2 (2026-09-28): Explain lives in the top bar; the card is a docked side
     drawer that RESERVES its width (the page reflows next to it) - it never covers the
     schematic, the readouts or any control, and scrolls internally. ==== */
  '#sgWrap{position:fixed;left:auto;right:0;top:52px;bottom:0;width:var(--sg-w);z-index:40;display:block;pointer-events:none;}' +
  '#sgWrap.open{pointer-events:auto;}' +
  '#sgWrap.dock{right:0;}' +
  '#sgPanel,#sgWrap.dock #sgPanel{width:100%;min-width:0;height:100%;max-height:none !important;margin:0 !important;border-radius:0;' +
  'border:none;border-left:1px solid var(--line2);box-shadow:-10px 0 28px rgba(10,20,40,.10);transform:translateX(24px);overflow-y:auto;overscroll-behavior:contain;}' +
  '#sgWrap.open #sgPanel{transform:none;}' +
  'html.sg-open main{margin-right:var(--sg-w);transition:margin-right .22s ease;}' +
  'html{--sg-w:clamp(300px,24vw,400px);}' +
  '#sgIn{padding:14px 16px 18px;}' +
  '#sgHead,#sgWrap.ov #sgHead{position:sticky;top:-14px;z-index:2;background:var(--panel);padding-top:14px;margin-top:-14px;}' +
  '.sgGrid{grid-template-columns:1fr;gap:12px;}' +
  '.sgOvFlow,.sgFdGrid,.sgWhSeq,.sgWhSeq.sep,.sgOvFoot{grid-template-columns:1fr;}' +
  '#sgBtn{margin:0;height:34px;padding:0 12px;border-radius:9px;box-shadow:none;font-size:12px;font-weight:600;max-width:none;gap:7px;flex:0 0 auto;}' +
  '#sgBtn.sg-hide{display:none !important;}' +
  '#sgWrap.pc-none{display:none !important;}' +
  '#sgBtn.on{border-color:var(--blue);color:var(--txt);background:rgba(77,157,255,.10);}' +
  '#sgBtn.on #sgChev{transform:rotate(180deg);}' +
  '#sgBtn.busy #sgDot{background:var(--blue);animation:sgPulse 1.15s ease-in-out infinite;}' +
  '#sgBtnStep{max-width:180px;}' +
  '@media (max-width:1180px){#sgBtnStep{display:none;}}' +
  /* narrow windows: the drawer becomes a bottom sheet over the page (no room to reserve) */
  '@media (max-width:1000px){html.sg-open main{margin-right:0;margin-bottom:min(52vh,420px);}' +
  '#sgWrap{left:0;right:0;top:auto;width:auto;height:min(52vh,420px);}' +
  '#sgPanel,#sgWrap.dock #sgPanel{border-left:none;border-top:1px solid var(--line2);box-shadow:0 -10px 28px rgba(10,20,40,.18);transform:translateY(24px);}}';

  var elOv, ovBuilt = false;
  var wrap, btn, btnStep, panel, elTitle, elTag, elNow, elWhy, elEq, elWatch, elVals, elPath, elNote, elProc;
  var open = false, lastSig = '', shown = true;

  function build() {
    var st = document.createElement('style');
    st.setAttribute('data-sg', '1');
    st.textContent = CSS;
    document.head.appendChild(st);

    wrap = document.createElement('div');
    wrap.id = 'sgWrap';
    wrap.innerHTML =
      '<div id="sgPanel"><div id="sgIn">' +
        '<div id="sgHead"><div id="sgTitle"></div><div id="sgTag"></div>' +
          '<button id="sgClose" type="button" title="Close">&#10005;</button></div>' +
        '<div id="sgOv"></div>' +
        '<div id="sgPath"></div>' +
        '<div id="sgNote"></div>' +
        '<div class="sgGrid">' +
          '<div class="sgSec"><div class="sgLbl">What is happening now</div><div class="sgTxt" id="sgNow"></div></div>' +
          '<div class="sgSec"><div class="sgLbl">Why this step is done</div><div class="sgTxt" id="sgWhy"></div></div>' +
          '<div class="sgSec"><div class="sgLbl">Equipment movement</div><div class="sgTxt" id="sgEq"></div></div>' +
          '<div class="sgSec"><div class="sgLbl">What to observe</div><div class="sgTxt" id="sgWatch"></div></div>' +
        '</div>' +
        '<div id="sgProc"></div>' +
        '<div id="sgVals"></div>' +
      '</div></div>' +
      '<button id="sgBtn" type="button" aria-expanded="false">' +
        '<span id="sgDot"></span><span>Explain Current Step</span>' +
        '<span id="sgBtnStep"></span><span id="sgChev">&#9656;</span>' +
      '</button>';
    document.body.appendChild(wrap);

    btn = wrap.querySelector('#sgBtn');
    btnStep = wrap.querySelector('#sgBtnStep');
    panel = wrap.querySelector('#sgPanel');
    elTitle = wrap.querySelector('#sgTitle');
    elTag = wrap.querySelector('#sgTag');
    elNow = wrap.querySelector('#sgNow');
    elWhy = wrap.querySelector('#sgWhy');
    elEq = wrap.querySelector('#sgEq');
    elWatch = wrap.querySelector('#sgWatch');
    elVals = wrap.querySelector('#sgVals');
    elOv = wrap.querySelector('#sgOv');
    elPath = wrap.querySelector('#sgPath');
    elNote = wrap.querySelector('#sgNote');
    elProc = wrap.querySelector('#sgProc');

    btn.addEventListener('click', function () { toggle(); });
    wrap.querySelector('#sgClose').addEventListener('click', function () { toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) toggle(false); });
    window.addEventListener('resize', function () { place(); });

    /* the widget is an overlay only — the page keeps its own layout */
    document.documentElement.classList.remove('sg-on');
    document.documentElement.style.removeProperty('--sg-h');

    try { open = localStorage.getItem('sgOpen') === '1'; } catch (e) {}
    wrap.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* ---------------------------------------------------------------------
     Keep the overlay clear of the screen's own controls.
     Real controls (buttons, inputs and small clickable chips — not the big
     clickable cards that make up a whole screen) are measured, and the card
     is lifted so its bottom edge sits above the highest one it would touch.
     ------------------------------------------------------------------- */
  var BTN_GAP = 12, CLEAR = 10, TOP_SAFE = 60;

  function controls() {
    var out = [], all;
    try { all = document.querySelectorAll('#app button, #app input, #app select, #app a, #app [onclick]'); }
    catch (e) { return out; }
    for (var i = 0; i < all.length; i++) {
      var el = all[i], r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      var tag = el.tagName;
      var isControl = (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'A') ||
                      (r.height <= 120 && r.width <= 480);   /* chips / small clickables */
      if (!isControl) continue;                              /* full-screen clickable cards are not "controls" here */
      out.push(r);
    }
    return out;
  }

  /* lowest y the overlay may reach, for a band spanning [left,right] */
  function clearanceFor(left, right, ctrls, H) {
    var limit = H;
    for (var i = 0; i < ctrls.length; i++) {
      var r = ctrls[i];
      if (r.right <= left || r.left >= right) continue;      /* no horizontal overlap */
      if (r.bottom < H * 0.42) continue;                     /* only the lower part of the screen matters */
      if (r.top < limit) limit = r.top;
    }
    return limit;
  }

  function place() {
    /* v2: the button sits in the top bar (#sgSlot) and the card is a docked drawer -
       nothing floats over the page, so there is nothing to measure or dodge */
    /* 2026-09-29: the top-bar button is removed on every page. The drawer is opened only by
       "Explain This Stage" in the procedure panel (ProcCtl.js); it shows while a page with a
       procedure panel is on screen (the open / closed choice is kept across pages). */
    var on = !!(shown && window.__PC_HAS_PANEL);
    btn.classList.add('sg-hide');
    wrap.classList.toggle('pc-none', !on);
    btn.classList.toggle('on', !!open);
    var ho = open && on;
    if (document.documentElement.classList.contains('sg-open') !== ho) {
      document.documentElement.classList.toggle('sg-open', ho);
      /* SVG / canvas pages size from their box: let them re-measure after the reflow */
      setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, 260);
    }
  }

  function toggle(force) {
    open = (force === undefined) ? !open : !!force;
    try { localStorage.setItem('sgOpen', open ? '1' : '0'); } catch (e) {}
    wrap.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    tick();
  }

  function tick() {
    var info;
    try { info = describe(); } catch (e) { info = null; }
    /* a process held by the procedure panel (Pause, or a stage waiting at its start) is not running */
    var pst = window.__PC_STATUS;
    if (info && (pst === 'paused' || pst === 'ready') && (pst === 'paused' || (window.PCLK && PCLK.paused()))) {
      var lab = pst === 'paused' ? 'PAUSED' : 'READY';
      info.busy = false;
      if (typeof info.tag === 'string') info.tag = info.tag.replace(/^RUNNING/, lab).replace(/· RUNNING/, '· ' + lab);
    }

    /* screens with no step (splash): nothing is shown at all */
    if (!info) {
      if (shown) { shown = false; wrap.style.display = 'none'; }
      place();
      return;
    }
    if (!shown) { shown = true; wrap.style.display = ''; }

    wrap.classList.toggle('busy', !!info.busy);
    btn.classList.toggle('busy', !!info.busy);
    wrap.classList.toggle('ov', !!info.overview);

    /* Bottom Hole page has its own "Explain step" button in the process panel:
       the floating pill is hidden there so it never covers the schematic */
    var mm = ST('Main');
    var docked = !!(mm && mm.screen === 'module01' && mm.activePoint === 'bottomhole' && mm.m01Picked);
    /* v2: the top-bar button is shown on every page (Bottom Hole keeps its own button too) */
    wrap.classList.toggle('dock', docked);

    var shortStep = info.tag ? ('· ' + info.tag) : '';
    if (btnStep.textContent !== shortStep) btnStep.textContent = shortStep;

    place();

    if (!open) return;   // card hidden — nothing else to repaint

    if (elTitle.textContent !== info.title) elTitle.textContent = info.title;
    if (elTag.textContent !== info.tag) elTag.textContent = info.tag;
    if (info.overview) {
      if (ovBuilt !== info.overview) { elOv.innerHTML = ovHTML(info.overview); ovBuilt = info.overview; }
      return;   // overview has its own layout — skip the lab-step sections
    }
    /* sampling-path strip (separator: liquid line vs gas line) */
    var pCls = info.path ? ('on ' + info.path) : '';
    if (elPath.className !== pCls) elPath.className = pCls;
    var pTxt = info.pathText || '';
    if (elPath.textContent !== pTxt) elPath.textContent = pTxt;
    /* page-level notes moved out of the sampling side panels (Pressure maintenance, Separate phases) */
    var nH = info.note ? '<b>' + esc(info.note.k) + '</b><span>' + esc(info.note.t) + '</span>' : '';
    if (elNote.__h !== nH) { elNote.innerHTML = nH; elNote.__h = nH; elNote.style.display = nH ? '' : 'none'; }
    /* full procedure list (Bottom Hole: moved out of the side panel) */
    var pH = '';
    if (info.proc) {
      pH = '<div class="sgLbl">Procedure</div>' + (info.proc.q ? '<div class="sgTxt sgProcQ">' + esc(info.proc.q) + '</div>' : '') +
        '<ol class="sgProcL">' + info.proc.items.map(function (t, i) {
          var c = info.proc.done ? 'd' : i < info.proc.cur ? 'd' : i === info.proc.cur ? 'on' : '';
          return '<li class="' + c + '"><b>' + (i + 1) + '</b><span>' + esc(t) + '</span></li>';
        }).join('') + '</ol>';
    }
    if (elProc.__h !== pH) { elProc.innerHTML = pH; elProc.__h = pH; elProc.style.display = pH ? '' : 'none'; }
    if (elNow.textContent !== info.now) elNow.textContent = info.now;
    if (elWhy.textContent !== info.why) elWhy.textContent = info.why;
    if (elEq.textContent !== info.eq) elEq.textContent = info.eq;
    if (elWatch.textContent !== info.watch) elWatch.textContent = info.watch;

    var sig = info.vals.map(function (v) { return v.l + '=' + v.v + v.u; }).join('|');
    if (sig !== lastSig) {
      lastSig = sig;
      elVals.innerHTML = info.vals.map(function (v) {
        return '<div class="sgVal"><b>' + esc(v.l) + '</b><span>' + esc(String(v.v)) +
               (v.u ? '<i>' + esc(v.u) + '</i>' : '') + '</span></div>';
      }).join('');
      elVals.style.display = info.vals.length ? '' : 'none';
    }
  }

  function fieldHTML(ov) {
    return '<div class="sgOvIntro">' + esc(ov.intro) + '</div>' +
      '<div class="sgLbl">Sampling locations</div>' +
      '<div class="sgFdGrid">' + ov.points.map(function (pt, i) {
        return '<div class="sgFdCard"><h4><span class="sgOvNum">' + (i + 1) + '</span>' + esc(pt.n) + '</h4>' +
          '<div class="sgFdLoc">' + esc(pt.loc) + '</div>' +
          pt.p.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
          (pt.sub ? '<ul class="sgFdList">' + pt.sub.map(function (s) {
            return '<li><b>' + esc(s.b) + ':</b> ' + esc(s.t) + '</li>';
          }).join('') + '</ul>' : '') +
        '</div>';
      }).join('') + '</div>' +
      '<div class="sgOvFoot">' +
        '<div class="sgSec"><div class="sgLbl">Key comparison</div><ul class="sgFdList sgFdCmp">' +
          ov.compare.map(function (c) { return '<li><b>' + esc(c.b) + ':</b> ' + esc(c.t) + '</li>'; }).join('') +
        '</ul></div>' +
        '<div class="sgSec"><div class="sgLbl">User guidance</div><div class="sgTxt">' + esc(ov.guide) + '</div></div>' +
      '</div>';
  }

  function wellheadHTML(ov) {
    return '<div class="sgOvIntro">' + esc(ov.intro) + '</div>' +
      '<div class="sgFdGrid">' + ov.cards.map(function (c, i) {
        return '<div class="sgFdCard' + (c.c ? ' ' + c.c : '') + '"><h4><span class="sgOvNum">' + (i + 1) + '</span>' + esc(c.n) + '</h4>' +
               '<p>' + esc(c.t) + '</p></div>';
      }).join('') + '</div>' +
      '<div class="sgWhCond">' + esc(ov.cond) + '</div>' +
      (ov.note ? '<div id="sgNoteOv" class="sgNoteBox"><b>' + esc(ov.note.k) + '</b><span>' + esc(ov.note.t) + '</span></div>' : '') +
      '<div class="sgLbl">Sampling sequence</div>' +
      '<div class="sgWhSeq' + (ov.kind === 'separator' ? ' sep' : '') + '">' + ov.steps.map(function (t, i) {
        var sc = ov.stepCls && ov.stepCls[i] ? ' ' + ov.stepCls[i] : '';
        return '<span class="sgWhStep' + sc + '"><b>' + (i + 1) + '</b>' + esc(t) + '</span>';
      }).join('') + '</div>' +
      '<div class="sgTxt">' + esc(ov.guide) + '</div>';
  }

  function ovHTML(ov) {
    if (ov.kind === 'field') return fieldHTML(ov);
    if (ov.kind === 'wellhead' || ov.kind === 'separator') return wellheadHTML(ov);
    return '<div class="sgOvIntro">' + esc(ov.intro) + '</div>' +
      '<div class="sgLbl">Main workflow</div>' +
      '<div class="sgOvFlow">' + ov.steps.map(function (st, i) {
        return '<div class="sgOvStep"><h4><span class="sgOvNum">' + (i + 1) + '</span>' + esc(st.n) + '</h4>' +
               '<p>' + esc(st.d) + '</p></div>';
      }).join('') + '</div>' +
      '<div class="sgOvFoot">' +
        '<div class="sgSec"><div class="sgLbl">Additional tools</div><div class="sgTxt">' + esc(ov.tools) + '</div></div>' +
        '<div class="sgSec"><div class="sgLbl">Getting started</div><div class="sgTxt">' + esc(ov.guide) + '</div></div>' +
      '</div>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
    });
  }

  window.__SG = { toggle: function (f) { toggle(f); }, isOpen: function () { return !!open; },
    /* read-only stage tables shared with the procedure panel (ProcCtl.js / Main.pcInfo) */
    info: { XFER: XFER, WH: WH, SEP: SEP, CHARGE: CHARGE, FLASH: FLASH, xferStage: xferStage, whStage: whStage, sepStage: sepStage, qcText: qcText } };

  function start() {
    build();
    tick();
    setInterval(tick, 220);   // live refresh, independent of the app's own loops
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
