import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('sync', Path(__file__).resolve().parents[1] / 'build/sync-catalog.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

class CatalogChecks(unittest.TestCase):
    def test_valid_csv_preserves_quoted_separator(self):
        self.assertEqual(sync.parse(b'A;B\n1;"two;parts"\n', {'A','B'}), [{'A':'1','B':'two;parts'}])
    def test_login_and_empty_rejected(self):
        for raw in [b'<html>login</html>', b'A;B\n', b'A;B\n1;2;3\n']:
            with self.assertRaises(ValueError): sync.parse(raw, {'A','B'})

unittest.main()
