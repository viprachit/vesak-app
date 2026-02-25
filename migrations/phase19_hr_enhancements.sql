-- Phase 19: HR Master Hub Enhancements
-- Adds contract tracking columns and employee_leaves table

-- 1. Contract duration tracking
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS contract_duration_months INT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS contract_end_date DATE;

-- 2. Employee Leaves table for monthly leave + salary tracking
CREATE TABLE IF NOT EXISTS public.employee_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) NOT NULL,
    month_year TEXT NOT NULL,
    leave_dates JSONB DEFAULT '[]'::jsonb,
    overtime_days INT DEFAULT 0,
    working_days INT DEFAULT 26,
    daily_rate DECIMAL(10,2),
    net_salary DECIMAL(10,2),
    notes TEXT,
    created_by_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(employee_id, month_year)
);

COMMENT ON TABLE public.employee_leaves IS 'Monthly leave and salary tracking per employee';
COMMENT ON COLUMN public.employee_leaves.leave_dates IS 'JSON array of date strings when employee was on leave';
COMMENT ON COLUMN public.employee_leaves.month_year IS 'Format: YYYY-MM e.g. 2026-02';
