-- Realtime publication 정상화: in_app_notifications 추가
--
-- 배경 (2026-05-18 진단):
--   - 클라이언트(notification-popover.tsx:92)는 in_app_notifications INSERT 를
--     postgres_changes 로 구독 중 (filter: user_id=eq.<userId>)
--   - 그러나 supabase_realtime publication 에 등록된 테이블이 0건이라
--     실제 broadcast 이벤트가 전달되지 않음 — 실시간 알림 UX 미작동 상태.
--   - RLS 정책 SELECT: user_id = auth.uid() 정상. broadcast 시 본인 row만 전달됨.
--   - INSERT 이벤트는 replica_identity 와 무관하게 모든 컬럼이 WAL 에 기록되므로
--     현재 default(=PRIMARY KEY) 그대로 OK.

-- ALTER PUBLICATION ... ADD TABLE 은 idempotent 하지 않으므로
-- pg_publication_tables 로 멤버 여부 확인 후 조건부 실행.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'in_app_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
  END IF;
END
$$;
