/* ==========================================================================
   PVT Nexus — sample bottle data (shared by the 2D drawings, the 3D viewer
   and the Bottle Details overlay, components/BottleDetails.js).

   General descriptions only: no job-specific pressures, temperatures,
   capacities or procedures. The designs are representative equipment, not
   replicas of a manufacturer's product.

   parts   explanation shown when a part is selected (2D label, 3D model,
           3D label or parts list). internal = visible only in the cutaway.
   map2d   2D drawing label id (bottle-draw.js ANCHORS) -> part id.
   ========================================================================== */
(function () {
  'use strict';
  window.EQUIPMENT = {
    order: ['oil', 'gas'],
    oil: {
      name: 'Oil Sample Bottle',
      type: 'Floating-piston sample cylinder',
      summary: 'Piston-type cylinder for liquid samples, with a sealed floating piston, a loose mixing ring and guarded valves at both ends.',
      about: [
        'A sealed floating piston divides the bore into a sample chamber and a driving-fluid chamber. The piston moves only when fluid enters or leaves either side, so the sample is displaced by the driving fluid rather than by gas.',
        'A loose mixing ring travels through the sample when the bottle is moved, to help mix it.',
        'Each end carries a right-angle needle valve inside a protective cage. The sample-side end cap also has an evacuation fitting.'
      ],
      basis: 'Representative design after the Leutert PDC piston-type sample cylinder description; not a manufacturer replica.',
      parts: {
        body:     { n: 'Pressure-vessel body', d: 'Seamless stainless-steel barrel. The cutaway shows its wall thickness around the bore.' },
        cap:      { n: 'End caps', d: 'Screwed caps closing each end of the barrel. A spigot enters the bore and carries the cap seal.' },
        capSeal:  { n: 'Cap seals', d: 'O-ring with a back-up ring on each cap spigot, sealing the cap against the bore.', internal: 1 },
        cage:     { n: 'Valve protectors', d: 'Protective cages around both valves, guarding them during handling and transport.' },
        valve:    { n: 'Needle valves', d: 'Right-angle needle valves: the inlet comes from the cylinder axis, the outlet leaves to the side. Shown closed, with the needle on its seat.' },
        handle:   { n: 'Valve handles', d: 'T-handles on the valve stems, used to open and close each needle valve.' },
        port:     { n: 'Connections', d: 'Side outlet of each valve: the sample connection at the sample end, and the driving-fluid connection at the other end.' },
        evac:     { n: 'Evacuation fitting', d: 'Plugged side port on the sample-side cap, drilled through into the sample chamber so that the chamber can be evacuated.' },
        piston:   { n: 'Floating piston', d: 'Free piston separating the sample from the driving fluid.', internal: 1 },
        seals:    { n: 'Piston seals', d: 'Two O-rings, each between back-up rings, in grooves near the piston ends.', internal: 1 },
        guide:    { n: 'Guide ring', d: 'Wear band around the middle of the piston that keeps the piston centred in the bore.', internal: 1 },
        ring:     { n: 'Mixing ring', d: 'Loose metal ring in the sample chamber, separate from the piston. Moving the bottle makes it travel through the sample and mix it.', internal: 1 },
        oil:      { n: 'Sample chamber', d: 'Space between the sample-side cap and the piston, holding the oil sample.', internal: 1 },
        drive:    { n: 'Driving-fluid chamber', d: 'Space between the piston and the driving-side cap, holding the driving (hydraulic) fluid.', internal: 1 },
        passage:  { n: 'Drilled passages', d: 'Ports through the caps and valve bodies connecting the valves and the evacuation fitting to the chambers.', internal: 1 }
      },
      map2d: { handleT: 'handle', cageT: 'cage', cageB: 'cage', valveT: 'valve', valveB: 'valve', portT: 'port', portB: 'port',
        evac: 'evac', capT: 'cap', capB: 'cap', capSeal: 'capSeal', body: 'body', oil: 'oil', ring: 'ring', piston: 'piston',
        seal: 'seals', guide: 'guide', drive: 'drive' }
    },
    gas: {
      name: 'Gas Sample Bottle',
      type: 'Double-ended sample cylinder',
      summary: 'Seamless double-ended cylinder for gas samples, with an isolation valve and connection at each end.',
      about: [
        'A seamless stainless-steel shell with tapered shoulders forms one continuous internal chamber. There is no piston and no liquid level: the gas fills the whole volume.',
        'Each neck carries a hex nipple, an isolation valve and a connection, so the cylinder can be connected at either end.'
      ],
      basis: 'Representative design after the Swagelok double-ended sample cylinder; the attached valves are a representative assembly.',
      parts: {
        body:     { n: 'Cylinder body', d: 'Seamless stainless-steel cylinder with tapered shoulders and a threaded neck at each end.' },
        nipple:   { n: 'Hex nipples', d: 'Threaded nipples joining each neck to its valve (simplified thread detail).' },
        valve:    { n: 'Isolation valves', d: 'Representative inline needle valves, one at each end of the cylinder. Shown closed.' },
        handle:   { n: 'Valve handles', d: 'Handles on the side of each valve.' },
        port:     { n: 'Connections', d: 'Male connector and tube stub at each end, used to connect the cylinder to a sampling line.' },
        chamber:  { n: 'Gas chamber', d: 'One continuous internal volume, filled throughout with gas. There is no piston and no liquid level.', internal: 1 },
        passage:  { n: 'Bore', d: 'Through bore of the nipples, valves and connectors.', internal: 1 }
      },
      map2d: { portT: 'port', portB: 'port', valveT: 'valve', valveB: 'valve', nipT: 'nipple', neck: 'body', shoulder: 'body',
        body: 'body', mark: 'body', chamber: 'chamber', wall: 'body' }
    }
  };

  /* --------------------------------------------------------------------------
     Bottle Details (components/BottleDetails.js): operating principle of the two
     approved designs. General text only.
     -------------------------------------------------------------------------- */
  var EQ = window.EQUIPMENT, O = EQ.oil;
  O.variant = 'Floating piston · driving fluid';
  O.principle = [
    'The floating piston divides the bore into two sealed chambers: the sample above it and the driving (hydraulic) fluid below it. Nothing passes the piston seals.',
    'When fluid is pumped into the driving side, the piston moves and pushes on the sample; when the sample enters, the driving fluid is displaced out through its own valve. Pressure is carried across the piston, so the sample is held or moved by liquid, never by gas contact.',
    'Moving or inverting the bottle makes the loose mixing ring travel through the sample, which helps homogenise it before transfer.'
  ];
  EQ.gas.variant = 'Double-ended · no piston';
  EQ.gas.principle = [
    'The cylinder is one continuous chamber with no piston, so the gas sample fills the whole volume. There is no liquid level and no driving fluid.',
    'The sample is taken by connecting one end to the sampling point and opening the valves: gas flows in until the bottle reaches line pressure. The valves are then closed to isolate it.',
    'Two ends allow the bottle to be purged through and later connected at either end for transfer or analysis.'
  ];

  /* --------------------------------------------------------------------------
     MRMS — MDT Multisample Module carrying six SPMC chambers, and the SPMC chamber
     itself (equipment/mrms-*.js). Shown only in the SPMC Details viewer
     (components/SpmcDetails.js), opened from the source SPMC in Validation >
     Sample Transfer. Not part of `order` (the bottle switcher).
     Sources and geometric assumptions: equipment/MRMS-SPMC-SOURCES.md.
     SPMC version shown: SPMC-T (current SLB product sheet). No operating values here.
     -------------------------------------------------------------------------- */
  EQ.mrms = {
    name: 'MRMS — MDT Multisample Module',
    short: 'MRMS',
    type: 'Formation-tester sample module',
    summary: 'Module of the MDT formation tester that carries six individual sample chambers. This entry shows it fitted with SPMC single-phase multisample chambers.',
    chips: ['Six sample chambers', 'Common flowline', 'SPMC chamber'],
    about: [
      'The MDT tester is a string of modules. Its probe or packer module opens the formation, the pumpout module draws fluid along the tool flowline, and fluid-analysis modules monitor the fluid until filtrate contamination is low. Only then is a sample taken.',
      'The MRMS is the sample-storage part of that string. Its six chambers sit on the common tool flowline. Each chamber is filled on its own, at its own depth, under control from surface. The samples stay separate: there is no shared storage volume.',
      'An MRMS can carry MPSR bottles, SPMC chambers or a mix of both. This entry shows six SPMC chambers. Several MRMS modules can be combined in one toolstring.'
    ],
    basis: 'Educational representation. Chamber placement and flowline routing in the module are simplified: they are not published in the accessible references.',
    parts: {
      headU:    { n: 'Upper module connector', d: 'Joins the MRMS to the module above it in the MDT string. The tool flowline and the control lines pass through it (simplified).' },
      housing:  { n: 'Module housing', d: 'Steel carrier that holds and protects the six sample chambers while the toolstring is run in the well.' },
      bays:     { n: 'Chamber bays', d: 'Positions for the six chambers, numbered 1 to 6. The cover detail is a representation; it is not taken from a published drawing.' },
      headL:    { n: 'Lower module connector', d: 'Joins the MRMS to the module below it and carries the flowline on through the toolstring (simplified).' },
      flowline: { n: 'Common flowline', d: 'Tool flowline running through the module. Formation fluid pumped by the MDT reaches every chamber position along this line. Routing simplified.', internal: 1 },
      valves:   { n: 'Chamber valves', d: 'One valve per chamber, operated from surface, so each chamber is opened and closed on its own. Shown as function blocks: the valve design is not published.', internal: 1 },
      ch1:      { n: 'Chamber 1 (SPMC)', d: 'Individual SPMC sample chamber. Its sample is kept separate from the other five.', internal: 1, chamber: 1 },
      ch2:      { n: 'Chamber 2 (SPMC)', d: 'Individual SPMC sample chamber. Its sample is kept separate from the other five.', internal: 1, chamber: 2 },
      ch3:      { n: 'Chamber 3 (SPMC)', d: 'Individual SPMC sample chamber. Its sample is kept separate from the other five.', internal: 1, chamber: 3 },
      ch4:      { n: 'Chamber 4 (SPMC)', d: 'Individual SPMC sample chamber. Its sample is kept separate from the other five.', internal: 1, chamber: 4 },
      ch5:      { n: 'Chamber 5 (SPMC)', d: 'Individual SPMC sample chamber. Its sample is kept separate from the other five.', internal: 1, chamber: 5 },
      ch6:      { n: 'Chamber 6 (SPMC)', d: 'Individual SPMC sample chamber. Its sample is kept separate from the other five.', internal: 1, chamber: 6 }
    }
  };
  EQ.spmc = {
    name: 'SPMC — Single-Phase Multisample Chamber',
    short: 'SPMC',
    type: 'Pressure-compensated sample chamber (SPMC-T)',
    about: [
      'The SPMC is one sample chamber. It is filled by controlled displacement: the incoming formation fluid pushes the sample piston back at a controlled rate, so the sample is not flashed. The chamber starts with no dead volume.',
      'A preset nitrogen charge, kept separate from the sample, acts on a piston that floats on a pressure-compensating fluid (a synthetic oil buffer). The buffer passes that pressure to the sample piston. The nitrogen never touches the sample.',
      'The chamber self-closes downhole. The nitrogen charge is activated at capture, so as the sample cools and shrinks on the way to surface, the expanding nitrogen keeps the sample at or above reservoir pressure, in single phase.',
      'The SPMC-T version shown has an integrated sample agitation piston, used to mix the sample when it is restored to reservoir conditions after retrieval.'
    ],
    basis: 'SPMC-T, after the SLB SPMC-T product sheet and SLB single-phase sampling page. Proportions shortened and internal arrangement simplified (educational).',
    parts: {
      inlet:    { n: 'Sample inlet connection', d: 'End connection to the MRMS chamber valve and the tool flowline. Formation fluid enters here.' },
      headU:    { n: 'Upper head', d: 'End closure on the sample side. It houses the sample isolation function and the inlet passage.' },
      body:     { n: 'Pressure body', d: 'Metallic pressure vessel. SLB lists Inconel or Hastelloy for the SPMC-T, and a Dursan nonreactive coating.' },
      headL:    { n: 'Lower head', d: 'End closure on the nitrogen side. It holds the nitrogen charging connection and the charge-activation function.' },
      n2Port:   { n: 'Nitrogen charging port', d: 'Connection through which the nitrogen charge is preset before the job (plugged). In the Sample Transfer scene this end connection is used for the laboratory drive fluid, with the nitrogen charge taken as released (an assumption: the laboratory connection is not published).' },
      isoValve: { n: 'Sample isolation (self-closing)', d: 'Closes the sample chamber downhole after capture, so no sample is lost on the way out of the well. Shown as a function block: the internal valve design is not published.', internal: 1 },
      resFluid: { n: 'Reservoir-fluid chamber', d: 'Holds the formation fluid sample. Its volume is zero before sampling (no dead volume) and grows as the sample piston is pushed back.', internal: 1 },
      agit:     { n: 'Agitation piston (integrated)', d: 'Documented for the SPMC-T: used after retrieval, while the sample is restored to reservoir conditions, to mix it. It is not part of pressure compensation. Its exact form and drive are not published; shown schematically at the sample piston.', internal: 1 },
      sPiston:  { n: 'Sample piston', d: 'Separating piston between the reservoir fluid and the pressure-compensating fluid. It moves back as the sample enters and forward as the sample contracts.', internal: 1 },
      comp:     { n: 'Pressure-compensating fluid', d: 'Synthetic oil buffer between the two pistons. It carries the nitrogen pressure to the sample piston, so the nitrogen never touches the sample.', internal: 1 },
      nPiston:  { n: 'Nitrogen piston', d: 'Floating piston between the nitrogen charge and the pressure-compensating fluid.', internal: 1 },
      n2:       { n: 'Nitrogen chamber', d: 'Holds the preset nitrogen charge. After activation it expands as the sample cools, keeping the sample above reservoir pressure. It stays sealed from the sample.', internal: 1 },
      activation: { n: 'Nitrogen charge activation', d: 'Keeps the nitrogen charge from acting until the sample is captured, then lets it act (SLB: the independent gas charge activates with sample capture). Function only: the mechanism is not published.', internal: 1 },
      outlet:   { n: 'Controlled-displacement outlet', d: 'Schematic only. While the chamber fills, fluid behind the sample piston leaves at a controlled rate (controlled displacement). The route and the throttling part are not published. It stays closed during the laboratory transfer.', internal: 1 },
      seals:    { n: 'Piston seals', d: 'Seal rings on both pistons keep the three fluids apart.', internal: 1 }
    },
    legend: [
      ['res', 'Reservoir fluid (sample)'],
      ['comp', 'Pressure-compensating fluid'],
      ['n2', 'Nitrogen charge'],
      ['metal', 'Metal (section)']
    ]
  };
})();
