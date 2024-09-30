from flask import Flask, jsonify, render_template, send_from_directory
import json

app = Flask(__name__)

# Route to serve the HTMX page
@app.route('/')
def index():
    return render_template('index.html')

# Route to load the bone JSON data
@app.route('/load-bone')
def load_bone():
    # Load the bone data
    with open('bonedata.json') as f:
        bone_data = json.load(f)

    # Load annotation data based on the bone annotations
    annotations = []
    for annotation_id in bone_data['annotations']:
        with open(f'annotationskull.json') as f:
            annotation = json.load(f)
            if annotation['bone_id'] == bone_data['id']:
                annotations.append(annotation)

    # Add annotations to bone data
    bone_data['annotations_list'] = annotations

    return jsonify(bone_data)

# Serve the image from the directory
@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory('images', filename)

if __name__ == '__main__':
    app.run(debug=True)
