#!/usr/bin/env python3
"""Utilità per i cataloghi i18n di DirittiOk (it.json / en.json / bn.json)."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
I18N_DIR = ROOT / "i18n"
LANGS = ("it", "en", "bn")
DEFAULT_LANG = "it"
LOCALE = {"it": "it-IT", "en": "en", "bn": "bn"}
HTML_LANG = {"it": "it", "en": "en", "bn": "bn"}
DIR_ATTR = {"it": "ltr", "en": "ltr", "bn": "ltr"}
LANG_PREFIX = {"it": "", "en": "/en", "bn": "/bn"}

# Rotte note (route interna → slug URL)
SLUG_BY_ROUTE = {
    "": "",
    "stima": "stima",
    "risultati": "risultati",
    "consigli": "ottimizzazione",
    "documenti": "checklist-dsu",
    "diritti": "diritti-pa",
    "fonti": "fonti",
    "metodo": "metodo",
    "contatti": "contatti",
    "privacy": "privacy",
    "404": "404",
}
ROUTE_BY_SLUG = {v: k for k, v in SLUG_BY_ROUTE.items()}


def flatten(obj, prefix=""):
    """Ritorna dict chiave.punti → {value, note?} da un albero nidificato."""
    out = {}
    if isinstance(obj, dict) and "value" in obj and not any(
        isinstance(v, dict) and "value" in v for v in obj.values() if isinstance(v, dict)
    ):
        # è una foglia {value, note?}
        if prefix:
            out[prefix] = obj
        return out
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.startswith("$"):
                continue
            key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                out.update(flatten(v, key))
            else:
                out[key] = {"value": v}
    return out


def load_catalog(lang: str) -> dict:
    path = I18N_DIR / f"{lang}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    return flatten(data)


def t_map(flat: dict) -> dict:
    return {k: (v["value"] if isinstance(v, dict) else v) for k, v in flat.items()}


def fill(template: str, **params) -> str:
    def repl(m):
        k = m.group(1)
        if k in params:
            return str(params[k])
        return m.group(0)
    return re.sub(r"\{([a-zA-Z0-9_]+)\}", repl, template)


_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
_BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")


def lang_path(lang: str, path: str) -> str:
    """Prefissa /en o /bn a un path interno che inizia con / (non http/mailto/#)."""
    if not path or path.startswith(("http://", "https://", "mailto:", "tel:", "#")):
        return path
    if not path.startswith("/"):
        return path
    prefix = LANG_PREFIX[lang]
    if path == "/":
        return prefix or "/"
    # già prefissato
    if path == prefix or path.startswith(prefix + "/"):
        return path
    return prefix + path


def rich(text: str, lang: str = "it", **params) -> str:
    """Sostituisce {var}, [testo](/path) e **grassetto**. I path interni prendono il prefisso lingua."""
    s = fill(text, **params)
    def link(m):
        label, href = m.group(1), m.group(2)
        href = lang_path(lang, href)
        extra = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
        return f'<a href="{href}"{extra}>{label}</a>'
    s = _LINK_RE.sub(link, s)
    s = _BOLD_RE.sub(r"<strong>\1</strong>", s)
    return s


def page_url(lang: str, path: str, site="https://dirittiok.com") -> str:
    p = lang_path(lang, path)
    if p == "/":
        return site + "/"
    return site + p


def count_leaves(flat: dict) -> int:
    return len(flat)


def number_locale(lang: str) -> str:
    """IT usa 7.000 / 0,5; EN e BN (cifre latine) usano 7,000 / 0.5."""
    return "it" if lang == "it" else "en"


def fmt_grouped(value, lang: str = "it", dec=None) -> str:
    """Formatta un numero con i separatori della lingua, sempre con cifre latine 0-9."""
    loc = number_locale(lang)
    try:
        v = float(value)
    except (TypeError, ValueError):
        v = 0.0
    if dec is None:
        dec = 0 if float(v).is_integer() else 2
    sign = "−" if v < 0 else ""
    body = f"{abs(v):.{int(dec)}f}"
    intp, _, frac = body.partition(".")
    if loc == "it":
        grouped = re.sub(r"\B(?=(\d{3})+(?!\d))", ".", intp)
        return sign + grouped + (("," + frac) if dec else "")
    grouped = re.sub(r"\B(?=(\d{3})+(?!\d))", ",", intp)
    return sign + grouped + (("." + frac) if dec else "")


def fmt_euro(value, lang: str = "it", dec=None) -> str:
    return fmt_grouped(value, lang, dec) + " €"


def fmt_dec(value, lang: str = "it") -> str:
    """Scala e decimali senza zeri finali (0,5 / 0.5, 1,57 / 1.57)."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        v = 0.0
    s = f"{abs(v):.4f}".rstrip("0").rstrip(".")
    if "." in s:
        intp, frac = s.split(".", 1)
        dec = len(frac)
        raw = fmt_grouped(v, lang, dec)
        # fmt_grouped already applied sign and separators
        return raw
    return fmt_grouped(v, lang, 0)
