// boneset-api/server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const fs = require("fs").promises; // Use promises for async/await file reading
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const GITHUB_REPO = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/";
const BONESET_JSON_URL = `${GITHUB_REPO}boneset/bony_pelvis.json`;
const BONES_DIR_URL = `${GITHUB_REPO}bones/`;

// Rate limiter for search endpoint
const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

// Cache for search data
let searchCache = null;

// HTML escaping helper
function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
    })[c]);
}

// Input validation helper for boneId
function isValidBoneId(boneId) {
    // Ensure boneId is a string (not an array or other type)
    if (typeof boneId !== "string") {
        return false;
    }
    
    // Only allow alphanumeric characters and underscores
    // This prevents path traversal and URL injection attacks
    const validBoneIdPattern = /^[a-z0-9_]+$/i;
    return validBoneIdPattern.test(boneId) && boneId.length > 0 && boneId.length <= 100;
}

// GitHub JSON fetcher
async function fetchJSON(url) {
    try {
        const response = await axios.get(url, { timeout: 10_000 });
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error.message);
        return null;
    }
}

// Initialize search cache at startup
async function initializeSearchCache() {
    try {
        console.log("Initializing search cache...");
        const bonesetData = await fetchJSON(BONESET_JSON_URL);
        if (!bonesetData) {
            console.error("Failed to load boneset data for search cache");
            return;
        }

        const searchData = [];

        // Add boneset to search data
        searchData.push({
            id: bonesetData.id,
            name: bonesetData.name,
            type: "boneset",
            boneset: bonesetData.id,
            bone: null,
            subbone: null
        });

        // Load all bones and sub-bones
        for (const boneId of bonesetData.bones || []) {
            const boneData = await fetchJSON(`${BONES_DIR_URL}${boneId}.json`);
            if (boneData) {
                // Add bone to search data
                searchData.push({
                    id: boneData.id,
                    name: boneData.name,
                    type: "bone",
                    boneset: bonesetData.id,
                    bone: boneData.id,
                    subbone: null
                });

                // Add sub-bones to search data
                for (const subBoneId of boneData.subBones || []) {
                    const subBoneName = subBoneId.replace(/_/g, " ");
                    searchData.push({
                        id: subBoneId,
                        name: subBoneName,
                        type: "subbone",
                        boneset: bonesetData.id,
                        bone: boneData.id,
                        subbone: subBoneId
                    });
                }
            }
        }

        searchCache = searchData;
        console.log(`Search cache initialized with ${searchData.length} items`);
    } catch (error) {
        console.error("Error initializing search cache:", error);
    }
}

// Search function with ranking
function searchItems(query, limit = 20) {
    if (!searchCache) return [];
    
    const q = query.toLowerCase().trim();
    const results = [];
    
    // First pass: prefix matches (higher priority)
    for (const item of searchCache) {
        if (item.name.toLowerCase().startsWith(q)) {
            results.push({ ...item, priority: 1 });
        }
    }
    
    // Second pass: substring matches (lower priority)
    for (const item of searchCache) {
        if (!item.name.toLowerCase().startsWith(q) && item.name.toLowerCase().includes(q)) {
            results.push({ ...item, priority: 2 });
        }
    }
    
    // Sort by priority, then by name
    results.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.name.localeCompare(b.name);
    });
    
    return results.slice(0, limit);
}

// Routes
app.get("/", (_req, res) => {
    res.json({ message: "Welcome to the Boneset API" });
});

