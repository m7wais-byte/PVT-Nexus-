/* component: StageGC */
(function () {
// ===================== GC configuration =====================
const GC = {
  carrier: 'Helium', carrierSym: 'He', purity: '99.999%', head: 18,
  gas: {
    label: 'Gas Analysis', detector: 'TCD + FID',
    // dual channel (revised 2026-09-30): PACKED column -> TCD and CAPILLARY column -> FID, same GC oven.
    // Each channel has its own (simulated) peak list - see GAS CHROMATOGRAM MODEL below.
    // ch = channel each component is REPORTED from (non-HC from TCD, HC from FID).
    flow: 2.4, injT: 120,
    // GC oven programme (set by Mohammed 2026-09-30): 35 °C -> 325 °C reached at 75 min, linear ramp, no holds
    ovenStart: 35, ovenEnd: 325, runMin: 75, runMs: 60000, loopVol: '0.25 mL',
    program: { T0: 35, hold0: 0, rate: 290 / 75, T1: 325, hold1: 0 },
    inlet: '6-PORT GAS SAMPLING VALVE', method: 'METHOD · EXTENDED GAS (demo)',
    column: 'PACKED (→ TCD) + CAPILLARY (→ FID) COLUMN SET', yLabel: 'DETECTOR RESPONSE',
    // ---- gas-balloon oven + vacuum (values set by Mohammed, 2026-09-28) ----
    // balloon: 14.5 psia at ambient 25 °C = the Flash-stage balloon value; heated to Tset in a rigid
    // (constant-volume) vessel, so P = P0 x (T + 273.15) / (Tamb + 273.15). drawdown = fraction of balloon
    // pressure used by the injection (same 15 % draw-down the previous loop-fill logic used - illustrative).
    bal: { Tamb: 25, Tset: 80, P0: 14.5, drawdown: 0.15, unit: 'psia' },
    // flow path starts at atmospheric (14.7 psia, as the Flash Unit) and is evacuated to Pend
    vac: { P0: 14.7, Pend: 0.005, unit: 'psia' },
    // injection-pressure readout on the balloon oven (values set by Mohammed, 2026-09-29):
    // 14.7 at page open -> 0 during vacuuming -> held at 0 -> rises to 9 during gas injection -> held.
    // UNIT UNRESOLVED: 14.7 / 0 read like psia, 9 was given as psig - confirm before labelling the sequence psig.
    injP: { P0: 14.7, Pvac: 0, Pinj: 9, unit: 'psi' }
  },
  oil: {
    label: 'Oil Analysis', detector: 'Detector', flow: 1.8, injT: 300,
    ovenStart: 40, ovenEnd: 200, runMin: 34.0, runMs: 72000, injVol: '0.2 µL',
    program: { T0: 40, hold0: 2.0, rate: 18, T1: 200, hold1: 0.1 },
    split: 50,
    inlet: 'LIQUID INJECTION PORT · SEPTUM', method: 'METHOD · EXT. C36+ (demo)',
    column: 'COILED CAPILLARY COLUMN · 30 m', yLabel: 'DETECTOR RESPONSE'
  }
};

// ---- oven temperature programme: hold -> linear ramp -> final hold ----
function ovenRampEnd(c) {
  const p = c.program;
  return p ? p.hold0 + (p.T1 - p.T0) / p.rate : 0;
}
function ovenAt(c, t) {
  const p = c.program;
  if (!p) return c.ovenStart;
  if (t <= p.hold0) return p.T0;
  const re = ovenRampEnd(c);
  if (t >= re) return p.T1;
  return p.T0 + (t - p.hold0) * p.rate;
}

// mol% composition, response factors, retention times, display heights
// mol%, rf, names = existing project data (unchanged). Chromatographic values are ILLUSTRATIVE (simulated):
//   rtT / hT = packed column -> TCD retention time (min) / display height (mV)
//   rtF / hF = capillary column -> FID retention time / display height (pA); non-HC give no FID signal (hF 0)
//   rt = retention time on the REPORTED channel (table)
const GAS_COMPS = [
  { k:'N2',   name:'N₂ — Nitrogen',   f:'N₂',    mol:1.20,  rf:1.15, ch:'TCD', hc:false, rtT:2.10,  hT:30,  rtF:1.72,  hF:0,   c:'#8fa3c2' },
  { k:'CO2',  name:'CO₂',             f:'CO₂',   mol:2.00,  rf:1.10, ch:'TCD', hc:false, rtT:4.60,  hT:38,  rtF:1.98,  hF:0,   c:'#c9a227' },
  { k:'C1',   name:'C1 — Methane',    f:'CH₄',   mol:78.00, rf:1.00, ch:'FID', hc:true,  rtT:2.85,  hT:100, rtF:1.86,  hF:100, c:'#4d9dff' },
  { k:'C2',   name:'C2 — Ethane',     f:'C₂H₆',  mol:10.00, rf:0.97, ch:'FID', hc:true,  rtT:7.40,  hT:62,  rtF:2.34,  hF:72,  c:'#46d39a' },
  { k:'C3',   name:'C3 — Propane',    f:'C₃H₈',  mol:5.00,  rf:0.96, ch:'FID', hc:true,  rtT:13.20, hT:44,  rtF:3.25,  hF:58,  c:'#2fb3a3' },
  { k:'i-C4', name:'i-Butane',        f:'C₄H₁₀', mol:1.20,  rf:0.95, ch:'FID', hc:true,  rtT:19.10, hT:19,  rtF:4.72,  hF:27,  c:'#e7b15a' },
  { k:'n-C4', name:'n-Butane',        f:'C₄H₁₀', mol:1.40,  rf:0.95, ch:'FID', hc:true,  rtT:21.00, hT:21,  rtF:5.38,  hF:31,  c:'#e08a3c' },
  { k:'i-C5', name:'i-Pentane',       f:'C₅H₁₂', mol:0.40,  rf:0.94, ch:'FID', hc:true,  rtT:27.40, hT:10,  rtF:8.95,  hF:15,  c:'#c77dff' },
  { k:'n-C5', name:'n-Pentane',       f:'C₅H₁₂', mol:0.30,  rf:0.94, ch:'FID', hc:true,  rtT:29.60, hT:9,   rtF:10.20, hF:13,  c:'#a463f2' },
  { k:'C6+',  name:'C6 plus',         f:'C₆₊',   mol:0.50,  rf:0.93, ch:'FID', hc:true,  rtT:41.50, hT:7,   rtF:14.60, hF:22,  c:'#e0607e' }
];
GAS_COMPS.forEach(c => { c.rt = c.ch === 'TCD' ? c.rtT : c.rtF; c.h = c.ch === 'TCD' ? c.hT : c.hF; });

// mass% basis, molecular weight, response factors
const OIL_COMPS = [
  { k:'C1',     name:'C1',      mass:0.60,  mw:16,  rf:0.98, rt:0.70, h:14, c:'#4d9dff', g:'le'  },
  { k:'C2',     name:'C2',      mass:0.80,  mw:30,  rf:0.98, rt:1.10, h:18, c:'#46d39a', g:'le'  },
  { k:'C3',     name:'C3',      mass:1.30,  mw:44,  rf:0.98, rt:1.55, h:26, c:'#2fb3a3', g:'le'  },
  { k:'C4',     name:'C4',      mass:1.60,  mw:58,  rf:0.99, rt:2.05, h:30, c:'#6fc7f0', g:'le'  },
  { k:'C5',     name:'C5',      mass:2.20,  mw:72,  rf:0.99, rt:2.60, h:36, c:'#7f8ff2', g:'le'  },
  { k:'C6',     name:'C6',      mass:3.20,  mw:86,  rf:1.00, rt:3.30, h:40, c:'#9ad14f', g:'m'   },
  { k:'C7',     name:'C7',      mass:4.10,  mw:100, rf:1.00, rt:4.20, h:44, c:'#c9d24a', g:'m'   },
  { k:'C8',     name:'C8',      mass:4.60,  mw:114, rf:1.00, rt:5.10, h:46, c:'#e7b15a', g:'m'   },
  { k:'C9',     name:'C9',      mass:4.20,  mw:128, rf:1.00, rt:6.00, h:43, c:'#e08a3c', g:'m'   },
  { k:'C10',    name:'C10',     mass:4.00,  mw:142, rf:1.00, rt:7.00, h:41, c:'#d9663f', g:'m'   },
  { k:'C11-C15',name:'C11–C15', mass:16.50, mw:190, rf:1.01, rt:10.50,h:68, c:'#c77dff', g:'h1'  },
  { k:'C16-C20',name:'C16–C20', mass:14.00, mw:260, rf:1.02, rt:15.00,h:60, c:'#a463f2', g:'h1'  },
  { k:'C21-C25',name:'C21–C25', mass:11.50, mw:330, rf:1.03, rt:19.50,h:52, c:'#f0a3c0', g:'h2'  },
  { k:'C26-C30',name:'C26–C30', mass:9.40,  mw:400, rf:1.04, rt:23.50,h:44, c:'#e0607e', g:'h2'  },
  { k:'C31-C35',name:'C31–C35', mass:7.60,  mw:470, rf:1.05, rt:27.00,h:38, c:'#b8453f', g:'h2'  },
  { k:'C36+',   name:'C36+',    mass:14.40, mw:600, rf:1.06, rt:31.00,h:50, c:'#8fa3c2', g:'p'   }
];


// ===================== OIL chromatogram model (single timeline, shared with the results table) =====================
// Source of names, groups, retention times and areas = OIL_COMPS (same data results() reports).
// Peak SHAPES are illustrative: each peak/group integrates to its reported area, but widths, the split of a
// carbon-range group into sub-peaks, the baseline and the unnamed minor peaks are simulated for realism.
const OIL_WIN = { 'C11-C15':[8.3,12.7], 'C16-C20':[12.8,17.2], 'C21-C25':[17.4,21.6], 'C26-C30':[21.7,25.3], 'C31-C35':[25.4,28.6], 'C36+':[28.9,33.1] };
const oSigma = rt => 0.028 + 0.0035 * rt;                       // illustrative peak width (min)
const OIL_AREA = (() => { const raw = OIL_COMPS.map(c => c.mass * c.rf), sA = raw.reduce((a, v) => a + v, 0); const m = {}; OIL_COMPS.forEach((c, i) => { m[c.k] = raw[i] / sA * 100000; }); return m; })();
const frac = x => x - Math.floor(x);
const OIL_PEAKS = (() => {
  const pk = [];                                                // {t, s, A, own: component key or '' (synthetic)}
  OIL_COMPS.forEach(c => {
    const A = OIL_AREA[c.k], w = OIL_WIN[c.k];
    if (!w) { pk.push({ t: c.rt, s: oSigma(c.rt), A, own: c.k }); return; }
    const heavy = c.k === 'C36+';
    const hump = heavy ? 0.6 : 0.18, n = heavy ? 4 : 5, wts = heavy ? [.1,.1,.1,.1] : [.2,.19,.17,.14,.12];
    pk.push({ t: c.rt, s: (w[1] - w[0]) / 6, A: A * hump, own: c.k });              // unresolved envelope
    for (let j = 0; j < n; j++) {
      const t = w[0] + (j + 0.5) * (w[1] - w[0]) / n + (frac(Math.sin((j + 1) * 7.13 + c.rt) * 437.5) - 0.5) * 0.25;
      pk.push({ t, s: oSigma(t) * 1.1, A: A * wts[j], own: c.k });
    }
  });
  // unnamed minor peaks (deterministic; display only, excluded from composition)
  for (let k = 0; k < 44; k++) {
    const t = 0.95 + k * 0.72 + frac(Math.sin(k * 12.9898) * 43758.5) * 0.45;
    if (t > 32.6) break;
    if (OIL_COMPS.some(c => !OIL_WIN[c.k] && Math.abs(t - c.rt) < 0.22)) continue;
    const A = 90 + 520 * frac(Math.sin(k * 78.233) * 12345.6);
    pk.push({ t, s: oSigma(t) * 0.9, A, own: '' });
  }
  return pk;
})();
const O_DT = 0.004, O_N = Math.round(34.0 / O_DT) + 1;
const OIL_BASE = t => {
  const p = GC.oil.program, x = Math.max(0, (ovenAt(GC.oil, t) - p.T0) / (p.T1 - p.T0));
  return 1.1 + 2.6 * Math.pow(x, 1.5) + 0.18 * (Math.sin(t * 41) + Math.sin(t * 97 + 1.3) + Math.sin(t * 173 + 2.1)) / 3;
};
const OIL_SIG = (() => {                                        // precomputed detector trace, normalised to ~100 mV max peak
  const raw = new Float32Array(O_N);
  OIL_PEAKS.forEach(q => {
    const h = q.A / (q.s * 2.5066), i0 = Math.max(0, Math.floor((q.t - 5 * q.s) / O_DT)), i1 = Math.min(O_N - 1, Math.ceil((q.t + 5 * q.s) / O_DT));
    for (let i = i0; i <= i1; i++) { const u = i * O_DT - q.t; raw[i] += h * Math.exp(-u * u / (2 * q.s * q.s)); }
  });
  let mx = 0; for (let i = 0; i < O_N; i++) mx = Math.max(mx, raw[i]);
  const k = 100 / mx, out = new Float32Array(O_N);
  for (let i = 0; i < O_N; i++) out[i] = raw[i] * k + OIL_BASE(i * O_DT);
  return out;
})();
const oSigAt = t => { const i = Math.max(0, Math.min(O_N - 1, Math.round(t / O_DT))); return OIL_SIG[i]; };
const oMaxIn = (a, b) => { let m = 0; for (let i = Math.max(0, Math.floor(a / O_DT)); i <= Math.min(O_N - 1, Math.ceil(b / O_DT)); i++) m = Math.max(m, OIL_SIG[i]); return m; };
// elution windows used for detection, labels, integration and completion
const oWin = c => OIL_WIN[c.k] ? OIL_WIN[c.k] : [c.rt - 3 * oSigma(c.rt), c.rt + 3 * oSigma(c.rt)];
const oDet = c => oWin(c)[0];                                   // band front reaches the detector
const O_MINOR = OIL_PEAKS.filter(q => !q.own);

// ===================== GAS chromatogram model - two independent channels (2026-09-30) =====================
// TCD <- PACKED column: broader peaks, elution order N2, C1, CO2, C2, C3, iC4, nC4, iC5, nC5, C6+ (composite).
// FID <- CAPILLARY column: sharp hydrocarbon peaks; C6+ resolved into SIMULATED peaks (names shown for
// orientation only - the table still reports C6+ as one fraction). N2 / CO2 give no FID response.
// Everything below (retention times, widths, heights, baselines, minor peaks) is ILLUSTRATIVE.
const GD_DT = 0.005, GD_N = Math.round(GC.gas.runMin / GD_DT) + 1;
const gX = t => Math.max(0, Math.min(1, (ovenAt(GC.gas, t) - GC.gas.program.T0) / (GC.gas.program.T1 - GC.gas.program.T0)));
const gWig = (t, a) => a * (Math.sin(t * 5.3) * .5 + Math.sin(t * 13.7 + 1.1) * .3 + Math.sin(t * 41 + 2.3) * .2);
const TCD_BASE = t => 1.6 + 1.1 * Math.pow(gX(t), 1.4) + gWig(t, 0.12);            // slow drift with the ramp
const FID_BASE = t => 0.9 + 3.2 * Math.pow(gX(t), 2.6) + gWig(t, 0.08);            // column bleed at high temperature
const sigT = rt => 0.05 + 0.012 * rt;                                               // packed: wider, grows with rt
const sigF = rt => 0.016 + 0.0032 * rt;                                             // capillary: sharp
// capillary C6+ fraction (simulated): n-alkanes labelled, isomers / aromatics small
const FID_SUB = [
  { n:'n-C6', t:14.60, h:22 }, { n:'', t:15.72, h:7 }, { n:'', t:16.90, h:5.5 }, { n:'', t:17.60, h:8.5 },
  { n:'n-C7', t:20.30, h:17 }, { n:'', t:21.20, h:9.5 }, { n:'', t:23.10, h:8 },
  { n:'n-C8', t:25.70, h:12 }, { n:'', t:28.40, h:3.2 }, { n:'', t:28.90, h:4.6 }, { n:'', t:29.70, h:2.8 },
  { n:'n-C9', t:30.80, h:8 }, { n:'n-C10', t:35.60, h:5.6 }, { n:'n-C11', t:40.10, h:3.9 },
  { n:'n-C12', t:44.30, h:2.7 }, { n:'', t:48.30, h:1.8 }, { n:'', t:52.10, h:1.2 }, { n:'', t:55.70, h:0.8 }, { n:'', t:59.10, h:0.5 }
];
const FID_GRP = { 'C6+': [13.9, 61.0] };
// unnamed trace peaks between the main components (display only)
const FID_MINOR = (() => { const o = []; for (let k = 0; k < 36; k++) { const t = 3.8 + k * 1.62 + frac(Math.sin(k * 12.9898) * 43758.5) * 0.9; if (t > 62) break; if (GAS_COMPS.some(c => Math.abs(c.rtF - t) < 0.35) || FID_SUB.some(q => Math.abs(q.t - t) < 0.3)) continue; o.push({ t, h: 0.4 + 2.2 * frac(Math.sin(k * 78.233) * 12345.6) }); } return o; })();
function gBuild(peaks, base, tail) {
  const out = new Float32Array(GD_N);
  peaks.forEach(q => {
    if (!(q.h > 0)) return;
    const sR = q.s * tail, i0 = Math.max(0, Math.floor((q.t - 5 * q.s) / GD_DT)), i1 = Math.min(GD_N - 1, Math.ceil((q.t + 5 * sR) / GD_DT));
    for (let i = i0; i <= i1; i++) { const u = i * GD_DT - q.t, sg = u < 0 ? q.s : sR; out[i] += q.h * Math.exp(-u * u / (2 * sg * sg)); }
  });
  for (let i = 0; i < GD_N; i++) out[i] += base(i * GD_DT);
  return out;
}
const TCD_PEAKS = GAS_COMPS.map(c => ({ t: c.rtT, s: c.k === 'C6+' ? 1.3 : sigT(c.rtT), h: c.hT }));
const FID_PEAKS = GAS_COMPS.filter(c => c.hc && c.k !== 'C6+').map(c => ({ t: c.rtF, s: sigF(c.rtF), h: c.hF }))
  .concat(FID_SUB.map(q => ({ t: q.t, s: sigF(q.t), h: q.h })), FID_MINOR.map(q => ({ t: q.t, s: sigF(q.t), h: q.h })));
const TCD_SIG = gBuild(TCD_PEAKS, TCD_BASE, 1.45);                                  // packed peaks tail a little
const FID_SIG = gBuild(FID_PEAKS, FID_BASE, 1.12);
const gSigMax = (SIG, a, b) => { let m = 0; for (let i = Math.max(0, Math.floor(a / GD_DT)); i <= Math.min(GD_N - 1, Math.ceil(b / GD_DT)); i++) m = Math.max(m, SIG[i]); return m; };
// channel peak lists used by the charts (rt = that channel's retention time)
const TCD_LIST = GAS_COMPS.map(c => ({ k: c.k, name: c.name, rt: c.rtT, s: c.k === 'C6+' ? 1.3 : sigT(c.rtT), c: c.c, hc: c.hc }));
const FID_LIST = GAS_COMPS.filter(c => c.hc).map(c => ({ k: c.k, name: c.name, rt: c.rtF, s: sigF(c.rtF), c: c.c, hc: true }));
const gWinL = c2 => c2.k === 'C6+' && c2.s < 0.5 ? FID_GRP['C6+'] : [c2.rt - 3 * c2.s, c2.rt + 3.8 * c2.s];
const GAS_HC = GAS_COMPS.filter(c => c.hc);
// travelling bands in the columns: lead = how long before the peak maximum the band reaches the detector
const G_LEAD = 0.5, G_MIX = 0.35;

// ===================== GAS schematic geometry (revised 2026-09-30) =====================
// Layout: Helium cylinder -> Balloon oven (80 °C, gas bottle + BOTTLE OUTLET VALVE inside) -> 6-port gas
// sampling valve + external sample loop on the GC deck -> split tee -> packed column -> TCD | capillary -> FID.
// The GC drawing keeps its own coordinates, shifted as one group by GQ_DX; the balloon oven assembly by GQ_OX.
// Everything below is in absolute (drawing) coordinates unless marked local.
const GQ_DX = 266, GQ_OX = -732;
// 6-port valve: centre GV, port holes on radius 21, external fittings on radius 38. Port angles (deg, SVG):
//   P1 30 carrier in · P2 90 to columns · P3 150 loop end A · P4 210 sample in · P5 270 capped vent · P6 330 loop end B
// LOAD rotor channels  P1-P2 (carrier -> columns), P3-P4 (sample -> loop), P5-P6 (loop -> capped vent)
// INJECT (rotor +60°)  P6-P1 (carrier -> loop), P2-P3 (loop -> columns), P4-P5 (sample line dead-ended)
const GV = { x: 698, y: 170, rH: 24, rE: 42, rB: 34 };
const gvPt = (a, r) => [+(GV.x + r * Math.cos(a * Math.PI / 180)).toFixed(1), +(GV.y + r * Math.sin(a * Math.PI / 180)).toFixed(1)];
const gvArc = (a0, a1) => { const o = [], n = 10; for (let k = 0; k <= n; k++) o.push(gvPt(a0 + (a1 - a0) * k / n, GV.rH)); return o; };
const gvArcD = (a0, a1) => { const p0 = gvPt(a0, GV.rH), p1 = gvPt(a1, GV.rH); return 'M' + p0[0] + ' ' + p0[1] + ' A' + GV.rH + ' ' + GV.rH + ' 0 0 ' + (a1 > a0 ? 1 : 0) + ' ' + p1[0] + ' ' + p1[1]; };
const GV_PORTS = [30, 90, 150, 210, 270, 330].map((a, i) => ({ n: i + 1, a, h: gvPt(a, GV.rH), e: gvPt(a, GV.rE), f: gvPt(a, GV.rB + 3.5) }));
const E = i => GV_PORTS[i - 1].e, HP = i => GV_PORTS[i - 1].h;
const ptsD = P => 'M' + P.map(q => (+q[0]).toFixed(1) + ' ' + (+q[1]).toFixed(1)).join(' L');
const BV = { x: 316, y: 492 };                                    // bottle outlet valve (inside the balloon oven)
const GTEE = [520, 149];                                          // vacuum branch tee on the sample line
const GVV = { x: 520, y: 190 };                                   // vacuum valve (quarter-turn) on the branch
// bottle side of the bottle outlet valve (always holds bottle gas)
const SAMP_BOT_D = 'M326 536 H' + BV.x + ' V' + (BV.y + 10);
// sample line: bottle valve -> riser -> overhead run -> P4 fitting -> P4 port hole
const SLINE = [[BV.x, BV.y - 10], [BV.x, GTEE[1]], [E(4)[0], GTEE[1]], HP(4)];
// external sample loop: P3 fitting -> left riser (crosses OVER the sample line, no connection) -> serpentine -> P6
// the loop's left riser jumps over the sample line with a semicircular hop (no connection at the crossing)
const GHOP = (() => { const o = []; for (let k = 0; k <= 8; k++) { const a = (90 + 180 * k / 8) * Math.PI / 180; o.push([+(636 + 9 * Math.cos(a)).toFixed(1), +(GTEE[1] + 9 * Math.sin(a)).toFixed(1)]); } return o; })();
const LOOPX = [E(3), [636, E(3)[1]]].concat(GHOP, [[636, 84], [718, 84], [718, 97], [650, 97], [650, 110], [E(6)[0], 110], E(6)]);
const SLOOP = [HP(3)].concat(LOOPX, [HP(6)]);                    // P3 hole -> loop -> P6 hole (fill direction)
const SLOOP_D = ptsD(SLOOP), SLINE_D = ptsD(SLINE), LOOPX_D = ptsD(LOOPX);
// fill order in LOAD: line -> rotor channel P4->P3 -> loop -> rotor channel P6->P5 (capped)
const GFILL = SLINE.concat(gvArc(210, 150).slice(1), SLOOP.slice(1), gvArc(330, 270).slice(1));
const GFILL_P = (() => { const P = gPath(GFILL); const L1 = gPath(SLINE).L, LB = gPath(gvArc(210, 150)).L, LL = gPath(SLOOP).L;
  P.f1 = L1 / P.L; P.f2 = (L1 + LB) / P.L; P.f3 = (L1 + LB + LL) / P.L; P.fTee = (BV.y - 10 - GTEE[1] + GTEE[0] - BV.x) / P.L; return P; })();
// INJECT sweep: P1 -> rotor P1->P6 -> loop (reverse) -> P3 -> rotor P3->P2 -> P2 -> column head -> split tee
const GINJ = [HP(1)].concat(gvArc(30, -30).slice(1), SLOOP.slice().reverse().slice(1), gvArc(150, 90).slice(1), [E(2), [GV.x, 336]]);
const GINJ_P = (() => { const P = gPath(GINJ); P.fSlug = gPath([HP(1)].concat(gvArc(30, -30).slice(1), SLOOP.slice().reverse().slice(1))).L / P.L; return P; })();
// LOAD carrier inside the valve: P1 -> P2 -> column head (fixed, stator side)
const GCAR_D = 'M258 302 H260 Q270 302 270 292 V76 Q270 66 280 66 H760 Q770 66 770 76 V' + (E(1)[1] - 10) + ' Q770 ' + E(1)[1] + ' 760 ' + E(1)[1] + ' H' + E(1)[0];
const GSTUB_D = [1, 2, 3, 4, 6].map(i => 'M' + E(i)[0] + ' ' + E(i)[1] + ' L' + HP(i)[0] + ' ' + HP(i)[1]).join(' ');
// vacuum: both halves of the sample path drawn TOWARD the tee, then tee -> vacuum valve -> removable hose -> pump
const GVAC1_D = ptsD([[BV.x, BV.y - 10], [BV.x, GTEE[1]], GTEE]);
const GVAC2_D = ptsD([HP(5)].concat(gvArc(270, 330).slice(1), SLOOP.slice().reverse().slice(1), gvArc(150, 210).slice(1), [E(4), GTEE]));
const GVAC_BR_D = 'M' + GTEE[0] + ' ' + GTEE[1] + ' V216';                    // fixed branch (tee -> valve -> hose union)
const GVAC_HOSE_D = 'M520 216 C520 232 506 234 506 250';                      // removable hose (shown with the pump)
const GTAP_D = 'M' + BV.x + ' 407 H412';                                      // injection-pressure transducer tap on the sample line

const PHASES = ['System Preparation','Sample','Injection','Oven & Column','Detector','Live Chromatogram','Results'];

const EDU = [
  'Carrier gas transports the sample through the column.',
  'Components interact differently with the stationary phase.',
  'Different retention produces separation.',
  'Separated components move toward the detector.'
];

const INFO = [
  { k:'CARRIER GAS', t:'Inert gas (helium here) that transports the sample through the column. It does not react with the sample.' },
  { k:'MOBILE PHASE', t:'The moving carrier gas stream that carries sample components along the column.' },
  { k:'STATIONARY PHASE', t:'Thin liquid film bonded to the inner column wall. Components dissolve into and out of it as they travel.' },
  { k:'RETENTION TIME', t:'Time from injection to peak maximum. It identifies a component only after calibration with a known standard.' },
  { k:'TCD', t:'Thermal conductivity detector — universal, suited to permanent and non-hydrocarbon gases such as N₂ and CO₂.' },
  { k:'FID', t:'Flame ionization detector — hydrogen/air flame ionizes hydrocarbons; response is proportional to carbon mass.' },
  { k:'PEAK AREA', t:'Integrated area under a peak. It represents quantity only after the component response factor is applied.' },
  { k:'RESPONSE FACTOR', t:'Calibration factor converting detector area into amount for each component.' },
  { k:'SAMPLE LOOP', t:'Fixed-volume tube in the sampling valve. It isolates a repeatable gas volume for every injection.' }
];

// column centre-line polyline (matches the drawn coil path)
const COL = [[498,292],[498,346],[512,360],[828,360],[843,378],[843,392],[828,410],[512,410],[497,428],[497,442],[512,460],[846,460],[860,446],[860,290]];
const COL_LEN = (() => { let t = 0; const seg = []; for (let i = 1; i < COL.length; i++) { const d = Math.hypot(COL[i][0]-COL[i-1][0], COL[i][1]-COL[i-1][1]); seg.push(d); t += d; } COL.seg = seg; return t; })();
function colPt(f) {
  const target = Math.max(0, Math.min(1, f)) * COL_LEN;
  let acc = 0;
  for (let i = 0; i < COL.seg.length; i++) {
    if (acc + COL.seg[i] >= target || i === COL.seg.length - 1) {
      const t = COL.seg[i] ? (target - acc) / COL.seg[i] : 0;
      return [COL[i][0] + (COL[i+1][0]-COL[i][0]) * t, COL[i][1] + (COL[i+1][1]-COL[i][1]) * t];
    }
    acc += COL.seg[i];
  }
  return COL[COL.length-1];
}

const PEAK_W = 0.26;        // fixed gaussian width (min)
const PEAK_LEAD = 0.57;     // band enters the detector 2.2σ before peak maximum
const MIX_T = 0.12;         // components travel together as a mixture until this time
const MIX_F = 0.04;         // fraction of the column covered while still mixed
const DET_X = 880, DET_Y = 146;

// oil column centre-line: injection port → coil → upper outlet → detector
const OCOILP = [630,250,629.8,257.8,629.2,265.6,628.4,273.4,627.4,281.2,626.2,289,624.9,296.9,623.7,305,622.5,313.2,621.5,321.7,620.6,330.4,620.1,339.4,619.9,348.7,620.1,358.4,620.8,368.5,622.1,379,624,390,631,384.3,637.8,369.2,646.6,355.2,657.3,342.6,669.8,331.7,683.6,322.7,698.6,315.7,714.5,310.9,730.8,308.4,747.4,308.3,763.7,310.6,779.6,315.1,794.7,321.9,808.6,330.8,821.2,341.5,832.1,353.9,841.1,367.8,848,382.7,852.7,398.5,855.2,414.8,855.2,431.3,853,447.6,848.4,463.5,841.6,478.5,832.8,492.3,822.1,504.8,809.7,515.6,795.9,524.6,781,531.4,765.3,536.1,749.1,538.5,732.7,538.5,716.5,536.3,700.8,531.7,685.9,525,672.1,516.2,659.8,505.5,649.1,493.2,640.2,479.5,633.4,464.7,628.8,449.1,626.5,433,626.4,416.8,628.7,400.7,633.3,385.1,640,370.4,648.7,356.8,659.3,344.5,671.5,333.9,685,325.2,699.7,318.5,715.1,314,731.1,311.7,747.1,311.7,763,313.9,778.4,318.4,793,325.1,806.4,333.8,818.5,344.2,829,356.3,837.6,369.7,844.2,384.2,848.7,399.5,850.9,415.2,850.9,431,848.6,446.7,844.1,461.9,837.5,476.3,829,489.5,818.7,501.4,806.7,511.7,793.5,520.2,779.2,526.7,764.2,531,748.7,533.2,733.1,533.2,717.6,530.9,702.7,526.5,688.6,520,675.5,511.6,663.8,501.4,653.7,489.7,645.4,476.6,639.1,462.6,634.8,447.8,632.6,432.5,632.7,417.2,634.9,402,639.3,387.3,645.7,373.5,654,360.7,664,349.2,675.6,339.3,688.4,331.2,702.2,324.9,716.7,320.8,731.6,318.7,746.7,318.8,761.6,321,775.9,325.3,789.5,331.6,802.1,339.7,813.3,349.6,823,360.9,830.9,373.4,837,386.9,841.1,401.2,843.1,415.8,843,430.5,840.8,445.1,836.6,459.2,830.4,472.4,822.4,484.7,812.8,495.7,801.7,505.1,789.5,512.9,776.2,518.8,762.3,522.8,748,524.7,733.6,524.6,719.4,522.5,705.7,518.3,692.7,512.3,680.7,504.5,670.1,495.1,660.8,484.2,653.3,472.3,647.5,459.3,643.6,445.8,641.8,431.8,641.9,417.8,644,403.9,648,390.5,654,377.9,661.6,366.3,670.8,355.9,681.3,346.9,693,339.5,705.6,333.9,718.8,330.2,732.4,328.4,746.1,328.5,759.5,330.6,772.6,334.5,784.8,340.3,796.2,347.7,806.3,356.7,815,366.9,822.1,378.3,827.6,390.6,831.2,403.4,832.9,416.6,832.8,429.9,830.8,443,826.9,455.6,821.3,467.6,814.1,478.5,805.4,488.3,795.4,496.8,784.3,503.7,772.5,509,760,512.5,747.2,514.2,734.3,514,721.6,512,709.3,508.3,697.8,502.8,687.1,495.8,677.6,487.4,669.5,477.7,662.8,467,657.7,455.4,654.3,443.4,652.7,430.9,652.8,418.5,654.8,406.2,658.4,394.3,663.7,383.1,670.5,372.8,678.7,363.7,688.1,355.8,698.4,349.3,709.6,344.4,721.3,341.1,733.3,339.6,745.4,339.7,757.2,341.6,768.7,345.1,779.5,350.3,789.4,356.9,798.3,364.8,805.9,373.8,812.2,383.8,816.9,394.6,820,405.9,821.5,417.5,821.4,429.2,819.5,440.6,816.1,451.7,811.2,462.1,804.8,471.7,797.2,480.3,788.4,487.6,778.7,493.6,768.3,498.2,757.4,501.2,746.3,502.6,735,502.5,724,500.7,713.3,497.4,703.2,492.6,694,486.5,685.8,479.1,678.7,470.7,672.9,461.3,668.5,451.3,665.6,440.8,664.3,430,664.4,419.2,666.1,408.5,669.3,398.3,674,388.6,679.9,379.7,687,371.8,695.1,365,704.1,359.4,713.7,355.2,723.8,352.4,734.2,351.1,744.6,351.3,754.9,352.9,764.7,356,774,360.5,782.6,366.2,790.2,373,796.7,380.8,802.1,389.5,806.1,398.7,808.8,408.5,810.1,418.4,809.9,428.4,808.3,438.3,805.3,447.8,801.1,456.7,795.6,464.9,789,472.2,781.5,478.5,773.2,483.7,764.3,487.5,754.9,490.1,745.4,491.3,735.7,491.1,726.3,489.6,717.2,486.8,708.6,482.7,700.7,477.4,693.7,471.1,687.6,463.9,682.7,455.9,679,447.3,676.5,438.3,675.3,429.1,675.5,419.9,677,410.8,679.7,402.1,683.7,393.8,688.7,386.2,694.8,379.5,701.7,373.7,709.4,369,717.6,365.4,726.2,363,735.1,361.9,743.9,362.1,752.7,363.5,761.1,366.1,769,369.9,776.3,374.7,782.7,380.6,788.3,387.2,792.9,394.6,796.3,402.5,798.6,410.8,799.7,419.3,799.5,427.8,798.2,436.2,795.6,444.2,792,451.9,787.3,458.9,781.7,465.1,775.3,470.4,768.3,474.8,760.7,478.1,752.7,480.3,744.6,481.4,736.4,481.2,728.3,479.9,720.5,477.5,713.2,474,706.5,469.5,700.5,464.2,695.3,458,691.1,451.2,687.9,443.9,685.8,436.2,684.8,428.4,684.9,420.5,686.1,412.7,688.5,405.2,691.8,398.2,696.1,391.7,701.3,385.9,707.2,380.9,713.8,376.9,720.8,373.8,728.2,371.7,735.8,370.8,743.4,370.9,750.9,372,758.1,374.3,764.9,377.5,771.2,381.7,776.8,386.6,781.6,392.4,785.5,398.7,788.5,405.5,790.5,412.6,791.5,419.9,791.4,427.3,790.2,434.5,788.1,441.5,785,448.1,781,454.2,776.2,459.6,770.7,464.3,764.5,468.1,758,471,751.1,473,744,473.9,736.8,473.8,729.8,472.7,723,470.7,716.6,467.7,710.7,463.8,705.4,459.1,700.9,453.8,697.1,447.9,694.3,441.5,692.4,434.8,691.4,427.9,691.5,420.9,692.5,414.1,694.5,407.4,697.4,401.2,701.2,395.4,705.7,390.3,710.9,385.8,716.7,382.1,722.9,379.3,729.5,377.5,736.2,376.5,743,376.6,749.7,377.5,756.2,379.5,762.3,382.3,768,386,773.1,390.4,777.5,395.5,781.1,401.1,783.8,407.3,785.7,413.7,786.7,420.3,786.6,427,785.7,433.6,783.8,439.9,781,446,777.5,451.6,773.1,456.6,768.1,460.9,762.5,464.5,756.5,467.3,750.2,469.2,743.7,470.1,737.1,470.1,730.5,469.2,724.2,467.4,718.2,464.7,712.7,461.1,707.7,456.8,703.3,451.9,699.8,446.4,697,440.4,695.1,434.1,694.1,427.6,694.1,421.1,695,414.6,696.8,408.3,706.5,396.9,716.6,386.9,726.8,378,737.2,370.1,747.6,363.2,758.1,357,768.5,351.5,778.9,346.5,789.1,341.8,799.1,337.4,808.8,333.2,818.1,328.9,827.1,324.5,835.6,319.9,843.6,314.8,851,309.2,857.8,303,863.8,296,869.2,288,873.7,279.1,877.3,268.9,879.9,257.5,881.6,244.6,882.2,230.1,881.7,214,880,196];
const OCOIL = (() => { const p = []; for (let i = 0; i < OCOILP.length; i += 2) p.push([OCOILP[i], OCOILP[i+1]]); return p; })();
const OCOIL_D = 'M' + OCOIL.map(p => p[0] + ' ' + p[1]).join(' L');
const OSEG = [];
const OLEN = (() => { let t = 0; for (let i = 1; i < OCOIL.length; i++) { const d = Math.hypot(OCOIL[i][0]-OCOIL[i-1][0], OCOIL[i][1]-OCOIL[i-1][1]); OSEG.push(d); t += d; } return t; })();
function ocolPt(f) {
  const target = Math.max(0, Math.min(1, f)) * OLEN;
  let acc = 0;
  for (let i = 0; i < OSEG.length; i++) {
    if (acc + OSEG[i] >= target || i === OSEG.length - 1) {
      const t = OSEG[i] ? (target - acc) / OSEG[i] : 0;
      return [OCOIL[i][0] + (OCOIL[i+1][0]-OCOIL[i][0]) * t, OCOIL[i][1] + (OCOIL[i+1][1]-OCOIL[i][1]) * t];
    }
    acc += OSEG[i];
  }
  return OCOIL[OCOIL.length-1];
}
// ---- oil instrument view: one GC housing, circular coil hung in front of the rear oven fan ----
// centre-line: inlet liner -> down through the oven ceiling -> tight circular coil (r 150 -> 120) -> up to the detector
const NCX = 582, NCY = 520, NR0 = 150, NR1 = 120, NTH0 = 180, NTH1 = -10 - 360 * 5;
const NDET_X = 730, NDET_Y = 164;
const NCOIL = (() => {
  const p = [[432, 244], [432, 292], [432, 400], [432, NCY]];
  const span = NTH0 - NTH1, step = 2.5;
  for (let a = NTH0 - step; a > NTH1 - 0.01; a -= step) {
    const r = NR0 - (NR0 - NR1) * (NTH0 - a) / span, t = a * Math.PI / 180;
    p.push([NCX + r * Math.cos(t), NCY + r * Math.sin(t)]);
  }
  // outlet lead leaves the coil tangentially and rises to the detector fitting
  const t1 = NTH1 * Math.PI / 180, e = p[p.length - 1];
  const P0 = e, P1 = [e[0] + 60 * Math.sin(t1), e[1] - 60 * Math.cos(t1)], P2 = [NDET_X, 372], P3 = [NDET_X, 292];
  for (let k = 1; k <= 24; k++) {
    const u = k / 24, v = 1 - u, b0 = v*v*v, b1 = 3*v*v*u, b2 = 3*v*u*u, b3 = u*u*u;
    p.push([b0*P0[0] + b1*P1[0] + b2*P2[0] + b3*P3[0], b0*P0[1] + b1*P1[1] + b2*P2[1] + b3*P3[1]]);
  }
  p.push([NDET_X, NDET_Y + 17]);
  return p.map(q => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]);
})();
const NCOIL_D = 'M' + NCOIL.map(q => q[0] + ' ' + q[1]).join(' L');
const NSEG = [];
const NLEN = (() => { let t = 0; for (let i = 1; i < NCOIL.length; i++) { const d = Math.hypot(NCOIL[i][0]-NCOIL[i-1][0], NCOIL[i][1]-NCOIL[i-1][1]); NSEG.push(d); t += d; } return t; })();
function ncolPt(f) {
  const target = Math.max(0, Math.min(1, f)) * NLEN;
  let acc = 0;
  for (let i = 0; i < NSEG.length; i++) {
    if (acc + NSEG[i] >= target || i === NSEG.length - 1) {
      const t = NSEG[i] ? (target - acc) / NSEG[i] : 0;
      return [NCOIL[i][0] + (NCOIL[i+1][0]-NCOIL[i][0]) * t, NCOIL[i][1] + (NCOIL[i+1][1]-NCOIL[i][1]) * t];
    }
    acc += NSEG[i];
  }
  return NCOIL[NCOIL.length-1];
}
// ===================== GAS dual-channel column set (revised 2026-09-30) =====================
// One oven, two columns, two detectors. The injected slug leaves the 6-port valve (P2), reaches a SPLIT TEE at the
// column head and divides:  PACKED column (upper-left, thick stainless) -> TCD  |  CAPILLARY column (lower-right,
// thin fused silica) -> FID.  Local GC-drawing coordinates (the whole GC group is shifted by GQ_DX in the template).
const GSPLIT = [432, 336];                                              // split tee at the column head
const GTCD = { x: 730, y: 164 }, GFID = { x: 870, y: 168 };            // detector cells
const gBez = (P0, P1, P2, P3, n) => { const o = []; for (let k = 1; k <= n; k++) { const u = k / n, v = 1 - u; o.push([v*v*v*P0[0] + 3*v*v*u*P1[0] + 3*v*u*u*P2[0] + u*u*u*P3[0], v*v*v*P0[1] + 3*v*v*u*P1[1] + 3*v*u*u*P2[1] + u*u*u*P3[1]]); } return o; };
const gSpiral = (cx, cy, r0, r1, a0, a1, step) => {                     // a0 -> a1 (deg), radius r0 -> r1
  const o = [], n = Math.max(2, Math.round(Math.abs(a1 - a0) / step));
  for (let k = 1; k <= n; k++) { const a = a0 + (a1 - a0) * k / n, r = r0 + (r1 - r0) * k / n, t = a * Math.PI / 180; o.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
  return o;
};
const GHEAD0 = [432, GV.y + GV.rE];                                     // P2 fitting (local x 432 = absolute 698)
// packed: thick stainless tube, 2 open turns (r 72 -> 46), clockwise from the top; outlet rises to the TCD
const GPAK_C = { x: 528, y: 450, r0: 72, r1: 46 };
const GPAK = (() => {
  const p = [GHEAD0.slice(), GSPLIT.slice(), [470, 336]];
  p.push(...gBez([470, 336], [500, 336], [500, 372], [GPAK_C.x, GPAK_C.y - GPAK_C.r0], 10));
  const iCoil = p.length - 1;
  p.push(...gSpiral(GPAK_C.x, GPAK_C.y, GPAK_C.r0, GPAK_C.r1, -90, -90 + 360 * 2, 3));
  const e = p[p.length - 1];
  p.push(...gBez(e, [e[0] + 72, e[1]], [GTCD.x, 424], [GTCD.x, 340], 18));
  p.push([GTCD.x, 292], [GTCD.x, GTCD.y + 17]);
  p.iCoil = iCoil; return p;
})();
// capillary: thin fused-silica coil, 4.25 tight turns (r 64 -> 36), counter-clockwise from the bottom; outlet up the
// right wall, out through the oven ceiling, along the deck to the FID
const GCAP_C = { x: 660, y: 614, r0: 64, r1: 36 };
const GCAP = (() => {
  const p = [GHEAD0.slice(), GSPLIT.slice(), [432, 650]];
  p.push(...gBez([432, 650], [432, 670], [440, 678], [470, 678], 6));
  p.push([GCAP_C.x, GCAP_C.y + GCAP_C.r0]);
  const iCoil = p.length - 1;
  p.push(...gSpiral(GCAP_C.x, GCAP_C.y, GCAP_C.r0, GCAP_C.r1, 90, 90 - 360 * 4.25, 3.5));
  const e = p[p.length - 1];
  p.push(...gBez(e, [e[0], e[1] - 56], [760, 592], [760, 540], 14));
  p.push([760, 236]);
  p.push(...gBez([760, 236], [760, 226], [764, 222], [774, 222], 4));
  p.push([858, 222]);
  p.push(...gBez([858, 222], [866, 222], [870, 218], [870, 210], 4));
  p.push([GFID.x, GFID.y + 8]);
  p.iCoil = iCoil; return p;
})();
function gPath(P) {
  const seg = []; let L = 0; const cum = [0];
  for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i-1][0], P[i][1] - P[i-1][1]); seg.push(d); L += d; cum.push(L); }
  const at = f => {
    const tg = Math.max(0, Math.min(1, f)) * L; let acc = 0;
    for (let i = 0; i < seg.length; i++) { if (acc + seg[i] >= tg || i === seg.length - 1) { const t = seg[i] ? (tg - acc) / seg[i] : 0; return [P[i][0] + (P[i+1][0] - P[i][0]) * t, P[i][1] + (P[i+1][1] - P[i][1]) * t]; } acc += seg[i]; }
    return P[P.length - 1];
  };
  const d = 'M' + P.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L');
  return { at, L, d, cum, fCoil: P.iCoil == null ? 0 : cum[P.iCoil] / L, fSplit: cum[1] / L };
}
const GCAP_P = gPath(GCAP), GPAK_P = gPath(GPAK);
const GHEAD_D = 'M432 ' + GHEAD0[1] + ' L' + GSPLIT[0] + ' ' + GSPLIT[1];          // valve P2 -> split tee (shared)
const GCAP_D = GCAP_P.d, GPAK_D = GPAK_P.d;

// deterministic travel: one shared clock, mixed start, then component-specific speed
function bandF(rt, t, idx, lead, mixT) {
  const L = lead == null ? PEAK_LEAD : lead;
  const M = mixT == null ? MIX_T : mixT;
  const arrive = rt - L;
  if (t <= 0) return 0;
  const f = t <= M
    ? MIX_F * (t / M)
    : Math.min(1, MIX_F + (1 - MIX_F) * (t - M) / Math.max(0.01, arrive - M));
  const decay = Math.max(0, 1 - t / (M * 5));   // compact mixed group at the start
  return Math.max(0, f - (idx || 0) * 0.008 * decay);
}
// same band behaviour for both phases, scaled to the run length of the method
const REF_RUN = 11.0;   // reference run length the band timing was tuned on (keeps gas timing unchanged)
function leadOf(c) { return PEAK_LEAD * (c.runMin / REF_RUN); }
function mixTOf(c) { return MIX_T * (c.runMin / REF_RUN); }

// ---- oil mode: automatic liquid sampler (schematic geometry) ----
// tray centre / ring radii, 12 positions, vial 3 is the oil sample; syringe tip heights (ready, in vial, in inlet)
const AS = { cx: 534, cy: 162, R: 62, r: 20, n: 12, sel: 3, vials: [1,2,3,4,5,6,7,8,9,10],
             X_VIAL: 534, X_INJ: 432, READY: 116, VIAL_DIP: 176, INJ_DIP: 198, FILL_PX: 10 };
const AS_ROT = (AS.sel - 1) * 360 / AS.n;          // tray rotation that brings the selected vial to the sampling position
// ---- oil mode: helium supply gauges — ILLUSTRATIVE values (not from the method) ----
const HE = { cyl: 2000, cylMax: 3000, out: 80, outMax: 100 };

const S0 = {
  cur: 0, done: {}, busy: false, auto: false, paused: false,
  reg: 0, carrier: false, flow: 0, flowStable: false, inlet: '',
  injT: null, ovenT: null, det: '', hl: '',
  rdy: { flow:false, inj:false, oven:false, det:false, base:false },
  conn: false, connGrow: 0, purging: false, purged: false, loopFill: 0, valve: 'LOAD',
  injected: false, plug: 0, vialOpen: false, vialShow: false, syrShow: false, syrX: 116, syrY: 24, syrFill: 0, drop: 0, vapor: 0,
  flowSet: 0, cylV: 0, flowIn: 0, trayRot: 0, asSel: false, asX: AS.X_VIAL, asTip: AS.READY, asFill: 0,
  runMin: 0, running: false, nDet: 0, pulse: null, detK: null, detC: null, complete: false, results: false,
  hover: null, edu: '', ds: 'idle', dsSub: '', dsBar: 0, chromBig: false, zv: null, resTab: 'chrom',
  // gas: vacuum, balloon oven, sample injection, carrier sweep
  vacOn: false, vacDone: false, lineP: null, heat: 0, heatOn: false, heatDone: false, balT: null, injP: null,
  sFill: 0, sFlow: false, sweep: 0,
  // gas: removable vacuum pump + isolation valve, sample injection valve (0 = OFF, 1 = ON)
  pumpShow: 0, pumpRun: false, vvOpen: 0, isoDone: false, ivOn: 0, heFront: false,
  // gas dual channel: FID detection event + selected chromatogram channel (TCD | FID)
  fpulse: null, fidK: null, fidC: null, gch: 'TCD',
  // gas (2026-09-30): bottle outlet valve 0 = closed .. 1 = open, loop loaded, FID detections
  bvOpen: 0, loaded: false, nDetF: 0
};
// gas mode starts with the GC oven at its method initial temperature (35 °C) and the balloon oven already at 80 °C
const GAS0 = () => ({ ovenT: GC.gas.ovenStart, injT: GC.gas.injT, det: 'Standby', balT: GC.gas.bal.Tset, heat: 1, heatDone: true, injP: GC.gas.injP.P0, lineP: GC.gas.vac.P0 });

class Component extends DCLogic {
  state = Object.assign({ mode: '', status: 'Select the sample phase to begin compositional analysis.', chromAll: false }, S0);

  // ---------- paused-aware scheduler ----------
  clock = 0; jobs = []; waits = []; raf = null;
  // rAF drives the clock when visible; a timer watchdog keeps it alive when frames are throttled
  schedule() { this.raf = true; this.rafId = requestAnimationFrame(this.tick); this.toId = setTimeout(this.tick, 40); }
  clearHandles() { if (this.rafId) cancelAnimationFrame(this.rafId); if (this.toId) clearTimeout(this.toId); this.rafId = null; this.toId = null; this.raf = null; }
  ensureLoop() { if (this.raf) return; this.last = performance.now(); this.schedule(); }
  tick = () => {
    this.clearHandles();
    const now = performance.now();
    const dt = Math.min(50, now - this.last); this.last = now;
    if (!this.state.paused) {
      this.advanceClock(dt);
    }
    if (this.jobs.length || this.waits.length) this.schedule();
  };
  /* one step of the process clock (split out of tick so the procedure panel can run a step
     to completion instantly: ffAll) */
  advanceClock(dt) {
    this.clock += dt / PSM();   // process clock runs at 1/multiplier of real time
    const keep = [];
    this.jobs.forEach(j => {
      const p = Math.min(1, (this.clock - j.t0) / j.dur);
      j.apply(j.lin ? p : (p < .5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2));
      if (p < 1) keep.push(j); else if (j.done) this.waits.push({ due: this.clock, fn: j.done });
    });
    this.jobs = keep;
    if (this.waits.length) {
      const due = this.waits.filter(w => w.due <= this.clock);
      this.waits = this.waits.filter(w => w.due > this.clock);
      due.forEach(w => w.fn());
    }
  }
  ffAll() {
    let g = 0;
    while ((this.jobs.length || this.waits.length) && g++ < 200000) this.advanceClock(50 * PSM());
    this.clearHandles();
  }

  tw(dur, apply, done, lin) { this.jobs.push({ t0: this.clock, dur, apply, done, lin: !!lin }); this.ensureLoop(); }
  wait(ms, fn) { this.waits.push({ due: this.clock + ms, fn }); this.ensureLoop(); }
  stopAll() { this.jobs = []; this.waits = []; this.clearHandles(); }
  componentWillUnmount() { this.stopAll(); }

  cfg() { return this.state.mode === 'oil' ? GC.oil : GC.gas; }
  comps() { return this.state.mode === 'oil' ? OIL_COMPS : GAS_COMPS; }

  // ---------- step table ----------
  steps() {
    const m = this.state.mode; if (!m) return [];
    const prep = [
      { id:'carrier', ph:0, name:'Activate Carrier Gas', btn:'Activate Carrier Gas' },
      { id:'flow',    ph:0, name:'Establish Carrier Flow', btn:'Establish Carrier Flow' },
      { id:'cond',    ph:0, name:'Condition GC System', btn:'Condition GC System' }
    ];
    if (m === 'gas') return [
      { id:'carrier', ph:0, name:'Establish Carrier-Gas Flow', btn:'Establish Carrier Flow',
        w:'Helium must be flowing and stable through both analytical paths before anything else happens: the columns are then protected from air and vacuum, both detectors reach a stable baseline, and the carrier is ready to sweep the sample the moment the valve is switched.',
        e:'Cylinder valve opens, the regulator outlet pressure rises and the flow controller is set to 2.40 mL/min. With the 6-port valve in LOAD, helium enters port 1 and leaves port 2 straight to the split tee — it BYPASSES the sample loop — then sweeps the packed column → TCD and the capillary column → FID. TCD filament on, FID flame lit, baselines stable.' },
      { id:'vac', ph:1, name:'Evacuate Sample Line and Loop', btn:'Evacuate Sample Line',
        w:'Air in the sample line and loop would dilute the sample and show up as N₂. Only the sample path is evacuated: the bottle outlet valve stays CLOSED so the bottle contents are not drawn off, and in LOAD position the carrier channel (port 1 → 2) is separate, so the helium line and both columns never see vacuum.',
        e:'Vacuum pump connected to the branch tee, vacuum valve OPEN. Evacuation runs from the closed bottle outlet valve along the sample line into port 4, through the valve to the sample loop and on to the capped vent port 5. Injection pressure falls to 0. Helium keeps flowing to the columns on its own path.' },
      { id:'iso', ph:1, name:'Isolate the Vacuum', btn:'Close Vacuum Valve',
        w:'The vacuum valve is closed before any sample is admitted. With it closed nothing can flow toward the pump, so the sample that enters next stays in the sample line and loop.',
        e:'Vacuum valve handle turns across the pipe: CLOSED. The pump stops and its hose is removed; the fixed branch and the closed valve stay on the line and remain closed for loading, injection and analysis.' },
      { id:'load', ph:1, name:'Load the Sample Loop', btn:'Open Bottle Valve',
        w:'Opening the bottle outlet valve lets the heated (80 °C) gas expand into the evacuated line and fill the sample loop with a fixed, repeatable volume. The valve is still in LOAD, so the loop is NOT connected to the carrier stream: no sample reaches the columns yet.',
        e:'Bottle outlet valve OPEN — sample gas flows up the sample line, through valve ports 4 → 3 into the sample loop, and on to the capped port 5. Injection pressure rises to 9. Vacuum valve stays CLOSED; helium still bypasses the loop (port 1 → 2).' },
      { id:'ginj', ph:2, name:'Inject the Sample', btn:'Switch Valve to INJECT',
        w:'Switching the valve puts the loop into the carrier stream. The helium that was already flowing now pushes the measured 0.25 mL out of the loop to the column head, where the split tee divides it between the packed and capillary columns. Injection is refused until carrier flow is stable and the vacuum valve is closed.',
        e:'Rotor turns 60° from LOAD to INJECT: helium enters port 1 → port 6 → through the loop → port 3 → port 2 → split tee. The sample slug leaves the loop and splits into both columns. The sample line is now dead-ended at the capped port 5.' },
      { id:'run', ph:3, name:'Separation and Detection', btn:'Start Temperature Programme',
        w:'Both columns sit in the same GC oven, programmed from 35 °C to 325 °C over 75 min (the balloon oven stays at 80 °C). The packed column feeds the TCD, which responds to every component; the capillary column feeds the FID, which responds only to hydrocarbons. Each channel therefore gives its own chromatogram with its own retention times.',
        e:'Oven temperature ramping; component bands move through each column at their own speed. Peaks are plotted on the TCD and FID chromatograms as their retention times are reached. At the end the peaks are integrated, response factors applied and the composition normalized (non-HC from TCD, HC from FID).' }
    ];
    return [
      { id:'setflow', ph:0, name:'Set Carrier Flow Rate', btn:'Set Flow Rate' },
      { id:'carrier', ph:0, name:'Open Helium Supply', btn:'Open Cylinder Valve' },
      { id:'flow',    ph:0, name:'Establish Carrier Flow', btn:'Establish Carrier Flow' },
      { id:'cond',    ph:0, name:'Condition GC System', btn:'Condition GC System' },
      { id:'tray',  ph:1, name:'Select Sample Vial', btn:'Rotate Sample Tray' },
      { id:'draw',  ph:1, name:'Withdraw ' + GC.oil.injVol + ' Sample', btn:'Withdraw Oil Sample' },
      { id:'oinj',  ph:2, name:'Inject Oil Sample', btn:'Inject Oil Sample' },
      { id:'vap',   ph:2, name:'Flash Vaporization', btn:'Vaporize Sample' },
      { id:'run',   ph:3, name:'Separation & Detection', btn:'Start Separation' },
      { id:'proc',  ph:5, name:'Data Processing', btn:'Process Chromatogram' }
    ];
  }
  stepDone(i) { return !!this.state.done[i]; }
  firstOpen() { const s = this.steps(); for (let i = 0; i < s.length; i++) if (!this.stepDone(i)) return i; return s.length; }
  // one step at a time: never start while a step (or any of its trailing animation) is still running
  canActivate() { const i = this.state.cur; return !this.state.busy && !this.state.paused && !this.jobs.length && !this.waits.length && !this.stepDone(i) && i === this.firstOpen(); }

  finish(i, extra) {
    const done = Object.assign({}, this.state.done); done[i] = true;
    this.setState(Object.assign({ done, busy: false }, extra || {}));
    // step-by-step: point at the next step and wait for the user — never start it automatically
    if (i < this.steps().length - 1) this.setState({ cur: i + 1, auto: false });
    else this.setState({ auto: false });
  }

  activate() {
    if (!this.canActivate()) return;
    const i = this.state.cur, s = this.steps()[i], c = this.cfg();
    this.setState({ busy: true });
    if (this.state.mode === 'oil' && this.oilActivate(i, s, c)) return;
    if (this.state.mode === 'gas' && this.gasActivate(i, s, c)) return;
    if (s.id === 'cond') {
      this.setState({ status: 'Conditioning the injector…', hl: 'inj', injT: 40, ovenT: 25 });
      this.tw(1600, e => this.setState({ injT: Math.round(40 + e * (c.injT - 40)) }), () => {
        const rdy1 = Object.assign({}, this.state.rdy, { inj: true });
        this.setState({ rdy: rdy1, hl: 'oven', status: 'Heating the oven to the initial setpoint…' });
        this.tw(1800, e => this.setState({ ovenT: Math.round(25 + e * (c.ovenStart - 25)) }), () => {
          const rdy2 = Object.assign({}, this.state.rdy, { oven: true });
          this.setState({ rdy: rdy2, hl: 'col', status: 'Column equilibrating with carrier flow…' });
          this.wait(700, () => {
            this.setState({ hl: 'det', det: 'Standby', status: 'Bringing the detector up…' });
            this.wait(800, () => {
              const rdy3 = Object.assign({}, this.state.rdy, { det: true, base: true });
              this.finish(i, { rdy: rdy3, det: 'Ready', hl: '', status: 'System Ready — baseline stable.', ds: 'Waiting for injection', dsSub: 'Baseline stable · ready for sample' });
            });
          });
        });
      });
      return;
    }
    if (s.id === 'vap') {
      this.setState({ status: 'Liquid meets the hot injector wall…', ds: 'Acquiring baseline', dsSub: 'Vaporizing in the heated inlet' });
      this.tw(1400, e => this.setState({ vapor: e, drop: 1 - e }), () =>
        this.finish(i, { injected: true, inlet: 'Vapour in carrier', status: 'Liquid sample flash-vaporized in the heated injector — carrier sweeps it into the column.' }));
      return;
    }
    if (s.id === 'run') {
      if (!this.state.injected) { this.setState({ busy: false }); return; }
      const oilDemo = this.state.mode === 'oil';
      const list = this.comps(), total = c.runMin;
      this.setState({ running: true, runMin: 0, nDet: 0, detK: null, detC: null, ds: 'Run in progress', dsSub: 'Carrier gas transporting the sample', edu: EDU[0] });
      this.tw(c.runMs, p => {
        const t = p * total;
        const n = list.filter(x => (oilDemo ? oDet(x) : x.rt - leadOf(c)) <= t).length;
        const st = { runMin: t, ovenT: Math.round(ovenAt(c, t)), dsBar: p };
        const ei = Math.min(EDU.length - 1, Math.floor(p * EDU.length));
        st.edu = EDU[ei];
        if (n !== this.state.nDet) {
          const comp = list[n - 1];
          st.nDet = n; st.pulse = comp.k; st.detK = oilDemo ? comp.name : comp.k; st.detC = comp.c;
          const nx = list[n];
          if (!oilDemo && comp.hc) { st.fpulse = comp.k; st.fidK = comp.k; st.fidC = comp.c; }
          st.status = this.state.mode === 'oil'
            ? comp.name + (OIL_WIN[comp.k] ? ' group reaching the detector' : ' detected') + ' — RT ' + comp.rt.toFixed(2) + ' min' + (nx ? '; ' + nx.name + ' next.' : '; last group eluting.')
            : (comp.hc
                ? (comp.name || comp.k) + ' (HC) — TCD peak from the capillary column and FID peak from the packed column.'
                : (comp.name || comp.k) + ' (non-HC) — TCD peak from the capillary column; no FID response (not ionized in the flame).');
          st.ds = 'Peaks appearing'; st.dsSub = 'Signal transferred to the data system';
          this.wait(420, () => this.setState({ pulse: null, fpulse: null }));
        }
        this.setState(st);
      }, () => this.finish(i, { running: false, runMin: total, ds: 'Integrating peaks', dsSub: 'All configured components eluted', edu: '', status: 'All components eluted — run complete.' }), true);
      return;
    }
    if (s.id === 'proc') {
      this.setState({ ds: 'Integrating peaks', dsSub: 'Baseline-to-baseline integration', status: 'Integrating chromatographic peaks…' });
      this.wait(700, () => {
        this.setState({ ds: 'Applying response factors', dsSub: 'Calibrated response per component', status: 'Peak areas corrected using calibration factors.' });
        this.wait(700, () => {
          this.setState({ ds: 'Normalizing composition', dsSub: 'Basis normalized to 100.00%', status: 'Normalizing the composition to 100%…' });
          this.wait(700, () => this.finish(i, { ds: 'Analysis complete', dsSub: 'Report ready', complete: true, results: true, status: (this.state.mode === 'oil' ? 'Oil Analysis Complete' : 'Analysis Complete') + ' — composition normalized to 100.00%.' }));
        });
      });
    }
  }

  // ---------- oil mode: helium supply + automatic liquid sampler ----------
  oilActivate(i, s, c) {
    const st = this.state, ready = st.rdy.flow && st.rdy.inj && st.rdy.oven && st.rdy.det && st.rdy.base;
    const block = msg => { this.setState({ busy: false, status: msg }); return true; };
    if (s.id === 'setflow') {
      this.setState({ status: 'Entering the carrier-gas setpoint on the flow controller — cylinder valve still closed, no gas moving.', hl: 'ctrl' });
      this.tw(1800, e => this.setState({ flowSet: +(e * c.flow).toFixed(2) }), () =>
        this.finish(i, { flowSet: c.flow, hl: '', inlet: 'Setpoint ' + c.flow.toFixed(2) + ' mL/min', status: 'Flow setpoint ' + c.flow.toFixed(2) + ' mL/min selected. Cylinder valve closed — outlet pressure 0 psi, no flow in the tubing.' }));
      return true;
    }
    if (s.id === 'carrier') {
      if (!st.flowSet) return block('Set the carrier flow rate on the flow controller before opening the helium supply.');
      this.setState({ status: 'Opening the helium cylinder valve…', hl: 'cyl' });
      this.tw(1600, e => this.setState({ cylV: e }), () => {
        this.setState({ cylV: 1, hl: 'reg', status: 'Cylinder valve open — regulator outlet pressure rising from 0 psi…' });
        this.tw(2600, e => this.setState({ reg: e }), () => {
          this.setState({ reg: 1, carrier: true, hl: 'ctrl', status: 'Outlet pressure established — helium flowing from the cylinder through the regulator and flow controller toward the GC.' });
          this.tw(1600, e => this.setState({ flow: +(e * c.flow).toFixed(2) }), () =>
            this.finish(i, { flow: c.flow, hl: '', inlet: 'Supply on', status: 'Helium supply open — flow controller delivering ' + c.flow.toFixed(2) + ' mL/min toward the injection port.' }));
        });
      });
      return true;
    }
    if (s.id === 'flow') {
      if (!st.carrier) return block('Open the helium supply first.');
      this.setState({ status: 'Carrier gas sweeping through the inlet, capillary column and detector…', hl: 'col' });
      this.tw(2200, e => this.setState({ flowIn: e }), () => {
        const rdy = Object.assign({}, this.state.rdy, { flow: true });
        this.finish(i, { flowIn: 1, flowStable: true, rdy, hl: '', inlet: 'Carrier flowing', status: 'Carrier flow established — ' + c.flow.toFixed(2) + ' mL/min helium through the GC system.', dsSub: c.flow + ' mL/min through inlet, column and detector' });
      });
      return true;
    }
    if (s.id === 'tray') {
      if (!ready) return block('Injection blocked — carrier flow, injector, oven and detector must all be ready first.');
      this.setState({ status: 'Autosampler tray rotating vial ' + AS.sel + ' to the sampling position…', asSel: false });
      this.tw(3600, e => this.setState({ trayRot: e * AS_ROT }), () => {
        this.setState({ trayRot: AS_ROT, asSel: true, status: 'Vial ' + AS.sel + ' (oil sample) at the sampling position — selected.' });
        this.wait(900, () => this.finish(i, { inlet: 'Vial ' + AS.sel + ' selected', status: 'Vial ' + AS.sel + ' positioned under the autosampler syringe.' }));
      });
      return true;
    }
    if (s.id === 'draw') {
      if (!ready || !st.asSel) return block('Select the sample vial first.');
      this.setState({ status: 'Syringe moving down — needle piercing the vial septum…' });
      this.tw(1800, e => this.setState({ asTip: AS.READY + e * (AS.VIAL_DIP - AS.READY) }), () => {
        this.setState({ status: 'Needle in the oil — plunger rising to withdraw ' + GC.oil.injVol + '…' });
        this.tw(2000, e => this.setState({ asFill: e }), () => {
          this.setState({ asFill: 1, status: 'Needle rising out of the vial…' });
          this.tw(1600, e => this.setState({ asTip: AS.VIAL_DIP - e * (AS.VIAL_DIP - AS.READY) }), () =>
            this.finish(i, { asTip: AS.READY, inlet: 'Syringe loaded · ' + GC.oil.injVol, status: GC.oil.injVol + ' of oil withdrawn — needle clear of the vial.' }));
        });
      });
      return true;
    }
    if (s.id === 'oinj') {
      if (!ready || st.asFill < 1) return block('Withdraw the oil sample into the autosampler syringe first.');
      this.setState({ status: 'Syringe carriage moving to the injection port…' });
      this.tw(2200, e => this.setState({ asX: AS.X_VIAL + e * (AS.X_INJ - AS.X_VIAL) }), () => {
        this.setState({ asX: AS.X_INJ, status: 'Syringe descending — needle through the inlet septum…' });
        this.tw(1700, e => this.setState({ asTip: AS.READY + e * (AS.INJ_DIP - AS.READY) }), () => {
          this.setState({ status: 'Plunger down — injecting ' + GC.oil.injVol + ' into the heated inlet…' });
          this.tw(1600, e => this.setState({ asFill: 1 - e, drop: e }), () => {
            this.setState({ asFill: 0, drop: 1, status: 'Needle rising out of the injection port…' });
            this.tw(1400, e => this.setState({ asTip: AS.INJ_DIP - e * (AS.INJ_DIP - AS.READY) }), () => {
              this.setState({ asTip: AS.READY, status: 'Syringe returning to its ready position…' });
              this.tw(1800, e => this.setState({ asX: AS.X_INJ + e * (AS.X_VIAL - AS.X_INJ) }), () =>
                this.finish(i, { asX: AS.X_VIAL, inlet: 'Liquid delivered', status: GC.oil.injVol + ' injected through the septum — syringe back in its ready position.' }));
            });
          });
        });
      });
      return true;
    }
    return false;
  }

  // ---------- gas mode (2026-09-30): carrier -> evacuate sample line + loop -> isolate vacuum -> load loop -> inject -> run ----------
  gasActivate(i, s, c) {
    const st = this.state, V = c.vac, IP = c.injP;
    const block = msg => { this.setState({ busy: false, status: msg }); return true; };
    const lg = (a, b, e) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * e);   // smooth log-scale pressure change
    if (s.id === 'carrier') {
      this.setState({ hl: 'cyl', status: 'Opening the helium cylinder valve…', ds: 'Carrier start-up', dsSub: 'Helium supply opening' });
      this.tw(1600, e => this.setState({ cylV: e }), () => {
        this.setState({ cylV: 1, hl: 'reg', status: 'Cylinder valve open — regulator outlet pressure rising…' });
        this.tw(2400, e => this.setState({ reg: e }), () => {
          this.setState({ reg: 1, hl: 'ctrl', status: 'Setting the flow controller to ' + c.flow.toFixed(2) + ' mL/min…' });
          this.tw(1800, e => this.setState({ flowSet: +(e * c.flow).toFixed(2) }), () => {
            this.setState({ flowSet: c.flow, carrier: true, status: 'Helium flowing through the flow controller to the 6-port valve (LOAD: port 1 → port 2, loop bypassed)…' });
            this.tw(1600, e => this.setState({ flow: +(e * c.flow).toFixed(2) }), () => {
              this.setState({ flow: c.flow, hl: 'col', heFront: true, status: 'Helium sweeping the split tee, packed column → TCD and capillary column → FID…', dsSub: 'Helium filling both analytical paths' });
              this.tw(6000, e => this.setState({ flowIn: e }), () => {
                this.setState({ flowIn: 1, heFront: false, hl: 'det', status: 'TCD filament on, FID flame lit — waiting for both baselines to stabilize…' });
                this.wait(1800, () => {
                  const rdy = { flow: true, inj: true, oven: true, det: true, base: true };
                  this.finish(i, { flowStable: true, rdy, det: 'Ready', hl: '', inlet: 'Helium flowing', ds: 'Baseline stable', dsSub: c.flow + ' mL/min helium · both detectors ready', status: 'Carrier flow established at ' + c.flow.toFixed(2) + ' mL/min through both columns — baselines stable. Valve in LOAD, sample loop not in the carrier path.' });
                });
              }, true);
            });
          });
        });
      });
      return true;
    }
    if (s.id === 'vac') {
      if (!st.flowStable) return block('Establish a stable carrier-gas flow first.');
      this.setState({ hl: 'vac', status: 'Connecting the vacuum pump to the sample-line branch — bottle outlet valve CLOSED, vacuum valve closed.', ds: 'Preparing sample path', dsSub: 'Sample line + loop evacuation' });
      this.tw(1400, e => this.setState({ pumpShow: e }), () => {
        this.setState({ pumpShow: 1, pumpRun: true, status: 'Pump running against the closed vacuum valve…' });
        this.wait(900, () => {
          this.setState({ status: 'Opening the vacuum valve…' });
          this.tw(1200, e => this.setState({ vvOpen: e }), () => {
            this.setState({ vvOpen: 1, vacOn: true, status: 'Vacuum valve OPEN — evacuating the sample line from the closed bottle valve to valve port 4, the sample loop and the capped port 5. Carrier line and columns are not connected to the vacuum.' });
            this.tw(7600, e => this.setState({ lineP: lg(V.P0, V.Pend, e), injP: IP.P0 + (IP.Pvac - IP.P0) * e }), () =>
              this.wait(700, () => this.finish(i, { lineP: V.Pend, injP: IP.Pvac, vacDone: true, hl: '', status: 'Sample line and loop evacuated (injection pressure ' + IP.Pvac + '). Vacuum valve still OPEN — close it before admitting sample.' })));
          });
        });
      });
      return true;
    }
    if (s.id === 'iso') {
      if (!st.vacDone) return block('Evacuate the sample line and loop first.');
      this.setState({ hl: 'vac', status: 'Closing the vacuum valve — isolating the vacuum branch from the sample line…' });
      this.tw(1400, e => this.setState({ vvOpen: 1 - e }), () => {
        this.setState({ vvOpen: 0, vacOn: false, status: 'Vacuum valve CLOSED — sample line and loop sealed under vacuum. Stopping the pump…' });
        this.wait(1100, () => {
          this.setState({ pumpRun: false, status: 'Pump stopped — removing the pump hose. The closed vacuum valve stays on the branch.' });
          this.wait(900, () => this.tw(1400, e => this.setState({ pumpShow: 1 - e }), () =>
            this.finish(i, { pumpShow: 0, isoDone: true, hl: '', status: 'Vacuum isolated: valve CLOSED, pump removed. Nothing can flow toward the vacuum branch.' })));
        });
      });
      return true;
    }
    if (s.id === 'load') {
      if (!st.isoDone || st.vvOpen > 0) return block('Loading blocked — the vacuum valve must be CLOSED before the bottle valve is opened.');
      this.setState({ hl: 'bv', status: 'Opening the bottle outlet valve inside the balloon oven…', ds: 'Loading sample loop', dsSub: 'Valve in LOAD · loop off the carrier path' });
      this.tw(1200, e => this.setState({ bvOpen: e }), () => {
        this.setState({ bvOpen: 1, sFlow: true, hl: 'bal', status: 'Bottle valve OPEN — sample gas expanding into the evacuated sample line…' });
        this.tw(9000, e => this.setState({ sFill: e, injP: IP.Pvac + (IP.Pinj - IP.Pvac) * Math.min(1, e * 1.08) }), () => {
          this.setState({ sFill: 1, injP: IP.Pinj, sFlow: false, hl: '' });
          this.wait(700, () => this.finish(i, { loaded: true, inlet: 'Loop loaded · ' + c.loopVol, status: 'Sample loop loaded (' + c.loopVol + ', injection pressure ' + IP.Pinj + '). Valve still in LOAD — the sample is held in the loop and has not entered the columns.' }));
        }, true);
      });
      return true;
    }
    if (s.id === 'ginj') {
      if (!st.flowStable) return block('Injection blocked — establish the carrier-gas flow first.');
      if (st.vvOpen > 0 || !st.isoDone) return block('Injection blocked — the vacuum valve is still open.');
      if (!st.loaded) return block('Load the sample loop first.');
      this.setState({ hl: 'iv', status: 'Switching the 6-port valve from LOAD to INJECT…', ds: 'Sample injection', dsSub: 'Carrier sweeping the loop' });
      this.tw(1600, e => this.setState({ ivOn: e }), () => {
        this.setState({ ivOn: 1, hl: 'col', status: 'INJECT — helium now enters port 1 → port 6, pushes the sample out of the loop → port 3 → port 2 toward the split tee…' });
        this.tw(8000, e => this.setState({ sweep: e }), () =>
          this.finish(i, { sweep: 1, injected: true, hl: '', inlet: 'Sample injected · ' + c.loopVol, status: 'Sample split at the tee and now at the head of the packed and capillary columns — helium flowing. Ready to start the temperature programme.' }), true);
      });
      return true;
    }
    if (s.id === 'run') {
      if (!st.injected) return block('Inject the sample first.');
      const total = c.runMin;
      this.setState({ running: true, runMin: 0, nDet: 0, nDetF: 0, detK: null, detC: null, fidK: null, fidC: null, ds: 'Run in progress', dsSub: 'GC oven ' + c.program.T0 + ' → ' + c.program.T1 + ' °C', edu: EDU[0] });
      this.tw(c.runMs, p => {
        const t = p * total, stt = { runMin: t, ovenT: Math.round(ovenAt(c, t)), dsBar: p, edu: EDU[Math.min(EDU.length - 1, Math.floor(p * EDU.length))] };
        const nT = TCD_LIST.filter(x => x.rt <= t).length, nF = FID_LIST.filter(x => x.rt <= t).length;
        if (nT !== this.state.nDet) {
          const d = TCD_LIST[nT - 1]; stt.nDet = nT; stt.pulse = d.k; stt.detK = d.k; stt.detC = d.c;
          stt.status = 'TCD (packed column): ' + d.k + ' peak at ' + d.rt.toFixed(2) + ' min' + (d.hc ? '.' : ' — non-hydrocarbon, seen by the TCD only.');
          this.wait(420, () => this.setState({ pulse: null }));
        }
        if (nF !== (this.state.nDetF || 0)) {
          const d = FID_LIST[nF - 1]; stt.nDetF = nF; stt.fpulse = d.k; stt.fidK = d.k; stt.fidC = d.c;
          stt.status = 'FID (capillary column): ' + d.k + (d.k === 'C6+' ? ' fraction starting (n-C6)' : ' peak') + ' at ' + d.rt.toFixed(2) + ' min.';
          this.wait(420, () => this.setState({ fpulse: null }));
        }
        this.setState(stt);
      }, () => {
        this.setState({ running: false, runMin: total, ovenT: c.program.T1, edu: '', ds: 'Integrating peaks', dsSub: 'TCD + FID channels', status: 'Run complete at ' + total + ' min (GC oven ' + c.program.T1 + ' °C) — integrating both chromatograms…' });
        this.wait(900, () => {
          this.setState({ ds: 'Applying response factors', status: 'Peak areas corrected with the response factors — non-HC from TCD, HC from FID.' });
          this.wait(900, () => this.finish(i, { ds: 'Analysis complete', dsSub: 'Report ready', complete: true, results: true, status: 'Analysis Complete — composition normalized to 100.00 mol%.' }));
        });
      }, true);
      return true;
    }
    return false;
  }

  // ---------- gas: compact GC-oven temperature-programme chart (separate from the detector traces) ----------
  // Same L / R as the chromatograms so the time axes line up. The balloon oven is drawn as a constant 80 °C reference.
  tempChart(W, H, L, R) {
    const st = this.state, c = GC.gas, p = c.program, f1 = v => v.toFixed(1);
    const T = 20, B = H - 20, TMAX = 350, RUN = c.runMin;
    const xO = t => L + t / RUN * (R - L), yO = v => B - v / TMAX * (B - T);
    const tEnd = st.injected ? Math.min(st.runMin, RUN) : 0, Tn = ovenAt(c, tEnd);
    const xT = []; for (let t = 0; t <= RUN + 1e-6; t += 15) xT.push({ x: f1(xO(t)), v: String(t) });
    const yT = [0, 100, 200, 300].map(v => ({ y: f1(yO(v)), ty: f1(yO(v) + 3.5), v: String(v) }));
    const done = 'M' + f1(xO(0)) + ' ' + f1(yO(p.T0)) + ' L' + f1(xO(tEnd)) + ' ' + f1(yO(Tn));
    const nx = xO(tEnd), lab = 'GC oven ' + Math.round(Tn) + ' °C';
    return {
      vb: '0 0 ' + W + ' ' + H, W, H, L, R, T, B, xT, yT,
      progD: 'M' + f1(xO(0)) + ' ' + f1(yO(p.T0)) + ' L' + f1(xO(RUN)) + ' ' + f1(yO(p.T1)),
      doneD: done, balY: f1(yO(c.bal.Tset)), balLY: f1(yO(c.bal.Tset) - 4),
      nowX: f1(nx), nowY: f1(yO(Tn)), nowLab: lab, nowLX: f1(Math.min(nx + 7, R - lab.length * 6.1)), nowLY: f1(Math.max(T + 9, yO(Tn) - 7)),
      nowStyle: 'opacity:' + (st.injected ? 1 : 0) + ';',
      xLabY: f1(B + 15), yLabX: 13, yMid: f1((T + B) / 2),
      legTxt: 'GC oven programme: ' + p.T0 + ' → ' + p.T1 + ' °C in ' + RUN + ' min (' + p.rate.toFixed(2) + ' °C/min)',
      balTxt: 'Balloon oven ' + c.bal.Tset + ' °C (constant)',
      endLab: tEnd > 52 ? '' : p.T1 + ' °C', endX: f1(R - 3), endY: f1(yO(p.T1) + 11), startLab: p.T0 + ' °C', startX: f1(L + 4), startY: f1(yO(p.T0) - 5)
    };
  }

  // ---------- results maths ----------
  results() {
    const list = this.comps();
    if (this.state.mode === 'oil') {
      const raw = list.map(c => ({ c, area: c.mass * c.rf }));
      const sA = raw.reduce((a, r) => a + r.area, 0);
      const mass = raw.map(r => ({ c: r.c, area: r.area, mass: r.area / r.c.rf }));
      const sM = mass.reduce((a, r) => a + r.mass, 0);
      const moles = mass.map(r => ({ r, n: (r.mass / sM) / r.c.mw }));
      const sN = moles.reduce((a, m) => a + m.n, 0);
      return moles.map(m => ({
        c: m.r.c, area: m.r.area / sA * 100000, rf: m.r.c.rf,
        massPct: m.r.mass / sM * 100, molPct: m.n / sN * 100
      }));
    }
    const raw = list.map(c => ({ c, area: c.mol * c.rf }));
    const sA = raw.reduce((a, r) => a + r.area, 0);
    const mol = raw.map(r => ({ c: r.c, area: r.area, m: r.area / r.c.rf }));
    const sM = mol.reduce((a, r) => a + r.m, 0);
    return mol.map(r => ({ c: r.c, area: r.area / sA * 100000, rf: r.c.rf, molPct: r.m / sM * 100 }));
  }
  peakGeom() {
    // geometric peak area stays proportional to the reported amount; width follows from the display height
    if (this.state.mode === 'oil') return this.comps().map(d => ({ c: d, h: 1, w: oSigma(d.rt), amount: d.mass }));
    const res = this.results(), mode = this.state.mode;
    return res.map(r => {
      const amount = mode === 'oil' ? r.massPct : r.molPct;
      const w = Math.max(0.035, (amount * r.rf) / (r.c.h * 2.5066));
      return { c: r.c, h: r.c.h, w, amount, res: r };
    });
  }

  // ---------- controls ----------
  pick(mode) { this.stopAll(); this.setState(Object.assign({ mode, status: mode === 'oil' ? 'Oil analysis selected — prepare the GC system.' : 'Gas analysis selected — balloon oven at 80 °C, GC oven at 35 °C. Start by establishing the carrier-gas flow.' }, S0, mode === 'gas' ? GAS0() : {})); }
  /* ---- shared procedure panel (ProcCtl.js): one stage = one GC step ---- */
  pcLive() { return this.state.busy || this.jobs.length > 0 || this.waits.length > 0; }
  pcInfo() {
    const st = this.state, S = this.steps();
    if (!st.mode || !S.length) return null;
    const N = S.length, k = Math.min(st.cur, N - 1), live = this.pcLive(), dn = this.stepDone(k);
    return { N, k, unit: 'Step', title: S[k].name, q: st.status || '',
      status: st.paused ? 'paused' : live ? 'running' : dn ? 'complete' : 'ready',
      allDone: !!st.complete, frac: null, doneMask: S.map((x, i) => this.stepDone(i)),
      canPrev: k > 0, canNext: k < N - 1, canRestart: live || st.paused || dn,
      canRun: !live && !dn && k === this.firstOpen(), runLabel: S[k].btn,
      again: 'Run Analysis Again', reset: 'Reset Analysis', resetTitle: 'Cancel any running step and return this analysis to its initial state' };
  }
  pcTo(k) {
    this.resetRun();
    for (let i = 0; i < k; i++) {
      if (!this.canActivate()) break;
      this.activate(); this.ffAll();
      if (!this.stepDone(i)) break;
    }
    this.setState({ paused: false });
  }
  pcAct(a) {
    const st = this.state, S = this.steps(), k = Math.min(st.cur, S.length - 1);
    if (a === 'run') { if (this.canActivate()) this.activate(); }
    else if (a === 'pause') { if (this.pcLive()) this.setState({ paused: true }); }
    else if (a === 'resume') { this.setState({ paused: false }); this.last = performance.now(); this.ensureLoop(); }
    else if (a === 'restart') this.pcTo(k);
    else if (a === 'prev') this.pcTo(Math.max(0, k - 1));
    else if (a === 'next') { if (this.pcLive()) { this.setState({ paused: false }); this.ffAll(); } else this.pcTo(k + 1); }
    else if (a === 'runNext') { if (k < S.length - 1) { if (st.cur === k && this.stepDone(k)) this.setState({ cur: k + 1 }); if (this.canActivate()) this.activate(); } }
    else if (a === 'again') { this.pcTo(0); if (this.canActivate()) this.activate(); }
    else if (a === 'reset') this.resetRun();
  }
  resetRun() { this.stopAll(); this.setState(Object.assign({}, S0, this.state.mode === 'gas' ? GAS0() : {}, { mode: this.state.mode, status: 'Analysis reset — GC returned to its initial condition.' })); }
  toModes() { this.stopAll(); this.setState(Object.assign({}, S0, { mode: '', status: 'Select the sample phase to begin compositional analysis.' })); }

  renderVals() {
    const st = this.state, mode = st.mode, c = this.cfg(), isGas = mode === 'gas', isOil = mode === 'oil';
    const steps = this.steps(), i = st.cur, cur = steps[i] || null;
    const dash = v => (v == null || v === '' ? '—' : v);
    const mono = 'font-family:\'IBM Plex Mono\',monospace;';

    // live strip
    const strip = [
      { k:'Carrier Gas', v: st.carrier ? GC.carrier + ' · ' + GC.purity : '—', color: st.carrier ? 'var(--blue)' : 'var(--mut2)' },
      { k:'Carrier Flow', v: st.flow ? st.flow.toFixed(2) + ' mL/min' : '—', color: st.flowStable ? 'var(--grn)' : (st.flow ? 'var(--amb)' : 'var(--mut2)') },
      { k:'Inlet Status', v: dash(st.inlet), color: st.inlet ? 'var(--txt)' : 'var(--mut2)' },
      { k:'Injector Temp', v: st.injT == null ? '—' : st.injT + ' °C', color: st.rdy.inj ? 'var(--grn)' : (st.injT == null ? 'var(--mut2)' : 'var(--amb)') },
      { k:'Oven Temp', v: st.ovenT == null ? '—' : st.ovenT + ' °C', color: st.rdy.oven ? (st.running ? 'var(--amb)' : 'var(--grn)') : (st.ovenT == null ? 'var(--mut2)' : 'var(--amb)') },
      { k:'Detector', v: st.det ? c.detector + ' · ' + st.det : '—', color: st.det === 'Ready' ? 'var(--grn)' : (st.det ? 'var(--amb)' : 'var(--mut2)') },
      { k:'Run Time', v: st.injected && (st.running || st.runMin > 0) ? st.runMin.toFixed(2) + ' min' + (isOil ? ' (sim.)' : '') : '—', color: st.running ? 'var(--blue)' : (st.runMin > 0 ? 'var(--txt)' : 'var(--mut2)') },
      { k:'Current Component', v: '—', color: 'var(--mut2)' },
      { k:'Detector Response', v: '—', color: 'var(--mut2)' }
    ];

    // ---------- chromatogram ----------
    const X0 = 54, X1 = 640, Y0 = 18, Y1 = 248;
    const geom = mode ? this.peakGeom() : [];
    const maxH = geom.reduce((a, g) => Math.max(a, g.h), 1) * 1.14;
    const xOf = rt => X0 + (rt / c.runMin) * (X1 - X0);
    const yOf = s => Y1 - (s / maxH) * (Y1 - Y0);
    const sig = t => geom.reduce((a, g) => a + g.h * Math.exp(-Math.pow(t - g.c.rt, 2) / (2 * g.w * g.w)), 0);
    const tNow = st.injected ? Math.min(st.runMin, c.runMin) : 0;
    let traceD = '';
    if (mode && st.injected) {
      const n = 300, pts = [];
      for (let s = 0; s <= n; s++) { const t = (tNow) * (s / n); pts.push(xOf(t).toFixed(1) + ' ' + yOf(sig(t)).toFixed(1)); }
      traceD = 'M' + pts.join(' L');
    } else if (mode) {
      traceD = 'M' + X0 + ' ' + Y1;
    }
    const detected = geom.filter(g => st.injected && st.runMin >= g.c.rt);
    const peakFills = detected.map(g => {
      const a = Math.max(g.c.rt - 3.2 * g.w, 0), b = Math.min(g.c.rt + 3.2 * g.w, tNow), n = 26, pts = [];
      for (let s = 0; s <= n; s++) { const t = a + (b - a) * (s / n); pts.push(xOf(t).toFixed(1) + ' ' + yOf(sig(t)).toFixed(1)); }
      const on = st.hover === g.c.k;
      return { d: 'M' + xOf(a).toFixed(1) + ' ' + Y1 + ' L' + pts.join(' L') + ' L' + xOf(b).toFixed(1) + ' ' + Y1 + ' Z', fill: on ? g.c.c + '66' : g.c.c + '2b' };
    });
    const peakLabels = detected.map(g => ({
      k: g.c.k, x: xOf(g.c.rt).toFixed(1), y: (yOf(g.h) - 6).toFixed(1), color: g.c.c,
      style: st.hover && st.hover !== g.c.k ? 'opacity:.45;' : 'opacity:1;',
      hx: (xOf(g.c.rt) - 9).toFixed(1), hw: 18,
      enter: () => this.setState({ hover: g.c.k }), leave: () => this.setState({ hover: null })
    }));
    const yTicks = [0, .25, .5, .75, 1].map(f => ({ y: (Y1 - f * (Y1 - Y0)).toFixed(1), ty: (Y1 - f * (Y1 - Y0) + 3).toFixed(1), v: Math.round(f * maxH) }));
    const xTicks = [];
    if (mode) { const stepT = c.runMin > 12 ? 5 : 1; for (let t = 0; t <= c.runMin + .01; t += stepT) xTicks.push({ x: xOf(t).toFixed(1), v: t.toFixed(0) }); }

    // ---------- oil chromatogram (one timeline with the column animation and the results table) ----------
    const f1 = v => v.toFixed(1);
    const niceStep = raw => [0.1, 0.2, 0.5, 1, 2, 5, 10].find(s2 => s2 >= raw) || 10;
    // chart source per phase (oil entries are the original oil values)
    // gas (2026-09-30): two independent channels, each with its own chart; shared time axis 0-75 min
    const KG = (ch) => ch === 'TCD'
      ? { gas: true, cfg: GC.gas, SIG: TCD_SIG, DT: GD_DT, N: GD_N, maxIn: (a, b) => gSigMax(TCD_SIG, a, b), base: TCD_BASE, win: gWinL, grp: {}, grpC: {}, minor: [], sub: [], yMax: 160, lift: 30,
          TMAX: 350, tLo: 0, tHi: 300, tStep: 100, lab: c2 => c2.k, pct: 'molPct', unit: 'mol%', id: 'gc-tcd-clip', list: TCD_LIST,
          resp: 'TCD response (mV)', axis: 'TCD response (mV)', title: 'TCD · Packed column', color: '#0f7f69' }
      : { gas: true, cfg: GC.gas, SIG: FID_SIG, DT: GD_DT, N: GD_N, maxIn: (a, b) => gSigMax(FID_SIG, a, b), base: FID_BASE, win: gWinL, grp: FID_GRP, grpC: { 'C6+': 38 }, minor: FID_MINOR.map(q => ({ t: q.t })), sub: FID_SUB.filter(q => q.n), yMax: 160, lift: 30,
          TMAX: 350, tLo: 0, tHi: 300, tStep: 100, lab: c2 => c2.k, pct: 'molPct', unit: 'mol%', id: 'gc-fid-clip', list: FID_LIST,
          resp: 'FID response (pA)', axis: 'FID response (pA)', title: 'FID · Capillary column', color: '#1f4fd1' };
    const K = isGas ? KG('TCD')
      : { cfg: GC.oil, SIG: OIL_SIG, DT: O_DT, N: O_N, maxIn: oMaxIn, base: OIL_BASE, win: oWin, grp: OIL_WIN, minor: O_MINOR, TMAX: 220, tLo: 50, tHi: 200, tStep: 50, lab: c2 => c2.name, pct: 'massPct', unit: 'mass%', id: 'gc-oil-clip',
          list: OIL_COMPS, resp: 'Detector response (mV)', axis: 'Detector Response (mV)' };
    const oilRes = mode ? this.results() : [];
    const oilResMap = {}; oilRes.forEach(r => { oilResMap[r.c.k] = r; });
    const meas = (sel, key) => {
      const el = typeof document !== 'undefined' ? document.querySelector(sel) : null;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 80 && r.height > 80) {
          const w = Math.round(r.width), h = Math.round(r.height);
          if (!this[key] || Math.abs(this[key].w - w) > 2 || Math.abs(this[key].h - h) > 2) {
            this[key] = { w, h };
            if (!this._remeasure) { this._remeasure = true; requestAnimationFrame(() => { this._remeasure = false; this.setState({}); }); }
          }
        }
      }
      else if (!el && !this._remeasure) { this._remeasure = true; requestAnimationFrame(() => { this._remeasure = false; if (document.querySelector(sel)) this.setState({}); }); }
      return this[key];
    };
    if (!this._rz && typeof window !== 'undefined') { this._rz = true; window.addEventListener('resize', () => this.setState({})); }
    const mkChart = (K, W, H, big, v0, v1) => {
      const L = big ? 72 : 58, R = W - (big ? 74 : 56), T = big ? 34 : 30, B = H - (big ? 54 : 46);
      const span = v1 - v0, RUN = K.cfg.runMin, TMAX = K.TMAX;
      // full run: fixed 0–120 (pA/mV); zoomed: rescale the response axis to the peaks in view
      const oMax = span >= RUN - 1e-6 ? (K.yMax || 120) : K.gas ? Math.max(8, Math.ceil(K.maxIn(Math.max(0, v0), v1) * 1.35 / 8) * 8) : Math.max(12, Math.ceil(K.maxIn(Math.max(0, v0), v1) * 1.45 / 12) * 12);
      const xO = t => L + (t - v0) / span * (R - L);
      const yO = v => B - Math.min(v, oMax * 1.03) / oMax * (B - T);
      const yT = v => B - v / TMAX * (B - T);
      const tEnd = st.injected ? Math.min(st.runMin, RUN) : 0;
      const vis = t => t >= v0 - 1e-6 && t <= v1 + 1e-6;
      // --- detector trace: min/max per plot column so narrow peaks keep their true apex ---
      let traceD = '';
      const a = Math.max(v0, 0), b = Math.min(v1, tEnd);
      if (st.injected && b > a) {
        const cols = Math.max(50, Math.round(R - L)), i0 = Math.floor(a / K.DT), i1 = Math.min(K.N - 1, Math.floor(b / K.DT)), nS = i1 - i0 + 1, pts = [];
        const colsUsed = Math.max(1, Math.round((b - a) / span * cols));
        if (nS <= colsUsed * 2) { for (let i = i0; i <= i1; i++) pts.push(f1(xO(i * K.DT)) + ' ' + f1(yO(K.SIG[i]))); }
        else {
          const per = nS / colsUsed;
          for (let k = 0; k < colsUsed; k++) {
            const j0 = i0 + Math.floor(k * per), j1 = Math.min(i1, i0 + Math.floor((k + 1) * per) - 1);
            if (j1 < j0) continue;
            let mn = 1e9, mx = -1e9, imn = j0, imx = j0;
            for (let j = j0; j <= j1; j++) { const v = K.SIG[j]; if (v < mn) { mn = v; imn = j; } if (v > mx) { mx = v; imx = j; } }
            const x = f1(xO(((j0 + j1) / 2) * K.DT));
            const p1 = x + ' ' + f1(yO(mn)), p2 = x + ' ' + f1(yO(mx));
            if (imn < imx) pts.push(p1, p2); else pts.push(p2, p1);
          }
        }
        traceD = 'M' + pts.join(' L');
      }
      // --- labels ---
      const fs = big ? 12.5 : (K.gas ? 9.5 : 10.5), fsm = big ? 10.5 : 9, gap = fs + 3, lift = big ? 62 : (K.lift || 48), maxLv = st.chromAll ? 5 : (K.gas ? 3 : 2);
      const dtp = 7 * span / (R - L);
      const items = [];
      K.list.forEach(c2 => {
        if (K.grp[c2.k] || !st.injected || st.runMin < c2.rt || !vis(c2.rt)) return;
        items.push({ t: c2.rt, k: c2.k, txt: K.lab(c2) + '  ' + c2.rt.toFixed(2), id: true });
      });
      (K.sub || []).forEach(q => { if (st.injected && st.runMin >= q.t && vis(q.t)) items.push({ t: q.t, k: '', txt: q.n + '  ' + q.t.toFixed(2), id: true, sub: true }); });
      if (st.chromAll) K.minor.forEach(q => { if (st.injected && st.runMin >= q.t && vis(q.t)) items.push({ t: q.t, k: '', txt: q.t.toFixed(2), id: false }); });
      items.sort((p, q) => p.t - q.t);
      const lastX = [-1e9, -1e9, -1e9, -1e9, -1e9, -1e9];
      const labels = [];
      if (K.gas) {
        // gas: every label is kept; crowded labels are spread sideways (centred on their cluster) and joined to
        // their peak by a leader, then lifted above the highest trace between the label and its peak
        const n = items.length, x0 = items.map(it => xO(it.t)), xs = x0.slice(), gw = it => (it.id ? gap : fsm + 3);
        for (let i2 = 1; i2 < n; i2++) xs[i2] = Math.max(xs[i2], xs[i2 - 1] + gw(items[i2]));
        for (let i2 = 0; i2 < n;) {
          let j = i2; while (j + 1 < n && xs[j + 1] - xs[j] <= gw(items[j + 1]) + 0.01) j++;
          let disp = 0; for (let k = i2; k <= j; k++) disp += xs[k] - x0[k]; disp /= (j - i2 + 1);
          const minX = i2 ? xs[i2 - 1] + gw(items[i2]) : L + fs; const sh = Math.max(0, Math.min(disp, xs[i2] - minX));
          for (let k = i2; k <= j; k++) xs[k] -= sh; i2 = j + 1;
        }
        for (let i2 = n - 1; i2 >= 0; i2--) { const mx = i2 === n - 1 ? R - 3 : xs[i2 + 1] - gw(items[i2 + 1]); if (xs[i2] > mx) xs[i2] = mx; }
        items.forEach((it, i2) => {
          const f = it.id ? fs : fsm, len = it.txt.length * f * 0.6, moved = Math.abs(xs[i2] - x0[i2]) > 0.6;
          const tl = it.t + (xs[i2] - x0[i2]) * span / (R - L);
          const ayPk = yO(K.maxIn(it.t - dtp, it.t + dtp)) - 3;
          const top = yO(K.maxIn(Math.min(it.t, tl) - dtp * 1.5, Math.max(it.t, tl) + dtp * 1.5)) - (moved ? 12 : 5);
          const y = Math.max(T + len + 3, Math.min(top, ayPk - 2));
          const on = it.id && st.hover === it.k, yk = Math.min(ayPk, y + 8);
          labels.push({
            tf: 'rotate(-90 ' + f1(xs[i2] + f * 0.36) + ' ' + f1(y) + ')', x: f1(xs[i2] + f * 0.36), y: f1(y), txt: it.txt,
            fill: it.sub ? '#4b5870' : it.id ? (on ? '#1f5fd1' : '#16202f') : '#9a5b4c', fs: f, fw: it.sub ? 600 : it.id ? 700 : 500,
            lead: moved || y < ayPk - 4 ? 'opacity:1;' : 'opacity:0;', lx: f1(x0[i2]), ly1: f1(ayPk), ly2: f1(y + 2),
            ld: 'M' + f1(x0[i2]) + ' ' + f1(ayPk) + ' L' + f1(x0[i2]) + ' ' + f1(yk) + ' L' + f1(xs[i2]) + ' ' + f1(y + 2)
          });
        });
      }
      else items.forEach(it => {
        const x = xO(it.t), g = it.id ? gap : fsm + 2;
        let lv = 0; while (lv <= maxLv && x - lastX[lv] < g) lv++;
        if (lv > maxLv) return;                       // no room: revealed by "Show All Labels", zoom or hover
        lastX[lv] = x;
        const ay = yO(K.maxIn(it.t - dtp, it.t + dtp)) - 5, y = Math.max(T + it.txt.length * (it.id ? fs : fsm) * 0.62 + 4, ay - lv * lift);
        const on = it.id && st.hover === it.k, f = it.id ? fs : fsm;
        labels.push({
          tf: 'rotate(-90 ' + f1(x + f * 0.36) + ' ' + f1(y) + ')', x: f1(x + f * 0.36), y: f1(y), txt: it.txt,
          fill: it.sub ? '#4b5870' : it.id ? (on ? '#1f5fd1' : '#16202f') : '#9a5b4c', fs: f, fw: it.sub ? 600 : it.id ? 700 : 500,
          lead: y < ay - 3 ? 'opacity:1;' : 'opacity:0;', lx: f1(x), ly1: f1(ay), ly2: f1(y + 2)
        });
      });
      // --- carbon-range groups: bracket over the elution window, label = table name + table RT ---
      const groups = [], integ = [], hits = [];
      K.list.forEach(c2 => {
        const w = K.win(c2), isG = !!K.grp[c2.k], on = st.hover === c2.k;
        if (!st.injected || st.runMin < w[0] || w[1] < v0 || w[0] > v1) return;
        const xa = xO(Math.max(w[0], v0)), xb = xO(Math.min(w[1], tEnd, v1));
        const hx0 = Math.min(xO(Math.max(w[0], v0)) - 2, xO(c2.rt) - 7), hx1 = Math.max(xO(Math.min(w[1], v1)) + 2, xO(c2.rt) + 7);
        hits.push({ x: f1(hx0), w: f1(hx1 - hx0), y: f1(T), h: f1(B - T),
          enter: () => this.setState({ hover: c2.k }), leave: () => this.setState({ hover: null }) });
        if (isG) {
          const yb = K.gas ? T + (big ? 34 : 26) : Math.max(T + 30, yO(K.maxIn(w[0], w[1])) - (big ? 16 : 12)), xc = K.gas && K.grpC[c2.k] != null ? xO(Math.min(Math.max(K.grpC[c2.k], v0 + span * .08), v1 - span * .08)) : xO(c2.rt);
          const wEnd = K.gas ? Math.min(w[1], tEnd, v1) : Math.min(w[1], v1);
          if (st.runMin >= c2.rt && vis(c2.rt)) groups.push({
            d: 'M' + f1(xO(Math.max(w[0], v0))) + ' ' + f1(yb + 4) + ' L' + f1(xO(Math.max(w[0], v0))) + ' ' + f1(yb) + ' L' + f1(xO(wEnd)) + ' ' + f1(yb) + ' L' + f1(xO(wEnd)) + ' ' + f1(yb + 4),
            x: f1(xc), y1: f1(yb - (big ? 20 : 16)), y2: f1(yb - 5), name: K.gas ? 'C6+ (simulated peaks)' : c2.name, rt: K.gas ? 'from ' + c2.rt.toFixed(2) + ' min' : c2.rt.toFixed(2),
            fill: on ? '#1f5fd1' : '#16202f', fs: big ? 13 : 11, fs2: big ? 11 : 9.5
          });
        }
        // integration boundary on the detector baseline (drawn as the window elutes)
        const done = st.runMin >= w[1];
        if (!isG && !done) return;
        const ya = yO(K.base(Math.max(w[0], v0))), ybb = yO(K.base(Math.min(w[1], tEnd, v1)));
        integ.push({ d: 'M' + f1(xa) + ' ' + f1(ya) + ' L' + f1(xb) + ' ' + f1(ybb) + ' M' + f1(xa) + ' ' + f1(ya - 4) + ' L' + f1(xa) + ' ' + f1(ya + 4) + (done ? ' M' + f1(xb) + ' ' + f1(ybb - 4) + ' L' + f1(xb) + ' ' + f1(ybb + 4) : ''),
          stroke: on ? '#1f5fd1' : '#b0564a', sw: on ? 1.6 : 0.9 });
      });
      // --- hover tooltip ---
      let tip = null;
      const hc = st.hover ? K.list.filter(c2 => c2.k === st.hover)[0] : null;
      if (hc && st.injected && st.runMin >= K.win(hc)[0] && vis(hc.rt)) {
        const r = oilResMap[hc.k], tw = big ? 250 : 210, tx = Math.min(R - tw - 4, Math.max(L + 4, xO(hc.rt) + 10));
        tip = { x: f1(tx), y: f1(T + 6), w: tw, h: big ? 62 : 54, tx: f1(tx + 8), l1y: f1(T + (big ? 24 : 21)), l2y: f1(T + (big ? 40 : 35)), l3y: f1(T + (big ? 56 : 49)),
          l1: hc.name + (K.grp[hc.k] ? ' (carbon-range group)' : '') + ' · RT ' + hc.rt.toFixed(2) + ' min',
          l2: 'Area ' + Math.round(r.area).toLocaleString() + ' · ' + r[K.pct].toFixed(2) + ' ' + K.unit + ' · RF ' + r.rf.toFixed(2),
          l3: K.grp[hc.k] ? 'Window ' + K.win(hc)[0].toFixed(1) + '–' + K.win(hc)[1].toFixed(1) + ' min · ' + (K.gas ? 'simulated peaks' : 'illustrative envelope') : 'Integrated ' + K.win(hc)[0].toFixed(2) + '–' + K.win(hc)[1].toFixed(2) + ' min' + (K.gas ? ' · ' + K.title : ''),
          fs: big ? 11.5 : 10 };
      }
      // --- axes ---
      const xTicks = [], yTicks = [], tTicks = [];
      const stp = K.gas && span > 40 ? (big ? 5 : 15) : niceStep(span / (big ? 14 : 9));
      for (let t = Math.ceil(v0 / stp - 1e-9) * stp; t <= v1 + 1e-9; t += stp) xTicks.push({ x: f1(xO(t)), v: stp < 1 ? t.toFixed(1) : String(Math.round(t)) });
      for (let v = 0; v <= oMax + 1e-6; v += oMax / 4) yTicks.push({ y: f1(yO(v)), ty: f1(yO(v) + 3.5), v: String(Math.round(v)) });
      for (let v = K.tLo; v <= K.tHi; v += K.tStep) tTicks.push({ y: f1(yT(v)), ty: f1(yT(v) + 3.5), v: String(v) });
      const p = K.cfg.program, rEnd = Math.min(ovenRampEnd(K.cfg), RUN);
      const tD = 'M' + [[0, p.T0], [p.hold0, p.T0], [rEnd, p.T1], [RUN, p.T1]].map(q => f1(xO(q[0])) + ' ' + f1(yT(q[1]))).join(' L');
      const legFs = big ? 11.5 : 10;
      return {
        vb: '0 0 ' + W + ' ' + H, W, H, resp: K.resp, axis: K.axis, title: K.title || '', color: K.color || '#1f4fd1', L, R, T, B, span, traceD, labels, groups, integ, hits, tip, showTip: !!tip, xTicks, yTicks, tTicks, tD,
        clipId: big ? K.id + '-big' : K.id, clipUrl: 'url(#' + (big ? K.id + '-big' : K.id) + ')',
        cw: f1(R - L), ch: f1(B - T + 1),
        tNowX: f1(xO(tEnd)), tNowY: f1(yT(ovenAt(K.cfg, tEnd))), tNowStyle: 'opacity:' + (st.injected && st.running && vis(tEnd) ? 1 : 0) + ';',
        cursorStyle: 'opacity:' + (st.running && vis(tEnd) ? 1 : 0) + ';',
        xMid: f1((L + R) / 2), yMid: f1((T + B) / 2), xLab: f1(B + (big ? 40 : 34)), yLabX: big ? 20 : 15, tLabX: W - (big ? 16 : 12),
        xTickY: f1(B + (big ? 18 : 15)), tickLen: f1(B + 5), legY: big ? 20 : 17, legFs, axFs: legFs + 1.5,
        leg2X: L + (big ? 180 : 150), leg2T: L + (big ? 214 : 180),
        progTxt: !big ? 'Oven temperature (\u00b0C): ' + p.T0 + ' \u2192 ' + p.T1 + ' \u00b0C at ' + p.rate + ' \u00b0C/min, then final hold' : 'Oven temperature: ' + p.T0 + ' °C hold ' + p.hold0.toFixed(1) + ' min → ' + p.rate + ' °C/min → ' + p.T1 + ' °C (reached at ' + rEnd.toFixed(1) + ' min), then held to ' + RUN + ' min'
      };
    };
    const zv = st.zv || [0, c.runMin];
    const cbM = isOil ? (meas('[data-gc-chrom]', '_cbM') || { w: 600, h: 520 }) : null;
    const cbB = mode && st.chromBig ? (meas('[data-gc-chrom-big]', '_cbB') || { w: 1300, h: 600 }) : null;
    const chartMain = isOil ? mkChart(K, cbM.w, cbM.h, false, 0, c.runMin) : null;
    const chartBig = isOil && st.chromBig ? mkChart(K, cbB.w, cbB.h, true, zv[0], zv[1]) : null;
    // gas: temperature programme (compact) + TCD + FID, each measured in its own box; the charts share L / R so
    // their time axes line up. Expanded view: TCD over FID with one shared zoom window.
    let chartT = null, chartF = null, chartTB = null, chartFB = null, tempC = null;
    if (isGas) {
      const mT = meas('[data-gc-chrom-t]', '_cbT') || { w: 520, h: 240 }, mF = meas('[data-gc-chrom-f]', '_cbF') || { w: 520, h: 240 };
      chartT = mkChart(KG('TCD'), mT.w, mT.h, false, 0, c.runMin); chartF = mkChart(KG('FID'), mF.w, mF.h, false, 0, c.runMin);
      const mP = meas('[data-gc-temp]', '_cbP') || { w: mT.w, h: 96 };
      tempC = this.tempChart(mP.w, mP.h, chartT.L, chartT.R);
      if (st.chromBig) { const hb = Math.max(160, Math.floor((cbB.h - 6) / 2)); chartTB = mkChart(KG('TCD'), cbB.w, hb, true, zv[0], zv[1]); chartFB = mkChart(KG('FID'), cbB.w, hb, true, zv[0], zv[1]); }
    }
    if (chartBig) this._bigGeom = chartBig; if (chartTB) this._bigGeom = chartTB;
    const zoomTo = (a0, b0) => {
      const RUN = c.runMin, sp = Math.max(0.3, Math.min(RUN, b0 - a0));
      let a1 = a0, b1 = a0 + sp; if (a1 < 0) { a1 = 0; b1 = sp; } if (b1 > RUN) { b1 = RUN; a1 = RUN - sp; }
      this.setState({ zv: [a1, b1] });
    };
    const zoomBy = (fct, ctr) => { const z = this.state.zv || [0, c.runMin], c0 = ctr == null ? (z[0] + z[1]) / 2 : ctr; zoomTo(c0 - (c0 - z[0]) * fct, c0 + (z[1] - c0) * fct); };
    const evT = e => { const g = this._bigGeom, r = e.currentTarget.getBoundingClientRect(), z = this.state.zv || [0, c.runMin]; const xv = (e.clientX - r.left) / r.width * g.W; return z[0] + (xv - g.L) / (g.R - g.L) * (z[1] - z[0]); };

    // ---------- oven temperature programme, drawn over the chromatogram ----------
    const tprog = c.program;
    const TY0 = 34, TY1 = 236;                       // band the T curve lives in
    const tyOf = T => tprog
      ? TY1 - ((T - tprog.T0) / Math.max(1, tprog.T1 - tprog.T0)) * (TY1 - TY0)
      : TY1;
    let tProgD = '', tProgText = '', tNowX = X0, tNowY = TY1, tNowLabel = '';
    if (tprog && mode) {
      const rEnd = Math.min(ovenRampEnd(c), c.runMin);
      const nodes = [[0, tprog.T0], [tprog.hold0, tprog.T0], [rEnd, tprog.T1], [c.runMin, tprog.T1]];
      tProgD = 'M' + nodes.map(q => xOf(q[0]).toFixed(1) + ' ' + tyOf(q[1]).toFixed(1)).join(' L');
      tProgText = 'OVEN  ' + tprog.T0 + ' \u00b0C hold ' + tprog.hold0.toFixed(1)
                + ' min  \u2192  ' + tprog.rate + ' \u00b0C/min  \u2192  ' + tprog.T1 + ' \u00b0C';
      const tt = st.injected ? Math.min(st.runMin, c.runMin) : 0;
      const TT = ovenAt(c, tt);
      tNowX = xOf(tt).toFixed(1);
      tNowY = tyOf(TT).toFixed(1);
      tNowLabel = Math.round(TT) + ' \u00b0C';
    }
    const curSig = st.injected && st.running ? (isOil ? oSigAt(tNow) : sig(tNow)) : (st.injected ? 0 : null);
    // oil: which component is eluting now, by detection count only
    const oilAct = isOil && geom.length ? (geom[st.nDet] || null) : null;
    if (st.injected) {
      const lead = detected.length ? detected[detected.length - 1] : null;
      const nextC = geom.filter(g => g.c.rt > st.runMin)[0];
      strip[7] = isOil
        ? { k:'Current Component', v: st.running ? (st.detK ? st.detK + ' Detected' : 'mixture in column') : (st.complete ? 'run complete' : '—'), color: st.running ? (st.detC || 'var(--blue)') : 'var(--txt)' }
        : { k:'Current Component', v: st.running ? (lead && Math.abs(st.runMin - lead.c.rt) < 2.5 * lead.w ? lead.c.k : (nextC ? 'eluting → ' + nextC.c.k : '—')) : (st.complete ? 'run complete' : '—'), color: st.running ? 'var(--blue)' : 'var(--txt)' };
      strip[8] = { k:'Detector Response', v: curSig == null ? '—' : Math.round(curSig) + (isOil ? ' mV' : ' pA'), color: curSig > 1 ? 'var(--grn)' : 'var(--mut)' };
    }

    // ---------- bands in the column ----------
    const bands = [], gBands = [];
    // gas: every component rides BOTH paths. Packed path -> TCD (all respond, TCD retention times);
    // capillary path -> FID (FID retention times; N2 / CO2 drawn hollow = pass the flame with no signal)
    if (isGas && st.injected && (st.running || (st.runMin > 0 && !st.complete))) {
      const t = st.runMin;
      [['pak', GPAK_P, GTCD, 'rtT'], ['cap', GCAP_P, GFID, 'rtF']].forEach(([ch, P, D, rk]) => {
        const trav = GAS_COMPS.map(d => ({ d, rt: d[rk] })).sort((x, y) => x.rt - y.rt);
        let actK = null;
        trav.forEach(q => { if (t >= q.rt - G_LEAD && t <= q.rt + G_LEAD) actK = q.d.k; });
        if (!actK) { let bf = -1; trav.forEach((q, n) => { const f = bandF(q.rt, t, n, G_LEAD, G_MIX); if (f < 1 && f > bf) { bf = f; actK = q.d.k; } }); }
        trav.forEach((q, n) => {
          const d = q.d, f = bandF(q.rt, t, n, G_LEAD, G_MIX), inDet = t >= q.rt - G_LEAD && t <= q.rt + G_LEAD;
          if (f <= 0 || (f >= 1 && !inDet)) return;
          const p = f >= 1 ? [D.x, D.y] : P.at(P.fCoil + (1 - P.fCoil) * f);
          const on = d.k === actK, ghost = ch === 'cap' && !d.hc;
          const ring = ch === 'cap' ? '#f3b24a' : '#35d0b0';
          gBands.push({
            k: d.k, x: p[0].toFixed(1), y: p[1].toFixed(1), r: ghost ? 3.6 : (on ? 5.6 : 4.4),
            hr: ghost ? 0 : (on ? 11 : 8.5), halo: d.c + (on ? '3a' : '24'),
            fill: ghost ? 'rgba(14,19,27,.85)' : d.c + (on ? 'ff' : 'cc'), stroke: ghost ? '#8a97a8' : ring, sw: ghost ? 1.1 : 1.6,
            style: 'opacity:' + (ghost ? .8 : 1) + ';',
            lx: p[0].toFixed(1), ly: (p[1] - 14).toFixed(1), lc: ch === 'cap' ? '#ffd48a' : '#8ff0da',
            labelStyle: on && f < 1 && !ghost ? 'opacity:.95;' : 'opacity:0;'
          });
        });
      });
    }
    if (isOil && st.injected && (st.running || (st.runMin > 0 && !st.complete))) {
      {
        const t = st.runMin;
        const LEAD = leadOf(c), MIXT = mixTOf(c);
        // gas rides the identical coil with its own components; oil keeps its C1-C7 teaching set
        const travellers = geom.map(g => g.c);
        let leadK = null, leadF = -1, detNow = null;
        travellers.forEach((d, n) => {
          const Ld = isOil ? d.rt - oDet(d) : LEAD, f = bandF(d.rt, t, n, Ld, MIXT);
          if (isOil ? (t >= oWin(d)[0] && t <= oWin(d)[1]) : (t >= d.rt - LEAD && t <= d.rt + LEAD)) detNow = d.k;
          if (f < 1 && f > leadF) { leadF = f; leadK = d.k; }
        });
        const activeK = detNow || leadK;
        travellers.forEach((d, n) => {
          const Ld = isOil ? d.rt - oDet(d) : LEAD, f = bandF(d.rt, t, n, Ld, MIXT), inDet = isOil ? (t >= oWin(d)[0] && t <= oWin(d)[1]) : (t >= d.rt - LEAD && t <= d.rt + LEAD);
          if (f <= 0 || (f >= 1 && !inDet)) return;
          const p = f >= 1 ? [NDET_X, NDET_Y] : (isOil ? ncolPt(f) : ncolPt(G_F4 + (1 - G_F4) * f));
          const on = d.k === activeK;
          bands.push({
            k: isOil ? d.name : d.k, x: p[0].toFixed(1), y: p[1].toFixed(1), r: on ? 5.6 : 4.4,
            hr: on ? 11 : 8.5, halo: d.c + (on ? '3a' : '24'),
            fill: d.c + (on ? 'ff' : 'cc'), stroke: d.c,
            style: 'opacity:1;',
            lx: p[0].toFixed(1), ly: (p[1] - 14).toFixed(1),
            labelStyle: on && f < 1 ? 'opacity:.95;' : 'opacity:0;'
          });
        });
      }
    }
    // stationary/mobile-phase inset dots
    const insetDots = [];
    if (mode && st.injected && st.running) {
      geom.slice(0, 6).forEach((g, n) => {
        const f = (st.runMin / g.c.rt) % 1;
        const x = 486 + f * 306;
        const inPhase = Math.sin(st.runMin * 3 + n * 1.7) > 0.25;
        insetDots.push({ x: x.toFixed(1), y: inPhase ? 517 : 509, c: g.c.c });
      });
    }

    // ---------- results table ----------
    const res = mode ? this.results() : [];
    const cpx = isGas ? '5px' : '7px';   // gas table carries the extra Channel column
    const th = 'display:table-cell; vertical-align:middle; text-align:right; padding:4px ' + cpx + '; font-weight:600; font-size:8.5px; letter-spacing:.5px; text-transform:uppercase; color:var(--mut); background:var(--panel2); position:sticky; top:0; border-bottom:1px solid var(--line); white-space:nowrap;';
    const thL = th.replace('text-align:right', 'text-align:left');
    const tdBase = 'display:table-cell; vertical-align:middle; text-align:right; padding:3px ' + cpx + '; border-bottom:1px solid var(--line); white-space:nowrap; color:var(--txt2);';
    const heads = (isOil
      ? ['Component / Cn','RT (min)','Peak Area','RF','MW (g/mol)','Mass Frac','Mole Frac','Comp (mass%)']
      : ['Component','Formula','Channel','RT (min)','Peak Area','RF','Mole Frac','Comp (mol%)']
    ).map((k, n) => ({ k, style: n === 0 ? thL : th }));

    const rows = [];
    res.forEach(r => {
      const on = st.hover === r.c.k;
      const cells = (isOil
        ? [r.c.name, r.c.rt.toFixed(2), Math.round(r.area).toLocaleString(), r.rf.toFixed(2), r.c.mw, (r.massPct/100).toFixed(4), (r.molPct/100).toFixed(4), r.massPct.toFixed(2)]
        : [r.c.name, r.c.f, r.c.ch, r.c.rt.toFixed(2), Math.round(r.area).toLocaleString(), r.rf.toFixed(2), (r.molPct/100).toFixed(4), r.molPct.toFixed(2)]
      ).map((v, n) => ({ v, style: n === 0
        ? tdBase.replace('text-align:right','text-align:left') + 'color:' + r.c.c + '; font-weight:600;'
        : (isGas && n === 2)
          ? tdBase.replace('text-align:right','text-align:left') + 'font-weight:700; color:' + (r.c.ch === 'TCD' ? '#b8741a' : '#12917a') + ';'
          : tdBase + (n === (isOil ? 7 : 7) ? 'font-weight:600; color:var(--txt);' : '') }));
      rows.push({ cells, style: 'display:table-row; background:' + (on ? 'rgba(47,111,208,.08)' : 'transparent') + '; transition:background .15s ease;', enter: () => this.setState({ hover: r.c.k }), leave: () => this.setState({ hover: null }) });
    });
    if (isOil && res.length) {
      const sum = g => res.filter(r => g.indexOf(r.c.g) >= 0).reduce((a, r) => a + r.massPct, 0);
      const subs = [
        ['C1–C5 subtotal', sum(['le'])],
        ['C6–C10 subtotal', sum(['m'])],
        ['C11–C20 subtotal', sum(['h1'])],
        ['C21–C35 subtotal', sum(['h2'])],
        ['C36+ fraction', sum(['p'])]
      ];
      subs.forEach(s => rows.push({
        cells: [{ v: s[0], style: tdBase.replace('text-align:right','text-align:left') + 'color:var(--mut); font-weight:600;' }]
          .concat([1,2,3,4,5,6].map(() => ({ v: '', style: tdBase })))
          .concat([{ v: s[1].toFixed(2), style: tdBase + 'font-weight:600; color:var(--txt2);' }]),
        style: 'display:table-row; background:var(--panel2);', enter: () => {}, leave: () => {}
      }));
    }
    if (isGas && res.length) {
      // channel subtotals: non-HC reported from the TCD, HC reported from the FID
      [['Non-HC subtotal (TCD)', res.filter(r => !r.c.hc)], ['HC subtotal (FID)', res.filter(r => r.c.hc)]].forEach(sb => rows.push({
        cells: [{ v: sb[0], style: tdBase.replace('text-align:right','text-align:left') + 'color:var(--mut); font-weight:600;' }]
          .concat([1,2,3,4,5,6].map(() => ({ v: '', style: tdBase })))
          .concat([{ v: sb[1].reduce((a, r) => a + r.molPct, 0).toFixed(2), style: tdBase + 'font-weight:600; color:var(--txt2);' }]),
        style: 'display:table-row; background:var(--panel2);', enter: () => {}, leave: () => {}
      }));
    }
    if (res.length) {
      const total = res.reduce((a, r) => a + (isOil ? r.massPct : r.molPct), 0);
      rows.push({
        cells: [{ v: 'Total Composition', style: tdBase.replace('text-align:right','text-align:left') + 'color:var(--txt); font-weight:700;' }]
          .concat([1,2,3,4,5,6].map(() => ({ v: '', style: tdBase })))
          .concat([{ v: total.toFixed(2) + (isOil ? ' mass%' : ' mol%'), style: tdBase + 'font-weight:700; color:var(--grn);' }]),
        style: 'display:table-row; background:rgba(29,138,90,.07);', enter: () => {}, leave: () => {}
      });
    }
    // plus-fraction closing block: what the oil report hands to PVT/EOS work
    if (isOil && res.length) {
      const plus  = res.filter(r => r.c.g === 'p');
      const plusM = plus.reduce((a, r) => a + r.massPct, 0);
      const avgMW = res.reduce((a, r) => a + (r.molPct / 100) * r.c.mw, 0);
      const foot = [
        ['C36+ molecular weight', plus.length ? plus[0].c.mw.toFixed(0) + ' g/mol' : '—'],
        ['C36+ mass fraction',    plusM.toFixed(2) + ' mass%'],
        ['Average oil MW  (\u03a3 z\u1d62\u00b7M\u1d62)', avgMW.toFixed(1) + ' g/mol']
      ];
      foot.forEach(f => rows.push({
        cells: [{ v: f[0], style: tdBase.replace('text-align:right','text-align:left') + 'color:var(--mut); font-weight:600;' }]
          .concat([1,2,3,4,5,6].map(() => ({ v: '', style: tdBase })))
          .concat([{ v: f[1], style: tdBase + 'font-weight:600; color:var(--txt2);' }]),
        style: 'display:table-row; background:var(--panel2);', enter: () => {}, leave: () => {}
      }));
    }

    // ---------- phases / steps ----------
    const activePh = st.complete ? 6 : (st.running ? (detected.length ? 4 : 3) : (cur ? cur.ph : 0));
    const phChip = (on, past) => 'display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:999px; font-size:10px; font-weight:' + (on ? '600' : '500') + '; white-space:nowrap; background:' + (on ? 'rgba(47,111,208,.10)' : past ? 'rgba(29,138,90,.08)' : 'var(--chipbg)') + '; border:1px solid ' + (on ? 'rgba(47,111,208,.45)' : past ? 'rgba(29,138,90,.35)' : 'var(--line)') + '; color:' + (on ? 'var(--blue)' : past ? 'var(--grn)' : 'var(--mut)') + ';';
    const phases = PHASES.map((p, n) => ({ n: String(n+1).padStart(2,'0'), name: p, style: phChip(n === activePh, n < activePh), numColor: n === activePh ? 'var(--blue)' : n < activePh ? 'var(--grn)' : 'var(--mut2)' }));

    const btn = (on, kind) => 'font-family:inherit; font-size:' + (kind === 'main' ? '11px' : '10.5px') + '; font-weight:600; white-space:nowrap; padding:7px ' + (kind === 'main' ? '15px' : '12px') + '; border-radius:8px; cursor:' + (on ? 'pointer' : 'not-allowed') + '; background:' + (on ? (kind === 'main' ? 'linear-gradient(180deg,#46d39a,#2f9d72)' : 'var(--panel)') : 'var(--icard)') + '; border:1px solid ' + (on ? (kind === 'main' ? '#2f9d72' : 'var(--line2)') : 'var(--line)') + '; color:' + (on ? (kind === 'main' ? '#06231a' : 'var(--txt2)') : 'var(--dis)') + ';';

    const canAct = this.canActivate();
    const canPrev = i > 0 && !st.busy;
    const canNext = i < steps.length - 1 && this.stepDone(i) && !st.busy;
    const canAuto = !st.busy && !st.paused && !st.complete;

    /* chromatogram / results appear once the sample is injected (the measurement); during the
       set-up steps the schematic gets the width and the readiness list stands in the side column */
    const gcRes = !!(st.injected || st.running || st.runMin > 0 || st.complete || st.results);
    const ready = [
      { k:'Carrier flow stable', on: st.rdy.flow }, { k:'Injector ready', on: st.rdy.inj },
      { k:'Oven ready', on: st.rdy.oven }, { k:'Detector ready', on: st.rdy.det }, { k:'Baseline stable', on: st.rdy.base }
    ].map(r => ({ k: r.k, style: 'display:flex; align-items:center; gap:5px; padding:3px 7px; border-radius:7px; background:' + (r.on ? 'rgba(29,138,90,.08)' : 'var(--panel2)') + '; border:1px solid ' + (r.on ? 'rgba(29,138,90,.35)' : 'var(--line)') + '; color:' + (r.on ? 'var(--grn)' : 'var(--mut)') + '; min-width:0;', dot: 'width:6px; height:6px; border-radius:50%; flex:0 0 auto; background:' + (r.on ? 'var(--grn)' : 'var(--mut2)') + ';' }));

    const rdyChip = r => ({ k: r.k, style: 'display:flex; align-items:center; gap:5px; padding:3px 7px; border-radius:7px; background:' + (r.on ? 'rgba(29,138,90,.08)' : 'var(--panel2)') + '; border:1px solid ' + (r.on ? 'rgba(29,138,90,.35)' : 'var(--line)') + '; color:' + (r.on ? 'var(--grn)' : 'var(--mut)') + '; min-width:0;', dot: 'width:6px; height:6px; border-radius:50%; flex:0 0 auto; background:' + (r.on ? 'var(--grn)' : 'var(--mut2)') + ';' });
    const gasReady = isGas ? [
      { k:'Carrier flow stable', on: st.flowStable }, { k:'Sample line evacuated', on: st.vacDone },
      { k:'Vacuum isolated', on: st.isoDone && !(st.vvOpen > 0) }, { k:'Loop loaded', on: st.loaded }, { k:'Sample injected', on: st.injected }
    ].map(rdyChip) : [];

    // ---------- gas schematic (2026-09-30): carrier, 6-port valve + loop, sample line, vacuum branch ----------
    const gB = c.bal || {}, gV = c.vac || {};
    const fmtP = v => v == null ? '—' : (v < 0.1 ? v.toFixed(3) : v.toFixed(2));
    // sample fill (LOAD): line -> rotor P4-P3 -> loop -> rotor P6-P5; each part gets its own fill fraction
    const sf = st.sFill || 0, FP = GFILL_P;
    const part = (a0, a1) => Math.max(0, Math.min(1, (sf - a0) / (a1 - a0)));
    const fLine = part(0, FP.f1), fB = part(FP.f1, FP.f2), fLoop = part(FP.f2, FP.f3), fC = part(FP.f3, 1);
    const gFront = FP.at(sf);
    const swp = st.sweep || 0, slugD = Math.min(1, swp / 0.62);            // slug travel along the INJECT path
    const plugU = swp > 0.55 ? Math.min(1, (swp - 0.55) / 0.45) : 0;     // plugs from the split tee to the coil heads
    const gPlugC = GCAP_P.at(GCAP_P.fSplit + plugU * (GCAP_P.fCoil - GCAP_P.fSplit)), gPlugP = GPAK_P.at(GPAK_P.fSplit + plugU * (GPAK_P.fCoil - GPAK_P.fSplit));
    const gPlugOn = isGas && swp > 0.55 && !st.running && !(st.runMin > 0);
    const heatW = st.heat || 0;
    const heF = Math.max(0, Math.min(1, (st.flowIn - 0.12) / 0.88));
    const heDotC = GCAP_P.at(heF), heDotP = GPAK_P.at(heF);
    // mini traces on the computer screen: TCD (top) and FID (bottom), both building with the run
    const miniTr = (SIG, y0, y1) => {
      if (!(isGas && st.injected)) return 'M1042 ' + y1;
      const x0 = 1042, x1 = 1172, cols = Math.max(1, Math.round((Math.min(st.runMin, c.runMin) / c.runMin) * (x1 - x0))), pts = [];
      for (let k = 0; k < cols; k++) { const a = k / (x1 - x0) * c.runMin, b = Math.min((k + 1) / (x1 - x0) * c.runMin, st.runMin); const m = gSigMax(SIG, a, b); pts.push((x0 + k + .5).toFixed(1) + ' ' + (y1 - Math.min(1, m / 110) * (y1 - y0)).toFixed(1)); }
      return pts.length ? 'M' + pts.join(' L') : 'M1042 ' + y1;
    };
    const tcdHit = st.pulse ? GAS_COMPS.filter(x => x.k === st.pulse)[0] : null;
    const fidHit = st.fpulse ? GAS_COMPS.filter(x => x.k === st.fpulse)[0] : null;
    const detReady = st.det === 'Ready';
    const ivA = (st.ivOn || 0) * 60, vvA = -(1 - (st.vvOpen || 0)) * 90, bvA = -(1 - (st.bvOpen || 0)) * 90;
    const injNow = st.ivOn > 0.5, vvOpenNow = st.vvOpen > 0.5, bvOpenNow = st.bvOpen > 0.5;
    const heOn = st.carrier && st.flow > 0;
    const flameOnG = st.det === 'Ready';
    const vis = on => 'opacity:' + (on ? 1 : 0) + '; transition:opacity .4s ease;';
    const fillDash = f => (f * 100).toFixed(2) + ' 200';
    // ghost (non-HC) band reaching the FID: no response
    const fidGhost = isGas && st.running ? GAS_COMPS.filter(d => !d.hc && Math.abs(st.runMin - d.rtF) < G_LEAD)[0] : null;
    const gasVals = !isGas ? {} : {
      gcQCarD: GCAR_D, gcQStubD: GSTUB_D, gcQLineD: SLINE_D, gcQBotD: SAMP_BOT_D, gcQLoopXD: LOOPX_D, gcQLoopD: SLOOP_D,
      gcQInjD: GINJ_P.d, gcQVac1D: GVAC1_D, gcQVac2D: GVAC2_D, gcQVacBrD: GVAC_BR_D, gcQVacHoseD: GVAC_HOSE_D, gcQTapD: GTAP_D,
      gcQChA: gvArcD(30, 90), gcQChB: gvArcD(150, 210), gcQChC: gvArcD(270, 330),
      gcQPorts: GV_PORTS.map(q => ({ x: q.h[0], y: q.h[1], fx: q.f[0], fy: q.f[1], tf: 'rotate(' + (q.a + 90) + ' ' + q.f[0] + ' ' + q.f[1] + ')', n: String(q.n),
        lx: (GV.x + 14.5 * Math.cos(q.a * Math.PI / 180)).toFixed(1), ly: (GV.y + 14.5 * Math.sin(q.a * Math.PI / 180) + 2.8).toFixed(1) })),
      gcQVacStyle: vis(st.vacOn),
      // removable pump + hose: hidden until the evacuation step, removed after the vacuum valve closes
      gcQPumpShow: 'opacity:' + (st.pumpShow || 0).toFixed(3) + '; transform:translateY(' + ((1 - (st.pumpShow || 0)) * 10).toFixed(1) + 'px);',
      gcQPumpLed: st.pumpRun ? '#46d39a' : '#3a4c66',
      gcQPumpState: st.vacOn ? 'EVACUATING · ' + fmtP(st.lineP) + ' ' + gV.unit : (st.pumpRun ? 'RUNNING' : 'STOPPED'),
      gcQPumpHl: 'transition:filter .3s ease; filter:' + (st.hl === 'vac' ? 'drop-shadow(0 0 7px rgba(157,112,240,.7))' : 'none') + ';',
      // vacuum valve (quarter-turn): handle along the pipe = OPEN, across = CLOSED
      gcQVvRot: 'rotate(' + vvA.toFixed(1) + ' ' + GVV.x + ' ' + GVV.y + ')',
      gcQVvColor: vvOpenNow ? '#2f9d72' : '#c33a3a',
      gcQVvState: st.vvOpen > 0 && st.vvOpen < 1 ? (st.vacOn ? 'CLOSING' : 'OPENING') : (vvOpenNow ? 'OPEN' : 'CLOSED'),
      gcQVvStateColor: vvOpenNow ? 'var(--grn)' : 'var(--red)',
      gcQVvHl: 'transition:filter .3s ease; filter:' + (st.hl === 'vac' ? 'drop-shadow(0 0 6px rgba(157,112,240,.8))' : 'none') + ';',
      // bottle outlet valve (inside the balloon oven)
      gcQBvRot: 'rotate(' + bvA.toFixed(1) + ' ' + BV.x + ' ' + BV.y + ')',
      gcQBvColor: bvOpenNow ? '#2f9d72' : '#c33a3a',
      gcQBvState: st.bvOpen > 0 && st.bvOpen < 1 ? 'OPENING' : (bvOpenNow ? 'OPEN' : 'CLOSED'),
      gcQBvStateColor: bvOpenNow ? 'var(--grn)' : 'var(--red)',
      gcQBvHl: 'transition:filter .3s ease; filter:' + (st.hl === 'bv' ? 'drop-shadow(0 0 7px rgba(47,111,208,.85))' : 'none') + ';',
      // 6-port valve: rotor turns 60° LOAD -> INJECT
      gcQIvRot: 'rotate(' + ivA.toFixed(1) + ' ' + GV.x + ' ' + GV.y + ')',
      gcQIvState: st.ivOn > 0 && st.ivOn < 1 ? 'SWITCHING' : (injNow ? 'INJECT' : 'LOAD'),
      gcQIvStateColor: injNow ? '#2f6fd0' : '#1d8a5a',
      gcQIvPill: injNow ? 'rgba(47,111,208,.10)' : 'rgba(29,138,90,.10)',
      gcQIvPillStroke: injNow ? 'rgba(47,111,208,.5)' : 'rgba(29,138,90,.45)',
      gcQIvL1: injNow ? 'He: 1 → 6 → loop → 3 → 2' : 'He: 1 → 2 (loop bypassed)',
      gcQIvL2: injNow ? 'Sample line: 4 → 5 (capped)' : 'Sample: 4 → 3 → loop → 6 → 5',
      gcQIvHl: 'transition:filter .3s ease; filter:' + (st.hl === 'iv' ? 'drop-shadow(0 0 7px rgba(47,111,208,.8))' : 'none') + ';',
      // rotor channel contents (channel A = carrier in both positions; C = carrier once injecting; B/C hold sample)
      gcQChBr: gvArcD(210, 150), gcQChCr: gvArcD(330, 270), gcQChAr: gvArcD(90, 30),
      gcQChAFlowL: vis(heOn && !injNow), gcQChAFlowI: vis(heOn && injNow), gcQChCFlow: vis(heOn && injNow),
      gcQChBFill: fillDash(fB), gcQChCFill: fillDash(fC), gcQChCFillStyle: 'opacity:' + (fC > 0 && swp <= 0 ? 1 : 0) + ';',
      gcQLineFill: fillDash(fLine), gcQLoopFill: fillDash(fLoop), gcQLoopFillStyle: 'opacity:' + (fLoop > 0 && swp <= 0 ? .95 : 0) + ';',
      gcQStubFill: vis(sf >= FP.fTee),
      gcQSampFlow: vis(st.sFlow), gcQLineSampStyle: 'opacity:' + (fLine > 0 ? .95 : 0) + ';',
      gcQFrontX: gFront[0].toFixed(1), gcQFrontY: gFront[1].toFixed(1), gcQFrontStyle: vis(st.sFlow && sf > 0 && sf < 1),
      // injection sweep: slug = loop contents (plus rotor channel P6-P1), carried along the INJECT path
      gcQSlugDash: (GINJ_P.fSlug * 100).toFixed(2) + ' 300', gcQSlugOff: (-slugD * 100).toFixed(2),
      gcQSlugStyle: 'opacity:' + (swp > 0 && slugD < 1 ? 1 : 0) + ';',
      gcQInjCar: vis(heOn && injNow),
      gcQPlugStyle: vis(gPlugOn),
      gcQPlugCX: gPlugC[0].toFixed(1), gcQPlugCY: gPlugC[1].toFixed(1), gcQPlugPX: gPlugP[0].toFixed(1), gcQPlugPY: gPlugP[1].toFixed(1),
      gcQHeStyle: vis(st.heFront && st.flowIn > 0.1 && st.flowIn < 0.99),
      gcQHeCX: heDotC[0].toFixed(1), gcQHeCY: heDotC[1].toFixed(1), gcQHePX: heDotP[0].toFixed(1), gcQHePY: heDotP[1].toFixed(1),
      // dual column set + detectors
      gcGHeadD: GHEAD_D, gcGCapD: GCAP_P.d, gcGPakD: GPAK_P.d, gcGBands: gBands,
      gcGSplitHl: 'transition:filter .3s ease; filter:' + (swp > 0.4 && swp < 1 ? 'drop-shadow(0 0 6px rgba(95,176,255,.95))' : 'none') + ';',
      gcGHeFlow: 'opacity:' + (st.flowStable || st.flowIn > 0.2 ? .9 : 0) + '; transition:opacity .6s ease;',
      gcGTcdStroke: tcdHit ? tcdHit.c : (st.hl === 'det' ? '#6fc7f0' : (detReady ? '#35d0b0' : '#4a5f7e')),
      gcGTcdGlow: tcdHit ? tcdHit.c + '66' : (detReady ? 'rgba(53,208,176,.14)' : 'rgba(111,199,240,.08)'),
      gcGTcdRing: tcdHit ? tcdHit.c : 'transparent', gcGTcdRingR: tcdHit ? 34 : 12,
      gcGTcdRingStyle: 'opacity:' + (tcdHit ? .9 : 0) + '; transition:r .35s ease, opacity .35s ease;',
      gcGTcdWire: detReady ? '#e0846b' : '#3a4c66',
      gcGTcdInd: st.detK ? '● ' + st.detK : '', gcGTcdIndColor: st.detC || 'var(--cap)',
      gcGTcdIndStyle: vis(st.detK && (st.running || st.runMin > 0)),
      gcGFidStroke: fidHit ? fidHit.c : (st.hl === 'det' ? '#6fc7f0' : (detReady ? '#f3b24a' : '#4a5f7e')),
      gcGFidRing: fidHit ? fidHit.c : 'transparent', gcGFidRingR: fidHit ? 34 : 12,
      gcGFidRingStyle: 'opacity:' + (fidHit ? .9 : 0) + '; transition:r .35s ease, opacity .35s ease;',
      gcGFlameFill: flameOnG ? (fidHit ? fidHit.c : 'rgba(126,200,255,.9)') : 'rgba(90,110,135,.3)',
      gcGFlameStyle: 'transform-box:fill-box; transform-origin:center bottom;' + (flameOnG && !st.paused ? ' animation:gcflame 1.3s ease-in-out infinite;' : ''),
      gcGFidInd: st.fidK ? '● ' + st.fidK : '', gcGFidIndColor: st.fidC || 'var(--cap)',
      gcGFidIndStyle: vis(st.fidK && (st.running || st.runMin > 0)),
      gcGFidNote: fidGhost ? fidGhost.k + ' passes · no FID signal' : '',
      gcGFidNoteStyle: vis(!!fidGhost),
      gcGMiniTcdD: miniTr(TCD_SIG, 530, 574), gcGMiniFidD: miniTr(FID_SIG, 588, 630),
      gcQHeatStyle: 'opacity:' + (heatW * 0.9).toFixed(3) + ';',
      gcQElemColor: heatW > 0.02 ? 'rgb(' + Math.round(120 + 135 * heatW) + ',' + Math.round(90 + 20 * heatW) + ',' + Math.round(70 - 30 * heatW) + ')' : '#6b7686',
      gcQShimmer: 'opacity:0;',
      gcQBalTint: 'opacity:' + (heatW * 0.55).toFixed(3) + ';',
      gcQOvenT: st.balT == null ? '—' : Math.round(st.balT) + ' °C',
      gcQOvenSet: 'SET ' + gB.Tset + ' °C',
      gcQOvenTColor: '#7fe3b4',
      gcQBalP: st.injP == null ? '—' : st.injP.toFixed(1), gcQBalUnit: (c.injP || {}).unit,
      gcQBalHl: 'transition:filter .3s ease; filter:' + (st.hl === 'bal' ? 'drop-shadow(0 0 6px rgba(47,111,208,.75))' : 'none') + ';',
      gcQBalTag: st.sFlow ? 'SAMPLE FLOWING' : (bvOpenNow ? 'VALVE OPEN' : 'VALVE CLOSED'),
      gcQBalTagColor: st.sFlow ? '#2f6fd0' : (bvOpenNow ? '#1d8a5a' : '#3a4759')
    };

    // ---------- schematic values ----------
    const regA = -140 + st.reg * 190, regR = 13;
    // balloon charge: full from the Flash Unit, drawn down slightly by purge and loop filling
    const balFrac = Math.max(0, 1 - (st.purged ? 0.05 : 0) - st.loopFill * 0.15);
    const balBry = 13 + balFrac * 44;
    const dsBarPct = Math.round((st.complete ? 1 : st.dsBar) * 100) + '%';
    const flameOn = st.rdy.det;
    const pulseComp = st.pulse ? this.comps().filter(x => x.k === st.pulse)[0] : null;
    const pulseIsTcd = pulseComp && pulseComp.ch === 'TCD';
    const injHot = st.injT != null && st.injT > 80;
    const ovenHot = st.ovenT != null && st.ovenT > 45;
    const ovenNorm = st.ovenT == null ? 0 : Math.min(1, Math.max(0, (st.ovenT - 25) / (c.ovenEnd - 25)));

    // ---------- oil schematic geometry (syringe waypoints remapped, procedure logic untouched) ----------
    const sxN = Math.max(0, Math.min(1, (st.syrX - 116) / 382));
    const syN = Math.max(0, Math.min(1, (st.syrY - 24) / 190));
    const oSyrX = 230 + sxN * (630 - 230), oSyrY = 150 + sxN * 40 + syN * 50, oSyrS = 0.72 + sxN * 0.28;
    const gaugeA = -140 + st.reg * 190, gaugeR = 17;
    let miniD = 'M1108 428';
    if (st.injected) {
      const mx0 = 1108, mx1 = 1198, my0 = 330, my1 = 428, n = 130, pts = [];
      for (let s = 0; s <= n; s++) { const t = tNow * (s / n); pts.push((mx0 + (t / c.runMin) * (mx1 - mx0)).toFixed(1) + ' ' + (my1 - (sig(t) / maxH) * (my1 - my0)).toFixed(1)); }
      miniD = 'M' + pts.join(' L');
    }
    // oil instrument view: same procedure values, new drawing coordinates
    const nSyrX = 199 + sxN * (432 - 199), nSyrY = 112 + sxN * 24 + syN * (150 - 61 * sxN), nSyrS = 0.72 + sxN * 0.2;
    let nMiniD = 'M1042 626';
    if (st.injected) {
      const mx0 = 1042, mx1 = 1172, my0 = 532, my1 = 626, n = 130, pts = [];
      const cols = Math.max(1, Math.round((tNow / c.runMin) * (mx1 - mx0)));
      for (let k = 0; k < cols; k++) { const t0 = k / (mx1 - mx0) * c.runMin, t1 = (k + 1) / (mx1 - mx0) * c.runMin; const mx = K.maxIn(t0, Math.min(t1, tNow)); pts.push((mx0 + k + .5).toFixed(1) + ' ' + (my1 - Math.min(1, mx / 120) * (my1 - my0)).toFixed(1)); }
      nMiniD = 'M' + pts.join(' L');
    }
    const oInset = [];
    // ---- oil: helium supply gauges, cylinder valve, flow controller ----
    const gNeedle = (cx, cy, f) => { const a = (135 + 270 * Math.max(0, Math.min(1, f))) * Math.PI / 180; return { x: (cx + 15 * Math.cos(a)).toFixed(1), y: (cy + 15 * Math.sin(a)).toFixed(1) }; };
    const gCyl = gNeedle(28, 261, HE.cyl / HE.cylMax), gOut = gNeedle(132, 261, st.reg * HE.out / HE.outMax);
    const cvOpen = st.cylV >= 1;
    const cvRidges = [0, 1, 2, 3, 4].map(k => ({ x: (62 + ((k * 8 + st.cylV * 28) % 40)).toFixed(1) }));
    const nFlowOn = (isOil || isGas) && st.carrier && st.flow > 0;
    const nCtrlHl = st.hl === 'ctrl';
    // ---- oil: automatic liquid sampler tray (perspective ring, back-to-front draw order) ----
    const asVials = [];
    for (let k = 1; k <= AS.n; k++) {
      const a = (90 + (k - 1) * 360 / AS.n - st.trayRot) * Math.PI / 180, sn = Math.sin(a), sc = 0.8 + 0.2 * sn;
      const x = AS.cx + AS.R * Math.cos(a), yb = AS.cy + AS.r * sn;
      const has = AS.vials.indexOf(k) >= 0, isSel = k === AS.sel, on = isSel && st.asSel;
      const w = 14.4 * sc, h = 29 * sc, liq = (isSel ? 15.6 : 11 + (k % 3) * 2.4) * sc;
      asVials.push({
        yb, show: has ? 'opacity:1;' : 'opacity:0;',
        hx: (x - 7.5 * sc).toFixed(1), hy: (yb - 2.2 * sc).toFixed(1), hw: (13 * sc).toFixed(1), hh: (4.4 * sc).toFixed(1),
        bx: (x - w / 2).toFixed(1), by: (yb - h).toFixed(1), bw: w.toFixed(1), bh: h.toFixed(1),
        lx: (x - w / 2 + 1.2).toFixed(1), ly: (yb - liq - 1).toFixed(1), lw: (w - 2.4).toFixed(1), lh: liq.toFixed(1),
        lfill: isSel ? 'rgba(214,150,52,.92)' : (k % 4 === 0 ? 'rgba(236,226,196,.75)' : 'rgba(196,140,70,.72)'),
        tx: (x - w / 2).toFixed(1), ty: (yb - h * 0.62).toFixed(1), th: (h * 0.22).toFixed(1),
        cx: (x - w / 2 - 0.8).toFixed(1), cy: (yb - h - 6 * sc).toFixed(1), cw: (w + 1.6).toFixed(1), ch: (6.4 * sc).toFixed(1),
        capFill: on ? '#35d08a' : '#1f8f55',
        stroke: on ? '#2f6fd0' : 'rgba(20,30,44,.8)', sw: on ? 1.8 : 0.9,
        ring: 'opacity:' + (on ? 1 : 0) + '; transition:opacity .35s ease;', rx: (x).toFixed(1), ry: (yb).toFixed(1), rrx: (14 * sc).toFixed(1), rry: (5 * sc).toFixed(1),
        nx: (AS.cx + (AS.R + 9) * Math.cos(a)).toFixed(1), ny: (AS.cy + (AS.r + 7) * sn + 3).toFixed(1), num: String(k), nfs: (8.5 * sc).toFixed(1),
        nstyle: 'opacity:' + (sn > -0.15 ? 1 : 0) + ';', nfill: on ? '#2f6fd0' : '#c9d3df', nfw: on ? 800 : 600
      });
    }
    asVials.sort((p, q) => p.yb - q.yb);
    const asFillH = AS.FILL_PX * st.asFill;
    // carrier-gas particles ride the same column path
    const oParts = [];
    if (st.running && st.flowStable) {
      for (let n = 0; n < 4; n++) {
        const pf = (st.runMin * 0.2 + n * 0.25) % 1, pp = ncolPt(pf);
        oParts.push({ x: pp[0].toFixed(1), y: pp[1].toFixed(1) });
      }
    }


    return {
      onBack: this.props.onBack || (() => {}),
      gcChoose: !mode, gcRun: !!mode, gcIsGas: isGas, gcIsOil: isOil,
      gcPickGas: () => this.pick('gas'), gcPickOil: () => this.pick('oil'),
      gcReset: () => this.toModes(), gcToModes: () => this.toModes(), gcResetRun: () => this.resetRun(),
      gcGasCardStyle: 'width:300px; min-width:0; box-sizing:border-box; text-align:left; cursor:pointer; font-family:inherit; background:linear-gradient(150deg,rgba(47,111,208,.09),var(--panel) 62%); border:1px solid rgba(47,111,208,.30); border-radius:16px; padding:22px 22px 18px; display:flex; flex-direction:column; color:var(--txt); transition:transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s ease, border-color .18s ease; box-shadow:0 1px 2px rgba(10,20,40,.04), 0 8px 20px rgba(10,20,40,.03);',
      gcOilCardStyle: 'width:300px; min-width:0; box-sizing:border-box; text-align:left; cursor:pointer; font-family:inherit; background:linear-gradient(150deg,rgba(185,131,31,.10),var(--panel) 62%); border:1px solid rgba(185,131,31,.32); border-radius:16px; padding:22px 22px 18px; display:flex; flex-direction:column; color:var(--txt); transition:transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s ease, border-color .18s ease; box-shadow:0 1px 2px rgba(10,20,40,.04), 0 8px 20px rgba(10,20,40,.03);',
      gcGasPill: 'flex:0 0 auto; font-size:10.5px; font-weight:600; padding:3px 9px; border-radius:20px; background:rgba(47,111,208,.10); border:1px solid rgba(47,111,208,.32); color:var(--blue);',
      gcOilPill: 'flex:0 0 auto; font-size:10.5px; font-weight:600; padding:3px 9px; border-radius:20px; background:rgba(185,131,31,.12); border:1px solid rgba(185,131,31,.35); color:var(--amb);',
      gcGasPillText: 'mol%', gcOilPillText: 'by carbon number',

      gcTitle: 'GC — ' + c.label,
      gcSub: isGas ? 'Carrier flow first · evacuated sample line + ' + GC.gas.loopVol + ' loop · 6-port valve injection · packed column → TCD | capillary column → FID'
                   : 'Flash oil, ' + GC.oil.injVol + ' by automatic liquid sampler, split inlet at ' + GC.oil.injT + ' °C',
      gcMethodTag: c.method, gcColumnLabel: c.column, gcYLabel: c.yLabel,
      gcInletKindLabel: c.inlet,
      gcPillText: st.paused ? 'Paused' : st.complete ? 'Analysis complete' : st.running ? 'Run in progress' : st.busy ? 'Step running' : (cur ? cur.name : 'Ready'),
      gcPillBg: st.paused ? 'rgba(185,131,31,.10)' : st.complete ? 'rgba(29,138,90,.09)' : 'rgba(47,111,208,.08)',
      gcPillBorder: st.paused ? 'rgba(185,131,31,.4)' : st.complete ? 'rgba(29,138,90,.35)' : 'rgba(47,111,208,.35)',
      gcPillColor: st.paused ? 'var(--amb)' : st.complete ? 'var(--grn)' : 'var(--blue)',
      gcPillDot: 'width:6px; height:6px; border-radius:50%; background:' + (st.paused ? 'var(--amb)' : st.complete ? 'var(--grn)' : 'var(--blue)') + ';' + (st.running && !st.paused ? ' animation:gcblink 1.1s ease-in-out infinite;' : ''),
      gcStrip: strip, gcInfo: INFO,

      gcCarrierShort: GC.carrierSym,
      gcCylHl: 'transition:filter .3s ease; filter:' + (st.hl === 'cyl' ? 'drop-shadow(0 0 7px rgba(111,199,240,.75))' : 'none') + ';',
      gcRegX: (128 + regR * Math.cos(regA * Math.PI / 180)).toFixed(1),
      gcRegY: (312 + regR * Math.sin(regA * Math.PI / 180)).toFixed(1),
      gcRegColor: st.carrier ? 'var(--hdb3)' : 'var(--mut)',
      gcHeadText: st.carrier ? Math.round(st.reg * GC.head) + ' psi' : '— psi',
      gcSupplyFlow: 'opacity:' + (st.carrier ? 1 : 0) + '; transition:opacity .35s ease;',
      gcMainFlow: 'opacity:' + (st.flowStable ? 1 : 0) + '; transition:opacity .35s ease;',
      gcCarrierLabelStyle: 'opacity:' + (isGas && st.injected ? .25 : .8) + ';',
      gcCtrlBorder: st.flowStable ? '#46d39a' : '#4a5f7e',
      gcCtrlColor: st.flowStable ? 'var(--accg)' : 'var(--mut)',
      gcFlowText: st.flow ? st.flow.toFixed(2) + ' mL/min' : 'FLOW —',

      gcBalCy: (239 + balBry).toFixed(1), gcBalRy: balBry.toFixed(1), gcBalRx: (balBry * 0.95).toFixed(1),
      gcBalGlintX: (930 - balBry * 0.42).toFixed(1), gcBalGlintY: (239 + balBry * 0.62).toFixed(1),
      gcBalTrans: 'transition:rx .15s linear, ry .15s linear, cx .15s linear, cy .15s linear;',
      gcBalPsiText: (14.5 * balFrac).toFixed(1) + ' psi',
      gcBalPsiColor: st.conn ? 'var(--accb)' : 'var(--cap)',
      gcBalValveFill: st.purging || st.loopFill > 0 ? '#7fe3b4' : '#3a4c66',
      gcBalHandleColor: st.purging || st.loopFill > 0 ? 'var(--accg)' : 'var(--mut)',
      gcConnStyle: 'opacity:' + (st.conn ? 1 : st.connGrow) + '; transition:opacity .2s linear;',
      gcConnText: st.conn ? 'CONNECTED' : 'UNION · OPEN',
      gcConnColor: st.conn ? 'var(--accg)' : 'var(--cap)',
      gcDeadStyle: 'opacity:' + (st.purged ? 0 : (st.conn ? .9 : .45)) + '; transition:opacity .5s ease;',
      gcSampleFlow: 'opacity:' + (st.purging || (st.loopFill > 0 && st.loopFill < 1) ? 1 : 0) + '; transition:opacity .3s ease;',
      gcValveBorder: st.valve === 'INJECT' ? '#6fc7f0' : '#4a5f7e',
      gcValveText: 'VALVE · ' + st.valve,
      gcValveColor: st.valve === 'INJECT' ? 'var(--hdb3)' : 'var(--cap2)',
      gcRotorStyle: 'transform-origin:630px 207px; transform:rotate(' + (st.valve === 'INJECT' ? 60 : 0) + 'deg); transition:transform .55s cubic-bezier(.4,.05,.2,1);',
      gcLoopColor: st.loopFill > 0 ? 'var(--accb3)' : 'var(--line2)',
      gcLoopDash: st.loopFill >= 1 ? 'none' : (st.loopFill <= 0 ? '0 400' : (st.loopFill * 194).toFixed(0) + ' 400'),
      gcLoopFlow: 'opacity:' + (st.valve === 'INJECT' && st.flowStable ? 1 : 0) + '; transition:opacity .3s ease;',

      gcPlugStyle: 'opacity:' + (isGas && st.plug > 0 && st.plug < 1 ? 1 : 0) + '; transition:opacity .25s ease;',
      gcPlugX: (655 - st.plug * 25).toFixed(1),
      gcPlugY: (110 + st.plug * 145).toFixed(1),
      gcVialCapStyle: 'opacity:' + (st.vialOpen ? 0 : 1) + '; transition:opacity .35s ease;',
      gcVialShow: 'opacity:' + (st.vialShow ? 1 : 0) + '; transition:opacity .45s ease;',
      gcVialOilY: (140 + 7 * st.syrFill).toFixed(1),
      gcVialOilH: (56 - 7 * st.syrFill).toFixed(1),
      gcVialText: st.vialOpen ? 'OPEN · SAMPLING' : 'SEALED',
      gcVialColor: st.vialOpen ? 'var(--accg)' : 'var(--cap)',
      gcSyrStyle: 'transform:translate(' + st.syrX.toFixed(1) + 'px,' + st.syrY.toFixed(1) + 'px); opacity:' + (isOil ? 1 : 0) + ';',
      gcSyrFillY: (-34 - 68 * st.syrFill).toFixed(1), gcSyrFillH: (68 * st.syrFill).toFixed(1),
      gcPlungerY: (-104 + 68 * st.syrFill).toFixed(1),
      gcSyrLabel: st.syrFill > 0.02 ? GC.oil.injVol : 'MICROSYRINGE',

      gcInjFill: injHot ? 'rgba(231,177,90,.16)' : 'rgba(20,34,54,.8)',
      gcInjStroke: st.hl === 'inj' ? '#6fc7f0' : (injHot ? '#e7b15a' : '#4a5f7e'),
      gcInjText: st.injT == null ? 'INJ —' : st.injT + ' °C / set ' + c.injT + ' °C',
      gcInjTextColor: st.rdy.inj ? 'var(--accg)' : (st.injT == null ? 'var(--cap)' : 'var(--amb)'),
      gcDropStyle: 'opacity:' + (isOil && st.drop > 0 ? 1 : 0) + ';',
      gcDropY: (232 - st.vapor * 6).toFixed(1),
      gcDropRx: (4.5 * Math.max(0, st.drop)).toFixed(1), gcDropRy: (6 * Math.max(0, st.drop)).toFixed(1),
      gcVaporStyle: 'opacity:' + (isOil ? Math.min(1, st.vapor * 1.4) * (st.injected && st.runMin > 0.2 ? 0 : 1) : 0) + '; transition:opacity .4s ease;',
      gcVapAx: (492 - st.vapor * 4).toFixed(1), gcVapAy: (228 - st.vapor * 12).toFixed(1), gcVapR: (3 + st.vapor * 9).toFixed(1),
      gcVapBx: (504 + st.vapor * 4).toFixed(1), gcVapBy: (244 + st.vapor * 8).toFixed(1), gcVapR2: (2 + st.vapor * 7).toFixed(1),
      gcVapR3: (1 + st.vapor * 13).toFixed(1),

      gcOvenStroke: st.hl === 'oven' ? '#6fc7f0' : (ovenHot ? '#e7b15a' : '#4a5f7e'),
      gcOvenGlow: 'rgba(231,177,90,' + (0.02 + ovenNorm * 0.10).toFixed(3) + ')',
      gcOvenText: st.ovenT == null ? 'OVEN —' : st.ovenT + ' °C' + (st.running ? (st.runMin > ovenRampEnd(c) ? ' · final hold' : ' · ramping') : ' / set ' + ((isGas ? (st.running || st.runMin > 0) : st.injected) ? c.ovenEnd : c.ovenStart) + ' °C'),
      gcOvenTextColor: st.ovenT == null ? 'var(--cap)' : (st.running ? 'var(--amb)' : (st.rdy.oven ? 'var(--accg)' : 'var(--amb)')),
      gcSplitShow: 'opacity:' + (isOil ? 1 : 0) + ';',
      gcSplitFlowStyle: 'opacity:' + (isOil && st.flowStable ? (st.injected ? 1 : .5) : 0) + '; transition:opacity .4s ease;',
      gcSplitRatioText: isOil && c.split ? c.split + ' : 1' : '\u2014',
      gcSplitVentText: isOil && c.split ? (c.flow * c.split).toFixed(0) + ' mL/min' : '\u2014',
      gcSplitColText: isOil ? c.flow.toFixed(1) + ' mL/min' : '\u2014',
      gcSplitValveFill: isOil && st.flowStable ? '#e7b15a' : '#4a5f7e',
      gcColumnFlow: 'opacity:' + (st.flowStable ? (st.hl === 'col' ? 1 : .75) : 0) + '; transition:opacity .35s ease;',
      gcInsetStyle: 'opacity:' + (st.running ? 1 : .35) + '; transition:opacity .4s ease;',
      gcInsetDots: insetDots,
      gcBands: bands,

      // oil-mode schematic
      gcCarrierTag: st.carrier ? GC.carrierSym + ' · ' + GC.purity : GC.carrierSym + ' · CLOSED',
      gcOGaugeX: (220 + 24 * Math.cos(gaugeA * Math.PI / 180)).toFixed(1),
      gcOGaugeY: (410 + 24 * Math.sin(gaugeA * Math.PI / 180)).toFixed(1),
      gcOSyrStyle: 'transform:translate(' + oSyrX.toFixed(1) + 'px,' + oSyrY.toFixed(1) + 'px) scale(' + oSyrS.toFixed(3) + '); opacity:' + (st.syrShow ? 1 : 0) + '; transition:opacity .4s ease;',
      gcOSyrFillY: (-36 - 72 * st.syrFill).toFixed(1), gcOSyrFillH: (72 * st.syrFill).toFixed(1),
      gcOPlungerY: (-110 + 72 * st.syrFill).toFixed(1),
      gcODropY: (232 - st.vapor * 6).toFixed(1),
      gcOVapAx: (620 - st.vapor * 4).toFixed(1), gcOVapAy: (226 - st.vapor * 10).toFixed(1),
      gcOVapBx: (640 + st.vapor * 4).toFixed(1), gcOVapBy: (240 + st.vapor * 6).toFixed(1),
      // oil: helium supply (illustrative gauge values), flow controller, autosampler
      gcNCylGX: gCyl.x, gcNCylGY: gCyl.y, gcNOutGX: gOut.x, gcNOutGY: gOut.y,
      gcNCylPsi: String(HE.cyl), gcNOutPsi: String(Math.round(st.reg * HE.out)),
      gcNOutPsiColor: st.reg > 0 ? '#1d6fb8' : '#3a4759',
      gcNRegHl: 'transition:filter .3s ease; filter:' + (st.hl === 'reg' ? 'drop-shadow(0 0 6px rgba(47,111,208,.65))' : 'none') + ';',
      gcNValveFill: cvOpen ? '#2f9d72' : (st.cylV > 0 ? '#c98a2e' : '#b8453f'),
      gcNValveRidges: cvRidges,
      gcNValveTurn: 'opacity:' + (st.cylV > 0 && st.cylV < 1 ? 1 : 0) + '; transition:opacity .25s ease;',
      gcNValveState: cvOpen ? 'OPEN' : (st.cylV > 0 ? 'OPENING' : 'CLOSED'),
      gcNValveStateColor: cvOpen ? 'var(--grn)' : (st.cylV > 0 ? 'var(--amb)' : 'var(--red)'),
      gcNSupplyFlow: 'opacity:' + (nFlowOn ? 1 : 0) + '; transition:opacity .4s ease;',
      gcNMainFlow: 'opacity:' + (nFlowOn ? 1 : 0) + '; transition:opacity .4s ease;',
      gcNColFlow: 'opacity:' + (isOil ? (st.flowStable ? .85 : st.flowIn * .85) : 0) + ';',
      gcNCtrlBorder: nCtrlHl ? '#2f6fd0' : (st.flowStable || nFlowOn ? '#46d39a' : (st.flowSet ? '#e7b15a' : '#4a5f7e')),
      gcNCtrlGlow: 'transition:filter .3s ease; filter:' + (nCtrlHl ? 'drop-shadow(0 0 7px rgba(47,111,208,.7))' : 'none') + ';',
      gcNFlowText: nFlowOn ? st.flow.toFixed(2) + ' mL/min' : (st.flowSet ? st.flowSet.toFixed(2) + ' mL/min' : '-.-- mL/min'),
      gcNFlowColor: nFlowOn ? '#46d39a' : (st.flowSet ? '#e7b15a' : '#6d7f98'),
      gcNFlowSub: nFlowOn ? (st.flowStable ? 'STABLE' : 'FLOWING') : (st.flowSet ? 'SET · NO FLOW' : 'NOT SET'),
      gcNFlowSubColor: nFlowOn ? '#bff0d8' : (st.flowSet ? '#f3d9a6' : '#c9d3df'),
      gcNCtrlLed: nFlowOn ? '#46d39a' : (st.flowSet ? '#e7b15a' : '#4a5f7e'),
      gcAsVials: asVials,
      gcAsCarStyle: 'transform:translate(' + st.asX.toFixed(1) + 'px,0px);',
      gcAsSyrStyle: 'transform:translate(' + st.asX.toFixed(1) + 'px,' + st.asTip.toFixed(1) + 'px);',
      gcAsFillY: (-62 - asFillH).toFixed(1), gcAsFillH: asFillH.toFixed(1),
      gcAsSealY: (-65 - asFillH).toFixed(1), gcAsRodY: (-117 - asFillH).toFixed(1), gcAsThumbY: (-121 - asFillH).toFixed(1),
      gcAsVolText: st.asFill > 0.02 ? GC.oil.injVol : '',
      gcAsSelText: st.asSel ? 'VIAL ' + AS.sel + ' · SELECTED' : 'SAMPLE TRAY',
      gcAsSelColor: st.asSel ? '#2f6fd0' : '#5d6b7e',
      gcAsReadyLed: st.flowStable && st.rdy.det && !st.busy ? '#46d39a' : '#3a4c66',
      gcAsBusyLed: st.busy && (steps[i] && ['tray','draw','oinj'].indexOf(steps[i].id) >= 0) ? '#e7b15a' : '#3a4c66',
      gcNGaugeX: (80 + 14 * Math.cos(gaugeA * Math.PI / 180)).toFixed(1),
      gcNGaugeY: (258 + 14 * Math.sin(gaugeA * Math.PI / 180)).toFixed(1),
      gcNSyrStyle: 'transform:translate(' + nSyrX.toFixed(1) + 'px,' + nSyrY.toFixed(1) + 'px) scale(' + nSyrS.toFixed(3) + '); opacity:' + (st.syrShow ? 1 : 0) + '; transition:opacity .4s ease;',
      gcNVialOilY: (158 + 7 * st.syrFill).toFixed(1), gcNVialOilH: (50 - 7 * st.syrFill).toFixed(1),
      gcNDropY: (228 - st.vapor * 6).toFixed(1),
      gcNVapAx: (426 - st.vapor * 3).toFixed(1), gcNVapAy: (224 - st.vapor * 8).toFixed(1),
      gcNVapBx: (438 + st.vapor * 3).toFixed(1), gcNVapBy: (240 + st.vapor * 6).toFixed(1),
      gcOilChart: chartMain, gcOilChartBig: chartBig, gcChromBig: !!mode && st.chromBig,
      gcTC: chartT, gcFC: chartF, gcTCB: chartTB, gcFCB: chartFB, gcTempC: tempC, gcBigOil: isOil && st.chromBig, gcBigGas: isGas && st.chromBig,
      gcBigTitle: 'GC \u2014 ' + c.label + ' \u00b7 ' + (isGas ? 'TCD (packed column) and FID (capillary column)' : 'Chromatogram'),
      gcChromAllText: st.chromAll ? 'Major Labels Only' : 'Show All Labels',
      gcChromAllStyle: 'font-family:inherit; font-size:10.5px; font-weight:600; white-space:nowrap; padding:4px 10px; border-radius:6px; cursor:pointer; background:' + (st.chromAll ? 'rgba(47,111,208,.12)' : '#ffffff') + '; border:1px solid ' + (st.chromAll ? 'rgba(47,111,208,.55)' : '#cfd6e0') + '; color:' + (st.chromAll ? '#2f6fd0' : '#3a4759') + ';',
      gcChromAllToggle: () => this.setState({ chromAll: !this.state.chromAll }),
      gcChromOpen: () => this.setState({ chromBig: true }),
      gcChromClose: () => { this._drag = null; this.setState({ chromBig: false }); },
      gcStop: e => { if (e && e.stopPropagation) e.stopPropagation(); },
      gcPlaybackText: c.runMin + ' min simulated · playback ≈ ' + Math.round(c.runMs * (typeof PSM === 'function' ? PSM() : 1) / 1000) + ' s',
      gcResOn: gcRes,
      gcShowChrom: !!mode && gcRes && (!st.results || st.resTab === 'chrom'),
      gcShowTable: st.results && st.resTab === 'table',
      gcOilTabs: !!mode && st.results,
      gcTabChrom: () => this.setState({ resTab: 'chrom' }), gcTabTable: () => this.setState({ resTab: 'table' }),
      gcTabChromStyle: 'font-family:inherit; font-size:11px; font-weight:600; padding:5px 14px; cursor:pointer; border:none; border-bottom:2px solid ' + (st.resTab === 'chrom' ? 'var(--blue)' : 'transparent') + '; background:transparent; color:' + (st.resTab === 'chrom' ? 'var(--txt)' : 'var(--mut)') + ';',
      gcTabTableStyle: 'font-family:inherit; font-size:11px; font-weight:600; padding:5px 14px; cursor:pointer; border:none; border-bottom:2px solid ' + (st.resTab === 'table' ? 'var(--blue)' : 'transparent') + '; background:transparent; color:' + (st.resTab === 'table' ? 'var(--txt)' : 'var(--mut)') + ';',
      gcOilChromBoxStyle: 'flex:1 1 auto; min-height:0; margin-top:5px; border-radius:9px; overflow:hidden; border:1px solid var(--line2); background:#ffffff; display:flex; flex-direction:column;',
      gcZoomIn: () => zoomBy(0.5), gcZoomOut: () => zoomBy(2), gcZoomReset: () => this.setState({ zv: null }),
      gcZoomPresets: (isGas ? [['0–12 min (light ends)', 0, 12], ['12–35 min', 11, 36], ['35–75 min', 34, 75]] : [['C1–C10', 0, 7.6], ['C11–C20', 8.0, 17.6], ['C21–C30', 17.0, 25.8], ['C31–C36+', 25.0, 34]]).map(q => ({ t: q[0], go: () => zoomTo(q[1], q[2]) })),
      gcZoomText: 'View ' + zv[0].toFixed(1) + '–' + zv[1].toFixed(1) + ' min · wheel to zoom, drag to pan',
      gcBigWheel: e => { if (e.preventDefault) e.preventDefault(); zoomBy(e.deltaY > 0 ? 1.25 : 0.8, evT(e)); },
      gcBigDown: e => { const r = e.currentTarget.getBoundingClientRect(); this._drag = { x: e.clientX, z: (this.state.zv || [0, c.runMin]).slice(), w: r.width }; },
      gcBigMove: e => { const d = this._drag; if (!d) return; const g = this._bigGeom, dt = -(e.clientX - d.x) / d.w * g.W / (g.R - g.L) * (d.z[1] - d.z[0]); zoomTo(d.z[0] + dt, d.z[1] + dt); },
      gcBigUp: () => { this._drag = null; },
      gcCylState: st.carrier || st.reg > 0 ? 'VALVE OPEN' : 'VALVE CLOSED',
      gcCylStateColor: st.carrier || st.reg > 0 ? 'var(--accg)' : 'var(--cap)',
      gcNColD: NCOIL_D, gcNParticles: oParts, gcNMiniTraceD: nMiniD,
      gcOInsetDots: oInset, gcOilBands: bands, gcMiniTraceD: miniD, gcOColD: OCOIL_D, gcOParticles: oParts,
      gcODetStroke: st.pulse && st.detC ? st.detC : (st.hl === 'det' ? '#6fc7f0' : (st.det === 'Ready' ? '#46d39a' : '#4a5f7e')),
      gcODetGlow: st.pulse && st.detC ? st.detC + '66' : 'rgba(111,199,240,.12)',
      gcOPulseR: st.pulse ? 34 : 12,
      gcOPulseColor: st.detC || 'transparent',
      gcOPulseStyle: 'opacity:' + (st.pulse ? .9 : 0) + '; transition:r .35s ease, opacity .35s ease;',
      gcODetInd: st.detK ? st.detK + ' Detected' : '',
      gcODetIndColor: st.detC || 'var(--cap)',
      gcODetIndStyle: 'opacity:' + (st.detK ? 1 : 0) + '; transition:opacity .3s ease;',
      gcExhaustStyle: 'opacity:' + (detected.length && (st.running || st.complete) ? 1 : 0) + '; transition:opacity .4s ease;',
      gcDetLampA: st.pulse ? '#e0846b' : (st.det === 'Ready' ? '#6b3a33' : '#3a4c66'),
      gcDetLampB: st.det === 'Ready' ? '#46d39a' : '#3a4c66',
      gcCols: !gcRes ? 'minmax(0,1fr) clamp(260px,22vw,330px)' : isGas ? (st.results && st.resTab === 'table' ? 'minmax(0,1.3fr) minmax(330px,1fr)' : 'minmax(0,1.45fr) minmax(360px,1fr)') : 'minmax(0,1.52fr) minmax(330px,1fr)',
      gcReadyCols: gcRes ? 'repeat(5,minmax(0,1fr))' : 'minmax(0,1fr)',
      ...gasVals,

      gcDetStroke: st.hl === 'det' ? '#6fc7f0' : (st.det === 'Ready' ? '#46d39a' : '#4a5f7e'),
      gcDetText: st.det ? c.detector + ' · ' + st.det : 'DETECTOR · OFF',
      gcDetColor: st.det === 'Ready' ? 'var(--accg)' : 'var(--cap)',
      gcTcdFill: st.pulse && pulseIsTcd ? 'rgba(111,199,240,.28)' : 'rgba(6,16,30,.7)',
      gcTcdWire: st.det === 'Ready' ? '#e0846b' : '#3a4c66',
      gcTcdText: st.pulse && pulseIsTcd ? '#6fc7f0' : 'rgba(190,215,240,.7)',
      gcFidX: isGas ? 842 : 812, gcFlameX: isGas ? 863 : 833,
      gcFidFill: st.pulse && !pulseIsTcd ? 'rgba(70,211,154,.26)' : 'rgba(6,16,30,.7)',
      gcFidText: st.pulse && !pulseIsTcd ? '#7fe3b4' : 'rgba(190,215,240,.7)',
      gcFlameFill: flameOn ? 'rgba(126,200,255,.85)' : 'rgba(90,110,135,.3)',
      gcFlameStyle: 'transform-origin:center bottom;' + (flameOn && !st.paused ? ' animation:gcflame 1.3s ease-in-out infinite;' : ''),
      gcPulseX: st.pulse ? (pulseIsTcd && isGas ? 815 : (isGas ? 863 : 833)) : 838,
      gcPulseR: st.pulse ? 26 : 6, gcPulseColor: pulseComp ? pulseComp.c : 'transparent',
      gcPulseStyle: 'opacity:' + (st.pulse ? .85 : 0) + '; transition:r .4s ease, opacity .4s ease;',
      gcSignalStyle: 'opacity:' + (st.running || st.busy && st.complete ? 1 : 0) + '; transition:opacity .3s ease;',

      gcDsText: st.complete ? 'Analysis complete' : (st.ds === 'idle' ? 'Idle' : st.ds.charAt(0).toUpperCase() + st.ds.slice(1)),
      gcDsSub: st.dsSub || 'Detector not connected to a run',
      gcDsColor: st.complete ? 'var(--accg)' : (st.running ? 'var(--hdb3)' : 'var(--txt2)'),
      gcDsBar: dsBarPct,

      gcChromBoxStyle: 'flex:' + (st.results ? '0 0 148px' : '1 1 auto') + '; min-height:0; margin-top:5px; border-radius:9px; overflow:hidden; border:1px solid var(--line2); background:var(--panel); transition:flex-basis .3s ease;',
      gcTraceD: traceD, gcTraceColor: st.running ? 'var(--accg)' : 'var(--hdb3)',
      gcPeakFills: peakFills, gcPeakLabels: peakLabels, gcYTicks: yTicks, gcXTicks: xTicks,
      gcTProgD: tProgD, gcTProgText: tProgText,
      gcTProgStyle: 'opacity:' + (tProgD ? 1 : 0) + ';',
      gcTNowX: tNowX, gcTNowY: tNowY, gcTNowLabel: tNowLabel,
      gcTNowLabX: (parseFloat(tNowX) + 7).toFixed(1),
      gcTNowLabY: (parseFloat(tNowY) - 7).toFixed(1),
      gcTNowStyle: 'opacity:' + (st.injected && tProgD ? 1 : 0) + '; transition:opacity .3s ease;',
      gcTStartY: (tyOf(tprog ? tprog.T0 : 0) + 12).toFixed(1),
      gcTEndY: (tyOf(tprog ? tprog.T1 : 0) - 6).toFixed(1),
      gcTStartLabel: tprog ? tprog.T0 + ' \u00b0C' : '',
      gcTEndLabel: tprog ? tprog.T1 + ' \u00b0C' : '',
      gcCursorX: st.injected ? xOf(tNow).toFixed(1) : X0,
      gcCursorStyle: 'opacity:' + (st.running ? 1 : 0) + ';',

      gcStatus: st.status, gcEdu: st.edu,
      gcMsgBg: st.complete ? 'rgba(29,138,90,.07)' : 'var(--panel2)',
      gcMsgBorder: st.complete ? 'rgba(29,138,90,.3)' : 'var(--line)',
      gcMsgDot: st.complete ? 'var(--grn)' : st.busy || st.running ? 'var(--blue)' : 'var(--mut2)',
      gcShowReady: isGas ? !(st.running || st.runMin > 0 || st.complete) : !st.injected, gcReady: isGas ? gasReady : ready,

      gcShowResults: st.results,
      gcResTitle: (isOil ? 'Oil Composition — by carbon number' : 'Gas Composition — mol% · TCD + FID'),
      gcResBasis: isOil ? 'BASIS · MASS% FROM AREA × RF, NORMALIZED TO 100.00% · MOLE FRAC = (wᵢ/Mᵢ) ÷ Σ(wⱼ/Mⱼ)' : 'BASIS · MOL% FROM AREA ÷ RF, NORMALIZED TO 100.00% · NON-HC FROM TCD (PACKED) · HC FROM FID (CAPILLARY) · RT ON THE REPORTED CHANNEL',
      gcResHead: heads, gcResRows: rows,

      gcPhases: phases,
      gcStepTag: cur ? (st.busy ? 'RUNNING · ' : '') + 'STEP ' + (i + 1) + ' / ' + steps.length + ' · ' + cur.name.toUpperCase() : 'COMPLETE',
      gcActText: st.complete && i === steps.length - 1 ? 'Analysis Complete' : (cur ? cur.btn : 'Done'),
      gcActStyle: btn(canAct, 'main'),
      gcActivate: () => this.activate(),
      gcPrev: () => { if (canPrev) this.setState({ cur: i - 1 }); },
      gcNext: () => { if (canNext) this.setState({ cur: i + 1 }); },
      gcPrevStyle: btn(canPrev), gcNextStyle: btn(canNext),
      gcAuto: () => { if (!canAuto) return; this.setState({ auto: true, cur: this.firstOpen() }); this.wait(30, () => this.activate()); },
      gcAutoStyle: btn(canAuto),
      gcPauseToggle: () => { if (!st.busy && !st.paused) return; this.setState({ paused: !st.paused }, () => { if (!this.state.paused) { this.last = performance.now(); this.ensureLoop(); } }); },
      // step-by-step control: each click runs only the current step, then waits for the next click
      gcOneText: st.complete ? 'Analysis Complete ✓' : (st.busy ? (cur ? cur.name + '…' : 'Running…') : (cur ? cur.btn : 'Done')),
      gcOneStyle: btn(canAct, 'main'),
      gcOneClick: () => { if (this.canActivate()) this.activate(); },
      gcPauseText: st.paused ? 'Resume' : 'Pause',
      gcPauseStyle: btn(st.busy || st.paused)
    };
  }
}

DC.define('StageGC', {
  style: `/* Standalone-only fallback: matches only when this DC is opened on its own.
     When embedded in PVT Nexus the selector never matches, so the global theme
     (html / html[data-theme="light"]) in theme.css is used untouched. */
  #dc-root > .sc-host > [data-screen-label="GC Mode Selection"] {
    --bg:#eef1f6; --panel:#ffffff; --panel2:#f4f6fa;
    --line:rgba(40,60,90,.12); --line2:rgba(40,60,90,.20);
    --txt:#16202f; --txt2:#3a4759; --mut:#566578; --mut2:#8492a4;
    --blue:#2f6fd0; --grn:#1d8a5a; --amb:#b9831f; --red:#c33a52; --teal:#0e8f7a;
    --cap:rgba(38,56,80,.68); --cap2:rgba(38,56,80,.78);
    --chipbg:#eaeff7; --chipt:#3a4759; --icard:#f4f6fa; --dis:#9aa7b8;
    font-family:'IBM Plex Sans',system-ui,sans-serif;
    background:var(--bg); color:var(--txt);
    -webkit-font-smoothing:antialiased;
  }
  #dc-root > .sc-host > [data-screen-label="GC Mode Selection"] * { box-sizing:border-box; }
  @keyframes gcdash { to { stroke-dashoffset:-24; } }
  @keyframes gcdashslow { to { stroke-dashoffset:-18; } }
  @keyframes gcflame { 0%,100% { transform:scaleY(1); opacity:.9; } 50% { transform:scaleY(1.18); opacity:1; } }
  @keyframes gcblink { 0%,100% { opacity:1; } 50% { opacity:.35; } }
  @keyframes gcrise { 0% { transform:translateY(0); opacity:0; } 30% { opacity:.8; } 100% { transform:translateY(-70px); opacity:0; } }`,
  template: `<!-- ================= MODE SELECTION ================= -->
<sc-if value="{{ gcChoose }}" hint-placeholder-val="{{ true }}">
<div data-screen-label="GC Mode Selection" style="display:flex; flex-direction:column; height:var(--page-h); overflow:hidden; padding:18px clamp(18px,2.2vw,34px) 16px; gap:16px; box-sizing:border-box; background:var(--bg);">

  <div style="display:flex; align-items:center; gap:20px; flex:0 0 auto;">
    <div style="flex:1; min-width:0;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="width:24px; height:3px; border-radius:2px; background:var(--teal);"></span>
        <span style="font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:1.8px; text-transform:uppercase; color:var(--blue); font-weight:600;">Detailed PVT Analysis &#183; Compositional</span>
      </div>
      <div style="display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; margin-top:7px;">
        <h2 style="margin:0; font-size:clamp(20px,1.8vw,26px); font-weight:700; letter-spacing:-.7px; color:var(--txt);">GC &#8212; Gas Chromatography</h2>
        <p style="margin:0; font-size:12.5px; color:var(--txt2); font-weight:400;">Select the sample phase to begin compositional analysis.</p>
      </div>
    </div>
    <button class="act" onclick="{{ gcReset }}" style="flex:0 0 auto; height:36px; padding:0 14px; border-radius:9px; font-family:inherit; font-size:11.5px; font-weight:500; background:var(--icard); border:1px solid var(--line2); color:var(--txt2); cursor:pointer;" style-hover="border-color:var(--blue); color:var(--txt);">Reset GC</button>
  </div>

  <div style="flex:1 1 auto; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:24px;">

    <div style="text-align:center;">
      <div style="font-size:19px; font-weight:600; color:var(--txt);">Select sample phase to analyse</div>
      <div style="font-size:12.5px; color:var(--mut); font-weight:400; margin-top:7px;">Choose the compositional workflow before entering the chromatograph.</div>
    </div>

    <div style="display:flex; gap:20px; flex-wrap:wrap; justify-content:center;">

      <button onclick="{{ gcPickGas }}" style="{{ gcGasCardStyle }}" style-hover="transform:translateY(-3px); border-color:var(--blue); box-shadow:0 2px 4px rgba(10,20,40,.05), 0 16px 30px rgba(10,20,40,.09);">
        <span style="display:flex; align-items:center; gap:12px;">
          <span style="width:44px; height:44px; flex:0 0 auto; border-radius:11px; background:rgba(47,111,208,.12); border:1px solid rgba(47,111,208,.28); color:var(--blue); display:flex; align-items:center; justify-content:center;">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none"><circle cx="7" cy="9" r="2" stroke="currentColor" stroke-width="1.6"></circle><circle cx="14" cy="6" r="1.6" stroke="currentColor" stroke-width="1.6"></circle><circle cx="16" cy="13" r="2.4" stroke="currentColor" stroke-width="1.6"></circle><circle cx="9" cy="16" r="1.5" stroke="currentColor" stroke-width="1.6"></circle></svg>
          </span>
          <span style="flex:1; min-width:0;"></span>
          <span style="{{ gcGasPill }}">{{ gcGasPillText }}</span>
        </span>
        <span style="display:block; font-size:17px; font-weight:700; letter-spacing:-.3px; color:var(--txt); margin-top:14px;">Gas Analysis</span>
        <span style="display:block; font-size:12px; color:var(--txt2); font-weight:400; line-height:1.55; margin-top:6px;">Flash gas through a fixed-volume sampling valve. TCD + FID channels.</span>
        <span style="display:flex; align-items:center; gap:7px; margin-top:16px; font-size:12px; font-weight:600; color:var(--blue);">Start Analysis <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
      </button>

      <button onclick="{{ gcPickOil }}" style="{{ gcOilCardStyle }}" style-hover="transform:translateY(-3px); border-color:var(--amb); box-shadow:0 2px 4px rgba(10,20,40,.05), 0 16px 30px rgba(10,20,40,.09);">
        <span style="display:flex; align-items:center; gap:12px;">
          <span style="width:44px; height:44px; flex:0 0 auto; border-radius:11px; background:rgba(185,131,31,.12); border:1px solid rgba(185,131,31,.30); color:var(--amb); display:flex; align-items:center; justify-content:center;">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path></svg>
          </span>
          <span style="flex:1; min-width:0;"></span>
          <span style="{{ gcOilPill }}">{{ gcOilPillText }}</span>
        </span>
        <span style="display:block; font-size:17px; font-weight:700; letter-spacing:-.3px; color:var(--txt); margin-top:14px;">Oil Analysis</span>
        <span style="display:block; font-size:12px; color:var(--txt2); font-weight:400; line-height:1.55; margin-top:6px;">Flash oil injected by an automatic liquid sampler through a heated split inlet.</span>
        <span style="display:flex; align-items:center; gap:7px; margin-top:16px; font-size:12px; font-weight:600; color:var(--amb);">Start Analysis <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
      </button>
    </div>

    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:center; font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:1px; text-transform:uppercase; color:var(--mut2);">
      <span>Sample</span><span>&#8594;</span><span>Injection</span><span>&#8594;</span><span>Oven &amp; Column</span><span>&#8594;</span><span>Detector</span><span>&#8594;</span><span>Live Chromatogram</span><span>&#8594;</span><span>Results</span>
    </div>
  </div>
</div>
</sc-if>

<!-- ================= ANALYSIS WORKSPACE ================= -->
<sc-if value="{{ gcRun }}" hint-placeholder-val="{{ false }}">
<div data-screen-label="GC Analysis" style="display:flex; flex-direction:column; height:var(--page-h); overflow:hidden; padding:var(--page-pad-y) var(--page-pad-x) 12px; gap:8px; box-sizing:border-box; background:var(--bg);">

  <!-- header -->
  <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; flex:0 0 auto;">
    <div style="flex:1 1 240px; min-width:0; display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
      <h2 class="pg-title">{{ gcTitle }}</h2>
      <div class="pg-desc">{{ gcSub }}</div>
    </div>
    <div style="display:flex; align-items:center; gap:6px; flex:0 0 auto; padding:5px 11px; border-radius:999px; background:{{ gcPillBg }}; border:1px solid {{ gcPillBorder }}; font-family:'IBM Plex Mono'; font-size:10px; letter-spacing:.7px; text-transform:uppercase; color:{{ gcPillColor }}; white-space:nowrap;">
      <span style="{{ gcPillDot }}"></span>{{ gcPillText }}
    </div>
  </div>

  <!-- working area -->
  <div style="display:grid; grid-template-columns:{{ gcCols }}; gap:0; flex:1 1 auto; min-height:0; background:var(--panel); border:1px solid var(--line); border-radius:12px; box-shadow:0 1px 2px rgba(20,35,60,.05); overflow:hidden;">

    <!-- ===== schematic ===== -->
    <div style="display:flex; flex-direction:column; min-height:0; border-right:1px solid var(--line); padding:6px 8px 4px;">
      <div style="flex:1 1 auto; min-height:0; border-radius:9px; background:var(--panel); border:1px solid var(--line2); overflow:hidden;">
        <sc-if value="{{ gcIsGas }}" hint-placeholder-val="{{ true }}">
        <svg viewBox="0 40 1460 822" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;">
          <defs>
            <linearGradient id="gq-metal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#6b7c94"></stop><stop offset=".35" stop-color="#d3dfef"></stop><stop offset=".65" stop-color="#97a8bf"></stop><stop offset="1" stop-color="#55637a"></stop>
            </linearGradient>
            <linearGradient id="gq-cyl" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#25455f"></stop><stop offset=".38" stop-color="#7fa8c4"></stop><stop offset=".72" stop-color="#43647e"></stop><stop offset="1" stop-color="#1d3346"></stop>
            </linearGradient>
            <linearGradient id="gq-amber" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#e0a94a"></stop><stop offset="1" stop-color="#a06f22"></stop>
            </linearGradient>
            <radialGradient id="gr-colglow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="rgba(231,177,90,.16)"></stop><stop offset=".6" stop-color="rgba(231,177,90,.07)"></stop><stop offset="1" stop-color="rgba(231,177,90,0)"></stop>
            </radialGradient>
            <linearGradient id="gr-shell" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#e3e8ef"></stop><stop offset="1" stop-color="#bcc5d1"></stop>
            </linearGradient>
            <linearGradient id="gr-deck" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#f0f3f7"></stop><stop offset="1" stop-color="#cdd4de"></stop>
            </linearGradient>
            <radialGradient id="gr-back" cx="50%" cy="50%" r="60%">
              <stop offset="0" stop-color="#3a4556"></stop><stop offset="1" stop-color="#1c232e"></stop>
            </radialGradient>
            <linearGradient id="gr-wtop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#1e252f"></stop><stop offset="1" stop-color="#343e4e"></stop>
            </linearGradient>
            <linearGradient id="gr-wleft" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#12171f"></stop><stop offset="1" stop-color="#262e3b"></stop>
            </linearGradient>
            <linearGradient id="gr-wright" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0" stop-color="#4a5568"></stop><stop offset="1" stop-color="#303a4a"></stop>
            </linearGradient>
            <linearGradient id="gr-wbot" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stop-color="#566276"></stop><stop offset="1" stop-color="#363f4f"></stop>
            </linearGradient>
            <linearGradient id="gr-door" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#b4a589"></stop><stop offset="1" stop-color="#e2d8c3"></stop>
            </linearGradient>
            <linearGradient id="gr-doorrim" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#aeb8c5"></stop><stop offset="1" stop-color="#dfe5ec"></stop>
            </linearGradient>
            <linearGradient id="gr-screen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#0d1d31"></stop><stop offset="1" stop-color="#06101e"></stop>
            </linearGradient>
            <radialGradient id="gr-floor" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="rgba(0,0,0,.34)"></stop><stop offset="1" stop-color="rgba(0,0,0,0)"></stop>
            </radialGradient>
            ${BottleArt.defs('gq')}
            <linearGradient id="gq-bal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#6f7986"></stop><stop offset=".28" stop-color="#eef2f6"></stop><stop offset=".62" stop-color="#a7b1bd"></stop><stop offset="1" stop-color="#57606c"></stop>
            </linearGradient>
            <linearGradient id="gq-balw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#ffb070"></stop><stop offset=".5" stop-color="#ff8a4c"></stop><stop offset="1" stop-color="#d9642e"></stop>
            </linearGradient>
            <linearGradient id="gq-cab" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#d9dee5"></stop><stop offset=".5" stop-color="#f3f5f8"></stop><stop offset="1" stop-color="#c3cad3"></stop>
            </linearGradient>
            <linearGradient id="gq-back" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#c7ced8"></stop><stop offset="1" stop-color="#9aa4b1"></stop>
            </linearGradient>
            <linearGradient id="gq-heat" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stop-color="rgba(255,120,50,.42)"></stop><stop offset=".6" stop-color="rgba(255,150,70,.16)"></stop><stop offset="1" stop-color="rgba(255,170,90,.06)"></stop>
            </linearGradient>
            <linearGradient id="gq-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#c8483e"></stop><stop offset="1" stop-color="#8f2c26"></stop>
            </linearGradient>
          </defs>


          <!-- floor shadows -->
          <ellipse cx="80" cy="784" rx="62" ry="9" fill="url(#gr-floor)"></ellipse>
          <ellipse cx="926" cy="786" rx="380" ry="13" fill="url(#gr-floor)"></ellipse>
          <ellipse cx="414" cy="784" rx="140" ry="9" fill="url(#gr-floor)"></ellipse>
          <ellipse cx="1369" cy="770" rx="70" ry="7" fill="url(#gr-floor)"></ellipse>

          <!-- ===== data cable: GC electronics (right side) -> computer. No connection to the balloon oven. ===== -->
          <path d="M1250 604 H1290" fill="none" stroke="#0b0f15" stroke-width="7.5" stroke-linecap="round"></path>
          <path d="M1250 604 H1290" fill="none" stroke="#34445a" stroke-width="3" stroke-linecap="round"></path>
          <g style="{{ gcSignalStyle }}">
            <path d="M1250 604 H1290" fill="none" stroke="#46d39a" stroke-width="2.4" stroke-dasharray="4 9" stroke-linecap="round" style="animation:gcdash calc(.45s * var(--pm, 1)) linear infinite;"></path>
          </g>
          <rect x="1246" y="597" width="10" height="14" rx="2" fill="#2a3444" stroke="#0a0e16" stroke-width=".8"></rect>
          <rect x="1284" y="598" width="9" height="12" rx="2" fill="#2a3444" stroke="#0a0e16" stroke-width=".8"></rect>

          <!-- ===== 1 · carrier gas cylinder with regulator ===== -->
          <g style="{{ gcCylHl }}">
            <rect x="40" y="330" width="80" height="446" rx="26" fill="url(#gq-cyl)" stroke="#0a0e16" stroke-width="1.6"></rect>
            <rect x="51" y="352" width="11" height="400" rx="5" fill="rgba(226,242,255,.20)"></rect>
            <rect x="41" y="384" width="78" height="8" fill="rgba(8,16,26,.28)"></rect>
            <text x="80" y="560" text-anchor="middle" font-family="IBM Plex Sans" font-size="22" font-weight="700" fill="rgba(232,242,252,.8)">He</text>
            <rect x="69" y="300" width="22" height="32" rx="3" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1.1"></rect>
            <rect x="60" y="306" width="40" height="7" rx="3.5" fill="{{ gcNValveFill }}" stroke="#0a0e16" stroke-width=".9" style="transition:fill .3s ease;"></rect>
            <sc-for list="{{ gcNValveRidges }}" as="r" hint-placeholder-count="5">
              <line x1="{{ r.x }}" y1="307" x2="{{ r.x }}" y2="312" stroke="rgba(10,14,22,.55)" stroke-width="1.3"></line>
            </sc-for>
            <g style="{{ gcNValveTurn }}">
              <path d="M50 322 A 32 8 0 0 0 110 322" fill="none" stroke="#2f6fd0" stroke-width="2.2" stroke-linecap="round"></path>
              <path d="M110 322 l-7 -3 m7 3 l-3 6" fill="none" stroke="#2f6fd0" stroke-width="2" stroke-linecap="round"></path>
            </g>
          </g>
          <!-- ===== two-gauge regulator on the cylinder valve ===== -->
          <!-- gauge values are ILLUSTRATIVE (HE constants): cylinder full from the start, outlet 0 until the valve opens -->
          <g style="{{ gcNRegHl }}">
          <rect x="68" y="236" width="24" height="74" rx="4" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1.1"></rect>
          <rect x="50" y="254" width="60" height="14" rx="3" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="76" y="218" width="8" height="20" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".8"></rect>
          <rect x="62" y="206" width="36" height="13" rx="4" fill="#3b4a60" stroke="#0a0e16" stroke-width="1"></rect>
          <g stroke="rgba(220,230,245,.45)" stroke-width="1"><line x1="69" y1="208" x2="69" y2="217"></line><line x1="75" y1="208" x2="75" y2="217"></line><line x1="81" y1="208" x2="81" y2="217"></line><line x1="87" y1="208" x2="87" y2="217"></line><line x1="93" y1="208" x2="93" y2="217"></line></g>
          <circle cx="28" cy="261" r="25" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1.3"></circle>
          <circle cx="28" cy="261" r="21" fill="#f2f5f8" stroke="#5c6b82" stroke-width=".9"></circle>
          <g stroke="#5c6b82" stroke-width="1.2"><line x1="16.7" y1="272.3" x2="14.2" y2="274.8"></line><line x1="12.8" y1="265.9" x2="9.5" y2="267.0"></line><line x1="12.2" y1="258.5" x2="8.7" y2="257.9"></line><line x1="15.1" y1="251.6" x2="12.2" y2="249.5"></line><line x1="20.7" y1="246.7" x2="19.1" y2="243.6"></line><line x1="28.0" y1="245.0" x2="28.0" y2="241.5"></line><line x1="35.3" y1="246.7" x2="36.9" y2="243.6"></line><line x1="40.9" y1="251.6" x2="43.8" y2="249.5"></line><line x1="43.8" y1="258.5" x2="47.3" y2="257.9"></line><line x1="43.2" y1="265.9" x2="46.5" y2="267.0"></line><line x1="39.3" y1="272.3" x2="41.8" y2="274.8"></line></g>
          <text x="28" y="274" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" font-weight="700" fill="#3a4759">{{ gcNCylPsi }}</text>
          <text x="28" y="281.5" text-anchor="middle" font-family="IBM Plex Mono" font-size="6" fill="#5c6b82">psi</text>
          <line x1="28" y1="261" x2="{{ gcNCylGX }}" y2="{{ gcNCylGY }}" stroke="#c33a52" stroke-width="2" stroke-linecap="round"></line>
          <circle cx="28" cy="261" r="2.8" fill="#3a4759"></circle>
          <text x="28" y="215" text-anchor="middle" font-family="IBM Plex Sans" font-size="12.5" font-weight="600" fill="var(--txt)">Cylinder</text>
          <text x="28" y="229" text-anchor="middle" font-family="IBM Plex Sans" font-size="12.5" font-weight="600" fill="var(--txt)">pressure</text>
          <circle cx="132" cy="261" r="25" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1.3"></circle>
          <circle cx="132" cy="261" r="21" fill="#f2f5f8" stroke="#5c6b82" stroke-width=".9"></circle>
          <g stroke="#5c6b82" stroke-width="1.2"><line x1="120.7" y1="272.3" x2="118.2" y2="274.8"></line><line x1="116.8" y1="265.9" x2="113.5" y2="267.0"></line><line x1="116.2" y1="258.5" x2="112.7" y2="257.9"></line><line x1="119.1" y1="251.6" x2="116.2" y2="249.5"></line><line x1="124.7" y1="246.7" x2="123.1" y2="243.6"></line><line x1="132.0" y1="245.0" x2="132.0" y2="241.5"></line><line x1="139.3" y1="246.7" x2="140.9" y2="243.6"></line><line x1="144.9" y1="251.6" x2="147.8" y2="249.5"></line><line x1="147.8" y1="258.5" x2="151.3" y2="257.9"></line><line x1="147.2" y1="265.9" x2="150.5" y2="267.0"></line><line x1="143.3" y1="272.3" x2="145.8" y2="274.8"></line></g>
          <text x="132" y="274" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" font-weight="700" fill="{{ gcNOutPsiColor }}">{{ gcNOutPsi }}</text>
          <text x="132" y="281.5" text-anchor="middle" font-family="IBM Plex Mono" font-size="6" fill="#5c6b82">psi</text>
          <line x1="132" y1="261" x2="{{ gcNOutGX }}" y2="{{ gcNOutGY }}" stroke="#c33a52" stroke-width="2" stroke-linecap="round"></line>
          <circle cx="132" cy="261" r="2.8" fill="#3a4759"></circle>
          <text x="132" y="215" text-anchor="middle" font-family="IBM Plex Sans" font-size="12.5" font-weight="600" fill="var(--txt)">Outlet</text>
          <text x="132" y="229" text-anchor="middle" font-family="IBM Plex Sans" font-size="12.5" font-weight="600" fill="var(--txt)">pressure</text>
          <text x="80" y="176" text-anchor="middle" font-family="IBM Plex Sans" font-size="17" font-weight="600" fill="var(--txt)">Regulator</text>
          </g>
          <text x="80" y="193" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="var(--cap)">illustrative pressures</text>
          <rect x="47" y="398" width="66" height="34" rx="5" fill="rgba(244,247,251,.94)" stroke="#0a0e16" stroke-width=".9"></rect>
          <text x="80" y="411" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="#566578">CYL. VALVE</text>
          <text x="80" y="426" text-anchor="middle" font-family="IBM Plex Mono" font-size="11" font-weight="700" fill="{{ gcNValveStateColor }}">{{ gcNValveState }}</text>

          <!-- regulator outlet -> raised flow controller (straight run at outlet height) -->
          <path d="M92 302 H166" fill="none" stroke="#0a0e16" stroke-width="10" stroke-linecap="round"></path>
          <path d="M92 302 H166" fill="none" stroke="#97a8bf" stroke-width="5.5" stroke-linecap="round"></path>
          <g style="{{ gcNSupplyFlow }}">
            <path d="M92 302 H166" fill="none" stroke="#6fc7f0" stroke-width="2.6" stroke-dasharray="5 11" stroke-linecap="round" style="animation:gcdash calc(.75s * var(--pm, 1)) linear infinite;"></path>
          </g>

          <!-- ===== 2 · flow controller, mounted on the regulator outlet and clamped to the cylinder collar ===== -->
          <rect x="38" y="342" width="84" height="12" rx="3" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <path d="M120 344 H214 V334 H226 V354 H120 Z" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1" stroke-linejoin="round"></path>
          <circle cx="112" cy="348" r="2.4" fill="#2a3444"></circle><circle cx="219" cy="348" r="2.2" fill="#2a3444"></circle>
          <g style="{{ gcNCtrlGlow }}">
          <rect x="166" y="270" width="92" height="64" rx="9" fill="url(#gq-amber)" stroke="{{ gcNCtrlBorder }}" stroke-width="1.8" style="transition:stroke .3s ease;"></rect>
          <rect x="174" y="280" width="76" height="22" rx="4" fill="#0b1524" stroke="#1d3350" stroke-width="1"></rect>
          <text x="212" y="295" text-anchor="middle" font-family="IBM Plex Mono" font-size="10.5" font-weight="600" fill="{{ gcNFlowColor }}">{{ gcNFlowText }}</text>
          <circle cx="182" cy="319" r="4" fill="{{ gcNCtrlLed }}" stroke="#5d3f10" stroke-width="1"></circle>
          <rect x="191" y="312" width="61" height="14" rx="3" fill="rgba(11,21,36,.62)"></rect>
          <text x="221.5" y="322" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" font-weight="700" fill="{{ gcNFlowSubColor }}">{{ gcNFlowSub }}</text>
          </g>
          <text x="212" y="376" text-anchor="middle" font-family="IBM Plex Sans" font-size="17" font-weight="600" fill="var(--txt)">Flow Controller</text>

          <!-- flow controller -> 6-port valve port 1 (carrier-gas tubing, separate from the sample line) -->
          <path d="{{ gcQCarD }}" fill="none" stroke="#0a0e16" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="{{ gcQCarD }}" fill="none" stroke="#97a8bf" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"></path>
          <g style="{{ gcNMainFlow }}">
            <path d="{{ gcQCarD }}" fill="none" stroke="#6fc7f0" stroke-width="2.6" stroke-dasharray="5 11" stroke-linecap="round" stroke-linejoin="round" style="animation:gcdash calc(.75s * var(--pm, 1)) linear infinite;"></path>
          </g>

          <!-- ===== GC instrument (whole drawing shifted right as one group; internal coordinates unchanged) ===== -->
          <g transform="translate(266,0)">
          <!-- ===== 3 · GC instrument housing ===== -->
          <rect x="396" y="770" width="40" height="13" rx="3" fill="#2a3444"></rect>
          <rect x="926" y="770" width="40" height="13" rx="3" fill="#2a3444"></rect>
          <rect x="372" y="258" width="618" height="516" rx="10" fill="url(#gr-shell)" stroke="#0a0e16" stroke-width="1.5"></rect>
          <rect x="384" y="196" width="594" height="68" rx="8" fill="url(#gr-deck)" stroke="#0a0e16" stroke-width="1.3"></rect>
          <rect x="390" y="199" width="582" height="4" rx="2" fill="rgba(255,255,255,.55)"></rect>
          <g fill="rgba(40,52,70,.28)">
            <rect x="910" y="216" width="56" height="4" rx="2"></rect><rect x="910" y="226" width="56" height="4" rx="2"></rect>
            <rect x="910" y="236" width="56" height="4" rx="2"></rect><rect x="910" y="246" width="56" height="4" rx="2"></rect>
          </g>
          <line x1="786" y1="266" x2="786" y2="772" stroke="rgba(10,20,30,.22)" stroke-width="1.4"></line>
          <text x="452" y="282" font-family="IBM Plex Sans" font-size="12" font-weight="700" letter-spacing="2" fill="#2b3646">GC OVEN</text>
          <rect x="592" y="268" width="104" height="19" rx="9.5" fill="rgba(47,111,208,.12)" stroke="rgba(47,111,208,.55)" stroke-width="1"></rect>
          <text x="644" y="281.5" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" font-weight="600" fill="#2f6fd0">Internal view</text>

          <!-- ===== oven chamber (depth + insulated walls) ===== -->
          <rect x="389" y="289" width="386" height="462" rx="4" fill="#0e131b" stroke="{{ gcOvenStroke }}" stroke-width="2.2" style="transition:stroke .3s linear;"></rect>
          <polygon points="392,292 772,292 740,324 424,324" fill="url(#gr-wtop)"></polygon>
          <polygon points="392,292 424,324 424,716 392,748" fill="url(#gr-wleft)"></polygon>
          <polygon points="772,292 772,748 740,716 740,324" fill="url(#gr-wright)"></polygon>
          <polygon points="392,748 424,716 740,716 772,748" fill="url(#gr-wbot)"></polygon>
          <rect x="424" y="324" width="316" height="392" fill="url(#gr-back)"></rect>
          <rect x="424" y="324" width="316" height="392" fill="{{ gcOvenGlow }}" style="transition:fill .3s linear;"></rect>
          <polygon points="392,292 424,324 424,716 392,748" fill="rgba(0,0,0,.18)"></polygon>

          <!-- rear circulation fan -->
          <g>
            <circle cx="582" cy="520" r="113" fill="#141a23" stroke="#5a687e" stroke-width="2"></circle>
            <path d="M602.0 520.0 L641.0 539.2 L652.5 579.1 L641.1 595.6 L635.6 565.0 L619.1 535.0 L600.8 526.8Z M592.0 537.3 L594.9 580.6 L566.0 610.6 L546.0 609.0 L569.8 588.9 L587.6 559.6 L585.5 539.7Z M572.0 537.3 L535.9 561.5 L495.5 551.5 L486.9 533.4 L516.2 543.9 L550.5 544.6 L566.7 532.9Z M562.0 520.0 L523.0 500.8 L511.5 460.9 L522.9 444.4 L528.4 475.0 L544.9 505.0 L563.2 513.2Z M572.0 502.7 L569.1 459.4 L598.0 429.4 L618.0 431.0 L594.2 451.1 L576.4 480.4 L578.5 500.3Z M592.0 502.7 L628.1 478.5 L668.5 488.5 L677.1 506.6 L647.8 496.1 L613.5 495.4 L597.3 507.1Z" fill="#2c3646" stroke="#465367" stroke-width="1"></path>
            <g fill="none" stroke="#56647a" stroke-width="1.4" opacity=".85">
              <circle cx="582" cy="520" r="94"></circle><circle cx="582" cy="520" r="74"></circle><circle cx="582" cy="520" r="52"></circle>
              <line x1="603.3" y1="525.7" x2="688.3" y2="548.5"></line><line x1="597.6" y1="535.6" x2="659.8" y2="597.8"></line><line x1="587.7" y1="541.3" x2="610.5" y2="626.3"></line><line x1="576.3" y1="541.3" x2="553.5" y2="626.3"></line><line x1="566.4" y1="535.6" x2="504.2" y2="597.8"></line><line x1="560.7" y1="525.7" x2="475.7" y2="548.5"></line><line x1="560.7" y1="514.3" x2="475.7" y2="491.5"></line><line x1="566.4" y1="504.4" x2="504.2" y2="442.2"></line><line x1="576.3" y1="498.7" x2="553.5" y2="413.7"></line><line x1="587.7" y1="498.7" x2="610.5" y2="413.7"></line><line x1="597.6" y1="504.4" x2="659.8" y2="442.2"></line><line x1="603.3" y1="514.3" x2="688.3" y2="491.5"></line>
            </g>
            <circle cx="582" cy="520" r="19" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1.1"></circle>
          </g>
          <ellipse cx="582" cy="520" rx="176" ry="176" fill="url(#gr-colglow)"></ellipse>

          <!-- column hangers: capillary cage ring + packed-column bracket rod from the oven ceiling -->
          <circle cx="528" cy="450" r="58" fill="none" stroke="#7b8ba3" stroke-width="2" opacity=".5"></circle>
          <rect x="712" y="608" width="34" height="8" rx="2" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".7"></rect>

          <!-- column end fittings in the oven ceiling -->
          <rect x="423" y="292" width="18" height="16" rx="2" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="721" y="292" width="18" height="16" rx="2" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="751" y="292" width="18" height="16" rx="2" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <text x="446" y="318" font-family="IBM Plex Mono" font-size="11" font-weight="700" fill="#9fd2ff">SPLIT TEE</text>
          <text x="722" y="318" text-anchor="end" font-family="IBM Plex Mono" font-size="11" font-weight="700" fill="#ffc86b">TO TCD</text>

          <!-- ===== 4 · valve mount + column feed-through (6-port valve and loop are drawn outside this group) ===== -->
          <rect x="424" y="262" width="16" height="30" fill="#10151d"></rect>
          <rect x="414" y="196" width="36" height="66" rx="4" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1.1"></rect>
          <rect x="420" y="212" width="24" height="42" rx="2" fill="#0b1524" stroke="#3a4c66" stroke-width="1"></rect>

          <!-- ===== 5 · detector mounts on the deck: TCD (capillary path) and FID (packed path) ===== -->
          <rect x="712" y="200" width="36" height="62" rx="4" fill="#15202f" stroke="#3a4c66" stroke-width="1.2"></rect>
          <rect x="722" y="262" width="16" height="30" fill="#10151d"></rect>
          <rect x="852" y="200" width="36" height="62" rx="4" fill="#15202f" stroke="#3a4c66" stroke-width="1.2"></rect>

          <!-- ===== dual column set (one oven): split tee -> Path 1 capillary -> TCD | Path 2 packed -> FID ===== -->
          <!-- packed column: thick stainless tube, open coil, upper left; outlet up to the TCD -->
          <path d="{{ gcGPakD }}" fill="none" stroke="#10151d" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="{{ gcGPakD }}" fill="none" stroke="#9fadbf" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="{{ gcGPakD }}" fill="none" stroke="rgba(236,242,248,.75)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
          <!-- capillary column: thin fused-silica tube, tight coil, lower right; outlet up the right wall to the FID -->
          <path d="{{ gcGCapD }}" fill="none" stroke="#3a2006" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round" opacity=".92"></path>
          <path d="{{ gcGCapD }}" fill="none" stroke="#c9843a" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="{{ gcGCapD }}" fill="none" stroke="rgba(255,232,196,.5)" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round"></path>
          <!-- shared head: valve port 2 -> split tee -->
          <path d="{{ gcGHeadD }}" fill="none" stroke="#10151d" stroke-width="7" stroke-linecap="round"></path>
          <path d="{{ gcGHeadD }}" fill="none" stroke="#b7c3d2" stroke-width="4" stroke-linecap="round"></path>
          <!-- coil clips -->
          <g fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".8">
            <rect x="524" y="374" width="8" height="32" rx="2" transform="rotate(60 528 450)"></rect>
            <rect x="524" y="374" width="8" height="32" rx="2" transform="rotate(180 528 450)"></rect>
            <rect x="524" y="374" width="8" height="32" rx="2" transform="rotate(300 528 450)"></rect>
            <rect x="656" y="546" width="8" height="34" rx="2"></rect>
            <rect x="656" y="546" width="8" height="34" rx="2" transform="rotate(220 660 614)"></rect>
          </g>
          <!-- helium carrier: valve P2 -> split tee -> packed column -> TCD (teal) | capillary column -> FID (amber). Never under vacuum. -->
          <g style="{{ gcGHeFlow }}">
            <path d="{{ gcGHeadD }}" fill="none" stroke="#bfe4ff" stroke-width="1.8" stroke-dasharray="3 9" stroke-linecap="round" style="animation:gcdash calc(1.1s * var(--pm, 1)) linear infinite;"></path>
            <path d="{{ gcGPakD }}" fill="none" stroke="#5ff0cf" stroke-width="2.6" stroke-dasharray="4 12" stroke-linecap="round" style="animation:gcdash calc(1.1s * var(--pm, 1)) linear infinite;"></path>
            <path d="{{ gcGCapD }}" fill="none" stroke="#ffd27a" stroke-width="1.6" stroke-dasharray="4 12" stroke-linecap="round" style="animation:gcdash calc(1.1s * var(--pm, 1)) linear infinite;"></path>
          </g>
          <!-- split tee -->
          <g style="{{ gcGSplitHl }}">
            <rect x="423" y="327" width="18" height="18" rx="3" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1.1"></rect>
            <circle cx="432" cy="336" r="3.2" fill="#2a3444"></circle>
          </g>
          <!-- column labels -->
          <g font-family="IBM Plex Sans" stroke="#0e131b" stroke-width="3.5" paint-order="stroke">
            <text x="440" y="552" font-size="17" font-weight="700" fill="#35d0b0">Packed Column</text>
            <text x="640" y="712" text-anchor="middle" font-size="17" font-weight="700" fill="#f3b24a">Capillary Column</text>
          </g>

          <!-- separated component bands on both paths (hollow grey on the capillary path = non-HC, no FID response) -->
          <sc-for list="{{ gcGBands }}" as="b" hint-placeholder-count="0">
            <g style="{{ b.style }}">
              <circle cx="{{ b.x }}" cy="{{ b.y }}" r="{{ b.hr }}" fill="{{ b.halo }}"></circle>
              <circle cx="{{ b.x }}" cy="{{ b.y }}" r="{{ b.r }}" fill="{{ b.fill }}" stroke="{{ b.stroke }}" stroke-width="{{ b.sw }}"></circle>
              <text x="{{ b.lx }}" y="{{ b.ly }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="12.5" font-weight="700" fill="{{ b.lc }}" stroke="#0e131b" stroke-width="3" paint-order="stroke" style="{{ b.labelStyle }}">{{ b.k }}</text>
            </g>
          </sc-for>

          <!-- helium front sweeping both analytical paths (carrier step, before any sample) -->
          <g style="{{ gcQHeStyle }}">
            <circle cx="{{ gcQHeCX }}" cy="{{ gcQHeCY }}" r="11" fill="rgba(111,199,240,.22)"></circle>
            <circle cx="{{ gcQHeCX }}" cy="{{ gcQHeCY }}" r="5" fill="#8fd8ff" stroke="#e8f7ff" stroke-width="1.2"></circle>
            <circle cx="{{ gcQHePX }}" cy="{{ gcQHePY }}" r="11" fill="rgba(111,199,240,.22)"></circle>
            <circle cx="{{ gcQHePX }}" cy="{{ gcQHePY }}" r="5" fill="#8fd8ff" stroke="#e8f7ff" stroke-width="1.2"></circle>
          </g>

          <!-- injected sample slug: shared head -> split tee -> one plug into each column -->
          <g style="{{ gcQPlugStyle }}">
            <circle cx="{{ gcQPlugCX }}" cy="{{ gcQPlugCY }}" r="12" fill="rgba(243,178,74,.28)"></circle>
            <circle cx="{{ gcQPlugCX }}" cy="{{ gcQPlugCY }}" r="6" fill="#5fb0ff" stroke="#ffd27a" stroke-width="1.8"></circle>
            <circle cx="{{ gcQPlugPX }}" cy="{{ gcQPlugPY }}" r="12" fill="rgba(53,208,176,.28)"></circle>
            <circle cx="{{ gcQPlugPX }}" cy="{{ gcQPlugPY }}" r="6" fill="#5fb0ff" stroke="#6ff0d4" stroke-width="1.8"></circle>
          </g>

          <!-- ===== TCD — packed-column path (responds to every component) ===== -->
          <rect x="690" y="132" width="80" height="68" rx="9" fill="#17293f" stroke="{{ gcGTcdStroke }}" stroke-width="1.9" style="transition:stroke .3s linear;"></rect>
          <circle cx="730" cy="164" r="{{ gcGTcdRingR }}" fill="none" stroke="{{ gcGTcdRing }}" stroke-width="2.6" style="{{ gcGTcdRingStyle }}"></circle>
          <rect x="708" y="148" width="44" height="32" rx="4" fill="{{ gcGTcdGlow }}" stroke="#5d7391" stroke-width="1.3" style="transition:fill .25s linear;"></rect>
          <path d="M714 164 l4 -7 l4 14 l4 -14 l4 14 l4 -14 l4 14 l4 -14 l4 7" fill="none" stroke="{{ gcGTcdWire }}" stroke-width="1.6" stroke-linejoin="round"></path>
          <circle cx="760" cy="142" r="4" fill="{{ gcDetLampB }}" stroke="#0a0e16" stroke-width=".9"></circle>
          <text x="730" y="194" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" font-weight="700" letter-spacing=".6" fill="#8294ad">FILAMENT CELL</text>
          <text x="730" y="92" text-anchor="middle" font-family="IBM Plex Sans" font-size="22" font-weight="700" fill="#15977c">TCD</text>
          <text x="730" y="110" text-anchor="middle" font-family="IBM Plex Sans" font-size="13" font-weight="700" fill="var(--txt2)">Packed column</text>
          <text x="730" y="68" text-anchor="middle" font-family="IBM Plex Mono" font-size="14" font-weight="700" fill="{{ gcGTcdIndColor }}" style="{{ gcGTcdIndStyle }}">{{ gcGTcdInd }}</text>

          <!-- ===== FID — capillary-column path (hydrocarbons only): H2/air flame, collector chimney ===== -->
          <line x1="826" y1="186" x2="842" y2="186" stroke="#6b7c94" stroke-width="3" stroke-linecap="round"></line>
          <line x1="826" y1="170" x2="842" y2="170" stroke="#6b7c94" stroke-width="3" stroke-linecap="round"></line>
          <text x="822" y="173" text-anchor="end" font-family="IBM Plex Mono" font-size="8" font-weight="700" fill="#8294ad">AIR</text>
          <text x="822" y="189" text-anchor="end" font-family="IBM Plex Mono" font-size="8" font-weight="700" fill="#8294ad">H&#8322;</text>
          <rect x="862" y="118" width="16" height="12" rx="2" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".9"></rect>
          <rect x="842" y="128" width="56" height="72" rx="8" fill="#17293f" stroke="{{ gcGFidStroke }}" stroke-width="1.9" style="transition:stroke .3s linear;"></rect>
          <circle cx="870" cy="166" r="{{ gcGFidRingR }}" fill="none" stroke="{{ gcGFidRing }}" stroke-width="2.6" style="{{ gcGFidRingStyle }}"></circle>
          <rect x="855" y="142" width="30" height="42" rx="5" fill="#06101e" stroke="#5d7391" stroke-width="1.2"></rect>
          <path d="M870 180 C863 173 864 162 870 151 C876 162 877 173 870 180 Z" fill="{{ gcGFlameFill }}" style="{{ gcGFlameStyle }}"></path>
          <rect x="866" y="180" width="8" height="4" fill="url(#gq-metal)"></rect>
          <circle cx="890" cy="136" r="4" fill="{{ gcDetLampB }}" stroke="#0a0e16" stroke-width=".9"></circle>
          <text x="870" y="92" text-anchor="middle" font-family="IBM Plex Sans" font-size="22" font-weight="700" fill="#d08a24">FID</text>
          <text x="870" y="110" text-anchor="middle" font-family="IBM Plex Sans" font-size="13" font-weight="700" fill="var(--txt2)">Capillary column</text>
          <text x="870" y="68" text-anchor="middle" font-family="IBM Plex Mono" font-size="14" font-weight="700" fill="{{ gcGFidIndColor }}" style="{{ gcGFidIndStyle }}">{{ gcGFidInd }}</text>
          <text x="906" y="170" font-family="IBM Plex Mono" font-size="12.5" font-weight="700" fill="#8a97a8" style="{{ gcGFidNoteStyle }}">{{ gcGFidNote }}</text>

          <!-- ===== oven door — hinged left, shown open for the internal view ===== -->
          <polygon points="306,262 296,267 296,779 306,784" fill="#8e99a7" stroke="#0a0e16" stroke-width="1"></polygon>
          <polygon points="389,293 306,262 306,784 389,747" fill="url(#gr-doorrim)" stroke="#0a0e16" stroke-width="1.3"></polygon>
          <polygon points="381,305 316,280 316,766 381,735" fill="url(#gr-door)" stroke="rgba(60,48,30,.35)" stroke-width="1"></polygon>
          <g stroke="rgba(110,90,58,.28)" stroke-width="1">
            <line x1="316" y1="377" x2="381" y2="391"></line><line x1="316" y1="474" x2="381" y2="477"></line>
            <line x1="316" y1="572" x2="381" y2="563"></line><line x1="316" y1="669" x2="381" y2="649"></line>
            <line x1="348" y1="293" x2="348" y2="751"></line>
          </g>
          <polygon points="381,305 389,293 389,747 381,735" fill="rgba(0,0,0,.22)"></polygon>
          <rect x="384" y="330" width="9" height="26" rx="2" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".8"></rect>
          <rect x="384" y="686" width="9" height="26" rx="2" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".8"></rect>
          <text x="0" y="0" transform="translate(352 520) rotate(-90)" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" font-weight="600" letter-spacing="1.5" fill="#6b5a3e">OVEN DOOR · OPEN</text>

          <!-- ===== control panel (right of the oven) ===== -->
          <text x="883" y="282" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" font-weight="700" letter-spacing="1.5" fill="#2b3646">CONTROL PANEL</text>
          <rect x="802" y="294" width="162" height="158" rx="8" fill="#1c2533" stroke="#0a0e16" stroke-width="1.2"></rect>
          <rect x="810" y="302" width="146" height="142" rx="4" fill="url(#gr-screen)"></rect>
          <text x="818" y="320" font-family="IBM Plex Mono" font-size="10" font-weight="600" letter-spacing="1" fill="#6fc7f0">GC · GAS METHOD</text>
          <line x1="818" y1="326" x2="948" y2="326" stroke="rgba(111,199,240,.25)" stroke-width="1"></line>
          <text x="818" y="344" font-family="IBM Plex Mono" font-size="9.5" fill="#8294ad">OVEN</text>
          <text x="818" y="359" font-family="IBM Plex Mono" font-size="11" font-weight="600" fill="{{ gcOvenTextColor }}">{{ gcOvenText }}</text>
          <text x="818" y="379" font-family="IBM Plex Mono" font-size="9.5" fill="#8294ad">INLET</text>
          <text x="818" y="394" font-family="IBM Plex Mono" font-size="11" font-weight="600" fill="{{ gcInjTextColor }}">{{ gcInjText }}</text>
          <text x="818" y="414" font-family="IBM Plex Mono" font-size="9.5" fill="#8294ad">DETECTOR</text>
          <text x="818" y="429" font-family="IBM Plex Mono" font-size="11" font-weight="600" fill="{{ gcDetColor }}">{{ gcDetText }}</text>
          <circle cx="818" cy="474" r="4.5" fill="{{ gcDetLampB }}" stroke="#0a0e16" stroke-width=".8"></circle>
          <text x="827" y="478" font-family="IBM Plex Mono" font-size="9" fill="#3a4759">READY</text>
          <circle cx="880" cy="474" r="4.5" fill="{{ gcDetLampA }}" stroke="#0a0e16" stroke-width=".8"></circle>
          <text x="889" y="478" font-family="IBM Plex Mono" font-size="9" fill="#3a4759">SIGNAL</text>
          <g fill="#e2e7ed" stroke="#8a95a5" stroke-width="1">
            <rect x="818" y="494" width="38" height="20" rx="3"></rect><rect x="864" y="494" width="38" height="20" rx="3"></rect><rect x="910" y="494" width="38" height="20" rx="3"></rect>
            <rect x="818" y="522" width="38" height="20" rx="3"></rect><rect x="864" y="522" width="38" height="20" rx="3"></rect><rect x="910" y="522" width="38" height="20" rx="3"></rect>
          </g>
          <g fill="rgba(40,52,70,.26)">
            <rect x="812" y="592" width="142" height="4" rx="2"></rect><rect x="812" y="604" width="142" height="4" rx="2"></rect>
            <rect x="812" y="616" width="142" height="4" rx="2"></rect><rect x="812" y="628" width="142" height="4" rx="2"></rect>
          </g>
          <rect x="814" y="716" width="32" height="30" rx="4" fill="#1c2533" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="818" y="720" width="24" height="12" rx="2" fill="#3fbf86"></rect>
          <text x="854" y="736" font-family="IBM Plex Sans" font-size="10" font-weight="700" letter-spacing="1" fill="#2b3646">POWER</text>

          </g>

          <!-- ===== gas balloon oven (separate from the GC) — whole assembly shifted left, between the helium cylinder and the GC ===== -->
          <g transform="translate(-732,0)">
          <rect x="1040" y="772" width="30" height="11" rx="3" fill="#2a3444"></rect>
          <rect x="1222" y="772" width="30" height="11" rx="3" fill="#2a3444"></rect>
          <rect x="1026" y="430" width="240" height="344" rx="8" fill="url(#gq-cab)" stroke="#0a0e16" stroke-width="1.4"></rect>
          <rect x="1030" y="433" width="232" height="4" rx="2" fill="rgba(255,255,255,.6)"></rect>
          <!-- chamber (stainless, depth) -->
          <rect x="1038" y="442" width="216" height="258" rx="3" fill="#8e99a7" stroke="#0a0e16" stroke-width="1.2"></rect>
          <polygon points="1040,444 1252,444 1234,460 1058,460" fill="#aab3be"></polygon>
          <polygon points="1040,444 1058,460 1058,684 1040,698" fill="#9ba5b1"></polygon>
          <polygon points="1252,444 1252,698 1234,684 1234,460" fill="#b7bfc9"></polygon>
          <polygon points="1040,698 1058,684 1234,684 1252,698" fill="#c3cad3"></polygon>
          <rect x="1058" y="460" width="176" height="224" fill="url(#gq-back)"></rect>
          <!-- shelf guide rails -->
          <g stroke="#6f7a88" stroke-width="1.6" stroke-linecap="round">
            <line x1="1043" y1="500" x2="1056" y2="494"></line><line x1="1043" y1="516" x2="1056" y2="510"></line>
            <line x1="1043" y1="606" x2="1056" y2="600"></line><line x1="1043" y1="622" x2="1056" y2="616"></line>
            <line x1="1236" y1="494" x2="1249" y2="500"></line><line x1="1236" y1="510" x2="1249" y2="516"></line>
            <line x1="1236" y1="600" x2="1249" y2="606"></line><line x1="1236" y1="616" x2="1249" y2="622"></line>
          </g>
          <!-- heating glow + element -->
          <rect x="1040" y="444" width="212" height="254" fill="url(#gq-heat)" style="{{ gcQHeatStyle }}"></rect>
          <path d="M1066 690 L1076 682 L1086 690 L1096 682 L1106 690 L1116 682 L1126 690 L1136 682 L1146 690 L1156 682 L1166 690 L1176 682 L1186 690 L1196 682 L1206 690 L1216 682 L1226 690" fill="none" stroke="{{ gcQElemColor }}" stroke-width="2.6" stroke-linejoin="round" style="transition:stroke .4s linear;"></path>
          <g style="{{ gcQShimmer }}" fill="none" stroke="rgba(255,160,90,.75)" stroke-width="1.6" stroke-linecap="round">
            <path d="M1098 672 q6 -8 0 -16 q-6 -8 0 -16" style="animation:gcrise calc(2.6s * var(--pm, 1)) ease-in infinite;"></path>
            <path d="M1146 672 q6 -8 0 -16 q-6 -8 0 -16" style="animation:gcrise calc(2.6s * var(--pm, 1)) ease-in infinite; animation-delay:calc(.9s * var(--pm, 1));"></path>
            <path d="M1194 672 q6 -8 0 -16 q-6 -8 0 -16" style="animation:gcrise calc(2.6s * var(--pm, 1)) ease-in infinite; animation-delay:calc(1.7s * var(--pm, 1));"></path>
          </g>

          <!-- lower shelf + inactive balloons (disconnected, capped) -->
          <text x="1146" y="594" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" font-weight="700" letter-spacing=".6" fill="#3a4759">SPARE BOTTLES · DISCONNECTED</text>
          <g opacity=".8">
            ${BottleArt.gas('gq', { x: 1160, y: 628, s: 0.29, rot: -90, bd: 'gas', ctx: 'Spare gas sample bottle · disconnected' })}
          </g>
          ${BottleArt.gas('gq', { x: 1149, y: 640, s: 0.335, rot: -90, bd: 'gas', ctx: 'Spare gas sample bottle · disconnected' })}
          <path d="M1040 664 L1252 664 L1234 654 L1058 654 Z" fill="rgba(210,218,228,.35)" stroke="#6f7a88" stroke-width="1.2"></path>
          <g stroke="#7b8594" stroke-width=".8"><line x1="1080" y1="655" x2="1074" y2="663"></line><line x1="1110" y1="655" x2="1106" y2="663"></line><line x1="1140" y1="655" x2="1138" y2="663"></line><line x1="1170" y1="655" x2="1170" y2="663"></line><line x1="1200" y1="655" x2="1202" y2="663"></line><line x1="1228" y1="655" x2="1234" y2="663"></line></g>
          <line x1="1078" y1="643" x2="1080" y2="668" stroke="#6b7686" stroke-width=".8"></line>
          <rect x="1070" y="666" width="22" height="30" rx="2" fill="#fbfcfd" stroke="#8a95a5" stroke-width=".8"></rect>
          <g stroke="#9aa4b1" stroke-width=".8"><line x1="1074" y1="674" x2="1088" y2="674"></line><line x1="1074" y1="680" x2="1088" y2="680"></line><line x1="1074" y1="686" x2="1085" y2="686"></line></g>

          <!-- upper shelf + ACTIVE upper balloon (connected to the GC) -->
          <text x="1150" y="508" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" font-weight="700" letter-spacing=".6" fill="{{ gcQBalTagColor }}">GAS BOTTLE · {{ gcQBalTag }}</text>
          <g style="{{ gcQBalHl }}">
            <!-- approved Gas Sample Bottle (components/BottleArt.js) lying on the shelf: its left-end connection on the
                 oven fitting (1078, 536); the heating tint is drawn over the gas inside the chamber -->
            ${BottleArt.gas('gq', { x: 1155, y: 536, s: 0.31, rot: -90, bd: 'gas', ctx: 'Gas sample bottle · heated in the balloon oven for GC injection',
              extra: `<path d="${PBDraw.gasInner()}" fill="url(#gq-balw)" style="{{ gcQBalTint }}"></path>` })}
            <rect x="1066" y="532" width="12" height="8" rx="1.5" fill="url(#gq-metal)" stroke="#2a3340" stroke-width=".8"></rect>
            <rect x="1058" y="529" width="9" height="14" rx="2" fill="url(#gq-metal)" stroke="#2a3340" stroke-width=".9"></rect>
          </g>
          <path d="M1040 560 L1252 560 L1234 550 L1058 550 Z" fill="rgba(210,218,228,.35)" stroke="#6f7a88" stroke-width="1.2"></path>
          <g stroke="#7b8594" stroke-width=".8"><line x1="1080" y1="551" x2="1074" y2="559"></line><line x1="1110" y1="551" x2="1106" y2="559"></line><line x1="1140" y1="551" x2="1138" y2="559"></line><line x1="1170" y1="551" x2="1170" y2="559"></line><line x1="1200" y1="551" x2="1202" y2="559"></line><line x1="1228" y1="551" x2="1234" y2="559"></line></g>

          <rect x="1044" y="424" width="16" height="10" rx="2" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".9"></rect>

          <!-- glass door (transparent front) -->
          <rect x="1038" y="442" width="216" height="258" rx="3" fill="rgba(210,232,250,.10)" stroke="#8a95a5" stroke-width="3" style="pointer-events:none;"></rect>
          ${BottleArt.pill(1098, 466, 'gas', { ctx: 'Gas sample bottle · heated in the balloon oven for GC injection' })}
          <g stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-linecap="round"><line x1="1210" y1="452" x2="1244" y2="486"></line><line x1="1222" y1="452" x2="1246" y2="476"></line></g>
          <rect x="1256" y="540" width="6" height="60" rx="3" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".8"></rect>
          <!-- front control panel -->
          <rect x="1086" y="710" width="120" height="54" rx="5" fill="url(#gq-red)" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="1094" y="724" width="10" height="18" rx="2" fill="#1c2533" stroke="#0a0e16" stroke-width=".8"></rect>
          <rect x="1096" y="726" width="6" height="7" rx="1" fill="#e2e7ed"></rect>
          <rect x="1110" y="716" width="60" height="40" rx="3" fill="#1a0f0f" stroke="#0a0e16" stroke-width=".9"></rect>
          <text x="1140" y="737" text-anchor="middle" font-family="IBM Plex Mono" font-size="14" font-weight="700" fill="{{ gcQOvenTColor }}">{{ gcQOvenT }}</text>
          <text x="1140" y="750" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" font-weight="600" fill="#e0a39a">{{ gcQOvenSet }}</text>
          <circle cx="1188" cy="737" r="10" fill="#1c2533" stroke="#0a0e16" stroke-width="1"></circle>
          <circle cx="1188" cy="737" r="6" fill="#3a4759"></circle>
          <line x1="1188" y1="737" x2="1188" y2="729" stroke="#e2e7ed" stroke-width="1.6" stroke-linecap="round"></line>
          <!-- digital pressure display on top = injection pressure -->
          <rect x="1150" y="424" width="8" height="7" fill="#2a3444"></rect><rect x="1230" y="424" width="8" height="7" fill="#2a3444"></rect>
          <rect x="1144" y="388" width="100" height="38" rx="4" fill="#d8cfb8" stroke="#0a0e16" stroke-width="1.1"></rect>
          <rect x="1151" y="394" width="86" height="26" rx="2" fill="#140807" stroke="#0a0e16" stroke-width=".8"></rect>
          <text x="1210" y="413" text-anchor="end" font-family="IBM Plex Mono" font-size="16" font-weight="700" fill="#ff4b3a">{{ gcQBalP }}</text>
          <text x="1233" y="413" text-anchor="end" font-family="IBM Plex Mono" font-size="7.5" font-weight="600" fill="#e07a6e">{{ gcQBalUnit }}</text>
          <text x="1194" y="380" text-anchor="middle" font-family="IBM Plex Mono" font-size="9.5" font-weight="700" letter-spacing=".4" fill="var(--txt2)">INJECTION PRESSURE</text>

          </g>

          <!-- ===== SAMPLE PATH (2026-09-30): gas bottle -> BOTTLE OUTLET VALVE (inside the balloon oven) -> sample line
               -> 6-port valve port 4. Separate from the helium line (which enters the valve at port 1). ===== -->
          <!-- bottle side of the bottle valve: always holds bottle gas -->
          <path d="{{ gcQBotD }}" fill="none" stroke="#0a0e16" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="{{ gcQBotD }}" fill="none" stroke="#5fb0ff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"></path>
          <!-- sample line (bottle valve -> riser -> overhead run -> port 4) -->
          <path d="{{ gcQLineD }}" fill="none" stroke="#0a0e16" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="{{ gcQLineD }}" fill="none" stroke="#8ea0b8" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="{{ gcQLineD }}" pathLength="100" fill="none" stroke="#5fb0ff" stroke-width="4" stroke-dasharray="{{ gcQLineFill }}" stroke-linecap="round" stroke-linejoin="round" style="{{ gcQLineSampStyle }}"></path>
          <g style="{{ gcQSampFlow }}">
            <path d="{{ gcQLineD }}" fill="none" stroke="#e6f3ff" stroke-width="1.8" stroke-dasharray="4 10" stroke-linecap="round" stroke-linejoin="round" style="animation:gcdash calc(.8s * var(--pm, 1)) linear infinite;"></path>
          </g>
          <g style="{{ gcQVacStyle }}">
            <path d="{{ gcQVac1D }}" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round" stroke-linejoin="round" style="animation:gcdash calc(1s * var(--pm, 1)) linear infinite;"></path>
          </g>
          <text x="440" y="138" text-anchor="middle" font-family="IBM Plex Sans" font-size="16" font-weight="600" fill="var(--txt)">Sample Line</text>
          <text x="440" y="56" text-anchor="middle" font-family="IBM Plex Sans" font-size="14" font-weight="600" fill="var(--txt2)">Helium Carrier Line</text>
          <!-- injection-pressure transducer tap on the sample line (display on the balloon-oven top) -->
          <path d="{{ gcQTapD }}" fill="none" stroke="#0a0e16" stroke-width="5" stroke-linecap="round"></path>
          <path d="{{ gcQTapD }}" fill="none" stroke="#8ea0b8" stroke-width="2.4" stroke-linecap="round"></path>
          <circle cx="316" cy="407" r="4.2" fill="#2a3444" stroke="#0a0e16" stroke-width=".8"></circle>

          <!-- ===== bottle outlet valve (quarter-turn, inside the balloon oven): handle along the pipe = OPEN ===== -->
          <g style="{{ gcQBvHl }}">
            <rect x="305" y="482" width="22" height="20" rx="3.5" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1.2"></rect>
            <circle cx="316" cy="492" r="6" fill="#2a3444" stroke="#0a0e16" stroke-width=".8"></circle>
            <g transform="{{ gcQBvRot }}" style="transition:transform .2s linear;">
              <rect x="312" y="464" width="8" height="30" rx="4" fill="{{ gcQBvColor }}" stroke="#0a0e16" stroke-width="1"></rect>
            </g>
            <circle cx="316" cy="492" r="2.6" fill="#e2e7ed"></circle>
          </g>
          <line x1="288" y1="489" x2="303" y2="491" stroke="#6b7686" stroke-width="1"></line>
          <rect x="190" y="470" width="98" height="38" rx="6" fill="rgba(244,247,251,.96)" stroke="#8a95a5" stroke-width="1"></rect>
          <text x="239" y="484" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" font-weight="700" letter-spacing=".4" fill="#3a4759">BOTTLE VALVE</text>
          <text x="239" y="500" text-anchor="middle" font-family="IBM Plex Mono" font-size="12" font-weight="700" fill="{{ gcQBvStateColor }}">{{ gcQBvState }}</text>

          <!-- ===== vacuum branch: tee on the sample line -> VACUUM VALVE (fixed, stays) -> removable hose + pump ===== -->
          <path d="{{ gcQVacBrD }}" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round"></path>
          <path d="{{ gcQVacBrD }}" fill="none" stroke="#8ea0b8" stroke-width="4.2" stroke-linecap="round"></path>
          <path d="M520 152 V180" fill="none" stroke="#5fb0ff" stroke-width="3.6" style="{{ gcQStubFill }}"></path>
          <rect x="512" y="142" width="16" height="14" rx="2" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".9"></rect>
          <rect x="514" y="210" width="12" height="9" rx="1.5" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".8"></rect>
          <g style="{{ gcQVacStyle }}">
            <path d="{{ gcQVacBrD }}" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round" style="animation:gcdash calc(1s * var(--pm, 1)) linear infinite;"></path>
          </g>
          <g style="{{ gcQPumpShow }}">
            <path d="{{ gcQVacHoseD }}" fill="none" stroke="#10151d" stroke-width="9" stroke-linecap="round"></path>
            <path d="{{ gcQVacHoseD }}" fill="none" stroke="#4a5568" stroke-width="5" stroke-linecap="round"></path>
            <g style="{{ gcQVacStyle }}">
              <path d="{{ gcQVacHoseD }}" fill="none" stroke="#b48cff" stroke-width="2.6" stroke-dasharray="4 8" stroke-linecap="round" style="animation:gcdash calc(1s * var(--pm, 1)) linear infinite;"></path>
            </g>
            <g style="{{ gcQPumpHl }}">
              <rect x="444" y="290" width="124" height="8" rx="2" fill="#2a3444"></rect>
              <rect x="482" y="250" width="82" height="40" rx="8" fill="#3b4a60" stroke="#0a0e16" stroke-width="1.1"></rect>
              <g stroke="rgba(200,215,235,.28)" stroke-width="1.2"><line x1="512" y1="254" x2="512" y2="286"></line><line x1="522" y1="254" x2="522" y2="286"></line><line x1="532" y1="254" x2="532" y2="286"></line><line x1="542" y1="254" x2="542" y2="286"></line></g>
              <rect x="448" y="254" width="36" height="36" rx="4" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1.1"></rect>
              <circle cx="554" cy="262" r="3.6" fill="{{ gcQPumpLed }}" stroke="#0a0e16" stroke-width=".7"></circle>
            </g>
            <text x="506" y="316" text-anchor="middle" font-family="IBM Plex Sans" font-size="13" font-weight="700" letter-spacing="1" fill="var(--txt2)">VACUUM PUMP</text>
            <text x="506" y="330" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" font-weight="700" fill="#7c5bd6">{{ gcQPumpState }}</text>
          </g>
          <!-- vacuum valve (quarter-turn): handle along the pipe = OPEN, across = CLOSED -->
          <g style="{{ gcQVvHl }}">
            <rect x="509" y="180" width="22" height="20" rx="3.5" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1.2"></rect>
            <circle cx="520" cy="190" r="6" fill="#2a3444" stroke="#0a0e16" stroke-width=".8"></circle>
            <g transform="{{ gcQVvRot }}" style="transition:transform .2s linear;">
              <rect x="516" y="164" width="8" height="28" rx="4" fill="{{ gcQVvColor }}" stroke="#0a0e16" stroke-width="1"></rect>
            </g>
            <circle cx="520" cy="190" r="2.6" fill="#e2e7ed"></circle>
          </g>
          <rect x="536" y="174" width="88" height="36" rx="6" fill="rgba(244,247,251,.96)" stroke="#8a95a5" stroke-width="1"></rect>
          <text x="580" y="187" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" font-weight="700" letter-spacing=".4" fill="#3a4759">VACUUM VALVE</text>
          <text x="580" y="203" text-anchor="middle" font-family="IBM Plex Mono" font-size="12" font-weight="700" fill="{{ gcQVvStateColor }}">{{ gcQVvState }}</text>

          <!-- ===== external sample loop (port 3 -> loop -> port 6). It crosses OVER the sample line with a gap:
               no connection at the crossing. ===== -->
          <path d="M628 149 H644" fill="none" stroke="var(--panel)" stroke-width="13"></path>
          <path d="{{ gcQLoopXD }}" fill="none" stroke="#0a0e16" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="{{ gcQLoopXD }}" fill="none" stroke="#a9b6c7" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="{{ gcQLoopD }}" pathLength="100" fill="none" stroke="#5fb0ff" stroke-width="3.8" stroke-dasharray="{{ gcQLoopFill }}" stroke-linecap="round" stroke-linejoin="round" style="{{ gcQLoopFillStyle }}"></path>
          <text x="626" y="94" text-anchor="end" font-family="IBM Plex Mono" font-size="10" font-weight="700" letter-spacing=".5" fill="#3a4759">SAMPLE LOOP</text>
          <text x="626" y="107" text-anchor="end" font-family="IBM Plex Mono" font-size="9.5" fill="#566578">0.25 mL</text>

          <!-- ===== 6-port gas sampling (injection) valve on the GC deck ===== -->
          <g style="{{ gcQIvHl }}">
            <sc-for list="{{ gcQPorts }}" as="q" hint-placeholder-count="6">
              <rect x="{{ q.fx - 6 }}" y="{{ q.fy - 4.5 }}" width="12" height="9" rx="1.5" transform="{{ q.tf }}" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".8"></rect>
            </sc-for>
            <circle cx="698" cy="170" r="34" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width="1.4"></circle>
            <circle cx="698" cy="170" r="30.5" fill="#dfe6ee" stroke="#5c6b82" stroke-width="1"></circle>
            <rect x="691" y="118" width="14" height="8" rx="1.5" fill="#3a4759" stroke="#0a0e16" stroke-width=".8"></rect>
            <g transform="{{ gcQIvRot }}" style="transition:transform .2s linear;">
              <circle cx="698" cy="170" r="28" fill="rgba(180,194,212,.35)" stroke="rgba(60,75,95,.35)" stroke-width=".8"></circle>
              <path d="{{ gcQChA }}" fill="none" stroke="#1c2533" stroke-width="6" stroke-linecap="round"></path>
              <path d="{{ gcQChB }}" fill="none" stroke="#1c2533" stroke-width="6" stroke-linecap="round"></path>
              <path d="{{ gcQChC }}" fill="none" stroke="#1c2533" stroke-width="6" stroke-linecap="round"></path>
              <path d="{{ gcQChBr }}" pathLength="100" fill="none" stroke="#5fb0ff" stroke-width="3.4" stroke-dasharray="{{ gcQChBFill }}" stroke-linecap="round"></path>
              <path d="{{ gcQChCr }}" pathLength="100" fill="none" stroke="#5fb0ff" stroke-width="3.4" stroke-dasharray="{{ gcQChCFill }}" stroke-linecap="round" style="{{ gcQChCFillStyle }}"></path>
              <g style="{{ gcQChAFlowL }}"><path d="{{ gcQChA }}" fill="none" stroke="#bfe8ff" stroke-width="1.8" stroke-dasharray="3 4" style="animation:gcdash calc(.7s * var(--pm, 1)) linear infinite;"></path></g>
              <g style="{{ gcQChAFlowI }}"><path d="{{ gcQChAr }}" fill="none" stroke="#bfe8ff" stroke-width="1.8" stroke-dasharray="3 4" style="animation:gcdash calc(.7s * var(--pm, 1)) linear infinite;"></path></g>
              <g style="{{ gcQChCFlow }}"><path d="{{ gcQChCr }}" fill="none" stroke="#bfe8ff" stroke-width="1.8" stroke-dasharray="3 4" style="animation:gcdash calc(.7s * var(--pm, 1)) linear infinite;"></path></g>
              <circle cx="698" cy="170" r="7" fill="url(#gq-metal)" stroke="#0a0e16" stroke-width=".8"></circle>
              <line x1="698" y1="165" x2="698" y2="175" stroke="#2a3444" stroke-width="1.8"></line>
            </g>
            <sc-for list="{{ gcQPorts }}" as="q" hint-placeholder-count="6">
              <g>
                <circle cx="{{ q.x }}" cy="{{ q.y }}" r="2.8" fill="#0b1524"></circle>
                <text x="{{ q.lx }}" y="{{ q.ly }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" font-weight="700" fill="#3a4759">{{ q.n }}</text>
              </g>
            </sc-for>
          </g>
          <!-- vacuum reaches ONLY the sample path: loop, valve channels 4-3 / 6-5 and the line back to the tee -->
          <g style="{{ gcQVacStyle }}">
            <path d="{{ gcQVac2D }}" fill="none" stroke="#8b5cf6" stroke-width="2.6" stroke-dasharray="4 8" stroke-linecap="round" stroke-linejoin="round" style="animation:gcdash calc(1s * var(--pm, 1)) linear infinite;"></path>
          </g>
          <!-- INJECT: helium sweeping the loop (port 1 -> 6 -> loop -> 3 -> 2) and the measured sample slug -->
          <g style="{{ gcQInjCar }}">
            <path d="{{ gcQInjD }}" fill="none" stroke="#bfe8ff" stroke-width="1.6" stroke-dasharray="3 7" stroke-linecap="round" stroke-linejoin="round" style="animation:gcdash calc(.8s * var(--pm, 1)) linear infinite;"></path>
          </g>
          <path d="{{ gcQInjD }}" pathLength="100" fill="none" stroke="#5fb0ff" stroke-width="4.2" stroke-dasharray="{{ gcQSlugDash }}" stroke-dashoffset="{{ gcQSlugOff }}" stroke-linecap="round" stroke-linejoin="round" style="{{ gcQSlugStyle }}"></path>
          <g style="{{ gcQFrontStyle }}">
            <circle cx="{{ gcQFrontX }}" cy="{{ gcQFrontY }}" r="10" fill="rgba(95,176,255,.28)"></circle>
            <circle cx="{{ gcQFrontX }}" cy="{{ gcQFrontY }}" r="5" fill="#5fb0ff" stroke="#e6f3ff" stroke-width="1.2"></circle>
          </g>
          <text x="688" y="124" text-anchor="end" font-family="IBM Plex Mono" font-size="7.5" font-weight="700" fill="#566578">CAPPED</text>
          <!-- valve position + current connections -->
          <rect x="782" y="116" width="164" height="72" rx="7" fill="{{ gcQIvPill }}" stroke="{{ gcQIvPillStroke }}" stroke-width="1.1"></rect>
          <text x="794" y="131" font-family="IBM Plex Mono" font-size="8.5" font-weight="700" letter-spacing=".5" fill="#3a4759">6-PORT INJECTION VALVE</text>
          <text x="794" y="151" font-family="IBM Plex Mono" font-size="15" font-weight="700" fill="{{ gcQIvStateColor }}">{{ gcQIvState }}</text>
          <text x="794" y="167" font-family="IBM Plex Mono" font-size="8.5" font-weight="600" fill="#3a4759">{{ gcQIvL1 }}</text>
          <text x="794" y="180" font-family="IBM Plex Mono" font-size="8.5" font-weight="600" fill="#3a4759">{{ gcQIvL2 }}</text>

          <!-- ===== 7 · computer / data system (right of the balloon oven) ===== -->
          <g transform="translate(264,0)">
          <rect x="1022" y="512" width="166" height="136" rx="8" fill="#17293f" stroke="#4a5f7e" stroke-width="1.9"></rect>
          <rect x="1030" y="520" width="150" height="118" rx="4" fill="#06101e" stroke="#1d3350" stroke-width="1"></rect>
          <line x1="1042" y1="574" x2="1172" y2="574" stroke="rgba(150,180,215,.45)" stroke-width="1"></line>
          <line x1="1042" y1="630" x2="1172" y2="630" stroke="rgba(150,180,215,.45)" stroke-width="1"></line>
          <line x1="1042" y1="526" x2="1042" y2="630" stroke="rgba(150,180,215,.45)" stroke-width="1"></line>
          <line x1="1036" y1="580" x2="1176" y2="580" stroke="rgba(150,180,215,.18)" stroke-width="1"></line>
          <text x="1174" y="534" text-anchor="end" font-family="IBM Plex Mono" font-size="9" font-weight="700" fill="#f3b24a">TCD</text>
          <text x="1174" y="590" text-anchor="end" font-family="IBM Plex Mono" font-size="9" font-weight="700" fill="#35d0b0">FID</text>
          <path d="{{ gcGMiniTcdD }}" fill="none" stroke="#f3b24a" stroke-width="1.4" stroke-linejoin="round"></path>
          <path d="{{ gcGMiniFidD }}" fill="none" stroke="#35d0b0" stroke-width="1.4" stroke-linejoin="round"></path>
          <rect x="1094" y="648" width="22" height="104" fill="#22344e"></rect>
          <rect x="1058" y="752" width="94" height="11" rx="4" fill="#2a394f" stroke="#44586f" stroke-width="1"></rect>

          </g>
          <!-- labels at bench level -->
          <text x="80" y="814" text-anchor="middle" font-family="IBM Plex Sans" font-size="18" font-weight="600" fill="var(--txt)">Carrier Gas</text>
          <text x="414" y="814" text-anchor="middle" font-family="IBM Plex Sans" font-size="18" font-weight="600" fill="var(--txt)">Balloon Oven · 80 &#176;C</text>
          <text x="1369" y="814" text-anchor="middle" font-family="IBM Plex Sans" font-size="18" font-weight="600" fill="var(--txt)">Computer</text>
          <text x="926" y="812" text-anchor="middle" font-family="IBM Plex Mono" font-size="13" fill="var(--cap)">Injected sample &#8594; split tee &#8594; packed column &#8594; TCD  |  capillary column &#8594; FID</text>
          <g font-family="IBM Plex Sans" font-size="12" fill="var(--mut)">
            <line x1="176" y1="844" x2="202" y2="844" stroke="#6fc7f0" stroke-width="3" stroke-dasharray="5 4" stroke-linecap="round"></line>
            <text x="210" y="848">Carrier gas</text>
            <line x1="302" y1="844" x2="328" y2="844" stroke="#5fb0ff" stroke-width="4" stroke-linecap="round"></line>
            <text x="336" y="848">Sample gas</text>
            <line x1="430" y1="844" x2="456" y2="844" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="4 4" stroke-linecap="round"></line>
            <text x="464" y="848">Vacuum</text>
            <line x1="536" y1="844" x2="562" y2="844" stroke="#0b0f15" stroke-width="6" stroke-linecap="round"></line>
            <line x1="536" y1="844" x2="562" y2="844" stroke="#46d39a" stroke-width="2" stroke-dasharray="4 5"></line>
            <text x="570" y="848">Data cable</text>
            <line x1="676" y1="844" x2="702" y2="844" stroke="#3a2006" stroke-width="5.4" stroke-linecap="round"></line>
            <line x1="676" y1="844" x2="702" y2="844" stroke="#c9843a" stroke-width="3.6" stroke-linecap="round"></line>
            <line x1="676" y1="844" x2="702" y2="844" stroke="#ffd27a" stroke-width="1.5" stroke-dasharray="4 4"></line>
            <text x="710" y="848" font-weight="600" fill="#c27f1c">Capillary column &#8594; FID (HC only)</text>
            <line x1="972" y1="844" x2="998" y2="844" stroke="#10151d" stroke-width="10" stroke-linecap="round"></line>
            <line x1="972" y1="844" x2="998" y2="844" stroke="#9fadbf" stroke-width="7" stroke-linecap="round"></line>
            <line x1="972" y1="844" x2="998" y2="844" stroke="#5ff0cf" stroke-width="2.4" stroke-dasharray="4 4"></line>
            <text x="1006" y="848" font-weight="600" fill="#15977c">Packed column &#8594; TCD (all components)</text>
          </g>
        </svg>
        </sc-if>

        <!-- ================= OIL SCHEMATIC (single GC instrument, internal view) ================= -->
        <sc-if value="{{ gcIsOil }}" hint-placeholder-val="{{ false }}">
        <svg viewBox="0 -50 1200 898" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;">
          <defs>
            <linearGradient id="go-metal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#6b7c94"></stop><stop offset=".35" stop-color="#d3dfef"></stop><stop offset=".65" stop-color="#97a8bf"></stop><stop offset="1" stop-color="#55637a"></stop>
            </linearGradient>
            <linearGradient id="go-cyl" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#25455f"></stop><stop offset=".38" stop-color="#7fa8c4"></stop><stop offset=".72" stop-color="#43647e"></stop><stop offset="1" stop-color="#1d3346"></stop>
            </linearGradient>
            <linearGradient id="go-amber" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#e0a94a"></stop><stop offset="1" stop-color="#a06f22"></stop>
            </linearGradient>
            <radialGradient id="gn-colglow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="rgba(231,177,90,.16)"></stop><stop offset=".6" stop-color="rgba(231,177,90,.07)"></stop><stop offset="1" stop-color="rgba(231,177,90,0)"></stop>
            </radialGradient>
            <linearGradient id="gn-shell" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#e3e8ef"></stop><stop offset="1" stop-color="#bcc5d1"></stop>
            </linearGradient>
            <linearGradient id="gn-deck" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#f0f3f7"></stop><stop offset="1" stop-color="#cdd4de"></stop>
            </linearGradient>
            <radialGradient id="gn-back" cx="50%" cy="50%" r="60%">
              <stop offset="0" stop-color="#3a4556"></stop><stop offset="1" stop-color="#1c232e"></stop>
            </radialGradient>
            <linearGradient id="gn-wtop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#1e252f"></stop><stop offset="1" stop-color="#343e4e"></stop>
            </linearGradient>
            <linearGradient id="gn-wleft" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#12171f"></stop><stop offset="1" stop-color="#262e3b"></stop>
            </linearGradient>
            <linearGradient id="gn-wright" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0" stop-color="#4a5568"></stop><stop offset="1" stop-color="#303a4a"></stop>
            </linearGradient>
            <linearGradient id="gn-wbot" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stop-color="#566276"></stop><stop offset="1" stop-color="#363f4f"></stop>
            </linearGradient>
            <linearGradient id="gn-door" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#b4a589"></stop><stop offset="1" stop-color="#e2d8c3"></stop>
            </linearGradient>
            <linearGradient id="gn-doorrim" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#aeb8c5"></stop><stop offset="1" stop-color="#dfe5ec"></stop>
            </linearGradient>
            <linearGradient id="gn-screen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#0d1d31"></stop><stop offset="1" stop-color="#06101e"></stop>
            </linearGradient>
            <radialGradient id="gn-floor" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="rgba(0,0,0,.34)"></stop><stop offset="1" stop-color="rgba(0,0,0,0)"></stop>
            </radialGradient>
          </defs>

          <!-- floor shadows -->
          <ellipse cx="80" cy="784" rx="62" ry="9" fill="url(#gn-floor)"></ellipse>
          <ellipse cx="660" cy="786" rx="380" ry="13" fill="url(#gn-floor)"></ellipse>
          <ellipse cx="1105" cy="770" rx="70" ry="7" fill="url(#gn-floor)"></ellipse>


          <!-- ===== 1 · carrier gas cylinder with regulator ===== -->
          <g style="{{ gcCylHl }}">
            <rect x="40" y="330" width="80" height="446" rx="26" fill="url(#go-cyl)" stroke="#0a0e16" stroke-width="1.6"></rect>
            <rect x="51" y="352" width="11" height="400" rx="5" fill="rgba(226,242,255,.20)"></rect>
            <rect x="41" y="384" width="78" height="8" fill="rgba(8,16,26,.28)"></rect>
            <text x="80" y="560" text-anchor="middle" font-family="IBM Plex Sans" font-size="22" font-weight="700" fill="rgba(232,242,252,.8)">He</text>
            <rect x="69" y="300" width="22" height="32" rx="3" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1.1"></rect>
            <rect x="60" y="306" width="40" height="7" rx="3.5" fill="{{ gcNValveFill }}" stroke="#0a0e16" stroke-width=".9" style="transition:fill .3s ease;"></rect>
            <sc-for list="{{ gcNValveRidges }}" as="r" hint-placeholder-count="5">
              <line x1="{{ r.x }}" y1="307" x2="{{ r.x }}" y2="312" stroke="rgba(10,14,22,.55)" stroke-width="1.3"></line>
            </sc-for>
            <g style="{{ gcNValveTurn }}">
              <path d="M50 322 A 32 8 0 0 0 110 322" fill="none" stroke="#2f6fd0" stroke-width="2.2" stroke-linecap="round"></path>
              <path d="M110 322 l-7 -3 m7 3 l-3 6" fill="none" stroke="#2f6fd0" stroke-width="2" stroke-linecap="round"></path>
            </g>
          </g>
          <!-- ===== two-gauge regulator on the cylinder valve ===== -->
          <!-- gauge values are ILLUSTRATIVE (HE constants): cylinder full from the start, outlet 0 until the valve opens -->
          <g style="{{ gcNRegHl }}">
          <rect x="68" y="236" width="24" height="74" rx="4" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1.1"></rect>
          <rect x="50" y="254" width="60" height="14" rx="3" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="76" y="218" width="8" height="20" fill="url(#go-metal)" stroke="#0a0e16" stroke-width=".8"></rect>
          <rect x="62" y="206" width="36" height="13" rx="4" fill="#3b4a60" stroke="#0a0e16" stroke-width="1"></rect>
          <g stroke="rgba(220,230,245,.45)" stroke-width="1"><line x1="69" y1="208" x2="69" y2="217"></line><line x1="75" y1="208" x2="75" y2="217"></line><line x1="81" y1="208" x2="81" y2="217"></line><line x1="87" y1="208" x2="87" y2="217"></line><line x1="93" y1="208" x2="93" y2="217"></line></g>
          <circle cx="28" cy="261" r="25" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1.3"></circle>
          <circle cx="28" cy="261" r="21" fill="#f2f5f8" stroke="#5c6b82" stroke-width=".9"></circle>
          <g stroke="#5c6b82" stroke-width="1.2"><line x1="16.7" y1="272.3" x2="14.2" y2="274.8"></line><line x1="12.8" y1="265.9" x2="9.5" y2="267.0"></line><line x1="12.2" y1="258.5" x2="8.7" y2="257.9"></line><line x1="15.1" y1="251.6" x2="12.2" y2="249.5"></line><line x1="20.7" y1="246.7" x2="19.1" y2="243.6"></line><line x1="28.0" y1="245.0" x2="28.0" y2="241.5"></line><line x1="35.3" y1="246.7" x2="36.9" y2="243.6"></line><line x1="40.9" y1="251.6" x2="43.8" y2="249.5"></line><line x1="43.8" y1="258.5" x2="47.3" y2="257.9"></line><line x1="43.2" y1="265.9" x2="46.5" y2="267.0"></line><line x1="39.3" y1="272.3" x2="41.8" y2="274.8"></line></g>
          <text x="28" y="274" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" font-weight="700" fill="#3a4759">{{ gcNCylPsi }}</text>
          <text x="28" y="281.5" text-anchor="middle" font-family="IBM Plex Mono" font-size="6" fill="#5c6b82">psi</text>
          <line x1="28" y1="261" x2="{{ gcNCylGX }}" y2="{{ gcNCylGY }}" stroke="#c33a52" stroke-width="2" stroke-linecap="round"></line>
          <circle cx="28" cy="261" r="2.8" fill="#3a4759"></circle>
          <text x="28" y="215" text-anchor="middle" font-family="IBM Plex Sans" font-size="12.5" font-weight="600" fill="var(--txt)">Cylinder</text>
          <text x="28" y="229" text-anchor="middle" font-family="IBM Plex Sans" font-size="12.5" font-weight="600" fill="var(--txt)">pressure</text>
          <circle cx="132" cy="261" r="25" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1.3"></circle>
          <circle cx="132" cy="261" r="21" fill="#f2f5f8" stroke="#5c6b82" stroke-width=".9"></circle>
          <g stroke="#5c6b82" stroke-width="1.2"><line x1="120.7" y1="272.3" x2="118.2" y2="274.8"></line><line x1="116.8" y1="265.9" x2="113.5" y2="267.0"></line><line x1="116.2" y1="258.5" x2="112.7" y2="257.9"></line><line x1="119.1" y1="251.6" x2="116.2" y2="249.5"></line><line x1="124.7" y1="246.7" x2="123.1" y2="243.6"></line><line x1="132.0" y1="245.0" x2="132.0" y2="241.5"></line><line x1="139.3" y1="246.7" x2="140.9" y2="243.6"></line><line x1="144.9" y1="251.6" x2="147.8" y2="249.5"></line><line x1="147.8" y1="258.5" x2="151.3" y2="257.9"></line><line x1="147.2" y1="265.9" x2="150.5" y2="267.0"></line><line x1="143.3" y1="272.3" x2="145.8" y2="274.8"></line></g>
          <text x="132" y="274" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" font-weight="700" fill="{{ gcNOutPsiColor }}">{{ gcNOutPsi }}</text>
          <text x="132" y="281.5" text-anchor="middle" font-family="IBM Plex Mono" font-size="6" fill="#5c6b82">psi</text>
          <line x1="132" y1="261" x2="{{ gcNOutGX }}" y2="{{ gcNOutGY }}" stroke="#c33a52" stroke-width="2" stroke-linecap="round"></line>
          <circle cx="132" cy="261" r="2.8" fill="#3a4759"></circle>
          <text x="132" y="215" text-anchor="middle" font-family="IBM Plex Sans" font-size="12.5" font-weight="600" fill="var(--txt)">Outlet</text>
          <text x="132" y="229" text-anchor="middle" font-family="IBM Plex Sans" font-size="12.5" font-weight="600" fill="var(--txt)">pressure</text>
          <text x="80" y="176" text-anchor="middle" font-family="IBM Plex Sans" font-size="17" font-weight="600" fill="var(--txt)">Regulator</text>
          </g>
          <text x="80" y="193" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="var(--cap)">illustrative pressures</text>
          <rect x="47" y="398" width="66" height="34" rx="5" fill="rgba(244,247,251,.94)" stroke="#0a0e16" stroke-width=".9"></rect>
          <text x="80" y="411" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="#566578">CYL. VALVE</text>
          <text x="80" y="426" text-anchor="middle" font-family="IBM Plex Mono" font-size="11" font-weight="700" fill="{{ gcNValveStateColor }}">{{ gcNValveState }}</text>

          <!-- regulator outlet -> raised flow controller (straight run at outlet height) -->
          <path d="M92 302 H166" fill="none" stroke="#0a0e16" stroke-width="10" stroke-linecap="round"></path>
          <path d="M92 302 H166" fill="none" stroke="#97a8bf" stroke-width="5.5" stroke-linecap="round"></path>
          <g style="{{ gcNSupplyFlow }}">
            <path d="M92 302 H166" fill="none" stroke="#6fc7f0" stroke-width="2.6" stroke-dasharray="5 11" stroke-linecap="round" style="animation:gcdash calc(.75s * var(--pm, 1)) linear infinite;"></path>
          </g>

          <!-- ===== 2 · flow controller, mounted on the regulator outlet and clamped to the cylinder collar ===== -->
          <rect x="38" y="342" width="84" height="12" rx="3" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <path d="M120 344 H214 V334 H226 V354 H120 Z" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1" stroke-linejoin="round"></path>
          <circle cx="112" cy="348" r="2.4" fill="#2a3444"></circle><circle cx="219" cy="348" r="2.2" fill="#2a3444"></circle>
          <g style="{{ gcNCtrlGlow }}">
          <rect x="166" y="270" width="92" height="64" rx="9" fill="url(#go-amber)" stroke="{{ gcNCtrlBorder }}" stroke-width="1.8" style="transition:stroke .3s ease;"></rect>
          <rect x="174" y="280" width="76" height="22" rx="4" fill="#0b1524" stroke="#1d3350" stroke-width="1"></rect>
          <text x="212" y="295" text-anchor="middle" font-family="IBM Plex Mono" font-size="10.5" font-weight="600" fill="{{ gcNFlowColor }}">{{ gcNFlowText }}</text>
          <circle cx="182" cy="319" r="4" fill="{{ gcNCtrlLed }}" stroke="#5d3f10" stroke-width="1"></circle>
          <rect x="191" y="312" width="61" height="14" rx="3" fill="rgba(11,21,36,.62)"></rect>
          <text x="221.5" y="322" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" font-weight="700" fill="{{ gcNFlowSubColor }}">{{ gcNFlowSub }}</text>
          </g>
          <text x="212" y="376" text-anchor="middle" font-family="IBM Plex Sans" font-size="17" font-weight="600" fill="var(--txt)">Flow Controller</text>

          <!-- flow controller -> injection port (carrier-gas tubing) -->
          <path d="M258 302 H260 Q270 302 270 292 V190 Q270 180 280 180 H414" fill="none" stroke="#0a0e16" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M258 302 H260 Q270 302 270 292 V190 Q270 180 280 180 H414" fill="none" stroke="#97a8bf" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"></path>
          <g style="{{ gcNMainFlow }}">
            <path d="M258 302 H260 Q270 302 270 292 V190 Q270 180 280 180 H414" fill="none" stroke="#6fc7f0" stroke-width="2.6" stroke-dasharray="5 11" stroke-linecap="round" stroke-linejoin="round" style="animation:gcdash calc(.75s * var(--pm, 1)) linear infinite;"></path>
          </g>

          <!-- ===== 3 · GC instrument housing ===== -->
          <rect x="396" y="770" width="40" height="13" rx="3" fill="#2a3444"></rect>
          <rect x="926" y="770" width="40" height="13" rx="3" fill="#2a3444"></rect>
          <rect x="372" y="258" width="618" height="516" rx="10" fill="url(#gn-shell)" stroke="#0a0e16" stroke-width="1.5"></rect>
          <rect x="384" y="196" width="594" height="68" rx="8" fill="url(#gn-deck)" stroke="#0a0e16" stroke-width="1.3"></rect>
          <rect x="390" y="199" width="582" height="4" rx="2" fill="rgba(255,255,255,.55)"></rect>
          <g fill="rgba(40,52,70,.28)">
            <rect x="802" y="216" width="150" height="4" rx="2"></rect><rect x="802" y="226" width="150" height="4" rx="2"></rect>
            <rect x="802" y="236" width="150" height="4" rx="2"></rect><rect x="802" y="246" width="150" height="4" rx="2"></rect>
          </g>
          <line x1="786" y1="266" x2="786" y2="772" stroke="rgba(10,20,30,.22)" stroke-width="1.4"></line>
          <text x="452" y="282" font-family="IBM Plex Sans" font-size="12" font-weight="700" letter-spacing="2" fill="#2b3646">GC OVEN</text>
          <rect x="592" y="268" width="104" height="19" rx="9.5" fill="rgba(47,111,208,.12)" stroke="rgba(47,111,208,.55)" stroke-width="1"></rect>
          <text x="644" y="281.5" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" font-weight="600" fill="#2f6fd0">Internal view</text>

          <!-- ===== oven chamber (depth + insulated walls) ===== -->
          <rect x="389" y="289" width="386" height="462" rx="4" fill="#0e131b" stroke="{{ gcOvenStroke }}" stroke-width="2.2" style="transition:stroke .3s linear;"></rect>
          <polygon points="392,292 772,292 740,324 424,324" fill="url(#gn-wtop)"></polygon>
          <polygon points="392,292 424,324 424,716 392,748" fill="url(#gn-wleft)"></polygon>
          <polygon points="772,292 772,748 740,716 740,324" fill="url(#gn-wright)"></polygon>
          <polygon points="392,748 424,716 740,716 772,748" fill="url(#gn-wbot)"></polygon>
          <rect x="424" y="324" width="316" height="392" fill="url(#gn-back)"></rect>
          <rect x="424" y="324" width="316" height="392" fill="{{ gcOvenGlow }}" style="transition:fill .3s linear;"></rect>
          <polygon points="392,292 424,324 424,716 392,748" fill="rgba(0,0,0,.18)"></polygon>

          <!-- rear circulation fan -->
          <g>
            <circle cx="582" cy="520" r="113" fill="#141a23" stroke="#5a687e" stroke-width="2"></circle>
            <path d="M602.0 520.0 L641.0 539.2 L652.5 579.1 L641.1 595.6 L635.6 565.0 L619.1 535.0 L600.8 526.8Z M592.0 537.3 L594.9 580.6 L566.0 610.6 L546.0 609.0 L569.8 588.9 L587.6 559.6 L585.5 539.7Z M572.0 537.3 L535.9 561.5 L495.5 551.5 L486.9 533.4 L516.2 543.9 L550.5 544.6 L566.7 532.9Z M562.0 520.0 L523.0 500.8 L511.5 460.9 L522.9 444.4 L528.4 475.0 L544.9 505.0 L563.2 513.2Z M572.0 502.7 L569.1 459.4 L598.0 429.4 L618.0 431.0 L594.2 451.1 L576.4 480.4 L578.5 500.3Z M592.0 502.7 L628.1 478.5 L668.5 488.5 L677.1 506.6 L647.8 496.1 L613.5 495.4 L597.3 507.1Z" fill="#2c3646" stroke="#465367" stroke-width="1"></path>
            <g fill="none" stroke="#56647a" stroke-width="1.4" opacity=".85">
              <circle cx="582" cy="520" r="94"></circle><circle cx="582" cy="520" r="74"></circle><circle cx="582" cy="520" r="52"></circle>
              <line x1="603.3" y1="525.7" x2="688.3" y2="548.5"></line><line x1="597.6" y1="535.6" x2="659.8" y2="597.8"></line><line x1="587.7" y1="541.3" x2="610.5" y2="626.3"></line><line x1="576.3" y1="541.3" x2="553.5" y2="626.3"></line><line x1="566.4" y1="535.6" x2="504.2" y2="597.8"></line><line x1="560.7" y1="525.7" x2="475.7" y2="548.5"></line><line x1="560.7" y1="514.3" x2="475.7" y2="491.5"></line><line x1="566.4" y1="504.4" x2="504.2" y2="442.2"></line><line x1="576.3" y1="498.7" x2="553.5" y2="413.7"></line><line x1="587.7" y1="498.7" x2="610.5" y2="413.7"></line><line x1="597.6" y1="504.4" x2="659.8" y2="442.2"></line><line x1="603.3" y1="514.3" x2="688.3" y2="491.5"></line>
            </g>
            <circle cx="582" cy="520" r="19" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1.1"></circle>
          </g>
          <ellipse cx="582" cy="520" rx="176" ry="176" fill="url(#gn-colglow)"></ellipse>

          <!-- column cage: hanger bracket from the oven ceiling + support ring -->
          <rect x="577" y="324" width="10" height="50" fill="url(#go-metal)" stroke="#0a0e16" stroke-width=".8"></rect>
          <circle cx="582" cy="520" r="135" fill="none" stroke="#7b8ba3" stroke-width="2.4" opacity=".55"></circle>

          <!-- column end fittings in the oven ceiling -->
          <rect x="423" y="292" width="18" height="16" rx="2" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="721" y="292" width="18" height="16" rx="2" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <text x="446" y="318" font-family="IBM Plex Mono" font-size="10" font-weight="600" fill="rgba(214,226,242,.78)">COLUMN IN</text>
          <text x="716" y="318" text-anchor="end" font-family="IBM Plex Mono" font-size="10" font-weight="600" fill="rgba(214,226,242,.78)">TO DETECTOR</text>

          <!-- ===== 4 · injection port (top left) — cutaway of the heated inlet ===== -->
          <rect x="408" y="200" width="48" height="62" rx="4" fill="{{ gcInjFill }}" stroke="{{ gcInjStroke }}" stroke-width="1.8" style="transition:fill .3s linear, stroke .3s linear;"></rect>
          <rect x="425" y="204" width="14" height="56" rx="3" fill="rgba(200,225,245,.10)" stroke="rgba(200,225,245,.45)" stroke-width="1"></rect>
          <rect x="424" y="262" width="16" height="30" fill="#10151d"></rect>
          <rect x="414" y="160" width="36" height="40" rx="3" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1.2"></rect>
          <rect x="420" y="148" width="24" height="14" rx="3" fill="#5f6f86" stroke="#0a0e16" stroke-width="1.1"></rect>
          <circle cx="432" cy="149" r="3" fill="#1a232f"></circle>
          <rect x="404" y="174" width="11" height="12" rx="2" fill="url(#go-metal)" stroke="#0a0e16" stroke-width="1"></rect>
          <line x1="398" y1="146" x2="412" y2="152" stroke="var(--mut)" stroke-width="1.2"></line>
          <text x="394" y="148" text-anchor="end" font-family="IBM Plex Sans" font-size="18" font-weight="600" fill="var(--txt)">Injection Port</text>
          <g style="{{ gcDropStyle }}">
            <ellipse cx="432" cy="{{ gcNDropY }}" rx="{{ gcDropRx }}" ry="{{ gcDropRy }}" fill="rgba(231,177,90,.85)" style="transition:rx .12s linear, ry .12s linear;"></ellipse>
          </g>
          <g style="{{ gcVaporStyle }}">
            <circle cx="{{ gcNVapAx }}" cy="{{ gcNVapAy }}" r="{{ gcVapR }}" fill="rgba(231,177,90,.26)"></circle>
            <circle cx="{{ gcNVapBx }}" cy="{{ gcNVapBy }}" r="{{ gcVapR2 }}" fill="rgba(231,177,90,.2)"></circle>
            <circle cx="432" cy="232" r="{{ gcVapR3 }}" fill="rgba(255,228,175,.18)"></circle>
          </g>

          <!-- ===== 5 · detector (top right) ===== -->
          <rect x="712" y="200" width="36" height="62" rx="4" fill="#15202f" stroke="#3a4c66" stroke-width="1.2"></rect>
          <rect x="722" y="262" width="16" height="30" fill="#10151d"></rect>
          <rect x="690" y="132" width="80" height="68" rx="9" fill="#17293f" stroke="{{ gcODetStroke }}" stroke-width="1.9" style="transition:stroke .3s linear;"></rect>
          <circle cx="730" cy="164" r="{{ gcOPulseR }}" fill="none" stroke="{{ gcOPulseColor }}" stroke-width="2.6" style="{{ gcOPulseStyle }}"></circle>
          <circle cx="730" cy="164" r="17" fill="{{ gcODetGlow }}" stroke="#5d7391" stroke-width="1.5" style="transition:fill .25s linear;"></circle>
          <circle cx="758" cy="146" r="5" fill="{{ gcDetLampA }}" stroke="#0a0e16" stroke-width="1"></circle>
          <circle cx="758" cy="182" r="5" fill="{{ gcDetLampB }}" stroke="#0a0e16" stroke-width="1"></circle>
          <text x="706" y="124" text-anchor="middle" font-family="IBM Plex Sans" font-size="18" font-weight="600" fill="var(--txt)">Detector</text>
          <text x="782" y="176" font-family="IBM Plex Mono" font-size="14" font-weight="700" fill="{{ gcODetIndColor }}" style="{{ gcODetIndStyle }}">{{ gcODetInd }}</text>

          <!-- ===== fused-silica capillary column (inlet → circular coil → detector) ===== -->
          <path d="{{ gcNColD }}" fill="none" stroke="#3a2006" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round" opacity=".92"></path>
          <path d="{{ gcNColD }}" fill="none" stroke="#c9843a" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="{{ gcNColD }}" fill="none" stroke="rgba(255,232,196,.5)" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round"></path>
          <!-- cage clips holding the coil -->
          <g fill="url(#go-metal)" stroke="#0a0e16" stroke-width=".8">
            <rect x="577" y="364" width="10" height="42" rx="2"></rect>
            <rect x="577" y="364" width="10" height="42" rx="2" transform="rotate(120 582 520)"></rect>
            <rect x="577" y="364" width="10" height="42" rx="2" transform="rotate(240 582 520)"></rect>
          </g>
          <g style="{{ gcNColFlow }}">
            <path d="{{ gcNColD }}" fill="none" stroke="rgba(190,228,252,.9)" stroke-width="1.5" stroke-dasharray="3 13" stroke-linecap="round" style="animation:gcdash calc(1.1s * var(--pm, 1)) linear infinite;"></path>
          </g>
          <g style="{{ gcColumnFlow }}">
            <sc-for list="{{ gcNParticles }}" as="p" hint-placeholder-count="0">
              <circle cx="{{ p.x }}" cy="{{ p.y }}" r="2.2" fill="rgba(176,220,250,.85)"></circle>
            </sc-for>
          </g>
          <text x="582" y="704" text-anchor="middle" font-family="IBM Plex Sans" font-size="16" font-weight="600" fill="#e7b15a">Capillary Column</text>

          <!-- separated component bands travelling the column -->
          <sc-for list="{{ gcOilBands }}" as="b" hint-placeholder-count="0">
            <g style="{{ b.style }}">
              <circle cx="{{ b.x }}" cy="{{ b.y }}" r="{{ b.hr }}" fill="{{ b.halo }}"></circle>
              <circle cx="{{ b.x }}" cy="{{ b.y }}" r="{{ b.r }}" fill="{{ b.fill }}" stroke="{{ b.stroke }}" stroke-width="1.2"></circle>
              <text x="{{ b.lx }}" y="{{ b.ly }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="12.5" font-weight="700" fill="{{ b.stroke }}" style="{{ b.labelStyle }}">{{ b.k }}</text>
            </g>
          </sc-for>

          <!-- ===== oven door — hinged left, shown open for the internal view ===== -->
          <polygon points="306,262 296,267 296,779 306,784" fill="#8e99a7" stroke="#0a0e16" stroke-width="1"></polygon>
          <polygon points="389,293 306,262 306,784 389,747" fill="url(#gn-doorrim)" stroke="#0a0e16" stroke-width="1.3"></polygon>
          <polygon points="381,305 316,280 316,766 381,735" fill="url(#gn-door)" stroke="rgba(60,48,30,.35)" stroke-width="1"></polygon>
          <g stroke="rgba(110,90,58,.28)" stroke-width="1">
            <line x1="316" y1="377" x2="381" y2="391"></line><line x1="316" y1="474" x2="381" y2="477"></line>
            <line x1="316" y1="572" x2="381" y2="563"></line><line x1="316" y1="669" x2="381" y2="649"></line>
            <line x1="348" y1="293" x2="348" y2="751"></line>
          </g>
          <polygon points="381,305 389,293 389,747 381,735" fill="rgba(0,0,0,.22)"></polygon>
          <rect x="384" y="330" width="9" height="26" rx="2" fill="url(#go-metal)" stroke="#0a0e16" stroke-width=".8"></rect>
          <rect x="384" y="686" width="9" height="26" rx="2" fill="url(#go-metal)" stroke="#0a0e16" stroke-width=".8"></rect>
          <text x="0" y="0" transform="translate(352 520) rotate(-90)" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" font-weight="600" letter-spacing="1.5" fill="#6b5a3e">OVEN DOOR · OPEN</text>

          <!-- ===== control panel (right of the oven) ===== -->
          <text x="883" y="282" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" font-weight="700" letter-spacing="1.5" fill="#2b3646">CONTROL PANEL</text>
          <rect x="802" y="294" width="162" height="158" rx="8" fill="#1c2533" stroke="#0a0e16" stroke-width="1.2"></rect>
          <rect x="810" y="302" width="146" height="142" rx="4" fill="url(#gn-screen)"></rect>
          <text x="818" y="320" font-family="IBM Plex Mono" font-size="10" font-weight="600" letter-spacing="1" fill="#6fc7f0">GC · OIL METHOD</text>
          <line x1="818" y1="326" x2="948" y2="326" stroke="rgba(111,199,240,.25)" stroke-width="1"></line>
          <text x="818" y="344" font-family="IBM Plex Mono" font-size="9.5" fill="#8294ad">OVEN</text>
          <text x="818" y="359" font-family="IBM Plex Mono" font-size="11" font-weight="600" fill="{{ gcOvenTextColor }}">{{ gcOvenText }}</text>
          <text x="818" y="379" font-family="IBM Plex Mono" font-size="9.5" fill="#8294ad">INLET</text>
          <text x="818" y="394" font-family="IBM Plex Mono" font-size="11" font-weight="600" fill="{{ gcInjTextColor }}">{{ gcInjText }}</text>
          <text x="818" y="414" font-family="IBM Plex Mono" font-size="9.5" fill="#8294ad">DETECTOR</text>
          <text x="818" y="429" font-family="IBM Plex Mono" font-size="11" font-weight="600" fill="{{ gcDetColor }}">{{ gcDetText }}</text>
          <circle cx="818" cy="474" r="4.5" fill="{{ gcDetLampB }}" stroke="#0a0e16" stroke-width=".8"></circle>
          <text x="827" y="478" font-family="IBM Plex Mono" font-size="9" fill="#3a4759">READY</text>
          <circle cx="880" cy="474" r="4.5" fill="{{ gcDetLampA }}" stroke="#0a0e16" stroke-width=".8"></circle>
          <text x="889" y="478" font-family="IBM Plex Mono" font-size="9" fill="#3a4759">SIGNAL</text>
          <g fill="#e2e7ed" stroke="#8a95a5" stroke-width="1">
            <rect x="818" y="494" width="38" height="20" rx="3"></rect><rect x="864" y="494" width="38" height="20" rx="3"></rect><rect x="910" y="494" width="38" height="20" rx="3"></rect>
            <rect x="818" y="522" width="38" height="20" rx="3"></rect><rect x="864" y="522" width="38" height="20" rx="3"></rect><rect x="910" y="522" width="38" height="20" rx="3"></rect>
          </g>
          <g fill="rgba(40,52,70,.26)">
            <rect x="812" y="592" width="142" height="4" rx="2"></rect><rect x="812" y="604" width="142" height="4" rx="2"></rect>
            <rect x="812" y="616" width="142" height="4" rx="2"></rect><rect x="812" y="628" width="142" height="4" rx="2"></rect>
          </g>
          <rect x="814" y="716" width="32" height="30" rx="4" fill="#1c2533" stroke="#0a0e16" stroke-width="1"></rect>
          <rect x="818" y="720" width="24" height="12" rx="2" fill="#3fbf86"></rect>
          <text x="854" y="736" font-family="IBM Plex Sans" font-size="10" font-weight="700" letter-spacing="1" fill="#2b3646">POWER</text>

          <!-- ===== 6 · detector signal cable → computer ===== -->
          <path d="M750 132 V120 Q750 108 762 108 H988 Q1000 108 1000 120 V568 Q1000 580 1012 580 H1022" fill="none" stroke="#0b0f15" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M750 132 V120 Q750 108 762 108 H988 Q1000 108 1000 120 V568 Q1000 580 1012 580 H1022" fill="none" stroke="#34445a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
          <g style="{{ gcSignalStyle }}">
            <path d="M750 132 V120 Q750 108 762 108 H988 Q1000 108 1000 120 V568 Q1000 580 1012 580 H1022" fill="none" stroke="#46d39a" stroke-width="2.4" stroke-dasharray="4 9" stroke-linecap="round" stroke-linejoin="round" style="animation:gcdash calc(.45s * var(--pm, 1)) linear infinite;"></path>
          </g>
          <rect x="744" y="124" width="12" height="9" rx="2" fill="#2a3444" stroke="#0a0e16" stroke-width=".8"></rect>
          <rect x="1012" y="574" width="11" height="12" rx="2" fill="#2a3444" stroke="#0a0e16" stroke-width=".8"></rect>

          <!-- ===== 7 · computer / data system ===== -->
          <rect x="1022" y="512" width="166" height="136" rx="8" fill="#17293f" stroke="#4a5f7e" stroke-width="1.9"></rect>
          <rect x="1030" y="520" width="150" height="118" rx="4" fill="#06101e" stroke="#1d3350" stroke-width="1"></rect>
          <line x1="1042" y1="626" x2="1172" y2="626" stroke="rgba(150,180,215,.45)" stroke-width="1"></line>
          <line x1="1042" y1="530" x2="1042" y2="626" stroke="rgba(150,180,215,.45)" stroke-width="1"></line>
          <path d="{{ gcNMiniTraceD }}" fill="none" stroke="{{ gcTraceColor }}" stroke-width="1.6" stroke-linejoin="round"></path>
          <rect x="1094" y="648" width="22" height="104" fill="#22344e"></rect>
          <rect x="1058" y="752" width="94" height="11" rx="4" fill="#2a394f" stroke="#44586f" stroke-width="1"></rect>

          <!-- labels at bench level -->
          <text x="80" y="814" text-anchor="middle" font-family="IBM Plex Sans" font-size="18" font-weight="600" fill="var(--txt)">Carrier Gas</text>
          <text x="1105" y="814" text-anchor="middle" font-family="IBM Plex Sans" font-size="18" font-weight="600" fill="var(--txt)">Computer</text>
          <text x="660" y="812" text-anchor="middle" font-family="IBM Plex Mono" font-size="13" fill="var(--cap)">Column separation &#8594; Detector response &#8594; Chromatogram peak</text>
          <g font-family="IBM Plex Sans" font-size="12" fill="var(--mut)">
            <line x1="452" y1="836" x2="478" y2="836" stroke="#97a8bf" stroke-width="5" stroke-linecap="round"></line>
            <text x="486" y="840">Carrier-gas tubing</text>
            <line x1="612" y1="836" x2="638" y2="836" stroke="#0b0f15" stroke-width="6" stroke-linecap="round"></line>
            <line x1="612" y1="836" x2="638" y2="836" stroke="#46d39a" stroke-width="2" stroke-dasharray="4 5"></line>
            <text x="646" y="840">Detector signal cable</text>
            <line x1="784" y1="836" x2="810" y2="836" stroke="#c9843a" stroke-width="3.6" stroke-linecap="round"></line>
            <text x="818" y="840">Capillary column</text>
          </g>

          <!-- ===== automatic liquid sampler: sample tray, tower + gantry arm, syringe carriage ===== -->
          <text x="398" y="-25" text-anchor="end" font-family="IBM Plex Sans" font-size="17" font-weight="600" fill="var(--txt)">Automatic Liquid Sampler</text>
          <!-- tower (stands on the GC top) -->
          <rect x="612" y="192" width="54" height="8" rx="2" fill="#2a3444"></rect>
          <rect x="618" y="-42" width="42" height="236" rx="5" fill="url(#gn-shell)" stroke="#0a0e16" stroke-width="1.3"></rect>
          <rect x="624" y="-12" width="30" height="148" rx="3" fill="rgba(34,46,62,.62)" stroke="rgba(10,14,22,.55)" stroke-width="1"></rect>
          <rect x="627" y="-8" width="4" height="140" rx="2" fill="rgba(210,230,250,.16)"></rect>
          <circle cx="630" cy="150" r="3.2" fill="{{ gcAsReadyLed }}" stroke="#0a0e16" stroke-width=".7"></circle>
          <text x="636" y="152.5" font-family="IBM Plex Mono" font-size="6.5" fill="#3a4759">READY</text>
          <circle cx="630" cy="162" r="3.2" fill="{{ gcAsBusyLed }}" stroke="#0a0e16" stroke-width=".7"></circle>
          <text x="636" y="164.5" font-family="IBM Plex Mono" font-size="6.5" fill="#3a4759">RUN</text>
          <!-- gantry arm: carries the syringe between the tray and the injection port -->
          <rect x="404" y="-42" width="256" height="24" rx="5" fill="url(#gn-shell)" stroke="#0a0e16" stroke-width="1.3"></rect>
          <rect x="412" y="-22" width="206" height="3" rx="2" fill="#2a3444"></rect>
          <text x="540" y="-30" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" letter-spacing="1" fill="#4a5668">AUTOSAMPLER</text>

          <!-- sample tray / carousel on the GC top -->
          <ellipse cx="534" cy="197" rx="84" ry="5" fill="rgba(10,14,22,.35)"></ellipse>
          <path d="M458 162 V174 A76 26 0 0 0 610 174 V162 A76 26 0 0 1 458 162 Z" fill="#262d38" stroke="#0a0e16" stroke-width="1.1"></path>
          <ellipse cx="534" cy="162" rx="76" ry="26" fill="#3a4350" stroke="#0a0e16" stroke-width="1.1"></ellipse>
          <ellipse cx="534" cy="162" rx="62" ry="20" fill="none" stroke="rgba(10,14,22,.45)" stroke-width="7"></ellipse>
          <ellipse cx="534" cy="159" rx="26" ry="8" fill="#56606e" stroke="#0a0e16" stroke-width=".9"></ellipse>
          <rect x="528" y="147" width="12" height="12" rx="2" fill="#4a5462" stroke="#0a0e16" stroke-width=".8"></rect>
          <ellipse cx="534" cy="147" rx="6" ry="2" fill="#6a7482"></ellipse>
          <sc-for list="{{ gcAsVials }}" as="v" hint-placeholder-count="12">
            <g>
              <ellipse cx="{{ v.rx }}" cy="{{ v.ry }}" rx="{{ v.rrx }}" ry="{{ v.rry }}" fill="none" stroke="#2f6fd0" stroke-width="2" style="{{ v.ring }}"></ellipse>
              <g style="{{ v.show }}">
                <rect x="{{ v.bx }}" y="{{ v.by }}" width="{{ v.bw }}" height="{{ v.bh }}" rx="1.6" fill="rgba(222,236,248,.42)" stroke="{{ v.stroke }}" stroke-width="{{ v.sw }}"></rect>
                <rect x="{{ v.lx }}" y="{{ v.ly }}" width="{{ v.lw }}" height="{{ v.lh }}" rx="1" fill="{{ v.lfill }}"></rect>
                <rect x="{{ v.tx }}" y="{{ v.ty }}" width="{{ v.bw }}" height="{{ v.th }}" fill="rgba(250,252,255,.55)"></rect>
                <rect x="{{ v.cx }}" y="{{ v.cy }}" width="{{ v.cw }}" height="{{ v.ch }}" rx="1.4" fill="{{ v.capFill }}" stroke="#0a0e16" stroke-width=".7"></rect>
              </g>
              <text x="{{ v.nx }}" y="{{ v.ny }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ v.nfs }}" font-weight="{{ v.nfw }}" fill="{{ v.nfill }}" style="{{ v.nstyle }}">{{ v.num }}</text>
            </g>
          </sc-for>
          <text x="545" y="226" text-anchor="middle" font-family="IBM Plex Mono" font-size="9.5" font-weight="700" letter-spacing=".6" fill="{{ gcAsSelColor }}">{{ gcAsSelText }}</text>

          <!-- syringe carriage riding the gantry arm, with its vertical drive rail -->
          <g style="{{ gcAsCarStyle }}">
            <rect x="-17" y="-26" width="38" height="14" rx="3" fill="#2a3444" stroke="#0a0e16" stroke-width=".9"></rect>
            <rect x="10" y="-12" width="5" height="126" rx="1.5" fill="url(#go-metal)" stroke="#0a0e16" stroke-width=".6"></rect>
            <rect x="10" y="110" width="5" height="4" fill="#2a3444"></rect>
          </g>
          <!-- autosampler syringe (needle tip at the local origin) -->
          <g style="{{ gcAsSyrStyle }}">
            <rect x="-8" y="-101" width="23" height="7" rx="1.5" fill="#2a3444" stroke="#0a0e16" stroke-width=".7"></rect>
            <line x1="0" y1="0" x2="0" y2="-57" stroke="#3a4759" stroke-width="2.6" stroke-linecap="round"></line>
            <line x1="0" y1="0" x2="0" y2="-57" stroke="#e8f0f8" stroke-width="1.3" stroke-linecap="round"></line>
            <rect x="-3.5" y="-63" width="7" height="7" rx="1" fill="url(#go-metal)" stroke="#0a0e16" stroke-width=".7"></rect>
            <rect x="-6.5" y="-106" width="13" height="44" rx="2" fill="rgba(222,238,252,.38)" stroke="#9fb6d0" stroke-width="1.2"></rect>
            <rect x="-4.8" y="{{ gcAsFillY }}" width="9.6" height="{{ gcAsFillH }}" fill="rgba(214,150,52,.95)"></rect>
            <g stroke="rgba(60,80,105,.7)" stroke-width=".7"><line x1="2.5" y1="-70" x2="6.5" y2="-70"></line><line x1="2.5" y1="-78" x2="6.5" y2="-78"></line><line x1="2.5" y1="-86" x2="6.5" y2="-86"></line><line x1="2.5" y1="-94" x2="6.5" y2="-94"></line></g>
            <rect x="-4.8" y="{{ gcAsSealY }}" width="9.6" height="3" fill="#1c2533"></rect>
            <rect x="-1.6" y="{{ gcAsRodY }}" width="3.2" height="52" fill="#b9c6d6" stroke="#5c6b82" stroke-width=".5"></rect>
            <rect x="-7" y="{{ gcAsThumbY }}" width="14" height="4" rx="1.5" fill="url(#go-metal)" stroke="#0a0e16" stroke-width=".7"></rect>
            <rect x="-9" y="-108" width="18" height="3" rx="1" fill="url(#go-metal)" stroke="#0a0e16" stroke-width=".6"></rect>
            <text x="-11" y="-80" text-anchor="end" font-family="IBM Plex Mono" font-size="11" font-weight="700" fill="#b9831f">{{ gcAsVolText }}</text>
          </g>
        </svg>
        </sc-if>
      </div>

    </div>

    <!-- ===== data system column ===== -->
    <div style="display:flex; flex-direction:column; min-height:0; padding:6px 8px 6px;">

      <div style="flex:0 0 auto; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:5px;">
        <sc-for list="{{ gcDsStrip }}" as="s" hint-placeholder-count="8">
          <div style="border-radius:7px; background:var(--panel2); border:1px solid var(--line); padding:3px 7px; min-width:0;">
            <div style="font-family:'IBM Plex Mono'; font-size:7.5px; letter-spacing:.6px; text-transform:uppercase; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ s.k }}</div>
            <div style="font-family:'IBM Plex Mono'; font-size:10.5px; font-weight:600; color:{{ s.color }}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ s.v }}</div>
          </div>
        </sc-for>
      </div>

      <!-- chromatogram (oil): one timeline shared with the column animation and the results table -->
      <sc-if value="{{ gcOilTabs }}" hint-placeholder-val="{{ false }}">
      <div style="flex:0 0 auto; margin-top:5px; display:flex; align-items:flex-end; gap:2px; border-bottom:1px solid var(--line);">
        <button onclick="{{ gcTabChrom }}" style="{{ gcTabChromStyle }}">Chromatogram</button>
        <button onclick="{{ gcTabTable }}" style="{{ gcTabTableStyle }}">Composition Table</button>
      </div>
      </sc-if>
      <sc-if value="{{ gcShowChrom }}" hint-placeholder-val="{{ false }}">
      <sc-if value="{{ gcIsOil }}" hint-placeholder-val="{{ false }}">
      <div style="{{ gcOilChromBoxStyle }}">
          <div style="flex:0 0 auto; display:flex; align-items:center; gap:6px; padding:5px 8px; border-bottom:1px solid #e3e7ee; background:#f6f8fb;">
            <span style="font-family:'IBM Plex Mono'; font-size:9.5px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#b9831f; white-space:nowrap;">Simulated chromatogram</span>
            <span style="flex:1 1 auto; min-width:0; font-family:'IBM Plex Mono'; font-size:9px; color:#6b7686; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ gcPlaybackText }}</span>
            <button onclick="{{ gcChromAllToggle }}" style="{{ gcChromAllStyle }}">{{ gcChromAllText }}</button>
            <button onclick="{{ gcChromOpen }}" style="font-family:inherit; font-size:10.5px; font-weight:600; white-space:nowrap; padding:4px 10px; border-radius:6px; cursor:pointer; background:#ffffff; border:1px solid #cfd6e0; color:#3a4759;">Expand Chromatogram</button>
          </div>
          <div data-gc-chrom="1" style="flex:1 1 auto; min-height:0; position:relative;">
          <svg sc-camel-view-box="{{ gcOilChart.vb }}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="position:absolute; inset:0; display:block; user-select:none;">
            <defs><clipPath id="{{ gcOilChart.clipId }}"><rect x="{{ gcOilChart.L }}" y="{{ gcOilChart.T }}" width="{{ gcOilChart.cw }}" height="{{ gcOilChart.ch }}"></rect></clipPath></defs>
            <rect x="0" y="0" width="{{ gcOilChart.W }}" height="{{ gcOilChart.H }}" fill="#ffffff"></rect>
            <sc-for list="{{ gcOilChart.yTicks }}" as="t" hint-placeholder-count="5">
              <g>
                <line x1="{{ gcOilChart.L }}" y1="{{ t.y }}" x2="{{ gcOilChart.R }}" y2="{{ t.y }}" stroke="#eef1f5" stroke-width="1"></line>
                <text x="{{ gcOilChart.L - 7 }}" y="{{ t.ty }}" text-anchor="end" font-family="IBM Plex Mono" font-size="{{ gcOilChart.legFs }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcOilChart.xTicks }}" as="t" hint-placeholder-count="12">
              <g>
                <line x1="{{ t.x }}" y1="{{ gcOilChart.B }}" x2="{{ t.x }}" y2="{{ gcOilChart.tickLen }}" stroke="#7b8596" stroke-width="1"></line>
                <text x="{{ t.x }}" y="{{ gcOilChart.xTickY }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ gcOilChart.legFs }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcOilChart.tTicks }}" as="t" hint-placeholder-count="4">
              <g>
                <line x1="{{ gcOilChart.R }}" y1="{{ t.y }}" x2="{{ gcOilChart.R + 4 }}" y2="{{ t.y }}" stroke="#c08a2e" stroke-width="1"></line>
                <text x="{{ gcOilChart.R + 7 }}" y="{{ t.ty }}" font-family="IBM Plex Mono" font-size="{{ gcOilChart.legFs }}" fill="#a8741f">{{ t.v }}</text>
              </g>
            </sc-for>
            <line x1="{{ gcOilChart.L }}" y1="{{ gcOilChart.B }}" x2="{{ gcOilChart.R }}" y2="{{ gcOilChart.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <line x1="{{ gcOilChart.L }}" y1="{{ gcOilChart.T }}" x2="{{ gcOilChart.L }}" y2="{{ gcOilChart.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <line x1="{{ gcOilChart.R }}" y1="{{ gcOilChart.T }}" x2="{{ gcOilChart.R }}" y2="{{ gcOilChart.B }}" stroke="#d2a24c" stroke-width="1"></line>
            <text x="{{ gcOilChart.xMid }}" y="{{ gcOilChart.xLab }}" text-anchor="middle" font-family="IBM Plex Sans" font-size="{{ gcOilChart.axFs }}" font-weight="600" fill="#3a4759">Retention Time (min)</text>
            <text x="{{ gcOilChart.yLabX }}" y="{{ gcOilChart.yMid }}" text-anchor="middle" transform="{{ 'rotate(-90 ' + gcOilChart.yLabX + ' ' + gcOilChart.yMid + ')' }}" font-family="IBM Plex Sans" font-size="{{ gcOilChart.axFs }}" font-weight="600" fill="#3a4759">{{ gcOilChart.axis }}</text>
            <text x="{{ gcOilChart.tLabX }}" y="{{ gcOilChart.yMid }}" text-anchor="middle" transform="{{ 'rotate(90 ' + gcOilChart.tLabX + ' ' + gcOilChart.yMid + ')' }}" font-family="IBM Plex Sans" font-size="{{ gcOilChart.axFs }}" font-weight="600" fill="#a8741f">Oven Temperature (&#176;C)</text>
            <line x1="{{ gcOilChart.L + 2 }}" y1="{{ gcOilChart.legY - 4 }}" x2="{{ gcOilChart.L + 24 }}" y2="{{ gcOilChart.legY - 4 }}" stroke="#1f4fd1" stroke-width="1.4"></line>
            <text x="{{ gcOilChart.L + 29 }}" y="{{ gcOilChart.legY }}" font-family="IBM Plex Sans" font-size="{{ gcOilChart.legFs }}" fill="#3a4759">{{ gcOilChart.resp }}</text>
            <line x1="{{ gcOilChart.leg2X }}" y1="{{ gcOilChart.legY - 4 }}" x2="{{ gcOilChart.leg2X + 26 }}" y2="{{ gcOilChart.legY - 4 }}" stroke="#d2952e" stroke-width="1.4" stroke-dasharray="5 3"></line>
            <text x="{{ gcOilChart.leg2T }}" y="{{ gcOilChart.legY }}" font-family="IBM Plex Sans" font-size="{{ gcOilChart.legFs }}" fill="#a8741f">{{ gcOilChart.progTxt }}</text>
            <g clip-path="{{ gcOilChart.clipUrl }}">
              <path d="{{ gcOilChart.tD }}" fill="none" stroke="#d2952e" stroke-width="1.3" stroke-dasharray="6 4" stroke-linejoin="round" opacity=".75"></path>
              <sc-for list="{{ gcOilChart.integ }}" as="g" hint-placeholder-count="0">
                <path d="{{ g.d }}" fill="none" stroke="{{ g.stroke }}" stroke-width="{{ g.sw }}" opacity=".8"></path>
              </sc-for>
              <path d="{{ gcOilChart.traceD }}" fill="none" stroke="#1f4fd1" stroke-width="1" stroke-linejoin="round"></path>
              <line x1="{{ gcOilChart.tNowX }}" y1="{{ gcOilChart.T }}" x2="{{ gcOilChart.tNowX }}" y2="{{ gcOilChart.B }}" stroke="rgba(29,138,90,.5)" stroke-width="1" style="{{ gcOilChart.cursorStyle }}"></line>
              <circle cx="{{ gcOilChart.tNowX }}" cy="{{ gcOilChart.tNowY }}" r="3" fill="#d2952e" style="{{ gcOilChart.tNowStyle }}"></circle>
            </g>

            <sc-for list="{{ gcOilChart.labels }}" as="p" hint-placeholder-count="0">
              <g>
                <line x1="{{ p.lx }}" y1="{{ p.ly1 }}" x2="{{ p.lx }}" y2="{{ p.ly2 }}" stroke="#9aa3b1" stroke-width=".8" stroke-dasharray="2 2" style="{{ p.lead }}"></line>
                <text x="{{ p.x }}" y="{{ p.y }}" transform="{{ p.tf }}" font-family="IBM Plex Mono" font-size="{{ p.fs }}" font-weight="{{ p.fw }}" fill="{{ p.fill }}" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">{{ p.txt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcOilChart.groups }}" as="g" hint-placeholder-count="0">
              <g>
                <path d="{{ g.d }}" fill="none" stroke="#5b6678" stroke-width="1"></path>
                <text x="{{ g.x }}" y="{{ g.y1 }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ g.fs }}" font-weight="700" fill="{{ g.fill }}" stroke="#ffffff" stroke-width="3" paint-order="stroke">{{ g.name }}</text>
                <text x="{{ g.x }}" y="{{ g.y2 }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ g.fs2 }}" fill="#3a4759" stroke="#ffffff" stroke-width="3" paint-order="stroke">{{ g.rt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcOilChart.hits }}" as="h" hint-placeholder-count="0">
              <rect x="{{ h.x }}" y="{{ h.y }}" width="{{ h.w }}" height="{{ h.h }}" fill="transparent" onmouseenter="{{ h.enter }}" onmouseleave="{{ h.leave }}"></rect>
            </sc-for>
            <sc-if value="{{ gcOilChart.showTip }}" hint-placeholder-val="{{ false }}">
              <g style="pointer-events:none;">
                <rect x="{{ gcOilChart.tip.x }}" y="{{ gcOilChart.tip.y }}" width="{{ gcOilChart.tip.w }}" height="{{ gcOilChart.tip.h }}" rx="5" fill="rgba(255,255,255,.96)" stroke="#9fb0c8" stroke-width="1"></rect>
                <text x="{{ gcOilChart.tip.tx }}" y="{{ gcOilChart.tip.l1y }}" font-family="IBM Plex Sans" font-size="{{ gcOilChart.tip.fs }}" font-weight="700" fill="#16202f">{{ gcOilChart.tip.l1 }}</text>
                <text x="{{ gcOilChart.tip.tx }}" y="{{ gcOilChart.tip.l2y }}" font-family="IBM Plex Mono" font-size="{{ gcOilChart.tip.fs - 1 }}" fill="#3a4759">{{ gcOilChart.tip.l2 }}</text>
                <text x="{{ gcOilChart.tip.tx }}" y="{{ gcOilChart.tip.l3y }}" font-family="IBM Plex Mono" font-size="{{ gcOilChart.tip.fs - 1 }}" fill="#6b7686">{{ gcOilChart.tip.l3 }}</text>
              </g>
            </sc-if>
          </svg>
          </div>
      </div>
      </sc-if>
      <sc-if value="{{ gcIsGas }}" hint-placeholder-val="{{ false }}">
      <div style="flex:1 1 auto; min-height:0; margin-top:5px; border-radius:9px; overflow:hidden; border:1px solid var(--line2); background:#ffffff; display:flex; flex-direction:column;">
          <div style="flex:0 0 auto; display:flex; align-items:center; gap:6px; padding:5px 8px; border-bottom:1px solid #e3e7ee; background:#f6f8fb;">
            <span style="font-family:'IBM Plex Mono'; font-size:9.5px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#b9831f; white-space:nowrap;">Simulated chromatograms</span>
            <span style="flex:1 1 auto; min-width:0; font-family:'IBM Plex Mono'; font-size:9px; color:#6b7686; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ gcPlaybackText }}</span>
            <button onclick="{{ gcChromAllToggle }}" style="{{ gcChromAllStyle }}">{{ gcChromAllText }}</button>
            <button onclick="{{ gcChromOpen }}" style="font-family:inherit; font-size:10.5px; font-weight:600; white-space:nowrap; padding:4px 10px; border-radius:6px; cursor:pointer; background:#ffffff; border:1px solid #cfd6e0; color:#3a4759;">Expand</button>
          </div>
          <!-- GC oven temperature programme (compact, separate from the detector traces) -->
          <div data-gc-temp="1" style="flex:0 0 17%; min-height:74px; max-height:112px; position:relative; border-bottom:1px solid #e3e7ee;">
          <svg sc-camel-view-box="{{ gcTempC.vb }}" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute; inset:0; display:block;">
            <rect x="0" y="0" width="{{ gcTempC.W }}" height="{{ gcTempC.H }}" fill="#fbfcfd"></rect>
            <sc-for list="{{ gcTempC.yT }}" as="t" hint-placeholder-count="4">
              <g>
                <line x1="{{ gcTempC.L }}" y1="{{ t.y }}" x2="{{ gcTempC.R }}" y2="{{ t.y }}" stroke="#eef1f5" stroke-width="1"></line>
                <text x="{{ gcTempC.L - 6 }}" y="{{ t.ty }}" text-anchor="end" font-family="IBM Plex Mono" font-size="9" fill="#a8741f">{{ t.v }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcTempC.xT }}" as="t" hint-placeholder-count="6">
              <text x="{{ t.x }}" y="{{ gcTempC.xLabY }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#5b6678">{{ t.v }}</text>
            </sc-for>
            <line x1="{{ gcTempC.L }}" y1="{{ gcTempC.B }}" x2="{{ gcTempC.R }}" y2="{{ gcTempC.B }}" stroke="#7b8596" stroke-width="1"></line>
            <line x1="{{ gcTempC.L }}" y1="{{ gcTempC.T }}" x2="{{ gcTempC.L }}" y2="{{ gcTempC.B }}" stroke="#7b8596" stroke-width="1"></line>
            <text x="{{ gcTempC.yLabX }}" y="{{ gcTempC.yMid }}" text-anchor="middle" transform="{{ 'rotate(-90 ' + gcTempC.yLabX + ' ' + gcTempC.yMid + ')' }}" font-family="IBM Plex Sans" font-size="9.5" font-weight="600" fill="#a8741f">T (&#176;C)</text>
            <line x1="{{ gcTempC.L }}" y1="{{ gcTempC.balY }}" x2="{{ gcTempC.R }}" y2="{{ gcTempC.balY }}" stroke="#c0564a" stroke-width="1.1" stroke-dasharray="3 3"></line>
            <text x="{{ gcTempC.R - 3 }}" y="{{ gcTempC.balLY }}" text-anchor="end" font-family="IBM Plex Sans" font-size="9.5" font-weight="600" fill="#b0463b">{{ gcTempC.balTxt }}</text>
            <path d="{{ gcTempC.progD }}" fill="none" stroke="#d2952e" stroke-width="1.4" stroke-dasharray="6 4" opacity=".75"></path>
            <path d="{{ gcTempC.doneD }}" fill="none" stroke="#c07a12" stroke-width="2.6" stroke-linecap="round" style="{{ gcTempC.nowStyle }}"></path>
            <text x="{{ gcTempC.L + 6 }}" y="13" font-family="IBM Plex Sans" font-size="10.5" font-weight="700" fill="#a8741f">{{ gcTempC.legTxt }}</text>
            <text x="{{ gcTempC.startX }}" y="{{ gcTempC.startY }}" font-family="IBM Plex Mono" font-size="9" fill="#a8741f">{{ gcTempC.startLab }}</text>
            <text x="{{ gcTempC.endX }}" y="{{ gcTempC.endY }}" text-anchor="end" font-family="IBM Plex Mono" font-size="9" fill="#a8741f">{{ gcTempC.endLab }}</text>
            <g style="{{ gcTempC.nowStyle }}">
              <line x1="{{ gcTempC.nowX }}" y1="{{ gcTempC.T }}" x2="{{ gcTempC.nowX }}" y2="{{ gcTempC.B }}" stroke="rgba(29,138,90,.5)" stroke-width="1"></line>
              <circle cx="{{ gcTempC.nowX }}" cy="{{ gcTempC.nowY }}" r="3.6" fill="#c07a12" stroke="#ffffff" stroke-width="1.2"></circle>
              <text x="{{ gcTempC.nowLX }}" y="{{ gcTempC.nowLY }}" font-family="IBM Plex Mono" font-size="10" font-weight="700" fill="#8a5a0c" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">{{ gcTempC.nowLab }}</text>
            </g>
          </svg>
          </div>
          <!-- TCD - packed column -->
          <div data-gc-chrom-t="1" style="flex:1 1 0; min-height:0; position:relative; border-bottom:1px solid #e3e7ee;">
          <svg sc-camel-view-box="{{ gcTC.vb }}" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute; inset:0; display:block; user-select:none;">
            <defs><clipPath id="{{ gcTC.clipId }}"><rect x="{{ gcTC.L }}" y="{{ gcTC.T }}" width="{{ gcTC.cw }}" height="{{ gcTC.ch }}"></rect></clipPath></defs>
            <rect x="0" y="0" width="{{ gcTC.W }}" height="{{ gcTC.H }}" fill="#ffffff"></rect>
            <sc-for list="{{ gcTC.yTicks }}" as="t" hint-placeholder-count="5">
              <g>
                <line x1="{{ gcTC.L }}" y1="{{ t.y }}" x2="{{ gcTC.R }}" y2="{{ t.y }}" stroke="#eef1f5" stroke-width="1"></line>
                <text x="{{ gcTC.L - 6 }}" y="{{ t.ty }}" text-anchor="end" font-family="IBM Plex Mono" font-size="{{ gcTC.legFs - 0.5 }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcTC.xTicks }}" as="t" hint-placeholder-count="6">
              <g>
                <line x1="{{ t.x }}" y1="{{ gcTC.B }}" x2="{{ t.x }}" y2="{{ gcTC.tickLen }}" stroke="#7b8596" stroke-width="1"></line>
                <text x="{{ t.x }}" y="{{ gcTC.xTickY }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ gcTC.legFs - 0.5 }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <line x1="{{ gcTC.L }}" y1="{{ gcTC.B }}" x2="{{ gcTC.R }}" y2="{{ gcTC.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <line x1="{{ gcTC.L }}" y1="{{ gcTC.T }}" x2="{{ gcTC.L }}" y2="{{ gcTC.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <text x="{{ gcTC.xMid }}" y="{{ gcTC.xLab }}" text-anchor="middle" font-family="IBM Plex Sans" font-size="{{ gcTC.axFs - 1 }}" font-weight="600" fill="#3a4759">Retention time (min)</text>
            <text x="{{ gcTC.yLabX }}" y="{{ gcTC.yMid }}" text-anchor="middle" transform="{{ 'rotate(-90 ' + gcTC.yLabX + ' ' + gcTC.yMid + ')' }}" font-family="IBM Plex Sans" font-size="{{ gcTC.axFs - 1.5 }}" font-weight="600" fill="#3a4759">{{ gcTC.axis }}</text>
            <text x="{{ gcTC.L + 6 }}" y="{{ gcTC.legY }}" font-family="IBM Plex Sans" font-size="{{ gcTC.axFs }}" font-weight="700" fill="{{ gcTC.color }}">{{ gcTC.title }}</text>
            <g clip-path="{{ gcTC.clipUrl }}">
              <sc-for list="{{ gcTC.integ }}" as="g" hint-placeholder-count="0">
                <path d="{{ g.d }}" fill="none" stroke="{{ g.stroke }}" stroke-width="{{ g.sw }}" opacity=".8"></path>
              </sc-for>
              <path d="{{ gcTC.traceD }}" fill="none" stroke="{{ gcTC.color }}" stroke-width="1.1" stroke-linejoin="round"></path>
              <line x1="{{ gcTC.tNowX }}" y1="{{ gcTC.T }}" x2="{{ gcTC.tNowX }}" y2="{{ gcTC.B }}" stroke="rgba(29,138,90,.55)" stroke-width="1" style="{{ gcTC.cursorStyle }}"></line>
            </g>
            <sc-for list="{{ gcTC.labels }}" as="p" hint-placeholder-count="0">
              <g>
                <path d="{{ p.ld }}" fill="none" stroke="#9aa3b1" stroke-width=".8" stroke-dasharray="2 2" style="{{ p.lead }}"></path>
                <text x="{{ p.x }}" y="{{ p.y }}" transform="{{ p.tf }}" font-family="IBM Plex Mono" font-size="{{ p.fs }}" font-weight="{{ p.fw }}" fill="{{ p.fill }}" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">{{ p.txt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcTC.groups }}" as="g" hint-placeholder-count="0">
              <g>
                <path d="{{ g.d }}" fill="none" stroke="#5b6678" stroke-width="1"></path>
                <text x="{{ g.x }}" y="{{ g.y2 }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ g.fs2 }}" font-weight="700" fill="{{ g.fill }}" stroke="#ffffff" stroke-width="3" paint-order="stroke">{{ g.name }} · {{ g.rt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcTC.hits }}" as="h" hint-placeholder-count="0">
              <rect x="{{ h.x }}" y="{{ h.y }}" width="{{ h.w }}" height="{{ h.h }}" fill="transparent" onmouseenter="{{ h.enter }}" onmouseleave="{{ h.leave }}"></rect>
            </sc-for>
            <sc-if value="{{ gcTC.showTip }}" hint-placeholder-val="{{ false }}">
              <g style="pointer-events:none;">
                <rect x="{{ gcTC.tip.x }}" y="{{ gcTC.tip.y }}" width="{{ gcTC.tip.w }}" height="{{ gcTC.tip.h }}" rx="5" fill="rgba(255,255,255,.96)" stroke="#9fb0c8" stroke-width="1"></rect>
                <text x="{{ gcTC.tip.tx }}" y="{{ gcTC.tip.l1y }}" font-family="IBM Plex Sans" font-size="{{ gcTC.tip.fs }}" font-weight="700" fill="#16202f">{{ gcTC.tip.l1 }}</text>
                <text x="{{ gcTC.tip.tx }}" y="{{ gcTC.tip.l2y }}" font-family="IBM Plex Mono" font-size="{{ gcTC.tip.fs - 1 }}" fill="#3a4759">{{ gcTC.tip.l2 }}</text>
                <text x="{{ gcTC.tip.tx }}" y="{{ gcTC.tip.l3y }}" font-family="IBM Plex Mono" font-size="{{ gcTC.tip.fs - 1 }}" fill="#6b7686">{{ gcTC.tip.l3 }}</text>
              </g>
            </sc-if>
          </svg>
          </div>
          <!-- FID - capillary column -->
          <div data-gc-chrom-f="1" style="flex:1 1 0; min-height:0; position:relative;">
          <svg sc-camel-view-box="{{ gcFC.vb }}" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute; inset:0; display:block; user-select:none;">
            <defs><clipPath id="{{ gcFC.clipId }}"><rect x="{{ gcFC.L }}" y="{{ gcFC.T }}" width="{{ gcFC.cw }}" height="{{ gcFC.ch }}"></rect></clipPath></defs>
            <rect x="0" y="0" width="{{ gcFC.W }}" height="{{ gcFC.H }}" fill="#ffffff"></rect>
            <sc-for list="{{ gcFC.yTicks }}" as="t" hint-placeholder-count="5">
              <g>
                <line x1="{{ gcFC.L }}" y1="{{ t.y }}" x2="{{ gcFC.R }}" y2="{{ t.y }}" stroke="#eef1f5" stroke-width="1"></line>
                <text x="{{ gcFC.L - 6 }}" y="{{ t.ty }}" text-anchor="end" font-family="IBM Plex Mono" font-size="{{ gcFC.legFs - 0.5 }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcFC.xTicks }}" as="t" hint-placeholder-count="6">
              <g>
                <line x1="{{ t.x }}" y1="{{ gcFC.B }}" x2="{{ t.x }}" y2="{{ gcFC.tickLen }}" stroke="#7b8596" stroke-width="1"></line>
                <text x="{{ t.x }}" y="{{ gcFC.xTickY }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ gcFC.legFs - 0.5 }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <line x1="{{ gcFC.L }}" y1="{{ gcFC.B }}" x2="{{ gcFC.R }}" y2="{{ gcFC.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <line x1="{{ gcFC.L }}" y1="{{ gcFC.T }}" x2="{{ gcFC.L }}" y2="{{ gcFC.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <text x="{{ gcFC.xMid }}" y="{{ gcFC.xLab }}" text-anchor="middle" font-family="IBM Plex Sans" font-size="{{ gcFC.axFs - 1 }}" font-weight="600" fill="#3a4759">Retention time (min)</text>
            <text x="{{ gcFC.yLabX }}" y="{{ gcFC.yMid }}" text-anchor="middle" transform="{{ 'rotate(-90 ' + gcFC.yLabX + ' ' + gcFC.yMid + ')' }}" font-family="IBM Plex Sans" font-size="{{ gcFC.axFs - 1.5 }}" font-weight="600" fill="#3a4759">{{ gcFC.axis }}</text>
            <text x="{{ gcFC.L + 6 }}" y="{{ gcFC.legY }}" font-family="IBM Plex Sans" font-size="{{ gcFC.axFs }}" font-weight="700" fill="{{ gcFC.color }}">{{ gcFC.title }}</text>
            <g clip-path="{{ gcFC.clipUrl }}">
              <sc-for list="{{ gcFC.integ }}" as="g" hint-placeholder-count="0">
                <path d="{{ g.d }}" fill="none" stroke="{{ g.stroke }}" stroke-width="{{ g.sw }}" opacity=".8"></path>
              </sc-for>
              <path d="{{ gcFC.traceD }}" fill="none" stroke="{{ gcFC.color }}" stroke-width="1.1" stroke-linejoin="round"></path>
              <line x1="{{ gcFC.tNowX }}" y1="{{ gcFC.T }}" x2="{{ gcFC.tNowX }}" y2="{{ gcFC.B }}" stroke="rgba(29,138,90,.55)" stroke-width="1" style="{{ gcFC.cursorStyle }}"></line>
            </g>
            <sc-for list="{{ gcFC.labels }}" as="p" hint-placeholder-count="0">
              <g>
                <path d="{{ p.ld }}" fill="none" stroke="#9aa3b1" stroke-width=".8" stroke-dasharray="2 2" style="{{ p.lead }}"></path>
                <text x="{{ p.x }}" y="{{ p.y }}" transform="{{ p.tf }}" font-family="IBM Plex Mono" font-size="{{ p.fs }}" font-weight="{{ p.fw }}" fill="{{ p.fill }}" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">{{ p.txt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcFC.groups }}" as="g" hint-placeholder-count="0">
              <g>
                <path d="{{ g.d }}" fill="none" stroke="#5b6678" stroke-width="1"></path>
                <text x="{{ g.x }}" y="{{ g.y2 }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ g.fs2 }}" font-weight="700" fill="{{ g.fill }}" stroke="#ffffff" stroke-width="3" paint-order="stroke">{{ g.name }} · {{ g.rt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcFC.hits }}" as="h" hint-placeholder-count="0">
              <rect x="{{ h.x }}" y="{{ h.y }}" width="{{ h.w }}" height="{{ h.h }}" fill="transparent" onmouseenter="{{ h.enter }}" onmouseleave="{{ h.leave }}"></rect>
            </sc-for>
            <sc-if value="{{ gcFC.showTip }}" hint-placeholder-val="{{ false }}">
              <g style="pointer-events:none;">
                <rect x="{{ gcFC.tip.x }}" y="{{ gcFC.tip.y }}" width="{{ gcFC.tip.w }}" height="{{ gcFC.tip.h }}" rx="5" fill="rgba(255,255,255,.96)" stroke="#9fb0c8" stroke-width="1"></rect>
                <text x="{{ gcFC.tip.tx }}" y="{{ gcFC.tip.l1y }}" font-family="IBM Plex Sans" font-size="{{ gcFC.tip.fs }}" font-weight="700" fill="#16202f">{{ gcFC.tip.l1 }}</text>
                <text x="{{ gcFC.tip.tx }}" y="{{ gcFC.tip.l2y }}" font-family="IBM Plex Mono" font-size="{{ gcFC.tip.fs - 1 }}" fill="#3a4759">{{ gcFC.tip.l2 }}</text>
                <text x="{{ gcFC.tip.tx }}" y="{{ gcFC.tip.l3y }}" font-family="IBM Plex Mono" font-size="{{ gcFC.tip.fs - 1 }}" fill="#6b7686">{{ gcFC.tip.l3 }}</text>
              </g>
            </sc-if>
          </svg>
          </div>
      </div>
      </sc-if>
      </sc-if>

      <!-- status line -->
      <div style="flex:0 0 auto; margin-top:5px; display:flex; align-items:center; gap:8px; padding:5px 9px; border-radius:8px; background:{{ gcMsgBg }}; border:1px solid {{ gcMsgBorder }};">
        <span style="width:7px; height:7px; border-radius:50%; flex:0 0 auto; background:{{ gcMsgDot }};"></span>
        <span style="flex:1 1 58%; min-width:0; font-size:11.5px; font-weight:500; color:var(--txt); line-height:1.3; text-wrap:pretty;">{{ gcStatus }}</span>
        <span style="flex:0 1 34%; min-width:0; text-align:right; font-family:'IBM Plex Mono'; font-size:9.5px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ gcEdu }}</span>
      </div>

      <!-- readiness checklist -->
      <sc-if value="{{ gcShowReady }}" hint-placeholder-val="{{ true }}">
      <div style="flex:0 0 auto; margin-top:5px; display:grid; grid-template-columns:{{ gcReadyCols }}; gap:5px;">
        <sc-for list="{{ gcReady }}" as="r" hint-placeholder-count="5">
          <div style="{{ r.style }}">
            <span style="{{ r.dot }}"></span><span style="font-family:'IBM Plex Mono'; font-size:8.5px; letter-spacing:.3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ r.k }}</span>
          </div>
        </sc-for>
      </div>
      </sc-if>

      <!-- results -->
      <sc-if value="{{ gcShowTable }}" hint-placeholder-val="{{ false }}">
      <div style="flex:1 1 auto; margin-top:5px; min-height:0; display:flex; flex-direction:column; border:1px solid var(--line); border-radius:9px; overflow:hidden; background:var(--panel);">
        <div style="flex:0 0 auto; display:flex; align-items:baseline; gap:8px; padding:5px 9px; border-bottom:1px solid var(--line); background:var(--panel2);">
          <span style="font-size:11.5px; font-weight:700; color:var(--txt);">{{ gcResTitle }}</span>
          <span style="font-family:'IBM Plex Mono'; font-size:8.5px; letter-spacing:.5px; color:var(--mut);">{{ gcResBasis }}</span>
        </div>
        <div style="flex:1 1 auto; min-height:0; overflow:auto;">
          <div style="display:table; width:100%; border-collapse:collapse; font-family:'IBM Plex Mono',monospace; font-size:9.5px;">
            <div style="display:table-row;">
              <sc-for list="{{ gcResHead }}" as="h" hint-placeholder-count="8">
                <div style="{{ h.style }}">{{ h.k }}</div>
              </sc-for>
            </div>
            <sc-for list="{{ gcResRows }}" as="r" hint-placeholder-count="10">
              <div onmouseenter="{{ r.enter }}" onmouseleave="{{ r.leave }}" style="{{ r.style }}">
                <sc-for list="{{ r.cells }}" as="c" hint-placeholder-count="8">
                  <div style="{{ c.style }}">{{ c.v }}</div>
                </sc-for>
              </div>
            </sc-for>
          </div>
        </div>
      </div>
      </sc-if>
    </div>
  </div>


  <!-- expanded chromatogram (oil) with zoom / pan -->
  <sc-if value="{{ gcChromBig }}" hint-placeholder-val="{{ false }}">
  <div onclick="{{ gcChromClose }}" style="position:fixed; inset:0; z-index:9600; background:rgba(6,10,18,.62); display:flex; align-items:center; justify-content:center; padding:3vh 2.5vw; box-sizing:border-box;">
    <div onclick="{{ gcStop }}" style="width:100%; max-width:1600px; height:100%; max-height:820px; display:flex; flex-direction:column; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.45);">
      <div style="flex:0 0 auto; display:flex; align-items:center; gap:8px; padding:9px 14px; border-bottom:1px solid #e3e7ee; background:#f6f8fb; flex-wrap:wrap;">
        <span style="font-size:13px; font-weight:700; color:#16202f;">{{ gcBigTitle }}</span>
        <span style="font-family:'IBM Plex Mono'; font-size:9.5px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#b9831f;">Simulated chromatogram</span>
        <span style="flex:1 1 auto; min-width:0; font-family:'IBM Plex Mono'; font-size:9.5px; color:#6b7686; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ gcZoomText }}</span>
        <sc-for list="{{ gcZoomPresets }}" as="z" hint-placeholder-count="4">
          <button onclick="{{ z.go }}" style="font-family:inherit; font-size:10.5px; font-weight:600; white-space:nowrap; padding:4px 10px; border-radius:6px; cursor:pointer; background:#ffffff; border:1px solid #cfd6e0; color:#3a4759;">{{ z.t }}</button>
        </sc-for>
        <button onclick="{{ gcZoomIn }}" style="font-family:inherit; font-size:10.5px; font-weight:600; white-space:nowrap; padding:4px 10px; border-radius:6px; cursor:pointer; background:#ffffff; border:1px solid #cfd6e0; color:#3a4759;">Zoom +</button>
        <button onclick="{{ gcZoomOut }}" style="font-family:inherit; font-size:10.5px; font-weight:600; white-space:nowrap; padding:4px 10px; border-radius:6px; cursor:pointer; background:#ffffff; border:1px solid #cfd6e0; color:#3a4759;">Zoom &#8722;</button>
        <button onclick="{{ gcZoomReset }}" style="font-family:inherit; font-size:10.5px; font-weight:600; white-space:nowrap; padding:4px 10px; border-radius:6px; cursor:pointer; background:#ffffff; border:1px solid #cfd6e0; color:#3a4759;">Full Run</button>
        <button onclick="{{ gcChromAllToggle }}" style="{{ gcChromAllStyle }}">{{ gcChromAllText }}</button>
        <button onclick="{{ gcChromClose }}" style="font-family:inherit; font-size:11px; font-weight:600; padding:4px 12px; border-radius:6px; cursor:pointer; background:#16202f; border:1px solid #16202f; color:#ffffff;">Close</button>
      </div>
      <div data-gc-chrom-big="1" onwheel="{{ gcBigWheel }}" onmousedown="{{ gcBigDown }}" onmousemove="{{ gcBigMove }}" onmouseup="{{ gcBigUp }}" onmouseleave="{{ gcBigUp }}" style="flex:1 1 auto; min-height:0; position:relative; cursor:grab;">
          <sc-if value="{{ gcBigOil }}" hint-placeholder-val="{{ false }}">
          <svg sc-camel-view-box="{{ gcOilChartBig.vb }}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="position:absolute; inset:0; display:block; user-select:none;">
            <defs><clipPath id="{{ gcOilChartBig.clipId }}"><rect x="{{ gcOilChartBig.L }}" y="{{ gcOilChartBig.T }}" width="{{ gcOilChartBig.cw }}" height="{{ gcOilChartBig.ch }}"></rect></clipPath></defs>
            <rect x="0" y="0" width="{{ gcOilChartBig.W }}" height="{{ gcOilChartBig.H }}" fill="#ffffff"></rect>
            <sc-for list="{{ gcOilChartBig.yTicks }}" as="t" hint-placeholder-count="5">
              <g>
                <line x1="{{ gcOilChartBig.L }}" y1="{{ t.y }}" x2="{{ gcOilChartBig.R }}" y2="{{ t.y }}" stroke="#eef1f5" stroke-width="1"></line>
                <text x="{{ gcOilChartBig.L - 7 }}" y="{{ t.ty }}" text-anchor="end" font-family="IBM Plex Mono" font-size="{{ gcOilChartBig.legFs }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcOilChartBig.xTicks }}" as="t" hint-placeholder-count="12">
              <g>
                <line x1="{{ t.x }}" y1="{{ gcOilChartBig.B }}" x2="{{ t.x }}" y2="{{ gcOilChartBig.tickLen }}" stroke="#7b8596" stroke-width="1"></line>
                <text x="{{ t.x }}" y="{{ gcOilChartBig.xTickY }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ gcOilChartBig.legFs }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcOilChartBig.tTicks }}" as="t" hint-placeholder-count="4">
              <g>
                <line x1="{{ gcOilChartBig.R }}" y1="{{ t.y }}" x2="{{ gcOilChartBig.R + 4 }}" y2="{{ t.y }}" stroke="#c08a2e" stroke-width="1"></line>
                <text x="{{ gcOilChartBig.R + 7 }}" y="{{ t.ty }}" font-family="IBM Plex Mono" font-size="{{ gcOilChartBig.legFs }}" fill="#a8741f">{{ t.v }}</text>
              </g>
            </sc-for>
            <line x1="{{ gcOilChartBig.L }}" y1="{{ gcOilChartBig.B }}" x2="{{ gcOilChartBig.R }}" y2="{{ gcOilChartBig.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <line x1="{{ gcOilChartBig.L }}" y1="{{ gcOilChartBig.T }}" x2="{{ gcOilChartBig.L }}" y2="{{ gcOilChartBig.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <line x1="{{ gcOilChartBig.R }}" y1="{{ gcOilChartBig.T }}" x2="{{ gcOilChartBig.R }}" y2="{{ gcOilChartBig.B }}" stroke="#d2a24c" stroke-width="1"></line>
            <text x="{{ gcOilChartBig.xMid }}" y="{{ gcOilChartBig.xLab }}" text-anchor="middle" font-family="IBM Plex Sans" font-size="{{ gcOilChartBig.axFs }}" font-weight="600" fill="#3a4759">Retention Time (min)</text>
            <text x="{{ gcOilChartBig.yLabX }}" y="{{ gcOilChartBig.yMid }}" text-anchor="middle" transform="{{ 'rotate(-90 ' + gcOilChartBig.yLabX + ' ' + gcOilChartBig.yMid + ')' }}" font-family="IBM Plex Sans" font-size="{{ gcOilChartBig.axFs }}" font-weight="600" fill="#3a4759">{{ gcOilChartBig.axis }}</text>
            <text x="{{ gcOilChartBig.tLabX }}" y="{{ gcOilChartBig.yMid }}" text-anchor="middle" transform="{{ 'rotate(90 ' + gcOilChartBig.tLabX + ' ' + gcOilChartBig.yMid + ')' }}" font-family="IBM Plex Sans" font-size="{{ gcOilChartBig.axFs }}" font-weight="600" fill="#a8741f">Oven Temperature (&#176;C)</text>
            <line x1="{{ gcOilChartBig.L + 2 }}" y1="{{ gcOilChartBig.legY - 4 }}" x2="{{ gcOilChartBig.L + 24 }}" y2="{{ gcOilChartBig.legY - 4 }}" stroke="#1f4fd1" stroke-width="1.4"></line>
            <text x="{{ gcOilChartBig.L + 29 }}" y="{{ gcOilChartBig.legY }}" font-family="IBM Plex Sans" font-size="{{ gcOilChartBig.legFs }}" fill="#3a4759">{{ gcOilChartBig.resp }}</text>
            <line x1="{{ gcOilChartBig.leg2X }}" y1="{{ gcOilChartBig.legY - 4 }}" x2="{{ gcOilChartBig.leg2X + 26 }}" y2="{{ gcOilChartBig.legY - 4 }}" stroke="#d2952e" stroke-width="1.4" stroke-dasharray="5 3"></line>
            <text x="{{ gcOilChartBig.leg2T }}" y="{{ gcOilChartBig.legY }}" font-family="IBM Plex Sans" font-size="{{ gcOilChartBig.legFs }}" fill="#a8741f">{{ gcOilChartBig.progTxt }}</text>
            <g clip-path="{{ gcOilChartBig.clipUrl }}">
              <path d="{{ gcOilChartBig.tD }}" fill="none" stroke="#d2952e" stroke-width="1.3" stroke-dasharray="6 4" stroke-linejoin="round" opacity=".75"></path>
              <sc-for list="{{ gcOilChartBig.integ }}" as="g" hint-placeholder-count="0">
                <path d="{{ g.d }}" fill="none" stroke="{{ g.stroke }}" stroke-width="{{ g.sw }}" opacity=".8"></path>
              </sc-for>
              <path d="{{ gcOilChartBig.traceD }}" fill="none" stroke="#1f4fd1" stroke-width="1.1" stroke-linejoin="round"></path>
              <line x1="{{ gcOilChartBig.tNowX }}" y1="{{ gcOilChartBig.T }}" x2="{{ gcOilChartBig.tNowX }}" y2="{{ gcOilChartBig.B }}" stroke="rgba(29,138,90,.5)" stroke-width="1" style="{{ gcOilChartBig.cursorStyle }}"></line>
              <circle cx="{{ gcOilChartBig.tNowX }}" cy="{{ gcOilChartBig.tNowY }}" r="3" fill="#d2952e" style="{{ gcOilChartBig.tNowStyle }}"></circle>
            </g>

            <sc-for list="{{ gcOilChartBig.labels }}" as="p" hint-placeholder-count="0">
              <g>
                <line x1="{{ p.lx }}" y1="{{ p.ly1 }}" x2="{{ p.lx }}" y2="{{ p.ly2 }}" stroke="#9aa3b1" stroke-width=".8" stroke-dasharray="2 2" style="{{ p.lead }}"></line>
                <text x="{{ p.x }}" y="{{ p.y }}" transform="{{ p.tf }}" font-family="IBM Plex Mono" font-size="{{ p.fs }}" font-weight="{{ p.fw }}" fill="{{ p.fill }}" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">{{ p.txt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcOilChartBig.groups }}" as="g" hint-placeholder-count="0">
              <g>
                <path d="{{ g.d }}" fill="none" stroke="#5b6678" stroke-width="1"></path>
                <text x="{{ g.x }}" y="{{ g.y1 }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ g.fs }}" font-weight="700" fill="{{ g.fill }}" stroke="#ffffff" stroke-width="3" paint-order="stroke">{{ g.name }}</text>
                <text x="{{ g.x }}" y="{{ g.y2 }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ g.fs2 }}" fill="#3a4759" stroke="#ffffff" stroke-width="3" paint-order="stroke">{{ g.rt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcOilChartBig.hits }}" as="h" hint-placeholder-count="0">
              <rect x="{{ h.x }}" y="{{ h.y }}" width="{{ h.w }}" height="{{ h.h }}" fill="transparent" onmouseenter="{{ h.enter }}" onmouseleave="{{ h.leave }}"></rect>
            </sc-for>
            <sc-if value="{{ gcOilChartBig.showTip }}" hint-placeholder-val="{{ false }}">
              <g style="pointer-events:none;">
                <rect x="{{ gcOilChartBig.tip.x }}" y="{{ gcOilChartBig.tip.y }}" width="{{ gcOilChartBig.tip.w }}" height="{{ gcOilChartBig.tip.h }}" rx="5" fill="rgba(255,255,255,.96)" stroke="#9fb0c8" stroke-width="1"></rect>
                <text x="{{ gcOilChartBig.tip.tx }}" y="{{ gcOilChartBig.tip.l1y }}" font-family="IBM Plex Sans" font-size="{{ gcOilChartBig.tip.fs }}" font-weight="700" fill="#16202f">{{ gcOilChartBig.tip.l1 }}</text>
                <text x="{{ gcOilChartBig.tip.tx }}" y="{{ gcOilChartBig.tip.l2y }}" font-family="IBM Plex Mono" font-size="{{ gcOilChartBig.tip.fs - 1 }}" fill="#3a4759">{{ gcOilChartBig.tip.l2 }}</text>
                <text x="{{ gcOilChartBig.tip.tx }}" y="{{ gcOilChartBig.tip.l3y }}" font-family="IBM Plex Mono" font-size="{{ gcOilChartBig.tip.fs - 1 }}" fill="#6b7686">{{ gcOilChartBig.tip.l3 }}</text>
              </g>
            </sc-if>
          </svg>
          </sc-if>
          <sc-if value="{{ gcBigGas }}" hint-placeholder-val="{{ false }}">
          <div style="position:absolute; inset:0; display:flex; flex-direction:column; gap:6px;">
            <div style="flex:1 1 0; min-height:0; position:relative; border-bottom:1px solid #e3e7ee;">
          <svg sc-camel-view-box="{{ gcTCB.vb }}" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute; inset:0; display:block; user-select:none;">
            <defs><clipPath id="{{ gcTCB.clipId }}"><rect x="{{ gcTCB.L }}" y="{{ gcTCB.T }}" width="{{ gcTCB.cw }}" height="{{ gcTCB.ch }}"></rect></clipPath></defs>
            <rect x="0" y="0" width="{{ gcTCB.W }}" height="{{ gcTCB.H }}" fill="#ffffff"></rect>
            <sc-for list="{{ gcTCB.yTicks }}" as="t" hint-placeholder-count="5">
              <g>
                <line x1="{{ gcTCB.L }}" y1="{{ t.y }}" x2="{{ gcTCB.R }}" y2="{{ t.y }}" stroke="#eef1f5" stroke-width="1"></line>
                <text x="{{ gcTCB.L - 6 }}" y="{{ t.ty }}" text-anchor="end" font-family="IBM Plex Mono" font-size="{{ gcTCB.legFs - 0.5 }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcTCB.xTicks }}" as="t" hint-placeholder-count="6">
              <g>
                <line x1="{{ t.x }}" y1="{{ gcTCB.B }}" x2="{{ t.x }}" y2="{{ gcTCB.tickLen }}" stroke="#7b8596" stroke-width="1"></line>
                <text x="{{ t.x }}" y="{{ gcTCB.xTickY }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ gcTCB.legFs - 0.5 }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <line x1="{{ gcTCB.L }}" y1="{{ gcTCB.B }}" x2="{{ gcTCB.R }}" y2="{{ gcTCB.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <line x1="{{ gcTCB.L }}" y1="{{ gcTCB.T }}" x2="{{ gcTCB.L }}" y2="{{ gcTCB.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <text x="{{ gcTCB.xMid }}" y="{{ gcTCB.xLab }}" text-anchor="middle" font-family="IBM Plex Sans" font-size="{{ gcTCB.axFs - 1 }}" font-weight="600" fill="#3a4759">Retention time (min)</text>
            <text x="{{ gcTCB.yLabX }}" y="{{ gcTCB.yMid }}" text-anchor="middle" transform="{{ 'rotate(-90 ' + gcTCB.yLabX + ' ' + gcTCB.yMid + ')' }}" font-family="IBM Plex Sans" font-size="{{ gcTCB.axFs - 1.5 }}" font-weight="600" fill="#3a4759">{{ gcTCB.axis }}</text>
            <text x="{{ gcTCB.L + 6 }}" y="{{ gcTCB.legY }}" font-family="IBM Plex Sans" font-size="{{ gcTCB.axFs }}" font-weight="700" fill="{{ gcTCB.color }}">{{ gcTCB.title }}</text>
            <g clip-path="{{ gcTCB.clipUrl }}">
              <sc-for list="{{ gcTCB.integ }}" as="g" hint-placeholder-count="0">
                <path d="{{ g.d }}" fill="none" stroke="{{ g.stroke }}" stroke-width="{{ g.sw }}" opacity=".8"></path>
              </sc-for>
              <path d="{{ gcTCB.traceD }}" fill="none" stroke="{{ gcTCB.color }}" stroke-width="1.1" stroke-linejoin="round"></path>
              <line x1="{{ gcTCB.tNowX }}" y1="{{ gcTCB.T }}" x2="{{ gcTCB.tNowX }}" y2="{{ gcTCB.B }}" stroke="rgba(29,138,90,.55)" stroke-width="1" style="{{ gcTCB.cursorStyle }}"></line>
            </g>
            <sc-for list="{{ gcTCB.labels }}" as="p" hint-placeholder-count="0">
              <g>
                <path d="{{ p.ld }}" fill="none" stroke="#9aa3b1" stroke-width=".8" stroke-dasharray="2 2" style="{{ p.lead }}"></path>
                <text x="{{ p.x }}" y="{{ p.y }}" transform="{{ p.tf }}" font-family="IBM Plex Mono" font-size="{{ p.fs }}" font-weight="{{ p.fw }}" fill="{{ p.fill }}" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">{{ p.txt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcTCB.groups }}" as="g" hint-placeholder-count="0">
              <g>
                <path d="{{ g.d }}" fill="none" stroke="#5b6678" stroke-width="1"></path>
                <text x="{{ g.x }}" y="{{ g.y2 }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ g.fs2 }}" font-weight="700" fill="{{ g.fill }}" stroke="#ffffff" stroke-width="3" paint-order="stroke">{{ g.name }} · {{ g.rt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcTCB.hits }}" as="h" hint-placeholder-count="0">
              <rect x="{{ h.x }}" y="{{ h.y }}" width="{{ h.w }}" height="{{ h.h }}" fill="transparent" onmouseenter="{{ h.enter }}" onmouseleave="{{ h.leave }}"></rect>
            </sc-for>
            <sc-if value="{{ gcTCB.showTip }}" hint-placeholder-val="{{ false }}">
              <g style="pointer-events:none;">
                <rect x="{{ gcTCB.tip.x }}" y="{{ gcTCB.tip.y }}" width="{{ gcTCB.tip.w }}" height="{{ gcTCB.tip.h }}" rx="5" fill="rgba(255,255,255,.96)" stroke="#9fb0c8" stroke-width="1"></rect>
                <text x="{{ gcTCB.tip.tx }}" y="{{ gcTCB.tip.l1y }}" font-family="IBM Plex Sans" font-size="{{ gcTCB.tip.fs }}" font-weight="700" fill="#16202f">{{ gcTCB.tip.l1 }}</text>
                <text x="{{ gcTCB.tip.tx }}" y="{{ gcTCB.tip.l2y }}" font-family="IBM Plex Mono" font-size="{{ gcTCB.tip.fs - 1 }}" fill="#3a4759">{{ gcTCB.tip.l2 }}</text>
                <text x="{{ gcTCB.tip.tx }}" y="{{ gcTCB.tip.l3y }}" font-family="IBM Plex Mono" font-size="{{ gcTCB.tip.fs - 1 }}" fill="#6b7686">{{ gcTCB.tip.l3 }}</text>
              </g>
            </sc-if>
          </svg>
            </div>
            <div style="flex:1 1 0; min-height:0; position:relative;">
          <svg sc-camel-view-box="{{ gcFCB.vb }}" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute; inset:0; display:block; user-select:none;">
            <defs><clipPath id="{{ gcFCB.clipId }}"><rect x="{{ gcFCB.L }}" y="{{ gcFCB.T }}" width="{{ gcFCB.cw }}" height="{{ gcFCB.ch }}"></rect></clipPath></defs>
            <rect x="0" y="0" width="{{ gcFCB.W }}" height="{{ gcFCB.H }}" fill="#ffffff"></rect>
            <sc-for list="{{ gcFCB.yTicks }}" as="t" hint-placeholder-count="5">
              <g>
                <line x1="{{ gcFCB.L }}" y1="{{ t.y }}" x2="{{ gcFCB.R }}" y2="{{ t.y }}" stroke="#eef1f5" stroke-width="1"></line>
                <text x="{{ gcFCB.L - 6 }}" y="{{ t.ty }}" text-anchor="end" font-family="IBM Plex Mono" font-size="{{ gcFCB.legFs - 0.5 }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcFCB.xTicks }}" as="t" hint-placeholder-count="6">
              <g>
                <line x1="{{ t.x }}" y1="{{ gcFCB.B }}" x2="{{ t.x }}" y2="{{ gcFCB.tickLen }}" stroke="#7b8596" stroke-width="1"></line>
                <text x="{{ t.x }}" y="{{ gcFCB.xTickY }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ gcFCB.legFs - 0.5 }}" fill="#5b6678">{{ t.v }}</text>
              </g>
            </sc-for>
            <line x1="{{ gcFCB.L }}" y1="{{ gcFCB.B }}" x2="{{ gcFCB.R }}" y2="{{ gcFCB.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <line x1="{{ gcFCB.L }}" y1="{{ gcFCB.T }}" x2="{{ gcFCB.L }}" y2="{{ gcFCB.B }}" stroke="#7b8596" stroke-width="1.1"></line>
            <text x="{{ gcFCB.xMid }}" y="{{ gcFCB.xLab }}" text-anchor="middle" font-family="IBM Plex Sans" font-size="{{ gcFCB.axFs - 1 }}" font-weight="600" fill="#3a4759">Retention time (min)</text>
            <text x="{{ gcFCB.yLabX }}" y="{{ gcFCB.yMid }}" text-anchor="middle" transform="{{ 'rotate(-90 ' + gcFCB.yLabX + ' ' + gcFCB.yMid + ')' }}" font-family="IBM Plex Sans" font-size="{{ gcFCB.axFs - 1.5 }}" font-weight="600" fill="#3a4759">{{ gcFCB.axis }}</text>
            <text x="{{ gcFCB.L + 6 }}" y="{{ gcFCB.legY }}" font-family="IBM Plex Sans" font-size="{{ gcFCB.axFs }}" font-weight="700" fill="{{ gcFCB.color }}">{{ gcFCB.title }}</text>
            <g clip-path="{{ gcFCB.clipUrl }}">
              <sc-for list="{{ gcFCB.integ }}" as="g" hint-placeholder-count="0">
                <path d="{{ g.d }}" fill="none" stroke="{{ g.stroke }}" stroke-width="{{ g.sw }}" opacity=".8"></path>
              </sc-for>
              <path d="{{ gcFCB.traceD }}" fill="none" stroke="{{ gcFCB.color }}" stroke-width="1.1" stroke-linejoin="round"></path>
              <line x1="{{ gcFCB.tNowX }}" y1="{{ gcFCB.T }}" x2="{{ gcFCB.tNowX }}" y2="{{ gcFCB.B }}" stroke="rgba(29,138,90,.55)" stroke-width="1" style="{{ gcFCB.cursorStyle }}"></line>
            </g>
            <sc-for list="{{ gcFCB.labels }}" as="p" hint-placeholder-count="0">
              <g>
                <path d="{{ p.ld }}" fill="none" stroke="#9aa3b1" stroke-width=".8" stroke-dasharray="2 2" style="{{ p.lead }}"></path>
                <text x="{{ p.x }}" y="{{ p.y }}" transform="{{ p.tf }}" font-family="IBM Plex Mono" font-size="{{ p.fs }}" font-weight="{{ p.fw }}" fill="{{ p.fill }}" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">{{ p.txt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcFCB.groups }}" as="g" hint-placeholder-count="0">
              <g>
                <path d="{{ g.d }}" fill="none" stroke="#5b6678" stroke-width="1"></path>
                <text x="{{ g.x }}" y="{{ g.y2 }}" text-anchor="middle" font-family="IBM Plex Mono" font-size="{{ g.fs2 }}" font-weight="700" fill="{{ g.fill }}" stroke="#ffffff" stroke-width="3" paint-order="stroke">{{ g.name }} · {{ g.rt }}</text>
              </g>
            </sc-for>
            <sc-for list="{{ gcFCB.hits }}" as="h" hint-placeholder-count="0">
              <rect x="{{ h.x }}" y="{{ h.y }}" width="{{ h.w }}" height="{{ h.h }}" fill="transparent" onmouseenter="{{ h.enter }}" onmouseleave="{{ h.leave }}"></rect>
            </sc-for>
            <sc-if value="{{ gcFCB.showTip }}" hint-placeholder-val="{{ false }}">
              <g style="pointer-events:none;">
                <rect x="{{ gcFCB.tip.x }}" y="{{ gcFCB.tip.y }}" width="{{ gcFCB.tip.w }}" height="{{ gcFCB.tip.h }}" rx="5" fill="rgba(255,255,255,.96)" stroke="#9fb0c8" stroke-width="1"></rect>
                <text x="{{ gcFCB.tip.tx }}" y="{{ gcFCB.tip.l1y }}" font-family="IBM Plex Sans" font-size="{{ gcFCB.tip.fs }}" font-weight="700" fill="#16202f">{{ gcFCB.tip.l1 }}</text>
                <text x="{{ gcFCB.tip.tx }}" y="{{ gcFCB.tip.l2y }}" font-family="IBM Plex Mono" font-size="{{ gcFCB.tip.fs - 1 }}" fill="#3a4759">{{ gcFCB.tip.l2 }}</text>
                <text x="{{ gcFCB.tip.tx }}" y="{{ gcFCB.tip.l3y }}" font-family="IBM Plex Mono" font-size="{{ gcFCB.tip.fs - 1 }}" fill="#6b7686">{{ gcFCB.tip.l3 }}</text>
              </g>
            </sc-if>
          </svg>
            </div>
          </div>
          </sc-if>
      </div>
    </div>
  </div>
  </sc-if>

  <!-- controls -->
  <div style="flex:0 0 auto; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
    <div class="pc-host" data-pc="StageGC" data-pc-layout="bar" style="flex:1 1 auto;"></div>
    <button class="act" onclick="{{ gcToModes }}" style="font-family:inherit; font-size:10.5px; font-weight:500; white-space:nowrap; padding:7px 12px; border-radius:8px; cursor:pointer; background:var(--icard); border:1px solid var(--line2); color:var(--txt2);" style-hover="border-color:var(--blue); color:var(--txt);">Mode Selection</button>
  </div>
</div>
</sc-if>`,
  logic: Component
});
})();
