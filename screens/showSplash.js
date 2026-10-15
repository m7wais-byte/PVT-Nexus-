/* screen: showSplash  (3.9 KB) */
DC.slot('showSplash', `<sc-if value="{{ showSplash }}" hint-placeholder-val="{{ true }}">
    <div style="position:relative; height:100vh; overflow:hidden; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:radial-gradient(125% 95% at 50% 42%, var(--sp1) 0%, var(--sp2) 55%, var(--sp3) 100%); overflow:hidden;">
      <div style="position:absolute; inset:0; background-image:linear-gradient(var(--sp-grid) 1px,transparent 1px),linear-gradient(90deg,var(--sp-grid) 1px,transparent 1px); background-size:46px 46px; pointer-events:none;"></div>
      <div style="position:absolute; top:44%; left:50%; transform:translate(-50%,-50%); width:840px; height:280px; background:linear-gradient(90deg, transparent 0%, var(--sp-glow) 50%, transparent 100%); filter:blur(18px); pointer-events:none;"></div>
      <div style="position:absolute; top:44%; left:50%; transform:translate(-50%,-50%); width:460px; height:460px; border:1px solid var(--sp-ring); border-radius:50%; pointer-events:none; animation:splashRing 6s ease-in-out infinite;"></div>
      <div style="position:absolute; top:44%; left:50%; transform:translate(-50%,-50%); width:640px; height:640px; border:1px solid var(--sp-ring2); border-radius:50%; pointer-events:none;"></div>

      <div style="position:relative; display:flex; flex-direction:column; align-items:center; text-align:center; padding:24px; margin-top:-32px; width:100%; max-width:660px;">
        <img src="assets/logo.png" alt="VAPS" style="height:84px; width:auto; display:block; filter:drop-shadow(0 2px 6px var(--sp-logo-shadow)); animation:splashUp .9s cubic-bezier(.2,.7,.3,1) both;">
        <h1 style="margin:18px 0 0; font-family:'IBM Plex Sans',sans-serif; font-size:clamp(46px,6.4vw,80px); font-weight:700; letter-spacing:-1.2px; line-height:1; color:var(--sp-title); animation:splashUp .9s cubic-bezier(.2,.7,.3,1) .12s both;">PVT Nexus</h1>
        <div style="width:56px; height:2px; margin:16px 0 13px; background:linear-gradient(90deg,transparent,var(--sp-divider),transparent); animation:splashUp .9s ease .2s both;"></div>
        <p style="margin:0; font-family:'IBM Plex Sans',sans-serif; font-size:clamp(16px,1.7vw,20px); font-weight:500; letter-spacing:.1px; color:var(--sp-sub); animation:splashUp .9s ease .28s both;">An Integrated Digital Reservoir Fluid Workflow</p>
        <p style="margin:9px 0 0; font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:500; letter-spacing:2px; text-transform:uppercase; color:var(--sp-mono); animation:splashUp .9s ease .36s both;">From Field Sampling to Fluid Insight</p>
        <button onclick="{{ enterDashboard }}" style="margin-top:28px; display:inline-flex; align-items:center; justify-content:center; gap:12px; white-space:nowrap; padding:14px 50px; border-radius:10px; border:1px solid rgba(255,255,255,.16); background:linear-gradient(135deg,#1d3f7a,#3169bd); color:#ffffff; font-family:'IBM Plex Sans',sans-serif; font-size:15px; font-weight:600; letter-spacing:.4px; cursor:pointer; box-shadow:0 5px 14px rgba(16,32,58,.22); transition:transform .2s ease, box-shadow .2s ease; animation:splashUp .9s ease .46s both;" style-hover="box-shadow:0 8px 18px rgba(16,32,58,.28); transform:translateY(-2px);">
          Enter Dashboard
          <svg width="17" height="17" sc-camel-view-box="0 0 24 24" fill="none" style="transition:transform .2s ease;" style-hover="transform:translateX(3px);"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
      </div>

      <div style="position:absolute; bottom:22px; left:0; right:0; text-align:center; padding:0 20px; animation:splashUp 1s ease .6s both;">
        <div style="font-family:'IBM Plex Sans',sans-serif; font-size:11.5px; letter-spacing:.2px; color:var(--sp-foot);">© 2026 Vision Advanced Petroleum Solution. Developed by Mohammed Hilal Al Awaisi. All rights reserved.</div>
      </div>
    </div>
    </sc-if>`);
