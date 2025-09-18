import { fetchCombinedData } from "./api.js";
import { populateBonesetDropdown, setupDropdownListeners } from "./dropdowns.js";
import { initializeSidebar } from "./sidebar.js";
import { setupNavigation, setBoneAndSubbones, disableButtons } from "./navigation.js";
import { loadDescription } from "./description.js"; // ✅ CORRECT function name

let combinedData = { bonesets: [], bones: [], subbones: [] };

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Sidebar behavior
    initializeSidebar();

    // 2. Fetch data and populate dropdowns
    combinedData = await fetchCombinedData();
    populateBonesetDropdown(combinedData.bonesets);
    setupDropdownListeners(combinedData);

    // 3. Hook up navigation buttons
    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");
    const subboneDropdown = document.getElementById("subbone-select");
    const boneDropdown = document.getElementById("bone-select");

    setupNavigation(prevButton, nextButton, subboneDropdown, loadDescription);

    // 4. Update navigation when bone changes
    boneDropdown.addEventListener("change", (event) => {
        const selectedBone = event.target.value;

        const relatedSubbones = combinedData.subbones
            .filter(sb => sb.bone === selectedBone)
            .map(sb => sb.id);

        setBoneAndSubbones(selectedBone, relatedSubbones);
        populateSubboneDropdown(subboneDropdown, relatedSubbones);
        disableButtons(prevButton, nextButton);
    });

    // 5. Auto-select the first boneset
    const boneset = combinedData.bonesets[0];
    if (boneset) {
        document.getElementById("boneset-select").value = boneset.id;
        const event = new Event("change");
        document.getElementById("boneset-select").dispatchEvent(event);
    }
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
