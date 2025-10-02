// api.js - Centralized API configuration and data fetching

const API_CONFIG = {
    BASE_URL: "http://127.0.0.1:8000",
    ENDPOINTS: {
        BONESET: "/api/boneset"
    }
};

/**
 * Fetches complete boneset data including bones, subbones, and annotations
 * @param {string} bonesetId - The ID of the boneset to fetch
 * @returns {Promise<Object>} Complete boneset data with nested structure
 */
export async function fetchBonesetData(bonesetId) {
    const API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BONESET}/${bonesetId}`;

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

/**
 * Finds a bone or subbone by ID within the boneset data
 * @param {Object} bonesetData - The complete boneset data object
 * @param {string} boneId - The ID of the bone or subbone to find
 * @returns {Object|null} The bone/subbone object or null if not found
 */
export function findBoneById(bonesetData, boneId) {
    if (!bonesetData || !bonesetData.bones) return null;
    
    for (const bone of bonesetData.bones) {
        if (bone.id === boneId) return bone;
        
        if (bone.subbones) {
            for (const subbone of bone.subbones) {
                if (subbone.id === boneId) return subbone;
            }
        }
    }
    return null;
}

/**
 * Extracts dropdown data structure from boneset data
 * @param {Object} bonesetData - The complete boneset data
 * @returns {Object} Formatted data for dropdowns {bonesets, bones, subbones}
 */
export function extractDropdownData(bonesetData) {
    if (!bonesetData || !bonesetData.bones) {
        return { bonesets: [], bones: [], subbones: [] };
    }

    const bonesets = [{ id: bonesetData.id, name: bonesetData.name }];
    const bones = [];
    const subbones = [];

    bonesetData.bones.forEach(bone => {
        bones.push({ id: bone.id, name: bone.name, boneset: bonesetData.id });
        
        if (bone.subbones) {
            bone.subbones.forEach(subbone => {
                subbones.push({ 
                    id: subbone.id, 
                    name: subbone.name.replace(/_/g, " "), 
                    bone: bone.id 
                });
            });
        }
    });

    return { bonesets, bones, subbones };
}

export { API_CONFIG };
