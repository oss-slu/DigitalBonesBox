import argparse, json, os, re
import xml.etree.ElementTree as ET

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

EMU_PER_DEG = 60000.0
_SLIDE_NUM_RE = re.compile(r"(\d+)")

def _num(el, attr, default=0.0):
    try: return float(el.get(attr))
    except Exception: return default

def _slide_num(path):
    m = _SLIDE_NUM_RE.search(os.path.splitext(os.path.basename(path))[0])
    return int(m.group(1)) if m else None

def two_largest_pics(root, min_area_frac=0.05):
    pics = []
    for pic in root.findall(".//p:pic", NS):
        xfrm = pic.find(".//a:xfrm", NS)
        if xfrm is None:
            continue
        off, ext = xfrm.find("a:off", NS), xfrm.find("a:ext", NS)
        if off is None or ext is None:
            continue
        x, y = _num(off, "x"), _num(off, "y")
        cx, cy = _num(ext, "cx"), _num(ext, "cy")
        area = cx * cy
        blip = pic.find(".//a:blip", NS)
        embed = blip.get("{%s}embed" % NS["r"]) if blip is not None else None
        rot_emu = _num(xfrm, "rot", 0.0)
        pics.append({
            "x": x, "y": y, "cx": cx, "cy": cy, "area": area,
            "rot_emu": rot_emu,
            "rot_deg": rot_emu / EMU_PER_DEG,
            "flipH": (xfrm.get("flipH") == "1"),
            "flipV": (xfrm.get("flipV") == "1"),
            "embed": embed
        })
    pics.sort(key=lambda d: d["area"], reverse=True)
    if not pics:
        return []
    thr = pics[0]["area"] * float(min_area_frac or 0.0)
    filtered = [p for p in pics if p["area"] >= thr]
    return (filtered[:2] if len(filtered) >= 2 else pics[:2])

def _bbox(a, b):
    x1, y1 = min(a["x"], b["x"]), min(a["y"], b["y"])
    x2, y2 = max(a["x"]+a["cx"], b["x"]+b["cx"]), max(a["y"]+a["cy"], b["y"]+b["cy"])
    return {"x": x1, "y": y1, "w": (x2-x1), "h": (y2-y1)}

def _norm(item, box):
    w, h = (box["w"] or 1.0), (box["h"] or 1.0)
    return {
        "normX": (item["x"]-box["x"])/w, "normY": (item["y"]-box["y"])/h,
        "normW": item["cx"]/w, "normH": item["cy"]/h
    }

def compute_template(slide_path, min_area_frac):
    root = ET.parse(slide_path).getroot()
    top2 = two_largest_pics(root, min_area_frac)
    if len(top2) < 2:
        raise SystemExit("Template slide must contain two main pictures.")
    left, right = sorted(top2, key=lambda d: d["x"])
    box = _bbox(left, right)
    return {
        "layout": "side-by-side",
        "left":  {
            **_norm(left, box),
            "rot_deg": left["rot_deg"],
            "rot_emu": left["rot_emu"],
            "flipH": left["flipH"], "flipV": left["flipV"]
        },
        "right": {
            **_norm(right, box),
            "rot_deg": right["rot_deg"],
            "rot_emu": right["rot_emu"],
            "flipH": right["flipH"], "flipV": right["flipV"]
        },
        "norm_basis": "two-image-union"
    }

def extract_slide_metadata(slide_path, bone_set, min_area_frac):
    root = ET.parse(slide_path).getroot()
    top2 = two_largest_pics(root, min_area_frac)
    if len(top2) < 2:
        return None
    left, right = sorted(top2, key=lambda d: d["x"])
    return {
        "slide": _slide_num(slide_path),
        "bone_set": bone_set,
        "left_media": left["embed"],
        "right_media": right["embed"],
        "subbone": None, "sub_subbone": None
    }

def _close(a, b, tol):
    return abs(a-b) <= tol

