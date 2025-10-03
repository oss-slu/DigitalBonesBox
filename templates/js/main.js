import { fetchCombinedData, fetchMockBoneData } from "./api.js";
import { populateBonesetDropdown, setupDropdownListeners } from "./dropdowns.js";
import { initializeSidebar } from "./sidebar.js";
import { setupNavigation, setBoneAndSubbones, disableButtons } from "./navigation.js";
import { loadDescription } from "./description.js";
import { displayBoneData, clearViewer } from "./viewer.js";

// Base URL so a page on :5500 can talk to the API on :8000
const API = (window.API ?? (location.port === "8000" ? "" : "http://127.0.0.1:8000"));
window.API = API;

let combinedData = { bonesets: [], bones: [], subbones: [] };
let mockBoneData = null;

// Track which boneset is selected + a tiny cache
let currentBonesetId = "skull";
const bonesetCache = new Map();

/** Prefix a root-relative URL (e.g. "/images/...") with the API base. */
function withApi(u) {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;     // already absolute
  if (u.startsWith("/")) return `${API}${u}`; // root-relative from API host
  return u;                                   // something else; leave it
}

/** Ensure all image_url fields in a boneset dataset are absolute URLs. */
function patchMockDataUrls(dataset) {
  if (!dataset || !Array.isArray(dataset.bones)) return dataset;
  dataset.bones.forEach((b) => {
    if (b.image_url) b.image_url = withApi(b.image_url);
    if (Array.isArray(b.subbones)) {
      b.subbones.forEach((sb) => {
        if (sb.image_url) sb.image_url = withApi(sb.image_url);
      });
    }
  });
  return dataset;
}

/** Fetch any boneset by id, with caching and URL patching. */
async function getBoneset(bonesetId) {
  if (bonesetId === "skull" && mockBoneData) return mockBoneData;
  if (bonesetCache.has(bonesetId)) return bonesetCache.get(bonesetId);

  const res = await fetch(`${API}/api/boneset/${bonesetId}`);
  if (!res.ok) throw new Error(`Failed to load boneset ${bonesetId}: ${res.status}`);
  const data = await res.json();
  patchMockDataUrls(data); // make sure /images/... are absolute when needed
  bonesetCache.set(bonesetId, data);
  return data;
}

/**
 * Handle bone selection from the dropdown.
 * Loads the bone from whichever boneset is currently active.
 */
async function handleBoneSelection(boneId) {
  const dataset = await getBoneset(currentBonesetId);
  if (!dataset || !Array.isArray(dataset.bones)) {
    console.log("Dataset not available for", currentBonesetId);
    clearViewer();
    return;
  }

  const bone = dataset.bones.find((b) => b.id === boneId);
  if (!bone) {
    console.log(`No data found for bone: ${boneId} in ${currentBonesetId}`);
    clearViewer();
    return;
  }

  const safeBone = {
    ...bone,
    image_url: withApi(bone.image_url),
    subbones: (bone.subbones || []).map((sb) => ({
      ...sb,
      image_url: withApi(sb.image_url),
    })),
  };

  displayBoneData(safeBone);
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1) Sidebar behavior
  initializeSidebar();

  // 2) Load skull data once (default) using the API
  mockBoneData = await fetchMockBoneData();
  patchMockDataUrls(mockBoneData);

  // 3) Fetch data for dropdowns
  combinedData = await fetchCombinedData();
  populateBonesetDropdown(combinedData.bonesets);
  setupDropdownListeners(combinedData);

  // 4) Hook up navigation and dropdowns
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");
  const subboneDropdown = document.getElementById("subbone-select");
  const boneDropdown = document.getElementById("bone-select");
  const bonesetDropdown = document.getElementById("boneset-select");

  setupNavigation(prevButton, nextButton, subboneDropdown, loadDescription);

  // Update which boneset is active when user changes it
  bonesetDropdown.addEventListener("change", async (e) => {
    const v = e.target.value || "skull";
    currentBonesetId = v;
    clearViewer();
    // Warm cache so the first bone image shows instantly after switching
    try { await getBoneset(currentBonesetId); } catch {}
  });

  // When bone changes, load from the active boneset
  boneDropdown.addEventListener("change", async (event) => {
    const selectedBone = event.target.value;

    const relatedSubbones = combinedData.subbones
      .filter((sb) => sb.bone === selectedBone)
      .map((sb) => sb.id);

    setBoneAndSubbones(selectedBone, relatedSubbones);
    populateSubboneDropdown(subboneDropdown, relatedSubbones);
    disableButtons(prevButton, nextButton);

    if (selectedBone) {
      await handleBoneSelection(selectedBone); // respects currentBonesetId
    } else {
      clearViewer();
    }
  });

  // 5) Auto-select the first boneset and trigger dependent UI
  const first = combinedData.bonesets[0];
  if (first) {
    bonesetDropdown.value = first.id;
    currentBonesetId = first.id;
    bonesetDropdown.dispatchEvent(new Event("change"));
  }

  // 6) Initialize display
  clearViewer();
});

function populateSubboneDropdown(dropdown, subbones) {
  dropdown.innerHTML = "";
  subbones.forEach((subboneId) => {
    const option = document.createElement("option");
    option.value = subboneId;
    option.textContent = subboneId.replace(/_/g, " ");
    dropdown.appendChild(option);
  });
}
