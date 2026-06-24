# Data Model Reference

## Overview

Attendance OS uses a centralized state object stored in localStorage. This document describes the complete data schema.

## Storage Key

All data is stored under the key: `attendanceOS_state`

## Global State Schema

```typescript
interface GlobalState {
    courses: Course[];
    semesterInfo: SemesterInfo;
    userSettings: UserSettings;
    syncHistory: SyncEntry[];
    lastSync: string | null;
}
```

## Course Schema

```typescript
interface Course {
    courseCode: string;        // e.g., "EEE102"
    courseTitle: string;       // Full course title
    units: number;             // Credit units (0-5)
    courseType: "CC" | "UC";   // Core or University course
    totalClasses: number;      // Total scheduled classes
    attended: number;          // Classes attended
    suppressed: number;        // Suppressed absences
    percentage: number;        // Attendance percentage (0-100)
    lastUpdated: string;       // ISO timestamp
    syncSource: "extension" | "manual" | "initial";
    notes: string;             // User notes
}
```

### Example

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

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| courseCode | string | Yes | Unique course identifier |
| courseTitle | string | Yes | Full course name |
| units | number | Yes | Credit units (affects weighted average) |
| courseType | string | Yes | "CC" (Core) or "UC" (University) |
| totalClasses | number | Yes | Total scheduled classes for semester |
| attended | number | Yes | Number of classes attended |
| suppressed | number | Yes | Excused/suppressed absences |
| percentage | number | Yes | Calculated attendance % |
| lastUpdated | string | Yes | ISO 8601 timestamp |
| syncSource | string | Yes | Data source: extension, manual, or initial |
| notes | string | No | Free-form user notes |

### Validation Rules

- `attended` ≤ `totalClasses`
- `units` ≥ 0
- `percentage` = round((attended / totalClasses) * 100)
- `courseType` must be "CC" or "UC"

## Semester Info Schema

```typescript
interface SemesterInfo {
    startDate: string;         // ISO date (YYYY-MM-DD)
    endDate: string;           // ISO date (YYYY-MM-DD)
    lectureWeeks: number;      // Number of lecture weeks
    examDate: string;          // ISO date (YYYY-MM-DD)
    extractedFromPortal: boolean; // Auto-extracted flag
}
```

### Example

