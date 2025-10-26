-- =====================================================================
-- 0) 타입/테이블 선생성 (존재하면 스킵)
-- =====================================================================

-- task_kind ENUM
DO $$ BEGIN
  CREATE TYPE public.task_kind AS ENUM ('in_class', 'homework');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- student_tasks (통합 테이블)
CREATE TABLE IF NOT EXISTS public.student_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assigned_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,

  kind              public.task_kind NOT NULL DEFAULT 'in_class',

  title             TEXT NOT NULL,
  description       TEXT,
  subject           TEXT,
  priority          TEXT DEFAULT 'normal',
  due_date          DATE NOT NULL,
  due_day_of_week   INTEGER,

  completed_at      TIMESTAMPTZ,
  verified_at       TIMESTAMPTZ,
  verified_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT chk_student_tasks_priority
    CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT chk_student_tasks_due_day_of_week
    CHECK (due_day_of_week IS NULL OR (due_day_of_week BETWEEN 1 AND 7))
);

-- 0-1) due_day_of_week 0→7 보정 트리거 (안전망)
CREATE OR REPLACE FUNCTION public.fn_student_tasks_normalize_dow()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.due_day_of_week = 0 THEN
    NEW.due_day_of_week := 7;
  END IF;
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_student_tasks_normalize_dow'
  ) THEN
    CREATE TRIGGER trg_student_tasks_normalize_dow
      BEFORE INSERT OR UPDATE ON public.student_tasks
      FOR EACH ROW EXECUTE FUNCTION public.fn_student_tasks_normalize_dow();
  END IF;
END $$;

-- homework_submissions
CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_id                 UUID NOT NULL UNIQUE REFERENCES public.student_tasks(id) ON DELETE CASCADE,

  submitted_at            TIMESTAMPTZ,
  submitted_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  text_answer             TEXT,
  attachment_urls         TEXT[],

  graded_by               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  graded_at               TIMESTAMPTZ,
  score                   NUMERIC(5,2),
  feedback                TEXT,

  is_late                 BOOLEAN DEFAULT false,
  resubmission_allowed    BOOLEAN DEFAULT false,
  resubmission_deadline   TIMESTAMPTZ,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_homework_submissions_score
    CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

-- =====================================================================
-- 1) 인덱스 (있으면 스킵)
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_student_tasks_tenant
  ON public.student_tasks (tenant_id, deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_tasks_student_due
  ON public.student_tasks (student_id, due_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_tasks_kind_pending
  ON public.student_tasks (tenant_id, kind, due_date)
  WHERE deleted_at IS NULL AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_tasks_verified
  ON public.student_tasks (tenant_id, verified_at DESC)
  WHERE deleted_at IS NULL AND verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_tasks_completed
  ON public.student_tasks (tenant_id, kind, completed_at DESC)
  WHERE deleted_at IS NULL AND completed_at IS NOT NULL AND verified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_homework_submissions_tenant_time
  ON public.homework_submissions (tenant_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_homework_submissions_grading
  ON public.homework_submissions (tenant_id, graded_at DESC)
  WHERE graded_at IS NOT NULL;

-- =====================================================================
-- 2) 기존 student_todos 가 "테이블"이면 → 데이터 이관 → rename
--    (뷰면 무시, 없으면 무시)
-- =====================================================================
DO $$
DECLARE obj_kind CHAR;
DECLARE legacy_new_name TEXT;
BEGIN
  SELECT c.relkind
    INTO obj_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='student_todos';

  IF obj_kind = 'r' THEN
    -- 데이터 이관
    INSERT INTO public.student_tasks (
      id, tenant_id, student_id, kind,
      title, description, subject, priority,
      due_date, due_day_of_week,
      completed_at, verified_at, verified_by,
      created_at, updated_at, deleted_at
    )
    SELECT
      id,
      tenant_id,
      student_id,
      'in_class'::public.task_kind,
      title,
      description,
      subject,
      COALESCE(priority, 'normal'),
      (due_date)::date,
      CASE
        WHEN due_day_of_week = 0 THEN 7
        WHEN due_day_of_week BETWEEN 1 AND 7 THEN due_day_of_week
        ELSE NULL
      END,
      completed_at,
      verified_at,
      verified_by,
      created_at,
      updated_at,
      deleted_at
    FROM public.student_todos
    ON CONFLICT (id) DO NOTHING;

    -- 보정 (혹시 0 남았으면 7로)
    UPDATE public.student_tasks SET due_day_of_week = 7 WHERE due_day_of_week = 0;

    -- legacy 이름 결정
    legacy_new_name := 'student_todos_legacy';
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname=legacy_new_name
    ) THEN
      legacy_new_name := 'student_todos_legacy_' || to_char(clock_timestamp(),'YYYYMMDD_HH24MISS');
    END IF;

    -- rename
    EXECUTE format('ALTER TABLE public.student_todos RENAME TO %I', legacy_new_name);
  END IF;
END $$;

-- =====================================================================
-- 3) VIEW 재정의/생성
-- =====================================================================
CREATE OR REPLACE VIEW public.student_todos AS
SELECT
  id,
  tenant_id,
  student_id,
  title,
  description,
  subject,
  priority,
  due_date::text AS due_date,
  due_day_of_week,
  completed_at,
  verified_at,
  verified_by,
  created_at,
  updated_at
