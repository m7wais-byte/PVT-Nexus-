/* screen: showXfer  (21.4 KB) */
/* Sample Transfer support stand: rod left, fork ledge under the lower cap, clamp on the barrel (bottle centre 300, 300, scale 0.55) */
var MX_STAND = BottleArt.stand('mx', { x: 300, rodX: 204, ground: 512, top: 196, clamps: [{ y: 268, h: 19 }], rest: { y: 438, h: 22 }, baseL: 168, baseR: 346 });
/* Source SPMC chamber: sample inlet tip at the transfer line (410, 92); end connection (nitrogen end) on the right */
var MX_SPMC = { x: 605.6, y: 92, s: 0.6, rot: -90 };
var MX_SPMC_END = MRDraw.toPage(MX_SPMC, 0, MRDraw.G.headO + 20);            // (792.8, 92) end-connection tip
var MX_SPMC_CTX = 'SPMC chamber · source of the sample in this transfer';
var MX_DRIVE_D = 'M846 404 V' + MX_SPMC_END[1] + ' H' + MX_SPMC_END[0];        // pump outlet -> SPMC end connection (length 365.2)
DC.slot('showXfer', `<sc-if value="{{ showXfer }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Module 01b — Bottom Hole Sample Transfer" class="pg pg-stack">

      <!-- compact page header (shared .pg-head) -->
      <div class="pg-head">
        <div class="pg-titles">
          <span class="pg-eyebrow">Validation</span>
          <h2 class="pg-title">Bottom Hole Sample Transfer</h2>
          <span style="align-self:center; flex:0 0 auto; display:inline-flex; align-items:center; gap:7px; font-family:'IBM Plex Mono'; font-size:11px; color:{{ mxLiveColor }};"><span style="width:7px; height:7px; border-radius:50%; background:{{ mxLiveColor }}; box-shadow:0 0 8px {{ mxLiveColor }};"></span>{{ mxLiveLabel }}</span>
          <p class="pg-desc">SPMC chamber (from the MDT MRMS) → SPS/PDS bottle, before laboratory QC.</p>
        </div>
        <div class="pg-end"><button type="button" class="bd-btn" data-spmc-open="" data-spmc-ctx="${MX_SPMC_CTX}">SPMC Details</button><button type="button" class="bd-btn bd-inline" data-bd-open="oil" data-bd-ctx="SPS/PDS receiving bottle">Bottle Details</button></div>
      </div>

      <div class="lab-body">

        <div class="lab-schem vl-sim">
          <div style="flex:1 1 auto; min-height:0; display:flex; align-items:center; justify-content:center; overflow:hidden;">
          <svg sc-camel-view-box="0 0 900 545" sc-camel-preserve-aspect-ratio="xMidYMid meet" style="display:block; width:100%; height:100%; min-height:0;">
            <defs>
              <linearGradient id="mxMetal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"></stop><stop offset=".15" stop-color="#6377a0"></stop><stop offset=".42" stop-color="#b3c1d8"></stop><stop offset=".58" stop-color="#7e90b0"></stop><stop offset=".8" stop-color="#41506e"></stop><stop offset="1" stop-color="#1f2a3e"></stop></linearGradient>
              <linearGradient id="mxCyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>
              <linearGradient id="mxCylH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>
              <linearGradient id="mxPipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e82a4"></stop><stop offset=".4" stop-color="#9cb0cd"></stop><stop offset=".55" stop-color="#41526c"></stop><stop offset="1" stop-color="#232f44"></stop></linearGradient>
              <linearGradient id="mxSample" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7b15a"></stop><stop offset="1" stop-color="#c07f2e"></stop></linearGradient>
              <linearGradient id="mxWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa6d8"></stop><stop offset="1" stop-color="#2f6f9c"></stop></linearGradient>
              <radialGradient id="mxGauge" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#13202f"></stop><stop offset="1" stop-color="#0a1018"></stop></radialGradient>
              ${BottleArt.defs('mx')}
              ${BottleArt.tpl(MRDraw.defs('mxs'))}
            </defs>

            <line x1="0" y1="512" x2="900" y2="512" stroke="#46566f" stroke-width="1.5"></line>
            <rect x="0" y="512" width="900" height="33" fill="rgba(120,150,185,.04)"></rect>

            <!-- ===== PUMP LINE: TRANSFER PUMP -> SPMC END CONNECTION =====
                 drive fluid enters behind the nitrogen piston only; it never reaches the sample line -->
            <path d="${MX_DRIVE_D}" fill="none" stroke="#0a0e16" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="${MX_DRIVE_D}" fill="none" stroke="url(#mxPipe)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
            <!-- drive line is primed (static); the active flow starts at the pump outlet and travels up to the drive port -->
            <path d="${MX_DRIVE_D}" fill="none" stroke="#2f6f9c" stroke-width="2.6" stroke-linejoin="round" opacity=".5"></path>
            <path d="${MX_DRIVE_D}" fill="none" stroke="#5aa6d8" stroke-width="2.8" stroke-linejoin="round" stroke-dasharray="370 370" style="{{ mxPumpFrontStyle }}"></path>
            <mask id="mxPumpMask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="900" height="545"><path d="${MX_DRIVE_D}" fill="none" stroke="#ffffff" stroke-width="10" stroke-linejoin="round" stroke-dasharray="370 370" style="{{ mxPumpFrontStyle }}"></path></mask>
            <path d="${MX_DRIVE_D}" fill="none" stroke="#d6eeff" stroke-width="2.2" stroke-dasharray="6 16" stroke-linecap="round" stroke-linejoin="round" mask="url(#mxPumpMask)" style="{{ mxPumpPulseStyle }}"><animate sc-camel-attribute-name="stroke-dashoffset" values="0;-22" dur="0.22s" sc-camel-repeat-count="indefinite"></animate></path>
            <polygon points="846,236 840,250 852,250" fill="#5fb0ff" style="{{ mxArrowPumpStyle }}"></polygon>
            <text x="858" y="270" font-family="IBM Plex Mono" font-size="10" letter-spacing="1" fill="var(--cap2)" transform="rotate(90 858 270)">DRIVE FLUID</text>

            <!-- ===== TRANSFER PUMP ===== -->
            <ellipse cx="846" cy="512" rx="52" ry="6" fill="rgba(0,0,0,.35)"></ellipse>
            <rect x="804" y="404" width="84" height="96" rx="7" fill="url(#mxCyl)" stroke="#0a0e16" stroke-width="1.1"></rect>
            <rect x="794" y="500" width="104" height="12" rx="4" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="1"></rect>
            <circle cx="846" cy="444" r="19" fill="url(#mxGauge)" stroke="#0a0e16" stroke-width="1.4"></circle>
            <circle cx="846" cy="444" r="15" fill="none" stroke="rgba(174,188,207,.45)" stroke-width="1"></circle>
            <line x1="846" y1="444" x2="856" y2="434" stroke="#e7b15a" stroke-width="1.6" stroke-linecap="round"></line>
            <circle cx="822" cy="418" r="3.6" fill="{{ mxLed }}" style="{{ mxLedStyle }}"></circle>
            <text x="846" y="534" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--hdb)">TRANSFER PUMP</text>

            <!-- ===== HEATING JACKET (around the SPMC body) ===== -->
            <g style="{{ mxJacketStyle }}">
              <rect x="440" y="54" width="320" height="76" rx="19" fill="none" stroke="#e7752e" stroke-width="6" style="{{ mxJacketGlowStyle }}"></rect>
              <rect x="444" y="58" width="312" height="68" rx="16" fill="rgba(231,117,46,.09)" stroke="#e7752e" stroke-width="1.8"></rect>
              <clipPath id="mxJckC"><rect x="445" y="59" width="310" height="66" rx="15"></rect></clipPath>
              <g clip-path="url(#mxJckC)"><rect x="445" y="59" width="310" height="66" fill="#e7752e" opacity="0.3" style="{{ mxJacketFillStyle }}"></rect></g>
              <g stroke="rgba(231,117,46,.4)" stroke-width="1">
                <line x1="470" y1="58" x2="470" y2="126"></line><line x1="530" y1="58" x2="530" y2="126"></line>
                <line x1="590" y1="58" x2="590" y2="126"></line><line x1="650" y1="58" x2="650" y2="126"></line>
                <line x1="710" y1="58" x2="710" y2="126"></line>
              </g>
              <rect x="438" y="52" width="12" height="80" rx="4" fill="rgba(231,117,46,.55)" stroke="#a3521c" stroke-width="0.8"></rect>
              <rect x="750" y="52" width="12" height="80" rx="4" fill="rgba(231,117,46,.55)" stroke="#a3521c" stroke-width="0.8"></rect>
              <text x="600" y="46" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" letter-spacing="1" fill="var(--amb)">HEATING JACKET · {{ mxTempBoxText }}</text>
            </g>

            <!-- ===== TRANSFER PRESSURE CALLOUT ===== -->
            <g>
              <rect x="495" y="6" width="210" height="26" rx="7" fill="rgba(8,14,24,.94)" stroke="rgba(150,190,240,.4)" stroke-width="1"></rect>
              <text x="600" y="23" text-anchor="middle" font-family="IBM Plex Mono" font-size="10.5" font-weight="600" letter-spacing=".3" fill="var(--accb3)">Transfer Pressure — 5,000 psi</text>
            </g>

            <!-- ===== SOURCE: ONE SPMC CHAMBER, removed from the MRMS (equipment/mrms-draw.js MRDraw.xfer) =====
                 Horizontal, sample inlet on the left (to the transfer line), nitrogen end on the right (plugged).
                 Fluids stay separated by the pistons: sample | sample piston | compensating fluid (buffer) |
                 nitrogen piston | drive fluid. The pump connects at the end connection (MX_SPMC_END) and pushes the
                 piston train, so only the sample leaves through the inlet. Clicking the chamber opens SPMC Details. -->
            ${MRDraw.xfer('mxs', Object.assign({ attrs: ' class="sd-hit" data-spmc-open="" data-spmc-ctx="' + MX_SPMC_CTX + '" role="button" tabindex="0" aria-label="SPMC Details"',
              live: { res: '{{ mxSpResStyle }}', piston: '{{ mxSpPistonStyle }}', drive: '{{ mxSpDriveStyle }}', inlet: '{{ mxSpInletStyle }}',
                      isoOpen: '{{ mxSpIsoStyle }}', port: '{{ mxSpPortStyle }}' } }, MX_SPMC))}
            <g font-family="IBM Plex Sans" font-size="8.5" font-weight="700" letter-spacing=".5" pointer-events="none">
              <text x="530" y="95" text-anchor="middle" fill="#2a1a06" style="{{ mxSampleLabelStyle }}">SAMPLE</text>
              <text x="637" y="94.6" text-anchor="middle" font-size="7.4" fill="#1d1640" style="{{ mxBufferLabelStyle }}">BUFFER</text>
              <text x="706" y="95" text-anchor="middle" fill="#07202e">DRIVE</text>
            </g>
            <text x="520" y="148" text-anchor="middle" font-family="IBM Plex Sans" font-size="13" font-weight="600" letter-spacing=".4" fill="var(--lbl)">SPMC Chamber</text>
            <text x="520" y="163" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="var(--mut)">from the MRMS · source</text>
            <g class="sd-pill" data-spmc-open="" data-spmc-ctx="${MX_SPMC_CTX}" role="button" tabindex="0" aria-label="SPMC Details" transform="translate(652 137)">
              <rect x="0" y="0" width="104" height="22" rx="11"></rect>
              <circle cx="12" cy="11" r="5.2" fill="none" stroke-width="1.4"></circle><path d="M12 9.6 V14 M12 7.6 V7.7" stroke-width="1.5" stroke-linecap="round" fill="none"></path>
              <text x="59" y="15" text-anchor="middle">SPMC Details</text>
            </g>

            <!-- ===== TRANSFER LINE: SPMC SAMPLE INLET -> SIDE PORT OF THE BOTTLE SAMPLE VALVE (approved right-angle valve) ===== -->
            <path d="M410 92 H346 V145.5 H326.4" fill="none" stroke="#0a0e16" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M410 92 H346 V145.5 H326.4" fill="none" stroke="url(#mxPipe)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
            <!-- sample front: starts at the SPMC sample inlet, travels through the line and line valve to the bottle sample valve -->
            <path d="M410 92 H346 V145.5 H326.4" fill="none" stroke="#e7b15a" stroke-width="2.8" stroke-linejoin="round" stroke-dasharray="138 138" style="{{ mxXferFrontStyle }}"></path>
            <mask id="mxXferMask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="900" height="545"><path d="M410 92 H346 V145.5 H326.4" fill="none" stroke="#ffffff" stroke-width="10" stroke-linejoin="round" stroke-dasharray="138 138" style="{{ mxXferFrontStyle }}"></path></mask>
            <path d="M410 92 H346 V145.5 H326.4" fill="none" stroke="#fff1cf" stroke-width="2.2" stroke-dasharray="6 16" stroke-linecap="round" stroke-linejoin="round" mask="url(#mxXferMask)" style="{{ mxXferPulseStyle }}"><animate sc-camel-attribute-name="stroke-dashoffset" values="0;-22" dur="0.26s" sc-camel-repeat-count="indefinite"></animate></path>
            <polygon points="372,92 384,86 384,98" fill="#e7b15a" style="{{ mxArrowX1Style }}"></polygon>
            <polygon points="346,141 340,131 352,131" fill="#e7b15a" style="{{ mxArrowX2Style }}"></polygon>
            <!-- transfer-line pressure gauge on a tee above the line (indicator only, no flow control) -->
            <rect x="389.4" y="70" width="5.2" height="22" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width=".8"></rect>
            <rect x="386" y="86" width="12" height="9" rx="1.5" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width=".9"></rect>
            <circle cx="392" cy="58" r="13" fill="url(#mxGauge)" stroke="#0a0e16" stroke-width="1.4"></circle>
            <circle cx="392" cy="58" r="10" fill="none" stroke="rgba(174,188,207,.45)" stroke-width="1"></circle>
            <g stroke="rgba(174,188,207,.7)" stroke-width="1"><line x1="384.9" y1="65.1" x2="386.3" y2="63.7"></line><line x1="392" y1="48" x2="392" y2="50"></line><line x1="399.1" y1="65.1" x2="397.7" y2="63.7"></line></g>
            <line x1="392" y1="58" x2="392" y2="49.5" stroke="#e7b15a" stroke-width="1.6" stroke-linecap="round" style="{{ mxLineGaugeStyle }}"></line>
            <circle cx="392" cy="58" r="1.8" fill="#e7b15a"></circle>
            <text x="374" y="54" text-anchor="end" font-family="IBM Plex Mono" font-size="8.5" letter-spacing=".6" fill="var(--cap2)">LINE PRESSURE</text>
            <text x="374" y="67" text-anchor="end" font-family="IBM Plex Mono" font-size="10.5" font-weight="600" fill="var(--accb3)">{{ mxLinePText }}</text>
            <text x="391" y="107" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" letter-spacing=".5" fill="var(--cap2)">TRANSFER LINE</text>

            <!-- ===== SPS/PDS BOTTLE = approved Oil Sample Bottle, upright: sample side up, driving (water) side down =====
                 centre (300, 300), scale 0.55, valves face right; Main.js fills / piston are in the bottle's bore units.
                 Support stand (BottleArt.stand): lower cap rests on a fork ledge, one clamp on the barrel. -->
            ${MX_STAND.back}
            ${BottleArt.oil('mx', { x: 300, y: 300, s: 0.55, bd: 'oil', ctx: 'SPS/PDS sample bottle · receiving the transferred sample',
              sample: '{{ mxBotFluidStyle }}', drive: '{{ mxBotWaterStyle }}', piston: '{{ mxBotPistonStyle }}',
              ringT: '{{ mxValveRing }}', needleT: '{{ mxBotNeedleT }}', ringB: '{{ mxValveRing }}', needleB: '{{ mxBotNeedleT }}' })}
            ${MX_STAND.front}
            <text x="186" y="300" text-anchor="end" font-family="IBM Plex Sans" font-size="13" font-weight="600" letter-spacing=".4" fill="var(--lbl)">SPS/PDS</text>
            <text x="186" y="316" text-anchor="end" font-family="IBM Plex Mono" font-size="10" fill="var(--mut)">~800 cc</text>

            <!-- displaced water out of the driving-side valve side port (326.4, 454.5) to the receiver -->
            <path d="M326.4 454.5 H396 V470" fill="none" stroke="#0a0e16" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M326.4 454.5 H396 V470" fill="none" stroke="url(#mxPipe)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"></path>
            <!-- displaced water front: starts at the bottle water port, travels the lower line to the receiver -->
            <path d="M326.4 454.5 H396 V470" fill="none" stroke="#5aa6d8" stroke-width="2.4" stroke-linejoin="round" stroke-dasharray="85.1 85.1" style="{{ mxWoutFrontStyle }}"></path>
            <mask id="mxWoutMask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="900" height="545"><path d="M326.4 454.5 H396 V470" fill="none" stroke="#ffffff" stroke-width="9" stroke-linejoin="round" stroke-dasharray="85.1 85.1" style="{{ mxWoutFrontStyle }}"></path></mask>
            <path d="M326.4 454.5 H396 V470" fill="none" stroke="#d6eeff" stroke-width="1.8" stroke-dasharray="5 13" stroke-linecap="round" stroke-linejoin="round" mask="url(#mxWoutMask)" style="{{ mxWoutPulseStyle }}"><animate sc-camel-attribute-name="stroke-dashoffset" values="0;-18" dur="0.26s" sc-camel-repeat-count="indefinite"></animate></path>
            <polygon points="352,454.5 342,449.5 342,459.5" fill="#5aa6d8" style="{{ mxArrowWStyle }}"></polygon>
            <circle cx="372" cy="454.5" r="12" fill="url(#mxGauge)" stroke="#0a0e16" stroke-width="1.2"></circle>
            <circle cx="372" cy="454.5" r="8.6" fill="none" stroke="rgba(174,188,207,.45)" stroke-width="0.9"></circle>
            <line x1="372" y1="454.5" x2="378" y2="448.5" stroke="#8fd0ff" stroke-width="1.3" stroke-linecap="round"></line>
            <rect x="380" y="472" width="32" height="40" rx="3" fill="rgba(180,210,240,.06)" stroke="rgba(174,188,207,.5)" stroke-width="1"></rect>
            <rect x="382" y="474" width="28" height="36" fill="url(#mxWater)" opacity=".85" style="{{ mxBeakerStyle }}"></rect>
            <g stroke="rgba(220,235,250,.4)" stroke-width="0.8"><line x1="380" y1="482" x2="388" y2="482"></line><line x1="380" y1="492" x2="388" y2="492"></line><line x1="380" y1="502" x2="388" y2="502"></line></g>
            <text x="396" y="534" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" letter-spacing=".6" fill="var(--mut)">DISPLACED WATER</text>

            <!-- ===== CALLOUTS ===== -->
            <g font-family="IBM Plex Sans">
              <line x1="309" y1="150" x2="420" y2="214" stroke="rgba(231,177,90,.45)" stroke-width="1"></line>
              <circle cx="422" cy="214" r="2.6" fill="#e7b15a"></circle>
              <text x="430" y="218" font-size="12" font-weight="600" letter-spacing=".3" fill="var(--lbl)">Sample valve</text>
              <text x="430" y="231" font-family="IBM Plex Mono" font-size="9.5" fill="var(--mut)">right-angle · sample in</text>
              <line x1="309" y1="452" x2="420" y2="414" stroke="rgba(90,166,216,.45)" stroke-width="1"></line>
              <circle cx="422" cy="414" r="2.6" fill="#5aa6d8"></circle>
              <text x="430" y="418" font-size="12" font-weight="600" letter-spacing=".3" fill="var(--accb4)">Driving-fluid valve</text>
              <text x="430" y="431" font-family="IBM Plex Mono" font-size="9.5" fill="var(--mut)">water out to the receiver</text>
            </g>
          </svg>
          </div>
          <div style="display:flex; align-items:center; gap:9px; margin-top:6px; padding:9px 12px; border-radius:10px; background:var(--icard); border:1px solid var(--line2);">
            <span style="width:7px; height:7px; border-radius:50%; flex:0 0 auto; background:{{ mxLiveColor }};"></span>
            <span style="font-size:12px; color:var(--chipt); line-height:1.4; text-wrap:pretty;">{{ mxStatusText }}</span>
          </div>
        </div>

        <div class="lab-side">
          <div class="vl-scroll">

          <div style="flex:0 0 auto; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:11px 13px; display:flex; flex-direction:column; gap:9px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:22px; height:22px; border-radius:7px; background:rgba(77,157,255,.14); color:var(--blue); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="5" rx="1.5" stroke="currentColor" stroke-width="1.8"></rect><path d="M9 6v3.5L6 15a3 3 0 0 0 2.6 4.5h6.8A3 3 0 0 0 18 15l-3-5.5V6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path></svg></span>
              <span style="font-size:13px; font-weight:600; color:var(--txt); flex:1;">Sample Under Test</span>
              <span style="font-family:'IBM Plex Mono'; font-size:9px; letter-spacing:.8px; color:var(--mut); background:var(--icard); border:1px solid var(--line2); border-radius:5px; padding:3px 7px; white-space:nowrap; flex:0 0 auto;">{{ mxSampleId }}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="width:7px; height:7px; border-radius:50%; flex:0 0 auto; background:{{ mxLiveColor }};"></span>
              <span style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:1px; color:var(--mut);">LIVE DATA</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:7px;">
              <sc-for list="{{ mxRows }}" as="card" hint-placeholder-count="4">
              <div style="background:var(--icard); border:1px solid var(--line2); border-radius:8px; padding:7px 10px; min-width:0;">
                <div style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.7px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ card.l }}</div>
                <div style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; margin-top:2px; white-space:nowrap; color:{{ card.c }};">{{ card.v }} <span style="font-size:9px; color:var(--mut);">{{ card.u }}</span></div>
              </div>
              </sc-for>
            </div>
          </div>

          </div>

          <!-- shared Validation procedure dock (theme.css .vl-dock) -->
          <div class="vl-dock">
            <div class="pc-host" data-pc="Main:xfer" data-pc-layout="side"></div>
            <div class="vl-fwd"><button onclick="{{ mxNext }}" style="{{ mxNextStyle }}">Continue to Validation →</button></div>
          </div>
        </div>
      </div>
    </div>
    </sc-if>`);
