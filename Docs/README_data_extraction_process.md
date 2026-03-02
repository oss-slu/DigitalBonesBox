# Data Extraction Process

## Overview

This document describes the automated data extraction pipeline for processing PowerPoint anatomy presentations and converting them into structured JSON data for the Digital Bones Box web application.

The extraction process involves multiple Python scripts that work together to extract different types of data from PowerPoint XML files:

- **Images** (bone illustrations in various views)
- **Text annotations** (bone names, labels, descriptions)
- **Colored regions** (anatomical region overlays with precise path coordinates)
- **Metadata** (bone relationships, hierarchies, and hyperlinks)

## Extraction Components

### Image Extraction

- **Purpose**: Extract bone images from PowerPoint slides
- **Script**: `extract_bone_images.py`
- **Output**: Image files taken from the slides.

### Bone Hierarchy Extraction

- **Purpose**: Extract boneset/bone/subbone relationships
- **Script**: `xml_boneset_reader.py`
- **Output**: JSON files defining bone hierarchies (e.g., `bonesets.json`, `bones.json`, `subbones.json`)

### Text Description Extraction

- **Purpose**: Extract descriptive text and bullet points from slides
- **Script**: `Extract_Bone_Descriptions.py`
- **Output**: JSON file with bone names and anatomical descriptions

### Colored Region Extraction

- **Purpose**: Extract precise path data for anatomical region overlays
- **Script**: `ColoredRegionsExtractor.py`
- **Output**: JSON files with path coordinates for region overlays

### Text Label & Pointer Line Extraction

- **Purpose**: Extract annotation labels with their pointer lines and target regions
- **Script**: `extract_text_labels.py`
- **Output**: JSON with text positions, pointer line paths, and connection endpoints

### Rotation & Layout Metadata

- **Purpose**: Extract image rotation, flip, and side-by-side layout information
- **Script**: `bony_pelvis_rotation.py`
- **Output**: Template JSON for consistent image positioning across slides

### Calibration & Post-Processing

- **Purpose**: Apply offset corrections to align extracted regions with images
- **Script**: `calibrate_colored_regions.py`
- **Output**: Calibrated region JSON files with adjusted coordinates

## Extraction Steps

1. Rename the PowerPoint file extension from `.pptx` to `.zip`. This will convert it into a zipped folder that you can then extract to a folder.

2. In each file necessary, rewrite the directory structures included to be the folder that the PowerPoint data was extracted to.

3. Extract all data by running the scripts in this order:

    a. **`extract_bone_images.py`:** Extract raw images from slides
    
    b. **`xml_boneset_reader.py`:** Generate bone hierarchy lookup files
    
    c. **`Extract_Bone_Descriptions.py`:** Extract descriptive text for each bone
    
    d. **`ColoredRegionsExtractor.py`:** Extract colored regions
    
    e. **`extract_text_labels.py`:** Extract annotation labels and pointer lines
    
    f. **`bony_pelvis_rotation.py`:** Extract data for adjusting rotation of images to match how they are rotated in the PowerPoints. **This file is probably not necessary to use. It appears to be built very inflexibly and specifically for certain images in the pelvis boneset.** Guidance on how to generate data about how images should be rotated will be coming soon, but for now you can skip this step. From what I can see in the PowerPoints, it seems like few images need to be rotated anyway, so we can get away with not having this data for now.
    
    g. **`calibrate_colored_regions.py`:** Apply offset corrections to region coordinates
   
    Each of the extraction files takes several arguments to customize the input and output files. You can first run the files with `--help` to see the arguments taken.

4. Clean up data. Some of the extraction scripts may give incomplete data:

    a. **`extract_bone_images.py`**

    Does not assign final image names. Images should be given a name of the format `<bone_id>_image.jpg` if it is the only image of that boneset/bone/subbone, or `<bone_id>_image<number>.jpg` if it is one of several images of that ID, where `bone_id` is the ID of the boneset, bone, or subbone being described. See the `images/` directory in the database for an example of how names should be assigned.

    b. **`xml_boneset_reader.py`**

    May not extract all the hierarchical data. Try running on a different slide number to see if more data is extracted (usually no data will be extracted from the title slide). For a reference of how the JSON files should be structured, see the `boneset/`, `bones/`, and `subbones/` directories in the database. Each boneset/bone/subbone should have a name, a unique ID (which should be the name in lowercase with spaces replaced by underscores—e.g. a bone with the name "Bone Name" has ID "bone_name"), and a list of its child bone IDs (if applicable). They should be split into separate JSON files with the title `<bone_id>.json` in their respective directories, where `bone_id` is the ID of the boneset, bone, or subbone being described.
    
    c. **`Extract_Bone_Descriptions.py`**
        
    The file may make some general errors in parsing out the descriptions. You should keep the PowerPoint open and verify that each bone object has the appropriate boneset/bone/subbone name,  ID (which should be the name in lowercase with spaces replaced by underscores—e.g. a bone with the name "Bone Name" has ID "bone_name"), and description, which should be a list of strings of each line of text in the description. That list should strictly only include text in the description of the boneset, bone, or subbone, not any extra information.
   
    The file also does not assign final file names. Files should be given a name of the format `<bone_id>_description.json` where `bone_id` is the ID of the boneset, bone, or subbone being described. Inside it should then be optionally added an "images" field that is a list of the filenames of the images associated with that bone as extracted by the image extraction script.
            
    See the `descriptions/` directory in the database for an example of how description JSON files should look.
    
    d. **`ColoredRegionsExtractor.py`**

    Does not assign final image names. Files should be given a name of the format `<bone_id>_colored_regions.json` where `bone_id` is the ID of the boneset, bone, or subbone being described. See the `annotations/ColoredRegions/` directory in the database for an example of how names should be assigned.

    e. **`extract_text_labels.py`**

    Does not assign final file names. Files should be given a name of the format `<bone_id>_text_labels.json` where `bone_id` is the ID of the boneset, bone, or subbone being described. See the `annotations/text_label_annotations/` directory in the database for an example of how names should be assigned.
