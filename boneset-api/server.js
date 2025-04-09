const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());

// Home route (fixes "Cannot GET /" issue)
app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Boneset API (GitHub-Integrated)" });
});

// GitHub raw URLs
const GITHUB_REPO = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/";
const BONESET_JSON_URL = `${GITHUB_REPO}boneset/bony_pelvis.json`;
const BONES_DIR_URL = `${GITHUB_REPO}bones/`;

// Fetch JSON helper function
async function fetchJSON(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error.message);
        return null;
    }
}

// Combined data endpoint
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

// Start server
app.listen(PORT, () => {
    console.log(` Server running on http://127.0.0.1:${PORT}`);
});
