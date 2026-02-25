# app/routers/staff.py
from fastapi import APIRouter, HTTPException
from app.services.supabase_client import upsert_staff, search_staff

router = APIRouter()

@router.post("/", summary="Upsert staff")
def api_upsert_staff(payload: dict):
    res = upsert_staff(payload)
    if getattr(res, "error", None):
        raise HTTPException(status_code=400, detail=str(res.error))
    return res.data

@router.get("/search", summary="Search staff")
def api_search_staff(query: str):
    res = search_staff(query)
    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail=str(res.error))
    return res.data
