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
    page.goto(BASE + '/')
    page.wait_for_selector('h1')
    check('I tuoi aiuti in Italia' in page.inner_text('h1'), f'{tag}: titolo home {page.inner_text("h1")!r}')
    check(page.locator('h1').count() == 1, f'{tag}: un solo h1 in home ({page.locator("h1").count()})')
    check('DirittiOk' in page.title() and 'I tuoi aiuti in Italia' in page.title(), f'{tag}: title home {page.title()!r}')
    canon = page.locator('link[rel="canonical"]').get_attribute('href') or ''
    check(canon.startswith('https://dirittiok.com/'), f'{tag}: canonical {canon!r}')
    og = page.locator('meta[property="og:image"]').get_attribute('content') or ''
    check(og.endswith('/og-image.png') or 'og-image.png' in og, f'{tag}: og:image {og!r}')
    check(page.locator('a.skip[href="#app"]').count() == 1, f'{tag}: skip link')
    check(re.search(r'https?://[^/]+/?$', page.url), f'{tag}: home url non è la radice {page.url}')
    check('index.html' not in page.url and '#' not in page.url.split('/')[-1], f'{tag}: index.html o hash in home {page.url}')
    check(page.locator('.disclaimer').count() == 1, f'{tag}: disclaimer home ({page.locator(".disclaimer").count()}) {page.url}')
    check('Alcuni importi 2027 sono ancora stime.' in page.inner_text('.disclaimer'), f'{tag}: testo disclaimer')
    check(not page.is_visible('#update-banner'), f'{tag}: banner visibile alla prima visita')
    no_hscroll(page, f'{tag} home'); nav_visible(page, f'{tag} home')
    # parole vietate: "semplice" da sola
    txt = page.inner_text('body').lower()
    check(not re.search(r'\bsemplice\b(?! da utilizzare)', txt), f'{tag}: parola "semplice" da sola')
    check(page.locator('a.btn-primary[href="/stima"]').count() >= 1, f'{tag}: CTA Scopri i tuoi aiuti')
    check('Scopri i tuoi aiuti' in page.inner_text('body'), f'{tag}: testo CTA home')
    check(page.locator('.lang-switch').count() == 1, f'{tag}: selettore lingua')
    check(page.locator('footer #install-footer, footer [data-install-cta]').count() >= 1, f'{tag}: Installa nel footer')

    page.click('a.btn-primary[href="/stima"]')
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
    slugs = {'consigli': 'ottimizzazione', 'documenti': 'checklist-dsu', 'diritti': 'diritti-pa', 'auu': 'isee-assegno-unico', 'fonti': 'fonti', 'metodo': 'metodo', 'contatti': 'contatti', 'privacy': 'privacy'}
    for r, slug in slugs.items():
        page.goto(BASE + '/' + slug); page.wait_for_selector('h1')
        check(page.url.rstrip('/').endswith('/' + slug), f'{tag}: url {r} {page.url}')
        check('index.html' not in page.url and '/#/' not in page.url, f'{tag}: url non pulita in {r} {page.url}')
        no_hscroll(page, f'{tag} {r}'); nav_visible(page, f'{tag} {r}')
        check(page.locator('.disclaimer').count() >= 1, f'{tag}: disclaimer in {r}')
        check(page.locator('h1').count() == 1, f'{tag}: un solo h1 in {r} ({page.locator("h1").count()})')
    # modulo contatti
    page.goto(BASE + '/contatti'); page.wait_for_selector('form.mc-form, form:has(textarea[name=message])')
    check('Contatti' in page.title(), f'{tag}: title contatti {page.title()!r}')
    form = page.locator('form').filter(has=page.locator('textarea[name=message]')).first
    check(form.locator('input[name=name]').count() == 1, f'{tag}: campo nome')
    check(form.locator('input[name=email]').count() == 1, f'{tag}: campo email')
    check(form.locator('textarea[name=message]').count() == 1, f'{tag}: campo messaggio')
    check(form.locator('input[type=checkbox]').count() >= 1, f'{tag}: consenso privacy')
    check(page.locator('input[name=sito_web]').count() == 1, f'{tag}: honeypot assente')
    check(page.locator('footer a[href="/contatti"]').count() == 1, f'{tag}: link contatti nel footer')
    check(page.locator('footer a[href="/privacy"]').count() == 1, f'{tag}: link privacy nel footer')
    no_hscroll(page, f'{tag} form-contatti'); nav_visible(page, f'{tag} form-contatti')
    # vecchi link #/contatti e /index.html devono arrivare alle URL pulite
    page.goto(BASE + '/#/contatti'); page.wait_for_selector('form:has(textarea[name=message])')
    check(page.url.rstrip('/').endswith('/contatti') and 'index.html' not in page.url, f'{tag}: hash #/contatti non convertito {page.url}')
    page.goto(BASE + '/fonti'); page.wait_for_selector('h1')
    page.click('footer a[href="/contatti"]'); page.wait_for_selector('form:has(textarea[name=message])')
    page.go_back(); page.wait_for_selector('h1')
    check('Fonti' in page.inner_text('h1'), f'{tag}: indietro del browser perso ({page.url} {page.inner_text("h1")[:40]!r})')
    page.goto(BASE + '/index.html')
    page.wait_for_selector('h1')
    check(re.search(r'https?://[^/]+/?$', page.url) and 'index.html' not in page.url, f'{tag}: /index.html non reindirizza alla radice {page.url}')
    # checklist persistente
    page.goto(BASE + '/checklist-dsu'); page.wait_for_selector('input[data-doc]')
    page.locator('input[data-doc]').first.check()
    page.reload(); page.wait_for_selector('input[data-doc]')
    check(page.locator('input[data-doc]').first.is_checked(), f'{tag}: checklist non salvata')
    # pull-to-refresh: simula un trascinamento verso il basso in cima alla pagina
    page.goto(BASE + '/ottimizzazione'); page.wait_for_selector('h1')
    page.evaluate('window.__marker = 1')
    page.evaluate('''() => { const ev = (type, y) => { const e = new Event(type); Object.defineProperty(e, 'touches', { value: y == null ? [] : [{ clientX: 100, clientY: y }] }); window.dispatchEvent(e); };
        ev('touchstart', 100); ev('touchmove', 180); ev('touchmove', 260); ev('touchend'); }''')
    reloaded = poll(page, '() => window.__marker === undefined', 8)
    check(reloaded, f'{tag}: pull-to-refresh non ricarica')
    page.wait_for_selector('h1')
    check('abbassare' in page.inner_text('h1') or 'legale' in page.inner_text('h1'), f'{tag}: dopo il refresh resta sulla stessa pagina')
    # cancella dati
    page.on('dialog', lambda d: d.accept())
    page.click('footer [data-action=clear]')
    page.wait_for_selector('h1')
    check(page.evaluate("localStorage.getItem('dc2027:dati')") is None, f'{tag}: dati non cancellati')
    page.goto(BASE + '/risultati'); page.wait_for_selector('h1')
    check(page.locator('.big-result').count() == 0, f'{tag}: risultati ancora presenti dopo la cancellazione')
    check(not errors, f'{tag}: errori JS {errors}')
    # robots e sitemap solo una volta per browser (prima larghezza)
    if width == 320:
        r = page.request.get(BASE + '/robots.txt')
        check(r.ok and 'Sitemap: https://dirittiok.com/sitemap.xml' in r.text(), f'{tag}: robots.txt {r.status} {r.text()[:120]!r}')
        s = page.request.get(BASE + '/sitemap.xml')
        check(s.ok and 'https://dirittiok.com/contatti' in s.text() and 'https://dirittiok.com/metodo' in s.text() and '/risultati' not in s.text() and '#/' not in s.text() and 'index.html' not in s.text() and 'lovable.app' not in s.text() and 'netlify' not in s.text(), f'{tag}: sitemap.xml')
        # HTML statico, 301, 404, noindex (una volta per browser)
        raw = page.request.get(BASE + '/stima')
        raw_plain = re.sub(r'<[^>]+>', '', raw.text())
        check(raw.ok and 'Simulatore ISEE 2027' in raw.text() and 'https://dirittiok.com/stima' in raw.text() and 'Calcolo ISEE 2027: simulatore online gratuito' in raw_plain, f'{tag}: HTML statico /stima')
        ris = page.request.get(BASE + '/risultati')
        check(ris.ok and 'noindex,follow' in ris.text(), f'{tag}: /risultati noindex')
        try:
            sl = page.request.get(BASE + '/stima/', max_redirects=0)
            sl_ok = sl.status == 301
        except Exception as e:
            sl_ok = '301' in str(e) or 'redirect' in str(e).lower()
        check(sl_ok, f'{tag}: /stima/ deve reindirizzare con 301')
        nf = page.request.get(BASE + '/pagina-inesistente-xyz')
        check(nf.status == 404 and 'Pagina non trovata' in nf.text() and '/stima' in nf.text(), f'{tag}: 404 italiana')
        check(page.locator('footer a[href="/diritti-pa"]').count() >= 1, f'{tag}: /diritti-pa nel footer')
        page.goto(BASE + '/stima'); page.wait_for_selector('#wizard, #f-componenti, h2')
        check(page.locator('h1').count() == 1 and 'Calcolo ISEE 2027' in page.inner_text('h1'), f'{tag}: H1 fisso /stima')
        check(page.locator('#step-title').evaluate('e => e.tagName') == 'H2', f'{tag}: passo del wizard come H2')
    ctx.close()


IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

def install_and_i18n(browser, width=390):
    tag = f"{browser.browser_type.name}-install"
    print("▶", tag)
    name = browser.browser_type.name
    if name == "webkit":
        ctx = browser.new_context(viewport={"width": width, "height": 844}, user_agent=IPHONE_UA, has_touch=True, is_mobile=True)
        page = ctx.new_page()
        page.goto(BASE + "/?installa=ios")
        page.wait_for_selector("h1")
        page.wait_for_timeout(400)
        vis = page.is_visible("#install-banner")
        check(vis, f"{tag}: banner iOS non visibile in WebKit/iPhone")
        if vis:
            check("Condividi" in page.inner_text("#install-banner") or "Installa" in page.inner_text("#install-banner") or "home" in page.inner_text("#install-banner").lower(), f"{tag}: testo guida iOS")
            page.click("[data-install-cta]")
            page.wait_for_selector("#install-sheet", timeout=3000)
            check(page.locator("#install-sheet").count() == 1, f"{tag}: foglio iOS")
            if page.locator("#install-sheet").count():
                body = page.inner_text("#install-sheet")
                check("Aggiungi alla schermata Home" in body or "schermata Home" in body, f"{tag}: passi Condividi/Home nel foglio")
                page.locator(".install-sheet-dlg button.btn-primary, .install-sheet-dlg .icon-btn").first.click()
        # sul wizard il banner non deve comparire
        page.goto(BASE + "/stima?installa=ios")
        page.wait_for_selector("h1")
        page.wait_for_timeout(300)
        check(not page.is_visible("#install-banner"), f"{tag}: banner visibile nel wizard")
        no_hscroll(page, f"{tag} stima")
        ctx.close()
    else:
        ctx = browser.new_context(viewport={"width": width, "height": 844}, has_touch=True, is_mobile=True)
        page = ctx.new_page()
        page.goto(BASE + "/?installa=android")
        page.wait_for_selector("h1")
        page.wait_for_timeout(400)
        check(page.is_visible("#install-banner"), f"{tag}: banner Android/Chromium non visibile quando installabile")
        # prima visita reale: UA Android, niente ?installa=, storage vuoto, anche senza beforeinstallprompt
        ctx0 = browser.new_context(
            viewport={"width": width, "height": 844}, has_touch=True, is_mobile=True,
            user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        )
        page0 = ctx0.new_page()
        page0.goto(BASE + "/")
        page0.wait_for_selector("h1")
        page0.wait_for_timeout(500)
        check(page0.is_visible("#install-banner"), f"{tag}: banner assente alla prima visita Android (fallback)")
        if page0.is_visible("#install-banner"):
            txt = page0.inner_text("#install-banner")
            check("Installa" in txt or "Install" in txt, f"{tag}: testo banner prima visita {txt!r}")
        # la 7 giorni di chiusura non deve scattare da sola
        dismissed = page0.evaluate("() => Object.keys(localStorage).filter(k => k.indexOf('installa-dismiss') !== -1)")
        check(not dismissed, f"{tag}: dismiss già scritto alla prima visita {dismissed}")
        ctx0.close()
        # standalone: nascosto
        ctx2 = browser.new_context(viewport={"width": width, "height": 844}, has_touch=True, is_mobile=True)
        page2 = ctx2.new_page()
        page2.add_init_script("""
            Object.defineProperty(navigator, "standalone", { get: () => true });
            const orig = window.matchMedia.bind(window);
            window.matchMedia = (q) => {
              if (String(q).includes("display-mode: standalone")) {
                return { matches: true, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, onchange: null, dispatchEvent(){ return false; } };
              }
              return orig(q);
            };
        """)
        page2.goto(BASE + "/?installa=android")
        page2.wait_for_selector("h1")
        page2.wait_for_timeout(400)
        check(not page2.is_visible("#install-banner"), f"{tag}: banner visibile in standalone")
        # CTA hero hidden when standalone
        hidden = page2.evaluate("() => { const b=[...document.querySelectorAll('[data-install-cta]')]; return b.every(el => el.hidden || el.offsetParent===null); }")
        check(hidden, f"{tag}: pulsanti Installa visibili in standalone")
        ctx.close(); ctx2.close()

    # rotte lingua
    ctx = browser.new_context(viewport={"width": width, "height": 844}, has_touch=True, is_mobile=name=="chromium")
    page = ctx.new_page()
    page.goto(BASE + "/en")
    page.wait_for_selector("h1")
    check(page.evaluate("() => document.documentElement.lang") == "en", f"{tag}: lang en")
    check(page.locator(".lang-switch").count() == 1, f"{tag}: switcher su /en")
    no_hscroll(page, f"{tag} en")
    page.goto(BASE + "/bn")
    page.wait_for_selector("h1")
    check(page.evaluate("() => document.documentElement.lang") == "bn", f"{tag}: lang bn")
    no_hscroll(page, f"{tag} bn")
    ctx.close()


