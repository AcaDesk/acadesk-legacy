-- Add passing_score column to exams table if it doesn't exist

DO $$
BEGIN
  -- Check if passing_score column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'exams'
    AND column_name = 'passing_score'
  ) THEN
    -- Add passing_score column
    ALTER TABLE public.exams
    ADD COLUMN passing_score NUMERIC(5,2) NULL;

    RAISE NOTICE 'Added passing_score column to exams table';
  ELSE
    RAISE NOTICE 'passing_score column already exists in exams table';
  END IF;

  -- Add comment for documentation
  COMMENT ON COLUMN public.exams.passing_score IS '합격 기준 점수 (백분율, 0-100)';

  RAISE NOTICE '✅ Migration 20241025000003_add_passing_score_to_exams completed successfully';
END $$;
