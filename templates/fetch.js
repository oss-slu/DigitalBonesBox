// fetch.js
export async function fetchJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Fetch ${path} failed: ${res.status}`);
    return await res.json();
  }
  
  /**
   * Fetch the boneset definitions
   */
  export function fetchBoneSets() {
    return fetchJSON('boneset.json');
  }
  