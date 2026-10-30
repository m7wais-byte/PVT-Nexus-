/* screen: showTopBar  (3.6 KB) */
DC.slot('showTopBar', `<sc-if value="{{ showTopBar }}" hint-placeholder-val="{{ false }}">
  <header class="tb" style="height:52px; flex:0 0 52px; background:var(--sidebar); border-bottom:1px solid var(--line); display:flex; align-items:center; gap:10px; padding:0 20px; position:sticky; top:0; z-index:50;">
    <div style="display:flex; align-items:center; flex:0 0 auto;">
      <img class="tb-logo" src="assets/logo.png" alt="VAPS" style="height:34px; width:auto; display:block;">
    </div>

    <sc-if value="{{ showNav }}" hint-placeholder-val="{{ false }}">
    <nav class="tb-nav" style="display:flex; align-items:center; gap:4px; flex:0 0 auto; margin-left:8px;">
      <button onclick="{{ goDashboard }}" style="{{ navDashStyle }}">
        <svg width="16" height="16" sc-camel-view-box="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"></rect><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"></rect><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"></rect><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"></rect></svg>
        Dashboard
      </button>
      <button onclick="{{ goAbout }}" style="{{ navAboutStyle }}">
        <svg width="16" height="16" sc-camel-view-box="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"></circle><path d="M12 11v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path><circle cx="12" cy="8" r="1" fill="currentColor"></circle></svg>
        About
      </button>
      <button onclick="{{ goSettings }}" style="{{ navSetStyle }}">
        <svg width="16" height="16" sc-camel-view-box="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 16 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="1.4"></path></svg>
        Settings
      </button>
    </nav>
    </sc-if>

    <div style="flex:1 1 auto;"></div>

    <!-- Explain Current Step: StepGuide moves its button into this slot (same place on every page) -->
    <div id="sgSlot" style="display:flex; align-items:center; flex:0 0 auto;"></div>

    <sc-if value="{{ showBack }}" hint-placeholder-val="{{ false }}">
      <button onclick="{{ goBack }}" title="{{ backTitle }}" class="ui-btn ui-btn-ghost" style="flex:0 0 auto;">
        <svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        <span>{{ backLabel }}</span>
      </button>
      <sc-if value="{{ showNav }}" hint-placeholder-val="{{ false }}">
        <div style="width:1px; height:22px; background:var(--line); flex:0 0 auto;"></div>
      </sc-if>
    </sc-if>

    <sc-if value="{{ showNav }}" hint-placeholder-val="{{ false }}">
    <button onclick="{{ toggleTheme }}" title="Toggle light / dark" class="ui-btn ui-btn-ghost" style="flex:0 0 auto;">
      <sc-if value="{{ isLight }}" hint-placeholder-val="{{ false }}">
        <svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path></svg>
        <span>Dark</span>
      </sc-if>
      <sc-if value="{{ isDark }}" hint-placeholder-val="{{ true }}">
        <svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.7"></circle><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg>
        <span>Light</span>
      </sc-if>
    </button>
    </sc-if>
  </header>
  </sc-if>`);
