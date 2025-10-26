DO $$
BEGIN
  -- 1. Create ref_exam_categories table (without 'description')
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'ref_exam_categories'
  ) THEN
    CREATE TABLE public.ref_exam_categories (
      code         TEXT PRIMARY KEY,
      label        TEXT NOT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      active       BOOLEAN NOT NULL DEFAULT TRUE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Add index on active status for fast filtering
    CREATE INDEX idx_ref_exam_categories_active
      ON public.ref_exam_categories (active, sort_order);

    -- Add update trigger
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON public.ref_exam_categories
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();

    RAISE NOTICE 'Created table: ref_exam_categories';
  ELSE
    RAISE NOTICE 'Table ref_exam_categories already exists, skipping creation.';
  END IF;

  -- 2. Insert default exam categories (without 'description')
  INSERT INTO public.ref_exam_categories (code, label, sort_order, active)
  VALUES
    ('midterm', '중간고사', 10, TRUE),
    ('final', '기말고사', 20, TRUE),
    ('mock', '모의고사', 30, TRUE),
    ('quiz', '쪽지시험', 40, TRUE),
    ('performance', '수행평가', 50, TRUE),
    ('placement', '레벨테스트', 60, TRUE),
    ('assignment', '과제평가', 70, TRUE),
    ('other', '기타', 999, TRUE)
  ON CONFLICT (code) DO NOTHING;
  
  RAISE NOTICE 'Default exam categories inserted or updated.';


  -- 3. Grant permissions
  -- Reference tables are read-only for all authenticated users
  GRANT SELECT ON public.ref_exam_categories TO authenticated;

  -- Service role has full access
  GRANT ALL ON public.ref_exam_categories TO service_role; -- Corrected line

  RAISE NOTICE 'Permissions granted for ref_exam_categories.';


  -- 4. RLS Policy
  -- Enable RLS
  ALTER TABLE public.ref_exam_categories ENABLE ROW LEVEL SECURITY;

  -- Policy: Anyone can read reference data
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ref_exam_categories'
    AND policyname = 'ref_exam_categories_select_policy'
  ) THEN
    CREATE POLICY ref_exam_categories_select_policy
      ON public.ref_exam_categories
      FOR SELECT
      USING (TRUE);

    RAISE NOTICE 'Created RLS policy: ref_exam_categories_select_policy';
  ELSE
    RAISE NOTICE 'RLS policy ref_exam_categories_select_policy already exists';
  END IF;

  RAISE NOTICE '✅ Migration 20241024000007_create_exam_reference_tables completed successfully';

END $$;