-- Support Tickets 테이블 생성
-- 피드백, 문의, 버그 리포트를 저장하는 테이블

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    user_id UUID REFERENCES public.users(id),
    user_email TEXT,
    user_name TEXT,

    -- 티켓 타입: feedback, inquiry, bug_report
    ticket_type TEXT NOT NULL CHECK (ticket_type IN ('feedback', 'inquiry', 'bug_report')),

    -- 상태: open, in_progress, resolved, closed
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),

    -- 우선순위: low, normal, high, urgent
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- 공통 필드
    category TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,

    -- 버그 리포트 전용 필드
    severity TEXT,
    page TEXT,
    steps_to_reproduce TEXT,
    browser TEXT,

    -- 메타데이터
    metadata JSONB DEFAULT '{}'::jsonb,

    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,

    -- 소프트 삭제
    deleted_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON public.support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_type ON public.support_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- RLS 정책 활성화
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 티켓만 볼 수 있음
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
USING (user_id = auth.uid());

-- 사용자는 자신의 티켓을 생성할 수 있음
CREATE POLICY "Users can create their own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 원장(owner)은 모든 티켓을 볼 수 있음
CREATE POLICY "Owners can view all tickets"
ON public.support_tickets FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role_code = 'owner'
    )
);

-- 원장(owner)은 티켓을 업데이트할 수 있음
CREATE POLICY "Owners can update tickets"
ON public.support_tickets FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role_code = 'owner'
    )
);

COMMENT ON TABLE public.support_tickets IS 'Support tickets including feedback, inquiries, and bug reports';
COMMENT ON COLUMN public.support_tickets.ticket_type IS 'Type of ticket: feedback, inquiry, or bug_report';
COMMENT ON COLUMN public.support_tickets.status IS 'Current status: open, in_progress, resolved, or closed';
COMMENT ON COLUMN public.support_tickets.priority IS 'Priority level: low, normal, high, or urgent';
