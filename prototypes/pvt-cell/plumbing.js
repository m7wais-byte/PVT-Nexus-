/* ==========================================================================
   PVT Cell prototype — plumbing view (PVTPlumb)

   A schematic of the cell's built-in plumbing, drawn from the SAME state as
   the equipment views (valve states, ports, volumes, header pressure).

   The arrangement is INFERRED from the existing simulator code, not from
   the real equipment:
     - showTest.js Charge: Pump B and Pump A valves sit on tees of one top
       header; Charge fills Pump A through the header past the closed Pump B
       valve; the pressure sensor tees into the header between them.
     - showTest.js Flash: sample leaves from the right end of the same header.
   So each cylinder valve isolates only its own cylinder, and Port L, the
   pressure sensor and Port R share the header with no valve between them.
   ========================================================================== */
(function () {
  'use strict';
  var Y = 300, PL = 236, PR = 1200, XB = 520, XA = 916, XS = 718;
  var VY = 372, CY0 = 446, CY1 = 626, CW = 50;
  var COL = { hdr: '#2f6fd0', A: '#c27a12', B: '#138a72', off: '#a9b3c0' };
  var F = 'font-family="IBM Plex Sans, sans-serif"', M = 'font-family="IBM Plex Mono, monospace"';
  function T(x, y, s, a) { return '<text x="' + x + '" y="' + y + '" ' + (a || '') + '>' + s + '</text>'; }
  function line(id, d, w) { return '<path id="' + id + '" d="' + d + '" fill="none" stroke="' + COL.hdr + '" stroke-width="' + (w || 7) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
  // ISA valve symbol (bowtie); vertical: flow up/down, horizontal: flow left/right
  function bowtie(id, x, y, vert) {
    var d = vert ? 'M' + (x - 16) + ' ' + (y - 22) + ' H' + (x + 16) + ' L' + (x - 16) + ' ' + (y + 22) + ' H' + (x + 16) + ' Z'
                 : 'M' + (x - 22) + ' ' + (y - 16) + ' V' + (y + 16) + ' L' + (x + 22) + ' ' + (y - 16) + ' V' + (y + 16) + ' Z';
    return '<path id="' + id + '" d="' + d + '" fill="#ffffff" stroke="#1d2836" stroke-width="2.2" stroke-linejoin="round"/>';
  }

  function svg() {
    var o = '';
    // banner: provenance of the arrangement
    o += '<rect x="60" y="44" width="1316" height="62" rx="8" fill="#fdf3e1" stroke="#d9a24a" stroke-width="1.4"/>';
    o += T(80, 70, 'INFERRED FROM EXISTING SIMULATOR CODE — CONFIRM AGAINST THE REAL EQUIPMENT', M + ' font-size="15" font-weight="700" letter-spacing=".6" fill="#8a5a12"');
    o += T(80, 94, 'Charge page: both cylinder valves sit on tees of one top header, and Pump A is charged past the closed Pump B valve. Flash takes sample from the right end.', F + ' font-size="14.5" fill="#5b4a2a"');
    o += T(718, 150, '', 'id="plState" text-anchor="middle" ' + F + ' font-size="26" font-weight="700" fill="#1d2836"');
    // legend
    [['hdr', 'Connected to the header and pressure sensor'], ['A', 'Pump A isolated'], ['B', 'Pump B isolated']].forEach(function (l, i) {
      var x = [300, 760, 1000][i];
      o += '<rect x="' + x + '" y="166" width="22" height="7" rx="3.5" fill="' + COL[l[0]] + '"/>' + T(x + 30, 174, l[1], F + ' font-size="14" fill="#3a4759"');
    });
    // header (always one region: Port L - Pump B tee - sensor - Pump A tee - Port R)
    o += line('plHdr', 'M' + PL + ' ' + Y + ' H' + PR + ' M' + XS + ' ' + Y + ' V236 M' + XB + ' ' + Y + ' V' + (VY - 22) + ' M' + XA + ' ' + Y + ' V' + (VY - 22));
    [XB, XS, XA].forEach(function (x) { o += '<circle cx="' + x + '" cy="' + Y + '" r="6" fill="#1d2836"/>'; });
    o += T((PL + XB) / 2, Y - 14, 'built-in header', 'text-anchor="middle" ' + F + ' font-size="14" font-style="italic" fill="#566578"');
    // pressure sensor (ISA instrument bubble)
    o += '<circle cx="' + XS + '" cy="210" r="26" fill="#ffffff" stroke="#1d2836" stroke-width="2.2"/>' + T(XS, 216, 'PT', 'text-anchor="middle" ' + M + ' font-size="16" font-weight="700" fill="#1d2836"');
    o += T(XS + 38, 204, 'Pressure sensor', F + ' font-size="15" font-weight="600" fill="#1d2836"') + T(XS + 38, 224, '', 'id="plP" ' + M + ' font-size="15" font-weight="600" fill="#2f6fd0"');
    // cylinders + valves
    [['B', XB, 'end', -34], ['A', XA, 'start', 34]].forEach(function (c) {
      var k = c[0], x = c[1];
      o += bowtie('plV' + k, x, VY, true);
      o += line('plR' + k, 'M' + x + ' ' + (VY + 22) + ' V' + CY0);
      o += T(x + c[3], VY - 4, 'Pump ' + k + ' valve', 'text-anchor="' + c[2] + '" ' + F + ' font-size="16" font-weight="600" fill="#1d2836"');
      o += T(x + c[3], VY + 18, '', 'id="plVt' + k + '" text-anchor="' + c[2] + '" ' + M + ' font-size="14" font-weight="700"');
      o += '<rect id="plC' + k + '" x="' + (x - CW) + '" y="' + CY0 + '" width="' + 2 * CW + '" height="' + (CY1 - CY0) + '" rx="6" fill="#f4f6f9" stroke="' + COL[k] + '" stroke-width="3"/>';
      o += '<rect id="plF' + k + '" x="' + (x - CW + 3) + '" y="' + (CY0 + 3) + '" width="' + (2 * CW - 6) + '" height="0" fill="#e0aa48"/>';
      o += '<rect id="plPi' + k + '" x="' + (x - CW + 3) + '" y="' + CY0 + '" width="' + (2 * CW - 6) + '" height="7" fill="#7d8898"/>';
      o += T(x, CY1 + 26, 'Pump ' + k, 'text-anchor="middle" ' + F + ' font-size="17" font-weight="700" fill="#1d2836"') + T(x, CY1 + 46, '', 'id="plVol' + k + '" text-anchor="middle" ' + M + ' font-size="14" fill="#566578"');
    });
    // ports (plug / open / external line)
    [['L', PL, -1], ['R', PR, 1]].forEach(function (p) {
      var k = p[0], x = p[1], s = p[2];
      o += T(x, Y - 40, 'Port ' + k, 'text-anchor="middle" ' + F + ' font-size="17" font-weight="700" fill="#1d2836"');
      o += '<g id="plPlug' + k + '"><rect x="' + (s < 0 ? x - 14 : x) + '" y="' + (Y - 16) + '" width="14" height="32" rx="2" fill="#1d3a66"/></g>';
      o += '<circle id="plOpen' + k + '" cx="' + x + '" cy="' + Y + '" r="9" fill="#ffffff" stroke="#b0701a" stroke-width="3"/>';
      var x2 = s < 0 ? 84 : 1352;
      // external tubing (dashed = not built in). On Port L the run up to the Cell Valve is open to the header;
      // beyond it, only while the Cell Valve is open
      var xm = k === 'L' ? 160 : x2;
      o += '<g id="plExt' + k + '"><path d="M' + x + ' ' + Y + ' H' + xm + '" fill="none" stroke="' + COL.hdr + '" stroke-width="5" stroke-dasharray="10 6" stroke-linecap="round"/>';
      if (k === 'L') o += '<path id="plExtL' + k + '" d="M' + xm + ' ' + Y + ' H' + x2 + '" fill="none" stroke="' + COL.off + '" stroke-width="5" stroke-dasharray="10 6" stroke-linecap="round"/>';
      if (k === 'L') {
        o += bowtie('plCV', 160, Y, false);
        o += T(160, Y + 40, 'Cell Valve', 'text-anchor="middle" ' + F + ' font-size="15" font-weight="600" fill="#1d2836"') + T(160, Y + 58, 'Charge line · owner unconfirmed', 'text-anchor="middle" ' + F + ' font-size="12.5" font-weight="600" fill="#b0701a"');
        o += T(84, Y - 14, 'to bottle valve', F + ' font-size="13.5" fill="#566578"');
      } else o += T(x2, Y - 14, 'to external equipment', 'text-anchor="end" ' + F + ' font-size="13.5" fill="#566578"');
      o += '</g>';
      o += T(x, Y + 40, '', 'id="plPt' + k + '" text-anchor="middle" ' + M + ' font-size="13.5" font-weight="600" fill="#566578"');
    });
    // connectivity read-out
    o += '<rect x="60" y="708" width="1316" height="92" rx="8" fill="#ffffff" stroke="#c9d1db" stroke-width="1.2"/>';
    for (var i = 0; i < 6; i++) o += '<g id="plRow' + i + '"></g>';
    return o;
  }

  function row(label, ok, text, x, y) {
    return '<circle cx="' + (x + 8) + '" cy="' + (y - 5) + '" r="7" fill="' + (ok ? '#2fa66f' : '#a9b3c0') + '"/>' +
      T(x + 24, y, label, 'font-family="IBM Plex Sans, sans-serif" font-size="15" font-weight="600" fill="#1d2836"') +
      T(x + 232, y, text, 'font-family="IBM Plex Sans, sans-serif" font-size="15" fill="' + (ok ? '#14603f' : '#566578') + '"');
  }

  var LAST = '';
  function update(root, S) {
    var a = S.valveA >= .5, b = S.valveB >= .5, q = function (id) { return root.querySelector('#' + id); };
    var key = [a, b, Math.round(S.P), S.vA.toFixed(1), S.vB.toFixed(1), S.plugL >= .5, S.plugR >= .5, S.connL >= 1, S.connR >= 1, S.cellValve >= .5].join('|');
    if (key === LAST) return; LAST = key;
    q('plState').textContent = a && b ? 'Both cylinder valves open' : a ? 'Only the Pump A valve open' : b ? 'Only the Pump B valve open' : 'Both cylinder valves closed';
    q('plP').textContent = Math.round(S.P).toLocaleString('en-US') + ' psig';
    [['A', a], ['B', b]].forEach(function (c) {
      var k = c[0], open = c[1], col = open ? COL.hdr : COL[k];
      q('plV' + k).setAttribute('fill', open ? '#ffffff' : '#1d2836');   // ISA: filled = closed
      q('plVt' + k).textContent = open ? 'OPEN' : 'CLOSED';
      q('plVt' + k).setAttribute('fill', open ? '#14603f' : '#566578');
      q('plR' + k).setAttribute('stroke', col);
      q('plC' + k).setAttribute('stroke', col);
      var f = Math.max(0, Math.min(1, S['v' + k] / (S.cap || 100))), h = (CY1 - CY0 - 13) * f;
      q('plF' + k).setAttribute('height', h.toFixed(1));
      q('plPi' + k).setAttribute('y', (CY0 + 3 + h).toFixed(1));
      q('plVol' + k).textContent = S['v' + k].toFixed(1) + ' cc · ' + (open ? 'connected' : 'isolated');
    });
    ['L', 'R'].forEach(function (k) {
      var conn = S['conn' + k] >= 1, plug = !conn && S['plug' + k] >= .5;
      q('plPlug' + k).style.display = plug ? '' : 'none';
      q('plOpen' + k).style.display = !conn && !plug ? '' : 'none';
      q('plExt' + k).style.display = conn ? '' : 'none';
      if (k === 'L') q('plExtLL').setAttribute('stroke', S.cellValve >= .5 ? COL.hdr : COL.off);
      q('plPt' + k).textContent = conn ? 'tubing connected' : plug ? 'pressure-rated plug' : 'open end · 0 psig only';
      q('plPt' + k).setAttribute('y', Y + (k === 'L' && conn ? 92 : 40));   // below the Cell Valve labels when the charge line is fitted
    });
    q('plCV').setAttribute('fill', S.cellValve >= .5 ? '#ffffff' : '#1d2836');
    var rows = [
      ['Port L ↔ Port R', true, 'Always connected (no valve between the ports)'],
      ['Pump A ↔ header + sensor', a, a ? 'Open: the sensor reads Pump A' : 'Isolated by the Pump A valve'],
      ['Pump B ↔ header + sensor', b, b ? 'Open: the sensor reads Pump B' : 'Isolated by the Pump B valve'],
      ['Pump A ↔ Pump B', a && b, a && b ? 'Connected: A ↔ B transfer possible' : 'Not connected: needs both valves open'],
      ['Sensor reads', true, 'Header' + (a ? ' + Pump A' : '') + (b ? ' + Pump B' : '') + (!a && !b ? ' only (cylinder pressures not measured)' : '')]
    ];
    // left column: what each valve isolates; right column: ports and sensor
    var pos = [[760, 732], [80, 732], [80, 760], [80, 788], [760, 760]];
    rows.forEach(function (r, i) { q('plRow' + i).innerHTML = row(r[0], r[1], r[2], pos[i][0], pos[i][1]); });
  }

  window.PVTPlumb = { svg: svg, update: update };
})();
