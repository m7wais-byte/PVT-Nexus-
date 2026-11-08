/* screen: showAbout — reservoir-to-understanding introduction */
DC.slot('showAbout', `<sc-if value="{{ showAbout }}" hint-placeholder-val="{{ false }}">
<main class="about" style="height:var(--page-h); overflow:auto; box-sizing:border-box; width:100%; padding:clamp(28px,5vw,64px) 20px; color:var(--txt2);">
  <article aria-labelledby="about-title" style="width:100%; max-width:820px; margin:0 auto;">
    <div style="display:flex; align-items:center; flex-wrap:wrap; gap:28px 44px;">
      <div style="flex:1 1 390px; min-width:0;">
        <p style="margin:0 0 14px; font-size:11px; font-weight:600; letter-spacing:1.8px; color:var(--accb3); text-transform:uppercase;">PVT Nexus · Interactive learning</p>
        <h1 id="about-title" style="margin:0 0 24px; max-width:520px; font-size:clamp(28px,4vw,40px); font-weight:600; letter-spacing:-1px; line-height:1.2; color:var(--txt);">From reservoir<br>to understanding.</h1>
        <p style="margin:0 0 16px; font-size:15px; line-height:1.85;">Developed by Mohammed Hilal Al Awaisi during his training at VAPS, PVT Nexus turns laboratory workflows into an interactive learning experience.</p>
        <p style="margin:0; font-size:14px; line-height:1.85;">Follow the fluid, explore the equipment and see how pressure and temperature shape each stage—from collecting a sample to interpreting its behaviour.</p>
      </div>
      <figure style="flex:0 1 190px; margin:0 auto; color:var(--accb3);">
        <svg role="img" aria-labelledby="about-bottle-title" viewBox="0 0 190 250" width="190" style="display:block; max-width:100%; height:auto;">
          <title id="about-bottle-title">Illustration of a fluid sample bottle</title>
          <circle cx="95" cy="125" r="82" fill="var(--panel)" stroke="var(--line)" />
          <path d="M10 125h35m100 0h35M95 36v18m0 142v18" fill="none" stroke="var(--line2)" stroke-dasharray="3 5"/>
          <rect x="72" y="61" width="46" height="135" rx="15" fill="var(--panel2)" stroke="currentColor" stroke-width="1.8"/>
          <rect x="80" y="82" width="30" height="92" rx="4" fill="var(--bg)" stroke="var(--line2)"/>
          <path d="M81 119q14-7 28 0v50q0 4-4 4H85q-4 0-4-4Z" fill="var(--amb)" opacity=".5"/>
          <path d="M81 119q14-7 28 0" fill="none" stroke="var(--amb)" stroke-width="1.5"/>
          <path d="M81 110h28" stroke="currentColor" stroke-width="3"/>
          <path d="M95 110V75m-12-14v-8h24v8M95 53V40m-10 0h20M84 196v8h22v-8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
          <circle cx="90" cy="96" r="2" fill="currentColor" opacity=".5"/>
          <circle cx="100" cy="91" r="1.5" fill="currentColor" opacity=".4"/>
          <path d="M118 88h13m-13 83h13" stroke="var(--line2)"/>
          <text x="95" y="237" text-anchor="middle" fill="var(--mut)" font-size="9" font-family="inherit" letter-spacing="1.5">A SAMPLE. A STORY.</text>
        </svg>
      </figure>
    </div>
    <section aria-label="Learning approach" style="display:flex; flex-wrap:wrap; gap:20px 30px; margin-top:40px; padding-top:24px; border-top:1px solid var(--line);">
      <div style="flex:1 1 180px; display:flex; align-items:center; gap:10px; font-size:13px; color:var(--txt);"><span aria-hidden="true" style="width:6px; height:6px; border-radius:50%; background:var(--amb);"></span>Collect with care</div>
      <div style="flex:1 1 180px; display:flex; align-items:center; gap:10px; font-size:13px; color:var(--txt);"><span aria-hidden="true" style="width:6px; height:6px; border-radius:50%; background:var(--teal);"></span>Understand the process</div>
      <div style="flex:1 1 180px; display:flex; align-items:center; gap:10px; font-size:13px; color:var(--txt);"><span aria-hidden="true" style="width:6px; height:6px; border-radius:50%; background:var(--blue);"></span>Explore the results</div>
    </section>
    <p style="margin:32px 0 0; max-width:620px; font-size:12px; line-height:1.8; color:var(--mut);">Built for learning and demonstration. Engineering applications require independently verified data.</p>
    <footer style="margin-top:30px; padding-top:22px; border-top:1px solid var(--line);">
      <p style="margin:0 0 6px; font-size:13px; color:var(--txt2);">Have an idea or noticed something?</p>
      <a href="mailto:mohdhilalawaisi@gmail.com" style="font-size:14px; line-height:1.8; color:var(--accb3); text-underline-offset:4px; overflow-wrap:anywhere;">mohdhilalawaisi@gmail.com</a>
    </footer>
  </article>
</main>
</sc-if>`);
