# Data Extraction Process

## Overview

This document describes the automated data extraction pipeline for processing PowerPoint anatomy presentations and converting them into structured JSON data for the Digital Bones Box web application.

The extraction process involves multiple Python scripts that work together to extract different types of data from PowerPoint XML files:

- **Images** (bone illustrations in various views)
- **Text annotations** (bone names, labels, descriptions)
- **Colored regions** (anatomical region overlays with precise path coordinates)
- **Metadata** (bone relationships, hierarchies, and hyperlinks)

**All Python scripts in the `data_extraction/` folder should be run** to ensure complete data extraction. Each script handles a specific aspect of the extraction process and produces JSON files that the web application uses to render interactive bone anatomy.

## Extraction Components

### 1. Image Extraction

- **Purpose**: Extract bone images from PowerPoint slides
- **Script**: `extract_bone_images.py`
- **Output**: Image files taken from the slides.

### 2. Bone Hierarchy Extraction

- **Purpose**: Extract boneset/bone/subbone relationships
- **Script**: `xml_boneset_reader.py`
- **Output**: JSON files defining bone hierarchies (e.g., `bonesets.json`, `bones.json`, `subbones.json`)

### 3. Text Description Extraction

- **Purpose**: Extract descriptive text and bullet points from slides
- **Script**: `Extract_Bone_Descriptions.py`
- **Output**: Per-slide description JSONs with bone names and anatomical descriptions

### 4. Colored Region Extraction

- **Purpose**: Extract precise path data for anatomical region overlays
- **Script**: `ColoredRegionsExtractor.py`
- **Output**: JSON files with path coordinates for region overlays

### 5. Text Label & Pointer Line Extraction

- **Purpose**: Extract annotation labels with their pointer lines and target regions
- **Script**: `scripts/bony_pelvis_text_labels.py`
- **Output**: JSON with text positions, pointer line paths, and connection endpoints

### 6. Rotation & Layout Metadata

- **Purpose**: Extract image rotation, flip, and side-by-side layout information
- **Script**: `scripts/bony_pelvis_rotation.py`
- **Output**: Template JSON for consistent image positioning across slides

### 7. Calibration & Post-Processing

- **Purpose**: Apply offset corrections to align extracted regions with images
- **Script**: `calibrate_colored_regions.py`
- **Output**: Calibrated region JSON files with adjusted coordinates

## Extraction Steps

1. Rename the PowerPoint file extension from `.pptx` to `.zip`. This will convert it into a zipped folder that you can then extract to a folder.

2. In each file necessary, rewrite the directory structures included to be the folder that the PowerPoint data was extracted to.

3. Extract all data by running the scripts in this order:
    a. **`AutomatedExtractionScript.py`** or **`extract_bone_images.py`**  
    Extract raw images from slides
    b. **`xml_boneset_reader.py`**  
    Generate bone hierarchy lookup files
    c. **`Extract_Bone_Descriptions.py`**  
    Extract descriptive text for each bone
    d. **Colored region extractors**  
   
   - `ExtractBonyPelvisRegions.py`
   
   - `extract_posterior_iliac_spines.py`
   
   - `ColoredRegionsExtractor.py`
     e. **`scripts/bony_pelvis_text_labels.py`**  
     Extract annotation labels and pointer lines
     f. **`scripts/bony_pelvis_rotation.py`**  
     Extract layout and rotation metadata
     g. **`calibrate_colored_regions.py`**  
     Apply offset corrections to region coordinates
     h. **`extract_ppt_annotations.py`** *(when completed)*  
     Final unified extraction combining images, annotations, and hyperlinks

## Output Structure

Extracted data is organized as follows:

```
data_extraction/
├── AutomatedScript/           # Extracted images by slide
│   ├── slide2/
│   ├── slide3/
│   └── ...
├── annotations/
│   ├── color_regions/         # Colored region path data
│   ├── slide*_text_annotations.json
│   └── template_bony_pelvis.json
└── output.json                # Bone hierarchy data
```

## Outdated and Redundant Files

Some of the data extraction files are to be ignored, as they are outdated and will be removed in the future. These include:

* `extract_ppt_annotations.py` - Combined image and text annotation extraction. It is made redudant by `extract_bone_images.py` for image extraction and `scripts/bony_pelvis_text_labels.py` for text annotation extraction.
* `AutomatedExtractionScript.py` - Basic image extraction by slide. It is made redundant by `extract_bone_images.py`, which has the advantage of giving images their final names.
* `ExtractBonyPelvisRegions.py` - Slide 2 left/right regions. It is made redundant by `ColoredRegionsExtractor.py`, which provides generalized extraction for multiple slides for any PowerPoint.
* `extract_posterior_iliac_spines.py` - Slide 7 posterior spine regions. It is made redundant by `ColoredRegionsExtractor.py`, which provides generalized extraction for multiple slides for any PowerPoint.
  
  


