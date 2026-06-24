import { calculateSafeSkips, calculateRecoveryPlan, getWeeksRemaining, getAlertStatus, calculatePercentage } from '../engine.js';
import { icons } from '../icons.js';

export function renderCalculator(state, container) {
    const courses = state.getCourses();
    const settings = state.getSettings();
    const semesterInfo = state.getSemesterInfo();
    const totalWeeks = semesterInfo.lectureWeeks || 13;
    
    // Get current week from state or default to 1
    const currentWeek = state.getCurrentWeek();

    const html = `
        <div class="calculator-module">
            <h2>Calculator</h2>
            
            <div class="calculator-controls">
                <label>
                    Current Week: 
                    <input type="number" id="current-week" min="1" max="${totalWeeks}" value="${currentWeek}">
                </label>
                <p>Total weeks: ${totalWeeks}</p>
            </div>

            <div class="courses-grid">
                ${courses.map(c => {
                    const weeksLeft = getWeeksRemaining(totalWeeks, currentWeek);
                    const safeSkips = calculateSafeSkips(c.attended, c.totalClasses, settings.passThresholdPercent);
                    const recovery = calculateRecoveryPlan(c.attended, c.totalClasses, weeksLeft, settings.passThresholdPercent);
                    const alertStatus = getAlertStatus(c.percentage, settings.passThresholdPercent);

                    return `
                        <div class="course-card ${getAlertClass(c.percentage, settings.passThresholdPercent)}">
                            <h4>${c.courseCode}</h4>
                            <p class="course-title">${c.courseTitle}</p>
                            <div class="course-stats">
                                <span>${c.attended}/${c.totalClasses} (${c.percentage}%)</span>
                            </div>
                            <div class="calculator-results">
                                <p><strong>Safe Skips:</strong> ${safeSkips} classes</p>
                                <p><strong>Weeks Left:</strong> ${weeksLeft}</p>
                                <p><strong>Recovery:</strong> ${recovery.message}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="what-if-section">
                <h3>${icons.crystal} What If Calculator</h3>
                <p>Simulate future attendance scenarios</p>
                <div class="what-if-controls">
                    <label>
                        Select Course:
                        <select id="what-if-course">
                            <option value="">-- Select a course --</option>
                            ${courses.map(c => `<option value="${c.courseCode}">${c.courseCode} - ${c.courseTitle}</option>`).join('')}
                        </select>
                    </label>
                    <label>
                        Scenario:
                        <select id="what-if-scenario">
                            <option value="attend">Attend next X classes</option>
                            <option value="skip">Skip next X classes</option>
                            <option value="perfect">Perfect attendance for remaining weeks</option>
                        </select>
                    </label>
                    <label>
                        Number of classes/weeks:
                        <input type="number" id="what-if-number" min="1" max="20" value="3">
                    </label>
                    <button id="what-if-calculate" class="btn-primary">Calculate</button>
                </div>
                <div id="what-if-result" class="what-if-result"></div>
            </div>

            <div class="calculator-help">
                <h3>How it works</h3>
                <ul>
                    <li><strong>Safe Skips:</strong> Number of classes you can skip while staying above ${settings.passThresholdPercent}%</li>
                    <li><strong>Recovery:</strong> Required attendance percentage for remaining weeks to reach threshold</li>
                    <li><strong>Current Week:</strong> Adjust to see how your recovery needs change over time</li>
                    <li><strong>What If:</strong> Simulate future attendance scenarios to see projected outcomes</li>
                </ul>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Add event listener for current week change
    const weekInput = document.getElementById('current-week');
    if (weekInput) {
        weekInput.addEventListener('change', () => {
            const newWeek = parseInt(weekInput.value) || 1;
            state.setCurrentWeek(newWeek);
            renderCalculator(state, container);
        });
    }

    // What If Calculator
    const whatIfBtn = document.getElementById('what-if-calculate');
    if (whatIfBtn) {
        whatIfBtn.addEventListener('click', () => {
            const courseCode = document.getElementById('what-if-course').value;
            const scenario = document.getElementById('what-if-scenario').value;
            const number = parseInt(document.getElementById('what-if-number').value) || 0;
            const resultDiv = document.getElementById('what-if-result');

            if (!courseCode) {
                resultDiv.innerHTML = '<p class="error">Please select a course</p>';
                return;
            }

            const course = state.getCourse(courseCode);
            if (!course) {
                resultDiv.innerHTML = '<p class="error">Course not found</p>';
                return;
            }

            let newAttended = course.attended;
            let newTotal = course.totalClasses;

            switch (scenario) {
                case 'attend':
                    newAttended += number;
                    newTotal += number;
                    break;
                case 'skip':
                    newTotal += number;
                    break;
                case 'perfect':
                    const weeksLeft = getWeeksRemaining(totalWeeks, currentWeek);
                    const classesPerWeek = Math.ceil(course.totalClasses / totalWeeks);
                    newAttended += weeksLeft * classesPerWeek;
                    newTotal += weeksLeft * classesPerWeek;
                    break;
            }

            const newPercentage = calculatePercentage(newAttended, newTotal);
            const oldPercentage = course.percentage;
            const change = newPercentage - oldPercentage;
            const changeIcon = change > 0 ? icons.trendUp : change < 0 ? icons.trendDown : icons.arrowRight;
            const changeColor = change > 0 ? 'var(--alert-success)' : change < 0 ? 'var(--alert-danger)' : 'var(--text-secondary)';

            resultDiv.innerHTML = `
                <div class="what-if-result-card">
                    <h4>Result for ${courseCode}</h4>
                    <div class="result-comparison">
                        <div class="result-item">
                            <span class="label">Current:</span>
                            <span class="value">${oldPercentage}%</span>
                        </div>
                        <div class="result-arrow">${changeIcon}</div>
                        <div class="result-item">
                            <span class="label">Projected:</span>
                            <span class="value" style="color: ${changeColor}; font-weight: bold;">${newPercentage}%</span>
                        </div>
                    </div>
                    <p class="result-detail">
                        ${scenario === 'attend' ? `After attending ${number} more classes:` :
                          scenario === 'skip' ? `After skipping ${number} classes:` :
                          `With perfect attendance for remaining ${getWeeksRemaining(totalWeeks, currentWeek)} weeks:`}
                        <br>
                        Attended: ${course.attended} → ${newAttended}
                        <br>
                        Total: ${course.totalClasses} → ${newTotal}
                    </p>
                </div>
            `;
        });
    }
}

function getAlertClass(percentage, threshold = 75) {
    // 5-level evaluation system
    if (percentage >= 90) return 'alert-excellent';
    if (percentage >= 80) return 'alert-safe';
    if (percentage >= threshold + 3) return 'alert-near-boundary';
    if (percentage >= threshold) return 'alert-warning';
    return 'alert-danger';
}
