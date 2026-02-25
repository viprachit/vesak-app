-- Phase 12 Refinement: Support for expanded HR columns and ratings
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS work_location TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS rating_customer_feedback DECIMAL(3,1) DEFAULT 0.0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS rating_customer_request DECIMAL(3,1) DEFAULT 0.0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS rating_loyalty INT DEFAULT 0;

-- Ensure pan_no and aadhaar_no are present (matching existing naming)
-- Note: Pydantic uses 'aadhar' and 'pan', JS handles the mapping

COMMENT ON COLUMN public.employees.work_location IS 'Base work location for the employee (e.g. Thane, Pune)';
COMMENT ON COLUMN public.employees.rating_customer_feedback IS 'Average rating from customer feedback';
COMMENT ON COLUMN public.employees.rating_customer_request IS 'Average rating for customer requests/proactiveness';
