/* screen: showAbout — concise project introduction */
DC.slot('showAbout', `<sc-if value="{{ showAbout }}" hint-placeholder-val="{{ false }}">
<main class="about" style="height:var(--page-h); overflow:auto; scrollbar-width:none; box-sizing:border-box; width:100%; max-width:1400px; margin:0 auto; padding:clamp(18px,3vw,44px); display:flex; flex-direction:column; gap:28px;">
  <header style="background:var(--panel); border:1px solid var(--line); border-radius:18px; padding:clamp(22px,3vw,40px);">
    <p style="margin:0 0 8px; font-size:12px; color:var(--accb3); letter-spacing:1px; text-transform:uppercase;">Developed by</p>
    <p style="margin:0 0 28px; font-size:clamp(20px,2.3vw,28px); font-weight:600; color:var(--txt); line-height:1.4;">Mohammed Hilal Al Awaisi</p>
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:20px;">
      <div style="flex:1 1 280px; min-width:0;">
        <h1 style="margin:0; font-size:clamp(28px,3vw,40px); letter-spacing:-.8px; color:var(--txt); line-height:1.2;">VAPS PVT Nexus</h1>
        <p style="margin:12px 0 0; font-size:16px; color:var(--accb3); line-height:1.5;">From field sampling to fluid insight.</p>
      </div>
      <img src="assets/logo.png" alt="VAPS" style="width:100px; max-width:100%; height:auto;">
    </div>
    <p style="max-width:780px; margin:24px 0 0; font-size:15px; color:var(--txt2); line-height:1.8;">An interactive training simulator covering field sampling, sample validation and PVT analysis through visual, step-by-step procedures. Developed during training at Vision Advanced Petroleum Solutions (VAPS).</p>
  </header>
  <section aria-label="What you can explore">
    <h2 style="margin:0 0 16px; font-size:19px; color:var(--txt);">What you can explore</h2>
    <ol style="list-style:none; padding:0; margin:0; display:flex; flex-wrap:wrap; gap:14px;"><li style="flex:1 1 170px; min-width:0; padding:20px; border:1px solid var(--line); border-radius:12px; background:var(--panel);"><span style="font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--accb3);">01</span><h3 style="font-size:16px; margin:16px 0 8px; color:var(--txt);">Sampling</h3><p style="font-size:13px; line-height:1.65; color:var(--txt2); margin:0;">Bottom-hole, wellhead and separator sampling.</p></li>
<li style="flex:1 1 170px; min-width:0; padding:20px; border:1px solid var(--line); border-radius:12px; background:var(--panel);"><span style="font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--accb3);">02</span><h3 style="font-size:16px; margin:16px 0 8px; color:var(--txt);">Validation</h3><p style="font-size:13px; line-height:1.65; color:var(--txt2); margin:0;">Prepare and check the sample before testing.</p></li>
<li style="flex:1 1 170px; min-width:0; padding:20px; border:1px solid var(--line); border-radius:12px; background:var(--panel);"><span style="font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--accb3);">03</span><h3 style="font-size:16px; margin:16px 0 8px; color:var(--txt);">PVT analysis</h3><p style="font-size:13px; line-height:1.65; color:var(--txt2); margin:0;">PV, differential liberation, separator tests, viscosity and GC.</p></li>
<li style="flex:1 1 170px; min-width:0; padding:20px; border:1px solid var(--line); border-radius:12px; background:var(--panel);"><span style="font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--accb3);">04</span><h3 style="font-size:16px; margin:16px 0 8px; color:var(--txt);">Calculators</h3><p style="font-size:13px; line-height:1.65; color:var(--txt2); margin:0;">Explore oil and gas properties with equations and pressure charts.</p></li>
<li style="flex:1 1 170px; min-width:0; padding:20px; border:1px solid var(--line); border-radius:12px; background:var(--panel);"><span style="font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--accb3);">05</span><h3 style="font-size:16px; margin:16px 0 8px; color:var(--txt);">Report</h3><p style="font-size:13px; line-height:1.65; color:var(--txt2); margin:0;">View a concise example of the program’s results.</p></li></ol>
  </section>
  <footer style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:10px 28px; padding:18px 0 0; border-top:1px solid var(--line); font-size:12px; line-height:1.7; color:var(--txt2);">
    <span>Training simulator · Illustrative examples · 2026</span>
    <a href="mailto:mohdhilalawaisi@gmail.com" style="color:var(--accb3); text-underline-offset:3px; overflow-wrap:anywhere;">mohdhilalawaisi@gmail.com</a>
  </footer>
</main>
</sc-if>`);
