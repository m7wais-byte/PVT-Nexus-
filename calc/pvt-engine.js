/* ============================================================================
   PVT Nexus — PVTEngine
   Input validation + property evaluation for the PVT Calculator.
   Pure: takes a plain input object (field values as typed, in the selected
   unit system) and returns a result object. No DOM. Node-testable.

   Status of a value
     * invalid input    -> result.ok = false, fieldErrors[...]; nothing is calculated
     * unavailable      -> value null + reason (missing dependency, outside the
                           mathematical domain of an equation, e.g. Z <= 0)
     * outside range    -> value kept, warning names the correlation, the
                           variable, the published range and the affected properties
   ========================================================================= */
(function (root) {
  'use strict';

  var U = root.PVTUnits || (typeof require === 'function' ? require('./pvt-units.js') : null);
  var C = root.PVTCorr || (typeof require === 'function' ? require('./pvt-correlations.js') : null);
  var COMP_DB = root.PURE_COMPONENTS || null;

  var MW_AIR = 28.96;
  var R_GAS = 10.7316;          // psia·ft³/(lbmol·°R)
  var LBFT3_TO_GCC = 0.01601846337;
  var RHO_W = 62.4;             // lbm/ft³, water reference used with γo (Ahmed 2019)
  var MAX_POINTS = 500;
  var COMP_TOL = 1e-3;
  /* One pressure tolerance, in canonical units (psi), used for every pressure comparison:
     range endpoint, de-duplication of a pasted list, snapping a grid point onto pb and the
     saturated / bubble point / undersaturated classification. 0.01 psi (0.0007 bar) is far
     below the displayed resolution (0.1 psi, 0.01 bar) and far above floating-point noise. */
  var P_TOL = 0.01;

  /* Canonical inputs: the UI may pass full-precision values in internal units (inp.canon:
     pressures psia, increment psi, T °F, density lbm/ft³, Rsb scf/STB, pList psia[]). They are
     used instead of re-parsing the displayed text, so rounding a display never moves a point. */
  function canon(inp, k) { var c = inp.canon && inp.canon[k]; return isNum(c) ? c : undefined; }

  /* ------------------------------------------------------------- helpers */
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  /* field text -> {state:'empty'|'bad'|'ok', v} ; placeholders never reach this (they are not values) */
  function parse(raw) {
    if (raw === undefined || raw === null) return { state: 'empty', v: NaN };
    if (typeof raw === 'number') return isFinite(raw) ? { state: 'ok', v: raw } : { state: 'bad', v: NaN };
    var s = String(raw).trim().replace(/,/g, '');
    if (s === '') return { state: 'empty', v: NaN };
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return { state: 'bad', v: NaN };
    return { state: 'ok', v: Number(s) };
  }
  function fmt(x, sig) {
    if (!isNum(x)) return '—';
    sig = sig || 5;
    var a = Math.abs(x);
    if (a !== 0 && (a < 1e-3 || a >= 1e7)) return x.toExponential(sig - 1);
    var d = a === 0 ? sig - 1 : Math.max(0, sig - 1 - Math.floor(Math.log10(a)));
    return x.toFixed(Math.min(d, 8));
  }

  /* plain-English names of the input fields, used to name them in the error summary */
  var FIELD_LABEL = {
    p: 'Pressure', pMin: 'Minimum pressure', pMax: 'Maximum pressure', pStep: 'Pressure increment', pList: 'Pressure list',
    T: 'Temperature', api: 'Oil gravity (API)', rhoSto: 'Stock-tank oil density', gg: 'Gas specific gravity',
    pb: 'Bubble-point pressure', rsb: 'Solution GOR at pb (Rsb)', psep: 'Separator pressure', tsep: 'Separator temperature',
    comp: 'Gas composition', yCO2: 'yCO2', yH2S: 'yH2S', yN2: 'yN2', zManual: 'Z read from chart',
    pcMethod: 'Pseudo-critical method', sourMethod: 'Sour-gas correction', zMethod: 'Z-factor method'
  };
  /* collects errors per field. kind: 'missing' (empty required field), 'invalid' (value or combination
     not allowed), 'failure' (inputs valid, but the selected method cannot produce a result) */
  function Bag() { this.list = []; this.byField = {}; }
  Bag.prototype.add = function (field, msg, kind) {
    if (this.byField[field]) return;
    kind = kind || (/^Input required/.test(msg) ? 'missing' : 'invalid');
    this.byField[field] = msg; this.list.push({ field: field, label: FIELD_LABEL[field] || field, msg: msg, kind: kind });
  };

  /* required positive-ish number */
  function need(bag, inp, field, label, opts) {
    opts = opts || {};
    var r = parse(inp[field]);
    if (r.state === 'empty') { bag.add(field, 'Input required'); return NaN; }
    if (r.state === 'bad') { bag.add(field, 'Enter a number'); return NaN; }
    if (opts.gt0 && !(r.v > 0)) { bag.add(field, label + ' must be greater than 0'); return NaN; }
    if (opts.ge0 && !(r.v >= 0)) { bag.add(field, label + ' cannot be negative'); return NaN; }
    return r.v;
  }

  /* ----------------------------------------------------------- pressures */
  function pressureLabel(inp) { return U.unit('p', inp.units, !!inp.gauge); }

  /* absolute pressure (psia) of a field: canonical value if present, else typed text in display units */
  function absPressure(bag, inp, field, label) {
    var c = canon(inp, field);
    if (c !== undefined) {
      if (!(c > 0)) { bag.add(field, 'Absolute pressure must be greater than 0'); return NaN; }
      return c;
    }
    var v = need(bag, inp, field, label);
    return isNum(v) ? absP(bag, inp, field, v) : NaN;
  }
  /* pressure increment (psi): a difference, so no gauge / atmospheric offset is ever applied */
  function increment(bag, inp, field, label) {
    var c = canon(inp, field);
    if (c !== undefined) { if (!(c > 0)) { bag.add(field, label + ' must be greater than 0'); return NaN; } return c; }
    var v = need(bag, inp, field, label, { gt0: true });
    return isNum(v) ? U.dpToPsi(v, inp.units) : NaN;
  }

  function absP(bag, inp, field, v) {
    var psia = U.pToPsia(v, inp.units, !!inp.gauge);
    if (!(psia > 0)) {
      bag.add(field, inp.gauge
        ? 'Absolute pressure must be > 0 (gauge value + 1 atm ≤ 0)'
        : 'Absolute pressure must be greater than 0');
      return NaN;
    }
    return psia;
  }

  function pressureSet(bag, inp) {
    /* internal use (comparison curves, measured-data errors): explicit absolute pressures in psia */
    if (Array.isArray(inp.pressuresPsia)) {
      var ok = inp.pressuresPsia.filter(function (x) { return x > 0; });
      if (!ok.length) bag.add('p', 'No positive pressures to evaluate');
      return ok.slice().sort(function (x, y) { return x - y; });
    }
    var mode = inp.calcMode || 'single';
    if (mode === 'single') {
      var p = absPressure(bag, inp, 'p', 'Pressure');
      return isNum(p) ? [p] : [];
    }
    if (mode === 'range') {
      var pa = absPressure(bag, inp, 'pMin', 'Minimum pressure');
      var pz = absPressure(bag, inp, 'pMax', 'Maximum pressure');
      var st = increment(bag, inp, 'pStep', 'Increment');
      if (!isNum(pa) || !isNum(pz) || !isNum(st)) return [];
      if (!(pz - pa > P_TOL)) { bag.add('pMax', 'Maximum must be greater than minimum'); return []; }
      /* index-based grid in canonical psia: p_i = pMin + i·step (no cumulative addition);
         the exact maximum is the last point, replacing a grid point that lies within P_TOL of it */
      var n = Math.floor((pz - pa + P_TOL) / st);
      var endOnGrid = Math.abs(pa + n * st - pz) <= P_TOL;
      var count = n + 1 + (endOnGrid ? 0 : 1);
      if (count > MAX_POINTS) { bag.add('pStep', 'Too many points (' + count + '); limit is ' + MAX_POINTS + ' — use a larger increment'); return []; }
      var out = [];
      for (var i = 0; i <= n; i++) out.push(pa + i * st);
      if (endOnGrid) out[n] = pz; else out.push(pz);
      return out;
    }
    /* pasted list (canonical psia array after a unit switch, else the typed text) */
    var vals = [];
    if (Array.isArray(inp.canon && inp.canon.pList)) {
      vals = inp.canon.pList.slice();
      for (var c = 0; c < vals.length; c++) if (!(vals[c] > 0)) { bag.add('pList', 'Value ' + (c + 1) + ' is not a positive absolute pressure'); return []; }
      if (!vals.length) { bag.add('pList', 'Input required'); return []; }
    } else {
      var raw = String(inp.pList || '').trim();
      if (!raw) { bag.add('pList', 'Input required'); return []; }
      var toks = raw.split(/[\s,;\t]+/).filter(Boolean);
      for (var k = 0; k < toks.length; k++) {
        var r = parse(toks[k]);
        if (r.state !== 'ok') { bag.add('pList', 'Value ' + (k + 1) + ' ("' + toks[k] + '") is not a number'); return []; }
        var ps = U.pToPsia(r.v, inp.units, !!inp.gauge);
        if (!(ps > 0)) { bag.add('pList', 'Value ' + (k + 1) + ' (' + toks[k] + ' ' + pressureLabel(inp) + ') is not a positive absolute pressure'); return []; }
        vals.push(ps);
      }
    }
    if (vals.length > MAX_POINTS) { bag.add('pList', 'Too many points (' + vals.length + '); limit is ' + MAX_POINTS); return []; }
    /* calculated properties are a function of pressure only: values within P_TOL are one point */
    vals.sort(function (x, y) { return x - y; });
    var uniq = vals.filter(function (x, i) { return i === 0 || x - vals[i - 1] > P_TOL; });
    bag.merged = vals.length - uniq.length;
    return uniq;
  }

  function temperatureF(bag, inp, field) {
    field = field || 'T';
    var c = canon(inp, field), f;
    if (c !== undefined) f = c;
    else {
      var v = need(bag, inp, field, 'Temperature');
      if (!isNum(v)) return NaN;
      f = U.tToF(v, inp.units);
    }
    if (!(U.fToR(f) > 0)) { bag.add(field, 'Temperature must be above absolute zero'); return NaN; }
    return f;
  }

  /* phase of a fixed-composition oil at p, with the shared tolerance */
  function phaseOf(p, pb) { return p < pb - P_TOL ? 'saturated' : (p <= pb + P_TOL ? 'bubble point' : 'undersaturated'); }

  /* ------------------------------------------------------- range warnings */
  function dispP(psia, inp) { return fmt(U.pFromPsia(psia, inp.units, !!inp.gauge), 5) + ' ' + pressureLabel(inp); }
  function dispT(f, inp) { return fmt(U.tFromF(f, inp.units), 4) + ' ' + U.unit('T', inp.units); }
  function dispRs(v, inp) { return fmt(U.toDisplay('Rs', v, inp.units), 4) + ' ' + U.unit('Rs', inp.units); }
  var VAR_NAME = { T: 'Temperature', api: 'API gravity', gg: 'Gas gravity', rs: 'Rsb', p: 'Pressure', pb: 'Bubble point', ppr: 'Ppr', tpr: 'Tpr', yCO2: 'yCO2', yH2S: 'yH2S' };
  function rangeText(key, lo, hi, inp) {
    if (key === 'T') return dispT(lo, inp) + ' to ' + dispT(hi, inp);
    if (key === 'p' || key === 'pb') return dispP(lo, inp) + ' to ' + dispP(hi, inp);
    if (key === 'rs') return dispRs(lo, inp) + ' to ' + dispRs(hi, inp);
    return lo + ' to ' + hi;
  }
  function valText(key, v, inp) {
    if (key === 'T') return dispT(v, inp);
    if (key === 'p' || key === 'pb') return dispP(v, inp);
    if (key === 'rs') return dispRs(v, inp);
    return fmt(v, 4);
  }
  /* scalar checks: vars {T: 200, api: 35, ...}; pKey tells which variable the method's p range applies to */
  /* how far a range can be trusted (see VERIFY in pvt-correlations.js) */
  function rangeStatus(meta, k) { var v = meta && meta.verify; return (v && v.ranges && v.ranges[k]) || 'unverified'; }
  var RANGE_TAG = {
    corroborated: 'range corroborated by an independent source',
    unverified: 'reported range, not verified against the original publication',
    discrepancy: 'sources disagree on this limit'
  };
  function checkRange(warns, meta, label, vars, affects, inp) {
    if (!meta || !meta.range) return;
    Object.keys(meta.range).forEach(function (k) {
      var v = vars[k];
      if (!isNum(v)) return;
      var r = meta.range[k], st = rangeStatus(meta, k);
      if (v < r[0] || v > r[1]) {
        warns.push({ kind: 'range', status: st, method: label, msg: label + ': ' + (VAR_NAME[k] || k) + ' = ' + valText(k, v, inp) + ' is outside the data range ' + rangeText(k, r[0], r[1], inp) + ' (' + RANGE_TAG[st] + ').', affects: affects });
      }
    });
  }
  /* pressure-point checks: counts how many points fall outside */
  function checkPoints(warns, meta, label, key, values, affects, inp) {
    if (!meta || !meta.range || !meta.range[key]) return;
    var r = meta.range[key], st = rangeStatus(meta, key), out = values.filter(function (v) { return isNum(v) && (v < r[0] || v > r[1]); });
    if (out.length) {
      warns.push({ kind: 'range', status: st, method: label, msg: label + ': ' + out.length + ' point' + (out.length > 1 ? 's' : '') + ' with ' + (VAR_NAME[key] || key) + ' outside the data range ' + rangeText(key, r[0], r[1], inp) + ' (' + RANGE_TAG[st] + ').', affects: affects });
    }
  }

  /* ===================================================================== OIL */
  var OIL_DEFAULT_M = { rs: 'standing', bo: 'standing', co: 'vasquez_beggs', muDead: 'beal', muSat: 'beggs_robinson', muUnder: 'vasquez_beggs' };

  function oilContext(inp, bag) {
    var m = Object.assign({}, OIL_DEFAULT_M, inp.m || {});
    var ctx = { m: m };
    ctx.tF = temperatureF(bag, inp, 'T');
    ctx.gg = need(bag, inp, 'gg', 'Gas specific gravity', { gt0: true });
    if (inp.oilGravityBasis === 'density') {
      var rhoC = canon(inp, 'rhoSto');
      var rho = rhoC !== undefined ? (rhoC > 0 ? rhoC : (bag.add('rhoSto', 'Oil density must be greater than 0'), NaN)) : need(bag, inp, 'rhoSto', 'Oil density', { gt0: true });
      if (isNum(rho)) {
        var rhoLb = rhoC !== undefined ? rho : (inp.units === 'metric' ? rho / U.KGM3_PER_LBFT3 : rho);
        ctx.gammaO = rhoLb / RHO_W;
        ctx.api = 141.5 / ctx.gammaO - 131.5;
        ctx.apiKind = 'derived';
      }
    } else {
      var api = need(bag, inp, 'api', 'API gravity');
      if (isNum(api)) {
        if (!(api > -131.5)) bag.add('api', 'API must be greater than −131.5 (γo = 141.5/(API + 131.5) must be positive)');
        else { ctx.api = api; ctx.gammaO = 141.5 / (api + 131.5); ctx.apiKind = 'input'; }
      }
    }
    /* separator gas gravity for Vasquez-Beggs */
    ctx.ggs = ctx.gg; ctx.ggsKind = 'assumed';
    if (inp.sepUse) {
      var psA = absPressure(bag, inp, 'psep', 'Separator pressure');
      var ts = temperatureF(bag, inp, 'tsep');
      if (isNum(psA) && isNum(ts) && isNum(ctx.gg) && isNum(ctx.api)) {
        ctx.psep = psA; ctx.tsep = ts;
        ctx.ggs = C.oil.vbGammaGs(ctx.gg, ctx.api, psA, ts);
        ctx.ggsKind = 'derived';
        if (!(ctx.ggs > 0)) bag.add('psep', 'Separator correction gives γgs ≤ 0; check separator conditions');
      }
    }
    ctx.char = inp.oilChar === 'rsb' ? 'rsb' : 'pb';
    if (ctx.char === 'pb') {
      ctx.pb = absPressure(bag, inp, 'pb', 'Bubble-point pressure');
    } else {
      var rsbC = canon(inp, 'rsb');
      if (rsbC !== undefined) { if (rsbC > 0) ctx.rsb = rsbC; else bag.add('rsb', 'Solution GOR at bubble point must be greater than 0'); }
      else {
        var rsbv = need(bag, inp, 'rsb', 'Solution GOR at bubble point', { gt0: true });
        if (isNum(rsbv)) ctx.rsb = U.fromDisplay('Rs', rsbv, inp.units);
      }
    }
    return ctx;
  }

  /* gas gravity each Rs/Bo method uses */
  function ggFor(method, ctx) { return method === 'vasquez_beggs' ? ctx.ggs : ctx.gg; }

  function oilEvaluate(inp, ctx, ps, res) {
    var m = ctx.m, M = C.META, warns = res.warnings;
    var rsF = C.oil.rs[m.rs], pbF = C.oil.pb[m.rs], boF = C.oil.bo[m.bo];
    var tF = ctx.tF, api = ctx.api, gRs = ggFor(m.rs, ctx), gBo = ggFor(m.bo, ctx);
    var rsLabel = M.rsFamily[m.rs].label, boLabel = M.bo[m.bo].label;

    /* --- characterisation: one independent input, the other derived (never from the current p) --- */
    var pb, rsb, scale = 1;
    if (ctx.char === 'pb') {
      pb = ctx.pb;
      rsb = rsF(pb, tF, api, gRs);
      res.scalars.push({ key: 'pb', label: 'Bubble-point pressure, pb', q: 'p', v: pb, kind: 'input', method: 'Measured / entered value' });
      res.scalars.push({ key: 'rsb', label: 'Solution GOR at pb, Rsb', q: 'Rs', v: rsb, kind: 'correlation', method: rsLabel + ' Rs evaluated at pb' });
    } else {
      rsb = ctx.rsb;
      pb = pbF(rsb, tF, api, gRs);
      res.scalars.push({ key: 'rsb', label: 'Solution GOR at pb, Rsb', q: 'Rs', v: rsb, kind: 'input', method: 'Measured / entered value' });
      res.scalars.push({ key: 'pb', label: 'Bubble-point pressure, pb', q: 'p', v: pb, kind: 'correlation', method: rsLabel + ' pb from Rsb' });
    }
    if (!(pb > 0) || !(rsb > 0)) {
      res.ok = false;
      res.errors.push({ field: ctx.char === 'pb' ? 'pb' : 'rsb', label: FIELD_LABEL[ctx.char === 'pb' ? 'pb' : 'rsb'], kind: 'failure', msg: rsLabel + ' gives ' + (ctx.char === 'pb' ? 'Rsb' : 'pb') + ' ≤ 0 for these inputs — the fluid cannot be characterised with this correlation.' });
      return;
    }
    /* saturated Rs is scaled so Rs(pb) = Rsb exactly (published inverses are rounded) */
    var rsAtPb = rsF(pb, tF, api, gRs);
    scale = rsb / rsAtPb;
    res.pb = pb; res.rsb = rsb;

    /* insert pb into the evaluation set when it falls inside the requested pressures */
    /* pb in the evaluation set: a point within P_TOL of pb (grid point, endpoint, list value or the
       single pressure) becomes exactly pb; otherwise pb is inserted when it lies inside the range.
       Never for noInsert runs (measured data is evaluated at the measured pressures). */
    var list = ps.slice(), inserted = -1;
    if (!inp.noInsert) {
      var near = -1;
      list.forEach(function (x, i) { if (Math.abs(x - pb) <= P_TOL && (near < 0 || Math.abs(x - pb) < Math.abs(list[near] - pb))) near = i; });
      if (near >= 0) list[near] = pb;
      else if ((inp.calcMode || 'single') !== 'single' && list.length > 1 && pb > list[0] && pb < list[list.length - 1]) {
        list.push(pb); list.sort(function (a, b) { return a - b; }); inserted = list.indexOf(pb);
      }
    }

    var bob = boF(rsb, tF, api, gBo);
    var muDeadF = C.oil.muDead[m.muDead];
    var muod = muDeadF(tF, api);
    var muob = C.oil.satBeggsRobinson(muod, rsb);
    var coLabel = M.co[m.co].label;
    var gCo = m.co === 'vasquez_beggs' ? ctx.ggs : ctx.gg;

    res.scalars.unshift(
      { key: 'api', label: 'API gravity', q: 'none', v: api, kind: ctx.apiKind, method: ctx.apiKind === 'derived' ? 'From stock-tank oil density: γo = ρo/62.4, API = 141.5/γo − 131.5' : 'Entered value', unitText: '°API' },
      { key: 'gammaO', label: 'Oil specific gravity, γo', q: 'none', v: ctx.gammaO, kind: 'derived', method: 'γo = 141.5/(API + 131.5)', unitText: 'water = 1' },
      { key: 'gg', label: 'Gas specific gravity, γg', q: 'none', v: ctx.gg, kind: 'input', method: 'Entered value', unitText: 'air = 1' }
    );
    if (m.rs === 'vasquez_beggs' || m.bo === 'vasquez_beggs' || m.co === 'vasquez_beggs') {
      res.scalars.push({ key: 'ggs', label: 'Separator gas gravity, γgs (100 psig basis)', q: 'none', v: ctx.ggs, kind: ctx.ggsKind === 'derived' ? 'derived' : 'assumed',
        method: ctx.ggsKind === 'derived' ? 'γgs = γg·[1 + 5.912×10⁻⁵·API·Tsep·log(psep/114.7)]' : 'Assumed equal to γg (no separator conditions entered)', unitText: 'air = 1' });
    }
    res.scalars.push(
      { key: 'bob', label: 'Oil FVF at pb, Bob', q: 'Bo', v: bob, kind: 'correlation', method: boLabel + ' at Rsb' },
      { key: 'muod', label: 'Dead-oil viscosity, μod', q: 'mu', v: muod, kind: 'correlation', method: M.muDead[m.muDead].label },
      { key: 'muob', label: 'Oil viscosity at pb, μob', q: 'mu', v: muob, kind: 'correlation', method: M.muSat[m.muSat].label + ' at Rsb' },
      { key: 'rsScale', label: 'Rs continuity factor, Rsb / Rs_corr(pb)', q: 'none', v: scale, kind: 'derived', method: 'Applied to saturated Rs so that Rs(pb) = Rsb', unitText: '–' }
    );

    var keys = ['rs', 'bo', 'mu', 'co'];
    keys.forEach(function (k) { res.props[k].values = []; res.props[k].reasons = []; });
    res.phase = []; res.inserted = inserted;

    list.forEach(function (p) {
      var ph = phaseOf(p, pb), sat = ph === 'saturated';
      res.phase.push(ph);
      var rs, bo, mu, co, why = {};
      if (sat) {
        rs = scale * rsF(p, tF, api, gRs);
        bo = boF(rs, tF, api, gBo);
        mu = C.oil.satBeggsRobinson(muod, rs);
        co = NaN; why.co = 'Not calculated below pb: the saturated (apparent) oil compressibility needs the liberated-gas Bg and dBo/dp, dRs/dp, which these inputs do not define.';
      } else {
        rs = rsb;
        bo = C.oil.boAbove[m.co](p, pb, bob, rsb, tF, api, gCo);
        mu = C.oil.underVB(muob, p, pb);
        co = C.oil.co[m.co](p, rsb, tF, api, gCo);
        if (!(co > 0)) { why.co = coLabel + ' gives co ≤ 0 for these inputs (outside its usable domain).'; co = NaN; why.bo = 'Bo above pb needs a positive co.'; bo = NaN; }
      }
      if (!isNum(rs) || rs < 0) { why.rs = rsLabel + ' cannot be evaluated here (outside its mathematical domain).'; rs = NaN; }
      if (!isNum(bo)) { why.bo = why.bo || boLabel + ' cannot be evaluated here.'; bo = NaN; }
      if (!isNum(mu)) { why.mu = 'Viscosity chain cannot be evaluated (dead-oil correlation outside its mathematical domain).'; mu = NaN; }
      push(res, 'rs', rs, why.rs); push(res, 'bo', bo, why.bo); push(res, 'mu', mu, why.mu); push(res, 'co', co, why.co);
    });
    res.pressures = list;

    /* --- applicability warnings --- */
    var sv = { T: tF, api: api, gg: ctx.gg, rs: rsb };
    var rsMeta = M.rsFamily[m.rs];
    checkRange(warns, rsMeta, rsLabel + ' (Rs / pb)', Object.assign({}, sv, { gg: gRs, pb: pb }), ['Rs', 'pb', 'Bo', 'μo'], inp);
    checkRange(warns, M.bo[m.bo], boLabel + ' (Bo)', Object.assign({}, sv, { gg: gBo }), ['Bo'], inp);
    var above = list.filter(function (p) { return p > pb; }), below = list.filter(function (p) { return p <= pb; });
    if (above.length) {
      checkRange(warns, { range: omit(M.co[m.co].range, 'p') }, coLabel + ' (co, Bo above pb)', Object.assign({}, sv, { gg: gCo }), ['co', 'Bo above pb'], inp);
      checkPoints(warns, M.co[m.co], coLabel + ' (co, Bo above pb)', 'p', above, ['co', 'Bo above pb'], inp);
      checkRange(warns, { range: omit(M.muUnder.vasquez_beggs.range, 'p') }, 'Vasquez-Beggs (μo above pb)', sv, ['μo above pb'], inp);
      checkPoints(warns, M.muUnder.vasquez_beggs, 'Vasquez-Beggs (μo above pb)', 'p', above, ['μo above pb'], inp);
    }
    checkRange(warns, M.muDead[m.muDead], M.muDead[m.muDead].label + ' (μod)', sv, ['μo'], inp);
    checkRange(warns, { range: omit(M.muSat.beggs_robinson.range, 'p') }, 'Beggs-Robinson (μo)', sv, ['μo'], inp);
    if (below.length) checkPoints(warns, M.muSat.beggs_robinson, 'Beggs-Robinson (μo)', 'p', below, ['μo below pb'], inp);
  }

  function omit(o, k) { var r = {}; Object.keys(o || {}).forEach(function (x) { if (x !== k) r[x] = o[x]; }); return r; }
  function push(res, k, v, why) { res.props[k].values.push(isNum(v) ? v : null); res.props[k].reasons.push(isNum(v) ? null : (why || 'Not available')); }

  /* ===================================================================== GAS */
  var GAS_DEFAULT_M = { pc: 'standing_natural', sour: 'none', z: 'dak', mu: 'lee_gonzalez_eakin' };

  /* the component table writes formulas with Unicode subscripts (CO₂): compare on a plain form */
  function normFormula(f) {
    return String(f || '').replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 8320); }).replace(/\s+/g, '').toUpperCase();
  }
  function resolveComponent(name, formula) {
    var db = COMP_DB || root.PURE_COMPONENTS;
    if (!db) return null;
    var nn = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    var ff = normFormula(formula);
    for (var i = 0; i < db.length; i++) {
      var r = db[i];
      if (nn && String(r.compound).toLowerCase() === nn) return r;
    }
    if (ff) for (var j = 0; j < db.length; j++) if (normFormula(db[j].formula) === ff) return db[j];
    return null;
  }

  function composition(inp, bag) {
    var rows = inp.comp || [];
    var factor = inp.compBasis === 'percent' ? 0.01 : 1;
    var entries = [], bad = false;
    rows.forEach(function (row, i) {
      var nameTxt = String(row.name || '').trim(), formTxt = String(row.formula || '').trim();
      var r = parse(row.y);
      if (!nameTxt && !formTxt && r.state === 'empty') return;
      var tag = 'Row ' + (i + 1) + ': ';
      if (r.state === 'empty') { bag.add('comp', tag + 'mole ' + (factor === 1 ? 'fraction' : 'percentage') + ' required'); bad = true; return; }
      if (r.state === 'bad') { bag.add('comp', tag + 'mole value is not a number'); bad = true; return; }
      if (r.v < 0) { bag.add('comp', tag + 'mole value cannot be negative'); bad = true; return; }
      var rec = resolveComponent(nameTxt, formTxt);
      if (!rec) { bag.add('comp', tag + 'component "' + (nameTxt || formTxt) + '" not found in the component table'); bad = true; return; }
      if (!(rec.mw_lb_lbmol > 0) || !(rec.pc_psia > 0) || !(rec.tc_r > 0)) { bag.add('comp', tag + rec.compound + ' has no Mw / Pc / Tc in the component table'); bad = true; return; }
      if (r.v === 0) return;
      entries.push({ row: i + 1, name: rec.compound, formula: rec.formula, yIn: r.v, y: r.v * factor, mw: rec.mw_lb_lbmol, pc: rec.pc_psia, tc: rec.tc_r });
    });
    if (bad) return null;
    if (!entries.length) { bag.add('comp', 'Enter at least one component'); return null; }
    var sum = entries.reduce(function (s, e) { return s + e.y; }, 0);
    var normalized = false;
    if (Math.abs(sum - 1) > COMP_TOL) {
      if (!inp.normalize) {
        bag.add('comp', 'Mole ' + (factor === 1 ? 'fractions' : 'percentages') + ' total ' + fmt(sum / factor, 5) + ' (must be ' + (factor === 1 ? '1' : '100') + ' ± ' + (COMP_TOL / factor) + '). Correct the entries or enable normalisation.');
        return null;
      }
      entries.forEach(function (e) { e.y = e.y / sum; });
      normalized = true;
    }
    var yOf = function (f) { return entries.filter(function (e) { return normFormula(e.formula) === f; }).reduce(function (s, e) { return s + e.y; }, 0); };
    return { entries: entries, sum: sum, normalized: normalized,
      ma: entries.reduce(function (s, e) { return s + e.y * e.mw; }, 0),
      yCO2: yOf('CO2'), yH2S: yOf('H2S'), yN2: yOf('N2') };
  }

  function sourInput(bag, inp, f) {
    var r = parse(inp[f]);
    if (r.state === 'empty') { bag.add(f, 'Input required (enter 0 if absent)'); return NaN; }
    if (r.state === 'bad') { bag.add(f, 'Enter a number'); return NaN; }
    var y = inp.sourBasis === 'percent' ? r.v / 100 : r.v;
    if (y < 0 || y > 1) { bag.add(f, 'Must be between 0 and ' + (inp.sourBasis === 'percent' ? '100 %' : '1')); return NaN; }
    return y;
  }

  function gasContext(inp, bag) {
    var m = Object.assign({}, GAS_DEFAULT_M, inp.m || {});
    var ctx = { m: m, ideal: inp.behavior === 'ideal' };
    ctx.tF = temperatureF(bag, inp, 'T');
    ctx.tR = isNum(ctx.tF) ? U.fToR(ctx.tF) : NaN;
    if (inp.gasBasis === 'composition') {
      var comp = composition(inp, bag);
      if (comp) { ctx.comp = comp; ctx.ma = comp.ma; ctx.gg = comp.ma / MW_AIR; ctx.ggKind = 'derived'; ctx.yCO2 = comp.yCO2; ctx.yH2S = comp.yH2S; ctx.yN2 = comp.yN2; }
    } else {
      ctx.gg = need(bag, inp, 'gg', 'Gas specific gravity', { gt0: true });
      if (isNum(ctx.gg)) { ctx.ma = MW_AIR * ctx.gg; ctx.ggKind = 'input'; }
      if (m.pc === 'kay') bag.add('pcMethod', 'Kay mixing needs a gas composition — switch the gas description to Composition');
      if (m.sour !== 'none') {
        ctx.yCO2 = sourInput(bag, inp, 'yCO2');
        ctx.yH2S = sourInput(bag, inp, 'yH2S');
        ctx.yN2 = m.sour === 'carr_kobayashi_burrows' ? sourInput(bag, inp, 'yN2') : 0;
        if (isNum(ctx.yCO2) && isNum(ctx.yH2S) && isNum(ctx.yN2) && ctx.yCO2 + ctx.yH2S + ctx.yN2 > 1) bag.add('yCO2', 'yCO2 + yH2S + yN2 cannot exceed 1');
      }
    }
    /* Carr-Kobayashi-Burrows adjusts gas-gravity pseudo-criticals for non-hydrocarbons; Kay mixing already
       includes their Tc / Pc, so applying it there double-counts them (5.95 % vs 4.01 % uncorrected
       against GERG-2008 for the sour reference gas — see VERIFY.sour) */
    if (m.sour === 'carr_kobayashi_burrows' && m.pc === 'kay') bag.add('sourMethod', 'Carr-Kobayashi-Burrows corrects gas-gravity pseudo-criticals. Kay mixing already includes CO2, H2S and N2 — use Wichert-Aziz or no correction with Kay.');
    if (!ctx.ideal && m.z === 'manual') {
      if ((inp.calcMode || 'single') !== 'single') bag.add('zMethod', 'A manual chart Z is one value at one pressure: it cannot define a Z-versus-pressure curve or its derivative. Use single-pressure mode or choose a Z correlation.');
      ctx.zManual = need(bag, inp, 'zManual', 'Z', { gt0: true });
    }
    return ctx;
  }

  function gasPseudoCriticals(ctx) {
    var m = ctx.m, pc;
    if (m.pc === 'kay') pc = C.gas.pcKay(ctx.comp.entries);
    else pc = C.gas.pc[m.pc](ctx.gg);
    var out = { ppc0: pc.ppc, tpc0: pc.tpc, ppc: pc.ppc, tpc: pc.tpc, eps: null };
    if (m.sour === 'wichert_aziz') {
      var wa = C.gas.wichertAziz(pc.ppc, pc.tpc, ctx.yCO2 || 0, ctx.yH2S || 0);
      out.ppc = wa.ppc; out.tpc = wa.tpc; out.eps = wa.eps;
    } else if (m.sour === 'carr_kobayashi_burrows') {
      var ck = C.gas.carrKobayashiBurrows(pc.ppc, pc.tpc, ctx.yCO2 || 0, ctx.yH2S || 0, ctx.yN2 || 0);
      out.ppc = ck.ppc; out.tpc = ck.tpc;
    }
    return out;
  }

  function zAt(ctx, pc, p) {
    if (ctx.ideal) return 1;
    if (ctx.m.z === 'manual') return ctx.zManual;
    return C.gas.z[ctx.m.z](p / pc.ppc, ctx.tR / pc.tpc);
  }

  function gasEvaluate(inp, ctx, ps, res) {
    var M = C.META, m = ctx.m, warns = res.warnings;
    var pc = gasPseudoCriticals(ctx);
    if (!(pc.ppc > 0) || !(pc.tpc > 0)) {
      res.ok = false;
      res.errors.push({ field: 'pcMethod', label: FIELD_LABEL.pcMethod, kind: 'failure', msg: 'Pseudo-critical properties are not positive (Ppc = ' + fmt(pc.ppc) + ' psia, Tpc = ' + fmt(pc.tpc) + ' °R). Check gas gravity and the sour-gas correction inputs.' });
      return;
    }
    res.pc = pc;
    var std = res.std;   // Bg / Eg on the selected standard basis (gas at standard conditions taken as ideal)
    var zLabel = ctx.ideal ? 'Ideal gas (Z = 1)' : M.z[m.z].label;
    res.scalars.push(
      { key: 'ma', label: 'Apparent molecular weight, Ma', q: 'none', v: ctx.ma, kind: ctx.ggKind === 'input' ? 'derived' : 'derived', method: ctx.ggKind === 'input' ? 'Ma = 28.96·γg' : 'Ma = Σ yi·Mi', unitText: 'lb/lbmol' },
      { key: 'gg', label: 'Gas specific gravity, γg', q: 'none', v: ctx.gg, kind: ctx.ggKind, method: ctx.ggKind === 'input' ? 'Entered value' : 'γg = Ma/28.96', unitText: 'air = 1' },
      { key: 'ppc0', label: 'Pseudo-critical pressure, Ppc', q: 'pAbsOnly', v: pc.ppc0, kind: 'correlation', method: M.pc[m.pc].label },
      { key: 'tpc0', label: 'Pseudo-critical temperature, Tpc', q: 'tAbs', v: pc.tpc0, kind: 'correlation', method: M.pc[m.pc].label }
    );
    if (m.sour !== 'none') {
      res.scalars.push(
        { key: 'ysour', label: 'Non-hydrocarbons (yCO2 / yH2S / yN2)', q: 'text', v: fmt(ctx.yCO2 || 0, 4) + ' / ' + fmt(ctx.yH2S || 0, 4) + (m.sour === 'carr_kobayashi_burrows' ? ' / ' + fmt(ctx.yN2 || 0, 4) : ''), kind: ctx.comp ? 'derived' : 'input', method: ctx.comp ? 'From composition' : 'Entered values (mole fraction)', unitText: 'mole fraction' },
        { key: 'ppc', label: "Corrected pseudo-critical pressure, Ppc'", q: 'pAbsOnly', v: pc.ppc, kind: 'correlation', method: M.sour[m.sour].label },
        { key: 'tpc', label: "Corrected pseudo-critical temperature, Tpc'", q: 'tAbs', v: pc.tpc, kind: 'correlation', method: M.sour[m.sour].label }
      );
      if (pc.eps !== null) res.scalars.push({ key: 'eps', label: 'Wichert-Aziz adjustment, ε', q: 'dT', v: pc.eps, kind: 'correlation', method: 'Wichert-Aziz (1972)' });
    }
    res.scalars.push({ key: 'tpr', label: 'Pseudo-reduced temperature, Tpr', q: 'none', v: ctx.tR / pc.tpc, kind: 'derived', method: 'Tpr = T/Tpc' + (m.sour !== 'none' ? "'" : ''), unitText: '–' });
    if (ctx.comp && ctx.comp.normalized) res.info.push('Composition normalised: entered total ' + fmt(ctx.comp.sum / (inp.compBasis === 'percent' ? 0.01 : 1), 5) + (inp.compBasis === 'percent' ? ' %' : '') + ' scaled to 1.');
    if (!ctx.ideal && m.z === 'manual') res.info.push('Manual Z = ' + fmt(ctx.zManual, 4) + ' applies only at the entered pressure. cg needs dZ/dp and is not available from one chart reading.');

    ['z', 'bg', 'bgrb', 'eg', 'rho', 'v', 'mu', 'cg', 'ppr'].forEach(function (k) { res.props[k].values = []; res.props[k].reasons = []; });
    ps.forEach(function (p) {
      var ppr = p / pc.ppc, z = zAt(ctx, pc, p), why = null;
      /* reasons are per cause (not per point) so the UI can group them; Ppr / Tpr are in the point detail */
      if (!isNum(z)) why = zLabel + ' returns no value here (outside its mathematical domain or no convergence).';
      else if (!(z > 0)) { why = zLabel + ' gives Z ≤ 0 here — not physical; the correlation is outside its usable domain.'; z = NaN; }
      var bg = std.pPsia * z * ctx.tR / (std.tR * p);
      var rho = p * ctx.ma / (z * R_GAS * ctx.tR);
      var mu = C.gas.muLGE(ctx.tR, ctx.ma, rho * LBFT3_TO_GCC);
      var cg, cgWhy = why;
      if (ctx.ideal) cg = 1 / p;
      else if (m.z === 'manual') { cg = NaN; cgWhy = 'cg = 1/p − (1/Z)(dZ/dp) needs Z as a function of pressure; one chart reading does not define dZ/dp.'; }
      else if (isNum(z)) {
        var h = Math.max(1e-3 * p, 1e-3), z1 = zAt(ctx, pc, p - h), z2 = zAt(ctx, pc, p + h);
        cg = (isNum(z1) && isNum(z2) && z1 > 0 && z2 > 0) ? 1 / p - (z2 - z1) / (2 * h) / z : NaN;
        if (!isNum(cg)) cgWhy = 'dZ/dp cannot be evaluated around this point (neighbouring Z values unavailable).';
      } else cg = NaN;
      push(res, 'ppr', ppr, null);
      push(res, 'z', z, why); push(res, 'bg', bg, why); push(res, 'bgrb', bg / U.FT3_PER_BBL, why);
      push(res, 'eg', 1 / bg, why); push(res, 'rho', rho, why); push(res, 'v', 1 / rho, why);
      push(res, 'mu', mu, why || (isNum(mu) ? null : 'Lee-Gonzalez-Eakin cannot be evaluated here.'));
      push(res, 'cg', cg, cgWhy);
    });
    res.pressures = ps.slice();

    /* --- applicability --- */
    if (m.pc === 'sutton') checkRange(warns, M.pc.sutton, 'Sutton (1985) pseudo-criticals', { gg: ctx.gg }, ['all gas properties'], inp);
    if (m.sour === 'wichert_aziz') checkRange(warns, M.sour.wichert_aziz, 'Wichert-Aziz (1972)', { yCO2: ctx.yCO2, yH2S: ctx.yH2S }, ['all gas properties'], inp);
    if (m.sour === 'none' && ((ctx.yCO2 || 0) + (ctx.yH2S || 0)) > 0) warns.push({ kind: 'accuracy', method: 'Sour gas', msg: 'The gas contains CO2 / H2S but no sour-gas correction is selected. For the 23 % acid-gas reference gas the uncorrected Z was 4 % (max 7.6 %) off GERG-2008; Wichert-Aziz brought it within 1.5 %.', affects: ['all gas properties'] });
    var tpr = ctx.tR / pc.tpc, pprMax = Math.max.apply(null, res.props.ppr.values), ZA = ['Z and dependent properties'];
    if (!ctx.ideal && m.z === 'dak') {
      checkRange(warns, { range: { tpr: M.z.dak.range.tpr }, verify: M.z.dak.verify }, 'Dranchuk-Abou-Kassem', { tpr: tpr }, ZA, inp);
      checkPoints(warns, M.z.dak, 'Dranchuk-Abou-Kassem', 'ppr', res.props.ppr.values, ZA, inp);
      if (tpr < 1.2) warns.push({ kind: 'accuracy', method: 'Dranchuk-Abou-Kassem', msg: 'Near-critical conditions (Tpr = ' + fmt(tpr, 3) + ' < 1.2): DAK differs from the Standing-Katz chart by 3.2 % on average and up to 18 % here (Ppr 1.3–3). Treat Z and cg as approximate.', affects: ZA });
    }
    if (!ctx.ideal && m.z === 'papay' && (tpr < 1.2 || pprMax > 3)) warns.push({ kind: 'accuracy', method: 'Papay', msg: 'Papay against the Standing-Katz chart: average error 3.8–4.7 % for Ppr 3–10 and 54 % above Ppr 10 (40 % for Tpr < 1.2); its cg can be far off. Here Tpr = ' + fmt(tpr, 3) + ', max Ppr = ' + fmt(pprMax, 3) + '. Prefer Dranchuk-Abou-Kassem.', affects: ZA });
    if (!ctx.ideal && m.z === 'beggs_brill' && (tpr < 1.2 || pprMax > 3)) warns.push({ kind: 'accuracy', method: 'Beggs-Brill', msg: 'Beggs-Brill against the Standing-Katz chart: deviations up to 87–97 % and Z ≤ 0 at some points for Ppr 3–10. Here Tpr = ' + fmt(tpr, 3) + ', max Ppr = ' + fmt(pprMax, 3) + '. Prefer Dranchuk-Abou-Kassem.', affects: ZA });
    if (m.pc !== 'kay' && m.sour !== 'none' && ((ctx.yCO2 || 0) + (ctx.yH2S || 0)) > 0.05) warns.push({ kind: 'accuracy', method: 'Sour gas', msg: 'Gas-gravity pseudo-criticals with a sour correction were 3.7–5.3 % off in Z against GERG-2008 for a gas with 23 % CO2 + H2S; composition + Kay + Wichert-Aziz was within 1.5 %. Enter the composition for strongly sour gas.', affects: ['all gas properties'] });
    checkRange(warns, { range: { T: M.muGas.lee_gonzalez_eakin.range.T } }, 'Lee-Gonzalez-Eakin (μg)', { T: ctx.tF }, ['μg'], inp);
    checkPoints(warns, M.muGas.lee_gonzalez_eakin, 'Lee-Gonzalez-Eakin (μg)', 'p', ps, ['μg'], inp);
    if ((ctx.yH2S || 0) > 0) warns.push({ kind: 'accuracy', method: 'Lee-Gonzalez-Eakin (μg)', msg: 'μg for a gas containing H2S: Lee-Gonzalez-Eakin was checked here only against methane; its accuracy for sour gas is not established.', affects: ['μg'] });
  }

  /* ============================================================ property tables */
  var PROPS = {
    oil: {
      rs: { label: 'Solution gas-oil ratio', sym: 'Rs', q: 'Rs' },
      bo: { label: 'Oil formation volume factor', sym: 'Bo', q: 'Bo' },
      mu: { label: 'Oil viscosity', sym: 'μo', q: 'mu' },
      co: { label: 'Oil compressibility (undersaturated)', sym: 'co', q: 'comp' }
    },
    gas: {
      z: { label: 'Compressibility factor', sym: 'Z', q: 'none' },
      bg: { label: 'Gas formation volume factor', sym: 'Bg', q: 'Bg' },
      rho: { label: 'Gas density', sym: 'ρg', q: 'density' },
      mu: { label: 'Gas viscosity', sym: 'μg', q: 'mu' },
      cg: { label: 'Isothermal gas compressibility', sym: 'cg', q: 'comp' },
      ppr: { label: 'Pseudo-reduced pressure', sym: 'Ppr', q: 'none', table: true },
      bgrb: { label: 'Gas FVF (reservoir barrels)', sym: 'Bg', q: 'BgRb', table: true },
      eg: { label: 'Gas expansion factor', sym: 'Eg', q: 'Eg', table: true },
      v: { label: 'Specific volume', sym: 'v', q: 'v', table: true }
    }
  };

  /* ============================================================ run */
  function run(inp) {
    inp = inp || {};
    var fluid = inp.fluid === 'gas' ? 'gas' : 'oil';
    var bag = new Bag();
    var ps = pressureSet(bag, inp);
    var ctx = fluid === 'oil' ? oilContext(inp, bag) : gasContext(inp, bag);
    var res = { ok: bag.list.length === 0, fluid: fluid, units: inp.units === 'metric' ? 'metric' : 'field', gauge: !!inp.gauge,
      calcMode: inp.calcMode || 'single', errors: bag.list.slice(), fieldErrors: bag.byField,
      warnings: [], info: [], scalars: [], props: {}, pressures: [], ctx: ctx, input: inp,
      /* oil results are always on the correlation basis; gas Bg / Eg follow the selected basis */
      std: fluid === 'gas' ? U.stdBasis(inp.stdBasis) : U.STD_BASES.corr };
    Object.keys(PROPS[fluid]).forEach(function (k) { res.props[k] = Object.assign({ key: k, values: [], reasons: [] }, PROPS[fluid][k]); });
    if (!res.ok) return res;
    if (bag.merged) res.info.push(bag.merged + ' pasted pressure' + (bag.merged > 1 ? 's' : '') + ' within ' + P_TOL + ' psi of another were merged (one calculated point per pressure).');
    if (fluid === 'oil') oilEvaluate(inp, ctx, ps, res); else gasEvaluate(inp, ctx, ps, res);
    res.methods = methodSummary(fluid, ctx);
    return res;
  }

  function methodSummary(fluid, ctx) {
    var M = C.META, m = ctx.m;
    if (fluid === 'oil') return [
      ['Rs / pb', M.rsFamily[m.rs].label], ['Bo (p ≤ pb)', M.bo[m.bo].label], ['co and Bo (p > pb)', M.co[m.co].label],
      ['Dead-oil μ', M.muDead[m.muDead].label], ['Saturated μ', M.muSat[m.muSat].label], ['Undersaturated μ', M.muUnder[m.muUnder].label]];
    return [
      ['Gas model', ctx.ideal ? 'Ideal gas (Z = 1)' : 'Real gas'], ['Pseudo-criticals', M.pc[m.pc].label], ['Sour-gas correction', M.sour[m.sour].label],
      ['Z factor', ctx.ideal ? 'Z = 1 (ideal)' : M.z[m.z].label], ['Viscosity', M.muGas[m.mu].label]];
  }

  /* ============================================================ point detail
     Equation with substituted values for one point and one property (field units). */
  function detail(res, i, key) {
    if (!res || !res.ok || !res.pressures.length) return null;
    var p = res.pressures[i], ctx = res.ctx, m = ctx.m, M = C.META, L = [];
    var out = { p: p, key: key, lines: L, method: '', eq: '' };
    var f = function (x, s) { return fmt(x, s || 5); };
    if (res.fluid === 'oil') {
      var tF = ctx.tF, api = ctx.api, pb = res.pb, rsb = res.rsb, sat = phaseOf(p, pb) === 'saturated';
      var gRs = ggFor(m.rs, ctx), gBo = ggFor(m.bo, ctx);
      L.push('Inputs: p = ' + f(p) + ' psia,  T = ' + f(tF, 4) + ' °F,  API = ' + f(api, 4) + ',  γg = ' + f(ctx.gg, 4) + (m.rs === 'vasquez_beggs' || m.bo === 'vasquez_beggs' ? ',  γgs = ' + f(ctx.ggs, 4) : '') + ',  pb = ' + f(pb) + ' psia,  Rsb = ' + f(rsb) + ' scf/STB');
      L.push('State: ' + (sat ? 'p < pb → saturated oil' : 'p ≥ pb → undersaturated oil (composition fixed, Rs = Rsb)'));
      if (key === 'rs') {
        out.method = M.rsFamily[m.rs].label; out.eq = M.rsFamily[m.rs].eq;
        if (!sat) L.push('Rs = Rsb = ' + f(rsb) + ' scf/STB (no free gas above pb)');
        else {
          var raw = C.oil.rs[m.rs](p, tF, api, gRs), sc = rsb / C.oil.rs[m.rs](pb, tF, api, gRs);
          if (m.rs === 'standing') { var x = 0.0125 * api - 0.00091 * tF; L.push('x = 0.0125·' + f(api, 4) + ' − 0.00091·' + f(tF, 4) + ' = ' + f(x)); L.push('Rs_corr = ' + f(gRs, 4) + '·[(' + f(p) + '/18.2 + 1.4)·10^' + f(x) + ']^1.2048 = ' + f(raw)); }
          else if (m.rs === 'vasquez_beggs') { var c = api <= 30 ? [0.0362, 1.0937, 25.724] : [0.0178, 1.187, 23.931]; L.push('API ' + (api <= 30 ? '≤' : '>') + ' 30 → C1 = ' + c[0] + ', C2 = ' + c[1] + ', C3 = ' + c[2]); L.push('Rs_corr = ' + c[0] + '·' + f(gRs, 4) + '·' + f(p) + '^' + c[1] + '·exp(' + c[2] + '·' + f(api, 4) + '/' + f(tF + 460) + ') = ' + f(raw)); }
          else if (m.rs === 'glaso') { var xg = 2.8869 - Math.sqrt(14.1811 - 3.3093 * Math.log10(p)); L.push('x = 2.8869 − (14.1811 − 3.3093·log ' + f(p) + ')^0.5 = ' + f(xg)); L.push('Rs_corr = ' + f(gRs, 4) + '·[(' + f(api, 4) + '^0.989/' + f(tF, 4) + '^0.172)·10^' + f(xg) + ']^1.2255 = ' + f(raw)); }
          else if (m.rs === 'marhoun') { L.push('γo = ' + f(ctx.gammaO) + ',  T = ' + f(tF + 460) + ' °R'); L.push('Rs_corr = [185.843208·' + f(gRs, 4) + '^1.87784·' + f(ctx.gammaO) + '^−3.1437·' + f(tF + 460) + '^−1.32657·' + f(p) + ']^1.398441 = ' + f(raw)); }
          else { var xp = C.oil.pfX(api, tF); L.push('x = 7.916×10⁻⁴·' + f(api, 4) + '^1.5410 − 4.561×10⁻⁵·' + f(tF, 4) + '^1.3911 = ' + f(xp)); L.push('Rs_corr = [(' + f(p) + '/112.727 + 12.340)·' + f(gRs, 4) + '^0.8439·10^' + f(xp) + ']^1.73184 = ' + f(raw)); }
          L.push('Rs = Rs_corr × (Rsb/Rs_corr(pb)) = ' + f(raw) + ' × ' + f(sc, 7) + ' = ' + f(raw * sc) + ' scf/STB');
        }
      } else if (key === 'bo') {
        var rs = res.props.rs.values[i];
        if (sat) {
          out.method = M.bo[m.bo].label; out.eq = M.bo[m.bo].eq;
          if (m.bo === 'standing') { var t = rs * Math.sqrt(gBo / ctx.gammaO) + 1.25 * tF; L.push('Rs·(γg/γo)^0.5 + 1.25·T = ' + f(rs) + '·(' + f(gBo, 4) + '/' + f(ctx.gammaO) + ')^0.5 + 1.25·' + f(tF, 4) + ' = ' + f(t)); L.push('Bo = 0.9759 + 0.00012·' + f(t) + '^1.2 = ' + f(res.props.bo.values[i])); }
          else L.push('Bo = ' + M.bo[m.bo].label + '(Rs = ' + f(rs) + ', T = ' + f(tF, 4) + ' °F, API = ' + f(api, 4) + ', γg = ' + f(gBo, 4) + ') = ' + f(res.props.bo.values[i]));
        } else {
          var bob = scalar(res, 'bob'), gCo = m.co === 'vasquez_beggs' ? ctx.ggs : ctx.gg;
          out.method = M.co[m.co].label + ' (above pb)'; out.eq = M.co[m.co].eq;
          L.push('Bob = ' + M.bo[m.bo].label + '(Rsb) = ' + f(bob));
          if (m.co === 'vasquez_beggs') { var A = C.oil.vbCoA(rsb, tF, api, gCo); L.push('A = (−1433 + 5·' + f(rsb) + ' + 17.2·' + f(tF, 4) + ' − 1180·' + f(gCo, 4) + ' + 12.61·' + f(api, 4) + ')/10⁵ = ' + f(A)); L.push('Bo = ' + f(bob) + '·(' + f(pb) + '/' + f(p) + ')^' + f(A) + ' = ' + f(res.props.bo.values[i])); }
          else { var Ap = 1.705e-7 / 0.4094 * C.oil.pfCoK(rsb, tF, api, gCo); L.push('A = 4.1646×10⁻⁷·Rsb^0.69357·γg^0.1885·API^0.3272·T^0.6729 = ' + f(Ap)); L.push('Bo = ' + f(bob) + '·exp[−' + f(Ap) + '·(' + f(p) + '^0.4094 − ' + f(pb) + '^0.4094)] = ' + f(res.props.bo.values[i])); }
        }
      } else if (key === 'mu') {
        var muod = scalar(res, 'muod');
        out.method = M.muDead[m.muDead].label + ' → ' + (sat ? M.muSat[m.muSat].label : M.muUnder[m.muUnder].label);
        out.eq = M.muDead[m.muDead].eq + '\n' + (sat ? M.muSat[m.muSat].eq : M.muUnder[m.muUnder].eq);
        L.push('μod = ' + f(muod) + ' cP');
        if (sat) { var rs2 = res.props.rs.values[i], a = 10.715 * Math.pow(rs2 + 100, -0.515), b = 5.44 * Math.pow(rs2 + 150, -0.338); L.push('a = 10.715·(' + f(rs2) + ' + 100)^−0.515 = ' + f(a) + ',  b = 5.44·(' + f(rs2) + ' + 150)^−0.338 = ' + f(b)); L.push('μo = ' + f(a) + '·' + f(muod) + '^' + f(b) + ' = ' + f(res.props.mu.values[i]) + ' cP'); }
        else { var muob = scalar(res, 'muob'), me = C.oil.vbMuExponent(p); L.push('μob = ' + f(muob) + ' cP (Beggs-Robinson at Rsb)'); L.push('m = 2.6·' + f(p) + '^1.187·10^(−3.9×10⁻⁵·' + f(p) + ' − 5) = ' + f(me)); L.push('μo = ' + f(muob) + '·(' + f(p) + '/' + f(pb) + ')^' + f(me) + ' = ' + f(res.props.mu.values[i]) + ' cP'); }
      } else if (key === 'co') {
        out.method = M.co[m.co].label; out.eq = M.co[m.co].eq;
        if (sat) L.push(res.props.co.reasons[i]);
        else L.push('co = ' + f(res.props.co.values[i]) + ' 1/psi');
      }
    } else {
      var pc = res.pc, tR = ctx.tR, ppr = p / pc.ppc, tpr = tR / pc.tpc, z = res.props.z.values[i];
      L.push('Inputs: p = ' + f(p) + ' psia,  T = ' + f(tR) + ' °R,  γg = ' + f(ctx.gg, 4) + ',  Ma = ' + f(ctx.ma) + ' lb/lbmol');
      L.push('Ppc = ' + f(pc.ppc) + ' psia,  Tpc = ' + f(pc.tpc) + ' °R' + (m.sour !== 'none' ? ' (' + M.sour[m.sour].label + ' corrected)' : ''));
      L.push('Ppr = ' + f(p) + '/' + f(pc.ppc) + ' = ' + f(ppr) + ',  Tpr = ' + f(tR) + '/' + f(pc.tpc) + ' = ' + f(tpr));
      var zTxt = 'Z = ' + (isNum(z) ? f(z) : 'unavailable') + (ctx.ideal ? ' (ideal gas)' : ' (' + M.z[m.z].label + ')');
      if (key === 'z') {
        out.method = ctx.ideal ? 'Ideal gas' : M.z[m.z].label; out.eq = ctx.ideal ? 'Z = 1' : M.z[m.z].eq;
        if (!ctx.ideal && m.z === 'papay') L.push('Z = 1 − 3.53·' + f(ppr) + '/10^(0.9813·' + f(tpr) + ') + 0.274·' + f(ppr) + '²/10^(0.8157·' + f(tpr) + ') = ' + f(z));
        else if (!ctx.ideal && m.z === 'dak' && isNum(z)) L.push('ρr = 0.27·Ppr/(Z·Tpr) = ' + f(0.27 * ppr / (z * tpr)) + ' (converged)');
        L.push(zTxt);
      } else if (key === 'bg') {
        out.method = 'Real-gas law, standard volume on the ' + res.std.label; out.eq = 'Bg = (psc/Tsc)·Z·T/p   (gas at standard conditions taken as ideal)';
        L.push(zTxt); L.push('Bg = (' + f(res.std.pPsia, 6) + '/' + res.std.tR + ')·' + f(z) + '·' + f(tR) + '/' + f(p) + ' = ' + f(res.props.bg.values[i]) + ' ft³/scf');
      } else if (key === 'rho') {
        out.method = 'Real-gas law'; out.eq = 'ρg = p·Ma/(Z·R·T),  R = 10.7316 psia·ft³/(lbmol·°R)';
        L.push(zTxt); L.push('ρg = ' + f(p) + '·' + f(ctx.ma) + '/(' + f(z) + '·10.7316·' + f(tR) + ') = ' + f(res.props.rho.values[i]) + ' lbm/ft³');
      } else if (key === 'mu') {
        out.method = M.muGas[m.mu].label; out.eq = M.muGas[m.mu].eq;
        var rhoG = res.props.rho.values[i] * LBFT3_TO_GCC, ma = ctx.ma;
        var K = (9.379 + 0.01607 * ma) * Math.pow(tR, 1.5) / (209.2 + 19.26 * ma + tR), X = 3.448 + 986.4 / tR + 0.01009 * ma, Y = 2.447 - 0.2224 * X;
        L.push(zTxt + ',  ρg = ' + f(rhoG) + ' g/cm³');
        L.push('K = ' + f(K) + ',  X = ' + f(X) + ',  Y = ' + f(Y));
        L.push('μg = 10⁻⁴·' + f(K) + '·exp(' + f(X) + '·' + f(rhoG) + '^' + f(Y) + ') = ' + f(res.props.mu.values[i]) + ' cP');
      } else if (key === 'cg') {
        out.method = ctx.ideal ? 'Ideal gas' : 'Real gas, ' + M.z[m.z].label; out.eq = ctx.ideal ? 'cg = 1/p' : 'cg = 1/p − (1/Z)·(dZ/dp)_T;  dZ/dp by central difference (±0.1 % of p)';
        L.push(zTxt);
        if (isNum(res.props.cg.values[i])) L.push('cg = ' + f(res.props.cg.values[i]) + ' 1/psi'); else L.push(res.props.cg.reasons[i]);
      }
    }
    var r = res.props[key] && res.props[key].reasons[i];
    if (r) out.unavailable = r;
    return out;
  }
  function scalar(res, key) { var s = res.scalars.filter(function (x) { return x.key === key; })[0]; return s ? s.v : NaN; }

  /* example inputs that the UI writes into the visible fields on "Load example" */
  function example(fluid, units) {
    var met = units === 'metric';
    var P = function (psia) { return +U.pFromPsia(psia, met ? 'metric' : 'field', false).toFixed(met ? 2 : 0); };
    var T = function (f) { return +U.tFromF(f, met ? 'metric' : 'field').toFixed(1); };
    if (fluid === 'gas') return { T: T(200), gg: '0.65', p: P(3000), pMin: P(200), pMax: P(6000), pStep: met ? 15 : 200, pList: [1000, 2000, 3000, 4000].map(P).join(', ') };
    return { T: T(200), gg: '0.65', api: '35', rhoSto: met ? (53.04 * U.KGM3_PER_LBFT3).toFixed(1) : '53.04', pb: P(2200), rsb: met ? (500 * U.SM3SM3_PER_SCFSTB).toFixed(2) : '500',
      p: P(3000), pMin: P(200), pMax: P(5000), pStep: met ? 10 : 200, pList: [1000, 2000, 3000, 4000].map(P).join(', ') };
  }

  var PVTEngine = { FIELD_LABEL: FIELD_LABEL, run: run, P_TOL: P_TOL, phaseOf: phaseOf, detail: detail, example: example, parse: parse, fmt: fmt, PROPS: PROPS,
    OIL_DEFAULT_M: OIL_DEFAULT_M, GAS_DEFAULT_M: GAS_DEFAULT_M, MAX_POINTS: MAX_POINTS, MW_AIR: MW_AIR, resolveComponent: resolveComponent,
    setComponentDb: function (db) { COMP_DB = db; } };
  root.PVTEngine = PVTEngine;
  if (typeof module !== 'undefined' && module.exports) module.exports = PVTEngine;
})(typeof window !== 'undefined' ? window : globalThis);
