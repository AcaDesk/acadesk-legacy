-- 데이터 무결성 제약 및 인덱스 정비 (2026-07 종합 감사 후속)
--
-- 1) class_enrollments: 소프트삭제 컬럼 추가 + 재등록 허용 유니크 재설계
-- 2) exam_scores: 점수 범위 CHECK (기존 이상치는 클램프)
-- 3) notification_logs: 테넌트 격리 우회 고아 로그 차단 (NOT NULL + CASCADE)
-- 4) 누락 인덱스 보강

-- ============================================================
-- 1. class_enrollments
-- ============================================================

-- 코드 3곳(kiosk-attendance/dashboard/dashboard-drilldown)이 이미
-- deleted_at을 필터하고 있으나 컬럼이 없어 해당 조건이 무효였다.
-- 소프트삭제 원칙(전 테이블 공통)에 맞춰 컬럼을 추가한다.
ALTER TABLE public.class_enrollments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 기존 전역 UNIQUE(class_id, student_id)는 탈퇴(status='withdrawn') 후
-- 동일 반 재등록(새 행)을 영구히 차단했다. 활성 등록에만 유니크를 걸어
-- 재등록 이력을 행 단위로 보존할 수 있게 한다.
-- (bulkAssignClass의 upsert는 이 제약에 의존했으므로 코드도 함께 수정됨)
ALTER TABLE public.class_enrollments
  DROP CONSTRAINT IF EXISTS class_enrollments_class_id_student_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_class_enrollments_active
  ON public.class_enrollments (class_id, student_id)
  WHERE status = 'active' AND deleted_at IS NULL;

-- 활성 재적생 조회용 인덱스 (KPI/로스터 집계 경로)
CREATE INDEX IF NOT EXISTS idx_class_enrollments_tenant_status
  ON public.class_enrollments (tenant_id, status);

-- ============================================================
-- 2. exam_scores 범위 CHECK
-- ============================================================

-- 범위 밖 기존 데이터는 정의상 입력 오류이므로 경계값으로 클램프 후 제약 추가
UPDATE public.exam_scores
SET percentage = LEAST(GREATEST(percentage, 0), 100)
WHERE percentage IS NOT NULL AND (percentage < 0 OR percentage > 100);

UPDATE public.exam_scores
SET score = 0
WHERE score IS NOT NULL AND score < 0;

ALTER TABLE public.exam_scores
  DROP CONSTRAINT IF EXISTS chk_exam_scores_percentage_range;
ALTER TABLE public.exam_scores
  ADD CONSTRAINT chk_exam_scores_percentage_range
  CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100));

ALTER TABLE public.exam_scores
  DROP CONSTRAINT IF EXISTS chk_exam_scores_score_nonneg;
ALTER TABLE public.exam_scores
  ADD CONSTRAINT chk_exam_scores_score_nonneg
  CHECK (score IS NULL OR score >= 0);

-- ============================================================
-- 3. notification_logs 테넌트 격리 강화
-- ============================================================

-- 기존 ON DELETE SET NULL은 테넌트 삭제 시 tenant_id가 NULL인 고아 로그를
-- 남겨 테넌트 격리 필터(tenant_id = ?)가 닿지 않는 행을 만든다.
-- 고아 행 제거 후 NOT NULL + CASCADE로 전환.
DELETE FROM public.notification_logs WHERE tenant_id IS NULL;

ALTER TABLE public.notification_logs
  DROP CONSTRAINT IF EXISTS notification_logs_tenant_id_fkey;
ALTER TABLE public.notification_logs
  ADD CONSTRAINT notification_logs_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.notification_logs
  ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================================
-- 4. 누락 인덱스 보강
-- ============================================================

-- 날짜 기준 출결 집계 (KPI/드릴다운) — 기존에는 attendance_sessions 조인 경유만 가능했다
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date
  ON public.attendance (tenant_id, attendance_date DESC);

-- 감사 조회: 변경 주체별 이력
CREATE INDEX IF NOT EXISTS idx_student_change_logs_changed_by
  ON public.student_change_logs (changed_by);
