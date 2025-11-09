// js/annotationOverlay.js
// Draws PowerPoint-style text labels + pointer lines on top of #bone-image-container

const PPT_EMU_WIDTH  = 9144000; // 10 in * 914400 EMU
const PPT_EMU_HEIGHT = 6858000; // 7.5 in * 914400 EMU

function emuToPxX(emuX, stageW) { return (emuX / PPT_EMU_WIDTH)  * stageW; }
function emuToPxY(emuY, stageH) { return (emuY / PPT_EMU_HEIGHT) * stageH; }

/**
 * Fetch JSON by boneId or absolute/relative URL.
 * - If options.jsonUrl is provided, it wins.
 * - Otherwise we try a conventional path using boneId.
 */
async function loadAnnotationJson({ boneId, jsonUrl }) {
  if (!boneId && !jsonUrl) return null;

  const url = jsonUrl ?? `data/DataPelvis/annotations/text_label_annotations/${boneId}_text_labels.json`;
  try {
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.warn("[annotationOverlay] Could not load annotations:", e);
    return null;
  }
}

function ensureStage(containerEl) {
  // Make the container a positioning context
  containerEl.style.position = containerEl.style.position || "relative";

  let stage = containerEl.querySelector(".annotation-stage");
  if (!stage) {
    stage = document.createElement("div");
    stage.className = "annotation-stage";
    stage.innerHTML = `
      <svg class="annotation-svg" xmlns="http://www.w3.org/2000/svg"></svg>
      <div class="annotation-labels"></div>
    `;
    containerEl.appendChild(stage);
    containerEl.classList.add("annotations-active");
  }
  return stage;
}

function clearStage(containerEl) {
  const stage = containerEl.querySelector(".annotation-stage");
  if (stage) stage.remove();
  containerEl.classList.remove("annotations-active");
}

/**
 * Public: render annotations.
 * @param {Object} opts
 * @param {string} [opts.boneId]      e.g. "slide02_bony_pelvis" (whatever naming you use)
 * @param {string} [opts.jsonUrl]     direct path to the json (overrides boneId)
 * @param {HTMLElement} opts.container  the #bone-image-container element
 * @returns {Function} cleanup
 */
export async function renderAnnotations(opts = {}) {
  const { boneId, jsonUrl, container } = opts;
  if (!container) return () => {};

  const data = await loadAnnotationJson({ boneId, jsonUrl });
  if (!data || !Array.isArray(data.text_annotations)) {
    // Nothing to draw (graceful no-op)
    clearStage(container);
    return () => {};
  }

  const stage = ensureStage(container);

  // Size the stage to the container’s current content box
  const rect = container.getBoundingClientRect();
  const stageW = container.clientWidth;
  const stageH = container.clientHeight;

  // Resize SVG to overlay perfectly
  const svg = stage.querySelector(".annotation-svg");
  svg.setAttribute("viewBox", `0 0 ${stageW} ${stageH}`);
  svg.setAttribute("width", stageW);
  svg.setAttribute("height", stageH);
  svg.innerHTML = ""; // clear old lines

  const labelsRoot = stage.querySelector(".annotation-labels");
  labelsRoot.innerHTML = ""; // clear old labels

  // Draw everything
  for (const ann of data.text_annotations) {
    const tb = ann.text_box || {};
    // Label box -> absolutely positioned DIV
    const label = document.createElement("div");
    label.className = "annotation-label";
    label.textContent = ann.text_content ?? "";

    const x = emuToPxX(tb.x ?? 0, stageW);
    const y = emuToPxY(tb.y ?? 0, stageH);
    const w = emuToPxX((tb.width ?? 0), stageW);
    const h = emuToPxY((tb.height ?? 0), stageH);

    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    label.style.width = `${w}px`;
    label.style.height = `${h}px`;

    labelsRoot.appendChild(label);

    // Lines -> SVG <line> elements
    const lines = Array.isArray(ann.pointer_lines) ? ann.pointer_lines : [];
    for (const ln of lines) {
      const sp = ln.start_point || {};
      const ep = ln.end_point || {};
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.classList.add("annotation-line");
      line.setAttribute("x1", String(emuToPxX(sp.x ?? 0, stageW)));
      line.setAttribute("y1", String(emuToPxY(sp.y ?? 0, stageH)));
      line.setAttribute("x2", String(emuToPxX(ep.x ?? 0, stageW)));
      line.setAttribute("y2", String(emuToPxY(ep.y ?? 0, stageH)));
      svg.appendChild(line);
    }
  }

  // Return cleanup function
  const cleanup = () => clearStage(container);
  return cleanup;
}

export function clearAnnotations(container) {
  if (!container) return;
  clearStage(container);
}
