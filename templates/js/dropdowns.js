// js/dropdowns.js
import { loadDescription } from "./description.js";
import { loadBoneImages, clearImages } from "./imagedisplay.js";

export function populateBonesetDropdown(bonesets) {
  const bonesetSelect = document.getElementById("boneset-select");
  bonesetSelect.innerHTML =
    '<option value="">--Please select a Boneset--</option>';

  bonesets.forEach((set) => {
    const option = document.createElement("option");
    option.value = set.id;
    option.textContent = set.name;
    bonesetSelect.appendChild(option);
  });
}

export function setupDropdownListeners(combinedData) {
  const bonesetSelect = document.getElementById("boneset-select");
  const boneSelect = document.getElementById("bone-select");
  const subboneSelect = document.getElementById("subbone-select");

  // 🦴 When Boneset changes
  bonesetSelect.addEventListener("change", (e) => {
    const selectedBonesetId = e.target.value;

    // Reset dependent dropdowns
    boneSelect.innerHTML = '<option value="">--Please choose a Bone--</option>';
    subboneSelect.innerHTML =
      '<option value="">--Please choose a Sub-Bone--</option>';
    subboneSelect.disabled = true;

    // Clear any currently shown images
    clearImages();

    // Populate bones that belong to the selected boneset
    const relatedBones = combinedData.bones.filter(
      (b) => b.boneset === selectedBonesetId
    );
    relatedBones.forEach((bone) => {
      const option = document.createElement("option");
      option.value = bone.id;
      option.textContent = bone.name;
      boneSelect.appendChild(option);
    });

    boneSelect.disabled = relatedBones.length === 0;
  });

  // 🦴 When Bone changes
  boneSelect.addEventListener("change", (e) => {
    const selectedBoneId = e.target.value;

    // Reset sub-bone dropdown
    subboneSelect.innerHTML =
      '<option value="">--Please choose a Sub-Bone--</option>';

    // Populate sub-bones related to this bone
    const relatedSubbones = combinedData.subbones.filter(
      (sb) => sb.bone === selectedBoneId
    );
    relatedSubbones.forEach((sb) => {
      const option = document.createElement("option");
      option.value = sb.id;
      option.textContent = sb.name;
      subboneSelect.appendChild(option);
    });

    subboneSelect.disabled = relatedSubbones.length === 0;

    // Load data for the selected bone
    if (selectedBoneId) {
      loadDescription(selectedBoneId);
      loadBoneImages(selectedBoneId);
    } else {
      clearImages();
    }
  });

  // 🦴 When Sub-bone changes
  subboneSelect.addEventListener("change", (e) => {
    const selectedSubboneId = e.target.value;

    if (selectedSubboneId) {
      loadDescription(selectedSubboneId);
      loadBoneImages(selectedSubboneId);
    } else {
      clearImages();
    }
  });
}
