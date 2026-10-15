/* ============================================================================
   ViscModule — Viscosity module registry (structure only, no test logic yet).

   Detailed PVT Analysis -> Viscosity Analysis (viscMenu) -> one of three tests.
   Each test owns its own configuration, state, step sequence, schematic,
   calculations, results and reset. Nothing here is shared between tests
   except the page shell they render in (screens/showViscTest.js).

   To develop a test later, fill in ONLY that test's entry below and its own
   workspace block in screens/showViscTest.js. The other two are untouched.
   ========================================================================= */
(function () {
  'use strict';

  var ACCENT = '#2fb3a3';                     // same teal as the Viscosity card

  var MENU = {
    screen: 'viscMenu',
    hash: '#/viscosity',
    explain: {
      t: 'Viscosity analysis',
      d: 'Choose one of the three viscosity analysis methods. The detailed procedure will be developed separately.',
      w: 'Kinematic, single-phase and two-phase viscosity are set up as separate tests, each with its own workflow.',
      e: 'None.',
      o: '—'
    }
  };

  /* one factory per test so every test gets its OWN fresh state object */
  function blankState() {
    return { status: 'Not Started', step: 0, results: null };
  }
  var PAGE_EXPLAIN = {
    d: 'This test workspace is ready for the procedure and equipment to be added.',
    w: '—', e: 'None.', o: '—'
  };

  var TESTS = [
    {
      id: 'kinematic',
      screen: 'viscKin',
      hash: '#/viscosity/kinematic',
      name: 'Kinematic Viscosity',
      cardDesc: 'Measure the fluid’s resistance to flow under the influence of gravity.',
      pageDesc: 'Determine kinematic viscosity using the selected laboratory method.',
      /* drop falling under gravity */
      icon: 'M12 2.5v6M9.5 6l2.5 2.5L14.5 6M12 11s4 3.8 4 6.5a4 4 0 0 1-8 0C8 14.8 12 11 12 11z',
      /* developed: components/StageViscKin.js (own steps, schematic, calc, reset, Explain text) */
      steps: ['Inject Sample & Install Stopper', 'Condition 1 h', 'Remove Stopper', 'Flow Timing 3\u21924', 'Calculate \u03bd'],
      schematic: 'StageViscKin',  // U-tube installed in the 114 \u00b0C silicone-oil bath from the start
      calc: '\u03bd = C \u00d7 t',
      initialState: blankState,   // independent state + reset
      explain: { t: 'Kinematic Viscosity' }
    },
    {
      id: 'single',
      screen: 'viscSingle',
      hash: '#/viscosity/single-phase',
      name: 'Single-Phase Viscosity',
      cardDesc: 'Measure fluid viscosity while the sample remains in a single phase.',
      pageDesc: 'Determine fluid viscosity while maintaining the sample in a single-phase condition.',
      /* cell completely filled with liquid */
      icon: 'M7 3h10v18H7zM7 7.5c1.7-1 3.3-1 5 0s3.3 1 5 0M7 12c1.7-1 3.3-1 5 0s3.3 1 5 0M7 16.5c1.7-1 3.3-1 5 0s3.3 1 5 0',
      /* developed: components/StageViscSingle.js (load at 5,500 psig, flush 15 cc, measure 5,500 -> 3,000 psig) */
      steps: ['Connect & Fill', '5,500 psig & Flush', 'Measure 5,500', 'Reduce 5,000', 'Reduce 4,500', 'Reduce 4,000', 'Reduce 3,500', 'Reduce 3,000', 'Results'],
      schematic: 'StageViscSingle',  // falling-body viscometer cutaway, bottom inlet / top bleed outlet
      calc: null,
      initialState: blankState,
      explain: { t: 'Single-Phase Viscosity' }
    },
    {
      id: 'two',
      screen: 'viscTwo',
      hash: '#/viscosity/two-phase',
      name: 'Two-Phase Viscosity',
      cardDesc: 'Study viscosity behavior when liquid and liberated gas are present together.',
      pageDesc: 'Evaluate viscosity behavior when liquid and liberated gas coexist.',
      /* cell with liquid level and gas bubbles above it */
      icon: 'M7 3h10v18H7zM7 13c1.7-1 3.3-1 5 0s3.3 1 5 0M9 16.5h6M9 19h6M9.2 7.2a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M13.3 9.4a1 1 0 1 0 2 0a1 1 0 1 0-2 0M13.6 5.2a.8.8 0 1 0 1.6 0a.8.8 0 1 0-1.6 0',
      /* developed: components/StageViscTwo.js (DL pressure steps 2,161 -> 203 psig; per point: reduce -> agitate ->
         vent gas into water -> first oil drop / close -> transfer oil to viscometer -> measure) */
      steps: ['Reduce Pressure', 'Agitate', 'Vent Gas', 'First Oil Drop', 'Transfer Oil', 'Measure \u03bc'],   // x 6 points + Results
      schematic: 'StageViscTwo',  // PVT cell -> gas outlet (water glass) + oil line -> falling-body viscometer
      calc: '\u03bc = K \u00d7 t',
      initialState: blankState,
      explain: { t: 'Two-Phase Viscosity' }
    }
  ];

  var BY_ID = {}, BY_SCREEN = {}, BY_HASH = {};
  TESTS.forEach(function (t) { BY_ID[t.id] = t; BY_SCREEN[t.screen] = t; BY_HASH[t.hash] = t.screen; });
  BY_HASH[MENU.hash] = MENU.screen;

  window.VISC_MODULE = {
    accent: ACCENT,
    menu: MENU,
    tests: TESTS,
    byId: function (id) { return BY_ID[id] || null; },
    byScreen: function (scr) { return BY_SCREEN[scr] || null; },
    isViscScreen: function (scr) { return scr === MENU.screen || !!BY_SCREEN[scr]; },
    hashFor: function (scr) { return scr === MENU.screen ? MENU.hash : (BY_SCREEN[scr] ? BY_SCREEN[scr].hash : null); },
    screenForHash: function (h) { return BY_HASH[h] || null; },
    /* independent state per test — never one shared completion flag */
    initialState: function () {
      var s = {};
      TESTS.forEach(function (t) { s[t.id] = t.initialState(); });
      return s;
    },
    explainFor: function (scr) {
      if (scr === MENU.screen) return MENU.explain;
      var t = BY_SCREEN[scr];
      if (!t) return null;
      return { t: t.explain.t, d: PAGE_EXPLAIN.d, w: PAGE_EXPLAIN.w, e: PAGE_EXPLAIN.e, o: PAGE_EXPLAIN.o };
    }
  };
})();
