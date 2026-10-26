#!/usr/bin/env python3
"""Bundle the Flash equipment prototype into ONE self-contained HTML file for the hosted
preview (claude.ai Artifact). Inlines flash.css, the project report data, the approved PVT Cell
drawing (components/PVTCellArt.js), the prototype scripts and the logo.

    python3 prototypes/flash-unit/build-preview.py OUTPUT.html
"""
import base64, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(HERE, p), encoding='utf-8').read()

html = rd('index.html')
body = re.search(r'<body>(.*?)<script', html, re.S).group(1)
logo = base64.b64encode(open(os.path.join(HERE, '..', '..', 'assets', 'logo.png'), 'rb').read()).decode()
body = body.replace('src="../../assets/logo.png"', 'src="data:image/png;base64,' + logo + '"')
scripts = re.findall(r'<script src="([^"]+)"></script>', html)

out = (
    '<title>Flash Equipment Prototype</title>\n'
    '<meta name="claude:viewport-fit-sides" content="cover">\n'
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
    '<style>\n' + rd('flash.css') + '\n</style>\n'
    + body.strip() + '\n'
    + ''.join('<script>\n' + rd(s) + '\n</script>\n' for s in scripts)
)
open(sys.argv[1], 'w', encoding='utf-8').write(out)
print('wrote', sys.argv[1], len(out), 'bytes')
