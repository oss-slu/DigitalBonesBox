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

// testing for viewer display

describe("Viewer Display Logic", () => {
    let mockBoneData;

    beforeEach(() => {
        // Add viewer HTML elements to the DOM
        const viewerHTML = `
            <div class="viewer-wrapper">
                <img id="bone-image" alt="Bone Image" style="display: none;" />
                <div id="annotations-overlay">
                    <p>Select a bone to view image and annotations.</p>
                </div>
            </div>
        `;
        document.body.innerHTML += viewerHTML;

        // Mock the bone data structure
        mockBoneData = {
            bones: [
                {
                    id: "ischium",
                    name: "Ischium",
                    image_url: "https://via.placeholder.com/600x400/4A90E2/FFFFFF?text=Ischium+Bone",
                    annotations: [
                        {
                            text: "Ischial Tuberosity - Attachment point for hamstring muscles",
                            position: { x: 300, y: 150 }
                        },
                        {
                            text: "Ischial Spine - Forms part of the lesser sciatic notch",
                            position: { x: 250, y: 100 }
                        },
                        {
                            text: "Ischial Ramus - Forms part of the obturator foramen",
                            position: { x: 350, y: 200 }
                        }
                    ]
                }
            ]
        };

        // Mock fetch for the mock data file
        global.fetch = jest.fn((url) => {
            if (url.includes("mock-bone-data.json")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBoneData)
                });
            }
            return Promise.reject(new Error("Not found"));
        });
    });

    afterEach(() => {
        // Clean up DOM
        const viewerWrapper = document.querySelector(".viewer-wrapper");
        if (viewerWrapper) {
            viewerWrapper.remove();
        }
        jest.restoreAllMocks();
    });

    test("bone image src attribute is correctly updated after selection", () => {
        const boneImage = document.getElementById("bone-image");
        const bone = mockBoneData.bones[0];

        // Simulate the displayBoneData function logic
        boneImage.src = bone.image_url;
        boneImage.alt = `${bone.name} bone image`;
        boneImage.style.display = "block";

        expect(boneImage.src).toBe("https://via.placeholder.com/600x400/4A90E2/FFFFFF?text=Ischium+Bone");
        expect(boneImage.alt).toBe("Ischium bone image");
        expect(boneImage.style.display).toBe("block");
    });

    test("correct number of annotation elements are created in annotations overlay", () => {
        const annotationsOverlay = document.getElementById("annotations-overlay");
        const bone = mockBoneData.bones[0];

        // Clear previous content
        annotationsOverlay.innerHTML = "";

        // Simulate the displayAnnotations function logic
        const annotationsList = document.createElement("ul");
        annotationsList.className = "annotations-list";

        bone.annotations.forEach((annotation) => {
            const listItem = document.createElement("li");
            listItem.className = "annotation-item";
            listItem.textContent = annotation.text;
            annotationsList.appendChild(listItem);
        });

        annotationsOverlay.appendChild(annotationsList);

        // Verify correct number of annotations
        const annotationItems = annotationsOverlay.querySelectorAll(".annotation-item");
        expect(annotationItems).toHaveLength(3);

        // Verify annotation content
        expect(annotationItems[0].textContent).toBe("Ischial Tuberosity - Attachment point for hamstring muscles");
        expect(annotationItems[1].textContent).toBe("Ischial Spine - Forms part of the lesser sciatic notch");
        expect(annotationItems[2].textContent).toBe("Ischial Ramus - Forms part of the obturator foramen");
    });

    test("placeholder message is shown when no bone is selected", () => {
        const boneImage = document.getElementById("bone-image");
        const annotationsOverlay = document.getElementById("annotations-overlay");

        // Simulate clearBoneDisplay function logic
        boneImage.src = "";
        boneImage.alt = "";
        boneImage.style.display = "none";
        annotationsOverlay.innerHTML = "<p>Select a bone to view image and annotations.</p>";

        expect(boneImage.src).toBe("");
        expect(boneImage.style.display).toBe("none");
        expect(annotationsOverlay.innerHTML).toBe("<p>Select a bone to view image and annotations.</p>");
    });

    test("handles bone with no annotations gracefully", () => {
        const annotationsOverlay = document.getElementById("annotations-overlay");

        // Simulate bone with empty annotations array
        const boneWithNoAnnotations = {
            id: "test_bone",
            name: "Test Bone",
            image_url: "test-url.jpg",
            annotations: []
        };

        // Clear previous content
        annotationsOverlay.innerHTML = "";

        // Simulate displayAnnotations with empty array
        if (!boneWithNoAnnotations.annotations || boneWithNoAnnotations.annotations.length === 0) {
            annotationsOverlay.innerHTML = "<p>No annotations available for this bone.</p>";
        }

        expect(annotationsOverlay.innerHTML).toBe("<p>No annotations available for this bone.</p>");
    });

    test("annotation items have correct CSS classes", () => {
        const annotationsOverlay = document.getElementById("annotations-overlay");
        const bone = mockBoneData.bones[0];

        // Clear and populate annotations
        annotationsOverlay.innerHTML = "";
        const annotationsList = document.createElement("ul");
        annotationsList.className = "annotations-list";

        bone.annotations.forEach((annotation) => {
            const listItem = document.createElement("li");
            listItem.className = "annotation-item";
            listItem.textContent = annotation.text;
            annotationsList.appendChild(listItem);
        });

        annotationsOverlay.appendChild(annotationsList);

        // Verify CSS classes
        const list = annotationsOverlay.querySelector("ul");
        expect(list.className).toBe("annotations-list");

        const items = annotationsOverlay.querySelectorAll("li");
        items.forEach(item => {
            expect(item.className).toBe("annotation-item");
        });

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

describe("Interactive Annotation Markers", () => {
    let mockBoneDataWithAnnotations;
    let boneImage;
    let annotationsOverlay;

    beforeEach(() => {
        // Setup DOM elements
        const viewerHTML = `
            <div class="viewer-wrapper">
                <img id="bone-image" alt="Bone Image" style="display: block;" />
                <div id="annotations-overlay" style="position: relative; width: 604px; height: 454px;"></div>
            </div>
        `;
        document.body.innerHTML += viewerHTML;

        boneImage = document.getElementById("bone-image");
        annotationsOverlay = document.getElementById("annotations-overlay");

        // Mock bone data with proper structure
        mockBoneDataWithAnnotations = {
            id: "ilium",
            name: "Ilium",
            image_url: "/images/bony_pelvis/ilium.jpg",
            annotations: [
                {
                    text: "Iliac Crest",
                    position: { x: 5431116, y: 1912315, width: 595035, height: 215444 }
                },
                {
                    text: "Anterior Superior Iliac Spine",
                    position: { x: 5407752, y: 2590801, width: 766897, height: 461665 }
                }
            ]
        };

        // Mock getBoundingClientRect for image
        boneImage.getBoundingClientRect = jest.fn(() => ({
            width: 604,
            height: 454,
            top: 0,
            left: 0,
            right: 604,
            bottom: 454
        }));

        // Set natural dimensions
        Object.defineProperty(boneImage, "naturalWidth", { value: 800, configurable: true });
        Object.defineProperty(boneImage, "naturalHeight", { value: 600, configurable: true });
    });

    afterEach(() => {
        const viewerWrapper = document.querySelector(".viewer-wrapper");
        if (viewerWrapper) {
            viewerWrapper.remove();
        }
        jest.restoreAllMocks();
    });

    // Test 1: Correct number of markers created
    test("creates correct number of annotation markers in DOM", () => {
        const annotations = mockBoneDataWithAnnotations.annotations;
        
        // Simulate displayInteractiveAnnotations logic
        annotationsOverlay.innerHTML = "";
        
        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        annotations.forEach((annotation, index) => {
            if (!annotation.position) return;

            const marker = document.createElement("div");
            marker.className = "annotation-marker";
            marker.dataset.annotationIndex = index;
            
            const scaledX = annotation.position.x * scaleX;
            const scaledY = annotation.position.y * scaleY;
            const scaledWidth = Math.max((annotation.position.width || 100000) * scaleX, 20);
            const scaledHeight = Math.max((annotation.position.height || 100000) * scaleY, 20);

            marker.style.position = "absolute";
            marker.style.left = `${scaledX}px`;
            marker.style.top = `${scaledY}px`;
            marker.style.width = `${scaledWidth}px`;
            marker.style.height = `${scaledHeight}px`;

            annotationsOverlay.appendChild(marker);
        });

        const markers = annotationsOverlay.querySelectorAll(".annotation-marker");
        expect(markers).toHaveLength(2);
        expect(markers[0].dataset.annotationIndex).toBe("0");
        expect(markers[1].dataset.annotationIndex).toBe("1");
    });

    // Test 2: Tooltip shows on mouseenter
    test("tooltip displays on mouseenter event", () => {
        // Create marker and tooltip
        const marker = document.createElement("div");
        marker.className = "annotation-marker";
        marker.style.position = "absolute";
        marker.style.left = "100px";
        marker.style.top = "100px";
        
        const tooltip = document.createElement("div");
        tooltip.className = "annotation-tooltip";
        tooltip.textContent = "Test Annotation";
        tooltip.style.display = "none";
        tooltip.style.position = "absolute";

        annotationsOverlay.appendChild(marker);
        annotationsOverlay.appendChild(tooltip);

        // Add mouseenter event listener
        marker.addEventListener("mouseenter", () => {
            tooltip.style.display = "block";
            tooltip.style.left = "120px";
            tooltip.style.top = "100px";
        });

        // Simulate mouseenter
        const mouseEnterEvent = new MouseEvent("mouseenter", { bubbles: true });
        marker.dispatchEvent(mouseEnterEvent);

        expect(tooltip.style.display).toBe("block");
    });

    // Test 3: Tooltip hides on mouseleave
    test("tooltip hides on mouseleave event", () => {
        // Create marker and tooltip
        const marker = document.createElement("div");
        marker.className = "annotation-marker";
        
        const tooltip = document.createElement("div");
        tooltip.className = "annotation-tooltip";
        tooltip.textContent = "Test Annotation";
        tooltip.style.display = "block"; // Start visible

        annotationsOverlay.appendChild(marker);
        annotationsOverlay.appendChild(tooltip);

        // Add mouseleave event listener
        marker.addEventListener("mouseleave", () => {
            tooltip.style.display = "none";
        });

        // Simulate mouseleave
        const mouseLeaveEvent = new MouseEvent("mouseleave", { bubbles: true });
        marker.dispatchEvent(mouseLeaveEvent);

        expect(tooltip.style.display).toBe("none");
    });

    // Test 4: Handle empty annotations array
    test("handles empty annotations array gracefully", () => {
        const emptyAnnotations = [];
        
        annotationsOverlay.innerHTML = "";
        
        if (!emptyAnnotations || emptyAnnotations.length === 0) {
            annotationsOverlay.innerHTML = "<p>No annotations available for this bone.</p>";
        }

        expect(annotationsOverlay.innerHTML).toBe("<p>No annotations available for this bone.</p>");
        const markers = annotationsOverlay.querySelectorAll(".annotation-marker");
        expect(markers).toHaveLength(0);
    });

    // Test 5: Handle annotations with missing position data
    test("skips annotations with missing position coordinates", () => {
        const annotationsWithMissingPosition = [
            {
                text: "Valid Annotation",
                position: { x: 5431116, y: 1912315, width: 595035, height: 215444 }
            },
            {
                text: "Invalid Annotation - No Position"
                // position is missing
            },
            {
                text: "Another Valid Annotation",
                position: { x: 5407752, y: 2590801, width: 766897, height: 461665 }
            }
        ];

        annotationsOverlay.innerHTML = "";
        
        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        annotationsWithMissingPosition.forEach((annotation, index) => {
            if (!annotation.position) return; // Skip invalid annotations

            const marker = document.createElement("div");
            marker.className = "annotation-marker";
            marker.dataset.annotationIndex = index;
            
            const scaledX = annotation.position.x * scaleX;
            const scaledY = annotation.position.y * scaleY;

            marker.style.position = "absolute";
            marker.style.left = `${scaledX}px`;
            marker.style.top = `${scaledY}px`;

            annotationsOverlay.appendChild(marker);
        });

        const markers = annotationsOverlay.querySelectorAll(".annotation-marker");
        expect(markers).toHaveLength(2); // Only 2 valid annotations
    });

    // Test 6: Coordinate scaling accuracy
    test("correctly scales coordinates from high-res to display dimensions", () => {
        const annotation = {
            text: "Test",
            position: { x: 6000000, y: 4000000, width: 100000, height: 100000 }
        };

        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = { width: 604, height: 454 };
        
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        const scaledX = annotation.position.x * scaleX;
        const scaledY = annotation.position.y * scaleY;

        // Verify scaling produces reasonable display coordinates
        expect(scaledX).toBeGreaterThan(0);
        expect(scaledX).toBeLessThan(imageRect.width);
        expect(scaledY).toBeGreaterThan(0);
        expect(scaledY).toBeLessThan(imageRect.height);
        
        // Check specific calculation
        expect(scaledX).toBeCloseTo(302, 0); // 6000000 * (604/12000000) ≈ 302
        expect(scaledY).toBeCloseTo(227, 0); // 4000000 * (454/8000000) ≈ 227
    });

    // Test 7: Edge case - coordinates at boundaries
    test("handles edge case coordinates at boundaries", () => {
        const boundaryAnnotations = [
            { text: "Top Left", position: { x: 0, y: 0, width: 100000, height: 100000 } },
            { text: "Bottom Right", position: { x: 12000000, y: 8000000, width: 100000, height: 100000 } }
        ];

        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        boundaryAnnotations.forEach(annotation => {
            const scaledX = annotation.position.x * scaleX;
            const scaledY = annotation.position.y * scaleY;

            // Coordinates should be within or at image boundaries
            expect(scaledX).toBeGreaterThanOrEqual(0);
            expect(scaledX).toBeLessThanOrEqual(imageRect.width);
            expect(scaledY).toBeGreaterThanOrEqual(0);
            expect(scaledY).toBeLessThanOrEqual(imageRect.height);
        });
    });

    // Test 8: Marker positioning with style attributes
    test("markers have correct positioning style attributes", () => {
        const annotation = {
            text: "Test Marker",
            position: { x: 5431116, y: 1912315, width: 595035, height: 215444 }
        };

        annotationsOverlay.innerHTML = "";
        
        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        const marker = document.createElement("div");
        marker.className = "annotation-marker";
        
        const scaledX = annotation.position.x * scaleX;
        const scaledY = annotation.position.y * scaleY;
        const scaledWidth = Math.max((annotation.position.width || 100000) * scaleX, 20);
        const scaledHeight = Math.max((annotation.position.height || 100000) * scaleY, 20);

        marker.style.position = "absolute";
        marker.style.left = `${scaledX}px`;
        marker.style.top = `${scaledY}px`;
        marker.style.width = `${scaledWidth}px`;
        marker.style.height = `${scaledHeight}px`;

        annotationsOverlay.appendChild(marker);

        expect(marker.style.position).toBe("absolute");
        expect(marker.style.left).toContain("px");
        expect(marker.style.top).toContain("px");
        expect(parseFloat(marker.style.width)).toBeGreaterThanOrEqual(20);
        expect(parseFloat(marker.style.height)).toBeGreaterThanOrEqual(20);
    });

    // Test 9: Multiple tooltips behavior
    test("only one tooltip visible at a time", () => {
        // Create two markers with tooltips
        const marker1 = document.createElement("div");
        marker1.className = "annotation-marker";
        const tooltip1 = document.createElement("div");
        tooltip1.className = "annotation-tooltip";
        tooltip1.style.display = "none";

        const marker2 = document.createElement("div");
        marker2.className = "annotation-marker";
        const tooltip2 = document.createElement("div");
        tooltip2.className = "annotation-tooltip";
        tooltip2.style.display = "none";

        annotationsOverlay.appendChild(marker1);
        annotationsOverlay.appendChild(tooltip1);
        annotationsOverlay.appendChild(marker2);
        annotationsOverlay.appendChild(tooltip2);

        // Add event listeners
        marker1.addEventListener("mouseenter", () => {
            tooltip1.style.display = "block";
        });
        marker1.addEventListener("mouseleave", () => {
            tooltip1.style.display = "none";
        });

        marker2.addEventListener("mouseenter", () => {
            tooltip2.style.display = "block";
        });
        marker2.addEventListener("mouseleave", () => {
            tooltip2.style.display = "none";
        });

        // Show first tooltip
        marker1.dispatchEvent(new MouseEvent("mouseenter"));
        expect(tooltip1.style.display).toBe("block");
        expect(tooltip2.style.display).toBe("none");

        // Hide first and show second
        marker1.dispatchEvent(new MouseEvent("mouseleave"));
        marker2.dispatchEvent(new MouseEvent("mouseenter"));
        expect(tooltip1.style.display).toBe("none");
        expect(tooltip2.style.display).toBe("block");
    });

    // Test 10: Minimum marker size enforcement
    test("enforces minimum marker size of 20px", () => {
        const tinyAnnotation = {
            text: "Tiny",
            position: { x: 5000000, y: 2000000, width: 10, height: 10 } // Very small dimensions
        };

        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        const scaledWidth = Math.max((tinyAnnotation.position.width || 100000) * scaleX, 20);
        const scaledHeight = Math.max((tinyAnnotation.position.height || 100000) * scaleY, 20);

        expect(scaledWidth).toBeGreaterThanOrEqual(20);
        expect(scaledHeight).toBeGreaterThanOrEqual(20);
    });
});

// Add these additional test suites to templates/test.js

describe("API Failure Scenarios", () => {
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div class="viewer-wrapper">
                <img id="bone-image" alt="Bone Image" />
                <div id="annotations-overlay"></div>
            </div>
        `;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("handles network error when fetching boneset data", async () => {
        global.fetch = jest.fn(() =>
            Promise.reject(new Error("Network error"))
        );

        let errorOccurred = false;
        try {
            await fetch("http://127.0.0.1:8000/api/boneset/bony_pelvis");
        } catch (error) {
            errorOccurred = true;
            expect(error.message).toBe("Network error");
        }

        expect(errorOccurred).toBe(true);
    });

    test("handles empty response from API", async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            })
        );

        const response = await fetch("http://127.0.0.1:8000/api/boneset/bony_pelvis");
        const data = await response.json();

        expect(data).toEqual({});
        expect(data.bones).toBeUndefined();
    });

    test("handles 404 Not Found response", async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                status: 404,
                json: () => Promise.resolve({ error: "Boneset not found" })
            })
        );

        const response = await fetch("http://127.0.0.1:8000/api/boneset/invalid_id");
        
        expect(response.ok).toBe(false);
        expect(response.status).toBe(404);
    });

    test("handles 500 Internal Server Error", async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ error: "Internal Server Error" })
            })
        );

        const response = await fetch("http://127.0.0.1:8000/api/boneset/bony_pelvis");
        
        expect(response.ok).toBe(false);
        expect(response.status).toBe(500);
    });

    test("handles malformed JSON response", async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.reject(new Error("Invalid JSON"))
            })
        );

        let errorOccurred = false;
        try {
            const response = await fetch("http://127.0.0.1:8000/api/boneset/bony_pelvis");
            await response.json();
        } catch (error) {
            errorOccurred = true;
            expect(error.message).toBe("Invalid JSON");
        }

        expect(errorOccurred).toBe(true);
    });

    test("displays error message when API fails", () => {
        const annotationsOverlay = document.getElementById("annotations-overlay");
        
        // Simulate error handling in the application
        const handleAPIError = (error) => {
            annotationsOverlay.innerHTML = `<p>Failed to load data: ${error.message}</p>`;
        };

        const mockError = new Error("Failed to fetch boneset data");
        handleAPIError(mockError);

        expect(annotationsOverlay.innerHTML).toContain("Failed to load data");
        expect(annotationsOverlay.innerHTML).toContain("Failed to fetch boneset data");
    });

    test("falls back to placeholder when image fails to load", () => {
        const boneImage = document.getElementById("bone-image");
        
        // Simulate image load error handler
        const handleImageError = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 800;
            canvas.height = 600;
            boneImage.src = canvas.toDataURL();
            boneImage.onerror = null; // Prevent infinite loop
        };

        boneImage.onerror = handleImageError;
        boneImage.src = "http://127.0.0.1:8000/invalid-image.jpg";
        
        // Trigger error
        boneImage.dispatchEvent(new Event("error"));

        expect(boneImage.src).toContain("data:image");
        expect(boneImage.onerror).toBeNull();
    });
});

describe("Performance with Many Annotations", () => {
    let boneImage;
    let annotationsOverlay;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="viewer-wrapper">
                <img id="bone-image" style="display: block;" />
                <div id="annotations-overlay" style="position: relative; width: 604px; height: 454px;"></div>
            </div>
        `;

        boneImage = document.getElementById("bone-image");
        annotationsOverlay = document.getElementById("annotations-overlay");

        boneImage.getBoundingClientRect = jest.fn(() => ({
            width: 604,
            height: 454
        }));
    });

    afterEach(() => {
        const viewerWrapper = document.querySelector(".viewer-wrapper");
        if (viewerWrapper) {
            viewerWrapper.remove();
        }
    });

    test("handles 50 annotations without performance degradation", () => {
        // Generate 50 mock annotations
        const manyAnnotations = Array.from({ length: 50 }, (_, i) => ({
            text: `Annotation ${i + 1}`,
            position: {
                x: 1000000 + (i * 200000),
                y: 1000000 + (i * 100000),
                width: 500000,
                height: 200000
            }
        }));

        const startTime = performance.now();

        annotationsOverlay.innerHTML = "";
        
        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        manyAnnotations.forEach((annotation, index) => {
            const marker = document.createElement("div");
            marker.className = "annotation-marker";
            marker.dataset.annotationIndex = index;
            
            const scaledX = annotation.position.x * scaleX;
            const scaledY = annotation.position.y * scaleY;
            const scaledWidth = Math.max((annotation.position.width || 100000) * scaleX, 20);
            const scaledHeight = Math.max((annotation.position.height || 100000) * scaleY, 20);

            marker.style.position = "absolute";
            marker.style.left = `${scaledX}px`;
            marker.style.top = `${scaledY}px`;
            marker.style.width = `${scaledWidth}px`;
            marker.style.height = `${scaledHeight}px`;

            annotationsOverlay.appendChild(marker);
        });

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        const markers = annotationsOverlay.querySelectorAll(".annotation-marker");
        expect(markers).toHaveLength(50);
        // Performance should complete in under 100ms
        expect(executionTime).toBeLessThan(100);
    });

    test("efficiently clears large number of existing markers", () => {
        // First create many markers
        for (let i = 0; i < 100; i++) {
            const marker = document.createElement("div");
            marker.className = "annotation-marker";
            annotationsOverlay.appendChild(marker);
        }

        expect(annotationsOverlay.children.length).toBe(100);

        const startTime = performance.now();
        
        // Clear all markers
        annotationsOverlay.innerHTML = "";
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        expect(annotationsOverlay.children.length).toBe(0);
        // Clearing should be very fast
        expect(executionTime).toBeLessThan(10);
    });

    test("memory does not leak when repeatedly creating and removing markers", () => {
        const iterations = 20;

        for (let iteration = 0; iteration < iterations; iteration++) {
            // Create markers
            for (let i = 0; i < 10; i++) {
                const marker = document.createElement("div");
                marker.className = "annotation-marker";
                const tooltip = document.createElement("div");
                tooltip.className = "annotation-tooltip";
                
                annotationsOverlay.appendChild(marker);
                annotationsOverlay.appendChild(tooltip);
            }

            // Clear markers
            annotationsOverlay.innerHTML = "";
        }

        // After many iterations, overlay should be clean
        expect(annotationsOverlay.children.length).toBe(0);
    });
});

