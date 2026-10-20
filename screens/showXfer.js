/* screen: showXfer  (21.4 KB) */
/* Sample Transfer receiving-bottle geometry (viewBox 0 0 900 545, floor y 512). One place for the SPS/PDS bottle
   centre / scale: the drawing below and Main.js (window.MX_GEO: flow-front lengths, valve position) read it.
   Upright bottle, valve outlets on the right; bottle-local (lx, ly) is drawn at (cx + s*lx, cy + s*ly). */
var MXG = (function () {
  var cx = 300, cy = 304, s = 0.55, r1 = function (v) { return Math.round(v * 10) / 10; };
  var g = { cx: cx, cy: cy, s: s, X: function (lx) { return r1(cx + s * lx); }, Y: function (ly) { return r1(cy + s * ly); } };
  var f = { x: cx, y: cy, s: s };
  var pT = window.BottleArt.oilPort(f, 'T'), pB = window.BottleArt.oilPort(f, 'B');   // sample (top) / driving (bottom) outlets
  g.pT = pT; g.pB = pB;
  // transfer line: MPSR fluid outlet (410, 92) -> left -> down the drop (line valve) -> left into the sample-valve side port
  g.dropX = 352; g.valveY = 106;
  g.xPath = 'M410 92 H' + g.dropX + ' V' + pT[1] + ' H' + pT[0];
  g.xLen = r1((410 - g.dropX) + (pT[1] - 92) + (g.dropX - pT[0]));
  g.xValveAt = (410 - g.dropX) + (g.valveY + 8 - 92);                 // line-valve body face along the line
  // displaced water: driving-valve side port -> right -> down into the receiver
  g.rcX = 396; g.rcTop = 472;
  g.wPath = 'M' + pB[0] + ' ' + pB[1] + ' H' + g.rcX + ' V' + (g.rcTop - 2);
  g.wLen = r1((g.rcX - pB[0]) + (g.rcTop - 2 - pB[1]));
  g.wArrowAt = 26; g.gaugeX = 372;
  // receiving-bottle stand: base plate under the bottle (the lower valve protector rests on it), rod + two clamps
  g.rodX = 222; g.plate = [196, 366]; g.clampY = [g.Y(-110), g.Y(110)]; g.jawX = r1(cx - s * 34);
  return g;
})();
window.MX_GEO = MXG;
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
        <div class="pg-end"><button type="button" class="bd-btn" data-bd-open="oil" data-bd-ctx="SPS/PDS receiving bottle">Bottle Details</button></div>
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
              ${BottleArt.defs('mx')}
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

            <!-- ===== TRANSFER LINE: MPSR FLUID SIDE -> SIDE PORT OF THE BOTTLE SAMPLE VALVE (approved right-angle valve) ===== -->
            <path d="${MXG.xPath}" fill="none" stroke="#0a0e16" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="${MXG.xPath}" fill="none" stroke="url(#mxPipe)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
            <!-- sample front: starts at the MPSR outlet, travels through the line and line valve to the bottle sample valve -->
            <path d="${MXG.xPath}" fill="none" stroke="#e7b15a" stroke-width="2.8" stroke-linejoin="round" stroke-dasharray="${Math.ceil(MXG.xLen + 4)} ${Math.ceil(MXG.xLen + 4)}" style="{{ mxXferFrontStyle }}"></path>
            <mask id="mxXferMask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="900" height="545"><path d="${MXG.xPath}" fill="none" stroke="#ffffff" stroke-width="10" stroke-linejoin="round" stroke-dasharray="${Math.ceil(MXG.xLen + 4)} ${Math.ceil(MXG.xLen + 4)}" style="{{ mxXferFrontStyle }}"></path></mask>
            <path d="${MXG.xPath}" fill="none" stroke="#fff1cf" stroke-width="2.2" stroke-dasharray="6 16" stroke-linecap="round" stroke-linejoin="round" mask="url(#mxXferMask)" style="{{ mxXferPulseStyle }}"><animate sc-camel-attribute-name="stroke-dashoffset" values="0;-22" dur="0.26s" sc-camel-repeat-count="indefinite"></animate></path>
            <polygon points="372,92 384,86 384,98" fill="#e7b15a" style="{{ mxArrowX1Style }}"></polygon>
            <polygon points="${MXG.pT[0] + 8},${MXG.pT[1]} ${MXG.pT[0] + 18},${MXG.pT[1] - 5} ${MXG.pT[0] + 18},${MXG.pT[1] + 5}" fill="#e7b15a" style="{{ mxArrowX2Style }}"></polygon>
            <rect x="${MXG.dropX - 12}" y="${MXG.valveY + 8}" width="24" height="16" rx="3" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="1"></rect>
            <circle cx="${MXG.dropX}" cy="${MXG.valveY}" r="9" fill="#0c1626" stroke="{{ mxValveRing }}" stroke-width="2.2" style="transition:stroke .3s ease;"></circle>
            <line x1="${MXG.dropX - 7.5}" y1="${MXG.valveY}" x2="${MXG.dropX + 7.5}" y2="${MXG.valveY}" stroke="#9fb6d6" stroke-width="1.8" stroke-linecap="round" style="{{ mxValveHandleStyle }}"></line>
            <text x="${MXG.dropX - 14}" y="${MXG.valveY - 2}" text-anchor="end" font-family="IBM Plex Mono" font-size="9.5" letter-spacing=".5" fill="var(--cap2)">{{ mxValveText }}</text>
            <text x="376" y="72" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" letter-spacing="1" fill="var(--cap2)">TRANSFER LINE</text>

            <!-- ===== RECEIVING-BOTTLE STAND: weighted base plate (the lower valve protector stands on it), upright rod,
                 two boss heads with arms and jaws on the barrel (left side - bore, valves and tubing stay clear) ===== -->
            <ellipse cx="${(MXG.plate[0] + MXG.plate[1]) / 2}" cy="512" rx="${(MXG.plate[1] - MXG.plate[0]) / 2 + 8}" ry="5" fill="rgba(0,0,0,.35)"></ellipse>
            <rect x="${MXG.plate[0]}" y="500" width="${MXG.plate[1] - MXG.plate[0]}" height="11" rx="3" fill="url(#mxCyl)" stroke="#0a0e16" stroke-width="1"></rect>
            <rect x="${MXG.plate[0] + 6}" y="496" width="${MXG.plate[1] - MXG.plate[0] - 12}" height="5" rx="2" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="0.6"></rect>
            <rect x="${MXG.rodX - 9}" y="488" width="18" height="9" rx="2" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <rect x="${MXG.rodX - 4.5}" y="196" width="9" height="293" fill="url(#mxPipe)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <rect x="${MXG.rodX - 7}" y="191" width="14" height="7" rx="2" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="0.7"></rect>
            ${MXG.clampY.map((y) => `<g>
              <rect x="${MXG.rodX + 4}" y="${y - 4}" width="${MXG.jawX - MXG.rodX - 10}" height="8" rx="3" fill="url(#mxPipe)" stroke="#0a0e16" stroke-width="0.7"></rect>
              <rect x="${MXG.rodX - 11}" y="${y - 10}" width="22" height="20" rx="3" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="0.8"></rect>
              <rect x="${MXG.rodX - 21}" y="${y - 3}" width="10" height="6" rx="1.5" fill="url(#mxPipe)" stroke="#0a0e16" stroke-width="0.6"></rect>
              <circle cx="${MXG.rodX - 23}" cy="${y}" r="4.5" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="0.7"></circle>
              <rect x="${MXG.jawX - 9}" y="${y - 15}" width="9" height="30" rx="3" fill="url(#mxMetal)" stroke="#0a0e16" stroke-width="0.8"></rect>
            </g>`).join('')}

            <!-- ===== SPS/PDS BOTTLE = approved Oil Sample Bottle, upright: sample side up, driving (water) side down =====
                 centre / scale = MXG (top of this file); Main.js fills / piston are in the bottle's bore units -->
            ${BottleArt.oil('mx', { x: MXG.cx, y: MXG.cy, s: MXG.s, bd: 'oil', ctx: 'SPS/PDS sample bottle · receiving the transferred sample',
              sample: '{{ mxBotFluidStyle }}', drive: '{{ mxBotWaterStyle }}', piston: '{{ mxBotPistonStyle }}',
              ringT: '{{ mxValveRing }}', needleT: '{{ mxBotNeedleT }}', ringB: '{{ mxValveRing }}', needleB: '{{ mxBotNeedleT }}' })}
            <text x="${MXG.rodX - 16}" y="300" text-anchor="end" font-family="IBM Plex Sans" font-size="13" font-weight="600" letter-spacing=".4" fill="var(--lbl)">SPS/PDS</text>
            <text x="${MXG.rodX - 16}" y="316" text-anchor="end" font-family="IBM Plex Mono" font-size="10" fill="var(--mut)">~800 cc</text>

            <!-- displaced water out of the driving-side valve side port to the receiver -->
            <path d="${MXG.wPath}" fill="none" stroke="#0a0e16" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="${MXG.wPath}" fill="none" stroke="url(#mxPipe)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"></path>
            <!-- displaced water front: starts at the bottle water port, travels the lower line to the receiver -->
            <path d="${MXG.wPath}" fill="none" stroke="#5aa6d8" stroke-width="2.4" stroke-linejoin="round" stroke-dasharray="${Math.ceil(MXG.wLen + 4)} ${Math.ceil(MXG.wLen + 4)}" style="{{ mxWoutFrontStyle }}"></path>
            <mask id="mxWoutMask" sc-camel-mask-units="userSpaceOnUse" x="0" y="0" width="900" height="545"><path d="${MXG.wPath}" fill="none" stroke="#ffffff" stroke-width="9" stroke-linejoin="round" stroke-dasharray="${Math.ceil(MXG.wLen + 4)} ${Math.ceil(MXG.wLen + 4)}" style="{{ mxWoutFrontStyle }}"></path></mask>
            <path d="${MXG.wPath}" fill="none" stroke="#d6eeff" stroke-width="1.8" stroke-dasharray="5 13" stroke-linecap="round" stroke-linejoin="round" mask="url(#mxWoutMask)" style="{{ mxWoutPulseStyle }}"><animate sc-camel-attribute-name="stroke-dashoffset" values="0;-18" dur="0.26s" sc-camel-repeat-count="indefinite"></animate></path>
            <polygon points="${MXG.pB[0] + 26},${MXG.pB[1]} ${MXG.pB[0] + 16},${MXG.pB[1] - 5} ${MXG.pB[0] + 16},${MXG.pB[1] + 5}" fill="#5aa6d8" style="{{ mxArrowWStyle }}"></polygon>
            <circle cx="${MXG.gaugeX}" cy="${MXG.pB[1]}" r="12" fill="url(#mxGauge)" stroke="#0a0e16" stroke-width="1.2"></circle>
            <circle cx="${MXG.gaugeX}" cy="${MXG.pB[1]}" r="8.6" fill="none" stroke="rgba(174,188,207,.45)" stroke-width="0.9"></circle>
            <line x1="${MXG.gaugeX}" y1="${MXG.pB[1]}" x2="${MXG.gaugeX + 6}" y2="${MXG.pB[1] - 6}" stroke="#8fd0ff" stroke-width="1.3" stroke-linecap="round"></line>
            <rect x="380" y="472" width="32" height="40" rx="3" fill="rgba(180,210,240,.06)" stroke="rgba(174,188,207,.5)" stroke-width="1"></rect>
            <rect x="382" y="474" width="28" height="36" fill="url(#mxWater)" opacity=".85" style="{{ mxBeakerStyle }}"></rect>
            <g stroke="rgba(220,235,250,.4)" stroke-width="0.8"><line x1="380" y1="482" x2="388" y2="482"></line><line x1="380" y1="492" x2="388" y2="492"></line><line x1="380" y1="502" x2="388" y2="502"></line></g>
            <text x="396" y="534" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" letter-spacing=".6" fill="var(--mut)">DISPLACED WATER</text>

            <!-- ===== CALLOUTS ===== -->
            <g font-family="IBM Plex Sans">
              <line x1="${MXG.X(30)}" y1="${MXG.Y(-292)}" x2="420" y2="214" stroke="rgba(231,177,90,.45)" stroke-width="1"></line>
              <circle cx="422" cy="214" r="2.6" fill="#e7b15a"></circle>
              <text x="430" y="218" font-size="12" font-weight="600" letter-spacing=".3" fill="var(--lbl)">Sample valve</text>
              <text x="430" y="231" font-family="IBM Plex Mono" font-size="9.5" fill="var(--mut)">right-angle · sample in</text>
              <line x1="${MXG.X(30)}" y1="${MXG.Y(292)}" x2="420" y2="414" stroke="rgba(90,166,216,.45)" stroke-width="1"></line>
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
