/* screen: showAbout — reservoir-to-understanding introduction */
DC.slot('showAbout', `<sc-if value="{{ showAbout }}" hint-placeholder-val="{{ false }}">
<main class="about about-fit" style="height:var(--page-h); overflow:auto; box-sizing:border-box; width:100%; padding:clamp(28px,5vw,64px) 20px; color:var(--about-body);">
  <article aria-labelledby="about-title" style="width:100%; max-width:860px; margin:0 auto;">
    <div class="about-intro" style="display:flex; align-items:center; flex-wrap:wrap; gap:28px 56px;">
      <div style="flex:1 1 400px; min-width:0; max-width:560px;">
        <p style="margin:0 0 14px; font-size:13px; font-weight:600; letter-spacing:1.6px; color:var(--accb3); text-transform:uppercase;">PVT Nexus · Digital PVT laboratory</p>
        <h1 id="about-title" style="margin:0 0 24px; max-width:520px; font-size:clamp(28px,4vw,40px); font-weight:600; letter-spacing:-1px; line-height:1.2; color:var(--txt);">From reservoir<br>to understanding.</h1>
        <p style="margin:0 0 16px; font-size:16.5px; line-height:1.75; color:var(--about-lead);">PVT Nexus is a digital PVT laboratory developed by Mohammed Hilal Al Awaisi at VAPS. It shows how a reservoir fluid sample is handled and tested in the lab, step by step.</p>
        <p style="margin:0; font-size:16px; line-height:1.75;">Follow the fluid through each stage, see what every piece of equipment does, and understand how pressure and temperature change the fluid’s behaviour.</p>
    <footer style="margin-top:20px; padding-top:0; border-top:0;">
      <p style="margin:0 0 6px; font-size:15px; line-height:1.6; color:var(--about-body);">Questions, ideas or corrections?</p>
      <a class="about-mail" href="mailto:mohdhilalawaisi@gmail.com">mohdhilalawaisi@gmail.com</a>
    </footer>
      </div>
      <figure class="about-bottle" tabindex="0" aria-describedby="about-bottle-hint">
        <div class="ab-row">
        <!-- approved Oil Sample Bottle (BottleArt / PBDraw, same drawing as Validation & Restoration), static cutaway:
             no Bottle Details trigger, no valve-state colours, piston parked at the drawing's default split -->
        <svg role="img" aria-labelledby="about-bottle-title" sc-camel-view-box="-72 -370 144 740" sc-camel-preserve-aspect-ratio="xMidYMid meet">
          <title id="about-bottle-title">Oil sample bottle (piston-type), cutaway view</title>
          <defs>${BottleArt.defs('ab')}</defs>
          ${(function () { var st = BottleArt.styles(PBDraw.OIL.split, '0s');
            return BottleArt.oil('ab', { x: 0, y: 0, s: 1, sample: st.sample, drive: st.drive, piston: st.piston }); })()}
        </svg>
        <!-- part callouts: same viewBox height as the bottle so each label sits level with its part (hover / focus to show) -->
        <svg class="ab-parts" aria-hidden="true" sc-camel-view-box="72 -370 215 740" sc-camel-preserve-aspect-ratio="xMinYMid meet">
          ${[[-300,'Sample valve'],[-115,'Oil sample'],[20,'Floating piston'],[135,'Drive fluid'],[300,'Drive valve']].map(function (l, i) {
            return '<g class="ab-part" style="transition-delay:' + (i * 60) + 'ms"><circle cx="78" cy="' + l[0] + '" r="3.5"/><line x1="78" y1="' + l[0] + '" x2="98" y2="' + l[0] + '"/><text x="104" y="' + (l[0] + 8) + '">' + l[1] + '</text></g>'; }).join('')}
        </svg>
        </div>
        <figcaption id="about-bottle-hint" class="ab-hint">Hover the bottle to see its parts</figcaption>
      </figure>
    </div>
    <section class="about-flow" aria-label="Learning approach"><ol><li><button type="button" class="about-flow-btn" onclick="{{ goModule }}"><span class="about-flow-icon"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z"/></svg></span><span class="about-flow-txt"><strong>Collect with care</strong><small>Sampling, bottle validation and restoration</small></span><em class="about-flow-go">Open →</em></button></li><li><button type="button" class="about-flow-btn" onclick="{{ goAnalysis }}"><span class="about-flow-icon"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></svg></span><span class="about-flow-txt"><strong>Understand the process</strong><small>PV, differential liberation, separator and viscosity tests</small></span><em class="about-flow-go">Open →</em></button></li><li><button type="button" class="about-flow-btn" onclick="{{ goReport }}"><span class="about-flow-icon"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v18h17M8 16l4-5 4 2 5-7"/></svg></span><span class="about-flow-txt"><strong>Explore the results</strong><small>Plots, calculations and the final PVT report</small></span><em class="about-flow-go">Open →</em></button></li></ol></section>
    <p style="margin:32px 0 0; max-width:620px; font-size:14px; line-height:1.7; color:var(--about-note);">For training and demonstration only. Use independently verified laboratory data for engineering decisions.</p>
  </article>
</main>
</sc-if>`);
