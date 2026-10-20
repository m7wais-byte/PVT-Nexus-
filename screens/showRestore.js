/* screen: showRestore  (33.1 KB) */
/* Validation steps 1-3 bottle scene geometry (viewBox 0 22 900 492, floor y 470). One place for the bottle
   centre / scale: the drawing below and Main.js (window.QC_GEO: callout leaders, injection-line length) both
   read it. The bottle is inverted with its valve outlets on the right (rotate 180 + mirror = vertical flip),
   so a bottle-local point (lx, ly) is drawn at (cx + s*lx, cy - s*ly). */
var QCG = (function () {
  var cx = 300, cy = 254, s = 0.55, r1 = function (v) { return Math.round(v * 10) / 10; };
  var g = { cx: cx, cy: cy, s: s, X: function (lx) { return r1(cx + s * lx); }, Y: function (ly) { return r1(cy + s * ly); }, L: function (d) { return r1(s * d); } };
  var frame = { x: cx, y: cy, s: s, rot: 180, mirror: true };
  var pB = window.BottleArt.oilPort(frame, 'B');   // driving (water) side valve outlet - top
  var pT = window.BottleArt.oilPort(frame, 'T');   // sample side valve outlet - bottom
  g.portB = pB; g.portT = pT;
  // injection line: pump top -> up -> left along the run -> down beside the valve -> left into its side port
  g.runY = 64; g.dropX = r1(pB[0] + 26);
  g.rsPath = 'M765 288 V' + g.runY + ' H' + g.dropX + ' V' + pB[1] + ' H' + pB[0];
  g.rsLen = r1((288 - g.runY) + (765 - g.dropX) + (pB[1] - g.runY) + (g.dropX - pB[0]));
  g.rsDash = Math.ceil(g.rsLen + 4);
  g.rsUpAt = 288 - 176; g.rsLAt = (288 - g.runY) + (765 - 676);   // flow-arrow positions along the line
  // step 3 drainage: reverse-L outlet (horizontal from the sample-valve port, one bend, straight down) over the receiver
  g.drX = r1(pT[0] + 46); g.drOut = r1(pT[1] + 11);
  g.drPath = 'M' + pT[0] + ' ' + pT[1] + ' H' + g.drX + ' V' + g.drOut;
  g.rcTop = 436; g.dropEnd = 457;
  // clamp stand left of the bottle; jaws close on the heating jacket
  g.rodX = 160; g.rodTop = 108; g.jawX = r1(cx - s * 57); g.clampY = [g.Y(-110), g.Y(110)];
  g.dotX = 404; g.txtX = 412;
  return g;
})();
window.QC_GEO = QCG;
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
            <!-- ===== CLAMP STAND: weighted base plate, upright rod, two boss heads with arms, jaws closing on the heating
                 jacket from the left - the bore, both valves and the tubing stay clear ===== -->
            <ellipse cx="${QCG.rodX}" cy="469" rx="80" ry="5" fill="rgba(0,0,0,.35)"></ellipse>
            <rect x="${QCG.rodX - 72}" y="455" width="144" height="12" rx="3" fill="url(#qCyl)" stroke="#0a0e16" stroke-width="1"></rect>
            <rect x="${QCG.rodX - 66}" y="451" width="132" height="5" rx="2" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <rect x="${QCG.rodX - 70}" y="466" width="14" height="4" rx="1" fill="#1a2030"></rect>
            <rect x="${QCG.rodX + 56}" y="466" width="14" height="4" rx="1" fill="#1a2030"></rect>
            <rect x="${QCG.rodX - 9}" y="443" width="18" height="9" rx="2" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <rect x="${QCG.rodX - 4.5}" y="${QCG.rodTop}" width="9" height="${444 - QCG.rodTop}" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <rect x="${QCG.rodX - 7}" y="${QCG.rodTop - 5}" width="14" height="7" rx="2" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.7"></rect>
            ${QCG.clampY.map((y) => `<g>
              <rect x="${QCG.rodX + 4}" y="${y - 4}" width="${QCG.jawX - QCG.rodX - 8}" height="8" rx="3" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.7"></rect>
              <rect x="${QCG.rodX - 11}" y="${y - 10}" width="22" height="20" rx="3" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.8"></rect>
              <rect x="${QCG.rodX - 21}" y="${y - 3}" width="10" height="6" rx="1.5" fill="url(#qPipe)" stroke="#0a0e16" stroke-width="0.6"></rect>
              <circle cx="${QCG.rodX - 23}" cy="${y}" r="4.5" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.7"></circle>
              <rect x="${QCG.jawX - 6}" y="${y - 15}" width="9" height="30" rx="3" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.8"></rect>
              <rect x="${QCG.jawX + 3}" y="${y - 12}" width="4" height="24" rx="1.5" fill="#2a3442" stroke="#0a0e16" stroke-width="0.5"></rect>
            </g>`).join('')}

            <!-- ===== PUMP -> UPPER (WATER-SIDE) VALVE ONLY =====
                 the bottle is the approved Oil Sample Bottle, inverted (rotate 180 + mirror, so its valve outlets face right):
                 the driving-side (water) valve is on top; the injection line drops beside it and enters its side port from the right -->
            <path d="${QCG.rsPath}" fill="none" stroke="#0a0e16" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="${QCG.rsPath}" fill="none" stroke="url(#qPipe)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M763 286 V${QCG.runY - 2} H${QCG.dropX}" fill="none" stroke="#cdd9ea" stroke-width="1.3" stroke-linecap="round" opacity=".3"></path>
            <rect x="440" y="${QCG.runY - 6.5}" width="10" height="13" rx="1.5" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <rect x="600" y="${QCG.runY - 6.5}" width="10" height="13" rx="1.5" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <!-- injection line is primed with water (static); active flow is drawn over the bottle hardware below -->
            <path d="${QCG.rsPath}" fill="none" stroke="#2f6f9c" stroke-width="2.6" stroke-linejoin="round" opacity=".5"></path>
            <text x="560" y="${QCG.runY - 12}" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" letter-spacing="1" fill="var(--cap2)">WATER-SIDE INJECTION LINE</text>

            <!-- ===== HEATING JACKET (full bottle) ===== -->
            <g style="{{ resJacketStyle }}">
              <rect x="${QCG.X(-57)}" y="${QCG.Y(-251)}" width="${QCG.L(114)}" height="${QCG.L(502)}" rx="13" fill="none" stroke="#e7752e" stroke-width="5" opacity="0" style="{{ resJacketGlowStyle }}; filter:blur(1.5px);"></rect>
              <rect x="${QCG.X(-51)}" y="${QCG.Y(-245)}" width="${QCG.L(102)}" height="${QCG.L(490)}" rx="11" fill="rgba(231,117,46,.09)" stroke="#e7752e" stroke-width="1.8"></rect>
              <clipPath id="qJckC"><rect x="${QCG.X(-49)}" y="${QCG.Y(-243)}" width="${QCG.L(98)}" height="${QCG.L(486)}" rx="10"></rect></clipPath>
              <g clip-path="url(#qJckC)"><rect x="${QCG.X(-49)}" y="${QCG.Y(-243)}" width="${QCG.L(98)}" height="${QCG.L(486)}" fill="#e7752e" opacity="0.3" style="{{ resTempFillStyle }}"></rect></g>
              <g stroke="rgba(231,117,46,.4)" stroke-width="1">
                ${[-163, -82, 0, 82, 163].map((ly) => `<line x1="${QCG.X(-51)}" y1="${QCG.Y(ly)}" x2="${QCG.X(51)}" y2="${QCG.Y(ly)}"></line>`).join('')}
              </g>
              <rect x="${QCG.X(-59)}" y="${QCG.Y(-255)}" width="${QCG.L(118)}" height="9" rx="4" fill="rgba(231,117,46,.55)" stroke="#a3521c" stroke-width="0.8"></rect>
              <rect x="${QCG.X(-59)}" y="${QCG.Y(255) - 9}" width="${QCG.L(118)}" height="9" rx="4" fill="rgba(231,117,46,.55)" stroke="#a3521c" stroke-width="0.8"></rect>
              <!-- jacket power lead: off the left side, down behind the stand to the floor -->
              <path d="M${QCG.X(-51)} ${QCG.Y(150)} C ${QCG.X(-100)} ${QCG.Y(160)}, ${QCG.X(-110)} ${QCG.Y(300)}, ${QCG.X(-150)} 451" fill="none" stroke="#5c4326" stroke-width="3" stroke-linecap="round"></path>
            </g>

            <!-- ===== SPS/PDS BOTTLE = approved Oil Sample Bottle, INVERTED for restoration (water side up, oil sample down) =====
                 centre / scale = QCG (top of this file); rotate 180 + mirror so the valve outlets face right. Bore contents are
                 drawn in the screen-aligned bottle frame (x -22..22, y -226..226, y down); Main.js computes fills, piston
                 and step-3 bands in that frame. -->
            ${BottleArt.oil('q', { x: QCG.cx, y: QCG.cy, s: QCG.s, rot: 180, mirror: true, screen: true, bd: 'oil', ctx: 'SPS/PDS sample bottle · inverted for restoration (driving side up)',
              ringB: '{{ rsValveRing }}', needleB: '{{ rsNeedleStyle }}', ringT: '{{ qc3SvRing }}', needleT: '{{ qc3SvNeedleStyle }}',
              inner: `<rect x="-22" y="-226" width="44" height="452" fill="url(#qDrive)" style="{{ qcWaterStyle }}"></rect>
              <rect x="-22" y="-226" width="44" height="452" fill="url(#qOil)" style="{{ qcOilStyle }}"></rect>
              ${PBDraw.mixRing('q', 0, 226 - 8.5)}
              <sc-if value="{{ qcS3 }}" hint-placeholder-val="{{ false }}">
              <rect x="-22" y="{{ qc3HazeY }}" width="44" height="{{ qc3HazeH }}" fill="#dcecf7" opacity="{{ qc3HazeOp }}"></rect>
              <path d="{{ qc3Drops }}" fill="#2f86c9" stroke="#d4ecff" stroke-width="0.6" stroke-opacity="0.8"></path>
              <path d="{{ qc3DropHi }}" fill="#ffffff" opacity="0.55"></path>
              <rect x="-22" y="{{ qcFreeWaterY }}" width="44" height="{{ qcFreeWaterH }}" fill="url(#qWater)" opacity="0.97"></rect>
              <line x1="-22" y1="{{ qcFreeWaterY }}" x2="22" y2="{{ qcFreeWaterY }}" stroke="#cfeaff" stroke-width="1.1" opacity="{{ qc3IfOp }}"></line>
              </sc-if>
              <g style="{{ qcPistonStyle }}">${PBDraw.piston('q', -226)}</g>` })}
            <text x="${QCG.X(-66)}" y="${QCG.Y(-205)}" text-anchor="end" font-family="IBM Plex Sans" font-size="12" font-weight="600" letter-spacing=".4" fill="var(--lbl)">SPS/PDS</text>
            <text x="${QCG.X(-66)}" y="${QCG.Y(-205) + 13}" text-anchor="end" font-family="IBM Plex Mono" font-size="9" fill="var(--mut)">~800 cc</text>

            <!-- ===== RESTORATION WATER FLOW: pump outlet -> up -> left along the injection line -> down onto the water-side valve side port ===== -->
            <path d="${QCG.rsPath}" fill="none" stroke="#5aa6d8" stroke-width="2.8" stroke-linejoin="round" stroke-dasharray="${QCG.rsDash} ${QCG.rsDash}" style="{{ rsFrontStyle }}"></path>
            <mask id="qRsMask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="900" height="560"><path d="${QCG.rsPath}" fill="none" stroke="#ffffff" stroke-width="10" stroke-linejoin="round" stroke-dasharray="${QCG.rsDash} ${QCG.rsDash}" style="{{ rsFrontStyle }}"></path></mask>
            <path d="${QCG.rsPath}" fill="none" stroke="#d6eeff" stroke-width="2.2" stroke-dasharray="6 16" stroke-linecap="round" stroke-linejoin="round" mask="url(#qRsMask)" style="{{ rsPulseStyle }}"><animate sc-camel-attribute-name="stroke-dashoffset" values="0;-22" dur="0.22s" sc-camel-repeat-count="indefinite"></animate></path>
            <polygon points="765,176 759,190 771,190" fill="#5fb0ff" style="{{ rsArrowUpStyle }}"></polygon>
            <polygon points="676,${QCG.runY} 690,${QCG.runY - 6} 690,${QCG.runY + 6}" fill="#5fb0ff" style="{{ rsArrowLStyle }}"></polygon>

            <!-- ===== STEP 3: controlled water drainage - reverse-L outlet from the sample-valve side port: horizontal run to
                 the right, one bend, then straight down; the receiver stands directly under the downward outlet and the
                 drops fall from the outlet into it while water drains ===== -->
            <sc-if value="{{ qcS3 }}" hint-placeholder-val="{{ false }}">
            <path d="${QCG.drPath}" fill="none" stroke="#0a0e16" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="${QCG.drPath}" fill="none" stroke="url(#qPipe)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="${QCG.drPath}" fill="none" stroke="#5aa6d8" stroke-width="2" stroke-linejoin="round" style="{{ waterDropStyle }}"></path>
            <rect x="${QCG.drX - 4.5}" y="${QCG.drOut - 5}" width="9" height="6" rx="1.2" fill="url(#qMetal)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <path d="M${QCG.drX - 26} ${QCG.rcTop} H${QCG.drX + 26} L${QCG.drX + 21} 468 H${QCG.drX - 21} Z" fill="rgba(170,200,235,.10)" stroke="#6d7f99" stroke-width="1.4"></path>
            <clipPath id="qBeakC"><path d="M${QCG.drX - 25} ${QCG.rcTop + 1} H${QCG.drX + 25} L${QCG.drX + 20} 467 H${QCG.drX - 20} Z"></path></clipPath>
            <g clip-path="url(#qBeakC)"><rect x="${QCG.drX - 25}" y="${QCG.rcTop + 1}" width="50" height="${467 - QCG.rcTop - 1}" fill="#5aa6d8" opacity="0.85" style="{{ beakerFillStyle }}"></rect></g>
            <g stroke="rgba(220,235,250,.35)" stroke-width="0.8">${[0.3, 0.55, 0.8].map((f) => `<line x1="${QCG.drX + 13}" y1="${(QCG.rcTop + f * (468 - QCG.rcTop)).toFixed(1)}" x2="${QCG.drX + 20}" y2="${(QCG.rcTop + f * (468 - QCG.rcTop)).toFixed(1)}"></line>`).join('')}</g>
            <g style="{{ waterDropStyle }}">
              ${[0, 0.36, 0.72, 1.08].map((b) => `<path d="M0 -3.6 C 1.9 -1.2, 2.8 0.4, 2.8 1.6 A 2.8 2.8 0 0 1 -2.8 1.6 C -2.8 0.4, -1.9 -1.2, 0 -3.6 Z" fill="#5aa6d8" stroke="#d4ecff" stroke-width="0.5" opacity="0"><animateTransform sc-camel-attribute-name="transform" type="translate" values="${QCG.drX} ${QCG.drOut + 4};${QCG.drX} ${QCG.dropEnd}" sc-camel-key-times="0;1" sc-camel-calc-mode="spline" sc-camel-key-splines="0.55 0 1 1" dur="1.44s" begin="${b}s" sc-camel-repeat-count="indefinite"></animateTransform><animate sc-camel-attribute-name="opacity" values="0;1;1;0" sc-camel-key-times="0;0.12;0.86;1" dur="1.44s" begin="${b}s" sc-camel-repeat-count="indefinite"></animate></path>`).join('')}
            </g>
            <text x="${QCG.drX}" y="482" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="var(--cap)">{{ qc3BeakerText }}</text>
            </sc-if>

            <!-- ===== RIGHT CALLOUTS ===== -->
            <g font-family="IBM Plex Sans">
              <line x1="${QCG.X(16)}" y1="${QCG.Y(-262)}" x2="${QCG.dotX - 2}" y2="122" stroke="rgba(95,176,255,.5)" stroke-width="1"></line>
              <circle cx="${QCG.dotX}" cy="122" r="2.6" fill="#5fb0ff"></circle>
              <text x="${QCG.txtX}" y="120" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--hdb)">WATER SIDE VALVE</text>
              <text x="${QCG.txtX}" y="132" font-family="IBM Plex Mono" font-size="8" fill="var(--lbl2)">{{ rsValveText }}</text>
              <line x1="${QCG.X(52)}" y1="238" x2="${QCG.dotX - 2}" y2="234" stroke="rgba(231,117,46,.55)" stroke-width="1"></line>
              <circle cx="${QCG.dotX}" cy="234" r="2.6" fill="#e7752e"></circle>
              <text x="${QCG.txtX}" y="232" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--acca)">HEATING JACKET</text>
              <foreignObject x="${QCG.txtX - 1}" y="235" width="140" height="14"><div style="margin:0; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:8.5px; line-height:1.1; white-space:nowrap; color:var(--acca);">Wrapped around the bottle</div></foreignObject>
              <line x1="${QCG.X(16)}" y1="${QCG.Y(262)}" x2="${QCG.dotX - 2}" y2="380" stroke="rgba(150,175,210,.45)" stroke-width="1"></line>
              <circle cx="${QCG.dotX}" cy="380" r="2.6" fill="#aebccf"></circle>
              <text x="${QCG.txtX}" y="378" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--lbl)">SAMPLE VALVE</text>
              <text x="${QCG.txtX}" y="390" font-family="IBM Plex Mono" font-size="8" fill="var(--lbl2)">{{ qc3SvText }}</text>
            </g>

            <sc-if value="{{ qcS3 }}" hint-placeholder-val="{{ false }}">
            <!-- ===== STEP 3: hydraulic water vs free water callouts ===== -->
            <g font-family="IBM Plex Sans">
              <line x1="312" y1="168" x2="${QCG.dotX - 2}" y2="164" stroke="rgba(95,176,255,.5)" stroke-width="1"></line>
              <circle cx="${QCG.dotX}" cy="164" r="2.6" fill="#5fb0ff"></circle>
              <text x="${QCG.txtX}" y="162" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--hdb)">HYDRAULIC WATER</text>
              <text x="${QCG.txtX}" y="174" font-family="IBM Plex Mono" font-size="8" fill="var(--lbl2)">pump side · above the piston</text>
              <line x1="312" y1="{{ qc3OilY }}" x2="${QCG.dotX - 2}" y2="284" stroke="rgba(231,177,90,.55)" stroke-width="1"></line>
              <circle cx="${QCG.dotX}" cy="284" r="2.6" fill="#e7b15a"></circle>
              <text x="${QCG.txtX}" y="282" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--acca)">OIL SAMPLE</text>
              <text x="${QCG.txtX}" y="294" font-family="IBM Plex Mono" font-size="8" fill="var(--lbl2)">{{ qc3OilSub }}</text>
              <line x1="312" y1="{{ qc3FwY }}" x2="${QCG.dotX - 2}" y2="330" stroke="rgba(95,176,255,.5)" stroke-width="1"></line>
              <circle cx="${QCG.dotX}" cy="330" r="2.6" fill="#38b6d6"></circle>
              <text x="${QCG.txtX}" y="328" font-size="11" font-weight="600" letter-spacing=".4" fill="var(--accw)">FREE WATER</text>
              <text x="${QCG.txtX}" y="340" font-family="IBM Plex Mono" font-size="8" fill="var(--lbl2)">{{ qc3FwSub }}</text>
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
