/* component: StageVisc — Viscosity (ViscoLab PVT+ system schematic) */
(function () {

// Illustrative values. Travel time and viscosity are tied by the piston
// calibration constant K:   mu (cP) = K x travel time (s)
const FLUIDS = [
  { id:'cond',  label:'Thin',   name:'Gas condensate', mu:0.35, K:0.40, tint:'#4d9dff' },
  { id:'oil',   label:'Medium', name:'Medium crude',   mu:4.80, K:1.50, tint:'#2fb3a3' },
  { id:'heavy', label:'Thick',  name:'Heavy oil',      mu:180,  K:15.0, tint:'#e7b15a' }
];

class Component extends DCLogic {
  state = { fluid:'oil', running:false, pos:0, dir:1, coil:'', t:null };

  componentWillUnmount() { this.stop(); }
  stop() {
    (this.timers || []).forEach(clearTimeout); this.timers = [];
    if (this.raf) cancelAnimationFrame(this.raf); this.raf = null;
  }
  at(ms, fn) { this.timers = this.timers || []; this.timers.push(setTimeout(fn, PT(ms))); }

  f() { return FLUIDS.filter(f => f.id === this.state.fluid)[0]; }
  travel() { return this.f().mu / this.f().K; }      // seconds, physical
  animMs() { return 700 + this.travel() * 130; }     // slowed for viewing

  stroke() {
    if (!this.state.running) return;
    const dir = this.state.dir, from = dir > 0 ? 0 : 1, to = dir > 0 ? 1 : 0;
    const ms = PT(this.animMs()), t0 = performance.now();
    this.setState({ coil: dir > 0 ? 'DOWN' : 'UP' });
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      const e = p < .5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2)/2;
      this.setState({ pos: from + (to - from) * e });
      if (p < 1) { this.raf = requestAnimationFrame(tick); }
      else {
        this.raf = null;
        this.setState({ dir: -dir, t: this.travel() });
        this.at(120, () => this.stroke());
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  toggle() {
    if (this.state.running) { this.stop(); this.setState({ running:false, coil:'' }); return; }
    this.setState({ running:true });
    this.at(0, () => this.stroke());
  }
  pick(id) { this.stop(); this.setState({ fluid:id, running:false, pos:0, dir:1, coil:'', t:null }); }

  renderVals() {
    const f = this.f(), s = this.state;
    const muTxt = f.mu >= 100 ? f.mu.toFixed(0) : f.mu.toFixed(2);
    const off = '#7c8794';
    const y = 206 + 152 * s.pos;

    return {
      onBack: this.props.onBack,
      vsTint: f.tint,
      vsFluidName: f.name,

      vsFluids: FLUIDS.map(o => ({
        label: o.label,
        onClick: () => this.pick(o.id),
        style: 'font-family:inherit; font-size:12px; font-weight:' + (s.fluid === o.id ? '600' : '500') +
          '; white-space:nowrap; padding:8px 18px; border-radius:9px; cursor:pointer; background:' +
          (s.fluid === o.id ? o.tint + '22' : 'var(--icard)') + '; border:1px solid ' +
          (s.fluid === o.id ? o.tint : 'var(--line2)') + '; color:' +
          (s.fluid === o.id ? 'var(--txt)' : 'var(--txt2)') + ';'
      })),

      vsPistonY: y.toFixed(1),
      vsPistonY2: (y + 4).toFixed(1),
      vsPistonSeal1: (y + 8).toFixed(1),
      vsPistonSeal2: (y + 24).toFixed(1),
      vsPistonFill: f.tint,
      vsCoilTop: s.coil === 'UP' ? f.tint : off,
      vsCoilBot: s.coil === 'DOWN' ? f.tint : off,
      vsGlowTop: s.coil === 'UP' ? f.tint : 'none',
      vsGlowBot: s.coil === 'DOWN' ? f.tint : 'none',

      vsScreen: s.t == null ? '--.-- cP' : muTxt + ' cP',
      vsTravel: s.t == null ? '\u2014' : s.t.toFixed(2) + ' s',
      vsMu: s.t == null ? '\u2014' : muTxt + ' cP',
      vsMuColor: s.t == null ? 'var(--mut)' : f.tint,

      vsRun: () => this.toggle(),
      vsRunText: s.running ? 'Stop' : 'Start the piston',
      vsRunStyle: 'font-family:inherit; font-size:12.5px; font-weight:600; white-space:nowrap; padding:10px 22px; border-radius:9px; cursor:pointer; background:' +
        (s.running ? 'var(--icard)' : 'linear-gradient(180deg,#4d9dff,#2f6fd0)') + '; border:1px solid ' +
        (s.running ? 'var(--line2)' : 'var(--blue)') + '; color:' + (s.running ? 'var(--txt2)' : '#fff') + ';'
    };
  }
}

DC.define('StageVisc', {
  style: ``,
  template: `<div data-screen-label="Viscosity" style="height:var(--page-h); overflow:hidden; box-sizing:border-box; padding:14px clamp(18px,2.2vw,34px) 16px; max-width:1180px; width:100%; margin:0 auto; display:flex; flex-direction:column; gap:12px; background:var(--bg);">

  <!-- header -->
  <div style="display:flex; align-items:center; gap:20px; flex:0 0 auto;">
    <div style="flex:1; min-width:0;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="width:24px; height:3px; border-radius:2px; background:{{ vsTint }};"></span>
        <span style="font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--blue); font-weight:600;">Detailed PVT Analysis</span>
      </div>
      <div style="display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; margin-top:7px;">
        <h2 style="margin:0; font-size:clamp(21px,1.9vw,27px); font-weight:700; letter-spacing:-.7px; color:var(--txt);">Viscosity</h2>
        <p style="margin:0; font-size:12.5px; color:var(--txt2); font-weight:400;">High-pressure viscometer &#183; oscillating piston</p>
      </div>
    </div>
  </div>

  <div style="flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:12px; border-radius:16px; background:var(--panel); border:1px solid var(--line); padding:14px 16px 16px; box-shadow:0 1px 2px rgba(10,20,40,.04);">

    <div style="flex:1 1 auto; min-height:0; border-radius:12px; background:var(--inset); border:1px solid var(--line); padding:10px; max-width:940px; width:100%; margin:0 auto; display:flex;">
      <svg width="100%" height="100%" sc-camel-view-box="0 0 1000 580" fill="none" preserveAspectRatio="xMidYMid meet" style="display:block; flex:1; min-height:0;">

        <defs>
        <linearGradient id="vsSteel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"  stop-color="#5a6572"></stop><stop offset="10%" stop-color="#8b97a5"></stop>
        <stop offset="26%" stop-color="#e6ebef"></stop><stop offset="38%" stop-color="#aab4c0"></stop>
        <stop offset="56%" stop-color="#7c8794"></stop><stop offset="74%" stop-color="#c3ccd5"></stop>
        <stop offset="90%" stop-color="#79848f"></stop><stop offset="100%" stop-color="#4d5764"></stop>
        </linearGradient>
        <linearGradient id="vsSteelBar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#4e5865"></stop><stop offset="22%" stop-color="#9fabb8"></stop>
        <stop offset="50%" stop-color="#cbd3db"></stop><stop offset="78%" stop-color="#8a95a1"></stop>
        <stop offset="100%" stop-color="#464f5b"></stop>
        </linearGradient>
        <linearGradient id="vsPlate" x1="0" y1="0" x2="1" y2="0.25">
        <stop offset="0%" stop-color="#6f7a86"></stop><stop offset="14%" stop-color="#b6c0ca"></stop>
        <stop offset="34%" stop-color="#dde3e9"></stop><stop offset="55%" stop-color="#aeb9c4"></stop>
        <stop offset="78%" stop-color="#cfd7de"></stop><stop offset="100%" stop-color="#727d89"></stop>
        </linearGradient>
        <linearGradient id="vsTube" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8d99a5"></stop><stop offset="22%" stop-color="#eef2f5"></stop>
        <stop offset="55%" stop-color="#a9b4bf"></stop><stop offset="100%" stop-color="#6b7681"></stop>
        </linearGradient>
        <linearGradient id="vsCream" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#b9bcba"></stop><stop offset="12%" stop-color="#e8eae6"></stop>
        <stop offset="52%" stop-color="#f2f3ef"></stop><stop offset="88%" stop-color="#d2d5d1"></stop>
        <stop offset="100%" stop-color="#a9adaa"></stop>
        </linearGradient>
        <linearGradient id="vsHead" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#33383e"></stop><stop offset="18%" stop-color="#5a616a"></stop>
        <stop offset="60%" stop-color="#464c54"></stop><stop offset="100%" stop-color="#2a2f35"></stop>
        </linearGradient>
        <linearGradient id="vsConsole" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#666d76"></stop><stop offset="18%" stop-color="#4a515a"></stop>
        <stop offset="70%" stop-color="#343a42"></stop><stop offset="100%" stop-color="#23282e"></stop>
        </linearGradient>
        <linearGradient id="vsSlab" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#454b53"></stop><stop offset="45%" stop-color="#2e343a"></stop>
        <stop offset="100%" stop-color="#1d2227"></stop>
        </linearGradient>
        <linearGradient id="vsHose" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8b85a8"></stop><stop offset="30%" stop-color="#d3cfe6"></stop>
        <stop offset="62%" stop-color="#a9a3c6"></stop><stop offset="100%" stop-color="#726c90"></stop>
        </linearGradient>
        <linearGradient id="vsGlass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0a0f14"></stop><stop offset="40%" stop-color="#141c24"></stop>
        <stop offset="100%" stop-color="#080c11"></stop>
        </linearGradient>
        <linearGradient id="vsSheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".16"></stop>
        <stop offset="55%" stop-color="#ffffff" stop-opacity="0"></stop>
        </linearGradient>
        <filter id="vsShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="7"></feGaussianBlur>
        </filter>
        <filter id="vsShadowS" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="3.2"></feGaussianBlur>
        </filter>
        <filter id="vsGlow" x="-70%" y="-70%" width="240%" height="240%">
        <feGaussianBlur stdDeviation="5"></feGaussianBlur>
        </filter>
        </defs>

        <!-- ================= ground shadows ================= -->
        <g fill="#000" opacity=".28" filter="url(#vsShadow)">
        <ellipse cx="146" cy="478" rx="104" ry="16"></ellipse>
        <ellipse cx="520" cy="540" rx="205" ry="20"></ellipse>
        <ellipse cx="862" cy="512" rx="120" ry="15"></ellipse>
        </g>

        <!-- ================= support rod behind the frame ================= -->
        <g>
        <path d="M352 512 V 262 Q 352 150 452 142" stroke="#39424c" stroke-width="14"
        stroke-linecap="round" fill="none" opacity=".45"></path>
        <path d="M352 512 V 262 Q 352 150 452 142" stroke="url(#vsTube)" stroke-width="10"
        stroke-linecap="round" fill="none"></path>
        <path d="M348.5 505 V 262 Q 348.5 154 448 146" stroke="#ffffff" stroke-width="2"
        stroke-linecap="round" fill="none" opacity=".45"></path>
        </g>

        <!-- ================= black base plate ================= -->
        <polygon points="322,470 690,470 758,536 390,536" fill="url(#vsSlab)"></polygon>
        <polygon points="322,470 690,470 758,536 390,536" fill="url(#vsSheen)"></polygon>
        <polygon points="390,536 758,536 758,554 390,554" fill="#191d22"></polygon>
        <polygon points="322,470 390,536 390,554 322,488" fill="#22272c"></polygon>
        <polyline points="322,470 690,470 758,536 390,536 322,470" fill="none" stroke="#5d666f" stroke-width="1.1"></polyline>
        <line x1="390" y1="536" x2="758" y2="536" stroke="#6b747d" stroke-width="1"></line>
        <line x1="332" y1="476" x2="682" y2="476" stroke="#ffffff" opacity=".07" stroke-width="2.5"></line>
        <g fill="#3a4149">
        <rect x="340" y="554" width="24" height="9" rx="3"></rect>
        <rect x="716" y="554" width="24" height="9" rx="3"></rect>
        </g>

        <!-- cast shadow of the frame on the base -->
        <g fill="#000" opacity=".38" filter="url(#vsShadowS)">
        <ellipse cx="470" cy="502" rx="86" ry="12"></ellipse>
        <ellipse cx="628" cy="478" rx="30" ry="8"></ellipse>
        </g>

        <!-- ================= jacket hoses (bath -> measuring cell) ================= -->
        <g stroke="#000" opacity=".20" stroke-width="20" fill="none" stroke-linecap="round" filter="url(#vsShadowS)">
        <path d="M244 218 C 300 246, 318 258, 369 283"></path>
        <path d="M244 264 C 306 312, 352 350, 407 385"></path>
        </g>
        <g stroke="url(#vsHose)" stroke-width="17" fill="none" stroke-linecap="round">
        <path d="M242 213 C 298 241, 316 253, 367 278"></path>
        <path d="M242 259 C 304 307, 350 345, 405 380"></path>
        </g>
        <g stroke="#ffffff" stroke-width="2.8" fill="none" stroke-linecap="round" opacity=".34">
        <path d="M242 207 C 298 235, 316 247, 367 272"></path>
        <path d="M242 253 C 304 301, 350 339, 405 374"></path>
        </g>
        <g fill="url(#vsSteelBar)" stroke="#39424c">
        <rect x="252" y="203" width="17" height="21" rx="4"></rect>
        <rect x="252" y="249" width="17" height="21" rx="4"></rect>
        </g>

        <!-- ================= inclined frame + measuring cell ================= -->
        <g transform="rotate(-20 520 470)">

        <!-- open rectangular mounting frame -->
        <g opacity=".30" filter="url(#vsShadowS)" fill="#000">
        <rect x="424" y="102" width="204" height="17" rx="8"></rect>
        <rect x="424" y="465" width="204" height="17" rx="8"></rect>
        <rect x="424" y="102" width="17" height="380" rx="8"></rect>
        <rect x="611" y="102" width="17" height="380" rx="8"></rect>
        <rect x="436" y="140" width="180" height="15" rx="6"></rect>
        <rect x="436" y="430" width="180" height="15" rx="6"></rect>
        </g>
        <g fill="url(#vsSteelBar)" stroke="#5b6572" stroke-width="1">
        <rect x="418" y="96" width="204" height="17" rx="8"></rect>
        <rect x="418" y="459" width="204" height="17" rx="8"></rect>
        <rect x="418" y="96" width="17" height="380" rx="8"></rect>
        <rect x="605" y="96" width="17" height="380" rx="8"></rect>
        </g>
        <g stroke="#ffffff" opacity=".45" stroke-width="1.6" stroke-linecap="round">
        <line x1="422.5" y1="118" x2="422.5" y2="454"></line>
        <line x1="609.5" y1="118" x2="609.5" y2="454"></line>
        <line x1="440" y1="100.5" x2="600" y2="100.5"></line>
        </g>
        <g fill="#8e99a5" stroke="#5a6470" stroke-width="1">
        <circle cx="426.5" cy="104.5" r="5"></circle><circle cx="613.5" cy="104.5" r="5"></circle>
        <circle cx="426.5" cy="467.5" r="5"></circle><circle cx="613.5" cy="467.5" r="5"></circle>
        </g>

        <!-- cross braces the cell is clamped to -->
        <g fill="url(#vsSteelBar)" stroke="#5b6572">
        <rect x="430" y="134" width="180" height="15" rx="6"></rect>
        <rect x="430" y="424" width="180" height="15" rx="6"></rect>
        </g>

        <!-- feet on the base plate -->
        <rect x="446" y="474" width="56" height="24" rx="6" fill="#39424c" stroke="#2b333b"></rect>
        <rect x="546" y="474" width="56" height="24" rx="6" fill="#39424c" stroke="#2b333b"></rect>

        <!-- measuring cell body -->
        <rect x="476" y="120" width="92" height="338" rx="24" fill="#000" opacity=".30"
        transform="translate(6,6)" filter="url(#vsShadowS)"></rect>
        <rect x="474" y="118" width="92" height="338" rx="24" fill="url(#vsSteel)" stroke="#3c4550" stroke-width="1.4"></rect>
        <rect x="482" y="128" width="9" height="320" rx="4" fill="#ffffff" opacity=".5"></rect>
        <rect x="551" y="128" width="5" height="320" rx="2" fill="#ffffff" opacity=".18"></rect>
        <ellipse cx="520" cy="121" rx="46" ry="9" fill="#cbd4dc" stroke="#8792a0"></ellipse>

        <!-- upper detector coil -->
        <g>
        <rect x="456" y="158" width="128" height="36" rx="10" fill="{{ vsGlowTop }}" opacity=".7" filter="url(#vsGlow)"></rect>
        <rect x="458" y="160" width="124" height="32" rx="9" fill="url(#vsSteelBar)" stroke="#39424c"></rect>
        <rect x="461" y="163" width="118" height="5" rx="2" fill="#ffffff" opacity=".35"></rect>
        <rect x="464" y="176" width="112" height="10" rx="5" fill="{{ vsCoilTop }}"></rect>
        </g>

        <!-- cutaway : fluid-filled chamber + oscillating piston -->
        <rect x="486" y="192" width="68" height="216" rx="7" fill="#232b33" stroke="#161c22" stroke-width="1.4"></rect>
        <rect x="490" y="196" width="60" height="208" rx="5" fill="url(#vsGlass)"></rect>
        <rect x="492" y="198" width="56" height="204" rx="4" fill="{{ vsPistonFill }}" opacity=".42"></rect>
        <!-- the thin annular gap the fluid is forced through -->
        <rect x="492" y="198" width="9" height="204" rx="3" fill="{{ vsPistonFill }}"></rect>
        <rect x="539" y="198" width="9" height="204" rx="3" fill="{{ vsPistonFill }}"></rect>
        <g fill="#ffffff" opacity=".30">
        <rect x="494" y="206" width="2.6" height="188" rx="1.3"></rect>
        <rect x="541" y="206" width="2.6" height="188" rx="1.3"></rect>
        </g>
        <g fill="{{ vsPistonFill }}" opacity=".6">
        <circle cx="514" cy="212" r="2.6"></circle><circle cx="532" cy="236" r="2"></circle>
        <circle cx="509" cy="378" r="2.4"></circle><circle cx="531" cy="356" r="1.8"></circle>
        <circle cx="522" cy="318" r="1.8"></circle>
        </g>
        <!-- piston -->
        <rect x="497" y="{{ vsPistonY }}" width="46" height="36" rx="6" fill="url(#vsSteel)" stroke="#232b33" stroke-width="1.4"></rect>
        <rect x="502" y="{{ vsPistonY2 }}" width="8" height="28" rx="4" fill="#ffffff" opacity=".55"></rect>
        <rect x="497" y="{{ vsPistonSeal1 }}" width="46" height="4" rx="2" fill="#39424c"></rect>
        <rect x="497" y="{{ vsPistonSeal2 }}" width="46" height="4" rx="2" fill="#39424c"></rect>
        <rect x="486" y="192" width="68" height="216" rx="7" fill="url(#vsSheen)"></rect>

        <!-- lower detector coil -->
        <g>
        <rect x="456" y="408" width="128" height="36" rx="10" fill="{{ vsGlowBot }}" opacity=".7" filter="url(#vsGlow)"></rect>
        <rect x="458" y="410" width="124" height="32" rx="9" fill="url(#vsSteelBar)" stroke="#39424c"></rect>
        <rect x="461" y="413" width="118" height="5" rx="2" fill="#ffffff" opacity=".35"></rect>
        <rect x="464" y="426" width="112" height="10" rx="5" fill="{{ vsCoilBot }}"></rect>
        </g>

        <!-- jacket ports (one per hose) -->
        <g>
        <rect x="444" y="222" width="34" height="22" rx="5" fill="url(#vsSteelBar)" stroke="#39424c"></rect>
        <circle cx="440" cy="233" r="9.5" fill="#9aa5b1" stroke="#5f6a76"></circle>
        <circle cx="440" cy="233" r="4.5" fill="#6d7883"></circle>
        <rect x="444" y="332" width="34" height="22" rx="5" fill="url(#vsSteelBar)" stroke="#39424c"></rect>
        <circle cx="440" cy="343" r="9.5" fill="#9aa5b1" stroke="#5f6a76"></circle>
        <circle cx="440" cy="343" r="4.5" fill="#6d7883"></circle>
        </g>

        <!-- pressure fitting on the right face -->
        <g>
        <rect x="564" y="272" width="30" height="20" rx="5" fill="url(#vsSteelBar)" stroke="#39424c"></rect>
        <circle cx="598" cy="282" r="8" fill="#9aa5b1" stroke="#5f6a76"></circle>
        </g>

        <!-- top sample valve with red handle -->
        <rect x="488" y="86" width="64" height="34" rx="8" fill="url(#vsSteelBar)" stroke="#39424c"></rect>
        <rect x="491" y="89" width="58" height="6" rx="3" fill="#ffffff" opacity=".35"></rect>
        <rect x="512" y="56" width="16" height="32" rx="6" fill="url(#vsSteelBar)" stroke="#4a545f"></rect>
        <rect x="474" y="40" width="92" height="17" rx="8" fill="#c14a44"></rect>
        <rect x="480" y="43" width="80" height="5" rx="2" fill="#ffffff" opacity=".35"></rect>

        <!-- bottom drain valve with red handle -->
        <rect x="490" y="456" width="60" height="28" rx="7" fill="url(#vsSteelBar)" stroke="#39424c"></rect>
        <rect x="512" y="484" width="16" height="22" rx="6" fill="url(#vsSteelBar)" stroke="#4a545f"></rect>
        <rect x="482" y="504" width="76" height="15" rx="7" fill="#c14a44"></rect>
        </g>

        <!-- ================= julabo temperature circulator (left) ================= -->
        <g>
        <rect x="62" y="170" width="170" height="300" rx="10" fill="url(#vsCream)" stroke="#9ca19e"></rect>
        <rect x="62" y="170" width="170" height="300" rx="10" fill="url(#vsSheen)"></rect>
        <rect x="56" y="150" width="182" height="24" rx="9" fill="#c3c7c4" stroke="#9ca19e"></rect>
        <rect x="60" y="153" width="174" height="6" rx="3" fill="#ffffff" opacity=".55"></rect>
        <rect x="68" y="136" width="72" height="16" rx="5" fill="#8e948f" stroke="#767c78"></rect>
        <ellipse cx="104" cy="138" rx="33" ry="6" fill="#6f7570"></ellipse>
        <!-- circulator head -->
        <rect x="100" y="50" width="134" height="102" rx="10" fill="url(#vsHead)" stroke="#262b31"></rect>
        <rect x="104" y="54" width="126" height="7" rx="3" fill="#ffffff" opacity=".22"></rect>
        <rect x="182" y="40" width="34" height="12" rx="5" fill="#c0392f"></rect>
        <rect x="112" y="74" width="58" height="34" rx="4" fill="#151a20" stroke="#31363c"></rect>
        <text x="119" y="97" font-family="IBM Plex Mono, monospace" font-size="13" fill="#7ec8ff">114</text>
        <circle cx="202" cy="110" r="21" fill="#3d434a" stroke="#262b31"></circle>
        <circle cx="202" cy="110" r="15" fill="#565d65"></circle>
        <circle cx="202" cy="105" r="12" fill="#ffffff" opacity=".10"></circle>
        <circle cx="202" cy="110" r="5" fill="#20252b"></circle>
        <g fill="#8d949b">
        <rect x="114" y="118" width="16" height="9" rx="2"></rect><rect x="136" y="118" width="16" height="9" rx="2"></rect>
        <rect x="158" y="118" width="16" height="9" rx="2"></rect>
        </g>
        <!-- front panel -->
        <rect x="150" y="198" width="70" height="44" rx="6" fill="#9ca19c"></rect>
        <rect x="155" y="203" width="60" height="34" rx="4" fill="#5c625d"></rect>
        <rect x="208" y="207" width="14" height="7" rx="2" fill="#c0392f"></rect>
        <g>
        <rect x="148" y="270" width="72" height="100" rx="5" fill="#9aa09b"></rect>
        <g fill="#33383a">
        <rect x="152" y="274" width="64" height="9" rx="3"></rect><rect x="152" y="290" width="64" height="9" rx="3"></rect>
        <rect x="152" y="306" width="64" height="9" rx="3"></rect><rect x="152" y="322" width="64" height="9" rx="3"></rect>
        <rect x="152" y="338" width="64" height="9" rx="3"></rect><rect x="152" y="354" width="64" height="9" rx="3"></rect>
        </g>
        </g>
        <rect x="150" y="384" width="48" height="9" rx="3" fill="#c0392f"></rect>
        <text x="74" y="392" font-family="IBM Plex Sans, sans-serif" font-size="15" font-weight="700"
        letter-spacing="0.5" fill="#7c827e">julabo</text>
        <rect x="70" y="470" width="24" height="12" rx="3" fill="#8a908b"></rect>
        <rect x="200" y="470" width="24" height="12" rx="3" fill="#8a908b"></rect>
        </g>

        <!-- ================= stacked electronic control units (lower right) ================= -->
        <g>
        <!-- lower unit -->
        <rect x="752" y="428" width="222" height="78" rx="7" fill="url(#vsConsole)" stroke="#20252b"></rect>
        <rect x="752" y="428" width="222" height="78" rx="7" fill="url(#vsSheen)"></rect>
        <rect x="760" y="440" width="80" height="34" rx="3" fill="#12171c" stroke="#0b0f13"></rect>
        <text x="766" y="462" font-family="IBM Plex Mono, monospace" font-size="12" fill="#63d69a">- - . - -</text>
        <g fill="#5c646d">
        <rect x="852" y="440" width="112" height="7" rx="3"></rect>
        <rect x="852" y="452" width="112" height="7" rx="3"></rect>
        <rect x="852" y="464" width="112" height="7" rx="3"></rect>
        </g>
        <circle cx="770" cy="490" r="5" fill="#63d69a"></circle>
        <circle cx="788" cy="490" r="5" fill="#3a424a"></circle>
        <rect x="880" y="482" width="84" height="14" rx="4" fill="#3a424a" stroke="#20252b"></rect>
        <g fill="#2b3037">
        <rect x="768" y="506" width="26" height="10" rx="3"></rect>
        <rect x="932" y="506" width="26" height="10" rx="3"></rect>
        </g>

        <!-- upper unit : viscosity processor -->
        <rect x="766" y="344" width="196" height="86" rx="7" fill="url(#vsConsole)" stroke="#20252b"></rect>
        <rect x="766" y="344" width="196" height="86" rx="7" fill="url(#vsSheen)"></rect>
        <rect x="774" y="352" width="180" height="64" rx="4" fill="#12171c" stroke="#0b0f13"></rect>
        <rect x="779" y="357" width="170" height="54" rx="2" fill="#eef1f4"></rect>
        <rect x="779" y="357" width="170" height="13" fill="#2f6fd0"></rect>
        <text x="784" y="367" font-family="IBM Plex Sans, sans-serif" font-size="8" fill="#ffffff">VISCOSITY</text>
        <rect x="784" y="374" width="68" height="33" rx="2" fill="#ffffff" stroke="#c3ccd6"></rect>
        <g stroke="#dde3e9" stroke-width=".6">
        <line x1="784" y1="382" x2="852" y2="382"></line><line x1="784" y1="391" x2="852" y2="391"></line>
        <line x1="784" y1="400" x2="852" y2="400"></line>
        </g>
        <polyline points="788,403 800,395 812,398 824,384 836,377 848,379" fill="none"
        stroke="{{ vsPistonFill }}" stroke-width="2"></polyline>
        <rect x="858" y="374" width="86" height="22" rx="2" fill="#ffffff" stroke="#c3ccd6"></rect>
        <text x="863" y="390" font-family="IBM Plex Mono, monospace" font-size="13" font-weight="600" fill="#16202f">{{ vsScreen }}</text>
        <rect x="858" y="399" width="40" height="8" rx="2" fill="{{ vsPistonFill }}" opacity=".85"></rect>
        <rect x="903" y="399" width="41" height="8" rx="2" fill="#d7dde3"></rect>
        <rect x="774" y="352" width="180" height="64" rx="4" fill="url(#vsSheen)"></rect>
        <circle cx="782" cy="423" r="4" fill="#63d69a"></circle>
        <rect x="796" y="419" width="60" height="8" rx="3" fill="#4a525b"></rect>
        <circle cx="944" cy="423" r="5" fill="#2b3037" stroke="#8e959d"></circle>
        </g>

        <!-- ================= callouts ================= -->
        <g stroke="var(--mut)" stroke-width="1" opacity=".85" fill="none">
        <path d="M104 44 V 60"></path>
        <path d="M374 44 V 62"></path>
        <path d="M690 250 H 636 L 560 296"></path>
        <path d="M862 328 V 344"></path>
        </g>
        <g font-family="IBM Plex Sans, sans-serif" font-size="13" fill="var(--txt2)">
        <text x="40" y="36">Temperature bath &#8212; circulator</text>
        <text x="296" y="36">Measuring cell &#8212; 6 mL of sample inside</text>
        <text x="694" y="254">The fluid sits in the thin gap around the piston</text>
        <text x="700" y="322">Processor &#8212; times the piston, reads the viscosity</text>
        </g>

      </svg>
    </div>

    <!-- controls -->
    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:16px;">
      <button onclick="{{ vsRun }}" style="{{ vsRunStyle }}">{{ vsRunText }}</button>
      <span style="width:1px; height:24px; background:var(--line2); margin:0 4px;"></span>
      <sc-for list="{{ vsFluids }}" as="fl" hint-placeholder-count="3">
        <button onclick="{{ fl.onClick }}" style="{{ fl.style }}">{{ fl.label }}</button>
      </sc-for>
      <span style="flex:1 1 10px;"></span>
      <span style="font-size:12px; color:var(--mut);">{{ vsFluidName }}</span>
    </div>

    <!-- readout -->
    <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:14px;">
      <div style="padding:13px 16px; border-radius:11px; background:var(--icard); border:1px solid var(--line2);">
        <div style="font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:1.2px; text-transform:uppercase; color:var(--mut);">Time for one stroke</div>
        <div style="font-size:19px; font-weight:700; color:var(--txt); margin-top:5px; font-family:'IBM Plex Mono',monospace;">{{ vsTravel }}</div>
      </div>
      <div style="padding:13px 16px; border-radius:11px; background:var(--icard); border:1px solid var(--line2);">
        <div style="font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:1.2px; text-transform:uppercase; color:var(--mut);">Viscosity</div>
        <div style="font-size:19px; font-weight:700; margin-top:5px; color:{{ vsMuColor }};">{{ vsMu }}</div>
      </div>
    </div>
  </div>

</div>`,
  logic: Component
});
})();
