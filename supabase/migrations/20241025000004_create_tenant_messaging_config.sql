-- =====================================================================
-- Tenant Messaging Service Configuration
-- =====================================================================
-- Stores API credentials for messaging services (Aligo, etc.)
-- Each tenant manages their own credentials for cost and liability separation
-- =====================================================================

-- 1) Create ENUM for messaging providers
DO $$ BEGIN
  CREATE TYPE public.messaging_provider AS ENUM ('aligo', 'solapi', 'nhncloud');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Create table for messaging service configuration
CREATE TABLE IF NOT EXISTS public.tenant_messaging_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Provider selection
  provider    public.messaging_provider NOT NULL DEFAULT 'aligo',

  -- Aligo credentials (encrypted in application layer)
  aligo_user_id       TEXT,
  aligo_api_key       TEXT,
  aligo_sender_phone  TEXT,  -- 발신번호 (registered and verified with Aligo)

  -- Solapi credentials (for future support)
  solapi_api_key      TEXT,
  solapi_api_secret   TEXT,
  solapi_sender_phone TEXT,

  -- NHN Cloud credentials (for future support)
  nhncloud_app_key     TEXT,
  nhncloud_secret_key  TEXT,
  nhncloud_sender_phone TEXT,

  -- Configuration status
  is_active   BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,  -- Verified via test message

  -- Metadata
  last_test_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

COMMENT ON TABLE  public.tenant_messaging_config IS 'Tenant-specific messaging service API credentials';
COMMENT ON COLUMN public.tenant_messaging_config.provider IS 'SMS/알림톡 서비스 제공사';
COMMENT ON COLUMN public.tenant_messaging_config.is_active IS '서비스 활성화 여부';
COMMENT ON COLUMN public.tenant_messaging_config.is_verified IS '테스트 발송으로 인증 완료 여부';
COMMENT ON COLUMN public.tenant_messaging_config.aligo_sender_phone IS '알리고에 등록된 발신번호';

-- 3) Create indexes
CREATE INDEX IF NOT EXISTS idx_tenant_messaging_config_tenant
  ON public.tenant_messaging_config (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_messaging_config_active
  ON public.tenant_messaging_config (tenant_id, is_active)
  WHERE deleted_at IS NULL AND is_active = true;

-- 4) Grants
GRANT SELECT, INSERT, UPDATE ON public.tenant_messaging_config TO authenticated;

-- 5) RLS Policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='get_current_tenant_id'
  ) THEN
    ALTER TABLE public.tenant_messaging_config ENABLE ROW LEVEL SECURITY;

    -- Select policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='tenant_messaging_config'
        AND policyname='tenant_messaging_config_select_policy'
    ) THEN
      CREATE POLICY tenant_messaging_config_select_policy
        ON public.tenant_messaging_config
        FOR SELECT
        USING (tenant_id = get_current_tenant_id() AND deleted_at IS NULL);
    END IF;

    -- Insert policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='tenant_messaging_config'
        AND policyname='tenant_messaging_config_insert_policy'
    ) THEN
      CREATE POLICY tenant_messaging_config_insert_policy
        ON public.tenant_messaging_config
        FOR INSERT
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;

    -- Update policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='tenant_messaging_config'
        AND policyname='tenant_messaging_config_update_policy'
    ) THEN
      CREATE POLICY tenant_messaging_config_update_policy
        ON public.tenant_messaging_config
        FOR UPDATE
        USING (tenant_id = get_current_tenant_id() AND deleted_at IS NULL)
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;
  END IF;
END $$;

-- 6) Updated_at trigger
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger AS $func$
  BEGIN
    NEW.updated_at := now();
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_tenant_messaging_config_set_updated_at ON public.tenant_messaging_config;
  CREATE TRIGGER trg_tenant_messaging_config_set_updated_at
    BEFORE UPDATE ON public.tenant_messaging_config
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN others THEN NULL; END $$;

-- =====================================================================
-- END
-- =====================================================================
