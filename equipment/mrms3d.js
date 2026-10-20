/* ==========================================================================
   PVT Nexus — MRMS / SPMC 3D viewer (ES module)

   Same viewer behaviour as equipment/bottle3d.js (orbit / zoom / pan limits,
   on-demand rendering, HTML labels, picking, hatched cut faces); the approved
   bottle module is left untouched, so the shared helpers are repeated here.

     spmc    SPMC chamber built from the dimensions of mrms-draw.js (2D units,
             y up here: the sample / inlet end is +y). Cutaway = quarter section
             (quadrant x < 0, z > 0 removed), every revolved part gets real cut
             faces. Pistons in the "sample captured" position.
     module  MRMS carrying six SPMC chambers. Cutaway = half section of the
             housing (z > 0 removed); the chambers, flowline and chamber valves
             are kept whole so each chamber reads as a separate vessel.

   Rendering is on demand: frames are drawn only while something changes.
   ========================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const U = 0.01;
const SEG = 72;
const COS30 = Math.cos(Math.PI / 6);
const PARTS = { module: window.EQUIPMENT.mrms.parts, spmc: window.EQUIPMENT.spmc.parts };

/* SPMC dimensions (mrms-draw.js G, y flipped): body r 26 to ±224, heads r 28 to ±292, bore r 17 to ±222.
   Sample-captured state: agitation piston 15..21, neck 11..15, sample piston -19..11,
   compensating fluid -86..-19, nitrogen piston -112..-86, nitrogen -222..-112. */
const SP = { top: 21, np: -86 };                 // agitation-piston face, nitrogen-piston top face (3D y)
const MOD = { R: 56, wall: 6, L: 400, CK: 0.38, cx: 28, tiers: [262, 0, -262] };
function chamberPos(n) { const t = Math.floor((n - 1) / 2), left = n % 2 === 1; return { x: left ? -MOD.cx : MOD.cx, y: MOD.tiers[t] - 7 * MOD.CK, left }; }
const chTop = (n) => chamberPos(n).y + 326 * MOD.CK;

const ANCHORS = {
  spmc: [
    { p: 'inlet', n: 'Sample inlet', at: [6, 317, 0] },
    { p: 'headU', n: 'Upper head', at: [20, 258, 20] },
    { p: 'isoValve', n: 'Sample isolation', at: [-9, 264, 0] },
    { p: 'resFluid', n: 'Reservoir-fluid chamber', at: [-9, 120, 0] },
    { p: 'agit', n: 'Agitation piston', at: [-11, 18, 0] },
    { p: 'sPiston', n: 'Sample piston', at: [-9, -4, 0] },
    { p: 'seals', n: 'Piston seals', at: [-14.6, -14, 0] },
    { p: 'outlet', n: 'Displacement outlet', at: [-31, -40, 0] },
    { p: 'comp', n: 'Compensating fluid', at: [-9, -60, 0] },
    { p: 'nPiston', n: 'Nitrogen piston', at: [-9, -99, 0] },
    { p: 'n2', n: 'Nitrogen chamber', at: [-9, -170, 0] },
    { p: 'body', n: 'Pressure body', at: [18.4, -150, 18.4] },
    { p: 'activation', n: 'Charge activation', at: [-8, -264, 0] },
    { p: 'headL', n: 'Lower head', at: [20, -258, 20] },
    { p: 'n2Port', n: 'Nitrogen charging port', at: [0, -306, 9] }
  ],
  module: [
    { p: 'headU', n: 'Upper module connector', at: [0, 463, 30] },
    { p: 'housing', n: 'Module housing', at: [-39.6, 330, 39.6] },
    { p: 'bays', n: 'Chamber bays', at: [26, 180, 50] },
    { p: 'flowline', n: 'Common flowline', at: [0, 140, 2.6] },
    { p: 'valves', n: 'Chamber valve', at: [14, chTop(2) + 8, 3] },
    { p: 'headL', n: 'Lower module connector', at: [0, -463, 30] }
  ]
};
for (let n = 1; n <= 6; n++) { const q = chamberPos(n); ANCHORS.module.push({ p: 'ch' + n, n: 'Chamber ' + n, at: [q.x, q.y - 60, 10], ch: n }); }

