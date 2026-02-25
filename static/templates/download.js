// ============================================================================
// PDF GENERATION & DOWNLOAD
// Uses html2pdf.js (Client-Side)
// ============================================================================

async function generateVesakPDF(sourceElement, fileName) {
    if (!sourceElement) return alert("Error: Content not found.");

    // 1. Clone the element
    const cloned = sourceElement.cloneNode(true);

    // 2. Container setup (Invisible, fixed position)
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.zIndex = '-9999';
    document.body.appendChild(container);

    // 3. Wrapper setup (The target for html2pdf)
    const wrapper = document.createElement('div');
    wrapper.style.width = '210mm';
    wrapper.style.margin = '0';
    wrapper.style.padding = '0';
    wrapper.style.boxSizing = 'border-box';
    container.appendChild(wrapper);

    wrapper.appendChild(cloned);

    // 4. Apply overrides to the invoice content
    // Reduced min-height to 296mm (1mm buffer) to prevent 2nd page overflow
    cloned.style.cssText = `
        width: 210mm !important;
        height: auto !important;
        min-height: 296mm !important; 
        margin: 0 !important;
        padding: 35px 45px !important;
        box-sizing: border-box !important;
        background: white !important;
        transform: none !important;
        box-shadow: none !important;
        overflow: visible !important;
    `;

    // Input value fixation
    cloned.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.tagName === 'TEXTAREA') el.innerHTML = el.value;
        if (el.tagName === 'INPUT') el.setAttribute('value', el.value);
        if (el.tagName === 'SELECT') {
            const selected = el.options[el.selectedIndex];
            if (selected) selected.setAttribute('selected', 'selected');
        }
    });

    // 5. Fix SVGs
    const svgElements = cloned.querySelectorAll('svg');
    const svgPromises = Array.from(svgElements).map(svg => {
        return new Promise(resolve => {
            try {
                const s = new XMLSerializer().serializeToString(svg);
                const img = new Image();
                img.src = `data:image/svg+xml;base64,${btoa(s)}`;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = svg.getBoundingClientRect().width || 100;
                    canvas.height = svg.getBoundingClientRect().height || 100;
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    if (svg.parentNode) svg.parentNode.replaceChild(canvas, svg);
                    resolve();
                };
                img.onerror = resolve;
            } catch (e) { resolve(); }
        });
    });
    await Promise.all(svgPromises);

    // 6. PDF Configuration
    const opt = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            scrollX: 0,
            scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    // 7. Generate with Page Numbers
    html2pdf().from(wrapper).set(opt).toPdf().get('pdf').then((pdf) => {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150); // Gray color
            // Center align text at the bottom
            pdf.text(`Page ${i} of ${totalPages}`, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 5, { align: 'center' });
        }
    }).save().finally(() => {
        document.body.removeChild(container);
    });
}


window.downloadPDF = function (elementId) {
    const element = document.getElementById(elementId);
    if (!element) return alert('Element not found');

    const opt = {
        margin: 10,
        filename: `${elementId}-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

window.downloadAndSaveInvoice = function () {
    // Refresh preview to get latest data
    if (typeof updatePreview === 'function') updatePreview();

    const element = document.querySelector('#letterhead-live .invoice-page');
    if (!element) return alert('Preview not ready. Please fill in the form first.');

    const name = document.getElementById('in_name')?.value || 'Client';
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `Vesak_Invoice_${name.replace(/\s+/g, '_')}_${date}.pdf`;

    generateVesakPDF(element, fileName);
}

window.downloadOfficialDoc = function () {
    // Refresh preview to get latest data
    if (typeof updateOfficialPreview === 'function') updateOfficialPreview();

    const element = document.querySelector('#official-letterhead-live .invoice-page');
    if (!element) return alert('Document preview not ready. Please fill in the form first.');

    const docType = document.getElementById('docType')?.value || 'Document';
    const docRefNo = document.getElementById('docRefNo')?.value || '';
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `${docType.replace(/\s+/g, '_')}_${docRefNo}_${date}.pdf`;

    generateVesakPDF(element, fileName);
}

// Helper Functions needed for filename generation
function slugify(text) {
    if (!text) return "UNKNOWN-CUSTOMER";
    return text.toString().trim().toUpperCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function getGeneratedFileName(docType) {
    const invNo = document.getElementById('in_invoice_no').value || 'DRAFT';
    const name = document.getElementById('in_name').value || 'Client';
    const slug = slugify(name);

    let prefix = 'DOC';
    if (docType === 'invoice') prefix = 'IN';
    else if (docType === 'nurseagreement') prefix = 'NU';
    else if (docType === 'patientagreement') prefix = 'PA';
    else if (docType === 'warning') prefix = 'WL';

    return `${prefix}-${invNo}-${slug}.pdf`;
}
