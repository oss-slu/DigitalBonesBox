#!/usr/bin/env python3


import xml.etree.ElementTree as ET
import json
import os
import glob
import re
import sys
from pathlib import Path


class ColorExtractor:
    """Utility class for color detection focusing on pink, green, and orange"""
    
    @staticmethod
    def hex_to_rgb(hex_color):
        """Convert hex color to RGB tuple"""
        if hex_color.startswith('#'):
            hex_color = hex_color[1:]
        if len(hex_color) == 6:
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        return None
    
    @staticmethod
    def rgb_to_hex(r, g, b):
        """Convert RGB values to hex string"""
        return f"#{r:02X}{g:02X}{b:02X}"
    
    @classmethod
    def identify_color_name(cls, hex_color):
        """Identify if a color is pink, green, or orange"""
        rgb = cls.hex_to_rgb(hex_color)
        if not rgb:
            return None
            
        r, g, b = rgb
        
        # Pink detection - broader range including light pinks and magentas
        if r > 100:  # Lowered threshold
            # Magenta/hot pink: high red, low green, any blue  
            if r > g and r > 150 and g < 150:
                if b > 100 or (r > 200 and g < 100):  # More inclusive
                    return 'pink'
            # Light pink: high red, medium-high green and blue
            if r > 150 and g > 100 and b > 100 and r >= g and r >= b:
                return 'pink'
            # Rose/salmon colors
            if r > 180 and g > 80 and g < 180 and b > 80 and b < 180:
                return 'pink'
        
        # Green detection - broader range including different green shades
        if g > 100:  # Lowered threshold
            # Pure greens: green dominates
            if g > r and g > b and g > 120:
                return 'green'
            # Light greens: high green with moderate red/blue
            if g > 150 and r < g and b < g:
                return 'green'
            # Lime greens: high green and red, low blue
            if g > 150 and r > 100 and b < 150 and g >= r:
                return 'green'
        
        # Orange detection - broader range including yellow-orange to red-orange
        if r > 150:  # More inclusive red threshold
            # Classic orange: high red, medium green, low blue
            if g > 50 and g < 220 and b < 150 and r > g and g > b:
                return 'orange'
            # Yellow-orange: high red and green, low blue
            if g > 100 and b < 100 and r > 150 and g > 100:
                return 'orange'
            # Red-orange: very high red, moderate green, low blue
            if r > 200 and g > 30 and g < 180 and b < 120:
                return 'orange'
            
        return None
