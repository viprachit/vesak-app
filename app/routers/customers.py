# app/routers/customers.py
from fastapi import APIRouter, HTTPException
from app.services.supabase_client import search_customers

router = APIRouter()

@router.get("/search", summary="Search customer history")
def api_search_customers(mobile: str):
    res = search_customers(mobile)
    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail=str(res.error))
    return res.data
