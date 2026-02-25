// static/templates/admin_hub.js

document.addEventListener('DOMContentLoaded', () => {
    fetchOverviewData();
    fetchUsers();
    fetchLocations();
});

// ==========================================
// SUB-SERVICES MAP
// ==========================================
const SUB_SERVICES_MAP = {
    'Patient Attendant Care': ['All', 'Basic Care', 'Assistance with Activities for Daily Living', 'Feeding & Oral Hygiene', 'Mobility Support & Transfers', 'Bed Bath and Emptying Bedpans and Changing Diapers', 'Catheter & Ostomy Care (If Attendant Knows)'],
    'Skilled Nursing': ['All', 'Intravenous (IV) Therapy & Injections', 'Medication Management & Administration', 'Advanced Wound Care & Dressing', 'Catheter & Ostomy Care', 'Post-Surgical Care'],
    'Chronic Management': ['All', 'Care for Bed-Ridden Patients', 'Dementia & Alzheimer\'s Care', 'Disability Support & Assistance'],
    'Elderly Companion': ['All', 'Companionship & Conversation', 'Fall Prevention & Mobility Support'],
    'Maternal & Newborn': ['All', 'Postnatal & Maternal Care', 'Newborn Care Assistance'],
    'Rehabilitative Care': ['Pain Management (Back, Knee, Neck, etc.)', 'Neuro Rehabilitation', 'Stroke Rehabilitation', 'Paralysis Rehabilitation', 'Parkinson\'s Rehabilitation', 'Post-Operative Rehabilitation', 'Orthopedic (Fractures)', 'Total Knee Replacement / Total Hip Replacement', 'Geriatric Wellness', 'Cardio-Respiratory', 'Pain Relief Pack', 'Mobility Pack', 'Active Recovery Pack', 'Acute Care Pack', 'Progressive Strength Training', 'Joint Stabilization & Proprioception', 'Women\'s Health (Antenatal/Postnatal)', 'Women\'s Health (Antenatal)', 'Women\'s Health (Postnatal)', 'Work-From-Home (Ergonomic) Care', 'Bedridden and Palliative Care', 'Bedridden', 'Palliative Care', 'Fall Proof Pack', 'Chest & Lungs', 'Chest & Lungs (Post-Viral Pack)', 'Total Spine Pack', 'Walk Again Pack (Intensive)'],
    'A-la-carte Services': ['Hospital Visits (Assistance with Family)', 'Hospital Visits (Care Coordination)', 'Doctor Visits (Home)', 'Diagnostic Services', 'Blood Collection', 'Nutrition Consultation (Home Visit)', 'Dietetic Consultation (Home Visit)', 'Hospital Discharge Pack', 'Dialysis Assistance (Escort)', 'Quarterly Senior Wellness Pack', 'Ambulance Services', 'Medical Equipment Rental', 'ECG (Portable)', 'X-Ray (Portable)', 'Critical Care Setup (ICU at Home)']
};

function updateSubServices() {
    const plan = document.getElementById('ar_plan').value;
    const subSel = document.getElementById('ar_sub_service');
    subSel.innerHTML = '';
    const subs = SUB_SERVICES_MAP[plan] || ['All'];
    subs.forEach(s => { subSel.innerHTML += `<option value="${s}">${s}</option>`; });
}

