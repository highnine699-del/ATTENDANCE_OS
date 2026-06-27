/**
 * Attendance OS — Web App Bridge Script
 * Copyright © 2025 Josiah. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Content script injected into localhost web app
 * Provides a bridge for the web app to communicate with the extension
 */

const targetOrigin = (() => {
    const origin = window.location.origin;
    if (!origin) {
        console.error('Failed to determine window.location.origin. Bridge disabled.');
        throw new Error('Unsafe context for Attendance OS bridge');
    }

    const isSecure = origin.startsWith('https://') ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1');

    if (!isSecure) {
        console.error(`Insecure origin detected: ${origin}. Bridge disabled.`);
        throw new Error('Bridge only works over HTTPS or localhost');
    }

    return origin;
})();

window.addEventListener('message', (event) => {
    if (event.origin !== targetOrigin) {
        console.warn(`Rejected message from untrusted origin: ${event.origin}`);
        return;
    }
    if (event.source !== window || !event.data || typeof event.data.type !== 'string') return;

    if (event.data.type === 'ATTENDANCE_OS_SYNC') {
        chrome.runtime.sendMessage({ action: 'getAttendanceData' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Bridge getAttendanceData error:', chrome.runtime.lastError.message);
                response = { courses: [] };
            }
            window.postMessage({
                type: 'ATTENDANCE_OS_SYNC_RESPONSE',
                requestId: event.data.requestId,
                data: response
            }, targetOrigin);
        });
    }

    if (event.data.type === 'ATTENDANCE_OS_BRIDGE_PING') {
        window.postMessage({
            type: 'ATTENDANCE_OS_BRIDGE_READY',
            requestId: event.data.requestId
        }, targetOrigin);
    }
});

window.postMessage({
    type: 'ATTENDANCE_OS_BRIDGE_READY'
}, targetOrigin);
