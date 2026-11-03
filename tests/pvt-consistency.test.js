/* PVT Calculator — physical-consistency audit (no browser).
   Sweeps oil and gas inputs across every selectable correlation and checks behaviour that must hold
   whatever the correlation: continuity at pb, the expected trends below / above pb, positive co and cg,
   ideal-gas limits and internal consistency of the derived gas properties.
   Run:  node --test tests/ */
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

/* oils inside the common published ranges of all five Rs/Bo families (T 120–240 °F, API 25–44, γg 0.76–0.85) */
const OILS = [];
[130, 180, 230].forEach((T) => [26, 34, 42].forEach((api) => [0.78, 0.84].forEach((gg) => [1800, 3000].forEach((pb) => OILS.push({ T, api, gg, pb })))));
const run = (o, m, ps) => E.run({ fluid: 'oil', units: 'field', calcMode: 'list', oilGravityBasis: 'api', oilChar: 'pb', T: String(o.T), api: String(o.api), gg: String(o.gg), pb: String(o.pb), m, pressuresPsia: ps });

test('oil, every Rs/Bo/co/dead-oil combination: continuity at pb and physical trends', () => {
  let n = 0;
  Object.keys(C.META.rsFamily).forEach((rs) => Object.keys(C.META.bo).forEach((bo) => Object.keys(C.META.co).forEach((co) => Object.keys(C.META.muDead).forEach((muDead) => {
    OILS.forEach((o) => {
      const ps = [0.5, 0.75, 0.999, 1, 1.001, 1.3, 1.8].map((f) => f * o.pb);
      const r = run(o, { rs, bo, co, muDead }, ps);
      const tag = `${rs}/${bo}/${co}/${muDead} T=${o.T} API=${o.api} γg=${o.gg} pb=${o.pb}`;
      assert.ok(r.ok, tag);
      const v = (k) => r.props[k].values;
      const iPb = r.pressures.findIndex((p) => Math.abs(p - o.pb) <= E.P_TOL);
      assert.ok(iPb > 0, tag + ' pb in the set');
      /* Rs: rises to Rsb, constant above */
      assert.ok(v('rs')[0] < v('rs')[1] && v('rs')[1] < v('rs')[2], tag + ' Rs rises below pb');
      assert.ok(Math.abs(v('rs')[2] - r.rsb) / r.rsb < 2e-3, tag + ' Rs continuous at pb');
      assert.ok(v('rs').slice(iPb).every((x) => Math.abs(x - r.rsb) < 1e-9), tag + ' Rs = Rsb above pb');
      /* Bo: rises below pb, maximum at pb, falls above; continuous at pb */
      assert.ok(v('bo')[0] < v('bo')[1] && v('bo')[1] < v('bo')[2], tag + ' Bo rises below pb');
      assert.ok(v('bo')[iPb + 1] < v('bo')[iPb] && v('bo')[iPb + 2] < v('bo')[iPb + 1], tag + ' Bo falls above pb');
      assert.ok(Math.abs(v('bo')[2] - v('bo')[iPb]) / v('bo')[iPb] < 1e-3, tag + ' Bo continuous at pb');
      assert.ok(v('bo').every((x) => x > 1), tag + ' Bo > 1');
      /* μo: falls towards pb, minimum at pb, rises above */
      assert.ok(v('mu')[0] > v('mu')[1] && v('mu')[1] > v('mu')[2], tag + ' μo falls below pb');
      assert.ok(v('mu')[iPb + 1] > v('mu')[iPb] && v('mu')[iPb + 2] > v('mu')[iPb + 1], tag + ' μo rises above pb');
      assert.ok(Math.abs(v('mu')[2] - v('mu')[iPb]) / v('mu')[iPb] < 2e-3, tag + ' μo continuous at pb');
      /* co: none below pb (with a reason), positive and falling with p above */
      assert.ok(v('co').slice(0, iPb).every((x) => x === null), tag + ' no co below pb');
      assert.ok(/Not calculated below pb/.test(r.props.co.reasons[0]), tag + ' co reason');
      const above = v('co').slice(iPb + 1);
      assert.ok(above.every((x) => x > 0 && x < 1e-3) && above[1] < above[0], tag + ' co > 0, decreasing');
      n++;
    });
  }))));
  assert.ok(n > 1000, 'cases: ' + n);
});

