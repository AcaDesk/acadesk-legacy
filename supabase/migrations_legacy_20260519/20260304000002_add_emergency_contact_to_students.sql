-- Add emergency_contact column to students table
-- This column was defined in schema but missing from migrations

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS emergency_contact text;
