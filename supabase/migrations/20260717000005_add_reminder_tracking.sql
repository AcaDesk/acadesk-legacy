-- 데일리 리마인더 크론(숙제 마감/도서 반납) 발송 추적 컬럼·인덱스
--
-- 크론이 매일 실행되므로 "이미 보낸 리마인더" 판별이 필요하다.
-- book_lendings.reminder_sent_at은 기존에 존재 — student_tasks에만 추가.

ALTER TABLE public.student_tasks
  ADD COLUMN IF NOT EXISTS deadline_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.student_tasks.deadline_reminder_sent_at
  IS '숙제 마감 전날 리마인더(homework_deadline) 발송 시각 — 데일리 크론 중복 발송 방지';

-- 크론 스캔 경로: 미완료·미발송 숙제를 마감일로 조회
CREATE INDEX IF NOT EXISTS idx_student_tasks_deadline_reminder
  ON public.student_tasks (tenant_id, due_date)
  WHERE kind = 'homework'
    AND completed_at IS NULL
    AND deleted_at IS NULL
    AND deadline_reminder_sent_at IS NULL;

-- 크론 스캔 경로: 미반납·미발송 대여를 반납예정일로 조회
CREATE INDEX IF NOT EXISTS idx_book_lendings_reminder_due
  ON public.book_lendings (tenant_id, due_date)
  WHERE returned_at IS NULL
    AND reminder_sent_at IS NULL;
