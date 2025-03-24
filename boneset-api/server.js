const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS to allow requests from frontend applications
app.use(cors());

// GitHub raw URLs for JSON files
const GITHUB_REPO = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/";
const BONESET_JSON_URL = `${GITHUB_REPO}boneset/bony_pelvis.json`;
const BONES_DIR_URL = `${GITHUB_REPO}bones/`; // Directory for individual bone JSON files

// Helper function to fetch JSON from GitHub
async function fetchJSON(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch data from ${url}`);
    }
}

// Home route
app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Boneset API (GitHub-Integrated)" });
});

// Fetch bony pelvis (boneset) details
app.get("/boneset", async (req, res) => {
    try {
        const bonesetData = await fetchJSON(BONESET_JSON_URL);
        res.json(bonesetData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch a specific bone's details
app.get("/bones/:bone_id", async (req, res) => {
    const boneId = req.params.bone_id;
    const boneJsonUrl = `${BONES_DIR_URL}${boneId}.json`;

    try {
        const boneData = await fetchJSON(boneJsonUrl);
        res.json(boneData);
    } catch (error) {
        res.status(404).json({ error: `Bone '${boneId}' not found` });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
});
