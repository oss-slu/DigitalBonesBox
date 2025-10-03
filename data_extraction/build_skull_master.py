#!/usr/bin/env python3
"""
Builds a master skull.json from per-slide description + annotation JSONs.

Inputs (already created by your earlier scripts):
  data_extraction/skull/annotations/slide##_Descriptions.json
  data_extraction/skull/annotations/slide##_annotations.json

Images (already created):
  data_extraction/skull/images/slide##/<file>

Output:
  DataSkull/boneset/skull.json  (ready for raw GitHub consumption)

Notes:
- image_url values are absolute raw GitHub URLs under DataSkull/images
"""

import os
import re
import json
import glob
from collections import defaultdict

# ---- Paths ---------------------------------------------------------------

ANN_DIR   = "data_extraction/skull/annotations"
IMG_DIR   = "data_extraction/skull/images"
OUT_FILE  = "DataSkull/boneset/skull.json"

# URLs to store in the JSON (how the app will reference images later)
# These should match where you’ll eventually place the images in the repo.
PUBLIC_IMG_PREFIX = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataSkull/images"

# ---- Helpers -------------------------------------------------------------

STOPWORDS = {
    "anterior view", "posterior view", "lateral view", "left lateral view",
    "right lateral view", "superior view", "inferior view", "skull",
    "home", "no labels", "no label", "no_labels", "no-labels"
}

ALIASES = {
    # normalize a few likely variants
    "zygomatic": "zygomatic bone",
    "malar bone": "zygomatic bone",
    "maxillary": "maxilla",
    "mandibular": "mandible",
    "frontal": "frontal bone",
    "parietal": "parietal bone",
    "temporal": "temporal bone",
    "occipital": "occipital bone",
    "nasal": "nasal bone",
    "ethmoid": "ethmoid bone",
    "sphenoid": "sphenoid bone",
}

def norm_text(s: str) -> str:
    s = (s or "").strip().lower()
    s = s.replace("’", "'")
    s = re.sub(r"\s+", " ", s)
    return s

