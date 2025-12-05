const COLORED_REGIONS_CONFIG = {
    // GitHub raw content URL for data branch
    BASE_URL: "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/annotations/ColoredRegions",
    // Local path served through API server for colored regions JSON files
    LOCAL_PATH: "http://127.0.0.1:8000/colored-regions",
    // Default opacity for colored overlays (0.3 = 30% transparent)
    DEFAULT_OPACITY: 0.4
};

/**
 * Positioning adjustments for colored region overlays
 * Format: { boneId: { imageIndex: { x, y, scale, rotation } } }
 * imageIndex: 0 = left/first image, 1 = right/second image
 */
const OVERLAY_ADJUSTMENTS = {
    "bony_pelvis": {
        0: { x: -5, y: -5, scale: 1.0, rotation: 15 },   // Left image
        1: { x: 2, y: 5, scale: 0.9, rotation: 1 }      // Right image
    },
    "iliac_crest": {
        0: { x: -2, y: 15, scale: 1.0, rotation: 12},
        1: { x: 65, y: 20, scale: 1.0, rotation: 0 }
    },
    "anterior_iliac_spines": {
        0: { x: 2, y: 11, scale: 1.0, rotation: 10 },
        1: { x: 5, y: 4, scale: 1.0, rotation: 0 }
    },
    "posterior_iliac_spines": {
        0: { x: 10, y: -70, scale: 0.95, rotation: 0 },
        1: { x: -20, y: -15, scale: 1.0, rotation: 0 }
    },
    "posterior_superior_iliac_spines": {
        0: { x: 50, y: 200, scale: 1.0, rotation: 0 },
        1: { x: 60, y: 80, scale: 1.0, rotation: 0 }
    },
    "posterior_inferior_iliac_spines": {
        0: { x: 60, y: 60, scale: 1.0, rotation: 0 },
        1: { x: 80, y: 60, scale: 1.0, rotation: 0 }
    },
    "pectineal_line": {
        0: { x: 0, y: 5, scale: 1.0, rotation: -2 },
        1: { x: 5, y: 5, scale: 1.0, rotation: 0 }
    },
    "symphyseal_surface": {
        0: { x: 17, y: 245, scale: 1.0, rotation: 0 },
        1: { x: 0, y: 0, scale: 1.0, rotation: 0 }
    },
    "pubic_tubercle": {
        0: { x: 270, y: 210, scale: 1.0, rotation: 0 },
        1: { x: 0, y: 0, scale: 1.0, rotation: 0 }
    },
    "auricular_surface": {
        0: { x: 140, y: 135, scale: 1.0, rotation: 0 },
        1: { x: 0, y: 0, scale: 1.0, rotation: 0 }
    },
    "ramus": {
        0: { x: 50, y: 340, scale: 1.0, rotation: 8 },
        1: { x: 105, y: 323, scale: 1.0, rotation: 0 }
    },
    "ischial_tuberosity": {
        0: { x: 38, y: 290, scale: 1.0, rotation: 0 },
        1: { x: 105, y: 295, scale: 1.0, rotation: 0 }
    },
    "ischial_spine": {
        0: { x: 45, y: 260, scale: 1.0, rotation: 0 },
        1: { x: 192, y: 258, scale: 1.0, rotation: 0 }
    },
    "sciatic_notches": {
        0: { x: 5, y: 0, scale: 1.0, rotation: 17 },
        1: { x: -5, y: 0, scale: 1.0, rotation: 0 }
    },
    "pubic_rami": {
        0: { x: 10, y: 40, scale: 0.7, rotation: 7 },
        1: { x: 0, y: 0, scale: 1.0, rotation: 0 }
    }
};

/**
 * Fetch colored region data for a specific bone from GitHub data branch
 * Tries multiple filename variations to handle different naming conventions
 * @param {string} boneId - The bone identifier (e.g., "pubis", "ilium")
 * @param {boolean} isBonesetSelection - Whether this is a boneset selection (not individual bone)
 * @returns {Object|null} - The colored region data or null if not available
 */
