# extract_text_labels

## Overview

This file documents the behavior of `data_extraction/extract_text_labels.py`.

## Purpose

Extracts white text labels and the white leader lines/connector lines that point from labels into the image on a given slide. Outputs one JSON per slide containing:

- label text

- text box position/size/rotation (in EMUs)

- any hyperlinks on the label (and their target slide, if present)

- line geometry for the connected pointer/connector shapes

- deduplicated target regions (endpoints of the connected graph) the label points to

Uses a small graph walk from any line endpoints that touch the label’s text box (with padding), then collects terminal endpoints outside the box.

## Expected inputs

Run the script with the flag `--help` to view expected inputs.

## Outputs

Each JSON contains:

```json
{
  "slide_number": ...,
  "text_annotations": [
    {
      "annotation_id": "annot_1",
      "bone_name": "...",
      "subbone_name": "...",
      "text_box": { "x": ..., "y": ..., "width": ..., "height": ..., "rotation_emu": ... },
      "has_hyperlink": true,
      "hyperlink": { "rId": "rId8", "target": "/ppt/slides/....xml", "target_slide": ... },
      "pointer_lines": [ { "kind": "connector", "start_point": {...}, "end_point": {...}, ... } ],
      "target_regions": [ { "x": ..., "y": ... }, ... ]
    }
  ],
  "total_text_annotations": ...,
  "config": { "padding_emu": 4000.0, "snap_emu": 8000.0 }
}
```

## How it works (brief)

Detect labels: White-filled text (either srgbClr #FFFFFF or scheme colors lt1/bg1).

Detect lines: White-stroke p:cxnSp connectors and simple p:sp lines.

Graph follow: Build a snapped endpoint graph, start from nodes that lie within the label’s padded box, traverse connected edges, and collect terminal nodes outside the label as candidate target regions.

## Key options

- `--padding` (default 4000 EMU): padding around the text box to consider endpoints “touching” the label.

- `--snap` (default 8000 EMU): snap size for coalescing nearly identical line junctions.

## Quickstart

### Example: dump slide labels/lines

```bash
python3 data_extraction/extract_text_labels.py \
  data_extraction/presentation \
  ./text_label_outputs
```

## Notes & tips:

Only white labels/lines are considered—keep that styling consistent in PPT.

If a label has no connected white lines, pointer_lines can be empty and target_regions may be [].

Hyperlinks on either the shape’s cNvPr or text runs are captured when present in .rels.

Common troubleshooting

“No labels found”: ensure label text is actually white and not an inherited theme color that resolves to non-white.

Too many target points: reduce --padding and/or increase --snap so endpoints near the label consolidate better.

Missing hyperlink target_slide: requires a valid rId in the label and a matching entry in slideN.xml.rels.
