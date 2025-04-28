// js/api.js
export async function fetchCombinedData() {
    const API_URL = 'http://127.0.0.1:8000/combined-data';

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Error fetching combined data:", error);
        alert("Failed to load data.");
        return { bonesets: [], bones: [], subbones: [] };
    }
}
