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
    print(f"Output directory checked/created: {output_dir}")

    # Debugging the structure of <p:pic> elements
    pic_namespace = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
                     'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
                     'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

    # Find all picture elements
    image_found = False
    for pic in slide_root.findall(".//p:pic", pic_namespace):
        try:
            print(f"Processing <p:pic>: {ET.tostring(pic, encoding='unicode')}")
            blip = pic.find(".//a:blip", pic_namespace)
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
                print(f"No <a:blip> or missing 'embed' attribute in <p:pic>: {ET.tostring(pic, encoding='unicode')}")
        except Exception as e:
            print(f"Error processing <p:pic> element: {e}")

    if not image_found:
        print("No images were extracted. Check your slide XML, .rels file, and media folder paths.")

# Example usage
slide_xml_path = '/Users/burhankhan/Desktop/CSCI-4961-01/ppt/slides/slide2.xml'
rels_file_path = "/Users/burhankhan/Desktop/CSCI-4961-01/ppt/slides/_rels/slide2.xml.rels"
media_folder = '/Users/burhankhan/Desktop/CSCI-4961-01/ppt/media'
output_dir = '/Users/burhankhan/Desktop/images'

extract_images_from_slide(slide_xml_path, rels_file_path, media_folder, output_dir)
