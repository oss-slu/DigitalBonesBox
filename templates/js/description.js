// templates/js/description.js
const API_BASE = "http://127.0.0.1:8000";

export async function loadDescription(bonesetId, id) {
  const container = document.getElementById("description-Container");
  if (!container) return;

  container.innerHTML = "";
  if (!id) return;

  const bs = (bonesetId || "bony_pelvis").trim();

  try {
    const res = await fetch(
      `${API_BASE}/api/description?bonesetId=${encodeURIComponent(bs)}&boneId=${encodeURIComponent(id)}`,
      { headers: { Accept: "text/html" } }
    );
    const html = await res.text();
    container.innerHTML = html || "<li>No description.</li>";
  } catch (err) {
    container.innerHTML = "<li>Error loading description.</li>";
    console.error("Failed to fetch description:", err);
  }
}
