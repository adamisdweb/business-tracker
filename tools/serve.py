#!/usr/bin/env python3
"""Tiny static dev server with caching disabled.

Serves the project root (the folder above tools/) so the browser always loads
the latest JS/CSS — no stale-cache surprises while developing.

    python tools/serve.py [port]      # default port 5189

For production you don't need this — just host the folder on Firebase Hosting
or Netlify, which handle caching properly.
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5189
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


# Threaded so the browser's many concurrent (keep-alive) module requests don't
# deadlock a single-threaded server.
http.server.ThreadingHTTPServer.allow_reuse_address = True
with http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"Serving {ROOT} (no-cache, threaded) on http://localhost:{PORT}")
    httpd.serve_forever()
