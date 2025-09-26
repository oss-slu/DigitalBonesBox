import { fetchCombinedData, fetchBonesetData, findBoneById } from "./api.js";
import { populateBonesetDropdown, setupDropdownListeners } from "./dropdowns.js";
import { initializeSidebar } from "./sidebar.js";
import { setupNavigation, setBoneAndSubbones, disableButtons } from "./navigation.js";
import { loadDescription } from "./description.js";
import { displayBoneData, clearViewer } from "./viewer.js";

let combinedData = { bonesets: [], bones: [], subbones: [] };
let liveBonesData = null; // NEW: Live data from API

/**
 * Handles bone selection from dropdown - NOW USES LIVE API DATA
 * @param {string} boneId - The ID of the selected bone
 */
function handleBoneSelection(boneId) {
    if (!liveBonesData) {
        console.log("Live boneset data not available");
        clearViewer();
        return;
    }

    // Find the bone or subbone in live data
    const boneData = findBoneById(liveBonesData, boneId);
    if (!boneData) {
        console.log(`No data found for bone: ${boneId}`);
        clearViewer();
        return;
    }

    // Use the dedicated viewer module to display the bone with live data
    displayBoneData(boneData);
}

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Sidebar behavior
    initializeSidebar();

    try {
        // 2. Load LIVE boneset data from API (replaces mock data)
        console.log("Loading live boneset data...");
        liveBonesData = await fetchBonesetData('bony_pelvis');
        console.log("Live boneset data loaded:", liveBonesData);
        
        // 3. Fetch dropdown data and populate dropdowns
        combinedData = await fetchCombinedData();
        populateBonesetDropdown(combinedData.bonesets);
        setupDropdownListeners(combinedData);

    } catch (error) {
        console.error("Failed to load data:", error);
        // Could add fallback to mock data here if needed
        clearViewer();
    }

    // 4. Hook up navigation buttons
    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");
    const subboneDropdown = document.getElementById("subbone-select");
    const boneDropdown = document.getElementById("bone-select");

    setupNavigation(prevButton, nextButton, subboneDropdown, loadDescription);

    // 5. Update navigation when bone changes
    boneDropdown.addEventListener("change", (event) => {
        const selectedBone = event.target.value;

        const relatedSubbones = combinedData.subbones
            .filter(sb => sb.bone === selectedBone)
            .map(sb => sb.id);

        setBoneAndSubbones(selectedBone, relatedSubbones);
        populateSubboneDropdown(subboneDropdown, relatedSubbones);
        disableButtons(prevButton, nextButton);
        
        // Handle bone selection using live API data
        if (selectedBone) {
            handleBoneSelection(selectedBone);
        } else {
            clearViewer();
        }
    });

    // 6. Auto-select the first boneset
    const boneset = combinedData.bonesets[0];
    if (boneset) {
        document.getElementById("boneset-select").value = boneset.id;
        const event = new Event("change");
        document.getElementById("boneset-select").dispatchEvent(event);
    }

    // 7. Initialize display
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
