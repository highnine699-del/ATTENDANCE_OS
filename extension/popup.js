/**
 * Extension popup logic
 */

const APP_URLS = [
    'https://highnine699-del.github.io/ATTENDANCE_TRACKER/',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
];

function buildTabQueryPattern(url) {
    const normalized = url.endsWith('/') ? url : `${url}/`;
    return `${normalized}*`;
}

function calculatePercentage(attended, total) {
    if (!total || total <= 0) return 0;
    return Math.round((attended / total) * 1000) / 10;
}

function calculateWeightedAttendance(courses) {
    const active = (courses || []).filter(c => c && c.totalClasses > 0);
    if (!active.length) return 0;

    const totalWeight = active.reduce((s, c) => {
        const units = Number.isFinite(c?.units) ? Math.max(c.units, 1) : 1;
        return s + units;
    }, 0);

    if (totalWeight <= 0) return 0;

    const weightedSum = active.reduce((s, c) => {
        const pct = calculatePercentage(c.attended, c.totalClasses);
        const units = Number.isFinite(c?.units) ? Math.max(c.units, 1) : 1;
        return s + pct * units;
    }, 0);

    return Math.round((weightedSum / totalWeight) * 10) / 10;
}

function chromeTabsQuery(query) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query(query, (tabs) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(tabs);
            }
        });
    });
}

function chromeTabsUpdate(tabId, updateProperties) {
    return new Promise((resolve, reject) => {
        chrome.tabs.update(tabId, updateProperties, (tab) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(tab);
            }
        });
    });
}

function chromeWindowsUpdate(windowId, updateInfo) {
    return new Promise((resolve, reject) => {
        chrome.windows.update(windowId, updateInfo, (window) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(window);
            }
        });
    });
}

function chromeTabsCreate(createProperties) {
    return new Promise((resolve, reject) => {
        chrome.tabs.create(createProperties, (tab) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(tab);
            }
        });
    });
}

function chromeRuntimeSendMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

function renderStats(data) {
    const overallEl = document.getElementById('overall-pct');
    const atRiskEl = document.getElementById('at-risk-list');
    if (!overallEl || !atRiskEl) return;

    const courses = data?.courses || [];
    if (!Array.isArray(courses) || courses.length === 0) {
        overallEl.textContent = '—';
        atRiskEl.innerHTML = '<li class="muted">No data synced yet</li>';
        return;
    }

    const activeCourses = (courses || []).filter(c => c && c.totalClasses > 0);
    const weighted = calculateWeightedAttendance(activeCourses.length > 0 ? activeCourses : courses || []);
    const hasData = activeCourses.length > 0;
    overallEl.textContent = hasData ? `${weighted}%` : '—';
    overallEl.style.color = hasData
        ? (weighted >= 75 ? '#10b981' : weighted >= 60 ? '#f59e0b' : '#ef4444')
        : 'var(--text-secondary)';

    const atRisk = activeCourses
        .map(c => ({ ...c, pct: calculatePercentage(c.attended, c.totalClasses) }))
        .filter(c => c.pct < 75)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 3);

    if (atRisk.length === 0) {
        atRiskEl.innerHTML = '<li class="muted">All courses safe</li>';
        return;
    }

    atRiskEl.innerHTML = atRisk.map(c => {
        const color = c.pct >= 75 ? '#10b981' : c.pct >= 60 ? '#f59e0b' : '#ef4444';
        return `<li><span class="course-code">${c.courseCode}</span><span class="pct-badge" style="color:${color}">${c.pct}%</span></li>`;
    }).join('');
}

async function openApp() {
    for (const url of APP_URLS) {
        const pattern = buildTabQueryPattern(url);
        const tabs = await chromeTabsQuery({ url: pattern });
        if (tabs.length > 0) {
            await chromeTabsUpdate(tabs[0].id, { active: true });
            await chromeWindowsUpdate(tabs[0].windowId, { focused: true });
            return;
        }
    }
    await chromeTabsCreate({ url: APP_URLS[0] });
}

document.addEventListener('DOMContentLoaded', () => {
    const scrapeBtn = document.getElementById('scrape-btn');
    const openWebappBtn = document.getElementById('open-webapp-btn');
    const statusText = document.getElementById('status-text');

    chrome.storage.local.get('attendanceData', (result) => {
        if (chrome.runtime.lastError) {
            statusText.textContent = 'Unable to load saved attendance data';
            statusText.style.color = '#ef4444';
            return;
        }
        if (result.attendanceData?.courses?.length) {
            statusText.textContent = `${result.attendanceData.courses.length} courses synced`;
            renderStats(result.attendanceData);
        }
    });

    scrapeBtn.addEventListener('click', async () => {
        statusText.textContent = 'Finding LMU portal tab...';
        scrapeBtn.disabled = true;

        try {
            const tabs = await chromeTabsQuery({ url: 'https://att2.lmu.edu.ng/*' });

            if (tabs.length === 0) {
                statusText.textContent = 'Opening LMU portal...';
                await chromeTabsCreate({ url: 'https://att2.lmu.edu.ng' });
                statusText.textContent = 'Please login, then click Sync Now again';
                return;
            }

            statusText.textContent = 'Scraping attendance data...';

            const response = await chromeRuntimeSendMessage({
                action: 'scrapeAttendance',
                tabId: tabs[0].id
            });

            if (!response || !response.success) {
                throw new Error(response?.error || 'Unknown scrape failure');
            }

            const saveResponse = await chromeRuntimeSendMessage({
                action: 'saveAttendanceData',
                data: response.data
            });

            if (!saveResponse?.success) {
                throw new Error(saveResponse?.error || 'Failed to save attendance data');
            }

            const courseCount = response.data.courses.length;
            statusText.textContent = `Synced ${courseCount} courses`;
            statusText.style.color = '#10b981';
            renderStats(response.data);
        } catch (err) {
            statusText.textContent = `Error: ${err.message}`;
            statusText.style.color = '#ef4444';
        } finally {
            scrapeBtn.disabled = false;
        }
    });

    openWebappBtn.addEventListener('click', () => openApp());
});
