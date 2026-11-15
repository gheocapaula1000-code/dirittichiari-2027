/*!
 * DirittiChiari 2027 — interfaccia (router a hash, wizard, risultati, PWA).
 * I calcoli restano in localStorage su questo dispositivo. L'unica chiamata di rete è il modulo contatti, con le parole scritte dalla persona.
 */
(function () {
  'use strict';
  const APP_VERSION = '1.2.0';             // tenere allineato con VERSION in sw.js
  const STORE_KEY = 'dc2027:dati';
  const STEP_KEY = 'dc2027:passo';
  const CHECK_KEY = 'dc2027:checklist';
  const BANNER_KEY = 'dc2027:banner-visto';
  const D = window.DC;
  const R = D.RULES;
  const $app = document.getElementById('app');
  const eur = (x) => D.fmtEuro(Math.round(Number(x) || 0));
  const eur2 = (x) => D.fmtEuro(x, 2);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SITE = 'https://dirittiok.com/';
  const SEO = {
    '': {
      title: 'DirittiChiari 2027 · Stima ISEE, residuo per vivere e aiuti',
      desc: 'Stima orientativa dell\'ISEE 2027, di quanto ti resta per vivere e degli aiuti pubblici. Gratis, senza registrazione. I calcoli restano sul tuo telefono.',
      url: SITE
    },
    stima: {
      title: 'Stima ISEE 2027 · DirittiChiari',
      desc: 'Percorso guidato in 5 passi per stimare l\'ISEE ordinario, familiare e corrente, con redditi 2025 e patrimonio al 31/12/2025.',
      url: SITE + '#/stima'
    },
    risultati: {
      title: 'Risultati della stima ISEE · DirittiChiari',
      desc: 'Vedi la stima del tuo ISEE 2027, il residuo mensile per vivere e gli aiuti pubblici da valutare, con le fonti di ogni soglia.',
      url: SITE + '#/risultati'
    },
    consigli: {
      title: 'Come ottimizzare legalmente l\'ISEE · DirittiChiari',
      desc: 'Cosa conta davvero nell\'ISEE, le scelte permesse che possono abbassarlo e cosa non fare mai. Spiegato con calma, prima del CAF.',
      url: SITE + '#/consigli'
    },
    documenti: {
      title: 'Documenti per la DSU 2027 · DirittiChiari',
      desc: 'Checklist dei documenti per la DSU 2027, da spuntare e stampare prima di andare al CAF o sul portale ISEE dell\'INPS.',
      url: SITE + '#/documenti'
    },
    diritti: {
      title: 'Diritti e aiuti pubblici legati all\'ISEE · DirittiChiari',
      desc: 'Assegno di Inclusione, Assegno Unico, bonus sociali e altri aiuti legati all\'ISEE, con le soglie e le fonti ufficiali.',
      url: SITE + '#/diritti'
    },
    fonti: {
      title: 'Fonti e regole usate · DirittiChiari',
      desc: 'Regole e fonti ufficiali usate da DirittiChiari per la stima ISEE 2027, con lo stato di ogni valore.',
      url: SITE + '#/fonti'
    },
    contatti: {
      title: 'Contatti · DirittiChiari 2027',
      desc: 'Scrivi a DirittiChiari: ti rispondiamo via email. Dal modulo partono solo le informazioni che inserisci tu, non i dati della stima.',
      url: SITE + '#/contatti'
    },
    privacy: {
      title: 'Privacy · DirittiChiari 2027',
      desc: 'Come trattiamo i dati su DirittiChiari 2027: i calcoli restano sul tuo dispositivo. Il modulo contatti serve solo per risponderti.',
      url: SITE + '#/privacy'
    }
  };
  function setMeta(key, value, attr) {
    attr = attr || 'name';
    let el = document.querySelector('meta[' + attr + '="' + key + '"]');
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.setAttribute('content', value);
  }
  function setLinkRel(rel, href) {
    let el = document.querySelector('link[rel="' + rel + '"]');
    if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
    el.setAttribute('href', href);
  }
  function applySeo(route) {
    const s = SEO[route] || SEO[''];
    document.title = s.title;
    document.documentElement.lang = 'it';
    setMeta('description', s.desc);
    setMeta('og:title', s.title, 'property');
    setMeta('og:description', s.desc, 'property');
    setMeta('og:url', s.url, 'property');
    setMeta('og:image', SITE + 'og-image.png', 'property');
    setMeta('twitter:title', s.title);
    setMeta('twitter:description', s.desc);
    setMeta('twitter:image', SITE + 'og-image.png');
    setLinkRel('canonical', s.url === SITE ? SITE : s.url);
  }


  /* ---------------- Dati locali ---------------- */
  function load() {
    try { return Object.assign({}, D.DEFAULT_INPUT, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); }
    catch (e) { return Object.assign({}, D.DEFAULT_INPUT); }
  }
  function save(d) { try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) { /* spazio pieno o modalità privata */ } }
  function hasData() { return !!localStorage.getItem(STORE_KEY); }
  function clearAll() {
    if (!confirm('Vuoi cancellare tutti i dati inseriti su questo dispositivo?')) return;
    [STORE_KEY, STEP_KEY, CHECK_KEY].forEach((k) => localStorage.removeItem(k));
    location.hash = '#/';
    render();
    announce('Dati cancellati.');
  }
  function announce(msg) {
    let el = document.getElementById('sr-live');
    if (!el) { el = document.createElement('div'); el.id = 'sr-live'; el.className = 'sr-only'; el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.textContent = msg;
  }

  /* ---------------- Definizione del wizard ----------------
   * Ogni campo: id (chiave in DEFAULT_INPUT), tipo, etichetta, aiuto, show(d) facoltativo. */
  const STEPS = [
    {
      titolo: 'Il tuo nucleo familiare',
      intro: 'Il nucleo ISEE è chi risulta nello stato di famiglia, più il coniuge e i figli a carico anche se vivono altrove.',
      campi: [
        { id: 'componenti', tipo: 'int', label: 'Quante persone ci sono nel nucleo?', min: 1, max: 15 },
        { id: 'figli', tipo: 'int', label: 'Quanti sono figli (di qualsiasi età)?', min: 0, max: 14, help: 'Servono per le maggiorazioni della scala e per le franchigie.' },
        { id: 'minori', tipo: 'int', label: 'Quanti hanno meno di 18 anni?', min: 0, max: 14 },
        { id: 'under3', tipo: 'int', label: 'Di questi, quanti hanno meno di 3 anni?', min: 0, max: 14, show: (d) => d.minori > 0 },
        { id: 'over60', tipo: 'int', label: 'Quanti hanno 60 anni o più?', min: 0, max: 15 },
        { id: 'over67', tipo: 'int', label: 'Di questi, quanti hanno 67 anni o più?', min: 0, max: 15, show: (d) => d.over60 > 0 },
        { id: 'disabili', tipo: 'int', label: 'Quanti hanno una disabilità media, grave o non autosufficienza certificata?', min: 0, max: 15, help: 'Ogni persona aggiunge 0,5 alla scala di equivalenza.' },
        { id: 'genitoreSolo', tipo: 'bool', label: 'C\'è un solo genitore con figli minorenni?', show: (d) => d.minori > 0 },
        { id: 'genitoriLavorano', tipo: 'bool', label: 'Nel 2025 entrambi i genitori (o l\'unico) hanno lavorato almeno 6 mesi?', show: (d) => d.minori > 0 }
      ],
      check(d) {
        const e = {};
        if (d.figli > d.componenti - 1) e.figli = 'I figli devono essere meno dei componenti (c\'è almeno un genitore).';
        if (d.minori > d.componenti) e.minori = 'Non possono essere più dei componenti.';
        if (d.under3 > d.minori) e.under3 = 'Non possono essere più dei minorenni.';
        if (d.over60 + d.minori > d.componenti) e.over60 = 'Minorenni e over 60 insieme superano i componenti.';
        if (d.over67 > d.over60) e.over67 = 'Non possono essere più degli over 60.';
        if (d.disabili > d.componenti) e.disabili = 'Non possono essere più dei componenti.';
        return e;
      }
    },
    {
      titolo: 'Redditi 2025',
      intro: 'Per l\'ISEE 2027 contano i redditi del 2025 (quelli della CU 2026 o del 730/2026). Somma i valori di tutto il nucleo.',
      campi: [
        { id: 'redditoDip', tipo: 'eur', label: 'Redditi da lavoro dipendente o assimilati 2025', help: 'Il reddito della CU (non lo stipendio netto in busta paga).' },
        { id: 'nDip', tipo: 'int', label: 'Quante persone li hanno percepiti?', min: 0, max: 15, show: (d) => d.redditoDip > 0 },
        { id: 'redditoPens', tipo: 'eur', label: 'Pensioni 2025' },
        { id: 'nPens', tipo: 'int', label: 'Quante persone hanno una pensione?', min: 0, max: 15, show: (d) => d.redditoPens > 0 },
        { id: 'redditoAltri', tipo: 'eur', label: 'Altri redditi 2025 (lavoro autonomo, affitti incassati, redditi a imposta sostitutiva)', help: 'Per la partita IVA forfettaria indica il reddito imponibile.' },
        { id: 'trattamentiEsenti', tipo: 'eur', label: 'Aiuti e sussidi non tassati incassati nel 2025 (escluso l\'Assegno Unico)', help: 'Non inserire quelli legati alla disabilità: non contano nell\'ISEE.' },
        { id: 'auu2025', tipo: 'eur', label: 'Assegno Unico incassato nel 2025' },
        { id: 'mantenimentoVersato', tipo: 'eur', label: 'Assegni di mantenimento versati nel 2025 all\'ex coniuge o per i figli' },
        { id: 'nettoMensile', tipo: 'eur', label: 'Quanto entra oggi in famiglia, al netto, ogni mese?', help: 'Stipendi, pensioni e aiuti di adesso: serve per calcolare il residuo per vivere.' }
      ]
    },
    {
      titolo: 'Spese fisse di oggi',
      intro: 'Queste spese servono per il residuo per vivere. Nell\'ISEE conta solo l\'affitto con contratto registrato.',
      campi: [
        { id: 'abitazione', tipo: 'radio', label: 'Dove vivete?', opzioni: [['affitto', 'In affitto'], ['proprieta', 'In una casa di proprietà'], ['altro', 'Altro (comodato, ospiti)']] },
        { id: 'affittoMensile', tipo: 'eur', label: 'Affitto mensile', show: (d) => d.abitazione === 'affitto' },
        { id: 'contrattoRegistrato', tipo: 'bool', label: 'Il contratto d\'affitto è registrato?', show: (d) => d.abitazione === 'affitto', help: 'Solo il canone di un contratto registrato si sottrae nell\'ISEE (fino a 7.000 € l\'anno).' },
        { id: 'rataMutuo', tipo: 'eur', label: 'Rata mensile del mutuo' },
        { id: 'bollette', tipo: 'eur', label: 'Bollette (luce, gas, acqua, internet), media mensile' },
        { id: 'trasporti', tipo: 'eur', label: 'Trasporti per lavoro o scuola, al mese' },
        { id: 'prestiti', tipo: 'eur', label: 'Rate di prestiti o finanziamenti, al mese' },
        { id: 'assicurazioni', tipo: 'eur', label: 'Assicurazioni, media mensile' },
        { id: 'altreSpese', tipo: 'eur', label: 'Altre spese fisse (mensa, cure, rette), al mese' }
      ]
    },
    {
      titolo: 'Patrimonio al 31/12/2025',
      intro: 'Indica la situazione al 31 dicembre 2025 di tutto il nucleo.',
      campi: [
        { id: 'valoreCasa', tipo: 'eur', label: 'Valore IMU della casa in cui vivete', show: (d) => d.abitazione === 'proprieta', help: 'Non è il prezzo di mercato. Se non lo sai, calcolalo qui sotto dalla rendita catastale.', rendita: true },
        { id: 'mutuoCasa', tipo: 'eur', label: 'Mutuo residuo sulla casa al 31/12/2025', show: (d) => d.abitazione === 'proprieta' },
        { id: 'capoluogoMetro', tipo: 'bool', label: 'La casa è in un capoluogo di città metropolitana?', show: (d) => d.abitazione === 'proprieta', help: 'Sono ' + R.capoluoghiMetro.join(', ') + '. Qui la franchigia dell\'ISEE per prestazioni familiari sale a 120.000 €.' },
        { id: 'altriImmobili', tipo: 'eur', label: 'Valore IMU di altri immobili o terreni' },
        { id: 'mutuoAltri', tipo: 'eur', label: 'Mutuo residuo su questi altri immobili', show: (d) => d.altriImmobili > 0 },
        { id: 'contiSaldo', tipo: 'eur', label: 'Conti correnti e carte: saldo al 31/12/2025 (somma)' },
        { id: 'contiGiacenza', tipo: 'eur', label: 'Conti correnti e carte: giacenza media 2025 (somma)', help: 'La trovi nell\'estratto conto o la chiedi alla banca. Si usa il valore più alto tra saldo e giacenza media.' },
        { id: 'titoliStato', tipo: 'eur', label: 'Titoli di Stato, buoni fruttiferi e libretti postali', help: 'Sono esclusi dall\'ISEE fino a 50.000 € in tutto.' },
        { id: 'altriInvestimenti', tipo: 'eur', label: 'Altri investimenti (fondi, azioni, polizze vita, conti deposito)' }
      ]
    },
    {
      titolo: 'ISEE corrente (facoltativo)',
      intro: 'Se oggi guadagni molto meno del 2025, l\'ISEE corrente può usare i redditi più recenti.',
      campi: [
        { id: 'peggiorata', tipo: 'bool', label: 'La tua situazione è peggiorata dopo il 2025?' },
        { id: 'motivo', tipo: 'radio', label: 'Che cosa è successo?', show: (d) => d.peggiorata, opzioni: Object.entries(D.MOTIVI_CORRENTE).map(([k, v]) => [k, v.label]) },
        { id: 'modoCorrente', tipo: 'radio', label: 'Quali redditi vuoi usare?', show: (d) => d.peggiorata && D.MOTIVI_CORRENTE[d.motivo] && D.MOTIVI_CORRENTE[d.motivo].dueMesi,
          opzioni: [['12mesi', 'Ultimi 12 mesi'], ['2mesi', 'Ultimi 2 mesi (moltiplicati per 6)']] },
        { id: 'correnteLD', tipo: 'eur', label: 'Lavoro dipendente e pensioni nel periodo scelto (tutto il nucleo)', show: (d) => d.peggiorata, help: 'Importi lordi, come nelle buste paga o nel cedolino.' },
        { id: 'correnteLA', tipo: 'eur', label: 'Lavoro autonomo nel periodo (incassi meno spese)', show: (d) => d.peggiorata },
        { id: 'correnteTR', tipo: 'eur', label: 'Sussidi pubblici nel periodo (es. NASpI, Assegno Unico)', show: (d) => d.peggiorata }
      ]
    }
  ];

  /* ---------------- Router ---------------- */
  const ROUTES = { '': viewHome, stima: viewStima, risultati: viewRisultati, consigli: viewConsigli, documenti: viewDocumenti, diritti: viewDiritti, fonti: viewFonti, contatti: viewContatti, privacy: viewPrivacy };
  function route() { return (location.hash.replace(/^#\/?/, '').split('?')[0] || '').toLowerCase(); }
  function render() {
    const r = route();
    const view = ROUTES[r] || viewHome;
    $app.innerHTML = view();
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const key = a.getAttribute('data-nav');
      const active = (key === 'home' && (r === '' || !ROUTES[r])) || key === r || (key === 'risultati' && r === 'diritti');
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (r === 'stima') bindWizard();
    applyPct();
    if (r === 'documenti') bindChecklist();
    if (r === 'contatti') bindContatti();
    applySeo(r);
    window.scrollTo(0, 0);
  }

  /* ---------------- Viste ---------------- */
  const DISCLAIMER = '<div class="disclaimer" role="note"><strong>Attenzione:</strong> Stima orientativa basata sulle regole note a novembre 2026. I valori ufficiali si ottengono solo con la DSU presentata a INPS o CAF. Alcuni importi 2027 sono ancora stime.</div>';

  function viewHome() {
    const ripresa = hasData();
    return `
      <section class="card hero">
        <h1>Capisci il tuo ISEE 2027 prima di andare al CAF</h1>
        <p>In 5 passi stimi l'ISEE ordinario, quello per le prestazioni familiari e l'eventuale ISEE corrente, scopri quanto ti resta ogni mese per vivere e quali aiuti puoi chiedere.</p>
        <p class="muted">Gratis, senza registrazione, facile da utilizzare. I calcoli restano solo sul tuo telefono. Se ci scrivi dal modulo contatti, partono soltanto le informazioni che inserisci tu.</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="#/stima">${ripresa ? 'Riprendi la stima' : 'Inizia la stima'}</a>
          ${ripresa ? '<a class="btn btn-ghost" href="#/risultati">Vedi i risultati</a>' : ''}
        </div>
      </section>
      ${DISCLAIMER}
      <h2>Da dove vuoi partire?</h2>
      <div class="paths">
        <a class="path" href="#/stima"><span class="ico" aria-hidden="true">🧭</span><span><strong>Stima ISEE e residuo</strong><span class="muted">Nucleo, redditi 2025, spese, patrimonio al 31/12/2025.</span></span></a>
        <a class="path" href="#/diritti"><span class="ico" aria-hidden="true">🏛️</span><span><strong>Diritti e aiuti pubblici</strong><span class="muted">Assegno di Inclusione, Assegno Unico, bonus sociali e altri, con le soglie.</span></span></a>
        <a class="path" href="#/consigli"><span class="ico" aria-hidden="true">💡</span><span><strong>Come ottimizzare legalmente</strong><span class="muted">Cosa conta davvero nell'ISEE e cosa non fare mai.</span></span></a>
        <a class="path" href="#/documenti"><span class="ico" aria-hidden="true">📄</span><span><strong>Documenti per la DSU 2027</strong><span class="muted">Lista da spuntare e stampare prima del CAF.</span></span></a>
      </div>
      <section class="card mt16">
        <h2>Quali anni contano per l'ISEE 2027?</h2>
        <ul class="tips">
          <li><strong>Redditi del 2025</strong>, cioè quelli della CU 2026 o del 730/2026.</li>
          <li><strong>Patrimonio al 31 dicembre 2025</strong>: conti, investimenti, case.</li>
          <li><strong>Affitto</strong>: il canone del contratto registrato, fino a 7.000 € l'anno.</li>
        </ul>
        <p class="small muted">Lo prevede il DPCM 159/2013 (artt. 4 e 5): si guarda al secondo anno prima della DSU.</p>
      </section>
      <p class="small">Una domanda su DirittiChiari? <a href="#/contatti">Scrivici dal modulo contatti</a>.</p>`;
  }

  /* -------- Wizard -------- */
  function currentStep() { const s = parseInt(localStorage.getItem(STEP_KEY) || '0', 10); return Math.min(Math.max(0, s), STEPS.length - 1); }

  function fieldHtml(f, d, errors) {
    if (f.show && !f.show(d)) return '';
    const err = errors && errors[f.id] ? `<div class="error" id="err-${f.id}">${esc(errors[f.id])}</div>` : '';
    const help = f.help ? `<div class="help" id="help-${f.id}">${esc(f.help)}</div>` : '';
    const desc = [f.help ? 'help-' + f.id : '', err ? 'err-' + f.id : ''].filter(Boolean).join(' ');
    if (f.tipo === 'bool') {
      return `<fieldset class="field" data-field="${f.id}"><legend>${esc(f.label)}</legend>
        <label class="choice"><input type="radio" name="${f.id}" value="si" ${d[f.id] ? 'checked' : ''}> Sì</label>
        <label class="choice"><input type="radio" name="${f.id}" value="no" ${!d[f.id] ? 'checked' : ''}> No</label>${help}${err}</fieldset>`;
    }
    if (f.tipo === 'radio') {
      return `<fieldset class="field" data-field="${f.id}"><legend>${esc(f.label)}</legend>
        ${f.opzioni.map(([v, l]) => `<label class="choice"><input type="radio" name="${f.id}" value="${v}" ${d[f.id] === v ? 'checked' : ''}> ${esc(l)}</label>`).join('')}${help}${err}</fieldset>`;
    }
    const isEur = f.tipo === 'eur';
    const val = d[f.id] === 0 && isEur ? '' : d[f.id];
    const rendita = f.rendita ? `
      <details class="mini-calc"><summary>Calcola dalla rendita catastale</summary>
        <div class="field"><label for="rendita">Rendita catastale (dalla visura)</label>
          <div class="input-wrap euro"><input id="rendita" type="number" inputmode="decimal" min="0" step="0.01"></div>
          <div class="help">Per le abitazioni (categorie A, escluso A/10): rendita × 1,05 × 160.</div></div>
        <button type="button" class="btn btn-ghost btn-block" data-action="rendita">Usa questo valore</button>
      </details>` : '';
    return `<div class="field${err ? ' invalid' : ''}" data-field="${f.id}">
      <label for="f-${f.id}">${esc(f.label)}</label>
      <div class="input-wrap${isEur ? ' euro' : ''}">
        <input id="f-${f.id}" name="${f.id}" type="number" inputmode="${isEur ? 'decimal' : 'numeric'}" min="${f.min != null ? f.min : 0}" ${f.max != null ? `max="${f.max}"` : ''} step="${isEur ? '0.01' : '1'}"
          value="${esc(val)}" placeholder="${isEur ? '0' : ''}" ${desc ? `aria-describedby="${desc}"` : ''} ${err ? 'aria-invalid="true"' : ''}>
      </div>${help}${err}${rendita}</div>`;
  }

  function viewStima(errors) {
    const d = load();
    const i = currentStep();
    const s = STEPS[i];
    const pct = Math.round(((i + 1) / STEPS.length) * 100);
    return `
      <section class="card">
        <div class="steps-label">Passo ${i + 1} di ${STEPS.length}</div>
        <div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuenow="${i + 1}" aria-label="Avanzamento"><span data-pct="${pct}"></span></div>
        <h1 id="step-title">${esc(s.titolo)}</h1>
        <p class="muted">${esc(s.intro)}</p>
        <form id="wizard" novalidate>
          ${s.campi.map((f) => fieldHtml(f, d, errors)).join('')}
          <div class="btn-row">
            ${i > 0 ? '<button type="button" class="btn btn-ghost" data-action="back">Indietro</button>' : ''}
            <button type="submit" class="btn btn-primary">${i === STEPS.length - 1 ? 'Calcola i risultati' : 'Avanti'}</button>
          </div>
        </form>
      </section>
      <p class="small muted">I dati della stima vengono salvati solo su questo dispositivo mentre scrivi.</p>`;
  }

  /** Legge i campi visibili del passo corrente e li salva. */
  function readForm() {
    const d = load();
    const form = document.getElementById('wizard');
    if (!form) return d;
    STEPS[currentStep()].campi.forEach((f) => {
      if (f.tipo === 'bool') { const el = form.querySelector(`input[name="${f.id}"]:checked`); if (el) d[f.id] = el.value === 'si'; }
      else if (f.tipo === 'radio') { const el = form.querySelector(`input[name="${f.id}"]:checked`); if (el) d[f.id] = el.value; }
      else { const el = form.querySelector(`[name="${f.id}"]`); if (el) { const v = parseFloat(String(el.value).replace(',', '.')); d[f.id] = Number.isFinite(v) && v > 0 ? (f.tipo === 'int' ? Math.floor(v) : v) : (f.id === 'componenti' ? 1 : 0); } }
    });
    // azzera i campi nascosti dipendenti, così non falsano i calcoli
    if (!d.minori) { d.under3 = 0; d.genitoreSolo = false; d.genitoriLavorano = false; }
    if (!d.over60) d.over67 = 0;
    save(d);
    return d;
  }

  function validate(d) {
    const s = STEPS[currentStep()];
    const e = {};
    s.campi.forEach((f) => {
      if (f.show && !f.show(d)) return;
      if (f.tipo === 'int' || f.tipo === 'eur') {
        const el = document.querySelector(`[name="${f.id}"]`);
        const raw = el ? String(el.value).trim() : '';
        if (raw !== '' && (!Number.isFinite(parseFloat(raw.replace(',', '.'))) || parseFloat(raw) < 0)) e[f.id] = 'Inserisci un numero uguale o maggiore di zero.';
        if (f.max != null && d[f.id] > f.max) e[f.id] = `Massimo ${f.max}.`;
      }
    });
    return Object.assign(e, s.check ? s.check(d) : {});
  }

  function bindWizard() {
    const form = document.getElementById('wizard');
    if (!form) return;
    // salvataggio automatico e campi condizionali
    form.addEventListener('change', (ev) => {
      if (ev.target && ev.target.id === 'rendita') return;
      const before = [...form.querySelectorAll('[data-field]')].map((el) => el.dataset.field).join(','); // campi mostrati ora
      const d = readForm();
      // se cambia l'elenco dei campi visibili (es. compaiono domande sui minori) ridisegna il passo
      if (visibleIds(d) !== before || (ev.target && ev.target.type === 'radio')) {
        const name = ev.target && ev.target.name;
        const isRadio = ev.target && ev.target.type === 'radio';
        setTimeout(() => {
          const act = document.activeElement && document.activeElement.id;
          rerenderStep(isRadio ? name : null);
          if (!isRadio && act && document.getElementById(act)) document.getElementById(act).focus();
        }, 0);
      }
    });
    // salva anche mentre si digita, così un ridisegno non perde valori non ancora confermati
    form.addEventListener('input', (ev) => { if (ev.target && ev.target.id !== 'rendita' && ev.target.type === 'number') readForm(); });
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const d = readForm();
      const errors = validate(d);
      if (Object.keys(errors).length) {
        $app.innerHTML = viewStima(errors); bindWizard(); applyPct();
        const first = document.querySelector('.field .error');
        if (first) { const inp = first.closest('.field').querySelector('input'); if (inp) inp.focus(); }
        announce('Controlla i campi segnalati.');
        return;
      }
      const i = currentStep();
      if (i < STEPS.length - 1) { localStorage.setItem(STEP_KEY, String(i + 1)); render(); focusTitle(); }
      else { location.hash = '#/risultati'; }
    });
    form.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-action]');
      if (!a) return;
      if (a.dataset.action === 'back') { readForm(); localStorage.setItem(STEP_KEY, String(Math.max(0, currentStep() - 1))); render(); focusTitle(); }
      if (a.dataset.action === 'rendita') {
        const v = D.valoreImuDaRendita(document.getElementById('rendita').value);
        const inp = document.getElementById('f-valoreCasa');
        if (inp && v > 0) { inp.value = v; readForm(); announce('Valore IMU inserito: ' + eur(v)); }
      }
    });
  }
  /** Elenco dei campi visibili nel passo corrente, per capire se serve ridisegnare. */
  function visibleIds(d) { return STEPS[currentStep()].campi.filter((f) => !f.show || f.show(d)).map((f) => f.id).join(','); }
  function rerenderStep(focusName) {
    $app.innerHTML = viewStima(); bindWizard(); applyPct();
    if (!focusName) return;
    const el = document.querySelector(`input[name="${focusName}"]:checked`);
    if (el) el.focus();
  }
  /** Larghezza della barra di avanzamento via CSSOM (compatibile con la CSP, niente stili inline). */
  function applyPct() { document.querySelectorAll('[data-pct]').forEach((el) => { el.style.width = el.dataset.pct + '%'; }); }
  function focusTitle() { const t = document.getElementById('step-title'); if (t) { t.setAttribute('tabindex', '-1'); t.focus(); } }

  /* -------- Risultati -------- */
  function riga(l, v, cls) { return `<tr${cls ? ` class="${cls}"` : ''}><td>${l}</td><td>${v}</td></tr>`; }

  function dettaglioIsee(x) {
    const r = x.isr, p = x.isp;
    return `<details><summary>Come è calcolato</summary>
      <table class="calc">
        ${riga('Redditi 2025 considerati' + (r.figurativo ? ' (compreso il rendimento figurativo degli investimenti: ' + eur(r.figurativo) + ')' : ''), eur(r.redditi))}
        ${r.detrDip ? riga('− 20% dei redditi da lavoro (max 3.000 € a persona)', eur(r.detrDip)) : ''}
        ${r.detrPens ? riga('− 20% delle pensioni (max 1.000 € a persona)', eur(r.detrPens)) : ''}
        ${r.mantenimento ? riga('− assegni di mantenimento versati', eur(r.mantenimento)) : ''}
        ${r.affitto ? riga('− affitto con contratto registrato', eur(r.affitto)) : ''}
        ${riga('= Indicatore reddituale (ISR)', eur(r.totale), 'tot')}
        ${p.casa.netto ? riga(`Casa: ${eur(p.casa.netto)} al netto del mutuo, franchigia ${eur(p.casa.franchigia)}, conta 2/3 dell'eccedenza`, eur(p.casa.rileva)) : ''}
        ${p.altriImmobili ? riga('Altri immobili al netto del mutuo', eur(p.altriImmobili)) : ''}
        ${riga(`Patrimonio mobiliare ${eur(p.mobiliare.lordo)}${p.mobiliare.titoliEsclusi ? ' (titoli di Stato esclusi: ' + eur(p.mobiliare.titoliEsclusi) + ')' : ''} − franchigia ${eur(p.mobiliare.franchigia)}`, eur(p.mobiliare.netto))}
        ${riga('= Indicatore patrimoniale (ISP)', eur(p.totale), 'tot')}
        ${riga('ISE = ISR + 20% dell\'ISP', eur(x.ise), 'tot')}
        ${riga('Scala di equivalenza: ' + x.scala.parti.map((q) => esc(q.voce) + ' ' + q.valore.toLocaleString('it-IT')).join(' + '), x.scala.valore.toLocaleString('it-IT'))}
        ${riga('ISEE = ISE ÷ scala', eur2(x.isee), 'tot')}
      </table></details>`;
  }

  function viewRisultati() {
    if (!hasData()) return `<section class="card"><h1>Risultati</h1><p>Non hai ancora inserito dati. Ci vogliono pochi minuti.</p><a class="btn btn-primary" href="#/stima">Inizia la stima</a></section>${DISCLAIMER}`;
    const ris = D.calcolaTutto(load());
    const d = ris.input;
    const res = ris.residuo;
    const neg = res.mensile < 0;
    const c = ris.corrente;
    const gain = ris.ordinario.isee - ris.speciale.isee;
    const sp = res.spese;
    const ben = ris.benefici;
    const etichetta = { si: 'Probabile', forse: 'Da verificare', no: 'Soglia superata' };
    const statoTxt = { verificato: 'Valore verificato', valore2026: 'Valore 2026, da confermare per il 2027', da_confermare: 'Da confermare' };

    let correnteHtml = '';
    if (c) {
      correnteHtml = `<section class="card"><h2>ISEE corrente stimato</h2>
        <div class="kpis">
          <div class="kpi"><span class="tag">Corrente ordinario</span><span class="value">${eur(c.ordinario.isee)}</span><span class="muted">contro ${eur(ris.ordinario.isee)} dell'ordinario</span></div>
          <div class="kpi"><span class="tag">Corrente per prestazioni familiari</span><span class="value">${eur(c.speciale.isee)}</span><span class="muted">contro ${eur(ris.speciale.isee)}</span></div>
        </div>
        ${c.ammesso ? '' : `<div class="notice warn">Con un calo del reddito senza perdita del lavoro, l'ISEE corrente si può chiedere solo se l'indicatore reddituale scende di oltre il 25%. Qui la variazione stimata è del ${Math.round(c.variazione * 100)}%.</div>`}
        ${c.ammesso && c.conviene ? '<div class="notice ok">L\'ISEE corrente sembra conveniente. Prima devi avere un ISEE ordinario valido; il corrente dura 6 mesi (se cambi solo i redditi).</div>' : ''}
        ${c.ammesso && !c.conviene ? '<div class="notice warn">Con questi dati l\'ISEE corrente non risulta più basso dell\'ordinario.</div>' : ''}
        ${c.moltiplicatore === 6 ? '<p class="small muted">Hai usato i redditi degli ultimi 2 mesi moltiplicati per 6.</p>' : ''}
        ${dettaglioIsee(c.ordinario)}
      </section>`;
    }

    return `
      <h1>I tuoi risultati</h1>
      ${DISCLAIMER}
      <section class="big-result${neg ? ' neg' : ''}" aria-labelledby="res-title">
        <span id="res-title">${neg ? 'Ogni mese ti mancano circa' : 'Ti rimangono circa'}</span>
        <span class="value">${eur(Math.abs(res.mensile))} al mese</span>
        <span>${neg ? 'per coprire le spese fisse.' : 'per vivere, dopo le spese fisse'}${d.componenti > 1 && !neg ? ` (circa ${eur(res.perPersona)} a persona)` : ''}.</span>
      </section>
      <section class="card"><h2>Da dove viene il residuo</h2>
        <table class="calc">
          ${riga('Entrate nette mensili di oggi', eur(res.entrate))}
          ${sp.casa ? riga(d.abitazione === 'affitto' ? '− Affitto (e mutuo)' : '− Rata del mutuo', eur(sp.casa)) : ''}
          ${sp.bollette ? riga('− Bollette', eur(sp.bollette)) : ''}
          ${sp.trasporti ? riga('− Trasporti', eur(sp.trasporti)) : ''}
          ${sp.prestiti ? riga('− Rate di prestiti', eur(sp.prestiti)) : ''}
          ${sp.assicurazioni ? riga('− Assicurazioni', eur(sp.assicurazioni)) : ''}
          ${sp.altre ? riga('− Altre spese fisse', eur(sp.altre)) : ''}
          ${riga('= Residuo per vivere', eur(res.mensile), 'tot')}
        </table>
        <p class="small muted">Il residuo è il tuo conto pratico: bollette, trasporti e rate non entrano nell'ISEE.</p>
        ${res.entrate === 0 ? '<div class="notice warn">Non hai indicato le entrate nette mensili di oggi (passo 2): il residuo potrebbe non essere corretto.</div>' : ''}
      </section>

      <div class="kpis">
        <div class="kpi"><span class="tag">ISEE ordinario 2027</span><span class="value">${eur(ris.ordinario.isee)}</span>
          <span class="muted">Vale per la maggior parte delle prestazioni: bonus sociali, Carta "Dedicata a te", servizi comunali.</span>${dettaglioIsee(ris.ordinario)}</div>
        <div class="kpi"><span class="tag">ISEE per prestazioni familiari e inclusione</span><span class="value">${eur(ris.speciale.isee)}</span>
          <span class="muted">Si usa per Assegno di Inclusione, Assegno Unico, bonus nido e bonus nuovi nati. Franchigia casa ${d.capoluogoMetro ? '120.000 €' : '91.500 €'} e maggiorazioni dai 2 figli.</span>
          ${gain > 0.5 ? `<div class="notice ok small mt8">È più basso dell'ordinario di ${eur(gain)}.</div>` : ''}
          ${ris.input.auu2025 > 0 ? `<p class="small">Al netto dell'Assegno Unico (usato per AUU, nido e nuovi nati): <strong>${eur(ris.specialeNeutralizzato)}</strong></p>` : ''}
          ${dettaglioIsee(ris.speciale)}</div>
      </div>
      ${correnteHtml}

      <section class="card" id="benefici"><h2>Aiuti che puoi valutare nel 2027</h2>
        <p class="muted small">Le soglie sono quelle in vigore nel 2026, salvo dove indicato. Ogni aiuto ha altri requisiti oltre all'ISEE.</p>
        ${ris.beneficiConCorrente ? '<div class="notice ok small">Gli esiti qui sotto usano il tuo ISEE corrente stimato, che è più basso dell\'ordinario.</div>' : ''}
        ${ben.map((b) => `<article class="benefit ${b.esito}">
          <h3>${esc(b.nome)}</h3>
          <span class="badge ${b.esito}">${etichetta[b.esito]}</span><span class="badge stato">${statoTxt[b.stato] || ''}</span>
          <p class="small"><strong>Soglia:</strong> ${esc(b.soglia)}<br><strong>Quanto:</strong> ${esc(b.importo)}</p>
          <p class="small muted">${esc(b.nota)}</p>
          <a class="small" href="${b.fonte.url}" target="_blank" rel="noopener">Fonte: ${esc(b.fonte.titolo)}</a>
        </article>`).join('')}
      </section>

      <section class="card no-print"><h2>E adesso?</h2>
        <div class="paths">
          <a class="path" href="#/documenti"><span class="ico" aria-hidden="true">📄</span><span><strong>Prepara i documenti</strong><span class="muted">Checklist DSU 2027${c ? ' e ISEE corrente' : ''}.</span></span></a>
          <a class="path" href="#/consigli"><span class="ico" aria-hidden="true">💡</span><span><strong>Come ottimizzare legalmente</strong><span class="muted">Le scelte permesse che abbassano l'ISEE.</span></span></a>
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" data-action="print">Stampa o salva in PDF</button>
          <a class="btn btn-ghost" href="#/stima" data-action="edit">Modifica i dati</a>
        </div>
      </section>`;
  }

  /* -------- Consigli -------- */
  function viewConsigli() {
    return `
      <h1>Come ottimizzare legalmente</h1>
      ${DISCLAIMER}
      <section class="card"><h2>Residuo pratico e ISEE sono due cose diverse</h2>
        <p>Il residuo è quanto ti resta davvero ogni mese. L'ISEE invece guarda ai redditi 2025 e al patrimonio al 31/12/2025: bollette, trasporti, rate di prestiti e assicurazioni <strong>non</strong> lo abbassano.</p></section>
      <section class="card"><h2>Scelte permesse che contano</h2>
        <ul class="tips">
          <li><strong>Registra il contratto d'affitto</strong> e tieni a portata gli estremi di registrazione: solo così il canone si sottrae dai redditi (fino a 7.000 € l'anno, +500 € per ogni figlio dopo il secondo).</li>
          <li><strong>Indica il mutuo residuo al 31/12/2025</strong> per ogni immobile: si sottrae dal valore della casa. Chiedi alla banca la certificazione del debito residuo.</li>
          <li><strong>Casa di proprietà</strong>: nell'ISEE per prestazioni familiari e inclusione la franchigia è di 91.500 € (120.000 € nei capoluoghi delle città metropolitane), +2.500 € per ogni figlio convivente dopo il primo. Lo calcola l'INPS in automatico, non devi fare nulla.</li>
          <li><strong>Titoli di Stato, buoni fruttiferi e libretti postali</strong> sono esclusi fino a 50.000 € in tutto per il nucleo (DPCM 13/2025). Dichiarali comunque: l'esclusione la applica il calcolo.</li>
          <li><strong>Conti correnti</strong>: conta il valore più alto tra saldo al 31/12 e giacenza media annua. Controlla bene entrambi sull'estratto conto.</li>
          <li><strong>Disabilità</strong>: dichiara le certificazioni di disabilità media, grave o non autosufficienza: ogni persona aggiunge 0,5 alla scala, e i trattamenti legati alla disabilità non tassati non contano nei redditi.</li>
          <li><strong>Usa la DSU precompilata</strong> sul portale INPS: riduce gli errori e le difformità che bloccano gli aiuti.</li>
        </ul></section>
      <section class="card"><h2>Quando conviene l'ISEE corrente</h2>
        <ul class="tips">
          <li>Hai perso o ridotto un lavoro a tempo indeterminato, ti è finito un contratto a termine (almeno 120 giorni negli ultimi 12 mesi) o hai chiuso un'attività autonoma.</li>
          <li>Si è interrotto un sussidio pubblico (per esempio la NASpI).</li>
          <li>Il tuo indicatore reddituale è calato di oltre il 25% rispetto a quello dell'ISEE ordinario.</li>
        </ul>
        <p>Serve prima un ISEE ordinario valido. Se aggiorni solo i redditi, il corrente vale 6 mesi. Dal 1° aprile puoi aggiornare anche il patrimonio, se è cambiato di oltre il 20%.</p></section>
      <section class="card"><h2>Cosa non fare mai</h2>
        <ul class="tips">
          <li>Non omettere componenti del nucleo, conti, investimenti o immobili: i dati vengono incrociati con Agenzia delle Entrate e INPS.</li>
          <li>Non spostare la residenza in modo fittizio per dividere il nucleo.</li>
          <li>Non intestare beni ad altri o nascondere patrimonio: oltre a perdere gli aiuti, la DSU falsa ha conseguenze penali e si restituisce quanto ricevuto.</li>
        </ul>
        <p class="small muted">Per casi particolari (separazioni, figli non conviventi, eredità, imprese) rivolgiti a un CAF o a un patronato.</p></section>`;
  }

  /* -------- Documenti -------- */
  const DOCS = [
    ['Documenti d\'identità e codici fiscali di tutti i componenti del nucleo', 'base'],
    ['SPID, CIE o CNS di ogni maggiorenne, se vuoi usare la DSU precompilata', 'base'],
    ['Contratto d\'affitto registrato (estremi di registrazione) e canone annuo', 'base'],
    ['Redditi 2025: Certificazione Unica 2026, modello 730/2026 o Redditi PF 2026 di ogni componente', 'base'],
    ['Redditi 2025 non tassati o a imposta sostitutiva (es. borse di studio, redditi esteri, forfettari)', 'base'],
    ['Assegni di mantenimento ricevuti o versati nel 2025 (sentenza o accordo)', 'base'],
    ['Saldo al 31/12/2025 e giacenza media 2025 di ogni conto, carta prepagata con IBAN e libretto', 'base'],
    ['Valore al 31/12/2025 di titoli, buoni postali, fondi, azioni e polizze vita (estratti della banca o di Poste)', 'base'],
    ['Visure catastali o rendite di case e terreni posseduti al 31/12/2025', 'base'],
    ['Certificato del mutuo residuo al 31/12/2025', 'base'],
    ['Targhe di auto, moto e imbarcazioni intestate ai componenti', 'base'],
    ['Verbali di disabilità o non autosufficienza', 'base'],
    ['ISEE ordinario già attestato (serve prima di chiedere il corrente)', 'corrente'],
    ['Lettera di licenziamento, fine contratto, chiusura della partita IVA o comunicazione di interruzione del sussidio', 'corrente'],
    ['Buste paga, cedolini e incassi degli ultimi 12 mesi (o degli ultimi 2 mesi, se ammesso)', 'corrente'],
    ['Importi di NASpI, cassa integrazione o altri sussidi degli ultimi 12 mesi', 'corrente']
  ];
  function viewDocumenti() {
    let chk = {};
    try { chk = JSON.parse(localStorage.getItem(CHECK_KEY) || '{}'); } catch (e) { chk = {}; }
    const li = (arr) => arr.map(([t], k) => { const idx = DOCS.findIndex((x) => x[0] === t); return `<li><label><input type="checkbox" data-doc="${idx}" ${chk[idx] ? 'checked' : ''}> <span>${esc(t)}</span></label></li>`; }).join('');
    const base = DOCS.filter((x) => x[1] === 'base');
    const corr = DOCS.filter((x) => x[1] === 'corrente');
    return `
      <h1>Documenti per la DSU 2027</h1>
      <p class="muted">Spunta quello che hai già. La lista resta salvata su questo dispositivo.</p>
      <section class="card"><h2>Per tutti</h2><ul class="checklist">${li(base)}</ul></section>
      <section class="card"><h2>In più, per l'ISEE corrente</h2><ul class="checklist">${li(corr)}</ul></section>
      <section class="card no-print">
        <p>Puoi presentare la DSU da solo sul <a href="${R.fonti.portaleIsee.url}" target="_blank" rel="noopener">portale ISEE dell'INPS</a>, con l'app INPS Mobile o gratis tramite un CAF.</p>
        <button type="button" class="btn btn-primary btn-block" data-action="print">Stampa la lista o salvala in PDF</button>
      </section>
      ${DISCLAIMER}`;
  }
  function bindChecklist() {
    $app.querySelectorAll('input[data-doc]').forEach((el) => el.addEventListener('change', () => {
      let chk = {};
      try { chk = JSON.parse(localStorage.getItem(CHECK_KEY) || '{}'); } catch (e) { chk = {}; }
      chk[el.dataset.doc] = el.checked;
      localStorage.setItem(CHECK_KEY, JSON.stringify(chk));
    }));
  }

  /* -------- Diritti PA -------- */
  function viewDiritti() {
    const f = R.fonti;
    const rows = [
      ['Assegno di Inclusione (ADI)', `ISEE per prestazioni familiari fino a ${eur(R.adi.isee)}`, 'Nuclei con minori, persone con disabilità, over 60 o in carico ai servizi', f.adi, 'Verificato'],
      ['Assegno Unico per i figli', `Importo pieno fino a ${eur2(R.auu.iseeMin)}; minimo da ${eur2(R.auu.iseeMax)}`, `Da ${eur2(R.auu.importoMin)} a ${eur2(R.auu.importoMax)} al mese per figlio minorenne`, f.auu, 'Valori 2026, da confermare per il 2027'],
      ['Bonus sociali luce, gas, acqua, TARI', `ISEE fino a ${eur(R.bonusSociali.isee)} (${eur(R.bonusSociali.iseeFamNumerose)} con 4+ figli a carico)`, 'Automatici con la DSU', f.arera, 'Verificato (aggiornamento triennale dal 2026)'],
      ['Carta "Dedicata a te"', `ISEE ordinario fino a ${eur(R.cartaDedicata.isee)}`, `${eur(R.cartaDedicata.importo)} l'anno, lista unica 2026-2027`, f.dedicata, 'Verificato'],
      ['Carta Acquisti', `ISEE fino a ${eur2(R.cartaAcquisti.isee)}`, 'Bambini sotto i 3 anni e persone da 65 anni', f.cartaAcquisti, 'Valore 2026, rivalutato ogni anno'],
      ['Bonus asilo nido', `Importo pieno con ISEE minorenni fino a ${eur(R.nido.soglia2)}`, '3.600 € per i nati dal 2024; 3.000/2.500/1.500 € per i nati prima', f.nido, 'Valori 2026, da confermare per il 2027'],
      ['Bonus nuovi nati', `ISEE fino a ${eur(R.nuoviNati.isee)}`, `${eur(R.nuoviNati.importo)} una tantum`, f.nuoviNati, 'Confermato per il 2026, da confermare per il 2027'],
      ['Contributo affitto (Comuni e Regioni)', 'Soglie del singolo bando', 'In Veneto: Fondo affitti tramite i bandi comunali', f.venetoAffitti, 'Da verificare nel bando']
    ];
    return `
      <h1>Diritti e aiuti pubblici legati all'ISEE</h1>
      ${DISCLAIMER}
      <p class="muted">Ogni aiuto ha altri requisiti (residenza, cittadinanza, età, patrimonio). Apri la fonte ufficiale prima di fare domanda.</p>
      ${rows.map(([n, s, q, fo, st]) => `<article class="benefit forse"><h3>${esc(n)}</h3><span class="badge stato">${esc(st)}</span>
        <p class="small"><strong>Soglia:</strong> ${esc(s)}<br><strong>Cosa offre:</strong> ${esc(q)}</p>
        <a class="small" href="${fo.url}" target="_blank" rel="noopener">Fonte: ${esc(fo.titolo)}</a></article>`).join('')}
      <section class="card"><h2>Quale ISEE si usa?</h2>
        <p>Dal 2026 l'INPS calcola anche l'<strong>ISEE per prestazioni familiari e inclusione</strong> (L. 199/2025), più favorevole per chi ha casa di proprietà o almeno 2 figli. Si usa solo per ADI, Supporto formazione e lavoro, Assegno Unico, bonus nido e bonus nuovi nati. Per tutto il resto vale l'ISEE ordinario.</p>
        <a class="btn btn-primary btn-block" href="#/stima">Stima il tuo ISEE</a></section>`;
  }

  /* -------- Fonti -------- */
  function viewFonti() {
    const st = { verificato: 'verificato', valore2026: 'valore 2026, da confermare per il 2027', da_confermare: 'da confermare' };
    const items = [
      ['Scala di equivalenza (1 · 1,57 · 2,04 · 2,46 · 2,85, +0,35)', R.scala],
      ['Maggiorazioni figli ISEE ordinario (0,2 · 0,35 · 0,5)', R.maggFigliOrdinario],
      ['Maggiorazioni figli ISEE speciale (0,1 · 0,25 · 0,40 · 0,55)', R.maggFigliSpeciale],
      ['Quota 20% lavoro dipendente (max 3.000 €) e pensione (max 1.000 €)', R.detrLavoroDip],
      ['Affitto registrato fino a 7.000 € (+500 € per figlio dopo il secondo)', R.affitto],
      ['Franchigia casa ordinario 52.500 € (+2.500 € per figlio dopo il secondo)', R.casaOrdinario],
      ['Franchigia casa speciale 91.500 € / 120.000 € (+2.500 € per figlio dopo il primo)', R.casaSpeciale],
      ['Franchigia mobiliare 6.000 € +2.000 € a componente (max 10.000 €, +1.000 € per figlio dopo il secondo)', R.mobiliare],
      ['Titoli di Stato e risparmio postale esclusi fino a 50.000 €', R.titoliStatoEsclusi],
      ['Rendimento figurativo degli investimenti: ' + (R.tassoFigurativo.valore * 100).toLocaleString('it-IT') + '%', R.tassoFigurativo],
      ['Soglia ADI 10.140 €', R.adi], ['Assegno Unico 2026', R.auu], ['Bonus sociali 9.796 € / 20.000 €', R.bonusSociali],
      ['Carta "Dedicata a te" 15.000 €', R.cartaDedicata], ['Carta Acquisti 8.230,81 €', R.cartaAcquisti], ['Bonus nido', R.nido], ['Bonus nuovi nati', R.nuoviNati]
    ];
    return `<h1>Fonti e regole usate</h1>${DISCLAIMER}
      <section class="card"><table class="calc fonti">${items.map(([l, x]) => riga(esc(l), `<a href="${R.fonti[x.fonte].url}" target="_blank" rel="noopener">${st[x.stato]}</a>`)).join('')}</table></section>
      <section class="card"><h2>Semplificazioni di questa stima</h2><ul class="tips small">
        <li>Le quote del 20% su lavoro e pensione sono calcolate sul totale del nucleo, con il tetto moltiplicato per il numero di persone.</li>
        <li>Non sono gestiti: redditi agrari, immobili all'estero, nuclei con genitori non conviventi (ISEE minorenni), ISEE università e socio-sanitario.</li>
        <li>Il rendimento figurativo usa un tasso indicativo, da confermare ogni anno.</li>
        <li>Nell'ISEE corrente i redditi indicati per il periodo sostituiscono tutti i redditi del nucleo; il patrimonio resta quello al 31/12/2025.</li>
        <li>L'importo dell'Assegno Unico è una stima lineare dell'importo base, senza maggiorazioni.</li>
      </ul></section>
      <section class="card"><h2>Elenco delle fonti</h2><ul class="tips small">${Object.values(R.fonti).map((x) => `<li><a href="${x.url}" target="_blank" rel="noopener">${esc(x.titolo)}</a></li>`).join('')}</ul></section>`;
  }


  /* -------- Contatti e privacy -------- */
  function viewContatti() {
    return `
      <section class="card">
        <h1>Contatti</h1>
        <p>Una domanda su DirittiChiari? Scrivici: ti rispondiamo via email.</p>
        <p class="small muted">I calcoli della stima restano sul tuo dispositivo. Da questo modulo partono soltanto le informazioni che scrivi tu, e le usiamo solo per risponderti. Non viene mai inviato nessun dato del percorso ISEE.</p>
        <div data-modulo-contatti data-privacy="#/privacy" data-titolo="h2">
          <p>Per usare il modulo serve JavaScript. In alternativa scrivi a <a href="mailto:info@pigiservice.com">info@pigiservice.com</a>.</p>
        </div>
      </section>
      ${DISCLAIMER}`;
  }
  function bindContatti() {
    const box = document.querySelector('[data-modulo-contatti]');
    if (box && typeof window.montaModuloContatti === 'function' && !box.querySelector('form')) {
      window.montaModuloContatti(box, 1);
    }
  }
  function viewPrivacy() {
    return `
      <section class="card">
        <h1>Privacy</h1>
        <p>DirittiChiari 2027 è un servizio di <strong>Pi.Gi Service di Gheoca Paula</strong> (titolare del trattamento). Per qualsiasi domanda: <a href="mailto:info@pigiservice.com">info@pigiservice.com</a>.</p>
        <h2>I calcoli restano sul tuo dispositivo</h2>
        <p>La stima ISEE, il residuo per vivere, gli aiuti e la checklist si calcolano e si salvano solo su questo telefono o computer, in locale. Non li inviamo a nessun server, non chiediamo una registrazione, non facciamo tracciamento e non usiamo intelligenza artificiale.</p>
        <p>Puoi cancellare tutto in qualsiasi momento con «Cancella i miei dati», in fondo alla pagina.</p>
        <h2>Modulo contatti</h2>
        <p>Se ci scrivi dal <a href="#/contatti">modulo contatti</a>, inviamo soltanto quello che inserisci tu: nome, email, eventuale telefono o attività, il messaggio, il consenso e la pagina da cui scrivi. Questi dati servono solo per risponderti. Non viene mai incluso nessun dato della stima ISEE o del percorso guidato.</p>
        <p>Il messaggio arriva a <a href="mailto:info@pigiservice.com">info@pigiservice.com</a>. Lo conserviamo il tempo necessario per darti una risposta e per eventuali obblighi di legge.</p>
        <p class="small muted">Aggiornata il 15 novembre 2026.</p>
      </section>
      ${DISCLAIMER}`;
  }

  /* ---------------- Azioni globali ---------------- */
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-action]');
    if (!a) return;
    if (a.dataset.action === 'clear') clearAll();
    if (a.dataset.action === 'print') window.print();
    if (a.dataset.action === 'edit') localStorage.setItem(STEP_KEY, '0');
  });
  window.addEventListener('hashchange', render);

  /* ---------------- Pull-to-refresh (ricarica completa su ogni pagina) ---------------- */
  (function pullToRefresh() {
    const ind = document.getElementById('ptr');
    const THRESHOLD = 80;
    let startY = null, dist = 0;
    window.addEventListener('touchstart', (e) => {
      startY = (window.scrollY <= 0 && e.touches.length === 1) ? e.touches[0].clientY : null; dist = 0;
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (startY == null) return;
      dist = e.touches[0].clientY - startY;
      if (dist > 10 && window.scrollY <= 0) {
        const y = Math.min(dist / 2, 70) - 60;
        ind.style.transform = `translate(-50%, ${y}px)`;
        ind.textContent = dist > THRESHOLD ? '↻ Rilascia per aggiornare' : '↓ Tira per aggiornare';
      }
    }, { passive: true });
    window.addEventListener('touchend', () => {
      if (startY != null && dist > THRESHOLD && window.scrollY <= 0) {
        ind.textContent = 'Aggiornamento…'; ind.style.transform = 'translate(-50%, 12px)';
        hardReload();
      } else { ind.style.transform = 'translate(-50%, -60px)'; }
      startY = null; dist = 0;
    });
  })();
  /** Ricarica completa: controlla un nuovo service worker e ricarica la pagina dalla rete. */
  function hardReload() {
    const go = () => location.reload();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => (reg ? reg.update() : null)).catch(() => null).then(go, go);
      setTimeout(go, 2500); // in ogni caso non restare bloccati
    } else go();
  }
  window.DCApp = { hardReload, version: APP_VERSION };

  /* ---------------- Service worker e banner "nuova versione" ---------------- */
  (function setupSW() {
    const label = document.getElementById('version-label');
    if (label) label.textContent = 'Versione ' + APP_VERSION;
    if (!('serviceWorker' in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller; // false alla prima visita → mai banner
    const banner = document.getElementById('update-banner');
    let refreshing = false, userAccepted = false;
    // ricarica solo dopo che l'utente ha toccato "Aggiorna" (alla prima visita clients.claim() non deve ricaricare)
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshing || !userAccepted) return; refreshing = true; location.reload(); });

    function askVersion(worker) {
      return new Promise((resolve) => {
        const ch = new MessageChannel();
        ch.port1.onmessage = (e) => resolve(e.data && e.data.version);
        worker.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
        setTimeout(() => resolve(null), 1500);
      });
    }
    function offer(worker) {
      if (!hadController || !worker) return;
      askVersion(worker).then((v) => {
        const ver = v || 'nuova';
        if (localStorage.getItem(BANNER_KEY) === ver) return; // una sola volta per versione pubblicata
        localStorage.setItem(BANNER_KEY, ver);
        banner.hidden = false;
        document.getElementById('update-apply').onclick = () => { banner.hidden = true; userAccepted = true; worker.postMessage({ type: 'SKIP_WAITING' }); };
        document.getElementById('update-dismiss').onclick = () => { banner.hidden = true; };
      });
    }
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        if (reg.waiting) offer(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) offer(nw); });
        });
        if (!hadController) localStorage.setItem(BANNER_KEY, APP_VERSION); // prima visita: segna la versione corrente come vista
      }).catch(() => { /* senza SW l'app funziona lo stesso */ });
    });
  })();

  render();
})();
