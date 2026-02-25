// static/templates/hr_management.js

let allEmployees = [];
let currentHRWorkFilter = 'All';

document.addEventListener('DOMContentLoaded', () => {
    fetchEmployees();

    const form = document.getElementById('employee-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveEmployee();
        });
    }
});

async function fetchEmployees() {
    try {
        const res = await apiFetch('/api/employees/');
        if (res.ok) {
            allEmployees = await res.json();
            renderHREmployeeTable(allEmployees);
        }
    } catch (err) {
        console.error("Failed to fetch employees:", err);
    }
}

/**
 * Maps cryptic database codes to PDF-style Descriptive nomenclature
 */
function getDescriptiveServiceName(plan, service, shift) {
    if (!plan || !service) return "General Care Visit";

    let base = service;
    if (plan.includes('Skilled')) base = "Skilled Nursing";
    else if (plan.includes('Attendant')) base = "Patient Attendant Care";

    let duration = shift || "Per Visit";
    if (duration.includes('12')) duration = "12-hr Day";
    else if (duration.includes('24')) duration = "24-hr Full Stay";

    return `${base} - ${duration}`;
}

async function renderHREmployeeTable(data) {
    const tbody = document.getElementById('hrTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const isAdminPage = window.location.pathname.includes('admin_panel') || window.location.pathname.includes('hr_management');
    const myRole = sessionStorage.getItem('userRole');
    const canSeeSensitive = (myRole === 'Founding Member' || myRole === 'Founder' || myRole === 'Director' || window.hasPermission('access_hr_sensitive'));

    data.forEach(emp => {
        const tr = document.createElement('tr');
        const isTerminated = emp.status === 'Terminated';
        const isGig = emp.employment_type === 'Gig/Retainer';

        tr.className = isTerminated ? "bg-red-50 hover:bg-red-100 transition-colors" : "hover:bg-gray-50 transition-colors border-b border-gray-100";

        // Expansion logic ONLY for Admin Panel
        if (isAdminPage) {
            tr.style.cursor = "pointer";
            tr.onclick = () => toggleRowExpansion(emp.id);
        }

        const statusBadge = getStatusBadge(emp.status);
        const workType = emp.work_type || 'Field Staff';

        // Earnings Display
        let earningsVal = `₹${emp.earnings_per_month || '0'}`;
        if (isGig) earningsVal = `₹${emp.total_salary_earned || '0'}`;

        tr.innerHTML = `
            <td class="px-2 py-4 font-mono text-[9px] text-gray-400">ID-${emp.id.substring(0, 5)}</td>
            <td class="px-2 py-4 font-bold text-gray-900">${emp.name}</td>
            <td class="px-2 py-4 text-gray-600">${canSeeSensitive ? (emp.pan || '-') : '***'}</td>
            <td class="px-2 py-4 text-gray-600">${canSeeSensitive ? (emp.aadhar || '-') : '***'}</td>
            <td class="px-2 py-4 text-gray-600">${emp.gender || '-'}</td>
            <td class="px-2 py-4 text-gray-600">${emp.age || '-'}</td>
            <td class="px-2 py-4 font-bold text-royal-blue uppercase tracking-tighter text-[9px]">${emp.designation || emp.role || '-'}</td>
            <td class="px-2 py-4 text-gray-500">${emp.employment_type || 'Payroll'}</td>
            <td class="px-2 py-4 text-gray-600">${emp.mobile || '-'}</td>
            <td class="px-2 py-4 text-gray-500 max-w-[150px] truncate" title="${emp.address || ''}">${emp.address || '-'}</td>
            <td class="px-2 py-4 text-gray-600 font-bold">${emp.work_location || '-'}</td>
            <td class="px-2 py-4 font-bold text-green-700">${earningsVal}<span class="block text-[8px] text-gray-400 font-normal">CTC</span></td>
            <td class="px-2 py-4 text-center">${statusBadge}</td>
            <td class="px-2 py-4 text-right" onclick="event.stopPropagation()">
                <div class="flex justify-end gap-1">
                    <button onclick="editEmployee('${emp.id}')" class="p-1 text-royal-blue hover:scale-110 transition-transform" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="terminateEmployeePrompt('${emp.id}')" class="p-1 text-red-500 hover:scale-110 transition-transform" title="Terminate">
                        <i class="fas fa-user-slash"></i>
                    </button>
                </div>
            </td>
        `;

        if (isAdminPage) {
            const expansionTr = document.createElement('tr');
            expansionTr.id = `expand-${emp.id}`;
            expansionTr.className = "hidden bg-gray-50/80";

            // Calculate Experience in Vesak
            let expInVesak = "N/A";
            if (emp.joining_date) {
                const join = new Date(emp.joining_date);
                const now = new Date();
                const diffTime = Math.abs(now - join);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const years = Math.floor(diffDays / 365);
                const months = Math.floor((diffDays % 365) / 30);
                expInVesak = `${years}y ${months}m`;
            }

            // Build Field vs Office specific sections
            const isFieldStaff = (emp.work_type === 'Field Staff');

            // Field Staff: Ratings Matrix + Clients Visited
            // Office Staff: Department + Functional Responsibilities
            let col3Html = '';
            let col4Html = '';

            if (isFieldStaff) {
                col3Html = `
                    <div class="space-y-4">
                        <h4 class="text-[10px] uppercase font-bold text-royal-gold tracking-widest">Field Tracking</h4>
                        <a href="employee_assignments.html?id=${emp.id}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-royal-blue text-white text-[10px] font-bold rounded-lg hover:shadow-md transition-all">
                            <i class="fas fa-users-viewfinder"></i> Clients they have visited to
                        </a>
                        <div class="pt-2">
                            <span class="text-[9px] text-gray-400 uppercase">Resigned Date</span>
                            <span class="text-xs text-gray-600 block">${emp.resigned_date || '-'}</span>
                        </div>
                        ${emp.resignation_note && !isTerminated ? `
                            <div class="mt-1">
                                <span class="text-[9px] text-gray-400 uppercase">Note</span>
                                <span class="text-xs text-gray-600 block italic">${emp.resignation_note}</span>
                            </div>
                        ` : ''}
                        ${isTerminated ? `
                            <div class="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
                                <div class="text-[9px] font-bold uppercase tracking-wider">⛔ Terminated by Company</div>
                                <div class="text-[10px] mt-1"><strong>By:</strong> ${emp.terminated_by || 'N/A'}</div>
                                <div class="text-[10px] italic mt-0.5"><strong>Reason:</strong> ${emp.resignation_note || 'N/A'}</div>
                            </div>
                        ` : ''}
                    </div>`;
                col4Html = `
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <h4 class="text-[10px] uppercase font-bold text-royal-gold tracking-widest">Ratings Matrix</h4>
                            <button onclick="toggleRatingsPop('${emp.id}')" class="text-[9px] font-bold text-royal-blue underline">See More</button>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-[9px]">
                            <div class="bg-white p-1.5 border border-gray-100 rounded">
                                <span class="text-gray-400">Knowledge</span>
                                <div class="font-bold text-royal-blue">${emp.rating_knowledge || 0}/5</div>
                            </div>
                            <div class="bg-white p-1.5 border border-gray-100 rounded">
                                <span class="text-gray-400">Communication</span>
                                <div class="font-bold text-royal-blue">${emp.rating_communication || 0}/5</div>
                            </div>
                        </div>
                        <div id="ratings-pop-${emp.id}" class="hidden p-3 bg-white border border-royal-gold/20 rounded-lg shadow-xl space-y-2 mt-2">
                            <div class="flex justify-between text-[9px]"><span>Customer Feedback:</span><span class="font-bold">${emp.rating_customer_feedback || 0}/5</span></div>
                            <div class="flex justify-between text-[9px]"><span>Customer Request:</span><span class="font-bold">${emp.rating_customer_request || 0}/5</span></div>
                            <div class="flex justify-between text-[9px]"><span>Loyalty Index:</span><span class="font-bold">${emp.rating_loyalty || 0}/5</span></div>
                            <div class="flex justify-between text-[9px]"><span>Trust Index:</span><span class="font-bold">${emp.rating_trust || 0}/5</span></div>
                        </div>
                    </div>`;
            } else {
                // Office Staff
                col3Html = `
                    <div class="space-y-4">
                        <h4 class="text-[10px] uppercase font-bold text-royal-gold tracking-widest">Office Details</h4>
                        <div class="flex flex-col">
                            <span class="text-[9px] text-gray-400 uppercase">Department</span>
                            <span class="text-xs font-semibold text-gray-800">${emp.department || 'N/A'}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[9px] text-gray-400 uppercase">Functional Responsibilities</span>
                            <span class="text-xs text-gray-600">${emp.functional_responsibilities || 'N/A'}</span>
                        </div>
                        <div class="pt-2">
                            <span class="text-[9px] text-gray-400 uppercase">Resigned Date</span>
                            <span class="text-xs text-gray-600 block">${emp.resigned_date || '-'}</span>
                        </div>
                        ${emp.resignation_note && !isTerminated ? `
                            <div class="mt-1">
                                <span class="text-[9px] text-gray-400 uppercase">Note</span>
                                <span class="text-xs text-gray-600 block italic">${emp.resignation_note}</span>
                            </div>
                        ` : ''}
                        ${isTerminated ? `
                            <div class="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
                                <div class="text-[9px] font-bold uppercase tracking-wider">⛔ Terminated by Company</div>
                                <div class="text-[10px] mt-1"><strong>By:</strong> ${emp.terminated_by || 'N/A'}</div>
                                <div class="text-[10px] italic mt-0.5"><strong>Reason:</strong> ${emp.resignation_note || 'N/A'}</div>
                            </div>
                        ` : ''}
                    </div>`;
                col4Html = `
                    <div class="space-y-4">
                        <h4 class="text-[10px] uppercase font-bold text-royal-gold tracking-widest">Work Info</h4>
                        <div class="flex flex-col">
                            <span class="text-[9px] text-gray-400 uppercase">Designation</span>
                            <span class="text-xs font-bold text-royal-blue">${emp.designation || emp.role || '-'}</span>
                        </div>
                    </div>`;
            }

            expansionTr.innerHTML = `
                <td colspan="14" class="px-10 py-6 border-b border-gray-200">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <!-- Education & Experience -->
                        <div class="space-y-4">
                            <h4 class="text-[10px] uppercase font-bold text-royal-gold tracking-widest">Background</h4>
                            <div class="flex flex-col">
                                <span class="text-[9px] text-gray-400 uppercase">Education</span>
                                <span class="text-xs font-semibold text-gray-800">${emp.education_details || 'N/A'}</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[9px] text-gray-400 uppercase">Experience (Total)</span>
                                <span class="text-xs font-semibold text-gray-800">${emp.experience_total || 'N/A'}</span>
                            </div>
                        </div>

                        <!-- Financials & Tenure -->
                        <div class="space-y-4">
                            <h4 class="text-[10px] uppercase font-bold text-royal-gold tracking-widest">Financials & Tenure</h4>
                            <div class="flex flex-col">
                                <span class="text-[9px] text-gray-400 uppercase">Total Salary Earned</span>
                                <span class="text-xs font-bold text-green-600">₹${(emp.total_salary_earned || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[9px] text-gray-400 uppercase">Experience in Vesak</span>
                                <span class="text-xs font-bold text-royal-blue">${expInVesak}</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[9px] text-gray-400 uppercase">Joining Date</span>
                                <span class="text-xs text-gray-600">${emp.joining_date || '-'}</span>
                            </div>
                        </div>

                        <!-- Column 3: Field Tracking / Office Details -->
                        ${col3Html}

                        <!-- Column 4: Ratings (Field) / Work Info (Office) -->
                        ${col4Html}
                    </div>

                    <!-- Leave Management Section (non-Gig only) -->
                    ${!isGig ? `
                    <div class="mt-6 pt-6 border-t border-gray-200">
                        <div class="flex justify-between items-center mb-3">
                            <h4 class="text-[10px] uppercase font-bold text-royal-gold tracking-widest">Leave & Salary Management</h4>
                            <span class="text-[9px] text-gray-400">Daily Rate: ₹${Math.round((emp.earnings_per_month || 0) / 30).toLocaleString('en-IN')} | Working Days: 26/month</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                            <div>
                                <label class="text-[9px] text-gray-500 block mb-1">Month</label>
                                <input type="month" id="leave-month-${emp.id}" class="input-royal text-xs py-1" value="${new Date().toISOString().slice(0, 7)}">
                            </div>
                            <div>
                                <label class="text-[9px] text-gray-500 block mb-1">Leave Dates <span class="text-gray-300">(comma-sep)</span></label>
                                <input type="text" id="leave-dates-${emp.id}" class="input-royal text-xs py-1" placeholder="e.g. 2026-02-05, 2026-02-12">
                            </div>
                            <div>
                                <label class="text-[9px] text-gray-500 block mb-1">Overtime Days</label>
                                <input type="number" id="overtime-${emp.id}" class="input-royal text-xs py-1" value="0" min="0">
                            </div>
                            <div>
                                <button onclick="saveLeaveRecord('${emp.id}')" class="w-full px-3 py-2 bg-royal-blue text-white text-[9px] font-bold rounded-lg hover:bg-black transition-all">
                                    <i class="fas fa-save mr-1"></i> Save
                                </button>
                            </div>
                            <div>
                                <button onclick="loadLeaveData('${emp.id}')" class="w-full px-3 py-2 bg-gray-100 text-gray-600 text-[9px] font-bold rounded-lg hover:bg-gray-200 transition-all">
                                    <i class="fas fa-history mr-1"></i> History
                                </button>
                            </div>
                        </div>
                        <div id="leave-history-${emp.id}" class="mt-3"></div>
                    </div>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
            tbody.appendChild(expansionTr);
        } else {
            tbody.appendChild(tr);
        }
    });
}

function getStatusBadge(status) {
    let colors = "bg-gray-100 text-gray-600";
    if (status === 'Active') colors = "bg-green-100 text-green-700";
    if (status === 'Terminated') colors = "bg-black text-white";
    if (status === 'On Leave') colors = "bg-orange-100 text-orange-700";

    return `<span class="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${colors}">${status || 'Active'}</span>`;
}

function filterHREmployees(workType) {
    if (workType) currentHRWorkFilter = workType;

    // Update Filter UI
    document.querySelectorAll('.hr-filter-btn').forEach(btn => {
        if (btn.innerText === currentHRWorkFilter || (btn.innerText === 'All' && currentHRWorkFilter === 'All')) {
            btn.classList.add('bg-white', 'shadow-sm', 'text-royal-blue');
            btn.classList.remove('text-gray-500');
        } else {
            btn.classList.remove('bg-white', 'shadow-sm', 'text-royal-blue');
            btn.classList.add('text-gray-500');
        }
    });

    const empType = document.getElementById('emp-type-filter').value;

    const filtered = allEmployees.filter(emp => {
        const matchesWork = currentHRWorkFilter === 'All' || (emp.work_type === currentHRWorkFilter);
        const matchesType = empType === 'All' || (emp.employment_type === empType);
        return matchesWork && matchesType;
    });

    renderHREmployeeTable(filtered);
}

async function openEmployeeModal() {
    const modal = document.getElementById('employee-modal');
    if (!modal) return;
    document.getElementById('modal-title').innerText = "Register New Asset (Employee)";
    document.getElementById('employee-form').reset();
    document.getElementById('emp-id').value = "";

    // Reset education rows to just one
    resetEducationRows();

    // Fetch locations dynamically
    await populateLocationsDropdown();

    // Reset conditional sections
    toggleWorkTypeFields();
    toggleEmploymentTypeFields();

    modal.classList.remove('hidden');
}

function closeEmployeeModal() {
    const modal = document.getElementById('employee-modal');
    if (modal) modal.classList.add('hidden');
}

async function saveEmployee() {
    const empType = document.getElementById('emp-employment-type').value;
    const isGig = empType === 'Gig/Retainer';

    const payload = {
        name: document.getElementById('emp-name').value,
        mobile: document.getElementById('emp-mobile').value,
        aadhar: document.getElementById('emp-aadhar').value,
        pan: document.getElementById('emp-pan').value,
        gender: document.getElementById('emp-gender')?.value,
        age: parseInt(document.getElementById('emp-age')?.value) || null,
        work_type: document.getElementById('emp-work-type').value,
        employment_type: empType,
        department: document.getElementById('emp-dept')?.value,
        work_location: document.getElementById('emp-work-location')?.value,
        role: document.getElementById('emp-role').value,
        joining_date: document.getElementById('emp-joining').value || null,
        earnings_per_month: isGig ? 0 : (parseFloat(document.getElementById('emp-salary').value) || 0),
        status: document.getElementById('emp-status').value,
        address: document.getElementById('emp-address')?.value,
        experience_total: document.getElementById('emp-exp-total')?.value,
        functional_responsibilities: document.getElementById('emp-func-resp')?.value,
        // Education as JSONB array
        education_details: JSON.stringify(getEducationData()),
        // Contract fields
        contract_duration_months: empType === 'Contract' ? getContractDurationMonths() : null,
        contract_end_date: empType === 'Contract' ? (document.getElementById('emp-contract-end')?.value || null) : null
    };

    const id = document.getElementById('emp-id').value;
    if (id) payload.id = id;

    try {
        const res = await apiFetch('/api/employees/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeEmployeeModal();
            fetchEmployees();
            alert("HR Record Updated.");
        } else {
            alert("Failed to update HR record.");
        }
    } catch (err) {
        console.error(err);
    }
}

async function editEmployee(id) {
    const emp = allEmployees.find(e => e.id === id);
    if (!emp) return;

    // Fetch locations first
    await populateLocationsDropdown();

    document.getElementById('modal-title').innerText = "Modify HR Assignment: " + emp.name;
    document.getElementById('emp-id').value = emp.id;
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-mobile').value = emp.mobile;
    document.getElementById('emp-aadhar').value = emp.aadhar;
    document.getElementById('emp-pan').value = emp.pan || "";
    if (document.getElementById('emp-gender')) document.getElementById('emp-gender').value = emp.gender || "Male";
    if (document.getElementById('emp-age')) document.getElementById('emp-age').value = emp.age || "";

    if (document.getElementById('emp-work-type')) document.getElementById('emp-work-type').value = emp.work_type || 'Field Staff';
    if (document.getElementById('emp-employment-type')) document.getElementById('emp-employment-type').value = emp.employment_type || 'Payroll';
    if (document.getElementById('emp-work-location')) document.getElementById('emp-work-location').value = emp.work_location || "";

    if (document.getElementById('emp-dept')) document.getElementById('emp-dept').value = emp.department || "";
    if (document.getElementById('emp-func-resp')) document.getElementById('emp-func-resp').value = emp.functional_responsibilities || "";
    if (document.getElementById('emp-exp-total')) document.getElementById('emp-exp-total').value = emp.experience_total || "";
    document.getElementById('emp-role').value = emp.role || "";
    document.getElementById('emp-joining').value = emp.joining_date || "";
    document.getElementById('emp-salary').value = emp.earnings_per_month || 0;
    document.getElementById('emp-status').value = emp.status || 'Active';
    document.getElementById('emp-address').value = emp.address || "";

    // Contract fields
    if (emp.employment_type === 'Contract') {
        const dur = emp.contract_duration_months;
        if (dur === 6 || dur === 12) {
            document.getElementById('emp-contract-duration').value = String(dur);
        } else if (dur) {
            document.getElementById('emp-contract-duration').value = 'custom';
            document.getElementById('emp-contract-custom-months').value = dur;
        }
        if (emp.contract_end_date) {
            document.getElementById('emp-contract-end').value = emp.contract_end_date;
        }
    }

    // Populate education rows
    populateEducationRows(emp.education_details);

    // Toggle conditional fields
    toggleWorkTypeFields();
    toggleEmploymentTypeFields();

    document.getElementById('employee-modal').classList.remove('hidden');
}

function toggleWorkTypeFields() {
    const wt = document.getElementById('emp-work-type')?.value;
    const fieldSection = document.getElementById('field-staff-only');
    const officeSection = document.getElementById('office-staff-only');

    if (wt === 'Field Staff') {
        if (fieldSection) fieldSection.classList.remove('hidden');
        if (officeSection) officeSection.classList.add('hidden');
    } else if (wt === 'Office Staff') {
        if (fieldSection) fieldSection.classList.add('hidden');
        if (officeSection) officeSection.classList.remove('hidden');
    } else if (wt === 'Hybrid') {
        // Show both for Hybrid
        if (fieldSection) fieldSection.classList.remove('hidden');
        if (officeSection) officeSection.classList.remove('hidden');
    }
}

function toggleEmploymentTypeFields() {
    const et = document.getElementById('emp-employment-type')?.value;
    const contractSection = document.getElementById('contract-duration-section');
    const salaryField = document.getElementById('emp-salary');
    const gigNote = document.getElementById('gig-ctc-note');

    // Contract duration
    if (contractSection) {
        contractSection.classList.toggle('hidden', et !== 'Contract');
    }

    // Gig CTC
    if (et === 'Gig/Retainer') {
        if (salaryField) { salaryField.value = ''; salaryField.disabled = true; salaryField.placeholder = 'N/A (Order-based)'; }
        if (gigNote) gigNote.classList.remove('hidden');
    } else {
        if (salaryField) { salaryField.disabled = false; salaryField.placeholder = 'Monthly CTC'; }
        if (gigNote) gigNote.classList.add('hidden');
    }

    // Show/hide custom duration
    const durSelect = document.getElementById('emp-contract-duration');
    const customField = document.getElementById('custom-duration-field');
    if (durSelect && customField) {
        customField.classList.toggle('hidden', durSelect.value !== 'custom');
    }
}

function calcContractEndDate() {
    const durSelect = document.getElementById('emp-contract-duration');
    const customField = document.getElementById('custom-duration-field');
    const endDateField = document.getElementById('emp-contract-end');
    const joiningField = document.getElementById('emp-joining');

    if (customField) customField.classList.toggle('hidden', durSelect?.value !== 'custom');

    if (!joiningField?.value || !endDateField) return;

    let months = 0;
    if (durSelect?.value === 'custom') {
        months = parseInt(document.getElementById('emp-contract-custom-months')?.value) || 0;
    } else {
        months = parseInt(durSelect?.value) || 0;
    }

    if (months > 0) {
        const start = new Date(joiningField.value);
        start.setMonth(start.getMonth() + months);
        endDateField.value = start.toISOString().split('T')[0];
    }
}

function getContractDurationMonths() {
    const durSelect = document.getElementById('emp-contract-duration');
    if (durSelect?.value === 'custom') {
        return parseInt(document.getElementById('emp-contract-custom-months')?.value) || null;
    }
    return parseInt(durSelect?.value) || null;
}

// ===== LOCATIONS =====
async function populateLocationsDropdown() {
    const select = document.getElementById('emp-work-location');
    if (!select) return;
    try {
        const res = await apiFetch('/api/locations/');
        if (res.ok) {
            const locations = await res.json();
            const currentVal = select.value;
            select.innerHTML = '<option value="">Select Location</option>';
            locations.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc.name;
                opt.textContent = loc.name;  // Full name only, no abbreviation
                select.appendChild(opt);
            });
            // Add "Other" fallback
            const otherOpt = document.createElement('option');
            otherOpt.value = 'Other';
            otherOpt.textContent = 'Other';
            select.appendChild(otherOpt);
            // Restore previous value if applicable
            if (currentVal) select.value = currentVal;
        }
    } catch (err) {
        console.error('Failed to fetch locations:', err);
    }
}

