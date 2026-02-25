-- Phase 9: Supabase Native Auth Integration & Audit Trails

-- 1. Create the `employees` table schema
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id), -- Connect to custom users
    auth_id UUID, -- For Supabase Native Auth link
    name TEXT NOT NULL,
    age INT,
    gender TEXT,
    mobile TEXT,
    aadhaar_no TEXT,
    pan_no TEXT,
    address TEXT,
    light_bill_url TEXT,
    
    -- Bank Info
    bank_account TEXT,
    bank_ifsc TEXT,
    bank_name TEXT,
    
    -- Professional
    education_details JSONB, -- stores 10th, 12th, Diploma, UG, PG, Master, Cert
    documents JSONB, -- stores uploaded doc urls
    employment_type TEXT DEFAULT 'Full Time', -- Full Time, Part-time (Gig)
    job_category TEXT DEFAULT 'Field', -- Office, Field
    
    -- Tracking & Metrics
    patients_attended INT DEFAULT 0,
    rating_communication DECIMAL(2,1) DEFAULT 0.0,
    rating_knowledge DECIMAL(2,1) DEFAULT 0.0,
    rating_trust DECIMAL(2,1) DEFAULT 0.0,
    
    -- Status
    joining_date DATE,
    resigned_date DATE,
    is_terminated BOOLEAN DEFAULT FALSE,
    termination_reason TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Add Audit Trail Columns (Created By / Updated By)
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

ALTER TABLE public.service_rates ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.service_rates ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS updated_by_name TEXT;


-- 3. Modify Users Table (Optional, for native auth alignment)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_id UUID;


-- 4. Create sequences tracker for document formatting (e.g IN-PUN-170226-001)
CREATE TABLE IF NOT EXISTS public.monthly_sequences (
    year_month TEXT PRIMARY KEY, -- 'YYMM' e.g., '2602'
    last_val INT DEFAULT 0
);

-- 5. Create Expenses tracker for Financial reporting
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_date DATE NOT NULL,
    category TEXT NOT NULL, -- Rent, Salaries, Utilities, Transport, Other
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    created_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. RPC for atomic sequential document numbering
CREATE OR REPLACE FUNCTION public.next_sequence(p_doc_type text, p_location text, p_month_year text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    new_val integer;
    padded_val text;
    final_seq text;
BEGIN
    -- Upsert the monthly sequence counter
    INSERT INTO public.monthly_sequences (year_month, last_val)
    VALUES (p_month_year, 1)
    ON CONFLICT (year_month) DO UPDATE
    SET last_val = public.monthly_sequences.last_val + 1
    RETURNING last_val INTO new_val;
    
    -- Pad with leading zeros (e.g., 001)
    padded_val := lpad(new_val::text, 3, '0');
    
    -- Construct format: PREFIX-LOC-YYMM-SEQ (e.g. IN-PUN-2602-001)
    final_seq := p_doc_type || '-' || p_location || '-' || p_month_year || '-' || padded_val;
    
    RETURN final_seq;
END;
$$;
