-- Phase 22: Sub-Locations Support for Locations & Market Rates
-- Ensures DB schema supports sub-locations across the system

-- 1. Add sub_locations JSONB array to locations (if not already present from phase21)
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS sub_locations JSONB DEFAULT '[]'::jsonb;

-- 2. Add sub_location TEXT to service_rates (if not already present)
ALTER TABLE public.service_rates
ADD COLUMN IF NOT EXISTS sub_location TEXT DEFAULT NULL;

-- 3. Add sub_location TEXT to invoices (if not already present from phase21)
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS sub_location TEXT DEFAULT NULL;

-- How fallback / lookup works (application-level, not DB):
-- When looking up a rate:
--   1. Try exact match: location + sub_location + service + plan + shift
--   2. If not found: fallback to location-level (sub_location IS NULL) same service + plan + shift
--   3. This means saving a rate with sub_location = NULL acts as the city-wide default.

-- Notes on existing data:
-- Pune: sub_locations = ["Kothrud", "Baner", "Hinjewadi"]
-- Thane: sub_locations = ["Ghodbunder Rd", "Majiwada", "Vartaknagar"]
