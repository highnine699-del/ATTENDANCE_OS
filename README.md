# Attendance OS — LMU

A web application and Chrome extension for Landmark University students to track attendance, calculate safe skips, and plan recovery strategies.

## 🎯 Features

- **Dashboard**: Overall attendance health with per-course breakdown
- **Course Manager**: Add, edit, and delete courses
- **Smart Calculator**: Calculate safe skips and recovery plans
- **Portal Sync**: Chrome extension auto-extracts data from att2.lmu.edu.ng
- **Manual Entry**: Fallback form for manual attendance updates
- **Alert System**: Visual warnings for courses below 75% threshold
- **Data Persistence**: localStorage with export/import functionality
- **16 Pre-loaded Courses**: All LMU Omega Semester courses included

## 🚀 Quick Start

### Development (Localhost)

```bash
# Navigate to project directory
cd attendance-os

# Start HTTP server
python -m http.server 8080

# Open browser
# http://localhost:8080
```

### Load Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension/` folder
5. Pin the extension to your toolbar

### Sync Attendance

1. Login to att2.lmu.edu.ng in Chrome
2. Click the Attendance OS extension icon
3. Click "Scrape Attendance"
4. Open the web app (http://localhost:8080)
5. Click "Sync from Extension" in the Sync tab

## 📁 Project Structure

```
attendance-os/
├── index.html              # Main web app
├── css/                    # Stylesheets
│   ├── tokens.css          # Design tokens
│   ├── base.css            # Reset & base styles
│   ├── components.css      # UI components
│   └── layout.css          # Layout & responsive
├── js/                     # JavaScript modules
│   ├── main.js             # Entry point
│   ├── state.js            # State manager
│   ├── engine.js           # Calculation engine
│   ├── storage.js          # localStorage abstraction
│   ├── utils.js            # Utility functions
│   ├── validator.js        # Data validation
│   ├── extension-bridge.js # Extension communication
│   ├── data-initial.js     # Initial LMU courses
│   └── modules/            # Feature modules
│       ├── dashboard.js
│       ├── courses.js
│       ├── calculator.js
│       ├── sync.js
│       └── settings.js
├── extension/              # Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── content-scraper.js
│   ├── popup.html
│   ├── popup.js
│   ├── css/
│   └── icons/
└── docs/                   # Documentation
```

## 🎨 Tech Stack

- **Frontend**: Vanilla JavaScript (ES modules)
- **Storage**: localStorage
- **Extension**: Chrome MV3
- **Hosting**: GitHub Pages (production)
- **Styling**: Custom CSS with CSS variables

## 📊 Data Model

### Course Object

```json
{
  "courseCode": "EEE102",
  "courseTitle": "Introduction To Electrical And Electronics Engineering",
  "units": 2,
  "courseType": "CC",
  "totalClasses": 13,
  "attended": 10,
  "suppressed": 0,
  "percentage": 77,
  "lastUpdated": "2026-06-24T12:00:00Z",
  "syncSource": "extension",
  "notes": ""
}
```

### Global State

Stored in localStorage under key `attendanceOS_state`:

```json
{
  "courses": [],
  "semesterInfo": {
    "startDate": "2026-01-13",
    "endDate": "2026-04-26",
    "lectureWeeks": 13,
    "examDate": "2026-05-01"
  },
  "userSettings": {
    "passThresholdPercent": 75,
    "theme": "dark",
    "autoSync": false
  },
  "syncHistory": [],
  "lastSync": null
}
```

## 🔧 Configuration

### Settings

- **Pass Threshold**: Default 75% (configurable in Settings)
- **Theme**: Dark/Light mode
- **Auto-sync**: Enable/disable automatic sync on load

### Semester Info

Configure semester dates and lecture weeks in Settings:
- Start Date
- End Date
- Lecture Weeks
- Exam Date

## 📱 Usage Guide

### Dashboard

- View overall weighted attendance
- See courses at risk (below threshold)
- Check semester info and last sync time

### Courses

- Add new courses manually
- Edit attendance for existing courses
- Delete courses you no longer need
- View per-course statistics

### Calculator

- Set current week to see dynamic recovery needs
- View safe skips per course
- Get recovery recommendations

### Sync

- **From Extension**: Click to import scraped data
- **Manual Entry**: Update individual courses manually
- **Sync History**: View past sync operations

### Settings

- Adjust pass threshold percentage
- Change theme (dark/light)
- Update semester information
- Export/import data as JSON
- Reset all data

## 🚢 Deployment

### GitHub Pages

```bash
# 1. Create GitHub repo: highnine699/attendance-os
# 2. Push all files except extension/ folder
# 3. Settings → Pages → Source: main / root
# 4. Access at: https://highnine699-del.github.io/ATTENDANCE_TRACKER/
```

**Note**: The extension must be loaded locally for now. Chrome Web Store deployment is planned for Phase 2+.

## 🔒 Privacy

- All data stored locally in your browser
- No external servers or cloud storage
- Extension only accesses att2.lmu.edu.ng
- No tracking or analytics

## 🐛 Troubleshooting

### Extension not syncing

- Ensure you're logged into att2.lmu.edu.ng
- Check that the extension has proper permissions
- Try reloading the extension
- Use manual entry as fallback

### Data not persisting

- Check browser localStorage is enabled
- Try clearing cache and reloading
- Export data regularly as backup

### Calculator showing impossible recovery

- This means you need >100% attendance in remaining weeks
- Consider attending all remaining classes
- Check with course lecturer for options

## 📝 License

MIT License - Feel free to use and modify for your needs.

## 🤝 Contributing

This is a personal project for LMU students. Suggestions and improvements welcome!

## 📧 Support

For issues or questions, contact Josiah or open an issue in the GitHub repository.

---

**Built with ❤️ for LMU students**
