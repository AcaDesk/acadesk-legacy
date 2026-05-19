-- Migration: Shared Alimtalk Templates + Event Subscription System
-- Purpose: 공용 알림톡 템플릿 + 학원별 이벤트 구독 시스템
--   - 아카데스크가 관리하는 공용 템플릿 테이블
--   - 학원별 이벤트 구독 + 프로비저닝 상태 추적 테이블
--   - 기존 kakao_alimtalk_templates에 shared_template 연결 컬럼 추가

-- ============================================================================
-- 1. Create shared_alimtalk_templates table (플랫폼 레벨)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shared_alimtalk_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이벤트 식별자 (unique)
  event_type        TEXT NOT NULL UNIQUE,

  -- 템플릿 메타데이터
  name              TEXT NOT NULL,
  description       TEXT,

  -- 템플릿 내용 (#{변수명} 포맷)
  content           TEXT NOT NULL,
  category_code     TEXT NOT NULL,

  -- 메시지 유형
  message_type      TEXT NOT NULL DEFAULT 'BA'
    CHECK (message_type IN ('BA', 'EX', 'AD', 'MI')),
  emphasize_type    TEXT NOT NULL DEFAULT 'NONE'
    CHECK (emphasize_type IN ('NONE', 'TEXT', 'IMAGE', 'ITEM_LIST')),
  emphasize_title   TEXT,
  emphasize_subtitle TEXT,

  -- 버튼, 빠른 응답
  buttons           JSONB NOT NULL DEFAULT '[]'::jsonb,
  quick_replies     JSONB DEFAULT '[]'::jsonb,

  -- 변수 목록 (예: ["학생명", "학원명", "날짜"])
  variables         JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 설정
  security_flag     BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  version           INTEGER NOT NULL DEFAULT 1,

  -- 타임스탬프
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shared_alimtalk_templates IS '아카데스크 공용 알림톡 템플릿 (플랫폼 관리)';
COMMENT ON COLUMN public.shared_alimtalk_templates.event_type IS '이벤트 식별자 (check_in, absence_detected 등)';
COMMENT ON COLUMN public.shared_alimtalk_templates.content IS '템플릿 본문 (#{변수명} 포맷)';
COMMENT ON COLUMN public.shared_alimtalk_templates.variables IS '템플릿에서 사용하는 변수 이름 목록 (JSON 배열)';
COMMENT ON COLUMN public.shared_alimtalk_templates.is_active IS '활성 여부 (false면 학원에 노출되지 않음)';
COMMENT ON COLUMN public.shared_alimtalk_templates.version IS '템플릿 버전 (내용 변경 시 증가)';

-- RLS: 인증된 사용자는 조회만 가능, 수정은 service_role만
ALTER TABLE public.shared_alimtalk_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shared_templates_select_policy ON public.shared_alimtalk_templates;
CREATE POLICY shared_templates_select_policy
  ON public.shared_alimtalk_templates
  FOR SELECT
  USING (true);

GRANT SELECT ON public.shared_alimtalk_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_alimtalk_templates TO service_role;

-- updated_at 트리거
CREATE OR REPLACE FUNCTION update_shared_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shared_templates_updated_at_trigger ON public.shared_alimtalk_templates;
CREATE TRIGGER shared_templates_updated_at_trigger
  BEFORE UPDATE ON public.shared_alimtalk_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_templates_updated_at();

-- ============================================================================
-- 2. Create tenant_event_subscriptions table (학원별)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_event_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  shared_template_id  UUID NOT NULL REFERENCES public.shared_alimtalk_templates(id),
  event_type          TEXT NOT NULL,

  -- 이벤트 활성화 여부
  is_enabled          BOOLEAN NOT NULL DEFAULT false,

  -- 프로비저닝 상태 (솔라피 템플릿 등록 + 카카오 검수)
  provisioning_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (provisioning_status IN (
      'not_started',   -- 미등록
      'provisioning',  -- 솔라피 등록 중
      'inspecting',    -- 카카오 검수 중
      'approved',      -- 승인됨 (발송 가능)
      'rejected',      -- 반려됨
      'failed'         -- 등록 실패
    )),

  -- 프로비저닝된 학원별 템플릿 ID
  kakao_template_id   UUID REFERENCES public.kakao_alimtalk_templates(id),

  -- 반려/실패 사유
  rejection_reason    TEXT,

  -- 프로비저닝 시각
  last_provisioned_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, event_type)
);

