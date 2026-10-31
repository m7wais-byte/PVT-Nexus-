/* ============================================================================
   PVT Nexus — PVTMeasured
   Measured PVT data import (paste / CSV) and correlation-error statistics.

   Template: first line = column headers, one row per pressure.
     oil:  p, Rs, Bo, muo, co
     gas:  p, Z, Bg, rhog, mug, cg
   Values are in the unit system and pressure convention selected in the
   calculator (shown in the template). Separators: tab, comma or semicolon.
   An empty cell or "-" is a missing value.

   Error statistics (only rows with BOTH a measured and a calculated value)
     relative error  e_i = 100·(calc_i − meas_i)/meas_i      [%]
     ARE  = Σ e_i / n          AARE = Σ |e_i| / n
   Rows with a measured value of 0 are excluded (relative error undefined) and
   counted separately; nothing is replaced by zero. Repeated pressures are kept
   as separate observations.

   Standard-condition basis: Rs, Bo (oil) and Bg (gas) refer to standard volumes,
   so the basis of the measured values must be declared ('corr' 60 °F or 'lab'
   15 °C, both 101.325 kPa). checkBasis() decides per column:
     basis-independent (p, Z, ρ, μ, co, cg)  -> compared as entered
     same basis as the calculation           -> compared as entered
     gas Bg on the other basis               -> converted: Bg_to = Bg_from·Tsc,from/Tsc,to
                                                (gas at standard conditions taken as ideal)
     oil Rs / Bo on the 15 °C basis          -> NOT compared: converting stock-tank oil
                                                volumes needs data that is not available
   ========================================================================= */
