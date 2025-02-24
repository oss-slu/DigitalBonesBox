import os
import xml.etree.ElementTree as ET

def extract_images_from_slide_xml(slide_xml_path, rels_xml_path, media_folder, output_folder):
    
    # Step 1: Try parsing the slide XML file
    try:
        tree = ET.parse(slide_xml_path)
        root = tree.getroot()
    except ET.ParseError as e:
        print(f"[ERROR] Failed to parse {slide_xml_path}: {e}")
        return
    except FileNotFoundError:
        print(f"[ERROR] Slide file not found: {slide_xml_path}")
        return

    # Define XML namespaces (needed to properly find elements in the XML)
    ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
          'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
    
    # Step 2: Find all <a:blip> tags, which reference images via the r:embed attribute
    embed_ids = [blip.attrib.get(f"{{{ns['r']}}}embed") for blip in root.findall(".//a:blip", ns) if blip.attrib.get(f"{{{ns['r']}}}embed")]

    if not embed_ids:
        print(f"[INFO] No images found in {slide_xml_path}. Skipping...")
        return  # If no images are found, return early

    # Step 3: Try parsing the relationships XML file
    try:
        rels_tree = ET.parse(rels_xml_path)
        rels_root = rels_tree.getroot()
    except ET.ParseError as e:
        print(f"[ERROR] Failed to parse {rels_xml_path}: {e}")
        return
    except FileNotFoundError:
        print(f"[ERROR] Relationship file not found: {rels_xml_path}")
        return

    # Extract XML namespace for relationships if one exists
    rels_ns = rels_root.tag.split('}')[0] + '}' if '}' in rels_root.tag else ''

    # Step 4: Create a dictionary mapping rId (e.g., "rId8") to the actual image file path
    relationships = {rel.attrib.get('Id', '').strip(): rel.attrib.get('Target', '').strip()
                     for rel in rels_root.findall(f".//{rels_ns}Relationship")}

    # Step 5: Process each image reference found in the slide XML
    for embed_id in embed_ids:
        if embed_id in relationships:
            target = relationships[embed_id]  # The actual image filename
            image_path = os.path.join(media_folder, os.path.basename(target))  # Full path to the image

            if os.path.exists(image_path):
                # Extract slide name (e.g., "slide1" from "slide1.xml")
                slide_name = os.path.splitext(os.path.basename(slide_xml_path))[0]

                # Create a dedicated folder for each slide in the output directory
                slide_output_folder = os.path.join(output_folder, slide_name)
                if not os.path.exists(slide_output_folder):
                    os.makedirs(slide_output_folder)

                # Define output path for the extracted image
                image_output_path = os.path.join(slide_output_folder, os.path.basename(target))

                # Copy the image from ppt/media/ to the output folder
                try:
                    with open(image_path, 'rb') as img_in, open(image_output_path, 'wb') as img_out:
                        img_out.write(img_in.read())
                    print(f"[SUCCESS] Extracted: {image_output_path}")
                except Exception as e:
                    print(f"[ERROR] Failed to copy image {image_path}: {e}")
            else:
                print(f"[WARNING] Image file not found: {image_path} (Referenced in {rels_xml_path})")
        else:
            print(f"[WARNING] No relationship found for embed ID: {embed_id} (Referenced in {slide_xml_path})")

#Processes all slides in the PowerPoint file and extracts images from each slide.
def process_pptx_folders(slides_folder, rels_folder, media_folder, output_folder):

    # Ensure the output folder exists
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # Iterate through all slides in the slides folder
    for slide_file in sorted(os.listdir(slides_folder)):  # Sorting ensures correct slide order
        if slide_file.startswith("slide") and slide_file.endswith(".xml"):  # Check if it's a slide XML file
            slide_path = os.path.join(slides_folder, slide_file)
            rels_path = os.path.join(rels_folder, slide_file + ".rels")  # Find the corresponding .rels file
            
            if os.path.exists(rels_path):
                extract_images_from_slide_xml(slide_path, rels_path, media_folder, output_folder)
            else:
                print(f"[WARNING] Missing relationship file: {rels_path}. Skipping slide {slide_file}.")

# Main Execution Block
if __name__ == "__main__":

    # Paths to relevant folders (these should be updated dynamically or via CLI arguments)
    slides_folder = "/Users/burhankhan/Desktop/ppt/slides"  # Folder containing slide XML files
    rels_folder = "/Users/burhankhan/Desktop/ppt/slides/_rels"  # Folder containing relationships XML files
    media_folder = "/Users/burhankhan/Desktop/ppt/media"  # Folder containing media files
    output_folder = "/Users/burhankhan/Desktop/AutomatedScript"  # Folder where images will be extracted

    # Process all slides and extract images
    process_pptx_folders(slides_folder, rels_folder, media_folder, output_folder)
