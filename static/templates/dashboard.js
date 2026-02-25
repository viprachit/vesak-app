// static/templates/dashboard.js

// Global State
let allInquiries = [];
let currentFilter = 'All';

// Configuration for Status Colors
const STATUS_COLORS = {
    'Active': 'bg-green-100 text-green-800',
    'Payment Pending': 'bg-yellow-100 text-yellow-800',
    'Payment Pending or Payment Not Made': 'bg-yellow-100 text-yellow-800',
    'Follow-up': 'bg-blue-100 text-blue-800',
    'Staff Issue': 'bg-red-100 text-red-800',
    'Not Interested': 'bg-gray-100 text-gray-800',
    'Terminated Service': 'bg-black text-white',
    'Terminated': 'bg-black text-white',
    'Pending Allocation': 'bg-purple-100 text-purple-800'
};


// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch
    refreshDashboard();

    // Setup KPI Click Handlers
    document.querySelectorAll('.kpi-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.onclick = () => {
            const filterType = card.dataset.filter || 'All';
            applyFilter(filterType);

            // Visual feedback
            document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('ring-2', 'ring-royal-blue'));
            card.classList.add('ring-2', 'ring-royal-blue');
        };
    });
});

// Helper to safely update text content
function updateText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

async function refreshDashboard() {
    try {
        const res = await apiFetch('/api/invoices/');
        if (!res.ok) throw new Error('Failed to fetch data');

        const data = await res.json();
        allInquiries = data || [];

        updateKPIs();
        renderRecentActivity();
        if (typeof renderChart === 'function') renderChart(allInquiries);

        // Initial render for the Active tab (Allocation)
        renderTable(allInquiries);
        renderDashboardAllocationTable(allInquiries);

    } catch (err) {
        console.error("Dashboard Error:", err);
    }
}

function deriveStatus(item) {
    const inquiryStatus = item.shift_status || 'Pending';
    const paymentMade = item.payment_made === true || item.payment_made === 'true';
    const staffAllocated = !!(item.nurse_name || item.primary_staff_name);
    const interest = item.interest_level || 'Low';

    if (item.service_status === 'Terminated' || item.service_status === 'Terminated Service') return 'Terminated Service';
    if (item.service_status === 'Not Interested') return 'Not Interested';

    if (inquiryStatus === 'Confirmed' && paymentMade && staffAllocated) return 'Active';
    if (inquiryStatus === 'Confirmed' && !paymentMade) return 'Payment Pending';
    if (item.service_status === 'Not Interested' && (interest === 'High' || interest === 'Medium')) return 'Follow-up';
    if (paymentMade && !staffAllocated) return 'Staff Issue';
    if (inquiryStatus === 'Confirmed' && !staffAllocated) return 'Pending Allocation';

    return item.service_status || 'Pending Allocation';
}

function switchOperationsTab(tab) {
    document.querySelectorAll('.op-tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.op-tab-btn').forEach(b => {
        b.classList.remove('bg-white', 'shadow-sm', 'text-royal-blue');
        b.classList.add('text-gray-500');
    });

    const container = document.getElementById(`op-${tab}-container`);
    if (container) container.classList.remove('hidden');

    const btn = document.getElementById(`tab-op-${tab}`);
    if (btn) {
        btn.classList.add('bg-white', 'shadow-sm', 'text-royal-blue');
        btn.classList.remove('text-gray-500');
    }

    if (tab === 'allocation') renderTable(allInquiries);
    if (tab === 'registry') renderRegistryTable(allInquiries);
    if (tab === 'employees') {
        if (window.fetchEmployees) window.fetchEmployees();
    }
}

