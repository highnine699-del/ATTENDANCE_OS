/**
 * Data validation rules
 */

export function validateCourse(course) {
    const errors = [];

    if (!course.courseCode || course.courseCode.trim() === '') {
        errors.push('Course code is required');
    }

    if (!course.courseTitle || course.courseTitle.trim() === '') {
        errors.push('Course title is required');
    }

    if (!Number.isFinite(course.units) || course.units < 0) {
        errors.push('Units must be a non-negative number');
    }

    if (!['CC', 'UC'].includes(course.courseType)) {
        errors.push('Course type must be CC or UC');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateAttendance(attended, total) {
    const errors = [];

    if (!Number.isFinite(attended) || attended < 0) {
        errors.push('Attended must be a non-negative number');
    }

    if (!Number.isFinite(total) || total < 0) {
        errors.push('Total classes must be a non-negative number');
    }

    if (attended > total) {
        errors.push('Attended cannot exceed total classes');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateSemesterInfo(info) {
    const errors = [];

    if (info.startDate && !isValidDate(info.startDate)) {
        errors.push('Invalid start date');
    }

    if (info.endDate && !isValidDate(info.endDate)) {
        errors.push('Invalid end date');
    }

    if (info.lectureWeeks !== undefined && info.lectureWeeks !== null) {
        if (!Number.isFinite(info.lectureWeeks) || info.lectureWeeks < 1) {
            errors.push('Lecture weeks must be a positive number');
        }
    }

    if (info.startDate && info.endDate && isValidDate(info.startDate) && isValidDate(info.endDate)) {
        if (new Date(info.startDate) > new Date(info.endDate)) {
            errors.push('Start date must be before end date');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

export function validateSettings(settings) {
    const errors = [];

    if (settings.passThresholdPercent !== undefined) {
        if (!Number.isFinite(settings.passThresholdPercent) ||
            settings.passThresholdPercent < 0 ||
            settings.passThresholdPercent > 100) {
            errors.push('Pass threshold must be between 0 and 100');
        }
    }

    if (settings.theme && !['light', 'dark'].includes(settings.theme)) {
        errors.push('Theme must be light or dark');
    }

    if (settings.userName !== undefined) {
        if (typeof settings.userName !== 'string') {
            errors.push('User name must be a string');
        } else if (settings.userName.length > 50) {
            errors.push('User name must be 50 characters or less');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
