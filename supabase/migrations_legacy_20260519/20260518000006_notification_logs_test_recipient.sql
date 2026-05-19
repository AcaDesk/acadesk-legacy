-- ============================================================================
-- notification_logs: 테스트 발송 마커 및 수신자 정보 컬럼 추가
-- ============================================================================
-- 메시지 관리 페이지에서 테스트 발송과 일반 발송을 구분하고,
-- 학생이 연결되지 않은(테스트/직접 발송) 로그에서도 수신자를 추적할 수 있도록 함.

ALTER TABLE public.notification_logs
ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS recipient_phone TEXT;

COMMENT ON COLUMN public.notification_logs.is_test IS '테스트 발송 여부 (설정 페이지의 테스트 발송 등)';
COMMENT ON COLUMN public.notification_logs.recipient_name IS '수신자 이름 (학생/보호자 연결 없이 발송된 경우 추적용)';
COMMENT ON COLUMN public.notification_logs.recipient_phone IS '수신자 전화번호 (학생/보호자 연결 없이 발송된 경우 추적용)';

-- 테스트 발송만 빠르게 필터링하기 위한 부분 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_logs_test
  ON public.notification_logs(tenant_id, sent_at DESC)
  WHERE is_test = true;
