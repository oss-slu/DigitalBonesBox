# PowerPoint Colored Bone Region Extractor

This Python script extracts highlighted bone regions from PowerPoint slides to identify specific subbones. It processes each slide individually for accuracy and then combines all results into a master JSON file.

## Features

- Extracts individual slide data and consolidates results.
- Records subbone names and shape details.
- Handles slides with or without hyperlinks.
- Produces individual JSON files per slide and a combined master file.
- Includes tests to ensure accurate processing.


## Usage

Run the script on a folder of slides:

```bash
python parsing.py <slides_folder_path>