COMMENT ON TABLE public.tenant_event_subscriptions IS '학원별 이벤트 알림톡 구독 설정';
COMMENT ON COLUMN public.tenant_event_subscriptions.provisioning_status IS '솔라피 템플릿 등록 + 카카오 검수 상태';
COMMENT ON COLUMN public.tenant_event_subscriptions.kakao_template_id IS '프로비저닝된 학원별 kakao_alimtalk_templates ID';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_event_subs_tenant
  ON public.tenant_event_subscriptions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_event_subs_enabled
  ON public.tenant_event_subscriptions (tenant_id, is_enabled)
  WHERE is_enabled = true AND provisioning_status = 'approved';

-- RLS: 학원별 격리
ALTER TABLE public.tenant_event_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_subs_select_policy ON public.tenant_event_subscriptions;
CREATE POLICY event_subs_select_policy
  ON public.tenant_event_subscriptions
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS event_subs_insert_policy ON public.tenant_event_subscriptions;
CREATE POLICY event_subs_insert_policy
  ON public.tenant_event_subscriptions
  FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS event_subs_update_policy ON public.tenant_event_subscriptions;
CREATE POLICY event_subs_update_policy
  ON public.tenant_event_subscriptions
  FOR UPDATE
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.tenant_event_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_event_subscriptions TO service_role;

-- updated_at 트리거
CREATE OR REPLACE FUNCTION update_event_subs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_subs_updated_at_trigger ON public.tenant_event_subscriptions;
CREATE TRIGGER event_subs_updated_at_trigger
  BEFORE UPDATE ON public.tenant_event_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_event_subs_updated_at();

-- ============================================================================
-- 3. Extend kakao_alimtalk_templates with shared template link
-- ============================================================================

ALTER TABLE public.kakao_alimtalk_templates
ADD COLUMN IF NOT EXISTS shared_template_id UUID REFERENCES public.shared_alimtalk_templates(id),
ADD COLUMN IF NOT EXISTS shared_template_version INTEGER;

COMMENT ON COLUMN public.kakao_alimtalk_templates.shared_template_id IS '연결된 공용 템플릿 ID (자동 프로비저닝된 경우)';
COMMENT ON COLUMN public.kakao_alimtalk_templates.shared_template_version IS '프로비저닝 시점의 공용 템플릿 버전';

-- ============================================================================
-- 4. Extend notification_logs with event_type
-- ============================================================================

ALTER TABLE public.notification_logs
ADD COLUMN IF NOT EXISTS event_type TEXT;

COMMENT ON COLUMN public.notification_logs.event_type IS '이벤트 알림톡 발송 시 이벤트 유형';

-- ============================================================================
-- 5. Seed shared templates (공용 알림톡 템플릿)
-- ============================================================================
-- 카카오 알림톡 검수 가이드 준수:
--   - 정보성 메시지(BA) 위주
--   - 광고 문구 불포함
--   - #{변수명} 포맷 사용
--   - 1000자 이내

INSERT INTO public.shared_alimtalk_templates (event_type, name, description, content, category_code, message_type, variables, is_active) VALUES

-- 등원 알림
('check_in',
 '등원 알림',
 '학생이 키오스크에서 등원 체크인 시 보호자에게 발송',
 '[#{학원명}] 등원 안내

안녕하세요, #{보호자명}님.
#{학생명} 학생이 #{시간}에 등원하였습니다.

감사합니다.',
 '006001',  -- 교육/학원
 'BA',
 '["학원명", "보호자명", "학생명", "시간"]'::jsonb,
 true),

-- 하원 알림
('check_out',
 '하원 알림',
 '학생이 키오스크에서 하원 체크아웃 시 보호자에게 발송',
 '[#{학원명}] 하원 안내

안녕하세요, #{보호자명}님.
#{학생명} 학생이 #{시간}에 하원하였습니다.

감사합니다.',
 '006001',
 'BA',
 '["학원명", "보호자명", "학생명", "시간"]'::jsonb,
 true),

-- 출석 확인 알림
('attendance_confirmed',
 '출석 확인 알림',
 '출석 처리 완료 시 보호자에게 발송',
 '[#{학원명}] 출석 안내

안녕하세요, #{보호자명}님.
#{학생명} 학생이 #{날짜} 수업에 출석하였습니다.

감사합니다.',
 '006001',
 'BA',
 '["학원명", "보호자명", "학생명", "날짜"]'::jsonb,
 true),

