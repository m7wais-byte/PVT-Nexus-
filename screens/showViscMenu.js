/* screen: showViscMenu  (Viscosity Analysis selection — same layout as showAnalysis) */
DC.slot('showViscMenu', `<sc-if value="{{ showViscMenu }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Viscosity Analysis" class="menu-page" style="position:relative; min-height:var(--page-h); overflow-y:auto; overflow-x:hidden; box-sizing:border-box; padding:20px clamp(20px,2.2vw,36px); max-width:1680px; width:100%; margin:0 auto; display:flex; flex-direction:column; gap:16px; background:var(--bg);">

      <div class="menu-hero" style="display:flex; align-items:center; gap:20px; flex:0 0 auto;">
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="width:24px; height:3px; border-radius:2px; background:var(--amb);"></span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--blue); font-weight:600;">Detailed PVT Analysis &middot; Viscosity</span>
          </div>
          <div style="display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; margin-top:7px;">
            <h2 style="margin:0; font-size:clamp(21px,1.9vw,27px); font-weight:700; letter-spacing:-.7px; color:var(--txt);">Viscosity Analysis</h2>
            <p style="margin:0; font-size:12.5px; color:var(--txt2); font-weight:400;">Select a viscosity measurement method to continue.</p>
          </div>
        </div>
      </div>

      <div style="flex:0 0 auto; display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; align-items:baseline; gap:10px;">
          <span style="font-size:14px; font-weight:600; color:var(--txt);">Viscosity Tests</span>
        </div>
        <div class="menu-grid" style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; grid-auto-rows:minmax(210px,auto);">
          <sc-for list="{{ viscCards }}" as="a" hint-placeholder-count="3">
            <button onclick="{{ a.onClick }}" style="{{ a.style }}" style-hover="transform:translateY(-3px); box-shadow:0 2px 4px rgba(10,20,40,.05), 0 14px 28px rgba(10,20,40,.08);">
              <span style="display:flex; align-items:center; gap:12px; min-width:0;">
                <span style="{{ a.iconStyle }}"><svg width="24" height="24" sc-camel-view-box="0 0 24 24" fill="none"><path d="{{ a.icon }}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
                <span style="flex:1; min-width:0;"></span>
                <span style="{{ a.pillStyle }}">{{ a.status }}</span>
              </span>
              <span style="display:block; font-size:17px; font-weight:700; letter-spacing:-.3px; margin-top:16px; color:var(--txt);">{{ a.name }}</span>
              <span style="display:block; font-size:12.5px; color:var(--txt2); line-height:1.55; margin-top:8px; font-weight:400; text-wrap:pretty;">{{ a.desc }}</span>
              <span style="margin-top:auto; padding-top:16px; display:flex; align-items:center; justify-content:flex-end;">
                <span style="{{ a.openStyle }}"><svg width="14" height="14" sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
              </span>
            </button>
          </sc-for>
        </div>
      </div>
    </div>
    </sc-if>`);
