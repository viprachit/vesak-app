// static/templates/financials.js

let allInquiries = [];
let chartInstance = null;
let currentPeriod = 'monthly'; // daily, monthly, quarterly, yearly
let currentFY = 'apr-mar';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Enforce Authentication & strict Founder Check
    const role = sessionStorage.getItem('userRole');
    if (role !== 'Founder') {
        alert("SECURITY ALERT: This vault is exclusively for the Founder.");
        window.location.href = 'index.html';
        return;
    }

    applyRoleBasedAccess(role);
    loadFinancialData();
});

async function loadFinancialData() {
    try {
        const res = await apiFetch(`/api/inquiries/?limit=10000`); // Fetch massive for aggregation. In prod, build aggregate view in posgres.
        if (res.ok) {
            allInquiries = await res.json();
            calculateMetrics();
        }
    } catch (e) {
        console.error("Error fetching financial corpus", e);
    }
}

function setPeriod(p) {
    currentPeriod = p;
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`period-${p}`).classList.add('active');
    calculateMetrics();
}

function setFinancialYear(fy) {
    currentFY = fy;
    document.getElementById('fy-apr').classList.remove('active');
    document.getElementById('fy-apr').classList.add('text-gray-500');
    document.getElementById('fy-jan').classList.remove('active');
    document.getElementById('fy-jan').classList.add('text-gray-500');

    if (fy === 'apr-mar') {
        document.getElementById('fy-apr').classList.add('active');
        document.getElementById('fy-apr').classList.remove('text-gray-500');
    } else {
        document.getElementById('fy-jan').classList.add('active');
        document.getElementById('fy-jan').classList.remove('text-gray-500');
    }
    calculateMetrics();
}

function calculateMetrics() {
    if (!allInquiries || allInquiries.length === 0) return;

    let totalPayments = 0;
    let totalInvoicedEarnings = 0;

    // In a mature app, expenses would come from an API endpoint. Mocking for demonstration of mechanics.
    const expenseData = { rent: 25000, salaries: 85000, util: 12000 };
    const totalExp = expenseData.rent + expenseData.salaries + expenseData.util;

    // Filter to valid revenue-generating objects
    const revenueItems = allInquiries.filter(i => i.amount && !isNaN(parseFloat(i.amount)));

    revenueItems.forEach(i => {
        const amt = parseFloat(i.amount) || 0;

        // Logical rule: 'Payment Made' means cash in hand.
        if (i.status === 'Confirmed' && i.payment_made === true) {
            totalPayments += amt;
        }

        // Logical rule: Included in invoiced earnings if doc generated.
        if (i.invoice_number) {
            totalInvoicedEarnings += amt;
        }
    });

    // Margin (Roughly gross minus static expenses)
    let netMargin = totalPayments - totalExp;
    let marginPct = totalPayments > 0 ? ((netMargin / totalPayments) * 100).toFixed(1) : 0;

    // Update UI
    document.getElementById('kpi-payments').innerText = `₹${totalPayments.toLocaleString('en-IN')}`;
    document.getElementById('kpi-earnings').innerText = `₹${totalInvoicedEarnings.toLocaleString('en-IN')}`;
    document.getElementById('kpi-margin').innerText = `₹${netMargin.toLocaleString('en-IN')}`;

    const marginEl = document.getElementById('kpi-margin-pct');
    marginEl.innerText = `${marginPct}%`;
    if (netMargin < 0) {
        marginEl.className = "text-red-600 bg-red-50 px-2 py-1 rounded font-bold";
        document.getElementById('kpi-margin').classList.replace('text-slate-800', 'text-red-500');
    } else {
        marginEl.className = "text-green-600 bg-green-50 px-2 py-1 rounded font-bold";
        document.getElementById('kpi-margin').classList.replace('text-red-500', 'text-slate-800');
    }

    document.getElementById('exp-salaries').innerText = `₹${expenseData.salaries.toLocaleString('en-IN')}`;
    document.getElementById('exp-rent').innerText = `₹${expenseData.rent.toLocaleString('en-IN')}`;
    document.getElementById('exp-util').innerText = `₹${expenseData.util.toLocaleString('en-IN')}`;
    document.getElementById('exp-total').innerText = `₹${totalExp.toLocaleString('en-IN')}`;

    buildChart(revenueItems);
}

function buildChart(data) {
    const ctx = document.getElementById('financialChart').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    // Mock Aggregation grouping based on period.
    // Time Series grouping algorithm.
    let labels = [];
    let paymentData = [];
    let invoiceData = [];

    if (currentPeriod === 'monthly') {
        // Group by MM-YYYY
        const monthlyGroups = {};
        data.forEach(item => {
            if (!item.date) return;
            const d = new Date(item.date);
            const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
            if (!monthlyGroups[key]) monthlyGroups[key] = { payments: 0, invoices: 0 };

            const amt = parseFloat(item.amount) || 0;
            if (item.status === 'Confirmed' && item.payment_made) monthlyGroups[key].payments += amt;
            if (item.invoice_number) monthlyGroups[key].invoices += amt;
        });

        // Take last 6 months logic (simplified for demonstration)
        labels = Object.keys(monthlyGroups).slice(-6);
        paymentData = labels.map(l => monthlyGroups[l].payments);
        invoiceData = labels.map(l => monthlyGroups[l].invoices);
    } else {
        labels = ['Q1', 'Q2', 'Q3', 'Q4'];
        paymentData = [120000, 150000, 180000, 210000]; // Mock for non-monthly generic views
        invoiceData = [140000, 145000, 190000, 250000];
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Payments Received',
                    data: paymentData,
                    backgroundColor: '#002147',
                    borderRadius: 4
                },
                {
                    label: 'Invoiced Value',
                    data: invoiceData,
                    backgroundColor: '#C5A065',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: { callback: function (val) { return '₹' + (val / 1000) + 'k'; } }
                },
                x: { grid: { display: false } }
            }
        }
    });
}
