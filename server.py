#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WAIFU CHATBOT -- server local:
  1) Phuc vu file tinh cua project (nhu python -m http.server)
  2) Proxy API cho XAI247: /api/xai247/* -> https://xai247.xyz/*
     (xai247.xyz khong mo CORS nen trinh duyet khong goi thang duoc --
      di qua server nay same-origin thi OK)

Chay:  python tools/server.py [port]    (mac dinh 8000)
Chi can Python 3 chuan, khong cai them gi.
"""

import http.server
import json
import socketserver
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # thu muc goc B:\\waifu
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

# Tuyen proxy cho phep: tien to local -> upstream
PROXY_ROUTES = {
    "/api/xai247": "https://xai247.xyz",
}

TIMEOUT = 120  # giay -- cho cau tra loi dai cua LLM


class Handler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    # ---------- tien ich ----------

    def _proxy_target(self):
        for prefix, target in PROXY_ROUTES.items():
            if self.path == prefix or self.path.startswith(prefix + "/"):
                return target + self.path[len(prefix):]
        return None

    def _send_raw(self, code, data, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, code, obj):
        self._send_raw(code, json.dumps(obj).encode("utf-8"),
                       "application/json; charset=utf-8")

    def _do_proxy(self):
        url = self._proxy_target()
        if not url:
            self._send_json(404, {"error": {"message": "Tuyen proxy khong hop le"}})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        body = self.rfile.read(length) if length > 0 else None
        req = urllib.request.Request(url, data=body, method=self.command)
        for h in ("Content-Type", "Authorization", "Accept"):
            v = self.headers.get(h)
            if v:
                req.add_header(h, v)
        # Cloudflare chặn UA mặc định "Python-urllib" (lỗi 1010) -> cần UA riêng
        req.add_header("User-Agent", "WaifuChatbot/1.0 (+localhost; pixi-live2d chat)")
        ctx = ssl.create_default_context()
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=TIMEOUT) as resp:
                self._send_raw(resp.status, resp.read(),
                               resp.headers.get("Content-Type", "application/json"))
        except urllib.error.HTTPError as e:
            try:
                data = e.read()
            except Exception:
                data = b""
            ctype = "application/json"
            try:
                ctype = e.headers.get("Content-Type", "application/json")
            except Exception:
                pass
            self._send_raw(e.code, data, ctype)
        except Exception as e:  # mang hong, timeout, DNS...
            self._send_json(502, {"error": {"message": "Proxy loi: %s" % e}})

    # ---------- cac method HTTP ----------

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self._do_proxy()
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._do_proxy()
        return self._send_json(404, {"error": {"message": "Not found"}})

    def do_OPTIONS(self):
        # same-origin nen khong can, nhung de day cho chac
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - - [%s] %s\n"
                         % (self.address_string(), self.log_date_time_string(),
                            fmt % args))


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    poll_interval = 0.5


def main():
    print("=" * 48)
    print("  WAIFU CHATBOT - server + proxy XAI247")
    print("  Trang chu : http://localhost:%d" % PORT)
    print("  Proxy     : /api/xai247/* -> https://xai247.xyz/*")
    print("  Tat server: nhan Ctrl+C hoac dong cua so nay")
    print("=" * 48)
    try:
        httpd = Server(("", PORT), Handler)
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nDa tat server. Bai bai senpai~")
    except OSError as e:
        print("[X] Khong chay duoc server (port %d co the dang ban): %s" % (PORT, e))
        sys.exit(1)


if __name__ == "__main__":
    main()
