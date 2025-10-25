-- Migration: Make exam_scores columns nullable to support student assignment before score entry
-- Issue: Students are assigned to exams first, then scores are entered later
-- Fix: Change score, total_points, and percentage columns to nullable

DO $$
BEGIN
  -- 1. Remove NOT NULL constraint from score column
  ALTER TABLE public.exam_scores
    ALTER COLUMN score DROP NOT NULL;

  RAISE NOTICE 'Removed NOT NULL constraint from exam_scores.score';

  -- 2. Remove NOT NULL constraint from total_points column
  ALTER TABLE public.exam_scores
    ALTER COLUMN total_points DROP NOT NULL;

  RAISE NOTICE 'Removed NOT NULL constraint from exam_scores.total_points';

  -- 3. Remove NOT NULL constraint from percentage column
  ALTER TABLE public.exam_scores
    ALTER COLUMN percentage DROP NOT NULL;

  RAISE NOTICE 'Removed NOT NULL constraint from exam_scores.percentage';

  RAISE NOTICE '✅ Migration 20241026000001_make_exam_scores_columns_nullable completed successfully';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END $$;
