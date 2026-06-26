/**
 * Toast Notification System
 * Non-blocking notifications for user feedback
 */

const TOAST_DEFAULTS = {
    duration: 3000,
    position: 'bottom-right'
};

let toastContainer = null;

/**
 * Initialize toast container if needed
 */
function getToastContainer() {
    if (toastContainer) return toastContainer;

    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;

    document.body.appendChild(toastContainer);
    return toastContainer;
}

/**
 * Show a toast notification
 * @param {string} message - Toast message
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - Auto-dismiss time in ms (0 = no auto-dismiss)
 */
export function showToast(message, type = 'info', duration = TOAST_DEFAULTS.duration) {
    const container = getToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const icon = iconMap[type] || 'ℹ️';

    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Close">×</button>
        </div>
    `;

    // Styling
    toast.style.cssText = `
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: var(--glass-3, rgba(10, 22, 40, 0.95));
        backdrop-filter: var(--blur-md, blur(16px));
        -webkit-backdrop-filter: var(--blur-md, blur(16px));
        border: 1px solid var(--border, rgba(255,255,255,0.09));
        border-radius: var(--radius, 12px);
        color: var(--text-primary, #f0f6ff);
        font-size: var(--fs-md, 0.9rem);
        box-shadow: var(--shadow, 0 8px 32px rgba(0, 0, 0, 0.5));
        animation: slideIn 0.3s ease-out;
        min-width: 300px;
    `;

    // Type-specific border color
    const borderColorMap = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };

    if (borderColorMap[type]) {
        toast.style.borderLeftWidth = '4px';
        toast.style.borderLeftColor = borderColorMap[type];
    }

    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    // Add to container
    container.appendChild(toast);

    // Auto-dismiss
    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }

    return toast;
}

/**
 * Remove a toast
 */
function removeToast(toast) {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
        toast.remove();
    }, 300);
}

/**
 * Success toast
 */
export function showSuccess(message, duration = TOAST_DEFAULTS.duration) {
    return showToast(message, 'success', duration);
}

/**
 * Error toast
 */
export function showError(message, duration = TOAST_DEFAULTS.duration) {
    return showToast(message, 'error', duration);
}

/**
 * Warning toast
 */
export function showWarning(message, duration = TOAST_DEFAULTS.duration) {
    return showToast(message, 'warning', duration);
}

/**
 * Info toast
 */
export function showInfo(message, duration = TOAST_DEFAULTS.duration) {
    return showToast(message, 'info', duration);
}

/**
 * Clear all toasts
 */
export function clearAllToasts() {
    if (toastContainer) {
        toastContainer.innerHTML = '';
    }
}

/**
 * Add CSS animations (should be in global CSS, but fallback here)
 */
function initializeAnimations() {
    if (document.getElementById('toast-animations')) return;

    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }

        .toast-content {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
        }

        .toast-message {
            flex: 1;
        }

        .toast-close {
            background: none;
            border: none;
            color: inherit;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .toast-close:hover {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
}

// Initialize animations on module load
initializeAnimations();
