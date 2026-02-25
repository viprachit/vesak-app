// static/templates/employees.js

let allEmployees = [];
let currentCategory = 'Office';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Enforce Authentication
    const role = sessionStorage.getItem('userRole');
    if (!role) {
        window.location.href = 'login.html';
        return;
    }

    // Only certain roles should manage employees.
    const allowed = ['Founder', 'Super Admin', 'Admin', 'HR'];
    if (!allowed.includes(role)) {
        alert("You do not have permission to access Employee Central.");
        window.location.href = 'index.html';
        return;
    }

    applyRoleBasedAccess(role);
    loadEmployees();
});

// --- API Calls ---

async function loadEmployees() {
    try {
        const res = await apiFetch(`/api/employees/`);
        if (res.ok) {
            allEmployees = await res.json();
            renderTable();
        } else {
            console.error("Failed to load employees", await res.text());
        }
    } catch (e) {
        console.error("Error fetching employees", e);
    }
}

async function saveEmployee() {
    const id = document.getElementById('emp_id').value;

    // Core payload
    const payload = {
        name: document.getElementById('emp_name').value,
        mobile: document.getElementById('emp_mobile').value,
        age: document.getElementById('emp_age').value ? parseInt(document.getElementById('emp_age').value) : null,
        gender: document.getElementById('emp_gender').value,
        job_category: document.getElementById('emp_category').value,
        employment_type: document.getElementById('emp_type').value,

        aadhaar_no: document.getElementById('emp_aadhaar').value,
        pan_no: document.getElementById('emp_pan').value,
        address: document.getElementById('emp_address').value,

        bank_name: document.getElementById('emp_bank_name').value,
        bank_account: document.getElementById('emp_bank_acc').value,
        bank_ifsc: document.getElementById('emp_bank_ifsc').value,

        is_terminated: document.getElementById('emp_terminated').checked,
        termination_reason: document.getElementById('emp_terminated').checked ? document.getElementById('emp_term_reason').value : null,
    };

    if (id) payload.id = id;

    if (!payload.name || !payload.mobile) {
        alert("Name and Mobile are REQUIRED.");
        return;
    }

    const btn = document.getElementById('btnSave');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        const res = await apiFetch('/api/employees/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeFormModal();
            loadEmployees(); // Reload table
        } else {
            const err = await res.json();
            alert("Error saving: " + err.detail);
        }
    } catch (e) {
        alert("Network Error saving employee.");
        console.error(e);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}


// --- UI Logic ---

function switchTab(tab) {
    if (tab === 'office') {
        currentCategory = 'Office';
        document.getElementById('tab-office').classList.add('active');
        document.getElementById('tab-field').classList.remove('active');
        document.getElementById('viewTitle').innerText = 'Office Staff Roster';
    } else {
        currentCategory = 'Field';
        document.getElementById('tab-field').classList.add('active');
        document.getElementById('tab-office').classList.remove('active');
        document.getElementById('viewTitle').innerText = 'Field Staff Roster';
    }

    renderTable();
}

function filterTable() {
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('employeeTableBody');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    let filtered = allEmployees.filter(e => e.job_category === currentCategory);

    if (searchTerm) {
        filtered = filtered.filter(e =>
            (e.name && e.name.toLowerCase().includes(searchTerm)) ||
            (e.mobile && e.mobile.includes(searchTerm))
        );
    }

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">No personnel found.</td></tr>`;
        return;
    }

    filtered.forEach(emp => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 transition-colors";

        // Status checks
        let kycStatus = '<span class="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded">Incomplete</span>';
        if (emp.aadhaar_no && emp.pan_no && emp.bank_account) {
            kycStatus = '<span class="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded">Verified</span>';
        }

        // Termination logic
        let rowClassModifier = "text-gray-900";
        let roleBadge = "bg-blue-50 text-blue-600";
        if (emp.is_terminated) {
            rowClassModifier = "text-red-500 line-through opacity-70";
            roleBadge = "bg-red-50 text-red-600";
        }

        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="font-bold cursor-pointer hover:underline ${rowClassModifier}" onclick="editEmployee('${emp.id}')">${emp.name}</span>
                    <span class="text-[10px] text-gray-400 uppercase tracking-widest">${emp.id.split('-')[0]}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-gray-500">
                <i class="fas fa-phone-alt text-[10px] mr-1 text-gray-300"></i> ${emp.mobile}
            </td>
            <td class="px-6 py-4">
                ${kycStatus}
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 text-[10px] font-bold rounded ${roleBadge}">${emp.employment_type || 'Full Time'}</span>
            </td>
            <td class="px-6 py-4 max-w-[150px] truncate text-xs ${emp.is_terminated ? 'text-red-600 italic font-medium' : 'text-gray-500'}">
                ${emp.is_terminated ? (emp.termination_reason || 'Terminated') : 'Active User'}
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="editEmployee('${emp.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded transition-colors mr-2">
                    <i class="fas fa-edit mr-1"></i> Edit
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// --- Form Handling ---

function openFormModal() {
    document.getElementById('employeeForm').reset();
    document.getElementById('emp_id').value = '';

    // Set default category based on current tab
    document.getElementById('emp_category').value = currentCategory;

    toggleTerminationText(); // Reset UI
    document.getElementById('modalTitle').innerText = 'Register New Employee';
    document.getElementById('employeeModal').classList.remove('hidden');
}

function closeFormModal() {
    document.getElementById('employeeModal').classList.add('hidden');
}

function editEmployee(id) {
    const emp = allEmployees.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('emp_id').value = emp.id;
    document.getElementById('emp_name').value = emp.name || '';
    document.getElementById('emp_mobile').value = emp.mobile || '';
    document.getElementById('emp_age').value = emp.age || '';
    document.getElementById('emp_gender').value = emp.gender || '';

    document.getElementById('emp_category').value = emp.job_category || 'Field';
    document.getElementById('emp_type').value = emp.employment_type || 'Full Time';

    document.getElementById('emp_aadhaar').value = emp.aadhaar_no || '';
    document.getElementById('emp_pan').value = emp.pan_no || '';
    document.getElementById('emp_address').value = emp.address || '';

    document.getElementById('emp_bank_name').value = emp.bank_name || '';
    document.getElementById('emp_bank_acc').value = emp.bank_account || '';
    document.getElementById('emp_bank_ifsc').value = emp.bank_ifsc || '';

    document.getElementById('emp_terminated').checked = emp.is_terminated;
    document.getElementById('emp_term_reason').value = emp.termination_reason || '';

    toggleTerminationText();

    document.getElementById('modalTitle').innerText = 'Edit Employee Record';
    document.getElementById('employeeModal').classList.remove('hidden');
}

function toggleTerminationText() {
    const isTerminated = document.getElementById('emp_terminated').checked;
    const termBox = document.getElementById('termination_box');

    if (isTerminated) {
        termBox.classList.remove('hidden');
    } else {
        termBox.classList.add('hidden');
    }
}
