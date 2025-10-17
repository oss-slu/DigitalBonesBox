import argparse, json, os, re, math
import xml.etree.ElementTree as ET

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
R_ID_KEY = "{%s}id" % NS["r"]

# --------------------------- helpers ---------------------------

def emu_box(xfrm):
    off = xfrm.find("a:off", NS); ext = xfrm.find("a:ext", NS)
    x = float(off.get("x")); y = float(off.get("y"))
    w = float(ext.get("cx")); h = float(ext.get("cy"))
    rot_emu = float(xfrm.get("rot") or 0.0)
    return {"x": x, "y": y, "width": w, "height": h, "rotation_emu": rot_emu}

def is_white_color(solid_fill):
    if solid_fill is None: return False
    srgb = solid_fill.find("a:srgbClr", NS)
    if srgb is not None: return srgb.get("val","").upper() == "FFFFFF"
    scheme = solid_fill.find("a:schemeClr", NS)
    return scheme is not None and scheme.get("val") in ("lt1","bg1")

def text_is_white(sp):
    for rpr in sp.findall(".//a:rPr", NS):
        if is_white_color(rpr.find("a:solidFill", NS)):
            return True
    return False

def line_is_white(shape):
    ln = shape.find(".//a:ln", NS)
    return is_white_color(ln.find("a:solidFill", NS)) if ln is not None else False

def build_rels_map(rels_path):
    m = {}
    if not os.path.exists(rels_path): return m
    root = ET.parse(rels_path).getroot()
    for rel in root.findall(f".//{{{PKG_REL_NS}}}Relationship"):
        rid = rel.attrib.get("Id")
        if rid:
            m[rid] = {"Type": rel.attrib.get("Type",""), "Target": rel.attrib.get("Target","")}
    return m

def _link_payload(rid, rels_map):
    info = {"rId": rid, "target": (rels_map.get(rid) or {}).get("Target","")}
    m = re.search(r"slide(\d+)\.xml", info["target"])
    if m: info["target_slide"] = int(m.group(1))
    return info

def resolve_hyperlink_for_shape(shape_el, rels_map):
    cNvPr = shape_el.find("./p:nvSpPr/p:cNvPr", NS)
    if cNvPr is not None:
        hl = cNvPr.find("a:hlinkClick", NS)
        if hl is not None and R_ID_KEY in hl.attrib:
            return _link_payload(hl.attrib[R_ID_KEY], rels_map)
    for rPr in shape_el.findall(".//a:rPr", NS):
        hl = rPr.find("a:hlinkClick", NS)
        if hl is not None and R_ID_KEY in hl.attrib:
            return _link_payload(hl.attrib[R_ID_KEY], rels_map)
    return None

def rect_contains_with_padding(rect, x, y, pad):
    return (rect["x"]-pad <= x <= rect["x"]+rect["width"]+pad and
            rect["y"]-pad <= y <= rect["y"]+rect["height"]+pad)

def snap_point(pt, snap):
    return (round(pt[0]/snap)*snap, round(pt[1]/snap)*snap)

def rot_cos_sin(emu):
    # 60000 EMUs = 1 degree
    ang = (emu/60000.0) * math.pi/180.0
    return math.cos(ang), math.sin(ang)

# Given a line's a:xfrm box, compute **true endpoints** accounting for rotation.
def endpoints_from_xfrm(xfrm):
    box = emu_box(xfrm)
    cx, cy = box["width"]/2.0, box["height"]/2.0
    cx0, cy0 = box["x"] + cx, box["y"] + cy  # center
    c, s = rot_cos_sin(box["rotation_emu"])
    # vector from center to corner of bbox (cx,cy) rotated; endpoints are +/- that vector
    vx, vy = (c*cx - s*cy), (s*cx + c*cy)
    p1 = (cx0 - vx, cy0 - vy)
    p2 = (cx0 + vx, cy0 + vy)
    return p1, p2, box

# ---------------------- extraction: texts ----------------------

def extract_text_boxes(root, rels_map, bone_set="Bony Pelvis"):
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
        cNv = sp.find("./p:nvSpPr/p:cNvPr", NS)
        out.append({
            "annotation_id": f"annot_{len(out)+1}",
            "bone_name": bone_set,
            "subbone_name": text,
            "text_content": text,
            "text_box": emu_box(xfrm) | {"shape_id": cNv.get("id") if cNv is not None else None},
            "has_hyperlink": hyperlink is not None,
            "hyperlink": hyperlink or {}
        })
    return out

# ---------------------- extraction: lines ----------------------

def _collect_line_shape(shp, kind, lines):
    if not line_is_white(shp):
        return
    xfrm = shp.find(".//a:xfrm", NS)
    if xfrm is None:
        return
    p1, p2, box = endpoints_from_xfrm(xfrm)
    ln = shp.find(".//a:ln", NS)
    width = int(ln.get("w") or 0) if ln is not None else 0
    head = ln.find("a:headEnd", NS) if ln is not None else None
    cNv = shp.find(f"./p:nv{'CxnSp' if kind=='connector' else 'Sp'}Pr/p:cNvPr", NS)
    lines.append({
        "line_id": f"line_{len(lines)+1}",
        "kind": kind,
        "start_point": {"x": p1[0], "y": p1[1]},
        "end_point":   {"x": p2[0], "y": p2[1]},
        "style": {"width": width, "arrow_head": (head.get("type") if head is not None else "none")},
        "shape_id": cNv.get("id") if cNv is not None else None,
        "bbox": box
    })

