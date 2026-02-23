import xml.etree.ElementTree as ET
import json
import os
import sys

slides_dir = "ppt/slides"
output_filename = "all_bone_descriptions.json"

def extract_descriptions_from_slide(xml_file): # Extract descriptions from a single slide XML file
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
    except (ET.ParseError, FileNotFoundError) as e:
        print(f"[ERROR] Failed to parse {xml_file}: {e}")
        return None
    
    ns = {
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'
    }

    all_text_content = []
    shape_text_groups = []
    description_text = []
    
    # Iterate through all shapes in the slide
    for sp in root.findall(".//p:sp", ns):
        # Get position and size information
        xfrm = sp.find(".//a:xfrm", ns)
        in_description_region = False
        
        if xfrm is not None:
            pos = xfrm.find("a:off", ns)
            size = xfrm.find("a:ext", ns)
            
            if pos is not None and size is not None:
                x, y = int(pos.attrib.get("x", 0)), int(pos.attrib.get("y", 0))
                width, height = int(size.attrib.get("cx", 0)), int(size.attrib.get("cy", 0))
                
                # Check if shape is in the description region
                # Range in which the descriptions are held
                if x > 8011000 and y > 3000000:
                    in_description_region = True
        
        # Extract text from this shape
        text_elements = sp.findall(".//a:t", ns)
        shape_text = [t.text for t in text_elements if t.text and t.text.strip()]
        
        if shape_text:
            shape_text_groups.append(shape_text)
            all_text_content.extend(shape_text)
            
            # If this shape is in the description region, add to description_text
            if in_description_region:
                description_text.extend(shape_text)
    
    # Filter out empty strings and cleanup text
    all_text_content = [t.strip() for t in all_text_content if t and t.strip()]
    description_text = [t.strip() for t in description_text if t and t.strip()]
    
    if not all_text_content:
        return {
            "name": "Unknown",
            "id": "unknown",
            "description": []
        }
    
    # Extract bone name (first meaningful text element from description region)
    bone_name = "Unknown"
    bone_name_idx = 0
    
    # Prefer extracting bone name from description_text (the actual description region)
    search_text = description_text if description_text else all_text_content
    
    # Look for bone name - prefer standalone short titles
    for i, text in enumerate(search_text):
        # Skip spacing-only text, labels, and very long text
        if len(text) < 50 and text not in ['', 'No Labels', '   ']:
            # Check if this looks like a bone name (short, standalone)
            if any(keyword in text for keyword in ['Pelvis', 'Ilium', 'Ischium', 'Pubis', 'Femur', 'Tibia', 'Fibula', 'Patella', 'Humerus', 'Radius', 'Ulna', 'Scapula', 'Clavicle', 'Vertebra', 'Skull', 'Cranium', 'Mandible', 'Maxilla']):
                bone_name = text
                bone_name_idx = i
                break
    
    # If no bone keyword found, use first non-empty text from description region
    if bone_name == "Unknown" and search_text:
        bone_name = search_text[0]
        bone_name_idx = 0
    
    # Collect descriptions 
    descriptions = []
    if description_text: # Prefer descriptions from the defined region
        for text in description_text:
            if text and text.strip() and text not in [bone_name, '   ', 'No Labels']:
                # If first item in description_text is the bone name, skip it
                if text == bone_name and not descriptions:
                    continue
                descriptions.append(text)
    
    # If no descriptions found in region, use the old logic
    if not descriptions:
        for text_group in shape_text_groups:
            # If this group has multiple elements, it's likely a description block
            if len(text_group) > 1:
                for text in text_group:
                    if text and text.strip() and text not in [bone_name, '   ', 'No Labels']:
                        descriptions.append(text)
            # includes standalone longer text 
            elif text_group and len(text_group[0]) > 50:
                text = text_group[0]
                if text not in [bone_name, '   ', 'No Labels']:
                    descriptions.append(text)
        
        # If still not enough descriptions, use remaining text after bone name
        if not descriptions and len(all_text_content) > bone_name_idx + 1:
            descriptions = [t for t in all_text_content[bone_name_idx + 1:]
                           if t not in ['   ', 'No Labels', bone_name]]
    
    bone_data = {
        "name": bone_name,
        "id": bone_name.lower().replace(" ", "_"),  # Generate ID from name
        "description": descriptions
    }
    
    with open(output_json_path, 'w') as f:
        json.dump(bone_data, f, indent=4)
    
    print(f"Descriptions saved to {output_json_path}")

# Example usage
xml_file = "/Users/joshbudzynski/Downloads/example_folder/ppt/slides/slide3.xml"
output_json = "slide3_Descriptions.json"
parse_slide_xml(xml_file, output_json)
