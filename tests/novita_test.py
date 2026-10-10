#!/usr/bin/env python3
"""Offline tests for build/novita.py (the "Novità verificate" feed generator).

Run: python3 tests/novita_test.py   (no network: every fetch is served from tests/fixtures/novita)
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import tempfile
import unittest
import urllib.error
from typing import Dict, List
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
FIX = os.path.join(ROOT, "tests", "fixtures", "novita")
sys.path.insert(0, BUILD)
import novita  # noqa: E402

TODAY = dt.date(2026, 10, 10)
MATCHER = novita.build_matcher(BUILD)
SCHEMA_KEYS = ["id", "source", "kind", "title", "summary", "url", "date", "lang", "drugs", "cards", "decks"]


def fixture(name: str) -> bytes:
    with open(os.path.join(FIX, name), "rb") as fh:
        return fh.read()


def valproate_card_b4() -> str:
    """Card id of the B4 valproate card, looked up from drugs.json (not hard-coded)."""
    with open(os.path.join(BUILD, "drugs.json"), encoding="utf-8") as fh:
        drugs = json.load(fh)
    return next(cid for cid, names in drugs.items() if cid.startswith("B4__") and "acido valproico" in names)


class FakeFetch:
    """Serves fixtures by URL substring; records requested URLs; can fail chosen feeds."""

    ROUTES = (("dhpc-output-json-report", "ema_dhpc.json"), ("news-json-report", "ema_news.json"),
              ("ricerca-aifa", "aifa_listing.html"), ("drug-safety-communications", "fda_dsc.html"),
              ("medwatch/rss.xml", "fda_medwatch.xml"), ("esearch.fcgi", "pubmed_esearch.json"),
              ("esummary.fcgi", "pubmed_esummary.json"))

    def __init__(self, fail: tuple = ()) -> None:
        self.fail = fail
        self.urls: List[str] = []

    def __call__(self, url: str, allowed: frozenset = novita.FETCH_HOSTS, attempts: int = 1) -> bytes:
        novita.check_url(url, allowed)
        self.urls.append(url)
        if any(f in url for f in self.fail):
            raise urllib.error.URLError("simulated outage")
        for key, name in self.ROUTES:
            if key in url:
                return fixture(name)
        raise urllib.error.URLError(f"no fixture for {url}")


class TextAndLinkTests(unittest.TestCase):
    def test_clean_text_strips_html_and_entities(self) -> None:
        raw = "<p>FDA &amp;amp; <b>EMA</b>&nbsp;warn:</p> age &lt; 6 &#39;years&#39;"
        self.assertEqual(novita.clean_text(raw), "FDA & EMA warn: age < 6 'years'")

    def test_clean_text_truncates_to_limit(self) -> None:
        out = novita.clean_text("parola " * 100, 280)
        self.assertLessEqual(len(out), 280)
        self.assertTrue(out.endswith("…"))

    def test_safe_link(self) -> None:
        self.assertEqual(novita.safe_link("http://www.fda.gov/drugs/x#frag"), "https://www.fda.gov/drugs/x")
        self.assertEqual(novita.safe_link("/-/niis", base="https://www.aifa.gov.it/"), "https://www.aifa.gov.it/-/niis")
        for bad in ("javascript:alert(1)", "ftp://www.fda.gov/x", "https://evil.example.com/x", "", None,
                    "https://www.fda.gov:99999/x"):
            self.assertIsNone(novita.safe_link(bad), bad)

    def test_fetch_refuses_hosts_outside_allowlist(self) -> None:
        with self.assertRaises(ValueError):
            novita.fetch("https://example.com/feed.xml")
        with self.assertRaises(ValueError):
            novita.fetch("http://www.ema.europa.eu/en/news.xml")


class ParserTests(unittest.TestCase):
    def test_fda_medwatch_rss(self) -> None:
        items = novita.parse_fda_medwatch(fixture("fda_medwatch.xml"), TODAY)
        self.assertEqual(len(items), 3, "device alert must be dropped")
        first = items[0]
        self.assertEqual(first["title"], "FDA warns about valproate & serious birth defects")
        self.assertEqual(first["summary"], "FDA is warning that valproate use in pregnancy can cause major birth defects.")
        self.assertEqual(first["url"], "https://www.fda.gov/drugs/drug-safety-and-availability/fda-warns-valproate-birth-defects")
        self.assertEqual(first["date"], "2026-10-02")
        self.assertNotIn("_require_match", first)
        self.assertTrue(all(i.get("_require_match") for i in items[1:]), "recalls outside /drugs/ need a match")

    def test_ema_dhpc_json(self) -> None:
        items = novita.parse_ema_dhpc(fixture("ema_dhpc.json"), TODAY)
        self.assertEqual([i["title"] for i in items],
                         ["DHPC: Depakine (valproate sodium, valproic acid)", "DHPC: Oldmed (lorazepam)"])
        self.assertEqual(items[0]["date"], "2026-10-01")
        self.assertEqual(items[0]["kind"], "sicurezza")
        self.assertIn("Therapeutic area: Epilepsy, Bipolar Disorder", items[0]["summary"])
        self.assertEqual(items[0]["id"], novita.item_id(items[0]["url"]))

    def test_ema_news_json(self) -> None:
        items = novita.parse_ema_news(fixture("ema_news.json"), TODAY)
        self.assertEqual(len(items), 2, "veterinary and speech items must be dropped")
        self.assertEqual(items[0]["kind"], "sicurezza")
        self.assertEqual(items[0]["summary"], "PRAC starts a review of valproate medicines. Related: Depakine, Litfulo.")
        self.assertEqual(items[1]["kind"], "notizia")

    def test_pubmed_esearch_and_esummary(self) -> None:
        self.assertEqual(novita.parse_pubmed_esearch(fixture("pubmed_esearch.json")), ["40000001", "40000002", "40000003"])
        items = novita.parse_pubmed_esummary(fixture("pubmed_esummary.json"), TODAY)
        self.assertEqual(len(items), 1, "adherence study and erratum must be dropped")
        item = items[0]
        self.assertEqual(item["url"], "https://pubmed.ncbi.nlm.nih.gov/40000001/")
        self.assertEqual(item["date"], "2026-10-05", "date = PubMed entrez date")
        self.assertEqual((item["kind"], item["lang"]), ("linea-guida", "en"))
        self.assertEqual(item["summary"], "Eur Heart J, 2026 Oct 9. Rossi M et al. Practice Guideline.")

    def test_aifa_listing(self) -> None:
        items = novita.parse_aifa_listing(fixture("aifa_listing.html").decode("utf-8"), TODAY)
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["url"], "https://www.aifa.gov.it/-/nota-informativa-importante-di-sicurezza-niis-su-depakin")
        self.assertEqual(items[0]["date"], "2026-10-08")
        self.assertEqual(items[0]["summary"], "Depakin: nuove misure per evitare l'esposizione in gravidanza.")
        self.assertEqual(items[1]["title"], "Aggiornamenti dal PRAC riunione 8-11 giugno 2026")
        self.assertEqual(items[1]["lang"], "it")

    def test_fda_dsc_table(self) -> None:
        items = novita.parse_fda_dsc(fixture("fda_dsc.html").decode("utf-8"), TODAY)
        self.assertEqual([i["date"] for i in items], ["2026-09-15", "2026-03-20", "2024-01-10"])
        self.assertTrue(items[0]["url"].startswith("https://www.fda.gov/drugs/drug-safety-communications/"))

    def test_xml_with_doctype_is_refused(self) -> None:
        with self.assertRaises(ValueError):
            novita.parse_fda_medwatch(b'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "b">]><rss/>', TODAY)


class MatchingTests(unittest.TestCase):
    def test_valproate_safety_item_maps_to_valproato_card(self) -> None:
        drugs, cards, decks = MATCHER.match("DHPC: Depakine (valproate sodium). Valproate: pregnancy risk")
        self.assertEqual(drugs, ["valproato"])
        self.assertIn(valproate_card_b4(), cards)
        self.assertIn("B4", decks)

    def test_italian_brand_and_inn(self) -> None:
        self.assertEqual(MATCHER.match("NIIS su Depakin")[0], ["valproato"])
        self.assertEqual(MATCHER.match("Nota su Tachipirina e paracetamolo")[0], ["paracetamolo"])
        self.assertEqual(MATCHER.match("acetaminophen overdose")[0], ["paracetamolo"])

    def test_english_suffix_rules_and_aliases(self) -> None:
        cases = {"topiramate": "topiramato", "omeprazole": "omeprazolo", "propranolol": "propranololo",
                 "heparin": "eparina", "lithium": "litio", "digoxin": "digossina", "vancomycin": "vancomicina",
                 "methylprednisolone": "metilprednisolone", "sevoflurane": "sevoflurano"}
        for text, expected in cases.items():
            self.assertIn(expected, MATCHER.match(f"Safety update on {text}.")[0], text)

    def test_no_false_positives(self) -> None:
        for text in ("At the moment there is no control group.", "2026 AHA/ASA Guideline for stroke",
                     "Calcium and potassium levels", "glucagon-like peptide-1 receptor agonists",
                     "valproatexyz and xlithium"):
            self.assertEqual(MATCHER.match(text)[0], [], text)

    def test_short_tokens_case_sensitive(self) -> None:
        self.assertEqual(MATCHER.match("HCTZ combination")[0], ["idroclorotiazide"])
        self.assertEqual(MATCHER.match("hctz combination")[0], [])

    def test_class_terms_link_cards_without_drug_names(self) -> None:
        drugs, cards, decks = MATCHER.match("Warning removed for GLP-1 receptor agonists")
        self.assertEqual(drugs, [])
        self.assertEqual(decks, ["A10"])


class MergeTests(unittest.TestCase):
    def _item(self, url: str, date: str, title: str = "Generic news", source: str = "ema") -> Dict:
        raw = novita.make_item(source, "notizia", title, "", url, dt.date.fromisoformat(date), "en", TODAY)
        assert raw is not None
        return novita.apply_match(raw, MATCHER)

    def test_merge_dedupe_cutoff_cap_and_order(self) -> None:
        url_a = "https://www.ema.europa.eu/en/news/a"
        new = [self._item(url_a, "2026-10-01", "Updated title"),
               self._item("https://www.ema.europa.eu/en/news/b", "2026-09-01")]
        prev = [dict(self._item(url_a, "2026-10-01", "Old title")),
                self._item("https://www.ema.europa.eu/en/news/c", "2026-08-01", "Valproate review"),
                self._item("https://www.ema.europa.eu/en/news/old", "2024-01-01", "Lithium")]
        prev[1]["cards"], prev[1]["drugs"] = [], []  # stale prev matches must be recomputed
        out = novita.merge(new, prev, MATCHER, TODAY, days=365, max_items=2)
        self.assertEqual([i["url"].rsplit("/", 1)[1] for i in out], ["a", "c"], "cap keeps matched item c over b")
        self.assertEqual(out[0]["title"], "Updated title", "new item wins on duplicate id")
        self.assertEqual(out[1]["drugs"], ["valproato"])
        self.assertTrue(all(list(i) == SCHEMA_KEYS for i in out))
        full = novita.merge(new, prev, MATCHER, TODAY, days=365, max_items=150)
        self.assertEqual([i["date"] for i in full], ["2026-10-01", "2026-09-01", "2026-08-01"])
        self.assertNotIn("2024-01-01", [i["date"] for i in full], "age cutoff")

    def test_sanitize_prev_rejects_bad_items(self) -> None:
        good = {"source": "fda", "kind": "sicurezza", "title": "<b>T</b>", "summary": "s",
                "url": "http://www.fda.gov/drugs/x", "date": "2026-09-01", "lang": "en", "id": "forged"}
        item = novita.sanitize_prev(good, TODAY)
        self.assertEqual(item["title"], "T")
        self.assertEqual(item["id"], novita.item_id("https://www.fda.gov/drugs/x"), "id recomputed from url")
        for patch in ({"url": "javascript:alert(1)"}, {"source": "blog"}, {"kind": "spam"}, {"date": "yesterday"}):
            self.assertIsNone(novita.sanitize_prev(dict(good, **patch), TODAY), patch)


class PipelineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.out = os.path.join(self.tmp.name, "novita.json")
        self.sleep = mock.patch.object(novita.time, "sleep", lambda _s: None)
        self.sleep.start()

    def tearDown(self) -> None:
        self.sleep.stop()
        self.tmp.cleanup()

    def _args(self, prev: str = None) -> argparse.Namespace:
        return argparse.Namespace(out=self.out, prev=prev, days=365, max=150, build_dir=BUILD)

    def test_end_to_end_offline_with_one_source_down(self) -> None:
        fake = FakeFetch(fail=("ricerca-aifa",))
        with self.assertLogs("novita", level="INFO"):
            code = novita.run(self._args(), get=fake, today=TODAY)
        self.assertEqual(code, 0)
        self.assertTrue(all("tool=farmacoflash" in u and "email" not in u for u in fake.urls if "eutils" in u))
        with open(self.out, encoding="utf-8") as fh:
            doc = json.load(fh)
        self.assertEqual(list(doc), ["generated", "window_days", "sources", "items"])
        self.assertRegex(doc["generated"], r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$")
        status = {s["id"]: s for s in doc["sources"]}
        self.assertEqual(list(status), ["ema", "aifa", "fda", "pubmed"])
        self.assertFalse(status["aifa"]["ok"])
        self.assertIn("simulated outage", status["aifa"]["error"])
        self.assertTrue(status["ema"]["ok"] and status["ema"]["error"] is None)
        self.assertEqual(status["fda"]["count"], 4, "2 DSC in window + valproate alert + matched lorazepam recall")
        titles = [i["title"] for i in doc["items"]]
        self.assertNotIn("Example Pharmacy Recalls Compounded Glutathione Due to Elevated Endotoxin", titles)
        self.assertIn("Example Labs Recalls One Lot of Lorazepam Injection Due to Particulate Matter", titles)
        for item in doc["items"]:
            self.assertEqual(list(item), SCHEMA_KEYS)
            self.assertTrue(item["url"].startswith("https://"))
            self.assertLessEqual(len(item["summary"]), novita.SUMMARY_MAX)
        self.assertEqual([i["date"] for i in doc["items"]], sorted((i["date"] for i in doc["items"]), reverse=True))
        dhpc = next(i for i in doc["items"] if i["title"].startswith("DHPC: Depakine"))
        self.assertIn(valproate_card_b4(), dhpc["cards"])

    def test_prev_file_merged_when_everything_fails(self) -> None:
        prev_path = os.path.join(self.tmp.name, "prev.json")
        prev_item = {"source": "aifa", "kind": "sicurezza", "title": "NIIS su litio", "summary": "",
                     "url": "https://www.aifa.gov.it/-/niis-litio", "date": "2026-09-30", "lang": "it"}
        with open(prev_path, "w", encoding="utf-8") as fh:
            json.dump({"items": [prev_item]}, fh)
        everything = tuple(k for k, _ in FakeFetch.ROUTES)
        with self.assertLogs("novita", level="WARNING"):
            code = novita.run(self._args(prev_path), get=FakeFetch(fail=everything), today=TODAY)
        self.assertEqual(code, 0, "prev data exists -> exit 0")
        with open(self.out, encoding="utf-8") as fh:
            doc = json.load(fh)
        self.assertEqual([i["drugs"] for i in doc["items"]], [["litio"]])
        self.assertTrue(all(not s["ok"] for s in doc["sources"]))

    def test_exit_1_and_no_file_when_nothing_available(self) -> None:
        everything = tuple(k for k, _ in FakeFetch.ROUTES)
        with self.assertLogs("novita", level="WARNING") as logs:
            code = novita.run(self._args(), get=FakeFetch(fail=everything), today=TODAY)
        self.assertEqual(code, 1)
        self.assertTrue(any("nothing written" in line for line in logs.output))
        self.assertFalse(os.path.exists(self.out))


if __name__ == "__main__":
    unittest.main(verbosity=1)
