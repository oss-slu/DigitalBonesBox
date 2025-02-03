import os
import xml.etree.ElementTree as ET

def extract_images_from_slide_xml(slide_xml_path, rels_xml_path, media_folder, output_folder):
    try:
        tree = ET.parse(slide_xml_path)
        root = tree.getroot()
    except ET.ParseError:
        print(f"Error parsing {slide_xml_path}")
        return

    ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
          'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
    
    embed_ids = [blip.attrib.get(f"{{{ns['r']}}}embed") for blip in root.findall(".//a:blip", ns) if blip.attrib.get(f"{{{ns['r']}}}embed")]
    if not embed_ids:
        return

    try:
        rels_tree = ET.parse(rels_xml_path)
        rels_root = rels_tree.getroot()
    except ET.ParseError:
        print(f"Error parsing {rels_xml_path}")
        return

    rels_ns = rels_root.tag.split('}')[0] + '}' if '}' in rels_root.tag else ''
    relationships = {rel.attrib.get('Id', '').strip(): rel.attrib.get('Target', '').strip() for rel in rels_root.findall(f".//{rels_ns}Relationship")}
    
    for embed_id in embed_ids:
        if embed_id in relationships:
            target = relationships[embed_id]
            image_path = os.path.join(media_folder, os.path.basename(target))
            if os.path.exists(image_path):
                slide_name = os.path.splitext(os.path.basename(slide_xml_path))[0]
                slide_output_folder = os.path.join(output_folder, slide_name)
                if not os.path.exists(slide_output_folder):
                    os.makedirs(slide_output_folder)
                image_output_path = os.path.join(slide_output_folder, os.path.basename(target))
                with open(image_path, 'rb') as img_in, open(image_output_path, 'wb') as img_out:
                    img_out.write(img_in.read())
                    print(f"Extracted: {image_output_path}")

def process_pptx_folders(slides_folder, rels_folder, media_folder, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    for slide_file in sorted(os.listdir(slides_folder)):
        if slide_file.startswith("slide") and slide_file.endswith(".xml"):
            slide_path = os.path.join(slides_folder, slide_file)
            rels_path = os.path.join(rels_folder, slide_file + ".rels")
            if os.path.exists(rels_path):
                extract_images_from_slide_xml(slide_path, rels_path, media_folder, output_folder)

if __name__ == "__main__":
    slides_folder = "/Users/burhankhan/Desktop/ppt/slides"
    rels_folder = "/Users/burhankhan/Desktop/ppt/slides/_rels"
    media_folder = "/Users/burhankhan/Desktop/ppt/media"
    output_folder = "/Users/burhankhan/Desktop/AutomatedScript"
    process_pptx_folders(slides_folder, rels_folder, media_folder, output_folder)
