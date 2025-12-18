-- 20251218000003_add_kakao_notification_type.sql
-- notification_logs 테이블에 카카오 알림톡 타입 추가

-- message_channel ENUM에 새 값 추가
-- PostgreSQL에서 ENUM에 값을 추가하려면 ALTER TYPE ... ADD VALUE 사용
ALTER TYPE public.message_channel ADD VALUE IF NOT EXISTS 'lms';
ALTER TYPE public.message_channel ADD VALUE IF NOT EXISTS 'kakao';

-- 채널별 통계를 위한 인덱스 추가 (선택적)
CREATE INDEX IF NOT EXISTS idx_notif_logs_type_sent
ON public.notification_logs(notification_type, sent_at DESC)
WHERE status = 'sent';

COMMENT ON COLUMN public.notification_logs.notification_type IS 'sms: 단문 문자, lms: 장문 문자, kakao: 카카오 알림톡, email: 이메일';
