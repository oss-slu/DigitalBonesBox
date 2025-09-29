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

// boneset-api/server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const fs = require("fs/promises");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());

const GITHUB_REPO = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/";
const BONESET_JSON_URL = `${GITHUB_REPO}boneset/bony_pelvis.json`;
const BONES_DIR_URL = `${GITHUB_REPO}bones/`;

// ---- Local data directory for merged files ----
const DATA_DIR = path.join(__dirname, "data");

// ---- Simple rate limiter for FS-backed endpoints ----
const bonesetLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,             // 60 requests / min / IP
    standardHeaders: true,
    legacyHeaders: false,
});

// ---- Only allow bonesets we ship locally right now ----
const ALLOWED_BONESETS = new Set(["bony_pelvis"]);

// ---- Helpers ----
async function fetchJSON(url) {
    try {
        const response = await axios.get(url, { timeout: 10_000 });
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error.message);
        return null;
    }
}

// Ensure any resolved path stays inside DATA_DIR
function safeDataPath(fileName) {
    const base = path.resolve(DATA_DIR);
    const candidate = path.resolve(DATA_DIR, fileName);
    if (!candidate.startsWith(base + path.sep)) {
        const err = new Error("Invalid path");
        err.code = "EINVAL";
        throw err;
    }
    return candidate;
}

function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
    })[c]);
}

// Cache the merged boneset for fast description lookups
let cachedBoneset = null;
async function loadBoneset() {
    if (cachedBoneset) return cachedBoneset;
    const file = safeDataPath("final_bony_pelvis.json");
    const raw = await fs.readFile(file, "utf8");
    cachedBoneset = JSON.parse(raw);
    return cachedBoneset;
}

function findNodeById(boneset, id) {
    if (!boneset) return null;
    for (const bone of boneset.bones || []) {
        if (bone.id === id) return bone;
        for (const sub of bone.subbones || []) {
            if (sub.id === id) return sub;
        }
    }
    return null;
}


app.get("/", (_req, res) => {
    res.json({ message: "Welcome to the Boneset API (GitHub-Integrated)" });
});

app.get("/combined-data", async (_req, res) => {
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
                (boneData.subBones || []).forEach((subBoneId) => {
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

app.get("/api/description/", async (req, res) => {
    const { boneId } = req.query;
    if (!boneId) {
        return res.send(" ");
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
        res.send("<li>Description not available.</li>");
    }
});

app.get("/api/search", async (req, res) => {
    const query = req.query.q;

    if (!query || query.trim() === "") {
        return res.send("<li>Enter a search term</li>");
    }

    const searchTerm = query.toLowerCase().trim();

    try {
        const bonesetData = await fetchJSON(BONESET_JSON_URL);
        if (!bonesetData) {
            return res.send("<li>No data available</li>");
        }

        const results = [];

        // Search boneset name
        if (bonesetData.name && bonesetData.name.toLowerCase().includes(searchTerm)) {
            results.push({
                type: "boneset",
                id: bonesetData.id,
                name: bonesetData.name
            });
        }

        // Search through bones
        if (bonesetData.bones) {
            for (const boneId of bonesetData.bones) {
                const boneData = await fetchJSON(`${BONES_DIR_URL}${boneId}.json`);

                if (boneData) {
                    // Search bone name
                    if (boneData.name && boneData.name.toLowerCase().includes(searchTerm)) {
                        results.push({
                            type: "bone",
                            id: boneData.id,
                            name: boneData.name
                        });
                    }

                    // Search sub-bones
                    if (boneData.subBones) {
                        for (const subBoneId of boneData.subBones) {
                            const subBoneName = subBoneId.replace(/_/g, " ");
                            if (subBoneName.toLowerCase().includes(searchTerm)) {
                                results.push({
                                    type: "subbone",
                                    id: subBoneId,
                                    name: subBoneName,
                                    parentBone: boneData.id
                                });
                            }
                        }
                    }
                }
            }
        }

        // Format results as HTML
        if (results.length === 0) {
            return res.send("<li>No results found</li>");
        }

        let html = "";
        results.forEach(result => {
            const escapedName = result.name.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
            html += `<li class="search-result" data-type="${result.type}" data-id="${result.id}">${escapedName} <small>(${result.type})</small></li>`;
        });

        res.send(html);

    } catch (error) {
        console.error("Search error:", error);
        res.status(500).send("<li>Search error occurred</li>");
    }
});

// Only one app.listen() at the very end
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
});