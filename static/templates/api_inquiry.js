// static/templates/api_inquiry.js

/**
 * PHASE 3: Staff Allocation & Data Intelligence
 */

// --- 1. Customer Auto-fill Logic ---
window.autoFillCustomer = async function () {
    const mobile = document.getElementById('in_mob')?.value;
    if (!mobile || mobile.length < 10) return;

    console.log("Searching for previous customer info for:", mobile);
    try {
        const response = await apiFetch(`/api/customers/search?mobile=${mobile}`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const prev = data[0]; // Get most recent
                if (document.getElementById('in_name')) document.getElementById('in_name').value = prev.customer_name || '';
                if (document.getElementById('in_age')) document.getElementById('in_age').value = prev.customer_age || '';
                if (document.getElementById('in_gender')) document.getElementById('in_gender').value = prev.customer_gender || '';
                if (document.getElementById('in_addr')) document.getElementById('in_addr').value = prev.customer_address || '';
                if (document.getElementById('in_location')) document.getElementById('in_location').value = prev.customer_location || '';

                if (window.updatePreview) window.updatePreview();
                console.log("Customer info auto-filled directly.");
            }
        }
    } catch (err) {
        console.warn("Auto-fill search failed:", err);
    }
};

// --- 2. Staff Auto-fill & Directory Logic ---
window.autoFillStaff = async function (triggerField) {
    let query = "";
    if (triggerField === 'aadhar') query = document.getElementById('primaryStaffAadhar')?.value;
    else if (triggerField === 'mobile') query = document.getElementById('primaryStaffMob')?.value;
    else if (triggerField === 'name') query = document.getElementById('primaryStaffName')?.value;

    if (!query || query.length < 5) return;

    try {
        const response = await apiFetch(`/api/staff/search?query=${query}`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const staff = data[0];
                console.log("Staff record found:", staff);

                // Auto-fill (don't alert if it matches exactly, just fill)
                document.getElementById('primaryStaffName').value = staff.name;
                document.getElementById('primaryStaffMob').value = staff.mobile;
                document.getElementById('primaryStaffAadhar').value = staff.aadhar;
                if (document.getElementById('primaryStaffPan')) document.getElementById('primaryStaffPan').value = staff.pan || '';
                document.getElementById('primaryStaffAge').value = staff.age || ''; // if we add age to staff table
                document.getElementById('primaryStaffAddress').value = staff.address || '';
            }
        }
    } catch (err) {
        console.warn("Staff search failed:", err);
    }
};

