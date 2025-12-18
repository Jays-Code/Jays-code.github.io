const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PACKAGE_PATH = path.join(__dirname, 'skybox', 'AllSkyFree_v1.1.0.unitypackage');
const TEMP_DIR = path.join(__dirname, 'temp_unity_extract');
const OUTPUT_DIR = path.join(__dirname, 'img', 'skybox');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Clean/Create Temp Dir
if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEMP_DIR);

console.log('Extracting Unity Package...');

try {
    // 1. Decompress the package (Uses system 'tar' - available on Windows 10+)
    execSync(`tar -xzf "${PACKAGE_PATH}" -C "${TEMP_DIR}"`);
    console.log('Decompressed. Scanning assets...');

    // 2. Walk through the GUID folders
    const guidFolders = fs.readdirSync(TEMP_DIR);
    let extractedCount = 0;

    guidFolders.forEach(guid => {
        const itemPath = path.join(TEMP_DIR, guid);

        // Skip if not a directory
        if (!fs.statSync(itemPath).isDirectory()) return;

        const assetFile = path.join(itemPath, 'asset');
        const pathnameFile = path.join(itemPath, 'pathname');

        // Check if both files exist
        if (fs.existsSync(assetFile) && fs.existsSync(pathnameFile)) {
            // Read the original path from 'pathname' file
            // Unity stores it as first line usually (e.g., "Assets/Skybox/Space/Front.png")
            const originalPath = fs.readFileSync(pathnameFile, 'utf8').trim().replace(/[\r\n]/g, '');

            // Filter: We only want Skybox textures
            // Adjust this filter based on what we find. Looking for common image formats.
            if (/\.(png|jpg|jpeg|tga|tif)$/i.test(originalPath)) {
                // Determine destination name
                // Example: Assets/Skybox/DeepSpace/Front.png -> img/skybox/DeepSpace_Front.png

                // 1. Remove "Assets/" prefix
                let cleanPath = originalPath.replace(/^Assets\//, '');

                // 2. Flatten directory structure to filename to avoid making deep folders
                const safeName = cleanPath.split('/').join('_');

                const destPath = path.join(OUTPUT_DIR, safeName);

                // Copy
                fs.copyFileSync(assetFile, destPath);
                console.log(`Extracted: ${safeName}`);
                extractedCount++;
            }
        }
    });

    console.log(`\nSuccess! Extracted ${extractedCount} images to ${OUTPUT_DIR}`);

} catch (error) {
    console.error('Error during extraction:', error.message);
} finally {
    // Cleanup
    console.log('Cleaning up temp files...');
    try {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    } catch (e) {
        console.warn('Failed to clean temp dir:', e.message);
    }
}
