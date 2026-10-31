/* screen: showAbout */
DC.slot('showAbout', `<sc-if value="{{ showAbout }}" hint-placeholder-val="{{ false }}">
    <div class="about" style="height:var(--page-h); box-sizing:border-box; padding:14px 22px 16px; max-width:1500px; width:100%; margin:0 auto; display:flex; flex-direction:column; gap:11px; overflow:hidden;">

      <!-- top: brief + project information -->
      <div style="flex:0 0 auto; display:grid; grid-template-columns:minmax(0,1.42fr) minmax(0,1fr); gap:11px; align-items:stretch;">

        <div style="position:relative; overflow:hidden; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px 20px 14px;">
          <div style="position:absolute; inset:0; background:radial-gradient(120% 130% at 88% -20%, rgba(77,157,255,.16), transparent 62%); pointer-events:none;"></div>
          <div style="position:relative; display:flex; align-items:flex-start; gap:22px; flex-wrap:wrap;">
            <div style="flex:1 1 420px; min-width:0;">
              <div style="font-family:'IBM Plex Mono'; font-size:11px; letter-spacing:1.6px; color:var(--blue); text-transform:uppercase;">About</div>
              <h1 style="margin:6px 0 0; font-size:25px; font-weight:600; letter-spacing:-0.5px; color:var(--txt); line-height:1.1;">VAPS PVT Nexus</h1>
              <div style="font-size:13px; font-weight:400; color:var(--accb3); margin-top:4px; letter-spacing:.2px;">An Integrated Digital Reservoir Fluid Workflow</div>
              <p style="margin:8px 0 0; font-size:12.5px; line-height:1.55; color:var(--txt2); font-weight:400; text-wrap:pretty;">An interactive engineering simulator that visualises the complete reservoir-fluid journey - from field sampling and laboratory quality control to PVT testing, calculations and reporting. Every module follows the real order of operations, so the whole workflow can be followed end to end without touching a live sample.</p>
            </div>
            <div style="flex:0 0 auto; display:flex; align-items:center; padding:10px 14px; border-radius:12px; background:var(--icard); border:1px solid var(--line2);">
              <img src="assets/logo.png" alt="VAPS" style="height:36px; width:auto; display:block;">
            </div>
          </div>
          <div style="position:relative; margin-top:12px; padding-top:11px; border-top:1px solid var(--line);">
            <div style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:1.3px; text-transform:uppercase; color:var(--mut); margin-bottom:8px;">Workflow</div>
            <div style="display:flex; align-items:center; gap:9px; flex-wrap:wrap;">
            <span style="display:inline-flex; align-items:center; gap:9px;">
              <span style="font-family:'IBM Plex Mono'; font-size:11px; letter-spacing:.4px; padding:6px 11px; border-radius:8px; background:var(--icard); border:1px solid var(--line2); color:var(--txt2); white-space:nowrap;">Field Sampling</span>
              <svg width="16" height="10" sc-camel-view-box="0 0 16 10" fill="none" style="flex:0 0 auto; color:var(--accb3);"><path d="M1 5h11M9.5 1.5L13 5l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            </span>
            <span style="display:inline-flex; align-items:center; gap:9px;">
              <span style="font-family:'IBM Plex Mono'; font-size:11px; letter-spacing:.4px; padding:6px 11px; border-radius:8px; background:var(--icard); border:1px solid var(--line2); color:var(--txt2); white-space:nowrap;">Quality Check</span>
              <svg width="16" height="10" sc-camel-view-box="0 0 16 10" fill="none" style="flex:0 0 auto; color:var(--accb3);"><path d="M1 5h11M9.5 1.5L13 5l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            </span>
            <span style="display:inline-flex; align-items:center; gap:9px;">
              <span style="font-family:'IBM Plex Mono'; font-size:11px; letter-spacing:.4px; padding:6px 11px; border-radius:8px; background:var(--icard); border:1px solid var(--line2); color:var(--txt2); white-space:nowrap;">PVT Testing</span>
              <svg width="16" height="10" sc-camel-view-box="0 0 16 10" fill="none" style="flex:0 0 auto; color:var(--accb3);"><path d="M1 5h11M9.5 1.5L13 5l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            </span>
            <span style="display:inline-flex; align-items:center; gap:9px;">
              <span style="font-family:'IBM Plex Mono'; font-size:11px; letter-spacing:.4px; padding:6px 11px; border-radius:8px; background:var(--icard); border:1px solid var(--line2); color:var(--txt2); white-space:nowrap;">GC</span>
              <svg width="16" height="10" sc-camel-view-box="0 0 16 10" fill="none" style="flex:0 0 auto; color:var(--accb3);"><path d="M1 5h11M9.5 1.5L13 5l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            </span>
            <span style="display:inline-flex; align-items:center; gap:9px;">
              <span style="font-family:'IBM Plex Mono'; font-size:11px; letter-spacing:.4px; padding:6px 11px; border-radius:8px; background:var(--icard); border:1px solid var(--line2); color:var(--txt2); white-space:nowrap;">Calculations</span>
              <svg width="16" height="10" sc-camel-view-box="0 0 16 10" fill="none" style="flex:0 0 auto; color:var(--accb3);"><path d="M1 5h11M9.5 1.5L13 5l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            </span>
            <span style="display:inline-flex; align-items:center; gap:9px;">
              <span style="font-family:'IBM Plex Mono'; font-size:11px; letter-spacing:.4px; padding:6px 11px; border-radius:8px; background:var(--icard); border:1px solid var(--line2); color:var(--txt2); white-space:nowrap;">Report</span>
              
            </span>
            </div>
          </div>
        </div>

        <div style="background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:12px 15px 9px;">
          <div style="font-size:14px; font-weight:600; color:var(--txt); letter-spacing:.2px; margin-bottom:3px;">Project Information</div>
            <div style="display:flex; align-items:baseline; justify-content:space-between; gap:16px; padding:5px 0; border-bottom:1px solid var(--line);">
              <span style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:var(--mut); flex:0 0 auto;">Project</span>
              <span style="font-size:12px; color:var(--txt2); text-align:right; text-wrap:pretty;">VAPS PVT Nexus</span>
            </div>
            <div style="display:flex; align-items:baseline; justify-content:space-between; gap:16px; padding:5px 0; border-bottom:1px solid var(--line);">
              <span style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:var(--mut); flex:0 0 auto;">Developed by</span>
              <span style="font-size:12px; color:var(--txt2); text-align:right; text-wrap:pretty;">Mohammed Hilal Al Awaisi</span>
            </div>
            <div style="display:flex; align-items:baseline; justify-content:space-between; gap:16px; padding:5px 0; border-bottom:1px solid var(--line);">
              <span style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:var(--mut); flex:0 0 auto;">Organisation</span>
              <span style="font-size:12px; color:var(--txt2); text-align:right; text-wrap:pretty;">Vision Advanced Petroleum Solutions</span>
            </div>
            <div style="display:flex; align-items:baseline; justify-content:space-between; gap:16px; padding:5px 0; border-bottom:1px solid var(--line);">
              <span style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:var(--mut); flex:0 0 auto;">Calculators</span>
              <span style="font-size:12px; color:var(--txt2); text-align:right; text-wrap:pretty;">Calculator files developed by Khalid and integrated into the PVT Nexus workflow</span>
            </div>
            <div style="display:flex; align-items:baseline; justify-content:space-between; gap:16px; padding:5px 0; border-bottom:1px solid var(--line);">
              <span style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:var(--mut); flex:0 0 auto;">Version</span>
              <span style="font-size:12px; color:var(--txt2); text-align:right; text-wrap:pretty;">v2.4</span>
            </div>
            <div style="display:flex; align-items:baseline; justify-content:space-between; gap:16px; padding:5px 0; border-bottom:1px solid var(--line);">
              <span style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:var(--mut); flex:0 0 auto;">Year</span>
              <span style="font-size:12px; color:var(--txt2); text-align:right; text-wrap:pretty;">2026</span>
            </div>
        </div>
      </div>

      <!-- short brief -->
      <div style="flex:0 0 auto; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px;">
        <div style="background:var(--panel); border:1px solid var(--line); border-radius:11px; padding:9px 13px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--blue);"></span>
            <div style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1.2px; text-transform:uppercase; color:var(--mut);">Purpose</div>
          </div>
          <div style="font-size:12px; line-height:1.5; color:var(--txt2); margin-top:4px; text-wrap:pretty;">Make complex PVT workflows easier to understand, practise and review.</div>
        </div>
        <div style="background:var(--panel); border:1px solid var(--line); border-radius:11px; padding:9px 13px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--blue);"></span>
            <div style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1.2px; text-transform:uppercase; color:var(--mut);">Current Stage</div>
          </div>
          <div style="font-size:12px; line-height:1.5; color:var(--txt2); margin-top:4px; text-wrap:pretty;">Interactive prototype under continuous technical development.</div>
        </div>
        <div style="background:var(--panel); border:1px solid var(--line); border-radius:11px; padding:9px 13px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--blue);"></span>
            <div style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1.2px; text-transform:uppercase; color:var(--mut);">Main Users</div>
          </div>
          <div style="font-size:12px; line-height:1.5; color:var(--txt2); margin-top:4px; text-wrap:pretty;">Engineers, laboratory personnel, trainees and technical learners.</div>
        </div>
      </div>

      <!-- section bar -->
      <div style="flex:0 0 auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:1.3px; text-transform:uppercase; color:var(--mut); margin-right:4px;">Sections</span>
        <sc-for list="{{ abTabs }}" as="t" hint-placeholder-count="4">
          <button onclick="{{ t.onClick }}" style="{{ t.style }}">{{ t.label }}</button>
        </sc-for>
      </div>

      <!-- section content -->
      <div style="flex:1; min-height:0; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:13px 16px 15px; overflow:hidden;">
      <sc-if value="{{ abIsModules }}" hint-placeholder-val="{{ true }}">
      <div style="height:100%; display:flex; flex-direction:column;">
        <div style="flex:0 0 auto; display:flex; align-items:baseline; justify-content:space-between; gap:14px; margin-bottom:11px;">
          <div style="font-size:15px; font-weight:600; color:var(--txt); letter-spacing:.2px;">Main Modules</div>
          <div style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1px; color:var(--mut); text-transform:uppercase;">5 connected stages</div>
        </div>
        <div style="flex:1; min-height:0; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:11px;">
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 14px 13px; display:flex; flex-direction:column; gap:8px;">
            <span style="width:34px; height:34px; border-radius:10px; background:var(--panel); border:1px solid var(--line2); display:flex; align-items:center; justify-content:center; color:var(--accb3); flex:0 0 auto;"><svg width="19" height="19" sc-camel-view-box="0 0 24 24" fill="none" style="flex:0 0 auto;"><path d="M12 3v7M12 21v-4M6 10h12l-1.6 7H7.6L6 10Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path></svg></span>
            <div style="font-size:13px; font-weight:600; color:var(--txt); letter-spacing:.2px;">Field Sampling</div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Bottom hole, wellhead and separator sampling paths, each with live tool, bottle and flow behaviour.</div>
            <div style="margin-top:auto; padding-top:9px; border-top:1px solid var(--line); font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.8px; text-transform:uppercase; color:var(--mut2); text-wrap:pretty;">Open hole - cased hole - wellhead - separator</div>
          </div>
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 14px 13px; display:flex; flex-direction:column; gap:8px;">
            <span style="width:34px; height:34px; border-radius:10px; background:var(--panel); border:1px solid var(--line2); display:flex; align-items:center; justify-content:center; color:var(--accb3); flex:0 0 auto;"><svg width="19" height="19" sc-camel-view-box="0 0 24 24" fill="none" style="flex:0 0 auto;"><path d="M12 3l7 3v6c0 4-3 6.6-7 9-4-2.4-7-5-7-9V6l7-3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path><path d="M9 12l2.2 2.2L15 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg></span>
            <div style="font-size:13px; font-weight:600; color:var(--txt); letter-spacing:.2px;">Validation</div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Sample receipt and quality control: opening pressure, restoration to reservoir conditions, water drainage and 180° inversion agitation.</div>
            <div style="margin-top:auto; padding-top:9px; border-top:1px solid var(--line); font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.8px; text-transform:uppercase; color:var(--mut2); text-wrap:pretty;">Opening pressure - restoration - agitation</div>
          </div>
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 14px 13px; display:flex; flex-direction:column; gap:8px;">
            <span style="width:34px; height:34px; border-radius:10px; background:var(--panel); border:1px solid var(--line2); display:flex; align-items:center; justify-content:center; color:var(--accb3); flex:0 0 auto;"><svg width="19" height="19" sc-camel-view-box="0 0 24 24" fill="none" style="flex:0 0 auto;"><path d="M9 3h6M10 3v6.5L6.5 17A3 3 0 0 0 9.2 21h5.6A3 3 0 0 0 17.5 17L14 9.5V3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path></svg></span>
            <div style="font-size:13px; font-weight:600; color:var(--txt); letter-spacing:.2px;">PVT Testing</div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Charging the PVT cell and running the analysis programme on the restored sample.</div>
            <div style="margin-top:auto; padding-top:9px; border-top:1px solid var(--line); font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.8px; text-transform:uppercase; color:var(--mut2); text-wrap:pretty;">CCE - differential liberation - separator - GC</div>
          </div>
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 14px 13px; display:flex; flex-direction:column; gap:8px;">
            <span style="width:34px; height:34px; border-radius:10px; background:var(--panel); border:1px solid var(--line2); display:flex; align-items:center; justify-content:center; color:var(--accb3); flex:0 0 auto;"><svg width="19" height="19" sc-camel-view-box="0 0 24 24" fill="none" style="flex:0 0 auto;"><rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" stroke-width="1.6"></rect><path d="M8 8h8M8 12h3M8 16h3M14.5 12v4M13 14h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg></span>
            <div style="font-size:13px; font-weight:600; color:var(--txt); letter-spacing:.2px;">Calculations</div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Native oil and gas property calculators running standard industry correlations beside the workflow.</div>
            <div style="margin-top:auto; padding-top:9px; border-top:1px solid var(--line); font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.8px; text-transform:uppercase; color:var(--mut2); text-wrap:pretty;">Oil correlations - gas correlations - batch AAE</div>
          </div>
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 14px 13px; display:flex; flex-direction:column; gap:8px;">
            <span style="width:34px; height:34px; border-radius:10px; background:var(--panel); border:1px solid var(--line2); display:flex; align-items:center; justify-content:center; color:var(--accb3); flex:0 0 auto;"><svg width="19" height="19" sc-camel-view-box="0 0 24 24" fill="none" style="flex:0 0 auto;"><path d="M6 3h8l4 4v14H6V3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path><path d="M14 3v4h4M9 12h6M9 16h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg></span>
            <div style="font-size:13px; font-weight:600; color:var(--txt); letter-spacing:.2px;">Reporting</div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">A structured PVT report assembled from the sampling, QC and test records in the client format.</div>
            <div style="margin-top:auto; padding-top:9px; border-top:1px solid var(--line); font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.8px; text-transform:uppercase; color:var(--mut2); text-wrap:pretty;">Tables - figures - appendices - export</div>
          </div>
        </div>
      </div>
      </sc-if>
      <sc-if value="{{ abIsHow }}" hint-placeholder-val="{{ false }}">
      <div style="height:100%; display:flex; flex-direction:column;">
        <div style="flex:0 0 auto; display:flex; align-items:baseline; justify-content:space-between; gap:14px; margin-bottom:11px;">
          <div style="font-size:15px; font-weight:600; color:var(--txt); letter-spacing:.2px;">How It Works</div>
          <div style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1px; color:var(--mut); text-transform:uppercase;">Simple on screen, detailed underneath</div>
        </div>
        <div style="flex:0 0 auto; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:11px;">
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 14px 13px; display:flex; flex-direction:column; gap:7px;">
            <div style="display:flex; align-items:center; gap:9px;">
              <span style="width:26px; height:26px; border-radius:50%; background:var(--panel); border:1.5px solid var(--accb3); color:var(--accb3); font-family:'IBM Plex Mono'; font-size:10.5px; display:flex; align-items:center; justify-content:center; flex:0 0 auto;">01</span>
              <div style="font-size:12.5px; font-weight:600; color:var(--txt); letter-spacing:.2px; min-width:0;">Guided procedure</div>
            </div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Each screen runs the real sequence of operations. One action unlocks the next, so the order itself teaches the procedure instead of being a free-form sandbox.</div>
          </div>
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 14px 13px; display:flex; flex-direction:column; gap:7px;">
            <div style="display:flex; align-items:center; gap:9px;">
              <span style="width:26px; height:26px; border-radius:50%; background:var(--panel); border:1.5px solid var(--accb3); color:var(--accb3); font-family:'IBM Plex Mono'; font-size:10.5px; display:flex; align-items:center; justify-content:center; flex:0 0 auto;">02</span>
              <div style="font-size:12.5px; font-weight:600; color:var(--txt); letter-spacing:.2px; min-width:0;">Linked process model</div>
            </div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Valves, pistons, fluid levels, pressures and volumes are driven by one shared sample state, so every element on screen moves together and stays consistent between steps.</div>
          </div>
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 14px 13px; display:flex; flex-direction:column; gap:7px;">
            <div style="display:flex; align-items:center; gap:9px;">
              <span style="width:26px; height:26px; border-radius:50%; background:var(--panel); border:1.5px solid var(--accb3); color:var(--accb3); font-family:'IBM Plex Mono'; font-size:10.5px; display:flex; align-items:center; justify-content:center; flex:0 0 auto;">03</span>
              <div style="font-size:12.5px; font-weight:600; color:var(--txt); letter-spacing:.2px; min-width:0;">Representative values</div>
            </div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Readings are illustrative values chosen to represent a realistic run. The oil and gas calculators are the exception - they compute live from full industry correlations.</div>
          </div>
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 14px 13px; display:flex; flex-direction:column; gap:7px;">
            <div style="display:flex; align-items:center; gap:9px;">
              <span style="width:26px; height:26px; border-radius:50%; background:var(--panel); border:1.5px solid var(--accb3); color:var(--accb3); font-family:'IBM Plex Mono'; font-size:10.5px; display:flex; align-items:center; justify-content:center; flex:0 0 auto;">04</span>
              <div style="font-size:12.5px; font-weight:600; color:var(--txt); letter-spacing:.2px; min-width:0;">Continuous record</div>
            </div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">The same sample carries through sampling, validation and testing, and the results it produces are what the Final Report is assembled from.</div>
          </div>
        </div>
        <div style="flex:1 1 auto; min-height:0; margin-top:11px; padding:13px 16px; border-radius:12px; background:var(--icard); border:1px solid var(--line2); border-left:2.5px solid var(--accb3); display:flex; align-items:center; overflow:hidden;">
          <div style="font-size:12.5px; line-height:1.6; color:var(--txt2); text-wrap:pretty;"><span style="color:var(--txt); font-weight:600;">General terms on the surface, deep logic underneath.</span> Panels are labelled in everyday laboratory language so the workflow stays readable at a glance. Behind each of those labels sits the detailed engineering model - the real operational order, tool and bottle geometry, phase behaviour, pressure and volume bookkeeping, and the constraints that decide whether a step is even allowed to proceed. What is shown on screen is the summary; the reasoning behind it runs on every step.</div>
        </div>
      </div>
      </sc-if>
      <sc-if value="{{ abIsEvo }}" hint-placeholder-val="{{ false }}">
      <div style="height:100%; display:flex; flex-direction:column;">
        <div style="flex:0 0 auto; display:flex; align-items:baseline; justify-content:space-between; gap:14px; margin-bottom:11px;">
          <div style="font-size:15px; font-weight:600; color:var(--txt); letter-spacing:.2px;">Project Evolution</div>
          <div style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1px; color:var(--mut); text-transform:uppercase;">How the simulator developed into its current form</div>
        </div>
        <div style="flex:1; min-height:0; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; align-content:start;">
            <div style="min-width:0; display:flex; flex-direction:column; gap:9px;">
              <div style="display:flex; align-items:center; gap:0;">
                <span style="width:12px; height:12px; border-radius:50%; flex:0 0 auto; background:var(--panel); border:1.8px solid var(--blue);"></span>
                <span style="flex:1; height:1.5px; background:var(--line2);"></span>
              </div>
              <div style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:1px; color:var(--mut2);">01</div>
              <div style="font-size:13px; font-weight:600; color:var(--txt); text-wrap:pretty;">Idea</div>
              <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">A visual way to explain how PVT laboratory work is actually carried out.</div>
            </div>
            <div style="min-width:0; display:flex; flex-direction:column; gap:9px;">
              <div style="display:flex; align-items:center; gap:0;">
                <span style="width:12px; height:12px; border-radius:50%; flex:0 0 auto; background:var(--panel); border:1.8px solid var(--blue);"></span>
                <span style="flex:1; height:1.5px; background:var(--line2);"></span>
              </div>
              <div style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:1px; color:var(--mut2);">02</div>
              <div style="font-size:13px; font-weight:600; color:var(--txt); text-wrap:pretty;">First Draft</div>
              <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">The first sampling and testing screens, drawn as a single walkthrough.</div>
            </div>
            <div style="min-width:0; display:flex; flex-direction:column; gap:9px;">
              <div style="display:flex; align-items:center; gap:0;">
                <span style="width:12px; height:12px; border-radius:50%; flex:0 0 auto; background:var(--panel); border:1.8px solid var(--blue);"></span>
                <span style="flex:1; height:1.5px; background:var(--line2);"></span>
              </div>
              <div style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:1px; color:var(--mut2);">03</div>
              <div style="font-size:13px; font-weight:600; color:var(--txt); text-wrap:pretty;">Technical Corrections</div>
              <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Procedures, equipment and sequence reviewed and corrected against laboratory practice.</div>
            </div>
            <div style="min-width:0; display:flex; flex-direction:column; gap:9px;">
              <div style="display:flex; align-items:center; gap:0;">
                <span style="width:12px; height:12px; border-radius:50%; flex:0 0 auto; background:var(--panel); border:1.8px solid var(--blue);"></span>
                <span style="flex:1; height:1.5px; background:var(--line2);"></span>
              </div>
              <div style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:1px; color:var(--mut2);">04</div>
              <div style="font-size:13px; font-weight:600; color:var(--txt); text-wrap:pretty;">Connected Workflow</div>
              <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Sampling, validation, testing and reporting joined into one continuous sample path.</div>
            </div>
            <div style="min-width:0; display:flex; flex-direction:column; gap:9px;">
              <div style="display:flex; align-items:center; gap:0;">
                <span style="width:12px; height:12px; border-radius:50%; flex:0 0 auto; background:var(--blue); border:1.8px solid var(--blue);"></span>
                <span style="flex:1; height:1.5px; background:transparent;"></span>
              </div>
              <div style="font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:1px; color:var(--mut2);">05</div>
              <div style="font-size:13px; font-weight:600; color:var(--txt); text-wrap:pretty;">Training Simulator</div>
              <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">The current form: a full workflow that can be run, reviewed and used for training.</div>
            </div>
        </div>
      </div>
      </sc-if>
      <sc-if value="{{ abIsPaths }}" hint-placeholder-val="{{ false }}">
      <div style="height:100%; display:flex; flex-direction:column;">
        <div style="flex:0 0 auto; display:flex; align-items:baseline; justify-content:space-between; gap:14px; margin-bottom:11px;">
          <div style="font-size:15px; font-weight:600; color:var(--txt); letter-spacing:.2px;">Sampling Paths Covered</div>
          <div style="font-family:'IBM Plex Mono'; font-size:10.5px; letter-spacing:1px; color:var(--mut); text-transform:uppercase;">3 field sampling routes</div>
        </div>
        <div style="flex:1; min-height:0; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:11px;">
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 15px 13px; display:flex; flex-direction:column; gap:7px;">
            <div style="display:flex; align-items:center; gap:9px;">
              <span style="font-family:'IBM Plex Mono'; font-size:10.5px; color:var(--accb3); flex:0 0 auto;">01</span>
              <div style="font-size:13px; font-weight:600; color:var(--txt); letter-spacing:.2px;">Bottom Hole</div>
            </div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Downhole MPSR run, tool return, MDT / MPSR transfer into the SPS/PDS bottle, then laboratory QC.</div>
          </div>
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 15px 13px; display:flex; flex-direction:column; gap:7px;">
            <div style="display:flex; align-items:center; gap:9px;">
              <span style="font-family:'IBM Plex Mono'; font-size:10.5px; color:var(--accb3); flex:0 0 auto;">02</span>
              <div style="font-size:13px; font-weight:600; color:var(--txt); letter-spacing:.2px;">Wellhead</div>
            </div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Dedicated sampling line into a piston bottle at the wellhead, then straight to laboratory QC.</div>
          </div>
          <div style="min-width:0; background:var(--icard); border:1px solid var(--line2); border-radius:12px; padding:14px 15px 13px; display:flex; flex-direction:column; gap:7px;">
            <div style="display:flex; align-items:center; gap:9px;">
              <span style="font-family:'IBM Plex Mono'; font-size:10.5px; color:var(--accb3); flex:0 0 auto;">03</span>
              <div style="font-size:13px; font-weight:600; color:var(--txt); letter-spacing:.2px;">Separator</div>
            </div>
            <div style="font-size:11.5px; line-height:1.5; color:var(--mut); text-wrap:pretty;">Independent oil and gas paths - oil into a piston bottle, gas into a pressurised gas bottle.</div>
          </div>
        </div>
      </div>
      </sc-if>
      </div>

    </div>
    </sc-if>`);
