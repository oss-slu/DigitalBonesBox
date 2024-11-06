import xml.etree.ElementTree as ET

# Load and parse the XML file
def load_xml(file_path):
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        print(f"XML loaded successfully from {file_path}")
        return tree, root
    except ET.ParseError as e:
        print(f"Failed to parse XML: {e}")
        return None, None

# Access elements in the XML
def get_element_data(root, element_tag):
    elements = root.findall(element_tag)
    for elem in elements:
        print(ET.tostring(elem, encoding="utf-8").decode("utf-8"))

# Modify elements in the XML
def modify_element(root, element_tag, new_text):
    elements = root.findall(element_tag)
    for elem in elements:
        elem.text = new_text
    print(f"Updated text of '{element_tag}' to '{new_text}'")

# Save the modified XML to a new file
def save_xml(tree, output_path):
    try:
        tree.write(output_path, encoding="utf-8", xml_declaration=True)
        print(f"XML saved successfully to {output_path}")
    except Exception as e:
        print(f"Failed to save XML: {e}")

# Example usage
if __name__ == "__main__":
    file_path = "input.xml"
    output_path = "output.xml"

    # Load XML
    tree, root = load_xml(file_path)
    
    if root is not None:
        # Access specific elements
        get_element_data(root, "element_tag")  # Replace 'element_tag' with actual XML tag

        # Modify elements
        modify_element(root, "element_tag", "New Text")  # Replace 'element_tag' with actual XML tag

        # Save modified XML
        save_xml(tree, output_path)
