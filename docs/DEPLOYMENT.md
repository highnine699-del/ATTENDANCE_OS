# Deployment Guide

## Overview

Attendance OS can be deployed in two ways:
1. **Development**: Local HTTP server
2. **Production**: GitHub Pages

## Development Deployment

### Prerequisites

- Python 3.x (or any HTTP server)
- Chrome browser (for extension)

### Steps

```bash
# 1. Navigate to project directory
cd attendance-os

# 2. Start HTTP server
python -m http.server 8080

# 3. Open browser
# Navigate to http://localhost:8080
```

### Alternative Servers

If Python is not available, use one of these:

```bash
# Node.js (http-server)
npx http-server -p 8080

# PHP
php -S localhost:8080

# Ruby
ruby -run -e httpd . -p 8080
```

### Load Extension (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle (top right)
3. Click "Load unpacked" button
4. Select the `extension/` folder in the project
5. Extension should appear in your extensions list
6. Pin it to your toolbar for easy access

### Development Workflow

1. Make code changes
2. Refresh browser (Ctrl+R or Cmd+R)
3. For extension changes: click "Refresh" icon in chrome://extensions/
4. Test changes

## Production Deployment (GitHub Pages)

### Prerequisites

- GitHub account
- Git installed
- GitHub repository: `highnine699/attendance-os`

### Step 1: Initialize Git Repository

```bash
cd attendance-os
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `attendance-os`
3. Make it Public
4. Do NOT initialize with README (we have one)
5. Click "Create repository"

### Step 3: Push to GitHub

```bash
# Add remote
git remote add origin https://github.com/highnine699/attendance-os.git

# Push main branch
git branch -M main
git push -u origin main
```

### Step 4: Enable GitHub Pages

1. Go to repository Settings
2. Scroll to "Pages" section (left sidebar)
3. Under "Build and deployment":
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`
4. Click "Save"

### Step 5: Access Deployed Site

After 1-2 minutes, your site will be available at:
```
https://highnine699-del.github.io/ATTENDANCE_TRACKER/
```

### Step 6: Update Extension for Production

Edit `extension/manifest.json` to allow production domain:

```json
{
    "externally_connectable": {
        "matches": [
            "http://localhost:*/*",
            "https://highnine699.github.io/*"
        ]
    }
}
```

Reload the extension after this change.

## Excluding Extension from Production

The extension folder should NOT be deployed to GitHub Pages. Use `.gitignore`:

```gitignore
# Ignore extension folder for GitHub Pages
extension/
```

Or create a separate repository for the extension.

## Continuous Deployment

### Manual Deployment

```bash
# Make changes
git add .
git commit -m "Update features"
git push origin main

# GitHub Pages auto-deploys from main branch
```

### Automated Deployment (Optional)

For automated deployment, use GitHub Actions:

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/configure-pages@v3
      - uses: actions/upload-pages-artifact@v2
        with:
          path: '.'
      - uses: actions/deploy-pages@v2
```

## Custom Domain (Optional)

### Step 1: Buy Domain

Purchase a domain from a registrar (e.g., Namecheap, GoDaddy).

### Step 2: Configure DNS

Add CNAME record:
```
Type: CNAME
Name: @
Value: highnine699.github.io
```

### Step 3: Update GitHub Pages

1. Go to repository Settings → Pages
2. Under "Custom domain", enter your domain
3. Save

### Step 4: Update Extension

Update `extension/manifest.json`:

```json
{
    "externally_connectable": {
        "matches": [
            "http://localhost:*/*",
            "https://highnine699.github.io/*",
            "https://yourdomain.com/*"
        ]
    }
}
```

## Chrome Web Store Deployment (Phase 2+)

### Prerequisites

- Google Developer Account ($5 one-time fee)
- Extension icons (16x16, 48x48, 128x128)
- Privacy policy page
- Verified developer identity

### Steps

1. **Prepare Extension**
   - Create proper icons
   - Add privacy policy link to manifest
   - Test thoroughly

2. **Zip Extension**
   ```bash
   cd extension
   zip -r attendance-os-extension.zip .
   ```

3. **Submit to Chrome Web Store**
   - Go to https://chrome.google.com/webstore/dev/dashboard
   - Click "Add new item"
   - Upload zip file
   - Fill in store listing details
   - Submit for review

4. **Wait for Review**
   - Review typically takes 3-7 days
   - Address any feedback from Google

### Store Listing Requirements

- Detailed description
- Screenshots (1280x800 or 640x400)
- Category: Education
- Language: English
- Privacy policy URL

## Environment Variables

Currently, no environment variables are needed. All configuration is in:
- User settings (stored in localStorage)
- Extension manifest (for permissions)

## Monitoring and Analytics (Optional)

For production monitoring, consider adding:

### Google Analytics

Add to head of `index.html`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Error Tracking (Sentry)

```html
<script src="https://cdn.jsdelivr.net/npm/@sentry/browser@7"></script>
<script>
  Sentry.init({
    dsn: "YOUR_DSN_HERE"
  });
</script>
```

**Note**: Only add analytics if users opt-in. Respect privacy.

## Backup and Recovery

### Export Data

Users can export data via Settings → Export Data. This creates a JSON backup.

### Automated Backups (Future)

Consider adding:
- LocalStorage to file download
- Cloud backup option (user-provided)
- Periodic backup reminders

## Rollback Strategy

If deployment breaks:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# GitHub Pages will auto-deploy the revert
```

Or use GitHub Pages rollback feature in Settings.

## Performance Optimization

### Production Checklist

- [ ] Minify CSS and JavaScript
- [ ] Enable gzip compression (GitHub Pages does this)
- [ ] Add cache headers (GitHub Pages handles this)
- [ ] Optimize images (if any added)
- [ ] Use CDN for static assets (optional)

### Minification

```bash
# Install minifier
npm install -g clean-css-cli terser

# Minify CSS
cleancss -o css/tokens.min.css css/tokens.css
cleancss -o css/base.min.css css/base.css
cleancss -o css/components.min.css css/components.css
cleancss -o css/layout.min.css css/layout.css

# Minify JS
terser js/main.js -o js/main.min.js
terser js/state.js -o js/state.min.js
# ... repeat for all JS files
```

Update HTML to use minified versions.

## Security Checklist

- [ ] No hardcoded secrets
- [ ] HTTPS enforced (GitHub Pages provides this)
- [ ] Content Security Policy (add to index.html)
- [ ] Subresource Integrity (for CDN links)
- [ ] Regular dependency updates (none currently)

### CSP Header

Add to `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
">
```

## Troubleshooting

### GitHub Pages Not Updating

- Check that you pushed to the correct branch
- Wait 2-3 minutes for deployment
- Check repository Settings → Pages for errors
- Clear browser cache

### Extension Not Connecting

- Verify `externally_connectable` matches your domain
- Reload extension after manifest changes
- Check browser console for errors
- Ensure extension is loaded unpacked (dev) or from store (prod)

### CORS Issues

- GitHub Pages doesn't have CORS issues for static files
- Extension communication uses Chrome messaging (not HTTP)
- No external API calls in current implementation

## Support

For deployment issues:
1. Check GitHub Pages status: https://www.githubstatus.com/
2. Review deployment logs in repository Settings → Pages
3. Check browser console for errors
4. Open an issue in the GitHub repository
