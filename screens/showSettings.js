/* screen: showSettings — working appearance preference */
DC.slot('showSettings', `<sc-if value="{{ showSettings }}" hint-placeholder-val="{{ false }}">
<main style="height:var(--page-h); overflow:auto; scrollbar-width:none; box-sizing:border-box; width:100%; max-width:900px; margin:0 auto; padding:clamp(20px,4vw,48px);">
  <header style="margin-bottom:28px;">
    <p style="margin:0 0 10px; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:1.4px; color:var(--accb3); text-transform:uppercase;">Settings</p>
    <h1 style="margin:0; font-size:32px; letter-spacing:-.6px; color:var(--txt);">Make yourself comfortable</h1>
    <p style="margin:12px 0 0; font-size:14px; color:var(--txt2); line-height:1.7;">Choose the appearance that works best for you.</p>
  </header>
  <section aria-label="Appearance" style="background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:clamp(20px,3vw,30px);">
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:24px;">
      <div style="flex:1 1 250px; min-width:0;">
        <h2 style="margin:0 0 10px; font-size:20px; color:var(--txt);">Appearance</h2>
        <p style="margin:0; font-size:14px; line-height:1.7; color:var(--txt2);">Current theme: <strong style="color:var(--txt);">{{ themeName }}</strong></p>
        <p style="margin:6px 0 0; font-size:13px; color:var(--txt2); line-height:1.7;">Applies throughout PVT Nexus and is saved in this browser.</p>
      </div>
      <button type="button" onclick="{{ toggleTheme }}" aria-label="Switch between light and dark themes" style="font-family:inherit; font-size:14px; font-weight:600; min-height:48px; min-width:160px; padding:12px 20px; border-radius:10px; border:1px solid var(--line2); background:var(--chipbg); color:var(--txt); cursor:pointer;">
        <sc-if value="{{ isLight }}" hint-placeholder-val="{{ true }}"><span>☾ &nbsp; Dark mode</span></sc-if>
        <sc-if value="{{ isDark }}" hint-placeholder-val="{{ false }}"><span>☀ &nbsp; Light mode</span></sc-if>
      </button>
    </div>
  </section>
  <p style="margin:20px 0 0; font-size:12px; color:var(--txt2); line-height:1.7;">Calculator units are selected inside the Oil and Gas calculators.</p>
</main>
</sc-if>`);
