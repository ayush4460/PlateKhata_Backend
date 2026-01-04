-- Migration: Add contact_number, fssai_lic_no, and gstin to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS fssai_lic_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS gstin VARCHAR(20);

COMMENT ON COLUMN restaurants.contact_number IS 'Primary contact number for the restaurant';
COMMENT ON COLUMN restaurants.fssai_lic_no IS 'FSSAI License Number for the restaurant';
COMMENT ON COLUMN restaurants.gstin IS 'GST Identification Number for the restaurant';
