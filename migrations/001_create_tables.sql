-- migrations/001_create_tables.sql
-- Paste this into Supabase SQL editor (or run via psql)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CLIENTS table (basic lookup used to populate inquiry form)
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no text,
  name text NOT NULL,
  mobile text,
  age integer,
  gender text,
  location text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_mobile ON public.clients (mobile);

-- INVOICES table (main master record, with many explicit columns + data JSON for staff/details)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no text,
  invoice_number text UNIQUE,
  date date,
  generated_at timestamptz DEFAULT now(),
  customer_name text,
  customer_age integer,
  customer_gender text,
  customer_location text,
  customer_address text,
  customer_mobile text,
  plan text,
  service text,
  shift text,
  recurring_service text,
  period text,
  visits integer,
  amount numeric(12,2),
  notes text,
  generated_by text,
  amount_paid numeric(12,2) DEFAULT 0,
  details text,
  service_started date,
  service_ended date,
  referral_name text,
  referral_code text,
  referral_credit numeric(12,2),
  net_amount numeric(12,2),
  nurse_payment numeric(12,2),
  nurse_payment_extra numeric(12,2),
  paid_for integer,
  earnings numeric(12,2),
  nurse_name text,
  nurse_name_extra text,
  nurse_note text,
  -- staff / extra details kept as JSON (physio/attendant/extra staff fields)
  staff_data jsonb DEFAULT '{}'::jsonb,
  -- convenience summary fields
  status text DEFAULT 'draft',
  total_amount numeric(12,2),
  data jsonb DEFAULT '{}'::jsonb,  -- full frozen snapshot if/when needed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices (customer_name);
CREATE INDEX IF NOT EXISTS idx_invoices_ref ON public.invoices (ref_no);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON public.invoices (invoice_number);

-- OFFICIAL DOCUMENTS table
CREATE TABLE IF NOT EXISTS public.official_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  doc_type text NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  file_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- Triggers to update updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_clients ON public.clients;
CREATE TRIGGER set_timestamp_clients
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_invoices ON public.invoices;
CREATE TRIGGER set_timestamp_invoices
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
