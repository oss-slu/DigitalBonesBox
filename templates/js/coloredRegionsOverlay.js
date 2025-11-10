class ColoredRegionsOverlay {
    constructor() {
        // Use local extracted XML data only
        this.baseUrl = '/data_extraction/annotations/color_regions/';
        this.currentOverlays = new Map(); // Track overlays by container element
        
        // Mapping of anatomical terms to slide numbers based on PowerPoint content
        this.anatomyToSlideMap = {
            // Slide 2 - Bony pelvis (main overview)
            'pelvis': 2, 'bony': 2, 'ilium': 2, 'ischium': 2, 'pubis': 2,
            
            // Slide 5 - Iliac crest
            'iliac': 5, 'crest': 5, 'iliaccrest': 5,
            
            // Slide 6 - Anterior Iliac spines
            'anterior': 6, 'spine': 6, 'anteriorspine': 6, 'anterioriliacspine': 6,
            
            // Slide 7 - Posterior Iliac spines  
            'posterior': 7, 'posteriorspine': 7, 'posterioriliacspine': 7,
            
            // Slide 8 - Auricular surface
            'auricular': 8, 'surface': 8, 'auricularsurface': 8,
            
            // Slide 11 - Ramus
            'ramus': 11, 'rami': 11,
            
            // Slide 12 - Ischial tuberosity
            'tuberosity': 12, 'ischialtuberosity': 12,
            
            // Slide 13 - Ischial spine
            'ischialspine': 13,
            
            // Slide 14 - Sciatic notches
            'sciatic': 14, 'notch': 14, 'sciaticnotch': 14, 'notches': 14,
            
            // Slide 17 - Pubic Rami
            'pubicrami': 17, 'pubicramus': 17,
            
            // Slide 18 - Pectineal line
            'pectineal': 18, 'line': 18, 'pectinealline': 18,
            
            // Slide 19 - Symphyseal surface
            'symphyseal': 19, 'symphysealsurface': 19,
            
            // Slide 20 - Pubic tubercle
            'tubercle': 20, 'pubictubercle': 20
        };
    }

    /**
     * Main function to display colored regions for a bone
     * @param {string} boneId - The bone identifier (e.g., 'pubis', 'ischium', 'ilium')
     * @param {HTMLElement} imageContainer - The container element holding the image
     */
    async displayColoredRegions(boneId, imageContainer) {
        console.log(`Attempting to display colored regions for bone: ${boneId}`);
        try {
            // Clear any existing overlays for this container
            this.clearOverlays(imageContainer);

            // Find the colored region file for this bone
            const coloredData = await this.fetchColoredRegionData(boneId);
            
            if (!coloredData) {
                console.log(`No colored region data found for bone: ${boneId}`);
                return;
            }

            console.log(`Found colored region data for ${boneId}:`, coloredData);

            // Get the image element to overlay on
            const imgElement = imageContainer.querySelector('img');
            if (!imgElement) {
                console.warn('No image element found in container', imageContainer);
                return;
            }

            console.log(`Image element found:`, imgElement.src);

            // Wait for image to load if not already loaded
            await this.waitForImageLoad(imgElement);

            console.log(`Image loaded, creating overlay...`);

            // Create and display the overlay
            this.createColoredOverlay(coloredData, imgElement, imageContainer);

        } catch (error) {
            console.error('Error displaying colored regions:', error);
        }
    }

    /**
     * Fetch colored region data for a specific bone
     * @param {string} boneId - The bone identifier
     * @returns {Object|null} - The colored region data or null if not found
     */
    async fetchColoredRegionData(boneId) {
        // Use our locally created bone-specific JSON files with correct colors
        const cleanBoneId = boneId.toLowerCase().replace(/[^a-z]/g, '');
        const boneFilename = `${cleanBoneId.charAt(0).toUpperCase() + cleanBoneId.slice(1)}.json`;
        const localUrl = `/data_extraction/annotations/color_regions/${boneFilename}`;
        
        console.log(`Loading local bone data: ${localUrl}`);
        
        try {
            const response = await fetch(localUrl);
            if (response.ok) {
                const data = await response.json();
                console.log(`Successfully loaded local bone data: ${boneFilename}`);
                console.log(`   Slide: ${data.slide_number}, Regions: ${data.colored_regions.length}`);
                
                // Show what colors we loaded
                data.colored_regions.forEach((region, i) => {
                    console.log(`   Region ${i+1}: ${region.anatomical_name} - Color #${region.color} (${region.color_name})`);
                });
                
                return data;
            } else {
                console.log(` Bone-specific file not found: ${response.status}`);
            }
        } catch (error) {
            console.log(` Bone-specific file error: ${error.message}`);
        }

        // Try the most likely slide first based on anatomy mapping
        const likelySlide = this.mapBoneToSlide(boneId);
        if (likelySlide) {
            const likelyFile = `slide${likelySlide}_precise_paths.json`;
            const likelyUrl = `/data_extraction/annotations/color_regions/${likelyFile}`;
            
            console.log(` Trying most likely slide first: ${likelyFile}`);
            try {
                const response = await fetch(likelyUrl);
                if (response.ok) {
                    const data = await response.json();
                    console.log(` Found data in likely slide ${likelySlide}: ${data.colored_regions?.length || 0} regions`);
                    
                    // Show what we found
                    data.colored_regions.forEach((region, i) => {
                        console.log(`   Region ${i+1}: ${region.anatomical_name} - Color #${region.color}`);
                    });
                    
                    return data;
                }
            } catch (error) {
                console.log(` Likely slide failed: ${error.message}`);
            }
        }

        // Try all other slide files to find colored regions for this bone
        console.log(` Searching all remaining slides for ${boneId} regions...`);
        const slideFiles = this.generateLocalFilenames().filter(f => f !== `slide${likelySlide}_precise_paths.json`);
        
        for (const slideFile of slideFiles) {
            const slideUrl = `/data_extraction/annotations/color_regions/${slideFile}`;
            try {
                const response = await fetch(slideUrl);
                if (response.ok) {
                    const data = await response.json();
                    
                    // Check if this slide has regions for our bone
                    if (this.slideContainsBone(data, boneId)) {
                        console.log(` Found ${boneId} regions in ${slideFile}: ${data.colored_regions?.length || 0} regions`);
                        
                        // Show what we found
                        data.colored_regions.forEach((region, i) => {
                            console.log(`   Region ${i+1}: ${region.anatomical_name} - Color #${region.color}`);
                        });
                        
                        return data;
                    }
                }
            } catch (error) {
                console.log(` Failed to load ${slideFile}: ${error.message}`);
            }
        }
        
        console.log(` No colored region data found for bone: ${boneId}`);
        return null;
    }

    /**
     * Map bone ID to most likely slide number based on anatomical content
     * @param {string} boneId - The bone identifier
     * @returns {number|null} - Most likely slide number or null
     */
    mapBoneToSlide(boneId) {
        const cleanId = boneId.toLowerCase().replace(/[^a-z]/g, '');
        console.log(` Mapping bone "${boneId}" (cleaned: "${cleanId}") to slide...`);
        
        // Direct matches
        if (this.anatomyToSlideMap[cleanId]) {
            console.log(` Direct match: ${cleanId} → slide ${this.anatomyToSlideMap[cleanId]}`);
            return this.anatomyToSlideMap[cleanId];
        }
        
        // Partial matches - check if bone ID contains any anatomical terms
        for (const [anatomy, slideNum] of Object.entries(this.anatomyToSlideMap)) {
            if (cleanId.includes(anatomy) || anatomy.includes(cleanId)) {
                console.log(` Partial match: "${cleanId}" contains "${anatomy}" → slide ${slideNum}`);
                return slideNum;
            }
        }
        
        // Default to slide 2 (main bony pelvis overview) if no specific match
        console.log(` No specific match, defaulting to slide 2 (bony pelvis overview)`);
        return 2;
    }

    /**
     * Generate local slide filenames to try
     * @returns {Array<string>} - Array of slide filenames
     */
    generateLocalFilenames() {
        // All slides that have colored regions (from our extraction)
        const slideNumbers = [2, 5, 6, 7, 8, 11, 12, 13, 14, 17, 18, 19, 20];
        return slideNumbers.map(num => `slide${num}_precise_paths.json`);
    }

    /**
     * Check if a slide contains colored regions for a specific bone
     * @param {Object} slideData - The slide data
     * @param {string} boneId - The bone identifier  
     * @returns {boolean} - True if slide contains the bone
     */
    slideContainsBone(slideData, boneId) {
        if (!slideData.colored_regions) return false;
        
        const cleanBoneId = boneId.toLowerCase().trim();
        return slideData.colored_regions.some(region => {
            const anatomicalName = region.anatomical_name?.toLowerCase() || '';
            return anatomicalName.includes(cleanBoneId) || 
                   (cleanBoneId === 'pubis' && anatomicalName.includes('pubis')) ||
                   (cleanBoneId === 'ischium' && anatomicalName.includes('ischium')) ||
                   (cleanBoneId === 'ilium' && anatomicalName.includes('ilium'));
        });
    }



    /**
     * Wait for image to load completely
     * @param {HTMLImageElement} imgElement - The image element
     * @returns {Promise} - Resolves when image is loaded
     */
    waitForImageLoad(imgElement) {
        return new Promise((resolve) => {
            if (imgElement.complete && imgElement.naturalHeight !== 0) {
                resolve();
            } else {
                imgElement.addEventListener('load', resolve, { once: true });
                imgElement.addEventListener('error', resolve, { once: true });
            }
        });
    }

    /**
     * Create SVG overlay with colored regions
     * @param {Object} coloredData - The colored region data from JSON
     * @param {HTMLImageElement} imgElement - The image element to overlay on
     * @param {HTMLElement} container - The container element
     */
    createColoredOverlay(coloredData, imgElement, container) {
        // Get image dimensions - use natural dimensions if available, otherwise computed dimensions
        const imgRect = imgElement.getBoundingClientRect();
        let imgWidth, imgHeight;
        
        // Prefer natural dimensions (actual image file size) if available
        if (imgElement.naturalWidth && imgElement.naturalHeight) {
            imgWidth = imgElement.naturalWidth;
            imgHeight = imgElement.naturalHeight;
            console.log(` Using natural image dimensions: ${imgWidth}x${imgHeight}px`);
        } else {
            // Fallback to computed dimensions
            imgWidth = Math.max(imgElement.offsetWidth, imgRect.width, imgElement.clientWidth) || 400;
            imgHeight = Math.max(imgElement.offsetHeight, imgRect.height, imgElement.clientHeight) || 300;
            console.log(` Using computed dimensions (fallback): ${imgWidth}x${imgHeight}px`);
        }

        const slideWidth = coloredData.image_dimensions.width;
        const slideHeight = coloredData.image_dimensions.height;

        console.log(` Image dimensions: ${imgWidth}x${imgHeight}px`);
        console.log(` Slide dimensions: ${slideWidth}x${slideHeight} EMUs`);
        console.log(` Scale factors: x=${imgWidth/slideWidth}, y=${imgHeight/slideHeight}`);

        const actualWidth = imgElement.offsetWidth || imgElement.clientWidth || imgElement.getBoundingClientRect().width;
        const actualHeight = imgElement.offsetHeight || imgElement.clientHeight || imgElement.getBoundingClientRect().height;
        
        console.log(` ACTUAL displayed image: ${actualWidth}x${actualHeight}px`);
        console.log(`� Original image: ${imgWidth}x${imgHeight}px`);
        console.log(` Scale factors: x=${actualWidth/imgWidth}, y=${actualHeight/imgHeight}`);

        const coordWidth = actualWidth;
        const coordHeight = actualHeight;
        console.log(` Using ACTUAL display size: ${coordWidth}x${coordHeight}px for perfect overlay`);

        window.ColoredRegionsDebug.logActualPixelCoordinates(coloredData, coordWidth, coordHeight);

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'colored-regions-overlay');
        svg.setAttribute('width', coordWidth);
        svg.setAttribute('height', coordHeight);
        svg.setAttribute('viewBox', `0 0 ${coordWidth} ${coordHeight}`);
        
        console.log(` Created SVG overlay: ${coordWidth}x${coordHeight}`);
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';  // Match container width exactly
        svg.style.height = '100%'; // Match container height exactly
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '10';
        // svg.style.border = '2px solid red'; // Debug border - commented out
        // svg.style.background = 'rgba(255,0,0,0.1)'; // Debug background - commented out
        console.log(` SVG viewBox: 0 0 ${coordWidth} ${coordHeight}`);
        console.log(` SVG positioning: position=${svg.style.position}, top=${svg.style.top}, left=${svg.style.left}`);

        // Create ACTUAL FREEFORM SHAPES from PowerPoint coordinates
        coloredData.colored_regions.forEach((region, index) => {
            console.log(` FREEFORM Region ${index + 1}: ${region.anatomical_name} (${region.color})`);

            // Create each path as a filled freeform shape
            region.path_data.forEach((pathData, pathIndex) => {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                
                // Generate SVG path string from PowerPoint coordinates
                const pathString = this.convertCommandsToSVGPath(pathData.commands, slideWidth, slideHeight, coordWidth, coordHeight);
                
                console.log(` FREEFORM Path ${pathIndex + 1}: ${pathString.substring(0, 100)}...`);
                
                // Debug: Show sample coordinate conversion and check if coordinates look reasonable
                if (pathData.commands.length > 0) {
                    const firstCmd = pathData.commands[0];
                    const pixelX = (firstCmd.x / slideWidth) * coordWidth;
                    const pixelY = (firstCmd.y / slideHeight) * coordHeight;
                    console.log(` Sample EMU→Pixel: (${firstCmd.x}, ${firstCmd.y}) → (${pixelX.toFixed(1)}, ${pixelY.toFixed(1)})`);
                    
                    // Check if coordinates are reasonable (should be within image bounds)
                    if (pixelX < 0 || pixelX > coordWidth || pixelY < 0 || pixelY > coordHeight) {
                        console.warn(`Warning: Coordinates out of bounds! Image: ${coordWidth}x${coordHeight}, Point: (${pixelX.toFixed(1)}, ${pixelY.toFixed(1)})`);
                    }
                    
                    // Show percentage of image where this point lands
                    console.log(` Point location: ${(pixelX/coordWidth*100).toFixed(1)}% right, ${(pixelY/coordHeight*100).toFixed(1)}% down`);
                }
                
                path.setAttribute('d', pathString);
                
                // Style as filled freeform shape with colored dotted outline
                path.setAttribute('fill', `#${region.color}`);
                path.setAttribute('fill-opacity', '0.4');
                path.setAttribute('stroke', `#${region.color}`);
                path.setAttribute('stroke-width', '2');
                path.setAttribute('stroke-dasharray', '5,3'); // Dotted outline
                path.setAttribute('stroke-linejoin', 'round');
                path.setAttribute('stroke-linecap', 'round');
                
                svg.appendChild(path);
            });
        });

        // Ensure proper positioning for perfect overlay alignment
        if (container.style.position !== 'relative' && container.style.position !== 'absolute') {
            container.style.position = 'relative';
        }
        
        console.log(` Container positioning: ${container.style.position}`);
        console.log(` Container size: ${container.offsetWidth}x${container.offsetHeight}px`);
        
        container.appendChild(svg);

        // Store reference for cleanup
        if (!this.currentOverlays.has(container)) {
            this.currentOverlays.set(container, []);
        }
        this.currentOverlays.get(container).push(svg);

        console.log(` Created overlay with ${coloredData.colored_regions.length} colored regions`);
    }

    /**
     * Create a single colored region path
     * @param {SVGElement} svg - The SVG container
     * @param {Object} region - The colored region data
     * @param {number} slideWidth - Original slide width in EMUs
     * @param {number} slideHeight - Original slide height in EMUs
     * @param {number} imgWidth - Target image width in pixels
     * @param {number} imgHeight - Target image height in pixels
     */
    createRegionPath(svg, region, slideWidth, slideHeight, imgWidth, imgHeight) {
        console.log(`  📍 Creating path for ${region.anatomical_name} with ${region.path_data.length} path(s)`);
        
        // Each region can have multiple path_data entries
        region.path_data.forEach((pathData, pathIndex) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            
            // Convert path commands to SVG path string
            const pathString = this.convertCommandsToSVGPath(
                pathData.commands, 
                slideWidth, 
                slideHeight, 
                imgWidth, 
                imgHeight
            );
            
            console.log(`     Path ${pathIndex + 1}: ${pathString.substring(0, 100)}...`);
            
            path.setAttribute('d', pathString);
            
            // Apply color and styling for large filled anatomical regions like PowerPoint
            const color = `#${region.color}`; // Add # to hex color
            path.setAttribute('fill', color);
            path.setAttribute('fill-opacity', '0.6'); // More opaque fill for visibility
            path.setAttribute('stroke', '#000000'); // Dark outline like PowerPoint
            path.setAttribute('stroke-width', '4'); // Thick dark outline for anatomical regions
            path.setAttribute('stroke-opacity', '0.9'); // Strong outline visibility
            path.setAttribute('stroke-linejoin', 'round'); // Smooth corners
            path.setAttribute('stroke-linecap', 'round'); // Smooth line ends
            
            // Add data attributes for debugging
            path.setAttribute('data-anatomical-name', region.anatomical_name);
            path.setAttribute('data-color-name', region.color_name);
            path.setAttribute('data-shape-id', region.shape_id);
            
            console.log(`     Added path with color ${color}`);
            
            svg.appendChild(path);
        });
    }

    /**
     * Convert path commands to SVG path string
     * @param {Array} commands - Array of path commands
     * @param {number} slideWidth - Original slide width in EMUs
     * @param {number} slideHeight - Original slide height in EMUs  
     * @param {number} imgWidth - Target image width in pixels
     * @param {number} imgHeight - Target image height in pixels
     * @returns {string} - SVG path string
     */
    convertCommandsToSVGPath(commands, slideWidth, slideHeight, imgWidth, imgHeight) {
        let pathString = '';
        let commandCount = 0;

        commands.forEach((command, index) => {
            switch (command.type) {
                case 'moveTo':
                    const moveX = this.convertEMUtoPixel(command.x, slideWidth, imgWidth);
                    const moveY = this.convertEMUtoPixel(command.y, slideHeight, imgHeight);
                    pathString += `M ${moveX.toFixed(2)} ${moveY.toFixed(2)} `;
                    if (index === 0) console.log(`       Start: (${command.x}, ${command.y}) EMU → (${moveX.toFixed(2)}, ${moveY.toFixed(2)}) px`);
                    break;

                case 'lineTo':
                    const lineX = this.convertEMUtoPixel(command.x, slideWidth, imgWidth);
                    const lineY = this.convertEMUtoPixel(command.y, slideHeight, imgHeight);
                    pathString += `L ${lineX.toFixed(2)} ${lineY.toFixed(2)} `;
                    commandCount++;
                    break;

                case 'cubicBezTo':
                    const x1 = this.convertEMUtoPixel(command.x1, slideWidth, imgWidth);
                    const y1 = this.convertEMUtoPixel(command.y1, slideHeight, imgHeight);
                    const x2 = this.convertEMUtoPixel(command.x2, slideWidth, imgWidth);
                    const y2 = this.convertEMUtoPixel(command.y2, slideHeight, imgHeight);
                    const x = this.convertEMUtoPixel(command.x, slideWidth, imgWidth);
                    const y = this.convertEMUtoPixel(command.y, slideHeight, imgHeight);
                    pathString += `C ${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} `;
                    commandCount++;
                    break;

                case 'close':
                    pathString += 'Z ';
                    break;

                default:
                    console.warn(` Unknown path command type: ${command.type}`);
            }
        });

        // Ensure path is closed for proper filling
        if (!pathString.includes('Z')) {
            pathString += 'Z ';
            console.log(`      🔒 Added automatic path close (Z)`);
        }

        console.log(`       Generated path with ${commandCount} commands, length: ${pathString.length} chars`);
        console.log(`      📍 Final path string: ${pathString.substring(0, 200)}...`);
        return pathString.trim();
    }

    /**
     * Convert EMU coordinates to pixel coordinates
     * @param {number} emuValue - Coordinate value in EMUs
     * @param {number} emuDimension - Total dimension in EMUs (width or height)
     * @param {number} pixelDimension - Total dimension in pixels (width or height)
     * @returns {number} - Coordinate value in pixels
     */
    convertEMUtoPixel(emuValue, emuDimension, pixelDimension) {
        return (emuValue / emuDimension) * pixelDimension;
    }

    /**
     * Clear all overlays for a specific container
     * @param {HTMLElement} container - The container to clear overlays from
     */
    clearOverlays(container) {
        if (this.currentOverlays.has(container)) {
            const overlays = this.currentOverlays.get(container);
            overlays.forEach(overlay => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            });
            this.currentOverlays.set(container, []);
        }
        
        // Also remove any existing SVG overlays in the container
        const existingOverlays = container.querySelectorAll('.colored-regions-overlay');
        existingOverlays.forEach(overlay => overlay.remove());
    }

    /**
     * Clear all overlays from all containers
     */
    clearAllOverlays() {
        this.currentOverlays.forEach((overlays, container) => {
            this.clearOverlays(container);
        });
        this.currentOverlays.clear();
    }

    /**
     * Handle window resize to update overlay positioning
     */
    handleResize() {
        // Re-create all current overlays to match new image sizes
        const containers = Array.from(this.currentOverlays.keys());
        containers.forEach(container => {
            const imgElement = container.querySelector('img');
            if (imgElement) {
                // Get the bone ID from the image or container data
                const boneId = container.dataset.boneId || imgElement.dataset.boneId;
                if (boneId) {
                    this.displayColoredRegions(boneId, container);
                }
            }
        });
    }

    /**
     * Convert PowerPoint path commands to SVG path string
     */
    convertCommandsToSVGPath(commands, slideWidth, slideHeight, coordWidth, coordHeight) {
        const pathParts = [];
        
        commands.forEach((cmd, index) => {
            // Convert EMU coordinates to pixels with proper scaling
            const x = (cmd.x / slideWidth) * coordWidth;
            const y = (cmd.y / slideHeight) * coordHeight;
            
            switch (cmd.type) {
                case 'moveTo':
                    pathParts.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
                    break;
                case 'lineTo':
                    pathParts.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
                    break;
                case 'curveTo':
                case 'cubicBezTo':
                    // Cubic Bezier curve
                    if (cmd.x1 !== undefined && cmd.y1 !== undefined && cmd.x2 !== undefined && cmd.y2 !== undefined) {
                        const x1 = (cmd.x1 / slideWidth) * coordWidth;
                        const y1 = (cmd.y1 / slideHeight) * coordHeight;
                        const x2 = (cmd.x2 / slideWidth) * coordWidth;
                        const y2 = (cmd.y2 / slideHeight) * coordHeight;
                        pathParts.push(`C ${x1.toFixed(2)} ${y1.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`);
                    } else {
                        // Fallback to lineTo if curve data is incomplete
                        pathParts.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
                    }
                    break;
                case 'quadBezTo':
                    // Quadratic Bezier curve
                    if (cmd.x1 !== undefined && cmd.y1 !== undefined) {
                        const x1 = (cmd.x1 / slideWidth) * coordWidth;
                        const y1 = (cmd.y1 / slideHeight) * coordHeight;
                        pathParts.push(`Q ${x1.toFixed(2)} ${y1.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`);
                    } else {
                        // Fallback to lineTo if curve data is incomplete
                        pathParts.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
                    }
                    break;
                case 'close':
                    pathParts.push('Z');
                    break;
                default:
                    // Default to lineTo for unknown commands
                    if (x !== undefined && y !== undefined) {
                        pathParts.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
                    }
            }
        });
        
        // Always close the path for filled shapes
        if (!pathParts.some(part => part === 'Z')) {
            pathParts.push('Z');
        }
        
        return pathParts.join(' ');
    }
}
// Create and export a singleton instance
const coloredRegionsOverlay = new ColoredRegionsOverlay();

