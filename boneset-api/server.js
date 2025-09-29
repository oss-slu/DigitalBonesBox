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

// ---- Existing GitHub sources used only by /combined-data (unchanged for Pelvis) ----
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
const ALLOWED_BONESETS = new Set(["bony_pelvis", "skull"]);

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

// Tiny HTML escape
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[c]);
}

// ---- Load local final_* boneset JSON with a small cache ----
const bonesetCache = new Map();

async function loadBoneset(bonesetId) {
  if (bonesetCache.has(bonesetId)) return bonesetCache.get(bonesetId);
  const file = safeDataPath(`final_${bonesetId}.json`);
  const raw = await fs.readFile(file, "utf8");
  const parsed = JSON.parse(raw);
  bonesetCache.set(bonesetId, parsed);
  return parsed;
}

// Load any local final_* boneset JSON by id (e.g., "skull")
async function loadLocalBoneset(id) {
  const file = safeDataPath(`final_${id}.json`);
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
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

// ---- Routes ----

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to the Boneset API (GitHub-Integrated)" });
});

// Unchanged pelvis aggregation + add Skull from local final_skull.json
app.get("/combined-data", async (_req, res) => {
  try {
    const bonesets = [];
    const bones = [];
    const subbones = [];

    // --- Bony Pelvis (from GitHub) ---
    const pelvis = await fetchJSON(BONESET_JSON_URL);
    if (!pelvis) return res.status(500).json({ error: "Failed to load pelvis data" });
    bonesets.push({ id: pelvis.id, name: pelvis.name });

    for (const boneId of pelvis.bones) {
      const boneJsonUrl = `${BONES_DIR_URL}${boneId}.json`;
      const boneData = await fetchJSON(boneJsonUrl);
      if (boneData) {
        bones.push({ id: boneData.id, name: boneData.name, boneset: pelvis.id });
        (boneData.subBones || []).forEach((subBoneId) => {
          subbones.push({ id: subBoneId, name: subBoneId.replace(/_/g, " "), bone: boneData.id });
        });
      }
    }

    // --- Skull (from local final_skull.json) ---
    try {
      const skull = await loadBoneset("skull");
      bonesets.push({ id: skull.id, name: skull.name });
      for (const b of skull.bones || []) {
        bones.push({ id: b.id, name: b.name, boneset: skull.id });
        for (const sb of b.subbones || []) {
          subbones.push({ id: sb.id, name: sb.name, bone: b.id });
        }
      }
    } catch (e) {
      console.warn("Skull load failed:", e.message);
    }

    res.json({ bonesets, bones, subbones });
  } catch (error) {
    console.error("Error fetching combined data:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Serve description from the *selected* local merged JSON (supports pelvis & skull)
// Serve description from the local merged JSON (no SSRF)
app.get("/api/description", bonesetLimiter, async (req, res) => {
  const boneId = String(req.query.boneId || "");
  const bonesetId = String(req.query.bonesetId || "bony_pelvis");

  if (!/^[a-z0-9_]+$/.test(boneId) || !ALLOWED_BONESETS.has(bonesetId)) {
    return res.type("text/html").send("");
  }

  try {
    const set = await loadLocalBoneset(bonesetId); // <- IMPORTANT
    const node = findNodeById(set, boneId);
    if (!node) return res.type("text/html").send("");

    const name = node.name || boneId.replace(/_/g, " ");
    const lines = Array.isArray(node.description) ? node.description : [];

    let html = `<li><strong>${escapeHtml(name)}</strong></li>`;
    for (const line of lines) html += `<li>${escapeHtml(line)}</li>`;
    res.type("text/html").send(html);
  } catch (err) {
    console.error("description error:", err);
    res.type("text/html").send("<li>Description not available.</li>");
  }
});



// Safe path + allowlist + rate limit to fetch the full local JSON
app.get("/api/boneset/:bonesetId", bonesetLimiter, async (req, res) => {
  const { bonesetId } = req.params;

  if (!ALLOWED_BONESETS.has(bonesetId)) {
    return res.status(404).json({ error: `Boneset '${bonesetId}' not found` });
  }

  try {
    const filePath = safeDataPath(`final_${bonesetId}.json`);
    const raw = await fs.readFile(filePath, "utf8");
    res.type("application/json").send(raw);
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ error: `Boneset '${bonesetId}' not found` });
    }
    console.error("Error reading boneset file:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
});