-- 결석 알림
('absence_detected',
 '결석 알림',
 '결석 처리 시 보호자에게 발송',
 '[#{학원명}] 결석 안내

안녕하세요, #{보호자명}님.
#{학생명} 학생이 #{날짜} 수업에 결석하였습니다.

확인이 필요하시면 학원으로 연락 부탁드립니다.
#{학원연락처}',
 '006001',
 'BA',
 '["학원명", "보호자명", "학생명", "날짜", "학원연락처"]'::jsonb,
 true),

-- 숙제 등록 안내
('homework_assigned',
 '숙제 등록 안내',
 '새 숙제가 배정되었을 때 보호자에게 발송',
 '[#{학원명}] 숙제 안내

안녕하세요, #{보호자명}님.
#{학생명} 학생에게 새로운 숙제가 등록되었습니다.

과목: #{과목명}
숙제: #{숙제명}
마감일: #{마감일}

감사합니다.',
 '006001',
 'BA',
 '["학원명", "보호자명", "학생명", "과목명", "숙제명", "마감일"]'::jsonb,
 true),

-- 숙제 마감 안내
('homework_deadline',
 '숙제 마감 안내',
 '숙제 마감일 전날 보호자에게 리마인더 발송',
 '[#{학원명}] 숙제 마감 안내

안녕하세요, #{보호자명}님.
#{학생명} 학생의 숙제 마감일이 내일입니다.

숙제: #{숙제명}
마감일: #{마감일}

확인 부탁드립니다. 감사합니다.',
 '006001',
 'BA',
 '["학원명", "보호자명", "학생명", "숙제명", "마감일"]'::jsonb,
 true),

-- 월말 리포트 준비 완료
('monthly_report_ready',
 '월말 리포트 안내',
 '학습 리포트 발송 시 보호자에게 안내',
 '[#{학원명}] 학습 리포트 안내

안녕하세요, #{보호자명}님.
#{학생명} 학생의 #{기간} 학습 리포트가 준비되었습니다.

아래 링크에서 확인하실 수 있습니다.
#{리포트링크}

감사합니다.',
 '006001',
 'BA',
 '["학원명", "보호자명", "학생명", "기간", "리포트링크"]'::jsonb,
 true),

-- 상담 일정 확정
('consultation_scheduled',
 '상담 일정 안내',
 '상담 일정이 확정되었을 때 보호자에게 발송',
 '[#{학원명}] 상담 일정 안내

안녕하세요, #{보호자명}님.
#{학생명} 학생 관련 상담 일정이 확정되었습니다.

일시: #{상담일시}
담당: #{담당자명}

변경이 필요하시면 학원으로 연락 부탁드립니다.
#{학원연락처}',
 '006001',
 'BA',
 '["학원명", "보호자명", "학생명", "상담일시", "담당자명", "학원연락처"]'::jsonb,
 true),

-- 결제 완료 안내 (결제 모듈 미구현 — 비활성)
('payment_confirmed',
 '결제 완료 안내',
 '결제 완료 시 보호자에게 발송 (결제 모듈 구축 후 활성화)',
 '[#{학원명}] 결제 완료 안내

안녕하세요, #{보호자명}님.
#{학생명} 학생의 수강료 결제가 완료되었습니다.

결제 금액: #{결제금액}
결제일: #{결제일}

감사합니다.',
 '006001',
 'BA',
 '["학원명", "보호자명", "학생명", "결제금액", "결제일"]'::jsonb,
 false),

-- 미납 안내 (결제 모듈 미구현 — 비활성)
('payment_overdue',
 '미납 안내',
 '수강료 미납 시 보호자에게 발송 (결제 모듈 구축 후 활성화)',
 '[#{학원명}] 수강료 안내

안녕하세요, #{보호자명}님.
#{학생명} 학생의 #{납부월} 수강료 납부가 확인되지 않았습니다.

납부 금액: #{납부금액}
납부 기한: #{납부기한}

확인 부탁드립니다. 감사합니다.
#{학원연락처}',
 '006001',
 'BA',
 '["학원명", "보호자명", "학생명", "납부월", "납부금액", "납부기한", "학원연락처"]'::jsonb,
 false)
ON CONFLICT (event_type) DO NOTHING;
