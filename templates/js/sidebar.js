// js/sidebar.js
export function initializeSidebar() {
    const toggleButton = document.getElementById('toggle-sidebar');
    const sidebarContainer = document.getElementById('sidebar-container');

    async function loadSidebar() {
        if (!sidebarContainer.innerHTML) {
            try {
                const response = await fetch('sidebar.html');
                const sidebarHTML = await response.text();
                sidebarContainer.innerHTML = sidebarHTML;
            } catch (error) {
                console.error('Error loading sidebar:', error);
            }
        }
    }

    if (toggleButton) {
        toggleButton.addEventListener('click', async () => {
            await loadSidebar(); // Ensure the sidebar is loaded
            const sidebarElement = document.getElementById('sidebar');

            if (sidebarElement) {
                if (sidebarElement.style.left === '0px') {
                    sidebarElement.style.left = '-250px'; // Close sidebar
                } else {
                    sidebarElement.style.left = '0px'; // Open sidebar
                }
            }
        });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const helpButton = document.getElementById('text-button-Help');
    const helpModal = document.getElementById('help-modal');
    const closeHelpModal = document.getElementById('close-help-modal');
    if (helpButton && helpModal && closeHelpModal) {
        helpButton.addEventListener('click', () => {
            helpModal.style.display = 'flex';
        });
        closeHelpModal.addEventListener('click', () => {
            helpModal.style.display = 'none';
        });
    }
})

