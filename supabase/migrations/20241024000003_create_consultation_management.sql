-- ============================================================
-- Consultation Management System: FINAL PATCH (idempotent)
--  - 기존 consultations 보강/정규화
--  - consultation_notes / consultation_participants / teaching_resources 생성
--  - 서비스 롤 운영 전제(RLS 비활성)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0) 기존 컬럼 정리: instructor_id -> conducted_by (있을 때만)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='consultations' AND column_name='instructor_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='consultations' AND column_name='conducted_by'
  ) THEN
    EXECUTE 'ALTER TABLE public.consultations RENAME COLUMN instructor_id TO conducted_by';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1) 컬럼 추가(있으면 스킵)
--    - 최종 스키마 타깃: 템플릿과 동일
-- ------------------------------------------------------------
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS consultation_type     TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes      INTEGER,
  ADD COLUMN IF NOT EXISTS title                 TEXT,
  ADD COLUMN IF NOT EXISTS summary               TEXT,
  ADD COLUMN IF NOT EXISTS outcome               TEXT,
  ADD COLUMN IF NOT EXISTS next_consultation_date DATE,
  ADD COLUMN IF NOT EXISTS follow_up_required    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS conducted_by          UUID;

-- ------------------------------------------------------------
-- 2) consultation_date: DATE → TIMESTAMPTZ (기존 값 보존)
--    - 이미 timestamptz면 스킵
-- ------------------------------------------------------------
DO $$
DECLARE
  v_typ text;
BEGIN
  SELECT data_type INTO v_typ
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='consultations' AND column_name='consultation_date';

  IF v_typ = 'date' THEN
    EXECUTE $sql$
      ALTER TABLE public.consultations
      ALTER COLUMN consultation_date TYPE timestamptz
      USING (consultation_date::timestamptz),
      ALTER COLUMN consultation_date SET DEFAULT now()
    $sql$;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) 기존 content → summary로 승격 후 content 삭제(있을 때만)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='consultations' AND column_name='content'
  ) THEN
    -- summary 비어있으면 content로 채움
    UPDATE public.consultations
       SET summary = COALESCE(summary, content)
     WHERE content IS NOT NULL
       AND (summary IS NULL OR summary = '');

    -- content 컬럼 제거
    EXECUTE 'ALTER TABLE public.consultations DROP COLUMN content';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) consultation_type 정규화: 기본값/backfill → NOT NULL + CHECK
-- ------------------------------------------------------------
-- 기본값 설정
ALTER TABLE public.consultations
  ALTER COLUMN consultation_type SET DEFAULT 'in_person';

-- NULL 채우기
UPDATE public.consultations
   SET consultation_type = 'in_person'
 WHERE consultation_type IS NULL;

-- CHECK 제약(없을 때만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='chk_consultations_type'
      AND conrelid='public.consultations'::regclass
  ) THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT chk_consultations_type
      CHECK (consultation_type IN ('parent_meeting','phone_call','video_call','in_person'));
  END IF;
END $$;

-- NOT NULL (이미 모두 채워졌으므로 적용 가능)
ALTER TABLE public.consultations
  ALTER COLUMN consultation_type SET NOT NULL;

-- ------------------------------------------------------------
-- 5) duration_minutes 양수 체크(없을 때만)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='chk_consultations_duration'
      AND conrelid='public.consultations'::regclass
  ) THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT chk_consultations_duration
      CHECK (duration_minutes IS NULL OR duration_minutes > 0);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 6) title NOT NULL 보장: 비어있으면 채우고 NOT NULL
-- ------------------------------------------------------------
UPDATE public.consultations
   SET title = COALESCE(
     NULLIF(title, ''),
     COALESCE(summary, '상담')
   )
 WHERE title IS NULL OR title = '';

ALTER TABLE public.consultations
  ALTER COLUMN title SET NOT NULL;

