#!/usr/bin/env python3
"""Generate the "Novità verificate" feed (novita.json) for FarmacoFlash.

Fetches official items (EMA, AIFA, FDA, PubMed guidelines), links them to study
cards by drug-name matching and merges them with the previously deployed feed.
It only READS build/drugs.json, build/drugs-extra.json, build/brands.json and
build/cards.json: study content is never modified.

Usage: python3 build/novita.py --out novita.json [--prev PATH|URL] [--days 365] [--max 150]
Standard library only (runs nightly in GitHub Actions).
"""
from __future__ import annotations

import argparse
import datetime as dt
import email.utils
import hashlib
import html
import json
import logging
import os
import re
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Sequence, Set, Tuple

LOG = logging.getLogger("novita")
HERE = os.path.dirname(os.path.abspath(__file__))
USER_AGENT = "farmacoflash-novita/1.0 (+https://mutablewarp.github.io/farmacoflash/)"
TIMEOUT_S = 20
MAX_BYTES = 8 * 1024 * 1024  # EMA news JSON is ~2.3 MB
FETCH_HOSTS = frozenset({"www.ema.europa.eu", "www.aifa.gov.it", "www.fda.gov", "eutils.ncbi.nlm.nih.gov"})
PREV_HOSTS = frozenset({"mutablewarp.github.io", "raw.githubusercontent.com"})
LINK_HOSTS = frozenset({"www.ema.europa.eu", "www.aifa.gov.it", "www.fda.gov", "pubmed.ncbi.nlm.nih.gov"})
SOURCE_IDS = ("ema", "aifa", "fda", "pubmed")
KINDS = frozenset({"sicurezza", "linea-guida", "scheda", "notizia"})
SUMMARY_MAX = 280
TITLE_MAX = 300
PUBMED_DAYS = 60
PUBMED_MAX = 30
SOFT_ERRORS = (urllib.error.URLError, OSError, ValueError, KeyError, TypeError, AttributeError, ET.ParseError)

Fetcher = Callable[..., bytes]  # fetch(url, allowed=..., attempts=...) or a test double

# ---------------------------------------------------------------- network ---


class _AllowlistRedirect(urllib.request.HTTPRedirectHandler):
    """Follow redirects only to https URLs on the allowlist."""

    def __init__(self, allowed: frozenset) -> None:
        super().__init__()
        self.allowed = allowed

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[override]
        check_url(newurl, self.allowed)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def check_url(url: str, allowed: frozenset) -> None:
    """Raise ValueError unless url is https on an allowlisted host."""
    parts = urllib.parse.urlsplit(url)
    if parts.scheme != "https" or (parts.hostname or "").lower() not in allowed:
        raise ValueError(f"URL not allowed: {url[:120]}")


def fetch(url: str, allowed: frozenset = FETCH_HOSTS, attempts: int = 3) -> bytes:
    """GET url with allowlist, UA, per-read timeout, total deadline, size cap, retries."""
    check_url(url, allowed)
    opener = urllib.request.build_opener(_AllowlistRedirect(allowed))
    last: Optional[Exception] = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
            deadline = time.monotonic() + 3 * TIMEOUT_S
            with opener.open(req, timeout=TIMEOUT_S) as resp:
                chunks: List[bytes] = []
                size = 0
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > MAX_BYTES:
                        raise ValueError(f"response larger than {MAX_BYTES} bytes")
                    if time.monotonic() > deadline:
                        raise TimeoutError("download deadline exceeded")
                    chunks.append(chunk)
            return b"".join(chunks)
        except urllib.error.HTTPError as exc:
            last = exc
            if exc.code < 500:
                break
        except (urllib.error.URLError, OSError) as exc:
            last = exc
        if attempt + 1 < attempts:
            time.sleep(2 * (attempt + 1))
    assert last is not None
    raise last

# ------------------------------------------------------------- text utils ---


_TAG_RE = re.compile(r"<(?:[a-zA-Z/!?][^>]*)>")
_CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_text(value: object, limit: Optional[int] = None) -> str:
    """Strip HTML tags, unescape entities (also double-escaped), collapse spaces, truncate."""
    if value is None:
        return ""
    text = str(value)
    for _ in range(2):
        text = _TAG_RE.sub(" ", html.unescape(text))
    text = _CTRL_RE.sub("", text).replace(" ", " ")
    text = re.sub(r"\s+", " ", text).strip()
    if limit and len(text) > limit:
        cut = text[: limit - 1]
        if " " in cut[limit // 2:]:
            cut = cut.rsplit(" ", 1)[0]
        text = cut.rstrip(" ,;:.-–") + "…"
    return text


def safe_link(url: object, base: Optional[str] = None) -> Optional[str]:
    """Return a normalized https URL on an official host, or None."""
    if not isinstance(url, str) or not url.strip():
        return None
    raw = html.unescape(url.strip())
    if base:
        raw = urllib.parse.urljoin(base, raw)
    try:
        parts = urllib.parse.urlsplit(raw)
        host, port = (parts.hostname or "").lower(), parts.port
    except ValueError:
        return None
    if parts.scheme not in ("http", "https") or host not in LINK_HOSTS or port not in (None, 443, 80):
        return None
    return urllib.parse.urlunsplit(("https", host, parts.path or "/", parts.query, ""))


def item_id(url: str) -> str:
    """Stable id: first 12 hex chars of sha1(url)."""
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]


