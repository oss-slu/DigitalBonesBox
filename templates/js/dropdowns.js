// js/dropdowns.js
import { loadDescription } from "./description.js";

export function populateBonesetDropdown(bonesets) {
  const bonesetSelect = document.getElementById("boneset-select");
  if (!bonesetSelect) {
    console.error("populateBonesetDropdown: #boneset-select not found in DOM");
    return;
  }

  // Defensive logging
  console.debug("populateBonesetDropdown called, bonesets length:", Array.isArray(bonesets) ? bonesets.length : typeof bonesets);

  bonesetSelect.innerHTML = "<option value=\"\">--Please select a Boneset--</option>";

  if (!bonesets || bonesets.length === 0) {
    // Provide a user-visible fallback option
    bonesetSelect.innerHTML = "<option value=\"\">--No bonesets available--</option>";
    bonesetSelect.disabled = true;
    console.warn("populateBonesetDropdown: no bonesets to populate");
    return;
  }

  bonesets.forEach((set) => {
    const option = document.createElement("option");
    option.value = set.id;
    option.textContent = set.name;
    bonesetSelect.appendChild(option);
  });
  bonesetSelect.disabled = false;
}

export function setupDropdownListeners(combinedData) {
  const bonesetSelect = document.getElementById("boneset-select");
  const boneSelect = document.getElementById("bone-select");
  const subboneSelect = document.getElementById("subbone-select");

  // Defensive logging to verify combinedData shape
  if (!combinedData) {
    console.error("setupDropdownListeners: combinedData is falsy");
    return;
  }
  console.debug("setupDropdownListeners: bones:", Array.isArray(combinedData.bones) ? combinedData.bones.length : typeof combinedData.bones,
    "subbones:", Array.isArray(combinedData.subbones) ? combinedData.subbones.length : typeof combinedData.subbones);

  bonesetSelect.addEventListener("change", (e) => {
    const selectedBonesetId = e.target.value;

    boneSelect.innerHTML = "<option value=\"\">--Please choose a Bone--</option>";
    subboneSelect.innerHTML = "<option value=\"\">--Please choose a Sub-Bone--</option>";
    subboneSelect.disabled = true;

    const relatedBones = combinedData.bones.filter(
      (b) => b.boneset === selectedBonesetId
    );
    console.debug("boneset change, related bones:", relatedBones.length, relatedBones.map(b => b.id).slice(0, 10));
    relatedBones.forEach((bone) => {
      const option = document.createElement("option");
      option.value = bone.id;
      option.textContent = bone.name;
      boneSelect.appendChild(option);
    });

    boneSelect.disabled = relatedBones.length === 0;
  });

  boneSelect.addEventListener("change", (e) => {
    const selectedBoneId = e.target.value;

    subboneSelect.innerHTML = "<option value=\"\">--Please choose a Sub-Bone--</option>";

    const relatedSubbones = combinedData.subbones.filter(
      (sb) => sb.bone === selectedBoneId
    );
    console.debug("bone change, related subbones:", relatedSubbones.length);
    relatedSubbones.forEach((sb) => {
      const option = document.createElement("option");
      option.value = sb.id;
      option.textContent = sb.name;
      subboneSelect.appendChild(option);
    });

    subboneSelect.disabled = relatedSubbones.length === 0;

    if (selectedBoneId) loadDescription(selectedBoneId);
  });

  subboneSelect.addEventListener("change", (e) => {
    const selectedSubboneId = e.target.value;
    if (selectedSubboneId) loadDescription(selectedSubboneId);
  });
}
