# app/routers/locations.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.services.supabase_client import supabase

router = APIRouter()

class LocationInput(BaseModel):
    id: Optional[str] = None
    name: str
    abbreviation: str
    sub_locations: Optional[list[str]] = []
    is_active: bool = True

@router.get("", summary="List all active locations")
def api_get_locations():
    res = supabase.table("locations").select("*").eq("is_active", True).order("name").execute()
    return res.data

@router.get("/all", summary="List ALL locations (including inactive) for admin")
def api_get_all_locations():
    res = supabase.table("locations").select("*").order("name").execute()
    return res.data

def get_user_name(request: Request) -> str:
    return request.headers.get("X-User-Name", "System")

@router.post("", summary="Add or update a location")
def api_upsert_location(request: Request, loc: LocationInput):
    payload = loc.model_dump(exclude_unset=True)
    payload["created_by"] = request.headers.get("X-User-Name", "System")

    try:
        res = supabase.table("locations").upsert(payload, returning="representation").execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{id}/toggle", summary="Toggle location active/inactive")
def api_toggle_location(id: str, is_active: bool = True):
    try:
        res = supabase.table("locations").update({"is_active": is_active}).eq("id", id).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/sub-location", summary="Add a single sub-location to a location")
def api_add_sub_location(id: str, name: str):
    """Adds a sub-location name to the location's sub_locations JSONB array if not already present."""
    try:
        # Fetch the current location
        loc = supabase.table("locations").select("sub_locations").eq("id", id).maybe_single().execute()
        if not loc or not loc.data:
            raise HTTPException(status_code=404, detail="Location not found")

        current_subs = loc.data.get("sub_locations", []) or []
        if name not in current_subs:
            current_subs.append(name)

        res = supabase.table("locations").update({"sub_locations": current_subs}).eq("id", id).execute()
        return {"status": "success", "data": res.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{id}/sub-location", summary="Delete a specific sub-location from a location")
def api_delete_sub_location(id: str, name: str):
    """Removes a sub-location by name from the location's sub_locations JSONB array."""
    try:
        # Fetch the current location
        loc = supabase.table("locations").select("sub_locations").eq("id", id).maybe_single().execute()
        if not loc or not loc.data:
            raise HTTPException(status_code=404, detail="Location not found")

        current_subs = loc.data.get("sub_locations", []) or []
        updated_subs = [s for s in current_subs if s != name]

        res = supabase.table("locations").update({"sub_locations": updated_subs}).eq("id", id).execute()
        return {"status": "success", "data": res.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
