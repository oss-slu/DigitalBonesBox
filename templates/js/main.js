import { fetchCombinedData, fetchBoneData } from "./api.js";
import { populateBonesetDropdown, setupDropdownListeners } from "./dropdowns.js";
import { initializeSidebar, loadHelpButton } from "./sidebar.js";
import { setupNavigation, setBoneAndSubbones, disableButtons } from "./navigation.js";
import { loadDescription } from "./description.js";
import { displayBoneData, clearViewer } from "./viewer.js";
import { initializeSearch } from "./search.js";

let combinedData = { bonesets: [], bones: [], subbones: [] };

/**
 * Handles bone selection from dropdown
 * @param {string} boneId - The ID of the selected bone
 */
// handleBoneSelection is defined inside DOMContentLoaded after DOM elements are known

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialize search functionality
    initializeSearch();

    // 2. Sidebar behavior and help button
    initializeSidebar();
    loadHelpButton();



    // 4. Fetch data and populate dropdowns
    combinedData = await fetchCombinedData();
    populateBonesetDropdown(combinedData.bonesets);
    setupDropdownListeners(combinedData);

    // Keep bone and subbone selects disabled until the user explicitly selects a boneset
    const boneSelectEl = document.getElementById("bone-select");
    const subboneSelectEl = document.getElementById("subbone-select");
    if (boneSelectEl) boneSelectEl.disabled = true;
    if (subboneSelectEl) {
        subboneSelectEl.disabled = true;
        // Ensure the placeholder is present and selected
        subboneSelectEl.innerHTML = "<option value=\"\">--Please choose a Sub-Bone--</option>";
        subboneSelectEl.selectedIndex = 0;
    }

    // Clear any description so nothing is shown until the user selects a boneset/bone
    const descContainer = document.getElementById("description-Container");
    if (descContainer) descContainer.innerHTML = "";

    // 5. Setup navigation after everything else
    // Pass DOM elements and the description updater to the navigation module
    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");
    const subboneDropdown = document.getElementById("subbone-select");

    // Log fetched data for troubleshooting when dropdowns are empty
    console.debug("combinedData:", combinedData);

    setupNavigation(prevButton, nextButton, subboneDropdown, loadDescription);
    // Initialize button states
    disableButtons(prevButton, nextButton);

    // 6. Update navigation when bone changes
    const boneDropdown = document.getElementById("bone-select");
    boneDropdown.addEventListener("change", (event) => {
        const selectedBone = event.target.value;

        const relatedSubbones = combinedData.subbones
            .filter(sb => sb.bone === selectedBone)
            .map(sb => sb.id);

        setBoneAndSubbones(selectedBone, relatedSubbones);
        populateSubboneDropdown(document.getElementById("subbone-select"), relatedSubbones);
        disableButtons(prevButton, nextButton);

        // Handle bone selection by fetching full bone data from the backend
        if (selectedBone) {
            (async () => {
                const boneData = await fetchBoneData(selectedBone);
                if (!boneData) {
                    console.warn(`No bone data available for ${selectedBone}`);
                    clearViewer();
                    return;
                }
                displayBoneData(boneData);
            })();
        } else {
            clearViewer();
        }
    });

    // (No auto-select) The UI shows the boneset placeholder and waits for user selection

    // 8. Initialize display
    clearViewer();
});

function populateSubboneDropdown(dropdown, subbones) {
    // Leave a placeholder option so the user must explicitly select a subbone
    dropdown.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "--Please choose a Sub-Bone--";
    dropdown.appendChild(placeholder);

    if (!subbones || subbones.length === 0) {
        // No subbones available; keep only the placeholder and disable the control
        dropdown.disabled = true;
        return;
    }

    subbones.forEach((subboneId) => {
        const option = document.createElement("option");
        option.value = subboneId;
        option.textContent = subboneId.replace(/_/g, " ");
        dropdown.appendChild(option);
    });

    // Ensure the placeholder remains selected so a subbone is not auto-displayed
    dropdown.selectedIndex = 0;
    dropdown.disabled = false;
}
