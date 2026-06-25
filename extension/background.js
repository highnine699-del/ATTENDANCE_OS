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
            updateBadgeFromData(request.data);
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === 'updateBadge') {
        const count = request.count;
        if (count > 0) {
            chrome.action.setBadgeText({ text: count.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
        sendResponse({ success: true });
        return true;
    }
});

function updateBadgeFromData(data) {
    const count = (data?.courses || []).filter(c => c.percentage < 75).length;
    if (count > 0) {
        chrome.action.setBadgeText({ text: count.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

async function scrapeAttendanceFromTab(tabId) {
    await chrome.tabs.sendMessage(tabId, { action: 'scrape' });
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            chrome.runtime.onMessage.removeListener(listener);
            reject(new Error('Scrape timed out. Make sure you are on the LMU attendance page.'));
        }, 10000);

        const listener = (request) => {
            if (request.action === 'scraped') {
                clearTimeout(timeout);
                chrome.runtime.onMessage.removeListener(listener);
                updateBadgeFromData(request.data);
                resolve(request.data);
            }
        };
        chrome.runtime.onMessage.addListener(listener);
    });
}
