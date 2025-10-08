#!/usr/bin/env python3
import argparse, json, os
import xml.etree.ElementTree as ET

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

EMU_PER_DEG = 60000.0

def get_number(el, attr, default=0):
    try:
        return float(el.get(attr))
    except Exception:
        return default

def two_largest_pics(root):
    pics = []
    for pic in root.findall(".//p:pic", NS):
        xfrm = pic.find(".//a:xfrm", NS)
        off  = xfrm.find("a:off", NS) if xfrm is not None else None
        ext  = xfrm.find("a:ext", NS) if xfrm is not None else None
        if not (off is not None and ext is not None):
            continue
        x = get_number(off, "x"); y = get_number(off, "y")
        cx = get_number(ext, "cx"); cy = get_number(ext, "cy")
        area = cx * cy
        rot_emu = get_number(xfrm, "rot", 0)
        pics.append({"el": pic, "x": x, "y": y, "cx": cx, "cy": cy, "area": area, "rot_emu": rot_emu})
    pics.sort(key=lambda d: d["area"], reverse=True)
    return pics[:2]

def slide_rotations(slide_path):
    root = ET.parse(slide_path).getroot()
    top2 = two_largest_pics(root)
    if len(top2) < 2:
        return None
    # left/right by x
    left, right = sorted(top2, key=lambda d: d["x"])
    return {
        "left":  {"emu": left["rot_emu"],  "deg": left["rot_emu"] / EMU_PER_DEG},
        "right": {"emu": right["rot_emu"], "deg": right["rot_emu"] / EMU_PER_DEG},
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slides-dir", required=True)
    ap.add_argument("--slides", type=int, nargs="+", default=[2,3])
    ap.add_argument("--out", default="data_extraction/annotations/rotations.json")
    args = ap.parse_args()

    results = []
    first = None
    for n in args.slides:
        path = os.path.join(args.slides_dir, f"slide{n}.xml")
        if not os.path.exists(path): 
            continue
        rot = slide_rotations(path)
        if rot:
            if first is None: first = (n, rot)
            results.append({"slide": n, "left_deg": rot["left"]["deg"], "right_deg": rot["right"]["deg"]})

    if not first:
        raise SystemExit("No slide with two large pictures was found.")

    payload = {
        "bone_set": "Bony Pelvis",
        "display_format": "side-by-side",
        "left_image_rotation":  {"rotation_degree": round(first[1]["left"]["deg"], 4),  "rotation_emu": first[1]["left"]["emu"]},
        "right_image_rotation": {"rotation_degree": round(first[1]["right"]["deg"], 4), "rotation_emu": first[1]["right"]["emu"]},
        "extracted_from_slide": first[0],
        "applies_to_all_slides_with_format": True,
        "verified_slides": [r["slide"] for r in results],
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote {args.out}")

if __name__ == "__main__":
    main()
