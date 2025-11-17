// templates/js/dropdowns.js
import { loadDescription } from "./description.js";
import { displayBoneImages, clearImages, showPlaceholder } from "./imageDisplay.js";
import { loadAndDrawAnnotations, clearAnnotations } from "./annotationOverlay.js";

// Show the placeholder ASAP
document.addEventListener("DOMContentLoaded", () => {
  showPlaceholder();
});

// ---- Map/lookup you can extend later -----------------
let _boneById = {}; // filled in setupDropdownListeners

function getImageStage() {
  return /** @type {HTMLElement|null} */ (document.getElementById("bone-image-container"));
}

// Function maybeLoadAnnotations: Logic removed. Annotation URL construction is now in the listeners.
async function maybeLoadAnnotations(boneId) {
  const stage = getImageStage();
  if (!stage) return;

  // remove any previous overlay
  clearAnnotations(stage);
  stage.classList.remove("with-annotations");
  
  // Note: The logic for loading the annotation file used to be here, but has been 
  // refactored into the dropdown listeners (using the 'opts' object) to use the API endpoint.
}

// Backend API base (runs on 8000)
const API_BASE = "http://127.0.0.1:8000";

/** Helper: fetch images for a bone/sub-bone and render them */
async function loadBoneImages(boneId, options = {}) {
  const stage = getImageStage();
  if (!boneId) {
    showPlaceholder();
    if (stage) { clearAnnotations(stage); stage.classList.remove("with-annotations"); }
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/bone-data/?boneId=${encodeURIComponent(boneId)}`);
    if (!res.ok) {
      console.warn("bone-data API error:", res.status, boneId);
      showPlaceholder();
      if (stage) { clearAnnotations(stage); stage.classList.remove("with-annotations"); }
      return;
    }
    const data = await res.json();
    const images = Array.isArray(data.images) ? data.images : [];
    if (images.length === 0) {
      showPlaceholder();
      if (stage) { clearAnnotations(stage); stage.classList.remove("with-annotations"); }
    } else {
      // Pass both boneId (for colored regions) and options (for text annotations)
      displayBoneImages(images, { ...options, boneId });
    }
  } catch (err) {
    console.error("Failed to load bone images:", err);
    showPlaceholder();
    if (stage) { clearAnnotations(stage); stage.classList.remove("with-annotations"); }
  }
}

export function populateBonesetDropdown(bonesets) {
  const bonesetSelect = document.getElementById("boneset-select");
  if (!bonesetSelect) {
    console.error("populateBonesetDropdown: #boneset-select not found in DOM");
    return;
  }
  bonesetSelect.innerHTML = "<option value=\"\">--Please select a Boneset--</option>";
  if (!bonesets || bonesets.length === 0) {
    bonesetSelect.innerHTML = "<option value=\"\">--No bonesets available--</option>";
    bonesetSelect.disabled = true;
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

  // Build quick lookup
  _boneById = Object.fromEntries((combinedData.bones || []).map(b => [b.id, b]));

  // Boneset change
bonesetSelect.addEventListener("change", (e) => {
  const selectedBonesetId = e.target.value;

  boneSelect.innerHTML    = "<option value=\"\">--Please choose a Bone--</option>";
  subboneSelect.innerHTML = "<option value=\"\">--Please choose a Sub-Bone--</option>";
  subboneSelect.disabled  = true;

  const relatedBones = combinedData.bones.filter(b => b.boneset === selectedBonesetId);
  relatedBones.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name;
    boneSelect.appendChild(opt);
  });
  boneSelect.disabled = relatedBones.length === 0;

  if (!selectedBonesetId || relatedBones.length === 0) {
    showPlaceholder();
    const stage = getImageStage();
    if (stage) { clearAnnotations(stage); stage.classList.remove("with-annotations"); }
    return;
  }

  // Preview first bone’s images
  const firstBone = relatedBones[0];
  const bonesetName =
    (bonesetSelect.options[bonesetSelect.selectedIndex]?.text || "").trim().toLowerCase();

  // ARCHITECTURAL FIX: Use API endpoint for Bony Pelvis annotations
  const opts = (bonesetName === "bony pelvis")
    ? { 
        annotationsUrl: `${API_BASE}/api/annotations/${firstBone.id}`,
        isBonesetSelection: true // Flag to indicate boneset selection
      }
    : {};

  loadBoneImages(firstBone.id, opts);
});


  // Bone change
  boneSelect.addEventListener("change", (e) => {
    const selectedBoneId = e.target.value;

    subboneSelect.innerHTML = "<option value=\"\">--Please choose a Sub-Bone--</option>";

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
       // if the selected bone's label is exactly "Bony Pelvis", add the overlay for slide 02
      const boneName =
        (boneSelect.options[boneSelect.selectedIndex]?.text || "").trim().toLowerCase();

      // ARCHITECTURAL FIX: Use API endpoint for Bony Pelvis annotations
      const opts =
        boneName === "bony pelvis"
          ? { annotationsUrl: `${API_BASE}/api/annotations/${selectedBoneId}` } // **MODIFIED**
          : {};
      loadBoneImages(selectedBoneId, opts);
    } else {
      showPlaceholder();
      const stage = getImageStage();
      if (stage) { clearAnnotations(stage); stage.classList.remove("with-annotations"); }
    }
  });

  // Sub-bone change
  subboneSelect.addEventListener("change", (e) => {
    const selectedSubboneId = e.target.value;
    if (selectedSubboneId) {
      loadDescription(selectedSubboneId);
      loadBoneImages(selectedSubboneId);
    } else {
      showPlaceholder();
      const stage = getImageStage();
      if (stage) { clearAnnotations(stage); stage.classList.remove("with-annotations"); }
    }
  });
}