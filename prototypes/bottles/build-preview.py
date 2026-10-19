#!/usr/bin/env python3
"""Bundle the prototype into ONE self-contained HTML file for the hosted preview
(claude.ai Artifact). Inlines bottles.css, bottle-draw.js, app.js, the 3D module
and the logo.

The hosted page may load scripts only from approved CDNs, so its import map points
"three" at the same pinned release on jsDelivr (three@0.160.0) instead of the copy
in vendor/. The repository version always uses vendor/.

    python3 prototypes/bottles/build-preview.py OUTPUT.html
"""
import base64, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(HERE, p), encoding='utf-8').read()
CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/'

html = rd('index.html')
body = re.search(r'<body>(.*?)<script', html, re.S).group(1)
logo = base64.b64encode(open(os.path.join(HERE, '..', '..', 'assets', 'logo.png'), 'rb').read()).decode()
body = body.replace('src="../../assets/logo.png"', 'src="data:image/png;base64,' + logo + '"')

mod = rd('bottle3d.js')
assert 'export function mount' in mod
mod = mod.replace('export function mount', 'function mount') + '\nwindow.__pb3dResolve({ mount });\n'

out = (
    '<meta charset="utf-8">\n<title>Sample Bottle Designs</title>\n'
    '<meta name="claude:viewport-fit-sides" content="cover">\n'
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
    '<style>\n' + rd('bottles.css') + '\n</style>\n'
    + body.strip() + '\n'
    '<script type="importmap">\n{ "imports": { "three": "' + CDN + 'build/three.module.min.js", '
    '"three/addons/": "' + CDN + 'examples/jsm/" } }\n</script>\n'
    # app.js asks for window.PB3DReady instead of importing ./bottle3d.js; give up after 20 s
    '<script>window.PB3DReady = new Promise(function (res, rej) { window.__pb3dResolve = res; '
    'setTimeout(function () { rej(new Error("3D library did not load")); }, 20000); });'
    ' window.PB3DReady.catch(function () {});</script>\n'
    '<script>\n' + rd('bottle-draw.js') + '\n</script>\n'
    '<script>\n' + rd('app.js') + '\n</script>\n'
    '<script type="module">\n' + mod + '</script>\n'
)
open(sys.argv[1], 'w', encoding='utf-8').write(out)
print('wrote', sys.argv[1], len(out), 'bytes')
