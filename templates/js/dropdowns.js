// templates/js/dropdowns.js
import { loadDescription } from "./description.js";

export function populateBonesetDropdown(bonesets) {
  const bonesetSelect = document.getElementById("boneset-select");
  bonesetSelect.innerHTML = "<option value=\"\">--Please select a Boneset--</option>";

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

  bonesetSelect.addEventListener("change", (e) => {
    const selectedBonesetId = e.target.value;

    boneSelect.innerHTML = "<option value=\"\">--Please choose a Bone--</option>";
    subboneSelect.innerHTML = "<option value=\"\">--Please choose a Sub-Bone--</option>";
    subboneSelect.disabled = true;

    // clear description on boneset change
    const desc = document.getElementById("description-Container");
    if (desc) desc.innerHTML = "";

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

  boneSelect.addEventListener("change", (e) => {
    const selectedBonesetId = bonesetSelect.value;
    const selectedBoneId = e.target.value;

    subboneSelect.innerHTML = "<option value=\"\">--Please choose a Sub-Bone--</option>";

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

    if (selectedBoneId) loadDescription(selectedBonesetId, selectedBoneId);
  });

  subboneSelect.addEventListener("change", (e) => {
    const selectedBonesetId = bonesetSelect.value;
    const selectedSubboneId = e.target.value;
    if (selectedSubboneId) loadDescription(selectedBonesetId, selectedSubboneId);
  });
}
