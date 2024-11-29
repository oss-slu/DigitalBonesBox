import os
import xml.etree.ElementTree as ET

def extract_images_from_slide_xml(slide_xml_path, rels_xml_path, media_folder, output_folder):
    # Step 1: Parse the slide XML to find image relationships
    try:
        print(f"Parsing slide XML: {slide_xml_path}")
        tree = ET.parse(slide_xml_path)
        root = tree.getroot()
    except ET.ParseError:
        print(f"Error parsing {slide_xml_path}")
        return

    # Namespace handling for slide XML
    ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
          'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

    # Step 2: Find all <a:blip> tags which reference images
    print("Finding <a:blip> tags in the slide XML...")
    blip_found = False
    embed_ids = []  # List to store all found embed IDs
    for blip in root.findall(".//a:blip", ns):
        blip_found = True
        embed = blip.attrib.get(f"{{{ns['r']}}}embed")  # Get r:embed value (e.g., rId3)
        if embed:
            embed = embed.strip()  # Strip any whitespace, just in case
            embed_ids.append(embed)
            print(f"Found <a:blip> with embed ID: '{embed}'")

    if not blip_found:
        print("No <a:blip> tags found in the slide XML.")
        return

    # Step 3: Parse the relationship file to find the image reference
    try:
        print(f"Parsing relationships XML: {rels_xml_path}")
        rels_tree = ET.parse(rels_xml_path)
        rels_root = rels_tree.getroot()
    except ET.ParseError:
        print(f"Error parsing {rels_xml_path}")
        return

    # Step 4: Handle namespaces in relationships XML
    # Extract the namespace if it exists
    rels_ns = ""
    if '}' in rels_root.tag:
        rels_ns = rels_root.tag.split('}')[0] + '}'
    
    # Step 5: Print all relationships for debugging
    print("Listing all relationships from the relationships XML:")
    relationships = {}
    for rel in rels_root.findall(f".//{rels_ns}Relationship"):
        rel_id = rel.attrib.get('Id', '').strip()
        target = rel.attrib.get('Target', '').strip()
        relationships[rel_id] = target
        print(f"Relationship ID: '{rel_id}', Target: '{target}'")

    # Step 6: Cross-check embed IDs against relationships and extract images
    for embed_id in embed_ids:
        if embed_id in relationships:
            target = relationships[embed_id]
            print(f"Found relationship for embed ID '{embed_id}': Target -> {target}")

            # The target should point to an image in the media folder
            image_path = os.path.join(media_folder, os.path.basename(target))
            print(f"Resolved image path: {image_path}")

            # Step 7: Copy the image to the output folder
            if os.path.exists(image_path):
                image_output_path = os.path.join(output_folder, os.path.basename(target))
                with open(image_path, 'rb') as img_in, open(image_output_path, 'wb') as img_out:
                    img_out.write(img_in.read())
                    print(f"Extracted: {image_output_path}")
            else:
                print(f"Image not found: {image_path}")
        else:
            print(f"No relationship found for embed ID: '{embed_id}'")

if __name__ == "__main__":
    # Define your file paths
    slide_xml_path = '/Users/burhankhan/Desktop/CSCI-4961-01/ppt/slides/slide2.xml'           # Replace with the path to your slide XML file
    rels_xml_path = '/Users/burhankhan/Desktop/CSCI-4961-01/ppt/slides/_rels/slide2.xml.rels'  # Replace with the path to the corresponding relationships file
    media_folder = '/Users/burhankhan/Desktop/CSCI-4961-01/ppt/media'                         # Replace with the path to the media folder
    output_folder = '/Users/burhankhan/Desktop/images'                                        # Replace with your desired output directory

    # Ensure output folder exists
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Run the extraction
    extract_images_from_slide_xml(slide_xml_path, rels_xml_path, media_folder, output_folder)
