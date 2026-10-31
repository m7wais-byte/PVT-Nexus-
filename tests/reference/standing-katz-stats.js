/* Reproduce the Standing-Katz chart statistics quoted in calc/pvt-correlations.js (VERIFY.z) and
   calc/README.md from the full digitization, and (with --subset) write the subset used by the tests.

   Data: Standing & Katz (1942) Z chart, digitized by A. R. Reyes in the zFactor R package 0.1.9
   (https://github.com/f0nzie/zFactor, inst/extdata/sk_lp_tpr_*.txt and sk_hp_tpr_*.txt, GPL-2).

     git clone --depth 1 https://github.com/f0nzie/zFactor /tmp/zFactor
     node tests/reference/standing-katz-stats.js /tmp/zFactor [--subset]            */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('../../calc/pvt-correlations.js');
const dir = path.join(process.argv[2] || '', 'inst/extdata');
const pts = [];
for (const f of fs.readdirSync(dir).filter((f) => /^sk_(lp|hp)_tpr_\d+\.txt$/.test(f)).sort()) {
  const tpr = +f.match(/(\d+)/)[1] / 100;
  fs.readFileSync(path.join(dir, f), 'utf8').trim().split(/\r?\n/).slice(1).forEach((l) => {
    const [ppr, z] = l.trim().split(/\s+/).map(Number);
    if (isFinite(ppr) && isFinite(z)) pts.push([tpr, ppr, z]);
  });
}
function stats(m, sel) {
  let e = [], fail = 0;
  pts.filter(sel).forEach(([t, p, z]) => { const c = C.gas.z[m](p, t); if (!(c > 0)) { fail++; return; } e.push(Math.abs(100 * (c - z) / z)); });
  return { n: e.length + fail, fail, aare: +(e.reduce((a, b) => a + b, 0) / e.length).toFixed(2), max: +Math.max(...e).toFixed(1) };
}
const regions = { 'all': () => true, 'Tpr>=1.2': (p) => p[0] >= 1.2, 'Tpr>=1.2,Ppr<=3': (p) => p[0] >= 1.2 && p[1] <= 3,
  'Tpr>=1.2,3<Ppr<=6': (p) => p[0] >= 1.2 && p[1] > 3 && p[1] <= 6, 'Tpr>=1.2,6<Ppr<=10': (p) => p[0] >= 1.2 && p[1] > 6 && p[1] <= 10,
  'Tpr>=1.2,Ppr>10': (p) => p[0] >= 1.2 && p[1] > 10, 'Tpr<1.2': (p) => p[0] < 1.2 };
console.log('points', pts.length);
for (const m of ['dak', 'papay', 'beggs_brill']) for (const [k, f] of Object.entries(regions)) console.log(m.padEnd(12), k.padEnd(20), JSON.stringify(stats(m, f)));
if (process.argv.includes('--subset')) {
  const subset = pts.filter((_, i) => i % 4 === 0).map(([tpr, ppr, z]) => ({ tpr, ppr, z }));
  const out = { source: 'Standing & Katz (1942) compressibility chart, digitized in the zFactor R package 0.1.9 (A. R. Reyes, https://github.com/f0nzie/zFactor, inst/extdata, git 2226d31). Every 4th point of the ' + pts.length + ' digitized points.', points: subset };
  fs.writeFileSync(path.join(__dirname, 'standing-katz-subset.json'), JSON.stringify(out));
  console.log('subset', subset.length);
}
