/**
 * Content script injected into localhost web app
 * Provides a bridge for the web app to communicate with the extension
 */

const targetOrigin = window.location.origin || '*';

// Listen for messages from the web app (via window.postMessage)
window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.source !== window || !event.data || typeof event.data.type !== 'string') return;

    const replyOrigin = event.origin || targetOrigin;

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
            }, replyOrigin);
        });
    }

    if (event.data.type === 'ATTENDANCE_OS_BRIDGE_PING') {
        window.postMessage({
            type: 'ATTENDANCE_OS_BRIDGE_READY',
            requestId: event.data.requestId
        }, replyOrigin);
    }
});

// Notify the web app that the bridge is ready
window.postMessage({
    type: 'ATTENDANCE_OS_BRIDGE_READY'
}, targetOrigin);
