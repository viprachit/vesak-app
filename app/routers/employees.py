# app/routers/employees.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.supabase_client import supabase

router = APIRouter()

def get_user_name(request: Request) -> str:
    return request.headers.get("X-User-Name", "System")

class EmployeeInput(BaseModel):
    id: Optional[str] = None
    name: str
    mobile: Optional[str] = None
    aadhar: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    
    # Hierarchy & Role
    work_type: Optional[str] = "Field Staff" # Office vs Field
    employment_type: Optional[str] = "Payroll" # Payroll vs Gig/Retainer
    contract_duration_months: Optional[int] = None  # 6 or 12 months
    contract_end_date: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[str] = None # Support legacy mapping
    work_location: Optional[str] = None # Thane, Pune, etc.
    sub_location: Optional[str] = None # Zone within location
    
    # Professional Details
    dob: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    joining_date: Optional[str] = None
    education_details: Optional[str] = None
    experience_total: Optional[str] = None
    functional_responsibilities: Optional[str] = None
    
    # Multi-Dimensional Tracking (Ratings)
    rating_knowledge: Optional[int] = 0
    rating_communication: Optional[int] = 0
    rating_loyalty: Optional[int] = 0
    rating_trust: Optional[int] = 0
    rating_customer_feedback: Optional[float] = 0.0
    rating_customer_request: Optional[float] = 0.0
    patients_served_count: Optional[int] = 0
    
    # Financials
    earnings_per_month: Optional[float] = 0
    total_salary_earned: Optional[float] = 0 # Calculated aggregate
    
    # Lifecycle & Audit
    status: Optional[str] = "Active" # Active, Terminated, On Leave
    resigned_date: Optional[str] = None
    resignation_note: Optional[str] = None
    terminated_by: Optional[str] = None

@router.get("/", summary="List all employees")
def api_get_employees():
    res = supabase.table("employees").select("*").order("name").execute()
    return res.data

@router.get("/office", summary="List office staff only")
def api_get_office_staff():
    res = supabase.table("employees").select("*").eq("work_type", "Office Staff").order("name").execute()
    return res.data
    
@router.get("/field", summary="List field staff only")
def api_get_field_staff():
    res = supabase.table("employees").select("*").eq("work_type", "Field Staff").order("name").execute()
    return res.data

@router.post("/", summary="Upsert employee record")
def api_upsert_employee(request: Request, emp: EmployeeInput):
    payload = emp.model_dump(exclude_unset=True)
    
    # Add audit tracing if needed based on the table's capabilities (if added later)
    # The current schema for employees didn't specify created_by_name but usually good practice
    
    try:
        res = supabase.table("employees").upsert(payload, returning="representation").execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{id}", summary="Get employee by ID")
def api_get_employee_by_id(id: str):
    res = supabase.table("employees").select("*").eq("id", id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    return res.data

@router.get("/search/{mobile}", summary="Search employee by mobile")
def api_search_employee_by_mobile(mobile: str):
    res = supabase.table("employees").select("*").eq("mobile", mobile).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    return res.data[0]

@router.get("/by-location", summary="Search employees by location for staff allocation")
def api_get_employees_by_location(
    location: str,
    sub_location: str = None,
    query: str = None
):
    """
    Returns active field staff for a given location.
    - location: required (strict match on work_location)
    - sub_location: optional filter
    - query: optional text search on name or mobile
    """
    q = supabase.table("employees") \
        .select("id,name,age,gender,mobile,aadhaar_no,pan,address,work_location,sub_location,status,work_type") \
        .eq("work_location", location) \
        .eq("status", "Active")

    if sub_location:
        q = q.eq("sub_location", sub_location)
    
    res = q.order("name").execute()
    data = res.data or []

    # Client-side text filter on name/mobile if query provided
    if query and data:
        query_lower = query.lower()
        data = [e for e in data if 
            (e.get("name") and query_lower in e["name"].lower()) or
            (e.get("mobile") and query_lower in e["mobile"])
        ]
    
    return data

