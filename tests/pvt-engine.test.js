/* PVT Calculator — calculation-core tests (no browser).
   Run:  node --test tests/        (Node 18+, no dependencies) */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'data/pure-components.js'), 'utf8').replace('window.PURE_COMPONENTS', 'globalThis.PURE_COMPONENTS'));
const U = require('../calc/pvt-units.js');
const C = require('../calc/pvt-correlations.js');
const E = require('../calc/pvt-engine.js');
const MD = require('../calc/pvt-measured.js');

const near = (a, b, rel, msg) => assert.ok(Math.abs(a - b) <= rel * Math.abs(b), `${msg || ''} expected ${b}, got ${a} (rel tol ${rel})`);
const oilBase = (o) => Object.assign({ fluid: 'oil', units: 'field', T: '200', gg: '0.65', oilGravityBasis: 'density', rhoSto: '53.04', oilChar: 'pb', pb: '2200', calcMode: 'list', pList: '1000 2200 3000 5000' }, o || {});
const gasBase = (o) => Object.assign({ fluid: 'gas', units: 'field', T: '200', gg: '0.65', calcMode: 'range', pMin: '200', pMax: '6000', pStep: '200' }, o || {});
const at = (r, key, psia) => r.props[key].values[r.pressures.findIndex((p) => Math.abs(p - psia) < 1e-6)];

/* ---------------------------------------------------------------- units */
test('gauge / absolute conversion uses one standard atmosphere', () => {
  near(U.pToPsia(0, 'field', true), 14.6959488, 1e-8, '0 psig');
  near(U.pToPsia(0, 'metric', true), 14.6959488, 1e-8, '0 bar(g)');
  assert.equal(U.pToPsia(0, 'metric', true), U.pToPsia(0, 'field', true), 'one gauge reference for both systems');
  near(U.pToPsia(100, 'metric', false), 1450.3773773, 1e-9, '100 bar(a)');
  near(U.pFromPsia(U.pToPsia(1234.5, 'metric', true), 'metric', true), 1234.5, 1e-12, 'round trip bar(g)');
  near(U.pFromPsia(U.pToPsia(2000, 'field', true), 'field', true), 2000, 1e-12, 'round trip psig');
});

test('gauge pressure is never treated as absolute', () => {
  const abs = E.run(oilBase({ calcMode: 'single', p: '1000' }));
  const gau = E.run(oilBase({ calcMode: 'single', p: '1000', gauge: true, pb: String(2200 - U.P_ATM_PSIA) }));
  near(gau.pressures[0], 1014.6959488, 1e-9);
  near(gau.pb, 2200, 1e-12, 'pb converted to absolute');
  assert.notEqual(abs.props.rs.values[0], gau.props.rs.values[0]);
  const neg = E.run(gasBase({ calcMode: 'single', p: '-20', gauge: true }));
  assert.equal(neg.ok, false);
  assert.match(neg.fieldErrors.p, /Absolute pressure/);
  const ok = E.run(gasBase({ calcMode: 'single', p: '-10', gauge: true }));
  assert.equal(ok.ok, true);
  near(ok.pressures[0], 4.6959488, 1e-8);
});

test('equivalent Field and Metric inputs give identical internal results', () => {
  const f = E.run(oilBase());
  const met = E.run(oilBase({
    units: 'metric', T: String((200 - 32) * 5 / 9), rhoSto: String(53.04 * U.KGM3_PER_LBFT3), pb: String(2200 / U.PSI_PER_BAR),
    pList: [1000, 2200, 3000, 5000].map((p) => p / U.PSI_PER_BAR).join(' ')
  }));
  assert.equal(met.ok, true);
  ['rs', 'bo', 'mu', 'co'].forEach((k) => f.props[k].values.forEach((v, i) => {
    if (v === null) assert.equal(met.props[k].values[i], null); else near(met.props[k].values[i], v, 1e-9, k);
  }));
  const gf = E.run(gasBase()), gm = E.run(gasBase({ units: 'metric', T: String((200 - 32) * 5 / 9), pMin: String(200 / U.PSI_PER_BAR), pMax: String(6000 / U.PSI_PER_BAR), pStep: String(200 / U.PSI_PER_BAR) }));
  assert.equal(gm.pressures.length, gf.pressures.length);
  gf.props.z.values.forEach((v, i) => near(gm.props.z.values[i], v, 1e-9, 'Z'));
  near(U.toDisplay('Rs', 100, 'metric'), 17.8107607, 1e-8, 'scf/STB -> sm3/sm3');
});

