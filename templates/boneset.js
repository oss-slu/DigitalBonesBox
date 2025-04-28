// boneset.js
import { fetchJSON } from './fetch.js';               // your fetch helper
import { loadImageAndAnnotations } from './image_handeling.js';

const BONESET_JSON_PATH =
  'https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/boneset.json';

const bonesetSelect = document.getElementById('boneset-select');
const boneSelect    = document.getElementById('bone-select');
const subboneSelect = document.getElementById('subbone-select');

let boneSets = [];

// 1. On page load, fetch boneset.json and populate the first dropdown
window.addEventListener('DOMContentLoaded', async () => {
  try {
    boneSets = await fetchJSON(BONESET_JSON_PATH);
    console.log('Loaded bonesets:', boneSets);
    boneSets.forEach(set => {
      const opt = document.createElement('option');
      opt.value = set.id;
      opt.textContent = set.name;
      bonesetSelect.appendChild(opt);
    });
  } catch (e) {
    console.error('Failed to load bonesets:', e);
  }
});

// 2. When a boneset is selected, populate Bones dropdown and load its first image
bonesetSelect.addEventListener('change', () => {
  const selectedId = bonesetSelect.value;
  boneSelect.innerHTML    = '<option value="">--Please choose a Bone--</option>';
  subboneSelect.innerHTML = '<option value="">--Please choose a Sub-bone--</option>';
  subboneSelect.disabled  = true;

  const set = boneSets.find(bs => bs.id === selectedId);
  if (!set) {
    boneSelect.disabled = true;
    return;
  }

  boneSelect.disabled = false;
  set.bones.forEach(bone => {
    const opt = document.createElement('option');
    opt.value = bone.id;
    opt.textContent = bone.name;
    boneSelect.appendChild(opt);
  });

  // Immediately display the first bone’s image and annotations
  if (set.bones.length > 0) {
    loadImageAndAnnotations(set.bones[0].id);
  }
});

// 3. When a Bone is selected, populate Sub-bones (if any) and load its image
boneSelect.addEventListener('change', () => {
  const boneId = boneSelect.value;
  const set = boneSets.find(bs =>
    bs.bones.some(b => b.id === boneId)
  );

  subboneSelect.innerHTML = '<option value="">--Please choose a Sub-bone--</option>';
  const bone = set.bones.find(b => b.id === boneId);

  if (bone.subbones && bone.subbones.length > 0) {
    subboneSelect.disabled = false;
    bone.subbones.forEach(sb => {
      const opt = document.createElement('option');
      opt.value = sb.id;
      opt.textContent = sb.name;
      subboneSelect.appendChild(opt);
    });
  } else {
    subboneSelect.disabled = true;
  }

  loadImageAndAnnotations(boneId);
});

// 4. When a Sub-bone is selected, load its image and annotations
subboneSelect.addEventListener('change', () => {
  const subboneId = subboneSelect.value;
  if (subboneId) {
    loadImageAndAnnotations(subboneId);
  }
});
