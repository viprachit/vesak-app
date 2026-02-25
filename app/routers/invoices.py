# app/routers/invoices.py
from fastapi import APIRouter, HTTPException
from app.services.supabase_client import create_invoice, update_invoice, get_invoice, list_invoices

from fastapi import APIRouter, HTTPException, Request
from datetime import datetime
from app.services.supabase_client import create_invoice, update_invoice, get_invoice, list_invoices, supabase

router = APIRouter()

def get_user_name(request: Request) -> str:
    # Frontend will send the user's name in a custom header (X-User-Name)
    # Alternatively, we could decode the Supabase JWT, but this is simpler for V1
    return request.headers.get("X-User-Name", "System")

@router.post("/", summary="Create invoice")
def api_create_invoice(request: Request, payload: dict):
    payload['created_by_name'] = get_user_name(request)
    
    # Auto-generate invoice_number if applicable upon creation
    assign_invoice_no_if_needed(payload, existing_invoice_number=None)
    
    res = create_invoice(payload)
    if getattr(res, "error", None):
        raise HTTPException(status_code=400, detail=str(res.error))
    return res.data

@router.put("/{invoice_id}", summary="Update invoice")
def api_update_invoice(request: Request, invoice_id: str, payload: dict):
    payload['updated_by_name'] = get_user_name(request)
    
    # Fetch existing to avoid overriding invoice_number or generating a new one if it already has one
    existing_res = get_invoice(invoice_id)
    existing_invoice_number = existing_res.data.get("invoice_number") if existing_res and not getattr(existing_res, "error", None) else None
    
    # Pass the existing customer_name and location if not in payload, needed for generation
    if existing_res and not getattr(existing_res, "error", None):
        if "customer_name" not in payload:
            payload["customer_name"] = existing_res.data.get("customer_name")
        if "location" not in payload:
            payload["location"] = existing_res.data.get("location")
            
    assign_invoice_no_if_needed(payload, existing_invoice_number)
    
    res = update_invoice(invoice_id, payload)
    if getattr(res, "error", None):
        raise HTTPException(status_code=400, detail=str(res.error))
    return res.data

@router.get("/{invoice_id}", summary="Fetch invoice")
def api_get_invoice(invoice_id: str):
    res = get_invoice(invoice_id)
    if getattr(res, "error", None):
        raise HTTPException(status_code=404, detail="Invoice not found")
    return res.data

@router.get("/", summary="List invoices")
def api_list_invoices(limit: int = 200):
    res = list_invoices(limit=limit)
    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail=str(res.error))
    return res.data

def assign_invoice_no_if_needed(payload: dict, existing_invoice_number: str = None):
    """
    Generates invoice_number in format: IN-{ABBR}-{DDMMYY}-{SEQ}-{Client Name}
    Only generated when status is Confirmed/Active/Completed/Staff Issue.
    Counter resets monthly. Abbreviation fetched from locations table.
    """
    # If it already has an invoice_number from DB or frontend payload, skip
    if existing_invoice_number or payload.get("invoice_number"):
        return

    status = payload.get("status")
    # Generate ONLY if status implies action/payment
    if status in ["Confirmed", "Active", "Completed", "Staff Issue"]:
        loc_name = payload.get("location") or payload.get("customer_location")
        client_name = payload.get("customer_name")
        
        abbreviation = "UNK"
        if loc_name:
            abbreviation = loc_name[:3].upper()
            try:
                loc_res = supabase.table("locations").select("abbreviation").eq("name", loc_name).maybe_single().execute()
                if loc_res.data and loc_res.data.get("abbreviation"):
                    abbreviation = loc_res.data["abbreviation"].upper()
            except Exception:
                pass
        
        now = datetime.now()
        month_year = now.strftime("%m%y") # MMYY for the sequence
        ddmmyy = now.strftime("%d%m%y")   # DDMMYY for the string
        
        try:
            seq_res = supabase.rpc("get_next_invoice_seq", {"p_month_year": month_year}).execute()
            seq_val = seq_res.data
            seq_padded = str(seq_val).zfill(3)
        except Exception as e:
            # Fallback if RPC fails or table doesn't exist
            seq_padded = "001"
            
        client_name_clean = str(client_name).strip() if client_name else "Client"
        
        # Format: IN-PUN-170226-001-Viprachit Walkay
        invoice_number = f"IN-{abbreviation}-{ddmmyy}-{seq_padded}-{client_name_clean}"
        
        payload["invoice_number"] = invoice_number


