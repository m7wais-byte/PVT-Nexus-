/* Geometry and process checks for the Flash equipment prototype (Playwright, headless Chromium).
   python3 -m http.server 8000   (repository root), then:  node prototypes/flash-unit/tools/verify.js */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(process.argv[2] || 'http://localhost:8000/prototypes/flash-unit/index.html'); await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const out = {}, FU = FlashUnit, G = FU.G;
    const sc = Scene.build(document.createElement('div'), 'system', {});
    const R = sc.routes, at = sc.Lo.fu, loc = (pt) => [(pt[0]-at.x)/at.s, (pt[1]-at.y)/at.s];
    const sEnd = loc(R.sample.g.end), gStart = loc(R.gas.g.start);
    const oilTopMax = FU.oilTop(40);
    out.sampleEndsAtTip = Math.abs(sEnd[0]-G.inlet.x)<0.5 && Math.abs(sEnd[1]-G.inlet.tip)<0.5;
    out.tipInsideFlaskAboveOil = G.inlet.tip > G.flask.neckBot && G.inlet.tip < oilTopMax;
    out.gasStartsAtOutletOpening = Math.abs(gStart[0]-G.outlet.x)<0.5 && Math.abs(gStart[1]-G.outlet.open)<0.5;
    out.outletInHeadspace = G.outlet.open < oilTopMax && G.outlet.open > G.head.insertBot;
    // sample route and gas route never share a point outside the flask (no upstream tee/shortcut)
    let minD = 1e9; R.sample.g.pts.forEach(a => R.gas.g.pts.forEach(c => { minD = Math.min(minD, Math.hypot(a[0]-c[0], a[1]-c[1])); }));
    out.minDistanceSampleVsGasRoute = +minD.toFixed(1);
    // gas route ends at the gasometer port / chamber
    const ga = sc.Lo.ga, gEnd = [(R.gas.g.end[0]-ga.x)/ga.s, (R.gas.g.end[1]-ga.y)/ga.s];
    out.gasEndsInGasometerChamber = Math.abs(gEnd[0]-Gasometer.G.W/2)<1 && gEnd[1] <= Gasometer.G.bore0 + 3;
    // tubing endpoints are anchored to ports
    const pr = PVTCellArt.port({at: sc.Lo.cell}, 'R');
    out.sampleRoutePassesPortR = R.sample.g.pts.some(q => Math.hypot(q[0]-pr[0], q[1]-pr[1]) < 0.6);
    // closed valve stops the lane: render lanes with the inlet valve forced closed in stage 4
    const sim = FlashSim.create(); sim.jump([1,2,3]); sim.start(4); sim.tick(5);
    const V = sim.vm(5); const host = document.createElement('div'); const s2 = Scene.build(host, 'system', {});
    s2.update(V); const open = host.querySelector('[data-l="lanes"]').innerHTML.split('class="lane"').length - 1;
    V.valve.inlet = 0; s2.update(V); const closed = host.querySelector('[data-l="lanes"]').innerHTML.split('class="lane"').length - 1;
    out.lanesWithInletOpen = open; out.lanesWithInletClosed = closed;
    // values match Main.js at the end of each stage
    const s3 = FlashSim.create(); const ends = [];
    for (let n = 1; n <= 7; n++) { s3.start(n); s3.S.fClk = s3.S.fDur; s3.tick(0); const S = s3.S; ends.push([n, S.fPumpA, S.fFlashed, S.fOil, S.fGaso, S.fBalloon, S.fuP, (200+S.fOil)].join('/')); }
    out.stageEnds = ends; out.res = FlashSim.RES;
    return out;
  });
  console.log(JSON.stringify(r, null, 1), errs);
  await b.close();
})();
