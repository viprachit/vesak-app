# app/routers/budgets.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.services.supabase_client import supabase

router = APIRouter()

class BudgetInput(BaseModel):
    id: Optional[str] = None
    category: str
    custom_category: Optional[str] = None
    budget_amount: float
    unit_amount: Optional[float] = None
    period: str = "Monthly"
    occurrence: int = 1
    occurrence_count: int = 1
    fiscal_year: int = 2026

@router.get("/", summary="List all budgets")
def api_get_budgets():
    res = supabase.table("budgets").select("*").order("category").execute()
    return res.data

@router.get("/misc-categories", summary="Get existing misc category names for autocomplete")
def api_get_misc_categories(q: str = ""):
    try:
        res = supabase.table("budgets").select("custom_category").eq("category", "Misc").not_.is_("custom_category", "null").execute()
        categories = list(set(item["custom_category"] for item in res.data if item.get("custom_category")))
        if q:
            q_lower = q.lower()
            categories = [c for c in categories if q_lower in c.lower()]
        return sorted(categories)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/", summary="Upsert budget")
def api_upsert_budget(request: Request, budget: BudgetInput):
    payload = budget.model_dump(exclude_unset=True)
    payload["created_by"] = request.headers.get("X-User-Name", "System")

    if budget.id:
        payload["id"] = budget.id

    try:
        res = supabase.table("budgets").upsert(payload).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{id}", summary="Delete a budget")
def api_delete_budget(id: str):
    try:
        supabase.table("budgets").delete().eq("id", id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
