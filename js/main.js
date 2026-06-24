import { StateManager } from './state.js';
import { renderDashboard } from './modules/dashboard.js';
import { renderCourses } from './modules/courses.js';
import { renderCalculator } from './modules/calculator.js';
import { renderSync } from './modules/sync.js';
import { renderSettings } from './modules/settings.js';
import { showSuccess, showError, showInfo } from './toast.js';
import { icons } from './icons.js';

const state = new StateManager();
const contentArea = document.getElementById('content');
const navItems = document.querySelectorAll('.nav-item');

const modules = {
    dashboard: renderDashboard,
    courses: renderCourses,
    calculator: renderCalculator,
    sync: renderSync,
    settings: renderSettings
};

let currentModule = 'dashboard';

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
            // Silent fail for service worker registration
        });
    });
}

function switchModule(moduleName) {
    currentModule = moduleName;
    contentArea.innerHTML = '';
    const renderFn = modules[moduleName];
    if (renderFn) {
        renderFn(state, contentArea);
    }
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-module="${moduleName}"]`).classList.add('active');
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const moduleName = item.dataset.module;
        switchModule(moduleName);
    });
});

// Init
state.init().then(() => {
    // Apply initial theme
    applyTheme(state.getSettings().theme);
    
    // Inject icons into DOM
    const iconChart = document.querySelector('.icon-chart');
    const iconMoon = document.querySelector('.icon-moon');
    if (iconChart) iconChart.innerHTML = icons.chart;
    if (iconMoon) iconMoon.innerHTML = icons.moon;
    
    // Display user name
    updateUserDisplay();
    
    // Subscribe to state changes for background sync re-renders
    state.subscribe(() => {
        // Re-render current module when state changes
        switchModule(currentModule);
    });
    
    // Remove loading screen and show app
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (app) app.style.display = 'flex';
    
    switchModule('dashboard');
}).catch(err => {
    // Silent fail on init error
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (app) app.style.display = 'flex';
});

// Quick sync button
document.getElementById('quick-sync')?.addEventListener('click', async () => {
    const btn = document.getElementById('quick-sync');
    const originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>';
    btn.classList.add('btn-loading');
    
    const result = await state.syncFromExtension();
    
    btn.innerHTML = originalText;
    btn.classList.remove('btn-loading');
    
    if (result.success) {
        showSuccess(`Synced ${result.coursesUpdated} courses`);
        switchModule('dashboard');
    } else {
        showError(`Sync failed: ${result.error}. Use the Sync tab for Manual Entry as a fallback.`);
    }
});

// Theme toggle
document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const currentTheme = state.getSettings().theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    state.updateSettings({ theme: newTheme });
    applyTheme(newTheme);
    showInfo(`Switched to ${newTheme} theme`);
});

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.style.setProperty('--bg-dark', '#f5f5f5');
        document.documentElement.style.setProperty('--bg-darker', '#e5e5e5');
        document.documentElement.style.setProperty('--text-primary', '#1a1a1a');
        document.documentElement.style.setProperty('--text-secondary', '#666666');
        document.documentElement.style.setProperty('--border', '#d4d4d4');
        const iconMoon = document.querySelector('.icon-moon');
        if (iconMoon) iconMoon.innerHTML = icons.sun;
    } else {
        document.documentElement.style.setProperty('--bg-dark', '#1a1a2e');
        document.documentElement.style.setProperty('--bg-darker', '#16162a');
        document.documentElement.style.setProperty('--text-primary', '#eaeaea');
        document.documentElement.style.setProperty('--text-secondary', '#a0a0a0');
        document.documentElement.style.setProperty('--border', '#2a2a4a');
        const iconMoon = document.querySelector('.icon-moon');
        if (iconMoon) iconMoon.innerHTML = icons.moon;
    }
}

window.updateUserDisplay = function() {
    const userName = state.getSettings().userName;
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        if (userName) {
            userDisplay.textContent = `👤 ${userName}`;
        } else {
            userDisplay.textContent = '👤 Guest (Set name in Settings)';
        }
    }
};