// ===== EDUCATION ROWS =====
function addEducationRow() {
    const container = document.getElementById('education-rows-container');
    if (!container) return;
    const rowCount = container.querySelectorAll('.edu-row').length;
    const row = document.createElement('div');
    row.className = 'edu-row grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 items-end border-t border-amber-100 pt-3';
    row.innerHTML = `
        <div>
            <label class="label-royal text-[9px]">Level</label>
            <select class="edu-level input-royal text-xs">
                <option value="10th">10th</option>
                <option value="12th">12th</option>
                <option value="Diploma">Diploma</option>
                <option value="UG">Undergraduate (UG)</option>
                <option value="PG">Postgraduate (PG)</option>
                <option value="Masters">Masters</option>
                <option value="Certification">Certification</option>
                <option value="Other">Other</option>
            </select>
        </div>
        <div>
            <label class="label-royal text-[9px]">Course / Specialization</label>
            <input type="text" class="edu-course input-royal text-xs" placeholder="e.g. MBA, GDA">
        </div>
        <div>
            <label class="label-royal text-[9px]">Institution</label>
            <input type="text" class="edu-institution input-royal text-xs" placeholder="College / University">
        </div>
        <div class="flex gap-2 items-end">
            <div class="flex-1">
                <label class="label-royal text-[9px]">Year</label>
                <input type="number" class="edu-year input-royal text-xs" placeholder="2020" min="1970" max="2030">
            </div>
            <button type="button" onclick="removeEducationRow(this)" class="px-2 py-2 text-red-500 hover:text-red-700 text-xs" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(row);
}

function removeEducationRow(btn) {
    const row = btn.closest('.edu-row');
    if (row) row.remove();
}

function resetEducationRows() {
    const container = document.getElementById('education-rows-container');
    if (!container) return;
    const rows = container.querySelectorAll('.edu-row');
    // Keep only the first row, remove the rest
    rows.forEach((row, i) => {
        if (i === 0) {
            // Clear the first row
            row.querySelectorAll('input').forEach(inp => inp.value = '');
            row.querySelectorAll('select').forEach(sel => sel.selectedIndex = 3); // default UG
        } else {
            row.remove();
        }
    });
}

function getEducationData() {
    const container = document.getElementById('education-rows-container');
    if (!container) return [];
    const rows = container.querySelectorAll('.edu-row');
    const data = [];
    rows.forEach(row => {
        const level = row.querySelector('.edu-level')?.value;
        const course = row.querySelector('.edu-course')?.value;
        const institution = row.querySelector('.edu-institution')?.value;
        const year = row.querySelector('.edu-year')?.value;
        if (level || course || institution || year) {
            data.push({ level, course, institution, year: year ? parseInt(year) : null });
        }
    });
    return data;
}

function populateEducationRows(eduData) {
    const container = document.getElementById('education-rows-container');
    if (!container) return;

    // Parse if string
    let edArr = [];
    if (typeof eduData === 'string') {
        try { edArr = JSON.parse(eduData); } catch (e) {
            // Legacy plain string — show as single entry
            if (eduData) edArr = [{ level: 'Other', course: eduData, institution: '', year: null }];
        }
    } else if (Array.isArray(eduData)) {
        edArr = eduData;
    }

    if (edArr.length === 0) {
        resetEducationRows();
        return;
    }

    // Clear container and create rows
    container.innerHTML = '';
    edArr.forEach((ed, i) => {
        const row = document.createElement('div');
        row.className = `edu-row grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 items-end ${i > 0 ? 'border-t border-amber-100 pt-3' : ''}`;
        row.innerHTML = `
            <div>
                <label class="label-royal text-[9px]">Level</label>
                <select class="edu-level input-royal text-xs">
                    <option value="10th" ${ed.level === '10th' ? 'selected' : ''}>10th</option>
                    <option value="12th" ${ed.level === '12th' ? 'selected' : ''}>12th</option>
                    <option value="Diploma" ${ed.level === 'Diploma' ? 'selected' : ''}>Diploma</option>
                    <option value="UG" ${ed.level === 'UG' ? 'selected' : ''}>Undergraduate (UG)</option>
                    <option value="PG" ${ed.level === 'PG' ? 'selected' : ''}>Postgraduate (PG)</option>
                    <option value="Masters" ${ed.level === 'Masters' ? 'selected' : ''}>Masters</option>
                    <option value="Certification" ${ed.level === 'Certification' ? 'selected' : ''}>Certification</option>
                    <option value="Other" ${ed.level === 'Other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <div>
                <label class="label-royal text-[9px]">Course / Specialization</label>
                <input type="text" class="edu-course input-royal text-xs" value="${ed.course || ''}">
            </div>
            <div>
                <label class="label-royal text-[9px]">Institution</label>
                <input type="text" class="edu-institution input-royal text-xs" value="${ed.institution || ''}">
            </div>
            <div class="flex gap-2 items-end">
                <div class="flex-1">
                    <label class="label-royal text-[9px]">Year</label>
                    <input type="number" class="edu-year input-royal text-xs" value="${ed.year || ''}" min="1970" max="2030">
                </div>
                ${i > 0 ? `<button type="button" onclick="removeEducationRow(this)" class="px-2 py-2 text-red-500 hover:text-red-700 text-xs" title="Remove"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        `;
        container.appendChild(row);
    });
}

