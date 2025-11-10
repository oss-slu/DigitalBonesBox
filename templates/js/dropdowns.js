// js/dropdowns.js
import { loadDescription } from "./description.js";
import { displayBoneImages, clearImages, showPlaceholder } from "./imageDisplay.js"; // keep this line

// Show the placeholder as soon as the page loads
document.addEventListener("DOMContentLoaded", () => {
  showPlaceholder();
});

// Backend API base (runs on 8000)
const API_BASE = "http://127.0.0.1:8000";

/** Helper: fetch images for a bone/sub-bone and render them */
async function loadBoneImages(boneId) {
  if (!boneId) { showPlaceholder(); return; }   // ← show friendly message if nothing selected
  try {
    const res = await fetch(`${API_BASE}/api/bone-data/?boneId=${encodeURIComponent(boneId)}`);
    if (!res.ok) {
      console.warn("bone-data API error:", res.status, boneId);
      showPlaceholder();                        // ← fallback to message
      return;
    }
    const data = await res.json();
    const images = Array.isArray(data.images) ? data.images : [];
    if (images.length === 0) {
      showPlaceholder();                        // ← message if backend returns no images
    } else {
      displayBoneImages(images, boneId);        // ← Pass boneId for colored regions
    }
  } catch (err) {
    console.error("Failed to load bone images:", err);
    showPlaceholder();                          // ← message on error
  }
}

export function populateBonesetDropdown(bonesets) {
  const bonesetSelect = document.getElementById("boneset-select");
  if (!bonesetSelect) {
    console.error("populateBonesetDropdown: #boneset-select not found in DOM");
    return;
  }

  // Defensive logging
  console.debug(
    "populateBonesetDropdown called, bonesets length:",
    Array.isArray(bonesets) ? bonesets.length : typeof bonesets
  );

  bonesetSelect.innerHTML = "<option value=\"\">--Please select a Boneset--</option>";

  if (!bonesets || bonesets.length === 0) {
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
  const bonesetSelect  = document.getElementById("boneset-select");
  const boneSelect     = document.getElementById("bone-select");
  const subboneSelect  = document.getElementById("subbone-select");

  if (!combinedData) return;

  // --- Boneset change → repopulate bones, show default images (no UI auto-select)
  bonesetSelect.addEventListener("change", (e) => {
    const selectedBonesetId = e.target.value;

    // reset dependent dropdowns
    boneSelect.innerHTML    = "<option value=\"\">--Please choose a Bone--</option>";
    subboneSelect.innerHTML = "<option value=\"\">--Please choose a Sub-Bone--</option>";
    subboneSelect.disabled  = true;

    // populate bones for this boneset
    const relatedBones = combinedData.bones.filter(b => b.boneset === selectedBonesetId);
    relatedBones.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.name;
      boneSelect.appendChild(opt);
    });
    boneSelect.disabled = relatedBones.length === 0;

    // nothing selected or no bones → placeholder
    if (!selectedBonesetId || relatedBones.length === 0) {
      showPlaceholder();
      return;
    }

    // show the default images for the boneset *without* changing the UI selection
    const firstBone = relatedBones[0];
    loadBoneImages(firstBone.id);
  });

  // --- Bone change → repopulate subbones + load description/images
  boneSelect.addEventListener("change", (e) => {
    const selectedBoneId = e.target.value;

    // reset subbones
    subboneSelect.innerHTML = "<option value=\"\">--Please choose a Sub-Bone--</option>";

    // repopulate subbones for chosen bone
    const relatedSubbones = combinedData.subbones.filter(sb => sb.bone === selectedBoneId);
    relatedSubbones.forEach(sb => {
      const opt = document.createElement("option");
      opt.value = sb.id;
      opt.textContent = sb.name;
      subboneSelect.appendChild(opt);
    });
    subboneSelect.disabled = relatedSubbones.length === 0;

    if (selectedBoneId) {
      loadDescription(selectedBoneId);
      loadBoneImages(selectedBoneId);
    } else {
      showPlaceholder();
    }
  });

  // --- Sub-bone change → load description/images or placeholder
  subboneSelect.addEventListener("change", (e) => {
    const selectedSubboneId = e.target.value;
    if (selectedSubboneId) {
      loadDescription(selectedSubboneId);
      loadBoneImages(selectedSubboneId);
    } else {
      showPlaceholder();
    }
  });
}
