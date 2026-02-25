# app/main.py
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()  # loads .env in project root if present

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VesakCare API")

# Configure CORS
origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://app.vesakcare.com",
    "https://vesakcare.com",
    "https://vesak-invoice-control-hub.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers (these will be created next)
from app.routers.clients import router as clients_router
from app.routers.invoices import router as invoices_router
from app.routers.documents import router as documents_router

app.include_router(clients_router, prefix="/api/clients", tags=["clients"])
app.include_router(invoices_router, prefix="/api/invoices", tags=["invoices"])
app.include_router(documents_router, prefix="/api/documents", tags=["documents"])

from app.routers.sequences import router as sequences_router
app.include_router(sequences_router, prefix="/api/sequences", tags=["sequences"])



from app.routers.staff import router as staff_router
app.include_router(staff_router, prefix="/api/staff", tags=["staff"])

from app.routers.customers import router as customers_router
app.include_router(customers_router, prefix="/api/customers", tags=["customers"])

from app.routers.rates import router as rates_router
app.include_router(rates_router, prefix="/api/rates", tags=["rates"])

from app.routers.auth import router as auth_router
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

from app.routers.users import router as users_router
app.include_router(users_router, prefix="/api/users", tags=["users"])

from app.routers.employees import router as employees_router
app.include_router(employees_router, prefix="/api/employees", tags=["employees"])

from app.routers.expenses import router as expenses_router
app.include_router(expenses_router, prefix="/api/expenses", tags=["expenses"])

from app.routers.locations import router as locations_router
app.include_router(locations_router, prefix="/api/locations", tags=["locations"])

from app.routers.budgets import router as budgets_router
app.include_router(budgets_router, prefix="/api/budgets", tags=["budgets"])

from app.routers.employee_leaves import router as employee_leaves_router
app.include_router(employee_leaves_router, prefix="/api/employee-leaves", tags=["employee-leaves"])


# Mount the 'static' folder (frontend) at web root
# MUST BE LAST to prevent catching API routes
app.mount("/", StaticFiles(directory="static", html=True), name="static")