function updateKPIs() {
    // 1. Calculate General Counts
    const total = allInquiries.length;
    const active = allInquiries.filter(i =>
        i.service_status === 'Active' ||
        (i.shift_status === 'Confirmed' && i.payment_made)
    ).length;

    const pending = allInquiries.filter(i => i.service_status === 'Pending').length;

    const paymentPending = allInquiries.filter(i =>
        i.service_status === 'Payment Pending' ||
        (i.shift_status === 'Confirmed' && !i.payment_made)
    ).length;

    const terminated = allInquiries.filter(i => i.service_status === 'Terminated').length;

    const web = allInquiries.filter(i => {
        const src = (i.source || '').toLowerCase();
        return src.includes('google') || src.includes('social') || src.includes('facebook') || src.includes('instagram') || src.includes('web');
    }).length;

    const invoices = allInquiries.filter(i => i.invoice_number).length;

    // 2. Calculate This Month vs Last Month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    const thisMonthInquiries = allInquiries.filter(i => {
        const d = new Date(i.date || i.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const lastMonthInquiries = allInquiries.filter(i => {
        const d = new Date(i.date || i.created_at);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).length;

    // 3. Sub-counts for KPIs
    const invoicesActive = allInquiries.filter(i => i.invoice_number && (i.service_status === 'Active' || i.service_status === 'Confirmed')).length;
    const invoicesTerminated = allInquiries.filter(i => i.invoice_number && i.service_status === 'Terminated').length;

    const potential = allInquiries.filter(i =>
        (i.interest_level === 'High' || i.interest_level === 'Medium') &&
        (i.service_status === 'Pending' || i.service_status === 'Pending Action')
    ).length;

    const rejected = allInquiries.filter(i => i.service_status === 'Not Interested').length;

    // 4. Update DOM Main KPIs
    updateText('kpi-total', total);
    updateText('kpi-active', active);
    updateText('kpi-invoices', invoices);
    updateText('kpi-pending', pending);
    updateText('kpi-terminated', terminated);
    updateText('kpi-web', web);

    // 5. Update DOM Sub-metrics
    updateText('kpi-this-month', thisMonthInquiries);
    updateText('kpi-last-month', lastMonthInquiries);

    // Progress Bar Logic
    const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
    const progressBar = document.getElementById('active-progress-bar');
    if (progressBar) progressBar.style.width = `${activePct}%`;
    updateText('active-ongoing-text', `${active} Ongoing Cases`);

    updateText('invoices-active-count', invoicesActive);
    updateText('invoices-terminated-count', invoicesTerminated);

    updateText('potential-clients-count', potential);
    updateText('rejected-count', rejected);
}

function renderRecentActivity() {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    // Sort by created_at descending
    const sorted = [...allInquiries].sort((a, b) => {
        const da = new Date(a.created_at || a.date);
        const db = new Date(b.created_at || b.date);
        return db - da;
    });

    const latest = sorted.slice(0, 5);

    if (latest.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-gray-400 text-xs italic">No recent activity found</div>';
        return;
    }

    container.innerHTML = '';
    latest.forEach(item => {
        const div = document.createElement('div');
        div.className = "flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer border-b border-gray-50 last:border-0";
        div.onclick = () => {
            // Logic to open/highlight this item in tracker
            showServiceAllocation('All');
        };

        const initials = (item.customer_name || 'U').charAt(0).toUpperCase();
        const dateObj = new Date(item.created_at || item.date);
        const timeAgo = formatTimeAgo(dateObj);

        // Icon color based on status
        let iconBg = 'bg-blue-100 text-royal-blue';
        if (item.service_status === 'Active') iconBg = 'bg-green-100 text-green-700';
        if (item.service_status === 'Terminated') iconBg = 'bg-red-100 text-red-700';

        div.innerHTML = `
            <div class="w-8 h-8 rounded-full ${iconBg} flex items-center justify-center text-xs font-bold">
                ${initials}
            </div>
            <div>
                <p class="text-sm font-bold text-gray-700">${item.customer_name || 'Anonymous'}</p>
                <p class="text-[10px] text-gray-400">${item.service_status || 'New Inquiry'} • ${item.customer_location || 'General'}</p>
            </div>
            <span class="ml-auto text-[10px] text-gray-400">${timeAgo}</span>
        `;
        container.appendChild(div);
    });
}

function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
}

function showClientCorrections() {
    navigateTo('dashboard');
    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('webInquiriesFilters').classList.add('hidden');
    highlightTrackerTab('corrections');

    // Corrections tab implies filtering by some flag or just showing the table in a special mode.
    // For now, render all but maybe with different actions or an edit state.
    renderTable(allInquiries, true); // True flag sets it to Edit Mode
}

function applyFilter(status) {
    currentFilter = status;
    document.getElementById('webInquiriesFilters').classList.add('hidden');

    // Map status to tab name
    let tTab = 'allocations';
    if (status === 'Invoice Generated') tTab = 'invoices';
    if (status === 'Official Docs') tTab = 'docs'; // if added
    highlightTrackerTab(tTab);

    let filtered = allInquiries;

    if (status !== 'All') {
        filtered = allInquiries.filter(i => {
            // Normalize status check
            const s = i.service_status || 'Pending';

            if (status === 'Active') return s === 'Active' || (i.status === 'Confirmed' && i.payment_made);
            if (status === 'Pending Action') return s === 'Pending' || s === 'Payment Pending' || (i.status === 'Confirmed' && !i.payment_made) || (s === 'Active' && !i.primary_staff_name);
            if (status === 'Invoice Generated') return !!i.invoice_number;
            if (status === 'Terminated') return s === 'Terminated' || s === 'Not Interested';

            return s === status;
        });
    }
    renderTable(filtered);
}

function renderTable(data) {
    const tbody = document.getElementById('allocationTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100";
        tr.onclick = (e) => toggleRowDetails(item.id, e);

        const status = deriveStatus(item);

        let paymentStatus = item.payment_made ? 'Made' : 'Pending';
        let staffStatus = 'Not Allocated';

        const staffName = item.nurse_name || item.primary_staff_name;
        if (staffName) {
            staffStatus = 'Allocated';
        } else if (item.payment_made) {
            staffStatus = 'Staff Issue';
        }

        let paymentBadge = paymentStatus === 'Made' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
        let staffBadge = staffStatus === 'Allocated' ? 'bg-blue-100 text-blue-700' : (staffStatus === 'Staff Issue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500');

        const isViewOnly = sessionStorage.getItem('userRole') === 'View Only';
        const pointerEvents = isViewOnly ? "pointer-events-none opacity-50" : "";

        // Determine Actions based on Payment & Staff status
        let actionButtons = '';
        if (paymentStatus === 'Pending') {
            actionButtons = `<button onclick="editInquiry('${item.id}', 'payment_mode')" class="px-3 py-1 bg-royal-gold text-white text-[10px] font-bold rounded hover:bg-black transition-all">Payment</button>`;
        } else if (paymentStatus === 'Made' && staffStatus === 'Allocated') {
            actionButtons = `<button onclick="editInquiry('${item.id}', 'add_staff')" class="px-3 py-1 bg-royal-blue text-white text-[10px] font-bold rounded hover:bg-black transition-all">Add Staff</button>`;
        } else if (paymentStatus === 'Made' && staffStatus !== 'Allocated') {
            actionButtons = `<button onclick="editInquiry('${item.id}', 'payment_mode')" class="px-3 py-1 bg-red-500 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-all">Assign Staff</button>`;
        }

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">${index + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.date || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-royal-gold">${item.invoice_number || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${item.customer_name || 'Unknown'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.customer_mobile || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.service || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.customer_location || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.sub_location || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-[10px] leading-5 font-bold rounded-full ${paymentBadge}">
                    ${paymentStatus}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-[10px] leading-5 font-bold rounded-full ${staffBadge}">
                    ${staffStatus}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right" onclick="event.stopPropagation()">
                <div class="flex justify-end gap-2 ${pointerEvents}">
                    ${actionButtons}
                    <button onclick="cancelServiceInvoice('${item.id}')" class="px-2 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold rounded hover:bg-red-500 hover:text-white transition-all">
                        Cancel
                    </button>
                    ${status === 'Terminated' || status === 'Terminated Service' ? '<span class="text-xs text-red-500 font-bold ml-2 mt-1">Terminated</span>' : `
                    <select onchange="handleStatusChange('${item.id}', this.value)" class="text-xs border-gray-300 rounded shadow-sm focus:border-royal-blue max-w-[80px]">
                        <option value="">Status...</option>
                        <option value="Terminated Service">Terminate</option>
                    </select>`}
                </div>
            </td>
        `;
        tbody.appendChild(tr);

        // Detail Row (Expanded View)
        const detailTr = document.createElement('tr');
        detailTr.id = `detail-${item.id}`;
        detailTr.className = "hidden bg-gray-50/50";
        detailTr.innerHTML = `
            <td colspan="11" class="px-8 py-6">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
                    <div>
                        <h4 class="text-[10px] font-bold uppercase tracking-widest text-royal-gold mb-3">Client Profile</h4>
                        <div class="space-y-1.5">
                            <p class="text-gray-700"><b>Gender:</b> ${item.customer_gender || '-'}</p>
                            <p class="text-gray-700"><b>Age:</b> ${item.customer_age || '-'} Yrs</p>
                            <p class="text-gray-600 leading-relaxed italic mt-2"><b>Address:</b> ${item.customer_address || '-'}</p>
                            <p class="text-gray-700"><b>Location:</b> ${item.customer_location || '-'}</p>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-[10px] font-bold uppercase tracking-widest text-royal-gold mb-3">Service Details</h4>
                        <div class="space-y-1.5">
                            <p class="text-gray-700"><b>Sub Service:</b> ${item.plan || '-'}</p>
                            <p class="text-gray-700"><b>Shift:</b> ${item.shift || '-'} | <b>Period:</b> ${item.period || '-'}</p>
                            <p class="text-gray-700"><b>Recurring:</b> ${item.is_recurring ? '<span class="text-green-600 font-bold">YES</span>' : 'No'}</p>
                            <p class="text-gray-700"><b>Referral:</b> ${item.referral_name || 'Direct'}</p>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-[10px] font-bold uppercase tracking-widest text-royal-gold mb-3">Staff Allocation</h4>
                        <div class="space-y-3">
                            <div>
                                <p class="text-[10px] text-gray-400 uppercase font-bold">Primary Staff</p>
                                <p class="text-royal-blue font-bold">${item.nurse_name || item.primary_staff_name || 'Not Allocated'}</p>
                            </div>
                            <div class="pt-2 border-t border-gray-100">
                                <p class="text-[10px] text-gray-400 uppercase font-bold">Secondary Staff</p>
                                <div class="flex gap-2 mt-1">
                                    <input type="text" id="sec-staff-${item.id}" value="${item.secondary_staff_name || ''}" placeholder="Assistant name" class="text-[10px] border rounded px-2 py-1 flex-1">
                                    <button onclick="saveSecondaryStaff('${item.id}')" class="bg-royal-blue text-white px-2 py-1 rounded text-[10px] font-bold">Set</button>
                                </div>
                            </div>
                            <div class="pt-2 border-t border-gray-100">
                                <p class="text-[10px] text-gray-400"><b>Modified By:</b> ${item.updated_by_name || '-'}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-[10px] font-bold uppercase tracking-widest text-royal-gold mb-3">Operational Notes</h4>
                        <p class="text-xs text-gray-500 italic border-l-2 border-royal-gold pl-3 leading-relaxed mb-4">
                            ${item.notes || 'No notes recorded.'}
                        </p>
                        ${item.terminate_note ? `
                            <div class="mt-3 p-2 bg-red-50 text-red-700 text-[10px] rounded border border-red-100">
                                <b>Termination Note:</b> ${item.terminate_note}
                            </div>
                        ` : ''}
                        <div class="mt-4 p-2 bg-gray-50 rounded border border-gray-200 text-[10px]">
                            <b>Visits:</b> ${item.visits || 0} | <b>Minimum Pay:</b> ₹${item.minimum_pay || 0}
                        </div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(detailTr);
    });
}

function toggleRowDetails(id, event) {
    if (event && (event.target.tagName === 'SELECT' || event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT')) return;
    const row = document.getElementById(`detail-${id}`);
    if (row) row.classList.toggle('hidden');
}

async function handleStatusChange(id, newStatus) {
    if (!id || !newStatus) return;
    if (newStatus === 'Terminated') newStatus = 'Terminated Service';
    const payload = { service_status: newStatus };
    if (newStatus === 'Terminated Service') {
        const note = prompt("Please enter the TERMINATION REASON / NOTE:");
        if (note === null) return;
        payload.terminate_note = note;
    }
    try {
        const res = await apiFetch(`/api/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        if (res.ok) refreshDashboard();
        else alert("Failed to update status.");
    } catch (e) {
        console.error("Error updating status:", e);
    }
}

function editAllocationStaff(id) {
    const row = document.getElementById(`detail-${id}`);
    if (row) {
        row.classList.remove('hidden');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

async function saveSecondaryStaff(id) {
    const name = document.getElementById(`sec-staff-${id}`).value;
    try {
        const res = await apiFetch(`/api/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ secondary_staff_name: name })
        });
        if (res.ok) {
            refreshDashboard();
            alert("Secondary staff updated.");
        }
    } catch (err) {
        console.error(err);
    }
}

async function editInquiry(id, mode) {
    if (typeof navigateTo !== 'function') return alert("Navigation function not found.");

    try {
        // 1. Load data into form
        if (window.loadInquiryToForm) {
            await window.loadInquiryToForm(id);
        }

        // 2. Switch to Inquiry Tab
        navigateTo('inquiry');

        // 3. Set Form Mode securely based on Tracker Action clicked
        if (window.setInquiryFormMode) {
            window.setInquiryFormMode(mode);
        }

        console.log(`Inquiry mode enabled for ${id} as ${mode}`);
    } catch (err) {
        console.error("Edit navigation failed:", err);
    }
}

async function navigateToAllocation(id) {
    if (typeof navigateTo !== 'function') return alert("Navigation function not found.");

    try {
        // 1. Load data into form (using the correct function from api_inquiry.js)
        if (window.loadInquiryToForm) {
            await window.loadInquiryToForm(id);
        }

        // 2. Switch to Inquiry Tab
        navigateTo('inquiry');

        // 3. Set Form Mode
        if (window.setInquiryFormMode) {
            window.setInquiryFormMode('allocate');
        }

        console.log("Allocation mode enabled for:", id);
    } catch (err) {
        console.error("Allocation navigation failed:", err);
    }
}


function exportCSV() {
    // Filter data based on date range inputs if present
    const start = document.getElementById('filterStartDate')?.value;
    const end = document.getElementById('filterEndDate')?.value;

    let dataToExport = allInquiries;

    if (start && end) {
        const dStart = new Date(start);
        const dEnd = new Date(end);
        dataToExport = allInquiries.filter(i => {
            const d = new Date(i.date);
            return d >= dStart && d <= dEnd;
        });
    }

    if (dataToExport.length === 0) return alert("No data to export");

    // Build CSV
    const headers = ["Serial No", "Call Date", "Name", "Mobile", "Service Required", "Sub Service", "Status", "Rate Agreed"];
    const rows = dataToExport.map((i, idx) => [
        idx + 1,
        i.date,
        `"${i.customer_name || ''}"`, // Quote strings
        i.customer_mobile,
        i.service,
        `"${i.plan || ''}"`,
        i.service_status,
        i.amount
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `vesak_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    link.click();
    document.body.removeChild(link);
}

// Chart Instance
let chartInstance = null;

function refreshTrendChart() {
    if (allInquiries.length >= 0) {
        renderChart(allInquiries);
    }
}

function renderChart(data) {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;

    // Get current UI settings
    const trendType = document.getElementById('trend-type')?.value || 'Overall';
    const trendPeriod = document.getElementById('trend-period')?.value || '6m';
    const compareMode = document.getElementById('trend-compare-toggle')?.checked || false;

    // 1. Process Temporal Config
    const temporal = getTemporalBuckets(trendPeriod);
    const labels = temporal.labels;
    const primaryRange = temporal.range;

    // 2. Filter Primary Data
    const primaryData = filterTrendData(data, trendType, primaryRange.start, primaryRange.end);
    const primaryPoints = aggregateDataToBuckets(primaryData, temporal);

    const datasets = [
        {
            label: `${trendType} (Current Period)`,
            data: primaryPoints,
            borderColor: '#4169E1', // Royal Blue
            backgroundColor: 'rgba(65, 105, 225, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5
        }
    ];

    // 3. Handle Comparison Logic
    if (compareMode) {
        const compareRange = getComparisonRange(trendPeriod, primaryRange);
        const compareData = filterTrendData(data, trendType, compareRange.start, compareRange.end);
        const comparePoints = aggregateDataToBuckets(compareData, temporal, true); // True to offset dates for aggregation

        datasets.push({
            label: `${trendType} (Previous Period)`,
            data: comparePoints,
            borderColor: '#94a3b8', // Gray
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            fill: false,
            pointRadius: 2
        });
    }

    // 4. Create/Refresh Chart Instance
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, font: { size: 10 } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.parsed.y} Inquiries`;
                        }
                    }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, stepSize: 1 } },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } }
            }
        }
    });
}