def parse_date(text: object, fmt: str) -> Optional[dt.date]:
    """Parse text with strptime fmt, 'rfc822' or 'java'; None on failure."""
    if not isinstance(text, str) or not text.strip():
        return None
    s = text.strip()
    try:
        if fmt == "rfc822":
            return email.utils.parsedate_to_datetime(s).date()
        if fmt == "java":  # e.g. "Thu Oct 08 00:00:00 CEST 2026"
            m = re.match(r"^\w{3} (\w{3}) (\d{1,2}) [\d:]{8} \w+ (\d{4})$", s)
            return dt.datetime.strptime(" ".join(m.groups()), "%b %d %Y").date() if m else None
        return dt.datetime.strptime(s, fmt).date()
    except (ValueError, TypeError, IndexError):
        return None


def make_item(source: str, kind: str, title: object, summary: object, url: object,
              date: Optional[dt.date], lang: str, today: dt.date, base: Optional[str] = None) -> Optional[dict]:
    """Build a sanitized item (schema of novita.json) or None if invalid."""
    link = safe_link(url, base)
    clean_title = clean_text(title, TITLE_MAX)
    if not link or not clean_title or date is None:
        return None
    date = min(date, today)  # some feeds pre-date future issues; never show future dates
    return {"id": item_id(link), "source": source, "kind": kind, "title": clean_title,
            "summary": clean_text(summary, SUMMARY_MAX), "url": link, "date": date.isoformat(),
            "lang": lang, "drugs": [], "cards": [], "decks": []}


def _reject_dtd(data: bytes) -> None:
    head = data[:4096].lower()
    if b"<!doctype" in head or b"<!entity" in head:
        raise ValueError("XML with DTD/entities refused")

# ---------------------------------------------------------------- parsers ---


def _split(value: object) -> List[str]:
    return [p.strip() for p in str(value or "").split(";") if p.strip()]


def parse_ema_dhpc(data: bytes, today: dt.date) -> List[dict]:
    """EMA 'DHPC' JSON data file -> safety items (human medicines only)."""
    out = []
    for row in json.loads(data.decode("utf-8"))["data"]:
        if row.get("category") != "Human":
            continue
        name = clean_text(row.get("name_of_medicine"))
        subs = ", ".join(_split(row.get("active_substances")))
        title = f"DHPC: {name}" + (f" ({subs})" if subs and subs.lower() != name.lower() else "")
        types = ", ".join(_split(row.get("dhpc_type")))
        area = ", ".join(_split(row.get("therapeutic_area_mesh")))
        summary = "Direct healthcare professional communication" + (f" ({types})" if types else "")
        summary += f". Therapeutic area: {area}." if area else "."
        date = parse_date(row.get("first_published_date"), "%d/%m/%Y") or \
            parse_date(row.get("dissemination_date"), "%d/%m/%Y")
        item = make_item("ema", "sicurezza", title, summary, row.get("dhpc_url"), date, "en", today)
        if item:
            out.append(item)
    return out


_EMA_SKIP_TOPICS = {"Speech", "Corporate", "Governance"}


def parse_ema_news(data: bytes, today: dt.date) -> List[dict]:
    """EMA 'news' JSON data file -> human-medicine news; PRAC/referrals marked as safety."""
    out = []
    for row in json.loads(data.decode("utf-8"))["data"]:
        if "Human" not in _split(row.get("categories")):
            continue
        topics = set(_split(row.get("topics")))
        if topics and topics <= _EMA_SKIP_TOPICS:
            continue
        kind = "sicurezza" if topics & {"Pharmacovigilance", "Referrals"} else "notizia"
        summary = clean_text(row.get("news_summary"))
        related = ", ".join(_split(row.get("related_medicine_referral")))
        if related:
            summary = (summary.rstrip(".") + ". " if summary else "") + f"Related: {related}."
        date = parse_date(row.get("first_published_date"), "%d/%m/%Y")
        item = make_item("ema", kind, row.get("title"), summary, row.get("news_url"), date, "en", today)
        if item:
            out.append(item)
    return out


def parse_aifa_listing(text: str, today: dt.date) -> List[dict]:
    """AIFA server-rendered search listing ('card smooth' blocks) -> safety items (Italian)."""
    out = []
    for block in text.split('<div class="card smooth">')[1:]:
        link = re.search(r'<a\s+href="([^"]+)"\s+class="asset-link"[^>]*>(.*?)</a>', block, re.S)
        if not link:
            continue
        summ = re.search(r"</h3>\s*<p>(.*?)</p>", block, re.S)
        when = re.search(r"fa-calendar-alt[^>]*></i>\s*([^<]+?)\s*<", block)
        item = make_item("aifa", "sicurezza", link.group(2), summ.group(1) if summ else "", link.group(1),
                         parse_date(when.group(1) if when else None, "java"), "it", today,
                         base="https://www.aifa.gov.it/")
        if item:
            out.append(item)
    return out


def parse_fda_medwatch(data: bytes, today: dt.date) -> List[dict]:
    """FDA MedWatch RSS -> safety items. Device alerts are dropped; generic recalls
    (outside /drugs/) are kept only if they match a drug of the course (_require_match)."""
    _reject_dtd(data)
    out = []
    for node in ET.fromstring(data).iter("item"):
        link = safe_link(node.findtext("link"))
        if not link:
            continue
        path = urllib.parse.urlsplit(link).path
        if path.startswith(("/medical-devices/", "/food/", "/animal-veterinary/", "/cosmetics/", "/tobacco-products/")):
            continue
        item = make_item("fda", "sicurezza", node.findtext("title"), node.findtext("description"), link,
                         parse_date(node.findtext("pubDate"), "rfc822"), "en", today)
        if item:
            if not path.startswith("/drugs/"):
                item["_require_match"] = True
            out.append(item)
    return out


