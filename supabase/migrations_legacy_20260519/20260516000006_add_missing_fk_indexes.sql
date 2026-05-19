-- 미인덱스 FK 컬럼 인덱스 추가
-- Supabase performance advisor (unindexed_foreign_keys) 27건 해결.
-- 효과: 부모 row 삭제/업데이트 시 FK 검증 풀스캔 방지, 조인 쿼리 가속.
--
-- 규칙:
--  - NOT NULL FK 컬럼: 일반 btree
--  - NULL 허용 FK 컬럼: partial (WHERE col IS NOT NULL) — NULL 다수 시 인덱스 크기 절약
--  - 복합 FK (tenant_id, col): 정확히 같은 순서로 복합 인덱스

-- ============================================================
-- NOT NULL FK
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attendance_student_id
  ON public.attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_id
  ON public.attendance_sessions(class_id);

CREATE INDEX IF NOT EXISTS idx_batch_drafts_created_by
  ON public.batch_drafts(created_by);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_by
  ON public.batch_jobs(created_by);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id
  ON public.class_enrollments(student_id);

CREATE INDEX IF NOT EXISTS idx_consultation_notes_created_by
  ON public.consultation_notes(created_by);

CREATE INDEX IF NOT EXISTS idx_consultation_participants_tenant_id
  ON public.consultation_participants(tenant_id);

CREATE INDEX IF NOT EXISTS idx_exam_scores_tenant_id
  ON public.exam_scores(tenant_id);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_tenant_id
  ON public.in_app_notifications(tenant_id);

CREATE INDEX IF NOT EXISTS idx_student_change_logs_student_id
  ON public.student_change_logs(student_id);

-- ============================================================
-- NULL 허용 FK — partial index
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_homework_submissions_graded_by
  ON public.homework_submissions(graded_by)
  WHERE graded_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_homework_submissions_submitted_by
  ON public.homework_submissions(submitted_by)
  WHERE submitted_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_kakao_template_id
  ON public.notification_logs(kakao_template_id)
  WHERE kakao_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_session_id
  ON public.notification_logs(session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_sends_kakao_template_id
  ON public.report_sends(kakao_template_id)
  WHERE kakao_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_sends_short_url_id
  ON public.report_sends(short_url_id)
  WHERE short_url_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_short_urls_report_send_id
  ON public.short_urls(report_send_id)
  WHERE report_send_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_invites_created_by
  ON public.staff_invites(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_activity_logs_created_by
  ON public.student_activity_logs(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_tasks_assigned_by
  ON public.student_tasks(assigned_by)
  WHERE assigned_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_tasks_verified_by
  ON public.student_tasks(verified_by)
  WHERE verified_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_todos_legacy_verified_by
  ON public.student_todos_legacy(verified_by)
  WHERE verified_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_responded_by
  ON public.support_tickets(responded_by)
  WHERE responded_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_role_code
  ON public.users(role_code)
  WHERE role_code IS NOT NULL;

-- ============================================================
-- 복합 FK — (tenant_id, target_col) 순서로 정확히 매칭
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_student_textbooks_tenant_textbook
  ON public.student_textbooks(tenant_id, textbook_id);

CREATE INDEX IF NOT EXISTS idx_textbook_progress_tenant_recorded_by
  ON public.textbook_progress(tenant_id, recorded_by);

CREATE INDEX IF NOT EXISTS idx_textbook_progress_tenant_textbook
  ON public.textbook_progress(tenant_id, textbook_id);
