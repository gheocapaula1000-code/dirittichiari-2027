#!/usr/bin/env python3
"""Genera l'HTML statico per ogni rotta e lingua, js/messages.js, js/pages-data.js e sitemap.xml.
Fonte delle stringhe: i18n/{it,en,bn}.json. Eseguire dalla radice: python3 scripts/build-pages.py
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_lib import (
    DEFAULT_LANG, DIR_ATTR, HTML_LANG, I18N_DIR, LANGS, LANG_PREFIX, LOCALE,
    ROUTE_BY_SLUG, SLUG_BY_ROUTE, flatten, fmt_euro, lang_path, load_catalog, page_url,
    rich, t_map,
)

ROOT = Path(__file__).resolve().parent.parent
VERSION = "1.5.0"
SITE = "https://dirittiok.com"
ORG_ID = SITE + "/#organizzazione"
SITE_ID = SITE + "/#website"
APP_ID = SITE + "/#app"

# route, slug, path (it), date, robots, sitemap, webapp, faqs, crumb keys (title keys), seo keys prefix
PAGE_DEFS = [
    dict(route="", slug="", path="/", file_it="index.html", date="2026-11-16", date_key="common.date_2026_11_16",
         sources=True, robots=None, sitemap=True, webapp=True, faqs=["aiuti", "dati", "anni", "gratis"],
         crumbs=[("schema.crumb_home", "/")], seo="home", title_key="home.seo_title", desc_key="home.seo_desc", h1_key="home.h1"),
    dict(route="stima", slug="stima", path="/stima", file_it="pages/stima.html", date="2026-11-16", date_key="common.date_2026_11_16",
         sources=True, robots=None, sitemap=True, webapp=True, faqs=["anni"],
         crumbs=[("schema.crumb_home", "/"), ("schema.crumb_stima", "/stima")],
         seo="stima", title_key="seo.stima_title", desc_key="seo.stima_desc", h1_key="seo.stima_h1"),
    dict(route="risultati", slug="risultati", path="/risultati", file_it="pages/risultati.html", date="2026-11-16", date_key="common.date_2026_11_16",
         sources=True, robots="noindex,follow", sitemap=False, webapp=False, faqs=[],
         crumbs=[("schema.crumb_home", "/"), ("schema.crumb_risultati", "/risultati")],
         seo="risultati", title_key="seo.risultati_title", desc_key="seo.risultati_desc", h1_key="seo.risultati_empty_h1"),
    dict(route="consigli", slug="ottimizzazione", path="/ottimizzazione", file_it="pages/ottimizzazione.html", date="2026-11-16", date_key="common.date_2026_11_16",
         sources=True, robots=None, sitemap=True, webapp=False, faqs=[],
         crumbs=[("schema.crumb_home", "/"), ("seo.ott_crumb", "/ottimizzazione")],
         seo="ott", title_key="seo.ott_title", desc_key="seo.ott_desc", h1_key="seo.ott_h1"),
    dict(route="documenti", slug="checklist-dsu", path="/checklist-dsu", file_it="pages/checklist-dsu.html", date="2026-11-16", date_key="common.date_2026_11_16",
         sources=True, robots=None, sitemap=True, webapp=False, faqs=[],
         crumbs=[("schema.crumb_home", "/"), ("seo.chk_h1", "/checklist-dsu")],
         seo="chk", title_key="seo.chk_title", desc_key="seo.chk_desc", h1_key="seo.chk_h1"),
    dict(route="diritti", slug="diritti-pa", path="/diritti-pa", file_it="pages/diritti-pa.html", date="2026-11-16", date_key="common.date_2026_11_16",
         sources=True, robots=None, sitemap=True, webapp=False, faqs=["quale"],
         crumbs=[("schema.crumb_home", "/"), ("seo.dir_h1", "/diritti-pa")],
         seo="dir", title_key="seo.dir_title", desc_key="seo.dir_desc", h1_key="seo.dir_h1"),
    dict(route="fonti", slug="fonti", path="/fonti", file_it="pages/fonti.html", date="2026-11-16", date_key="common.date_2026_11_16",
         sources=True, robots=None, sitemap=True, webapp=False, faqs=[],
         crumbs=[("schema.crumb_home", "/"), ("seo.fonti_h1", "/fonti")],
         seo="fonti", title_key="seo.fonti_title", desc_key="seo.fonti_desc", h1_key="seo.fonti_h1"),
    dict(route="metodo", slug="metodo", path="/metodo", file_it="pages/metodo.html", date="2026-11-16", date_key="common.date_2026_11_16",
         sources=True, robots=None, sitemap=True, webapp=False, faqs=[],
         crumbs=[("schema.crumb_home", "/"), ("seo.metodo_h1", "/metodo")],
         seo="metodo", title_key="seo.metodo_title", desc_key="seo.metodo_desc", h1_key="seo.metodo_h1"),
    dict(route="contatti", slug="contatti", path="/contatti", file_it="pages/contatti.html", date="2026-11-15", date_key="common.date_2026_11_15",
         sources=False, robots=None, sitemap=True, webapp=False, faqs=[],
         crumbs=[("schema.crumb_home", "/"), ("seo.contatti_h1", "/contatti")],
         seo="contatti", title_key="seo.contatti_title", desc_key="seo.contatti_desc", h1_key="seo.contatti_h1"),
    dict(route="privacy", slug="privacy", path="/privacy", file_it="pages/privacy.html", date="2026-11-15", date_key="common.date_2026_11_15",
         sources=False, robots=None, sitemap=True, webapp=False, faqs=[],
         crumbs=[("schema.crumb_home", "/"), ("seo.privacy_h1", "/privacy")],
         seo="privacy", title_key="seo.privacy_title", desc_key="seo.privacy_desc", h1_key="seo.privacy_h1"),
    dict(route="404", slug="404", path=None, file_it="404.html", date="2026-11-16", date_key="common.date_2026_11_16",
         sources=False, robots="noindex,follow", sitemap=False, webapp=False, faqs=[],
         crumbs=[("schema.crumb_home", "/")],
         seo="notfound", title_key="seo.notfound_title", desc_key="seo.notfound_desc", h1_key="seo.notfound_h1"),
]

PORTALE_ISEE = "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.isee-precompilato-55801.isee-precompilato.html"
# URL ufficiali (invarianti)
FONTE_URL = {
    "dpcm159": "https://www.normattiva.it/uri-res/N2Ls?urn:nir:presidente.consiglio.ministri:decreto:2013-12-05;159!vig=",
    "inps102": "https://www.inps.it/content/dam/inps-site/it/scorporati/circolari-e-messaggi/2026/01/Circolare_15133/Allegati/16520_Messaggio-numero-102-del-12-01-2026.pdf",
    "dsu2026": "https://www.lavoro.gov.it/sites/default/files/documenti-e-norme/normativa/Decreto-Dip-3-del-02032026-ISEE.pdf",
    "adi": "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.assegno-di-inclusione-adi.html",
    "auu": "https://www.inps.it/content/dam/inps-site/it/scorporati/circolari-e-messaggi/2026/01/Circolare_15152/Allegati/16548_Circolare-numero-7-del-30-01-2026.pdf",
    "arera": "https://www.arera.it/consumatori/bonus-sociale/bonus-sociale-per-disagio-economico/quali-sono-i-requisiti",
    "dedicata": "https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.09.carta-dedicata-a-te-modalit-operative-per-il-2026-2027.html",
    "cartaAcquisti": "https://www.mef.gov.it/focus/carta_acquisti/eventi/2026/Dal-1-gennaio-2026-in-vigore-gli-aggiornamenti-ISTAT-per-gli-importi-di-reddito-e-lindicatore-ISEE/",
    "nido": "https://www.inps.it/content/dam/inps-site/it/scorporati/circolari-e-messaggi/2026/03/Circolare_15207/Allegati/16651_Circolare-numero-29-del-27-03-2026.pdf",
    "nuoviNati": "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-nuovi-nati.html",
    "venetoAffitti": "https://www.regione.veneto.it/web/casa/fondo-affitti",
    "portaleIsee": PORTALE_ISEE,
}

FAQ_KEYS = {
    "aiuti": ("faq.aiuti_q", "faq.aiuti_a"),
    "dati": ("faq.dati_q", "faq.dati_a"),
    "anni": ("faq.anni_q", "faq.anni_a"),
    "gratis": ("faq.gratis_q", "faq.gratis_a"),
    "quale": ("faq.quale_q", "faq.quale_a"),
}


def words(html: str) -> int:
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&[a-z]+;", " ", text)
    return len(text.split())


def plain(text: str) -> str:
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    return s


def tv(m, key, **params):
    s = m.get(key, key)
    if params:
        def repl(mo):
            k = mo.group(1)
            return str(params[k]) if k in params else mo.group(0)
        s = re.sub(r"\{([a-zA-Z0-9_]+)\}", repl, s)
    return s


def tr(m, lang, key, **params):
    return rich(tv(m, key, **params), lang, **params)


def updated(m, lang, p):
    d = tv(m, p["date_key"])
    key = "common.updated_sources" if p["sources"] else "common.updated"
    return f'<p class="small muted aggiornamento">{tr(m, lang, key, date=d)}</p>'


def disclaimer(m, lang):
    return f'<div class="disclaimer" role="note">{tr(m, lang, "common.disclaimer")}</div>'


def file_for(lang, p):
    if p["route"] == "404":
        return "404.html" if lang == "it" else f"{lang}/404.html"
    if p["path"] == "/":
        return "index.html" if lang == "it" else f"{lang}/index.html"
    slug = p["slug"]
    return f"pages/{slug}.html" if lang == "it" else f"{lang}/{slug}.html"


def href(lang, path):
    return lang_path(lang, path)


# -------------------- compositori di pagina --------------------
def main_home(m, lang, p):
    u = lambda path: href(lang, path)
    cards = [
        ("🎁", "card_aiuti", "/diritti-pa"),
        ("💶", "card_residuo", "/stima"),
        ("🧭", "card_isee", "/stima"),
        ("📄", "card_docs", "/checklist-dsu"),
        ("🏛️", "card_diritti", "/diritti-pa"),
        ("💡", "card_consigli", "/ottimizzazione"),
    ]
    grid = []
    for ico, k, path in cards:
        grid.append(
            f'<a class="service-card" href="{u(path)}">'
            f'<span class="ico" aria-hidden="true">{ico}</span>'
            f'<strong>{tv(m, "home."+k+"_title")}</strong>'
            f'<span class="muted">{tv(m, "home."+k+"_text")}</span>'
            f'<span class="cta-line">{tv(m, "home."+k+"_cta")}</span></a>'
        )
    steps = []
    for i in range(1, 4):
        steps.append(
            f'<div class="step-card"><span class="n" aria-hidden="true">{i}</span>'
            f'<div><strong>{tv(m, f"home.how{i}_title")}</strong>'
            f'<p class="muted" style="margin:0">{tv(m, f"home.how{i}_text")}</p></div></div>'
        )
    trusts = [
        ("✓", "trust_free"),
        ("📱", "trust_device"),
        ("📚", "trust_sources"),
        ("🗓️", "trust_updated"),
    ]
    tgrid = []
    for ico, k in trusts:
        body = tr(m, lang, f"home.{k}_text", date=tv(m, p["date_key"]))
        tgrid.append(
            f'<div class="trust-card"><span class="ico" aria-hidden="true">{ico}</span>'
            f'<strong>{tv(m, f"home.{k}_title")}</strong><p class="muted" style="margin:0">{body}</p></div>'
        )
    faqs_html = []
    for fk in p["faqs"]:
        qk, ak = FAQ_KEYS[fk]
        faqs_html.append(
            f'<details><summary>{tv(m, qk)}</summary><p>{tr(m, lang, ak)}</p></details>'
        )
    inst = tv(m, "install.cta")
    return f"""
      <div class="landing">
      <section class="landing-hero">
        <p class="kicker">{tv(m, "home.kicker")}</p>
        <h1>{tv(m, "home.h1")}</h1>
        <p class="lead">{tv(m, "home.lead")}</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="{u("/stima")}">{tv(m, "home.cta_primary")}</a>
          <button type="button" class="btn btn-ghost" data-install-cta>{inst}</button>
        </div>
        <p class="trust-line muted">{tv(m, "home.trust_line")}</p>
      </section>
      {disclaimer(m, lang)}
      {updated(m, lang, p)}
      <h2 class="section-head">{tv(m, "home.services_title")}</h2>
      <div class="service-grid">
        {''.join(grid)}
      </div>
      <h2 class="section-head">{tv(m, "home.how_title")}</h2>
      <div class="steps-3">
        {''.join(steps)}
      </div>
      <h2 class="section-head">{tv(m, "home.trust_title")}</h2>
      <div class="trust-grid">
        {''.join(tgrid)}
      </div>
      <section class="landing-faq" id="faq">
        <h2>{tv(m, "home.faq_title")}</h2>
        {''.join(faqs_html)}
      </section>
      <section class="landing-final">
        <h2>{tv(m, "home.final_title")}</h2>
        <p>{tv(m, "home.final_text")}</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="{u("/stima")}">{tv(m, "home.cta_primary")}</a>
          <button type="button" class="btn btn-ghost" data-install-cta>{inst}</button>
        </div>
        <p class="small">{tr(m, lang, "home.final_contact")}</p>
      </section>
      </div>
    """


def main_stima(m, lang, p):
    u = lambda path: href(lang, path)
    return f"""
      <section class="card hero">
        <h1>{tv(m, "seo.stima_h1")}</h1>
        <p>{tv(m, "wizard.stima_lead1")}</p>
        <p>{tv(m, "wizard.stima_lead2")}</p>
        <p>{tr(m, lang, "wizard.stima_lead3")}</p>
        <div class="btn-row"><a class="btn btn-primary" href="{u("/stima")}#wizard-start">{tv(m, "wizard.stima_start")}</a></div>
      </section>
      {disclaimer(m, lang)}
      {updated(m, lang, p)}
      <section class="card" id="wizard-start">
        <h2>{tv(m, "wizard.s1_title")}</h2>
        <p>{tv(m, "wizard.intro_js")}</p>
        <noscript><p>{tr(m, lang, "wizard.noscript")}</p></noscript>
      </section>
    """


def main_risultati(m, lang, p):
    u = lambda path: href(lang, path)
    return f"""
      <section class="card">
        <h1>{tv(m, "seo.risultati_empty_h1")}</h1>
        <p>{tv(m, "results.empty_p1")}</p>
        <p>{tr(m, lang, "results.empty_p2")}</p>
        <a class="btn btn-primary" href="{u("/stima")}">{tv(m, "results.empty_cta")}</a>
      </section>
      {disclaimer(m, lang)}
      {updated(m, lang, p)}
    """


def main_ott(m, lang, p):
    tips = "".join(f"<li>{tr(m, lang, k)}</li>" for k in ("ottimizzazione.t1","ottimizzazione.t2","ottimizzazione.t3","ottimizzazione.t4","ottimizzazione.t5","ottimizzazione.t6","ottimizzazione.t7"))
    corr = "".join(f"<li>{tr(m, lang, k)}</li>" for k in ("ottimizzazione.c1","ottimizzazione.c2","ottimizzazione.c3"))
    mai = "".join(f"<li>{tr(m, lang, k)}</li>" for k in ("ottimizzazione.n1","ottimizzazione.n2","ottimizzazione.n3"))
    return f"""
      <h1>{tv(m, "seo.ott_h1")}</h1>
      {disclaimer(m, lang)}
      {updated(m, lang, p)}
      <section class="card"><h2>{tv(m, "ottimizzazione.h2_due")}</h2>
        <p>{tr(m, lang, "ottimizzazione.p_due")}</p></section>
      <section class="card"><h2>{tv(m, "ottimizzazione.h2_scelte")}</h2>
        <ul class="tips">{tips}</ul></section>
      <section class="card"><h2>{tv(m, "ottimizzazione.h2_corrente")}</h2>
        <ul class="tips">{corr}</ul>
        <p>{tv(m, "ottimizzazione.c_note")}</p></section>
      <section class="card"><h2>{tv(m, "ottimizzazione.h2_mai")}</h2>
        <ul class="tips">{mai}</ul>
        <p class="small muted">{tv(m, "ottimizzazione.n_note")}</p></section>
      <p class="small">{tr(m, lang, "ottimizzazione.see_also")}</p>
    """


def main_docs(m, lang, p):
    base = "".join(f'<li><label><input type="checkbox" data-doc="{i}" disabled> <span>{tv(m, f"docs.d{i}")}</span></label></li>' for i in range(1, 13))
    corr = "".join(f'<li><label><input type="checkbox" data-doc="{i}" disabled> <span>{tv(m, f"docs.d{i}")}</span></label></li>' for i in range(13, 17))
    # checkbox enabled by JS; disabled in static so they don't appear interactive without JS
    return f"""
      <h1>{tv(m, "seo.chk_h1")}</h1>
      <p class="muted">{tv(m, "docs.intro")}</p>
      {updated(m, lang, p)}
      <section class="card"><h2>{tv(m, "docs.h2_all")}</h2><ul class="checklist">{base}</ul></section>
      <section class="card"><h2>{tv(m, "docs.h2_corrente")}</h2><ul class="checklist">{corr}</ul></section>
      <section class="card no-print">
        <p>{tr(m, lang, "docs.outro", portale=PORTALE_ISEE)}</p>
        <button type="button" class="btn btn-primary btn-block" data-action="print">{tv(m, "common.print_list")}</button>
      </section>
      {disclaimer(m, lang)}
    """


def main_diritti(m, lang, p):
    # Testo statico: stesse soglie ufficiali, importi formattati nella lingua della pagina
    e = lambda v, d=None: fmt_euro(v, lang, d)
    rows = [
        ("benefits.adi_nome", "benefits.adi_soglia", "benefits.adi_offerta", "adi", "common.verified", "benefits.adi_chi", {"amount": e(10140)}),
        ("benefits.auu_nome", "benefits.auu_soglia", "benefits.auu_offerta", "auu", "common.value_2026", None, {"min": e(17468.51, 2), "max": e(46582.71, 2)}),
        ("benefits.bonus_nome", "benefits.bonus_soglia", "benefits.bonus_offerta", "arera", "benefits.bonus_stato", None, {"isee": e(9796), "fam": e(20000)}),
        ("benefits.dedicata_nome", "benefits.dedicata_soglia", "benefits.dedicata_offerta", "dedicata", "common.verified", None, {"amount": e(15000)}),
        ("benefits.acquisti_nome", "benefits.acquisti_soglia", "benefits.acquisti_offerta", "cartaAcquisti", "benefits.acquisti_stato", None, {"amount": e(8230.81, 2)}),
        ("benefits.nido_nome", "benefits.nido_soglia", "benefits.nido_offerta", "nido", "common.value_2026", None, {"amount": e(40000)}),
        ("benefits.nuovinati_nome", "benefits.nuovinati_soglia", "benefits.nuovinati_offerta", "nuoviNati", "benefits.nuovinati_stato", None, {"amount": e(1000)}),
        ("benefits.affitto_nome", "benefits.affitto_soglia", "benefits.affitto_offerta", "venetoAffitti", "benefits.affitto_stato", None, {}),
    ]
    # AUU: in soglia min/max sono le soglie ISEE; in offerta sono gli importi mensili
    articles = []
    for nome, soglia, offerta, src, stato, chi, params in rows:
        extra = dict(params)
        if nome == "benefits.auu_nome":
            soglia_html = tv(m, soglia, min=e(17468.51, 2), max=e(46582.71, 2))
            offerta_html = tv(m, offerta, min=e(58.30, 2), max=e(203.80, 2))
        elif nome == "benefits.dedicata_nome":
            soglia_html = tv(m, soglia, amount=e(15000))
            offerta_html = tv(m, offerta, amount=e(500))
        elif nome == "benefits.nuovinati_nome":
            soglia_html = tv(m, soglia, amount=e(40000))
            offerta_html = tv(m, offerta, amount=e(1000))
        else:
            soglia_html = tv(m, soglia, **extra)
            offerta_html = tv(m, offerta, **extra)
        chi_html = f'<br><strong>{tv(m, "benefits.thing_who")}</strong> {tv(m, chi)}' if chi else ""
        src_title = tv(m, f"fonti.src_{src}")
        src_url = FONTE_URL[src]
        articles.append(
            f'<article class="benefit forse"><h3>{tv(m, nome)}</h3>'
            f'<span class="badge stato"><a href="{href(lang, "/fonti")}">{tv(m, stato)}</a></span>'
            f'<p class="small"><strong>{tv(m, "results.threshold")}</strong> {soglia_html}'
            f'<br><strong>{tv(m, "benefits.thing_offer")}</strong> {offerta_html}{chi_html}</p>'
            f'<a class="small" href="{src_url}" target="_blank" rel="noopener">{tv(m, "common.source", title=src_title)}</a></article>'
        )
    return f"""
      <h1>{tv(m, "seo.dir_h1")}</h1>
      {disclaimer(m, lang)}
      {updated(m, lang, p)}
      <p class="muted">{tr(m, lang, "diritti.intro")}</p>
      {''.join(articles)}
      <section class="card"><h2>{tv(m, "diritti.h2_auu")}</h2>
        <p>{tr(m, lang, "diritti.p_auu1")}</p>
        <p>{tr(m, lang, "diritti.p_auu2")}</p>
        <p><strong>{tv(m, "faq.quale_q")}</strong> {tr(m, lang, "faq.quale_a")}</p>
        <a class="btn btn-primary btn-block" href="{href(lang, "/stima")}">{tv(m, "diritti.cta_stima")}</a></section>
      <section class="card"><h2>{tv(m, "diritti.h2_manovra")}</h2>
        <p>{tr(m, lang, "diritti.p_manovra")}</p>
        <p class="small">{tr(m, lang, "diritti.manovra_fonte")}</p></section>
    """


def main_fonti(m, lang, p):
    norme = ["dpcm159", "inps102", "dsu2026", "portaleIsee"]
    aiuti = ["adi", "auu", "arera", "dedicata", "cartaAcquisti", "nido", "nuoviNati", "venetoAffitti"]
    def lis(keys):
        out = []
        for k in keys:
            out.append(f'<li><a href="{FONTE_URL[k]}" target="_blank" rel="noopener">{tv(m, "fonti.src_"+k)}</a></li>')
        return "<ul class=\"tips\">" + "".join(out) + "</ul>"
    return f"""
      <section class="card">
        <h1>{tv(m, "seo.fonti_h1")}</h1>
        <p>{tr(m, lang, "fonti.intro")}</p>
        {updated(m, lang, p)}
        <h2>{tv(m, "fonti.h2_norme")}</h2>
        {lis(norme)}
        <h2>{tv(m, "fonti.h2_aiuti")}</h2>
        {lis(aiuti)}
      </section>
      {disclaimer(m, lang)}
    """


def main_metodo(m, lang, p):
    return f"""
      <section class="card">
        <h1>{tv(m, "seo.metodo_h1")}</h1>
        <p>{tr(m, lang, "metodo.p1")}</p>
        <h2>{tv(m, "metodo.h2_come")}</h2>
        <p>{tr(m, lang, "metodo.p_come1")}</p>
        <p>{tr(m, lang, "metodo.p_come2")}</p>
        <h2>{tv(m, "metodo.h2_non")}</h2>
        <p>{tr(m, lang, "metodo.p_non")}</p>
        <h2>{tv(m, "metodo.h2_chi")}</h2>
        <p>{tr(m, lang, "metodo.p_chi")}</p>
        {updated(m, lang, p)}
      </section>
      {disclaimer(m, lang)}
    """


def main_contatti(m, lang, p):
    privacy = href(lang, "/privacy")
    return f"""
      <section class="card">
        <h1>{tv(m, "seo.contatti_h1")}</h1>
        <p>{tv(m, "contatti.intro")}</p>
        {updated(m, lang, p)}
        <div data-modulo-contatti data-privacy="{privacy}"></div>
      </section>
      {disclaimer(m, lang)}
    """


def main_privacy(m, lang, p):
    return f"""
      <section class="card">
        <h1>{tv(m, "seo.privacy_h1")}</h1>
        <p>{tr(m, lang, "privacy.p_titolare")}</p>
        <h2>{tv(m, "privacy.h2_local")}</h2>
        <p>{tr(m, lang, "privacy.p_local")}</p>
        <p>{tr(m, lang, "privacy.p_delete")}</p>
        <h2>{tv(m, "privacy.h2_form")}</h2>
        <p>{tr(m, lang, "privacy.p_form")}</p>
        <p>{tr(m, lang, "privacy.p_retention")}</p>
        {updated(m, lang, p)}
      </section>
      {disclaimer(m, lang)}
    """


def main_404(m, lang, p):
    return f"""
      <section class="card">
        <h1>{tv(m, "seo.notfound_h1")}</h1>
        <p>{tv(m, "notfound.p")}</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="{href(lang, "/stima")}">{tv(m, "notfound.cta_stima")}</a>
          <a class="btn btn-ghost" href="{href(lang, "/checklist-dsu")}">{tv(m, "notfound.cta_docs")}</a>
        </div>
        <p class="small"><a href="{href(lang, "/")}">{tv(m, "notfound.back_home")}</a></p>
      </section>
    """


COMPOSERS = {
    "": main_home, "stima": main_stima, "risultati": main_risultati, "consigli": main_ott,
    "documenti": main_docs, "diritti": main_diritti, "fonti": main_fonti, "metodo": main_metodo,
    "contatti": main_contatti, "privacy": main_privacy, "404": main_404,
}


def org():
    return {
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
            "availableLanguage": ["Italian", "English", "Bengali"],
        },
    }


def json_ld(m, lang, p, title, desc, url):
    website = {
        "@type": "WebSite",
        "@id": SITE_ID,
        "url": SITE + "/",
        "name": tv(m, "schema.website_name"),
        "alternateName": tv(m, "schema.website_alt"),
        "inLanguage": ["it-IT", "en", "bn"],
        "publisher": {"@id": ORG_ID},
    }
    graph = [org(), website]
    page_id = (url or SITE + "/404") + "#webpage"
    crumb_id = (url or SITE + "/404") + "#breadcrumb"
    webpage = {
        "@type": "WebPage",
        "@id": page_id,
        "name": title,
        "description": desc,
        "dateModified": p["date"],
        "inLanguage": LOCALE[lang] if lang == "it" else lang,
        "isPartOf": {"@id": SITE_ID},
        "author": {"@id": ORG_ID},
        "publisher": {"@id": ORG_ID},
        "breadcrumb": {"@id": crumb_id},
    }
    if url:
        webpage["url"] = url
    graph.append(webpage)
    items = []
    for i, (name_key, path) in enumerate(p["crumbs"], start=1):
        item = {"@type": "ListItem", "position": i, "name": tv(m, name_key), "item": page_url(lang, path, SITE)}
        items.append(item)
    graph.append({"@type": "BreadcrumbList", "@id": crumb_id, "itemListElement": items})
    if p.get("webapp"):
        graph.append({
            "@type": "WebApplication",
            "@id": APP_ID,
            "name": tv(m, "schema.webapp_name"),
            "alternateName": tv(m, "schema.website_alt"),
            "url": SITE + "/",
            "description": tv(m, "home.seo_desc"),
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Any",
            "inLanguage": ["it-IT", "en", "bn"],
            "isAccessibleForFree": True,
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
            "publisher": {"@id": ORG_ID},
            "image": SITE + "/og-image.png",
        })
    if p.get("faqs"):
        ents = []
        for fk in p["faqs"]:
            qk, ak = FAQ_KEYS[fk]
            ents.append({
                "@type": "Question",
                "name": tv(m, qk),
                "acceptedAnswer": {"@type": "Answer", "text": plain(tv(m, ak))},
            })
        graph.append({
            "@type": "FAQPage",
            "@id": (url or SITE) + "#faq",
            "inLanguage": LOCALE[lang] if lang == "it" else lang,
            "isPartOf": {"@id": page_id},
            "mainEntity": ents,
        })
    return {"@context": "https://schema.org", "@graph": graph}


def hreflang_links(p):
    if p["path"] is None:
        return ""
    lines = []
    for lang in LANGS:
        url = page_url(lang, p["path"], SITE)
        hreflang = "it" if lang == "it" else lang
        lines.append(f'<link rel="alternate" hreflang="{hreflang}" href="{url}">')
    lines.append(f'<link rel="alternate" hreflang="x-default" href="{page_url("it", p["path"], SITE)}">')
    return "\n".join(lines) + "\n"


def switcher_html(m, lang, p):
    items = []
    for L, key, short in (("it", "chrome.lang_it", "chrome.lang_it_short"),
                          ("en", "chrome.lang_en", "chrome.lang_en_short"),
                          ("bn", "chrome.lang_bn", "chrome.lang_bn_short")):
        path = p["path"] or "/"
        url = href(L, path)
        cur = ' aria-current="true"' if L == lang else ""
        items.append(f'<a href="{url}" lang="{L}" hreflang="{L}"{cur}>{tv(m, short)}</a>')
    return f'<nav class="lang-switch" aria-label="{tv(m, "chrome.lang_label")}">{"".join(items)}</nav>'


def footer_links(m, lang):
    pairs = [
        ("/fonti", "chrome.footer_fonti"),
        ("/metodo", "chrome.footer_metodo"),
        ("/diritti-pa", "chrome.footer_diritti"),
        ("/contatti", "chrome.footer_contatti"),
        ("/privacy", "chrome.footer_privacy"),
    ]
    parts = [f'<a href="{href(lang, path)}">{tv(m, key)}</a>' for path, key in pairs]
    inst = f'<button type="button" class="btn btn-ghost" id="install-footer" data-install-cta hidden>{tv(m, "chrome.footer_install")}</button>'
    return " · ".join(parts) + " · " + inst


def render_html(shell, m, lang, p, title, desc, main_html, url, jsonld):
    robots = f'<meta name="robots" content="{p["robots"]}">\n' if p.get("robots") else ""
    canonical = f'<link rel="canonical" href="{url}">\n' if url else ""
    html = shell
    repl = {
        "{{LANG}}": HTML_LANG[lang],
        "{{DIR}}": DIR_ATTR[lang],
        "{{LOCALE}}": LOCALE[lang] if lang == "it" else ("en" if lang == "en" else "bn"),
        "{{TITLE}}": title,
        "{{DESCRIPTION}}": desc.replace('"', "&quot;"),
        "{{ROBOTS}}": robots,
        "{{CANONICAL}}": canonical,
        "{{HREFLANG}}": hreflang_links(p),
        "{{URL}}": url or "",
        "{{JSON_LD}}": json.dumps(jsonld, ensure_ascii=False, indent=2),
        "{{VERSION}}": VERSION,
        "{{OG_SITE}}": tv(m, "brand.og_site_name"),
        "{{OG_ALT}}": tv(m, "brand.og_image_alt"),
        "{{APPLE_TITLE}}": tv(m, "brand.apple_title"),
        "{{BODY_CLASS}}": "page-home" if p["route"] == "" else "",
        "{{SKIP}}": tv(m, "chrome.skip"),
        "{{PTR_PULL}}": tv(m, "ptr.pull"),
        "{{BRAND_NAME}}": tv(m, "brand.name"),
        "{{TAGLINE}}": tv(m, "brand.tagline"),
        "{{HOME_HREF}}": href(lang, "/"),
        "{{SWITCHER}}": switcher_html(m, lang, p),
        "{{MAIN}}": main_html.rstrip() + "\n",
        "{{FOOTER_OWNER}}": tr(m, lang, "brand.footer_owner"),
        "{{FOOTER_LEGAL}}": tr(m, lang, "brand.footer_legal"),
        "{{FOOTER_LINKS}}": footer_links(m, lang),
        "{{FOOTER_CLEAR}}": tv(m, "chrome.footer_clear"),
        "{{NAV_LABEL}}": tv(m, "chrome.nav_label"),
        "{{NAV_HOME}}": tv(m, "chrome.nav_home"),
        "{{NAV_STIMA}}": tv(m, "chrome.nav_stima"),
        "{{NAV_RISULTATI}}": tv(m, "chrome.nav_risultati"),
        "{{NAV_CONSIGLI}}": tv(m, "chrome.nav_consigli"),
        "{{NAV_DOCUMENTI}}": tv(m, "chrome.nav_documenti"),
        "{{HREF_HOME}}": href(lang, "/"),
        "{{HREF_STIMA}}": href(lang, "/stima"),
        "{{HREF_RISULTATI}}": href(lang, "/risultati"),
        "{{HREF_CONSIGLI}}": href(lang, "/ottimizzazione"),
        "{{HREF_DOCUMENTI}}": href(lang, "/checklist-dsu"),
        "{{UPDATE_MSG}}": tv(m, "update.message"),
        "{{UPDATE_APPLY}}": tv(m, "update.apply"),
        "{{UPDATE_LATER}}": tv(m, "update.later"),
        "{{INSTALL_CTA}}": tv(m, "install.cta"),
    }
    for k, v in repl.items():
        html = html.replace(k, v)
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


def write_messages(catalogs):
    out = {lang: t_map(flat) for lang, flat in catalogs.items()}
    text = "/* generato da scripts/build-pages.py — non modificare a mano */\n"
    text += "window.DC_MSG = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n"
    (ROOT / "js" / "messages.js").write_text(text, encoding="utf-8")


def write_pages_data(built):
    # built: list of dicts with lang, route, payload
    out = {lang: {} for lang in LANGS}
    for b in built:
        out[b["lang"]][b["key"]] = b["payload"]
    text = "/* generato da scripts/build-pages.py — non modificare a mano */\n"
    text += "window.DC_PAGES = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n"
    (ROOT / "js" / "pages-data.js").write_text(text, encoding="utf-8")


def write_sitemap(built):
    # xhtml alternates
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ]
    # group by path
    by_path = {}
    for b in built:
        if not b["sitemap"]:
            continue
        by_path.setdefault(b["it_path"], []).append(b)
    for it_path in by_path:
        for b in by_path[it_path]:
            lines.append(f'  <url>')
            lines.append(f'    <loc>{b["url"]}</loc>')
            lines.append(f'    <lastmod>{b["date"]}</lastmod>')
            # alternates for this path
            alts = by_path[it_path]
            for a in alts:
                hl = "it" if a["lang"] == "it" else a["lang"]
                lines.append(f'    <xhtml:link rel="alternate" hreflang="{hl}" href="{a["url"]}"/>')
            it_url = next(a["url"] for a in alts if a["lang"] == "it")
            lines.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{it_url}"/>')
            lines.append(f'  </url>')
    lines.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    shell = (ROOT / "templates" / "shell.html").read_text(encoding="utf-8")
    catalogs = {lang: load_catalog(lang) for lang in LANGS}
    maps = {lang: t_map(catalogs[lang]) for lang in LANGS}
    errors = []
    built = []
    (ROOT / "pages").mkdir(exist_ok=True)
    for lang in LANGS:
        (ROOT / lang).mkdir(exist_ok=True)
        m = maps[lang]
        for p in PAGE_DEFS:
            dest = ROOT / file_for(lang, p)
            dest.parent.mkdir(parents=True, exist_ok=True)
            title = tv(m, p["title_key"])
            desc = tv(m, p["desc_key"])
            h1 = tv(m, p["h1_key"])
            main_html = COMPOSERS[p["route"]](m, lang, p)
            url = page_url(lang, p["path"], SITE) if p["path"] is not None else ""
            jld = json_ld(m, lang, p, title, desc, url or None)
            html = render_html(shell, m, lang, p, title, desc, main_html, url, jld)
            dest.write_text(html, encoding="utf-8")
            n = len(desc)
            if p["route"] != "404" and not (120 <= n <= 160):
                errors.append(f"desc {lang} {p['path']}: {n} caratteri (attesi ~150)")
            if lang == "it" and p["path"] == "/stima":
                w = words(main_html)
                if not (150 <= w <= 320):
                    errors.append(f"/stima parole in main: {w} (attese 150-300)")
            print(f"  {dest.relative_to(ROOT)}: title={len(title)}c desc={len(desc)}c words≈{words(main_html)}")
            built.append({
                "lang": lang,
                "key": "404" if p["route"] == "404" else p["route"],
                "sitemap": bool(p.get("sitemap")),
                "date": p["date"],
                "it_path": p["path"],
                "url": url,
                "payload": {
                    "title": title,
                    "desc": desc,
                    "url": url,
                    "robots": p.get("robots"),
                    "dateModified": p["date"],
                    "dateLabel": tv(m, p["date_key"]),
                    "showSources": p["sources"],
                    "h1": h1,
                    "jsonLdText": json.dumps(jld, ensure_ascii=False, indent=2),
                    "main": main_html,
                },
            })

    write_messages(catalogs)
    write_pages_data(built)
    write_version()
    stamp_sw()
    write_sitemap(built)

    # interdizione «semplice» da sola nei file generati
    htmls = list((ROOT / "pages").glob("*.html")) + [ROOT / "index.html", ROOT / "404.html"]
    for lang in ("en", "bn"):
        htmls += list((ROOT / lang).glob("*.html"))
    for f in htmls:
        if not f.exists():
            continue
        txt = f.read_text(encoding="utf-8")
        if re.search(r"\bsemplice\b(?! da utilizzare)", txt, re.I):
            errors.append(f"{f.relative_to(ROOT)}: contiene 'semplice'")
    if errors:
        print("ERRORI:")
        for e in errors:
            print(" -", e)
        sys.exit(1)
    print("OK, pagine generate (v%s) per lingue %s" % (VERSION, ",".join(LANGS)))


if __name__ == "__main__":
    main()