_DSC_ROW = re.compile(r'<tr>\s*<td>\s*(\d{1,2}-\d{1,2}-\d{4})\s*</td>\s*<td>\s*<a\s[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.S)


def parse_fda_dsc(text: str, today: dt.date) -> List[dict]:
    """Official FDA 'Drug Safety Communications' page: dated table (M-D-YYYY | title link)."""
    out = []
    for date_s, href, title in _DSC_ROW.findall(text):
        item = make_item("fda", "sicurezza", title, "FDA Drug Safety Communication.", href,
                         parse_date(date_s, "%m-%d-%Y"), "en", today, base="https://www.fda.gov/")
        if item:
            out.append(item)
    return out


PUBMED_TOPICS = (
    "hypertension", '"heart failure"', '"atrial fibrillation"', "anticoagula*", "dyslipid*", "hypercholesterol*",
    "diabetes", "asthma", "COPD", '"chronic obstructive pulmonary"', "epilep*", "depress*", '"bipolar disorder"',
    "schizophreni*", "parkinson*", "alzheimer*", '"multiple sclerosis"', "migraine", "opioid*", '"chronic pain"',
    '"pain management"', "osteoporosis", '"peptic ulcer"', '"gastroesophageal reflux"', '"Helicobacter pylori"',
    '"rheumatoid arthritis"', '"antimicrobial resistance"', "antibiotic*", "antimicrobial*", '"targeted therapy"',
    '"kinase inhibitor*"', '"checkpoint inhibitor*"')
_PM_GUIDE = ('"practice guideline"[pt] OR guideline[pt] OR "guidelines for"[ti] OR "guideline for"[ti] OR '
             '"guidelines on"[ti] OR "guideline on"[ti] OR "practice guideline"[ti] OR "practice guidelines"[ti] OR '
             '"consensus statement"[ti] OR "ESC guidelines"[ti]')
PUBMED_TERM = (f"({_PM_GUIDE}) AND ({' OR '.join(t + '[ti]' for t in PUBMED_TOPICS)}) AND "
               "(english[la] OR italian[la]) NOT (\"published erratum\"[pt] OR comment[pt] OR letter[pt] OR "
               "editorial[pt] OR news[pt])")
_PM_KEEP_TYPES = {"Practice Guideline", "Guideline", "Consensus Statement"}
_PM_DROP_TYPES = {"Published Erratum", "Comment", "Letter", "Editorial", "News", "Retracted Publication",
                  "Systematic Review", "Meta-Analysis", "Observational Study", "Case Reports", "Comparative Study"}
_PM_NOISE = re.compile(r"\b(adheren|complian|concordan|uptake|implication|impact|trend|pattern|eligib|prevalen|"
                       r"comparison|differences|retrospective|chatgpt|chatbot|commentary|summary for non|making a case|"
                       r"contextuali|evidence base for|implementation of|following|real[- ]world|survey|cohort|"
                       r"systematic review|current state|summit|in reply|reply to)", re.I)
_PM_DOC = re.compile(r"\b(guidelines?|guidance|consensus|recommendations?|position (?:statement|paper))\b", re.I)


def parse_pubmed_esearch(data: bytes) -> List[str]:
    """esearch JSON -> list of numeric PMIDs."""
    ids = json.loads(data.decode("utf-8"))["esearchresult"]["idlist"]
    return [i for i in ids if isinstance(i, str) and i.isdigit()]


def parse_pubmed_esummary(data: bytes, today: dt.date) -> List[dict]:
    """esummary JSON -> guideline items; drops studies *about* guidelines (adherence, trends...)."""
    res = json.loads(data.decode("utf-8"))["result"]
    out = []
    for uid in res.get("uids", []):
        doc = res.get(uid) or {}
        title, types = clean_text(doc.get("title")), set(doc.get("pubtype") or [])
        if not uid.isdigit() or not title or types & _PM_DROP_TYPES or _PM_NOISE.search(title):
            continue
        if not (types & _PM_KEEP_TYPES or _PM_DOC.search(title)):
            continue
        hist = {h.get("pubstatus"): h.get("date", "") for h in doc.get("history") or []}
        date = parse_date((hist.get("entrez") or "")[:10], "%Y/%m/%d") or \
            parse_date((doc.get("sortpubdate") or "")[:10], "%Y/%m/%d")
        authors = doc.get("authors") or []
        first = clean_text(authors[0].get("name")) if authors and isinstance(authors[0], dict) else ""
        label = ", ".join(t for t in doc.get("pubtype") or [] if t != "Journal Article")
        summary = f"{clean_text(doc.get('source'))}, {clean_text(doc.get('pubdate'))}."
        summary += f" {first} et al." if first else ""
        summary += f" {label}." if label else ""
        item = make_item("pubmed", "linea-guida", title, summary, f"https://pubmed.ncbi.nlm.nih.gov/{uid}/",
                         date, "en", today)
        if item:
            out.append(item)
    return out[:PUBMED_MAX]

# ---------------------------------------------------------------- sources ---


EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
EMA_DATA = "https://www.ema.europa.eu/en/documents/report/"
AIFA_SEARCH = "https://www.aifa.gov.it/ricerca-aifa?searchKeywords=&structures=93604&adtCategories="
AIFA_CATEGORIES = (("NIIS", "1960204"), ("AIFA/EMA", "1960205"), ("PRAC", "1960203"))


def run_pubmed(get: Fetcher, today: dt.date) -> List[dict]:
    """esearch (last ~60 days, guideline filters) then esummary; <= 3 req/s, no API key."""
    common = {"db": "pubmed", "retmode": "json", "tool": "farmacoflash"}
    query = dict(common, term=PUBMED_TERM, retmax="60", sort="pub_date", datetype="edat", reldate=str(PUBMED_DAYS))
    ids = parse_pubmed_esearch(get(EUTILS + "esearch.fcgi?" + urllib.parse.urlencode(query)))
    if not ids:
        return []
    time.sleep(0.4)
    summ = dict(common, id=",".join(ids))
    return parse_pubmed_esummary(get(EUTILS + "esummary.fcgi?" + urllib.parse.urlencode(summ)), today)


def _aifa_feed(cat: str) -> Callable[[Fetcher, dt.date], List[dict]]:
    def run(get: Fetcher, today: dt.date) -> List[dict]:
        time.sleep(1.0)  # polite spacing; the AIFA host intermittently hangs, hence the extra attempt
        return parse_aifa_listing(get(AIFA_SEARCH + cat, attempts=4).decode("utf-8", "replace"), today)
    return run


@dataclass(frozen=True)
class Source:
    """One official source: output id/name/url plus its feeds (name, runner)."""

    id: str
    name: str
    url: str
    feeds: Tuple[Tuple[str, Callable[[Fetcher, dt.date], List[dict]]], ...]


SOURCES: Tuple[Source, ...] = (
    Source("ema", "EMA", "https://www.ema.europa.eu/en/news", (
        ("dhpc", lambda g, t: parse_ema_dhpc(g(EMA_DATA + "dhpc-output-json-report_en.json"), t)),
        ("news", lambda g, t: parse_ema_news(g(EMA_DATA + "news-json-report_en.json"), t)))),
    Source("aifa", "AIFA", "https://www.aifa.gov.it/comunicazioni-di-sicurezza",
           tuple((name, _aifa_feed(cat)) for name, cat in AIFA_CATEGORIES)),
    Source("fda", "FDA", "https://www.fda.gov/drugs/drug-safety-and-availability/drug-safety-communications", (
        ("dsc", lambda g, t: parse_fda_dsc(g(
            "https://www.fda.gov/drugs/drug-safety-and-availability/drug-safety-communications"
        ).decode("utf-8", "replace"), t)),
        ("medwatch", lambda g, t: parse_fda_medwatch(g(
            "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml"), t)))),
    Source("pubmed", "PubMed (linee guida)", "https://pubmed.ncbi.nlm.nih.gov/", (("guidelines", run_pubmed),)),
)

# --------------------------------------------------------------- matching ---

# Surface form (lowercase) in drugs.json/brands.json -> canonical Italian display name.
CANON = {"aspirina": "acido acetilsalicilico", "asa": "acido acetilsalicilico", "toradol": "ketorolac",
         "aulin": "nimesulide", "fentanyl": "fentanil", "l-dopa": "levodopa", "metotressato": "metotrexate",
         "methotrexate": "metotrexate", "perfloxacina": "pefloxacina", "acido valproico": "valproato",
         "valproato sodico": "valproato", "penicillina g": "benzilpenicillina",
         "penicillina v": "fenossimetilpenicillina", "dalfampridina": "fampridina",
         "beclometasone dipropionato": "beclometasone", "hctz": "idroclorotiazide",
         "metilprednisone": "metilprednisolone", "gabapentin": "gabapentina"}
EXCLUDED = {"calcio", "potassio", "asa"}  # generic words / ambiguous acronyms (AHA/ASA guidelines)
SHORT_EXACT = {"HCTZ"}  # tokens < 5 chars allowed only as exact, case-sensitive tokens
BRAND_STOP = {"moment", "control", "frontal", "compendium", "antra", "oki", "ms", "contin"}
SALT_WORDS = {"acetato", "succinato", "sodico", "dipropionato", "bromuro", "pegol", "proxetil"}
# Irregular English (or alternative) names that suffix rules cannot derive.
ALIASES: Dict[str, Tuple[str, ...]] = {
    "paracetamolo": ("acetaminophen", "paracetamol"),
    "valproato": ("valproate", "valproic acid", "divalproex", "sodium valproate"),
    "eparina": ("heparin", "heparins"), "insulina": ("insulin", "insulins"), "litio": ("lithium",),
    "acido acetilsalicilico": ("acetylsalicylic acid", "aspirin"), "metotrexate": ("methotrexate",),
    "fenitoina": ("phenytoin",), "desametasone": ("dexamethasone",), "betametasone": ("betamethasone",),
    "beclometasone": ("beclomethasone",), "aloperidolo": ("haloperidol",), "idrossizina": ("hydroxyzine",),
    "idroclorotiazide": ("hydrochlorothiazide", "idroclorotiazide"), "claritromicina": ("clarithromycin",),
    "azitromicina": ("azithromycin",), "eritromicina": ("erythromycin",), "teofillina": ("theophylline",),
    "aminofillina": ("aminophylline",), "clorfeniramina": ("chlorpheniramine", "chlorphenamine"),
    "difenidramina": ("diphenhydramine",), "prometazina": ("promethazine",), "flufenazina": ("fluphenazine",),
    "perfenazina": ("perphenazine",), "azatioprina": ("azathioprine",),
    "6-mercaptopurina": ("mercaptopurine",), "ciclofosfamide": ("cyclophosphamide",),
    "cloramfenicolo": ("chloramphenicol",), "sulfametossazolo": ("sulfamethoxazole", "co-trimoxazole"),
    "trimetoprim": ("trimethoprim", "co-trimoxazole"), "etambutolo": ("ethambutol",),
    "pirazinamide": ("pyrazinamide",), "rifampicina": ("rifampicin", "rifampin"), "ossicodone": ("oxycodone",),
    "fentanil": ("fentanyl",), "alotano": ("halothane",), "protossido d'azoto": ("nitrous oxide",),
    "nitroglicerina": ("nitroglycerin", "glyceryl trinitrate"), "nitroprussiato": ("nitroprusside",),
    "chinidina": ("quinidine",), "disopiramide": ("disopyramide",),
    "colestiramina": ("cholestyramine", "colestyramine"), "acido nicotinico": ("niacin",),
    "acido etacrinico": ("ethacrynic acid",), "acido clavulanico": ("clavulanate",),
    "glibenclamide": ("glyburide",), "salbutamolo": ("albuterol",), "mesalazina": ("mesalamine",),
    "lattulosio": ("lactulose",), "bismuto": ("bismuth",), "olio di ricino": ("castor oil",),
    "cromoglicato di sodio": ("cromoglicate", "cromolyn", "sodium cromoglycate"),
    "glicopirronio bromuro": ("glycopyrronium", "glycopyrrolate"), "17-β estradiolo": ("estradiol",),
    "interferone-β": ("interferon beta",), "dimetilfumarato": ("dimethyl fumarate",),
    "diidroergotamina": ("dihydroergotamine",), "etosuccimide": ("ethosuximide",),
    "scopolamina": ("scopolamine", "hyoscine"), "piridossina": ("pyridoxine",),
    "doxilamina succinato": ("doxylamine",), "sulfadiazina argentica": ("silver sulfadiazine",),
    "vitamina D": ("vitamin d", "cholecalciferol", "colecalciferol"),
    "benzilpenicillina": ("benzylpenicillin", "penicillin g"),
    "fenossimetilpenicillina": ("phenoxymethylpenicillin", "penicillin v"), "torasemide": ("torsemide",),
    "ossitetraciclina": ("oxytetracycline",), "doxiciclina": ("doxycycline",), "minociclina": ("minocycline",),
    "tetraciclina": ("tetracycline",), "demeclociclina": ("demeclocycline",), "sulfisossazolo": ("sulfisoxazole",),
    "sulfadossina": ("sulfadoxine",), "cumarina": ("coumarin",), "drotrecogin α": ("drotrecogin alfa",),
    "fampridina": ("fampridine", "dalfampridine"), "imipramina": ("imipramine",),
}
# Drugs absent from drugs.json but covered by an existing card (brands.json keys + key exam molecules).
EXTRA_DRUGS: Dict[str, Tuple[Tuple[str, ...], Tuple[str, ...]]] = {
    "enoxaparina": (("B12__eparina-eparine-a-basso-peso-molecolare-",), ("enoxaparin",)),
    "esomeprazolo": (("A11__inibitori-della-pompa-protonica-ipp-omep",), ()),
    "bromazepam": (("B1__benzodiazepine-bdz",), ()),
    "pregabalin": (("B9__aed-ii-generazione",), ("pregabalina",)),
    "lisinopril": (("B11__ace-inibitori-captopril-enalapril-ramipr",), ()),
    "amlodipina": (("B11__calcio-antagonisti-diidropiridine-verapa",), ()),
    "bisoprololo": (("B10__bloccanti-generazioni-e-proprieta-ancill",), ()),
    "semaglutide": (("A10__incretine-agonisti-del-recettore-glp-1-e",), ()),
    "tirzepatide": (("A10__incretine-agonisti-del-recettore-glp-1-e",), ()),
    "dapagliflozin": (("A10__inibitori-sglt2-glifozine",), ("dapagliflozina",)),
    "empagliflozin": (("A10__inibitori-sglt2-glifozine",), ("empagliflozina",)),
    "canagliflozin": (("A10__inibitori-sglt2-glifozine",), ("canagliflozina",)),
}
# Drug-class terms (normalized EN/IT) -> class card. They add cards/decks, not entries in "drugs".
CLASS_TERMS: Tuple[Tuple[Tuple[str, ...], str], ...] = (
    (("benzodiazepine", "benzodiazepines"), "B1__benzodiazepine-bdz"),
    (("opioid", "opioids", "oppioidi", "oppioide", "oppiacei"), "B8__oppioidi-effetti-tolleranza-e-dipendenza"),
    (("nsaid", "nsaids", "antinfiammatori non steroidei"), "A5__fans-classe-meccanismo-azioni-effetti-co"),
    (("glp 1", "glucagon like peptide 1", "glucagon like peptide"), "A10__incretine-agonisti-del-recettore-glp-1-e"),
    (("sglt2", "sglt 2", "gliflozin", "gliflozins", "glifozine"), "A10__inibitori-sglt2-glifozine"),
    (("dpp 4", "dpp4", "gliptin", "gliptins", "gliptine"), "A10__incretine-inibitori-della-dpp-4-gliptine"),
    (("statin", "statins", "statine"), "B9__statine-meccanismo-e-farmacocinetica"),
    (("fluoroquinolone", "fluoroquinolones", "fluorochinoloni", "quinolone", "quinolones", "chinoloni"),
     "Antibiotici-3__chinoloni-e-fluorochinoloni"),
    (("anti tnf", "tnf inhibitor", "tnf inhibitors", "tnf blocker", "tnf blockers"), "A9__anti-tnf-classe"),
    (("bisphosphonate", "bisphosphonates", "bifosfonati"), "A12__bifosfonati-i-iii-generazione"),
    (("proton pump inhibitor", "proton pump inhibitors", "inibitori di pompa protonica",
      "inibitori della pompa protonica"), "A11__inibitori-della-pompa-protonica-ipp-omep"),
    (("ssri", "ssris", "selective serotonin reuptake inhibitor", "selective serotonin reuptake inhibitors"),
     "B3__ssri-citalopram-escitalopram-fluoxetina-"),
    (("antipsychotic", "antipsychotics", "antipsicotici", "antipsicotico"),
     "B5__antipsicotici-effetti-indesiderati-e-for"),
    (("beta blocker", "beta blockers", "betabloccanti", "beta bloccanti"), "B10__bloccanti-generazioni-e-proprieta-ancill"),
    (("ace inhibitor", "ace inhibitors", "ace inibitori"), "B11__ace-inibitori-captopril-enalapril-ramipr"),
    (("angiotensin receptor blocker", "angiotensin receptor blockers", "sartani"),
     "B11__sartani-losartan-valsartan-irbesartan-te"),
    (("doac", "doacs", "direct oral anticoagulant", "direct oral anticoagulants", "anticoagulanti orali"),
     "B12__anticoagulanti-orali-vka-inibitori-diret"),
    (("antiepileptic", "antiepileptics", "antiseizure", "antiepilettici", "antiepilettico"),
     "B9__antiepilettici-meccanismi-e-principi"),
    (("carbapenem", "carbapenems", "carbapenemi"), "Beta-lattamici__carbapenemici-imipenem-ertapenem-doripen"),
    (("cephalosporin", "cephalosporins", "cefalosporine"), "Beta-lattamici__cefalosporine-classe-quadro-generale"),
    (("macrolide", "macrolides", "macrolidi"), "Antibiotici-3__macrolidi-classe-eritromicina-claritromi"),
    (("aminoglycoside", "aminoglycosides", "aminoglicosidi"), "Antibiotici-3__aminoglicosidi-classe-meccanismo-cinetic"),
    (("triptan", "triptans", "triptani"), "A7__triptani-sumatriptan-ii-generazione"),
    (("cgrp", "gepant", "gepants", "gepanti"), "A7__nuove-classi-anti-emicrania-ditani-gepan"),
    (("corticosteroid", "corticosteroids", "glucocorticoid", "glucocorticoids", "corticosteroidi", "glucocorticoidi"),
     "A4__glucocorticoidi-classe-meccanismo-effett"),
    (("checkpoint inhibitor", "checkpoint inhibitors", "inibitori dei checkpoint"),
     "B14__immunoterapia-checkpoint-inhibitors-e-an"),
    (("parp inhibitor", "parp inhibitors", "parp inibitori"), "B14__parp-inibitori-e-letalita-sintetica"),
    (("antihistamine", "antihistamines", "antistaminici"), "A6__istamina-recettori-e-strategie-farmacolo"),
    (("biosimilar", "biosimilars", "biosimilare", "biosimilari"), "A9__biosimilari-concetti"),
)
_SUFFIX_RULES = (("osio", ("ose",)), ("ato", ("ate",)), ("ina", ("ine", "in")), ("olo", ("ol", "ole")),
                 ("one", ("on",)), ("ide", ("id",)), ("ene", ("en",)), ("ile", ("il", "yl")), ("ano", ("ane",)),
                 ("ima", ("ime",)), ("ale", ("al",)), ("ico", ("ic",)), ("io", ("ium",)))
_STEM_RULES = ((r"ss", "x"), (r"micina$", "mycina"), (r"ciclina$", "cyclina"), (r"fillina$", "phyllina"),
               (r"triptilina$", "triptylina"), (r"morf", "morph"), (r"orfina$", "orphina"), (r"^idr", "hydr"),
               (r"^clor", "chlor"), (r"^ciclo", "cyclo"), (r"metil", "methyl"), (r"tt", "ct"), (r"^fen", "phen"),
               (r"^tio", "thio"), (r"^teo", "theo"), (r"^met(?=[aeo])", "meth"))


def norm(text: str) -> str:
    """Accent-free, lowercase, alphanumeric-only text (greek β/α -> beta/alfa)."""
    text = text.replace("β", " beta ").replace("α", " alfa ")
    text = "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)).casefold()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\balpha\b", "alfa", text).strip()


