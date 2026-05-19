-- RLS 활성화 — server-only 테이블 (옵션 E1 - Part 2)
--
-- 대상: Server Action(service_role) 경유로만 접근하는 32개 테이블.
-- service_role 은 BYPASSRLS 권한이라 기존 동작 영향 없음.
-- anon/authenticated 직접 접근 시 모두 차단 (정책 없으므로) — 안전망 추가.
--
-- 제외 (anon 접근 있어 별도 정책 필요):
--   short_urls, report_sends, reports, report_reads → 별도 마이그레이션
--
-- in_app_notifications 는 이미 RLS 활성화 + Realtime 정책 보유.

ALTER TABLE public.book_lendings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_scores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_roles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invites              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_schedules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_textbooks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_todos_legacy       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_resources         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_codes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_messaging_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.textbook_progress          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.textbook_units             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.textbooks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                      ENABLE ROW LEVEL SECURITY;
