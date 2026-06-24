import { validateSettings } from '../validator.js';
import { exportState, importState, clearState } from '../storage.js';
import { icons } from '../icons.js';

export function renderSettings(state, container) {
    const settings = state.getSettings();
    const semesterInfo = state.getSemesterInfo();

    const html = `
        <div class="settings-module">
            <h2>Settings</h2>
            
            <div class="settings-section">
                <h3>${icons.edit} User Settings</h3>
                <form id="settings-form">
                    <label>
                        Your Name: 
                        <input type="text" name="userName" value="${settings.userName || ''}" placeholder="Enter your name">
                    </label>
                    <label>
                        Pass Threshold (%): 
                        <input type="number" name="passThresholdPercent" min="0" max="100" value="${settings.passThresholdPercent}">
                    </label>
                    <label>
                        Theme: 
                        <select name="theme">
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
                        </select>
                    </label>
                    <label>
                        <input type="checkbox" name="autoSync" ${settings.autoSync ? 'checked' : ''}>
                        Auto-sync on load
                    </label>
                    <button type="submit" class="btn-primary">Save Settings</button>
                </form>
            </div>

            <div class="settings-section">
                <h3>${icons.calendar} Semester Info</h3>
                <form id="semester-form">
                    <label>Start Date: <input type="date" name="startDate" value="${semesterInfo.startDate || ''}"></label>
                    <label>End Date: <input type="date" name="endDate" value="${semesterInfo.endDate || ''}"></label>
                    <label>Lecture Weeks: <input type="number" name="lectureWeeks" min="0" value="${semesterInfo.lectureWeeks || 13}"></label>
                    <label>Exam Date: <input type="date" name="examDate" value="${semesterInfo.examDate || ''}"></label>
                    <button type="submit" class="btn-secondary">Update Semester</button>
                </form>
            </div>

            <div class="settings-section">
                <h3>${icons.clipboard} Data Management</h3>
                <div class="data-actions">
                    <button id="export-btn" class="btn-secondary">Export Data</button>
                    <button id="import-btn" class="btn-secondary">Import Data</button>
                    <button id="reset-btn" class="btn-secondary" style="background: var(--alert-danger);">Reset All Data</button>
                </div>
                <input type="file" id="import-file" accept=".json" style="display: none;">
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Event listeners
    document.getElementById('settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const updates = {
            userName: fd.get('userName'),
            passThresholdPercent: parseInt(fd.get('passThresholdPercent')),
            theme: fd.get('theme'),
            autoSync: fd.get('autoSync') === 'on'
        };

        const validation = validateSettings(updates);
        if (!validation.valid) {
            alert(validation.errors.join('\n'));
            return;
        }

        state.updateSettings(updates);
        alert('Settings saved!');
        
        // Update user display if name changed
        if (updates.userName) {
            window.updateUserDisplay && window.updateUserDisplay();
        }
    });

    document.getElementById('semester-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const updates = {
            startDate: fd.get('startDate'),
            endDate: fd.get('endDate'),
            lectureWeeks: parseInt(fd.get('lectureWeeks')),
            examDate: fd.get('examDate')
        };

        state.updateSemesterInfo(updates);
        alert('Semester info updated!');
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        const data = exportState();
        if (data) {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'attendance-os-backup.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    });

    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const success = importState(event.target.result);
                if (success) {
                    alert('Data imported successfully! Refreshing...');
                    location.reload();
                } else {
                    alert('Failed to import data. Invalid JSON format.');
                }
            };
            reader.readAsText(file);
        }
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
            clearState();
            alert('Data reset. Refreshing...');
            location.reload();
        }
    });
}
