/* ==========================================================================
   PVT Nexus — sample bottle design review · 3D viewer (ES module)

   Representative 3D models of the two approved 2D designs, built from the
   same dimensions as bottle-draw.js (2D units, scaled by U; y is up and the
   sample / "top" end is +y).

   Cutaway = a genuine quarter section: the quadrant x < 0, z > 0 (model
   space) is removed with two clipping planes, and every revolved part gets
   real cut faces (hatched for metal, solid for fluids) generated from its
   own section profile. Non-revolved parts (valve bodies, handles, bars) are
   clipped; boxes and prisms also get cut faces.

   Rendering is on demand: a frame is drawn only when the camera, the model
   or the labels change, or while damping / auto-rotate is running.
   ========================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const U = 0.01;                       // world units per 2D drawing unit
const SEG = 72;                       // revolve segments
const COS30 = Math.cos(Math.PI / 6);

/* ------------------------------------------------------------ part catalogue
   Names and explanations live in equipment/equipment-data.js (window.EQUIPMENT),
   shared with the 2D drawings and the Equipment Library page. */
const PARTS = { oil: window.EQUIPMENT.oil.parts, gas: window.EQUIPMENT.gas.parts };
/* label anchors, model space in 2D units (y up). part = selection target */
const ANCHORS = {
  oil: [
    { p: 'handle', n: 'Valve handle', at: [16, 340, 3] },
    { p: 'cage', n: 'Valve protector', at: [26, 318, 26] },
    { p: 'port', n: 'Sample connection', at: [48, 281, 0] },
    { p: 'valve', n: 'Sample valve', at: [10, 290, 13] },
    { p: 'evac', n: 'Evacuation fitting', at: [-61, 243, 0] },
    { p: 'cap', n: 'End cap', at: [28, 232, 28] },
    { p: 'capSeal', n: 'Cap seal', at: [-19.8, 231.4, 0] },
    { p: 'oil', n: 'Sample chamber', at: [-11, 150, 0] },
    { p: 'ring', n: 'Mixing ring', at: null },
    { p: 'seals', n: 'Piston seals', at: [-21.5, -6.3, 0] },
    { p: 'guide', n: 'Guide ring', at: [-21.8, -20.3, 0] },
    { p: 'piston', n: 'Floating piston', at: [-9, -30, 0] },
    { p: 'body', n: 'Pressure-vessel body', at: [24, -60, 24] },
    { p: 'drive', n: 'Driving-fluid chamber', at: [-11, -140, 0] },
    { p: 'valve', n: 'Driving-fluid valve', at: [10, -290, 13] },
    { p: 'port', n: 'Driving-fluid connection', at: [48, -281, 0] }
  ],
  gas: [
    { p: 'port', n: 'Connection', at: [0, 248, 3.5] },
    { p: 'handle', n: 'Valve handle', at: [42, 207, 0] },
    { p: 'valve', n: 'Isolation valve', at: [10, 214, 12] },
    { p: 'nipple', n: 'Hex nipple', at: [9, 180, 6] },
    { p: 'body', n: 'Tapered shoulder', at: [24, 152, 18] },
    { p: 'chamber', n: 'Gas chamber', at: [-14, 40, 0] },
    { p: 'body', n: 'Cylinder body', at: [30, -40, 30] },
    { p: 'valve', n: 'Isolation valve', at: [10, -214, 12] },
    { p: 'port', n: 'Connection', at: [0, -248, 3.5] }
  ]
};

