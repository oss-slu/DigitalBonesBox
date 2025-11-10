// js/annotationOverlay.js
// Small, self-contained overlay that won’t change your visuals unless called.

const PPT_EMU = { W: 9144000, H: 6858000 }; // PowerPoint canvas

function ensureStage(container) {
  let stage = container.querySelector('.annotation-stage');
  if (!stage) {
    stage = document.createElement('div');
    stage.className = 'annotation-stage';
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
  const stage = container.querySelector('.annotation-stage');
  if (stage) stage.remove();
}

function emuRectToPx(rect, box) {
  // rect: {x,y,width,height} in EMUs; box: {w,h} in rendered px
  const scaleX = box.w / PPT_EMU.W;
  const scaleY = box.h / PPT_EMU.H;
  return {
    left:  rect.x * scaleX,
    top:   rect.y * scaleY,
    width: rect.width  * scaleX,
    height:rect.height * scaleY,
  };
}

function emuPointToPx(pt, box) {
  const scaleX = box.w / PPT_EMU.W;
  const scaleY = box.h / PPT_EMU.H;
  return { x: pt.x * scaleX, y: pt.y * scaleY };
}

/**
 * Draw labels + lines using one JSON object:
 * {
 *   annotations: [
 *     { text_content: "Greater wing",
 *       text_box: {x,y,width,height},
 *       pointer_lines: [{ start_point:{x,y}, end_point:{x,y} }, ...]
 *     }, ...
 *   ]
 * }
 */
export function drawAnnotations(container, annotationsJson) {
  if (!container || !annotationsJson) return;

  // Make sure overlay exists
  const stage = ensureStage(container);
  const svg   = stage.querySelector('.annotation-svg');
  const labels= stage.querySelector('.annotation-labels');

  // Clear previous
  svg.innerHTML = '';
  labels.innerHTML = '';

  // Use the overlay container’s box as the coordinate space
  const rect = container.getBoundingClientRect();
  const box  = { w: rect.width, h: rect.height };

  (annotationsJson.annotations || []).forEach(a => {
    // Label
    const px = emuRectToPx(a.text_box, box);
    const el = document.createElement('div');
    el.className = 'annotation-label';
    el.textContent = a.text_content ?? '';
    Object.assign(el.style, {
      position: 'absolute',
      left: `${px.left}px`,
      top: `${px.top}px`,
      width: `${px.width}px`,
      height: `${px.height}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    labels.appendChild(el);

    // Lines
    (a.pointer_lines || []).forEach(line => {
      const p1 = emuPointToPx(line.start_point, box);
      const p2 = emuPointToPx(line.end_point,   box);
      const l  = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', p1.x); l.setAttribute('y1', p1.y);
      l.setAttribute('x2', p2.x); l.setAttribute('y2', p2.y);
      l.setAttribute('class', 'annotation-line');
      svg.appendChild(l);
    });
  });
}

// Convenient global (optional) for non-module callers
window.AnnotationOverlay = { clearAnnotations, drawAnnotations };
