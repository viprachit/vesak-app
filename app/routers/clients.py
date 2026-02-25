# app/routers/clients.py
from fastapi import APIRouter, HTTPException
from app.services.supabase_client import list_clients, get_client, upsert_client

router = APIRouter()

@router.get("/", summary="List clients")
def api_list_clients(limit: int = 200):
    res = list_clients(limit=limit)
    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail=str(res.error))
    return res.data

@router.get("/{client_id}", summary="Get client details")
def api_get_client(client_id: str):
    res = get_client(client_id)
    if getattr(res, "error", None):
        raise HTTPException(status_code=404, detail="Client not found")
    return res.data

@router.post("/", summary="Create or update client")
def api_upsert_client(payload: dict):
    res = upsert_client(payload)
    if getattr(res, "error", None):
        raise HTTPException(status_code=400, detail=str(res.error))
    return res.data