/* ------------------------------------------------- verified numerical examples */
test('Standing Rs reproduces the Ahmed worked example (Oil 1: 838 scf/STB, +11.6 %)', () => {
  // Ahmed, Reservoir Engineering Handbook, Ch. 2 Standing example: T = 250 °F, pb = 2377 psig, API 47.1, γg 0.851, measured Rs 751
  const rs = C.oil.standingRs(2377 + 14.7, 250, 47.1, 0.851);
  near(rs, 838, 0.001, 'Standing Rs');
  near(100 * (rs - 751) / 751, 11.6, 0.01, 'error %');
});

test('Standing Bo matches an independent hand calculation', () => {
  // γo = 141.5/178.6 = 0.79227; F = 751·(0.851/0.79227)^0.5 + 1.25·250 = 1090.84; Bo = 0.9759 + 0.00012·F^1.2
  const F = 751 * Math.sqrt(0.851 / (141.5 / 178.6)) + 312.5;
  near(C.oil.standingBo(751, 250, 47.1, 0.851), 0.9759 + 0.00012 * Math.pow(F, 1.2), 1e-12);
  // ln F = 6.994703, ×1.2 = 8.393644, e^ = 4418.87, Bo = 0.9759 + 0.530264 = 1.50616
  near(C.oil.standingBo(751, 250, 47.1, 0.851), 1.50616, 1e-4, 'hand value');
});

test('every Rs/pb family is self-consistent: pb(Rs(p)) = p', () => {
  Object.keys(C.oil.rs).forEach((k) => {
    [500, 1500, 3000, 4500].forEach((p) => {
      const rs = C.oil.rs[k](p, 180, 32, 0.8);
      near(C.oil.pb[k](rs, 180, 32, 0.8), p, 5e-4, k + ' at ' + p);
    });
  });
});

/* Hall-Yarborough (1973), implemented here only as an independent check of the DAK solver:
   both are separate fits of the Standing-Katz chart. */
function zHallYarborough(ppr, tpr) {
  const t = 1 / tpr, A = 0.06125 * t * Math.exp(-1.2 * (1 - t) ** 2);
  const f = (y) => -A * ppr + (y + y * y + y ** 3 - y ** 4) / (1 - y) ** 3 - (14.76 * t - 9.76 * t * t + 4.58 * t ** 3) * y * y + (90.7 * t - 242.2 * t * t + 42.4 * t ** 3) * y ** (2.18 + 2.82 * t);
  let lo = 1e-9, hi = 0.99;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
  return A * ppr / ((lo + hi) / 2);
}

test('DAK Z agrees with Hall-Yarborough within 2 % where both are published (Tpr 1.2–3.0)', (t) => {
  let worst = 0;
  for (const tpr of [1.2, 1.3, 1.5, 2.0, 2.5, 3.0]) {
    for (const ppr of [0.5, 1, 2, 4, 6, 8, 12]) {
      const d = C.gas.z.dak(ppr, tpr), h = zHallYarborough(ppr, tpr);
      worst = Math.max(worst, Math.abs(d - h) / h);
      near(d, h, 0.02, `Ppr ${ppr}, Tpr ${tpr}`);
    }
  }
  /* away from the near-critical isotherm (Tpr 1.2) the two fits agree much more closely */
  for (const tpr of [1.5, 2.0, 3.0]) for (const ppr of [1, 4, 8]) near(C.gas.z.dak(ppr, tpr), zHallYarborough(ppr, tpr), 0.006, `Ppr ${ppr}, Tpr ${tpr}`);
  t.diagnostic('max |DAK − HY| / HY = ' + (100 * worst).toFixed(2) + ' %');
  near(C.gas.z.dak(0.01, 1.5), 1, 0.002, 'Z -> 1 at low pressure');
});

test('Papay matches its closed form and real-gas cg matches the analytic derivative', () => {
  const ppr = 3, tpr = 1.5;
  near(C.gas.z.papay(ppr, tpr), 1 - 3.53 * 3 / Math.pow(10, 0.9813 * 1.5) + 0.274 * 9 / Math.pow(10, 0.8157 * 1.5), 1e-12);
  const r = E.run(gasBase({ calcMode: 'single', p: '2000', m: { pc: 'standing_natural', sour: 'none', z: 'papay', mu: 'lee_gonzalez_eakin' } }));
  const ppc = r.pc.ppc, tp = r.ctx.tR / r.pc.tpc, pr = 2000 / ppc, z = r.props.z.values[0];
  const dz = (-3.53 / Math.pow(10, 0.9813 * tp) + 2 * 0.274 * pr / Math.pow(10, 0.8157 * tp)) / ppc;
  near(r.props.cg.values[0], 1 / 2000 - dz / z, 1e-6, 'cg');
});

