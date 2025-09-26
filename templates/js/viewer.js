// viewer.js - Dedicated module for managing viewer state and display with INTERACTIVE ANNOTATIONS

/**
 * Displays bone image with error handling for broken URLs
 * @param {Object} boneData - The bone object from live API data
 */
export function displayBoneImage(boneData) {
    const boneImage = document.getElementById("bone-image");
    if (!boneImage) {
        console.error("Bone image element not found");
        return;
    }

    if (boneData.image_url) {
        // Handle relative URLs by prefixing with API base
        const imageUrl = boneData.image_url.startsWith("/") 
            ? `http://127.0.0.1:8000${boneData.image_url}` 
            : boneData.image_url;
            
        boneImage.src = imageUrl;
        boneImage.alt = `${boneData.name} bone image`;
        boneImage.style.display = "block";
        
        // Handle image load errors gracefully
        boneImage.onerror = () => {
            console.warn(`Failed to load image for ${boneData.name}: ${imageUrl}`);
            // Create a simple colored rectangle using data URL to avoid network issues
            const canvas = document.createElement("canvas");
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#CCCCCC";
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = "#666666";
            ctx.font = "24px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`${boneData.name} - Placeholder Image`, 400, 300);
            boneImage.src = canvas.toDataURL();
            boneImage.alt = `${boneData.name} - Image failed to load`;
            boneImage.onerror = null; // Prevent infinite loop
        };
        
        // Clear any previous error handlers when image loads successfully
        boneImage.onload = () => {
            boneImage.onerror = null;
            // Once image is loaded, we can position annotations correctly
            displayInteractiveAnnotations(boneData.annotations, boneImage);
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
 * Creates interactive annotation markers on the image
 * @param {Array} annotations - Array of annotation objects with position coordinates
 * @param {HTMLElement} imageElement - The bone image element for positioning calculations
 */
export function displayInteractiveAnnotations(annotations, imageElement) {
    console.log("displayInteractiveAnnotations called with:", annotations); // DEBUG
    const annotationsOverlay = document.getElementById("annotations-overlay");
    if (!annotationsOverlay) {
        console.error("Annotations overlay element not found");
        return;
    }

    // Clear previous annotations
    annotationsOverlay.innerHTML = "";

    if (!annotations || annotations.length === 0) {
        console.log("No annotations found for this bone"); // DEBUG
        annotationsOverlay.innerHTML = "<p>No annotations available for this bone.</p>";
        return;
    }

    console.log(`Creating ${annotations.length} annotation markers`); // DEBUG

    // Wait for image to be fully loaded to get correct dimensions
    // Wait for image to be fully loaded to get correct dimensions
const createMarkers = () => {
    const imageRect = imageElement.getBoundingClientRect();
    
    // The coordinates appear to be in a high-resolution coordinate system
    // We need to normalize them to fit our image dimensions
    
    // Assume the original coordinate system is approximately 12000000 x 8000000 (common PowerPoint dimensions)
    const ORIGINAL_WIDTH = 12000000;
    const ORIGINAL_HEIGHT = 8000000;
    
    // Calculate scale factors to map from original coordinate system to our image
    const scaleX = imageRect.width / ORIGINAL_WIDTH;
    const scaleY = imageRect.height / ORIGINAL_HEIGHT;

    console.log(`Image dimensions: displayed=${imageRect.width}x${imageRect.height}`);
    console.log(`Coordinate system scale factors: scaleX=${scaleX}, scaleY=${scaleY}`);

        annotations.forEach((annotation, index) => {
            if (!annotation.position) {
                console.log(`Annotation ${index} has no position`);
                return;
            }

            console.log(`Annotation ${index}:`, annotation); // DEBUG

            // Create marker element
            const marker = document.createElement("div");
            marker.className = "annotation-marker";
            marker.dataset.annotationIndex = index;

            // Calculate scaled position
            const scaledX = annotation.position.x * scaleX;
            const scaledY = annotation.position.y * scaleY;
            const scaledWidth = (annotation.position.width || 20) * scaleX;
            const scaledHeight = (annotation.position.height || 20) * scaleY;

            console.log(`Scales: scaleX=${scaleX}, scaleY=${scaleY}`); // DEBUG
            console.log(`Original coords: x=${annotation.position.x}, y=${annotation.position.y}`); // DEBUG
            console.log(`Scaled coords: x=${scaledX}, y=${scaledY}`); // DEBUG

            // Position the marker
            marker.style.position = "absolute";
            marker.style.left = `${scaledX}px`;
            marker.style.top = `${scaledY}px`;
            marker.style.width = `${Math.max(scaledWidth, 20)}px`;
            marker.style.height = `${Math.max(scaledHeight, 20)}px`;
            
            // DEBUG: Add visible styling to make sure markers are visible
            marker.style.backgroundColor = "red";
            marker.style.border = "2px solid black";
            marker.style.zIndex = "1000";
            
            console.log(`Marker positioned at: left=${marker.style.left}, top=${marker.style.top}`); // DEBUG

            // Create tooltip
            const tooltip = document.createElement("div");
            tooltip.className = "annotation-tooltip";
            tooltip.textContent = annotation.text;
            tooltip.style.display = "none";

            // Add event listeners for hover and click
            marker.addEventListener("mouseenter", (e) => {
                showTooltip(tooltip, e.target, annotation.text);
            });

            marker.addEventListener("mouseleave", () => {
                hideTooltip(tooltip);
            });

            marker.addEventListener("click", (e) => {
                e.stopPropagation();
                showTooltip(tooltip, e.target, annotation.text);
                // Keep tooltip visible for a few seconds on click
                setTimeout(() => hideTooltip(tooltip), 3000);
            });

            // Append marker and tooltip to overlay
            annotationsOverlay.appendChild(marker);
            annotationsOverlay.appendChild(tooltip);
        });
    };

    // Start creating markers
    createMarkers();
}

/**
 * Shows tooltip next to the marker
 * @param {HTMLElement} tooltip - The tooltip element
 * @param {HTMLElement} marker - The marker element
 * @param {string} text - The annotation text
 */
function showTooltip(tooltip, marker, text) {
    const markerRect = marker.getBoundingClientRect();
    const overlayRect = marker.parentElement.getBoundingClientRect();
    
    tooltip.textContent = text;
    tooltip.style.display = "block";
    
    // Position tooltip to the right of the marker, or left if not enough space
    const tooltipX = markerRect.right - overlayRect.left + 10;
    const tooltipY = markerRect.top - overlayRect.top;
    
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
    
    // Check if tooltip goes off-screen and adjust
    setTimeout(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        const overlayRightEdge = overlayRect.right;
        
        if (tooltipRect.right > overlayRightEdge) {
            // Position to the left of marker instead
            const leftX = markerRect.left - overlayRect.left - tooltip.offsetWidth - 10;
            tooltip.style.left = `${Math.max(0, leftX)}px`;
        }
    }, 0);
}

/**
 * Hides the tooltip
 * @param {HTMLElement} tooltip - The tooltip element to hide
 */
function hideTooltip(tooltip) {
    tooltip.style.display = "none";
}

/**
 * Legacy function - replaced with displayInteractiveAnnotations
 * @deprecated Use displayInteractiveAnnotations instead
 */
export function displayAnnotations(annotations) {
    console.warn("displayAnnotations is deprecated. Use displayInteractiveAnnotations instead.");
    displayInteractiveAnnotations(annotations, document.getElementById("bone-image"));
}

/**
 * Main function to display complete bone data (image + interactive annotations)
 * @param {Object} boneData - The complete bone object
 */
export function displayBoneData(boneData) {
    if (!boneData) {
        console.error("No bone data provided to display");
        return;
    }

    displayBoneImage(boneData);
    // Note: annotations are displayed when image loads (see displayBoneImage)
}

/**
 * Clears the viewer display
 */
export function clearViewer() {
    const boneImage = document.getElementById("bone-image");
    const annotationsOverlay = document.getElementById("annotations-overlay");
    
    if (boneImage) {
        boneImage.src = "";
        boneImage.alt = "";
        boneImage.style.display = "none";
        boneImage.onerror = null; // Clear error handlers
        boneImage.onload = null;
    }
    
    if (annotationsOverlay) {
        annotationsOverlay.innerHTML = "<p>Select a bone to view image and annotations.</p>";
    }
}

