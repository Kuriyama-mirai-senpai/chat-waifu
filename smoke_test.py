# -*- coding: utf-8 -*-
# Smoke test: chạy server trước, rồi script này kiểm tra toàn bộ tài nguyên
# mà index.html + model.json tham chiếu tới đều trả về HTTP 200.
import json, urllib.request

BASE = 'http://127.0.0.1:8000/'

def get(u, timeout=20):
    return urllib.request.urlopen(BASE + u, timeout=timeout).read()

urls = [
    'index.html', 'css/style.css',
    'js/config.js', 'js/persona.js', 'js/tts.js',
    'js/live2d.js', 'js/chat.js', 'js/app.js',
    'assets/vendor/pixi.min.js',
    'assets/vendor/live2d.min.js',              # Cubism 2 runtime
    'assets/vendor/pixi-live2d-display.min.js',
    'assets/models/shizuku/shizuku.model.json',
]

# Đọc model.json để lấy toàn bộ tài nguyên con
model = json.loads(get('assets/models/shizuku/shizuku.model.json').decode('utf-8'))
root = 'assets/models/shizuku/'
urls.append(root + model['model'])
if model.get('physics'):
    urls.append(root + model['physics'])
if model.get('pose'):
    urls.append(root + model['pose'])
for t in model.get('textures', []):
    urls.append(root + t)
for e in model.get('expressions', []):
    urls.append(root + e['file'])
for group, arr in (model.get('motions') or {}).items():
    for m in arr:
        urls.append(root + m['file'])
        if m.get('sound'):
            urls.append(root + m['sound'])

ok = fail = 0
for u in urls:
    try:
        data = get(u)
        if len(data) > 0:
            ok += 1
        else:
            print('EMPTY', u); fail += 1
    except Exception as e:
        print('FAIL', u, e); fail += 1

print('smoke test: %d ok / %d fail' % (ok, fail))
print('index.html size ok, model refs ok' if fail == 0 else 'CO VAN DE - xem FAIL o tren')
