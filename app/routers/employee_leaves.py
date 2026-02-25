# app/routers/employee_leaves.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from app.services.supabase_client import supabase

router = APIRouter()

def get_user_name(request: Request) -> str:
    return request.headers.get("X-User-Name", "System")

class LeaveInput(BaseModel):
    id: Optional[str] = None
    employee_id: str
    month_year: str  # e.g. '2026-02'
    leave_dates: Optional[List[str]] = []  # e.g. ['2026-02-05', '2026-02-12']
    overtime_days: Optional[int] = 0
    working_days: Optional[int] = 26
    daily_rate: Optional[float] = None
    net_salary: Optional[float] = None
    notes: Optional[str] = None

@router.get("/{employee_id}", summary="Get leave records for an employee")
def api_get_leaves(employee_id: str, month_year: Optional[str] = None):
    query = supabase.table("employee_leaves").select("*").eq("employee_id", employee_id)
    if month_year:
        query = query.eq("month_year", month_year)
    res = query.order("month_year", desc=True).execute()
    return res.data

@router.post("/", summary="Upsert a leave record")
def api_upsert_leave(request: Request, leave: LeaveInput):
    payload = leave.model_dump(exclude_unset=True)
    payload["created_by_name"] = get_user_name(request)

    try:
        res = supabase.table("employee_leaves").upsert(
            payload, 
            on_conflict="employee_id,month_year",
            returning="representation"
        ).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{record_id}", summary="Delete a leave record")
def api_delete_leave(record_id: str):
    try:
        res = supabase.table("employee_leaves").delete().eq("id", record_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
