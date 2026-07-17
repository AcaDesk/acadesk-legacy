-- 키오스크 인증 시도 기록 테이블 (레이트리밋/브루트포스 방어)
--
-- 키오스크 인증(PIN, 보호자 전화번호 뒷자리)은 비로그인 상태에서 호출되고
-- 비밀 공간이 10^4으로 작아 시도 제한이 필수다. 서버리스 환경이라 인메모리
-- 카운터로는 방어할 수 없어 DB에 실패 시도를 기록하고 윈도우 내 횟수로 판정한다.
--
-- 접근: service_role 전용 (RLS enabled, 정책 없음 — 프로젝트 표준 패턴)
-- 보존: 판정에는 최근 10분만 필요. 1일 지난 행은 기록 시점에 수시 삭제(베스트 에포트).

CREATE TABLE IF NOT EXISTS kiosk_auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  identifier text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE kiosk_auth_attempts IS '키오스크 인증 시도 기록 — 레이트리밋 판정용 임시 로그';
COMMENT ON COLUMN kiosk_auth_attempts.identifier IS '시도 대상 식별자 (예: pin:<studentCode>, phone:<studentId>, lookup:<phoneLast4>)';

-- 식별자별 윈도우 카운트용
CREATE INDEX IF NOT EXISTS idx_kiosk_auth_attempts_window
  ON kiosk_auth_attempts (tenant_id, identifier, attempted_at DESC);

-- 테넌트(기기) 전체 윈도우 카운트용
CREATE INDEX IF NOT EXISTS idx_kiosk_auth_attempts_tenant_time
  ON kiosk_auth_attempts (tenant_id, attempted_at DESC);

ALTER TABLE kiosk_auth_attempts ENABLE ROW LEVEL SECURITY;
