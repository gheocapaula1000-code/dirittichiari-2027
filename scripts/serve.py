#!/usr/bin/env python3
"""Server statico con URL pulite, HTML proprio per ogni rotta e lingua.
 /stima → pages/stima.html (200); /en/stima → en/stima.html; /stima/ → 301 /stima;
 /index.html → /; /en/ → 301 /en. Pagine sconosciute e /tests/ → 404 della lingua (404).
 Uso: python3 scripts/serve.py [porta] [cartella]
"""
import os, sys, posixpath, urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
ROOT = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

IT_PAGES = {
    '/': 'index.html',
    '/stima': 'pages/stima.html',
    '/risultati': 'pages/risultati.html',
    '/ottimizzazione': 'pages/ottimizzazione.html',
    '/checklist-dsu': 'pages/checklist-dsu.html',
    '/diritti-pa': 'pages/diritti-pa.html',
    '/isee-assegno-unico': 'pages/isee-assegno-unico.html',
    '/fonti': 'pages/fonti.html',
    '/metodo': 'pages/metodo.html',
    '/contatti': 'pages/contatti.html',
    '/privacy': 'pages/privacy.html',
}
LANGS = ('en', 'bn')
SLUGS = [p[1:] for p in IT_PAGES if p != '/']
PAGES = dict(IT_PAGES)
for lang in LANGS:
    PAGES['/' + lang] = f'{lang}/index.html'
    for slug in SLUGS:
        PAGES[f'/{lang}/{slug}'] = f'{lang}/{slug}.html'

BLOCK_PREFIXES = ('/tests', '/scripts', '/templates', '/docs', '/.git', '/lovable', '/i18n')


def lang_of(raw):
    for lang in LANGS:
        if raw == '/' + lang or raw.startswith('/' + lang + '/'):
            return lang
    return 'it'


def not_found_file(raw):
    lang = lang_of(raw)
    return '404.html' if lang == 'it' else f'{lang}/404.html'


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, fmt, *args):
        pass

    def _raw(self):
        return urllib.parse.urlsplit(self.path).path

    def _redirect(self, location, status=301):
        self.send_response(status)
        self.send_header('Location', location)
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()

    def _send_file(self, rel, status=200, content_type=None):
        fs = os.path.join(ROOT, rel.replace('/', os.sep))
        if not os.path.isfile(fs):
            return False
        ctype = content_type or self.guess_type(fs)
        try:
            with open(fs, 'rb') as f:
                body = f.read()
        except OSError:
            return False
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        if rel.endswith('.html') or rel.endswith('sw.js'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)
        return True

    def _send_404(self, raw=None):
        raw = raw or self._raw()
        rel = not_found_file(raw)
        if not self._send_file(rel, status=404, content_type='text/html; charset=utf-8'):
            body = 'Pagina non trovata'.encode()
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)

    def _route(self):
        raw = self._raw()
        if raw == '/index.html':
            self._redirect('/')
            return True
        for lang in LANGS:
            if raw == f'/{lang}/index.html':
                self._redirect(f'/{lang}')
                return True
        for p in BLOCK_PREFIXES:
            if raw == p or raw.startswith(p + '/'):
                self._send_404(raw)
                return True
        if raw.startswith('/pages/') and raw.endswith('.html'):
            slug = raw[len('/pages/'):-len('.html')]
            if '/' + slug in IT_PAGES:
                self._redirect('/' + slug)
                return True
        for lang in LANGS:
            if raw.startswith(f'/{lang}/') and raw.endswith('.html'):
                slug = raw[len(f'/{lang}/'):-len('.html')]
                if slug != 'index' and f'/{lang}/{slug}' in PAGES:
                    self._redirect(f'/{lang}/{slug}')
                    return True
        if raw != '/' and raw.endswith('/'):
            self._redirect(raw.rstrip('/') or '/')
            return True
        if raw in PAGES:
            self._send_file(PAGES[raw], status=200, content_type='text/html; charset=utf-8')
            return True
        rel = posixpath.normpath(raw.lstrip('/'))
        if rel.startswith('..'):
            self._send_404(raw)
            return True
        if raw == '/sw.js':
            self._send_file('sw.js', status=200, content_type='text/javascript; charset=utf-8')
            return True
        if os.path.isfile(os.path.join(ROOT, rel)):
            return False
        self._send_404(raw)
        return True

    def do_GET(self):
        if self._route():
            return
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_HEAD(self):
        if self._route():
            return
        return SimpleHTTPRequestHandler.do_HEAD(self)

if __name__ == '__main__':
    httpd = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print('http://127.0.0.1:%s' % PORT, flush=True)
    httpd.serve_forever()