test('ideal-gas identities hold for every dependent property', () => {
  const r = E.run(gasBase({ behavior: 'ideal' }));
  r.pressures.forEach((p, i) => {
    const tR = 200 + 459.67, ma = 28.96 * 0.65;
    assert.equal(r.props.z.values[i], 1);
    near(r.props.rho.values[i], p * ma / (10.7316 * tR), 1e-12, 'ρ = pM/RT');
    near(r.props.bg.values[i], U.STD.pPsia * tR / (519.67 * p), 1e-12, 'Bg');
    near(r.props.cg.values[i], 1 / p, 1e-12, 'cg = 1/p');
    near(r.props.eg.values[i] * r.props.bg.values[i], 1, 1e-12, 'Eg·Bg = 1');
    near(r.props.v.values[i] * r.props.rho.values[i], 1, 1e-12, 'v·ρ = 1');
  });
});

test('real gas: dependent properties use the same Z', () => {
  const r = E.run(gasBase());
  r.pressures.forEach((p, i) => {
    const z = r.props.z.values[i], tR = 659.67, ma = 28.96 * 0.65;
    near(r.props.rho.values[i], p * ma / (z * 10.7316 * tR), 1e-12);
    near(r.props.bg.values[i], U.STD.pPsia * z * tR / (519.67 * p), 1e-12);
  });
});

/* -------------------------------------------------- empty / invalid inputs */
test('empty inputs report "Input required" and calculate nothing', () => {
  const o = E.run({ fluid: 'oil' });
  assert.equal(o.ok, false);
  ['p', 'T', 'gg', 'api', 'pb'].forEach((k) => assert.equal(o.fieldErrors[k], 'Input required', k));
  assert.equal(o.pressures.length, 0);
  assert.equal(o.scalars.length, 0);
  const g = E.run({ fluid: 'gas' });
  assert.equal(g.ok, false);
  ['p', 'T', 'gg'].forEach((k) => assert.equal(g.fieldErrors[k], 'Input required', k));
  assert.equal(g.scalars.length, 0, 'no Ma = 0 or pseudo-criticals from blank inputs');
});

test('negative absolute pressure is rejected (issue A)', () => {
  const r = E.run(gasBase({ calcMode: 'single', p: '-100' }));
  assert.equal(r.ok, false);
  assert.match(r.fieldErrors.p, /greater than 0/);
  assert.equal(r.props.rho.values.length, 0);
});

test('physical validation: temperature, gravity, density, API, text', () => {
  assert.match(E.run(gasBase({ T: '-500' })).fieldErrors.T, /absolute zero/);
  assert.match(E.run(gasBase({ gg: '0' })).fieldErrors.gg, /greater than 0/);
  assert.match(E.run(oilBase({ rhoSto: '-5' })).fieldErrors.rhoSto, /greater than 0/);
  assert.match(E.run(oilBase({ oilGravityBasis: 'api', api: '-140' })).fieldErrors.api, /−131.5/);
  assert.equal(E.run(oilBase({ T: '2x0' })).fieldErrors.T, 'Enter a number');
  /* API is not a positive-only rule: 5 °API (γo 1.037) is valid input; correlations decide availability */
  const heavy = E.run(oilBase({ oilGravityBasis: 'api', api: '5' }));
  assert.equal(heavy.fieldErrors.api, undefined);
});

test('pressure range generation, limits and the inserted bubble point', () => {
  const r = E.run(gasBase({ pMin: '100', pMax: '1050', pStep: '200' }));
  assert.deepEqual(r.pressures, [100, 300, 500, 700, 900, 1050], 'maximum always included');
  assert.match(E.run(gasBase({ pMin: '500', pMax: '400' })).fieldErrors.pMax, /greater than minimum/);
  assert.match(E.run(gasBase({ pStep: '0' })).fieldErrors.pStep, /greater than 0/);
  assert.match(E.run(gasBase({ pMin: '1', pMax: '10000', pStep: '1' })).fieldErrors.pStep, /Too many points/);
  const o = E.run(oilBase({ calcMode: 'range', pMin: '100', pMax: '5000', pStep: '1000' }));
  assert.ok(o.pressures.includes(2200), 'pb inserted');
  assert.equal(o.phase[o.inserted], 'bubble point');
});

