// api.js - Centralized API configuration and data fetching

// Centralized API configuration
const API_CONFIG = {
    BASE_URL: 'http://127.0.0.1:8000',
    ENDPOINTS: {
        COMBINED_DATA: '/combined-data',
        MOCK_BONE_DATA: './js/mock-bone-data.json'
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
        console.error('Error fetching combined data:', error);
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
        console.error('Error fetching mock bone data:', error);
        return null;
    }
}

// Export configuration for other modules to use
export { API_CONFIG };