test('oil: pb from Rsb is consistent with Rsb from pb (each family, Rs continuity factor ≈ 1)', () => {
  Object.keys(C.META.rsFamily).forEach((rs) => OILS.forEach((o) => {
    const a = run(o, { rs }, [o.pb]);
    const b = E.run({ fluid: 'oil', units: 'field', calcMode: 'single', oilGravityBasis: 'api', oilChar: 'rsb', T: String(o.T), api: String(o.api), gg: String(o.gg), rsb: String(a.rsb), p: String(o.pb), m: { rs } });
    assert.ok(Math.abs(b.pb - o.pb) / o.pb < 5e-3, `${rs}: pb ${o.pb} -> Rsb ${a.rsb} -> pb ${b.pb}`);
    const scale = b.scalars.find((s) => s.key === 'rsScale').v;
    assert.ok(Math.abs(scale - 1) < 5e-3, `${rs}: continuity factor ${scale}`);
  }));
});

test('oil: one calculation path — a curve point equals the single-pressure result', () => {
  const base = { fluid: 'oil', units: 'field', oilGravityBasis: 'api', oilChar: 'pb', T: '200', api: '35', gg: '0.65', pb: '2200' };
  [1000, 2200, 3000].forEach((p) => {
    const one = E.run(Object.assign({}, base, { calcMode: 'single', p: String(p) }));
    const cur = E.run(Object.assign({}, base, { calcMode: 'list', pressuresPsia: [14.696, 500, p, 4500] }));
    const i = cur.pressures.findIndex((x) => Math.abs(x - p) <= E.P_TOL);
    ['rs', 'bo', 'mu', 'co'].forEach((k) => assert.equal(cur.props[k].values[i], one.props[k].values[0], k + ' at ' + p));
  });
});

test('gas: ideal-gas limits and derived-property consistency across Z methods', () => {
  ['dak', 'papay', 'beggs_brill'].forEach((z) => [0.6, 0.8, 1.0].forEach((gg) => [150, 250].forEach((T) => {
    const r = E.run({ fluid: 'gas', units: 'field', calcMode: 'list', T: String(T), gg: String(gg), pressuresPsia: [15, 500, 1500, 3000], m: { z } });
    const tag = `${z} γg=${gg} T=${T}`;
    assert.ok(r.ok, tag);
    const tR = T + 459.67, ma = 28.96 * gg;
    assert.ok(Math.abs(r.props.z.values[0] - 1) < 0.01, tag + ' Z → 1 at 15 psia: ' + r.props.z.values[0]);
    r.pressures.forEach((p, i) => {
      const Z = r.props.z.values[i]; if (Z === null) return;
      assert.ok(Math.abs(r.props.bg.values[i] - U.STD_BASES.corr.pPsia * Z * tR / (519.67 * p)) < 1e-12, tag + ' Bg');
      assert.ok(Math.abs(r.props.rho.values[i] - p * ma / (Z * 10.7316 * tR)) < 1e-9, tag + ' ρg');
      assert.ok(Math.abs(r.props.eg.values[i] * r.props.bg.values[i] - 1) < 1e-12, tag + ' Eg = 1/Bg');
      if (r.props.cg.values[i] !== null) assert.ok(r.props.cg.values[i] > 0, tag + ' cg > 0');
    });
    const id = E.run({ fluid: 'gas', units: 'field', calcMode: 'list', T: String(T), gg: String(gg), pressuresPsia: [500, 2000], behavior: 'ideal' });
    id.pressures.forEach((p, i) => { assert.equal(id.props.z.values[i], 1); assert.ok(Math.abs(id.props.cg.values[i] - 1 / p) < 1e-15, 'ideal cg = 1/p'); });
  })));
});

test('unit factors used by the calculator', () => {
  assert.ok(Math.abs(U.SM3SM3_PER_SCFSTB - 0.1781076) < 1e-6, 'scf/STB → sm³/sm³');
  assert.ok(Math.abs(U.KGM3_PER_LBFT3 - 16.018463) < 1e-6, 'lbm/ft³ → kg/m³');
  assert.ok(Math.abs(U.PSI_PER_BAR - 14.5037738) < 1e-7, 'bar → psi');
  assert.ok(Math.abs(U.P_ATM_PSIA - 14.6959488) < 1e-7, '1 atm in psia');
  assert.ok(Math.abs(U.toDisplay('comp', 1e-5, 'metric') - 1.45037738e-4) < 1e-12, 'co 1/psi → 1/bar');
});
