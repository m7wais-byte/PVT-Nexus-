/* Geometry and process checks for the Flash equipment prototype (Playwright, headless Chromium).
   python3 -m http.server 8000   (repository root), then:  node prototypes/flash-unit/tools/verify.js [url] */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.argv[2] || 'http://localhost:8000/prototypes/flash-unit/index.html'); await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const out = {}, FU = FlashUnit, G = FU.G;
    const host = document.createElement('div'), sc = Scene.build(host, 'system', {});
    const R = sc.routes, at = sc.Lo.fu, loc = (pt) => [(pt[0] - at.x) / at.s, (pt[1] - at.y) / at.s];
    const sEnd = loc(R.sample.g.end), gStart = loc(R.gas.g.start), oilTopMax = FU.oilTop(40);
    out.sampleEndsAtTipInsideFlask = Math.abs(sEnd[0] - G.inlet.x) < .5 && Math.abs(sEnd[1] - G.inlet.tip) < .5 && G.inlet.tip > G.flask.neckBot && G.inlet.tip < oilTopMax;
    out.gasStartsAtHeadspaceOutlet = Math.abs(gStart[0] - G.outlet.x) < .5 && Math.abs(gStart[1] - G.outlet.open) < .5 && G.outlet.open < oilTopMax;
    let minD = 1e9; R.sample.g.pts.forEach(a => R.gas.g.pts.forEach(c => { minD = Math.min(minD, Math.hypot(a[0] - c[0], a[1] - c[1])); }));
    out.minDistSampleVsGasRoute = +minD.toFixed(1);
    const ga = sc.Lo.ga, gEnd = [(R.gas.g.end[0] - ga.x) / ga.s, (R.gas.g.end[1] - ga.y) / ga.s], s2 = Gasometer.G.sec[0];
    out.gasEndsIn2000ccChamber = Math.abs(gEnd[0] - s2.cx) < 1 && Math.abs(gEnd[1] - Gasometer.G.ch0 - 4) < 1;
    const pr = PVTCellArt.port({ at: sc.Lo.cell }, 'R');
    out.sampleRoutePassesPortR = R.sample.g.pts.some(q => Math.hypot(q[0] - pr[0], q[1] - pr[1]) < .6);
    const lanes = (V) => { sc.update(V); return host.querySelector('[data-l="lanes"]').innerHTML.split('class="lane"').length - 1; };
    const sim = FlashSim.create(); sim.jump([1, 2, 3]); sim.start(4); sim.tick(6);
    let V = sim.vm(6); out.stage4Lanes = lanes(V); V.valve.inlet = 0; out.stage4LanesInletClosed = lanes(V);
    const s2m = FlashSim.create(); s2m.jump([1]); s2m.start(2); s2m.tick(6); V = s2m.vm(6); out.stage2HoseConnected = V.vacHose; out.stage2VacLane = lanes(V);
    V.vacHose = 0; out.stage2VacLaneHoseOff = lanes(V);
    const s3 = FlashSim.create(); s3.jump([1, 2]); s3.start(3); s3.tick(4); V = s3.vm(4); sc.update(V);
    out.stage3PumpMarkup = host.querySelector('[data-l="vac"]').innerHTML.length;
    out.stage3SectionsSum = Math.abs(V.gaso2k + V.gaso1k - V.gasoVol) < 1e-9;
    const s4 = FlashSim.create(), bal = [];
    for (let n = 1; n <= 7; n++) { s4.start(n); s4.S.fClk = s4.S.fDur * .5; s4.tick(0); bal.push([n, s4.vm(0).balloon]); s4.S.fClk = s4.S.fDur; s4.tick(0); }
    out.vesselDuringStages = bal.map(x => x.join(':')).join(' ');
    const s5 = FlashSim.create(), ends = [];
    for (let n = 1; n <= 7; n++) { s5.start(n); s5.S.fClk = s5.S.fDur; s5.tick(0); const S = s5.S, W = s5.vm(0); ends.push([n, S.fPumpA, S.fFlashed, S.fOil, S.fGaso, S.fBalloon, S.fuP, W.bal.toFixed(1), W.gaso2k + '+' + W.gaso1k].join('/')); }
    out.stageEnds = ends; out.res = FlashSim.RES;
    return out;
  });
  console.log(JSON.stringify(r, null, 1), errs);
  await b.close();
})();
