import xml.etree.ElementTree as ET
import os

def process_slide_without_images(slide_xml_path, rels_file_path, output_dir):
    
    try: 
        slide_tree = ET.parse(slide_xml_path)
        slide_root = slide_tree.getroot()
        print("Slide XML parsed successfully.")

    except Exception as e:
        print (f"Error parsing slide XML: {e}")

    rels_ns = {'rel': 'http://schemas.openxmlformats.org/package/2006/relationships'}
    try:
        rels_tree = ET.parse(rels_file_path)
        rels_root = rels_tree.getroot()

        # Extract relationships
        rels_map = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rels_root.findall("rel:Relationship", rels_ns)
        }
        print(f"Relationships mapped: {rels_map}")
    except Exception as e:
        print(f"Error parsing .rels file: {e}")
        return
    
    # Ensure the output directory exists
    os.makedirs(output_dir, exist_ok=True)
    print(f"Output directory checked/created: {output_dir}")