test('pasted pressure list: errors name the value; sorted and de-duplicated', () => {
  const bad = E.run(gasBase({ calcMode: 'list', pList: '1000, 2000, abc' }));
  assert.match(bad.fieldErrors.pList, /Value 3 \("abc"\)/);
  const neg = E.run(gasBase({ calcMode: 'list', pList: '1000 -5' }));
  assert.match(neg.fieldErrors.pList, /Value 2/);
  const ok = E.run(gasBase({ calcMode: 'list', pList: '3000\n1000, 2000 1000' }));
  assert.deepEqual(ok.pressures, [1000, 2000, 3000]);
});

/* ---------------------------------------------------------- oil phase logic */
test('issue C: the specified pb controls the saturated / undersaturated split', () => {
  const r = E.run(oilBase());
  const rsb = r.rsb, bob = r.scalars.find((s) => s.key === 'bob').v;
  assert.equal(at(r, 'rs', 3000), rsb, 'Rs = Rsb at 3000 psia');
  assert.equal(at(r, 'rs', 5000), rsb, 'Rs = Rsb at 5000 psia');
  assert.ok(at(r, 'rs', 1000) < rsb, 'saturated Rs below Rsb');
  near(at(r, 'bo', 2200), bob, 1e-12, 'Bo(pb) = Bob');
  assert.ok(at(r, 'bo', 3000) < bob && at(r, 'bo', 5000) < at(r, 'bo', 3000), 'Bo falls above pb');
  // the old calculator extrapolated saturated Standing to 1151.7 scf/STB and Bo 1.6046 at 5000 psia
  assert.ok(at(r, 'rs', 5000) < 500 && at(r, 'bo', 5000) < 1.3);
});

test('Rs stays at Rsb above pb for every correlation and both characterisations', () => {
  Object.keys(C.oil.rs).forEach((m) => {
    ['pb', 'rsb'].forEach((ch) => {
      const r = E.run(oilBase({ oilChar: ch, rsb: '450', m: { rs: m, bo: 'standing' }, calcMode: 'range', pMin: '200', pMax: '6000', pStep: '100' }));
      assert.equal(r.ok, true, m);
      r.pressures.forEach((p, i) => {
        if (p >= r.pb) assert.equal(r.props.rs.values[i], r.rsb, `${m}/${ch} at ${p}`);
        else assert.ok(r.props.rs.values[i] < r.rsb, `${m}/${ch} below pb`);
      });
      if (ch === 'rsb') near(r.rsb, 450, 1e-12, 'Rsb kept as entered');
    });
  });
});

test('continuity at pb (Rs, Bo, μo) for every Bo / co combination', () => {
  Object.keys(C.oil.bo).forEach((bo) => Object.keys(C.oil.co).forEach((co) => {
    const pb = 2200, e = 5 * E.P_TOL;   // just outside the shared pressure tolerance
    const r = E.run(oilBase({ m: { rs: 'standing', bo, co }, pList: [pb - e, pb, pb + e].join(' ') }));
    ['rs', 'bo', 'mu'].forEach((k) => {
      const v = r.props[k].values;
      near(v[0], v[1], 1e-4, `${k} ${bo}/${co} below`);
      near(v[2], v[1], 1e-5, `${k} ${bo}/${co} above`);
    });
  }));
});

test('Rsb-characterised oil: derived pb is consistent with Rs(pb) = Rsb', () => {
  const r = E.run(oilBase({ oilChar: 'rsb', rsb: '600', m: { rs: 'glaso' }, pList: '1000 3000 6000' }));
  assert.ok(r.pb > 3000 && r.pb < 6000, 'derived pb ' + r.pb);
  near(r.props.rs.values[r.pressures.indexOf(6000)], 600, 1e-12);
  near(C.oil.rs.glaso(r.pb, 200, r.ctx.api, 0.65) * r.scalars.find((s) => s.key === 'rsScale').v, 600, 1e-12);
});

test('co is not fabricated below pb; above pb it is positive and Bo integrates it', () => {
  const r = E.run(oilBase());
  assert.equal(at(r, 'co', 1000), null);
  assert.match(r.props.co.reasons[0], /Not calculated below pb/);
  const A = C.oil.vbCoA(r.rsb, 200, r.ctx.api, 0.65);
  near(at(r, 'co', 3000), A / 3000, 1e-12);
  const bob = r.scalars.find((s) => s.key === 'bob').v;
  near(at(r, 'bo', 3000), bob * Math.pow(2200 / 3000, A), 1e-12);
});

