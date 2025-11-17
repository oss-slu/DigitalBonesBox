#!/usr/bin/env python3
"""
Enhanced PowerPoint XML Parser for Anatomical Shapes
Extracts precise path data for curved/irregular shapes and specific anatomical names
"""

import xml.etree.ElementTree as ET
import json
import os
from pathlib import Path


class AnatomicalShapeParser:
    """Parser for extracting precise anatomical shape data with path coordinates"""
    
    def __init__(self, xml_files_folder):
        self.xml_files_folder = Path(xml_files_folder)
        self.output_folder = Path("annotations/color_regions")
        self.output_folder.mkdir(parents=True, exist_ok=True)
        
        # XML namespaces
        self.namespaces = {
            'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
            'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
            'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
        }
        
        # Color mapping for anatomical regions
        self.color_map = {
            'C133AD': 'pink',    # Ischium
            '2F8E29': 'green',   # Pubis/Obturator foramen  
            'FF6600': 'orange',  # Other regions
            'FF0000': 'red',     # Other regions
            'FF00E6': 'magenta', # Ischium variant
            '008000': 'green_variant' # Pubis variant
        }
    
    def parse_slide(self, slide_number):
        """Parse a specific slide and extract anatomical shape data"""
        slide_file = self.xml_files_folder / f"slide{slide_number}.xml"
        if not slide_file.exists():
            print(f"Slide {slide_number} not found")
            return None
        
        try:
            tree = ET.parse(slide_file)
            root = tree.getroot()
            
            # Extract colored anatomical regions
            colored_regions = []
            text_labels = self._extract_text_labels(root)
            
            # Find all shapes with custom geometry (freeform shapes)
            for shape in root.findall('.//p:sp', self.namespaces):
                region_data = self._extract_shape_region(shape, text_labels)
                if region_data:
                    colored_regions.append(region_data)
            
            if colored_regions:
                slide_data = {
                    'slide_number': slide_number,
                    'image_dimensions': self._get_slide_dimensions(root),
                    'colored_regions': colored_regions
                }
                
                # Save to file
                output_file = self.output_folder / f"slide{slide_number}_precise_paths.json"
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(slide_data, f, indent=2, ensure_ascii=False)
                
                print(f"✓ Created precise annotations: {output_file}")
                return slide_data
            
        except Exception as e:
            print(f"Error parsing slide {slide_number}: {e}")
            
        return None
    
    def _extract_shape_region(self, shape, text_labels):
        """Extract region data from a colored shape"""
        # Get shape color
        color_hex = self._get_shape_color(shape)
        if not color_hex or color_hex not in self.color_map:
            return None
        
        # Get shape ID and name
        shape_id = "unknown"
        nv_sp_pr = shape.find('.//p:nvSpPr', self.namespaces)
        if nv_sp_pr is not None:
            c_nv_pr = nv_sp_pr.find('.//p:cNvPr', self.namespaces)
            if c_nv_pr is not None:
                shape_id = c_nv_pr.get('id', 'unknown')
        
        # Get precise path data
        path_data = self._extract_path_data(shape)
        if not path_data:
            return None
        
        # Get anatomical name based on nearby text labels and color
        anatomical_name = self._determine_anatomical_name(shape, text_labels, color_hex)
        
        # Get hyperlink if present
        hyperlink_target = self._get_hyperlink_target(shape)
        
        region = {
            'anatomical_name': anatomical_name,
            'color': color_hex,
            'color_name': self.color_map[color_hex],
            'shape_id': shape_id,
            'path_data': path_data
        }
        
        if hyperlink_target:
            region['hyperlink_target'] = hyperlink_target
        
        return region
    
    def _extract_path_data(self, shape):
        """Extract precise path coordinates from custom geometry"""
        sp_pr = shape.find('.//p:spPr', self.namespaces)
        if sp_pr is None:
            return None
        
        # Get transform information for coordinate scaling
        transform = self._get_transform(sp_pr)
        
        # Look for custom geometry
        cust_geom = sp_pr.find('.//a:custGeom', self.namespaces)
        if cust_geom is not None:
            path_lst = cust_geom.find('.//a:pathLst', self.namespaces)
            if path_lst is not None:
                paths = []
                for path in path_lst.findall('.//a:path', self.namespaces):
                    path_commands = []
                    
                    # Get path dimensions
                    path_w = int(path.get('w', 0))
                    path_h = int(path.get('h', 0))
                    
                    # Extract all path commands
                    for child in path:
                        cmd = self._parse_path_command(child, transform, path_w, path_h)
                        if cmd:
                            path_commands.append(cmd)
                    
                    if path_commands:
                        paths.append({
                            'path_width': path_w,
                            'path_height': path_h,
                            'commands': path_commands
                        })
                
                return paths if paths else None
        
        return None
    
    def _parse_path_command(self, element, transform, path_w, path_h):
        """Parse individual path commands (moveTo, lnTo, etc.)"""
        tag = element.tag.split('}')[-1]  # Remove namespace
        
        if tag == 'moveTo':
            pt = element.find('.//a:pt', self.namespaces)
            if pt is not None:
                return {
                    'type': 'moveTo',
                    'x': self._scale_coordinate(int(pt.get('x', 0)), transform['x'], transform['width'], path_w),
                    'y': self._scale_coordinate(int(pt.get('y', 0)), transform['y'], transform['height'], path_h)
                }
        
        elif tag == 'lnTo':
            pt = element.find('.//a:pt', self.namespaces)
            if pt is not None:
                return {
                    'type': 'lineTo',
                    'x': self._scale_coordinate(int(pt.get('x', 0)), transform['x'], transform['width'], path_w),
                    'y': self._scale_coordinate(int(pt.get('y', 0)), transform['y'], transform['height'], path_h)
                }
        
        elif tag == 'cubicBezTo':
            pts = element.findall('.//a:pt', self.namespaces)
            if len(pts) >= 3:
                return {
                    'type': 'cubicBezTo',
                    'x1': self._scale_coordinate(int(pts[0].get('x', 0)), transform['x'], transform['width'], path_w),
                    'y1': self._scale_coordinate(int(pts[0].get('y', 0)), transform['y'], transform['height'], path_h),
                    'x2': self._scale_coordinate(int(pts[1].get('x', 0)), transform['x'], transform['width'], path_w),
                    'y2': self._scale_coordinate(int(pts[1].get('y', 0)), transform['y'], transform['height'], path_h),
                    'x': self._scale_coordinate(int(pts[2].get('x', 0)), transform['x'], transform['width'], path_w),
                    'y': self._scale_coordinate(int(pts[2].get('y', 0)), transform['y'], transform['height'], path_h)
                }
        
        elif tag == 'quadBezTo':
            pts = element.findall('.//a:pt', self.namespaces)
            if len(pts) >= 2:
                return {
                    'type': 'quadBezTo',
                    'x1': self._scale_coordinate(int(pts[0].get('x', 0)), transform['x'], transform['width'], path_w),
                    'y1': self._scale_coordinate(int(pts[0].get('y', 0)), transform['y'], transform['height'], path_h),
                    'x': self._scale_coordinate(int(pts[1].get('x', 0)), transform['x'], transform['width'], path_w),
                    'y': self._scale_coordinate(int(pts[1].get('y', 0)), transform['y'], transform['height'], path_h)
                }
        
        elif tag == 'close':
            return {'type': 'close'}
        
        return None
    
    def _scale_coordinate(self, path_coord, transform_offset, transform_size, path_size):
        """Scale path coordinates to actual slide coordinates"""
        if path_size == 0:
            return transform_offset
        
        # Scale from path coordinate system to slide coordinate system
        ratio = path_coord / path_size
        return int(transform_offset + (ratio * transform_size))
    
    def _get_transform(self, sp_pr):
        """Get transform information (position and size)"""
        xfrm = sp_pr.find('.//a:xfrm', self.namespaces)
        if xfrm is not None:
            off = xfrm.find('.//a:off', self.namespaces)
            ext = xfrm.find('.//a:ext', self.namespaces)
            
            if off is not None and ext is not None:
                return {
                    'x': int(off.get('x', 0)),
                    'y': int(off.get('y', 0)),
                    'width': int(ext.get('cx', 0)),
                    'height': int(ext.get('cy', 0))
                }
        
        return {'x': 0, 'y': 0, 'width': 0, 'height': 0}
    
    def _get_shape_color(self, shape):
        """Extract color from shape"""
        sp_pr = shape.find('.//p:spPr', self.namespaces)
        if sp_pr is not None:
            # Look for solid fill
            solid_fill = sp_pr.find('.//a:solidFill', self.namespaces)
            if solid_fill is not None:
                # Check for sRGB color
                srgb_clr = solid_fill.find('.//a:srgbClr', self.namespaces)
                if srgb_clr is not None:
                    return srgb_clr.get('val', '').upper()
        
        return None
    
    def _extract_text_labels(self, root):
        """Extract all text labels from the slide for anatomical identification"""
        text_labels = {}
        
        for shape in root.findall('.//p:sp', self.namespaces):
            # Get shape ID
            shape_id = "unknown"
            nv_sp_pr = shape.find('.//p:nvSpPr', self.namespaces)
            if nv_sp_pr is not None:
                c_nv_pr = nv_sp_pr.find('.//p:cNvPr', self.namespaces)
                if c_nv_pr is not None:
                    shape_id = c_nv_pr.get('id', 'unknown')
            
            # Extract text content
            text_content = []
            for text_elem in shape.findall('.//a:t', self.namespaces):
                if text_elem.text:
                    text_content.append(text_elem.text.strip())
            
            if text_content:
                text_labels[shape_id] = ' '.join(text_content)
        
        return text_labels
    
    def _determine_anatomical_name(self, shape, text_labels, color_hex):
        """Determine specific anatomical name based on context"""
        # Get shape ID
        shape_id = "unknown"
        nv_sp_pr = shape.find('.//p:nvSpPr', self.namespaces)
        if nv_sp_pr is not None:
            c_nv_pr = nv_sp_pr.find('.//p:cNvPr', self.namespaces)
            if c_nv_pr is not None:
                shape_id = c_nv_pr.get('id', 'unknown')
        
        # Map colors to general anatomical regions
        color_anatomy_map = {
            'C133AD': 'Ischium',
            'FF00E6': 'Ischium', 
            '2F8E29': 'Pubis_and_Obturator_foramen',
            '008000': 'Pubis_and_Obturator_foramen'
        }
        
        # Get base anatomical name from color
        base_name = color_anatomy_map.get(color_hex, 'Unknown_region')
        
        # For green regions, determine if it's specifically Pubis or Obturator foramen
        # based on nearby text labels or position
        if 'Pubis' in base_name:
            # Look for nearby text that might specify the exact region
            for text_id, text in text_labels.items():
                text_lower = text.lower()
                if 'obturator' in text_lower and 'foramen' in text_lower:
                    # This green region might include the obturator foramen
                    return 'Pubis_with_Obturator_foramen'
                elif 'pubis' in text_lower and 'obturator' not in text_lower:
                    return 'Pubis'
        
        return base_name
    
    def _get_hyperlink_target(self, shape):
        """Get hyperlink target slide if present"""
        hlnk_click = shape.find('.//a:hlinkClick', self.namespaces)
        if hlnk_click is not None:
            r_id = hlnk_click.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            if r_id:
                # Extract slide number from rId (would need relationship file to resolve properly)
                # For now, extract number from rId format
                import re
                match = re.search(r'rId(\d+)', r_id)
                if match:
                    return int(match.group(1))
        
        return None
    
    def _get_slide_dimensions(self, root):
        """Get slide dimensions for proper scaling"""
        # PowerPoint slide dimensions are typically in the presentation
        # For now, use standard dimensions
        return {
            'width': 12192000,  # Standard PowerPoint slide width in EMUs
            'height': 6858000   # Standard PowerPoint slide height in EMUs
        }
    
    def parse_all_slides(self):
        """Parse all available slides"""
        results = {}
        
        for slide_file in sorted(self.xml_files_folder.glob("slide*.xml")):
            slide_number = int(slide_file.stem.replace('slide', ''))
            result = self.parse_slide(slide_number)
            if result:
                results[slide_number] = result
        
        # Create summary file
        summary = {
            'total_slides': len(results),
            'slides_with_annotations': list(results.keys()),
            'extraction_summary': {}
        }
        
        for slide_num, data in results.items():
            summary['extraction_summary'][slide_num] = {
                'regions_found': len(data['colored_regions']),
                'anatomical_names': [r['anatomical_name'] for r in data['colored_regions']]
            }
        
        summary_file = self.output_folder / "extraction_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Created extraction summary: {summary_file}")
        return results


def main():
    """Main execution function"""
    xml_folder = "/Users/jennioishee/Capstone/DigitalBonesBox/slides"
    
    parser = AnatomicalShapeParser(xml_folder)
    
    print("Starting enhanced anatomical shape extraction...")
    print("=" * 60)
    
    # Parse all slides
    results = parser.parse_all_slides()
    
    print("=" * 60)
    print(f"✓ Extraction complete! Processed {len(results)} slides")
    print(f"✓ Enhanced annotations saved to: {parser.output_folder}")
    print("\nKey improvements:")
    print("• Precise curved/irregular shape boundaries (not rectangles)")
    print("• Specific anatomical names for each region") 
    print("• Path coordinates for exact overlay")
    print("• Proper coordinate scaling")


if __name__ == "__main__":
    main()