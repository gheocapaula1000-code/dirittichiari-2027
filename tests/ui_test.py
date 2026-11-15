"""Test dell'interfaccia con Playwright (Chromium e WebKit, larghezze 320/390/440).
Uso: python3 tests/ui_test.py [BASE_URL]   (default: avvia un server locale sulla porta 4321)
Controlla: nessuno scroll orizzontale, barra in basso visibile, wizard completo, risultati,
pagine secondarie, cancellazione dati, pull-to-refresh, service worker e banner di aggiornamento."""
import sys, os, subprocess, time, shutil, tempfile, re
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = sys.argv[1] if len(sys.argv) > 1 else None
LIVE = BASE is not None
fails = []

def check(cond, msg):
    if not cond:
        fails.append(msg); print('  ✖', msg)

def no_hscroll(page, where):
    w = page.evaluate('() => [document.documentElement.scrollWidth, window.innerWidth]')
    check(w[0] <= w[1], f'{where}: scroll orizzontale {w[0]} > {w[1]}')
    # nessun elemento visibile che esce a destra
    bad = page.evaluate('''() => [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
        return r.width > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.right > window.innerWidth + 1 && !e.closest('.ptr'); }).slice(0,3).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right))''')
    check(not bad, f'{where}: elementi oltre il bordo {bad}')

def nav_visible(page, where):
    box = page.locator('.bottomnav').bounding_box()
    vh = page.evaluate('window.innerHeight')
    check(box is not None and box['y'] + box['height'] <= vh + 1 and box['y'] > vh - 120, f'{where}: barra in basso non visibile {box}')

def poll(page, js, seconds):
    # niente wait_for_function: con la CSP del sito (senza 'unsafe-eval') non funziona
    end = time.time() + seconds
    while time.time() < end:
        try:
            if page.evaluate(js): return True
        except Exception:
            pass  # pagina in ricarica
        time.sleep(0.25)
    return False

def fill(page, name, value):
    page.fill(f'#f-{name}', str(value))

def radio(page, name, value):
    page.check(f'input[name="{name}"][value="{value}"]')

