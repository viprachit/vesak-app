// static/api.js
const API_BASE = "/api"; // server mounts routers under /api

async function saveInquiryAsInvoice() {
    // Build payload from form fields (expand as needed)
    const payload = {
        ref_no: document.querySelector('#masterInquiryForm input[placeholder="REF-XXXX"]')?.value || null,
        invoice_number: document.getElementById('in_invoice_no')?.value || null,
        date: document.getElementById('in_date')?.value || null,
        generated_at: new Date().toISOString(),
        customer_name: document.getElementById('in_name')?.value || null,
        customer_age: parseInt(document.getElementById('in_age')?.value || '') || null,
        customer_gender: document.getElementById('in_gender')?.value || null,
        customer_location: document.getElementById('in_location')?.value || null,
        customer_address: document.getElementById('in_addr')?.value || null,
        customer_mobile: document.getElementById('in_mob')?.value || null,
        plan: document.getElementById('planSelect')?.value || null,
        service: document.getElementById('subServiceSelect')?.value || null,
        shift: document.getElementById('in_shift')?.value || null,
        recurring_service: document.getElementById('in_recurring')?.value || null,
        period: document.getElementById('in_period')?.value || null,
        visits: parseInt(document.getElementById('paid_for_qty')?.value || '') || null,
        amount: parseFloat(document.getElementById('rate_agreed')?.value || '') || null,
        notes: document.getElementById('in_notes')?.value || null,
        generated_by: 'Admin', // placeholder; later replace with real user
        amount_paid: 0,
        nurse_name: document.querySelector('input[placeholder="Full Name"]')?.value || null,
        nurse_note: document.getElementById('in_notes')?.value || null,
        staff_data: {},  // fill complex staff data later if needed
    };

    try {
        const res = await fetch(`${API_BASE}/invoices/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const txt = await res.text();
            alert('Save failed: ' + txt);
            return null;
        }
        const data = await res.json();
        // supabase client returns array of inserted rows in data[0] sometimes
        const saved = Array.isArray(data) ? data[0] : data;
        alert('Saved invoice id: ' + (saved?.id || JSON.stringify(saved)));
        return saved;
    } catch (err) {
        alert('Network error: ' + err.message);
        return null;
    }
}

async function loadInvoiceToForm(invoiceId) {
    try {
        const res = await fetch(`${API_BASE}/invoices/${invoiceId}`);
        if (!res.ok) {
            alert('Failed to load invoice: ' + res.statusText);
            return;
        }
        const inv = await res.json();
        // map fields into form
        document.getElementById('in_invoice_no').value = inv.invoice_number || '';
        document.getElementById('in_date').value = inv.date || '';
        document.getElementById('in_name').value = inv.customer_name || '';
        document.getElementById('in_mob').value = inv.customer_mobile || '';
        document.getElementById('in_age').value = inv.customer_age || '';
        document.getElementById('in_gender').value = inv.customer_gender || '';
        document.getElementById('in_addr').value = inv.customer_address || '';
        document.getElementById('in_location').value = inv.customer_location || '';
        document.getElementById('planSelect').value = inv.plan || '';
        document.getElementById('subServiceSelect').value = inv.service || '';
        document.getElementById('in_shift').value = inv.shift || '';
        document.getElementById('in_period').value = inv.period || '';
        document.getElementById('in_recurring').value = inv.recurring_service || '';
        document.getElementById('paid_for_qty').value = inv.visits || '';
        document.getElementById('rate_agreed').value = inv.amount || '';
        document.getElementById('in_notes').value = inv.notes || '';

        // If staff_data exists, map it (example)
        if (inv.staff_data) {
            // populate as needed
            // document.getElementById('primaryStaffName').value = inv.staff_data.primary_name || '';
        }

        // If you have preview/total calc functions, call them:
        if (typeof updatePreview === 'function') updatePreview();
        if (typeof calcTotal === 'function') calcTotal();

        alert('Invoice loaded into form.');
    } catch (err) {
        alert('Network error: ' + err.message);
    }
}

window.saveInquiryAsInvoice = saveInquiryAsInvoice;
window.loadInvoiceToForm = loadInvoiceToForm;
