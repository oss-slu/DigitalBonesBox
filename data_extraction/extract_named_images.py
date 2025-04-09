import os
import xml.etree.ElementTree as ET
import re
from shutil import copyfile
from collections import defaultdict
from PIL import Image

# CONFIGURE THESE PATHS
SLIDE_XML_FOLDER = "C:\DBB PPTS\BonyPelvis\ppt\slides"
RELS_FOLDER = "C:\DBB PPTS\BonyPelvis\ppt\slides\_rels"
MEDIA_FOLDER = "C:\DBB PPTS\BonyPelvis\ppt\media"
OUTPUT_IMAGE_FOLDER = "C:\DBB PPTS\BonyPelvis\output\images"

os.makedirs(OUTPUT_IMAGE_FOLDER, exist_ok=True)

# XML Namespaces
ns = {
    'a': "http://schemas.openxmlformats.org/drawingml/2006/main",
    'p': "http://schemas.openxmlformats.org/presentationml/2006/main",
    'r': "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
}

def normalize(text):
    return re.sub(r'\W+', '_', text.strip().lower())

def parse_relationships(rels_path):
    if not os.path.exists(rels_path): return {}
    tree = ET.parse(rels_path)
    root = tree.getroot()
    rels_ns = root.tag.split('}')[0] + '}'
    return {
        rel.attrib['Id']: rel.attrib['Target']
        for rel in root.findall(f".//{rels_ns}Relationship")
        if rel.attrib.get('Type', '').endswith('/image')
    }

def find_slide_labels(root):
    labels = set()
    for sp in root.findall('.//p:sp', ns):
        text_el = sp.find('.//a:t', ns)
        if text_el is not None and text_el.text:
            label = normalize(text_el.text)
            if label:
                labels.add(label)
    return list(labels)

def extract_images_from_slide(slide_path, rels_path, label_counter):
    slide_name = os.path.splitext(os.path.basename(slide_path))[0]
    tree = ET.parse(slide_path)
    root = tree.getroot()
    relationships = parse_relationships(rels_path)
    labels = find_slide_labels(root)

    for pic in root.findall('.//p:pic', ns):
        blip = pic.find('.//a:blip', ns)
        embed_id = blip.attrib.get(f"{{{ns['r']}}}embed") if blip is not None else None
        if not embed_id or embed_id not in relationships:
            continue

        # Get image file path
        img_file = os.path.basename(relationships[embed_id])
        source_img_path = os.path.join(MEDIA_FOLDER, img_file)
        if not os.path.exists(source_img_path):
            print(f"[⚠️] Image missing: {source_img_path}")
            continue

        # Get image description
        cNvPr = pic.find('.//p:cNvPr', ns)
        descr = cNvPr.attrib.get("descr", "image") if cNvPr is not None else "image"
        image_type = normalize(os.path.splitext(descr)[0])

        # Handle rotation
        xfrm = pic.find('.//a:xfrm', ns)
        rotation_deg = 0
        if xfrm is not None and 'rot' in xfrm.attrib:
            rotation_raw = int(xfrm.attrib['rot'])
            rotation_deg = rotation_raw // 60000  # PowerPoint stores 1/60000 deg
            print(f"[↻] Rotation detected: {rotation_deg}°")

        # Use each label or fallback to image_type
        if labels:
            for label in labels:
                label_counter[label] += 1
                output_name = f"{label}_{label_counter[label]}.png"
                dest_path = os.path.join(OUTPUT_IMAGE_FOLDER, output_name)

                # Load and rotate image
                try:
                    img = Image.open(source_img_path)
                    if rotation_deg != 0:
                        img = img.rotate(-rotation_deg, expand=True)
                    img.save(dest_path)
                    print(f"[✅] Saved image: {dest_path}")
                except Exception as e:
                    print(f"[❌] Failed to save {output_name}: {e}")
        else:
            # fallback to image_type only
            label_counter[image_type] += 1
            output_name = f"{image_type}_{label_counter[image_type]}.png"
            dest_path = os.path.join(OUTPUT_IMAGE_FOLDER, output_name)
            try:
                img = Image.open(source_img_path)
                if rotation_deg != 0:
                    img = img.rotate(-rotation_deg, expand=True)
                img.save(dest_path)
                print(f"[✅] Saved image: {dest_path}")
            except Exception as e:
                print(f"[❌] Failed to save {output_name}: {e}")

def run_all_slides():
    label_counter = defaultdict(int)
    for fname in sorted(os.listdir(SLIDE_XML_FOLDER)):
        if not fname.startswith("slide") or not fname.endswith(".xml"):
            continue
        slide_path = os.path.join(SLIDE_XML_FOLDER, fname)
        rels_path = os.path.join(RELS_FOLDER, fname + ".rels")
        extract_images_from_slide(slide_path, rels_path, label_counter)

if __name__ == "__main__":
    run_all_slides()


