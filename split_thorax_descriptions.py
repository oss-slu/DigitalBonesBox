import json
import os

# Load the descriptions
with open('Thorax/bone_descriptions.json', 'r') as f:
    data = json.load(f)

output_dir = 'Thorax/Descriptions'
os.makedirs(output_dir, exist_ok=True)

# Clear existing files first
for file in os.listdir(output_dir):
    if file.endswith('.json'):
        os.remove(os.path.join(output_dir, file))

# Create a file for each slide (slides 2-28)
for i, bone in enumerate(data['bones'], start=2):
    slide_num = i
    filename = f'slide{slide_num}_description.json'
    filepath = os.path.join(output_dir, filename)
    
    # Create individual slide entry
    slide_data = {
        "slide": slide_num,
        "name": bone['name'],
        "id": bone['id'],
        "description": bone['description'],
        "images": []
    }
    
    with open(filepath, 'w') as f:
        json.dump(slide_data, f, indent=2)
    
    print(f'✓ Created {filename}')

print(f'\n✓ All {len(data["bones"])} descriptions split into individual slide files')
