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
    
    # Extract bone name (first meaningful text element)
    bone_name = "Unknown"
    bone_name_idx = 0
    
    # Look for bone name - prefer standalone short titles
    for i, text in enumerate(all_text_content):
        # Skip spacing-only text, labels, and very long text
        if len(text) < 50 and text not in ['', 'No Labels', '   ']:
            # Check if this looks like a bone name (short, standalone)
            if any(keyword in text for keyword in ['Pelvis', 'Ilium', 'Ischium', 'Pubis', 'Femur', 'Tibia', 'Fibula', 'Patella', 'Humerus', 'Radius', 'Ulna', 'Scapula', 'Clavicle', 'Vertebra', 'Skull', 'Cranium', 'Mandible', 'Maxilla']):
                bone_name = text
                bone_name_idx = i
                break
    
    # If no bone keyword found, use first non-empty text
    if bone_name == "Unknown" and all_text_content:
        bone_name = all_text_content[0]
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
    
    return bone_data

def process_all_slides(output_path=output_filename):
    # Discover all slides
    try:
        if not os.path.exists(slides_dir):
            print(f"[ERROR] Slides directory not found: {slides_dir}")
            print("Make sure the 'ppt/slides' folder exists in your current directory")
            return False
        
        slide_files = [f for f in os.listdir(slides_dir) 
                      if f.startswith('slide') and f.endswith('.xml')]
        
        # Extract slide numbers and sort them
        slide_nums = sorted([int(f.replace('slide', '').replace('.xml', '')) 
                           for f in slide_files if f[5:-4].isdigit()])
        
        # Skip slide 1 (title slide) and process remaining slides
        slide_nums = [n for n in slide_nums if n >= 2]
        
        if not slide_nums:
            print("[ERROR] No slides found (need at least slide 2)")
            return False
        
        print("\n" + "="*70)
        print("BONE DESCRIPTION EXTRACTION - ALL SLIDES")
        print("="*70)
        print(f"Mode: Batch processing all slides")
        print(f"Found {len(slide_nums)} slides to process: {slide_nums}")
        print("="*70 + "\n")
        
    except FileNotFoundError as e:
        print(f"[ERROR] Could not access slides directory: {e}")
        return False
    
    # Process each slide and collect results
    all_descriptions = []
    processed_count = 0
    skipped_count = 0
    
    for slide_num in slide_nums:
        slide_path = f"{slides_dir}/slide{slide_num}.xml"
        
        print(f"Processing slide {slide_num}... ", end="", flush=True)
        
        bone_data = extract_descriptions_from_slide(slide_path)
        
        if bone_data is None:
            print("[SKIPPED - Parse Error]")
            skipped_count += 1
            continue
        
        if bone_data["name"] != "Unknown" and bone_data["description"]:
            all_descriptions.append(bone_data)
            print(f"✓ {bone_data['name']} ({len(bone_data['description'])} descriptions)")
            processed_count += 1
        else:
            print("[SKIPPED - No descriptions found]")
            skipped_count += 1
    
    # Write combined output
    output_data = {
        "metadata": {
            "source": "Extract_Bone_Descriptions.py",
            "total_slides_processed": len(slide_nums),
            "total_bones_extracted": processed_count,
            "total_slides_skipped": skipped_count
        },
        "bones": all_descriptions
    }
    
    try:
        with open(output_path, 'w') as f:
            json.dump(output_data, f, indent=4)
        print("\n" + "="*70)
        print("EXTRACTION COMPLETE!")
        print("="*70)
        print(f"Output file: {output_path}")
        print(f"Total slides processed: {processed_count}")
        print(f"Total slides skipped: {skipped_count}")
        print("="*70 + "\n")
        return True
    except IOError as e:
        print(f"\n[ERROR] Could not write output file {output_path}: {e}")
        return False


def main():
    output_file = output_filename
    
    # Check for custom output filename argument
    if len(sys.argv) > 1:
        output_file = sys.argv[1]
        print(f"[INFO] Using custom output filename: {output_file}")
    
    success = process_all_slides(output_file)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
