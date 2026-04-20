// templates/js/annotationOverlay.js
// Small, self-contained overlay module.

const PPT_EMU = { W: 9_144_000, H: 6_858_000 }; // PowerPoint slide size in EMUs

function ensureStage(container) {
  let stage = container.querySelector(".annotation-stage");
  if (!stage) {
    stage = document.createElement("div");
    stage.className = "annotation-stage";
    stage.innerHTML = `
      <svg class="annotation-svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"></svg>
      <div class="annotation-labels"></div>
    `;
    container.appendChild(stage);
  }
  return stage;
}

export function clearAnnotations(container) {
  if (!container) return;
  const stage = container.querySelector(".annotation-stage");
  if (stage) stage.remove();
}

/**
 * Calculates pixel dimensions from RAW EMU coordinates (from PowerPoint).
 * Backend sends raw coordinates along with slide dimensions and normalized_geometry.
 * @param {Object} rect - The RAW rectangle {x, y, width, height} in EMU units.
 * @param {Object} box - The current container pixel size {w, h}.
 * @param {Object} norm - The normalized geometry {normX, normY, normW, normH}.
 * @param {number} slideWidth - Full slide width in EMU units.
 * @param {number} slideHeight - Full slide height in EMU units.
 * @returns {Object} Pixel coordinates {left, top, width, height}.
 */
function rawRectToPx(rect, box, norm, slideWidth, slideHeight) {
  // Convert raw EMU coordinates to normalized (0-1) position on full slide
  const normalizedX = rect.x / slideWidth;
  const normalizedY = rect.y / slideHeight;
  const normalizedWidth = rect.width / slideWidth;
  const normalizedHeight = rect.height / slideHeight;

  // Subtract the crop offset to get position within visible region
  const normalizedOffsetX = norm.normX;
  const normalizedOffsetY = norm.normY;

  // Calculate pixel coordinates
  return {
    left: (normalizedX - normalizedOffsetX) * box.w,
    top: (normalizedY - normalizedOffsetY) * box.h,
    width: normalizedWidth * box.w,
    height: normalizedHeight * box.h,
  };
}

/**
 * Calculates pixel point from RAW EMU coordinates (from PowerPoint).
 * @param {Object} pt - The RAW point {x, y} in EMU units.
 * @param {Object} box - The current container pixel size {w, h}.
 * @param {Object} norm - The normalized geometry {normX, normY, normW, normH}.
 * @param {number} slideWidth - Full slide width in EMU units.
 * @param {number} slideHeight - Full slide height in EMU units.
 * @returns {Object} Pixel coordinates {x, y}.
 */
function rawPointToPx(pt, box, norm, slideWidth, slideHeight) {
  // Convert raw EMU coordinates to normalized (0-1) position on full slide
  const normalizedX = pt.x / slideWidth;
  const normalizedY = pt.y / slideHeight;

  // Subtract the crop offset to get position within visible region
  const normalizedOffsetX = norm.normX;
  const normalizedOffsetY = norm.normY;

  return {
    x: (normalizedX - normalizedOffsetX) * box.w,
    y: (normalizedY - normalizedOffsetY) * box.h
  };
}

/**
 * Draw labels + lines from a JSON object:
 * { annotations: [...], normalized_geometry: { normX, normY, normW, normH }, slide_width, slide_height }
 */
export function drawAnnotations(container, annotationsJson) {
  if (!container || !annotationsJson) return;

  const stage = ensureStage(container);
  const svg = stage.querySelector(".annotation-svg");
  const labels = stage.querySelector(".annotation-labels");

  // Clear previous
  svg.innerHTML = "";
  labels.innerHTML = "";

  // 1. Get current pixel dimensions of the container.
  const rect = container.getBoundingClientRect();
  const displayedWidth = rect.width;
  const displayedHeight = rect.height;

  // 2. Extract slide dimensions and normalization factors from the JSON.
  const slideWidth = annotationsJson.slide_width || 9144000;
  const slideHeight = annotationsJson.slide_height || 5143500;
  const norm = annotationsJson.normalized_geometry || { normX: 0, normY: 0, normW: 1, normH: 1 };

  // 3. Define the *effective* coordinate box for scaling.
  // Scale the displayed size by the crop ratios to get effective full-slide equivalent.
  const box = {
    w: displayedWidth / norm.normW,
    h: displayedHeight / norm.normH
  };

  // 4. Setup SVG with viewBox and proper aspect ratio preservation.
  svg.setAttribute("viewBox", `0 0 ${displayedWidth} ${displayedHeight}`);

  // 5. Get the list of annotations.
  const list = annotationsJson.annotations || annotationsJson.text_annotations || [];

  list.forEach((a) => {
    if (!a || !a.text_box) return;

    // Text label - convert raw EMU coordinates to pixels
    const px = rawRectToPx(a.text_box, box, norm, slideWidth, slideHeight);
    const el = document.createElement("div");
    el.className = "annotation-label";

    // this preserves "\n" as real line breaks
    el.innerText = a.text_content ?? "";

    Object.assign(el.style, {
      position: "absolute",
      left: `${px.left}px`,
      top: `${px.top}px`,
      width: `${px.width}px`,
      height: `${px.height}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "pre-line",   // 👈 KEY: show newlines
      textAlign: "center",      // optional: center both lines
    });

    labels.appendChild(el);

    // Pointer lines
    (a.pointer_lines || []).forEach((line) => {
      if (!line?.start_point || !line?.end_point) return;
      const p1 = rawPointToPx(line.start_point, box, norm, slideWidth, slideHeight);
      const p2 = rawPointToPx(line.end_point, box, norm, slideWidth, slideHeight);
      const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("x1", p1.x);
      l.setAttribute("y1", p1.y);
      l.setAttribute("x2", p2.x);
      l.setAttribute("y2", p2.y);
      l.setAttribute("class", "annotation-line");
      svg.appendChild(l);
    });
  });

  // Store last json for autoscale redraw
  stage.__lastJson = annotationsJson;
}

/** Load JSON from a URL and draw it. Returns a promise. */
export async function loadAndDrawAnnotations(container, jsonUrl) {
  if (!container || !jsonUrl) return;
  const res = await fetch(jsonUrl);
  if (!res.ok) return;
  const data = await res.json();

  // The backend now provides data in the structure expected by drawAnnotations
  drawAnnotations(container, data);
  attachAutoscale(container); // keep aligned on resize
}

/** Re-draw on container resize using the last JSON used. */
function attachAutoscale(container) {
  const stage = ensureStage(container);
  if (stage.__resizeObs) return; // already attached

  const ro = new ResizeObserver(() => {
    // Pass the normalization data back in for correct recalculation
    if (stage.__lastJson) drawAnnotations(container, stage.__lastJson);
  });
  ro.observe(container);
  stage.__resizeObs = ro;
}

// Optional global for non-module usage
window.AnnotationOverlay = { clearAnnotations, drawAnnotations, loadAndDrawAnnotations };