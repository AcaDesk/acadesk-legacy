-- 20251218000004_add_kakao_to_report_sends.sql
-- report_sends 테이블에 카카오 알림톡 메시지 타입 추가

-- message_type CHECK 제약조건 수정
ALTER TABLE public.report_sends
DROP CONSTRAINT IF EXISTS report_sends_message_type_check;

ALTER TABLE public.report_sends
ADD CONSTRAINT report_sends_message_type_check
CHECK (message_type IN ('SMS', 'LMS', 'KAKAO'));

ALTER TABLE public.report_sends
ADD COLUMN IF NOT EXISTS kakao_template_id UUID REFERENCES public.kakao_alimtalk_templates(id),
ADD COLUMN IF NOT EXISTS message_variables JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.report_sends.message_type IS 'SMS: 단문 문자, LMS: 장문 문자, KAKAO: 카카오 알림톡';
COMMENT ON COLUMN public.report_sends.kakao_template_id IS '리포트 알림톡 발송에 사용한 템플릿 ID';
COMMENT ON COLUMN public.report_sends.message_variables IS '알림톡 발송 시 사용한 변수 스냅샷';