LANGS = {
    'it': {'prefix': '', 'h1': 'I tuoi aiuti in Italia', 'residuo': '1.180'},
    'en': {'prefix': '/en', 'h1': 'Your benefits in Italy', 'residuo': '1,180'},
    'bn': {'prefix': '/bn', 'h1': 'ইতালিতে আপনার সরকারি সহায়তা', 'residuo': '1,180'},
}
PAGES = ['', '/stima', '/ottimizzazione', '/checklist-dsu', '/diritti-pa', '/isee-assegno-unico', '/fonti', '/metodo', '/contatti', '/privacy', '/risultati']

def lang_pages(browser, width, langs=None, estimator=False, form_check=False, desktop=False):
    """Pagine IT/EN/BN: overflow, barra in basso, H1, stime e form (validazione, niente invio reale)."""
    langs = langs or ('it', 'en', 'bn')
    name = browser.browser_type.name
    tag0 = f'{name}@{"1280" if desktop else width}'
    print('▶', tag0, 'lingue', ','.join(langs))
    ctx = browser.new_context(viewport={'width': width, 'height': 800}, has_touch=not desktop, is_mobile=(name == 'chromium' and not desktop))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    for code in langs:
        info = LANGS[code]
        pre = info['prefix']
        slugs = PAGES if width in (390, 1280) else ['', '/stima', '/diritti-pa', '/contatti']
        for slug in slugs:
            url = BASE + (pre + slug if slug else (pre or '/'))
            page.goto(url)
            page.wait_for_selector('h1')
            where = f'{tag0} {code} {slug or "/"}'
            check(page.evaluate('() => document.documentElement.lang') == code, f'{where}: lang {code}')
            check(page.locator('h1').count() == 1, f'{where}: un solo h1')
            no_hscroll(page, where)
            if not desktop:
                nav_visible(page, where)
            if slug in ('', '/'):
                check(info['h1'] in page.inner_text('h1'), f'{where}: H1 {page.inner_text("h1")!r}')
                check(page.locator('.lang-switch').count() == 1, f'{where}: switcher')
            if code == 'bn' and slug in ('', '/'):
                fam = page.evaluate('() => getComputedStyle(document.body).fontFamily')
                check('Noto Sans Bengali' in fam or 'Nirmala' in fam or 'Noto Sans' in fam, f'{where}: font bengalese {fam!r}')
                w = page.evaluate("() => { const s=document.createElement('span'); s.textContent='\u09b8\u09b9\u09be\u09af\u09bc\u09a4\u09be'; s.style.visibility='hidden'; document.body.appendChild(s); const w=s.getBoundingClientRect().width; s.remove(); return w; }")
                check(w > 20, f'{where}: glifo bengalese troppo stretto ({w})')
        if form_check:
            page.goto(BASE + pre + '/contatti')
            page.wait_for_selector('form:has(textarea[name=message])')
            page.locator('form:has(textarea[name=message]) button[type=submit]').click()
            invalids = page.locator('[aria-invalid="true"]').count()
            errs = page.locator('.mc-e').count()
            check(invalids >= 1 and errs >= 1, f'{tag0} {code} contatti: validazione assente (invalid={invalids} err={errs})')
        if estimator:
            page.evaluate("() => { localStorage.removeItem('dc2027:dati'); localStorage.removeItem('dc2027:passo'); }")
            page.goto(BASE + pre + '/stima')
            page.wait_for_selector('h1')
            ok = poll(page, "() => !!document.getElementById('f-componenti')", 10)
            if not ok:
                check(False, f'{tag0} {code}: wizard non montato su {page.url} h1={page.inner_text("h1")[:80]!r} app={page.locator("#app").inner_text()[:120]!r}')
                continue
            page.wait_for_selector('#f-componenti')
            fill(page, 'componenti', 3); fill(page, 'figli', 1); fill(page, 'minori', 1)
            page.locator('#f-minori').dispatch_event('change')
            page.wait_for_selector('input[name="genitoriLavorano"]')
            radio(page, 'genitoriLavorano', 'si')
            fill(page, 'under3', 1)
            page.click('button[type=submit]')
            page.wait_for_selector('#f-redditoDip')
            fill(page, 'redditoDip', 30000); page.locator('#f-redditoDip').dispatch_event('change')
            page.wait_for_selector('#f-nDip'); fill(page, 'nDip', 2)
            fill(page, 'auu2025', 1500); fill(page, 'nettoMensile', 2100)
            page.click('button[type=submit]')
            page.wait_for_selector('input[name="abitazione"]')
            radio(page, 'abitazione', 'proprieta')
            page.wait_for_selector('#f-rataMutuo')
            fill(page, 'rataMutuo', 550); fill(page, 'bollette', 180); fill(page, 'trasporti', 90); fill(page, 'prestiti', 100)
            page.click('button[type=submit]')
            page.wait_for_selector('#f-valoreCasa')
            page.locator('details:has(#rendita) summary').click()
            page.fill('#rendita', '800'); page.click('[data-action=rendita]')
            check(page.input_value('#f-valoreCasa') == '134400', f'{tag0} {code}: rendita -> valore IMU ({page.input_value("#f-valoreCasa")})')
            fill(page, 'mutuoCasa', 60000); fill(page, 'contiSaldo', 8000); fill(page, 'contiGiacenza', 6000)
            page.click('button[type=submit]')
            page.wait_for_selector('input[name="peggiorata"]')
            radio(page, 'peggiorata', 'no')
            page.click('button[type=submit]')
            page.wait_for_selector('.big-result')
            big = page.inner_text('.big-result')
            check(info['residuo'] in big, f'{tag0} {code}: residuo atteso {info["residuo"]} -> {big!r}')
            check(page.locator('.benefit').count() >= 5, f'{tag0} {code}: elenco aiuti')
            adi = page.locator('#benefici article.benefit h3').all_inner_texts()
            check(any('Assegno di Inclusione' in x or 'ADI' in x for x in adi), f'{tag0} {code}: nome ADI {adi!r}')
            if code != 'it':
                body = page.inner_text('#benefici')
                check('10,140' in body, f'{tag0} {code}: soglia ADI non in formato locale {body[:240]!r}')
            no_hscroll(page, f'{tag0} {code} risultati')
            if not desktop:
                nav_visible(page, f'{tag0} {code} risultati')
    check(not errors, f'{tag0}: errori JS {errors}')
    ctx.close()



