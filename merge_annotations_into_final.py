#!/usr/bin/env python3
"""
merge_annotations_into_final.py

Merges label annotations extracted from slides into the merged boneset JSON:
- Reads boneset-api/data/final_bony_pelvis.json
- Scans data_extraction/*annotations*.json for label items
- For each annotation with a non-empty "text" and a "position" object,
  finds the matching bone or sub-bone by id or name and appends the annotation.

Run from the repository root:
    python3 merge_annotations_into_final.py
"""

import os
import re
import json
import glob

# ---- Paths ---------------------------------------------------------------

FINAL_JSON = os.path.join("boneset-api", "data", "final_bony_pelvis.json")
ANNO_DIR   = "data_extraction"

# ---- Normalization / matching helpers ------------------------------------

# Optional aliases if the slide labels use a shorter/common term
ALIASES = {
    "ramus": "ischial_ramus",  # slide might say just "Ramus"
    "asis": "anterior_superior_iliac_spine",
    "aiis": "anterior_inferior_iliac_spine",
    "psis": "posterior_superior_iliac_spine",
    "piis": "posterior_inferior_iliac_spine",
}

def norm(s: str) -> str:
    """Normalize ids/names/labels to snake_case-ish for matching."""
    s = str(s).strip().lower()
    s = s.replace("’", "'")
    s = re.sub(r"[\s\-]+", "_", s)      # spaces/hyphens -> underscores
    s = re.sub(r"[^a-z0-9_]+", "", s)   # drop other punctuation
    return s

def as_int(v):
    """Convert numeric-like strings to int; otherwise return the input."""
    try:
        # handles "123", "123.0", 123, etc.
        return int(float(v))
    except (TypeError, ValueError):
        return v

# ---- Load current final JSON --------------------------------------------

if not os.path.exists(FINAL_JSON):
    raise SystemExit(f"[error] Missing file: {FINAL_JSON}")

with open(FINAL_JSON, "r") as f:
    data = json.load(f)

# ---- Index bones and sub-bones by id and name ---------------------------

bones_by_key = {}
subs_by_key  = {}

for b in data.get("bones", []) or []:
    if b.get("id"):   bones_by_key[norm(b["id"])]   = b
    if b.get("name"): bones_by_key[norm(b["name"])] = b
    for sb in b.get("subbones", []) or []:
        if sb.get("id"):   subs_by_key[norm(sb["id"])]   = sb
        if sb.get("name"): subs_by_key[norm(sb["name"])] = sb

def find_target_by_text(text: str):
    """Find the bone/sub-bone node matching this label text."""
    k = norm(text)
    k = ALIASES.get(k, k)
    return bones_by_key.get(k) or subs_by_key.get(k)

def add_annotation(node: dict, ann: dict) -> bool:
    """Append annotation if not already present (simple de-dup)."""
    node.setdefault("annotations", [])
    if ann not in node["annotations"]:
        node["annotations"].append(ann)
        return True
    return False

# ---- Walk annotation files and merge ------------------------------------

added = dup = miss = files = 0

for path in sorted(glob.glob(os.path.join(ANNO_DIR, "*annotations*.json"))):
    files += 1
    try:
        with open(path, "r") as f:
            payload = json.load(f)
    except Exception as e:
        print(f"[skip] {path}: {e}")
        continue

    # payload can be a list or a dict with {"annotations": [...]}
    items = payload.get("annotations") if isinstance(payload, dict) else payload
    if not isinstance(items, list):
        print(f"[skip] {path}: unexpected payload shape")
        continue

    for item in items:
        if not isinstance(item, dict):
            continue

        text = (item.get("text") or "").strip()
        pos  = item.get("position")

        # We only merge actual labeled annotations with a position
        if not text or not isinstance(pos, dict):
            continue

        tgt = find_target_by_text(text)
        if not tgt:
            miss += 1
            print(f"[miss] {text!r} in {os.path.basename(path)}")
            continue

        ann = {
            "text": text,
            "position": {
                "x": as_int(pos.get("x")),
                "y": as_int(pos.get("y")),
            },
        }
        if "width" in pos and "height" in pos:
            ann["position"]["width"]  = as_int(pos["width"])
            ann["position"]["height"] = as_int(pos["height"])

        if add_annotation(tgt, ann):
            added += 1
            print(f"[add] {text!r} -> {tgt.get('id')}")
        else:
            dup += 1
            print(f"[dup] {text!r} -> {tgt.get('id')}")

# ---- Write back final JSON ----------------------------------------------

with open(FINAL_JSON, "w") as f:
    json.dump(data, f, indent=2)

print(f"[done] files={files} added={added} dup={dup} miss={miss} -> {FINAL_JSON}")
