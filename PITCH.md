# Attendance OS — LMU
## Investor/Sponsor Pitch

---

## 🎯 Problem Statement

Landmark University students struggle with:
- **Manual attendance tracking** - No centralized way to monitor attendance across all courses
- **Uncertainty about standing** - Students don't know if they're at risk of failing attendance requirements
- **Poor planning** - No way to calculate safe skips or recovery strategies
- **Portal dependency** - Must login to att3.lmu.edu.ng repeatedly to check status
- **Data fragmentation** - Attendance data scattered across multiple systems

**Impact**: Students risk failing courses due to attendance, leading to academic setbacks and financial loss.

---

## 💡 Solution: Attendance OS

A comprehensive attendance management system with **web application + Chrome extension** that automates tracking, provides intelligent insights, and helps students stay on track academically.

---

## ✨ Core Features

### 1. **Dashboard - At-a-Glance Overview**
- Weighted attendance percentage across all courses
- Visual health score (safe/warning/danger)
- Courses at risk highlighted immediately
- Semester information display
- Last sync timestamp
- Quick sync button for instant updates

### 2. **Course Management**
- Add, edit, delete courses
- 16 LMU Omega Semester courses pre-loaded
- Per-course attendance tracking
- Course type classification (CC/UC)
- Units-based weighted calculations
- Notes field for personal tracking

### 3. **Smart Calculator**
- **Safe Skips**: Calculate how many classes can be missed while staying above threshold
- **Recovery Planning**: Determine required attendance percentage for remaining weeks
- **Dynamic Week Adjustment**: See how recovery needs change over time
- **Per-Course Breakdown**: Individual course analysis
- **Feasibility Indicators**: Shows if recovery is possible or impossible

### 4. **Multi-Method Data Sync**

#### A. Chrome Extension (Automated)
- One-click scraping from att3.lmu.edu.ng
- Auto-extracts attendance table
- Background processing
- Popup interface for quick sync
- Content script injection for seamless operation

#### B. Paste from Portal (Manual)
- Copy-paste attendance table from portal
- Intelligent table parser
- Handles tab/space separated formats
- Batch import of all courses

#### C. Manual Entry (Fallback)
- Individual course updates
- Validation for data integrity
- Form-based input
- Error handling

### 5. **Alert System**
- **Safe**: Green indicator (≥75%)
- **Warning**: Yellow indicator (50-74%)
- **Danger**: Red indicator (<50%)
- Configurable threshold (default 75%)
- Visual course card borders

### 6. **Data Management**
- **localStorage Persistence**: Data stays in browser
- **Export to JSON**: Backup your data
- **Import from JSON**: Restore from backup
- **Reset Functionality**: Clear all data
- **Sync History**: Track all data updates with timestamps

### 7. **Settings & Customization**
- Pass threshold percentage (0-100%)
- Theme selection (Dark/Light)
- Semester configuration (start/end dates, lecture weeks, exam date)
- Auto-sync toggle
- Extension ID configuration

### 8. **Responsive Design**
- Mobile-friendly interface
- Desktop-optimized layout
- Sidebar navigation
- Grid-based course cards
- Adaptive components

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Vanilla JavaScript (ES Modules)** - No framework dependencies
- **Custom CSS with CSS Variables** - Design tokens for theming
- **localStorage API** - Client-side data persistence
- **Module Pattern** - Clean separation of concerns

### Extension Stack
- **Chrome Manifest V3** - Latest extension standards
- **Service Worker** - Background processing
- **Content Scripts** - Portal scraping and web app bridge
- **Chrome Storage API** - Extension data storage
- **Message Passing** - Secure communication

### Code Organization
```
Core Modules:
- StateManager: Centralized state management
- Calculation Engine: Pure functions for attendance math
- Storage Layer: localStorage abstraction
- Validator: Data integrity checks
- Utils: Helper functions

Feature Modules:
- Dashboard: Overview and health
- Courses: CRUD operations
- Calculator: Safe skips and recovery
- Sync: Multi-method data import
- Settings: Configuration
```

