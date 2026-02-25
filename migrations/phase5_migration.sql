-- Phase 5: Rate Management System

CREATE TABLE IF NOT EXISTS service_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location TEXT NOT NULL,
    service_category TEXT NOT NULL, -- e.g. 'Elderly Care'
    plan_type TEXT NOT NULL, -- e.g. 'Semi-trained'
    shift_type TEXT NOT NULL, -- e.g. '12 Hours'
    market_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    min_rate NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Calculated as Market + 8%
    max_rate NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Calculated as Market + 15%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination to prevent duplicates
    UNIQUE(location, service_category, plan_type, shift_type)
);

-- Index for fast lookup during Inquiry Form usage
CREATE INDEX IF NOT EXISTS idx_service_rates_lookup 
ON service_rates(location, service_category, plan_type, shift_type);
