/* PVT Calculator — reported regression cases and reference-condition checks (no browser).
   Run:  node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../calc/pvt-units.js');
const C = require('../calc/pvt-correlations.js');
const E = require('../calc/pvt-engine.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''}: expected ${b}, got ${a} (±${tol})`);
const sc = (r, k) => r.scalars.find((s) => s.key === k).v;

/* Case reported 2026-11-03, entered exactly as given (mixed metric units), default methods:
   p = 13 835 kPa(a), T = 64.9 °C, API = 28.1, γg = 1.424, pb = 964 kPa(a). */
const CASE = { p: [13835, 'kPa(a)'], T: [64.9, '°C'], pb: [964, 'kPa(a)'], api: '28.1', gg: '1.424' };
function runCase(extra) {
  const canon = { p: U.inputToCanon('p', CASE.p[0], CASE.p[1]), T: U.inputToCanon('T', CASE.T[0], CASE.T[1]), pb: U.inputToCanon('p', CASE.pb[0], CASE.pb[1]) };
  return E.run(Object.assign({ fluid: 'oil', units: 'field', calcMode: 'single', oilGravityBasis: 'api', oilChar: 'pb', api: CASE.api, gg: CASE.gg, p: 'x', T: 'x', pb: 'x', canon }, extra || {}));
}

test('reported case: unit conversion of the entered values', () => {
  near(U.inputToCanon('p', 13835, 'kPa(a)'), 2006.5971, 1e-4, 'p psia');            // 138.35 bar × 14.5037738
  near(U.inputToCanon('p', 964, 'kPa(a)'), 139.81638, 1e-5, 'pb psia');
  near(U.inputToCanon('T', 64.9, '°C'), 148.82, 1e-9, 'T °F');
});

test('reported case: Standing Rsb, Bob, viscosity chain (hand calculation)', () => {
  const r = runCase();
  assert.ok(r.ok);
  assert.equal(r.phase[0], 'undersaturated');
  const T = 148.82, api = 28.1, gg = 1.424, pb = U.inputToCanon('p', 964, 'kPa(a)');
  /* Standing: x = 0.0125·API − 0.00091·T ; Rs = γg·[(p/18.2 + 1.4)·10^x]^1.2048 */
  const x = 0.0125 * api - 0.00091 * T;
  near(x, 0.215824, 1e-6, 'x');
  const rsb = gg * Math.pow((pb / 18.2 + 1.4) * Math.pow(10, x), 1.2048);
  near(r.rsb, rsb, 1e-9, 'Rsb = engine');
  near(r.rsb, 36.980, 5e-4, 'Rsb scf/STB');
  assert.equal(r.props.rs.values[0], r.rsb, 'Rs = Rsb above pb');
  /* Standing Bob: F = Rsb·(γg/γo)^0.5 + 1.25·T */
  const go = 141.5 / (api + 131.5);
  near(sc(r, 'bob'), 0.9759 + 0.00012 * Math.pow(rsb * Math.sqrt(gg / go) + 1.25 * T, 1.2), 1e-12, 'Bob');
  near(sc(r, 'bob'), 1.05903, 1e-5, 'Bob rb/STB');
  near(sc(r, 'muod'), 6.2078, 1e-4, 'μod Beal cP');
  near(sc(r, 'muob'), 4.6320, 1e-4, 'μob Beggs-Robinson cP');
  near(r.props.mu.values[0], 7.4941, 1e-4, 'μo Vasquez-Beggs above pb');
});