/* --------------------------------------------------------------- geometry */
function area(loop) { let s = 0; for (let i = 0; i < loop.length; i++) { const a = loop[i], b = loop[(i + 1) % loop.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
function circle(r0, y0, rad, n = 18) { const o = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; o.push([r0 + rad * Math.cos(t), y0 + rad * Math.sin(t)]); } return o; }
function rect(r0, r1, y0, y1) { return [[r0, y0], [r1, y0], [r1, y1], [r0, y1]]; }
function mirrorY(loop) { return loop.map(p => [p[0], -p[1]]).reverse(); }
function bez(p0, p1, p2, p3, n) {
  const o = [];
  for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
  return o;
}

/* revolve closed (r, y) loops about the y axis. loops[0] = outline, others = holes.
   Normals are per edge, smoothed across corners flatter than 35° (curved profiles stay smooth). */
function revolve(loops, seg = SEG) {
  const pos = [], nor = [], idx = [];
  loops.forEach((loop, li) => {
    const ccw = area(loop) > 0, sgn = (ccw ? 1 : -1) * (li ? -1 : 1), n = loop.length;
    const en = loop.map((a, i) => { const b = loop[(i + 1) % n], dr = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dr, dy) || 1; return [sgn * dy / L, -sgn * dr / L]; });
    const vn = (i, k) => { const a = en[k], b = en[i], c = a[0] * b[0] + a[1] * b[1]; if (c > Math.cos(35 * Math.PI / 180)) { const x = a[0] + b[0], y = a[1] + b[1], L = Math.hypot(x, y); return [x / L, y / L]; } return b; };
    for (let i = 0; i < n; i++) {
      const a = loop[i], b = loop[(i + 1) % n];
      if (a[0] < 1e-6 && b[0] < 1e-6) continue;                     // edge on the axis
      const na = vn(i, (i - 1 + n) % n), nb = vn(i, (i + 1) % n);
      const base = pos.length / 3;
      for (let j = 0; j <= seg; j++) {
        const f = (j / seg) * Math.PI * 2, s = Math.sin(f), c = Math.cos(f);
        pos.push(a[0] * s, a[1], a[0] * c, b[0] * s, b[1], b[0] * c);
        nor.push(na[0] * s, na[1], na[0] * c, nb[0] * s, nb[1], nb[0] * c);
      }
      // winding: make the first quad face along its normal, apply the same order to the edge
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
  renderer.domElement.setAttribute('aria-label', '3D bottle view: drag to rotate, scroll or pinch to zoom, right-drag or two-finger drag to pan');

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

  /* hatch textures for metal cut faces. As in a section drawing, neighbouring parts get
     different hatch directions / tints so each part reads separately on the cut plane. */
  function hatchTex(bg, fg, dir, step) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 64, 64); x.strokeStyle = fg; x.lineWidth = step / 3.2;
    for (let i = -64; i <= 128; i += step) { x.beginPath(); if (dir > 0) { x.moveTo(i, 64); x.lineTo(i + 64, 0); } else { x.moveTo(i, 0); x.lineTo(i + 64, 64); } x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 9, 1 / 9); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const HATCH = {
    A: hatchTex('#c3cbd6', '#7b8696', 1, 16),       // vessel body, caps
    B: hatchTex('#cdd3dc', '#86909f', -1, 16),      // piston, valve bodies, nipples
    C: hatchTex('#aab4c2', '#5f6b7c', 1, 8),        // mixing ring, fittings, cages (fine, darker)
    D: hatchTex('#d6dbe2', '#8d97a5', -1, 8)        // stems, connectors
  };
  const HATCH_OF = { piston: 'B', valve: 'B', nipple: 'B', ring: 'C', cage: 'C', evac: 'C', port: 'D', handle: 'D' };

  const S = { bottle: 'oil', cut: true, horiz: false, labels: true, selected: null, auto: false };
  let root = null, parts = {}, anchors = [], built = '', raf = 0, size = new THREE.Vector3(), fit = 10;
  const planesLocal = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
  const planes = [new THREE.Plane(), new THREE.Plane()];         // world space, shared by every clipped material
  const ray = new THREE.Raycaster(), inv = new THREE.Matrix4();

  /* ---------------------------------------------------------- materials */
  const MAT = {
    steel:  () => new THREE.MeshStandardMaterial({ color: 0xc7ced8, metalness: 1, roughness: 0.3 }),
    steelB: () => new THREE.MeshStandardMaterial({ color: 0xb7c0cb, metalness: 1, roughness: 0.38 }),
    knob:   () => new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.25, roughness: 0.55 }),
    ring:   () => new THREE.MeshStandardMaterial({ color: 0xe2e7ee, metalness: 1, roughness: 0.18 }),
    lining: () => new THREE.MeshStandardMaterial({ color: 0x9aa4b1, metalness: 0.5, roughness: 0.75, envMapIntensity: 0.35 }),
    seal:   () => new THREE.MeshStandardMaterial({ color: 0x1b1e23, metalness: 0, roughness: 0.75 }),
    ptfe:   () => new THREE.MeshStandardMaterial({ color: 0xe9e3d2, metalness: 0, roughness: 0.6 }),
    guide:  () => new THREE.MeshStandardMaterial({ color: 0xd6c69a, metalness: 0, roughness: 0.55 }),
    // fluids are slightly translucent so the piston, seals and mixing ring stay readable inside them
    oil:    () => new THREE.MeshStandardMaterial({ color: 0xc58a3d, metalness: 0, roughness: 0.28, transparent: true, opacity: 0.55, depthWrite: false }),
    drive:  () => new THREE.MeshStandardMaterial({ color: 0x4f86ad, metalness: 0, roughness: 0.3, transparent: true, opacity: 0.55, depthWrite: false }),
    bore:   () => new THREE.MeshStandardMaterial({ color: 0x0d1118, metalness: 0, roughness: 0.9 }),
    gas:    () => new THREE.MeshBasicMaterial({ color: 0x9fd2ba, transparent: true, opacity: 0.16, depthWrite: false })   // unlit tint: no glare
  };
  const CUT = {   // cut-face material per base material
    steel: 'hatch', steelB: 'hatch', ring: 'hatch', knob: 0x3a404a, seal: 0x23272e, ptfe: 0xf1ecdf, guide: 0xe0d2a8,
    oil: 0xd39a4c, drive: 0x5f96bd, bore: 0x0d1118, gas: 'gasCut'
  };
  function cutMat(kind, offset, id) {
    const c = CUT[kind];
    let m;
    if (c === 'hatch') m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: HATCH[HATCH_OF[id] || 'A'], metalness: 0.2, roughness: 0.7 });
    else if (c === 'gasCut') m = new THREE.MeshBasicMaterial({ color: 0xa8d8c1, transparent: true, opacity: 0.28, depthWrite: false });
    else if (kind === 'oil' || kind === 'drive') m = new THREE.MeshStandardMaterial({ color: c, metalness: 0, roughness: 0.5, transparent: true, opacity: 0.62, depthWrite: false });
    else m = new THREE.MeshStandardMaterial({ color: c, metalness: 0, roughness: 0.6 });
    m.side = THREE.DoubleSide;
    if (offset) { m.polygonOffset = true; m.polygonOffsetFactor = offset; m.polygonOffsetUnits = offset * 2; }
    return m;
  }
  function clip(m) {
    if (S.cut) { m.clippingPlanes = planes; m.clipIntersection = true; m.side = THREE.DoubleSide; }
    return m;
  }

  /* --------------------------------------------------------- part builder */
  function part(id) {
    if (!parts[id]) { const g = new THREE.Group(); g.userData.part = id; parts[id] = g; root.add(g); }
    return parts[id];
  }
  function addMesh(id, geo, kind, opt = {}) {
    const m = new THREE.Mesh(geo, clip(MAT[kind]()));
    if (opt.flat) { m.material.flatShading = true; }
    if (opt.pos) m.position.set(...opt.pos);
    if (opt.rot) m.rotation.set(...opt.rot);
    m.userData.part = id; m.userData.kind = kind;
    if (kind === 'gas' || kind === 'oil' || kind === 'drive') { m.renderOrder = 2; m.userData.noOcclude = true; }
    part(id).add(m);
    return m;
  }
  // section faces on both cut planes; kA / kB scale r on the z = 0 / x = 0 plane (prisms, boxes)
  function caps(id, loops, kind, kA = 1, kB = 1, offset = 1, dy = 0) {
    if (!S.cut) return;
    const a = new THREE.ShapeGeometry(shapeOf(loops, kA)); a.scale(-1, 1, 1); a.translate(0, dy, 0);
    const b = new THREE.ShapeGeometry(shapeOf(loops, kB)); b.rotateY(-Math.PI / 2); b.translate(0, dy, 0);
    [a, b].forEach(g => {
      const m = new THREE.Mesh(g, cutMat(kind, offset, id)); m.userData.part = id; m.userData.cap = true; m.userData.kind = kind;
      if (kind === 'gas' || kind === 'oil' || kind === 'drive') { m.renderOrder = 3; m.userData.noOcclude = true; }
      part(id).add(m);
    });
  }
  function rev(id, loops, kind, offset = 1) {
    addMesh(id, revolve(loops), kind);
    caps(id, loops, kind, 1, 1, offset);
  }
  // prism / cylinder along y with an optional bore (caps only; the bore itself is a separate dark part)
  function prismY(id, r, y0, y1, sides, kind, bore = 0) {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, sides, 1); g.translate(0, (y0 + y1) / 2, 0);
    addMesh(id, g, kind, { flat: sides <= 8 });
    caps(id, [rect(bore, r, y0, y1)], kind, sides === 6 ? COS30 : 1, 1, 2);
  }
  function boxY(id, w, h, d, yc, kind) {
    addMesh(id, new THREE.BoxGeometry(w, h, d), kind, { pos: [0, yc, 0] });
    caps(id, [rect(0, w / 2, yc - h / 2, yc + h / 2)], kind, 1, d / w, 2);
  }
  // cylinder / prism along x (side outlets, evacuation fitting, gas valve stems)
  function cylX(id, r, x0, x1, y, kind, sides = 32) {
    const g = new THREE.CylinderGeometry(r, r, Math.abs(x1 - x0), sides, 1); g.rotateZ(Math.PI / 2);
    g.translate((x0 + x1) / 2, y, 0);
    addMesh(id, g, kind, { flat: sides <= 8 });
    if (S.cut && Math.min(x0, x1) < 0) {                          // lies on the z = 0 cut plane (x < 0 side)
      const xa = Math.min(x0, x1), xb = Math.min(Math.max(x0, x1), 0), k = sides === 6 ? COS30 : 1;
      const sg = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(xa, y - r * k), new THREE.Vector2(xb, y - r * k), new THREE.Vector2(xb, y + r * k), new THREE.Vector2(xa, y + r * k)]));
      const m = new THREE.Mesh(sg, cutMat(kind, 2, id)); m.userData.part = id; m.userData.cap = true; part(id).add(m);
    }
  }

  /* ============================================================ OIL BOTTLE */
  const OIL = { pt: 2.7, pb: -43.3 };          // piston top / bottom faces (3D y), from the 2D piston position
  function oilEnd(s) {                          // s = +1 sample side (top), -1 driving side (bottom)
    const Y = (v) => s * v, L = (loop) => s > 0 ? loop : mirrorY(loop), sp = (a, b) => [Math.min(Y(a), Y(b)), Math.max(Y(a), Y(b))];
    // end cap with spigot and seal groove, central port r 2
    rev('cap', [L([[2, 226], [22, 226], [22, 228.8], [17.6, 228.8], [17.6, 233.4], [22, 233.4], [22, 236], [34, 236], [34, 214], [39, 214], [39, 250], [2, 250]])], 'steelB', 2);
    rev('capSeal', [L(circle(19.8, 231.4, 2.0))], 'seal', 0);
    rev('capSeal', [L(rect(17.6, 22, 228.8, 229.4))], 'ptfe', 0);
    // valve protector: base ring, top ring and four bars
    rev('cage', [L(rect(34, 39, 250, 256))], 'steel', 1);
    rev('cage', [L(rect(34, 39, 348, 354))], 'steel', 1);
    [45, 135, 225, 315].forEach(a => {
      const t = a * Math.PI / 180;
      addMesh('cage', new THREE.BoxGeometry(5, 92, 4.5), 'steel', { pos: [36.5 * Math.sin(t), Y(302), 36.5 * Math.cos(t)], rot: [0, t, 0] });
    });
    // right-angle needle valve
    prismY('valve', 11, ...sp(250, 258), 6, 'steelB', 2);
    boxY('valve', 30, 42, 26, Y(279), 'steelB');
    cylX('valve', 9, 15, 25, Y(281), 'steelB');
    rev('valve', [L(rect(3, 10, 300, 304))], 'steelB', 2);
    prismY('valve', 12, ...sp(304, 310), 6, 'steelB', 3);
    rev('valve', [L(rect(3, 10, 310, 314))], 'steelB', 2);
    rev('valve', [L([[0, 282], [2.2, 284.6], [2.2, 314], [3, 314], [3, 332], [0, 332]])], 'steel', -1);   // needle + stem (seated)
    rev('handle', [L(rect(0, 6, 332, 340))], 'knob', 1);
    const bar = new THREE.CylinderGeometry(3, 3, 38, 20); bar.rotateZ(Math.PI / 2); bar.translate(0, Y(342), 0);
    addMesh('handle', bar, 'knob');
    if (S.cut) { const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-19, Y(339)), new THREE.Vector2(0, Y(339)), new THREE.Vector2(0, Y(345)), new THREE.Vector2(-19, Y(345))])), cutMat('knob', 2, 'handle')); m.userData.part = 'handle'; m.userData.cap = true; part('handle').add(m); }
    // side outlet: male connector + tube stub, open end shown dark
    cylX('port', 7, 25, 33, Y(281), 'steelB', 6);
    cylX('port', 3.5, 33, 48, Y(281), 'steel', 24);
    addMesh('passage', new THREE.CircleGeometry(2, 20), 'bore', { pos: [48.05, Y(281), 0], rot: [0, Math.PI / 2, 0] });
    // drilled passages: cap port + valve inlet (on the cut plane), dark
    rev('passage', [L(rect(0, 2, 226, 282))], 'bore', -2);
  }
  function buildOil(horiz) {
    rev('body', [rect(22, 34, -236, 236)], 'steel', 1);
    oilEnd(1); oilEnd(-1);
    // evacuation fitting on the sample-side cap (radial, -x) + its drilled passage
    cylX('evac', 6, -48, -39, 243, 'steelB');
    cylX('evac', 7.5, -57, -48, 243, 'steel', 6);
    cylX('evac', 4, -61, -57, 243, 'steelB');
    cylX('passage', 1.6, -40, -12, 243, 'bore', 16);
    const vp = new THREE.CylinderGeometry(1.6, 1.6, 17, 16); vp.translate(-13.2, 234.5, 0);
    addMesh('passage', vp, 'bore');
    if (S.cut) { const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-14.8, 226), new THREE.Vector2(-11.6, 226), new THREE.Vector2(-11.6, 244.6), new THREE.Vector2(-14.8, 244.6)])), cutMat('bore', -2)); m.userData.part = 'passage'; m.userData.cap = true; part('passage').add(m); }
    // floating piston: body with two seal grooves and a guide-ring groove
    const pt = OIL.pt, pb = OIL.pb;
    rev('piston', [[[0, pb], [21.7, pb], [21.7, pb + 5.8], [16.7, pb + 5.8], [16.7, pb + 12.2], [21.7, pb + 12.2], [21.7, pb + 17], [19.5, pb + 17], [19.5, pt - 17], [21.7, pt - 17],
      [21.7, pt - 12.2], [16.7, pt - 12.2], [16.7, pt - 5.8], [21.7, pt - 5.8], [21.7, pt], [0, pt]]], 'steel', 1);
    [pt - 9, pb + 9].forEach(y => {
      rev('seals', [circle(19.2, y, 2.3)], 'seal', 0);
      rev('seals', [rect(16.8, 21.8, y - 3.2, y - 2.4)], 'ptfe', 0);
      rev('seals', [rect(16.8, 21.8, y + 2.4, y + 3.2)], 'ptfe', 0);
    });
    rev('guide', [rect(19.6, 21.9, pb + 17.2, pt - 17.2)], 'guide', 0);
    // mixing ring: rests on the piston face upright; mid-chamber when lying down
    const r0 = horiz ? 112 : pt, r1 = r0 + 6;
    rev('ring', [rect(12, 19.5, r0, r1)], 'ring', 0);
    // fluids: sample above the piston (around the ring), driving fluid below
    const oilLoops = r0 <= pt + 1e-6
      ? [[[0, pt], [12, pt], [12, r1], [19.5, r1], [19.5, pt], [22, pt], [22, 226], [0, 226]]]
      : [[[0, pt], [22, pt], [22, 226], [0, 226]], rect(12, 19.5, r0, r1)];
    rev('oil', oilLoops, 'oil', 0);
    rev('drive', [rect(0, 22, -226, pb)], 'drive', 0);
  }

  /* ============================================================ GAS BOTTLE */
  function gasLoops() {
    const outer = [[12, 172], [12, 160], ...bez([12, 160], [30, 157], [42, 146], [42, 118], 10), [42, -118], ...bez([42, -118], [42, -146], [30, -157], [12, -160], 10), [12, -172]];
    const inner = [[6, 172], [6, 156], ...bez([6, 156], [24, 152], [37, 142], [37, 118], 10), [37, -118], ...bez([37, -118], [37, -142], [24, -152], [6, -156], 10), [6, -172]];
    return { outer, inner };
  }
  function gasEnd(s) {
    const Y = (v) => s * v, L = (loop) => s > 0 ? loop : mirrorY(loop), sp = (a, b) => [Math.min(Y(a), Y(b)), Math.max(Y(a), Y(b))];
    rev('nipple', [L(rect(2, 6, 158, 172))], 'steelB', 2);
    prismY('nipple', 11, ...sp(172, 186), 6, 'steelB', 2);
    rev('nipple', [L([[2, 186], [6, 186], [5.1, 187], [6, 188], [5.1, 189], [6, 190], [5.1, 191], [6, 192], [2, 192]])], 'steelB', 2);   // simplified thread
    boxY('valve', 28, 30, 24, Y(207), 'steelB');
    cylX('valve', 6, 14, 22, Y(207), 'steelB');
    cylX('valve', 2, 22, 30, Y(207), 'steel', 16);
    cylX('handle', 11, 30, 42, Y(207), 'knob', 24);
    prismY('port', 10, ...sp(222, 232), 6, 'steelB', 2);
    rev('port', [L(rect(2, 3.5, 232, 248))], 'steel', 2);
    rev('passage', [L(rect(0, 2, 156, 248))], 'bore', -2);
  }
  function buildGas() {
    const { outer, inner } = gasLoops();
    rev('body', [[...outer, ...inner.slice().reverse()]], 'steel', 1);
    // matte lining on the inner wall: a polished concave dome would mirror the studio light and read as foam
    if (S.cut) {
      const lin = inner.slice(1, -1), off = lin.map(p => [p[0] - 0.35, p[1]]);
      addMesh('body', revolve([[...lin, ...off.reverse()]]), 'lining');
    }
    gasEnd(1); gasEnd(-1);
    // gas fills the whole chamber: faint tinted volume + evenly scattered molecules (no level)
    const gl = [[0, -155.4], ...inner.slice(1, -1).reverse().map(p => [p[0] * 0.985, p[1] * 0.996]), [0, 155.4]];
    addMesh('chamber', revolve([gl]), 'gas');
    caps('chamber', [gl], 'gas', 1, 1, 0);
    const pts = [], rIn = (y) => { for (let i = 1; i < inner.length; i++) { const a = inner[i - 1], b = inner[i]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); } return 0; };
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    while (pts.length < 1500) {
      const y = -154 + 308 * rnd(), R = rIn(y) - 1.5, r = R * Math.sqrt(rnd()), f = rnd() * Math.PI * 2;
      if (R > 0) pts.push(r * Math.sin(f), y, r * Math.cos(f));
    }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const pm = clip(new THREE.PointsMaterial({ color: 0x3f8f6e, size: 0.022, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false }));
    pm.side = THREE.FrontSide;
    const P = new THREE.Points(pg, pm); P.userData.part = 'chamber'; P.userData.noOcclude = true; P.renderOrder = 2; part('chamber').add(P);
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
    const sig = [S.bottle, S.cut, S.horiz].join('|');
    if (sig === built) return false;
    disposeModel();
    root = new THREE.Group(); root.scale.setScalar(U); scene.add(root);
    if (S.bottle === 'oil') buildOil(S.horiz); else buildGas();
    // internal parts are hidden from the outside: render them only in the cutaway
    Object.keys(parts).forEach(id => { const info = PARTS[S.bottle][id]; parts[id].visible = !(info && info.internal) || S.cut; });
    root.rotation.z = S.horiz ? -Math.PI / 2 : 0;
    root.updateMatrixWorld(true);
    planes.forEach((p, i) => p.copy(planesLocal[i]).applyMatrix4(root.matrixWorld));
    new THREE.Box3().setFromObject(root).getSize(size);
    anchors = ANCHORS[S.bottle].map(a => ({ ...a, at: a.at || [-15.75, (S.horiz ? 112 : OIL.pt) + 3, 0] }));
    built = sig;
    if (S.selected && !parts[S.selected]) S.selected = null;
    highlight();
    return true;
  }

  /* --------------------------------------------------------------- camera */
  function resetCamera() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1, asp = w / h, vf = THREE.MathUtils.degToRad(camera.fov);
    const az = S.horiz ? 0 : -0.7, el = S.horiz ? 0.45 : 0.3;      // front-left: looks into the cut quadrant
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    // frame the model: move the camera until every bounding-box corner projects inside ~90 % of the view
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
    // keep panning inside the model's extent so it cannot be lost
    const lim = size.clone().multiplyScalar(0.5), t = controls.target;
    const c = t.clone().clamp(lim.clone().negate(), lim);
    if (!c.equals(t)) { const d = c.sub(t); t.add(d); camera.position.add(d); }
    request();
  });

  /* -------------------------------------------------------------- picking */
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
      if (!S.cut || h.object.userData.cap) return true;
      const p = h.point.clone().applyMatrix4(inv);
      return !(p.x < -1e-3 && p.z > 1e-3);                           // removed quadrant
    });
  }
  function visibleChain(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || !root) { down = null; return; }
    down = null;
    const h = validHits(e.clientX, e.clientY, [root])[0];
    select(h ? h.object.userData.part : null);
  });
  const HI = new THREE.Color(0x2f78e0);
  function highlight() {
    if (!root) return;
    root.traverse(o => {
      if (!o.material) return;
      const on = S.selected && o.userData.part === S.selected;
      if (!o.material.emissive) {                                    // unlit materials (gas): tint toward the highlight colour
        if (!o.userData.c0) o.userData.c0 = o.material.color.clone();
        o.material.color.copy(o.userData.c0); if (on) o.material.color.lerp(HI, 0.45);
        return;
      }
      o.material.emissive.setHex(on ? 0x2f78e0 : 0x000000);
      o.material.emissiveIntensity = on ? (o.material.metalness > .5 ? 0.6 : 0.35) : 0;
    });
  }
  function select(id, fromList) {
    const info = id && PARTS[S.bottle][id];
    S.selected = info ? id : null;
    if (info && info.internal && !S.cut && fromList) ui.onNeedCut && ui.onNeedCut();   // internal part picked from the list
    highlight(); request(); ui.onSelect && ui.onSelect(S.selected, info || null, S.cut);
  }

  /* --------------------------------------------------------------- labels */
  const wpos = new THREE.Vector3();
  function labels() {
    if (!S.labels || !root) { labPool.forEach(el => { el.hidden = true; }); leadSvg.innerHTML = ''; return; }
    const W = host.clientWidth, H = host.clientHeight, cam = camera.position, items = [];
    const occ = [];
    root.traverse(o => { if ((o.isMesh) && !o.userData.noOcclude && visibleChain(o)) occ.push(o); });
    anchors.forEach(a => {
      const info = PARTS[S.bottle][a.p];
      if (!info || (info.internal && !S.cut)) return;
      wpos.set(a.at[0], a.at[1], a.at[2]).applyMatrix4(root.matrixWorld);
      if (S.cut) { const l = new THREE.Vector3(...a.at); if (l.x < -1e-3 && l.z > 1e-3) return; }
      const dir = wpos.clone().sub(cam), dist = dir.length(); dir.normalize();
      ray.set(cam, dir); ray.far = dist + 0.02;
      const h = filterHits(ray.intersectObjects(occ, false))[0];
      if (h && h.distance < dist - 0.03 && h.object.userData.part !== a.p) return;   // hidden behind an opaque part
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
    [-1, 1].forEach(side => {
      const L = items.filter(i => (i.x >= cx ? 1 : -1) === side).sort((p, q) => p.y - q.y);
      const colW = narrow ? 118 : 168;
      let x = side > 0 ? Math.min(bx1 + 26, W - colW - 8) : Math.max(bx0 - 26, colW + 8);
      if (side > 0) x = Math.max(x, cx + 20); else x = Math.min(x, cx - 20);
      const sp = narrow ? 22 : 26;
      L.forEach((it, k) => { it.ly = Math.max(it.y, k ? L[k - 1].ly + sp : 12); });
      for (let k = L.length - 1; k >= 0; k--) { const lim = k === L.length - 1 ? H - 12 : L[k + 1].ly - sp; if (L[k].ly > lim) L[k].ly = lim; }
      L.forEach(it => {
        const est = it.a.n.length * (narrow ? 6.1 : 6.9) + 20;                       // keep every label inside the stage
        const lx = side > 0 ? Math.min(x, W - est - 4) : Math.max(x, est + 4);
        const ex = lx - side * 6;
        svg += '<path d="M' + it.x.toFixed(1) + ' ' + it.y.toFixed(1) + ' L' + (ex - side * 10).toFixed(1) + ' ' + it.ly.toFixed(1) + ' H' + ex.toFixed(1) + '"/>' +
          '<circle cx="' + it.x.toFixed(1) + '" cy="' + it.y.toFixed(1) + '" r="2.6"/>';
        used.push({ key: it.k + '|' + it.a.n, part: it.a.p, n: it.a.n, top: it.ly, side, x: lx, W });
      });
    });
    leadSvg.setAttribute('width', W); leadSvg.setAttribute('height', H); leadSvg.innerHTML = svg;
    // label buttons are reused between frames (stable targets for clicks while the model moves)
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
  labelHost.addEventListener('click', e => { const b = e.target.closest('[data-part]'); if (b) select(b.getAttribute('data-part'), true); });

  /* --------------------------------------------------------------- render */
  function render() { if (!root) return; renderer.render(scene, camera); labels(); }
  function request() { if (!raf && host.isConnected && !host.closest('[hidden]')) raf = requestAnimationFrame(tick); }
  // keep animating only while something visibly moves (damping tail cut off once motion is imperceptible)
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
      const prev = { bottle: S.bottle, horiz: S.horiz };
      Object.assign(S, next);
      controls.autoRotate = !!S.auto;
      resize();
      const rebuilt = build();
      if (rebuilt && (prev.bottle !== S.bottle || prev.horiz !== S.horiz || !this._placed)) { this._placed = true; resetCamera(); }
      ui.onSelect && ui.onSelect(S.selected, S.selected ? PARTS[S.bottle][S.selected] : null, S.cut);
      request();
    },
    select(id) { select(id, true); },
    resetCamera,
    setCamera(p, t) { camera.position.set(...p); controls.target.set(...t); controls.update(); request(); },   // review / screenshot hook
    pause() { if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { resize(); request(); },
    stats() { return { canvases: host.querySelectorAll('canvas').length, raf: !!raf, dragging, auto: controls.autoRotate, cam: camera.position.toArray().map(v => +v.toFixed(4)), calls: renderer.info.render.calls, geometries: renderer.info.memory.geometries }; },
    destroy() {
      this.pause(); ro.disconnect(); controls.dispose(); disposeModel(); Object.values(HATCH).forEach(t => t.dispose()); envTex.dispose(); renderer.dispose();
      if (reduce.removeEventListener) reduce.removeEventListener('change', onMotion);
      renderer.domElement.remove(); clearLabels(); leadSvg.remove();
    }
  };
}
