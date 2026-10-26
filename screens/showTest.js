/* screen: showTest  (84.4 KB) */
/* Charging support stand: rod BEHIND the bottle so the moving Floating Piston pointer never crosses it
   (bottle centre 562.44, 330, scale 0.47) */
var C_STAND = (function () {
  // approved prototype bottle stand (prototypes/pvt-cell): floor base plate, rod beside the bottle, two clamp arms;
  // prototype units at bottle scale 0.5 -> here the bottle is drawn at 0.47 (factor 0.94)
  var x = 562.44, y = 330, k = 0.94, rodX = x - 52 * k, top = y - (222 + 45) * k + 45 * k;
  var g = 'url(#ccSteelD)', K = 'stroke="#2a3443" stroke-width=".7"';
  // base plate drawn after the pump line, which runs along the floor behind it (around the rod, never across it)
  var plate = '<rect x="' + (x - 70 * k).toFixed(1) + '" y="558" width="' + (140 * k).toFixed(1) + '" height="8" rx="2" fill="url(#ccSteelV)" stroke="#2a3443" stroke-width=".8"></rect>';
  var back = '<rect x="' + rodX.toFixed(1) + '" y="' + (y - 222 * k).toFixed(1) + '" width="' + (6 * k).toFixed(1) + '" height="' + (558 - (y - 222 * k)).toFixed(1) + '" fill="' + g + '" ' + K + '></rect>' +
    [y - 92 * k, y + 88 * k].map(function (cy) { return '<rect x="' + rodX.toFixed(1) + '" y="' + (cy - 4 * k).toFixed(1) + '" width="' + (34 * k).toFixed(1) + '" height="' + (8 * k).toFixed(1) + '" rx="2" fill="' + g + '" ' + K + '></rect>'; }).join('');
  void top;
  return { back: back, front: '', plate: plate };
})();
DC.slot('showTest', `<sc-if value="{{ showTest }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Module 03 — PVT Testing + GC">
          <sc-if value="{{ showChargeStep }}" hint-placeholder-val="{{ true }}">
          <!-- Charge to PVT Cell — shared Validation layout (theme.css: .pg-head | .lab-body = .vl-sim + sidebar with .vl-dock) -->
          <div class="pg pg-stack">
            <div class="pg-head">
              <div class="pg-titles">
                <span class="pg-eyebrow">Validation</span>
                <h2 class="pg-title">Charge to PVT Cell</h2>
                <span style="align-self:center; display:inline-flex; align-items:center; gap:8px; flex:0 0 auto; max-width:46%; padding:3px 11px 3px 9px; border-radius:999px; background:{{ cellStatusBg }}; border:1px solid {{ cellStatusBorder }}; white-space:nowrap; overflow:hidden;">
                  <span style="{{ cellStatusDot }}"></span>
                  <span style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.8px; color:{{ cellStatusColor }};">{{ chargeStageTag }}</span>
                  <span style="width:1px; height:12px; flex:0 0 auto; background:{{ cellStatusBorder }};"></span>
                  <span style="font-size:12px; font-weight:600; color:var(--txt); overflow:hidden; text-overflow:ellipsis;">{{ cellStatusText }}</span>
                </span>
                <span class="vl-chip">{{ valSrcContext }}</span>
                <p class="pg-desc">Vacuum the cell, charge 80 cc into Pump A, hold 5,000 psi and agitate A ↔ B until stable</p>
              </div>
              <div class="pg-end"><button type="button" class="bd-btn" data-bd-open="oil" data-bd-ctx="SPS/PDS sample bottle · charging the PVT cell">Bottle Details</button><button type="button" class="bd-btn bd-inline" data-cd-open="" data-cd-ctx="Charge · sample from the SPS/PDS bottle enters at Port L">Cell Details</button></div>
            </div>

            <div class="lab-body">
              <div class="lab-schem vl-sim">
                <div class="vl-fig">
                <svg sc-camel-view-box="{{ chargeViewBox }}" sc-camel-preserve-aspect-ratio="xMidYMid meet">
                  <defs>
                    ${BottleArt.defs('c')}
                    ${PVTCellArt.defs('cc')}
                    <linearGradient id="c-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"></stop><stop offset=".42" stop-color="#b3c1d8"></stop><stop offset=".58" stop-color="#7e90b0"></stop><stop offset="1" stop-color="#1f2a3e"></stop></linearGradient>
                    <linearGradient id="c-cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>
                    <linearGradient id="c-oil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ed99a"></stop><stop offset="1" stop-color="#3a9d63"></stop></linearGradient>
                    <linearGradient id="c-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa6d8"></stop><stop offset="1" stop-color="#2f6f9c"></stop></linearGradient>
                    <pattern id="c-hatch" width="8" height="8" sc-camel-pattern-transform="rotate(45)" sc-camel-pattern-units="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="8" stroke="#e7b15a" stroke-width="2"></line></pattern>
                    <mask id="c-fluid-mask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="1200" height="700">
                      <path d="M585 197.9 H730 V190 H748" sc-camel-path-length="293" fill="none" stroke="#fff" stroke-width="14" stroke-dasharray="600 1200" style="{{ chargeRevealStyle }}"></path>
                      <path d="M748 190 H1030 V215" sc-camel-path-length="307" fill="none" stroke="#fff" stroke-width="14" stroke-dasharray="307 1200" style="{{ chargeRevealStyle }}"></path>
                    </mask>
                    <pattern id="c-sample" width="9" height="9" sc-camel-pattern-units="userSpaceOnUse"><rect width="9" height="9" fill="#c7a233"></rect><circle cx="4.5" cy="4.5" r="1.15" fill="#f2d879" opacity=".7"></circle></pattern>
                  </defs>

                  <g style="{{ rigDimStyle }}">
                  <!-- bottle rig (stand, bottle, transfer pump, pump line, labels) enlarged as one unit about the bottle sample-valve
                       outlet (585, 197.9): the outlet - the start of the charge line - stays where it is, every rig coordinate below is unchanged,
                       and the bottle is drawn at the Restoration bottle size (Validation layout 2026-10-21) -->
                  <g transform="translate(585 197.9) scale(1.16) translate(-585 -197.9)">
                  <!-- support stand (BottleArt.stand, drawn first): rod behind the bottle, clamp on the barrel, lower cap on a fork ledge -->
                  ${C_STAND.back}

                  <!-- SPS/PDS bottle : technical cutaway, enlarged focal point -->
                  <!-- approved Oil Sample Bottle, centre (562.44, 330), scale 0.47, valves face right: the sample-valve side port at
                       (585, 197.9) feeds the charge line, the driving-side port at (585, 462.1) the pump line. Fills / piston in bore units from Main.js -->
                  ${BottleArt.oil('c', { x: 562.44, y: 330, s: 0.47, bd: 'oil', ctx: 'SPS/PDS sample bottle · charging the PVT cell',
                    inner: `<rect x="-22" y="-226" width="44" height="{{ chargeOilH }}" fill="url(#cOil)" style="transition:height .12s linear;"></rect>
                    <rect x="-22" y="{{ chargeWaterY }}" width="44" height="{{ chargeWaterH }}" fill="url(#cDrive)" style="transition:y .12s linear,height .12s linear;"></rect>
                    <g style="{{ chargePistonStyle }}">${PBDraw.mixRing('c', 0, -226 - 8.5)}${PBDraw.piston('c', -226)}</g>`,
                    ringT: '{{ chargeBtlRing }}', needleT: '{{ chargeBtlNeedle }}', ringB: '{{ chargePumpRing }}', needleB: '{{ chargePumpNeedle }}' })}

                  ${C_STAND.front}
                  <text x="596" y="150" font-family="IBM Plex Sans" font-size="14" font-weight="600" fill="var(--txt)">SPS/PDS</text>
                  <!-- left-side callout labels -->
                  <line x1="545" y1="258" x2="509" y2="258" stroke="var(--line2)" stroke-width="1"></line>
                  <text x="505" y="255" text-anchor="end" font-family="IBM Plex Sans" font-size="12" fill="var(--txt2)">Sample side</text>
                  <text x="505" y="267" text-anchor="end" font-family="IBM Plex Sans" font-size="10" fill="var(--mut)">approximate / unknown</text>
                  <g style="{{ chargePistonLabelStyle }}">
                    <line x1="587" y1="234.6" x2="640" y2="234.6" stroke="var(--line2)" stroke-width="1"></line>
                    <text x="644" y="237.6" text-anchor="start" font-family="IBM Plex Sans" font-size="12" fill="var(--txt2)">Floating Piston</text>
                  </g>
                  <line x1="545" y1="398" x2="509" y2="388" stroke="var(--line2)" stroke-width="1"></line>
                  <text x="505" y="385" text-anchor="end" font-family="IBM Plex Sans" font-size="12" fill="var(--txt2)">Water side</text>
                  <text x="505" y="397" text-anchor="end" font-family="IBM Plex Sans" font-size="10" fill="var(--mut)">pressurized by pump</text>

                  <!-- transfer pump : approved prototype design (bench unit on legs), right of the bottle; outlet fitting on its left face,
                       level with the bottle's driving-side valve port (585, 462.1) -->
                  <rect x="640" y="507" width="11" height="55" fill="url(#ccSteelD)" stroke="#2a3443" stroke-width=".7"></rect><rect x="634" y="560" width="23" height="6" rx="2" fill="#8794a5"></rect>
                  <rect x="709" y="507" width="11" height="55" fill="url(#ccSteelD)" stroke="#2a3443" stroke-width=".7"></rect><rect x="703" y="560" width="23" height="6" rx="2" fill="#8794a5"></rect>
                  <rect x="630" y="408.1" width="103" height="99" rx="6" fill="url(#ccPanelV)" stroke="#8592a3" stroke-width="1.3"></rect>
                  <rect x="630" y="408.1" width="103" height="9" rx="5" fill="url(#ccNavyV)"></rect>
                  <rect x="639" y="425.1" width="85" height="25" rx="3" fill="url(#ccScreen)" stroke="#3a4656" stroke-width="1"></rect>
                  <text x="681.5" y="442.1" text-anchor="middle" font-family="IBM Plex Mono" font-size="12" font-weight="600" fill="#5fd4ff">{{ tpText }}</text>
                  <circle cx="709" cy="476.1" r="13" fill="url(#ccSteelD)" stroke="#2a3443" stroke-width="1"></circle><circle cx="709" cy="476.1" r="9" fill="#f4f6f9" stroke="#5d6878" stroke-width=".8"></circle><line x1="709" y1="476.1" x2="714" y2="469.6" stroke="#c0392b" stroke-width="1.5"></line>
                  <rect x="641" y="461.1" width="38" height="9" rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"></rect><rect x="641" y="476.1" width="38" height="9" rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"></rect>
                  <rect x="622" y="454.1" width="10" height="16" rx="2" fill="url(#ccSteelD)" stroke="#2a3443" stroke-width=".9"></rect>
                  <rect x="611" y="527" width="141" height="15" rx="4" fill="var(--panel)" stroke="#5fb0ff" stroke-width="1.4" style="{{ tpHiStyle }}"></rect>
                  <text x="681.5" y="522" text-anchor="middle" font-family="IBM Plex Sans" font-size="14" fill="var(--red)" font-weight="600" paint-order="stroke" stroke="var(--bg)" stroke-width="3" stroke-linejoin="round">Transfer Pump</text>
                  <foreignObject x="611" y="527" width="141" height="15"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px; color:{{ chargePumpLabelColor }};"><span style="background:var(--bg); padding:0 4px; border-radius:3px;">{{ chargePumpLabel }}</span></div></foreignObject>
                  <text x="681.5" y="554" text-anchor="middle" font-family="IBM Plex Sans" font-size="10" fill="var(--mut)" paint-order="stroke" stroke="var(--bg)" stroke-width="3" stroke-linejoin="round">connected to water side</text>

                  <!-- pump -> bottle driving side (physical, solid bright tubing): one short straight run, pump fitting -> driving-side valve port -->
                  <path d="M622 462.1 H585" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></path>
                  <path d="M622 462.1 H585" fill="none" stroke="url(#c-metal)" stroke-width="4" stroke-linecap="round"></path>
                  <path d="M622 462.1 H585" fill="none" stroke="#46e0ff" stroke-width="2.4" stroke-linecap="round" style="{{ pumpLineFluidStyle }}"></path>
                  <path d="M622 462.1 H585" fill="none" stroke="#eaf9ff" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 10" style="{{ chargePumpFlowStyle }}"></path>
                  <path d="M610 456.1 l-12 6 l12 6 Z" fill="#46e0ff" style="{{ pumpLineFluidStyle }}"></path>
                  ${C_STAND.plate}

                  <!-- bottle valve = the bottle's own sample valve (ring + needle from chargeBtlRing / chargeBtlNeedle):
                       activity ring, label and OPEN / CLOSED tag at that valve -->
                  <circle cx="562.4" cy="198.8" r="17" fill="none" stroke="#ffcf3f" stroke-width="2" style="{{ ringBottle }}"><animate attributeName="r" values="15;19;15" dur="1.2s" repeatCount="indefinite"></animate></circle>
                  <text x="596" y="174" font-family="IBM Plex Sans" font-size="11" fill="{{ bottleValveLabelColor }}">Bottle valve</text>
                  <g style="{{ tagBottle.style }}"><rect x="662" y="164" width="54" height="14" rx="3" fill="{{ tagBottle.fill }}" stroke="{{ tagBottle.stroke }}" stroke-width="1"></rect><text x="689" y="174" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" font-weight="600" letter-spacing=".6" fill="{{ tagBottle.color }}">{{ tagBottle.text }}</text></g>
                  </g>
                  </g>

                  <!-- bottle sample-valve outlet -> short charge line -> Port L outward end (appears only once the bottle is connected);
                       the bottle stays on the bench for all 12 stages (disconnected and dimmed from stage 8) -->
                  <g style="{{ connPipeStyle2 }}">
                    <path d="M585 197.9 H730 V190 H748" sc-camel-path-length="293" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round" style="{{ connRevealStyle }}"></path>
                    <path d="M585 197.9 H730 V190 H748" sc-camel-path-length="293" fill="none" stroke="url(#c-metal)" stroke-width="4" stroke-linecap="round" style="{{ connRevealStyle }}"></path>
                    <path d="M585 197.9 H730 V190 H748" sc-camel-path-length="293" fill="none" stroke="#ffcf3f" stroke-width="2.4" style="{{ chargeHLineStyle }}"></path>
                    <path d="M585 197.9 H730 V190 H748" fill="none" stroke="#fff2c0" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 10" mask="url(#c-fluid-mask)" style="{{ seg1FlowStyle }}"></path>
                    <path d="M640 191.9 l12 6 l-12 6 Z" fill="#ffcf3f" style="{{ chargeArrowStyle }}"></path>
                    <text x="657" y="218" text-anchor="middle" font-family="IBM Plex Mono" font-size="11" letter-spacing=".5" fill="var(--cap2)">Charge Line</text>
                  </g>
                  <!-- stage 2: connection points being made up -->
                  <g style="{{ connPointStyle }}">
                    <circle cx="585" cy="197.9" r="11" fill="none" stroke="#5fb0ff" stroke-width="2" style="animation:pvtpulse 1s ease-in-out infinite;"></circle>
                    <circle cx="748" cy="190" r="11" fill="none" stroke="#5fb0ff" stroke-width="2" style="animation:pvtpulse 1s ease-in-out infinite;"></circle>
                    <text x="722" y="238" text-anchor="end" font-family="IBM Plex Mono" font-size="9.5" letter-spacing=".5" fill="#5fb0ff">CONNECTION POINT · PORT L</text>
                  </g>
                  <!-- stage 8: fittings separating -->
                  <g style="{{ discGapStyle }}">
                    <circle cx="585" cy="197.9" r="10" fill="none" stroke="#ffcf3f" stroke-width="2" style="animation:pvtpulse 1s ease-in-out infinite;"></circle>
                    <circle cx="748" cy="190" r="10" fill="none" stroke="#ffcf3f" stroke-width="2" style="animation:pvtpulse 1s ease-in-out infinite;"></circle>
                  </g>
                  <sc-if value="{{ bottleOff }}" hint-placeholder-val="{{ true }}">
                    <line x1="585" y1="197.9" x2="606" y2="197.9" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></line>
                    <line x1="585" y1="197.9" x2="606" y2="197.9" stroke="#5f7291" stroke-width="4" stroke-linecap="round"></line>
                    <path d="M748 190 H728" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></path>
                    <path d="M748 190 H728" fill="none" stroke="#5f7291" stroke-width="4" stroke-linecap="round"></path>
                    <rect x="604" y="206" width="119" height="26" rx="6" fill="rgba(28,14,18,.92)" stroke="#e0475c" stroke-width="1.1"></rect>
                    <text x="663.5" y="222" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" letter-spacing=".6" fill="var(--red)">{{ bottleOffText }}</text>
                  </sc-if>

                  <!-- ===== PVT CELL: approved shared design (components/PVTCellArt.js), legacy placement ===== -->
                  <rect x="738" y="104" width="420" height="418" rx="14" fill="none" stroke-width="2.4" style="{{ cellHaloStyle }}"></rect>
                  ${PVTCellArt.cell('cc', {
                    innerB: '<rect x="846" y="{{ chargePumpBFillY }}" width="40" height="{{ chargePumpBFillH }}" rx="3" fill="#ffcf3f" style="{{ chargePumpBFillStyle }}"></rect>',
                    innerA: '<rect x="1010" y="{{ chargePumpAFillY }}" width="40" height="{{ chargePumpAFillH }}" rx="3" fill="#ffcf3f" style="{{ chargePumpAFillStyle }}"></rect>',
                    pistonB: 'pumpBPistonY', pistonA: 'pumpAPistonY',
                    valves: { A: 'cellV.A', B: 'cellV.B', L: 'cellV.L' },
                    ports: { L: { plug: '!cellV.Lconn', nut: 'cellV.Lconn' } },
                    disp: { P: '{{ cbPsi }}', Pu: 'psi', B: '{{ pumpBVal }} cc', A: '{{ pumpAVal }} cc' } })}
                  <!-- page overlays on the approved cell: header flow, branch fluid, agitation, evacuated / dead volume -->
                  <line x1="748" y1="190" x2="765" y2="190" stroke="#ffcf3f" stroke-width="1.8" stroke-dasharray="2 10" mask="url(#c-fluid-mask)" style="{{ seg2FlowStyle }}"></line>
                  <line x1="765" y1="190" x2="806" y2="190" stroke="#ffcf3f" stroke-width="1.8" stroke-dasharray="2 10" mask="url(#c-fluid-mask)" style="{{ seg3FlowStyle }}"></line>
                  <line x1="806" y1="190" x2="866" y2="190" stroke="#ffcf3f" stroke-width="1.5" stroke-dasharray="2 11" mask="url(#c-fluid-mask)" style="{{ seg4FlowStyle }}"></line>
                  <line x1="866" y1="190" x2="1020" y2="190" stroke="#ffcf3f" stroke-width="1.5" stroke-dasharray="2 11" mask="url(#c-fluid-mask)" style="{{ seg4bFlowStyle }}"></line>
                  <line x1="866" y1="190" x2="866" y2="212" stroke="#ffcf3f" stroke-width="2" style="{{ pumpBBranchFluidStyle }}"></line>
                  <line x1="866" y1="190" x2="866" y2="212" stroke="#fff6d8" stroke-width="1.6" stroke-dasharray="2 7" style="{{ pumpBBranchFlowStyle }}"></line>
                  <line x1="1030" y1="190" x2="1030" y2="212" stroke="#ffcf3f" stroke-width="2" style="{{ pumpABranchFluidStyle }}"></line>
                  <line x1="1030" y1="190" x2="1030" y2="212" stroke="#fff6d8" stroke-width="1.6" stroke-dasharray="2 7" style="{{ pumpABranchFlowStyle }}"></line>
                  <!-- stage 1: evacuated volume (inner side of the closed Port L valve, header to the closed Port R valve, branches) -->
                  <path d="M767 190 H1129 M866 190 V212 M948 190 V200 M1030 190 V212" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".5" style="{{ vacPathStyle }}"></path>
                  <!-- stage 5: dead space being filled -->
                  <path d="M767 190 H1030 V212" fill="none" stroke="#ffcf3f" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".28" style="{{ deadGlowStyle }}"></path>
                  <g style="{{ agFlowStyle }}">
                    <line x1="866" y1="190" x2="1030" y2="190" stroke="#ffcf3f" stroke-width="2.2" stroke-dasharray="3 9" style="{{ agDashStyle }}"></line>
                    <line x1="1030" y1="190" x2="1030" y2="212" stroke="#ffcf3f" stroke-width="2.2" stroke-dasharray="3 9" style="{{ agDashStyle }}"></line>
                    <line x1="866" y1="190" x2="866" y2="212" stroke="#ffcf3f" stroke-width="2.2" stroke-dasharray="3 9" style="{{ agDashStyle }}"></line>
                    <path d="{{ agArrowD }}" fill="#ffcf3f"></path>
                    <circle cx="{{ agMarkX }}" cy="190" r="8" fill="none" stroke="#ffcf3f" stroke-width="1.6" opacity=".55" style="{{ agMarkTrans }}"></circle>
                    <circle cx="{{ agMarkX }}" cy="190" r="4" fill="#fff6d8" style="{{ agMarkTrans }}"></circle>
                  </g>
                  <!-- valve activity rings (moving valve amber, held valve red, sealed Pump A green) at the approved valve positions -->
                  <circle cx="765.3" cy="190" r="17" fill="none" stroke="#ffcf3f" stroke-width="2" style="{{ ringCell }}"><animate attributeName="r" values="15;19;15" dur="1.2s" repeatCount="indefinite"></animate></circle>
                  <circle cx="765.3" cy="190" r="15" fill="none" stroke="#e0475c" stroke-width="1.8" style="{{ cellHeldStyle }}"></circle>
                  <circle cx="866" cy="188.3" r="19" fill="none" stroke="#ffcf3f" stroke-width="2" style="{{ ringPumpB }}"><animate attributeName="r" values="17;21;17" dur="1.2s" repeatCount="indefinite"></animate></circle>
                  <circle cx="866" cy="188.3" r="18" fill="none" stroke="#e0475c" stroke-width="1.5" opacity=".65" style="{{ pumpBHeldStyle }}"></circle>
                  <circle cx="1030" cy="188.3" r="19" fill="none" stroke="#ffcf3f" stroke-width="2" style="{{ ringPumpA }}"><animate attributeName="r" values="17;21;17" dur="1.2s" repeatCount="indefinite"></animate></circle>
                  <circle cx="1030" cy="188.3" r="16" fill="none" stroke="#46d39a" stroke-width="2" style="{{ pumpASealRingStyle }}"></circle>
                  <circle cx="1030" cy="188.3" r="18" fill="none" stroke="#e0475c" stroke-width="1.5" opacity=".65" style="{{ pumpAHeldStyle }}"></circle>
                  <rect x="994" y="170" width="72" height="188" rx="9" fill="none" stroke="#ffcf3f" stroke-width="1.6" stroke-dasharray="6 4" style="{{ pumpAHaloStyle }}"></rect>
                  <!-- pump readings below the cell -->
                  <foreignObject x="791" y="520" width="150" height="16"><div style="margin:0; display:flex; align-items:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif;justify-content:center;gap:3px; font-size:11px; color:var(--txt2);">Pump B · <span style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:600; color:{{ pumpBColor }};">{{ pumpBVal }}<span style="font-size:8.5px; font-weight:400; color:var(--mut); margin-left:2px;">cc</span></span></div></foreignObject>
                  <foreignObject x="955" y="520" width="150" height="16"><div style="margin:0; display:flex; align-items:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif;justify-content:center;gap:3px; font-size:11px; color:var(--txt2);">Pump A · <span style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:600; color:{{ pumpAColor }};">{{ pumpAVal }}<span style="font-size:8.5px; font-weight:400; color:var(--mut); margin-left:2px;">cc</span></span></div></foreignObject>
                  <!-- computer + controller (approved desk) to the right of the cell, behind the Port R valve; signal cable from the cell -->
                  ${PVTCellArt.cable({}, { x: 1116, y: 300, s: .4 }, 30)}
                  ${PVTCellArt.desk('cc', { x: 1116, y: 300, s: .4, legs: 300, ctl: '{{ cbPsi }}',
                    rows: [['CELL psi', '{{ cbPsi }}', '#5fd4ff'], ['PUMP A cc', '{{ cbMl }}', '#ffc56b'], ['PUMP B cc', '{{ pumpBVal }}', '#ffc56b'],
                           ['V₁ mL', '{{ initReadText }}', '#7ff0bf', '{{ pcV1Style }}'], ['V₂ mL', '{{ calcV2 }}', '#ffe08a', '{{ pcV2Style }}']],
                    hi: '{{ pcFlashStyle }}' })}
                  <!-- ===== sequential fluid front: bottle -> charge line -> cell valve -> initial volume -> pump ===== -->
                  <path d="M585 197.9 H730 V190 H748" sc-camel-path-length="293" fill="none" stroke="#fff6d8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="600 1200" style="{{ chargeRevealStyle }}"></path>
                  <path d="M748 190 H1030 V215" sc-camel-path-length="307" fill="none" stroke="#fff6d8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="307 1200" style="{{ chargeRevealStyle }}"></path>
                  <path d="M765 190 H1030 V215" fill="none" stroke="#fff6d8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" style="{{ retainedStyle }}"></path>
                  <circle cx="{{ chargeHeadX }}" cy="{{ chargeHeadY }}" r="10.5" fill="none" stroke="#ffcf3f" stroke-width="2" style="{{ chargeHeadStyle }}"></circle>
                  <circle cx="{{ chargeHeadX }}" cy="{{ chargeHeadY }}" r="5.5" fill="#fff6d8" style="{{ chargeHeadStyle }}"></circle>
                  <sc-if value="{{ noteAgit }}" hint-placeholder-val="{{ false }}">
                  <rect x="866" y="143" width="164" height="19" rx="5" fill="rgba(15,24,40,.95)" stroke="#4d9dff" stroke-width="1"></rect>
                  <foreignObject x="866" y="145.5" width="164" height="14"><div style="margin:0; display:flex; align-items:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;justify-content:center;font-size:9px; letter-spacing:.3px; color:var(--btnt);">AGITATING&nbsp;{{ agDirText }}&nbsp;· 10 cc/min</div></foreignObject>
                  </sc-if>
                  <text x="948" y="100" text-anchor="middle" font-family="IBM Plex Sans" font-size="18" font-weight="600" fill="var(--txt)">PVT Cell</text>
                  ${PVTCellArt.pill(996, 86, 'Charge · sample from the SPS/PDS bottle enters at Port L')}
                  <foreignObject x="828" y="72" width="240" height="14"><div style="margin:0; display:flex; align-items:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;justify-content:center;font-size:10px; letter-spacing:.8px; overflow:hidden; color:{{ cellStatusColor }};">{{ cellStateShort }}</div></foreignObject>
                </svg>
                </div>
              </div>

              <div class="lab-side">
                <div class="vl-scroll">
                  <!-- live process monitor: one card for the active step (gauge / volume balance / isolation sequence) -->
                  <sc-if value="{{ monCard }}" hint-placeholder-val="{{ true }}">
                  <sc-if value="{{ monGauge }}" hint-placeholder-val="{{ true }}">
                  <div class="vl-mon" style="border-color:{{ monStroke }};">
                    <div class="vl-mon-k" style="color:{{ monColor }};">{{ monLabel }}</div>
                    <div class="vl-mon-v"><b style="color:{{ monColor }};">{{ monBig }}</b><span>{{ monUnit }}</span></div>
                    <div class="vl-mon-bar"><i style="width:{{ monBarW / 2.52 }}%; background:{{ monColor }};"></i></div>
                    <div class="vl-mon-row"><span>{{ monStartText }}</span><span style="color:var(--accg);">{{ monTargetText }}</span></div>
                    <div class="vl-mon-row" style="color:#9fb3cf;"><span>{{ monSub }}</span></div>
                  </div>
                  </sc-if>
                  <sc-if value="{{ monCalc }}" hint-placeholder-val="{{ false }}">
                  <div class="vl-mon vl-mon-t" style="border-color:{{ calcStroke }};">
                    <div style="font-size:10px; letter-spacing:1.3px; color:{{ calcColor }}; margin-bottom:2px;">{{ calcTitle }}</div>
                    <div style="{{ calcRow1 }}">
                      <div style="display:flex; justify-content:space-between; padding:1px 3px;"><span style="color:#9fb3cf;">V&#8321; initial (recorded)</span><span style="font-weight:600;">{{ calcV1 }}</span></div>
                      <div style="display:flex; justify-content:space-between; padding:1px 3px; {{ calcV2Hi }}"><span style="color:#9fb3cf;">V&#8322; final transfer pump</span><span style="font-weight:600; color:#ffe08a;">{{ calcV2 }}</span></div>
                    </div>
                    <div style="{{ calcRow2 }} display:flex; justify-content:space-between; padding:4px 3px 0; border-top:1px solid rgba(150,175,210,.2);"><span>{{ calcDiffEq }}</span><span style="font-weight:700; color:#ffe08a;">{{ calcDiff }}</span></div>
                    <div style="{{ calcRow3 }}">
                      <div style="display:flex; justify-content:space-between; padding:1px 3px;"><span style="color:#9fb3cf;">&#8594; charged into Pump A</span><span style="font-weight:600;">{{ pumpAText }}</span></div>
                      <div style="display:flex; justify-content:space-between; padding:1px 3px;"><span style="color:#9fb3cf;">dead space (filled at equalization)</span><span style="font-weight:600;">{{ deadText }}</span></div>
                    </div>
                    <div style="{{ calcRow4 }} display:flex; justify-content:space-between; padding:4px 3px 0; border-top:1px solid rgba(150,175,210,.2); color:#7ff0bf;"><span>{{ calcTotalEq }}</span><span style="font-weight:700;">&#10003;</span></div>
                  </div>
                  </sc-if>
                  <sc-if value="{{ monIso }}" hint-placeholder-val="{{ false }}">
                  <div class="vl-mon vl-mon-t" style="border-color:{{ isoStroke }};">
                    <div style="font-size:9.5px; letter-spacing:.5px; color:{{ isoColor }}; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ isoTitle }}</div>
                    <sc-for list="{{ isoRows }}" as="r" hint-placeholder-count="6">
                    <div style="display:flex; align-items:center; gap:7px; height:17px; color:{{ r.color }}; font-weight:{{ r.weight }};"><span style="width:10px; text-align:center;">{{ r.mark }}</span><span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#c9d6ea;">{{ r.label }}</span><span>{{ r.state }}</span></div>
                    </sc-for>
                  </div>
                  </sc-if>
                  </sc-if>
                <sc-if value="{{ chargeShowAgit }}" hint-placeholder-val="{{ false }}">
                <div class="vl-sec">
                  <div class="vl-k">Process status</div>
                  <div class="vl-cards">
                    <sc-for list="{{ agCards1 }}" as="c" hint-placeholder-count="4">
                    <div class="vl-c">
                      <div class="vl-cl">{{ c.label }}</div>
                      <div class="vl-cv" style="color:{{ c.color }};">{{ c.value }}</div>
                      <div class="vl-cs">{{ c.sub }}</div>
                    </div>
                    </sc-for>
                  </div>
                  <div class="vl-k">Transfer values</div>
                  <div class="vl-cards">
                    <sc-for list="{{ agCards2 }}" as="c" hint-placeholder-count="3">
                    <div class="vl-c">
                      <div class="vl-cl">{{ c.label }}</div>
                      <div class="vl-cv" style="color:{{ c.color }};">{{ c.value }}</div>
                      <div class="vl-cs">{{ c.sub }}</div>
                    </div>
                    </sc-for>
                  </div>
                  <div class="vl-k">Pressure control</div>
                  <div class="vl-cards">
                    <sc-for list="{{ agCards3 }}" as="c" hint-placeholder-count="4">
                    <div class="vl-c">
                      <div class="vl-cl">{{ c.label }}</div>
                      <div class="vl-cv" style="color:{{ c.color }};">{{ c.value }}</div>
                      <div class="vl-cs">{{ c.sub }}</div>
                    </div>
                    </sc-for>
                  </div>
                  <div class="vl-k">BV Software · Barogram</div>
                  <svg sc-camel-view-box="0 0 300 62" sc-camel-preserve-aspect-ratio="none" style="display:block; width:100%; height:56px; background:#06101e; border:1px solid var(--line); border-radius:8px; flex:0 0 auto;">
                    <rect x="0" y="28" width="300" height="6" fill="rgba(70,211,154,.14)"></rect>
                    <line x1="0" y1="31" x2="300" y2="31" stroke="#46d39a" stroke-width="1" stroke-dasharray="3 5" opacity=".7"></line>
                    <polyline points="{{ baroPoints }}" fill="none" stroke="#5fb0ff" stroke-width="1.6" stroke-linejoin="round"></polyline>
                    <text x="5" y="11" font-family="IBM Plex Mono" font-size="7.5" fill="var(--cap)">5,040</text>
                    <text x="5" y="58" font-family="IBM Plex Mono" font-size="7.5" fill="var(--cap)">4,960</text>
                  </svg>
                </div>
                </sc-if>
                </div>
                <!-- shared Validation procedure dock (theme.css .vl-dock) -->
                <div class="vl-dock">
                  <div class="pc-host" data-pc="Main:charge" data-pc-layout="side"></div>
                  <div class="vl-fwd"><button onclick="{{ chargeFlash }}" style="cursor:{{ flashBtnCursor }}; background:{{ flashBtnBg }}; border:1px solid {{ flashBtnBorder }}; color:{{ flashBtnColor }};">Move to Flash Process →</button></div>
                </div>
              </div>
            </div>
          </div>
          </sc-if>

          <sc-if value="{{ showFlashStep }}" hint-placeholder-val="{{ false }}">
          <!-- Flash Process — runs on this page, after charging; shared Validation layout -->
          <div class="pg pg-stack">
            <div class="pg-head">
              <div class="pg-titles">
                <span class="pg-eyebrow">Validation</span>
                <h2 class="pg-title">Flash Process</h2>
                <span style="align-self:center; display:inline-flex; align-items:center; gap:6px; flex:0 0 auto; padding:3px 11px; border-radius:999px; background:{{ fPillBg }}; border:1px solid {{ fPillBorder }}; font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.7px; text-transform:uppercase; color:{{ fPillColor }}; white-space:nowrap;"><span style="{{ fPillDot }}"></span>{{ fStatusText }}</span>
                <span class="vl-chip">{{ valSrcContext }}</span>
                <p class="pg-desc">Vacuum, charge helium, flash 50 cc from Pump A into the flask — gas back up to the gasometer and balloon, oil to density &amp; API</p>
              </div>
              <div class="pg-end fx-btns"><button type="button" class="bd-btn" data-cd-open="" data-cd-ctx="Flash · sample leaves Pump A through Port R to the flash unit">Cell Details</button><button type="button" class="bd-btn" data-fd-open="fu" data-fd-src="Main:flash" data-fd-ctx="Validation Flash · flask, balloon and manifold">Flash Unit Details</button><button type="button" class="bd-btn" data-fd-open="ga" data-fd-src="Main:flash" data-fd-ctx="Validation Flash · helium and flash-gas measurement">Gasometer Details</button><button type="button" class="bd-btn" data-fd-open="dm" data-fd-src="Main:flash" data-fd-ctx="Validation Flash · Stage 7 Density &amp; API">Density Meter Details</button></div>
            </div>

            <div class="lab-body">
              <div class="lab-schem vl-sim">
                <div class="vl-fig">
                  <!-- shared flash equipment (equipment/flash): PVT Cell + computer/controller, Flash Unit (flask + balloon), Gasometer;
                       Stage 7 shows the Flash Unit with the Density Meter. Drawn and animated from the page state by FlashHost. -->
                  <div class="fx-host" data-fx="Main:flash"></div>
                </div>
                <!-- horizontal step tracker -->
                <div style="display:flex; align-items:center; gap:0; margin-top:6px; flex:0 0 auto; padding:4px 10px; background:var(--icard); border:1px solid var(--line); border-radius:10px; flex-wrap:wrap;">
                  <sc-for list="{{ fSteps }}" as="st" hint-placeholder-count="7">
                    <div style="display:flex; align-items:center; gap:6px; flex:1 1 105px; min-width:0;">
                      <span style="{{ st.chip }}">{{ st.num }}</span>
                      <span style="font-size:11px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:{{ st.color }};">{{ st.label }}</span>
                      <span style="{{ st.connector }}"></span>
                    </div>
                  </sc-for>
                </div>
              </div>

              <div class="lab-side">
                <div class="vl-scroll">
                  <div class="vl-sec">
                    <div class="vl-k">Live readings</div>
                    <div class="vl-cards">
                    <sc-for list="{{ fReadouts }}" as="r" hint-placeholder-count="6">
                      <div class="vl-c">
                        <div class="vl-cl">{{ r.label }}</div>
                        <div class="vl-cv" style="color:{{ r.color }};">{{ r.value }}</div>
                        <div class="vl-cs">{{ r.sub }}</div>
                      </div>
                    </sc-for>
                    </div>
                  </div>
                  <div class="vl-sec">
                    <div class="vl-k">Route check · live valve states</div>
                    <div class="fx-route">
                    <sc-for list="{{ fRoutes }}" as="rt" hint-placeholder-count="9">
                      <div class="{{ rt.cls }}"><span>{{ rt.name }}</span><b>{{ rt.state }}</b></div>
                    </sc-for>
                    </div>
                  </div>
                </div>
                <!-- shared Validation procedure dock (theme.css .vl-dock) -->
                <div class="vl-dock">
                  <div class="pc-host" data-pc="Main:flash" data-pc-layout="side"></div>
                  <div class="vl-fwd"><button class="ui-btn ui-btn-ghost" onclick="{{ chargeRestart }}">← Back to Charging</button><button onclick="{{ goPvTest }}" style="cursor:pointer; background:{{ pvBtnBgAct }}; border:1px solid {{ pvBtnBorderAct }}; color:{{ pvBtnColorAct }};" style-hover="background:rgba(70,211,154,.18);">Start PV Test</button></div>
                </div>
              </div>
            </div>
          </div>
          </sc-if>
    </div>
    </sc-if>`);
