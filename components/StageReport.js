/* component: StageReport — Module 04, Final Report */
(function () {
var R = window.PVT_REPORT || null;

// ---------------------------------------------------------------- helpers
function el(tag, cls, txt) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
function num(v, d) {
  if (v == null || v === '') return '';
  return Math.abs(Number(v)) < 5e-4 ? '' : Number(v).toFixed(d);
}
function kp(v) { return v == null ? '' : Math.round(v).toLocaleString('en-US'); }
function tbl(head, rows, cls) {
  var t = el('table', 'rp-t ' + (cls || ''));
  if (head) {
    var th = el('thead');
    head.forEach(function (hr) {
      var tr = el('tr');
      hr.forEach(function (c) {
        var d = el('th');
        if (typeof c === 'object' && c) {
          d.textContent = c.t || '';
          if (c.cs) d.colSpan = c.cs;
          if (c.rs) d.rowSpan = c.rs;
        } else d.textContent = c == null ? '' : c;
        tr.appendChild(d);
      });
      th.appendChild(tr);
    });
    t.appendChild(th);
  }
  var tb = el('tbody');
  rows.forEach(function (r) {
    var tr = el('tr');
    if (r && r.__cls) tr.className = r.__cls;
    (r.__cells || r).forEach(function (c) {
      var d = el('td');
      if (typeof c === 'object' && c) {
        d.textContent = c.t == null ? '' : c.t;
        if (c.cs) d.colSpan = c.cs;
        if (c.b) d.style.fontWeight = '600';
        if (c.l) d.style.textAlign = 'left';
      } else d.textContent = c == null ? '' : c;
      tr.appendChild(d);
    });
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  return t;
}
function note(lines) {
  var w = el('div', 'rp-note');
  w.appendChild(el('div', 'rp-note-h', 'Notes:'));
  lines.forEach(function (l, i) { w.appendChild(el('div', null, (i + 1) + '. ' + l)); });
  return w;
}

// ---------------------------------------------------------------- svg chart
function chart(pts, xlab, ylab, yfmt) {
  var W = 640, H = 330, mL = 74, mR = 18, mT = 16, mB = 46;
  var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
  var x0 = 0, x1 = Math.max.apply(null, xs) * 1.05;
  var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  var pad = (y1 - y0) * 0.12 || Math.abs(y1) * 0.05 || 1;
  y0 -= pad; y1 += pad;
  var X = function (v) { return mL + (v - x0) / (x1 - x0) * (W - mL - mR); };
  var Y = function (v) { return H - mB - (v - y0) / (y1 - y0) * (H - mT - mB); };
  var ns = 'http://www.w3.org/2000/svg';
  var s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  s.setAttribute('class', 'rp-chart');
  function add(t, a) { var n = document.createElementNS(ns, t); for (var k in a) n.setAttribute(k, a[k]); s.appendChild(n); return n; }
  function txt(x, y, str, anchor, size) {
    var n = document.createElementNS(ns, 'text');
    n.setAttribute('x', x); n.setAttribute('y', y);
    n.setAttribute('text-anchor', anchor || 'middle');
    n.setAttribute('font-size', size || 10);
    n.setAttribute('class', 'rp-ct');
    n.textContent = str; s.appendChild(n); return n;
  }
  var i, v;
  for (i = 0; i <= 5; i++) {
    v = y0 + (y1 - y0) * i / 5;
    add('line', { x1: mL, x2: W - mR, y1: Y(v), y2: Y(v), class: 'rp-grid' });
    txt(mL - 8, Y(v) + 3.4, yfmt(v), 'end');
  }
  for (i = 0; i <= 5; i++) {
    v = x0 + (x1 - x0) * i / 5;
    add('line', { x1: X(v), x2: X(v), y1: mT, y2: H - mB, class: 'rp-grid' });
    txt(X(v), H - mB + 16, Math.round(v).toLocaleString('en-US'));
  }
  add('rect', { x: mL, y: mT, width: W - mL - mR, height: H - mT - mB, class: 'rp-frame' });
  var d = pts.map(function (p, k) { return (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ');
  add('path', { d: d, class: 'rp-line' });
  pts.forEach(function (p) { add('circle', { cx: X(p[0]), cy: Y(p[1]), r: 3.4, class: 'rp-dot' }); });
  txt((mL + W - mR) / 2, H - 8, xlab, 'middle', 11);
  var yl = txt(0, 0, ylab, 'middle', 11);
  yl.setAttribute('transform', 'translate(15,' + ((mT + H - mB) / 2) + ') rotate(-90)');
  return s;
}
function figure(no, title, sub, pts, xlab, ylab, yfmt) {
  var w = el('section', 'rp-page');
  w.appendChild(el('div', 'rp-h2', 'Figure ' + no + ': ' + title));
  if (sub) w.appendChild(el('div', 'rp-h3', sub));
  w.appendChild(el('div', 'rp-sid', sampleLine()));
  w.appendChild(chart(pts, xlab, ylab, yfmt));
  return w;
}
function sampleLine() {
  var H = R.header;
  return 'Sample Number: ' + H.sample_no + '  ·  Cylinder Number: ' + H.cylinder_no +
         '  ·  Sample Depth: ' + H.depth_ft.toLocaleString('en-US') + ' ft TVD';
}

// ---------------------------------------------------------------- sections
function build() {
  var H = R.header, C = R.const, F = R.flash, P = R.pure;
  var TT = C.test_t.toFixed(1);
  var doc = el('div', 'rp-doc');
  var secs = [];
  function page(id, navLabel, node) {
    node.id = 'rp-' + id;
    node.setAttribute('data-nav', navLabel || '');
    doc.appendChild(node);
    if (navLabel) secs.push({ id: 'rp-' + id, label: navLabel });
    return node;
  }

  // ---- cover
  var cov = el('section', 'rp-page rp-cover');
  cov.appendChild(el('div', 'rp-brand', 'VAPS'));
  cov.appendChild(el('div', 'rp-brand-sub', 'Vision Advanced Petroleum Solution — PVT Laboratory'));
  cov.appendChild(el('div', 'rp-title', 'Final Report'));
  var ct = tbl(null, [
    [{ t: 'Report Reference', l: 1 }, H.report_ref], [{ t: 'Client', l: 1 }, H.client],
    [{ t: 'Title', l: 1 }, H.title], [{ t: 'Fluid Reference', l: 1 }, H.fluid_ref],
    [{ t: 'Sampling Date', l: 1 }, H.sampling_date], [{ t: 'Report Date', l: 1 }, H.report_date]
  ], 'rp-kv');
  cov.appendChild(ct);
  page('cover', 'Cover', cov);

  // ---- summary
  var sm = el('section', 'rp-page');
  sm.appendChild(el('div', 'rp-h1', 'Summary'));
  sm.appendChild(el('p', 'rp-p', 'MDT bottom hole samples were taken from the well and delivered to the ' +
    'Vision Advanced Petroleum Solution (VAPS) laboratory for analysis. All analysis was carried out by ' +
    'VAPS and all produced analysis was quality checked.'));
  sm.appendChild(el('div', 'rp-h2', 'Sampling Details'));
  sm.appendChild(tbl(null, [
    [{ t: 'Field', l: 1 }, H.field], [{ t: 'Well Number', l: 1 }, H.well],
    [{ t: 'Sampling Date', l: 1 }, H.sampling_date], [{ t: 'Formation', l: 1 }, H.formation],
    [{ t: 'Sample Depth', l: 1 }, H.depth_ft.toLocaleString('en-US') + ' ft TVD (' + Math.round(H.depth_m).toLocaleString('en-US') + ' m)'],
    [{ t: 'Sample Type', l: 1 }, H.sample_type],
    [{ t: 'Reservoir Pressure', l: 1 }, kp(H.res_p_kPa) + ' kPa'],
    [{ t: 'Reservoir Temperature', l: 1 }, H.res_t_C.toFixed(1) + ' °C']
  ], 'rp-kv'));
  sm.appendChild(el('div', 'rp-h2', 'Observations'));
  var obs = el('ul', 'rp-ul');
  [
    'A single-phase MDT bottom hole sample (' + H.sample_no + ') was received and thermally restored at ' +
      TT + ' °C. Sample validation confirmed a saturation pressure of ' + kp(C.psat) + ' kPa at test temperature, with no free water drained.',
    'The fluid is an undersaturated black oil: reservoir pressure ' + kp(C.res_p) + ' kPa against a saturation pressure of ' +
      kp(C.psat) + ' kPa, an undersaturation of ' + kp(C.res_p - C.psat) + ' kPa. Solution gas oil ratio at the saturation ' +
      'pressure is ' + C.rs_sat.toFixed(1) + ' sm³/sm³ (single-stage flash) and the oil formation volume factor is ' + C.bo_sat.toFixed(4) + '.',
    'Stock tank liquid density is ' + F.sto_den.toFixed(1) + ' kg/m³ (' + C.api.toFixed(1) + ' °API) with a calculated ' +
      'molecular weight of ' + F.sto_mw.toFixed(1) + ' g/mol. Evolved gas gravity is ' + F.gas_sg.toFixed(4) + ' (air = 1.000).',
    'Reservoir fluid viscosity is 4.80 cP at the saturation pressure, rising to ' + R.visc[0].mu.toFixed(2) + ' cP at reservoir pressure.',
    'The wellhead (WHS-002) and separator (SEP-003) samples were not analysed: the wellhead sample requires ' +
      'conditioning and the separator sample requires recombination before a PVT programme can be run.'
  ].forEach(function (t) { obs.appendChild(el('li', null, t)); });
  sm.appendChild(obs);
  page('summary', 'Summary', sm);

  // ---- Table 1 : analysis summary
  var t1 = el('section', 'rp-page');
  t1.appendChild(el('div', 'rp-h2', 'Table 1: Analysis Summary'));
  var REQ = ['Liquid Thermal Restoration', 'Sample Validation', 'Free Water Check', 'Saturation Pressure',
    'Single Stage Flash', 'Constant Composition Expansion', 'Differential Vaporisation', 'Separator Test',
    'Fluid Viscosity', 'GC of Gases', 'GC of Liquids'];
  var MET = ['WI/0063', 'WI/0035', 'WI/0065', 'WI/0037', 'WI/0039', 'WI/0038', 'WI/0040', 'WI/0041', 'WI/0153', 'WI/0092', 'WI/0088'];
  var SAMP = [[H.sample_no, H.cylinder_no, 'Bottom Hole Sample', 1], ['WHS-002', 'WH-02', 'Wellhead Sample', 0],
              ['SEP-003', 'SEP-03', 'Separator Sample', 0]];
  t1.appendChild(tbl(
    [[{ t: 'Sample', rs: 2 }, { t: 'Cylinder', rs: 2 }, { t: 'Description', rs: 2 }, { t: 'Analysis Requirement', cs: 11 }],
     REQ.map(function (r, i) { return { t: r + '\n' + MET[i] }; })],
    SAMP.map(function (s) {
      return [{ t: s[0], l: 1 }, { t: s[1], l: 1 }, { t: s[2], l: 1 }].concat(
        REQ.map(function () { return s[3] ? '✓' : '–'; }));
    }), 'rp-wide'));
  page('t1', 'Analysis Summary', t1);

  // ---- Table 2 : validation
  var V = R.validation, t2 = el('section', 'rp-page');
  t2.appendChild(el('div', 'rp-h2', 'Table 2: Sample Validation'));
  t2.appendChild(tbl(
    [['Sample', 'Cylinder', 'Sampling Pressure', 'Sampling Temp.', 'Saturation Pressure', 'Saturation Temp.', 'Water Content'],
     ['', '', 'kPa', '°C', 'kPa', '°C', 'cm³']],
    [[H.sample_no, H.cylinder_no, kp(V.samp_p), V.samp_t.toFixed(1), kp(V.sat_p), V.sat_t.toFixed(1), 'Nil'],
     ['WHS-002', 'WH-02', '–', '–', '–', '–', '–'],
     ['SEP-003', 'SEP-03', '–', '–', '–', '–', '–']]));
  t2.appendChild(note(['Quantity of free water drained from the sample.']));
  page('t2', 'Sample Validation', t2);

  // ---- Table 3 : single stage flash
  var t3 = el('section', 'rp-page');
  t3.appendChild(el('div', 'rp-h2', 'Table 3: Properties of Single Stage Flash at ' + TT + ' °C'));
  t3.appendChild(el('div', 'rp-sid', sampleLine()));
  t3.appendChild(tbl([['Property', 'Value', 'Unit']], [
    [{ t: 'Gas Oil Ratio', l: 1 }, F.gor.toFixed(2), 'sm³/sm³'],
    [{ t: 'Gas Gravity (air = 1.000)', l: 1 }, F.gas_sg.toFixed(4), ''],
    [{ t: 'Stabilised Liquid Density at STP', l: 1 }, F.sto_den.toFixed(1), 'kg/m³'],
    [{ t: 'Fluid Volume Factor', l: 1 }, F.fvf.toFixed(4), ''],
    [{ t: 'Saturation Pressure', l: 1 }, kp(F.psat), 'kPa'],
    [{ t: 'Fluid Density at Saturation Pressure', l: 1 }, F.den_sat.toFixed(1), 'kg/m³'],
    [{ t: 'Calculated Molecular Weight of Stock Tank Liquid', l: 1 }, F.sto_mw.toFixed(1), 'g/mol']
  ], 'rp-kv3'));
  t3.appendChild(note(['Fluid volume factor: fluid volume at saturation pressure per volume of stock tank oil at STP.']));
  page('t3', 'Single Stage Flash', t3);

  // ---- Table 4 : reservoir fluid composition
  var t4 = el('section', 'rp-page');
  t4.appendChild(el('div', 'rp-h2', 'Table 4: Reservoir Fluid Composition'));
  t4.appendChild(el('div', 'rp-sid', sampleLine()));
  t4.appendChild(tbl(
    [[{ t: 'Component', rs: 2 }, { t: 'Evolved Gas', cs: 2 }, { t: 'Stabilised Oil', cs: 2 },
      { t: 'Reservoir Fluid', cs: 2 }, { t: 'Density', rs: 2 }, { t: 'Mol. Weight', rs: 2 }],
     ['wt%', 'mol%', 'wt%', 'mol%', 'wt%', 'mol%']],
    R.comp.map(function (c) {
      return [{ t: c.c, l: 1 }, num(c.gw, 3), num(c.gm, 3), num(c.ow, 3), num(c.om, 3),
              num(c.rw, 3), num(c.rm, 3), c.den.toFixed(1), c.mw.toFixed(1)];
    }).concat([[{ t: 'Total', l: 1, b: 1 },
      { t: R.comp.reduce(function (a, c) { return a + c.gw; }, 0).toFixed(3), b: 1 },
      { t: R.comp.reduce(function (a, c) { return a + c.gm; }, 0).toFixed(3), b: 1 },
      { t: R.comp.reduce(function (a, c) { return a + c.ow; }, 0).toFixed(3), b: 1 },
      { t: R.comp.reduce(function (a, c) { return a + c.om; }, 0).toFixed(3), b: 1 },
      { t: R.comp.reduce(function (a, c) { return a + c.rw; }, 0).toFixed(3), b: 1 },
      { t: R.comp.reduce(function (a, c) { return a + c.rm; }, 0).toFixed(3), b: 1 },
      '', { t: R.comp_mw.res.toFixed(1), b: 1 }]]), 'rp-comp'));
  t4.appendChild(note(['Estimated densities taken from Katz and Firoozabadi, Journal of Petroleum Technology, November 1978.']));
  page('t4', 'Reservoir Fluid Composition', t4);

  // ---- Table 7 : PV relationship
  var t7 = el('section', 'rp-page');
  t7.appendChild(el('div', 'rp-h2', 'Table 7: PV Relationship at ' + TT + ' °C'));
  t7.appendChild(el('div', 'rp-sid', sampleLine()));
  t7.appendChild(tbl(
    [['', 'Pressure', 'Coefficient of Compressibility', 'Y-Function', 'Relative Volume', 'Fluid Density'],
     ['', 'kPa', '10⁻⁶ (vol/vol) kPa⁻¹', '', '(VSp = 1.000)', 'kg/m³']],
    R.pv.map(function (p) {
      return [{ t: p.tag, b: 1 }, kp(p.p), num(p.c, 2), num(p.y, 3), num(p.rv, 4), num(p.den, 1)];
    })));
  t7.appendChild(note(['Y = (Psat/P − 1) / (V/Vsat − 1).', 'Rp: reservoir pressure.  Sp: saturation pressure.']));
  page('t7', 'PV Relationship', t7);

  page('f1', null, figure(1, 'PV Relationship at ' + TT + ' °C',
    'Fluid Density Above the Saturation Pressure',
    R.pv.filter(function (p) { return p.den != null; }).map(function (p) { return [p.p, p.den]; }),
    'Pressure / (kPa)', 'Fluid Density / (kg/m³)', function (v) { return v.toFixed(0); }));
  page('f2', null, figure(2, 'PV Relationship at ' + TT + ' °C',
    'Relative Volume Below the Saturation Pressure',
    R.pv.filter(function (p) { return p.p <= C.psat + 1; }).map(function (p) { return [p.p, p.rv]; }),
    'Pressure / (kPa)', 'Relative Volume (V/Vsat)', function (v) { return v.toFixed(3); }));

  // ---- Table 8 : differential vaporisation
  var t8 = el('section', 'rp-page');
  t8.appendChild(el('div', 'rp-h2', 'Table 8: Differential Vaporisation at ' + TT + ' °C — Physical Properties'));
  t8.appendChild(el('div', 'rp-sid', sampleLine()));
  var under = R.pv.filter(function (p) { return p.p > C.psat + 1; });
  // Rs on the differential basis includes the Stage 7 final-flash gas (data/dl-final-flash.js); Rs = 0 only after it
  var DF = R.dl_final || { known: false };
  var IRQ = 'input req.';
  var rsdb = DF.known ? DF.rsdb.toFixed(2) : IRQ;
  var rows8 = [];
  [under[0], under[1], under[3], under[5]].forEach(function (p) {
    if (!p) return;
    rows8.push([{ t: p.tag, b: 1 }, kp(p.p), (C.bo_sat * p.rv).toFixed(4), rsdb,
                '', '', '', '', num(p.den, 1)]);
  });
  rows8.push([{ t: 'Sp', b: 1 }, kp(C.psat), C.bo_sat.toFixed(4), rsdb, '', '', '', '', F.den_sat.toFixed(1)]);
  R.dl.forEach(function (r) {
    rows8.push(['', kp(r.p), r.bo.toFixed(4), r.rs == null ? IRQ : r.rs.toFixed(2), r.z.toFixed(4), r.bg.toFixed(5),
                r.mug.toFixed(5), r.sg.toFixed(4), r.den.toFixed(1)]);
  });
  rows8.push([{ t: 'At 15 °C', b: 1 }, '101', '1.0000', '0.00', '', '', '', '', F.sto_den.toFixed(1)]);
  t8.appendChild(tbl(
    [['', 'Pressure', 'Oil FVF', 'Solution GOR', 'Z Factor', 'Gas FVF', 'Gas Viscosity', 'Gas Gravity', 'Fluid Density'],
     ['', 'kPa', 'Bo', 'Rs, sm³/sm³', '', 'Bg', 'cP', '(air = 1.000)', 'kg/m³']], rows8, 'rp-wide'));
  t8.appendChild(note([
    'Oil formation volume factor: volume at stage conditions per volume of stock tank oil at STP.',
    'Gas formation volume factor: gas volume at stage conditions per volume at STP.',
    'Calculated gas viscosity: Lee, Gonzalez and Eakin, "The viscosity of natural gases", JPT August 1966.',
    'Final stage fluid flashed to stock tank conditions: the last stage (' + kp(R.dl[R.dl.length - 1].p) + ' kPa) is that liquid\'s saturation pressure and its oil still holds dissolved gas; it is recompressed (no oil or gas added) and flashed to 15 °C, 101.325 kPa. Its gas is added once to the cumulative solution GOR; Rs = 0 only after this flash.',
    DF.known ? 'Final-flash gas: ' + Math.round(DF.gasScc) + ' scc; Rs at the last stage ' + DF.rs6.toFixed(2) + ' sm³/sm³.'
             : 'Required input missing: final-flash gas volume (standard cc). Solution GOR values marked "' + IRQ + '" depend on it.']));
  page('t8', 'Differential Vaporisation', t8);

  // ---- Table 9 : produced gas composition
  var t9 = el('section', 'rp-page');
  t9.appendChild(el('div', 'rp-h2', 'Table 9: Differential Vaporisation at ' + TT + ' °C — Composition of Produced Gases'));
  t9.appendChild(el('div', 'rp-sid', sampleLine()));
  function gasVal(k) {
    if (k === 'C15+') {
      var i = P.order.indexOf('C15'), s = 0;
      for (var j = i; j < P.order.length; j++) s += (R.gas_comp_stage[P.order[j]] || 0);
      return s;
    }
    return R.gas_comp_stage[k] || 0;
  }
  var gtot = 0; R.gas_keys.forEach(function (k) { gtot += gasVal(k); });
  t9.appendChild(tbl(
    [[{ t: 'Component / mol%' }, kp(R.dl[0].p) + ' kPa', kp(R.dl[R.dl.length - 1].p) + ' kPa']],
    R.gas_keys.map(function (k) { return [{ t: k, l: 1 }, num(gasVal(k), 3), num(gasVal(k), 3)]; })
      .concat([[{ t: 'Total', l: 1, b: 1 }, { t: gtot.toFixed(3), b: 1 }, { t: gtot.toFixed(3), b: 1 }],
               [{ t: 'Molecular Weight / (g/mol)', l: 1 }, R.comp_mw.gas.toFixed(2), R.comp_mw.gas.toFixed(2)]])));
  t9.appendChild(note(['A single gas chromatographic analysis was resolved; the same composition is reported for each stage.']));
  page('t9', 'Produced Gas Composition', t9);

  // ---- figures 3-9
  var FG = [
    [3, 'Oil Volume Factor as a Function of Pressure', 'bo', 'Oil Volume Factor, Bo', 3],
    [4, 'Cumulative Solution Gas Oil Ratio as a Function of Pressure', 'rs', 'Solution GOR / (sm³/sm³)', 1],
    [5, 'Gas Compressibility Factor as a Function of Pressure', 'z', 'Z Factor', 3],
    [6, 'Gas Formation Volume Factor as a Function of Pressure', 'bg', 'Gas FVF, Bg', 4],
    [7, 'Calculated Gas Viscosity as a Function of Pressure', 'mug', 'Gas Viscosity / (cP)', 4],
    [8, 'Gas Gravity as a Function of Pressure', 'sg', 'Gas Gravity (air = 1.000)', 3],
    [9, 'Fluid Density as a Function of Pressure', 'den', 'Fluid Density / (kg/m³)', 0]
  ];
  FG.forEach(function (f) {
    if (f[2] === 'rs' && !DF.known) {
      // cumulative Rs needs the final-flash gas: show the requirement instead of an incomplete curve
      var fw = el('section', 'rp-page');
      fw.appendChild(el('div', 'rp-h2', 'Figure ' + f[0] + ': Differential Vaporisation at ' + TT + ' °C'));
      fw.appendChild(el('div', 'rp-h3', f[1]));
      fw.appendChild(el('div', 'rp-sid', sampleLine()));
      fw.appendChild(note(['Not plotted: the cumulative solution GOR at every stage includes the gas released by the final flash of the last-stage oil, and that volume has not been entered (data/dl-final-flash.js).']));
      page('f' + f[0], null, fw);
      return;
    }
    page('f' + f[0], null, figure(f[0], 'Differential Vaporisation at ' + TT + ' °C', f[1],
      R.dl.map(function (r) { return [r.p, r[f[2]]]; }),
      'Pressure / (kPa)', f[3], function (v) { return v.toFixed(f[4]); }));
  });

  // ---- Table 11 : separator
  var t11 = el('section', 'rp-page');
  t11.appendChild(el('div', 'rp-h2', 'Table 11: Multistage Separator Test — Physical Properties'));
  t11.appendChild(el('div', 'rp-sid', sampleLine()));
  t11.appendChild(tbl(
    [['Stage', 'Pressure', 'Temperature', 'Gas Liquid Ratio', 'Separator Volume Factor', 'Gas Gravity', 'Density'],
     ['', 'kPa', '°C', 'sm³/sm³', '', '(air = 1.000)', 'kg/m³']],
    R.sep.map(function (s) {
      return [s.stage, kp(s.p), s.t.toFixed(1), s.glr.toFixed(2), s.bo.toFixed(4),
              s.sg.toFixed(4), num(s.den, 1)];
    })));
  t11.appendChild(note([
    'Separator volume factor: fluid volume at separator conditions per volume of stock tank oil at STP.',
    'GLR at saturation conditions is cumulative; subsequent values are for the specified stage.']));
  page('t11', 'Separator Test', t11);

  // ---- Table 13 : stock tank oil composition
  var t13 = el('section', 'rp-page');
  t13.appendChild(el('div', 'rp-h2', 'Table 13: Multistage Separator Test — Composition of Stock Tank Oil'));
  t13.appendChild(el('div', 'rp-sid', sampleLine()));
  var cmap = {}; R.comp.forEach(function (c) { cmap[c.c] = c; });
  function lump(k, key) {
    if (k === 'nC5') return cmap.nC5[key] + cmap['neo-C5'][key];
    if (k === 'C7') return cmap.C7[key] + cmap.Benzene[key];
    if (k === 'C8') return cmap.C8[key] + cmap.Toluene[key];
    if (k === 'C9') return cmap.C9[key] + cmap.Ethylbenzene[key] +
      cmap['M- and P- Xylenes'][key] + cmap['O- Xylene'][key];
    return cmap[k][key];
  }
  var sw = 0, smol = 0;
  var rows13 = R.sto_keys.map(function (k) {
    var w = lump(k, 'ow'), m = lump(k, 'om'); sw += w; smol += m;
    return [{ t: k, l: 1 }, num(w, 3), num(m, 3), P.den[k].toFixed(1), P.mw[k].toFixed(1)];
  });
  rows13.push([{ t: 'Total', l: 1, b: 1 }, { t: sw.toFixed(3), b: 1 }, { t: smol.toFixed(3), b: 1 },
               '', { t: R.comp_mw.oil.toFixed(1), b: 1 }]);
  t13.appendChild(tbl([['Component', 'wt%', 'mol%', 'Density kg/m³', 'MW g/mol']], rows13, 'rp-comp'));
  page('t13', 'Stock Tank Oil', t13);

  // ---- Table 14 : viscosity
  var t14 = el('section', 'rp-page');
  t14.appendChild(el('div', 'rp-h2', 'Table 14: Viscosity of Reservoir Fluid at ' + TT + ' °C'));
  t14.appendChild(el('div', 'rp-sid', sampleLine()));
  t14.appendChild(tbl([['', 'Pressure', 'Viscosity'], ['', 'kPa', 'cP']],
    R.visc.map(function (v) { return [{ t: v.tag, b: 1 }, kp(v.p), v.mu.toFixed(2)]; })));
  page('t14', 'Viscosity', t14);
  page('f10', null, figure(10, 'Viscosity of Reservoir Fluid at ' + TT + ' °C',
    'Viscosity as a Function of Pressure',
    R.visc.map(function (v) { return [v.p, v.mu]; }),
    'Pressure / (kPa)', 'Viscosity / (cP)', function (v) { return v.toFixed(2); }));

  // ---- Appendix A : molecular weights and densities
  var ap = el('section', 'rp-page');
  ap.appendChild(el('div', 'rp-h2', 'Appendix A: Molecular Weights and Densities Used in PVT Report'));
  ap.appendChild(tbl([['Component', 'Molecular Weight g/mol', 'Density kg/m³']],
    P.order.map(function (k) {
      return [{ t: k, l: 1 }, k === 'C30+' ? 'As reported' : P.mw[k].toFixed(3), P.den[k].toFixed(1)];
    }), 'rp-comp'));
  ap.appendChild(note(['Molecular weight data from the CRC Handbook of Chemistry and Physics, 88th edition.']));
  page('apA', 'Appendix A — MW & Densities', ap);

  // ---- Appendix B : derivation and assumptions
  var ab = el('section', 'rp-page');
  ab.appendChild(el('div', 'rp-h2', 'Appendix B: Derivation Basis and Assumptions'));
  ab.appendChild(el('p', 'rp-p', 'Measured quantities are the cell volumes, pressures, temperatures, coil ' +
    'masses and chromatographic compositions recorded by the laboratory. Liberated gas volumes are obtained ' +
    'from the cell volume balance at each stage. Z factor by Papay; gas viscosity by Lee, Gonzalez and Eakin; ' +
    'undersaturated oil viscosity by Vazquez-Beggs; the sub-saturation viscosity trend by Beggs-Robinson ' +
    'anchored on the measured ViscoLab reading. Stock tank density from the cell mass balance (' +
    F.sto_den.toFixed(1) + ' kg/m³) agrees with the compositional value (' + F.sto_den_comp.toFixed(1) +
    ' kg/m³) to ' + (Math.abs(F.sto_den - F.sto_den_comp) / F.sto_den_comp * 100).toFixed(1) + ' %.'));
  ab.appendChild(tbl([['Item', 'Value used', 'Basis']],
    R.assumptions.map(function (a) {
      return [{ t: a.item, l: 1 }, { t: a.value, l: 1 }, { t: a.basis, l: 1 }];
    }), 'rp-assum'));
  page('apB', 'Appendix B — Assumptions', ab);

  return { doc: doc, secs: secs };
}

// ---------------------------------------------------------------- component
class Component extends DCLogic {
  state = { active: '' };
  hostRef = React.createRef();

  componentDidMount() { this.render_(); }
  componentDidUpdate() { this.render_(); }
  componentWillUnmount() { if (this.io) this.io.disconnect(); }

  render_() {
    var host = this.hostRef.current;
    if (!host || host.dataset.built === '1' || !R) return;
    host.dataset.built = '1';
    var built = build();
    this.built = built;

    var wrap = el('div', 'rp-wrap');
    var nav = el('nav', 'rp-nav');
    nav.appendChild(el('div', 'rp-nav-h', 'Sections'));
    var self = this;
    built.secs.forEach(function (s, i) {
      var b = el('button', 'rp-nav-b' + (i === 0 ? ' is-on' : ''), s.label);
      b.onclick = function () {
        var t = document.getElementById(s.id);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        nav.querySelectorAll('.rp-nav-b').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      };
      nav.appendChild(b);
    });
    var pane = el('div', 'rp-pane');
    pane.appendChild(built.doc);
    wrap.appendChild(nav); wrap.appendChild(pane);
    host.appendChild(wrap);

    // highlight the section in view
    if ('IntersectionObserver' in window) {
      var btns = nav.querySelectorAll('.rp-nav-b');
      this.io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var idx = built.secs.map(function (s) { return s.id; }).indexOf(e.target.id);
          if (idx < 0) return;
          btns.forEach(function (x) { x.classList.remove('is-on'); });
          btns[idx].classList.add('is-on');
        });
      }, { root: pane, threshold: 0.4 });
      built.secs.forEach(function (s) {
        var n = document.getElementById(s.id); if (n) self.io.observe(n);
      });
    }
  }

  doPrint() { window.print(); }

  doWord() {
    if (!this.built) return;
    var css = document.getElementById('rp-print-style');
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="utf-8"><title>Final Report</title><style>' +
      'body{font-family:Calibri,Arial,sans-serif;font-size:9pt;color:#000;}' +
      'table{border-collapse:collapse;width:100%;margin:6pt 0;}' +
      'th,td{border:0.5pt solid #7f7f7f;padding:2pt 4pt;text-align:center;font-size:7.5pt;}' +
      'th{background:#1f7a8c;color:#fff;font-weight:600;}' +
      '.rp-h1{font-size:15pt;font-weight:700;margin:0 0 8pt;}' +
      '.rp-h2{font-size:11pt;font-weight:700;margin:10pt 0 4pt;}' +
      '.rp-h3{font-size:9.5pt;font-weight:600;margin:0 0 4pt;}' +
      '.rp-sid{font-size:8pt;color:#333;margin-bottom:4pt;}' +
      '.rp-note{font-size:7.5pt;color:#333;margin-top:4pt;}' +
      '.rp-page{page-break-after:always;}' +
      '</style></head><body>' + this.built.doc.innerHTML + '</body></html>';
    var blob = new Blob(['﻿', html], { type: 'application/msword' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Final Report - ' + (R.header.sample_no || 'PVT') + '.doc';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  renderVals() {
    return {
      onBack: this.props.onBack,
      repHost: this.hostRef,
      hasData: !!R,
      noData: !R,
      doPrint: () => this.doPrint(),
      doWord: () => this.doWord(),
      repRef: R ? R.header.report_ref : '',
      repTitle: R ? R.header.title : '',
      repSample: R ? R.header.sample_no : ''
    };
  }
}

DC.define('StageReport', {
  style: `
.rp-shell{display:flex;flex-direction:column;height:var(--page-h);}
.rp-bar{position:relative;overflow:hidden;border-radius:16px;border:1px solid rgba(95,176,255,.25);
  background:radial-gradient(120% 160% at 8% 0%,rgba(95,176,255,.12),transparent 60%),
  linear-gradient(155deg,var(--panel2),var(--panel) 65%);padding:14px 20px;margin:14px 24px 12px;}
.rp-chip{display:inline-flex;align-items:center;gap:6px;font-family:'IBM Plex Mono';font-size:10.5px;
  letter-spacing:1.4px;text-transform:uppercase;color:var(--accb3);padding:4px 10px;border-radius:999px;
  background:rgba(95,176,255,.10);border:1px solid rgba(95,176,255,.3);}
.rp-bar-t{font-size:clamp(20px,1.8vw,25px);font-weight:700;color:var(--txt);letter-spacing:-.4px;margin-top:8px;}
.rp-bar-s{font-size:12.5px;color:var(--txt2);margin-top:4px;}
.rp-btn{font-family:inherit;font-size:12px;font-weight:500;padding:10px 16px;border-radius:10px;cursor:pointer;
  background:rgba(95,176,255,.10);border:1px solid rgba(95,176,255,.40);color:var(--accb3);white-space:nowrap;}
.rp-btn:hover{background:rgba(95,176,255,.18);border-color:var(--accb3);}
.rp-wrap{flex:1;min-height:0;display:flex;gap:16px;padding:0 24px 18px;}
.rp-nav{flex:0 0 216px;overflow:auto;border:1px solid var(--line);border-radius:14px;background:var(--panel);padding:10px;}
.rp-nav-h{font-family:'IBM Plex Mono';font-size:10px;letter-spacing:1.6px;text-transform:uppercase;
  color:var(--mut);padding:6px 8px 10px;}
.rp-nav-b{display:block;width:100%;text-align:left;font-family:inherit;font-size:12px;font-weight:400;
  color:var(--txt2);background:transparent;border:1px solid transparent;border-radius:8px;padding:7px 10px;
  cursor:pointer;margin-bottom:2px;}
.rp-nav-b:hover{background:var(--chipbg);color:var(--txt);}
.rp-nav-b.is-on{background:rgba(95,176,255,.12);border-color:var(--mut);color:var(--accb3);font-weight:500;}
.rp-pane{flex:1;min-width:0;overflow:auto;border:1px solid var(--line);border-radius:14px;background:var(--icard);padding:22px;}
.rp-doc{max-width:900px;margin:0 auto;}
.rp-page{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:26px 30px;margin-bottom:20px;}
.rp-cover{text-align:center;padding:60px 30px;}
.rp-brand{font-size:34px;font-weight:700;letter-spacing:2px;color:var(--accb3);}
.rp-brand-sub{font-size:12px;color:var(--mut);margin-top:6px;}
.rp-title{font-size:26px;font-weight:600;color:var(--txt);margin:34px 0 26px;letter-spacing:-.4px;}
.rp-h1{font-size:20px;font-weight:600;color:var(--txt);margin:0 0 12px;letter-spacing:-.3px;}
.rp-h2{font-size:14px;font-weight:600;color:var(--txt);margin:0 0 4px;}
.rp-h3{font-size:12.5px;font-weight:500;color:var(--txt2);margin:0 0 6px;}
.rp-sid{font-family:'IBM Plex Mono';font-size:10.5px;color:var(--mut);margin-bottom:12px;}
.rp-p{font-size:13px;line-height:1.7;color:var(--txt2);font-weight:300;margin:0 0 14px;}
.rp-ul{font-size:12.5px;line-height:1.7;color:var(--txt2);font-weight:300;margin:0;padding-left:18px;}
.rp-ul li{margin-bottom:8px;}
.rp-t{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0 4px;}
.rp-t th{background:rgba(95,176,255,.10);color:var(--txt);font-weight:600;font-size:10px;
  border:1px solid var(--line2);padding:6px 5px;text-align:center;line-height:1.3;white-space:pre-line;}
.rp-t td{border:1px solid var(--line);padding:4px 5px;text-align:center;color:var(--txt2);
  font-variant-numeric:tabular-nums;}
.rp-t tbody tr:nth-child(even) td{background:rgba(127,127,127,.045);}
.rp-comp{font-size:10px;}
.rp-comp td,.rp-comp th{padding:2.5px 4px;}
.rp-wide{font-size:9.5px;}
.rp-wide th{font-size:9px;}
.rp-kv td:first-child,.rp-kv3 td:first-child{text-align:left;width:52%;color:var(--txt);}
.rp-assum td{text-align:left;font-size:10.5px;}
.rp-note{font-size:10.5px;line-height:1.6;color:var(--mut);margin-top:8px;}
.rp-note-h{font-weight:600;color:var(--txt2);margin-bottom:2px;}
.rp-chart{width:100%;height:auto;margin-top:8px;}
.rp-grid{stroke:var(--line);stroke-width:1;}
.rp-frame{fill:none;stroke:var(--line2);stroke-width:1;}
.rp-line{fill:none;stroke:var(--accb3);stroke-width:1.8;}
.rp-dot{fill:var(--panel);stroke:var(--accb3);stroke-width:1.6;}
.rp-ct{fill:var(--mut);font-family:'IBM Plex Mono';}
@media print{
  body *{visibility:hidden;}
  .rp-pane,.rp-pane *{visibility:visible;}
  .rp-pane{position:absolute;inset:0;overflow:visible;border:0;padding:0;background:#fff;}
  .rp-nav,.rp-bar{display:none !important;}
  .rp-page{page-break-after:always;border:0;background:#fff;padding:12mm 10mm;}
}
`,
  template: `<div class="rp-shell" data-screen-label="Module 04 — Report">
      <div class="rp-bar">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:18px; flex-wrap:wrap;">
          <div style="min-width:0;">
            <span class="rp-chip"><span style="width:6px; height:6px; border-radius:50%; background:var(--accb3);"></span>Module 04 · Report</span>
            <div class="rp-bar-t">Final Report</div>
            <div class="rp-bar-s">{{ repTitle }} &#183; {{ repRef }} &#183; Sample {{ repSample }}</div>
          </div>
          <div style="display:flex; gap:10px; flex:0 0 auto;">
            <button class="rp-btn" onclick="{{ doPrint }}">Print / PDF</button>
            <button class="rp-btn" onclick="{{ doWord }}">Export Word</button>
          </div>
        </div>
      </div>
      <sc-if value="{{ noData }}" hint-placeholder-val="{{ false }}">
        <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--mut); font-size:13px;">
          Report data set not loaded &#8212; check that <code>data/report-data.js</code> is included in index.html.
        </div>
      </sc-if>
      <div ref="{{ repHost }}" style="flex:1; min-height:0; display:flex; flex-direction:column;"></div>
    </div>`,
  logic: Component
});
})();