def run_flow(browser, width):
    tag = f'{browser.browser_type.name}@{width}'
    print('▶', tag)
    ctx = browser.new_context(viewport={'width': width, 'height': 740}, has_touch=True, is_mobile=browser.browser_type.name == 'chromium')
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE + '/#/')
    page.wait_for_selector('h1')
    check('ISEE 2027' in page.inner_text('h1'), f'{tag}: titolo home')
    check(page.locator('h1').count() == 1, f'{tag}: un solo h1 in home ({page.locator("h1").count()})')
    check('DirittiChiari 2027' in page.title(), f'{tag}: title home {page.title()!r}')
    canon = page.locator('link[rel="canonical"]').get_attribute('href') or ''
    check(canon.startswith('https://dirittiok.com/'), f'{tag}: canonical {canon!r}')
    og = page.locator('meta[property="og:image"]').get_attribute('content') or ''
    check(og.endswith('/og-image.png') or 'og-image.png' in og, f'{tag}: og:image {og!r}')
    check(page.locator('a.skip[href="#app"]').count() == 1, f'{tag}: skip link')
    check(page.locator('.disclaimer').count() == 1, f'{tag}: disclaimer home ({page.locator(".disclaimer").count()}) {page.url}')
    check('Alcuni importi 2027 sono ancora stime.' in page.inner_text('.disclaimer'), f'{tag}: testo disclaimer')
    check(not page.is_visible('#update-banner'), f'{tag}: banner visibile alla prima visita')
    no_hscroll(page, f'{tag} home'); nav_visible(page, f'{tag} home')
    # parole vietate: "semplice" da sola
    txt = page.inner_text('body').lower()
    check(not re.search(r'\bsemplice\b(?! da utilizzare)', txt), f'{tag}: parola "semplice" da sola')

    page.click('a.btn-primary[href="#/stima"]')
    # Passo 1
    page.wait_for_selector('#f-componenti')
    fill(page, 'componenti', 3); fill(page, 'figli', 1); fill(page, 'minori', 1)
    page.locator('#f-minori').dispatch_event('change')
    page.wait_for_selector('input[name="genitoriLavorano"]')
    radio(page, 'genitoriLavorano', 'si')
    fill(page, 'under3', 1)
    no_hscroll(page, f'{tag} passo1'); nav_visible(page, f'{tag} passo1')
    page.click('button[type=submit]')
    # Passo 2
    page.wait_for_selector('#f-redditoDip')
    fill(page, 'redditoDip', 30000); page.locator('#f-redditoDip').dispatch_event('change')
    page.wait_for_selector('#f-nDip'); fill(page, 'nDip', 2)
    fill(page, 'auu2025', 1500); fill(page, 'nettoMensile', 2100)
    no_hscroll(page, f'{tag} passo2')
    page.click('button[type=submit]')
    # Passo 3
    page.wait_for_selector('input[name="abitazione"]')
    radio(page, 'abitazione', 'proprieta')
    page.wait_for_selector('#f-rataMutuo')
    fill(page, 'rataMutuo', 550); fill(page, 'bollette', 180); fill(page, 'trasporti', 90); fill(page, 'prestiti', 100)
    no_hscroll(page, f'{tag} passo3')
    page.click('button[type=submit]')
    # Passo 4
    page.wait_for_selector('#f-valoreCasa')
    page.click('summary:has-text("rendita")')
    page.fill('#rendita', '800'); page.click('[data-action=rendita]')
    check(page.input_value('#f-valoreCasa') == '134400', f'{tag}: calcolo rendita → valore IMU ({page.input_value("#f-valoreCasa")})')
    fill(page, 'mutuoCasa', 60000); fill(page, 'contiSaldo', 8000); fill(page, 'contiGiacenza', 6000)
    no_hscroll(page, f'{tag} passo4')
    page.click('button[type=submit]')
    # Passo 5
    page.wait_for_selector('input[name="peggiorata"]')
    radio(page, 'peggiorata', 'si')
    page.wait_for_selector('input[name="motivo"]')
    radio(page, 'motivo', 'lavoro_indeterminato')
    page.wait_for_selector('input[name="modoCorrente"]')
    radio(page, 'modoCorrente', '2mesi')
    fill(page, 'correnteLD', 2500); fill(page, 'correnteTR', 1200)
    no_hscroll(page, f'{tag} passo5')
    # torna indietro e avanti: i dati restano
    page.click('[data-action=back]'); page.wait_for_selector('#f-valoreCasa')
    check(page.input_value('#f-mutuoCasa') == '60000', f'{tag}: dati persi tornando indietro')
    page.click('button[type=submit]'); page.wait_for_selector('#f-correnteLD')
    check(page.input_value('#f-correnteLD') == '2500', f'{tag}: dato passo 5 perso')
    page.click('button[type=submit]')
    # Risultati
    page.wait_for_selector('.big-result')
    big = page.inner_text('.big-result')
    # 2100 − (550+180+90+100) = 1180
    check('1.180' in big, f'{tag}: residuo atteso 1.180 € → {big!r}')
    kpis = page.locator('.kpi .value').all_inner_texts()
    check(len(kpis) >= 4, f'{tag}: attesi 4 indicatori (ord, spec, corr x2) → {kpis}')
    check(page.locator('.benefit').count() >= 5, f'{tag}: elenco aiuti')
    check(page.locator('#benefici a[href^="https://"]').count() >= 5, f'{tag}: link alle fonti')
    page.locator('details summary').first.click()
    no_hscroll(page, f'{tag} risultati'); nav_visible(page, f'{tag} risultati')
    check(page.locator('[data-action=print]').count() == 1, f'{tag}: pulsante stampa')
    # Pagine secondarie
    for r in ['consigli', 'documenti', 'diritti', 'fonti', 'contatti', 'privacy']:
        page.goto(BASE + '/#/' + r); page.wait_for_selector('h1')
        no_hscroll(page, f'{tag} {r}'); nav_visible(page, f'{tag} {r}')
        check(page.locator('.disclaimer').count() >= 1, f'{tag}: disclaimer in {r}')
        check(page.locator('h1').count() == 1, f'{tag}: un solo h1 in {r} ({page.locator("h1").count()})')
    # modulo contatti
    page.goto(BASE + '/#/contatti'); page.wait_for_selector('form.mc-form, form:has(textarea[name=message])')
    check('Contatti' in page.title(), f'{tag}: title contatti {page.title()!r}')
    form = page.locator('form').filter(has=page.locator('textarea[name=message]')).first
    check(form.locator('input[name=name]').count() == 1, f'{tag}: campo nome')
    check(form.locator('input[name=email]').count() == 1, f'{tag}: campo email')
    check(form.locator('textarea[name=message]').count() == 1, f'{tag}: campo messaggio')
    check(form.locator('input[type=checkbox]').count() >= 1, f'{tag}: consenso privacy')
    check(page.locator('input[name=sito_web]').count() == 1, f'{tag}: honeypot assente')
    check(page.locator('footer a[href="#/contatti"]').count() == 1, f'{tag}: link contatti nel footer')
    check(page.locator('footer a[href="#/privacy"]').count() == 1, f'{tag}: link privacy nel footer')
    no_hscroll(page, f'{tag} form-contatti'); nav_visible(page, f'{tag} form-contatti')
    # checklist persistente
    page.goto(BASE + '/#/documenti'); page.wait_for_selector('input[data-doc]')
    page.locator('input[data-doc]').first.check()
    page.reload(); page.wait_for_selector('input[data-doc]')
    check(page.locator('input[data-doc]').first.is_checked(), f'{tag}: checklist non salvata')
    # pull-to-refresh: simula un trascinamento verso il basso in cima alla pagina
    page.goto(BASE + '/#/consigli'); page.wait_for_selector('h1')
    page.evaluate('window.__marker = 1')
    page.evaluate('''() => { const ev = (type, y) => { const e = new Event(type); Object.defineProperty(e, 'touches', { value: y == null ? [] : [{ clientX: 100, clientY: y }] }); window.dispatchEvent(e); };
        ev('touchstart', 100); ev('touchmove', 180); ev('touchmove', 260); ev('touchend'); }''')
    reloaded = poll(page, '() => window.__marker === undefined', 8)
    check(reloaded, f'{tag}: pull-to-refresh non ricarica')
    page.wait_for_selector('h1')
    check('ottimizzare' in page.inner_text('h1'), f'{tag}: dopo il refresh resta sulla stessa pagina')
    # cancella dati
    page.on('dialog', lambda d: d.accept())
    page.click('footer [data-action=clear]')
    page.wait_for_selector('h1')
    check(page.evaluate("localStorage.getItem('dc2027:dati')") is None, f'{tag}: dati non cancellati')
    page.goto(BASE + '/#/risultati'); page.wait_for_selector('h1')
    check(page.locator('.big-result').count() == 0, f'{tag}: risultati ancora presenti dopo la cancellazione')
    check(not errors, f'{tag}: errori JS {errors}')
    # robots e sitemap solo una volta per browser (prima larghezza)
    if width == 320:
        r = page.request.get(BASE + '/robots.txt')
        check(r.ok and 'Sitemap: https://dirittiok.com/sitemap.xml' in r.text(), f'{tag}: robots.txt {r.status} {r.text()[:120]!r}')
        s = page.request.get(BASE + '/sitemap.xml')
        check(s.ok and 'https://dirittiok.com/' in s.text() and 'lovable.app' not in s.text() and 'netlify' not in s.text(), f'{tag}: sitemap.xml')
    ctx.close()

