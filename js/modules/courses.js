import { validateCourse, validateAttendance } from '../validator.js';
import { calculatePercentage } from '../engine.js';
import { icons } from '../icons.js';

export function renderCourses(state, container) {
    const courses = state.getCourses();
    const settings = state.getSettings();

    // Empty state when no courses
    if (courses.length === 0) {
        container.innerHTML = `
            <div class="courses-module">
                <h2>My Courses</h2>
                
                <div class="course-actions">
                    <button id="add-course-btn" class="btn-primary">Add Course</button>
                </div>

                <div class="empty-state">
                    <div class="empty-icon">${icons.book}</div>
                    <h3>No Courses Yet</h3>
                    <p>Add your courses manually or sync from the LMU portal to get started.</p>
                </div>
            </div>
        `;
        // Still need to attach event listener for add button
        document.getElementById('add-course-btn')?.addEventListener('click', () => {
            showAddCourseModal(state);
        });
        return;
    }

    const html = `
        <div class="courses-module">
            <h2>My Courses</h2>
            
            <div class="course-actions">
                <button id="add-course-btn" class="btn-primary">Add Course</button>
            </div>

            <div class="filter-controls">
                <label>
                    Sort by:
                    <select id="sort-select">
                        <option value="code">Course Code</option>
                        <option value="percentage">Attendance %</option>
                        <option value="units">Units</option>
                        <option value="title">Course Title</option>
                    </select>
                </label>
                <label>
                    Filter by Status:
                    <select id="filter-select">
                        <option value="all">All</option>
                        <option value="safe">Safe (≥${settings.passThresholdPercent}%)</option>
                        <option value="warning">Warning (50-74%)</option>
                        <option value="danger">Danger (<50%)</option>
                    </select>
                </label>
                <label>
                    Filter by Type:
                    <select id="type-filter">
                        <option value="all">All Types</option>
                        <option value="CC">CC (Core)</option>
                        <option value="UC">UC (University)</option>
                    </select>
                </label>
            </div>

            <div class="courses-grid" id="courses-grid">
                ${courses.map(c => `
                    <div class="course-card ${getAlertClass(c.percentage, settings.passThresholdPercent)}" data-code="${c.courseCode}" data-percentage="${c.percentage}" data-units="${c.units}" data-title="${c.courseTitle}" data-type="${c.courseType}">
                        <div class="card-header">
                            <h4>${c.courseCode}</h4>
                            <button class="delete-btn" data-code="${c.courseCode}">${icons.trash}</button>
                        </div>
                        <p class="course-title">${c.courseTitle}</p>
                        <div class="course-details">
                            <p><strong>Units:</strong> ${c.units}</p>
                            <p><strong>Type:</strong> ${c.courseType}</p>
                        </div>
                        <div class="course-stats">
                            <span>${c.attended}/${c.totalClasses} attended</span>
                            <span class="percentage">${c.percentage}%</span>
                        </div>
                        <button class="edit-btn btn-secondary" data-code="${c.courseCode}">Edit</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Sort and filter functionality
    const sortSelect = document.getElementById('sort-select');
    const filterSelect = document.getElementById('filter-select');
    const typeFilter = document.getElementById('type-filter');
    const coursesGrid = document.getElementById('courses-grid');

    function applySortAndFilter() {
        const sortBy = sortSelect.value;
        const filterStatus = filterSelect.value;
        const filterType = typeFilter.value;
        const threshold = settings.passThresholdPercent;

        let courseCards = Array.from(coursesGrid.querySelectorAll('.course-card'));

        // Filter by status
        courseCards.forEach(card => {
            const percentage = parseFloat(card.dataset.percentage);
            const type = card.dataset.type;
            
            let statusMatch = true;
            if (filterStatus === 'safe') statusMatch = percentage >= threshold;
            else if (filterStatus === 'warning') statusMatch = percentage >= 50 && percentage < threshold;
            else if (filterStatus === 'danger') statusMatch = percentage < 50;

            let typeMatch = filterType === 'all' || type === filterType;

            card.style.display = (statusMatch && typeMatch) ? '' : 'none';
        });

        // Sort visible cards
        const visibleCards = courseCards.filter(card => card.style.display !== 'none');
        
        visibleCards.sort((a, b) => {
            switch (sortBy) {
                case 'code':
                    return a.dataset.code.localeCompare(b.dataset.code);
                case 'percentage':
                    return parseFloat(b.dataset.percentage) - parseFloat(a.dataset.percentage);
                case 'units':
                    return parseFloat(b.dataset.units) - parseFloat(a.dataset.units);
                case 'title':
                    return a.dataset.title.localeCompare(b.dataset.title);
                default:
                    return 0;
            }
        });

        // Reorder in DOM
        visibleCards.forEach(card => coursesGrid.appendChild(card));
    }

    sortSelect.addEventListener('change', applySortAndFilter);
    filterSelect.addEventListener('change', applySortAndFilter);
    typeFilter.addEventListener('change', applySortAndFilter);

    // Event listeners
    document.getElementById('add-course-btn').addEventListener('click', () => {
        showAddCourseModal(state);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const courseCode = e.target.dataset.code;
            showEditCourseModal(state, courseCode);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const courseCode = e.target.dataset.code;
            if (confirm(`Delete ${courseCode}?`)) {
                state.deleteCourse(courseCode);
                renderCourses(state, container);
            }
        });
    });
}