/** 
 * Helpers for Advanced Chart Logic
 */

function getTemporalBuckets(period) {
    const now = new Date();
    let start = new Date();
    let unit = 'month';
    let count = 6;

    if (period === '1w') { start.setDate(now.getDate() - 7); unit = 'day'; count = 7; }
    else if (period === '1m') { start.setMonth(now.getMonth() - 1); unit = 'day'; count = 30; }
    else if (period === '3m') { start.setMonth(now.getMonth() - 3); unit = 'week'; count = 12; }
    else if (period === '6m') { start.setMonth(now.getMonth() - 6); unit = 'month'; count = 6; }
    else if (period === '1y') { start.setFullYear(now.getFullYear() - 1); unit = 'month'; count = 12; }

    const labels = [];
    const buckets = [];
    for (let i = 0; i < count; i++) {
        let d = new Date(start);
        if (unit === 'day') d.setDate(start.getDate() + i + 1);
        else if (unit === 'week') d.setDate(start.getDate() + (i * 7) + 7);
        else if (unit === 'month') d.setMonth(start.getMonth() + i + 1);

        const lab = (unit === 'day') ? d.toLocaleDateString('default', { day: 'numeric', month: 'short' }) :
            (unit === 'month') ? d.toLocaleDateString('default', { month: 'short', year: '2-digit' }) :
                `Week ${i + 1} `;
        labels.push(lab);
        buckets.push(new Date(d));
    }

    return { labels, buckets, unit, range: { start, end: now } };
}

