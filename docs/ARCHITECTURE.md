# Architecture Documentation

## Overview

Attendance OS is a modular vanilla JavaScript application with a Chrome extension for data extraction. The architecture follows a clean separation of concerns with no framework dependencies.

## System Components

### 1. Web Application

#### Entry Point
- `index.html`: Main HTML structure
- `js/main.js`: Application initialization and module loading

#### Core Layer
- `state.js`: Centralized state management with localStorage persistence
- `engine.js`: Pure calculation functions (no side effects)
- `storage.js`: localStorage abstraction layer
- `utils.js`: Shared utility functions
- `validator.js`: Data validation rules
- `extension-bridge.js`: Chrome extension message passing

#### Feature Modules
- `modules/dashboard.js`: Dashboard rendering and stats
- `modules/courses.js`: Course CRUD operations
- `modules/calculator.js`: Skip simulator and recovery planner
- `modules/sync.js`: Extension sync and manual entry
- `modules/settings.js`: User settings and data management

#### Presentation Layer
- `css/tokens.css`: Design tokens (colors, spacing, typography)
- `css/base.css`: Reset and base styles
- `css/components.css`: UI component styles
- `css/layout.css`: Layout and responsive design

### 2. Chrome Extension

#### Extension Components
- `manifest.json`: MV3 manifest with permissions
- `background.js`: Service worker for message handling
- `content-scraper.js`: Content script for att3.lmu.edu.ng
- `popup.html`: Extension popup UI
- `popup.js`: Popup logic and user interactions

#### Extension Architecture

```
┌─────────────────┐
│   Popup UI      │
│  (popup.js)     │
└────────┬────────┘
         │ chrome.runtime.sendMessage
         ▼
┌─────────────────┐
│  Background     │
│  (background.js)│
└────────┬────────┘
         │ chrome.tabs.sendMessage
         ▼
┌─────────────────┐
│  Content Script │
│ (content-scraper)│
└────────┬────────┘
         │ DOM scraping
         ▼
┌─────────────────┐
│ att3.lmu.edu.ng │
│   (Portal)      │
└─────────────────┘
```

## Data Flow

### Sync Flow (Extension → Web App)

1. User opens extension popup on att3.lmu.edu.ng
2. Popup triggers scrape via background service worker
3. Background worker injects content script
4. Content script scrapes attendance table from DOM
5. Scraped data returned to background worker
6. Background worker saves to chrome.storage.local
7. User opens web app and clicks "Sync from Extension"
8. Web app sends message to extension via extension-bridge.js
9. Extension responds with stored attendance data
10. Web app updates state and persists to localStorage

### Manual Entry Flow

1. User enters attendance data in Sync form
2. Validator checks data integrity
3. State manager updates course object
4. Engine recalculates percentage
5. State persisted to localStorage
6. UI re-renders with new data

### State Management

The StateManager class follows a unidirectional data flow:

```
User Action → State Update → Persist → Notify Subscribers → UI Re-render
```

**Key Principles:**
- Single source of truth (localStorage)
- Immutable updates (create new state objects)
- Subscriber pattern for reactivity
- Automatic persistence on every change

## Module Communication

### ES Module System

All JavaScript files use ES6 modules:

```javascript
import { StateManager } from './state.js';
import { renderDashboard } from './modules/dashboard.js';
```

### Extension Communication

Web app ↔ Extension uses Chrome runtime messaging:

```javascript
// Web app
chrome.runtime.sendMessage(
    { action: 'getAttendanceData' },
    (response) => { /* handle response */ }
);

// Extension background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getAttendanceData') {
        sendResponse(data);
    }
});
```

## Calculation Engine

The engine.js module contains pure functions with no side effects:

```javascript
// Pure function - no state mutation
export function calculatePercentage(attended, total) {
    if (total === 0) return 0;
    return Math.round((attended / total) * 100);
}

// Pure function - deterministic output
export function calculateSafeSkips(attended, total, threshold = 75) {
    const needed = Math.ceil((threshold / 100) * total);
    return Math.max(0, total - attended - (needed - attended));
}
```

**Benefits:**
- Easy to test
- Predictable behavior
- No hidden dependencies
- Reusable across modules

## CSS Architecture

### Design Tokens

All design values defined in tokens.css:

```css
:root {
    --primary: #10b981;
    --bg-dark: #0f172a;
    --space-md: 1rem;
    --fs-md: 1rem;
}
```

### Layered Approach

1. **tokens.css**: Design system values
2. **base.css**: Reset and element styles
3. **components.css**: Reusable UI components
4. **layout.css**: Grid, flexbox, responsive

### Responsive Strategy

Mobile-first with breakpoints:

```css
@media (max-width: 768px) {
    #app {
        flex-direction: column;
    }
}
```

## Error Handling

### Validation Layer

All user input passes through validator.js:

```javascript
export function validateAttendance(attended, total) {
    const errors = [];
    if (attended > total) {
        errors.push('Attended cannot exceed total classes');
    }
    return { valid: errors.length === 0, errors };
}
```

### Async Error Handling

Extension communication wrapped in try-catch:

```javascript
try {
    const data = await sendMessageToExtension('getAttendanceData');
    // process data
} catch (err) {
    console.error('Sync failed:', err);
    // show user-friendly error
}
```

## Performance Considerations

### localStorage Optimization

- Single storage key for all state
- JSON serialization/deserialization
- Minimal writes (persist on change only)

### DOM Updates

- Module-based rendering (replace entire module content)
- Event delegation where possible
- No framework overhead

### Extension Performance

- Content script runs at document_idle
- Lazy scraping (only on user action)
- chrome.storage.local for cached data

## Security Considerations

### Content Security

- Extension only accesses att3.lmu.edu.ng
- No inline scripts in extension
- Minimal permissions (storage, tabs)

### Data Privacy

- All data stored locally
- No external API calls
- No tracking or analytics
- Export/import for user control

## Testing Strategy

### Unit Testing (Future)

- Engine functions are pure and easily testable
- Validator functions have clear inputs/outputs
- Mock chrome.runtime for extension bridge tests

### Integration Testing (Future)

- Test full sync flow with mock extension
- Test state persistence across page reloads
- Test validation with various edge cases

### Manual Testing Checklist

- [ ] Dashboard renders with initial data
- [ ] Course CRUD operations work
- [ ] Calculator shows correct values
- [ ] Extension scrapes portal correctly
- [ ] Manual entry validates input
- [ ] Settings persist correctly
- [ ] Export/import preserves data

## Future Enhancements

### Phase 2+
- Chrome Web Store deployment
- Cloud sync option (Firebase/Supabase)
- Push notifications for low attendance
- Mobile app (React Native)
- Historical attendance tracking

### Phase 3+
- AI-powered attendance predictions
- Integration with LMU calendar
- Peer comparison (anonymous)
- Attendance trends visualization
