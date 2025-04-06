// import { loadDescription } from './description.js';

const API_URL = 'http://localhost:8000/combined-data';

let allData = { bonesets: [], bones: [], subbones: [] };

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(API_URL);
        allData = await res.json();
        populateBonesetDropdown(allData.bonesets);
    } catch (err) {
        console.error("Failed to load data from API", err);
    }
});

function populateBonesetDropdown(bonesets) {
    const bonesetSelect = document.getElementById("boneset-select");
    bonesetSelect.innerHTML = '<option value="">--Please select a Boneset--</option>';

    bonesets.forEach(set => {
        const option = document.createElement("option");
        option.value = set.id;
        option.textContent = set.name;
        bonesetSelect.appendChild(option);
    });

    bonesetSelect.addEventListener("change", () => {
        const selectedId = bonesetSelect.value;
        populateBoneDropdown(selectedId);
        document.getElementById("subbone-select").disabled = true;
    
        if (selectedId) loadDescription(selectedId);
    });
    
}

function populateBoneDropdown(bonesetId) {
    const boneSelect = document.getElementById("bone-select");
    boneSelect.innerHTML = '<option value="">--Please select a Bone--</option>';

    const filteredBones = allData.bones.filter(b => b.boneset === bonesetId);
    filteredBones.forEach(bone => {
        const option = document.createElement("option");
        option.value = bone.id;
        option.textContent = bone.name;
        boneSelect.appendChild(option);
    });

    boneSelect.disabled = false;

    boneSelect.addEventListener("change", () => {
        const selectedBone = boneSelect.value;
        populateSubboneDropdown(selectedBone);
        if (selectedBone) loadDescription(selectedBone);
    });
    
}

function populateSubboneDropdown(boneId) {
    const subBoneSelect = document.getElementById("subbone-select");
    subBoneSelect.innerHTML = '<option value="">--Please choose a Sub-Bone--</option>';

    const filteredSubbones = allData.subbones.filter(sb => sb.bone === boneId);
    filteredSubbones.forEach(sb => {
        const option = document.createElement("option");
        option.value = sb.id;
        option.textContent = sb.name;
        subBoneSelect.appendChild(option);
    });

    subBoneSelect.addEventListener("change", () => {
        const selectedSubbone = subBoneSelect.value;
        if (selectedSubbone) loadDescription(selectedSubbone);
    });    

    subBoneSelect.disabled = false;
}

const DESCRIPTION_BASE_URL = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/descriptions/";

export async function loadDescription(id) {
    const panel = document.getElementById("description-panel");
    panel.innerHTML = "Loading...";

    const url = `${DESCRIPTION_BASE_URL}${id}_description.json`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Description not found");

        const data = await response.json();

        const html = `
            <h3>${data.name}</h3>
            <ul>
                ${data.description.map(line => `<li>${line}</li>`).join("")}
            </ul>
        `;

        panel.innerHTML = html;
    } catch (err) {
        panel.innerHTML = `<p><em>Description not available for "${id}"</em></p>`;
        console.warn("Failed to load description:", err);
    }
}
