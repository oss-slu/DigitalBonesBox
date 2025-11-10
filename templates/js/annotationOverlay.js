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

function emuRectToPx(rect, box) {
  const sx = box.w / PPT_EMU.W;
  const sy = box.h / PPT_EMU.H;
  return {
    left:   rect.x * sx,
    top:    rect.y * sy,
    width:  rect.width  * sx,
    height: rect.height * sy,
  };
}

function emuPointToPx(pt, box) {
  const sx = box.w / PPT_EMU.W;
  const sy = box.h / PPT_EMU.H;
  return { x: pt.x * sx, y: pt.y * sy };
}

/**
 * Draw labels + lines from a JSON object:
 * {
 *   annotations | text_annotations: [
 *     { text_content, text_box:{x,y,width,height}, pointer_lines:[{start_point:{x,y}, end_point:{x,y}}, ...] }
 *   ]
 * }
 */
export function drawAnnotations(container, annotationsJson) {
  if (!container || !annotationsJson) return;

  const stage  = ensureStage(container);
  const svg    = stage.querySelector(".annotation-svg");
  const labels = stage.querySelector(".annotation-labels");

  // Clear previous
  svg.innerHTML = "";
  labels.innerHTML = "";

  // Use the container itself as the coordinate space
  const rect = container.getBoundingClientRect();
  const box  = { w: rect.width, h: rect.height };

  // Support both shapes of input
  const list = annotationsJson.annotations || annotationsJson.text_annotations || [];

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
  stage.__lastJson = { annotations: list };
}

/** Load JSON from a URL and draw it. Returns a promise. */
export async function loadAndDrawAnnotations(container, jsonUrl) {
  if (!container || !jsonUrl) return;
  const res = await fetch(jsonUrl);
  if (!res.ok) return;
  const data = await res.json();

  // Normalize input to { annotations: [...] }
  const normalized = data.annotations
    ? { annotations: data.annotations }
    : (data.text_annotations ? { annotations: data.text_annotations } : { annotations: [] });

  drawAnnotations(container, normalized);
  attachAutoscale(container); // keep aligned on resize
}

/** Re-draw on container resize using the last JSON used. */
function attachAutoscale(container) {
  const stage = ensureStage(container);
  if (stage.__resizeObs) return; // already attached

  const ro = new ResizeObserver(() => {
    if (stage.__lastJson) drawAnnotations(container, stage.__lastJson);
  });
  ro.observe(container);
  stage.__resizeObs = ro;
}

// Optional global for non-module usage
window.AnnotationOverlay = { clearAnnotations, drawAnnotations, loadAndDrawAnnotations };
