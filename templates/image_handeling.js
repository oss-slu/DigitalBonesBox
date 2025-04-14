/**
 * Load the image for a selected bone.
 * @param {string} boneId - The ID or name of the bone (used for the image file).
 */
 export function loadBoneImage(boneId) {
    const imageElement = document.getElementById('bone-image');
    imageElement.src = `https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/images/${boneId}.png`;
}

/**
 * Load the annotations for the selected bone and display them.
 * @param {string} boneId - The ID or name of the bone (used for fetching annotation file).
 */
export async function loadAnnotations(boneId) {
    const annotationsOverlay = document.getElementById('annotations-overlay');
    annotationsOverlay.innerHTML = ''; // Clear previous annotations

    try {
        const annotationsData = await fetch(`https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/databones/annotations/${boneId}.json`);
        const annotations = await annotationsData.json();

        annotations.forEach(annotation => {
            const annotationElement = document.createElement('div');
            annotationElement.classList.add('annotation');
            annotationElement.textContent = annotation.text;
            annotationElement.style.top = `${annotation.y}%`;
            annotationElement.style.left = `${annotation.x}%`;

            annotationsOverlay.appendChild(annotationElement);
        });
    } catch (error) {
        console.error("Error loading annotations:", error);
        alert(`Error loading annotations for ${boneId}: ${error.message}`);
    }
}

/**
 * Load both the image and annotations for a selected bone.
 * @param {string} boneId - The ID or name of the bone.
 */
export async function loadImageAndAnnotations(boneId) {
    loadBoneImage(boneId);
    await loadAnnotations(boneId);
}
