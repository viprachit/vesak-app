# app/routers/documents.py
from fastapi import APIRouter, HTTPException, Request
from app.services.supabase_client import create_document

router = APIRouter()

def get_user_name(request: Request) -> str:
    return request.headers.get("X-User-Name", "System")

@router.post("/", summary="Save official document metadata")
def api_create_document(request: Request, payload: dict):
    payload['created_by_name'] = get_user_name(request)
    
    res = create_document(payload)
    if getattr(res, "error", None):
        raise HTTPException(status_code=400, detail=str(res.error))
    return res.data
