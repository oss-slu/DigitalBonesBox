"""
Sprint 3: Extract Bone Images from PowerPoint
Extracts images from slides and names them based on the bone featured on that slide.
Each slide focuses on a specific bone (Ilium, Ischium, Pubis, or Bony Pelvis overview).
"""
import os
import sys
import xml.etree.ElementTree as ET
import shutil
import re

slides_dir = "ppt/slides"
rels_dir = "ppt/slides/_rels"
media_dir = "ppt/media"
output_dir = "extracted_bone_images"

os.makedirs(output_dir, exist_ok=True)

def sanitize_filename(name):
    """Remove or replace characters that aren't safe for filenames."""
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = name.replace(' ', '_').lower()
    return name

def get_slide_bone_name(slide_path):
    """
    Extract the primary bone name from the slide. 
    Strategy: Look for bone names in description text (right panel with bullet points)
    This is more reliable than looking for formatting.
    
    Returns the bone name (e.g., "Ilium", "Ischium", "Pubis", "Bony Pelvis")
    """
    tree = ET.parse(slide_path)
    root = tree.getroot()
    ns = {
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    }
    
    bone_keywords = ['Ilium', 'Ischium', 'Pubis']
    
    # Strategy: Look for shapes that contain descriptive text (bullet points)
    # These shapes will have the bone name as a header followed by description text
    # Example: "Ilium" followed by "The Ilium forms the superior part..."
    
    candidate_bones = []
    
    for shape in root.findall('.//p:sp', ns):
        shape_text = []
        has_bullets = False
        
        # Collect all text in this shape
        for text_elem in shape.findall('.//a:t', ns):
            if text_elem.text:
                shape_text.append(text_elem.text.strip())
        
        # Check if this shape has bullet points (description area)
        for para in shape.findall('.//a:p', ns):
            bullet = para.find('.//a:buNone', ns) or para.find('.//a:buChar', ns) or para.find('.//a:buAutoNum', ns)
            if bullet is None:  # If buNone is NOT present, there ARE bullets
                ppr = para.find('.//a:pPr', ns)
                if ppr is not None:
                    has_bullets = True
        
        # Join all text and check for bone descriptions
        full_text = ' '.join(shape_text)
        
        # Look for specific bone descriptions
        if 'forms the superior part' in full_text.lower() or 'superior part of the bony pelvis' in full_text.lower():
            candidate_bones.append(('Ilium', 100))  # High priority
        elif 'inferoposterior part' in full_text.lower() or 'posterior to the pubis' in full_text.lower():
            candidate_bones.append(('Ischium', 100))  # High priority
        elif 'anteroinferior part' in full_text.lower() or 'connects the two pelvic bones' in full_text.lower():
            candidate_bones.append(('Pubis', 100))  # High priority
        
        # Also check for standalone bone name headers
        for text in shape_text:
            for keyword in bone_keywords:
                if text == keyword and has_bullets:
                    candidate_bones.append((keyword, 90))
                elif text == keyword:
                    candidate_bones.append((keyword, 50))
    
    # Return the highest priority match
    if candidate_bones:
        candidate_bones.sort(key=lambda x: x[1], reverse=True)
        return candidate_bones[0][0]
    
    # Fallback: if no description found, return "Bony Pelvis"
    return "Bony Pelvis"

