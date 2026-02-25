// ============================================================================
// OFFICIAL DOCUMENTS TEMPLATE
// ============================================================================

function buildOfficialDocBody(data) {
    // Signature Block Logic
    let signatureBlock = '';

    if (data.includeSignature) {
        if (data.signatureImage) {
            signatureBlock = `<div style="margin-top:16px;" class="page-break-inside-avoid">`
                + `<p style="margin:0 0 8px 0; font-size:0.875rem; color:#374151; font-style:italic;">Sincerely,</p>`
                + `<div style="margin:8px 0;"><img src="${data.signatureImage}" style="height:60px; width:auto; object-fit:contain;" alt="Signature"></div>`
                + `<p style="margin:0; font-size:0.75rem; color:#4B5563; font-weight:700;">Authorized Signatory</p>`
                + `<p style="margin:0; font-size:0.75rem; color:#4B5563;">Vesak Care Foundation</p>`
                + `</div>`;
        } else {
            signatureBlock = `<div style="margin-top:16px;" class="page-break-inside-avoid">`
                + `<p style="margin:0 0 24px 0; font-size:0.875rem; color:#374151; font-style:italic;">Sincerely,</p>`
                + `<div class="border-t border-gray-400 w-48"></div>`
                + `<p style="margin:8px 0 0 0; font-size:0.75rem; color:#4B5563; font-weight:700;">Authorized Signatory</p>`
                + `<p style="margin:0; font-size:0.75rem; color:#4B5563;">Vesak Care Foundation</p>`
                + `</div>`;
        }
    }

    // Config
    const sp = '<div style="height:12px;"></div>';
    const nameFontSize = data.nameFontSize || '1.1rem';
    const subjectFontSize = data.subjectFontSize || '0.875rem';
    const ls = data.lineSpacing || '4px';

    // Document Type (centered + underlined) inside fixed-height container
    const docTypeContent = data.showDocType !== false
        ? `<h2 style="margin:0; font-size:1rem; font-weight:600; color:#1a1a2e; display:inline-block; border-bottom:2px solid #1a1a2e; padding-bottom:3px; letter-spacing:0.08em; text-transform:uppercase;">${escapeHtml(data.type)}</h2>`
        : '';

    // Fixed height container (approx 40px) to prevent layout shift when toggling doc type
    const docTypeBlock = `<div style="text-align:center; margin:0; min-height:40px; display:flex; align-items:flex-end; justify-content:center;">${docTypeContent}</div>`;

    // Location line (to be inserted below address)
    let locationLine = '';
    if (data.showDocLocation && data.docLocation) {
        locationLine += `<p style="margin:0; color:#4B5563;">${escapeHtml(data.docLocation)}</p>`;
    }
    if (data.showDocSubLocation && data.sub_location) {
        locationLine += `<p style="margin:0; color:#4B5563; font-size:0.8rem;">${escapeHtml(data.sub_location)}</p>`;
    }

    // Addressee block
    const addresseeBlock = data.recipient
        ? `<div style="margin:0; font-size:14px; color:#374151; line-height:1.5;">`
        + (data.showTo !== false ? `<p style="margin:0 0 ${ls} 0; font-weight:600; color:#1a1a2e; text-transform:uppercase; font-size:0.75rem; letter-spacing:0.06em;">To,</p>` + sp : '')
        + `<p style="margin:0 0 ${ls} 0; font-weight:700; color:#1a1a2e; font-size:${nameFontSize};">${escapeHtml(data.recipient)}</p>`
        + (data.designation ? `<p style="margin:0 0 ${ls} 0; color:#4B5563; font-weight:400;">${escapeHtml(data.designation)}</p>` : '')
        + (data.companyName ? `<p style="margin:0 0 ${ls} 0; color:#4B5563; font-weight:700;">${escapeHtml(data.companyName)}</p>` : '')
        + (data.address ? `<p style="margin:0 0 ${ls} 0; color:#4B5563; white-space:pre-line;" class="wrap-text">${escapeHtml(data.address)}</p>` : '')
        + locationLine
        + (data.mobile ? `<p style="margin:${ls} 0 0 0; color:#4B5563;"><span style="font-size:10px; text-transform:uppercase; color:#9CA3AF; margin-right:4px; letter-spacing:0.05em;">Mob:</span>${escapeHtml(data.mobile)}</p>` : '')
        + `</div>`
        : '';

    // Subject block
    const subjectBlock = data.subject
        ? `<div style="margin:0; text-align:center;"><h3 style="margin:0; font-size:${subjectFontSize}; font-weight:700; color:#1a1a2e; line-height:1.4;"><span style="border-bottom:1.5px solid #1a1a2e; padding-bottom:2px;"><span style="text-transform:uppercase; margin-right:4px; letter-spacing:0.04em;">Sub:</span> ${escapeHtml(data.subject)}</span></h3></div>`
        : '';

    // Body content
    const bodyBlock = `<div class="text-sm text-gray-700 leading-relaxed text-justify wrap-text ql-editor" style="padding:0; overflow:visible; font-size:14px; line-height:1.7;">${data.content}</div>`;

    // Build layout
    const inner = (docTypeBlock ? docTypeBlock + sp + sp : '')
        + addresseeBlock
        + sp + sp
        + subjectBlock
        + sp + sp
        + bodyBlock
        + sp + sp + sp
        + signatureBlock;

    return `<div style="font-family:'Source Serif 4','Georgia',serif; color:#1a1a2e;">${inner}</div>`;
}
