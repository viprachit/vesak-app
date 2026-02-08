"""
helpers_agreements.py

Helper functions for agreement generation and saving:
- Save functions for Nurse, Physio, A-la-carte agreements.
- Duplicate prevention (agreement_already_saved).
- Document hash and HTML-to-PDF conversion.
"""

import datetime
import io
import hashlib

import streamlit as st
from weasyprint import HTML
from weasyprint.text.fonts import FontConfiguration


def format_date_simple(d):
    """
    Format a date as 'DD-MM-YYYY' (no time component).
    """
    if d is None:
        return ""
    try:
        if isinstance(d, datetime.datetime):
            d = d.date()
        if isinstance(d, datetime.date):
            return d.strftime("%d-%m-%Y")
    except Exception:
        pass
    return str(d)


# -----------------------------------------
# Sheet Save Functions
# -----------------------------------------
def save_to_nurses_sheet(master_row: dict, tab5: dict, nurses_ws):
    """
    Save Caregiver Service Agreement data (Nurse/Caregiver) to Nurses sheet.
    Appends standardized columns and records Document Type, Saved At, and Doc Hash.
    Returns True on success, False if a duplicate is detected or on error.
    """
    try:
        if nurses_ws is None:
            raise Exception("Nurses sheet not available")

        invoice_no = master_row.get("Invoice Number", "")
        plan = master_row.get("Plan", "")

        doc_type = "Caregiver Service Agreement"  # Use the agreed document type

        if agreement_already_saved(nurses_ws, invoice_no, plan, doc_type):
            st.warning("⚠️ Agreement already exists. Duplicate save prevented.")
            return False

        date_val = format_date_simple(master_row.get("Date", ""))
        nurse_name = master_row.get("Nurse Name") or tab5.get("nurse_name", "")

        # Build row in consistent order — include prior columns, then doc metadata
        row = [
            master_row.get("UID", ""),
            master_row.get("Serial No.", ""),
            master_row.get("Ref. No.", ""),
            invoice_no,
            date_val,
            # Staff info (Nurse/Caregiver)
            nurse_name,
            tab5.get("nurse_age", ""),
            tab5.get("nurse_addr", ""),
            tab5.get("nurse_aadhar", ""),
            # Extra staff fields (if applicable)
            master_row.get("Nurse Name (Extra)", ""),
            tab5.get("nurse_age_extra", ""),
            tab5.get("nurse_addr_extra", ""),
            tab5.get("nurse_aadhar_extra", ""),
            # Notes / payment
            master_row.get("Nurse Note", ""),
            master_row.get("Nurse Payment", ""),
            # Client details
            master_row.get("Customer Name", ""),
            master_row.get("Age", ""),
            master_row.get("Gender", ""),
            master_row.get("Location", ""),
            master_row.get("Address", ""),
            master_row.get("Mobile", ""),
            plan,
            # Document metadata
            doc_type,
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),  # Saved At
            generate_doc_hash(doc_type, invoice_no, master_row.get("Customer Name", ""))
        ]

        nurses_ws.append_row(row, value_input_option="USER_ENTERED")
        return True

    except Exception as e:
        st.error(f"Save Error (Nurses): {e}")
        return False


def save_to_physio_sheet(master_row: dict, tab5: dict, physio_ws):
    """
    Save Caregiver Service Agreement data (Physiotherapist) to Physio sheet.
    Returns True on success, False if duplicate or error.
    """
    try:
        if physio_ws is None:
            raise Exception("Physio sheet not available")

        invoice_no = master_row.get("Invoice Number", "")
        plan = master_row.get("Plan", "")

        doc_type = "Caregiver Service Agreement"  # Use the agreed document type

        if agreement_already_saved(physio_ws, invoice_no, plan, doc_type):
            st.warning("⚠️ Agreement already exists. Duplicate save prevented.")
            return False

        date_val = format_date_simple(master_row.get("Date", ""))
        physio_name = master_row.get("Nurse Name") or tab5.get("nurse_name", "")

        row = [
            master_row.get("UID", ""),
            master_row.get("Serial No.", ""),
            master_row.get("Ref. No.", ""),
            invoice_no,
            date_val,
            # Physiotherapist info
            physio_name,
            tab5.get("nurse_age", ""),
            tab5.get("nurse_addr", ""),
            tab5.get("nurse_aadhar", ""),
            master_row.get("Nurse Note", ""),
            master_row.get("Nurse Payment", ""),
            # Client details
            master_row.get("Customer Name", ""),
            master_row.get("Age", ""),
            master_row.get("Gender", ""),
            master_row.get("Location", ""),
            master_row.get("Address", ""),
            master_row.get("Mobile", ""),
            plan,
            # Document metadata
            doc_type,
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            generate_doc_hash(doc_type, invoice_no, master_row.get("Customer Name", ""))
        ]

        physio_ws.append_row(row, value_input_option="USER_ENTERED")
        return True

    except Exception as e:
        st.error(f"Save Error (Physio): {e}")
        return False


