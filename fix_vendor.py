# -*- coding: utf-8 -*-
# Tải Cubism 2 runtime (live2d.min.js) — BẮT BUỘC phải nạp TRƯỚC pixi-live2d-display.
# Nguồn chính thức theo README của pixi-live2d-display: repo dylanNew/live2d
import os, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENDOR = os.path.join(ROOT, 'assets', 'vendor')

URLS = [
    ('https://raw.githubusercontent.com/dylanNew/live2d/master/webgl/Live2D/lib/live2d.min.js',
     'live2d.min.js'),
]

for url, name in URLS:
    dest = os.path.join(VENDOR, name)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(req, timeout=60).read()
        head = data[:300].decode('utf-8', errors='replace').lstrip()
        # kèm ít nhất 100KB và không phải trang lỗi HTML
        if len(data) < 100000 or head.startswith('<'):
            raise RuntimeError('file ngoai le: %d bytes, head=%r' % (len(data), head[:80]))
        with open(dest, 'wb') as f:
            f.write(data)
        print('%s: %d bytes - OK' % (name, len(data)))
    except Exception as e:
        print('FAIL %s: %s' % (name, e))
