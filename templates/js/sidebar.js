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
