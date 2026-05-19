-- 20260303000002_add_system_announcements.sql
-- AcaDesk 플랫폼 공지용 system_announcements 테이블 생성
-- UI 연동은 Phase 2에서 진행 — 이번엔 스키마만 생성

-- =============================================================================
-- 1. 테이블 생성
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.system_announcements (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  message      text        NOT NULL,
  type         text        NOT NULL DEFAULT 'notice'
               CHECK (type IN ('update', 'notice', 'maintenance')),
  is_active    boolean     NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. updated_at 자동 갱신 트리거
-- =============================================================================

DROP TRIGGER IF EXISTS trg_system_announcements_updated_at ON public.system_announcements;
CREATE TRIGGER trg_system_announcements_updated_at
  BEFORE UPDATE ON public.system_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 3. RLS
-- =============================================================================

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Service role can manage announcements"              ON public.system_announcements;

-- 인증 사용자 전체가 활성 공지 SELECT 가능
CREATE POLICY "Authenticated users can view active announcements"
  ON public.system_announcements
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- service_role만 INSERT/UPDATE 가능 (RLS 우회)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.system_announcements
  TO service_role;

GRANT SELECT
  ON public.system_announcements
  TO authenticated;

-- =============================================================================
-- 4. 인덱스
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_system_announcements_active
  ON public.system_announcements (published_at DESC)
  WHERE is_active = true;
