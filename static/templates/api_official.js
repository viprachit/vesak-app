// static/templates/api_official.js

const API_BASE_OFFICIAL = "/api";

// Helper to map title to code (Matches numbering.js logic)
function getDocTypeCode(title) {
    const map = {
        'Offer Letter': 'OL',
        'Termination Letter': 'TL',
        'Appointment Letter': 'AP',
        'Notice': 'NT',
        'Certificate': 'CT',
        'Memo': 'MO',
        'Circular': 'CR',
        // Fallback
        'Custom': 'OD'
    };
    return map[title] || 'OD';
}

async function saveOfficialDocument() {
    const docTypeSelect = document.getElementById('docType').value;
    const customDocType = document.getElementById('customDocType').value;

    // Determine effective title
    let typeTitle = docTypeSelect;
    if (docTypeSelect === 'Custom') typeTitle = customDocType || 'Custom';

    // Build payload
    const payload = {
        doc_type: typeTitle,
        doc_type_code: getDocTypeCode(typeTitle),
        date: document.getElementById('docDate').value,
        ref_no: document.getElementById('docRefNo').value,
        location: document.getElementById('docLocation')?.value,
        sub_location: document.getElementById('docSublocation')?.value,

        recipient_name: document.getElementById('docRecipient').value,
        designation: document.getElementById('docDesignation').value,
        company_name: document.getElementById('docCompanyName')?.value,
        mobile: document.getElementById('docMobile').value,
        address: document.getElementById('docAddress').value,

        subject: document.getElementById('docSubject').value,
        document_content: document.getElementById('docContent').value || (typeof quill !== 'undefined' ? quill.root.innerHTML : ''),

        show_to: document.getElementById('showTo')?.checked !== false,
        name_font_size: document.getElementById('nameFontSize')?.value || '1.1rem',
        signature_included: document.getElementById('includeSignature')?.checked !== false,
        show_thank_you: true, // defaulting

        // generated_by: 'Admin' // Backend handles this or defaulting
    };

    // Basic Validation
    if (!payload.doc_type) return alert("Please select a Document Type.");
    if (!payload.recipient_name) return alert("Please enter Recipient Name.");

    const btn = document.getElementById('btnSaveOfficial');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    }

    try {
        const res = await apiFetch(`${API_BASE_OFFICIAL}/documents/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt);
        }

        alert('Document saved successfully!');

        // Reset dirty flag
        if (typeof setFormDirty === 'function') setFormDirty(false);

        // Enable Download Button
        const dlBtn = document.getElementById('btnDownloadOfficial');
        if (dlBtn) {
            dlBtn.disabled = false;
            dlBtn.classList.remove('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
            dlBtn.classList.add('text-white', 'hover:bg-slate-900', 'bg-royal-blue');
            dlBtn.style.background = 'linear-gradient(135deg, #002147 0%, #003d7a 100%)';
        }

    } catch (err) {
        console.error(err);
        alert('Error saving document: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save mr-2"></i>Save';
        }
    }
}

window.saveOfficialDocument = saveOfficialDocument;
