# Attendance OS Chrome Extension

This is the Chrome extension for Attendance OS. It syncs attendance data from the LMU portal to the web app.

## Development

For local development, load the unpacked extension from this folder in Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this `extension/` folder

The development version includes localhost permissions for testing with the local web app.

## Building for Chrome Web Store

To build the Chrome Web Store version (without localhost permissions):

```bash
npm run build:extension:store
```

This will generate the `extension-chrome-store/` folder with:
- Localhost permissions removed (Chrome Web Store requirement)
- Modified `manifest.json` and `manifest.store.json`
- All other files identical to the source

Then package for upload:
```bash
cd extension-chrome-store
zip -r ../attendance-os-extension.zip .
```

**Note:** Do not include `extension.pem` or `dist/extension.crx` in the uploaded zip.

## Folder Structure

- `manifest.json` - Extension manifest (dev version with localhost)
- `background.js` - Service worker for message handling
- `popup.js` - Extension popup logic
- `popup.html` - Extension popup UI
- `content-scraper.js` - Scrapes attendance from LMU portal
- `webapp-bridge.js` - Bridges extension to web app
- `css/` - Extension styles
- `icons/` - Extension icons
