from fastapi import APIRouter, HTTPException, Query, Request, Request
from pydantic import BaseModel
from typing import Optional, List
from app.services.supabase_client import upsert_service_rate, list_service_rates, get_service_rate, supabase

router = APIRouter()

class RateInput(BaseModel):
    id: Optional[str] = None
    location: str
    sub_location: Optional[str] = None
    service_category: str
    plan_type: str
    shift_type: str
    sub_service: Optional[str] = None
    recurring_service: Optional[str] = "No"
    period: Optional[str] = "Per Day"
    market_rate: float

def get_user_name(request: Request) -> str:
    return request.headers.get("X-User-Name", "System")

@router.post("", summary="Save or Update a service rate")
async def create_or_update_rate(request: Request, rate: RateInput):
    """
    Creates or updates a service rate.
    Min Rate = Market Rate + 8%
    Max Rate = Market Rate + 15% (Quote Rate)
    """
    min_rate = round(rate.market_rate * 1.08, 2)
    max_rate = round(rate.market_rate * 1.15, 2)
    
    payload = {
        "location": rate.location,
        "sub_location": rate.sub_location if rate.sub_location else None,
        "service_category": rate.service_category,
        "plan_type": rate.plan_type,
        "shift_type": rate.shift_type,
        "sub_service": rate.sub_service,
        "recurring_service": rate.recurring_service or "No",
        "period": rate.period or "Per Day",
        "market_rate": rate.market_rate,
        "min_rate": min_rate,
        "max_rate": max_rate,
        "created_by_name": get_user_name(request),
        "updated_by_name": get_user_name(request)
    }
    
    if rate.id:
        payload["id"] = rate.id
        
    try:
        # Check if updating by ID or creating new
        res = upsert_service_rate(payload)
        return {"status": "success", "data": res.data}
    except Exception as e:
        print(f"Error saving rate: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", summary="List filtered service rates")
async def get_rates(
    location: Optional[str] = None, 
    service_category: Optional[str] = None
):
    try:
        res = list_service_rates(location, service_category)
        return res.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/lookup")
async def lookup_rate(
    location: str, 
    service: str, 
    plan: str, 
    shift: str,
    sub_location: Optional[str] = None
):
    """
    Finds a specific rate for the Inquiry Form.
    Fallback: tries sub_location first, then location-level rate.
    """
    try:
        # 1. Try specific sub-location rate first
        if sub_location:
            q = supabase.table("service_rates") \
                .select("*") \
                .eq("location", location) \
                .eq("sub_location", sub_location) \
                .eq("service_category", service) \
                .eq("plan_type", plan) \
                .eq("shift_type", shift) \
                .maybe_single() \
                .execute()
            if q and q.data:
                return q.data

        # 2. Fallback to location-level rate (sub_location is NULL)
        res = supabase.table("service_rates") \
            .select("*") \
            .eq("location", location) \
            .is_("sub_location", "null") \
            .eq("service_category", service) \
            .eq("plan_type", plan) \
            .eq("shift_type", shift) \
            .maybe_single() \
            .execute()
        if res and res.data:
            return res.data

        # 3. Last fallback: original function (no sub_location filter)
        res = get_service_rate(location, service, plan, shift)
        if res and res.data:
            return res.data
        return {}
    except Exception as e:
        print(f"Rate lookup error: {e}")
        return {}

@router.delete("/{rate_id}")
async def delete_rate(rate_id: str):
    try:
        res = supabase.table("service_rates").delete().eq("id", rate_id).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
