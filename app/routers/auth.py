# app/routers/auth.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import hashlib
from app.services.supabase_client import supabase

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login", summary="Authenticate User")
def api_login(request: LoginRequest):
    # Hash password with SHA-256
    password_hash = hashlib.sha256(request.password.encode('utf-8')).hexdigest()
    
    # Query database for username
    res = supabase.table("users").select("id, username, password_hash, role, is_active").eq("username", request.username).execute()
    users = res.data
    
    if not users:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    user = users[0]
    
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account is disabled. Contact Super Admin.")
        
    if user.get("password_hash") != password_hash:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    # Return user payload
    return {
        "success": True,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"]
        }
    }

@router.get("/config", summary="Get Supabase Public Config")
def get_supabase_config():
    import os
    return {
        "supabaseUrl": os.getenv("SUPABASE_URL", ""),
        "supabaseKey": os.getenv("SUPABASE_ANON_KEY", "")
    }
