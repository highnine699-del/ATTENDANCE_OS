/**
 * Utility Functions
 * Shared helpers used across modules
 */

/**
 * Format percentage with 1 decimal place
 */
export function formatPercentage(value) {
    if (typeof value !== 'number') return '0%';
    return (Math.round(value * 10) / 10) + '%';
}

/**
 * Format date as readable string
 */
export function formatDate(date) {
    if (!date) return 'Never';
    if (typeof date === 'string') date = new Date(date);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format datetime as readable string
 */
export function formatDateTime(date) {
    if (!date) return 'Never';
    if (typeof date === 'string') date = new Date(date);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format time ago (e.g., "5 minutes ago")
 */
export function formatTimeAgo(date) {
    if (!date) return 'Never';
    if (typeof date === 'string') date = new Date(date);

    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
}

/**
 * Debounce function - delay execution until calls stop
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function - limit execution frequency
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
}

/**
 * Sort courses by criteria
 */
export function sortCourses(courses, sortBy = 'risk') {
    const sorted = [...courses];

    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
            break;
        case 'attendance':
            sorted.sort((a, b) => b.percentage - a.percentage);
            break;
        case 'risk':
        default:
            sorted.sort((a, b) => a.percentage - b.percentage);
    }

    return sorted;
}

/**
 * Filter courses by status
 */
export function filterCoursesByStatus(courses, status, threshold = 75) {
    return courses.filter(c => {
        if (status === 'very_safe') return c.percentage >= 90;
        if (status === 'safe') return c.percentage >= threshold && c.percentage < 90;
        if (status === 'warning') return c.percentage >= 50 && c.percentage < threshold;
        if (status === 'danger') return c.percentage >= 25 && c.percentage < 50;
        if (status === 'critical') return c.percentage < 25;
        return true;
    });
}

/**
 * Export data as JSON
 */
export function exportAsJSON(data, filename = 'attendance-os.json') {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadFile(blob, filename);
}

/**
 * Export data as CSV
 */
export function exportAsCSV(courses, filename = 'attendance.csv') {
    const headers = ['Course Code', 'Course Title', 'Units', 'Attended', 'Total', 'Percentage', 'Status'];
    const rows = courses.map(c => [
        c.courseCode,
        c.courseTitle,
        c.units,
        c.attended,
        c.totalClasses,
        c.percentage,
        c.percentage >= 75 ? 'SAFE' : 'AT RISK'
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    downloadFile(blob, filename);
}

/**
 * Download file (helper)
 */
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Get contrasting text color for background
 */
export function getTextColorForBackground(bgColor) {
    // Simple luminance calculation
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Generate unique ID
 */
export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Check if value is in range
 */
export function isInRange(value, min, max) {
    return value >= min && value <= max;
}

/**
 * Clamp value between min and max
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1, date2) {
    if (typeof date1 === 'string') date1 = new Date(date1);
    if (typeof date2 === 'string') date2 = new Date(date2);
    const diff = Math.abs(date2 - date1);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate weeks remaining in semester
 */
export function weeksRemaining(totalWeeks, currentWeek) {
    return Math.max(0, totalWeeks - currentWeek);
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(json, fallback = null) {
    try {
        return JSON.parse(json);
    } catch (err) {
        console.warn('JSON parse failed:', err);
        return fallback;
    }
}