async function saveStaffToDirectory() {
    const payload = {
        name: document.getElementById('primaryStaffName')?.value,
        mobile: document.getElementById('primaryStaffMob')?.value,
        aadhar: document.getElementById('primaryStaffAadhar')?.value,
        pan: document.getElementById('primaryStaffPan')?.value,
        address: document.getElementById('primaryStaffAddress')?.value,
        role: document.getElementById('careType')?.value || 'Staff'
    };

    if (!payload.name || !payload.aadhar) return;

    try {
        await apiFetch('/api/staff/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        console.log("Staff directory updated.");
    } catch (err) {
        console.error("Staff save failed:", err);
    }
}

// --- 3. Save Inquiry Record ---
window.saveInquiryRecord = async function () {
    console.log("Saving Inquiry Record...");
    const getVal = (id) => document.getElementById(id)?.value || '';
    const getChecked = (id) => document.getElementById(id)?.checked || false;

    // Capture dynamically added staff from the extra container into JSON array
    const extraStaffBlocks = document.querySelectorAll('#extraStaffContainer > div');
    const staffArray = [];

    // Auto-capture the primary staff first to keep the array fully inclusive if present
    if (getVal('primaryStaffName')) {
        staffArray.push({
            name: getVal('primaryStaffName'),
            pan: getVal('primaryStaffPan'),
            note: getVal('primaryStaffNote'),
            address: getVal('primaryStaffAddress'),
            payment: parseFloat(getVal('primaryStaffPayment')) || 0,
            mobile: getVal('primaryStaffMobile'),
            is_primary: true
        });
    }

    extraStaffBlocks.forEach(block => {
        // The block ID typically contains a prefix like `nurse_extra_1_container`
        // We can find all inputs within this block
        const nInput = block.querySelector('input[placeholder="Full Name"]');
        const pInput = block.querySelector('input[placeholder="PAN Number"]');
        const ntInput = block.querySelector('input[placeholder="Special instructions / notes"]');
        const addrInput = block.querySelector('textarea[placeholder="Staff Address"]');
        const payInput = block.querySelector('input[placeholder="Payment Amount"]');

        if (nInput && nInput.value) {
            staffArray.push({
                name: nInput.value,
                pan: pInput ? pInput.value : '',
                note: ntInput ? ntInput.value : '',
                address: addrInput ? addrInput.value : '',
                payment: payInput ? (parseFloat(payInput.value) || 0) : 0,
                is_primary: false
            });
        }
    });

    const payload = {
        invoice_number: getVal('in_invoice_no'),
        date: getVal('in_date'),
        customer_name: getVal('in_name'),
        customer_mobile: getVal('in_mob'),
        customer_age: parseInt(getVal('in_age')) || 0,
        customer_gender: getVal('in_gender'),
        customer_address: getVal('in_addr'),
        customer_location: getVal('in_location'),
        location: getVal('in_location'),
        sub_location: getVal('in_sublocation'),
        plan: getVal('planSelect'),
        service: getVal('careType'),
        shift: getVal('in_shift'),
        period: getVal('in_period'),
        visits: parseInt(getVal('paid_for_qty')) || 0,
        amount: parseFloat(getVal('rate_agreed')) || 0,
        interest_level: getVal('interestLevel'),
        engagement_status: getVal('engagementStatus'),
        source: getVal('source'),
        engagement_notes: getVal('in_notes'),
        payment_made: getChecked('paymentMade'),

        // Referral Details (Phase 3)
        referral_name: getVal('referralName'),
        referral_code: getVal('referralCode'),
        referral_credit: parseFloat(getVal('referralCredit')) || 0,

        nurse_name: getVal('primaryStaffName'),
        nurse_pan: getVal('primaryStaffPan'),
        nurse_note: getVal('primaryStaffNote'),
        nurse_address: getVal('primaryStaffAddress'),
        nurse_payment: parseFloat(getVal('primaryStaffPayment')) || 0,

        // Legacy mapping first extra staff member data to explicit columns (for backwards compat)
        nurse_name_extra: getVal('caregiver_extra_1_name') || getVal('nurse_extra_1_name') || getVal('physiotherapist_extra_1_name') || getVal('attendant_extra_1_name'),
        nurse_pan_extra: getVal('caregiver_extra_1_pan') || getVal('nurse_extra_1_pan') || getVal('physiotherapist_extra_1_pan') || getVal('attendant_extra_1_pan'),
        nurse_note_extra: getVal('caregiver_extra_1_note') || getVal('nurse_extra_1_note') || getVal('physiotherapist_extra_1_note') || getVal('attendant_extra_1_note'),
        nurse_address_extra: getVal('caregiver_extra_1_address') || getVal('nurse_extra_1_address') || getVal('physiotherapist_extra_1_address') || getVal('attendant_extra_1_address'),
        nurse_payment_extra: parseFloat(getVal('caregiver_extra_1_payment') || getVal('nurse_extra_1_payment') || getVal('physiotherapist_extra_1_payment') || getVal('attendant_extra_1_payment')) || 0,

        staff_allocation: staffArray, // Inject the dynamically constructed payload block here
        is_recurring: getVal('in_recurring') === 'Yes',

        shift_status: getVal('shiftStatus') || 'Pending',
        service_status: deriveServiceStatus()
    };

    const editingId = document.getElementById('editing_id')?.value;
    const url = editingId ? `/api/invoices/${editingId}` : '/api/invoices/';
    const method = editingId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const returnedData = await response.json();

            if (editingId) {
                alert("Inquiry Record Updated Successfully!");
            } else {
                alert("Inquiry Record Saved Successfully!");
            }

            // Auto-populate the Invoice Number if the backend generated it during this request
            const returnedInvoiceNo = Array.isArray(returnedData) && returnedData.length > 0 ? returnedData[0]?.invoice_number : returnedData?.invoice_number;

            if (returnedInvoiceNo) {
                const invInput = document.getElementById('in_invoice_no');
                if (invInput) {
                    invInput.value = returnedInvoiceNo;
                }
            }

            // Disable Dirty Flag
            if (window.setFormDirty) window.setFormDirty(false);

            // Enable Download Button
            const dlBtn = document.getElementById('btnDownloadInquiry');
            if (dlBtn) {
                dlBtn.disabled = false;
                dlBtn.classList.remove('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
                dlBtn.classList.add('bg-royal-gold', 'text-white', 'hover:bg-yellow-600');
                dlBtn.style.background = 'linear-gradient(135deg, #C5A065 0%, #D4AF37 100%)';
            }

            // Also update Staff Directory
            await saveStaffToDirectory();

            if (window.refreshDashboard) window.refreshDashboard();
        } else {
            console.error("Save failed");
            const errData = await response.json();
            alert("Save Failed: " + (errData.detail || "Unknown error"));
        }
    } catch (err) {
        console.error("API Error:", err);
        alert("Network Error: " + err.message);
    }
};

