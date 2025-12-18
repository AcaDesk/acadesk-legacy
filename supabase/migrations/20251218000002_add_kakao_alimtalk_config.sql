-- Migration: Add Kakao Alimtalk configuration support
-- Purpose: Enable Kakao channel registration and template management via Solapi API

-- ============================================================================
-- 1. Extend tenant_messaging_config table with Kakao-specific columns
-- ============================================================================

ALTER TABLE public.tenant_messaging_config
ADD COLUMN IF NOT EXISTS kakao_channel_id TEXT,
ADD COLUMN IF NOT EXISTS kakao_channel_search_id TEXT,
ADD COLUMN IF NOT EXISTS kakao_channel_name TEXT,
ADD COLUMN IF NOT EXISTS kakao_channel_status TEXT
  CHECK (kakao_channel_status IS NULL OR kakao_channel_status IN ('pending', 'active', 'suspended')),
ADD COLUMN IF NOT EXISTS kakao_sms_fallback_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS kakao_manual_fallback_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS kakao_channel_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenant_messaging_config.kakao_channel_id IS '솔라피에 등록된 카카오 채널 ID (pfId)';
COMMENT ON COLUMN public.tenant_messaging_config.kakao_channel_search_id IS '카카오톡 채널 검색 ID (@으로 시작)';
COMMENT ON COLUMN public.tenant_messaging_config.kakao_channel_name IS '카카오 비즈니스 채널 이름';
COMMENT ON COLUMN public.tenant_messaging_config.kakao_channel_status IS '채널 상태: pending(대기), active(활성), suspended(중지)';
COMMENT ON COLUMN public.tenant_messaging_config.kakao_sms_fallback_enabled IS '알림톡 실패 시 자동 SMS 전환 여부';
COMMENT ON COLUMN public.tenant_messaging_config.kakao_manual_fallback_enabled IS '수동 SMS 대체 발송 옵션 활성화';
COMMENT ON COLUMN public.tenant_messaging_config.kakao_channel_verified_at IS '채널 인증 완료 시간';

-- ============================================================================
-- 2. Create kakao_alimtalk_templates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kakao_alimtalk_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Solapi/Kakao identifiers
  solapi_template_id TEXT NOT NULL,
  kakao_template_code TEXT,
  channel_id        TEXT NOT NULL,

  -- Template metadata
  name              TEXT NOT NULL,
  content           TEXT NOT NULL,
  category_code     TEXT NOT NULL,

  -- Message type: BA(기본형), EX(부가정보형), AD(광고추가형), MI(복합형)
  message_type      TEXT NOT NULL DEFAULT 'BA'
    CHECK (message_type IN ('BA', 'EX', 'AD', 'MI')),

  -- Emphasis settings: NONE, TEXT, IMAGE, ITEM_LIST
  emphasize_type    TEXT NOT NULL DEFAULT 'NONE'
    CHECK (emphasize_type IN ('NONE', 'TEXT', 'IMAGE', 'ITEM_LIST')),
  emphasize_title   TEXT,
  emphasize_subtitle TEXT,

  -- Buttons (JSON array of button objects)
  buttons           JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Quick replies (JSON array)
  quick_replies     JSONB DEFAULT '[]'::jsonb,

  -- Additional content for certain message types
  extra_content     TEXT,
  ad_content        TEXT,

  -- Status tracking
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'inspecting', 'approved', 'rejected', 'suspended')),
  rejection_reason  TEXT,

  -- Security flag (개인정보 포함 여부)
  security_flag     BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  inspected_at      TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

COMMENT ON TABLE public.kakao_alimtalk_templates IS '카카오 알림톡 템플릿 (솔라피 연동)';
COMMENT ON COLUMN public.kakao_alimtalk_templates.solapi_template_id IS '솔라피 템플릿 ID';
COMMENT ON COLUMN public.kakao_alimtalk_templates.kakao_template_code IS '카카오 승인 템플릿 코드';
COMMENT ON COLUMN public.kakao_alimtalk_templates.channel_id IS '연결된 카카오 채널 ID (pfId)';
COMMENT ON COLUMN public.kakao_alimtalk_templates.message_type IS '메시지 유형: BA(기본형), EX(부가정보형), AD(광고추가형), MI(복합형)';
COMMENT ON COLUMN public.kakao_alimtalk_templates.emphasize_type IS '강조 유형: NONE, TEXT, IMAGE, ITEM_LIST';
COMMENT ON COLUMN public.kakao_alimtalk_templates.status IS '템플릿 상태: pending(대기), inspecting(검수중), approved(승인), rejected(반려), suspended(중지)';
COMMENT ON COLUMN public.kakao_alimtalk_templates.security_flag IS '보안 템플릿 여부 (개인정보 포함)';

-- ============================================================================
-- 3. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_kakao_templates_tenant
  ON public.kakao_alimtalk_templates (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kakao_templates_status
  ON public.kakao_alimtalk_templates (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kakao_templates_channel
  ON public.kakao_alimtalk_templates (tenant_id, channel_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_kakao_templates_solapi_id
  ON public.kakao_alimtalk_templates (tenant_id, solapi_template_id)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

ALTER TABLE public.kakao_alimtalk_templates ENABLE ROW LEVEL SECURITY;

-- Select policy: Users can view their tenant's templates
CREATE POLICY kakao_templates_select_policy
  ON public.kakao_alimtalk_templates
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Insert policy: Users can create templates for their tenant
CREATE POLICY kakao_templates_insert_policy
  ON public.kakao_alimtalk_templates
  FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

-- Update policy: Users can update their tenant's templates
CREATE POLICY kakao_templates_update_policy
  ON public.kakao_alimtalk_templates
  FOR UPDATE
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 5. Grants
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.kakao_alimtalk_templates TO authenticated;

-- ============================================================================
-- 6. Trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_kakao_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kakao_templates_updated_at_trigger ON public.kakao_alimtalk_templates;
CREATE TRIGGER kakao_templates_updated_at_trigger
  BEFORE UPDATE ON public.kakao_alimtalk_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_kakao_templates_updated_at();

-- ============================================================================
-- 7. Extend notification_logs for Alimtalk tracking
-- ============================================================================

ALTER TABLE public.notification_logs
ADD COLUMN IF NOT EXISTS kakao_template_id UUID REFERENCES public.kakao_alimtalk_templates(id),
ADD COLUMN IF NOT EXISTS fallback_type TEXT CHECK (fallback_type IS NULL OR fallback_type IN ('none', 'auto_sms', 'manual_sms')),
ADD COLUMN IF NOT EXISTS original_channel TEXT;

COMMENT ON COLUMN public.notification_logs.kakao_template_id IS '사용된 알림톡 템플릿 ID';
COMMENT ON COLUMN public.notification_logs.fallback_type IS 'SMS 대체 발송 유형: none, auto_sms, manual_sms';
COMMENT ON COLUMN public.notification_logs.original_channel IS '원래 발송 채널 (fallback 발생 시)';
