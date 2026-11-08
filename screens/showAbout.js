/* screen: showAbout — compact project overview */
DC.slot('showAbout', `<sc-if value="{{ showAbout }}" hint-placeholder-val="{{ false }}">
<main class="about" style="height:var(--page-h); overflow:auto; box-sizing:border-box; width:100%; padding:clamp(20px,3vw,36px) 20px; color:var(--txt2);">
  <article aria-labelledby="about-title" style="width:100%; max-width:680px; margin:0 auto; padding:clamp(22px,3vw,30px); background:var(--panel); border:1px solid var(--line2); border-radius:14px; font-size:14px; line-height:1.75;">
    <h1 id="about-title" style="margin:0 0 18px; font-size:21px; line-height:1.3; color:var(--txt);">About PVT Nexus</h1>
    <p style="margin:0 0 16px;">PVT Nexus was developed by Mohammed Hilal Al Awaisi during training at Vision Advanced Petroleum Solutions (VAPS). It is an interactive educational tool that makes petroleum-fluid sampling and laboratory procedures easier to understand.</p>
    <p style="margin:0 0 16px;">The simulator follows the sample from bottom-hole, wellhead or separator sampling through validation and detailed PVT analysis. Step-by-step animations explain the equipment, fluid behaviour and purpose of each stage. Oil and gas calculators help users explore fluid properties using published correlations.</p>
    <p style="margin:0 0 16px;">The simulations and examples are intended for training and demonstration. Calculator results should be independently verified before engineering use.</p>
    <p style="margin:0;">Suggestions and feedback are welcome. Contact <a href="mailto:mohdhilalawaisi@gmail.com" style="color:var(--accb3); text-underline-offset:3px; overflow-wrap:anywhere;">mohdhilalawaisi@gmail.com</a>.</p>
  </article>
</main>
</sc-if>`);
