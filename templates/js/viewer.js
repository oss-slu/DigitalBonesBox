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
        const imageUrl = boneData.image_url.startsWith("/") 
            ? `http://127.0.0.1:8000${boneData.image_url}` 
            : boneData.image_url;
            
        boneImage.src = imageUrl;
        boneImage.alt = `${boneData.name} bone image`;
        boneImage.style.display = "block";
        
        boneImage.onerror = () => {
            console.warn(`Failed to load image for ${boneData.name}: ${imageUrl}`);
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
            boneImage.onerror = null;
        };
        
        boneImage.onload = () => {
            boneImage.onerror = null;
            displayInteractiveAnnotations(boneData.annotations, boneImage);
        };
    } else {
        boneImage.src = "https://via.placeholder.com/600x400/CCCCCC/666666?text=No+Image+Available";
        boneImage.alt = `${boneData.name} - No image available`;
        boneImage.style.display = "block";
        console.warn(`No image URL provided for bone: ${boneData.name}`);
    }
}

/**
 * Detects the coordinate system range from annotation data
 * @param {Array} annotations - Array of annotation objects with position coordinates
 * @returns {Object} Object with maxX and maxY representing the coordinate system bounds
 */
function detectCoordinateRange(annotations) {
    if (!annotations || annotations.length === 0) {
        return { maxX: 12000000, maxY: 8000000 }; // Default fallback
    }

    let maxX = 0;
    let maxY = 0;

    annotations.forEach(annotation => {
        if (annotation.position) {
            const rightEdge = annotation.position.x + (annotation.position.width || 0);
            const bottomEdge = annotation.position.y + (annotation.position.height || 0);
            
            maxX = Math.max(maxX, rightEdge);
            maxY = Math.max(maxY, bottomEdge);
        }
    });

    // Add 10% buffer to avoid markers at exact edges
    maxX = maxX * 1.1;
    maxY = maxY * 1.1;

    console.log(`Detected coordinate range: ${maxX} x ${maxY}`);
    
    return { maxX, maxY };
}

/**
 * Creates interactive annotation markers on the image
 * @param {Array} annotations - Array of annotation objects with position coordinates
 * @param {HTMLElement} imageElement - The bone image element for positioning calculations
 */
export function displayInteractiveAnnotations(annotations, imageElement) {
    const annotationsOverlay = document.getElementById("annotations-overlay");
    if (!annotationsOverlay) {
        console.error("Annotations overlay element not found");
        return;
    }

    annotationsOverlay.innerHTML = "";

    if (!annotations || annotations.length === 0) {
        annotationsOverlay.innerHTML = "<p>No annotations available for this bone.</p>";
        return;
    }

    const createMarkers = () => {
        const imageRect = imageElement.getBoundingClientRect();
        
        // Dynamically detect coordinate system range from annotations
        const { maxX, maxY } = detectCoordinateRange(annotations);
        
        const scaleX = imageRect.width / maxX;
        const scaleY = imageRect.height / maxY;

        annotations.forEach((annotation, index) => {
            if (!annotation.position) {
                return;
            }

            const marker = document.createElement("div");
            marker.className = "annotation-marker";
            marker.dataset.annotationIndex = index;

            const scaledX = annotation.position.x * scaleX;
            const scaledY = annotation.position.y * scaleY;
            const scaledWidth = Math.max((annotation.position.width || 100000) * scaleX, 20);
            const scaledHeight = Math.max((annotation.position.height || 100000) * scaleY, 20);

            marker.style.position = "absolute";
            marker.style.left = `${scaledX}px`;
            marker.style.top = `${scaledY}px`;
            marker.style.width = `${scaledWidth}px`;
            marker.style.height = `${scaledHeight}px`;
            
            const tooltip = document.createElement("div");
            tooltip.className = "annotation-tooltip";
            tooltip.textContent = annotation.text;
            tooltip.style.display = "none";

            marker.addEventListener("mouseenter", (e) => {
                showTooltip(tooltip, e.target, annotation.text);
            });

            marker.addEventListener("mouseleave", () => {
                hideTooltip(tooltip);
            });

            marker.addEventListener("click", (e) => {
                e.stopPropagation();
                showTooltip(tooltip, e.target, annotation.text);
                setTimeout(() => hideTooltip(tooltip), 3000);
            });

            annotationsOverlay.appendChild(marker);
            annotationsOverlay.appendChild(tooltip);
        });
    };

    createMarkers();
}

function showTooltip(tooltip, marker, text) {
    const markerRect = marker.getBoundingClientRect();
    const overlayRect = marker.parentElement.getBoundingClientRect();
    
    tooltip.textContent = text;
    tooltip.style.display = "block";
    
    const tooltipX = markerRect.right - overlayRect.left + 10;
    const tooltipY = markerRect.top - overlayRect.top;
    
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
    
    setTimeout(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        const overlayRightEdge = overlayRect.right;
        
        if (tooltipRect.right > overlayRightEdge) {
            const leftX = markerRect.left - overlayRect.left - tooltip.offsetWidth - 10;
            tooltip.style.left = `${Math.max(0, leftX)}px`;
        }
    }, 0);
}

function hideTooltip(tooltip) {
    tooltip.style.display = "none";
}

export function displayBoneData(boneData) {
    if (!boneData) {
        console.error("No bone data provided to display");
        return;
    }

    displayBoneImage(boneData);
}

export function clearViewer() {
    const boneImage = document.getElementById("bone-image");
    const annotationsOverlay = document.getElementById("annotations-overlay");
    
    if (boneImage) {
        boneImage.src = "";
        boneImage.alt = "";
        boneImage.style.display = "none";
        boneImage.onerror = null;
        boneImage.onload = null;
    }
    
    if (annotationsOverlay) {
        annotationsOverlay.innerHTML = "<p>Select a bone to view image and annotations.</p>";
    }
}
