#!/usr/bin/env python3
"""Bundle the PVT Cell prototype into ONE self-contained HTML file for the hosted
preview (claude.ai Artifact). Inlines cell.css, the approved bottle drawing
(equipment/bottle-draw.js), plumbing.js, pvt-cell.js, app.js and the logo.

    python3 prototypes/pvt-cell/build-preview.py OUTPUT.html
"""
import base64, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(HERE, p), encoding='utf-8').read()

html = rd('index.html')
body = re.search(r'<body>(.*?)<script', html, re.S).group(1)
logo = base64.b64encode(open(os.path.join(HERE, '..', '..', 'assets', 'logo.png'), 'rb').read()).decode()
body = body.replace('src="../../assets/logo.png"', 'src="data:image/png;base64,' + logo + '"')

out = (
    '<title>PVT Cell Prototype</title>\n'
    '<meta name="claude:viewport-fit-sides" content="cover">\n'
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
    '<style>\n' + rd('cell.css') + '\n</style>\n'
    + body.strip() + '\n'
    '<script>\n' + rd('../../equipment/bottle-draw.js') + '\n</script>\n'
    '<script>\n' + rd('plumbing.js') + '\n</script>\n'
    '<script>\n' + rd('pvt-cell.js') + '\n</script>\n'
    '<script>\n' + rd('app.js') + '\n</script>\n'
)
open(sys.argv[1], 'w', encoding='utf-8').write(out)
print('wrote', sys.argv[1], len(out), 'bytes')
