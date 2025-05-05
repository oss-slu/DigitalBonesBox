// js/main.js
import { fetchCombinedData } from './api.js';
import { populateBonesetDropdown, setupDropdownListeners } from './dropdowns.js';
import { initializeSidebar } from './sidebar.js';

let combinedData = { bonesets: [], bones: [], subbones: [] };

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize sidebar toggle behavior
    initializeSidebar();

    // Fetch and render bone data
    combinedData = await fetchCombinedData();
    populateBonesetDropdown(combinedData.bonesets);
    setupDropdownListeners(combinedData);

    const boneset = combinedData.bonesets[0];
    if (boneset) {
        document.getElementById('boneset-select').value = boneset.id;
        const event = new Event('change');
        document.getElementById('boneset-select').dispatchEvent(event);
    }
});