function getComparisonRange(period, primaryRange) {
    const start = new Date(primaryRange.start);
    const end = new Date(primaryRange.end);
    const diff = end.getTime() - start.getTime();

    return {
        start: new Date(start.getTime() - diff),
        end: new Date(end.getTime() - diff)
    };
}

function filterTrendData(data, type, start, end) {
    return data.filter(item => {
        const d = new Date(item.created_at || item.date);
        if (d < start || d > end) return false;

        const src = (item.source || '').toLowerCase();
        const status = item.service_status || 'Pending';

        if (type === 'Overall') return true;
        if (type === 'Active') return status === 'Active' || (item.shift_status === 'Confirmed' && item.payment_made);
        if (type === 'Terminated') return status === 'Terminated';
        if (type === 'Not Interested') return status === 'Not Interested';
        if (type === 'Email') return src.includes('email');
        if (type === 'Web') return src.includes('web') || src.includes('form');
        if (type === 'WhatsApp') return src.includes('whatsapp');
        if (type === 'Social') return src.includes('social') || src.includes('facebook') || src.includes('instagram');

        return true;
    });
}

function aggregateDataToBuckets(data, temporal, isComparison = false) {
    const points = new Array(temporal.buckets.length).fill(0);
    const buckets = temporal.buckets;

    data.forEach(item => {
        let d = new Date(item.created_at || item.date);

        // If comparison, we "shift" the date forward by one period to map it to the same visual x-axis
        if (isComparison) {
            const periodDiff = temporal.range.end.getTime() - temporal.range.start.getTime();
            d = new Date(d.getTime() + periodDiff);
        }

        // Find which bucket this belongs to
        for (let i = 0; i < buckets.length; i++) {
            if (d <= buckets[i]) {
                points[i]++;
                break;
            }
        }
    });

    return points;
}

