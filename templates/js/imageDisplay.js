// js/imageDisplay.js
// Rendering helpers for the image area (no dropdown wiring).

import { clearAnnotations, loadAndDrawAnnotations } from "./annotationOverlay.js";

function getImageContainer() {
  return /** @type {HTMLElement|null} */ (
    document.getElementById("bone-image-container")
  );
}

/** ---- Empty-state / clearing ------------------------------------------- */
export function showPlaceholder() {
  const c = getImageContainer();
  if (!c) return;
  c.innerHTML = `
    <div class="images-placeholder full-width-placeholder">
      <p>Please select a bone from the dropdown to view its image.</p>
    </div>
  `;
  // Ensure any previous overlay is gone
  clearAnnotations(c);

  // Remove black background class when showing placeholder
  const imagesContent = document.querySelector(".images-content");
  if (imagesContent) imagesContent.classList.remove("has-images");
}

export function clearImages() {
  const c = getImageContainer();
  if (c) {
    c.innerHTML = "";
    clearAnnotations(c);
  }

  // Remove black background class when clearing images
  const imagesContent = document.querySelector(".images-content");
  if (imagesContent) imagesContent.classList.remove("has-images");
}

/** ---- Public entry: render images array --------------------------------
 * Optionally pass { annotationsUrl: 'templates/data/annotations/xyz.json' }
 */
export function displayBoneImages(images, options = {}) {
  const container = getImageContainer();
  if (!container) {
    console.warn("bone-image-container not found");
    return;
  }

  clearImages();

  if (!Array.isArray(images) || images.length === 0) {
    showPlaceholder();
    return;
  }

  if (images.length === 1) {
    displaySingleImage(images[0], container);
  } else if (images.length === 2) {
    displayTwoImages(images, container);
  } else {
    displayMultipleImages(images, container);
  }

  // Add has-images class when images are displayed
  const imagesContent = document.querySelector(".images-content");
  if (imagesContent) imagesContent.classList.add("has-images");

  // Draw annotations if provided
  if (options.annotationsUrl) {
    loadAndDrawAnnotations(container, options.annotationsUrl).catch(err =>
      console.warn("Failed to load annotations:", err)
    );
  }
}

//** ---- Single image ------------------------------------------------------ */
function displaySingleImage(image, container) {
  // 1. CRITICAL FIX: Add the 'single-image' class to the main container.
  // This CSS class is required for the styles to correctly size the single image layout.
  container.className = "single-image"; 

  // 2. Simplification: Use innerHTML to directly create the necessary structure 
  // (.single-image-wrapper > img), which better aligns with your CSS.
  container.innerHTML = `
    <div class="single-image-wrapper">
      <img
        class="bone-image"
        src="${image.url || image.src || ""}"
        alt="${image.alt || image.filename || "Bone image"}"
        
        onload="this.classList.add('loaded')" 
        onerror="this.parentNode.textContent = 'Failed to load image.'"
      >
    </div>
  `;
  
  // Note: The object-fit: cover property is applied via your separate CSS file (templates/style.css) 
  // targeting .single-image-wrapper img.
}

/** ---- Two images (with rotation template) ------------------------------- */
const TWO_IMAGE_ROTATION = {
  left:  { rot_deg: -16.999, flipH: false },
  right: { rot_deg: 0,       flipH: false },
};

function applyRotation(imgEl, { rot_deg = 0, flipH = false } = {}) {
  const parts = [];
  if (flipH) parts.push("scaleX(-1)");
  if (rot_deg && Math.abs(rot_deg) > 0.001) parts.push(`rotate(${rot_deg}deg)`);
  imgEl.style.transform = parts.join(" ") || "none";
  imgEl.style.transformOrigin = "50% 50%";
  imgEl.style.willChange = "transform";
}

function displayTwoImages(images, container) {
  // Add the two-images class to the container for CSS styling
  container.className = "two-images";

  images.slice(0, 2).forEach((image) => {
    const imgItem = document.createElement("div");
    imgItem.className = "image-item";

    const img = document.createElement("img");
    img.src = image.url || image.src || "";
    img.alt = image.alt || image.filename || "Bone image";

    img.addEventListener("load", () => {
      img.classList.add("loaded");
    });
    img.addEventListener("error", () => (imgItem.textContent = "Failed to load image."));

    imgItem.appendChild(img);
    container.appendChild(imgItem);
  });
}

/** ---- 3+ images grid ---------------------------------------------------- */
function displayMultipleImages(images, container) {
  const wrapper = document.createElement("div");
  wrapper.className = "multiple-image-wrapper";

  images.forEach((image) => {
    const imgBox = document.createElement("div");
    imgBox.className = "image-box";

    const img = document.createElement("img");
    img.className = "bone-image";
    img.src = image.url || image.src || "";
    img.alt = image.alt || image.filename || "Bone image";

    img.addEventListener("load", () => img.classList.add("loaded"));
    img.addEventListener("error", () => (imgBox.textContent = "Failed to load image."));

    imgBox.appendChild(img);
    wrapper.appendChild(imgBox);
  });

  container.appendChild(wrapper);
}