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

// Serve colored regions JSON files
const coloredRegionsPath = path.join(__dirname, "../data_extraction/annotations/color_regions");
app.use("/colored-regions", express.static(coloredRegionsPath));

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

    // Define the view/rotation to select from the template geometry
    // This assumes all current bone views use the 'right' view coordinates for scaling.
    const geometryView = "right"; 

    // Construct GitHub URLs for annotation data and template
    const annotationFilename = `${boneId}_text_annotations.json`;
    const GITHUB_ANNOTATION_URL = `${GITHUB_REPO}annotations/text_label_annotations/${annotationFilename}`;
    const templateFilename = "template_bony_pelvis.json";
    const GITHUB_TEMPLATE_URL = `${GITHUB_REPO}annotations/rotations%20annotations/${templateFilename}`;

    try {
        // Fetch annotation data from GitHub
        const annotationData = await fetchJSON(GITHUB_ANNOTATION_URL);
        if (!annotationData) {
            return res.status(404).json({ 
                error: "Not Found", 
                message: `Annotation data not available for boneId: ${boneId}` 
            });
        }
        
        // Fetch the rotation/scaling template data from GitHub
        const templateData = await fetchJSON(GITHUB_TEMPLATE_URL);
        if (!templateData) {
            return res.status(404).json({ 
                error: "Not Found", 
                message: `Template data not found: ${templateFilename}` 
            });
        }

        // Define Full Slide Dimensions for Normalization
        // Use standard PPT slide dimensions if 'full_slide_dimensions' is missing from the template.
        const fullDimensions = templateData.full_slide_dimensions || { 
            width: 9144000, 
            height: 5143500 
        };
        const slideWidth = fullDimensions.width;
        const slideHeight = fullDimensions.height;
        
        // Combine required data for the frontend
        let normalizedGeometry = templateData.normalized_geometry
            ? templateData.normalized_geometry[geometryView] 
            : { normX: 0, normY: 0, normW: 1, normH: 1 }; 
        
        // *** ALIGNMENT WORKAROUND (Leave this in) ***
        if (boneId === "bony_pelvis" && normalizedGeometry) {
            normalizedGeometry.normX = normalizedGeometry.normX + 0.001; 
            console.log("ALIGNMENT WORKAROUND APPLIED: Bony Pelvis normX shifted by +0.001");
        }
        // *** END ALIGNMENT WORKAROUND ***
        
        // Normalize Text Annotation Coordinates
        const normalizedAnnotations = (annotationData.text_annotations || []).map(annotation => {
            if (annotation.text_box && slideWidth && slideHeight) {
                // Normalize all coordinate values for the bounding box
                annotation.text_box.x = annotation.text_box.x / slideWidth;
                annotation.text_box.y = annotation.text_box.y / slideHeight;
                annotation.text_box.width = annotation.text_box.width / slideWidth;
                annotation.text_box.height = annotation.text_box.height / slideHeight;

                // Normalize pointer lines (start and end points)
                (annotation.pointer_lines || []).forEach(line => {
                    if (line.start_point) {
                        line.start_point.x = line.start_point.x / slideWidth;
                        line.start_point.y = line.start_point.y / slideHeight;
                    }
                    if (line.end_point) {
                        line.end_point.x = line.end_point.x / slideWidth;
                        line.end_point.y = line.end_point.y / slideHeight;
                    }
                });
                
                // Note: Other coordinates like target_regions might also need normalization 
                // depending on your frontend implementation, but we start with text_box and pointer_lines.
            }
            return annotation;
        });

        const combinedData = {
            annotations: normalizedAnnotations,
            normalized_geometry: normalizedGeometry
        };

        console.log(`SUCCESS: Serving annotation data for ${boneId} from GitHub combined with template (Coordinates Normalized).`);
        return res.json(combinedData);
        
    } catch (error) {
        console.error("Error fetching annotation/template data:", error.message);
        res.status(500).json({ 
            error: "Internal Server Error", 
            message: `Failed to fetch annotation data for boneId: ${boneId}` 
        });
    }
});
//  END FINALIZED ENDPOINT 

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

//  CORRECTED SERVER STARTUP LOGIC 
// 1. Initialize cache first. 2. Start server only if run directly (for testability).
async function startServer() {
    await initializeSearchCache(); // Wait for the cache to be built
    
    // Start the server only if this file is run directly (not imported)
    if (require.main == module) {
      app.listen(PORT, () => {
        console.log(`Server running on http://127.0.0.1:${PORT}`);
      });
    }
}

startServer(); // Call the async function to begin startup

// Export for tests or other modules if needed
module.exports = {
  app,
  escapeHtml,
  searchItems,
  initializeSearchCache,
};