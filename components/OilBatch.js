/* ============================================================================
   VAPS PVT Nexus — OilBatch
   Multi-sample oil correlation evaluation: paste a measured PVT table and
   compare Rs / pb / Bo / μo correlations row by row, with the AAE per method.

   Mounted by components/PvtCalc.js inside the calculator's "Measured Data" view:
       OilBatch.mount(el)   /   OilBatch.unmount()

   Equations come from calc/pvt-correlations.js (PVTCorr), the same code the
   main calculator uses. Rows that cannot be evaluated are listed with their
   line number and reason; nothing is skipped silently. Styling: .oc-* in theme.css.
   ========================================================================= */
(function (global) {
  'use strict';

  var host = null;
  var mounted = false;
  var K = global.PVTCorr.oil;
  var P_ATM = global.PVTUnits.P_ATM_PSIA;   // gauge reference for the psig columns

  var state = {
    batchTab: 'rs',
    oilRsEval: { rows: [], aaes: {} },
    oilPbEval: { rows: [], aaes: {} },
    oilBoEval: { rows: [], aaes: {} },
    oilMuEval: { rows: [], aaes: {} },
    skips: { rs: [], pb: [], bo: [], mu: [] }
  };
  var lastSkips = [];

  /* ids are namespaced with oc- so they cannot collide with the app shell */
  function $(id) { return document.getElementById('oc-' + id); }

  function toNum(id) {
    var el = $(id);
    if (!el || el.value === '' || el.value === null) return NaN;
    var v = Number(el.value);
    return Number.isFinite(v) ? v : NaN;
  }

  function round(value, digits) {
    if (digits === undefined) digits = 5;
    if (!Number.isFinite(value)) return '-';
    return Number(value).toFixed(digits);
  }

  /* shared correlations (calc/pvt-correlations.js) */
  var standingRs = K.standingRs, vbRs = K.vbRs, marhounRs = K.marhounRs, petroskyFarshadRs = K.petroskyFarshadRs;
  var marhounPb = K.marhounPb, petroskyFarshadPb = K.petroskyFarshadPb;
  var standingBo = K.standingBo, vbBo = K.vbBo, glasoBo = K.glasoBo, marhounBo = K.marhounBo, petroskyFarshadBo = K.petroskyFarshadBo;
  var materialBalanceBo = K.materialBalanceBo;
  function deadOilViscosityByMethod(tF, api, method) { return (K.muDead[method] || K.muDead.beal)(tF, api); }
  function satOilViscosityByMethod(muDead, rs) { return K.satBeggsRobinson(muDead, rs); }
  /* undersaturated μo exists only above pb; without a pressure above pb there is no value */
  function underSatViscosityByMethod(muSat, p, pb) { return p > pb ? K.underVB(muSat, p, pb) : NaN; }

  /* ------------------------------------------------------- batch parsing */

  function parseOilEvaluationRows(text) {
    var lines = text.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!lines.length) return [];

    var rows = [];
    lastSkips = [];
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var cols = line.indexOf('|') !== -1
        ? line.split('|').map(function (s) { return s.trim(); }).filter(Boolean)
        : line.split(/\t|,|;/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (cols.every(function (c) { return /^:?-{2,}:?$/.test(c); })) continue;
      if (!cols.some(function (c) { return /\d/.test(c); })) continue;   // header line
      if (cols.length < 5) { lastSkips.push('Line ' + (li + 1) + ': needs at least 5 columns (found ' + cols.length + ').'); continue; }

      // Layout A (example table): Oil, T, pb, Rs_exp, ... , API, gg
      // Layout B (minimal): T, pb, Rs_exp, API, gg
      var parseNum = function (v) {
        var cleaned = String(v).replace(/[^0-9.+-]/g, '');
        if (!cleaned || cleaned === '+' || cleaned === '-' || cleaned === '.' || cleaned === '+.' || cleaned === '-.') return NaN;
        return Number(cleaned);
      };
      var tF, pbPsig, rsExp, boExp = NaN, rhoExp = NaN, api, gg, psep = NaN, tsep = NaN;
      if (cols.length >= 10) {
        tF = parseNum(cols[1]);
        pbPsig = parseNum(cols[2]);
        rsExp = parseNum(cols[3]);
        boExp = parseNum(cols[4]);
        rhoExp = parseNum(cols[5]);
        psep = parseNum(cols[cols.length - 4]);
        tsep = parseNum(cols[cols.length - 3]);
        api = parseNum(cols[cols.length - 2]);
        gg = parseNum(cols[cols.length - 1]);
      } else {
        tF = parseNum(cols[0]);
        pbPsig = parseNum(cols[1]);
        rsExp = parseNum(cols[2]);
        api = parseNum(cols[3]);
        gg = parseNum(cols[4]);
      }
      var bad = [['T', tF], ['pb', pbPsig], ['Rs', rsExp], ['API', api], ['γg', gg]].filter(function (x) { return !Number.isFinite(x[1]); }).map(function (x) { return x[0]; });
      if (bad.length) { lastSkips.push('Line ' + (li + 1) + ': column ' + bad.join(', ') + ' is not a number.'); continue; }
      if (tF <= 0 || rsExp <= 0 || api <= 0 || gg <= 0 || pbPsig + P_ATM <= 0) { lastSkips.push('Line ' + (li + 1) + ': T, Rs, API and γg must be > 0 and pb must be a positive absolute pressure.'); continue; }

      var pbPsia = pbPsig + P_ATM;
      var tR = tF + 460;
      var go = 141.5 / (api + 131.5);
      var rsStanding = standingRs(pbPsia, tF, api, gg);
      var vbGammaGs = Number.isFinite(psep) && Number.isFinite(tsep) && psep >= 0
        ? gg * (1 + 5.912e-5 * api * tsep * Math.log10((psep + P_ATM) / 114.7))
        : gg;
      var rsVB = vbRs(pbPsia, tF, api, vbGammaGs);
      var glasoX = 2.8869 - Math.sqrt(Math.max(14.1811 - 3.3093 * Math.log10(Math.max(pbPsia, 1e-6)), 1e-12));
      var glasoA = Math.pow(10, glasoX);
      var tTermF = Math.max(tF, 1e-6);
      var rsGlaso = gg * Math.pow((Math.pow(api, 0.989) / Math.pow(tTermF, 0.172)) * glasoA, 1.2255);
      var rsMarhoun = marhounRs(pbPsia, tF, api, gg);
      var pfX = 7.916e-4 * Math.pow(api, 1.5410) - 4.561e-5 * Math.pow(tF, 1.3911);
      var pfTenPowX = Math.pow(10, pfX);
      var rsPF = petroskyFarshadRs(pbPsia, tF, api, gg);
      var xStanding = 0.0125 * api - 0.00091 * tF;
      var tenPowXStanding = Math.pow(10, xStanding);
      var pbStandingTerm = Math.pow(rsExp / gg, 0.83) * Math.pow(10, 0.00091 * tF - 0.0125 * api);
      var pbStandingPred = 18.2 * (pbStandingTerm - 1.4);
      var vbTR = tF + 460;
      var vbApiGroup = api <= 30 ? '<=30 API' : '>30 API';
      var vbC1 = api <= 30 ? 0.0362 : 0.0178;
      var vbC2 = api <= 30 ? 1.0937 : 1.187;
      var vbC3 = api <= 30 ? 25.724 : 23.931;
      var pbVBBase = rsExp / (vbC1 * vbGammaGs * Math.exp((vbC3 * api) / vbTR));
      var pbVBPred = Math.pow(Math.max(pbVBBase, 1e-12), 1 / vbC2);
      var pbGlasoStar = Math.pow(rsExp / Math.max(gg, 1e-12), 0.816) * (Math.pow(tF, 0.172) / Math.pow(api, 0.989));
      var pbGlasoLogStar = Math.log10(Math.max(pbGlasoStar, 1e-12));
      var pbGlasoPred = Math.pow(10, 1.7669 + 1.7447 * pbGlasoLogStar - 0.30218 * Math.pow(pbGlasoLogStar, 2));
      var pbMarhounPred = marhounPb(rsExp, tF, api, gg);
      var pbPFX = 7.916e-4 * Math.pow(api, 1.5410) - 4.561e-5 * Math.pow(tF, 1.3911);
      var pbPFTenPowX = Math.pow(10, pbPFX);
      var pbPFRsPow = Math.pow(rsExp, 1 / 1.73184);
      var pbPFPred = petroskyFarshadPb(rsExp, tF, api, gg);
      var boStandingPred = standingBo(rsExp, tF, api, gg);
      var boVBPred = vbBo(rsExp, tF, api, vbGammaGs);
      var boGlasoPred = glasoBo(rsExp, tF, api, gg);
      var boMarhounPred = marhounBo(rsExp, tF, api, gg);
      var boPFPred = petroskyFarshadBo(rsExp, tF, api, gg);
      var boMBPred = materialBalanceBo(rsExp, api, gg, rhoExp);
      var err = function (v) { return rsExp !== 0 ? Math.abs((v - rsExp) / rsExp) * 100 : NaN; };
      var errSigned = function (v) { return rsExp !== 0 ? ((v - rsExp) / rsExp) * 100 : NaN; };
      var errPb = function (v) { return pbPsia !== 0 ? Math.abs((v - pbPsia) / pbPsia) * 100 : NaN; };
      var errPbSigned = function (v) { return pbPsia !== 0 ? ((v - pbPsia) / pbPsia) * 100 : NaN; };
      var errBo = function (v) { return (Number.isFinite(boExp) && boExp !== 0) ? Math.abs((v - boExp) / boExp) * 100 : NaN; };
      rows.push({
        tF: tF, tR: tR, go: go, pbPsig: pbPsig, pbPsia: pbPsia, rsExp: rsExp, boExp: boExp, rhoExp: rhoExp, api: api, gg: gg,
        pfX: pfX, pfTenPowX: pfTenPowX,
        pbStandingTerm: pbStandingTerm, pbStandingPred: pbStandingPred, pbVBBase: pbVBBase, pbVBPred: pbVBPred,
        pbGlasoStar: pbGlasoStar, pbGlasoLogStar: pbGlasoLogStar, pbGlasoPred: pbGlasoPred, pbMarhounPred: pbMarhounPred,
        pbPFX: pbPFX, pbPFTenPowX: pbPFTenPowX, pbPFRsPow: pbPFRsPow, pbPFPred: pbPFPred,
        boStandingPred: boStandingPred, boVBPred: boVBPred, boGlasoPred: boGlasoPred, boMarhounPred: boMarhounPred,
        boPFPred: boPFPred, boMBPred: boMBPred,
        vbApiGroup: vbApiGroup, vbPbC1: vbC1, vbPbC2: vbC2, vbPbC3: vbC3,
        xStanding: xStanding, tenPowXStanding: tenPowXStanding, glasoX: glasoX, glasoA: glasoA,
        vbGammaGs: vbGammaGs, rsStanding: rsStanding, rsVB: rsVB, rsGlaso: rsGlaso, rsMarhoun: rsMarhoun, rsPF: rsPF,
        errStanding: err(rsStanding),
        errVB: err(rsVB),
        errVBsigned: errSigned(rsVB),
        errGlaso: err(rsGlaso),
        errGlasoSigned: errSigned(rsGlaso),
        errMarhoun: err(rsMarhoun),
        errMarhounSigned: errSigned(rsMarhoun),
        errPF: err(rsPF),
        errPFsigned: errSigned(rsPF),
        errPbStanding: errPb(pbStandingPred),
        errPbStandingSigned: errPbSigned(pbStandingPred),
        errPbVB: errPb(pbVBPred),
        errPbVBsigned: errPbSigned(pbVBPred),
        errPbGlaso: errPb(pbGlasoPred),
        errPbGlasoSigned: errPbSigned(pbGlasoPred),
        errPbMarhoun: errPb(pbMarhounPred),
        errPbMarhounSigned: errPbSigned(pbMarhounPred),
        errPbPF: errPb(pbPFPred),
        errPbPFsigned: errPbSigned(pbPFPred),
        errBoStanding: errBo(boStandingPred),
        errBoVB: errBo(boVBPred),
        errBoGlaso: errBo(boGlasoPred),
        errBoMarhoun: errBo(boMarhounPred),
        errBoPF: errBo(boPFPred),
        errBoMB: errBo(boMBPred)
      });
    }
    return rows;
  }

  function parseOilViscosityRows(text) {
    var lines = text.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!lines.length) return [];
    var rows = [];
    lastSkips = [];
    var parseNum = function (v) {
      var cleaned = String(v).replace(/[^0-9.+-]/g, '');
      if (!cleaned || cleaned === '+' || cleaned === '-' || cleaned === '.' || cleaned === '+.' || cleaned === '-.') return NaN;
      return Number(cleaned);
    };
    var deadMethod = ($('o-mu-dead-method') && $('o-mu-dead-method').value) || 'beal';
    var satMethod = ($('o-mu-sat-method') && $('o-mu-sat-method').value) || 'beggs_robinson';
    var undMethod = ($('o-mu-und-method') && $('o-mu-und-method').value) || 'vasquez_beggs';
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var cols = line.indexOf('|') !== -1
        ? line.split('|').map(function (s) { return s.trim(); }).filter(Boolean)
        : line.split(/\t|,|;/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (cols.every(function (c) { return /^:?-{2,}:?$/.test(c); })) continue;
      if (!cols.some(function (c) { return /\d/.test(c); })) continue;   // header line
      if (cols.length < 5) { lastSkips.push('Line ' + (li + 1) + ': needs at least 5 columns (found ' + cols.length + ').'); continue; }
      var tF, pbPsig, rsExp, api, gg, muExp = NaN;
      if (cols.length >= 11 && Number.isFinite(parseNum(cols[8])) && Number.isFinite(parseNum(cols[9]))) {
        tF = parseNum(cols[1]);
        pbPsig = parseNum(cols[2]);
        rsExp = parseNum(cols[3]);
        api = parseNum(cols[8]);
        gg = parseNum(cols[9]);
        muExp = parseNum(cols[10]);
      } else {
        var hasOilId = Number.isFinite(parseNum(cols[0])) && parseNum(cols[0]) <= 50 && cols.length >= 6;
        var offset = hasOilId ? 1 : 0;
        tF = parseNum(cols[offset + 0]);
        pbPsig = parseNum(cols[offset + 1]);
        rsExp = parseNum(cols[offset + 2]);
        api = parseNum(cols[offset + 3]);
        gg = parseNum(cols[offset + 4]);
        muExp = parseNum(cols[offset + 5]);
      }
      var badM = [['T', tF], ['pb', pbPsig], ['Rs', rsExp], ['API', api], ['γg', gg]].filter(function (x) { return !Number.isFinite(x[1]); }).map(function (x) { return x[0]; });
      if (badM.length) { lastSkips.push('Line ' + (li + 1) + ': column ' + badM.join(', ') + ' is not a number.'); continue; }
      var pbPsia = pbPsig + P_ATM;
      var pInput = toNum('muP');
      var pForUnd = Number.isFinite(pInput) && pInput > 0 ? pInput : NaN;   // no pressure -> no undersaturated value
      var muDeadPred = deadOilViscosityByMethod(tF, api, deadMethod);
      var muSatPred = satOilViscosityByMethod(muDeadPred, rsExp, satMethod);
      var muUndPred = underSatViscosityByMethod(muSatPred, pForUnd, pbPsia, undMethod);
      var err = function (v) { return (Number.isFinite(muExp) && muExp !== 0) ? Math.abs((v - muExp) / muExp) * 100 : NaN; };
      rows.push({
        tF: tF, pbPsig: pbPsig, pbPsia: pbPsia, rsExp: rsExp, api: api, gg: gg, muExp: muExp, pForUnd: pForUnd,
        muDeadPred: muDeadPred, muSatPred: muSatPred, muUndPred: muUndPred,
        errMuDead: err(muDeadPred),
        errMuSat: err(muSatPred),
        errMuUnd: err(muUndPred)
      });
    }
    return rows;
  }

  /* ---------------------------------------------------------- table render */

  function mean(rows, pick) {
    var vals = rows.map(pick).filter(Number.isFinite);
    return vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : NaN;
  }

  function setTxt(id, v, d) {
    var el = $(id);
    if (el) el.textContent = Number.isFinite(v) ? round(v, d === undefined ? 4 : d) : '-';
  }

  function fill(bodyId, rows, rowHtml) {
    var body = $(bodyId);
    if (!body) return false;
    body.innerHTML = '';
    if (!rows.length) {
      var tr0 = document.createElement('tr');
      tr0.className = 'oc-empty';
      var span = body.closest('table').querySelectorAll('thead th').length || 1;
      tr0.innerHTML = '<td colspan="' + span + '">No data — paste a table above and press Evaluate.</td>';
      body.appendChild(tr0);
      return true;
    }
    rows.forEach(function (r, idx) {
      var tr = document.createElement('tr');
      tr.innerHTML = rowHtml(r, idx);
      body.appendChild(tr);
    });
    return true;
  }

  function renderOilRsEvaluation(rows) {
    var cell = function (rs, err) { return (Number.isFinite(rs) && Number.isFinite(err)) ? (round(rs, 3) + ' | ' + round(err, 3) + '%') : '-'; };
    fill('oRsEvalBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td>'
        + '<td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.pbPsig, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td>'
        + '<td>' + round(r.gg, 5) + '</td>'
        + '<td>' + round(r.rsExp, 3) + '</td>'
        + '<td>' + cell(r.rsStanding, r.errStanding) + '</td>'
        + '<td>' + cell(r.rsVB, r.errVB) + '</td>'
        + '<td>' + cell(r.rsGlaso, r.errGlaso) + '</td>'
        + '<td>' + cell(r.rsMarhoun, r.errMarhoun) + '</td>'
        + '<td>' + cell(r.rsPF, r.errPF) + '</td>';
    });
    var aaes = {
      standing: mean(rows, function (r) { return r.errStanding; }),
      vasquez_beggs: mean(rows, function (r) { return r.errVB; }),
      glaso: mean(rows, function (r) { return r.errGlaso; }),
      marhoun: mean(rows, function (r) { return r.errMarhoun; }),
      petrosky_farshad: mean(rows, function (r) { return r.errPF; })
    };
    setTxt('o_rs_aae_st', aaes.standing);
    setTxt('o_rs_aae_vb', aaes.vasquez_beggs);
    setTxt('o_rs_aae_gl', aaes.glaso);
    setTxt('o_rs_aae_mh', aaes.marhoun);
    setTxt('o_rs_aae_pf', aaes.petrosky_farshad);
    state.oilRsEval = { rows: rows, aaes: aaes };
  }

  function renderOilRsStandingDetail(rows) {
    fill('oRsStandingBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.tF, 3) + '</td><td>' + round(r.api, 3) + '</td>'
        + '<td>' + round(r.xStanding, 3) + '</td><td>' + round(r.tenPowXStanding, 3) + '</td>'
        + '<td>' + round(r.rsStanding, 3) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.errStanding, 3) + '</td>';
    });
    setTxt('o_rs_standing_aae', mean(rows, function (r) { return r.errStanding; }));
  }

  function renderOilRsVbDetail(rows) {
    fill('oRsVbBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.vbGammaGs, 4) + '</td><td>' + round(r.rsVB, 3) + '</td>'
        + '<td>' + round(r.rsExp, 3) + '</td><td>' + round(r.errVBsigned, 3) + '</td>';
    });
    setTxt('o_rs_vb_aae', mean(rows, function (r) { return Math.abs(r.errVBsigned); }));
  }

  function renderOilRsGlasoDetail(rows) {
    fill('oRsGlasoBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.glasoX, 3) + '</td>'
        + '<td>' + round(r.glasoA, 3) + '</td><td>' + round(r.rsGlaso, 3) + '</td><td>' + round(r.rsExp, 3) + '</td>'
        + '<td>' + round(r.errGlasoSigned, 3) + '</td>';
    });
    setTxt('o_rs_glaso_aae', mean(rows, function (r) { return Math.abs(r.errGlasoSigned); }));
  }

  function renderOilRsMarhounDetail(rows) {
    fill('oRsMarhounBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.go, 5) + '</td>'
        + '<td>' + round(r.tR, 3) + '</td><td>' + round(r.rsMarhoun, 3) + '</td><td>' + round(r.rsExp, 3) + '</td>'
        + '<td>' + round(r.errMarhounSigned, 3) + '</td>';
    });
    setTxt('o_rs_marhoun_aae', mean(rows, function (r) { return Math.abs(r.errMarhounSigned); }));
  }

  function renderOilRsPfDetail(rows) {
    fill('oRsPfBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.pfX, 5) + '</td>'
        + '<td>' + round(r.pfTenPowX, 5) + '</td><td>' + round(r.rsPF, 3) + '</td><td>' + round(r.rsExp, 3) + '</td>'
        + '<td>' + round(r.errPFsigned, 3) + '</td>';
    });
    setTxt('o_rs_pf_aae', mean(rows, function (r) { return Math.abs(r.errPFsigned); }));
  }

  function renderOilPbEvaluation(rows) {
    var cell = function (pb, err) { return (Number.isFinite(pb) && Number.isFinite(err)) ? (round(pb, 3) + ' | ' + round(err, 3) + '%') : '-'; };
    fill('oPbEvalBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.tF, 3) + '</td><td>' + round(r.pbPsia, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td>'
        + '<td>' + cell(r.pbStandingPred, r.errPbStanding) + '</td>'
        + '<td>' + cell(r.pbVBPred, r.errPbVB) + '</td>'
        + '<td>' + cell(r.pbGlasoPred, r.errPbGlaso) + '</td>'
        + '<td>' + cell(r.pbMarhounPred, r.errPbMarhoun) + '</td>'
        + '<td>' + cell(r.pbPFPred, r.errPbPF) + '</td>';
    });
    var st = mean(rows, function (r) { return r.errPbStanding; });
    var vb = mean(rows, function (r) { return r.errPbVB; });
    var gl = mean(rows, function (r) { return r.errPbGlaso; });
    var mh = mean(rows, function (r) { return r.errPbMarhoun; });
    var pf = mean(rows, function (r) { return r.errPbPF; });
    setTxt('o_pb_aae_st', st); setTxt('o_pb_aae_vb', vb); setTxt('o_pb_aae_glaso', gl);
    setTxt('o_pb_aae_marhoun', mh); setTxt('o_pb_aae_pf', pf);
    state.oilPbEval = { rows: rows, aaes: { standing: st, vasquez_beggs: vb, glaso: gl, marhoun: mh, petrosky_farshad: pf } };
  }

  function renderOilPbStandingDetail(rows) {
    fill('oPbStandingBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td><td>' + round(r.pbStandingTerm, 6) + '</td>'
        + '<td>' + round(r.pbStandingPred, 3) + '</td><td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.errPbStandingSigned, 3) + '</td>';
    });
    setTxt('o_pb_standing_aae', mean(rows, function (r) { return Math.abs(r.errPbStandingSigned); }));
  }

  function renderOilPbVbDetail(rows) {
    fill('oPbVbBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + r.vbApiGroup + '</td><td>' + round(r.vbGammaGs, 5) + '</td>'
        + '<td>' + round(r.vbPbC1, 6) + '</td><td>' + round(r.vbPbC2, 6) + '</td><td>' + round(r.vbPbC3, 6) + '</td>'
        + '<td>' + round(r.pbVBBase, 6) + '</td><td>' + round(r.pbVBPred, 3) + '</td><td>' + round(r.pbPsia, 3) + '</td>'
        + '<td>' + round(r.errPbVBsigned, 3) + '</td>';
    });
    setTxt('o_pb_vb_aae', mean(rows, function (r) { return Math.abs(r.errPbVBsigned); }));
  }

  function renderOilPbGlasoDetail(rows) {
    fill('oPbGlasoBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td><td>' + round(r.pbGlasoStar, 6) + '</td>'
        + '<td>' + round(r.pbGlasoLogStar, 6) + '</td><td>' + round(r.pbGlasoPred, 3) + '</td>'
        + '<td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.errPbGlasoSigned, 3) + '</td>';
    });
    setTxt('o_pb_glaso_aae', mean(rows, function (r) { return Math.abs(r.errPbGlasoSigned); }));
  }

  function renderOilPbMarhounDetail(rows) {
    fill('oPbMarhounBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.tR, 3) + '</td>'
        + '<td>' + round(r.go, 5) + '</td><td>' + round(r.gg, 5) + '</td><td>' + round(r.pbMarhounPred, 3) + '</td>'
        + '<td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.errPbMarhounSigned, 3) + '</td>';
    });
    setTxt('o_pb_marhoun_aae', mean(rows, function (r) { return Math.abs(r.errPbMarhounSigned); }));
  }

  function renderOilPbPfDetail(rows) {
    fill('oPbPfBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td><td>' + round(r.pbPFX, 6) + '</td>'
        + '<td>' + round(r.pbPFTenPowX, 6) + '</td><td>' + round(r.pbPFRsPow, 6) + '</td>'
        + '<td>' + round(r.pbPFPred, 3) + '</td><td>' + round(r.pbPsia, 3) + '</td><td>' + round(r.errPbPFsigned, 3) + '</td>';
    });
    setTxt('o_pb_pf_aae', mean(rows, function (r) { return Math.abs(r.errPbPFsigned); }));
  }

  function renderOilBoEvaluation(rows) {
    var cell = function (bo, err) { return (Number.isFinite(bo) && Number.isFinite(err)) ? (round(bo, 5) + ' | ' + round(err, 3) + '%') : '-'; };
    fill('oBoEvalBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.tF, 3) + '</td><td>' + round(r.rsExp, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td>'
        + '<td>' + (Number.isFinite(r.rhoExp) ? round(r.rhoExp, 5) : '-') + '</td>'
        + '<td>' + (Number.isFinite(r.boExp) ? round(r.boExp, 5) : '-') + '</td>'
        + '<td>' + cell(r.boStandingPred, r.errBoStanding) + '</td>'
        + '<td>' + cell(r.boVBPred, r.errBoVB) + '</td>'
        + '<td>' + cell(r.boGlasoPred, r.errBoGlaso) + '</td>'
        + '<td>' + cell(r.boMarhounPred, r.errBoMarhoun) + '</td>'
        + '<td>' + cell(r.boPFPred, r.errBoPF) + '</td>'
        + '<td>' + cell(r.boMBPred, r.errBoMB) + '</td>';
    });
    var aaes = {
      standing: mean(rows, function (r) { return r.errBoStanding; }),
      vasquez_beggs: mean(rows, function (r) { return r.errBoVB; }),
      glaso: mean(rows, function (r) { return r.errBoGlaso; }),
      marhoun: mean(rows, function (r) { return r.errBoMarhoun; }),
      petrosky_farshad: mean(rows, function (r) { return r.errBoPF; }),
      material_balance: mean(rows, function (r) { return r.errBoMB; })
    };
    setTxt('o_bo_aae_st', aaes.standing);
    setTxt('o_bo_aae_vb', aaes.vasquez_beggs);
    setTxt('o_bo_aae_glaso', aaes.glaso);
    setTxt('o_bo_aae_marhoun', aaes.marhoun);
    setTxt('o_bo_aae_pf', aaes.petrosky_farshad);
    setTxt('o_bo_aae_mb', aaes.material_balance);
    state.oilBoEval = { rows: rows, aaes: aaes };
  }

  var BO_LABELS = {
    standing: 'Standing',
    vasquez_beggs: 'Vasquez-Beggs',
    glaso: 'Glaso',
    marhoun: 'Marhoun',
    petrosky_farshad: 'Petrosky-Farshad',
    material_balance: 'Material balance'
  };

  function renderOilBoDetail(rows) {
    var bom = ($('o-bo-method') && $('o-bo-method').value) || 'standing';
    var boValue = function (r) {
      return {
        standing: r.boStandingPred,
        vasquez_beggs: r.boVBPred,
        glaso: r.boGlasoPred,
        marhoun: r.boMarhounPred,
        petrosky_farshad: r.boPFPred,
        material_balance: r.boMBPred
      }[bom];
    };
    var boErr = function (r) {
      return {
        standing: r.errBoStanding,
        vasquez_beggs: r.errBoVB,
        glaso: r.errBoGlaso,
        marhoun: r.errBoMarhoun,
        petrosky_farshad: r.errBoPF,
        material_balance: r.errBoMB
      }[bom];
    };
    fill('oBoDetailBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + (BO_LABELS[bom] || bom) + '</td><td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td><td>' + round(r.rsExp, 3) + '</td>'
        + '<td>' + (Number.isFinite(boValue(r)) ? round(boValue(r), 5) : '-') + '</td>'
        + '<td>' + (Number.isFinite(r.boExp) ? round(r.boExp, 5) : '-') + '</td>'
        + '<td>' + (Number.isFinite(boErr(r)) ? round(boErr(r), 3) : '-') + '</td>';
    });
    setTxt('o_bo_detail_aae', mean(rows, boErr));
  }

  function renderOilMuEvaluation(rows) {
    var cell = function (mu, err) {
      return Number.isFinite(mu) ? (round(mu, 5) + (Number.isFinite(err) ? (' | ' + round(err, 3) + '%') : ' | -')) : '-';
    };
    fill('oMuEvalBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + round(r.tF, 3) + '</td><td>' + round(r.pbPsig, 3) + '</td>'
        + '<td>' + round(r.rsExp, 3) + '</td><td>' + round(r.api, 3) + '</td><td>' + round(r.gg, 5) + '</td>'
        + '<td>' + (Number.isFinite(r.muExp) ? round(r.muExp, 5) : '-') + '</td>'
        + '<td>' + cell(r.muDeadPred, r.errMuDead) + '</td>'
        + '<td>' + cell(r.muSatPred, r.errMuSat) + '</td>'
        + '<td>' + cell(r.muUndPred, r.errMuUnd) + '</td>';
    });
    var aaes = {
      dead: mean(rows, function (r) { return r.errMuDead; }),
      saturated: mean(rows, function (r) { return r.errMuSat; }),
      undersaturated: mean(rows, function (r) { return r.errMuUnd; })
    };
    setTxt('o_mu_aae_dead', aaes.dead);
    setTxt('o_mu_aae_sat', aaes.saturated);
    setTxt('o_mu_aae_und', aaes.undersaturated);
    state.oilMuEval = { rows: rows, aaes: aaes };
  }

  var DEAD_LABELS = { beal: 'Beal', beggs_robinson: 'Beggs-Robinson', glaso: 'Glaso' };

  function renderOilMuDetail(rows) {
    var mum = ($('o-mu-method') && $('o-mu-method').value) || 'dead';
    var deadMethod = ($('o-mu-dead-method') && $('o-mu-dead-method').value) || 'beal';
    var deadLabel = DEAD_LABELS[deadMethod] || 'Beal';
    var methodLabel = {
      dead: 'Dead oil viscosity (' + deadLabel + ')',
      saturated: 'Saturated oil viscosity (dead from ' + deadLabel + ')',
      undersaturated: 'Undersaturated oil viscosity (dead from ' + deadLabel + ')'
    }[mum] || mum;
    var muValue = function (r) { return { dead: r.muDeadPred, saturated: r.muSatPred, undersaturated: r.muUndPred }[mum]; };
    var muErr = function (r) { return { dead: r.errMuDead, saturated: r.errMuSat, undersaturated: r.errMuUnd }[mum]; };
    fill('oMuDetailBody', rows, function (r, idx) {
      return '<td>' + (idx + 1) + '</td><td>' + methodLabel + '</td><td>' + round(r.tF, 3) + '</td>'
        + '<td>' + round(r.api, 3) + '</td><td>' + round(r.rsExp, 3) + '</td><td>' + round(r.pbPsia, 3) + '</td>'
        + '<td>' + round(r.pForUnd, 3) + '</td>'
        + '<td>' + (Number.isFinite(muValue(r)) ? round(muValue(r), 5) : '-') + '</td>'
        + '<td>' + (Number.isFinite(r.muExp) ? round(r.muExp, 5) : '-') + '</td>'
        + '<td>' + (Number.isFinite(muErr(r)) ? round(muErr(r), 3) : '-') + '</td>';
    });
    setTxt('o_mu_detail_aae', mean(rows, muErr));
  }

  /* ------------------------------------------------------------- markup */

  function th(cols) {
    return cols.map(function (c) { return '<th>' + c + '</th>'; }).join('');
  }

  function tbl(cols, bodyId, foot) {
    return '<div class="oc-tablewrap"><table><thead><tr>' + th(cols) + '</tr></thead>'
      + '<tbody id="oc-' + bodyId + '"></tbody>'
      + (foot ? '<tfoot><tr><td colspan="' + cols.length + '">' + foot + '</td></tr></tfoot>' : '')
      + '</table></div>';
  }

  function detail(id, title, cols, bodyId, foot) {
    return '<div class="oc-detail" id="oc-' + id + '"><h4>' + title + '</h4>' + tbl(cols, bodyId, foot) + '</div>';
  }

  function pasteBlock(key, id, btnId, btnLabel, hint, placeholder, extra) {
    return '<div class="oc-paste">'
      + '<label class="oc-field oc-field-wide"><span>' + hint + '</span>'
      + '<textarea id="oc-' + id + '" rows="4" spellcheck="false" placeholder="' + placeholder + '"></textarea></label>'
      + (extra || '')
      + '<button type="button" class="oc-btn oc-btn-ghost" id="oc-' + btnId + '">' + btnLabel + '</button>'
      + '</div><div class="oc-skips" id="oc-skips-' + key + '" hidden></div>';
  }

  var COLS_TXT = 'Columns (tab, comma or semicolon separated): Oil · T (°F) · pb (psig) · Rs (scf/STB) · Bo (rb/STB) · ρo at pb (lbm/ft³) · psep (psig) · Tsep (°F) · API · γg'
    + ' — or the short form T · pb · Rs · API · γg. pb and psep are gauge pressures; absolute = gauge + ' + P_ATM + ' psi. A header line is ignored.';
  var PH_PVT = 'Oil&#9;T&#9;pb&#9;Rs&#9;Bo&#9;rho&#9;psep&#9;Tsep&#9;API&#9;gg&#10;1&#9;250&#9;2377&#9;751&#9;1.528&#9;38.13&#9;150&#9;60&#9;47.1&#9;0.851';
  var PH_MU = 'Oil&#9;T&#9;pb&#9;Rs&#9;Bo&#9;rho&#9;psep&#9;Tsep&#9;API&#9;gg&#9;mu&#10;1&#9;250&#9;2377&#9;751&#9;1.528&#9;38.13&#9;150&#9;60&#9;47.1&#9;0.851&#9;0.62';
  var ERR_TXT = 'Error % = 100·(calculated − measured)/measured; AAE = mean of |Error %| over the rows that have both values.';

  function rsBatchHtml() {
    var foot = '<strong>AAE (%)</strong> &mdash; Standing: <span id="oc-o_rs_aae_st">-</span> | Vasquez-Beggs: <span id="oc-o_rs_aae_vb">-</span> | Glaso: <span id="oc-o_rs_aae_gl">-</span> | Marhoun: <span id="oc-o_rs_aae_mh">-</span> | Petrosky-Farshad: <span id="oc-o_rs_aae_pf">-</span>';
    return '<div class="oc-batch" id="oc-batch-rs">'
      + '<p class="oc-meta">Paste a measured PVT table and compare five Rs correlations evaluated at the measured pb. ' + ERR_TXT + '</p>'
      + '<p class="oc-meta">' + COLS_TXT + '</p>'
      + pasteBlock('rs', 'oRsPaste', 'applyORsPasteBtn', 'Evaluate Rs methods', 'Rs evaluation data', PH_PVT)
      + tbl(['#', 'T (&deg;F)', 'pb (psig)', 'API', '&gamma;g', 'Measured Rs (PVT)', 'Standing: Rs | Err%', 'Vasquez-Beggs: Rs | Err%', 'Glaso: Rs | Err%', 'Marhoun: Rs | Err%', 'Petrosky-Farshad: Rs | Err%'], 'oRsEvalBody', foot)
      + '<label class="oc-field oc-detail-pick"><span>Detailed calculation</span><select id="oc-o-rs-method"><option value="standing" selected>Standing</option><option value="vasquez_beggs">Vasquez-Beggs</option><option value="glaso">Glaso</option><option value="marhoun">Marhoun</option><option value="petrosky_farshad">Petrosky-Farshad</option></select></label>'
      + detail('oRsStandingDetail', 'Standing &mdash; detailed calculation', ['Oil', 'T (&deg;F)', 'API', 'x', '10^x', 'Predicted Rs', 'Measured Rs (PVT)', '% Error'], 'oRsStandingBody', '<strong>Standing AAE = <span id="oc-o_rs_standing_aae">-</span> %</strong>')
      + detail('oRsVbDetail', 'Vasquez-Beggs &mdash; detailed calculation', ['Oil', '&gamma;gs', 'Predicted Rs', 'Measured Rs (PVT)', '% Error'], 'oRsVbBody', '<strong>Vasquez-Beggs AAE = <span id="oc-o_rs_vb_aae">-</span> %</strong>')
      + detail('oRsGlasoDetail', 'Glaso &mdash; detailed calculation', ['Oil', 'pb (psia)', 'x', 'A = 10^x', 'Predicted Rs', 'Measured Rs (PVT)', '% Error'], 'oRsGlasoBody', '<strong>Glaso AAE = <span id="oc-o_rs_glaso_aae">-</span> %</strong>')
      + detail('oRsMarhounDetail', 'Marhoun &mdash; detailed calculation', ['Oil', 'pb (psia)', '&gamma;o', 'T (&deg;R)', 'Predicted Rs', 'Measured Rs (PVT)', '% Error'], 'oRsMarhounBody', '<strong>Marhoun AAE = <span id="oc-o_rs_marhoun_aae">-</span> %</strong>')
      + detail('oRsPfDetail', 'Petrosky-Farshad &mdash; detailed calculation', ['Oil', 'pb (psia)', 'X', '10^X', 'Predicted Rs', 'Measured Rs (PVT)', '% Error'], 'oRsPfBody', '<strong>Petrosky-Farshad AAE = <span id="oc-o_rs_pf_aae">-</span> %</strong>')
      + '</div>';
  }

  function pbBatchHtml() {
    var foot = '<strong>AAE (%)</strong> &mdash; Standing: <span id="oc-o_pb_aae_st">-</span> | Vasquez-Beggs: <span id="oc-o_pb_aae_vb">-</span> | Glaso: <span id="oc-o_pb_aae_glaso">-</span> | Marhoun: <span id="oc-o_pb_aae_marhoun">-</span> | Petrosky-Farshad: <span id="oc-o_pb_aae_pf">-</span>';
    return '<div class="oc-batch" id="oc-batch-pb" hidden>'
      + '<p class="oc-meta">Paste a measured PVT table and compare bubble-point correlations evaluated at the measured Rs. ' + ERR_TXT + '</p>'
      + '<p class="oc-meta">' + COLS_TXT + '</p>'
      + pasteBlock('pb', 'oPbPaste', 'applyOPbPasteBtn', 'Evaluate pb methods', 'pb evaluation data', PH_PVT)
      + tbl(['Oil', 'T (&deg;F)', 'Measured pb (psia)', 'API', '&gamma;g', 'Standing: pb | Err%', 'Vasquez-Beggs: pb | Err%', 'Glaso: pb | Err%', 'Marhoun: pb | Err%', 'Petrosky-Farshad: pb | Err%'], 'oPbEvalBody', foot)
      + '<label class="oc-field oc-detail-pick"><span>Detailed calculation</span><select id="oc-o-pb-method"><option value="standing" selected>Standing</option><option value="vasquez_beggs">Vasquez-Beggs</option><option value="glaso">Glaso</option><option value="marhoun">Marhoun</option><option value="petrosky_farshad">Petrosky-Farshad</option></select></label>'
      + detail('oPbStandingDetail', 'Standing pb &mdash; detailed calculation', ['Oil', 'Rs (scf/STB)', 'T (&deg;F)', 'API', '&gamma;g', 'Term', 'Predicted pb (psia)', 'Measured pb (psia)', '% Error'], 'oPbStandingBody', '<strong>Standing pb AAE = <span id="oc-o_pb_standing_aae">-</span> %</strong>')
      + detail('oPbVbDetail', 'Vasquez-Beggs pb &mdash; detailed calculation', ['Oil', 'API group', '&gamma;gs', 'C1', 'C2', 'C3', 'Base', 'Predicted pb (psia)', 'Measured pb (psia)', '% Error'], 'oPbVbBody', '<strong>Vasquez-Beggs pb AAE = <span id="oc-o_pb_vb_aae">-</span> %</strong>')
      + detail('oPbGlasoDetail', 'Glaso pb &mdash; detailed calculation', ['Oil', 'Rs (scf/STB)', 'T (&deg;F)', 'API', '&gamma;g', 'pb*', 'log10(pb*)', 'Predicted pb (psia)', 'Measured pb (psia)', '% Error'], 'oPbGlasoBody', '<strong>Glaso pb AAE = <span id="oc-o_pb_glaso_aae">-</span> %</strong>')
      + detail('oPbMarhounDetail', 'Marhoun pb &mdash; detailed calculation', ['Oil', 'Rs (scf/STB)', 'T (&deg;R)', '&gamma;o', '&gamma;g', 'Predicted pb (psia)', 'Measured pb (psia)', '% Error'], 'oPbMarhounBody', '<strong>Marhoun pb AAE = <span id="oc-o_pb_marhoun_aae">-</span> %</strong>')
      + detail('oPbPfDetail', 'Petrosky-Farshad pb &mdash; detailed calculation', ['Oil', 'Rs (scf/STB)', 'T (&deg;F)', 'API', '&gamma;g', 'X', '10^X', 'Rs^(1/1.73184)', 'Predicted pb (psia)', 'Measured pb (psia)', '% Error'], 'oPbPfBody', '<strong>Petrosky-Farshad pb AAE = <span id="oc-o_pb_pf_aae">-</span> %</strong>')
      + '</div>';
  }

  function boBatchHtml() {
    var foot = '<strong>AAE (%)</strong> &mdash; Standing: <span id="oc-o_bo_aae_st">-</span> | Vasquez-Beggs: <span id="oc-o_bo_aae_vb">-</span> | Glaso: <span id="oc-o_bo_aae_glaso">-</span> | Marhoun: <span id="oc-o_bo_aae_marhoun">-</span> | Petrosky-Farshad: <span id="oc-o_bo_aae_pf">-</span> | Material balance: <span id="oc-o_bo_aae_mb">-</span>';
    return '<div class="oc-batch" id="oc-batch-bo" hidden>'
      + '<p class="oc-meta">Paste a measured PVT table and compare Bo-at-pb correlations evaluated at the measured Rs. Material balance uses the measured oil density at pb (ρo column). ' + ERR_TXT + '</p>'
      + '<p class="oc-meta">' + COLS_TXT + '</p>'
      + pasteBlock('bo', 'oBoPaste', 'applyOBoPasteBtn', 'Evaluate Bo methods', 'Bo evaluation data', PH_PVT)
      + tbl(['Oil', 'T (&deg;F)', 'Rs (scf/STB)', 'API', '&gamma;g', '&rho;o (lb/ft&sup3;)', 'Measured Bo', 'Standing: Bo | Err%', 'Vasquez-Beggs: Bo | Err%', 'Glaso: Bo | Err%', 'Marhoun: Bo | Err%', 'Petrosky-Farshad: Bo | Err%', 'Material balance: Bo | Err%'], 'oBoEvalBody', foot)
      + '<label class="oc-field oc-detail-pick"><span>Detailed calculation</span><select id="oc-o-bo-method"><option value="standing" selected>Standing</option><option value="vasquez_beggs">Vasquez-Beggs</option><option value="glaso">Glaso</option><option value="marhoun">Marhoun</option><option value="petrosky_farshad">Petrosky-Farshad</option><option value="material_balance">Material balance</option></select></label>'
      + detail('oBoDetail', 'Selected method &mdash; detailed calculation', ['Oil', 'Method', 'T (&deg;F)', 'API', '&gamma;g', 'Rs (scf/STB)', 'Predicted Bo', 'Measured Bo', '% Error'], 'oBoDetailBody', '<strong>Selected method Bo AAE = <span id="oc-o_bo_detail_aae">-</span> %</strong>')
      + '</div>';
  }

  function muBatchHtml() {
    var foot = '<strong>AAE (%)</strong> &mdash; Dead: <span id="oc-o_mu_aae_dead">-</span> | Saturated: <span id="oc-o_mu_aae_sat">-</span> | Undersaturated: <span id="oc-o_mu_aae_und">-</span>';
    var extra = '<label class="oc-field"><span>Pressure for undersaturated &mu;o <em>psia</em></span><input id="oc-muP" type="number" step="any" placeholder="none"></label>';
    return '<div class="oc-batch" id="oc-batch-mu" hidden>'
      + '<p class="oc-meta">Dead &rarr; saturated (at measured Rs, i.e. at pb) &rarr; undersaturated chain. The undersaturated column needs the pressure at which &mu;o was measured; without it that column stays empty. Add a measured &mu;o column (last) to compute errors. ' + ERR_TXT + '</p>'
      + '<p class="oc-meta">' + COLS_TXT + ' · then &mu;o (cP).</p>'
      + '<div class="oc-fields oc-fields-row">'
      + '<label class="oc-field"><span>Dead-oil correlation</span><select id="oc-o-mu-dead-method"><option value="beal" selected>Beal</option><option value="beggs_robinson">Beggs-Robinson</option><option value="glaso">Glaso</option></select></label>'
      + '<label class="oc-field"><span>Detailed calculation</span><select id="oc-o-mu-method"><option value="dead" selected>Dead oil</option><option value="saturated">Saturated (Beggs-Robinson)</option><option value="undersaturated">Undersaturated (Vasquez-Beggs)</option></select></label>'
      + '</div>'
      + pasteBlock('mu', 'oMuPaste', 'applyOMuPasteBtn', 'Evaluate oil viscosity', 'Viscosity evaluation data', PH_MU, extra)
      + tbl(['Oil', 'T (&deg;F)', 'pb (psig)', 'Rs (scf/STB)', 'API', '&gamma;g', 'Measured &mu;o', 'Dead &mu;o | Err%', 'Saturated &mu;o | Err%', 'Undersaturated &mu;o | Err%'], 'oMuEvalBody', foot)
      + detail('oMuDetail', 'Selected method &mdash; detailed calculation', ['Oil', 'Method', 'T (&deg;F)', 'API', 'Rs (scf/STB)', 'pb (psia)', 'p used (psia)', 'Predicted &mu;o', 'Measured &mu;o', '% Error'], 'oMuDetailBody', '<strong>Selected method &mu;o AAE = <span id="oc-o_mu_detail_aae">-</span> %</strong>')
      + '</div>';
  }

  function template() {
    return '<div class="oc oc-embed">'
      + '<div class="oc-subtabs">'
      + '<button type="button" class="oc-subtab is-on" data-batch="rs">Gas solubility, Rs</button>'
      + '<button type="button" class="oc-subtab" data-batch="pb">Bubble point, pb</button>'
      + '<button type="button" class="oc-subtab" data-batch="bo">Oil FVF, Bo</button>'
      + '<button type="button" class="oc-subtab" data-batch="mu">Oil viscosity, &mu;o</button>'
      + '</div>'
      + '<section class="oc-card oc-card-batch">' + rsBatchHtml() + pbBatchHtml() + boBatchHtml() + muBatchHtml() + '</section>'
      + '</div>';
  }

  /* ------------------------------------------------------------ behaviour */

  function show(id, on) {
    var el = $(id);
    if (el) el.hidden = !on;
  }

  function syncPanels() {
    var rsm = ($('o-rs-method') && $('o-rs-method').value) || 'standing';
    var pbm = ($('o-pb-method') && $('o-pb-method').value) || 'standing';
    show('oRsStandingDetail', rsm === 'standing');
    show('oRsVbDetail', rsm === 'vasquez_beggs');
    show('oRsGlasoDetail', rsm === 'glaso');
    show('oRsMarhounDetail', rsm === 'marhoun');
    show('oRsPfDetail', rsm === 'petrosky_farshad');
    show('oPbStandingDetail', pbm === 'standing');
    show('oPbVbDetail', pbm === 'vasquez_beggs');
    show('oPbGlasoDetail', pbm === 'glaso');
    show('oPbMarhounDetail', pbm === 'marhoun');
    show('oPbPfDetail', pbm === 'petrosky_farshad');
  }

  function setBatchTab(key) {
    state.batchTab = key;
    if (!host) return;
    host.querySelectorAll('.oc-subtab').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-batch') === key);
    });
    ['rs', 'pb', 'bo', 'mu'].forEach(function (k) { show('batch-' + k, k === key); });
  }

  function renderSkips(key) {
    var box = $('skips-' + key), list = state.skips[key] || [];
    if (!box) return;
    box.hidden = !list.length;
    box.innerHTML = list.length ? '<strong>' + list.length + ' row' + (list.length > 1 ? 's' : '') + ' not evaluated:</strong><ul>'
      + list.map(function (s) { return '<li>' + s.replace(/[<>&]/g, '') + '</li>'; }).join('') + '</ul>' : '';
  }

  function applyOilRsPaste() {
    var rows = parseOilEvaluationRows(($('oRsPaste') || {}).value || '');
    state.skips.rs = lastSkips.slice(); renderSkips('rs');
    renderOilRsEvaluation(rows);
    renderOilRsStandingDetail(rows);
    renderOilRsVbDetail(rows);
    renderOilRsGlasoDetail(rows);
    renderOilRsMarhounDetail(rows);
    renderOilRsPfDetail(rows);
  }

  function applyOilPbPaste() {
    var rows = parseOilEvaluationRows(($('oPbPaste') || {}).value || '');
    state.skips.pb = lastSkips.slice(); renderSkips('pb');
    renderOilPbEvaluation(rows);
    renderOilPbStandingDetail(rows);
    renderOilPbVbDetail(rows);
    renderOilPbGlasoDetail(rows);
    renderOilPbMarhounDetail(rows);
    renderOilPbPfDetail(rows);
  }

  function applyOilBoPaste() {
    var rows = parseOilEvaluationRows(($('oBoPaste') || {}).value || '');
    state.skips.bo = lastSkips.slice(); renderSkips('bo');
    renderOilBoEvaluation(rows);
    renderOilBoDetail(rows);
  }

  function applyOilMuPaste() {
    var rows = parseOilViscosityRows(($('oMuPaste') || {}).value || '');
    state.skips.mu = lastSkips.slice(); renderSkips('mu');
    renderOilMuEvaluation(rows);
    renderOilMuDetail(rows);
  }

  /* inputs survive leaving and re-entering the screen */
  var FIELDS = ['o-rs-method', 'o-pb-method', 'o-bo-method', 'o-mu-method', 'o-mu-dead-method', 'muP',
    'oRsPaste', 'oPbPaste', 'oBoPaste', 'oMuPaste'];
  var snapshot = null;

  function capture() {
    var v = {};
    FIELDS.forEach(function (id) { if ($(id)) v[id] = $(id).value; });
    return v;
  }

  function restore(snap) {
    if (!snap) return;
    FIELDS.forEach(function (id) { if ($(id) && snap[id] !== undefined) $(id).value = snap[id]; });
  }

  function renderAllTables() {
    renderOilRsEvaluation(state.oilRsEval.rows || []);
    renderOilRsStandingDetail(state.oilRsEval.rows || []);
    renderOilRsVbDetail(state.oilRsEval.rows || []);
    renderOilRsGlasoDetail(state.oilRsEval.rows || []);
    renderOilRsMarhounDetail(state.oilRsEval.rows || []);
    renderOilRsPfDetail(state.oilRsEval.rows || []);
    renderOilPbEvaluation(state.oilPbEval.rows || []);
    renderOilPbStandingDetail(state.oilPbEval.rows || []);
    renderOilPbVbDetail(state.oilPbEval.rows || []);
    renderOilPbGlasoDetail(state.oilPbEval.rows || []);
    renderOilPbMarhounDetail(state.oilPbEval.rows || []);
    renderOilPbPfDetail(state.oilPbEval.rows || []);
    renderOilBoEvaluation(state.oilBoEval.rows || []);
    renderOilBoDetail(state.oilBoEval.rows || []);
    renderOilMuEvaluation(state.oilMuEval.rows || []);
    renderOilMuDetail(state.oilMuEval.rows || []);
    ['rs', 'pb', 'bo', 'mu'].forEach(renderSkips);
  }

  function on(id, evt, fn) {
    var el = $(id);
    if (el) el.addEventListener(evt, fn);
  }

  function bind() {
    host.querySelectorAll('.oc-subtab').forEach(function (b) {
      b.addEventListener('click', function () { setBatchTab(b.getAttribute('data-batch')); });
    });
    on('applyORsPasteBtn', 'click', applyOilRsPaste);
    on('applyOPbPasteBtn', 'click', applyOilPbPaste);
    on('applyOBoPasteBtn', 'click', applyOilBoPaste);
    on('applyOMuPasteBtn', 'click', applyOilMuPaste);
    on('o-rs-method', 'change', syncPanels);
    on('o-pb-method', 'change', syncPanels);
    on('o-bo-method', 'change', function () { renderOilBoDetail(state.oilBoEval.rows || []); });
    on('o-mu-method', 'change', function () { renderOilMuDetail(state.oilMuEval.rows || []); });
    on('o-mu-dead-method', 'change', function () { if ($('oMuPaste') && $('oMuPaste').value.trim()) applyOilMuPaste(); });
  }

  /* ------------------------------------------------------------------ API */

  var OilBatch = {
    mount: function (el) {
      if (!el) return;
      if (mounted && host === el) return;
      if (mounted) OilBatch.unmount();
      host = el;
      host.innerHTML = template();
      bind();
      restore(snapshot);
      setBatchTab(state.batchTab || 'rs');
      syncPanels();
      renderAllTables();
      mounted = true;
    },
    unmount: function () {
      if (host && mounted) snapshot = capture();
      if (host) host.innerHTML = '';
      host = null;
      mounted = false;
    },
    isMounted: function (el) { return mounted && host === el; },
    /* exposed for tests */
    _parse: function (t) { var r = parseOilEvaluationRows(t); return { rows: r, skips: lastSkips.slice() }; }
  };

  global.OilBatch = OilBatch;
})(window);
