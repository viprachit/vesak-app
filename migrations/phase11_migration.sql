-- migrations/phase11_migration.sql
-- Phase 11: Operations Center & Employee Lifecycle Overhaul

-- 1. Enhance Inquiries (Invoices) table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS secondary_staff_id UUID REFERENCES public.employees(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS secondary_staff_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS terminate_note TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_duration_weeks INT DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_duration_days INT DEFAULT 0;

-- 2. Enhance Employees table for full HR lifecycle
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS resignation_note TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS functional_responsibilities TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS earnings_json JSONB DEFAULT '{"weekly": 0, "monthly": 0, "quarterly": 0, "yearly": 0}'::jsonb;

-- Add updated_at if not present in employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Add trigger for employees updated_at
DROP TRIGGER IF EXISTS set_timestamp_employees ON public.employees;
CREATE TRIGGER set_timestamp_employees
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- 3. Add 'Founder' role to users if not already there (RBAC check)
-- This is just a comment as roles are likely text based in the 'role' column
-- Roles supported: Founder, Super Admin, Admin, HR, Operator, View Only

-- 4. Initial Office Expenses Categories (for completeness)
-- Already handled in public.expenses table from phase 9
