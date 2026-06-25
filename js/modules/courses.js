import { validateCourse, validateAttendance } from '../validator.js';
import { calculatePercentage, calcCourseStats, getStatusMeta, getStatus } from '../engine.js';
import { formatDate } from '../utils.js';
import { icons } from '../icons.js';
import { showSuccess, showError } from '../toast.js';

export function renderCourses(state, container) {
    const courses  = state.getCourses();
    const settings = state.getSettings();
    const threshold = settings.passThresholdPercent || 75;

    if (courses.length === 0) {
        container.innerHTML = `
            <div class="courses-module">
                <h2>My Courses</h2>
                <div class="course-actions">
                    <button id="add-course-btn" class="btn-primary">+ Add Course</button>
                </div>
                <div class="empty-state">
                    <div class="empty-icon">${icons.book}</div>
                    <h3>No Courses Yet</h3>
                    <p>Add your courses manually or sync from the LMU portal.</p>
                </div>
            </div>`;
        document.getElementById('add-course-btn')?.addEventListener('click', () => showAddCourseModal(state, container));
        return;
    }

    const html = `
        <div class="courses-module">
            <h2>My Courses</h2>
            <div class="course-actions">
                <button id="add-course-btn" class="btn-primary">+ Add Course</button>
            </div>
            <div class="filter-controls">
                <label>Sort:
                    <select id="sort-select">
                        <option value="risk">Risk (worst first)</option>
                        <option value="code">Course Code</option>
                        <option value="percentage">Attendance %</option>
                        <option value="units">Units</option>
                    </select>
                </label>
                <label>Status:
                    <select id="filter-select">
                        <option value="all">All</option>
                        <option value="at-risk">At Risk</option>
                        <option value="safe">Safe</option>
                    </select>
                </label>
                <label>Type:
                    <select id="type-filter">
                        <option value="all">All Types</option>
                        <option value="CC">CC (Core)</option>
                        <option value="UC">UC (University)</option>
                    </select>
                </label>
            </div>
            <div class="courses-grid" id="courses-grid">
                ${courses.map(c => buildCourseCard(c, threshold)).join('')}
            </div>
        </div>`;

    container.innerHTML = html;
    wireCoursesEvents(state, container, threshold);
}

function buildCourseCard(c, threshold) {
    const stats   = calcCourseStats(c, threshold);
    const meta    = stats.meta;
    const pct     = stats.percentage;
    const barPct  = c.totalClasses > 0 ? Math.min(100, pct) : 0;

    const skipsInfo = c.totalClasses === 0
        ? '<span class="muted">No data yet</span>'
        : stats.safeSkips > 0
            ? `<span class="safe-skips-count">${stats.safeSkips} skip${stats.safeSkips !== 1 ? 's' : ''} left</span>`
            : stats.lecturesNeeded > 0
                ? `<span class="need-attend">Attend ${stats.lecturesNeeded} to recover</span>`
                : `<span class="at-limit">At limit — 0 skips</span>`;

    return `
        <div class="course-card ${meta.cssClass}" 
             data-code="${c.courseCode}" 
             data-percentage="${pct}" 
             data-units="${c.units}"
             data-title="${c.courseTitle}"
             data-type="${c.courseType}"
             data-status="${stats.status}">
            <div class="card-header">
                <div class="card-title-group">
                    <h4>${c.courseCode}</h4>
                    <span class="status-badge" style="background:${meta.color}20;color:${meta.color};border:1px solid ${meta.color}40">${meta.label}</span>
                </div>
                <button class="delete-btn" data-code="${c.courseCode}" title="Delete course">${icons.trash}</button>
            </div>
            <p class="course-title">${c.courseTitle}</p>
            <div class="course-meta-row">
                <span>${c.units} unit${c.units !== 1 ? 's' : ''}</span>
                <span class="type-pill">${c.courseType}</span>
            </div>

            <div class="attendance-bar-container" title="${pct}%">
                <div class="attendance-bar" style="width:${barPct}%;background:${meta.color}"></div>
            </div>

            <div class="course-stats">
                <span class="attended-count">${c.attended}/${c.totalClasses} classes</span>
                <span class="pct-badge" style="color:${meta.color};font-weight:600">${pct}%</span>
            </div>
            <div class="skips-row">${skipsInfo}</div>

            <div class="card-actions">
                <button class="btn-quick-attend btn-primary" data-code="${c.courseCode}" title="Mark attended">+1 Attended</button>
                <button class="btn-quick-class btn-secondary" data-code="${c.courseCode}" title="Class held, not attended">+1 Class</button>
                <button class="edit-btn btn-secondary" data-code="${c.courseCode}">Edit</button>
            </div>
        </div>`;
}

