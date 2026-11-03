/* PVT Nexus — browser end-to-end checks (Playwright + headless Chromium).
   Run from the repository root:   node tests/ui.e2e.js
   Starts its own static server on a free port; exits non-zero on any failure.
   Screenshots go to tests/out/ (git-ignored).

   Calculator sections (rewritten 2026-11-04 for the shared workflow: inputs once -> all properties ->
   full-page "Explain this property"): both fluids, per-input unit selectors, mixed-unit entry, repeated
   conversions, invalid inputs, partial results, exports, measured data and preserved state.
   Numerical expectations are taken from PVTEngine.run in the same page (field units), so the
   browser checks test the UI path, not a second copy of the equations. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});

const fails = [], passes = [];
function check(name, cond, info) { (cond ? passes : fails).push(name + (cond || info === undefined ? '' : ' — ' + info)); }

const clickText = async (p, t, sel = 'button') => {
  if (t === 'Measured Data' || t === 'Methods & References') { await p.locator('.pv-more-tools').evaluate((e) => { e.open = true; }); sel = '.pv-more-menu button'; }
  await p.evaluate(([text, selector]) => {
    const b = [...document.querySelectorAll(selector)].find((x) => x.innerText.trim() === text || x.innerText.trim().startsWith(text));
    if (!b) throw new Error('no element: ' + text);
    for (let a = b.parentElement; a; a = a.parentElement) if (a.tagName === 'DETAILS') a.open = true;
    b.click();
  }, [t, sel]);
};
const settle = (p, ms = 300) => p.waitForTimeout(ms);
const status = (p) => p.$eval('#pv-status', (e) => e.innerText.replace(/\s+/g, ' ').trim());
const openAdv = (p) => p.evaluate(() => { const d = document.querySelector('#ow-adv'); if (d) d.open = true; });
const setField = async (p, k, v) => { await openAdv(p); await p.fill('#ow-in-' + k, String(v)); await settle(p, 60); };
const setUnit = async (p, k, u) => { await openAdv(p); await p.selectOption('[data-wu="' + k + '"]', u); await settle(p, 60); };
const seg = async (p, key, v) => { await openAdv(p); await p.click('[data-wseg="' + key + '"][data-v="' + v + '"]'); await settle(p, 120); };
const method = async (p, k, v) => { await openAdv(p); await p.selectOption('[data-wm="' + k + '"]', v); await settle(p, 120); };
const calc = async (p) => { await p.click('#ow-calc'); await settle(p, 350); };
const cardVal = (p, k) => p.$eval(`.ow-card[data-wprop="${k}"] .ow-val strong`, (e) => e.innerText.trim());
const cardUnit = (p, k) => p.$eval(`.ow-card[data-wprop="${k}"] .ow-val span`, (e) => e.innerText.trim()).catch(() => '');
const explain = async (p, k) => { await p.click(`.ow-card[data-wprop="${k}"] .ow-explain`); await settle(p, 450); };
const back = async (p) => { await p.click('#ow-back'); await settle(p, 300); };
const noHScroll = (p) => p.evaluate(() => { const m = document.querySelector('.pv-main'); return document.documentElement.scrollWidth <= window.innerWidth + 1 && (!m || m.scrollWidth <= m.clientWidth + 1); });
const download = async (p, btn) => { const [d] = await Promise.all([p.waitForEvent('download'), p.click(btn)]); return { name: d.suggestedFilename(), buf: fs.readFileSync(await d.path()) }; };
/* the same physical inputs run directly through PVTEngine (field units, canonical values) */
const engine = (p, inp) => p.evaluate((x) => { const r = window.PVTEngine.run(x); const o = { ok: r.ok }; Object.keys(r.props).forEach((k) => { o[k] = r.props[k].values[0]; }); o.reasons = {}; Object.keys(r.props).forEach((k) => { o.reasons[k] = r.props[k].reasons[0]; }); return o; }, inp);
const OIL_EX = { fluid: 'oil', units: 'field', calcMode: 'single', oilGravityBasis: 'api', oilChar: 'pb', p: '3000', T: '200', api: '35', gg: '0.65', pb: '2200' };
const GAS_EX = { fluid: 'gas', units: 'field', calcMode: 'single', gasBasis: 'gravity', p: '3000', T: '200', gg: '0.65' };
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

async function openApp(browser, w, h, theme) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, acceptDownloads: true });
  await ctx.addInitScript((t) => { try { localStorage.setItem('pvtTheme', t); localStorage.setItem('sgOpen', '0'); } catch (e) {} }, theme);
  const p = await ctx.newPage();
  p.__errs = [];
  p.on('pageerror', (e) => p.__errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') p.__errs.push(m.text()); });
  await p.goto(BASE + '/index.html');
  await settle(p, 700);
  await clickText(p, 'Enter Dashboard');
  await settle(p);
  return p;
}
let BASE = '';

