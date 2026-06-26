/**
 * Content script: runs on att2.lmu.edu.ng, scrapes the attendance table
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
        const data = scrapeAttendanceTable();
        chrome.runtime.sendMessage({ action: 'scraped', data });
    }
});

function parseIntValue(text) {
    const cleaned = String(text || '').replace(/[^0-9\-]+/g, '');
    const parsed = parseInt(cleaned, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function parseFloatValue(text) {
    const cleaned = String(text || '').replace(/[^0-9\.\-]+/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function scrapeAttendanceTable() {
    const courses = [];
    const semesterInfo = {};

    // Find the attendance table using a heuristic to avoid wrong table selection
    const table = Array.from(document.querySelectorAll('table')).find((table) => {
        return /course|attendance|percentage|units/i.test(table.textContent);
    }) || document.querySelector('table');

    if (!table) return { courses, semesterInfo };

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 8) return;

        try {
            const courseCode = cells[1]?.textContent.trim();
            const unitsText = cells[2]?.textContent.trim();
            const totalClasses = parseIntValue(cells[4]?.textContent);
            const attended = parseIntValue(cells[5]?.textContent);
            const suppressed = parseIntValue(cells[6]?.textContent);
            const percentageText = cells[7]?.textContent.trim();

            const units = parseIntValue(unitsText);
            const percentage = parseFloatValue(percentageText);

            courses.push({
                courseCode,
                units,
                totalClasses,
                attended,
                suppressed,
                percentage
            });
        } catch (e) {
            console.warn('Row parse error:', e);
        }
    });

    const headerText = document.body.textContent || '';
    const lectureWeeksMatch = headerText.match(/LECTURE_WEEKS\s*[:=]\s*(\d+)/i);
    if (lectureWeeksMatch) {
        semesterInfo.lectureWeeks = parseInt(lectureWeeksMatch[1], 10);
    }

    return { courses, semesterInfo };
}

function tryAutoScrape() {
    const table = document.querySelector('table tbody tr');
    if (!table) return;

    const data = scrapeAttendanceTable();
    if (data.courses.length === 0) return;

    chrome.storage.local.set({ attendanceData: data }, () => {
        const atRisk = data.courses.filter(c => c.percentage < 75).length;
        chrome.runtime.sendMessage({
            action: 'updateBadge',
            count: atRisk
        });
        showSyncIndicator(data.courses.length);
    });
}

function showSyncIndicator(count) {
    const div = Object.assign(document.createElement('div'), {
        textContent: `✓ Attendance OS synced ${count} courses`,
        style: 'position:fixed;bottom:16px;right:16px;background:#10b981;color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);'
    });
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

if (document.readyState === 'complete') {
    tryAutoScrape();
} else {
    window.addEventListener('load', tryAutoScrape);
}
