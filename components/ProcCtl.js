/* ============================================================================
   ProcCtl — shared procedure control for every process module (2026-09-29)

   1. PCLK  : one pausable process clock. Process timers / tweens use it instead
              of setTimeout / setInterval / requestAnimationFrame / Date.now, so
              Pause freezes every timer, tween and delayed action together and
              Resume continues from the exact paused instant. advance() runs the
              same timers instantly (virtual time) - used to initialise a stage
              from the procedure's own actions (no values are invented).
   2. Freeze: while a procedure is paused, CSS animations and running CSS
              transitions inside the page are frozen too (flow dashes, pistons,
              agitation, bubbles ...), and SVG SMIL animations are paused.
   3. Panel : ONE procedure-control widget (stage k / N, status, title, progress,
              Previous / Restart Stage / Next, Explain this stage, Run / Pause /
              Resume, Reset). Pages place <div class="pc-host" data-pc="..."> and
              the widget binds to the module's pcInfo() / pcAct().
   Layout variants: data-pc-layout="side" (stacked, side panels) or "bar"
   (one row, bottom action bars). Same elements, order, sizes and labels.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ PCLK */
  var perf = function () { return performance.now(); };
  var C = { base: 1000, anchor: perf(), paused: false, sim: false, seq: 1, timers: new Map(), rafs: [], realRaf: 0 };
  function now() { return (C.paused || C.sim) ? C.base : C.base + (perf() - C.anchor); }
  function arm(t) {
    if (C.paused || C.sim) return;
    if (t.h) clearTimeout(t.h);
    t.h = setTimeout(function () { fire(t); }, Math.max(0, t.due - now()));
  }
  function fire(t) {
    t.h = null;
    if (!C.timers.has(t.id)) return;
    if (C.paused || C.sim) return;
    if (now() < t.due - 0.5) { arm(t); return; }
    run(t);
  }
  function run(t) {
    if (t.iv) { t.due += t.iv; if (!C.sim) arm(t); }
    else C.timers.delete(t.id);
    try { t.fn(); } catch (e) { console.error(e); }
  }
  function addTimer(fn, ms, iv) {
    var t = { id: C.seq++, due: now() + Math.max(0, +ms || 0), fn: fn, iv: iv ? Math.max(4, +ms || 4) : 0, h: null };
    C.timers.set(t.id, t); arm(t);
    return t.id;
  }
  function clearTimer(id) {
    var t = C.timers.get(id);
    if (!t) return;
    if (t.h) clearTimeout(t.h);
    C.timers.delete(id);
  }
  function drive() {
    C.realRaf = 0;
    if (C.paused || C.sim) return;
    var list = C.rafs; C.rafs = [];
    var ts = now();
    list.forEach(function (r) { try { r.cb(ts); } catch (e) { console.error(e); } });
    if (C.rafs.length && !C.paused && !C.realRaf) C.realRaf = requestAnimationFrame(drive);
  }
  function kickRaf() { if (!C.realRaf && !C.paused && !C.sim && C.rafs.length) C.realRaf = requestAnimationFrame(drive); }

  var PCLK = {
    now: now,
    setTimeout: function (fn, ms) { return addTimer(fn, ms, false); },
    clearTimeout: clearTimer,
    setInterval: function (fn, ms) { return addTimer(fn, ms, true); },
    clearInterval: clearTimer,
    raf: function (cb) { var id = C.seq++; C.rafs.push({ id: id, cb: cb }); kickRaf(); return id; },
    cancelRaf: function (id) { C.rafs = C.rafs.filter(function (r) { return r.id !== id; }); },
    paused: function () { return C.paused; },
    busy: function () { return C.timers.size > 0 || C.rafs.length > 0; },
    pause: function () {
      if (C.paused) return;
      C.base = now(); C.paused = true;
      C.timers.forEach(function (t) { if (t.h) { clearTimeout(t.h); t.h = null; } });
      if (C.realRaf) { cancelAnimationFrame(C.realRaf); C.realRaf = 0; }
    },
    resume: function () {
      if (!C.paused) return;
      C.anchor = perf(); C.paused = false;
      C.timers.forEach(arm);
      kickRaf();
    },
    /* cancel every pending process action (navigation / reset safety net) */
    clearAll: function () {
      C.timers.forEach(function (t) { if (t.h) clearTimeout(t.h); });
      C.timers.clear(); C.rafs = [];
      if (C.realRaf) { cancelAnimationFrame(C.realRaf); C.realRaf = 0; }
    },
    /* run the pending timers / frames instantly in virtual time.
       stop(): optional predicate checked between events; maxMs caps the virtual span. */
    advance: function (maxMs, stop) {
      var wasPaused = C.paused;
      C.base = now(); C.sim = true;
      C.timers.forEach(function (t) { if (t.h) { clearTimeout(t.h); t.h = null; } });
      if (C.realRaf) { cancelAnimationFrame(C.realRaf); C.realRaf = 0; }
      var end = C.base + (maxMs == null ? 36e5 : maxMs), guard = 0, t0 = perf(), hit = false;
      try {
        for (;;) {
          if (stop && stop()) { hit = true; break; }
          if (++guard > 400000 || perf() - t0 > 4000) break;
          var nt = null;
          C.timers.forEach(function (t) { if (!nt || t.due < nt.due) nt = t; });
          var tr = C.rafs.length ? C.base + 16 : Infinity, tt = nt ? nt.due : Infinity;
          var nx = Math.min(tr, tt);
          if (nx === Infinity) break;
          if (nx > end) { C.base = end; break; }
          if (tr <= tt) {
            C.base = tr;
            var list = C.rafs; C.rafs = [];
            list.forEach(function (r) { try { r.cb(C.base); } catch (e) { console.error(e); } });
          } else {
            C.base = Math.max(C.base, tt);
            run(nt);
          }
        }
      } finally {
        C.sim = false;
        C.anchor = perf();
        C.paused = wasPaused;
        if (!C.paused) { C.timers.forEach(arm); kickRaf(); }
      }
      return hit;
    },
    /* run everything that is pending to completion (a whole stage, instantly) */
    flush: function (stop) { return PCLK.advance(36e5, stop); }
  };
  global.PCLK = PCLK;

  /* ------------------------------------------------------ freeze (CSS/SMIL) */
  var frozen = false, frozenAnims = [];
  function inApp(el) { try { var a = document.getElementById('app'); return !!(a && el && a.contains(el)); } catch (e) { return false; } }
  function freeze(on) {
    on = !!on;
    if (on === frozen) return;
    frozen = on;
    document.documentElement.classList.toggle('pc-paused', on);
    try {
      if (on) {
        frozenAnims = (document.getAnimations ? document.getAnimations() : []).filter(function (a) {
          return a.playState === 'running' && typeof CSSTransition !== 'undefined' && a instanceof CSSTransition && a.effect && inApp(a.effect.target);
        });
        frozenAnims.forEach(function (a) { try { a.pause(); } catch (e) {} });
      } else {
        frozenAnims.forEach(function (a) { try { if (a.playState === 'paused') a.play(); } catch (e) {} });
        frozenAnims = [];
      }
      [].forEach.call(document.querySelectorAll('#app svg'), function (s) {
        try { if (on) s.pauseAnimations(); else s.unpauseAnimations(); } catch (e) {}
      });
    } catch (e) {}
  }
  /* after a jump (restart / previous / next) the new stage state is shown directly,
     without CSS transitions replaying the jump */
  function noJump() {
    var h = document.documentElement;
    h.classList.add('pc-seek');
    requestAnimationFrame(function () { requestAnimationFrame(function () { h.classList.remove('pc-seek'); }); });
  }

  /* ------------------------------------------------ live component registry */
  var LIVE = Object.create(null);
  function hookDC() {
    if (!global.DC || global.DC.__pcHooked) return;
    var _define = global.DC.define.bind(global.DC);
    global.DC.define = function (name, def) {
      try {
        var P = def.logic.prototype;
        var dm = P.componentDidMount, wu = P.componentWillUnmount;
        P.componentDidMount = function () { LIVE[name] = this; if (dm) dm.call(this); };
        P.componentWillUnmount = function () { if (LIVE[name] === this) delete LIVE[name]; if (wu) wu.call(this); };
      } catch (e) {}
      return _define(name, def);
    };
    global.DC.__pcHooked = true;
  }
  hookDC();

  function target(spec) {
    var i = spec.indexOf(':'), comp = i < 0 ? spec : spec.slice(0, i), arg = i < 0 ? undefined : spec.slice(i + 1);
    var o = LIVE[comp] || global[comp];
    if (!o || typeof o.pcInfo !== 'function') return null;
    return { o: o, arg: arg };
  }

  /* ----------------------------------------------------------------- widget */
  var ICON = {
    prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l3 2"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5" stroke-linecap="round"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5v14l8-7zM12 5v14l8-7z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  var CSS =
    'html.pc-paused #app *,html.pc-paused #app *::before,html.pc-paused #app *::after{animation-play-state:paused !important;}' +
    'html.pc-seek #app *{transition:none !important;}' +
    '.pc-host{min-width:0;}' +
    '.pc{--pc-h:34px;font-family:inherit;color:var(--txt);min-width:0;box-sizing:border-box;}' +
    '.pc *{box-sizing:border-box;}' +
    '.pc-card{background:var(--panel);border:1px solid var(--line2);border-radius:10px;padding:9px 11px;display:flex;flex-direction:column;gap:5px;min-width:0;}' +
    '.pc-hd{display:flex;align-items:center;gap:8px;min-width:0;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:9.5px;letter-spacing:.8px;}' +
    '.pc-k{color:var(--mut);white-space:nowrap;}' +
    '.pc-st{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-weight:700;white-space:nowrap;}' +
    '.pc-st i{width:7px;height:7px;border-radius:50%;background:currentColor;display:inline-block;}' +
    '.pc-st.running i{animation:pcBlink 1.1s ease-in-out infinite;}' +
    'html.pc-paused .pc-st.running i{animation-play-state:running !important;}' +
    '@keyframes pcBlink{50%{opacity:.25}}' +
    '.pc-st.ready{color:var(--mut);} .pc-st.running{color:var(--blue);} .pc-st.paused{color:var(--amb);} .pc-st.complete{color:var(--grn);}' +
    '.pc-tt{font-size:13px;font-weight:700;line-height:1.25;color:var(--txt);min-width:0;}' +
    '.pc-q{font-size:11.5px;line-height:1.4;color:var(--txt2);min-width:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}' +
    '.pc-seg{display:flex;gap:2px;height:5px;min-width:0;}' +
    '.pc-seg b{flex:1 1 0;min-width:1px;border-radius:2px;background:var(--line2);position:relative;overflow:hidden;}' +
    '.pc-seg b.d{background:var(--grn);}' +
    '.pc-seg b i{position:absolute;left:0;top:0;bottom:0;background:var(--blue);width:0;}' +
    '.pc-seg b.c{background:rgba(77,157,255,.22);}' +
    '.pc-nav{display:flex;gap:6px;min-width:0;}' +
    '.pc-b{height:var(--pc-h);border-radius:9px;border:1px solid var(--line2);background:var(--panel);color:var(--txt2);font-family:inherit;font-size:12px;font-weight:600;' +
      'cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 11px;white-space:nowrap;min-width:0;flex:0 0 auto;transition:border-color .15s,background .15s,filter .15s;}' +
    '.pc-b svg{width:13px;height:13px;flex:0 0 auto;}' +
    '.pc-b:hover:not(:disabled){border-color:var(--blue);color:var(--txt);}' +
    '.pc-b:disabled{opacity:.42;cursor:not-allowed;}' +
    '.pc-b.nav{font-weight:500;font-size:11.5px;padding:0 9px;}' +
    '.pc-b.pri{background:linear-gradient(180deg,#46d39a,#2f9d72);border-color:#2f9d72;color:#06231a;min-width:150px;}' +
    '.pc-b.pri.pause{background:linear-gradient(180deg,#f2c46a,#d99b2b);border-color:#c98a1d;color:#2a1a00;}' +
    '.pc-b.pri:hover:not(:disabled){filter:brightness(1.06);color:#06231a;border-color:#2f9d72;}' +
    '.pc-b.pri.pause:hover:not(:disabled){color:#2a1a00;border-color:#c98a1d;}' +
    '.pc-b.exp{color:var(--blue);border-color:rgba(77,157,255,.45);background:rgba(77,157,255,.07);}' +
    '.pc-b.exp.on{background:rgba(77,157,255,.16);border-color:var(--blue);}' +
    '.pc-b.rst{font-weight:500;}' +
    /* side layout (stacked, like the Recombination panel) */
    '.pc.side{display:flex;flex-direction:column;gap:7px;}' +
    '.pc.side .pc-nav .pc-b{flex:1 1 0;padding:0 6px;}' +
    '.pc.side .pc-b.exp{width:100%;}' +
    '.pc.side .pc-acts{display:flex;flex-direction:column;gap:6px;}' +
    '.pc.side .pc-acts .pc-b{width:100%;}' +
    /* bar layout (one row, bottom action bars) */
    '.pc.bar{display:flex;align-items:center;gap:8px;min-width:0;container-type:inline-size;}' +
    '.pc.bar .pc-card{flex:1 1 300px;min-width:230px;padding:5px 10px 6px;gap:2px;justify-content:center;}' +
    '.pc.bar .pc-tt{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.pc.bar .pc-seg{height:4px;margin-top:2px;}' +
    '.pc.bar .pc-q{display:none;}' +
    '.pc.bar .pc-acts{display:flex;gap:6px;flex:0 0 auto;}' +
    '.pc.bar .pc-nav{flex:0 0 auto;}' +
    '@container (max-width:1180px){.pc.bar .pc-b.nav span{display:none;}.pc.bar .pc-b.nav{padding:0 9px;}.pc.bar .pc-card{flex-basis:220px;min-width:190px;}}' +
    '@container (max-width:900px){.pc.bar .pc-b.exp span,.pc.bar .pc-b.rst span.l{display:none;}.pc.bar .pc-b.pri{min-width:0;}}' +
    '@media (max-height:780px){.pc.side{gap:5px;}.pc.side .pc-card{padding:7px 9px;}.pc.side .pc-q{-webkit-line-clamp:2;}}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'; }); }

  function build(host) {
    var side = (host.getAttribute('data-pc-layout') || 'side') === 'side';
    var w = document.createElement('div');
    w.className = 'pc ' + (side ? 'side' : 'bar');
    var card = '<div class="pc-card"><div class="pc-hd"><span class="pc-k" data-r="k"></span><span class="pc-st" data-r="st"><i></i><em data-r="stt" style="font-style:normal"></em></span></div>' +
      '<div class="pc-tt" data-r="tt"></div><div class="pc-q" data-r="q"></div><div class="pc-seg" data-r="seg"></div></div>';
    var nav = '<div class="pc-nav">' +
      '<button type="button" class="pc-b nav" data-a="prev" title="Previous stage">' + ICON.prev + '<span>Previous</span></button>' +
      '<button type="button" class="pc-b nav" data-a="restart" title="Restart the current stage from its starting state">' + ICON.restart + '<span data-r="rsl">Restart Stage</span></button>' +
      '<button type="button" class="pc-b nav" data-a="next" title="Next stage">' + '<span>Next</span>' + ICON.next + '</button></div>';
    var exp = '<button type="button" class="pc-b exp" data-a="explain" title="Explain this stage">' + ICON.info + '<span>Explain This Stage</span></button>';
    var acts = '<div class="pc-acts"><button type="button" class="pc-b pri" data-a="primary"></button>' +
      '<button type="button" class="pc-b" data-a="runAll" style="display:none"></button>' +
      '<button type="button" class="pc-b rst" data-a="reset"></button></div>';
    w.innerHTML = side ? card + nav + exp + acts : card + nav + exp + acts;
    host.innerHTML = '';
    host.appendChild(w);
    var W = { host: host, root: w, el: {}, cache: {}, spec: host.getAttribute('data-pc') };
    [].forEach.call(w.querySelectorAll('[data-r]'), function (n) { W.el[n.getAttribute('data-r')] = n; });
    [].forEach.call(w.querySelectorAll('[data-a]'), function (n) {
      W.el['b_' + n.getAttribute('data-a')] = n;
      n.addEventListener('click', function (ev) { ev.preventDefault(); click(W, n.getAttribute('data-a')); });
    });
    host.__pc = W;
    return W;
  }
  function setT(W, k, v) { var n = W.el[k]; if (n && W.cache[k] !== v) { n.textContent = v; W.cache[k] = v; } }
  function setH(W, k, v) { var n = W.el[k]; if (n && W.cache['h' + k] !== v) { n.innerHTML = v; W.cache['h' + k] = v; } }
  function setD(W, k, dis) { var n = W.el[k]; if (n && n.disabled !== !!dis) n.disabled = !!dis; }

  var STT = { ready: 'READY', running: 'RUNNING', paused: 'PAUSED', complete: 'COMPLETE' };
  function primaryOf(inf) {
    var s = inf.status, u = inf.unit || 'Stage', k1 = inf.k + 1;
    if (s === 'running') return { a: 'pause', h: ICON.pause + 'Pause', cls: 'pause', dis: inf.canPause === false };
    if (s === 'paused') return { a: 'resume', h: ICON.play + 'Resume ' + u + ' ' + k1 };
    if (s === 'complete') {
      if (!inf.allDone && inf.k < inf.N - 1) return { a: 'runNext', h: ICON.arrow + 'Run ' + u + ' ' + (k1 + 1) };
      if (inf.again) return { a: 'again', h: ICON.restart + inf.again };
      return { a: '', h: 'Procedure Complete', dis: true };
    }
    return { a: 'run', h: ICON.play + (inf.runLabel || ('Run ' + u + ' ' + k1)), dis: inf.canRun === false };
  }
  function explainOpen() { return document.documentElement.classList.contains('sg-open') || !!(document.getElementById('sgWrap') && document.getElementById('sgWrap').classList.contains('open')); }

  function update(W) {
    var t = target(W.spec);
    if (!t) { W.root.style.visibility = 'hidden'; return null; }
    var inf;
    try { inf = t.o.pcInfo(t.arg); } catch (e) { console.error(e); inf = null; }
    if (!inf) { W.root.style.visibility = 'hidden'; return null; }
    W.root.style.visibility = '';
    W.inf = inf;
    var u = inf.unit || 'Stage';
    setT(W, 'k', u.toUpperCase() + ' ' + (inf.k + 1) + ' / ' + inf.N);
    var st = inf.status;
    if (W.el.st.className !== 'pc-st ' + st) W.el.st.className = 'pc-st ' + st;
    setT(W, 'stt', STT[st] || '');
    setT(W, 'tt', inf.title || '');
    if (W.el.tt.title !== (inf.q || '')) W.el.tt.title = inf.q || '';
    setT(W, 'q', inf.q || '');
    /* segmented progress: completed stages green, current stage filled by its own progress */
    var segKey = inf.N + '|' + inf.k + '|' + (inf.doneMask ? inf.doneMask.join('') : '') + '|' + st;
    if (W.cache.segKey !== segKey) {
      W.cache.segKey = segKey;
      var h = '';
      for (var i = 0; i < inf.N; i++) {
        var d = inf.doneMask ? !!inf.doneMask[i] : i < inf.k || (i === inf.k && st === 'complete');
        if (i === inf.k && st === 'complete') d = true;
        h += '<b class="' + (d ? 'd' : i === inf.k ? 'c' : '') + '">' + (i === inf.k && !d ? '<i></i>' : '') + '</b>';
      }
      W.el.seg.innerHTML = h;
    }
    var fi = W.el.seg.querySelector('b.c i');
    if (fi) {
      var f = inf.frac == null ? (st === 'running' || st === 'paused' ? 0.5 : 0) : Math.max(0, Math.min(1, inf.frac));
      var fw = (f * 100).toFixed(1) + '%';
      if (fi.style.width !== fw) fi.style.width = fw;
      fi.style.background = st === 'paused' ? 'var(--amb)' : 'var(--blue)';
    }
    setT(W, 'rsl', 'Restart ' + u);
    if (W.el.b_prev.title !== 'Previous ' + u.toLowerCase()) { W.el.b_prev.title = 'Previous ' + u.toLowerCase(); W.el.b_next.title = 'Next ' + u.toLowerCase(); W.el.b_restart.title = 'Restart the current ' + u.toLowerCase() + ' from its starting state'; }
    setD(W, 'b_prev', !inf.canPrev);
    setD(W, 'b_next', !inf.canNext);
    setD(W, 'b_restart', !inf.canRestart);
    var p = primaryOf(inf);
    W.pa = p.a;
    setH(W, 'b_primary', p.h);
    var pc = 'pc-b pri' + (p.cls ? ' ' + p.cls : '');
    if (W.el.b_primary.className !== pc) W.el.b_primary.className = pc;
    setD(W, 'b_primary', !!p.dis);
    var ra = W.el.b_runAll;
    if (inf.runAll) {
      ra.style.display = '';
      setH(W, 'b_runAll', ICON.auto + esc(inf.runAll));
      setD(W, 'b_runAll', inf.runAllDisabled || st === 'running' || st === 'paused' && !inf.runAllWhilePaused);
    } else ra.style.display = 'none';
    var rs = W.el.b_reset;
    if (inf.reset) {
      rs.style.display = '';
      /* one label everywhere; the tooltip names the procedure (Restart = current stage only) */
      setH(W, 'b_reset', ICON.reset + '<span class="l">Reset All</span>');
      rs.title = inf.resetTitle || ('Reset the entire procedure (' + inf.reset.replace(/^Reset /, '') + ') to its initial state');
      setD(W, 'b_reset', !!inf.resetDisabled);
    } else rs.style.display = 'none';
    var eo = explainOpen();
    var ec = 'pc-b exp' + (eo ? ' on' : '');
    if (W.el.b_explain.className !== ec) W.el.b_explain.className = ec;
    return inf;
  }

  var busyClick = false;
  function click(W, a) {
    if (busyClick) return;
    if (a === 'explain') {
      /* same drawer and content as the former top-bar "Explain Current Step" button;
         never touches the process (no pause / resume / reset) */
      if (global.__SG && global.__SG.toggle) global.__SG.toggle(!explainOpen());
      update(W);
      return;
    }
    if (a === 'primary') a = W.pa;
    if (!a) return;
    var t = target(W.spec);
    if (!t) return;
    var el = W.el['b_' + (a === 'pause' || a === 'resume' || a === 'run' || a === 'runNext' || a === 'again' ? 'primary' : a)];
    if (el && el.disabled) return;
    busyClick = true;
    try {
      var jump = a === 'restart' || a === 'prev' || a === 'next' || a === 'reset' || a === 'again';
      if (jump) noJump();
      t.o.pcAct(a, t.arg);
    } catch (e) { console.error(e); }
    finally { busyClick = false; }
    tick();
  }

  var widgets = [];
  /* hold (Bottle Details overlay): pause every running procedure through its own Pause action, so its
     panel shows Resume and the user resumes it; keep animations frozen while the overlay is open.
     A running timeline without a pausable panel is paused on the clock and resumed on release. */
  /* restore (Cell Details): on release, resume what the hold paused, so the previous playback state returns */
  var holdOn = false, holdClock = false, holdRestore = false, holdPaused = [];
  function hold(on, restore) {
    on = !!on;
    if (on === holdOn) return;
    holdOn = on;
    if (on) {
      var done = false;
      holdRestore = !!restore; holdPaused = [];
      [].forEach.call(document.querySelectorAll('.pc-host[data-pc]'), function (h) {
        var W = h.__pc, inf = W && update(W);
        if (inf && inf.status === 'running' && inf.canPause !== false) { click(W, 'pause'); done = true; holdPaused.push(W); }
      });
      if (!done && !PCLK.paused() && PCLK.busy()) { PCLK.pause(); holdClock = true; }
    } else {
      if (holdClock) { holdClock = false; PCLK.resume(); }
      if (holdRestore) holdPaused.forEach(function (W) { var inf = W.root.isConnected && update(W); if (inf && inf.status === 'paused') click(W, 'resume'); });
      holdRestore = false; holdPaused = [];
    }
    tick();
  }
  function tick() {
    var hosts = document.querySelectorAll('.pc-host[data-pc]');
    var anyPaused = false, anyHost = false;
    [].forEach.call(hosts, function (h) {
      var W = h.__pc;
      if (!W || W.root.parentNode !== h || W.spec !== h.getAttribute('data-pc')) W = build(h);
      var inf = update(W);
      if (inf) { if (!anyHost) global.__PC_STATUS = inf.status; anyHost = true; if (inf.status === 'paused' || (inf.status === 'ready' && inf.frozen)) anyPaused = true; }
    });
    if (PCLK.paused() && !anyHost && !holdOn) PCLK.resume();   // no procedure on screen: never leave the clock paused
    freeze(holdOn || anyPaused || (anyHost && PCLK.paused()));
    global.__PC_HAS_PANEL = anyHost;
    if (!anyHost) global.__PC_STATUS = null;
  }

  function start() {
    if (!document.getElementById('pc-css')) {
      var s = document.createElement('style'); s.id = 'pc-css'; s.textContent = CSS; document.head.appendChild(s);
    }
    tick();
    setInterval(tick, 120);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  /* ------------------------------------------------- helpers for modules */
  global.PC = {
    LIVE: LIVE,
    freeze: freeze,
    noJump: noJump,
    refresh: function () { tick(); },
    hold: function (on, restore) { hold(on, restore); },
    held: function () { return holdOn; },
    /* generic stage helpers for PCLK timeline modules */
    seek: function (reset, startFn, reached) {
      PCLK.clearAll();
      PCLK.pause();
      reset();
      if (!startFn) return true;
      startFn();
      return PCLK.advance(36e5, reached);
    }
  };
})(window);
