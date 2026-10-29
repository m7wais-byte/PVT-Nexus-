/* ============================================================================
   VAPS PVT Nexus — PvtCalc
   Full-page PVT Calculator (Module 05): one screen, Oil / Gas modes, five views
       Inputs · Charts · Results Table · Measured Data · Methods & References
   and the right-side "Explain This Stage" drawer.

   Mounted by Main.js into the host rendered by screens/showCalc.js:
       PvtCalc.mount(el, { fluid, onFluid })   PvtCalc.setFluid(f)   PvtCalc.unmount()

   Layering (each part testable on its own):
     calc/pvt-units.js         unit systems, gauge / absolute, standard conditions
     calc/pvt-correlations.js  published equations + reference / range metadata
     calc/pvt-engine.js        validation + evaluation (pure)
     calc/pvt-measured.js      measured-data import + error statistics
     components/PvtChart.js    interactive SVG chart
     components/OilBatch.js    multi-sample oil batch evaluation (kept from the old calculator)
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
  function fluidDefaults(fluid, units) {
    var ex = E.example(fluid, units);
    if (fluid === 'oil') return Object.assign({ calcMode: 'range', oilGravityBasis: 'api', oilChar: 'pb', sepUse: false, psep: '', tsep: '', m: Object.assign({}, E.OIL_DEFAULT_M) }, ex);
    return Object.assign({ calcMode: 'range', gasBasis: 'gravity', comp: exampleComp(), compBasis: 'fraction', normalize: false, behavior: 'real',
      sourBasis: 'fraction', yCO2: '0', yH2S: '0', yN2: '0', zManual: '', m: Object.assign({}, E.GAS_DEFAULT_M) }, ex);
  }
  var S = {
    fluid: 'oil', view: 'inputs', units: 'field', gauge: false,
    oil: fluidDefaults('oil', 'field'), gas: fluidDefaults('gas', 'field'),
    chartProp: { oil: 'rs', gas: 'z' }, compare: { oil: {}, gas: {} }, yLog: {},
    sel: { oil: -1, gas: -1 }, measured: { oil: { text: '' }, gas: { text: '' } },
    explain: false, zImg: null, example: { oil: true, gas: true }
  };

  var host = null, opts = {}, res = null, cmpRes = [], meas = null, chart = null, timer = null, root = null;

  /* ------------------------------------------------------------ helpers */
  function F() { return S[S.fluid]; }
  function esc(t) { return String(t === undefined || t === null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function q(sel) { return root ? root.querySelector(sel) : null; }
  function qa(sel) { return root ? Array.prototype.slice.call(root.querySelectorAll(sel)) : []; }
  var fmt = E.fmt;
  function isNum(x) { return typeof x === 'number' && isFinite(x); }

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
    return fmt(d, sig || 5);
  }
  /* one fixed resolution per unit system so a column of pressures lines up */
  function fmtP(d) { return S.units === 'metric' ? d.toFixed(Math.abs(d) < 10 ? 3 : 2) : d.toFixed(Math.abs(d) < 100 ? 2 : 1); }
  function fmtT(f) { return fmt(U.tFromF(f, S.units), 4) + ' ' + U.unit('T', S.units); }

  function pLabel() { return 'Pressure, ' + U.unit('p', S.units, S.gauge); }

  /* -------------------------------------------------------- engine input */
  function engineInput(extra) {
    var f = F();
    var inp = Object.assign({}, f, { fluid: S.fluid, units: S.units, gauge: S.gauge, m: Object.assign({}, f.m) });
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
    if (S.sel[S.fluid] >= (res.pressures || []).length) S.sel[S.fluid] = -1;
  }

  function computeMeasured() {
    meas = null;
    var md = S.measured[S.fluid];
    if (!md.text || !md.text.trim()) return;
    var parsed = MD.parse(md.text, S.fluid, S.units, S.gauge);
    meas = { parsed: parsed, calc: null, cmp: [] };
    if (parsed.errors.length || !res || !res.ok) return;
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

  /* which method group drives the chart property (for "compare") */
  function compareGroup() {
    var p = S.chartProp[S.fluid];
    if (S.fluid === 'oil') {
      if (p === 'rs') return { mkey: 'rs', meta: M.rsFamily, title: 'Rs / pb correlation' };
      if (p === 'bo') return { mkey: 'bo', meta: M.bo, title: 'Bo correlation (p ≤ pb)' };
      if (p === 'mu') return { mkey: 'muDead', meta: M.muDead, title: 'Dead-oil viscosity correlation' };
      if (p === 'co') return { mkey: 'co', meta: M.co, title: 'Undersaturated co correlation' };
    }
    var zm = {}; ['dak', 'papay', 'beggs_brill'].forEach(function (k) { zm[k] = M.z[k]; });
    return { mkey: 'z', meta: zm, title: 'Z-factor correlation (real gas)' };
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
    oil: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    gas: '<svg viewBox="0 0 24 24" fill="none"><circle cx="7" cy="9" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="14" cy="6" r="1.6" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="13" r="2.4" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="16" r="1.5" stroke="currentColor" stroke-width="1.6"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="8" r="1" fill="currentColor"/></svg>'
  };
  var VIEWS = [['inputs', 'Inputs'], ['charts', 'Charts'], ['table', 'Results Table'], ['measured', 'Measured Data'], ['methods', 'Methods & References']];

  function shell() {
    return '<div class="pv" data-fluid="' + S.fluid + '">'
      + '<div class="pv-top">'
      + '<div class="pg-head pv-head">'
      + '<div class="pg-icon pv-icon">' + ICON[S.fluid] + '</div>'
      + '<div class="pg-titles"><span class="pg-eyebrow pv-eyebrow">PVT Calculator</span>'
      + '<h1 class="pg-title pv-title">' + (S.fluid === 'oil' ? 'Oil Properties' : 'Gas Properties') + '</h1>'
      + '<p class="pg-desc">' + (S.fluid === 'oil' ? 'Rs, Bo, μo and co versus pressure from published black-oil correlations' : 'Z, Bg, ρg, μg and cg versus pressure from published natural-gas correlations') + '</p></div>'
      + '<div class="pg-end"><div class="pv-seg pv-fluid" role="group" aria-label="Fluid">'
      + '<button type="button" data-fluid="oil" class="' + (S.fluid === 'oil' ? 'is-on' : '') + '" aria-pressed="' + (S.fluid === 'oil') + '">' + ICON.oil + 'Oil</button>'
      + '<button type="button" data-fluid="gas" class="' + (S.fluid === 'gas' ? 'is-on' : '') + '" aria-pressed="' + (S.fluid === 'gas') + '">' + ICON.gas + 'Gas</button>'
      + '</div></div></div>'
      + '<div class="pv-bar"><div class="pv-tabs" role="tablist">'
      + VIEWS.map(function (v) { return '<button type="button" role="tab" data-view="' + v[0] + '" class="pv-tab' + (S.view === v[0] ? ' is-on' : '') + '" aria-selected="' + (S.view === v[0]) + '">' + v[1] + '</button>'; }).join('')
      + '</div><div class="pv-status" id="pv-status" aria-live="polite"></div>'
      + '<div class="pv-bar-end"><button type="button" class="ui-btn ui-btn-sub" id="pv-reset" title="Restore the example inputs for this fluid and clear measured data">Reset</button>'
      + '<button type="button" class="ui-btn ui-btn-ghost pv-explain-btn" id="pv-explain-btn" aria-expanded="' + S.explain + '">' + ICON.info + '<span>Explain This Stage</span></button></div></div>'
      + '</div>'
      + '<div class="pv-work"><div class="pv-main" id="pv-main"></div>'
      + '<aside class="pv-explain' + (S.explain ? ' is-open' : '') + '" id="pv-explain" role="dialog" aria-modal="false" aria-labelledby="pv-ex-title"><div class="pv-ex-in">'
      + '<div class="pv-ex-head"><div><div class="pv-ex-tag" id="pv-ex-tag"></div><div class="pv-ex-title" id="pv-ex-title"></div></div>'
      + '<button type="button" class="pv-ex-close" id="pv-ex-close" aria-label="Close explanation" title="Close (Esc)">&#10005;</button></div>'
      + '<div class="pv-ex-body" id="pv-ex-body"></div></div></aside></div>'
      + '</div>';
  }

  /* -------------------------------------------------------------- fields */
  function val(k) { var v = F()[k]; return v === undefined || v === null ? '' : v; }
  function field(k, label, unit, o) {
    o = o || {};
    return '<label class="pv-f' + (o.wide ? ' is-wide' : '') + '" data-f="' + k + '"><span class="pv-l">' + label + (o.tag ? ' <i class="pv-kind is-' + o.tag + '">' + o.tag + '</i>' : '') + '</span>'
      + '<span class="pv-in"><input data-k="' + k + '" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(val(k)) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + ' aria-describedby="pv-err-' + k + '">'
      + (unit ? '<span class="pv-u">' + unit + '</span>' : '') + '</span>'
      + '<span class="pv-err" id="pv-err-' + k + '" data-err="' + k + '"></span>'
      + (o.hint ? '<span class="pv-hint">' + o.hint + '</span>' : '') + '</label>';
  }
  function seg(key, cur, items, scope) {
    return '<div class="pv-seg" role="group" data-seg="' + key + '"' + (scope ? ' data-scope="' + scope + '"' : '') + '>' + items.map(function (it) {
      return '<button type="button" data-v="' + it[0] + '" class="' + (String(cur) === String(it[0]) ? 'is-on' : '') + '" aria-pressed="' + (String(cur) === String(it[0])) + '">' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function select(mkey, group, label, filter) {
    var cur = F().m[mkey];
    return '<label class="pv-f is-wide" data-f="' + mkey + 'Method"><span class="pv-l">' + label + '</span><span class="pv-in"><select data-m="' + mkey + '">'
      + Object.keys(group).filter(function (k) { return !filter || filter(k); }).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(group[k].label) + '</option>'; }).join('')
      + '</select></span><span class="pv-err" data-err="' + mkey + 'Method"></span></label>';
  }
  function card(title, body, cls) { return '<section class="pv-card' + (cls ? ' ' + cls : '') + '"><h3>' + title + '</h3>' + body + '</section>'; }

  function pressureCard() {
    var f = F(), pu = U.unit('p', S.units, S.gauge), tu = U.unit('T', S.units), dpu = U.unit('dp', S.units);
    var body = '<div class="pv-row">' + seg('calcMode', f.calcMode, [['single', 'Single pressure'], ['range', 'Pressure range'], ['list', 'Pressure list']]) + '</div>';
    if (f.calcMode === 'single') body += '<div class="pv-grid2">' + field('p', 'Pressure, p', pu) + field('T', 'Temperature, T', tu) + '</div>';
    else if (f.calcMode === 'range') body += '<div class="pv-grid4">' + field('pMin', 'Minimum p', pu) + field('pMax', 'Maximum p', pu) + field('pStep', 'Increment', dpu) + field('T', 'Temperature, T', tu) + '</div>'
      + '<p class="pv-note">Up to ' + E.MAX_POINTS + ' points. The maximum is always included' + (S.fluid === 'oil' ? '; pb is inserted when it lies inside the range.' : '.') + '</p>';
    else body += '<div class="pv-grid2">' + '<label class="pv-f is-wide" data-f="pList"><span class="pv-l">Pressures <em>' + pu + '</em></span><textarea data-k="pList" rows="3" spellcheck="false" aria-describedby="pv-err-pList">' + esc(val('pList')) + '</textarea><span class="pv-err" id="pv-err-pList" data-err="pList"></span><span class="pv-hint">Separate with commas, spaces or new lines. Values are sorted ascending; duplicates removed.</span></label>' + field('T', 'Temperature, T', tu) + '</div>';
    return card('Calculation', body);
  }

  function unitsCard() {
    var body = '<div class="pv-unitrow"><div class="pv-f"><span class="pv-l">Unit system</span>' + seg('units', S.units, [['field', 'Field'], ['metric', 'Metric']], 'global') + '</div>'
      + '<div class="pv-f"><span class="pv-l">Pressure convention</span>' + seg('gauge', S.gauge ? '1' : '0', [['0', S.units === 'metric' ? 'Absolute bar(a)' : 'Absolute psia'], ['1', S.units === 'metric' ? 'Gauge bar(g)' : 'Gauge psig']], 'global') + '</div></div>'
      + '<dl class="pv-dl"><dt>Standard conditions</dt><dd>' + U.STD.label + ' — basis of Rs, Bo, Bg and gas volumes (the correlations were developed on it).</dd>'
      + '<dt>Gauge pressure</dt><dd>p(abs) = p(gauge) + 1 atm (' + (S.units === 'metric' ? '1.01325 bar' : '14.696 psi') + '). Every pressure is converted to absolute before any correlation is evaluated.</dd>'
      + (S.units === 'metric' ? '<dt>Metric results</dt><dd>Unit conversions of the field-unit results (same 60 °F / 14.696 psia standard basis).</dd>' : '') + '</dl>';
    return card('Units & standard conditions', body);
  }

  function oilInputs() {
    var f = F(), rsU = U.unit('Rs', S.units), pu = U.unit('p', S.units, S.gauge), tu = U.unit('T', S.units);
    var desc = '<div class="pv-row">' + seg('oilGravityBasis', f.oilGravityBasis, [['api', 'API gravity'], ['density', 'Stock-tank oil density']]) + '</div>'
      + '<div class="pv-grid2">' + (f.oilGravityBasis === 'api' ? field('api', 'Oil gravity', '°API', { tag: 'input' }) : field('rhoSto', 'Stock-tank oil density (60 °F)', U.unit('density', S.units), { tag: 'input', hint: 'γo = ρo / ρw (ρw = 62.4 lbm/ft³), API = 141.5/γo − 131.5' }))
      + field('gg', 'Gas specific gravity, γg', 'air = 1', { tag: 'input' }) + '</div>'
      + '<label class="pv-check"><input type="checkbox" data-k="sepUse"' + (f.sepUse ? ' checked' : '') + '> Separator conditions known (Vasquez-Beggs γgs correction)</label>'
      + (f.sepUse ? '<div class="pv-grid2">' + field('psep', 'Separator pressure', pu) + field('tsep', 'Separator temperature', tu) + '</div>' : '<p class="pv-note">Without separator conditions Vasquez-Beggs uses γgs = γg.</p>');
    var charBody = '<div class="pv-row">' + seg('oilChar', f.oilChar, [['pb', 'Known bubble point, pb'], ['rsb', 'Known solution GOR, Rsb']]) + '</div>'
      + '<div class="pv-grid2">' + (f.oilChar === 'pb' ? field('pb', 'Bubble-point pressure, pb', pu, { tag: 'input' }) : field('rsb', 'Solution GOR at pb, Rsb', rsU, { tag: 'input' }))
      + '<div class="pv-derived" id="pv-derived"></div></div>'
      + '<p class="pv-note">The other quantity is derived once from the selected Rs/pb correlation — never from the current pressure. Below pb the oil is saturated; at and above pb Rs = Rsb.</p>';
    var meth = '<div class="pv-grid2">' + select('rs', M.rsFamily, 'Rs and pb (saturated)') + select('bo', M.bo, 'Bo for p ≤ pb')
      + select('co', M.co, 'co and Bo for p > pb') + select('muDead', M.muDead, 'Dead-oil viscosity') + '</div>'
      + '<dl class="pv-dl"><dt>Saturated μo</dt><dd>' + M.muSat.beggs_robinson.label + '</dd><dt>Undersaturated μo</dt><dd>' + M.muUnder.vasquez_beggs.label + '</dd></dl>';
    return '<div class="pv-cols">' + '<div class="pv-colc">' + pressureCard() + card('Oil and gas description', desc) + '</div>'
      + '<div class="pv-colc">' + card('Bubble-point characterisation', charBody) + unitsCard() + '</div>'
      + '<div class="pv-colc">' + card('Correlations', meth) + '</div></div>';
  }

  function compTable() {
    var f = F();
    var rows = f.comp.map(function (r, i) {
      return '<tr><td class="pv-num">' + (i + 1) + '</td>'
        + '<td><input data-c="' + i + '" data-cf="name" value="' + esc(r.name) + '" aria-label="Component ' + (i + 1) + '"></td>'
        + '<td><input data-c="' + i + '" data-cf="formula" value="' + esc(r.formula) + '" aria-label="Formula ' + (i + 1) + '"></td>'
        + '<td><input data-c="' + i + '" data-cf="y" inputmode="decimal" value="' + esc(r.y) + '" aria-label="Mole ' + (f.compBasis === 'percent' ? 'percent' : 'fraction') + ' ' + (i + 1) + '"></td>'
        + '<td class="pv-num" data-cmw="' + i + '"></td><td class="pv-num" data-ctc="' + i + '"></td><td class="pv-num" data-cpc="' + i + '"></td></tr>';
    }).join('');
    return '<div class="pv-row">' + seg('compBasis', f.compBasis, [['fraction', 'Mole fractions (Σ = 1)'], ['percent', 'Mole percent (Σ = 100)']])
      + '<label class="pv-check"><input type="checkbox" data-k="normalize"' + (f.normalize ? ' checked' : '') + '> Normalise to Σ = 1 when the total is off</label></div>'
      + '<div class="pv-comp-wrap"><table class="pv-tbl pv-comp"><thead><tr><th>#</th><th>Component</th><th>Formula</th><th>y<sub>i</sub> (' + (f.compBasis === 'percent' ? 'mol %' : 'fraction') + ')</th><th>M<sub>i</sub> lb/lbmol</th><th>T<sub>ci</sub> °R</th><th>P<sub>ci</sub> psia</th></tr></thead><tbody>' + rows + '</tbody>'
      + '<tfoot><tr><td></td><td colspan="2">Total entered</td><td class="pv-num" id="pv-comp-sum"></td><td colspan="3" id="pv-comp-mix"></td></tr></tfoot></table></div>'
      + '<div class="pv-err pv-err-block" data-err="comp"></div>'
      + '<details class="pv-paste"><summary>Paste composition (Component, Formula, y per line)</summary><textarea id="pv-comp-paste" rows="4" spellcheck="false" placeholder="Methane&#9;CH4&#9;0.87"></textarea>'
      + '<button type="button" class="ui-btn ui-btn-ghost" id="pv-comp-apply">Apply pasted composition</button></details>'
      + '<p class="pv-note">Mi, Tci and Pci come from the project component table (data/pure-components.js). A component that is not found is reported, never ignored.</p>';
  }

  function gasInputs() {
    var f = F(), pctU = f.sourBasis === 'percent' ? 'mol %' : 'fraction';
    var desc = '<div class="pv-row">' + seg('gasBasis', f.gasBasis, [['gravity', 'Gas gravity'], ['composition', 'Composition']]) + '</div>'
      + (f.gasBasis === 'gravity' ? '<div class="pv-grid2">' + field('gg', 'Gas specific gravity, γg', 'air = 1', { tag: 'input', hint: 'Ma = 28.96·γg' }) + '</div>' : compTable());
    var model = '<div class="pv-row">' + seg('behavior', f.behavior, [['real', 'Real gas'], ['ideal', 'Ideal gas (Z = 1)']]) + '</div>'
      + '<div class="pv-grid2">' + select('pc', M.pc, 'Pseudo-critical properties', function (k) { return f.gasBasis === 'composition' || k !== 'kay'; })
      + select('sour', M.sour, 'Sour-gas correction (pseudo-criticals)') + '</div>';
    if (f.m.sour !== 'none' && f.gasBasis === 'gravity') {
      model += '<div class="pv-row">' + seg('sourBasis', f.sourBasis, [['fraction', 'Mole fraction'], ['percent', 'Mole %']]) + '</div><div class="pv-grid3">'
        + field('yCO2', 'yCO2', pctU) + field('yH2S', 'yH2S', pctU) + (f.m.sour === 'carr_kobayashi_burrows' ? field('yN2', 'yN2', pctU) : '') + '</div>';
    } else if (f.m.sour !== 'none') model += '<p class="pv-note">yCO2, yH2S and yN2 are taken from the composition.</p>';
    if (f.behavior === 'real') {
      model += '<div class="pv-grid2">' + select('z', M.z, 'Z-factor method') + select('mu', M.muGas, 'Gas viscosity') + '</div>';
      if (f.m.z === 'manual') model += manualZBlock();
    } else model += '<div class="pv-grid2">' + select('mu', M.muGas, 'Gas viscosity') + '<p class="pv-note">Ideal gas: Z = 1 everywhere, so Bg, ρg, μg and cg = 1/p all follow the ideal model.</p></div>';
    model += '<p class="pv-note">Roles are kept separate: pseudo-critical method → (optional) sour correction → Z correlation. A manual chart value is a reading, not a correlation.</p>';
    return '<div class="pv-cols">' + '<div class="pv-colc">' + pressureCard() + unitsCard() + '</div>'
      + '<div class="pv-colc pv-col2">' + card('Gas description', desc) + card('Gas model', model) + '</div></div>';
  }

  function manualZBlock() {
    return '<div class="pv-manual"><div class="pv-manual-read" id="pv-zread">Ppr / Tpr appear here once pressure, temperature and gas description are valid.</div>'
      + '<div class="pv-grid2">' + field('zManual', 'Z read from chart', '–', { tag: 'input', hint: 'Single-pressure mode only' })
      + '<label class="pv-f"><span class="pv-l">Standing-Katz chart image (optional)</span><input type="file" accept="image/*" id="pv-zimg"></label></div>'
      + '<p class="pv-note">One chart reading is Z at one pressure. It does not define Z(p) or dZ/dp, so no curve and no cg are produced from it.</p>'
      + (S.zImg ? '<img class="pv-zimg" src="' + S.zImg + '" alt="Standing-Katz chart supplied by the user">' : '') + '</div>';
  }

  function inputsView() {
    var ex = S.example[S.fluid] ? '<div class="pv-banner is-info">' + ICON.info + '<span>Example values are loaded in the fields below — replace them with your fluid data. Nothing is filled in behind the scenes: an empty field is reported as “Input required”.</span></div>' : '';
    return '<div class="pv-view pv-inputs">' + '<div class="pv-errsum" id="pv-errsum" hidden></div>' + ex
      + (S.fluid === 'oil' ? oilInputs() : gasInputs())
      + '<div class="pv-actions"><button type="button" class="ui-btn ui-btn-ghost" id="pv-example">Load example values</button>'
      + '<button type="button" class="ui-btn ui-btn-sub" id="pv-clear">Clear inputs</button>'
      + '<button type="button" class="ui-btn ui-btn-primary pv-go" id="pv-go-charts">View charts →</button></div></div>';
  }

  /* --------------------------------------------------------------- charts */
  /* comparison colours: never the primary (fluid accent) colour; dash patterns differ too */
  var PALETTE_OIL = ['--blue', '--grn', '--red', '--teal', '--accb4'];
  var PALETTE_GAS = ['--grn', '--red', '--acca', '--teal', '--amb'];
  var DASHES = ['8 5', '2 4', '12 4 2 4', '4 3', '1 3'];
  function cssVar(n, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(n); return (v && v.trim()) || fb; }
  function primaryColor() { return S.fluid === 'oil' ? cssVar('--amb', '#b9831f') : cssVar('--blue', '#2f6fd0'); }

  function chartProps() { return Object.keys(E.PROPS[S.fluid]).filter(function (k) { return !E.PROPS[S.fluid][k].table; }); }
  function propUnitText(k) { var qk = E.PROPS[S.fluid][k].q; return qk === 'none' ? '–' : unitOf(qk); }

  function chartsView() {
    var props = chartProps(), cur = S.chartProp[S.fluid], grp = compareGroup(), curM = currentMethodKey();
    var cmp = Object.keys(grp.meta).filter(function (k) { return k !== curM; }).map(function (k) {
      return '<label class="pv-chip"><input type="checkbox" data-cmp="' + k + '"' + (S.compare[S.fluid][k] ? ' checked' : '') + '>' + esc(grp.meta[k].label) + '</label>';
    }).join('');
    return '<div class="pv-view pv-charts">'
      + '<div class="pv-chart-col">'
      + '<div class="pv-tools"><div class="pv-seg pv-props" role="tablist" aria-label="Property">' + props.map(function (k) {
        var p = E.PROPS[S.fluid][k];
        return '<button type="button" data-prop="' + k + '" class="' + (k === cur ? 'is-on' : '') + '" aria-pressed="' + (k === cur) + '">' + p.sym + '</button>';
      }).join('') + '</div>'
      + '<label class="pv-check"><input type="checkbox" id="pv-ylog"' + (S.yLog[S.fluid + cur] ? ' checked' : '') + '> Log y-axis</label>'
      + '<button type="button" class="ui-btn ui-btn-ghost" id="pv-png">Export PNG</button></div>'
      + '<div class="pv-cmp"><span class="pv-cmp-l">Compare ' + esc(grp.title) + ':</span>' + cmp + '</div>'
      + '<div class="pv-chart-card"><div class="pv-chart-head"><div class="pv-chart-title" id="pv-chart-title"></div><div class="pv-legend" id="pv-legend"></div></div>'
      + '<div class="pv-chart-host" id="pv-chart-host"></div><div class="pv-chart-msg" id="pv-chart-msg" hidden></div></div>'
      + '<div class="pv-gapnote" id="pv-gapnote" hidden></div>'
      + '</div>'
      + '<aside class="pv-point" id="pv-point"></aside>'
      + '</div>';
  }

  function seriesFor(r, k) {
    return r.pressures.map(function (p, i) { var v = r.props[k].values[i]; return [disp('p', p), v === null ? null : disp(E.PROPS[S.fluid][k].q, v)]; });
  }

  function renderChart() {
    var hostEl = q('#pv-chart-host'), msg = q('#pv-chart-msg');
    if (!hostEl) return;
    var k = S.chartProp[S.fluid], P = E.PROPS[S.fluid][k];
    if (!chart || !hostEl.firstChild) { if (chart) chart.destroy(); chart = PvtChart.create(hostEl, { onSelect: function (i) { S.sel[S.fluid] = i; renderPoint(); syncTableSel(); if (S.explain) renderExplain(); } }); }
    if (!res || !res.ok) {
      chart.render(null); msg.hidden = false;
      msg.innerHTML = '<b>No results.</b> ' + (res && res.errors.length ? 'Fix the highlighted inputs: ' + res.errors.map(function (e) { return esc(e.msg); }).join(' · ') : '') + ' <button type="button" class="ui-btn ui-btn-sub" data-goto="inputs">Go to Inputs</button>';
      q('#pv-chart-title').textContent = ''; q('#pv-legend').innerHTML = '';
      return;
    }
    msg.hidden = res.pressures.length > 1;
    if (res.pressures.length === 1) msg.innerHTML = 'Single-pressure mode: one point is shown. Choose <b>Pressure range</b> or <b>Pressure list</b> on the Inputs view to generate curves.';
    var mLabel = S.fluid === 'gas' && F().behavior === 'ideal' ? 'Ideal gas (Z = 1)' : methodLabelFor(k);
    var series = [{ id: 'calc', label: 'Calculated — ' + mLabel, kind: 'calc', pts: seriesFor(res, k), color: primaryColor(), primary: true }];
    cmpRes.forEach(function (c, i) {
      if (!c.res.ok) return;
      series.push({ id: c.method, label: 'Calculated — ' + c.label, kind: 'calc', pts: alignTo(res.pressures, c.res, k), color: cssVar((S.fluid === 'oil' ? PALETTE_OIL : PALETTE_GAS)[i % 5], '#1d8a5a'), dash: DASHES[i % DASHES.length] });
    });
    var mpts = measuredSeries(k);
    if (mpts) series.push({ id: 'meas', label: 'Measured (PVT data)', kind: 'meas', pts: mpts, color: cssVar('--txt', '#16202f') });
    var unitTxt = propUnitText(k);
    var title = P.label + ', ' + P.sym + ' vs pressure';
    q('#pv-chart-title').innerHTML = esc(title) + ' <span>T = ' + esc(fmtT(res.ctx.tF)) + (S.fluid === 'gas' ? ' · γg = ' + fmt(res.ctx.gg, 4) : ' · API = ' + fmt(res.ctx.api, 4)) + '</span>';
    q('#pv-legend').innerHTML = series.map(function (s) {
      return '<span class="pv-lg">' + (s.kind === 'meas' ? '<i class="pv-lg-sq" style="border-color:' + s.color + '"></i>' : '<svg width="26" height="8"><line x1="1" x2="25" y1="4" y2="4" stroke="' + s.color + '" stroke-width="' + (s.primary ? 3 : 2) + '"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + '/></svg>') + esc(s.label) + '</span>';
    }).join('') + (res.pb && S.fluid === 'oil' ? '<span class="pv-lg"><svg width="26" height="10"><line x1="13" x2="13" y1="0" y2="10" stroke="currentColor" stroke-dasharray="3 2" stroke-width="1.5"/></svg>Bubble point</span>' : '');
    chart.render({
      title: title, xLabel: pLabel(), xUnit: U.unit('p', S.units, S.gauge),
      yLabel: P.sym + ', ' + unitTxt, yLog: !!S.yLog[S.fluid + k], series: series,
      marker: S.fluid === 'oil' && res.pb ? { x: disp('p', res.pb), label: 'pb = ' + fmtP(disp('p', res.pb)) + ' ' + U.unit('p', S.units, S.gauge) } : null,
      selected: S.sel[S.fluid], reasons: res.props[k].reasons,
      fmtX: function (v) { return +v.toPrecision(6) + ''; }
    });
    var gaps = res.props[k].reasons.map(function (r, i) { return r ? { i: i, r: r } : null; }).filter(Boolean);
    var gn = q('#pv-gapnote');
    if (gaps.length) {
      var groups = {};
      gaps.forEach(function (g) { (groups[g.r] = groups[g.r] || []).push(fmtP(disp('p', res.pressures[g.i]))); });
      gn.hidden = false;
      gn.innerHTML = '<b>' + gaps.length + ' of ' + res.pressures.length + ' points have no valid ' + esc(P.sym) + ' (shown as gaps):</b><ul>' + Object.keys(groups).map(function (r) {
        var ps = groups[r]; return '<li>' + esc(r) + ' <span>p = ' + esc(ps.length > 6 ? ps.slice(0, 3).join(', ') + ' … ' + ps[ps.length - 1] : ps.join(', ')) + ' ' + esc(U.unit('p', S.units, S.gauge)) + '</span></li>';
      }).join('') + '</ul>';
    } else gn.hidden = true;
    renderPoint();
  }
  function alignTo(ps, r, k) {
    return ps.map(function (p) {
      var j = -1; for (var t = 0; t < r.pressures.length; t++) if (Math.abs(r.pressures[t] - p) <= 1e-9 * p) { j = t; break; }
      var v = j >= 0 ? r.props[k].values[j] : null;
      return [disp('p', p), v === null ? null : disp(E.PROPS[S.fluid][k].q, v)];
    }).concat(r.pressures.filter(function (p) { return !ps.some(function (x) { return Math.abs(x - p) <= 1e-9 * p; }); }).map(function (p) {
      var j = r.pressures.indexOf(p), v = r.props[k].values[j]; return [disp('p', p), v === null ? null : disp(E.PROPS[S.fluid][k].q, v), 'extra'];
    })).sort(function (a, b) { return a[0] - b[0]; }).filter(function (pt, idx, arr) { return true; });
  }
  function measuredSeries(k) {
    if (!meas || meas.parsed.errors.length) return null;
    var has = meas.parsed.columns.some(function (c) { return c.key === k; });
    if (!has) return null;
    return meas.parsed.rows.map(function (r) { var v = r.vals[k]; return [disp('p', r.p), v === null ? null : disp(E.PROPS[S.fluid][k].q, v)]; });
  }
  function methodLabelFor(k) {
    var m = F().m;
    if (S.fluid === 'oil') return { rs: M.rsFamily[m.rs].label, bo: M.bo[m.bo].label + ' / ' + M.co[m.co].label + ' above pb', mu: M.muDead[m.muDead].label + ' → Beggs-Robinson → Vasquez-Beggs', co: M.co[m.co].label }[k];
    return M.z[m.z].label;
  }

  /* selected-point detail */
  function renderPoint() {
    var box = q('#pv-point');
    if (!box) return;
    var i = S.sel[S.fluid], k = S.chartProp[S.fluid];
    if (!res || !res.ok) { box.innerHTML = ''; return; }
    if (i < 0 || i >= res.pressures.length) {
      box.innerHTML = '<div class="pv-point-empty"><b>Selected point</b><p>Click a point on the chart or a row in the Results Table to see its inputs, method, equation and substituted values. Arrow keys move along the curve when the chart has focus.</p></div>' + warnBlock(k);
      return;
    }
    var d = E.detail(res, i, k), P = E.PROPS[S.fluid];
    var vals = Object.keys(P).filter(function (x) { return !P[x].table || x === 'ppr'; }).map(function (x) {
      var v = res.props[x].values[i];
      return '<div class="pv-pv' + (x === k ? ' is-cur' : '') + '"><span>' + P[x].sym + '</span><b>' + (v === null ? '<i title="' + esc(res.props[x].reasons[i]) + '">n/a</i>' : fmtQ(P[x].q, v)) + '</b><em>' + esc(P[x].q === 'none' ? '' : unitOf(P[x].q)) + '</em></div>';
    }).join('');
    box.innerHTML = '<div class="pv-point-head"><span class="pv-eb">Selected point ' + (i + 1) + ' / ' + res.pressures.length + '</span>'
      + '<div class="pv-point-p">p = ' + fmtQ('p', res.pressures[i]) + ' <em>' + esc(U.unit('p', S.units, S.gauge)) + '</em></div>'
      + (res.phase ? '<span class="pv-phase is-' + res.phase[i].replace(' ', '-') + '">' + res.phase[i] + '</span>' : '') + '</div>'
      + '<div class="pv-pvals">' + vals + '</div>'
      + '<div class="pv-eqbox"><div class="pv-eb">' + esc(P[k].sym) + ' — method</div><div class="pv-eq-m">' + esc(d.method) + '</div>'
      + '<pre class="pv-eq">' + esc(d.eq) + '</pre><div class="pv-eb">Substituted values (field units)</div><ol class="pv-subs">' + d.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol>'
      + (d.unavailable ? '<div class="pv-banner is-warn">' + esc(d.unavailable) + '</div>' : '') + '</div>' + warnBlock(k);
  }
  var PROP_AFFECT = { rs: ['Rs', 'pb'], bo: ['Bo', 'Bo above pb'], mu: ['μo', 'μo above pb', 'μo below pb'], co: ['co'], z: ['Z and dependent properties', 'all gas properties'], bg: ['Z and dependent properties', 'all gas properties'], rho: ['Z and dependent properties', 'all gas properties'], cg: ['Z and dependent properties', 'all gas properties'] };
  function warnBlock(k) {
    if (!res || !res.warnings.length) return '';
    var aff = (PROP_AFFECT[k] || []).concat(S.fluid === 'gas' && k === 'mu' ? ['μg', 'all gas properties', 'Z and dependent properties'] : []);
    var ws = res.warnings.filter(function (w) { return w.affects.some(function (a) { return aff.indexOf(a) !== -1; }); });
    if (!ws.length) return '';
    return '<div class="pv-warns"><div class="pv-eb">Applicability warnings for ' + esc(E.PROPS[S.fluid][k].sym) + '</div><ul>' + ws.map(function (w) { return '<li>' + esc(w.msg) + '</li>'; }).join('') + '</ul></div>';
  }

  /* ---------------------------------------------------------- results table */
  function tableCols() {
    if (S.fluid === 'oil') return ['rs', 'bo', 'mu', 'co'];
    return ['ppr', 'z', 'bg', 'bgrb', 'eg', 'rho', 'v', 'mu', 'cg'];
  }
  function tableView() {
    return '<div class="pv-view pv-table">'
      + '<div class="pv-scalars" id="pv-scalars"></div>'
      + '<div class="pv-tools"><div class="pv-tbl-title" id="pv-tbl-title"></div><button type="button" class="ui-btn ui-btn-ghost" id="pv-csv">Export CSV</button></div>'
      + '<div class="pv-tbl-wrap" id="pv-tbl-wrap"></div>'
      + '<div class="pv-warnlist" id="pv-warnlist"></div></div>';
  }
  var KIND_TXT = { input: 'Input', correlation: 'Correlation', derived: 'Derived', assumed: 'Assumed' };
  function renderTable() {
    var sc = q('#pv-scalars'), tw = q('#pv-tbl-wrap'), wl = q('#pv-warnlist');
    if (!sc) return;
    if (!res || !res.ok) {
      sc.innerHTML = ''; wl.innerHTML = '';
      q('#pv-tbl-title').textContent = '';
      tw.innerHTML = '<div class="pv-empty"><b>No results.</b> ' + (res ? res.errors.map(function (e) { return esc(e.msg); }).join(' · ') : '') + ' <button type="button" class="ui-btn ui-btn-sub" data-goto="inputs">Go to Inputs</button></div>';
      return;
    }
    sc.innerHTML = res.scalars.map(function (s) {
      var u = s.unitText !== undefined ? s.unitText : unitOf(s.q);
      return '<div class="pv-sc"><span class="pv-sc-l">' + esc(s.label) + '</span><span class="pv-sc-v">' + fmtQ(s.q, s.v) + ' <em>' + esc(u) + '</em></span>'
        + '<span class="pv-sc-m"><i class="pv-kind is-' + s.kind + '">' + KIND_TXT[s.kind] + '</i>' + esc(s.method) + '</span></div>';
    }).join('');
    var cols = tableCols(), P = E.PROPS[S.fluid], sel = S.sel[S.fluid];
    q('#pv-tbl-title').innerHTML = '<b>' + res.pressures.length + ' point' + (res.pressures.length > 1 ? 's' : '') + '</b> · T = ' + esc(fmtT(res.ctx.tF)) + ' · ' + res.methods.map(function (m) { return esc(m[0]) + ': ' + esc(m[1]); }).join(' · ');
    var head = '<tr><th>#</th><th>p <em>' + esc(U.unit('p', S.units, S.gauge)) + '</em></th>' + (S.fluid === 'oil' ? '<th class="pv-txt">State</th>' : '')
      + cols.map(function (k) { var u = P[k].q === 'none' ? '–' : unitOf(P[k].q); return '<th>' + P[k].sym + ' <em>' + esc(u) + '</em></th>'; }).join('') + '</tr>';
    var notes = [], noteIdx = {};
    var body = res.pressures.map(function (p, i) {
      return '<tr data-row="' + i + '" class="' + (i === sel ? 'is-sel' : '') + (res.inserted === i ? ' is-pb' : '') + '" tabindex="0"><td class="pv-num">' + (i + 1) + '</td><td class="pv-num">' + fmtQ('p', p) + (res.inserted === i ? ' <i class="pv-kind is-derived">pb</i>' : '') + '</td>'
        + (S.fluid === 'oil' ? '<td class="pv-txt">' + res.phase[i] + '</td>' : '')
        + cols.map(function (k) {
          var v = res.props[k].values[i];
          if (v !== null) return '<td class="pv-num">' + fmtQ(P[k].q, v) + '</td>';
          var r = res.props[k].reasons[i]; if (noteIdx[r] === undefined) { noteIdx[r] = notes.length + 1; notes.push(r); }
          return '<td class="pv-num pv-na" title="' + esc(r) + '">— <sup>' + noteIdx[r] + '</sup></td>';
        }).join('') + '</tr>';
    }).join('');
    tw.innerHTML = '<table class="pv-tbl pv-res"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>'
      + (notes.length ? '<ol class="pv-notes">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ol>' : '');
    wl.innerHTML = (res.warnings.length ? '<div class="pv-warns"><div class="pv-eb">Applicability warnings (values kept, outside the published data range)</div><ul>' + res.warnings.map(function (w) { return '<li>' + esc(w.msg) + ' <span>Affects: ' + esc(w.affects.join(', ')) + '</span></li>'; }).join('') + '</ul></div>' : '')
      + (res.info.length ? '<div class="pv-banner is-info">' + res.info.map(esc).join('<br>') + '</div>' : '');
    var selRow = tw.querySelector('tr.is-sel'); if (selRow && selRow.scrollIntoView) selRow.scrollIntoView({ block: 'nearest' });
  }
  function syncTableSel() {
    qa('.pv-res tr[data-row]').forEach(function (tr) { tr.classList.toggle('is-sel', +tr.getAttribute('data-row') === S.sel[S.fluid]); });
  }

  /* ---------------------------------------------------------- measured view */
  function measuredView() {
    var cols = MD.headerText(S.fluid, S.units, S.gauge);
    return '<div class="pv-view pv-measured">'
      + '<div class="pv-cols"><div class="pv-colc pv-col2">' + card('Measured PVT data versus pressure',
        '<p class="pv-note">Paste or import measured data for this fluid. The first line is the header; columns can be in any order, only <b>p</b> is required. Units follow the current unit system and pressure convention. An empty cell or “-” is a missing value.</p>'
        + '<div class="pv-template"><span>Template</span><code>' + esc(cols.join('\t')) + '</code><button type="button" class="ui-btn ui-btn-sub" id="pv-tpl-copy">Insert header</button></div>'
        + '<textarea id="pv-meas-text" rows="8" spellcheck="false" class="pv-meas-text" aria-describedby="pv-meas-errs">' + esc(S.measured[S.fluid].text) + '</textarea>'
        + '<div class="pv-actions"><label class="ui-btn ui-btn-ghost pv-file">Import CSV / TXT<input type="file" id="pv-meas-file" accept=".csv,.txt,.tsv,text/csv,text/plain"></label>'
        + '<button type="button" class="ui-btn ui-btn-primary pv-go" id="pv-meas-apply">Apply measured data</button><button type="button" class="ui-btn ui-btn-sub" id="pv-meas-clear">Clear</button></div>'
        + '<div id="pv-meas-errs"></div>') + '</div>'
        + '<div class="pv-colc">' + card('Error comparison', '<div id="pv-meas-stats"><p class="pv-note">Apply measured data to compare it with the calculated values.</p></div>'
        + '<dl class="pv-dl"><dt>Relative error</dt><dd>eᵢ = 100·(calculated − measured)/measured, evaluated at the measured pressure (the correlation is evaluated there; nothing is interpolated).</dd>'
        + '<dt>ARE / AARE</dt><dd>Mean of eᵢ / mean of |eᵢ| over the rows that have both a measured and a calculated value.</dd>'
        + '<dt>Excluded</dt><dd>Missing measured values, points where the correlation is unavailable, and measured values of 0 (relative error undefined) are counted and excluded — never replaced by zero.</dd></dl>') + '</div></div>'
        + '<div id="pv-meas-table"></div>'
      + (S.fluid === 'oil' ? card('Multi-sample batch evaluation (one row per oil sample)', '<p class="pv-note">Separate tool kept from the previous calculator: each row is a different oil at its own bubble point, used to rank correlations across a data set.</p><div id="pv-batch-host"></div>', 'pv-batch') : '')
      + '</div>';
  }
  function renderMeasured() {
    var errs = q('#pv-meas-errs'), st = q('#pv-meas-stats'), tb = q('#pv-meas-table');
    if (!errs) return;
    if (!meas) { errs.innerHTML = ''; tb.innerHTML = ''; st.innerHTML = '<p class="pv-note">Apply measured data to compare it with the calculated values.</p>'; return; }
    var pe = meas.parsed.errors;
    if (pe.length) {
      errs.innerHTML = '<div class="pv-banner is-err"><b>' + pe.length + ' problem' + (pe.length > 1 ? 's' : '') + ' in the measured data — nothing was overlaid:</b><ul>' + pe.map(function (e) { return '<li>' + esc(e.msg) + '</li>'; }).join('') + '</ul></div>';
      st.innerHTML = ''; tb.innerHTML = ''; return;
    }
    errs.innerHTML = '<div class="pv-banner is-ok">' + meas.parsed.rows.length + ' measured rows accepted (columns: ' + meas.parsed.columns.map(function (c) { return esc(c.title); }).join(', ') + '). Shown as square markers on the matching chart.</div>';
    if (!meas.calc || !meas.calc.ok) { st.innerHTML = '<p class="pv-note">Calculated values are unavailable until the inputs are valid.</p>'; tb.innerHTML = ''; return; }
    var P = E.PROPS[S.fluid], keys = meas.parsed.columns.map(function (c) { return c.key; }).filter(function (k) { return k !== 'p'; });
    var rowsS = [];
    keys.forEach(function (k) {
      var mv = meas.parsed.rows.map(function (r) { return r.vals[k]; });
      [{ label: methodLabelFor(k) + ' (selected)', r: meas.calc }].concat(meas.cmp.map(function (c) { return { label: c.label, r: c.res }; })).forEach(function (x) {
        if (!x.r.ok) return;
        var s = MD.stats(mv, x.r.props[k].values);
        rowsS.push('<tr><td>' + P[k].sym + '</td><td class="pv-txt pv-wrap">' + esc(x.label) + '</td><td class="pv-num">' + s.n + '</td><td class="pv-num">' + (s.are === null ? '—' : s.are.toFixed(2)) + '</td><td class="pv-num">' + (s.aare === null ? '—' : s.aare.toFixed(2)) + '</td><td class="pv-num">' + (s.maxAbs === null ? '—' : s.maxAbs.toFixed(2)) + '</td><td>' + [s.missing ? s.missing + ' missing' : '', s.unavailable ? s.unavailable + ' unavailable' : '', s.zero ? s.zero + ' zero measured' : ''].filter(Boolean).join(', ') + '</td></tr>');
      });
    });
    st.innerHTML = '<div class="pv-tbl-wrap pv-stats"><table class="pv-tbl"><thead><tr><th>Prop.</th><th class="pv-txt">Method</th><th>n</th><th>ARE %</th><th>AARE %</th><th>max |e| %</th><th class="pv-txt">Excluded</th></tr></thead><tbody>' + rowsS.join('') + '</tbody></table></div>';
    var head = '<tr><th>p <em>' + esc(U.unit('p', S.units, S.gauge)) + '</em></th>' + keys.map(function (k) { var u = P[k].q === 'none' ? '–' : unitOf(P[k].q); return '<th>' + P[k].sym + ' meas. <em>' + esc(u) + '</em></th><th>' + P[k].sym + ' calc.</th><th>e %</th>'; }).join('') + '</tr>';
    var body = meas.parsed.rows.map(function (r, i) {
      return '<tr><td class="pv-num">' + fmtQ('p', r.p) + '</td>' + keys.map(function (k) {
        var m = r.vals[k], c = meas.calc.props[k].values[i], e = (m !== null && m !== 0 && c !== null) ? 100 * (c - m) / m : null;
        return '<td class="pv-num">' + (m === null ? '—' : fmtQ(P[k].q, m)) + '</td><td class="pv-num">' + (c === null ? '<span title="' + esc(meas.calc.props[k].reasons[i]) + '">n/a</span>' : fmtQ(P[k].q, c)) + '</td><td class="pv-num">' + (e === null ? '—' : e.toFixed(2)) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    tb.innerHTML = card('Measured versus calculated (selected methods)', '<div class="pv-tbl-wrap"><table class="pv-tbl"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>');
  }

  /* ----------------------------------------------------------- methods view */
  function rangeTxt(r) {
    if (!r) return '<i>No data range given in the references available here.</i>';
    var names = { p: 'p', pb: 'pb', T: 'T', api: 'API', gg: 'γg', rs: 'Rs', ppr: 'Ppr', tpr: 'Tpr', yCO2: 'yCO2', yH2S: 'yH2S' };
    var n = function (v) { return String(+(+v).toPrecision(4)); };
    return Object.keys(r).map(function (k) {
      var a = r[k][0], b = r[k][1], u = '';
      if (k === 'p' || k === 'pb') { a = U.pFromPsia(a, S.units, false); b = U.pFromPsia(b, S.units, false); u = ' ' + (S.units === 'metric' ? 'bar(a)' : 'psia'); }
      else if (k === 'T') { a = U.tFromF(a, S.units); b = U.tFromF(b, S.units); u = ' ' + U.unit('T', S.units); }
      else if (k === 'rs') { a = U.toDisplay('Rs', a, S.units); b = U.toDisplay('Rs', b, S.units); u = ' ' + U.unit('Rs', S.units); }
      return names[k] + ' ' + n(a) + '–' + n(b) + u;
    }).join(' · ');
  }
  function methodBlock(title, group, curKey, extraNote) {
    return '<section class="pv-card pv-mcard"><h3>' + title + '</h3>' + Object.keys(group).map(function (k) {
      var g = group[k];
      return '<div class="pv-meth' + (k === curKey ? ' is-cur' : '') + '"><div class="pv-meth-h"><b>' + esc(g.label) + '</b>' + (k === curKey ? '<i class="pv-kind is-input">selected</i>' : '') + '</div>'
        + '<pre class="pv-eq">' + esc(g.eq) + (g.eqPb ? '\n' + esc(g.eqPb) : '') + '</pre>'
        + (g.tUnit ? '<div class="pv-meth-r">Temperature in the equation: ' + esc(g.tUnit) + '</div>' : '')
        + (g.eq && k !== 'none' && k !== 'manual' ? '<div class="pv-meth-r">Published data range: ' + rangeTxt(g.range) + '</div>' : '')
        + (g.note ? '<div class="pv-meth-r">' + esc(g.note) + '</div>' : '')
        + (g.ref ? '<div class="pv-meth-ref">' + g.ref.map(function (r) { return esc(C.REF[r]); }).join('<br>') + '</div>' : '') + '</div>';
    }).join('') + (extraNote ? '<p class="pv-note">' + extraNote + '</p>' : '') + '</section>';
  }
  function methodsView() {
    var m = F().m, out = '<div class="pv-view pv-methods"><div class="pv-mgrid">';
    out += card('Basis, units and assumptions', '<dl class="pv-dl">'
      + '<dt>Standard conditions</dt><dd>' + U.STD.label + '. Bg = (psc/Tsc)·Z·T/p with psc = 14.696 psia, Tsc = 519.67 °R.</dd>'
      + '<dt>Evaluation units</dt><dd>Correlations are evaluated in the field units they were published in (psia, °F or °R as stated, scf/STB, rb/STB, cP). Metric values are converted for display: 1 bar = 14.5038 psi, 1 scf/STB = 0.17811 sm³/sm³, 1 lbm/ft³ = 16.0185 kg/m³, cP = mPa·s.</dd>'
      + '<dt>Gauge pressure</dt><dd>p(abs) = p(gauge) + 14.696 psi (1.01325 bar). Correlations always receive absolute pressure.</dd>'
      + (S.fluid === 'oil' ? '<dt>Oil workflow</dt><dd>One independent input — measured pb or measured Rsb — and the other from the selected Rs/pb correlation. p < pb: saturated, Rs(p) from the correlation, scaled so Rs(pb) = Rsb exactly (the factor is reported; it differs from 1 only through the rounding of the published inverse). p ≥ pb: fixed composition, Rs = Rsb, Bo = Bob·exp(−∫co dp) with the selected co correlation, μo from Vasquez-Beggs with μob at pb.</dd>'
        + '<dt>Assumptions with API, γg, T and pb (or Rsb) only</dt><dd>γg is taken as the total (or separator) gas gravity for all correlations except Vasquez-Beggs, which needs γgs at 100 psig: without separator conditions γgs = γg is assumed and reported. Water density for γo is 62.4 lbm/ft³. co below pb is not calculated. Material-balance Bo needs the measured reservoir oil density and is available in the batch evaluation only.</dd>'
        : '<dt>Gas workflow</dt><dd>γg (or composition) → pseudo-critical properties → optional sour-gas correction → Ppr, Tpr → Z → Bg, ρg = pMa/(ZRT) with R = 10.7316, v = 1/ρg, Eg = 1/Bg, μg (Lee-Gonzalez-Eakin) and cg = 1/p − (1/Z)(dZ/dp) by central difference. Ideal gas sets Z = 1 for every dependent property.</dd>'
        + '<dt>Manual Z</dt><dd>A chart reading is one value at one pressure; it gives no curve and no cg.</dd>')
      + '<dt>Status of values</dt><dd>Invalid input blocks the calculation. A value outside an equation’s mathematical domain (e.g. Z ≤ 0) is shown as unavailable and as a gap on charts. A value outside a published data range is kept and listed as a warning with the affected properties.</dd></dl>');
    if (S.fluid === 'oil') {
      out += methodBlock('Rs and pb (saturated oil)', M.rsFamily, m.rs);
      out += methodBlock('Bo at p ≤ pb', M.bo, m.bo);
      out += methodBlock('Undersaturated co and Bo (p > pb)', M.co, m.co, 'Bo above pb is the integral of the same co, so the two are consistent and continuous at pb.');
      out += methodBlock('Dead-oil viscosity', M.muDead, m.muDead);
      out += methodBlock('Saturated and undersaturated viscosity', { sat: M.muSat.beggs_robinson, und: M.muUnder.vasquez_beggs }, '');
    } else {
      out += methodBlock('Pseudo-critical properties', M.pc, m.pc);
      out += methodBlock('Sour-gas corrections', M.sour, m.sour);
      out += methodBlock('Z factor', M.z, F().behavior === 'ideal' ? '' : m.z);
      out += methodBlock('Gas viscosity', M.muGas, m.mu);
    }
    out += '</div>' + card('References', '<ol class="pv-refs">' + Object.keys(C.REF).map(function (k) { return '<li>' + esc(C.REF[k]) + '</li>'; }).join('') + '</ol>') + '</div>';
    return out;
  }

  /* ---------------------------------------------------------- explain drawer */
  var INPUT_HELP = {
    oil: [['Calculation', 'Single pressure evaluates one point. Pressure range generates evenly spaced points (min, max, increment); a pasted list evaluates your own measurement pressures.'],
      ['Pressure convention', 'Absolute pressure (psia, bar(a)) is what the correlations use. Gauge pressure (psig, bar(g)) is converted by adding one standard atmosphere — it is never treated as absolute.'],
      ['Oil gravity', 'API gravity, or stock-tank oil density at 60 °F (converted to γo and API).'],
      ['γg', 'Gas specific gravity relative to air. Vasquez-Beggs expects the separator gas gravity corrected to 100 psig (γgs); enter separator conditions to apply that correction.'],
      ['Bubble-point characterisation', 'Give the measured bubble point OR the measured solution GOR at the bubble point. The other is derived from the selected correlation once, so pb controls the saturated / undersaturated split at every pressure.'],
      ['Correlations', 'Rs/pb family (saturated), Bo for p ≤ pb, co (which also gives Bo for p > pb) and the dead-oil viscosity that starts the viscosity chain.']],
    gas: [['Calculation', 'Single pressure, a pressure range or a pasted list of pressures at constant temperature.'],
      ['Gas description', 'Gas gravity (Ma = 28.96·γg) or a composition (Ma = Σyi·Mi). Compositions must total 1 (or 100 %) unless normalisation is ticked.'],
      ['Pseudo-criticals', 'Ppc and Tpc from γg (Standing, Sutton) or from the composition (Kay). They are not Z correlations.'],
      ['Sour-gas correction', 'Wichert-Aziz (CO2, H2S) or Carr-Kobayashi-Burrows (CO2, H2S, N2) adjusts Ppc and Tpc before Z is evaluated.'],
      ['Z factor', 'Dranchuk-Abou-Kassem (iterative fit of the Standing-Katz chart), Papay and Beggs-Brill (explicit approximations), or a manual chart reading at one pressure.'],
      ['Ideal / real', 'Ideal gas fixes Z = 1 for every dependent property; real gas uses the selected Z method throughout.']]
  };
  var PROP_HELP = {
    rs: 'Rs is the gas dissolved per stock-tank barrel. It increases with pressure while gas can still dissolve (saturated oil) and stays at Rsb above the bubble point because the oil has no more gas to take up — the kink at pb is the bubble point.',
    bo: 'Bo is reservoir volume per stock-tank volume. Below pb it grows with pressure because dissolved gas swells the oil; above pb no gas is added and the oil is only compressed, so Bo falls slowly. The maximum is at pb.',
    mu: 'Oil viscosity falls as pressure rises toward pb (more dissolved gas thins the oil) and rises above pb (the liquid is compressed with fixed composition). The minimum is at pb.',
    co: 'co is the isothermal compressibility of undersaturated oil, −(1/Bo)(∂Bo/∂p). It is shown only above pb; below pb free gas makes the apparent compressibility depend on gas liberation and is not calculated here.',
    z: 'Z measures the departure from ideal gas. At low pressure Z → 1; it dips below 1 where attraction dominates and rises above 1 at high pressure where molecular volume dominates.',
    bg: 'Bg is the reservoir volume occupied by one standard volume of gas. It falls roughly as 1/p, modified by Z.',
    rho: 'Gas density increases with pressure: ρg = p·Ma/(Z·R·T).',
    mu_gas: 'Gas viscosity rises with pressure because the gas becomes denser (Lee-Gonzalez-Eakin uses density directly).',
    cg: 'cg is the isothermal gas compressibility; for an ideal gas it is 1/p. Real-gas behaviour adds −(1/Z)(dZ/dp), so cg needs Z as a function of pressure.'
  };
  function renderExplain() {
    var body = q('#pv-ex-body'), tag = q('#pv-ex-tag'), ti = q('#pv-ex-title');
    if (!body) return;
    var v = S.view, html = '';
    tag.textContent = (S.fluid === 'oil' ? 'OIL' : 'GAS') + ' · ' + (VIEWS.filter(function (x) { return x[0] === v; })[0] || ['', ''])[1].toUpperCase();
    if (v === 'inputs') {
      ti.textContent = 'What each input means';
      html = INPUT_HELP[S.fluid].map(function (x) { return '<div class="pv-ex-sec"><b>' + esc(x[0]) + '</b><p>' + esc(x[1]) + '</p></div>'; }).join('')
        + '<div class="pv-ex-sec"><b>Value tags</b><p><i class="pv-kind is-input">Input</i> entered/measured · <i class="pv-kind is-correlation">Correlation</i> estimated by a published correlation · <i class="pv-kind is-derived">Derived</i> calculated from other values · <i class="pv-kind is-assumed">Assumed</i> an assumption you can replace.</p></div>';
    } else if (v === 'charts') {
      var k = S.chartProp[S.fluid], P = E.PROPS[S.fluid][k];
      ti.textContent = 'Reading the ' + P.sym + ' chart';
      html = '<div class="pv-ex-sec"><b>' + esc(P.label) + '</b><p>' + esc(PROP_HELP[S.fluid === 'gas' && k === 'mu' ? 'mu_gas' : k] || '') + '</p></div>'
        + '<div class="pv-ex-sec"><b>On the chart</b><p>Solid line: calculated with the selected method. Dashed lines: other correlations for the same property (Compare). Open squares: measured data. Shaded bands: pressures with no valid value — the line is broken there, never joined or set to zero.' + (S.fluid === 'oil' ? ' The dashed vertical line marks pb.' : '') + '</p></div>';
      var i = S.sel[S.fluid];
      if (res && res.ok && i >= 0) {
        var d = E.detail(res, i, k);
        html += '<div class="pv-ex-sec"><b>Selected point — p = ' + fmtQ('p', res.pressures[i]) + ' ' + esc(U.unit('p', S.units, S.gauge)) + '</b><p>' + esc(d.method) + '</p><pre class="pv-eq">' + esc(d.eq) + '</pre><ol class="pv-subs">' + d.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol></div>';
      } else html += '<div class="pv-ex-sec"><b>Selected point</b><p>Click a point to see its equation with substituted values here.</p></div>';
    } else if (v === 'table') {
      ti.textContent = 'Results table';
      html = '<div class="pv-ex-sec"><b>Characterisation cards</b><p>Scalar values used by every point (API, pb, Rsb, Bob, pseudo-criticals …), each tagged as Input, Correlation, Derived or Assumed with the method that produced it.</p></div>'
        + '<div class="pv-ex-sec"><b>Table</b><p>One row per pressure, in the selected units. “—” with a number means no valid value; the numbered note under the table gives the reason. Click a row to select the same point on the chart.</p></div>'
        + '<div class="pv-ex-sec"><b>CSV export</b><p>Includes the inputs, selected methods, standard conditions, warnings and units in comment lines above the data.</p></div>';
    } else if (v === 'measured') {
      ti.textContent = 'Comparing with measured data';
      html = '<div class="pv-ex-sec"><b>Template</b><p>First line: column names from the template (p plus any property columns). Units follow the current unit system and pressure convention. Errors name the row and column.</p></div>'
        + '<div class="pv-ex-sec"><b>Errors</b><p>e = 100·(calc − meas)/meas at each measured pressure; AARE is the mean absolute value. Missing, unavailable and zero measured values are excluded and counted.</p></div>'
        + (S.fluid === 'oil' ? '<div class="pv-ex-sec"><b>Batch evaluation</b><p>Different tool: each row is a different oil at its own bubble point, to rank correlations across many samples.</p></div>' : '');
    } else {
      ti.textContent = 'Methods, limits and references';
      html = '<div class="pv-ex-sec"><b>Selected methods</b><p>' + (res && res.methods ? res.methods.map(function (m) { return esc(m[0]) + ': ' + esc(m[1]); }).join('<br>') : 'Enter valid inputs to see the active methods.') + '</p></div>'
        + '<div class="pv-ex-sec"><b>Published ranges</b><p>Each correlation was fitted to a data set. Outside its range the equation still returns a number, but its accuracy is unknown — the calculator keeps the value and warns, naming the affected properties.</p></div>'
        + '<div class="pv-ex-sec"><b>Sources</b><p>Equations follow the original publications as given in Ahmed (2019), McCain (1990) and Whitson & Brulé (2000). Full list at the bottom of this view.</p></div>';
    }
    body.innerHTML = html;
  }
  var exOpener = null;
  function setExplain(on) {
    var was = S.explain;
    S.explain = !!on;
    var ex = q('#pv-explain'), b = q('#pv-explain-btn');
    if (ex) ex.classList.toggle('is-open', S.explain);
    if (root) root.classList.toggle('ex-open', S.explain);
    if (b) { b.setAttribute('aria-expanded', S.explain); b.classList.toggle('is-on', S.explain); }
    if (S.explain) { renderExplain(); if (!was) { exOpener = document.activeElement; var c = q('#pv-ex-close'); if (c) c.focus({ preventScroll: true }); } }
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

  function renderStatus() {
    var st = q('#pv-status');
    if (!st || !res) return;
    if (!res.ok) {
      var n = res.errors.length;
      st.className = 'pv-status is-err';
      st.innerHTML = '<b>Invalid input</b> · ' + n + ' field' + (n > 1 ? 's' : '') + ' need' + (n > 1 ? '' : 's') + ' attention — results cleared';
      return;
    }
    var unav = 0, total = 0;
    /* co below pb is "not calculated" by design, not a failure: it is not counted here */
    Object.keys(res.props).forEach(function (k) { if (E.PROPS[S.fluid][k].table) return; res.props[k].values.forEach(function (v, i) { total++; if (v === null && !/^Not calculated below pb/.test(res.props[k].reasons[i] || '')) unav++; }); });
    var w = res.warnings.length;
    st.className = 'pv-status ' + (w || unav ? 'is-warn' : 'is-ok');
    st.innerHTML = '<b>Calculated</b> · ' + res.pressures.length + ' point' + (res.pressures.length > 1 ? 's' : '')
      + (unav ? ' · ' + unav + ' value' + (unav > 1 ? 's' : '') + ' unavailable' : '')
      + (w ? ' · ' + w + ' range warning' + (w > 1 ? 's' : '') : '') + (meas && !meas.parsed.errors.length ? ' · measured data loaded' : '');
  }

  function renderFieldErrors() {
    qa('.pv-f').forEach(function (f) { f.classList.remove('is-err'); });
    qa('[data-err]').forEach(function (e) { e.textContent = ''; });
    var sum = q('#pv-errsum');
    if (!res) return;
    res.errors.forEach(function (er) {
      var box = q('[data-err="' + er.field + '"]');
      if (box && er.field !== 'comp') { box.textContent = er.msg; var f = box.closest('.pv-f'); if (f) f.classList.add('is-err'); }
    });
    var compErrs = res.errors.filter(function (e) { return e.field === 'comp'; });
    var cb = q('[data-err="comp"]');
    if (cb) cb.innerHTML = compErrs.map(function (e) { return esc(e.msg); }).join('<br>');
    if (sum) {
      var orphan = res.errors.filter(function (e) { return e.field !== 'comp' && !q('[data-err="' + e.field + '"]'); });
      sum.hidden = !res.errors.length;
      sum.innerHTML = res.errors.length ? '<b>Results are not calculated until these are fixed:</b><ul>' + res.errors.map(function (e) { return '<li>' + esc(e.msg) + (orphan.indexOf(e) !== -1 ? '' : '') + '</li>'; }).join('') + '</ul>' : '';
    }
    /* derived characterisation readout (oil) */
    var dv = q('#pv-derived');
    if (dv) {
      if (res.ok) {
        var pbS = res.scalars.filter(function (s) { return s.key === 'pb'; })[0], rsS = res.scalars.filter(function (s) { return s.key === 'rsb'; })[0];
        var other = F().oilChar === 'pb' ? rsS : pbS;
        dv.innerHTML = '<span class="pv-l">' + esc(other.label) + ' <i class="pv-kind is-correlation">Correlation</i></span><span class="pv-dv">' + fmtQ(other.q, other.v) + ' <em>' + esc(unitOf(other.q)) + '</em></span><span class="pv-hint">' + esc(other.method) + '</span>';
      } else dv.innerHTML = '<span class="pv-l">Derived value</span><span class="pv-hint">Shown once the inputs are valid.</span>';
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
    /* manual Z reading helper: Ppr / Tpr at the entered pressure from a DAK-independent pc evaluation */
    var zr = q('#pv-zread');
    if (zr) {
      var h = E.run(engineInput({ m: Object.assign({}, F().m, { z: 'dak' }), calcMode: 'single' }));
      zr.innerHTML = h.ok && h.pc ? 'At p = ' + fmtQ('p', h.pressures[0]) + ' ' + esc(U.unit('p', S.units, S.gauge)) + ': <b>Ppr = ' + fmt(h.props.ppr.values[0], 4) + '</b>, <b>Tpr = ' + fmt(h.ctx.tR / h.pc.tpc, 4) + '</b> — read Z on the Standing-Katz chart at these values.'
        : 'Ppr / Tpr appear here once pressure, temperature and gas description are valid.';
    }
  }

  /* ================================================================ events */
  function bindShell() {
    qa('.pv-fluid button').forEach(function (b) { b.addEventListener('click', function () { switchFluid(b.getAttribute('data-fluid')); }); });
    qa('.pv-tab').forEach(function (b) { b.addEventListener('click', function () { S.view = b.getAttribute('data-view'); renderView(); }); });
    q('#pv-explain-btn').addEventListener('click', function () { setExplain(!S.explain); });
    q('#pv-ex-close').addEventListener('click', function () { setExplain(false); });
    q('#pv-reset').addEventListener('click', resetAll);
    root.addEventListener('click', function (e) { var g = e.target.closest('[data-goto]'); if (g) { S.view = g.getAttribute('data-goto'); renderView(); } });
  }
  function onKey(e) { if (e.key === 'Escape' && S.explain && host && host.isConnected) setExplain(false); }

  function bindView() {
    var f = F();
    qa('[data-k]').forEach(function (inp) {
      var k = inp.getAttribute('data-k');
      var ev = inp.type === 'checkbox' ? 'change' : 'input';
      inp.addEventListener(ev, function () {
        f[k] = inp.type === 'checkbox' ? inp.checked : inp.value;
        S.example[S.fluid] = false;
        if (inp.type === 'checkbox' && (k === 'sepUse' || k === 'normalize')) { recompute(); if (k === 'sepUse') renderView(); else refresh(); return; }
        markStale(); schedule();
      });
    });
    qa('[data-m]').forEach(function (sel) {
      sel.addEventListener('change', function () { f.m[sel.getAttribute('data-m')] = sel.value; S.compare[S.fluid] = {}; recompute(); renderView(); });
    });
    qa('[data-seg]').forEach(function (g) {
      var key = g.getAttribute('data-seg');
      g.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () { setSeg(key, b.getAttribute('data-v')); });
      });
    });
    qa('[data-c]').forEach(function (inp) {
      inp.addEventListener('input', function () { f.comp[+inp.getAttribute('data-c')][inp.getAttribute('data-cf')] = inp.value; S.example.gas = false; markStale(); schedule(); });
    });
    var on = function (id, ev, fn) { var el = q(id); if (el) el.addEventListener(ev, fn); };
    on('#pv-example', 'click', function () { loadExample(); });
    on('#pv-clear', 'click', clearInputs);
    on('#pv-go-charts', 'click', function () { S.view = 'charts'; renderView(); });
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
      var pick = function (tr) { S.sel[S.fluid] = +tr.getAttribute('data-row'); syncTableSel(); if (S.explain) renderExplain(); };
      tw.addEventListener('click', function (e) { var tr = e.target.closest('tr[data-row]'); if (tr) pick(tr); });
      tw.addEventListener('keydown', function (e) { var tr = e.target.closest('tr[data-row]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(tr); } });
    }
    /* measured */
    on('#pv-meas-apply', 'click', function () { S.measured[S.fluid].text = q('#pv-meas-text').value; recompute(); refresh(); });
    on('#pv-meas-clear', 'click', function () { S.measured[S.fluid].text = ''; q('#pv-meas-text').value = ''; recompute(); refresh(); });
    on('#pv-tpl-copy', 'click', function () { var t = q('#pv-meas-text'); var h = MD.headerText(S.fluid, S.units, S.gauge).join('\t'); t.value = h + (t.value.trim() ? '\n' + t.value.replace(/^[^\n]*[a-zA-Z][^\n]*\n?/, '') : '\n'); t.focus(); });
    on('#pv-meas-file', 'change', function (e) {
      var file = e.target.files && e.target.files[0]; if (!file) return;
      var rd = new FileReader();
      rd.onload = function () { q('#pv-meas-text').value = String(rd.result); S.measured[S.fluid].text = String(rd.result); recompute(); refresh(); };
      rd.readAsText(file);
    });
  }

  /* inputs changed: until the debounced recalculation lands, results are marked stale */
  function markStale() {
    var st = q('#pv-status');
    if (st) { st.className = 'pv-status is-stale'; st.innerHTML = '<b>Updating…</b> inputs changed'; }
  }

  function setSeg(key, v) {
    var f = F();
    if (key === 'units') { convertUnits(v, S.gauge); }
    else if (key === 'gauge') { convertUnits(S.units, v === '1'); }
    else if (key === 'compBasis' || key === 'sourBasis') f[key] = v;
    else f[key] = v;
    if (key === 'gasBasis' && v === 'gravity' && f.m.pc === 'kay') f.m.pc = 'standing_natural';
    if (key === 'calcMode' && f.m && f.m.z === 'manual' && v !== 'single') { /* kept: validation explains why */ }
    S.example[S.fluid] = false;
    recompute(); renderView();
  }

  /* switching unit system or pressure convention converts the values already typed */
  var P_KEYS = ['p', 'pMin', 'pMax', 'pb', 'psep'];
  function convertUnits(units, gauge) {
    ['oil', 'gas'].forEach(function (fl) {
      var f = S[fl];
      var cv = function (k, fn) { var r = E.parse(f[k]); if (r.state === 'ok') f[k] = String(+fn(r.v).toPrecision(7)); };
      P_KEYS.forEach(function (k) { cv(k, function (v) { return U.pFromPsia(U.pToPsia(v, S.units, S.gauge), units, gauge); }); });
      cv('pStep', function (v) { return units === S.units ? v : (units === 'metric' ? v / U.PSI_PER_BAR : v * U.PSI_PER_BAR); });
      if (f.pList) f.pList = String(f.pList).split(/[\s,;]+/).filter(Boolean).map(function (t) { var r = E.parse(t); return r.state === 'ok' ? String(+U.pFromPsia(U.pToPsia(r.v, S.units, S.gauge), units, gauge).toPrecision(7)) : t; }).join(', ');
      if (units !== S.units) {
        ['T', 'tsep'].forEach(function (k) { cv(k, function (v) { return U.tFromF(U.tToF(v, S.units), units); }); });
        cv('rhoSto', function (v) { return units === 'metric' ? v * U.KGM3_PER_LBFT3 : v / U.KGM3_PER_LBFT3; });
        cv('rsb', function (v) { return units === 'metric' ? v * U.SM3SM3_PER_SCFSTB : v / U.SM3SM3_PER_SCFSTB; });
      }
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
    S[S.fluid] = Object.assign(fluidDefaults(S.fluid, S.units), keep);
    if (S.gauge) convertGaugeFresh();
    S.example[S.fluid] = true;
    recompute(); renderView();
  }
  function convertGaugeFresh() {
    var f = F();
    P_KEYS.forEach(function (k) { var r = E.parse(f[k]); if (r.state === 'ok') f[k] = String(+U.pFromPsia(U.pToPsia(r.v, S.units, false), S.units, true).toPrecision(7)); });
    if (f.pList) f.pList = String(f.pList).split(/[\s,;]+/).map(function (t) { return String(+U.pFromPsia(U.pToPsia(+t, S.units, false), S.units, true).toPrecision(7)); }).join(', ');
  }
  function clearInputs() {
    var f = F();
    ['p', 'pMin', 'pMax', 'pStep', 'pList', 'T', 'api', 'rhoSto', 'gg', 'pb', 'rsb', 'psep', 'tsep', 'yCO2', 'yH2S', 'yN2', 'zManual'].forEach(function (k) { if (k in f) f[k] = ''; });
    if (f.comp) f.comp = blankComp();
    S.example[S.fluid] = false;
    S.sel[S.fluid] = -1;
    recompute(); renderView();
  }
  function resetAll() {
    S[S.fluid] = fluidDefaults(S.fluid, S.units);
    if (S.gauge) convertGaugeFresh();
    S.example[S.fluid] = true;
    S.measured[S.fluid] = { text: '' };
    S.compare[S.fluid] = {}; S.sel[S.fluid] = -1;
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
  function contextLines() {
    var f = F(), L = [];
    L.push('PVT Nexus — PVT Calculator export (' + (S.fluid === 'oil' ? 'oil' : 'gas') + ')');
    L.push('Units: ' + (S.units === 'metric' ? 'Metric' : 'Field') + '; pressures ' + U.unit('p', S.units, S.gauge) + (S.gauge ? ' (absolute = gauge + 1 atm)' : ''));
    L.push('Standard conditions: ' + U.STD.label);
    if (res && res.ok) {
      L.push('Temperature: ' + fmtT(res.ctx.tF));
      res.scalars.forEach(function (s) { var u = s.unitText !== undefined ? s.unitText : unitOf(s.q); L.push(s.label + ': ' + String(fmtQ(s.q, s.v)).replace(/&amp;/g, '&') + ' ' + u + ' [' + KIND_TXT[s.kind] + '; ' + s.method + ']'); });
      L.push('Methods: ' + res.methods.map(function (m) { return m[0] + ' = ' + m[1]; }).join('; '));
      res.warnings.forEach(function (w) { L.push('Warning: ' + w.msg); });
    }
    return L;
  }
  function csvCell(v) { var s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function exportCsv() {
    if (!res || !res.ok) return;
    var cols = tableCols(), P = E.PROPS[S.fluid];
    var lines = contextLines().map(function (l) { return '# ' + l; });
    lines.push(['p (' + U.unit('p', S.units, S.gauge) + ')'].concat(S.fluid === 'oil' ? ['state'] : []).concat(cols.map(function (k) { return P[k].sym + ' (' + (P[k].q === 'none' ? '-' : unitOf(P[k].q)) + ')'; })).concat(['notes']).map(csvCell).join(','));
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
    var lines = contextLines().slice(1, 3);
    lines.push('Methods: ' + res.methods.map(function (m) { return m[0] + ' = ' + m[1]; }).join('; '));
    lines.push('T = ' + fmtT(res.ctx.tF) + (S.fluid === 'oil' ? '; pb = ' + fmtQ('p', res.pb) + ' ' + U.unit('p', S.units, S.gauge) + '; Rsb = ' + fmtQ('Rs', res.rsb) + ' ' + unitOf('Rs') : '; γg = ' + fmt(res.ctx.gg, 4)));
    chart.exportPng('pvt-' + S.fluid + '-' + S.chartProp[S.fluid] + '.png', lines);
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