async function fetchColoredRegionData(boneId, isBonesetSelection = false) {
    if (!boneId) {
        console.debug("[ColoredRegions] No boneId provided for colored regions");
        return null;
    }

    console.log(`[ColoredRegions] Fetching colored region data for boneId: "${boneId}", isBonesetSelection: ${isBonesetSelection}`);
    
    // Map ilium to bony_pelvis only for boneset selections
    let mappedBoneId = boneId;
    if (boneId === "ilium" && isBonesetSelection) {
        console.log("[ColoredRegions] Mapping \"ilium\" to \"bony_pelvis\" for boneset selection");
        mappedBoneId = "bony_pelvis";
    } else if (boneId === "ilium" && !isBonesetSelection) {
        console.log("[ColoredRegions] Skipping colored regions for individual ilium bone selection");
        return null;
    }

    // Available bones with colored region data
    const bonesWithColoredRegions = ["bony_pelvis", "iliac_crest", "anterior_iliac_spines", "posterior_iliac_spines", "posterior_superior_iliac_spines", "posterior_inferior_iliac_spines", "auricular_surface", "ramus", "ischial_tuberosity", "ischial_spine", "sciatic_notches", "pubic_rami", "pectineal_line", "symphyseal_surface", "pubic_tubercle"];
    
    console.log(`[ColoredRegions] Checking if "${mappedBoneId}" is in available list:`, bonesWithColoredRegions);
    console.log("[ColoredRegions] Validation result:", bonesWithColoredRegions.includes(mappedBoneId));
    
    if (!bonesWithColoredRegions.includes(mappedBoneId)) {
        console.log(`[ColoredRegions] No colored regions available for: ${boneId}`);
        return null;
    }
    
    // Use mappedBoneId for the rest of the function
    boneId = mappedBoneId;

    // Special handling for bony_pelvis - use local extracted file
    if (boneId === "bony_pelvis") {
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/bony_pelvis_colored_regions_final.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: bony_pelvis_colored_regions_final.json");
                console.log("[ColoredRegions] First region Y coordinate (check offset applied):", data.images[0].colored_regions[0].path_data[0].commands[0].y);
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible, trying GitHub...");
        }
    }
    
    // Special handling for iliac_crest - use local extracted file
    if (boneId === "iliac_crest") {
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/iliac_crest_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: iliac_crest_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for iliac_crest:", error);
        }
    }

    // Special handling for anterior_iliac_spines - use local extracted file
    if (boneId === "anterior_iliac_spines") {
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/anterior_iliac_spines_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: anterior_iliac_spines_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for anterior_iliac_spines:", error);
        }
    }

    // Special handling for posterior_iliac_spines - use local extracted file
    if (boneId === "posterior_iliac_spines") {
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/posterior_iliac_spines_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: posterior_iliac_spines_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for posterior_iliac_spines:", error);
        }
    }

    // Special handling for posterior_superior_iliac_spines - use local extracted file
    if (boneId === "posterior_superior_iliac_spines") {
        try {
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/posterior_superior_iliac_spines_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: posterior_superior_iliac_spines_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for posterior_superior_iliac_spines:", error);
        }
    }

    // Special handling for posterior_inferior_iliac_spines - use local extracted file
    if (boneId === "posterior_inferior_iliac_spines") {
        try {
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/posterior_inferior_iliac_spines_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: posterior_inferior_iliac_spines_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for posterior_inferior_iliac_spines:", error);
        }
    }
    
    // Special handling for auricular_surface - use local extracted file
    if (boneId === "auricular_surface") {
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/auricular_surface_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: auricular_surface_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for auricular_surface:", error);
        }
    }

    // Special handler for ramus
    if (mappedBoneId === "ramus") {
        console.log("[ColoredRegions] Special case: ramus - loading from local file");
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/ramus_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: ramus_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for ramus:", error);
        }
    }

    // Special handler for ischial_tuberosity
    if (mappedBoneId === "ischial_tuberosity") {
        console.log("[ColoredRegions] Special case: ischial_tuberosity - loading from local file");
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/ischial_tuberosity_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: ischial_tuberosity_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for ischial_tuberosity:", error);
        }
    }

    // Special handler for ischial_spine
    if (mappedBoneId === "ischial_spine") {
        console.log("[ColoredRegions] Special case: ischial_spine - loading from local file");
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/ischial_spine_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: ischial_spine_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for ischial_spine:", error);
        }
    }

    // Special handler for sciatic_notches
    if (mappedBoneId === "sciatic_notches") {
        console.log("[ColoredRegions] Special case: sciatic_notches - loading from local file");
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/sciatic_notches_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: sciatic_notches_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for sciatic_notches:", error);
        }
    }

    // Special handler for pubic_rami
    if (mappedBoneId === "pubic_rami") {
        console.log("[ColoredRegions] Special case: pubic_rami - loading from local file");
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/pubis_rami_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: pubis_rami_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for pubic_rami:", error);
        }
    }

    // Special handler for pectineal_line
    if (mappedBoneId === "pectineal_line") {
        console.log("[ColoredRegions] Special case: pectineal_line - loading from local file");
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/pectineal_line_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: pectineal_line_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for pectineal_line:", error);
        }
    }

    // Special handler for symphyseal_surface
    if (mappedBoneId === "symphyseal_surface") {
        console.log("[ColoredRegions] Special case: symphyseal_surface - loading from local file");
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/symphyseal_surface_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: symphyseal_surface_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for symphyseal_surface:", error);
        }
    }

    // Special handler for pubic_tubercle
    if (mappedBoneId === "pubic_tubercle") {
        console.log("[ColoredRegions] Special case: pubic_tubercle - loading from local file");
        try {
            // Add cache-busting timestamp to force reload
            const timestamp = new Date().getTime();
            const localUrl = `${COLORED_REGIONS_CONFIG.LOCAL_PATH}/pubic_tubercle_colored_regions.json?v=${timestamp}`;
            console.log(`[ColoredRegions] Trying local file (with cache-bust): ${localUrl}`);
            const response = await fetch(localUrl, { 
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("[ColoredRegions] Successfully loaded from local file: pubic_tubercle_colored_regions.json");
                return data;
            }
        } catch (error) {
            console.log("[ColoredRegions] Local file not accessible for pubic_tubercle:", error);
        }
    }

    // Generate filename variations to try
    const variations = [
        boneId,                                          // Original: "pubis"
        boneId.toLowerCase(),                            // Lowercase: "pubis"
        boneId.charAt(0).toUpperCase() + boneId.slice(1), // Capitalize: "Pubis"
        boneId.replace(/_/g, " ")                         // Replace underscores: "bony pelvis"
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join("_"),                                   // Capitalize each word: "Bony_Pelvis"
    ];
    
    // Add common combined filename patterns (many bones are in combined files)
    // e.g., "ilium" might be in "Ilium_and_Ischium.json" or "Ischium_and_Ilium.json"
    const boneName = capitalize(boneId);
    const combinedVariations = [
        // For bony_pelvis boneset, try combined files with all regions
        boneId === "bony_pelvis" ? "Ischium_and_Pubis" : null,
        boneId === "bony_pelvis" ? "Pubis_and_Ischium" : null,
        // For individual bones, try their combined files
        `${boneName}_and_Ischium`,
        `${boneName}_and_Pubis`,
        `${boneName}_and_Ilium`,
        `Ischium_and_${boneName}`,
        `Pubis_and_${boneName}`,
        `Ilium_and_${boneName}`,
        `${boneName}_single`,
        `${boneName}_anterior`,
        `${boneName}_posterior`,
        `${boneName}_lateral`,
        `${boneName}_medial`,
        `${boneName}_superior`,
        `${boneName}_inferior`,
    ].filter(v => v !== null);  // Remove null values
    
    // Combine all variations
    const allVariations = [...variations, ...combinedVariations];

    console.log(`[ColoredRegions] Trying ${allVariations.length} filename variations...`);

    // Try each variation
    for (const variation of allVariations) {
        const filename = `${variation}.json`;
        const url = `${COLORED_REGIONS_CONFIG.BASE_URL}/${filename}`;

        try {
            console.debug(`[ColoredRegions] Trying: ${url}`);
            const response = await fetch(url);
            
            // File found, return the data
            if (response.ok) {
                const data = await response.json();
                console.log(`[ColoredRegions] Successfully loaded colored regions from ${filename}`);
                console.log("[ColoredRegions] Data:", data);
                return data;
            }
            
            // If 404, try next variation
            if (response.status === 404) {
                console.debug(`[ColoredRegions] File not found (404): ${filename}, trying next...`);
                continue;
            }
            
            // Other errors - log and try next
            console.warn(`[ColoredRegions] Error fetching ${filename}: ${response.status}`);
        } catch (error) {
            // Network error or parsing error - try next variation
            console.debug(`[ColoredRegions] Error with ${filename}:`, error.message);
        }
    }

    // No matching file found after trying all variations
    console.log(`[ColoredRegions] No colored regions file found for bone: ${boneId} (tried ${allVariations.length} variations)`);
    return null;
}

