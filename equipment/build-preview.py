#!/usr/bin/env python3
"""Bundle the whole PVT Nexus app (this branch) into ONE self-contained HTML file for a
hosted review preview (claude.ai Artifact), separate from GitHub Pages.

Inlines theme.css, equipment.css, every <script src> of index.html, both 3D modules
(bottle3d.js, mrms3d.js) and the logo. The hosted page may load scripts only from approved
CDNs, so its import map points "three" at the same pinned release on jsDelivr
(three@0.160.0) instead of vendor/. The repository version always uses vendor/.
In the bundle the 3D modules are evaluated on page load (window.PB3DReady / MR3DReady);
the library still creates the 3D viewers only when a 3D view is opened.

    python3 equipment/build-preview.py OUTPUT.html
"""
import base64, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/'
logo = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(ROOT, 'assets', 'logo.png'), 'rb').read()).decode()

html = rd('index.html')
head_links = re.findall(r'<link[^>]+fonts[^>]*>', html)
scripts = re.findall(r'<script src="([^"]+)"></script>', html)
mount = re.search(r"<script>(DC\.mount[^<]*)</script>", html).group(1)

def js(p):
    s = rd(p).replace('assets/logo.png', logo)
    assert '</script' not in s.lower(), p
    return '<script>\n' + s + '\n</script>\n'

def module(p, hook):
    m = rd(p)
    assert 'export function mount' in m
    return '<script type="module">\n' + m.replace('export function mount', 'function mount') + '\nwindow.__' + hook + '({ mount });\n</script>\n'

def ready(name, hook):
    return ('<script>window.' + name + ' = new Promise(function (res, rej) { window.__' + hook + ' = res; '
            'setTimeout(function () { rej(new Error("3D library did not load")); }, 20000); }); window.' + name + '.catch(function () {});</script>\n')

# the artifact host adds the <!doctype>/<head>/<body> skeleton, so only the content is written
out = ('<title>PVT Nexus Preview</title>\n' + '\n'.join(head_links) + '\n'
       '<style>\n' + rd('theme.css') + '\n' + rd('equipment/equipment.css') + '\n</style>\n'
       '<script type="importmap">\n{ "imports": { "three": "' + CDN + 'build/three.module.min.js", '
       '"three/addons/": "' + CDN + 'examples/jsm/" } }\n</script>\n'
       '<div id="app"></div>\n'
       + ready('PB3DReady', 'pb3dResolve') + ready('MR3DReady', 'mr3dResolve')
       + ''.join(js(s) for s in scripts)
       + '<script>' + mount + '</script>\n'
       + module('equipment/bottle3d.js', 'pb3dResolve') + module('equipment/mrms3d.js', 'mr3dResolve')
)
open(sys.argv[1], 'w', encoding='utf-8').write(out)
print('wrote', sys.argv[1], len(out), 'bytes')
