-- Migration: shared_alimtalk_templates 에 recipients 컬럼 추가
--
-- 이벤트 알림 설정 UI(테이블 뷰)에서 "수신 대상" 컬럼을 표시하기 위함.
-- 값은 사람이 읽는 라벨 배열로, 실제 발송 경로(보호자)는 변경하지 않는다.
-- 예: ['보호자'], ['학생', '보호자'], ['전체 수신자']
--
-- 기본값을 비어있지 않은 배열로 두기 위해 ['보호자']를 default 로 잡고,
-- 이미 시드된 22개 템플릿에 대해 적절한 라벨을 채워준다.

ALTER TABLE public.shared_alimtalk_templates
  ADD COLUMN IF NOT EXISTS recipients JSONB NOT NULL DEFAULT '["보호자"]'::jsonb;

COMMENT ON COLUMN public.shared_alimtalk_templates.recipients IS
  '이벤트 알림 UI에서 표시할 수신 대상 라벨 배열 (학생/보호자/직원/전체 등). 실제 발송 경로 제어용 아님.';

-- 기존 시드 템플릿의 수신 대상 라벨 업데이트
UPDATE public.shared_alimtalk_templates SET recipients = '["학생", "보호자"]'::jsonb
  WHERE event_type IN (
    'homework_assigned',
    'homework_deadline',
    'exam_scheduled',
    'exam_grade_ready',
    'retest_required',
    'makeup_class_scheduled',
    'class_schedule_changed'
  );

UPDATE public.shared_alimtalk_templates SET recipients = '["전체 수신자"]'::jsonb
  WHERE event_type IN ('academy_closure_notice');

-- 나머지 (등하원/출결/리포트/상담/결제/도서/입퇴원)는 default('보호자')를 그대로 사용.
