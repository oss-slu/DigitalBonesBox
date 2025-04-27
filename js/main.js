import { setupNavigation, setBoneAndSubbones, disableButtons } from './navigation.js';
import { updateDescription } from './description.js'; // Assuming you already have this

document.addEventListener('DOMContentLoaded', () => {
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const subboneDropdown = document.getElementById('subbone-dropdown');

  setupNavigation(prevButton, nextButton, subboneDropdown, updateDescription);

  // Example: when a new bone is selected
  document.getElementById('bone-dropdown').addEventListener('change', (event) => {
    const selectedBone = event.target.value;
    const selectedSubbones = getSubbonesForBone(selectedBone); // You need to implement this

    setBoneAndSubbones(selectedBone, selectedSubbones);

    // Update the dropdown options
    populateSubboneDropdown(subboneDropdown, selectedSubbones);

    disableButtons(prevButton, nextButton);
  });
});

function populateSubboneDropdown(dropdown, subbones) {
  dropdown.innerHTML = '';
  subbones.forEach((subbone, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = subbone;
    dropdown.appendChild(option);
  });
}

// Dummy placeholder for subbones fetching
function getSubbonesForBone(bone) {
  const exampleData = {
    Humerus: ['Lateral Epicondyle', 'Medial Epicondyle'],
    Ulna: ['Olecranon', 'Coronoid Process']
  };
  return exampleData[bone] || [];
}
