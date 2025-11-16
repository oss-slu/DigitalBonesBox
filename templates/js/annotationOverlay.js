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
 * @returns {Object} Pixel coordinates {left, top, width, height}.
 */
function emuRectToPx(rect, box) {
  // Scaling factors: Container pixel width / (EMU width of the visible area)
  // EMU width of the visible area = PPT_EMU.W / norm.w
  const sx = box.w / PPT_EMU.W;
  const sy = box.h / PPT_EMU.H;
  return {
    left:   rect.x * sx,
    top:    rect.y * sy,
    width:  rect.width  * sx,
    height: rect.height * sy,
  };
}

/**
 * Calculates pixel point based on EMU coordinates and the normalized box size.
 * @param {Object} pt - The EMU point {x, y}.
 * @param {Object} box - The current container pixel size {w, h}.
 * @returns {Object} Pixel coordinates {x, y}.
 */
function emuPointToPx(pt, box) {
  const sx = box.w / PPT_EMU.W;
  const sy = box.h / PPT_EMU.H;
  return { x: pt.x * sx, y: pt.y * sy };
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
  
  // 4. Adjust EMU coordinates by the offset (normX, normY) of the crop.
  // This shifts the origin from the top-left of the original slide to the top-left of the image container.
  const list = (annotationsJson.annotations || annotationsJson.text_annotations || [])
    .map(a => {
        if (!a || !a.text_box) return a;
        // Calculate the EMU offset based on the normalization factors
        const emuOffsetX = norm.normX * PPT_EMU.W;
        const emuOffsetY = norm.normY * PPT_EMU.H;
        
        return {
            ...a,
            text_box: {
                ...a.text_box,
                // Adjust the box position
                x: a.text_box.x - emuOffsetX,
                y: a.text_box.y - emuOffsetY,
            },
            pointer_lines: (a.pointer_lines || []).map(line => ({
                start_point: {
                    // Adjust the line start point
                    x: line.start_point.x - emuOffsetX,
                    y: line.start_point.y - emuOffsetY
                },
                end_point: {
                    // Adjust the line end point
                    x: line.end_point.x - emuOffsetX,
                    y: line.end_point.y - emuOffsetY
                }
            }))
        };
    });

  list.forEach((a) => {
    if (!a || !a.text_box) return;

    // Text label
    const px = emuRectToPx(a.text_box, box);
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
      const p1 = emuPointToPx(line.start_point, box);
      const p2 = emuPointToPx(line.end_point, box);
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
  stage.__lastJson = { annotations: annotationsJson.annotations || annotationsJson.text_annotations, normalized_geometry: norm }; // Store original list and norm for redraw
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