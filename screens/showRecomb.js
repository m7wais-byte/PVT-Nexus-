/* screen: showRecomb — Validation > Recombination.
   The whole workspace (stage selector, schematic, panel) is the native module
   components/RecombSim.js, mounted by Main.syncRecomb() into rcHost. */
DC.slot('showRecomb', `<sc-if value="{{ showRecomb }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Recombination" class="pg">
      <div class="pg-head">
        <div class="pg-titles">
          <span class="pg-eyebrow">Validation</span>
          <h2 class="pg-title">Recombination</h2>
          <span style="{{ rcPillStyle }}">{{ rcPillText }}</span>
          <p class="pg-desc">Separator samples: charge 40 cc of measured gas (5,000 psig) and 179 cc of measured oil (3,000 psig) into one bottle, then invert to mix at a 5,000 psig working pressure.</p>
        </div>
        <div class="pg-end"><button type="button" class="bd-btn" data-bd-open="gas|oil" data-bd-ctx="Recombination · separator gas bottle (GSP), separator oil bottle and the recombination bottle (an Oil Sample Bottle)">Bottle Details</button><button type="button" class="bd-btn bd-inline" data-cd-open="" data-cd-ctx="Recombination · Pump A and Pump B, cell inlet at Port L">Cell Details</button></div>
      </div>
      <!-- shared Validation layout: RecombSim draws the simulation area (.vl-sim) and the sidebar (sections + .vl-dock) -->
      <div style="flex:1 1 auto; min-height:0; position:relative;">
        <div ref="{{ rcHost }}" style="position:absolute; inset:0;"></div>
      </div>
    </div>
    </sc-if>`);
