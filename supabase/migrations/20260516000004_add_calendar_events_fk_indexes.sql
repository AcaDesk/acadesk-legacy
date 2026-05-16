-- calendar_events FK 인덱스 추가
-- 8개 FK 컬럼 모두 인덱스 없음 → 조인/연쇄 삭제 시 풀스캔 위험.
-- Supabase performance advisor (unindexed_foreign_keys) 8건 해결.
-- 참고: tenant_id 는 기존 idx_calendar_tenant_time(tenant_id, start_at, end_at)
-- 의 leftmost prefix 로 커버되므로 별도 인덱스 생성 안 함.

CREATE INDEX IF NOT EXISTS idx_calendar_events_class_id
  ON public.calendar_events(class_id)
  WHERE class_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_consultation_id
  ON public.calendar_events(consultation_id)
  WHERE consultation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_student_id
  ON public.calendar_events(student_id)
  WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_exam_id
  ON public.calendar_events(exam_id)
  WHERE exam_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_guardian_id
  ON public.calendar_events(guardian_id)
  WHERE guardian_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_parent_event_id
  ON public.calendar_events(parent_event_id)
  WHERE parent_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by
  ON public.calendar_events(created_by);

CREATE INDEX IF NOT EXISTS idx_calendar_events_updated_by
  ON public.calendar_events(updated_by)
  WHERE updated_by IS NOT NULL;
