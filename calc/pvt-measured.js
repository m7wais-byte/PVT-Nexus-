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
   counted separately; nothing is replaced by zero.
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
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.replace(/\s+$/, ''); }).filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) { out.errors.push({ row: 0, col: '', msg: 'No data pasted.' }); return out; }
    var split = function (l) { return (l.indexOf('\t') !== -1 ? l.split('\t') : l.split(/[,;]/)).map(function (s) { return s.trim(); }); };
    var head = split(lines[0]);
    var defs = COLS[fluid];
    head.forEach(function (h, i) {
      var key = cleanHeader(h);
      var def = defs.filter(function (d) { return d.names.indexOf(key) !== -1; })[0];
      if (!def) { out.errors.push({ row: 1, col: h || ('#' + (i + 1)), msg: 'Unknown column "' + h + '". Allowed: ' + defs.map(function (d) { return d.names[0]; }).join(', ') + '.' }); return; }
      if (out.columns.some(function (c) { return c.key === def.key; })) { out.errors.push({ row: 1, col: h, msg: 'Column "' + h + '" appears twice.' }); return; }
      out.columns.push({ key: def.key, idx: i, q: def.q, title: h });
    });
    if (!out.columns.some(function (c) { return c.key === 'p'; })) out.errors.push({ row: 1, col: 'p', msg: 'A pressure column "p" is required.' });
    if (out.columns.length < 2) out.errors.push({ row: 1, col: '', msg: 'Add at least one property column next to p.' });
    if (out.errors.length) return out;

    for (var r = 1; r < lines.length; r++) {
      var cells = split(lines[r]), row = { line: r + 1, vals: {} }, ok = true;
      out.columns.forEach(function (c) {
        var raw = cells[c.idx] === undefined ? '' : cells[c.idx];
        if (raw === '' || raw === '-' || raw === '—') { row.vals[c.key] = null; return; }
        if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(raw.replace(/,/g, ''))) {
          out.errors.push({ row: r + 1, col: c.title, msg: 'Row ' + (r + 1) + ', column "' + c.title + '": "' + raw + '" is not a number.' }); ok = false; return;
        }
        var v = Number(raw.replace(/,/g, ''));
        if (c.key === 'p') {
          var psia = U.pToPsia(v, units, gauge);
          if (!(psia > 0)) { out.errors.push({ row: r + 1, col: c.title, msg: 'Row ' + (r + 1) + ', column "' + c.title + '": ' + raw + ' is not a positive absolute pressure.' }); ok = false; return; }
          row.p = psia; row.vals.p = psia;
        } else {
          if (v < 0 && c.key !== 'co' && c.key !== 'cg') { out.errors.push({ row: r + 1, col: c.title, msg: 'Row ' + (r + 1) + ', column "' + c.title + '": negative value ' + raw + ' is not physical.' }); ok = false; return; }
          row.vals[c.key] = U.fromDisplay(c.q, v, units);   // stored in internal field units
        }
      });
      if (ok && row.p === undefined) { out.errors.push({ row: r + 1, col: 'p', msg: 'Row ' + (r + 1) + ': pressure is missing.' }); ok = false; }
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

  var PVTMeasured = { COLS: COLS, headerText: headerText, parse: parse, stats: stats };
  root.PVTMeasured = PVTMeasured;
  if (typeof module !== 'undefined' && module.exports) module.exports = PVTMeasured;
})(typeof window !== 'undefined' ? window : globalThis);
