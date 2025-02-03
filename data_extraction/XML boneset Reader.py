import os
import xml.etree.ElementTree as ET
import json

def extract_bones_from_xml(xml_path):
    """
    Parses the XML file and extracts bonesets and their associated bones.
    Returns a dictionary with boneset names as keys and lists of bones as values.
    """
    try:
        print(f"Parsing XML: {xml_path}")
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except ET.ParseError as e:
        print(f"Error parsing {xml_path}: {e}")
        return {}

    # Namespace handling for XML
    ns = {
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    }

    bonesets = {}  # Dictionary to store bonesets

    INVALID_BONESETS = {"Home", "The", "Title", "Slide", "Overview"}  


    # Extract bonesets dynamically
    for boneset_element in root.findall(".//p:sp", ns):
        boneset_name_element = boneset_element.find(".//p:txBody//a:t", ns)
        
        if boneset_name_element is not None:

            boneset_name = boneset_name_element.text.strip()

            boneset_name_words = boneset_name.split()
            if not len(boneset_name_words) < 4:
                continue
            if not boneset_name or boneset_name in INVALID_BONESETS:
                continue

            if boneset_name and boneset_name not in bonesets:
                bonesets[boneset_name] = set()

            # Extract bones within this boneset
            for bone_element in boneset_element.findall(".//p:txBody//a:r/a:t", ns):
                bone_name = bone_element.text.strip() if bone_element.text else None
                if bone_name and is_valid_bone_name(bone_name, boneset_name):
                    bonesets[boneset_name].add(bone_name.capitalize())

    return bonesets

def generate_json_output(bonesets, output_json_path):
    """
    Converts bonesets dictionary into a structured JSON format and writes it to a file.
    """
    structured_data = []

    for boneset_name, bones in bonesets.items():
        structured_data.append({
            "boneset": boneset_name,
            "bones": sorted(bones),
        })

    # Save to JSON file
    try:
        with open(output_json_path, 'w') as json_file:
            json.dump(structured_data, json_file, indent=4)
            print(f"JSON file saved: {output_json_path}")
    except IOError as e:
        print(f"Error writing to {output_json_path}: {e}")

def is_valid_bone_name(name, boneset_name):
    """
    Determines if a given name is a valid bone name, excluding those that contain the boneset name.
    """
    if not name:  # Ignore empty strings
        return False

    if len(name) > 50:  # Ignore overly long strings
        return False

    if "(" in name or ")" in name:  # Ignore text with parentheses
        return False

    if any(char.isdigit() for char in name):  # Ignore names with digits
        return False

    if name.islower():  # Ignore entirely lowercase words
        return False

    if len(name.split()) > 3:
        return False

    # Exclude names that contain the boneset name (case-insensitive)
    if boneset_name and boneset_name.lower() in name.lower():
        return False

    if "Home" in name or "The" in name:
        return False

    return True

if __name__ == "__main__":
    # Get the directory of the current script
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # Define the XML and JSON file paths relative to the script's directory
    xml_file_path = os.path.join(current_dir, "slide2Pelvis.xml")
    json_file_path = os.path.join(current_dir, "output.json")

    # Extract bonesets and their bones
    bonesets = extract_bones_from_xml(xml_file_path)

    # Generate and save JSON output
    generate_json_output(bonesets, json_file_path)