```json
{
    "startDate": "2026-01-13",
    "endDate": "2026-04-26",
    "lectureWeeks": 13,
    "examDate": "2026-05-01",
    "extractedFromPortal": false
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| startDate | string | No | Semester start date |
| endDate | string | No | Semester end date |
| lectureWeeks | number | No | Total lecture weeks (default: 13) |
| examDate | string | No | Exam period start date |
| extractedFromPortal | boolean | No | Whether data came from portal |

## User Settings Schema

```typescript
interface UserSettings {
    passThresholdPercent: number;  // Default: 75
    theme: "dark" | "light";       // Default: "dark"
    autoSync: boolean;              // Default: false
}
```

### Example

```json
{
    "passThresholdPercent": 75,
    "theme": "dark",
    "autoSync": false
}
```

### Field Descriptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| passThresholdPercent | number | 75 | Minimum passing percentage |
| theme | string | "dark" | UI theme preference |
| autoSync | boolean | false | Auto-sync on app load |

## Sync History Schema

```typescript
interface SyncEntry {
    timestamp: string;      // ISO timestamp
    source: string;         // "extension" or "manual"
    coursesUpdated: number; // Number of courses updated
    status: "success" | "error";
}
```

### Example

```json
{
    "timestamp": "2026-06-24T12:00:00Z",
    "source": "extension",
    "coursesUpdated": 16,
    "status": "success"
}
```

## Complete State Example

```json
{
    "courses": [
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
    ],
    "semesterInfo": {
        "startDate": "2026-01-13",
        "endDate": "2026-04-26",
        "lectureWeeks": 13,
        "examDate": "2026-05-01",
        "extractedFromPortal": false
    },
    "userSettings": {
        "passThresholdPercent": 75,
        "theme": "dark",
        "autoSync": false
    },
    "syncHistory": [
        {
            "timestamp": "2026-06-24T12:00:00Z",
            "source": "extension",
            "coursesUpdated": 16,
            "status": "success"
        }
    ],
    "lastSync": "2026-06-24T12:00:00Z"
}
```

## Initial Data

### Default Courses (16 LMU Omega Semester Courses)

Pre-loaded in `js/data-initial.js`:

```javascript
[
    { courseCode: "ITE121", courseTitle: "IT Essentials II", units: 0, courseType: "CC" },
    { courseCode: "LMU-PHY104", courseTitle: "General Physics IV", units: 2, courseType: "CC" },
    { courseCode: "CHM102", courseTitle: "General Chemistry II", units: 2, courseType: "CC" },
    { courseCode: "CHM108", courseTitle: "General Practical Chemistry II", units: 1, courseType: "CC" },
    { courseCode: "EEE102", courseTitle: "Introduction To Electrical And Electronics Engineering", units: 2, courseType: "CC" },
    { courseCode: "GET102", courseTitle: "Engineering Graphics and Solid Modelling I", units: 2, courseType: "CC" },
    { courseCode: "GST112", courseTitle: "Nigerian Peoples and Culture", units: 2, courseType: "CC" },
    { courseCode: "LMU-CFR121", courseTitle: "Communication in French", units: 1, courseType: "CC" },
    { courseCode: "LMU-STA112", courseTitle: "Probability I", units: 3, courseType: "CC" },
    { courseCode: "LMU-TMC121", courseTitle: "Total Man Concept II", units: 1, courseType: "UC" },
    { courseCode: "MTH102", courseTitle: "Elementary Mathematics 1", units: 2, courseType: "CC" },
    { courseCode: "PHY102", courseTitle: "General Physics II", units: 2, courseType: "CC" },
    { courseCode: "PHY108", courseTitle: "General Physics Practical II", units: 1, courseType: "CC" },
    { courseCode: "LMU-EDS121", courseTitle: "Entrepreneurial Development Studies II", units: 1, courseType: "UC" },
    { courseCode: "LMU-TMC112", courseTitle: "Total Man Concept - Sports", units: 0, courseType: "UC" },
    { courseCode: "ADC121", courseTitle: "Starting and Building Your Enterprise in Pepper and Leafy Vegetables", units: 1, courseType: "CC" }
]
```

### Default Semester Info

```javascript
{
    startDate: "2026-01-13",
    endDate: "2026-04-26",
    lectureWeeks: 13,
    examDate: "2026-05-01",
    extractedFromPortal: false
}
```

## Data Migration

### Versioning Strategy

Future versions will include a `version` field in the state object for migration:

```typescript
interface GlobalState {
    version: string;  // e.g., "1.0.0"
    // ... other fields
}
```

### Migration Example

```javascript
function migrateState(state) {
    if (!state.version || state.version < "2.0.0") {
        // Apply migration
        state.courses.forEach(course => {
            if (!course.notes) {
                course.notes = "";
            }
        });
        state.version = "2.0.0";
    }
    return state;
}
```

## Extension Data Format

### Scraped Data Schema

The extension scrapes and stores data in this format:

```typescript
interface ScrapedData {
    courses: ScrapedCourse[];
    semesterInfo?: Partial<SemesterInfo>;
}

interface ScrapedCourse {
    courseCode: string;
    units: number;
    totalClasses: number;
    attended: number;
    suppressed: number;
    percentage: number;
}
```

### Merge Strategy

When syncing from extension:

1. Match courses by `courseCode`
2. Update attendance data from extension
3. Preserve manual edits (courseTitle, notes)
4. Merge semester info if present
5. Record sync in history

## Export/Import Format

Exported JSON matches the complete GlobalState schema. Import validates structure before applying.

## Data Integrity

### Constraints

- All timestamps in ISO 8601 format
- Percentages rounded to integers
- Units are non-negative integers
- courseCode is unique identifier

### Backup Strategy

Users should:
1. Export data regularly via Settings
2. Keep backup JSON files
3. Import after clearing localStorage if needed

## Privacy Notes

- No personal identifiers stored
- No student ID or name
- Only course attendance data
- All data local to user's browser