// ===== LEAVE MANAGEMENT =====
async function saveLeaveRecord(empId) {
    const monthYear = document.getElementById(`leave-month-${empId}`)?.value;
    if (!monthYear) { alert('Please select a month'); return; }

    const leaveDatesStr = document.getElementById(`leave-dates-${empId}`)?.value || '';
    const leaveDates = leaveDatesStr.split(',').map(d => d.trim()).filter(d => d);
    const overtimeDays = parseInt(document.getElementById(`overtime-${empId}`)?.value) || 0;
    const emp = allEmployees.find(e => e.id === empId);
    const ctc = emp?.earnings_per_month || 0;
    const dailyRate = ctc / 30;
    const workingDays = 26;
    const netSalary = dailyRate * (workingDays - leaveDates.length + overtimeDays);

    try {
        const res = await apiFetch('/api/employee-leaves/', {
            method: 'POST',
            body: JSON.stringify({
                employee_id: empId,
                month_year: monthYear,
                leave_dates: leaveDates,
                overtime_days: overtimeDays,
                working_days: workingDays,
                daily_rate: Math.round(dailyRate * 100) / 100,
                net_salary: Math.round(netSalary * 100) / 100
            })
        });
        if (res.ok) {
            alert('Leave record saved. Net Salary: ₹' + Math.round(netSalary).toLocaleString('en-IN'));
            loadLeaveData(empId);
        } else {
            alert('Failed to save leave record');
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadLeaveData(empId) {
    const container = document.getElementById(`leave-history-${empId}`);
    if (!container) return;
    try {
        const res = await apiFetch(`/api/employee-leaves/${empId}`);
        if (res.ok) {
            const records = await res.json();
            if (records.length === 0) {
                container.innerHTML = '<div class="text-[9px] text-gray-400 italic">No leave records yet.</div>';
                return;
            }
            let html = '<div class="space-y-1 mt-2">';
            records.forEach(r => {
                const leaves = Array.isArray(r.leave_dates) ? r.leave_dates : [];
                html += `
                    <div class="flex justify-between items-center text-[9px] bg-white p-2 rounded border border-gray-100">
                        <span class="font-bold text-royal-blue">${r.month_year}</span>
                        <span>${leaves.length} leaves</span>
                        <span>${r.overtime_days || 0} OT</span>
                        <span class="font-bold text-green-600">₹${Math.round(r.net_salary || 0).toLocaleString('en-IN')}</span>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        }
    } catch (err) {
        container.innerHTML = '<div class="text-red-400 text-[9px]">Error loading</div>';
    }
}

async function toggleRowExpansion(id) {
    const el = document.getElementById(`expand-${id}`);
    if (!el) return;

    const isHidden = el.classList.contains('hidden');

    // Close others? (Optional, let's keep it simple)
    // document.querySelectorAll('[id^="expand-"]').forEach(row => row.classList.add('hidden'));

    if (isHidden) {
        el.classList.remove('hidden');
        // Fetch Service History if it's a field staff
        const emp = allEmployees.find(e => e.id === id);
        if (emp && emp.work_type === 'Field Staff') {
            await fetchEmployeeServiceHistory(id, emp.name);
        }
    } else {
        el.classList.add('hidden');
    }
}

async function fetchEmployeeServiceHistory(empId, empName) {
    const container = document.getElementById(`service-history-${empId}`);
    if (!container) return;

    try {
        // Query invoices/inquiries where this staff was assigned
        // Note: Using nurse_name as the link (as per current schema logic)
        const res = await apiFetch(`/api/invoices/search?query=${encodeURIComponent(empName)}`);
        if (res.ok) {
            const history = await res.json();
            if (history.length === 0) {
                container.innerHTML = '<div class="text-gray-400 italic">No historical service records found.</div>';
                return;
            }

            let html = '<div class="space-y-2">';
            history.slice(0, 5).forEach(item => {
                const serviceDesc = getDescriptiveServiceName(item.plan, item.service, item.shift);
                html += `
                    <div class="flex justify-between items-start border-b border-gray-100 pb-1">
                        <div class="flex flex-col">
                            <span class="font-bold text-gray-800">${item.customer_name}</span>
                            <span class="text-[10px] text-royal-blue font-medium">${serviceDesc}</span>
                        </div>
                        <span class="text-[9px] text-gray-400 font-mono">${item.date}</span>
                    </div>
                `;
            });
            if (history.length > 5) {
                html += `<div class="text-[9px] text-royal-blue font-bold mt-1 text-center">+ ${history.length - 5} more assignments</div>`;
            }
            html += '</div>';
            container.innerHTML = html;
        }
    } catch (err) {
        container.innerHTML = '<div class="text-red-400">Failed to load logs.</div>';
    }
}

async function terminateEmployeePrompt(id) {
    const reason = prompt("Enter Termination Reason (will be audited):");
    if (!reason) return;

    const myUser = sessionStorage.getItem('userName');
    const today = new Date().toISOString().split('T')[0];

    try {
        const res = await apiFetch('/api/employees/', {
            method: 'POST',
            body: JSON.stringify({
                id,
                status: 'Terminated',
                resignation_note: reason,
                terminated_by: myUser,
                resigned_date: today
            })
        });
        if (res.ok) {
            alert("Employee marked as Terminated.");
            fetchEmployees();
        }
    } catch (err) {
        console.error(err);
    }
}

function toggleRatingsPop(id) {
    const el = document.getElementById(`ratings-pop-${id}`);
    if (el) el.classList.toggle('hidden');
}

// Global Exports
window.fetchEmployees = fetchEmployees;
window.filterHREmployees = filterHREmployees;
window.filterEmployees = filterHREmployees;
window.openEmployeeModal = openEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.editEmployee = editEmployee;
window.terminateEmployeePrompt = terminateEmployeePrompt;
window.toggleWorkTypeFields = toggleWorkTypeFields;
window.toggleEmploymentTypeFields = toggleEmploymentTypeFields;
window.calcContractEndDate = calcContractEndDate;
window.addEducationRow = addEducationRow;
window.removeEducationRow = removeEducationRow;
window.toggleRowExpansion = toggleRowExpansion;
window.toggleRatingsPop = toggleRatingsPop;
window.saveLeaveRecord = saveLeaveRecord;
window.loadLeaveData = loadLeaveData;
window.fetchHREmployeesMaster = fetchEmployees;
