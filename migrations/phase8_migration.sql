-- Phase 8 Migration: Authentication, Locations, and Market Rates

-- 1. Create Users Table for RBAC
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Super Admin', 'Admin', 'HR', 'Operator', 'View Only')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Insert Default Super Admin
-- Password is '1234' hashed with SHA-256 for simplicity without external dependencies
-- SHA256('1234') = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
INSERT INTO public.users (username, password_hash, role) 
VALUES ('SAdmin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Super Admin')
ON CONFLICT (username) DO NOTHING;

-- 2. Create Locations Table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    abbreviation VARCHAR(10) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Locations to prevent breaking existing data
INSERT INTO public.locations (name, abbreviation) VALUES 
('Pune', 'PUN'),
('Mumbai', 'MUM'),
('Thane', 'THN'),
('Kolhapur', 'KOP')
ON CONFLICT (name) DO NOTHING;

-- 3. Update Service Rates Table to include Market Rate
ALTER TABLE public.service_rates 
ADD COLUMN IF NOT EXISTS market_rate NUMERIC(10, 2) DEFAULT 0.00;