app.get("/combined-data", async (_req, res) => {
    try {
        const bonesetData = await fetchJSON(BONESET_JSON_URL);
        if (!bonesetData) {
            return res.status(500).json({ error: "Failed to load boneset data" });
        }

        const bonesets = [{ id: bonesetData.id, name: bonesetData.name }];
        const bones = [];
        const subbones = [];

        for (const boneId of bonesetData.bones || []) {
            const boneData = await fetchJSON(`${BONES_DIR_URL}${boneId}.json`);
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
    
    // Validate boneId to prevent SSRF attacks
    if (!isValidBoneId(boneId)) {
        return res.send("<li>Invalid bone ID.</li>");
    }
    
    const GITHUB_DESC_URL = `https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/descriptions/${boneId}_description.json`;

    try {
        const response = await axios.get(GITHUB_DESC_URL);
        const descriptionData = response.data;

        let html = `<li><strong>${escapeHtml(descriptionData.name)}</strong></li>`;
        descriptionData.description.forEach(point => {
            html += `<li>${escapeHtml(point)}</li>`;
        });
        res.send(html);
    } catch (error) {
        res.send("<li>Description not available.</li>");
    }
});

// New endpoint: Get bone data with images
app.get("/api/bone-data/", async (req, res) => {
    const { boneId } = req.query;
    
    // Validate boneId parameter
    if (!boneId) {
        return res.status(400).json({ 
            error: "Bad Request", 
            message: "boneId query parameter is required" 
        });
    }
    
    // Validate boneId format to prevent SSRF attacks
    if (!isValidBoneId(boneId)) {
        return res.status(400).json({ 
            error: "Bad Request", 
            message: "Invalid boneId format. Only alphanumeric characters and underscores are allowed." 
        });
    }
    
    // Build GitHub URL for the description JSON
    const GITHUB_DESC_URL = `https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/descriptions/${boneId}_description.json`;
    const GITHUB_IMAGES_BASE_URL = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/images/";

    try {
        // Fetch the description JSON from GitHub
        const response = await axios.get(GITHUB_DESC_URL, { timeout: 10000 });
        const descriptionData = response.data;

        // Extract the images array from the JSON
        const imagesArray = descriptionData.images || [];
        
        // Build image objects with filename and full URL
        const images = imagesArray.map(filename => ({
            filename: filename,
            url: `${GITHUB_IMAGES_BASE_URL}${filename}`
        }));

        // Return the complete bone data as JSON
        res.json({
            name: descriptionData.name,
            id: descriptionData.id,
            description: descriptionData.description,
            images: images
        });

    } catch (error) {
        // Handle 404 - bone not found
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ 
                error: "Not Found", 
                message: `Bone with id '${boneId}' not found` 
            });
        }
        
        // Handle other server errors
        console.error("Error fetching bone data for '%s': %s", boneId, error.message);
        res.status(500).json({ 
            error: "Internal Server Error", 
            message: "Failed to fetch bone data" 
        });
    }
});