// Add resize listener for responsive behavior
window.addEventListener('resize', () => {
    clearTimeout(coloredRegionsOverlay.resizeTimeout);
    coloredRegionsOverlay.resizeTimeout = setTimeout(() => {
        coloredRegionsOverlay.handleResize();
    }, 250);
});

// Export for use in other modules
window.ColoredRegionsOverlay = coloredRegionsOverlay;

// Debug functions for testing
window.ColoredRegionsDebug = {
    /**
     * Log actual pixel coordinates to see what we're generating
     */
    logActualPixelCoordinates(data, imageWidth, imageHeight) {
        console.log(' ACTUAL PIXEL COORDINATES:');
        console.log(`   Image size: ${imageWidth}x${imageHeight}`);
        console.log(`   Slide size: ${data.image_dimensions.width}x${data.image_dimensions.height}`);
        
        // Calculate scale factors
        const scaleX = imageWidth / data.image_dimensions.width;
        const scaleY = imageHeight / data.image_dimensions.height;
        console.log(`   Scale factors: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)}`);
        
        data.colored_regions.forEach((region, regionIndex) => {
            console.log(`   Region ${regionIndex}: ${region.color}`);
            
            region.path_data.forEach((path, pathIndex) => {
                console.log(`     Path ${pathIndex}:`);
                
                // Convert first few commands to see actual pixel values
                const sampleCommands = path.commands.slice(0, 3);
                sampleCommands.forEach((cmd, cmdIndex) => {
                    if (cmd.x !== undefined && cmd.y !== undefined) {
                        const pixelX = cmd.x * scaleX;
                        const pixelY = cmd.y * scaleY;
                        console.log(`       ${cmd.type} ${cmdIndex}: EMU(${cmd.x}, ${cmd.y}) → Pixel(${pixelX.toFixed(1)}, ${pixelY.toFixed(1)})`);
                    }
                });
                
                if (path.commands.length > 3) {
                    console.log(`       ... and ${path.commands.length - 3} more commands`);
                }
            });
        });
    },

    /**
     * Debug current image dimensions
     */
    checkImageDimensions() {
        const container = document.getElementById('bone-image-container');
        if (!container) {
            console.error('No bone image container found');
            return;
        }

        const images = container.querySelectorAll('img');
        console.log(` Found ${images.length} images in container`);
        
        images.forEach((img, index) => {
            console.log(`Image ${index}:`);
            console.log(`  - src: ${img.src}`);
            console.log(`  - naturalWidth: ${img.naturalWidth}px`);
            console.log(`  - naturalHeight: ${img.naturalHeight}px`);
            console.log(`  - offsetWidth: ${img.offsetWidth}px`);
            console.log(`  - offsetHeight: ${img.offsetHeight}px`);
            console.log(`  - clientWidth: ${img.clientWidth}px`);
            console.log(`  - clientHeight: ${img.clientHeight}px`);
            console.log(`  - getBoundingClientRect:`, img.getBoundingClientRect());
            console.log(`  - style.width: ${img.style.width}`);
            console.log(`  - style.height: ${img.style.height}`);
            console.log(`  - complete: ${img.complete}`);
            console.log(`  - loading: ${img.loading || 'not set'}`);
        });
    },

    /**
     * Create a BIG test overlay to prove the system works
     */
    testBigOverlay() {
        const container = document.getElementById('bone-image-container');
        if (!container) {
            console.error('No bone image container found');
            return;
        }

        // Clear existing overlays
        container.querySelectorAll('.colored-regions-overlay').forEach(el => el.remove());
        container.querySelectorAll('.test-overlay').forEach(el => el.remove());

        const images = container.querySelectorAll('img');
        console.log(`🧪 Creating BIG test overlays on ${images.length} images...`);

        images.forEach((img, index) => {
            const rect = img.getBoundingClientRect();
            const displayWidth = Math.max(img.offsetWidth, rect.width, img.clientWidth) || 400;
            const displayHeight = Math.max(img.offsetHeight, rect.height, img.clientHeight) || 300;
            
            console.log(`Image ${index}: ${displayWidth}x${displayHeight}px`);

            // Create SVG overlay
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'test-overlay');
            svg.setAttribute('width', displayWidth);
            svg.setAttribute('height', displayHeight);
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '1000';

            // Create BIG colored rectangles that should be VERY visible
            const regions = [
                { x: displayWidth * 0.1, y: displayHeight * 0.2, width: displayWidth * 0.3, height: displayHeight * 0.4, color: '#FF6600', name: 'Orange Test' },
                { x: displayWidth * 0.6, y: displayHeight * 0.3, width: displayWidth * 0.25, height: displayHeight * 0.35, color: '#FF00E6', name: 'Magenta Test' }
            ];

            regions.forEach((region, regionIndex) => {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', region.x);
                rect.setAttribute('y', region.y);
                rect.setAttribute('width', region.width);
                rect.setAttribute('height', region.height);
                rect.setAttribute('fill', region.color);
                rect.setAttribute('fill-opacity', '0.6');
                rect.setAttribute('stroke', region.color);
                rect.setAttribute('stroke-width', '3');
                
                console.log(`   Added ${region.name} rectangle: ${region.x.toFixed(1)}, ${region.y.toFixed(1)}, ${region.width.toFixed(1)}x${region.height.toFixed(1)}`);
                svg.appendChild(rect);
            });

            // Position container and add overlay
            if (container.style.position !== 'relative') {
                container.style.position = 'relative';
            }
            container.appendChild(svg);
        });

        console.log(' BIG test overlays created! You should see LARGE orange and magenta rectangles.');
        console.log(' Run ColoredRegionsDebug.clearTestOverlay() to remove');
    },

    /**
     * Create large anatomical region overlays instead of precise paths
     */
    testLargeRegions() {
        const container = document.getElementById('bone-image-container');
        if (!container) {
            console.error('No bone image container found');
            return;
        }

        // Clear existing overlays
        container.querySelectorAll('.colored-regions-overlay, .test-overlay').forEach(el => el.remove());

        const images = container.querySelectorAll('img');
        console.log(`🧪 Creating LARGE anatomical region overlays on ${images.length} images...`);

        images.forEach((img, index) => {
            const rect = img.getBoundingClientRect();
            const displayWidth = Math.max(img.offsetWidth, rect.width, img.clientWidth) || 400;
            const displayHeight = Math.max(img.offsetHeight, rect.height, img.clientHeight) || 300;
            
            console.log(`Image ${index}: ${displayWidth}x${displayHeight}px`);

            // Create SVG overlay
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'test-overlay');
            svg.setAttribute('width', displayWidth);
            svg.setAttribute('height', displayHeight);
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '1000';

            // Create LARGE anatomical regions like in your PowerPoint
            const regions = [
                // Green Pubis/Acetabulum region (large area in middle-lower part)
                { 
                    points: `${displayWidth*0.2},${displayHeight*0.4} ${displayWidth*0.6},${displayHeight*0.4} ${displayWidth*0.65},${displayHeight*0.7} ${displayWidth*0.5},${displayHeight*0.85} ${displayWidth*0.15},${displayHeight*0.75}`,
                    color: '#00FF00', name: 'Pubis/Acetabulum (Green)'
                },
                // Pink/Purple Ischium region (large area in bottom part)
                { 
                    points: `${displayWidth*0.1},${displayHeight*0.6} ${displayWidth*0.7},${displayHeight*0.6} ${displayWidth*0.75},${displayHeight*0.9} ${displayWidth*0.05},${displayHeight*0.95}`,
                    color: '#FF69B4', name: 'Ischium (Pink)'
                }
            ];

            regions.forEach((region, regionIndex) => {
                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                polygon.setAttribute('points', region.points);
                polygon.setAttribute('fill', region.color);
                polygon.setAttribute('fill-opacity', '0.6');
                polygon.setAttribute('stroke', '#000000');
                polygon.setAttribute('stroke-width', '3');
                polygon.setAttribute('stroke-opacity', '0.9');
                
                console.log(`   Added ${region.name} large anatomical region`);
                svg.appendChild(polygon);
            });

            // Position container and add overlay
            if (container.style.position !== 'relative') {
                container.style.position = 'relative';
            }
            container.appendChild(svg);
        });

        console.log(' LARGE anatomical region overlays created! You should see GREEN and PINK regions covering substantial bone areas.');
        console.log(' Run ColoredRegionsDebug.clearTestOverlay() to remove');
    },

    /**
     * Create filled bounding regions instead of precise paths
     */
    testBoundingRegions() {
        const container = document.getElementById('bone-image-container');
        if (!container) {
            console.error('No bone image container found');
            return;
        }

        console.log(' Testing BOUNDING REGION approach...');

        // Get current bone data
        const boneId = this.getCurrentBoneId(container);
        if (!boneId) return;

        coloredRegionsOverlay.fetchColoredRegionData(boneId).then(coloredData => {
            if (!coloredData) return;

            // Clear existing overlays
            container.querySelectorAll('.colored-regions-overlay, .test-overlay').forEach(el => el.remove());

            const images = container.querySelectorAll('img');
            images.forEach((img, imgIndex) => {
                const rect = img.getBoundingClientRect();
                const displayWidth = Math.max(img.offsetWidth, rect.width, img.clientWidth) || 400;
                const displayHeight = Math.max(img.offsetHeight, rect.height, img.clientHeight) || 300;
                
                const slideWidth = coloredData.image_dimensions.width;
                const slideHeight = coloredData.image_dimensions.height;

                console.log(`Image ${imgIndex}: ${displayWidth}x${displayHeight}px, Slide: ${slideWidth}x${slideHeight}EMU`);

                // Create SVG
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('class', 'test-overlay');
                svg.setAttribute('width', displayWidth);
                svg.setAttribute('height', displayHeight);
                svg.style.position = 'absolute';
                svg.style.top = '0';
                svg.style.left = '0';
                svg.style.pointerEvents = 'none';
                svg.style.zIndex = '1000';

                // For each region, create a FILLED RECTANGLE covering the coordinate bounds
                coloredData.colored_regions.forEach((region, regionIndex) => {
                    console.log(`Region ${regionIndex}: ${region.anatomical_name} (${region.color})`);

                    // Get all coordinates from all paths
                    let allX = [], allY = [];
                    region.path_data.forEach(path => {
                        path.commands.forEach(cmd => {
                            if (cmd.x !== undefined && cmd.y !== undefined) {
                                allX.push(cmd.x);
                                allY.push(cmd.y);
                            }
                        });
                    });

                    if (allX.length > 0 && allY.length > 0) {
                        // Get bounding box in EMUs
                        const minX = Math.min(...allX);
                        const maxX = Math.max(...allX);
                        const minY = Math.min(...allY);
                        const maxY = Math.max(...allY);

                        // Convert to pixels
                        const pixelMinX = (minX / slideWidth) * displayWidth;
                        const pixelMaxX = (maxX / slideWidth) * displayWidth;
                        const pixelMinY = (minY / slideHeight) * displayHeight;
                        const pixelMaxY = (maxY / slideHeight) * displayHeight;

                        const width = pixelMaxX - pixelMinX;
                        const height = pixelMaxY - pixelMinY;

                        console.log(`  Bounding box: (${pixelMinX.toFixed(1)}, ${pixelMinY.toFixed(1)}) ${width.toFixed(1)}x${height.toFixed(1)}px`);

                        // Create filled rectangle
                        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        rect.setAttribute('x', pixelMinX);
                        rect.setAttribute('y', pixelMinY);
                        rect.setAttribute('width', width);
                        rect.setAttribute('height', height);
                        rect.setAttribute('fill', `#${region.color}`);
                        rect.setAttribute('fill-opacity', '0.6');
                        rect.setAttribute('stroke', '#000000');
                        rect.setAttribute('stroke-width', '2');

                        svg.appendChild(rect);
                    }
                });

                // Add to container
                if (container.style.position !== 'relative') {
                    container.style.position = 'relative';
                }
                container.appendChild(svg);
            });

            console.log(' Created BOUNDING REGION overlays - should show large filled areas!');
        });
    },

    /**
     * Test colored regions for a specific bone
     * @param {string} boneId - Bone to test (e.g., 'pubis', 'ischium', 'ilium') 
     */
    async testBone(boneId) {
        const container = document.getElementById('bone-image-container');
        if (!container) {
            console.error('No bone image container found');
            return;
        }
        
        const result = await coloredRegionsOverlay.fetchColoredRegionData(boneId);
        if (result) {
            console.log(` Found colored region data for ${boneId}:`, result);
            console.log(`Slide: ${result.slide_number}`);
            console.log(`Dimensions: ${result.image_dimensions.width} x ${result.image_dimensions.height} EMUs`);
            console.log(`Regions: ${result.colored_regions.length}`);
            result.colored_regions.forEach((region, i) => {
                console.log(`  ${i+1}. ${region.anatomical_name} (${region.color_name} - #${region.color})`);
            });
        } else {
            console.log(` No colored region data found for ${boneId}`);
        }
    },

    /**
     * Test with current images in container
     */
    async testCurrentImages() {
        const container = document.getElementById('bone-image-container');
        if (!container) {
            console.error(' No bone image container found');
            return;
        }

        const images = container.querySelectorAll('img');
        console.log(` Found ${images.length} images in container`);
        
        if (images.length === 0) {
            console.log(' No images loaded. Please select a bone first.');
            return;
        }

        const boneId = container.dataset.boneId;
        console.log(`🦴 Current bone ID: ${boneId}`);

        if (!boneId) {
            console.log(' No bone ID found. Trying to force display with "pubis"...');
            await coloredRegionsOverlay.displayColoredRegions('pubis', container.querySelector('.image-item') || container.querySelector('.image-box') || container);
        } else {
            console.log(` Testing colored regions for current bone: ${boneId}`);
            await this.testBone(boneId);
        }
    },

    /**
     * Force overlay on current images
     */
    async forceOverlay(boneId = 'pubis') {
        const container = document.getElementById('bone-image-container');
        const imageContainer = container.querySelector('.image-item') || container.querySelector('.image-box') || container;
        
        console.log(' Force overlay test starting...');
        await coloredRegionsOverlay.displayColoredRegions(boneId, imageContainer);
    },

    /**
     * Test SVG overlay with simple shapes to verify the system works
     */
    testSimpleOverlay() {
        const container = document.getElementById('bone-image-container');
        if (!container) {
            console.error(' No bone image container found');
            return;
        }

        const imageContainer = container.querySelector('.image-item') || container.querySelector('.image-box') || container;
        const img = imageContainer?.querySelector('img');
        
        if (!img) {
            console.error(' No image found');
            return;
        }

        console.log('🧪 Creating test SVG overlay...');
        
        // Get image dimensions
        const imgWidth = img.offsetWidth;
        const imgHeight = img.offsetHeight;
        console.log(`Image dimensions: ${imgWidth}x${imgHeight}px`);

        // Clear existing overlays
        coloredRegionsOverlay.clearOverlays(imageContainer);

        // Create test SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'colored-regions-overlay test-overlay');
        svg.setAttribute('width', imgWidth);
        svg.setAttribute('height', imgHeight);
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '10';

        // Create test rectangles
        const testShapes = [
            { x: imgWidth * 0.1, y: imgHeight * 0.1, w: imgWidth * 0.3, h: imgHeight * 0.3, color: '#008000', label: 'Green Test' },
            { x: imgWidth * 0.6, y: imgHeight * 0.2, w: imgWidth * 0.25, h: imgHeight * 0.4, color: '#FF00E6', label: 'Magenta Test' },
            { x: imgWidth * 0.2, y: imgHeight * 0.6, w: imgWidth * 0.5, h: imgWidth * 0.2, color: '#FF6600', label: 'Orange Test' }
        ];

        testShapes.forEach((shape, index) => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', shape.x);
            rect.setAttribute('y', shape.y);
            rect.setAttribute('width', shape.w);
            rect.setAttribute('height', shape.h);
            rect.setAttribute('fill', shape.color);
            rect.setAttribute('fill-opacity', '0.5');
            rect.setAttribute('stroke', shape.color);
            rect.setAttribute('stroke-width', '2');
            rect.setAttribute('data-test-shape', shape.label);
            
            svg.appendChild(rect);
            console.log(` Added ${shape.label} rectangle: ${shape.x.toFixed(0)}, ${shape.y.toFixed(0)}, ${shape.w.toFixed(0)}x${shape.h.toFixed(0)}`);
        });

        // Position container and add overlay
        if (imageContainer.style.position !== 'relative' && imageContainer.style.position !== 'absolute') {
            imageContainer.style.position = 'relative';
        }
        
        imageContainer.appendChild(svg);

        console.log(' Test overlay created! You should see 3 colored rectangles over the image.');
        console.log(' Run ColoredRegionsDebug.clearTestOverlay() to remove');
    },

    /**
     * Clear test overlay
     */
    clearTestOverlay() {
        const container = document.getElementById('bone-image-container');
        if (container) {
            const testOverlays = container.querySelectorAll('.test-overlay');
            testOverlays.forEach(overlay => overlay.remove());
            console.log(' Test overlay cleared');
        }
    },



    /**
     * Analyze coordinate ranges in the data
     */
    async analyzeCoordinates(boneId = 'pubis') {
        const data = await coloredRegionsOverlay.fetchColoredRegionData(boneId);
        if (!data) {
            console.log(' No data found for analysis');
            return;
        }

        console.log(' COORDINATE ANALYSIS');
        console.log(`Slide dimensions: ${data.image_dimensions.width} x ${data.image_dimensions.height} EMUs`);
        
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        data.colored_regions.forEach((region, regionIndex) => {
            console.log(`\n Region ${regionIndex + 1}: ${region.anatomical_name}`);
            
            region.path_data.forEach((pathData, pathIndex) => {
                console.log(`  Path ${pathIndex + 1}: ${pathData.commands.length} commands`);
                
                pathData.commands.forEach(command => {
                    if (command.x !== undefined && command.y !== undefined) {
                        minX = Math.min(minX, command.x);
                        maxX = Math.max(maxX, command.x);
                        minY = Math.min(minY, command.y);
                        maxY = Math.max(maxY, command.y);
                    }
                    // Also check bezier control points
                    if (command.x1 !== undefined) {
                        minX = Math.min(minX, command.x1, command.x2);
                        maxX = Math.max(maxX, command.x1, command.x2);
                        minY = Math.min(minY, command.y1, command.y2);
                        maxY = Math.max(maxY, command.y1, command.y2);
                    }
                });
            });
        });

        console.log(`\n COORDINATE RANGES:`);
        console.log(`X range: ${minX} to ${maxX} (width: ${maxX - minX})`);
        console.log(`Y range: ${minY} to ${maxY} (height: ${maxY - minY})`);
        console.log(`\n AS PERCENTAGES OF SLIDE:`);
        console.log(`X: ${((minX / data.image_dimensions.width) * 100).toFixed(1)}% to ${((maxX / data.image_dimensions.width) * 100).toFixed(1)}%`);
        console.log(`Y: ${((minY / data.image_dimensions.height) * 100).toFixed(1)}% to ${((maxY / data.image_dimensions.height) * 100).toFixed(1)}%`);

        // Test current image dimensions
        const container = document.getElementById('bone-image-container');
        const img = container?.querySelector('img');
        if (img) {
            console.log(`\n CURRENT IMAGE DIMENSIONS: ${img.offsetWidth} x ${img.offsetHeight}px`);
            console.log(`🔄 CONVERTED PIXEL RANGES:`);
            const pixelMinX = (minX / data.image_dimensions.width) * img.offsetWidth;
            const pixelMaxX = (maxX / data.image_dimensions.width) * img.offsetWidth;
            const pixelMinY = (minY / data.image_dimensions.height) * img.offsetHeight;
            const pixelMaxY = (maxY / data.image_dimensions.height) * img.offsetHeight;
            console.log(`X: ${pixelMinX.toFixed(1)}px to ${pixelMaxX.toFixed(1)}px`);
            console.log(`Y: ${pixelMinY.toFixed(1)}px to ${pixelMaxY.toFixed(1)}px`);
        }
    },

    /**
     * List all available colored region files
     */
    listAvailableFiles() {
        console.log('Available colored region files:');
        coloredRegionsOverlay.coloredRegionFiles.forEach((file, i) => {
            console.log(`${i+1}. ${file}`);
        });
    },

    /**
     * Enable debug mode to see region outlines
     */
    enableDebugMode() {
        const container = document.getElementById('bone-image-container');
        if (container) {
            container.classList.add('debug-colored-regions');
            console.log(' Debug mode enabled - colored regions will have red outlines');
        }
    },

    /**
     * Disable debug mode
     */
    disableDebugMode() {
        const container = document.getElementById('bone-image-container');
        if (container) {
            container.classList.remove('debug-colored-regions');
            console.log(' Debug mode disabled');
        }
    }
};

console.log(' Colored Regions Overlay loaded!');
console.log('Available debug commands:');
console.log('- ColoredRegionsDebug.testSimpleOverlay() - Test with simple colored rectangles');
console.log('- ColoredRegionsDebug.clearTestOverlay() - Clear test rectangles');
console.log('- ColoredRegionsDebug.testBone("pubis") - Test a specific bone');
console.log('- ColoredRegionsDebug.testCurrentImages() - Test with current loaded images');
console.log('- ColoredRegionsDebug.forceOverlay("pubis") - Force overlay on current images');
console.log('- ColoredRegionsDebug.analyzeCoordinates("pubis") - Analyze coordinate ranges');
console.log('- ColoredRegionsDebug.enableDebugMode() - Show red outlines');
console.log('- ColoredRegionsDebug.disableDebugMode() - Hide red outlines');
console.log(' Quick start: Load bone images, then run ColoredRegionsDebug.testSimpleOverlay()');