-- Audit Logs 테이블 생성
-- 보안 감사 로그를 저장하는 테이블

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    event TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    student_id UUID REFERENCES public.students(id),
    student_code TEXT,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON public.audit_logs(event);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_student_id ON public.audit_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_student_code ON public.audit_logs(student_code);

-- RLS 정책 활성화
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 원장(owner)만 audit_logs를 조회할 수 있음
CREATE POLICY "Audit logs are viewable by owners only"
ON public.audit_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role_code = 'owner'
    )
);

-- 아무도 audit_logs를 수정/삭제할 수 없음 (immutable)
CREATE POLICY "Audit logs are immutable"
ON public.audit_logs FOR UPDATE
USING (false);

CREATE POLICY "Audit logs cannot be deleted"
ON public.audit_logs FOR DELETE
USING (false);

-- 시스템만 audit_logs를 삽입할 수 있음 (service role)
-- INSERT는 RLS를 우회하는 service_role로만 가능하도록 설정

COMMENT ON TABLE public.audit_logs IS 'Security audit logs for kiosk, authentication, and important data changes';
COMMENT ON COLUMN public.audit_logs.event IS 'Type of audit event (e.g., kiosk_login_success, todo_completed)';
COMMENT ON COLUMN public.audit_logs.timestamp IS 'When the event occurred';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Additional event-specific data in JSON format';
