/* ============================================================================
   VAPS PVT Nexus — PvtCalc
   Full-page PVT Calculator (Module 05): one screen, Oil / Gas, five views
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
  function toCanon(kind, text, units, gauge) {
    if (kind === 'plist') {
      var toks = String(text || '').split(/[\s,;]+/).filter(Boolean), out = [];
      for (var i = 0; i < toks.length; i++) { var r = E.parse(toks[i]); if (r.state !== 'ok') return undefined; out.push(U.pToPsia(r.v, units, gauge)); }
      return out.length ? out : undefined;
    }
    var v = E.parse(text);
    if (v.state !== 'ok') return undefined;
    if (kind === 'p') return U.pToPsia(v.v, units, gauge);
    if (kind === 'dp') return U.dpToPsi(v.v, units);          // an increment: never offset by 1 atm
    if (kind === 'T') return U.tToF(v.v, units);
    return U.fromDisplay(kind, v.v, units);
  }
  function displayText(kind, c, units, gauge) {
    var r7 = function (x) { return String(+x.toPrecision(7)); };    // rounding for display only
    if (kind === 'plist') return c.map(function (x) { return r7(U.pFromPsia(x, units, gauge)); }).join(', ');
    if (kind === 'p') return r7(U.pFromPsia(c, units, gauge));
    if (kind === 'dp') return r7(units === 'metric' ? c / U.PSI_PER_BAR : c);
    if (kind === 'T') return r7(U.tFromF(c, units));
    return r7(U.toDisplay(kind, c, units));
  }
  /* make sure every valid unit-bearing field has a canonical value (parsed in the units it was typed in) */
  function captureCanon(f, units, gauge) {
    f.canon = f.canon || {};
    Object.keys(KIND).forEach(function (k) {
      if (!(k in f) || f.canon[k] !== undefined) return;
      var c = toCanon(KIND[k], f[k], units, gauge);
      if (c !== undefined) f.canon[k] = c;
    });
  }
  function renderCanon(f, units, gauge) {
    Object.keys(f.canon || {}).forEach(function (k) { f[k] = displayText(KIND[k], f.canon[k], units, gauge); });
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
    return f;
  }
  var S = {
    fluid: 'oil', view: 'inputs', units: 'field', gauge: false,
    /* standard-condition basis for gas standard volumes (Bg, Eg); oil results always stay on 'corr' */
    stdBasis: 'corr',
    oil: fluidDefaults('oil', 'field', false), gas: fluidDefaults('gas', 'field', false),
    chartProp: { oil: 'rs', gas: 'z' }, compare: { oil: {}, gas: {} }, yLog: {},
    /* selection: the row index for drawing, and the physical pressure (psia) it belongs to */
    sel: { oil: -1, gas: -1 }, selP: { oil: null, gas: null },
    /* measured data: text as pasted, and the declared standard basis ('' = not declared) */
    measured: { oil: { text: '', basis: '' }, gas: { text: '', basis: '' } },
    explain: false, help: null, zImg: null, example: { oil: true, gas: true }, advanced: { oil: false, gas: false }
  };

  var host = null, opts = {}, res = null, cmpRes = [], meas = null, chart = null, timer = null, root = null;

  /* ------------------------------------------------------------ helpers */
  function F() { return S[S.fluid]; }
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
    var f = F();
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
    help: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="16.9" r="1" fill="currentColor"/></svg>'
  };
  var VIEWS = [['inputs', 'Inputs'], ['charts', 'Charts'], ['table', 'Results Table'], ['measured', 'Measured Data'], ['methods', 'Methods & References']];

  function shell() {
    var oil = S.fluid === 'oil';
    return '<div class="pv" data-fluid="' + S.fluid + '">'
      + '<div class="pv-top">'
      + '<div class="pv-hero">'
      + '<div class="pv-hero-l"><div class="pv-eyebrow"><span class="pv-rule"></span><span>PVT Calculator</span></div>'
      + '<div class="pv-titlerow"><h2 class="pv-title">' + (oil ? 'Oil Properties' : 'Gas Properties') + '</h2>'
      + '<p class="pv-sub">' + (oil ? 'Rs, Bo, μo and co versus pressure from published black-oil correlations.' : 'Z, Bg, ρg, μg and cg versus pressure from published natural-gas correlations.') + '</p></div></div>'
      + '<div class="pv-hero-r"><span class="pv-mono" id="pv-fluid-lbl">Fluid</span><div class="pv-pills pv-fluid" role="group" aria-labelledby="pv-fluid-lbl">'
      + '<button type="button" data-fluid="oil" class="' + (oil ? 'is-on' : '') + '" aria-pressed="' + oil + '">' + ICON.oil + 'Oil</button>'
      + '<button type="button" data-fluid="gas" class="' + (!oil ? 'is-on' : '') + '" aria-pressed="' + !oil + '">' + ICON.gas + 'Gas</button>'
      + '</div></div></div>'
      + '<div class="pv-bar"><div class="pv-tabs" role="tablist" aria-label="Calculator views">'
      + VIEWS.map(function (v) { return '<button type="button" role="tab" data-view="' + v[0] + '" class="pv-tab' + (S.view === v[0] ? ' is-on' : '') + '" aria-selected="' + (S.view === v[0]) + '">' + v[1] + '</button>'; }).join('')
      + '</div><div class="pv-ctx" id="pv-ctx"></div><div class="pv-status" id="pv-status" role="status" aria-live="polite"></div>'
      + '<div class="pv-bar-end"><button type="button" class="ui-btn ui-btn-sub" id="pv-reset" title="Restore the example inputs for this fluid and clear its measured data">Reset</button>'
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
      + (unit ? '<span class="pv-u" aria-hidden="true">' + unit + '</span>' : '') + '</span>'
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
    else body += '<div class="pv-grid2"><div class="pv-f is-wide" data-f="pList"><label class="pv-l" for="pv-in-pList">Pressures (' + pu + ')</label><textarea id="pv-in-pList" data-k="pList" rows="2" spellcheck="false" aria-describedby="pv-err-pList pv-hint-pList">' + esc(val('pList')) + '</textarea><span class="pv-err" id="pv-err-pList" data-err="pList"></span><span class="pv-hint" id="pv-hint-pList">Commas, spaces or new lines.</span></div>' + field('T', 'Temperature, T', tu) + '</div>';
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
    var body = optRow('Units', pills('units', S.units, [['field', 'Field'], ['metric', 'Metric']], 'Unit system'))
      + optRow('Pressure', pills('gauge', S.gauge ? '1' : '0', [['0', S.units === 'metric' ? 'Absolute, bar(a)' : 'Absolute, psia'], ['1', S.units === 'metric' ? 'Gauge, bar(g)' : 'Gauge, psig']], 'Pressure convention'))
      + (gas ? optRow('Standard volumes' + helpBtn('basis', 'standard conditions'), pills('stdBasis', S.stdBasis, [['corr', '60 °F, 101.325 kPa'], ['lab', '15 °C, 101.325 kPa']], 'Standard-condition basis'))
        + '<p class="pv-note">Applies to Bg and Eg (gas taken as ideal at standard conditions). Changing units does not change this basis.</p>'
        : '<div class="pv-opt"><span class="pv-opt-l">Standard volumes' + helpBtn('basis', 'standard conditions') + '</span><span class="pv-fixed">60 °F, 101.325 kPa (correlation basis)</span></div>'
        + '<p class="pv-note">Rs, Rsb and Bo stay on the correlation basis; a 15 °C laboratory conversion would need the oil’s thermal expansion and is not offered.</p>');
    return card('Units and standard conditions', body, { cls: 'pv-card-quiet' });
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

  function inputsView() {
    var oil = S.fluid === 'oil';
    var head = '<div class="pv-ihead"><div class="pv-ihead-l">'
      + (S.example[S.fluid] ? '<span class="pv-chip is-example" title="The fields hold example values. Replace them with your fluid data.">' + ICON.info + 'Example data</span>' : '')
      + '<span class="pv-ihead-t">Required inputs are numbered 1–2; correlations have defaults.</span></div>'
      + '<div class="pv-ihead-r"><button type="button" class="ui-btn ui-btn-ghost" id="pv-example">Load example</button>'
      + '<button type="button" class="ui-btn ui-btn-sub pv-btn-clear" id="pv-clear">Clear inputs</button></div></div>';
    return '<div class="pv-view pv-inputs">' + head + '<div class="pv-errsum" id="pv-errsum" role="alert" hidden></div>'
      + '<div class="pv-icols"><div class="pv-icol">' + conditionsCard() + (oil ? oilFluidCard() : gasFluidCard()) + '</div>'
      + '<div class="pv-icol">' + (oil ? oilMethodsCard() : gasMethodsCard()) + basisCard() + '</div></div>'
      + '<div class="pv-actions pv-next"><span class="pv-next-t" id="pv-next-t"></span><button type="button" class="ui-btn ui-btn-ghost" data-goto="table">View results</button>'
      + '<button type="button" class="ui-btn ui-btn-primary" data-goto="charts">View charts ' + ICON.arrow + '</button></div></div>';
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
      + '<div class="pv-tools"><div class="pv-pills pv-props" role="group" aria-label="Property to plot">' + props.map(function (k) {
        var p = E.PROPS[S.fluid][k];
        return '<button type="button" data-prop="' + k + '" class="' + (k === cur ? 'is-on' : '') + '" aria-pressed="' + (k === cur) + '" title="' + esc(p.label) + '">' + p.sym + '</button>';
      }).join('') + '</div>'
      + '<div class="pv-cmp" role="group" aria-label="Compare with"><span class="pv-mono">Compare</span>' + cmp + '</div>'
      + '<div class="pv-tools-end"><label class="pv-check"><input type="checkbox" id="pv-ylog"' + (S.yLog[S.fluid + cur] ? ' checked' : '') + '> Log scale</label>'
      + '<button type="button" class="ui-btn ui-btn-ghost" id="pv-png">Export PNG</button></div></div>'
      + '<div class="pv-chart-card"><div class="pv-chart-head"><div class="pv-chart-title" id="pv-chart-title"></div><div class="pv-chart-meta" id="pv-chart-meta"></div></div>'
      + '<div class="pv-legend" id="pv-legend"></div>'
      + '<div class="pv-chart-host" id="pv-chart-host"></div><div class="pv-single" id="pv-single" hidden></div><div class="pv-chart-msg" id="pv-chart-msg" hidden></div>'
      + '<div class="pv-pointbar" id="pv-pointbar" aria-live="polite"></div></div>'
      + '<div class="pv-notes-row" id="pv-chart-notes"></div>'
      + '</div>';
  }

  function seriesFor(r, k) {
    return r.pressures.map(function (p, i) { var v = r.props[k].values[i]; return [disp('p', p), v === null ? null : disp(E.PROPS[S.fluid][k].q, v)]; });
  }
  function chartFmtY(k) { return function (v) { var a = Math.abs(v); if ((S.fluid + '.' + k) === 'oil.co' || (S.fluid + '.' + k) === 'gas.cg' || (a !== 0 && a < 1e-3)) return sci(v, 2); return +v.toPrecision(5) + ''; }; }

  function renderChart() {
    var hostEl = q('#pv-chart-host'), msg = q('#pv-chart-msg'), single = q('#pv-single');
    if (!hostEl) return;
    var k = S.chartProp[S.fluid], P = E.PROPS[S.fluid][k];
    if (!chart || !hostEl.firstChild) { if (chart) chart.destroy(); chart = PvtChart.create(hostEl, { onSelect: function (i) { setSel(i); renderPointBar(); syncTableSel(); if (S.explain) renderExplain(); } }); }
    var title = q('#pv-chart-title'), meta = q('#pv-chart-meta'), legend = q('#pv-legend'), notes = q('#pv-chart-notes');
    if (!res || !res.ok) {
      chart.render(null); msg.hidden = false; single.hidden = true; hostEl.hidden = false;
      msg.innerHTML = '<b>No chart yet.</b> ' + esc(errorSummaryText()) + ' <button type="button" class="ui-btn ui-btn-sub" data-goto="inputs">Go to Inputs</button>';
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
    return Object.keys(P).filter(function (x) { return !P[x].table || (!compact && (x === 'ppr' || x === 'eg')); }).map(function (x) {
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
    var i = 0;
    return '<div class="pv-single-h"><span class="pv-mono">Result at one pressure</span><b>p = ' + fmtQ('p', res.pressures[0]) + ' ' + esc(U.unit('p', S.units, S.gauge)) + '</b>'
      + (res.phase ? '<span class="pv-phase is-' + res.phase[0].replace(' ', '-') + '">' + res.phase[0] + '</span>' : '') + '</div>'
      + '<div class="pv-pvals pv-pvals-lg">' + pointValues(i, false) + '</div>'
      + '<p class="pv-note">One pressure gives one point, not a curve. Choose <b>Pressure range</b> or <b>Pressure list</b> under Inputs to plot properties against pressure.</p>'
      + '<button type="button" class="ui-btn ui-btn-ghost" data-help="point">Show equation and substituted values</button>';
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
    } else if (v === 'inputs') {
      ti.textContent = 'Entering the inputs';
      html = sec('1 · Pressure and temperature', 'One pressure gives one result; a range or a list gives curves. Absolute pressure (psia, bar(a)) is what the correlations use — gauge values are converted by adding 1 atm.')
        + sec('2 · ' + (S.fluid === 'oil' ? 'Oil and gas' : 'Gas'), S.fluid === 'oil' ? esc(HELP.api[1]) + ' ' + esc(HELP.pb[1]) : 'Gas gravity, or a composition (mole fractions or percent; the total must be 1 or 100 unless you tick normalisation, which is reported).')
        + sec('3 · Correlations', 'Defaults are set. Change them under Correlations; more options are under the expandable section.')
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
    if (chart) { chart.destroy(); chart = null; }
    if (global.OilBatch && S.view !== 'measured') global.OilBatch.unmount();
    var html = { inputs: inputsView, charts: chartsView, table: tableView, measured: measuredView, methods: methodsView }[S.view]();
    main.innerHTML = html;
    main.scrollTop = 0;
    qa('.pv-tab').forEach(function (b) { var on = b.getAttribute('data-view') === S.view; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    bindView();
    if (S.help && S.help !== 'point') S.help = null;
    refresh();
    if (S.view === 'measured' && S.fluid === 'oil' && global.OilBatch) global.OilBatch.mount(q('#pv-batch-host'));
  }
  /* repaint everything that depends on the result (never the input fields themselves) */
  function refresh() {
    renderStatus();
    if (S.view === 'inputs') renderFieldErrors();
    if (S.view === 'charts') renderChart();
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
    if (!res.ok) {
      var g = errorGroups();
      var kind = g.failure.length ? 'failure' : g.invalid.length ? 'invalid' : 'missing';
      st.className = 'pv-status is-err';
      st.innerHTML = ICON.err + '<b>' + { missing: 'Input needed', invalid: 'Invalid input', failure: 'Calculation failed' }[kind] + '</b><span>' + esc((g.missing.concat(g.invalid).map(function (e) { return e.label; }).join(', ')) || (g.failure[0] && g.failure[0].label) || '') + '</span>';
      return;
    }
    var unav = 0;
    /* co below pb is "not calculated" by design, not a failure: it is not counted here */
    Object.keys(res.props).forEach(function (k) { if (E.PROPS[S.fluid][k].table) return; res.props[k].values.forEach(function (v, i) { if (v === null && !/^Not calculated below pb/.test(res.props[k].reasons[i] || '')) unav++; }); });
    var rng = res.warnings.filter(function (w) { return w.kind !== 'accuracy'; }).length, acc = res.warnings.length - rng;
    var asm = res.scalars.filter(function (s) { return s.kind === 'assumed'; }).length;
    var issues = unav || rng || acc;
    st.className = 'pv-status ' + (issues ? 'is-warn' : 'is-ok');
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
      if (box && box.closest('details') && !box.closest('details').open) box.closest('details').open = true;
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
      var g = e.target.closest('[data-goto]'); if (g) { S.view = g.getAttribute('data-goto'); renderView(); return; }
      var h = e.target.closest('[data-help]'); if (h) { e.preventDefault(); setExplain(true, h.getAttribute('data-help')); return; }
      var fo = e.target.closest('[data-focus]'); if (fo) { var el = q('#pv-in-' + fo.getAttribute('data-focus')) || q('#pv-m-' + fo.getAttribute('data-focus').replace(/Method$/, '')) || q('[data-err="' + fo.getAttribute('data-focus') + '"]'); if (el) { var d = el.closest('details'); if (d) d.open = true; el.focus && el.focus(); } }
    });
  }
  function onKey(e) { if (e.key === 'Escape' && S.explain && host && host.isConnected && !document.querySelector('.bd-ov, .cd-ov, .sd-ov')) setExplain(false); }

  function bindView() {
    var f = F();
    qa('[data-k]').forEach(function (inp) {
      var k = inp.getAttribute('data-k');
      var ev = inp.type === 'checkbox' ? 'change' : 'input';
      inp.addEventListener(ev, function () {
        f[k] = inp.type === 'checkbox' ? inp.checked : inp.value;
        if (KIND[k] && f.canon) delete f.canon[k];   // typed value replaces the canonical one
        S.example[S.fluid] = false;
        var chip = q('.pv-chip.is-example'); if (chip) chip.remove();
        if (inp.type === 'checkbox' && (k === 'sepUse' || k === 'normalize')) { recompute(); if (k === 'sepUse') { S.advanced.oil = true; renderView(); } else refresh(); return; }
        markStale(); schedule();
      });
    });
    qa('[data-m]').forEach(function (sel) {
      sel.addEventListener('change', function () { f.m[sel.getAttribute('data-m')] = sel.value; S.compare[S.fluid] = {}; if (sel.closest('details')) S.advanced[S.fluid] = true; recompute(); renderView(); });
    });
    qa('[data-seg]').forEach(function (g) {
      var key = g.getAttribute('data-seg');
      g.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () { setSeg(key, b.getAttribute('data-v')); });
      });
    });
    var adv = q('#pv-adv'); if (adv) adv.addEventListener('toggle', function () { S.advanced[S.fluid] = adv.open; });
    qa('[data-c]').forEach(function (inp) {
      inp.addEventListener('input', function () { f.comp[+inp.getAttribute('data-c')][inp.getAttribute('data-cf')] = inp.value; S.example.gas = false; markStale(); schedule(); });
    });
    var on = function (id, ev, fn) { var el = q(id); if (el) el.addEventListener(ev, fn); };
    on('#pv-example', 'click', function () { loadExample(); });
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
  function markStale() {
    var st = q('#pv-status');
    if (st) { st.className = 'pv-status is-stale'; st.innerHTML = '<b>Updating…</b>'; }
  }

  function setSeg(key, v) {
    var f = F();
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
    ['oil', 'gas'].forEach(function (fl) {
      captureCanon(S[fl], S.units, S.gauge);
      renderCanon(S[fl], units, gauge);
    });
    S.units = units; S.gauge = gauge;
  }

  function switchFluid(fl) {
    if (fl === S.fluid) return;
    S.fluid = fl;
    if (opts.onFluid) opts.onFluid(fl);
    recompute(); renderShell();
  }
  function loadExample() {
    var keep = { calcMode: F().calcMode };
    S[S.fluid] = Object.assign(fluidDefaults(S.fluid, S.units, S.gauge), keep);
    S.example[S.fluid] = true;
    recompute(); renderView();
  }
  function clearInputs() {
    var f = F();
    ['p', 'pMin', 'pMax', 'pStep', 'pList', 'T', 'api', 'rhoSto', 'gg', 'pb', 'rsb', 'psep', 'tsep', 'yCO2', 'yH2S', 'yN2', 'zManual'].forEach(function (k) { if (k in f) f[k] = ''; });
    if (f.comp) f.comp = blankComp();
    f.canon = {};
    S.example[S.fluid] = false;
    clearSel();
    recompute(); renderView();
  }
  function resetAll() {
    S[S.fluid] = fluidDefaults(S.fluid, S.units, S.gauge);
    S.example[S.fluid] = true;
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
    var add = function (lbl, k, u) { if (f[k] !== undefined && String(f[k]).trim() !== '') L.push(lbl + ' = ' + f[k] + (u ? ' ' + u : '')); };
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
    setFluid: function (fl) { if (fl && fl !== S.fluid && host) { S.fluid = fl; recompute(); renderShell(); } },
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
