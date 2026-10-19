/* screen: showEquip — Dashboard > Equipment Library.
   The catalogue and inspection views are the native module components/EquipmentLibrary.js,
   mounted by Main.syncEquip() into eqHost. */
DC.slot('showEquip', `<sc-if value="{{ showEquip }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Equipment Library" class="pg" style="max-width:none; gap:10px;">
      <div class="pg-head">
        <span class="pg-icon" style="background:rgba(56,205,184,.14); color:var(--teal);"><svg sc-camel-view-box="0 0 24 24" fill="none"><rect x="8" y="6" width="8" height="15" rx="2.5" stroke="currentColor" stroke-width="1.7"></rect><path d="M10 6V3.5h4V6M12 3.5V2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8 12h8" stroke="currentColor" stroke-width="1.5"></path></svg></span>
        <div class="pg-titles">
          <span class="pg-eyebrow" style="color:var(--teal);">Equipment Library</span>
          <h2 class="pg-title">Sampling Equipment</h2>
          <p class="pg-desc">Inspect each item in 2D and 3D, exterior or cutaway, and select a part to read what it does.</p>
        </div>
        <div class="pg-end">
          <button onclick="{{ goDashboard }}" class="ui-btn ui-btn-ghost"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg><span>Back to Dashboard</span></button>
        </div>
      </div>
      <div style="flex:1 1 auto; min-height:0; position:relative;">
        <div ref="{{ eqHost }}" style="position:absolute; inset:0;"></div>
      </div>
    </div>
    </sc-if>`);
