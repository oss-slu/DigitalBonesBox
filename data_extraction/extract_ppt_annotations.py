import os
import xml.etree.ElementTree as ET
import json


def load_bone_data(json_directory):
    categories = ["bonesets", "bones", "subbones"]
    bone_data = {category: set() for category in categories}

    for category in categories:
        json_path = os.path.join(json_directory, f"{category}.json")
        if os.path.exists(json_path):
            with open(json_path, 'r') as file:
                try:
                    data = json.load(file)
                    if isinstance(data, list):
                        bone_data[category].update({entry.lower().replace(" ", "_") for entry in data})
                except json.JSONDecodeError as e:
                    print(f"[ERROR] Could not load {category}.json: {e}")
    return bone_data


def generate_annotation_link(text, bone_data):
    text_key = text.lower().replace(" ", "_")
    if text_key in bone_data['bonesets']:
        return f"/data/json/bonesets/{text_key}.json"
    elif text_key in bone_data['bones']:
        return f"/data/json/bones/{text_key}.json"
    elif text_key in bone_data['subbones']:
        return f"/data/json/subbones/{text_key}.json"
    return None


def extract_images_from_slide_xml(slide_xml_path, rels_xml_path, media_folder, output_folder, json_output, bone_data):
    try:
        tree = ET.parse(slide_xml_path)
        root = tree.getroot()
    except (ET.ParseError, FileNotFoundError) as e:
        print(f"[ERROR] Failed to parse {slide_xml_path}: {e}")
        return

    ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
          'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

    embed_ids = [blip.attrib.get(f"{{{ns['r']}}}embed") for blip in root.findall(".//a:blip", ns)
                 if blip.attrib.get(f"{{{ns['r']}}}embed")]

    if not embed_ids:
        print(f"[INFO] No images found in {slide_xml_path}. Skipping...")
        return

    try:
        rels_tree = ET.parse(rels_xml_path)
        rels_root = rels_tree.getroot()
    except (ET.ParseError, FileNotFoundError) as e:
        print(f"[ERROR] Failed to parse {rels_xml_path}: {e}")
        return

    rels_ns = rels_root.tag.split('}')[0] + '}' if '}' in rels_root.tag else ''

    relationships = {}
    hyperlink_names = {}
    for rel in rels_root.findall(f".//{rels_ns}Relationship"):
        rId = rel.attrib.get('Id', '').strip()
        target = rel.attrib.get('Target', '').strip()
        rel_type = rel.attrib.get('Type', '')

        relationships[rId] = target
        if 'hyperlink' in rel_type and '://' not in target:
            base_name = os.path.splitext(os.path.basename(target))[0]
            hyperlink_names[rId] = base_name.lower().replace(" ", "_")

    slide_name = os.path.splitext(os.path.basename(slide_xml_path))[0]
    slide_number = slide_name.replace("slide", "")
    slide_output_folder = os.path.join(output_folder, slide_name)
    os.makedirs(slide_output_folder, exist_ok=True)

    slide_data = {
        "slide": slide_name,
        "images": [],
        "annotations": []
    }

    for embed_id in embed_ids:
        if embed_id in relationships:
            target = relationships[embed_id]
            image_path = os.path.join(media_folder, os.path.basename(target))

            if os.path.exists(image_path):
                image_extension = os.path.splitext(target)[-1]
                name_hint = hyperlink_names.get(embed_id, embed_id)
                new_image_name = f"slide{slide_number}_{name_hint}{image_extension}"
                image_output_path = os.path.join(slide_output_folder, new_image_name)

                try:
                    with open(image_path, 'rb') as img_in, open(image_output_path, 'wb') as img_out:
                        img_out.write(img_in.read())

                    print(f"[SUCCESS] Extracted: {image_output_path}")
                    slide_data["images"].append({
                        "rId": embed_id,
                        "extracted_name": new_image_name
                    })
                except Exception as e:
                    print(f"[ERROR] Failed to copy image {image_path}: {e}")
            else:
                print(f"[WARNING] Image not found: {image_path}")

    ns_p = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
            'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}

    for sp in root.findall(".//p:sp", ns_p):
        annotation = {}
        text_elements = sp.findall(".//a:t", ns_p)
        text = ''.join([t.text for t in text_elements if t.text])

        xfrm = sp.find(".//a:xfrm", ns_p)
        if xfrm is not None:
            pos = xfrm.find("a:off", ns_p)
            size = xfrm.find("a:ext", ns_p)
            if pos is not None and size is not None:
                x, y = int(pos.attrib.get("x", 0)), int(pos.attrib.get("y", 0))
                width, height = int(size.attrib.get("cx", 0)), int(size.attrib.get("cy", 0))
                annotation["text"] = text
                annotation["position"] = {"x": x, "y": y, "width": width, "height": height}
                if text:
                    annotation["link"] = generate_annotation_link(text, bone_data)
                slide_data["annotations"].append(annotation)

    json_output_path = os.path.join(json_output, f"{slide_name}_annotations.json")
    os.makedirs(json_output, exist_ok=True)

    with open(json_output_path, 'w') as json_file:
        json.dump(slide_data, json_file, indent=4)

    print(f"[SUCCESS] JSON saved: {json_output_path}")


def process_pptx_folders(slides_folder, rels_folder, media_folder, output_folder, json_output, json_directory):
    os.makedirs(output_folder, exist_ok=True)
    os.makedirs(json_output, exist_ok=True)

    bone_data = load_bone_data(json_directory)

    for slide_file in sorted(os.listdir(slides_folder)):
        if slide_file.startswith("slide") and slide_file.endswith(".xml"):
            slide_path = os.path.join(slides_folder, slide_file)
            rels_path = os.path.join(rels_folder, slide_file + ".rels")

            if os.path.exists(rels_path):
                extract_images_from_slide_xml(slide_path, rels_path, media_folder, output_folder, json_output, bone_data)
            else:
                print(f"[WARNING] Missing relationship file: {rels_path}. Skipping {slide_file}.")


if __name__ == "__main__":
    # Folder paths (replace with your paths)
    slides_folder = "C:\DBB PPTS\BonyPelvis\ppt\slides"
    rels_folder = "C:\DBB PPTS\BonyPelvis\ppt\slides\_rels"
    media_folder = "C:\DBB PPTS\BonyPelvis\ppt\media"
    output_folder = "C:\DBB PPTS\BonyPelvis\ppt\AutomatedScript"
    json_output = "C:\DBB PPTS\BonyPelvis\ppt\json_output"
    json_directory = "C:\DBB PPTS\BonyPelvis\ppt\peoexc"

    # Run the process for all slides
    process_pptx_folders(slides_folder, rels_folder, media_folder, output_folder, json_output, json_directory)
