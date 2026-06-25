import { calculateWeightedAttendance, getCourseStatsSummary, calcCourseStats, calculatePercentage, calculateSafeSkips, getStatus, getStatusMeta } from '../engine.js';
import { formatDateTime } from '../utils.js';
import { icons } from '../icons.js';

function getSemesterProgress(semesterInfo) {
    if (!semesterInfo.startDate || !semesterInfo.endDate) return null;
    const now   = new Date();
    const start = new Date(semesterInfo.startDate);
    const end   = new Date(semesterInfo.endDate);
    if (now < start) return { progress: 0, daysRemaining: Math.ceil((end - start) / 864e5) };
    if (now > end)   return { progress: 100, daysRemaining: 0 };
    if (semesterInfo.lectureWeeks) {
        const totalWeeks  = parseInt(semesterInfo.lectureWeeks);
        const elapsedDays = (now - start) / 864e5;
        const currentWeek = Math.min(Math.ceil(elapsedDays / 7), totalWeeks);
        const progress    = Math.round((currentWeek / totalWeeks) * 100);
        const daysRemaining = Math.ceil((end - now) / 864e5);
        return { progress, daysRemaining, currentWeek, totalWeeks };
    }
    const total   = (end - start) / 864e5;
    const elapsed = (now - start) / 864e5;
    return { progress: Math.round((elapsed / total) * 100), daysRemaining: Math.ceil((end - now) / 864e5) };
}