function showAddCourseModal(state) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add Course</h3>
            <form id="add-course-form">
                <label>Course Code: <input type="text" name="courseCode" required></label>
                <label>Course Title: <input type="text" name="courseTitle" required></label>
                <label>Units: <input type="number" name="units" min="0" required></label>
                <label>Type: 
                    <select name="courseType">
                        <option value="CC">CC (Core)</option>
                        <option value="UC">UC (University)</option>
                    </select>
                </label>
                <div class="modal-actions">
                    <button type="submit" class="btn-primary">Add</button>
                    <button type="button" class="btn-secondary cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('#add-course-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const course = {
            courseCode: fd.get('courseCode').toUpperCase(),
            courseTitle: fd.get('courseTitle'),
            units: parseInt(fd.get('units')),
            courseType: fd.get('courseType')
        };

        const validation = validateCourse(course);
        if (!validation.valid) {
            alert(validation.errors.join('\n'));
            return;
        }

        state.addCourse(course);
        modal.remove();
        renderCourses(state, document.getElementById('content'));
    });
}

function showEditCourseModal(state, courseCode) {
    const course = state.getCourse(courseCode);
    if (!course) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Edit ${courseCode}</h3>
            <form id="edit-course-form">
                <label>Attended: <input type="number" name="attended" min="0" value="${course.attended}" required></label>
                <label>Total Classes: <input type="number" name="totalClasses" min="0" value="${course.totalClasses}" required></label>
                <label>Notes: <input type="text" name="notes" value="${course.notes || ''}"></label>
                <div class="modal-actions">
                    <button type="submit" class="btn-primary">Update</button>
                    <button type="button" class="btn-secondary cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('#edit-course-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const attended = parseInt(fd.get('attended'));
        const totalClasses = parseInt(fd.get('totalClasses'));
        const notes = fd.get('notes');

        const validation = validateAttendance(attended, totalClasses);
        if (!validation.valid) {
            alert(validation.errors.join('\n'));
            return;
        }

        state.updateCourse(courseCode, {
            attended,
            totalClasses,
            percentage: calculatePercentage(attended, totalClasses),
            notes
        });
        modal.remove();
        renderCourses(state, document.getElementById('content'));
    });
}

function getAlertClass(percentage, threshold = 75) {
    // 5-level evaluation system
    if (percentage >= 90) return 'alert-excellent';
    if (percentage >= 80) return 'alert-safe';
    if (percentage >= threshold + 3) return 'alert-near-boundary';
    if (percentage >= threshold) return 'alert-warning';
    return 'alert-danger';
}