function wireCoursesEvents(state, container, threshold) {
    const sortSelect   = document.getElementById('sort-select');
    const filterSelect = document.getElementById('filter-select');
    const typeFilter   = document.getElementById('type-filter');
    const grid         = document.getElementById('courses-grid');

    function applySortFilter() {
        const sortBy   = sortSelect.value;
        const statusF  = filterSelect.value;
        const typeF    = typeFilter.value;

        let cards = Array.from(grid.querySelectorAll('.course-card'));

        cards.forEach(card => {
            const pct    = parseFloat(card.dataset.percentage);
            const type   = card.dataset.type;
            const status = card.dataset.status;
            const isAtRisk = ['warning','danger','critical'].includes(status);
            const statusOk = statusF === 'all' || (statusF === 'at-risk' && isAtRisk) || (statusF === 'safe' && !isAtRisk);
            const typeOk   = typeF === 'all' || type === typeF;
            card.style.display = (statusOk && typeOk) ? '' : 'none';
        });

        const visible = cards.filter(c => c.style.display !== 'none');
        visible.sort((a, b) => {
            if (sortBy === 'risk')       return parseFloat(a.dataset.percentage) - parseFloat(b.dataset.percentage);
            if (sortBy === 'percentage') return parseFloat(b.dataset.percentage) - parseFloat(a.dataset.percentage);
            if (sortBy === 'units')      return parseFloat(b.dataset.units) - parseFloat(a.dataset.units);
            return a.dataset.code.localeCompare(b.dataset.code);
        });
        visible.forEach(c => grid.appendChild(c));
    }

    sortSelect.addEventListener('change', applySortFilter);
    filterSelect.addEventListener('change', applySortFilter);
    typeFilter.addEventListener('change', applySortFilter);

    document.getElementById('add-course-btn')?.addEventListener('click', () => showAddCourseModal(state, container));

    // Quick +1 attended
    grid.addEventListener('click', e => {
        const attendBtn = e.target.closest('.btn-quick-attend');
        const classBtn  = e.target.closest('.btn-quick-class');
        const editBtn   = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (attendBtn) {
            const code   = attendBtn.dataset.code;
            const course = state.getCourse(code);
            if (!course) return;
            const newAttended = course.attended + 1;
            const newTotal    = course.totalClasses + 1;
            state.updateCourse(code, {
                attended: newAttended, totalClasses: newTotal,
                percentage: calculatePercentage(newAttended, newTotal)
            });
            showSuccess(`${code} — marked attended (${newAttended}/${newTotal})`);
            renderCourses(state, container);
        }

        if (classBtn) {
            const code   = classBtn.dataset.code;
            const course = state.getCourse(code);
            if (!course) return;
            const newTotal = course.totalClasses + 1;
            state.updateCourse(code, {
                totalClasses: newTotal,
                percentage: calculatePercentage(course.attended, newTotal)
            });
            showSuccess(`${code} — class added (${course.attended}/${newTotal})`);
            renderCourses(state, container);
        }

        if (editBtn) showEditCourseModal(state, editBtn.dataset.code, container);

        if (deleteBtn) {
            const code = deleteBtn.dataset.code;
            if (confirm(`Delete ${code}? This cannot be undone.`)) {
                state.deleteCourse(code);
                showSuccess(`${code} deleted`);
                renderCourses(state, container);
            }
        }
    });
}

function showAddCourseModal(state, container) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add Course</h3>
            <div id="add-form-fields">
                <label>Course Code <input type="text" id="m-code" placeholder="e.g. EEE102" required></label>
                <label>Course Title <input type="text" id="m-title" placeholder="e.g. Basic Electrical Engineering" required></label>
                <label>Units <input type="number" id="m-units" min="0" max="10" value="2" required></label>
                <label>Type
                    <select id="m-type">
                        <option value="CC">CC (Core Course)</option>
                        <option value="UC">UC (University Course)</option>
                    </select>
                </label>
                <p id="add-error" class="error-msg" style="display:none"></p>
            </div>
            <div class="modal-actions">
                <button id="m-submit" class="btn-primary">Add Course</button>
                <button id="m-cancel" class="btn-secondary">Cancel</button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#m-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('#m-submit').addEventListener('click', () => {
        const course = {
            courseCode:  modal.querySelector('#m-code').value.trim().toUpperCase(),
            courseTitle: modal.querySelector('#m-title').value.trim(),
            units:       parseInt(modal.querySelector('#m-units').value),
            courseType:  modal.querySelector('#m-type').value
        };
        const { valid, errors } = validateCourse(course);
        if (!valid) {
            const errEl = modal.querySelector('#add-error');
            errEl.textContent = errors.join(' · ');
            errEl.style.display = 'block';
            return;
        }
        state.addCourse(course);
        modal.remove();
        showSuccess(`${course.courseCode} added`);
        renderCourses(state, container);
    });
}

function showEditCourseModal(state, courseCode, container) {
    const course = state.getCourse(courseCode);
    if (!course) return;

    const history = (course.history || []).slice().reverse().slice(0, 10);
    const historyHtml = history.length > 0
        ? history.map(h => {
            const pct = h.percentage ?? calculatePercentage(h.attended, h.totalClasses);
            return `<div class="history-entry">${formatDate(h.date)} — ${h.attended}/${h.totalClasses} (${pct}%)</div>`;
        }).join('')
        : '<p class="muted">No history yet.</p>';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Edit ${courseCode}</h3>
            <label>Classes Attended <input type="number" id="e-attended" min="0" value="${course.attended}"></label>
            <label>Total Classes Held <input type="number" id="e-total" min="0" value="${course.totalClasses}"></label>
            <label>Notes <input type="text" id="e-notes" value="${course.notes || ''}" placeholder="Optional notes"></label>
            <div class="history-section">
                <h4>Change History</h4>
                <div class="history-list">${historyHtml}</div>
            </div>
            <p id="edit-error" class="error-msg" style="display:none"></p>
            <div class="modal-actions">
                <button id="e-submit" class="btn-primary">Update</button>
                <button id="e-cancel" class="btn-secondary">Cancel</button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#e-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('#e-submit').addEventListener('click', () => {
        const attended    = parseInt(modal.querySelector('#e-attended').value);
        const totalClasses = parseInt(modal.querySelector('#e-total').value);
        const notes       = modal.querySelector('#e-notes').value.trim();
        const { valid, errors } = validateAttendance(attended, totalClasses);
        if (!valid) {
            const errEl = modal.querySelector('#edit-error');
            errEl.textContent = errors.join(' · ');
            errEl.style.display = 'block';
            return;
        }
        state.updateCourse(courseCode, {
            attended, totalClasses, notes,
            percentage: calculatePercentage(attended, totalClasses)
        });
        modal.remove();
        showSuccess(`${courseCode} updated`);
        renderCourses(state, container);
    });
}