test('reported case: Vasquez-Beggs co is negative — reported as unavailable with the raw value; Bo above pb unavailable', () => {
  const r = runCase();
  const rsb = r.rsb, T = 148.82, api = 28.1, ggs = 1.424, p = r.pressures[0];
  /* γgs = γg assumed (no separator conditions); A = (−1433 + 5·Rsb + 17.2·T − 1180·γgs + 12.61·API)/10⁵ */
  const A = (-1433 + 5 * rsb + 17.2 * T - 1180 * ggs + 12.61 * api) / 1e5;
  near(A, -1.4376e-4, 1e-8, 'A');
  near(C.oil.vbCoA(rsb, T, api, ggs), A, 1e-15, 'A = PVTCorr');
  assert.equal(r.props.co.values[0], null, 'co not reported');
  near(r.props.co.raw[0], A / p, 1e-15, 'raw co = A/p');
  assert.ok(r.props.co.raw[0] < 0, 'raw co negative');
  assert.match(r.props.co.reasons[0], /returns co = -7\.164e-8 1\/psi \(A = -1\.4376e-4\)/);
  assert.equal(r.props.bo.values[0], null, 'Bo above pb not reported');
  near(r.props.bo.raw[0], sc(r, 'bob') * Math.pow(r.pb / p, A), 1e-12, 'raw Bo = Bob·(pb/p)^A');
  assert.ok(r.props.bo.raw[0] > sc(r, 'bob'), 'raw Bo above Bob (would rise with pressure)');
  assert.match(r.props.bo.reasons[0], /would rise with pressure above pb/);
  /* the case is outside the gas-gravity ranges of Standing and of Vasquez-Beggs viscosity */
  assert.ok(r.warnings.some((w) => /Standing \(1947\) \(Rs \/ pb\): Gas gravity = 1\.424/.test(w.msg)));
  assert.ok(r.warnings.some((w) => /Vasquez-Beggs \(μo above pb\): Gas gravity = 1\.424/.test(w.msg)));
  /* the detail text shows the rejected correlation output instead of a blank */
  const d = E.detail(r, 0, 'co');
  assert.ok(d.lines.some((l) => /co = A\/p = -1\.4376e-4\/2006\.6 = -7\.1645e-8 \(correlation output, rejected/.test(l)), d.lines.join('\n'));
});

test('reported case: Petrosky-Farshad co (other method) is positive for the same inputs', () => {
  const r = runCase({ m: { co: 'petrosky_farshad' } });
  assert.ok(r.props.co.values[0] > 0 && r.props.bo.values[0] > 0);
});

test('Vasquez-Beggs A ≤ 0 domain: where it happens (qualifies "co is positive")', () => {
  /* A = 0 ⇔ 5·Rsb + 17.2·T + 12.61·API = 1433 + 1180·γgs: low Rsb, low T, low API or high γgs */
  assert.ok(C.oil.vbCoA(36.98, 148.82, 28.1, 1.424) < 0);
  assert.ok(C.oil.vbCoA(36.98, 148.82, 28.1, 0.75) > 0, 'same oil with γgs 0.75: positive');
  assert.ok(C.oil.vbCoA(100, 70, 16, 1.0) < 0, 'cool heavy oil with little gas: negative');
});

/* ---- density → API: water reference and the temperature of the density ---- */
test('density to API uses water at 60 °F (999.016 kg/m³), not 62.4 lbm/ft³', () => {
  const rho = 850;   // kg/m³ at 60 °F
  const r = E.run({ fluid: 'oil', units: 'field', calcMode: 'single', oilGravityBasis: 'density', rhoSto: 'x', canon: { rhoSto: rho / U.KGM3_PER_LBFT3, p: 3000, T: 200, pb: 2200 }, p: 'x', T: 'x', pb: 'x', gg: '0.65', oilChar: 'pb' });
  near(sc(r, 'gammaO'), 850 / 999.016, 1e-12, 'γo = ρ/ρw(60 °F)');
  near(sc(r, 'api'), 141.5 / (850 / 999.016) - 131.5, 1e-9, 'API');
  near(sc(r, 'api'), 34.8068, 1e-4, 'API value');
});

test('a 15 °C density needs the oil’s expansion coefficient and is moved to 60 °F before γo', () => {
  const base = { fluid: 'oil', units: 'field', calcMode: 'single', oilGravityBasis: 'density', rhoBasis: '15C', rhoSto: 'x', p: 'x', T: 'x', pb: 'x', gg: '0.65', oilChar: 'pb', canon: { rhoSto: 850 / U.KGM3_PER_LBFT3, p: 3000, T: 200, pb: 2200 } };
  const miss = E.run(base);
  assert.equal(miss.ok, false); assert.match(miss.fieldErrors.alpha, /Input required/);
  const r = E.run(Object.assign({}, base, { alpha: '0.0008' }));
  const dT = (60 - 32) * 5 / 9 - 15;
  near(dT, 0.55556, 1e-5, '15 °C → 60 °F');
  const rho60 = 850 / (1 + 0.0008 * dT);
  near(sc(r, 'gammaO'), rho60 / 999.016, 1e-12, 'γo from the 60 °F density');
  assert.ok(sc(r, 'api') > 34.8068, 'lighter at 60 °F → higher API than treating 15 °C as 60 °F');
  near(sc(r, 'api') - 34.8068, 0.0739, 2e-4, 'difference ≈ 0.07 °API for α = 8×10⁻⁴ 1/°C');
  assert.equal(E.run(Object.assign({}, base, { alpha: '0.02' })).ok, false, 'implausible α rejected');
});
