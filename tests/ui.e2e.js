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

const clickText = (p, t, sel = 'button') => p.evaluate(([t, sel]) => {
  const b = [...document.querySelectorAll(sel)].find((x) => x.offsetParent !== null && (x.innerText.trim() === t || x.innerText.trim().startsWith(t)));
  if (!b) throw new Error('no element: ' + t); b.click();
}, [t, sel]);
const setField = async (p, k, v) => { await p.fill(`[data-k="${k}"]`, String(v)); };
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
    await clickText(p, 'Single pressure', '.pv-seg button'); await settle(p);
    await setField(p, 'p', '-100'); await setField(p, 'T', '200'); await setField(p, 'gg', '0.65'); await settle(p);
    check('negative pressure: field error shown', /Absolute pressure must be greater than 0/.test(await p.$eval('[data-err="p"]', (e) => e.innerText)));
    check('negative pressure: status invalid', /Invalid input/.test(await status(p)));
    await clickText(p, 'Results Table'); await settle(p);
    check('negative pressure: no results table', !(await p.$('.pv-res')) && /No results/.test(await p.$eval('#pv-tbl-wrap', (e) => e.innerText)));
    await clickText(p, 'Inputs'); await settle(p);

    /* ---------------- issue B: blank inputs ---------------- */
    await clickText(p, 'Clear inputs'); await settle(p);
    const reqd = await p.$$eval('[data-err]', (els) => els.filter((e) => e.innerText === 'Input required').map((e) => e.dataset.err));
    check('blank gas: Input required on p, T, γg', ['p', 'T', 'gg'].every((k) => reqd.includes(k)), reqd.join(','));
    check('blank gas: no "Calculated" status', /Invalid input/.test(await status(p)));
    await clickText(p, 'Charts'); await settle(p);
    check('blank gas: chart shows no-results message', /No results/.test(await p.$eval('#pv-chart-msg', (e) => e.innerText)));
    await clickText(p, 'Oil', '.pv-fluid button'); await settle(p);
    await clickText(p, 'Inputs'); await settle(p);
    await clickText(p, 'Clear inputs'); await settle(p);
    const reqO = await p.$$eval('[data-err]', (els) => els.filter((e) => e.innerText === 'Input required').map((e) => e.dataset.err));
    check('blank oil: Input required on T, γg, API, pb and the range', ['T', 'gg', 'api', 'pb', 'pMin', 'pMax', 'pStep'].every((k) => reqO.includes(k)), reqO.join(','));
    await clickText(p, 'Results Table'); await settle(p);
    check('blank oil: no numerical results', !(await p.$('.pv-res')));
    await clickText(p, 'Inputs'); await settle(p);

    /* ---------------- issue C: pb controls the phase split ---------------- */
    await clickText(p, 'Stock-tank oil density', '.pv-seg button'); await settle(p);
    await clickText(p, 'Pressure list', '.pv-seg button'); await settle(p);
    await setField(p, 'pList', '1000, 3000, 5000'); await setField(p, 'T', '200'); await setField(p, 'gg', '0.65');
    await setField(p, 'rhoSto', '53.04'); await setField(p, 'pb', '2200'); await settle(p, 500);
    check('case C: valid', /Calculated/.test(await status(p)), await status(p));
    await clickText(p, 'Results Table'); await settle(p);
    const rows = await p.$$eval('.pv-res tbody tr', (trs) => trs.map((tr) => [...tr.cells].map((c) => c.innerText.trim())));
    const rsb = await p.$$eval('.pv-sc', (cs) => cs.find((c) => /Rsb/.test(c.innerText)).querySelector('.pv-sc-v').innerText.split(' ')[0]);
    const r3000 = rows.find((r) => r[1].startsWith('3000')), r5000 = rows.find((r) => r[1].startsWith('5000')), r2200 = rows.find((r) => r[1].startsWith('2200'));
    check('case C: pb inserted as a row', !!r2200 && r2200[2] === 'bubble point');
    check('case C: Rs(3000) = Rs(5000) = Rsb', r3000 && r5000 && r3000[3] === rsb && r5000[3] === rsb, `${r3000 && r3000[3]} / ${r5000 && r5000[3]} / ${rsb}`);
    check('case C: Bo falls above pb', r3000 && r5000 && +r5000[4] < +r3000[4] && +r3000[4] < +r2200[4]);
    check('case C: states', r3000[2] === 'undersaturated' && rows[0][2] === 'saturated');
    await p.screenshot({ path: path.join(OUT, 'oil-table-caseC-1366.png') });

    /* ---------------- correlation selection, chart, point selection ---------------- */
    await clickText(p, 'Inputs'); await settle(p);
    await clickText(p, 'Pressure range', '.pv-seg button'); await settle(p);
    await setField(p, 'pMin', '200'); await setField(p, 'pMax', '5000'); await setField(p, 'pStep', '200'); await settle(p, 500);
    await p.selectOption('[data-m="rs"]', 'glaso'); await settle(p);
    await clickText(p, 'Charts'); await settle(p, 500);
    check('correlation selection reaches the chart legend', /Glasø/.test(await p.$eval('#pv-legend', (e) => e.innerText)));
    check('bubble-point marker drawn', /pb = 2200/.test(await p.$eval('.pc-chart', (e) => e.textContent)));
    await p.click('[data-cmp="standing"]'); await settle(p, 500);
    check('comparison curve added to the legend', /Standing/.test(await p.$eval('#pv-legend', (e) => e.innerText)));
    const box = await p.$eval('.pc-chart', (e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
    check('chart has room at 1366×768 (≥ 800×380 px)', box[2] >= 800 && box[3] >= 380, box.join('×'));
    await p.mouse.move(box[0] + box[2] * 0.3, box[1] + box[3] * 0.5); await settle(p, 200);
    check('hover tooltip shows pressure and value', await p.$eval('.pc-tip', (e) => !e.hidden && /Pressure = .*psia/.test(e.innerText)));
    await p.mouse.click(box[0] + box[2] * 0.3, box[1] + box[3] * 0.5); await settle(p, 300);
    const selTxt = await p.$eval('#pv-point', (e) => e.innerText);
    check('point selection shows method, equation and substituted values', /Selected point/i.test(selTxt) && /Glasø/.test(selTxt) && /Substituted values/i.test(selTxt));
    const selIdx = +(/Selected point (\d+)/i.exec(selTxt) || [])[1] - 1;
    await p.focus('.pc-chart'); await p.keyboard.press('ArrowRight'); await settle(p, 200);
    check('arrow key moves the selection', new RegExp('Selected point ' + (selIdx + 2), 'i').test(await p.$eval('#pv-point', (e) => e.innerText)));
    await p.screenshot({ path: path.join(OUT, 'oil-chart-1366-light.png') });
    await clickText(p, 'Results Table'); await settle(p);
    check('selected point highlighted in the table', (await p.$eval('.pv-res tr.is-sel', (e) => +e.dataset.row)) === selIdx + 1);
    await p.click('.pv-res tr[data-row="3"]'); await settle(p, 200);
    await clickText(p, 'Charts'); await settle(p, 400);
    check('table row selects the chart point', /Selected point 4 /i.test(await p.$eval('#pv-point', (e) => e.innerText)));

    /* ---------------- explanation drawer ---------------- */
    await clickText(p, 'Explain This Stage'); await settle(p, 300);
    check('explain drawer opens with chart context', await p.$eval('#pv-explain', (e) => e.classList.contains('is-open')) && /Reading the Rs chart/.test(await p.$eval('#pv-ex-title', (e) => e.innerText)));
    await clickText(p, 'Inputs'); await settle(p, 300);
    check('explain drawer follows the view', /What each input means/.test(await p.$eval('#pv-ex-title', (e) => e.innerText)));
    await p.keyboard.press('Escape'); await settle(p, 300);
    check('Escape closes the drawer', !(await p.$eval('#pv-explain', (e) => e.classList.contains('is-open'))));

    /* ---------------- measured data ---------------- */
    await clickText(p, 'Measured Data'); await settle(p);
    await p.fill('#pv-meas-text', 'p (psia)\tRs (scf/STB)\n800\t12x\n1600\t280');
    await clickText(p, 'Apply measured data'); await settle(p);
    check('measured import error names row and column', /Row 2, column "Rs \(scf\/STB\)"/.test(await p.$eval('#pv-meas-errs', (e) => e.innerText)));
    await p.fill('#pv-meas-text', 'p (psia)\tRs (scf/STB)\tBo (rb/STB)\n800\t120\t1.11\n1600\t280\t1.18\n2200\t425\t1.25\n4000\t-\t1.22\n3000\t0\t1.235');
    await clickText(p, 'Apply measured data'); await settle(p, 500);
    const stats = await p.$eval('#pv-meas-stats', (e) => e.innerText);
    check('measured data accepted and errors computed', /5 measured rows accepted/.test(await p.$eval('#pv-meas-errs', (e) => e.innerText)) && /AARE/.test(stats));
    check('zero / missing measured values excluded, not used', /1 missing/.test(stats) && /1 zero measured/.test(stats), stats);
    check('batch evaluation kept (oil) with PVT wording', /Measured Rs \(PVT\)/.test(await p.$eval('#pv-batch-host', (e) => e.innerText)));
    await p.fill('#oc-oRsPaste', 'Oil\tT\tpb\tRs\tBo\trho\tpsep\tTsep\tAPI\tgg\n1\t250\t2377\t751\t1.528\t38.13\t150\t60\t47.1\t0.851\n2\tx\t1');
    await clickText(p, 'Evaluate Rs methods'); await settle(p, 300);
    check('batch: Standing Rs for Ahmed oil 1 = 838.0', /837\.99|838\.0/.test(await p.$eval('#oc-oRsEvalBody', (e) => e.innerText)));
    check('batch: bad line reported', /Line 3/.test(await p.$eval('#oc-skips-rs', (e) => e.innerText)));
    await clickText(p, 'Charts'); await settle(p, 400);
    await clickText(p, 'Bo', '.pv-props button'); await settle(p, 400);
    check('measured points overlaid and labelled', /Measured \(PVT data\)/.test(await p.$eval('#pv-legend', (e) => e.innerText)) && (await p.$$('.pc-chart rect[width="9"]')).length >= 5);

    /* ---------------- exports ---------------- */
    const [dl] = await Promise.all([p.waitForEvent('download'), clickText(p, 'Export PNG')]);
    const png = fs.readFileSync(await dl.path());
    check('PNG export is a PNG image', dl.suggestedFilename().endsWith('.png') && png.slice(1, 4).toString() === 'PNG' && png.length > 20000);
    await clickText(p, 'Results Table'); await settle(p);
    const [dl2] = await Promise.all([p.waitForEvent('download'), clickText(p, 'Export CSV')]);
    const csv = fs.readFileSync(await dl2.path(), 'utf8');
    check('CSV export carries units, inputs, methods and standard conditions',
      /# Standard conditions: 60 °F and 14.696 psia/.test(csv) && /# Methods: Rs \/ pb = Glasø/.test(csv) && /p \(psia\),state,Rs \(scf\/STB\)/.test(csv) && /Bubble-point pressure, pb: 2200/.test(csv));

    /* ---------------- unit system ---------------- */
    await clickText(p, 'Inputs'); await settle(p);
    await clickText(p, 'Metric', '.pv-seg button'); await settle(p, 500);
    check('metric switch converts the typed values', (await p.$eval('[data-k="T"]', (e) => e.value)) === '93.33333' && (await p.$eval('[data-k="pb"]', (e) => e.value)).startsWith('151.68'));
    await clickText(p, 'Results Table'); await settle(p);
    check('metric table headers', /bar\(a\)/.test(await p.$eval('.pv-res thead', (e) => e.innerText)) && /sm³\/sm³/.test(await p.$eval('.pv-res thead', (e) => e.innerText)));
    await clickText(p, 'Inputs'); await settle(p);
    await clickText(p, 'Gauge bar(g)', '.pv-seg button'); await settle(p, 400);
    check('gauge switch shifts pressures by 1 atm', (await p.$eval('[data-k="pb"]', (e) => e.value)).startsWith('150.67'));
    await clickText(p, 'Field', '.pv-seg button'); await clickText(p, 'Absolute psia', '.pv-seg button'); await settle(p, 400);

    /* ---------------- reset ---------------- */
    await clickText(p, 'Reset'); await settle(p, 400);
    check('reset restores the visible example values', (await p.$eval('[data-k="pb"]', (e) => e.value)) === '2200' && !!(await p.$('.pv-banner.is-info')) && /Calculated/.test(await status(p)));
    await clickText(p, 'Measured Data'); await settle(p);
    check('reset clears measured data', (await p.$eval('#pv-meas-text', (e) => e.value)) === '');
    check('no script errors (1366 light)', p.__errs.length === 0, p.__errs.join(' | '));
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
          check(`[${tag}] chart size`, w < 800 ? b[0] >= 300 && b[1] >= 220 : b[0] >= 900 && b[1] >= 380, b.join('×'));
          await p.screenshot({ path: path.join(OUT, `oil-chart-${tag}.png`) });
        }
        if (v === 'Inputs') {
          const tabsVisible = await p.$eval('.pv-tabs', (e) => e.getBoundingClientRect().bottom < window.innerHeight);
          check(`[${tag}] tabs visible`, tabsVisible);
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
  } finally {
    await browser.close();
    server.close();
  }
  passes.forEach((s) => console.log('ok   ' + s));
  fails.forEach((s) => console.log('FAIL ' + s));
  console.log(`\n${passes.length} passed, ${fails.length} failed`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
