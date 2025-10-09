import xml.etree.ElementTree as ET

slide_path = "boneypelvis_ppt/slides/slide3.xml"
tree = ET.parse(slide_path)
root = tree.getroot()

ns = {
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

# Method 1: Look for text runs with hyperlinks
print("Method 1: Text runs with hyperlinks")
for run in root.findall('.//a:r', ns):
    props = run.find('a:rPr', ns)
    if props is not None:
        hlink = props.find('a:hlinkClick', ns)
        if hlink is not None:
            text_elem = run.find('a:t', ns)
            if text_elem is not None and text_elem.text:
                print(f"  Found: '{text_elem.text.strip()}'")

# Method 2: Look at all text with underline (hyperlinks are usually underlined)
print("\nMethod 2: All text elements")
for text_elem in root.findall('.//a:t', ns):
    if text_elem.text:
        print(f"  Text: '{text_elem.text.strip()}'")