# H1 attesi per la regressione del selettore lingua (stato vuoto su /risultati).
SWITCH_H1 = {
    'it': {
        '/': 'I tuoi aiuti in Italia',
        '/stima': 'Calcolo ISEE 2027: simulatore online gratuito',
        '/risultati': 'Risultati',
    },
    'en': {
        '/': 'Your benefits in Italy',
        '/stima': 'ISEE 2027 calculator: free online estimate',
        '/risultati': 'Results',
    },
    'bn': {
        '/': 'ইতালিতে আপনার সরকারি সহায়তা',
        '/stima': 'ISEE 2027 হিসাব: বিনা খরচে অনলাইন ক্যালকুলেটর',
        '/risultati': 'ফলাফল',
    },
}

def switch_url(code, slug):
    pre = '' if code == 'it' else '/' + code
    if slug in ('', '/'):
        return pre or '/'
    return pre + slug

def lang_switcher(browser):
    """Clic su IT/EN/বাংলা in home, stima e risultati: URL e H1 devono cambiare lingua."""
    name = browser.browser_type.name
    tag = f'{name}-switch'
    print('▶', tag)
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    for start in ('/', '/stima', '/risultati'):
        page.goto(BASE + start)
        page.wait_for_selector('h1')
        page.wait_for_selector('.lang-switch a[hreflang]')
        for code in ('en', 'bn', 'it'):
            loc = page.locator(f'.lang-switch a[hreflang="{code}"]')
            check(loc.count() == 1, f'{tag} {start}->{code}: link switcher assente')
            loc.first.click()
            page.wait_for_selector('h1')
            # attende che l'URL abbia il prefisso lingua (navigazione completa)
            want = switch_url(code, start)
            # poll breve: la navigazione completa può richiedere un attimo
            ok = poll(page, f'() => document.documentElement.lang === "{code}"', 8)
            got = page.evaluate('() => location.pathname.replace(/\\/+$/, "") || "/"')
            rec_path = got
            want_norm = want.rstrip('/') or '/'
            rec_norm = rec_path.rstrip('/') or '/'
            check(rec_norm == want_norm, f'{tag} {start}->{code}: URL {page.url} atteso {want}')
            check(page.evaluate('() => document.documentElement.lang') == code, f'{tag} {start}->{code}: lang {page.evaluate("() => document.documentElement.lang")}')
            h1 = page.inner_text('h1')
            expect = SWITCH_H1[code][start]
            check(expect in h1, f'{tag} {start}->{code}: H1 {h1!r} atteso {expect!r}')
            current = page.locator('.lang-switch a[aria-current="true"]')
            check(current.count() == 1 and current.get_attribute('hreflang') == code, f'{tag} {start}->{code}: aria-current {current.get_attribute("hreflang") if current.count() else None}')
    check(not errors, f'{tag}: errori JS {errors}')
    ctx.close()

