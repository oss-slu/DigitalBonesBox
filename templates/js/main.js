import { fetchBonesetData, findBoneById, extractDropdownData } from "./api.js";
import { populateBonesetDropdown, setupDropdownListeners } from "./dropdowns.js";
import { initializeSidebar } from "./sidebar.js";
import { setupNavigation, setBoneAndSubbones, disableButtons } from "./navigation.js";
import { loadDescription } from "./description.js";
import { displayBoneData, clearViewer } from "./viewer.js";

// Single data structure for the entire application
let appData = {
    boneset: null,        // Complete boneset data from API
    dropdown: {           // Transformed data for dropdowns
        bonesets: [],
        bones: [],
        subbones: []
    }
};

/**
 * Displays error message to user when data fails to load
 */
function displayErrorMessage(message) {
    const annotationsOverlay = document.getElementById("annotations-overlay");
    if (annotationsOverlay) {
        annotationsOverlay.innerHTML = `
            <div style="padding: 20px; background-color: #fee; border: 1px solid #fcc; border-radius: 8px; color: #c33;">
                <strong>Error Loading Data</strong>
                <p>${message}</p>
                <p>Please check that the server is running and try refreshing the page.</p>
            </div>
        `;
    }
}

/**
 * Handles bone selection from dropdown
 * @param {string} boneId - The ID of the selected bone
 */
function handleBoneSelection(boneId) {
    if (!appData.boneset) {
        console.log("Boneset data not available");
        clearViewer();
        return;
    }

    const boneData = findBoneById(appData.boneset, boneId);
    if (!boneData) {
        console.log(`No data found for bone: ${boneId}`);
        clearViewer();
        return;
    }

    displayBoneData(boneData);
}

document.addEventListener("DOMContentLoaded", async () => {
    initializeSidebar();

    try {
        console.log("Loading boneset data...");
        appData.boneset = await fetchBonesetData("bony_pelvis");
        appData.dropdown = extractDropdownData(appData.boneset);
        console.log("Boneset data loaded successfully");
        
        populateBonesetDropdown(appData.dropdown.bonesets);
        setupDropdownListeners(appData.dropdown);

    } catch (error) {
        console.error("Failed to load data:", error);
        displayErrorMessage("Failed to load bone data from the server. Please ensure the API server is running.");
        return;
    }

    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");
    const subboneDropdown = document.getElementById("subbone-select");
    const boneDropdown = document.getElementById("bone-select");

    setupNavigation(prevButton, nextButton, subboneDropdown, loadDescription);

    boneDropdown.addEventListener("change", (event) => {
        const selectedBone = event.target.value;

        const relatedSubbones = appData.dropdown.subbones
            .filter(sb => sb.bone === selectedBone)
            .map(sb => sb.id);

        setBoneAndSubbones(selectedBone, relatedSubbones);
        populateSubboneDropdown(subboneDropdown, relatedSubbones);
        disableButtons(prevButton, nextButton);
        
        if (selectedBone) {
            handleBoneSelection(selectedBone);
        } else {
            clearViewer();
        }
    });

    const boneset = appData.dropdown.bonesets[0];
    if (boneset) {
        document.getElementById("boneset-select").value = boneset.id;
        const event = new Event("change");
        document.getElementById("boneset-select").dispatchEvent(event);
    }

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
