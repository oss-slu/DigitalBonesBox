import xml.etree.ElementTree as ET
import json
import os

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
                x, y = int(pos.attrib.get("x", 0)), int(pos.attrib.get("y", 0))
                width, height = int(size.attrib.get("cx", 0)), int(size.attrib.get("cy", 0))
                
                # Range in which the descriptions are held
                if x > 8011000 and y > 3000000:  
                    text_elements = sp.findall(".//a:t", ns)
                    bullet_points = [t.text for t in text_elements if t.text and t.text != 'No Labels']
                    
                    if bullet_points:
                        if bone_name == "Unknown":
                            bone_name = bullet_points[0]  # Assign first extracted text as the bone name
                            bullet_points = bullet_points[1:]  # Remove name from descriptions
                        descriptions.extend(bullet_points)
    
    bone_data = {
        "name": bone_name,
        "id": bone_name.lower().replace(" ", "_"),  # Generate an ID from the name
        "description": descriptions
    }
    
    with open(output_json_path, 'w') as f:
        json.dump(bone_data, f, indent=4)
    
    print(f"Descriptions saved to {output_json_path}")

# Example usage
xml_file = "/Users/joshbudzynski/Downloads/example_folder/ppt/slides/slide3.xml"
output_json = "slide3_Descriptions.json"
parse_slide_xml(xml_file, output_json)
