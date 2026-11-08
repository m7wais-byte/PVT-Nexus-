/* screen: showAbout — reservoir-to-understanding introduction */
DC.slot('showAbout', `<sc-if value="{{ showAbout }}" hint-placeholder-val="{{ false }}">
<main class="about about-fit" style="height:var(--page-h); overflow:auto; box-sizing:border-box; width:100%; padding:clamp(28px,5vw,64px) 20px; color:var(--about-body);">
  <article aria-labelledby="about-title" style="width:100%; max-width:860px; margin:0 auto;">
    <div class="about-intro" style="display:flex; align-items:center; flex-wrap:wrap; gap:28px 56px;">
      <div style="flex:1 1 400px; min-width:0; max-width:560px;">
        <p style="margin:0 0 14px; font-size:13px; font-weight:600; letter-spacing:1.6px; color:var(--accb3); text-transform:uppercase;">PVT Nexus · Interactive learning</p>
        <h1 id="about-title" style="margin:0 0 24px; max-width:520px; font-size:clamp(28px,4vw,40px); font-weight:600; letter-spacing:-1px; line-height:1.2; color:var(--txt);">From reservoir<br>to understanding.</h1>
        <p style="margin:0 0 16px; font-size:16.5px; line-height:1.75; color:var(--about-lead);">Developed by Mohammed Hilal Al Awaisi during his training at VAPS, PVT Nexus turns laboratory workflows into an interactive learning experience.</p>
        <p style="margin:0; font-size:16px; line-height:1.75;">Follow the fluid, explore the equipment and see how pressure and temperature shape each stage—from collecting a sample to interpreting its behaviour.</p>
    <footer style="margin-top:20px; padding-top:0; border-top:0;">
      <p style="margin:0 0 6px; font-size:15px; line-height:1.6; color:var(--about-body);">Have an idea or noticed something?</p>
      <a class="about-mail" href="mailto:mohdhilalawaisi@gmail.com">mohdhilalawaisi@gmail.com</a>
    </footer>
      </div>
      <figure class="about-bottle">
        <!-- approved Oil Sample Bottle (BottleArt / PBDraw, same drawing as Validation & Restoration), static cutaway:
             no Bottle Details trigger, no valve-state colours, piston parked at the drawing's default split -->
        <svg role="img" aria-labelledby="about-bottle-title" sc-camel-view-box="-72 -370 144 740" sc-camel-preserve-aspect-ratio="xMidYMid meet">
          <title id="about-bottle-title">Oil sample bottle (piston-type), cutaway view</title>
          <defs>${BottleArt.defs('ab')}</defs>
          ${(function () { var st = BottleArt.styles(PBDraw.OIL.split, '0s');
            return BottleArt.oil('ab', { x: 0, y: 0, s: 1, sample: st.sample, drive: st.drive, piston: st.piston }); })()}
        </svg>
      </figure>
    </div>
    <section class="about-flow" aria-label="Learning approach"><ol><li><span class="about-flow-icon"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z"/></svg></span><span>Collect with care</span></li><li><span class="about-flow-icon"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></svg></span><span>Understand the process</span></li><li><span class="about-flow-icon"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v18h17M8 16l4-5 4 2 5-7"/></svg></span><span>Explore the results</span></li></ol></section>
    <p style="margin:32px 0 0; max-width:620px; font-size:14px; line-height:1.7; color:var(--about-note);">Built for learning and demonstration. Engineering applications require independently verified data.</p>
  </article>
</main>
</sc-if>`);
