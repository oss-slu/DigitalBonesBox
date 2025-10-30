// js/imageDisplay.js
// Task 2: Display functions only (no CSS, no dropdown wiring)

/** Get the target container */
function getImageContainer() {
  return /** @type {HTMLElement|null} */ (document.getElementById("bone-image-container"));
}

/** Clear images */
export function clearImages() {
  const container = getImageContainer();
  if (container) container.innerHTML = "";
}

/** Main entry: display images array [{ url, filename, alt? }, ...] */
export function displayBoneImages(images) {
  const container = getImageContainer();
  if (!container) {
    console.warn("bone-image-container not found");
    return;
  }

  clearImages();

  if (!Array.isArray(images) || images.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No images available for this selection.";
    p.className = "images-empty-state";
    container.appendChild(p);
    return;
  }

  if (images.length === 1) {
    displaySingleImage(images[0], container);
  } else if (images.length === 2) {
    displayTwoImages(images, container);
  } else {
    displayMultipleImages(images, container);
  }
}

/** 1 image */
function displaySingleImage(image, container) {
  const wrapper = document.createElement("div");
  wrapper.className = "single-image-wrapper";

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
  container.appendChild(wrapper);
}

/** 2 images (side-by-side) */
function displayTwoImages(images, container) {
  const wrapper = document.createElement("div");
  wrapper.className = "double-image-wrapper";

  images.slice(0, 2).forEach((image) => {
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

/** 3+ images (simple grid wrapper) */
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
