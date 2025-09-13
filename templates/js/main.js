import { fetchCombinedData } from './api.js';
import { populateBonesetDropdown, setupDropdownListeners } from './dropdowns.js';
import { initializeSidebar } from './sidebar.js';
import { setupNavigation, setBoneAndSubbones, disableButtons } from './navigation.js';
import { loadDescription } from './description.js';

let combinedData = { bonesets: [], bones: [], subbones: [] };
let mockBoneData = null;

// Mock data fetching function
async function fetchMockBoneData() {
    try {
        const response = await fetch('./js/mock-bone-data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching mock bone data:', error);
        return null;
    }
}

// Display bone image and annotations
function displayBoneData(boneId) {
    if (!mockBoneData) {
        console.log('Mock data not available');
        return;
    }

    const bone = mockBoneData.bones.find(b => b.id === boneId);
    if (!bone) {
        console.log(`No mock data found for bone: ${boneId}`);
        clearBoneDisplay();
        return;
    }

    // Update the image
    const boneImage = document.getElementById('bone-image');
    if (boneImage) {
        boneImage.src = bone.image_url;
        boneImage.alt = `${bone.name} bone image`;
        boneImage.style.display = 'block';
    }

    // Display annotations
    displayAnnotations(bone.annotations);
}

// Display annotations as a list
function displayAnnotations(annotations) {
    const annotationsOverlay = document.getElementById('annotations-overlay');
    if (!annotationsOverlay) {
        console.error('Annotations overlay element not found');
        return;
    }

    // Clear previous annotations
    annotationsOverlay.innerHTML = '';

    if (!annotations || annotations.length === 0) {
        annotationsOverlay.innerHTML = '<p>No annotations available for this bone.</p>';
        return;
    }

    // Create annotation list
    const annotationsList = document.createElement('ul');
    annotationsList.className = 'annotations-list';
    
    annotations.forEach((annotation, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'annotation-item';
        listItem.textContent = annotation.text;
        annotationsList.appendChild(listItem);
    });

    annotationsOverlay.appendChild(annotationsList);
}

// Clear bone display
function clearBoneDisplay() {
    const boneImage = document.getElementById('bone-image');
    const annotationsOverlay = document.getElementById('annotations-overlay');
    
    if (boneImage) {
        boneImage.src = '';
        boneImage.alt = '';
        boneImage.style.display = 'none';
    }
    
    if (annotationsOverlay) {
        annotationsOverlay.innerHTML = '<p>Select a bone to view image and annotations.</p>';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Sidebar behavior
    initializeSidebar();

    // 2. Load mock bone data
    mockBoneData = await fetchMockBoneData();
    
    // 3. Fetch data and populate dropdowns
    combinedData = await fetchCombinedData();
    populateBonesetDropdown(combinedData.bonesets);
    setupDropdownListeners(combinedData);

    // 4. Hook up navigation buttons
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const subboneDropdown = document.getElementById('subbone-select');
    const boneDropdown = document.getElementById('bone-select');

    setupNavigation(prevButton, nextButton, subboneDropdown, loadDescription);

    // 5. Update navigation when bone changes
    boneDropdown.addEventListener('change', (event) => {
        const selectedBone = event.target.value;

        const relatedSubbones = combinedData.subbones
            .filter(sb => sb.bone === selectedBone)
            .map(sb => sb.id);

        setBoneAndSubbones(selectedBone, relatedSubbones);
        populateSubboneDropdown(subboneDropdown, relatedSubbones);
        disableButtons(prevButton, nextButton);
        
        // NEW: Display mock bone data when bone is selected
        if (selectedBone) {
            displayBoneData(selectedBone);
        } else {
            clearBoneDisplay();
        }
    });

    // 6. Auto-select the first boneset
    const boneset = combinedData.bonesets[0];
    if (boneset) {
        document.getElementById('boneset-select').value = boneset.id;
        const event = new Event('change');
        document.getElementById('boneset-select').dispatchEvent(event);
    }

    // 7. Initialize display
    clearBoneDisplay();
});

function populateSubboneDropdown(dropdown, subbones) {
    dropdown.innerHTML = '';
    subbones.forEach((subboneId) => {
        const option = document.createElement('option');
        option.value = subboneId;
        option.textContent = subboneId.replace(/_/g, ' ');
        dropdown.appendChild(option);
    });
}