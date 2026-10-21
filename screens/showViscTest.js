/* screen: showViscTest  (shared page shell for the three viscosity tests)
   Header / status / back button are shared. Each test has its OWN workspace
   block below — replace only that block when the test is developed. */
DC.slot('showViscTest', `<sc-if value="{{ showViscTest }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="{{ vtName }}" class="pg pg-stack" style="max-width:none;">

      <!-- compact page header (shared .pg-head) -->
      <div class="pg-head">
        <span class="pg-icon" style="{{ vtIconStyle }}"><svg sc-camel-view-box="0 0 24 24" fill="none"><path d="{{ vtIcon }}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
        <div class="pg-titles">
          <span class="pg-eyebrow">Viscosity</span>
          <h2 class="pg-title">{{ vtName }}</h2>
          <span style="{{ vtPillStyle }}; align-self:center; flex:0 0 auto;">{{ vtStatus }}</span>
          <p class="pg-desc">{{ vtDesc }}</p>
        </div>
        <div class="pg-end">
          <sc-if value="{{ vtIsSingleBtl }}" hint-placeholder-val="{{ false }}"><button type="button" class="bd-btn" data-bd-open="oil" data-bd-ctx="SPS/PDS sample bottle · feeding the viscometer">Bottle Details</button></sc-if>
          <sc-if value="{{ vtIsTwoCell }}" hint-placeholder-val="{{ false }}"><button type="button" class="bd-btn" data-cd-open="" data-cd-ctx="Two-Phase Viscosity · oil leaves at Port L, gas at Port R">Cell Details</button></sc-if>
          <button onclick="{{ viscBackToMenu }}" class="ui-btn ui-btn-ghost">
            <svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            Viscosity Tests
          </button>
        </div>
      </div>

      <div style="{{ vtWorkStyle }}">
        <!-- Kinematic Viscosity workspace — components/StageViscKin.js -->
        <sc-if value="{{ vtIsKin }}" hint-placeholder-val="{{ false }}">
          <dc-import name="StageViscKin" hint-size="100%,100%" on-status="{{ viscKinStatus }}"></dc-import>
        </sc-if>
        <!-- Single-Phase Viscosity workspace — components/StageViscSingle.js -->
        <sc-if value="{{ vtIsSingle }}" hint-placeholder-val="{{ false }}">
          <dc-import name="StageViscSingle" hint-size="100%,100%" on-status="{{ viscSingleStatus }}"></dc-import>
        </sc-if>
        <!-- Two-Phase Viscosity workspace — components/StageViscTwo.js -->
        <sc-if value="{{ vtIsTwo }}" hint-placeholder-val="{{ false }}">
          <dc-import name="StageViscTwo" hint-size="100%,100%" on-status="{{ viscTwoStatus }}"></dc-import>
        </sc-if>
      </div>
    </div>
    </sc-if>`);
