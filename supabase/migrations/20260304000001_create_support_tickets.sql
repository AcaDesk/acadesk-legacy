-- ============================================
-- support_tickets: 문의/버그 제보/피드백 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES auth.users(id),

  -- 공통 필드
  ticket_type text NOT NULL CHECK (ticket_type IN ('inquiry', 'bug_report', 'feedback')),
  category    text,
  subject     text NOT NULL,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),

  -- 버그 제보 전용
  severity          text CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  page              text,
  steps_to_reproduce text,
  browser           text,

  -- 답변
  response      text,
  responded_at  timestamptz,
  responded_by  uuid REFERENCES auth.users(id),

  -- 표준 타임스탬프
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- 인덱스
CREATE INDEX idx_support_tickets_tenant    ON support_tickets(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_support_tickets_user      ON support_tickets(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_support_tickets_status    ON support_tickets(tenant_id, status) WHERE deleted_at IS NULL;

-- updated_at 자동 갱신 트리거
CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- RLS 정책
-- ============================================
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- 본인 티켓 조회
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
  );

-- 같은 테넌트 직원은 모든 티켓 조회
CREATE POLICY "Staff can view tenant tickets"
  ON support_tickets FOR SELECT
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    AND deleted_at IS NULL
  );

-- 본인 티켓 생성
CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- 본인 티켓 수정 (삭제 등)
CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
  );

-- Service role grants (서버 액션에서 사용)
GRANT ALL ON public.support_tickets TO service_role;