// Listen for changes to set dirty flag
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('masterInquiryForm');
    if (form) {
        form.addEventListener('input', () => {
            if (window.setFormDirty) window.setFormDirty(true);

            // Disable download button if form becomes dirty again
            const dlBtn = document.getElementById('btnDownloadInquiry');
            if (dlBtn && !dlBtn.disabled) {
                dlBtn.disabled = true;
                dlBtn.classList.add('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
                dlBtn.classList.remove('bg-royal-gold', 'text-white', 'hover:bg-yellow-600');
                dlBtn.style.background = '';
            }
        });
    }
});

window.downloadCurrentInquiry = function () {
    // Delegates to the existing document generation logic
    if (window.downloadAndSaveInvoice) {
        window.downloadAndSaveInvoice('inquiry');
    } else {
        alert("Download function not found. (Check download.js)");
    }
};

// --- 4. Form Mode Logic ---
window.setInquiryFormMode = function (mode) {
    const inputs = document.querySelectorAll('#masterInquiryForm input, #masterInquiryForm select, #masterInquiryForm textarea');
    const staffSection = document.getElementById('staffSection');
    const staffInputs = staffSection.querySelectorAll('input, select, textarea');
    const financialSection = document.getElementById('financialSection'); // Assuming there is a wrapper for Section 5

    // RESET completely first
    inputs.forEach(el => {
        el.disabled = false;
        el.classList.remove('pointer-events-none', 'bg-gray-50');
    });
    staffSection.classList.add('hidden');
    staffSection.classList.add('opacity-60', 'pointer-events-none', 'filter', 'grayscale');

    if (mode === 'allocate') {
        // Legacy Mode
        inputs.forEach(el => {
            if (!staffSection.contains(el)) el.disabled = true;
        });
        staffSection.classList.remove('hidden', 'opacity-60', 'pointer-events-none', 'filter', 'grayscale');
        staffInputs.forEach(el => el.disabled = false);

        const saveBtn = document.getElementById('btnSaveInquiry');
        if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Complete Allocation';

    } else if (mode === 'payment_mode') {
        // Sections 1-4 Locked, Financials semi-locked, Staff hidden
        inputs.forEach(el => {
            if (el.id !== 'paymentMade' && el.id !== 'shiftStatus') {
                el.classList.add('pointer-events-none', 'bg-gray-50');
                // We use readonly/pointer-events instead of disabled so values still submit
            }
        });

        const saveBtn = document.getElementById('btnSaveInquiry');
        if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-wallet"></i> Confirm Payment';

    } else if (mode === 'add_staff') {
        // Sections 1-6 locked entirely. Only the "+ Additional Staff" button works.
        inputs.forEach(el => {
            el.classList.add('pointer-events-none', 'bg-gray-50');
        });
        staffSection.classList.remove('hidden', 'opacity-60', 'pointer-events-none', 'filter', 'grayscale');

        // Ensure the container for extra staff is not locked out from events entirely
        const extraContainer = document.getElementById('extraStaffContainer');
        if (extraContainer) {
            extraContainer.classList.remove('pointer-events-none');
        }

        const addBtn = document.getElementById('btnAddExtraStaff');
        if (addBtn) {
            addBtn.classList.remove('pointer-events-none');
            addBtn.disabled = false;
        }

        const saveBtn = document.getElementById('btnSaveInquiry');
        if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-users"></i> Save Additional Staff';
    }
};

function deriveServiceStatus() {
    const status = document.getElementById('engagementStatus')?.value;
    const payment = document.getElementById('paymentMade')?.checked;
    const staffName = document.getElementById('primaryStaffName')?.value;

    if (payment) {
        if (staffName) return 'Active';
        return 'Payment Made';
    }
    if (status === 'Confirmed') return 'Confirmed';
    if (status === 'Not Interested') return 'Not Interested';
    return 'Pending';
}