def word_variants(word: str) -> Set[str]:
    """Conservative English spellings of one Italian INN word (suffix + a few stem rules)."""
    alt = word
    for pat, rep in _STEM_RULES:
        alt = re.sub(pat, rep, alt)
    out = {word, alt}
    for stem in (word, alt):
        for suf, reps in _SUFFIX_RULES:
            if stem.endswith(suf) and len(stem) - len(suf) >= 3:
                out.update(stem[: -len(suf)] + r for r in reps)
                break
    return out


def name_variants(name: str) -> Set[str]:
    """Italian name -> itself + derived English forms ('acido X-ico' -> 'X-ic acid', salts dropped)."""
    words = name.lower().split()
    out = {name}
    if len(words) == 1:
        out |= word_variants(words[0])
    elif len(words) == 2 and words[0] == "acido":
        out |= {f"{v} acid" for v in word_variants(words[1]) if v.endswith("ic")}
    elif words[-1] in SALT_WORDS:
        base = " ".join(words[:-1])
        out |= name_variants(base)
        if words[-1] == "bromuro":
            out |= {f"{v} bromide" for v in word_variants(base)}
    return out


@dataclass(frozen=True)
class Matcher:
    """Whole-word drug/class matcher over normalized text, linked to cards and decks."""

    regex: "re.Pattern[str]"
    phrase_drugs: Dict[str, Tuple[str, ...]]
    phrase_cards: Dict[str, Tuple[str, ...]]
    exact: Tuple[Tuple["re.Pattern[str]", str], ...]
    drug_cards: Dict[str, Tuple[str, ...]]
    card_deck: Dict[str, str]
    card_order: Dict[str, int]

    def match(self, text: str) -> Tuple[List[str], List[str], List[str]]:
        """Return (drugs in order of appearance, card ids, deck ids) found in text."""
        drugs: List[str] = []
        cards: Set[str] = set()
        hits = [m.group(0) for m in self.regex.finditer(norm(text))]
        hits += [canon for rx, canon in self.exact if rx.search(text)]
        for hit in hits:
            for canon in self.phrase_drugs.get(hit, (hit,) if hit in self.drug_cards else ()):
                if canon not in drugs:
                    drugs.append(canon)
                cards.update(self.drug_cards[canon])
            cards.update(self.phrase_cards.get(hit, ()))
        card_list = sorted(cards, key=lambda c: self.card_order.get(c, 1 << 30))
        decks = list(dict.fromkeys(self.card_deck[c] for c in card_list))
        return drugs, card_list, decks


