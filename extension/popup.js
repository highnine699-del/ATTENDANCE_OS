/**
 * Extension popup logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const scrapeBtn = document.getElementById('scrape-btn');
    const openWebappBtn = document.getElementById('open-webapp-btn');
    const statusText = document.getElementById('status-text');

    // Scrape button
    scrapeBtn.addEventListener('click', async () => {
        statusText.textContent = 'Finding LMU portal tab...';
        scrapeBtn.disabled = true;

        try {
            // Find or open att2.lmu.edu.ng tab
            const tabs = await chrome.tabs.query({ url: 'https://att2.lmu.edu.ng/*' });
            
            if (tabs.length === 0) {
                statusText.textContent = 'Opening LMU portal...';
                await chrome.tabs.create({ url: 'https://att2.lmu.edu.ng' });
                statusText.textContent = 'Please login, then click Scrape again';
                scrapeBtn.disabled = false;
                return;
            }

            const tab = tabs[0];
            statusText.textContent = 'Scraping attendance data...';

            // Trigger scrape with tab ID
            const response = await chrome.runtime.sendMessage({
                action: 'scrapeAttendance',
                tabId: tab.id
            });

            if (response.success && response.data) {
                // Save to storage
                await chrome.runtime.sendMessage({
                    action: 'saveAttendanceData',
                    data: response.data
                });

                const courseCount = response.data.courses.length;
                statusText.textContent = `✅ Synced ${courseCount} courses!`;
                statusText.style.color = '#10b981';
            } else {
                statusText.textContent = `❌ Failed: ${response.error || 'Unknown error'}`;
                statusText.style.color = '#ef4444';
            }
        } catch (err) {
            statusText.textContent = `❌ Error: ${err.message}`;
            statusText.style.color = '#ef4444';
        }

        scrapeBtn.disabled = false;
    });

    // Open web app button
    openWebappBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000' });
    });

    // Check if we have saved data
    chrome.storage.local.get('attendanceData', (result) => {
        if (result.attendanceData && result.attendanceData.courses) {
            statusText.textContent = `Last sync: ${result.attendanceData.courses.length} courses`;
        }
    });
});
