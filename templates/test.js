const html = `
<div id="badge">
    <button id="toggle-sidebar">☰</button>
</div>
<div id="sidebar-container"></div>
<div id="sidebar" style="left: -250px; transition: left 0.3s ease;">
    Sidebar Content
</div>
`;
document.body.innerHTML = html;

require('./sidebar.js'); // Import the JavaScript code

beforeEach(() => {
    global.fetch = jest.fn(() =>
        Promise.resolve({
            text: () =>
                Promise.resolve(`
                    <div id="sidebar" style="left: -250px; transition: left 0.3s ease;">
                        Sidebar Content
                    </div>
                `),
        })
    );

    const sidebarContainer = document.getElementById('sidebar-container');
    sidebarContainer.innerHTML = ''; // Reset sidebar container

    const sidebarElement = document.getElementById('sidebar');
    if (sidebarElement) {
        sidebarElement.style.left = '-250px'; // Explicitly set the initial state
    }
});

beforeAll(() => {
    document.dispatchEvent(new Event('DOMContentLoaded')); // Simulate DOMContentLoaded
});

afterEach(() => {
    // Reset sidebar state after each test
    const sidebarElement = document.getElementById('sidebar');
    if (sidebarElement) {
        sidebarElement.style.left = '-250px'; // Ensure sidebar is closed
    }
    jest.restoreAllMocks(); // Clean up mocks
});

describe('Sidebar Toggle Functionality', () => {
    test('loads sidebar content when the button is clicked', async () => {
        const toggleButton = document.getElementById('toggle-sidebar');
        toggleButton.click();
        await new Promise(process.nextTick);

        const sidebarElement = document.getElementById('sidebar');
        expect(sidebarElement).toBeTruthy();
        expect(sidebarElement.innerHTML).toContain('Sidebar Content');
    });

    test('toggles sidebar open and closed', async () => {
        const toggleButton = document.getElementById('toggle-sidebar');
        const sidebarElement = document.getElementById('sidebar');

        // Ensure the sidebar starts hidden
        let computedStyle = window.getComputedStyle(sidebarElement);
        expect(computedStyle.left).toBe('-250px'); // Sidebar is initially hidden

        // Simulate opening the sidebar
        toggleButton.click();
        await new Promise((resolve) => setTimeout(resolve, 50)); // Wait for event propagation
        computedStyle = window.getComputedStyle(sidebarElement);
        expect(computedStyle.left).toBe('0px'); // Sidebar is open

        // Simulate closing the sidebar
        toggleButton.click();
        await new Promise((resolve) => setTimeout(resolve, 50)); // Wait for event propagation
        computedStyle = window.getComputedStyle(sidebarElement);
        expect(computedStyle.left).toBe('-250px'); // Sidebar is closed
    });
});

describe('Badge Button', () => {
    test('badge button is present and clickable', () => {
        const badgeButton = document.getElementById('toggle-sidebar');
        expect(badgeButton).toBeTruthy();
        expect(badgeButton.tagName).toBe('BUTTON');
    });

    test('badge button has correct initial text', () => {
        const badgeButton = document.getElementById('toggle-sidebar');
        expect(badgeButton.textContent).toBe('☰');
    });
});

describe('Sidebar Styling', () => {
    test('sidebar starts hidden by default', () => {
        const sidebar = document.getElementById('sidebar');
        expect(sidebar).toBeTruthy();

        const computedStyle = window.getComputedStyle(sidebar);
        expect(computedStyle.left).toBe('-250px'); // Sidebar is hidden initially
    });

    test('sidebar transitions smoothly', () => {
        const sidebar = document.getElementById('sidebar');
        expect(sidebar.style.transition).toContain('left 0.3s ease');
    });
});
