/* ==========================================================================
   PVT Cell prototype — plumbing view (PVTPlumb)

   A schematic of the cell's built-in plumbing, drawn from the SAME state as
   the equipment views (valve states, ports, volumes, header pressure).

   Port isolation valves: one directly at Port L and one at Port R, outside
   the enclosure (per review). The cylinder-valve arrangement is still
   INFERRED from the existing simulator code, not from the real equipment:
     - showTest.js Charge: Pump B and Pump A valves sit on tees of one top
       header; Charge fills Pump A through the header past the closed Pump B
       valve; the pressure sensor tees into the header between them.
     - showTest.js Flash: sample leaves from the right end of the same header.
   So each cylinder valve isolates only its own cylinder, and each port
   reaches the header only through its own isolation valve.
   ========================================================================== */
(function () {
  'use strict';
  var Y = 300, PL = 140, VL = 250, VR = 1186, PR = 1296, XB = 520, XA = 916, XS = 718;
  var VY = 372, CY0 = 446, CY1 = 626, CW = 50;
  var COL = { hdr: '#2f6fd0', L: '#7b61a8', A: '#c27a12', B: '#138a72', off: '#a9b3c0' };
  var F = 'font-family="IBM Plex Sans, sans-serif"', M = 'font-family="IBM Plex Mono, monospace"';
  function T(x, y, s, a) { return '<text x="' + x + '" y="' + y + '" ' + (a || '') + '>' + s + '</text>'; }
  function line(id, d, w, col) { return '<path id="' + id + '" d="' + d + '" fill="none" stroke="' + (col || COL.hdr) + '" stroke-width="' + (w || 7) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
  // ISA valve symbol (bowtie); vertical: flow up/down, horizontal: flow left/right
  function bowtie(id, x, y, vert) {
    var d = vert ? 'M' + (x - 16) + ' ' + (y - 22) + ' H' + (x + 16) + ' L' + (x - 16) + ' ' + (y + 22) + ' H' + (x + 16) + ' Z'
                 : 'M' + (x - 22) + ' ' + (y - 16) + ' V' + (y + 16) + ' L' + (x + 22) + ' ' + (y - 16) + ' V' + (y + 16) + ' Z';
    return '<path id="' + id + '" d="' + d + '" fill="#ffffff" stroke="#1d2836" stroke-width="2.2" stroke-linejoin="round"/>';
  }

  function svg() {
    var o = '';
    // banner: what is confirmed and what is still inferred
    o += '<rect x="60" y="44" width="1316" height="62" rx="8" fill="#fdf3e1" stroke="#d9a24a" stroke-width="1.4"/>';
    o += T(80, 70, 'CYLINDER-VALVE ARRANGEMENT INFERRED FROM SIMULATOR CODE — CONFIRM AGAINST THE REAL EQUIPMENT', M + ' font-size="14.5" font-weight="700" letter-spacing=".5" fill="#8a5a12"');
    o += T(80, 94, 'Per review: an isolation valve directly at Port L and at Port R, outside the enclosure. Inferred: Pump B / Pump A valves sit on header tees (Charge page).', F + ' font-size="14" fill="#5b4a2a"');
    o += T(718, 150, '', 'id="plState" text-anchor="middle" ' + F + ' font-size="24" font-weight="700" fill="#1d2836"');
    // legend
    [['hdr', 'Connected to the header and sensor'], ['L', 'Port line isolated'], ['A', 'Pump A isolated'], ['B', 'Pump B isolated']].forEach(function (l, i) {
      var x = [190, 560, 830, 1060][i];
      o += '<rect x="' + x + '" y="166" width="22" height="7" rx="3.5" fill="' + COL[l[0]] + '"/>' + T(x + 30, 174, l[1], F + ' font-size="14" fill="#3a4759"');
    });
    // outward port ends -> port isolation valves (outside the enclosure) -> header (Pump B tee - sensor - Pump A tee)
    o += line('plLineL', 'M' + PL + ' ' + Y + ' H' + (VL - 22), 7, COL.L);
    o += line('plLineR', 'M' + (VR + 22) + ' ' + Y + ' H' + PR, 7, COL.L);
    o += line('plHdr', 'M' + (VL + 22) + ' ' + Y + ' H' + (VR - 22) + ' M' + XS + ' ' + Y + ' V236 M' + XB + ' ' + Y + ' V' + (VY - 22) + ' M' + XA + ' ' + Y + ' V' + (VY - 22));
    [XB, XS, XA].forEach(function (x) { o += '<circle cx="' + x + '" cy="' + Y + '" r="6" fill="#1d2836"/>'; });
    o += T((VL + XB) / 2 + 10, Y - 14, 'built-in header', 'text-anchor="middle" ' + F + ' font-size="14" font-style="italic" fill="#566578"');
    // enclosure wall between each port valve and the header (valves are outside it)
    [VL + 46, VR - 46].forEach(function (x) { o += '<line x1="' + x + '" y1="' + (Y - 70) + '" x2="' + x + '" y2="' + (Y + 70) + '" stroke="#1d3a66" stroke-width="2" stroke-dasharray="8 6"/>'; });
    [['L', VL], ['R', VR]].forEach(function (v) {
      o += bowtie('plV' + v[0], v[1], Y, false);
      o += T(v[1], Y - 52, 'Port ' + v[0] + ' valve', 'text-anchor="middle" ' + F + ' font-size="16" font-weight="600" fill="#1d2836"') + T(v[1], Y - 34, 'outside the enclosure', 'text-anchor="middle" ' + F + ' font-size="12.5" fill="#566578"');
      o += T(v[1], Y + 44, '', 'id="plVt' + v[0] + '" text-anchor="middle" ' + M + ' font-size="14" font-weight="700"');
    });
    o += T(VL + 54, Y + 66, 'enclosure', F + ' font-size="12" font-style="italic" fill="#1d3a66"') + T(VR - 54, Y + 66, 'enclosure', 'text-anchor="end" ' + F + ' font-size="12" font-style="italic" fill="#1d3a66"');
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
    // ports (plug / open / external tubing)
    [['L', PL, -1], ['R', PR, 1]].forEach(function (p) {
      var k = p[0], x = p[1], s = p[2];
      o += T(x, Y - 40, 'Port ' + k, 'text-anchor="middle" ' + F + ' font-size="17" font-weight="700" fill="#1d2836"') + T(x, Y - 22, 'outward end', 'text-anchor="middle" ' + F + ' font-size="12.5" fill="#566578"');
      o += '<g id="plPlug' + k + '"><rect x="' + (s < 0 ? x - 14 : x) + '" y="' + (Y - 16) + '" width="14" height="32" rx="2" fill="#1d3a66"/></g>';
      o += '<circle id="plOpen' + k + '" cx="' + x + '" cy="' + Y + '" r="9" fill="#ffffff" stroke="#b0701a" stroke-width="3"/>';
      var x2 = s < 0 ? 64 : 1372;
      // external tubing (dashed = not built in), same colour as the volume it is open to
      o += '<g id="plExt' + k + '"><path id="plExtP' + k + '" d="M' + x + ' ' + Y + ' H' + x2 + '" fill="none" stroke="' + COL.L + '" stroke-width="5" stroke-dasharray="10 6" stroke-linecap="round"/>' +
        T(x2, Y + 26, k === 'L' ? 'to bottle' : 'to equipment', (k === 'L' ? '' : 'text-anchor="end" ') + F + ' font-size="13" fill="#566578"') + '</g>';
      o += T(x, Y + 50, '', 'id="plPt' + k + '" text-anchor="middle" ' + M + ' font-size="13" font-weight="600" fill="#566578"');
      o += T(x, Y + 68, '', 'id="plPx' + k + '" text-anchor="middle" ' + M + ' font-size="13" font-weight="600" fill="#7b61a8"');
    });
    // connectivity read-out
    o += '<rect x="60" y="700" width="1316" height="100" rx="8" fill="#ffffff" stroke="#c9d1db" stroke-width="1.2"/>';
    for (var i = 0; i < 7; i++) o += '<g id="plRow' + i + '"></g>';
    return o;
  }

  function row(label, ok, text, x, y) {
    return '<circle cx="' + (x + 8) + '" cy="' + (y - 5) + '" r="7" fill="' + (ok ? '#2fa66f' : '#a9b3c0') + '"/>' +
      T(x + 24, y, label, 'font-family="IBM Plex Sans, sans-serif" font-size="15" font-weight="600" fill="#1d2836"') +
      T(x + 232, y, text, 'font-family="IBM Plex Sans, sans-serif" font-size="15" fill="' + (ok ? '#14603f' : '#566578') + '"');
  }

  var LAST = '';
  function update(root, S) {
    var a = S.valveA >= .5, b = S.valveB >= .5, vl = S.valveL >= .5, vr = S.valveR >= .5, q = function (id) { return root.querySelector('#' + id); };
    var key = [a, b, vl, vr, Math.round(S.P), Math.round(S.PextL || 0), Math.round(S.PextR || 0), S.vA.toFixed(1), S.vB.toFixed(1), S.plugL >= .5, S.plugR >= .5, S.connL >= 1, S.connR >= 1].join('|');
    if (key === LAST) return; LAST = key;
    q('plState').textContent = (a && b ? 'Both cylinder valves open' : a ? 'Only the Pump A valve open' : b ? 'Only the Pump B valve open' : 'Both cylinder valves closed') + ' · Port valves L ' + (vl ? 'open' : 'closed') + ', R ' + (vr ? 'open' : 'closed');
    q('plP').textContent = Math.round(S.P).toLocaleString('en-US') + ' psig';
    [['A', a], ['B', b], ['L', vl], ['R', vr]].forEach(function (c) {
      var k = c[0], open = c[1];
      q('plV' + k).setAttribute('fill', open ? '#ffffff' : '#1d2836');   // ISA: filled = closed
      q('plVt' + k).textContent = open ? 'OPEN' : 'CLOSED';
      q('plVt' + k).setAttribute('fill', open ? '#14603f' : '#566578');
      if (k === 'L' || k === 'R') {
        var col = open ? COL.hdr : COL.L;
        q('plLine' + k).setAttribute('stroke', col); q('plExtP' + k).setAttribute('stroke', col);
        q('plPx' + k).textContent = open ? 'line = header' : 'line ' + Math.round(S['Pext' + k] || 0).toLocaleString('en-US') + ' psig';
        return;
      }
      col = open ? COL.hdr : COL[k];
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
      q('plPt' + k).textContent = conn ? 'tubing connected' : plug ? 'pressure-rated plug' : 'open end · 0 psig only';
    });
    var rows = [
      ['Port L ↔ header', vl, vl ? 'Connected (Port L valve open)' : 'Isolated by the Port L valve'],
      ['Pump A ↔ header + sensor', a, a ? 'Open: the sensor reads Pump A' : 'Isolated by the Pump A valve'],
      ['Pump B ↔ header + sensor', b, b ? 'Open: the sensor reads Pump B' : 'Isolated by the Pump B valve'],
      ['Pump A ↔ Pump B', a && b, a && b ? 'Connected: A ↔ B transfer possible' : 'Not connected: needs both valves open'],
      ['Port R ↔ header', vr, vr ? 'Connected (Port R valve open)' : 'Isolated by the Port R valve'],
      ['Sensor reads', true, 'Header' + (a ? ' + Pump A' : '') + (b ? ' + Pump B' : '') + (vl ? ' + L line' : '') + (vr ? ' + R line' : '') + (!a && !b ? ' (cylinders not measured)' : '')],
      ['Port L ↔ Port R', vl && vr, vl && vr ? 'Connected through the header' : 'Not connected: needs both port valves open']
    ];
    // left column: cylinder valves + sensor; right column: ports
    var pos = [[760, 724], [80, 724], [80, 748], [80, 772], [760, 748], [80, 796], [760, 772]];
    rows.forEach(function (r, i) { q('plRow' + i).innerHTML = row(r[0], r[1], r[2], pos[i][0], pos[i][1]); });
  }

  window.PVTPlumb = { svg: svg, update: update };
})();