// NEW: Render the Dashboard Widget Table (Service Allocation Status)
function renderDashboardAllocationTable(data) {
    const tbody = document.getElementById('dashboard-allocation-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Show top 10 recent
    const recent = [...data].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date)).slice(0, 10);

    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-gray-400">No active allocations found.</td></tr>';
        return;
    }

    recent.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 transition-colors border-b border-gray-50";

        // Payment & Staff Status Logic
        let paymentStatus = item.payment_made ? 'Made' : 'Pending';
        let staffStatus = 'Not Allocated';

        const staffName = item.nurse_name || item.primary_staff_name;
        if (staffName) {
            staffStatus = 'Allocated';
        } else if (item.payment_made) {
            staffStatus = 'Staff Issue';
        }

        let paymentBadge = paymentStatus === 'Made' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
        let staffBadge = staffStatus === 'Allocated' ? 'bg-blue-100 text-blue-700' : (staffStatus === 'Staff Issue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500');

        const isAssigned = staffName !== undefined && staffName !== null && staffName !== '';

        const staffDisplay = isAssigned
            ? `<div class="flex items-center gap-2">
                 <div class="w-6 h-6 rounded-full bg-royal-blue text-white flex items-center justify-center text-[10px] font-bold">${staffName.charAt(0)}</div>
                 <span class="font-bold text-royal-blue">${staffName}</span>
               </div>`
            : `<span class="italic text-gray-400 text-xs">-- Not Assigned --</span>`;

        // Action Button
        let actionBtn = '';
        if (paymentStatus === 'Pending') {
            actionBtn = `<button onclick="editInquiry('${item.id}', 'payment_mode')" class="px-3 py-1 bg-royal-gold text-white text-[10px] font-bold rounded hover:bg-black transition-all">Payment</button>`;
        } else if (paymentStatus === 'Made' && staffStatus === 'Allocated') {
            actionBtn = `<button onclick="editInquiry('${item.id}', 'add_staff')" class="px-3 py-1 bg-royal-blue text-white text-[10px] font-bold rounded hover:bg-black transition-all">Add Staff</button>`;
        } else if (paymentStatus === 'Made' && staffStatus !== 'Allocated') {
            actionBtn = `<button onclick="editInquiry('${item.id}', 'payment_mode')" class="px-3 py-1 bg-red-500 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-all">Assign Staff</button>`;
        }

        tr.innerHTML = `
            <td class="px-4 py-3 font-bold text-gray-700 text-sm">${item.customer_name || 'Unknown'} <div class="text-[10px] text-gray-400 font-normal">${item.invoice_number || ''}</div></td>
            <td class="px-4 py-3 text-sm text-gray-600">${item.service || '-'} <div class="text-[10px] text-gray-400">${item.shift || ''}</div></td>
            <td class="px-4 py-3 text-sm text-gray-500"><i class="fa-solid fa-location-dot text-gray-300 mr-1"></i> ${item.customer_location || '-'}</td>
            <td class="px-4 py-3"><span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${paymentBadge}">${paymentStatus}</span></td>
            <td class="px-4 py-3"><span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${staffBadge}">${staffStatus}</span></td>
            <td class="px-4 py-3 text-center">${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}


// --- DISCOVERY & ANALYTICS EXPLORER LOGIC ---

let explorerCurrentType = '';
let explorerCurrentData = [];

function openAnalyticsExplorer(type) {
    explorerCurrentType = type;
    const section = document.getElementById('analytics-explorer');
    if (!section) return;

    // Navigate to section
    navigateTo('analytics-explorer');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update UI
    const title = document.getElementById('explorer-title');
    const subtitle = document.getElementById('explorer-subtitle');
    const subfilters = document.getElementById('explorer-subfilters');

    title.innerText = type;
    subfilters.classList.add('hidden'); // Default hidden

    // Determine Filtering Logic
    let filtered = [];
    switch (type) {
        case 'Total Inquiries':
            subtitle.innerText = "All direct clients (excluding web/social leads)";
            filtered = allInquiries.filter(i => {
                const src = (i.source || '').toLowerCase();
                return !(src.includes('web') || src.includes('google') || src.includes('social') || src.includes('facebook') || src.includes('instagram') || src.includes('whatsapp'));
            });
            break;

        case 'Active Service':
            subtitle.innerText = "Clients with currently active and ongoing services";
            filtered = allInquiries.filter(i => (i.service_status === 'Active' || (i.shift_status === 'Confirmed' && i.payment_made)));
            break;

        case 'Invoice Generated':
            subtitle.innerText = "Clients whose invoices have been issued";
            subfilters.classList.remove('hidden');
            filtered = allInquiries.filter(i => !!i.invoice_number);
            break;

        case 'Pending Action':
            subtitle.innerText = "Clients requiring attention (No staff, staff issues, or payment bottlenecks)";
            filtered = allInquiries.filter(i =>
                i.service_status === 'Pending' ||
                i.service_status === 'Staff Issue' ||
                i.service_status === 'Payment Pending' ||
                (i.service_status === 'Active' && !i.nurse_name && !i.primary_staff_name) ||
                (i.shift_status === 'Confirmed' && !i.payment_made)
            );
            break;

        case 'Terminated':
            subtitle.innerText = "Finalized records (Terminated or Not Interested)";
            filtered = allInquiries.filter(i => i.service_status === 'Terminated' || i.service_status === 'Not Interested');
            break;

        case 'Recent Activity':
            subtitle.innerText = "Full chronological activity logs";
            filtered = [...allInquiries].sort((a, b) => {
                const da = new Date(a.created_at || a.date);
                const db = new Date(b.created_at || b.date);
                return db - da;
            });
            break;

        default:
            filtered = allInquiries;
    }

    explorerCurrentData = filtered;
    renderExplorerTable(filtered);
}

function filterExplorer(status) {
    // Specialized sub-filtering (primarily for Invoices)
    let filtered = explorerCurrentData;

    // UI Feedback
    document.querySelectorAll('#explorer-subfilters button').forEach(b => {
        b.classList.remove('bg-royal-blue', 'text-white');
        b.classList.add('bg-white', 'text-gray-600', 'border-gray-200');
    });
    const activeBtn = document.getElementById(`btn - exp - ${status.toLowerCase().substring(0, 4)} `) || document.getElementById('btn-exp-all');
    if (activeBtn) {
        activeBtn.classList.remove('bg-white', 'text-gray-600', 'border-gray-200');
        activeBtn.classList.add('bg-royal-blue', 'text-white');
    }

    if (status !== 'All') {
        filtered = explorerCurrentData.filter(i => {
            const s = i.service_status || 'Pending';
            if (status === 'Active') return s === 'Active' || (i.shift_status === 'Confirmed' && i.payment_made);
            if (status === 'Terminated') return s === 'Terminated' || s === 'Not Interested';
            return s === status;
        });
    }
    renderExplorerTable(filtered);
}

function renderExplorerTable(data) {
    const tbody = document.getElementById('explorer-table-body');
    const emptyState = document.getElementById('explorer-empty-state');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    data.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100";
        tr.onclick = () => toggleExplorerDetails(item.id);

        const status = item.service_status || 'Pending';
        const badgeClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">${index + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-royal-blue font-bold">${item.ref_no || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.date || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-royal-gold">${item.invoice_number || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${item.customer_name || 'Unknown'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.customer_mobile || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.service || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.customer_location || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.sub_location || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-[10px] leading-5 font-bold uppercase tracking-wider rounded-full ${badgeClass}">
                    ${status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-royal-blue">₹${item.amount || '0'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">${item.created_by_name || 'System'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right"><span class="text-gray-400 italic text-[10px]">Expand</span></td>
`;
        tbody.appendChild(tr);

        // Hidden Detail Row
        const detailTr = document.createElement('tr');
        detailTr.id = `exp - detail - ${item.id} `;
        detailTr.className = "hidden bg-blue-50/30";
        detailTr.innerHTML = `
    < td colspan = "9" class="px-8 py-6" >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
                <h4 class="text-[10px] font-bold uppercase tracking-widest text-royal-gold mb-2">Location & Address</h4>
                <p class="text-sm font-bold text-gray-800">${item.customer_location || 'Not specified'}</p>
                <p class="text-sm text-gray-600 mt-1 leading-relaxed">${item.customer_address || 'No address provided'}</p>
            </div>
            <div>
                <h4 class="text-[10px] font-bold uppercase tracking-widest text-royal-gold mb-2">Patient Details</h4>
                <div class="space-y-1">
                    <p class="text-sm text-gray-700"><b>Age:</b> ${item.customer_age || '-'} Yrs</p>
                    <p class="text-sm text-gray-700"><b>Gender:</b> ${item.customer_gender || '-'}</p>
                    <p class="text-sm text-gray-700"><b>Shift:</b> ${item.shift || '-'}</p>
                    <p class="text-sm text-gray-700"><b>Period:</b> ${item.period || '-'}</p>
                </div>
            </div>
            <div>
                <h4 class="text-[10px] font-bold uppercase tracking-widest text-royal-gold mb-2">Staff & Internal Notes</h4>
                <p class="text-sm text-gray-700 font-bold mb-1">Staff: <span class="text-royal-blue">${item.nurse_name || item.primary_staff_name || 'None Assigned'}</span></p>
                <p class="text-xs text-gray-700 mt-2"><b>Modified by:</b> ${item.updated_by_name || '-'}</span></p>
            <div class="mt-4 flex gap-2">
                <button onclick="loadInquiryToForm('${item.id}')" class="px-3 py-1.5 bg-royal-blue text-white text-[10px] font-bold rounded hover:bg-black transition-all">
                    <i class="fa-solid fa-edit mr-1"></i> Edit Record
                </button>
            </div>
            <p class="text-xs text-gray-500 italic mt-3 border-l-2 border-gray-200 pl-3 leading-relaxed">${item.notes || 'No internal notes available'}</p>
        </div>
                </div >
            </td >
    `;
        tbody.appendChild(detailTr);
    });
}

