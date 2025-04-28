// js/main.js
import { fetchCombinedData } from './api.js';
import { populateBonesetDropdown, setupDropdownListeners } from './dropdowns.js';

let combinedData = { bonesets: [], bones: [], subbones: [] };

document.addEventListener('DOMContentLoaded', async () => {
    combinedData = await fetchCombinedData();
    populateBonesetDropdown(combinedData.bonesets);
    setupDropdownListeners(combinedData);

    // Automatically pre-select the first boneset if available
    const boneset = combinedData.bonesets[0];
    if (boneset) {
        document.getElementById('boneset-select').value = boneset.id;
        const event = new Event('change');
        document.getElementById('boneset-select').dispatchEvent(event);
    }
});