def sw_and_banner(browser, base_dir):
    """Prima visita: niente banner. Nuova versione pubblicata: banner una sola volta."""
    tag = f'{browser.browser_type.name} SW'
    print('▶', tag)
    ctx = browser.new_context(viewport={'width': 390, 'height': 740})
    page = ctx.new_page()
    page.goto(BASE + '/')
    ctrl = '() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)'
    if not poll(page, ctrl, 15):
        page.reload(); page.wait_for_selector('h1')
    check(poll(page, ctrl, 15), f'{tag}: service worker non attivo')
    check(not page.is_visible('#update-banner'), f'{tag}: banner alla prima visita')
    if base_dir is None:
        ctx.close(); return
    # pubblica una "nuova versione" nella copia temporanea
    originals = {}
    swp = os.path.join(base_dir, 'sw.js')
    verp = os.path.join(base_dir, 'js/version.js')
    originals['sw'] = open(swp).read()
    originals['ver'] = open(verp).read()
    open(swp, 'w').write(re.sub(r"dc-version:[^*]+", "dc-version:9.9.9-test", originals['sw'], count=1))
    open(swp, 'w').write(re.sub(r"const VERSION = '[^']+'", "const VERSION = '9.9.9-test'", open(swp).read(), count=1))
    open(verp, 'w').write(re.sub(r'DC_VERSION = "[^"]+"', 'DC_VERSION = "9.9.9-test"', originals['ver'], count=1))
    try:
        page.reload(); page.wait_for_selector('h1')
        try:
            page.wait_for_selector('#update-banner:not([hidden])', timeout=10000); shown = True
        except Exception:
            shown = False
        check(shown, f'{tag}: banner non mostrato per la nuova versione')
        if shown:
            page.click('#update-dismiss')
            page.reload(); page.wait_for_selector('h1'); time.sleep(2.5)
            check(not page.is_visible('#update-banner'), f'{tag}: banner mostrato due volte per la stessa versione')
    finally:
        open(os.path.join(base_dir, 'sw.js'), 'w').write(originals['sw'])
        open(os.path.join(base_dir, 'js/version.js'), 'w').write(originals['ver'])
    ctx.close()

