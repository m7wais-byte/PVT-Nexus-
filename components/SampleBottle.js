/* ==========================================================================
   SampleBottle — shared piston sample bottle (SPS/PDS type) for the Sampling
   section. Drawn with the approved Oil / Gas Sample Bottle designs
   (components/BottleArt.js); the frame below is unchanged. Geometry, gradients and valves are taken 1:1 from the SPS/PDS
   bottle drawn in Validation / Restoration (screens/showRestore.js,
   "SPS/PDS BOTTLE" block, coordinates 258..342 x 74..417), so every sample /
   transport bottle in Sampling is the same drawing, only scaled and placed.

   Coordinates below are the Restoration coordinates. place() maps the top
   port (300, 74) to (x, y) and scales by s, so tubing that ends at (x, y)
   meets the top port exactly.

   Field orientation: sample side on top (the port the sampling line connects
   to), floating piston, buffer side below (water or N2). Restoration shows the
   same bottle inverted in the laboratory (water on top, oil below).

   Usage (inside a DC.slot template literal, evaluated at load time):
     ${SampleBottle.defs('wb')}                      -> inside <defs>
     ${SampleBottle.markup({ p:'wb', x, y, s, sample:'{{ a }}', buffer:'{{ b }}',
        piston:'{{ c }}', buf:'n2', letters:true })}
     mode:'gas' -> same shell, single gas chamber, no piston / buffer side.
   ========================================================================== */
