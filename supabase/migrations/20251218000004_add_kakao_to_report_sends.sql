-- 20251218000004_add_kakao_to_report_sends.sql
-- report_sends 테이블에 카카오 알림톡 메시지 타입 추가

-- message_type CHECK 제약조건 수정
ALTER TABLE public.report_sends
DROP CONSTRAINT IF EXISTS report_sends_message_type_check;

ALTER TABLE public.report_sends
ADD CONSTRAINT report_sends_message_type_check
CHECK (message_type IN ('SMS', 'LMS', 'KAKAO'));

COMMENT ON COLUMN public.report_sends.message_type IS 'SMS: 단문 문자, LMS: 장문 문자, KAKAO: 카카오 알림톡';
