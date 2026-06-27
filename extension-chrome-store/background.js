/**
 * Attendance OS — Chrome Extension Background Service Worker
 * Copyright © 2025 Josiah. All rights reserved.
 * Licensed under the MIT License.
 */

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
            console.error('Scrape error:', err);
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }

    if (request.action === 'getAttendanceData') {
        chrome.storage.local.get('attendanceData', (result) => {
            if (chrome.runtime.lastError) {
                console.error('Storage get error:', chrome.runtime.lastError);
                sendResponse({ courses: [] });
                return;
            }
            sendResponse(result.attendanceData || { courses: [] });
        });
        return true;
    }

    if (request.action === 'saveAttendanceData') {
        chrome.storage.local.set({ attendanceData: request.data }, () => {
            if (chrome.runtime.lastError) {
                console.error('Storage set error:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
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
    if (!data || !data.courses) {
        chrome.action.setBadgeText({ text: '' });
        return;
    }
    const count = data.courses.filter(c => c.totalClasses > 0 && c.percentage < 75).length;
    if (count > 0) {
        chrome.action.setBadgeText({ text: count.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

async function scrapeAttendanceFromTab(tabId) {
    return new Promise((resolve, reject) => {
        let timeout;
        const listener = (request, sender) => {
            if (request.action !== 'scraped') return;
            if (!sender.tab || sender.tab.id !== tabId) return;

            clearTimeout(timeout);
            chrome.runtime.onMessage.removeListener(listener);
            updateBadgeFromData(request.data);
            resolve(request.data);
        };

        const cleanup = () => {
            clearTimeout(timeout);
            chrome.runtime.onMessage.removeListener(listener);
        };

        const attemptSend = (attempt = 0) => {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError) {
                    cleanup();
                    reject(new Error('Could not access the selected tab. Please reopen the LMU portal and try again.'));
                    return;
                }

                const tabUrl = tab?.url || '';
                if (!tabUrl.startsWith('https://att2.lmu.edu.ng/')) {
                    cleanup();
                    reject(new Error('Please open the LMU attendance portal before syncing.'));
                    return;
                }

                if (tab.status && tab.status !== 'complete') {
                    if (attempt < 8) {
                        setTimeout(() => attemptSend(attempt + 1), 500);
                        return;
                    }

                    cleanup();
                    reject(new Error('The LMU portal page is still loading. Please wait a moment and try again.'));
                    return;
                }

                chrome.tabs.sendMessage(tabId, { action: 'scrape' }, () => {
                    if (chrome.runtime.lastError) {
                        if (attempt < 8) {
                            setTimeout(() => attemptSend(attempt + 1), 500);
                            return;
                        }

                        cleanup();
                        reject(new Error('Could not communicate with the LMU portal page. Please refresh the page and try again.'));
                    }
                });
            });
        };

        chrome.runtime.onMessage.addListener(listener);

        timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Scrape timed out. Make sure you are on the LMU attendance page and try again.'));
        }, 15000);

        attemptSend();
    });
}
