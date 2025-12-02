// js/sidebar.js
export async function initializeSidebar() {
    const toggleButton = document.getElementById("toggle-sidebar");
    const sidebarContainer = document.getElementById("sidebar-container");

    async function loadSidebar() {
        if (!sidebarContainer.innerHTML) {
            try {
                const response = await fetch("sidebar.html");
                const sidebarHTML = await response.text();
                sidebarContainer.innerHTML = sidebarHTML;
            } catch (error) {
                console.error("Error loading sidebar:", error);
            }
        }
    }

    if (toggleButton) {
        toggleButton.addEventListener("click", async () => {
            await loadSidebar(); // Ensure the sidebar is loaded
            const sidebarElement = document.getElementById("sidebar");

            if (sidebarElement) {
                const currentLeft = window.getComputedStyle(sidebarElement).left;
                if (currentLeft === "0px") {
                    sidebarElement.style.left = "-300px"; // Close sidebar - updated to match CSS
                } else {
                    sidebarElement.style.left = "0px"; // Open sidebar
                }
            }
        });
    }
}

export async function loadHelpButton() {
    const helpButtonContainer = document.getElementById("help-button-container");
    if (helpButtonContainer) {
        try {
            const response = await fetch("helpButton.html");
            const helpButtonHTML = await response.text();
            helpButtonContainer.innerHTML = helpButtonHTML;

            const helpButton = document.getElementById("text-button-Help");
            const helpModal = document.getElementById("help-modal");
            const closeHelpModal = document.getElementById("close-help-modal");

            if (helpButton && helpModal && closeHelpModal) {
                // Handle click events
                helpButton.addEventListener("click", () => {
                    helpModal.classList.add("is-visible");
                });

                closeHelpModal.addEventListener("click", () => {
                    helpModal.classList.remove("is-visible");
                });

                // Handle keyboard events
                helpButton.addEventListener("keydown", (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        helpModal.classList.add("is-visible");
                    }
                });

                // Close on escape key
                document.addEventListener("keydown", (event) => {
                    if (event.key === "Escape" && helpModal.classList.contains("is-visible")) {
                        helpModal.classList.remove("is-visible");
                    }
                });
            }
        } catch (error) {
            console.error("Error loading help button:", error);
        }
    }
}

// Note: initialization is performed by the app's entrypoint (`main.js`).
// This file uses ES module exports so it can be imported with `type="module"` scripts.