/**
 * Helper function to capitalize first letter
 */
function capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert EMU coordinates to pixel coordinates
 * EMU (English Metric Units) are used in PowerPoint
 * @param {number} emuValue - Coordinate value in EMUs
 * @param {number} emuMax - Maximum EMU value (slide width or height)
 * @param {number} pixelMax - Maximum pixel value (image width or height)
 * @returns {number} - Converted pixel coordinate
 */
function emuToPixels(emuValue, emuMax, pixelMax) {
    return (emuValue / emuMax) * pixelMax;
}

/**
 * Convert a path command from EMU coordinates to pixel coordinates
 * @param {Object} command - Path command object with type and coordinates
 * @param {Object} dimensions - Object containing slideWidth, slideHeight, imageWidth, imageHeight
 * @returns {Object} - Command with converted pixel coordinates
 */
function convertCommandToPixels(command, dimensions, debugInfo = {}) {
    const { slideWidth, slideHeight, imageWidth, imageHeight } = dimensions;
    const converted = { type: command.type };

    // Convert x, y coordinates (present in all command types)
    if (command.x !== undefined) {
        converted.x = emuToPixels(command.x, slideWidth, imageWidth);
        if (debugInfo.isFirstCommand) {
            console.log(`[ColoredRegions] First coord conversion: EMU(${command.x}, ${command.y}) -> Pixel(${converted.x.toFixed(2)}, ${emuToPixels(command.y, slideHeight, imageHeight).toFixed(2)})`);
            console.log(`[ColoredRegions]   EMU dimensions: ${slideWidth} x ${slideHeight}`);
            console.log(`[ColoredRegions]   Pixel dimensions: ${imageWidth} x ${imageHeight}`);
        }
    }
    if (command.y !== undefined) {
        converted.y = emuToPixels(command.y, slideHeight, imageHeight);
    }

    // Convert control points for Bezier curves (cubicBezTo)
    if (command.type === "cubicBezTo") {
        converted.x1 = emuToPixels(command.x1, slideWidth, imageWidth);
        converted.y1 = emuToPixels(command.y1, slideHeight, imageHeight);
        converted.x2 = emuToPixels(command.x2, slideWidth, imageWidth);
        converted.y2 = emuToPixels(command.y2, slideHeight, imageHeight);
    }

    return converted;
}

