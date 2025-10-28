// js/main.js

console.log("main.js loaded");

import { fetchCombinedData, fetchMockBoneData } from "./api.js";
import { populateBonesetDropdown, setupDropdownListeners } from "./dropdowns.js";
import { initializeSidebar, loadHelpButton } from "./sidebar.js";
import { setupNavigation, setBoneAndSubbones, disableButtons } from "./navigation.js";
import { loadDescription } from "./description.js";
import { displayBoneData, clearViewer } from "./viewer.js";
import { initializeSearch } from "./search.js";

let combinedData = { bonesets: [], bones: [], subbones: [] };
let mockBoneData = null;

/** Optional: keep this if you still want to render mock viewer details */
function handleBoneSelection(boneId) {
  if (!mockBoneData) {
    console.warn("Mock data not available");
    return;
  }
  const bone = mockBoneData.bones?.find((b) => b.id === boneId);
  if (!bone) {
    console.warn(`No mock data found for bone: ${boneId}`);
    clearViewer();
    return;
  }
  displayBoneData(bone);
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1) Initialize UI bits
  initializeSearch?.();
  initializeSidebar?.();
  loadHelpButton?.();

  // 2) Load data
  try {
    mockBoneData = await fetchMockBoneData();
    combinedData = await fetchCombinedData();
  } catch (err) {
    console.error("Failed to load data:", err);
    return;
  }

  // 3) Populate boneset dropdown (matches your dropdowns.js signature)
  populateBonesetDropdown(combinedData.bonesets);

  // 4) Let dropdowns.js attach its own listeners for boneset/bone/subbone
  setupDropdownListeners(combinedData);

  // 5) (Optional) Add a lightweight listener ONLY for navigation + mock viewer
  //    This avoids duplicating the DOM work already done in dropdowns.js.
  const boneSelect = document.getElementById("bone-select");
  boneSelect.addEventListener("change", (e) => {
    const selectedBoneId = e.target.value;

    const relatedSubbones = combinedData.subbones
      .filter((sb) => sb.bone === selectedBoneId)
      .map((sb) => sb.id);

    setBoneAndSubbones(selectedBoneId, relatedSubbones);
    disableButtons();

    // If you want the mock viewer to render too:
    if (selectedBoneId) handleBoneSelection(selectedBoneId);
    else clearViewer();
  });

  // 6) Initial navigation wiring
  setupNavigation(combinedData);
  disableButtons();

  // 7) Auto-select the first boneset to kick things off
  const bonesetSelect = document.getElementById("boneset-select");
  if (combinedData.bonesets?.length && bonesetSelect) {
    bonesetSelect.value = combinedData.bonesets[0].id;
    bonesetSelect.dispatchEvent(new Event("change"));
  }

  // 8) Start with a clear viewer
  clearViewer();
});
