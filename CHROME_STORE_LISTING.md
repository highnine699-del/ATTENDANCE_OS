# Chrome Web Store Listing Copy

## Product Details

### Title
Attendance OS

### Summary
Auto-sync your LMU attendance from the portal and track your semester progress.

### Description (Full)

**Attendance OS** is a productivity extension for LMU students that automates attendance tracking and planning.

**Core Features:**
- **Auto-Sync:** One-click sync from the LMU attendance portal (att3.lmu.edu.ng) directly into your dashboard
- **Safe Skip Calculator:** Know exactly how many classes you can skip and still maintain your target percentage
- **Recovery Planning:** Get real-time feedback on what attendance rate you need to recover if below threshold
- **Weighted GPA Tracking:** Monitor your overall attendance health across all courses with unit-weighted averaging
- **Offline Access:** Full PWA support—access your data offline with automatic sync when reconnected
- **Dark Mode:** Eye-friendly theme toggle for extended study sessions

**Why Attendance OS?**
- **Zero Data Sharing:** All attendance data stays on your device—nothing is sent to external servers
- **LMU-Specific:** Built for the LMU portal's exact structure and semester format
- **Fast Decisions:** Instant answer to "Can I skip today?" based on your current attendance
- **Plan Ahead:** Semester-long projections help you stay on track before it's too late

**How It Works:**
1. Install the extension
2. Visit the LMU attendance portal and click "Sync Now" in the extension popup
3. Your courses and attendance data load instantly into the Attendance OS dashboard
4. Use the calculator to check safe skips, plan recovery, or view analytics
5. Sync anytime to keep your data current

**Privacy First:**
- Extension stores all data locally in your browser
- No tracking, no analytics, no account required
- Permissions are minimal and justified (storage for local data, tabs for portal access)

**Free & Open Source:**
Attendance OS is built for students, by a student developer. No ads, no premium tiers.

---

## Category
Productivity

## Language
English

---

## Additional Fields

### Official URL
(Leave blank or add GitHub repo if registered with Google Search Console)

### Homepage URL
https://github.com/highnine699/attendance-os

### Support URL
https://github.com/highnine699/attendance-os/issues

---

## Privacy & Compliance

### Single Purpose Description

Attendance OS has a single, narrow purpose: help LMU students track attendance data from the university portal, calculate safe class skips, and plan attendance recovery strategies. The extension syncs data from the LMU portal one-click sync, stores it locally, and provides calculation tools—nothing more.

### Storage Permission Justification

The `storage` permission is used exclusively to persist user attendance data, course information, and preferences (theme, pass threshold, user name) in the extension's local storage. This data never leaves the user's device.

### Tabs Permission Justification

The `tabs` permission allows the extension to interact with open browser tabs when the user initiates a sync from the LMU attendance portal. This enables the extension to detect the portal tab and inject the scraper script to extract attendance data.

### Host Permission Justification (att3.lmu.edu.ng)

This host permission is required to inject a content script into the LMU attendance portal that scrapes the attendance table. The script runs only when the user clicks "Sync Now" and extracts attendance data (course codes, units, attendance percentages) which is then sent back to the extension for local storage.

### Host Permission Justification (highnine699-del.github.io)

This host permission enables secure communication between the extension and the Attendance OS web app hosted on GitHub Pages. It allows the extension to check if the app is open and send sync data to the dashboard.

### Remote Code

**No, I am not using Remote code.**

All code is bundled within the extension package. No external JavaScript, WebAssembly, or evaluated strings are used.

---

## Data Usage Disclosure

### What user data do you plan to collect?

**None of the listed categories apply.** Attendance OS collects only:
- Attendance data entered or synced by the user (course codes, attendance counts, percentages)
- User preferences (theme, pass threshold, optional name)

This data is **stored locally only** and never transmitted to any remote service.

### Certifications

- ☑ I do not sell or transfer user data to third parties
- ☑ I do not use or transfer user data for purposes unrelated to attendance tracking
- ☑ I do not use or transfer user data to determine creditworthiness or lending

---

## Test Instructions

### Credentials
No login required.

### Additional Instructions

**To test the extension's core functionality:**

1. **Install & Open Popup:**
   - Install the extension from the zip
   - Click the Attendance OS icon in the browser toolbar
   - Verify the popup displays without console errors

2. **Test Auto-Sync (Requires LMU Portal Access):**
   - Open https://att3.lmu.edu.ng in a new tab
   - Log in with your LMU credentials
   - Navigate to the attendance page
   - Return to the extension popup and click "Scrape Now"
   - Verify the popup shows "Synced X courses" message
   - Click "Open Web App" to see the synced data in the dashboard

3. **Test Local Web App:**
   - Visit https://highnine699-del.github.io/ATTENDANCE_TRACKER/
   - Verify the app loads and displays a dashboard
   - Navigate to Settings and enter a user name
   - Add or import sample course data
   - Verify theme toggle and data persistence work
   - Check that all modules (Dashboard, Courses, Calculator, Analytics, Sync, Settings) render correctly

4. **Test Calculator (No Portal Access Required):**
   - In the web app, go to the Calculator module
   - Enter sample course data manually
   - Verify the "Safe Skips" and "Recovery Plan" calculations are correct
   - Test the "What If" simulator scenarios

5. **Test Offline Functionality:**
   - Open the web app
   - Toggle browser offline mode (DevTools → Network → Offline)
   - Verify the app still loads and displays cached data
   - Go back online

6. **Expected Results:**
   - No console errors
   - Attendance data syncs cleanly from the portal
   - Calculations are mathematically correct
   - Theme and settings persist across page reloads
   - App works offline with cached assets

---