def sw_and_banner(browser, base_dir):
    """Prima visita: niente banner. Nuova versione pubblicata: banner una sola volta."""
    tag = f'{browser.browser_type.name} SW'
    print('▶', tag)
    ctx = browser.new_context(viewport={'width': 390, 'height': 740})
    page = ctx.new_page()
    page.goto(BASE + '/#/')
    ctrl = '() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)'
    if not poll(page, ctrl, 15):
        page.reload(); page.wait_for_selector('h1')
    check(poll(page, ctrl, 15), f'{tag}: service worker non attivo')
    check(not page.is_visible('#update-banner'), f'{tag}: banner alla prima visita')
    if base_dir is None:
        ctx.close(); return
    # pubblica una "nuova versione" nella copia temporanea
    sw = os.path.join(base_dir, 'sw.js')
    src = open(sw).read()
    open(sw, 'w').write(re.sub(r"const VERSION = '[^']+'", "const VERSION = '9.9.9-test'", src, count=1))
    try:
        page.reload(); page.wait_for_selector('h1')
        try:
            page.wait_for_selector('#update-banner:not([hidden])', timeout=10000); shown = True
        except Exception:
            shown = False
        check(shown, f'{tag}: banner non mostrato per la nuova versione')
        page.click('#update-dismiss')
        page.reload(); page.wait_for_selector('h1'); time.sleep(2.5)
        check(not page.is_visible('#update-banner'), f'{tag}: banner mostrato due volte per la stessa versione')
    finally:
        open(sw, 'w').write(src)
    ctx.close()

def main():
    global BASE
    server = None; tmp = None
    if not LIVE:
        tmp = tempfile.mkdtemp(prefix='dc2027-')
        shutil.copytree(ROOT, os.path.join(tmp, 'site'), ignore=shutil.ignore_patterns('.git', 'tests', 'node_modules'))
        site = os.path.join(tmp, 'site')
        server = subprocess.Popen([sys.executable, '-m', 'http.server', '4321', '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        BASE = 'http://localhost:4321'; time.sleep(1)
    else:
        site = None
    try:
        with sync_playwright() as p:
            for bt in (p.chromium, p.webkit):
                b = bt.launch()
                for w in (320, 390, 440):
                    run_flow(b, w)
                sw_and_banner(b, site)
                b.close()
    finally:
        if server: server.terminate()
        if tmp: shutil.rmtree(tmp, ignore_errors=True)
    print('\nRISULTATO:', 'OK, nessun problema' if not fails else f'{len(fails)} problemi')
    sys.exit(1 if fails else 0)

main()