def extract_lines(root):
    lines = []
    for shp in root.findall(".//p:cxnSp", NS):   # connectors
        _collect_line_shape(shp, "connector", lines)
    # simple line shapes (p:sp with no text, but with stroke)
    for shp in root.findall(".//p:sp", NS):
        if shp.find(".//p:txBody", NS) is None and shp.find(".//a:ln", NS) is not None:
            _collect_line_shape(shp, "line", lines)
    return lines

# -------------------- graph + connection logic --------------------

def build_graph(lines, snap):
    nodes = {}           # snapped point -> index
    deg = {}             # degree per node
    edges = []           # (u, v, line_obj)
    def add_node(pt):
        key = snap_point(pt, snap)
        if key not in nodes:
            nodes[key] = len(nodes)
            deg[nodes[key]] = 0
        return nodes[key], key
    for ln in lines:
        u, uk = add_node((ln["start_point"]["x"], ln["start_point"]["y"]))
        v, vk = add_node((ln["end_point"]["x"], ln["end_point"]["y"]))
        edges.append((u, v, ln))
        deg[u] += 1; deg[v] += 1
    adj = {i: [] for i in range(len(nodes))}
    for u, v, ln in edges:
        adj[u].append((v, ln)); adj[v].append((u, ln))
    inv_nodes = {idx: pt for pt, idx in nodes.items()}
    return adj, inv_nodes, deg

def follow_from_label(text_box, adj, inv_nodes, deg, pad):
    # start nodes: any graph node inside/on the padded text box
    starts = [i for i, (x,y) in inv_nodes.items() if rect_contains_with_padding(text_box, x, y, pad)]
    visited_nodes, visited_edges = set(), set()
    terminals = set()
    stack = starts[:]
    while stack:
        cur = stack.pop()
        if cur in visited_nodes: 
            continue
        visited_nodes.add(cur)
        is_touching_label = rect_contains_with_padding(text_box, *inv_nodes[cur], pad)
        for nxt, ln in adj.get(cur, []):
            eid = id(ln)
            if eid not in visited_edges:
                visited_edges.add(eid)
            if nxt not in visited_nodes:
                stack.append(nxt)
        # terminal if degree==1 and not touching label
        if deg.get(cur, 0) <= 1 and not is_touching_label:
            terminals.add(cur)
    return list(terminals), list(visited_edges)

# ----------------------------- main flow -----------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slides-dir", required=True)
    ap.add_argument("--rels-dir", required=True)
    ap.add_argument("--slide", type=int, required=True)
    ap.add_argument("--out")
    ap.add_argument("--padding", type=float, default=4000.0, help="EMU padding around text box")
    ap.add_argument("--snap", type=float, default=8000.0, help="EMU snap size for junctions")
    args = ap.parse_args()

    slide_xml = os.path.join(args.slides_dir, f"slide{args.slide}.xml")
    rels_xml  = os.path.join(args.rels_dir,   f"slide{args.slide}.xml.rels")
    root = ET.parse(slide_xml).getroot()
    rels_map = build_rels_map(rels_xml)

    texts = extract_text_boxes(root, rels_map, bone_set="Bony Pelvis")
    lines = extract_lines(root)
    adj, inv_nodes, deg = build_graph(lines, snap=args.snap)

    # connection-based association
    for t in texts:
        terminals, used_edges = follow_from_label(t["text_box"], adj, inv_nodes, deg, pad=args.padding)
        # dedupe nearly-identical terminals by snapped point
        term_pts = []
        seen = set()
        for idx in terminals:
            pt = inv_nodes[idx]
            if pt not in seen:
                seen.add(pt)
                term_pts.append({"x": pt[0], "y": pt[1]})
        # collect the actual line objects that were traversed
        pointer_lines = []
        used = set()
        for u in adj:
            for v, ln in adj[u]:
                eid = id(ln)
                if eid in used_edges and eid not in used:
                    used.add(eid)
                    pointer_lines.append(ln)
        # keep outputs small & stable
        pointer_lines.sort(key=lambda ln: (ln["shape_id"] or 0, ln["line_id"]))
        # sort target points by distance from the label center
        tcx = t["text_box"]["x"] + t["text_box"]["width"] / 2.0
        tcy = t["text_box"]["y"] + t["text_box"]["height"] / 2.0
        term_pts.sort(key=lambda p: (p["x"] - tcx)**2 + (p["y"] - tcy)**2)
        
        t["pointer_lines"] = pointer_lines
        t["target_regions"] = term_pts

    payload = {
        "slide_number": args.slide,
        "text_annotations": texts,
        "total_text_annotations": len(texts),
        "config": {"padding_emu": args.padding, "snap_emu": args.snap}
    }

    out_path = args.out or f"data_extraction/annotations/slide{args.slide}_text_annotations.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote {out_path}")

if __name__ == "__main__":
    main()
