/*!
 * DirittiChiari 2027 — regole e calcoli (solo lato client, nessun dato inviato).
 *
 * TUTTI i valori normativi stanno nel blocco RULES qui sotto, così si aggiornano
 * in un solo punto quando escono i valori ufficiali 2027.
 * Ogni voce ha:
 *   - stato: "verificato"      → letto su fonte ufficiale (vedi docs/FONTI.md)
 *            "valore2026"      → valore ufficiale 2026, da confermare per il 2027
 *            "da_confermare"   → valore indicativo non pubblicato da fonte ufficiale
 *   - fonte: chiave della fonte in RULES.fonti
 *
 * Il file funziona sia nel browser (window.DC) sia in Node (module.exports) per i test.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DC = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  1. COSTANTI NORMATIVE                                              */
  /* ------------------------------------------------------------------ */
  const RULES = {
    meta: {
      aggiornamento: 'novembre 2026',
      annoDSU: 2027,
      annoRedditi: 2025,          // DPCM 159/2013 art. 4 c.1: secondo anno solare precedente la DSU
      dataPatrimonio: '31/12/2025', // DPCM 159/2013 art. 5 c.2 e c.4
      annoCanone: 2026            // art. 4 c.1: spese/franchigie del comma 4 = anno precedente la DSU
    },

    // Allegato 1 DPCM 159/2013: parametri base della scala di equivalenza
    scala: { base: [0, 1, 1.57, 2.04, 2.46, 2.85], extraOltre5: 0.35, stato: 'verificato', fonte: 'dpcm159' },

    // Allegato 1 lett. a) — maggiorazioni per numero di figli (ISEE ordinario)
    maggFigliOrdinario: { 3: 0.2, 4: 0.35, 5: 0.5, stato: 'verificato', fonte: 'dpcm159' },
    // L. 199/2025 art. 1 c. 208 — ISEE per prestazioni familiari e inclusione ("ISEE speciale")
    maggFigliSpeciale: { 2: 0.1, 3: 0.25, 4: 0.4, 5: 0.55, stato: 'verificato', fonte: 'inps102' },
    // Allegato 1 lett. b), c) e c-bis)
    maggMinori: 0.2, maggUnder3: 0.3, maggDisabile: 0.5,

    // DPCM 159/2013 art. 4 c.3 lett. e) ed f): quote di reddito sottratte (per persona)
    detrLavoroDip: { perc: 0.2, maxPerPersona: 3000, stato: 'verificato', fonte: 'dpcm159' },
    detrPensione: { perc: 0.2, maxPerPersona: 1000, stato: 'verificato', fonte: 'dpcm159' },

    // art. 4 c.4: canone annuo di locazione registrato
    affitto: { max: 7000, perFiglioOltreSecondo: 500, stato: 'verificato', fonte: 'dpcm159' },

    // art. 5 c.2: casa di abitazione (ISEE ordinario)
    casaOrdinario: { franchigia: 52500, perFiglio: 2500, figliEsclusi: 2, stato: 'verificato', fonte: 'dpcm159' },
    // L. 199/2025 art. 1 c. 208 (ISEE speciale): 91.500 € / 120.000 € nei capoluoghi metropolitani
    casaSpeciale: { franchigia: 91500, franchigiaMetro: 120000, perFiglio: 2500, figliEsclusi: 1, stato: 'verificato', fonte: 'inps102' },
    quotaEccedenzaCasa: 2 / 3,

    // art. 5 c.6: franchigia patrimonio mobiliare
    mobiliare: { base: 6000, perComponente: 2000, max: 10000, perFiglioOltreSecondo: 1000, stato: 'verificato', fonte: 'dpcm159' },
    // art. 5 c.4-bis (DPCM 13/2025): titoli di Stato, buoni e libretti postali esclusi fino a 50.000 €
    titoliStatoEsclusi: { max: 50000, stato: 'verificato', fonte: 'dpcm159' },

    // art. 2 c.3: ISE = ISR + 20% ISP
    pesoPatrimonio: 0.2,

    // art. 4 c.2 lett. h): reddito figurativo delle attività finanziarie (esclusi conti e depositi).
    // Il tasso è quello medio dei titoli decennali (o legale + 1 punto se inferiore) e cambia ogni anno.
    // 2,60% è il valore usato dai simulatori per il 2026: NON letto su fonte ufficiale → da confermare.
    tassoFigurativo: { valore: 0.026, stato: 'da_confermare', fonte: 'dpcm159' },

    // art. 9 c.2 lett. b): variazione dell'ISR corrente oltre il 25%
    sogliaVariazioneCorrente: 0.25,

    // Messaggio INPS 102/2026: capoluoghi delle 15 città metropolitane
    capoluoghiMetro: ['Bari', 'Bologna', 'Cagliari', 'Catania', 'Firenze', 'Genova', 'Messina', 'Milano',
      'Napoli', 'Palermo', 'Reggio Calabria', 'Roma', 'Sassari', 'Torino', 'Venezia'],

    // Soglie delle prestazioni (vedi BENEFICI più sotto)
    adi: { isee: 10140, stato: 'verificato', fonte: 'adi' },
    auu: { iseeMin: 17468.51, iseeMax: 46582.71, importoMax: 203.8, importoMin: 58.3, stato: 'valore2026', fonte: 'auu' },
    bonusSociali: { isee: 9796, iseeFamNumerose: 20000, stato: 'verificato', fonte: 'arera' },
    cartaDedicata: { isee: 15000, importo: 500, stato: 'verificato', fonte: 'dedicata' },
    cartaAcquisti: { isee: 8230.81, stato: 'valore2026', fonte: 'cartaAcquisti' },
    nido: { soglia1: 25000.99, soglia2: 40000, stato: 'valore2026', fonte: 'nido' },
    nuoviNati: { isee: 40000, importo: 1000, stato: 'valore2026', fonte: 'nuoviNati' },

    fonti: {
      dpcm159: { titolo: 'DPCM 5 dicembre 2013, n. 159 (testo vigente, Normattiva)', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:presidente.consiglio.ministri:decreto:2013-12-05;159!vig=' },
      inps102: { titolo: 'INPS, Messaggio n. 102 del 12/01/2026 (L. 199/2025, art. 1 c. 208)', url: 'https://www.inps.it/content/dam/inps-site/it/scorporati/circolari-e-messaggi/2026/01/Circolare_15133/Allegati/16520_Messaggio-numero-102-del-12-01-2026.pdf' },
      dsu2026: { titolo: 'Ministero del Lavoro, Decreto direttoriale n. 3 del 02/03/2026 (modelli DSU)', url: 'https://www.lavoro.gov.it/sites/default/files/documenti-e-norme/normativa/Decreto-Dip-3-del-02032026-ISEE.pdf' },
      adi: { titolo: 'INPS, scheda Assegno di Inclusione', url: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.assegno-di-inclusione-adi.html' },
      auu: { titolo: 'INPS, Circolare n. 7 del 30/01/2026 (Assegno Unico 2026)', url: 'https://www.inps.it/content/dam/inps-site/it/scorporati/circolari-e-messaggi/2026/01/Circolare_15152/Allegati/16548_Circolare-numero-7-del-30-01-2026.pdf' },
      arera: { titolo: 'ARERA, delibera 2/2026/R/com (bonus sociali)', url: 'https://www.arera.it/consumatori/bonus-sociale/bonus-sociale-per-disagio-economico/quali-sono-i-requisiti' },
      dedicata: { titolo: 'INPS, Carta "Dedicata a te" 2026-2027', url: 'https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.09.carta-dedicata-a-te-modalit-operative-per-il-2026-2027.html' },
      cartaAcquisti: { titolo: 'MEF, Carta Acquisti: limiti 2026', url: 'https://www.mef.gov.it/focus/carta_acquisti/eventi/2026/Dal-1-gennaio-2026-in-vigore-gli-aggiornamenti-ISTAT-per-gli-importi-di-reddito-e-lindicatore-ISEE/' },
      nido: { titolo: 'INPS, Circolare n. 29 del 27/03/2026 (bonus asilo nido)', url: 'https://www.inps.it/content/dam/inps-site/it/scorporati/circolari-e-messaggi/2026/03/Circolare_15207/Allegati/16651_Circolare-numero-29-del-27-03-2026.pdf' },
      nuoviNati: { titolo: 'INPS, scheda Bonus nuovi nati', url: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-nuovi-nati.html' },
      venetoAffitti: { titolo: 'Regione del Veneto, Fondo affitti', url: 'https://www.regione.veneto.it/web/casa/fondo-affitti' },
      portaleIsee: { titolo: 'INPS, Portale unico ISEE', url: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.isee-precompilato-55801.isee-precompilato.html' }
    }
  };

  /* ------------------------------------------------------------------ */
  /*  2. UTILITÀ                                                         */
  /* ------------------------------------------------------------------ */
  /** Converte in numero ≥ 0 (stringhe vuote, NaN e negativi diventano 0). */
  const n0 = (v) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : 0; };
  /** Intero ≥ 0. */
  const i0 = (v) => Math.floor(n0(v));
  const round2 = (x) => Math.round(x * 100) / 100;

  /** Dati di esempio/valori iniziali del wizard: definiscono anche la forma dell'input. */
  const DEFAULT_INPUT = {
    // Passo 1 — nucleo
    componenti: 1, figli: 0, minori: 0, under3: 0, over60: 0, over67: 0, disabili: 0,
    genitoreSolo: false, genitoriLavorano: false,
    // Passo 2 — redditi 2025 (lordi ai fini IRPEF, come in CU/730) + netto attuale
    redditoDip: 0, nDip: 0, redditoPens: 0, nPens: 0, redditoAltri: 0,
    trattamentiEsenti: 0, auu2025: 0, mantenimentoVersato: 0,
    nettoMensile: 0,
    // Passo 3 — spese fisse mensili attuali
    abitazione: 'affitto', // 'affitto' | 'proprieta' | 'altro'
    affittoMensile: 0, contrattoRegistrato: true, rataMutuo: 0, bollette: 0, trasporti: 0,
    prestiti: 0, assicurazioni: 0, altreSpese: 0,
    // Passo 4 — patrimonio al 31/12/2025
    valoreCasa: 0, mutuoCasa: 0, capoluogoMetro: false,
    altriImmobili: 0, mutuoAltri: 0,
    contiSaldo: 0, contiGiacenza: 0, titoliStato: 0, altriInvestimenti: 0,
    // Passo 5 — ISEE corrente
    peggiorata: false, motivo: 'lavoro_indeterminato', // vedi MOTIVI_CORRENTE
    modoCorrente: '12mesi', // '12mesi' | '2mesi'
    correnteLD: 0, correnteLA: 0, correnteTR: 0
  };

  /** Motivi ammessi per l'ISEE corrente (DPCM 159/2013 art. 9 c.2). */
  const MOTIVI_CORRENTE = {
    lavoro_indeterminato: { label: 'Ho perso o ridotto un lavoro a tempo indeterminato', lavoro: true, dueMesi: true },
    lavoro_determinato: { label: 'Mi è finito un contratto a termine o flessibile (almeno 120 giorni negli ultimi 12 mesi)', lavoro: true, dueMesi: false },
    autonomo: { label: 'Ho chiuso un\'attività autonoma (svolta per almeno 12 mesi)', lavoro: true, dueMesi: false },
    trattamenti: { label: 'Si è interrotto un sussidio o trattamento pubblico (es. NASpI)', lavoro: true, dueMesi: true },
    calo: { label: 'Il reddito è calato, senza perdere il lavoro', lavoro: false, dueMesi: false }
  };

  /* ------------------------------------------------------------------ */
  /*  3. CALCOLI                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Parametro della scala di equivalenza (Allegato 1 DPCM 159/2013).
   * @param {object} d input normalizzato
   * @param {'ordinario'|'speciale'} tipo
   */
  function scalaEquivalenza(d, tipo) {
    const c = Math.max(1, i0(d.componenti));
    const t = RULES.scala;
    let p = c <= 5 ? t.base[c] : t.base[5] + t.extraOltre5 * (c - 5);
    const parti = [{ voce: `${c} ${c === 1 ? 'componente' : 'componenti'}`, valore: p }];

    const f = i0(d.figli);
    const tab = tipo === 'speciale' ? RULES.maggFigliSpeciale : RULES.maggFigliOrdinario;
    const chiave = Math.min(f, 5);
    if (tab[chiave]) { p += tab[chiave]; parti.push({ voce: `${f} figli nel nucleo`, valore: tab[chiave] }); }

    // lett. b) e c): figli minorenni con entrambi i genitori (o l'unico) al lavoro ≥ 6 mesi,
    // oppure genitore solo (anche non lavoratore) con figli minorenni
    if (i0(d.minori) > 0 && (d.genitoreSolo || d.genitoriLavorano)) {
      const m = i0(d.under3) > 0 ? RULES.maggUnder3 : RULES.maggMinori;
      p += m; parti.push({ voce: i0(d.under3) > 0 ? 'figli minorenni, almeno uno sotto i 3 anni' : 'figli minorenni', valore: m });
    }
    // lett. c-bis): 0,5 per ogni componente con disabilità media, grave o non autosufficiente
    const dis = Math.min(i0(d.disabili), c);
    if (dis > 0) { p += RULES.maggDisabile * dis; parti.push({ voce: `${dis} con disabilità`, valore: RULES.maggDisabile * dis }); }

    return { valore: round2(p), parti };
  }

  /** Patrimonio mobiliare (art. 5 c.4, 4-bis e 6). Restituisce lordo, netto e base del figurativo. */
  function patrimonioMobiliare(d) {
    const conti = Math.max(n0(d.contiSaldo), n0(d.contiGiacenza)); // si usa il valore più alto (istruzioni DSU, quadro FC2)
    const titoli = n0(d.titoliStato);
    const titoliEsclusi = Math.min(titoli, RULES.titoliStatoEsclusi.max);
    const titoliResidui = titoli - titoliEsclusi;
    const altri = n0(d.altriInvestimenti);
    const lordo = conti + titoliResidui + altri;

    const m = RULES.mobiliare;
    const c = Math.max(1, i0(d.componenti));
    const franchigia = Math.min(m.base + m.perComponente * (c - 1), m.max) + m.perFiglioOltreSecondo * Math.max(0, i0(d.figli) - 2);
    const netto = Math.max(0, lordo - franchigia);
    return { conti, titoliEsclusi, titoliResidui, altri, lordo, franchigia, netto, baseFigurativo: titoliResidui + altri };
  }

  /** Valore della casa di abitazione che entra nel patrimonio (art. 5 c.2 / L. 199/2025). */
  function casaAbitazione(d, tipo) {
    if (d.abitazione !== 'proprieta') return { netto: 0, franchigia: 0, rileva: 0 };
    const netto = Math.max(0, n0(d.valoreCasa) - n0(d.mutuoCasa));
    const r = tipo === 'speciale' ? RULES.casaSpeciale : RULES.casaOrdinario;
    let base = r.franchigia;
    if (tipo === 'speciale' && d.capoluogoMetro) base = r.franchigiaMetro;
    const franchigia = base + r.perFiglio * Math.max(0, i0(d.figli) - r.figliEsclusi);
    const rileva = Math.max(0, netto - franchigia) * RULES.quotaEccedenzaCasa;
    return { netto, franchigia, rileva: round2(rileva) };
  }

  /** Indicatore della situazione patrimoniale (ISP). */
  function isp(d, tipo) {
    const casa = casaAbitazione(d, tipo);
    const altri = Math.max(0, n0(d.altriImmobili) - n0(d.mutuoAltri));
    const mob = patrimonioMobiliare(d);
    return { casa, altriImmobili: altri, mobiliare: mob, totale: round2(casa.rileva + altri + mob.netto) };
  }

  /** Detrazione del canone di locazione (art. 4 c.4), alternativa alla casa di proprietà. */
  function detrazioneAffitto(d) {
    if (d.abitazione !== 'affitto' || !d.contrattoRegistrato) return 0;
    const canoneAnnuo = n0(d.affittoMensile) * 12;
    const max = RULES.affitto.max + RULES.affitto.perFiglioOltreSecondo * Math.max(0, i0(d.figli) - 2);
    return Math.min(canoneAnnuo, max);
  }

  /**
   * Indicatore della situazione reddituale (ISR).
   * Approssimazione dichiarata: le quote del 20% (max 3.000 € lavoro, 1.000 € pensione) sono per persona;
   * qui si usa il tetto per il numero di persone indicato, che è il massimo teorico.
   * @param {object} d
   * @param {object} [override] redditi sostitutivi per l'ISEE corrente {dip, pens, altri, esenti}
   */
  function isr(d, override) {
    const mob = patrimonioMobiliare(d);
    const figurativo = round2(mob.baseFigurativo * RULES.tassoFigurativo.valore);
    const dip = override ? override.dip : n0(d.redditoDip);
    const pens = override ? override.pens : n0(d.redditoPens);
    const altri = override ? override.altri : n0(d.redditoAltri);
    const esenti = override ? override.esenti : n0(d.trattamentiEsenti) + n0(d.auu2025);

    const nDip = Math.max(dip > 0 ? 1 : 0, i0(d.nDip));
    const nPens = Math.max(pens > 0 ? 1 : 0, i0(d.nPens));
    const detrDip = Math.min(dip * RULES.detrLavoroDip.perc, RULES.detrLavoroDip.maxPerPersona * nDip);
    const detrPens = Math.min(pens * RULES.detrPensione.perc, RULES.detrPensione.maxPerPersona * nPens);
    const mantenimento = n0(d.mantenimentoVersato);
    const redditi = dip + pens + altri + esenti + figurativo;
    const affitto = detrazioneAffitto(d);
    const totale = Math.max(0, redditi - detrDip - detrPens - mantenimento - affitto);
    return { redditi: round2(redditi), figurativo, detrDip: round2(detrDip), detrPens: round2(detrPens), mantenimento, affitto, totale: round2(totale) };
  }

  /** ISEE = (ISR + 20% ISP) / scala. */
  function calcolaIsee(d, tipo, override) {
    const r = isr(d, override);
    const p = isp(d, tipo);
    const s = scalaEquivalenza(d, tipo);
    const ise = r.totale + RULES.pesoPatrimonio * p.totale;
    return { tipo, isr: r, isp: p, scala: s, ise: round2(ise), isee: round2(ise / s.valore) };
  }

  /** Redditi sostitutivi per l'ISEE corrente (art. 9 c.4-6). */
  function redditiCorrenti(d) {
    const mot = MOTIVI_CORRENTE[d.motivo] || MOTIVI_CORRENTE.calo;
    const molt = d.modoCorrente === '2mesi' && mot.dueMesi ? 6 : 1; // art. 9 c.5: ultimi 2 mesi × 6
    // LD = lavoro dipendente + pensione; per prudenza lo trattiamo come lavoro dipendente (quota 20% max 3.000 €)
    return { dip: n0(d.correnteLD) * molt, pens: 0, altri: n0(d.correnteLA) * molt, esenti: n0(d.correnteTR) * molt, moltiplicatore: molt };
  }

  /** Residuo per vivere: entrate nette mensili di oggi meno spese fisse mensili. */
  function residuo(d) {
    const spese = {
      casa: d.abitazione === 'affitto' ? n0(d.affittoMensile) : n0(d.rataMutuo),
      bollette: n0(d.bollette), trasporti: n0(d.trasporti), prestiti: n0(d.prestiti),
      assicurazioni: n0(d.assicurazioni), altre: n0(d.altreSpese)
    };
    // chi è in affitto e ha anche un mutuo (es. altra casa) lo indica comunque nella rata
    if (d.abitazione === 'affitto') spese.casa += n0(d.rataMutuo);
    const totaleSpese = Object.values(spese).reduce((a, b) => a + b, 0);
    const entrate = n0(d.nettoMensile);
    const mensile = entrate - totaleSpese;
    const c = Math.max(1, i0(d.componenti));
    return { entrate, spese, totaleSpese: round2(totaleSpese), mensile: round2(mensile), perPersona: round2(mensile / c) };
  }

  /** Stima indicativa dell'Assegno Unico base per figlio minorenne (senza maggiorazioni). */
  function stimaAuuBase(iseeNeutralizzato) {
    const a = RULES.auu;
    if (iseeNeutralizzato <= a.iseeMin) return a.importoMax;
    if (iseeNeutralizzato >= a.iseeMax) return a.importoMin;
    const k = (iseeNeutralizzato - a.iseeMin) / (a.iseeMax - a.iseeMin);
    return round2(a.importoMax - k * (a.importoMax - a.importoMin));
  }

  /**
   * Elenco delle prestazioni con esito indicativo.
   * esito: 'si' (soglia ISEE rispettata), 'no' (soglia superata), 'forse' (servono altri requisiti / bando)
   */
  function benefici(d, ris) {
    const ord = ris.ordinario.isee;
    const spe = ris.speciale.isee;
    const speN = ris.specialeNeutralizzato;
    const out = [];
    const f = RULES.fonti;
    const minori = i0(d.minori), figli = i0(d.figli);
    const fmt = (x) => fmtEuro(x);

    // Assegno di Inclusione — usa l'ISEE speciale (L. 199/2025)
    const adiTarget = minori > 0 || i0(d.disabili) > 0 || i0(d.over60) > 0;
    out.push({
      id: 'adi', nome: 'Assegno di Inclusione (ADI)',
      soglia: `ISEE per prestazioni familiari e inclusione fino a ${fmt(RULES.adi.isee)}`,
      importo: 'Integra il reddito familiare fino a 6.500 € l\'anno × scala ADI, più fino a 3.640 € se in affitto',
      esito: spe <= RULES.adi.isee ? (adiTarget ? 'si' : 'forse') : 'no',
      nota: adiTarget ? 'Servono anche requisiti di reddito familiare, patrimonio, residenza e veicoli.' : 'Spetta solo se nel nucleo c\'è un minorenne, una persona con disabilità, una persona con almeno 60 anni o in carico ai servizi socio-sanitari.',
      stato: RULES.adi.stato, fonte: f.adi
    });

    if (figli > 0 || minori > 0) {
      const base = stimaAuuBase(speN);
      out.push({
        id: 'auu', nome: 'Assegno Unico per i figli',
        soglia: `Importo pieno fino a ${fmt(RULES.auu.iseeMin)}, minimo da ${fmt(RULES.auu.iseeMax)}`,
        importo: `Circa ${fmt(base)} al mese per ogni figlio minorenne (importo base, senza maggiorazioni)`,
        esito: 'si',
        nota: 'Spetta a tutti, anche senza ISEE (importo minimo). Valori 2026: quelli 2027 vengono rivalutati con l\'inflazione a inizio anno.',
        stato: RULES.auu.stato, fonte: f.auu
      });
    }

    const sogliaBS = figli >= 4 ? RULES.bonusSociali.iseeFamNumerose : RULES.bonusSociali.isee;
    out.push({
      id: 'bonus', nome: 'Bonus sociali luce, gas, acqua e TARI',
      soglia: `ISEE ordinario fino a ${fmt(RULES.bonusSociali.isee)} (fino a ${fmt(RULES.bonusSociali.iseeFamNumerose)} con almeno 4 figli a carico)`,
      importo: 'Sconto automatico in bolletta; 25% sulla TARI',
      esito: ord <= sogliaBS ? 'si' : 'no',
      nota: 'Arriva in automatico se presenti la DSU e il contratto è intestato a un componente del nucleo. Soglia aggiornata da ARERA ogni tre anni (dal 2026).',
      stato: RULES.bonusSociali.stato, fonte: f.arera
    });

    out.push({
      id: 'dedicata', nome: 'Carta "Dedicata a te"',
      soglia: `ISEE ordinario fino a ${fmt(RULES.cartaDedicata.isee)}`,
      importo: `${fmt(RULES.cartaDedicata.importo)} l'anno per la spesa alimentare`,
      esito: ord <= RULES.cartaDedicata.isee ? 'forse' : 'no',
      nota: 'Non si fa domanda: la lista dei beneficiari 2026-2027 è unica e la compilano INPS e Comuni con l\'ISEE 2026. Esclusi chi ha ADI, Carta Acquisti, NASpI, CIG e simili.',
      stato: RULES.cartaDedicata.stato, fonte: f.dedicata
    });

    const caTarget = i0(d.under3) > 0 || i0(d.over67) > 0 || i0(d.over60) > 0;
    out.push({
      id: 'acquisti', nome: 'Carta Acquisti',
      soglia: `ISEE fino a ${fmt(RULES.cartaAcquisti.isee)}`,
      importo: 'Carta prepagata ricaricata ogni due mesi',
      esito: ord <= RULES.cartaAcquisti.isee ? (caTarget ? 'forse' : 'no') : 'no',
      nota: 'Per bambini sotto i 3 anni e persone dai 65 anni in su, con limiti anche di reddito. Soglia 2026, rivalutata ogni anno.',
      stato: RULES.cartaAcquisti.stato, fonte: f.cartaAcquisti
    });

    if (i0(d.under3) > 0) {
      const imp = speN <= RULES.nido.soglia2 ? '3.600 € (nati dal 2024) oppure 3.000 €/2.500 € (nati prima)' : '1.500 €';
      out.push({
        id: 'nido', nome: 'Bonus asilo nido',
        soglia: `ISEE minorenni fino a ${fmt(RULES.nido.soglia2)} per l'importo più alto`,
        importo: `${imp} l'anno`,
        esito: 'si',
        nota: 'Si usa l\'ISEE minorenni al netto dell\'Assegno Unico. Importi 2026, da confermare per il 2027.',
        stato: RULES.nido.stato, fonte: f.nido
      });
      out.push({
        id: 'nuovinati', nome: 'Bonus nuovi nati',
        soglia: `ISEE fino a ${fmt(RULES.nuoviNati.isee)}`,
        importo: `${fmt(RULES.nuoviNati.importo)} una tantum per ogni nuovo nato`,
        esito: speN <= RULES.nuoviNati.isee ? 'forse' : 'no',
        nota: 'Domanda entro 120 giorni dalla nascita o adozione. Confermato per i nati nel 2026: per il 2027 da confermare.',
        stato: RULES.nuoviNati.stato, fonte: f.nuoviNati
      });
    }

    if (d.abitazione === 'affitto') {
      out.push({
        id: 'affitto', nome: 'Contributo affitto (Comune o Regione)',
        soglia: 'Soglie diverse in ogni bando',
        importo: 'Rimborso parziale del canone',
        esito: 'forse',
        nota: 'Serve un contratto registrato. In Veneto il Fondo affitti passa dai bandi dei Comuni: controlla requisiti e scadenze sul sito del tuo Comune.',
        stato: 'da_confermare', fonte: f.venetoAffitti
      });
    }
    return out;
  }

  /** Calcolo completo usato dalla pagina Risultati. */
  function calcolaTutto(input) {
    const d = Object.assign({}, DEFAULT_INPUT, input || {});
    const ordinario = calcolaIsee(d, 'ordinario');
    const speciale = calcolaIsee(d, 'speciale');
    // ISEE speciale al netto dell'Assegno Unico (come per AUU, nido e nuovi nati: circ. INPS 29/2026)
    const specialeNeutralizzato = round2(Math.max(0, speciale.isee - n0(d.auu2025) / speciale.scala.valore));

    let corrente = null;
    if (d.peggiorata) {
      const ov = redditiCorrenti(d);
      const cOrd = calcolaIsee(d, 'ordinario', ov);
      const cSpe = calcolaIsee(d, 'speciale', ov);
      const variazione = ordinario.isr.totale > 0 ? (ordinario.isr.totale - cOrd.isr.totale) / ordinario.isr.totale : 0;
      const mot = MOTIVI_CORRENTE[d.motivo] || MOTIVI_CORRENTE.calo;
      const ammesso = mot.lavoro || Math.abs(variazione) > RULES.sogliaVariazioneCorrente;
      corrente = {
        ordinario: cOrd, speciale: cSpe, variazione: round2(variazione), ammesso, motivo: mot,
        moltiplicatore: ov.moltiplicatore,
        conviene: cOrd.isee < ordinario.isee
      };
    }
    const ris = { input: d, ordinario, speciale, specialeNeutralizzato, corrente, residuo: residuo(d) };
    // Se l'ISEE corrente è ammesso e più basso, gli aiuti si valutano con quello (è l'ISEE che presenteresti)
    ris.beneficiConCorrente = !!(corrente && corrente.ammesso && corrente.conviene);
    ris.benefici = ris.beneficiConCorrente
      ? benefici(d, { ordinario: corrente.ordinario, speciale: corrente.speciale, specialeNeutralizzato: corrente.speciale.isee })
      : benefici(d, ris);
    return ris;
  }

  /** Formattazione euro in italiano (es. 10.140 €). */
  function fmtEuro(x, dec) {
    // Formattazione manuale: separatore delle migliaia sempre presente (es. 1.270 €), uguale su tutti i browser
    const v = Number(x) || 0;
    const d = dec == null ? (Number.isInteger(v) ? 0 : 2) : dec;
    const [int, frac] = Math.abs(v).toFixed(d).split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (v < 0 ? '−' : '') + grouped + (frac ? ',' + frac : '') + ' €';
  }

  /** Valore IMU di un'abitazione (gruppo A, escluso A/10) partendo dalla rendita catastale: rendita × 1,05 × 160. */
  function valoreImuDaRendita(rendita) { return round2(n0(rendita) * 1.05 * 160); }

  return { RULES, DEFAULT_INPUT, MOTIVI_CORRENTE, scalaEquivalenza, patrimonioMobiliare, casaAbitazione, isp, isr, detrazioneAffitto, calcolaIsee, redditiCorrenti, residuo, stimaAuuBase, benefici, calcolaTutto, fmtEuro, valoreImuDaRendita };
});
