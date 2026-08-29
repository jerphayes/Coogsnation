#!/usr/bin/env python3
import json,sys
from pathlib import Path
if len(sys.argv) != 2: print("usage: validate_fact.py FACT.json"); raise SystemExit(2)
path = Path(sys.argv[1])
fact = json.loads(path.read_text())
required = ("fact_id","subject","statement","confidence","provenance_id","license_status")
missing = tuple(key for key in required if key not in fact)
if missing: print("REJECT: missing fields", missing); raise SystemExit(1)
if fact["license_status"] != "approved": print("HOLD: license status is not approved"); raise SystemExit(1)
if float(fact["confidence"]) < 0.85: print("HOLD: confidence below 0.85"); raise SystemExit(1)
print("PASS: fact eligible for curated knowledge")