### Data Model
```json
{
  "courses": [
    {
      "courseCode": "EEE102",
      "courseTitle": "Introduction To Electrical Engineering",
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
  ],
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

---

## 🎨 User Experience

### Workflow
1. **First Visit**: 16 courses pre-loaded, ready to use
2. **Sync Data**: Use extension or paste from portal
3. **Check Dashboard**: See overall attendance health
4. **Use Calculator**: Plan safe skips and recovery
5. **Track Progress**: Regular updates via sync
6. **Export Data**: Backup before exams

### Key UX Principles
- **Zero Configuration**: Works out of the box
- **Multiple Fallbacks**: Extension → Paste → Manual
- **Instant Feedback**: Real-time calculations
- **Visual Clarity**: Color-coded status indicators
- **Data Ownership**: User controls their data

---

## 📊 Value Metrics

### For Students
- **Time Saved**: 5+ hours per semester (no manual tracking)
- **Risk Reduction**: Early warning for attendance issues
- **Academic Planning**: Data-driven decisions about class attendance
- **Peace of Mind**: Always know your standing

### For University
- **Student Success**: Tool to help students meet attendance requirements
- **Reduced Appeals**: Fewer attendance-related grade appeals
- **Data Awareness**: Students more engaged with their academic progress

---

## 🚀 Deployment Options

### Current Status
- **Development**: Running on localhost:3000
- **Extension**: Loaded unpacked in Chrome
- **Production Ready**: Code complete and tested

### Production Deployment
1. **Web App**: GitHub Pages (free hosting)
   - URL: https://highnine699-del.github.io/ATTENDANCE_OS/
   - SSL included
   - CDN distribution

2. **Extension**: Chrome Web Store (Phase 2)
   - Reach 1000+ LMU students
   - Auto-updates
   - Trust verification

3. **Future Enhancements**:
   - Mobile app (React Native)
   - Backend API for cloud sync
   - Analytics dashboard for university
   - Integration with LMU LMS

---

## 🔒 Privacy & Security

- **Local-First**: All data stored in user's browser
- **No Cloud Servers**: No external data transmission
- **Portal-Only**: Extension only accesses att3.lmu.edu.ng
- **No Tracking**: No analytics or user monitoring
- **Open Source**: Transparent codebase
- **User Control**: Export/delete data anytime

---

## 💰 Sponsorship Opportunities

### What We Need
1. **Chrome Web Store Fee** ($5 one-time)
2. **Domain & Hosting** (for custom domain)
3. **Development Time** (for mobile app)
4. **University Partnership** (official integration)

### Sponsor Benefits
- **Brand Visibility**: Logo in app, credits page
- **User Access**: Direct reach to LMU students
- **Social Impact**: Helping students succeed academically
- **Innovation Showcase**: Demonstrate tech for education

---

## 📈 Growth Potential

### Target Market
- **Primary**: LMU students (~5,000)
- **Secondary**: Other Nigerian universities
- **Tertiary**: Global attendance tracking needs

### Scalability
- **Multi-University Support**: Easy to adapt for other schools
- **White-Label Solution**: License to other institutions
- **API Platform**: Attendance data as a service

---

## 🎓 Academic Impact

### Problem Solved
- Reduces attendance-related failures
- Improves academic planning
- Increases student engagement
- Provides data-driven insights

### Measurable Outcomes
- Higher attendance rates
- Fewer grade appeals
- Better academic performance
- Increased student satisfaction

---

## 🛠️ Development Roadmap

### Phase 1 (Complete) ✅
- Web application with all features
- Chrome extension for portal sync
- Paste from portal functionality
- Manual entry fallback
- Data export/import

### Phase 2 (Next)
- Chrome Web Store publication
- Custom domain deployment
- Mobile app prototype
- University partnership discussions

### Phase 3 (Future)
- Cloud sync option
- Analytics dashboard
- Multi-university support
- LMS integration

---

## 📞 Contact

**Developer**: Josiah (ODETAYO INIOLUWA JOSIAH)
**Student ID**: 2503744
**Email**: [your email]
**GitHub**: highnine699

---

## 🙏 Why Sponsor?

1. **Real Problem**: Solves actual student pain point
2. **Working Solution**: Fully functional, not just an idea
3. **Scalable**: Can expand to other universities
4. **Social Good**: Direct impact on student success
5. **Low Cost**: Minimal investment for maximum impact

---

**Attendance OS — Helping Students Stay on Track, One Class at a Time.**