export function renderDashboard(state, container) {
    const courses    = state.getCourses();
    const settings   = state.getSettings();
    const semInfo    = state.getSemesterInfo();
    const threshold  = settings.passThresholdPercent || 75;
    const lastSync   = state.getLastSync(); // FIX: was state.state.lastSync
    const weightedAvg = calculateWeightedAttendance(courses);
    const stats      = getCourseStatsSummary(courses, threshold);
    const semProg    = getSemesterProgress(semInfo);
    const overallStatus = getStatus(weightedAvg, threshold);
    const overallMeta   = getStatusMeta(overallStatus);

    if (courses.length === 0) {
        container.innerHTML = `
            <div class="dashboard">
                <h2>Dashboard</h2>
                <div class="empty-state">
                    <div class="empty-icon">${icons.book}</div>
                    <h3>No Courses Yet</h3>
                    <p>Start by syncing from the LMU portal or add courses manually.</p>
                    <button onclick="document.querySelector('[data-module=\"sync\"]').click()" class="btn-primary">Sync Now</button>
                </div>
            </div>`;
        return;
    }

    // All courses sorted by percentage ascending (worst first)
    const sortedCourses = [...courses]
        .filter(c => c.totalClasses > 0)
        .sort((a, b) => calculatePercentage(a.attended, a.totalClasses) - calculatePercentage(b.attended, b.totalClasses));

    const atRisk   = sortedCourses.filter(c => calculatePercentage(c.attended, c.totalClasses) < threshold);
    const allSafe  = atRisk.length === 0;
    const critical = sortedCourses.filter(c => calculatePercentage(c.attended, c.totalClasses) < threshold - 25);
    const activeCourses = courses.filter(c => c.totalClasses > 0);

    container.innerHTML = `
        <div class="dashboard">
            <h2>Dashboard</h2>

            ${activeCourses.length > 0 ? `
            <div class="skip-today-widget">
                <h3>Can I skip today?</h3>
                <div class="skip-today-controls">
                    <select id="skip-course-select">
                        <option value="">— Select a course —</option>
                        ${activeCourses.map(c => `<option value="${c.courseCode}">${c.courseCode} — ${c.courseTitle}</option>`).join('')}
                    </select>
                </div>
                <div id="skip-today-result" class="skip-today-result" style="display:none"></div>
            </div>` : ''}

            ${critical.length > 0 ? `
            <div class="alert-banner alert-critical">
                ⚠️ ${critical.length} course${critical.length > 1 ? 's' : ''} critically below threshold:
                ${critical.map(c => `<strong>${c.courseCode}</strong>`).join(', ')}
            </div>` : ''}

            <div class="health-card" style="border-color:${overallMeta.color}40">
                <div class="health-score">
                    <div class="score-circle" style="color:${overallMeta.color};border-color:${overallMeta.color}">
                        ${weightedAvg > 0 ? weightedAvg + '%' : '—'}
                    </div>
                    <div class="score-label">Weighted Average</div>
                    <div class="score-status" style="color:${overallMeta.color}">${overallMeta.label}</div>
                </div>
                <div class="health-grid">
                    <div class="health-stat">
                        <span class="stat-num" style="color:var(--alert-success)">${stats.safe}</span>
                        <span class="stat-label">Safe</span>
                    </div>
                    <div class="health-stat">
                        <span class="stat-num" style="color:var(--alert-warning)">${stats.warning}</span>
                        <span class="stat-label">Warning</span>
                    </div>
                    <div class="health-stat">
                        <span class="stat-num" style="color:var(--alert-danger)">${stats.danger}</span>
                        <span class="stat-label">Danger</span>
                    </div>
                    <div class="health-stat">
                        <span class="stat-num">${courses.length - (courses.length - stats.withData)}</span>
                        <span class="stat-label">Active</span>
                    </div>
                </div>
            </div>

            ${semProg ? `
            <div class="progress-card">
                <h3>${icons.calendar} Semester — Week ${semProg.currentWeek || '?'} of ${semProg.totalWeeks || semInfo.lectureWeeks}</h3>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width:${semProg.progress}%"></div>
                </div>
                <div class="progress-stats">
                    <span>${semProg.progress}% complete</span>
                    <span>${semProg.daysRemaining} days remaining</span>
                </div>
                ${semInfo.examDate ? `<p class="exam-countdown">${icons.clock} Exams: ${new Date(semInfo.examDate).toLocaleDateString()}</p>` : ''}
            </div>` : ''}

            <h3 style="margin-top:var(--space-xl)">${icons.book} All Courses ${allSafe ? '— <span style="color:var(--alert-success)">All Safe! 🎉</span>' : ''}</h3>
            <div class="dashboard-course-list">
                ${sortedCourses.map(c => {
                    const cstats = calcCourseStats(c, threshold);
                    const pct    = cstats.percentage;
                    const meta   = cstats.meta;
                    const barPct = Math.min(100, pct);
                    const action = cstats.safeSkips > 0
                        ? `${cstats.safeSkips} skip${cstats.safeSkips !== 1 ? 's' : ''} left`
                        : cstats.lecturesNeeded > 0
                        ? `Need ${cstats.lecturesNeeded} to recover`
                        : 'At limit';
                    return `
                        <div class="dash-course-row ${meta.cssClass}">
                            <div class="dcr-left">
                                <span class="dcr-code">${c.courseCode}</span>
                                <span class="dcr-name">${c.courseTitle}</span>
                            </div>
                            <div class="dcr-bar-wrap">
                                <div class="dcr-bar" style="width:${barPct}%;background:${meta.color}"></div>
                                <span class="dcr-threshold" style="left:${threshold}%"></span>
                            </div>
                            <div class="dcr-right">
                                <span class="dcr-pct" style="color:${meta.color}">${pct}%</span>
                                <span class="dcr-action">${action}</span>
                            </div>
                        </div>`;
                }).join('')}
                ${courses.filter(c => c.totalClasses === 0).map(c => `
                    <div class="dash-course-row alert-no-data">
                        <div class="dcr-left">
                            <span class="dcr-code">${c.courseCode}</span>
                            <span class="dcr-name">${c.courseTitle}</span>
                        </div>
                        <div class="dcr-bar-wrap"><div class="dcr-bar" style="width:0%"></div></div>
                        <div class="dcr-right">
                            <span class="dcr-pct" style="color:var(--text-secondary)">—</span>
                            <span class="dcr-action muted">No data</span>
                        </div>
                    </div>`).join('')}
            </div>

            <p class="sync-timestamp">Last synced: ${lastSync ? formatDateTime(lastSync) : 'Never'}</p>
        </div>`;

    const skipSelect = document.getElementById('skip-course-select');
    const skipResult = document.getElementById('skip-today-result');
    if (skipSelect && skipResult) {
        function updateSkipAnswer() {
            const code = skipSelect.value;
            if (!code) {
                skipResult.style.display = 'none';
                return;
            }
            const course = state.getCourse(code);
            if (!course) return;
            const safeSkips = calculateSafeSkips(course.attended, course.totalClasses, threshold);
            if (safeSkips > 0) {
                skipResult.style.display = 'block';
                skipResult.className = 'skip-today-result yes';
                skipResult.textContent = `YES — ${safeSkips} skip${safeSkips !== 1 ? 's' : ''} left`;
            } else {
                skipResult.style.display = 'block';
                skipResult.className = 'skip-today-result no';
                skipResult.textContent = 'NO — attend this class';
            }
        }
        skipSelect.addEventListener('change', updateSkipAnswer);
    }
}
