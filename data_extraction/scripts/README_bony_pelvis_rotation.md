### Purpose:

Parses PowerPoint slide XML to:

derive a normalized two-image template (left/right bounds, rotation, flips) from a representative slide,

extract per-slide media rIds and (optionally) resolve them to media file paths via .rels,

optionally audit each slide to see whether its two main images match the template within a tolerance.

⚠️ Designed for slides that have two main pictures (side-by-side). One-image slides will fail the audit with reason: "fewer-than-two-pics".

### Expected inputs:

--slides-dir: directory containing slideN.xml

--rels-dir (optional): directory containing slideN.xml.rels

Representative slide number with the desired geometry (defaults to 2)

### Outputs:

--out-template (JSON): normalized geometry for left/right images
(template_bony_pelvis.json)

--out-metadata (JSON): list of slides with media rIds, and if --rels-dir is provided, resolved media targets/paths (bony_pelvis_metadata.json)

When --audit is set: an "audit" block with tolerance, verified_slides, and failed_slides.

### Key options: 

--slides: list of slide numbers to process (default: 2 3)

--representative: slide to build the template from (default: 2)

--audit: run audit and include results in metadata output

--tolerance: numeric tolerance for normalized geometry comparisons (default: 0.02)

--min-area: minimum area fraction to consider a picture “main” (default: 0.05)

### Quickstart:

# 1) Create template + metadata (no audit)
python3 data_extraction/scripts/bony_pelvis_rotation.py \
  --slides-dir data_extraction/fixtures/slides \
  --rels-dir  data_extraction/fixtures/rels \
  --slides 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 \
  --representative 2 \
  --out-template  data_extraction/annotations/template_bony_pelvis.json \
  --out-metadata  data_extraction/annotations/bony_pelvis_metadata.json

# 2) With audit (recommended before committing)
python3 data_extraction/scripts/bony_pelvis_rotation.py \
  --slides-dir data_extraction/fixtures/slides \
  --rels-dir  data_extraction/fixtures/rels \
  --slides 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 \
  --out-metadata data_extraction/annotations/bony_pelvis_metadata.json \
  --audit --tolerance 0.02

### Interpreting the audit:

verified_slides: slides whose two main images match the template within --tolerance

failed_slides: slides that differ; failure keys like left.normY, right.normH, or left.rot_deg

reason: "fewer-than-two-pics": the slide doesn’t have two “main” pictures (common for single-image slides)

### Handling one-image slides:

This script can’t produce a side-by-side match for single-image slides. You can either:

Exclude them from --slides when auditing, or

Keep them listed but expect fewer-than-two-pics in audit results.
(Downstream apps should treat these as single-image layouts.)

### File structure example:
data_extraction/
  fixtures/
    slides/  slide2.xml ... slide20.xml
    rels/    slide2.xml.rels ... slide20.xml.rels
  annotations/
    template_bony_pelvis.json
    bony_pelvis_metadata.json
