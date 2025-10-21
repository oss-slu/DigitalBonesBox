# Bone Image Extraction Script

## Overview
This script extracts bone images from PowerPoint slides and renames them based on hyperlinked bone names found in the slides.

## Requirements
- Python 3.x
- PowerPoint file already extracted into folder structure


## Usage

### Step 1: Update Paths
Open `extract_bone_images.py` and verify the paths at the top:
```python
slides_dir = "data_extraction/boneypelvis_ppt/slides"
rels_dir = "data_extraction/boneypelvis_ppt/rels"
media_dir = "data_extraction/boneypelvis_ppt/media"
output_dir = "data_extraction/extracted_bone_images"
```

### Step 2: Run the Script
```bash
cd data_extraction
python extract_bone_images.py
```

### Step 3: Check Output
The script will:
1. Process slides sequentially (starting from slide 2)
2. Extract images from each slide
3. Rename images based on hyperlinked bone names
4. Save renamed images to `extracted_bone_images/`

## How It Works

### Process Flow
1. **Read slide XML** → Find hyperlinked bone names
2. **Read .rels file** → Identify image relationships only (ignores charts, themes, etc.)
3. **Extract images** → Copy from media folder
4. **Rename images** → Use bone name + view (e.g., `ilium_lateral.jpg`)
5. **Confirm completion** → Print status after each slide

### Naming Convention
Images are named as: `{bone_name}_{view}.{ext}`

Examples:
- `ilium_lateral.jpg`
- `ilium_medial.png`
- `ischium_lateral.jpg`
- `pubis_medial.jpg`

### Supported Image Formats
The script handles all image formats:
- `.jpg` / `.jpeg`
- `.png`
- `.emf`
- `.gif`
- Any other image format in the media folder

## Expected Output

```
============================================================
BONE IMAGE EXTRACTION - Sprint 3
============================================================
Found 18 slides to process: [2, 3, 4, 5, ...]

Processing Slide 2...
  Extracted: image1.jpg -> bony_pelvis_lateral.jpg
  Extracted: image3.jpg -> bony_pelvis_medial.jpg
✓ Slide 2 complete (2 images extracted)

Processing Slide 3...
  Extracted: image1.jpg -> ilium_lateral.jpg
  Extracted: image3.jpg -> ilium_medial.jpg
✓ Slide 3 complete (2 images extracted)

...

============================================================
EXTRACTION COMPLETE!
============================================================
All images saved to: data_extraction/extracted_bone_images
Total slides processed: 18
```

## Troubleshooting

### No images extracted
- Check that `boneypelvis_ppt/media/` contains image files
- Verify that `.rels` files exist in `boneypelvis_ppt/rels/`

### Wrong bone names
- The script uses the FIRST hyperlinked text found in each slide
- Check slide XML to verify hyperlinks exist

### Path errors
- Make sure you're running from the `data_extraction` folder
- Verify all paths in the configuration section

