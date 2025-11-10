// js/imageDisplay.js
// Rendering helpers for the image area (no dropdown wiring).

// Import colored regions overlay functionality
// Note: coloredRegionsOverlay.js should be loaded before this file

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
  
  // Remove black background class when showing placeholder
  const imagesContent = document.querySelector(".images-content");
  if (imagesContent) {
    imagesContent.classList.remove("has-images");
  }
}

export function clearImages() {
  const c = getImageContainer();
  if (c) {
    // Clear colored regions overlay before clearing images
    if (window.ColoredRegionsOverlay) {
      window.ColoredRegionsOverlay.clearOverlays(c);
    }
    c.innerHTML = "";
  }
  
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

  clearImages();

  if (!Array.isArray(images) || images.length === 0) {
    showPlaceholder();
    return;
  }

  // Store bone ID for colored regions overlay
  if (boneId) {
    container.dataset.boneId = boneId;
  }

  if (images.length === 1) {
    displaySingleImage(images[0], container, boneId);
  } else if (images.length === 2) {
    displayTwoImages(images, container, boneId);
  } else {
    displayMultipleImages(images, container, boneId);
  }
  
  // Add has-images class when images are displayed
  const imagesContent = document.querySelector(".images-content");
  if (imagesContent) {
    imagesContent.classList.add("has-images");
  }
}

/** ---- Single image ------------------------------------------------------ */
function displaySingleImage(image, container, boneId = null) {
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
    // Add colored regions overlay after image loads
    if (boneId && window.ColoredRegionsOverlay) {
      setTimeout(() => {
        window.ColoredRegionsOverlay.displayColoredRegions(boneId, imgBox);
      }, 100); // Small delay to ensure image is fully rendered
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

function displayTwoImages(images, container, boneId = null) {
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
      // Add colored regions overlay after image loads
      if (boneId && window.ColoredRegionsOverlay) {
        setTimeout(() => {
          window.ColoredRegionsOverlay.displayColoredRegions(boneId, imgItem);
        }, 100); // Small delay to ensure image is fully rendered
      }
    });
    img.addEventListener("error", () => (imgItem.textContent = "Failed to load image."));

    imgItem.appendChild(img);
    container.appendChild(imgItem);
  });
}

/** ---- 3+ images grid ---------------------------------------------------- */
function displayMultipleImages(images, container, boneId = null) {
  const wrapper = document.createElement("div");
  wrapper.className = "multiple-image-wrapper";

  images.forEach((image) => {
    const imgBox = document.createElement("div");
    imgBox.className = "image-box";

    const img = document.createElement("img");
    img.className = "bone-image";
    img.src = image.url || image.src || "";
    img.alt = image.alt || image.filename || "Bone image";

    img.addEventListener("load", () => {
      img.classList.add("loaded");
      // Add colored regions overlay after image loads
      if (boneId && window.ColoredRegionsOverlay) {
        setTimeout(() => {
          window.ColoredRegionsOverlay.displayColoredRegions(boneId, imgBox);
        }, 100); // Small delay to ensure image is fully rendered
      }
    });
    img.addEventListener("error", () => (imgBox.textContent = "Failed to load image."));

    imgBox.appendChild(img);
    wrapper.appendChild(imgBox);
  });

  container.appendChild(wrapper);
}
