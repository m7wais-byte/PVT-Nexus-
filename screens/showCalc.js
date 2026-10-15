/* screen: showCalc  (8.9 KB) */
DC.slot('showCalc', `<sc-if value="{{ showCalc }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Module 05 — PVT Calculator" style="display:flex; flex-direction:column; height:var(--page-h);">
      
      <div style="flex:1; padding:16px 28px 20px; min-height:0; display:flex; flex-direction:column;">
        <sc-if value="{{ calcChoose }}" hint-placeholder-val="{{ true }}">
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:26px;">
          <div style="text-align:center;">
            <div style="font-size:20px; font-weight:600; color:var(--txt);">Select fluid type to calculate</div>
            <div style="font-size:13px; color:var(--mut); font-weight:300; margin-top:8px;">Choose the property workflow before entering the calculator.</div>
          </div>
          <div style="display:flex; gap:20px; flex-wrap:wrap; justify-content:center;">
            <button onclick="{{ pickGas }}" style="width:260px; text-align:left; cursor:pointer; font-family:inherit; color:var(--txt); background:linear-gradient(150deg,rgba(77,157,255,.10),var(--panel)); border:1px solid rgba(77,157,255,.3); border-radius:16px; padding:24px;" style-hover="border-color:var(--blue);">
              <div style="width:44px; height:44px; border-radius:11px; background:rgba(77,157,255,.12); border:1px solid var(--line2); display:flex; align-items:center; justify-content:center;">
                <svg width="22" height="22" sc-camel-view-box="0 0 24 24" fill="none"><circle cx="7" cy="9" r="2" stroke="var(--accb)" stroke-width="1.6"></circle><circle cx="14" cy="6" r="1.6" stroke="var(--accb)" stroke-width="1.6"></circle><circle cx="16" cy="13" r="2.4" stroke="var(--accb)" stroke-width="1.6"></circle><circle cx="9" cy="16" r="1.5" stroke="var(--accb)" stroke-width="1.6"></circle></svg>
              </div>
              <div style="font-size:17px; font-weight:600; color:var(--txt); margin-top:14px;">Gas Properties</div>
              <div style="font-size:12px; color:var(--mut); font-weight:300; line-height:1.5; margin-top:6px;">Z-factor, Bg, density, viscosity, pseudo-criticals, compressibility.</div>
              <div style="display:flex; align-items:center; gap:7px; margin-top:16px; font-size:12px; color:var(--blue); font-weight:500;">Open <svg width="14" height="14" sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
            </button>
            <button onclick="{{ pickOil }}" style="width:260px; text-align:left; cursor:pointer; font-family:inherit; color:var(--txt); background:linear-gradient(150deg,rgba(231,177,90,.08),var(--panel)); border:1px solid rgba(231,177,90,.28); border-radius:16px; padding:24px;" style-hover="border-color:var(--amb);">
              <div style="width:44px; height:44px; border-radius:11px; background:rgba(231,177,90,.10); border:1px solid var(--line2); display:flex; align-items:center; justify-content:center;">
                <svg width="22" height="22" sc-camel-view-box="0 0 24 24" fill="none"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" stroke="#e7b15a" stroke-width="1.6" stroke-linejoin="round"></path></svg>
              </div>
              <div style="font-size:17px; font-weight:600; color:var(--txt); margin-top:14px;">Oil Properties</div>
              <div style="font-size:12px; color:var(--mut); font-weight:300; line-height:1.5; margin-top:6px;">Rs, Bo, bubble-point, API, oil viscosity and compressibility.</div>
              <div style="display:flex; align-items:center; gap:7px; margin-top:16px; font-size:12px; color:var(--amb); font-weight:500;">Open <svg width="14" height="14" sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
            </button>
          </div>
        </div>
        </sc-if>

        <sc-if value="{{ calcGas }}" hint-placeholder-val="{{ false }}">
        <div style="flex:1; display:flex; flex-direction:column; min-height:0;">
          <div style="position:relative; overflow:hidden; border-radius:18px; border:1px solid rgba(95,176,255,.25); background:radial-gradient(120% 160% at 8% 0%,rgba(95,176,255,.12),transparent 60%),linear-gradient(155deg,var(--panel2),var(--panel) 65%); padding:16px 22px; margin-bottom:14px; box-shadow:0 1px 2px rgba(10,20,40,.04);">
            <div style="position:absolute; top:-60px; right:-40px; width:220px; height:220px; border-radius:50%; background:radial-gradient(circle,rgba(95,176,255,.20),transparent 70%); filter:blur(2px); pointer-events:none;"></div>
            <div style="position:absolute; inset:0 0 auto 0; height:1px; background:linear-gradient(90deg,transparent,rgba(95,176,255,.5),transparent);"></div>
            <div style="position:relative; display:flex; align-items:flex-start; justify-content:space-between; gap:20px; flex-wrap:wrap;">
              <div style="min-width:0;">
                <span style="display:inline-flex; align-items:center; gap:6px; font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1.4px; text-transform:uppercase; color:var(--accb3); padding:4px 10px; border-radius:999px; background:rgba(95,176,255,.10); border:1px solid rgba(95,176,255,.3);">
                  <span style="width:6px; height:6px; border-radius:50%; background:var(--accb3); box-shadow:0 0 8px var(--accb3);"></span>PVT Analysis Module
                </span>
                <div style="font-size:clamp(21px,1.9vw,26px); font-weight:700; color:var(--txt); letter-spacing:-.4px; margin-top:9px; line-height:1.15;">Gas Properties Calculator</div>
                <div style="font-size:12.5px; color:var(--txt2); font-weight:400; margin-top:5px; max-width:560px; text-wrap:pretty;">Calculate key petroleum fluid properties from user inputs</div>
              </div>
              <button onclick="{{ calcReset }}" style="flex:0 0 auto; font-family:inherit; font-size:12px; font-weight:500; padding:11px 18px; border-radius:10px; cursor:pointer; background:rgba(95,176,255,.10); border:1px solid rgba(95,176,255,.40); color:var(--accb3); white-space:nowrap;" style-hover="border-color:var(--accb3); background:rgba(95,176,255,.16);">← Change fluid type</button>
            </div>
          </div>
          <div ref="{{ gasCalcHost }}" style="flex:1; min-height:0; display:flex; flex-direction:column;"></div>
        </div>
        </sc-if>

        <sc-if value="{{ calcOil }}" hint-placeholder-val="{{ false }}">
        <div style="flex:1; display:flex; flex-direction:column; min-height:0;">
          <div style="position:relative; overflow:hidden; border-radius:18px; border:1px solid rgba(231,177,90,.25); background:radial-gradient(120% 160% at 8% 0%,rgba(231,177,90,.12),transparent 60%),linear-gradient(155deg,var(--panel2),var(--panel) 65%); padding:16px 22px; margin-bottom:14px; box-shadow:0 1px 2px rgba(10,20,40,.04);">
            <div style="position:absolute; top:-60px; right:-40px; width:220px; height:220px; border-radius:50%; background:radial-gradient(circle,rgba(231,177,90,.20),transparent 70%); filter:blur(2px); pointer-events:none;"></div>
            <div style="position:absolute; inset:0 0 auto 0; height:1px; background:linear-gradient(90deg,transparent,rgba(231,177,90,.5),transparent);"></div>
            <div style="position:relative; display:flex; align-items:flex-start; justify-content:space-between; gap:20px; flex-wrap:wrap;">
              <div style="min-width:0;">
                <span style="display:inline-flex; align-items:center; gap:6px; font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1.4px; text-transform:uppercase; color:var(--amb); padding:4px 10px; border-radius:999px; background:rgba(231,177,90,.10); border:1px solid rgba(231,177,90,.3);">
                  <span style="width:6px; height:6px; border-radius:50%; background:var(--amb); box-shadow:0 0 8px var(--amb);"></span>PVT Analysis Module
                </span>
                <div style="font-size:clamp(21px,1.9vw,26px); font-weight:700; color:var(--txt); letter-spacing:-.4px; margin-top:9px; line-height:1.15;">Oil Properties Calculator</div>
                <div style="font-size:12.5px; color:var(--txt2); font-weight:400; margin-top:5px; max-width:560px; text-wrap:pretty;">Calculate key petroleum fluid properties from user inputs</div>
              </div>
              <button onclick="{{ calcReset }}" style="flex:0 0 auto; font-family:inherit; font-size:12px; font-weight:500; padding:11px 18px; border-radius:10px; cursor:pointer; background:rgba(231,177,90,.10); border:1px solid rgba(231,177,90,.45); color:var(--amb); white-space:nowrap;" style-hover="border-color:var(--amb); background:rgba(231,177,90,.16);">← Change fluid type</button>
            </div>
          </div>
          <div ref="{{ oilCalcHost }}" style="flex:1; min-height:0; display:flex; flex-direction:column;"></div>
        </div>
        </sc-if>
      </div>
    </div>
    </sc-if>`);
