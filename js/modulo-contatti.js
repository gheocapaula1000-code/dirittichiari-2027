// Modulo contatti Pi.Gi Service (versione senza framework, compatibile con CSP senza script inline).
// Si monta su <div data-modulo-contatti data-privacy="privacy.html"></div>.
// Invia a /api/contatto (stesso sito, su Lovable): il server salva il messaggio e lo inoltra a info@pigiservice.com.
const ENDPOINT = '/api/contatto';
const EMAIL = 'info@pigiservice.com';
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
const T = {
  titolo: 'Scrivici',
  intro: 'Compila il modulo: ti rispondiamo via email, in genere entro un giorno lavorativo. Partono soltanto le informazioni che scrivi tu: i dati della stima ISEE restano sul tuo dispositivo.',
  nome: 'Nome e cognome', email: 'Email', telefono: 'Telefono', azienda: 'Azienda o attività', facoltativo: 'facoltativo',
  messaggio: 'Messaggio', messaggioAiuto: 'Raccontaci in poche righe di cosa hai bisogno.',
  consensoPrima: "Ho letto l'", consensoLink: 'informativa privacy', consensoDopo: " e acconsento all'uso dei miei dati per ricevere una risposta.",
  invia: 'Invia il messaggio', invio: 'Invio in corso…',
  ok: 'Messaggio inviato. Grazie!', okDettaglio: "Ti risponderemo all'indirizzo email che hai indicato.", altro: 'Scrivi un altro messaggio',
  errNome: 'Scrivi il tuo nome.', errEmail: "Controlla l'indirizzo email.", errMessaggio: 'Scrivi un messaggio di almeno qualche parola.',
  errConsenso: 'Per inviare il messaggio serve il consenso alla privacy.',
  errTroppi: 'Hai inviato diversi messaggi in poco tempo. Riprova tra qualche minuto.',
  errRete: 'Sei offline o la connessione è instabile. Riprova quando sei di nuovo online.',
  errGenerico: 'Il messaggio non è partito. Riprova tra poco oppure scrivi a', oppure: "Preferisci l'email? Scrivi a",
};

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c != null) n.append(c);
  return n;
}
const mail = () => el('a', { href: `mailto:${EMAIL}`, text: EMAIL });

