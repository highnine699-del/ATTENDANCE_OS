/**
 * Content script: runs on att2.lmu.edu.ng, scrapes the attendance table
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
        const data = scrapeAttendanceTable();
        chrome.runtime.sendMessage({ action: 'scraped', data });
    }
});

function scrapeAttendanceTable() {
    const courses = [];
    const semesterInfo = {};

    // Find the attendance table
    const table = document.querySelector('table');
    if (!table) return { courses, semesterInfo };

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 8) return;

        try {
            const courseCode = cells[1]?.textContent.trim();
            const unitsText = cells[2]?.textContent.trim();
            const totalClasses = parseInt(cells[4]?.textContent || 0);
            const attended = parseInt(cells[5]?.textContent || 0);
            const suppressed = parseInt(cells[6]?.textContent || 0);
            const percentageText = cells[7]?.textContent.trim();

            // Parse units: "2CC" -> 2, "0UC" -> 0
            const units = parseInt(unitsText) || 0;
            const percentage = parseInt(percentageText) || 0;

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

    // Extract semester info
    const headerText = document.body.textContent;
    if (headerText.includes('LECTURE_WEEKS')) {
        semesterInfo.lectureWeeks = 13; // Hardcode for now, parse dynamically later
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
