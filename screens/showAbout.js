/* screen: showAbout — reservoir-to-understanding introduction */
DC.slot('showAbout', `<sc-if value="{{ showAbout }}" hint-placeholder-val="{{ false }}">
<main class="about" style="height:var(--page-h); overflow:auto; box-sizing:border-box; width:100%; padding:clamp(28px,5vw,64px) 20px; color:var(--about-body);">
  <article aria-labelledby="about-title" style="width:100%; max-width:860px; margin:0 auto;">
    <div class="about-intro" style="display:flex; align-items:center; flex-wrap:wrap; gap:28px 56px;">
      <div style="flex:1 1 400px; min-width:0; max-width:560px;">
        <p style="margin:0 0 14px; font-size:13px; font-weight:600; letter-spacing:1.6px; color:var(--accb3); text-transform:uppercase;">PVT Nexus · Interactive learning</p>
        <h1 id="about-title" style="margin:0 0 24px; max-width:520px; font-size:clamp(28px,4vw,40px); font-weight:600; letter-spacing:-1px; line-height:1.2; color:var(--txt);">From reservoir<br>to understanding.</h1>
        <p style="margin:0 0 16px; font-size:16.5px; line-height:1.75; color:var(--about-lead);">Developed by Mohammed Hilal Al Awaisi during his training at VAPS, PVT Nexus turns laboratory workflows into an interactive learning experience.</p>
        <p style="margin:0; font-size:16px; line-height:1.75;">Follow the fluid, explore the equipment and see how pressure and temperature shape each stage—from collecting a sample to interpreting its behaviour.</p>
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
    <section aria-label="Learning approach" style="display:flex; flex-wrap:wrap; gap:20px 30px; margin-top:40px; padding-top:24px; border-top:1px solid var(--line);">
      <div style="flex:1 1 180px; display:flex; align-items:center; gap:10px; font-size:15px; font-weight:500; line-height:1.4; color:var(--txt);"><span aria-hidden="true" style="flex:0 0 auto; width:8px; height:8px; border-radius:50%; background:var(--amb);"></span>Collect with care</div>
      <div style="flex:1 1 180px; display:flex; align-items:center; gap:10px; font-size:15px; font-weight:500; line-height:1.4; color:var(--txt);"><span aria-hidden="true" style="flex:0 0 auto; width:8px; height:8px; border-radius:50%; background:var(--teal);"></span>Understand the process</div>
      <div style="flex:1 1 180px; display:flex; align-items:center; gap:10px; font-size:15px; font-weight:500; line-height:1.4; color:var(--txt);"><span aria-hidden="true" style="flex:0 0 auto; width:8px; height:8px; border-radius:50%; background:var(--blue);"></span>Explore the results</div>
    </section>
    <p style="margin:32px 0 0; max-width:620px; font-size:14px; line-height:1.7; color:var(--about-note);">Built for learning and demonstration. Engineering applications require independently verified data.</p>
    <footer style="margin-top:30px; padding-top:22px; border-top:1px solid var(--line);">
      <p style="margin:0 0 6px; font-size:15px; line-height:1.6; color:var(--about-body);">Have an idea or noticed something?</p>
      <a class="about-mail" href="mailto:mohdhilalawaisi@gmail.com">mohdhilalawaisi@gmail.com</a>
    </footer>
  </article>
</main>
</sc-if>`);
