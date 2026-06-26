import {
    calculateSafeSkips, calculateRecoveryPlan, calcLecturesNeeded,
    getWeeksRemaining, getStatusMeta, getStatus, calculatePercentage
} from '../engine.js';
import { icons } from '../icons.js';

let _currentWeek = null;

function estimateCurrentWeek(semInfo, totalWeeks) {
    if (semInfo.startDate) {
        const start = new Date(semInfo.startDate);
        if (!Number.isNaN(start.getTime())) {
            const elapsed = (Date.now() - start.getTime()) / (7 * 864e5);
            return Math.min(Math.max(1, Math.ceil(elapsed)), totalWeeks);
        }
    }
    return 1;
}

export function renderCalculator(state, container) {
    const courses = state.getCourses();
    const settings = state.getSettings();
    const semInfo = state.getSemesterInfo();
    const threshold = settings.passThresholdPercent || 75;
    const totalWeeks = parseInt(semInfo.lectureWeeks) || 13;

    const currentWeek = _currentWeek !== null ? _currentWeek : estimateCurrentWeek(semInfo, totalWeeks);
    const weeksLeft = getWeeksRemaining(totalWeeks, currentWeek);

    const html = `
        <div class="calculator-module">
            <h2>Calculator</h2>

            <div class="calculator-controls">
                <label>
                    Current Week
                    <input type="number" id="current-week" min="1" max="${totalWeeks}" value="${currentWeek}">
                    <span class="control-sub">of ${totalWeeks} lecture weeks · ${weeksLeft} weeks remaining</span>
                </label>
            </div>

            <div class="courses-grid">
                ${courses.map(c => {
        const attended = c.attended || 0;
        const total = c.totalClasses || 0;
        const pct = calculatePercentage(attended, total);
        const status = total > 0 ? getStatus(pct, threshold) : 'no-data';
        const meta = getStatusMeta(status);
        const safeSkips = calculateSafeSkips(attended, total, threshold);
        const lectNeeded = calcLecturesNeeded(attended, total, threshold);
        // Estimate lectures per week for this course
        const lectPerWeek = total > 0 && currentWeek > 0 ? Math.max(1, Math.round((total / Math.min(currentWeek, totalWeeks)) * 10) / 10) : 1;
        const recovery = calculateRecoveryPlan(attended, total, weeksLeft, threshold, lectPerWeek);

        return `
                        <div class="course-card ${meta.cssClass}">
                            <h4>${c.courseCode}</h4>
                            <p class="course-title">${c.courseTitle}</p>
                            ${total > 0 ? `
                            <div class="attendance-bar-container">
                                <div class="attendance-bar" style="width:${Math.min(100, pct)}%;background:${meta.color}"></div>
                            </div>
                            <div class="course-stats">
                                <span>${attended}/${total}</span>
                                <span style="color:${meta.color};font-weight:600">${pct}%</span>
                            </div>
                            <div class="calculator-results">
                                ${pct >= threshold
                    ? `<p class="calc-good">✓ Safe — <strong>${safeSkips}</strong> skip${safeSkips !== 1 ? 's' : ''} remaining</p>`
                    : `<p class="calc-bad">✗ Below threshold — need <strong>${lectNeeded > 0 ? lectNeeded : '?'}</strong> consecutive classes</p>`
                }
                                <p class="recovery-msg">${recovery.message}</p>
                                <p class="weeks-left-note">${weeksLeft} weeks left · ~${lectPerWeek.toFixed(1)} lectures/week</p>
                            </div>` : `
                            <p class="muted" style="margin-top:.5rem">No attendance data yet</p>`}
                        </div>`;
    }).join('')}
            </div>

            <div class="what-if-section">
                <h3>${icons.crystal} What-If Simulator</h3>
                <div class="what-if-controls">
                    <label>Course
                        <select id="what-if-course">
                            <option value="">— Select —</option>
                            ${courses.map(c => `<option value="${c.courseCode}">${c.courseCode} — ${c.courseTitle}</option>`).join('')}
                        </select>
                    </label>
                    <label>Scenario
                        <select id="what-if-scenario">
                            <option value="attend">Attend next X classes</option>
                            <option value="skip">Skip next X classes</option>
                            <option value="perfect">Perfect attendance for rest of semester</option>
                        </select>
                    </label>
                    <label>Number of classes
                        <input type="number" id="what-if-number" min="1" max="50" value="3">
                    </label>
                    <button id="what-if-calculate" class="btn-primary">Simulate</button>
                </div>
                <div id="what-if-result"></div>
            </div>

            <div class="calculator-help">
                <h3>How it works</h3>
                <ul>
                    <li><strong>Safe Skips:</strong> Future classes you can miss and stay ≥ ${threshold}%</li>
                    <li><strong>Consecutive classes needed:</strong> To get back above ${threshold}% from below</li>
                    <li><strong>Recovery:</strong> Classes to attend out of remaining semester lectures</li>
                    <li><strong>Adjust current week</strong> to see how urgency changes over time</li>
                </ul>
            </div>
        </div>`;

    container.innerHTML = html;

    // Week input — persist value across re-renders
    document.getElementById('current-week')?.addEventListener('input', e => {
        const val = Number.parseInt(e.target.value, 10);
        if (Number.isFinite(val) && val >= 1 && val <= totalWeeks) {
            _currentWeek = val;
            renderCalculator(state, container);
        }
    });

    // What-if simulator
    document.getElementById('what-if-calculate')?.addEventListener('click', () => {
        const code = document.getElementById('what-if-course').value;
        const scenario = document.getElementById('what-if-scenario').value;
        const number = Number.parseInt(document.getElementById('what-if-number').value, 10);
        const resultDiv = document.getElementById('what-if-result');

        if (!code) {
            resultDiv.innerHTML = '<p class="error">Please select a course</p>';
            return;
        }
        if (!Number.isFinite(number) || number <= 0) {
            resultDiv.innerHTML = '<p class="error">Enter a positive number of classes</p>';
            return;
        }
        const course = state.getCourse(code);
        if (!course) return;

        let newAttended = course.attended || 0;
        let newTotal = course.totalClasses || 0;

        if (scenario === 'attend') { newAttended += number; newTotal += number; }
        else if (scenario === 'skip') { newTotal += number; }
        else if (scenario === 'perfect') {
            const lectPerWeek = newTotal > 0 && currentWeek > 0 ? Math.max(1, Math.round(newTotal / Math.min(currentWeek, totalWeeks))) : 1;
            const remaining = weeksLeft * lectPerWeek;
            newAttended += remaining;
            newTotal += remaining;
        }

        const oldPct = calculatePercentage(course.attended || 0, course.totalClasses || 0);
        const newPct = calculatePercentage(newAttended, newTotal);
        const diff = Math.round((newPct - oldPct) * 10) / 10;
        const oldMeta = getStatusMeta(getStatus(oldPct, threshold));
        const newMeta = getStatusMeta(getStatus(newPct, threshold));
        const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
        const diffColor = diff > 0 ? 'var(--color-very-safe)' : diff < 0 ? 'var(--color-critical)' : 'var(--text-secondary)';

        resultDiv.innerHTML = `
            <div class="what-if-result-card">
                <h4>Projection for ${code}</h4>
                <div class="result-comparison">
                    <div class="result-item">
                        <span class="label">Now</span>
                        <span class="value" style="color:${oldMeta.color}">${oldPct}%</span>
                        <span class="sub">${course.attended}/${course.totalClasses}</span>
                    </div>
                    <div class="result-arrow" style="color:${diffColor}">${arrow} ${Math.abs(diff)}%</div>
                    <div class="result-item">
                        <span class="label">After</span>
                        <span class="value" style="color:${newMeta.color}">${newPct}%</span>
                        <span class="sub">${newAttended}/${newTotal}</span>
                    </div>
                </div>
                <p class="result-status" style="color:${newMeta.color}">Status: ${newMeta.label}</p>
                <p class="result-detail">${scenario === 'attend' ? `After attending ${number} more classes` :
                scenario === 'skip' ? `After skipping ${number} classes` :
                    `With perfect attendance for remaining ${weeksLeft} weeks`}</p>
                ${newPct < threshold && oldPct >= threshold ? '<p style="color:var(--color-critical)">⚠️ This would drop you below threshold!</p>' : ''}
                ${newPct >= threshold && oldPct < threshold ? '<p style="color:var(--color-very-safe)">✓ This would bring you back to safe zone!</p>' : ''}
            </div>`;
    });
}
