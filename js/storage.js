/**
 * Attendance OS — LocalStorage Management
 * Copyright © 2025 Josiah. All rights reserved.
 * Licensed under the MIT License.
 *
 * localStorage abstraction layer with user isolation
 * Note: StateManager in state.js handles most persistence directly.
 * These functions are used by settings module for data export/import.
 */

const USER_ID_KEY = 'attendanceOS_userId';
const STORAGE_KEY_PREFIX = 'attendanceOS_state_';

function getUserId() {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = generateUserId();
        localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
}

function generateUserId() {
    return 'user_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function getStorageKey() {
    return `${STORAGE_KEY_PREFIX}${getUserId()}`;
}

export function exportState() {
    try {
        const data = localStorage.getItem(getStorageKey());
        if (!data) return null;
        return JSON.stringify(JSON.parse(data), null, 2);
    } catch (err) {
        console.error('Failed to export state:', err);
        return null;
    }
}

export function importState(jsonString) {
    try {
        const state = JSON.parse(jsonString);
        localStorage.setItem(getStorageKey(), JSON.stringify(state));
        return true;
    } catch (err) {
        console.error('Failed to import state:', err);
        return false;
    }
}

export function clearState() {
    try {
        localStorage.removeItem(getStorageKey());
        localStorage.removeItem(USER_ID_KEY);
        return true;
    } catch (err) {
        console.error('Failed to clear state:', err);
        return false;
    }
}
