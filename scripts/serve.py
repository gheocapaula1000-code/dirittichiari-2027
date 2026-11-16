#!/usr/bin/env python3
"""Server statico con URL pulite: /contatti ecc. restituiscono index.html (200).
 /index.html reindirizza a / (301). Uso: python3 scripts/serve.py [porta] [cartella]
"""
import os, sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
ROOT = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PAGES = {
    '/', '/stima', '/risultati', '/ottimizzazione', '/checklist-dsu',
    '/diritti-pa', '/fonti', '/contatti', '/privacy',
}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def do_GET(self):
        raw = self.path.split('?')[0]
        if raw == '/index.html':
            self.send_response(301)
            self.send_header('Location', '/')
            self.end_headers()
            return
        if raw in PAGES:
            self.path = '/index.html'
        return SimpleHTTPRequestHandler.do_GET(self)
    def log_message(self, fmt, *args):
        pass

if __name__ == '__main__':
    httpd = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print('http://127.0.0.1:%s' % PORT, flush=True)
    httpd.serve_forever()
