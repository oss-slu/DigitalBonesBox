import { fetchCombinedData, fetchMockBoneData } from "./api.js";
import { populateBonesetDropdown, setupDropdownListeners } from "./dropdowns.js";
import { initializeSidebar, loadHelpButton } from "./sidebar.js";
import { setupNavigation, setBoneAndSubbones, disableButtons } from "./navigation.js";
import { loadDescription } from "./description.js";
import { displayBoneData, clearViewer } from "./viewer.js";
import { initializeSearch } from "./search.js";

let combinedData = { bonesets: [], bones: [], subbones: [] };
let mockBoneData = null;

/**
 * Handles bone selection from dropdown
 * @param {string} boneId - The ID of the selected bone
 */
function handleBoneSelection(boneId) {
    if (!mockBoneData) {
        console.log("Mock data not available");
        return;
    }

    const bone = mockBoneData.bones.find(b => b.id === boneId);
    if (!bone) {
        console.log(`No mock data found for bone: ${boneId}`);
        clearViewer();
        return;
    }

    // Use the dedicated viewer module to display the bone
    displayBoneData(bone);
}

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialize search functionality
    initializeSearch();
    
    // 2. Sidebar behavior and help button
    initializeSidebar();
    loadHelpButton();

    // 3. Load mock bone data using centralized API
    mockBoneData = await fetchMockBoneData();
    
    // 4. Fetch data and populate dropdowns
    combinedData = await fetchCombinedData();
    populateBonesetDropdown(combinedData.bonesets);
    setupDropdownListeners(combinedData);

    // 5. Setup navigation after everything else
    setupNavigation(combinedData);
    disableButtons();

    // 6. Update navigation when bone changes
    const boneDropdown = document.getElementById("bone-select");
    boneDropdown.addEventListener("change", (event) => {
        const selectedBone = event.target.value;

        const relatedSubbones = combinedData.subbones
            .filter(sb => sb.bone === selectedBone)
            .map(sb => sb.id);

        setBoneAndSubbones(selectedBone, relatedSubbones);
        populateSubboneDropdown(document.getElementById("subbone-select"), relatedSubbones);
        disableButtons();

        // Handle bone selection using dedicated function
        if (selectedBone) {
            handleBoneSelection(selectedBone);
        } else {
            clearViewer();
        }
    });

    // 7. Auto-select the first boneset
    const boneset = combinedData.bonesets[0];
    if (boneset) {
        document.getElementById("boneset-select").value = boneset.id;
        const event = new Event("change");
        document.getElementById("boneset-select").dispatchEvent(event);
    }

    // 8. Initialize display
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
