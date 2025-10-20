# PowerPoint Anatomical Shape Parser Documentation

## Overview

This documentation explains how the PowerPoint anatomical shape parser works and how to use it effectively. The parser was created to extract precise anatomical shape boundaries from PowerPoint slides containing colored anatomical regions.

## What This Parser Does

The enhanced anatomical parser takes PowerPoint slide XML files and extracts detailed shape information from colored anatomical regions. Instead of giving you simple rectangular boxes around shapes, it provides the actual curved paths that make up complex anatomical structures like bone surfaces and joint spaces.

## Key Files

### parser.py
This is the main parsing script that does all the heavy lifting. It reads PowerPoint XML files and extracts precise path data from custom geometry shapes.

**What it extracts:**
- Curved and irregular shape boundaries (not just rectangles)
- Color information to identify different anatomical regions
- Shape coordinates that follow the actual anatomy
- Drawing commands that can recreate the exact shape

**How it works:**
1. Reads PowerPoint slide XML files from a specified folder
2. Looks for shapes with specific colors (pink, green, orange)
3. Extracts the custom geometry path data from each colored shape
4. Converts the path coordinates to usable format
5. Identifies anatomical names based on colors and nearby text
6. Saves everything as JSON files with descriptive names

### test_parser.py
A simple testing script to make sure everything is working correctly. It checks that the parser can read files, extract data, and create proper output.

## How to Use the Parser

### Prerequisites
- Python 3.6 or higher
- PowerPoint slide XML files (extracted from .pptx files)
- The slides should contain colored anatomical regions

### Basic Usage

1. **Prepare your XML files**
   - Extract XML files from your PowerPoint presentation
   - Place them in a folder (like ".xml Files" or "slide_xmls")
   - Make sure the files are named like "slide1.xml", "slide2.xml", etc.

2. **Run the parser**
   ```python
   from enhanced_anatomical_parser import AnatomicalShapeParser
   
   # Create parser instance
   parser = AnatomicalShapeParser("path/to/your/xml/files")
   
   # Parse all slides
   parser.parse_all_slides()
   ```

3. **Check the output**
   - JSON files will be created in the "annotations/color_regions" folder
   - Each file contains detailed shape data for one slide
   - Files are named based on the anatomical feature they contain

### Understanding the Output

Each JSON file contains:
- **slide_number**: Which slide the data came from
- **colored_regions**: Array of shape data
  - **anatomical_name**: What body part this shape represents
  - **color**: The original color and our interpretation
  - **path_data**: Array of drawing commands to recreate the shape
  - **shape_id**: Unique identifier from the original PowerPoint

The path_data is particularly important. It contains commands like:
- **moveTo**: Move to a starting point
- **lineTo**: Draw a straight line to a point  
- **cubicBezTo**: Draw a curved line (Bezier curve)

### Color Coding System

The parser recognizes these colors and maps them to anatomical regions:
- **Pink/Magenta**: Usually represents ischium (sitting bone)
- **Green**: Usually represents pubis or obturator foramen
- **Orange/Red**: Other anatomical regions

## Practical Examples

### Example 1: Parse a Single Slide
```python
parser = AnatomicalShapeParser("xml_files")
slide_data = parser.parse_slide(2)  # Parse slide 2
print(f"Found {slide_data['total_regions']} anatomical regions")
```

### Example 2: Parse All Slides at Once
```python
parser = AnatomicalShapeParser("xml_files") 
parser.parse_all_slides()  # Creates JSON files for all slides
```

### Example 3: Use the Path Data
```python
# Load a JSON file
import json
with open("annotations/color_regions/acetabulum_annotations.json") as f:
    data = json.load(f)

# Get the first region's path data
region = data["colored_regions"][0]
path_commands = region["path_data"]

# Each command tells you how to draw part of the shape
for command in path_commands:
    if command["command"] == "moveTo":
        print(f"Start drawing at ({command['x']}, {command['y']})")
    elif command["command"] == "lineTo":
        print(f"Draw line to ({command['x']}, {command['y']})")
```