def audit_slide(slide_path, template, tol, min_area_frac):
    root = ET.parse(slide_path).getroot()
    top2 = two_largest_pics(root, min_area_frac)
    if len(top2) < 2:
        return {"slide": _slide_num(slide_path), "ok": False, "reason": "fewer-than-two-pics"}
    left, right = sorted(top2, key=lambda d: d["x"])
    box = _bbox(left, right)
    L = {**_norm(left, box),  "rot_deg": left["rot_deg"]}
    R = {**_norm(right, box), "rot_deg": right["rot_deg"]}
    fails = []
    for side, got, want in (("left", L, template["left"]), ("right", R, template["right"])):
        for k in ("normX","normY","normW","normH"):
            if not _close(got[k], want[k], tol):
                fails.append(f"{side}.{k}")
        if not _close(got["rot_deg"], want["rot_deg"], tol*10):
            fails.append(f"{side}.rot_deg")
    return {"slide": _slide_num(slide_path), "ok": not fails, "fails": fails}

# ---- rId -> filename/path resolver (optional via --rels-dir) ----

def _read_rels_map(rels_path):
    if not os.path.exists(rels_path):
        return {}
    root = ET.parse(rels_path).getroot()
    out = {}
    for rel in root.findall(f".//{{{PKG_REL_NS}}}Relationship"):
        rid = rel.attrib.get("Id")
        if rid:
            out[rid] = {"Type": rel.attrib.get("Type",""), "Target": rel.attrib.get("Target","")}
    return out

def resolve_media_path(slides_dir, rels_dir, slide_num, rid):
    rels_path = os.path.join(rels_dir, f"slide{slide_num}.xml.rels")
    rels = _read_rels_map(rels_path)
    info = rels.get(rid)
    if not info or not info.get("Target"):
        return {"target": "", "path": ""}
    target = info["Target"]
    fs_path = os.path.normpath(os.path.join(slides_dir, target))
    return {"target": target, "path": fs_path}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slides-dir", required=True)
    ap.add_argument("--rels-dir", required=False, default=None, help="Directory of slideN.xml.rels (optional)")
    ap.add_argument("--slides", type=int, nargs="+", default=[2,3])
    ap.add_argument("--representative", type=int, default=2)
    ap.add_argument("--out-template", default="data_extraction/annotations/template_bony_pelvis.json")
    ap.add_argument("--out-metadata", default="data_extraction/annotations/bony_pelvis_metadata.json")
    ap.add_argument("--audit", action="store_true")
    ap.add_argument("--tolerance", type=float, default=0.02)
    ap.add_argument("--min-area", type=float, default=0.05)
    args = ap.parse_args()

    rep_path = os.path.join(args.slides_dir, f"slide{args.representative}.xml")
    if not os.path.exists(rep_path):
        raise SystemExit(f"Missing representative slide: {rep_path}")

    template = compute_template(rep_path, args.min_area)

    tpl_dir = os.path.dirname(args.out_template)
    if tpl_dir:
        os.makedirs(tpl_dir, exist_ok=True)
    with open(args.out_template, "w") as f:
        json.dump({
            "bone_set": "Bony Pelvis",
            "display_format": "side-by-side",
            "extracted_from_slide": args.representative,
            "normalized_geometry": template
        }, f, indent=2)

    metadata, verified, failures = [], [], []
    for n in args.slides:
        path = os.path.join(args.slides_dir, f"slide{n}.xml")
        if not os.path.exists(path):
            continue
        md = extract_slide_metadata(path, "Bony Pelvis", args.min_area)
        if md:
            # enrich with media targets/paths if rels-dir provided
            if args.rels_dir:
                left  = resolve_media_path(args.slides_dir, args.rels_dir, n, md["left_media"])
                right = resolve_media_path(args.slides_dir, args.rels_dir, n, md["right_media"])
                md["left_media_target"]  = left["target"]
                md["right_media_target"] = right["target"]
                md["left_media_path"]    = left["path"]
                md["right_media_path"]   = right["path"]
            metadata.append(md)
            if args.audit:
                res = audit_slide(path, template, args.tolerance, args.min_area)
                (verified if res["ok"] else failures).append(res)

    os.makedirs(os.path.dirname(args.out_metadata) or ".", exist_ok=True)
    out = {"slides": metadata}
    if args.audit:
        out["audit"] = {
            "tolerance": args.tolerance,
            "verified_slides": [v["slide"] for v in verified],
            "failed_slides": failures
        }
    with open(args.out_metadata, "w") as f:
        json.dump(out, f, indent=2)

    print(f"template -> {args.out_template}")
    print(f"metadata -> {args.out_metadata}")

if __name__ == "__main__":
    main()