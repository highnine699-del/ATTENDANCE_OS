/**
 * Pure calculation engine — no side effects, fully testable
 */

export function calculatePercentage(attended, total) {
    if (total === 0) return 0;
    return parseFloat(((attended / total) * 100).toFixed(1));
}

export function isSafe(percentage, threshold = 75) {
    return percentage >= threshold;
}

export function isCritical(percentage, threshold = 75) {
    return percentage < threshold && percentage >= 50;
}

export function isDanger(percentage) {
    return percentage < 50;
}

export function getAlertStatus(percentage, threshold = 75) {
    if (percentage >= threshold) return 'safe';
    if (percentage >= 50) return 'warning';
    return 'danger';
}

export function calculateSafeSkips(attended, total, threshold = 75) {
    // How many consecutive upcoming classes can I skip before dropping below threshold?
    const result = Math.floor((attended * 100 - threshold * total) / threshold);
    return Math.max(0, result);
}

export function calculateRecoveryPlan(attended, total, weeksLeft, threshold = 75) {
    // What % do I need in remaining classes to hit threshold?
    const needed = Math.ceil((threshold / 100) * total);
    const stillNeeded = Math.max(0, needed - attended);
    if (weeksLeft <= 0) {
        return { required: Infinity, feasible: false, message: 'No weeks left' };
    }
    const required = Math.round((stillNeeded / weeksLeft) * 100);
    const feasible = required <= 100;
    return {
        required,
        feasible,
        message: feasible
            ? `Attend ${required}% of remaining ${weeksLeft} weeks` 
            : `Impossible — need ${required}% (max 100%)` 
    };
}

export function getWeeksRemaining(totalWeeks, currentWeek) {
    return Math.max(0, totalWeeks - currentWeek);
}

export function calculateWeightedAttendance(courses) {
    // Overall attendance weighted by units
    const totalUnits = courses.reduce((sum, c) => sum + c.units, 0);
    if (totalUnits === 0) return 0;
    const weightedSum = courses.reduce((sum, c) => sum + (c.percentage * c.units), 0);
    return Math.round(weightedSum / totalUnits);
}

export function getCourseStatsSummary(courses, threshold = 75) {
    const safe = courses.filter(c => isSafe(c.percentage, threshold)).length;
    const warning = courses.filter(c => isCritical(c.percentage, threshold)).length;
    const danger = courses.filter(c => isDanger(c.percentage)).length;
    return { safe, warning, danger, total: courses.length };
}
