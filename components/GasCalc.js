/* ============================================================================
   VAPS PVT Nexus — GasCalc
   Native Gas Properties Calculator (no iframe, no external page).

   Mounted by Main.js into the host <div> rendered by screens/showCalc.js:
       GasCalc.mount(el)   /   GasCalc.unmount()

   All correlations are carried over unchanged from the standalone
   "PVT calculator" build (app.js): Ma / gamma_g, pseudo-criticals
   (gas-gravity, Kay mixing, Brown 1948), Wichert-Aziz and
   Carr-Kobayashi-Burrows sour-gas corrections, Papay and Beggs-Brill Z,
   density, specific volume, cg, Bg, Eg, Lee-Gonzalez-Eakin viscosity.
   Component reference data comes from data/pure-components.js.
   Styling: the shared .oc-* block in theme.css, blue accent (.oc.is-gas).
   ========================================================================= */
(function (global) {
  'use strict';

  var host = null;
  var mounted = false;
  var MW_AIR = 28.96;
  var GAS_COMP_ROWS = 20;

  var state = { tab: 'calc' };

  function $(id) { return document.getElementById('gs-' + id); }

  function toNum(id) {
    var el = $(id);
    if (!el) return NaN;
    if (el.value === '' || el.value === null) return NaN;
    var v = Number(el.value);
    return Number.isFinite(v) ? v : NaN;
  }

  function round(value, digits) {
    if (digits === undefined) digits = 5;
    if (!Number.isFinite(value)) return '-';
    return Number(value).toFixed(digits);
  }

  function normalizeMoleFractionInput(v) {
    if (!Number.isFinite(v) || v < 0) return NaN;
    if (v > 1) return v / 100;
    return v;
  }

  function getTemperatureRankine() {
    var t = toNum('temperature');
    var unit = ($('temperatureUnit') && $('temperatureUnit').value) || 'F';
    if (!Number.isFinite(t)) return NaN;
    if (unit === 'R') return t;
    if (unit === 'F') return t + 459.67;
    if (unit === 'C') return (t + 273.15) * 9 / 5;
    if (unit === 'K') return t * 9 / 5;
    return t + 459.67;
  }

  function addResult(rows, property, value, unit, method) {
    rows.push({ property: property, value: value, unit: unit, method: method });
  }

  /* ------------------------------------------------- component reference */

  function normalizeFormula(formula) {
    if (!formula) return '';
    var subscriptMap = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
    return String(formula).split('').map(function (ch) { return subscriptMap[ch] || ch; })
      .join('').replace(/\s+/g, '').toUpperCase();
  }

  function normalizeName(name) {
    return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  var componentRef = null;

  function buildComponentReference() {
    var db = Array.isArray(global.PURE_COMPONENTS) ? global.PURE_COMPONENTS : [];
    var byName = new Map();
    var byFormula = new Map();
    db.forEach(function (r) {
      var n = normalizeName(r.compound);
      var f = normalizeFormula(r.formula);
      if (n) byName.set(n, r);
      if (f) byFormula.set(f, r);
    });
    return { byName: byName, byFormula: byFormula };
  }

  function resolveComponentRecord(component, formula) {
    if (!componentRef) componentRef = buildComponentReference();
    var byName = componentRef.byName.get(normalizeName(component));
    if (byName) return byName;
    var byFormula = componentRef.byFormula.get(normalizeFormula(formula));
    if (byFormula) return byFormula;
    return null;
  }

  /* ------------------------------------------------- gas property models */

  function mixtureMa(c) {
    var ma = 0;
    c.entries.forEach(function (e) { if (Number.isFinite(e.mw)) ma += e.yi * e.mw; });
    return { ma: ma, comp: c };
  }

  function compositionYiByFormula(comp, formula) {
    var ff = normalizeFormula(formula);
    var total = 0;
    comp.entries.forEach(function (e) {
      var eFormula = normalizeFormula(e.resolvedFormula || e.formula);
      if (eFormula === ff) total += e.yi;
    });
    return total;
  }

  function pseudoCriticalFromSg(gg) {
    return {
      ppc: 677 + 15 * gg - 37.5 * gg * gg,
      tpc: 168 + 325 * gg - 12.5 * gg * gg,
      source: 'Brown/Standing (from γg)'
    };
  }

  function pseudoCriticalFromBrown1948(gg, system) {
    if (system === 'wet') {
      // Brown et al. (1948) wet-gas system (Standing 1977 mathematical form)
      return {
        ppc: 706 - 51.7 * gg - 11.1 * gg * gg,
        tpc: 187 + 330 * gg - 71.5 * gg * gg,
        source: 'Brown et al. (1948), wet-gas system (from γg)'
      };
    }
    // Brown et al. (1948) natural-gas system (Standing 1977 mathematical form)
    return {
      ppc: 677 + 15 * gg - 37.5 * gg * gg,
      tpc: 168 + 325 * gg - 12.5 * gg * gg,
      source: 'Brown et al. (1948), natural-gas system (from γg)'
    };
  }

  function pseudoCriticalFromComposition(comp) {
    var ppc = 0;
    var tpc = 0;
    comp.entries.forEach(function (e) {
      if (Number.isFinite(e.pc) && Number.isFinite(e.tcR)) {
        ppc += e.yi * e.pc;
        tpc += e.yi * e.tcR;
      }
    });
    return { ppc: ppc, tpc: tpc, source: 'Kay mixing (from composition)' };
  }

  function wichertAziz(ppc, tpc, yCO2, yH2S) {
    var A = yCO2 + yH2S;
    var B = yH2S;
    var eps = 120 * (Math.pow(A, 0.9) - Math.pow(A, 1.6)) + 15 * (Math.sqrt(Math.max(B, 0)) - Math.pow(B, 4));
    var tpcCorr = tpc - eps;
    // Wichert-Aziz pressure correction uses a PLUS sign in the denominator term.
    var denom = tpc + B * (1 - B) * eps;
    var ppcCorr = denom > 0 ? (ppc * tpcCorr) / denom : NaN;
    return { ppc: ppcCorr, tpc: tpcCorr, eps: eps, denom: denom };
  }

  function zPapay(p, tR, ppc, tpc) {
    var ppr = p / ppc;
    var tpr = tR / tpc;
    var z = 1 - (3.53 * ppr) * Math.pow(10, -0.9813 * tpr) + (0.274 * ppr * ppr) * Math.pow(10, -0.8157 * tpr);
    return Math.max(z, 0.2);
  }

  function zBeggsBrill(p, tR, ppc, tpc) {
    var ppr = p / ppc;
    var tpr = tR / tpc;
    var A = 1.39 * Math.sqrt(Math.max(tpr - 0.92, 1e-6)) - 0.36 * tpr - 0.101;
    var B = (0.62 - 0.23 * tpr) * ppr + (0.066 / (tpr - 0.86) - 0.037) * ppr * ppr + 0.32 * Math.pow(ppr, 6) / Math.pow(10, 9 * (tpr - 1));
    var C = 0.132 - 0.32 * Math.log10(tpr);
    var D = Math.pow(10, 0.3106 - 0.49 * tpr + 0.1824 * tpr * tpr);
    var z = A + (1 - A) / Math.exp(B) + C * Math.pow(ppr, D);
    return Math.max(z, 0.2);
  }

  function gasDensity(p, tR, ma, z) {
    return (p * ma) / (z * 10.7316 * tR);
  }

  function gasBgFt3PerScf(p, tR, z) {
    return (0.02827 * z * tR) / p;
  }

  function gasBgRbPerScf(p, tR, z) {
    return gasBgFt3PerScf(p, tR, z) / 5.615;
  }

  function gasViscosityLee(p, tR, ma, z) {
    var rhoLbft3 = gasDensity(p, tR, ma, z);
    var rhoGcc = rhoLbft3 * 0.0160185;
    var K = ((9.379 + 0.01607 * ma) * Math.pow(tR, 1.5)) / (209.2 + 19.26 * ma + tR);
    var X = 3.448 + 986.4 / tR + 0.01009 * ma;
    var Y = 2.447 - 0.2224 * X;
    return 1e-4 * K * Math.exp(X * Math.pow(rhoGcc, Y));
  }

  /* ------------------------------------------------------ composition UI */

  function initGasCompositionRows() {
    var body = $('gasCompBody');
    if (!body) return;
    body.innerHTML = '';
    for (var i = 1; i <= GAS_COMP_ROWS; i += 1) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + i + '</td>'
        + '<td><input id="gs-gc_comp_' + i + '" spellcheck="false"></td>'
        + '<td><input id="gs-gc_formula_' + i + '" spellcheck="false"></td>'
        + '<td><input id="gs-gc_yi_' + i + '" type="number" step="any"></td>'
        + '<td><input id="gs-gc_mw_' + i + '" readonly></td>'
        + '<td><input id="gs-gc_yimw_' + i + '" readonly></td>'
        + '<td><input id="gs-gc_tc_' + i + '" readonly></td>'
        + '<td><input id="gs-gc_yitc_' + i + '" readonly></td>'
        + '<td><input id="gs-gc_pc_' + i + '" readonly></td>'
        + '<td><input id="gs-gc_yipc_' + i + '" readonly></td>';
      body.appendChild(tr);
    }
  }

  function updateCompositionSummary() {
    if (!$('gasCompBody')) return;
    var rows = [];
    var sumRaw = 0;
    for (var i = 1; i <= GAS_COMP_ROWS; i += 1) {
      var compEl = $('gc_comp_' + i);
      var formulaEl = $('gc_formula_' + i);
      var yiEl = $('gc_yi_' + i);
      var comp = (compEl && compEl.value.trim()) || '';
      var formula = (formulaEl && formulaEl.value.trim()) || '';
      var yiIn = Number(yiEl && yiEl.value);
      var rec = resolveComponentRecord(comp, formula);
      if (yiEl && yiEl.value !== '' && Number.isFinite(yiIn)) sumRaw += yiIn; else yiIn = NaN;
      rows.push({ i: i, yiIn: yiIn, rec: rec });
    }

    var basisFactor = sumRaw > 1.5 ? 0.01 : 1;
    var sumYi = sumRaw * basisFactor;
    var ma = 0;
    var tpc = 0;
    var ppc = 0;

    rows.forEach(function (r) {
      var mw = (r.rec && Number.isFinite(r.rec.mw_lb_lbmol)) ? r.rec.mw_lb_lbmol : NaN;
      var tc = (r.rec && Number.isFinite(r.rec.tc_r)) ? r.rec.tc_r : NaN;
      var pc = (r.rec && Number.isFinite(r.rec.pc_psia)) ? r.rec.pc_psia : NaN;
      var yiBasis = Number.isFinite(r.yiIn) ? r.yiIn * basisFactor : NaN;
      var yiMw = (Number.isFinite(yiBasis) && Number.isFinite(mw)) ? yiBasis * mw : NaN;
      var yiTc = (Number.isFinite(yiBasis) && Number.isFinite(tc)) ? yiBasis * tc : NaN;
      var yiPc = (Number.isFinite(yiBasis) && Number.isFinite(pc)) ? yiBasis * pc : NaN;

      var set = function (id, v, d) { var el = $(id + r.i); if (el) el.value = Number.isFinite(v) ? round(v, d) : ''; };
      set('gc_mw_', mw, 5); set('gc_yimw_', yiMw, 5);
      set('gc_tc_', tc, 5); set('gc_yitc_', yiTc, 5);
      set('gc_pc_', pc, 5); set('gc_yipc_', yiPc, 5);

      if (Number.isFinite(yiMw)) ma += yiMw;
      if (Number.isFinite(yiTc)) tpc += yiTc;
      if (Number.isFinite(yiPc)) ppc += yiPc;
    });

    if ($('gc_ma')) $('gc_ma').textContent = round(ma, 5);
    if ($('gc_tpc')) $('gc_tpc').textContent = round(tpc, 5);
    if ($('gc_ppc')) $('gc_ppc').textContent = round(ppc, 5);

    var sumEl = $('gc_sum_yi');
    var statusEl = $('gc_sum_status');
    if (sumEl) sumEl.value = round(sumYi, 5);
    if (statusEl) {
      var pass = Math.abs(sumYi - 1) <= 1e-3;
      statusEl.textContent = pass ? 'OK' : 'CHECK';
      statusEl.classList.toggle('is-pass', pass);
      statusEl.classList.toggle('is-fail', !pass);
    }
  }

  function getComposition() {
    var entries = [];
    for (var i = 1; i <= GAS_COMP_ROWS; i += 1) {
      var compEl = $('gc_comp_' + i);
      var formulaEl = $('gc_formula_' + i);
      var yiEl = $('gc_yi_' + i);
      var comp = (compEl && compEl.value.trim()) || '';
      var formula = (formulaEl && formulaEl.value.trim()) || '';
      var yiRaw = Number(yiEl && yiEl.value);
      if (!yiEl || yiEl.value === '' || !Number.isFinite(yiRaw) || yiRaw <= 0) continue;
      var rec = resolveComponentRecord(comp, formula);
      entries.push({
        component: comp,
        formula: formula,
        yiRaw: yiRaw,
        mw: (rec && Number.isFinite(rec.mw_lb_lbmol)) ? rec.mw_lb_lbmol : null,
        pc: (rec && Number.isFinite(rec.pc_psia)) ? rec.pc_psia : null,
        tcR: (rec && Number.isFinite(rec.tc_r)) ? rec.tc_r : null,
        resolved: !!rec,
        resolvedFormula: (rec && rec.formula) || '',
        resolvedName: (rec && rec.compound) || comp
      });
    }

    var sum = entries.reduce(function (a, b) { return a + b.yiRaw; }, 0);
    var basisFactor = sum > 1.5 ? 0.01 : 1;
    entries.forEach(function (e) { e.yi = e.yiRaw * basisFactor; });
    sum = entries.reduce(function (a, b) { return a + b.yi; }, 0);
    var unresolved = entries.filter(function (e) { return !e.resolved; }).length;
    var qcTolerance = 1e-3;
    var qcPass = Math.abs(sum - 1) <= qcTolerance;
    return { entries: entries, rawSum: sum, unresolved: unresolved, qcPass: qcPass, qcTolerance: qcTolerance };
  }

  function applyCompositionPaste() {
    var box = $('compositionPaste');
    if (!box) return;
    var text = box.value || '';
    if (!text.trim()) return;

    var lines = text.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    var maxRows = GAS_COMP_ROWS;
    var applied = 0;

    for (var i = 1; i <= maxRows; i += 1) {
      if ($('gc_comp_' + i)) $('gc_comp_' + i).value = '';
      if ($('gc_formula_' + i)) $('gc_formula_' + i).value = '';
      if ($('gc_yi_' + i)) $('gc_yi_' + i).value = '';
    }

    for (var k = 0; k < Math.min(lines.length, maxRows); k += 1) {
      var cols = lines[k].split(/\t|,|;/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (cols.length < 2) continue;
      var comp = cols[0] || '';
      var formula = cols.length >= 3 ? cols[1] : '';
      var yiText = cols.length >= 3 ? cols[2] : cols[1];
      var yi = Number(yiText);
      if (!Number.isFinite(yi)) continue;
      var row = k + 1;
      if ($('gc_comp_' + row)) $('gc_comp_' + row).value = comp;
      if ($('gc_formula_' + row)) $('gc_formula_' + row).value = formula;
      if ($('gc_yi_' + row)) $('gc_yi_' + row).value = String(yi);
      applied += 1;
    }

    if (applied > 0) {
      updateCompositionSummary();
      calculate();
    }
  }

  /* --------------------------------------------------- standing chart UI */

  function updateStandingChartPanel(ppr, tpr) {
    if ($('scPpr')) $('scPpr').value = Number.isFinite(ppr) ? round(ppr, 5) : '';
    if ($('scTpr')) $('scTpr').value = Number.isFinite(tpr) ? round(tpr, 5) : '';
    var zManual = toNum('scZ');
    if ($('scZView')) $('scZView').textContent = Number.isFinite(zManual) ? round(zManual, 5) : '-';
  }

  function setupStandingChartUpload() {
    var upload = $('scChartUpload');
    var preview = $('scChartPreview');
    if (!upload || !preview) return;
    upload.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var url = URL.createObjectURL(file);
      preview.src = url;
      preview.hidden = false;
      updateStandingChartPanel(toNum('scPpr'), toNum('scTpr'));
    });
  }

  /* ------------------------------------------------------- method notes */

  function methodNotes() {
    if (!$('gasMethodNotes')) return;
    var behavior = $('g-behavior').value;
    var zMethod = $('g-z-method').value;
    var muMethod = $('g-mu-method').value;
    var nhc = $('g-nhc-method').value;

    var zInfo = {
      papay: 'Papay: explicit and very fast for spreadsheet/web use; practical for sweet gas; less robust in extreme reduced conditions.',
      standing_chart_manual: 'Standing chart method: read Z visually at highlighted Ppr/Tpr and enter Z manually in the Standing chart tab.',
      matthews_support: 'Matthews et al. (1942): support method for pseudo-critical estimation (heavy-end), not a direct Z equation.',
      brown_1948: 'Brown et al. (1948): uses gas gravity for pseudo-critical properties. Natural-gas system limitation: N2 <= 5%, CO2 <= 2%, H2S <= 2%.',
      wichert_aziz_support: 'Wichert-Aziz: sour-gas pseudo-critical correction using CO2 and H2S to adjust Tpc/Ppc before Z estimation. Enter yCO2 and yH2S under Z-factor.',
      whitson_brule_support: 'Whitson-Brule (2000): recommended workflow when gas gravity and non-hydrocarbons are known.',
      ckb_support: 'Carr-Kobayashi-Burrows: use when CO2, H2S, and N2 percentages are known to adjust pseudo-critical properties.',
      beggs_brill: 'Beggs-Brill: explicit and commonly used engineering approximation; easy implementation; accuracy can degrade near critical/highly non-ideal regions.'
    };

    var muInfo = {
      lee: 'Lee-Gonzalez-Eakin (1966): semi-empirical viscosity relationship for natural gas. Uses reservoir temperature, gas density, and apparent molecular weight. Reported standard deviation is 2.7% with maximum deviation 8.99%. Less accurate for higher gas specific gravity and not applicable to sour gases.',
      ckb_graph: 'Carr-Kobayashi-Burrows (1954): graphical correlation to estimate gas viscosity as a function of temperature, pressure, and gas specific gravity.'
    };

    var nhcInfo = {
      none: 'No sour-gas correction: acceptable when non-hydrocarbons are small (lecture indicates up to ~5% often minor effect).',
      wichert_aziz: 'Wichert-Aziz: adjusts pseudo-critical properties for CO2/H2S in sour gas before Z estimation; recommended lecture method. Key significance: correction magnitude grows with acid-gas concentration.'
    };

    var behaviorInfo = behavior === 'ideal'
      ? 'Ideal gas selected: Z is fixed to 1.0 in calculations.'
      : 'Real gas selected: Z is calculated from the selected correlation and used in all dependent properties.';

    var brownSystem = ($('g-brown-system') && $('g-brown-system').value) || 'natural';
    var brownInfo = zMethod === 'brown_1948'
      ? (brownSystem === 'natural'
        ? 'Brown system selected: Natural gas system. Limits enforced: N2 <= 5%, CO2 <= 2%, H2S <= 2%.'
        : 'Brown system selected: Wet gas system.')
      : '';

    $('gasMethodNotes').innerHTML = '<p>' + behaviorInfo + '</p><p>' + (zInfo[zMethod] || '') + '</p>'
      + (brownInfo ? '<p>' + brownInfo + '</p>' : '')
      + '<p>' + (muInfo[muMethod] || '') + '</p><p>' + (nhcInfo[nhc] || '') + '</p>';
  }

  function updateZMethodPanels() {
    var zMethod = ($('g-z-method') && $('g-z-method').value) || 'papay';
    var brownSel = $('g-brown-system');
    var waPanel = $('g-wa-inputs');
    var ckbPanel = $('g-ckb-inputs');
    if (brownSel) brownSel.hidden = zMethod !== 'brown_1948';
    if (waPanel) waPanel.hidden = zMethod !== 'wichert_aziz_support';
    if (ckbPanel) ckbPanel.hidden = zMethod !== 'ckb_support';
  }

  /* ----------------------------------------------------------- calculate */

  function calculateGas() {
    var rows = [];
    var p = toNum('pressure');
    var tR = getTemperatureRankine();
    var behavior = $('g-behavior').value;

    var composition = getComposition();
    var maFromCompData = mixtureMa(composition);
    var maFromComp = maFromCompData.ma;
    var ggInputText = (($('gasGravity') && $('gasGravity').value) || '').trim();
    var ggInput = toNum('gasGravity');
    var hasGgInput = ggInputText !== '' && Number.isFinite(ggInput);

    var maMethod = $('g-ma-method').value;
    var ma = Number.isFinite(maFromComp) ? maFromComp : NaN;
    var maMethodUsed = 'From composition (ΣyiMi)';
    if (maMethod === 'from_gg') {
      ma = Number.isFinite(ggInput) ? MW_AIR * ggInput : maFromComp;
      maMethodUsed = Number.isFinite(ggInput) ? 'From gas gravity' : 'From composition fallback (γg missing)';
    } else if (maMethod === 'from_comp') {
      ma = maFromComp;
      maMethodUsed = 'From composition (ΣyiMi)';
    } else {
      // auto: γg input first, else composition
      if (hasGgInput) {
        ma = MW_AIR * ggInput;
        maMethodUsed = 'Auto → From gas gravity input';
      } else {
        ma = maFromComp;
        maMethodUsed = 'Auto → From composition (γg not provided)';
      }
    }

    // if γg is entered, use it directly; if empty, compute γg = Ma / 28.96
    var gg = hasGgInput ? ggInput : ma / MW_AIR;

    if ($('g-ma').checked) {
      addResult(rows, 'Apparent molecular weight, Ma', round(ma, 4), 'lb/lbmol', maMethodUsed);
    }
    if ($('g-gg').checked) {
      var ggMethodUsed = hasGgInput ? 'User input (priority)' : 'γg = Ma/28.96 (input empty)';
      addResult(rows, 'Gas specific gravity, γg', round(gg, 5), '-', ggMethodUsed);
    }

    // pseudo-critical source
    var pcSource = $('g-pc-source').value;
    var zMethod = $('g-z-method').value;
    var brownSystem = ($('g-brown-system') && $('g-brown-system').value) || 'natural';
    var brownSelected = zMethod === 'brown_1948';
    var brownLimitFail = false;
    var brownLimitMessage = '';

    var pc = pcSource === 'composition' ? pseudoCriticalFromComposition(maFromCompData.comp) : pseudoCriticalFromSg(gg);
    if (brownSelected) {
      pc = pseudoCriticalFromBrown1948(gg, brownSystem);
      if (brownSystem === 'natural') {
        var yN2 = compositionYiByFormula(maFromCompData.comp, 'N2');
        var yCO2b = compositionYiByFormula(maFromCompData.comp, 'CO2');
        var yH2Sb = compositionYiByFormula(maFromCompData.comp, 'H2S');
        var n2Ok = yN2 <= 0.05;
        var co2Ok = yCO2b <= 0.02;
        var h2sOk = yH2Sb <= 0.02;
        brownLimitFail = !(n2Ok && co2Ok && h2sOk);
        brownLimitMessage = 'N2=' + round(yN2 * 100, 3) + '% (<=5%), CO2=' + round(yCO2b * 100, 3)
          + '% (<=2%), H2S=' + round(yH2Sb * 100, 3) + '% (<=2%)';
        addResult(rows, 'Brown natural-gas limits check', brownLimitFail ? 'ERROR' : 'PASS', '-',
          brownLimitFail ? ('Out of range: ' + brownLimitMessage) : brownLimitMessage);
      }
    } else if ((!Number.isFinite(pc.ppc) || !Number.isFinite(pc.tpc) || pc.ppc <= 0 || pc.tpc <= 0) && pcSource === 'composition') {
      pc = pseudoCriticalFromSg(gg);
      pc.source = 'Fallback to gas gravity correlation (insufficient composition Pc/Tc mapping)';
    }

    var yCO2 = 0;
    var yH2S = 0;
    var waCorr = null;
    var waInputError = false;
    var waFromZMethod = zMethod === 'wichert_aziz_support';
    var waFromNhcMethod = $('g-nhc-method').value === 'wichert_aziz';
    // CKB is its own correction path; do not stack Wichert-Aziz on top of it.
    var useWichertAziz = (waFromZMethod || waFromNhcMethod) && zMethod !== 'ckb_support';

    if (useWichertAziz) {
      if (waFromZMethod) {
        var yCO2In = normalizeMoleFractionInput(toNum('wa_yco2'));
        var yH2SIn = normalizeMoleFractionInput(toNum('wa_yh2s'));
        var inputsValid = Number.isFinite(yCO2In) && Number.isFinite(yH2SIn) && yCO2In <= 1 && yH2SIn <= 1;
        if (!inputsValid) {
          waInputError = true;
          addResult(rows, 'Wichert-Aziz input check', 'ERROR', '-', 'Enter valid yCO2 and yH2S (mole fraction or mole%).');
        } else {
          yCO2 = yCO2In;
          yH2S = yH2SIn;
        }
      } else {
        var comp = maFromCompData.comp;
        yCO2 = compositionYiByFormula(comp, 'CO2');
        yH2S = compositionYiByFormula(comp, 'H2S');
      }

      if (!waInputError) {
        var basePpc = pc.ppc;
        var baseTpc = pc.tpc;
        waCorr = wichertAziz(basePpc, baseTpc, yCO2, yH2S);
        var waValid = Number.isFinite(waCorr.ppc) && Number.isFinite(waCorr.tpc) && waCorr.ppc > 0 && waCorr.tpc > 0;
        if (!waValid) {
          waInputError = true;
          addResult(rows, 'Wichert-Aziz correction check', 'ERROR', '-',
            'Invalid corrected pseudo-critical values; verify yCO2/yH2S and base pseudo-critical inputs.');
        } else {
          pc = { ppc: waCorr.ppc, tpc: waCorr.tpc, source: pc.source + ' + Wichert-Aziz' };
        }

        var acidGas = yCO2 + yH2S;
        var epsPct = baseTpc > 0 ? (waCorr.eps / baseTpc) * 100 : NaN;
        var significance = acidGas <= 0.02
          ? 'Low significance correction (acid gas <= 2%)'
          : (acidGas <= 0.05
            ? 'Moderate significance correction (acid gas 2-5%)'
            : 'High significance correction (acid gas > 5%)');
        var inputSource = waFromZMethod ? 'User input below Z-factor method (fraction or % auto-normalized)' : 'From gas composition';

        addResult(rows, 'Wichert-Aziz input, yCO2', round(yCO2, 5), '-', inputSource);
        addResult(rows, 'Wichert-Aziz input, yH2S', round(yH2S, 5), '-', inputSource);
        addResult(rows, 'Wichert-Aziz epsilon, ε', round(waCorr.eps, 5), 'deg R', 'Pseudo-critical temperature adjustment');
        addResult(rows, 'Wichert-Aziz corrected Ppc', waInputError ? 'ERROR' : round(waCorr.ppc, 5), 'psia', 'Corrected pseudo-critical pressure');
        addResult(rows, 'Wichert-Aziz corrected Tpc', waInputError ? 'ERROR' : round(waCorr.tpc, 5), 'deg R', 'Corrected pseudo-critical temperature');
        addResult(rows, 'Wichert-Aziz significance', significance, '-',
          'Acid gas (CO2+H2S)=' + round(acidGas * 100, 3) + '%, ε/Tpc≈' + (Number.isFinite(epsPct) ? round(epsPct, 3) : '-') + '%');
      }
    }

    var ckbInputError = false;
    if (zMethod === 'ckb_support') {
      // Slide 46 workflow: start from gas-gravity pseudo-critical properties, then apply CKB correction.
      var ckbBasePc = pseudoCriticalFromSg(gg);
      addResult(rows, 'CKB base Ppc (uncorrected)', round(ckbBasePc.ppc, 5), 'psia', 'From gas gravity correlation (Step 1)');
      addResult(rows, 'CKB base Tpc (uncorrected)', round(ckbBasePc.tpc, 5), 'deg R', 'From gas gravity correlation (Step 1)');

      var ckbYco2 = normalizeMoleFractionInput(toNum('ckb_yco2'));
      var ckbYh2s = normalizeMoleFractionInput(toNum('ckb_yh2s'));
      var ckbYn2 = normalizeMoleFractionInput(toNum('ckb_yn2'));
      var ckbValid = Number.isFinite(ckbYco2) && ckbYco2 >= 0 && ckbYco2 <= 1
        && Number.isFinite(ckbYh2s) && ckbYh2s >= 0 && ckbYh2s <= 1
        && Number.isFinite(ckbYn2) && ckbYn2 >= 0 && ckbYn2 <= 1;

      if (!ckbValid) {
        ckbInputError = true;
        addResult(rows, 'Carr-Kobayashi-Burrows input check', 'ERROR', '-', 'Enter yCO2, yH2S, and yN2 (mole fraction or mole%).');
      } else {
        addResult(rows, 'CKB input, yCO2', round(ckbYco2, 5), '-', 'User input (fraction/% auto-normalized)');
        addResult(rows, 'CKB input, yH2S', round(ckbYh2s, 5), '-', 'User input (fraction/% auto-normalized)');
        addResult(rows, 'CKB input, yN2', round(ckbYn2, 5), '-', 'User input (fraction/% auto-normalized)');

        var tpcAdj = ckbBasePc.tpc - 80 * ckbYco2 + 130 * ckbYh2s - 250 * ckbYn2;
        var ppcAdj = ckbBasePc.ppc + 440 * ckbYco2 + 600 * ckbYh2s - 170 * ckbYn2;
        var ckbPcValid = Number.isFinite(tpcAdj) && Number.isFinite(ppcAdj) && tpcAdj > 0 && ppcAdj > 0;
        if (!ckbPcValid) {
          ckbInputError = true;
          addResult(rows, 'Carr-Kobayashi-Burrows correction check', 'ERROR', '-', 'Adjusted pseudo-critical values are invalid.');
        } else {
          pc = { tpc: tpcAdj, ppc: ppcAdj, source: 'Carr-Kobayashi-Burrows corrected (from gas gravity base)' };
          addResult(rows, 'CKB corrected Ppc', round(ppcAdj, 5), 'psia', "Ppc' = Ppc + 440yCO2 + 600yH2S - 170yN2");
          addResult(rows, 'CKB corrected Tpc', round(tpcAdj, 5), 'deg R', "Tpc' = Tpc - 80yCO2 + 130yH2S - 250yN2");
        }
      }
    }

    addResult(rows, 'Pseudo-critical pressure, ppc', round(pc.ppc, 4), 'psia', pc.source);
    addResult(rows, 'Pseudo-critical temperature, Tpc', round(pc.tpc, 4), 'deg R', pc.source);
    var usingWichert = useWichertAziz && !waInputError;
    var usingCkb = zMethod === 'ckb_support' && !ckbInputError;
    var usingCorrectedPc = usingWichert || usingCkb;
    // Use the exact corrected pseudo-critical set for reduced properties.
    var ppcForReduced = (usingWichert && waCorr) ? waCorr.ppc : pc.ppc;
    var tpcForReduced = (usingWichert && waCorr) ? waCorr.tpc : pc.tpc;
    var ppr = p / ppcForReduced;
    var tpr = tR / tpcForReduced;
    addResult(rows,
      usingCorrectedPc ? 'Pseudo-reduced pressure (corrected), Ppr' : 'Pseudo-reduced pressure, Ppr',
      round(ppr, 6), '-',
      usingCorrectedPc ? "Ppr = P(psia) / corrected Ppc'" : 'Ppr = P(psia) / Ppc');
    addResult(rows,
      usingCorrectedPc ? 'Pseudo-reduced temperature (corrected), Tpr' : 'Pseudo-reduced temperature, Tpr',
      round(tpr, 6), '-',
      usingCorrectedPc ? "Tpr = T(deg R) / corrected Tpc'" : 'Tpr = T(deg R) / Tpc');
    updateStandingChartPanel(ppr, tpr);

    // z
    var z = NaN;
    if (['g-z', 'g-rho', 'g-v', 'g-cg', 'g-bg', 'g-eg', 'g-mu'].some(function (id) { return $(id).checked; })) {
      if (behavior === 'ideal') {
        z = 1;
        if ($('g-z').checked) addResult(rows, 'Compressibility factor, Z', '1.00000', '-', 'Ideal gas assumption');
      } else {
        var zBP = zPapay(p, tR, pc.ppc, pc.tpc);
        var zStandingUser = toNum('scZ');

        if ($('g-z').checked) {
          addResult(rows, 'Z-factor from BP (Papay)', round(zBP, 5), '-', 'BP/Papay explicit');
          addResult(rows, 'Z-factor from Standing chart',
            Number.isFinite(zStandingUser) ? round(zStandingUser, 5) : '-', '-',
            Number.isFinite(zStandingUser) ? 'User-entered from chart' : 'User must enter Z from chart');
        }

        if (zMethod === 'standing_chart_manual') {
          z = Number.isFinite(zStandingUser) ? zStandingUser : zBP;
          if ($('g-z').checked) {
            var zLabel = Number.isFinite(zStandingUser)
              ? 'Selected Z for calculations: Standing chart (user)'
              : 'Selected Z for calculations: BP/Papay fallback (Standing Z empty)';
            addResult(rows, 'Compressibility factor, Z (used)', round(z, 5), '-', zLabel);
          }
        } else if (zMethod === 'brown_1948') {
          if (brownLimitFail && brownSystem === 'natural') {
            z = NaN;
            if ($('g-z').checked) {
              addResult(rows, 'Compressibility factor, Z (used)', 'ERROR', '-', 'Brown natural-gas limits exceeded. ' + brownLimitMessage);
            }
          } else {
            z = Number.isFinite(zStandingUser) ? zStandingUser : NaN;
            if ($('g-z').checked) {
              var zLabelB = Number.isFinite(zStandingUser)
                ? 'Brown ' + brownSystem + ' system selected; Z entered from Standing chart'
                : 'Brown ' + brownSystem + ' system selected; enter Z from Standing chart';
              addResult(rows, 'Compressibility factor, Z (used)', Number.isFinite(z) ? round(z, 5) : 'ERROR', '-', zLabelB);
            }
          }
        } else if (zMethod === 'wichert_aziz_support') {
          if (waInputError) {
            z = NaN;
            if ($('g-z').checked) addResult(rows, 'Compressibility factor, Z (used)', 'ERROR', '-', 'Wichert-Aziz selected: enter yCO2 and yH2S first.');
          } else {
            z = zBP;
            if ($('g-z').checked) addResult(rows, 'Compressibility factor, Z (used)', round(z, 5), '-', 'Wichert-Aziz-corrected Ppc/Tpc + BP/Papay');
          }
        } else if (zMethod === 'ckb_support') {
          if (ckbInputError) {
            z = NaN;
            if ($('g-z').checked) addResult(rows, 'Compressibility factor, Z (used)', 'ERROR', '-', 'Carr-Kobayashi-Burrows selected: enter yCO2, yH2S, and yN2 first.');
          } else {
            z = zBP;
            if ($('g-z').checked) addResult(rows, 'Compressibility factor, Z (used)', round(z, 5), '-', 'CKB-corrected Ppc/Tpc + BP/Papay');
          }
        } else if (zMethod === 'beggs_brill') {
          z = zBeggsBrill(p, tR, pc.ppc, pc.tpc);
          if ($('g-z').checked) addResult(rows, 'Compressibility factor, Z (used)', round(z, 5), '-', 'Selected method: Beggs-Brill');
        } else {
          z = zBP;
          if ($('g-z').checked) {
            var supportMethods = ['matthews_support', 'wichert_aziz_support', 'whitson_brule_support', 'ckb_support'];
            var zLabelD = supportMethods.indexOf(zMethod) !== -1
              ? (zMethod + ' selected (support) → Selected Z: BP/Papay')
              : 'Selected method: BP/Papay';
            addResult(rows, 'Compressibility factor, Z (used)', round(z, 5), '-', zLabelD);
          }
        }
      }
    }

    var rhoMode = ($('g-rho-method') && $('g-rho-method').value) || 'by_behavior';
    var useRealForDensity = rhoMode === 'real' || (rhoMode === 'by_behavior' && behavior !== 'ideal');
    var zForDensity = 1;
    var rhoMethod = 'Ideal gas equation (Z=1)';
    var zChartUser = toNum('scZ');

    if (useRealForDensity) {
      if (zMethod === 'brown_1948' && (brownLimitFail || !Number.isFinite(z) || z <= 0)) {
        zForDensity = NaN;
        rhoMethod = brownLimitFail
          ? 'Real gas density blocked: Brown natural-gas limits exceeded'
          : 'Real gas density needs Z from Standing chart (Brown method)';
      } else if (Number.isFinite(zChartUser) && zChartUser > 0) {
        zForDensity = zChartUser;
        rhoMethod = 'Real gas equation (uses user Z from chart)';
      } else if (behavior !== 'ideal' && Number.isFinite(z) && z > 0) {
        zForDensity = z;
        rhoMethod = 'Real gas equation (includes Z)';
      } else {
        var zStandingUser2 = toNum('scZ');
        if (zMethod === 'beggs_brill') zForDensity = zBeggsBrill(p, tR, pc.ppc, pc.tpc);
        else if (zMethod === 'standing_chart_manual') zForDensity = Number.isFinite(zStandingUser2) ? zStandingUser2 : zPapay(p, tR, pc.ppc, pc.tpc);
        else zForDensity = zPapay(p, tR, pc.ppc, pc.tpc);
        rhoMethod = 'Real gas equation (includes Z)';
      }
    }

    var rho = gasDensity(p, tR, ma, zForDensity);
    if ($('g-rho').checked) {
      addResult(rows, 'Gas density, ρg', round(rho, 5), 'lbm/ft^3', rhoMethod);
    }

    if ($('g-v').checked) {
      var v = 1 / rho;
      addResult(rows, 'Specific volume, v', round(v, 6), 'ft^3/lbm', 'v = 1/ρg');
    }

    if ($('g-cg').checked) {
      var cgMode = ($('g-cg-method') && $('g-cg-method').value) || 'real';
      if (cgMode === 'ideal') {
        var cgIdeal = 1 / p;
        addResult(rows, 'Isothermal gas compressibility, cg', round(cgIdeal, 8), '1/psi', 'Ideal gas relation: cg = 1/p');
      } else {
        var zAtP = (Number.isFinite(z) && z > 0) ? z : (zMethod === 'beggs_brill' ? zBeggsBrill(p, tR, pc.ppc, pc.tpc) : zPapay(p, tR, pc.ppc, pc.tpc));
        var dp = Math.max(10, 0.01 * p);
        var p1 = Math.max(14.7, p - dp);
        var p2 = p + dp;
        var z1 = zMethod === 'beggs_brill' ? zBeggsBrill(p1, tR, pc.ppc, pc.tpc) : zPapay(p1, tR, pc.ppc, pc.tpc);
        var z2 = zMethod === 'beggs_brill' ? zBeggsBrill(p2, tR, pc.ppc, pc.tpc) : zPapay(p2, tR, pc.ppc, pc.tpc);
        var dzdp = (z2 - z1) / (p2 - p1);
        var cg = 1 / p - dzdp / zAtP;
        var cgMethodLabel = zMethod === 'beggs_brill'
          ? 'Real gas relation using Beggs-Brill Z(p)'
          : 'Real gas relation using Papay Z(p)';
        addResult(rows, 'Isothermal gas compressibility, cg', round(cg, 8), '1/psi', cgMethodLabel);
      }
    }

    var bgMethod = ($('g-bg-method') && $('g-bg-method').value) || 'res_ft3_per_scf';
    var bg = bgMethod === 'res_rb_per_scf' ? gasBgRbPerScf(p, tR, z) : gasBgFt3PerScf(p, tR, z);
    var bgUnit = bgMethod === 'res_rb_per_scf' ? 'rb/scf' : 'ft^3/scf';
    if ($('g-bg').checked) {
      var bgFormula = bgMethod === 'res_rb_per_scf'
        ? 'Bg(rb/scf) = 0.00504*z*T/p'
        : 'Bg(ft^3/scf) = 0.02827*z*T/p';
      addResult(rows, 'Gas FVF, Bg', round(bg, 6), bgUnit, bgFormula);
    }

    if ($('g-eg').checked) {
      var egMethod = ($('g-eg-method') && $('g-eg-method').value) || 'scf_per_rb';
      var bgFt3 = gasBgFt3PerScf(p, tR, z);
      var eg = egMethod === 'scf_per_ft3' ? (1 / bgFt3) : (5.615 / bgFt3);
      var egUnit = egMethod === 'scf_per_ft3' ? 'scf/ft^3' : 'scf/rb';
      var egFormula = egMethod === 'scf_per_ft3' ? 'Eg = 1/Bg(ft^3/scf)' : 'Eg = 1/Bg(rb/scf)';
      addResult(rows, 'Gas expansion factor, Eg', round(eg, 4), egUnit, egFormula);
    }

    if ($('g-mu').checked) {
      var m = $('g-mu-method').value;
      if (m === 'lee') {
        addResult(rows, 'Gas viscosity, μg', round(gasViscosityLee(p, tR, ma, z), 5), 'cP', 'Lee-Gonzalez-Eakin');
      } else {
        addResult(rows, 'Gas viscosity, μg', 'Manual chart required', 'cP', 'Carr-Kobayashi-Burrows (graphical)');
      }
    }

    return rows;
  }

  /* ------------------------------------------------------------- results */

  var KEY_PROPS = ['Apparent molecular weight, Ma', 'Gas specific gravity, γg', 'Compressibility factor, Z (used)',
    'Compressibility factor, Z', 'Gas density, ρg', 'Gas FVF, Bg', 'Gas viscosity, μg'];

  function renderResults(rows) {
    var body = $('resultsBody');
    var meta = $('resultMeta');
    var tiles = $('resultTiles');
    if (!body) return;
    body.innerHTML = '';
    if (tiles) tiles.innerHTML = '';
    if (!rows.length) {
      meta.textContent = 'No properties selected.';
      body.innerHTML = '<tr class="oc-empty"><td colspan="4">Select at least one property.</td></tr>';
      return;
    }
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      if (KEY_PROPS.indexOf(row.property) !== -1) tr.className = 'is-key';
      tr.innerHTML = '<td>' + row.property + '</td><td class="oc-num">' + row.value + '</td><td class="oc-unit">'
        + row.unit + '</td><td class="oc-method">' + row.method + '</td>';
      body.appendChild(tr);
    });
    if (tiles) {
      rows.filter(function (r) { return KEY_PROPS.indexOf(r.property) !== -1; }).forEach(function (r) {
        var d = document.createElement('div');
        d.className = 'oc-tile';
        d.innerHTML = '<span class="oc-tile-lbl">' + r.property + '</span>'
          + '<span class="oc-tile-val">' + r.value + '</span>'
          + '<span class="oc-tile-unit">' + r.unit + '</span>';
        tiles.appendChild(d);
      });
    }
    meta.textContent = 'Calculated ' + rows.length + ' propert' + (rows.length > 1 ? 'ies' : 'y') + ' — gas mode.';
  }

  function calculate() {
    if (!$('resultsBody')) return;
    updateCompositionSummary();
    var behavior = ($('g-behavior') && $('g-behavior').value) || 'real';
    if ($('g-z-method')) $('g-z-method').disabled = behavior === 'ideal';
    updateZMethodPanels();
    methodNotes();
    renderResults(calculateGas());
    snapshot = capture();
  }

  /* ------------------------------------------------------------- markup */

  function prop(n, title, sub, chk, controls) {
    return '<div class="oc-prop">'
      + '<div class="oc-prop-head">'
      + (n ? '<span class="oc-prop-n">' + n + '</span>' : '<span class="oc-prop-n">&bull;</span>')
      + '<div class="oc-prop-meta"><span class="oc-prop-title">' + title + '</span>'
      + (sub ? '<span class="oc-prop-sub">' + sub + '</span>' : '') + '</div>'
      + (chk ? '<label class="oc-chk"><input type="checkbox" id="gs-' + chk + '" checked><span>Include</span></label>' : '')
      + '</div><div class="oc-prop-ctl">' + controls + '</div></div>';
  }

  function inputsHtml() {
    return ''
      + '<label class="oc-field"><span>Pressure, p <em>psia</em></span><input id="gs-pressure" type="number" step="any" placeholder="e.g. 3000"></label>'
      + '<label class="oc-field"><span>Temperature, T</span><input id="gs-temperature" type="number" step="any" placeholder="e.g. 180"></label>'
      + '<label class="oc-field"><span>Temperature unit</span><select id="gs-temperatureUnit">'
      + '<option value="F" selected>Fahrenheit (&deg;F)</option><option value="R">Rankine (&deg;R)</option>'
      + '<option value="C">Celsius (&deg;C)</option><option value="K">Kelvin (K)</option></select></label>'
      + '<label class="oc-field"><span>Gas specific gravity, &gamma;g <em>air = 1</em></span><input id="gs-gasGravity" type="number" step="any" placeholder="leave empty to use composition"></label>';
  }

  function propsHtml() {
    var waInputs = '<div class="oc-subpanel" id="gs-g-wa-inputs" hidden>'
      + '<div class="oc-meta">Used for sour gas when CO2 and H2S fractions are known.</div>'
      + '<div class="oc-fields">'
      + '<label class="oc-field"><span>yCO2 <em>mole fraction or %</em></span><input id="gs-wa_yco2" type="number" step="any" placeholder="e.g. 0.02"></label>'
      + '<label class="oc-field"><span>yH2S <em>mole fraction or %</em></span><input id="gs-wa_yh2s" type="number" step="any" placeholder="e.g. 0.01"></label>'
      + '</div>'
      + '<div class="oc-eqs"><strong>Wichert-Aziz</strong>'
      + "<span>Tpc' = Tpc &minus; &epsilon;</span>"
      + "<span>Ppc' = (Ppc &middot; Tpc') / (Tpc + B(1&minus;B)&epsilon;)</span>"
      + '<span>&epsilon; = 120(A^0.9 &minus; A^1.6) + 15(B^0.5 &minus; B^4.0)</span>'
      + '<span>A = yH2S + yCO2, B = yH2S</span></div></div>';

    var ckbInputs = '<div class="oc-subpanel" id="gs-g-ckb-inputs" hidden>'
      + '<div class="oc-meta">Carr-Kobayashi-Burrows: enter CO2, H2S and N2 as mole fraction or mole%.</div>'
      + '<div class="oc-fields">'
      + '<label class="oc-field"><span>yCO2</span><input id="gs-ckb_yco2" type="number" step="any" placeholder="e.g. 0.02 or 2"></label>'
      + '<label class="oc-field"><span>yH2S</span><input id="gs-ckb_yh2s" type="number" step="any" placeholder="e.g. 0.01 or 1"></label>'
      + '<label class="oc-field"><span>yN2</span><input id="gs-ckb_yn2" type="number" step="any" placeholder="e.g. 0.03 or 3"></label>'
      + '</div></div>';

    return ''
      + prop('', 'Gas behaviour assumption', 'Ideal or real gas model, before any dependent property', '',
        '<select id="gs-g-behavior"><option value="real" selected>Real gas (use compressibility factor Z)</option>'
        + '<option value="ideal">Ideal gas (assume Z = 1)</option></select>')
      + prop('1', 'Apparent molecular weight, M<sub>a</sub>', '', 'g-ma',
        '<select id="gs-g-ma-method"><option value="auto" selected>Auto: use γg input, else Σ(yi·Mi)</option>'
        + '<option value="from_gg">From gas gravity (Ma = 28.96·γg)</option>'
        + '<option value="from_comp">From composition (Σ yi·MWi)</option></select>')
      + prop('2', 'Gas specific gravity, &gamma;<sub>g</sub>', '', 'g-gg',
        '<select id="gs-g-gg-method"><option value="input" selected>Use input γg</option>'
        + '<option value="from_ma">From Ma (γg = Ma/28.96)</option>'
        + '<option value="from_comp">From composition (γg = Σ(yi·Mi)/28.96)</option></select>')
      + prop('3', 'Compressibility factor, Z', 'Real gas only — ideal gas assumes Z = 1', 'g-z',
        '<select id="gs-g-z-method">'
        + '<option value="papay" selected>Papay (1985) — recommended quick engineering method</option>'
        + '<option value="standing_chart_manual">Standing chart — user read + manual Z entry</option>'
        + '<option value="matthews_support">Matthews et al. (1942) — Ppc/Tpc support</option>'
        + '<option value="brown_1948">Brown et al. (1948) — Ppc/Tpc from gas gravity</option>'
        + '<option value="wichert_aziz_support">Wichert-Aziz — sour gas correction support</option>'
        + '<option value="whitson_brule_support">Whitson &amp; Brule (2000) — workflow support</option>'
        + '<option value="ckb_support">Carr-Kobayashi-Burrows — correction support</option>'
        + '<option value="beggs_brill">Beggs-Brill (explicit alternative)</option></select>'
        + '<select id="gs-g-brown-system" hidden><option value="natural" selected>Brown system: natural gas</option>'
        + '<option value="wet">Brown system: wet gas</option></select>'
        + waInputs + ckbInputs)
      + prop('4', 'Gas density, &rho;<sub>g</sub>', '', 'g-rho',
        '<select id="gs-g-rho-method"><option value="by_behavior" selected>Follow gas behaviour selection</option>'
        + '<option value="ideal">Ideal gas equation (Z = 1)</option>'
        + '<option value="real">Real gas equation (include Z)</option></select>')
      + prop('5', 'Specific volume, v', '', 'g-v',
        '<select id="gs-g-v-method"><option value="inv_rho" selected>v = 1/ρg</option></select>')
      + prop('6', 'Isothermal compressibility, c<sub>g</sub>', '', 'g-cg',
        '<select id="gs-g-cg-method"><option value="real" selected>Real gas: cg = 1/p − (1/Z)(dZ/dp)</option>'
        + '<option value="ideal">Ideal gas: cg = 1/p</option></select>')
      + prop('7', 'Gas formation volume factor, B<sub>g</sub>', '', 'g-bg',
        '<select id="gs-g-bg-method"><option value="res_ft3_per_scf" selected>Bg in reservoir ft³/scf</option>'
        + '<option value="res_rb_per_scf">Bg in rb/scf</option></select>')
      + prop('8', 'Gas expansion factor, E<sub>g</sub>', '', 'g-eg',
        '<select id="gs-g-eg-method"><option value="scf_per_rb" selected>Eg in scf/rb</option>'
        + '<option value="scf_per_ft3">Eg in scf/ft³</option></select>')
      + prop('9', 'Gas viscosity, &mu;<sub>g</sub>', '', 'g-mu',
        '<select id="gs-g-mu-method"><option value="lee" selected>Lee-Gonzalez-Eakin</option>'
        + '<option value="ckb_graph">Carr-Kobayashi-Burrows (chart / manual)</option></select>')
      + prop('', 'Pseudo-critical &amp; sour-gas options', 'Non-hydrocarbon correction and pseudo-critical source', '',
        '<select id="gs-g-nhc-method"><option value="none" selected>Non-hydrocarbon correction: none</option>'
        + '<option value="wichert_aziz">Non-hydrocarbon correction: Wichert-Aziz (CO2 + H2S)</option></select>'
        + '<select id="gs-g-pc-source"><option value="sg" selected>Pseudo-critical source: gas gravity correlation</option>'
        + '<option value="composition">Pseudo-critical source: composition mixing (Kay)</option></select>');
  }

  function compositionHtml() {
    var heads = ['#', 'Component', 'Formula', 'yi (fraction or mole%)', 'Mi (lb/lb-mol)', 'yi·Mi',
      'Tci (&deg;R)', 'yi·Tci', 'Pci (psia)', 'yi·Pci'];
    return '<section class="oc-card oc-card-batch">'
      + '<h3>Gas composition</h3>'
      + '<p class="oc-meta">Optional — drives mixture-based Ma / γg and Kay pseudo-criticals. Paste from Excel as Component, Formula, yi. Mi, Tci and Pci are looked up automatically.</p>'
      + '<div class="oc-paste"><label class="oc-field oc-field-wide"><span>Paste composition</span>'
      + '<textarea id="gs-compositionPaste" rows="4" spellcheck="false" placeholder="Methane&#9;CH4&#9;0.85&#10;Ethane&#9;C2H6&#9;0.04&#10;Propane&#9;C3H8&#9;0.03"></textarea></label>'
      + '<button type="button" class="oc-btn oc-btn-ghost" id="gs-applyCompositionPasteBtn">Apply pasted composition</button></div>'
      + '<div class="oc-tablewrap oc-comp-table"><table><thead><tr>'
      + heads.map(function (h) { return '<th>' + h + '</th>'; }).join('')
      + '</tr></thead><tbody id="gs-gasCompBody"></tbody><tfoot>'
      + '<tr><td colspan="3"><strong>Summation of yi</strong></td>'
      + '<td><span class="oc-qc"><input id="gs-gc_sum_yi" type="text" value="0.00000" readonly>'
      + '<span id="gs-gc_sum_status" class="oc-badge is-fail">CHECK</span></span></td><td colspan="6"></td></tr>'
      + '<tr><td colspan="10"><strong>Ma (lb/lb-mol) = <span id="gs-gc_ma">0.00000</span> | '
      + 'Tpc (&deg;R) = <span id="gs-gc_tpc">0.00000</span> | Ppc (psia) = <span id="gs-gc_ppc">0.00000</span></strong></td></tr>'
      + '</tfoot></table></div></section>';
  }

  function chartHtml() {
    return '<section class="oc-card oc-card-batch"><h3>Standing chart input</h3>'
      + '<p class="oc-meta">Upload the Standing chart, read Z at the highlighted Ppr / Tpr below, then enter it manually. The value feeds the Standing-chart and Brown Z methods.</p>'
      + '<div class="oc-fields">'
      + '<label class="oc-field"><span>Chart image</span><input id="gs-scChartUpload" type="file" accept="image/*"></label>'
      + '<label class="oc-field"><span>Highlighted Ppr <em>reduced pressure</em></span><input id="gs-scPpr" type="number" step="any" readonly></label>'
      + '<label class="oc-field"><span>Highlighted Tpr <em>reduced temperature</em></span><input id="gs-scTpr" type="number" step="any" readonly></label>'
      + '<label class="oc-field is-manual"><span>Z read from chart</span><input id="gs-scZ" type="number" step="any" placeholder="enter Z"></label>'
      + '</div>'
      + '<div class="oc-meta">From Standing chart, Z-factor = <strong id="gs-scZView">-</strong></div>'
      + '<div class="oc-chart"><img id="gs-scChartPreview" alt="Standing chart preview" hidden></div>'
      + '</section>';
  }

  function template() {
    return '<div class="oc is-gas">'
      + '<div class="oc-bar"><div class="oc-tabs">'
      + '<button type="button" class="oc-tab is-on" data-tab="calc">Calculator</button>'
      + '<button type="button" class="oc-tab" data-tab="comp">Composition</button>'
      + '<button type="button" class="oc-tab" data-tab="chart">Standing chart</button>'
      + '</div><div class="oc-bar-actions">'
      + '<button type="button" class="oc-btn oc-btn-ghost" id="gs-resetBtn">Reset defaults</button>'
      + '<button type="button" class="oc-btn oc-btn-acc" id="gs-calculateBtn">Calculate selected properties</button>'
      + '</div></div>'

      + '<div class="oc-view" data-view="calc"><div class="oc-grid">'
      + '<div class="oc-col">'
      + '<section class="oc-card"><h3>Fluid inputs</h3><div class="oc-fields">' + inputsHtml() + '</div></section>'
      + '<section class="oc-card"><h3>Property selection</h3><div class="oc-props">' + propsHtml() + '</div></section>'
      + '</div>'
      + '<div class="oc-col">'
      + '<section class="oc-card oc-card-res"><h3>Results</h3>'
      + '<div class="oc-tiles" id="gs-resultTiles"></div>'
      + '<div class="oc-meta" id="gs-resultMeta">No calculation yet.</div>'
      + '<div class="oc-tablewrap oc-res-table"><table><thead><tr><th>Property</th><th>Value</th><th>Units</th><th>Method</th></tr></thead>'
      + '<tbody id="gs-resultsBody"></tbody></table></div></section>'
      + '<section class="oc-card oc-card-notes"><h3>Method notes</h3><div class="oc-notes" id="gs-gasMethodNotes"></div></section>'
      + '</div></div></div>'

      + '<div class="oc-view" data-view="comp" hidden>' + compositionHtml() + '</div>'
      + '<div class="oc-view" data-view="chart" hidden>' + chartHtml() + '</div>'
      + '</div>';
  }

  /* ------------------------------------------------------------ behaviour */

  var FIELDS = ['pressure', 'temperature', 'temperatureUnit', 'gasGravity',
    'g-behavior', 'g-ma-method', 'g-gg-method', 'g-z-method', 'g-brown-system',
    'wa_yco2', 'wa_yh2s', 'ckb_yco2', 'ckb_yh2s', 'ckb_yn2',
    'g-rho-method', 'g-v-method', 'g-cg-method', 'g-bg-method', 'g-eg-method', 'g-mu-method',
    'g-nhc-method', 'g-pc-source', 'scZ', 'compositionPaste'];
  var CHECKS = ['g-ma', 'g-gg', 'g-z', 'g-rho', 'g-v', 'g-cg', 'g-bg', 'g-eg', 'g-mu'];
  var snapshot = null;

  function capture() {
    var v = {}, c = {}, comp = [];
    FIELDS.forEach(function (id) { if ($(id)) v[id] = $(id).value; });
    CHECKS.forEach(function (id) { if ($(id)) c[id] = $(id).checked; });
    for (var i = 1; i <= GAS_COMP_ROWS; i += 1) {
      comp.push([
        $('gc_comp_' + i) ? $('gc_comp_' + i).value : '',
        $('gc_formula_' + i) ? $('gc_formula_' + i).value : '',
        $('gc_yi_' + i) ? $('gc_yi_' + i).value : ''
      ]);
    }
    return { v: v, c: c, comp: comp };
  }

  function restore(snap) {
    if (!snap) return;
    FIELDS.forEach(function (id) { if ($(id) && snap.v[id] !== undefined) $(id).value = snap.v[id]; });
    CHECKS.forEach(function (id) { if ($(id) && snap.c[id] !== undefined) $(id).checked = snap.c[id]; });
    (snap.comp || []).forEach(function (row, k) {
      var i = k + 1;
      if ($('gc_comp_' + i)) $('gc_comp_' + i).value = row[0];
      if ($('gc_formula_' + i)) $('gc_formula_' + i).value = row[1];
      if ($('gc_yi_' + i)) $('gc_yi_' + i).value = row[2];
    });
  }

  function setTab(tab) {
    state.tab = tab;
    if (!host) return;
    host.querySelectorAll('.oc-tab').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-tab') === tab);
    });
    host.querySelectorAll('.oc-view').forEach(function (v) {
      v.hidden = v.getAttribute('data-view') !== tab;
    });
  }

  function resetDefaults() {
    ['pressure', 'temperature', 'gasGravity', 'scZ'].forEach(function (id) { if ($(id)) $(id).value = ''; });
    if ($('temperatureUnit')) $('temperatureUnit').value = 'F';
    ['wa_yco2', 'wa_yh2s', 'ckb_yco2', 'ckb_yh2s', 'ckb_yn2'].forEach(function (id) { if ($(id)) $(id).value = ''; });
    calculate();
  }

  function on(id, evt, fn) {
    var el = $(id);
    if (el) el.addEventListener(evt, fn);
  }

  function bind() {
    host.querySelectorAll('.oc-tab').forEach(function (b) {
      b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); });
    });

    on('calculateBtn', 'click', calculate);
    on('resetBtn', 'click', resetDefaults);
    on('applyCompositionPasteBtn', 'click', applyCompositionPaste);

    ['pressure', 'temperature', 'gasGravity',
      'wa_yco2', 'wa_yh2s', 'ckb_yco2', 'ckb_yh2s', 'ckb_yn2'].forEach(function (id) {
      on(id, 'input', calculate);
    });
    on('scZ', 'input', function () { updateStandingChartPanel(toNum('scPpr'), toNum('scTpr')); calculate(); });

    ['temperatureUnit', 'g-behavior', 'g-ma-method', 'g-gg-method', 'g-z-method', 'g-brown-system',
      'g-rho-method', 'g-v-method', 'g-cg-method', 'g-bg-method', 'g-eg-method', 'g-mu-method',
      'g-nhc-method', 'g-pc-source'].forEach(function (id) { on(id, 'change', calculate); });

    CHECKS.forEach(function (id) { on(id, 'change', calculate); });

    for (var i = 1; i <= GAS_COMP_ROWS; i += 1) {
      ['gc_comp_', 'gc_formula_', 'gc_yi_'].forEach(function (pre) {
        on(pre + i, 'input', function () { updateCompositionSummary(); calculate(); });
      });
    }

    setupStandingChartUpload();
  }

  /* ------------------------------------------------------------------ API */

  var GasCalc = {
    mount: function (el) {
      if (!el) return;
      if (mounted && host === el) return;
      host = el;
      host.innerHTML = template();
      initGasCompositionRows();
      bind();
      restore(snapshot);
      setTab(state.tab || 'calc');
      updateCompositionSummary();
      calculate();
      mounted = true;
    },
    unmount: function () {
      if (host && mounted && $('pressure')) snapshot = capture();
      if (host) host.innerHTML = '';
      host = null;
      mounted = false;
    },
    isMounted: function (el) { return mounted && host === el; },
    recalc: calculate
  };

  global.GasCalc = GasCalc;
})(window);
