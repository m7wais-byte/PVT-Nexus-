/* screen: showSplash  (3.9 KB) */
DC.slot('showSplash', `<sc-if value="{{ showSplash }}" hint-placeholder-val="{{ true }}">
    <style>
      @keyframes openingRingDrift { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(5px,-7px) scale(1.018); } }
      .opening-rings { transform-origin:410px 410px; animation:openingRingDrift 16s ease-in-out infinite; }
      @media (prefers-reduced-motion:reduce) { .opening-rings { animation:none; } }
    </style>
    <div style="position:relative; height:100dvh; min-height:480px; overflow:hidden; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:radial-gradient(125% 95% at 50% 42%, var(--sp1) 0%, var(--sp2) 55%, var(--sp3) 100%); overflow:hidden;">
      <div style="position:absolute; inset:0; background-image:linear-gradient(var(--sp-grid) 1px,transparent 1px),linear-gradient(90deg,var(--sp-grid) 1px,transparent 1px); background-size:64px 64px; opacity:.45; pointer-events:none;"></div>
      <svg aria-hidden="true" width="820" height="820" viewBox="0 0 820 820" style="position:absolute; top:46%; left:50%; transform:translate(-50%,-50%); width:min(88vw,820px); height:auto; pointer-events:none; color:var(--blue); overflow:visible;">
        <defs><radialGradient id="splashHalo"><stop offset="0%" stop-color="currentColor" stop-opacity=".065"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>
        <circle cx="410" cy="410" r="405" fill="url(#splashHalo)"/>
        <g class="opening-rings" fill="none" stroke="currentColor" stroke-width="1.25"><circle cx="410" cy="410" r="270" opacity=".23"/><circle cx="410" cy="410" r="335" opacity=".16"/><circle cx="410" cy="410" r="400" opacity=".10"/></g>
      </svg>

      <div style="position:relative; display:flex; flex-direction:column; align-items:center; text-align:center; padding:24px; box-sizing:border-box; margin-top:-32px; width:100%; max-width:760px;">
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; animation:splashUp .9s cubic-bezier(.2,.7,.3,1) both;">
          <img src="assets/logo.png" alt="VAPS" style="height:clamp(60px,8vw,80px); width:auto; display:block;">
          <h1 style="margin:0; font-family:'IBM Plex Sans',sans-serif; font-size:clamp(34px,5.2vw,50px); font-weight:700; letter-spacing:-1.2px; line-height:1.15; color:var(--txt);">PVT Nexus</h1>
        </div>
        <p style="margin:20px 0 0; font-family:'IBM Plex Sans',sans-serif; font-size:16px; line-height:1.6; font-weight:400; letter-spacing:.1px; color:var(--txt2); animation:splashUp .9s ease .28s both;">An Integrated Digital Reservoir Fluid Workflow</p>
        <p style="margin:6px 0 0; font-family:'IBM Plex Sans',sans-serif; font-size:14.5px; font-weight:600; color:var(--blue); animation:splashUp .9s ease .36s both;">From Sampling to Results</p>
        <button onclick="{{ enterDashboard }}" style="margin-top:28px; display:inline-flex; align-items:center; justify-content:center; gap:12px; white-space:nowrap; padding:14px 50px; border-radius:10px; border:1px solid rgba(255,255,255,.16); background:linear-gradient(135deg,#1d3f7a,#3169bd); color:#ffffff; font-family:'IBM Plex Sans',sans-serif; font-size:15px; font-weight:600; letter-spacing:.4px; cursor:pointer; box-shadow:0 5px 14px rgba(16,32,58,.22); transition:transform .2s ease, box-shadow .2s ease; animation:splashUp .9s ease .46s both;" style-hover="box-shadow:0 8px 18px rgba(16,32,58,.28); transform:translateY(-2px);">
          Enter Dashboard
          <svg width="17" height="17" sc-camel-view-box="0 0 24 24" fill="none" style="transition:transform .2s ease;" style-hover="transform:translateX(3px);"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
      </div>

      <div style="position:absolute; bottom:22px; left:0; right:0; text-align:center; padding:0 20px; animation:splashUp 1s ease .6s both;">
        <div style="font-family:'IBM Plex Sans',sans-serif; font-size:13px; font-weight:500; line-height:1.6; letter-spacing:.1px; color:var(--txt2);">© 2026 Vision Advanced Petroleum Solution. Developed by Mohammed Hilal Al Awaisi. All rights reserved.</div>
      </div>
    </div>
    </sc-if>`);
