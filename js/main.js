import { StateManager }    from './state.js';
import { renderDashboard } from './modules/dashboard.js';
import { renderCourses }   from './modules/courses.js';
import { renderCalculator }from './modules/calculator.js';
import { renderSync }      from './modules/sync.js';
import { renderSettings }  from './modules/settings.js';
import { renderAnalytics } from './modules/analytics.js';
import { showSuccess, showError, showInfo } from './toast.js';
import { icons }           from './icons.js';

// ── PWA: register service worker ─────────────────────────────────────────
// FIX: sw.js existed but was never registered — PWA was completely non-functional
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.warn('SW registration failed:', err);
        });
    });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
const state       = new StateManager();
const contentArea = document.getElementById('content');
const navItems    = document.querySelectorAll('.nav-item');

const modules = {
    dashboard:  renderDashboard,
    courses:    renderCourses,
    calculator: renderCalculator,
    analytics:  renderAnalytics,
    sync:       renderSync,
    settings:   renderSettings
};

function switchModule(moduleName) {
    contentArea.innerHTML = '';
    const renderFn = modules[moduleName];
    if (renderFn) renderFn(state, contentArea);
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-module="${moduleName}"]`)?.classList.add('active');
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const moduleName = item.dataset.module;
        if (moduleName && modules[moduleName]) {
            switchModule(moduleName);
        }
    });
});

// ── Init ──────────────────────────────────────────────────────────────────
state.init().then(() => {
    // Remove loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.3s ease';
        setTimeout(() => loadingScreen.remove(), 300);
    }
    
    // Show app
    const app = document.getElementById('app');
    if (app) app.style.display = 'flex';

    applyTheme(state.getSettings().theme);

    const chartIcon = document.querySelector('.icon-chart');
    const moonIcon  = document.querySelector('.icon-moon');
    if (chartIcon) chartIcon.innerHTML = icons.chart;
    if (moonIcon)  moonIcon.innerHTML  = icons.moon;

    updateUserDisplay();
    updateLastSyncDisplay();
    switchModule('dashboard');

    // Auto-sync on load if enabled
    if (state.getSettings().autoSync) {
        triggerQuickSync(false); // silent (no toast on success)
    }
}).catch(err => {
    console.error('Failed to initialize Attendance OS:', err);
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div style="text-align: center; color: var(--color-critical);">
                <p>Failed to load Attendance OS</p>
                <p style="font-size: 0.9em;">${err.message}</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">Retry</button>
            </div>
        `;
    }
});

// ── Quick sync ────────────────────────────────────────────────────────────
async function triggerQuickSync(showToast = true) {
    const btn = document.getElementById('quick-sync');
    const originalText = btn?.textContent || 'Quick Sync';
    if (btn) { btn.innerHTML = '<span class="spinner"></span>'; btn.classList.add('btn-loading'); }

    const result = await state.syncFromExtension();

    if (btn) { btn.innerHTML = originalText; btn.classList.remove('btn-loading'); }
    updateLastSyncDisplay();

    if (result.success) {
        if (showToast) showSuccess(`Synced ${result.coursesUpdated} courses`);
        switchModule('dashboard');
    } else {
        if (showToast) showError(`Sync failed: ${result.error}`);
    }
}

document.getElementById('quick-sync')?.addEventListener('click', () => triggerQuickSync(true));

// ── Theme ──────────────────────────────────────────────────────────────────
// FIX: old applyTheme() patched individual CSS vars — fragile and incomplete.
// Now uses CSS class on :root which covers all variables defined in tokens.css.
document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const newTheme = state.getSettings().theme === 'dark' ? 'light' : 'dark';
    state.updateSettings({ theme: newTheme });
    applyTheme(newTheme);
    const moonIcon = document.querySelector('.icon-moon');
    if (moonIcon) moonIcon.innerHTML = newTheme === 'dark' ? icons.moon : icons.sun;
    showInfo(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode`);
});

function applyTheme(theme) {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    const moonIcon = document.querySelector('.icon-moon');
    if (moonIcon) moonIcon.innerHTML = theme === 'dark' ? icons.moon : icons.sun;
}

window.applyTheme = applyTheme;

// ── Helpers ───────────────────────────────────────────────────────────────
window.updateUserDisplay = function () {
    const name = state.getSettings().userName;
    const el   = document.getElementById('user-display');
    if (el) el.textContent = name ? `👤 ${name}` : '👤 Guest (set name in Settings)';
};

function updateLastSyncDisplay() {
    const el   = document.getElementById('last-sync');
    const last = state.getLastSync(); // FIX: was state.state.lastSync
    if (el) el.textContent = last ? `Last sync: ${new Date(last).toLocaleString()}` : 'Last sync: never';
}
