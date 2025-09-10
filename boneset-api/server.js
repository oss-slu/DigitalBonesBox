//const express = require("express");
//const axios = require("axios");
//const cors = require("cors");
//const path = require('path'); // Added for consistency, though not strictly needed for this version
//
//const app = express();
//const PORT = process.env.PORT || 8000;
//
//app.use(cors());
//
//// --- Original GitHub URLs ---
//const GITHUB_REPO = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/";
//const BONESET_JSON_URL = `${GITHUB_REPO}boneset/bony_pelvis.json`;
//const BONES_DIR_URL = `${GITHUB_REPO}bones/`;
//
//// Helper function to fetch JSON from GitHub
//async function fetchJSON(url) {
//    try {
//        const response = await axios.get(url);
//        return response.data;
//    } catch (error) {
//        console.error(`Failed to fetch ${url}:`, error.message);
//        return null;
//    }
//}
//
//// Home route (fixes "Cannot GET /" issue)
//app.get("/", (req, res) => {
//    res.json({ message: "Welcome to the Boneset API (GitHub-Integrated)" });
//});
//
//// --- Original Combined Data Endpoint ---
//// This endpoint still provides the main data for the dropdowns
//app.get("/combined-data", async (req, res) => {
//    try {
//        const bonesetData = await fetchJSON(BONESET_JSON_URL);
//        if (!bonesetData) return res.status(500).json({ error: "Failed to load boneset data" });
//
//        const bonesets = [{ id: bonesetData.id, name: bonesetData.name }];
//        const bones = [];
//        const subbones = [];
//
//        for (const boneId of bonesetData.bones) {
//            const boneJsonUrl = `${BONES_DIR_URL}${boneId}.json`;
//            const boneData = await fetchJSON(boneJsonUrl);
//
//            if (boneData) {
//                bones.push({ id: boneData.id, name: boneData.name, boneset: bonesetData.id });
//                boneData.subBones.forEach(subBoneId => {
//                    subbones.push({ id: subBoneId, name: subBoneId.replace(/_/g, " "), bone: boneData.id });
//                });
//            }
//        }
//
//        res.json({ bonesets, bones, subbones });
//
//    } catch (error) {
//        console.error("Error fetching combined data:", error.message);
//        res.status(500).json({ error: "Internal Server Error" });
//    }
//});
//
//// --- NEW HTMX ENDPOINT ---
//// This endpoint fetches a description and returns it as an HTML fragment
//app.get("/api/description/", async (req, res) => { // Path changed here
//    const { boneId } = req.query; // Changed from req.params to req.query
//    if (!boneId) {
//        return res.send(''); // Send empty response if no boneId is provided
//    }
//    const GITHUB_DESC_URL = `https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/descriptions/${boneId}_description.json`;
//
//    try {
//        const response = await axios.get(GITHUB_DESC_URL);
//        const descriptionData = response.data;
//
//        let html = `<li><strong>${descriptionData.name}</strong></li>`;
//        descriptionData.description.forEach(point => {
//            html += `<li>${point}</li>`;
//        });
//        res.send(html);
//
//    } catch (error) {
//        res.send('<li>Description not available.</li>');
//    }
//});


// Start server
//app.listen(PORT, () => {
//    console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
//});




const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());

const GITHUB_REPO = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/";
const BONESET_JSON_URL = `${GITHUB_REPO}boneset/bony_pelvis.json`;
const BONES_DIR_URL = `${GITHUB_REPO}bones/`;

async function fetchJSON(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error.message);
        return null;
    }
}

app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Boneset API (GitHub-Integrated)" });
});

app.get("/combined-data", async (req, res) => {
    try {
        const bonesetData = await fetchJSON(BONESET_JSON_URL);
        if (!bonesetData) return res.status(500).json({ error: "Failed to load boneset data" });

        const bonesets = [{ id: bonesetData.id, name: bonesetData.name }];
        const bones = [];
        const subbones = [];

        for (const boneId of bonesetData.bones) {
            const boneJsonUrl = `${BONES_DIR_URL}${boneId}.json`;
            const boneData = await fetchJSON(boneJsonUrl);

            if (boneData) {
                bones.push({ id: boneData.id, name: boneData.name, boneset: bonesetData.id });
                boneData.subBones.forEach(subBoneId => {
                    subbones.push({ id: subBoneId, name: subBoneId.replace(/_/g, " "), bone: boneData.id });
                });
            }
        }

        res.json({ bonesets, bones, subbones });

    } catch (error) {
        console.error("Error fetching combined data:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// --- CORRECTED HTMX ENDPOINT ---
app.get("/api/description/", async (req, res) => { // Path changed here (no :boneId)
    const { boneId } = req.query; // Changed from req.params to req.query
    if (!boneId) {
        return res.send(''); // Send empty response if no boneId is provided
    }
    const GITHUB_DESC_URL = `https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/descriptions/${boneId}_description.json`;

    try {
        const response = await axios.get(GITHUB_DESC_URL);
        const descriptionData = response.data;

        let html = `<li><strong>${descriptionData.name}</strong></li>`;
        descriptionData.description.forEach(point => {
            html += `<li>${point}</li>`;
        });
        res.send(html);

    } catch (error) {
        res.send('<li>Description not available.</li>');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
});