def main():
    global BASE
    server = None; tmp = None
    if not LIVE:
        tmp = tempfile.mkdtemp(prefix='dc2027-')
        shutil.copytree(ROOT, os.path.join(tmp, 'site'), ignore=shutil.ignore_patterns('.git', 'tests', 'node_modules'))
        site = os.path.join(tmp, 'site')
        server = subprocess.Popen([sys.executable, os.path.join(ROOT, 'scripts/serve.py'), '4321', site], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        BASE = 'http://127.0.0.1:4321'; time.sleep(1)
    else:
        site = None
    try:
        with sync_playwright() as p:
            for bt in (p.chromium, p.webkit):
                b = bt.launch()
                for w in (320, 390, 440):
                    run_flow(b, w)
                # EN/BN: overflow e nav a 320/390/440, stima e form a 390; desktop 1280 per tutte le lingue
                lang_pages(b, 320, langs=('en', 'bn'))
                lang_pages(b, 390, langs=('en', 'bn'), estimator=True, form_check=True)
                lang_pages(b, 440, langs=('en', 'bn'))
                lang_pages(b, 1280, langs=('it', 'en', 'bn'), desktop=True)
                lang_switcher(b)
                sw_and_banner(b, site)
                install_and_i18n(b)
                b.close()
    finally:
        if server: server.terminate()
        if tmp: shutil.rmtree(tmp, ignore_errors=True)
    print('\nRISULTATO:', 'OK, nessun problema' if not fails else f'{len(fails)} problemi')
    sys.exit(1 if fails else 0)

main()
