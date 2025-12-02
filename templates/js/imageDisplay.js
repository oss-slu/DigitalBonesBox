// js/imageDisplay.js
// Rendering helpers for the image area (no dropdown wiring).

import { clearAnnotations, loadAndDrawAnnotations } from "./annotationOverlay.js";
import { displayColoredRegions, clearAllColoredRegions } from "./coloredRegionsOverlay.js";
import { imageCaptions } from "./imageCaptions.js";

// Track the current boneId for colored regions
let currentBoneId = null;
let currentIsBonesetSelection = false; // Track if this is a boneset selection

function getImageContainer() {
  return /** @type {HTMLElement|null} */ (
    document.getElementById("bone-image-container")
  );
}

/** Helper function to get captions for a boneId */
function getCaptionsForBone(boneId) {
  if (!boneId || !imageCaptions[boneId]) {
    return { image1: null, image2: null };
  }
  return imageCaptions[boneId];
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
  // Clear both text annotations and colored regions
  clearAnnotations(c);
  clearAllColoredRegions();
  currentBoneId = null;

  // Remove caption container if it exists
  const captionContainer = document.getElementById("caption-container");
  if (captionContainer) {
    captionContainer.remove();
  }

  // Remove black background class when showing placeholder
  const imagesContent = document.querySelector(".images-content");
  if (imagesContent) imagesContent.classList.remove("has-images");
}

export function clearImages() {
  const c = getImageContainer();
  if (c) {
    c.innerHTML = "";
    clearAnnotations(c);
    clearAllColoredRegions();
  }
  
  // Remove caption container if it exists
  const captionContainer = document.getElementById("caption-container");
  if (captionContainer) {
    captionContainer.remove();
  }
  
  currentBoneId = null;
  currentIsBonesetSelection = false; // Reset the flag

  // Remove black background class when clearing images
  const imagesContent = document.querySelector(".images-content");
  if (imagesContent) imagesContent.classList.remove("has-images");
}

/** ---- Public entry: render images array --------------------------------
 * Optionally pass { annotationsUrl: "templates/data/annotations/xyz.json", boneId: "bone_name" }
 */
