/* screen: showSettings  (2.4 KB) */
DC.slot('showSettings', `<sc-if value="{{ showSettings }}" hint-placeholder-val="{{ false }}">
    <div style="padding:40px 40px 48px; max-width:680px; width:100%; margin:0 auto;">
      <div style="font-family:'IBM Plex Mono'; font-size:11px; letter-spacing:1.5px; color:var(--blue); text-transform:uppercase; margin-bottom:10px;">Settings</div>
      <h1 style="margin:0 0 24px; font-size:30px; font-weight:600; letter-spacing:-0.4px; color:var(--txt);">Preferences</h1>
      <div style="background:var(--panel); border:1px solid var(--line); border-radius:14px; overflow:hidden;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--line);">
          <div><div style="font-size:14px; color:var(--txt);">Appearance</div><div style="font-size:12px; color:var(--mut); font-weight:300; margin-top:2px;">{{ themeDesc }}</div></div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-family:'IBM Plex Mono'; font-size:12px; letter-spacing:.4px; color:var(--btnt); min-width:38px; text-align:right;">{{ themeName }}</div>
            <div onclick="{{ toggleTheme }}" title="Toggle light / dark" style="{{ themeTrackStyle }}"><div style="{{ themeKnobStyle }}"></div></div>
          </div>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--line);">
          <div><div style="font-size:14px; color:var(--txt);">Live acquisition</div><div style="font-size:12px; color:var(--mut); font-weight:300; margin-top:2px;">Stream real-time conditions on the sampling board</div></div>
          <div style="width:40px; height:22px; border-radius:20px; background:rgba(77,157,255,.4); border:1px solid var(--blue); position:relative;"><div style="position:absolute; right:2px; top:1.5px; width:17px; height:17px; border-radius:50%; background:var(--txt2);"></div></div>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--line);">
          <div><div style="font-size:14px; color:var(--txt);">Flow animation</div><div style="font-size:12px; color:var(--mut); font-weight:300; margin-top:2px;">Animate fluid movement in the schematic</div></div>
          <div style="width:40px; height:22px; border-radius:20px; background:rgba(77,157,255,.4); border:1px solid var(--blue); position:relative;"><div style="position:absolute; right:2px; top:1.5px; width:17px; height:17px; border-radius:50%; background:var(--txt2);"></div></div>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px;">
          <div><div style="font-size:14px; color:var(--txt);">Pressure units</div><div style="font-size:12px; color:var(--mut); font-weight:300; margin-top:2px;">Display gauge values in psig</div></div>
          <div style="font-family:'IBM Plex Mono'; font-size:13px; color:var(--btnt); background:rgba(77,157,255,.10); border:1px solid var(--line2); padding:6px 14px; border-radius:8px;">psig</div>
        </div>
      </div>
    </div>
    </sc-if>`);
