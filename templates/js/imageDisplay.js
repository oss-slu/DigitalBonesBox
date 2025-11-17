// js/imageDisplay.js
// Rendering helpers for the image area (no dropdown wiring).

import { displayColoredRegions, clearAllColoredRegions } from './coloredRegionsOverlay.js';

// Track the current boneId for colored regions
let currentBoneId = null;

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
    <div class="images-placeholder">
      <p>Please select a bone from the dropdown to view its image.</p>
    </div>
  `;
  
  // Clear colored regions when showing placeholder
  clearAllColoredRegions();
  currentBoneId = null;
  
  // Remove black background class when showing placeholder
  const imagesContent = document.querySelector(".images-content");
  if (imagesContent) {
    imagesContent.classList.remove("has-images");
  }
}

export function clearImages() {
  const c = getImageContainer();
  if (c) c.innerHTML = "";
  
  // Clear colored regions when clearing images
  clearAllColoredRegions();
  currentBoneId = null;
  
  // Remove black background class when clearing images
  const imagesContent = document.querySelector(".images-content");
  if (imagesContent) {
    imagesContent.classList.remove("has-images");
  }
}

/** ---- Public entry: render images array -------------------------------- */
export function displayBoneImages(images, boneId = null) {
  const container = getImageContainer();
  if (!container) {
    console.warn("bone-image-container not found");
    return;
  }

  // Clear any existing colored regions
  clearAllColoredRegions();
  clearImages();
  
  // Store the current boneId for colored regions
  currentBoneId = boneId;
  console.log(`[ImageDisplay] displayBoneImages called with boneId: ${boneId}, images: ${images?.length}`);

  if (!Array.isArray(images) || images.length === 0) {
    showPlaceholder();
    return;
  }

  if (images.length === 1) {
    console.log('[ImageDisplay] Displaying single image');
    displaySingleImage(images[0], container);
  } else if (images.length === 2) {
    console.log('[ImageDisplay] Displaying two images');
    displayTwoImages(images, container);
  } else {
    console.log('[ImageDisplay] Displaying multiple images');
    displayMultipleImages(images, container);
  }
  
  // Add has-images class when images are displayed
  const imagesContent = document.querySelector(".images-content");
  if (imagesContent) {
    imagesContent.classList.add("has-images");
  }
}

/** ---- Single image ------------------------------------------------------ */
function displaySingleImage(image, container) {
  const wrapper = document.createElement("div");
  wrapper.className = "single-image-wrapper";

  const imgBox = document.createElement("div");
  imgBox.className = "image-box";

  const img = document.createElement("img");
  img.className = "bone-image";
  img.src = image.url || image.src || "";
  img.alt = image.alt || image.filename || "Bone image";

  img.addEventListener("load", () => {
    img.classList.add("loaded");
    console.log(`[ImageDisplay] Image loaded for boneId: ${currentBoneId}`);
    // Display colored regions after image loads
    if (currentBoneId) {
      console.log(`[ImageDisplay] Calling displayColoredRegions for: ${currentBoneId}, imageIndex: 0`);
      displayColoredRegions(img, currentBoneId, 0).catch(err => {
        console.warn(`Could not display colored regions for ${currentBoneId}:`, err);
      });
    } else {
      console.warn('[ImageDisplay] No currentBoneId set, cannot display colored regions');
    }
  });
  img.addEventListener("error", () => (imgBox.textContent = "Failed to load image."));

  imgBox.appendChild(img);
  wrapper.appendChild(imgBox);
  container.appendChild(wrapper);
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

  images.slice(0, 2).forEach((image, idx) => {
    const imgItem = document.createElement("div");
    imgItem.className = "image-item";

    const img = document.createElement("img");
    img.src = image.url || image.src || "";
    img.alt = image.alt || image.filename || "Bone image";

    img.addEventListener("load", () => {
      img.classList.add("loaded");
      // Display colored regions after image loads
      if (currentBoneId) {
        console.log(`[ImageDisplay] Calling displayColoredRegions for: ${currentBoneId}, imageIndex: ${idx}`);
        displayColoredRegions(img, currentBoneId, idx).catch(err => {
          console.warn(`Could not display colored regions for ${currentBoneId}:`, err);
        });
      }
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

  images.forEach((image, idx) => {
    const imgBox = document.createElement("div");
    imgBox.className = "image-box";

    const img = document.createElement("img");
    img.className = "bone-image";
    img.src = image.url || image.src || "";
    img.alt = image.alt || image.filename || "Bone image";

    img.addEventListener("load", () => {
      img.classList.add("loaded");
      // Display colored regions after image loads
      if (currentBoneId) {
        console.log(`[ImageDisplay] Calling displayColoredRegions for: ${currentBoneId}, imageIndex: ${idx}`);
        displayColoredRegions(img, currentBoneId, idx).catch(err => {
          console.warn(`Could not display colored regions for ${currentBoneId}:`, err);
        });
      }
    });
    img.addEventListener("error", () => (imgBox.textContent = "Failed to load image."));

    imgBox.appendChild(img);
    wrapper.appendChild(imgBox);
  });

  container.appendChild(wrapper);
}
