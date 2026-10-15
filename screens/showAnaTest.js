/* screen: showAnaTest  (2.2 KB) */
DC.slot('showAnaTest', `<sc-if value="{{ showAnaTest }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="PVT Analysis Test" style="min-height:var(--page-h); box-sizing:border-box; padding:20px clamp(20px,2.2vw,36px); max-width:1680px; width:100%; margin:0 auto; display:flex; flex-direction:column; gap:16px; background:var(--bg);">
      <div style="display:flex; align-items:center; gap:20px; flex:0 0 auto;">
        <div style="flex:1; min-width:0;">
          <div style="font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--blue); font-weight:600;">PVT Analysis</div>
          <h2 style="margin:7px 0 0; font-size:clamp(20px,1.8vw,25px); font-weight:700; letter-spacing:-.6px; color:var(--txt);">{{ anaTestName }}</h2>
        </div>
        <button onclick="{{ backToAnalysis }}" style="flex:0 0 auto; display:flex; align-items:center; gap:7px; height:38px; padding:0 15px; border-radius:10px; font-family:inherit; font-size:12px; font-weight:500; white-space:nowrap; background:var(--panel); border:1px solid var(--line); color:var(--txt2); cursor:pointer;" style-hover="border-color:var(--blue); color:var(--txt);">
          <svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          Detailed PVT Analysis
        </button>
      </div>
      <div style="flex:1 1 auto; padding:64px 24px; border-radius:14px; background:var(--panel); border:1px solid var(--line); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; text-align:center; box-shadow:0 1px 2px rgba(10,20,40,.04);">
        <div style="font-size:15px; font-weight:600; color:var(--txt);">{{ anaTestName }}</div>
        <div style="font-size:13px; color:var(--txt2); font-weight:400; max-width:520px; text-wrap:pretty;">{{ anaTestDesc }}</div>
        <div style="font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.8px; text-transform:uppercase; color:var(--mut); margin-top:6px;">Module will be developed in the next stage</div>
      </div>
    </div>
    </sc-if>`);
