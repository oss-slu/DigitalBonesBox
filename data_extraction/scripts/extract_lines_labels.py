#!/usr/bin/env python3
import argparse, json, math, os, re
import xml.etree.ElementTree as ET

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

def emu_box(xfrm):
    off = xfrm.find("a:off", NS); ext = xfrm.find("a:ext", NS)
    x = int(off.get("x")); y = int(off.get("y"))
    w = int(ext.get("cx")); h = int(ext.get("cy"))
    return {"x": x, "y": y, "width": w, "height": h, "rotation": int(xfrm.get("rot") or 0)}

def is_white_color(solid_fill):
    if solid_fill is None: return False
    # <a:srgbClr val="FFFFFF"/> or <a:schemeClr val="lt1"/> (usually theme white)
    srgb = solid_fill.find("a:srgbClr", NS)
    if srgb is not None: return srgb.get("val","").upper() == "FFFFFF"
    scheme = solid_fill.find("a:schemeClr", NS)
    return scheme is not None and scheme.get("val") in ("lt1", "bg1")  # common whites

def text_is_white(sp):
    rpr = sp.find(".//a:rPr", NS)
    if rpr is None: return False
    return is_white_color(rpr.find("a:solidFill", NS))

def line_is_white(shape):
    ln = shape.find(".//a:ln", NS)
    if ln is None: return False
    return is_white_color(ln.find("a:solidFill", NS))

def resolve_hyperlink(rels_dir, slide_num, rid):
    if not rid: return None
    path = os.path.join(rels_dir, f"slide{slide_num}.xml.rels")
    if not os.path.exists(path): return None
    root = ET.parse(path).getroot()
    for rel in root.findall(f".//{{{PKG_REL_NS}}}Relationship"):
        if rel.get("Id") == rid:
            tgt = rel.get("Target", "")
            m = re.search(r"slide(\d+)\.xml", tgt)
            return {"target_slide": int(m.group(1)) if m else None, "rId": rid}
    return None

def extract_text_boxes(root, rels_dir, slide_num):
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
        # hyperlink if present
        hlink = sp.find(".//a:rPr/a:hlinkClick", NS)
        rid = hlink.get(f"{{{NS['r']}}}id") if hlink is not None else None
        hyperlink = resolve_hyperlink(rels_dir, slide_num, rid) if rid else None

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
    # connectors (straight)
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
        head  = shp.find(".//a:ln/a:headEnd", NS)
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
        ranked = sorted(lines, key=lambda ln: min(dist2(tc, (ln["start_point"]["x"], ln["start_point"]["y"])),
                                                  dist2(tc, (ln["end_point"]["x"],   ln["end_point"]["y"]))))
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

    texts = extract_text_boxes(root, args.rels_dir, args.slide)
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
