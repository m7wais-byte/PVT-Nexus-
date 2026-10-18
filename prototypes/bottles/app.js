/* ==========================================================================
   PVT Nexus — bottle design prototype · page controller
   One requestAnimationFrame loop (cancelled on every bottle change / reset).
   Demonstration = configs timeline (pure function of time). Manual = a snapshot
   of the current state edited by the valve / volume controls.
   ========================================================================== */
(function () {
  'use strict';
  var D = window.PBDraw, P = window.PBConfig, F = D.FLUID;
  var $ = function (id) { return document.getElementById(id); };
  var r1 = function (v) { return Math.round(v * 10) / 10; };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var fmt = function (v) { return Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : String(v); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var VB = { w: 820, h: 620, cx: 410, cy: 310 };     // set per orientation in setVB()
  function setVB() {
    VB = st.orient === 'horizontal' ? { w: 1000, h: 520, cx: 500, cy: 260 } : { w: 820, h: 620, cx: 410, cy: 310 };
    $('svg').setAttribute('viewBox', '0 0 ' + VB.w + ' ' + VB.h);
  }
  var NS = 'pb';                                   // namespace of the main drawing
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  /* process classification per phase (gas compression / expansion vs liquid transfer) */
  var PROC = {
    wh: { fill: 'LIQUID IN · N₂ (gas) displaced at the bleed' },
    sep: { fill: 'LIQUID TRANSFER · oil in, water out', press: 'LIQUID COMPRESSION · 1.4 cc water in', deliver: 'LIQUID TRANSFER · water in, oil out' },
    bh: { xfer: 'LIQUID TRANSFER · sample in, water out', charge: 'LIQUID TRANSFER · water in, sample out' },
    rc: { gas: 'GAS EXPANSION · 40 cc (5,000 psig) into 245 cc', oil: 'LIQUID IN · free gas COMPRESSED (piston fixed)', press: 'GAS COMPRESSION · water injected behind the piston', invert: 'MIXING · gas going into solution', settle: 'SINGLE PHASE' },
    gspField: { fill: 'GAS IN · fixed volume, pressure rising' },
    gspLab: { boost: 'GAS OUT · fixed volume, pressure falling (expansion)' },
    ti: { vac: 'EVACUATION · gas side to vacuum', boost: 'GAS IN · piston pushed onto the water', comp: 'GAS COMPRESSION by LIQUID TRANSFER', deliver: 'GAS OUT at constant pressure · water in' }
  };
  var GRP = { prep: 'Prepare', fill: 'Fill', hold: 'Hold', discharge: 'Discharge' };

  var st = {
    type: 'piston', cfg: 'wh', view: 'cutaway', labels: true, orient: 'upright',
    t: 0, playing: false, mode: 'demo', man: null, flowUntil: 0, raf: 0, last: 0, msg: ''
  };
  try { var th = localStorage.getItem('pbTheme'); if (th) document.documentElement.setAttribute('data-theme', th); } catch (e) {}

  function cfg() { return P.CONFIGS[st.cfg]; }
  function type() { return P.TYPES.filter(function (t) { return t.id === st.type; })[0]; }
  function cur() { return st.mode === 'manual' ? st.man : P.stateAt(cfg(), st.t); }

  /* ------------------------------------------------------------ geometry */
  function rot(p, deg) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
  function scr(p, deg) { var q = rot(p, deg); return [VB.cx + q[0], VB.cy + q[1]]; }
  function baseAng() { return st.orient === 'horizontal' ? -90 : 0; }

  /* ------------------------------------------------------- render state */
  function renderState(c, s, ang) {
    var g = D.GEOM[type().geom], a = ang * Math.PI / 180;
    var R = {
      geom: type().geom, view: st.view, cap: c.cap || 1, sample: s.sample || 0, valves: s.valves, flow: s.flow, line: s.line,
      capTop: s.capTop, capBot: s.capBot, plate: c.plate, t: performance.now() / 1000, motion: !mqReduce.matches,
      g: [Math.sin(a), Math.cos(a)], bufKind: c.buf, portFluid: { top: null, bot: c.buf || null },
      plateRot: Math.abs(((ang - 90) % 360 + 540) % 360 - 180) > 90 ? 90 : -90   // nameplate always reads upright
    };
    if (c.type === 'gas') { R.gasFrac = s.gas; R.portFluid.top = s.gas > .01 ? 'gas' : null; R.portFluid.bot = s.gas > .01 ? 'gas' : null; }
    else if (c.sampleKind === 'oil') { R.sampleKind = s.sample > .5 ? 'oil' : null; R.portFluid.top = s.sample > .5 || s.flow.top ? 'oil' : null; }
    else if (c.sampleKind === 'recomb') {
      var free = (s.gasV || 0) * (1 - (s.gone || 0));
      R.sampleKind = 'recomb'; R.liquid = s.sample - free; R.mix = s.mix; R.bubbles = s.bubbles; R.drops = s.drops;
      R.gasDots = Math.round(46 * (s.amt / 40) * (1 - (s.gone || 0)));
      R.gasDens = s.amt > 0 && free > .5 ? P.pCharge(s.amt, Math.max(free, 1)) / 5000 : 0;
      R.bufLiquid = s.water;
      R.portFluid.top = s.flow.top ? s.line.top : (s.gone >= 1 ? 'recomb' : s.amt > 0 ? 'gas' : null);
    } else if (c.sampleKind === 'tigas') {
      R.sampleKind = s.fluid === 'gas' ? 'gas' : s.fluid === 'vac' ? 'vac' : null;
      R.gasDots = Math.round(60 * (s.amt || 0) / 69); R.gasDens = s.sample > 0 ? clamp((s.amt || 0) / s.sample, 0, 1) : 0;
      R.bufLiquid = s.water; R.portFluid.top = s.fluid === 'gas' ? 'gas' : null;
    }
    return R;
  }

  /* ---------------------------------------------------------------- lines */
  function tube(pts, fluid, flow, t, motion, curve) {
    var d = curve ? 'M' + pts[0] + ' C' + pts[1] + ' ' + pts[2] + ' ' + pts[3] : 'M' + pts[0] + ' L' + pts[3];
    var o = '<path d="' + d + '" fill="none" stroke="#0a0e16" stroke-width="7.4" stroke-linecap="round"/>';
    o += '<path d="' + d + '" fill="none" stroke="#a9b8cd" stroke-width="4.6" stroke-linecap="round"/>';
    if (fluid) o += '<path d="' + d + '" fill="none" stroke="' + F[fluid].line + '" stroke-width="3.4" stroke-linecap="round"/>';
    if (fluid && flow) {
      var dir = -flow;                                          // path runs bottle -> terminal; +flow = into the bottle
      o += '<path d="' + d + '" fill="none" stroke="' + F[fluid].dash + '" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 10" stroke-dashoffset="' + r1(motion ? -dir * t * 26 : 0) + '"/>';
      var m = bez(pts, .5), tg = bez(pts, .52), ang = Math.atan2(tg[1] - m[1], tg[0] - m[0]) * 180 / Math.PI + (dir < 0 ? 180 : 0);
      o += '<g transform="translate(' + r1(m[0]) + ',' + r1(m[1]) + ') rotate(' + r1(ang) + ')"><circle r="8.5" fill="' + F[fluid].line + '" stroke="#0a0e16" stroke-width="1"/><path d="M-3 -4 L2.5 0 L-3 4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>';
    }
    return o;
  }
  function bez(p, u) {
    var v = 1 - u;
    return [0, 1].map(function (i) { return v * v * v * p[0][i] + 3 * v * v * u * p[1][i] + 3 * v * u * u * p[2][i] + u * u * u * p[3][i]; });
  }
  function drawLines(c, s, ang) {
    var g = D.GEOM[type().geom], b = baseAng(), o = '', tags = '';
    [['top', g.conn, -1], ['bot', -g.conn, 1]].forEach(function (e) {
      var k = e[0], cn = s.conn && s.conn[k], capped = k === 'top' ? s.capTop : s.capBot;
      if (!cn || capped) return;
      var P0 = scr([0, e[1]], ang), dv = rot([0, e[2]], ang);
      var Pb = scr([0, e[1]], b), db = rot([0, e[2]], b);
      var L = Math.abs(db[1]) > .5 ? (db[1] < 0 ? Pb[1] - 22 : VB.h - 22 - Pb[1]) : (db[0] < 0 ? Pb[0] - 36 : VB.w - 36 - Pb[0]);
      var T = [Pb[0] + db[0] * L, Pb[1] + db[1] * L];
      var curve = Math.abs(ang - b) > .5, k1 = Math.min(90, L * .6);
      var pts = [P0, [P0[0] + dv[0] * k1, P0[1] + dv[1] * k1], [T[0] - db[0] * k1, T[1] - db[1] * k1], T];
      var lf = s.line[k], fl = s.valves[k] ? s.flow[k] : 0;
      o += tube(pts, lf, fl, performance.now() / 1000, !mqReduce.matches, curve);
      // terminal: end fitting + what the port is connected to
      o += '<circle cx="' + r1(T[0]) + '" cy="' + r1(T[1]) + '" r="5" fill="#9fb0c8" stroke="#0a0e16" stroke-width="1.2"/>';
      var vert = Math.abs(db[1]) > .5, tx, ty, an;
      if (vert) { tx = T[0] + 14; ty = T[1] + (db[1] < 0 ? 4 : 0); an = 'start'; }
      else { tx = T[0]; ty = T[1] - 30; an = db[0] < 0 ? 'start' : 'end'; }
      tags += '<text class="term-n" x="' + r1(tx) + '" y="' + r1(ty) + '" text-anchor="' + an + '">' + esc(cn.t) + '</text>';
      if (cn.s) tags += '<text class="term-s" x="' + r1(tx) + '" y="' + r1(ty + 13) + '" text-anchor="' + an + '">' + esc(cn.s) + '</text>';
    });
    return { lines: o, tags: tags };
  }

  /* --------------------------------------------------------------- labels */
  function labelText(id, c, s) {
    var g = type().geom, n = c.names, vs = function (k) { var cp = k === 'top' ? s.capTop : s.capBot; return cp ? 'CLOSED · PORT CAPPED' : s.valves[k] ? 'OPEN' : 'CLOSED'; };
    var vol = function (v) { return r1(v).toFixed(1) + ' cc'; };
    switch (id) {
      case 'valveTop': return [n.top, vs('top'), s.valves.top];
      case 'valveBot': return [n.bot, s.capBot && c.type === 'gas' ? 'NOT USED · PLUGGED' : vs('bot'), s.valves.bot];
      case 'capTop': return [g === 'ti' ? 'Bolted end flange' : 'Screwed end cap', 'sample-side port'];
      case 'capBot': return [g === 'ti' ? 'Bolted end flange' : 'Screwed end cap', c.buf === 'n2' ? 'N₂-side port' : 'water-side port'];
      case 'body': return g === 'ti' ? ['Pressure vessel', 'titanium barrel'] : g === 'gas' ? ['Pressure vessel', 'rounded-shoulder shell'] : ['Pressure vessel', 'stainless barrel · clamp collars'];
      case 'fitTop': return [s.capTop ? 'Blanking plug' : 'Tube fitting', 'top connection'];
      case 'fitBot': return [s.capBot ? 'Blanking plug' : 'Tube fitting', 'bottom connection'];
      case 'plate': return ['Identification plate', c.cap ? c.cap + ' cc' : 'capacity not defined'];
      case 'band': return ['Gas service band', 'identification colour'];
      case 'passTop': return ['Drilled port', 'valve seat → chamber'];
      case 'piston': return ['Floating piston', '2 × O-ring seals'];
      case 'chamber': return [n.sample, s.gas > .01 ? 'separator gas' : 'empty'];
      case 'sample': {
        if (c.sampleKind === 'recomb') {
          var free = s.gasV * (1 - (s.gone || 0));
          return [n.sample, s.gone >= 1 ? 'recombined · ' + vol(s.sample) : (s.oil > .5 ? 'oil ' + vol(s.oil) + ' + ' : '') + (s.amt > 0 ? 'gas ' + vol(free) : 'empty ' + vol(s.sample))];
        }
        if (c.sampleKind === 'tigas') return [n.sample, (s.fluid === 'gas' ? 'gas ' : s.fluid === 'vac' ? 'vacuum ' : 'empty ') + vol(s.sample)];
        return [n.sample, (s.sample > .5 ? 'sample oil ' : 'empty ') + vol(s.sample)];
      }
      case 'buffer': {
        if (c.sampleKind === 'tigas') { var gap = c.cap - s.sample - s.water; return [n.buffer, 'water ' + vol(s.water) + (gap > .5 ? ' + empty ' + vol(gap) : '')]; }
        return [n.buffer, (c.buf === 'n2' ? 'N₂ ' : 'water ') + vol(c.cap - s.sample)];
      }
    }
    return [id, ''];
  }
  function drawLabels(c, s) {
    var b = baseAng(), R = renderState(c, s, b), A = D.anchors(R), horiz = st.orient === 'horizontal';
    var nrm = rot([1, 0], b), o = '';
    var items = A.map(function (a) {
      var p = scr([a.x, a.y], b), tx = labelText(a.id, c, s);
      return { a: a, p: p, n: tx[0], s: tx[1], open: tx[2], w: Math.max(tx[0].length * 7.1, (tx[1] || '').length * 6.4) + 10 };
    });
    [1, -1].forEach(function (side) {
      var L = items.filter(function (i) { return i.a.side === side; });
      if (!horiz) {
        var x = VB.cx + side * 132, sp = 34;
        L.sort(function (p, q) { return p.p[1] - q.p[1]; });
        L.forEach(function (i, k) { i.y = Math.max(i.p[1] + 4, k ? L[k - 1].y + sp : 40); });
        for (var k = L.length - 1; k >= 0; k--) { var lim = k === L.length - 1 ? VB.h - 30 : L[k + 1].y - sp; if (L[k].y > lim) L[k].y = lim; }
        L.forEach(function (i, k) {
          var xm = x - side * (12 + 7 * (k % 3)), ly = i.y - 4;
          o += '<path class="lead" d="M' + r1(i.p[0]) + ' ' + r1(i.p[1]) + ' H' + r1(xm) + ' V' + r1(ly) + ' H' + r1(x - side * 5) + '"/>';
          o += '<circle cx="' + r1(i.p[0]) + '" cy="' + r1(i.p[1]) + '" r="2.3" fill="var(--blue)"/>';
          var an = side > 0 ? 'start' : 'end';
          o += '<text class="lab-n" x="' + r1(x) + '" y="' + r1(i.y) + '" text-anchor="' + an + '">' + esc(i.n) + '</text>';
          if (i.s) o += '<text class="lab-s' + (i.open ? ' open' : '') + '" x="' + r1(x) + '" y="' + r1(i.y + 13) + '" text-anchor="' + an + '">' + esc(i.s) + '</text>';
        });
      } else {
        var up = nrm[1] * side < 0;                               // this side faces up on screen
        var rows = up ? [VB.cy - 110, VB.cy - 154] : [VB.cy + 112, VB.cy + 156];
        L.sort(function (p, q) { return p.p[0] - q.p[0]; });
        var tiers = [[], []];
        L.forEach(function (i, k) { i.tier = k % 2; tiers[i.tier].push(i); });
        tiers.forEach(function (T) {
          T.forEach(function (i, k) { var x0 = i.p[0]; if (k) x0 = Math.max(x0, T[k - 1].x + T[k - 1].w / 2 + i.w / 2 + 8); i.x = Math.max(x0, 40 + i.w / 2); });
          for (var k = T.length - 1; k >= 0; k--) { var lim = k === T.length - 1 ? VB.w - 40 - T[k].w / 2 : T[k + 1].x - T[k + 1].w / 2 - T[k].w / 2 - 8; if (T[k].x > lim) T[k].x = lim; }
        });
        L.forEach(function (i) {
          var y = rows[i.tier], end = up ? y + 18 : y - 13, ym = up ? end + 8 : end - 8;
          o += '<path class="lead" d="M' + r1(i.p[0]) + ' ' + r1(i.p[1]) + ' V' + r1(ym) + ' H' + r1(i.x) + ' V' + r1(end) + '"/>';
          o += '<circle cx="' + r1(i.p[0]) + '" cy="' + r1(i.p[1]) + '" r="2.3" fill="var(--blue)"/>';
          o += '<text class="lab-n" x="' + r1(i.x) + '" y="' + r1(y) + '" text-anchor="middle">' + esc(i.n) + '</text>';
          if (i.s) o += '<text class="lab-s' + (i.open ? ' open' : '') + '" x="' + r1(i.x) + '" y="' + r1(y + 13) + '" text-anchor="middle">' + esc(i.s) + '</text>';
        });
      }
    });
    return o;
  }

  /* ---------------------------------------------------------------- draw */
  function draw() {
    setVB();
    var c = cfg(), s = cur(), inv = c.sampleKind === 'recomb' ? (s.inv || 0) : 0, ang = baseAng() + inv;
    var R = renderState(c, s, ang), L = drawLines(c, s, ang);
    var o = '<title id="svgTitle">' + esc(type().name + ' — ' + c.name + ' (' + st.view + ')') + '</title><defs>' + D.defs(NS) + '</defs>';
    o += L.lines;
    o += '<g transform="translate(' + VB.cx + ' ' + VB.cy + ') rotate(' + r1(ang) + ')">' + D.vessel(NS, R) + '</g>';
    o += L.tags;
    var hideL = Math.abs(inv) > .5;
    if (st.labels && !hideL) o += drawLabels(c, s);
    $('svg').innerHTML = o;
    $('caption').textContent = hideL && st.labels ? 'Labels hidden while the bottle is being inverted.' :
      (st.view === 'cutaway' ? 'Cutaway: section through the vessel axis — hatched = cut metal, orange dashes = cut plane. ' : 'Exterior: opaque vessel as handled. ') +
      'Drawing is representative, not a manufacturer replica.';
    panel(c, s);
    controls(c, s);
  }

  /* --------------------------------------------------------------- panel */
  function row(k, v, sub, dim) { return '<div class="r"><span class="k">' + k + '</span><span class="v' + (dim ? ' dim' : '') + '">' + v + '</span>' + (sub ? '<span class="s">' + sub + '</span>' : '') + '</div>'; }
  function panel(c, s) {
    $('panelTitle').textContent = 'Instrument panel';
    $('panelSub').textContent = type().name + ' · ' + c.name + '. Readings come only from values or models in the project.';
    $('readings').innerHTML = (s.read || []).map(function (r) {
      var v = r.v == null ? '—' : fmt(r.v) + (r.u ? ' ' + r.u : '');
      return row(esc(r.l), v, '<span class="src ' + r.src + '">' + P.SRC[r.src].toUpperCase() + '</span>' + esc(r.note || ''), r.v == null);
    }).join('') + row('Capacity', c.cap ? c.cap + ' cc' : '—', '<span class="src ' + (c.cap ? 'project' : 'none') + '">' + (c.cap ? 'PROJECT VALUE' : 'NOT DEFINED') + '</span>' + esc(c.capSrc), !c.cap);

    var ch = '', v = function (x) { return r1(x).toFixed(1) + ' cc'; };
    if (c.type === 'gas') ch = row(c.names.sample, s.gas > .01 ? 'Separator gas' : 'Empty', 'fill ' + Math.round(s.gas * 100) + ' % of final inventory (relative — no capacity in the project)');
    else if (c.sampleKind === 'recomb') {
      var free = s.gasV * (1 - (s.gone || 0));
      ch = row('Sample side', v(s.sample)) + (s.gone >= 1 ? row('· recombined fluid', v(s.sample)) : row('· free gas', s.amt > 0 ? v(free) : '—', s.amt > 0 ? r1(s.amt) + ' cc measured at 5,000 psig' : 'empty') + row('· separator oil', v(s.oil)));
      ch += row(c.names.buffer, v(s.water), 'hydraulic water');
      ch += row('Σ check', v(s.sample + s.water), '= capacity ' + c.cap + ' cc');
    } else if (c.sampleKind === 'tigas') {
      var gap = c.cap - s.sample - s.water;
      ch = row(c.names.sample, v(s.sample), s.fluid === 'gas' ? 'separator gas · ' + r1(s.amt) + ' cc at 5,000 psig equiv.' : s.fluid === 'vac' ? 'under vacuum' : 'empty');
      ch += row(c.names.buffer, v(s.water + gap), 'water ' + v(s.water) + (gap > .5 ? ' · empty gap ' + v(gap) : ''));
      ch += row('Σ check', v(s.sample + s.water + gap), '= capacity ' + c.cap + ' cc');
    } else {
      ch = row(c.names.sample, v(s.sample), s.sample > .5 ? F.oil.name : 'empty');
      ch += row(c.names.buffer, v(c.cap - s.sample), F[c.buf].name);
      ch += row('Σ check', v(c.cap), 'piston position = volume split');
    }
    $('chambers').innerHTML = ch;

    var fl = '';
    ['top', 'bot'].forEach(function (k) {
      var cp = k === 'top' ? s.capTop : s.capBot, nm = c.names[k], f = s.flow[k], lf = s.line[k];
      var stt = cp ? '<span class="st-capped">CLOSED · CAPPED</span>' : s.valves[k] ? '<span class="st-open">OPEN</span>' : '<span class="st-closed">CLOSED</span>';
      var tgt = k === 'top' ? c.names.sample : (c.names.buffer || c.names.sample);
      var sub = !f ? (cp ? 'port plugged' : !s.valves[k] ? 'no flow · valve closed' : 'no flow') :
        (f > 0 ? 'IN → ' : 'OUT ← ') + (lf ? F[lf].name.toLowerCase() : '') + (f > 0 ? ' into ' : ' from ') + tgt.toLowerCase();
      var conn = s.conn && s.conn[k] ? ' · ' + s.conn[k].t : '';
      fl += row(esc(nm), stt, esc(sub + conn));
    });
    $('flows').innerHTML = fl;
    var ph = c.phases[s.phase || 0];
    $('proc').textContent = st.mode === 'demo' && s.u > 0 && s.u < 1 && PROC[c.id] && PROC[c.id][ph.k] ? PROC[c.id][ph.k] : (st.mode === 'manual' && (s.flow.top || s.flow.bot) ? (c.sampleKind === 'tigas' ? (s.flow.bot > 0 ? 'GAS COMPRESSION by LIQUID TRANSFER' : 'GAS EXPANSION · water out') : 'LIQUID TRANSFER') : '');

    var used = {}; used[c.buf] = 1;
    if (c.sampleKind === 'oil') used.oil = 1;
    if (c.sampleKind === 'recomb') { used.oil = used.gas = used.recomb = used.water = 1; }
    if (c.sampleKind === 'tigas') { used.gas = used.vac = used.water = 1; }
    if (c.type === 'gas') used.gas = 1;
    $('legend').innerHTML = ['oil', 'gas', 'n2', 'water', 'recomb', 'vac'].map(function (k) {
      return '<div class="' + (used[k] ? '' : 'dim') + '"><i style="background:linear-gradient(180deg,' + F[k].a + ',' + F[k].b + ')' + (k === 'vac' ? ';border-color:#56637a' : '') + '"></i>' + F[k].name + '</div>';
    }).join('');
  }

  /* ------------------------------------------------------------ controls */
  function controls(c, s) {
    $('viewBadge').textContent = st.view === 'cutaway' ? 'CUTAWAY VIEW · SECTION' : 'EXTERIOR VIEW';
    $('viewBadge').className = 'badge' + (st.view === 'cutaway' ? '' : ' ext');
    $('modeBadge').textContent = st.mode === 'manual' ? 'MANUAL · DEMO PAUSED' : st.playing ? 'DEMONSTRATION · PLAYING' : 'DEMONSTRATION';
    $('modeBadge').className = 'badge mode' + (st.mode === 'manual' ? ' man' : '');
    setSeg('viewSeg', st.view); setSeg('oriSeg', st.orient);
    $('lblChk').checked = st.labels; $('lblTxt').textContent = st.labels ? 'On' : 'Off';
    $('viewNote').textContent = window.innerWidth < 600 && !st.labels ? 'Labels are off by default at phone width — turn them on, or use landscape / desktop for the labelled drawing.' : st.view === 'exterior' ? 'Exterior is opaque: chamber contents, piston and seals are shown in the cutaway and in the instrument panel.' : '';
    $('viewNote').className = 'hint';

    // valves
    var vh = '';
    ['top', 'bot'].forEach(function (k) {
      var cp = k === 'top' ? s.capTop : s.capBot, why = cp ? (c.type === 'gas' && k === 'bot' ? 'Bottom port plugged — not used in this configuration.' : 'Port capped in this step (disconnected).') : '';
      vh += '<div class="vrow"><span class="vn">' + esc(c.names[k]) + '<small>' + (why || (k === 'top' ? 'top · ' + c.names.sample.toLowerCase() : 'bottom · ' + (c.names.buffer || 'plugged port').toLowerCase())) + '</small></span>' +
        '<label class="sw"><input type="checkbox" data-valve="' + k + '"' + (s.valves[k] ? ' checked' : '') + (cp ? ' disabled' : '') + ' aria-label="' + esc(c.names[k]) + '"><span></span><em>' + (cp ? 'CAPPED' : s.valves[k] ? 'OPEN' : 'CLOSED') + '</em></label></div>';
    });
    var vl = $('valveList');
    if (vl.getAttribute('data-h') !== vh) { vl.innerHTML = vh; vl.setAttribute('data-h', vh); }

    // sample-volume slider
    var sl = c.slider, rg = $('volRange'), why = sliderWhy(c, s);
    var mn = sl.min != null ? sl.min : 0, mx = sl.max != null ? sl.max : (c.cap || 1);
    if (sl.gasOnly && s.amt > 0) mn = Math.max(mn, Math.ceil(s.amt));      // never above the 5,000 psig reference point
    rg.min = mn; rg.max = mx; rg.step = c.cap > 400 ? 1 : .5;
    if (document.activeElement !== rg) rg.value = s.sample != null ? s.sample : 0;
    rg.disabled = !!why;
    $('volOut').textContent = c.type === 'gas' ? 'fixed' : r1(s.sample).toFixed(1) + ' cc';
    var hint = why || (sl.gasOnly ? 'Drag to move the piston with the water pump: gas side volume ' + mn + '–' + mx + ' cc; pressure from the project P·Vⁿ model.' :
      'Drag to move the piston: sample-side volume. Both chambers stay full, so the buffer side changes by the same volume.');
    if (st.msg) hint = st.msg;
    $('volHint').textContent = hint;
    $('volHint').className = 'hint' + (why || st.msg ? ' why' : '');

    // orientation note for the recombination inversion
    $('oriSeg').querySelectorAll('button').forEach(function (b) { b.disabled = false; });

    // transport
    $('playBtn').textContent = st.playing ? 'Pause' : (st.t >= c.T && st.mode === 'demo' ? 'Play again' : 'Play');
    var tt = st.mode === 'manual' ? st.t : st.t;
    $('clock').textContent = mmss(tt) + ' / ' + mmss(c.T);
    $('progBar').style.width = (100 * clamp(st.t / c.T, 0, 1)) + '%';
    var ph = c.phases[s.phase || 0];
    $('stepName').textContent = st.mode === 'manual' ? 'Manual' : (s.phase + 1) + ' / ' + c.phases.length + ' · ' + ph.name;
    $('stepDesc').textContent = st.mode === 'manual' ? 'Valves and volume are under your control. The demonstration is paused — Reset or Replay to return to it.' : ph.desc;
    var chips = $('chips').children;
    for (var i = 0; i < c.phases.length; i++) if (chips[i]) chips[i].className = 'chip grp-' + c.phases[i].grp + (st.mode === 'demo' && i === s.phase ? ' on' : (st.t >= c.phases[i].t0 + c.phases[i].d ? ' done' : ''));
  }
  function sliderWhy(c, s) {
    var sl = c.slider;
    if (!sl.on) return sl.why;
    var cl = function (k) { return c.names[k] + (k === 'top' ? '' : ''); };
    var need = (sl.needs || []).filter(function (k) { return !s.valves[k]; });
    if (need.length) return 'Open the ' + need.map(cl).join(' and the ') + ' to move the piston — liquid cannot pass a closed valve.';
    var shut = (sl.closed || []).filter(function (k) { return s.valves[k]; });
    if (shut.length) return 'Close the ' + shut.map(cl).join(' and ') + ': with the gas side open the gas destination and pressure are not defined.';
    if (sl.gasOnly) {
      if (!(s.amt > 0) || s.fluid !== 'gas') return 'No gas in the cylinder yet — the project defines the piston movement only once gas has been boosted in.';
      if (c.cap - s.sample - s.water > .5) return 'Empty gap on the hydraulic side — not defined for manual movement.';
    }
    return '';
  }
  function setSeg(id, v) { $(id).querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); }); }
  function mmss(t) { t = Math.max(0, t); var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  /* --------------------------------------------------------------- build */
  function buildTypes() {
    $('typeList').innerHTML = P.TYPES.map(function (t) {
      var c0 = P.CONFIGS[t.configs[0]], s0 = P.stateAt(c0, 0), ns = 'th' + t.id;
      var R = { geom: t.geom, view: 'exterior', cap: c0.cap || 1, sample: 0, valves: { top: false, bot: false }, flow: { top: 0, bot: 0 },
        line: { top: null, bot: null }, capTop: false, capBot: c0.type === 'gas', plate: null, t: 0, motion: false, g: [0, 1], portFluid: {} };
      var g = D.GEOM[t.geom];
      return '<button type="button" class="tcard" role="radio" data-type="' + t.id + '" aria-checked="false">' +
        '<svg viewBox="' + (-60) + ' ' + r1(g.conn - 6) + ' 120 ' + r1(-2 * g.conn + 12) + '" aria-hidden="true"><defs>' + D.defs(ns) + '</defs>' + D.vessel(ns, R) + '</svg>' +
        '<span><b>' + esc(t.name) + '</b><small>' + esc(t.tag) + ' · ' + t.configs.length + ' configuration' + (t.configs.length > 1 ? 's' : '') + '</small></span></button>';
    }).join('');
  }
  function buildCfgs() {
    var t = type();
    $('cfgList').innerHTML = t.configs.map(function (id) {
      var c = P.CONFIGS[id];
      return '<button type="button" class="ccard" role="radio" data-cfg="' + id + '" aria-checked="' + (id === st.cfg) + '">' + esc(c.name) + '<small>' + esc(c.sub) + '</small></button>';
    }).join('');
    $('typeAbout').textContent = t.about;
    $('typeList').querySelectorAll('.tcard').forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('data-type') === st.type ? 'true' : 'false'); });
  }
  function buildChips() {
    var c = cfg(), h = c.phases.map(function (p, i) {
      return '<button type="button" class="chip grp-' + p.grp + '" data-ph="' + i + '" title="' + esc(GRP[p.grp] + ': ' + p.desc) + '">' + (i + 1) + ' ' + esc(p.name) + '</button>';
    }).join('');
    if (c.noFill) h += '<span class="chip na" tabindex="0" title="' + esc(c.noFill) + '">Fill — not in this configuration</span>';
    if (c.noDischarge) h += '<span class="chip na" tabindex="0" title="' + esc(c.noDischarge) + '">Discharge — not defined</span>';
    $('chips').innerHTML = h;
    var na = [c.noFill, c.noDischarge].filter(Boolean).join(' ');
    $('chips').setAttribute('data-na', na);
  }

  /* ---------------------------------------------------------------- loop */
  function stop() { if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; }
  function loop(ts) {
    st.raf = 0;
    var dt = st.last ? Math.min(.1, (ts - st.last) / 1000) : 0; st.last = ts;
    var c = cfg();
    if (st.playing) { st.t += dt; if (st.t >= c.T) { st.t = c.T; st.playing = false; } }
    if (st.mode === 'manual' && st.man && performance.now() > st.flowUntil) { st.man.flow = { top: 0, bot: 0 }; }
    draw();
    var anim = st.playing || (st.mode === 'manual' && performance.now() <= st.flowUntil) || (!mqReduce.matches && hasMotion());
    if (anim) st.raf = requestAnimationFrame(loop); else st.last = 0;
  }
  function hasMotion() {                    // keep gas dots alive while paused only if something is visibly flowing
    var s = cur(); return st.mode === 'manual' && !!(s.flow.top || s.flow.bot);
  }
  function kick() { if (!st.raf) { st.last = 0; st.raf = requestAnimationFrame(loop); } }

  function select(typeId, cfgId) {
    stop();
    st.type = typeId; st.cfg = cfgId || P.TYPES.filter(function (t) { return t.id === typeId; })[0].configs[0];
    st.t = 0; st.playing = false; st.mode = 'demo'; st.man = null; st.msg = '';
    buildCfgs(); buildChips(); $('valveList').removeAttribute('data-h'); draw();
  }
  function toManual() {
    if (st.mode === 'manual') return;
    st.man = P.clone(P.stateAt(cfg(), st.t)); st.man.flow = { top: 0, bot: 0 };
    st.mode = 'manual'; st.playing = false;
  }

  /* -------------------------------------------------------------- events */
  $('typeList').addEventListener('click', function (e) { var b = e.target.closest('.tcard'); if (b) select(b.getAttribute('data-type')); });
  $('cfgList').addEventListener('click', function (e) { var b = e.target.closest('.ccard'); if (b) select(st.type, b.getAttribute('data-cfg')); });
  $('viewSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { st.view = b.getAttribute('data-v'); draw(); } });
  $('oriSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b && !b.disabled) { st.orient = b.getAttribute('data-v'); draw(); } });
  $('lblChk').addEventListener('change', function () { st.labels = this.checked; draw(); });
  $('valveList').addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-valve'); if (!k) return;
    toManual(); st.man.valves[k] = e.target.checked; st.man.flow[k] = 0; st.msg = '';
    st.man.read = manualReads(cfg(), st.man); draw();
  });
  $('volRange').addEventListener('input', function () {
    var c = cfg();
    if (sliderWhy(c, cur())) { draw(); return; }
    toManual();
    var s = st.man;
    var nv = clamp(+this.value, +this.min, +this.max), dv = nv - s.sample;
    if (Math.abs(dv) < 1e-6) return;
    if (dv < 0 && c.slider.down === false) { st.msg = c.slider.downWhy; this.value = s.sample; draw(); return; }
    st.msg = '';
    if (c.sampleKind === 'tigas') {
      s.sample = nv; s.water = c.cap - nv;
      s.flow = { top: 0, bot: dv < 0 ? 1 : -1 }; s.line.bot = 'water';
    } else {
      s.sample = nv;
      s.flow = { top: dv > 0 ? 1 : -1, bot: dv > 0 ? -1 : 1 };
      s.line.top = 'oil'; s.line.bot = c.buf;
    }
    s.read = manualReads(c, s);
    st.flowUntil = performance.now() + 700; draw(); kick();
  });
  function manualReads(c, s) {
    if (c.sampleKind === 'tigas' && s.fluid === 'gas' && s.amt > 0) {
      var p = P.pCharge(s.amt, s.sample), out = p < 999.5 || p > 5000.5;
      return [{ l: 'Cylinder pressure', v: Math.round(p), u: 'psig', src: 'model', note: out ? 'outside the project’s 1,000–5,000 psig reference points — extrapolated' : 'gas amount held constant' },
        { l: 'Temperature', v: 22, u: '°C', src: 'project', note: '' }];
    }
    var keep = (s.read || []).filter(function (r) { return /temp/i.test(r.l); });
    return [{ l: 'Bottle pressure', v: null, u: '', src: 'none', note: 'manual mode — pressure is not inferred from volume' }].concat(keep);
  }
  $('playBtn').addEventListener('click', function () {
    var c = cfg();
    if (st.mode === 'manual') { st.mode = 'demo'; st.man = null; st.msg = ''; }
    if (st.playing) st.playing = false;
    else { if (st.t >= c.T) st.t = 0; st.playing = true; }
    draw(); kick();
  });
  $('resetBtn').addEventListener('click', function () { stop(); st.t = 0; st.playing = false; st.mode = 'demo'; st.man = null; st.msg = ''; draw(); });
  $('replayBtn').addEventListener('click', function () { stop(); st.t = 0; st.mode = 'demo'; st.man = null; st.msg = ''; st.playing = true; draw(); kick(); });
  $('chips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ph]'); if (!b) return;
    var c = cfg(), i = +b.getAttribute('data-ph');
    st.mode = 'demo'; st.man = null; st.msg = ''; st.t = c.phases[i].t0 + .001; draw(); kick();
  });
  $('prog').addEventListener('click', function (e) {
    var r = this.getBoundingClientRect(), c = cfg();
    st.mode = 'demo'; st.man = null; st.msg = ''; st.t = clamp((e.clientX - r.left) / r.width, 0, 1) * c.T; draw(); kick();
  });
  $('themeBtn').addEventListener('click', function () {
    var h = document.documentElement, l = h.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    h.setAttribute('data-theme', l); this.textContent = l === 'light' ? 'Dark theme' : 'Light theme';
    try { localStorage.setItem('pbTheme', l); } catch (e) {}
  });
  if (document.documentElement.getAttribute('data-theme') === 'light') $('themeBtn').textContent = 'Dark theme';
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', function () { draw(); });

  // test hook for screenshots / review: ?type=ti&cfg=ti&t=40&view=exterior&orient=horizontal
  var q = new URLSearchParams(location.search);
  buildTypes();
  var qc = q.get('cfg'), qt = q.get('type');
  if (qc && P.CONFIGS[qc]) qt = P.CONFIGS[qc].type;
  select(qt && P.TYPES.some(function (t) { return t.id === qt; }) ? qt : 'piston', qc && P.CONFIGS[qc] ? qc : null);
  if (q.get('view')) st.view = q.get('view') === 'exterior' ? 'exterior' : 'cutaway';
  if (q.get('orient')) st.orient = q.get('orient') === 'horizontal' ? 'horizontal' : 'upright';
  if (q.get('labels') === '0' || (window.innerWidth < 600 && q.get('labels') !== '1')) st.labels = false;   // labels unreadable at phone width
  if (q.get('t')) st.t = clamp(+q.get('t') || 0, 0, cfg().T);
  draw();
  window.PBApp = { st: st, draw: draw, select: select };
})();
