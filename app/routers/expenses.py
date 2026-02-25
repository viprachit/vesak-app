# app/routers/expenses.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.services.supabase_client import supabase

router = APIRouter()

def get_user_name(request: Request) -> str:
    return request.headers.get("X-User-Name", "System")

class ExpenseInput(BaseModel):
    id: Optional[str] = None
    expense_date: date
    category: str
    subcategory: Optional[str] = None
    amount: float
    description: Optional[str] = None
    recurrence: str = "One-time"
    recurrence_count: int = 1
    is_active: bool = True

@router.get("/", summary="List all expenses")
def api_get_expenses():
    res = supabase.table("expenses").select("*").order("expense_date", desc=True).execute()
    return res.data

@router.post("/", summary="Upsert expense record")
def api_upsert_expense(request: Request, exp: ExpenseInput):
    payload = exp.model_dump(exclude_unset=True)
    payload["expense_date"] = payload["expense_date"].isoformat()

    if not exp.id:
        payload["created_by_name"] = get_user_name(request)

    try:
        res = supabase.table("expenses").upsert(payload, returning="representation").execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{id}", summary="Delete an expense")
def api_delete_expense(id: str):
    try:
        res = supabase.table("expenses").delete().eq("id", id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
