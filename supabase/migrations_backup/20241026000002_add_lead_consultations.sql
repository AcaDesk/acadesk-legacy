-- ============================================================
-- Add Lead Consultation Support
--  - 신규 입회 상담(잠재 고객) 기능 추가
--  - student_id nullable 변경
--  - lead 정보 컬럼 추가
--  - 입회 처리(전환) 워크플로우 지원
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) consultations.student_id를 nullable로 변경
-- ------------------------------------------------------------
ALTER TABLE public.consultations
  ALTER COLUMN student_id DROP NOT NULL;

-- ------------------------------------------------------------
-- 2) Lead 상담 정보 컬럼 추가
-- ------------------------------------------------------------
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS is_lead BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lead_name TEXT,
  ADD COLUMN IF NOT EXISTS lead_guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS lead_guardian_phone TEXT,
  ADD COLUMN IF NOT EXISTS converted_to_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- 3) CHECK 제약: student_id가 NULL이면 lead_name 필수
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='chk_consultations_student_or_lead'
      AND conrelid='public.consultations'::regclass
  ) THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT chk_consultations_student_or_lead
      CHECK (
        (student_id IS NOT NULL AND is_lead = FALSE) OR
        (student_id IS NULL AND is_lead = TRUE AND lead_name IS NOT NULL)
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) 기존 데이터 업데이트: is_lead 설정
-- ------------------------------------------------------------
-- 기존 상담들은 모두 재원생 상담이므로 is_lead = FALSE (이미 기본값)
UPDATE public.consultations
   SET is_lead = FALSE
 WHERE student_id IS NOT NULL
   AND is_lead IS NULL;

-- ------------------------------------------------------------
-- 5) 인덱스 추가
-- ------------------------------------------------------------
-- Lead 상담 조회용
CREATE INDEX IF NOT EXISTS idx_consultations_lead
  ON public.consultations (tenant_id, is_lead, consultation_date DESC)
  WHERE deleted_at IS NULL AND is_lead = TRUE;

-- 전환된 상담 조회용
CREATE INDEX IF NOT EXISTS idx_consultations_converted
  ON public.consultations (converted_to_student_id)
  WHERE deleted_at IS NULL AND converted_to_student_id IS NOT NULL;

-- ------------------------------------------------------------
-- 6) 주석 추가
-- ------------------------------------------------------------
COMMENT ON COLUMN public.consultations.is_lead IS '신규 입회 상담 여부 (잠재 고객)';
COMMENT ON COLUMN public.consultations.lead_name IS '잠재 고객 이름 (신규 상담 시)';
COMMENT ON COLUMN public.consultations.lead_guardian_name IS '학부모명 (신규 상담 시)';
COMMENT ON COLUMN public.consultations.lead_guardian_phone IS '학부모 연락처 (신규 상담 시)';
COMMENT ON COLUMN public.consultations.converted_to_student_id IS '입회 처리 후 생성된 학생 ID';
COMMENT ON COLUMN public.consultations.converted_at IS '입회 처리 완료 시각';

COMMIT;
