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

// --- EXISTING HTMX ENDPOINT (returns HTML) ---
app.get("/api/description/", async (req, res) => {
    const { boneId } = req.query;
    if (!boneId) {
        return res.send('');
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

// --- NEW JSON ENDPOINT (returns JSON with description AND images) ---
app.get("/api/bone-data/", async (req, res) => {
    // Get the boneId from query parameters
    const { boneId } = req.query;
    
    // Validate that boneId was provided
    if (!boneId) {
        return res.status(400).json({ 
            error: "Bad Request", 
            message: "boneId query parameter is required" 
        });
    }
    
    // Build the GitHub URL to fetch the description JSON
    const GITHUB_DESC_URL = `https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/descriptions/${boneId}_description.json`;
    
    try {
        // Fetch the description JSON from GitHub with 10 second timeout
        const response = await axios.get(GITHUB_DESC_URL, { timeout: 10000 });
        const descriptionData = response.data;
        
        // Extract the images array from the JSON (default to empty array if not present)
        const imageFilenames = descriptionData.images || [];
        
        // Build full GitHub URLs for each image
        const images = imageFilenames.map(filename => ({
            filename: filename,
            url: `https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/images/${filename}`
        }));
        
        // Return the complete bone data as JSON
        res.json({
            name: descriptionData.name,
            id: descriptionData.id,
            description: descriptionData.description,
            images: images
        });
        
    } catch (error) {
        // Handle specific error cases
        if (error.response && error.response.status === 404) {
            // Bone not found
            return res.status(404).json({ 
                error: "Not Found", 
                message: `Bone with id '${boneId}' not found` 
            });
        }
        
        // General server error
        console.error(`Error fetching bone data for ${boneId}:`, error.message);
        res.status(500).json({ 
            error: "Internal Server Error", 
            message: "Failed to fetch bone data" 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
});
