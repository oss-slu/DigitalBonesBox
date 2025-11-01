// api.js - Centralized API configuration and data fetching

// Centralized API configuration
const API_CONFIG = {
    BASE_URL: "http://127.0.0.1:8000",
    ENDPOINTS: {
        COMBINED_DATA: "/combined-data",
        MOCK_BONE_DATA: "./js/mock-bone-data.json"
    }
};

export async function fetchCombinedData() {
    const API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COMBINED_DATA}`;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching combined data:", error);
        throw error;
    }
}

export async function fetchMockBoneData() {
    try {
        const response = await fetch(API_CONFIG.ENDPOINTS.MOCK_BONE_DATA);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching mock bone data:", error);
        return null;
    }
}

/**
 * Fetch full bone data (description + images) for a single bone from the backend API.
 * The backend pulls these files from the DataPelvis GitHub branch.
 * @param {string} boneId
 * @returns {Object|null} bone data or null on error
 */
export async function fetchBoneData(boneId) {
    if (!boneId) return null;

    const url = `${API_CONFIG.BASE_URL}/api/bone-data/?boneId=${encodeURIComponent(boneId)}`;
    try {
        const resp = await fetch(url);
        if (!resp.ok) {
            throw new Error(`HTTP error! status: ${resp.status}`);
        }
        return await resp.json();
    } catch (err) {
        console.error(`Error fetching bone data for ${boneId}:`, err);
        return null;
    }
}

// Export configuration for other modules to use
export { API_CONFIG };
