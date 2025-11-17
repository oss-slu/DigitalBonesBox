#!/usr/bin/env python3
"""
Calibration tool for colored region positioning
Adds manual offset adjustments to align regions with web images
"""

import json

def add_offset_to_regions(input_file, output_file, offsets):
    """
    Add offset adjustments to colored region coordinates
    
    Args:
        input_file: Path to input JSON file
        output_file: Path to output JSON file
        offsets: Dict with image indices as keys and (x_offset, y_offset) tuples as values
                 Example: {0: (10, -20), 1: (15, -25)}
    """
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    for image in data['images']:
        image_index = image['index']
        if image_index in offsets:
            x_offset, y_offset = offsets[image_index]
            print(f"\nApplying offset to image {image_index}: ({x_offset}, {y_offset})")
            
            for region in image['colored_regions']:
                region_name = region['anatomical_name']
                print(f"  Adjusting {region_name}...")
                
                for path_data in region['path_data']:
                    for cmd in path_data['commands']:
                        # Apply offset to x coordinates
                        if 'x' in cmd:
                            cmd['x'] += x_offset
                        if 'x1' in cmd:
                            cmd['x1'] += x_offset
                        if 'x2' in cmd:
                            cmd['x2'] += x_offset
                        
                        # Apply offset to y coordinates
                        if 'y' in cmd:
                            cmd['y'] += y_offset
                        if 'y1' in cmd:
                            cmd['y1'] += y_offset
                        if 'y2' in cmd:
                            cmd['y2'] += y_offset
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"\n✅ Calibrated data saved to: {output_file}")


if __name__ == "__main__":
    input_file = "/Users/jennioishee/Capstone/DigitalBonesBox/data_extraction/bony_pelvis_colored_regions.json"
    output_file = input_file  # Overwrite the original file
    
    # Calibration offsets (adjust these values by trial and error)
    # Positive x = move right, Negative x = move left
    # Positive y = move down, Negative y = move up
    offsets = {
        0: (0, -400),    # Left image: move regions UP by 400 EMUs (was -200, doubling)
        1: (0, -1200)    # Right image: move regions UP by 1200 EMUs (was -800, increasing more)
    }
    
    print("🎯 Colored Region Calibration Tool")
    print("=" * 50)
    print(f"Input file: {input_file}")
    print(f"Output file: {output_file}")
    print(f"\nOffsets to apply:")
    for idx, (x, y) in offsets.items():
        print(f"  Image {idx}: x={x:+d}, y={y:+d} EMUs")
    
    add_offset_to_regions(input_file, output_file, offsets)
    
    print("\n📋 Next steps:")
    print("1. Hard reload the browser (Cmd+Shift+R)")
    print("2. Select 'Bony Pelvis' boneset")
    print("3. Check if regions are better aligned")
    print("4. If not perfect, adjust the offset values and run again")
    print("\nOffset guidelines:")
    print("  - If regions are too LOW, use NEGATIVE y offset (move up)")
    print("  - If regions are too HIGH, use POSITIVE y offset (move down)")
    print("  - If regions are too LEFT, use POSITIVE x offset (move right)")
    print("  - If regions are too RIGHT, use NEGATIVE x offset (move left)")