/**
 * Convert path data commands to SVG path string
 * @param {Array} commands - Array of path command objects
 * @param {Object} dimensions - Dimension conversion info
 * @returns {string} - SVG path d attribute string
 */
function commandsToSVGPath(commands, dimensions) {
    let pathString = "";

    commands.forEach((command, idx) => {
        const pixelCmd = convertCommandToPixels(command, dimensions, { isFirstCommand: idx === 0 });

        switch (pixelCmd.type) {
            case "moveTo":
                // M x y - Move to point
                pathString += `M ${pixelCmd.x} ${pixelCmd.y} `;
                break;
            
            case "lineTo":
                // L x y - Line to point
                pathString += `L ${pixelCmd.x} ${pixelCmd.y} `;
                break;
            
            case "cubicBezTo":
                // C x1 y1 x2 y2 x y - Cubic Bezier curve
                pathString += `C ${pixelCmd.x1} ${pixelCmd.y1} ${pixelCmd.x2} ${pixelCmd.y2} ${pixelCmd.x} ${pixelCmd.y} `;
                break;
            
            case "close":
                // Z - Close path
                pathString += "Z ";
                break;
            
            default:
                console.warn("Unknown path command type:", pixelCmd.type);
        }
    });

    return pathString.trim();
}

/**
 * Create an SVG element with colored region paths
 * @param {Array} coloredRegions - Array of colored region data
 * @param {number} imageWidth - Width of the image in pixels
 * @param {number} imageHeight - Height of the image in pixels
 * @param {Object} imageData - Image metadata (width, height, etc.)
 * @param {string} boneId - Bone identifier for data-bone attribute
 * @returns {SVGElement} - SVG element with colored regions
 */
