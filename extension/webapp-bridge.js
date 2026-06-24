/**
 * Content script injected into localhost web app
 * Provides a bridge for the web app to communicate with the extension
 */

// Listen for messages from the web app (via window.postMessage)
window.addEventListener('message', (event) => {
    // Verify the message is from the same origin
    if (event.source !== window) return;
    
    if (event.data && event.data.type === 'ATTENDANCE_OS_SYNC') {
        // Forward to extension background (content scripts can message directly)
        chrome.runtime.sendMessage({ action: 'getAttendanceData' }, (response) => {
            // Send response back to web app
            window.postMessage({
                type: 'ATTENDANCE_OS_SYNC_RESPONSE',
                data: response
            }, '*');
        });
    }
});

// Notify the web app that the bridge is ready
window.postMessage({
    type: 'ATTENDANCE_OS_BRIDGE_READY'
}, '*');
