# -*- coding: utf-8 -*-
# Tải âm thanh reaction của model Shizuku + kiểm tra thư viện vendor
import os, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku'
DEST = os.path.join(ROOT, 'assets', 'models', 'shizuku', 'sounds')
NAMES = ['tapBody_00', 'tapBody_01', 'tapBody_02',
         'pinchIn_00', 'pinchIn_01', 'pinchIn_02',
         'pinchOut_00', 'pinchOut_01', 'pinchOut_02',
         'shake_00', 'shake_01', 'shake_02',
         'flickHead_00', 'flickHead_01', 'flickHead_02']

os.makedirs(DEST, exist_ok=True)
ok = fail = 0
for n in NAMES:
    url = '%s/sounds/%s.mp3' % (BASE, n)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=25) as r:
            data = r.read()
        with open(os.path.join(DEST, n + '.mp3'), 'wb') as f:
            f.write(data)
        ok += 1
    except Exception as e:
        fail += 1
        print('FAIL %-14s %s' % (n, e))

print('sounds: %d ok / %d fail' % (ok, fail))

# Kiểm tra tên global của pixi-live2d-display (UMD)
v = os.path.join(ROOT, 'assets', 'vendor', 'pixi-live2d-display.min.js')
src = open(v, encoding='utf-8', errors='replace').read()
print('vendor has "PIXI.live2d":', 'PIXI.live2d' in src)
print('vendor has "window.live2d":', 'window.live2d' in src)
i = src.find('live2d')
if i >= 0:
    print('first ctx:', repr(src[max(0, i - 60):i + 80]))
