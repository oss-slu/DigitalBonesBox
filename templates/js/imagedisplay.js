// templates/js/imagedisplay.js

/** Clear all images from the container */
export function clearImages() {
  const container = document.getElementById("bone-image-container");
  if (container) container.innerHTML = "";
}

/**
 * Display images based on count.
 * @param {Array<{ filename: string, url: string }>} images
 */
export function displayBoneImages(images) {
  const container = document.getElementById("bone-image-container");
  if (!container) return;

  clearImages();

  if (!Array.isArray(images) || images.length === 0) return;

  if (images.length === 1) {
    displaySingleImage(images[0], container);
  } else if (images.length === 2) {
    displayTwoImages(images, container);
  } else {
    displayMultipleImages(images, container);
  }
}

/** One image: centered with fade-in */
function displaySingleImage(image, container) {
  const wrap = document.createElement("div");
  wrap.className = "single-image-wrapper";

  const img = document.createElement("img");
  img.className = "bone-image";
  img.src = image.url;
  img.alt = image.filename ?? "bone image";
  img.loading = "lazy";

  img.addEventListener("load", () => wrap.classList.add("loaded"));
  img.addEventListener("error", () => {
    wrap.textContent = "Failed to load image.";
    wrap.classList.add("image-error");
  });

  wrap.appendChild(img);
  container.appendChild(wrap);
}

/** Exactly two images: side-by-side */
function displayTwoImages(images, container) {
  const wrap = document.createElement("div");
  wrap.className = "double-image-wrapper";

  images.slice(0, 2).forEach((image) => {
    const box = document.createElement("div");
    box.className = "image-box";

    const img = document.createElement("img");
    img.className = "bone-image";
    img.src = image.url;
    img.alt = image.filename ?? "bone image";
    img.loading = "lazy";

    img.addEventListener("error", () => {
      box.textContent = "Failed to load image.";
      box.classList.add("image-error");
    });

    box.appendChild(img);
    wrap.appendChild(box);
  });

  container.appendChild(wrap);
}

/** 3+ images: responsive grid (future-proof) */
function displayMultipleImages(images, container) {
  const wrap = document.createElement("div");
  wrap.className = "multiple-image-wrapper";

  images.forEach((image) => {
    const box = document.createElement("div");
    box.className = "image-box";

    const img = document.createElement("img");
    img.className = "bone-image";
    img.src = image.url;
    img.alt = image.filename ?? "bone image";
    img.loading = "lazy";

    img.addEventListener("error", () => {
      box.textContent = "Failed to load image.";
      box.classList.add("image-error");
    });

    box.appendChild(img);
    wrap.appendChild(box);
  });

  container.appendChild(wrap);
}

/**
 * Fetch images for a given boneId and display them.
 * Used by dropdowns.js
 */
export async function loadBoneImages(boneId) {
  if (!boneId) return clearImages();

  try {
    const res = await fetch(
      `http://127.0.0.1:8000/api/bone-data/?boneId=${encodeURIComponent(boneId)}`
    );
    if (!res.ok) {
      console.warn("Image API returned non-OK:", res.status);
      clearImages();
      return;
    }
    const data = await res.json();
    displayBoneImages(Array.isArray(data.images) ? data.images : []);
  } catch (err) {
    console.warn("Failed to load bone images:", err);
    clearImages();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  displayBoneImages([
    { filename: "test1.jpg", url: "https://placehold.co/800x400" },
    { filename: "test2.jpg", url: "https://placehold.co/800x400?text=Two" }
  ]);
});
