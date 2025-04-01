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

    subBoneSelect.disabled = false;
}