class SlideParser:
    """Main class for parsing PowerPoint slide XML files"""
    
    def __init__(self, slides_folder):
        self.slides_folder = Path(slides_folder)
        self.rels_folder = self.slides_folder / "_rels"
        self.output_folder = Path("annotations")
        self.output_folder.mkdir(exist_ok=True)
        
        # XML namespaces for PowerPoint
        self.namespaces = {
            'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
            'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
            'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
        }
    
    def parse_slide_rels(self, slide_number):
        """Parse slide relationship file to get hyperlink mappings"""
        rels_file = self.rels_folder / f"slide{slide_number}.xml.rels"
        if not rels_file.exists():
            return {}
        
        try:
            tree = ET.parse(rels_file)
            root = tree.getroot()
            
            hyperlinks = {}
            for rel in root.findall('.//ns:Relationship', {'ns': 'http://schemas.openxmlformats.org/package/2006/relationships'}):
                rel_id = rel.get('Id')
                rel_type = rel.get('Type')
                target = rel.get('Target')
                
                if 'slide' in rel_type and target:
                    # Extract slide number from target
                    slide_match = re.search(r'slide(\d+)\.xml', target)
                    if slide_match:
                        target_slide = int(slide_match.group(1))
                        hyperlinks[rel_id] = target_slide
            
            return hyperlinks
        except Exception as e:
            print(f"Error parsing {rels_file}: {e}")
            return {}
    
    def extract_text_from_shape(self, shape):
        """Extract all text content from a shape"""
        texts = []
        
        # Look for text in various text containers
        for text_elem in shape.findall('.//a:t', self.namespaces):
            if text_elem.text:
                texts.append(text_elem.text.strip())
        
        return ' '.join(texts).strip()
    
    def extract_bone_subbone_names(self, shape, shape_name):
        """Extract bone and subbone names from shape text and annotations"""
        # Look for text content in the shape - search more thoroughly
        text_content = ""
        
        # Search for ALL text elements in the shape and its children
        all_text_elements = shape.findall('.//a:t', self.namespaces)
        
        for text_elem in all_text_elements:
            if text_elem is not None and text_elem.text:
                text_content += text_elem.text.strip() + " "
        
        text_content = text_content.strip()
        
        # Skip obvious UI elements - exact matches only
        ui_elements = ['Home', 'Labels', 'No labels']
        
        # Check if the text content indicates a UI element
        if text_content in ui_elements:
            return None, None
            
        # Check for "Home" pattern specifically (appears repeated)
        if 'Home' in text_content and text_content.count('Home') >= 2:
            return None, None
            
        # Check for "labels" pattern 
        if 'labels' in text_content.lower() and ('No' in text_content or text_content.count('labels') >= 2):
            return None, None
        
        # If we have meaningful anatomical text content, use it
        if text_content and len(text_content) > 3 and not text_content.startswith('Google'):
            # Split on common separators for bone/subbone
            if '/' in text_content:
                parts = text_content.split('/', 1)
                bone_name = parts[0].strip()
                subbone_name = parts[1].strip() if len(parts) > 1 else "Unknown"
            elif ' ' in text_content and len(text_content.split()) > 1:
                words = text_content.split()
                bone_name = words[0]
                subbone_name = ' '.join(words[1:])
            else:
                bone_name = text_content
                subbone_name = "Unknown"
                
            return bone_name, subbone_name
        
        # For Google Shapes without text annotation, look for nearby anatomical text
        # This is common when colored shapes don't have direct text but have labels nearby
        if 'Google Shape' in shape_name:
            return "Anatomical_Region", f"Shape_{shape_name.split(';')[1] if ';' in shape_name else 'Unknown'}"
        
        # If this looks like a Google Shape without annotation, mark it but include shape info
        if 'Google Shape' in shape_name:
            return "Anatomical_Region", f"Shape_{shape_name.split(';')[1] if ';' in shape_name else 'Unknown'}"
        
        # Otherwise, skip this shape
        return None, None
    
    def parse_slide(self, slide_number):
        """Parse a single slide XML file and extract colored regions"""
        slide_file = self.slides_folder / f"slide{slide_number}.xml"
        if not slide_file.exists():
            print(f"Slide {slide_number} not found: {slide_file}")
            return None
        
        try:
            tree = ET.parse(slide_file)
            root = tree.getroot()
            
            # Get hyperlink mappings
            hyperlinks = self.parse_slide_rels(slide_number)
            has_hyperlinks = len(hyperlinks) > 0
            
            colored_regions = []
            colors_found = set()
            
            # Find all shapes in the slide
            for shape in root.findall('.//p:sp', self.namespaces):
                region_info = self.extract_colored_region_info(shape, hyperlinks, slide_number)
                if region_info:
                    colored_regions.append(region_info)
                    colors_found.add(region_info['color']['name'])
            
            slide_data = {
                'slide_number': slide_number,
                'has_hyperlinks': has_hyperlinks,
                'colored_regions': colored_regions,
                'total_colored_regions': len(colored_regions),
                'colors_found': sorted(list(colors_found))
            }
            
            return slide_data
            
        except Exception as e:
            print(f"Error parsing slide {slide_number}: {e}")
            return None
    
    def extract_colored_region_info(self, shape, hyperlinks, slide_number):
        """Extract information from a colored shape - only anatomical regions"""
        # Get shape color
        color_info = self.get_shape_color(shape)
        if not color_info:
            return None
        
        color_name = ColorExtractor.identify_color_name(color_info['hex'])
        if not color_name:
            return None
        
        # Get shape name and ID
        shape_name = "Unknown"
        shape_id = "unknown"
        
        nv_sp_pr = shape.find('.//p:nvSpPr', self.namespaces)
        if nv_sp_pr is not None:
            c_nv_pr = nv_sp_pr.find('.//p:cNvPr', self.namespaces)
            if c_nv_pr is not None:
                shape_name = c_nv_pr.get('name', 'Unknown')
                shape_id = c_nv_pr.get('id', 'unknown')
        
        # Extract bone and subbone names - this will return None, None for UI elements
        bone_name, subbone_name = self.extract_bone_subbone_names(shape, shape_name)
        
        # Skip if this is a UI element
        if bone_name is None:
            return None
        
        # Get shape boundaries
        boundaries = self.get_shape_boundaries(shape)
        
        # Check for hyperlinks
        hyperlink_info = self.get_shape_hyperlink(shape, hyperlinks)
        
        # Get shape type
        shape_type = self.get_shape_type(shape)
        
        return {
            'bone_name': bone_name,
            'subbone_name': subbone_name,
            'color': {
                'name': color_name,
                'hex': color_info['hex'],
                'rgb': color_info['rgb']
            },
            'region_boundaries': boundaries,
            'hyperlink': hyperlink_info,
            'shape_id': shape_id,
            'shape_type': shape_type
        }
    
    def get_shape_color(self, shape):
        """Extract color information from a shape"""
        # Look for solid fill colors
        solid_fill = shape.find('.//a:solidFill', self.namespaces)
        if solid_fill is not None:
            # Try sRGB color
            srgb_clr = solid_fill.find('.//a:srgbClr', self.namespaces)
            if srgb_clr is not None:
                hex_color = f"#{srgb_clr.get('val', '000000').upper()}"
                rgb = ColorExtractor.hex_to_rgb(hex_color)
                return {
                    'hex': hex_color,
                    'rgb': f"{rgb[0]}, {rgb[1]}, {rgb[2]}" if rgb else "0, 0, 0"
                }
            
            # Try system color
            sys_clr = solid_fill.find('.//a:sysClr', self.namespaces)
            if sys_clr is not None:
                last_clr = sys_clr.get('lastClr', '000000')
                hex_color = f"#{last_clr.upper()}"
                rgb = ColorExtractor.hex_to_rgb(hex_color)
                return {
                    'hex': hex_color,
                    'rgb': f"{rgb[0]}, {rgb[1]}, {rgb[2]}" if rgb else "0, 0, 0"
                }
        
        # Look for gradient fills
        grad_fill = shape.find('.//a:gradFill', self.namespaces)
        if grad_fill is not None:
            # Take the first color from gradient
            gs = grad_fill.find('.//a:gs', self.namespaces)
            if gs is not None:
                srgb_clr = gs.find('.//a:srgbClr', self.namespaces)
                if srgb_clr is not None:
                    hex_color = f"#{srgb_clr.get('val', '000000').upper()}"
                    rgb = ColorExtractor.hex_to_rgb(hex_color)
                    return {
                        'hex': hex_color,
                        'rgb': f"{rgb[0]}, {rgb[1]}, {rgb[2]}" if rgb else "0, 0, 0"
                    }
        
        return None
    
    def get_shape_boundaries(self, shape):
        """Extract position and size information from a shape"""
        sp_pr = shape.find('.//p:spPr', self.namespaces)
        if sp_pr is not None:
            xfrm = sp_pr.find('.//a:xfrm', self.namespaces)
            if xfrm is not None:
                off = xfrm.find('.//a:off', self.namespaces)
                ext = xfrm.find('.//a:ext', self.namespaces)
                
                if off is not None and ext is not None:
                    return {
                        'x': int(off.get('x', 0)),
                        'y': int(off.get('y', 0)),
                        'width': int(ext.get('cx', 0)),
                        'height': int(ext.get('cy', 0)),
                        'rotation': int(xfrm.get('rot', 0))
                    }
        
        return {'x': 0, 'y': 0, 'width': 0, 'height': 0, 'rotation': 0}
    
    def get_shape_hyperlink(self, shape, hyperlinks):
        """Extract hyperlink information from a shape"""
        # Check for hyperlinks in various locations
        hlnk_elements = [
            shape.find('.//a:hlinkClick', self.namespaces),
            shape.find('.//a:pPr/a:hlinkClick', self.namespaces),
            shape.find('.//p:cNvPr/a:hlinkClick', self.namespaces)
        ]
        
        for hlnk_click in hlnk_elements:
            if hlnk_click is not None:
                r_id = hlnk_click.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                if r_id and r_id in hyperlinks:
                    return {
                        'has_hyperlink': True,
                        'target_slide': hyperlinks[r_id],
                        'rId': r_id
                    }
        
        return {'has_hyperlink': False}
    
    def get_shape_type(self, shape):
        """Determine the type of shape"""
        if shape.find('.//a:custGeom', self.namespaces) is not None:
            return 'freeform'
        
        prst_geom = shape.find('.//a:prstGeom', self.namespaces)
        if prst_geom is not None:
            return prst_geom.get('prst', 'unknown')
        
        return 'unknown'
    
    def sanitize_filename(self, bone_name, subbone_name):
        """Create a sanitized filename from bone and subbone names"""
        if bone_name == "Unknown" and subbone_name == "Unknown":
            return "unknown_region"
        
        if bone_name == "Unknown":
            name = subbone_name
        elif subbone_name == "Unknown":
            name = bone_name
        else:
            name = f"{bone_name}_{subbone_name}"
        
        # Remove or replace invalid characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '_', name)
        sanitized = re.sub(r'\s+', '_', sanitized)
        sanitized = sanitized.strip('._')
        
        # Limit length
        if len(sanitized) > 50:
            sanitized = sanitized[:50]
        
        return sanitized if sanitized else 'unknown_region'
    
    def process_all_slides(self):
        """Phase 1: Process all slides starting from slide 2 and extract colored regions"""
        print("Phase 1: Processing individual slides starting from slide 2...")
        
        slide_files = glob.glob(str(self.slides_folder / "slide*.xml"))
        slide_numbers = []
        
        for slide_file in slide_files:
            # Extract slide number from filename
            match = re.search(r'slide(\d+)\.xml', slide_file)
            if match:
                slide_num = int(match.group(1))
                # Skip slide 1 as per requirements
                if slide_num >= 2:
                    slide_numbers.append(slide_num)
        
        slide_numbers.sort()
        processed_slides = []
        
        for slide_num in slide_numbers:
            print(f"\nProcessing slide {slide_num}...")
            slide_data = self.parse_slide(slide_num)
            
            if slide_data and slide_data['colored_regions']:
                # Find the main annotation for the filename
                main_annotation = self.get_main_annotation_from_slide(slide_data)
                
                # Create filename based on main annotation
                if main_annotation:
                    # Simple sanitization for single annotation string
                    sanitized = re.sub(r'[<>:"/\\|?*\s]', '_', main_annotation)
                    sanitized = re.sub(r'_+', '_', sanitized)  # Replace multiple underscores
                    sanitized = sanitized.strip('_')  # Remove leading/trailing underscores
                    output_file = self.output_folder / f"slide{slide_num}_{sanitized}.json"
                else:
                    output_file = self.output_folder / f"slide{slide_num}_colored_regions.json"
                
                # Save ONE file per slide with ALL colored regions and annotations
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(slide_data, f, indent=2, ensure_ascii=False)
                
                processed_slides.append(slide_data)
                print(f"  Found {slide_data['total_colored_regions']} colored regions")
                print(f"  Colors: {', '.join(slide_data['colors_found'])}")
                print(f"  Main annotation: {main_annotation or 'No specific annotation'}")
                print(f"  Saved to: {output_file.name}")
                
            else:
                print(f"  No colored regions found - no file created")
        
        return processed_slides
    
    def get_main_annotation_from_slide(self, slide_data):
        """Extract the main anatomical annotation from a slide to use as filename"""
        # Look for the most descriptive annotation (longest meaningful text)
        best_annotation = ""
        
        # First, try to find explicitly annotated regions
        for region in slide_data['colored_regions']:
            bone_name = region['bone_name']
            subbone_name = region['subbone_name']
            
            # Skip generic names for now
            if bone_name == "Anatomical_Region":
                continue
                
            # Create full annotation
            if subbone_name and subbone_name != "Unknown":
                full_annotation = f"{bone_name}_{subbone_name}"
            else:
                full_annotation = bone_name
            
            # Choose the longest, most descriptive annotation
            if len(full_annotation) > len(best_annotation) and not full_annotation.startswith("Shape_"):
                best_annotation = full_annotation
        
        # If no explicit annotations found, try to infer from slide content
        if not best_annotation:
            # Look for anatomical keywords in the slide
            slide_keywords = self.find_anatomical_keywords_in_slide(slide_data['slide_number'])
            if slide_keywords:
                best_annotation = slide_keywords
        
        # If still no annotation, check if we can create one from the colored regions pattern
        if not best_annotation:
            colors = slide_data['colors_found']
            region_count = slide_data['total_colored_regions']
            
            # Create a descriptive name based on what we have
            if len(colors) == 1:
                color_name = colors[0]
                best_annotation = f"{color_name}_regions_{region_count}areas"
            else:
                best_annotation = f"mixed_colored_regions_{region_count}areas"
        
        return best_annotation if best_annotation else None
    
    def find_anatomical_keywords_in_slide(self, slide_number):
        """Search the slide for anatomical keywords to use as annotation"""
        slide_file = self.slides_folder / f"slide{slide_number}.xml"
        if not slide_file.exists():
            return None
        
        try:
            tree = ET.parse(slide_file)
            root = tree.getroot()
            
            # Find all text in the slide
            all_text_elements = root.findall('.//a:t', self.namespaces)
            anatomical_terms = []
            
            anatomical_keywords = ['iliac', 'pubic', 'ramus', 'acetabulum', 'ischial', 'sacrum', 
                                 'crest', 'spine', 'tuberosity', 'foramen', 'notch', 'tubercle', 
                                 'surface', 'line', 'body', 'wing', 'fossa', 'process']
            
            ui_elements = ['Home', 'Labels', 'No labels', 'Google']
            
            for text_elem in all_text_elements:
                if text_elem.text:
                    text = text_elem.text.strip()
                    
                    # Skip UI elements
                    if any(ui in text for ui in ui_elements):
                        continue
                    
                    # Skip very long text (descriptions, not labels)
                    if len(text) > 50:
                        continue
                    
                    # Check for anatomical content
                    if any(keyword in text.lower() for keyword in anatomical_keywords):
                        anatomical_terms.append(text)
            
            # Return the most descriptive but reasonably short anatomical term
            if anatomical_terms:
                # Choose terms that are descriptive but not too long
                good_terms = [term for term in anatomical_terms if 5 <= len(term) <= 50]
                
                if good_terms:
                    # Prefer terms with multiple keywords but keep them short
                    best_term = max(good_terms, key=lambda x: (
                        sum(1 for keyword in anatomical_keywords if keyword in x.lower()),
                        -len(x)  # Negative length to prefer shorter terms
                    ))
                else:
                    # If no good terms, take the shortest available
                    best_term = min(anatomical_terms, key=len)
                
                # Clean up the term for use as filename and limit length
                cleaned = re.sub(r'[<>:"/\\|?*\s]', '_', best_term)
                cleaned = re.sub(r'_+', '_', cleaned)
                cleaned = cleaned.strip('_')
                
                # Limit to reasonable filename length (max 40 chars)
                if len(cleaned) > 40:
                    cleaned = cleaned[:40]
                
                return cleaned
            
        except Exception as e:
            print(f"Error searching slide {slide_number} for keywords: {e}")
        
        return None
    
    def combine_all_slides(self):
        """Phase 2: Combine all individual slide JSON files into master file"""
        print("\nPhase 2: Combining all slide data...")
        
        json_files = glob.glob(str(self.output_folder / "slide*_colored_regions.json"))
        all_slides = []
        total_colored_regions = 0
        all_colors = set()
        slides_with_hyperlinks = []
        
        for json_file in sorted(json_files):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    slide_data = json.load(f)
                    all_slides.append(slide_data)
                    total_colored_regions += slide_data['total_colored_regions']
                    all_colors.update(slide_data['colors_found'])
                    
                    if slide_data['has_hyperlinks']:
                        slides_with_hyperlinks.append(slide_data['slide_number'])
            except Exception as e:
                print(f"Error reading {json_file}: {e}")
        
        combined_data = {
            'total_slides': len(all_slides),
            'total_colored_regions': total_colored_regions,
            'colors_used': sorted(list(all_colors)),
            'slides_with_hyperlinks': slides_with_hyperlinks,
            'slides': all_slides
        }
        
        # Save combined JSON
        output_file = self.output_folder / "all_colored_regions.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(combined_data, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Combined data saved to: {output_file}")
        print(f"✓ Total slides processed: {len(all_slides)}")
        print(f"✓ Total colored regions: {total_colored_regions}")
        print(f"✓ Colors used: {', '.join(sorted(list(all_colors)))}")
        print(f"✓ Slides with hyperlinks: {slides_with_hyperlinks}")
        
        return combined_data


