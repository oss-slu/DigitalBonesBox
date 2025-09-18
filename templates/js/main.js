import { fetchCombinedData, fetchMockBoneData } from "./api.js";
import { populateBonesetDropdown, setupDropdownListeners } from "./dropdowns.js";
import { initializeSidebar } from "./sidebar.js";
import { setupNavigation, setBoneAndSubbones, disableButtons } from "./navigation.js";
import { loadDescription } from "./description.js";
import { displayBoneData, clearViewer } from "./viewer.js";

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
    // 1. Sidebar behavior
    initializeSidebar();

    // 2. Load mock bone data using centralized API
    mockBoneData = await fetchMockBoneData();
    
    // 3. Fetch data and populate dropdowns
    combinedData = await fetchCombinedData();
    populateBonesetDropdown(combinedData.bonesets);
    setupDropdownListeners(combinedData);

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
        
        // Handle bone selection using dedicated function
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
