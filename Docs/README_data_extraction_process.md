# Data Extraction Process Documentation

This document outlines the data extraction scripts available in the `data_extraction/` directory and their usage.

## Scripts Overview

### AutomatedExtractionScript.py
Extracts images from PowerPoint slide XML files and renames them based on rId.

**Arguments:**
- `--slides-folder`: Path to the folder containing slide XML files
- `--rels-folder`: Path to the folder containing relationships XML files
- `--media-folder`: Path to the media folder containing images
- `--output-folder`: Path to store extracted images

**Usage:**
```bash
python AutomatedExtractionScript.py --slides-folder /path/to/slides --rels-folder /path/to/rels --media-folder /path/to/media --output-folder /path/to/output
```

### calibrate_colored_regions.py
Calibrates colored region positioning by adding manual offset adjustments.

**Arguments:**
- `--input-file`: Path to input JSON file
- `--output-file`: Path to output JSON file

**Usage:**
```bash
python calibrate_colored_regions.py --input-file input.json --output-file output.json
```

### ColoredRegionsExtractor.py
Extracts precise path data for anatomical shapes from PowerPoint slides.

**Arguments:**
- `--xml-folder`: Path to the folder containing XML files

**Usage:**
```bash
python ColoredRegionsExtractor.py --xml-folder /path/to/xml/folder
```

### Extract_Bone_Descriptions.py
Extracts bone descriptions from slide XML files.

**Arguments:**
- `--xml-file`: Path to the slide XML file
- `--output-json`: Path to the output JSON file

**Usage:**
```bash
python Extract_Bone_Descriptions.py --xml-file slide.xml --output-json output.json
```

### extract_bone_images.py
Extracts bone images from PowerPoint slides and names them based on featured bones.

**Arguments:**
- `--slides-dir`: Path to the slides directory
- `--rels-dir`: Path to the relationships directory
- `--media-dir`: Path to the media directory
- `--output-dir`: Path to the output directory
- `--slide-number`: Specific slide number to process (optional)

**Usage:**
```bash
python extract_bone_images.py --slides-dir /path/to/slides --rels-dir /path/to/rels --media-dir /path/to/media --output-dir /path/to/output
```

### extract_posterior_iliac_spines.py
Extracts posterior iliac spine regions from slide XML.

**Arguments:**
- `--xml-file`: Path to the slide XML file

**Usage:**
```bash
python extract_posterior_iliac_spines.py --xml-file slide.xml
```

### extract_ppt_annotations.py
Extracts PPT annotations and images.

**Arguments:**
- `--slides-folder`: Path to the folder containing slide XML files
- `--rels-folder`: Path to the folder containing relationships XML files
- `--media-folder`: Path to the media folder containing images
- `--output-folder`: Path to store extracted images
- `--json-output`: Path to the JSON output file
- `--json-directory`: Path to the JSON directory

**Usage:**
```bash
python extract_ppt_annotations.py --slides-folder /path/to/slides --rels-folder /path/to/rels --media-folder /path/to/media --output-folder /path/to/output --json-output output.json --json-directory /path/to/json
```

### ExtractBonyPelvisRegions.py
Extracts bony pelvis colored regions with image-relative coordinates.

**Arguments:**
- `--slide-file`: Path to the slide XML file

**Usage:**
```bash
python ExtractBonyPelvisRegions.py --slide-file slide.xml
```

### xml_boneset_reader.py
Extracts bonesets from XML files.

**Arguments:**
- `--xml-file`: Path to the XML file
- `--json-file`: Path to the output JSON file

**Usage:**
```bash
python xml_boneset_reader.py --xml-file input.xml --json-file output.json
```

## Scripts Directory

The `scripts/` subdirectory contains additional extraction tools:

### bony_pelvis_rotation.py
Handles rotation detection and normalization for bony pelvis slides.

**Arguments:**
- `--slides-dir`: Path to the slides directory
- `--rels-dir`: Path to the relationships directory (optional)
- `--slides`: Slide numbers to process (default: [2,3])
- `--representative`: Representative slide number (default: 2)
- `--out-template`: Output template file path
- `--out-metadata`: Output metadata file path
- Other options for auditing and tolerance

### bony_pelvis_text_labels.py
Extracts text labels from bony pelvis slides.

**Arguments:**
- `--slides-dir`: Path to the slides directory
- `--rels-dir`: Path to the relationships directory
- `--slide`: Slide number to process
- `--out`: Output file path (optional)
- Other options for padding and snap settings