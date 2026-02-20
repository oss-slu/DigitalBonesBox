# Colored Regions Overlay - Testing Guide

## Overview
This document provides guidance for manually testing the colored regions overlay feature that highlights specific anatomical regions on bone images. Automatic tests can be run by navigating to `templates/diagnostic-colored-regions.html` in a browser.

## What Was Implemented

### Files Created
1. **`templates/js/coloredRegionsOverlay.js`** - Main module for colored regions functionality
   - Fetches colored region data from GitHub data branch
   - Converts EMU coordinates to pixels
   - Converts path commands to SVG paths
   - Renders colored overlays on bone images

### Files Modified
1. **`templates/js/imageDisplay.js`** - Integration with image display
   - Imports colored regions module
   - Passes boneId to enable colored regions
   - Displays colored regions after images load
   - Clears colored regions when images change

2. **`templates/js/dropdowns.js`** - Pass boneId parameter
   - Updated to pass boneId to displayBoneImages function

3. **`templates/style.css`** - Styling for overlays
   - Added CSS for colored-regions-overlay
   - Ensures proper positioning and z-index layering
   - Added hover effects

## How It Works

### Data Flow
1. User selects a bone from dropdown
2. `loadBoneImages(boneId)` is called in dropdowns.js
3. `displayBoneImages(images, boneId)` is called with boneId
4. Images are rendered to the page
5. After each image loads, `displayColoredRegions(img, boneId)` is called
6. Module fetches colored region JSON from GitHub data branch
7. If file exists, SVG overlay is created and positioned over the image
8. If file doesn't exist (most bones), nothing happens - no error

### Coordinate Conversion
- PowerPoint uses EMU (English Metric Units) coordinates
- Each JSON file contains `image_dimensions` with slide width/height in EMUs
- Formula: `pixelValue = (emuValue / emuMax) × pixelMax`
- All coordinates are converted dynamically based on image dimensions

### Path Commands Supported
- `moveTo` → SVG `M x y` (move to starting point)
- `lineTo` → SVG `L x y` (straight line)
- `cubicBezTo` → SVG `C x1 y1 x2 y2 x y` (Bezier curve)
- `close` → SVG `Z` (close path)

## Testing Instructions

### 1. Start the Application
```bash
# Start the backend API server (if not running)
cd boneset-api
npm start

# Open the application
# Navigate to templates/boneset.html in your browser
```

### 2. Test Bones WITH Colored Regions
The following bones should have colored regions (approximately 14 bones):
- **pubis** - Should show green colored region
- **ilium** - Should show orange colored region
- **ischium** - Should show magenta colored region
- **ischium_and_ilium** - Should show both magenta and orange regions

**Test Steps:**
1. Select "Pelvis" boneset
2. Select each bone from the list above
3. Wait for images to load
4. Verify colored regions appear over the bone images
5. Check that colors match expectations (green, orange, magenta)
6. Verify bone details are visible through the colored overlay (semi-transparent)
7. Check browser console for any errors

**What to Verify:**
- ✅ Colored regions appear over bone images
- ✅ Colors are semi-transparent (40% opacity by default)
- ✅ Bone anatomy is clearly visible through colored areas
- ✅ Shapes match the bone anatomy (compare with PowerPoint if available)
- ✅ Multiple colored regions display correctly (when applicable)
- ✅ No console errors

### 3. Test Bones WITHOUT Colored Regions
Most bones do NOT have colored region data. This is normal.

**Test Steps:**
1. Select various bones that don't have colored regions
2. Verify images display normally without colored overlays
3. Check console - should see debug message: "No colored regions available for bone: [boneId]"
4. Verify no errors occur

**What to Verify:**
- ✅ Images display normally without colored regions
- ✅ No error messages (only debug messages are OK)
- ✅ Application continues to work normally

### 4. Test Responsive Design

**Desktop (1920px):**
- Colored regions should scale with images
- Shapes should remain accurate
- Colors should be clearly visible

**Tablet (768px):**
- Colored regions should scale proportionally
- No distortion of shapes
- Overlays remain aligned with images

**Mobile (375px):**
- Colored regions scale down with images
- Shapes maintain accuracy
- Everything remains visible and aligned

**How to Test:**
1. Open browser developer tools (F12)
2. Toggle device toolbar (responsive design mode)
3. Test at different screen sizes
4. Verify colored regions scale correctly

### 5. Test Edge Cases

**Switching Between Bones:**
1. Select a bone with colored regions
2. Wait for colored regions to appear
3. Select a different bone
4. Verify old colored regions are cleared
5. New colored regions appear (if available)

**Multiple Images:**
1. Select a bone with 2+ images
2. Verify colored regions appear on all images
3. Check that each image has its overlay correctly positioned

**Fast Switching:**
1. Quickly switch between multiple bones
2. Verify no overlapping or leftover colored regions
3. Check for any console errors

## Debugging

### Console Messages

**Normal Messages (Debug):**
- `"No colored regions available for bone: [boneId]"` - File doesn't exist, normal for most bones
- `"Loaded colored regions for [boneId]:"` - Successfully loaded data
- `"Created colored region: [anatomical_name] ([color_name])"` - Successfully created overlay
- `"Displayed N colored regions for [boneId]"` - Successfully displayed all regions