function monta(box, n) {
  const id = (s) => `mc${n}-${s}`;
  const privacy = box.getAttribute('data-privacy') || 'privacy.html';
  const lingua = box.getAttribute('data-lang') || document.documentElement.lang || 'it';
  const livello = box.getAttribute('data-titolo') || 'h2';
  let t0 = Date.now();
  box.classList.add('mc');
  box.textContent = '';

  const campo = (k, label, attrs, opz) => {
    const wrap = el('div', { class: 'mc-f' });
    const lab = el('label', { for: id(k), class: 'mc-l' }, label);
    if (opz) lab.append(' ', el('span', { class: 'mc-opz', text: `(${T.facoltativo})` }));
    const inp = el(attrs.rows ? 'textarea' : 'input', { id: id(k), class: 'mc-i', ...attrs });
    wrap.append(lab, inp);
    return { wrap, inp };
  };
  const nome = campo('nome', T.nome, { name: 'name', autocomplete: 'name', required: true, maxlength: 120 });
  const email = campo('email', T.email, { name: 'email', type: 'email', inputmode: 'email', autocomplete: 'email', required: true, maxlength: 254 });
  const tel = campo('tel', T.telefono, { name: 'tel', type: 'tel', inputmode: 'tel', autocomplete: 'tel', maxlength: 40 }, true);
  const az = campo('az', T.azienda, { name: 'organization', autocomplete: 'organization', maxlength: 160 }, true);
  const msg = campo('messaggio', T.messaggio, { name: 'message', rows: 5, required: true, maxlength: 5000, 'aria-describedby': id('mh') });
  msg.wrap.append(el('p', { id: id('mh'), class: 'mc-h', text: T.messaggioAiuto }));
  const hp = el('input', { id: id('hp'), name: 'sito_web', tabindex: '-1', autocomplete: 'off' });
  const trappola = el('div', { class: 'mc-hp', 'aria-hidden': 'true' }, el('label', { for: id('hp'), text: 'Lascia vuoto' }), hp);
  const cb = el('input', { id: id('consenso'), type: 'checkbox', required: true, class: 'mc-cb' });
  const consenso = el('div', { class: 'mc-f' }, el('label', { for: id('consenso'), class: 'mc-c' }, cb, el('span', {}, T.consensoPrima, el('a', { href: privacy, target: '_blank', rel: 'noopener', text: T.consensoLink }), T.consensoDopo)));
  const avviso = el('div', { class: 'mc-err', role: 'alert', tabindex: '-1', hidden: true });
  const btn = el('button', { type: 'submit', class: 'mc-b', text: T.invia });
  const alt = el('p', { class: 'mc-alt' }, `${T.oppure} `, mail());
  const form = el('form', { novalidate: true, class: 'mc-form' }, nome.wrap, email.wrap, tel.wrap, az.wrap, trappola, msg.wrap, consenso, avviso, btn, alt);
  const titolo = el(livello, { class: 'mc-t', text: T.titolo });
  const intro = el('p', { class: 'mc-intro', text: T.intro });
  const fatto = el('div', { class: 'mc-ok', role: 'status', tabindex: '-1', hidden: true },
    el('p', { class: 'mc-ok-t', text: `✓ ${T.ok}` }), el('p', { text: T.okDettaglio }));
  const ancora = el('button', { type: 'button', class: 'mc-b2', text: T.altro });
  fatto.append(ancora);
  box.append(titolo, intro, form, fatto);

  const errori = {};
  const segna = (c, testo) => {
    const inp = c === 'consenso' ? cb : { nome: nome.inp, email: email.inp, messaggio: msg.inp }[c];
    const wrap = inp.closest('.mc-f');
    let p = wrap.querySelector('.mc-e');
    if (!testo) { if (p) p.remove(); inp.removeAttribute('aria-invalid'); return; }
    if (!p) { p = el('p', { class: 'mc-e', id: id(`${c}-e`) }); wrap.append(p); }
    p.textContent = testo;
    inp.setAttribute('aria-invalid', 'true');
    inp.setAttribute('aria-errormessage', id(`${c}-e`));
    errori[c] = testo;
  };
  const controlla = () => {
    for (const k of Object.keys(errori)) delete errori[k];
    segna('nome', nome.inp.value.trim().length < 2 ? T.errNome : '');
    segna('email', EMAIL_RE.test(email.inp.value.trim()) ? '' : T.errEmail);
    segna('messaggio', msg.inp.value.trim().length < 5 ? T.errMessaggio : '');
    segna('consenso', cb.checked ? '' : T.errConsenso);
    const primo = ['nome', 'email', 'messaggio', 'consenso'].find((k) => errori[k]);
    if (primo) ({ nome: nome.inp, email: email.inp, messaggio: msg.inp, consenso: cb })[primo].focus();
    return !primo;
  };
  const mostraErrore = (testo, conEmail) => {
    avviso.textContent = testo;
    if (conEmail) avviso.append(' ', mail(), '.');
    avviso.hidden = false;
    avviso.focus();
  };

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (btn.disabled || !controlla()) return;
    avviso.hidden = true;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = T.invio;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', signal: ctrl.signal,
        body: JSON.stringify({
          nome: nome.inp.value, email: email.inp.value, telefono: tel.inp.value, azienda: az.inp.value, messaggio: msg.inp.value,
          consenso: cb.checked, sito_web: hp.value, ms: Date.now() - t0, pagina: location.href,
          privacy: new URL(privacy, location.href).href, lingua,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        form.reset();
        form.hidden = true; intro.hidden = true; titolo.hidden = true;
        fatto.hidden = false; fatto.focus();
        return;
      }
      const c = j && j.errore;
      if (['nome', 'email', 'messaggio', 'consenso'].includes(c)) { segna(c, { nome: T.errNome, email: T.errEmail, messaggio: T.errMessaggio, consenso: T.errConsenso }[c]); return; }
      if (r.status === 429) mostraErrore(T.errTroppi); else mostraErrore(T.errGenerico, true);
    } catch {
      if (navigator.onLine === false) mostraErrore(T.errRete); else mostraErrore(T.errGenerico, true);
    } finally {
      clearTimeout(timer);
      btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = T.invia;
    }
  });
  ancora.addEventListener('click', () => {
    t0 = Date.now();
    fatto.hidden = true; form.hidden = false; intro.hidden = false; titolo.hidden = false;
    nome.inp.focus();
  });
}

window.montaModuloContatti = monta;
document.querySelectorAll('[data-modulo-contatti]').forEach((box, i) => {
  if (!box.querySelector('form')) monta(box, i + 1);
});

