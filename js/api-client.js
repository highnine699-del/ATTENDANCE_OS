/**
 * Attendance OS — API Client for Cloud Sync
 * Copyright © 2025 Josiah. All rights reserved.
 * Licensed under the MIT License.
 * 
 * Handles fetching attendance data from GitHub-hosted attendance.json
 * as a fallback when Chrome extension is not available (e.g., mobile)
 */

/**
 * Check if Chrome extension bridge is available
 * Uses window.postMessage ping/pong mechanism
 */
export async function checkExtensionPresence() {
    return new Promise((resolve) => {
        const pingId = `attendance_check_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        
        // Send ping
        window.postMessage({ type: 'ATTENDANCE_OS_BRIDGE_PING', requestId: pingId }, '*');
        
        // Wait for pong with timeout
        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        }, 1000);
        
        const handler = (e) => {
            if (e.source !== window) return;
            if (e.data?.type === 'ATTENDANCE_OS_BRIDGE_READY' && e.data.requestId === pingId) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    resolve(true);
                }
            }
        };
        
        window.addEventListener('message', handler);
    });
}

/**
 * Get attendance data from extension via window.postMessage
 * This is the existing path - DO NOT MODIFY
 */
export async function getFromExtensionStorage() {
    const syncRequestId = `attendance_sync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    return new Promise((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                window.removeEventListener('message', handler);
                reject(new Error('Extension not responding'));
            }
        }, 5000);
        
        const handler = (e) => {
            if (e.source !== window) return;
            if (e.data?.type === 'ATTENDANCE_OS_SYNC_RESPONSE' && e.data.requestId === syncRequestId) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    resolve(e.data.data);
                }
            }
        };
        
        window.addEventListener('message', handler);
        window.postMessage({ type: 'ATTENDANCE_OS_SYNC', requestId: syncRequestId }, '*');
    });
}

/**
 * Get attendance data from cloud (attendance.json)
 * Fallback path for mobile users without extension
 */
export async function getFromCloud() {
    try {
        const res = await fetch('/attendance.json', { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        return data;
    } catch (err) {
        console.error('Failed to fetch attendance.json:', err);
        throw err;
    }
}

/**
 * Main function to get attendance data
 * Tries extension first, falls back to cloud sync
 */
export async function getAttendanceData() {
    const extensionAvailable = await checkExtensionPresence();
    
    if (extensionAvailable) {
        try {
            const data = await getFromExtensionStorage();
            // Add syncSource marker for UI
            if (data && Array.isArray(data.courses)) {
                data.courses.forEach(c => {
                    if (c) c.syncSource = 'extension';
                });
            }
            return { data, source: 'extension' };
        } catch (err) {
            console.warn('Extension available but failed, falling back to cloud:', err);
            // Fall through to cloud sync
        }
    }
    
    // Cloud sync path
    try {
        const data = await getFromCloud();
        // Add syncSource marker for UI
        if (data && Array.isArray(data.courses)) {
            data.courses.forEach(c => {
                if (c) c.syncSource = 'cloud';
            });
        }
        return { data, source: 'cloud' };
    } catch (err) {
        console.error('Cloud sync also failed:', err);
        return { data: null, source: 'none', error: err.message };
    }
}

/**
 * Format time ago string from ISO timestamp
 */
export function formatTimeAgo(isoString) {
    if (!isoString) return 'unknown';
    
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
}
