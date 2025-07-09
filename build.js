#!/usr/bin/env node

/**
 * Build script for Auto 2FA browser extension
 * Generates Chrome and Firefox versions from shared source code
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  sourceDir: './src',
  outputDir: '.',
  browsers: {
    chrome: {
      manifestVersion: 3,
      apiNamespace: 'chrome',
      disclaimer: 'By using this extension, you understand the <a href="https://github.com/FreshSupaSulley/Auto-2FA/blob/main/README.md#security" target="_blank">risks</a>, including unauthorized access or data loss. The developers are not liable for any consequences.'
    },
    firefox: {
      manifestVersion: 2,
      apiNamespace: 'browser',
      disclaimer: 'This extension is experimental. Functionality could break at any time. Always keep backup devices on your account. This extension is not recognized, endorsed, or affiliated with Duo Mobile or Cisco Technology.'
    }
  }
};

// Copy a file and optionally transform its content
function copyAndTransform(src, dest, transformer = null) {
  console.log(`Copying ${src} -> ${dest}`);
  
  if (!fs.existsSync(src)) {
    console.warn(`Warning: Source file ${src} does not exist`);
    return;
  }

  // Ensure destination directory exists
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Check if this is a binary file that shouldn't be transformed
  const ext = path.extname(src).toLowerCase();
  const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  
  if (binaryExtensions.includes(ext) || !transformer) {
    // Copy binary files directly
    fs.copyFileSync(src, dest);
  } else {
    // Read as text and apply transformations
    let content = fs.readFileSync(src, 'utf8');
    
    if (transformer) {
      content = transformer(content);
    }
    
    fs.writeFileSync(dest, content);
  }
}

// Copy directory recursively
function copyDirectory(src, dest, transformer = null) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath, transformer);
    } else {
      copyAndTransform(srcPath, destPath, transformer);
    }
  }
}

// Build for a specific browser
function buildBrowser(browserName) {
  const browserConfig = config.browsers[browserName];
  const outputPath = path.join(config.outputDir, browserName);
  
  console.log(`\nBuilding ${browserName}...`);
  
  // Create output directory
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Copy shared files with transformations
  const sharedPath = path.join(config.sourceDir, 'shared');
  
  // Copy popup HTML with disclaimer replacement
  const popupHtmlPath = path.join(sharedPath, 'popup-template.html');
  if (fs.existsSync(popupHtmlPath)) {
    copyAndTransform(
      popupHtmlPath,
      path.join(outputPath, 'popup.html'),
      (content) => content.replace(
        '<!-- Disclaimer text will be set by build process -->',
        browserConfig.disclaimer
      )
    );
  }

  // Copy and transform JavaScript files to use correct API namespace
  const jsFiles = ['popup.js', 'encryption.js', 'secure-storage.js'];
  for (const jsFile of jsFiles) {
    const srcPath = path.join(sharedPath, jsFile);
    if (fs.existsSync(srcPath)) {
      copyAndTransform(
        srcPath,
        path.join(outputPath, jsFile),
        (content) => {
          // Replace the browser API compatibility layer with direct API calls
          if (browserName === 'chrome') {
            return content.replace(/this\.browserAPI\./g, 'chrome.')
                         .replace(/browserAPI\./g, 'chrome.');
          } else {
            return content.replace(/this\.browserAPI\./g, 'browser.')
                         .replace(/browserAPI\./g, 'browser.');
          }
        }
      );
    }
  }

  // Copy other shared files without transformation
  const otherSharedFiles = ['options.html', 'welcome/index.html', 'welcome.js'];
  for (const file of otherSharedFiles) {
    const srcPath = path.join(sharedPath, file);
    if (fs.existsSync(srcPath)) {
      copyAndTransform(srcPath, path.join(outputPath, file));
    }
  }

  // Copy libs directory
  const libsPath = path.join(sharedPath, 'libs');
  if (fs.existsSync(libsPath)) {
    copyDirectory(libsPath, path.join(outputPath, 'libs'));
  }

  // Copy shared images
  const imagesPath = path.join(sharedPath, 'images');
  if (fs.existsSync(imagesPath)) {
    copyDirectory(imagesPath, path.join(outputPath, 'images'));
  }

  // Copy welcome page
  const welcomePagePath = path.join(sharedPath, 'welcome');
  if (fs.existsSync(welcomePagePath)) {
    copyDirectory(welcomePagePath, path.join(outputPath, 'welcome'));
  }

  // Copy browser-specific files
  const browserSpecificPath = path.join(config.sourceDir, `${browserName}-specific`);
  if (fs.existsSync(browserSpecificPath)) {
    copyDirectory(browserSpecificPath, outputPath);
  }

  console.log(`${browserName} build complete!`);
}

// Main build function
function build() {
  console.log('Starting Auto 2FA build process...');
  
  // Build for each browser
  for (const browserName of Object.keys(config.browsers)) {
    buildBrowser(browserName);
  }
  
  console.log('\nBuild process complete!');
  console.log('\nTo use the unified structure:');
  console.log('1. Edit files in src/shared/ for cross-browser changes');
  console.log('2. Edit files in src/browser-specific/ for browser-specific changes');
  console.log('3. Run npm run build to regenerate the extensions');
}

// Run the build
if (require.main === module) {
  build();
}

module.exports = { build, copyAndTransform, copyDirectory };