function createColoredRegionsSVG(coloredRegions, imageWidth, imageHeight, imageData, boneId, imageIndex = 0) {
    // Create SVG namespace
    const svgNS = "http://www.w3.org/2000/svg";
    
    // Create SVG element that will overlay the image
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "colored-regions-overlay");
    svg.setAttribute("data-bone", boneId); // Add bone identifier for CSS targeting
    svg.setAttribute("width", imageWidth);
    svg.setAttribute("height", imageHeight);
    svg.setAttribute("viewBox", `0 0 ${imageWidth} ${imageHeight}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none"; // Allow clicks to pass through to image
    
    console.log(`[ColoredRegions DEBUG] Creating SVG for bone: ${boneId}, imageIndex: ${imageIndex}`);
    console.log("[ColoredRegions DEBUG] OVERLAY_ADJUSTMENTS lookup:", OVERLAY_ADJUSTMENTS[boneId]);
    
    // Apply positioning adjustments if defined for this bone and image
    if (OVERLAY_ADJUSTMENTS[boneId] && OVERLAY_ADJUSTMENTS[boneId][imageIndex]) {
        const adjustments = OVERLAY_ADJUSTMENTS[boneId][imageIndex];
        console.log("[ColoredRegions DEBUG] Found adjustments:", adjustments);
        const transforms = [];
        
        if (adjustments.x !== 0 || adjustments.y !== 0) {
            transforms.push(`translate(${adjustments.x}px, ${adjustments.y}px)`);
        }
        
        if (adjustments.scale !== 1.0) {
            transforms.push(`scale(${adjustments.scale})`);
        }
        
        if (adjustments.rotation !== 0) {
            transforms.push(`rotate(${adjustments.rotation}deg)`);
        }
        
        if (transforms.length > 0) {
            svg.style.transform = transforms.join(" ");
            svg.style.transformOrigin = "center";
            console.log(`[ColoredRegions] Applied positioning adjustments for ${boneId} image ${imageIndex}: ${svg.style.transform}`);
        }
    }

    // Set up dimension conversion parameters
    // New format: coordinates are relative to the image and scaled to pixel size
    // Old format: coordinates are in EMUs relative to slide and require full conversion
    const dimensions = {
        slideWidth: imageData.width || imageData.width,
        slideHeight: imageData.height || imageData.height,
        imageWidth: imageWidth,
        imageHeight: imageHeight
    };
    
    console.log("[ColoredRegions] Coordinate conversion:", {
        sourceWidth: dimensions.slideWidth,
        sourceHeight: dimensions.slideHeight,
        targetWidth: dimensions.imageWidth,
        targetHeight: dimensions.imageHeight
    });

    // Create path elements for each colored region
    coloredRegions.forEach((region, regionIndex) => {
        try {
            // path_data can be an array of path objects or a single path object
            const pathDataArray = Array.isArray(region.path_data) ? region.path_data : [region.path_data];
            
            // Process each path in the path_data array
            pathDataArray.forEach((pathDataObj, pathIndex) => {
                try {
                    // Convert path commands to SVG path string
                    const pathData = commandsToSVGPath(pathDataObj.commands, dimensions);
                    
                    // Create path element
                    const path = document.createElementNS(svgNS, "path");
                    path.setAttribute("d", pathData);
                    
                    // Apply offset if present (for shapes that need to be positioned relative to image)
                    if (region.offset_x !== undefined && region.offset_y !== undefined) {
                        // Convert EMU offsets to pixels
                        const offsetXPixels = emuToPixels(region.offset_x, dimensions.slideWidth, dimensions.imageWidth);
                        const offsetYPixels = emuToPixels(region.offset_y, dimensions.slideHeight, dimensions.imageHeight);
                        path.setAttribute("transform", `translate(${offsetXPixels}, ${offsetYPixels})`);
                        console.debug(`Applied offset transform: translate(${offsetXPixels}, ${offsetYPixels})`);
                    }
                    
                    // Apply color (add # to hex code from JSON)
                    const color = region.color.startsWith("#") ? region.color : `#${region.color}`;
                    
                    // Check if this is a stroked path (outline only) or filled region
                    if (region.stroke === true) {
                        // This is a stroked path (outline only) - like sciatic notches
                        path.setAttribute("fill", "none"); // No fill for stroked paths
                        path.setAttribute("stroke", color); // Use region color for stroke
                        
                        // Convert stroke width from EMU to pixels
                        const strokeWidthEMU = region.stroke_width || 38100;
                        const strokeWidthPixels = emuToPixels(strokeWidthEMU, dimensions.slideWidth, dimensions.imageWidth);
                        path.setAttribute("stroke-width", strokeWidthPixels);
                        path.setAttribute("stroke-linecap", "round");
                        path.setAttribute("stroke-linejoin", "round");
                        
                        console.debug(`Created stroked path: ${region.anatomical_name} (stroke: ${color}, width: ${strokeWidthPixels.toFixed(2)}px)`);
                    } else {
                        // This is a filled region - standard colored region
                        path.setAttribute("fill", color);
                        
                        // Create darker stroke color - handle multiple colors
                        let darkerStroke;
                        const colorUpper = color.toUpperCase();
                        if (colorUpper === "#C133AD") {
                            darkerStroke = "#8B2471"; // Darker pink for pink regions
                        } else if (colorUpper === "#FF00E6") {
                            darkerStroke = "#B300A3"; // Darker magenta for magenta regions
                        } else if (colorUpper === "#008000" || colorUpper === "#2F8E29") {
                            darkerStroke = "#1F5E1C"; // Darker green for green regions
                        } else {
                            darkerStroke = "#1F5E1C"; // Default to darker green
                        }
                        path.setAttribute("stroke", darkerStroke); // Darker dashed border
                        
                        // Apply transparency
                        path.setAttribute("opacity", COLORED_REGIONS_CONFIG.DEFAULT_OPACITY);
                    }
                    
                    // Add descriptive attributes for debugging
                    path.setAttribute("data-region-name", region.anatomical_name || `region-${regionIndex}`);
                    path.setAttribute("data-color-name", region.color_name || "unknown");
                    path.setAttribute("data-path-index", pathIndex);
                    
                    // Mark stroked paths for CSS styling
                    if (region.stroke === true) {
                        path.setAttribute("data-region-type", "stroke");
                    } else {
                        path.setAttribute("data-region-type", "fill");
                    }
                    
                    // Add to SVG
                    svg.appendChild(path);
                    
                    console.debug(`Created colored region path ${pathIndex + 1}/${pathDataArray.length}: ${region.anatomical_name} (${region.color_name})`);
                } catch (error) {
                    console.error(`Error creating path ${pathIndex} for region ${region.anatomical_name}:`, error);
                }
            });
        } catch (error) {
            console.error(`Error processing region ${region.anatomical_name}:`, error);
        }
    });

    return svg;
}

