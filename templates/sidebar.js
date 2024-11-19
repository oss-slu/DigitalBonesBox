async function loadSidebar() {
    try {
        const response = await fetch('sidebar.html');
        if (!response.ok) {
            throw new Error('Failed to load sidebar');
        }
        
        const sidebarHTML = await response.text();
        document.getElementById('sidebar-container').innerHTML = sidebarHTML;

        const sidebar = document.getElementById('sidebar');
        const closeButton = document.getElementById('close-sidebar');

        window.openSidebar = function() {
            sidebar.style.display = 'block';
            sidebar.style.left = '0'; 
        };

        window.closeSidebar = function() {
            sidebar.style.left = '-250px'; 
            setTimeout(() => {
                sidebar.style.display = 'none';
            }, 300); 
        };


        if (closeButton) {
            closeButton.addEventListener('click', closeSidebar);
        }
    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggle-sidebar');
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            loadSidebar().then(() => openSidebar());
        });
    }
});
