// viewer.js - Dedicated module for managing viewer state and display

/**
 * Displays bone image with error handling for broken URLs
 * @param {Object} boneData - The bone object from mock data
 */
export function displayBoneImage(boneData) {
    const boneImage = document.getElementById("bone-image");
    if (!boneImage) {
        console.error("Bone image element not found");
        return;
    }

    if (boneData.image_url) {
        boneImage.src = boneData.image_url;
        boneImage.alt = `${boneData.name} bone image`;
        boneImage.style.display = "block";
        
        // Handle image load errors gracefully
        boneImage.onerror = () => {
            console.warn(`Failed to load image for ${boneData.name}: ${boneData.image_url}`);
            boneImage.src = "https://via.placeholder.com/600x400/CCCCCC/666666?text=Image+Load+Failed";
            boneImage.alt = `${boneData.name} - Image failed to load`;
        };
        
        // Clear any previous error handlers when image loads successfully
        boneImage.onload = () => {
            boneImage.onerror = null;
        };
    } else {
        // Handle missing image_url
        boneImage.src = "https://via.placeholder.com/600x400/CCCCCC/666666?text=No+Image+Available";
        boneImage.alt = `${boneData.name} - No image available`;
        boneImage.style.display = "block";
        console.warn(`No image URL provided for bone: ${boneData.name}`);
    }
}

/**
 * Displays annotations list for the selected bone
 * @param {Array} annotations - Array of annotation objects
 */
export function displayAnnotations(annotations) {
    const annotationsOverlay = document.getElementById("annotations-overlay");
    if (!annotationsOverlay) {
        console.error("Annotations overlay element not found");
        return;
    }

    // Clear previous annotations
    annotationsOverlay.innerHTML = "";

    if (!annotations || annotations.length === 0) {
        annotationsOverlay.innerHTML = "<p>No annotations available for this bone.</p>";
        return;
    }

    // Create annotation list
    const annotationsList = document.createElement("ul");
    annotationsList.className = "annotations-list";
    
    annotations.forEach((annotation) => {
        const listItem = document.createElement("li");
        listItem.className = "annotation-item";
        listItem.textContent = annotation.text;
        annotationsList.appendChild(listItem);
    });

    annotationsOverlay.appendChild(annotationsList);
}

/**
 * Main function to display complete bone data (annotations only - images handled by imageDisplay.js)
 * @param {Object} boneData - The complete bone object
 */
export function displayBoneData(boneData) {
    if (!boneData) {
        console.error("No bone data provided to display");
        return;
    }

    // NOTE: Images are now displayed by imageDisplay.js via dropdowns.js
    // displayBoneImage(boneData); // DISABLED - handled by imageDisplay.js
    displayAnnotations(boneData.annotations);
}

/**
 * Clears the viewer display (annotations only - images handled by imageDisplay.js)
 */
export function clearViewer() {
    // NOTE: Images are now cleared by imageDisplay.js
    // Only clear annotations here
    const annotationsOverlay = document.getElementById("annotations-overlay");
    
    if (annotationsOverlay) {
        annotationsOverlay.innerHTML = "<p>Select a bone to view image and annotations.</p>";
    }
}