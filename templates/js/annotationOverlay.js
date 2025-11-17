// templates/js/annotationOverlay.js
// Small, self-contained overlay module.

const PPT_EMU = { W: 9_144_000, H: 6_858_000 }; // PowerPoint slide size in EMUs

function ensureStage(container) {
  let stage = container.querySelector(".annotation-stage");
  if (!stage) {
    stage = document.createElement("div");
    stage.className = "annotation-stage";
    stage.innerHTML = `
      <svg class="annotation-svg" width="100%" height="100%" preserveAspectRatio="none"></svg>
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
 * Calculates pixel dimensions based on EMU coordinates and the normalized box size.
 * @param {Object} rect - The EMU rectangle {x, y, width, height}.
 * @param {Object} box - The current container pixel size {w, h}.
 * @param {Object} norm - The normalized geometry {normX, normY, normW, normH}. <--- ADDED
 * @returns {Object} Pixel coordinates {left, top, width, height}.
 */
function emuRectToPx(rect, box, norm) { // <--- ADDED norm
  // Scaling factors: Container pixel width / (EMU width of the visible area)
  const sx = box.w / PPT_EMU.W;
  const sy = box.h / PPT_EMU.H;

  // Calculate the EMU offset (translation) based on the normalization factors
  const emuOffsetX = norm.normX * PPT_EMU.W;
  const emuOffsetY = norm.normY * PPT_EMU.H;

  // Apply the offset (translation) to the EMU coordinate *before* scaling
  return {
    left:   (rect.x - emuOffsetX) * sx, // <--- MODIFIED
    top:    (rect.y - emuOffsetY) * sy, // <--- MODIFIED
    width:  rect.width  * sx,
    height: rect.height * sy,
  };
}

/**
 * Calculates pixel point based on EMU coordinates and the normalized box size.
 * @param {Object} pt - The EMU point {x, y}.
 * @param {Object} box - The current container pixel size {w, h}.
 * @param {Object} norm - The normalized geometry {normX, normY, normW, normH}. <--- ADDED
 * @returns {Object} Pixel coordinates {x, y}.
 */
function emuPointToPx(pt, box, norm) { // <--- ADDED norm
  const sx = box.w / PPT_EMU.W;
  const sy = box.h / PPT_EMU.H;
  
  // Calculate the EMU offset (translation) based on the normalization factors
  const emuOffsetX = norm.normX * PPT_EMU.W;
  const emuOffsetY = norm.normY * PPT_EMU.H;
  
  // Apply the offset (translation) to the EMU coordinate *before* scaling
  return { 
    x: (pt.x - emuOffsetX) * sx, // <--- MODIFIED
    y: (pt.y - emuOffsetY) * sy  // <--- MODIFIED
  };
}

/**
 * Draw labels + lines from a JSON object:
 * { annotations: [...], normalized_geometry: { normX, normY, normW, normH } }
 */
export function drawAnnotations(container, annotationsJson) {
  if (!container || !annotationsJson) return;

  const stage  = ensureStage(container);
  const svg    = stage.querySelector(".annotation-svg");
  const labels = stage.querySelector(".annotation-labels");

  // Clear previous
  svg.innerHTML = "";
  labels.innerHTML = "";

  // 1. Get current pixel dimensions of the image container.
  const rect = container.getBoundingClientRect();
  
  // 2. Extract the normalization factors from the JSON (provided by backend).
  const norm = annotationsJson.normalized_geometry || { normX: 0, normY: 0, normW: 1, normH: 1 };

  // 3. Define the *effective* coordinate box for scaling.
  // We scale the container size (rect.width/height) by the crop ratios (normW/normH).
  // This calculates the effective pixel dimensions relative to the full PPT slide size.
  const box  = { 
      w: rect.width / norm.normW, 
      h: rect.height / norm.normH 
  };
  
  // 4. Get the list of annotations. The coordinate adjustments were moved 
  // into emuRectToPx and emuPointToPx.
  const list = annotationsJson.annotations || annotationsJson.text_annotations || [];
  
  // REMOVED: The complex .map() loop that adjusted coordinates is now gone, as 
  // the logic is correctly integrated into the scaling functions above.

  list.forEach((a) => {
    if (!a || !a.text_box) return;

    // Text label
    const px = emuRectToPx(a.text_box, box, norm); // <--- ADDED norm
    const el = document.createElement("div");
    el.className = "annotation-label";
    el.textContent = a.text_content ?? "";
    Object.assign(el.style, {
      position: "absolute",
      left: `${px.left}px`,
      top: `${px.top}px`,
      width: `${px.width}px`,
      height: `${px.height}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });
    labels.appendChild(el);

    // Pointer lines
    (a.pointer_lines || []).forEach((line) => {
      if (!line?.start_point || !line?.end_point) return;
      const p1 = emuPointToPx(line.start_point, box, norm); // <--- ADDED norm
      const p2 = emuPointToPx(line.end_point, box, norm);   // <--- ADDED norm
      const l  = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("x1", p1.x);
      l.setAttribute("y1", p1.y);
      l.setAttribute("x2", p2.x);
      l.setAttribute("y2", p2.y);
      l.setAttribute("class", "annotation-line");
      svg.appendChild(l);
    });
  });

  // Store last json for autoscale redraw
  stage.__lastJson = annotationsJson; // <--- SIMPLIFIED to store the whole JSON
}

/** Load JSON from a URL and draw it. Returns a promise. */
export async function loadAndDrawAnnotations(container, jsonUrl) {
  if (!container || !jsonUrl) return;
  const res = await fetch(jsonUrl);
  if (!res.ok) return;
  const data = await res.json();

  // The backend now provides data in the structure expected by drawAnnotations
  // (i.e., { annotations: [...], normalized_geometry: { normX, normY, normW, normH } })
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