def test_color_detection():
    """Test the color detection functionality"""
    print("Testing color detection...")
    
    test_colors = [
        ('#FF69B4', 'hot pink'),
        ('#FFC0CB', 'light pink'),
        ('#FF1493', 'deep pink'),
        ('#FF00FF', 'magenta'),
        ('#00FF00', 'lime green'),
        ('#32CD32', 'lime green'),
        ('#90EE90', 'light green'),
        ('#FFA500', 'orange'),
        ('#FF4500', 'orange red'),
        ('#FFD700', 'gold'),
        ('#0000FF', 'blue - should not detect'),
        ('#FF0000', 'red - should not detect')
    ]
    
    for hex_color, description in test_colors:
        detected = ColorExtractor.identify_color_name(hex_color)
        print(f"  {hex_color} ({description}): {detected or 'Not detected'}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python parsing.py <slides_folder_path>")
        print("Example: python parsing.py \"/path/to/Bony Pelvis 2/ppt/slides\"")
        print("\nRunning color detection test instead...")
        test_color_detection()
        return
    
    slides_folder = sys.argv[1]
    
    if not os.path.exists(slides_folder):
        print(f"Error: Slides folder not found: {slides_folder}")
        return
    
    print(f"Processing slides from: {slides_folder}")
    print("Note: Skipping slide 1, starting from slide 2 as per requirements")
    
    parser = SlideParser(slides_folder)
    
    # Phase 1: Process individual slides
    processed_slides = parser.process_all_slides()
    
    if not processed_slides:
        print("\n❌ No colored regions found in any slides.")
        print("   Make sure slides contain pink, green, or orange colored shapes.")
        return
    
    # Phase 2: Combine all slides
    combined_data = parser.combine_all_slides()
    
    print(f"\n🎉 Processing complete!")
    print(f"📁 Individual slide files saved in: {parser.output_folder}")
    print(f"📁 Individual annotation files created for each colored region")
    print(f"📁 Master file: {parser.output_folder}/all_colored_regions.json")


if __name__ == "__main__":
    main()