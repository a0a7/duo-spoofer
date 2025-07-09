# Auto 2FA - Unified Codebase Structure

This document describes the unified codebase structure for the Auto 2FA browser e**Shared Files (identical between browsers):**
- `options.html` - Extension options page
- `welcome/index.html` - Legacy welcome page  
- `welcome.js` - Legacy welcome page logic
- `welcome-page/` - Modern Svelte-based welcome page
- `libs/` - Third-party libraries (buffer.js, index.js)
- `images/` - All extension imagesion, which eliminates code duplication between Chrome and Firefox versions.

## Structure Overview

```
duo-spoofer/
├── src/
│   ├── shared/              # Files identical between browsers
│   │   ├── popup.js         # Unified popup logic with browser detection
│   │   ├── popup-template.html  # HTML template for popup
│   │   ├── encryption.js    # Unified encryption with browser detection
│   │   ├── options.html     # Options page (identical)
│   │   ├── welcome/index.html     # Welcome page (identical)
│   │   ├── welcome.js       # Welcome logic (identical)
│   │   └── libs/            # Third-party libraries
│   │       ├── buffer.js
│   │       └── index.js
│   ├── chrome-specific/     # Chrome-only files
│   │   └── (browser-specific overrides)
│   └── firefox-specific/    # Firefox-only files
│       └── (browser-specific overrides)
├── chrome/                  # Generated Chrome extension
├── firefox/                 # Generated Firefox extension
├── build.js                 # Build script
├── package.json            # NPM configuration
└── README-UNIFIED.md       # This file
```

## Key Features

### 1. Browser API Abstraction
The unified code uses a browser detection pattern:

```javascript
// Browser compatibility layer
const browserAPI = (function() {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome;
  } else if (typeof browser !== 'undefined' && browser.runtime) {
    return browser;
  } else {
    throw new Error('No compatible browser API found');
  }
})();

// Usage
await browserAPI.storage.local.get(key);
await browserAPI.tabs.query({active: true});
```

### 2. Template-Based HTML Generation
The `popup-template.html` includes placeholders that are replaced during build:

```html
<h4 id="disclaimerText">
  <!-- Disclaimer text will be set by build process -->
</h4>
```

### 3. Automatic Build Process
The build script:
- Copies shared files to both browser directories
- Replaces browser API calls (`browserAPI.` → `chrome.` or `browser.`)
- Injects browser-specific disclaimer text
- Generates appropriate manifest.json for each browser

## Usage

### Prerequisites
```bash
npm install
```

### Build Commands
```bash
# Build both Chrome and Firefox versions
npm run build

# Build only Chrome
npm run build:chrome

# Build only Firefox  
npm run build:firefox

# Clean build directories
npm run clean

# Development mode with file watching
npm run dev
```

### Migration from Existing Structure

1. **Backup your current code:**
   ```bash
   mv chrome chrome-backup
   mv firefox firefox-backup
   ```

2. **Move shared files to unified structure:**
   ```bash
   # Files that are identical go to src/shared/
   cp chrome-backup/options.html src/shared/
   cp chrome-backup/welcome/index.html src/shared/
   cp chrome-backup/welcome.js src/shared/
   cp -r chrome-backup/libs src/shared/
   ```

3. **Move browser-specific files:**
   ```bash
   # Files that differ go to browser-specific folders
   cp chrome-backup/manifest.json src/chrome-specific/
   cp firefox-backup/manifest.json src/firefox-specific/
   ```

4. **Build the unified versions:**
   ```bash
   npm run build
   ```

## File Categories

### Shared Files (identical between browsers)
- `options.html` - Extension options page
- `welcome/index.html` - Welcome/help page  
- `welcome.js` - Welcome page logic
- `libs/` - Third-party libraries (buffer.js, index.js)

### Unified Files (logic identical, APIs differ)
- `popup.js` - Main popup logic (uses browser detection)
- `encryption.js` - Encryption utilities (uses browser detection)
- `popup.html` - Popup template (disclaimer text differs)

### Browser-Specific Files
- `manifest.json` - Manifest V2 vs V3 differences
- `worker.js` - Background script differences
- `scan_script.js` - Content script differences
- `login_script.js` - Content script differences  
- `options.js` - Options logic differences
- `secure-storage.js` - Storage implementation differences
- `styles.css` - Style differences (if any)

## Benefits

### 1. Reduced Duplication
- ~70% reduction in duplicate code
- Single source of truth for shared logic
- Easier maintenance and updates

### 2. Consistency
- Ensures both browser versions stay in sync
- Prevents bugs from inconsistent implementations
- Unified testing approach

### 3. Easier Development
- Make changes once, builds for both browsers
- Automated browser API translation
- Hot reload during development

## Development Workflow

1. **Make changes in `src/shared/`** for features that work on both browsers
2. **Make changes in `src/browser-specific/`** for browser-specific features
3. **Run `npm run build`** to generate the final extensions
4. **Test both generated versions** before release

## Browser-Specific Considerations

### Chrome (Manifest V3)
- Uses `chrome.*` APIs
- Service worker background script
- Different permission model
- Action instead of browserAction

### Firefox (Manifest V2)  
- Uses `browser.*` APIs
- Persistent background page
- Traditional permission model
- browserAction instead of action

## Future Improvements

1. **TypeScript Support**: Add TypeScript for better type checking
2. **ESLint Integration**: Enforce code style consistency
3. **Automated Testing**: Unit tests for shared logic
4. **Hot Reload**: Development server with live reloading
5. **Bundle Optimization**: Webpack/Rollup for smaller builds

## Troubleshooting

### Build Issues
- Ensure Node.js is installed (version 14+)
- Run `npm install` to install dependencies
- Check that source files exist in `src/shared/`

### Browser API Issues
- Check browser console for API compatibility errors
- Verify manifest permissions match API usage
- Test with both `chrome.*` and `browser.*` namespaces

### File Not Found
- Ensure build script copies all necessary files
- Check that browser-specific overrides are in correct folders
- Verify file paths in manifest.json