def get_images_from_rels(rels_path):
    """
    Parse .rels file line by line, looking for image relationships only.
    Returns dict mapping rId -> image filename
    """
    tree = ET.parse(rels_path)
    root = tree.getroot()
    images = {}
    
    # Read line by line (element by element)
    for rel in root.findall('.//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
        rel_type = rel.get('Type', '')
        # Only process image relationships - ignore charts, themes, layouts, etc.
        if '/image' in rel_type:
            rid = rel.get('Id')
            target = rel.get('Target')
            images[rid] = target
    
    return images

def get_image_rids_from_slide(slide_path):
    """
    Find all rIds that reference images in the slide XML.
    Returns a list of rIds in the order they appear (first = lateral, second = medial).
    """
    tree = ET.parse(slide_path)
    root = tree.getroot()
    ns = {
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    }
    
    image_rids = []
    
    # Look for image references (blip elements contain image rIds)
    for blip in root.findall('.//a:blip', ns):
        rid = blip.get('{%s}embed' % ns['r'])
        if rid and rid not in image_rids:
            image_rids.append(rid)
    
    return image_rids

def process_slide(slide_num):
    """
    Process one slide: extract images and name based on the bone featured on that slide.
    Each slide shows a specific bone with lateral and medial views.
    """
    print(f"\n{'='*60}")
    print(f"Processing Slide {slide_num}...")
    print('='*60)
    
    slide_path = f"{slides_dir}/slide{slide_num}.xml"
    rels_path = f"{rels_dir}/slide{slide_num}.xml.rels"
    
    # Check if files exist
    if not os.path.exists(slide_path):
        print(f"⚠ Slide file not found: {slide_path}")
        return
    if not os.path.exists(rels_path):
        print(f"⚠ Rels file not found: {rels_path}")
        return
    
    # Get the bone name this slide is about
    bone_name = get_slide_bone_name(slide_path)
    
    if not bone_name:
        print(f"⚠ Could not identify bone name for slide {slide_num}")
        print(f"  Skipping this slide...")
        return
    
    print(f"Identified bone: {bone_name}")
    
    # Get image rIds from slide (in order: lateral, then medial)
    image_rids = get_image_rids_from_slide(slide_path)
    
    # Get image files from .rels (only image relationships)
    rid_to_image = get_images_from_rels(rels_path)
    
    # Filter to only image rIds that exist in both places
    actual_images = [(rid, rid_to_image[rid]) for rid in image_rids if rid in rid_to_image]
    
    if not actual_images:
        print(f"⚠ No images found on slide {slide_num}")
        return
    
    print(f"Found {len(actual_images)} image(s) to extract")
    
    # Sanitize bone name for filename
    clean_bone_name = sanitize_filename(bone_name)
    
    # Extract and rename images
    views = ['lateral', 'medial', 'view3', 'view4']  # Handle up to 4 images per slide
    
    for idx, (rid, target) in enumerate(actual_images):
        image_file = os.path.basename(target)
        source = f"{media_dir}/{image_file}"
        
        # Check if source exists
        if not os.path.exists(source):
            print(f"  ⚠ Source image not found: {source}")
            continue
        
        # Determine view name
        view = views[idx] if idx < len(views) else f"view{idx+1}"
        
        # Get file extension
        ext = os.path.splitext(image_file)[1]
        
        # Create destination filename: slide{num}_{bone_name}_{view}.{ext}
        dest_filename = f"slide{slide_num}_{clean_bone_name}_{view}{ext}"
        dest = f"{output_dir}/{dest_filename}"
        
        # Copy the image
        shutil.copy2(source, dest)
        print(f"  ✓ {image_file} -> {dest_filename}")
    
    # Confirm completion after each slide
    print(f"\n✓ Slide {slide_num} complete ({len(actual_images)} images extracted)")

def main():
    """Main function to process slides - allows single slide or all slides."""
    print("\n" + "="*60)
    print("BONE IMAGE EXTRACTION - Sprint 3")
    print("="*60)
    print("Extracts images from PowerPoint slides and names them")
    print("based on the bone featured on each slide.")
    print("="*60 + "\n")
    
    # Allow user to specify which slide to process
    if len(sys.argv) > 1:
        try:
            slide_num = int(sys.argv[1])
            if slide_num < 2:
                print("Error: Slide number must be 2 or greater (slide 1 is title slide)")
                return
            slide_nums = [slide_num]
            print(f"Mode: Single slide processing")
            print(f"Target: Slide {slide_num}\n")
        except ValueError:
            print("Error: Slide number must be an integer")
            print("Usage: python extract_bone_images.py [slide_number]")
            print("Example: python extract_bone_images.py 2")
            return
    else:
        # Default: get all slide numbers (starting from slide 2)
        try:
            slide_files = [f for f in os.listdir(slides_dir) if f.startswith('slide') and f.endswith('.xml')]
            slide_nums = sorted([int(f.replace('slide', '').replace('.xml', '')) for f in slide_files if f[5:-4].isdigit()])
            slide_nums = [n for n in slide_nums if n >= 2]
            
            if not slide_nums:
                print("Error: No slide files found!")
                return
                
            print(f"Mode: Batch processing")
            print(f"Found {len(slide_nums)} slides to process: {slide_nums}\n")
        except FileNotFoundError:
            print(f"Error: Slides directory not found: {slides_dir}")
            print("Make sure the 'ppt/slides' folder exists in your current directory")
            return
    
    # Process each slide sequentially
    for num in slide_nums:
        process_slide(num)
    
    print("\n" + "="*60)
    print("EXTRACTION COMPLETE!")
    print("="*60)
    print(f"Output directory: {output_dir}")
    print(f"Total slides processed: {len(slide_nums)}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
