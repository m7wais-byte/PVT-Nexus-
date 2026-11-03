/* Oil calculator workflow — browser checks (Playwright + headless Chromium).
   Run from the repository root:   node tests/oil-workflow.e2e.js
   Inputs once -> four results -> full-page property explanation -> back with state kept.
   Also a Gas smoke check (the Gas calculator flow is unchanged). Screenshots: tests/out/ (git-ignored). */
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
const settle = (p, ms = 250) => p.waitForTimeout(ms);
const clickText = (p, t, sel = 'button') => p.evaluate(([text, s]) => {
  const b = [...document.querySelectorAll(s)].find((x) => x.innerText.trim() === text || x.innerText.trim().startsWith(text));
  if (!b) throw new Error('no element: ' + text); b.click();
}, [t, sel]);
const cardVal = (p, k) => p.$eval(`.ow-card[data-oprop="${k}"] .ow-val strong`, (e) => e.innerText.trim());
const cardUnit = (p, k) => p.$eval(`.ow-card[data-oprop="${k}"] .ow-val span`, (e) => e.innerText.trim()).catch(() => '');
const noHScroll = (p) => p.evaluate(() => {
  const m = document.querySelector('.pv-main');
  return document.documentElement.scrollWidth <= window.innerWidth + 1 && (!m || m.scrollWidth <= m.clientWidth + 1);
});
let BASE = '';
async function openOil(browser, w, h, theme, mobile) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h }, acceptDownloads: true });
  await ctx.addInitScript((t) => { try { localStorage.setItem('pvtTheme', t); localStorage.setItem('sgOpen', '0'); } catch (e) {} }, theme);
  const p = await ctx.newPage();
  p.__errs = [];
  p.on('pageerror', (e) => p.__errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') p.__errs.push(m.text()); });
  await p.goto(BASE + '/index.html'); await settle(p, 700);
  await clickText(p, 'Enter Dashboard'); await settle(p);
  await clickText(p, 'Oil Calculator'); await settle(p, 400);
  return p;
}
/* the same inputs evaluated directly by the engine, in field units */
const engineOil = (p, extra) => p.evaluate((x) => {
  const r = window.PVTEngine.run(Object.assign({ fluid: 'oil', units: 'field', calcMode: 'single', oilGravityBasis: 'api', oilChar: 'pb', T: '200', api: '35', gg: '0.65', pb: '2200', p: '3000' }, x));
  return { rs: r.props.rs.values[0], bo: r.props.bo.values[0], mu: r.props.mu.values[0], co: r.props.co.values[0], coWhy: r.props.co.reasons[0] };
}, extra || {});

