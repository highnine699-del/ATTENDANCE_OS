/**
 * Service Worker: handles message passing + data scraping
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrapeAttendance') {
        const tabId = request.tabId || (sender.tab ? sender.tab.id : null);
        if (!tabId) {
            sendResponse({ success: false, error: 'No tab ID provided' });
            return true;
        }
        scrapeAttendanceFromTab(tabId).then(data => {
            sendResponse({ success: true, data });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }

    if (request.action === 'getAttendanceData') {
        chrome.storage.local.get('attendanceData', (result) => {
            sendResponse(result.attendanceData || { courses: [] });
        });
        return true;
    }

    if (request.action === 'saveAttendanceData') {
        chrome.storage.local.set({ attendanceData: request.data }, () => {
            sendResponse({ success: true });
        });
        return true;
    }
});

async function scrapeAttendanceFromTab(tabId) {
    // Inject content scraper into tab
    await chrome.tabs.sendMessage(tabId, { action: 'scrape' });
    return new Promise((resolve) => {
        const listener = (request, sender) => {
            if (request.action === 'scraped') {
                chrome.runtime.onMessage.removeListener(listener);
                resolve(request.data);
            }
        };
        chrome.runtime.onMessage.addListener(listener);
    });
}
