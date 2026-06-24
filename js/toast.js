/**
 * Toast notification system
 */

export function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast if any
    const existing = document.querySelector('.toast');
    if (existing) {
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });

    // Auto dismiss
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    return toast;
}

export function showSuccess(message, duration = 3000) {
    return showToast(message, 'success', duration);
}

export function showError(message, duration = 5000) {
    return showToast(message, 'error', duration);
}

export function showInfo(message, duration = 3000) {
    return showToast(message, 'info', duration);
}