// --- 5. Rate Management (Phase 5) ---
window.fetchServiceRate = async function () {
    // Gather inputs
    const loc = document.getElementById('in_location')?.value;
    const plan = document.getElementById('planSelect')?.value;
    const shift = document.getElementById('in_shift')?.value;
    const service = document.getElementById('careType')?.value; // Auto-derived

    if (!loc || !plan || !shift) return;

    // Handle "Select Plan..." or empty state
    if (plan === "" || plan.includes("Select")) return;

    console.log("Fetching rate for:", loc, plan, shift);

    // Determine effective plan for lookup
    // If Plan is AlaCarte, we might want to check sub-service if set
    // For now, adhere to Plan Type = AlaCarte in Rates DB
    let lookupPlan = plan;

    try {
        const subLoc = document.getElementById('in_sublocation')?.value || '';
        const params = new URLSearchParams({
            location: loc,
            service: service || '',
            plan: lookupPlan,
            shift: shift
        });
        if (subLoc) params.set('sub_location', subLoc);

        const res = await fetch(`/api/rates/lookup?${params.toString()}`);
        if (res.ok) {
            const data = await res.json();
            // Expected data: { min_rate: 1000, max_rate: 1200, ... }

            if (data && data.min_rate) {
                const minEl = document.getElementById('min_rate');
                const maxEl = document.getElementById('max_rate');

                if (minEl) {
                    minEl.value = data.min_rate;
                    // Flash effect
                    minEl.classList.add('bg-green-100');
                    setTimeout(() => minEl.classList.remove('bg-green-100'), 500);
                }
                if (maxEl) {
                    maxEl.value = data.max_rate;
                    maxEl.classList.add('bg-green-100');
                    setTimeout(() => maxEl.classList.remove('bg-green-100'), 500);
                }
                console.log("Rates auto-filled:", data.min_rate, data.max_rate);
            } else {
                console.log("No rate found for this combination.");
            }
        }
    } catch (err) {
        console.error("Rate fetch failed:", err);
    }
};

// --- 6. Edit Logic (Phase 11) ---
window.loadInquiryToForm = async function (id) {
    if (!id) return;
    console.log("Loading inquiry for editing:", id);

    try {
        const res = await apiFetch(`/api/invoices/${id}`);
        if (!res.ok) throw new Error("Failed to fetch record");

        const data = await res.json();
        console.log("Record data:", data);

        // Map values to form
        const setVal = (fieldId, val) => {
            const el = document.getElementById(fieldId);
            if (el) el.value = val || '';
        };

        setVal('in_invoice_no', data.invoice_number);
        setVal('in_date', data.date);
        setVal('in_name', data.customer_name);
        setVal('in_mob', data.customer_mobile);
        setVal('in_age', data.customer_age);
        setVal('in_gender', data.customer_gender);
        setVal('in_addr', data.customer_address);
        setVal('in_location', data.customer_location);
        if (window.updateSubLocations) window.updateSubLocations();
        setVal('in_sublocation', data.sub_location);
        setVal('planSelect', data.plan);
        setVal('careType', data.service);
        setVal('in_shift', data.shift);
        setVal('in_period', data.period);
        setVal('paid_for_qty', data.visits);
        setVal('rate_agreed', data.amount);
        setVal('interestLevel', data.interest_level);
        setVal('engagementStatus', data.engagement_status);
        setVal('source', data.source);
        setVal('in_notes', data.engagement_notes);

        const pmCheck = document.getElementById('paymentMade');
        if (pmCheck) pmCheck.checked = !!data.payment_made;

        setVal('referralName', data.referral_name);
        setVal('referralCode', data.referral_code);
        setVal('referralCredit', data.referral_credit);

        setVal('primaryStaffName', data.nurse_name);
        setVal('primaryStaffPan', data.nurse_pan);
        setVal('primaryStaffNote', data.nurse_note);
        setVal('primaryStaffAddress', data.nurse_address);
        setVal('primaryStaffPayment', data.nurse_payment);

        // Load first extra staff back if present
        if (data.nurse_name_extra && window.addExtraStaff) {
            // This is tricky because we need to trigger the UI to add the block first
            // For now, we manually force add one extra staff block if data exists
            if (document.getElementById('extraStaffContainer').innerHTML === '') {
                window.addExtraStaff();
                const type = (window.staffState.type || 'nurse').toLowerCase();
                const baseId = type + "_extra_1";
                setVal(baseId + '_name', data.nurse_name_extra);
                setVal(baseId + '_pan', data.nurse_pan_extra);
                setVal(baseId + '_note', data.nurse_note_extra);
                setVal(baseId + '_address', data.nurse_address_extra);
                setVal(baseId + '_payment', data.nurse_payment_extra);
            }
        }

        const recVal = data.is_recurring ? 'Yes' : 'No';
        if (document.getElementById('in_recurring')) document.getElementById('in_recurring').value = recVal;

        // Store Editing ID
        if (document.getElementById('editing_id')) document.getElementById('editing_id').value = id;

        // Update form state
        document.getElementById('formStatusBadge').innerText = "Status: Editing Record";
        document.getElementById('btnSaveInquiry').innerHTML = '<i class="fa-solid fa-save"></i> Update Record';

        // Switch Tab
        if (window.navigateTo) window.navigateTo('inquiry');

        // Refresh Preview
        if (window.updatePreview) window.updatePreview();
        if (window.updateFormVisibility) window.updateFormVisibility();

    } catch (err) {
        console.error("Load failed:", err);
        alert("Failed to load record for editing.");
    }
};

