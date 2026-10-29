/* screen: showCalc — Module 05 PVT Calculator.
   One full-page host; components/PvtCalc.js renders the header (Oil / Gas selector),
   the views and the Explain drawer inside it. Main.js mounts it (syncPvtCalc). */
DC.slot('showCalc', `<sc-if value="{{ showCalc }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Module 05 — PVT Calculator" class="pv-page">
      <div ref="{{ pvCalcHost }}" class="pv-host"></div>
    </div>
    </sc-if>`);
