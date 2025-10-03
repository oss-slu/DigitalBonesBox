// api.js — Centralized client API config + fetchers (front-end)

// Base URL: allow main.js to set window.API; otherwise fall back sensibly.
const BASE_URL = (typeof window !== "undefined" && window.API)
  ? window.API
  : (location.port === "8000" ? "" : "http://127.0.0.1:8000");

export const API_CONFIG = {
  BASE_URL,
  ENDPOINTS: {
    COMBINED_DATA: "/combined-data",
    // Mock viewer data stays local to the UI bundle (not the server):
    MOCK_BONE_DATA: "./js/mock-bone-data.json",
  },
};

export async function fetchCombinedData() {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COMBINED_DATA}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`combined-data failed: ${res.status}`);
  return res.json();
}

export async function fetchMockBoneData() {
  try {
    const res = await fetch(API_CONFIG.ENDPOINTS.MOCK_BONE_DATA, { cache: "no-store" });
    if (!res.ok) throw new Error(`mock data failed: ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn("mock-bone-data.json not found/failed; continuing without it");
    return null;
  }
}
