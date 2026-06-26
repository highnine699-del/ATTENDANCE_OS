import { validateSettings } from '../validator.js';
import { exportState, importState, clearState } from '../storage.js';
import { calculatePercentage, calculateSafeSkips, getStatus } from '../engine.js';
import { icons } from '../icons.js';
import { showSuccess, showError } from '../toast.js';

export function renderSettings(state, container) {
    const settings = state.getSettings();
    const semInfo = state.getSemesterInfo();

    container.innerHTML = `
        <div class="settings-module">
            <h2>Settings</h2>

            <div class="settings-section">
                <h3>${icons.edit} User Settings</h3>
                <label>Your Name <input type="text" id="s-name" value="${settings.userName || ''}" placeholder="e.g. Josiah Odetayo"></label>
                <label>Pass Threshold (%)
                    <input type="number" id="s-threshold" min="0" max="100" value="${settings.passThresholdPercent}">
                    <span class="control-sub">LMU default is 75%</span>
                </label>
                <label>Theme
                    <select id="s-theme">
                        <option value="dark"  ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
                    </select>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="s-autosync" ${settings.autoSync ? 'checked' : ''}>
                    Auto-sync from extension on page load
                </label>
                <button id="s-save" class="btn-primary">Save Settings</button>
            </div>

            <div class="settings-section">
                <h3>${icons.calendar} Semester Info</h3>
                <label>Start Date  <input type="date" id="si-start" value="${semInfo.startDate || ''}"></label>
                <label>End Date    <input type="date" id="si-end"   value="${semInfo.endDate || ''}"></label>
                <label>Lecture Weeks <input type="number" id="si-weeks" min="1" max="30" value="${semInfo.lectureWeeks || 13}"></label>
                <label>Exam Date   <input type="date" id="si-exam"  value="${semInfo.examDate || ''}"></label>
                <button id="si-save" class="btn-secondary">Update Semester</button>
            </div>

            <div class="settings-section">
                <h3>${icons.clipboard} Data Management</h3>
                <div class="data-actions">
                    <button id="export-json-btn" class="btn-secondary">Export JSON</button>
                    <button id="export-csv-btn"  class="btn-secondary">Export CSV</button>
                    <button id="import-btn"      class="btn-secondary">Import JSON</button>
                    <button id="reset-btn" class="btn-secondary btn-danger">Reset All Data</button>
                </div>
                <input type="file" id="import-file" accept=".json" style="display:none">
            </div>
        </div>`;

    // Save user settings
    document.getElementById('s-save').addEventListener('click', () => {
        const prevTheme = settings.theme;
        const thresholdValue = Number(document.getElementById('s-threshold').value);
        const updates = {
            userName: document.getElementById('s-name').value.trim(),
            passThresholdPercent: Number.isFinite(thresholdValue) ? thresholdValue : NaN,
            theme: document.getElementById('s-theme').value,
            autoSync: document.getElementById('s-autosync').checked
        };
        const { valid, errors } = validateSettings(updates);
        if (!valid) { showError(errors.join(' · ')); return; }
        state.updateSettings(updates);
        window.updateUserDisplay?.();
        if (updates.theme !== prevTheme) {
            window.applyTheme?.(updates.theme);
            const activeModule = document.querySelector('.nav-item.active')?.dataset.module;
            if (activeModule && activeModule !== 'settings') {
                document.querySelector(`[data-module="${activeModule}"]`)?.click();
            }
        }
        showSuccess('Settings saved');
    });

    // Save semester info — FIX: was state.state.semesterInfo = {...} bypassing notify()
    document.getElementById('si-save').addEventListener('click', () => {
        const lectureWeeksInput = Number(document.getElementById('si-weeks').value);
        state.updateSemesterInfo({
            startDate: document.getElementById('si-start').value,
            endDate: document.getElementById('si-end').value,
            lectureWeeks: Number.isFinite(lectureWeeksInput) ? lectureWeeksInput : 13,
            examDate: document.getElementById('si-exam').value
        });
        showSuccess('Semester info updated');
    });

    // Export JSON
    document.getElementById('export-json-btn').addEventListener('click', () => {
        const data = exportState();
        if (!data) { showError('Nothing to export'); return; }
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), {
            href: url, download: `attendance-os-backup-${new Date().toISOString().slice(0, 10)}.json`
        });
        a.click(); URL.revokeObjectURL(url);
        showSuccess('JSON exported');
    });

    // Export CSV
    document.getElementById('export-csv-btn').addEventListener('click', () => {
        const courses = state.getCourses();
        const threshold = settings.passThresholdPercent || 75;
        const rows = [
            ['Course Code', 'Course Title', 'Units', 'Type', 'Attended', 'Total', 'Percentage', 'Status', 'Safe Skips'],
            ...courses.map(c => {
                const pct = calculatePercentage(c.attended, c.totalClasses);
                const status = getStatus(pct, threshold);
                const skips = calculateSafeSkips(c.attended, c.totalClasses, threshold);
                return [c.courseCode, `"${c.courseTitle}"`, c.units, c.courseType, c.attended, c.totalClasses, pct + '%', status, skips];
            })
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), {
            href: url, download: `attendance-os-${new Date().toISOString().slice(0, 10)}.csv`
        });
        a.click(); URL.revokeObjectURL(url);
        showSuccess('CSV exported');
    });

    // Import JSON
    document.getElementById('import-btn').addEventListener('click', () =>
        document.getElementById('import-file').click());

    document.getElementById('import-file').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            if (importState(ev.target.result)) {
                showSuccess('Data imported — reloading...');
                setTimeout(() => location.reload(), 1000);
            } else {
                showError('Import failed — invalid JSON');
            }
        };
        reader.readAsText(file);
    });

    // Reset
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (confirm('Reset ALL data? This cannot be undone.')) {
            clearState();
            showSuccess('Data cleared — reloading...');
            setTimeout(() => location.reload(), 1000);
        }
    });
}