function toggleExplorerDetails(id) {
    const row = document.getElementById(`exp - detail - ${id} `);
    if (row) {
        // Close others first if you want accordion behavior, or just toggle
        row.classList.toggle('hidden');
    }
}

function renderRegistryTable(data) {
    const tbody = document.getElementById('registryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Only Super Admin & Admin can see results here
    const role = sessionStorage.getItem('userRole');
    if (role !== 'Super Admin' && role !== 'Admin') {
        tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-8 text-center text-gray-400">Access Restricted. Administrator clearance required.</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 border-b border-gray-100";
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-500 font-mono">${index + 1}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${item.date || '-'}</td>
            <td class="px-6 py-4 text-sm font-bold text-royal-gold">${item.invoice_number || '-'}</td>
            <td class="px-6 py-4 text-sm font-bold text-gray-900">${item.customer_name || '-'}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${item.customer_mobile || '-'}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${item.service || '-'}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${item.customer_location || '-'}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${item.sub_location || '-'}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 bg-gray-100 text-[10px] rounded-full">${item.service_status || 'Pending'}</span></td>
            <td class="px-6 py-4 text-sm font-bold text-royal-blue">₹${item.amount || '0'}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${item.created_by_name || 'System'}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="loadInquiryToForm('${item.id}')" class="px-3 py-1 bg-royal-blue text-white text-[10px] font-bold rounded hover:bg-black transition-all">
                    <i class="fas fa-edit mr-1"></i> Correct Data
                </button>
            </td>
`;
        tbody.appendChild(tr);
    });
}

// Cancel Service / Invoice
async function cancelServiceInvoice(id) {
    if (!confirm('Are you sure you want to cancel this service/invoice?')) return;
    const minPay = prompt('Enter minimum pay / cancellation charge (₹):', '0');
    if (minPay === null) return;

    try {
        const payload = {
            service_status: 'Cancelled',
            minimum_pay: parseFloat(minPay) || 0
        };
        const res = await apiFetch(`/api/invoices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert('Service cancelled successfully.');
            refreshDashboard();
        } else {
            const err = await res.json();
            alert('Error: ' + (err.detail || 'Failed to cancel'));
        }
    } catch (err) {
        console.error('Cancel error:', err);
        alert('Failed to cancel service.');
    }
}

// Expose functions globally
window.deriveStatus = deriveStatus;
window.switchOperationsTab = switchOperationsTab;
window.renderTable = renderTable;
window.renderRegistryTable = renderRegistryTable;
window.refreshDashboard = refreshDashboard;
window.exportCSV = exportCSV;
window.openAnalyticsExplorer = openAnalyticsExplorer;
window.filterExplorer = filterExplorer;
window.cancelServiceInvoice = cancelServiceInvoice;
