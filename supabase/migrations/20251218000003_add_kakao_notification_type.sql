-- 20251218000003_add_kakao_notification_type.sql
-- notification_logs 테이블에 카카오 알림톡 타입 추가

-- notification_logs.notification_type은 환경에 따라 text CHECK 또는 message_channel ENUM일 수 있다.
-- 양쪽 모두에서 lms/mms/kakao 로그를 허용하도록 보정한다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'message_channel'
  ) THEN
    ALTER TYPE public.message_channel ADD VALUE IF NOT EXISTS 'lms';
    ALTER TYPE public.message_channel ADD VALUE IF NOT EXISTS 'mms';
    ALTER TYPE public.message_channel ADD VALUE IF NOT EXISTS 'kakao';
  END IF;
END $$;

ALTER TABLE public.notification_logs
DROP CONSTRAINT IF EXISTS notification_logs_notification_type_check;

ALTER TABLE public.notification_logs
DROP CONSTRAINT IF EXISTS notification_logs_notification_type_check1;

ALTER TABLE public.notification_logs
ADD CONSTRAINT notification_logs_notification_type_check
CHECK (notification_type::text IN ('sms', 'lms', 'mms', 'kakao', 'email'));

-- 채널별 통계를 위한 인덱스 추가 (선택적)
CREATE INDEX IF NOT EXISTS idx_notif_logs_type_sent
ON public.notification_logs(notification_type, sent_at DESC)
WHERE status = 'sent';

COMMENT ON COLUMN public.notification_logs.notification_type IS 'sms: 단문 문자, lms: 장문 문자, mms: 멀티미디어 문자, kakao: 카카오 알림톡, email: 이메일';
