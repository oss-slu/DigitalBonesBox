// Tests for moving between the bone viewer and migrated scenes in one session.
// Issue #469 (parent #463).
jest.mock("../js/description.js", () => ({
    loadDescription: jest.fn(),
}));
jest.mock("../js/imageDisplay.js", () => ({
    displayBoneImages: jest.fn(),
    showPlaceholder: jest.fn(),
}));
jest.mock("../js/annotationOverlay.js", () => ({
    clearAnnotations: jest.fn(),
}));
jest.mock("../js/api.js", () => ({
    fetchBoneData: jest.fn(),
}));

const fs = require("fs");
const path = require("path");

const pageHtml = fs.readFileSync(path.join(__dirname, "..", "boneset.html"), "utf8");
const bodyHtml = pageHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, "");

const combinedData = {
    bonesets: [
        { id: "bony_pelvis", name: "Bony Pelvis" },
        { id: "skull", name: "Skull" },
    ],
    bones: [
        { id: "ilium", name: "Ilium", boneset: "bony_pelvis" },
        { id: "ischium", name: "Ischium", boneset: "bony_pelvis" },
        { id: "anterior", name: "Anterior", boneset: "skull" },
    ],
    subbones: [{ id: "iliac_crest", name: "iliac crest", bone: "ilium" }],
};

// A scene made from Ilium and Iliac crest. Nothing has been migrated from Ischium.
const scene = {
    id: "scene-1",
    name: "Ilium Study",
    images: [
        { id: "img-1", src: "/api/images/ilium_image1.jpg", x: 0, y: 0, width: 100, height: 120,
            source: { type: "legacy-image", boneId: "ilium", filename: "ilium_image1.jpg" } },
        { id: "img-2", src: "/api/images/ilium_image2.jpg", x: 140, y: 0, width: 100, height: 120,
            source: { type: "legacy-image", boneId: "iliac_crest", filename: "ilium_image2.jpg" } },
    ],
    annotations: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
};
const summary = {
    id: scene.id, name: scene.name, imageCount: 2, annotationCount: 0,
    sources: ["ilium", "iliac_crest"], createdAt: scene.createdAt, updatedAt: scene.updatedAt,
};

let scenesStatus;
const respond = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
async function fakeFetch(url) {
    if (url === "/api/scenes") {
        return scenesStatus === 200 ? respond(200, { scenes: [summary] }) : respond(scenesStatus, { error: "Down" });
    }
    if (url === `/api/scenes/${scene.id}`) return respond(200, JSON.parse(JSON.stringify(scene)));
    return respond(404, { error: "Not found" });
}

// Bone data the viewer gets for each item. The Skull items have no content yet.
function fakeBoneData(boneId) {
    if (boneId === "skull" || boneId === "anterior") return Promise.resolve(null);
    return Promise.resolve({ images: [{ url: `${boneId}.jpg` }] });
}

async function waitFor(check, timeout = 1000) {
    const start = Date.now();
    for (;;) {
        try {
            check();
            return;
        } catch (error) {
            if (Date.now() - start > timeout) throw error;
            await new Promise((r) => setTimeout(r, 5));
        }
    }
}

const $ = (id) => document.getElementById(id);
const settle = () => new Promise((r) => setTimeout(r, 20));
function choose(id, value) {
    $(id).value = value;
    $(id).dispatchEvent(new Event("change"));
}
const linkTexts = () => [...document.querySelectorAll(".viewer-scene-link")].map((b) => b.textContent);

let api;
let imageDisplay;

beforeEach(() => {
    document.body.innerHTML = bodyHtml;
    scenesStatus = 200;
    global.fetch = jest.fn(fakeFetch);
    jest.resetModules();

    api = require("../js/api.js");
    api.fetchBoneData.mockImplementation(fakeBoneData);
    imageDisplay = require("../js/imageDisplay.js");
    // Same markup as the real placeholder, so the "no images" message can be checked.
    imageDisplay.showPlaceholder.mockImplementation(() => {
        document.getElementById("bone-image-container").innerHTML =
            "<div class=\"images-placeholder\"><p>Please select a bone from the dropdown to view its image.</p></div>";
    });
    const dropdowns = require("../js/dropdowns.js");
    const scenes = require("../js/scenes.js");

    dropdowns.populateBonesetDropdown(combinedData.bonesets);
    dropdowns.setupDropdownListeners(combinedData);
    scenes.initializeSceneEditor();
});

afterEach(async () => {
    // Let any requests still running finish before the next test starts.
    await settle();
});

