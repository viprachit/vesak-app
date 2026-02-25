# app/services/supabase_client.py
import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# --- Staff Directory ---
def upsert_staff(payload: dict):
    # If Aadhar exists, this updates fields (like mobile)
    return supabase.table("staff").upsert(payload, on_conflict="aadhar").execute()

def search_staff(query: str):
    # Search by mobile or aadhar
    return supabase.table("staff").select("*").or_(f"mobile.eq.{query},aadhar.eq.{query}").execute()

# --- Customer Auto-fill ---
def search_customers(mobile: str):
    # Search inquiries for existing customer data by mobile
    return supabase.table("inquiries").select("customer_name,customer_age,customer_gender,customer_address,customer_location").eq("customer_mobile", mobile).order("created_at", desc=True).limit(1).execute()


def list_clients(limit: int = 100):
    return supabase.table("clients").select("*").order("created_at", desc=True).limit(limit).execute()

def get_client(client_id: str):
    return supabase.table("clients").select("*").eq("id", client_id).single().execute()

def upsert_client(payload: dict):
    return supabase.table("clients").upsert(payload).execute()

def create_invoice(payload: dict):
    return supabase.table("invoices").insert(payload).execute()

def update_invoice(invoice_id: str, payload: dict):
    return supabase.table("invoices").update(payload).eq("id", invoice_id).execute()

def get_invoice(invoice_id: str):
    return supabase.table("invoices").select("*").eq("id", invoice_id).single().execute()

def list_invoices(limit: int = 100):
    return supabase.table("invoices").select("*").order("created_at", desc=True).limit(limit).execute()

def create_document(payload: dict):
    return supabase.table("official_documents").insert(payload).execute()

def get_next_sequence(doc_type_code: str, location_code: str, month_year: str):
    # Calls the 'next_sequence' Postgres function
    params = {
        "p_doc_type": doc_type_code,
        "p_location": location_code,
        "p_month_year": month_year
    }
    return supabase.rpc("next_sequence", params).execute()

# --- Rate Management ---
def upsert_service_rate(payload: dict):
    # Upserts based on unique constraint (location, service_category, plan_type, shift_type)
    # The payload MUST include these 4 fields to match correctly, or an ID.
    return supabase.table("service_rates").upsert(payload).execute()

def list_service_rates(location: str = None, service_category: str = None):
    query = supabase.table("service_rates").select("*").order("location", desc=False)
    if location:
        query = query.eq("location", location)
    if service_category:
        query = query.eq("service_category", service_category)
    return query.execute()

def get_service_rate(location: str, service: str, plan: str, shift: str):
    # Precise lookup for Inquiry Form
    return supabase.table("service_rates")\
        .select("*")\
        .eq("location", location)\
        .eq("service_category", service)\
        .eq("plan_type", plan)\
        .eq("shift_type", shift)\
        .maybe_single()\
        .execute()
