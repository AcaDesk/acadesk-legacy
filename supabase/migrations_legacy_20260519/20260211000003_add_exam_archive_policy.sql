-- Add exam archive support for grade-entry UX
-- Archived exams are hidden from default grade-entry/list views and can be restored if needed.

ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.exams.archived_at IS
'시험 아카이브 시각. 값이 있으면 기본 목록/성적입력에서 숨김 처리';

CREATE INDEX IF NOT EXISTS idx_exams_archived_at
  ON public.exams (tenant_id, archived_at, status, exam_date)
  WHERE deleted_at IS NULL;
