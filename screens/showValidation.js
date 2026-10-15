/* screen: showValidation  (6.1 KB) */
DC.slot('showValidation', `<sc-if value="{{ showValidation }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Validation" style="position:relative; height:var(--page-h); overflow:hidden; box-sizing:border-box; padding:18px clamp(20px,2.4vw,36px) 18px; max-width:1680px; width:100%; margin:0 auto; display:flex; flex-direction:column; gap:16px; background:var(--bg);">

      <!-- hero -->
      <div style="display:flex; align-items:center; gap:20px; flex:0 0 auto;">
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="width:24px; height:3px; border-radius:2px; background:var(--grn);"></span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--blue); font-weight:600;">Validation Control Centre</span>
          </div>
          <div style="display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; margin-top:7px;">
            <h2 style="margin:0; font-size:clamp(21px,1.9vw,27px); font-weight:700; letter-spacing:-.7px; color:var(--txt);">Validation</h2>
            <p style="margin:0; font-size:12.5px; color:var(--txt2); font-weight:400;">Open any validation procedure directly, or run the full validation sequence.</p>
          </div>
        </div>
        <div style="flex:0 0 auto; display:flex; align-items:center; gap:12px;">
          <span style="font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:1.3px; text-transform:uppercase; color:var(--mut); white-space:nowrap;">Sample Source</span>
          <span style="display:flex; align-items:center; gap:8px;">
            <sc-for list="{{ valSrcBtns }}" as="b" hint-placeholder-count="3">
              <button onclick="{{ b.onClick }}" style="{{ b.style }}">{{ b.label }}</button>
            </sc-for>
          </span>
        </div>
      </div>

      <!-- procedure tiles: 4 + 3, one 8-column grid so both rows share card width -->
      <div style="flex:0 1 auto; min-height:0; display:flex; flex-direction:column; gap:9px;">
        <div style="{{ valGridStyle }}">
          <sc-for list="{{ valCards }}" as="p" hint-placeholder-count="8">
            <button onclick="{{ p.onClick }}" class="{{ p.cls }}" style="{{ p.style }}">
              <span class="vc-head">
                <span class="vc-icon" style="{{ p.iconStyle }}"><svg sc-camel-view-box="0 0 24 24" fill="none"><path d="{{ p.icon }}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
                <span style="flex:1; min-width:0;"></span>
                <span style="{{ p.pillStyle }}">{{ p.status }}</span>
              </span>
              <span class="vc-title">{{ p.name }}</span>
              <span class="vc-desc card-desc">{{ p.desc }}</span>
              <span class="vc-foot">
                <span class="vc-open" style="{{ p.openStyle }}"><svg sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
              </span>
            </button>
          </sc-for>
        </div>
      </div>

      <!-- full sequence action -->
      <div style="flex:0 0 auto; box-sizing:border-box; min-height:64px; display:flex; align-items:center; justify-content:space-between; gap:18px; flex-wrap:wrap; padding:0 16px; border-radius:12px; background:var(--panel); border:1px solid var(--line); border-bottom:2.5px solid var(--grn); box-shadow:0 1px 2px rgba(10,20,40,.04);">
        <div style="min-width:0; display:flex; align-items:center; gap:12px;">
          <span style="width:32px; height:32px; flex:0 0 auto; border-radius:9px; background:rgba(70,211,154,.13); color:var(--grn); display:flex; align-items:center; justify-content:center;"><svg width="16" height="16" sc-camel-view-box="0 0 24 24" fill="none"><path d="M8 5l11 7-11 7V5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path></svg></span>
          <span style="font-size:13.5px; font-weight:700; letter-spacing:-.2px; color:var(--txt);">Run Full Validation Sequence</span>
        </div>
        <button onclick="{{ valRunAll }}" style="flex:0 0 auto; cursor:pointer; font-family:inherit; font-size:12.5px; font-weight:600; white-space:nowrap; height:38px; padding:0 24px; border-radius:10px; background:linear-gradient(180deg,#46d39a,#2f9d72); border:1px solid #2f9d72; color:#06231a; box-shadow:0 5px 14px rgba(47,157,114,.20);" style-hover="filter:brightness(1.05);">Activate All Procedures</button>
      </div>
    </div>
    </sc-if>`);
