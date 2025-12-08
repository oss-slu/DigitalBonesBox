### Purpose: 

Extracts white text labels and the white leader lines/connector lines that point from labels into the image on a given slide. Outputs one JSON per slide containing:

- label text

- text box position/size/rotation (in EMUs)

- any hyperlinks on the label (and their target slide, if present)

- line geometry for the connected pointer/connector shapes

- deduplicated target regions (endpoints of the connected graph) the label points to

Uses a small graph walk from any line endpoints that touch the label’s text box (with padding), then collects terminal endpoints outside the box.

### Expected inputs:

--slides-dir: directory containing slideN.xml

--rels-dir: directory containing slideN.xml.rels

--slide: the slide number to process

### Outputs:

--out: path to write JSON. If not provided, writes
data_extraction/annotations/slide{N}_text_annotations.json.

Each JSON contains:

{
  "slide_number": 9,
  "text_annotations": [
    {
      "annotation_id": "annot_1",
      "bone_name": "Bony Pelvis",
      "subbone_name": "Ischial spine",
      "text_box": { "x": ..., "y": ..., "width": ..., "height": ..., "rotation_emu": ... },
      "has_hyperlink": true,
      "hyperlink": { "rId": "rId8", "target": "/ppt/slides/slide10.xml", "target_slide": 10 },
      "pointer_lines": [ { "kind": "connector", "start_point": {...}, "end_point": {...}, ... } ],
      "target_regions": [ { "x": ..., "y": ... }, ... ]
    }
  ],
  "total_text_annotations": 3,
  "config": { "padding_emu": 4000.0, "snap_emu": 8000.0 }
}

### How it works (brief):

Detect labels: White-filled text (either srgbClr #FFFFFF or scheme colors lt1/bg1).

Detect lines: White-stroke p:cxnSp connectors and simple p:sp lines.

Graph follow: Build a snapped endpoint graph, start from nodes that lie within the label’s padded box, traverse connected edges, and collect terminal nodes outside the label as candidate target regions.

# Key options:

--padding (default 4000 EMU): padding around the text box to consider endpoints “touching” the label.

--snap (default 8000 EMU): snap size for coalescing nearly identical line junctions.

### Quickstart:

# Example: dump slide 9 labels/lines to default path
python3 data_extraction/scripts/bony_pelvis_text_labels.py \
  --slides-dir data_extraction/fixtures/slides \
  --rels-dir   data_extraction/fixtures/rels \
  --slide 9

# Write to a custom file (e.g., renamed convention)
python3 data_extraction/scripts/bony_pelvis_text_labels.py \
  --slides-dir data_extraction/fixtures/slides \
  --rels-dir   data_extraction/fixtures/rels \
  --slide 9 \
  --out DataPelvis/annotations/slide09_ischium_text_labels.json

#### Notes & tips:

Only white labels/lines are considered—keep that styling consistent in PPT.

If a label has no connected white lines, pointer_lines can be empty and target_regions may be [].

Hyperlinks on either the shape’s cNvPr or text runs are captured when present in .rels.

Common troubleshooting

“No labels found”: ensure label text is actually white and not an inherited theme color that resolves to non-white.

Too many target points: reduce --padding and/or increase --snap so endpoints near the label consolidate better.

Missing hyperlink target_slide: requires a valid rId in the label and a matching entry in slideN.xml.rels.