/* screen: showDash  (13.0 KB) */
DC.slot('showDash', `<sc-if value="{{ showDash }}" hint-placeholder-val="{{ false }}">

    <div style="position:relative; height:var(--page-h); min-height:0; padding:40px 56px; max-width:1600px; width:100%; margin:0 auto; display:flex; flex-direction:column; justify-content:center; gap:24px; box-sizing:border-box; overflow:auto; background:var(--bg);">
      <div style="position:absolute; top:-140px; left:-40px; width:640px; height:640px; border-radius:50%; border:1px solid var(--line); pointer-events:none;"></div>
      <div style="position:absolute; top:-40px; left:120px; width:420px; height:420px; border-radius:50%; border:1px solid var(--line); pointer-events:none;"></div>

      <!-- hero -->
      <div style="position:relative; display:flex; flex-direction:column; padding:0 2px; flex:0 0 auto;">
        <div style="display:flex; align-items:center; gap:22px;">
          <img src="assets/logo.png" alt="VAPS" style="height:64px; width:auto; display:block;">
          <div style="width:1px; height:46px; background:var(--line2);"></div>
          <h1 style="margin:0; font-size:clamp(34px,3.6vw,50px); font-weight:700; letter-spacing:-1.2px; color:var(--txt);">PVT Nexus</h1>
        </div>
        <p style="margin:20px 0 0; font-size:16px; color:var(--txt2); font-weight:400; letter-spacing:.1px;">An Integrated Digital Reservoir Fluid Workflow</p>
        <div style="font-size:14.5px; color:var(--blue); font-weight:600; margin-top:6px;">From Sampling to Results</div>
      </div>

      <!-- module cards -->
      <div style="position:relative; display:grid; grid-template-columns:repeat(4,1fr); gap:20px; flex:0 0 auto;">

        <button onclick="{{ goModule }}" style="text-align:left; cursor:pointer; font-family:inherit; background:var(--panel); border:1px solid var(--line); border-bottom:2.5px solid var(--blue); border-radius:14px; transition:transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s ease, border-color .18s ease; padding:28px 26px 22px; display:flex; flex-direction:column; align-items:stretch; color:var(--txt); box-shadow:0 1px 2px rgba(10,20,40,.04), 0 8px 20px rgba(10,20,40,.03);" style-hover="border-color:var(--blue); box-shadow:0 2px 4px rgba(10,20,40,.05), 0 14px 28px rgba(10,20,40,.08); transform:translateY(-3px);">
          <span style="width:50px; height:50px; border-radius:50%; background:rgba(77,157,255,.13); color:var(--blue); display:flex; align-items:center; justify-content:center;"><svg width="24" height="24" sc-camel-view-box="0 0 24 24" fill="none"><path d="M12 3v18M8 6.5h8M6.5 11h11M9.5 11v-2.2h5V11M9 21h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="12" cy="6.5" r="1.7" stroke="currentColor" stroke-width="1.5"></circle></svg></span>
          <span style="font-size:18px; font-weight:700; margin-top:16px;">PVT Sampling</span>
          <span style="font-size:13px; color:var(--txt2); line-height:1.55; margin-top:7px; font-weight:400;">Acquire representative reservoir samples</span>
          <span style="margin-top:auto; padding-top:14px; align-self:flex-end; display:flex; align-items:center;"><span style="width:36px; height:36px; border-radius:50%; border:1.5px solid var(--blue); color:var(--blue); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></span>
        </button>

        <button onclick="{{ goValidation }}" style="text-align:left; cursor:pointer; font-family:inherit; background:var(--panel); border:1px solid var(--line); border-bottom:2.5px solid var(--grn); border-radius:14px; transition:transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s ease, border-color .18s ease; padding:28px 26px 22px; display:flex; flex-direction:column; align-items:stretch; color:var(--txt); box-shadow:0 1px 2px rgba(10,20,40,.04), 0 8px 20px rgba(10,20,40,.03);" style-hover="border-color:var(--grn); box-shadow:0 2px 4px rgba(10,20,40,.05), 0 14px 28px rgba(10,20,40,.08); transform:translateY(-3px);">
          <span style="width:50px; height:50px; border-radius:50%; background:rgba(70,211,154,.13); color:var(--grn); display:flex; align-items:center; justify-content:center;"><svg width="24" height="24" sc-camel-view-box="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path><path d="M9 11.6l2 2 4-4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
          <span style="font-size:18px; font-weight:700; margin-top:16px;">Validation</span>
          <span style="font-size:13px; color:var(--txt2); line-height:1.55; margin-top:7px; font-weight:400;">Validate sample condition and complete laboratory preparation procedures</span>
          <span style="margin-top:auto; padding-top:14px; align-self:flex-end; display:flex; align-items:center;"><span style="width:36px; height:36px; border-radius:50%; border:1.5px solid var(--grn); color:var(--grn); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></span>
        </button>

        <button onclick="{{ goAnalysis }}" style="text-align:left; cursor:pointer; font-family:inherit; background:var(--panel); border:1px solid var(--line); border-bottom:2.5px solid var(--amb); border-radius:14px; transition:transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s ease, border-color .18s ease; padding:28px 26px 22px; display:flex; flex-direction:column; align-items:stretch; color:var(--txt); box-shadow:0 1px 2px rgba(10,20,40,.04), 0 8px 20px rgba(10,20,40,.03);" style-hover="border-color:var(--amb); box-shadow:0 2px 4px rgba(10,20,40,.05), 0 14px 28px rgba(10,20,40,.08); transform:translateY(-3px);">
          <span style="width:50px; height:50px; border-radius:50%; background:rgba(231,177,90,.16); color:var(--amb); display:flex; align-items:center; justify-content:center;"><svg width="24" height="24" sc-camel-view-box="0 0 24 24" fill="none"><path d="M9 3h6M10 3v5.2l-5.1 8.5A2.4 2.4 0 0 0 7 20.4h10a2.4 2.4 0 0 0 2.1-3.7L14 8.2V3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path><path d="M7.5 14.5h9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg></span>
          <span style="font-size:18px; font-weight:700; margin-top:16px;">Detailed PVT Analysis</span>
          <span style="font-size:13px; color:var(--txt2); line-height:1.55; margin-top:7px; font-weight:400;">Conduct PVT tests and compositional analysis</span>
          <span style="margin-top:auto; padding-top:14px; align-self:flex-end; display:flex; align-items:center;"><span style="width:36px; height:36px; border-radius:50%; border:1.5px solid var(--amb); color:var(--amb); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></span>
        </button>

        <button onclick="{{ goReport }}" style="text-align:left; cursor:pointer; font-family:inherit; background:var(--panel); border:1px solid var(--line); border-bottom:2.5px solid var(--blue); border-radius:14px; transition:transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s ease, border-color .18s ease; padding:28px 26px 22px; display:flex; flex-direction:column; align-items:stretch; color:var(--txt); box-shadow:0 1px 2px rgba(10,20,40,.04), 0 8px 20px rgba(10,20,40,.03);" style-hover="border-color:var(--blue); box-shadow:0 2px 4px rgba(10,20,40,.05), 0 14px 28px rgba(10,20,40,.08); transform:translateY(-3px);">
          <span style="width:50px; height:50px; border-radius:50%; background:rgba(77,157,255,.13); color:var(--blue); display:flex; align-items:center; justify-content:center;"><svg width="24" height="24" sc-camel-view-box="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7V3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path><path d="M14 3v4h4M10 12h5M10 16h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
          <span style="font-size:18px; font-weight:700; margin-top:16px;">Report</span>
          <span style="font-size:13px; color:var(--txt2); line-height:1.55; margin-top:7px; font-weight:400;">Generate and export comprehensive reports</span>
          <span style="margin-top:auto; padding-top:14px; align-self:flex-end; display:flex; align-items:center;"><span style="width:36px; height:36px; border-radius:50%; border:1.5px solid var(--blue); color:var(--blue); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></span>
        </button>
      </div>

      <!-- equipment library (full width, above the calculator) -->
      <button onclick="{{ goEquip }}" aria-label="Open the Equipment Library" style="position:relative; text-align:left; cursor:pointer; font-family:inherit; color:var(--txt); background:var(--panel); border:1px solid var(--line); border-bottom:2.5px solid var(--teal); border-radius:14px; display:grid; grid-template-columns:1fr 1.1fr 1.1fr auto; align-items:stretch; padding:0; overflow:hidden; flex:0 0 auto; box-shadow:0 1px 2px rgba(10,20,40,.04), 0 8px 20px rgba(10,20,40,.03); transition:transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s ease, border-color .18s ease;" style-hover="border-color:var(--teal); box-shadow:0 2px 4px rgba(10,20,40,.05), 0 14px 28px rgba(10,20,40,.08); transform:translateY(-3px);">
        <span style="display:flex; align-items:center; gap:16px; padding:20px 28px; background:rgba(56,205,184,.05); border-right:1px solid var(--line);">
          <span style="width:48px; height:48px; border-radius:50%; background:rgba(56,205,184,.14); color:var(--teal); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="24" height="24" sc-camel-view-box="0 0 24 24" fill="none"><rect x="8" y="6" width="8" height="15" rx="2.5" stroke="currentColor" stroke-width="1.7"></rect><path d="M10 6V3.5h4V6M12 3.5V2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8 12h8" stroke="currentColor" stroke-width="1.5"></path></svg></span>
          <span style="min-width:0;">
            <span style="display:block; font-size:19px; font-weight:700; letter-spacing:-.3px;">Equipment Library</span>
            <span style="display:block; font-size:12.5px; color:var(--mut); line-height:1.5; margin-top:5px; font-weight:400;">Inspect sampling equipment in 2D and 3D</span>
          </span>
        </span>
        <span style="display:flex; align-items:center; gap:14px; padding:18px 24px; border-right:1px solid var(--line);">
          <span style="width:40px; height:40px; border-radius:10px; background:rgba(231,177,90,.13); color:var(--amb); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="22" height="22" sc-camel-view-box="0 0 24 24" fill="none"><rect x="9" y="5" width="6" height="14" rx="1.2" stroke="currentColor" stroke-width="1.5"></rect><path d="M9 11.5h6M9 13h6" stroke="currentColor" stroke-width="1.3"></path><path d="M10.5 5V2.5h3V5M10.5 19v2.5h3V19" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"></path></svg></span>
          <span style="min-width:0;">
            <span style="display:block; font-size:15px; font-weight:600;">Oil Sample Bottle</span>
            <span style="display:block; font-size:12px; color:var(--mut); margin-top:3px; font-weight:400;">Floating piston · mixing ring · guarded valves</span>
          </span>
        </span>
        <span style="display:flex; align-items:center; gap:14px; padding:18px 24px; border-right:1px solid var(--line);">
          <span style="width:40px; height:40px; border-radius:10px; background:rgba(70,211,154,.13); color:var(--grn); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="22" height="22" sc-camel-view-box="0 0 24 24" fill="none"><path d="M9 7.5c0-1.4 1.2-2 3-2s3 .6 3 2v9c0 1.4-1.2 2-3 2s-3-.6-3-2z" stroke="currentColor" stroke-width="1.5"></path><path d="M11 5.5V3h2v2.5M11 18.5V21h2v-2.5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"></path></svg></span>
          <span style="min-width:0;">
            <span style="display:block; font-size:15px; font-weight:600;">Gas Sample Bottle</span>
            <span style="display:block; font-size:12px; color:var(--mut); margin-top:3px; font-weight:400;">Double-ended cylinder · isolation valves</span>
          </span>
        </span>
        <span style="display:flex; align-items:center; padding:0 26px;"><span style="width:36px; height:36px; border-radius:50%; border:1.5px solid var(--teal); color:var(--teal); display:flex; align-items:center; justify-content:center;"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></span>
      </button>

      <!-- calculator strip -->
      <div style="position:relative; background:var(--panel); border:1px solid var(--line); border-radius:14px; display:grid; grid-template-columns:1fr 1.1fr 1.1fr; box-shadow:0 1px 2px rgba(10,20,40,.04), 0 8px 20px rgba(10,20,40,.03); overflow:hidden; flex:0 0 auto;">
        <button onclick="{{ goCalc }}" style="text-align:left; cursor:pointer; font-family:inherit; background:rgba(77,157,255,.04); border:none; border-right:1px solid var(--line); padding:24px 28px; display:flex; flex-direction:column; justify-content:center; color:var(--txt);" style-hover="background:rgba(77,157,255,.07);">
          <span style="display:block; font-size:19px; font-weight:700; letter-spacing:-.3px;">PVT Calculator</span>
          <span style="display:block; font-size:12.5px; color:var(--mut); line-height:1.5; margin-top:7px; font-weight:400;">Calculate fluid properties with accuracy</span>
        </button>
        <button onclick="{{ goOilCalc }}" style="text-align:left; cursor:pointer; font-family:inherit; background:none; border:none; border-right:1px solid var(--line); padding:24px 26px; display:flex; align-items:center; gap:16px; color:var(--txt);" style-hover="background:rgba(231,177,90,.06);">
          <span style="width:48px; height:48px; border-radius:50%; background:rgba(231,177,90,.16); color:var(--amb); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="24" height="24" sc-camel-view-box="0 0 24 24" fill="none"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path></svg></span>
          <span style="flex:1; min-width:0;">
            <span style="display:block; font-size:15px; font-weight:600;">Oil Calculator</span>
            <span style="display:block; font-size:12px; color:var(--mut); margin-top:3px; font-weight:400;">Calculate oil properties and correlations</span>
          </span>
          <span style="width:34px; height:34px; border-radius:50%; border:1.5px solid var(--amb); background:rgba(231,177,90,.05); color:var(--amb); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
        </button>
        <button onclick="{{ goGasCalc }}" style="text-align:left; cursor:pointer; font-family:inherit; background:none; border:none; padding:24px 26px; display:flex; align-items:center; gap:16px; color:var(--txt);" style-hover="background:rgba(77,157,255,.05);">
          <span style="width:48px; height:48px; border-radius:50%; background:rgba(77,157,255,.13); color:var(--blue); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="24" height="24" sc-camel-view-box="0 0 24 24" fill="none"><path d="M12 3c1.2 3-4 5.5-4 10a4.8 4.8 0 0 0 9.6 0c0-2-1-3.6-2.1-5.1-.3 1-1 1.9-2 2.2.6-2.4.1-5-1.5-7.1z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path></svg></span>
          <span style="flex:1; min-width:0;">
            <span style="display:block; font-size:15px; font-weight:600;">Gas Calculator</span>
            <span style="display:block; font-size:12px; color:var(--mut); margin-top:3px; font-weight:400;">Calculate gas properties and correlations</span>
          </span>
          <span style="width:34px; height:34px; border-radius:50%; border:1.5px solid var(--blue); background:rgba(77,157,255,.05); color:var(--blue); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
        </button>
      </div>
    </div>
    </sc-if>`);
