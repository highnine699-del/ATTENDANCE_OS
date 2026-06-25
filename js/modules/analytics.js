import {
    calculateWeightedAttendance, calculatePercentage, calculateSafeSkips,
    calcLecturesNeeded, calcCourseStats, getStatusMeta, getStatus
} from '../engine.js';
import { icons } from '../icons.js';

function getSemesterWeeks(semInfo) {
    const totalWeeks = parseInt(semInfo.lectureWeeks) || 13;
    if (!semInfo.startDate) return { currentWeek: 1, weeksLeft: totalWeeks - 1, totalWeeks };

    const start = new Date(semInfo.startDate);
    const elapsed = (Date.now() - start.getTime()) / (7 * 864e5);
    const currentWeek = Math.min(Math.max(1, Math.ceil(elapsed)), totalWeeks);
    const weeksLeft = Math.max(0, totalWeeks - currentWeek);
    return { currentWeek, weeksLeft, totalWeeks };
}

function projectEndPercentage(course, semInfo) {
    const attended = course.attended || 0;
    const total = course.totalClasses || 0;
    if (total <= 0) return null;

    const { currentWeek, weeksLeft } = getSemesterWeeks(semInfo);
    const lectPerWeek = Math.max(1, Math.round((total / currentWeek) * 10) / 10);
    const remainingClasses = Math.round(weeksLeft * lectPerWeek);
    if (remainingClasses <= 0) return calculatePercentage(attended, total);

    const rate = attended / total;
    const projectedAttended = attended + Math.round(remainingClasses * rate);
    const projectedTotal = total + remainingClasses;
    return calculatePercentage(projectedAttended, projectedTotal);
}

export function renderAnalytics(state, container) {
    const courses   = state.getCourses();
    const settings  = state.getSettings();
    const semInfo   = state.getSemesterInfo();
    const threshold = settings.passThresholdPercent || 75;

    const withData = courses.filter(c => c.totalClasses > 0);
    const sorted   = [...withData].sort(
        (a, b) => calculatePercentage(a.attended, a.totalClasses) - calculatePercentage(b.attended, b.totalClasses)
    );

    const weightedAvg = calculateWeightedAttendance(courses);
    const totalSafeSkips = withData.reduce(
        (sum, c) => sum + calculateSafeSkips(c.attended, c.totalClasses, threshold), 0
    );
    const belowThreshold = withData.filter(
        c => calculatePercentage(c.attended, c.totalClasses) < threshold
    );
    const unitsAtRisk = belowThreshold.reduce((sum, c) => sum + (c.units || 0), 0);

    const recoveryList = belowThreshold
        .map(c => {
            const pct = calculatePercentage(c.attended, c.totalClasses);
            const needed = calcLecturesNeeded(c.attended, c.totalClasses, threshold);
            return { course: c, pct, needed };
        })
        .filter(r => r.needed > 0)
        .sort((a, b) => a.needed - b.needed);

    container.innerHTML = `
        <div class="analytics-module">
            <h2>Analytics</h2>

            <div class="analytics-stats-grid">
                <div class="analytics-stat-card">
                    <span class="stat-label">Weighted Average</span>
                    <span class="stat-value" style="color:${getStatusMeta(getStatus(weightedAvg, threshold)).color}">${weightedAvg > 0 ? weightedAvg + '%' : '—'}</span>
                </div>
                <div class="analytics-stat-card">
                    <span class="stat-label">Safe Skips Left</span>
                    <span class="stat-value" style="color:var(--alert-success)">${totalSafeSkips}</span>
                </div>
                <div class="analytics-stat-card">
                    <span class="stat-label">Units at Risk</span>
                    <span class="stat-value" style="color:var(--alert-danger)">${unitsAtRisk}</span>
                </div>
                <div class="analytics-stat-card">
                    <span class="stat-label">Need Recovery</span>
                    <span class="stat-value" style="color:var(--alert-warning)">${belowThreshold.length}</span>
                </div>
            </div>

            <div class="analytics-section">
                <h3>${icons.chart} Attendance by Course</h3>
                ${sorted.length === 0 ? '<p class="muted">No attendance data yet. Sync from the portal to see analytics.</p>' : `
                <div class="analytics-bar-chart">
                    ${sorted.map(c => {
                        const stats = calcCourseStats(c, threshold);
                        const barPct = Math.min(100, stats.percentage);
                        return `
                            <div class="analytics-bar-row">
                                <span class="dcr-code">${c.courseCode}</span>
                                <div class="analytics-bar-track">
                                    <div class="analytics-bar-fill" style="width:${barPct}%;background:${stats.meta.color}"></div>
                                    <span class="analytics-threshold-line" style="left:${threshold}%"></span>
                                </div>
                                <span style="color:${stats.meta.color};font-weight:600">${stats.percentage}%</span>
                            </div>`;
                    }).join('')}
                </div>`}
            </div>

            <div class="analytics-section">
                <h3>${icons.progress} Semester Projection</h3>
                <p class="control-sub" style="margin-bottom:var(--space-md)">If you maintain your current attendance rate through the remaining weeks:</p>
                ${withData.length === 0 ? '<p class="muted">No data to project.</p>' : `
                <div class="analytics-projection-list">
                    ${withData.map(c => {
                        const current = calculatePercentage(c.attended, c.totalClasses);
                        const projected = projectEndPercentage(c, semInfo);
                        const projMeta = projected !== null ? getStatusMeta(getStatus(projected, threshold)) : null;
                        return `
                            <div class="analytics-projection-row">
                                <span><strong>${c.courseCode}</strong> — now ${current}%</span>
                                <span style="color:${projMeta?.color || 'var(--text-secondary)'}">Projected: ${projected !== null ? projected + '%' : '—'}</span>
                            </div>`;
                    }).join('')}
                </div>`}
            </div>

            <div class="analytics-section">
                <h3>${icons.edit} Recovery Priority</h3>
                ${recoveryList.length === 0 ? '<p class="muted">No courses below threshold — you\'re all clear!</p>' : `
                <div class="analytics-recovery-list">
                    ${recoveryList.map(({ course, pct, needed }) => `
                        <div class="analytics-recovery-row">
                            <span><strong>${course.courseCode}</strong> — ${pct}%</span>
                            <span style="color:var(--alert-danger)">Attend ${needed} consecutive class${needed !== 1 ? 'es' : ''}</span>
                        </div>`).join('')}
                </div>`}
            </div>
        </div>`;
}
