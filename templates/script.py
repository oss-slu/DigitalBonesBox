import xml.etree.ElementTree as ET
import os
import shutil
import argparse

def extract_images_from_slide(slide_xml_path, rels_file_path, media_folder, output_dir):
    print(f"Starting extraction for slide: {slide_xml_path}")
    print(f"Using relationships file: {rels_file_path}")
    print(f"Media folder: {media_folder}")
    print(f"Output directory: {output_dir}")

    # Parse the slide XML file
    try:
        slide_tree = ET.parse(slide_xml_path)
        slide_root = slide_tree.getroot()
        print("Slide XML parsed successfully.")
    except Exception as e:
        print(f"Error parsing slide XML: {e}")
        return

    # Parse the .rels file
    rels_ns = {'rel': 'http://schemas.openxmlformats.org/package/2006/relationships'}
    try:
        rels_tree = ET.parse(rels_file_path)
        rels_root = rels_tree.getroot()

        # Extract relationships
        rels_map = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rels_root.findall("rel:Relationship", rels_ns)
        }
        print(f"Relationships mapped: {rels_map}")
    except Exception as e:
        print(f"Error parsing .rels file: {e}")
        return

    # Ensure the output directory exists
    os.makedirs(output_dir, exist_ok=True)
    print(f"Output directory created: {output_dir}")

    # Find all picture elements and extract image references
    image_found = False
    for pic in slide_root.findall(".//{http://schemas.openxmlformats.org/presentationml/2006/main}pic"):
        try:
            blip = pic.find(".//{http://schemas.openxmlformats.org/drawingml/2006/main}blip")
            if blip is not None and "embed" in blip.attrib:
                r_id = blip.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"]
                print(f"Found r:embed ID: {r_id}")

                if r_id in rels_map:
                    # Locate the image file
                    image_path = os.path.join(media_folder, os.path.basename(rels_map[r_id]))
                    if os.path.exists(image_path):
                        # Save the image to the output directory
                        output_path = os.path.join(output_dir, os.path.basename(image_path))
                        shutil.copy(image_path, output_path)
                        print(f"Image saved: {output_path}")
                        image_found = True
                    else:
                        print(f"Image file not found in media folder: {image_path}")
                else:
                    print(f"r:embed ID {r_id} not found in .rels map.")
            else:
                print("No valid <a:blip> found in <p:pic> element.")
        except Exception as e:
            print(f"Error processing <p:pic> element: {e}")

    if not image_found:
        print("No images were extracted. Check your slide XML, .rels file, and media folder paths.")

if __name__ == "__main__":
    # Set up argument parsing
    parser = argparse.ArgumentParser(description="Extract images from a PowerPoint slide XML and relationships files.")
    parser.add_argument("--slide", type=str, help="Path to the slide XML file.", required=True)
    parser.add_argument("--rels", type=str, help="Path to the relationships (.rels) file.", required=True)
    parser.add_argument("--media", type=str, help="Path to the media folder.", required=True)
    parser.add_argument("--output", type=str, help="Path to the output directory to save images.", required=True)

    args = parser.parse_args()

    # Extract images based on provided arguments
    extract_images_from_slide(args.slide, args.rels, args.media, args.output)
