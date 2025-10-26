-- Add lead_school column to consultations table
-- This field stores the school name for lead consultations

ALTER TABLE "public"."consultations"
ADD COLUMN "lead_school" text;

COMMENT ON COLUMN "public"."consultations"."lead_school" IS 'School name for lead consultations (optional)';
