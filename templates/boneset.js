import { fetchJSON } from './fetch.js';
import { loadImageAndAnnotations } from './imageHandling.js';  // Import the new image handling functions

const BONESET_JSON_PATH = 'boneset.json';  // Path to the boneset JSON file
let boneSets = []; // This will hold the fetched bone set data

// Function to render the bone set data
function renderBoneSet(boneSet) {
    const boneSetList = document.getElementById('bone-set-list');
    boneSetList.innerHTML = '';

    const li = document.createElement('li');
    li.textContent = boneSet.name;
    boneSetList.appendChild(li);

    const subList = document.createElement('ul');
    boneSet.bones.forEach(bone => {
        const subLi = document.createElement('li');
        subLi.textContent = `ID: ${bone}`;
        subList.appendChild(subLi);
    });
    boneSetList.appendChild(subList);

    // Display boneset image and annotations
    loadImageAndAnnotations(boneSet.bones[0]);  // Load the first bone image and annotations by default
}

// Event listeners for the "Previous" and "Next" buttons
document.getElementById('prev-button').addEventListener('click', () => {
    if (currentSetIndex > 0) {
        currentSetIndex--;
        renderBoneSet(boneSets[currentSetIndex]);
        document.getElementById('next-button').disabled = false;
        if (currentSetIndex === 0) {
            document.getElementById('prev-button').disabled = true;
        }
    }
});

document.getElementById('next-button').addEventListener('click', () => {
    if (currentSetIndex < boneSets.length - 1) {
        currentSetIndex++;
        renderBoneSet(boneSets[currentSetIndex]);
        document.getElementById('prev-button').disabled = false;
        if (currentSetIndex === boneSets.length - 1) {
            document.getElementById('next-button').disabled = true;
        }
    }
});