export function displayBoneImages(images, options = {}) {
  const container = getImageContainer();
  if (!container) {
    console.warn("bone-image-container not found");
    return;
  }

  clearImages();

  // Store boneId for colored regions AFTER clearing (so it doesn't get reset to null)
  currentBoneId = options.boneId || null;
  currentIsBonesetSelection = options.isBonesetSelection || false; // Store boneset flag
  console.log(`[ImageDisplay] displayBoneImages called with boneId: ${currentBoneId}, isBonesetSelection: ${currentIsBonesetSelection}, images: ${images.length}`);

  if (!Array.isArray(images) || images.length === 0) {
    showPlaceholder();
    return;
  }

  if (images.length === 1) {
    displaySingleImage(images[0], container, options);
  } else if (images.length === 2) {
    displayTwoImages(images, container, options);
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
function displaySingleImage(image, container, options = {}) {
  // 1. CRITICAL FIX: Add the "single-image" class to the main container.
  // This CSS class is required for the styles to correctly size the single image layout.
  container.className = "single-image"; 

  container.innerHTML = `
    <div class="single-image-wrapper">
      <div class="image-wrapper">
        <img
          class="bone-image"
          src="${image.url || image.src || ""}"
          alt="${image.alt || image.filename || "Bone image"}"
        >
      </div>
    </div>
  `;
  
  // Create caption container OUTSIDE the image container if caption exists
  if (imageCaptions.image1) {
    const captionContainer = document.createElement("div");
    captionContainer.id = "caption-container";
    captionContainer.className = "single-image";

    const caption = document.createElement("div");
    caption.className = "caption-box image-caption";
    caption.textContent = imageCaptions.image1;
    captionContainer.appendChild(caption);

    // Insert caption container after the image container
    container.parentElement.insertBefore(captionContainer, container.nextSibling);
  }

  // 3. Get reference to the image element for colored regions and event handlers
  const img = container.querySelector("img");
  if (img) {
    const loadColoredRegions = () => {
      img.classList.add("loaded");
      // Display colored regions after image loads
      if (currentBoneId) {
        console.log(`[ImageDisplay] Loading colored regions for: ${currentBoneId}, imageIndex: 0`);
        displayColoredRegions(img, currentBoneId, 0).catch(err => {
          console.warn(`Could not display colored regions for ${currentBoneId}:`, err);
        });
      }
      // Load text annotations if provided
      if (options.annotationsUrl) {
        loadAndDrawAnnotations(container, options.annotationsUrl).catch(err => {
          console.warn("Failed to load text annotations:", err);
        });
      }
    };

    img.addEventListener("load", loadColoredRegions);
    img.addEventListener("error", () => {
      const wrapper = img.parentElement;
      if (wrapper) wrapper.textContent = "Failed to load image.";
    });

    // Check if already loaded (cached) - use setTimeout to let browser process
    setTimeout(() => {
      if (img.complete && img.naturalHeight !== 0) {
        console.log("[ImageDisplay] Single image was cached, calling loadColoredRegions immediately");
        loadColoredRegions();
      }
    }, 0);
  }
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

function displayTwoImages(images, container, options = {}) {
  // Get captions for this bone
  const captions = getCaptionsForBone(currentBoneId);
  
  // Add the two-images class to the container for CSS styling
  container.className = "two-images";

  // Create images first
  images.slice(0, 2).forEach((image, index) => {
    const imgItem = document.createElement("div");
    imgItem.className = "image-item";

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "image-wrapper";

    const img = document.createElement("img");
    img.alt = image.alt || image.filename || "Bone image";
    
    const loadColoredRegions = () => {
      console.log(`[ImageDisplay] Image ${index} load event fired`);
      img.classList.add("loaded");
      // Display colored regions for this image
      if (currentBoneId) {
        console.log(`[ImageDisplay] currentBoneId is: ${currentBoneId}, isBonesetSelection: ${currentIsBonesetSelection}, calling displayColoredRegions for imageIndex: ${index}`);
        displayColoredRegions(img, currentBoneId, index, currentIsBonesetSelection).catch(err => {
          console.error(`[ImageDisplay] Could not display colored regions for ${currentBoneId} image ${index}:`, err);
        });
      } else {
        console.warn(`[ImageDisplay] currentBoneId is NULL, cannot load colored regions for image ${index}`);
      }
    };

    // Add event listeners BEFORE setting src
    img.addEventListener("load", loadColoredRegions);
    img.addEventListener("error", () => {
      console.error(`[ImageDisplay] Image ${index} failed to load`);
      imgItem.textContent = "Failed to load image.";
    });

    imgWrapper.appendChild(img);
    imgItem.appendChild(imgWrapper);
    container.appendChild(imgItem);

    // Set src LAST - this triggers the load
    img.src = image.url || image.src || "";
    
    // Check if image is already loaded from cache after setting src
    setTimeout(() => {
      if (img.complete && img.naturalWidth > 0) {
        console.log(`[ImageDisplay] Image ${index} was already cached, manually triggering load handler`);
        loadColoredRegions();
      }
    }, 10);
  });

  // Create caption container AFTER images, OUTSIDE the grid
  if (captions.image1 || captions.image2) {
    const captionContainer = document.createElement("div");
    captionContainer.id = "caption-container";
    
    if (captions.image1) {
      const caption1 = document.createElement("div");
      caption1.className = "caption-box image-caption";
      caption1.textContent = captions.image1;
      captionContainer.appendChild(caption1);
    }
    
    if (captions.image2) {
      const caption2 = document.createElement("div");
      caption2.className = "caption-box image-caption";
      caption2.textContent = captions.image2;
      captionContainer.appendChild(caption2);
    }
    
    // Insert caption container after the image container
    container.parentElement.insertBefore(captionContainer, container.nextSibling);
  }
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

