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
app.use("/images", express.static(path.join(__dirname, "public/images"))); // local static images (useful in dev)

// ---- GitHub sources (Pelvis + Skull) ----
const GITHUB_REPO = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/";
const BONESET_JSON_URL = `${GITHUB_REPO}boneset/bony_pelvis.json`;
const BONES_DIR_URL = `${GITHUB_REPO}bones/`;

// Skull is branch-aware so a single PR works now; flip SKULL_BRANCH to "data" later
const SKULL_BRANCH = process.env.SKULL_BRANCH || "issue127-skull-boneset";
const GITHUB_REPO_SKULL  = `https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/${SKULL_BRANCH}/DataSkull/`;
const SKULL_JSON_URL     = `${GITHUB_REPO_SKULL}boneset/skull.json`;

// ---- Local data dir (used for pelvis descriptions in dev) ----
const DATA_DIR = path.join(__dirname, "data");

// ---- Rate limiter for FS-backed endpoints ----
const bonesetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// ---- Allowlist for /api/boneset/:bonesetId ----
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

// Merged list for dropdowns (Pelvis from DataPelvis raw; Skull from branch-aware DataSkull raw)
app.get("/combined-data", async (_req, res) => {
  try {
    const [pelvis, skull] = await Promise.all([
      fetchJSON(BONESET_JSON_URL),  // DataPelvis/boneset/bony_pelvis.json
      fetchJSON(SKULL_JSON_URL),    // DataSkull/boneset/skull.json (branch-aware)
    ]);
    if (!pelvis || !skull) return res.status(500).json({ error: "Failed to load data" });

    const bonesets = [
      { id: pelvis.id, name: pelvis.name },
      { id: skull.id,  name: skull.name  },
    ];
    const bones = [];
    const subbones = [];

    // Pelvis: expand each bone file from DataPelvis/bones/
    for (const boneId of pelvis.bones) {
      const boneJsonUrl = `${BONES_DIR_URL}${boneId}.json`;
      const boneData = await fetchJSON(boneJsonUrl);
      if (boneData) {
        bones.push({ id: boneData.id, name: boneData.name, boneset: pelvis.id });
        (boneData.subBones || []).forEach(subId => {
          subbones.push({ id: subId, name: subId.replace(/_/g, " "), bone: boneData.id });
        });
      }
    }

    // Skull: bones & subbones already included in master skull.json
    for (const b of skull.bones || []) {
      bones.push({ id: b.id, name: b.name, boneset: skull.id });
      for (const sb of b.subbones || []) {
        subbones.push({ id: sb.id, name: sb.name, bone: b.id });
      }
    }

    res.json({ bonesets, bones, subbones });
  } catch (error) {
    console.error("Error fetching combined data:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Return description HTML (Skull from GitHub; Pelvis from local dev file)
app.get("/api/description", bonesetLimiter, async (req, res) => {
  const boneId = String(req.query.boneId || "");
  const bonesetId = String(req.query.bonesetId || "bony_pelvis");

  if (!/^[a-z0-9_]+$/.test(boneId) || !ALLOWED_BONESETS.has(bonesetId)) {
    return res.type("text/html").send("");
  }

  try {
    const set = bonesetId === "skull"
      ? await fetchJSON(SKULL_JSON_URL)      // GitHub (no local dependency)
      : await loadLocalBoneset(bonesetId);   // local file for pelvis in dev

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

// Dev helper: serve local merged JSONs (if present)
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
