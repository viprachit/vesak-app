# app/routers/sequences.py
from fastapi import APIRouter, HTTPException, Query
from app.services.supabase_client import get_next_sequence

router = APIRouter()

@router.get("/next", summary="Get next sequence number")
def api_get_next_sequence(
    doc_type: str = Query(..., description="Doc abbreviation (IN, NU, PA, WL, OL, etc.)"),
    location: str = Query(..., description="Location code (PUN, MUM, THN, KOP)"),
    month_year: str = Query(..., description="MonthYear code (e.g. 0226)")
):
    """
    Returns the next sequence number for the given doc_type + location + month_year.
    """
    res = get_next_sequence(doc_type, location, month_year)
    
    # Supabase RPC returns the data directly or inside .data depending on client version
    # If using postgrest-py client: res.data
    # If error, it might raise exception or return error object.
    
    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail=str(res.error))
    
    # RPC returns the formatted string directly (e.g. IN-PUN-2602-001)
    seq_str = res.data if hasattr(res, 'data') else res
    
    return {"seq": seq_str}