// 🌟 FINALIZED ENDPOINT: Annotation Data (Fetches & Combines Scaling Data) 🌟
app.get("/api/annotations/:boneId", searchLimiter, async (req, res) => {
    const { boneId } = req.params;

    // 1. Validation
    if (!isValidBoneId(boneId)) {
        return res.status(400).json({ 
            error: "Bad Request", 
            message: "Invalid boneId format." 
        });
    }

    // --- TEMPORARY WORKAROUND (Step 2a) ---
    // Try to serve the file from the local 'temp_annotations' folder first.
    let annotationFilename = "slide02_bony_pelvis.json"; // <--- MODIFIED TO HARDCODE FILENAME
    const localAnnotationPath = path.join(__dirname, "temp_annotations", annotationFilename);

    try {
        const localAnnotationData = await fs.readFile(localAnnotationPath, "utf8");
        
        // If the file is found and read successfully, we must still fetch the template
        // data from GitHub because it contains the required rotation/scaling information!
        
        // 2b. Define Template Filename and URL (Same as original logic)
        let templateFilename = "template_bony_pelvis.json"; 
        const GITHUB_TEMPLATE_URL = `${GITHUB_REPO}annotations/rotations%20annotations/${templateFilename}`;
        
        const templateResponse = await axios.get(GITHUB_TEMPLATE_URL, { timeout: 10000 });
        const templateData = templateResponse.data;
        const annotationData = JSON.parse(localAnnotationData); // Parse the local file

        // 2c. Combine required data for the frontend (Same as original logic)
        const combinedData = {
            annotations: annotationData.text_annotations || [],
            normalized_geometry: templateData.normalized_geometry
                ? templateData.normalized_geometry.right 
                : { normX: 0, normY: 0, normW: 1, normH: 1 } 
        };

        console.log(`WORKAROUND: Serving local annotation file ${annotationFilename} combined with GitHub template.`);
        return res.json(combinedData); // Success! Return local annotations + remote template
        
    } catch (error) {
        // If fs.readFile fails (E.g., file not found, which is expected for other bones)
        // Log the local file failure but continue to the original GitHub logic.
        if (error.code !== "ENOENT") {
             console.warn(`Local file read failed unexpectedly for ${localAnnotationPath}:`, error.message);
        }
    }
    // --- END TEMPORARY WORKAROUND ---


    // 3. Define File Paths for GitHub (Original Logic)
    if (boneId === "bony_pelvis") {
        annotationFilename = "slide02_bony_pelvis.json";
        templateFilename = "template_bony_pelvis.json";
    } else {
        // Handle other bonesets/bones if they need annotations
        return res.status(404).json({ 
            error: "Not Found", 
            message: `Annotation data not available for boneId: ${boneId}` 
        });
    }

    const GITHUB_ANNOTATION_URL = `${GITHUB_REPO}annotations/text_label_annotations/${annotationFilename}`;
    const GITHUB_TEMPLATE_URL = `${GITHUB_REPO}annotations/rotations%20annotations/${templateFilename}`;

    try {
        // 4. Fetch Annotation Data and Template Data concurrently from GitHub
        const [annotationResponse, templateResponse] = await Promise.all([
            axios.get(GITHUB_ANNOTATION_URL, { timeout: 10000 }),
            axios.get(GITHUB_TEMPLATE_URL, { timeout: 10000 })
        ]);

        const annotationData = annotationResponse.data;
        const templateData = templateResponse.data;

        // 5. Combine required data for the frontend
        const combinedData = {
            annotations: annotationData.text_annotations || [],
            normalized_geometry: templateData.normalized_geometry
                ? templateData.normalized_geometry.right 
                : { normX: 0, normY: 0, normW: 1, normH: 1 }
        };
        
        // 6. Send the combined response
        res.json(combinedData);

    } catch (error) {
        // Handle 404 or other fetch errors
        let message = `Failed to fetch resources for boneId: ${boneId}`;
        let status = 500;
        
        if (error.response) {
             status = error.response.status;
             message = `GitHub fetch error (Status ${status}): Could not find ${error.config.url.split("/").pop()}`;
        }
        
        console.error("Error fetching annotation/template data:", error.message);
        res.status(status).json({ 
            error: error.response?.statusText || "Internal Server Error", 
            message: message 
        });
    }
});
// 🌟 END FINALIZED ENDPOINT 🌟

// Search endpoint
app.get("/api/search", searchLimiter, (req, res) => {
    const query = req.query.q;
    
    console.log("Search request received for:", query);

    // Handle empty or too short queries
    if (!query || query.trim().length < 2) {
        return res.send("<li class='search-placeholder'>Enter at least 2 characters to search</li>");
    }

    const searchTerm = query.trim();
    
    try {
        if (!searchCache) {
            return res.send("<li class='search-error'>Search not available - cache not initialized</li>");
        }

        const results = searchItems(searchTerm, 20);
        console.log(`Found ${results.length} results for "${searchTerm}"`);

        if (results.length === 0) {
            return res.send("<li class='search-no-results'>No results found</li>");
        }

        let html = "";
        for (const result of results) {
            const escapedName = escapeHtml(result.name);
            const escapedType = escapeHtml(result.type);
            
            html += `<li class="search-result" 
                        data-type="${escapedType}" 
                        data-id="${escapeHtml(result.id)}"
                        data-boneset="${escapeHtml(result.boneset || "")}"
                        data-bone="${escapeHtml(result.bone || "")}"
                        data-subbone="${escapeHtml(result.subbone || "")}"
                        tabindex="0"
                        role="option">
                        ${escapedName} <small>(${escapedType})</small>
                     </li>`;
        }

        res.send(html);
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).send("<li class='search-error'>Search error occurred</li>");
    }
});

// Initialize search cache on startup
initializeSearchCache();

//CODE CHANGE -> Make express app testable, lets the tests import app without starting
// a real server
if (require.main == module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
  });
}

module.exports = {
  app,
  escapeHtml,
  searchItems,
  initializeSearchCache,
};