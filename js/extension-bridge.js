/**
 * Message passing bridge between web app and Chrome extension
 * 
 * NOTE: This file is deprecated. We now use window.postMessage via content script bridge
 * (extension/webapp-bridge.js) for communication between web app and extension.
 * 
 * Kept for reference in case we need to switch back to external messaging approach.
 */

export async function sendMessageToExtension(action, data = {}) {
    return new Promise((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.runtime) {
            reject(new Error('Chrome extension API not available'));
            return;
        }

        chrome.runtime.sendMessage(
            { action, ...data },
            (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            }
        );
    });
}

export async function getAttendanceDataFromExtension() {
    try {
        const response = await sendMessageToExtension('getAttendanceData');
        return response || { courses: [] };
    } catch (err) {
        console.error('Failed to get attendance data:', err);
        return { courses: [] };
    }
}

export async function triggerScrapeFromExtension() {
    try {
        const response = await sendMessageToExtension('scrapeAttendance');
        return response;
    } catch (err) {
        console.error('Failed to trigger scrape:', err);
        return { success: false, error: err.message };
    }
}

export function isExtensionAvailable() {
    return typeof chrome !== 'undefined' && chrome.runtime;
}
