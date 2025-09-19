let currentBone = null;
let currentSubboneIndex = -1;
let subbones = [];

export function setupNavigation(prevButton, nextButton, subboneDropdown, updateDescription) {
  prevButton.addEventListener("click", () => {
    prevSubbone();
    updateUI(subboneDropdown, updateDescription);
  });

  nextButton.addEventListener("click", () => {
    nextSubbone();
    updateUI(subboneDropdown, updateDescription);
  });

  disableButtons(prevButton, nextButton);
}

export function setBoneAndSubbones(bone, boneSubbones) {
  currentBone = bone;
  subbones = boneSubbones || [];
  currentSubboneIndex = subbones.length > 0 ? 0 : -1;
}

function prevSubbone() {
  if (currentSubboneIndex > 0) {
    currentSubboneIndex--;
  }
}

function nextSubbone() {
  if (currentSubboneIndex < subbones.length - 1) {
    currentSubboneIndex++;
  }
}

function updateUI(subboneDropdown, updateDescription) {
  if (subbones.length === 0 || currentSubboneIndex === -1) return;

  subboneDropdown.selectedIndex = currentSubboneIndex;
  const selectedSubbone = subbones[currentSubboneIndex];
  updateDescription(selectedSubbone);
}

export function disableButtons(prevButton, nextButton) {
  const disabled = subbones.length === 0;
  prevButton.disabled = disabled;
  nextButton.disabled = disabled;
}
