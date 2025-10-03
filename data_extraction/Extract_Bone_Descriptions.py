import xml.etree.ElementTree as ET
import json
import os

# Heuristic: the description panel lives on the right side of the slide.
RIGHT_MIN_X = 8_011_000
RIGHT_MIN_Y = 3_000_000

def parse_slide_xml(xml_file, output_json_path):
    tree = ET.parse(xml_file)
    root = tree.getroot()

    ns = {
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'
    }

    descriptions = []
    bone_name = "Unknown"

    for sp in root.findall(".//p:sp", ns):
        xfrm = sp.find(".//a:xfrm", ns)
        if xfrm is not None:
            pos = xfrm.find("a:off", ns)
            size = xfrm.find("a:ext", ns)

            if pos is not None and size is not None:
                x = int(pos.attrib.get("x", 0))
                y = int(pos.attrib.get("y", 0))
                width = int(size.attrib.get("cx", 0))   # kept for future use
                height = int(size.attrib.get("cy", 0))  # kept for future use

                # Range in which the descriptions are held (your original heuristic)
                if x > RIGHT_MIN_X and y > RIGHT_MIN_Y:
                    text_elements = sp.findall(".//a:t", ns)
                    # Keep your rule, but make it robust to case/whitespace
                    bullet_points = [
                        t.text.strip()
                        for t in text_elements
                        if t.text and t.text.strip() and t.text.strip().lower() != 'no labels'
                    ]

                    if bullet_points:
                        if bone_name == "Unknown":
                            # Assign first extracted text as the bone name
                            bone_name = bullet_points[0]
                            # Remove name from descriptions
                            bullet_points = bullet_points[1:]
                        descriptions.extend(bullet_points)

    bone_data = {
        "name": bone_name,
        "id": bone_name.lower().replace(" ", "_"),  # Generate an ID from the name
        "description": descriptions
    }

    # Write result
    with open(output_json_path, 'w') as f:
        json.dump(bone_data, f, indent=4)

    print(f"Descriptions saved to {output_json_path}")

def process_slides(slides_folder, output_dir):
    """Batch over slide XMLs and write slideN_Descriptions.json next to your other outputs."""
    os.makedirs(output_dir, exist_ok=True)
    written = 0

    # Process slide*.xml in numeric order
    for name in sorted(os.listdir(slides_folder), key=lambda n: (n.startswith("slide"), n)):
        if not (name.startswith("slide") and name.endswith(".xml")):
            continue
        xml_file = os.path.join(slides_folder, name)
        slide_base = os.path.splitext(name)[0]
        out_path = os.path.join(output_dir, f"{slide_base}_Descriptions.json")
        parse_slide_xml(xml_file, out_path)
        written += 1

    print(f"[ok] Wrote {written} description file(s) -> {output_dir}")

if __name__ == "__main__":
    # Your skull paths
    slides_folder = "data_extraction/skull/ppt/unzipped/ppt/slides"
    json_output   = "data_extraction/skull/annotations"
    process_slides(slides_folder, json_output)
