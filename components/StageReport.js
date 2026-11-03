/* component: StageReport — Module 04, Final Report */
(function () {
var R = window.PVT_REPORT || null;

// ---------------------------------------------------------------- helpers
function el(tag, cls, txt) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
function num(v, d) {
  if (v == null || v === '') return '';
  return Math.abs(Number(v)) < 5e-4 ? '' : Number(v).toFixed(d);
}
function kp(v) { return v == null ? '' : Math.round(v).toLocaleString('en-US'); }
function tbl(head, rows, cls) {
  var t = el('table', 'rp-t ' + (cls || ''));
  if (head) {
    var th = el('thead');
    head.forEach(function (hr) {
      var tr = el('tr');
      hr.forEach(function (c) {
        var d = el('th');
        if (typeof c === 'object' && c) {
          d.textContent = c.t || '';
          if (c.cs) d.colSpan = c.cs;
          if (c.rs) d.rowSpan = c.rs;
        } else d.textContent = c == null ? '' : c;
        tr.appendChild(d);
      });
      th.appendChild(tr);
    });
    t.appendChild(th);
  }
  var tb = el('tbody');
  rows.forEach(function (r) {
    var tr = el('tr');
    if (r && r.__cls) tr.className = r.__cls;
    (r.__cells || r).forEach(function (c) {
      var d = el('td');
      if (typeof c === 'object' && c) {
        d.textContent = c.t == null ? '' : c.t;
        if (c.cs) d.colSpan = c.cs;
        if (c.b) d.style.fontWeight = '600';
        if (c.l) d.style.textAlign = 'left';
      } else d.textContent = c == null ? '' : c;
      tr.appendChild(d);
    });
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  return t;
}
function note(lines) {
  var w = el('div', 'rp-note');
  w.appendChild(el('div', 'rp-note-h', 'Notes:'));
  lines.forEach(function (l, i) { w.appendChild(el('div', null, (i + 1) + '. ' + l)); });
  return w;
}

// ---------------------------------------------------------------- svg chart
function chart(pts, xlab, ylab, yfmt) {
  var W = 640, H = 330, mL = 74, mR = 18, mT = 16, mB = 46;
  var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
  var x0 = 0, x1 = Math.max.apply(null, xs) * 1.05;
  var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  var pad = (y1 - y0) * 0.12 || Math.abs(y1) * 0.05 || 1;
  y0 -= pad; y1 += pad;
  var X = function (v) { return mL + (v - x0) / (x1 - x0) * (W - mL - mR); };
  var Y = function (v) { return H - mB - (v - y0) / (y1 - y0) * (H - mT - mB); };
  var ns = 'http://www.w3.org/2000/svg';
  var s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  s.setAttribute('class', 'rp-chart');
  function add(t, a) { var n = document.createElementNS(ns, t); for (var k in a) n.setAttribute(k, a[k]); s.appendChild(n); return n; }
  function txt(x, y, str, anchor, size) {
    var n = document.createElementNS(ns, 'text');
    n.setAttribute('x', x); n.setAttribute('y', y);
    n.setAttribute('text-anchor', anchor || 'middle');
    n.setAttribute('font-size', size || 10);
    n.setAttribute('class', 'rp-ct');
    n.textContent = str; s.appendChild(n); return n;
  }
  var i, v;
  for (i = 0; i <= 5; i++) {
    v = y0 + (y1 - y0) * i / 5;
    add('line', { x1: mL, x2: W - mR, y1: Y(v), y2: Y(v), class: 'rp-grid' });
    txt(mL - 8, Y(v) + 3.4, yfmt(v), 'end');
  }
  for (i = 0; i <= 5; i++) {
    v = x0 + (x1 - x0) * i / 5;
    add('line', { x1: X(v), x2: X(v), y1: mT, y2: H - mB, class: 'rp-grid' });
    txt(X(v), H - mB + 16, Math.round(v).toLocaleString('en-US'));
  }
  add('rect', { x: mL, y: mT, width: W - mL - mR, height: H - mT - mB, class: 'rp-frame' });
  var d = pts.map(function (p, k) { return (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ');
  add('path', { d: d, class: 'rp-line' });
  pts.forEach(function (p) { if (p[2] === false) return; add('circle', { cx: X(p[0]), cy: Y(p[1]), r: 3.4, class: 'rp-dot' }); });
  txt((mL + W - mR) / 2, H - 8, xlab, 'middle', 11);
  var yl = txt(0, 0, ylab, 'middle', 11);
  yl.setAttribute('transform', 'translate(15,' + ((mT + H - mB) / 2) + ') rotate(-90)');
  return s;
}
function figure(no, title, sub, pts, xlab, ylab, yfmt) {
  var w = el('section', 'rp-page');
  w.appendChild(el('div', 'rp-h2', 'Figure ' + no + ': ' + title));
  if (sub) w.appendChild(el('div', 'rp-h3', sub));
  w.appendChild(el('div', 'rp-sid', sampleLine()));
  w.appendChild(chart(pts, xlab, ylab, yfmt));
  return w;
}
function sampleLine() {
  var H = R.header;
  return 'Sample Number: ' + H.sample_no + '  ·  Cylinder Number: ' + H.cylinder_no +
         '  ·  Sample Depth: ' + H.depth_ft.toLocaleString('en-US') + ' ft TVD';
}

// ---------------------------------------------------------------- sections
function build() {
  var doc = el('div', 'rp-doc'), secs = [];
  function section(id, label, subtitle) {
    var s = el('section', 'rp-page'); s.id = 'rp-' + id;
    s.appendChild(el('h2', 'rp-h1', label));
    if (subtitle) s.appendChild(el('p', 'rp-p', subtitle));
    doc.appendChild(s); secs.push({ id:s.id, label:label }); return s;
  }
  function table(s, headers, rows) {
    var box = el('div', 'rp-table-scroll'); box.tabIndex = 0;
    box.setAttribute('role','region'); box.setAttribute('aria-label',s.querySelector('h2').textContent + ' results');
    box.appendChild(tbl([headers], rows)); s.appendChild(box);
  }
  function plot(s, pts, x, y, digits) {
    if (!pts.length) return;
    var c = chart(pts.slice().sort(function(a,b){return a[0]-b[0];}),x,y,function(v){return v.toFixed(digits);});
    c.setAttribute('role','img'); c.setAttribute('aria-label',y + ' versus ' + x + '. Exact values are listed in the table.');
    s.appendChild(c);
  }
  var pv = window.PVT_PV && window.PVT_PV.report;
  var dl = window.PVT_DL;
  var visc = window.PVT_VISC_SINGLE;
  var summary = section('summary','Reservoir fluid study','Simulator example · PVT Nexus');
  var grid = el('div','rp-summary-grid');
  [['Reservoir pressure','3,000','psig'],['Working pressure','5,000','psig'],
   ['Reservoir temperature','114','°C'],['Validation Psat',pv ? kp(pv.psat[0]) : '—','psig']].forEach(function(k){
    var item=el('div','rp-stat'); item.appendChild(el('span','rp-stat-label',k[0]));
    item.appendChild(el('strong',null,k[1])); item.appendChild(el('span','rp-stat-unit',k[2]));grid.appendChild(item);
  });
  summary.appendChild(grid);
  summary.appendChild(el('p','rp-caption','Bottom-hole oil example · Pressures are gauge unless stated otherwise.'));
  var p = section('pv','PV relationship','Validation · 30 cc charge · Psat from the fitted-line intersection.');
  if (pv) {
    var ribbon=el('div','rp-result-line','Psat ' + kp(pv.psat[0]) + ' psig at ' + pv.psat[1].toFixed(1) + ' cc');p.appendChild(ribbon);
    table(p,['Pressure (psig)','Cell volume (cc)'],pv.points.map(function(r){return [kp(r[0]),r[1].toFixed(3)];}));
    // Include the intersection when joining the two illustrative linear trends.
    plot(p,pv.points.concat([[pv.psat[0],pv.psat[1],false]]),'Pressure (psig)','Cell volume (cc)',2);
  } else p.appendChild(el('p','rp-p','PV results unavailable.'));
  var d = section('dl','Differential liberation','80 cc initial charge at 5,000 psig · Six pressure stages.');
  if (dl) {
    table(d,['Stage','Pressure (psig)','Stabilised volume (cc)','Remaining oil (cc)'],
      dl.stages.map(function(r){return [r.n,kp(r.target),r.stab.toFixed(4),r.remaining.toFixed(4)];}));
    plot(d,dl.stages.map(function(r){return [r.target,r.remaining];}),'Pressure (psig)','Remaining oil (cc)',1);
    var final=R.dl_final || {};
    d.appendChild(el('p','rp-caption',final.known
      ? 'Final flash: ' + kp(final.gasScc) + ' standard cc gas at 60 °F and 101.325 kPa.'
      : 'Final-flash gas: not entered. Cumulative solution GOR is unavailable.'));
  } else d.appendChild(el('p','rp-p','Differential liberation results unavailable.'));
  var comp=section('composition','Fluid composition','Existing report example · Grouped mole fractions.');
  var groups=[
    ['Nitrogen',function(k){return k==='N2';}],
    ['Carbon dioxide',function(k){return k==='CO2';}],
    ['Methane',function(k){return k==='nC1';}],
    ['Ethane',function(k){return k==='nC2';}],
    ['Propane',function(k){return k==='nC3';}],
    ['C4–C6',function(k){return ['iC4','nC4','neo-C5','iC5','nC5','C6'].indexOf(k)>=0;}],
    ['C7+',function(k){return ['N2','CO2','nC1','nC2','nC3','iC4','nC4','neo-C5','iC5','nC5','C6'].indexOf(k)<0;}]
  ];
  var totals=[0,0,0];
  var rows=groups.map(function(g){
    var vals=['gm','om','rm'].map(function(key,i){
      var v=R.comp.reduce(function(sum,c){return sum+(g[1](c.c)?c[key]:0);},0);totals[i]+=v;return v.toFixed(3);
    });return [g[0]].concat(vals);
  });
  rows.push(['Total'].concat(totals.map(function(v){return v.toFixed(3);})));
  table(comp,['Component','Evolved gas (mol%)','Stock-tank oil (mol%)','Reservoir fluid (mol%)'],rows);
  var density=section('density','Direct density','Two-run example · 7 cc transferred per run at 5,000 psig.');
  var runs=[[1,208.812,213.578],[2,208.820,213.584]];
  table(density,['Run','Empty coil (g)','Filled coil (g)','Density (kg/m³)'],runs.map(function(r){
    return [r[0],r[1].toFixed(3),r[2].toFixed(3),((r[2]-r[1])/7*1000).toFixed(2)];
  }));
  var average=runs.reduce(function(sum,r){return sum+(r[2]-r[1])/7*1000;},0)/runs.length;
  density.appendChild(el('div','rp-result-line','Average density · ' + average.toFixed(2) + ' kg/m³'));
  var v=section('viscosity','Single-phase viscosity','Illustrative correlation-based results · Same values as the single-phase test.');
  if(visc){
    table(v,['Pressure (psig)','Fall time (s)','Viscosity (cP)'],visc.points.map(function(r){return [kp(r.p),r.t.toFixed(2),r.mu.toFixed(3)];}));
    plot(v,visc.points.map(function(r){return [r.p,r.mu];}),'Pressure (psig)','Viscosity (cP)',2);
    v.appendChild(el('p','rp-caption','Test temperature · ' + visc.temperature.toFixed(1) + ' °C'));
  } else v.appendChild(el('p','rp-p','Viscosity results unavailable.'));
  return {doc:doc,secs:secs};
}
// ---------------------------------------------------------------- component
class Component extends DCLogic {
  state = { active: '' };
  hostRef = React.createRef();

  componentDidMount() { this.render_(); }
  componentDidUpdate() { this.render_(); }
  componentWillUnmount() { if (this.io) this.io.disconnect(); }

  render_() {
    var host = this.hostRef.current;
    if (!host || host.dataset.built === '1' || !R) return;
    host.dataset.built = '1';
    var built = build();
    this.built = built;

    var wrap = el('div', 'rp-wrap');
    var nav = el('nav', 'rp-nav');
    nav.appendChild(el('div', 'rp-nav-h', 'Sections'));
    var self = this;
    built.secs.forEach(function (s, i) {
      var b = el('button', 'rp-nav-b' + (i === 0 ? ' is-on' : ''), s.label);
      b.onclick = function () {
        var t = document.getElementById(s.id);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        nav.querySelectorAll('.rp-nav-b').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      };
      nav.appendChild(b);
    });
    var pane = el('div', 'rp-pane');
    pane.appendChild(built.doc);
    wrap.appendChild(nav); wrap.appendChild(pane);
    host.appendChild(wrap);

    // highlight the section in view
    if ('IntersectionObserver' in window) {
      var btns = nav.querySelectorAll('.rp-nav-b');
      this.io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var idx = built.secs.map(function (s) { return s.id; }).indexOf(e.target.id);
          if (idx < 0) return;
          btns.forEach(function (x) { x.classList.remove('is-on'); });
          btns[idx].classList.add('is-on');
        });
      }, { root: pane, threshold: 0.4 });
      built.secs.forEach(function (s) {
        var n = document.getElementById(s.id); if (n) self.io.observe(n);
      });
    }
  }

  renderVals() {
    return {
      onBack: this.props.onBack,
      repHost: this.hostRef,
      hasData: !!R,
      noData: !R,
      repRef: R ? R.header.report_ref : '',
      repTitle: R ? R.header.title : '',
      repSample: R ? R.header.sample_no : ''
    };
  }
}

DC.define('StageReport', {
  style: `
.rp-shell{display:flex;flex-direction:column;height:var(--page-h);}
.rp-bar{position:relative;overflow:hidden;border-radius:16px;border:1px solid rgba(95,176,255,.25);
  background:radial-gradient(120% 160% at 8% 0%,rgba(95,176,255,.12),transparent 60%),
  linear-gradient(155deg,var(--panel2),var(--panel) 65%);padding:14px 20px;margin:14px 24px 12px;}
.rp-chip{display:inline-flex;align-items:center;gap:6px;font-family:'IBM Plex Mono';font-size:10.5px;
  letter-spacing:1.4px;text-transform:uppercase;color:var(--accb3);padding:4px 10px;border-radius:999px;
  background:rgba(95,176,255,.10);border:1px solid rgba(95,176,255,.3);}
.rp-bar-t{font-size:clamp(20px,1.8vw,25px);font-weight:700;color:var(--txt);letter-spacing:-.4px;margin-top:8px;}
.rp-bar-s{font-size:12.5px;color:var(--txt2);margin-top:4px;}
.rp-btn{font-family:inherit;font-size:12px;font-weight:500;padding:10px 16px;border-radius:10px;cursor:pointer;
  background:rgba(95,176,255,.10);border:1px solid rgba(95,176,255,.40);color:var(--accb3);white-space:nowrap;}
.rp-btn:hover{background:rgba(95,176,255,.18);border-color:var(--accb3);}
.rp-wrap{flex:1;min-height:0;display:flex;gap:16px;padding:0 24px 18px;}
.rp-nav{flex:0 0 216px;overflow:auto;border:1px solid var(--line);border-radius:14px;background:var(--panel);padding:10px;}
.rp-nav-h{font-family:'IBM Plex Mono';font-size:10px;letter-spacing:1.6px;text-transform:uppercase;
  color:var(--mut);padding:6px 8px 10px;}
.rp-nav-b{display:block;width:100%;text-align:left;font-family:inherit;font-size:12px;font-weight:400;
  color:var(--txt2);background:transparent;border:1px solid transparent;border-radius:8px;padding:7px 10px;
  cursor:pointer;margin-bottom:2px;}
.rp-nav-b:hover{background:var(--chipbg);color:var(--txt);}
.rp-nav-b.is-on{background:rgba(95,176,255,.12);border-color:var(--mut);color:var(--accb3);font-weight:500;}
.rp-pane{flex:1;min-width:0;overflow:auto;border:1px solid var(--line);border-radius:14px;background:var(--icard);padding:22px;}
.rp-doc{max-width:1100px;margin:0 auto;}
.rp-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:22px 0;}
.rp-stat{display:flex;flex-direction:column;gap:8px;padding:18px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;}
.rp-stat-label{font-size:12px;color:var(--txt2);}
.rp-stat strong{font-family:'IBM Plex Mono',monospace;font-size:26px;color:var(--txt);}
.rp-stat-unit,.rp-caption{font-size:12px;color:var(--txt2);line-height:1.6;}
.rp-result-line{padding:14px 16px;margin:16px 0;border-left:3px solid var(--accb3);background:var(--chipbg);font-weight:600;color:var(--txt);}
.rp-table-scroll{overflow-x:auto;max-width:100%;border-radius:8px;}
.rp-table-scroll:focus-visible{outline:2px solid var(--accb3);outline-offset:3px;}
.rp-table-scroll .rp-t{min-width:440px;font-size:13px;}
.rp-table-scroll .rp-t th{font-size:12px;padding:12px 10px;}
.rp-table-scroll .rp-t td{padding:10px;}
.rp-table-scroll .rp-t td:first-child{text-align:left;color:var(--txt);}
.rp-page .rp-chart{max-height:360px;}
@media(max-width:900px){.rp-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.rp-page{padding:20px;}}
@media(max-width:600px){.rp-pane{padding:10px;}.rp-bar{margin:10px 12px; padding:14px;}.rp-wrap{padding:0 12px 12px;}.rp-page{padding:16px;}.rp-stat{padding:12px;}.rp-stat strong{font-size:22px;}}
.rp-page{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:26px 30px;margin-bottom:20px;}
.rp-cover{text-align:center;padding:60px 30px;}
.rp-brand{font-size:34px;font-weight:700;letter-spacing:2px;color:var(--accb3);}
.rp-brand-sub{font-size:12px;color:var(--mut);margin-top:6px;}
.rp-title{font-size:26px;font-weight:600;color:var(--txt);margin:34px 0 26px;letter-spacing:-.4px;}
.rp-h1{font-size:20px;font-weight:600;color:var(--txt);margin:0 0 12px;letter-spacing:-.3px;}
.rp-h2{font-size:14px;font-weight:600;color:var(--txt);margin:0 0 4px;}
.rp-h3{font-size:12.5px;font-weight:500;color:var(--txt2);margin:0 0 6px;}
.rp-sid{font-family:'IBM Plex Mono';font-size:10.5px;color:var(--mut);margin-bottom:12px;}
.rp-p{font-size:13px;line-height:1.7;color:var(--txt2);font-weight:300;margin:0 0 14px;}
.rp-ul{font-size:12.5px;line-height:1.7;color:var(--txt2);font-weight:300;margin:0;padding-left:18px;}
.rp-ul li{margin-bottom:8px;}
.rp-t{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0 4px;}
.rp-t th{background:rgba(95,176,255,.10);color:var(--txt);font-weight:600;font-size:10px;
  border:1px solid var(--line2);padding:6px 5px;text-align:center;line-height:1.3;white-space:pre-line;}
.rp-t td{border:1px solid var(--line);padding:4px 5px;text-align:center;color:var(--txt2);
  font-variant-numeric:tabular-nums;}
.rp-t tbody tr:nth-child(even) td{background:rgba(127,127,127,.045);}
.rp-comp{font-size:10px;}
.rp-comp td,.rp-comp th{padding:2.5px 4px;}
.rp-wide{font-size:9.5px;}
.rp-wide th{font-size:9px;}
.rp-kv td:first-child,.rp-kv3 td:first-child{text-align:left;width:52%;color:var(--txt);}
.rp-assum td{text-align:left;font-size:10.5px;}
.rp-note{font-size:10.5px;line-height:1.6;color:var(--mut);margin-top:8px;}
.rp-note-h{font-weight:600;color:var(--txt2);margin-bottom:2px;}
.rp-chart{width:100%;height:auto;margin-top:8px;}
.rp-grid{stroke:var(--line);stroke-width:1;}
.rp-frame{fill:none;stroke:var(--line2);stroke-width:1;}
.rp-line{fill:none;stroke:var(--accb3);stroke-width:1.8;}
.rp-dot{fill:var(--panel);stroke:var(--accb3);stroke-width:1.6;}
.rp-ct{fill:var(--mut);font-family:'IBM Plex Mono';}
@media print{
  body *{visibility:hidden;}
  .rp-pane,.rp-pane *{visibility:visible;}
  .rp-pane{position:absolute;inset:0;overflow:visible;border:0;padding:0;background:#fff;}
  .rp-nav,.rp-bar{display:none !important;}
  .rp-page{page-break-after:always;border:0;background:#fff;padding:12mm 10mm;}
}
`,
  template: `<div class="rp-shell" data-screen-label="Module 04 — Report">
      <div class="rp-bar">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:18px; flex-wrap:wrap;">
          <div style="min-width:0;">
            <span class="rp-chip"><span style="width:6px; height:6px; border-radius:50%; background:var(--accb3);"></span>Module 04 · Report</span>
            <div class="rp-bar-t">PVT Study Report</div>
            <div class="rp-bar-s">Program results · Simulator example</div>
          </div>
        </div>
      </div>
      <sc-if value="{{ noData }}" hint-placeholder-val="{{ false }}">
        <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--mut); font-size:13px;">
          Example report unavailable.
        </div>
      </sc-if>
      <div ref="{{ repHost }}" style="flex:1; min-height:0; display:flex; flex-direction:column;"></div>
    </div>`,
  logic: Component
});
})();