-- ------------------------------------------------------------
-- 7) conducted_by FK(users.id) + (가능하면) NOT NULL
--    - NULL 있으면 일단 FK만, 모두 채워지면 NOT NULL로 격상
-- ------------------------------------------------------------
DO $$
DECLARE v_nulls int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='consultations_conducted_by_fkey'
      AND conrelid='public.consultations'::regclass
  ) THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT consultations_conducted_by_fkey
      FOREIGN KEY (conducted_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  SELECT COUNT(*) INTO v_nulls
  FROM public.consultations
  WHERE conducted_by IS NULL;

  IF v_nulls = 0 THEN
    EXECUTE 'ALTER TABLE public.consultations ALTER COLUMN conducted_by SET NOT NULL';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 8) 조회 인덱스
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_consultations_student_date
  ON public.consultations (student_id, consultation_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_consultations_tenant_date
  ON public.consultations (tenant_id, consultation_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_consultations_conducted_by_date
  ON public.consultations (conducted_by, consultation_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_consultations_follow_up
  ON public.consultations (tenant_id, follow_up_required, next_consultation_date)
  WHERE deleted_at IS NULL AND follow_up_required = TRUE;

-- ------------------------------------------------------------
-- 9) 주석
-- ------------------------------------------------------------
COMMENT ON TABLE  public.consultations IS '상담 기록';
COMMENT ON COLUMN public.consultations.consultation_type IS '상담 유형 (parent_meeting | phone_call | video_call | in_person)';
COMMENT ON COLUMN public.consultations.duration_minutes IS '상담 소요 시간(분)';
COMMENT ON COLUMN public.consultations.title IS '상담 제목';
COMMENT ON COLUMN public.consultations.summary IS '상담 요약';
COMMENT ON COLUMN public.consultations.outcome IS '상담 결과/조치사항';
COMMENT ON COLUMN public.consultations.next_consultation_date IS '다음 상담 예정일';
COMMENT ON COLUMN public.consultations.follow_up_required IS '후속 상담 필요 여부';
COMMENT ON COLUMN public.consultations.conducted_by IS '상담 진행 강사(users.id)';

-- ============================================================
-- A) 상담 노트 (Consultation Notes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consultation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  note_order INTEGER NOT NULL DEFAULT 1,
  category TEXT,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consultation_notes_consultation
  ON public.consultation_notes (consultation_id, note_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_consultation_notes_category
  ON public.consultation_notes (tenant_id, category)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE public.consultation_notes IS '상담 노트 (상세 기록)';
COMMENT ON COLUMN public.consultation_notes.note_order IS '노트 순서';
COMMENT ON COLUMN public.consultation_notes.category IS '카테고리(학습/생활/진로/기타)';
COMMENT ON COLUMN public.consultation_notes.content IS '노트 내용(마크다운 가능)';

-- ============================================================
-- B) 상담 참석자 (Consultation Participants)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consultation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  participant_type TEXT NOT NULL, -- instructor | guardian | student | other
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
  name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_participants_type CHECK (
    participant_type IN ('instructor','guardian','student','other')
  ),
  CONSTRAINT chk_participants_identity CHECK (
    (participant_type='instructor' AND user_id IS NOT NULL) OR
    (participant_type='guardian'  AND guardian_id IS NOT NULL) OR
    (participant_type='student') OR
    (participant_type='other'     AND name IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_participants_consultation
  ON public.consultation_participants (consultation_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_participants_user
  ON public.consultation_participants (user_id)
  WHERE deleted_at IS NULL AND participant_type='instructor';

CREATE INDEX IF NOT EXISTS idx_participants_guardian
  ON public.consultation_participants (guardian_id)
  WHERE deleted_at IS NULL AND participant_type='guardian';

COMMENT ON TABLE public.consultation_participants IS '상담 참석자';
COMMENT ON COLUMN public.consultation_participants.participant_type IS '참석자 유형';
COMMENT ON COLUMN public.consultation_participants.user_id IS '강사 ID';
COMMENT ON COLUMN public.consultation_participants.guardian_id IS '학부모 ID';
COMMENT ON COLUMN public.consultation_participants.name IS '기타 참석자 이름';
COMMENT ON COLUMN public.consultation_participants.role IS '기타 참석자 역할';

-- ============================================================
-- C) 강사 공유 자료 (Teaching Resources)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teaching_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,       -- teaching_material | worksheet | exam | reference | other
  subject TEXT,
  grade_level TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  external_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  shared_with UUID[],  -- 특정 강사 user_id 배열
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_resources_category CHECK (
    category IN ('teaching_material','worksheet','exam','reference','other')
  ),
  CONSTRAINT chk_resources_url CHECK (
    file_url IS NOT NULL OR external_url IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_resources_tenant
  ON public.teaching_resources (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resources_category
  ON public.teaching_resources (tenant_id, category)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resources_subject
  ON public.teaching_resources (tenant_id, subject)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resources_creator
  ON public.teaching_resources (created_by, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resources_public
  ON public.teaching_resources (tenant_id, is_public)
  WHERE deleted_at IS NULL AND is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_resources_shared_with
  ON public.teaching_resources USING GIN (shared_with)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE public.teaching_resources IS '강사 공유 자료';
COMMENT ON COLUMN public.teaching_resources.category IS '자료 유형';
COMMENT ON COLUMN public.teaching_resources.subject IS '과목';
COMMENT ON COLUMN public.teaching_resources.grade_level IS '학년';
COMMENT ON COLUMN public.teaching_resources.file_url IS 'Supabase Storage 파일 URL';
COMMENT ON COLUMN public.teaching_resources.external_url IS '외부 링크';
COMMENT ON COLUMN public.teaching_resources.is_public IS '전체 강사 공유 여부';
COMMENT ON COLUMN public.teaching_resources.shared_with IS '특정 강사 공유(user_id 배열)';

-- ============================================================
-- D) RLS 비활성 (service_role 전제)
-- ============================================================
ALTER TABLE public.consultations              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_notes         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_participants  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_resources         DISABLE ROW LEVEL SECURITY;

COMMIT;