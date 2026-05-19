-- 카카오 알림톡 도메인 미인덱스 FK 인덱스 추가
--
-- 배경:
--   - advisor: unindexed FK 검출. 부모 row 삭제/조회 시 풀스캔 위험.
--   - 카카오 템플릿/이벤트 구독 기능이 활성화되면 row 수 증가 예상 영역.
--
-- 대상:
--   - kakao_alimtalk_templates.shared_template_id (FK → kakao_shared_templates)
--   - tenant_event_subscriptions.kakao_template_id (FK → kakao_alimtalk_templates)
--   - tenant_event_subscriptions.shared_template_id (FK → kakao_shared_templates)
--
-- partial WHERE IS NOT NULL — FK 가 NULL 허용이라 NULL row 제외해 인덱스 사이즈 절감.

CREATE INDEX IF NOT EXISTS idx_kakao_alimtalk_templates_shared_template_id
  ON public.kakao_alimtalk_templates (shared_template_id)
  WHERE shared_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_event_subscriptions_kakao_template_id
  ON public.tenant_event_subscriptions (kakao_template_id)
  WHERE kakao_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_event_subscriptions_shared_template_id
  ON public.tenant_event_subscriptions (shared_template_id)
  WHERE shared_template_id IS NOT NULL;
