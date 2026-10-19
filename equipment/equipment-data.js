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
})();