def _load_json(path: str) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def build_matcher(build_dir: str = HERE) -> Matcher:
    """Index Italian INNs (+English forms, aliases, brands) from drugs/brands/cards JSON."""
    cards = _load_json(os.path.join(build_dir, "cards.json"))["cards"]
    card_deck = {c["id"]: c["deckId"] for c in cards}
    card_order = {c["id"]: i for i, c in enumerate(cards)}
    links: Dict[str, Set[str]] = {}
    for fname in ("drugs.json", "drugs-extra.json"):
        path = os.path.join(build_dir, fname)
        for cid, names in (_load_json(path).items() if os.path.exists(path) else ()):
            if cid in card_deck and isinstance(names, list):
                links.setdefault(cid, set()).update(n for n in names if isinstance(n, str))
    drug_cards: Dict[str, Set[str]] = {}
    forms: Dict[str, Set[str]] = {}
    for cid, names in links.items():
        for name in names:
            canon = CANON.get(name.lower(), name)
            if norm(canon) in EXCLUDED or norm(name) in EXCLUDED:
                continue
            drug_cards.setdefault(canon, set()).add(cid)
            forms.setdefault(canon, {canon}).add(name)
    for canon, (cids, extra_forms) in EXTRA_DRUGS.items():
        valid = {c for c in cids if c in card_deck}
        if not valid:
            LOG.warning("EXTRA_DRUGS %s: card ids not found, skipped", canon)
            continue
        drug_cards.setdefault(canon, set()).update(valid)
        forms.setdefault(canon, {canon}).update(extra_forms)
    brands = _load_json(os.path.join(build_dir, "brands.json"))
    brand_forms: Dict[str, Set[str]] = {}
    for inn, tokens in brands.items():
        canon = CANON.get(inn.lower(), inn)
        if inn.startswith("_") or not isinstance(tokens, str) or canon not in drug_cards:
            continue
        brand_forms.setdefault(canon, set()).update(t for t in tokens.split() if t.lower() not in BRAND_STOP)
    phrase_drugs: Dict[str, Set[str]] = {}
    exact: List[Tuple["re.Pattern[str]", str]] = []
    for canon in drug_cards:
        variants: Set[str] = set(ALIASES.get(canon, ())) | brand_forms.get(canon, set())
        for form in forms[canon]:
            variants |= name_variants(form) | set(ALIASES.get(form, ()))
        for v in variants:
            key = norm(v)
            if len(key.replace(" ", "")) >= 5:
                phrase_drugs.setdefault(key, set()).add(canon)
            elif v in SHORT_EXACT:
                exact.append((re.compile(rf"(?<![A-Za-z0-9]){re.escape(v)}(?![A-Za-z0-9])"), canon))
    phrase_cards: Dict[str, Set[str]] = {}
    for terms, cid in CLASS_TERMS:
        if cid not in card_deck:
            LOG.warning("CLASS_TERMS: card %s not found, skipped", cid)
            continue
        for term in terms:
            phrase_cards.setdefault(norm(term), set()).add(cid)
    keys = sorted(set(phrase_drugs) | set(phrase_cards), key=lambda k: (-len(k), k))
    regex = re.compile(r"(?<![a-z0-9])(?:" + "|".join(re.escape(k) for k in keys) + r")(?![a-z0-9])")
    return Matcher(regex, {k: tuple(sorted(v)) for k, v in phrase_drugs.items()},
                   {k: tuple(sorted(v)) for k, v in phrase_cards.items()}, tuple(exact),
                   {k: tuple(sorted(v)) for k, v in drug_cards.items()}, card_deck, card_order)

