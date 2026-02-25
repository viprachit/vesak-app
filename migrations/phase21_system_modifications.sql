-- Phase 21: System Modifications (Corrected)

-- 1. Add sub_locations to locations table
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS sub_locations JSONB DEFAULT '[]'::jsonb;

-- 2. Modify invoices table
-- Add sub_location
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS sub_location TEXT;

-- Rename existing invoice_number to invoice_no if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'invoice_number') THEN
        ALTER TABLE invoices RENAME COLUMN invoice_number TO invoice_no;
    END IF;

    -- Ensure invoice_no exists if neither invoice_number nor invoice_no pre-existed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'invoice_no') THEN
        ALTER TABLE invoices ADD COLUMN invoice_no TEXT;
    END IF;
END $$;

-- Rename existing ref_no (TEXT) to ref_no_text to avoid conflict with new SERIAL ref_no
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'ref_no' AND data_type = 'text') THEN
        ALTER TABLE invoices RENAME COLUMN ref_no TO ref_no_text;
    END IF;
END $$;

-- Add new ref_no as an auto-incrementing serial column
CREATE SEQUENCE IF NOT EXISTS invoices_ref_no_seq;
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS ref_no INTEGER DEFAULT nextval('invoices_ref_no_seq');

-- Add minimum_pay
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS minimum_pay NUMERIC DEFAULT 0;

-- Drop paid_duration
ALTER TABLE invoices
DROP COLUMN IF EXISTS paid_duration;

-- Note: The invoice_no formatting (e.g. IN-PUN-170226-001-Name) is handled via application logic.
-- For existing rows, nullify invoice_no if status doesn't imply generated invoice.
UPDATE invoices 
SET invoice_no = NULL 
WHERE status NOT IN ('Confirmed', 'Active', 'Completed', 'Staff Issue');

-- 3. Sequence tracking for Invoice No (resets monthly)
CREATE TABLE IF NOT EXISTS invoice_sequences (
    month_year VARCHAR(4) PRIMARY KEY, -- Format: MMYY
    last_val INTEGER NOT NULL DEFAULT 0
);

-- Function to get next sequence for a given month
CREATE OR REPLACE FUNCTION public.get_next_invoice_seq(p_month_year text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    new_val integer;
BEGIN
    INSERT INTO public.invoice_sequences (month_year, last_val)
    VALUES (p_month_year, 1)
    ON CONFLICT (month_year) DO UPDATE
    SET last_val = public.invoice_sequences.last_val + 1
    RETURNING last_val INTO new_val;
    
    RETURN new_val;
END;
$$;
