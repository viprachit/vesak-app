# app/routers/users.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import hashlib
from app.services.supabase_client import supabase

router = APIRouter()

# New role hierarchy: who can create whom
ROLE_HIERARCHY = {
    "Founding Member": ["Founding Member", "Director", "Top Management", "Employee", "View Only",
                        "Founder", "Super Admin", "Admin", "HR", "Operator"],
    "Director":        ["Top Management", "Employee", "View Only", "Admin", "HR", "Operator"],
    "Top Management":  ["Employee", "View Only", "Operator"],
    # Legacy support
    "Founder":         ["Founding Member", "Director", "Top Management", "Employee", "View Only",
                        "Founder", "Super Admin", "Admin", "HR", "Operator"],
    "Super Admin":     ["Admin", "HR", "Operator", "View Only"],
    "Admin":           ["Operator", "View Only"],
    "HR":              ["Operator", "View Only"],
    "Employee":        [],
    "View Only":       [],
    "Operator":        []
}

# Roles each viewer is allowed to SEE in their user list
VISIBLE_ROLES = {
    "Founding Member": None,  # sees ALL
    "Founder":         None,  # sees ALL
    "Director":        ["Top Management", "Employee", "View Only", "Admin", "HR", "Operator"],
    "Super Admin":     ["Admin", "HR", "Operator", "View Only"],
    "Top Management":  ["Employee", "View Only", "Operator"],
    "Admin":           ["Operator", "View Only"],
    "HR":              ["Operator", "View Only"],
}

class UserInput(BaseModel):
    id: Optional[str] = None
    username: str
    password: Optional[str] = None
    role: str
    display_name: Optional[str] = None
    is_active: bool = True
    created_by: Optional[str] = None
    creator_role: Optional[str] = None
    permissions: Optional[dict] = {}
    page_access: Optional[dict] = {}

@router.get("/", summary="List users (filtered by viewer role)")
def api_get_users(viewer_role: Optional[str] = Query(None)):
    query = supabase.table("users").select(
        "id, username, display_name, role, is_active, created_at, last_login, created_by, permissions, page_access"
    ).order("created_at")

    # Apply role-based filtering
    if viewer_role and viewer_role in VISIBLE_ROLES:
        allowed = VISIBLE_ROLES[viewer_role]
        if allowed is not None:
            query = query.in_("role", allowed)

    res = query.execute()
    return res.data

@router.post("/", summary="Create or update user")
def api_upsert_user(user: UserInput):
    # Tiered role creation enforcement
    if not user.id:
        if not user.creator_role or user.role not in ROLE_HIERARCHY.get(user.creator_role, []):
            raise HTTPException(
                status_code=403,
                detail=f"User with role '{user.creator_role}' is not allowed to create role '{user.role}'"
            )

    payload = {
        "username": user.username,
        "role": user.role,
        "is_active": user.is_active,
        "permissions": user.permissions,
        "page_access": user.page_access
    }

    if user.display_name:
        payload["display_name"] = user.display_name

    if user.id:
        payload["id"] = user.id
    else:
        payload["created_by"] = user.created_by

    if not user.id and not user.password:
        raise HTTPException(status_code=400, detail="Password is required for new users")

    if user.password:
        payload["password_hash"] = hashlib.sha256(user.password.encode('utf-8')).hexdigest()

    try:
        res = supabase.table("users").upsert(payload).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{user_id}/reset-password", summary="Reset user password")
def api_reset_password(user_id: str, payload: dict):
    new_password = payload.get("password")
    if not new_password:
        raise HTTPException(status_code=400, detail="New password required")

    password_hash = hashlib.sha256(new_password.encode('utf-8')).hexdigest()
    try:
        res = supabase.table("users").update({"password_hash": password_hash}).eq("id", user_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{user_id}/toggle", summary="Toggle user active status")
def api_toggle_user_status(user_id: str, is_active: bool):
    res = supabase.table("users").update({"is_active": is_active}).eq("id", user_id).execute()
    return {"status": "success"}
