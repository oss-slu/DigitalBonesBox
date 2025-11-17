#!/usr/bin/env python3
"""
Extract Bony Pelvis Colored Regions with Image-Relative Coordinates
For slide 2 with two bone images side by side
"""

import xml.etree.ElementTree as ET
import json

def extract_bony_pelvis_regions():
    """Extract colored regions for bony pelvis with proper image-relative positioning"""
    
    slide_file = "/Users/jennioishee/Capstone/DigitalBonesBox/slides/slide2.xml"
    
    namespaces = {
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    }
    
    color_map = {
        'C133AD': 'Ischium',
        '2F8E29': 'Pubis',
        'FF00E6': 'Ischium',
        '008000': 'Pubis'
    }
    
    tree = ET.parse(slide_file)
    root = tree.getroot()
    
    # Step 1: Extract image positions and sizes
    print("Step 1: Finding bone images...")
    images = []
    for pic in root.findall('.//p:pic', namespaces):
        nvpr = pic.find('.//p:cNvPr', namespaces)
        xfrm = pic.find('.//a:xfrm', namespaces)
        if nvpr is not None and xfrm is not None:
            name = nvpr.get('name', 'Unknown')
            off = xfrm.find('a:off', namespaces)
            ext = xfrm.find('a:ext', namespaces)
            if off is not None and ext is not None:
                image_data = {
                    'name': name,
                    'x': int(off.get('x')),
                    'y': int(off.get('y')),
                    'width': int(ext.get('cx')),
                    'height': int(ext.get('cy'))
                }
                images.append(image_data)
                print(f"  Found image: {name}")
                print(f"    Position: ({image_data['x']}, {image_data['y']})")
                print(f"    Size: {image_data['width']} x {image_data['height']}")
    
    if len(images) != 2:
        print(f"ERROR: Expected 2 images, found {len(images)}")
        return
    
    # Sort images left to right
    images.sort(key=lambda img: img['x'])
    left_image = images[0]
    right_image = images[1]
    
    print(f"\nLeft image: {left_image['name']}")
    print(f"Right image: {right_image['name']}")
    
    # Step 2: Extract colored regions
    print("\nStep 2: Extracting colored regions...")
    all_regions = []
    
    for shape in root.findall('.//p:sp', namespaces):
        # Get shape color
        sp_pr = shape.find('.//p:spPr', namespaces)
        if sp_pr is None:
            continue
        
        solid_fill = sp_pr.find('.//a:solidFill', namespaces)
        if solid_fill is None:
            continue
        
        srgb_clr = solid_fill.find('.//a:srgbClr', namespaces)
        if srgb_clr is None:
            continue
        
        color_hex = srgb_clr.get('val', '').upper()
        if color_hex not in color_map:
            continue
        
        # Get shape transform (position and size)
        xfrm = sp_pr.find('.//a:xfrm', namespaces)
        if xfrm is None:
            continue
        
        off = xfrm.find('a:off', namespaces)
        ext = xfrm.find('a:ext', namespaces)
        if off is None or ext is None:
            continue
        
        shape_x = int(off.get('x'))
        shape_y = int(off.get('y'))
        shape_w = int(ext.get('cx'))
        shape_h = int(ext.get('cy'))
        
        # Determine which image this region belongs to
        shape_center_x = shape_x + shape_w / 2
        
        # Check if region overlaps with left or right image
        if shape_center_x < right_image['x']:
            # Region belongs to left image
            target_image = left_image
            image_index = 0
        else:
            # Region belongs to right image
            target_image = right_image
            image_index = 1
        
        print(f"\n  Found {color_map[color_hex]} region (color #{color_hex})")
        print(f"    Shape position: ({shape_x}, {shape_y})")
        print(f"    Shape center X: {shape_center_x}")
        print(f"    Assigned to: {'LEFT' if image_index == 0 else 'RIGHT'} image")
        
        # Extract path data
        cust_geom = sp_pr.find('.//a:custGeom', namespaces)
        if cust_geom is None:
            print("    No custom geometry found")
            continue
        
        path_lst = cust_geom.find('.//a:pathLst', namespaces)
        if path_lst is None:
            print("    No path list found")
            continue
        
        path_data = []
        for path in path_lst.findall('.//a:path', namespaces):
            path_w = int(path.get('w', 0))
            path_h = int(path.get('h', 0))
            
            commands = []
            for child in path:
                tag = child.tag.split('}')[-1]
                
                if tag == 'moveTo':
                    pt = child.find('.//a:pt', namespaces)
                    if pt is not None:
                        # Convert from path coordinates to slide coordinates
                        abs_x = shape_x + (int(pt.get('x', 0)) * shape_w // path_w)
                        abs_y = shape_y + (int(pt.get('y', 0)) * shape_h // path_h)
                        
                        # Convert to image-relative coordinates
                        rel_x = abs_x - target_image['x']
                        rel_y = abs_y - target_image['y']
                        
                        commands.append({
                            'type': 'moveTo',
                            'x': rel_x,
                            'y': rel_y
                        })
                
                elif tag == 'lnTo':
                    pt = child.find('.//a:pt', namespaces)
                    if pt is not None:
                        abs_x = shape_x + (int(pt.get('x', 0)) * shape_w // path_w)
                        abs_y = shape_y + (int(pt.get('y', 0)) * shape_h // path_h)
                        rel_x = abs_x - target_image['x']
                        rel_y = abs_y - target_image['y']
                        
                        commands.append({
                            'type': 'lineTo',
                            'x': rel_x,
                            'y': rel_y
                        })
                
                elif tag == 'cubicBezTo':
                    pts = child.findall('.//a:pt', namespaces)
                    if len(pts) >= 3:
                        # Control point 1
                        abs_x1 = shape_x + (int(pts[0].get('x', 0)) * shape_w // path_w)
                        abs_y1 = shape_y + (int(pts[0].get('y', 0)) * shape_h // path_h)
                        rel_x1 = abs_x1 - target_image['x']
                        rel_y1 = abs_y1 - target_image['y']
                        
                        # Control point 2
                        abs_x2 = shape_x + (int(pts[1].get('x', 0)) * shape_w // path_w)
                        abs_y2 = shape_y + (int(pts[1].get('y', 0)) * shape_h // path_h)
                        rel_x2 = abs_x2 - target_image['x']
                        rel_y2 = abs_y2 - target_image['y']
                        
                        # End point
                        abs_x = shape_x + (int(pts[2].get('x', 0)) * shape_w // path_w)
                        abs_y = shape_y + (int(pts[2].get('y', 0)) * shape_h // path_h)
                        rel_x = abs_x - target_image['x']
                        rel_y = abs_y - target_image['y']
                        
                        commands.append({
                            'type': 'cubicBezTo',
                            'x1': rel_x1,
                            'y1': rel_y1,
                            'x2': rel_x2,
                            'y2': rel_y2,
                            'x': rel_x,
                            'y': rel_y
                        })
                
                elif tag == 'close':
                    commands.append({'type': 'close'})
            
            if commands:
                path_data.append({
                    'path_width': path_w,
                    'path_height': path_h,
                    'commands': commands
                })
        
        if path_data:
            region = {
                'anatomical_name': color_map[color_hex],
                'color': color_hex,
                'image_index': image_index,  # 0 = left, 1 = right
                'image_name': target_image['name'],
                'path_data': path_data
            }
            all_regions.append(region)
            print(f"    Extracted {len(commands)} path commands")
    
    # Step 3: Organize regions by image
    print(f"\nStep 3: Organizing {len(all_regions)} regions...")
    
    output = {
        'slide_number': 2,
        'images': [
            {
                'index': 0,
                'name': left_image['name'],
                'width': left_image['width'],
                'height': left_image['height'],
                'colored_regions': [r for r in all_regions if r['image_index'] == 0]
            },
            {
                'index': 1,
                'name': right_image['name'],
                'width': right_image['width'],
                'height': right_image['height'],
                'colored_regions': [r for r in all_regions if r['image_index'] == 1]
            }
        ]
    }
    
    # Remove image_index from individual regions (it's redundant now)
    for image in output['images']:
        for region in image['colored_regions']:
            del region['image_index']
    
    # Save to file
    output_file = "/Users/jennioishee/Capstone/DigitalBonesBox/data_extraction/bony_pelvis_colored_regions.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n✅ SUCCESS! Created: {output_file}")
    print(f"\nSummary:")
    print(f"  Left image: {len(output['images'][0]['colored_regions'])} regions")
    print(f"  Right image: {len(output['images'][1]['colored_regions'])} regions")
    
    for img in output['images']:
        print(f"\n  Image {img['index']} ({img['name']}):")
        for region in img['colored_regions']:
            print(f"    - {region['anatomical_name']} (#{region['color']})")

if __name__ == "__main__":
    extract_bony_pelvis_regions()
