"""Fetch official AIFA registry into a review candidate, never overwrite teaching content.

No credentials or third-party packages. Run: python3 build/sync-catalog.py
"""
import csv
import gzip
import hashlib
import io
import json
import os
import time
from pathlib import Path
from datetime import datetime, timezone
from urllib.request import urlopen, Request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'catalog-review'
BASE = 'https://drive.aifa.gov.it/farmaci/'
SOURCES = {
    'confezioni_fornitura.csv': {'CODICE_AIC', 'COD_FARMACO', 'DENOMINAZIONE', 'STATO_AMMINISTRATIVO', 'CODICE_ATC', 'PA_ASSOCIATI'},
    'PA_confezioni.csv': {'CODICE_AIC', 'PRINCIPIO_ATTIVO', 'QUANTITA', 'UNITA_MISURA'},
    'atc.csv': {'CODICE_ATC', 'DESCRIZIONE'},
}

def parse(raw, required):
    text = raw.decode('utf-8-sig', errors='strict')
    reader = csv.DictReader(io.StringIO(text), delimiter=';', strict=True)
    if not required.issubset(reader.fieldnames or []):
        raise ValueError('Source schema changed')
    rows = list(reader)
    if not rows or any(None in r for r in rows):
        raise ValueError('Empty or malformed source')
    return rows

def atomic(path, data):
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_bytes(data)
    os.replace(temp, path)

def fetch(name):
    for attempt in range(3):
        try:
            with urlopen(Request(BASE + name, headers={'User-Agent': 'FarmacoFlash educational registry check'}), timeout=30) as response:
                if response.headers.get_content_type() not in ('text/csv', 'application/csv', 'application/octet-stream', 'text/plain'):
                    raise ValueError('Unexpected source content type')
                raw = response.read(120_000_001)
                if len(raw) > 120_000_000:
                    raise ValueError('Source exceeds safety limit')
                return raw, response.headers.get('Last-Modified')
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

def main():
    OUT.mkdir(exist_ok=True)
    lock = OUT / '.lock'
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        raise RuntimeError('Another sync is running; inspect the lock before retrying')
    os.close(fd)
    stamp = datetime.now(timezone.utc).isoformat()
    try:
        tables, provenance = {}, []
        for name, fields in SOURCES.items():
            raw, modified = fetch(name)
            tables[name] = parse(raw, fields)
            provenance.append({'url': BASE + name, 'sha256': hashlib.sha256(raw).hexdigest(), 'rows': len(tables[name]), 'lastModified': modified})
        packages = tables['confezioni_fornitura.csv']
        ids = [r['CODICE_AIC'] for r in packages]
        if len(set(ids)) != len(ids) or any(len(x) != 9 or not x.isdigit() for x in ids):
            raise ValueError('Duplicate or invalid AIC; candidate not published')
        if len(ids) < 1000:
            raise ValueError('Unexpectedly small registry')
        previous = OUT / 'candidate.json'
        if previous.exists():
            old = json.loads(previous.read_text())
            if [s['sha256'] for s in old['sources']] == [s['sha256'] for s in provenance]:
                cached = gzip.decompress((OUT / old['file']).read_bytes())
                if hashlib.sha256(cached).hexdigest() != old['sha256']:
                    raise ValueError('Previous candidate checksum mismatch')
                atomic(OUT / 'last-run.json', json.dumps({'status': 'unchanged-verified', 'at': stamp, 'packages': len(ids), 'sha256': old['sha256']}).encode())
                print('Unchanged source checksums; existing candidate verified and preserved')
                return
            if abs(len(ids) - old['packages']) > old['packages'] * .2:
                raise ValueError('Registry count changed by more than 20%; manual review required')
        payload = {'schemaVersion': 1, 'scope': 'AIFA Italy: administrative medicine registry, including historical statuses; not clinical guidance', 'retrievedAt': stamp, 'source': 'Agenzia Italiana del Farmaco', 'license': 'CC-BY-4.0', 'licenseUrl': 'https://www.aifa.gov.it/open-data', 'provenance': provenance, 'packages': packages, 'ingredientsByPackage': tables['PA_confezioni.csv'], 'atc': tables['atc.csv']}
        encoded = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()
        digest = hashlib.sha256(encoded).hexdigest()
        name = digest + '.json.gz'
        atomic(OUT / name, gzip.compress(encoded, mtime=0))
        manifest = {'status': 'awaiting-review', 'retrievedAt': stamp, 'file': name, 'sha256': digest, 'packages': len(ids), 'sources': provenance, 'clinicalContentChanged': False}
        atomic(OUT / 'candidate.json', json.dumps(manifest, indent=2).encode())
        atomic(OUT / 'last-run.json', json.dumps({'status': 'candidate-validated', 'at': stamp, 'packages': len(ids)}).encode())
        print(json.dumps(manifest, indent=2))
    except Exception as error:
        atomic(OUT / 'last-run.json', json.dumps({'status': 'failed', 'at': stamp, 'error': str(error), 'previousCandidatePreserved': True}).encode())
        raise
    finally:
        lock.unlink()

if __name__ == '__main__':
    main()
