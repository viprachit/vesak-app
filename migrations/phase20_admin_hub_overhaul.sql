-- Phase 20: Admin Hub Comprehensive Overhaul
-- Schema changes for service_rates, users, budgets

-- 1. Enhance service_rates with sub-service, recurring, period
ALTER TABLE public.service_rates ADD COLUMN IF NOT EXISTS sub_service TEXT;
ALTER TABLE public.service_rates ADD COLUMN IF NOT EXISTS recurring_service TEXT DEFAULT 'No';
ALTER TABLE public.service_rates ADD COLUMN IF NOT EXISTS period TEXT DEFAULT 'Per Day';

-- 2. Add page_access JSONB to users for granular page permissions
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS page_access JSONB DEFAULT '{}'::jsonb;

-- 3. Enhance budgets with occurrence and custom category
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS custom_category TEXT;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS occurrence INT DEFAULT 1;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS occurrence_count INT DEFAULT 1;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS unit_amount DECIMAL(12,2);

COMMENT ON COLUMN public.service_rates.sub_service IS 'Sub-service within a plan (e.g. Basic Care, IV Therapy)';
COMMENT ON COLUMN public.service_rates.recurring_service IS 'Yes or No';
COMMENT ON COLUMN public.service_rates.period IS 'Per Day, Per Week, Per Month';
COMMENT ON COLUMN public.users.page_access IS 'JSONB map of page slug to boolean for page-level access';
COMMENT ON COLUMN public.budgets.custom_category IS 'Custom name for Miscellaneous category';
COMMENT ON COLUMN public.budgets.occurrence IS 'Number of times the budget recurs';
COMMENT ON COLUMN public.budgets.occurrence_count IS 'For how many periods';
COMMENT ON COLUMN public.budgets.unit_amount IS 'Single-occurrence amount before multiplication';