(function () {
  var TOP_X = 300, TOP_Y = 74;          // top port centre (Restoration coords)
  var CH_Y = 134, CH_H = 204, PIST = 12; // chamber bore + piston (same as QC_BORE / QC_PIST)

  function defs(p) {
    return '' +
      '<linearGradient id="' + p + 'Metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#283750"></stop><stop offset=".15" stop-color="#6377a0"></stop><stop offset=".42" stop-color="#b3c1d8"></stop><stop offset=".58" stop-color="#7e90b0"></stop><stop offset=".8" stop-color="#41506e"></stop><stop offset="1" stop-color="#1f2a3e"></stop></linearGradient>' +
      '<linearGradient id="' + p + 'Cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a485f"></stop><stop offset=".2" stop-color="#8094b2"></stop><stop offset=".5" stop-color="#aebcd2"></stop><stop offset=".8" stop-color="#54657f"></stop><stop offset="1" stop-color="#222c3e"></stop></linearGradient>' +
      '<linearGradient id="' + p + 'Pipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e82a4"></stop><stop offset=".4" stop-color="#9cb0cd"></stop><stop offset=".55" stop-color="#41526c"></stop><stop offset="1" stop-color="#232f44"></stop></linearGradient>' +
      '<linearGradient id="' + p + 'Sample" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7b15a"></stop><stop offset="1" stop-color="#c07f2e"></stop></linearGradient>' +
      '<linearGradient id="' + p + 'Water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa6d8"></stop><stop offset="1" stop-color="#2f6f9c"></stop></linearGradient>' +
      '<linearGradient id="' + p + 'N2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb6c9" stop-opacity=".85"></stop><stop offset="1" stop-color="#3d6577" stop-opacity=".9"></stop></linearGradient>' +
      '<linearGradient id="' + p + 'Gas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d3efff"></stop><stop offset="1" stop-color="#7fb4dc"></stop></linearGradient>' +
      '<symbol id="' + p + 'Hw" sc-camel-view-box="0 0 30 30" overflow="visible"><circle cx="15" cy="15" r="12.5" fill="none" stroke="#0a0e16" stroke-width="4.5"></circle><circle cx="15" cy="15" r="12.5" fill="none" stroke="#aebccf" stroke-width="2.6"></circle><g stroke="#9fb0c8" stroke-width="2.2" stroke-linecap="round"><line x1="15" y1="15" x2="15" y2="3.5"></line><line x1="15" y1="15" x2="15" y2="26.5"></line><line x1="15" y1="15" x2="3.5" y2="15"></line><line x1="15" y1="15" x2="26.5" y2="15"></line></g><circle cx="15" cy="15" r="4" fill="url(#' + p + 'Metal)" stroke="#0a0e16" stroke-width="1"></circle></symbol>' +
      '<clipPath id="' + p + 'Chm"><rect x="263" y="' + CH_Y + '" width="74" height="' + CH_H + '"></rect></clipPath>' +
      '<clipPath id="' + p + 'GasIn"><path d="' + window.BottleArt.gasPaths({ cx: 300, R: 42, y0: 112, y1: 360, rn: 10, sh: 40, wall: 5 }).inner + '"></path></clipPath>' +
      window.BottleArt.defs(p);
  }

  function place(x, y, s) {
    return 'translate(' + (x - TOP_X * s).toFixed(2) + ' ' + (y - TOP_Y * s).toFixed(2) + ') scale(' + s + ')';
  }

  /* Body = the approved Oil / Gas Sample Bottle designs (components/BottleArt.js), drawn in these
     Restoration coordinates: bore window, valve hardware and ports are unchanged, so every fill
     style, piston transform and tube end still lines up. o.mix = false hides the mixing ring. */
  var BODY = { cx: 300, rb: 37, y0: CH_Y, y1: CH_Y + CH_H, R: 42, capR: 46, capH: 18 };
  var GAS = { cx: 300, R: 42, y0: 112, y1: 360, rn: 10, sh: 40, wall: 5 };
  function valve(p, top, o) {
    var m = '';
    if (top) {
      m += '<rect x="294" y="74" width="12" height="15" rx="1.5" fill="url(#' + p + 'Pipe)" stroke="#0a0e16" stroke-width="0.7"></rect>';
      m += '<rect x="284" y="89" width="32" height="17" rx="3" fill="url(#' + p + 'BkStD)" stroke="#0a0e16" stroke-width="0.9"></rect>';
      m += '<circle cx="327.5" cy="97.5" r="11.5" fill="none" stroke="' + (o.ring || '#8fa3c2') + '" stroke-width="1.6"></circle>';
      m += '<use href="#' + p + 'Hw" x="318" y="88" width="19" height="19"></use>';
      m += '<rect x="291" y="106" width="18" height="13" rx="2" fill="url(#' + p + 'BkStD)" stroke="#0a0e16" stroke-width="0.8"></rect>';
    } else {
      m += '<rect x="294" y="356" width="12" height="20" rx="1.5" fill="url(#' + p + 'Pipe)" stroke="#0a0e16" stroke-width="0.7"></rect>';
      m += '<rect x="284" y="376" width="32" height="17" rx="3" fill="url(#' + p + 'BkStD)" stroke="#0a0e16" stroke-width="0.9"></rect>';
      m += '<use href="#' + p + 'Hw" x="318" y="375" width="19" height="19"></use>';
      m += '<rect x="294" y="393" width="12" height="17" rx="1.5" fill="url(#' + p + 'Pipe)" stroke="#0a0e16" stroke-width="0.7"></rect>';
      m += '<rect x="290" y="410" width="20" height="7" rx="2" fill="url(#' + p + 'BkStD)" stroke="#0a0e16" stroke-width="0.7"></rect>';
    }
    return m;
  }
  function markup(o) {
    var p = o.p, gas = o.mode === 'gas', A = window.BottleArt;
    var buf = o.buf === 'n2' ? p + 'N2' : p + 'Water';
    var m = '<g transform="' + place(o.x, o.y, o.s) + '"' + (o.bd ? ' class="bd-hit" data-bd-open="' + o.bd + '"' + (o.bdCtx ? ' data-bd-ctx="' + o.bdCtx + '"' : '') : '') + '>';
    if (o.shadow !== false) m += '<ellipse cx="300" cy="424" rx="34" ry="5" fill="rgba(0,0,0,.28)"></ellipse>';
    if (gas) {
      // Gas Sample Bottle: seamless shell, tapered shoulders, isolation valve at each end; one gas volume (no piston, no level)
      m += valve(p, true, o) + valve(p, false, o);
      m += A.gasBody(p, GAS);
      m += '<g clip-path="url(#' + p + 'GasIn)"><rect x="258" y="112" width="84" height="248" fill="url(#' + p + 'Gas)" style="' + (o.sample || '') + '"></rect></g>';
      m += A.gasNipple(p, 300, 112, 9, -1, 8) + A.gasNipple(p, 300, 360, 9, 1, 8);
      m += '<rect x="268" y="156" width="5" height="160" rx="2.5" fill="#ffffff" opacity="0.16"></rect>';
      if (o.letters) m += '<text x="300" y="242" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="17" font-weight="600" fill="#0b2a40" opacity=".75">G</text>';
      return m + '</g>';
    }
    // Oil Sample Bottle: valve protectors around both valves, screwed caps, floating piston, mixing ring
    m += A.cage(p, 300, 116, 78, 43) + A.cage(p, 300, 356, 404, 43);
    m += valve(p, true, o) + valve(p, false, o);
    m += A.oilBody(p, BODY);
    m += '<g clip-path="url(#' + p + 'Chm)">';
    m += '<rect x="263" y="' + CH_Y + '" width="74" height="' + CH_H + '" fill="url(#' + buf + ')" opacity="0.9" style="' + (o.buffer || '') + '"></rect>';
    m += '<rect x="263" y="' + CH_Y + '" width="74" height="' + CH_H + '" fill="url(#' + p + 'Sample)" opacity="0.92" style="' + (o.sample || '') + '"></rect>';
    m += '</g>';
    // floating piston: top face on the sample / buffer boundary; the mixing ring rests on it (sample side, upright)
    m += '<g clip-path="url(#' + p + 'Chm)"><g style="' + (o.piston || '') + '">';
    if (o.mix !== false) m += A.ring(p, 300, 37, CH_Y - A.ringHalf(37));
    m += A.piston(p, 263, 74, CH_Y, PIST);
    m += '</g></g>';
    m += A.oilFront(p, BODY);
    if (o.letters) {
      m += '<text x="300" y="160" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="17" font-weight="600" fill="#3d2606" opacity=".8" style="' + (o.sampleLetter || '') + '">O</text>';
      m += '<text x="300" y="328" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="' + (o.buf === 'n2' ? 15 : 17) + '" font-weight="600" fill="' + (o.buf === 'n2' ? '#07202e' : 'var(--txt)') + '" opacity=".85">' + (o.buf === 'n2' ? 'N₂' : 'W') + '</text>';
    }
    return m + '</g>';
  }

  /* fill styles, same model as Restoration (qcWaterStyle / qcOilStyle / qcPistonStyle):
     g = sample fraction of the usable stroke (0..1) */
  var USE = CH_H - PIST;
  function styles(g, ease) {
    var e = ease || 'calc(2.8s * var(--pm, 1)) ease';
    return {
      sample: 'transform:scaleY(' + ((USE / CH_H) * g).toFixed(4) + '); transform-box:fill-box; transform-origin:top; transition:transform ' + e + ';',
      buffer: 'transform:scaleY(' + ((USE / CH_H) * (1 - g) + PIST / CH_H).toFixed(4) + '); transform-box:fill-box; transform-origin:bottom; transition:transform ' + e + ';',
      piston: 'transform:translateY(' + (USE * g).toFixed(1) + 'px); transition:transform ' + e + ';',
      pistonY: +(CH_Y + USE * g + PIST / 2).toFixed(1)
    };
  }

  window.SampleBottle = { defs: defs, markup: markup, place: place, styles: styles, TOP: [TOP_X, TOP_Y], H: 417 - 74, W: 84 };
})();