# --------------------------------------------------------------- pipeline ---

OUTPUT_KEYS = ("id", "source", "kind", "title", "summary", "url", "date", "lang", "drugs", "cards", "decks")


def apply_match(item: dict, matcher: Matcher) -> dict:
    """Return a copy of item with drugs/cards/decks recomputed from title + summary."""
    drugs, cards, decks = matcher.match(f"{item['title']} {item['summary']}")
    out = {k: item[k] for k in OUTPUT_KEYS if k in item}
    out.update(drugs=drugs, cards=cards, decks=decks)
    if item.get("_require_match"):
        out["_require_match"] = True
    return out


def collect(get: Fetcher, today: dt.date, matcher: Matcher, days: int,
            sources: Sequence[Source] = SOURCES) -> Tuple[List[dict], List[dict]]:
    """Run every feed (fail soft); return (matched in-window items, per-source status)."""
    cutoff = (today - dt.timedelta(days=days)).isoformat()
    items: List[dict] = []
    status: List[dict] = []
    seen: Set[str] = set()
    for src in sources:
        errors: List[str] = []
        got: List[dict] = []
        for feed_name, runner in src.feeds:
            try:
                got.extend(runner(get, today))
            except SOFT_ERRORS as exc:
                errors.append(f"{feed_name}: {type(exc).__name__}: {exc}"[:240])
                LOG.warning("%s/%s failed: %s", src.id, feed_name, exc)
        kept = []
        for raw in got:
            item = apply_match(raw, matcher)
            if item["id"] in seen or item["date"] < cutoff or (item.pop("_require_match", False) and not item["cards"]):
                continue
            seen.add(item["id"])
            kept.append(item)
        items.extend(kept)
        ok = len(errors) < len(src.feeds)
        status.append({"id": src.id, "name": src.name, "url": src.url, "ok": ok, "count": len(kept),
                       "error": "; ".join(errors) or None})
        LOG.info("%-6s ok=%s items=%d%s", src.id, ok, len(kept), f" errors={errors}" if errors else "")
    return items, status


