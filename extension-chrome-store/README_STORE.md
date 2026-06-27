Attendance OS — Chrome Web Store package

This folder is prepared for uploading to the Chrome Web Store. It uses `manifest.json` compatible with the store (no localhost host permissions).

Package contents:
- background.js
- content-scraper.js
- popup.html
- popup.js
- webapp-bridge.js
- css/*, icons/*
- manifest.json (store-safe)

To create the zip for upload:

On Windows (PowerShell):

```powershell
cd extension-chrome-store
Compress-Archive -Path * -DestinationPath ..\attendance-os-extension.zip -Force
```

On macOS / Linux:

```bash
cd extension-chrome-store
zip -r ../attendance-os-extension.zip .
```

Notes:
- Do NOT include `extension.pem` or `extension.crx` in the uploaded zip.
- The store build cannot include `http://localhost` host permissions.
