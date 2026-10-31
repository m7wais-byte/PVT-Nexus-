/* PVT Calculator — browser end-to-end checks (Playwright + headless Chromium).
   Run from the repository root:   node tests/ui.e2e.js
   Starts its own static server on a free port; exits non-zero on any failure.
   Screenshots go to tests/out/ (git-ignored). */
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

/* Keep behavioral regression cases while navigating the simplified workspace.
   Charts and inputs now share one view; specialist tools are in More tools.
   No engineering expected values or tolerances are changed. */
const reveal = (p, selector) => p.evaluate((sel) => {
  const el = document.querySelector(sel); if (!el) throw new Error('Missing control: ' + sel);
  for (let a = el.parentElement; a; a = a.parentElement) if (a.tagName === 'DETAILS') a.open = true;
}, selector);
const clickText = async (p, t, sel = 'button') => {
  const aliases = { Inputs: 'Calculator', Charts: 'Calculator', 'View charts': 'Calculator', 'Load example': 'Use example', 'Clear inputs': 'Clear', 'Pressure range': 'Pressure curve', 'Solution GOR, Rsb': 'Solution GOR at bubble point' };
  t = aliases[t] || t;
  if (t === 'Measured Data' || t === 'Methods & References') {
    await p.locator('.pv-more-tools').evaluate((e) => { e.open = true; }); sel = '.pv-more-menu button';
  }
  if (sel === '.pv-props button') {
    await p.selectOption('#pv-property', t.toLowerCase()); return;
  }
  if (t === 'Calculator') sel = '.pv-tab';
  await p.evaluate(([text, selector]) => {
    const b = [...document.querySelectorAll(selector)].find((x) => x.innerText.trim() === text || x.innerText.trim().startsWith(text));
    if (!b) throw new Error('no element: ' + text);
    for (let a = b.parentElement; a; a = a.parentElement) if (a.tagName === 'DETAILS') a.open = true;
    b.click();
  }, [t, sel]);
};
const setField = async (p, k, v) => { await reveal(p, `[data-k="${k}"]`); await p.fill(`[data-k="${k}"]`, String(v)); };
const selectMethod = async (p, k, v) => { await reveal(p, `[data-m="${k}"]`); await p.selectOption(`[data-m="${k}"]`, v); };
const settle = (p, ms = 350) => p.waitForTimeout(ms);
const status = (p) => p.$eval('#pv-status', (e) => e.innerText.replace(/\s+/g, ' '));

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
    /* ---------------- routing from the dashboard ---------------- */
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

    /* ---------------- issue A: negative absolute pressure ---------------- */
    await clickText(p, 'One pressure', '.pv-pills button'); await settle(p);
    await setField(p, 'p', '-100'); await setField(p, 'T', '200'); await setField(p, 'gg', '0.65'); await settle(p);
    check('negative pressure: field error shown', /Absolute pressure must be greater than 0/.test(await p.$eval('[data-err="p"]', (e) => e.innerText)));
    check('negative pressure: status "Invalid input"', /Invalid input/.test(await status(p)), await status(p));
    check('negative pressure: summary names the field', /Check: Pressure — Absolute pressure must be greater than 0/.test(await p.$eval('#pv-errsum', (e) => e.innerText)));
    await clickText(p, 'Results Table', '.pv-tab'); await settle(p);
    check('negative pressure: no results table', !(await p.$('.pv-res')) && /No results yet/.test(await p.$eval('#pv-tbl-wrap', (e) => e.innerText)));
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p);

    /* ---------------- blank inputs: missing fields are named ---------------- */
    await clickText(p, 'Clear inputs'); await settle(p);
    const reqd = await p.$$eval('[data-err]', (els) => els.filter((e) => e.innerText === 'Input required').map((e) => e.dataset.err));
    check('blank gas: Input required beside p, T, γg', ['p', 'T', 'gg'].every((k) => reqd.includes(k)), reqd.join(','));
    check('blank gas: short status badge "Input needed · 3 fields"', /^\s*Input needed\s*3 fields\s*$/.test(await status(p)), await status(p));
    const sumG = await p.$eval('#pv-errsum', (e) => e.innerText);
    check('blank gas: error summary names the missing fields', /Missing: Pressure, Temperature, Gas specific gravity/.test(sumG) && !/Input required/.test(sumG), sumG);
    check('blank gas: example marker removed', !(await p.$('.pv-chip.is-example')));
    await p.click('.pv-errlink[data-focus="T"]'); await settle(p, 150);
    check('summary link focuses the field', (await p.evaluate(() => document.activeElement && document.activeElement.id)) === 'pv-in-T');
    await clickText(p, 'Charts', '.pv-tab'); await settle(p);
    check('blank gas: chart says what is missing', /Complete your fluid inputs[\s\S]*Missing: Pressure, Temperature, Gas specific gravity/.test(await p.$eval('#pv-chart-msg', (e) => e.innerText)));
    await clickText(p, 'Oil', '.pv-fluid button'); await settle(p);
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p);
    await clickText(p, 'Clear inputs'); await settle(p);
    const reqO = await p.$$eval('[data-err]', (els) => els.filter((e) => e.innerText === 'Input required').map((e) => e.dataset.err));
    check('blank oil: Input required on T, γg, API, pb and the range', ['T', 'gg', 'api', 'pb', 'pMin', 'pMax', 'pStep'].every((k) => reqO.includes(k)), reqO.join(','));
    check('blank oil: summary lists every missing field', /Missing: Minimum pressure, Maximum pressure, Pressure increment, Temperature, Gas specific gravity, Oil gravity \(API\), Bubble-point pressure/.test(await p.$eval('#pv-errsum', (e) => e.innerText)), await p.$eval('#pv-errsum', (e) => e.innerText));
    await clickText(p, 'Results Table', '.pv-tab'); await settle(p);
    check('blank oil: no numerical results', !(await p.$('.pv-res')));
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p);
    await clickText(p, 'Load example'); await settle(p, 400);
    check('Load example restores values and the example marker', (await p.$eval('[data-k="pb"]', (e) => e.value)) === '2200' && !!(await p.$('.pv-chip.is-example')) && /Valid/.test(await status(p)));

    /* ---------------- calculation failure is reported as such ---------------- */
    await clickText(p, 'Solution GOR, Rsb', '.pv-pills button'); await settle(p);
    await reveal(p, '[data-m="rs"]');
    await selectMethod(p, 'rs', 'petrosky_farshad'); await setField(p, 'rsb', '0.0001'); await settle(p, 500);
    check('solver/characterisation failure: status "Calculation failed"', /Calculation failed/.test(await status(p)), await status(p));
    check('failure explained in the summary', /Calculation failed: .*gives pb ≤ 0/.test(await p.$eval('#pv-errsum', (e) => e.innerText)));
    await clickText(p, 'Load example'); await settle(p, 400);

    /* ---------------- issue C: pb controls the phase split ---------------- */
    await clickText(p, 'Stock-tank density', '.pv-pills button'); await settle(p);
    await clickText(p, 'Pressure list', '.pv-pills button'); await settle(p);
    await setField(p, 'pList', '1000, 3000, 5000'); await setField(p, 'T', '200'); await setField(p, 'gg', '0.65');
    await setField(p, 'rhoSto', '53.04'); await setField(p, 'pb', '2200'); await settle(p, 500);
    check('case C: valid', /Valid/.test(await status(p)), await status(p));
    await clickText(p, 'Results Table', '.pv-tab'); await settle(p);
    const rows = await p.$$eval('.pv-res tbody tr', (trs) => trs.map((tr) => [...tr.cells].map((c) => c.innerText.trim())));
    const rsb = await p.$$eval('.pv-sc', (cs) => cs.find((c) => /Rsb/.test(c.innerText)).querySelector('.pv-sc-v').innerText.split(' ')[0]);
    const r3000 = rows.find((r) => r[1].startsWith('3000')), r5000 = rows.find((r) => r[1].startsWith('5000')), r2200 = rows.find((r) => r[1].startsWith('2200'));
    check('case C: pb inserted as a row', !!r2200 && /^bubble point/i.test(r2200[2]) && /added/i.test(r2200[2]));
    check('case C: Rs(3000) = Rs(5000) = Rsb', r3000 && r5000 && r3000[3] === rsb && r5000[3] === rsb, `${r3000 && r3000[3]} / ${r5000 && r5000[3]} / ${rsb}`);
    check('case C: Bo falls above pb', r3000 && r5000 && +r5000[4] < +r3000[4] && +r3000[4] < +r2200[4]);
    check('case C: states', r3000[2] === 'undersaturated' && rows[0][2] === 'saturated');
    check('table headers carry units and the Rs/Bo basis', /scf\/STB · 60 °F/.test(await p.$eval('.pv-res thead', (e) => e.innerText)));
    check('missing co below pb explained by a numbered note', /—1/.test(rows[0].join(' ')) && /Not calculated below pb/.test(await p.$eval('.pv-notes', (e) => e.innerText)));
    await p.screenshot({ path: path.join(OUT, 'oil-table-caseC-1366.png') });

    /* ---------------- single pressure: a summary, not a curve ---------------- */
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p);
    await clickText(p, 'One pressure', '.pv-pills button'); await settle(p);
    await setField(p, 'p', '3000'); await settle(p, 400);
    await clickText(p, 'Charts', '.pv-tab'); await settle(p, 400);
    check('single pressure: result summary shown instead of a plot', await p.$eval('#pv-single', (e) => !e.hidden && /Result at one pressure/i.test(e.innerText) && /p = 3000\.0/.test(e.innerText)) && await p.$eval('#pv-chart-host', (e) => e.hidden));

    /* ---------------- correlation selection, chart, point selection ---------------- */
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p);
    await clickText(p, 'Pressure range', '.pv-pills button'); await settle(p);
    await setField(p, 'pMin', '200'); await setField(p, 'pMax', '5000'); await setField(p, 'pStep', '200'); await settle(p, 500);
    await selectMethod(p, 'rs', 'glaso'); await settle(p);
    await clickText(p, 'View charts'); await settle(p, 500);
    check('live workspace shows inputs and chart together', (await p.$eval('.pv-tab.is-on', (e) => e.dataset.view)) === 'inputs' && !!(await p.$('.pv-entry [data-k="T"]')) && !!(await p.$('.pc-chart')));
    check('correlation selection reaches the chart legend', /Glasø/.test(await p.$eval('#pv-legend', (e) => e.innerText)));
    const meta = await p.$eval('#pv-chart-meta', (e) => e.innerText);
    check('chart header shows T, method, basis and pb', /T = 200\.0 °F/.test(meta) && /Glasø/.test(meta) && /Standard basis 60 °F, 101\.325 kPa/.test(meta) && /pb = 2200\.0 psia/.test(meta.replace(/\s+/g, ' ')), meta);
    check('bubble-point marker drawn', /pb = 2200/.test(await p.$eval('.pc-chart', (e) => e.textContent)));
    await reveal(p, '[data-cmp="standing"]'); await p.click('[data-cmp="standing"]'); await settle(p, 500);
    check('comparison curve added to the legend', /COMPARE\s*Standing/i.test(await p.$eval('#pv-legend', (e) => e.innerText)));
    const box = await p.$eval('.pc-chart', (e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
    check('live workspace reserves readable chart space at 1366×768 (≥ 800×200 px)', box[2] >= 800 && box[3] >= 200, box.join('×'));
    await p.mouse.move(box[0] + box[2] * 0.3, box[1] + box[3] * 0.5); await settle(p, 200);
    check('hover tooltip shows pressure and value', await p.$eval('.pc-tip', (e) => !e.hidden && /Pressure = .*psia/.test(e.innerText)));
    await p.mouse.click(box[0] + box[2] * 0.3, box[1] + box[3] * 0.5); await settle(p, 300);
    const bar = await p.$eval('#pv-pointbar', (e) => e.innerText.replace(/\s+/g, ' '));
    const selIdx = +(/Point (\d+) of 25/.exec(bar) || [])[1] - 1;
    check('selection shows a concise value summary', selIdx >= 0 && /Rs/.test(bar) && /Bo/.test(bar) && /Show equation/.test(bar), bar);
    await p.focus('.pc-chart'); await p.keyboard.press('ArrowRight'); await settle(p, 200);
    check('arrow key moves the selection', new RegExp('Point ' + (selIdx + 2) + ' of 25').test(await p.$eval('#pv-pointbar', (e) => e.innerText)));
    await clickText(p, 'Show equation'); await settle(p, 300);
    const ex = await p.$eval('#pv-ex-body', (e) => e.innerText);
    check('"Show equation" opens the drawer with method and substituted values', await p.$eval('#pv-explain', (e) => e.classList.contains('is-open')) && /Equation at the selected point/.test(await p.$eval('#pv-ex-title', (e) => e.innerText)) && /Glasø/.test(ex) && /Substituted values/i.test(ex));
    await p.keyboard.press('Escape'); await settle(p, 300);
    await p.screenshot({ path: path.join(OUT, 'oil-chart-1366-light.png') });
    await clickText(p, 'Results Table', '.pv-tab'); await settle(p);
    check('selected point highlighted in the table', (await p.$eval('.pv-res tr.is-sel', (e) => +e.dataset.row)) === selIdx + 1);
    check('bubble-point row marked in the table', /bubble point/.test(await p.$eval('.pv-res tr.is-pb', (e) => e.innerText)));
    await p.click('.pv-res tr[data-row="3"]'); await settle(p, 200);
    await clickText(p, 'Charts', '.pv-tab'); await settle(p, 400);
    check('table row selects the chart point', /Point 4 of 25/.test(await p.$eval('#pv-pointbar', (e) => e.innerText)));

    /* ---------------- explanation drawer and field help ---------------- */
    await clickText(p, 'Explain This Stage'); await settle(p, 300);
    check('explain drawer opens with chart context', await p.$eval('#pv-explain', (e) => e.classList.contains('is-open')) && /Using the calculator/.test(await p.$eval('#pv-ex-title', (e) => e.innerText)));
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p, 300);
    check('explain drawer follows the view', /Using the calculator/.test(await p.$eval('#pv-ex-title', (e) => e.innerText)));
    await p.keyboard.press('Escape'); await settle(p, 300);
    check('Escape closes the drawer', !(await p.$eval('#pv-explain', (e) => e.classList.contains('is-open'))));
    await p.click('.pv-help[data-help="gg"]'); await settle(p, 300);
    check('field help opens in the drawer', await p.$eval('#pv-explain', (e) => e.classList.contains('is-open')) && /Gas specific gravity/.test(await p.$eval('#pv-ex-title', (e) => e.innerText)) && /28\.96/.test(await p.$eval('#pv-ex-body', (e) => e.innerText)));
    check('drawer uses the procedure-page section classes', (await p.$$('#pv-ex-body .sgSec .sgLbl')).length > 0);
    await p.keyboard.press('Escape'); await settle(p, 300);

    /* ---------------- measured data: basis must be declared ---------------- */
    await clickText(p, 'Measured Data', '.pv-tab'); await settle(p);
    check('template names units', /Rs \(scf\/STB\)/.test(await p.$eval('.pv-template code', (e) => e.innerText)));
    const [tdl] = await Promise.all([p.waitForEvent('download'), clickText(p, 'Download template')]);
    const tpl = fs.readFileSync(await tdl.path(), 'utf8');
    check('downloadable template carries units, basis note and header', /^# PVT Nexus measured-data template \(oil\)/.test(tpl) && /declare their basis/.test(tpl) && /p \(psia\),Rs \(scf\/STB\),Bo \(rb\/STB\)/.test(tpl));
    await p.fill('#pv-meas-text', '# my lab data\np (psia)\tRs (scf/STB)\n800\t12x\n1600\t280\t5');
    await clickText(p, 'Compare with calculation'); await settle(p);
    const perr = await p.$eval('#pv-meas-errs', (e) => e.innerText);
    check('malformed cells and rows reported by line and column', /Line 3, column "Rs \(scf\/STB\)": "12x" is not a number/.test(perr) && /Line 4: 3 values but 2 columns/.test(perr), perr);
    const mdata = 'p (psia)\tRs (scf/STB)\tBo (rb/STB)\n800\t120\t1.11\n1600\t280\t1.18\n2200\t425\t1.25\n4000\t-\t1.22\n3000\t0\t1.235\n3000\t430\t1.236';
    await p.fill('#pv-meas-text', mdata);
    await clickText(p, 'Compare with calculation'); await settle(p, 500);
    check('basis not declared: comparison blocked', /Basis not declared/.test(await p.$eval('#pv-meas-errs', (e) => e.innerText)) && !/AARE/.test(await p.$eval('#pv-meas-stats', (e) => e.innerText)));
    await clickText(p, '15 °C, 101.325 kPa', '[data-seg="measBasis"] button'); await clickText(p, 'Compare with calculation'); await settle(p, 500);
    const blk = await p.$eval('#pv-meas-errs', (e) => e.innerText);
    check('15 °C oil Rs / Bo: not compared, reason given', /Not compared: Rs/.test(blk) && /Not compared: Bo/.test(blk) && /thermal expansion/.test(blk), blk);
    await clickText(p, '60 °F, 101.325 kPa', '[data-seg="measBasis"] button'); await clickText(p, 'Compare with calculation'); await settle(p, 500);
    const stats = await p.$eval('#pv-meas-stats', (e) => e.innerText);
    check('60 °F: measured rows read and errors computed', /6 measured rows read/.test(await p.$eval('#pv-meas-errs', (e) => e.innerText)) && /AARE/.test(stats));
    check('zero / missing measured values excluded, not used', /1 missing/.test(stats) && /1 zero measured/.test(stats), stats);
    check('repeated pressure kept as two observations', (await p.$$eval('#pv-meas-table tbody tr', (t) => t.filter((r) => r.cells[1].innerText.trim().startsWith('3000')).length)) === 2);
    check('no "BVT" wording anywhere', !/BVT/.test(await p.evaluate(() => document.body.innerText)));
    check('batch evaluation kept (oil) with PVT wording', /Measured Rs \(PVT\)/.test(await p.$eval('#pv-batch-host', (e) => e.innerText)));
    await p.fill('#oc-oRsPaste', 'Oil\tT\tpb\tRs\tBo\trho\tpsep\tTsep\tAPI\tgg\n1\t250\t2377\t751\t1.528\t38.13\t150\t60\t47.1\t0.851\n2\tx\t1');
    await clickText(p, 'Evaluate Rs methods'); await settle(p, 300);
    check('batch: Standing Rs for Ahmed oil 1 = 838.0', /837\.99|838\.0/.test(await p.$eval('#oc-oRsEvalBody', (e) => e.innerText)));
    check('batch: bad line reported', /Line 3/.test(await p.$eval('#oc-skips-rs', (e) => e.innerText)));
    await clickText(p, 'Charts', '.pv-tab'); await settle(p, 400);
    await clickText(p, 'Bo', '.pv-props button'); await settle(p, 400);
    check('measured points overlaid and labelled', /Measured \(PVT data\)/.test(await p.$eval('#pv-legend', (e) => e.innerText)) && (await p.$$('.pc-chart rect[width="9"]')).length >= 5);

    /* ---------------- exports ---------------- */
    const [dl] = await Promise.all([p.waitForEvent('download'), clickText(p, 'Export PNG')]);
    const png = fs.readFileSync(await dl.path());
    check('PNG export is a PNG image', dl.suggestedFilename().endsWith('.png') && png.slice(1, 4).toString() === 'PNG' && png.length > 20000);
    await clickText(p, 'Results Table', '.pv-tab'); await settle(p);
    const [dl2] = await Promise.all([p.waitForEvent('download'), clickText(p, 'Export CSV')]);
    const csv = fs.readFileSync(await dl2.path(), 'utf8');
    check('CSV export carries units, basis, inputs, methods, pb and assumptions',
      /# Standard basis: Correlation basis: 60 °F, 101\.325 kPa/.test(csv) && /# Methods: Rs \/ pb = Glasø/.test(csv) && /p \(psia\),state,Rs \(scf\/STB @ 60 °F\),Bo \(rb\/STB @ 60 °F\)/.test(csv)
      && /# Input: Bubble-point pressure \(measured\) = 2200 psia/.test(csv) && /# Points: 25; bubble point = 2200\.0 psia/.test(csv) && /\[Assumption;/.test(csv), csv.split('\n').slice(0, 6).join(' / '));
    const csvRows = csv.split(/\r?\n/).filter((l) => /^\d/.test(l));
    check('CSV: 25 rows, one bubble point, no duplicate endpoint', csvRows.length === 25 && csvRows.filter((l) => /,bubble point,/.test(l)).length === 1 && csvRows.filter((l) => /^5000\.0,/.test(l)).length === 1, csvRows.length);

    /* ---------------- unit system ---------------- */
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p);
    await clickText(p, 'Metric', '.pv-pills button'); await settle(p, 500);
    check('metric switch converts the typed values', (await p.$eval('[data-k="T"]', (e) => e.value)) === '93.33333' && (await p.$eval('[data-k="pb"]', (e) => e.value)).startsWith('151.68'));
    await clickText(p, 'Results Table', '.pv-tab'); await settle(p);
    check('metric table headers (units change, basis stays 60 °F)', /bar\(a\)/.test(await p.$eval('.pv-res thead', (e) => e.innerText)) && /sm³\/sm³ · 60 °F/.test(await p.$eval('.pv-res thead', (e) => e.innerText)));
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p);
    await clickText(p, 'Gauge, bar(g)', '.pv-pills button'); await settle(p, 400);
    check('gauge switch shifts pressures by 1 atm', (await p.$eval('[data-k="pb"]', (e) => e.value)).startsWith('150.67'));
    await clickText(p, 'Field', '.pv-pills button'); await clickText(p, 'Absolute, psia', '.pv-pills button'); await settle(p, 400);

    /* ---------------- reset ---------------- */
    await clickText(p, 'Reset'); await settle(p, 400);
    check('reset restores the visible example values', (await p.$eval('[data-k="pb"]', (e) => e.value)) === '2200' && !!(await p.$('.pv-chip.is-example')) && /Valid/.test(await status(p)));
    await clickText(p, 'Measured Data', '.pv-tab'); await settle(p);
    check('reset clears measured data', (await p.$eval('#pv-meas-text', (e) => e.value)) === '');
    check('no script errors (1366 light)', p.__errs.length === 0, p.__errs.join(' | '));
    await p.context().close();

    /* ---------------- gas standard basis: 60 °F vs 15 °C ---------------- */
    p = await openApp(browser, 1366, 768, 'light');
    await clickText(p, 'Gas Calculator'); await settle(p);
    const gasRow = async () => { await clickText(p, 'Results Table', '.pv-tab'); await settle(p, 300); const r = await p.$eval('.pv-res tbody tr[data-row="9"]', (tr) => [...tr.cells].map((c) => c.innerText.trim())); const h = await p.$eval('.pv-res thead', (e) => e.innerText); await clickText(p, 'Inputs', '.pv-tab'); await settle(p, 200); return { r, h }; };
    const g60 = await gasRow();
    await clickText(p, '15 °C, 101.325 kPa', '[data-seg="stdBasis"] button'); await settle(p, 400);
    const g15 = await gasRow();
    check('15 °C basis: Z unchanged, Bg × 519.67/518.67', g60.r[3] === g15.r[3] && Math.abs(+g15.r[4] / +g60.r[4] - 519.67 / 518.67) < 2e-4, g60.r[4] + ' → ' + g15.r[4]);
    check('15 °C basis: headers and context show the basis', /ft³\/scf · 15 °C/.test(g15.h) && /Std 15 °C/.test(await p.$eval('#pv-ctx', (e) => e.innerText)));
    await clickText(p, 'Measured Data', '.pv-tab'); await settle(p);
    await p.fill('#pv-meas-text', 'p (psia),Z,Bg (ft³/scf)\n2000,0.886,0.00826\n4000,0.94,0.0044');
    await clickText(p, '60 °F, 101.325 kPa', '[data-seg="measBasis"] button'); await clickText(p, 'Compare with calculation'); await settle(p, 500);
    check('measured Bg on the other basis is converted and says so', /Converted: Bg/.test(await p.$eval('#pv-meas-errs', (e) => e.innerText)) && /AARE/.test(await p.$eval('#pv-meas-stats', (e) => e.innerText)));
    await clickText(p, 'Results Table', '.pv-tab'); await settle(p);
    const [dlg] = await Promise.all([p.waitForEvent('download'), clickText(p, 'Export CSV')]);
    const gcsv = fs.readFileSync(await dlg.path(), 'utf8');
    check('gas CSV carries the 15 °C basis', /# Standard basis: Laboratory basis: 15 °C, 101\.325 kPa/.test(gcsv) && /Bg \(ft³\/scf @ 15 °C\)/.test(gcsv));
    check('no script errors (gas basis)', p.__errs.length === 0, p.__errs.join(' | '));
    await p.context().close();

    /* ---------------- unit switching keeps the same physical points (regression) ----------------
       Default oil example 200–5000 psia step 200, pb 2200: Field -> Metric used to give 26 rows,
       344.74 bar(a) twice and the 151.68 bar(a) row labelled "saturated". */
    p = await openApp(browser, 1366, 768, 'light');
    await clickText(p, 'Oil Calculator'); await settle(p);
    const tableRows = async () => {
      await clickText(p, 'Results Table', '.pv-tab'); await settle(p, 300);
      const r = await p.$$eval('.pv-res tbody tr', (trs) => trs.map((tr) => ({ p: tr.cells[1].innerText.trim(), st: tr.cells[2].innerText.trim(), sel: tr.classList.contains('is-sel') })));
      await clickText(p, 'Inputs', '.pv-tab'); await settle(p, 200);
      return r;
    };
    const unitsTo = async (u) => { await clickText(p, u, '.pv-pills button'); await settle(p, 300); };
    const shape = (rows, max, pbTxt, label) => {
      check(label + ': 25 rows', rows.length === 25, rows.length);
      check(label + ': one maximum row', rows.filter((r) => r.p === max).length === 1, rows.slice(-3).map((r) => r.p).join(','));
      const bp = rows.filter((r) => r.st === 'bubble point');
      check(label + ': exactly one bubble-point row at pb', bp.length === 1 && bp[0].p === pbTxt, JSON.stringify(bp));
      check(label + ': phases around pb', rows[9].st === 'saturated' && rows[11].st === 'undersaturated');
    };
    await clickText(p, 'Charts', '.pv-tab'); await settle(p, 400);
    check('instruction shown before a point is chosen', /Click a point/.test(await p.$eval('#pv-pointbar', (e) => e.innerText)));
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p, 200);
    shape(await tableRows(), '5000.0', '2200.0', 'field');
    /* select the bubble-point row, then switch units */
    await clickText(p, 'Results Table', '.pv-tab'); await settle(p, 300);
    await p.click('.pv-res tr[data-row="10"]'); await settle(p, 200);
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p, 200);
    await unitsTo('Metric');
    const met = await tableRows();
    shape(met, '344.74', '151.68', 'metric');
    check('selection follows the same physical pressure (151.68 bar(a))', met.findIndex((r) => r.sel) === 10 && met[10].p === '151.68');
    for (let k = 0; k < 6; k++) { await unitsTo(k % 2 ? 'Metric' : 'Field'); }
    await unitsTo('Field');
    const back = await tableRows();
    shape(back, '5000.0', '2200.0', 'after 7 switches');
    check('inputs return exactly to the typed values (no drift)', JSON.stringify(await p.evaluate(() => ['pMin', 'pMax', 'pStep', 'pb', 'T'].map((k) => document.querySelector('[data-k="' + k + '"]').value))) === '["200","5000","200","2200","200"]');
    check('selection kept through repeated switching', back.findIndex((r) => r.sel) === 10);
    await clickText(p, 'Charts', '.pv-tab'); await settle(p, 400);
    check('chart point summary shows the same pressure', /Point 11 of 25/.test(await p.$eval('#pv-pointbar', (e) => e.innerText)) && /p = 2200\.0/.test(await p.$eval('#pv-pointbar', (e) => e.innerText)));
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p, 200);
    /* gauge: pressures shift by 1 atm, the increment does not */
    await unitsTo('Gauge, psig');
    check('gauge: increment unchanged, pressures offset', (await p.$eval('[data-k="pStep"]', (e) => e.value)) === '200' && (await p.$eval('[data-k="pMin"]', (e) => e.value)) === '185.3041');
    shape((await tableRows()).map((r) => r), '4985.3', '2185.3', 'gauge');
    await unitsTo('Absolute, psia');
    check('absolute again: exact inputs', (await p.$eval('[data-k="pMin"]', (e) => e.value)) === '200' && (await p.$eval('[data-k="pb"]', (e) => e.value)) === '2200');
    /* CSV after a switch: same rows, one bubble point */
    await unitsTo('Metric');
    await clickText(p, 'Results Table', '.pv-tab'); await settle(p, 300);
    const [dlm] = await Promise.all([p.waitForEvent('download'), clickText(p, 'Export CSV')]);
    const rowsCsv = fs.readFileSync(await dlm.path(), 'utf8').split(/\r?\n/).filter((l) => /^\d/.test(l));
    check('metric CSV: 25 rows, one bubble point, one maximum', rowsCsv.length === 25 && rowsCsv.filter((l) => /,bubble point,/.test(l)).length === 1 && rowsCsv.filter((l) => /^344\.74,/.test(l)).length === 1, rowsCsv.length);
    /* gas: equivalent results across units */
    await clickText(p, 'Gas', '.pv-fluid button'); await settle(p, 300);
    const gasZ = async () => { await clickText(p, 'Results Table', '.pv-tab'); await settle(p, 300); return p.$$eval('.pv-res tbody tr', (trs) => trs.map((tr) => tr.cells[3].innerText.trim())); };
    const zm = await gasZ();
    await clickText(p, 'Inputs', '.pv-tab'); await settle(p, 200); await unitsTo('Field');
    const zf = await gasZ();
    check('gas: same rows and Z in both unit systems', zm.length === 30 && JSON.stringify(zm) === JSON.stringify(zf), zm.length + ' / ' + zf.length);
    check('no script errors (unit switching)', p.__errs.length === 0, p.__errs.join(' | '));
    await p.context().close();

    /* ---------------- layout: sizes and themes ---------------- */
    for (const [w, h, theme] of [[1366, 768, 'dark'], [1920, 1080, 'light'], [1920, 1080, 'dark'], [390, 844, 'light']]) {
      p = await openApp(browser, w, h, theme);
      await clickText(p, 'Oil Calculator'); await settle(p);
      const tag = `${w}x${h}-${theme}`;
      check(`[${tag}] theme applied`, (await p.evaluate(() => document.documentElement.getAttribute('data-theme'))) === (theme === 'light' ? 'light' : null));
      for (const v of ['Inputs', 'Charts', 'Results Table', 'Measured Data', 'Methods & References']) {
        await clickText(p, v, '.pv-tab'); await settle(p, 400);
        const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        check(`[${tag}] ${v}: no horizontal page scroll`, ov <= 1, 'overflow ' + ov + 'px');
        if (v === 'Charts') {
          const b = await p.$eval('.pc-chart', (e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
          check(`[${tag}] chart size`, w < 800 ? b[0] >= 300 && b[1] >= 180 : b[0] >= 800 && b[1] >= 200, b.join('×'));
          await p.screenshot({ path: path.join(OUT, `oil-chart-${tag}.png`) });
        }
        if (v === 'Inputs') {
          const tabsVisible = await p.$eval('.pv-tabs', (e) => e.getBoundingClientRect().bottom < window.innerHeight);
          check(`[${tag}] tabs visible`, tabsVisible);
          /* keyboard focus is visible: Tab to the first pill inside the calculator */
          await p.focus('.pv-fluid button'); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab'); await settle(p, 100);
          const ring = await p.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return a.closest('.pv') && s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; });
          check(`[${tag}] visible focus ring`, !!ring);
          const unlabeled = await p.$$eval('.pv input:not([type=hidden]), .pv select, .pv textarea', (els) => els.filter((e) => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.closest('label')).map((e) => e.id || e.outerHTML.slice(0, 60)));
          check(`[${tag}] every input has a label`, unlabeled.length === 0, unlabeled.join(', '));
          const overlap = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); const a = r('.pv-hero'), b = r('.pv-bar'); return a.bottom > b.top + 1; });
          check(`[${tag}] header and tab bar do not overlap`, !overlap);
          await p.screenshot({ path: path.join(OUT, `oil-inputs-${tag}.png`) });
        }
      }
      await clickText(p, 'Gas', '.pv-fluid button'); await settle(p);
      await clickText(p, 'Charts', '.pv-tab'); await settle(p, 400);
      await p.screenshot({ path: path.join(OUT, `gas-chart-${tag}.png`) });
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
    /* calculator: theme toggle inside the page */
    p = await openApp(browser, 1366, 768, 'light');
    await clickText(p, 'PVT Calculator'); await settle(p);
    await p.click('#pv-theme'); await settle(p, 200);
    const th = await p.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), saved: localStorage.getItem('pvtTheme'), label: document.querySelector('#pv-theme').innerText.trim() }));
    check('calculator theme toggle switches to dark and remembers it', th.attr === null && th.saved === 'dark' && th.label === 'Light', JSON.stringify(th));
    await p.click('#pv-theme'); await settle(p, 200);
    check('calculator theme toggle switches back to light', (await p.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light');
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