(async () => {
  await new Promise((r) => server.listen(0, r));
  BASE = 'http://localhost:' + server.address().port;
  const browser = await chromium.launch();
  try {
    /* ================= routing ================= */
    let p = await openApp(browser, 1366, 768, 'light');
    await clickText(p, 'Gas Calculator'); await settle(p);
    check('Gas Calculator opens gas mode', (await p.$eval('.pv', (e) => e.dataset.fluid)) === 'gas');
    await clickText(p, 'Back'); await settle(p);
    await clickText(p, 'Oil Calculator'); await settle(p);
    check('Oil Calculator opens oil mode', (await p.$eval('.pv', (e) => e.dataset.fluid)) === 'oil');
    await clickText(p, 'Gas', '.pv-fluid button'); await settle(p);
    check('Oil/Gas selector switches mode', (await p.$eval('.pv-title', (e) => e.innerText)) === 'Gas Properties');
    await clickText(p, 'Back'); await settle(p);
    check('Back returns to the dashboard', await p.$$eval('button', (b) => b.some((x) => x.innerText.includes('PVT Calculator'))));
    await clickText(p, 'PVT Calculator'); await settle(p);
    check('PVT Calculator reopens the last fluid', (await p.$eval('.pv', (e) => e.dataset.fluid)) === 'gas');

    /* ================= shared workflow structure (both fluids) ================= */
    for (const fl of ['gas', 'oil']) {
      await clickText(p, fl === 'oil' ? 'Oil' : 'Gas', '.pv-fluid button'); await settle(p);
      check(`${fl}: no property-picker cards`, (await p.$$('.pv-choice')).length === 0);
      check(`${fl}: one primary button`, (await p.$$eval('.ow-calc', (b) => b.map((x) => x.innerText.trim()))).join() === `Calculate ${fl} properties`);
      check(`${fl}: ${fl === 'oil' ? 4 : 5} empty result cards, Explain disabled`, (await p.$$('.ow-card.is-empty')).length === (fl === 'oil' ? 4 : 5) && (await p.$$('.ow-card .ow-explain:not([disabled])')).length === 0);
      check(`${fl}: gas gravity labelled relative to air`, /relative to air/i.test(await p.innerText('[data-f="gg"]')));
      check(`${fl}: methods are under a closed Advanced`, !!(await p.$('#ow-adv:not([open]) [data-wm]')));
      const units = await p.$$eval('[data-wu="p"] option', (o) => o.map((x) => x.value).join(','));
      check(`${fl}: pressure unit selector lists all PR #13 units`, units === 'psia,psig,kPa(a),kPa(g),MPa(a),MPa(g),bar(a),bar(g)', units);
      check(`${fl}: temperature unit selector`, (await p.$$eval('[data-wu="T"] option', (o) => o.map((x) => x.value).join(','))) === '°F,°C,K,°R');
    }
    check('oil: pb has its own unit selector', !!(await p.$('[data-wu="pb"]')));

    /* ================= invalid inputs ================= */
    await clickText(p, 'Gas', '.pv-fluid button'); await settle(p);
    await calc(p);
    const reqG = await p.$$eval('[data-werr]', (els) => els.filter((e) => e.innerText === 'Input required').map((e) => e.dataset.werr));
    check('blank gas: Input required beside p, T, γg', ['p', 'T', 'gg'].every((k) => reqG.includes(k)), reqG.join(','));
    const sumG = await p.innerText('#ow-errsum');
    check('blank gas: summary names the missing fields', /Missing: Pressure, Temperature, Gas specific gravity/.test(sumG) && !/Input required/.test(sumG), sumG);
    check('blank gas: status "Input needed · 3 fields"', /^Input needed 3 fields$/.test(await status(p)), await status(p));
    await p.click('.pv-errlink[data-wfocus="T"]'); await settle(p, 150);
    check('summary link focuses the field', (await p.evaluate(() => document.activeElement && document.activeElement.id)) === 'ow-in-T');
    await setField(p, 'p', '-100'); await setField(p, 'T', '200'); await setField(p, 'gg', '0.65'); await calc(p);
    check('negative pressure: field error shown', /Absolute pressure must be greater than 0/.test(await p.innerText('[data-werr="p"]')));
    check('negative pressure: summary names the field', /Check: Pressure — Absolute pressure must be greater than 0/.test(await p.innerText('#ow-errsum')));
    check('negative pressure: status "Invalid input", no values', /Invalid input/.test(await status(p)) && (await p.$$('.ow-card.is-empty')).length === 5);
    await setUnit(p, 'p', 'psig'); await setField(p, 'p', '-20'); await calc(p);
    check('gauge below −1 atm rejected as absolute ≤ 0', /Absolute pressure must be greater than 0/.test(await p.innerText('[data-werr="p"]')));
    await setField(p, 'p', 'abc'); await calc(p);
    check('non-numeric text rejected', /Enter a number/.test(await p.innerText('[data-werr="p"]')));
    await setUnit(p, 'p', 'psia');
    await clickText(p, 'Oil', '.pv-fluid button'); await settle(p);
    await calc(p);
    check('blank oil: summary lists every missing field', /Missing: Pressure, Temperature, Gas specific gravity, Oil gravity \(API\), Bubble-point pressure/.test(await p.innerText('#ow-errsum')), await p.innerText('#ow-errsum'));
    await p.click('#ow-example'); await settle(p);
    check('example fills the fields and marks them', (await p.inputValue('#ow-in-pb')) === '2200' && /Example data/.test(await p.innerText('#ow-ex-label')));
    await seg(p, 'oilChar', 'rsb'); await method(p, 'rs', 'petrosky_farshad'); await setField(p, 'rsb', '0.0001'); await calc(p);
    check('characterisation failure: status "Calculation failed"', /Calculation failed/.test(await status(p)), await status(p));
    check('failure explained in the summary', /Calculation failed: .*gives pb ≤ 0/.test(await p.innerText('#ow-errsum')));
    await seg(p, 'oilChar', 'pb'); await method(p, 'rs', 'standing');

    /* ================= oil example: four results = engine ================= */
    await p.click('#ow-example'); await settle(p); await calc(p);
    const ref = await engine(p, OIL_EX);
    const ov = { rs: await cardVal(p, 'rs'), bo: await cardVal(p, 'bo'), mu: await cardVal(p, 'mu'), co: await cardVal(p, 'co') };
    check('oil Rs card = engine', Math.abs(+ov.rs - ref.rs) < 0.06, ov.rs + ' vs ' + ref.rs);
    check('oil Bo card = engine', Math.abs(+ov.bo - ref.bo) < 6e-5, ov.bo + ' vs ' + ref.bo);
    check('oil μo card = engine', rel(+ov.mu, ref.mu) < 1e-3, ov.mu + ' vs ' + ref.mu);
    check('oil co card = engine', rel(+ov.co, ref.co) < 1e-3, ov.co + ' vs ' + ref.co);
    check('oil: status "All 4 calculated"', /^All 4 calculated/.test(await status(p)), await status(p));
    check('oil: each card has unit, description, Explain', await p.$$eval('.ow-card', (cs) => cs.every((c) => c.querySelector('.ow-val span') && c.querySelector('.ow-desc').innerText.length > 20 && c.querySelector('.ow-explain:not([disabled])'))));
    check('oil: conditions line', /p = 3000\.0 psia/.test(await p.innerText('.ow-cond')) && /undersaturated/i.test(await p.innerText('.ow-cond')));

    /* ================= individual units: repeated conversions, independence ================= */
    for (let round = 0; round < 2; round++) for (const u of ['psig', 'kPa(a)', 'kPa(g)', 'MPa(a)', 'MPa(g)', 'bar(a)', 'bar(g)', 'psia']) await setUnit(p, 'p', u);
    check('p: 16 unit switches return exactly to 3000 psia', (await p.inputValue('#ow-in-p')) === '3000');
    for (const u of ['°C', 'K', '°R', '°F', '°C', 'K', '°R', '°F']) await setUnit(p, 'T', u);
    check('T: 8 unit switches return exactly to 200 °F', (await p.inputValue('#ow-in-T')) === '200');
    check('unit switches: results still current (same physical inputs)', !(await p.$('.ow-stale')) && (await cardVal(p, 'bo')) === ov.bo);
    await setUnit(p, 'p', 'bar(g)');
    check('p in bar(g) = 3000 psia − 1 atm', (await p.inputValue('#ow-in-p')) === '205.8295' && (await p.$eval('[data-wu="pb"]', (s) => s.value)) === 'psia', await p.inputValue('#ow-in-p'));
    check('pb keeps its own unit and text', (await p.inputValue('#ow-in-pb')) === '2200');
    check('conditions follow the operating-pressure unit', /p = 205\.83 bar\(g\)/.test(await p.innerText('.ow-cond')), await p.innerText('.ow-cond'));
    await setUnit(p, 'p', 'psia');
    /* mixed-unit entry: typed values in different units give the same results as field units */
    await setUnit(p, 'p', 'MPa(a)'); await setField(p, 'p', '20.68427');
    await setUnit(p, 'T', 'K'); await setField(p, 'T', '366.4833');
    await setUnit(p, 'pb', 'kPa(g)'); await setField(p, 'pb', String(+(2200 / 14.503773773 * 100 - 101.325).toFixed(4)));
    await calc(p);
    check('mixed units (MPa(a), K, kPa(g)): Bo = field-unit result', Math.abs(+(await cardVal(p, 'bo')) - ref.bo) < 2e-4, await cardVal(p, 'bo'));
    await setUnit(p, 'p', 'psia'); await setUnit(p, 'T', '°F'); await setUnit(p, 'pb', 'psia');
    await p.click('#ow-example'); await settle(p); await calc(p);

    /* ================= result units (display only) ================= */
    await clickText(p, 'Metric', '[data-wunits]'); await settle(p);
    check('metric Rs = scf/STB × 0.178108', Math.abs(+(await cardVal(p, 'rs')) - ref.rs * 0.1781076) < 0.006 && /sm³\/sm³/.test(await cardUnit(p, 'rs')));
    check('metric Bo unchanged (ratio)', (await cardVal(p, 'bo')) === ov.bo && /rm³\/sm³/.test(await cardUnit(p, 'bo')));
    check('metric co in 1/bar', /1\/bar/.test(await cardUnit(p, 'co')));
    check('result units leave inputs and their units alone', (await p.inputValue('#ow-in-p')) === '3000' && (await p.$eval('[data-wu="p"]', (s) => s.value)) === 'psia');
    await clickText(p, 'Field', '[data-wunits]'); await settle(p);

    /* ================= stale results ================= */
    await setField(p, 'T', '210');
    check('edit: stale banner, Explain disabled, status "Inputs changed"', !!(await p.$('.ow-stale')) && (await p.$$('.ow-card.is-stale .ow-explain:disabled')).length === 4 && /Inputs changed/.test(await status(p)));
    await setField(p, 'T', '200');
    check('restoring the exact input clears the stale mark', !(await p.$('.ow-stale')) && /All 4 calculated/.test(await status(p)));
    await method(p, 'bo', 'glaso');
    check('method change marks results stale', !!(await p.$('.ow-stale')));
    await method(p, 'bo', 'standing');

    /* ================= detail page (oil Bo) ================= */
    await explain(p, 'bo');
    const dtext = (await p.innerText('.ow-detail')).toLowerCase();
    check('detail: full page, not a drawer', !!(await p.$('.pv-main > .ow-detail')) && !(await p.$('.ow-card')));
    check('detail: value equals the card', (await p.innerText('.ow-dval strong')) === ov.bo);
    check('detail: every required section', ['what it means', 'why it matters', 'correlation and applicability', 'symbols and values used', 'substituted values', 'intermediate values and dependencies', 'graph pressure range', 'method comparison', 'results table', 'references'].every((t) => dtext.includes(t)));
    check('detail: substituted Bob line (Standing)', /F = 432\.\d+·\(0\.6500\/0\.8\d+\)\^0\.5 \+ 1\.25·200\.0/.test(await p.innerText('.pv-subs')), await p.innerText('.pv-subs'));
    check('detail: chart with operating line and pb marker', /p = 3000\.0 psia/.test(await p.innerText('#ow-chart-host')) && /pb = 2200\.0 psia/.test(await p.innerText('#ow-chart-host')));
    await p.click('[data-wfold="tblbo"] > summary'); await settle(p);
    const opRow = await p.$eval('#ow-tbl tr.is-op', (tr) => [...tr.cells].map((c) => c.innerText.trim()));
    check('table operating row = cards (one calculation path)', opRow[2] === ov.rs && opRow[3] === ov.bo && opRow[4] === ov.mu, opRow.join(' | '));
    const pbRow = await p.$eval('#ow-tbl tr.is-pb', (tr) => [...tr.cells].map((c) => c.innerText.trim()));
    check('table: pb row with Rs = Rsb', /bubble point/.test(pbRow[1]) && pbRow[2] === ov.rs);
    const r5000 = await p.$$eval('#ow-tbl tbody tr', (trs) => trs.map((tr) => [...tr.cells].map((c) => c.innerText.trim())).find((r) => r[0] === '4500.0'));
    check('phase split: Rs above pb = Rsb', r5000 && r5000[2] === ov.rs, r5000 && r5000.join('|'));
    await p.click('[data-wfold="cmpbo"] > summary'); await settle(p);
    check('comparison lists all 5 Bo methods', (await p.$$('.ow-cmp-t tbody tr')).length === 5);
    await p.check('[data-wcmp="glaso"]'); await settle(p, 300);
    check('comparison curve on the graph legend', /Glasø/.test(await p.innerText('#ow-legend')));
    await p.fill('[data-wr="from"]', '4000'); await p.fill('[data-wr="to"]', '500'); await p.click('#ow-range button[type="submit"]'); await settle(p);
    check('invalid range rejected with a message', /To must be greater than From/.test(await p.innerText('#ow-range-err')));
    await p.fill('[data-wr="from"]', '500'); await p.fill('[data-wr="to"]', '4000'); await p.fill('[data-wr="step"]', '250'); await p.click('#ow-range button[type="submit"]'); await settle(p);
    check('custom range applied (500–4000 step 250 + pb)', (await p.$$('#ow-tbl tbody tr')).length === 16);
    await p.focus('#ow-chart-host .pc-chart'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await settle(p);
    const selTxt = await p.innerText('#ow-point');
    check('keyboard selects another point', /selected point/i.test(selTxt), selTxt);
    /* exports */
    const csv = await download(p, '#ow-csv');
    const ctext = csv.buf.toString('utf8');
    check('oil CSV: inputs with their own units, methods, header units', /# Input: Pressure = 3000 psia/.test(ctext) && /# Input: Bubble-point pressure \(measured\) = 2200 psia/.test(ctext) && /# Methods: Rs \/ pb = Standing/.test(ctext) && /p \(psia\),state,Rs \(scf\/STB · 60 °F\),Bo \(rb\/STB · 60 °F\)/.test(ctext), ctext.split('\n').slice(0, 8).join(' / '));
    const crow = ctext.split(/\r?\n/).filter((l) => /^\d/.test(l));
    check('oil CSV: 16 rows, one bubble point', crow.length === 16 && crow.filter((l) => /,bubble point,/.test(l)).length === 1, crow.length);
    const png = await download(p, '#ow-png');
    check('PNG export is a PNG image', png.name.endsWith('.png') && png.buf.slice(1, 4).toString() === 'PNG' && png.buf.length > 20000);
    await p.screenshot({ path: path.join(OUT, 'oil-detail-1366-light.png') });
    await back(p);
    check('back: inputs, units and results preserved', (await p.inputValue('#ow-in-p')) === '3000' && (await cardVal(p, 'bo')) === ov.bo && (await p.$$('.ow-card .ow-explain:not([disabled])')).length === 4);
    check('back: focus on the Explain button', await p.evaluate(() => !!document.activeElement.closest('.ow-card[data-wprop="bo"]')));
    await explain(p, 'bo');
    check('return: range, selected point and comparison kept', (await p.inputValue('[data-wr="from"]')) === '500' && (await p.innerText('#ow-point')) === selTxt && /Glasø/.test(await p.innerText('#ow-legend')));
    await back(p);

    /* ================= partial results ================= */
    await setField(p, 'p', '1500'); await calc(p);
    const ref2 = await engine(p, Object.assign({}, OIL_EX, { p: '1500' }));
    check('p < pb: co Not available with reason; others shown', (await cardVal(p, 'co')) === 'Not available' && /Not calculated below pb/.test(await p.innerText('.ow-card[data-wprop="co"] .ow-na')) && Math.abs(+(await cardVal(p, 'bo')) - ref2.bo) < 6e-5);
    check('partial: status "3 of 4 calculated · co unavailable"', /^3 of 4 calculated co unavailable/.test(await status(p)), await status(p));
    check('partial: banner names the unavailable property', /3 of 4 properties calculated\. Not available: co/.test(await p.innerText('.ow-partial')));
    await explain(p, 'co');
    check('co page: where the calculation stops', /Where the calculation stops/.test(await p.innerText('.ow-detail')) && /co stops here/.test(await p.innerText('.ow-detail')));
    check('co graph: invalid region shaded, not drawn', /no valid value/.test(await p.innerText('#ow-chart-host')));
    await back(p);

    /* ================= reported case: mixed metric entry, negative Vasquez-Beggs co ================= */
    await setUnit(p, 'p', 'kPa(a)'); await setField(p, 'p', '13835');
    await setUnit(p, 'T', '°C'); await setField(p, 'T', '64.9');
    await setField(p, 'api', '28.1'); await setField(p, 'gg', '1.424');
    await setUnit(p, 'pb', 'kPa(a)'); await setField(p, 'pb', '964');
    await calc(p);
    check('case: Rs = 37.0 scf/STB (Standing Rsb), μo = 7.494 cP', (await cardVal(p, 'rs')) === '37.0' && (await cardVal(p, 'mu')) === '7.494');
    check('case: Bo and co not available, with the rejected values', (await cardVal(p, 'bo')) === 'Not available' && /would rise with pressure above pb \(1\.05944/.test(await p.innerText('.ow-card[data-wprop="bo"]')) && /returns co = -7\.164e-8 1\/psi \(A = -1\.4376e-4\)/.test(await p.innerText('.ow-card[data-wprop="co"]')));
    check('case: status "2 of 4 calculated · Bo, co unavailable"', /^2 of 4 calculated Bo, co unavailable/.test(await status(p)), await status(p));
    check('case: γg 1.424 range warnings on Rs and μo', /1 range warning/.test(await p.innerText('.ow-card[data-wprop="rs"]')) && /2 range warnings/.test(await p.innerText('.ow-card[data-wprop="mu"]')));
    await explain(p, 'co');
    const ctxt = await p.innerText('.ow-detail');
    check('case co page: A, raw co and the stop reason', /The correlation returned co = -7\.164e-8 1\/psi/.test(ctxt) && /A = \(−1433 \+ 5·36\.980/.test(ctxt) && /-7\.1645e-8 \(correlation output, rejected/.test(ctxt));
    check('case co page: no curve drawn, reason given', /No valid co anywhere in this pressure range/.test(await p.innerText('#ow-chart-msg')));
    check('case co page: graph range in kPa(a)', (await p.$eval('#ow-range .pv-u', (e) => e.innerText)) === 'kPa(a)');
    const ccsv = (await download(p, '#ow-csv')).buf.toString('utf8');
    check('case CSV: inputs exactly as entered with their units', /# Input: Pressure = 13835 kPa\(a\)/.test(ccsv) && /# Input: Temperature = 64\.9 °C/.test(ccsv) && /# Input: Bubble-point pressure \(measured\) = 964 kPa\(a\)/.test(ccsv), ccsv.split('\n').slice(0, 6).join(' / '));
    await p.screenshot({ path: path.join(OUT, 'oil-case-co-1366.png') });
    await back(p);

    /* ================= density reference: 60 °F vs 15 °C ================= */
    await setUnit(p, 'p', 'psia'); await setUnit(p, 'T', '°F'); await setUnit(p, 'pb', 'psia');
    await p.click('#ow-example'); await settle(p);
    await seg(p, 'oilGravityBasis', 'density'); await setUnit(p, 'rhoSto', 'kg/m³'); await setField(p, 'rhoSto', '850'); await calc(p);
    check('density 850 kg/m³ at 60 °F → API 34.81 (water 999.016 kg/m³)', /API = 34\.81 \(from density\)/.test(await p.innerText('.ow-cond')), await p.innerText('.ow-cond'));
    await seg(p, 'rhoBasis', '15C'); await calc(p);
    check('15 °C density without α: input required', /Input required/.test(await p.innerText('[data-werr="alpha"]')) && (await p.$$('.ow-card.is-empty')).length === 4);
    await setField(p, 'alpha', '0.0008'); await calc(p);
    check('15 °C density with α: brought to 60 °F (API 34.88)', /API = 34\.88 \(from density\)/.test(await p.innerText('.ow-cond')), await p.innerText('.ow-cond'));
    await seg(p, 'rhoBasis', '60F'); await seg(p, 'oilGravityBasis', 'api');

    /* ================= measured data (More tools) ================= */
    await p.click('#ow-example'); await settle(p); await calc(p);
    await clickText(p, 'Measured Data'); await settle(p);
    check('template names units', /Rs \(scf\/STB\)/.test(await p.innerText('.pv-template code')));
    const tdl = await download(p, '#pv-tpl-dl');
    const tpl = tdl.buf.toString('utf8');
    check('downloadable template: units, basis note, header', /^# PVT Nexus measured-data template \(oil\)/.test(tpl) && /declare their basis/.test(tpl) && /p \(psia\),Rs \(scf\/STB\),Bo \(rb\/STB\)/.test(tpl));
    await p.fill('#pv-meas-text', '# my lab data\np (psia)\tRs (scf/STB)\n800\t12x\n1600\t280\t5');
    await clickText(p, 'Compare with calculation'); await settle(p);
    const perr = await p.innerText('#pv-meas-errs');
    check('malformed cells and rows reported by line and column', /Line 3, column "Rs \(scf\/STB\)": "12x" is not a number/.test(perr) && /Line 4: 3 values but 2 columns/.test(perr), perr);
    const mdata = 'p (psia)\tRs (scf/STB)\tBo (rb/STB)\n800\t120\t1.11\n1600\t280\t1.18\n2200\t425\t1.25\n4000\t-\t1.22\n3000\t0\t1.235\n3000\t430\t1.236';
    await p.fill('#pv-meas-text', mdata); await clickText(p, 'Compare with calculation'); await settle(p, 500);
    check('basis not declared: comparison blocked', /Basis not declared/.test(await p.innerText('#pv-meas-errs')) && !/AARE/.test(await p.innerText('#pv-meas-stats')));
    await clickText(p, '15 °C, 101.325 kPa', '[data-seg="measBasis"] button'); await clickText(p, 'Compare with calculation'); await settle(p, 500);
    const blk = await p.innerText('#pv-meas-errs');
    check('15 °C oil Rs / Bo: not compared, reason given', /Not compared: Rs/.test(blk) && /Not compared: Bo/.test(blk) && /thermal expansion/.test(blk), blk);
    await clickText(p, '60 °F, 101.325 kPa', '[data-seg="measBasis"] button'); await clickText(p, 'Compare with calculation'); await settle(p, 500);
    const stats = await p.innerText('#pv-meas-stats');
    check('60 °F: rows read and errors computed', /6 measured rows read/.test(await p.innerText('#pv-meas-errs')) && /AARE/.test(stats));
    check('zero / missing measured values excluded', /1 missing/.test(stats) && /1 zero measured/.test(stats), stats);
    check('repeated pressure kept as two observations', (await p.$$eval('#pv-meas-table tbody tr', (t) => t.filter((r) => r.cells[1].innerText.trim().startsWith('3000')).length)) === 2);
    check('batch evaluation kept (oil)', /Measured Rs \(PVT\)/.test(await p.innerText('#pv-batch-host')));
    await p.fill('#oc-oRsPaste', 'Oil\tT\tpb\tRs\tBo\trho\tpsep\tTsep\tAPI\tgg\n1\t250\t2377\t751\t1.528\t38.13\t150\t60\t47.1\t0.851\n2\tx\t1');
    await clickText(p, 'Evaluate Rs methods'); await settle(p, 300);
    check('batch: Standing Rs for Ahmed oil 1 = 838.0', /837\.99|838\.0/.test(await p.innerText('#oc-oRsEvalBody')));
    check('batch: bad line reported', /Line 3/.test(await p.innerText('#oc-skips-rs')));
    await clickText(p, 'Calculator', '.pv-tab'); await settle(p);
    check('back on the calculator: results still there', (await cardVal(p, 'bo')) === ov.bo);
    await explain(p, 'bo');
    check('measured points overlaid on the detail graph', /Measured \(PVT data\)/.test(await p.innerText('#ow-legend')) && (await p.$$('.pc-chart rect[width="9"]')).length >= 5);
    await back(p);
    check('no "BVT" wording anywhere', !/BVT/.test(await p.evaluate(() => document.body.innerText)));
    await p.click('.pv-help[data-help="gg"]'); await settle(p, 300);
    check('field help opens in the drawer', await p.$eval('#pv-explain', (e) => e.classList.contains('is-open')) && /28\.96/.test(await p.innerText('#pv-ex-body')));
    check('drawer uses the procedure-page section classes', (await p.$$('#pv-ex-body .sgSec .sgLbl')).length > 0);
    await p.keyboard.press('Escape'); await settle(p, 300);
    check('Escape closes the drawer', !(await p.$eval('#pv-explain', (e) => e.classList.contains('is-open'))));

    /* ================= gas ================= */
    await clickText(p, 'Gas', '.pv-fluid button'); await settle(p);
    await setUnit(p, 'p', 'psia'); await p.click('#ow-example'); await settle(p); await calc(p);
    const gref = await engine(p, GAS_EX);
    const gv = {}; for (const k of ['z', 'bg', 'rho', 'mu', 'cg']) gv[k] = await cardVal(p, k);
    check('gas Z card = engine', Math.abs(+gv.z - gref.z) < 6e-5, gv.z + ' vs ' + gref.z);
    check('gas Bg card = engine', rel(+gv.bg, gref.bg) < 2e-4, gv.bg + ' vs ' + gref.bg);
    check('gas ρg card = engine', rel(+gv.rho, gref.rho) < 2e-4, gv.rho);
    check('gas μg card = engine', rel(+gv.mu, gref.mu) < 2e-4, gv.mu);
    check('gas cg card = engine', rel(+gv.cg, gref.cg) < 1e-3, gv.cg);
    check('gas: "All 5 calculated"', /^All 5 calculated/.test(await status(p)), await status(p));
    await seg(p, 'stdBasis', 'lab');
    check('gas: standard basis change marks results stale', !!(await p.$('.ow-stale')));
    await calc(p);
    check('15 °C basis: Z unchanged, Bg × 519.67/518.67', (await cardVal(p, 'z')) === gv.z && Math.abs(+(await cardVal(p, 'bg')) / +gv.bg - 519.67 / 518.67) < 3e-4 && /15 °C/.test(await cardUnit(p, 'bg')));
    await explain(p, 'bg');
    const gcsv = (await download(p, '#ow-csv')).buf.toString('utf8');
    check('gas CSV carries the 15 °C basis', /Bg on 15 °C, 101\.325 kPa/.test(gcsv) && /Bg \(ft³\/scf · 15 °C\)/.test(gcsv), gcsv.split('\n').slice(0, 4).join(' / '));
    await p.click('[data-wfold="cmpbg"] > summary'); await settle(p);
    check('gas comparison over Z methods', (await p.$$('.ow-cmp-t tbody tr')).length === 3);
    await back(p);
    await seg(p, 'stdBasis', 'corr'); await calc(p);
    /* composition + sour gas */
    await seg(p, 'gasBasis', 'composition');
    check('composition table under Advanced, γg replaced by a note', !!(await p.$('#ow-adv[open] [data-wgc="0"]')) && /From the composition/.test(await p.innerText('[data-f="gg"]')));
    await method(p, 'sour', 'wichert_aziz'); await calc(p);
    check('composition + Wichert-Aziz: γg from composition', /γg = 0\.6515 \(from composition\)/.test(await p.innerText('.ow-cond')), await p.innerText('.ow-cond'));
    await p.fill('[data-wgc="0"][data-wgcf="y"]', '0.9'); await settle(p); await calc(p);
    check('composition total off: error, results cleared', /total 1\.03/.test(await p.innerText('#ow-errsum')) && (await p.$$('.ow-card.is-empty')).length === 5, await p.innerText('#ow-errsum'));
    await p.check('[data-wchk="normalize"]'); await settle(p); await calc(p);
    check('normalised composition: calculated and reported', /All 5 calculated/.test(await status(p)) && /normalised to Σ = 1/.test(await p.$eval('.ow-card[data-wprop="bg"]', (e) => e.textContent)));
    await seg(p, 'gasBasis', 'gravity'); await method(p, 'sour', 'none');
    /* manual chart Z: one pressure only, cg unavailable */
    await method(p, 'z', 'manual');
    check('manual Z shows Ppr/Tpr to read the chart', /Ppr = 4\.472, Tpr = 1\.764/.test(await p.innerText('#ow-zread')), await p.innerText('#ow-zread'));
    await setField(p, 'zManual', '0.89'); await calc(p);
    check('manual Z: Z = 0.8900, cg unavailable, status "4 of 5"', (await cardVal(p, 'z')) === '0.8900' && (await cardVal(p, 'cg')) === 'Not available' && /^4 of 5 calculated cg unavailable/.test(await status(p)), await status(p));
    await explain(p, 'z');
    check('manual Z page: no curve, reason given', /No pressure curve/.test(await p.innerText('#ow-chart-msg')));
    await back(p);
    await seg(p, 'behavior', 'ideal'); await calc(p);
    check('ideal gas: Z = 1.0000, cg = 1/p', (await cardVal(p, 'z')) === '1.0000' && Math.abs(+(await cardVal(p, 'cg')) - 1 / 3000) < 1e-7);
    await seg(p, 'behavior', 'real'); await method(p, 'z', 'dak'); await calc(p);

    /* ================= state across fluids and screens ================= */
    await clickText(p, 'Oil', '.pv-fluid button'); await settle(p);
    check('oil state kept after visiting gas', (await p.inputValue('#ow-in-p')) === '3000' && (await cardVal(p, 'bo')) === ov.bo);
    await clickText(p, 'Back'); await settle(p); await clickText(p, 'Oil Calculator'); await settle(p);
    check('oil state kept after leaving the calculator', (await cardVal(p, 'bo')) === ov.bo);
    check('no script errors (calculator workflow)', p.__errs.length === 0, p.__errs.join(' | '));
    await p.context().close();

    /* ================= layout: sizes and themes, both fluids, overview and detail ================= */
    for (const [w, h, theme] of [[1366, 768, 'dark'], [1920, 1080, 'light'], [390, 844, 'light'], [390, 844, 'dark'], [768, 1024, 'light']]) {
      p = await openApp(browser, w, h, theme);
      await clickText(p, 'Oil Calculator'); await settle(p);
      const tag = `${w}x${h}-${theme}`;
      check(`[${tag}] theme applied`, (await p.evaluate(() => document.documentElement.getAttribute('data-theme'))) === (theme === 'light' ? 'light' : null));
      for (const fl of ['oil', 'gas']) {
        if (fl === 'gas') { await clickText(p, 'Gas', '.pv-fluid button'); await settle(p); }
        await p.click('#ow-example'); await calc(p);
        check(`[${tag}] ${fl} overview: no horizontal scroll`, await noHScroll(p));
        const xs = await p.$$eval('.ow-card', (cs) => cs.map((c) => Math.round(c.getBoundingClientRect().left)));
        if (w < 760) check(`[${tag}] ${fl}: cards stacked`, xs.every((x) => x === xs[0]));
        else if (w >= 1366) check(`[${tag}] ${fl}: cards in one row`, new Set(xs).size === xs.length, xs.join(','));
        const unlabeled = await p.$$eval('.pv input:not([type=hidden]), .pv select, .pv textarea', (els) => els.filter((e) => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.closest('label')).map((e) => e.id || e.outerHTML.slice(0, 60)));
        check(`[${tag}] ${fl}: every input has a label`, unlabeled.length === 0, unlabeled.join(', '));
        await p.focus('#ow-calc'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); await settle(p, 80);
        const ring = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; });
        check(`[${tag}] ${fl}: visible focus ring`, ring);
        await p.screenshot({ path: path.join(OUT, `${fl}-overview-${tag}.png`) });
        await explain(p, fl === 'oil' ? 'bo' : 'z');
        check(`[${tag}] ${fl} detail: no horizontal scroll`, await noHScroll(p));
        const dw = await p.$eval('.ow-dhead', (e) => e.getBoundingClientRect().width), mw = await p.$eval('.pv-main', (e) => e.clientWidth);
        check(`[${tag}] ${fl} detail: full width`, dw >= mw - 12, dw + ' / ' + mw);
        const cb = await p.$eval('.pc-chart', (e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
        check(`[${tag}] ${fl} chart size`, w < 800 ? cb[0] >= 300 && cb[1] >= 250 : cb[0] >= 600 && cb[1] >= 300, cb.join('×'));
        await p.screenshot({ path: path.join(OUT, `${fl}-detail-${tag}.png`) });
        await back(p);
      }
      check(`[${tag}] no script errors`, p.__errs.length === 0, p.__errs.join(' | '));
      await p.context().close();
    }

    /* ---------------- other workflows still open ---------------- */
    for (const card of ['PVT Sampling', 'Validation', 'Detailed PVT Analysis', 'Report']) {
      p = await openApp(browser, 1366, 768, 'light');
      await clickText(p, card); await settle(p, 600);
      const label = await p.evaluate(() => [...document.querySelectorAll('[data-screen-label]')].map((e) => e.getAttribute('data-screen-label')).join(' | '));
      check(`workflow "${card}" opens`, label.length > 0 && !/PVT Calculator/.test(label), label);
      check(`workflow "${card}": no script errors`, p.__errs.length === 0, p.__errs.join(' | '));
      await p.context().close();
    }

    /* ---------------- responsive layer (components/Responsive.js + theme.css) ---------------- */
    const go = async (pg, steps) => {
      for (const a of steps) {
        const ok = await pg.evaluate((a) => { const t = (b) => b.innerText.replace(/\s+/g, ' ').trim(); const x = [...document.querySelectorAll('button,[onclick]')].find((b) => b.getClientRects().length && (t(b).startsWith(a) || t(b).includes(' ' + a + ' '))); if (x) x.click(); return !!x; }, a);
        if (!ok) throw new Error('no element: ' + a);
        await settle(pg, 650);
      }
    };
    const RPAGES = [['dashboard', []], ['about', ['About']], ['sampling bottom hole', ['PVT Sampling', 'Bottom Hole']], ['sampling wellhead', ['PVT Sampling', 'Wellhead']],
      ['validation menu', ['Validation']], ['restoration', ['Validation', 'Restoration']], ['flash', ['Validation', 'Flash']], ['separator test', ['Detailed PVT Analysis', 'Separator Test']],
      ['two-phase viscosity', ['Detailed PVT Analysis', 'Viscosity', 'Two-Phase Viscosity']], ['report', ['Report']], ['calculator', ['PVT Calculator']]];
    const PROC = /restoration|flash|separator|viscosity|sampling/;
    for (const [w, h] of [[390, 844], [768, 1024], [1024, 768], [844, 390]]) {
      const stacked = w <= 760 || h >= w;
      for (const [name, steps] of RPAGES) {
        p = await openApp(browser, w, h, 'light');
        await go(p, steps); await settle(p, 300);
        const tag = `[${w}×${h}] ${name}`;
        const m = await p.evaluate(() => {
          const clip = [...document.querySelectorAll('.rz-on')].map((f) => { const s = f.querySelector('[data-rz-svg]'); if (!s) return null; const a = f.getBoundingClientRect(), b = s.getBoundingClientRect(); return (b.left < a.left - 1 || b.right > a.right + 1) ? Math.round(b.left) + '..' + Math.round(b.right) + ' in ' + Math.round(a.left) + '..' + Math.round(a.right) : null; }).filter(Boolean);
          const side = document.querySelector('.lab-side'), schem = document.querySelector('.lab-schem');
          return { hs: document.documentElement.scrollWidth - window.innerWidth, clip, bars: document.querySelectorAll('.rz-bar').length, marked: document.querySelectorAll('[data-rz-svg]').length,
            sideBySide: side && schem ? side.getBoundingClientRect().left >= schem.getBoundingClientRect().right - 1 : null };
        });
        check(`${tag}: no horizontal page scroll`, m.hs <= 1, 'overflow ' + m.hs + 'px');
        check(`${tag}: drawings not clipped`, m.clip.length === 0, m.clip.join('; '));
        if (PROC.test(name)) {
          if (stacked) check(`${tag}: equipment full width with zoom`, m.bars >= 1 && m.marked >= 1, m.bars + ' bars, ' + m.marked + ' drawings');
          else check(`${tag}: landscape tablet keeps the side-by-side layout`, m.bars === 0 && (m.sideBySide === null || m.sideBySide === true), JSON.stringify(m));
        }
        if (w === 390 || w === 768) await p.screenshot({ path: path.join(OUT, `responsive-${w}-${name.replace(/\s+/g, '-')}.png`) });
        check(`${tag}: no script errors`, p.__errs.length === 0, p.__errs.join(' | '));
        await p.context().close();
      }
    }
    /* zoom, rotation, browser height, tap targets — phone with touch */
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      await ctx.addInitScript(() => { try { localStorage.setItem('pvtTheme', 'light'); localStorage.setItem('sgOpen', '0'); } catch (e) {} });
      p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
      await p.goto(BASE + '/index.html'); await settle(p, 700);
      await go(p, ['Enter Dashboard', 'Validation', 'Restoration']);
      const before = await p.evaluate(() => { const f = document.querySelector('.rz-on'); return { fw: f.clientWidth, sw: f.querySelector('[data-rz-svg]').getBoundingClientRect().width }; });
      await p.click('.rz-bar [data-rz="+"]'); await settle(p, 200);
      const z = await p.evaluate(() => { const f = document.querySelector('.rz-on'); return { z: f.getAttribute('data-rz-z'), sw: f.querySelector('[data-rz-svg]').getBoundingClientRect().width, pan: f.scrollWidth > f.clientWidth, hs: document.documentElement.scrollWidth - window.innerWidth, label: f.querySelector('.rz-val').textContent }; });
      check('zoom +: drawing 1.5× and pans inside its frame, page does not scroll sideways', z.z === '1.5' && Math.abs(z.sw / before.sw - 1.5) < 0.03 && z.pan && z.hs <= 1 && z.label === '150%', JSON.stringify(z));
      await p.click('.rz-bar [data-rz="fit"]'); await settle(p, 200);
      check('zoom fit restores the full drawing', (await p.evaluate(() => document.querySelector('.rz-on').getAttribute('data-rz-z'))) === '1');
      const tap = await p.$$eval('.pc-b', (bs) => bs.filter((b) => b.getClientRects().length).map((b) => Math.round(b.getBoundingClientRect().height)));
      check('touch: procedure buttons at least 44 px tall', tap.length > 0 && tap.every((x) => x >= 44), tap.join(','));
      const zb = await p.$$eval('.rz-bar button', (bs) => bs.map((b) => Math.round(b.getBoundingClientRect().height)));
      check('touch: zoom buttons at least 38 px', zb.every((x) => x >= 38), zb.join(','));
      await p.setViewportSize({ width: 844, height: 390 }); await settle(p, 400);
      const land = await p.evaluate(() => ({ cls: document.documentElement.className, hs: document.documentElement.scrollWidth - window.innerWidth, appH: getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim() }));
      /* 844 px landscape is wider than the phone breakpoint: by design it gets the side-by-side layout */
      check('rotate to landscape: side-by-side layout, no sideways scroll, height tracked', /vp-landscape/.test(land.cls) && !/vp-stack/.test(land.cls) && land.hs <= 1 && land.appH === '390px', JSON.stringify(land));
      await p.setViewportSize({ width: 390, height: 844 }); await settle(p, 400);
      check('rotate back to portrait: stacked again with the zoom bar', await p.evaluate(() => document.documentElement.classList.contains('vp-stack') && !!document.querySelector('.rz-bar')));
      await p.setViewportSize({ width: 390, height: 700 }); await settle(p, 400);
      check('browser height change updates --app-h', (await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim())) === '700px');
      await go(p, ['Explain This Stage']);
      const sheet = await p.evaluate(() => { const w = document.getElementById('sgWrap'), r = w && w.getBoundingClientRect(); return w ? { open: w.classList.contains('open'), bottom: Math.round(r.bottom), left: Math.round(r.left), width: Math.round(r.width) } : null; });
      check('phone: explanation opens as a bottom drawer', sheet && sheet.open && sheet.bottom >= 699 && sheet.left === 0 && sheet.width === 390, JSON.stringify(sheet));
      check('no script errors (phone interactions)', p.__errs.length === 0, p.__errs.join(' | '));
      await ctx.close();
    }
    /* calculator follows the project theme (its own toggle was removed on main; the dashboard top-bar toggle applies) */
    p = await openApp(browser, 1366, 768, 'light');
    await clickText(p, 'PVT Calculator'); await settle(p);
    await p.click('#ow-example'); await calc(p); await explain(p, 'rs');
    const bg1 = await p.$eval('.ow-dhead', (e) => getComputedStyle(e).backgroundColor);
    await clickText(p, 'Back'); await settle(p);
    await p.click('button[title="Toggle light / dark"]'); await settle(p, 300);
    await clickText(p, 'PVT Calculator'); await settle(p, 400);
    check('theme switched on the dashboard applies to the calculator and is remembered', (await p.evaluate(() => document.documentElement.getAttribute('data-theme'))) === null && (await p.evaluate(() => localStorage.getItem('pvtTheme'))) === 'dark');
    check('calculator returns to the same property page after leaving', !!(await p.$('.ow-detail[data-wprop="rs"]')));
    check('detail page redrawn in the dark theme', !!(await p.$('#ow-chart-host svg path')) && (await p.$eval('.ow-dhead', (e) => getComputedStyle(e).backgroundColor)) !== bg1);
    check('no script errors (theme toggle)', p.__errs.length === 0, p.__errs.join(' | '));
    await p.context().close();
  } finally {
    await browser.close();
    server.close();
  }
  passes.forEach((s) => console.log('ok   ' + s));
  fails.forEach((s) => console.log('FAIL ' + s));
  console.log(`\n${passes.length} passed, ${fails.length} failed`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
