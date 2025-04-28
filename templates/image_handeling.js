// image_handling.js

function loadBoneImage(boneId) {
    document.getElementById('bone-image').src =
      `https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/images/bony_pelvis.png`;
}

async function loadAnnotations(boneId) {
    const overlay = document.getElementById('annotations-overlay');
    overlay.innerHTML = '';

    try {
        const data = await fetch(
          `https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/annotations/${boneId}.json`
        );
        const annotations = await data.json();
        annotations.forEach(a => {
            const div = document.createElement('div');
            div.className = 'annotation';
            div.textContent = a.text;
            div.style.top = `${a.y}%`;
            div.style.left = `${a.x}%`;
            overlay.appendChild(div);
        });
    } catch (error) {
        console.error('Failed to load annotations:', error);
    }
}

async function loadImageAndAnnotations(boneId) {
    loadBoneImage(boneId);
    await loadAnnotations(boneId);
}