def sanitize_prev(raw: object, today: dt.date) -> Optional[dict]:
    """Re-validate an item from the previous feed (untrusted input)."""
    if not isinstance(raw, dict) or raw.get("source") not in SOURCE_IDS or raw.get("kind") not in KINDS:
        return None
    lang = "it" if raw.get("lang") == "it" else "en"
    date = parse_date(raw.get("date"), "%Y-%m-%d")
    return make_item(raw["source"], raw["kind"], raw.get("title"), raw.get("summary"), raw.get("url"),
                     date, lang, today)


def load_prev(spec: str, get: Callable[..., bytes], today: dt.date) -> Optional[List[dict]]:
    """Load previous novita.json from a file path or an https URL; None if unavailable."""
    try:
        if spec.startswith(("http://", "https://")):
            data = get(spec, allowed=PREV_HOSTS | FETCH_HOSTS)
        elif os.path.exists(spec):
            with open(spec, "rb") as fh:
                data = fh.read(MAX_BYTES + 1)
        else:
            LOG.warning("prev file not found: %s", spec)
            return None
        doc = json.loads(data.decode("utf-8"))
        raw_items = doc.get("items") if isinstance(doc, dict) else None
        if not isinstance(raw_items, list):
            raise ValueError("prev has no items list")
    except SOFT_ERRORS as exc:
        LOG.warning("prev unavailable (%s): %s", spec, exc)
        return None
    items = [i for i in (sanitize_prev(r, today) for r in raw_items) if i]
    LOG.info("prev: %d/%d items valid", len(items), len(raw_items))
    return items