def save_to_alacarte_sheet(master_row: dict, tab5: dict, alacarte_ws):
    """
    Save Caregiver Service Agreement data (A-la-carte / Attendant) to A-la-carte sheet.
    Returns True on success, False if duplicate or error.
    """
    try:
        if alacarte_ws is None:
            raise Exception("A-la-carte sheet not available")

        invoice_no = master_row.get("Invoice Number", "")
        plan = master_row.get("Plan", "")

        doc_type = "Caregiver Service Agreement"  # Use the agreed document type

        if agreement_already_saved(alacarte_ws, invoice_no, plan, doc_type):
            st.warning("⚠️ Agreement already exists. Duplicate save prevented.")
            return False

        date_val = format_date_simple(master_row.get("Date", ""))
        attendant_name = master_row.get("Nurse Name") or tab5.get("nurse_name", "")

        row = [
            master_row.get("UID", ""),
            master_row.get("Serial No.", ""),
            master_row.get("Ref. No.", ""),
            invoice_no,
            date_val,
            # Attendant info
            attendant_name,
            tab5.get("nurse_age", ""),
            tab5.get("nurse_addr", ""),
            tab5.get("nurse_aadhar", ""),
            master_row.get("Nurse Note", ""),
            master_row.get("Nurse Payment", ""),
            # Client details
            master_row.get("Customer Name", ""),
            master_row.get("Age", ""),
            master_row.get("Gender", ""),
            master_row.get("Location", ""),
            master_row.get("Address", ""),
            master_row.get("Mobile", ""),
            plan,
            # Document metadata
            doc_type,
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            generate_doc_hash(doc_type, invoice_no, master_row.get("Customer Name", ""))
        ]

        alacarte_ws.append_row(row, value_input_option="USER_ENTERED")
        return True

    except Exception as e:
        st.error(f"Save Error (A-la-carte): {e}")
        return False


# -----------------------------------------
# Duplicate Check Helper
# -----------------------------------------
def agreement_already_saved(ws, invoice_no, plan, doc_type):
    """
    Check if an agreement of the same Invoice No, Plan, and Document Type
    already exists in the sheet. Returns True if found (duplicate), else False.
    """
    if ws is None:
        return False

    try:
        records = ws.get_all_records()
    except Exception:
        # Empty sheet or permission error: no duplicates
        return False

    doc_type_keys = ["Document Type", "Agreement Type", "Doc Type", "Document", "Type"]
    invoice_keys = ["Invoice Number", "Invoice", "Invoice No.", "Invoice No", "InvoiceNumber"]
    plan_keys = ["Plan", "Service Required", "Plan Name"]

    for r in records:
        # Find invoice number in record
        inv_val = None
        for k in invoice_keys:
            if k in r:
                inv_val = r.get(k)
                break
        plan_val = None
        for k in plan_keys:
            if k in r:
                plan_val = r.get(k)
                break
        dtype_val = None
        for k in doc_type_keys:
            if k in r:
                dtype_val = r.get(k)
                break

        if inv_val is None and plan_val is None and dtype_val is None:
            continue

        if (str(inv_val).strip() == str(invoice_no).strip() and
                str(plan_val).strip() == str(plan).strip() and
                str(dtype_val).strip().lower() == str(doc_type).strip().lower()):
            return True

    return False


# -----------------------------------------
# Document Utilities
# -----------------------------------------
def generate_doc_hash(*parts):
    """
    Generate a SHA-256 hash (hex, truncated) from the given parts.
    Parts are converted to strings and joined, then hashed. Returns first 16 hex chars.
    """
    s = "||".join([str(p) for p in parts if p is not None])
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]


def convert_html_to_pdf(html: str) -> bytes:
    """
    Converts HTML to high-quality PDF using WeasyPrint.
    Returns PDF bytes.
    """
    font_config = FontConfiguration()
    pdf_io = io.BytesIO()
    HTML(string=html).write_pdf(pdf_io, font_config=font_config)
    return pdf_io.getvalue()
