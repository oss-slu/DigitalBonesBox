import xml.etree.ElementTree as ET
import os
import shutil

def extract_images_from_xml(xml_folder_path, media_folder_path, output_dir):
    # Ensure the output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Loop through each XML file in the XML folder
    for xml_file_name in os.listdir(xml_folder_path):
        if xml_file_name.endswith('.xml'):
            xml_file_path = os.path.join(xml_folder_path, xml_file_name)
            
            # Parse the XML file
            tree = ET.parse(xml_file_path)
            root = tree.getroot()

            # Search for image references in the XML file
            for element in root.iter():  # Adjust this to specific tags if necessary
                target = element.attrib.get('Target')
                if target and target.startswith('../media/'):
                    # Construct the full path to the media file
                    media_file_name = os.path.basename(target)
                    media_file_path = os.path.join(media_folder_path, media_file_name)

                    # Define the output path for the image
                    output_image_path = os.path.join(output_dir, media_file_name)

                    # Copy the image file to the output directory
                    if os.path.exists(media_file_path):
                        shutil.copy(media_file_path, output_image_path)
                        print(f"Saved {media_file_name} to {output_image_path}")
                    else:
                        print(f"Image file not found: {media_file_path}")

# Example usage
xml_folder_path = '/Users/burhankhan/Desktop/CSCI-4961-01/ppt/slides/'
media_folder_path = '/Users/burhankhan/Desktop/CSCI-4961-01/ppt/media/image1.png'
output_dir = '/Users/burhankhan/Desktop/CSCI-4961-01'
extract_images_from_xml(xml_folder_path, media_folder_path, output_dir)
