/* screen: showXfer  (21.4 KB) */
DC.slot('showXfer', `<sc-if value="{{ showXfer }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Module 01b — Bottom Hole Sample Transfer" class="pg pg-stack">

      <!-- compact page header (shared .pg-head) -->
      <div class="pg-head">
        <div class="pg-titles">
          <span class="pg-eyebrow">Validation</span>
          <h2 class="pg-title">Bottom Hole Sample Transfer</h2>
          <span style="align-self:center; flex:0 0 auto; display:inline-flex; align-items:center; gap:7px; font-family:'IBM Plex Mono'; font-size:11px; color:{{ mxLiveColor }};"><span style="width:7px; height:7px; border-radius:50%; background:{{ mxLiveColor }}; box-shadow:0 0 8px {{ mxLiveColor }};"></span>{{ mxLiveLabel }}</span>
          <p class="pg-desc">MDT / MPSR tool → SPS/PDS bottle, before laboratory QC.</p>
        </div>
      </div>

      <div class="lab-body">

        <div class="lab-schem" style="background:radial-gradient(120% 90% at 50% 0%,#0c1526,#070c16); border:1px solid var(--line); border-radius:16px; padding:12px 14px; display:flex; flex-direction:column; min-width:0; min-height:0; overflow:hidden; position:relative; background-image:linear-gradient(rgba(150,175,210,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(150,175,210,.035) 1px,transparent 1px); background-size:34px 34px;">
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
            </defs>

            <line x1="0" y1="512" x2="900" y2="512" stroke="#46566f" stroke-width="1.5"></line>
            <rect x="0" y="512" width="900" height="33" fill="rgba(120,150,185,.04)"></rect>

            <!-- ===== PUMP LINE: TRANSFER PUMP -> MPSR WATER SIDE ===== -->
            <path d="M790 92 H846 V404" fill="none" stroke="#0a0e16" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M790 92 H846 V404" fill="none" stroke="url(#mxPipe)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
            <!-- drive line is primed with water (static); the active flow starts at the pump outlet and travels up to the MPSR -->
            <path d="M846 404 V92 H790" fill="none" stroke="#2f6f9c" stroke-width="2.6" stroke-linejoin="round" opacity=".5"></path>
            <path d="M846 404 V92 H790" fill="none" stroke="#5aa6d8" stroke-width="2.8" stroke-linejoin="round" stroke-dasharray="372 372" style="{{ mxPumpFrontStyle }}"></path>
            <mask id="mxPumpMask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="900" height="545"><path d="M846 404 V92 H790" fill="none" stroke="#ffffff" stroke-width="10" stroke-linejoin="round" stroke-dasharray="372 372" style="{{ mxPumpFrontStyle }}"></path></mask>
            <path d="M846 404 V92 H790" fill="none" stroke="#d6eeff" stroke-width="2.2" stroke-dasharray="6 16" stroke-linecap="round" stroke-linejoin="round" mask="url(#mxPumpMask)" style="{{ mxPumpPulseStyle }}"><animate sc-camel-attribute-name="stroke-dashoffset" values="0;-22" dur="0.22s" sc-camel-repeat-count="indefinite"></animate></path>
            <polygon points="846,236 840,250 852,250" fill="#5fb0ff" style="{{ mxArrowPumpStyle }}"></polygon>
            <text x="858" y="300" font-family="IBM Plex Mono" font-size="10" letter-spacing="1" fill="var(--cap2)" transform="rotate(90 858 300)">WATER-SIDE DRIVE</text>

            <!-- ===== TRANSFER PUMP ===== -->
            <ellipse cx="846" cy="512" rx="52" ry="6" fill="rgba(0,0,0,.35)"></ellipse>
            <rect x="804" y="404" width="84" height="96" rx="7" fill="url(#mxCyl)" stroke="#0a0e16" stroke-width="1.1"></rect>
            <rect x="794" y="500" width="104" height="12" rx="4" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="1"></rect>
            <circle cx="846" cy="444" r="19" fill="url(#mxGauge)" stroke="#0a0e16" stroke-width="1.4"></circle>
            <circle cx="846" cy="444" r="15" fill="none" stroke="rgba(174,188,207,.45)" stroke-width="1"></circle>
            <line x1="846" y1="444" x2="856" y2="434" stroke="#e7b15a" stroke-width="1.6" stroke-linecap="round"></line>
            <circle cx="822" cy="418" r="3.6" fill="{{ mxLed }}" style="{{ mxLedStyle }}"></circle>
            <text x="846" y="534" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--hdb)">TRANSFER PUMP</text>

            <!-- ===== MPSR HEATING JACKET ===== -->
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

            <!-- ===== MPSR TOOL (HORIZONTAL) ===== -->
            <path d="M440 69 C 424 72, 414 82, 410 92 C 414 102, 424 112, 440 115 Z" fill="url(#mxCylH)" stroke="#0a0e16" stroke-width="1"></path>
            <path d="M760 69 C 776 72, 786 82, 790 92 C 786 102, 776 112, 760 115 Z" fill="url(#mxCylH)" stroke="#0a0e16" stroke-width="1"></path>
            <rect x="440" y="69" width="320" height="46" rx="3" fill="url(#mxCylH)" stroke="#0a0e16" stroke-width="1.1"></rect>
            <rect x="446" y="73" width="308" height="38" rx="2" fill="#0b1220"></rect>
            <clipPath id="mxMpsrClip"><rect x="446" y="73" width="308" height="38"></rect></clipPath>
            <g clip-path="url(#mxMpsrClip)">
              <rect x="446" y="73" width="308" height="38" fill="url(#mxSample)" style="{{ mxMpsrFluidStyle }}"></rect>
              <rect x="446" y="73" width="308" height="38" fill="url(#mxWater)" style="{{ mxMpsrWaterStyle }}"></rect>
            </g>
            <g style="{{ mxMpsrPistonStyle }}">
              <rect x="746" y="66" width="9" height="52" rx="1.5" fill="url(#mxMetal)" stroke="#05080f" stroke-width="1"></rect>
              <rect x="749.4" y="66" width="2" height="52" fill="#eef4fb" opacity=".4"></rect>
            </g>
            <rect x="450" y="76" width="300" height="3.5" rx="1.5" fill="#ffffff" opacity="0.13"></rect>
            <rect x="446" y="73" width="308" height="38" rx="2" fill="none" stroke="rgba(150,175,210,.4)" stroke-width="0.9"></rect>
            <text x="490" y="96" font-family="IBM Plex Sans" font-size="10.5" font-weight="600" letter-spacing=".4" fill="#2a1a06" style="{{ mxSampleLabelStyle }}">SAMPLE</text>
            <text x="700" y="96" text-anchor="end" font-family="IBM Plex Sans" font-size="10.5" font-weight="600" letter-spacing=".4" fill="#07202e" style="{{ mxWaterLabelStyle }}">WATER</text>
            <text x="600" y="140" text-anchor="middle" font-family="IBM Plex Sans" font-size="13" font-weight="600" letter-spacing=".4" fill="var(--lbl)">MPSR · Floating Piston</text>
            <text x="600" y="156" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="var(--mut)">~450 cc</text>

            <!-- ===== TRANSFER LINE: MPSR FLUID SIDE -> BOTTLE TOP VALVE ===== -->
            <path d="M410 92 H300 V150" fill="none" stroke="#0a0e16" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M410 92 H300 V150" fill="none" stroke="url(#mxPipe)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
            <!-- sample front: starts at the MPSR outlet, travels through the line and valve into the bottle top -->
            <path d="M410 92 H300 V150" fill="none" stroke="#e7b15a" stroke-width="2.8" stroke-linejoin="round" stroke-dasharray="172 172" style="{{ mxXferFrontStyle }}"></path>
            <mask id="mxXferMask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="900" height="545"><path d="M410 92 H300 V150" fill="none" stroke="#ffffff" stroke-width="10" stroke-linejoin="round" stroke-dasharray="172 172" style="{{ mxXferFrontStyle }}"></path></mask>
            <path d="M410 92 H300 V150" fill="none" stroke="#fff1cf" stroke-width="2.2" stroke-dasharray="6 16" stroke-linecap="round" stroke-linejoin="round" mask="url(#mxXferMask)" style="{{ mxXferPulseStyle }}"><animate sc-camel-attribute-name="stroke-dashoffset" values="0;-22" dur="0.26s" sc-camel-repeat-count="indefinite"></animate></path>
            <polygon points="352,92 364,86 364,98" fill="#e7b15a" style="{{ mxArrowX1Style }}"></polygon>
            <polygon points="300,140 294,128 306,128" fill="#e7b15a" style="{{ mxArrowX2Style }}"></polygon>
            <rect x="288" y="118" width="24" height="16" rx="3" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="1"></rect>
            <circle cx="300" cy="108" r="9" fill="#0c1626" stroke="{{ mxValveRing }}" stroke-width="2.2" style="transition:stroke .3s ease;"></circle>
            <line x1="292.5" y1="108" x2="307.5" y2="108" stroke="#9fb6d6" stroke-width="1.8" stroke-linecap="round" style="{{ mxValveHandleStyle }}"></line>
            <text x="318" y="114" font-family="IBM Plex Mono" font-size="9.5" letter-spacing=".5" fill="var(--cap2)">{{ mxValveText }}</text>
            <text x="356" y="72" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" letter-spacing="1" fill="var(--cap2)">TRANSFER LINE</text>

            <!-- ===== SPS/PDS BOTTLE (VERTICAL) ===== -->
            <rect x="292" y="144" width="16" height="14" rx="2" fill="url(#mxPipe)" stroke="#0a0e16" stroke-width="0.8"></rect>
            <rect x="276" y="152" width="48" height="11" rx="3" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="0.9"></rect>
            <ellipse cx="300" cy="512" rx="66" ry="6" fill="rgba(0,0,0,.35)"></ellipse>
            <rect x="254" y="472" width="9" height="34" fill="url(#mxPipe)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <rect x="337" y="472" width="9" height="34" fill="url(#mxPipe)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <rect x="236" y="500" width="128" height="12" rx="4" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="1"></rect>
            <rect x="250" y="162" width="100" height="310" rx="16" fill="url(#mxCyl)" stroke="#0a0e16" stroke-width="1.2"></rect>
            <rect x="258" y="174" width="84" height="252" rx="3" fill="#0b1220"></rect>
            <g clip-path="url(#mxBotBoreF)">
              <rect x="258" y="174" width="84" height="252" fill="url(#mxSample)" style="{{ mxBotFluidStyle }}"></rect>
              <rect x="258" y="174" width="84" height="252" fill="url(#mxWater)" style="{{ mxBotWaterStyle }}"></rect>
            </g>
            <clipPath id="mxBotBoreF"><rect x="258" y="174" width="84" height="252" rx="3"></rect></clipPath>
            <rect x="262" y="178" width="5" height="244" rx="2.5" fill="#ffffff" opacity="0.13"></rect>
            <!-- floating piston: rides the sample/water interface, clipped to the bore so it never crosses the wall -->
            <clipPath id="mxBotBore"><rect x="258" y="174" width="84" height="252" rx="3"></rect></clipPath>
            <g clip-path="url(#mxBotBore)">
              <g style="{{ mxBotPistonStyle }}">
                <rect x="258" y="174" width="84" height="14" rx="1.5" fill="url(#mxCylH)" stroke="#0a0e16" stroke-width="0.9"></rect>
                <rect x="258" y="176.4" width="84" height="1.6" fill="#eef4fb" opacity=".45"></rect>
                <rect x="258" y="179.6" width="84" height="1.7" fill="#0a0e16" opacity=".5"></rect>
                <rect x="258" y="184.2" width="84" height="1.7" fill="#0a0e16" opacity=".5"></rect>
                <rect x="292" y="178" width="16" height="6" rx="1" fill="#0a0e16" opacity=".28"></rect>
              </g>
            </g>
            <rect x="258" y="174" width="84" height="252" rx="3" fill="none" stroke="rgba(150,175,210,.4)" stroke-width="0.9"></rect>
            <rect x="258" y="426" width="84" height="9" fill="#0b1220" stroke="rgba(150,175,210,.3)" stroke-width="0.7"></rect>
            <text x="300" y="192" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" font-weight="600" letter-spacing=".5" fill="#2a1a06" style="{{ mxBotFluidTextStyle }}">FLUID</text>
            <text x="300" y="396" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" font-weight="600" letter-spacing=".5" fill="#07202e">WATER</text>
            <text x="238" y="300" text-anchor="end" font-family="IBM Plex Sans" font-size="13" font-weight="600" letter-spacing=".4" fill="var(--lbl)">SPS/PDS</text>
            <text x="238" y="316" text-anchor="end" font-family="IBM Plex Mono" font-size="10" fill="var(--mut)">~800 cc</text>

            <!-- ===== LOWER BOTTLE DETAILS ===== -->
            <rect x="306" y="438" width="28" height="26" rx="2" fill="rgba(120,150,190,.16)" stroke="#7a90ad" stroke-width="1"></rect>
            <g fill="rgba(200,220,245,.45)"><circle cx="312" cy="444" r="1.3"></circle><circle cx="320" cy="448" r="1.3"></circle><circle cx="328" cy="443" r="1.3"></circle><circle cx="314" cy="455" r="1.3"></circle><circle cx="324" cy="458" r="1.3"></circle><circle cx="330" cy="452" r="1.3"></circle></g>
            <rect x="312" y="464" width="7" height="24" fill="url(#mxPipe)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <rect x="292" y="438" width="7" height="50" fill="url(#mxPipe)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <rect x="271" y="438" width="7" height="24" fill="url(#mxPipe)" stroke="#0a0e16" stroke-width="0.6"></rect>

            <!-- displaced water out of the water port -->
            <path d="M274.5 460 H176 V470" fill="none" stroke="#0a0e16" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M274.5 460 H176 V470" fill="none" stroke="url(#mxPipe)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"></path>
            <!-- displaced water front: starts at the bottle water port, travels the lower line to the receiver -->
            <path d="M274.5 436 V460 H176 V470" fill="none" stroke="#5aa6d8" stroke-width="2.4" stroke-linejoin="round" stroke-dasharray="136.5 136.5" style="{{ mxWoutFrontStyle }}"></path>
            <mask id="mxWoutMask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="900" height="545"><path d="M274.5 436 V460 H176 V470" fill="none" stroke="#ffffff" stroke-width="9" stroke-linejoin="round" stroke-dasharray="136.5 136.5" style="{{ mxWoutFrontStyle }}"></path></mask>
            <path d="M274.5 436 V460 H176 V470" fill="none" stroke="#d6eeff" stroke-width="1.8" stroke-dasharray="5 13" stroke-linecap="round" stroke-linejoin="round" mask="url(#mxWoutMask)" style="{{ mxWoutPulseStyle }}"><animate sc-camel-attribute-name="stroke-dashoffset" values="0;-18" dur="0.26s" sc-camel-repeat-count="indefinite"></animate></path>
            <polygon points="244,460 254,455 254,465" fill="#5aa6d8" style="{{ mxArrowWStyle }}"></polygon>
            <circle cx="224" cy="460" r="12" fill="url(#mxGauge)" stroke="#0a0e16" stroke-width="1.2"></circle>
            <circle cx="224" cy="460" r="8.6" fill="none" stroke="rgba(174,188,207,.45)" stroke-width="0.9"></circle>
            <line x1="224" y1="460" x2="230" y2="454" stroke="#8fd0ff" stroke-width="1.3" stroke-linecap="round"></line>
            <rect x="160" y="472" width="32" height="40" rx="3" fill="rgba(180,210,240,.06)" stroke="rgba(174,188,207,.5)" stroke-width="1"></rect>
            <rect x="162" y="474" width="28" height="36" fill="url(#mxWater)" opacity=".85" style="{{ mxBeakerStyle }}"></rect>
            <g stroke="rgba(220,235,250,.4)" stroke-width="0.8"><line x1="160" y1="482" x2="168" y2="482"></line><line x1="160" y1="492" x2="168" y2="492"></line><line x1="160" y1="502" x2="168" y2="502"></line></g>
            <text x="176" y="534" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" letter-spacing=".6" fill="var(--mut)">DISPLACED WATER</text>

            <!-- ===== CALLOUTS ===== -->
            <g font-family="IBM Plex Sans">
              <line x1="334" y1="448" x2="420" y2="424" stroke="rgba(231,177,90,.45)" stroke-width="1"></line>
              <circle cx="422" cy="424" r="2.6" fill="#e7b15a"></circle>
              <text x="430" y="428" font-size="12" font-weight="600" letter-spacing=".3" fill="var(--lbl)">N₂ Chamber</text>
              <line x1="319" y1="484" x2="420" y2="456" stroke="rgba(231,177,90,.45)" stroke-width="1"></line>
              <circle cx="422" cy="456" r="2.6" fill="#e7b15a"></circle>
              <text x="430" y="460" font-size="12" font-weight="600" letter-spacing=".3" fill="var(--lbl)">N₂ Inlet</text>
              <line x1="299" y1="486" x2="420" y2="488" stroke="rgba(231,177,90,.45)" stroke-width="1"></line>
              <circle cx="422" cy="488" r="2.6" fill="#e7b15a"></circle>
              <text x="430" y="492" font-size="12" font-weight="600" letter-spacing=".3" fill="var(--lbl)">Equalizer</text>
              <line x1="278" y1="452" x2="420" y2="518" stroke="rgba(90,166,216,.45)" stroke-width="1"></line>
              <circle cx="422" cy="518" r="2.6" fill="#5aa6d8"></circle>
              <text x="430" y="522" font-size="12" font-weight="600" letter-spacing=".3" fill="var(--accb4)">Water Port</text>
            </g>
          </svg>
          </div>
          <div style="display:flex; align-items:center; gap:9px; margin-top:6px; padding:9px 12px; border-radius:10px; background:var(--icard); border:1px solid var(--line2);">
            <span style="width:7px; height:7px; border-radius:50%; flex:0 0 auto; background:{{ mxLiveColor }};"></span>
            <span style="font-size:12px; color:var(--chipt); line-height:1.4; text-wrap:pretty;">{{ mxStatusText }}</span>
          </div>
        </div>

        <div class="lab-side">

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

          <div style="flex:1 1 auto; min-height:4px;"></div>

          <div class="pc-host" data-pc="Main:xfer" data-pc-layout="side"></div>
          <button onclick="{{ mxNext }}" style="{{ mxNextStyle }}">Continue to Validation →</button>
        </div>
      </div>
    </div>
    </sc-if>`);
