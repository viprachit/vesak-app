// ============================================================================
// SHARED UTILITIES & LAYOUT
// ============================================================================

// --- Helper Functions & API Wrappers ---

/**
 * Global API Fetch Wrapper
 * Automatically attaches the Supabase JWT Bearer token if available in sessionStorage.
 */
window.apiFetch = async function (url, options = {}) {
    const token = sessionStorage.getItem('accessToken');

    // Ensure headers object exists
    if (!options.headers) {
        options.headers = {};
    }

    // Add default JSON content type if missing and body exists
    if (options.body && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }

    // Attach Bearer Token
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, options);
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildBulletList(items) {
    if (!items || !items.length) return "";
    return items.map(text =>
        `<li class="mb-0.5 text-xs text-gray-600 leading-snug">• ${escapeHtml(text)}</li>`
    ).join("");
}

// --- Letterhead Shell (Header & Footer) ---

function buildLetterheadShell(data, bodyHtml) {
    const locStr = [data.sublocation, data.location].filter(Boolean).join(', ');
    const fullAddr = locStr ? `${data.address}\n${locStr}` : data.address;

    const logoSvg = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%">
    <path d="M30 5 H70 L95 30 V70 L70 95 H30 L5 70 V30 L30 5Z" stroke="#002147" stroke-width="3" fill="none"/>
    <path d="M50 15 V35" stroke="#C5A065" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M50 65 V85" stroke="#C5A065" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M15 50 H35" stroke="#C5A065" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M65 50 H85" stroke="#C5A065" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M25 25 L40 40" stroke="#C5A065" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M60 60 L75 75" stroke="#C5A065" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M75 25 L60 40" stroke="#C5A065" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 60 L25 75" stroke="#C5A065" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="8" fill="#CC4E00"/>
</svg>`;

    let clientSectionHtml = '';
    const isInvoice = (typeof activeDocType !== 'undefined' && activeDocType === 'invoice');

    if (isInvoice) {
        clientSectionHtml = `
    <div class="client-details-box">
        <div>
            <div class="text-xs font-bold uppercase mb-1" style="color:#C5A065">Billed To</div>
            <div class="text-base font-bold" style="color:#002147">${escapeHtml(data.name)}</div>
            <div class="flex gap-4 mt-2 text-xs text-gray-600">
                <div class="flex items-center gap-1"><i class="fas fa-user" style="color:#C5A065"></i> ${data.gender}</div>
                <div class="flex items-center gap-1"><i class="fas fa-birthday-cake" style="color:#C5A065"></i> ${data.age} Yrs</div>
            </div>
        </div>
        <div class="flex flex-col justify-center">
            <div class="flex items-center gap-2 text-xs text-gray-600 mb-2">
                <i class="fas fa-phone-alt" style="color:#C5A065"></i> ${data.mobile}
            </div>
            <div class="flex items-start gap-2 text-xs text-gray-600">
                <i class="fas fa-map-marker-alt mt-0.5" style="color:#C5A065"></i>
                <span class="leading-tight whitespace-pre-wrap">${fullAddr}</span>
            </div>
        </div>
    </div>`;
    }

    return `
<div class="invoice-page">
    <!-- Center Watermark -->
    <div class="watermark-container">
        <div style="width:300px; height:300px; opacity:0.04; margin:0 auto">${logoSvg}</div>
        <div class="watermark-text mt-4">VESAK</div>
    </div>

    <header>
        <div class="flex justify-between items-end pb-4">
            <div class="flex items-center gap-4">
                <div class="w-16 h-16">${logoSvg}</div>
                <div>
                    <h1 class="font-serif-invoice text-2xl font-bold tracking-wide leading-none mb-1" style="color:#002147">
                        Vesak Care <span style="font-weight:400; color:#C5A065">Foundation</span>
                    </h1>
                    <div class="flex flex-col text-xs text-gray-500 font-light tracking-wide space-y-0.5 font-sans-invoice">
                        <span><span class="font-bold uppercase w-12 inline-block" style="color:#C5A065">Web</span> vesakcare.com</span>
                        <span><span class="font-bold uppercase w-12 inline-block" style="color:#C5A065">Email</span> vesakcare@gmail.com</span>
                        <span><span class="font-bold uppercase w-12 inline-block" style="color:#C5A065">Phone</span> +91 7777 000 878</span>
                    </div>
                </div>
            </div>
            <div class="text-right">
                <h2 class="font-serif-invoice text-3xl text-gray-200 tracking-widest mb-2">${data.type}</h2>
                <div class="text-xs text-gray-600 font-sans-invoice">
                    <p><span class="text-gray-400 uppercase tracking-wider text-[10px] mr-2">Date:</span> <b>${data.date}</b></p>
                    <p><span class="text-gray-400 uppercase tracking-wider text-[10px] mr-2">${(typeof data.inv !== 'undefined') ? 'Invoice No:' : 'Ref No:'}</span> <b>${data.refNo || data.inv || '---'}</b></p>
                </div>
            </div>
        </div>
        <div class="w-full h-px mb-4" style="background-color: #C5A065;"></div>
    </header>

    <main>
        ${clientSectionHtml}
        ${bodyHtml}
    </main>

    <footer>
        <div class="footer-thank-you text-center text-[10px] text-gray-400 italic mt-6 mb-2">
            Thank you for choosing Vesak Care Foundation!
        </div>
        <div class="w-full h-px mt-4 bg-gradient-to-r from-gray-100 via-[#c5a065] to-gray-100 opacity-50"></div>
        <div class="flex justify-between items-center text-[10px] text-gray-500 py-3">
            <div>
                <p class="font-serif-invoice italic mb-1 text-sm" style="color:#002147">Our Offices</p>
                Pune &nbsp;•&nbsp; Mumbai &nbsp;•&nbsp; Kolhapur
            </div>
            <div class="flex gap-4">
                <span><i class="fab fa-instagram mr-1" style="color:#C5A065"></i> @VesakCare</span>
                <span><i class="fab fa-facebook mr-1" style="color:#C5A065"></i> @VesakCare</span>
            </div>
        </div>
        <div class="w-full h-1" style="background-color:#002147"></div>
    </footer>
</div>`;
}
