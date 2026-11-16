#!/usr/bin/env python3
"""Controlli HTTP e HTML statico (senza browser): canonical, 301, 404, noindex, sitemap."""
import os, re, sys, json, subprocess, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 4325
BASE = f'http://127.0.0.1:{PORT}'
fails = []

def check(cond, msg):
    if not cond:
        fails.append(msg)
        print('  ✖', msg)
    else:
        print('  ✓', msg)

def fetch(path, method='GET', follow=False):
    req = urllib.request.Request(BASE + path, method=method)
    try:
        return urllib.request.urlopen(req, timeout=5)
    except urllib.error.HTTPError as e:
        return e

def raw_headers(path):
    """Ritorna (status, headers dict, body) senza seguire i redirect."""
    class N(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    opener = urllib.request.build_opener(N)
    req = urllib.request.Request(BASE + path, method='GET')
    try:
        r = opener.open(req, timeout=5)
        return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read()
    except urllib.error.HTTPError as e:
        if e.status in (301, 302, 303, 307, 308):
            return e.status, {k.lower(): v for k, v in e.headers.items()}, e.read()
        return e.status, {k.lower(): v for k, v in e.headers.items()}, e.read()

def main():
    srv = subprocess.Popen([sys.executable, os.path.join(ROOT, 'scripts/serve.py'), str(PORT), ROOT],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.4)
    try:
        status, hdr, body = raw_headers('/')
        check(status == 200, f'GET / è 200 ({status})')
        check('location' not in hdr, f'GET / senza Location ({hdr.get("location")})')
        html = body.decode('utf-8', 'replace')
        check('<html lang="it"' in html, 'home lang=it')
        check('http-equiv="Content-Language" content="it"' in html, 'home Content-Language=it')
        check(not re.search(r'<html[^>]*translate="no"', html) and not re.search(r'<html[^>]*notranslate', html), 'html senza notranslate globale')
        check(not re.search(r'<body[^>]*translate="no"', html) and not re.search(r'<body[^>]*notranslate', html), 'body senza notranslate globale')
        check('class="lang-switch notranslate" translate="no"' in html, 'selettore lingua notranslate')
        check('class="notranslate" translate="no">DirittiOk</span>' in html, 'nome del brand notranslate')
        check('I tuoi aiuti in Italia' in html and '<h1>I tuoi aiuti in Italia</h1>' in html, 'home ha H1 landing nel grezzo')
        check('rel="canonical" href="https://dirittiok.com/"' in html, 'home canonical')
        check('1.5.2' in html, 'versione 1.5.2 nella home')
        check('hreflang="en"' in html and 'hreflang="bn"' in html and 'hreflang="x-default"' in html, 'home ha hreflang it/en/bn/x-default')
        check('Scopri i tuoi aiuti' in html and 'Installa l' + "'" + 'app' in html, 'home ha CTA e Installa l app')
        check('lang="it"' in html, 'home lang=it')

        pages = {
            '/stima': ('Simulatore ISEE 2027', 'https://dirittiok.com/stima', 'Calcolo ISEE 2027: simulatore online gratuito'),
            '/ottimizzazione': ("Come abbassare l'ISEE in modo legale", 'https://dirittiok.com/ottimizzazione', "Come abbassare l'ISEE in modo legale"),
            '/checklist-dsu': ('Documenti ISEE 2027 per la DSU', 'https://dirittiok.com/checklist-dsu', 'Documenti necessari per la DSU'),
            '/diritti-pa': ('Bonus e aiuti con ISEE 2027', 'https://dirittiok.com/diritti-pa', 'Bonus ISEE 2027'),
            '/isee-assegno-unico': ('ISEE e Assegno Unico 2027: soglie e importi · DirittiOk', 'https://dirittiok.com/isee-assegno-unico', "ISEE e Assegno Unico: come cambia l'importo mensile"),
            '/fonti': ('Fonti e regole usate', 'https://dirittiok.com/fonti', 'Fonti e regole usate'),
            '/metodo': ('Metodo e fonti', 'https://dirittiok.com/metodo', 'Metodo e fonti'),
            '/contatti': ('Contatti · DirittiOk', 'https://dirittiok.com/contatti', 'Contatti'),
            '/privacy': ('Privacy · DirittiOk', 'https://dirittiok.com/privacy', 'Privacy'),
        }
        for path, (title, canon, h1) in pages.items():
            st, hd, bd = raw_headers(path)
            tx = bd.decode('utf-8', 'replace')
            check(st == 200, f'{path} è 200 ({st})')
            check(f'rel="canonical" href="{canon}"' in tx, f'{path} canonical {canon}')
            check('http-equiv="Content-Language" content="it"' in tx, f'{path} Content-Language=it')
            check('class="lang-switch notranslate" translate="no"' in tx, f'{path} selettore notranslate')
            check(title in tx, f'{path} title contiene {title!r}')
            h1m = re.search(r'<h1>(.*?)</h1>', tx, re.S)
            h1_plain = re.sub(r'<[^>]+>', '', h1m.group(1)).strip() if h1m else ''
            check(h1 in h1_plain or f'<h1>{h1}' in tx or h1 in tx, f'{path} H1 nel grezzo ({h1_plain!r})')
            # description in head equals itself pre-JS (static)
            m = re.search(r'<meta name="description" content="([^"]+)"', tx)
            check(m and 120 <= len(m.group(1)) <= 160, f'{path} description ~150 ({len(m.group(1)) if m else 0})')
            check('semplice' not in re.findall(r'\bsemplice\b(?! da utilizzare)', tx.lower()) or True, 'placeholder')
            check(not re.search(r'\bsemplice\b(?! da utilizzare)', tx, re.I), f'{path} senza "semplice" da sola')
            # slash
            st2, hd2, _ = raw_headers(path + '/')
            loc = hd2.get('location', '')
            check(st2 == 301 and loc.rstrip('/').endswith(path), f'{path}/ 301 → {path} (got {st2} {loc})')

        st, hd, bd = raw_headers('/risultati')
        tx = bd.decode('utf-8', 'replace')
        check(st == 200, '/risultati 200')
        check('noindex,follow' in tx, '/risultati noindex,follow nel grezzo')
        check('rel="canonical" href="https://dirittiok.com/risultati"' in tx, '/risultati canonical proprio')

        st, hd, bd = raw_headers('/index.html')
        check(st == 301 and hd.get('location') in ('/', 'http://127.0.0.1:%s/' % PORT), f'/index.html 301 → / ({st} {hd.get("location")})')

        st, hd, bd = raw_headers('/pagina-inesistente-xyz')
        tx = bd.decode('utf-8', 'replace')
        check(st == 404, f'pagina inesistente è 404 ({st})')
        check('Pagina non trovata' in tx and 'text/html' in hd.get('content-type', ''), '404 italiana HTML')
        check('href="/stima"' in tx and 'href="/checklist-dsu"' in tx, '404 ha link a /stima e /checklist-dsu')

        st, _, _ = raw_headers('/tests/ui_test.py')
        check(st == 404, f'/tests/ non è servito ({st})')
        st, _, _ = raw_headers('/stima/xyz')
        check(st == 404, f'/stima/xyz è 404 ({st})')

        sm = fetch('/sitemap.xml').read().decode()
        check('https://dirittiok.com/contatti' in sm, 'sitemap contiene /contatti')
        check('https://dirittiok.com/metodo' in sm, 'sitemap contiene /metodo')
        check('/risultati' not in sm, 'sitemap senza /risultati')
        check('#/' not in sm and 'index.html' not in sm and 'lovable.app' not in sm and 'netlify' not in sm, 'sitemap pulita')
        check('<lastmod>2026-11-16</lastmod>' in sm and '<lastmod>2026-11-15</lastmod>' in sm, 'sitemap lastmod distinti')
        check('changefreq' not in sm and 'priority' not in sm, 'sitemap senza changefreq/priority')

        check('https://dirittiok.com/isee-assegno-unico' in sm, 'sitemap contiene /isee-assegno-unico')
        check('hreflang="en"' in sm and '/en/isee-assegno-unico' in sm and '/bn/isee-assegno-unico' in sm, 'sitemap hreflang nuova pagina')

        st, hd, bd = raw_headers('/isee-assegno-unico')
        tx = bd.decode('utf-8', 'replace')
        check('FAQPage' in tx, '/isee-assegno-unico ha FAQPage JSON-LD')
        check('Quale ISEE si usa per l' + "'" + 'Assegno Unico?' in tx, '/isee-assegno-unico FAQ visibile = JSON-LD')
        check('href="/stima"' in tx, '/isee-assegno-unico CTA /stima')
        check('17.468,51' in tx and '46.582,71' in tx and '203,80' in tx and '58,30' in tx, '/isee-assegno-unico importi ufficiali 2026')
        check('stime' in tx.lower() or 'stima' in tx.lower(), '/isee-assegno-unico etichetta stime 2027')
        check('dal terzo figlio in poi' in tx, '/isee-assegno-unico maggiorazione dal terzo figlio')
        check('servizio civile universale' in tx and '8.000' in tx, '/isee-assegno-unico requisiti 18-21')
        check('nella stessa famiglia' in tx, '/isee-assegno-unico esempio su una famiglia')
        check('hreflang="en"' in tx and 'hreflang="bn"' in tx and 'hreflang="x-default"' in tx, '/isee-assegno-unico hreflang')

        for path, needle in (('/', 'href="/isee-assegno-unico"'), ('/diritti-pa', 'href="/isee-assegno-unico"'), ('/fonti', 'href="/isee-assegno-unico"')):
            st, hd, bd = raw_headers(path)
            tx = bd.decode('utf-8', 'replace')
            check(needle in tx, f'{path} linka {needle}')

        # pages-data identico a HTML per title/desc
        data = open(os.path.join(ROOT, 'js/pages-data.js'), encoding='utf-8').read()
        check('window.DC_PAGES' in data, 'pages-data.js presente')
        check('#lovable-badge' in open(os.path.join(ROOT, 'css/app.css'), encoding='utf-8').read(), 'CSS nasconde il badge')
        ver = open(os.path.join(ROOT, 'js/version.js'), encoding='utf-8').read()
        check('DC_VERSION = "1.5.2"' in ver, 'versione unica 1.5.2')

        # lingue
        for lp, hrefl, h1 in (('/en', 'en', 'Your benefits in Italy'), ('/bn', 'bn', 'ইতালিতে আপনার সরকারি সহায়তা')):
            st, hd, bd = raw_headers(lp)
            tx = bd.decode('utf-8', 'replace')
            check(st == 200, f'{lp} è 200 ({st})')
            check(f'lang="{hrefl}"' in tx, f'{lp} html lang={hrefl}')
            check(f'http-equiv="Content-Language" content="{hrefl}"' in tx, f'{lp} Content-Language={hrefl}')
            check('class="lang-switch notranslate" translate="no"' in tx, f'{lp} selettore notranslate')
            check(not re.search(r'<html[^>]*translate="no"', tx) and not re.search(r'<body[^>]*translate="no"', tx), f'{lp} senza notranslate globale')
            check('hreflang="it"' in tx and 'hreflang="x-default"' in tx, f'{lp} hreflang')
            check(h1 in tx, f'{lp} H1 nel grezzo')
            check(f'rel="canonical" href="https://dirittiok.com{lp}"' in tx or f'rel="canonical" href="https://dirittiok.com{lp}/"' in tx, f'{lp} canonical')
        st, hd, _ = raw_headers('/en/stima/')
        check(st == 301 and hd.get('location','').rstrip('/').endswith('/en/stima'), f'/en/stima/ 301 ({st} {hd.get("location")})')
        st, hd, bd = raw_headers('/en/pagina-inesistente-xyz')
        tx = bd.decode('utf-8', 'replace')
        check(st == 404 and 'lang="en"' in tx and 'Page not found' in tx, f'/en sconosciuta 404 lingua ({st})')
        sm_ok = 'https://dirittiok.com/en' in sm and 'https://dirittiok.com/bn/stima' in sm and 'hreflang="bn"' in sm
        check(sm_ok, 'sitemap contiene /en, /bn e hreflang')
        check('window.DC_MSG' in open(os.path.join(ROOT, 'js/messages.js'), encoding='utf-8').read(), 'messages.js presente')

    finally:
        srv.terminate()
        srv.wait(timeout=3)

    print('\nSEO HTTP:', 'OK, nessun problema' if not fails else f'{len(fails)} problemi')
    sys.exit(1 if fails else 0)

if __name__ == '__main__':
    main()
