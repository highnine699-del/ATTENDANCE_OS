import { validateAttendance } from '../validator.js';
import { calculatePercentage } from '../engine.js';
import { formatDateTime } from '../utils.js';
import { showSuccess, showError, showInfo } from '../toast.js';
import { icons } from '../icons.js';


function parsePortalTable(text) {
    const lines = String(text || '').trim().split('\n');
    const courses = [];

    function safeInt(value) {
        const parsed = Number.parseInt(String(value).replace(/[^0-9\-]/g, ''), 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function safeFloat(value) {
        const parsed = Number.parseFloat(String(value).replace(/[^0-9\.\-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    // Skip header lines until we find the data rows
    let dataStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        const header = lines[i].toUpperCase();
        if (header.includes('SN') && header.includes('COURSE') && header.includes('UNITS')) {
            dataStartIndex = i + 1;
            break;
        }
    }

    if (dataStartIndex === -1) return null;

    for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.includes('Showing') || line.includes('entries') || line.includes('First')) break;

        let parts = line.split('\t').map(p => p.trim()).filter(p => p);
        if (parts.length < 8) {
            parts = line.split(/\s+/).filter(p => p);
        }

        if (parts.length >= 8) {
            const courseCode = String(parts[1] || '').trim().toUpperCase();
            const unitsText = parts[2] || '';
            const totalClasses = safeInt(parts[4]);
            const attended = safeInt(parts[5]);
            const suppressed = safeInt(parts[6]);
            const percentageText = parts[7] || '';

            const units = safeInt(unitsText);
            const percentage = safeFloat(percentageText);

            courses.push({
                courseCode,
                units,
                totalClasses,
                attended,
                suppressed,
                percentage
            });
        }
    }

    return courses;
}

export function renderSync(state, container) {
    const lastSync = state.getLastSync();
    const syncHistory = state.getSyncHistory();

    const html = `
        <div class="sync-module">
            <h2>Sync Data</h2>
            
            <div class="sync-section">
                <h3>${icons.progress} Sync via Portal Login</h3>
                <p>Enter your LMU portal credentials to sync attendance directly. Works on all devices (mobile & desktop).</p>
                <button id="sync-portal-btn" class="btn-primary">Sync via Portal Login</button>
                <p id="portal-sync-status" class="sync-message"></p>
            </div>

            <div class="sync-section">
                <h3>${icons.extension} Sync from Extension</h3>
                <p>Click below to import your latest attendance from the LMU portal (att3.lmu.edu.ng) via the Chrome extension.</p>
                <button id="sync-extension-btn" class="btn-secondary">Sync from Extension</button>
                <p id="sync-status" class="sync-message"></p>
            </div>

            <div class="sync-section">
                <h3>${icons.cloud} Sync from Cloud</h3>
                <p>Fetch attendance data from GitHub-hosted JSON (updated automatically). Use this on mobile or without the extension.</p>
                <button id="sync-cloud-btn" class="btn-secondary">Sync from Cloud</button>
                <p id="cloud-sync-status" class="sync-message"></p>
            </div>

            <div class="sync-section">
                <h3>${icons.clipboard} Paste from Portal</h3>
                <p>Copy the attendance table from att3.lmu.edu.ng and paste it below.</p>
                <textarea id="portal-paste" rows="10" placeholder="Paste the attendance table here...
Example:
SN	COURSE	UNITS	LECTURE_WEEKS	TOTAL_CLASS	NO_ATTENDED	NO_SUPPRESSED	PERCENTAGE	APPROVAL
1	ITE121	0CC	13	0	0	0	0.0%	2026-04-23 08:54:30"></textarea>
                <button id="parse-portal-btn" class="btn-primary">Import from Paste</button>
                <p id="paste-status" class="sync-message"></p>
            </div>

            <div class="sync-section">
                <h3>${icons.edit} Manual Entry</h3>
                <form id="manual-sync-form">
                    <label>Course Code: <input type="text" name="courseCode" required></label>
                    <label>Attended: <input type="number" name="attended" min="0" required></label>
                    <label>Total Classes: <input type="number" name="totalClasses" min="0" required></label>
                    <button type="submit" class="btn-secondary">Add/Update Course</button>
                </form>
            </div>

            <div class="sync-section sync-history">
                <h3>${icons.clipboard} Sync History</h3>
                ${syncHistory.length > 0 ? `
                    <ul>
                        ${syncHistory
                .reverse()
                .map(entry => `
                                <li>
                                    ${formatDateTime(entry.timestamp)} — 
                                    ${entry.source} (${entry.coursesUpdated} courses)
                                </li>
                            `)
                .join('')}
                    </ul>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">${icons.clipboard}</div>
                        <h3>No Sync History</h3>
                        <p>Your first sync will appear here once you import attendance data.</p>
                    </div>
                `}
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Event listeners
    document.getElementById('sync-portal-btn').addEventListener('click', () => {
        showPortalLoginModal(state);
    });

    document.getElementById('sync-extension-btn').addEventListener('click', async () => {
        const btn = document.getElementById('sync-extension-btn');
        const msg = document.getElementById('sync-status');
        const originalText = btn.textContent;

        btn.innerHTML = '<span class="spinner"></span>';
        btn.classList.add('btn-loading');
        msg.textContent = 'Syncing...';
        msg.classList.remove('success', 'error');

        const result = await state.syncFromExtension();

        btn.innerHTML = originalText;
        btn.classList.remove('btn-loading');

        if (result.success) {
            msg.innerHTML = `${icons.check} Synced ${result.coursesUpdated} courses`;
            msg.classList.add('success');
            showSuccess(`Synced ${result.coursesUpdated} courses`);
        } else {
            msg.innerHTML = `${icons.x} Sync failed: ${result.error}<br><small>Use Sync from Cloud or Paste from Portal below as a fallback.</small>`;
            msg.classList.add('error');
            showError(`Sync failed: ${result.error}`);
        }
    });

    document.getElementById('sync-cloud-btn').addEventListener('click', async () => {
        const btn = document.getElementById('sync-cloud-btn');
        const msg = document.getElementById('cloud-sync-status');
        const originalText = btn.textContent;

        btn.innerHTML = '<span class="spinner"></span>';
        btn.classList.add('btn-loading');
        msg.textContent = 'Syncing...';
        msg.classList.remove('success', 'error');

        const result = await state.syncFromCloud();

        btn.innerHTML = originalText;
        btn.classList.remove('btn-loading');

        if (result.success) {
            const timeAgo = result.lastUpdated ? ` (updated ${new Date(result.lastUpdated).toLocaleString()})` : '';
            msg.innerHTML = `${icons.check} Synced ${result.coursesUpdated} courses from cloud${timeAgo}`;
            msg.classList.add('success');
            showSuccess(`Synced ${result.coursesUpdated} courses from cloud`);
        } else {
            msg.innerHTML = `${icons.x} Cloud sync failed: ${result.error}<br><small>Use Paste from Portal or Manual Entry below as a fallback.</small>`;
            msg.classList.add('error');
            showError(`Cloud sync failed: ${result.error}`);
        }
    });

    document.getElementById('parse-portal-btn').addEventListener('click', () => {
        const textarea = document.getElementById('portal-paste');
        const msg = document.getElementById('paste-status');
        const text = textarea.value.trim();

        if (!text) {
            msg.innerHTML = `${icons.x} Please paste the attendance table first.`;
            msg.classList.add('error');
            showError('Please paste the attendance table first.');
            return;
        }

        const courses = parsePortalTable(text);
        if (!courses || courses.length === 0) {
            msg.innerHTML = `${icons.x} Could not parse the table. Make sure you copied the full table including headers.`;
            msg.classList.add('error');
            showError('Could not parse the table. Make sure you copied the full table including headers.');
            return;
        }

        let updatedCount = 0;
        courses.forEach(extCourse => {
            const existing = state.getCourse(extCourse.courseCode);
            if (existing) {
                state.updateCourse(extCourse.courseCode, {
                    attended: extCourse.attended,
                    suppressed: extCourse.suppressed,
                    percentage: extCourse.percentage,
                    totalClasses: extCourse.totalClasses,
                    syncSource: 'portal-paste'
                });
                updatedCount++;
            }
        });

        state.recordSync('portal-paste', updatedCount);

        msg.innerHTML = `${icons.check} Imported ${updatedCount} courses from portal table`;
        msg.classList.remove('error');
        msg.classList.add('success');
        showSuccess(`Imported ${updatedCount} courses from portal table`);
        textarea.value = '';
    });

    document.getElementById('manual-sync-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const courseCode = String(fd.get('courseCode') || '').trim().toUpperCase();
        const attended = Number.parseInt(fd.get('attended'), 10);
        const totalClasses = Number.parseInt(fd.get('totalClasses'), 10);
        const statusEl = document.getElementById('sync-status');

        if (!courseCode) {
            statusEl.innerHTML = `${icons.x} Course code is required.`;
            statusEl.classList.add('error');
            statusEl.classList.remove('success');
            return;
        }

        const validation = validateAttendance(attended, totalClasses);
        if (!validation.valid) {
            statusEl.innerHTML = `${icons.x} ${validation.errors.join(', ')}`;
            statusEl.classList.add('error');
            statusEl.classList.remove('success');
            return;
        }

        const course = state.getCourse(courseCode);
        if (course) {
            state.updateCourse(courseCode, {
                attended,
                totalClasses,
                percentage: calculatePercentage(attended, totalClasses),
                syncSource: 'manual'
            });
            statusEl.innerHTML = `${icons.check} Updated ${courseCode}`;
            statusEl.classList.remove('error');
            statusEl.classList.add('success');
        } else {
            statusEl.innerHTML = `${icons.x} Course ${courseCode} not found. Add it in Courses tab first.`;
            statusEl.classList.remove('success');
            statusEl.classList.add('error');
        }
        e.target.reset();
    });
}

function showPortalLoginModal(state) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <h3>Sync via Portal Login</h3>
                <button class="modal-close" aria-label="Close">${icons.x}</button>
            </div>
            <div class="modal-body">
                <p>Enter your LMU portal credentials to sync attendance directly.</p>
                <form id="portal-login-form">
                    <label>
                        <span>Username / Matric Number</span>
                        <input type="text" name="username" required autocomplete="username">
                    </label>
                    <label>
                        <span>Password</span>
                        <input type="password" name="password" required autocomplete="current-password">
                    </label>
                    <button type="submit" class="btn-primary">Sync Attendance</button>
                </form>
                <p id="portal-login-status" class="sync-message"></p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close button
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Form submission
    modal.querySelector('#portal-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const username = fd.get('username');
        const password = fd.get('password');
        const statusEl = document.getElementById('portal-login-status');
        const submitBtn = e.target.querySelector('button[type="submit"]');

        submitBtn.innerHTML = '<span class="spinner"></span> Syncing...';
        submitBtn.disabled = true;
        statusEl.textContent = 'Syncing...';
        statusEl.classList.remove('success', 'error');

        try {
            // Worker URL - deployed Cloudflare Worker
            const WORKER_URL = window.WORKER_URL || 'https://attendance-os-scrape-proxy.highnine699.workers.dev/api/scrape';
            
            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            // Clear password immediately after request
            e.target.reset();
            password = null;

            const result = await response.json();

            if (result.success) {
                let updatedCount = 0;
                result.attendance.forEach(course => {
                    const existing = state.getCourse(course.courseCode);
                    if (existing) {
                        state.updateCourse(course.courseCode, {
                            attended: course.attended,
                            suppressed: course.suppressed,
                            percentage: course.percentage,
                            totalClasses: course.totalClasses,
                            syncSource: 'portal-login'
                        });
                        updatedCount++;
                    }
                });

                if (result.semesterInfo && result.semesterInfo.lectureWeeks) {
                    state.updateSemesterInfo({ lectureWeeks: result.semesterInfo.lectureWeeks });
                }

                state.recordSync('portal-login', updatedCount);

                statusEl.innerHTML = `${icons.check} Synced ${updatedCount} courses`;
                statusEl.classList.add('success');
                showSuccess(`Synced ${updatedCount} courses via portal login`);

                // Close modal after success
                setTimeout(() => modal.remove(), 1500);
            } else {
                statusEl.innerHTML = `${icons.x} ${result.error}`;
                statusEl.classList.add('error');
                showError(result.error);
            }
        } catch (error) {
            e.target.reset();
            statusEl.innerHTML = `${icons.x} Sync failed. Please try again.`;
            statusEl.classList.add('error');
            showError('Sync failed. Please try again.');
        } finally {
            submitBtn.innerHTML = 'Sync Attendance';
            submitBtn.disabled = false;
        }
    });
}