test('undersaturated viscosity uses μob at pb and rises above pb', () => {
  const r = E.run(oilBase());
  const muob = r.scalars.find((s) => s.key === 'muob').v;
  near(at(r, 'mu', 2200), muob, 1e-12);
  assert.ok(at(r, 'mu', 5000) > at(r, 'mu', 3000) && at(r, 'mu', 3000) > muob);
  assert.ok(at(r, 'mu', 1000) > muob, 'less dissolved gas below pb -> more viscous');
});

test('outside a published range: value kept, warning names the variable and properties', () => {
  const r = E.run(oilBase({ T: '300' }));
  assert.equal(r.ok, true);
  const w = r.warnings.find((x) => /Standing \(1947\) \(Rs \/ pb\)/.test(x.msg) && /Temperature/.test(x.msg));
  assert.ok(w, 'Standing temperature warning');
  assert.ok(w.affects.includes('Rs'));
  assert.ok(at(r, 'rs', 1000) > 0, 'value still reported');
});

/* -------------------------------------------------------- invalid chart points */
test('invalid Z is a gap with a reason, never zero or clamped', () => {
  const r = E.run(gasBase({ T: '620', gg: '0.6', pMin: '1000', pMax: '12000', pStep: '500', m: { pc: 'standing_natural', sour: 'none', z: 'beggs_brill', mu: 'lee_gonzalez_eakin' } }));
  const bad = r.props.z.values.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  assert.ok(bad.length > 0, 'Beggs-Brill fails at high Ppr');
  bad.forEach((i) => {
    assert.match(r.props.z.reasons[i], /≤ 0|domain/);
    ['bg', 'rho', 'mu'].forEach((k) => assert.equal(r.props[k].values[i], null, k + ' follows Z'));
  });
  assert.ok(r.props.z.values[0] > 0, 'valid points remain');
  assert.ok(!r.props.z.values.some((v) => v === 0));
});

/* --------------------------------------------------------------- gas options */
test('manual chart Z: single pressure only, no cg, no curve', () => {
  const m = { pc: 'standing_natural', sour: 'none', z: 'manual', mu: 'lee_gonzalez_eakin' };
  const rng = E.run(gasBase({ m, zManual: '0.9' }));
  assert.equal(rng.ok, false);
  assert.match(rng.fieldErrors.zMethod, /one value at one pressure/);
  const one = E.run(gasBase({ m, zManual: '0.9', calcMode: 'single', p: '3000' }));
  assert.equal(one.props.z.values[0], 0.9);
  assert.equal(one.props.cg.values[0], null);
  assert.match(one.props.cg.reasons[0], /dZ\/dp/);
  assert.equal(E.run(gasBase({ m, calcMode: 'single', p: '3000' })).fieldErrors.zManual, 'Input required');
});

test('composition: totals, basis, normalisation and unknown components', () => {
  const comp = [{ name: 'Methane', formula: 'CH4', y: '0.85' }, { name: 'Ethane', formula: 'C2H6', y: '0.10' }, { name: 'Carbon dioxide', formula: 'CO2', y: '0.03' }];
  const base = { gasBasis: 'composition', comp, m: { pc: 'kay', sour: 'wichert_aziz', z: 'dak', mu: 'lee_gonzalez_eakin' } };
  const off = E.run(gasBase(base));
  assert.equal(off.ok, false);
  assert.match(off.fieldErrors.comp, /total 0.98000/);
  const norm = E.run(gasBase(Object.assign({ normalize: true }, base)));
  assert.equal(norm.ok, true);
  near(norm.ctx.comp.entries.reduce((s, e) => s + e.y, 0), 1, 1e-12);
  assert.ok(norm.info.some((t) => /normalised/.test(t)));
  near(norm.ctx.yCO2, 0.03 / 0.98, 1e-12, 'CO2 from composition feeds Wichert-Aziz');
  const pct = E.run(gasBase(Object.assign({}, base, { compBasis: 'percent', comp: [{ name: 'Methane', y: '90' }, { name: 'Ethane', y: '10' }], m: { pc: 'kay', sour: 'none', z: 'dak', mu: 'lee_gonzalez_eakin' } })));
  assert.equal(pct.ok, true);
  near(pct.ctx.ma, 0.9 * 16.043 + 0.1 * 30.07, 1e-9);
  const unk = E.run(gasBase(Object.assign({}, base, { comp: [{ name: 'Unobtainium', y: '1' }] })));
  assert.match(unk.fieldErrors.comp, /Row 1: component "Unobtainium" not found/);
  const kayNoComp = E.run(gasBase({ m: { pc: 'kay', sour: 'none', z: 'dak', mu: 'lee_gonzalez_eakin' } }));
  assert.match(kayNoComp.fieldErrors.pcMethod, /Kay mixing needs a gas composition/);
});

