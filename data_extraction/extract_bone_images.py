"""
Sprint 3: Extract Bone Images from PowerPoint
Extracts images from slides and names them based on hyperlinked bone labels.
"""
import os
import xml.etree.ElementTree as ET
import shutil

# Paths - update these to match your folder structure
slides_dir = "boneypelvis_ppt/slides"
rels_dir = "boneypelvis_ppt/rels"
media_dir = "boneypelvis_ppt/media"
output_dir = "extracted_bone_images"

os.makedirs(output_dir, exist_ok=True)

def get_hyperlinked_bone_names(slide_path):
    """Extract text labels that have hyperlinks - these are the bone names."""
    tree = ET.parse(slide_path)
    root = tree.getroot()
    ns = {
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    }
    
    bone_names = []
    # Look for text runs that have hyperlinks in their properties
    for run in root.findall('.//a:r', ns):
        props = run.find('a:rPr', ns)
        if props is not None:
            hlink = props.find('a:hlinkClick', ns)
            if hlink is not None:
                text_elem = run.find('a:t', ns)
                if text_elem is not None and text_elem.text:
                    name = text_elem.text.strip()
                    if name and name not in bone_names:
                        bone_names.append(name)
    
    return bone_names

def get_images_from_rels(rels_path):
    """Parse .rels file line by line, looking for image relationships only."""
    tree = ET.parse(rels_path)
    root = tree.getroot()
    images = {}
    
    # Read line by line (element by element)
    for rel in root.findall('.//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
        rel_type = rel.get('Type', '')
        # Only process image relationships - ignore charts, themes, layouts, etc.
        if '/image' in rel_type:
            images[rel.get('Id')] = rel.get('Target')
    
    return images

def process_slide(slide_num):
    """Process one slide: extract images and name based on hyperlinked bone names."""
    print(f"\nProcessing Slide {slide_num}...")
    
    slide_path = f"{slides_dir}/slide{slide_num}.xml"
    rels_path = f"{rels_dir}/slide{slide_num}.xml.rels"
    
    # Get hyperlinked bone names from slide
    bone_names = get_hyperlinked_bone_names(slide_path)
    
    # Determine primary bone name (first hyperlinked bone or use slide number)
    if bone_names:
        primary_bone = bone_names[0].lower().replace(" ", "_")
    else:
        primary_bone = f"slide{slide_num}"
    
    # Get images from .rels (only image relationships)
    images = get_images_from_rels(rels_path)
    
    if not images:
        print(f"  No images found on slide {slide_num}")
        print(f"✓ Slide {slide_num} complete\n")
        return
    
    # Copy and rename images
    for idx, (rid, target) in enumerate(images.items()):
        image_file = os.path.basename(target)
        source = f"{media_dir}/{image_file}"
        
        # Name images based on bone and view
        view = "lateral" if idx == 0 else "medial" if idx == 1 else f"view{idx+1}"
        ext = os.path.splitext(image_file)[1]
        dest = f"{output_dir}/{primary_bone}_{view}{ext}"
        
        shutil.copy2(source, dest)
        print(f"  Extracted: {image_file} -> {primary_bone}_{view}{ext}")
    
    # Confirm completion after each slide
    print(f"✓ Slide {slide_num} complete ({len(images)} images extracted)\n")

# Main execution
print("="*60)
print("BONE IMAGE EXTRACTION - Sprint 3")
print("="*60)

# Get all slide numbers (starting from slide 2)
slide_files = [f for f in os.listdir(slides_dir) if f.startswith('slide') and f.endswith('.xml')]
slide_nums = sorted([int(f.replace('slide', '').replace('.xml', '')) for f in slide_files if f[5:-4].isdigit()])
slide_nums = [n for n in slide_nums if n >= 2]

print(f"Found {len(slide_nums)} slides to process: {slide_nums}\n")

# Process each slide sequentially
for num in slide_nums:
    process_slide(num)

print("="*60)
print("EXTRACTION COMPLETE!")
print("="*60)
print(f"All images saved to: {output_dir}")
print(f"Total slides processed: {len(slide_nums)}")