def merge(new: List[dict], prev: List[dict], matcher: Matcher, today: dt.date,
          days: int, max_items: int) -> List[dict]:
    """Dedupe by id (new wins), re-match prev, drop old items, cap (matched first), sort by date."""
    cutoff = (today - dt.timedelta(days=days)).isoformat()
    by_id: Dict[str, dict] = {i["id"]: apply_match(i, matcher) for i in prev}
    by_id.update({i["id"]: i for i in new})
    items = [{k: i[k] for k in OUTPUT_KEYS} for i in by_id.values() if i["date"] >= cutoff]
    items.sort(key=lambda i: (not i["cards"], _desc(i["date"]), i["source"], i["id"]))
    items = items[:max(0, max_items)]
    items.sort(key=lambda i: (_desc(i["date"]), i["source"], i["id"]))
    return items


def _desc(date_iso: str) -> int:
    return -int(date_iso.replace("-", ""))


def write_atomic(path: str, doc: dict) -> None:
    """Write JSON to a temp file in the target directory, then os.replace()."""
    folder = os.path.dirname(os.path.abspath(path))
    os.makedirs(folder, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".novita-", suffix=".tmp", dir=folder)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=1)
            fh.write("\n")
        os.chmod(tmp, 0o644)
        os.replace(tmp, path)
    except OSError:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def run(args: argparse.Namespace, get: Callable[..., bytes] = fetch, today: Optional[dt.date] = None) -> int:
    """Full pipeline; returns the process exit code."""
    now = dt.datetime.now(dt.timezone.utc)
    today = today or now.date()
    matcher = build_matcher(args.build_dir)
    new, status = collect(get, today, matcher, args.days)
    prev = load_prev(args.prev, get, today) if args.prev else None
    if not any(s["ok"] for s in status) and prev is None:
        LOG.error("all sources failed and no previous data: nothing written")
        return 1
    items = merge(new, prev or [], matcher, today, args.days, args.max)
    doc = {"generated": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "window_days": args.days,
           "sources": status, "items": items}
    write_atomic(args.out, doc)
    LOG.info("wrote %s: %d items (%d linked to cards)", args.out, len(items), sum(1 for i in items if i["cards"]))
    return 0


def main(argv: Optional[Sequence[str]] = None) -> int:
    """CLI entry point."""
    ap = argparse.ArgumentParser(description="Build the 'Novità verificate' feed (novita.json).")
    ap.add_argument("--out", required=True, help="output JSON path")
    ap.add_argument("--prev", help="previous novita.json (file path or https URL) to merge")
    ap.add_argument("--days", type=int, default=365, help="drop items older than this (default 365)")
    ap.add_argument("--max", type=int, default=150, help="maximum number of items (default 150)")
    ap.add_argument("--build-dir", default=HERE, help=argparse.SUPPRESS)
    args = ap.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
