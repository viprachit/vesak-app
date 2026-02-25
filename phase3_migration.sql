-- phase3_migration.sql

-- 1. Create Staff Directory Table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    aadhar TEXT UNIQUE NOT NULL,
    address TEXT,
    role TEXT, -- Nurse, Caregiver, Attendant, Physiotherapist
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add Triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_modtime
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- 3. Update Inquiries table to link to Staff Directory
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id);
