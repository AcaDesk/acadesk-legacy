-- Rename is_primary to is_primary_contact in student_guardians table
-- This aligns the database column name with TypeScript types and application code
-- This migration is idempotent and safe for both new and existing databases

DO $$
BEGIN
  -- Only rename if the old column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_guardians'
    AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE public.student_guardians
      RENAME COLUMN is_primary TO is_primary_contact;

    RAISE NOTICE 'Column renamed from is_primary to is_primary_contact';
  ELSE
    RAISE NOTICE 'Column is_primary does not exist, skipping rename';
  END IF;
END $$;

-- Drop old index and create new one with correct name
DROP INDEX IF EXISTS public.uq_sg_primary_per_student;
DROP INDEX IF EXISTS public.uq_student_primary_guardian;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sg_primary_contact_per_student
  ON public.student_guardians(student_id)
  WHERE is_primary_contact;

-- Add comment
COMMENT ON COLUMN public.student_guardians.is_primary_contact IS '주 보호자 여부 (primary contact)';