window.resetInquiryForm = function () {
    const form = document.getElementById('masterInquiryForm');
    if (form) form.reset();

    document.getElementById('formStatusBadge').innerText = "Status: New Inquiry";
    document.getElementById('btnSaveInquiry').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Inquiry';

    // Clear auto-gen fields & hidden ID
    if (document.getElementById('editing_id')) document.getElementById('editing_id').value = "";
    document.getElementById('in_invoice_no').value = "";

    if (window.updatePreview) window.updatePreview();
    if (window.updateFormVisibility) window.updateFormVisibility();
};

// Fetch dynamic locations for dropdowns
window.loadAppLocations = function () {
    return apiFetch('/api/locations')
        .then(res => res.json())
        .then(locs => {
            if (!Array.isArray(locs)) return;
            window.appLocations = locs;
            const optionsHtml = locs.map(l => `<option value="${l.name}">${l.name}</option>`).join('');

            // Inquiry Form
            const inLoc = document.getElementById('in_location');
            if (inLoc) {
                inLoc.innerHTML = '<option value="">City</option>' + optionsHtml;
                if (window.updateSubLocations) window.updateSubLocations();
            }

            // Official Docs Form
            const docLoc = document.getElementById('docLocation');
            if (docLoc) {
                docLoc.innerHTML = '<option value="">Select City...</option>' + optionsHtml;
                if (window.updateDocSubLocations) window.updateDocSubLocations();
            }
        })
        .catch(err => console.error("Failed to load locations:", err));
};

// Initialize Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Attach to primary fields
    const rateTriggers = ['in_location', 'in_sublocation', 'planSelect', 'in_shift', 'in_period'];
    rateTriggers.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', window.fetchServiceRate);
        }
    });

    // Initial load
    window.loadAppLocations();
});

window.updateSubLocations = function () {
    const locName = document.getElementById('in_location')?.value;
    const subSelect = document.getElementById('in_sublocation');
    if (!subSelect) return;

    subSelect.innerHTML = '<option value="">Zone</option>';
    if (!locName || !window.appLocations) return;

    const locData = window.appLocations.find(l => l.name === locName);
    if (locData && locData.sub_locations && locData.sub_locations.length > 0) {
        locData.sub_locations.forEach(sub => {
            subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
        });
    }
};

window.updateDocSubLocations = function () {
    const locName = document.getElementById('docLocation')?.value;
    const subSelect = document.getElementById('docSublocation');
    if (!subSelect) return;

    subSelect.innerHTML = '<option value="">Zone (Blank)</option>';
    if (!locName || !window.appLocations) return;

    const locData = window.appLocations.find(l => l.name === locName);
    if (locData && locData.sub_locations && locData.sub_locations.length > 0) {
        locData.sub_locations.forEach(sub => {
            subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
        });
    }
};

window.enforceRecurringLogic = function () {
    const isRecurring = document.getElementById('in_recurring')?.value === 'Yes';
    const shiftType = document.getElementById('in_shift')?.value;
    const periodSelect = document.getElementById('in_period');
    if (!periodSelect) return;

    // Remember current selection
    const currentVal = periodSelect.value;

    // Rebuild options based on logic provided
    periodSelect.innerHTML = '';

    if (isRecurring) {
        // As per requirement: "If Shift Type -> then Recurring If Yes -> then Only Monthly option should shown"
        periodSelect.innerHTML = '<option value="Monthly">Monthly</option>';
        periodSelect.value = 'Monthly';
    } else {
        // As per requirement: "If Recurring is No then All options (Daily, Weekly, Monthly) should be shown"
        periodSelect.innerHTML = `
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
        `;

        // Restore previous value if valid for "No" state (it always will be)
        if (Array.from(periodSelect.options).some(o => o.value === currentVal)) {
            periodSelect.value = currentVal;
        } else {
            periodSelect.value = 'Daily'; // Default for No
        }
    }
};
