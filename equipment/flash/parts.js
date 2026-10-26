/* Parts — small reusable equipment drawn in local units (origin and ports documented per part).
   Vessel   blue gas-collection vessel ("Gas Balloon" in the procedure): tall dark-blue cylinder,
            rounded shoulder, brass top valve with a large black knob and a small side connection.
            The vessel's own valve is its isolation valve. Origin: centre of the base.
   VacPump  portable vacuum pump, used only in Stage 2. Origin: centre of the base.
   Syringe  manual injection syringe. Origin: Luer tip; dir 'down' | 'left'.
   Waste    waste container with red cap. Origin: centre of the base.
   Drawing only. */
(function () {
  'use strict';
  var F = window.FX, R = F.R, C = F.C, E = F.E, P = F.P, L = F.L, T = F.T, MONO = F.MONO, r1 = F.r1;

  /* ------------------------------------------------------------ blue gas-collection vessel */
  var VG = { r: 30, h: 300, sh: 20, neck: 8, valve0: -328, valve1: -352, side: [-26, -340], knob: [-372, -352] };   // side connection faces left
  // o.stem: the valve is operated through an extension stem from above (Flash Unit top panel); no knob drawn here
  function vessel(V, o) {
    o = o || {};
    var g = VG, s = '', open = (V && V.valve ? V.valve.vessel : 0) || 0, top = -g.h;
    if (!o.stem && !o.neck) s += E(0, 2, g.r + 10, 5, 'fill="#1b2a40" opacity=".14"');
    s += R(-g.r - 4, -10, 2 * g.r + 8, 10, 'rx="' + (o.stem || o.neck ? 5 : 2) + '" fill="#1b2533"');      // foot ring / bottom cap
    s += P('M' + -g.r + ' -10 V' + top + ' Q' + -g.r + ' ' + (top - g.sh) + ' -9 ' + (top - g.sh - 2) + ' H9 Q' + g.r + ' ' + (top - g.sh) + ' ' + g.r + ' ' + top + ' V-10 Z', 'fill="url(#fxBlue)" stroke="#0e1c33" stroke-width="1.2"');
    s += R(-g.r + 7, top + 6, 6, g.h - 22, 'rx="3" fill="#fff" opacity=".22"');
    s += R(-g.r + 2, -60, 2 * g.r - 4, 3, 'fill="#0e1c33" opacity=".35"');
    if (o.neck) {
      // simple neck fitting only: the valve is at the manifold junction above (Flash Unit)
      s += R(-8, top - g.sh - 10, 16, 12, 'fill="url(#fxBrass)" stroke="#6b4e12" stroke-width=".8"') + R(-7, top - g.sh - 14, 14, 6, 'rx="1.5" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"');
    } else {
      // brass valve: neck, body with side connection, stem, large black knob
      s += R(-8, top - g.sh - 10, 16, 12, 'fill="url(#fxBrass)" stroke="#6b4e12" stroke-width=".8"');
      s += R(-14, g.valve1, 28, g.valve0 - g.valve1 + 6, 'rx="3" fill="url(#fxBrass)" stroke="#6b4e12" stroke-width="1"');
      s += R(-26, g.side[1] - 4, 12, 8, 'rx="1.5" fill="url(#fxBrass)" stroke="#6b4e12" stroke-width=".8"') + R(-30, g.side[1] - 5.5, 6, 11, 'rx="1.5" fill="url(#fxBrass)" stroke="#6b4e12" stroke-width=".8"');
    }
    if (!o.stem && !o.neck) {
      s += R(-4, g.knob[1] - 6, 8, 8, 'fill="url(#fxBrass)" stroke="#6b4e12" stroke-width=".7"');
      s += R(-22, g.knob[0], 44, g.knob[1] - g.knob[0] - 4, 'rx="5" fill="#1b1f24" stroke="#000" stroke-width="1"');
      for (var i = -16; i <= 16; i += 6) s += L(i, g.knob[0] + 3, i, g.knob[1] - 7, 'stroke="#3a414b" stroke-width="1.4"');
      // open indication: ring and tag beside the knob
      s += C(0, g.knob[0] + 8, 30, 'fill="none" stroke="#1d8a5a" stroke-width="2" opacity="' + (open > 0.5 ? .9 : 0) + '"');
      s += R(-26, g.knob[0] - 26, 52, 16, 'rx="8" fill="' + (open > 0.5 ? '#dff3e8' : '#e4e8ee') + '" stroke="' + (open > 0.5 ? '#4fae80' : '#9aa6b5') + '" stroke-width=".9"') +
        T(0, g.knob[0] - 14, open > 0.5 ? 'OPEN' : 'CLOSED', 'text-anchor="middle" ' + MONO + ' font-size="9" font-weight="700" fill="' + (open > 0.5 ? '#14603f' : '#566578') + '"');
    }
    // gas inside (cutaway hint): a faint fill that grows with the collected gas
    var f = F.clamp(((V && V.balloon) || 0) / 250, 0, 1);
    if (f > 0.01) s += R(-g.r + 3, top + 2, 2 * g.r - 6, g.h - 14, 'rx="3" fill="#2fa88a" opacity="' + r1(0.10 + 0.25 * f) + '"');
    return s;
  }
  // gas route through the valve: side connection -> valve body -> into the vessel
  var vesselRoute = F.path(VG.side[0] - 6, VG.side[1]).H(0).V(-VG.h + 4).end();

  /* ------------------------------------------------------------ portable vacuum pump */
  var PG = { w: 150, h: 84, inlet: [44, -96] };
  function vacPump(V) {
    var s = '', w = PG.w, h = PG.h, run = V && V.valve && V.valve.vac > 0.5;
    s += E(0, 2, w / 2 + 8, 5, 'fill="#1b2a40" opacity=".14"');
    s += R(-w / 2, -14, w, 14, 'rx="3" fill="#2b3340"');
    s += R(-w / 2 + 6, -h, 86, h - 14, 'rx="8" fill="url(#fxCaseH)" stroke="#7d8898" stroke-width="1.2"');      // motor
    for (var i = 0; i < 6; i++) s += L(-w / 2 + 14 + i * 12, -h + 12, -w / 2 + 14 + i * 12, -24, 'stroke="#aab4c0" stroke-width="2"');
    s += R(w / 2 - 66, -h + 8, 60, h - 22, 'rx="6" fill="url(#fxPumpBlue)" stroke="#123056" stroke-width="1.2"'); // pump head
    s += R(-14, -h - 14, 28, 10, 'rx="3" fill="#1b1f24"');                                                    // handle
    s += L(-10, -h - 4, -10, -h, 'stroke="#1b1f24" stroke-width="4"') + L(10, -h - 4, 10, -h, 'stroke="#1b1f24" stroke-width="4"');
    s += R(PG.inlet[0] - 6, -h - 12, 12, 14, 'rx="2" fill="url(#ppSteelD)" stroke="#2a3443" stroke-width=".8"');   // inlet port
    s += C(-w / 2 + 20, -26, 4, 'fill="' + (run ? '#2fbf7f' : '#c9d0d9') + '" stroke="#5d6878" stroke-width=".8"');
    s += T(-w / 2 + 50, -26, 'VACUUM', 'text-anchor="middle" ' + MONO + ' font-size="8.5" font-weight="700" letter-spacing=".8" fill="#33404f"');
    return s;
  }

  /* ------------------------------------------------------------ syringe (Luer tip at the origin) */
  function syringe(fill, dir, label) {
    var bw = 18, bh = 96, s = '', fh = (bh - 10) * F.clamp(fill, 0, 1);
    var g = '';
    g += R(-3.5, -10, 7, 10, 'fill="#e9edf2" stroke="#7d8898" stroke-width=".8"');
    g += R(-bw / 2, -10 - bh, bw, bh, 'rx="3" fill="#f6f9fc" fill-opacity=".9" stroke="#7d8898" stroke-width="1.1"');
    if (fh > .3) g += R(-bw / 2 + 2, -12 - fh, bw - 4, fh, 'fill="url(#fxOil)"');
    for (var i = 1; i < 6; i++) g += L(bw / 2 - 6, -14 - i * 15, bw / 2 - 1, -14 - i * 15, 'stroke="#566578" stroke-width=".7"');
    var pl = -14 - fh - 6;
    g += R(-bw / 2 + 1, pl, bw - 2, 6, 'fill="#3a4553"') + R(-2, pl - 58, 4, 58, 'fill="#c9d0d9" stroke="#7d8898" stroke-width=".6"') + R(-12, pl - 62, 24, 5, 'rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"');
    g += R(-bw / 2 - 6, -12 - bh, bw + 12, 4, 'rx="2" fill="#c9d0d9" stroke="#7d8898" stroke-width=".8"');
    s += dir === 'left' ? '<g transform="rotate(90)">' + g + '</g>' : g;
    if (label) s += T(dir === 'left' ? 30 : 16, dir === 'left' ? -18 : -84, label, 'font-family="IBM Plex Sans, sans-serif" font-size="12" font-weight="600" fill="#33404f"');
    return s;
  }

  /* ------------------------------------------------------------ waste container (red cap) */
  var WG = { w: 64, h: 110, ports: [[-12, -126], [12, -126]] };
  function waste(fill) {
    var s = '', w = WG.w, h = WG.h;
    s += E(0, 2, w / 2 + 6, 4, 'fill="#1b2a40" opacity=".12"');
    s += P('M' + (-w / 2) + ' 0 V' + (-h + 14) + ' Q' + (-w / 2) + ' ' + (-h + 2) + ' -16 ' + (-h) + ' H16 Q' + (w / 2) + ' ' + (-h + 2) + ' ' + (w / 2) + ' ' + (-h + 14) + ' V0 Z', 'fill="url(#fxGlass)" stroke="#7fa6c2" stroke-width="1.4"');
    var f = F.clamp(fill || 0, 0, 1);
    if (f > 0) s += R(-w / 2 + 3, -4 - 26 * f, w - 6, 26 * f + 2, 'fill="url(#fxOil)" opacity=".9"');
    s += R(-17, -h - 16, 34, 18, 'rx="3" fill="#c8323c" stroke="#7e1a22" stroke-width="1"');
    WG.ports.forEach(function (p) { s += R(p[0] - 3, p[1], 6, 12, 'fill="#e9edf2" stroke="#7d8898" stroke-width=".7"'); });
    s += T(0, 16, 'waste', 'text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="10" fill="#566578"');
    return s;
  }

  window.Parts = { VG: VG, PG: PG, WG: WG, vessel: vessel, vesselRoute: vesselRoute, vacPump: vacPump, syringe: syringe, waste: waste };
})();
