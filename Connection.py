from flask import Flask, render_template

app = Flask(__name__)

# Define a route for each bone detail page
@app.route('/bones/<bone_name>')
def bone_detail(bone_name):
    # Render a template and pass the bone_name to display specific details
    return render_template('bone_detail.html', bone_name=bone_name)

if __name__ == '__main__':
    app.run(debug=True)

