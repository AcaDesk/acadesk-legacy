BEGIN;

-- ============================================================================
-- 1) report_sends
--    (short_url_id는 나중에 short_urls 만든 뒤 FK 추가)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.report_sends (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  report_id         uuid NOT NULL,

  -- 수신자
  recipient_type    text NOT NULL CHECK (recipient_type IN ('guardian','student')),
  recipient_id      uuid NOT NULL,
  recipient_phone   text NOT NULL,
  recipient_name    text NOT NULL,

  -- 공유 링크 (UUID 기반)
  share_link_id     uuid NOT NULL DEFAULT gen_random_uuid(),
  link_expires_at   timestamptz NULL,
  short_url_id      uuid NULL,    -- FK는 나중에 추가

  -- 발송 정보
  message_body      text NOT NULL,
  message_type      text NOT NULL DEFAULT 'SMS' CHECK (message_type IN ('SMS','LMS')),
  aligo_msgid       text NULL,
  send_status       text NOT NULL DEFAULT 'pending' CHECK (send_status IN ('pending','sent','failed','delivered')),
  sent_at           timestamptz NULL,
  delivered_at      timestamptz NULL,

  -- 재발송 추적
  retry_count       int  NOT NULL DEFAULT 0,
  last_retry_at     timestamptz NULL,

  -- 메타
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz NULL,

  -- FK
  CONSTRAINT report_sends_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT report_sends_report_id_fkey
    FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE
);

-- 인덱스 (부분 인덱스 포함)
CREATE INDEX IF NOT EXISTS idx_report_sends_tenant
  ON public.report_sends(tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_report_sends_report
  ON public.report_sends(report_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_report_sends_recipient
  ON public.report_sends(recipient_id, recipient_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_report_sends_status
  ON public.report_sends(send_status, sent_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_report_sends_share_link
  ON public.report_sends(share_link_id)
  WHERE deleted_at IS NULL;


-- ============================================================================
-- 2) short_urls
--    report_sends가 먼저 있으므로 report_send_id FK 바로 가능
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.short_urls (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,

  short_code        text NOT NULL UNIQUE,       -- 예: abc123
  target_url        text NOT NULL,
  report_send_id    uuid NULL,

  click_count       int  NOT NULL DEFAULT 0,
  first_clicked_at  timestamptz NULL,
  last_clicked_at   timestamptz NULL,

  expires_at        timestamptz NULL,
  is_active         boolean NOT NULL DEFAULT true,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz NULL,

  CONSTRAINT short_urls_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,

  CONSTRAINT short_urls_report_send_id_fkey
    FOREIGN KEY (report_send_id) REFERENCES public.report_sends(id) ON DELETE SET NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_short_urls_short_code
  ON public.short_urls(short_code)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_short_urls_tenant
  ON public.short_urls(tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_short_urls_expires_at
  ON public.short_urls(expires_at)
  WHERE deleted_at IS NULL AND expires_at IS NOT NULL;

-- 이제 report_sends.short_url_id -> short_urls.id FK 추가 (존재하지 않을 때만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'report_sends_short_url_id_fkey'
  ) THEN
    ALTER TABLE public.report_sends
      ADD CONSTRAINT report_sends_short_url_id_fkey
      FOREIGN KEY (short_url_id) REFERENCES public.short_urls(id)
      ON DELETE SET NULL;
  END IF;
END $$;


-- ============================================================================
-- 3) report_reads
--    열람 로그(보고서, 발송건과 연결)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.report_reads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  report_id         uuid NOT NULL,
  report_send_id    uuid NOT NULL,

  user_id           uuid NULL,              -- 로그인한 경우
  user_type         text NULL CHECK (user_type IN ('guardian','student')),

  read_at           timestamptz NOT NULL DEFAULT now(),
  ip_address        inet NULL,
  user_agent        text NULL,
  referrer          text NULL,

  pdf_downloaded    boolean NOT NULL DEFAULT false,
  pdf_downloaded_at timestamptz NULL,

  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT report_reads_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT report_reads_report_id_fkey
    FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE,
  CONSTRAINT report_reads_report_send_id_fkey
    FOREIGN KEY (report_send_id) REFERENCES public.report_sends(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_report_reads_tenant
  ON public.report_reads(tenant_id);

CREATE INDEX IF NOT EXISTS idx_report_reads_report
  ON public.report_reads(report_id);

CREATE INDEX IF NOT EXISTS idx_report_reads_report_send
  ON public.report_reads(report_send_id);

CREATE INDEX IF NOT EXISTS idx_report_reads_read_at
  ON public.report_reads(read_at DESC);


-- ============================================================================
-- 4) RLS 비활성화 (service_role 서버 전용 접근)
-- ============================================================================

ALTER TABLE public.report_sends  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_urls    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_reads  DISABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 5) 권한: service_role 부여 (이미 했다면 스킵 가능)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- (선택) anon/authenticated를 완전히 차단하고 싶다면 주석 해제
-- REVOKE ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public FROM anon;
-- REVOKE ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public FROM authenticated;
-- REVOKE USAGE       ON SCHEMA public    FROM anon;
-- REVOKE USAGE       ON SCHEMA public    FROM authenticated;


-- ============================================================================
-- 6) 코멘트(선택)
-- ============================================================================
COMMENT ON TABLE  public.report_sends  IS '리포트 문자 발송 이력 및 공유 링크 관리';
COMMENT ON COLUMN public.report_sends.share_link_id IS '공유 링크 고유 ID (UUID 기반)';
COMMENT ON COLUMN public.report_sends.link_expires_at IS '링크 만료일 (null이면 무제한)';
COMMENT ON COLUMN public.report_sends.aligo_msgid   IS '알리고 API 응답 msgid (발송 추적용)';

COMMENT ON TABLE  public.report_reads  IS '리포트 열람 로그 (클릭 추적)';
COMMENT ON COLUMN public.report_reads.ip_address     IS '열람자 IP 주소';

COMMENT ON TABLE  public.short_urls    IS '단축 URL 매핑 테이블';
COMMENT ON COLUMN public.short_urls.short_code       IS '단축 코드 (예: abc123)';
COMMENT ON COLUMN public.short_urls.click_count      IS '클릭 수 (통계용)';

COMMIT;