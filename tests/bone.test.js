const { fetchJSON, displayBones } = require('../bones.js');

global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ bones: [{ id: '1', name: 'Bone 1', description: 'Description 1' }] }),
    })
);

beforeEach(() => {
    document.body.innerHTML = `
        <div id="editor-view">
            <button id="create-bone"></button>
            <button id="save-bone"></button>
            <button id="cancel-edit"></button>
            <div id="edit-mode" style="display: none;">
                <h2 id="edit-title"></h2>
                <form id="bone-form">
                    <input type="text" id="bone-id" name="bone-id">
                    <input type="text" id="bone-name" name="bone-name">
                    <textarea id="bone-description" name="bone-description"></textarea>
                    <input type="text" id="bone-image-path" name="bone-image-path">
                    <input type="text" id="bone-annotations" name="bone-annotations">
                </form>
            </div>
            <div id="bones-container"></div>
        </div>
    `;
});

describe('Bone Viewer Tests', () => {
    test('fetchJSON should fetch and return JSON data', async () => {
        const data = await fetchJSON('json/bones.json');
        expect(data).toHaveProperty('bones');
    });

    test('displayBones should populate bones container', () => {
        displayBones([{ id: '1', name: 'Bone 1', description: 'Description 1' }]);
        const container = document.getElementById('bones-container');
        expect(container.children.length).toBeGreaterThan(0);
    });
});