// ==========================================
// UI TAB SWITCHER
// ==========================================
function switchTab(tabId) {
    const contentIds = ['content-overview', 'content-users', 'content-rates', 'content-locations', 'content-expenses', 'content-budgets', 'content-financials'];
    contentIds.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });

    const buttons = ['tab-overview', 'tab-users', 'tab-rates', 'tab-locations', 'tab-expenses', 'tab-budgets', 'tab-financials'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.remove('bg-royal-blue', 'text-white', 'shadow-md');
        btn.classList.add('bg-white', 'text-gray-500', 'hover:bg-gray-50');
        const icon = btn.querySelector('.fa-chevron-right');
        if (icon) { icon.classList.remove('opacity-50'); icon.classList.add('opacity-0', 'group-hover:opacity-50'); }
    });

    const activeContent = document.getElementById(`content-${tabId}`);
    if (activeContent) activeContent.classList.remove('hidden');

    const activeBtn = document.getElementById(`tab-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-royal-blue', 'text-white', 'shadow-md');
        activeBtn.classList.remove('bg-white', 'text-gray-500', 'hover:bg-gray-50');
        const activeIcon = activeBtn.querySelector('.fa-chevron-right');
        if (activeIcon) { activeIcon.classList.remove('opacity-0', 'group-hover:opacity-50'); activeIcon.classList.add('opacity-50'); }
    }

    if (tabId === 'overview') fetchOverviewData();
    if (tabId === 'users') fetchUsers();
    if (tabId === 'locations') fetchLocations();
    if (tabId === 'rates') { fetchLocationsForRates(); fetchRates(); }
    if (tabId === 'expenses') fetchExpenses();
    if (tabId === 'budgets') fetchBudgets();
    if (tabId === 'financials') fetchFinancialData();
}

// ==========================================
// USER MANAGEMENT
// ==========================================
async function fetchUsers() {
    try {
        const myRole = sessionStorage.getItem('userRole');
        const response = await apiFetch(`/api/users?viewer_role=${encodeURIComponent(myRole || '')}`);
        const users = await response.json();
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            let roleColor = 'gray';
            if (user.role === 'Founding Member' || user.role === 'Founder') roleColor = 'yellow';
            else if (user.role === 'Director') roleColor = 'indigo';
            else if (user.role === 'Top Management') roleColor = 'purple';
            else if (user.role === 'Employee' || user.role === 'Operator') roleColor = 'blue';
            else if (user.role === 'View Only') roleColor = 'orange';
            else if (user.role === 'Super Admin') roleColor = 'red';
            else if (user.role === 'Admin' || user.role === 'HR') roleColor = 'teal';

            const perms = user.permissions || {};
            const pageAccess = user.page_access || {};
            let permBadges = '';
            if (perms.view_financials) permBadges += '<span class="text-[9px] bg-green-50 text-green-600 px-1 rounded mr-1">$$</span>';
            if (perms.access_hr_sensitive) permBadges += '<span class="text-[9px] bg-red-50 text-red-600 px-1 rounded mr-1">HR+</span>';
            if (perms.edit_master_rates) permBadges += '<span class="text-[9px] bg-blue-50 text-blue-600 px-1 rounded mr-1">Rates</span>';

            // Page badges
            let pageBadges = '';
            const pageMap = { operations: 'Ops', hr: 'HR', admin: 'Admin', inquiries: 'Inq', training: 'Train', registry: 'Reg' };
            Object.entries(pageMap).forEach(([key, label]) => {
                if (pageAccess[key]) pageBadges += `<span class="text-[8px] bg-gray-100 text-gray-500 px-1 rounded mr-0.5">${label}</span>`;
            });

            const lastLogin = user.last_login ? new Date(user.last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never';
            const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

            tr.innerHTML = `
                <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">
                            ${(user.display_name || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div class="flex flex-col">
                            <span class="font-bold text-gray-800">${user.display_name || user.username}</span>
                            <span class="text-[10px] text-gray-400">@${user.username}</span>
                            <div class="flex items-center mt-0.5">${permBadges}</div>
                            <div class="flex items-center flex-wrap mt-0.5">${pageBadges}</div>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <span class="px-3 py-1 bg-${roleColor}-100 text-${roleColor}-700 rounded-full text-[10px] font-bold whitespace-nowrap">
                        ${user.role}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <span class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}"></div>
                        <span class="text-xs font-bold text-gray-500">${user.is_active ? 'Active' : 'Disabled'}</span>
                    </span>
                </td>
                <td class="px-4 py-3"><span class="text-xs text-gray-500">${user.created_by || 'System'}</span></td>
                <td class="px-4 py-3">
                    <div class="flex flex-col">
                        <span class="text-[10px] text-gray-500">${createdAt}</span>
                        <span class="text-[10px] text-gray-400">Last: ${lastLogin}</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-right">
                    <div class="flex justify-end gap-3">
                        <button onclick="resetPassword('${user.id}', '${user.username}')" class="text-xs font-bold text-royal-blue hover:underline"><i class="fas fa-key"></i> Reset</button>
                        <button onclick="toggleUserStatus('${user.id}', ${!user.is_active})" class="text-xs font-bold ${user.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} underline">
                            ${user.is_active ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error("Failed to fetch users", err); }
}

async function createUser() {
    const un = document.getElementById('nu_username').value;
    const pw = document.getElementById('nu_password').value;
    const role = document.getElementById('nu_role').value;
    const displayName = document.getElementById('nu_display_name')?.value || '';
    const myUser = sessionStorage.getItem('userName');
    const myRole = sessionStorage.getItem('userRole');
    if (!un || !pw) return alert("Username and Password are required");

    const permissions = {
        view_financials: document.getElementById('p_financials')?.checked || false,
        edit_master_rates: document.getElementById('p_rates')?.checked || false,
        correct_registry: document.getElementById('p_registry')?.checked || false,
        access_hr_basic: document.getElementById('p_hr_basic')?.checked || false,
        access_hr_sensitive: document.getElementById('p_hr_sensitive')?.checked || false,
        access_admin_hub: true,
        manage_rbac: document.getElementById('p_rbac')?.checked || false
    };

    const page_access = {
        operations: document.getElementById('pa_operations')?.checked || false,
        hr: document.getElementById('pa_hr')?.checked || false,
        admin: document.getElementById('pa_admin')?.checked || false,
        inquiries: document.getElementById('pa_inquiries')?.checked || false,
        training: document.getElementById('pa_training')?.checked || false,
        registry: document.getElementById('pa_registry')?.checked || false
    };

    try {
        const response = await apiFetch('/api/users', {
            method: 'POST',
            body: JSON.stringify({ username: un, password: pw, role, display_name: displayName, is_active: true, created_by: myUser, creator_role: myRole, permissions, page_access })
        });
        if (response.ok) { alert("User created successfully"); document.getElementById('userForm').reset(); fetchUsers(); }
        else { const data = await response.json(); alert("Error: " + (data.detail || "Check your tiered permissions.")); }
    } catch (err) { alert("Operation failed"); }
}

async function resetPassword(userId, username) {
    const newPassword = prompt(`Enter new password for ${username}:`);
    if (!newPassword || newPassword.length < 4) return alert("Password too short or cancelled.");
    try {
        const response = await apiFetch(`/api/users/${userId}/reset-password`, { method: 'PATCH', body: JSON.stringify({ password: newPassword }) });
        if (response.ok) alert("Password updated successfully.");
        else { const data = await response.json(); alert("Error: " + data.detail); }
    } catch (err) { alert("Failed to reset password."); }
}

async function toggleUserStatus(userId, is_active) {
    try {
        const response = await apiFetch(`/api/users/${userId}/toggle?is_active=${is_active}`, { method: 'PATCH' });
        if (response.ok) fetchUsers(); else alert("Failed to toggle status");
    } catch (err) { console.error(err); }
}

// ==========================================
// LOCATIONS MANAGEMENT
// ==========================================
let allLocationsData = [];

async function fetchLocations() {
    try {
        const response = await apiFetch('/api/locations/all');
        const locs = await response.json();
        allLocationsData = locs;
        const tbody = document.getElementById('locationsTableBody');
        tbody.innerHTML = '';

        locs.forEach(loc => {
            const tr = document.createElement('tr');
            const isActive = loc.is_active !== false;
            const subsHtml = (loc.sub_locations && loc.sub_locations.length)
                ? loc.sub_locations.map(s =>
                    `<span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1 mb-1 shadow-sm border border-blue-100">${s}<button onclick="deleteSubLocation('${loc.id}', '${s.replace(/'/g, "\\'")}')"
                        class="ml-0.5 text-red-400 hover:text-red-600 font-bold" title="Remove sub-location">&times;</button></span>`
                ).join('')
                : '<span class="text-gray-400 italic text-[10px]">No zones defined</span>';

            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="flex flex-col">
                        <span class="font-bold text-gray-800">${loc.name}</span>
                        <span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">${loc.abbreviation}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-wrap items-center gap-1">
                        ${subsHtml}
                        <button onclick="addSingleSubLocation('${loc.id}', '${loc.name}')" 
                            class="w-6 h-6 rounded-full border border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 hover:border-blue-500 flex items-center justify-center transition-all ml-1 mb-1" 
                            title="Add Zone/Sub-location">
                            <i class="fas fa-plus text-[10px]"></i>
                        </button>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="text-[10px] font-bold ${isActive ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'} px-2 py-1 rounded border ${isActive ? 'border-green-100' : 'border-red-100'}">${isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-3">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="sr-only peer" ${isActive ? 'checked' : ''} onchange="toggleLocationStatus('${loc.id}', this.checked)">
                            <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        populateLocationsDropdown(locs.filter(l => l.is_active !== false));
    } catch (err) { console.error("Failed to fetch locations", err); }
}

function populateLocationsDropdown(locs) {
    // Rate form dropdown
    const ddl = document.getElementById('ar_location');
    if (ddl) { ddl.innerHTML = ''; locs.forEach(loc => { ddl.innerHTML += `<option value="${loc.name}">${loc.name}</option>`; }); }
    // Rate filter dropdown
    const filt = document.getElementById('rates_filter_location');
    if (filt) {
        const val = filt.value;
        filt.innerHTML = '<option value="">All Locations</option>';
        locs.forEach(loc => { filt.innerHTML += `<option value="${loc.name}">${loc.name}</option>`; });
        filt.value = val;
    }
}

function fetchLocationsForRates() {
    apiFetch('/api/locations').then(res => res.json()).then(data => {
        allLocationsData = data;
        populateLocationsDropdown(data);
        // Immediately populate sub-locations for the selected location
        updateRateSubLocations();
    }).catch(err => console.error(err));
}

async function createLocation() {
    const name = document.getElementById('loc_name').value;
    const abbr = document.getElementById('loc_abbr').value.toUpperCase();
    const subStr = document.getElementById('loc_sub').value || '';
    if (!name || abbr.length !== 3) return alert("Valid name and 3-letter abbreviation required");

    // Process Sub-Locations
    const sub_locations = subStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

    try {
        const response = await apiFetch('/api/locations', { method: 'POST', body: JSON.stringify({ name, abbreviation: abbr, sub_locations, is_active: true }) });
        if (response.ok) { document.getElementById('loc_name').value = ''; document.getElementById('loc_abbr').value = ''; document.getElementById('loc_sub').value = ''; fetchLocations(); alert("Location added"); }
        else alert("Error creating location");
    } catch (err) { alert("Operation failed"); }
}

async function addSingleSubLocation(locId, locName) {
    const subName = prompt(`Enter new Zone/Sub-location for ${locName}:`);
    if (!subName || subName.trim().length === 0) return;

    try {
        const res = await apiFetch(`/api/locations/${locId}/sub-location?name=${encodeURIComponent(subName.trim())}`, {
            method: 'POST'
        });
        if (res.ok) {
            fetchLocations();
        } else {
            alert('Failed to add sub-location');
        }
    } catch (err) {
        console.error(err);
        alert('Operation failed');
    }
}

async function toggleLocationStatus(id, isActive) {
    try {
        await apiFetch(`/api/locations/${id}/toggle?is_active=${isActive}`, { method: 'PATCH' });
        fetchLocations();
    } catch (err) { console.error(err); }
}

async function deleteSubLocation(locId, subName) {
    if (!confirm(`Remove sub-location "${subName}"? This cannot be undone.`)) return;
    try {
        const res = await apiFetch(`/api/locations/${locId}/sub-location?name=${encodeURIComponent(subName)}`, { method: 'DELETE' });
        if (res.ok) {
            fetchLocations();
        } else {
            alert('Failed to remove sub-location');
        }
    } catch (err) { console.error(err); alert('Operation failed'); }
}

function updateRateSubLocations() {
    const locName = document.getElementById('ar_location')?.value;
    const subSelect = document.getElementById('ar_sub_location');
    if (!subSelect) return;
    subSelect.innerHTML = '<option value="">Entire Location</option>';
    if (!locName) return;
    const loc = allLocationsData.find(l => l.name === locName);
    if (loc && loc.sub_locations && loc.sub_locations.length) {
        loc.sub_locations.forEach(s => {
            subSelect.innerHTML += `<option value="${s}">${s}</option>`;
        });
    }
}

// ==========================================
// RATES MANAGEMENT
// ==========================================

window.enforceMarketRatePeriodLogic = function () {
    const isRecurring = document.getElementById('ar_recurring')?.value === 'Yes';
    const periodSelect = document.getElementById('ar_period');
    if (!periodSelect) return;

    const currentVal = periodSelect.value;
    periodSelect.innerHTML = '';

    if (isRecurring) {
        periodSelect.innerHTML = '<option value="Per Month">Per Month</option>';
    } else {
        periodSelect.innerHTML = `
            <option value="Per Day">Per Day</option>
            <option value="Per Week">Per Week</option>
            <option value="Per Month">Per Month</option>
        `;
    }

    if (Array.from(periodSelect.options).some(o => o.value === currentVal)) {
        periodSelect.value = currentVal;
    }
};

function calculateMinMax() {
    const marketVal = parseFloat(document.getElementById('ar_market').value);
    const minInput = document.getElementById('ar_min');
    const maxInput = document.getElementById('ar_max');
    if (isNaN(marketVal) || marketVal <= 0) { minInput.value = ''; maxInput.value = ''; return; }
    minInput.value = Math.round(marketVal * 1.08);
    maxInput.value = Math.round(marketVal * 1.15);
}

async function saveRate() {
    const loc = document.getElementById('ar_location').value;
    const subLoc = document.getElementById('ar_sub_location')?.value || null;
    const plan = document.getElementById('ar_plan').value;
    const sub = document.getElementById('ar_sub_service').value;
    const shift = document.getElementById('ar_shift').value;
    const recurring = document.getElementById('ar_recurring').value;
    const period = document.getElementById('ar_period').value;
    const market = parseFloat(document.getElementById('ar_market').value);
    if (!loc || !plan || !shift || isNaN(market)) return alert("Fill all required fields first");

    const payload = {
        location: loc,
        sub_location: subLoc || null,
        service_category: "Home Care",
        plan_type: plan,
        sub_service: sub,
        shift_type: shift,
        recurring_service: recurring,
        period: period,
        market_rate: market
    };

    try {
        const response = await apiFetch('/api/rates', { method: 'POST', body: JSON.stringify(payload) });
        if (response.ok) { alert("Rate Configuration Saved!"); document.getElementById('ar_market').value = ''; document.getElementById('ar_min').value = ''; document.getElementById('ar_max').value = ''; fetchRates(); }
        else { console.error(await response.json()); alert("Failed to save rate"); }
    } catch (err) { console.error(err); }
}

async function fetchRates() {
    try {
        const filterLoc = document.getElementById('rates_filter_location')?.value || '';
        let url = '/api/rates';
        if (filterLoc) url += `?location=${encodeURIComponent(filterLoc)}`;
        const response = await apiFetch(url);
        const rates = await response.json();
        const tbody = document.getElementById('ratesTableBody');
        tbody.innerHTML = '';

        rates.forEach(r => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 transition-colors';
            tr.innerHTML = `
                <td class="px-3 py-3 text-xs font-bold text-gray-700">${r.location}</td>
                <td class="px-3 py-3 text-xs text-gray-500">${r.sub_location || '<span class="text-[10px] text-gray-300">Entire Location</span>'}</td>
                <td class="px-3 py-3 text-xs">${r.plan_type}</td>
                <td class="px-3 py-3 text-xs text-gray-500">${r.sub_service || '-'}</td>
                <td class="px-3 py-3 text-xs">${r.shift_type}</td>
                <td class="px-3 py-3"><span class="text-[10px] font-bold px-2 py-0.5 rounded ${r.recurring_service === 'Yes' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}">${r.recurring_service || 'No'}</span></td>
                <td class="px-3 py-3 text-xs">${r.period || 'Per Day'}</td>
                <td class="px-3 py-3 font-bold text-amber-600">₹${r.max_rate || '-'}</td>
                <td class="px-3 py-3 font-bold text-green-600">₹${r.min_rate || '-'}</td>
                <td class="px-3 py-3 text-right">
                    <button onclick="deleteRate('${r.id}')" class="text-xs text-red-400 hover:text-red-600">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error('Error fetching rates:', err); }
}

async function deleteRate(id) {
    if (!confirm('Delete this rate?')) return;
    try {
        await apiFetch(`/api/rates/${id}`, { method: 'DELETE' });
        fetchRates();
    } catch (err) { console.error(err); }
}

// ==========================================
// EXPENSES MANAGEMENT
// ==========================================
async function fetchExpenses() {
    try {
        const response = await apiFetch('/api/expenses/');
        const expenses = await response.json();
        const tbody = document.getElementById('expensesTableBody');
        tbody.innerHTML = '';

        expenses.forEach(exp => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 transition-colors";
            tr.innerHTML = `
                <td class="px-4 py-3 font-bold text-gray-800">${exp.expense_date}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-[10px] font-bold rounded bg-gray-100">${exp.category}</span>
                    ${exp.subcategory ? `<span class="text-[10px] text-gray-400 ml-1">${exp.subcategory}</span>` : ''}
                </td>
                <td class="px-4 py-3 text-gray-500 max-w-xs truncate" title="${exp.description || '-'}">${exp.description || '-'}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-[10px] font-bold rounded ${exp.recurrence === 'One-time' ? 'bg-gray-50 text-gray-400' : 'bg-blue-50 text-blue-600'}">${exp.recurrence || 'One-time'}</span>
                </td>
                <td class="px-4 py-3 font-bold text-red-600">₹${parseFloat(exp.amount).toLocaleString('en-IN')}</td>
                <td class="px-4 py-3 text-right">
                    <div class="flex flex-col items-end">
                        <span class="text-[10px] font-bold text-gray-400">${exp.created_by_name || 'System'}</span>
                        <button onclick="deleteExpense('${exp.id}')" class="text-xs text-red-400 hover:text-red-600 mt-1">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Calculate summary
        calculateExpenseSummary(expenses);
    } catch (error) { console.error("Error fetching expenses:", error); }
}

async function calculateExpenseSummary(expenses) {
    try {
        // Fetch employees for salary data
        const empRes = await apiFetch('/api/employees/');
        const employees = await empRes.json();

        const officeStaff = employees.filter(e => (e.work_type || '').toLowerCase().includes('office'));
        const fieldStaff = employees.filter(e => (e.work_type || '').toLowerCase().includes('field'));

        const officeSalary = officeStaff.reduce((s, e) => s + parseFloat(e.earnings_per_month || 0), 0);
        const fieldSalary = fieldStaff.reduce((s, e) => s + parseFloat(e.earnings_per_month || 0), 0);
        const totalPayroll = officeSalary + fieldSalary;

        document.getElementById('exp_office_salary').textContent = `₹ ${officeSalary.toLocaleString('en-IN')}`;
        document.getElementById('exp_field_salary').textContent = `₹ ${fieldSalary.toLocaleString('en-IN')}`;
        document.getElementById('exp_total_payroll').textContent = `₹ ${totalPayroll.toLocaleString('en-IN')}`;
        document.getElementById('exp_office_count').textContent = `${officeStaff.length} employees`;
        document.getElementById('exp_field_count').textContent = `${fieldStaff.length} employees`;

        // Revenue from invoices (Confirmed/Active)
        const invRes = await apiFetch('/api/invoices/');
        const invoices = await invRes.json();
        const confirmedInvoices = invoices.filter(i => {
            const s = (i.status || '').toLowerCase();
            return s === 'confirmed' || s === 'active';
        });
        const totalRevenue = confirmedInvoices.reduce((s, i) => s + parseFloat(i.rate_agreed || i.amount || 0), 0);

        const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        const grossProfit = totalRevenue - totalPayroll;
        const netProfit = grossProfit - totalExpenses;

        document.getElementById('exp_total_revenue').textContent = `₹ ${totalRevenue.toLocaleString('en-IN')}`;
        document.getElementById('exp_gross_profit').textContent = `₹ ${grossProfit.toLocaleString('en-IN')}`;
        document.getElementById('exp_net_profit').textContent = `₹ ${netProfit.toLocaleString('en-IN')}`;
        document.getElementById('exp_total_logged').textContent = `₹ ${totalExpenses.toLocaleString('en-IN')}`;

        // Color coding
        document.getElementById('exp_gross_profit').className = `text-xl font-bold ${grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`;
        document.getElementById('exp_net_profit').className = `text-xl font-bold ${netProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}`;
    } catch (err) { console.error('Expense summary error:', err); }
}

async function createExpense() {
    const payload = {
        expense_date: document.getElementById('exp_date').value,
        category: document.getElementById('exp_category').value,
        subcategory: document.getElementById('exp_subcategory')?.value || null,
        amount: parseFloat(document.getElementById('exp_amount').value),
        description: document.getElementById('exp_desc').value,
        recurrence: document.getElementById('exp_recurrence')?.value || 'One-time'
    };
    if (!payload.expense_date || !payload.amount) { alert("Date and Amount are required"); return; }
    try {
        const response = await apiFetch('/api/expenses/', { method: 'POST', body: JSON.stringify(payload) });
        if (response.ok) { document.getElementById('expenseForm').reset(); fetchExpenses(); alert("Expense logged!"); }
        else { const err = await response.json(); alert("Error: " + err.detail); }
    } catch (error) { console.error("Error creating expense:", error); alert("Failed to log expense."); }
}

async function deleteExpense(id) {
    if (!confirm("Delete this expense?")) return;
    try {
        const response = await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
        if (response.ok) fetchExpenses();
    } catch (error) { console.error("Error deleting expense:", error); }
}

// ==========================================
// OVERVIEW
// ==========================================
let overviewChart = null;
async function fetchOverviewData() {
    try {
        const [usersRes, employeesRes, inquiriesRes, expensesRes] = await Promise.all([
            apiFetch('/api/users'), apiFetch('/api/employees/'), apiFetch('/api/invoices/'), apiFetch('/api/expenses/')
        ]);
        const users = await usersRes.json();
        const employees = await employeesRes.json();
        const inquiries = await inquiriesRes.json();
        const expenses = await expensesRes.json();

        const officeCount = employees.filter(e => (e.work_type || '').toLowerCase().includes('office')).length;
        const fieldCount = employees.filter(e => (e.work_type || '').toLowerCase().includes('field')).length;

        document.getElementById('ov_total_users').textContent = users.length;
        document.getElementById('ov_total_employees').textContent = employees.length;
        document.getElementById('ov_office_count').textContent = `Office: ${officeCount}`;
        document.getElementById('ov_field_count').textContent = `Field: ${fieldCount}`;
        document.getElementById('ov_total_inquiries').textContent = inquiries.length;

        // Revenue from confirmed/active inquiries
        const confirmedInquiries = inquiries.filter(i => { const s = (i.status || '').toLowerCase(); return s === 'confirmed' || s === 'active'; });
        const totalRevenue = confirmedInquiries.reduce((s, i) => s + parseFloat(i.rate_agreed || i.amount || 0), 0);
        const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        const totalEarnings = totalRevenue - totalExpenses;

        document.getElementById('ov_total_revenue').textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
        document.getElementById('ov_total_expenses').textContent = `₹${totalExpenses.toLocaleString('en-IN')}`;
        document.getElementById('ov_total_earnings').textContent = `₹${totalEarnings.toLocaleString('en-IN')}`;

        // Chart
        const ctx = document.getElementById('overviewChart')?.getContext('2d');
        if (ctx) {
            if (overviewChart) overviewChart.destroy();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const revByMonth = new Array(12).fill(0);
            const expByMonth = new Array(12).fill(0);
            inquiries.forEach(inv => { const d = new Date(inv.date || inv.created_at); revByMonth[d.getMonth()] += parseFloat(inv.amount || inv.net_amount || 0); });
            expenses.forEach(exp => { const d = new Date(exp.expense_date); expByMonth[d.getMonth()] += parseFloat(exp.amount || 0); });

            overviewChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months, datasets: [
                        { label: 'Revenue', data: revByMonth, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', fill: true, tension: 0.4 },
                        { label: 'Expenses', data: expByMonth, borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', fill: true, tension: 0.4 }
                    ]
                },
                options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
            });
        }
    } catch (err) { console.error('Overview fetch error:', err); }
}

// ==========================================
// BUDGETS
// ==========================================
function onBudgetCategoryChange() {
    // Intentionally empty: The Details/Name text field is now always visible for all categories.
}

async function searchMiscCategories(query) {
    const sugBox = document.getElementById('bgt_misc_suggestions');
    if (!query || query.length < 2) { sugBox.classList.add('hidden'); return; }
    try {
        const res = await apiFetch(`/api/budgets/misc-categories?q=${encodeURIComponent(query)}`);
        const categories = await res.json();
        if (categories.length === 0) { sugBox.classList.add('hidden'); return; }
        sugBox.innerHTML = '';
        categories.forEach(c => {
            sugBox.innerHTML += `<div class="px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 text-gray-700" onclick="document.getElementById('bgt_custom_category').value='${c}'; document.getElementById('bgt_misc_suggestions').classList.add('hidden')">${c}</div>`;
        });
        sugBox.classList.remove('hidden');
    } catch (err) { console.error(err); }
}

function calculateBudgetTotal() {
    const unit = parseFloat(document.getElementById('bgt_unit_amount').value) || 0;
    const occurrence = parseInt(document.getElementById('bgt_occurrence').value) || 1;
    const count = parseInt(document.getElementById('bgt_occurrence_count').value) || 1;
    document.getElementById('bgt_amount').value = unit * occurrence * count;
}

async function fetchBudgets() {
    try {
        const response = await apiFetch('/api/budgets/');
        const budgets = await response.json();
        const tbody = document.getElementById('budgetsTableBody');
        tbody.innerHTML = '';

        budgets.forEach(b => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 transition-colors';
            const displayCat = b.custom_category ? `${b.category}: ${b.custom_category}` : b.category;
            const occText = `${b.occurrence || 1}× for ${b.occurrence_count || 1}`;
            tr.innerHTML = `
                <td class="px-4 py-3 font-bold text-gray-800">${displayCat}</td>
                <td class="px-4 py-3">${b.period}</td>
                <td class="px-4 py-3 text-xs text-gray-500">${occText}</td>
                <td class="px-4 py-3 text-purple-500">₹${parseFloat(b.unit_amount || 0).toLocaleString('en-IN')}</td>
                <td class="px-4 py-3 font-bold text-purple-600">₹${parseFloat(b.budget_amount).toLocaleString('en-IN')}</td>
                <td class="px-4 py-3">${b.fiscal_year}</td>
                <td class="px-4 py-3 text-right">
                    <button onclick="deleteBudget('${b.id}')" class="text-xs text-red-400 hover:text-red-600">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error('Budget fetch error:', err); }
}

async function saveBudget() {
    const category = document.getElementById('bgt_category').value;
    const payload = {
        category,
        custom_category: document.getElementById('bgt_custom_category').value || null,
        budget_amount: parseFloat(document.getElementById('bgt_amount').value),
        unit_amount: parseFloat(document.getElementById('bgt_unit_amount').value) || null,
        period: document.getElementById('bgt_period').value,
        occurrence: parseInt(document.getElementById('bgt_occurrence').value) || 1,
        occurrence_count: parseInt(document.getElementById('bgt_occurrence_count').value) || 1,
        fiscal_year: parseInt(document.getElementById('bgt_year').value)
    };
    if (!payload.budget_amount) return alert('Budget amount is required');
    try {
        const response = await apiFetch('/api/budgets/', { method: 'POST', body: JSON.stringify(payload) });
        if (response.ok) { document.getElementById('budgetForm').reset(); onBudgetCategoryChange(); fetchBudgets(); alert('Budget set!'); }
        else { const err = await response.json(); alert('Error: ' + err.detail); }
    } catch (err) { alert('Failed to save budget'); }
}

async function deleteBudget(id) {
    if (!confirm('Delete this budget?')) return;
    try {
        const response = await apiFetch(`/api/budgets/${id}`, { method: 'DELETE' });
        if (response.ok) fetchBudgets();
    } catch (err) { console.error('Delete budget error:', err); }
}

// ==========================================
// FINANCIALS
// ==========================================
let financialChart = null;
async function fetchFinancialData() {
    try {
        const [invRes, expRes, bgtRes, empRes] = await Promise.all([
            apiFetch('/api/invoices/'), apiFetch('/api/expenses/'), apiFetch('/api/budgets/'), apiFetch('/api/employees/')
        ]);
        const invoices = await invRes.json();
        const expenses = await expRes.json();
        const budgets = await bgtRes.json();
        const employees = await empRes.json();

        // Revenue from confirmed/active
        const confirmedInvoices = invoices.filter(i => { const s = (i.status || '').toLowerCase(); return s === 'confirmed' || s === 'active'; });
        const totalRevenue = confirmedInvoices.reduce((s, i) => s + parseFloat(i.rate_agreed || i.amount || 0), 0);
        const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

        // Payroll
        const totalPayroll = employees.reduce((s, e) => s + parseFloat(e.earnings_per_month || 0), 0);
        const grossEarnings = totalRevenue - totalPayroll;
        const netEarnings = grossEarnings - totalExpenses;

        const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.budget_amount || 0), 0);
        const budgetUtil = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

        document.getElementById('fin_revenue').textContent = `₹ ${totalRevenue.toLocaleString('en-IN')}`;
        document.getElementById('fin_expenses').textContent = `₹ ${totalExpenses.toLocaleString('en-IN')}`;
        document.getElementById('fin_gross').textContent = `₹ ${grossEarnings.toLocaleString('en-IN')}`;
        document.getElementById('fin_earnings').textContent = `₹ ${netEarnings.toLocaleString('en-IN')}`;
        document.getElementById('fin_budget_util').textContent = `${budgetUtil}%`;

        // Color code
        document.getElementById('fin_gross').className = `text-2xl font-bold ${grossEarnings >= 0 ? 'text-blue-600' : 'text-red-600'}`;
        document.getElementById('fin_earnings').className = `text-2xl font-bold ${netEarnings >= 0 ? 'text-indigo-600' : 'text-red-600'}`;

        generateSmartAdvice(totalRevenue, totalExpenses, netEarnings, budgetUtil, expenses, budgets);
        renderFinancialChart(invoices, expenses);

        // Budget vs Actual
        const container = document.getElementById('budgetVsActualContainer');
        container.innerHTML = '';
        budgets.forEach(b => {
            const catExpenses = expenses.filter(e => e.category === b.category).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
            const pct = b.budget_amount > 0 ? Math.round((catExpenses / b.budget_amount) * 100) : 0;
            const barColor = pct > 100 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-green-500';
            container.innerHTML += `
                <div class="flex items-center gap-4">
                    <span class="text-xs font-bold text-gray-600 w-24">${b.category}</span>
                    <div class="flex-1 bg-gray-100 rounded-full h-3">
                        <div class="${barColor} h-3 rounded-full transition-all" style="width: ${Math.min(pct, 100)}%"></div>
                    </div>
                    <span class="text-xs font-bold ${pct > 100 ? 'text-red-600' : 'text-gray-500'}">₹${catExpenses.toLocaleString('en-IN')} / ₹${parseFloat(b.budget_amount).toLocaleString('en-IN')} (${pct}%)</span>
                </div>
            `;
        });
    } catch (err) { console.error('Financials fetch error:', err); }
}

function renderFinancialChart(invoicesData, expensesData) {
    const ctx = document.getElementById('financialChart')?.getContext('2d');
    if (!ctx) return;
    if (financialChart) financialChart.destroy();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revByMonth = new Array(12).fill(0);
    const expByMonth = new Array(12).fill(0);

    if (invoicesData) invoicesData.forEach(inv => { const d = new Date(inv.date || inv.created_at); revByMonth[d.getMonth()] += parseFloat(inv.amount || inv.net_amount || 0); });
    if (expensesData) expensesData.forEach(exp => { const d = new Date(exp.expense_date); expByMonth[d.getMonth()] += parseFloat(exp.amount || 0); });

    financialChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months, datasets: [
                { label: 'Revenue', data: revByMonth, backgroundColor: 'rgba(22,163,74,0.7)', borderRadius: 4 },
                { label: 'Expenses', data: expByMonth, backgroundColor: 'rgba(220,38,38,0.7)', borderRadius: 4 }
            ]
        },
        options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
    });
}

function generateSmartAdvice(revenue, expenses, earnings, budgetUtil, expensesArr, budgets) {
    const adviceEl = document.getElementById('fin_advice_text');
    const advices = [];
    if (earnings < 0) advices.push('⚠️ <strong>Warning:</strong> Your expenses exceed revenue. Consider reducing non-essential spending.');
    else if (earnings > 0 && expenses > revenue * 0.7) advices.push('⚠️ Expenses consuming over 70% of revenue. Review recurring costs.');
    if (budgetUtil > 100) advices.push('🚨 <strong>Budget Overrun!</strong> Actual spending exceeded defined budget.');
    else if (budgetUtil > 80) advices.push('🟡 Budget at ' + budgetUtil + '%. Approaching limit.');
    const catMap = {};
    expensesArr.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + parseFloat(e.amount || 0); });
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) advices.push(`📊 Top expense: <strong>${sorted[0][0]}</strong> at ₹${sorted[0][1].toLocaleString('en-IN')}.`);
    if (revenue === 0 && expenses === 0) advices.push('📝 No financial data yet. Start logging expenses and processing inquiries.');
    if (advices.length === 0) advices.push('✅ Financials look healthy! Revenue exceeds expenses and budget is within limits.');
    adviceEl.innerHTML = advices.join('<br><br>');
}