(async () => {
  await new Promise((r) => server.listen(0, r));
  BASE = 'http://localhost:' + server.address().port;
  const browser = await chromium.launch();
  try {
    let p = await openOil(browser, 1440, 900, 'light');
    /* 1 · one shared form, no property picker */
    check('oil opens without the property cards', (await p.$$('.pv-choice')).length === 0 && !/What would you like to calculate/.test(await p.innerText('.pv-main')));
    check('one primary button "Calculate oil properties"', (await p.$$eval('.ow-calc', (b) => b.map((x) => x.innerText.trim()))).join() === 'Calculate oil properties');
    check('dimensional inputs have their own unit selectors', (await p.$$eval('[data-ou]', (s) => s.map((x) => x.dataset.ou).sort().join())) === 'T,p,pb');
    check('gas gravity labelled relative to air', /relative to air/i.test(await p.innerText('[data-f="gg"]')) && /air = 1/.test(await p.innerText('[data-f="gg"]')));
    check('correlations are under Advanced (closed)', !!(await p.$('#ow-adv:not([open]) [data-om="rs"]')));
    check('four empty result cards before calculation, Explain disabled', (await p.$$('.ow-card.is-empty')).length === 4 && (await p.$$('.ow-card .ow-explain:disabled')).length === 4);

    /* 2 · blank calculate: errors, no values */
    await p.click('#ow-calc'); await settle(p);
    const es = await p.innerText('#ow-errsum');
    check('blank inputs: summary names every missing field', /Missing: Pressure, Temperature, Gas specific gravity, Oil gravity \(API\), Bubble-point pressure/.test(es), es);
    check('blank inputs: no values shown', (await p.$$('.ow-card.is-empty')).length === 4);

    /* 3 · example -> all four results together, equal to a direct engine run */
    await p.click('#ow-example'); await settle(p);
    check('example marked as example data', /Example data/.test(await p.innerText('#ow-ex-label')));
    await p.click('#ow-calc'); await settle(p, 400);
    const ref = await engineOil(p);
    const v = { rs: await cardVal(p, 'rs'), bo: await cardVal(p, 'bo'), mu: await cardVal(p, 'mu'), co: await cardVal(p, 'co') };
    check('Rs card = engine', Math.abs(+v.rs - ref.rs) < 0.06, v.rs + ' vs ' + ref.rs);
    check('Bo card = engine', Math.abs(+v.bo - ref.bo) < 6e-5, v.bo + ' vs ' + ref.bo);
    check('μo card = engine', Math.abs(+v.mu - ref.mu) / ref.mu < 1e-3, v.mu + ' vs ' + ref.mu);
    check('co card = engine', Math.abs(+v.co - ref.co) / ref.co < 1e-3, v.co + ' vs ' + ref.co);
    check('each card has unit, description and Explain button', (await p.$$eval('.ow-card', (cs) => cs.every((c) => c.querySelector('.ow-val span') && c.querySelector('.ow-desc').innerText.length > 20 && c.querySelector('.ow-explain:not([disabled])')))));
    check('conditions shown: p, T, state, pb', /p = 3000\.0 psia/.test(await p.innerText('.ow-cond')) && /Undersaturated/i.test(await p.innerText('.ow-cond')) && /pb = 2200\.0 psia/.test(await p.innerText('.ow-cond')));
    await p.screenshot({ path: path.join(OUT, 'oil-overview-desktop-light.png') });

    /* 4 · field unit switch keeps the physical value and the results current */
    await p.selectOption('[data-ou="p"]', 'bara'); await settle(p);
    check('pressure re-rendered in bar(a)', (await p.inputValue('#ow-in-p')) === '206.8427');
    check('unit switch: results not stale', !(await p.$('.ow-stale')) && (await cardVal(p, 'bo')) === v.bo);
    await p.selectOption('[data-ou="T"]', 'C'); await settle(p);
    check('temperature re-rendered in °C', (await p.inputValue('#ow-in-T')) === '93.33333');
    await p.selectOption('[data-ou="T"]', 'F'); await p.selectOption('[data-ou="p"]', 'psia'); await settle(p);
    check('round trip restores exact text', (await p.inputValue('#ow-in-p')) === '3000' && (await p.inputValue('#ow-in-T')) === '200');

    /* 5 · editing a physical input marks results stale; restoring the value clears it */
    await p.fill('#ow-in-T', '210'); await settle(p);
    check('edit: stale banner and Explain disabled', !!(await p.$('.ow-stale')) && (await p.$$('.ow-card.is-stale .ow-explain:disabled')).length === 4);
    await p.fill('#ow-in-T', '200'); await settle(p);
    check('restored value: results current again', !(await p.$('.ow-stale')));

    /* 6 · result units are display only */
    await clickText(p, 'Metric', '[data-ounits]'); await settle(p);
    check('metric Rs = scf/STB × 0.178108', Math.abs(+(await cardVal(p, 'rs')) - ref.rs * 0.1781076) < 0.006 && /sm³\/sm³/.test(await cardUnit(p, 'rs')));
    check('metric Bo unchanged (ratio)', (await cardVal(p, 'bo')) === v.bo && /rm³\/sm³/.test(await cardUnit(p, 'bo')));
    check('metric co in 1/bar', /1\/bar/.test(await cardUnit(p, 'co')));
    check('input fields untouched by result units', (await p.inputValue('#ow-in-p')) === '3000');
    await clickText(p, 'Field', '[data-ounits]'); await settle(p);

    /* 7 · detail page */
    await p.click('.ow-card[data-oprop="bo"] .ow-explain'); await settle(p, 500);
    const dtext = await p.innerText('.ow-detail');
    check('detail is a full page (not a drawer)', !!(await p.$('.pv-main > .ow-detail')) && !(await p.$('.ow-card')));
    check('detail: name, value, conditions', /Oil formation volume factor/.test(dtext) && (await p.innerText('.ow-dval strong')) === v.bo && /p = 3000\.0 psia/.test(dtext));
    check('detail: meaning, method, equation, symbols, substitution, dependencies', ['What it means', 'Why it matters', 'Correlation and applicability', 'Symbols and values used', 'Substituted values', 'Intermediate values and dependencies'].every((t) => dtext.toLowerCase().includes(t.toLowerCase())) && /Bo = Bob/.test(dtext));
    check('detail: chart with operating line and pb marker', !!(await p.$('#ow-chart-host svg path')) && /p = 3000\.0 psia/.test(await p.innerText('#ow-chart-host')) && /pb = 2200\.0 psia/.test(await p.innerText('#ow-chart-host')));
    check('detail: range controls clearly labelled', /Graph pressure range/.test(dtext) && /does not change the result/.test(dtext));
    await p.click('[data-fold="tblbo"] > summary'); await settle(p);
    const opRow = await p.$eval('#ow-tbl tr.is-op', (tr) => [...tr.cells].map((c) => c.innerText.trim()));
    check('table operating row = card value (one calculation path)', opRow[3] === v.bo && opRow[2] === v.rs, opRow.join(' | '));
    check('table has a bubble-point row', !!(await p.$('#ow-tbl tr.is-pb')));
    await p.click('[data-fold="cmpbo"] > summary'); await settle(p);
    check('method comparison lists all Bo methods', (await p.$$('.ow-cmp-t tbody tr')).length === 5 && /selected/.test(await p.innerText('.ow-cmp-t')));
    await p.check('[data-ocmp="glaso"]'); await settle(p, 300);
    check('comparison curve added to the graph legend', /Glasø/.test(await p.innerText('#ow-legend')));
    check('references listed', (await p.$$('.ow-detail .pv-refs li')).length >= 1);
    /* range + selected point, then back */
    await p.fill('[data-or="from"]', '500'); await p.fill('[data-or="to"]', '4000'); await p.fill('[data-or="step"]', '250');
    await p.click('#ow-range button[type="submit"]'); await settle(p, 300);
    const nRows = (await p.$$('#ow-tbl tbody tr')).length;
    check('custom range applied (500–4000 step 250 + pb)', nRows === 16, nRows);
    await p.focus('#ow-chart-host .pc-chart'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await settle(p);
    const selTxt = await p.innerText('#ow-point');
    check('keyboard moves the selected point', /Selected point/i.test(selTxt), selTxt);
    await p.screenshot({ path: path.join(OUT, 'oil-detail-desktop-light.png'), fullPage: false });
    await p.click('#ow-back'); await settle(p, 300);
    check('back: overview with the same inputs, units and results', (await p.inputValue('#ow-in-p')) === '3000' && (await cardVal(p, 'bo')) === v.bo && (await p.$$('.ow-card .ow-explain:not([disabled])')).length === 4);
    check('back: focus returns to the Explain button', await p.evaluate(() => !!document.activeElement.closest('.ow-card[data-oprop="bo"]')));
    await p.click('.ow-card[data-oprop="bo"] .ow-explain'); await settle(p, 400);
    check('return: range and selected point kept', (await p.inputValue('[data-or="from"]')) === '500' && (await p.inputValue('[data-or="step"]')) === '250' && (await p.innerText('#ow-point')) === selTxt);
    await p.click('#ow-back'); await settle(p);

    /* 8 · below pb: co unavailable with its reason, others visible; its page explains where it stops */
    await p.fill('#ow-in-p', '1500'); await p.click('#ow-calc'); await settle(p, 400);
    const ref2 = await engineOil(p, { p: '1500' });
    check('p < pb: co not available, reason shown', (await cardVal(p, 'co')) === 'Not available' && (await p.innerText('.ow-card[data-oprop="co"] .ow-na')).includes('Not calculated below pb'));
    check('p < pb: other three still shown', Math.abs(+(await cardVal(p, 'rs')) - ref2.rs) < 0.06 && Math.abs(+(await cardVal(p, 'bo')) - ref2.bo) < 6e-5);
    await p.click('.ow-card[data-oprop="co"] .ow-explain'); await settle(p, 500);
    const cot = await p.innerText('.ow-detail');
    check('co page: "Where the calculation stops" with the failing step', /Where the calculation stops/.test(cot) && /co stops here/.test(cot));
    check('co graph: invalid region not drawn as a value', /no valid value/.test(await p.innerText('#ow-chart-host')));
    await p.click('#ow-back'); await settle(p);

    /* 9 · invalid input clears results after recalculation */
    await p.fill('#ow-in-gg', '-1'); await p.click('#ow-calc'); await settle(p);
    check('invalid input: results cleared, field flagged', (await p.$$('.ow-card.is-empty')).length === 4 && /Gas specific gravity must be greater than 0/.test(await p.innerText('[data-f="gg"]')));
    await p.fill('#ow-in-gg', '0.65'); await p.click('#ow-calc'); await settle(p, 300);

    /* 10 · dark theme */
    await p.evaluate(() => document.documentElement.removeAttribute('data-theme')); await settle(p, 200);
    await p.screenshot({ path: path.join(OUT, 'oil-overview-desktop-dark.png') });

    /* 11 · Gas calculator unchanged */
    await clickText(p, 'Gas', '.pv-fluid button'); await settle(p, 400);
    check('gas: property picker still offered', (await p.$$('.pv-choice')).length === 5);
    await p.click('[data-choose-property="z"]'); await settle(p);
    await p.click('#pv-example'); await settle(p); await p.click('#pv-calculate'); await settle(p, 400);
    check('gas: Z answer shown', /\d\.\d{4}/.test(await p.innerText('#pv-answer')));
    await clickText(p, 'Oil', '.pv-fluid button'); await settle(p, 400);
    check('oil state kept after visiting gas', (await p.inputValue('#ow-in-p')) === '1500' && !!(await p.$('.ow-card:not(.is-empty)')));
    check('no page errors (desktop)', p.__errs.length === 0, p.__errs.join(' | '));
    await p.context().close();

    /* 12 · phone */
    p = await openOil(browser, 390, 844, 'light', true);
    await p.click('#ow-example'); await p.click('#ow-calc'); await settle(p, 400);
    check('phone: no horizontal overflow (overview)', await noHScroll(p));
    const xs = await p.$$eval('.ow-card', (cs) => cs.map((c) => Math.round(c.getBoundingClientRect().left)));
    check('phone: result cards stacked', xs.length === 4 && xs.every((x) => x === xs[0]));
    await p.screenshot({ path: path.join(OUT, 'oil-overview-phone.png'), fullPage: false });
    await p.click('.ow-card[data-oprop="mu"] .ow-explain'); await settle(p, 500);
    check('phone: no horizontal overflow (detail)', await noHScroll(p));
    const dw = await p.$eval('.ow-dhead', (e) => e.getBoundingClientRect().width);
    check('phone: detail page full width', dw > 330, dw);
    await p.screenshot({ path: path.join(OUT, 'oil-detail-phone.png'), fullPage: false });
    check('no page errors (phone)', p.__errs.length === 0, p.__errs.join(' | '));
    await p.context().close();
  } catch (e) {
    fails.push('crashed: ' + (e && e.stack || e));
  } finally {
    await browser.close(); server.close();
  }
  passes.forEach((x) => console.log('PASS ' + x));
  fails.forEach((x) => console.log('FAIL ' + x));
  console.log('\n' + passes.length + ' passed, ' + fails.length + ' failed');
  process.exit(fails.length ? 1 : 0);
})();