def slug(s: str) -> str:
    s = norm_text(s)
    s = re.sub(r"[\s\-]+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    return s

def dequote(s: str) -> str:
    return s.replace("\\u2019", "'") if isinstance(s, str) else s

def as_int(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return v

def choose_first_image_url(slide: str, images_list):
    """Return a public URL like /images/skull/slide3/<file> if present."""
    if not images_list:
        return None
    filename = images_list[0].get("extracted_name")
    if not filename:
        return None
    return f"{PUBLIC_IMG_PREFIX}/{slide}/{filename}"

# ---- Load all slide descriptions ----------------------------------------

# slide_id -> {"name": "...", "id": "...", "description": [...]}
desc_by_slide = {}

for path in sorted(glob.glob(os.path.join(ANN_DIR, "slide*_Descriptions.json"))):
    slide = os.path.basename(path).split("_", 1)[0]  # "slide3"
    try:
        with open(path, "r") as f:
            d = json.load(f)
    except Exception:
        continue

    name = dequote(d.get("name") or "").strip()
    bone_id = d.get("id") or slug(name) if name else None
    description = d.get("description") or []

    desc_by_slide[slide] = {
        "name": name or "Unknown",
        "id": bone_id or "unknown",
        "description": description if isinstance(description, list) else []
    }

# ---- Prepare bones map ---------------------------------------------------

# key -> bone object
bones = {}
# convenience: also track several indexes
bone_by_namekey = {}
bone_by_idkey   = {}

def get_or_create_bone(name: str, description=None, image_url=None):
    display_name = name.strip()
    name_key = slug(ALIASES.get(norm_text(display_name), display_name))
    if name_key in bone_by_namekey:
        b = bone_by_namekey[name_key]
    else:
        b = {
            "id": name_key if name_key else slug(display_name or "unknown"),
            "name": display_name if display_name else "Unknown",
            "description": [],
            "image_url": None,
            "annotations": [],
            "subbones": []
        }
        bones[b["id"]] = b
        bone_by_namekey[name_key] = b
        bone_by_idkey[b["id"]] = b

    # merge description
    if description:
        for line in description:
            if line not in b["description"]:
                b["description"].append(line)

    # set image if empty
    if (image_url is not None) and (not b["image_url"]):
        b["image_url"] = image_url

    return b

def find_bone_by_label(label: str):
    key = slug(ALIASES.get(norm_text(label), label))
    return bone_by_namekey.get(key) or bone_by_idkey.get(key)

def find_or_create_subbone(parent: dict, label: str):
    sb_id = slug(label)
    for sb in parent["subbones"]:
        if sb.get("id") == sb_id:
            return sb
    sb = {
        "id": sb_id,
        "name": label.strip(),
        "description": [],
        "image_url": parent.get("image_url"),
        "annotations": []
    }
    parent["subbones"].append(sb)
    return sb

def add_annotation(node: dict, ann: dict):
    node.setdefault("annotations", [])
    if ann not in node["annotations"]:
        node["annotations"].append(ann)
        return True
    return False

# ---- First pass: seed bones from descriptions + pick images per slide ----

# Also record a mapping from slide -> that slide’s primary image (if any)
image_url_by_slide = {}

# We’ll need the annotation files to read their "images" sections
ann_index = {}
for apath in sorted(glob.glob(os.path.join(ANN_DIR, "slide*_annotations.json"))):
    try:
        with open(apath, "r") as f:
            ann_index[os.path.basename(apath).split("_",1)[0]] = json.load(f)
    except Exception:
        pass

for slide, info in desc_by_slide.items():
    # best image URL from that slide’s annotation file, if present
    images_list = (ann_index.get(slide) or {}).get("images") or []
    img_url = choose_first_image_url(slide, images_list)
    if img_url:
        image_url_by_slide[slide] = img_url

    # create/update the bone from description
    if info["name"] and info["name"] != "Unknown":
        get_or_create_bone(info["name"], description=info["description"], image_url=img_url)

# ---- Second pass: merge annotations into bones/subbones ------------------

for slide, payload in sorted(ann_index.items()):
    images_list = payload.get("images") or []
    slide_img_url = image_url_by_slide.get(slide) or choose_first_image_url(slide, images_list)

    # which bone does this slide belong to (from descriptions)?
    slide_bone_name = (desc_by_slide.get(slide) or {}).get("name")
    slide_bone = get_or_create_bone(slide_bone_name or "Unknown", image_url=slide_img_url)

    for item in (payload.get("annotations") or []):
        if not isinstance(item, dict):
            continue
        label = (item.get("text") or "").strip()
        if not label:
            continue
        if norm_text(label) in STOPWORDS:
            continue

        pos = item.get("position") or {}
        ann = {
            "text": label,
            "position": {
                "x": as_int(pos.get("x")),
                "y": as_int(pos.get("y")),
            }
        }
        if "width" in pos and "height" in pos:
            ann["position"]["width"]  = as_int(pos["width"])
            ann["position"]["height"] = as_int(pos["height"])

        # If label is itself a bone name, attach to that bone
        target_bone = find_bone_by_label(label)
        if target_bone:
            add_annotation(target_bone, ann)
            # fill an image if that bone still lacks one
            if slide_img_url and not target_bone.get("image_url"):
                target_bone["image_url"] = slide_img_url
            continue

        # Otherwise treat it as a sub-bone of the slide's bone
        if slide_bone:
            sb = find_or_create_subbone(slide_bone, label)
            # set subbone image if not set
            if slide_img_url and not sb.get("image_url"):
                sb["image_url"] = slide_img_url
            add_annotation(sb, ann)

# ---- Format output -------------------------------------------------------

result = {
    "id": "skull",
    "name": "Skull",
    "bones": sorted(bones.values(), key=lambda b: b["name"].lower())
}

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
with open(OUT_FILE, "w") as f:
    json.dump(result, f, indent=2)

print(f"[ok] Wrote {len(result['bones'])} bone(s) -> {OUT_FILE}")
