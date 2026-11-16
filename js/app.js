/*!
 * DirittiChiari 2027 — interfaccia (router a URL pulite, wizard, risultati, PWA).
 * I calcoli restano in localStorage su questo dispositivo. L'unica chiamata di rete è il modulo contatti, con le parole scritte dalla persona.
 */
(function () {
  'use strict';
  const APP_VERSION = window.DC_VERSION || '1.5.2'; // unica fonte: js/version.js
  const STORE_KEY = 'dc2027:dati';
  const STEP_KEY = 'dc2027:passo';
  const CHECK_KEY = 'dc2027:checklist';
  const BANNER_KEY = 'dc2027:banner-visto';
  const D = window.DC;
  const R = D.RULES;
  const $app = document.getElementById('app');
  function numLoc() { return lang() === 'it' ? 'it' : 'en'; }
  const eur = (x) => D.fmtEuro(Math.round(Number(x) || 0), null, numLoc());
  const eur2 = (x) => D.fmtEuro(x, 2, numLoc());
  const dec = (x) => D.fmtDec(x, numLoc());
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SITE = 'https://dirittiok.com/';
  const I = window.DC_i18n || { t: (k) => k, rich: (k) => k, langPath: (p) => p, current: () => 'it', setLang: function () {}, langFromPath: function () { return 'it'; } };
  function lang() { return I.current(); }
  function t(key, params) { return I.t(key, params); }
  function rich(key, params) { return I.rich(key, params); }
  function u(path) { return I.langPath(path); }
  const SLUG_BY_ROUTE = { '': '', stima: 'stima', risultati: 'risultati', consigli: 'ottimizzazione', documenti: 'checklist-dsu', diritti: 'diritti-pa', auu: 'isee-assegno-unico', fonti: 'fonti', metodo: 'metodo', contatti: 'contatti', privacy: 'privacy' };
  const ROUTE_BY_SLUG = { '': '', stima: 'stima', risultati: 'risultati', ottimizzazione: 'consigli', 'checklist-dsu': 'documenti', 'diritti-pa': 'diritti', 'isee-assegno-unico': 'auu', fonti: 'fonti', metodo: 'metodo', contatti: 'contatti', privacy: 'privacy' };
  function stripLangPath(pathname) {
    let pth = (pathname || '/').replace(/\/index\.html$/i, '/');
    const m = pth.match(/^\/(en|bn)(?=\/|$)/);
    if (m) pth = pth.slice(m[0].length) || '/';
    return pth.replace(/\/+$/, '') || '/';
  }
  function pathFromRoute(r) {
    const slug = Object.prototype.hasOwnProperty.call(SLUG_BY_ROUTE, r) ? SLUG_BY_ROUTE[r] : '';
    return u(slug ? '/' + slug : '/');
  }
  function routeFromPath(pathname) {
    const pth = stripLangPath(pathname);
    const slug = pth === '/' ? '' : pth.replace(/^\//, '');
    return Object.prototype.hasOwnProperty.call(ROUTE_BY_SLUG, slug) ? ROUTE_BY_SLUG[slug] : null;
  }
  I.setLang(I.langFromPath(location.pathname));
  function route() {
    const fromHash = (location.hash || '').replace(/^#\/?/, '').split('?')[0].toLowerCase();
    if (location.hash && (fromHash === '' || Object.prototype.hasOwnProperty.call(SLUG_BY_ROUTE, fromHash))) return fromHash;
    return routeFromPath(location.pathname);
  }
  function go(path, replace) {
    if (replace || location.pathname + location.search !== path) {
      if (replace) history.replaceState(null, '', path);
      else history.pushState(null, '', path);
    }
    render();
  }
  function syncLegacyUrl() {
    const fromHash = (location.hash || '').replace(/^#\/?/, '').split('?')[0].toLowerCase();
    let r = null;
    if (location.hash && (fromHash === '' || Object.prototype.hasOwnProperty.call(SLUG_BY_ROUTE, fromHash))) r = fromHash;
    else r = routeFromPath(location.pathname);
    if (r === null) return;
    const target = pathFromRoute(r) + location.search;
    if (location.hash || /\/index\.html$/i.test(location.pathname) || location.pathname + location.search !== target) {
      history.replaceState(null, '', target);
    }
  }

  function pageBag() {
    const all = window.DC_PAGES || {};
    return all[lang()] || all.it || {};
  }
  function pageSeo(route) {
    const pages = pageBag();
    if (route === null) return pages['404'] || pages[''];
    return pages[route] || pages[''];
  }
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
  function setDocumentLang() {
    document.documentElement.lang = lang() === 'it' ? 'it' : lang();
    document.documentElement.dir = 'ltr';
    var cl = document.querySelector('meta[http-equiv="Content-Language"]');
    if (cl) cl.setAttribute('content', document.documentElement.lang);
  }
  function applySeo(route) {
    const s = pageSeo(route);
    if (!s) return;
    document.title = s.title;
    setDocumentLang();
    document.body.classList.toggle('page-home', route === '');
    setMeta('description', s.desc);
    setMeta('og:title', s.title, 'property');
    setMeta('og:description', s.desc, 'property');
    setMeta('og:image', SITE + 'og-image.png', 'property');
    setMeta('twitter:title', s.title);
    setMeta('twitter:description', s.desc);
    setMeta('twitter:image', SITE + 'og-image.png');
    if (s.url) {
      setMeta('og:url', s.url, 'property');
      setLinkRel('canonical', s.url === SITE ? SITE : s.url);
      const path = stripLangPath(new URL(s.url, SITE).pathname);
      document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
      ['it', 'en', 'bn'].forEach((L) => {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = L;
        link.href = (L === 'it' ? (path === '/' ? SITE : SITE.replace(/\/$/, '') + path) : (SITE.replace(/\/$/, '') + '/' + L + (path === '/' ? '' : path)));
        document.head.appendChild(link);
      });
      const xd = document.createElement('link');
      xd.rel = 'alternate'; xd.hreflang = 'x-default';
      xd.href = path === '/' ? SITE : SITE.replace(/\/$/, '') + path;
      document.head.appendChild(xd);
    } else {
      const canon = document.querySelector('link[rel="canonical"]');
      if (canon) canon.remove();
    }
    if (s.robots) setMeta('robots', s.robots);
    else {
      const robots = document.querySelector('meta[name="robots"]');
      if (robots) robots.remove();
    }
    const node = document.querySelector('script[type="application/ld+json"]');
    if (node && s.jsonLdText) node.textContent = s.jsonLdText;
  }
  function updatedLine(route) {
    const s = pageSeo(route) || {};
    const d = s.dateLabel || t('common.date_2026_11_16');
    const key = s.showSources ? 'common.updated_sources' : 'common.updated';
    return '<p class="small muted aggiornamento">' + t(key, { date: d }) + '</p>';
  }
  function disclaimer() { return '<div class="disclaimer" role="note">' + rich('common.disclaimer') + '</div>'; }

  /* ---------------- Dati locali ---------------- */
  function load() {
    try { return Object.assign({}, D.DEFAULT_INPUT, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); }
    catch (e) { return Object.assign({}, D.DEFAULT_INPUT); }
  }
  function save(d) { try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) { /* spazio pieno o modalità privata */ } }
  function hasData() { return !!localStorage.getItem(STORE_KEY); }
  function clearAll() {
    if (!confirm(t('chrome.clear_confirm'))) return;
    [STORE_KEY, STEP_KEY, CHECK_KEY].forEach((k) => localStorage.removeItem(k));
    go(u('/'), true);
    announce(t('chrome.clear_done'));
  }
  function announce(msg) {
    let el = document.getElementById('sr-live');
    if (!el) { el = document.createElement('div'); el.id = 'sr-live'; el.className = 'sr-only'; el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.textContent = msg;
  }

  /* ---------------- Definizione del wizard ----------------
   * Ogni campo: id (chiave in DEFAULT_INPUT), tipo, etichetta, aiuto, show(d) facoltativo. */
  function buildSteps() { return [
    {
      titolo: t('wizard.s1_title'),
      intro: t('wizard.s1_intro'),
      campi: [
        { id: 'componenti', tipo: 'int', label: t('wizard.s1_componenti'), min: 1, max: 15 },
        { id: 'figli', tipo: 'int', label: t('wizard.s1_figli'), min: 0, max: 14, help: t('wizard.s1_figli_help') },
        { id: 'minori', tipo: 'int', label: t('wizard.s1_minori'), min: 0, max: 14 },
        { id: 'under3', tipo: 'int', label: t('wizard.s1_under3'), min: 0, max: 14, show: (d) => d.minori > 0 },
        { id: 'over60', tipo: 'int', label: t('wizard.s1_over60'), min: 0, max: 15 },
        { id: 'over67', tipo: 'int', label: t('wizard.s1_over67'), min: 0, max: 15, show: (d) => d.over60 > 0 },
        { id: 'disabili', tipo: 'int', label: t('wizard.s1_disabili'), min: 0, max: 15, help: t('wizard.s1_disabili_help') },
        { id: 'genitoreSolo', tipo: 'bool', label: t('wizard.s1_genitoreSolo'), show: (d) => d.minori > 0 },
        { id: 'genitoriLavorano', tipo: 'bool', label: t('wizard.s1_genitoriLavorano'), show: (d) => d.minori > 0 }
      ],
      check(d) {
        const e = {};
        if (d.figli > d.componenti - 1) e.figli = t('wizard.err_figli');
        if (d.minori > d.componenti) e.minori = t('wizard.err_minori');
        if (d.under3 > d.minori) e.under3 = t('wizard.err_under3');
        if (d.over60 + d.minori > d.componenti) e.over60 = t('wizard.err_over60');
        if (d.over67 > d.over60) e.over67 = t('wizard.err_over67');
        if (d.disabili > d.componenti) e.disabili = t('wizard.err_disabili');
        return e;
      }
    },
    {
      titolo: t('wizard.s2_title'),
      intro: t('wizard.s2_intro'),
      campi: [
        { id: 'redditoDip', tipo: 'eur', label: t('wizard.s2_redditoDip'), help: t('wizard.s2_redditoDip_help') },
        { id: 'nDip', tipo: 'int', label: t('wizard.s2_nDip'), min: 0, max: 15, show: (d) => d.redditoDip > 0 },
        { id: 'redditoPens', tipo: 'eur', label: t('wizard.s2_redditoPens') },
        { id: 'nPens', tipo: 'int', label: t('wizard.s2_nPens'), min: 0, max: 15, show: (d) => d.redditoPens > 0 },
        { id: 'redditoAltri', tipo: 'eur', label: t('wizard.s2_redditoAltri'), help: t('wizard.s2_redditoAltri_help') },
        { id: 'trattamentiEsenti', tipo: 'eur', label: t('wizard.s2_trattamentiEsenti'), help: t('wizard.s2_trattamentiEsenti_help') },
        { id: 'auu2025', tipo: 'eur', label: t('wizard.s2_auu2025') },
        { id: 'mantenimentoVersato', tipo: 'eur', label: t('wizard.s2_mantenimentoVersato') },
        { id: 'nettoMensile', tipo: 'eur', label: t('wizard.s2_nettoMensile'), help: t('wizard.s2_nettoMensile_help') }
      ]
    },
    {
      titolo: t('wizard.s3_title'),
      intro: t('wizard.s3_intro'),
      campi: [
        { id: 'abitazione', tipo: 'radio', label: t('wizard.s3_abitazione'), opzioni: [['affitto', t('wizard.s3_affitto')], ['proprieta', t('wizard.s3_proprieta')], ['altro', t('wizard.s3_altro')]] },
        { id: 'affittoMensile', tipo: 'eur', label: t('wizard.s3_affittoMensile'), show: (d) => d.abitazione === 'affitto' },
        { id: 'contrattoRegistrato', tipo: 'bool', label: t('wizard.s3_contrattoRegistrato'), show: (d) => d.abitazione === 'affitto', help: t('wizard.s3_contrattoRegistrato_help') },
        { id: 'rataMutuo', tipo: 'eur', label: t('wizard.s3_rataMutuo') },
        { id: 'bollette', tipo: 'eur', label: t('wizard.s3_bollette') },
        { id: 'trasporti', tipo: 'eur', label: t('wizard.s3_trasporti') },
        { id: 'prestiti', tipo: 'eur', label: t('wizard.s3_prestiti') },
        { id: 'assicurazioni', tipo: 'eur', label: t('wizard.s3_assicurazioni') },
        { id: 'altreSpese', tipo: 'eur', label: t('wizard.s3_altreSpese') }
      ]
    },
    {
      titolo: t('wizard.s4_title'),
      intro: t('wizard.s4_intro'),
      campi: [
        { id: 'valoreCasa', tipo: 'eur', label: t('wizard.s4_valoreCasa'), show: (d) => d.abitazione === 'proprieta', help: t('wizard.s4_valoreCasa_help'), rendita: true },
        { id: 'mutuoCasa', tipo: 'eur', label: t('wizard.s4_mutuoCasa'), show: (d) => d.abitazione === 'proprieta' },
        { id: 'capoluogoMetro', tipo: 'bool', label: t('wizard.s4_capoluogoMetro'), show: (d) => d.abitazione === 'proprieta', help: t('wizard.s4_capoluogoMetro_help', { elenco: R.capoluoghiMetro.join(', ') }) },
        { id: 'altriImmobili', tipo: 'eur', label: t('wizard.s4_altriImmobili') },
        { id: 'mutuoAltri', tipo: 'eur', label: t('wizard.s4_mutuoAltri'), show: (d) => d.altriImmobili > 0 },
        { id: 'contiSaldo', tipo: 'eur', label: t('wizard.s4_contiSaldo') },
        { id: 'contiGiacenza', tipo: 'eur', label: t('wizard.s4_contiGiacenza'), help: t('wizard.s4_contiGiacenza_help') },
        { id: 'titoliStato', tipo: 'eur', label: t('wizard.s4_titoliStato'), help: t('wizard.s4_titoliStato_help') },
        { id: 'altriInvestimenti', tipo: 'eur', label: t('wizard.s4_altriInvestimenti') }
      ]
    },
    {
      titolo: t('wizard.s5_title'),
      intro: t('wizard.s5_intro'),
      campi: [
        { id: 'peggiorata', tipo: 'bool', label: t('wizard.s5_peggiorata') },
        { id: 'motivo', tipo: 'radio', label: t('wizard.s5_motivo'), show: (d) => d.peggiorata, opzioni: Object.entries(D.MOTIVI_CORRENTE).map(([k, v]) => [k, t('wizard.motivo_' + k) || v.label]) },
        { id: 'modoCorrente', tipo: 'radio', label: t('wizard.s5_modoCorrente'), show: (d) => d.peggiorata && D.MOTIVI_CORRENTE[d.motivo] && D.MOTIVI_CORRENTE[d.motivo].dueMesi,
          opzioni: [['12mesi', t('wizard.s5_12mesi')], ['2mesi', t('wizard.s5_2mesi')]] },
        { id: 'correnteLD', tipo: 'eur', label: t('wizard.s5_correnteLD'), show: (d) => d.peggiorata, help: t('wizard.s5_correnteLD_help') },
        { id: 'correnteLA', tipo: 'eur', label: t('wizard.s5_correnteLA'), show: (d) => d.peggiorata },
        { id: 'correnteTR', tipo: 'eur', label: t('wizard.s5_correnteTR'), show: (d) => d.peggiorata }
      ]
    }
  ]; }
  let STEPS = buildSteps();
  function refreshSteps() { STEPS = buildSteps(); }


  /* ---------------- Router ---------------- */
  const ROUTES = { '': viewHome, stima: viewStima, risultati: viewRisultati, consigli: viewConsigli, documenti: viewDocumenti, diritti: viewDiritti, auu: viewAuu, fonti: viewFonti, metodo: viewMetodo, contatti: viewContatti, privacy: viewPrivacy };
  function syncChrome() {
    I.setLang(I.langFromPath(location.pathname));
    setDocumentLang();
    document.querySelectorAll('[data-route]').forEach((a) => {
      a.setAttribute('href', pathFromRoute(a.getAttribute('data-route') || ''));
    });
    const navMap = { home: 'chrome.nav_home', stima: 'chrome.nav_stima', risultati: 'chrome.nav_risultati', consigli: 'chrome.nav_consigli', documenti: 'chrome.nav_documenti' };
    document.querySelectorAll('.bottomnav [data-nav]').forEach((a) => {
      const key = navMap[a.getAttribute('data-nav')];
      if (!key) return;
      const ico = a.querySelector('.ni');
      a.innerHTML = (ico ? ico.outerHTML : '') + t(key);
    });
    const brand = document.querySelector('.brand-name');
    if (brand) brand.innerHTML = '<span class="notranslate" translate="no">' + esc(t('brand.name')) + '</span><span class="brand-sub">' + esc(t('brand.tagline')) + '</span>';
    document.querySelectorAll('.lang-switch a').forEach((a) => {
      const L = a.getAttribute('hreflang') || a.getAttribute('lang') || 'it';
      const path = stripLangPath(location.pathname);
      a.setAttribute('href', I.langPath(path === '/' ? '/' : path, L));
      a.setAttribute('data-no-spa', '');
      if (L === lang()) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    const label = document.getElementById('version-label');
    if (label) label.textContent = t('chrome.version', { version: APP_VERSION });
    const ub = document.getElementById('update-banner');
    if (ub) {
      const msg = ub.querySelector('p');
      if (msg) msg.textContent = t('update.message');
      const ap = document.getElementById('update-apply');
      const ds = document.getElementById('update-dismiss');
      if (ap) ap.textContent = t('update.apply');
      if (ds) ds.textContent = t('update.later');
    }
    if (window.DCInstalla && typeof window.DCInstalla.refresh === 'function') window.DCInstalla.refresh();
  }
  function render() {
    I.setLang(I.langFromPath(location.pathname));
    refreshSteps();
    const r = route();
    const view = (r === null) ? view404 : (ROUTES[r] || viewHome);
    $app.innerHTML = view();
    syncChrome();
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const key = a.getAttribute('data-nav');
      const active = (key === 'home' && (r === '' || !ROUTES[r])) || key === r || (key === 'risultati' && r === 'diritti');
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (r === 'stima') bindWizard();
    applyPct();
    if (r === 'documenti') bindChecklist();
    if (r === 'contatti') bindContatti();
    if (I.protectIn) I.protectIn(document.body);
    applySeo(r);
    window.scrollTo(0, 0);
  }

  /* ---------------- Viste ---------------- */

  function viewHome() {
    const s = pageSeo('');
    let html = (s && s.main) || '';
    if (hasData()) {
      const extra = '<a class="btn btn-ghost" href="' + u('/risultati') + '">' + esc(t('home.cta_results')) + '</a>\n          ';
      html = html.replace('<button type="button" class="btn btn-ghost" data-install-cta>', extra + '<button type="button" class="btn btn-ghost" data-install-cta>', 1);
    }
    return html;
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
        <label class="choice"><input type="radio" name="${f.id}" value="si" ${d[f.id] ? 'checked' : ''}> ${t('common.yes')}</label>
        <label class="choice"><input type="radio" name="${f.id}" value="no" ${!d[f.id] ? 'checked' : ''}> ${t('common.no')}</label>${help}${err}</fieldset>`;
    }
    if (f.tipo === 'radio') {
      return `<fieldset class="field" data-field="${f.id}"><legend>${esc(f.label)}</legend>
        ${f.opzioni.map(([v, l]) => `<label class="choice"><input type="radio" name="${f.id}" value="${v}" ${d[f.id] === v ? 'checked' : ''}> ${esc(l)}</label>`).join('')}${help}${err}</fieldset>`;
    }
    const isEur = f.tipo === 'eur';
    const val = d[f.id] === 0 && isEur ? '' : d[f.id];
    const rendita = f.rendita ? `
      <details class="mini-calc"><summary>${t('wizard.s4_rendita_summary')}</summary>
        <div class="field"><label for="rendita">${t('wizard.s4_rendita_label')}</label>
          <div class="input-wrap euro"><input id="rendita" type="number" inputmode="decimal" min="0" step="0.01"></div>
          <div class="help">${t('wizard.s4_rendita_help')}</div></div>
        <button type="button" class="btn btn-ghost btn-block" data-action="rendita">${t('wizard.s4_rendita_btn')}</button>
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
      <h1>${esc(t('seo.stima_h1'))}</h1>
      ${disclaimer()}
      ${updatedLine('stima')}
      <section class="card" id="wizard-start">
        <div class="steps-label">${esc(t('wizard.step_label', { current: i + 1, total: STEPS.length }))}</div>
        <div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuenow="${i + 1}" aria-label="${esc(t('wizard.progress_aria'))}"><span data-pct="${pct}"></span></div>
        <h2 id="step-title">${esc(s.titolo)}</h2>
        <p class="muted">${esc(s.intro)}</p>
        <form id="wizard" novalidate>
          ${s.campi.map((f) => fieldHtml(f, d, errors)).join('')}
          <div class="btn-row">
            ${i > 0 ? '<button type="button" class="btn btn-ghost" data-action="back">' + t('common.back') + '</button>' : ''}
            <button type="submit" class="btn btn-primary">${i === STEPS.length - 1 ? t('wizard.submit_last') : t('common.next')}</button>
          </div>
        </form>
      </section>
      <p class="small muted">${rich('wizard.stima_foot')}</p>`;;
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
        if (raw !== '' && (!Number.isFinite(parseFloat(raw.replace(',', '.'))) || parseFloat(raw) < 0)) e[f.id] = t('wizard.err_number');
        if (f.max != null && d[f.id] > f.max) e[f.id] = t('wizard.err_max', { max: f.max });
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
        $app.innerHTML = viewStima(errors); bindWizard(); applyPct(); if (I.protectIn) I.protectIn($app);
        const first = document.querySelector('.field .error');
        if (first) { const inp = first.closest('.field').querySelector('input'); if (inp) inp.focus(); }
        announce(t('wizard.err_fields'));
        return;
      }
      const i = currentStep();
      if (i < STEPS.length - 1) { localStorage.setItem(STEP_KEY, String(i + 1)); render(); focusTitle(); }
      else { go(pathFromRoute('risultati')); }
    });
    form.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-action]');
      if (!a) return;
      if (a.dataset.action === 'back') { readForm(); localStorage.setItem(STEP_KEY, String(Math.max(0, currentStep() - 1))); render(); focusTitle(); }
      if (a.dataset.action === 'rendita') {
        const v = D.valoreImuDaRendita(document.getElementById('rendita').value);
        const inp = document.getElementById('f-valoreCasa');
        if (inp && v > 0) { inp.value = v; readForm(); announce(t('wizard.s4_rendita_done', { value: eur(v) })); }
      }
    });
  }
  /** Elenco dei campi visibili nel passo corrente, per capire se serve ridisegnare. */
  function visibleIds(d) { return STEPS[currentStep()].campi.filter((f) => !f.show || f.show(d)).map((f) => f.id).join(','); }
  function rerenderStep(focusName) {
    $app.innerHTML = viewStima(); bindWizard(); applyPct(); if (I.protectIn) I.protectIn($app);
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
    return `<details><summary>${esc(t('results.calc_summary'))}</summary>
      <table class="calc">
        ${riga(t('results.calc_redditi') + (r.figurativo ? t('results.calc_figurativo', { amount: eur(r.figurativo) }) : ''), eur(r.redditi))}
        ${r.detrDip ? riga(t('results.calc_detr_dip'), eur(r.detrDip)) : ''}
        ${r.detrPens ? riga(t('results.calc_detr_pens'), eur(r.detrPens)) : ''}
        ${r.mantenimento ? riga(t('results.calc_mantenimento'), eur(r.mantenimento)) : ''}
        ${r.affitto ? riga(t('results.calc_affitto'), eur(r.affitto)) : ''}
        ${riga(t('results.calc_isr'), eur(r.totale), 'tot')}
        ${p.casa.netto ? riga(t('results.calc_casa', { netto: eur(p.casa.netto), franchigia: eur(p.casa.franchigia) }), eur(p.casa.rileva)) : ''}
        ${p.altriImmobili ? riga(t('results.calc_altri_imm'), eur(p.altriImmobili)) : ''}
        ${riga(t('results.calc_mobiliare', { lordo: eur(p.mobiliare.lordo), esclusi: p.mobiliare.titoliEsclusi ? t('results.calc_titoli_esclusi', { amount: eur(p.mobiliare.titoliEsclusi) }) : '', franchigia: eur(p.mobiliare.franchigia) }), eur(p.mobiliare.netto))}
        ${riga(t('results.calc_isp'), eur(p.totale), 'tot')}
        ${riga(t('results.calc_ise'), eur(x.ise), 'tot')}
        ${riga(t('results.calc_scala', { parti: x.scala.parti.map((q) => esc(q.voceKey ? t(q.voceKey, { n: q.n }) : q.voce) + ' ' + dec(q.valore)).join(' + ') }), dec(x.scala.valore))}
        ${riga(t('results.calc_isee'), eur2(x.isee), 'tot')}
      </table></details>`;
  }

  function viewRisultati() {
    if (!hasData()) return `<section class="card"><h1>${esc(t('seo.risultati_empty_h1'))}</h1><p>${esc(t('results.empty_p1'))}</p><p>${rich('results.empty_p2')}</p><a class="btn btn-primary" href="${u('/stima')}">${esc(t('results.empty_cta'))}</a></section>${disclaimer()}${updatedLine('risultati')}`;
    const ris = D.calcolaTutto(load(), { t, locale: numLoc() });
    const d = ris.input;
    const res = ris.residuo;
    const neg = res.mensile < 0;
    const c = ris.corrente;
    const gain = ris.ordinario.isee - ris.speciale.isee;
    const sp = res.spese;
    const ben = ris.benefici;
    const etichetta = { si: t('results.label_si'), forse: t('results.label_forse'), no: t('results.label_no') };
    const statoTxt = { verificato: t('common.verified'), valore2026: t('common.value_2026'), da_confermare: t('common.to_confirm') };

    let correnteHtml = '';
    if (c) {
      correnteHtml = `<section class="card"><h2>${esc(t('results.corrente_title'))}</h2>
        <div class="kpis">
          <div class="kpi"><span class="tag">${esc(t('results.corrente_ord'))}</span><span class="value">${eur(c.ordinario.isee)}</span><span class="muted">${esc(t('results.corrente_ord_vs', { amount: eur(ris.ordinario.isee) }))}</span></div>
          <div class="kpi"><span class="tag">${esc(t('results.corrente_spe'))}</span><span class="value">${eur(c.speciale.isee)}</span><span class="muted">${esc(t('results.corrente_spe_vs', { amount: eur(ris.speciale.isee) }))}</span></div>
        </div>
        ${c.ammesso ? '' : `<div class="notice warn">${esc(t('results.corrente_var', { pct: Math.round(c.variazione * 100) }))}</div>`}
        ${c.ammesso && c.conviene ? '<div class="notice ok">' + esc(t('results.corrente_ok')) + '</div>' : ''}
        ${c.ammesso && !c.conviene ? '<div class="notice warn">' + esc(t('results.corrente_not_lower')) + '</div>' : ''}
        ${c.moltiplicatore === 6 ? '<p class="small muted">' + esc(t('results.corrente_x6')) + '</p>' : ''}
        ${dettaglioIsee(c.ordinario)}
      </section>`;
    }

    return `
      <h1>${esc(t('seo.risultati_h1'))}</h1>
      ${disclaimer()}
      ${updatedLine('risultati')}
      <section class="big-result${neg ? ' neg' : ''}" aria-labelledby="res-title">
        <span id="res-title">${neg ? t('results.missing_neg') : t('results.missing_pos')}</span>
        <span class="value">${esc(t('results.per_month', { amount: eur(Math.abs(res.mensile)) }))}</span>
        <span>${neg ? t('results.to_cover') : t('results.to_live')}${d.componenti > 1 && !neg ? ' ' + t('results.per_person', { amount: eur(res.perPersona) }) : ''}</span>
      </section>
      <section class="card"><h2>${esc(t('results.from_title'))}</h2>
        <table class="calc">
          ${riga(t('results.row_income'), eur(res.entrate))}
          ${sp.casa ? riga(d.abitazione === 'affitto' ? t('results.row_rent') : t('results.row_mortgage'), eur(sp.casa)) : ''}
          ${sp.bollette ? riga(t('results.row_bills'), eur(sp.bollette)) : ''}
          ${sp.trasporti ? riga(t('results.row_transport'), eur(sp.trasporti)) : ''}
          ${sp.prestiti ? riga(t('results.row_loans'), eur(sp.prestiti)) : ''}
          ${sp.assicurazioni ? riga(t('results.row_insurance'), eur(sp.assicurazioni)) : ''}
          ${sp.altre ? riga(t('results.row_other'), eur(sp.altre)) : ''}
          ${riga(t('results.row_residuo'), eur(res.mensile), 'tot')}
        </table>
        <p class="small muted">${esc(t('results.residuo_note'))}</p>
        ${res.entrate === 0 ? '<div class="notice warn">' + esc(t('results.residuo_missing_income')) + '</div>' : ''}
      </section>

      <div class="kpis">
        <div class="kpi"><span class="tag">${esc(t('results.kpi_ordinario'))}</span><span class="value">${eur(ris.ordinario.isee)}</span>
          <span class="muted">${esc(t('results.kpi_ordinario_note'))}</span>${dettaglioIsee(ris.ordinario)}</div>
        <div class="kpi"><span class="tag">${esc(t('results.kpi_speciale'))}</span><span class="value">${eur(ris.speciale.isee)}</span>
          <span class="muted">${esc(t('results.kpi_speciale_note', { franchigia: eur(d.capoluogoMetro ? R.casaSpeciale.franchigiaMetro : R.casaSpeciale.franchigia) }))}</span>
          ${gain > 0.5 ? `<div class="notice ok small mt8">${esc(t('results.kpi_lower', { amount: eur(gain) }))}</div>` : ''}
          ${ris.input.auu2025 > 0 ? `<p class="small">${rich('results.kpi_net_auu', { amount: eur(ris.specialeNeutralizzato) })}</p>` : ''}
          ${dettaglioIsee(ris.speciale)}</div>
      </div>
      ${correnteHtml}

      <section class="card" id="benefici"><h2>${esc(t('results.benefits_title'))}</h2>
        <p class="muted small">${esc(t('results.benefits_intro'))}</p>
        ${ris.beneficiConCorrente ? '<div class="notice ok small">' + esc(t('results.benefits_using_corrente')) + '</div>' : ''}
        ${ben.map((b) => `<article class="benefit ${b.esito}">
          <h3>${esc(b.nome)}</h3>
          <span class="badge ${b.esito}">${etichetta[b.esito]}</span><span class="badge stato">${statoTxt[b.stato] || ''}</span>
          <p class="small"><strong>${esc(t('results.threshold'))}</strong> ${esc(b.soglia)}<br><strong>${esc(t('results.amount_label'))}</strong> ${esc(b.importo)}</p>
          <p class="small muted">${esc(b.nota)}</p>
          <a class="small" href="${b.fonte.url}" target="_blank" rel="noopener">${esc(t('common.source', { title: b.fonte.titolo }))}</a>
        </article>`).join('')}
      </section>

      <section class="card no-print"><h2>${esc(t('results.now_title'))}</h2>
        <div class="paths">
          <a class="path" href="${u('/checklist-dsu')}"><span class="ico" aria-hidden="true">📄</span><span><strong>${esc(t('results.now_docs_title'))}</strong><span class="muted">${esc(c ? t('results.now_docs_text_corrente') : t('results.now_docs_text'))}</span></span></a>
          <a class="path" href="${u('/ottimizzazione')}"><span class="ico" aria-hidden="true">💡</span><span><strong>${esc(t('results.now_opt_title'))}</strong><span class="muted">${esc(t('results.now_opt_text'))}</span></span></a>
          <a class="path" href="${u('/diritti-pa')}"><span class="ico" aria-hidden="true">🏛️</span><span><strong>${esc(t('results.now_dir_title'))}</strong><span class="muted">${esc(t('results.now_dir_text'))}</span></span></a>
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" data-action="print">${esc(t('common.print'))}</button>
          <a class="btn btn-ghost" href="${u('/stima')}" data-action="edit">${esc(t('results.edit'))}</a>
        </div>
      </section>`;
  }

  /* -------- Consigli -------- */
  function viewConsigli() {
    const s = pageSeo('consigli');
    return (s && s.main) || '';
  }

  /* -------- Documenti -------- */
  function docsList() {
    const items = [];
    for (let i = 1; i <= 12; i++) items.push([t('docs.d' + i), 'base', i]);
    for (let i = 13; i <= 16; i++) items.push([t('docs.d' + i), 'corrente', i]);
    return items;
  }
  function viewDocumenti() {
    let chk = {};
    try { chk = JSON.parse(localStorage.getItem(CHECK_KEY) || '{}'); } catch (e) { chk = {}; }
    const all = docsList();
    const li = (arr) => arr.map((item) => { const idx = item[2]; return `<li><label><input type="checkbox" data-doc="${idx}" ${chk[idx] ? 'checked' : ''}> <span>${esc(item[0])}</span></label></li>`; }).join('');
    const base = all.filter((x) => x[1] === 'base');
    const corr = all.filter((x) => x[1] === 'corrente');
    return `
      <h1>${esc(t('seo.chk_h1'))}</h1>
      <p class="muted">${esc(t('docs.intro'))}</p>
      ${updatedLine('documenti')}
      <section class="card"><h2>${esc(t('docs.h2_all'))}</h2><ul class="checklist">${li(base)}</ul></section>
      <section class="card"><h2>${esc(t('docs.h2_corrente'))}</h2><ul class="checklist">${li(corr)}</ul></section>
      <section class="card no-print">
        <p>${rich('docs.outro', { portale: R.fonti.portaleIsee.url })}</p>
        <button type="button" class="btn btn-primary btn-block" data-action="print">${esc(t('common.print_list'))}</button>
      </section>
      ${disclaimer()}`;
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
    const srcTitle = (id) => t('fonti.src_' + id);
    const rows = [
      [t('benefits.adi_nome'), t('benefits.adi_soglia', { amount: eur(R.adi.isee) }), t('benefits.adi_offerta'), f.adi, t('common.verified'), t('benefits.adi_chi'), 'adi'],
      [t('benefits.auu_nome'), t('benefits.auu_soglia', { min: eur2(R.auu.iseeMin), max: eur2(R.auu.iseeMax) }), t('benefits.auu_offerta', { min: eur2(R.auu.importoMin), max: eur2(R.auu.importoMax) }), f.auu, t('common.value_2026'), null, 'auu'],
      [t('benefits.bonus_nome'), t('benefits.bonus_soglia', { isee: eur(R.bonusSociali.isee), fam: eur(R.bonusSociali.iseeFamNumerose) }), t('benefits.bonus_offerta'), f.arera, t('benefits.bonus_stato'), null, 'arera'],
      [t('benefits.dedicata_nome'), t('benefits.dedicata_soglia', { amount: eur(R.cartaDedicata.isee) }), t('benefits.dedicata_offerta', { amount: eur(R.cartaDedicata.importo) }), f.dedicata, t('common.verified'), null, 'dedicata'],
      [t('benefits.acquisti_nome'), t('benefits.acquisti_soglia', { amount: eur2(R.cartaAcquisti.isee) }), t('benefits.acquisti_offerta'), f.cartaAcquisti, t('benefits.acquisti_stato'), null, 'cartaAcquisti'],
      [t('benefits.nido_nome'), t('benefits.nido_soglia', { amount: eur(R.nido.soglia2) }), t('benefits.nido_offerta'), f.nido, t('common.value_2026'), null, 'nido'],
      [t('benefits.nuovinati_nome'), t('benefits.nuovinati_soglia', { amount: eur(R.nuoviNati.isee) }), t('benefits.nuovinati_offerta', { amount: eur(R.nuoviNati.importo) }), f.nuoviNati, t('benefits.nuovinati_stato'), null, 'nuoviNati'],
      [t('benefits.affitto_nome'), t('benefits.affitto_soglia'), t('benefits.affitto_offerta'), f.venetoAffitti, t('benefits.affitto_stato'), null, 'venetoAffitti']
    ];
    return `
      <h1>${esc(t('seo.dir_h1'))}</h1>
      ${disclaimer()}
      ${updatedLine('diritti')}
      <p class="muted">${rich('diritti.intro')}</p>
      ${rows.map(([n, s, q, fo, st, chi, sid]) => `<article class="benefit forse"><h3>${esc(n)}</h3><span class="badge stato"><a href="${u('/fonti')}">${esc(st)}</a></span>
        <p class="small"><strong>${esc(t('results.threshold'))}</strong> ${esc(s)}<br><strong>${esc(t('benefits.thing_offer'))}</strong> ${esc(q)}${chi ? `<br><strong>${esc(t('benefits.thing_who'))}</strong> ${esc(chi)}` : ''}</p>
        <a class="small" href="${fo.url}" target="_blank" rel="noopener">${esc(t('common.source', { title: srcTitle(sid) }))}</a></article>`).join('')}
      <section class="card"><h2>${esc(t('diritti.h2_auu'))}</h2>
        <p>${rich('diritti.p_auu1')}</p>
        <p>${rich('diritti.p_auu2')}</p>
        <p>${rich('diritti.auu_more')}</p>
        <p><strong>${esc(t('faq.quale_q'))}</strong> ${rich('faq.quale_a')}</p>
        <a class="btn btn-primary btn-block" href="${u('/stima')}">${esc(t('diritti.cta_stima'))}</a></section>
      <section class="card"><h2>${esc(t('diritti.h2_manovra'))}</h2>
        <p>${rich('diritti.p_manovra')}</p>
        <p class="small">${rich('diritti.manovra_fonte')}</p></section>`;
  }

  function viewAuu() {
    const s = pageSeo('auu');
    return (s && s.main) || '';
  }

  /* -------- Fonti -------- */
  function viewFonti() {
    const s = pageSeo('fonti');
    return (s && s.main) || '';
  }


  /* -------- Contatti e privacy -------- */
  function viewContatti() {
    const s = pageSeo('contatti');
    return (s && s.main) || '';
  }
  function bindContatti() {
    const box = document.querySelector('[data-modulo-contatti]');
    if (box && typeof window.montaModuloContatti === 'function' && !box.querySelector('form')) {
      window.montaModuloContatti(box, 1);
    }
  }
  function viewPrivacy() {
    const s = pageSeo('privacy');
    return (s && s.main) || '';
  }

  function viewMetodo() {
    const s = pageSeo('metodo');
    return (s && s.main) || '';
  }
  function view404() {
    const s = pageSeo(null);
    return (s && s.main) || '';
  }

  /* ---------------- Azioni globali ---------------- */
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-action]');
    if (!a) return;
    if (a.dataset.action === 'clear') clearAll();
    if (a.dataset.action === 'print') window.print();
    if (a.dataset.action === 'edit') localStorage.setItem(STEP_KEY, '0');
  });
  window.addEventListener('popstate', render);
  window.addEventListener('hashchange', () => { syncLegacyUrl(); render(); });
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[href]');
    if (!a || ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    if (a.target && a.target !== '_self') return;
    // Cambio lingua (switcher, 404, link tra / /en /bn): navigazione completa.
    // pathFromRoute() riprefisserebbe con la lingua corrente e /en tornerebbe /.
    if (a.hasAttribute('data-no-spa') || a.closest('.lang-switch')) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (href.startsWith('#') && !href.startsWith('#/')) return;
    let path = null;
    try {
      const u = new URL(href, location.origin);
      if (u.origin !== location.origin) return;
      if (I.langFromPath(u.pathname) !== lang()) return;
      if (href.startsWith('#/')) {
        const r = href.slice(2).split('?')[0].toLowerCase();
        path = pathFromRoute(Object.prototype.hasOwnProperty.call(SLUG_BY_ROUTE, r) ? r : '') + u.search;
      } else if (routeFromPath(u.pathname) !== null) {
        path = pathFromRoute(routeFromPath(u.pathname)) + u.search;
      }
    } catch (e) { return; }
    if (path == null) return;
    ev.preventDefault();
    go(path);
  });


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
        ind.textContent = dist > THRESHOLD ? t('ptr.release') : t('ptr.pull');
      }
    }, { passive: true });
    window.addEventListener('touchend', () => {
      if (startY != null && dist > THRESHOLD && window.scrollY <= 0) {
        ind.textContent = t('ptr.updating'); ind.style.transform = 'translate(-50%, 12px)';
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
    if (label) label.textContent = t('chrome.version', { version: APP_VERSION });
    if (!('serviceWorker' in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller; // false alla prima visita → mai banner
    const banner = document.getElementById('update-banner');
    let refreshing = false, userAccepted = false;
    function ricaricaTutti() {
      if (refreshing) return;
      refreshing = true;
      try { const bc = new BroadcastChannel('dc2027-update'); bc.postMessage({ type: 'RELOAD' }); bc.close(); } catch (e) { /* non disponibile */ }
      location.reload();
    }
    try {
      const bc = new BroadcastChannel('dc2027-update');
      bc.onmessage = (e) => { if (e.data && e.data.type === 'RELOAD') ricaricaTutti(); };
    } catch (e) { /* non disponibile */ }
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'RELOAD') ricaricaTutti(); });
    // ricarica solo dopo che l'utente ha toccato "Aggiorna" (alla prima visita clients.claim() non deve ricaricare)
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!userAccepted) return; ricaricaTutti(); });

    function askVersion(worker) {
      return new Promise((resolve) => {
        let done = false;
        const finish = (v) => { if (done) return; done = true; resolve(v || null); };
        const ch = new MessageChannel();
        ch.port1.onmessage = (ev) => finish(ev.data && ev.data.version);
        try { worker.postMessage({ type: 'GET_VERSION' }, [ch.port2]); } catch (err) { finish(null); return; }
        setTimeout(() => finish(null), 1500);
      });
    }
    function bindBanner(worker, ver) {
      banner.hidden = false; document.body.classList.add('has-update');
      document.getElementById('update-apply').onclick = () => {
        banner.hidden = true; document.body.classList.remove('has-update');
        userAccepted = true;
        if (ver) try { localStorage.setItem(BANNER_KEY, ver); } catch (e) { /* privato */ }
        worker.postMessage({ type: 'SKIP_WAITING' });
        // se lo SW è già attivo, ricarica comunque le schede
        setTimeout(() => { if (userAccepted) ricaricaTutti(); }, 800);
      };
      document.getElementById('update-dismiss').onclick = () => { banner.hidden = true; document.body.classList.remove('has-update'); };
    }
    function offer(worker) {
      if (!hadController || !worker) return;
      function once(v) {
        if (!v) {
          // timeout: non scrivere "nuova"; se il banner è già stato offerto in questa scheda, non ripeterlo
          try { if (sessionStorage.getItem('dc2027:banner-offerto')) return; } catch (e) { /* privato */ }
        } else if (localStorage.getItem(BANNER_KEY) === v) {
          return; // una sola volta per versione pubblicata
        }
        if (v) { try { localStorage.setItem(BANNER_KEY, v); } catch (e) { /* privato */ } }
        try { sessionStorage.setItem('dc2027:banner-offerto', '1'); } catch (e) { /* privato */ }
        bindBanner(worker, v);
      }
      askVersion(worker).then((v) => {
        if (v) { once(v); return; }
        // una seconda prova prima di mostrare senza versione
        askVersion(worker).then(once);
      });
    }
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
        if (reg.waiting) offer(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) offer(nw); });
        });
        // solo alla prima visita (chiave ancora vuota): una ricarica forzata non deve nascondere il banner di questa pubblicazione
        if (!hadController && !localStorage.getItem(BANNER_KEY)) {
          try { localStorage.setItem(BANNER_KEY, APP_VERSION); } catch (e) { /* privato */ }
        }
      }).catch(() => { /* senza SW l'app funziona lo stesso */ });
    });
  })();

  syncLegacyUrl();
  render();
})();
