#!/usr/bin/env python3
"""
Extract all 4 Posterior Iliac Spine regions from slide7.xml
Extracts: Left PSIS, Left PIIS, Right PSIS, Right PIIS
"""

import xml.etree.ElementTree as ET
import json
from pathlib import Path
import argparse

def extract_path_from_shape(shape_elem):
    """Extract path data from a PowerPoint shape element"""
    ns = {
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main'
    }
    
    # Find the custGeom (custom geometry) element
    custgeom = shape_elem.find('.//a:custGeom', ns)
    if custgeom is None:
        return None
    
    # Get the path element
    path = custgeom.find('.//a:path', ns)
    if path is None:
        return None
    
    # Extract width and height
    path_width = int(path.get('w', 0))
    path_height = int(path.get('h', 0))
    
    commands = []
    
    # Process all commands in the path
    for cmd in path:
        tag = cmd.tag.split('}')[-1]  # Remove namespace
        
        if tag == 'moveTo':
            pt = cmd.find('a:pt', ns)
            x = int(pt.get('x', 0))
            y = int(pt.get('y', 0))
            commands.append({'type': 'moveTo', 'x': x, 'y': y})
            
        elif tag == 'lnTo':
            pt = cmd.find('a:pt', ns)
            x = int(pt.get('x', 0))
            y = int(pt.get('y', 0))
            commands.append({'type': 'lineTo', 'x': x, 'y': y})
            
        elif tag == 'cubicBezTo':
            pts = cmd.findall('a:pt', ns)
            if len(pts) == 3:
                commands.append({
                    'type': 'cubicBezTo',
                    'x1': int(pts[0].get('x', 0)),
                    'y1': int(pts[0].get('y', 0)),
                    'x2': int(pts[1].get('x', 0)),
                    'y2': int(pts[1].get('y', 0)),
                    'x': int(pts[2].get('x', 0)),
                    'y': int(pts[2].get('y', 0))
                })
                
        elif tag == 'close':
            commands.append({'type': 'close'})
    
    return {
        'path_width': path_width,
        'path_height': path_height,
        'commands': commands
    }

def get_shape_color(shape_elem):
    """Extract color from shape fill"""
    ns = {
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main'
    }
    
    # Look for solidFill
    solidfill = shape_elem.find('.//a:solidFill/a:srgbClr', ns)
    if solidfill is not None:
        return solidfill.get('val', '000000')
    
    return None

def main():
    parser = argparse.ArgumentParser(description="Extract posterior iliac spine regions from slide XML.")
    parser.add_argument("--xml-file", required=True, help="Path to the slide XML file.")
    
    args = parser.parse_args()
    
    xml_file = Path(args.xml_file)
    
    tree = ET.parse(xml_file)
    root = tree.getroot()
    
    ns = {
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main'
    }
    
    # Find all shapes
    shapes = root.findall('.//p:sp', ns)
    
    print(f"Found {len(shapes)} shapes in total")
    
    # Extract the 4 posterior iliac spine shapes (256, 257, 258, 259)
    target_ids = ['256', '257', '258', '259']
    posterior_spines = []
    
    for shape in shapes:
        cNvPr = shape.find('.//p:cNvPr', ns)
        if cNvPr is not None:
            shape_id = cNvPr.get('id')
            shape_name = cNvPr.get('name', '')
            
            if shape_id in target_ids:
                print(f"\nProcessing shape {shape_id} ({shape_name})")
                
                # Extract path
                path_data = extract_path_from_shape(shape)
                color = get_shape_color(shape)
                
                if path_data:
                    # Determine anatomical name based on ID and color
                    if shape_id == '256':  # Left PSIS (green)
                        name = 'Posterior Superior Iliac Spine - Left'
                    elif shape_id == '257':  # Left PIIS (magenta)
                        name = 'Posterior Inferior Iliac Spine - Left'
                    elif shape_id == '258':  # Right PSIS (green)
                        name = 'Posterior Superior Iliac Spine - Right'
                    elif shape_id == '259':  # Right PIIS (magenta)
                        name = 'Posterior Inferior Iliac Spine - Right'
                    else:
                        name = f'Posterior Iliac Spine - {shape_id}'
                    
                    region = {
                        'anatomical_name': name,
                        'color': color,
                        'path_data': [path_data]
                    }
                    
                    posterior_spines.append(region)
                    print(f"  ✓ Extracted: {name}")
                    print(f"    Color: #{color}, Path commands: {len(path_data['commands'])}")
    
    # Create the JSON structure
    output_data = {
        'slide_number': 7,
        'images': [
            {
                'index': 0,
                'name': 'pelvis_lat_blk.psd',
                'width': 2236557,
                'height': 3535362,
                'colored_regions': [r for r in posterior_spines if 'Left' in r['anatomical_name']]
            },
            {
                'index': 1,
                'name': 'pelvis_med_blk.psd',
                'width': 2554738,
                'height': 3429000,
                'colored_regions': [r for r in posterior_spines if 'Right' in r['anatomical_name']]
            }
        ]
    }
    
    # Write output
    output_file = Path('/Users/jennioishee/Capstone/DigitalBonesBox/data_extraction/annotations/color_regions/posterior_iliac_spines_colored_regions.json')
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n✓ Extracted {len(posterior_spines)} posterior iliac spine regions")
    print(f"✓ Written to: {output_file}")
    print(f"\nStructure:")
    print(f"  Image 0 (lateral): {len(output_data['images'][0]['colored_regions'])} regions")
    print(f"  Image 1 (medial): {len(output_data['images'][1]['colored_regions'])} regions")

if __name__ == '__main__':
    main()
