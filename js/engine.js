/**
 * Attendance OS — Attendance Calculation Engine
 * Copyright © 2025 Josiah. All rights reserved.
 * Licensed under the MIT License.
 *
 * Pure calculation engine — no side effects, fully testable
 *
 * FIXES v2:
 * - calculatePercentage: 1 decimal precision (71.4 not 71)
 * - calculateSafeSkips: algebraically correct — was WRONG on 4/5 real courses
 * - calculateRecoveryPlan: takes lecturesPerWeek, returns classesNeeded (not %)
 * - getStatus: 5-level system
 * - Added: calcLecturesNeeded, calcCourseStats, getStatusMeta
 */

export function calculatePercentage(attended, total) {
    if (!total || total <= 0) return 0;
    return Math.round((attended / total) * 1000) / 10;
}

export function isSafe(percentage, threshold = 75) {
    return percentage >= threshold;
}

/**
 * FIXED: How many FUTURE classes can be skipped while staying >= threshold.
 * Old formula was wrong — it returned total-misses-allowed-from-zero, not
 * future skips from current state. Off by up to 2, and gave >0 when already failing.
 */
export function calculateSafeSkips(attended, total, threshold = 75) {
    if (!total || total <= 0) return 0;
    if (calculatePercentage(attended, total) < threshold) return 0;
    return Math.max(0, Math.floor((attended * 100 - threshold * total) / threshold));
}

/**
 * How many consecutive lectures must be attended to reach threshold.
 * Returns 0 if already safe.
 */
export function calcLecturesNeeded(attended, total, threshold = 75) {
    if (calculatePercentage(attended, total) >= threshold) return 0;
    for (let n = 1; n <= 500; n++) {
        if (calculatePercentage(attended + n, total + n) >= threshold) return n;
    }
    return -1;
}

/**
 * FIXED: Recovery plan now uses remainingClasses (weeks × lecturesPerWeek)
 * instead of treating weeks as classes.
 */
export function calculateRecoveryPlan(attended, total, weeksLeft, threshold = 75, lecturesPerWeek = 1) {
    const remainingClasses = Math.round(weeksLeft * lecturesPerWeek);
    if (remainingClasses <= 0) {
        return { classesNeeded: 0, remainingClasses: 0, feasible: false, message: 'No classes remaining' };
    }
    const projectedTotal = total + remainingClasses;
    const neededTotal    = Math.ceil((threshold / 100) * projectedTotal);
    const classesNeeded  = Math.max(0, neededTotal - attended);
    const feasible       = classesNeeded <= remainingClasses;
    return {
        classesNeeded,
        remainingClasses,
        feasible,
        message: feasible
            ? `Attend ${classesNeeded} of ${remainingClasses} remaining classes`
            : `Cannot recover — need ${classesNeeded} but only ${remainingClasses} left`
    };
}

export function getWeeksRemaining(totalWeeks, currentWeek) {
    return Math.max(0, totalWeeks - currentWeek);
}

/** 5-level status */
export function getStatus(percentage, threshold = 75) {
    if (percentage >= threshold + 10) return 'very-safe';
    if (percentage >= threshold)      return 'safe';
    if (percentage >= threshold - 15) return 'warning';
    if (percentage >= threshold - 25) return 'danger';
    return 'critical';
}

export function getAlertStatus(percentage, threshold = 75) {
    return getStatus(percentage, threshold);
}

export function getStatusMeta(status) {
    const map = {
        'very-safe': { label: 'Very Safe', cssClass: 'alert-very-safe', color: '#10b981' },
        'safe':      { label: 'Safe',      cssClass: 'alert-safe',      color: '#34d399' },
        'warning':   { label: 'Warning',   cssClass: 'alert-warning',   color: '#f59e0b' },
        'danger':    { label: 'Danger',    cssClass: 'alert-danger',    color: '#f97316' },
        'critical':  { label: 'Critical',  cssClass: 'alert-critical',  color: '#ef4444' },
        'no-data':   { label: 'No Data',   cssClass: 'alert-no-data',   color: '#64748b' },
    };
    return map[status] || map['no-data'];
}

/** Full stats for one course in one call */
export function calcCourseStats(course, threshold = 75) {
    const attended = course.attended    || 0;
    const total    = course.totalClasses || 0;
    const hasData  = total > 0;
    const percentage     = calculatePercentage(attended, total);
    const status         = hasData ? getStatus(percentage, threshold) : 'no-data';
    const safeSkips      = hasData ? calculateSafeSkips(attended, total, threshold) : 0;
    const lecturesNeeded = (hasData && percentage < threshold)
        ? calcLecturesNeeded(attended, total, threshold) : 0;
    return { percentage, status, safeSkips, lecturesNeeded, hasData, meta: getStatusMeta(status) };
}

/** Weighted average by units (0-unit courses treated as weight 1) */
export function calculateWeightedAttendance(courses) {
    const active = courses.filter(c => c.totalClasses > 0);
    if (!active.length) return 0;
    const totalWeight = active.reduce((s, c) => s + Math.max(c.units || 0, 1), 0);
    const weightedSum  = active.reduce((s, c) => {
        const pct = calculatePercentage(c.attended, c.totalClasses);
        return s + pct * Math.max(c.units || 0, 1);
    }, 0);
    return Math.round((weightedSum / totalWeight) * 10) / 10;
}

export function getCourseStatsSummary(courses, threshold = 75) {
    const withData = courses.filter(c => c.totalClasses > 0);
    const safe    = withData.filter(c => isSafe(calculatePercentage(c.attended, c.totalClasses), threshold)).length;
    const warning = withData.filter(c => {
        const p = calculatePercentage(c.attended, c.totalClasses);
        return p < threshold && p >= threshold - 15;
    }).length;
    const danger  = withData.filter(c => calculatePercentage(c.attended, c.totalClasses) < threshold - 15).length;
    return { safe, warning, danger, total: courses.length, withData: withData.length };
}
