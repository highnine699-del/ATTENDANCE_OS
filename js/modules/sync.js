import { validateAttendance } from '../validator.js';
import { calculatePercentage } from '../engine.js';
import { formatDateTime } from '../utils.js';
import { showSuccess, showError, showInfo } from '../toast.js';
import { icons } from '../icons.js';

async function processImageOCR(imageFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const result = await Tesseract.recognize(e.target.result, 'eng', {
                    logger: m => {}
                });
                resolve(result.data.text);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
    });
}

function parsePortalTable(text) {
    const lines = text.trim().split('\n');
    const courses = [];
    
    // Skip header lines until we find the data rows
    let dataStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('SN') && lines[i].includes('COURSE') && lines[i].includes('UNITS')) {
            dataStartIndex = i + 1;
            break;
        }
    }
    
    if (dataStartIndex === -1) return null;
    
    for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.includes('Showing') || line.includes('entries') || line.includes('First')) break;
        
        // Split by whitespace (handles tabs and spaces)
        const parts = line.split(/\s+/).filter(p => p);
        
        // Expected format: SN COURSE UNITS LECTURE_WEEKS TOTAL_CLASS NO_ATTENDED NO_SUPPRESSED PERCENTAGE APPROVAL
        if (parts.length >= 8) {
            const courseCode = parts[1];
            const unitsText = parts[2];
            const totalClasses = parseInt(parts[4]) || 0;
            const attended = parseInt(parts[5]) || 0;
            const suppressed = parseInt(parts[6]) || 0;
            const percentageText = parts[7];
            
            // Parse units: "2CC" -> 2, "0UC" -> 0
            const units = parseInt(unitsText) || 0;
            const percentage = parseFloat(percentageText) || 0;
            
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
                <h3>${icons.progress} Sync from Extension</h3>
                <p>Click below to import your latest attendance from the LMU portal (att2.lmu.edu.ng).</p>
                <button id="sync-extension-btn" class="btn-primary">Sync from Extension</button>
                <p id="sync-status" class="sync-message"></p>
            </div>

            <div class="sync-section">
                <h3>${icons.clipboard} Paste from Portal</h3>
                <p>Copy the attendance table from att2.lmu.edu.ng and paste it below.</p>
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
            msg.textContent = `${icons.check} Synced ${result.coursesUpdated} courses`;
            msg.classList.add('success');
            showSuccess(`Synced ${result.coursesUpdated} courses`);
        } else {
            msg.innerHTML = `${icons.x} Sync failed: ${result.error}<br><small>Use Paste from Portal or Manual Entry below as a fallback.</small>`;
            msg.classList.add('error');
            showError(`Sync failed: ${result.error}`);
        }
    });

    document.getElementById('parse-portal-btn').addEventListener('click', () => {
        const textarea = document.getElementById('portal-paste');
        const msg = document.getElementById('paste-status');
        const text = textarea.value.trim();
        
        if (!text) {
            msg.textContent = `${icons.x} Please paste the attendance table first.`;
            msg.classList.add('error');
            showError('Please paste the attendance table first.');
            return;
        }
        
        const courses = parsePortalTable(text);
        if (!courses || courses.length === 0) {
            msg.textContent = `${icons.x} Could not parse the table. Make sure you copied the full table including headers.`;
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
        
        msg.textContent = `${icons.check} Imported ${updatedCount} courses from portal table`;
        msg.classList.remove('error');
        msg.classList.add('success');
        showSuccess(`Imported ${updatedCount} courses from portal table`);
        textarea.value = '';
    });

    document.getElementById('manual-sync-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const courseCode = fd.get('courseCode').toUpperCase();
        const attended = parseInt(fd.get('attended'));
        const totalClasses = parseInt(fd.get('totalClasses'));

        const validation = validateAttendance(attended, totalClasses);
        if (!validation.valid) {
            document.getElementById('sync-status').textContent = `${icons.x} ${validation.errors.join(', ')}`;
            document.getElementById('sync-status').classList.add('error');
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
            document.getElementById('sync-status').textContent = `${icons.check} Updated ${courseCode}`;
            document.getElementById('sync-status').classList.remove('error');
            document.getElementById('sync-status').classList.add('success');
        } else {
            document.getElementById('sync-status').textContent = `${icons.x} Course ${courseCode} not found. Add it in Courses tab first.`;
            document.getElementById('sync-status').classList.add('error');
        }
        e.target.reset();
    });
}