/**
 * Display colored regions over a bone image
 * @param {HTMLImageElement} imageElement - The bone image element
 * @param {string} boneId - The bone identifier
 * @param {number} imageIndex - The index of the image (0 for left, 1 for right, etc.)
 * @param {boolean} isBonesetSelection - Whether this is a boneset selection (not individual bone)
 * @returns {Promise<void>}
 */
export async function displayColoredRegions(imageElement, boneId, imageIndex = 0, isBonesetSelection = false) {
    console.log("[ColoredRegions] ============ START displayColoredRegions ============");
    console.log(`[ColoredRegions] boneId: ${boneId}, imageIndex: ${imageIndex}, isBonesetSelection: ${isBonesetSelection}`);
    console.log("[ColoredRegions] imageElement:", imageElement);
    
    if (!imageElement || !boneId) {
        console.debug("[ColoredRegions] Missing image element or boneId for colored regions");
        return;
    }

    // Map ilium to bony_pelvis for positioning lookups (same as in fetchColoredRegionData)
    let mappedBoneId = boneId;
    if (boneId === "ilium" && isBonesetSelection) {
        mappedBoneId = "bony_pelvis";
        console.log("[ColoredRegions] Using mapped bone ID \"bony_pelvis\" for positioning adjustments");
    }

    // Fetch colored region data
    const regionData = await fetchColoredRegionData(boneId, isBonesetSelection);
    console.log("[ColoredRegions] Fetched regionData:", regionData);
    
    // Return early if no colored region data exists
    if (!regionData) {
        console.debug(`[ColoredRegions] No colored regions to display for ${boneId}`);
        return;
    }

    // Handle new structure with separate images
    let imageData = null;
    let regionsToDisplay = [];
    
    if (regionData.images && Array.isArray(regionData.images)) {
        // New structure: data organized by image
        console.log(`[ColoredRegions] Using new multi-image structure with ${regionData.images.length} images`);
        
        if (imageIndex >= 0 && imageIndex < regionData.images.length) {
            imageData = regionData.images[imageIndex];
            regionsToDisplay = imageData.colored_regions || [];
        } else {
            console.warn(`[ColoredRegions] Invalid imageIndex ${imageIndex}, expected 0-${regionData.images.length - 1}`);
            return;
        }
    } else if (regionData.colored_regions) {
        // Old structure: single set of regions for all images
        console.log("[ColoredRegions] Using old single-image structure");
        regionsToDisplay = regionData.colored_regions;
        imageData = {
            width: regionData.image_dimensions?.width,
            height: regionData.image_dimensions?.height
        };
    }
    
    if (!regionsToDisplay || regionsToDisplay.length === 0) {
        console.debug(`[ColoredRegions] No colored regions found for image ${imageIndex}`);
        return;
    }

    console.log(`[ColoredRegions] Found ${regionsToDisplay.length} colored regions for image ${imageIndex}`);

    // Wait for image to load to get correct dimensions
    if (!imageElement.complete) {
        console.log("[ColoredRegions] Waiting for image to complete loading...");
        await new Promise(resolve => {
            imageElement.addEventListener("load", resolve, { once: true });
        });
    }

    // Get image dimensions
    // Use naturalWidth/naturalHeight to get the actual image file dimensions
    // This ensures the SVG coordinates match the actual image, then CSS will scale both together
    const imageWidth = imageElement.naturalWidth;
    const imageHeight = imageElement.naturalHeight;

    console.log(`[ColoredRegions] Image natural dimensions: ${imageWidth}x${imageHeight}`);
    console.log(`[ColoredRegions] Image displayed dimensions: ${imageElement.offsetWidth}x${imageElement.offsetHeight}`);

    if (imageWidth === 0 || imageHeight === 0) {
        console.warn("[ColoredRegions] Image has zero dimensions, cannot display colored regions");
        return;
    }

    // Create SVG overlay (use mappedBoneId for positioning lookups)
    const svg = createColoredRegionsSVG(
        regionsToDisplay,
        imageWidth,
        imageHeight,
        imageData,
        mappedBoneId,
        imageIndex
    );

    // Find the parent container to add SVG overlay
    const parent = imageElement.parentElement;
    if (!parent) {
        console.warn("[ColoredRegions] Image element has no parent, cannot add overlay");
        return;
    }

    // Ensure parent has position relative for absolute positioning of SVG
    if (getComputedStyle(parent).position === "static") {
        parent.style.position = "relative";
    }

    // Add class to disable image rotation (so CSS transforms on overlay work correctly)
    parent.classList.add("with-annotations");

    // Remove any existing colored region overlays
    clearColoredRegions(parent);

    // Add the SVG overlay
    parent.appendChild(svg);
    
    console.log("[ColoredRegions] SVG appended to parent container");
    console.log("[ColoredRegions] Parent element:", parent);
    console.log("[ColoredRegions] Parent classes:", parent.className);
    console.log("[ColoredRegions] SVG data-bone attribute:", svg.getAttribute("data-bone"));
    console.log("[ColoredRegions] SVG element:", svg);
    console.log(`[ColoredRegions] SVG has ${svg.children.length} path elements`);

    console.log(`[ColoredRegions] Successfully displayed ${regionsToDisplay.length} colored regions for image ${imageIndex}`);
}

/**
 * Clear all colored region overlays from a container
 * @param {HTMLElement} container - The container element
 */
export function clearColoredRegions(container) {
    if (!container) return;
    
    const existingOverlays = container.querySelectorAll(".colored-regions-overlay");
    existingOverlays.forEach(overlay => overlay.remove());
}

/**
 * Clear all colored region overlays in the entire image container
 */
export function clearAllColoredRegions() {
    const container = document.getElementById("bone-image-container");
    if (container) {
        clearColoredRegions(container);
    }
}
