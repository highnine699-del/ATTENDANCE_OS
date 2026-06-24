import { calculateWeightedAttendance, getCourseStatsSummary } from '../engine.js';
import { formatDateTime } from '../utils.js';
import { icons } from '../icons.js';

function getSemesterProgress(semesterInfo) {
    if (!semesterInfo.startDate || !semesterInfo.endDate) return null;
    
    const now = new Date();
    const start = new Date(semesterInfo.startDate);
    const end = new Date(semesterInfo.endDate);
    
    if (now < start) return { progress: 0, daysRemaining: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) };
    if (now > end) return { progress: 100, daysRemaining: 0 };
    
    // Calculate progress based on lecture weeks if available, otherwise calendar days
    if (semesterInfo.lectureWeeks) {
        const totalWeeks = parseInt(semesterInfo.lectureWeeks);
        const totalDays = totalWeeks * 7;
        const elapsedDays = (now - start) / (1000 * 60 * 60 * 24);
        const currentWeek = Math.ceil(elapsedDays / 7);
        const progress = Math.min(100, Math.round((currentWeek / totalWeeks) * 100));
        const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return { progress, daysRemaining, currentWeek, totalWeeks };
    }
    
    // Fallback to calendar days
    const totalDays = (end - start) / (1000 * 60 * 60 * 24);
    const elapsedDays = (now - start) / (1000 * 60 * 60 * 24);
    const progress = Math.round((elapsedDays / totalDays) * 100);
    const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    
    return { progress, daysRemaining };
}

export function renderDashboard(state, container) {
    const courses = state.getCourses();
    const settings = state.getSettings();
    const semesterInfo = state.getSemesterInfo();
    const stats = getCourseStatsSummary(courses, settings.passThresholdPercent);
    const weightedAvg = calculateWeightedAttendance(courses);
    const lastSync = state.getLastSync();
    const semesterProgress = getSemesterProgress(semesterInfo);

    // Empty state when no courses
    if (courses.length === 0) {
        container.innerHTML = `
            <div class="dashboard">
                <h2>Dashboard</h2>
                <div class="empty-state">
                    <div class="empty-icon">${icons.book}</div>
                    <h3>No Courses Yet</h3>
                    <p>Start by adding your courses or syncing from the LMU portal.</p>
                    <button onclick="document.querySelector('[data-module=\"sync\"]').click()" class="btn-primary">Sync Your Courses</button>
                </div>
            </div>
        `;
        return;
    }

    const html = `
        <div class="dashboard">
            <h2>Dashboard</h2>
            
            <div class="health-card">
                <div class="health-score">
                    <div class="score-circle" data-status="${getHealthStatus(weightedAvg, settings.passThresholdPercent)}">
                        ${weightedAvg}%
                    </div>
                    <div class="score-label">Weighted Attendance</div>
                </div>
                <div class="health-summary">
                    <p class="summary-text">
                        ${stats.safe} safe | ${stats.warning} warning | ${stats.danger} danger
                    </p>
                </div>
            </div>

            ${semesterProgress ? `
            <div class="progress-card">
                <h3>${icons.progress} Semester Progress</h3>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${semesterProgress.progress}%"></div>
                </div>
                <div class="progress-stats">
                    <span>${semesterProgress.progress}% complete</span>
                    <span>${semesterProgress.daysRemaining} days remaining</span>
                </div>
                ${semesterInfo.examDate ? `<p class="exam-countdown">${icons.clock} Exams: ${new Date(semesterInfo.examDate).toLocaleDateString()}</p>` : ''}
            </div>
            ` : ''}

            <div class="semester-info">
                <h3>${icons.calendar} Semester Info</h3>
                ${semesterInfo.startDate ? `<p><strong>Start:</strong> ${new Date(semesterInfo.startDate).toLocaleDateString()}</p>` : ''}
                ${semesterInfo.endDate ? `<p><strong>End:</strong> ${new Date(semesterInfo.endDate).toLocaleDateString()}</p>` : ''}
                ${semesterInfo.lectureWeeks ? `<p><strong>Lecture Weeks:</strong> ${semesterInfo.lectureWeeks}</p>` : ''}
                ${semesterInfo.examDate ? `<p><strong>Exam Date:</strong> ${new Date(semesterInfo.examDate).toLocaleDateString()}</p>` : ''}
            </div>

            <div class="sync-info">
                <p>Last synced: ${lastSync ? formatDateTime(lastSync) : 'Never'}</p>
            </div>

            <h3>${icons.book} Courses at Risk</h3>
            <div class="courses-grid">
                ${courses
                    .filter(c => c.percentage < settings.passThresholdPercent)
                    .sort((a, b) => a.percentage - b.percentage)
                    .map(c => `
                        <div class="course-card ${getAlertClass(c.percentage, settings.passThresholdPercent)}">
                            <h4>${c.courseCode}</h4>
                            <p class="course-title">${c.courseTitle}</p>
                            <div class="course-stats">
                                <span>${c.attended}/${c.totalClasses} attended</span>
                                <span class="percentage">${c.percentage}%</span>
                            </div>
                        </div>
                    `)
                    .join('')}
            </div>

            ${courses.filter(c => c.percentage < settings.passThresholdPercent).length === 0 
                ? `<p style="color: var(--alert-success); margin-top: var(--space-lg);">${icons.party} All courses are safe!</p>` 
                : ''}
        </div>
    `;

    container.innerHTML = html;
}

function getHealthStatus(percentage, threshold) {
    if (percentage >= threshold) return 'safe';
    if (percentage >= 50) return 'warning';
    return 'danger';
}

function getAlertClass(percentage, threshold = 75) {
    // 5-level evaluation system
    if (percentage >= 90) return 'alert-excellent';
    if (percentage >= 80) return 'alert-safe';
    if (percentage >= threshold + 3) return 'alert-near-boundary';
    if (percentage >= threshold) return 'alert-warning';
    return 'alert-danger';
}
