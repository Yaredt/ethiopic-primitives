#!/usr/bin/env python3
"""Constitution Principle II: gating vectors require Tier-1 or Tier-2 provenance."""
import json, sys, pathlib

TIER_1 = {"mofed", "negarit-gazeta", "ethiopian-statistical-service"}
TIER_2 = {"unicode-cldr-icu", "calendrical-calculations"}
ACCEPTED = TIER_1 | TIER_2

fails = []
for p in pathlib.Path("tests/vectors").glob("*.json"):
    doc = json.loads(p.read_text())
    for i, v in enumerate(doc.get("vectors", [])):
        if not v.get("gating"):
            continue
        srcs = v.get("source") or []
        if not any(s.get("authority") in ACCEPTED and s.get("result") == "agree" for s in srcs):
            fails.append(f"{p.name}[{i}] {v.get('ethiopic')} — no Tier-1/2 source with result=agree")

if fails:
    print(f"Principle II violation: {len(fails)} gating vector(s) lack provenance")
    for f in fails[:20]:
        print("  ", f)
    sys.exit(1)
print("Principle II: all gating vectors have accepted provenance")

tier1 = any(
    s.get("authority") in TIER_1
    for p in pathlib.Path("tests/vectors").glob("*.json")
    for v in json.loads(p.read_text()).get("vectors", [])
    for s in (v.get("source") or [])
)
if not tier1:
    print("::warning::No Tier-1 (Ethiopian government) source present. "
          "Constitution Principle II blocks PUBLIC RELEASE until one is added.")
