-- Phase 13: Staff Field Enhancements (PAN & Notes)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS pan TEXT;

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS nurse_pan TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS nurse_pan_extra TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS nurse_note_extra TEXT;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS nurse_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS nurse_pan TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS nurse_note TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS nurse_name_extra TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS nurse_pan_extra TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS nurse_note_extra TEXT;

COMMENT ON COLUMN public.staff.pan IS 'PAN Number of the staff member';
COMMENT ON COLUMN public.inquiries.nurse_pan IS 'PAN Number of the primary staff member';
COMMENT ON COLUMN public.inquiries.nurse_pan_extra IS 'PAN Numbers of extra staff members (stored as comma-separated or first one depending on implementation)';
COMMENT ON COLUMN public.inquiries.nurse_note_extra IS 'Notes for the extra staff members';
