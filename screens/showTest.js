/* screen: showTest  (84.4 KB) */
/* Charging support stand: rod BEHIND the bottle so the moving Floating Piston pointer never crosses it
   (bottle centre 562.44, 330, scale 0.47) */
var C_STAND = (function () {
  // approved prototype bottle stand (prototypes/pvt-cell): floor base plate, rod beside the bottle, two clamp arms;
  // prototype units at bottle scale 0.5 -> here the bottle is drawn at 0.47 (factor 0.94)
  var x = 562.44, y = 330, k = 0.94, rodX = x - 52 * k, top = y - (222 + 45) * k + 45 * k;
  var g = 'url(#ccSteelD)', K = 'stroke="#2a3443" stroke-width=".7"';
  var back = '<rect x="' + (x - 70 * k).toFixed(1) + '" y="558" width="' + (140 * k).toFixed(1) + '" height="8" rx="2" fill="url(#ccSteelV)" stroke="#2a3443" stroke-width=".8"></rect>' +
    '<rect x="' + rodX.toFixed(1) + '" y="' + (y - 222 * k).toFixed(1) + '" width="' + (6 * k).toFixed(1) + '" height="' + (558 - (y - 222 * k)).toFixed(1) + '" fill="' + g + '" ' + K + '></rect>' +
    [y - 92 * k, y + 88 * k].map(function (cy) { return '<rect x="' + rodX.toFixed(1) + '" y="' + (cy - 4 * k).toFixed(1) + '" width="' + (34 * k).toFixed(1) + '" height="' + (8 * k).toFixed(1) + '" rx="2" fill="' + g + '" ' + K + '></rect>'; }).join('');
  void top;
  return { back: back, front: '' };
})();
DC.slot('showTest', `<sc-if value="{{ showTest }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Module 03 — PVT Testing + GC" style="display:flex; flex-direction:column; height:var(--page-h); overflow:hidden;">
      

      <!-- body -->
      <div style="flex:1; min-height:0; box-sizing:border-box; display:grid; grid-template-columns:minmax(0,1fr); grid-template-rows:minmax(0,1fr); gap:14px; padding:var(--page-pad-y) var(--page-pad-x) 12px; align-items:stretch; width:100%; margin:0 auto; overflow:hidden;">
        <!-- LEFT -->
        <div style="display:flex; flex-direction:column; gap:16px; min-width:0; min-height:0;">
          <sc-if value="{{ showChargeStep }}" hint-placeholder-val="{{ true }}">
          <!-- Charge to PVT Cell schematic -->
          <div style="flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden; background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:10px 16px; box-shadow:0 1px 3px rgba(20,35,60,.06);">
            <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
              <div style="flex:1 1 260px; min-width:0; display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
                <h2 class="pg-title">Charge to PVT Cell</h2>
                <div class="pg-desc">Vacuum the cell, charge 80 cc into Pump A, hold 5,000 psi and agitate A ↔ B until stable</div>
                <span style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.6px; padding:3px 8px; border-radius:6px; background:var(--chipbg); border:1px solid var(--line2); color:var(--chipt); white-space:nowrap;">{{ valSrcContext }}</span>
                <button type="button" class="bd-btn bd-inline" data-bd-open="oil" data-bd-ctx="SPS/PDS sample bottle · charging the PVT cell">Bottle Details</button>
              </div>
              <div style="display:flex; align-items:center; gap:9px; flex:0 1 auto; min-width:0; padding:5px 14px 5px 11px; border-radius:999px; background:{{ cellStatusBg }}; border:1px solid {{ cellStatusBorder }}; white-space:nowrap;">
                <span style="{{ cellStatusDot }}"></span>
                <span style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.8px; color:{{ cellStatusColor }};">{{ chargeStageTag }}</span>
                <span style="width:1px; height:13px; flex:0 0 auto; background:{{ cellStatusBorder }};"></span>
                <span style="font-size:12.5px; font-weight:600; letter-spacing:.1px; color:var(--txt); overflow:hidden; text-overflow:ellipsis;">{{ cellStatusText }}</span>
              </div>

            </div>
            <div style="flex:1; min-height:0; display:flex; align-items:stretch; gap:12px; margin-top:3px; overflow:hidden;">
            <sc-if value="{{ chargeShowAgit }}" hint-placeholder-val="{{ false }}">
            <div style="flex:0 0 312px; min-width:0; display:flex; flex-direction:column; gap:9px; overflow-y:auto; padding:2px 2px 2px 0;">
              <div style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:1.1px; text-transform:uppercase; color:var(--mut2);">Process status</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                <sc-for list="{{ agCards1 }}" as="c" hint-placeholder-count="4">
                <div style="background:var(--icard); border:1px solid var(--line2); border-radius:9px; padding:8px 11px; min-width:0;">
                  <div style="font-family:'IBM Plex Mono'; font-size:9px; letter-spacing:.7px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.label }}</div>
                  <div style="font-family:'IBM Plex Mono'; font-size:16px; font-weight:600; color:{{ c.color }}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.value }}</div>
                  <div style="font-size:10px; color:var(--mut2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.sub }}</div>
                </div>
                </sc-for>
              </div>
              <div style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:1.1px; text-transform:uppercase; color:var(--mut2);">Transfer values</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                <sc-for list="{{ agCards2 }}" as="c" hint-placeholder-count="3">
                <div style="background:var(--icard); border:1px solid var(--line2); border-radius:9px; padding:8px 11px; min-width:0;">
                  <div style="font-family:'IBM Plex Mono'; font-size:9px; letter-spacing:.7px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.label }}</div>
                  <div style="font-family:'IBM Plex Mono'; font-size:16px; font-weight:600; color:{{ c.color }}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.value }}</div>
                  <div style="font-size:10px; color:var(--mut2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.sub }}</div>
                </div>
                </sc-for>
              </div>
              <div style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:1.1px; text-transform:uppercase; color:var(--mut2);">Pressure control</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                <sc-for list="{{ agCards3 }}" as="c" hint-placeholder-count="4">
                <div style="background:var(--icard); border:1px solid var(--line2); border-radius:9px; padding:8px 11px; min-width:0;">
                  <div style="font-family:'IBM Plex Mono'; font-size:9px; letter-spacing:.7px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.label }}</div>
                  <div style="font-family:'IBM Plex Mono'; font-size:16px; font-weight:600; color:{{ c.color }}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.value }}</div>
                  <div style="font-size:10px; color:var(--mut2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.sub }}</div>
                </div>
                </sc-for>
              </div>
              <div style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:1.1px; text-transform:uppercase; color:var(--mut2);">BV Software · Barogram</div>
              <svg sc-camel-view-box="0 0 300 62" sc-camel-preserve-aspect-ratio="none" style="display:block; width:100%; height:62px; background:#06101e; border:1px solid var(--line); border-radius:8px; flex:0 0 auto;">
                <rect x="0" y="28" width="300" height="6" fill="rgba(70,211,154,.14)"></rect>
                <line x1="0" y1="31" x2="300" y2="31" stroke="#46d39a" stroke-width="1" stroke-dasharray="3 5" opacity=".7"></line>
                <polyline points="{{ baroPoints }}" fill="none" stroke="#5fb0ff" stroke-width="1.6" stroke-linejoin="round"></polyline>
                <text x="5" y="11" font-family="IBM Plex Mono" font-size="7.5" fill="var(--cap)">5,040</text>
                <text x="5" y="58" font-family="IBM Plex Mono" font-size="7.5" fill="var(--cap)">4,960</text>
              </svg>
            </div>
            </sc-if>
            <svg sc-camel-view-box="{{ chargeViewBox }}" sc-camel-preserve-aspect-ratio="xMidYMid meet" style="display:block; width:100%; height:100%; max-height:100%; align-self:center;">
              <defs>
                ${BottleArt.defs('c')}
                ${PVTCellArt.defs('cc')}
                <linearGradient id="c-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"></stop><stop offset=".42" stop-color="#b3c1d8"></stop><stop offset=".58" stop-color="#7e90b0"></stop><stop offset="1" stop-color="#1f2a3e"></stop></linearGradient>
                <linearGradient id="c-cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>
                <linearGradient id="c-oil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ed99a"></stop><stop offset="1" stop-color="#3a9d63"></stop></linearGradient>
                <linearGradient id="c-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa6d8"></stop><stop offset="1" stop-color="#2f6f9c"></stop></linearGradient>
                <pattern id="c-hatch" width="8" height="8" sc-camel-pattern-transform="rotate(45)" sc-camel-pattern-units="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="8" stroke="#e7b15a" stroke-width="2"></line></pattern>
                <mask id="c-fluid-mask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="1200" height="700">
                  <path d="M585 197.9 V60" fill="none" stroke="#fff" stroke-width="14" style="{{ chargeLineFluidStyle }}"></path>
                  <path d="M585 60 H730 V190 H1030 V215" sc-camel-path-length="600" fill="none" stroke="#fff" stroke-width="14" stroke-dasharray="600" style="{{ chargeRevealStyle }}"></path>
                </mask>
                <pattern id="c-sample" width="9" height="9" sc-camel-pattern-units="userSpaceOnUse"><rect width="9" height="9" fill="#c7a233"></rect><circle cx="4.5" cy="4.5" r="1.15" fill="#f2d879" opacity=".7"></circle></pattern>
              </defs>

              <sc-if value="{{ showBottleRig }}" hint-placeholder-val="{{ true }}">
              <g style="{{ rigDimStyle }}">
              <!-- support stand (BottleArt.stand, drawn first): rod behind the bottle, clamp on the barrel, lower cap on a fork ledge -->
              ${C_STAND.back}

              <!-- SPS/PDS bottle : technical cutaway, enlarged focal point -->
              <path d="M585 197.9 V60" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></path>
              <path d="M585 197.9 V60" fill="none" stroke="#ffcf3f" stroke-width="2.4" stroke-linecap="round" style="{{ chargeLineFluidStyle }}"></path>
              <path d="M585 197.9 V60" fill="none" stroke="#fff2c0" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 10" mask="url(#c-fluid-mask)" style="{{ seg1FlowStyle }}"></path>
              <!-- approved Oil Sample Bottle, centre (562.44, 330), scale 0.47, valves face right: the sample-valve side port ends on
                   the riser (585, 197.9), the driving-side port at (585, 462.1). Fills / piston in bore units from Main.js -->
              ${BottleArt.oil('c', { x: 562.44, y: 330, s: 0.47, bd: 'oil', ctx: 'SPS/PDS sample bottle · charging the PVT cell',
                inner: `<rect x="-22" y="-226" width="44" height="{{ chargeOilH }}" fill="url(#cOil)" style="transition:height .12s linear;"></rect>
                <rect x="-22" y="{{ chargeWaterY }}" width="44" height="{{ chargeWaterH }}" fill="url(#cDrive)" style="transition:y .12s linear,height .12s linear;"></rect>
                <g style="{{ chargePistonStyle }}">${PBDraw.mixRing('c', 0, -226 - 8.5)}${PBDraw.piston('c', -226)}</g>`,
                ringT: '{{ chargeBtlRing }}', needleT: '{{ chargeBtlNeedle }}', ringB: '{{ chargePumpRing }}', needleB: '{{ chargePumpNeedle }}' })}

              ${C_STAND.front}
              <text x="596" y="150" font-family="IBM Plex Sans" font-size="14" font-weight="600" fill="var(--txt)">SPS/PDS</text>
              <!-- left-side callout labels -->
              <line x1="545" y1="258" x2="474" y2="258" stroke="var(--line2)" stroke-width="1"></line>
              <text x="470" y="255" text-anchor="end" font-family="IBM Plex Sans" font-size="12" fill="var(--txt2)">Sample side</text>
              <text x="470" y="267" text-anchor="end" font-family="IBM Plex Sans" font-size="10" fill="var(--mut)">approximate / unknown</text>
              <g style="{{ chargePistonLabelStyle }}">
                <line x1="587" y1="234.6" x2="706" y2="234.6" stroke="var(--line2)" stroke-width="1"></line>
                <text x="710" y="237.6" text-anchor="start" font-family="IBM Plex Sans" font-size="12" fill="var(--txt2)">Floating Piston</text>
              </g>
              <line x1="545" y1="398" x2="474" y2="388" stroke="var(--line2)" stroke-width="1"></line>
              <text x="470" y="385" text-anchor="end" font-family="IBM Plex Sans" font-size="12" fill="var(--txt2)">Water side</text>
              <text x="470" y="397" text-anchor="end" font-family="IBM Plex Sans" font-size="10" fill="var(--mut)">pressurized by pump</text>

              <!-- transfer pump : approved prototype design (bench unit on legs), left of the bottle; outlet on its right face -->
              <rect x="356" y="500" width="11" height="62" fill="url(#ccSteelD)" stroke="#2a3443" stroke-width=".7"></rect><rect x="350" y="560" width="23" height="6" rx="2" fill="#8794a5"></rect>
              <rect x="425" y="500" width="11" height="62" fill="url(#ccSteelD)" stroke="#2a3443" stroke-width=".7"></rect><rect x="419" y="560" width="23" height="6" rx="2" fill="#8794a5"></rect>
              <rect x="346" y="404" width="103" height="99" rx="6" fill="url(#ccPanelV)" stroke="#8592a3" stroke-width="1.3"></rect>
              <rect x="346" y="404" width="103" height="9" rx="5" fill="url(#ccNavyV)"></rect>
              <rect x="355" y="421" width="85" height="25" rx="3" fill="url(#ccScreen)" stroke="#3a4656" stroke-width="1"></rect>
              <text x="397.5" y="438" text-anchor="middle" font-family="IBM Plex Mono" font-size="12" font-weight="600" fill="#5fd4ff">{{ tpText }}</text>
              <circle cx="425" cy="472" r="13" fill="url(#ccSteelD)" stroke="#2a3443" stroke-width="1"></circle><circle cx="425" cy="472" r="9" fill="#f4f6f9" stroke="#5d6878" stroke-width=".8"></circle><line x1="425" y1="472" x2="430" y2="465.5" stroke="#c0392b" stroke-width="1.5"></line>
              <rect x="357" y="457" width="38" height="9" rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"></rect><rect x="357" y="472" width="38" height="9" rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"></rect>
              <rect x="449" y="450" width="10" height="16" rx="2" fill="url(#ccSteelD)" stroke="#2a3443" stroke-width=".9"></rect>
              <rect x="327" y="523" width="141" height="15" rx="4" fill="var(--panel)" stroke="#5fb0ff" stroke-width="1.4" style="{{ tpHiStyle }}"></rect>
              <text x="397.5" y="518" text-anchor="middle" font-family="IBM Plex Sans" font-size="14" fill="var(--red)" font-weight="600" paint-order="stroke" stroke="var(--panel)" stroke-width="3" stroke-linejoin="round">Transfer Pump</text>
              <foreignObject x="327" y="523" width="141" height="15"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px; color:{{ chargePumpLabelColor }};">{{ chargePumpLabel }}</div></foreignObject>
              <text x="397.5" y="550" text-anchor="middle" font-family="IBM Plex Sans" font-size="10" fill="var(--mut)" paint-order="stroke" stroke="var(--panel)" stroke-width="3" stroke-linejoin="round">connected to water side</text>

              <!-- pump -> bottle driving side (physical, solid bright tubing) -->
              <path d="M459 458 H472 V540 H600 V462.1 H585" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></path>
              <path d="M459 458 H472 V540 H600 V462.1 H585" fill="none" stroke="url(#c-metal)" stroke-width="4" stroke-linecap="round"></path>
              <path d="M459 458 H472 V540 H600 V462.1 H585" fill="none" stroke="#46e0ff" stroke-width="2.4" stroke-linecap="round" style="{{ pumpLineFluidStyle }}"></path>
              <path d="M459 458 H472 V540 H600 V462.1 H585" fill="none" stroke="#eaf9ff" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 10" style="{{ chargePumpFlowStyle }}"></path>
              <path d="M520 534 l12 6 l-12 6 Z" fill="#46e0ff" style="{{ pumpLineFluidStyle }}"></path>
              <text x="636" y="530" text-anchor="start" font-family="IBM Plex Mono" font-size="11" letter-spacing=".5" fill="var(--cap2)">Pump Line</text>

              <!-- bottle valve on the bottle outlet riser (drives vBottle; same look as the cell valve) -->
              <line x1="563" y1="120" x2="573" y2="120" stroke="#8fa3c2" stroke-width="2.4"></line>
              <path d="M572 108 L598 108 L585 120 Z" fill="url(#c-cyl)" stroke="#0a0e16" stroke-width="1.3"></path>
              <path d="M572 132 L598 132 L585 120 Z" fill="url(#c-cyl)" stroke="#0a0e16" stroke-width="1.3"></path>
              <g style="{{ bottleValveHotStyle }}">
                <path d="M572 108 L598 108 L585 120 Z" fill="#ffcf3f"></path>
                <path d="M572 132 L598 132 L585 120 Z" fill="#ffcf3f"></path>
              </g>
              <circle cx="557" cy="120" r="7" fill="#0c1626" stroke="#8fa3c2" stroke-width="2"></circle>
              <g stroke="#8fa3c2" stroke-width="1.5" stroke-linecap="round" style="{{ bottleValveWheelStyle }}"><line x1="550" y1="120" x2="564" y2="120"></line><line x1="557" y1="113" x2="557" y2="127"></line></g>
              <text x="604" y="116" font-family="IBM Plex Sans" font-size="11" fill="{{ bottleValveLabelColor }}">Bottle Valve</text>
              <circle cx="585" cy="120" r="17" fill="none" stroke="#ffcf3f" stroke-width="2" style="{{ ringBottle }}"><animate attributeName="r" values="15;19;15" dur="1.2s" repeatCount="indefinite"></animate></circle>
              <g style="{{ tagBottle.style }}"><rect x="604" y="121" width="54" height="14" rx="3" fill="{{ tagBottle.fill }}" stroke="{{ tagBottle.stroke }}" stroke-width="1"></rect><text x="631" y="131" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" font-weight="600" letter-spacing=".6" fill="{{ tagBottle.color }}">{{ tagBottle.text }}</text></g>
              </g>
              </sc-if>

              <!-- bottle top outlet -> charge line -> metallic inlet (appears only once the bottle is connected) -->
              <sc-if value="{{ showBottleRig }}" hint-placeholder-val="{{ true }}">
              <circle cx="585" cy="60" r="5" fill="url(#c-metal)" stroke="#0a0e16" stroke-width="0.8"></circle>
              <circle cx="730" cy="60" r="4" fill="url(#c-metal)" stroke="#0a0e16" stroke-width="0.7"></circle>
              <g style="{{ connPipeStyle2 }}">
                <path d="M585 60 H730 V190 H748" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round" style="{{ connRevealStyle }}"></path>
                <path d="M585 60 H730 V190 H748" fill="none" stroke="url(#c-metal)" stroke-width="4" stroke-linecap="round" style="{{ connRevealStyle }}"></path>
                <path d="M585 60 H730 V190 H748" fill="none" stroke="#ffcf3f" stroke-width="2.4" style="{{ chargeHLineStyle }}"></path>
                <path d="M585 60 H730 V190 H748" fill="none" stroke="#fff2c0" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 10" mask="url(#c-fluid-mask)" style="{{ seg1FlowStyle }}"></path>
                <path d="M694 54 l12 6 l-12 6 Z" fill="#ffcf3f" style="{{ chargeArrowStyle }}"></path>
                <text x="672" y="48" text-anchor="middle" font-family="IBM Plex Mono" font-size="11" letter-spacing=".5" fill="var(--cap2)">Charge Line</text>
              </g>
              <!-- stage 2: connection points being made up -->
              <g style="{{ connPointStyle }}">
                <circle cx="585" cy="60" r="11" fill="none" stroke="#5fb0ff" stroke-width="2" style="animation:pvtpulse 1s ease-in-out infinite;"></circle>
                <circle cx="748" cy="190" r="11" fill="none" stroke="#5fb0ff" stroke-width="2" style="animation:pvtpulse 1s ease-in-out infinite;"></circle>
                <text x="722" y="238" text-anchor="end" font-family="IBM Plex Mono" font-size="9.5" letter-spacing=".5" fill="#5fb0ff">CONNECTION POINT · PORT L</text>
              </g>
              <!-- stage 8: fittings separating -->
              <g style="{{ discGapStyle }}">
                <circle cx="585" cy="60" r="10" fill="none" stroke="#ffcf3f" stroke-width="2" style="animation:pvtpulse 1s ease-in-out infinite;"></circle>
                <circle cx="748" cy="190" r="10" fill="none" stroke="#ffcf3f" stroke-width="2" style="animation:pvtpulse 1s ease-in-out infinite;"></circle>
              </g>
              <sc-if value="{{ bottleOff }}" hint-placeholder-val="{{ true }}">
                <line x1="585" y1="60" x2="614" y2="60" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></line>
                <line x1="585" y1="60" x2="614" y2="60" stroke="#5f7291" stroke-width="4" stroke-linecap="round"></line>
                <path d="M748 190 H730 V170" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></path>
                <path d="M748 190 H730 V170" fill="none" stroke="#5f7291" stroke-width="4" stroke-linecap="round"></path>
                <rect x="618" y="47" width="119" height="26" rx="6" fill="rgba(28,14,18,.92)" stroke="#e0475c" stroke-width="1.1"></rect>
                <text x="677.5" y="63" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" letter-spacing=".6" fill="var(--red)">{{ bottleOffText }}</text>
              </sc-if>
              </sc-if>

              <!-- ===== PVT CELL: approved shared design (components/PVTCellArt.js), legacy placement ===== -->
              <rect x="738" y="104" width="420" height="418" rx="14" fill="none" stroke-width="2.4" style="{{ cellHaloStyle }}"></rect>
              ${PVTCellArt.cell('cc', {
                innerB: '<rect x="846" y="{{ chargePumpBFillY }}" width="40" height="{{ chargePumpBFillH }}" rx="3" fill="#ffcf3f" style="{{ chargePumpBFillStyle }}"></rect>',
                innerA: '<rect x="1010" y="{{ chargePumpAFillY }}" width="40" height="{{ chargePumpAFillH }}" rx="3" fill="#ffcf3f" style="{{ chargePumpAFillStyle }}"></rect>',
                pistonB: 'pumpBPistonY', pistonA: 'pumpAPistonY',
                valves: { A: 'cellV.A', B: 'cellV.B', L: 'cellV.L' },
                ports: { L: { plug: '!cellV.Lconn', nut: 'cellV.Lconn' } },
                disp: { P: '{{ cbPsi }}', Pu: 'psi', B: '{{ pumpBVal }} cc', A: '{{ pumpAVal }} cc' },
                portLabel: { L: 'Port L · cell valve' } })}
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
              <!-- computer + controller (approved desk) to the right, behind the cell; signal cable from the cell -->
              ${PVTCellArt.cable({}, { x: 1150, y: 286, s: .52 }, 30)}
              ${PVTCellArt.desk('cc', { x: 1150, y: 286, s: .52, legs: 205, ctl: '{{ cbPsi }}',
                rows: [['CELL psi', '{{ cbPsi }}', '#5fd4ff'], ['PUMP A cc', '{{ cbMl }}', '#ffc56b'], ['PUMP B cc', '{{ pumpBVal }}', '#ffc56b'],
                       ['V₁ mL', '{{ initReadText }}', '#7ff0bf', '{{ pcV1Style }}'], ['V₂ mL', '{{ calcV2 }}', '#ffe08a', '{{ pcV2Style }}']],
                hi: '{{ pcFlashStyle }}' })}
              <!-- ===== sequential fluid front: bottle -> charge line -> cell valve -> initial volume -> pump ===== -->
              <path d="M585 60 H730 V190 H1030 V215" sc-camel-path-length="600" fill="none" stroke="#fff6d8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="600" style="{{ chargeRevealStyle }}"></path>
              <path d="M765 190 H1030 V215" fill="none" stroke="#fff6d8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" style="{{ retainedStyle }}"></path>
              <circle cx="{{ chargeHeadX }}" cy="{{ chargeHeadY }}" r="10.5" fill="none" stroke="#ffcf3f" stroke-width="2" style="{{ chargeHeadStyle }}"></circle>
              <circle cx="{{ chargeHeadX }}" cy="{{ chargeHeadY }}" r="5.5" fill="#fff6d8" style="{{ chargeHeadStyle }}"></circle>
              <g transform="translate(42 0)">
              <!-- one-at-a-time active-step callouts -->
              <sc-if value="{{ monCard }}" hint-placeholder-val="{{ true }}">
              <g style="{{ chargeMonWrapStyle }}">
              <sc-if value="{{ monGauge }}" hint-placeholder-val="{{ true }}">
              <rect x="214" y="50" width="292" height="146" rx="11" fill="rgba(9,15,27,.95)" stroke="{{ monStroke }}" stroke-width="1.4"></rect>
              <foreignObject x="234" y="64" width="268" height="14"><div style="margin:0; display:flex; align-items:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:1.6px; color:{{ monColor }};">{{ monLabel }}</div></foreignObject>
              <foreignObject x="230" y="80" width="200" height="52"><div style="margin:0; display:flex; align-items:center; height:100%; white-space:nowrap; line-height:1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:42px; font-weight:600; letter-spacing:-1px; color:{{ monColor }};">{{ monBig }}</div></foreignObject>
              <foreignObject x="436" y="110" width="66" height="16"><div style="margin:0; display:flex; align-items:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:14px; color:#8fa3bf;">{{ monUnit }}</div></foreignObject>
              <rect x="234" y="140" width="252" height="9" rx="4.5" fill="rgba(150,175,210,.14)"></rect>
              <rect x="234" y="140" width="{{ monBarW }}" height="9" rx="4.5" fill="{{ monColor }}" style="transition:width .2s linear;"></rect>
              <line x1="486" y1="136" x2="486" y2="153" stroke="#46d39a" stroke-width="1.6"></line>
              <foreignObject x="234" y="157" width="130" height="13"><div style="margin:0; display:flex; align-items:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:9px; letter-spacing:.5px; color:#8fa3bf;">{{ monStartText }}</div></foreignObject>
              <foreignObject x="222" y="157" width="264" height="13"><div style="margin:0; display:flex; align-items:center; justify-content:flex-end; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:9px; letter-spacing:.5px; color:var(--accg);">{{ monTargetText }}</div></foreignObject>
              <foreignObject x="234" y="176" width="252" height="13"><div style="margin:0; display:flex; align-items:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:9px; letter-spacing:.5px; color:#9fb3cf;">{{ monSub }}</div></foreignObject>
              </sc-if>
              <sc-if value="{{ monCalc }}" hint-placeholder-val="{{ false }}">
              <rect x="214" y="50" width="292" height="146" rx="11" fill="rgba(9,15,27,.95)" stroke="{{ calcStroke }}" stroke-width="1.4"></rect>
              <foreignObject x="228" y="60" width="266" height="132"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:9.5px; line-height:1.3; color:#dfe8f5;">
                <div style="font-size:10px; letter-spacing:1.3px; color:{{ calcColor }}; margin-bottom:6px;">{{ calcTitle }}</div>
                <div style="{{ calcRow1 }}">
                  <div style="display:flex; justify-content:space-between; padding:1px 3px;"><span style="color:#9fb3cf;">V&#8321; initial (recorded)</span><span style="font-weight:600;">{{ calcV1 }}</span></div>
                  <div style="display:flex; justify-content:space-between; padding:1px 3px; {{ calcV2Hi }}"><span style="color:#9fb3cf;">V&#8322; final transfer pump</span><span style="font-weight:600; color:#ffe08a;">{{ calcV2 }}</span></div>
                </div>
                <div style="{{ calcRow2 }} display:flex; justify-content:space-between; margin-top:4px; padding:4px 3px 0; border-top:1px solid rgba(150,175,210,.2);"><span>{{ calcDiffEq }}</span><span style="font-weight:700; color:#ffe08a;">{{ calcDiff }}</span></div>
                <div style="{{ calcRow3 }} margin-top:2px;">
                  <div style="display:flex; justify-content:space-between; padding:1px 3px;"><span style="color:#9fb3cf;">&#8594; charged into Pump A</span><span style="font-weight:600;">{{ pumpAText }}</span></div>
                  <div style="display:flex; justify-content:space-between; padding:1px 3px;"><span style="color:#9fb3cf;">dead space (filled at equalization)</span><span style="font-weight:600;">{{ deadText }}</span></div>
                </div>
                <div style="{{ calcRow4 }} display:flex; justify-content:space-between; margin-top:4px; padding:4px 3px 0; border-top:1px solid rgba(150,175,210,.2); color:#7ff0bf;"><span>{{ calcTotalEq }}</span><span style="font-weight:700;">&#10003;</span></div>
              </div></foreignObject>
              </sc-if>
              <sc-if value="{{ monIso }}" hint-placeholder-val="{{ false }}">
              <rect x="214" y="50" width="292" height="146" rx="11" fill="rgba(9,15,27,.95)" stroke="{{ isoStroke }}" stroke-width="1.4"></rect>
              <foreignObject x="228" y="60" width="266" height="132"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:9.5px; line-height:1.3; color:#dfe8f5;">
                <div style="font-size:9.5px; letter-spacing:.5px; color:{{ isoColor }}; margin-bottom:7px; white-space:nowrap;">{{ isoTitle }}</div>
                <sc-for list="{{ isoRows }}" as="r" hint-placeholder-count="6">
                <div style="display:flex; align-items:center; gap:7px; height:17px; color:{{ r.color }}; font-weight:{{ r.weight }};"><span style="width:10px; text-align:center;">{{ r.mark }}</span><span style="flex:1; color:#c9d6ea;">{{ r.label }}</span><span>{{ r.state }}</span></div>
                </sc-for>
              </div></foreignObject>
              </sc-if>
              </g>
              </sc-if>
              </g>
              <sc-if value="{{ noteAgit }}" hint-placeholder-val="{{ false }}">
              <rect x="866" y="143" width="164" height="19" rx="5" fill="rgba(15,24,40,.95)" stroke="#4d9dff" stroke-width="1"></rect>
              <foreignObject x="866" y="145.5" width="164" height="14"><div style="margin:0; display:flex; align-items:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;justify-content:center;font-size:9px; letter-spacing:.3px; color:var(--btnt);">AGITATING&nbsp;{{ agDirText }}&nbsp;· 10 cc/min</div></foreignObject>
              </sc-if>
              <text x="948" y="100" text-anchor="middle" font-family="IBM Plex Sans" font-size="18" font-weight="600" fill="var(--txt)">PVT Cell</text>
              <foreignObject x="828" y="72" width="240" height="14"><div style="margin:0; display:flex; align-items:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;justify-content:center;font-size:10px; letter-spacing:.8px; overflow:hidden; color:{{ cellStatusColor }};">{{ cellStateShort }}</div></foreignObject>
                          </svg>
            </div>

            <div style="display:flex; flex-direction:column; gap:5px; margin-top:5px;">



              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                <div class="pc-host" data-pc="Main:charge" data-pc-layout="bar" style="flex:1 1 auto;"></div>
                <button class="act" onclick="{{ chargeFlash }}" style="font-family:inherit; font-size:11.5px; font-weight:600; white-space:nowrap; padding:7px 18px; border-radius:8px; cursor:{{ flashBtnCursor }}; background:{{ flashBtnBg }}; border:1px solid {{ flashBtnBorder }}; color:{{ flashBtnColor }};">Move to Flash Process →</button>
              </div>
            </div>
          </div>
          </sc-if>

          <sc-if value="{{ showFlashStep }}" hint-placeholder-val="{{ false }}">
          <!-- Flash Process — runs on this page, after charging -->
          <div style="flex:1; min-height:0; display:flex; flex-direction:column; overflow-y:auto; overflow-x:hidden; background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:10px 16px; box-shadow:0 1px 3px rgba(20,35,60,.06);">
            <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
              <div style="flex:1 1 260px; min-width:0;">
                <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
                  <h2 class="pg-title">Flash Process</h2>
                  <span style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.6px; padding:3px 8px; border-radius:6px; background:var(--chipbg); border:1px solid var(--line2); color:var(--chipt); white-space:nowrap;">{{ valSrcContext }}</span>
                </div>
                <div class="pg-desc" style="margin-top:1px;">Vacuum, charge helium, flash 50 cc from Pump A — oil to the glass, gas to the gasometer and balloon</div>
              </div>
              <div style="display:flex; align-items:center; gap:6px; flex:0 0 auto; padding:5px 11px; border-radius:999px; background:{{ fPillBg }}; border:1px solid {{ fPillBorder }}; font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.7px; text-transform:uppercase; color:{{ fPillColor }}; white-space:nowrap;">
                <span style="{{ fPillDot }}"></span>{{ fStatusText }}
              </div>
            </div>

            <!-- compact live summary row (same language as the charging page) -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(104px,1fr)); gap:5px; margin-top:6px;">
              <sc-for list="{{ fReadouts }}" as="r" hint-placeholder-count="6">
                <div style="background:var(--icard); border:1px solid var(--line); border-radius:7px; padding:4px 6px; min-width:0;">
                  <div style="font-family:'IBM Plex Sans',sans-serif; font-size:10px; font-weight:600; letter-spacing:.2px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ r.label }}</div>
                  <div style="font-family:'IBM Plex Mono'; font-size:13.5px; font-weight:600; margin-top:1px; color:{{ r.color }}; white-space:nowrap;">{{ r.value }}</div>
                  <div style="font-size:9.5px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ r.sub }}</div>
                </div>
              </sc-for>
            </div>

            <div style="flex:1 1 auto; min-height:225px; display:flex; align-items:center; justify-content:center; margin-top:4px; overflow:hidden;">
              <svg sc-camel-view-box="0 84 1330 545" sc-camel-preserve-aspect-ratio="xMidYMid meet" style="display:block; width:100%; height:100%;">
                <defs>
                  ${PVTCellArt.defs('fc')}
                  <linearGradient id="f-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"></stop><stop offset=".42" stop-color="#b3c1d8"></stop><stop offset=".58" stop-color="#7e90b0"></stop><stop offset="1" stop-color="#1f2a3e"></stop></linearGradient>
                  <linearGradient id="f-cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>
                  <linearGradient id="f-oil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6c04a"></stop><stop offset="1" stop-color="#9a7318"></stop></linearGradient>
                  <linearGradient id="f-he" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fc7f0"></stop><stop offset="1" stop-color="#2b6f96"></stop></linearGradient>
                  <linearGradient id="f-gas2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8be8d0"></stop><stop offset="1" stop-color="#2f8a70"></stop></linearGradient>
                  <pattern id="f-sample" width="9" height="9" sc-camel-pattern-units="userSpaceOnUse"><rect width="9" height="9" fill="#c7a233"></rect><circle cx="4.5" cy="4.5" r="1.15" fill="#f2d879" opacity=".7"></circle></pattern>
                </defs>

                <!-- ===== 1-2. COMPUTER + CONTROLLER (approved desk), left column: the Flash Unit and Gasometer occupy the right ===== -->
                <path d="M607.7 412.6 C 636 468, 628 506, 566 506 L 210 506 C 168 506, 154 430, 148 306" fill="none" stroke="#1e2733" stroke-width="3.2" stroke-linecap="round"></path>
                <path d="M607.7 412.6 C 636 468, 628 506, 566 506 L 210 506 C 168 506, 154 430, 148 306" fill="none" stroke="#47546a" stroke-width="1" stroke-linecap="round" opacity=".7"></path>
                ${PVTCellArt.desk('fc', { x: 44, y: 230, s: .4, legs: 409, ctl: '5,000',
                  rows: [['CELL psig', '5,000', '#7ff0bf'], ['PUMP A cc', '{{ fPumpABox }}', '#ffc56b']] })}

                <!-- ===== 3. PVT CELL : approved shared design (PVTCellArt), legacy frame shifted with the group ===== -->
                <g transform="translate(-506,-20)">
                  ${PVTCellArt.cell('fc', {
                    innerA: '<rect x="1010" y="219" width="40" height="{{ fPumpFillH }}" rx="3" fill="url(#f-sample)" style="{{ fPumpFillStyle }}"></rect>' +
                      '<sc-if value="{{ fVerOn }}" hint-placeholder-val="{{ false }}"><g transform="translate(0 -8)"><rect x="1010" y="{{ fVerBandY }}" width="40" height="16" fill="rgba(158,240,255,.22)" style="{{ fVerScanStyle }}"></rect>' +
                      '<rect x="1010" y="{{ fVerScanY }}" width="40" height="3" fill="#9ef0ff" style="{{ fVerScanStyle }}"></rect></g></sc-if>',
                    pistonB: '219', pistonA: '219 + (+fPumpFillH)',
                    valves: { A: "fVS.c === '#46d39a'", R: "fVS.c === '#46d39a'" },
                    ports: { R: { plug: 'false', nut: 'true' } },
                    disp: { P: '5,000', Pu: 'psi', B: '0 cc', A: '{{ fPumpAText }}' } })}
                  <line x1="1030" y1="190" x2="1148" y2="190" stroke="#ffcf3f" stroke-width="1.6" stroke-dasharray="2 11" style="{{ fSampleFlow }}"></line>
                  <foreignObject x="802" y="532" width="128" height="17"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif;gap:4px; font-size:12px; font-weight:600; color:var(--txt);">Pump B · <span style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:600; color:var(--txt2);">0 cc</span></div></foreignObject>
                  <foreignObject x="962" y="532" width="128" height="17"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif;gap:4px; font-size:12px; font-weight:600; color:var(--txt);">Pump A · <span style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:600; color:{{ fPumpALbl }};">{{ fPumpAText }}</span></div></foreignObject>
                  <!-- step 1 · verify stable sample : check highlights (gauge -> Pump A -> single-phase scan in the bore) -->
                  <sc-if value="{{ fVerOn }}" hint-placeholder-val="{{ false }}">
                  <circle cx="948" cy="217.7" r="25" fill="none" stroke="{{ fVerCol0 }}" stroke-width="2" style="{{ fVerS0 }}"></circle>
                  <rect x="994" y="170" width="72" height="188" rx="8" fill="none" stroke="{{ fVerCol1 }}" stroke-width="2" style="{{ fVerS1 }}"></rect>
                  <rect x="962" y="529" width="136" height="23" rx="5" fill="none" stroke="{{ fVerCol1 }}" stroke-width="1.5" style="{{ fVerS1 }}"></rect>
                  </sc-if>
                  <text x="948" y="570" text-anchor="middle" font-family="'IBM Plex Sans','Segoe UI',Arial,sans-serif" font-size="16" font-weight="700" fill="var(--txt)">PVT Cell</text>
                  <foreignObject x="828" y="575" width="240" height="15"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px; font-weight:600; letter-spacing:.4px; color:var(--accg);">Stable · 5,000 psi</div></foreignObject>
                </g>

                <!-- sample line : Port R outward fitting -> flash unit (the Pump A outlet action opens the Pump A and Port R valves) -->
                <path d="M641.6 170 H672 V215 H700" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M641.6 170 H672 V215 H700" fill="none" stroke="#8ea0b8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M641.6 170 H672 V215 H700" fill="none" stroke="#ffcf3f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 10" style="{{ fSampleFlow }}"></path>
                <path d="M648 164 l12 6 l-12 6 Z" fill="#ffcf3f" style="{{ fSampleArrow }}"></path>
                <text x="684" text-anchor="middle" font-family="'IBM Plex Sans','Segoe UI',Arial,sans-serif" font-size="11" font-weight="600" fill="var(--txt2)"><tspan x="684" y="146">Sample</tspan><tspan x="684" y="159">Line</tspan></text>

                <!-- ===== 4. FLASH UNIT on a support stand ===== -->
                <rect x="700" y="150" width="310" height="334" rx="8" fill="#0c1728" stroke="#4d9dff" stroke-width="1.4" style="filter:drop-shadow(0 0 5px rgba(77,157,255,.45))"></rect>
                <rect x="707" y="193" width="296" height="284" rx="6" fill="rgba(8,16,30,.55)" stroke="#22344e" stroke-width="1"></rect>
                <rect x="707" y="193" width="296" height="284" rx="6" fill="#6fc7f0" style="{{ fHeTint }}"></rect>
                <rect x="700" y="150" width="310" height="36" rx="8" fill="rgba(77,157,255,.07)"></rect>
                <line x1="700" y1="186" x2="1010" y2="186" stroke="#2a3852" stroke-width="1.3"></line>
                <text x="716" y="175" font-family="'IBM Plex Sans','Segoe UI',Arial,sans-serif" font-size="15" font-weight="600" fill="#eef4fc">Flash Unit</text>
                <rect x="884" y="158" width="114" height="22" rx="4" fill="#06101e" stroke="{{ fuPStroke }}" stroke-width="1.2" style="filter:drop-shadow(0 0 4px rgba(231,177,90,.4))"></rect>
                <foreignObject x="884" y="160" width="114" height="18"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px; font-weight:600; color:{{ fuPColor }};">{{ fuPText }}</div></foreignObject>

                <line x1="730" y1="215" x2="980" y2="215" stroke="#0a0e16" stroke-width="6" stroke-linecap="round"></line>
                <line x1="730" y1="215" x2="980" y2="215" stroke="#9fb0c8" stroke-width="3.4" stroke-linecap="round"></line>
                <line x1="730" y1="213.6" x2="980" y2="213.6" stroke="#e8f1fb" stroke-width="1" opacity=".35"></line>
                <rect x="724" y="207" width="9" height="17" rx="2" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="0.8"></rect>
                <rect x="977" y="207" width="9" height="17" rx="2" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="0.8"></rect>
                <text x="855" y="203" text-anchor="middle" font-family="'IBM Plex Sans','Segoe UI',Arial,sans-serif" font-size="10.5" font-weight="600" letter-spacing=".4" fill="#aebfd6">Manifold</text>
                <circle cx="790" cy="215" r="4" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="0.7"></circle>
                <circle cx="930" cy="215" r="4" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="0.7"></circle>
                <circle cx="855" cy="215" r="4" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="0.7"></circle>

                <!-- glass : oil collection (left stud) -->
                <line x1="790" y1="215" x2="790" y2="320" stroke="#0a0e16" stroke-width="5" stroke-linecap="round"></line>
                <line x1="790" y1="215" x2="790" y2="320" stroke="#9fb0c8" stroke-width="2.6" stroke-linecap="round"></line>
                <line x1="790" y1="217" x2="790" y2="318" stroke="#ffcf3f" stroke-width="2" stroke-dasharray="3 10" style="{{ fOilFlow }}"></line>
                <rect x="788" y="213" width="4" height="4" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="0.6"></rect>
                <rect x="782" y="232" width="16" height="15" rx="3" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="0.9"></rect>
                <circle cx="806" cy="239" r="11" fill="none" stroke="#46d39a" stroke-width="1.6" style="{{ fVOil.ring }}"></circle>
                <circle cx="806" cy="239" r="6.5" fill="#0c1626" stroke="{{ fVOil.c }}" stroke-width="1.6"></circle>
                <g stroke="{{ fVOil.c }}" stroke-width="1.3" stroke-linecap="round" transform="{{ fVOil.tr }}"><line x1="799.5" y1="239" x2="812.5" y2="239"></line></g>
                <g stroke="rgba(200,225,250,.35)" stroke-width="1" stroke-linecap="round"><line x1="770" y1="360" x2="778" y2="360"></line><line x1="762" y1="390" x2="770" y2="390"></line><line x1="755" y1="418" x2="763" y2="418"></line></g>
                <rect x="785" y="290" width="10" height="34" fill="rgba(200,228,248,.08)" stroke="#c3ddf5" stroke-width="1.4"></rect>
                <text text-anchor="end" font-family="'IBM Plex Sans','Segoe UI',Arial,sans-serif" font-size="11.5" font-weight="600" fill="#e3ecf8"><tspan x="778" y="292">Flash Flask</tspan><tspan x="778" y="306" font-size="10.5" font-weight="500" fill="#f0c56a">Oil</tspan></text>
                <path d="M783 320 L783 337 Q782 347 771 352 L748 430 Q745 438 753 438 L827 438 Q835 438 832 430 L809 352 Q798 347 797 337 L797 320 Z" fill="rgba(15,24,40,.55)" stroke="#5fb0ff" stroke-width="1.8" stroke-linejoin="round" style="filter:drop-shadow(0 0 4px rgba(95,176,255,.5))"></path>
                <clipPath id="f-glass-clip"><path d="M784 322 L784 336 Q783 345 773 350 L751 428 Q748 436 755 436 L825 436 Q832 436 829 428 L807 350 Q797 345 796 336 L796 322 Z"></path></clipPath>
                <g clip-path="url(#f-glass-clip)">
                  <rect x="746" y="{{ fOilY }}" width="88" height="{{ fOilH }}" fill="url(#f-oil)" style="{{ fOilTrans }}"></rect>
                  <!-- flashing: oil droplets form at the inlet, fall, and merge into the layer -->
                  <ellipse cx="790" cy="{{ fDrop0.rcy }}" rx="{{ fDrop0.rrx }}" ry="{{ fDrop0.rry }}" fill="none" stroke="#f2d879" stroke-width="1" style="{{ fDrop0.rst }}"></ellipse>
                  <ellipse cx="790" cy="{{ fDrop0.cy }}" rx="{{ fDrop0.rx }}" ry="{{ fDrop0.ry }}" fill="url(#f-oil)" stroke="#f2d879" stroke-width=".5" style="{{ fDrop0.st }}"></ellipse>
                  <ellipse cx="790" cy="{{ fDrop1.rcy }}" rx="{{ fDrop1.rrx }}" ry="{{ fDrop1.rry }}" fill="none" stroke="#f2d879" stroke-width="1" style="{{ fDrop1.rst }}"></ellipse>
                  <ellipse cx="790" cy="{{ fDrop1.cy }}" rx="{{ fDrop1.rx }}" ry="{{ fDrop1.ry }}" fill="url(#f-oil)" stroke="#f2d879" stroke-width=".5" style="{{ fDrop1.st }}"></ellipse>
                  <ellipse cx="790" cy="{{ fDrop2.rcy }}" rx="{{ fDrop2.rrx }}" ry="{{ fDrop2.rry }}" fill="none" stroke="#f2d879" stroke-width="1" style="{{ fDrop2.rst }}"></ellipse>
                  <ellipse cx="790" cy="{{ fDrop2.cy }}" rx="{{ fDrop2.rx }}" ry="{{ fDrop2.ry }}" fill="url(#f-oil)" stroke="#f2d879" stroke-width=".5" style="{{ fDrop2.st }}"></ellipse>
                </g>
                <!-- digital balance : weighing pan + housing + display, centred under the flask (x 790) -->
                <rect x="784" y="443" width="12" height="4" fill="#5a6c88"></rect>
                <rect x="738" y="439" width="104" height="5" rx="1.5" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="0.8"></rect>
                <path d="M730 450 Q730 446 734 446 L846 446 Q850 446 850 450 L850 472 Q850 474 848 474 L732 474 Q730 474 730 472 Z" fill="#1b2638" stroke="#56709a" stroke-width="1.2"></path>
                <line x1="733" y1="447.5" x2="847" y2="447.5" stroke="#eef4fb" stroke-width="1" opacity=".18"></line>
                <text x="736" y="463" font-family="'IBM Plex Sans','Segoe UI',Arial,sans-serif" font-size="7.5" font-weight="700" letter-spacing=".4" fill="#9fb3cc">BALANCE</text>
                <rect x="781" y="450" width="52" height="20" rx="2.5" fill="#06101e" stroke="#2f4462" stroke-width="1"></rect>
                <circle cx="841" cy="460" r="3" fill="#2a3852" stroke="#6f86a8" stroke-width="0.9"></circle>
                <rect x="736" y="474" width="10" height="2.5" rx="1" fill="#3a4c66"></rect>
                <rect x="834" y="474" width="10" height="2.5" rx="1" fill="#3a4c66"></rect>
                <foreignObject x="781" y="451" width="52" height="18"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px; font-weight:700; color:{{ fGlassColor }};">{{ fGlassText }}</div></foreignObject>

                <!-- balloon : gas collection (right stud) -->
                <rect x="928" y="213" width="4" height="4" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="0.6"></rect>
                <circle cx="949" cy="229" r="11" fill="none" stroke="#46d39a" stroke-width="1.6" style="{{ fVBal.ring }}"></circle>
                <circle cx="949" cy="229" r="6.5" fill="#0c1626" stroke="{{ fVBal.c }}" stroke-width="1.6"></circle>
                <g stroke="{{ fVBal.c }}" stroke-width="1.3" stroke-linecap="round" transform="{{ fVBal.tr }}"><line x1="942.5" y1="229" x2="955.5" y2="229"></line></g>
                <rect x="936" y="224" width="8" height="10" rx="2" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="0.8"></rect>
                <rect x="923" y="215" width="14" height="35" rx="2" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="0.8"></rect>
                <g transform="translate(930,250) rotate(-20) scale(1.3) translate(-930,-250)">
                <path d="M916 250 Q930 246 944 250 L946 268 Q947 274 941 274 L919 274 Q913 274 914 268 Z" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="1"></path>
                <path d="M919 274 L919 278 Q919 288 902 294 L902 345 Q902 365 930 365 Q958 365 958 345 L958 294 Q941 288 941 278 L941 274 Z" fill="rgba(15,24,40,.55)" stroke="#5fb0ff" stroke-width="1.8" style="filter:drop-shadow(0 0 4px rgba(95,176,255,.5))"></path>
                <clipPath id="f-bottle-clip"><path d="M921 276 L921 280 Q921 289 904 295 L904 344 Q904 363 930 363 Q956 363 956 344 L956 295 Q939 289 939 280 L939 276 Z"></path></clipPath>
                <g clip-path="url(#f-bottle-clip)">
                  <g transform="translate(0,11)">
                  <ellipse cx="930" cy="{{ fBalloonCy }}" rx="{{ fBalloonRx }}" ry="{{ fBalloonRy }}" fill="rgba(95,176,255,.32)" style="{{ fBalloonTrans }}"></ellipse>
                  <ellipse cx="{{ fBalloonGlintX }}" cy="{{ fBalloonGlintY }}" rx="6" ry="9" fill="rgba(220,240,255,.3)" style="{{ fBalloonTrans }}"></ellipse>
                  </g>
                </g>
                </g>
                <text x="936" y="412" text-anchor="middle" font-family="'IBM Plex Sans','Segoe UI',Arial,sans-serif" font-size="11.5" font-weight="600" fill="#e3ecf8">Balloon Pressure</text>
                <rect x="901" y="419" width="70" height="20" rx="4" fill="#06101e" stroke="#2a3852" stroke-width="1"></rect>
                <foreignObject x="901" y="420" width="70" height="18"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px; font-weight:600; color:{{ fGasColor }};">{{ fGasText }}</div></foreignObject>

                <!-- support table : one tabletop under the unit, apron, 2 front + 2 rear legs, stretcher, levelling feet -->
                <rect x="731" y="494" width="6" height="90" fill="#223047" stroke="#16202f" stroke-width="0.8"></rect>
                <rect x="973" y="494" width="6" height="90" fill="#223047" stroke="#16202f" stroke-width="0.8"></rect>
                <rect x="728" y="584" width="12" height="4" rx="1" fill="#2c3b52"></rect>
                <rect x="970" y="584" width="12" height="4" rx="1" fill="#2c3b52"></rect>
                <rect x="694" y="484" width="322" height="10" rx="2" fill="#34455e" stroke="#1c2637" stroke-width="1"></rect>
                <line x1="696" y1="485.5" x2="1014" y2="485.5" stroke="#8fa3c2" stroke-width="1" opacity=".45"></line>
                <rect x="706" y="494" width="298" height="7" fill="#26344a" stroke="#1c2637" stroke-width="0.8"></rect>
                <rect x="709" y="494" width="9" height="96" fill="#3a4c66" stroke="#1c2637" stroke-width="0.9"></rect>
                <rect x="992" y="494" width="9" height="96" fill="#3a4c66" stroke="#1c2637" stroke-width="0.9"></rect>
                <rect x="718" y="552" width="274" height="6" fill="#34455e" stroke="#1c2637" stroke-width="0.8"></rect>
                <rect x="703" y="590" width="21" height="6" rx="1.5" fill="#4a5f7e" stroke="#1c2637" stroke-width="0.8"></rect>
                <rect x="986" y="590" width="21" height="6" rx="1.5" fill="#4a5f7e" stroke="#1c2637" stroke-width="0.8"></rect>

                <!-- vacuum connection : top pipeline -> port -> pump, visible only during evacuation -->
                <sc-if value="{{ fVacConnOn }}" hint-placeholder-val="{{ true }}">
                <path d="M855 219 V484" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></path>
                <path d="M855 219 V484" fill="none" stroke="#8ea0b8" stroke-width="4.5" stroke-linecap="round"></path>
                <path d="M855 219 V484" fill="none" stroke="#9cc6ff" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="4 9" style="{{ fVacFlow }}"></path>
                <rect x="838" y="484" width="34" height="16" rx="2" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="1"></rect>
                <text x="834" y="524" text-anchor="end" font-family="'IBM Plex Sans','Segoe UI',Arial,sans-serif" font-size="11.5" font-weight="600" fill="var(--txt)">Vacuum Port</text>
                <path d="M855 500 V530" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></path>
                <path d="M855 500 V530" fill="none" stroke="#8ea0b8" stroke-width="4.5" stroke-linecap="round"></path>
                <path d="M855 500 V530" fill="none" stroke="#9cc6ff" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="4 9" style="{{ fVacFlow }}"></path>
                <path d="M849 512 l6 12 l6 -12 Z" fill="#9cc6ff" style="{{ fVacArrow }}"></path>
                <circle cx="855" cy="512" r="9.5" fill="#0c1626" stroke="#8fa3c2" stroke-width="1.8"></circle>
                <g stroke="{{ fVacWheelCol }}" stroke-width="1.6" stroke-linecap="round" style="{{ fVacWheel }}"><line x1="845.5" y1="512" x2="864.5" y2="512"></line><line x1="855" y1="502.5" x2="855" y2="521.5"></line></g>

                <!-- ===== VACUUM PUMP ===== -->
                <rect x="785" y="530" width="146" height="58" rx="5" fill="#1c2637" stroke="#4a5f7e" stroke-width="1.5"></rect>
                <rect x="794" y="538" width="52" height="18" rx="2" fill="#0a1420" stroke="#33445e" stroke-width="0.8"></rect>
                <foreignObject x="794" y="540" width="52" height="14"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9.5px; letter-spacing:.5px; color:#5fb0ff;">VAC</div></foreignObject>
                <circle cx="898" cy="559" r="17" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="1.3"></circle>
                <circle cx="898" cy="559" r="11" fill="none" stroke="#0a0e16" stroke-width="1"></circle>
                <circle cx="898" cy="559" r="3.6" fill="#0a0e16"></circle>
                <circle cx="802" cy="566" r="3.4" fill="{{ fVacLed }}" style="{{ fVacLedStyle }}"></circle>
                <rect x="775" y="588" width="166" height="8" rx="2" fill="#26344a" stroke="#3a4c66" stroke-width="1"></rect>
                <text x="858" y="616" text-anchor="middle" font-family="'IBM Plex Sans','Segoe UI',Arial,sans-serif" font-size="14" font-weight="600" fill="var(--txt)">Vacuum Pump</text>
                </sc-if>

                <!-- helium line : gasometer -> flash unit -->
                <path d="M1136 215 H1010" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></path>
                <path d="M1136 215 H1010" fill="none" stroke="#8ea0b8" stroke-width="4.5" stroke-linecap="round"></path>
                <path d="M1136 215 H1010" fill="none" stroke="#6fc7f0" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="4 10" style="{{ fHeFlow }}"></path>
                <path d="M1052 209 l-12 6 l12 6 Z" fill="#6fc7f0" style="{{ fHeArrow }}"></path>

                <!-- ===== 5. GASOMETER (single chamber, aligned with the flash unit) ===== -->
                <rect x="1120" y="150" width="186" height="346" rx="6" fill="#0c1728" stroke="#4a5f7e" stroke-width="1.8"></rect>
                <line x1="1120" y1="186" x2="1306" y2="186" stroke="#4a5f7e" stroke-width="1.3"></line>
                <text x="1134" y="175" font-family="'IBM Plex Sans','Segoe UI',Arial,sans-serif" font-size="15" font-weight="600" fill="#eef4fc">Gasometer</text>
                <rect x="1212" y="157" width="86" height="22" rx="4" fill="#06101e" stroke="#1d3350" stroke-width="1"></rect>
                <foreignObject x="1212" y="159" width="86" height="18"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px; font-weight:600; color:{{ fChamberBoxColor }};">{{ fChamberBoxText }}</div></foreignObject>

                <rect x="1136" y="196" width="106" height="250" rx="4" fill="url(#f-cyl)" stroke="#0a0e16" stroke-width="1.4"></rect>
                <clipPath id="f-he-clip"><rect x="1140" y="200" width="98" height="242" rx="3"></rect></clipPath>
                <g clip-path="url(#f-he-clip)">
                  <rect x="1140" y="{{ fHeY }}" width="98" height="{{ fHeH }}" fill="{{ fChamberFill }}" opacity=".9" style="{{ fHeTrans }}"></rect>
                  <rect x="1183" y="{{ fGasoRodY }}" width="12" height="{{ fGasoRodH }}" fill="url(#f-metal)" opacity=".8" style="{{ fGasoPistonTrans }}"></rect>
                  <rect x="1140" y="{{ fGasoPistonY }}" width="98" height="13" fill="url(#f-metal)" stroke="#05080f" stroke-width="1.1" style="{{ fGasoPistonTrans }}"></rect>
                  <rect x="1140" y="{{ fGasoPistonY }}" width="98" height="3" fill="#eef4fb" opacity=".3" style="{{ fGasoPistonTrans }}"></rect>
                </g>
                <line x1="1152" y1="206" x2="1152" y2="436" stroke="#eef4fb" stroke-width="1.2" opacity=".28"></line>
                <g stroke="rgba(200,225,245,.35)" stroke-width="1"><line x1="1136" y1="256" x2="1148" y2="256"></line><line x1="1136" y1="316" x2="1148" y2="316"></line><line x1="1136" y1="376" x2="1148" y2="376"></line></g>
                <circle cx="1272" cy="232" r="17" fill="url(#f-metal)" stroke="#0a0e16" stroke-width="1.3"></circle>
                <circle cx="1272" cy="232" r="12" fill="#0c1626" stroke="#2a3852" stroke-width="1"></circle>
                <line x1="1272" y1="232" x2="{{ fChamberNeedleX }}" y2="{{ fChamberNeedleY }}" stroke="{{ fChamberNeedleColor }}" stroke-width="1.8" stroke-linecap="round" style="{{ fChamberNeedleTrans }}"></line>
                <circle cx="1272" cy="232" r="2.2" fill="#8fa3c2"></circle>
                <circle cx="1160" cy="468" r="7" fill="#0c1626" stroke="#8fa3c2" stroke-width="1.3"></circle>
                <g stroke="#8fa3c2" stroke-width="1.3" stroke-linecap="round"><line x1="1153" y1="468" x2="1167" y2="468"></line><line x1="1160" y1="461" x2="1160" y2="475"></line></g>
                <foreignObject x="1196" y="459" width="96" height="18"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:12px; font-weight:600; letter-spacing:1px; color:{{ fChamberLabelColor }};">{{ fChamberLabel }}</div></foreignObject>


                <!-- source / receiver frames -->
                <rect x="{{ fSrcRing.x }}" y="{{ fSrcRing.y }}" width="{{ fSrcRing.w }}" height="{{ fSrcRing.h }}" rx="8" fill="none" stroke="{{ fSrcRing.c }}" stroke-width="1.8" stroke-dasharray="6 4" style="{{ fSrcRing.st }}"></rect>
                <rect x="{{ fDstRing.x }}" y="{{ fDstRing.y }}" width="{{ fDstRing.w }}" height="{{ fDstRing.h }}" rx="8" fill="none" stroke="{{ fDstRing.c }}" stroke-width="1.8" stroke-dasharray="6 4" style="{{ fDstRing.st }}"></rect>
                <!-- transfer lane A : lit pipe (grows from the source), fluid core, particles, chevrons, leading front -->
                <path d="{{ fLaneA.d }}" fill="none" stroke="{{ fLaneA.col }}" stroke-width="{{ fLaneA.glowW }}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="{{ fLaneA.lit }}" style="{{ fLaneA.glowSt }}"></path>
                <path d="{{ fLaneA.d }}" fill="none" stroke="{{ fLaneA.col }}" stroke-width="{{ fLaneA.coreW }}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="{{ fLaneA.lit }}" style="{{ fLaneA.coreSt }}"></path>
                <circle cx="{{ fLaneA.p0.cx }}" cy="{{ fLaneA.p0.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p0.st }}"></circle>
                <circle cx="{{ fLaneA.p1.cx }}" cy="{{ fLaneA.p1.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p1.st }}"></circle>
                <circle cx="{{ fLaneA.p2.cx }}" cy="{{ fLaneA.p2.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p2.st }}"></circle>
                <circle cx="{{ fLaneA.p3.cx }}" cy="{{ fLaneA.p3.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p3.st }}"></circle>
                <circle cx="{{ fLaneA.p4.cx }}" cy="{{ fLaneA.p4.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p4.st }}"></circle>
                <circle cx="{{ fLaneA.p5.cx }}" cy="{{ fLaneA.p5.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p5.st }}"></circle>
                <circle cx="{{ fLaneA.p6.cx }}" cy="{{ fLaneA.p6.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p6.st }}"></circle>
                <circle cx="{{ fLaneA.p7.cx }}" cy="{{ fLaneA.p7.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p7.st }}"></circle>
                <circle cx="{{ fLaneA.p8.cx }}" cy="{{ fLaneA.p8.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p8.st }}"></circle>
                <circle cx="{{ fLaneA.p9.cx }}" cy="{{ fLaneA.p9.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p9.st }}"></circle>
                <circle cx="{{ fLaneA.p10.cx }}" cy="{{ fLaneA.p10.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p10.st }}"></circle>
                <circle cx="{{ fLaneA.p11.cx }}" cy="{{ fLaneA.p11.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p11.st }}"></circle>
                <circle cx="{{ fLaneA.p12.cx }}" cy="{{ fLaneA.p12.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p12.st }}"></circle>
                <circle cx="{{ fLaneA.p13.cx }}" cy="{{ fLaneA.p13.cy }}" r="{{ fLaneA.pr }}" fill="{{ fLaneA.pc }}" style="{{ fLaneA.p13.st }}"></circle>
                <path d="M-4 -4.5 L2 0 L-4 4.5" transform="{{ fLaneA.a0.tr }}" fill="none" stroke="#f4f8ff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="{{ fLaneA.a0.st }}"></path>
                <path d="M-4 -4.5 L2 0 L-4 4.5" transform="{{ fLaneA.a1.tr }}" fill="none" stroke="#f4f8ff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="{{ fLaneA.a1.st }}"></path>
                <path d="M-4 -4.5 L2 0 L-4 4.5" transform="{{ fLaneA.a2.tr }}" fill="none" stroke="#f4f8ff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="{{ fLaneA.a2.st }}"></path>
                <circle cx="{{ fLaneA.h.cx }}" cy="{{ fLaneA.h.cy }}" r="{{ fLaneA.h.r }}" fill="{{ fLaneA.col }}" stroke="#ffffff" stroke-width="1" style="{{ fLaneA.h.st }}"></circle>
                <!-- transfer lane B : lit pipe (grows from the source), fluid core, particles, chevrons, leading front -->
                <path d="{{ fLaneB.d }}" fill="none" stroke="{{ fLaneB.col }}" stroke-width="{{ fLaneB.glowW }}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="{{ fLaneB.lit }}" style="{{ fLaneB.glowSt }}"></path>
                <path d="{{ fLaneB.d }}" fill="none" stroke="{{ fLaneB.col }}" stroke-width="{{ fLaneB.coreW }}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="{{ fLaneB.lit }}" style="{{ fLaneB.coreSt }}"></path>
                <circle cx="{{ fLaneB.p0.cx }}" cy="{{ fLaneB.p0.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p0.st }}"></circle>
                <circle cx="{{ fLaneB.p1.cx }}" cy="{{ fLaneB.p1.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p1.st }}"></circle>
                <circle cx="{{ fLaneB.p2.cx }}" cy="{{ fLaneB.p2.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p2.st }}"></circle>
                <circle cx="{{ fLaneB.p3.cx }}" cy="{{ fLaneB.p3.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p3.st }}"></circle>
                <circle cx="{{ fLaneB.p4.cx }}" cy="{{ fLaneB.p4.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p4.st }}"></circle>
                <circle cx="{{ fLaneB.p5.cx }}" cy="{{ fLaneB.p5.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p5.st }}"></circle>
                <circle cx="{{ fLaneB.p6.cx }}" cy="{{ fLaneB.p6.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p6.st }}"></circle>
                <circle cx="{{ fLaneB.p7.cx }}" cy="{{ fLaneB.p7.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p7.st }}"></circle>
                <circle cx="{{ fLaneB.p8.cx }}" cy="{{ fLaneB.p8.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p8.st }}"></circle>
                <circle cx="{{ fLaneB.p9.cx }}" cy="{{ fLaneB.p9.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p9.st }}"></circle>
                <circle cx="{{ fLaneB.p10.cx }}" cy="{{ fLaneB.p10.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p10.st }}"></circle>
                <circle cx="{{ fLaneB.p11.cx }}" cy="{{ fLaneB.p11.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p11.st }}"></circle>
                <circle cx="{{ fLaneB.p12.cx }}" cy="{{ fLaneB.p12.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p12.st }}"></circle>
                <circle cx="{{ fLaneB.p13.cx }}" cy="{{ fLaneB.p13.cy }}" r="{{ fLaneB.pr }}" fill="{{ fLaneB.pc }}" style="{{ fLaneB.p13.st }}"></circle>
                <path d="M-4 -4.5 L2 0 L-4 4.5" transform="{{ fLaneB.a0.tr }}" fill="none" stroke="#f4f8ff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="{{ fLaneB.a0.st }}"></path>
                <path d="M-4 -4.5 L2 0 L-4 4.5" transform="{{ fLaneB.a1.tr }}" fill="none" stroke="#f4f8ff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="{{ fLaneB.a1.st }}"></path>
                <path d="M-4 -4.5 L2 0 L-4 4.5" transform="{{ fLaneB.a2.tr }}" fill="none" stroke="#f4f8ff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="{{ fLaneB.a2.st }}"></path>
                <circle cx="{{ fLaneB.h.cx }}" cy="{{ fLaneB.h.cy }}" r="{{ fLaneB.h.r }}" fill="{{ fLaneB.col }}" stroke="#ffffff" stroke-width="1" style="{{ fLaneB.h.st }}"></circle>
                <!-- (the Pump A outlet action now drives the cell's Pump A and Port R valves; activity ring at the Port R valve) -->
                <circle cx="624.7" cy="170" r="13" fill="none" stroke="#46d39a" stroke-width="1.6" style="{{ fVS.ring }}"></circle>
                <!-- gasometer valve (helium / gas line) -->
                <circle cx="1078" cy="215" r="11" fill="none" stroke="#46d39a" stroke-width="1.6" style="{{ fVG.ring }}"></circle>
                <circle cx="1078" cy="215" r="6.5" fill="#0c1626" stroke="{{ fVG.c }}" stroke-width="1.6"></circle>
                <g stroke="{{ fVG.c }}" stroke-width="1.5" stroke-linecap="round" transform="{{ fVG.tr }}"><line x1="1078" y1="208.5" x2="1078" y2="221.5"></line></g>

                <!-- ===== active-stage status panel : status bar above the Flash Unit (x 700-1010), clear of glass, balloon, tubing & cart ===== -->
                <sc-if value="{{ fVerOn }}" hint-placeholder-val="{{ false }}">
                <rect x="700" y="93" width="310" height="50" rx="7" fill="#0f1a2c" stroke="#46e0ff" stroke-width="1.4"></rect>
                <foreignObject x="700" y="98" width="310" height="21"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:14px; font-weight:600; letter-spacing:1px; color:#bfefff;">VERIFYING STABLE SAMPLE</div></foreignObject>
                <foreignObject x="700" y="119" width="310" height="19"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif;font-size:13px; color:#e8f1fb;">{{ fVerText }}</div></foreignObject>
                <rect x="712" y="139" width="{{ fVerBarW }}" height="2.5" rx="1.2" fill="#46e0ff" opacity=".85"></rect>
                </sc-if>
                <sc-if value="{{ fXOn }}" hint-placeholder-val="{{ false }}">
                <rect x="690" y="93" width="330" height="50" rx="7" fill="{{ fX.bg }}" stroke="{{ fX.bd }}" stroke-width="1.4"></rect>
                <foreignObject x="690" y="97" width="330" height="20"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px; font-weight:600; letter-spacing:.8px; color:{{ fX.tc }};">{{ fX.title }}</div></foreignObject>
                <foreignObject x="690" y="116" width="330" height="18"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif;font-size:12px; color:#e8f1fb;">{{ fX.detail }}</div></foreignObject>
                <rect x="703" y="137" width="58" height="2.6" rx="1.3" style="{{ fXSeg0 }}"></rect>
                <rect x="765" y="137" width="58" height="2.6" rx="1.3" style="{{ fXSeg1 }}"></rect>
                <rect x="827" y="137" width="58" height="2.6" rx="1.3" style="{{ fXSeg2 }}"></rect>
                <rect x="889" y="137" width="58" height="2.6" rx="1.3" style="{{ fXSeg3 }}"></rect>
                <rect x="951" y="137" width="58" height="2.6" rx="1.3" style="{{ fXSeg4 }}"></rect>
                </sc-if>
                <sc-if value="{{ fNoteCollectOG }}" hint-placeholder-val="{{ false }}">
                <rect x="700" y="93" width="310" height="50" rx="7" fill="#0e2019" stroke="#46d39a" stroke-width="1.4"></rect>
                <foreignObject x="700" y="98" width="310" height="21"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:14px; font-weight:600; letter-spacing:1px; color:#46d39a;">OIL &amp; GAS COLLECTED</div></foreignObject>
                <foreignObject x="700" y="119" width="310" height="19"><div style="margin:0; display:flex; align-items:center; justify-content:center; height:100%; white-space:nowrap; line-height:1.1; font-family:'IBM Plex Sans',sans-serif;font-size:13px; color:#cfe6dc;">40 g oil · 14.5 psi balloon</div></foreignObject>
                </sc-if>
                </svg>
            </div>

            <!-- horizontal step tracker -->
            <div style="display:flex; align-items:center; gap:0; margin-top:5px; padding:4px 10px; background:var(--icard); border:1px solid var(--line); border-radius:10px; flex-wrap:wrap;">
              <sc-for list="{{ fSteps }}" as="st" hint-placeholder-count="5">
                <div style="display:flex; align-items:center; gap:6px; flex:1 1 105px; min-width:0;">
                  <span style="{{ st.chip }}">{{ st.num }}</span>
                  <span style="font-size:11px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:{{ st.color }};">{{ st.label }}</span>
                  <span style="{{ st.connector }}"></span>
                </div>
              </sc-for>
            </div>

            <!-- actions -->
            <div style="display:flex; align-items:center; gap:8px; margin-top:6px; flex-wrap:wrap; flex:0 0 auto;">
              <div class="pc-host" data-pc="Main:flash" data-pc-layout="bar" style="flex:1 1 auto;"></div>
              <button class="ui-btn ui-btn-ghost act" onclick="{{ chargeRestart }}">← Back to Charging</button>
              <button class="act" onclick="{{ goPvTest }}" style="font-family:inherit; font-size:11px; font-weight:600; white-space:nowrap; padding:8px 16px; border-radius:8px; cursor:pointer; background:{{ pvBtnBgAct }}; border:1px solid {{ pvBtnBorderAct }}; color:{{ pvBtnColorAct }};" style-hover="background:rgba(70,211,154,.18);">Start PV Test</button>
            </div>
          </div>
          </sc-if>
        </div>
      </div>
    </div>
    </sc-if>`);
