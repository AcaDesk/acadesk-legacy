-- =====================================================================
-- Message & Notification System (final, idempotent)
-- =====================================================================
-- - ENUM types
-- - Tables: message_templates, notification_logs
-- - Indexes
-- - Grants
-- - RLS (guarded by existence of get_current_tenant_id())
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) ENUMS  (create-if-not-exists via DO...EXCEPTION)
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.message_channel AS ENUM ('sms','email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('pending','sent','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_category AS ENUM ('general','report','todo','attendance','event');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 1) TABLES
-- ---------------------------------------------------------------------

-- 1-1) 메시지 템플릿
CREATE TABLE IF NOT EXISTS public.message_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name        TEXT NOT NULL,
  content     TEXT NOT NULL,
  type        public.message_channel NOT NULL,          -- 'sms' | 'email'
  category    public.message_category NOT NULL,         -- 'general' | 'report' | ...

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

COMMENT ON TABLE  public.message_templates IS '메시지 템플릿 관리';
COMMENT ON COLUMN public.message_templates.type     IS '전송 채널: sms / email';
COMMENT ON COLUMN public.message_templates.category IS '카테고리: general, report, todo, attendance, event';

-- 1-2) 알림 전송 로그
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  -- (선택) 세션 연계가 있다면 유지, 없어도 NULL 허용
  session_id        UUID REFERENCES public.attendance_sessions(id) ON DELETE SET NULL,

  notification_type public.message_channel NOT NULL,  -- 'sms' | 'email'
  message           TEXT NOT NULL,
  subject           TEXT,                              -- email 제목용(옵션)

  status            public.notification_status NOT NULL DEFAULT 'pending',
  error_message     TEXT,

  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.notification_logs IS '알림 전송 로그';
COMMENT ON COLUMN public.notification_logs.notification_type IS '전송 채널: sms / email';
COMMENT ON COLUMN public.notification_logs.status            IS '전송 상태: pending / sent / failed';

-- ---------------------------------------------------------------------
-- 2) INDEXES
-- ---------------------------------------------------------------------

-- message_templates
CREATE INDEX IF NOT EXISTS idx_message_templates_tenant
  ON public.message_templates (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_templates_type
  ON public.message_templates (tenant_id, type, category)
  WHERE deleted_at IS NULL;

-- 템플릿명 유니크 (소프트삭제 제외)
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_templates_tenant_name_unique
  ON public.message_templates (tenant_id, name)
  WHERE deleted_at IS NULL;

-- notification_logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_tenant_time
  ON public.notification_logs (tenant_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_student
  ON public.notification_logs (student_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status
  ON public.notification_logs (tenant_id, status, sent_at DESC);

-- ---------------------------------------------------------------------
-- 3) GRANTS (권한)  ※ RLS가 켜지면 policy도 만족해야 조회/쓰기 가능
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates  TO authenticated;
GRANT SELECT, INSERT              ON public.notification_logs     TO authenticated;

-- ---------------------------------------------------------------------
-- 4) RLS (get_current_tenant_id() 존재 시에만 설정)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='get_current_tenant_id'
  ) THEN
    -- Enable RLS (여러 번 실행해도 안전)
    ALTER TABLE public.message_templates  ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.notification_logs  ENABLE ROW LEVEL SECURITY;

    -- -----------------------------
    -- message_templates policies
    -- -----------------------------
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='message_templates'
        AND policyname='message_templates_select_policy'
    ) THEN
      CREATE POLICY message_templates_select_policy
        ON public.message_templates
        FOR SELECT
        USING (tenant_id = get_current_tenant_id() AND deleted_at IS NULL);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='message_templates'
        AND policyname='message_templates_insert_policy'
    ) THEN
      CREATE POLICY message_templates_insert_policy
        ON public.message_templates
        FOR INSERT
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='message_templates'
        AND policyname='message_templates_update_policy'
    ) THEN
      CREATE POLICY message_templates_update_policy
        ON public.message_templates
        FOR UPDATE
        USING (tenant_id = get_current_tenant_id() AND deleted_at IS NULL)
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='message_templates'
        AND policyname='message_templates_delete_policy'
    ) THEN
      CREATE POLICY message_templates_delete_policy
        ON public.message_templates
        FOR DELETE
        USING (tenant_id = get_current_tenant_id());
    END IF;

    -- -----------------------------
    -- notification_logs policies
    -- -----------------------------
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='notification_logs'
        AND policyname='notification_logs_select_policy'
    ) THEN
      CREATE POLICY notification_logs_select_policy
        ON public.notification_logs
        FOR SELECT
        USING (tenant_id = get_current_tenant_id());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='notification_logs'
        AND policyname='notification_logs_insert_policy'
    ) THEN
      CREATE POLICY notification_logs_insert_policy
        ON public.notification_logs
        FOR INSERT
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5) (선택) updated_at 자동 갱신 트리거  — 필요 시 사용
-- ---------------------------------------------------------------------
-- DO $$ BEGIN
--   CREATE OR REPLACE FUNCTION public.set_updated_at()
--   RETURNS trigger AS $$
--   BEGIN
--     NEW.updated_at := now();
--     RETURN NEW;
--   END;
--   $$ LANGUAGE plpgsql;
--
--   DROP TRIGGER IF EXISTS trg_message_templates_set_updated_at ON public.message_templates;
--   CREATE TRIGGER trg_message_templates_set_updated_at
--     BEFORE UPDATE ON public.message_templates
--     FOR EACH ROW
--     EXECUTE FUNCTION public.set_updated_at();
-- EXCEPTION WHEN others THEN NULL; END $$;

-- =====================================================================
-- END
-- =====================================================================