/* --------------------------------------------------------------- geometry */
function area(loop) { let s = 0; for (let i = 0; i < loop.length; i++) { const a = loop[i], b = loop[(i + 1) % loop.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
function circle(r0, y0, rad, n = 18) { const o = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; o.push([r0 + rad * Math.cos(t), y0 + rad * Math.sin(t)]); } return o; }
function rect(r0, r1, y0, y1) { return [[r0, y0], [r1, y0], [r1, y1], [r0, y1]]; }
function mirrorY(loop) { return loop.map(p => [p[0], -p[1]]).reverse(); }
function revolve(loops, seg = SEG) {
  const pos = [], nor = [], idx = [];
  loops.forEach((loop, li) => {
    const ccw = area(loop) > 0, sgn = (ccw ? 1 : -1) * (li ? -1 : 1), n = loop.length;
    const en = loop.map((a, i) => { const b = loop[(i + 1) % n], dr = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dr, dy) || 1; return [sgn * dy / L, -sgn * dr / L]; });
    const vn = (i, k) => { const a = en[k], b = en[i], c = a[0] * b[0] + a[1] * b[1]; if (c > Math.cos(35 * Math.PI / 180)) { const x = a[0] + b[0], y = a[1] + b[1], L = Math.hypot(x, y); return [x / L, y / L]; } return b; };
    for (let i = 0; i < n; i++) {
      const a = loop[i], b = loop[(i + 1) % n];
      if (a[0] < 1e-6 && b[0] < 1e-6) continue;
      const na = vn(i, (i - 1 + n) % n), nb = vn(i, (i + 1) % n);
      const base = pos.length / 3;
      for (let j = 0; j <= seg; j++) {
        const f = (j / seg) * Math.PI * 2, s = Math.sin(f), c = Math.cos(f);
        pos.push(a[0] * s, a[1], a[0] * c, b[0] * s, b[1], b[0] * c);
        nor.push(na[0] * s, na[1], na[0] * c, nb[0] * s, nb[1], nb[0] * c);
      }
      const p = (k) => new THREE.Vector3(pos[(base + k) * 3], pos[(base + k) * 3 + 1], pos[(base + k) * 3 + 2]);
      const fn = new THREE.Vector3().subVectors(p(1), p(0)).cross(new THREE.Vector3().subVectors(p(2), p(0)));
      const mid = new THREE.Vector3(en[i][0] * Math.sin(Math.PI / seg), en[i][1], en[i][0] * Math.cos(Math.PI / seg));
      const flip = fn.dot(mid) < 0;
      for (let j = 0; j < seg; j++) {
        const v = base + j * 2, A = v, B = v + 1, C = v + 2, D = v + 3;
        if (!flip) idx.push(A, B, C, B, D, C); else idx.push(A, C, B, B, C, D);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
function shapeOf(loops, k) {
  const s = new THREE.Shape(loops[0].map(p => new THREE.Vector2(p[0] * k, p[1])));
  loops.slice(1).forEach(h => s.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0] * k, p[1])))));
  return s;
}

/* ---------------------------------------------------------------- viewer */
export function mount(host, labelHost, ui) {
  let renderer;
  try {
    const test = document.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no webgl');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  } catch (e) { return null; }

  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '3D equipment view: drag to rotate, scroll or pinch to zoom, right-drag or two-finger drag to pan');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment(renderer);
  const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
  scene.environment = envTex;
  roomEnv.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8f5, 0.7); rim.position.set(4, 2, -5); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xeef3fb, 0x3a4250, 0.35));

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reduce.matches;
  controls.dampingFactor = 0.12;
  controls.screenSpacePanning = true;
  controls.rotateSpeed = 0.8;
  controls.autoRotateSpeed = reduce.matches ? 0.6 : 1.2;

  function hatchTex(bg, fg, dir, step) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 64, 64); x.strokeStyle = fg; x.lineWidth = step / 3.2;
    for (let i = -64; i <= 128; i += step) { x.beginPath(); if (dir > 0) { x.moveTo(i, 64); x.lineTo(i + 64, 0); } else { x.moveTo(i, 0); x.lineTo(i + 64, 64); } x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 9, 1 / 9); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const HATCH = {
    A: hatchTex('#c4c6c9', '#7d828a', 1, 16),       // body, heads, housing
    B: hatchTex('#d0d2d6', '#888d96', -1, 16),      // pistons, connectors
    C: hatchTex('#aeb2b8', '#626872', 1, 8)         // fittings (fine, darker)
  };
  const HATCH_OF = { sPiston: 'B', nPiston: 'B', inlet: 'C', n2Port: 'C', outlet: 'C', headU: 'A', headL: 'A' };
  // number badges (canvas textures, shared)
  const badgeTex = {};
  function badge(n, on) {
    const k = n + (on ? 'on' : '');
    if (badgeTex[k]) return badgeTex[k];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = on ? '#2f78e0' : '#e9eef4'; x.beginPath(); x.arc(32, 32, 30, 0, Math.PI * 2); x.fill();
    x.lineWidth = 3; x.strokeStyle = '#0a0e16'; x.stroke();
    x.fillStyle = on ? '#ffffff' : '#1b2330'; x.font = '700 36px IBM Plex Mono, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 32, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; badgeTex[k] = t;
    return t;
  }

  const S = { item: 'spmc', cut: true, horiz: false, labels: true, selected: null, auto: false };
  let root = null, parts = {}, anchors = [], built = '', raf = 0, size = new THREE.Vector3(), fit = 10;
  const planes = [new THREE.Plane(), new THREE.Plane()];
  const ray = new THREE.Raycaster(), inv = new THREE.Matrix4();
  const half = () => S.item === 'module';                     // half section (z > 0 removed) vs quarter section

  /* ---------------------------------------------------------- materials */
  const MAT = {
    alloy:  () => new THREE.MeshStandardMaterial({ color: 0xc9c9c6, metalness: 1, roughness: 0.27 }),
    alloyB: () => new THREE.MeshStandardMaterial({ color: 0xb4b4b1, metalness: 1, roughness: 0.36 }),
    plate:  () => new THREE.MeshStandardMaterial({ color: 0x8693a4, metalness: 0.9, roughness: 0.5 }),
    steel:  () => new THREE.MeshStandardMaterial({ color: 0xb9c3cf, metalness: 1, roughness: 0.36 }),
    steelB: () => new THREE.MeshStandardMaterial({ color: 0xa6b0bd, metalness: 1, roughness: 0.42 }),
    agit:   () => new THREE.MeshStandardMaterial({ color: 0xcfb06a, metalness: 1, roughness: 0.3 }),
    seal:   () => new THREE.MeshStandardMaterial({ color: 0x1b1e23, metalness: 0, roughness: 0.75 }),
    fn:     () => new THREE.MeshStandardMaterial({ color: 0xd9a514, metalness: 0.2, roughness: 0.55 }),
    inner:  () => new THREE.MeshStandardMaterial({ color: 0x232a35, metalness: 0.3, roughness: 0.8, envMapIntensity: 0.3 }),
    line:   () => new THREE.MeshStandardMaterial({ color: 0x5c6878, metalness: 0.8, roughness: 0.4 }),
    res:    () => new THREE.MeshStandardMaterial({ color: 0xc58a3d, metalness: 0, roughness: 0.28, transparent: true, opacity: 0.6, depthWrite: false }),
    comp:   () => new THREE.MeshStandardMaterial({ color: 0x8e7fd6, metalness: 0, roughness: 0.3, transparent: true, opacity: 0.6, depthWrite: false }),
    bore:   () => new THREE.MeshStandardMaterial({ color: 0x0d1118, metalness: 0, roughness: 0.9 }),
    n2:     () => new THREE.MeshBasicMaterial({ color: 0xb9cde8, transparent: true, opacity: 0.22, depthWrite: false })
  };
  const FLUID = { res: 1, comp: 1, n2: 1 };
  const CUT = { alloy: 'hatch', alloyB: 'hatch', steel: 'hatch', steelB: 'hatch', agit: 0xd8be82, seal: 0x23272e, fn: 0xe2b63a, inner: 0x2a313c, line: 0x6b7787,
    res: 0xd39a4c, comp: 0x9a8de0, bore: 0x0d1118, n2: 'n2Cut' };
  function cutMat(kind, offset, id) {
    const c = CUT[kind];
    let m;
    if (c === 'hatch') m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: HATCH[HATCH_OF[id] || 'A'], metalness: 0.2, roughness: 0.7 });
    else if (c === 'n2Cut') m = new THREE.MeshBasicMaterial({ color: 0xc3d5ee, transparent: true, opacity: 0.4, depthWrite: false });
    else if (kind === 'res' || kind === 'comp') m = new THREE.MeshStandardMaterial({ color: c, metalness: 0, roughness: 0.5, transparent: true, opacity: 0.7, depthWrite: false });
    else m = new THREE.MeshStandardMaterial({ color: c, metalness: 0, roughness: 0.6 });
    m.side = THREE.DoubleSide;
    if (offset) { m.polygonOffset = true; m.polygonOffsetFactor = offset; m.polygonOffsetUnits = offset * 2; }
    return m;
  }
  let noClip = false;                                           // module: chambers and flowline stay whole
  function clip(m) {
    if (S.cut && !noClip) { m.clippingPlanes = half() ? [planes[1]] : planes; m.clipIntersection = !half(); m.side = THREE.DoubleSide; }
    return m;
  }

  /* --------------------------------------------------------- part builder */
  let grp = null;                                              // optional transform group (module chambers)
  function part(id) {
    if (!parts[id]) { const g = new THREE.Group(); g.userData.part = id; parts[id] = g; root.add(g); }
    return parts[id];
  }
  function host3(id) { return grp ? grp.sub(id) : part(id); }
  function addMesh(id, geo, kind, opt = {}) {
    const m = new THREE.Mesh(geo, clip(MAT[kind]()));
    if (opt.flat) m.material.flatShading = true;
    if (opt.pos) m.position.set(...opt.pos);
    if (opt.rot) m.rotation.set(...opt.rot);
    m.userData.part = id; m.userData.kind = kind;
    if (noClip) m.userData.noClip = true;
    if (FLUID[kind]) { m.renderOrder = 2; m.userData.noOcclude = true; }
    host3(id).add(m);
    return m;
  }
  // section faces: quarter section -> on z = 0 (x < 0) and x = 0 (z > 0); half section -> both halves of z = 0
  function caps(id, loops, kind, kA = 1, kB = 1, offset = 1, dy = 0) {
    if (!S.cut || noClip) return;
    const a = new THREE.ShapeGeometry(shapeOf(loops, kA)); a.scale(-1, 1, 1); a.translate(0, dy, 0);
    const b = new THREE.ShapeGeometry(shapeOf(loops, kB));
    if (half()) b.translate(0, dy, 0); else { b.rotateY(-Math.PI / 2); b.translate(0, dy, 0); }
    [a, b].forEach(g => {
      const m = new THREE.Mesh(g, cutMat(kind, offset, id)); m.userData.part = id; m.userData.cap = true; m.userData.kind = kind;
      if (FLUID[kind]) { m.renderOrder = 3; m.userData.noOcclude = true; }
      host3(id).add(m);
    });
  }
  function rev(id, loops, kind, offset = 1) { addMesh(id, revolve(loops), kind); caps(id, loops, kind, 1, 1, offset); }
  function prismY(id, r, y0, y1, sides, kind, bore = 0) {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, sides, 1); g.translate(0, (y0 + y1) / 2, 0);
    addMesh(id, g, kind, { flat: sides <= 8 });
    caps(id, [rect(bore, r, y0, y1)], kind, sides === 6 ? COS30 : 1, 1, 2);
  }
  function cylX(id, r, x0, x1, y, kind, sides = 32) {
    const g = new THREE.CylinderGeometry(r, r, Math.abs(x1 - x0), sides, 1); g.rotateZ(Math.PI / 2);
    g.translate((x0 + x1) / 2, y, 0);
    addMesh(id, g, kind, { flat: sides <= 8 });
    if (S.cut && !noClip && Math.min(x0, x1) < 0) {
      const xa = Math.min(x0, x1), xb = half() ? Math.max(x0, x1) : Math.min(Math.max(x0, x1), 0), k = sides === 6 ? COS30 : 1;
      const sg = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(xa, y - r * k), new THREE.Vector2(xb, y - r * k), new THREE.Vector2(xb, y + r * k), new THREE.Vector2(xa, y + r * k)]));
      const m = new THREE.Mesh(sg, cutMat(kind, 2, id)); m.userData.part = id; m.userData.cap = true; host3(id).add(m);
    }
  }

  /* ================================================================ SPMC */
  function headLoop(s) {           // s = +1 sample head (top), -1 nitrogen head; cavity r < 13 holds the function block
    const L = [[2.2, 222], [17, 222], [17, 224], [28, 224], [28, 292], [2.2, 292], [2.2, 280], [13, 280], [13, 248], [2.2, 248]];
    return s > 0 ? L : mirrorY(L);
  }
  function buildSpmc(ext) {        // ext: exterior-only build used inside the module (no internals)
    const al = ext ? 'alloyB' : 'alloy';
    rev('body', [rect(17, 26, -224, 224)], al, 1);
    rev('headU', [headLoop(1)], 'alloyB', 2);
    rev('headL', [headLoop(-1)], 'alloyB', 2);
    // inlet: hex + stub; charging port: hex + plug
    prismY('inlet', 13, 292, 308, 6, 'alloyB', 2.2);
    rev('inlet', [rect(2.2, 6, 308, 326)], 'alloy', 2);
    prismY('n2Port', 11, -304, -292, 6, 'alloyB', 2.2);
    rev('n2Port', [rect(0, 7, -312, -304)], 'alloy', 2);
    // displacement outlet boss (schematic) on the -x wall
    cylX('outlet', 6, -33, -25.5, -40, 'alloyB');
    if (ext) return;
    // passages
    rev('inlet', [rect(0, 2.2, 280, 326)], 'bore', -2);
    rev('headU', [rect(0, 2.2, 222, 248)], 'bore', -2);
    rev('headL', [rect(0, 2.2, -248, -222)], 'bore', -2);
    rev('n2Port', [rect(0, 2.2, -304, -280)], 'bore', -2);
    cylX('outlet', 1.8, -33.2, -16.8, -40, 'bore', 16);
    // function blocks (mechanism not published): sample isolation, charge activation
    prismY('isoValve', 11.5, 250, 278, 32, 'fn');
    prismY('activation', 11.5, -278, -250, 32, 'fn');
    // sample-piston assembly: agitation piston (schematic) + neck + sample piston with two seals
    const t = SP.top;
    rev('agit', [rect(0, 14, t - 6, t)], 'agit', 0);
    rev('sPiston', [rect(0, 6, t - 10, t - 6)], 'alloyB', 0);
    rev('sPiston', [[[0, t - 40], [16.9, t - 40], [16.9, t - 10], [0, t - 10]]], 'alloy', 1);
    [t - 19, t - 31].forEach(y => rev('seals', [circle(14.6, y, 2.3)], 'seal', 0));
    // nitrogen piston with two seals
    const np = SP.np;
    rev('nPiston', [[[0, np - 26], [16.9, np - 26], [16.9, np], [0, np]]], 'alloy', 1);
    [np - 8, np - 18].forEach(y => rev('seals', [circle(14.6, y, 2.3)], 'seal', 0));
    // fluids: three separate regions
    rev('resFluid', [[[0, t], [14, t], [14, t - 6], [6, t - 6], [6, t - 10], [17, t - 10], [17, 222], [0, 222]]], 'res', 0);
    rev('comp', [rect(0, 17, np, t - 40)], 'comp', 0);
    addMesh('n2', revolve([rect(0, 16.8, -222, np - 26)]), 'n2');
    caps('n2', [rect(0, 16.8, -222, np - 26)], 'n2', 1, 1, 0);
    const pts = []; let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    while (pts.length < 1500) { const y = -221 + (np - 27 + 221) * rnd(), r = 15.5 * Math.sqrt(rnd()), f = rnd() * Math.PI * 2; pts.push(r * Math.sin(f), y, r * Math.cos(f)); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const pm = clip(new THREE.PointsMaterial({ color: 0x4f6f9c, size: 0.022, sizeAttenuation: true, transparent: true, opacity: 0.6, depthWrite: false }));
    pm.side = THREE.FrontSide;
    const P = new THREE.Points(pg, pm); P.userData.part = 'n2'; P.userData.noOcclude = true; P.renderOrder = 2; part('n2').add(P);
  }

  /* =============================================================== MODULE */
  function buildModule() {
    // housing + connectors (clipped by the half section)
    rev('housing', [rect(MOD.R - MOD.wall, MOD.R, -MOD.L, MOD.L)], 'steel', 1);
    if (S.cut) addMesh('housing', revolve([rect(MOD.R - MOD.wall - 0.4, MOD.R - MOD.wall, -MOD.L, MOD.L)]), 'inner');
    const head = [[0, 400], [46, 400], [46, 430], [38, 452], [30, 452], [30, 474], [34, 474], [34, 480], [20, 480], [20, 486], [0, 486]];
    rev('headU', [head], 'steelB', 2);
    rev('headL', [mirrorY(head)], 'steelB', 2);
    if (S.cut) {
      // tier support plates (simplified), with clearance holes for the chambers and the flowline
      [397, 131, -131, -397].forEach(y => rev('housing', [rect(0, MOD.R - MOD.wall, y - 3, y + 3)], 'steelB', 2));
    } else {
      // chamber bays: cover plates on the front face, one per chamber (representation)
      for (let n = 1; n <= 6; n++) {
        const q = chamberPos(n), th = Math.asin(q.x / MOD.R), hgt = 638 * MOD.CK - 4, w = 0.5;
        const g = new THREE.CylinderGeometry(MOD.R + 1.2, MOD.R + 1.2, hgt, 24, 1, false, th - w / 2, w);
        g.translate(0, q.y, 0);
        addMesh('bays', g, 'plate');
        [-1, 1].forEach(e => [-1, 1].forEach(v => {                  // cover screws
          const a = th + e * (w / 2 - 0.05), sc = new THREE.CylinderGeometry(1.6, 1.6, 1.2, 12); sc.rotateX(Math.PI / 2); sc.rotateY(a);
          sc.translate((MOD.R + 1.6) * Math.sin(a), q.y + v * (hgt / 2 - 6), (MOD.R + 1.6) * Math.cos(a)); addMesh('bays', sc, 'inner');
        }));
        const b = new THREE.Mesh(new THREE.CircleGeometry(10, 32), new THREE.MeshBasicMaterial({ map: badge(n), transparent: true }));
        b.position.set((MOD.R + 1.8) * Math.sin(th), q.y, (MOD.R + 1.8) * Math.cos(th)); b.rotation.y = th;
        b.userData.part = 'ch' + n; b.userData.badge = n; part('ch' + n).add(b);
      }
      return;
    }
    // inside: kept whole (not clipped)
    noClip = true;
    const fl = new THREE.CylinderGeometry(2.6, 2.6, 972, 20); addMesh('flowline', fl, 'line');
    for (let n = 1; n <= 6; n++) {
      const q = chamberPos(n), yb = chTop(n) + 8;
      cylX('valves', 1.6, 0, q.x, yb, 'line', 16);
      const v = new THREE.CylinderGeometry(1.6, 1.6, 8, 16); v.translate(q.x, yb - 4, 0); addMesh('valves', v, 'line');
      const blk = new THREE.BoxGeometry(11, 6, 6); blk.translate(q.x / 2, yb, 0); addMesh('valves', blk, 'fn');
      // the chamber: its own group, scaled; every mesh in it belongs to part chN
      const g = new THREE.Group(); g.position.set(q.x, q.y, 0); g.scale.setScalar(MOD.CK); part('ch' + n).add(g);
      const id = 'ch' + n;
      grp = { sub: () => g }; buildSpmc(true); grp = null;
      g.traverse(o => { o.userData.part = id; });
      const b = new THREE.Mesh(new THREE.CircleGeometry(7, 32), new THREE.MeshBasicMaterial({ map: badge(n), transparent: true }));
      b.position.set(q.x + (q.left ? -17 : 17), q.y, 4); b.userData.part = id; b.userData.badge = n; b.userData.noClip = true; part(id).add(b);
    }
    noClip = false;
  }
  /* ---------------------------------------------------------------- build */
  function disposeModel() {
    if (!root) return;
    root.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
    scene.remove(root); root = null; parts = {}; clearLabels();
  }
  function build() {
    const sig = [S.item, S.cut, S.horiz].join('|');
    if (sig === built) return false;
    disposeModel();
    root = new THREE.Group(); root.scale.setScalar(U); scene.add(root);
    if (S.item === 'spmc') buildSpmc(false); else buildModule();
    Object.keys(parts).forEach(id => { const info = PARTS[S.item][id]; parts[id].visible = !(info && info.internal) || S.cut || (S.item === 'module' && /^ch\d$/.test(id)); });
    root.rotation.z = S.horiz ? -Math.PI / 2 : 0;
    root.updateMatrixWorld(true);
    // x = 0 and z = 0 planes; the half section uses only the second
    const local = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
    planes.forEach((p, i) => p.copy(local[i]).applyMatrix4(root.matrixWorld));
    new THREE.Box3().setFromObject(root).getSize(size);
    anchors = ANCHORS[S.item];
    built = sig;
    if (S.selected && !parts[S.selected] && !PARTS[S.item][S.selected]) S.selected = null;
    highlight();
    return true;
  }

  /* --------------------------------------------------------------- camera */
  function resetCamera() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1, asp = w / h, vf = THREE.MathUtils.degToRad(camera.fov);
    const az = S.horiz ? 0 : (half() ? -0.35 : -0.7), el = S.horiz ? 0.45 : 0.3;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const box = new THREE.Box3().setFromObject(root), corners = [];
    for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
    camera.aspect = asp; fit = Math.max(size.x, size.y) / (2 * Math.tan(vf / 2));
    for (let k = 0; k < 6; k++) {
      camera.position.copy(dir).multiplyScalar(fit); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      const m = Math.max(...corners.map(c => { const p = c.clone().project(camera); return Math.max(Math.abs(p.x), Math.abs(p.y)); }));
      fit *= 0.5 + 0.5 * (m / (S.horiz ? 0.78 : 0.9));
    }
    camera.position.copy(dir).multiplyScalar(fit);
    controls.target.set(0, 0, 0);
    controls.minDistance = Math.max(size.x, size.z) * 0.9;
    controls.maxDistance = fit * 2.2;
    camera.near = 0.02; camera.far = fit * 6; camera.updateProjectionMatrix();
    controls.update();
    request();
  }
  controls.addEventListener('change', () => {
    if (!root) return;
    const lim = size.clone().multiplyScalar(0.5), t = controls.target;
    const c = t.clone().clamp(lim.clone().negate(), lim);
    if (!c.equals(t)) { const d = c.sub(t); t.add(d); camera.position.add(d); }
    request();
  });

  /* -------------------------------------------------------------- picking */
  function removed(p) { return half() ? p.z > 1e-3 : (p.x < -1e-3 && p.z > 1e-3); }
  function validHits(x, y, objs) {
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera);
    return filterHits(ray.intersectObjects(objs, true));
  }
  function filterHits(hits) {
    inv.copy(root.matrixWorld).invert();
    return hits.filter(h => {
      if (!h.object.visible || !visibleChain(h.object)) return false;
      if (h.object.isPoints) return false;
      if (!S.cut || h.object.userData.cap || h.object.userData.noClip || noClipChain(h.object)) return true;
      return !removed(h.point.clone().applyMatrix4(inv));
    });
  }
  function noClipChain(o) { while (o && o !== root) { if (o.userData.noClip) return true; o = o.parent; } return false; }
  function visibleChain(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  function partOf(o) { while (o && o !== root) { if (o.userData.part) return o.userData.part; o = o.parent; } return null; }
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || !root) { down = null; return; }
    down = null;
    const h = validHits(e.clientX, e.clientY, [root])[0];
    select(h ? partOf(h.object) : null);
  });
  renderer.domElement.addEventListener('dblclick', () => {
    const m = S.selected && /^ch(\d)$/.exec(S.selected);
    if (m && ui.onOpen) ui.onOpen(+m[1]);
  });
  function highlight() {
    if (!root) return;
    root.traverse(o => {
      if (!o.material) return;
      const id = partOf(o), on = S.selected && id === S.selected;
      if (o.userData.badge) { o.material.map = badge(o.userData.badge, on); o.material.needsUpdate = true; return; }
      if (!o.material.emissive) {
        if (!o.userData.c0) o.userData.c0 = o.material.color.clone();
        o.material.color.copy(o.userData.c0); if (on) o.material.color.lerp(new THREE.Color(0x2f78e0), 0.45);
        return;
      }
      o.material.emissive.setHex(on ? 0x2f78e0 : 0x000000);
      o.material.emissiveIntensity = on ? (o.material.metalness > .5 ? 0.6 : 0.35) : 0;
    });
  }
  function select(id, fromList) {
    const info = id && PARTS[S.item][id];
    S.selected = info ? id : null;
    if (info && info.internal && !S.cut && fromList && !info.chamber) ui.onNeedCut && ui.onNeedCut();
    highlight(); request(); ui.onSelect && ui.onSelect(S.selected, info || null, S.cut);
  }

  /* --------------------------------------------------------------- labels */
  const wpos = new THREE.Vector3();
  function labels() {
    if (!S.labels || !root) { labPool.forEach(el => { el.hidden = true; }); leadSvg.innerHTML = ''; return; }
    const W = host.clientWidth, H = host.clientHeight, cam = camera.position, items = [];
    const occ = [];
    root.traverse(o => { if (o.isMesh && !o.userData.noOcclude && !o.userData.badge && visibleChain(o)) occ.push(o); });
    anchors.forEach(a => {
      const info = PARTS[S.item][a.p];
      if (!info) return;
      if (S.item === 'module') { if (a.p === 'bays' && S.cut) return; if (info.internal && !S.cut && !info.chamber) return; if (info.chamber && !S.cut) return; }
      else if (info.internal && !S.cut) return;
      wpos.set(a.at[0], a.at[1], a.at[2]).applyMatrix4(root.matrixWorld);
      if (S.cut && !(S.item === 'module' && (info.internal || a.p === 'flowline')) && removed(new THREE.Vector3(...a.at))) return;
      const dir = wpos.clone().sub(cam), dist = dir.length(); dir.normalize();
      ray.set(cam, dir); ray.far = dist + 0.02;
      const h = filterHits(ray.intersectObjects(occ, false))[0];
      if (h && h.distance < dist - 0.03 && partOf(h.object) !== a.p) return;
      const s = wpos.clone().project(camera);
      if (s.z > 1) return;
      items.push({ a, k: anchors.indexOf(a), x: (s.x + 1) / 2 * W, y: (1 - s.y) / 2 * H });
    });
    const c = new THREE.Vector3().applyMatrix4(root.matrixWorld).project(camera), cx = (c.x + 1) / 2 * W;
    const box = new THREE.Box3().setFromObject(root), pts = [];
    for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera));
    const bx0 = Math.min(...pts.map(p => (p.x + 1) / 2 * W)), bx1 = Math.max(...pts.map(p => (p.x + 1) / 2 * W));
    const narrow = W < 560;
    let svg = ''; const used = [];
    if (S.horiz) {
      // horizontal: labels in two rows above and below the model, ordered along it (long, slender model)
      const by0 = Math.min(...pts.map(p => (1 - p.y) / 2 * H)), by1 = Math.max(...pts.map(p => (1 - p.y) / 2 * H)), cy = (by0 + by1) / 2;
      [-1, 1].forEach(side => {
        const L = items.filter(i => (i.y >= cy ? 1 : -1) === side).sort((p, q) => p.x - q.x);
        const rows = [[], []];
        L.forEach((it, k) => { it.w = it.a.n.length * (narrow ? 6.1 : 6.9) + 20; it.t = k % 2; rows[it.t].push(it); });
        rows.forEach((R, t) => {
          R.forEach((it, k) => { it.lx = Math.max(it.x - it.w / 2, k ? R[k - 1].lx + R[k - 1].w + 8 : 4); });
          for (let k = R.length - 1; k >= 0; k--) { const lim = k === R.length - 1 ? W - R[k].w - 4 : R[k + 1].lx - R[k].w - 8; if (R[k].lx > lim) R[k].lx = Math.max(4, lim); }
          R.forEach(it => {
            it.ly = side < 0 ? Math.max(14, by0 - 30 - 32 * t) : Math.min(H - 14, by1 + 30 + 32 * t);
            const ex = Math.min(Math.max(it.x, it.lx + 8), it.lx + it.w - 8), ey = it.ly - side * 12;
            svg += '<path d="M' + it.x.toFixed(1) + ' ' + it.y.toFixed(1) + ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1) + '"/>' +
              '<circle cx="' + it.x.toFixed(1) + '" cy="' + it.y.toFixed(1) + '" r="2.6"/>';
            used.push({ key: it.k + '|' + it.a.n, part: it.a.p, n: it.a.n, top: it.ly, side: 1, x: it.lx, W });
          });
        });
      });
    } else [-1, 1].forEach(side => {
      const L = items.filter(i => (i.x >= cx ? 1 : -1) === side).sort((p, q) => p.y - q.y);
      const colW = narrow ? 118 : 168;
      let x = side > 0 ? Math.min(bx1 + 26, W - colW - 8) : Math.max(bx0 - 26, colW + 8);
      if (side > 0) x = Math.max(x, cx + 20); else x = Math.min(x, cx - 20);
      const sp = narrow ? 22 : 26;
      L.forEach((it, k) => { it.ly = Math.max(it.y, k ? L[k - 1].ly + sp : 12); });
      for (let k = L.length - 1; k >= 0; k--) { const lim = k === L.length - 1 ? H - 12 : L[k + 1].ly - sp; if (L[k].ly > lim) L[k].ly = lim; }
      L.forEach(it => {
        const est = it.a.n.length * (narrow ? 6.1 : 6.9) + 20;
        const lx = side > 0 ? Math.min(x, W - est - 4) : Math.max(x, est + 4);
        const ex = lx - side * 6;
        svg += '<path d="M' + it.x.toFixed(1) + ' ' + it.y.toFixed(1) + ' L' + (ex - side * 10).toFixed(1) + ' ' + it.ly.toFixed(1) + ' H' + ex.toFixed(1) + '"/>' +
          '<circle cx="' + it.x.toFixed(1) + '" cy="' + it.y.toFixed(1) + '" r="2.6"/>';
        used.push({ key: it.k + '|' + it.a.n, part: it.a.p, n: it.a.n, top: it.ly, side, x: lx, W });
      });
    });
    leadSvg.setAttribute('width', W); leadSvg.setAttribute('height', H); leadSvg.innerHTML = svg;
    const keep = new Set();
    used.forEach(u => {
      let el = labPool.get(u.key);
      if (!el) { el = document.createElement('button'); el.type = 'button'; el.className = 'v3-lab'; el.textContent = u.n; el.dataset.part = u.part; labelHost.appendChild(el); labPool.set(u.key, el); }
      el.hidden = false; keep.add(u.key);
      el.classList.toggle('on', S.selected === u.part);
      el.style.top = u.top.toFixed(1) + 'px';
      if (u.side > 0) { el.style.left = u.x.toFixed(1) + 'px'; el.style.right = ''; } else { el.style.right = (u.W - u.x).toFixed(1) + 'px'; el.style.left = ''; }
    });
    labPool.forEach((el, k) => { if (!keep.has(k)) el.hidden = true; });
  }
  const labPool = new Map();
  const leadSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); leadSvg.setAttribute('class', 'v3-lead'); labelHost.appendChild(leadSvg);
  function clearLabels() { labPool.forEach(el => el.remove()); labPool.clear(); leadSvg.innerHTML = ''; }
  const onLabel = e => { const b = e.target.closest('[data-part]'); if (b) select(b.getAttribute('data-part'), true); };
  labelHost.addEventListener('click', onLabel);

  /* --------------------------------------------------------------- render */
  function render() { if (!root) return; renderer.render(scene, camera); labels(); }
  function request() { if (!raf && host.isConnected && !host.closest('[hidden]')) raf = requestAnimationFrame(tick); }
  const lastP = new THREE.Vector3(), lastQ = new THREE.Quaternion();
  function tick() {
    raf = 0; controls.update(); render();
    const moved = camera.position.distanceTo(lastP) > fit * 1e-4 || 1 - Math.abs(camera.quaternion.dot(lastQ)) > 1e-8;
    lastP.copy(camera.position); lastQ.copy(camera.quaternion);
    if (moved || controls.autoRotate || dragging) request();
  }
  let dragging = false;
  controls.addEventListener('start', () => { dragging = true; request(); });
  controls.addEventListener('end', () => { dragging = false; request(); });
  function resize() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h; camera.updateProjectionMatrix(); request();
  }
  const ro = new ResizeObserver(resize); ro.observe(host);
  const onMotion = () => { controls.enableDamping = !reduce.matches; controls.autoRotateSpeed = reduce.matches ? 0.6 : 1.2; };
  if (reduce.addEventListener) reduce.addEventListener('change', onMotion);

  /* ------------------------------------------------------------------ API */
  return {
    PARTS,
    set(next) {
      const prev = { item: S.item, horiz: S.horiz };
      Object.assign(S, next);
      controls.autoRotate = !!S.auto;
      resize();
      const rebuilt = build();
      if (rebuilt && (prev.item !== S.item || prev.horiz !== S.horiz || !this._placed)) { this._placed = true; resetCamera(); }
      ui.onSelect && ui.onSelect(S.selected, S.selected ? PARTS[S.item][S.selected] : null, S.cut);
      request();
    },
    select(id) { select(id, true); },
    resetCamera,
    setCamera(p, t) { camera.position.set(...p); controls.target.set(...t); controls.update(); request(); },
    pause() { if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { resize(); request(); },
    stats() { return { canvases: host.querySelectorAll('canvas').length, raf: !!raf, dragging, auto: controls.autoRotate, cam: camera.position.toArray().map(v => +v.toFixed(4)), calls: renderer.info.render.calls, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
    destroy() {
      this.pause(); ro.disconnect(); controls.dispose(); disposeModel();
      Object.values(HATCH).forEach(t => t.dispose()); Object.values(badgeTex).forEach(t => t.dispose()); envTex.dispose(); renderer.dispose();
      if (reduce.removeEventListener) reduce.removeEventListener('change', onMotion);
      labelHost.removeEventListener('click', onLabel);
      renderer.domElement.remove(); clearLabels(); leadSvg.remove();
    }
  };
}
