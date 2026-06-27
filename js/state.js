/**
 * Attendance OS — State Manager
 * Copyright © 2025 Josiah. All rights reserved.
 * Licensed under the MIT License.
 */

export class StateManager {
    constructor() {
        this.state = {
            courses: [],
            semesterInfo: {},
            userSettings: {
                passThresholdPercent: 75,
                theme: 'dark',
                autoSync: false,
                userName: ''
            },
            syncHistory: [],
            lastSync: null
        };
        this.storageKey = null;
        this.listeners = [];
        this.isSyncing = false;
        this.syncInProgress = null;
        this.syncAbortController = null;
    }

    getUserId() {
        let id = localStorage.getItem('attendanceOS_userId');
        if (!id) {
            id = 'user_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
            localStorage.setItem('attendanceOS_userId', id);
        }
        return id;
    }

    getStorageKey() { return 'attendanceOS_state_' + this.getUserId(); }

    async init() {
        this.storageKey = this.getStorageKey();
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                this.state = JSON.parse(saved);
                // Ensure history arrays exist for all courses (migration safety)
                if (this.state.courses) {
                    this.state.courses.forEach(c => {
                        if (!c.history) c.history = [];
                    });
                }
                // Ensure semesterInfo exists
                if (!this.state.semesterInfo) {
                    this.state.semesterInfo = {};
                }
                // Ensure userSettings exists
                if (!this.state.userSettings) {
                    this.state.userSettings = {
                        passThresholdPercent: 75,
                        theme: 'dark',
                        autoSync: false,
                        userName: ''
                    };
                }
            } catch (e) {
                console.error('Failed to parse saved state:', e);
                await this.loadInitialCourses();
            }
        } else {
            await this.loadInitialCourses();
        }
        this.persist();
    }

    async loadInitialCourses() {
        const { initialCourses, semesterInfo } = await import('./data-initial.js');
        this.state.courses = initialCourses.map(c => ({
            ...c,
            attended: 0,
            suppressed: 0,
            percentage: 0,
            totalClasses: 0,
            history: [],
            lastUpdated: null,
            syncSource: 'initial',
            notes: ''
        }));
        this.state.semesterInfo = semesterInfo;
    }

    // ── Courses ───────────────────────────────────────────────────────────
    getCourses() { return this.state.courses; }

    getCourse(courseCode) {
        return this.state.courses.find(c => c.courseCode === courseCode);
    }

    updateCourse(courseCode, updates, options = { notify: true }) {
        const course = this.getCourse(courseCode);
        if (!course) return;
        // Record history snapshot before updating
        if (!course.history) course.history = [];
        if (updates.attended !== undefined || updates.totalClasses !== undefined) {
            course.history.push({
                date: new Date().toISOString(),
                attended: course.attended,
                totalClasses: course.totalClasses,
                percentage: course.percentage,
                source: updates.syncSource || 'manual'
            });
            if (course.history.length > 30) course.history.splice(0, course.history.length - 30);
        }
        Object.assign(course, updates, { lastUpdated: new Date().toISOString() });
        if (options.notify) {
            this.persist();
            this.notify();
        }
    }

    addCourse(course) {
        this.state.courses.push({
            ...course,
            attended: 0, suppressed: 0, percentage: 0,
            totalClasses: 0, history: [],
            lastUpdated: new Date().toISOString(),
            syncSource: 'manual', notes: ''
        });
        this.persist();
        this.notify();
    }

    deleteCourse(courseCode) {
        this.state.courses = this.state.courses.filter(c => c.courseCode !== courseCode);
        this.persist();
        this.notify();
    }

    // ── Sync ──────────────────────────────────────────────────────────────
    getSyncStatus() {
        return {
            isSyncing: this.isSyncing,
            message: this.isSyncing ? 'Sync in progress...' : 'Ready'
        };
    }

    async syncFromExtension() {
        if (this.isSyncing) {
            if (this.syncInProgress) {
                return this.syncInProgress;
            }
            return { success: false, error: 'Sync already in progress. Please wait...' };
        }

        this.isSyncing = true;
        this.syncAbortController = new AbortController();

        try {
            this.syncInProgress = this._performSync(this.syncAbortController.signal);
            const result = await this.syncInProgress;
            return result;
        } catch (err) {
            if (err.name === 'AbortError') {
                return { success: false, error: 'Sync was cancelled' };
            }
            return { success: false, error: err.message };
        } finally {
            this.isSyncing = false;
            this.syncInProgress = null;
            this.syncAbortController = null;
        }
    }

    async _performSync(signal) {
        const pingId = `attendance_sync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        window.postMessage({ type: 'ATTENDANCE_OS_BRIDGE_PING', requestId: pingId }, '*');

        const bridgeReady = await new Promise((resolve, reject) => {
            if (signal.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }

            let h;
            const t = setTimeout(() => {
                window.removeEventListener('message', h);
                reject(new Error('Extension bridge not ready. Reload the page and ensure the extension is installed.'));
            }, 2000);
            h = e => {
                if (e.source !== window) return;
                if (e.data?.type === 'ATTENDANCE_OS_BRIDGE_READY' && e.data.requestId === pingId) {
                    clearTimeout(t);
                    window.removeEventListener('message', h);
                    resolve(true);
                }
            };
            const abortListener = () => {
                clearTimeout(t);
                window.removeEventListener('message', h);
                reject(new DOMException('Aborted', 'AbortError'));
            };
            signal.addEventListener('abort', abortListener);
            window.addEventListener('message', h);
        });

        if (!bridgeReady) {
            throw new Error('Extension bridge not ready. Reload the page and ensure the extension is installed.');
        }

        const syncRequestId = `attendance_sync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const data = await new Promise((resolve, reject) => {
            if (signal.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }

            let h;
            const t = setTimeout(() => {
                window.removeEventListener('message', h);
                reject(new Error('Extension not responding. Reload page with extension installed.'));
            }, 5000);
            h = e => {
                if (e.source !== window) return;
                if (e.data?.type === 'ATTENDANCE_OS_SYNC_RESPONSE' && e.data.requestId === syncRequestId) {
                    clearTimeout(t);
                    window.removeEventListener('message', h);
                    resolve(e.data.data);
                }
            };
            const abortListener = () => {
                clearTimeout(t);
                window.removeEventListener('message', h);
                reject(new DOMException('Aborted', 'AbortError'));
            };
            signal.addEventListener('abort', abortListener);
            window.addEventListener('message', h);
            window.postMessage({ type: 'ATTENDANCE_OS_SYNC', requestId: syncRequestId }, '*');
        });

        if (data && Array.isArray(data.courses)) {
            let updated = 0;
            data.courses.forEach(ec => {
                if (this.getCourse(ec.courseCode)) {
                    this.updateCourse(ec.courseCode, {
                        attended: ec.attended, suppressed: ec.suppressed,
                        percentage: ec.percentage, totalClasses: ec.totalClasses,
                        syncSource: 'extension'
                    }, { notify: false });
                    updated++;
                }
            });
            if (data.semesterInfo) {
                this.updateSemesterInfo(data.semesterInfo);
            }
            this.persist();
            this.notify();
            this.recordSync('extension', updated);
            return { success: true, coursesUpdated: updated };
        }
        throw new Error('No course data received from extension.');
    }

    cancelSync() {
        if (this.syncAbortController) {
            this.syncAbortController.abort();
        }
    }

    recordSync(source, count) {
        this.state.syncHistory.push({
            timestamp: new Date().toISOString(), source, coursesUpdated: count, status: 'success'
        });
        if (this.state.syncHistory.length > 50) {
            this.state.syncHistory.splice(0, this.state.syncHistory.length - 50);
        }
        this.state.lastSync = new Date().toISOString();
        this.persist();
        this.notify();
    }

    // ── Getters ───────────────────────────────────────────────────────────
    getSemesterInfo() { return this.state.semesterInfo || {}; }
    getSettings() { return this.state.userSettings || {}; }
    getLastSync() { return this.state.lastSync; }            // FIX: was accessed as state.state.lastSync
    getSyncHistory() { return (this.state.syncHistory || []).slice(-10); }

    // ── Setters ───────────────────────────────────────────────────────────
    updateSettings(updates) {
        Object.assign(this.state.userSettings, updates);
        this.persist();
        this.notify();
    }

    /** FIX: was state.state.semesterInfo = ... in settings.js, bypassing notify() */
    updateSemesterInfo(updates) {
        this.state.semesterInfo = { ...this.state.semesterInfo, ...updates };
        this.persist();
        this.notify();
    }

    // ── Persistence & pub/sub ─────────────────────────────────────────────
    persist() {
        try { localStorage.setItem(this.storageKey, JSON.stringify(this.state)); }
        catch (e) { console.error('Failed to persist state:', e); }
    }

    subscribe(listener) { this.listeners.push(listener); }

    notify() {
        const listeners = this.listeners.slice();
        listeners.forEach(fn => fn(this.state));
    }
}
