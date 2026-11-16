# DirittiChiari 2027

Online: https://dirittiok.com (Lovable). Copia di riserva: https://dirittichiari-2027-kfyt.netlify.app

PWA statica (HTML, CSS e JavaScript, nessuna build) per stimare:
- **ISEE ordinario 2027** (redditi 2025, patrimonio al 31/12/2025)
- **ISEE per prestazioni familiari e inclusione** (franchigia casa 91.500 € / 120.000 €, L. 199/2025)
- **ISEE corrente** (ultimi 12 mesi o 2 mesi × 6)
- **Residuo per vivere** (entrate nette mensili − spese fisse)
- aiuti pubblici collegati, consigli di ottimizzazione legale e checklist DSU stampabile.

I calcoli girano sul dispositivo: nessuna registrazione, nessun pagamento, nessun tracciamento, nessuna IA. I dati della stima restano in `localStorage` e si cancellano con "Cancella i miei dati". Il modulo contatti invia soltanto quello che la persona scrive, a info@pigiservice.com, per ricevere una risposta.

Un servizio di **Pi.Gi Service** · info@pigiservice.com

## Struttura
- `index.html` — guscio dell'app e navigazione in basso
- `js/rules.js` — **tutte le regole e le soglie** (blocco `RULES`) e le funzioni di calcolo
- `js/app.js` — router, wizard, risultati, pull-to-refresh, service worker e banner di aggiornamento
- `js/modulo-contatti.js`, `css/modulo-contatti.css` — modulo contatti (invio a info@pigiservice.com)
- `css/app.css` — stile mobile-first e stampa
- `sw.js`, `manifest.webmanifest`, `icons/` — PWA
- `robots.txt`, `sitemap.xml`, `og-image.png` — SEO (URL canoniche su dirittiok.com)
- `docs/FONTI.md` — fonti ufficiali e stato di ogni valore
- `tests/` — test dei calcoli (Node) e dell'interfaccia (Playwright)

## Comandi
```
npm test            # test dei calcoli (node --test)
npm run test:ui     # Playwright: Chromium + WebKit a 320/390/440 px
npm run serve       # server locale su http://127.0.0.1:4321 (URL pulite)
```

## Pubblicare una nuova versione
1. Aggiorna i valori in `RULES` (e `docs/FONTI.md`).
2. Aumenta la versione in `js/app.js` (`APP_VERSION`), `sw.js` (`VERSION` e `SHELL`) e nei `?v=` di `index.html`.
3. Il banner "nuova versione" appare una sola volta per versione, mai alla prima visita.

Avvertenza: stima orientativa basata sulle regole note a novembre 2026. I valori ufficiali si ottengono solo con la DSU presentata a INPS o CAF. Alcuni importi 2027 sono ancora stime.

## Pagine (URL pulite)
- https://dirittiok.com/
- https://dirittiok.com/stima
- https://dirittiok.com/risultati
- https://dirittiok.com/ottimizzazione
- https://dirittiok.com/checklist-dsu
- https://dirittiok.com/diritti-pa
- https://dirittiok.com/fonti
- https://dirittiok.com/contatti
- https://dirittiok.com/privacy

I vecchi indirizzi `/index.html` e `#/contatti` (ecc.) vengono portati alle nuove URL.
