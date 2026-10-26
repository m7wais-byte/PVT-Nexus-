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
    const sEnd = loc(R.sample.g.end), gStart = loc(R.gas.g.start), oilTopMax = FU.oilTop(40), SH = FU.RT.shared;
    // ONE shared flask connection: the sample route ends at its open end, the gas route starts there
    out.sampleEndsAtSharedOpenEndInFlask = Math.abs(sEnd[0] - SH.x) < 3 && Math.abs(sEnd[1] - G.tip) < .5 && G.tip > G.flask.neckBot && G.tip < oilTopMax;
    out.gasOriginatesInFlaskAtSharedOpenEnd = Math.abs(gStart[0] - SH.x) < 3 && Math.abs(gStart[1] - G.tip) < .5;
    // the two routes overlap only inside the shared connection (x = SH.x, between the manifold and the open end)
    const nearShared = (q) => { const l = loc(q); return Math.abs(l[0] - SH.x) < 4 && l[1] >= SH.y0 - 10 && l[1] <= SH.y1 + 1; };
    let minD = 1e9; R.sample.g.pts.forEach(a => { if (nearShared(a)) return; R.gas.g.pts.forEach(c => { if (nearShared(c)) return; minD = Math.min(minD, Math.hypot(a[0] - c[0], a[1] - c[1])); }); });
    out.minDistOutsideSharedConnection = +minD.toFixed(1);
    // sample turns DOWN at the flask junction; it never continues along the manifold toward the Gasometer
    out.sampleNeverPastFlaskJunction = R.sample.g.pts.filter(q => q[1] < at.y + 200 * at.s).every(q => loc(q)[0] <= SH.x + 3);
    const ga = sc.Lo.ga, gEnd = [(R.gas.g.end[0] - ga.x) / ga.s, (R.gas.g.end[1] - ga.y) / ga.s], s2 = Gasometer.G.sec[0];
    out.gasEndsIn2000ccChamber = Math.abs(gEnd[0] - s2.cx) < 1 && Math.abs(gEnd[1] - Gasometer.G.ch0 - 4) < 1;
    const pr = PVTCellArt.port({ at: sc.Lo.cell }, 'R');
    out.sampleRoutePassesPortR = R.sample.g.pts.some(q => Math.hypot(q[0] - pr[0], q[1] - pr[1]) < .6);
    // Stage 2: evacuation covers the whole section; boundaries closed; balloon closed; nothing drawn from cell, balloon or chambers
    const s2v = FlashSim.create(); s2v.jump([1]); s2v.start(2); s2v.tick(6); const V2 = s2v.vm(6), vv = V2.valve;
    out.stage2Boundaries = { portR_pumpA: vv.pumpA, gasometerInlet: vv.gaso, balloon: vv.vessel, flask: vv.flask > .5, inlet: vv.inlet > .5, vac: vv.vac > .5 };
    const vl = R.vac.list, vends = vl.map(x => x.g.end), starts = vl.map(x => x.g.start);
    out.stage2AllBranchesEndAtPump = vends.every(e => Math.hypot(e[0] - vends[0][0], e[1] - vends[0][1]) < 1);
    const pr0 = PVTCellArt.port({ at: sc.Lo.cell }, 'R'), gv = [sc.Lo.ga.x + Gasometer.port.valve[0] * sc.Lo.ga.s, sc.Lo.ga.y + Gasometer.port.valve[1] * sc.Lo.ga.s];
    out.stage2StartsAtPortR = starts.some(q => Math.hypot(q[0] - pr0[0], q[1] - pr0[1]) < 1);
    out.stage2StartsAtGasometerInletValve = starts.some(q => Math.abs(q[1] - gv[1]) < 1 && gv[0] - q[0] > 0 && gv[0] - q[0] < 12);
    out.stage2StartsInFlask = starts.some(q => { const l = loc(q); return Math.abs(l[0] - FU.RT.shared.x) < 4 && Math.abs(l[1] - G.tip) < 1; });
    out.stage2NothingBeyondBoundaries = vl.every(x => x.g.pts.every(q => q[0] >= pr0[0] - 1 && q[0] <= gv[0]));
    // balloon connection: one vertical centreline (valve junction, straight tube, neck); Stage 2 stops at the closed valve
    const vr = R.vessel.g, vend = loc(vr.end), vlast = vr.pts.slice(-2).map(loc);
    out.balloonRouteStraightIntoNeck = vlast.every(q => Math.abs(q[0] - G.balT) < .5) && Math.abs(vend[0] - G.ves.x) < .5 && vend[1] > G.vesNeck && vend[1] < G.ves.y - Parts.VG.h + 10;
    out.stage2BalloonBranchStopsAtClosedValve = R.vac.list.every(x => x.g.pts.every(q => loc(q)[1] <= G.M + 1 || Math.abs(loc(q)[0] - G.balT) > 1 || loc(q)[1] < G.vesNeck - 40));
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
