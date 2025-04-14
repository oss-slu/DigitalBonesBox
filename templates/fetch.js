/**
 * Fetch JSON data from a given path.
 * @param {string} path - The URL or path to the JSON file.
 * @returns {Promise<Object>} - A promise that resolves to the JSON data.
 */
 export async function fetchJSON(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch data from ${path}. Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching JSON:", error);
        alert(`Error fetching data: ${error.message}`);
    }
}