FROM public.student_tasks
WHERE kind = 'in_class' AND deleted_at IS NULL;

COMMENT ON VIEW public.student_todos IS '하위호환: 학원 내 TODO(in_class) 전용 뷰';

CREATE OR REPLACE VIEW public.homeworks AS
SELECT
  t.id,
  t.tenant_id,
  t.student_id,
  t.assigned_by,
  t.title,
  t.description,
  t.subject,
  t.priority,
  t.due_date,
  t.due_day_of_week,
  t.completed_at,
  t.verified_at,
  t.verified_by,
  t.created_at,
  t.updated_at,
  hs.id                AS submission_id,
  hs.submitted_at,
  hs.submitted_by,
  hs.text_answer,
  hs.attachment_urls,
  hs.graded_by,
  hs.graded_at,
  hs.score,
  hs.feedback,
  hs.is_late,
  hs.resubmission_allowed,
  hs.resubmission_deadline
FROM public.student_tasks t
LEFT JOIN public.homework_submissions hs ON hs.task_id = t.id
WHERE t.kind = 'homework' AND t.deleted_at IS NULL;

COMMENT ON VIEW public.homeworks IS '숙제(task) + 제출/채점 상세 뷰';

-- =====================================================================
-- 4) 권한
-- =====================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_submissions TO authenticated;
GRANT SELECT ON public.student_todos TO authenticated;
GRANT SELECT ON public.homeworks TO authenticated;

-- =====================================================================
-- 5) (선택) RLS: service_role 위주라면 생략 가능.
--     get_current_tenant_id()가 있을 때만 정책을 건다.
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
    WHERE n.nspname='public' AND proname='get_current_tenant_id'
  ) THEN
    ALTER TABLE public.student_tasks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

    -- 중복 생성을 피하기 위해 존재 체크 후 생성
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_tasks' AND policyname='student_tasks_select_policy'
    ) THEN
      CREATE POLICY "student_tasks_select_policy" ON public.student_tasks
        FOR SELECT USING (tenant_id = get_current_tenant_id() AND deleted_at IS NULL);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_tasks' AND policyname='student_tasks_insert_policy'
    ) THEN
      CREATE POLICY "student_tasks_insert_policy" ON public.student_tasks
        FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id() AND kind IN ('in_class','homework'));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_tasks' AND policyname='student_tasks_update_policy'
    ) THEN
      CREATE POLICY "student_tasks_update_policy" ON public.student_tasks
        FOR UPDATE USING (tenant_id = get_current_tenant_id() AND deleted_at IS NULL)
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_tasks' AND policyname='student_tasks_delete_policy'
    ) THEN
      CREATE POLICY "student_tasks_delete_policy" ON public.student_tasks
        FOR DELETE USING (tenant_id = get_current_tenant_id());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='homework_submissions' AND policyname='homework_submissions_select_policy'
    ) THEN
      CREATE POLICY "homework_submissions_select_policy" ON public.homework_submissions
        FOR SELECT USING (tenant_id = get_current_tenant_id());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='homework_submissions' AND policyname='homework_submissions_insert_policy'
    ) THEN
      CREATE POLICY "homework_submissions_insert_policy" ON public.homework_submissions
        FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='homework_submissions' AND policyname='homework_submissions_update_policy'
    ) THEN
      CREATE POLICY "homework_submissions_update_policy" ON public.homework_submissions
        FOR UPDATE USING (tenant_id = get_current_tenant_id())
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='homework_submissions' AND policyname='homework_submissions_delete_policy'
    ) THEN
      CREATE POLICY "homework_submissions_delete_policy" ON public.homework_submissions
        FOR DELETE USING (tenant_id = get_current_tenant_id());
    END IF;
  END IF;
END $$;