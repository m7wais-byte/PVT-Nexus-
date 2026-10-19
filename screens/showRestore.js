/* screen: showRestore  (33.1 KB) */
DC.slot('showRestore', `<sc-if value="{{ showRestore }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Module 02 — Validation" class="pg pg-stack">

      <!-- compact page header (shared .pg-head): step title · live state · sample source -->
      <div class="pg-head">
        <div class="pg-titles">
          <span class="pg-eyebrow">Validation</span>
          <h2 class="pg-title">{{ qcStepTitle }}</h2>
          <span style="align-self:center; flex:0 0 auto; display:inline-flex; align-items:center; gap:7px; font-family:'IBM Plex Mono'; font-size:11px; color:{{ qcLiveColor }};"><span style="width:7px; height:7px; border-radius:50%; background:{{ qcLiveColor }}; box-shadow:0 0 8px {{ qcLiveColor }};"></span>{{ qcLiveLabel }}</span>
          <sc-if value="{{ qcGasNote }}" hint-placeholder-val="{{ false }}">
            <span style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:.6px; padding:4px 9px; border-radius:6px; background:var(--chipbg); border:1px solid var(--line2); color:var(--acca2);">Gas bottle checked separately · pressurised gas only, no piston or water side</span>
            </sc-if>
        </div>
        <div class="pg-end">
          <button type="button" class="bd-btn" data-bd-open="oil" data-bd-ctx="SPS/PDS sample bottle under validation · water driving side">Bottle Details</button>
          <span style="width:1px; height:18px; background:var(--line2); flex:0 0 auto;"></span>
          <span style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.8px; text-transform:uppercase; color:var(--mut);">Sample Source</span>
          <span style="display:flex; align-items:center; gap:6px;">
            <sc-for list="{{ valSrcBtns }}" as="b" hint-placeholder-count="3">
              <button onclick="{{ b.onClick }}" style="{{ b.style }}">{{ b.label }}</button>
            </sc-for>
          </span>
        </div>
      </div>

      <div class="lab-body">

        <div class="lab-schem" style="background:radial-gradient(120% 90% at 50% 0%,#0c1526,#070c16); border:1px solid var(--line); border-radius:16px; padding:10px 14px; display:flex; flex-direction:column; min-width:0; min-height:0; position:relative; background-image:linear-gradient(rgba(150,175,210,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(150,175,210,.035) 1px,transparent 1px); background-size:34px 34px;">
          <div style="flex:1; min-height:0; display:flex; align-items:center; justify-content:center;">
          <svg sc-camel-view-box="0 22 900 492" sc-camel-preserve-aspect-ratio="xMidYMid meet" style="display:block; width:100%; height:100%;">

            <defs>
              <linearGradient id="qMetal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"></stop><stop offset=".15" stop-color="#6377a0"></stop><stop offset=".42" stop-color="#b3c1d8"></stop><stop offset=".58" stop-color="#7e90b0"></stop><stop offset=".8" stop-color="#41506e"></stop><stop offset="1" stop-color="#1f2a3e"></stop></linearGradient>
              <linearGradient id="qCyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>
              <linearGradient id="qPipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e82a4"></stop><stop offset=".4" stop-color="#9cb0cd"></stop><stop offset=".55" stop-color="#41526c"></stop><stop offset="1" stop-color="#232f44"></stop></linearGradient>
              <linearGradient id="qSample" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7b15a"></stop><stop offset="1" stop-color="#c07f2e"></stop></linearGradient>
              <linearGradient id="qWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa6d8"></stop><stop offset="1" stop-color="#2f6f9c"></stop></linearGradient>
              <radialGradient id="qGauge" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#13202f"></stop><stop offset="1" stop-color="#0a1018"></stop></radialGradient>
              <filter id="qGlow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur sc-camel-std-deviation="4.5" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>
              <pattern id="qHatch" width="8" height="8" sc-camel-pattern-transform="rotate(45)" sc-camel-pattern-units="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="8" stroke="#e7b15a" stroke-width="2"></line></pattern>
              ${BottleArt.defs('q')}
              <symbol id="qhw" sc-camel-view-box="0 0 30 30" overflow="visible"><circle cx="15" cy="15" r="12.5" fill="none" stroke="#0a0e16" stroke-width="4.5"></circle><circle cx="15" cy="15" r="12.5" fill="none" stroke="#aebccf" stroke-width="2.6"></circle><g stroke="#9fb0c8" stroke-width="2.2" stroke-linecap="round"><line x1="15" y1="15" x2="15" y2="3.5"></line><line x1="15" y1="15" x2="15" y2="26.5"></line><line x1="15" y1="15" x2="3.5" y2="15"></line><line x1="15" y1="15" x2="26.5" y2="15"></line></g><circle cx="15" cy="15" r="4" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="1"></circle></symbol>
            </defs>

            <line x1="0" y1="470" x2="900" y2="470" stroke="#46566f" stroke-width="1.5"></line>
            <rect x="0" y="470" width="900" height="90" fill="rgba(120,150,185,.04)"></rect>

            <sc-if value="{{ qcRig }}" hint-placeholder-val="{{ true }}">
            <!-- ===== CLAMP STAND ===== -->
            <ellipse cx="150" cy="468" rx="62" ry="7" fill="rgba(0,0,0,.35)"></ellipse>
            <ellipse cx="150" cy="464" rx="56" ry="9" fill="url(#qCyl)" stroke="#0a0e16" stroke-width="1"></ellipse>
            <rect x="146" y="100" width="9" height="362" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <rect x="141" y="96" width="19" height="7" rx="2" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <g>
              <rect x="155" y="192" width="92" height="8" rx="3" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"></rect>
              <rect x="240" y="185" width="11" height="22" rx="3" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.8"></rect>
              <rect x="155" y="296" width="92" height="8" rx="3" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"></rect>
              <rect x="240" y="289" width="11" height="22" rx="3" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.8"></rect>
            </g>

            <!-- ===== PUMP -> UPPER (WATER-SIDE) VALVE ONLY ===== -->
            <path d="M765 288 V72 H300 V78" fill="none" stroke="#0a0e16" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M765 288 V72 H300 V78" fill="none" stroke="url(#qPipe)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M763 286 V70 H300" fill="none" stroke="#cdd9ea" stroke-width="1.3" stroke-linecap="round" opacity=".3"></path>
            <rect x="440" y="66" width="10" height="13" rx="1.5" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <rect x="600" y="66" width="10" height="13" rx="1.5" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <!-- injection line is primed with water (static); active flow is drawn over the bottle hardware below -->
            <path d="M765 288 V72 H300 V89" fill="none" stroke="#2f6f9c" stroke-width="2.6" stroke-linejoin="round" opacity=".5"></path>
            <text x="520" y="60" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" letter-spacing="1" fill="var(--cap2)">WATER-SIDE INJECTION LINE</text>

            <!-- ===== HEATING JACKET (full bottle) ===== -->
            <g style="{{ resJacketStyle }}">
              <rect x="241" y="109" width="118" height="252" rx="15" fill="none" stroke="#e7752e" stroke-width="5" opacity="0" style="{{ resJacketGlowStyle }}; filter:blur(1.5px);"></rect>
              <rect x="244" y="112" width="112" height="246" rx="13" fill="rgba(231,117,46,.09)" stroke="#e7752e" stroke-width="1.8"></rect>
              <clipPath id="qJckC"><rect x="245" y="113" width="110" height="244" rx="12"></rect></clipPath>
              <g clip-path="url(#qJckC)"><rect x="245" y="113" width="110" height="244" fill="#e7752e" opacity="0.3" style="{{ resTempFillStyle }}"></rect></g>
              <g stroke="rgba(231,117,46,.4)" stroke-width="1">
                <line x1="244" y1="158" x2="356" y2="158"></line><line x1="244" y1="202" x2="356" y2="202"></line>
                <line x1="244" y1="246" x2="356" y2="246"></line><line x1="244" y1="290" x2="356" y2="290"></line>
                <line x1="244" y1="334" x2="356" y2="334"></line>
              </g>
              <rect x="240" y="108" width="120" height="10" rx="4" fill="rgba(231,117,46,.55)" stroke="#a3521c" stroke-width="0.8"></rect>
              <rect x="240" y="348" width="120" height="10" rx="4" fill="rgba(231,117,46,.55)" stroke="#a3521c" stroke-width="0.8"></rect>
              <path d="M356 330 C 380 336, 384 366, 370 382" fill="none" stroke="#5c4326" stroke-width="3" stroke-linecap="round"></path>
            </g>

            <!-- ===== SPS/PDS BOTTLE (INVERTED: water top, piston mid, oil bottom) =====
                 approved Oil Sample Bottle design (components/BottleArt.js) on the unchanged bore window 263..337 x 134..338 -->
            ${BottleArt.cage('q', 300, 116, 78, 43)}${BottleArt.cage('q', 300, 356, 404, 43)}
            <rect x="294" y="74" width="12" height="15" rx="1.5" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <rect x="284" y="89" width="32" height="17" rx="3" fill="url(#qBkStD)" stroke="#0a0e16" stroke-width="0.9"></rect>
            <circle cx="327.5" cy="97.5" r="11.5" fill="none" stroke="{{ rsValveRing }}" stroke-width="1.6" style="transition:stroke .3s ease;"></circle>
            <g style="{{ rsValveWheelStyle }}"><use href="#qhw" x="318" y="88" width="19" height="19"></use></g>
            <rect x="291" y="106" width="18" height="13" rx="2" fill="url(#qBkStD)" stroke="#0a0e16" stroke-width="0.8"></rect>
            <!-- lower sample valve hardware sits behind the bottom cap -->
            <rect x="294" y="356" width="12" height="20" rx="1.5" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <g class="bd-hit" data-bd-open="oil" data-bd-ctx="SPS/PDS sample bottle · inverted for restoration (water side up)">
            ${BottleArt.oilBody('q', { cx: 300, rb: 37, y0: 134, y1: 338, R: 42, capR: 46, capH: 18 })}
            <clipPath id="qChm"><rect x="263" y="134" width="74" height="204"></rect></clipPath>
            <g clip-path="url(#qChm)">
              <rect x="263" y="134" width="74" height="204" fill="url(#qWater)" opacity="0.9" style="{{ qcWaterStyle }}"></rect>
              <rect x="263" y="134" width="74" height="204" fill="url(#qSample)" opacity="0.92" style="{{ qcOilStyle }}"></rect>
              <!-- loose mixing ring: oil (sample) side is down, so the ring rests on the bottom cap -->
              ${BottleArt.ring('q', 300, 37, 338 - BottleArt.ringHalf(37))}
              <sc-if value="{{ qcS3 }}" hint-placeholder-val="{{ false }}">
              <!-- step 3: water dispersed in the oil (cloudy) -> droplets settle -> free-water layer at the bottom -->
              <rect x="263" y="{{ qc3HazeY }}" width="74" height="{{ qc3HazeH }}" fill="#dcecf7" opacity="{{ qc3HazeOp }}"></rect>
              <path d="{{ qc3Drops }}" fill="#2f86c9" stroke="#d4ecff" stroke-width="0.6" stroke-opacity="0.8"></path>
              <path d="{{ qc3DropHi }}" fill="#ffffff" opacity="0.55"></path>
              <rect x="263" y="{{ qcFreeWaterY }}" width="74" height="{{ qcFreeWaterH }}" fill="url(#qWater)" opacity="0.97"></rect>
              <line x1="263" y1="{{ qcFreeWaterY }}" x2="337" y2="{{ qcFreeWaterY }}" stroke="#cfeaff" stroke-width="1.1" opacity="{{ qc3IfOp }}"></line>
              </sc-if>
            </g>
            <g clip-path="url(#qChm)">
              <g style="{{ qcPistonStyle }}">${BottleArt.piston('q', 263, 74, 134, 12)}</g>
            </g>
            ${BottleArt.oilFront('q', { cx: 300, rb: 37, y0: 134, y1: 338, R: 42 })}
            </g>
            <text x="300" y="178" text-anchor="middle" font-family="IBM Plex Mono" font-size="17" font-weight="600" fill="var(--txt)" opacity=".85">W</text>
            <text x="300" y="290" text-anchor="middle" font-family="IBM Plex Mono" font-size="17" font-weight="600" fill="#3d2606" opacity=".8">O</text>
            <text x="300" y="66" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" letter-spacing="1.2" fill="var(--cap2)">SPS/PDS · ~800 cc</text>

            <!-- ===== RESTORATION WATER FLOW: pump outlet -> up -> left along the injection line -> water-side valve -> top water chamber ===== -->
            <path d="M765 288 V72 H300 V134" fill="none" stroke="#5aa6d8" stroke-width="2.8" stroke-linejoin="round" stroke-dasharray="747 747" style="{{ rsFrontStyle }}"></path>
            <mask id="qRsMask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="900" height="560"><path d="M765 288 V72 H300 V134" fill="none" stroke="#ffffff" stroke-width="10" stroke-linejoin="round" stroke-dasharray="747 747" style="{{ rsFrontStyle }}"></path></mask>
            <path d="M765 288 V72 H300 V134" fill="none" stroke="#d6eeff" stroke-width="2.2" stroke-dasharray="6 16" stroke-linecap="round" stroke-linejoin="round" mask="url(#qRsMask)" style="{{ rsPulseStyle }}"><animate sc-camel-attribute-name="stroke-dashoffset" values="0;-22" dur="0.22s" sc-camel-repeat-count="indefinite"></animate></path>
            <polygon points="765,176 759,190 771,190" fill="#5fb0ff" style="{{ rsArrowUpStyle }}"></polygon>
            <polygon points="676,72 690,66 690,78" fill="#5fb0ff" style="{{ rsArrowLStyle }}"></polygon>

            <!-- ===== SINGLE LOWER SAMPLE VALVE (OIL SIDE) ===== -->
            <rect x="284" y="376" width="32" height="17" rx="3" fill="url(#qBkStD)" stroke="#0a0e16" stroke-width="0.9"></rect>
            <sc-if value="{{ qcS3 }}" hint-placeholder-val="{{ false }}"><circle cx="327.5" cy="384.5" r="11.5" fill="none" stroke="{{ qc3SvRing }}" stroke-width="1.6" style="transition:stroke .3s ease;"></circle></sc-if>
            <g style="{{ qc3SvWheelStyle }}"><use href="#qhw" x="318" y="375" width="19" height="19"></use></g>
            <rect x="294" y="393" width="12" height="17" rx="1.5" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <rect x="290" y="410" width="20" height="7" rx="2" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.7"></rect>

            <!-- ===== STEP 3: controlled water bleed to beaker ===== -->
            <sc-if value="{{ qcS3 }}" hint-placeholder-val="{{ false }}">
            <path d="M300 410 V428" fill="none" stroke="#0a0e16" stroke-width="7" stroke-linecap="round"></path>
            <path d="M300 410 V428" fill="none" stroke="url(#qPipe)" stroke-width="3.5" stroke-linecap="round"></path>
            <g style="{{ waterDropStyle }}">
              <path d="M300 428 V458" fill="none" stroke="#5aa6d8" stroke-width="1.4" stroke-dasharray="3 9" stroke-linecap="round" opacity="0.7"><animate sc-camel-attribute-name="stroke-dashoffset" values="0;-24" dur="1.6s" sc-camel-repeat-count="indefinite"></animate></path>
              <circle cx="300" cy="430" r="2.8" fill="#5aa6d8"><animate sc-camel-attribute-name="cy" values="428;444;458" dur="1.4s" sc-camel-repeat-count="indefinite"></animate><animate sc-camel-attribute-name="r" values="2.4;3;2" dur="1.4s" sc-camel-repeat-count="indefinite"></animate><animate sc-camel-attribute-name="opacity" values="0;1;0" dur="1.4s" sc-camel-repeat-count="indefinite"></animate></circle>
              <circle cx="300" cy="430" r="2.6" fill="#5aa6d8"><animate sc-camel-attribute-name="cy" values="428;444;458" dur="1.4s" begin="0.47s" sc-camel-repeat-count="indefinite"></animate><animate sc-camel-attribute-name="r" values="2.4;3;2" dur="1.4s" begin="0.47s" sc-camel-repeat-count="indefinite"></animate><animate sc-camel-attribute-name="opacity" values="0;1;0" dur="1.4s" begin="0.47s" sc-camel-repeat-count="indefinite"></animate></circle>
              <circle cx="300" cy="430" r="2.6" fill="#5aa6d8"><animate sc-camel-attribute-name="cy" values="428;444;458" dur="1.4s" begin="0.93s" sc-camel-repeat-count="indefinite"></animate><animate sc-camel-attribute-name="r" values="2.4;3;2" dur="1.4s" begin="0.93s" sc-camel-repeat-count="indefinite"></animate><animate sc-camel-attribute-name="opacity" values="0;1;0" dur="1.4s" begin="0.93s" sc-camel-repeat-count="indefinite"></animate></circle>
            </g>
            <path d="M276 430 H324 L317 464 H283 Z" fill="#0c1626" stroke="#46566f" stroke-width="1.4"></path>
            <clipPath id="qBeakC"><path d="M277 431 H323 L316 463 H284 Z"></path></clipPath>
            <g clip-path="url(#qBeakC)"><rect x="277" y="431" width="46" height="32" fill="#5aa6d8" opacity="0.85" style="{{ beakerFillStyle }}"></rect></g>
            <text x="300" y="480" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="var(--cap)">{{ qc3BeakerText }}</text>
            </sc-if>

            <!-- ===== RIGHT CALLOUTS ===== -->
            <g font-family="IBM Plex Sans">
              <line x1="339" y1="97" x2="392" y2="92" stroke="rgba(95,176,255,.5)" stroke-width="1"></line>
              <circle cx="394" cy="92" r="2.6" fill="#5fb0ff"></circle>
              <text x="402" y="90" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--hdb)">WATER SIDE VALVE</text>
              <text x="402" y="102" font-family="IBM Plex Mono" font-size="8" fill="var(--lbl2)">{{ rsValveText }}</text>
              <line x1="358" y1="238" x2="392" y2="234" stroke="rgba(231,117,46,.55)" stroke-width="1"></line>
              <circle cx="394" cy="234" r="2.6" fill="#e7752e"></circle>
              <text x="402" y="232" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--acca)">HEATING JACKET</text>
              <foreignObject x="401" y="235" width="150" height="14"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; line-height:1.1; white-space:nowrap; color:var(--acca);">Wrapped around the bottle</div></foreignObject>
              <line x1="339" y1="385" x2="392" y2="378" stroke="rgba(150,175,210,.45)" stroke-width="1"></line>
              <circle cx="394" cy="378" r="2.6" fill="#aebccf"></circle>
              <text x="402" y="376" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--lbl)">SAMPLE VALVE</text>
              <text x="402" y="388" font-family="IBM Plex Mono" font-size="8" fill="var(--lbl2)">{{ qc3SvText }}</text>
            </g>

            <sc-if value="{{ qcS3 }}" hint-placeholder-val="{{ false }}">
            <!-- ===== STEP 3: hydraulic water vs free water callouts ===== -->
            <g font-family="IBM Plex Sans">
              <line x1="358" y1="168" x2="392" y2="164" stroke="rgba(95,176,255,.5)" stroke-width="1"></line>
              <circle cx="394" cy="164" r="2.6" fill="#5fb0ff"></circle>
              <text x="402" y="162" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--hdb)">HYDRAULIC WATER</text>
              <text x="402" y="174" font-family="IBM Plex Mono" font-size="8" fill="var(--lbl2)">pump side · above the piston</text>
              <line x1="358" y1="{{ qc3OilY }}" x2="392" y2="284" stroke="rgba(231,177,90,.55)" stroke-width="1"></line>
              <circle cx="394" cy="284" r="2.6" fill="#e7b15a"></circle>
              <text x="402" y="282" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--acca)">OIL SAMPLE</text>
              <text x="402" y="294" font-family="IBM Plex Mono" font-size="8" fill="var(--lbl2)">{{ qc3OilSub }}</text>
              <line x1="358" y1="334" x2="392" y2="330" stroke="rgba(95,176,255,.5)" stroke-width="1"></line>
              <circle cx="394" cy="330" r="2.6" fill="#38b6d6"></circle>
              <text x="402" y="328" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--accw)">FREE WATER</text>
              <text x="402" y="340" font-family="IBM Plex Mono" font-size="8" fill="var(--lbl2)">{{ qc3FwSub }}</text>
            </g>
            <!-- ===== STEP 3: simulated 24 h settling timer + drained volume ===== -->
            <g>
              <rect x="556" y="258" width="140" height="118" rx="10" fill="rgba(9,16,29,.86)" stroke="rgba(120,150,190,.28)" stroke-width="1.2"></rect>
              <foreignObject x="566" y="266" width="124" height="13"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:1px; line-height:1.2; white-space:nowrap; color:rgba(185,210,240,.80);">SETTLING TIME</div></foreignObject>
              <foreignObject x="566" y="279" width="124" height="20"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:14px; font-weight:600; line-height:1.25; white-space:nowrap; color:#8fd0ff;">{{ qc3HoursText }}</div></foreignObject>
              <rect x="566" y="301" width="120" height="5" rx="2.5" fill="rgba(120,150,190,.18)"></rect>
              <rect x="566" y="301" width="120" height="5" rx="2.5" fill="#38b6d6" style="{{ qc3BarStyle }}"></rect>
              <rect x="566" y="311" width="120" height="14" rx="4" fill="rgba(231,177,90,.10)" stroke="rgba(231,177,90,.4)" stroke-width="0.8"></rect>
              <foreignObject x="566" y="312" width="120" height="13"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:6.8px; letter-spacing:.2px; line-height:1.7; white-space:nowrap; text-align:center; color:var(--acca);">ACCELERATED DEMONSTRATION</div></foreignObject>
              <line x1="566" y1="333" x2="686" y2="333" stroke="rgba(120,150,190,.22)" stroke-width="1"></line>
              <foreignObject x="566" y="338" width="124" height="13"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:1px; line-height:1.2; white-space:nowrap; color:rgba(185,210,240,.80);">WATER TO RECEIVER</div></foreignObject>
              <foreignObject x="566" y="351" width="124" height="20"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:14px; font-weight:600; line-height:1.25; white-space:nowrap; color:#5aa6d8;">{{ qc3DrainText }} <span style="font-size:9.5px; font-weight:400; color:rgba(160,188,220,.78);">cc</span></div></foreignObject>
            </g>
            <sc-if value="{{ qc3MsgOn }}" hint-placeholder-val="{{ false }}">
            <rect x="556" y="384" width="140" height="34" rx="9" fill="rgba(70,211,154,.12)" stroke="rgba(70,211,154,.4)" stroke-width="1"></rect>
            <foreignObject x="562" y="387" width="128" height="30"><div style="margin:0; font-family:'IBM Plex Sans',sans-serif; font-size:9.5px; font-weight:600; line-height:1.3; text-align:center; color:var(--accg);">{{ qc3Msg }}</div></foreignObject>
            </sc-if>
            </sc-if>

            <!-- ===== LIVE PRESSURE / TEMPERATURE READOUT ===== -->
            <g>
              <rect x="556" y="96" width="186" height="150" rx="12" fill="rgba(9,16,29,.86)" stroke="rgba(120,150,190,.28)" stroke-width="1.2"></rect>
              <foreignObject x="570" y="108" width="162" height="14"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:1.4px; line-height:1.2; color:rgba(185,210,240,.80);">{{ qcGaugeCap }}</div></foreignObject>

              <foreignObject x="570" y="130" width="162" height="15"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:.8px; line-height:1.2; white-space:nowrap; color:rgba(160,188,220,.78);">{{ qcGaugePLabel }}</div></foreignObject>
              <foreignObject x="570" y="144" width="162" height="30"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:23px; font-weight:600; line-height:1.15; white-space:nowrap; color:#5fb0ff;">{{ resPText }} <span style="font-size:10px; font-weight:400; color:rgba(160,188,220,.78);">psig</span></div></foreignObject>
              <rect x="570" y="176" width="158" height="5" rx="2.5" fill="rgba(120,150,190,.18)"></rect>
              <rect x="570" y="176" width="158" height="5" rx="2.5" fill="#4d9dff" style="{{ qcPBarStyle }}"></rect>

              <foreignObject x="570" y="190" width="162" height="15"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; letter-spacing:.8px; line-height:1.2; white-space:nowrap; color:rgba(160,188,220,.78);">BOTTLE TEMPERATURE</div></foreignObject>
              <foreignObject x="570" y="204" width="162" height="30"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:23px; font-weight:600; line-height:1.15; white-space:nowrap; color:#f0913f;">{{ resTText }} <span style="font-size:10px; font-weight:400; color:rgba(160,188,220,.78);">°C</span></div></foreignObject>
              <rect x="570" y="236" width="158" height="5" rx="2.5" fill="rgba(120,150,190,.18)"></rect>
              <rect x="570" y="236" width="158" height="5" rx="2.5" fill="#e7752e" style="{{ qcTBarStyle }}"></rect>
            </g>
            <sc-if value="{{ qcOpenRecorded }}" hint-placeholder-val="{{ false }}">
            <rect x="570" y="296" width="126" height="24" rx="12" fill="rgba(70,211,154,.12)" stroke="rgba(70,211,154,.4)" stroke-width="1"></rect>
            <foreignObject x="570" y="301" width="126" height="16"><div style="margin:0; font-family:'IBM Plex Sans',sans-serif; font-size:10.5px; line-height:1.4; white-space:nowrap; overflow:hidden; text-align:center; color:var(--accg);">{{ qcOpenBadge }}</div></foreignObject>
            </sc-if>

            <!-- ===== TRANSFER PUMP ===== -->
            <ellipse cx="765" cy="466" rx="86" ry="7" fill="rgba(0,0,0,.32)"></ellipse>
            <rect x="688" y="452" width="154" height="12" rx="3" fill="#1a2030" stroke="#0a0e16" stroke-width="1"></rect>
            <rect x="702" y="290" width="126" height="162" rx="7" fill="url(#qCyl)" stroke="#0a0e16" stroke-width="1.3"></rect>
            <rect x="710" y="298" width="8" height="146" rx="4" fill="#ffffff" opacity="0.16"></rect>
            <rect x="714" y="304" width="102" height="8" rx="3" fill="#1a2030" stroke="#0a0e16" stroke-width="0.6"></rect>
            <circle cx="765" cy="352" r="26" fill="url(#qGauge)" stroke="#46566f" stroke-width="2"></circle>
            <line x1="765" y1="352" x2="753" y2="341" stroke="#5fb0ff" stroke-width="1.8" stroke-linecap="round"></line>
            <circle cx="765" cy="352" r="2.4" fill="#aebccf"></circle>
            <circle cx="765" cy="410" r="14" fill="#0d1a16" stroke="#2f6f52" stroke-width="1.4"></circle>
            <circle cx="765" cy="410" r="7" fill="{{ qcPumpLed }}" style="{{ qcPumpLedStyle }}"></circle>
            <rect x="726" y="432" width="78" height="8" rx="3" fill="#101a26" stroke="#2b3a52" stroke-width="0.7"></rect>
            <text x="765" y="486" text-anchor="middle" font-family="IBM Plex Sans" font-size="11.5" letter-spacing=".8" fill="var(--acca)" font-weight="600">TRANSFER PUMP</text>
            </sc-if>

            <sc-if value="{{ qcS4 }}" hint-placeholder-val="{{ false }}">
            <!-- ===== STEP 4: 180° inversion agitation - inversion stand, rotating SPS/PDS bottle, stationary
                 pressure pump + flexible line, compact readouts. Drawn by components/QcAgitSim.js (Main.syncQcAgit). ===== -->
            <g ref="{{ qcAgHost }}"></g>
            </sc-if>
          </svg>
          </div>
          <div style="display:flex; align-items:center; gap:10px; margin-top:6px; padding:10px 14px; background:var(--inset); border:1px solid var(--line); border-radius:10px;">
            <span style="width:8px; height:8px; border-radius:50%; background:{{ qcLiveColor }}; box-shadow:0 0 8px {{ qcLiveColor }}; animation:glowpulse 1.4s ease-in-out infinite;"></span>
            <span style="font-family:'IBM Plex Mono'; font-size:12px; color:var(--txt2);">{{ qcStatusText }}</span>
          </div>
        </div>

        <div class="lab-side">

          <div style="flex:0 0 auto; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:11px 13px; display:flex; flex-direction:column; gap:9px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:22px; height:22px; border-radius:7px; background:rgba(77,157,255,.14); color:var(--blue); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="5" rx="1.5" stroke="currentColor" stroke-width="1.8"></rect><path d="M9 6v3.5L6 15a3 3 0 0 0 2.6 4.5h6.8A3 3 0 0 0 18 15l-3-5.5V6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path></svg></span>
              <span style="font-size:13px; font-weight:600; color:var(--txt); flex:1;">Sample Under Test</span>
              <span style="font-family:'IBM Plex Mono'; font-size:9px; letter-spacing:.8px; color:var(--mut); background:var(--icard); border:1px solid var(--line2); border-radius:5px; padding:3px 7px; white-space:nowrap; flex:0 0 auto;">{{ qcSampleId }}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="width:7px; height:7px; border-radius:50%; flex:0 0 auto; background:{{ qcLiveColor }};"></span>
              <span style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:1px; color:var(--mut);">LIVE DATA</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:7px;">
              <sc-for list="{{ qcLiveCards }}" as="card" hint-placeholder-count="4">
              <div style="background:var(--icard); border:1px solid var(--line2); border-radius:8px; padding:7px 10px; min-width:0;">
                <div style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.7px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ card.l }}</div>
                <div style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; margin-top:2px; white-space:nowrap; color:{{ card.c }};">{{ card.v }} <span style="font-size:9px; color:var(--mut);">{{ card.u }}</span></div>
              </div>
              </sc-for>
            </div>
          </div>

          <div style="flex:1 1 auto; min-height:4px;"></div>

          <div style="display:flex; flex-direction:column; gap:7px;">
            <div class="pc-host" data-pc="Main:qc" data-pc-layout="side"></div>
            <sc-if value="{{ qcLastStep }}" hint-placeholder-val="{{ false }}"><button onclick="{{ qcNext }}" style="width:100%; padding:10px; border-radius:9px; cursor:{{ qcNextCursor }}; background:{{ qcNextBg }}; border:1px solid {{ qcNextBorder }}; color:{{ qcNextColor }}; font-family:inherit; font-size:13px; font-weight:600; letter-spacing:.3px;">{{ qcNextText }}</button></sc-if>
          </div>
        </div>
      </div>
    </div>
    </sc-if>`);
