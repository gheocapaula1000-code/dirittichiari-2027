#!/usr/bin/env python3
"""Genera l'HTML statico di ogni rotta, js/pages-data.js e sitemap.xml.
Eseguire dalla radice del repo: python3 scripts/build-pages.py
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION = "1.4.0"
SITE = "https://dirittiok.com"
ORG_ID = SITE + "/#organizzazione"
SITE_ID = SITE + "/#website"
APP_ID = SITE + "/#app"

DISCLAIMER = (
    '<div class="disclaimer" role="note"><strong>Attenzione:</strong> Stima orientativa '
    "basata sulle regole note a novembre 2026. I valori ufficiali si ottengono solo con la DSU "
    "presentata a INPS o CAF. Alcuni importi 2027 sono ancora stime.</div>"
)

def updated(label: str, sources: bool = False) -> str:
    extra = " · fonti verificate su INPS, ARERA, MEF" if sources else ""
    return f'<p class="small muted aggiornamento">Ultimo aggiornamento: {label}{extra}.</p>'


def words(html: str) -> int:
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&[a-z]+;", " ", text)
    return len(text.split())


# ---------------------------------------------------------------------------
# Metadati e contenuto statico (identici a quelli usati da JS dopo il render)
# ---------------------------------------------------------------------------
PAGES = []

def add(**kw):
    PAGES.append(kw)

# -- Home
HOME_H1 = "Capisci il tuo ISEE 2027 prima di andare al CAF"
HOME_DESC = (
    "Stima orientativa dell'ISEE 2027, del residuo per vivere e degli aiuti pubblici. "
    "Gratis, senza registrazione. I calcoli restano sul tuo telefono."
)
add(
    route="",
    slug="",
    path="/",
    file="index.html",
    title="DirittiChiari 2027 · Stima ISEE, residuo per vivere e aiuti",
    desc=HOME_DESC,
    date="2026-11-16",
    date_label="16 novembre 2026",
    sources=True,
    robots=None,
    sitemap=True,
    webapp=True,
    faqs=["anni"],
    crumbs=[("Home", "/")],
    h1=HOME_H1,
    main=f"""
      <section class="card hero">
        <h1>{HOME_H1}</h1>
        <p>Con il calcolo ISEE in 5 passi stimi l'ISEE ordinario, quello per le prestazioni familiari e l'eventuale ISEE corrente, scopri quanto ti resta ogni mese per vivere e quali aiuti puoi chiedere.</p>
        <p class="muted">Gratis, senza registrazione, facile da utilizzare. I calcoli restano solo sul tuo telefono. Se ci scrivi dal modulo contatti, partono soltanto le informazioni che inserisci tu.</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="/stima">Inizia la stima</a>
        </div>
      </section>
      {DISCLAIMER}
      {updated("16 novembre 2026", True)}
      <h2>Da dove vuoi partire?</h2>
      <div class="paths">
        <a class="path" href="/stima"><span class="ico" aria-hidden="true">🧭</span><span><strong>Stima ISEE e residuo</strong><span class="muted">Nucleo, redditi 2025, spese, patrimonio al 31/12/2025.</span></span></a>
        <a class="path" href="/diritti-pa"><span class="ico" aria-hidden="true">🏛️</span><span><strong>Diritti e aiuti pubblici</strong><span class="muted">Assegno di Inclusione, Assegno Unico, bonus sociali e altri, con le soglie.</span></span></a>
        <a class="path" href="/ottimizzazione"><span class="ico" aria-hidden="true">💡</span><span><strong>Come ottimizzare legalmente</strong><span class="muted">Cosa conta davvero nell'ISEE e cosa non fare mai.</span></span></a>
        <a class="path" href="/checklist-dsu"><span class="ico" aria-hidden="true">📄</span><span><strong>Documenti per la DSU 2027</strong><span class="muted">Lista da spuntare e stampare prima del CAF.</span></span></a>
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
      <p class="small">Una domanda su DirittiChiari? <a href="/contatti">Scrivici dal modulo contatti</a>. Come facciamo le stime lo spieghiamo in <a href="/metodo">Metodo e fonti</a>.</p>
    """,
)

# -- /stima
STIMA_H1 = "Calcolo ISEE 2027: simulatore online gratuito"
STIMA_DESC = (
    "Calcola l'ISEE 2027 online in 5 passi: ordinario, per prestazioni familiari e corrente, "
    "con redditi 2025 e patrimonio al 31/12/2025. Gratis, sul tuo telefono."
)
add(
    route="stima",
    slug="stima",
    path="/stima",
    file="pages/stima.html",
    title="Simulatore ISEE 2027 online gratis: calcolo in 5 passi · DirittiChiari",
    desc=STIMA_DESC,
    date="2026-11-16",
    date_label="16 novembre 2026",
    sources=True,
    robots=None,
    sitemap=True,
    webapp=True,
    faqs=["anni"],
    crumbs=[("Home", "/"), ("Calcolo ISEE 2027", "/stima")],
    h1=STIMA_H1,
    main=f"""
      <section class="card hero">
        <h1>{STIMA_H1}</h1>
        <p>Questo simulatore ti guida in 5 passi per stimare l'ISEE 2027: l'ordinario, quello per le prestazioni familiari e inclusione e, se ti è utile, l'ISEE corrente. Inserisci il nucleo, i redditi del 2025, le spese fisse di oggi e il patrimonio al 31 dicembre 2025. Alla fine vedi una stima dell'indicatore, quanto ti resta ogni mese per vivere e quali aiuti pubblici puoi valutare, con il collegamento alla fonte di ogni soglia.</p>
        <p>Il percorso è gratis e senza registrazione. I calcoli restano solo su questo telefono o computer: non inviamo i dati della stima a nessun server. I valori ufficiali si ottengono solo con la DSU presentata all'INPS o a un CAF. Questa è una stima orientativa, basata sulle regole note a novembre 2026.</p>
        <p>I cinque passi riguardano: il nucleo familiare; i redditi 2025 e le entrate di oggi; casa e spese fisse; il patrimonio; e l'eventuale calo di reddito per l'ISEE corrente. Prima di andare al CAF puoi anche consultare la <a href="/checklist-dsu">checklist dei documenti per la DSU</a> e la pagina sui <a href="/diritti-pa">bonus e gli aiuti pubblici legati all'ISEE</a>.</p>
        <div class="btn-row"><a class="btn btn-primary" href="/stima#wizard-start">Inizia i 5 passi</a></div>
      </section>
      {DISCLAIMER}
      {updated("16 novembre 2026", True)}
      <section class="card" id="wizard-start">
        <h2>Il tuo nucleo familiare</h2>
        <p>Per usare il percorso guidato serve JavaScript attivo nel browser. I dati che inserisci restano su questo dispositivo.</p>
        <noscript><p>Attiva JavaScript per compilare i 5 passi, oppure scrivici dal <a href="/contatti">modulo contatti</a>.</p></noscript>
      </section>
    """,
)

# -- /risultati (noindex, fuori sitemap)
add(
    route="risultati",
    slug="risultati",
    path="/risultati",
    file="pages/risultati.html",
    title="Risultati della stima ISEE · DirittiChiari",
    desc=(
        "Qui vedi la stima del tuo ISEE 2027, il residuo mensile per vivere e gli aiuti da valutare. "
        "I risultati restano sul tuo dispositivo, non vengono pubblicati."
    ),
    date="2026-11-16",
    date_label="16 novembre 2026",
    sources=True,
    robots="noindex,follow",
    sitemap=False,
    webapp=False,
    faqs=[],
    crumbs=[("Home", "/"), ("Risultati", "/risultati")],
    h1="Risultati",
    main=f"""
      <section class="card">
        <h1>Risultati</h1>
        <p>Non hai ancora inserito dati. Ci vogliono pochi minuti.</p>
        <p>Dopo il percorso guidato trovi qui la stima dell'ISEE, il residuo per vivere e gli <a href="/diritti-pa">aiuti a cui puoi avere diritto</a>.</p>
        <a class="btn btn-primary" href="/stima">Inizia la stima</a>
      </section>
      {DISCLAIMER}
      {updated("16 novembre 2026", True)}
    """,
)

# -- /ottimizzazione
OTT_H1 = "Come abbassare l'ISEE in modo legale: cosa conta davvero"
add(
    route="consigli",
    slug="ottimizzazione",
    path="/ottimizzazione",
    file="pages/ottimizzazione.html",
    title="Come abbassare l'ISEE in modo legale · DirittiChiari",
    desc=(
        "Cosa conta davvero nell'ISEE, le scelte permesse che possono abbassarlo e cosa non fare mai. "
        "Spiegato con calma, prima del CAF."
    ),
    date="2026-11-16",
    date_label="16 novembre 2026",
    sources=True,
    robots=None,
    sitemap=True,
    webapp=False,
    faqs=[],
    crumbs=[("Home", "/"), ("Ottimizzazione ISEE", "/ottimizzazione")],
    h1=OTT_H1,
    main=f"""
      <h1>{OTT_H1}</h1>
      {DISCLAIMER}
      {updated("16 novembre 2026", True)}
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
        <p class="small muted">Per casi particolari (separazioni, figli non conviventi, eredità, imprese) rivolgiti a un CAF o a un patronato.</p></section>
      <p class="small">Vedi anche gli <a href="/diritti-pa">aiuti pubblici legati all'ISEE</a>, la <a href="/checklist-dsu">checklist dei documenti</a> e le <a href="/fonti">fonti usate</a>.</p>
    """,
)

# -- /checklist-dsu
CHK_H1 = "Documenti necessari per la DSU e l'ISEE 2027"
add(
    route="documenti",
    slug="checklist-dsu",
    path="/checklist-dsu",
    file="pages/checklist-dsu.html",
    title="Documenti ISEE 2027 per la DSU: checklist da stampare · DirittiChiari",
    desc=(
        "Checklist dei documenti necessari per la DSU e l'ISEE 2027, da spuntare e stampare "
        "prima di andare al CAF o sul portale ISEE dell'INPS."
    ),
    date="2026-11-16",
    date_label="16 novembre 2026",
    sources=True,
    robots=None,
    sitemap=True,
    webapp=False,
    faqs=[],
    crumbs=[("Home", "/"), ("Documenti DSU", "/checklist-dsu")],
    h1=CHK_H1,
    main=f"""
      <h1>{CHK_H1}</h1>
      <p class="muted">Elenco da portare al CAF o da usare con la DSU precompilata sul portale INPS. Con JavaScript attivo puoi spuntare quello che hai già: la lista resta su questo dispositivo.</p>
      {updated("16 novembre 2026", True)}
      <section class="card"><h2>Per tutti</h2>
        <ul class="tips">
          <li>Documenti d'identità e codici fiscali di tutti i componenti del nucleo</li>
          <li>SPID, CIE o CNS di ogni maggiorenne, se vuoi usare la DSU precompilata</li>
          <li>Contratto d'affitto registrato (estremi di registrazione) e canone annuo</li>
          <li>Redditi 2025: Certificazione Unica 2026, modello 730/2026 o Redditi PF 2026 di ogni componente</li>
          <li>Redditi 2025 non tassati o a imposta sostitutiva (es. borse di studio, redditi esteri, forfettari)</li>
          <li>Assegni di mantenimento ricevuti o versati nel 2025 (sentenza o accordo)</li>
          <li>Saldo al 31/12/2025 e giacenza media 2025 di ogni conto, carta prepagata con IBAN e libretto</li>
          <li>Valore al 31/12/2025 di titoli, buoni postali, fondi, azioni e polizze vita (estratti della banca o di Poste)</li>
          <li>Visure catastali o rendite di case e terreni posseduti al 31/12/2025</li>
          <li>Certificato del mutuo residuo al 31/12/2025</li>
          <li>Targhe di auto, moto e imbarcazioni intestate ai componenti</li>
          <li>Verbali di disabilità o non autosufficienza</li>
        </ul></section>
      <section class="card"><h2>In più, per l'ISEE corrente</h2>
        <ul class="tips">
          <li>ISEE ordinario già attestato (serve prima di chiedere il corrente)</li>
          <li>Lettera di licenziamento, fine contratto, chiusura della partita IVA o comunicazione di interruzione del sussidio</li>
          <li>Buste paga, cedolini e incassi degli ultimi 12 mesi (o degli ultimi 2 mesi, se ammesso)</li>
          <li>Importi di NASpI, cassa integrazione o altri sussidi degli ultimi 12 mesi</li>
        </ul></section>
      <section class="card no-print">
        <p>Puoi presentare la DSU da solo sul <a href="https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.isee-precompilato-55801.isee-precompilato.html" target="_blank" rel="noopener">portale ISEE dell'INPS</a>, con l'app INPS Mobile o gratis tramite un CAF. Prima puoi fare il <a href="/stima">calcolo ISEE 2027</a> e vedere i <a href="/diritti-pa">bonus e aiuti pubblici</a> collegati.</p>
      </section>
      {DISCLAIMER}
    """,
)

# -- /diritti-pa
DIR_H1 = "Bonus ISEE 2027: aiuti pubblici, soglie e fonti"
add(
    route="diritti",
    slug="diritti-pa",
    path="/diritti-pa",
    file="pages/diritti-pa.html",
    title="Bonus e aiuti con ISEE 2027: soglie e fonti ufficiali · DirittiChiari",
    desc=(
        "Assegno di Inclusione, Assegno Unico, bonus sociali e altri aiuti legati all'ISEE 2027, "
        "con le soglie e le fonti ufficiali."
    ),
    date="2026-11-16",
    date_label="16 novembre 2026",
    sources=True,
    robots=None,
    sitemap=True,
    webapp=False,
    faqs=["quale"],
    crumbs=[("Home", "/"), ("Bonus e aiuti ISEE", "/diritti-pa")],
    h1=DIR_H1,
    main=f"""
      <h1>{DIR_H1}</h1>
      {DISCLAIMER}
      {updated("16 novembre 2026", True)}
      <p class="muted">Ogni aiuto ha altri requisiti (residenza, cittadinanza, età, patrimonio). Apri la fonte ufficiale prima di fare domanda. Come verifichiamo i valori è spiegato in <a href="/fonti">Fonti e regole usate</a> e in <a href="/metodo">Metodo e fonti</a>.</p>
      <article class="benefit forse"><h3>Assegno di Inclusione (ADI)</h3><span class="badge stato"><a href="/fonti">Verificato</a></span>
        <p class="small"><strong>Soglia:</strong> ISEE per prestazioni familiari fino a 10.140 €<br>
        <strong>Cosa offre:</strong> Integra il reddito familiare fino a 6.500 € l'anno × scala ADI (8.190 € se il nucleo è composto da persone di almeno 67 anni, o da over 67 e familiari con disabilità grave o non autosufficienza), più fino a 3.640 € l'anno se in affitto (1.950 € negli stessi nuclei).<br>
        <strong>Chi può chiederlo:</strong> Nuclei con almeno un minorenne, una persona con disabilità, una persona di almeno 60 anni o in carico ai servizi socio-sanitari.</p>
        <a class="small" href="https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.assegno-di-inclusione-adi.html" target="_blank" rel="noopener">Fonte: INPS, scheda Assegno di Inclusione</a></article>
      <article class="benefit forse"><h3>Assegno Unico per i figli</h3><span class="badge stato"><a href="/fonti">Valori 2026, da confermare per il 2027</a></span>
        <p class="small"><strong>Soglia:</strong> Importo pieno fino a 17.468,51 €; minimo da 46.582,71 €<br>
        <strong>Cosa offre:</strong> Da 58,30 € a 203,80 € al mese per figlio minorenne</p>
        <a class="small" href="https://www.inps.it/content/dam/inps-site/it/scorporati/circolari-e-messaggi/2026/01/Circolare_15152/Allegati/16548_Circolare-numero-7-del-30-01-2026.pdf" target="_blank" rel="noopener">Fonte: INPS, Circolare n. 7 del 30/01/2026 (Assegno Unico 2026)</a></article>
      <article class="benefit forse"><h3>Bonus sociali luce, gas, acqua, TARI</h3><span class="badge stato"><a href="/fonti">Verificato</a></span>
        <p class="small"><strong>Soglia:</strong> ISEE fino a 9.796 € (20.000 € con 4+ figli a carico)<br>
        <strong>Cosa offre:</strong> Automatici con la DSU</p>
        <a class="small" href="https://www.arera.it/consumatori/bonus-sociale/bonus-sociale-per-disagio-economico/quali-sono-i-requisiti" target="_blank" rel="noopener">Fonte: ARERA, delibera 2/2026/R/com (bonus sociali)</a></article>
      <article class="benefit forse"><h3>Carta «Dedicata a te»</h3><span class="badge stato"><a href="/fonti">Verificato</a></span>
        <p class="small"><strong>Soglia:</strong> ISEE ordinario fino a 15.000 €<br>
        <strong>Cosa offre:</strong> 500 € l'anno, lista unica 2026-2027</p>
        <a class="small" href="https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.09.carta-dedicata-a-te-modalit-operative-per-il-2026-2027.html" target="_blank" rel="noopener">Fonte: INPS, Carta «Dedicata a te» 2026-2027</a></article>
      <article class="benefit forse"><h3>Carta Acquisti</h3><span class="badge stato"><a href="/fonti">Valore 2026, rivalutato ogni anno</a></span>
        <p class="small"><strong>Soglia:</strong> ISEE fino a 8.230,81 €<br>
        <strong>Cosa offre:</strong> Carta prepagata ricaricata ogni due mesi<br>
        <strong>Chi può chiederlo:</strong> Bambini sotto i 3 anni e persone dai 65 anni in su, con altri limiti di reddito.</p>
        <a class="small" href="https://www.mef.gov.it/focus/carta_acquisti/eventi/2026/Dal-1-gennaio-2026-in-vigore-gli-aggiornamenti-ISTAT-per-gli-importi-di-reddito-e-lindicatore-ISEE/" target="_blank" rel="noopener">Fonte: MEF, Carta Acquisti: limiti 2026</a></article>
      <article class="benefit forse"><h3>Bonus asilo nido</h3><span class="badge stato"><a href="/fonti">Valori 2026, da confermare per il 2027</a></span>
        <p class="small"><strong>Soglia:</strong> Importo pieno con ISEE minorenni fino a 40.000 €<br>
        <strong>Cosa offre:</strong> 3.600 € per i nati dal 2024; 3.000/2.500/1.500 € per i nati prima</p>
        <a class="small" href="https://www.inps.it/content/dam/inps-site/it/scorporati/circolari-e-messaggi/2026/03/Circolare_15207/Allegati/16651_Circolare-numero-29-del-27-03-2026.pdf" target="_blank" rel="noopener">Fonte: INPS, Circolare n. 29 del 27/03/2026 (bonus asilo nido)</a></article>
      <article class="benefit forse"><h3>Bonus nuovi nati</h3><span class="badge stato"><a href="/fonti">Confermato per il 2026, da confermare per il 2027</a></span>
        <p class="small"><strong>Soglia:</strong> ISEE fino a 40.000 €<br>
        <strong>Cosa offre:</strong> 1.000 € una tantum</p>
        <a class="small" href="https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-nuovi-nati.html" target="_blank" rel="noopener">Fonte: INPS, scheda Bonus nuovi nati</a></article>
      <article class="benefit forse"><h3>Contributo affitto (Comuni e Regioni)</h3><span class="badge stato"><a href="/fonti">Da verificare nel bando</a></span>
        <p class="small"><strong>Soglia:</strong> Soglie del singolo bando<br>
        <strong>Cosa offre:</strong> In Veneto: Fondo affitti tramite i bandi comunali</p>
        <a class="small" href="https://www.regione.veneto.it/web/casa/fondo-affitti" target="_blank" rel="noopener">Fonte: Regione del Veneto, Fondo affitti</a></article>
      <section class="card"><h2>Quale ISEE serve per l'Assegno Unico</h2>
        <p>Per l'Assegno Unico si usa l'<strong>ISEE per prestazioni familiari e inclusione</strong>, non l'ISEE ordinario. È lo stesso indicatore previsto dalla L. 199/2025, in genere più favorevole se hai casa di proprietà o almeno due figli. Vale anche, al netto dell'Assegno Unico già percepito, per il bonus nido e il bonus nuovi nati.</p>
        <p>Dal 2026 l'INPS calcola questo ISEE in automatico. Si usa solo per ADI, Supporto per la formazione e il lavoro, Assegno Unico, bonus nido e bonus nuovi nati. Per tutto il resto (bonus sociali, Carta «Dedicata a te», molti servizi comunali) vale l'ISEE ordinario.</p>
        <a class="btn btn-primary btn-block" href="/stima">Calcola il tuo ISEE</a></section>
      <section class="card"><h2>Manovra 2027 (in discussione)</h2>
        <p>Il disegno di legge di bilancio 2027 (A.C. 3174) è all'esame del Parlamento e <strong>non è ancora legge</strong>. Alcune misure e soglie legate all'ISEE potrebbero cambiare: le ricontrolleremo quando il testo diventerà legge.</p>
        <p class="small"><a href="https://www.senato.it/leggi-e-documenti/disegni-di-legge/scheda-ddl?did=60577" target="_blank" rel="noopener">Fonte ufficiale: scheda A.C. 3174 sul sito del Senato</a>.</p></section>
    """,
)

# -- /fonti
add(
    route="fonti",
    slug="fonti",
    path="/fonti",
    file="pages/fonti.html",
    title="Fonti e regole usate · DirittiChiari",
    desc=(
        "Regole e fonti ufficiali usate da DirittiChiari per la stima ISEE 2027, "
        "con lo stato di ogni valore. Come lavoriamo è in Metodo e fonti."
    ),
    date="2026-11-16",
    date_label="16 novembre 2026",
    sources=True,
    robots=None,
    sitemap=True,
    webapp=False,
    faqs=[],
    crumbs=[("Home", "/"), ("Fonti e regole", "/fonti")],
    h1="Fonti e regole usate",
    main=f"""
      <h1>Fonti e regole usate</h1>
      {DISCLAIMER}
      {updated("16 novembre 2026", True)}
      <p>Ogni soglia e ogni regola usata nel simulatore ha uno stato (verificato, valore 2026 da confermare, da confermare) e un collegamento alla fonte ufficiale. Come facciamo le stime, e cosa non copriamo, è spiegato in <a href="/metodo">Metodo e fonti</a>.</p>
      <section class="card"><h2>Soglie e parametri</h2>
        <ul class="tips small">
          <li>Scala di equivalenza (1 · 1,57 · 2,04 · 2,46 · 2,85, +0,35)</li>
          <li>Maggiorazioni figli ISEE ordinario (0,2 · 0,35 · 0,5) e speciale (0,1 · 0,25 · 0,40 · 0,55)</li>
          <li>Quota 20% lavoro dipendente (max 3.000 €) e pensione (max 1.000 €)</li>
          <li>Affitto registrato fino a 7.000 € (+500 € per figlio dopo il secondo)</li>
          <li>Franchigia casa ordinario 52.500 €; speciale 91.500 € / 120.000 €</li>
          <li>Franchigia mobiliare 6.000 € +2.000 € a componente (max 10.000 €)</li>
          <li>Titoli di Stato e risparmio postale esclusi fino a 50.000 €</li>
          <li>Soglia ADI 10.140 € · Assegno Unico 2026 · Bonus sociali 9.796 € / 20.000 €</li>
          <li>Carta «Dedicata a te» 15.000 € · Carta Acquisti 8.230,81 € · Bonus nido e nuovi nati</li>
        </ul>
        <p class="small">Con JavaScript attivo ogni riga mostra lo stato e il collegamento alla fonte.</p>
      </section>
      <section class="card"><h2>Semplificazioni di questa stima</h2><ul class="tips small">
        <li>Le quote del 20% su lavoro e pensione sono calcolate sul totale del nucleo, con il tetto moltiplicato per il numero di persone.</li>
        <li>Non sono gestiti: redditi agrari, immobili all'estero, nuclei con genitori non conviventi (ISEE minorenni), ISEE università e socio-sanitario.</li>
        <li>Il rendimento figurativo usa un tasso indicativo, da confermare ogni anno.</li>
        <li>Nell'ISEE corrente i redditi indicati per il periodo sostituiscono tutti i redditi del nucleo; il patrimonio resta quello al 31/12/2025.</li>
        <li>L'importo dell'Assegno Unico è una stima lineare dell'importo base, senza maggiorazioni.</li>
      </ul></section>
    """,
)

# -- /metodo (nuova pagina)
add(
    route="metodo",
    slug="metodo",
    path="/metodo",
    file="pages/metodo.html",
    title="Metodo e fonti · DirittiChiari 2027",
    desc=(
        "Come DirittiChiari stima l'ISEE 2027: regole seguite, fonti ufficiali, limiti della stima "
        "e aggiornamenti. Un servizio di Pi.Gi Service."
    ),
    date="2026-11-16",
    date_label="16 novembre 2026",
    sources=True,
    robots=None,
    sitemap=True,
    webapp=False,
    faqs=[],
    crumbs=[("Home", "/"), ("Metodo e fonti", "/metodo")],
    h1="Metodo e fonti",
    main=f"""
      <section class="card">
        <h1>Metodo e fonti</h1>
        <p>DirittiChiari 2027 è un servizio di <strong>Pi.Gi Service</strong>. Offre una stima orientativa dell'ISEE, di quanto ti resta per vivere e degli aiuti pubblici, per capirli con calma prima di andare al CAF o sul portale INPS.</p>
        <h2>Come facciamo la stima</h2>
        <p>I calcoli seguono le regole del DPCM 159/2013 e gli aggiornamenti successivi, tra cui la legge 199/2025 sull'ISEE per prestazioni familiari e inclusione. Le soglie e i parametri arrivano da fonti ufficiali: INPS, ARERA, Ministero del Lavoro, Ministero dell'Economia e delle Finanze, Normattiva.</p>
        <p>Ogni valore usato nel simulatore ha uno stato: verificato, valore 2026 da confermare per il 2027, oppure da confermare. L'elenco completo, con il collegamento a ogni fonte, è nella pagina <a href="/fonti">Fonti e regole usate</a>.</p>
        <h2>Cosa non è questa stima</h2>
        <p>Non è una DSU e non sostituisce l'attestazione INPS, il CAF o una consulenza. I calcoli restano solo sul tuo dispositivo. Quando una norma è ancora in discussione in Parlamento, lo indichiamo in pagina e la ricontrolliamo quando diventa legge.</p>
        <h2>Chi la cura</h2>
        <p>Autore del servizio: <strong>Pi.Gi Service</strong>. Per una domanda: <a href="/contatti">modulo contatti</a> oppure <a href="mailto:info@pigiservice.com">info@pigiservice.com</a>.</p>
        {updated("16 novembre 2026", True)}
      </section>
      {DISCLAIMER}
    """,
)

# -- /contatti
add(
    route="contatti",
    slug="contatti",
    path="/contatti",
    file="pages/contatti.html",
    title="Contatti · DirittiChiari 2027",
    desc=(
        "Scrivi a DirittiChiari: ti rispondiamo via email. Dal modulo partono solo le informazioni "
        "che inserisci tu, non i dati della stima."
    ),
    date="2026-11-15",
    date_label="15 novembre 2026",
    sources=False,
    robots=None,
    sitemap=True,
    webapp=False,
    faqs=[],
    crumbs=[("Home", "/"), ("Contatti", "/contatti")],
    h1="Contatti",
    main=f"""
      <section class="card">
        <h1>Contatti</h1>
        <p>Una domanda su DirittiChiari? Scrivici: ti rispondiamo via email.</p>
        <p class="small muted">I calcoli della stima restano sul tuo dispositivo. Da questo modulo partono soltanto le informazioni che scrivi tu, e le usiamo solo per risponderti. Non viene mai inviato nessun dato del percorso ISEE.</p>
        <div data-modulo-contatti data-privacy="/privacy" data-titolo="h2">
          <p>Per usare il modulo serve JavaScript. In alternativa scrivi a <a href="mailto:info@pigiservice.com">info@pigiservice.com</a>.</p>
        </div>
        {updated("15 novembre 2026", False)}
      </section>
      {DISCLAIMER}
    """,
)

# -- /privacy
add(
    route="privacy",
    slug="privacy",
    path="/privacy",
    file="pages/privacy.html",
    title="Privacy · DirittiChiari 2027",
    desc=(
        "Come trattiamo i dati su DirittiChiari 2027: i calcoli restano sul tuo dispositivo. "
        "Il modulo contatti serve solo per risponderti."
    ),
    date="2026-11-15",
    date_label="15 novembre 2026",
    sources=False,
    robots=None,
    sitemap=True,
    webapp=False,
    faqs=[],
    crumbs=[("Home", "/"), ("Privacy", "/privacy")],
    h1="Privacy",
    main=f"""
      <section class="card">
        <h1>Privacy</h1>
        <p>DirittiChiari 2027 è un servizio di <strong>Pi.Gi Service di Gheoca Paula</strong> (titolare del trattamento). Per qualsiasi domanda: <a href="mailto:info@pigiservice.com">info@pigiservice.com</a>.</p>
        <h2>I calcoli restano sul tuo dispositivo</h2>
        <p>La stima ISEE, il residuo per vivere, gli aiuti e la checklist si calcolano e si salvano solo su questo telefono o computer, in locale. Non li inviamo a nessun server, non chiediamo una registrazione, non facciamo tracciamento e non usiamo intelligenza artificiale.</p>
        <p>Puoi cancellare tutto in qualsiasi momento con «Cancella i miei dati», in fondo alla pagina.</p>
        <h2>Modulo contatti</h2>
        <p>Se ci scrivi dal <a href="/contatti">modulo contatti</a>, inviamo soltanto quello che inserisci tu: nome, email, eventuale telefono o attività, il messaggio, il consenso e la pagina da cui scrivi. Questi dati servono solo per risponderti. Non viene mai incluso nessun dato della stima ISEE o del percorso guidato.</p>
        <p>Il messaggio arriva a <a href="mailto:info@pigiservice.com">info@pigiservice.com</a>. Lo conserviamo il tempo necessario per darti una risposta e per eventuali obblighi di legge.</p>
        {updated("15 novembre 2026", False)}
      </section>
      {DISCLAIMER}
    """,
)

# -- 404
add(
    route="404",
    slug="404",
    path=None,
    file="404.html",
    title="Pagina non trovata · DirittiChiari 2027",
    desc="Questa pagina non esiste. Puoi calcolare l'ISEE 2027 o aprire la checklist dei documenti per la DSU.",
    date="2026-11-16",
    date_label="16 novembre 2026",
    sources=False,
    robots="noindex,follow",
    sitemap=False,
    webapp=False,
    faqs=[],
    crumbs=[("Home", "/")],
    h1="Pagina non trovata",
    main=f"""
      <section class="card">
        <h1>Pagina non trovata</h1>
        <p>Questo indirizzo non corrisponde a una pagina di DirittiChiari. Puoi tornare all'inizio o proseguire da qui:</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="/stima">Calcolo ISEE 2027</a>
          <a class="btn btn-ghost" href="/checklist-dsu">Checklist documenti DSU</a>
        </div>
        <p class="small"><a href="/">Torna all'inizio</a></p>
      </section>
    """,
)

FAQS = {
    "anni": {
        "@type": "Question",
        "name": "Quali anni contano per l'ISEE 2027?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": (
                "Redditi del 2025, cioè quelli della CU 2026 o del 730/2026. Patrimonio al 31 dicembre 2025: "
                "conti, investimenti, case. Affitto: il canone del contratto registrato, fino a 7.000 € l'anno. "
                "Lo prevede il DPCM 159/2013 (artt. 4 e 5): si guarda al secondo anno prima della DSU."
            ),
        },
    },
    "quale": {
        "@type": "Question",
        "name": "Quale ISEE si usa?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": (
                "Dal 2026 l'INPS calcola anche l'ISEE per prestazioni familiari e inclusione (L. 199/2025), "
                "più favorevole per chi ha casa di proprietà o almeno 2 figli. Si usa solo per ADI, Supporto "
                "formazione e lavoro, Assegno Unico, bonus nido e bonus nuovi nati. Per tutto il resto vale l'ISEE ordinario."
            ),
        },
    },
}

ORG = {
    "@type": "Organization",
    "@id": ORG_ID,
    "name": "Pi.Gi Service",
    "legalName": "Pi.Gi Service di Gheoca Paula",
    "email": "info@pigiservice.com",
    "url": SITE + "/",
    "logo": SITE + "/icons/icon-512.png",
    "contactPoint": {
        "@type": "ContactPoint",
        "email": "info@pigiservice.com",
        "contactType": "customer support",
        "availableLanguage": "Italian",
    },
}

WEBSITE = {
    "@type": "WebSite",
    "@id": SITE_ID,
    "url": SITE + "/",
    "name": "DirittiChiari 2027",
    "inLanguage": "it-IT",
    "publisher": {"@id": ORG_ID},
}

WEBAPP = {
    "@type": "WebApplication",
    "@id": APP_ID,
    "name": "DirittiChiari 2027",
    "url": SITE + "/",
    "description": HOME_DESC,
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Any",
    "inLanguage": "it-IT",
    "isAccessibleForFree": True,
    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
    "publisher": {"@id": ORG_ID},
    "image": SITE + "/og-image.png",
}


def page_url(p):
    if p["path"] is None:
        return None
    return SITE + "/" if p["path"] == "/" else SITE + p["path"]


def json_ld(p):
    graph = [ORG, WEBSITE]
    url = page_url(p)
    page_id = (url or SITE + "/404") + "#webpage"
    crumb_id = (url or SITE + "/404") + "#breadcrumb"
    webpage = {
        "@type": "WebPage",
        "@id": page_id,
        "name": p["title"],
        "description": p["desc"],
        "dateModified": p["date"],
        "inLanguage": "it-IT",
        "isPartOf": {"@id": SITE_ID},
        "author": {"@id": ORG_ID},
        "publisher": {"@id": ORG_ID},
        "breadcrumb": {"@id": crumb_id},
    }
    if url:
        webpage["url"] = url
    graph.append(webpage)
    items = []
    for i, (name, path) in enumerate(p["crumbs"], start=1):
        item = {"@type": "ListItem", "position": i, "name": name}
        item["item"] = SITE + "/" if path == "/" else SITE + path
        items.append(item)
    graph.append({"@type": "BreadcrumbList", "@id": crumb_id, "itemListElement": items})
    if p.get("webapp"):
        graph.append(WEBAPP)
    if p.get("faqs"):
        graph.append({
            "@type": "FAQPage",
            "@id": (url or SITE) + "#faq",
            "inLanguage": "it-IT",
            "isPartOf": {"@id": page_id},
            "mainEntity": [FAQS[k] for k in p["faqs"]],
        })
    return {"@context": "https://schema.org", "@graph": graph}


def render_html(p, shell: str) -> str:
    url = page_url(p) or ""
    robots = f'<meta name="robots" content="{p["robots"]}">\n' if p.get("robots") else ""
    canonical = f'<link rel="canonical" href="{url}">\n' if url else ""
    html = shell
    html = html.replace("{{TITLE}}", p["title"])
    html = html.replace("{{DESCRIPTION}}", p["desc"].replace('"', "&quot;"))
    html = html.replace("{{ROBOTS}}", robots)
    html = html.replace("{{CANONICAL}}", canonical)
    html = html.replace("{{URL}}", url)
    html = html.replace("{{JSON_LD}}", json.dumps(json_ld(p), ensure_ascii=False, indent=2))
    html = html.replace("{{MAIN}}", p["main"].rstrip() + "\n")
    html = html.replace("{{VERSION}}", VERSION)
    return html


def write_version():
    text = (
        "/* generato da scripts/build-pages.py — unica fonte della versione */\n"
        "var DC_VERSION = %s;\n"
        "if (typeof self !== 'undefined') self.DC_VERSION = DC_VERSION;\n"
        "if (typeof window !== 'undefined') window.DC_VERSION = DC_VERSION;\n"
    ) % (json.dumps(VERSION),)
    (ROOT / "js" / "version.js").write_text(text, encoding="utf-8")


def stamp_sw():
    sw = ROOT / "sw.js"
    text = sw.read_text(encoding="utf-8")
    if "/* dc-version:" in text:
        text = re.sub(r"/\* dc-version:[^*]*\*/", "/* dc-version:%s */" % VERSION, text, count=1)
    else:
        text = "/* dc-version:%s */\n" % VERSION + text
    text = re.sub(r"const VERSION = '[^']+'", "const VERSION = '%s'" % VERSION, text, count=1)
    sw.write_text(text, encoding="utf-8")

def write_pages_data(pages):
    out = {}
    for p in pages:
        if p["route"] == "404":
            key = "404"
        else:
            key = p["route"]
        payload = {
            "title": p["title"],
            "desc": p["desc"],
            "url": page_url(p) or "",
            "robots": p.get("robots"),
            "dateModified": p["date"],
            "dateLabel": p["date_label"],
            "showSources": p["sources"],
            "h1": p["h1"],
            "jsonLdText": json.dumps(json_ld(p), ensure_ascii=False, indent=2),
        }
        out[key] = payload
    text = "/* generato da scripts/build-pages.py — non modificare a mano */\n"
    text += "window.DC_PAGES = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n"
    (ROOT / "js" / "pages-data.js").write_text(text, encoding="utf-8")


def write_sitemap(pages):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for p in pages:
        if not p.get("sitemap"):
            continue
        loc = page_url(p)
        lines.append(f"  <url><loc>{loc}</loc><lastmod>{p['date']}</lastmod></url>")
    lines.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    shell = (ROOT / "templates" / "shell.html").read_text(encoding="utf-8")
    errors = []
    (ROOT / "pages").mkdir(exist_ok=True)
    for p in PAGES:
        if p.get("desc") and p["route"] != "404":
            n = len(p["desc"])
            if not (120 <= n <= 160):
                errors.append(f"desc {p['path']}: {n} caratteri (attesi ~150)")
        if p["path"] == "/stima":
            n = words(p["main"])
            if not (150 <= n <= 320):
                errors.append(f"/stima parole in main: {n} (attese 150-300)")
        html = render_html(p, shell)
        dest = ROOT / p["file"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(html, encoding="utf-8")
        print(f"  {p['file']}: title={len(p['title'])}c desc={len(p['desc'])}c words≈{words(p['main'])}")
    write_pages_data(PAGES)
    write_version()
    stamp_sw()
    write_sitemap(PAGES)
    # interdizione della parola "semplice" da sola nei file generati
    for f in list((ROOT / "pages").glob("*.html")) + [ROOT / "index.html", ROOT / "404.html"]:
        txt = f.read_text(encoding="utf-8")
        if re.search(r"\bsemplice\b(?! da utilizzare)", txt, re.I):
            errors.append(f"{f.name}: contiene 'semplice'")
    if errors:
        print("ERRORI:")
        for e in errors:
            print(" -", e)
        sys.exit(1)
    print("OK, pagine generate (v%s)" % VERSION)


if __name__ == "__main__":
    main()
