/* ============================================================================
   PVT Nexus — PvtChart
   Interactive property-versus-pressure chart (inline SVG, no library).

     var ch = PvtChart.create(hostEl, { onSelect: function (i) {} });
     ch.render(spec);  ch.select(i);  ch.exportPng(name, footerLines);  ch.destroy();

   spec = { title, xLabel, yLabel, yLog, series:[{ id, label, kind:'calc'|'meas',
            pts:[[x, y|null], ...], color, dash, primary }],
            marker:{ x, label } (bubble point), selected, fmtX, fmtY }

   * null y = invalid / unavailable: the line breaks there (never joined, never 0)
     and the gap is shaded so it is visible.
   * calculated = line, measured = open square markers; legend shows the glyph,
     so the two are told apart without colour.
   * colours are resolved from the theme at draw time, so the PNG export
     looks like the screen.
   ========================================================================= */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function css(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fb;
  }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceStep(span, n) {
    var raw = span / Math.max(1, n), mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    return (r >= 5 ? 10 : r >= 2 ? 5 : r >= 1 ? 2 : 1) * mag;
  }
  function ticks(lo, hi, n) {
    if (!(hi > lo)) { var d = Math.abs(lo) * 0.05 || 1; lo -= d; hi += d; }
    var st = niceStep(hi - lo, n), a = Math.floor(lo / st) * st, b = Math.ceil(hi / st) * st, out = [];
    for (var v = a; v <= b + st * 1e-6; v += st) out.push(+v.toPrecision(12));
    return { lo: a, hi: b, list: out, step: st };
  }
  function logTicks(lo, hi) {
    var a = Math.floor(Math.log10(lo)), b = Math.ceil(Math.log10(hi)), out = [];
    if (a === b) b = a + 1;
    for (var k = a; k <= b; k++) out.push(Math.pow(10, k));
    return { lo: Math.pow(10, a), hi: Math.pow(10, b), list: out };
  }
  function defFmt(v) {
    var a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e6)) return v.toExponential(1);
    return +v.toPrecision(6) + '';
  }

  function create(host, opts) {
    opts = opts || {};
    var spec = null, sel = -1, hover = -1, geom = null;
    var wrap = document.createElement('div');
    wrap.className = 'pc-chart';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'img');
    host.appendChild(wrap);
    var tip = document.createElement('div');
    tip.className = 'pc-tip'; tip.hidden = true;
    host.appendChild(tip);
    var svg = null;

    function primary() { return spec && spec.series.filter(function (s) { return s.primary; })[0]; }

    function draw(target, W, H, forExport) {
      var col = {
        txt: css('--txt', '#16202f'), mut: css('--mut', '#566578'), line: css('--line2', 'rgba(40,60,90,.2)'),
        grid: css('--line', 'rgba(40,60,90,.12)'), bg: css('--panel', '#ffffff'), red: css('--red', '#c33a52')
      };
      var s = el('svg', { xmlns: NS, width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'font-family': 'IBM Plex Sans, system-ui, sans-serif' }, target);
      el('rect', { x: 0, y: 0, width: W, height: H, fill: col.bg }, s);
      if (!spec || !spec.series.length) return s;
      var fx = spec.fmtX || defFmt, fy = spec.fmtY || defFmt;
      var xs = [], ys = [];
      spec.series.forEach(function (se) { se.pts.forEach(function (p) { if (p[1] !== null && isFinite(p[1])) { xs.push(p[0]); if (!spec.yLog || p[1] > 0) ys.push(p[1]); } }); });
      spec.series.forEach(function (se) { se.pts.forEach(function (p) { xs.push(p[0]); }); });
      if (spec.marker && isFinite(spec.marker.x)) xs.push(spec.marker.x);
      if (!xs.length) return s;
      var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
      var tx = ticks(xmin, xmax, Math.max(3, Math.floor(W / 110)));
      var ty;
      if (!ys.length) ty = ticks(0, 1, 4);
      else if (spec.yLog) ty = logTicks(Math.min.apply(null, ys), Math.max.apply(null, ys));
      else { var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys), pad = (y1 - y0) * 0.06 || Math.abs(y1) * 0.05 || 1; ty = ticks(y0 - pad, y1 + pad, Math.max(3, Math.floor(H / 70))); }
      var fs = forExport ? 15 : 11.5, lblW = Math.max.apply(null, ty.list.map(function (v) { return fy(v).length; })) * fs * 0.58;
      var M = { l: Math.max(48, lblW + 30), r: forExport ? 44 : 18, t: forExport ? 54 : 14, b: forExport ? 96 : 46 };
      var pw = W - M.l - M.r, ph = H - M.t - M.b;
      if (pw < 40 || ph < 40) return s;
      var X = function (v) { return M.l + (v - tx.lo) / (tx.hi - tx.lo) * pw; };
      var Y = spec.yLog
        ? function (v) { return M.t + ph - (Math.log10(v) - Math.log10(ty.lo)) / (Math.log10(ty.hi) - Math.log10(ty.lo)) * ph; }
        : function (v) { return M.t + ph - (v - ty.lo) / (ty.hi - ty.lo) * ph; };
      geom = { X: X, Y: Y, M: M, pw: pw, ph: ph, W: W, H: H, tx: tx };

      if (forExport && spec.title) { var tt = el('text', { x: M.l, y: 30, 'font-size': 19, 'font-weight': 700, fill: col.txt }, s); tt.textContent = spec.title; }
      /* grid + ticks */
      var g = el('g', {}, s);
      ty.list.forEach(function (v) {
        if (v < ty.lo - 1e-12 || v > ty.hi * (1 + 1e-9)) return;
        var y = Y(v); el('line', { x1: M.l, x2: M.l + pw, y1: y, y2: y, stroke: col.grid, 'stroke-width': 1 }, g);
        var t = el('text', { x: M.l - 8, y: y + 4, 'text-anchor': 'end', 'font-size': fs, fill: col.mut, 'font-family': 'IBM Plex Mono, monospace' }, g); t.textContent = fy(v);
      });
      tx.list.forEach(function (v) {
        var x = X(v); el('line', { x1: x, x2: x, y1: M.t, y2: M.t + ph, stroke: col.grid, 'stroke-width': 1 }, g);
        var t = el('text', { x: x, y: M.t + ph + fs + 6, 'text-anchor': 'middle', 'font-size': fs, fill: col.mut, 'font-family': 'IBM Plex Mono, monospace' }, g); t.textContent = fx(v);
      });
      el('rect', { x: M.l, y: M.t, width: pw, height: ph, fill: 'none', stroke: col.line, 'stroke-width': 1 }, g);
      var xl = el('text', { x: M.l + pw / 2, y: forExport ? M.t + ph + fs + 34 : H - 8, 'text-anchor': 'middle', 'font-size': fs + 0.5, 'font-weight': 600, fill: col.txt }, s); xl.textContent = spec.xLabel;
      var yl = el('text', { x: 0, y: 0, transform: 'translate(' + (forExport ? 18 : 13) + ',' + (M.t + ph / 2) + ') rotate(-90)', 'text-anchor': 'middle', 'font-size': fs + 0.5, 'font-weight': 600, fill: col.txt }, s); yl.textContent = spec.yLabel + (spec.yLog ? ' (log scale)' : '');

      /* invalid regions of the primary series: shaded, never bridged */
      var pr = primary();
      if (pr) {
        var pts = pr.pts;
        for (var i = 0; i < pts.length; i++) {
          if (pts[i][1] !== null) continue;
          var a = i > 0 ? (pts[i - 1][0] + pts[i][0]) / 2 : pts[i][0], j = i;
          while (j + 1 < pts.length && pts[j + 1][1] === null) j++;
          var b = j < pts.length - 1 ? (pts[j][0] + pts[j + 1][0]) / 2 : pts[j][0];
          var xa = X(a), xb = Math.max(X(b), xa + 4);
          el('rect', { x: xa - (a === b ? 2 : 0), y: M.t, width: xb - xa + (a === b ? 4 : 0), height: ph, fill: col.red, 'fill-opacity': 0.08, stroke: col.red, 'stroke-opacity': 0.35, 'stroke-dasharray': '3 3' }, s);
          var lt = el('text', { x: (xa + xb) / 2, y: M.t + 14, 'text-anchor': 'middle', 'font-size': fs - 1.5, fill: col.red }, s); lt.textContent = 'no valid value';
          i = j;
        }
      }
      /* bubble-point marker */
      if (spec.marker && isFinite(spec.marker.x) && spec.marker.x >= tx.lo && spec.marker.x <= tx.hi) {
        var bx = X(spec.marker.x);
        el('line', { x1: bx, x2: bx, y1: M.t, y2: M.t + ph, stroke: col.txt, 'stroke-width': 1.2, 'stroke-dasharray': '6 4', 'stroke-opacity': 0.7 }, s);
        var mt = el('text', { x: bx + 6, y: M.t + ph - 8, 'font-size': fs, 'font-weight': 600, fill: col.txt }, s); mt.textContent = spec.marker.label;
      }
      /* series */
      spec.series.forEach(function (se) {
        if (se.kind === 'meas') {
          se.pts.forEach(function (p) {
            if (p[1] === null || (spec.yLog && !(p[1] > 0))) return;
            var cx = X(p[0]), cy = Y(p[1]);
            el('rect', { x: cx - 4.5, y: cy - 4.5, width: 9, height: 9, fill: col.bg, stroke: se.color, 'stroke-width': 2 }, s);
          });
          return;
        }
        var d = '', pen = false;
        se.pts.forEach(function (p) {
          if (p[1] === null || (spec.yLog && !(p[1] > 0))) { pen = false; return; }
          d += (pen ? 'L' : 'M') + X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2); pen = true;
        });
        if (d) el('path', { d: d, fill: 'none', stroke: se.color, 'stroke-width': se.primary ? 2.6 : 2, 'stroke-dasharray': se.dash || null, 'stroke-linejoin': 'round' }, s);
        /* isolated valid points between gaps would be invisible as a line: draw a dot */
        se.pts.forEach(function (p, k) {
          if (p[1] === null) return;
          var prev = k > 0 ? se.pts[k - 1][1] : null, next = k < se.pts.length - 1 ? se.pts[k + 1][1] : null;
          if (prev === null && next === null) el('circle', { cx: X(p[0]), cy: Y(p[1]), r: se.primary ? 3.5 : 3, fill: se.color }, s);
        });
      });
      /* selection + hover */
      if (pr && !forExport) {
        if (hover >= 0 && pr.pts[hover]) el('line', { x1: X(pr.pts[hover][0]), x2: X(pr.pts[hover][0]), y1: M.t, y2: M.t + ph, stroke: col.mut, 'stroke-width': 1, 'stroke-opacity': 0.6 }, s);
      }
      if (pr && sel >= 0 && pr.pts[sel] && pr.pts[sel][1] !== null) {
        var sx = X(pr.pts[sel][0]), sy = Y(pr.pts[sel][1]);
        el('circle', { cx: sx, cy: sy, r: 7, fill: 'none', stroke: pr.color, 'stroke-width': 2.5 }, s);
        el('circle', { cx: sx, cy: sy, r: 3, fill: pr.color }, s);
      }
      /* export legend (screen legend is HTML) */
      if (forExport) {
        var lx = M.l, ly = H - 14;
        spec.series.forEach(function (se) {
          if (se.kind === 'meas') el('rect', { x: lx, y: ly - 9, width: 9, height: 9, fill: col.bg, stroke: se.color, 'stroke-width': 2 }, s);
          else el('line', { x1: lx - 2, x2: lx + 20, y1: ly - 4, y2: ly - 4, stroke: se.color, 'stroke-width': 2.5, 'stroke-dasharray': se.dash || null }, s);
          var t = el('text', { x: lx + 26, y: ly, 'font-size': 13, fill: col.txt }, s); t.textContent = se.label;
          lx += 40 + se.label.length * 7;
        });
      }
      return s;
    }

    function redraw() {
      var r = wrap.getBoundingClientRect();
      var W = Math.max(200, Math.floor(r.width)), H = Math.max(160, Math.floor(r.height));
      wrap.innerHTML = '';
      svg = draw(wrap, W, H, false);
    }

    function nearest(evt) {
      var pr = primary();
      if (!pr || !geom) return -1;
      var r = wrap.getBoundingClientRect(), mx = evt.clientX - r.left, my = evt.clientY - r.top;
      if (mx < geom.M.l - 10 || mx > geom.M.l + geom.pw + 10 || my < geom.M.t - 10 || my > geom.M.t + geom.ph + 10) return -1;
      var best = -1, bd = Infinity;
      pr.pts.forEach(function (p, i) { var d = Math.abs(geom.X(p[0]) - mx); if (d < bd) { bd = d; best = i; } });
      return best;
    }

    function showTip(i, evt) {
      var pr = primary();
      if (i < 0 || !pr) { tip.hidden = true; return; }
      var fx = spec.fmtX || defFmt, fy = spec.fmtY || defFmt, x = pr.pts[i][0];
      var rows = spec.series.filter(function (se) { return se.kind === 'calc'; }).map(function (se) {
        /* other series may hold extra points (their own pb): match by pressure, not by index */
        var pt = se.primary ? se.pts[i] : se.pts.filter(function (q) { return Math.abs(q[0] - x) <= 1e-9 * Math.max(1, Math.abs(x)); })[0];
        var v = pt && pt[1];
        return '<div class="pc-tip-row"><i style="background:' + se.color + '"></i><span>' + esc(se.label) + '</span><b>' + (v === null || v === undefined ? 'no valid value' : fy(v)) + '</b></div>';
      }).join('');
      var meas = spec.series.filter(function (se) { return se.kind === 'meas'; }).map(function (se) {
        var m = se.pts.filter(function (pt) { return Math.abs(pt[0] - x) <= 1e-9 * Math.max(1, Math.abs(x)); })[0];
        return m && m[1] !== null ? '<div class="pc-tip-row is-meas"><i style="border-color:' + se.color + '"></i><span>' + esc(se.label) + '</span><b>' + fy(m[1]) + '</b></div>' : '';
      }).join('');
      tip.innerHTML = '<div class="pc-tip-head">' + esc(spec.xLabel.replace(/,.*$/, '')) + ' = ' + fx(x) + ' ' + esc(spec.xUnit || '') + '</div>' + rows + meas
        + (spec.reasons && spec.reasons[i] ? '<div class="pc-tip-why">' + esc(spec.reasons[i]) + '</div>' : '');
      tip.hidden = false;
      var hr = host.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      var left = evt.clientX - hr.left + 14, top = evt.clientY - hr.top + 14;
      if (left + tw > hr.width - 4) left = evt.clientX - hr.left - tw - 14;
      if (top + th > hr.height - 4) top = Math.max(4, evt.clientY - hr.top - th - 14);
      tip.style.left = left + 'px'; tip.style.top = top + 'px';
    }

    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    wrap.addEventListener('mousemove', function (e) { var i = nearest(e); if (i !== hover) { hover = i; redraw(); } showTip(i, e); });
    wrap.addEventListener('mouseleave', function () { hover = -1; tip.hidden = true; redraw(); });
    wrap.addEventListener('click', function (e) { var i = nearest(e); if (i >= 0) { sel = i; redraw(); if (opts.onSelect) opts.onSelect(i); } });
    wrap.addEventListener('keydown', function (e) {
      var pr = primary(); if (!pr) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        sel = Math.max(0, Math.min(pr.pts.length - 1, (sel < 0 ? 0 : sel) + (e.key === 'ArrowRight' ? 1 : -1)));
        redraw(); if (opts.onSelect) opts.onSelect(sel);
      }
    });
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () { if (spec) redraw(); }) : null;
    if (ro) ro.observe(wrap);

    return {
      render: function (s) { spec = s; sel = s && s.selected !== undefined ? s.selected : sel; wrap.setAttribute('aria-label', s ? s.title : ''); redraw(); },
      select: function (i) { sel = i; redraw(); },
      exportPng: function (name, footer) {
        var W = 1600, footH = footer && footer.length ? 22 * footer.length + 24 : 0, H = 900 + footH;
        var tmp = document.createElement('div');
        var s = draw(tmp, W, 900, true);
        s.setAttribute('height', H); s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        var bg = s.firstChild; bg.setAttribute('height', H);
        (footer || []).forEach(function (line, k) {
          var t = el('text', { x: 24, y: 900 + 26 + k * 22, 'font-size': 14, fill: css('--txt2', '#3a4759') }, s); t.textContent = line;
        });
        var xml = new XMLSerializer().serializeToString(s);
        var img = new Image();
        img.onload = function () {
          var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
          cv.getContext('2d').drawImage(img, 0, 0);
          cv.toBlob(function (blob) {
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
            document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
          }, 'image/png');
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      },
      destroy: function () { if (ro) ro.disconnect(); wrap.remove(); tip.remove(); }
    };
  }

  global.PvtChart = { create: create };
})(window);