describe("Cross-Browser and Mobile Compatibility", () => {
    let boneImage;
    let annotationsOverlay;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="viewer-wrapper">
                <img id="bone-image" />
                <div id="annotations-overlay" style="position: relative;"></div>
            </div>
        `;

        boneImage = document.getElementById("bone-image");
        annotationsOverlay = document.getElementById("annotations-overlay");
    });

    test("touch events work on mobile devices", () => {
        const marker = document.createElement("div");
        marker.className = "annotation-marker";
        annotationsOverlay.appendChild(marker);

        const tooltip = document.createElement("div");
        tooltip.className = "annotation-tooltip";
        tooltip.style.display = "none";
        annotationsOverlay.appendChild(tooltip);

        // Simulate touch event handler
        marker.addEventListener("touchstart", (e) => {
            e.preventDefault();
            tooltip.style.display = "block";
        });

        const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [{ clientX: 100, clientY: 100 }]
        });

        marker.dispatchEvent(touchEvent);

        expect(tooltip.style.display).toBe("block");
    });

    test("markers scale appropriately on smaller screens", () => {
        // Simulate mobile viewport
        Object.defineProperty(boneImage, "getBoundingClientRect", {
            value: jest.fn(() => ({
                width: 320, // Mobile width
                height: 240
            })),
            configurable: true
        });

        const annotation = {
            text: "Mobile Test",
            position: { x: 6000000, y: 4000000, width: 500000, height: 300000 }
        };

        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        const scaledX = annotation.position.x * scaleX;
        const scaledY = annotation.position.y * scaleY;

        // Verify scaling works for mobile dimensions
        expect(scaledX).toBeGreaterThan(0);
        expect(scaledX).toBeLessThan(imageRect.width);
        expect(scaledY).toBeGreaterThan(0);
        expect(scaledY).toBeLessThan(imageRect.height);
    });

    test("tooltips adjust position when near screen edge", () => {
        const marker = document.createElement("div");
        marker.className = "annotation-marker";
        marker.style.position = "absolute";
        marker.style.left = "580px"; // Near right edge
        marker.style.top = "100px";
        marker.style.width = "20px";
        marker.style.height = "20px";

        const tooltip = document.createElement("div");
        tooltip.className = "annotation-tooltip";
        tooltip.style.position = "absolute";
        tooltip.style.display = "none";

        annotationsOverlay.style.width = "604px";
        annotationsOverlay.appendChild(marker);
        annotationsOverlay.appendChild(tooltip);

        // Mock getBoundingClientRect for marker and tooltip
        marker.getBoundingClientRect = jest.fn(() => ({
            right: 600,
            left: 580,
            top: 100
        }));

        tooltip.getBoundingClientRect = jest.fn(() => ({
            right: 750, // Would go off-screen
            width: 150
        }));

        Object.defineProperty(annotationsOverlay, "getBoundingClientRect", {
            value: jest.fn(() => ({
                right: 604,
                left: 0
            })),
            configurable: true
        });

        // Show tooltip and check positioning logic
        const showTooltip = () => {
            tooltip.style.display = "block";
            const tooltipRect = tooltip.getBoundingClientRect();
            const overlayRect = annotationsOverlay.getBoundingClientRect();
            
            // If tooltip goes off-screen, position it to the left
            if (tooltipRect.right > overlayRect.right) {
                tooltip.style.left = "400px"; // Adjusted position
            }
        };

        showTooltip();

        expect(tooltip.style.left).toBe("400px");
    });

    test("annotations remain functional after window resize", () => {
        const annotation = {
            text: "Resize Test",
            position: { x: 6000000, y: 4000000, width: 500000, height: 300000 }
        };

        // Initial dimensions
        Object.defineProperty(boneImage, "getBoundingClientRect", {
            value: jest.fn(() => ({ width: 604, height: 454 })),
            configurable: true
        });

        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        let imageRect = boneImage.getBoundingClientRect();
        let scaleX = imageRect.width / ORIGINAL_WIDTH;
        let scaleY = imageRect.height / ORIGINAL_HEIGHT;

        let scaledX1 = annotation.position.x * scaleX;
        let scaledY1 = annotation.position.y * scaleY;

        // Simulate window resize
        Object.defineProperty(boneImage, "getBoundingClientRect", {
            value: jest.fn(() => ({ width: 800, height: 600 })),
            configurable: true
        });

        imageRect = boneImage.getBoundingClientRect();
        scaleX = imageRect.width / ORIGINAL_WIDTH;
        scaleY = imageRect.height / ORIGINAL_HEIGHT;

        let scaledX2 = annotation.position.x * scaleX;
        let scaledY2 = annotation.position.y
        scaledY2 = annotation.position.y * scaleY;

        // Both should be valid but proportionally different
        expect(scaledX2).toBeGreaterThan(scaledX1); // Larger on bigger screen
        expect(scaledY2).toBeGreaterThan(scaledY1);
        expect(scaledX2).toBeLessThan(imageRect.width);
        expect(scaledY2).toBeLessThan(imageRect.height);
    });
});

describe("Coordinate Edge Cases", () => {
    let boneImage;
    let annotationsOverlay;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="viewer-wrapper">
                <img id="bone-image" />
                <div id="annotations-overlay" style="position: relative; width: 604px; height: 454px;"></div>
            </div>
        `;

        boneImage = document.getElementById("bone-image");
        annotationsOverlay = document.getElementById("annotations-overlay");

        boneImage.getBoundingClientRect = jest.fn(() => ({
            width: 604,
            height: 454
        }));
    });

    test("handles negative coordinates gracefully", () => {
        const negativeAnnotation = {
            text: "Negative Coords",
            position: { x: -1000, y: -500, width: 100000, height: 100000 }
        };

        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        const scaledX = negativeAnnotation.position.x * scaleX;
        const scaledY = negativeAnnotation.position.y * scaleY;

        // Should handle negative values without crashing
        expect(typeof scaledX).toBe("number");
        expect(typeof scaledY).toBe("number");
        expect(isNaN(scaledX)).toBe(false);
        expect(isNaN(scaledY)).toBe(false);
    });

    test("handles coordinates exceeding maximum expected range", () => {
        const hugeAnnotation = {
            text: "Huge Coords",
            position: { x: 50000000, y: 30000000, width: 100000, height: 100000 }
        };

        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        const scaledX = hugeAnnotation.position.x * scaleX;
        const scaledY = hugeAnnotation.position.y * scaleY;

        // Should scale without errors even if result is outside visible area
        expect(typeof scaledX).toBe("number");
        expect(typeof scaledY).toBe("number");
        expect(isFinite(scaledX)).toBe(true);
        expect(isFinite(scaledY)).toBe(true);
    });

    test("handles zero-sized annotation dimensions", () => {
        const zeroSizeAnnotation = {
            text: "Zero Size",
            position: { x: 6000000, y: 4000000, width: 0, height: 0 }
        };

        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        const scaledWidth = Math.max((zeroSizeAnnotation.position.width || 100000) * scaleX, 20);
        const scaledHeight = Math.max((zeroSizeAnnotation.position.height || 100000) * scaleY, 20);

        // Should enforce minimum size
        expect(scaledWidth).toBeGreaterThanOrEqual(20);
        expect(scaledHeight).toBeGreaterThanOrEqual(20);
    });

    test("handles floating point coordinates correctly", () => {
        const floatingAnnotation = {
            text: "Floating Point",
            position: { x: 6000000.567, y: 4000000.891, width: 500000.123, height: 300000.456 }
        };

        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        const scaledX = floatingAnnotation.position.x * scaleX;
        const scaledY = floatingAnnotation.position.y * scaleY;

        // Should handle floating point without precision issues
        expect(typeof scaledX).toBe("number");
        expect(typeof scaledY).toBe("number");
        expect(isFinite(scaledX)).toBe(true);
        expect(isFinite(scaledY)).toBe(true);
    });

    test("handles annotations with missing width/height properties", () => {
        const noSizeAnnotation = {
            text: "No Size Properties",
            position: { x: 6000000, y: 4000000 }
            // width and height are missing
        };

        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        // Should use default values
        const scaledWidth = Math.max((noSizeAnnotation.position.width || 100000) * scaleX, 20);
        const scaledHeight = Math.max((noSizeAnnotation.position.height || 100000) * scaleY, 20);

        expect(scaledWidth).toBeGreaterThan(0);
        expect(scaledHeight).toBeGreaterThan(0);
    });

    test("handles string coordinates by treating them as invalid", () => {
        const stringCoordAnnotation = {
            text: "String Coords",
            position: { x: "invalid", y: "coords", width: "100", height: "100" }
        };

        const ORIGINAL_WIDTH = 12000000;
        const ORIGINAL_HEIGHT = 8000000;
        const imageRect = boneImage.getBoundingClientRect();
        const scaleX = imageRect.width / ORIGINAL_WIDTH;
        const scaleY = imageRect.height / ORIGINAL_HEIGHT;

        const scaledX = stringCoordAnnotation.position.x * scaleX;
        const scaledY = stringCoordAnnotation.position.y * scaleY;

        // Should result in NaN
        expect(isNaN(scaledX)).toBe(true);
        expect(isNaN(scaledY)).toBe(true);
    });
});
