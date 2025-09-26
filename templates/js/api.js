// api.js - Centralized API configuration and data fetching

// Centralized API configuration
const API_CONFIG = {
    BASE_URL: "http://127.0.0.1:8000",
    ENDPOINTS: {
        COMBINED_DATA: "/combined-data",
        BONESET_DATA: "/api/boneset",
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

// NEW: Fetch live boneset data from the API
export async function fetchBonesetData(bonesetId = "bony_pelvis") {
    const API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BONESET_DATA}/${bonesetId}`;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching boneset data:", error);
        throw error;
    }
}

// Keep the mock data function as fallback
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

// Helper function to find bone or subbone by ID in the boneset data
export function findBoneById(bonesetData, boneId) {
    if (!bonesetData || !bonesetData.bones) return null;
    
    // First check main bones
    for (const bone of bonesetData.bones) {
        if (bone.id === boneId) return bone;
        
        // Then check subbones
        if (bone.subbones) {
            for (const subbone of bone.subbones) {
                if (subbone.id === boneId) return subbone;
            }
        }
    }
    return null;
}

// Export configuration for other modules to use
export { API_CONFIG };
