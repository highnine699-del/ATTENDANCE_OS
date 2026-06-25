/**
 * Extension popup logic
 */

const APP_URLS = [
    'https://highnine699-del.github.io/attendance-os/',
    'http://localhost:3000',
    'http://localhost:8080'
];

function calculatePercentage(attended, total) {
    if (!total || total <= 0) return 0;
    return Math.round((attended / total) * 1000) / 10;
}

function calculateWeightedAttendance(courses) {
    const active = (courses || []).filter(c => c.totalClasses > 0);
    if (!active.length) return 0;
    const totalWeight = active.reduce((s, c) => s + Math.max(c.units || 0, 1), 0);
    const weightedSum = active.reduce((s, c) => {
        const pct = calculatePercentage(c.attended, c.totalClasses);
        return s + pct * Math.max(c.units || 0, 1);
    }, 0);
    return Math.round((weightedSum / totalWeight) * 10) / 10;
}

function renderStats(data) {
    const overallEl = document.getElementById('overall-pct');
    const atRiskEl  = document.getElementById('at-risk-list');
    if (!overallEl || !atRiskEl) return;

    const courses = data?.courses || [];
    if (courses.length === 0) {
        overallEl.textContent = '—';
        atRiskEl.innerHTML = '<li class="muted">No data synced yet</li>';
        return;
    }

    const weighted = calculateWeightedAttendance(courses);
    overallEl.textContent = weighted > 0 ? `${weighted}%` : '—';
    overallEl.style.color = weighted >= 75 ? '#10b981' : weighted >= 60 ? '#f59e0b' : '#ef4444';

    const atRisk = courses
        .filter(c => c.totalClasses > 0)
        .map(c => ({ ...c, pct: calculatePercentage(c.attended, c.totalClasses) }))
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
        const pattern = url.includes('localhost') ? `${url}/*` : url + '*';
        const tabs = await chrome.tabs.query({ url: pattern });
        if (tabs.length > 0) {
            await chrome.tabs.update(tabs[0].id, { active: true });
            await chrome.windows.update(tabs[0].windowId, { focused: true });
            return;
        }
    }
    chrome.tabs.create({ url: APP_URLS[0] });
}

document.addEventListener('DOMContentLoaded', () => {
    const scrapeBtn = document.getElementById('scrape-btn');
    const openWebappBtn = document.getElementById('open-webapp-btn');
    const statusText = document.getElementById('status-text');

    chrome.storage.local.get('attendanceData', (result) => {
        if (result.attendanceData?.courses?.length) {
            statusText.textContent = `${result.attendanceData.courses.length} courses synced`;
            renderStats(result.attendanceData);
        }
    });

    scrapeBtn.addEventListener('click', async () => {
        statusText.textContent = 'Finding LMU portal tab...';
        scrapeBtn.disabled = true;

        try {
            const tabs = await chrome.tabs.query({ url: 'https://att2.lmu.edu.ng/*' });

            if (tabs.length === 0) {
                statusText.textContent = 'Opening LMU portal...';
                await chrome.tabs.create({ url: 'https://att2.lmu.edu.ng' });
                statusText.textContent = 'Please login, then click Sync Now again';
                scrapeBtn.disabled = false;
                return;
            }

            statusText.textContent = 'Scraping attendance data...';

            const response = await chrome.runtime.sendMessage({
                action: 'scrapeAttendance',
                tabId: tabs[0].id
            });

            if (response.success && response.data) {
                await chrome.runtime.sendMessage({
                    action: 'saveAttendanceData',
                    data: response.data
                });

                const courseCount = response.data.courses.length;
                statusText.textContent = `Synced ${courseCount} courses`;
                statusText.style.color = '#10b981';
                renderStats(response.data);
            } else {
                statusText.textContent = `Failed: ${response.error || 'Unknown error'}`;
                statusText.style.color = '#ef4444';
            }
        } catch (err) {
            statusText.textContent = `Error: ${err.message}`;
            statusText.style.color = '#ef4444';
        }

        scrapeBtn.disabled = false;
    });

    openWebappBtn.addEventListener('click', () => openApp());
});
