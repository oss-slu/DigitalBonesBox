import argparse, json, os, re
import xml.etree.ElementTree as ET

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
R_ID_KEY = "{%s}id" % NS["r"]

def emu_box(xfrm):
    off = xfrm.find("a:off", NS); ext = xfrm.find("a:ext", NS)
    x = int(off.get("x")); y = int(off.get("y"))
    w = int(ext.get("cx")); h = int(ext.get("cy"))
    return {"x": x, "y": y, "width": w, "height": h, "rotation": int(xfrm.get("rot") or 0)}

def is_white_color(solid_fill):
    if solid_fill is None: return False
    srgb = solid_fill.find("a:srgbClr", NS)
    if srgb is not None: return srgb.get("val","").upper() == "FFFFFF"
    scheme = solid_fill.find("a:schemeClr", NS)
    return scheme is not None and scheme.get("val") in ("lt1", "bg1")

def text_is_white(sp):
    # treat as white if ANY run declares white
    for rpr in sp.findall(".//a:rPr", NS):
        if is_white_color(rpr.find("a:solidFill", NS)):
            return True
    return False

def line_is_white(shape):
    ln = shape.find(".//a:ln", NS)
    if ln is None: return False
    return is_white_color(ln.find("a:solidFill", NS))

def build_rels_map(rels_path):
    m = {}
    if not os.path.exists(rels_path): return m
    root = ET.parse(rels_path).getroot()
    for rel in root.findall(f".//{{{PKG_REL_NS}}}Relationship"):
        rid = rel.attrib.get("Id")
        if rid:
            m[rid] = {"Type": rel.attrib.get("Type",""),
                      "Target": rel.attrib.get("Target","")}
    return m

def _link_payload(rid, rels_map):
    info = {"rId": rid}
    target = (rels_map.get(rid) or {}).get("Target","")
    info["target"] = target
    m = re.search(r"slide(\d+)\.xml", target)
    if m: info["target_slide"] = int(m.group(1))
    return info

def resolve_hyperlink_for_shape(shape_el, rels_map):
    # 1) shape-level link on cNvPr
    cNvPr = shape_el.find("./p:nvSpPr/p:cNvPr", NS)
    if cNvPr is not None:
        hl = cNvPr.find("a:hlinkClick", NS)
        if hl is not None and R_ID_KEY in hl.attrib:
            return _link_payload(hl.attrib[R_ID_KEY], rels_map)
    # 2) run-level links inside text (a:rPr/a:hlinkClick)
    for rPr in shape_el.findall(".//a:rPr", NS):
        hl = rPr.find("a:hlinkClick", NS)
        if hl is not None and R_ID_KEY in hl.attrib:
            return _link_payload(hl.attrib[R_ID_KEY], rels_map)
    return None

def extract_text_boxes(root, rels_map, slide_num):
    out = []
    for sp in root.findall(".//p:sp", NS):
        if sp.find(".//p:txBody", NS) is None:
            continue
        if not text_is_white(sp):
            continue
        xfrm = sp.find(".//a:xfrm", NS)
        if xfrm is None:
            continue
        text = "".join(t.text or "" for t in sp.findall(".//a:t", NS)).strip()
        if not text:
            continue

        hyperlink = resolve_hyperlink_for_shape(sp, rels_map)

        out.append({
            "annotation_id": f"annot_{len(out)+1}",
            "bone_name": "Bony Pelvis",
            "subbone_name": text,
            "text_content": text,
            "text_box": emu_box(xfrm) | {"shape_id": sp.find("./p:nvSpPr/p:cNvPr", NS).get("id")},
            "has_hyperlink": hyperlink is not None,
            "hyperlink": hyperlink or {},
        })
    return out

def extract_lines(root):
    lines = []
    for shp in root.findall(".//p:cxnSp", NS):
        if not line_is_white(shp):
            continue
        xfrm = shp.find(".//a:xfrm", NS)
        if xfrm is None:
            continue
        box = emu_box(xfrm)
        start = {"x": box["x"], "y": box["y"]}
        end   = {"x": box["x"] + box["width"], "y": box["y"] + box["height"]}
        ln = shp.find(".//a:ln", NS)
        width = int(ln.get("w") or 0)
        head  = ln.find("a:headEnd", NS)
        lines.append({
            "line_id": f"line_{len(lines)+1}",
            "line_type": "straight_arrow",
            "start_point": start,
            "end_point": end,
            "style": {"width": width, "arrow_head": (head.get("type") if head is not None else "none")},
            "shape_id": shp.find("./p:nvCxnSpPr/p:cNvPr", NS).get("id")
        })
    return lines

def center(box):
    return (box["x"] + box["width"]/2.0, box["y"] + box["height"]/2.0)

def dist2(p, q):
    return (p[0]-q[0])**2 + (p[1]-q[1])**2

def associate(texts, lines, k=2):
    for t in texts:
        tc = center(t["text_box"])
        ranked = sorted(
            lines,
            key=lambda ln: min(
                dist2(tc, (ln["start_point"]["x"], ln["start_point"]["y"])),
                dist2(tc, (ln["end_point"]["x"],   ln["end_point"]["y"]))
            )
        )
        chosen = ranked[:k]
        t["pointer_lines"] = chosen
        t["target_regions"] = [{"x": ln["end_point"]["x"], "y": ln["end_point"]["y"]} for ln in chosen]
    return texts

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slides-dir", required=True)
    ap.add_argument("--rels-dir",   required=True)
    ap.add_argument("--slide", type=int, required=True)
    ap.add_argument("--out", help="Optional explicit output path")
    args = ap.parse_args()

    slide_xml = os.path.join(args.slides_dir, f"slide{args.slide}.xml")
    root = ET.parse(slide_xml).getroot()

    rels_map = build_rels_map(os.path.join(args.rels_dir, f"slide{args.slide}.xml.rels"))

    texts = extract_text_boxes(root, rels_map, args.slide)
    lines = extract_lines(root)
    annotations = associate(texts, lines, k=2)

    payload = {
        "slide_number": args.slide,
        "text_annotations": annotations,
        "total_text_annotations": len(annotations),
    }

    out_path = args.out or f"data_extraction/annotations/slide{args.slide}_text_annotations.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote {out_path}")

if __name__ == "__main__":
    main()
