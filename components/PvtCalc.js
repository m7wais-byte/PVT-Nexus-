/* ============================================================================
   VAPS PVT Nexus — PvtCalc
   PVT Calculator (Module 05): live inputs and chart in one workspace
       Inputs · Charts · Results Table · Measured Data · Methods & References
   and the right-side "Explain This Stage" drawer (same look as the procedure
   pages: it reuses StepGuide's .sgSec / .sgLbl / .sgTxt / .sgVal classes).

   Mounted by Main.js into the host rendered by screens/showCalc.js:
       PvtCalc.mount(el, { fluid, onFluid })   PvtCalc.setFluid(f)   PvtCalc.unmount()

   Layering (each part testable on its own):
     calc/pvt-units.js         unit systems, gauge / absolute, standard-condition bases
     calc/pvt-correlations.js  published equations + range / verification metadata
     calc/pvt-engine.js        validation + evaluation (pure)
     calc/pvt-measured.js      measured-data import, basis compatibility, error statistics
     components/PvtChart.js    interactive SVG chart
     components/OilBatch.js    multi-sample oil batch evaluation
   This file is presentation only: it reads fields, calls the engine, renders.
   Styling: the .pv-* block at the end of theme.css (theme variables only).
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.PVTUnits, C = global.PVTCorr, E = global.PVTEngine, MD = global.PVTMeasured;
  var M = C.META;
  var COMP_ROWS = 20;

  /* ------------------------------------------------------------ state
     Kept at module level so it survives leaving and re-entering the screen. */
  function blankComp() { var r = []; for (var i = 0; i < COMP_ROWS; i++) r.push({ name: '', formula: '', y: '' }); return r; }
  function exampleComp() {
    var c = blankComp();
    [['Methane', 'CH4', '0.8700'], ['Ethane', 'C2H6', '0.0500'], ['Propane', 'C3H8', '0.0300'], ['n-Butane', 'C4H10', '0.0100'],
      ['Nitrogen', 'N2', '0.0100'], ['Carbon dioxide', 'CO2', '0.0200'], ['Hydrogen sulfide', 'H2S', '0.0100']]
      .forEach(function (x, i) { c[i] = { name: x[0], formula: x[1], y: x[2] }; });
    return c;
  }
  /* ---- canonical inputs
     Unit-bearing fields keep a full-precision value in internal units in f.canon (pressures psia,
     increment psi, T °F, density lbm/ft³, Rsb scf/STB, pressure list psia[]). The text in the field
     is only its rendering in the current units. A unit or gauge switch re-renders the text from
     f.canon and never re-parses a rounded display, so the physical inputs cannot drift. Typing in a
     field drops its canonical value: from then on exactly what was typed is used. */
  var KIND = { p: 'p', pMin: 'p', pMax: 'p', pb: 'p', psep: 'p', pStep: 'dp', T: 'T', tsep: 'T', rhoSto: 'density', rsb: 'Rs', pList: 'plist' };
  function inputUnit(f, k, units, gauge) {
    return (f.inputUnits || {})[k] || U.inputDefault(KIND[k], units || S.units, gauge === undefined ? S.gauge : gauge);
  }
  function toCanon(kind, text, units, gauge, selected) {
    selected = selected || U.inputDefault(kind, units, gauge);
    if (kind === 'plist') {
      var toks = String(text || '').split(/[\s,;]+/).filter(Boolean), out = [];
      for (var i=0;i<toks.length;i++) { var r=E.parse(toks[i]); if(r.state!=='ok') return undefined; out.push(U.inputToCanon('p',r.v,selected)); }
      return out.length ? out : undefined;
    }
    var v=E.parse(text); return v.state==='ok' ? U.inputToCanon(kind,v.v,selected) : undefined;
  }
  function displayText(kind,c,units,gauge,selected) {
    selected=selected || U.inputDefault(kind,units,gauge);
    var r7=function(x){return String(+x.toPrecision(7));};
    return kind==='plist' ? c.map(function(x){return r7(U.inputFromCanon('p',x,selected));}).join(', ') : r7(U.inputFromCanon(kind,c,selected));
  }
  function captureCanon(f,units,gauge) {
    f.canon=f.canon || {};
    Object.keys(KIND).forEach(function(k){
      if(!(k in f) || f.canon[k]!==undefined) return;
      var c=toCanon(KIND[k],f[k],units,gauge,inputUnit(f,k,units,gauge));
      if(c!==undefined) f.canon[k]=c;
    });
  }
  function renderCanon(f,units,gauge) {
    Object.keys(f.canon || {}).forEach(function(k){
      f[k]=displayText(KIND[k],f.canon[k],units,gauge,inputUnit(f,k,units,gauge));
    });
  }
  function inputUnitSelect(k,label) {
    var kind=KIND[k]; if(!kind) return '';
    var choices=U.INPUT_UNITS[kind==='plist'?'p':kind], current=inputUnit(F(),k);
    return '<select class="pv-input-unit" data-input-unit="'+k+'" aria-label="Unit for '+esc(label.replace(/<[^>]*>/g,''))+'">'
      +choices.map(function(v){return '<option value="'+esc(v)+'"'+(v===current?' selected':'')+'>'+esc(v)+'</option>';}).join('')+'</select>';
  }
  /* example inputs: defined in field units (exact), shown in the current units */
  function fluidDefaults(fluid, units, gauge) {
    var ex = E.example(fluid, 'field');
    var f = fluid === 'oil'
      ? Object.assign({ calcMode: 'range', oilGravityBasis: 'api', oilChar: 'pb', sepUse: false, psep: '', tsep: '', m: Object.assign({}, E.OIL_DEFAULT_M) }, ex)
      : Object.assign({ calcMode: 'range', gasBasis: 'gravity', comp: exampleComp(), compBasis: 'fraction', normalize: false, behavior: 'real',
        sourBasis: 'fraction', yCO2: '0', yH2S: '0', yN2: '0', zManual: '', m: Object.assign({}, E.GAS_DEFAULT_M) }, ex);
    Object.keys(ex).forEach(function (k) { f[k] = String(ex[k]); });
    f.canon = {};
    captureCanon(f, 'field', false);
    renderCanon(f, units || 'field', !!gauge);
    f.u = UNIT_DEFAULT(fluid);
    return f;
  }
  function freshFluid(fluid) {
    var f = fluidDefaults(fluid, 'field', false);
    ['p', 'pMin', 'pMax', 'pList', 'T', 'api', 'rhoSto', 'gg', 'pb', 'rsb'].forEach(function (k) { f[k] = ''; });
    f.canon = { pStep: 200 }; f.calcMode = 'single';
    if (f.comp) f.comp = blankComp();
    f.canon = {}; f.calcMode = 'single';
    if (fluid === 'oil') { f.oilChar = 'pb'; f.rhoBasis = '60F'; f.alpha = ''; }
    return f;
  }
  function newGuide() { return { stage: 'choose', attempted: false, ready: false }; }
  var S = {
    fluid: 'oil', view: 'inputs', units: 'field', gauge: false,
    /* standard-condition basis for gas standard volumes (Bg, Eg); oil results always stay on 'corr' */
    stdBasis: 'corr',
    oil: freshFluid('oil'), gas: freshFluid('gas'),
    guide: { oil: newGuide(), gas: newGuide() },
    chartProp: { oil: 'rs', gas: 'z' }, compare: { oil: {}, gas: {} }, yLog: {},
    /* selection: the row index for drawing, and the physical pressure (psia) it belongs to */
    sel: { oil: -1, gas: -1 }, selP: { oil: null, gas: null },
    /* measured data: text as pasted, and the declared standard basis ('' = not declared) */
    measured: { oil: { text: '', basis: '' }, gas: { text: '', basis: '' } },
    explain: false, help: null, zImg: null, example: { oil: false, gas: false }, advanced: { oil: false, gas: false },
    /* Oil workflow: one input form -> all four properties -> a full-page explanation of any one.
       calc is the last successful calculation (frozen engine input + result); range and selP are the
       detail-page graph range (canonical psia / psi) and the selected point per property. */
    wf: { oil: newW(), gas: newW() }
  };

  var host = null, opts = {}, res = null, cmpRes = [], meas = null, chart = null, timer = null, root = null;

  /* ------------------------------------------------------------ helpers */
  function F() { return S[S.fluid]; }
  function G() { return S.guide[S.fluid]; }
  function esc(t) { return String(t === undefined || t === null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function q(sel) { return root ? root.querySelector(sel) : null; }
  function qa(sel) { return root ? Array.prototype.slice.call(root.querySelectorAll(sel)) : []; }
  var fmt = E.fmt;
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function basis() { return S.fluid === 'gas' ? U.stdBasis(S.stdBasis) : U.STD_BASES.corr; }

  function unitOf(qk) {
    if (qk === 'p') return U.unit('p', S.units, S.gauge);
    if (qk === 'pAbsOnly') return S.units === 'metric' ? 'bar(a)' : 'psia';
    if (qk === 'tAbs' || qk === 'dT') return S.units === 'metric' ? 'K' : '°R';
    if (qk === 'T') return U.unit('T', S.units);
    if (qk === 'none' || qk === 'text') return '';
    return U.unit(qk, S.units);
  }
  function disp(qk, v) {
    if (!isNum(v)) return v;
    if (qk === 'p') return U.pFromPsia(v, S.units, S.gauge);
    if (qk === 'pAbsOnly') return U.pFromPsia(v, S.units, false);
    if (qk === 'tAbs' || qk === 'dT') return S.units === 'metric' ? v * 5 / 9 : v;
    if (qk === 'T') return U.tFromF(v, S.units);
    if (qk === 'none' || qk === 'text') return v;
    return U.toDisplay(qk, v, S.units);
  }
  function fmtQ(qk, v, sig) {
    if (qk === 'text') return esc(v);
    if (!isNum(v)) return '—';
    var d = disp(qk, v);
    if (qk === 'p' || qk === 'pAbsOnly') return fmtP(d);
    if (!sig && qk === 'Rs') return d.toFixed(S.units === 'metric' ? 2 : 1);   // same precision as the table columns
    if (!sig && qk === 'Bo') return d.toFixed(4);
    return fmt(d, sig || 5);
  }
  /* one fixed resolution per unit system so a column of pressures lines up */
  function fmtP(d) { return S.units === 'metric' ? d.toFixed(Math.abs(d) < 10 ? 3 : 2) : d.toFixed(Math.abs(d) < 100 ? 2 : 1); }
  function fmtT(f) { return fmt(U.tFromF(f, S.units), 4) + ' ' + U.unit('T', S.units); }
  /* property values: one resolution per property so a column lines up; compressibilities in scientific form */
  function sci(v, s) { if (v === 0) return '0'; var e = Math.floor(Math.log10(Math.abs(v))); return (v / Math.pow(10, e)).toFixed(s - 1) + 'e' + e; }
  function fmtProp(k, v) {
    if (!isNum(v)) return '—';
    var P = E.PROPS[S.fluid][k], d = disp(P.q, v), met = S.units === 'metric';
    switch (S.fluid + '.' + k) {
      case 'oil.rs': return d.toFixed(met ? 2 : 1);
      case 'oil.bo': return d.toFixed(4);
      case 'oil.co': case 'gas.cg': return sci(d, 4);
      case 'gas.z': case 'gas.ppr': return d.toFixed(4);
      case 'gas.eg': return d.toFixed(met ? 2 : 2);
      default: return fmt(d, 4);
    }
  }
  /* unit text of a property, with the standard basis where the unit refers to standard volumes */
  var STD_VOL = { 'oil.rs': 1, 'oil.bo': 1, 'gas.bg': 1, 'gas.bgrb': 1, 'gas.eg': 1 };
  function propUnit(k) { var qk = E.PROPS[S.fluid][k].q; return qk === 'none' ? '–' : unitOf(qk); }
  function basisTag(k) { return STD_VOL[S.fluid + '.' + k] ? basis().short.replace(', 101.325 kPa', '') : ''; }
  function propUnitB(k) { return propUnit(k) + (basisTag(k) ? ' · ' + basisTag(k) : ''); }

  function pLabel() { return 'Pressure, ' + U.unit('p', S.units, S.gauge); }

  /* -------------------------------------------------------- engine input */
  function engineInput(extra) {
    return wfEngineInput(extra);
    var f = F();
    captureCanon(f, S.units, S.gauge);
    var inp = Object.assign({}, f, { fluid: S.fluid, units: S.units, gauge: S.gauge, stdBasis: S.stdBasis, m: Object.assign({}, f.m), canon: Object.assign({}, f.canon) });
    return Object.assign(inp, extra || {});
  }

  function recompute() {
    res = E.run(engineInput());
    cmpRes = [];
    if (res.ok && res.pressures.length > 1) {
      var grp = compareGroup();
      Object.keys(S.compare[S.fluid]).forEach(function (mk) {
        if (!S.compare[S.fluid][mk] || !grp) return;
        var mm = {}; mm[grp.mkey] = mk;
        var extra = { m: Object.assign({}, F().m, mm), pressuresPsia: res.pressures, calcMode: 'list' };
        if (S.fluid === 'gas') extra.behavior = 'real';
        var r = E.run(engineInput(extra));
        cmpRes.push({ method: mk, label: grp.meta[mk].label, res: r });
      });
    }
    computeMeasured();
    /* keep the selection on the same physical pressure (same tolerance as the engine) */
    var sp = S.selP[S.fluid], ps = res.pressures || [];
    S.sel[S.fluid] = -1;
    if (sp !== null) for (var i = 0; i < ps.length; i++) if (Math.abs(ps[i] - sp) <= E.P_TOL) { S.sel[S.fluid] = i; break; }
  }
  function setSel(i) {
    S.sel[S.fluid] = i;
    S.selP[S.fluid] = res && res.pressures && i >= 0 ? res.pressures[i] : null;
  }
  function clearSel() { S.sel[S.fluid] = -1; S.selP[S.fluid] = null; }

  /* measured data: parse, check the standard basis per column, evaluate the model at the measured pressures */
  function computeMeasured() {
    meas = null;
    var md = S.measured[S.fluid];
    if (!md.text || !md.text.trim()) return;
    var parsed = MD.parse(md.text, S.fluid, S.units, S.gauge);
    meas = { parsed: parsed, calc: null, cmp: [], basis: null };
    if (parsed.errors.length) return;
    meas.basis = MD.checkBasis(S.fluid, parsed.columns, md.basis, basis().key);
    if (!res || !res.ok) return;
    var ps = parsed.rows.map(function (r) { return r.p; });
    meas.calc = E.run(engineInput({ pressuresPsia: ps, calcMode: 'list', noInsert: true }));
    var grp = compareGroup();
    Object.keys(S.compare[S.fluid]).forEach(function (mk) {
      if (!S.compare[S.fluid][mk] || !grp) return;
      var mm = {}; mm[grp.mkey] = mk;
      var extra = { m: Object.assign({}, F().m, mm), pressuresPsia: ps, calcMode: 'list', noInsert: true };
      if (S.fluid === 'gas') extra.behavior = 'real';
      meas.cmp.push({ method: mk, label: grp.meta[mk].label, res: E.run(engineInput(extra)) });
    });
  }
  /* measured value of one column on the calculation's basis, or null when blocked / missing */
  function measValue(row, k) {
    var v = row.vals[k];
    if (v === null || v === undefined) return null;
    var c = meas.basis && meas.basis.cols[k];
    if (!c || c.status === 'blocked') return null;
    return v * (c.factor || 1);
  }

  /* which method group drives the chart property (for "compare") */
  function compareGroup() {
    var p = S.chartProp[S.fluid];
    if (S.fluid === 'oil') {
      if (p === 'rs') return { mkey: 'rs', meta: M.rsFamily, title: 'Rs / pb correlation' };
      if (p === 'bo') return { mkey: 'bo', meta: M.bo, title: 'Bo correlation (p ≤ pb)' };
      if (p === 'mu') return { mkey: 'muDead', meta: M.muDead, title: 'Dead-oil viscosity' };
      if (p === 'co') return { mkey: 'co', meta: M.co, title: 'co correlation' };
    }
    var zm = {}; ['dak', 'papay', 'beggs_brill'].forEach(function (k) { zm[k] = M.z[k]; });
    return { mkey: 'z', meta: zm, title: 'Z correlation' };
  }
  function currentMethodKey() {
    var g = compareGroup();
    if (S.fluid === 'gas' && F().behavior === 'ideal') return '__ideal';
    return F().m[g.mkey];
  }

  var schedule = function () {
    clearTimeout(timer);
    timer = setTimeout(function () { recompute(); refresh(); }, 160);
  };

  /* ================================================================ markup */
  var ICON = {
    oil: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    gas: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="7" cy="9" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="14" cy="6" r="1.6" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="13" r="2.4" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="16" r="1.5" stroke="currentColor" stroke-width="1.6"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="8" r="1" fill="currentColor"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4 2.8 19.5h18.4L12 4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.1" fill="currentColor"/></svg>',
    err: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.7"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="16.9" r="1" fill="currentColor"/></svg>'
  };
  var VIEWS = [['inputs', 'Calculator'], ['table', 'Results Table'], ['measured', 'Measured Data'], ['methods', 'Methods & References']];

  /* light / dark: the same switch as the top bar (Main keeps state.theme and localStorage in step) */
  function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
  function themeBtnInner() { return isLight() ? ICON.moon + '<span>Dark</span>' : ICON.sun + '<span>Light</span>'; }
  function toggleTheme() {
    var next = isLight() ? 'dark' : 'light';
    if (opts.onTheme) opts.onTheme(next);
    else { if (next === 'light') document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme'); try { localStorage.setItem('pvtTheme', next); } catch (e) {} }
    var b = q('#pv-theme'); if (b) { b.innerHTML = themeBtnInner(); b.setAttribute('aria-label', 'Switch to ' + (isLight() ? 'dark' : 'light') + ' theme'); }
    if ((S.view === 'inputs' || S.view === 'charts') && G().ready) renderChart();   // chart colours are read from the theme variables
    if (S.view === 'inputs' && W().page === 'detail') renderWfChart();
  }
  function shell() {
    var oil = S.fluid === 'oil';
    return '<div class="pv" data-fluid="' + S.fluid + '">'
      + '<div class="pv-top">'
      + '<div class="pv-hero">'
      + '<div class="pv-hero-l"><div class="pv-eyebrow"><span class="pv-rule"></span><span>PVT Calculator</span></div>'
      + '<div class="pv-titlerow"><h2 class="pv-title">' + (oil ? 'Oil Properties' : 'Gas Properties') + '</h2>'
      + '<p class="pv-sub">' + (oil ? 'Rs, Bo, μo and co from one set of inputs, using published black-oil correlations. Explain any result for its equation and pressure trend.' : 'Z, Bg, ρg, μg and cg from one set of inputs, using published natural-gas correlations. Explain any result for its equation and pressure trend.') + '</p></div></div>'
      + '<div class="pv-hero-r"><span class="pv-mono" id="pv-fluid-lbl">Fluid</span><div class="pv-pills pv-fluid" role="group" aria-labelledby="pv-fluid-lbl">'
      + '<button type="button" data-fluid="oil" class="' + (oil ? 'is-on' : '') + '" aria-pressed="' + oil + '">' + ICON.oil + 'Oil</button>'
      + '<button type="button" data-fluid="gas" class="' + (!oil ? 'is-on' : '') + '" aria-pressed="' + !oil + '">' + ICON.gas + 'Gas</button>'
      + '</div></div></div>'
      + '<div class="pv-bar"><div class="pv-tabs" role="tablist" aria-label="Calculator views">'
      + VIEWS.slice(0, 1).map(function (v) { return '<button type="button" role="tab" data-view="' + v[0] + '" class="pv-tab' + (S.view === v[0] ? ' is-on' : '') + '" aria-selected="' + (S.view === v[0]) + '">' + v[1] + '</button>'; }).join('')
      + '</div><details class="pv-more-tools"><summary>More tools</summary><div class="pv-more-menu">'
      + VIEWS.slice(2).map(function (v) { return '<button type="button" class="ui-btn ui-btn-ghost" data-goto="' + v[0] + '">' + v[1] + '</button>'; }).join('')
      + '</div></details><div class="pv-ctx" id="pv-ctx"></div><div class="pv-status" id="pv-status" role="status" aria-live="polite"></div>'
      + '<div class="pv-bar-end">'
      + '<button type="button" class="ui-btn ui-btn-sub" id="pv-reset" title="Start a new calculation for this fluid and clear its measured data">Start over</button>'
      + '<button type="button" class="ui-btn ui-btn-ghost pv-explain-btn" id="pv-explain-btn" aria-expanded="' + S.explain + '" aria-controls="pv-explain">' + ICON.info + '<span>Explain This Stage</span></button></div></div>'
      + '</div>'
      + '<div class="pv-work"><div class="pv-main" id="pv-main"></div>'
      + '<aside class="pv-explain' + (S.explain ? ' is-open' : '') + '" id="pv-explain" role="dialog" aria-modal="false" aria-labelledby="pv-ex-title"><div class="pv-ex-in">'
      + '<div class="pv-ex-head"><div class="pv-ex-title" id="pv-ex-title"></div><div class="pv-ex-tag" id="pv-ex-tag"></div>'
      + '<button type="button" class="pv-ex-close" id="pv-ex-close" aria-label="Close explanation" title="Close (Esc)">&#10005;</button></div>'
      + '<div class="pv-ex-body" id="pv-ex-body"></div></div></aside></div>'
      + '</div>';
  }

  /* -------------------------------------------------------------- fields */
  function val(k) { var v = F()[k]; return v === undefined || v === null ? '' : v; }
  function helpBtn(topic, label) { return '<button type="button" class="pv-help" data-help="' + topic + '" aria-label="Explain ' + esc(label) + '" title="Explain ' + esc(label) + '">' + ICON.help + '</button>'; }
  function field(k, label, unit, o) {
    o = o || {};
    return '<div class="pv-f' + (o.wide ? ' is-wide' : '') + '" data-f="' + k + '"><label class="pv-l" for="pv-in-' + k + '">' + label + '</label>' + (o.help ? helpBtn(o.help, label) : '')
      + '<span class="pv-in"><input id="pv-in-' + k + '" data-k="' + k + '" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(val(k)) + '" aria-describedby="pv-err-' + k + (o.hint ? ' pv-hint-' + k : '') + '">'
      + (KIND[k] ? inputUnitSelect(k, label) : (unit ? '<span class="pv-u" aria-hidden="true">' + unit + '</span>' : '')) + '</span>'
      + '<span class="pv-err" id="pv-err-' + k + '" data-err="' + k + '"></span>'
      + (o.hint ? '<span class="pv-hint" id="pv-hint-' + k + '">' + o.hint + '</span>' : '') + '</div>';
  }
  function pills(key, cur, items, label) {
    return '<div class="pv-pills" role="group" data-seg="' + key + '" aria-label="' + esc(label || key) + '">' + items.map(function (it) {
      var on = String(cur) === String(it[0]);
      return '<button type="button" data-v="' + it[0] + '" class="' + (on ? 'is-on' : '') + '" aria-pressed="' + on + '">' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function select(mkey, group, label, filter, help) {
    var cur = F().m[mkey];
    return '<div class="pv-f is-wide" data-f="' + mkey + 'Method"><label class="pv-l" for="pv-m-' + mkey + '">' + label + '</label>' + (help ? helpBtn(help, label) : '')
      + '<span class="pv-in"><select id="pv-m-' + mkey + '" data-m="' + mkey + '" aria-describedby="pv-err-' + mkey + 'Method">'
      + Object.keys(group).filter(function (k) { return !filter || filter(k); }).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(group[k].label) + '</option>'; }).join('')
      + '</select></span><span class="pv-err" id="pv-err-' + mkey + 'Method" data-err="' + mkey + 'Method"></span></div>';
  }
  function card(title, body, o) {
    o = o || {};
    return '<section class="pv-card' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + '><div class="pv-card-h">' + (o.n ? '<span class="pv-step">' + o.n + '</span>' : '') + '<h3>' + title + '</h3>' + (o.aside || '') + '</div>' + body + '</section>';
  }
  function optRow(label, control) { return '<div class="pv-opt"><span class="pv-opt-l">' + label + '</span>' + control + '</div>'; }

  /* ---------------------------------------------------------------- inputs */
  function conditionsCard() {
    var f = F(), pu = U.unit('p', S.units, S.gauge), tu = U.unit('T', S.units), dpu = U.unit('dp', S.units);
    var body = optRow('Calculate at', pills('calcMode', f.calcMode, [['single', 'One pressure'], ['range', 'Pressure range'], ['list', 'Pressure list']], 'Calculate at'));
    if (f.calcMode === 'single') body += '<div class="pv-grid2">' + field('p', 'Pressure, p', pu) + field('T', 'Temperature, T', tu) + '</div>';
    else if (f.calcMode === 'range') body += '<div class="pv-grid4">' + field('pMin', 'From, p<sub>min</sub>', pu) + field('pMax', 'To, p<sub>max</sub>', pu) + field('pStep', 'Step, Δp', dpu) + field('T', 'Temperature, T', tu) + '</div>';
    else body += '<div class="pv-grid2"><div class="pv-f is-wide" data-f="pList"><label class="pv-l" for="pv-in-pList">Pressure list</label><textarea id="pv-in-pList" data-k="pList" rows="2" spellcheck="false" aria-describedby="pv-err-pList pv-hint-pList">' + esc(val('pList')) + '</textarea>' + inputUnitSelect('pList', 'Pressure list') + '<span class="pv-err" id="pv-err-pList" data-err="pList"></span><span class="pv-hint" id="pv-hint-pList">Commas, spaces or new lines.</span></div>' + field('T', 'Temperature, T', tu) + '</div>';
    return card('Pressure and temperature', body, { n: 1 });
  }
  function oilFluidCard() {
    var f = F(), pu = U.unit('p', S.units, S.gauge), rsU = U.unit('Rs', S.units);
    var body = optRow('Oil gravity as', pills('oilGravityBasis', f.oilGravityBasis, [['api', 'API gravity'], ['density', 'Stock-tank density']], 'Oil gravity as'))
      + '<div class="pv-grid2">' + (f.oilGravityBasis === 'api' ? field('api', 'Oil gravity, API', '°API', { help: 'api' }) : field('rhoSto', 'Stock-tank oil density at 60 °F', U.unit('density', S.units), { help: 'api' }))
      + field('gg', 'Gas specific gravity, γ<sub>g</sub>', 'air = 1', { help: 'gg' }) + '</div>'
      + optRow('Known at the bubble point', pills('oilChar', f.oilChar, [['pb', 'Bubble-point pressure, pb'], ['rsb', 'Solution GOR, Rsb']], 'Known at the bubble point'))
      + '<div class="pv-grid2">' + (f.oilChar === 'pb' ? field('pb', 'Bubble-point pressure, p<sub>b</sub>', pu, { help: 'pb' }) : field('rsb', 'Solution GOR at p<sub>b</sub>, R<sub>sb</sub>', rsU + ' · 60 °F', { help: 'pb' }))
      + '<div class="pv-derived" id="pv-derived" aria-live="polite"></div></div>';
    return card('Oil and gas', body, { n: 2 });
  }
  function oilMethodsCard() {
    var f = F(), pu = U.unit('p', S.units, S.gauge), tu = U.unit('T', S.units);
    var adv = '<details class="pv-adv" id="pv-adv"' + (S.advanced.oil ? ' open' : '') + '><summary>More correlations and separator conditions</summary>'
      + '<div class="pv-grid2">' + select('bo', M.bo, 'Bo below p<sub>b</sub>') + select('co', M.co, 'co and Bo above p<sub>b</sub>', null, 'co')
      + select('muDead', M.muDead, 'Dead-oil viscosity') + '<div class="pv-f"><span class="pv-l">Live-oil viscosity</span><span class="pv-fixed">Beggs-Robinson below p<sub>b</sub> · Vasquez-Beggs above</span></div></div>'
      + '<label class="pv-check"><input type="checkbox" data-k="sepUse"' + (f.sepUse ? ' checked' : '') + '> Separator conditions known (corrects γ<sub>g</sub> for Vasquez-Beggs)</label>'
      + (f.sepUse ? '<div class="pv-grid2">' + field('psep', 'Separator pressure', pu) + field('tsep', 'Separator temperature', tu) + '</div>' : '')
      + '</details>';
    return card('Correlations', '<div class="pv-grid1">' + select('rs', M.rsFamily, 'Rs and p<sub>b</sub>', null, 'rsFamily') + '</div>' + adv, { n: 3 });
  }
  function basisCard() {
    var gas = S.fluid === 'gas';
    var body = optRow('Input preset / results', pills('units', S.units, [['field', 'Field'], ['metric', 'Metric']], 'Unit system'))
      + optRow('Pressure', pills('gauge', S.gauge ? '1' : '0', [['0', S.units === 'metric' ? 'Absolute, bar(a)' : 'Absolute, psia'], ['1', S.units === 'metric' ? 'Gauge, bar(g)' : 'Gauge, psig']], 'Pressure convention'))
      + (gas ? optRow('Standard volumes' + helpBtn('basis', 'standard conditions'), pills('stdBasis', S.stdBasis, [['corr', '60 °F, 101.325 kPa'], ['lab', '15 °C, 101.325 kPa']], 'Standard-condition basis'))
        + '<p class="pv-note">Applies to Bg and Eg (gas taken as ideal at standard conditions). Changing units does not change this basis.</p>'
        : '<div class="pv-opt"><span class="pv-opt-l">Standard volumes' + helpBtn('basis', 'standard conditions') + '</span><span class="pv-fixed">60 °F, 101.325 kPa (correlation basis)</span></div>'
        + '<p class="pv-note">Rs, Rsb and Bo stay on the correlation basis; a 15 °C laboratory conversion would need the oil’s thermal expansion and is not offered.</p>');
    return card('Results and standard conditions', body, { cls: 'pv-card-quiet' });
  }

  function compTable() {
    var f = F();
    var rows = f.comp.map(function (r, i) {
      return '<tr><td class="pv-num">' + (i + 1) + '</td>'
        + '<td><input data-c="' + i + '" data-cf="name" value="' + esc(r.name) + '" aria-label="Component, row ' + (i + 1) + '"></td>'
        + '<td><input data-c="' + i + '" data-cf="formula" value="' + esc(r.formula) + '" aria-label="Formula, row ' + (i + 1) + '"></td>'
        + '<td><input data-c="' + i + '" data-cf="y" inputmode="decimal" value="' + esc(r.y) + '" aria-label="Mole ' + (f.compBasis === 'percent' ? 'percent' : 'fraction') + ', row ' + (i + 1) + '"></td>'
        + '<td class="pv-num" data-cmw="' + i + '"></td><td class="pv-num" data-ctc="' + i + '"></td><td class="pv-num" data-cpc="' + i + '"></td></tr>';
    }).join('');
    return optRow('Entries are', pills('compBasis', f.compBasis, [['fraction', 'Mole fractions (Σ = 1)'], ['percent', 'Mole percent (Σ = 100)']], 'Composition basis'))
      + '<label class="pv-check"><input type="checkbox" data-k="normalize"' + (f.normalize ? ' checked' : '') + '> Normalise to Σ = 1 if the total is off (reported)</label>'
      + '<div class="pv-comp-wrap"><table class="pv-tbl pv-comp"><thead><tr><th>#</th><th>Component</th><th>Formula</th><th>y<sub>i</sub> (' + (f.compBasis === 'percent' ? 'mol %' : 'fraction') + ')</th><th>M<sub>i</sub> lb/lbmol</th><th>T<sub>ci</sub> °R</th><th>P<sub>ci</sub> psia</th></tr></thead><tbody>' + rows + '</tbody>'
      + '<tfoot><tr><td></td><td colspan="2">Total entered</td><td class="pv-num" id="pv-comp-sum"></td><td colspan="3" id="pv-comp-mix"></td></tr></tfoot></table></div>'
      + '<div class="pv-err pv-err-block" data-err="comp" id="pv-err-comp"></div>'
      + '<details class="pv-paste"><summary>Paste a composition (component, formula, y per line)</summary><textarea id="pv-comp-paste" rows="4" spellcheck="false" aria-label="Pasted composition"></textarea>'
      + '<button type="button" class="ui-btn ui-btn-ghost" id="pv-comp-apply">Apply pasted composition</button></details>';
  }
  function gasFluidCard() {
    var f = F();
    var body = optRow('Describe the gas by', pills('gasBasis', f.gasBasis, [['gravity', 'Gas gravity'], ['composition', 'Composition']], 'Gas description'))
      + (f.gasBasis === 'gravity' ? '<div class="pv-grid2">' + field('gg', 'Gas specific gravity, γ<sub>g</sub>', 'air = 1', { help: 'gg' }) + '</div>' : compTable());
    return card('Gas', body, { n: 2 });
  }
  function gasMethodsCard() {
    var f = F(), pctU = f.sourBasis === 'percent' ? 'mol %' : 'fraction';
    var body = optRow('Gas model', pills('behavior', f.behavior, [['real', 'Real gas'], ['ideal', 'Ideal gas, Z = 1']], 'Gas model'));
    if (f.behavior === 'real') body += '<div class="pv-grid1">' + select('z', M.z, 'Z factor', null, 'z') + '</div>' + (f.m.z === 'manual' ? manualZBlock() : '');
    var adv = '<details class="pv-adv" id="pv-adv"' + (S.advanced.gas || f.m.sour !== 'none' ? ' open' : '') + '><summary>Pseudo-criticals, sour gas and viscosity</summary>'
      + '<div class="pv-grid2">' + select('pc', M.pc, 'Pseudo-critical properties', function (k) { return f.gasBasis === 'composition' || k !== 'kay'; }, 'pc')
      + select('sour', M.sour, 'Sour-gas correction', function (k) { return !(k === 'carr_kobayashi_burrows' && f.m.pc === 'kay'); }, 'sour') + '</div>'
      + (f.m.sour !== 'none' && f.gasBasis === 'gravity' ? optRow('Non-hydrocarbons as', pills('sourBasis', f.sourBasis, [['fraction', 'Mole fraction'], ['percent', 'Mole %']], 'Non-hydrocarbon basis'))
        + '<div class="pv-grid3">' + field('yCO2', 'CO₂, y<sub>CO2</sub>', pctU) + field('yH2S', 'H₂S, y<sub>H2S</sub>', pctU) + (f.m.sour === 'carr_kobayashi_burrows' ? field('yN2', 'N₂, y<sub>N2</sub>', pctU) : '') + '</div>'
        : (f.m.sour !== 'none' ? '<p class="pv-note">CO₂, H₂S and N₂ fractions are taken from the composition.</p>' : ''))
      + '<div class="pv-grid2">' + select('mu', M.muGas, 'Gas viscosity') + '</div>'
      + '<span class="pv-err pv-err-block" data-err="sourMethod" id="pv-err-sourMethod"></span>'
      + '</details>';
    return card('Correlations', body + adv, { n: 3 });
  }
  function manualZBlock() {
    return '<div class="pv-manual"><div class="pv-manual-read" id="pv-zread">Ppr and Tpr appear here once pressure, temperature and gas are valid.</div>'
      + '<div class="pv-grid2">' + field('zManual', 'Z read from the chart', '–', { hint: 'One pressure only — no curve, no cg.' })
      + '<div class="pv-f"><label class="pv-l" for="pv-zimg">Chart image (optional)</label><input type="file" accept="image/*" id="pv-zimg"></div></div>'
      + (S.zImg ? '<img class="pv-zimg" src="' + S.zImg + '" alt="Standing-Katz chart supplied by the user">' : '') + '</div>';
  }

  /* Everyday workflow: edit essentials beside the live chart. All specialist controls
     still use the existing state and engine; opening a tool never resets a fluid. */
  function workspaceConditions() {
    var f = F(), pu = unitOf('p'), tu = unitOf('T'), body = '';
    if (f.calcMode === 'single') body += field('p', 'Pressure', pu, { hint: 'Select absolute (a) or gauge (g) pressure beside the value. Gauge uses a 1 atm reference.' });
    else if (f.calcMode === 'range') body += '<div class="pv-grid2">' + field('pMin', 'From pressure', pu) + field('pMax', 'To pressure', pu) + '</div><p class="pv-note">Pressure curve · increment ' + esc(val('pStep')) + ' ' + esc(inputUnit(f, 'pStep')) + '. Change the increment in Advanced.</p>';
    else body += '<div class="pv-f" data-f="pList"><label class="pv-l" for="pv-in-pList">Pressure list</label><textarea id="pv-in-pList" data-k="pList" rows="2" aria-describedby="pv-err-pList">' + esc(val('pList')) + '</textarea>' + inputUnitSelect('pList', 'Pressure list') + '<span class="pv-err" id="pv-err-pList" data-err="pList"></span><span class="pv-hint">Separate pressures with commas or spaces.</span></div>';
    body += field('T', 'Temperature', tu);
    return card('Conditions', body);
  }
  function workspaceFluid() {
    var f = F(), oil = S.fluid === 'oil', body = '';
    if (oil) {
      body = '<div class="pv-grid2">'
        + (f.oilGravityBasis === 'api' ? field('api', 'Oil gravity', '°API', { help: 'api' }) : field('rhoSto', 'Stock-tank density at 60 °F', unitOf('density'), { help: 'api' }))
        + field('gg', 'Gas gravity', 'air = 1', { help: 'gg' }) + '</div>'
        + '<span class="pv-l">I know the oil’s</span>'
        + pills('oilChar', f.oilChar, [['pb', 'Bubble-point pressure'], ['rsb', 'Solution GOR at bubble point']], 'Known oil property')
        + (f.oilChar === 'pb' ? field('pb', 'Bubble-point pressure', unitOf('p'), { help: 'pb' }) : field('rsb', 'Solution GOR at bubble point', unitOf('Rs') + ' · 60 °F', { help: 'pb' }))
        ;
    } else {
      body = f.gasBasis === 'composition' ? compTable() : field('gg', 'Gas gravity', 'air = 1', { help: 'gg', hint: 'Gas density relative to air. For composition or sour gas, open Advanced.' });
    }
    return card(oil ? 'Fluid description' : 'Gas description', body);
  }
  function workspaceOptions() {
    var f = F(), oil = S.fluid === 'oil';
    var extra = optRow('Calculate at', pills('calcMode', f.calcMode, [['single', 'One pressure'], ['range', 'Pressure range'], ['list', 'Pressure list']], 'Calculation type'))
      + (f.calcMode === 'range' ? field('pStep', 'Pressure increment', unitOf('dp'), { hint: 'Controls how many points are calculated.' }) : '')
      + (oil ? optRow('Oil gravity input', pills('oilGravityBasis', f.oilGravityBasis, [['api', 'API gravity'], ['density', 'Stock-tank density']], 'Oil gravity as'))
        : optRow('Gas input', pills('gasBasis', f.gasBasis, [['gravity', 'Gas gravity'], ['composition', 'Composition']], 'Gas description')));
    return '<details class="pv-work-options" id="pv-work-options"' + (S.optionsOpen ? ' open' : '') + '><summary>Advanced <span>Change method or add more fluid data</span></summary><div class="pv-options-body">'
      + extra + (oil ? oilMethodsCard() : gasMethodsCard()) + basisCard()
      + '<button type="button" class="ui-btn ui-btn-ghost" id="pv-default-methods">Restore default methods</button>'
      + '<button type="button" class="pv-text-btn" data-goto="methods">Methods and limits</button><p class="pv-note">Defaults are estimates, not measured PVT data. Method verification and limits remain available in More tools.</p></div></details>';
  }
  var GUIDE_COPY = {
    oil: {
      rs: ['Solution gas–oil ratio', 'How much gas is dissolved in the oil?', 'Rs'],
      bo: ['Oil formation volume factor', 'How does oil volume in the reservoir compare with stock-tank volume?', 'Bo'],
      mu: ['Oil viscosity', 'How easily does the live oil flow?', 'μo'],
      co: ['Oil compressibility', 'How much does oil above bubble point compress?', 'co']
    },
    gas: {
      z: ['Z-factor', 'How much does the gas depart from ideal-gas behavior?', 'Z'],
      bg: ['Gas formation volume factor', 'Compare gas volume in the reservoir with its standard volume.', 'Bg'],
      rho: ['Gas density', 'Find the mass of gas per unit volume.', 'ρg'],
      mu: ['Gas viscosity', 'How easily does the gas flow?', 'μg'],
      cg: ['Gas compressibility', 'How does gas volume respond to a pressure change?', 'cg']
    }
  };
  function guideCopy() { return GUIDE_COPY[S.fluid][S.chartProp[S.fluid]]; }
  function progressHtml() {
    return '<ol class="pv-guide-progress" aria-label="Calculation steps">'
      + ['Choose property', 'Enter values', 'See result'].map(function (t, i) {
        var active = G().stage === 'choose' ? 0 : (G().ready ? 2 : 1);
        return '<li' + (active === i ? ' aria-current="step"' : '') + '><span>' + (i + 1) + '</span>' + t + '</li>';
      }).join('') + '</ol>';
  }
  function propertyPicker() {
    return '<div class="pv-view pv-guide-start">' + progressHtml()
      + '<div class="pv-guide-intro"><h2>What would you like to calculate?</h2><p>Choose one property. We’ll guide you through the inputs.</p></div>'
      + '<div class="pv-choice-grid">' + Object.keys(GUIDE_COPY[S.fluid]).map(function (k) {
        var c = GUIDE_COPY[S.fluid][k];
        return '<button type="button" class="pv-choice" data-choose-property="' + k + '"><span class="pv-choice-symbol">' + esc(c[2]) + '</span><strong>' + esc(c[0]) + '</strong><span>' + esc(c[1]) + '</span><em>Calculate ' + esc(c[2]) + ' →</em></button>';
      }).join('') + '</div><p class="pv-guide-foot">Methods are already selected. You can change them later in Advanced.</p></div>';
  }
  function pendingAnswer() {
    return '<div class="pv-pending" id="pv-pending" role="status"><span class="pv-pending-symbol">' + esc(guideCopy()[2]) + '</span><h3>' + (G().attempted ? 'Check your inputs' : 'Your answer will appear here') + '</h3><p>'
      + (G().attempted ? 'Correct the highlighted fields, then calculate again.' : 'Enter your values, then choose Calculate. No method selection is needed.')
      + '</p></div>';
  }
  function answerHtml() {
    if (!G().ready || !res || !res.ok) return pendingAnswer();
    return '<div class="pv-answer" id="pv-answer" tabindex="-1"><div class="pv-answer-top"><span class="pv-mono">3 · Your result</span><h3>' + esc(guideCopy()[0]) + '</h3></div>'
      + chartsView() + '</div>';
  }
  function inputsView() {
    return wfView();
    if (G().stage === 'choose') return propertyPicker();
    var copy = guideCopy();
    return '<div class="pv-view pv-guided">' + progressHtml()
      + '<div class="pv-guide-selection"><div><span class="pv-mono">' + esc(S.fluid) + ' calculator</span><h2>' + esc(copy[0]) + ' <small>(' + esc(copy[2]) + ')</small></h2><p>' + esc(copy[1]) + '</p></div><button type="button" class="ui-btn ui-btn-ghost" id="pv-change-property">Change property</button></div>'
      + '<div class="pv-workspace"><section class="pv-entry" aria-label="Required inputs"><div class="pv-entry-head"><h3>2 · Enter values</h3>'
      + pills('units', S.units, [['field', 'Field'], ['metric', 'Metric']], 'Unit system') + '</div>'
      + '<div class="pv-example-row"><span id="pv-example-label"' + (S.example[S.fluid] ? ' class="pv-chip is-example"' : '') + '>' + (S.example[S.fluid] ? 'Example data · replace with your values' : 'Use your fluid data, or try an example.') + '</span>'
      + '<button type="button" class="pv-text-btn" id="pv-example">Try example</button><button type="button" class="pv-text-btn" id="pv-clear">Clear</button></div>'
      + '<div class="pv-errsum" id="pv-errsum" role="alert" hidden></div>' + workspaceConditions() + workspaceFluid()
      + '<button type="button" class="ui-btn ui-btn-primary pv-calculate" id="pv-calculate">Calculate ' + esc(copy[2]) + '</button>'
      + '<div class="pv-guide-method">Using ' + esc(methodLabelFor(S.chartProp[S.fluid])) + '. <span>Change this in Advanced.</span></div>'
      + workspaceOptions() + '<p class="pv-input-basis">Select units beside each input. Results: ' + esc(S.units === 'metric' ? 'Metric' : 'Field') + '. Standard volumes: ' + esc(basis().short) + '.</p></section>'
      + '<section class="pv-output" id="pv-guided-output" aria-label="Calculation result">' + answerHtml() + '</section></div></div>';
  }

  /* --------------------------------------------------------------- charts */
  /* comparison colours: never the primary (fluid accent) colour; dash patterns differ too */
  var PALETTE_OIL = ['--blue', '--grn', '--red', '--teal', '--accb4'];
  var PALETTE_GAS = ['--grn', '--red', '--acca', '--teal', '--amb'];
  var DASHES = ['8 5', '2 4', '12 4 2 4', '4 3', '1 3'];
  function cssVar(n, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(n); return (v && v.trim()) || fb; }
  function primaryColor() { return S.fluid === 'oil' ? cssVar('--amb', '#b9831f') : cssVar('--blue', '#2f6fd0'); }
  function chartProps() { return Object.keys(E.PROPS[S.fluid]).filter(function (k) { return !E.PROPS[S.fluid][k].table; }); }

  function chartsView() {
    var props = chartProps(), cur = S.chartProp[S.fluid], grp = compareGroup(), curM = currentMethodKey();
    var cmp = Object.keys(grp.meta).filter(function (k) { return k !== curM; }).map(function (k) {
      return '<label class="pv-chip pv-chip-cmp"><input type="checkbox" data-cmp="' + k + '"' + (S.compare[S.fluid][k] ? ' checked' : '') + '>' + esc(grp.meta[k].label) + '</label>';
    }).join('');
    return '<div class="pv-view pv-charts">'
      + '<div class="pv-property-intro" id="pv-property-intro"></div>'
      + (F().calcMode !== 'single' ? '<div class="pv-tools">'
      + '<details class="pv-compare-options"' + (Object.keys(S.compare[S.fluid]).some(function (k) { return S.compare[S.fluid][k]; }) ? ' open' : '') + '><summary>Compare methods</summary><div class="pv-cmp" role="group" aria-label="Compare with">' + cmp + '</div></details>'
      + '<div class="pv-tools-end"><label class="pv-check"><input type="checkbox" id="pv-ylog"' + (S.yLog[S.fluid + cur] ? ' checked' : '') + '> Log scale</label>'
      + '<button type="button" class="ui-btn ui-btn-ghost" id="pv-png">Export PNG</button></div></div>' : '')
      + '<div class="pv-chart-card' + (F().calcMode === 'single' ? ' is-single' : '') + '"><div class="pv-chart-head"><div class="pv-chart-title" id="pv-chart-title"></div><div class="pv-chart-meta" id="pv-chart-meta"></div></div>'
      + '<div class="pv-legend" id="pv-legend"></div>'
      + '<div class="pv-chart-host" id="pv-chart-host"></div><div class="pv-single" id="pv-single" hidden></div><div class="pv-chart-msg" id="pv-chart-msg" hidden></div>'
      + '<div class="pv-pointbar" id="pv-pointbar" aria-live="polite"></div></div>'
      + '<div class="pv-notes-row" id="pv-chart-notes"></div>'
      + '<div class="pv-result-actions"><button type="button" class="ui-btn ui-btn-primary" id="pv-show-trend">' + (F().calcMode === 'single' ? 'Show how it changes with pressure' : 'Edit pressure range') + '</button><button type="button" class="ui-btn ui-btn-ghost" data-goto="table">Results Table</button><button type="button" class="ui-btn ui-btn-ghost" data-help="chart">Help reading this chart</button></div></div>';
  }

  function seriesFor(r, k) {
    return r.pressures.map(function (p, i) { var v = r.props[k].values[i]; return [disp('p', p), v === null ? null : disp(E.PROPS[S.fluid][k].q, v)]; });
  }
  function chartFmtY(k) { return function (v) { var a = Math.abs(v); if ((S.fluid + '.' + k) === 'oil.co' || (S.fluid + '.' + k) === 'gas.cg' || (a !== 0 && a < 1e-3)) return sci(v, 2); return +v.toPrecision(5) + ''; }; }

  function renderChart() {
    var hostEl = q('#pv-chart-host'), msg = q('#pv-chart-msg'), single = q('#pv-single');
    if (!hostEl) return;
    var k = S.chartProp[S.fluid], P = E.PROPS[S.fluid][k];
    var intro = q('#pv-property-intro'); if (intro) intro.textContent = PROP_HELP[S.fluid === 'gas' && k === 'mu' ? 'mu_gas' : k] || '';
    var ib = q('#pv-input-basis'); if (ib) ib.textContent = 'Pressure: ' + unitOf('p') + '. Standard volumes: ' + basis().short + '.';
    if (!chart || !hostEl.firstChild) { if (chart) chart.destroy(); chart = PvtChart.create(hostEl, { onSelect: function (i) { setSel(i); renderPointBar(); syncTableSel(); if (S.explain) renderExplain(); } }); }
    var title = q('#pv-chart-title'), meta = q('#pv-chart-meta'), legend = q('#pv-legend'), notes = q('#pv-chart-notes');
    if (!res || !res.ok) {
      chart.render(null); msg.hidden = false; single.hidden = true; hostEl.hidden = false;
      msg.innerHTML = '<b>Complete your fluid inputs</b><p>' + esc(errorSummaryText()) + '</p><span>The chart will appear here automatically.</span>'; 
      title.textContent = P.label + ', ' + P.sym; meta.textContent = ''; legend.innerHTML = ''; notes.innerHTML = ''; q('#pv-pointbar').innerHTML = '';
      return;
    }
    msg.hidden = true;
    var mLabel = S.fluid === 'gas' && F().behavior === 'ideal' ? 'Ideal gas (Z = 1)' : methodLabelFor(k);
    title.innerHTML = esc(P.label) + ', ' + P.sym + ' <span>' + esc(propUnit(k)) + '</span>';
    meta.innerHTML = '<span>T = ' + esc(fmtT(res.ctx.tF)) + '</span><span>' + esc(mLabel) + '</span>' + (basisTag(k) ? '<span>Standard basis ' + esc(basis().short) + '</span>' : '')
      + (S.fluid === 'oil' ? '<span>p<sub>b</sub> = ' + fmtQ('p', res.pb) + ' ' + esc(U.unit('p', S.units, S.gauge)) + '</span>' : '');
    /* one pressure: a result summary, not a curve */
    if (res.pressures.length === 1) {
      chart.render(null); hostEl.hidden = true; single.hidden = false; legend.innerHTML = '';
      setSel(0);
      single.innerHTML = singleSummary();
      notes.innerHTML = notesFor(k);
      q('#pv-pointbar').innerHTML = '';
      return;
    }
    hostEl.hidden = false; single.hidden = true;
    var series = [{ id: 'calc', label: mLabel, role: 'Selected', kind: 'calc', pts: seriesFor(res, k), color: primaryColor(), primary: true }];
    cmpRes.forEach(function (c, i) {
      if (!c.res.ok) return;
      series.push({ id: c.method, label: c.label, role: 'Compare', kind: 'calc', pts: alignTo(res.pressures, c.res, k), color: cssVar((S.fluid === 'oil' ? PALETTE_OIL : PALETTE_GAS)[i % 5], '#1d8a5a'), dash: DASHES[i % DASHES.length] });
    });
    var mpts = measuredSeries(k);
    if (mpts) series.push({ id: 'meas', label: 'Measured (PVT data)', role: 'Measured', kind: 'meas', pts: mpts, color: cssVar('--txt', '#16202f') });
    legend.innerHTML = series.map(function (s) {
      return '<span class="pv-lg' + (s.primary ? ' is-primary' : '') + '">' + (s.kind === 'meas' ? '<i class="pv-lg-sq" style="border-color:' + s.color + '"></i>' : '<svg width="28" height="8" aria-hidden="true"><line x1="1" x2="27" y1="4" y2="4" stroke="' + s.color + '" stroke-width="' + (s.primary ? 3.2 : 2) + '"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + '/></svg>')
        + '<em>' + s.role + '</em>' + esc(s.label) + '</span>';
    }).join('') + (res.pb && S.fluid === 'oil' ? '<span class="pv-lg"><svg width="14" height="12" aria-hidden="true"><line x1="7" x2="7" y1="0" y2="12" stroke="currentColor" stroke-dasharray="3 2" stroke-width="1.5"/></svg><em>Marker</em>Bubble point</span>' : '');
    chart.render({
      title: P.label + ', ' + P.sym + ' (' + propUnit(k) + (basisTag(k) ? ', ' + basis().short : '') + ') vs pressure', xLabel: pLabel(), xUnit: U.unit('p', S.units, S.gauge),
      yLabel: P.sym + ', ' + propUnit(k), yLog: !!S.yLog[S.fluid + k], series: series,
      marker: S.fluid === 'oil' && res.pb ? { x: disp('p', res.pb), label: 'pb = ' + fmtP(disp('p', res.pb)) + ' ' + U.unit('p', S.units, S.gauge) } : null,
      selected: S.sel[S.fluid], reasons: res.props[k].reasons,
      fmtX: function (v) { return +v.toPrecision(6) + ''; }, fmtY: chartFmtY(k)
    });
    notes.innerHTML = notesFor(k);
    renderPointBar();
  }
  function alignTo(ps, r, k) {
    return ps.map(function (p) {
      var j = -1; for (var t = 0; t < r.pressures.length; t++) if (Math.abs(r.pressures[t] - p) <= E.P_TOL) { j = t; break; }
      var v = j >= 0 ? r.props[k].values[j] : null;
      return [disp('p', p), v === null ? null : disp(E.PROPS[S.fluid][k].q, v)];
    }).concat(r.pressures.filter(function (p) { return !ps.some(function (x) { return Math.abs(x - p) <= E.P_TOL; }); }).map(function (p) {
      var j = r.pressures.indexOf(p), v = r.props[k].values[j]; return [disp('p', p), v === null ? null : disp(E.PROPS[S.fluid][k].q, v), 'extra'];
    })).sort(function (a, b) { return a[0] - b[0]; });
  }
  /* measured points of one property, on the calculation's basis; blocked columns are not plotted */
  function measuredSeries(k) {
    if (!meas || meas.parsed.errors.length || !meas.basis) return null;
    var c = meas.basis.cols[k];
    if (!c || c.status === 'blocked') return null;
    return meas.parsed.rows.map(function (r) { var v = measValue(r, k); return [disp('p', r.p), v === null ? null : disp(E.PROPS[S.fluid][k].q, v)]; });
  }
  function methodLabelFor(k) {
    var m = F().m;
    if (S.fluid === 'oil') return { rs: M.rsFamily[m.rs].label, bo: M.bo[m.bo].label + ' / ' + M.co[m.co].label + ' above pb', mu: M.muDead[m.muDead].label + ' → Beggs-Robinson → Vasquez-Beggs', co: M.co[m.co].label }[k];
    if (k === 'mu') return M.muGas[m.mu].label + ' with ' + M.z[m.z].label + ' Z';
    return M.z[m.z].label;
  }
  function pointValues(i, compact) {
    var P = E.PROPS[S.fluid], cur = S.chartProp[S.fluid];
    return Object.keys(P).filter(function (x) { return x === S.chartProp[S.fluid]; }).map(function (x) {
      var v = res.props[x].values[i];
      return '<span class="pv-pv' + (x === cur ? ' is-cur' : '') + '"><b>' + P[x].sym + '</b>' + (v === null ? '<i title="' + esc(res.props[x].reasons[i]) + '">n/a</i>' : fmtProp(x, v)) + '<em>' + esc(propUnitB(x)) + '</em></span>';
    }).join('');
  }
  /* compact strip under the chart: an instruction before a point is chosen, a value summary after */
  function renderPointBar() {
    var bar = q('#pv-pointbar');
    if (!bar || !res || !res.ok) return;
    var i = S.sel[S.fluid];
    if (i < 0 || i >= res.pressures.length) {
      bar.className = 'pv-pointbar is-empty';
      bar.innerHTML = ICON.info + '<span>Click a point (or focus the chart and use ← →) to read its values. The equation and substituted values open in <b>Explain This Stage</b>.</span>';
      return;
    }
    bar.className = 'pv-pointbar';
    bar.innerHTML = '<span class="pv-pb-p"><em>Point ' + (i + 1) + ' of ' + res.pressures.length + '</em><b>p = ' + fmtQ('p', res.pressures[i]) + '</b> ' + esc(U.unit('p', S.units, S.gauge)) + '</span>'
      + (res.phase ? '<span class="pv-phase is-' + res.phase[i].replace(' ', '-') + '">' + res.phase[i] + '</span>' : '')
      + '<span class="pv-pvals">' + pointValues(i, true) + '</span>'
      + '<button type="button" class="ui-btn ui-btn-ghost pv-eqbtn" data-help="point">Show equation</button>';
  }
  function singleSummary() {
    var k = S.chartProp[S.fluid], value = res.props[k].values[0], reason = res.props[k].reasons[0];
    return '<div class="pv-answer-value">' + (isNum(value) ? '<strong>' + esc(fmtProp(k, value)) + '</strong><span>' + esc(propUnitB(k)) + '</span>' : '<strong class="pv-unavailable">Not available</strong>') + '</div>'
      + '<p class="pv-answer-context">At ' + fmtQ('p', res.pressures[0]) + ' ' + esc(unitOf('p')) + ' and ' + esc(fmtT(res.ctx.tF)) + '.</p>'
      + (res.phase ? '<span class="pv-phase is-' + res.phase[0].replace(' ', '-') + '">' + esc(res.phase[0]) + '</span>' : '')
      + (reason ? '<p class="pv-note">' + esc(reason) + '</p>' : '')
      + '<p class="pv-note">Correlation estimate · ' + esc(methodLabelFor(k)) + '.</p>'
      + '<button type="button" class="ui-btn ui-btn-ghost" data-help="point">Explain this result</button>';
  }
  var PROP_AFFECT = { rs: ['Rs', 'pb'], bo: ['Bo', 'Bo above pb'], mu: ['μo', 'μo above pb', 'μo below pb'], co: ['co'], z: ['Z and dependent properties', 'all gas properties'], bg: ['Z and dependent properties', 'all gas properties'], rho: ['Z and dependent properties', 'all gas properties'], cg: ['Z and dependent properties', 'all gas properties'] };
  function warningsFor(k) {
    if (!res || !res.warnings) return [];
    var aff = (PROP_AFFECT[k] || []).concat(S.fluid === 'gas' && k === 'mu' ? ['μg', 'all gas properties', 'Z and dependent properties'] : []);
    return res.warnings.filter(function (w) { return w.affects.some(function (a) { return aff.indexOf(a) !== -1; }); });
  }
  /* compact, collapsible notes under the chart: gaps and warnings for the plotted property */
  function notesFor(k) {
    var P = E.PROPS[S.fluid][k], out = '';
    var gaps = res.props[k].reasons.map(function (r, i) { return r ? { i: i, r: r } : null; }).filter(Boolean);
    if (gaps.length) {
      var groups = {};
      gaps.forEach(function (g) { (groups[g.r] = groups[g.r] || []).push(fmtP(disp('p', res.pressures[g.i]))); });
      var byDesign = gaps.every(function (g) { return /^Not calculated below pb/.test(g.r); });
      out += '<details class="pv-note-box ' + (byDesign ? 'is-info' : 'is-gap') + '"><summary>' + (byDesign ? ICON.info : ICON.warn) + '<span>' + gaps.length + ' of ' + res.pressures.length + ' points have no ' + esc(P.sym) + (byDesign ? ' (not defined below p<sub>b</sub>)' : ' — shown as gaps') + '</span></summary><ul>'
        + Object.keys(groups).map(function (r) { var ps = groups[r]; return '<li>' + esc(r) + ' <span>p = ' + esc(ps.length > 6 ? ps.slice(0, 3).join(', ') + ' … ' + ps[ps.length - 1] : ps.join(', ')) + ' ' + esc(U.unit('p', S.units, S.gauge)) + '</span></li>'; }).join('') + '</ul></details>';
    }
    var ws = warningsFor(k);
    if (ws.length) {
      var acc = ws.filter(function (w) { return w.kind === 'accuracy'; }).length, rng = ws.length - acc;
      out += '<details class="pv-note-box is-warn"><summary>' + ICON.warn + '<span>' + [rng ? rng + ' outside a correlation range' : '', acc ? acc + ' accuracy note' + (acc > 1 ? 's' : '') : ''].filter(Boolean).join(' · ') + ' for ' + esc(P.sym) + '</span></summary><ul>'
        + ws.map(function (w) { return '<li>' + esc(w.msg) + '</li>'; }).join('') + '</ul></details>';
    }
    return out;
  }

  /* ---------------------------------------------------------- results table */
  function tableCols() {
    if (S.fluid === 'oil') return ['rs', 'bo', 'mu', 'co'];
    return ['ppr', 'z', 'bg', 'bgrb', 'eg', 'rho', 'v', 'mu', 'cg'];
  }
  function tableView() {
    return '<div class="pv-view pv-table">'
      + '<details class="pv-scal-wrap" open><summary><span class="pv-mono">Fluid characterisation</span><span id="pv-scal-sum"></span></summary><div class="pv-scalars" id="pv-scalars"></div></details>'
      + '<div class="pv-tools"><div class="pv-tbl-title" id="pv-tbl-title"></div><div class="pv-tools-end"><button type="button" class="ui-btn ui-btn-ghost" data-goto="charts">View charts</button><button type="button" class="ui-btn ui-btn-ghost" id="pv-csv">Export CSV</button></div></div>'
      + '<div class="pv-tbl-wrap" id="pv-tbl-wrap"></div>'
      + '<div class="pv-warnlist" id="pv-warnlist"></div></div>';
  }
  var KIND_TXT = { input: 'Input', correlation: 'Correlation', derived: 'Derived', assumed: 'Assumption' };
  function renderTable() {
    var sc = q('#pv-scalars'), tw = q('#pv-tbl-wrap'), wl = q('#pv-warnlist');
    if (!sc) return;
    if (!res || !res.ok) {
      sc.innerHTML = ''; wl.innerHTML = ''; q('#pv-scal-sum').textContent = '';
      q('#pv-tbl-title').textContent = '';
      tw.innerHTML = '<div class="pv-empty"><b>No results yet.</b> ' + esc(errorSummaryText()) + ' <button type="button" class="ui-btn ui-btn-sub" data-goto="inputs">Go to Inputs</button></div>';
      return;
    }
    sc.innerHTML = res.scalars.map(function (s) {
      var u = s.unitText !== undefined ? s.unitText : unitOf(s.q);
      if (s.key === 'rsb' || s.key === 'bob') u += ' · 60 °F';
      return '<div class="pv-sc is-' + s.kind + '"><span class="pv-sc-l">' + esc(s.label) + '</span><span class="pv-sc-v">' + fmtQ(s.q, s.v) + ' <em>' + esc(u) + '</em></span>'
        + '<span class="pv-sc-m"><b>' + KIND_TXT[s.kind] + '</b> · ' + esc(s.method) + '</span></div>';
    }).join('');
    var nAssumed = res.scalars.filter(function (s) { return s.kind === 'assumed'; }).length;
    q('#pv-scal-sum').textContent = res.scalars.length + ' values' + (nAssumed ? ' · ' + nAssumed + ' assumption' + (nAssumed > 1 ? 's' : '') : '');
    var cols = tableCols(), P = E.PROPS[S.fluid], sel = S.sel[S.fluid];
    q('#pv-tbl-title').innerHTML = '<b>' + res.pressures.length + ' point' + (res.pressures.length > 1 ? 's' : '') + '</b><span>T = ' + esc(fmtT(res.ctx.tF)) + '</span><span>Standard basis ' + esc(basis().short) + '</span>'
      + '<span>' + res.methods.map(function (m) { return esc(m[1]); }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(' · ') + '</span>';
    var head = '<tr><th scope="col">#</th><th scope="col">p<em>' + esc(U.unit('p', S.units, S.gauge)) + '</em></th>' + (S.fluid === 'oil' ? '<th scope="col" class="pv-txt">State</th>' : '')
      + cols.map(function (k) { return '<th scope="col" title="' + esc(P[k].label) + '">' + P[k].sym + '<em>' + esc(propUnit(k)) + (basisTag(k) ? ' · ' + esc(basisTag(k)) : '') + '</em></th>'; }).join('') + '</tr>';
    var notes = [], noteIdx = {};
    var body = res.pressures.map(function (p, i) {
      var isPb = res.phase && res.phase[i] === 'bubble point';
      return '<tr data-row="' + i + '" class="' + (i === sel ? 'is-sel' : '') + (isPb ? ' is-pb' : '') + '" tabindex="0" aria-selected="' + (i === sel) + '"><td class="pv-num">' + (i + 1) + '</td><td class="pv-num">' + fmtQ('p', p) + '</td>'
        + (S.fluid === 'oil' ? '<td class="pv-txt">' + (isPb ? '<b>bubble point</b>' + (res.inserted === i ? ' <i class="pv-tag">added</i>' : '') : res.phase[i]) + '</td>' : '')
        + cols.map(function (k) {
          var v = res.props[k].values[i];
          if (v !== null) return '<td class="pv-num">' + fmtProp(k, v) + '</td>';
          var r = res.props[k].reasons[i]; if (noteIdx[r] === undefined) { noteIdx[r] = notes.length + 1; notes.push(r); }
          return '<td class="pv-num pv-na" title="' + esc(r) + '">—<sup>' + noteIdx[r] + '</sup></td>';
        }).join('') + '</tr>';
    }).join('');
    tw.innerHTML = '<table class="pv-tbl pv-res"><caption class="pv-sr">' + esc(S.fluid === 'oil' ? 'Oil' : 'Gas') + ' properties versus pressure</caption><thead>' + head + '</thead><tbody>' + body + '</tbody></table>'
      + (notes.length ? '<ol class="pv-notes" aria-label="Why values are missing">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ol>' : '');
    wl.innerHTML = messagesBlock();
    var selRow = tw.querySelector('tr.is-sel'); if (selRow && selRow.scrollIntoView) selRow.scrollIntoView({ block: 'nearest' });
  }
  function syncTableSel() {
    qa('.pv-res tr[data-row]').forEach(function (tr) { var on = +tr.getAttribute('data-row') === S.sel[S.fluid]; tr.classList.toggle('is-sel', on); tr.setAttribute('aria-selected', on); });
  }
  /* warnings and notes, grouped by kind: outside range · accuracy · assumptions/info */
  function messagesBlock() {
    if (!res || !res.ok) return '';
    var rng = res.warnings.filter(function (w) { return w.kind !== 'accuracy'; }), acc = res.warnings.filter(function (w) { return w.kind === 'accuracy'; });
    var assumed = res.scalars.filter(function (s) { return s.kind === 'assumed'; }).map(function (s) { return s.label + ': ' + s.method; });
    var info = assumed.concat(res.info), out = '';
    if (rng.length) out += '<div class="pv-msg is-warn"><div class="pv-msg-h">' + ICON.warn + 'Outside a correlation data range — values kept</div><ul>' + rng.map(function (w) { return '<li>' + esc(w.msg) + ' <span>Affects: ' + esc(w.affects.join(', ')) + '</span></li>'; }).join('') + '</ul></div>';
    if (acc.length) out += '<div class="pv-msg is-warn"><div class="pv-msg-h">' + ICON.warn + 'Accuracy notes from the verification</div><ul>' + acc.map(function (w) { return '<li>' + esc(w.msg) + '</li>'; }).join('') + '</ul></div>';
    if (info.length) out += '<div class="pv-msg is-info"><div class="pv-msg-h">' + ICON.info + 'Assumptions and notes</div><ul>' + info.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    return out;
  }

  /* ---------------------------------------------------------- measured view */
  function templateText() {
    var cols = MD.headerText(S.fluid, S.units, S.gauge);
    return '# PVT Nexus measured-data template (' + S.fluid + '). Units: ' + cols.join(', ') + '.\n'
      + '# Lines starting with # are ignored. Leave a cell empty or write - for a missing value.\n'
      + (S.fluid === 'oil' ? '# Rs and Bo refer to standard volumes: declare their basis (60 °F or 15 °C, 101.325 kPa) in the calculator.\n'
        : '# Bg refers to standard volumes: declare its basis (60 °F or 15 °C, 101.325 kPa) in the calculator.\n')
      + cols.join(',') + '\n';
  }
  function measuredView() {
    var cols = MD.headerText(S.fluid, S.units, S.gauge), md = S.measured[S.fluid];
    var stdCols = S.fluid === 'oil' ? 'Rs and Bo' : 'Bg';
    return '<div class="pv-view pv-measured">'
      + '<div class="pv-icols"><div class="pv-icol">' + card('Measured PVT data',
        '<div class="pv-template"><span class="pv-mono">Columns</span><code>' + esc(cols.join('  ·  ')) + '</code>'
        + '<span class="pv-template-b"><button type="button" class="ui-btn ui-btn-sub" id="pv-tpl-copy">Copy template</button><button type="button" class="ui-btn ui-btn-sub" id="pv-tpl-dl">Download template</button></span></div>'
        + '<p class="pv-note">First line = header; only <b>p</b> is required. Units follow the current settings (' + esc(U.unit('p', S.units, S.gauge)) + ', ' + (S.units === 'metric' ? 'Metric' : 'Field') + '). Empty or “-” = missing. Repeated pressures are kept as separate observations.</p>'
        + '<label class="pv-l" for="pv-meas-text">Paste data</label><textarea id="pv-meas-text" rows="7" spellcheck="false" class="pv-meas-text" aria-describedby="pv-meas-errs">' + esc(md.text) + '</textarea>'
        + optRow('Standard basis of measured ' + stdCols, pills('measBasis', md.basis, [['corr', '60 °F, 101.325 kPa'], ['lab', '15 °C, 101.325 kPa']], 'Standard basis of the measured values'))
        + '<div class="pv-actions"><label class="ui-btn ui-btn-ghost pv-file">Import CSV / TXT<input type="file" id="pv-meas-file" accept=".csv,.txt,.tsv,text/csv,text/plain"></label>'
        + '<button type="button" class="ui-btn ui-btn-sub" id="pv-meas-clear">Clear</button><button type="button" class="ui-btn ui-btn-primary pv-go" id="pv-meas-apply">Compare with calculation</button></div>'
        + '<div id="pv-meas-errs" aria-live="polite"></div>', { n: 1 }) + '</div>'
      + '<div class="pv-icol">' + card('Error comparison', '<div id="pv-meas-stats"><p class="pv-note">Paste measured data and press <b>Compare with calculation</b>.</p></div>'
        + '<details class="pv-adv"><summary>How errors are calculated</summary><dl class="pv-dl"><dt>Relative error</dt><dd>e = 100·(calculated − measured)/measured, at each measured pressure (the correlation is evaluated there; nothing is interpolated).</dd>'
        + '<dt>ARE / AARE</dt><dd>Mean of e / mean of |e| over rows with both values.</dd>'
        + '<dt>Excluded</dt><dd>Missing values, unavailable calculated values and measured values of 0 (relative error undefined) are counted and excluded — never replaced by zero.</dd>'
        + '<dt>Standard basis</dt><dd>Bg on the other basis is converted with the Tsc ratio (gas ideal at standard conditions). Rs and Bo on the 15 °C basis are not compared: converting stock-tank oil volumes needs data that is not available.</dd></dl></details>', { n: 2 }) + '</div></div>'
      + '<div id="pv-meas-table"></div>'
      + (S.fluid === 'oil' ? card('Multi-sample batch evaluation', '<p class="pv-note">A separate tool: each row is a different oil at its own bubble point, used to rank correlations across a data set (60 °F correlation basis).</p><div id="pv-batch-host"></div>', { cls: 'pv-batch' }) : '')
      + '</div>';
  }
  function renderMeasured() {
    var errs = q('#pv-meas-errs'), st = q('#pv-meas-stats'), tb = q('#pv-meas-table');
    if (!errs) return;
    if (!meas) { errs.innerHTML = ''; tb.innerHTML = ''; st.innerHTML = '<p class="pv-note">Paste measured data and press <b>Compare with calculation</b>.</p>'; return; }
    var pe = meas.parsed.errors;
    if (pe.length) {
      errs.innerHTML = '<div class="pv-msg is-err" role="alert"><div class="pv-msg-h">' + ICON.err + pe.length + ' problem' + (pe.length > 1 ? 's' : '') + ' in the data — nothing was compared</div><ul>' + pe.map(function (e) { return '<li>' + esc(e.msg) + '</li>'; }).join('') + '</ul></div>';
      st.innerHTML = ''; tb.innerHTML = ''; return;
    }
    var b = meas.basis, notes = [];
    if (b.error) notes.push('<div class="pv-msg is-err" role="alert"><div class="pv-msg-h">' + ICON.err + 'Basis not declared</div><ul><li>' + esc(b.error) + '</li></ul></div>');
    Object.keys(b.cols).forEach(function (k) {
      var c = b.cols[k];
      if (c.status === 'blocked' && !b.error) notes.push('<div class="pv-msg is-err"><div class="pv-msg-h">' + ICON.err + 'Not compared: ' + esc(E.PROPS[S.fluid][k].sym) + '</div><ul><li>' + esc(c.reason) + '</li></ul></div>');
      if (c.status === 'converted') notes.push('<div class="pv-msg is-info"><div class="pv-msg-h">' + ICON.info + 'Converted: ' + esc(E.PROPS[S.fluid][k].sym) + '</div><ul><li>' + esc(c.reason) + '</li></ul></div>');
    });
    errs.innerHTML = '<div class="pv-msg is-ok"><div class="pv-msg-h">' + ICON.ok + meas.parsed.rows.length + ' measured rows read (' + meas.parsed.columns.map(function (c) { return esc(c.title); }).join(', ') + ')</div></div>' + notes.join('');
    if (!meas.calc || !meas.calc.ok) { st.innerHTML = '<p class="pv-note">Calculated values are not available until the inputs are valid.</p>'; tb.innerHTML = ''; return; }
    var P = E.PROPS[S.fluid], keys = meas.parsed.columns.map(function (c) { return c.key; }).filter(function (k) { return k !== 'p' && b.cols[k] && b.cols[k].status !== 'blocked'; });
    if (!keys.length) { st.innerHTML = '<p class="pv-note">No column can be compared yet.</p>'; tb.innerHTML = ''; return; }
    var rowsS = [];
    keys.forEach(function (k) {
      var mv = meas.parsed.rows.map(function (r) { return measValue(r, k); });
      [{ label: methodLabelFor(k), sel: true, r: meas.calc }].concat(meas.cmp.map(function (c) { return { label: c.label, r: c.res }; })).forEach(function (x) {
        if (!x.r.ok) return;
        var s = MD.stats(mv, x.r.props[k].values);
        rowsS.push('<tr><td>' + P[k].sym + '</td><td class="pv-txt pv-wrap">' + esc(x.label) + (x.sel ? ' <i class="pv-tag">selected</i>' : '') + '</td><td class="pv-num">' + s.n + '</td><td class="pv-num">' + (s.are === null ? '—' : s.are.toFixed(2)) + '</td><td class="pv-num">' + (s.aare === null ? '—' : s.aare.toFixed(2)) + '</td><td class="pv-num">' + (s.maxAbs === null ? '—' : s.maxAbs.toFixed(2)) + '</td><td class="pv-txt">' + [s.missing ? s.missing + ' missing' : '', s.unavailable ? s.unavailable + ' unavailable' : '', s.zero ? s.zero + ' zero measured' : ''].filter(Boolean).join(', ') + '</td></tr>');
      });
    });
    st.innerHTML = '<div class="pv-tbl-wrap pv-stats"><table class="pv-tbl"><thead><tr><th>Prop.</th><th class="pv-txt">Correlation</th><th>n</th><th>ARE %</th><th>AARE %</th><th>max |e| %</th><th class="pv-txt">Excluded</th></tr></thead><tbody>' + rowsS.join('') + '</tbody></table></div>';
    var head = '<tr><th>Line</th><th>p<em>' + esc(U.unit('p', S.units, S.gauge)) + '</em></th>' + keys.map(function (k) { return '<th>' + P[k].sym + ' measured<em>' + esc(propUnit(k)) + (basisTag(k) ? ' · ' + esc(basisTag(k)) : '') + '</em></th><th>' + P[k].sym + ' calculated</th><th>e %</th>'; }).join('') + '</tr>';
    var body = meas.parsed.rows.map(function (r, i) {
      return '<tr><td class="pv-num">' + r.line + '</td><td class="pv-num">' + fmtQ('p', r.p) + '</td>' + keys.map(function (k) {
        var m = measValue(r, k), c = meas.calc.props[k].values[i], e = (m !== null && m !== 0 && c !== null) ? 100 * (c - m) / m : null;
        return '<td class="pv-num">' + (m === null ? '—' : fmtProp(k, m)) + '</td><td class="pv-num pv-calc">' + (c === null ? '<span title="' + esc(meas.calc.props[k].reasons[i]) + '">n/a</span>' : fmtProp(k, c)) + '</td><td class="pv-num">' + (e === null ? '—' : e.toFixed(2)) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    tb.innerHTML = card('Measured versus calculated (selected correlation)', '<div class="pv-tbl-wrap"><table class="pv-tbl"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>');
  }

  /* ----------------------------------------------------------- methods view */
  var RANGE_WORD = { corroborated: 'corroborated', unverified: 'unverified', discrepancy: 'sources disagree' };
  function rangeTxt(g) {
    var r = g.range;
    if (!r) return '<i>No published data range in the sources available.</i>';
    var names = { p: 'p', pb: 'pb', T: 'T', api: 'API', gg: 'γg', rs: 'Rs', ppr: 'Ppr', tpr: 'Tpr', yCO2: 'yCO2', yH2S: 'yH2S' };
    var n = function (v) { return String(+(+v).toPrecision(4)); };
    return Object.keys(r).map(function (k) {
      var a = r[k][0], b = r[k][1], u = '';
      if (k === 'p' || k === 'pb') { a = U.pFromPsia(a, S.units, false); b = U.pFromPsia(b, S.units, false); u = ' ' + (S.units === 'metric' ? 'bar(a)' : 'psia'); }
      else if (k === 'T') { a = U.tFromF(a, S.units); b = U.tFromF(b, S.units); u = ' ' + U.unit('T', S.units); }
      else if (k === 'rs') { a = U.toDisplay('Rs', a, S.units); b = U.toDisplay('Rs', b, S.units); u = ' ' + U.unit('Rs', S.units); }
      var st = (g.verify && g.verify.ranges && g.verify.ranges[k]) || 'unverified';
      return '<span class="pv-rng is-' + st + '">' + names[k] + ' ' + n(a) + '–' + n(b) + u + ' <i>' + RANGE_WORD[st] + '</i></span>';
    }).join(' ');
  }
  var EQ_WORD = { 'cross-checked': 'Equation cross-checked', discrepancy: 'Discrepancy found', unverified: 'Equation not cross-checked' };
  function methodBlock(title, group, curKey, extraNote) {
    return '<section class="pv-card pv-mcard"><div class="pv-card-h"><h3>' + title + '</h3></div>' + Object.keys(group).map(function (k) {
      var g = group[k], v = g.verify || {};
      return '<div class="pv-meth' + (k === curKey ? ' is-cur' : '') + '"><div class="pv-meth-h"><b>' + esc(g.label) + '</b>' + (k === curKey ? '<i class="pv-tag">selected</i>' : '')
        + (v.eq ? '<span class="pv-vstat is-' + v.eq + '">' + (v.eq === 'cross-checked' ? ICON.ok : v.eq === 'discrepancy' ? ICON.warn : ICON.err) + EQ_WORD[v.eq] + '</span>' : '') + '</div>'
        + '<pre class="pv-eq">' + esc(g.eq) + (g.eqPb ? '\n' + esc(g.eqPb) : '') + '</pre>'
        + (g.tUnit ? '<div class="pv-meth-r"><b>Temperature in the equation:</b> ' + esc(g.tUnit) + '</div>' : '')
        + (k !== 'none' && k !== 'manual' ? '<div class="pv-meth-r"><b>Data range:</b> ' + rangeTxt(g) + '</div>' : '')
        + (g.note ? '<div class="pv-meth-r">' + esc(g.note) + '</div>' : '')
        + (v.src && v.src !== '—' ? '<div class="pv-meth-r"><b>Cross-check:</b> ' + esc(v.src) + '</div>' : '')
        + (v.data ? '<div class="pv-meth-r"><b>Numerical check:</b> ' + esc(v.data) + '</div>' : '')
        + (v.limit && v.limit !== '—' ? '<div class="pv-meth-r"><b>Limitation:</b> ' + esc(v.limit) + '</div>' : '')
        + (g.ref ? '<div class="pv-meth-ref">' + g.ref.map(function (r) { return esc(C.REF[r]); }).join('<br>') + '</div>' : '') + '</div>';
    }).join('') + (extraNote ? '<p class="pv-note">' + extraNote + '</p>' : '') + '</section>';
  }
  function methodsView() {
    var m = F().m, out = '<div class="pv-view pv-methods"><div class="pv-mgrid">';
    out += card('How to read this page', '<dl class="pv-dl">'
      + '<dt>Verification</dt><dd>The original papers could not be accessed when this calculator was checked. <b>Cross-checked</b> means every coefficient matches an independent open-source transcription; <b>Discrepancy</b> means a transcription differs (stated); <b>Not cross-checked</b> means no independent transcription was available. Numerical checks use reference data: the digitized Standing-Katz chart and the GERG-2008 reference equation of state (CoolProp). Details: calc/README.md.</dd>'
      + '<dt>Data ranges</dt><dd><b>corroborated</b> — the same limits in an independent source; <b>unverified</b> — reported in textbook tabulations, not checked against the paper; <b>sources disagree</b> — the limit differs between sources. A mathematical domain limit (e.g. Z ≤ 0) is not a range: the value is shown as unavailable.</dd></dl>', { cls: 'pv-mcard' });
    out += card('Standard conditions', '<dl class="pv-dl">'
      + '<dt>Correlation basis</dt><dd>' + esc(U.STD_BASES.corr.label) + '. Every correlation result is on this basis.</dd>'
      + '<dt>Laboratory basis</dt><dd>' + esc(U.STD_BASES.lab.label) + '. Offered for gas Bg and Eg only: with gas ideal at standard conditions, V(15 °C)/V(60 °F) = 518.67/519.67 = 0.998076, so Bg(15 °C) = Bg(60 °F) × 519.67/518.67.</dd>'
      + '<dt>Oil Rs, Rsb, Bo</dt><dd>Always on the correlation basis. Converting stock-tank oil volumes to 15 °C needs the oil’s thermal expansion and its flash behaviour at 15 °C, which these inputs do not define — no conversion is applied and none is claimed.</dd>'
      + '<dt>Units vs basis</dt><dd>Field / Metric changes units only (e.g. scf/STB → sm³/sm³ on the same 60 °F basis); it never changes the standard basis.</dd></dl>', { cls: 'pv-mcard' });
    out += card('Units and assumptions', '<dl class="pv-dl">'
      + '<dt>Evaluation</dt><dd>Correlations run in the field units they were published in (psia, °F or °R as stated, scf/STB, rb/STB, cP). Metric display: 1 bar = 14.5038 psi, 1 scf/STB = 0.17811 sm³/sm³, 1 lbm/ft³ = 16.0185 kg/m³, cP = mPa·s.</dd>'
      + '<dt>Gauge pressure</dt><dd>p(abs) = p(gauge) + 14.696 psi (1.01325 bar).</dd>'
      + (S.fluid === 'oil' ? '<dt>Oil workflow</dt><dd>One measured input — pb or Rsb — and the other from the selected Rs/pb correlation. p < pb: saturated, Rs(p) scaled so Rs(pb) = Rsb (factor reported). p ≥ pb: Rs = Rsb, Bo = Bob·exp(−∫co dp), μo from Vasquez-Beggs with μob at pb. co below pb is not calculated.</dd>'
        + '<dt>Assumptions</dt><dd>γg is used for every correlation except Vasquez-Beggs, which needs γgs at 100 psig (γgs = γg assumed without separator conditions, and shown as an assumption). Water density for γo: 62.4 lbm/ft³.</dd>'
        : '<dt>Gas workflow</dt><dd>γg or composition → pseudo-criticals → sour correction → Ppr, Tpr → Z → Bg, ρg = p·Ma/(Z·R·T), v, Eg, μg, and cg = 1/p − (1/Z)(dZ/dp) by central difference with the same corrected pseudo-criticals (checked against the analytic DAK derivative). Ideal gas sets Z = 1 throughout.</dd>')
      + '</dl>', { cls: 'pv-mcard' });
    if (S.fluid === 'oil') {
      out += methodBlock('Rs and pb (saturated oil)', M.rsFamily, m.rs);
      out += methodBlock('Bo at p ≤ pb', M.bo, m.bo);
      out += methodBlock('Undersaturated co and Bo (p > pb)', M.co, m.co, 'Bo above pb is the exact integral of the same co (tested), so the two agree and are continuous at pb.');
      out += methodBlock('Dead-oil viscosity', M.muDead, m.muDead);
      out += methodBlock('Saturated and undersaturated viscosity', { sat: M.muSat.beggs_robinson, und: M.muUnder.vasquez_beggs }, '');
    } else {
      out += methodBlock('Pseudo-critical properties', M.pc, m.pc);
      out += methodBlock('Sour-gas corrections', M.sour, m.sour);
      out += methodBlock('Z factor', M.z, F().behavior === 'ideal' ? '' : m.z);
      out += methodBlock('Gas viscosity', M.muGas, m.mu);
    }
    out += '</div>' + card('References', '<ol class="pv-refs">' + Object.keys(C.REF).map(function (k) { return '<li>' + esc(C.REF[k]) + '</li>'; }).join('') + '</ol>', { cls: 'pv-mcard' }) + '</div>';
    return out;
  }

  /* ---------------------------------------------------------- explain drawer
     Same structure as the procedure-page drawer: title · tag, then labelled sections (.sgSec/.sgLbl/.sgTxt). */
  var HELP = {
    api: ['Oil gravity', 'API gravity describes how heavy the stock-tank oil is: API = 141.5/γo − 131.5, with γo the specific gravity at 60 °F (water = 1). Enter API directly, or the stock-tank density at 60 °F and the calculator converts it.'],
    gg: ['Gas specific gravity, γg', 'Molar mass of the gas divided by that of air (28.96 lb/lbmol). For oil, use the gravity of the gas liberated from the oil. Vasquez-Beggs expects the separator gas gravity at 100 psig (γgs); enter separator conditions to correct for it.'],
    pb: ['Bubble point', 'The pressure at which the first gas bubble appears when the oil is depressurised. Below pb the oil is saturated and releases gas; above pb it holds all its gas (Rs = Rsb) and is only compressed. Give the measured pb or the measured Rsb — the other is derived from the selected Rs/pb correlation once, never from the current pressure.'],
    rsFamily: ['Rs and pb correlation', 'Gives the solution gas-oil ratio Rs(p) of saturated oil and the matching bubble-point relation. Each was fitted to oils from one region (Standing: California, Vasquez-Beggs: worldwide, Glasø: North Sea, Al-Marhoun: Middle East, Petrosky-Farshad: Gulf of Mexico).'],
    co: ['Oil compressibility above pb', 'co = −(1/Bo)(∂Bo/∂p) for undersaturated oil. Bo above pb is the integral of the same co, so the two always agree.'],
    basis: ['Standard conditions', 'Rs, Rsb, Bo and Bg relate a reservoir volume to a volume at standard conditions. The correlations were developed on 60 °F and 101.325 kPa (14.696 psia). Our laboratory reports use 15 °C and 101.325 kPa. For gas Bg and Eg the conversion is exact if the gas is ideal at standard conditions (Tsc ratio 519.67/518.67). For oil it would need the stock-tank oil’s thermal expansion and flash behaviour, so oil results stay on 60 °F. Switching Field / Metric changes units only, not the basis.'],
    pc: ['Pseudo-critical properties', 'Ppc and Tpc scale the pressure and temperature for the Z chart (Ppr = p/Ppc, Tpr = T/Tpc). From γg (Standing, Sutton) or from the composition (Kay). They are not Z correlations.'],
    sour: ['Sour-gas correction', 'CO₂ and H₂S distort the pseudo-criticals. Wichert-Aziz corrects them (checked here against GERG-2008: 4 % error reduced to < 1.5 % for a 23 % acid gas). Carr-Kobayashi-Burrows corrects gas-gravity pseudo-criticals and is not allowed with Kay mixing, which already includes the non-hydrocarbons.'],
    z: ['Z factor', 'Z = pV/(nRT): the departure from ideal gas. Dranchuk-Abou-Kassem is an iterative fit of the Standing-Katz chart (within 1.2 % of the chart for Tpr ≥ 1.2; less accurate near the critical point). Papay and Beggs-Brill are explicit approximations that lose accuracy at high Ppr. A manual chart reading gives one value at one pressure only.']
  };
  var PROP_HELP = {
    rs: 'Gas dissolved per stock-tank barrel. Rises with pressure while the oil is saturated and stays at Rsb above pb — the kink is the bubble point.',
    bo: 'Reservoir volume per stock-tank volume. Grows with pressure below pb (dissolved gas swells the oil), falls slowly above pb (the oil is only compressed). Maximum at pb.',
    mu: 'Falls as pressure rises toward pb (more dissolved gas), rises above pb (liquid compressed at fixed composition). Minimum at pb.',
    co: 'Isothermal compressibility of undersaturated oil, shown only above pb.',
    z: 'Departure from ideal gas: Z → 1 at low pressure, dips below 1, rises above 1 at high pressure.',
    bg: 'Reservoir volume of one standard volume of gas; falls roughly as 1/p.',
    rho: 'ρg = p·Ma/(Z·R·T); rises with pressure.',
    mu_gas: 'Rises with pressure because the gas becomes denser.',
    cg: 'Isothermal gas compressibility: 1/p for an ideal gas, 1/p − (1/Z)(dZ/dp) for a real gas.'
  };
  function sec(lbl, txt) { return '<div class="sgSec pv-ex-sec"><div class="sgLbl">' + lbl + '</div><div class="sgTxt">' + txt + '</div></div>'; }
  function pointDetailHtml(i) {
    var k = S.chartProp[S.fluid], d = E.detail(res, i, k), P = E.PROPS[S.fluid];
    return sec('Selected point', '<b>p = ' + fmtQ('p', res.pressures[i]) + ' ' + esc(U.unit('p', S.units, S.gauge)) + '</b>' + (res.phase ? ' · ' + res.phase[i] : ''))
      + '<div class="pv-ex-vals">' + Object.keys(P).filter(function (x) { return !P[x].table || x === 'ppr'; }).map(function (x) {
        var v = res.props[x].values[i];
        return '<div class="sgVal"><b>' + P[x].sym + '</b><span>' + (v === null ? 'n/a' : fmtProp(x, v)) + '<i>' + esc(propUnitB(x)) + '</i></span></div>';
      }).join('') + '</div>'
      + sec(esc(P[k].sym) + ' — method', esc(d.method))
      + '<pre class="pv-eq">' + esc(d.eq) + '</pre>'
      + sec('Substituted values (field units)', '<ol class="pv-subs">' + d.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol>')
      + (d.unavailable ? sec('Why no value', esc(d.unavailable)) : '');
  }
  function renderExplain() {
    var body = q('#pv-ex-body'), tag = q('#pv-ex-tag'), ti = q('#pv-ex-title');
    if (!body) return;
    var v = S.view, html = '';
    tag.textContent = (S.fluid === 'oil' ? 'OIL' : 'GAS') + ' · ' + (VIEWS.filter(function (x) { return x[0] === v; })[0] || ['', ''])[1].toUpperCase();
    if (S.help === 'point' && res && res.ok && S.sel[S.fluid] >= 0) {
      ti.textContent = 'Equation at the selected point';
      html = pointDetailHtml(S.sel[S.fluid]);
    } else if (S.help && HELP[S.help]) {
      ti.textContent = HELP[S.help][0];
      html = sec('What it means', esc(HELP[S.help][1]));
    } else if (S.help === 'chart') {
      var prop = S.chartProp[S.fluid], pp = E.PROPS[S.fluid][prop];
      ti.textContent = 'Reading your chart';
      html = sec(esc(pp.label), esc(PROP_HELP[S.fluid === 'gas' && prop === 'mu' ? 'mu_gas' : prop] || ''))
        + sec('How to use it', 'Pressure is on the horizontal axis. Select a point for its values, then choose Show equation for the calculation. A solid line is the active method; dashed lines are optional comparisons. Missing values are gaps, never zero.')
        + sec('Methods', 'Default methods are already selected. Open Advanced only if you need to change them. Their verification status is in More tools → Methods & References.');
    } else if (v === 'inputs' && S.fluid === 'oil') {
      ti.textContent = W().page === 'detail' ? 'Reading a property page' : 'Using the oil calculator';
      html = sec('Start here', 'Enter the pressure, temperature, oil gravity, gas gravity and either the bubble-point pressure or Rsb once, then choose Calculate oil properties. Rs, Bo, μo and co appear together. Each value has its own unit selector; switching units never changes the physical value.')
        + sec('Explain this property', 'Opens a full page with the equation, the input values substituted into it, intermediate values, a pressure graph with the operating point and the bubble point, a results table and a method comparison. Back to oil results returns with everything kept.')
        + sec('Changing inputs', 'Results are marked as outdated as soon as a physical input or method changes, and cannot be explained until you calculate again. Changing a unit or the result units does not change the physical inputs.')
        + sec('Oil and gas', esc(HELP.api[1]) + ' ' + esc(HELP.pb[1]))
        + sec('Standard conditions', esc(HELP.basis[1]));
    } else if (v === 'inputs') {
      ti.textContent = W().page === 'detail' ? 'Reading a property page' : 'Using the gas calculator';
      html = sec('Start here', 'Enter pressure, temperature and gas gravity once, then choose Calculate gas properties. Z, Bg, ρg, μg and cg appear together. Each dimensional value has its own unit selector.')
        + sec('Advanced', 'Composition instead of gas gravity, sour-gas corrections, pseudo-critical and Z methods, the ideal-gas model and the standard basis of Bg.')
        + sec('Explain this property', 'Opens a full page with the equation, substituted values, a pressure graph with the operating point, a results table and a method comparison.')
        + sec('Standard conditions', esc(HELP.basis[1]));
    } else if (false) {
      ti.textContent = 'Using the calculator';
      html = sec('Start here', 'Choose a property, enter your conditions and fluid description, then choose Calculate. The answer appears on the same page. Start with one pressure; choose Show how it changes with pressure to make a curve.')
        + sec('2 · ' + (S.fluid === 'oil' ? 'Oil and gas' : 'Gas'), S.fluid === 'oil' ? esc(HELP.api[1]) + ' ' + esc(HELP.pb[1]) : 'Gas gravity, or a composition (mole fractions or percent; the total must be 1 or 100 unless you tick normalisation, which is reported).')
        + sec('3 · Correlations', 'Methods are selected for you. Open Advanced only to change a method, add composition or sour-gas data, or change the pressure convention. Measured data and references remain in More tools after calculation.')
        + sec('Standard conditions', esc(HELP.basis[1]))
        + sec('Status', 'The status next to the tabs tells you whether results are valid: <b>Input needed</b> (a required field is empty), <b>Invalid input</b>, <b>Calculation failed</b> (the method cannot give a result for these inputs), or <b>Valid</b> — with any range warnings, accuracy notes and assumptions counted.');
    } else if (v === 'charts') {
      var k = S.chartProp[S.fluid], P = E.PROPS[S.fluid][k];
      ti.textContent = 'Reading the ' + P.sym + ' chart';
      html = sec(esc(P.label), esc(PROP_HELP[S.fluid === 'gas' && k === 'mu' ? 'mu_gas' : k] || ''))
        + sec('On the chart', 'Thick line: the selected correlation. Dashed lines: correlations added with Compare. Open squares: measured data. Shaded bands: pressures with no valid value — the line is broken there, never joined or set to zero.' + (S.fluid === 'oil' ? ' The dashed vertical line is pb.' : ''))
        + (res && res.ok && S.sel[S.fluid] >= 0 ? pointDetailHtml(S.sel[S.fluid]) : sec('Selected point', 'Click a point to see its equation with substituted values here.'));
    } else if (v === 'table') {
      ti.textContent = 'Results table';
      html = sec('Characterisation', 'Values used by every point (API, pb, Rsb, Bob, pseudo-criticals …), each marked Input, Correlation, Derived or Assumption with its method.')
        + sec('Table', 'One row per pressure. The bubble-point row is bold. “—” with a number = no valid value; the note under the table gives the reason. Click a row to select the same point on the chart.')
        + sec('CSV export', 'Carries the inputs, methods, standard basis, assumptions, warnings and units in # lines above the data.');
    } else if (v === 'measured') {
      ti.textContent = 'Comparing with measured data';
      html = sec('Template', 'Copy or download the template. First line: column names; units follow the current settings. Errors name the line and column.')
        + sec('Standard basis', 'Declare whether measured Rs, Bo or Bg are on 60 °F or 15 °C. Bg is converted if needed; oil Rs and Bo on 15 °C are not compared, because converting them needs data the calculator does not have.')
        + sec('Errors', 'e = 100·(calc − meas)/meas at each measured pressure; AARE = mean |e|. Missing, unavailable and zero measured values are excluded and counted.');
    } else {
      ti.textContent = 'Methods, verification and limits';
      html = sec('Selected methods', res && res.methods ? res.methods.map(function (m) { return esc(m[0]) + ': ' + esc(m[1]); }).join('<br>') : 'Enter valid inputs to see the active methods.')
        + sec('Verification', 'Each method shows how its equation was checked and its numerical evidence. Nothing is presented as verified against the original paper: those could not be accessed.')
        + sec('Data ranges', 'Outside a range the value is kept and a warning names the affected properties; the range itself is marked corroborated, unverified or disputed.');
    }
    body.innerHTML = html;
  }
  var exOpener = null;
  function setExplain(on, help) {
    var was = S.explain;
    S.explain = !!on;
    S.help = on ? (help || null) : null;
    var ex = q('#pv-explain'), b = q('#pv-explain-btn');
    if (ex) ex.classList.toggle('is-open', S.explain);
    if (root) root.classList.toggle('ex-open', S.explain);
    if (b) { b.setAttribute('aria-expanded', S.explain); b.classList.toggle('is-on', S.explain); }
    if (S.explain) { renderExplain(); var bd = q('#pv-ex-body'); if (bd && bd.parentNode) bd.parentNode.scrollTop = 0; if (!was) { exOpener = document.activeElement; var c = q('#pv-ex-close'); if (c) c.focus({ preventScroll: true }); } }
    else if (was && exOpener && exOpener.isConnected) { try { exOpener.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ================================================================ SHARED WORKFLOW (oil and gas)
     Enter inputs once -> calculate every main property together -> explain any one on a full page.
       Oil: Rs, Bo, μo, co.      Gas: Z, Bg, ρg, μg, cg.
     One calculation path: the cards and every detail page read the same frozen engine input
     (S.wf[fluid].calc.inp) and call the same PVTEngine.run; the detail graph only adds pressures to it.

     Per-field units (PVTUnits.INPUT_UNITS, from the input-unit work in PR #13): every dimensional input
     has its own unit. Its value reaches the engine as a canonical number (psia, °F, lbm/ft³, scf/STB) in
     inp.canon, so the engine never re-reads a display string in the wrong unit, and a unit switch only
     re-renders the text (f.canon keeps full precision until the user types). Result units (Field /
     Metric) are display only. */
  var WF_DIM = { oil: { p: 'p', pb: 'p', psep: 'p', T: 'T', tsep: 'T', rhoSto: 'density', rsb: 'Rs' }, gas: { p: 'p', T: 'T' } };
  var WF_KEYS = { oil: ['rs', 'bo', 'mu', 'co'], gas: ['z', 'bg', 'rho', 'mu', 'cg'] };
  var WF_TABLE = { oil: ['rs', 'bo', 'mu', 'co'], gas: ['ppr', 'z', 'bg', 'rho', 'mu', 'cg'] };
  var DP_OF = { 'psia': 'psi', 'psig': 'psi', 'kPa(a)': 'kPa', 'kPa(g)': 'kPa', 'MPa(a)': 'MPa', 'MPa(g)': 'MPa', 'bar(a)': 'bar', 'bar(g)': 'bar' };
  var P_DIGITS = { psi: 1, kPa: 0, MPa: 3, bar: 2 };
  var ZM = { dak: M.z.dak, papay: M.z.papay, beggs_brill: M.z.beggs_brill };
  var INFO = {
    oil: {
      rs: { name: 'Solution gas–oil ratio', sym: 'Rs', group: 'rs', meta: M.rsFamily,
        short: 'Gas dissolved in the oil at this pressure, per stock-tank barrel of oil.',
        what: 'Rs is the volume of gas, measured at standard conditions, dissolved in one stock-tank barrel of oil at the given pressure and temperature. Below the bubble point gas comes out of solution as the pressure falls, so Rs decreases. At and above the bubble point all of the gas is in solution and Rs stays equal to Rsb.',
        why: 'Rs sets how much gas the oil releases when it is produced, the producing gas–oil ratio below the bubble point and the oil shrinkage. In this calculator it also feeds Bo and the live-oil viscosity.' },
      bo: { name: 'Oil formation volume factor', sym: 'Bo', group: 'bo', meta: M.bo,
        short: 'Reservoir volume of one stock-tank barrel of oil together with its dissolved gas.',
        what: 'Bo is the oil volume at reservoir pressure and temperature, with its dissolved gas, divided by the volume of the same oil at stock-tank conditions. It is above 1 because the reservoir oil is hotter and holds dissolved gas. Below pb, Bo rises with pressure as more gas dissolves; above pb the oil is only compressed, so Bo falls slowly. Bo is largest at pb.',
        why: 'Bo converts between reservoir and surface oil volumes. Oil in place, material balance, well rates and reserves all use it.' },
      mu: { name: 'Oil viscosity', sym: 'μo', group: 'muDead', meta: M.muDead,
        short: 'Resistance of the live oil to flow at this pressure and temperature.',
        what: 'μo is the dynamic viscosity of the live oil. Below pb, dissolved gas thins the oil, so viscosity falls as the pressure rises towards pb. Above pb the composition is fixed and compression makes the oil slightly more viscous. μo is lowest at pb.',
        why: 'Viscosity controls oil mobility: well productivity, mobility ratios, displacement efficiency and the pressure drop in tubing and pipelines.' },
      co: { name: 'Oil compressibility', sym: 'co', group: 'co', meta: M.co,
        short: 'Fractional change in oil volume per unit pressure change, for undersaturated oil.',
        what: 'co = −(1/V)(∂V/∂p) at constant temperature. Above pb the oil is a single liquid of fixed composition and co is small and positive. The correlations offered here apply to undersaturated oil only. Below pb the apparent compressibility also includes gas coming out of solution; it is not calculated. A correlation can return co ≤ 0 outside the data it was fitted to; such a value is not physical and is reported as unavailable.',
        why: 'co governs undersaturated reservoir behaviour: pressure decline above pb, material balance, well-test analysis, and Bo above pb (Bo = Bob·exp(−∫co dp)).' }
    },
    gas: {
      z: { name: 'Gas compressibility factor', sym: 'Z', group: 'z', meta: ZM,
        short: 'Real-gas volume divided by the ideal-gas volume at the same pressure and temperature.',
        what: 'Z = pV/(nRT). It tends to 1 at low pressure, falls below 1 at moderate pressure (attraction between molecules) and rises above 1 at high pressure (molecular volume). It is read from the Standing-Katz chart through pseudo-reduced pressure and temperature.',
        why: 'Z links pressure to gas volume: gas in place, Bg, density, compressibility and viscosity all use it.' },
      bg: { name: 'Gas formation volume factor', sym: 'Bg', group: 'z', meta: ZM,
        short: 'Reservoir volume of one standard volume of gas.',
        what: 'Bg = V(p, T)/V(standard) = (psc/Tsc)·Z·T/p. It falls roughly as 1/p. The standard volume is on the selected standard basis, with gas taken as ideal at standard conditions.',
        why: 'Bg converts between reservoir and surface gas volumes for gas in place, material balance and rates.' },
      rho: { name: 'Gas density', sym: 'ρg', group: 'z', meta: ZM,
        short: 'Mass of gas per unit volume at these conditions.',
        what: 'ρg = p·Ma/(Z·R·T), with Ma the apparent molar mass (28.96·γg or Σ yi·Mi). It rises with pressure.',
        why: 'Density sets gas gradients in wells and reservoirs, phase-segregation forces and the input to the viscosity correlation.' },
      mu: { name: 'Gas viscosity', sym: 'μg', group: 'z', meta: ZM,
        short: 'Resistance of the gas to flow at these conditions.',
        what: 'μg from Lee-Gonzalez-Eakin as a function of temperature, molar mass and gas density. It rises with pressure because the gas becomes denser.',
        why: 'Gas viscosity controls gas mobility, well deliverability and pseudo-pressure in well-test analysis.' },
      cg: { name: 'Gas compressibility', sym: 'cg', group: 'z', meta: ZM,
        short: 'Fractional change in gas volume per unit pressure change.',
        what: 'cg = −(1/V)(∂V/∂p) at constant temperature = 1/p − (1/Z)(dZ/dp). For an ideal gas it is 1/p. dZ/dp needs Z as a function of pressure, so a single chart reading cannot give cg.',
        why: 'cg dominates total compressibility in gas reservoirs and enters material balance and well-test analysis.' }
    }
  };
  var GROUP_TITLE = { rs: 'Rs / pb correlation', bo: 'Bo correlation (p ≤ pb; also sets Bob)', muDead: 'Dead-oil viscosity correlation', co: 'co correlation (p > pb)', z: 'Z-factor correlation' };
  function UNIT_DEFAULT(fl) { return fl === 'gas' ? { p: 'psia', T: '°F' } : { p: 'psia', pb: 'psia', psep: 'psia', T: '°F', tsep: '°F', rhoSto: 'lbm/ft³', rsb: 'scf/STB' }; }
  function newW() { return { page: 'overview', prop: null, calc: null, showErrors: false, range: null, rangeText: null, rangeErr: null, selP: {}, cmp: {}, open: {} }; }

  function FL() { return S.fluid; }
  function W() { return S.wf[FL()]; }
  function keys() { return WF_KEYS[FL()]; }
  function info(k) { return INFO[FL()][k]; }
  function dims() { return WF_DIM[FL()]; }
  function wUnit(k) { var f = F(); f.u = f.u || UNIT_DEFAULT(FL()); return f.u[k] || UNIT_DEFAULT(FL())[k]; }
  /* canonical value of a field: the kept full-precision value, else the typed text in the field's unit */
  function wCanon(k) {
    var f = F();
    if (f.canon && isNum(f.canon[k])) return f.canon[k];
    var r = E.parse(f[k]);
    return r.state === 'ok' ? U.inputToCanon(dims()[k], r.v, wUnit(k)) : undefined;
  }
  function wText(k, c) { return String(+U.inputFromCanon(dims()[k], c, wUnit(k)).toPrecision(7)); }
  function setWUnit(k, u) {
    var f = F(), c = wCanon(k);
    f.u[k] = u; f.canon = f.canon || {};
    if (c !== undefined) { f.canon[k] = c; f[k] = wText(k, c); }
  }
  function wfEngineInput(extra) {
    var f = F(), canon = {}, fl = FL();
    var inp = fl === 'oil'
      ? { fluid: 'oil', units: S.units, gauge: false, stdBasis: 'corr', calcMode: 'single', oilGravityBasis: f.oilGravityBasis, rhoBasis: f.rhoBasis || '60F', alpha: f.alpha,
          oilChar: f.oilChar, sepUse: !!f.sepUse, api: f.api, gg: f.gg, m: Object.assign({}, f.m) }
      : { fluid: 'gas', units: S.units, gauge: false, stdBasis: S.stdBasis, calcMode: 'single', gasBasis: f.gasBasis, gg: f.gg, comp: f.comp.map(function (r) { return Object.assign({}, r); }),
          compBasis: f.compBasis, normalize: !!f.normalize, behavior: f.behavior, sourBasis: f.sourBasis, yCO2: f.yCO2, yH2S: f.yH2S, yN2: f.yN2, zManual: f.zManual, m: Object.assign({}, f.m) };
    Object.keys(dims()).forEach(function (k) {
      var c = wCanon(k);
      if (c !== undefined) { canon[k] = c; inp[k] = 'canonical'; }
      else inp[k] = f[k] === undefined || f[k] === null ? '' : f[k];   // empty -> "Input required"; bad text -> "Enter a number"
    });
    inp.canon = canon;
    return Object.assign(inp, extra || {});
  }
  /* identity of the physical inputs and methods (result units and field units excluded) */
  function wfKey(inp) {
    var o = { m: inp.m }, used;
    var val = function (k) { return isNum(inp.canon[k]) ? inp.canon[k] : String(inp[k]); };
    if (inp.fluid === 'oil') {
      used = { p: 1, T: 1, gg: 1, api: inp.oilGravityBasis !== 'density', rhoSto: inp.oilGravityBasis === 'density', alpha: inp.oilGravityBasis === 'density' && inp.rhoBasis === '15C',
        pb: inp.oilChar === 'pb', rsb: inp.oilChar === 'rsb', psep: inp.sepUse, tsep: inp.sepUse };
      Object.assign(o, { b: inp.oilGravityBasis, rb: inp.rhoBasis, c: inp.oilChar, s: !!inp.sepUse });
    } else {
      var comp = inp.gasBasis === 'composition', sour = inp.m.sour !== 'none' && !comp;
      used = { p: 1, T: 1, gg: !comp, yCO2: sour, yH2S: sour, yN2: sour && inp.m.sour === 'carr_kobayashi_burrows', zManual: inp.behavior !== 'ideal' && inp.m.z === 'manual' };
      Object.assign(o, { gb: inp.gasBasis, bh: inp.behavior, sb: inp.stdBasis, yb: sour ? inp.sourBasis : '', comp: comp ? inp.comp.filter(function (r) { return r.name || r.formula || String(r.y).trim(); }) : null, cb: comp ? inp.compBasis : '', n: comp ? inp.normalize : '' });
    }
    Object.keys(used).forEach(function (k) { if (used[k]) o[k] = val(k); });
    return JSON.stringify(o);
  }
  function wfStale() { var c = W().calc; return !!c && wfKey(wfEngineInput()) !== c.key; }

  /* ---- display helpers (pressures in the operating-pressure unit; properties in the result units) */
  function pD(psia) { return U.inputFromCanon('p', psia, wUnit('p')); }
  function dpUnit() { return DP_OF[wUnit('p')] || 'psi'; }
  function fmtPw(psia) { if (!isNum(psia)) return '—'; return pD(psia).toFixed(P_DIGITS[dpUnit()]); }
  function pTxt(psia) { return fmtPw(psia) + ' ' + wUnit('p'); }
  function tTxt(f) { return fmt(U.inputFromCanon('T', f, wUnit('T')), 4) + ' ' + wUnit('T'); }
  function valTxt(k, v) { return fmtProp(k, v); }

  /* ---- inputs ---- */
  function wUnitSelect(k, name) {
    var list = U.INPUT_UNITS[dims()[k]], cur = wUnit(k);
    return '<select class="ow-unit" data-wu="' + k + '" aria-label="Unit for ' + esc(name) + '">' + list.map(function (u) {
      return '<option value="' + esc(u) + '"' + (u === cur ? ' selected' : '') + '>' + esc(u) + '</option>';
    }).join('') + '</select>';
  }
  function wField(k, name, o) {
    o = o || {};
    var f = F();
    var head = o.head || '<label class="pv-l" for="ow-in-' + k + '">' + (o.label || esc(name)) + '</label>' + (o.help ? helpBtn(o.help, name) : '');
    return '<div class="pv-f ow-f" data-f="' + k + '"><div class="ow-fh">' + head + '</div>'
      + '<span class="pv-in"><input id="ow-in-' + k + '" data-wk="' + k + '" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(f[k] === undefined ? '' : f[k]) + '"'
      + (o.head ? ' aria-label="' + esc(name) + '"' : '') + ' aria-describedby="ow-err-' + k + (o.hint ? ' ow-hint-' + k : '') + '">'
      + (dims()[k] ? wUnitSelect(k, name) : '<span class="pv-u">' + (o.unit || '') + '</span>') + '</span>'
      + '<span class="pv-err" id="ow-err-' + k + '" data-werr="' + k + '"></span>'
      + (o.hint ? '<span class="pv-hint" id="ow-hint-' + k + '">' + o.hint + '</span>' : '') + '</div>';
  }
  function wSwitch(key, cur, items, label) {
    return '<div class="ow-switch" role="group" aria-label="' + esc(label) + '">' + items.map(function (it) {
      var on = String(cur) === String(it[0]);
      return '<button type="button" data-wseg="' + key + '" data-v="' + it[0] + '" class="' + (on ? 'is-on' : '') + '" aria-pressed="' + on + '">' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function wSelect(mkey, group, label, help, filter) {
    var cur = F().m[mkey];
    return '<div class="pv-f is-wide"><label class="pv-l" for="ow-m-' + mkey + '">' + label + '</label>' + (help ? helpBtn(help, label) : '')
      + '<span class="pv-in"><select id="ow-m-' + mkey + '" data-wm="' + mkey + '">' + Object.keys(group).filter(function (k) { return !filter || filter(k); }).map(function (k) {
        return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(group[k].label) + '</option>'; }).join('') + '</select></span>'
      + '<span class="pv-err" data-werr="' + mkey + 'Method"></span></div>';
  }
  function wChk(key, on, text) { return '<label class="pv-check"><input type="checkbox" data-wchk="' + key + '"' + (on ? ' checked' : '') + '> ' + text + '</label>'; }
  function advShell(sum, body) {
    return '<details class="ow-adv" id="ow-adv"' + (W().open.adv ? ' open' : '') + '><summary>Advanced <span>' + sum + '</span></summary><div class="ow-adv-body">' + body
      + '<div class="ow-adv-foot"><button type="button" class="ui-btn ui-btn-ghost" id="ow-default-m">Restore default methods</button>'
      + '<span class="pv-note">Results are correlation estimates, not measured PVT data.</span></div></div></details>';
  }
  function oilFields() {
    var f = F();
    var grav = f.oilGravityBasis === 'density'
      ? wField('rhoSto', 'Stock-tank oil density', { head: '<span class="pv-l">Oil gravity</span>' + wSwitch('oilGravityBasis', 'density', [['api', 'API'], ['density', 'Density']], 'Oil gravity entered as'),
          hint: 'Measured at ' + (f.rhoBasis === '15C' ? '15 °C — set α under Advanced.' : '60 °F (change under Advanced).') })
      : wField('api', 'Oil gravity, API', { head: '<span class="pv-l">Oil gravity</span>' + wSwitch('oilGravityBasis', 'api', [['api', 'API'], ['density', 'Density']], 'Oil gravity entered as'), unit: '°API', hint: 'Stock-tank oil, 60 °F.' });
    var bub = f.oilChar === 'rsb'
      ? wField('rsb', 'Solution GOR at bubble point, Rsb', { head: '<span class="pv-l">Bubble point</span>' + wSwitch('oilChar', 'rsb', [['pb', 'pb'], ['rsb', 'Rsb']], 'Known at the bubble point'), hint: 'Measured Rsb; pb is derived. 60 °F basis.' })
      : wField('pb', 'Bubble-point pressure, pb', { head: '<span class="pv-l">Bubble point</span>' + wSwitch('oilChar', 'pb', [['pb', 'pb'], ['rsb', 'Rsb']], 'Known at the bubble point'), hint: 'Measured pb; Rsb is derived.' });
    return wField('p', 'Pressure, p', { label: 'Pressure, p', hint: 'Gauge units add 1 atm.' }) + wField('T', 'Temperature, T', { label: 'Temperature, T', hint: 'Reservoir temperature.' })
      + grav + wField('gg', 'Gas specific gravity, relative to air', { label: 'Gas specific gravity, γ<sub>g</sub>', unit: 'air = 1', help: 'gg', hint: 'Relative to air (air = 1).' }) + bub;
  }
  function oilAdvanced() {
    var f = F();
    return advShell('Correlations, density reference and separator conditions',
      '<div class="ow-adv-grid">' + wSelect('rs', M.rsFamily, 'Rs and pb correlation', 'rsFamily') + wSelect('bo', M.bo, 'Bo below pb')
      + wSelect('co', M.co, 'co and Bo above pb', 'co') + wSelect('muDead', M.muDead, 'Dead-oil viscosity')
      + '<div class="pv-f is-wide"><span class="pv-l">Live-oil viscosity</span><span class="pv-fixed">Beggs-Robinson below pb · Vasquez-Beggs above pb</span></div></div>'
      + (f.oilGravityBasis === 'density' ? '<div class="ow-adv-sub"><span class="pv-l">Oil density measured at</span>' + wSwitch('rhoBasis', f.rhoBasis || '60F', [['60F', '60 °F (API basis)'], ['15C', '15 °C']], 'Oil density reference temperature')
        + (f.rhoBasis === '15C' ? wField('alpha', 'Oil thermal expansion coefficient at 15 °C', { label: 'Oil thermal expansion, α', unit: '1/°C', hint: 'Converts the 15 °C density to 60 °F: ρ(60 °F) = ρ(15 °C)/(1 + α·0.5556 °C).' }) : '')
        + '<p class="pv-note">API is defined at 60 °F: γo = ρo(60 °F)/ρw(60 °F), ρw = 999.016 kg/m³. Water at 15 °C is 999.103 kg/m³, so a 15 °C density is not treated as a 60 °F one.</p></div>' : '')
      + wChk('sepUse', f.sepUse, 'Separator conditions known (corrects γg to the 100 psig separator basis used by Vasquez-Beggs)')
      + (f.sepUse ? '<div class="ow-adv-grid">' + wField('psep', 'Separator pressure') + wField('tsep', 'Separator temperature') + '</div>' : '')
      + '<p class="pv-note">Standard volumes: 60 °F, 14.696 psia (correlation basis).</p>');
  }
  function gasFields() {
    var f = F();
    return wField('p', 'Pressure, p', { label: 'Pressure, p', hint: 'Gauge units add 1 atm.' }) + wField('T', 'Temperature, T', { label: 'Temperature, T', hint: 'Reservoir temperature.' })
      + (f.gasBasis === 'composition'
        ? '<div class="pv-f ow-f" data-f="gg"><div class="ow-fh"><span class="pv-l">Gas specific gravity, γ<sub>g</sub></span></div><span class="pv-fixed" id="ow-gg-comp">From the composition (Advanced)</span><span class="pv-hint">Relative to air (air = 1).</span></div>'
        : wField('gg', 'Gas specific gravity, relative to air', { label: 'Gas specific gravity, γ<sub>g</sub>', unit: 'air = 1', help: 'gg', hint: 'Relative to air (air = 1).' }));
  }
  function gasCompTable() {
    var f = F();
    var rows = f.comp.map(function (r, i) {
      return '<tr><td class="pv-num">' + (i + 1) + '</td>'
        + '<td><input data-wgc="' + i + '" data-wgcf="name" value="' + esc(r.name) + '" aria-label="Component, row ' + (i + 1) + '"></td>'
        + '<td><input data-wgc="' + i + '" data-wgcf="formula" value="' + esc(r.formula) + '" aria-label="Formula, row ' + (i + 1) + '"></td>'
        + '<td><input data-wgc="' + i + '" data-wgcf="y" inputmode="decimal" value="' + esc(r.y) + '" aria-label="Mole ' + (f.compBasis === 'percent' ? 'percent' : 'fraction') + ', row ' + (i + 1) + '"></td></tr>';
    }).join('');
    return '<div class="ow-adv-sub"><span class="pv-l">Entries are</span>' + wSwitch('compBasis', f.compBasis, [['fraction', 'Mole fractions (Σ = 1)'], ['percent', 'Mole percent (Σ = 100)']], 'Composition basis')
      + wChk('normalize', f.normalize, 'Normalise to Σ = 1 if the total is off (reported)') + '</div>'
      + '<div class="pv-comp-wrap ow-comp"><table class="pv-tbl pv-comp"><thead><tr><th>#</th><th>Component</th><th>Formula</th><th>y<sub>i</sub></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<span class="pv-err pv-err-block" data-werr="comp"></span>'
      + '<details class="pv-paste"><summary>Paste a composition (component, formula, y per line)</summary><textarea id="ow-comp-paste" rows="4" spellcheck="false" aria-label="Pasted composition"></textarea>'
      + '<button type="button" class="ui-btn ui-btn-ghost" id="ow-comp-apply">Apply pasted composition</button></details>';
  }
  function gasAdvanced() {
    var f = F(), pctU = f.sourBasis === 'percent' ? 'mol %' : 'fraction', comp = f.gasBasis === 'composition';
    var sour = f.m.sour !== 'none' && !comp
      ? '<div class="ow-adv-sub"><span class="pv-l">Non-hydrocarbons as</span>' + wSwitch('sourBasis', f.sourBasis, [['fraction', 'Mole fraction'], ['percent', 'Mole %']], 'Non-hydrocarbon basis') + '</div>'
        + '<div class="ow-adv-grid">' + wField('yCO2', 'CO2 mole ' + pctU, { label: 'CO₂, y<sub>CO2</sub>', unit: pctU }) + wField('yH2S', 'H2S mole ' + pctU, { label: 'H₂S, y<sub>H2S</sub>', unit: pctU })
        + (f.m.sour === 'carr_kobayashi_burrows' ? wField('yN2', 'N2 mole ' + pctU, { label: 'N₂, y<sub>N2</sub>', unit: pctU }) : '') + '</div>'
      : (f.m.sour !== 'none' ? '<p class="pv-note">CO₂, H₂S and N₂ fractions are taken from the composition.</p>' : '');
    var manual = f.behavior !== 'ideal' && f.m.z === 'manual'
      ? '<div class="pv-manual"><div class="pv-manual-read" id="ow-zread">Ppr and Tpr appear here once pressure, temperature and gas are valid.</div>'
        + wField('zManual', 'Z read from the chart', { unit: '–', hint: 'One pressure only — no curve and no cg.' }) + '</div>' : '';
    return advShell('Composition, sour gas, pseudo-criticals, Z method and standard conditions',
      '<div class="ow-adv-sub"><span class="pv-l">Describe the gas by</span>' + wSwitch('gasBasis', f.gasBasis, [['gravity', 'Gas gravity'], ['composition', 'Composition']], 'Gas description') + '</div>'
      + (comp ? gasCompTable() : '')
      + '<div class="ow-adv-grid">' + wSelect('pc', M.pc, 'Pseudo-critical properties', 'pc', function (k) { return comp || k !== 'kay'; })
      + wSelect('sour', M.sour, 'Sour-gas correction', 'sour', function (k) { return !(k === 'carr_kobayashi_burrows' && f.m.pc === 'kay'); }) + '</div>' + sour
      + '<div class="ow-adv-sub"><span class="pv-l">Gas model</span>' + wSwitch('behavior', f.behavior, [['real', 'Real gas'], ['ideal', 'Ideal gas, Z = 1']], 'Gas model') + '</div>'
      + '<div class="ow-adv-grid">' + (f.behavior === 'real' ? wSelect('z', M.z, 'Z factor', 'z') : '') + wSelect('mu', M.muGas, 'Gas viscosity') + '</div>' + manual
      + '<div class="ow-adv-sub"><span class="pv-l">Standard volumes (Bg)</span>' + helpBtn('basis', 'standard conditions') + wSwitch('stdBasis', S.stdBasis, [['corr', '60 °F, 101.325 kPa'], ['lab', '15 °C, 101.325 kPa']], 'Standard-condition basis') + '</div>'
      + '<p class="pv-note">Bg on 15 °C uses the Tsc ratio with gas ideal at standard conditions (519.67/518.67).</p>');
  }
  function inputsHtml() {
    var oil = FL() === 'oil';
    return '<section class="pv-card ow-inputs" aria-labelledby="ow-in-title"><div class="ow-in-head"><h3 id="ow-in-title">' + (oil ? 'Oil' : 'Gas') + ' inputs</h3>'
      + '<span class="ow-ex' + (S.example[FL()] ? ' is-example' : '') + '" id="ow-ex-label">' + (S.example[FL()] ? 'Example data — replace with your values' : 'Enter your fluid data once') + '</span>'
      + '<span class="ow-in-links"><button type="button" class="pv-text-btn" id="ow-example">Try example</button><button type="button" class="pv-text-btn" id="ow-clear">Clear</button></span></div>'
      + '<div class="ow-fields" data-n="' + (oil ? 5 : 3) + '">' + (oil ? oilFields() : gasFields()) + '</div>'
      + '<div class="pv-errsum" id="ow-errsum" role="alert" hidden></div>'
      + '<div class="ow-in-foot">' + (oil ? oilAdvanced() : gasAdvanced()) + '<button type="button" class="ui-btn ui-btn-primary ow-calc" id="ow-calc">Calculate ' + (oil ? 'oil' : 'gas') + ' properties</button></div></section>';
  }

  /* ---- results overview ---- */
  var AFFECTS = {
    oil: { rs: ['Rs', 'pb'], bo: ['Bo', 'Bo above pb', 'Rs', 'pb'], mu: ['μo', 'μo above pb', 'μo below pb'], co: ['co'] },
    gas: { z: ['Z and dependent properties', 'all gas properties'], bg: ['Z and dependent properties', 'all gas properties'], rho: ['Z and dependent properties', 'all gas properties'],
      mu: ['μg', 'Z and dependent properties', 'all gas properties'], cg: ['Z and dependent properties', 'all gas properties'] }
  };
  function propWarnings(r, k) {
    var aff = AFFECTS[r.fluid][k] || [];
    return (r.warnings || []).filter(function (w) { return w.affects.some(function (a) { return aff.indexOf(a) !== -1; }); });
  }
  function propAssumptions(r, k, i) {
    var out = [];
    if (r.fluid === 'oil') {
      var m = r.ctx.m, sat = r.phase[i] === 'saturated';
      var vb = { rs: m.rs === 'vasquez_beggs', bo: sat ? m.bo === 'vasquez_beggs' : (m.bo === 'vasquez_beggs' || m.co === 'vasquez_beggs'), mu: false, co: !sat && m.co === 'vasquez_beggs' }[k];
      var ggs = r.scalars.filter(function (x) { return x.key === 'ggs'; })[0];
      if (vb && ggs && ggs.kind === 'assumed') out.push('Separator gas gravity γgs taken equal to γg (no separator conditions entered) — used by Vasquez-Beggs.');
    } else {
      if (r.ctx.ideal) out.push('Ideal gas selected: Z = 1 for every property.');
      if (k === 'bg') out.push('Gas at standard conditions taken as ideal; standard basis ' + r.std.short + '.');
      if (r.ctx.comp && r.ctx.comp.normalized) out.push('Composition normalised to Σ = 1 (entered total ' + fmt(r.ctx.comp.sum, 5) + ').');
    }
    return out;
  }
  function warnBox(ws, asm) {
    asm = asm || [];
    if (!ws.length && !asm.length) return '';
    var lbl = [ws.length ? ws.length + ' range warning' + (ws.length > 1 ? 's' : '') : '', asm.length ? asm.length + ' assumption' + (asm.length > 1 ? 's' : '') : ''].filter(Boolean).join(' · ');
    return '<details class="ow-warn' + (ws.length ? '' : ' is-info') + '"><summary>' + (ws.length ? ICON.warn : ICON.info) + '<span>' + lbl + '</span></summary><ul>'
      + ws.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + asm.map(function (w) { return '<li class="is-asm">' + esc(w) + '</li>'; }).join('') + '</ul></details>';
  }
  function phaseTxt(r, i) {
    if (!r.phase) return '';
    var ph = r.phase[i];
    if (ph === 'saturated') return 'Saturated (p < pb)';
    if (ph === 'bubble point') return 'At the bubble point';
    return 'Undersaturated (p > pb)';
  }
  function resultCard(k) {
    var nf = info(k), c = W().calc, stale = c && wfStale();
    var head = '<div class="ow-card-h"><span class="ow-sym">' + nf.sym + '</span><h4>' + esc(nf.name) + '</h4></div>';
    if (!c) {
      return '<article class="ow-card is-empty" data-wprop="' + k + '">' + head + '<div class="ow-val"><strong>—</strong></div><p class="ow-desc">' + esc(nf.short) + '</p>'
        + '<button type="button" class="ui-btn ui-btn-ghost ow-explain" disabled>Explain this property</button></article>';
    }
    var r = c.res, v = r.props[k].values[0], why = r.props[k].reasons[0];
    var ws = propWarnings(r, k).map(function (w) { return w.msg; }), asm = propAssumptions(r, k, 0);
    var val = isNum(v)
      ? '<div class="ow-val"><strong>' + esc(valTxt(k, v)) + '</strong><span>' + esc(propUnitB(k)) + '</span></div>'
      : '<div class="ow-val is-na"><strong>Not available</strong></div><p class="ow-na">' + ICON.err + '<span>' + esc(why) + '</span></p>';
    return '<article class="ow-card' + (isNum(v) ? '' : ' is-na') + (stale ? ' is-stale' : '') + '" data-wprop="' + k + '">' + head + val
      + '<p class="ow-desc">' + esc(nf.short) + '</p>' + warnBox(ws, asm)
      + '<button type="button" class="ui-btn ui-btn-ghost ow-explain" data-wexplain="' + k + '"' + (stale ? ' disabled title="Recalculate to explain the current inputs"' : '') + '>Explain this property ' + ICON.arrow + '</button></article>';
  }
  function condHtml(r) {
    if (r.fluid === 'oil') {
      var rsS = r.scalars.filter(function (x) { return x.key === 'rsb'; })[0];
      var derived = r.ctx.char === 'pb' ? 'R<sub>sb</sub> = ' + esc(fmtQ('Rs', rsS.v)) + ' ' + esc(unitOf('Rs')) + ' (' + esc(M.rsFamily[r.ctx.m.rs].label) + ')'
        : 'p<sub>b</sub> = ' + esc(pTxt(r.pb)) + ' (' + esc(M.rsFamily[r.ctx.m.rs].label) + ')';
      return '<div class="ow-cond"><span>p = <b>' + esc(pTxt(r.pressures[0])) + '</b></span><span>T = <b>' + esc(tTxt(r.ctx.tF)) + '</b></span>'
        + '<span class="pv-phase is-' + r.phase[0].replace(' ', '-') + '">' + esc(phaseTxt(r, 0)) + '</span>'
        + '<span>p<sub>b</sub> = ' + esc(pTxt(r.pb)) + '</span><span>Derived: ' + derived + '</span>'
        + (r.ctx.apiKind === 'derived' ? '<span>API = ' + esc(fmt(r.ctx.api, 4)) + ' (from density)</span>' : '') + '</div>';
    }
    return '<div class="ow-cond"><span>p = <b>' + esc(pTxt(r.pressures[0])) + '</b></span><span>T = <b>' + esc(tTxt(r.ctx.tF)) + '</b></span>'
      + '<span>γ<sub>g</sub> = ' + esc(fmt(r.ctx.gg, 4)) + (r.ctx.ggKind === 'derived' ? ' (from composition)' : '') + '</span>'
      + '<span>P<sub>pr</sub> = ' + esc(fmt(r.props.ppr.values[0], 4)) + ', T<sub>pr</sub> = ' + esc(fmt(r.ctx.tR / r.pc.tpc, 4)) + '</span>'
      + '<span>' + esc(r.ctx.ideal ? 'Ideal gas (Z = 1)' : M.z[r.ctx.m.z].label) + '</span></div>';
  }
  function unavailableKeys(r) { return keys().filter(function (k) { return r.props[k].values[0] === null; }); }
  function resultsHtml() {
    var c = W().calc, stale = c && wfStale(), oil = FL() === 'oil';
    var unav = c ? unavailableKeys(c.res) : [];
    var head = '<div class="ow-res-head"><div><h3 id="ow-res-title" tabindex="-1">' + (c ? (oil ? 'Oil' : 'Gas') + ' properties at your conditions' : 'Results') + '</h3>'
      + (c ? condHtml(c.res) : '<p class="ow-res-sub">' + (oil ? 'Rs, Bo, μo and co' : 'Z, Bg, ρg, μg and cg') + ' will appear here together after you calculate.</p>') + '</div>'
      + '<div class="ow-res-units"><span class="pv-mono" id="ow-ru-l">Result units</span><div class="pv-pills" role="group" aria-labelledby="ow-ru-l">'
      + [['field', 'Field'], ['metric', 'Metric']].map(function (it) { var on = S.units === it[0]; return '<button type="button" data-wunits="' + it[0] + '" class="' + (on ? 'is-on' : '') + '" aria-pressed="' + on + '">' + it[1] + '</button>'; }).join('') + '</div></div></div>';
    var banner = stale ? '<div class="ow-stale" role="status">' + ICON.warn + '<span><b>Inputs changed.</b> These results are for the previous inputs. Choose <b>Calculate ' + (oil ? 'oil' : 'gas') + ' properties</b> to update them.</span></div>'
      : (unav.length ? '<div class="ow-partial" role="status">' + ICON.err + '<span><b>' + (keys().length - unav.length) + ' of ' + keys().length + ' properties calculated.</b> Not available: '
        + unav.map(function (k) { return esc(info(k).sym); }).join(', ') + ' — the reason is on ' + (unav.length > 1 ? 'each card' : 'its card') + '.</span></div>' : '');
    return head + banner + '<div class="ow-cards" data-n="' + keys().length + '">' + keys().map(resultCard).join('') + '</div>'
      + (c ? '<p class="ow-foot-note">Correlation estimates — ' + esc(c.res.methods.map(function (m) { return m[1]; }).filter(function (x, i, a) { return a.indexOf(x) === i && x !== 'None' && x !== 'Real gas'; }).slice(0, 4).join(' · ')) + '. Change methods under Advanced.</p>' : '');
  }
  function wfView() {
    if (W().page === 'detail' && W().calc && !wfStale() && W().prop) return detailHtml();
    W().page = 'overview';
    return '<div class="pv-view ow" data-page="overview">' + inputsHtml() + '<section class="ow-results" id="ow-results" aria-labelledby="ow-res-title">' + resultsHtml() + '</section></div>';
  }

  /* ---- detail page: fluid-specific parts ---- */
  function scal(r, key) { var x = r.scalars.filter(function (s) { return s.key === key; })[0]; return x ? x.v : NaN; }
  function symbols(k, r, i) {
    var ctx = r.ctx, rows;
    if (r.fluid === 'oil') {
      var m = ctx.m, sat = r.phase[i] === 'saturated', vbAny = m.rs === 'vasquez_beggs' || m.bo === 'vasquez_beggs' || m.co === 'vasquez_beggs';
      rows = [['p', 'Pressure (absolute)', 'psia', fmt(r.pressures[i], 6)],
        ['T', 'Temperature; equations written with T + 460 use °R', '°F (°R)', fmt(ctx.tF, 5) + ' °F (' + fmt(ctx.tF + 460, 5) + ' °R)'],
        ['API', 'Stock-tank oil gravity' + (ctx.apiKind === 'derived' ? ' (from density)' : ''), '°API', fmt(ctx.api, 5)],
        ['γo', 'Oil specific gravity 60/60 °F, 141.5/(API + 131.5)', 'water = 1', fmt(ctx.gammaO, 5)], ['γg', 'Gas specific gravity', 'air = 1', fmt(ctx.gg, 5)]];
      if (vbAny) rows.push(['γgs', 'Separator gas gravity at 100 psig (Vasquez-Beggs)', 'air = 1', fmt(ctx.ggs, 5) + (ctx.ggsKind === 'assumed' ? ' (assumed = γg)' : '')]);
      rows.push(['pb', 'Bubble-point pressure', 'psia', fmt(r.pb, 6)], ['Rsb', 'Solution GOR at pb', 'scf/STB', fmt(r.rsb, 6)]);
      if (k === 'rs') rows.push(['Rs', 'Solution gas–oil ratio', 'scf/STB', fmt(r.props.rs.values[i], 6)]);
      if (k === 'bo') { if (sat) rows.push(['Rs', 'Solution GOR at p', 'scf/STB', fmt(r.props.rs.values[i], 6)]); else rows.push(['Bob', 'Oil FVF at pb', 'rb/STB', fmt(scal(r, 'bob'), 6)]); rows.push(['Bo', 'Oil formation volume factor', 'rb/STB', vOrRaw(r, 'bo', i, 6)]); }
      if (k === 'mu') { rows.push(['μod', 'Dead-oil viscosity at T', 'cP', fmt(scal(r, 'muod'), 5)]); if (sat) rows.push(['Rs', 'Solution GOR at p', 'scf/STB', fmt(r.props.rs.values[i], 6)]); else rows.push(['μob', 'Oil viscosity at pb', 'cP', fmt(scal(r, 'muob'), 5)]); rows.push(['μo', 'Live-oil viscosity', 'cP', fmt(r.props.mu.values[i], 5)]); }
      if (k === 'co') { if (!sat && m.co === 'vasquez_beggs') rows.push(['A', 'Vasquez-Beggs co coefficient, co = A/p', '–', fmt(C.oil.vbCoA(r.rsb, ctx.tF, ctx.api, ctx.ggs), 5)]); rows.push(['co', 'Isothermal oil compressibility', '1/psi', vOrRaw(r, 'co', i, 5)]); }
      return rows;
    }
    var pc = r.pc, z = r.props.z.values[i], std = r.std;
    rows = [['p', 'Pressure (absolute)', 'psia', fmt(r.pressures[i], 6)], ['T', 'Temperature (absolute in the equations)', '°R', fmt(ctx.tR, 6) + ' °R (' + fmt(ctx.tF, 5) + ' °F)'],
      ['γg', 'Gas specific gravity' + (ctx.ggKind === 'derived' ? ' (Ma/28.96)' : ''), 'air = 1', fmt(ctx.gg, 5)], ['Ma', 'Apparent molar mass', 'lb/lbmol', fmt(ctx.ma, 5)],
      ['Ppc', 'Pseudo-critical pressure' + (ctx.m.sour !== 'none' ? ' (sour-corrected)' : ''), 'psia', fmt(pc.ppc, 5)], ['Tpc', 'Pseudo-critical temperature' + (ctx.m.sour !== 'none' ? ' (sour-corrected)' : ''), '°R', fmt(pc.tpc, 5)],
      ['Ppr', 'Pseudo-reduced pressure, p/Ppc', '–', fmt(r.props.ppr.values[i], 5)], ['Tpr', 'Pseudo-reduced temperature, T/Tpc', '–', fmt(ctx.tR / pc.tpc, 5)],
      ['Z', 'Compressibility factor', '–', isNum(z) ? fmt(z, 5) : 'not available']];
    if (k === 'bg') rows.push(['psc', 'Standard pressure', 'psia', fmt(std.pPsia, 6)], ['Tsc', 'Standard temperature', '°R', String(std.tR)], ['Bg', 'Gas formation volume factor', 'ft³/scf', fmt(r.props.bg.values[i], 5)]);
    if (k === 'rho') rows.push(['R', 'Gas constant', 'psia·ft³/(lbmol·°R)', '10.7316'], ['ρg', 'Gas density', 'lbm/ft³', fmt(r.props.rho.values[i], 5)]);
    if (k === 'mu') rows.push(['ρg', 'Gas density', 'g/cm³', fmt(r.props.rho.values[i] * 0.01601846337, 5)], ['μg', 'Gas viscosity', 'cP', fmt(r.props.mu.values[i], 5)]);
    if (k === 'cg') rows.push(['cg', 'Isothermal gas compressibility', '1/psi', isNum(r.props.cg.values[i]) ? sci(r.props.cg.values[i], 4) : 'not available']);
    return rows;
  }
  function vOrRaw(r, k, i, s) {
    var v = r.props[k].values[i]; if (v !== null) return k === 'co' ? sci(v, 4) : fmt(v, s);
    var rw = r.props[k].raw && r.props[k].raw[i];
    return isNum(rw) ? (k === 'co' ? sci(rw, 4) : fmt(rw, s)) + ' — rejected (not physical)' : 'not available';
  }
  function deps(k, r, i) {
    var m = r.ctx.m;
    if (r.fluid === 'oil') {
      var sat = r.phase[i] === 'saturated', rsL = M.rsFamily[m.rs].label, boL = M.bo[m.bo].label, coL = M.co[m.co].label;
      var ch = r.ctx.char === 'pb' ? 'Rsb from the entered pb with ' + rsL + '.' : 'pb from the entered Rsb with ' + rsL + '.';
      var api = r.ctx.apiKind === 'derived' ? ['API from the stock-tank density' + (r.ctx.rhoBasis === '15C' ? ' (15 °C density brought to 60 °F with α = ' + fmt(r.ctx.alpha, 4) + ' 1/°C)' : '') + ' and water at 60 °F (999.016 kg/m³).'] : [];
      return api.concat({
        rs: [ch, sat ? 'p < pb: Rs(p) from ' + rsL + ', multiplied by Rsb/Rs_corr(pb) so that the curve passes exactly through Rsb at pb.' : 'p ≥ pb: no free gas, Rs = Rsb.'],
        bo: [ch, sat ? 'p ≤ pb: Bo from ' + boL + ' using Rs at this pressure.' : 'Bob from ' + boL + ' at Rsb, then Bo = Bob·exp(−∫co dp) from pb to p with ' + coL + ' (the exact integral of the same co). It needs co > 0.'],
        mu: [ch, 'μod (dead oil at T) from ' + M.muDead[m.muDead].label + '.', sat ? 'p < pb: Beggs-Robinson live-oil viscosity with Rs at this pressure.' : 'μob from Beggs-Robinson at Rsb, then Vasquez-Beggs undersaturated viscosity from pb to p.'],
        co: [ch, sat ? 'p < pb: the selected co correlation is for undersaturated oil only — no value.' : 'p > pb: co from ' + coL + ' with Rsb, T, API, γg' + (m.co === 'vasquez_beggs' ? 's' : '') + ' and p. A result ≤ 0 is rejected as not physical.']
      }[k]);
    }
    var pcT = (r.ctx.ggKind === 'derived' ? 'Composition → Ma = Σ yi·Mi, γg = Ma/28.96; ' : 'γg → Ma = 28.96·γg; ') + 'Ppc, Tpc from ' + M.pc[m.pc].label + '.';
    var sourT = m.sour !== 'none' ? [M.sour[m.sour].label + ' correction of Ppc and Tpc for CO₂ / H₂S' + (m.sour === 'carr_kobayashi_burrows' ? ' / N₂' : '') + '.'] : [];
    var zT = 'Ppr = p/Ppc, Tpr = T/Tpc → ' + (r.ctx.ideal ? 'ideal gas, Z = 1.' : m.z === 'manual' ? 'Z read from the chart by the user.' : 'Z from ' + M.z[m.z].label + '.');
    var base = [pcT].concat(sourT, [zT]);
    return base.concat({
      z: [], bg: ['Bg = (psc/Tsc)·Z·T/p on the ' + r.std.label + ' (gas ideal at standard conditions).'], rho: ['ρg = p·Ma/(Z·R·T).'],
      mu: ['ρg = p·Ma/(Z·R·T) → Lee-Gonzalez-Eakin with T, Ma and ρg in g/cm³.'], cg: [r.ctx.ideal ? 'cg = 1/p.' : 'cg = 1/p − (1/Z)(dZ/dp); dZ/dp by central difference (±0.1 % of p) with the same pseudo-criticals.']
    }[k]);
  }
  function metas(k, r, i) {
    var m = r.ctx.m;
    if (r.fluid === 'oil') {
      var sat = r.phase[i] === 'saturated';
      if (k === 'rs') return [['Rs / pb', M.rsFamily[m.rs], m.rs === 'vasquez_beggs']];
      if (k === 'bo') return sat ? [['Bo (p ≤ pb)', M.bo[m.bo], m.bo === 'vasquez_beggs']] : [['Bob at pb', M.bo[m.bo], m.bo === 'vasquez_beggs'], ['co and Bo above pb', M.co[m.co], m.co === 'vasquez_beggs']];
      if (k === 'mu') return [['Dead-oil viscosity', M.muDead[m.muDead]], ['Saturated viscosity', M.muSat.beggs_robinson]].concat(sat ? [] : [['Undersaturated viscosity', M.muUnder.vasquez_beggs]]);
      return [['co (p > pb)', M.co[m.co], m.co === 'vasquez_beggs']];
    }
    var out = [['Pseudo-criticals', M.pc[m.pc]]];
    if (m.sour !== 'none') out.push(['Sour-gas correction', M.sour[m.sour]]);
    if (!r.ctx.ideal) out.push(['Z factor', M.z[m.z]]);
    if (k === 'mu') out.push(['Viscosity', M.muGas[m.mu]]);
    return out;
  }
  var RVAR = { p: 'p', pb: 'pb', T: 'T', api: 'API', gg: 'γg', rs: 'Rsb', ppr: 'Ppr', tpr: 'Tpr', yCO2: 'yCO2', yH2S: 'yH2S' };
  function applicabilityHtml(k, r, i) {
    var ctx = r.ctx;
    return metas(k, r, i).map(function (pair) {
      var g = pair[1], v = g.verify || {}, rg = g.range || {};
      var vals = r.fluid === 'oil' ? { p: r.pressures[i], pb: r.pb, T: ctx.tF, api: ctx.api, gg: pair[2] ? ctx.ggs : ctx.gg, rs: r.rsb }
        : { p: r.pressures[i], T: ctx.tF, gg: ctx.gg, ppr: r.props.ppr.values[i], tpr: ctx.tR / r.pc.tpc, yCO2: ctx.yCO2 || 0, yH2S: ctx.yH2S || 0 };
      var rows = Object.keys(rg).map(function (key) {
        var lo = rg[key][0], hi = rg[key][1], x = vals[key], ok = !isNum(x) || (x >= lo && x <= hi), st = (v.ranges && v.ranges[key]) || 'unverified';
        var show = function (y) { if (key === 'p' || key === 'pb') return fmtPw(y) + ' ' + wUnit('p'); if (key === 'T') return tTxt(y); if (key === 'rs') return fmtQ('Rs', y) + ' ' + unitOf('Rs'); return fmt(y, 4); };
        return '<tr class="' + (ok ? '' : 'is-out') + '"><td>' + (RVAR[key] || key) + (key === 'gg' && pair[2] ? 's' : '') + '</td><td class="pv-num">' + esc(show(x)) + '</td><td class="pv-num">' + esc(show(lo)) + ' – ' + esc(show(hi)) + '</td><td class="pv-txt">' + (ok ? ICON.ok + 'inside' : ICON.warn + 'outside') + ' <i>' + RANGE_WORD[st] + '</i></td></tr>';
      }).join('');
      return '<div class="ow-meth"><div class="ow-meth-h"><span class="pv-mono">' + esc(pair[0]) + '</span><b>' + esc(g.label) + '</b>'
        + (v.eq ? '<span class="pv-vstat is-' + v.eq + '">' + (v.eq === 'cross-checked' ? ICON.ok : ICON.warn) + EQ_WORD[v.eq] + '</span>' : '') + '</div>'
        + (rows ? '<div class="pv-tbl-wrap"><table class="pv-tbl ow-rng"><thead><tr><th class="pv-txt">Variable</th><th>This case</th><th>Published data range</th><th class="pv-txt">Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
          : '<p class="pv-note">No published data range is available for this method in the sources used.</p>')
        + (v.limit && v.limit !== '—' ? '<p class="pv-note">' + esc(v.limit) + '</p>' : '') + '</div>';
    }).join('');
  }
  function failSteps(k, r, i) {
    var why = r.props[k].reasons[i], raw = r.props[k].raw && r.props[k].raw[i];
    var mid = r.fluid === 'oil'
      ? '<li class="is-ok">' + ICON.ok + '<span>Fluid characterised: p<sub>b</sub> = ' + esc(pTxt(r.pb)) + ', R<sub>sb</sub> = ' + esc(fmtQ('Rs', r.rsb)) + ' ' + esc(unitOf('Rs')) + '.</span></li>'
        + '<li class="is-ok">' + ICON.ok + '<span>State at p = ' + esc(pTxt(r.pressures[i])) + ': ' + esc(phaseTxt(r, i).toLowerCase()) + '.</span></li>'
      : '<li class="is-ok">' + ICON.ok + '<span>Pseudo-criticals: Ppc = ' + esc(fmt(r.pc.ppc, 5)) + ' psia, Tpc = ' + esc(fmt(r.pc.tpc, 5)) + ' °R; Ppr = ' + esc(fmt(r.props.ppr.values[i], 4)) + ', Tpr = ' + esc(fmt(r.ctx.tR / r.pc.tpc, 4)) + '.</span></li>';
    return '<ol class="ow-steps"><li class="is-ok">' + ICON.ok + '<span>Inputs valid.</span></li>' + mid
      + (isNum(raw) ? '<li class="is-warn">' + ICON.warn + '<span>The correlation returned ' + esc(info(k).sym) + ' = ' + esc(k === 'co' ? sci(raw, 4) + ' 1/psi' : fmt(raw, 6)) + '.</span></li>' : '')
      + '<li class="is-fail">' + ICON.err + '<span><b>' + esc(info(k).sym) + ' stops here.</b> ' + esc(why) + '</span></li></ol>'
      + (k === 'co' && r.phase && r.phase[i] === 'saturated' ? '<p class="pv-note">The graph below shows co where it is defined (above p<sub>b</sub>). No value is drawn below p<sub>b</sub>.</p>' : '');
  }
  function propSwitcher(cur) {
    return '<div class="ow-dprops" role="group" aria-label="Explain another property">' + keys().map(function (k) {
      return '<button type="button" data-wexplain="' + k + '" class="' + (k === cur ? 'is-on' : '') + '" aria-pressed="' + (k === cur) + '">' + info(k).sym + '</button>';
    }).join('') + '</div>';
  }
  function curMethodKey(c, k) { var g = info(k).group; if (FL() === 'gas' && c.inp.behavior === 'ideal') return '__ideal'; return c.inp.m[g]; }
  function detailHtml() {
    var w = W(), k = w.prop, nf = info(k), r = w.calc.res, i = 0, v = r.props[k].values[i], d = E.detail(r, i, k);
    var ws = propWarnings(r, k), asm = propAssumptions(r, k, i);
    var refs = []; metas(k, r, i).forEach(function (pair) { (pair[1].ref || []).forEach(function (x) { if (refs.indexOf(x) === -1) refs.push(x); }); });
    var oil = FL() === 'oil';
    var head = '<div class="ow-dnav"><button type="button" class="ui-btn ui-btn-ghost ow-back" id="ow-back"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Back to ' + (oil ? 'oil' : 'gas') + ' results</button>' + propSwitcher(k) + '</div>'
      + '<header class="pv-card ow-dhead"><div class="ow-dhead-l"><span class="pv-mono">' + (oil ? 'Oil' : 'Gas') + ' property</span><h2 id="ow-d-title" tabindex="-1">' + esc(nf.name) + ' <span>' + nf.sym + '</span></h2>'
      + condHtml(r) + '</div><div class="ow-dval' + (isNum(v) ? '' : ' is-na') + '">' + (isNum(v) ? '<strong>' + esc(valTxt(k, v)) + '</strong><span>' + esc(propUnitB(k)) + '</span>' : '<strong>Not available</strong><span>at this pressure</span>') + '</div></header>';
    var mean = '<section class="pv-card ow-sec"><h3>What it means</h3><p>' + esc(nf.what) + '</p><h4>Why it matters</h4><p>' + esc(nf.why) + '</p></section>';
    var meth = '<section class="pv-card ow-sec"><h3>Correlation and applicability</h3>' + applicabilityHtml(k, r, i) + '</section>';
    var eq = '<section class="pv-card ow-sec ow-eq-sec"><h3>' + (isNum(v) ? 'Equation and calculation' : 'Where the calculation stops') + '</h3>'
      + (isNum(v) ? '' : failSteps(k, r, i))
      + '<div class="ow-eq-grid"><div><h4>Equation · ' + esc(d.method) + '</h4><pre class="pv-eq">' + esc(d.eq) + '</pre>'
      + '<h4>Symbols and values used</h4><div class="pv-tbl-wrap"><table class="pv-tbl ow-sym-t"><thead><tr><th class="pv-txt">Symbol</th><th class="pv-txt">Meaning</th><th class="pv-txt">Unit in the equation</th><th>Value</th></tr></thead><tbody>'
      + symbols(k, r, i).map(function (x) { return '<tr><td class="pv-txt"><b>' + esc(x[0]) + '</b></td><td class="pv-txt pv-wrap">' + esc(x[1]) + '</td><td class="pv-txt">' + esc(x[2]) + '</td><td class="pv-num">' + esc(x[3]) + '</td></tr>'; }).join('')
      + '</tbody></table></div></div>'
      + '<div><h4>Substituted values</h4><p class="pv-note">Evaluated in the field units the correlation was published in, then converted for display.</p><ol class="pv-subs">' + d.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol>'
      + '<h4>Intermediate values and dependencies</h4><ul class="ow-deps">' + deps(k, r, i).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div></div></section>';
    var graph = '<section class="pv-card ow-sec ow-graph"><div class="ow-graph-h"><h3>' + esc(nf.sym) + ' versus pressure</h3><span class="ow-graph-tools"><button type="button" class="ui-btn ui-btn-ghost" id="ow-png">Export PNG</button><button type="button" class="ui-btn ui-btn-ghost" id="ow-csv">Export CSV</button></span></div>'
      + '<p class="pv-note">Your result is for one pressure. This graph re-runs the same calculation over a pressure range so you can see the trend; the range does not change the result.</p>'
      + '<form class="ow-range" id="ow-range" novalidate><span class="ow-range-l">Graph pressure range</span>'
      + rangeField('from', 'From') + rangeField('to', 'To') + rangeField('step', 'Step', true)
      + '<button type="submit" class="ui-btn ui-btn-sub">Update graph</button><button type="button" class="pv-text-btn" id="ow-range-reset">Default range</button>'
      + '<span class="pv-err ow-range-err" id="ow-range-err">' + esc(w.rangeErr || '') + '</span></form>'
      + '<div class="pv-legend" id="ow-legend"></div><div class="ow-chart-host" id="ow-chart-host"></div><div class="ow-chart-msg" id="ow-chart-msg" hidden></div><div class="ow-point" id="ow-point" aria-live="polite"></div><div id="ow-graph-notes"></div></section>';
    var cmp = '<details class="pv-card ow-sec ow-fold" data-wfold="cmp' + k + '"' + (w.open['cmp' + k] ? ' open' : '') + '><summary><h3>Method comparison</h3><span>' + esc(GROUP_TITLE[nf.group]) + ' at the operating pressure</span></summary><div id="ow-cmp"></div></details>';
    var tbl = '<details class="pv-card ow-sec ow-fold" data-wfold="tbl' + k + '"' + (w.open['tbl' + k] ? ' open' : '') + '><summary><h3>Results table</h3><span>All properties over the graph range</span></summary><div class="pv-tbl-wrap ow-tbl" id="ow-tbl"></div></details>';
    var notes = '<section class="pv-card ow-sec"><h3>Warnings, assumptions and references</h3>'
      + (ws.length ? '<div class="pv-msg is-warn"><div class="pv-msg-h">' + ICON.warn + 'Warnings</div><ul>' + ws.map(function (x) { return '<li>' + esc(x.msg) + '</li>'; }).join('') + '</ul></div>' : '<div class="pv-msg is-ok"><div class="pv-msg-h">' + ICON.ok + 'No range warnings for these inputs</div></div>')
      + '<div class="pv-msg is-info"><div class="pv-msg-h">' + ICON.info + 'Assumptions</div><ul>' + asm.concat([
        'Correlation estimate — not measured PVT data.',
        oil ? 'Standard volumes on the correlation basis: 60 °F, 14.696 psia (101.325 kPa).' : 'Bg standard volume on ' + r.std.label + '.',
        oil && r.ctx.apiKind === 'derived' ? 'API from the stock-tank density relative to water at 60 °F (999.016 kg/m³).' : null,
        'Gauge pressures are converted with 1 atm = 14.696 psi.'
      ]).concat(r.info).filter(Boolean).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'
      + '<h4>References</h4><ol class="pv-refs">' + refs.map(function (x) { return '<li>' + esc(C.REF[x]) + '</li>'; }).join('') + '</ol></section>';
    return '<div class="pv-view ow ow-detail" data-page="detail" data-wprop="' + k + '">' + head + '<div class="ow-dgrid">' + mean + meth + '</div>' + eq + graph + cmp + tbl + notes + '</div>';
  }
  function rangeField(key, label, inc) {
    var t = W().rangeText ? W().rangeText[key] : '', u = inc ? dpUnit() : wUnit('p');
    return '<label class="ow-rf"><span>' + label + '</span><span class="pv-in"><input data-wr="' + key + '" inputmode="decimal" autocomplete="off" value="' + esc(t) + '" aria-label="Graph range ' + label.toLowerCase() + ' (' + esc(u) + ')"><span class="pv-u">' + esc(u) + '</span></span></label>';
  }

  /* ---- graph range: canonical psia / psi; default 1 atm to 1.5 × max(p, pb) with about 50 steps ---- */
  function niceNum(x) { var mag = Math.pow(10, Math.floor(Math.log10(x))), r = x / mag, c = [1, 2, 2.5, 5, 10]; for (var j = 0; j < c.length; j++) if (c[j] >= r - 1e-9) return c[j] * mag; return 10 * mag; }
  function dpFactor() { return U.inputToCanon('dp', 1, dpUnit()); }
  function defaultRange(r) {
    var from = U.P_ATM_PSIA, hi = Math.max(r.pressures[0], r.pb || 0) * 1.5;
    var toD = pD(hi), half = Math.pow(10, Math.floor(Math.log10(toD))) / 2; toD = Math.ceil(toD / half - 1e-9) * half;
    var stepD = niceNum((toD - pD(from)) / 50);
    return { from: from, to: U.inputToCanon('p', toD, wUnit('p')), step: stepD * dpFactor(), auto: true };
  }
  function renderRangeText() {
    var w = W(), rg = w.range; if (!rg) return;
    var r7 = function (x) { return String(+x.toPrecision(7)); };
    w.rangeText = { from: r7(pD(rg.from)), to: r7(pD(rg.to)), step: r7(rg.step / dpFactor()) };
  }
  function readRange() {
    var w = W(), t = {}, out = {};
    qa('[data-wr]').forEach(function (inp) { t[inp.getAttribute('data-wr')] = inp.value; });
    var pr = function (k) { var x = E.parse(t[k]); return x.state === 'ok' ? x.v : NaN; };
    var a = pr('from'), b = pr('to'), st = pr('step');
    if (!isNum(a) || !isNum(b) || !isNum(st)) return 'Enter numbers for From, To and Step.';
    out.from = U.inputToCanon('p', a, wUnit('p')); out.to = U.inputToCanon('p', b, wUnit('p')); out.step = st * dpFactor();
    if (!(out.from > 0)) return 'From must be an absolute pressure above 0.';
    if (!(out.to - out.from > E.P_TOL)) return 'To must be greater than From.';
    if (!(out.step > 0)) return 'Step must be greater than 0.';
    var n = Math.floor((b - a) / st) + 2;
    if (n > E.MAX_POINTS - 2) return 'Too many points (' + n + '); use a larger step (limit ' + (E.MAX_POINTS - 2) + ').';
    out.auto = false; w.range = out; w.rangeText = t; return null;
  }
  /* curve: the frozen calculation input over the graph grid, plus the operating pressure (pb is added by the engine) */
  function curveFor(over) {
    var c = W().calc, rg = W().range, pOp = c.res.pressures[0];
    var fD = pD(rg.from), tD = pD(rg.to), sD = rg.step / dpFactor(), ps = [rg.from];
    for (var j = Math.ceil(fD / sD - 1e-9); j * sD < tD - 1e-9; j++) { var x = U.inputToCanon('p', j * sD, wUnit('p')); if (x - ps[ps.length - 1] > E.P_TOL) ps.push(x); }
    if (rg.to - ps[ps.length - 1] > E.P_TOL) ps.push(rg.to);
    if (pOp >= rg.from - E.P_TOL && pOp <= rg.to + E.P_TOL && !ps.some(function (x) { return Math.abs(x - pOp) <= E.P_TOL; })) ps.push(pOp);
    ps.sort(function (x, y) { return x - y; });
    return E.run(Object.assign({}, c.inp, { units: S.units, pressuresPsia: ps, calcMode: 'list' }, over || {}, { m: Object.assign({}, c.inp.m, (over || {}).m || {}) }));
  }
  function idxOfP(r, p) { if (!isNum(p) || !r.pressures) return -1; for (var i = 0; i < r.pressures.length; i++) if (Math.abs(r.pressures[i] - p) <= E.P_TOL) return i; return -1; }
  var wCurve = null;
  function renderWfChart() {
    var hostEl = q('#ow-chart-host'); if (!hostEl || !W().calc) return;
    var w = W(), k = w.prop, c = w.calc, P = E.PROPS[FL()][k], pOp = c.res.pressures[0], msg = q('#ow-chart-msg');
    wCurve = curveFor();
    if (chart) { chart.destroy(); chart = null; }
    if (!wCurve.ok) {
      hostEl.hidden = true; msg.hidden = false;
      msg.innerHTML = '<b>No pressure curve for these settings.</b><p>' + esc(wCurve.errors.map(function (e) { return e.msg; }).join(' ')) + '</p>';
      q('#ow-legend').innerHTML = ''; q('#ow-point').innerHTML = ''; var tw = q('#ow-tbl'); if (tw) tw.innerHTML = '<p class="pv-note">No table: the curve cannot be calculated.</p>';
      renderCmp(); return;
    }
    /* nothing valid to draw: say why instead of showing an empty axis (rejected values are never plotted) */
    if (!wCurve.props[k].values.some(function (v) { return v !== null; })) {
      hostEl.hidden = true; msg.hidden = false; q('#ow-legend').innerHTML = '';
      var why = wCurve.props[k].reasons.filter(function (x, j, a) { return x && a.indexOf(x) === j; });
      msg.innerHTML = '<b>No valid ' + esc(P.sym) + ' anywhere in this pressure range.</b><p>' + why.slice(0, 3).map(esc).join('<br>') + '</p><span>The results table below lists every point and its reason.</span>';
      q('#ow-point').innerHTML = ''; q('#ow-graph-notes').innerHTML = '';
      renderTableW(); renderCmp(); return;
    }
    hostEl.hidden = false; msg.hidden = true;
    chart = PvtChart.create(hostEl, { onSelect: function (i) { w.selP[k] = wCurve.pressures[i]; renderPoint(); } });
    var grp = info(k).group, gm = info(k).meta, cur = curMethodKey(c, k);
    var curLabel = cur === '__ideal' ? 'Ideal gas (Z = 1)' : (gm[cur] || M.z[cur] || {}).label || cur;
    var series = [{ id: 'calc', label: curLabel, role: 'Selected', kind: 'calc', primary: true, color: primaryColor(),
      pts: wCurve.pressures.map(function (p, i) { var v = wCurve.props[k].values[i]; return [pD(p), v === null ? null : disp(P.q, v)]; }) }];
    var pal = FL() === 'oil' ? PALETTE_OIL : PALETTE_GAS;
    Object.keys(w.cmp[k] || {}).filter(function (mk) { return w.cmp[k][mk] && mk !== cur; }).forEach(function (mk, j) {
      var mm = {}; mm[grp] = mk; var rr = curveFor(FL() === 'gas' ? { m: mm, behavior: 'real' } : { m: mm }); if (!rr.ok) return;
      series.push({ id: mk, label: gm[mk].label, role: 'Compare', kind: 'calc', color: cssVar(pal[j % 5], '#1d8a5a'), dash: DASHES[j % DASHES.length],
        pts: rr.pressures.map(function (p, i) { var v = rr.props[k].values[i]; return [pD(p), v === null ? null : disp(P.q, v)]; }) });
    });
    if (meas && !meas.parsed.errors.length && meas.basis && meas.basis.cols[k] && meas.basis.cols[k].status !== 'blocked')
      series.push({ id: 'meas', label: 'Measured (PVT data)', role: 'Measured', kind: 'meas', color: cssVar('--txt', '#16202f'), pts: meas.parsed.rows.map(function (rw) { var mv = measValue(rw, k); return [pD(rw.p), mv === null ? null : disp(P.q, mv)]; }) });
    var opI = idxOfP(wCurve, pOp), sel = idxOfP(wCurve, w.selP[k]);
    if (sel < 0) { sel = opI; w.selP[k] = opI >= 0 ? wCurve.pressures[opI] : null; }
    var hasPb = FL() === 'oil' && isNum(c.res.pb);
    q('#ow-legend').innerHTML = series.map(function (s) {
      return '<span class="pv-lg' + (s.primary ? ' is-primary' : '') + '">' + (s.kind === 'meas' ? '<i class="pv-lg-sq" style="border-color:' + s.color + '"></i>' : '<svg width="28" height="8" aria-hidden="true"><line x1="1" x2="27" y1="4" y2="4" stroke="' + s.color + '" stroke-width="' + (s.primary ? 3.2 : 2) + '"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + '/></svg>') + '<em>' + s.role + '</em>' + esc(s.label) + '</span>';
    }).join('') + '<span class="pv-lg"><svg width="14" height="12" aria-hidden="true"><path d="M7 1l5 5-5 5-5-5z" fill="' + primaryColor() + '"/></svg><em>Marker</em>Operating pressure</span>'
      + (hasPb ? '<span class="pv-lg"><svg width="14" height="12" aria-hidden="true"><line x1="7" x2="7" y1="0" y2="12" stroke="currentColor" stroke-dasharray="3 2" stroke-width="1.5"/></svg><em>Marker</em>Bubble point</span>' : '')
      + (opI < 0 ? '<span class="pv-lg ow-off">' + ICON.warn + 'Operating pressure is outside this range</span>' : '');
    chart.render({
      title: P.label + ', ' + P.sym + ' (' + propUnit(k) + ') vs pressure', xLabel: 'Pressure, ' + wUnit('p'), xUnit: wUnit('p'),
      yLabel: P.sym + ', ' + propUnit(k), series: series, selected: sel, reasons: wCurve.props[k].reasons,
      marker: hasPb ? { x: pD(c.res.pb), label: 'pb = ' + pTxt(c.res.pb) } : null,
      operating: { x: pD(pOp), index: opI, label: 'p = ' + pTxt(pOp), color: primaryColor() },
      fmtX: function (x) { return +x.toPrecision(6) + ''; }, fmtY: chartFmtY(k)
    });
    var own = propWarnings(c.res, k).map(function (x) { return x.msg; });
    var extra = propWarnings(wCurve, k).filter(function (x) { return own.indexOf(x.msg) === -1; });
    q('#ow-graph-notes').innerHTML = extra.length ? '<details class="ow-warn"><summary>' + ICON.warn + '<span>' + extra.length + ' range warning' + (extra.length > 1 ? 's' : '') + ' for points on this graph (values kept)</span></summary><ul>' + extra.map(function (x) { return '<li>' + esc(x.msg) + '</li>'; }).join('') + '</ul></details>' : '';
    renderPoint(); renderTableW(); renderCmp();
  }
  function renderPoint() {
    var el = q('#ow-point'); if (!el || !wCurve || !wCurve.ok) return;
    var w = W(), k = w.prop, i = idxOfP(wCurve, w.selP[k]), opI = idxOfP(wCurve, w.calc.res.pressures[0]);
    if (chart && i >= 0) chart.select(i);
    if (i < 0) { el.innerHTML = '<span>' + ICON.info + 'Click a point on the curve, or focus the graph and use ← →.</span>'; return; }
    var v = wCurve.props[k].values[i];
    el.innerHTML = '<span class="ow-pt-tag">' + (i === opI ? 'Operating point' : 'Selected point') + '</span><b>p = ' + esc(pTxt(wCurve.pressures[i])) + '</b>'
      + (wCurve.phase ? '<span class="pv-phase is-' + wCurve.phase[i].replace(' ', '-') + '">' + esc(wCurve.phase[i]) + '</span>' : '')
      + '<span><b>' + E.PROPS[FL()][k].sym + ' = ' + (v === null ? 'no value' : esc(valTxt(k, v)) + '</b> ' + esc(propUnitB(k))) + (v === null ? '</b> <i>' + esc(wCurve.props[k].reasons[i]) + '</i>' : '') + '</span>'
      + (i !== opI && opI >= 0 ? '<button type="button" class="pv-text-btn" id="ow-to-op">Back to operating point</button>' : '');
    var b = q('#ow-to-op'); if (b) b.addEventListener('click', function () { w.selP[k] = w.calc.res.pressures[0]; renderPoint(); });
    syncTableW();
  }
  function renderTableW() {
    var el = q('#ow-tbl'); if (!el || !wCurve) return;
    var k = W().prop, P = E.PROPS[FL()], cols = WF_TABLE[FL()], opI = idxOfP(wCurve, W().calc.res.pressures[0]), notes = [], idx = {}, oil = FL() === 'oil';
    el.innerHTML = '<table class="pv-tbl pv-res"><caption class="pv-sr">Properties over the graph pressure range</caption><thead><tr><th>p<em>' + esc(wUnit('p')) + '</em></th>' + (oil ? '<th class="pv-txt">State</th>' : '')
      + cols.map(function (x) { return '<th class="' + (x === k ? 'is-cur' : '') + '">' + P[x].sym + '<em>' + esc(propUnitB(x)) + '</em></th>'; }).join('') + '</tr></thead><tbody>'
      + wCurve.pressures.map(function (p, i) {
        var isPb = oil && wCurve.phase[i] === 'bubble point';
        return '<tr data-row="' + i + '" class="' + (i === opI ? 'is-op' : '') + (isPb ? ' is-pb' : '') + '"><td class="pv-num">' + fmtPw(p) + (!oil && i === opI ? ' <b>op.</b>' : '') + '</td>'
          + (oil ? '<td class="pv-txt">' + (i === opI ? '<b>operating</b> · ' : '') + (isPb ? '<b>bubble point</b>' : wCurve.phase[i]) + '</td>' : '')
          + cols.map(function (x) {
            var v = wCurve.props[x].values[i];
            if (v !== null) return '<td class="pv-num' + (x === k ? ' is-cur' : '') + '">' + valTxt(x, v) + '</td>';
            var rr = wCurve.props[x].reasons[i]; if (idx[rr] === undefined) { idx[rr] = notes.length + 1; notes.push(rr); }
            return '<td class="pv-num pv-na' + (x === k ? ' is-cur' : '') + '" title="' + esc(rr) + '">—<sup>' + idx[rr] + '</sup></td>';
          }).join('') + '</tr>';
      }).join('') + '</tbody></table>' + (notes.length ? '<ol class="pv-notes">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ol>' : '');
    syncTableW();
  }
  function syncTableW() {
    var i = wCurve && wCurve.ok ? idxOfP(wCurve, W().selP[W().prop]) : -1;
    qa('#ow-tbl tr[data-row]').forEach(function (tr) { tr.classList.toggle('is-sel', +tr.getAttribute('data-row') === i); });
  }
  function renderCmp() {
    var el = q('#ow-cmp'); if (!el) return;
    var w = W(), k = w.prop, c = w.calc, grp = info(k).group, gm = info(k).meta, cur = curMethodKey(c, k), base = c.res.props[k].values[0];
    var list = Object.keys(gm);
    if (cur === '__ideal' || cur === 'manual') list = [cur].concat(list);
    var rows = list.map(function (mk) {
      var mm = {}; mm[grp] = mk;
      var r = mk === cur ? c.res : E.run(Object.assign({}, c.inp, { units: S.units, m: Object.assign({}, c.inp.m, mm) }, FL() === 'gas' ? { behavior: 'real' } : {}));
      var v = r.ok ? r.props[k].values[0] : null, why = r.ok ? r.props[k].reasons[0] : (r.errors[0] && r.errors[0].msg);
      var dev = isNum(v) && isNum(base) && mk !== cur ? 100 * (v - base) / base : null, nw = r.ok ? propWarnings(r, k).length : 0;
      var label = mk === '__ideal' ? 'Ideal gas (Z = 1)' : mk === 'manual' ? M.z.manual.label : gm[mk].label;
      return '<tr class="' + (mk === cur ? 'is-cur' : '') + '"><td class="pv-txt">' + esc(label) + (mk === cur ? ' <i class="pv-tag">selected</i>' : '') + '</td>'
        + '<td class="pv-num">' + (isNum(v) ? esc(valTxt(k, v)) : '<span title="' + esc(why || '') + '">n/a</span>') + '</td><td class="pv-num">' + (dev === null ? '—' : (dev > 0 ? '+' : '') + dev.toFixed(2) + ' %') + '</td>'
        + '<td class="pv-txt pv-wrap">' + (nw ? ICON.warn + nw + ' range warning' + (nw > 1 ? 's' : '') : (isNum(v) ? ICON.ok + 'none' : esc(why || ''))) + '</td>'
        + '<td class="pv-txt">' + (mk === cur || mk === '__ideal' || mk === 'manual' ? '' : '<label class="pv-check"><input type="checkbox" data-wcmp="' + mk + '"' + ((w.cmp[k] || {})[mk] ? ' checked' : '') + '> Show on graph</label>') + '</td></tr>';
    }).join('');
    el.innerHTML = '<p class="pv-note">Same inputs, same pressure; only this correlation changes' + (FL() === 'gas' ? ' (alternatives are evaluated as real gas)' : '') + '. To use a different method for the results, change it under Advanced and calculate again.</p>'
      + '<div class="pv-tbl-wrap"><table class="pv-tbl ow-cmp-t"><thead><tr><th class="pv-txt">Method</th><th>' + E.PROPS[FL()][k].sym + '<em>' + esc(propUnitB(k)) + '</em></th><th>vs selected</th><th class="pv-txt">Range check</th><th class="pv-txt">Graph</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    qa('[data-wcmp]').forEach(function (cb) { cb.addEventListener('change', function () { w.cmp[k] = w.cmp[k] || {}; w.cmp[k][cb.getAttribute('data-wcmp')] = cb.checked; renderWfChart(); }); });
  }

  /* ---- errors, status ---- */
  function renderWfErrors(r) {
    qa('.ow-f').forEach(function (f) { f.classList.remove('is-err'); var i = f.querySelector('input'); if (i) i.removeAttribute('aria-invalid'); });
    qa('[data-werr]').forEach(function (e) { e.textContent = ''; });
    var sum = q('#ow-errsum'); if (!sum) return;
    if (!W().showErrors || !r || r.ok) { sum.hidden = true; sum.innerHTML = ''; return; }
    r.errors.forEach(function (er) {
      var box = q('[data-werr="' + er.field + '"]');
      if (box) {
        box.textContent = (box.textContent ? box.textContent + ' ' : '') + er.msg;
        var f = box.closest('.ow-f'); if (f) { f.classList.add('is-err'); var i = f.querySelector('input'); if (i) i.setAttribute('aria-invalid', 'true'); }
        var d = box.closest('details'); if (d) d.open = true;
      }
    });
    var g = { missing: [], invalid: [], failure: [] }; r.errors.forEach(function (e) { (g[e.kind] || g.invalid).push(e); });
    var link = function (e) { return '<button type="button" class="pv-errlink" data-wfocus="' + e.field + '">' + esc(e.label) + '</button>'; };
    var html = (g.missing.length ? '<div><b>Missing:</b> ' + g.missing.map(link).join(', ') + '</div>' : '')
      + (g.invalid.length ? '<div><b>Check:</b> ' + g.invalid.map(function (e) { return link(e) + ' — ' + esc(e.msg); }).join('; ') + '</div>' : '')
      + (g.failure.length ? '<div><b>Calculation failed:</b> ' + g.failure.map(function (e) { return esc(e.msg); }).join(' ') + '</div>' : '');
    sum.hidden = !html; sum.innerHTML = html ? ICON.err + '<div>' + html + '</div>' : '';
  }
  /* status chip: never an unqualified "Valid" when a property is unavailable */
  function wfStatus(st) {
    var c = W().calc;
    st.title = '';
    if (!c) {
      if (W().showErrors && res && !res.ok) {
        var g = errorGroups(), kind = g.failure.length ? 'Calculation failed' : g.invalid.length ? 'Invalid input' : 'Input needed', n = g.missing.length + g.invalid.length;
        st.className = 'pv-status is-err'; st.innerHTML = ICON.err + '<b>' + kind + '</b>' + (n && !g.failure.length ? '<span>' + n + ' field' + (n > 1 ? 's' : '') + '</span>' : ''); st.title = errorSummaryText();
      } else { st.className = 'pv-status'; st.innerHTML = '<b>Not calculated</b>'; }
      return;
    }
    if (wfStale()) { st.className = 'pv-status is-stale'; st.innerHTML = ICON.warn + '<b>Inputs changed</b><span>recalculate</span>'; return; }
    var r = c.res, nw = r.warnings.length, unav = unavailableKeys(r), n = keys().length;
    if (unav.length) {
      st.className = 'pv-status is-warn';
      st.innerHTML = ICON.err + '<b>' + (n - unav.length) + ' of ' + n + ' calculated</b><span>' + unav.map(function (k) { return info(k).sym; }).join(', ') + ' unavailable' + (nw ? ' · ' + nw + ' range note' + (nw > 1 ? 's' : '') : '') + '</span>';
      st.title = unav.map(function (k) { return info(k).sym + ': ' + r.props[k].reasons[0]; }).join('\n');
      return;
    }
    st.className = 'pv-status ' + (nw ? 'is-warn' : 'is-ok');
    st.innerHTML = (nw ? ICON.warn : ICON.ok) + '<b>All ' + n + ' calculated</b><span>' + (nw ? nw + ' range note' + (nw > 1 ? 's' : '') : 'no range warnings') + '</span>';
  }
  function wfInputChanged() {
    S.example[FL()] = false;
    var lab = q('#ow-ex-label'); if (lab) { lab.classList.remove('is-example'); lab.textContent = 'Your inputs'; }
    recompute();
    renderWfErrors(res); renderZRead();
    var rs = q('#ow-results'); if (rs) { rs.innerHTML = resultsHtml(); bindResults(); }
    renderStatus();
  }
  function renderZRead() {
    var zr = q('#ow-zread'); if (!zr) return;
    var h = E.run(wfEngineInput({ m: Object.assign({}, F().m, { z: 'dak' }) }));
    zr.innerHTML = h.ok && h.pc ? 'At p = ' + esc(pTxt(h.pressures[0])) + ': <b>Ppr = ' + fmt(h.props.ppr.values[0], 4) + '</b>, <b>Tpr = ' + fmt(h.ctx.tR / h.pc.tpc, 4) + '</b> — read Z on the Standing-Katz chart at these values.'
      : 'Ppr and Tpr appear here once pressure, temperature and gas are valid.';
  }
  function wfCalculate() {
    var inp = wfEngineInput(), r = E.run(inp), w = W();
    w.showErrors = true; recompute();
    if (!r.ok) { w.calc = null; renderView(); var s = q('#ow-errsum'); if (s) { s.setAttribute('tabindex', '-1'); s.focus(); } return; }
    var prevKey = w.calc && w.calc.key;
    w.calc = { inp: JSON.parse(JSON.stringify(inp)), key: wfKey(inp), res: r };
    if (prevKey !== w.calc.key) w.selP = {};
    if (!w.range || w.range.auto) { w.range = defaultRange(r); renderRangeText(); w.rangeErr = null; }
    w.showErrors = false;
    renderView();
    var t = q('#ow-res-title'); if (t) t.focus();
  }
  function openDetail(k) {
    var w = W(); if (!w.calc || wfStale() || !info(k)) return;
    w.prop = k; w.page = 'detail';
    if (!w.range) { w.range = defaultRange(w.calc.res); renderRangeText(); }
    renderView();
    var main = q('#pv-main'); if (main) main.scrollTop = 0;
    var h = q('#ow-d-title'); if (h) h.focus({ preventScroll: true });
  }
  function closeDetail() {
    var k = W().prop; W().page = 'overview'; renderView();
    var b = q('.ow-card[data-wprop="' + k + '"] .ow-explain'); if (b) b.focus();
  }
  function wfExample() {
    var fl = FL(), ex = E.example(fl, 'field'), f = F();
    f.canon = {};
    /* the engine example is in field units; it is entered as canonical values and shown in each field's own unit */
    var canon = fl === 'oil' ? { p: +ex.p, T: +ex.T, pb: +ex.pb, rsb: +ex.rsb, rhoSto: +ex.rhoSto } : { p: +ex.p, T: +ex.T };
    Object.keys(canon).forEach(function (k) { f.canon[k] = canon[k]; f[k] = wText(k, canon[k]); });
    f.gg = String(ex.gg);
    if (fl === 'oil') { f.api = String(ex.api); if (f.rhoBasis === '15C') f.rhoBasis = '60F'; }
    else f.comp = exampleComp();
    S.example[fl] = true; W().showErrors = false;
    recompute(); renderView();
  }
  function wfClear() {
    var f = F();
    ['p', 'T', 'api', 'rhoSto', 'alpha', 'gg', 'pb', 'rsb', 'psep', 'tsep', 'yCO2', 'yH2S', 'yN2', 'zManual'].forEach(function (k) { if (k in f) f[k] = ''; });
    if (f.comp) f.comp = blankComp();
    f.canon = {}; S.example[FL()] = false; W().showErrors = false;
    recompute(); renderView();
  }
  function applyWfCompPaste() {
    var t = (q('#ow-comp-paste') || {}).value || '', f = F(), rows = blankComp(), n = 0;
    t.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (l) {
      if (n >= COMP_ROWS) return;
      var c = l.split(/\t|,|;/).map(function (x) { return x.trim(); });
      if (c.length < 2) return;
      rows[n++] = c.length >= 3 ? { name: c[0], formula: c[1], y: c[2] } : { name: c[0], formula: '', y: c[1] };
    });
    if (!n) return;
    f.comp = rows; S.example.gas = false; recompute(); renderView();
  }

  /* ---- events ---- */
  function bindResults() {
    qa('#ow-results [data-wexplain]').forEach(function (b) { b.addEventListener('click', function () { openDetail(b.getAttribute('data-wexplain')); }); });
    qa('#ow-results [data-wunits]').forEach(function (b) { b.addEventListener('click', function () { setResultUnits(b.getAttribute('data-wunits')); }); });
  }
  /* result units: display only; every per-field input unit is kept (unlike the old preset switch) */
  function setResultUnits(u) {
    if (u === S.units) return;
    ['oil', 'gas'].forEach(function (fl) { var c = S.wf[fl].calc; if (c) { c.inp.units = u; c.res = E.run(c.inp); } });   // same physical inputs: only warning texts change units
    S.units = u;
    recompute(); renderView();
  }
  function bindWf() {
    var on = function (id, ev, fn) { var el = q(id); if (el) el.addEventListener(ev, fn); };
    if (W().page === 'detail' && q('.ow-detail')) {
      on('#ow-back', 'click', closeDetail);
      qa('.ow-dprops [data-wexplain]').forEach(function (b) { b.addEventListener('click', function () { openDetail(b.getAttribute('data-wexplain')); }); });
      on('#ow-range', 'submit', function (e) { e.preventDefault(); var err = readRange(); W().rangeErr = err; var el = q('#ow-range-err'); if (el) el.textContent = err || ''; if (!err) renderWfChart(); });
      on('#ow-range-reset', 'click', function () { W().range = defaultRange(W().calc.res); renderRangeText(); W().rangeErr = null; qa('[data-wr]').forEach(function (i) { i.value = W().rangeText[i.getAttribute('data-wr')]; }); q('#ow-range-err').textContent = ''; renderWfChart(); });
      qa('.ow-fold').forEach(function (d) { d.addEventListener('toggle', function () { W().open[d.getAttribute('data-wfold')] = d.open; }); });
      on('#ow-png', 'click', function () {
        var r = W().calc.res;
        if (chart) chart.exportPng('pvt-' + FL() + '-' + W().prop + '.png', contextLinesW(r).slice(0, 4));
      });
      on('#ow-csv', 'click', exportWfCsv);
      return;
    }
    qa('[data-wk]').forEach(function (inp) {
      var k = inp.getAttribute('data-wk');
      inp.addEventListener('input', function () { F()[k] = inp.value; if (F().canon) delete F().canon[k]; wfInputChanged(); });
    });
    qa('[data-wu]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var k = sel.getAttribute('data-wu'); setWUnit(k, sel.value);
        var inp = q('#ow-in-' + k); if (inp) inp.value = F()[k] === undefined ? '' : F()[k];
        if (k === 'p' && W().range) renderRangeText();
        wfInputChanged();   // physical value unchanged: results stay current; the conditions line follows the new unit
      });
    });
    qa('[data-wseg]').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-wseg'), v = b.getAttribute('data-v'), f = F();
        if (key === 'stdBasis') S.stdBasis = v; else f[key] = v;
        if (key === 'gasBasis' && v === 'gravity' && f.m.pc === 'kay') f.m.pc = 'standing_natural';
        if (key === 'gasBasis' && v === 'composition' && f.m.sour === 'carr_kobayashi_burrows') f.m.sour = 'wichert_aziz';
        if (b.closest('#ow-adv')) W().open.adv = true;
        S.example[FL()] = false; recompute(); renderView();
        var x = q('[data-wseg="' + key + '"].is-on'); if (x) x.focus();
      });
    });
    qa('[data-wm]').forEach(function (sel) { sel.addEventListener('change', function () { F().m[sel.getAttribute('data-wm')] = sel.value; W().open.adv = true; recompute(); renderView(); var x = q('#' + sel.id); if (x) x.focus(); }); });
    qa('[data-wchk]').forEach(function (cb) { cb.addEventListener('change', function () { F()[cb.getAttribute('data-wchk')] = cb.checked; W().open.adv = true; recompute(); renderView(); }); });
    qa('[data-wgc]').forEach(function (inp) { inp.addEventListener('input', function () { F().comp[+inp.getAttribute('data-wgc')][inp.getAttribute('data-wgcf')] = inp.value; wfInputChanged(); }); });
    on('#ow-adv', 'toggle', function () { W().open.adv = q('#ow-adv').open; });
    on('#ow-default-m', 'click', function () { var f = F(); f.m = Object.assign({}, FL() === 'oil' ? E.OIL_DEFAULT_M : E.GAS_DEFAULT_M); if (FL() === 'gas' && f.gasBasis === 'composition') f.m.pc = 'kay'; recompute(); renderView(); });
    on('#ow-example', 'click', wfExample);
    on('#ow-clear', 'click', wfClear);
    on('#ow-calc', 'click', wfCalculate);
    on('#ow-comp-apply', 'click', applyWfCompPaste);
    var es = q('#ow-errsum'); if (es) es.addEventListener('click', function (e) {
      var t = e.target.closest('[data-wfocus]'); if (!t) return;
      var fld = t.getAttribute('data-wfocus'), el = q('#ow-in-' + fld) || q('#ow-m-' + fld.replace(/Method$/, '')) || q('[data-werr="' + fld + '"]');
      if (el) { var d = el.closest('details'); if (d) d.open = true; if (el.focus) el.focus(); }
    });
    bindResults();
  }
  function afterWfRender() {
    if (W().page === 'detail' && q('.ow-detail')) renderWfChart();
    else { renderWfErrors(res); renderZRead(); }
  }
  /* inputs as entered (value and its own unit), for the exports */
  function inputLinesW(inp) {
    var L = [], f = inp, u = F().u, cn = function (k, lbl) { if (isNum(f.canon[k])) L.push(lbl + ' = ' + String(+U.inputFromCanon(dims()[k], f.canon[k], u[k]).toPrecision(7)) + ' ' + u[k]); };
    cn('p', 'Pressure'); cn('T', 'Temperature');
    if (f.fluid === 'oil') {
      if (f.oilGravityBasis === 'density') { cn('rhoSto', 'Stock-tank oil density at ' + (f.rhoBasis === '15C' ? '15 °C' : '60 °F')); if (f.rhoBasis === '15C') L.push('Oil thermal expansion α = ' + f.alpha + ' 1/°C'); } else L.push('API gravity = ' + f.api);
      L.push('Gas specific gravity = ' + f.gg + ' (air = 1)');
      if (f.oilChar === 'pb') cn('pb', 'Bubble-point pressure (measured)'); else cn('rsb', 'Rsb (measured, 60 °F)');
      if (f.sepUse) { cn('psep', 'Separator pressure'); cn('tsep', 'Separator temperature'); }
    } else if (f.gasBasis === 'gravity') {
      L.push('Gas specific gravity = ' + f.gg + ' (air = 1)');
      if (f.m.sour !== 'none') L.push('yCO2 = ' + f.yCO2 + ', yH2S = ' + f.yH2S + (f.m.sour === 'carr_kobayashi_burrows' ? ', yN2 = ' + f.yN2 : '') + ' (' + (f.sourBasis === 'percent' ? 'mol %' : 'mole fraction') + ')');
    } else L.push('Composition (' + (f.compBasis === 'percent' ? 'mol %' : 'mole fraction') + (f.normalize ? ', normalised if needed' : '') + '): ' + f.comp.filter(function (r) { return String(r.y).trim(); }).map(function (r) { return (r.name || r.formula) + ' ' + r.y; }).join('; '));
    return L;
  }
  function contextLinesW(r) {
    var c = W().calc;
    return ['PVT Nexus — ' + FL() + ' properties (correlation estimates; ' + (FL() === 'oil' ? '60 °F / 14.696 psia basis' : 'Bg on ' + r.std.short) + '); result units ' + (S.units === 'metric' ? 'Metric' : 'Field')]
      .concat(inputLinesW(c.inp).map(function (l) { return 'Input: ' + l; }))
      .concat(['Methods: ' + r.methods.map(function (m) { return m[0] + ' = ' + m[1]; }).join('; ')]);
  }
  function exportWfCsv() {
    if (!wCurve || !wCurve.ok) return;
    var r = W().calc.res, P = E.PROPS[FL()], cols = WF_TABLE[FL()];
    var L = contextLinesW(r).concat(wCurve.warnings.map(function (w) { return 'Warning: ' + w.msg; })).map(function (l) { return '# ' + l; });
    L.push(['p (' + wUnit('p') + ')'].concat(FL() === 'oil' ? ['state'] : []).concat(cols.map(function (k) { return P[k].sym + ' (' + propUnitB(k) + ')'; })).concat(['notes']).map(csvCell).join(','));
    wCurve.pressures.forEach(function (p, i) {
      var notes = [];
      L.push([fmtPw(p)].concat(FL() === 'oil' ? [wCurve.phase[i]] : []).concat(cols.map(function (k) { var v = wCurve.props[k].values[i]; if (v === null) { notes.push(P[k].sym + ': ' + wCurve.props[k].reasons[i]); return ''; } return fmt(disp(P[k].q, v), 7); }))
        .concat([notes.filter(function (n, j) { return notes.indexOf(n) === j; }).join(' | ')]).map(csvCell).join(','));
    });
    download(new Blob(['﻿' + L.join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'pvt-' + FL() + '-curve.csv');
  }

  /* ================================================================ render */
  function renderShell() {
    host.innerHTML = shell();
    root = host.querySelector('.pv');
    root.classList.toggle('ex-open', S.explain);
    bindShell();
    renderView();
  }
  function renderView() {
    var main = q('#pv-main');
    if (S.view === 'charts') S.view = 'inputs';
    if (chart) { chart.destroy(); chart = null; }
    if (global.OilBatch && S.view !== 'measured') global.OilBatch.unmount();
    var html = { inputs: inputsView, charts: inputsView, table: tableView, measured: measuredView, methods: methodsView }[S.view]();
    main.innerHTML = html;
    root.setAttribute('data-guide', S.view === 'inputs' ? 'wf' : 'tools');
    main.scrollTop = 0;
    qa('.pv-tab').forEach(function (b) { var on = b.getAttribute('data-view') === S.view; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    if (S.view === 'inputs') bindWf(); else bindView();
    if (S.help && S.help !== 'point') S.help = null;
    refresh();
    if (S.view === 'inputs') afterWfRender();
    if (S.view === 'measured' && S.fluid === 'oil' && global.OilBatch) global.OilBatch.mount(q('#pv-batch-host'));
  }
  /* repaint everything that depends on the result (never the input fields themselves) */
  function refresh() {
    renderStatus();
    if (S.view === 'table') renderTable();
    if (S.view === 'measured') renderMeasured();
    if (S.explain) renderExplain();
  }

  /* error summary that names the fields: "Missing: Temperature, Gas specific gravity." */
  function errorGroups() {
    var g = { missing: [], invalid: [], failure: [] };
    (res ? res.errors : []).forEach(function (e) { (g[e.kind] || g.invalid).push(e); });
    return g;
  }
  function errorSummaryText() {
    var g = errorGroups(), parts = [];
    if (g.missing.length) parts.push('Missing: ' + g.missing.map(function (e) { return e.label; }).join(', ') + '.');
    if (g.invalid.length) parts.push('Check: ' + g.invalid.map(function (e) { return e.label; }).join(', ') + '.');
    if (g.failure.length) parts.push('Calculation failed: ' + g.failure.map(function (e) { return e.msg; }).join(' '));
    return parts.join(' ');
  }
  function renderStatus() {
    var st = q('#pv-status'), cx = q('#pv-ctx');
    if (cx) cx.innerHTML = '<span>' + (S.units === 'metric' ? 'Metric' : 'Field') + ' · ' + esc(U.unit('p', S.units, S.gauge)) + '</span><span title="Standard-condition basis of standard volumes">Std ' + esc(basis().short.replace(', 101.325 kPa', '')) + '</span>';
    if (!st || !res) return;
    if (S.view === 'inputs') {
      if (cx) cx.innerHTML = '<span title="Display units of the results; each input has its own unit">Results · ' + (S.units === 'metric' ? 'Metric' : 'Field') + '</span><span title="Standard-condition basis of standard volumes">Std ' + esc(basis().short.replace(', 101.325 kPa', '')) + '</span>';
      wfStatus(st); return;
    }
    if (!res.ok) {
      var g = errorGroups();
      var kind = g.failure.length ? 'failure' : g.invalid.length ? 'invalid' : 'missing';
      st.className = 'pv-status is-err';
      /* short badge; the field names are listed in the error summary on the Inputs view */
      var n = kind === 'failure' ? 0 : g.missing.length + g.invalid.length;
      st.innerHTML = ICON.err + '<b>' + { missing: 'Input needed', invalid: 'Invalid input', failure: 'Calculation failed' }[kind] + '</b>' + (n ? '<span>' + n + ' field' + (n > 1 ? 's' : '') + '</span>' : '');
      st.title = errorSummaryText();
      return;
    }
    var unav = 0;
    /* co below pb is "not calculated" by design, not a failure: it is not counted here */
    Object.keys(res.props).forEach(function (k) { if (E.PROPS[S.fluid][k].table) return; res.props[k].values.forEach(function (v, i) { if (v === null && !/^Not calculated below pb/.test(res.props[k].reasons[i] || '')) unav++; }); });
    var rng = res.warnings.filter(function (w) { return w.kind !== 'accuracy'; }).length, acc = res.warnings.length - rng;
    var asm = res.scalars.filter(function (s) { return s.kind === 'assumed'; }).length;
    var issues = unav || rng || acc;
    st.className = 'pv-status ' + (issues ? 'is-warn' : 'is-ok'); st.title = '';
    st.innerHTML = (issues ? ICON.warn : ICON.ok) + '<b>Valid</b><span>' + res.pressures.length + ' point' + (res.pressures.length > 1 ? 's' : '')
      + (unav ? ' · ' + unav + ' unavailable' : '') + (rng ? ' · ' + rng + ' outside range' : '') + (acc ? ' · ' + acc + ' accuracy note' + (acc > 1 ? 's' : '') : '')
      + (asm ? ' · ' + asm + ' assumption' + (asm > 1 ? 's' : '') : '') + '</span>';
  }

  function renderFieldErrors() {
    qa('.pv-f').forEach(function (f) { f.classList.remove('is-err'); var i = f.querySelector('input,select,textarea'); if (i) i.removeAttribute('aria-invalid'); });
    qa('[data-err]').forEach(function (e) { e.textContent = ''; });
    var sum = q('#pv-errsum'), nx = q('#pv-next-t');
    if (!res) return;
    res.errors.forEach(function (er) {
      var box = q('[data-err="' + er.field + '"]');
      if (box && er.field !== 'comp') { box.textContent = er.msg; var f = box.closest('.pv-f'); if (f) { f.classList.add('is-err'); var i = f.querySelector('input,select,textarea'); if (i) i.setAttribute('aria-invalid', 'true'); } }
      if (box) { var parent = box.parentElement; while (parent && parent !== root) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; } }
    });
    var cb = q('[data-err="comp"]');
    if (cb) cb.innerHTML = res.errors.filter(function (e) { return e.field === 'comp'; }).map(function (e) { return esc(e.msg); }).join('<br>');
    if (sum) {
      var g = errorGroups(), html = '';
      var link = function (e) { return '<button type="button" class="pv-errlink" data-focus="' + e.field + '">' + esc(e.label) + '</button>'; };
      if (g.missing.length) html += '<div><b>Missing:</b> ' + g.missing.map(link).join(', ') + '</div>';
      if (g.invalid.length) html += '<div><b>Check:</b> ' + g.invalid.map(function (e) { return link(e) + ' — ' + esc(e.msg); }).join('; ') + '</div>';
      if (g.failure.length) html += '<div><b>Calculation failed:</b> ' + g.failure.map(function (e) { return esc(e.msg); }).join(' ') + '</div>';
      sum.hidden = !html;
      sum.innerHTML = html ? ICON.err + '<div>' + html + '</div>' : '';
    }
    if (nx) nx.innerHTML = res.ok ? ICON.ok + 'Inputs valid — ' + res.pressures.length + ' point' + (res.pressures.length > 1 ? 's' : '') + ' calculated.' : '';
    /* derived characterisation readout (oil) */
    var dv = q('#pv-derived');
    if (dv) {
      if (res.ok) {
        var pbS = res.scalars.filter(function (s) { return s.key === 'pb'; })[0], rsS = res.scalars.filter(function (s) { return s.key === 'rsb'; })[0];
        var other = F().oilChar === 'pb' ? rsS : pbS;
        dv.innerHTML = '<span class="pv-l">' + esc(other.label) + '</span><span class="pv-dv">' + fmtQ(other.q, other.v) + ' <em>' + esc(unitOf(other.q)) + (other.key === 'rsb' ? ' · 60 °F' : '') + '</em></span><span class="pv-hint">Correlation estimate · ' + esc(other.method) + '</span>';
      } else dv.innerHTML = '<span class="pv-l">' + (F().oilChar === 'pb' ? 'Rsb' : 'pb') + ' from the correlation</span><span class="pv-hint">Shown once the inputs are valid.</span>';
    }
    /* composition helper columns */
    if (S.fluid === 'gas' && F().gasBasis === 'composition') {
      var f = F(), tot = 0;
      f.comp.forEach(function (r, i) {
        var rec = (r.name || r.formula) ? E.resolveComponent(r.name, r.formula) : null;
        var set = function (a, v) { var c = q('[' + a + '="' + i + '"]'); if (c) c.textContent = v; };
        set('data-cmw', rec ? rec.mw_lb_lbmol : (r.name || r.formula ? 'not found' : ''));
        set('data-ctc', rec ? rec.tc_r : ''); set('data-cpc', rec ? rec.pc_psia : '');
        var y = E.parse(r.y); if (y.state === 'ok') tot += y.v;
      });
      var sEl = q('#pv-comp-sum'); if (sEl) sEl.textContent = fmt(tot, 6) + (f.compBasis === 'percent' ? ' %' : '');
      var mx = q('#pv-comp-mix'); if (mx) mx.textContent = res.ok ? 'Ma = ' + fmt(res.ctx.ma, 5) + ' lb/lbmol · γg = ' + fmt(res.ctx.gg, 4) + (res.ctx.comp.normalized ? ' (normalised)' : '') : '';
    }
    /* manual Z reading helper: Ppr / Tpr at the entered pressure */
    var zr = q('#pv-zread');
    if (zr) {
      var h = E.run(engineInput({ m: Object.assign({}, F().m, { z: 'dak' }), calcMode: 'single' }));
      zr.innerHTML = h.ok && h.pc ? 'At p = ' + fmtQ('p', h.pressures[0]) + ' ' + esc(U.unit('p', S.units, S.gauge)) + ': <b>Ppr = ' + fmt(h.props.ppr.values[0], 4) + '</b>, <b>Tpr = ' + fmt(h.ctx.tR / h.pc.tpc, 4) + '</b> — read Z on the Standing-Katz chart at these values.'
        : 'Ppr and Tpr appear here once pressure, temperature and gas are valid.';
    }
  }

  /* ================================================================ events */
  function bindShell() {
    qa('.pv-fluid button').forEach(function (b) { b.addEventListener('click', function () { switchFluid(b.getAttribute('data-fluid')); }); });
    qa('.pv-tab').forEach(function (b) { b.addEventListener('click', function () { S.view = b.getAttribute('data-view'); renderView(); }); });
    q('.pv-tabs').addEventListener('keydown', function (e) {   // arrow keys move between tabs
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var tabs = qa('.pv-tab'), i = tabs.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].focus();
    });
    q('#pv-explain-btn').addEventListener('click', function () { setExplain(!S.explain); });
    q('#pv-ex-close').addEventListener('click', function () { setExplain(false); });
    q('#pv-reset').addEventListener('click', resetAll);

    root.addEventListener('click', function (e) {
      var g = e.target.closest('[data-goto]'); if (g) { var menu = q('.pv-more-tools'); if (menu) menu.open = false; S.view = g.getAttribute('data-goto'); renderView(); return; }
      var h = e.target.closest('[data-help]'); if (h) { e.preventDefault(); setExplain(true, h.getAttribute('data-help')); return; }
      var fo = e.target.closest('[data-focus]'); if (fo) { var el = q('#pv-in-' + fo.getAttribute('data-focus')) || q('#pv-m-' + fo.getAttribute('data-focus').replace(/Method$/, '')) || q('[data-err="' + fo.getAttribute('data-focus') + '"]'); if (el) { var d = el.parentElement; while (d && d !== root) { if (d.tagName === 'DETAILS') d.open = true; d = d.parentElement; } el.focus && el.focus(); } }
    });
  }
  function onKey(e) { if (e.key === 'Escape' && S.explain && host && host.isConnected && !document.querySelector('.bd-ov, .cd-ov, .sd-ov')) setExplain(false); }

  function bindView() {
    var f = F();
    qa('[data-choose-property]').forEach(function (b) { b.addEventListener('click', function () { chooseProperty(b.getAttribute('data-choose-property')); }); });
    qa('[data-input-unit]').forEach(function(sel){
      sel.addEventListener('change',function(){
        var k=sel.getAttribute('data-input-unit');
        captureCanon(f,S.units,S.gauge);
        f.inputUnits=f.inputUnits || {}; f.inputUnits[k]=sel.value;
        renderCanon(f,S.units,S.gauge);
        recompute(); renderView();
        var next=q('[data-input-unit="'+k+'"]'); if(next) next.focus();
      });
    });
    qa('[data-k]').forEach(function (inp) {
      var k = inp.getAttribute('data-k');
      var ev = inp.type === 'checkbox' ? 'change' : 'input';
      inp.addEventListener(ev, function () {
        f[k] = inp.type === 'checkbox' ? inp.checked : inp.value;
        if (KIND[k] && f.canon) delete f.canon[k];   // typed value replaces the canonical one
        S.example[S.fluid] = false;
        var chip = q('.pv-chip.is-example'); if (chip) chip.classList.remove('pv-chip', 'is-example'); var exLabel = q('#pv-example-label'); if (exLabel) exLabel.textContent = 'Your inputs';
        if (inp.type === 'checkbox' && (k === 'sepUse' || k === 'normalize')) { invalidateAnswer(); recompute(); if (k === 'sepUse') { S.advanced.oil = true; renderView(); } else refresh(); return; }
        markStale(); schedule();
      });
    });
    qa('[data-m]').forEach(function (sel) {
      sel.addEventListener('change', function () { invalidateAnswer(); f.m[sel.getAttribute('data-m')] = sel.value; S.compare[S.fluid] = {}; if (sel.closest('details')) S.advanced[S.fluid] = true; recompute(); renderView(); });
    });
    qa('[data-seg]').forEach(function (g) {
      var key = g.getAttribute('data-seg');
      g.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () { setSeg(key, b.getAttribute('data-v')); });
      });
    });
    var wo = q('#pv-work-options'); if (wo) wo.addEventListener('toggle', function () { S.optionsOpen = wo.open; });
    var adv = q('#pv-adv'); if (adv) adv.addEventListener('toggle', function () { S.advanced[S.fluid] = adv.open; });
    qa('[data-c]').forEach(function (inp) {
      inp.addEventListener('input', function () { f.comp[+inp.getAttribute('data-c')][inp.getAttribute('data-cf')] = inp.value; S.example.gas = false; markStale(); schedule(); });
    });
    var on = function (id, ev, fn) { var el = q(id); if (el) el.addEventListener(ev, fn); };
    on('#pv-example', 'click', function () { loadExample(); });
    on('#pv-calculate', 'click', calculateSelected);
    on('#pv-change-property', 'click', function () { G().stage = 'choose'; setExplain(false); renderView(); });
    on('#pv-show-trend', 'click', function () { invalidateAnswer(); F().calcMode = 'range'; renderView(); var first = q('#pv-in-pMin'); if (first) first.focus(); });
    on('#pv-default-methods', 'click', function () { invalidateAnswer(); f.m = Object.assign({}, S.fluid === 'oil' ? E.OIL_DEFAULT_M : E.GAS_DEFAULT_M); if (S.fluid === 'gas' && f.gasBasis === 'composition') f.m.pc = 'kay'; S.compare[S.fluid] = {}; recompute(); renderView(); });
    on('#pv-property', 'change', function (e) { S.chartProp[S.fluid] = e.target.value; S.compare[S.fluid] = {}; recompute(); renderView(); q('#pv-property').focus(); });
    on('#pv-clear', 'click', clearInputs);
    on('#pv-comp-apply', 'click', applyCompPaste);
    on('#pv-zimg', 'change', function (e) { var file = e.target.files && e.target.files[0]; if (file) { if (S.zImg) URL.revokeObjectURL(S.zImg); S.zImg = URL.createObjectURL(file); renderView(); } });
    /* charts */
    qa('[data-prop]').forEach(function (b) { b.addEventListener('click', function () { S.chartProp[S.fluid] = b.getAttribute('data-prop'); S.compare[S.fluid] = {}; recompute(); renderView(); }); });
    qa('[data-cmp]').forEach(function (c) { c.addEventListener('change', function () { S.compare[S.fluid][c.getAttribute('data-cmp')] = c.checked; recompute(); refresh(); }); });
    on('#pv-ylog', 'change', function (e) { S.yLog[S.fluid + S.chartProp[S.fluid]] = e.target.checked; renderChart(); });
    on('#pv-png', 'click', exportPng);
    /* table */
    on('#pv-csv', 'click', exportCsv);
    var tw = q('#pv-tbl-wrap');
    if (tw) {
      var pick = function (tr) { setSel(+tr.getAttribute('data-row')); syncTableSel(); if (S.explain) renderExplain(); };
      tw.addEventListener('click', function (e) { var tr = e.target.closest('tr[data-row]'); if (tr) pick(tr); });
      tw.addEventListener('keydown', function (e) {
        var tr = e.target.closest('tr[data-row]'); if (!tr) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(tr); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { var n = e.key === 'ArrowDown' ? tr.nextElementSibling : tr.previousElementSibling; if (n) { e.preventDefault(); n.focus(); } }
      });
    }
    /* measured */
    on('#pv-meas-apply', 'click', function () { S.measured[S.fluid].text = q('#pv-meas-text').value; recompute(); refresh(); });
    on('#pv-meas-clear', 'click', function () { S.measured[S.fluid] = { text: '', basis: '' }; renderView(); recompute(); refresh(); });
    on('#pv-meas-text', 'input', function () { S.measured[S.fluid].text = q('#pv-meas-text').value; });
    on('#pv-tpl-copy', 'click', function () {
      var t = templateText(), b = q('#pv-tpl-copy');
      var done = function () { if (b) { b.textContent = 'Copied'; setTimeout(function () { if (b.isConnected) b.textContent = 'Copy template'; }, 1500); } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { insertTemplate(); });
      else insertTemplate();
    });
    on('#pv-tpl-dl', 'click', function () { download(new Blob([templateText()], { type: 'text/csv;charset=utf-8' }), 'pvt-' + S.fluid + '-measured-template.csv'); });
    on('#pv-meas-file', 'change', function (e) {
      var file = e.target.files && e.target.files[0]; if (!file) return;
      var rd = new FileReader();
      rd.onload = function () { q('#pv-meas-text').value = String(rd.result); S.measured[S.fluid].text = String(rd.result); recompute(); refresh(); };
      rd.readAsText(file);
    });
  }
  function insertTemplate() { var t = q('#pv-meas-text'); if (t) { t.value = templateText() + t.value; S.measured[S.fluid].text = t.value; t.focus(); } }

  /* inputs changed: until the debounced recalculation lands, results are marked as updating */
  function invalidateAnswer() {
    G().ready = false; G().attempted = false;
    qa('.pv-f.is-err').forEach(function (box) { box.classList.remove('is-err'); var input = box.querySelector('input,select,textarea'); if (input) input.removeAttribute('aria-invalid'); });
    qa('[data-err]').forEach(function (box) { box.textContent = ''; });
    var summary = q('#pv-errsum'); if (summary) summary.hidden = true;
    if (chart) { chart.destroy(); chart = null; }
    var output = q('#pv-guided-output');
    if (output) output.innerHTML = pendingAnswer();
    if (root && S.view === 'inputs') root.setAttribute('data-guide', 'input');
  }
  function calculateSelected() {
    clearTimeout(timer); timer = null;
    G().attempted = true; recompute(); G().ready = !!res.ok;
    renderView();
    var target = q(res.ok ? '#pv-answer' : '#pv-errsum');
    if (target) { if (!res.ok) target.setAttribute('tabindex', '-1'); target.focus(); }
  }
  function chooseProperty(key) {
    if (!GUIDE_COPY[S.fluid][key]) return;
    S.chartProp[S.fluid] = key; S.compare[S.fluid] = {};
    G().stage = 'input'; G().attempted = false; G().ready = false;
    S.view = 'inputs'; S.optionsOpen = false; setExplain(false);
    recompute(); renderView();
    var first = q('[data-k]'); if (first) first.focus();
  }
  function markStale() {
    invalidateAnswer();
    var st = q('#pv-status');
    if (st) { st.className = 'pv-status is-stale'; st.innerHTML = '<b>Updating…</b>'; }
  }

  function setSeg(key, v) {
    var f = F();
    if (['units', 'gauge', 'stdBasis', 'measBasis'].indexOf(key) === -1) invalidateAnswer();
    if (key === 'units') convertUnits(v, S.gauge);
    else if (key === 'gauge') convertUnits(S.units, v === '1');
    else if (key === 'stdBasis') S.stdBasis = v;
    else if (key === 'measBasis') { S.measured[S.fluid].basis = v; S.measured[S.fluid].text = (q('#pv-meas-text') || {}).value || S.measured[S.fluid].text; }
    else f[key] = v;
    if (key === 'gasBasis' && v === 'gravity' && f.m.pc === 'kay') f.m.pc = 'standing_natural';
    if (key === 'gasBasis' && v === 'composition' && f.m.sour === 'carr_kobayashi_burrows') f.m.sour = 'wichert_aziz';
    if (['units', 'gauge', 'stdBasis', 'measBasis'].indexOf(key) === -1) S.example[S.fluid] = false;
    recompute();
    if (key === 'measBasis') { renderView(); return; }
    renderView();
    renderStatus();
  }

  /* switching unit system or pressure convention: same physical inputs, new rendering */
  function convertUnits(units, gauge) {
    ['gas'].forEach(function (fl) {   // oil fields keep their own per-field units
      captureCanon(S[fl], S.units, S.gauge);
      S[fl].inputUnits = {};
      renderCanon(S[fl], units, gauge);
    });
    S.units = units; S.gauge = gauge;
  }

  function switchFluid(fl) {
    if (fl === S.fluid) return;
    S.fluid = fl; S.view = 'inputs';
    if (opts.onFluid) opts.onFluid(fl);
    recompute(); renderShell();
  }
  function loadExample() {
    wfExample(); return;
    invalidateAnswer();
    var keep = { calcMode: F().calcMode, inputUnits: Object.assign({}, F().inputUnits) };
    S[S.fluid] = Object.assign(fluidDefaults(S.fluid, S.units, S.gauge), keep);
    renderCanon(F(), S.units, S.gauge);
    S.example[S.fluid] = true;
    recompute(); renderView();
  }
  function clearInputs() {
    wfClear(); return;
    invalidateAnswer();
    var f = F();
    ['p', 'pMin', 'pMax', 'pList', 'T', 'api', 'rhoSto', 'gg', 'pb', 'rsb', 'psep', 'tsep', 'yCO2', 'yH2S', 'yN2', 'zManual'].forEach(function (k) { if (k in f) f[k] = ''; });
    if (f.comp) f.comp = blankComp();
    var step = f.canon && f.canon.pStep !== undefined ? f.canon.pStep : toCanon('dp', f.pStep, S.units, false, inputUnit(f, 'pStep'));
    f.canon = isNum(step) ? { pStep: step } : {};
    S.example[S.fluid] = false;
    clearSel();
    recompute(); renderView();
  }
  function resetAll() {
    var keepU = Object.assign({}, F().u);
    S[S.fluid] = freshFluid(S.fluid); renderCanon(F(), S.units, S.gauge);
    F().u = keepU; S.wf[S.fluid] = newW(); if (chart) { chart.destroy(); chart = null; }
    S.guide[S.fluid] = newGuide(); S.view = 'inputs'; S.optionsOpen = false;
    S.example[S.fluid] = false;
    S.measured[S.fluid] = { text: '', basis: '' };
    S.compare[S.fluid] = {}; clearSel();
    recompute(); renderView();
  }
  function applyCompPaste() {
    var t = (q('#pv-comp-paste') || {}).value || '', f = F(), rows = blankComp(), n = 0;
    t.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (l) {
      if (n >= COMP_ROWS) return;
      var c = l.split(/\t|,|;/).map(function (s) { return s.trim(); });
      if (c.length < 2) return;
      rows[n++] = c.length >= 3 ? { name: c[0], formula: c[1], y: c[2] } : { name: c[0], formula: '', y: c[1] };
    });
    if (!n) return;
    f.comp = rows; S.example.gas = false;
    recompute(); renderView();
  }

  /* ---------------------------------------------------------------- exports */
  function inputLines() {
    var f = F(), L = [], pu = U.unit('p', S.units, S.gauge), tu = U.unit('T', S.units);
    var add = function (lbl, k, u) { if (KIND[k]) u = inputUnit(f, k) + (k === 'rsb' ? ' at 60 °F' : ''); if (f[k] !== undefined && String(f[k]).trim() !== '') L.push(lbl + ' = ' + f[k] + (u ? ' ' + u : '')); };
    if (f.calcMode === 'single') add('Pressure', 'p', pu);
    else if (f.calcMode === 'range') { add('Pressure from', 'pMin', pu); add('Pressure to', 'pMax', pu); add('Pressure step', 'pStep', U.unit('dp', S.units)); }
    else add('Pressure list', 'pList', pu);
    add('Temperature', 'T', tu);
    if (S.fluid === 'oil') {
      if (f.oilGravityBasis === 'api') add('API gravity', 'api', '°API'); else add('Stock-tank oil density (60 °F)', 'rhoSto', U.unit('density', S.units));
      add('Gas specific gravity', 'gg', '(air = 1)');
      if (f.oilChar === 'pb') add('Bubble-point pressure (measured)', 'pb', pu); else add('Rsb (measured)', 'rsb', U.unit('Rs', S.units) + ' at 60 °F');
      if (f.sepUse) { add('Separator pressure', 'psep', pu); add('Separator temperature', 'tsep', tu); }
    } else if (f.gasBasis === 'gravity') {
      add('Gas specific gravity', 'gg', '(air = 1)');
      if (f.m.sour !== 'none') { add('yCO2', 'yCO2', f.sourBasis === 'percent' ? 'mol %' : 'mole fraction'); add('yH2S', 'yH2S', f.sourBasis === 'percent' ? 'mol %' : 'mole fraction'); if (f.m.sour === 'carr_kobayashi_burrows') add('yN2', 'yN2', ''); }
    } else L.push('Composition (' + (f.compBasis === 'percent' ? 'mol %' : 'mole fraction') + (f.normalize ? ', normalised if needed' : '') + '): ' + f.comp.filter(function (r) { return String(r.y).trim(); }).map(function (r) { return (r.name || r.formula) + ' ' + r.y; }).join('; '));
    return L;
  }
  function contextLines() {
    var L = [];
    L.push('PVT Nexus — PVT Calculator export (' + (S.fluid === 'oil' ? 'oil' : 'gas') + ')');
    L.push('Units: ' + (S.units === 'metric' ? 'Metric' : 'Field') + '; pressures ' + U.unit('p', S.units, S.gauge) + (S.gauge ? ' (absolute = gauge + 1 atm)' : ''));
    L.push('Standard basis: ' + basis().label + (S.fluid === 'oil' ? ' — Rs, Rsb, Bo and Bob are always on this correlation basis' : ' — applies to Bg and Eg; gas taken as ideal at standard conditions'));
    inputLines().forEach(function (l) { L.push('Input: ' + l); });
    if (res && res.ok) {
      L.push('Points: ' + res.pressures.length + (S.fluid === 'oil' ? '; bubble point = ' + fmtQ('p', res.pb) + ' ' + U.unit('p', S.units, S.gauge) : ''));
      res.scalars.forEach(function (s) { var u = s.unitText !== undefined ? s.unitText : unitOf(s.q); L.push(s.label + ': ' + String(fmtQ(s.q, s.v)).replace(/&amp;/g, '&') + ' ' + u + ' [' + KIND_TXT[s.kind] + '; ' + s.method + ']'); });
      L.push('Methods: ' + res.methods.map(function (m) { return m[0] + ' = ' + m[1]; }).join('; '));
      res.warnings.forEach(function (w) { L.push((w.kind === 'accuracy' ? 'Accuracy note: ' : 'Warning: ') + w.msg); });
      res.info.forEach(function (t) { L.push('Note: ' + t); });
    }
    return L;
  }
  function csvCell(v) { var s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function exportCsv() {
    if (!res || !res.ok) return;
    var cols = tableCols(), P = E.PROPS[S.fluid];
    var lines = contextLines().map(function (l) { return '# ' + l; });
    lines.push(['p (' + U.unit('p', S.units, S.gauge) + ')'].concat(S.fluid === 'oil' ? ['state'] : []).concat(cols.map(function (k) { return P[k].sym + ' (' + propUnit(k) + (basisTag(k) ? ' @ ' + basisTag(k) : '') + ')'; })).concat(['notes']).map(csvCell).join(','));
    res.pressures.forEach(function (p, i) {
      var notes = [];
      var row = [fmtQ('p', p)].concat(S.fluid === 'oil' ? [res.phase[i]] : []).concat(cols.map(function (k) {
        var v = res.props[k].values[i]; if (v === null) { notes.push(P[k].sym + ': ' + res.props[k].reasons[i]); return ''; }
        return fmt(disp(P[k].q, v), 7);
      }));
      row.push(notes.filter(function (n, j) { return notes.indexOf(n) === j; }).join(' | '));
      lines.push(row.map(csvCell).join(','));
    });
    download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'pvt-' + S.fluid + '-results.csv');
  }
  function exportPng() {
    if (!chart || !res || !res.ok) return;
    var k = S.chartProp[S.fluid];
    var lines = [contextLines()[1], 'Standard basis: ' + basis().label + (basisTag(k) ? '' : ' (this property does not depend on it)')];
    lines.push('Methods: ' + res.methods.map(function (m) { return m[0] + ' = ' + m[1]; }).join('; '));
    lines.push('Inputs: ' + inputLines().join('; '));
    lines.push('T = ' + fmtT(res.ctx.tF) + (S.fluid === 'oil' ? '; pb = ' + fmtQ('p', res.pb) + ' ' + U.unit('p', S.units, S.gauge) + '; Rsb = ' + fmtQ('Rs', res.rsb) + ' ' + unitOf('Rs') + ' at 60 °F' : '; γg = ' + fmt(res.ctx.gg, 4)) + '; ' + res.pressures.length + ' points');
    if (warningsFor(k).length) lines.push(warningsFor(k).length + ' range / accuracy note(s) apply — see the calculator or the CSV export.');
    chart.exportPng('pvt-' + S.fluid + '-' + k + '.png', lines);
  }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ==================================================================== API */
  var PvtCalc = {
    mount: function (el, o) {
      if (!el) return;
      opts = o || {};
      if (host === el && root && root.isConnected) { if (o && o.fluid) PvtCalc.setFluid(o.fluid); return; }
      host = el;
      if (o && o.fluid) S.fluid = o.fluid;
      recompute();
      renderShell();
      document.addEventListener('keydown', onKey);
    },
    setFluid: function (fl) { if (fl && fl !== S.fluid && host) { S.fluid = fl; S.view = 'inputs'; recompute(); renderShell(); } },
    unmount: function () {
      clearTimeout(timer);
      if (chart) { chart.destroy(); chart = null; }
      if (global.OilBatch) global.OilBatch.unmount();
      document.removeEventListener('keydown', onKey);
      if (host) host.innerHTML = '';
      host = null; root = null;
    },
    isMounted: function (el) { return !!host && host === el && !!root && root.isConnected; },
    fluid: function () { return S.fluid; },
    /* test hooks */
    _state: function () { return S; }, _result: function () { return res; }
  };
  global.PvtCalc = PvtCalc;
})(window);
