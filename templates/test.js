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

require("./sidebar.js"); // Import the JavaScript code

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

    const sidebarContainer = document.getElementById("sidebar-container");
    sidebarContainer.innerHTML = ""; // Reset sidebar container

    const sidebarElement = document.getElementById("sidebar");
    if (sidebarElement) {
        sidebarElement.style.left = "-250px"; // Explicitly set the initial state
    }
});

beforeAll(() => {
    document.dispatchEvent(new Event("DOMContentLoaded")); // Simulate DOMContentLoaded
});

afterEach(() => {
    // Reset sidebar state after each test
    const sidebarElement = document.getElementById("sidebar");
    if (sidebarElement) {
        sidebarElement.style.left = "-250px"; // Ensure sidebar is closed
    }
    jest.restoreAllMocks(); // Clean up mocks
});

describe("Sidebar Toggle Functionality", () => {
    test("loads sidebar content when the button is clicked", async () => {
        const toggleButton = document.getElementById("toggle-sidebar");
        toggleButton.click();
        await new Promise(process.nextTick);

        const sidebarElement = document.getElementById("sidebar");
        expect(sidebarElement).toBeTruthy();
        expect(sidebarElement.innerHTML).toContain("Sidebar Content");
    });

    test("toggles sidebar open and closed", async () => {
        const toggleButton = document.getElementById("toggle-sidebar");
        const sidebarElement = document.getElementById("sidebar");

        // Ensure the sidebar starts hidden
        let computedStyle = window.getComputedStyle(sidebarElement);
        expect(computedStyle.left).toBe("-250px"); // Sidebar is initially hidden

        // Simulate opening the sidebar
        toggleButton.click();
        await new Promise((resolve) => setTimeout(resolve, 50)); // Wait for event propagation
        computedStyle = window.getComputedStyle(sidebarElement);
        expect(computedStyle.left).toBe("0px"); // Sidebar is open

        // Simulate closing the sidebar
        toggleButton.click();
        await new Promise((resolve) => setTimeout(resolve, 50)); // Wait for event propagation
        computedStyle = window.getComputedStyle(sidebarElement);
        expect(computedStyle.left).toBe("-250px"); // Sidebar is closed
    });
});

describe("Badge Button", () => {
    test("badge button is present and clickable", () => {
        const badgeButton = document.getElementById("toggle-sidebar");
        expect(badgeButton).toBeTruthy();
        expect(badgeButton.tagName).toBe("BUTTON");
    });

    test("badge button has correct initial text", () => {
        const badgeButton = document.getElementById("toggle-sidebar");
        expect(badgeButton.textContent).toBe("☰");
    });
});

describe("Sidebar Styling", () => {
    test("sidebar starts hidden by default", () => {
        const sidebar = document.getElementById("sidebar");
        expect(sidebar).toBeTruthy();

        const computedStyle = window.getComputedStyle(sidebar);
        expect(computedStyle.left).toBe("-250px"); // Sidebar is hidden initially
    });

    test("sidebar transitions smoothly", () => {
        const sidebar = document.getElementById("sidebar");
        expect(sidebar.style.transition).toContain("left 0.3s ease");
    });
});

// ------ New tests from main: Help Modal ------
describe("Help Modal Functionality", () => {
    beforeEach(() => {
        // Add help button and modal HTML to the test environment (append so earlier DOM stays)
        document.body.innerHTML += `
            <span id="text-button-Help" role="button">Help</span>
            <div id="help-modal" class="help-modal">
                <div id="help-modal-content">
                    <button id="close-help-modal">Close Guide</button>
                </div>
            </div>
        `;
    });

    test("modal is hidden by default", () => {
        const helpModal = document.getElementById("help-modal");
        expect(helpModal.classList.contains("is-visible")).toBeFalsy();
        const computedStyle = window.getComputedStyle(helpModal);
        expect(computedStyle.display).not.toBe("flex");
    });

    test("modal becomes visible when Help button is clicked", () => {
        const helpButton = document.getElementById("text-button-Help");
        const helpModal = document.getElementById("help-modal");

        helpButton.click();

        expect(helpModal.classList.contains("is-visible")).toBeTruthy();
    });

    test("modal becomes hidden when Close button is clicked", () => {
        const helpModal = document.getElementById("help-modal");
        const closeButton = document.getElementById("close-help-modal");

        // First make modal visible
        helpModal.classList.add("is-visible");

        // Then click close button
        closeButton.click();

        expect(helpModal.classList.contains("is-visible")).toBeFalsy();
    });

    test("modal closes when Escape key is pressed", () => {
        const helpModal = document.getElementById("help-modal");

        // First make modal visible
        helpModal.classList.add("is-visible");

        // Simulate pressing Escape key
        const escapeKeyEvent = new KeyboardEvent("keydown", { key: "Escape" });
        document.dispatchEvent(escapeKeyEvent);

        expect(helpModal.classList.contains("is-visible")).toBeFalsy();
    });
});