**Warning Messages:**
- `"Could not display colored regions for [boneId]:"` - Error occurred while displaying
- `"Image has zero dimensions, cannot display colored regions"` - Image not loaded properly
- `"Unknown path command type:"` - Unsupported path command in JSON

**Error Messages:**
- Network errors fetching JSON from GitHub
- SVG creation errors

### Browser Developer Tools

**Inspect Colored Regions:**
1. Open Developer Tools (F12)
2. Select "Elements" or "Inspector" tab
3. Find `<svg class="colored-regions-overlay">` elements
4. Inspect individual `<path>` elements within SVG
5. Check attributes: `fill` (color), `opacity`, `d` (path data)

**Check SVG Positioning:**
- SVG should have `position: absolute`
- SVG dimensions should match image dimensions
- SVG should be positioned at `top: 0; left: 0` relative to parent

**View Path Data:**
- Each `<path>` element has a `d` attribute with SVG path commands
- Format: `M x y L x y C x1 y1 x2 y2 x y Z`
- Coordinates should be in pixels, not EMUs

## Comparing with PowerPoint

If you have access to the original PowerPoint slides:

### Visual Comparison
1. Open PowerPoint slide with colored regions
2. Open same bone in the web application
3. Compare side-by-side:
   - Shape accuracy - do the colored areas match?
   - Color accuracy - are the colors the same or similar?
   - Transparency - is the bone visible underneath?
   - Position - are the colored areas in the correct location?

### Taking Screenshots
1. Take screenshot of PowerPoint slide
2. Take screenshot of web application
3. Overlay screenshots (using image editing software)
4. Check alignment and accuracy

### Shape Verification
- Colored regions should follow the bone anatomy exactly
- Curves should be smooth, not jagged
- Multiple regions should not have gaps or overlaps (unless in PowerPoint)
- Region boundaries should be clearly defined

## Known Limitations

1. **Limited Coverage:** Only ~14 bones have colored region data
2. **GitHub Dependency:** Requires internet connection to fetch JSON files from GitHub
3. **Static Positioning:** Colored regions don't rotate with rotated images (if rotation is applied)
4. **Browser Support:** Requires modern browser with SVG support

## Configuration

### Adjusting Transparency
In `coloredRegionsOverlay.js`, line 15:
```javascript
DEFAULT_OPACITY: 0.4  // Change this value (0.0 to 1.0)
```
- `0.4` = 40% opacity (current default)
- `0.3` = 30% opacity (more transparent)
- `0.5` = 50% opacity (less transparent)

### Changing Base URL
If colored region files move to a different location:
In `coloredRegionsOverlay.js`, line 13:
```javascript
BASE_URL: 'https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/annotations/ColoredRegions'
```

## Troubleshooting

### Problem: Colored regions don't appear
**Possible Causes:**
1. Bone doesn't have colored region data (normal for most bones)
2. Network error fetching from GitHub
3. Image not loaded yet
4. JSON file format incorrect

**Solutions:**
1. Check console for error messages
2. Verify bone should have colored regions
3. Check network tab in developer tools
4. Verify image loaded successfully

### Problem: Colored regions are misaligned
**Possible Causes:**
1. Image dimensions not correctly detected
2. Coordinate conversion error
3. SVG positioning issue

**Solutions:**
1. Check image `offsetWidth` and `offsetHeight` in console
2. Verify `image_dimensions` in JSON file
3. Inspect SVG element positioning with developer tools

### Problem: Colors are wrong
**Possible Causes:**
1. Color hex code incorrect in JSON
2. CSS override
3. Browser rendering issue

**Solutions:**
1. Inspect `<path>` element `fill` attribute
2. Check for CSS overrides in developer tools
3. Verify hex codes in JSON file include `#` symbol

### Problem: Shapes are distorted
**Possible Causes:**
1. Coordinate conversion using wrong dimensions
2. Path command error
3. SVG viewBox issue

**Solutions:**
1. Verify `image_dimensions` from JSON matches slide size
2. Check path commands in console
3. Inspect SVG element attributes

## Success Criteria

The feature is working correctly when:
- ✅ Colored regions appear on bones that have data
- ✅ No errors for bones without colored region data
- ✅ Colors are semi-transparent (bone visible underneath)
- ✅ Shapes accurately match PowerPoint slides
- ✅ Responsive - scales correctly on all devices
- ✅ Multiple regions display correctly
- ✅ Old regions are cleared when switching bones
- ✅ No console errors during normal operation

## Next Steps

After basic testing is complete:
1. **Accuracy Testing** - Compare with PowerPoint slides for at least 5 different bones
2. **User Feedback** - Get feedback from students/instructors on educational value
3. **Performance Testing** - Test with slow network connections
4. **Accessibility** - Consider adding ARIA labels for screen readers
5. **Documentation** - Update user documentation with colored regions feature

## Contact

For questions or issues:
- Check console for error messages
- Review this testing guide
- Examine the code comments in `coloredRegionsOverlay.js`
- Check GitHub issues for similar problems
