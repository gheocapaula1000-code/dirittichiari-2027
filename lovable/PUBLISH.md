# Pubblicazione Lovable (DirittiChiari)

Copiare i file di questa cartella nel progetto Lovable `a452916e-5bac-40c4-ad16-470a7b1daac3` insieme all'HTML generato.

- `public/pwa/home.html` ← `index.html` del repo
- `public/pwa/<slug>.html` ← `pages/<slug>.html`
- `public/404.html` ← `404.html`
- `public/js/*`, `public/css/*`, `public/sw.js`, manifest, icone, robots, sitemap, og-image
- NON mettere `public/index.html` (oscurerebbe il 301 di `/index.html`)
- NON caricare `tests/`, `scripts/`, `templates/`, `.git`

Rotte server:
- GET `/` e GET `/<slug>` (elenco consentito, incluso `metodo`) restituiscono l'HTML della rotta, 200, con gli header di `html-headers.ts`
- GET `/<slug>/` (slash finale) → 301 verso `/<slug>`
- GET `/index.html` → 301 `/`
- qualsiasi altro percorso (anche a più segmenti) → `404.html` con stato 404
- GET `/api/contatto` → 405; POST/OPTIONS invariati
- Non servire `/tests/`

Impostazioni già attivate in dashboard (hanno effetto alla pubblicazione): Hide Lovable badge, Visitor analytics off.
Il CSS `#lovable-badge{display:none!important}` resta come difesa.

Redirect www e dirittiok.lovable.app: oggi 302; se la dashboard consente 301, usarli. Altrimenti lasciare com'è.