test('sour-gas corrections follow the published equations', () => {
  const wa = C.gas.wichertAziz(670, 375, 0.1, 0.2);
  const A = 0.3, B = 0.2, eps = 120 * (A ** 0.9 - A ** 1.6) + 15 * (B ** 0.5 - B ** 4);
  near(wa.tpc, 375 - eps, 1e-12);
  near(wa.ppc, 670 * (375 - eps) / (375 + B * (1 - B) * eps), 1e-12);
  const ck = C.gas.carrKobayashiBurrows(670, 375, 0.1, 0.2, 0.05);
  near(ck.ppc, 670 + 44 + 120 - 8.5, 1e-12); near(ck.tpc, 375 - 8 + 26 - 12.5, 1e-12);
  const r = E.run(gasBase({ m: { pc: 'standing_natural', sour: 'carr_kobayashi_burrows', z: 'dak', mu: 'lee_gonzalez_eakin' }, yCO2: '10', yH2S: '20', yN2: '5', sourBasis: 'percent' }));
  assert.equal(r.ok, true);
  near(r.ctx.yH2S, 0.2, 1e-12);
});

/* ------------------------------------------------------------ measured data */
test('measured-data import: template, row/column errors, units', () => {
  const ok = MD.parse('p (psia)\tRs (scf/STB)\tBo (rb/STB)\n1000\t150\t1.12\n3000\t-\t1.24\n2000\t300\t', 'oil', 'field', false);
  assert.equal(ok.errors.length, 0);
  assert.deepEqual(ok.rows.map((r) => r.p), [1000, 2000, 3000], 'sorted by pressure');
  assert.equal(ok.rows[2].vals.rs, null, '"-" is missing');
  assert.equal(ok.rows[1].vals.bo, null, 'empty cell is missing');
  const unk = MD.parse('p,Rs,foo\n1,2,3', 'oil', 'field', false);
  assert.match(unk.errors[0].msg, /Unknown column "foo"/);
  const bad = MD.parse('p,Rs\n1000,12x\n-20,5', 'oil', 'field', false);
  assert.equal(bad.errors.length, 2);
  assert.match(bad.errors[0].msg, /Row 2, column "Rs": "12x" is not a number/);
  assert.match(bad.errors[1].msg, /Row 3, column "p".*not a positive absolute pressure/);
  const met = MD.parse('p,Rs\n100,50', 'oil', 'metric', true);
  near(met.rows[0].p, (100 + 1.01325) * U.PSI_PER_BAR, 1e-12, 'bar(g) -> psia');
  near(met.rows[0].vals.rs, 50 / U.SM3SM3_PER_SCFSTB, 1e-12, 'sm3/sm3 -> scf/STB');
  assert.deepEqual(MD.headerText('gas', 'field', false), ['p (psia)', 'Z (–)', 'Bg (ft³/scf)', 'rhog (lbm/ft³)', 'mug (cP)', 'cg (1/psi)']);
});

test('error statistics exclude missing, unavailable and zero measured values', () => {
  const s = MD.stats([100, null, 0, 200, 50], [110, 5, 3, 180, null]);
  assert.equal(s.n, 2);
  assert.equal(s.missing, 1); assert.equal(s.zero, 1); assert.equal(s.unavailable, 1);
  near(s.are, 0, 1e-12); near(s.aare, 10, 1e-12); near(s.maxAbs, 10, 1e-12);
  assert.equal(MD.stats([null], [1]).aare, null, 'no fabricated error without data');
});

/* ------------------------------------------------------------- terminology */
test('no user-facing "BVT" wording remains in the calculator', () => {
  ['components/PvtCalc.js', 'components/OilBatch.js', 'components/PvtChart.js', 'screens/showCalc.js', 'calc/pvt-engine.js', 'calc/pvt-correlations.js', 'calc/pvt-measured.js']
    .forEach((f) => assert.ok(!/BVT/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), f));
});

/* ------------------------------------------------ unit switching / pressure grid
   Regression for: Field -> Metric turned the default oil range into 26 points (maximum twice) and
   labelled the 2200 psia row "saturated". Cause: rounded display values re-parsed as inputs, plus
   three different tolerances. Pressures are now canonical (psia) and compared with one P_TOL. */