describe("Bone viewer links to migrated scenes - Issue 469", () => {
    it("shows a link for a migrated item and nothing for an item that isn't migrated", async () => {
        choose("boneset-select", "bony_pelvis");
        choose("bone-select", "ilium");
        await waitFor(() => expect($("viewer-scene-links").hidden).toBe(false));
        expect(linkTexts()).toEqual(["Open \"Ilium Study\" in the Scene Editor"]);

        choose("bone-select", "ischium");
        await settle();
        expect($("viewer-scene-links").hidden).toBe(true);
        expect(linkTexts()).toEqual([]);
        // The non-migrated item still shows its normal viewer content.
        expect(imageDisplay.displayBoneImages).toHaveBeenLastCalledWith(
            [{ url: "ischium.jpg" }], expect.objectContaining({ boneId: "ischium" }));
    });

    it("opens the scene in the Scene Editor from the link", async () => {
        choose("boneset-select", "bony_pelvis");
        choose("bone-select", "ilium");
        await waitFor(() => expect(linkTexts()).toHaveLength(1));

        document.querySelector(".viewer-scene-link").click();

        await waitFor(() => expect($("scene-title").textContent).toBe("Ilium Study"));
        expect($("scene-editor-view").hidden).toBe(false);
        expect($("editor-view").hidden).toBe(true);
    });

    it("still shows the viewer content when scenes can't be loaded", async () => {
        scenesStatus = 503;
        choose("boneset-select", "bony_pelvis");
        choose("bone-select", "ilium");
        await settle();

        expect($("viewer-scene-links").hidden).toBe(true);
        expect(imageDisplay.displayBoneImages).toHaveBeenLastCalledWith(
            [{ url: "ilium.jpg" }], expect.objectContaining({ boneId: "ilium" }));
    });
});

describe("Scene Editor links back to the bone viewer - Issue 469", () => {
    async function openSceneInEditor() {
        $("text-button-SceneEditor").click();
        await waitFor(() => expect(document.querySelectorAll(".scene-list-item").length).toBe(1));
        document.querySelector(".scene-list-item").click();
        await waitFor(() => expect($("scene-title").textContent).toBe("Ilium Study"));
    }

    it("lists the viewer items the scene was made from", async () => {
        await openSceneInEditor();
        expect($("scene-sources").hidden).toBe(false);
        const buttons = [...document.querySelectorAll(".scene-source-link")].map((b) => b.textContent);
        expect(buttons).toEqual(["Ilium", "Iliac crest"]);
    });

    it("goes back to the bone viewer and opens the item the scene came from", async () => {
        await openSceneInEditor();
        const iliacCrest = [...document.querySelectorAll(".scene-source-link")].find((b) => b.textContent === "Iliac crest");
        iliacCrest.click();

        expect($("editor-view").hidden).toBe(false);
        expect($("scene-editor-view").hidden).toBe(true);
        expect($("boneset-select").value).toBe("bony_pelvis");
        expect($("bone-select").value).toBe("ilium");
        expect($("subbone-select").value).toBe("iliac_crest");
        await waitFor(() => expect(imageDisplay.displayBoneImages).toHaveBeenLastCalledWith(
            [{ url: "iliac_crest.jpg" }], expect.objectContaining({ boneId: "iliac_crest" })));
        // And the viewer links back to the scene from there.
        await waitFor(() => expect(linkTexts()).toEqual(["Open \"Ilium Study\" in the Scene Editor"]));
    });

    it("moves between migrated and non-migrated items in one session", async () => {
        await openSceneInEditor();
        [...document.querySelectorAll(".scene-source-link")].find((b) => b.textContent === "Ilium").click();
        await waitFor(() => expect(linkTexts()).toHaveLength(1));

        // A non-migrated item
        choose("bone-select", "ischium");
        await settle();
        expect(linkTexts()).toEqual([]);
        expect(imageDisplay.displayBoneImages).toHaveBeenLastCalledWith(
            [{ url: "ischium.jpg" }], expect.objectContaining({ boneId: "ischium" }));

        // Back to the scene from the migrated item
        choose("bone-select", "ilium");
        await waitFor(() => expect(linkTexts()).toHaveLength(1));
        document.querySelector(".viewer-scene-link").click();
        await waitFor(() => expect($("scene-editor-view").hidden).toBe(false));
        expect($("scene-title").textContent).toBe("Ilium Study");
    });
});

describe("No broken or empty content - Issue 469", () => {
    it("says an item has no images yet instead of asking the user to pick a bone", async () => {
        choose("boneset-select", "skull");
        await settle();
        const message = document.querySelector("#bone-image-container .images-placeholder p").textContent;
        expect(message).toMatch(/no images for this item yet/i);
        expect(imageDisplay.displayBoneImages).not.toHaveBeenCalled();
    });

    it("still asks the user to pick a bone when nothing is selected", async () => {
        choose("boneset-select", "bony_pelvis");
        choose("boneset-select", "");
        await settle();
        const message = document.querySelector("#bone-image-container .images-placeholder p").textContent;
        expect(message).toMatch(/please select a bone/i);
    });

    it("doesn't let a slow answer for an earlier item replace the current one", async () => {
        api.fetchBoneData.mockImplementation((boneId) => (boneId === "ilium"
            ? new Promise((r) => setTimeout(() => r({ images: [{ url: "ilium.jpg" }] }), 50))
            : fakeBoneData(boneId)));

        choose("boneset-select", "bony_pelvis");
        choose("bone-select", "ilium");
        choose("bone-select", "ischium");
        await new Promise((r) => setTimeout(r, 100));

        const shown = imageDisplay.displayBoneImages.mock.calls.map(([images]) => images[0].url);
        expect(shown).toEqual(["ischium.jpg"]);
    });
});
