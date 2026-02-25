// static/templates/numbering.js
// ============================================================================
// DOCUMENT NUMBERING — ISOLATED MODULE
// This file handles all document number formatting and prefix logic.
// Invoice numbers are generated SERVER-SIDE in invoices.py.
// This module provides display/prefix utilities only.
// ============================================================================

/**
 * Numbering System Configuration
 */
const NUMBERING_CONFIG = {
    // Document Type Abbreviations
    TYPE_CODES: {
        'invoice': 'IN',
        'nurseagreement': 'NU',
        'patientagreement': 'PA',
        'warning': 'WA',
    },

    // Official Docs Abbreviations
    OFFICIAL_CODES: {
        'Offer Letter': 'OL',
        'Termination Letter': 'TL',
        'Appointment Letter': 'AP',
        'Notice': 'NT',
        'Certificate': 'CT',
        'Memo': 'MO',
        'Circular': 'CR',
        // Fallback for custom types
        'Custom': 'OD'
    }
};

/**
 * Gets location abbreviation dynamically from appLocations (loaded from DB).
 * Falls back to first 3 chars of location name if not found.
 * @param {string} locationName 
 * @returns {string} e.g. "PUN"
 */
function getLocationAbbreviation(locationName) {
    if (!locationName) return 'GEN';

    // Try appLocations first (loaded from /api/locations)
    if (window.appLocations && Array.isArray(window.appLocations)) {
        const loc = window.appLocations.find(l => l.name === locationName);
        if (loc && loc.abbreviation) return loc.abbreviation.toUpperCase();
    }

    // Fallback: first 3 characters
    return locationName.substring(0, 3).toUpperCase();
}

/**
 * Formats a date string (YYYY-MM-DD or similar) into DDMMYY
 * @param {string} dateStr 
 * @returns {string} e.g. "170226"
 */
function formatDateForNumber(dateStr) {
    if (!dateStr) return '000000';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0'); // Jan is 0
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}${mm}${yy}`;
}

/**
 * Extracts MonthYear code for sequencing (e.g. "0226")
 * @param {string} dateStr 
 * @returns {string} e.g. "0226"
 */
function getMonthYearCode(dateStr) {
    if (!dateStr) return '0000';
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}${yy}`;
}

/**
 * Formats client name: preserves as-is (with spaces).
 * @param {string} name 
 * @returns {string} e.g. "Viprachit Walkay"
 */
function formatClientName(name) {
    if (!name) return 'Client';
    return name.trim();
}

/**
 * Fetches the next sequence number from the backend
 * @param {string} docTypeCode 
 * @param {string} locationCode 
 * @param {string} monthYear 
 * @returns {Promise<number>}
 */
async function fetchNextSequence(docTypeCode, locationCode, monthYear) {
    try {
        const url = `/api/sequences/next?doc_type=${docTypeCode}&location=${locationCode}&month_year=${monthYear}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        return data.seq; // matches { "seq": 5 }
    } catch (err) {
        console.error('Sequence fetch error:', err);
        return 0; // Fallback
    }
}

/**
 * Swaps the document prefix on an existing invoice number.
 * Example: swapDocPrefix("IN-PUN-170226-001-Viprachit Walkay", "nurseagreement")
 *   → "NU-PUN-170226-001-Viprachit Walkay"
 * 
 * @param {string} invoiceNumber - The original invoice number (IN-XXX-...)
 * @param {string} newDocType - One of: 'invoice', 'nurseagreement', 'patientagreement', 'warning'
 * @returns {string} The invoice number with swapped prefix
 */
function swapDocPrefix(invoiceNumber, newDocType) {
    if (!invoiceNumber || invoiceNumber === '---') return invoiceNumber;

    const newPrefix = NUMBERING_CONFIG.TYPE_CODES[newDocType] || 'IN';

    // Replace the first 2-character prefix (IN, NU, PA, WA) before the first dash
    const dashIndex = invoiceNumber.indexOf('-');
    if (dashIndex === -1) return invoiceNumber;

    return newPrefix + invoiceNumber.substring(dashIndex);
}

/**
 * Main function to generate Official Doc Reference Number
 * Format: VCF/TYPE-LOC-DDMMYY-SEQ
 * @param {string} docTypeTitle (Offer Letter, etc.)
 * @param {string} location (Pune, Mumbai, etc.)
 * @param {string} date 
 */
async function generateOfficialRefNo(docTypeTitle, location, date) {
    // Determine code based on title, fallback to Custom (OD)
    let typeCode = NUMBERING_CONFIG.OFFICIAL_CODES[docTypeTitle];
    if (!typeCode) typeCode = 'OD'; // Custom

    const locCode = getLocationAbbreviation(location) || 'HO'; // HO = Head Office default

    const dateCode = formatDateForNumber(date);
    const monthYear = getMonthYearCode(date);

    const seq = await fetchNextSequence(typeCode, locCode, monthYear);
    const seqStr = String(seq).padStart(3, '0');

    return `VCF/${typeCode}-${locCode}-${dateCode}-${seqStr}`;
}

// Expose globally
window.swapDocPrefix = swapDocPrefix;
window.getLocationAbbreviation = getLocationAbbreviation;
window.generateOfficialRefNo = generateOfficialRefNo;
window.NUMBERING_CONFIG = NUMBERING_CONFIG;