(function (root) {
  'use strict';

  var U = root.PVTUnits || (typeof require === 'function' ? require('./pvt-units.js') : null);

  var COLS = {
    oil: [
      { key: 'p', names: ['p', 'pressure'], q: 'p', title: 'p' },
      { key: 'rs', names: ['rs', 'gor'], q: 'Rs', title: 'Rs' },
      { key: 'bo', names: ['bo'], q: 'Bo', title: 'Bo' },
      { key: 'mu', names: ['muo', 'μo', 'mu', 'viscosity', 'visc'], q: 'mu', title: 'muo' },
      { key: 'co', names: ['co'], q: 'comp', title: 'co' }
    ],
    gas: [
      { key: 'p', names: ['p', 'pressure'], q: 'p', title: 'p' },
      { key: 'z', names: ['z', 'zfactor'], q: 'none', title: 'Z' },
      { key: 'bg', names: ['bg'], q: 'Bg', title: 'Bg' },
      { key: 'rho', names: ['rhog', 'ρg', 'rho', 'density'], q: 'density', title: 'rhog' },
      { key: 'mu', names: ['mug', 'μg', 'mu', 'viscosity', 'visc'], q: 'mu', title: 'mug' },
      { key: 'cg', names: ['cg'], q: 'comp', title: 'cg' }
    ]
  };

  function headerText(fluid, units, gauge) {
    return COLS[fluid].map(function (c) {
      var u = c.q === 'p' ? U.unit('p', units, gauge) : (c.q === 'none' ? '–' : U.unit(c.q, units));
      return c.title + ' (' + u + ')';
    });
  }

  function cleanHeader(h) { return String(h).toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').replace(/[\s_\-]/g, '').trim(); }

  function parse(text, fluid, units, gauge) {
    var out = { rows: [], errors: [], columns: [], fluid: fluid };
    /* blank lines and '#' comment lines (the downloadable template carries its notes that way) are not data;
       every message names the line number of the pasted text, so a comment above the header does not shift it */
    var lines = String(text || '').split(/\r?\n/).map(function (l, i) { return { n: i + 1, t: l.replace(/\s+$/, '') }; })
      .filter(function (l) { return l.t.trim() !== '' && l.t.trim().charAt(0) !== '#'; });
    if (!lines.length) { out.errors.push({ row: 0, col: '', msg: 'No data pasted.' }); return out; }
    var split = function (l) { return (l.indexOf('\t') !== -1 ? l.split('\t') : l.split(/[,;]/)).map(function (s) { return s.trim(); }); };
    var head = split(lines[0].t), hl = lines[0].n;
    var defs = COLS[fluid];
    head.forEach(function (h, i) {
      var key = cleanHeader(h);
      var def = defs.filter(function (d) { return d.names.indexOf(key) !== -1; })[0];
      if (!def) { out.errors.push({ row: hl, col: h || ('#' + (i + 1)), msg: 'Line ' + hl + ': unknown column "' + h + '". Allowed: ' + defs.map(function (d) { return d.title; }).join(', ') + '.' }); return; }
      if (out.columns.some(function (c) { return c.key === def.key; })) { out.errors.push({ row: hl, col: h, msg: 'Line ' + hl + ': column "' + h + '" appears twice.' }); return; }
      out.columns.push({ key: def.key, idx: i, q: def.q, title: h });
    });
    if (!out.columns.some(function (c) { return c.key === 'p'; })) out.errors.push({ row: hl, col: 'p', msg: 'Line ' + hl + ': a pressure column "p" is required.' });
    if (out.columns.length < 2) out.errors.push({ row: hl, col: '', msg: 'Line ' + hl + ': add at least one property column next to p.' });
    if (out.errors.length) return out;

    for (var r = 1; r < lines.length; r++) {
      var ln = lines[r].n, cells = split(lines[r].t), row = { line: ln, vals: {} }, ok = true;
      var at = 'Line ' + ln + ', column "';
      if (cells.length > head.length) { out.errors.push({ row: ln, col: '', msg: 'Line ' + ln + ': ' + cells.length + ' values but ' + head.length + ' columns in the header.' }); continue; }
      out.columns.forEach(function (c) {
        var raw = cells[c.idx] === undefined ? '' : cells[c.idx];
        if (raw === '' || raw === '-' || raw === '—') { row.vals[c.key] = null; return; }
        if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(raw.replace(/,/g, ''))) {
          out.errors.push({ row: ln, col: c.title, msg: at + c.title + '": "' + raw + '" is not a number.' }); ok = false; return;
        }
        var v = Number(raw.replace(/,/g, ''));
        if (c.key === 'p') {
          var psia = U.pToPsia(v, units, gauge);
          if (!(psia > 0)) { out.errors.push({ row: ln, col: c.title, msg: at + c.title + '": ' + raw + ' is not a positive absolute pressure.' }); ok = false; return; }
          row.p = psia; row.vals.p = psia;
        } else {
          if (v < 0 && c.key !== 'co' && c.key !== 'cg') { out.errors.push({ row: ln, col: c.title, msg: at + c.title + '": negative value ' + raw + ' is not physical.' }); ok = false; return; }
          row.vals[c.key] = U.fromDisplay(c.q, v, units);   // stored in internal field units
        }
      });
      if (ok && row.p === undefined) { out.errors.push({ row: ln, col: 'p', msg: 'Line ' + ln + ': pressure is missing.' }); ok = false; }
      if (ok) out.rows.push(row);
    }
    if (!out.errors.length && !out.rows.length) out.errors.push({ row: 0, col: '', msg: 'Header found but no data rows.' });
    out.rows.sort(function (a, b) { return a.p - b.p; });
    return out;
  }

  /* calc: array aligned with meas (calculated at the measured pressures, null if unavailable) */
  function stats(meas, calc) {
    var e = [], zero = 0, missing = 0, unavailable = 0;
    meas.forEach(function (m, i) {
      if (m === null || m === undefined) { missing++; return; }
      var c = calc[i];
      if (c === null || c === undefined || !isFinite(c)) { unavailable++; return; }
      if (m === 0) { zero++; return; }
      e.push(100 * (c - m) / m);
    });
    var n = e.length;
    return {
      n: n, zero: zero, missing: missing, unavailable: unavailable, errors: e,
      are: n ? e.reduce(function (s, x) { return s + x; }, 0) / n : null,
      aare: n ? e.reduce(function (s, x) { return s + Math.abs(x); }, 0) / n : null,
      maxAbs: n ? Math.max.apply(null, e.map(Math.abs)) : null
    };
  }

  var BASIS_COLS = { oil: ['rs', 'bo'], gas: ['bg'] };
  /* columns: parsed.columns; measBasis: '' | 'corr' | 'lab'; calcBasis: 'corr' | 'lab' */
  function checkBasis(fluid, columns, measBasis, calcBasis) {
    var out = { needsBasis: false, error: null, cols: {} };
    columns.forEach(function (c) {
      if (c.key === 'p') return;
      if (BASIS_COLS[fluid].indexOf(c.key) === -1) { out.cols[c.key] = { status: 'ok', factor: 1 }; return; }
      out.needsBasis = true;
      if (!measBasis) { out.cols[c.key] = { status: 'blocked', reason: 'Standard-condition basis of the measured values not declared.' }; return; }
      if (measBasis === calcBasis) { out.cols[c.key] = { status: 'ok', factor: 1 }; return; }
      if (fluid === 'gas' && c.key === 'bg') {
        var f = U.stdBasis(measBasis).tR / U.stdBasis(calcBasis).tR;   // Bg = psc·Z·T/(Tsc·p) scales with 1/Tsc
        out.cols[c.key] = { status: 'converted', factor: f, reason: 'Measured Bg converted from the ' + U.stdBasis(measBasis).short + ' basis to the ' + U.stdBasis(calcBasis).short + ' basis: × ' + f.toFixed(6) + ' (Tsc ratio; gas at standard conditions taken as ideal).' };
        return;
      }
      out.cols[c.key] = { status: 'blocked', reason: (c.key === 'rs' ? 'Rs' : 'Bo') + ' measured on the ' + U.stdBasis(measBasis).short + ' basis cannot be compared with the calculated values on the ' + U.stdBasis(calcBasis).short + ' correlation basis: converting stock-tank oil volumes needs the oil’s thermal expansion and flash behaviour, which are not available.' };
    });
    if (out.needsBasis && !measBasis) out.error = 'Declare the standard-condition basis of the measured ' + columns.filter(function (c) { return BASIS_COLS[fluid].indexOf(c.key) !== -1; }).map(function (c) { return c.title; }).join(', ') + ' values (60 °F or 15 °C, both at 101.325 kPa).';
    return out;
  }

  var PVTMeasured = { COLS: COLS, BASIS_COLS: BASIS_COLS, headerText: headerText, parse: parse, stats: stats, checkBasis: checkBasis };
  root.PVTMeasured = PVTMeasured;
  if (typeof module !== 'undefined' && module.exports) module.exports = PVTMeasured;
})(typeof window !== 'undefined' ? window : globalThis);
