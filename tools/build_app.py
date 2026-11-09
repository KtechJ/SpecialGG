"""Builds the installable Android app (a PWA for GitHub Pages) from Index.html.

Usage:  python3 tools/build_app.py            -> writes docs/
The docs/ folder is what GitHub Pages serves (Settings -> Pages -> Branch: main, /docs). Only config.js needs the Apps Script URL.
"""
import json, os, re, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'docs')
os.makedirs(OUT, exist_ok=True)

NAME, SHORT, COLOR, BG = 'Special Gadi Ghar', 'Gadi Ghar', '#1f4e79', '#f4f1ea'

# ---- index.html: same screens as Index.html, plus app bits
src = open(os.path.join(ROOT, 'Index.html'), encoding='utf-8').read()
src = src.replace('<base target="_top">\n', '')
head_extra = f'''<title>{NAME}</title>
<meta name="theme-color" content="{COLOR}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<script src="config.js"></script>
'''
src = src.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + head_extra, 1)
sw = """
<script>
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
</script>
</body>"""
src = src[::-1].replace('</body>'[::-1], sw[::-1], 1)[::-1]
assert 'config.js' in src and 'serviceWorker' in src
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(src)

# ---- config.js: only written if missing, so the real URL is never overwritten
cfg = os.path.join(OUT, 'config.js')
if not os.path.exists(cfg):
    open(cfg, 'w').write("""// Paste the Web app URL of the "Execute as: Me / Anyone" deployment between the quotes.
// It is not a secret: every request still needs a PIN login.
window.SHOP_APP = {
  url: 'PASTE_APPS_SCRIPT_URL_HERE',
  shop: 'Special Gadi Ghar'
};
""")

# ---- manifest
json.dump({
  "name": NAME, "short_name": SHORT, "start_url": "./", "scope": "./", "display": "standalone",
  "background_color": BG, "theme_color": COLOR, "orientation": "portrait",
  "description": "Stock, orders, bahi khata and reports for Special Gadi Ghar, Jalna",
  "icons": [
    {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
    {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ]
}, open(os.path.join(OUT, 'manifest.webmanifest'), 'w'), indent=2)

# ---- service worker: keeps the app shell for fast start; data always comes live from the sheet
open(os.path.join(OUT, 'sw.js'), 'w').write("""const CACHE = 'sgg-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Network first (so updates arrive), cache as fallback. Only this site's own files; never the shop data.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('config.js')) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request)));
});
""")

# ---- icons: a bed/gadi mark with the shop initials
def icon(size, maskable=False):
    im = Image.new('RGB', (size, size), COLOR)
    d = ImageDraw.Draw(im)
    s = size / 512
    pad = 90 * s if maskable else 40 * s
    # rounded "gadi": a cushioned mattress with tufting
    x0, y0, x1, y1 = pad + 20 * s, size * 0.50, size - pad - 20 * s, size * 0.70
    d.rounded_rectangle([x0, y0, x1, y1], radius=40 * s, fill='#f4f1ea')
    for i in range(1, 5):
        cx = x0 + (x1 - x0) * i / 5
        d.ellipse([cx - 9 * s, (y0 + y1) / 2 - 9 * s, cx + 9 * s, (y0 + y1) / 2 + 9 * s], fill=COLOR)
    d.rounded_rectangle([x0 + 10 * s, y0 - 46 * s, x0 + 150 * s, y0 - 6 * s], radius=18 * s, fill='#e8b04b')  # pillow
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int((120 if not maskable else 96) * s))
    except OSError:
        f = ImageFont.load_default()
    t = 'SGG'
    w = d.textlength(t, font=f)
    d.text(((size - w) / 2, size * (0.16 if not maskable else 0.22)), t, font=f, fill='#ffffff')
    return im

icon(192).save(os.path.join(OUT, 'icon-192.png'))
icon(512).save(os.path.join(OUT, 'icon-512.png'))
icon(512, True).save(os.path.join(OUT, 'icon-maskable-512.png'))
print('built', OUT, sorted(os.listdir(OUT)))
