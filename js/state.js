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
    }

    getUserId() {
        let userId = localStorage.getItem('attendanceOS_userId');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            localStorage.setItem('attendanceOS_userId', userId);
        }
        return userId;
    }

    getStorageKey() {
        return 'attendanceOS_state_' + this.getUserId();
    }

    async init() {
        this.storageKey = this.getStorageKey();
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                this.state = JSON.parse(saved);
            } catch (err) {
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
            lastUpdated: null,
            syncSource: 'initial',
            notes: ''
        }));
        this.state.semesterInfo = semesterInfo;
    }

    getCourses() {
        return this.state.courses;
    }

    getCourse(courseCode) {
        return this.state.courses.find(c => c.courseCode === courseCode);
    }

    updateCourse(courseCode, updates) {
        const course = this.getCourse(courseCode);
        if (course) {
            Object.assign(course, updates);
            course.lastUpdated = new Date().toISOString();
            this.persist();
            this.notify();
        }
    }

    addCourse(course) {
        this.state.courses.push({
            ...course,
            attended: 0,
            suppressed: 0,
            percentage: 0,
            totalClasses: 0,
            lastUpdated: new Date().toISOString(),
            syncSource: 'manual',
            notes: ''
        });
        this.persist();
        this.notify();
    }

    deleteCourse(courseCode) {
        this.state.courses = this.state.courses.filter(c => c.courseCode !== courseCode);
        this.persist();
        this.notify();
    }

    async syncFromExtension() {
        try {
            // Check if chrome is available (indicates extension is loaded)
            if (typeof chrome === 'undefined' || !chrome.runtime) {
                return { success: false, error: 'Extension not loaded. Please install the Attendance OS extension and reload this page.' };
            }

            // Wait for bridge to be ready
            const bridgeReady = await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve(false);
                }, 2000);

                const handler = (event) => {
                    if (event.data && event.data.type === 'ATTENDANCE_OS_BRIDGE_READY') {
                        clearTimeout(timeout);
                        window.removeEventListener('message', handler);
                        resolve(true);
                    }
                };

                window.addEventListener('message', handler);
            });

            // Use window.postMessage to communicate via content script bridge
            const data = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Extension bridge not responding. Please reload the page and ensure the extension is installed.'));
                }, 5000);

                const handler = (event) => {
                    if (event.data && event.data.type === 'ATTENDANCE_OS_SYNC_RESPONSE') {
                        clearTimeout(timeout);
                        window.removeEventListener('message', handler);
                        resolve(event.data.data);
                    }
                };

                window.addEventListener('message', handler);
                window.postMessage({ type: 'ATTENDANCE_OS_SYNC' }, '*');
            });

            if (data && data.courses) {
                data.courses.forEach(extCourse => {
                    const existing = this.getCourse(extCourse.courseCode);
                    if (existing) {
                        Object.assign(existing, {
                            attended: extCourse.attended,
                            suppressed: extCourse.suppressed,
                            percentage: extCourse.percentage,
                            totalClasses: extCourse.totalClasses,
                            lastUpdated: new Date().toISOString(),
                            syncSource: 'extension'
                        });
                    }
                });

                if (data.semesterInfo) {
                    this.state.semesterInfo = {
                        ...this.state.semesterInfo,
                        ...data.semesterInfo
                    };
                }

                this.recordSync('extension', data.courses.length);
                this.persist();
                this.notify();
                return { success: true, coursesUpdated: data.courses.length };
            }
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    recordSync(source, count) {
        this.state.syncHistory.push({
            timestamp: new Date().toISOString(),
            source,
            coursesUpdated: count,
            status: 'success'
        });
        this.state.lastSync = new Date().toISOString();
    }

    getSemesterInfo() {
        return this.state.semesterInfo;
    }

    getSettings() {
        return this.state.userSettings;
    }

    updateSettings(updates) {
        Object.assign(this.state.userSettings, updates);
        this.persist();
        this.notify();
    }

    persist() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(fn => fn(this.state));
    }

    getSyncHistory() {
        return this.state.syncHistory.slice(-10);
    }

    getLastSync() {
        return this.state.lastSync;
    }

    updateSemesterInfo(updates) {
        Object.assign(this.state.semesterInfo, updates);
        this.persist();
        this.notify();
    }

    getCurrentWeek() {
        return this.state.currentWeek || 1;
    }

    setCurrentWeek(week) {
        this.state.currentWeek = week;
        this.persist();
    }
}
