/* screen: showRecomb — Validation > Recombination.
   The whole workspace (stage selector, schematic, panel) is the native module
   components/RecombSim.js, mounted by Main.syncRecomb() into rcHost. */
DC.slot('showRecomb', `<sc-if value="{{ showRecomb }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Recombination" class="pg" style="max-width:none; padding-bottom:0; gap:6px;">
      <div class="pg-head">
        <span class="pg-icon" style="background:#6e9a3a1f; color:#6e9a3a;"><svg sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 3h4v7l-2.5 3M19 3h-4v7l2.5 3M6.5 13l5.5 4 5.5-4M12 17v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
        <div class="pg-titles">
          <span class="pg-eyebrow">Validation</span>
          <h2 class="pg-title">Recombination</h2>
          <span style="{{ rcPillStyle }}">{{ rcPillText }}</span>
          <p class="pg-desc">Separator samples: charge 40 cc of measured gas (5,000 psig) and 179 cc of measured oil (3,000 psig) into one bottle, then invert to mix at a 5,000 psig working pressure.</p>
        </div>
        <div class="pg-end"><button type="button" class="bd-btn" data-bd-open="gas|oil" data-bd-ctx="Recombination · separator gas bottle (GSP), separator oil bottle and the recombination bottle (an Oil Sample Bottle)">Bottle Details</button></div>
      </div>
      <div style="flex:1 1 auto; min-height:0; position:relative; margin:0 calc(-1 * var(--page-pad-x)); border-top:1px solid var(--line);">
        <div ref="{{ rcHost }}" style="position:absolute; inset:0;"></div>
      </div>
    </div>
    </sc-if>`);
