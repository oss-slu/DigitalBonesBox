const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/databones/';
const BONES_JSON_PATH = 'json/bones.json';

async function fetchJSON(path) {
    const url = GITHUB_RAW_URL + path;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Network response was not ok: ' + response.statusText);
    }
    return response.json();
}

function displayBones(bones) {
    const container = document.getElementById('bones-container');
    container.innerHTML = '';
    bones.forEach(bone => {
        const boneElement = document.createElement('div');
        boneElement.innerHTML = `
            <h2>${bone.name}</h2>
            <p>${bone.description}</p>
        `;
        container.appendChild(boneElement);
    });
}

module.exports = { fetchJSON, displayBones };

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('create-bone').addEventListener('click', () => openEditMode());
    document.getElementById('save-bone').addEventListener('click', saveBone);
    document.getElementById('cancel-edit').addEventListener('click', () => {
        document.getElementById('edit-mode').style.display = 'none';
    });
});