const DEFAULT_OIL = { fluid: 'oil', units: 'field', calcMode: 'range', pMin: '200', pMax: '5000', pStep: '200', T: '200', oilGravityBasis: 'api', api: '35', gg: '0.65', oilChar: 'pb', pb: '2200' };
const toMetricText = (v) => String(+v.toPrecision(7));   // what the old UI wrote into the fields
function assertDefaultGrid(r, label) {
  assert.equal(r.ok, true, label);
  assert.equal(r.pressures.length, 25, label + ': 25 points');
  assert.equal(r.pressures.filter((p) => Math.abs(p - 5000) <= E.P_TOL).length, 1, label + ': one maximum');
  assert.equal(r.pressures[24], 5000, label + ': exact maximum');
  const bp = r.phase.map((ph, i) => (ph === 'bubble point' ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(bp, [10], label + ': one bubble-point row, at index 10');
  assert.equal(r.pressures[10], 2200, label + ': bubble-point row is exactly pb');
  assert.equal(r.phase[9], 'saturated'); assert.equal(r.phase[11], 'undersaturated');
}

test('default oil example: 25 points, one maximum, one bubble point — Field, Metric (canonical) and Metric (rounded text)', () => {
  const field = E.run(DEFAULT_OIL);
  assertDefaultGrid(field, 'field');
  /* metric with canonical values (what the UI passes after a unit switch) */
  const canon = { pMin: 200, pMax: 5000, pStep: 200, pb: 2200, T: 200 };
  const metric = E.run(Object.assign({}, DEFAULT_OIL, { units: 'metric', canon,
    pMin: toMetricText(200 / U.PSI_PER_BAR), pMax: toMetricText(5000 / U.PSI_PER_BAR), pStep: toMetricText(200 / U.PSI_PER_BAR), pb: toMetricText(2200 / U.PSI_PER_BAR), T: '93.33333' }));
  assertDefaultGrid(metric, 'metric canonical');
  assert.deepEqual(metric.pressures, field.pressures, 'identical physical points');
  ['rs', 'bo', 'mu', 'co'].forEach((k) => assert.deepEqual(metric.props[k].values, field.props[k].values, k));
  /* even the rounded 7-digit text alone (no canonical values) now gives the same grid */
  const typed = E.run(Object.assign({}, DEFAULT_OIL, { units: 'metric',
    pMin: '13.78951', pMax: '344.7379', pStep: '13.78951', pb: '151.6847', T: '93.33333' }));
  assert.equal(typed.pressures.length, 25);
  assert.equal(typed.phase.filter((p) => p === 'bubble point').length, 1);
  assert.equal(typed.phase[10], 'bubble point');
});

test('pb exactly on a grid point, between grid points, at either endpoint, outside the range', () => {
  const run = (pb) => E.run(Object.assign({}, DEFAULT_OIL, { pMin: '1000', pMax: '3000', pStep: '500', pb: String(pb) }));
  let r = run(2000);                                   // on the grid: no extra row
  assert.deepEqual(r.pressures, [1000, 1500, 2000, 2500, 3000]); assert.equal(r.inserted, -1);
  assert.deepEqual(r.phase, ['saturated', 'saturated', 'bubble point', 'undersaturated', 'undersaturated']);
  r = run(2000.004);                                   // within P_TOL of a grid point: that point becomes exactly pb
  assert.equal(r.pressures.length, 5); assert.equal(r.pressures[2], 2000.004); assert.equal(r.phase[2], 'bubble point');
  r = run(2200);                                       // between grid points: inserted once
  assert.deepEqual(r.pressures, [1000, 1500, 2000, 2200, 2500, 3000]); assert.equal(r.inserted, 3);
  assert.equal(r.phase.filter((p) => p === 'bubble point').length, 1);
  r = run(1000);                                       // at the minimum
  assert.equal(r.pressures.length, 5); assert.equal(r.phase[0], 'bubble point'); assert.ok(r.phase.slice(1).every((p) => p === 'undersaturated'));
  r = run(3000);                                       // at the maximum
  assert.equal(r.pressures.length, 5); assert.equal(r.phase[4], 'bubble point'); assert.ok(r.phase.slice(0, 4).every((p) => p === 'saturated'));
  r = run(3500);                                       // above the range: not inserted, all saturated
  assert.equal(r.pressures.length, 5); assert.ok(r.phase.every((p) => p === 'saturated'));
  r = E.run(Object.assign({}, DEFAULT_OIL, { calcMode: 'single', p: '2200.005' }));   // single pressure within P_TOL
  assert.equal(r.phase[0], 'bubble point'); assert.equal(r.pressures[0], 2200);
});

test('range: index-based grid, exact maximum once, uneven increments', () => {
  let r = E.run(gasBase({ pMin: '100', pMax: '1050', pStep: '200' }));
  assert.deepEqual(r.pressures, [100, 300, 500, 700, 900, 1050]);
  r = E.run(gasBase({ pMin: '100', pMax: '1100.004', pStep: '200' }));   // last grid point within P_TOL of the maximum
  assert.deepEqual(r.pressures, [100, 300, 500, 700, 900, 1100.004]);
  r = E.run(gasBase({ pMin: '1000', pMax: '1100', pStep: '0.25' }));
  assert.equal(r.pressures.length, 401);
  assert.equal(r.pressures[400], 1100);
  r.pressures.forEach((p, i) => assert.equal(p, 1000 + i * 0.25, 'p_i = pMin + i·step (no accumulated error)'));
  r = E.run(gasBase({ pMin: '14.7', pMax: '64.7', pStep: '0.1' }));
  assert.equal(r.pressures.length, 0, 'over the point limit: nothing generated');
  assert.match(r.fieldErrors.pStep || '', /Too many points \(501\)/);
  r = E.run(gasBase({ pMin: '14.7', pMax: '24.7', pStep: '0.1' }));
  assert.equal(r.pressures.length, 101); assert.equal(r.pressures[100], 24.7);
});

test('absolute / gauge: offsets apply to pressures, never to the increment', () => {
  const g = E.run(gasBase({ gauge: true, pMin: '0', pMax: '1000', pStep: '100' }));
  assert.equal(g.pressures.length, 11);
  g.pressures.forEach((p, i) => near(p, U.P_ATM_PSIA + 100 * i, 1e-12, 'psig grid'));
  g.pressures.slice(1).forEach((p, i) => near(p - g.pressures[i], 100, 1e-9, 'step stays 100 psi'));
  const mg = E.run(gasBase({ units: 'metric', gauge: true, pMin: '0', pMax: '100', pStep: '10', T: '93.33333' }));
  assert.equal(mg.pressures.length, 11);
  mg.pressures.slice(1).forEach((p, i) => near(p - mg.pressures[i], 10 * U.PSI_PER_BAR, 1e-9, 'step stays 10 bar'));
  near(mg.pressures[0], U.P_ATM_PSIA, 1e-12, '0 bar(g) = 1 atm');
  /* the same physical range entered as absolute or as gauge gives the same points */
  const a = E.run(gasBase({ pMin: String(U.P_ATM_PSIA), pMax: String(U.P_ATM_PSIA + 1000), pStep: '100' }));
  a.pressures.forEach((p, i) => near(p, g.pressures[i], 1e-12));
});

test('gas results are equivalent across unit systems (canonical and typed metric inputs)', () => {
  const f = E.run(gasBase());
  const c = E.run(gasBase({ units: 'metric', canon: { pMin: 200, pMax: 6000, pStep: 200, T: 200 }, pMin: 'x', pMax: 'x', pStep: 'x', T: 'x' }));
  assert.deepEqual(c.pressures, f.pressures);
  ['z', 'bg', 'rho', 'mu', 'cg'].forEach((k) => assert.deepEqual(c.props[k].values, f.props[k].values, k));
  const t = E.run(gasBase({ units: 'metric', pMin: toMetricText(200 / U.PSI_PER_BAR), pMax: toMetricText(6000 / U.PSI_PER_BAR), pStep: toMetricText(200 / U.PSI_PER_BAR), T: '93.33333' }));
  assert.equal(t.pressures.length, f.pressures.length);
  t.props.z.values.forEach((v, i) => near(v, f.props.z.values[i], 1e-6, 'Z typed metric'));
});

test('pasted list: values within P_TOL are one point (reported), canonical list used after a switch', () => {
  const r = E.run(gasBase({ calcMode: 'list', pList: '1000 1000.004 2000 2000' }));
  assert.deepEqual(r.pressures, [1000, 2000]);
  assert.ok(r.info.some((t) => /2 pasted pressures within 0.01 psi/.test(t)));
  const c = E.run(gasBase({ calcMode: 'list', units: 'metric', pList: 'ignored', canon: { pList: [3000, 1000, 2000] } }));
  assert.deepEqual(c.pressures, [1000, 2000, 3000]);
  const o = E.run(oilBase({ calcMode: 'list', pList: '1000 2199.995 3000' }));   // list value within P_TOL of pb
  assert.deepEqual(o.pressures, [1000, 2200, 3000]); assert.equal(o.phase[1], 'bubble point');
});
