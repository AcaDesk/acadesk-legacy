-- 사전등록 테이블 생성
CREATE TABLE IF NOT EXISTS public.pre_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  academy_name TEXT NOT NULL,
  agreed_to_marketing BOOLEAN NOT NULL DEFAULT false,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pre_registrations_email ON public.pre_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pre_registrations_registered_at ON public.pre_registrations(registered_at DESC);

-- RLS 활성화
ALTER TABLE public.pre_registrations ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 사전등록 가능 (INSERT)
CREATE POLICY "Anyone can pre-register"
  ON public.pre_registrations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 관리자만 조회 가능 (admin 역할을 가진 사용자)
CREATE POLICY "Only admins can view pre-registrations"
  ON public.pre_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role_code = 'owner'
    )
  );

-- Updated_at 트리거
CREATE OR REPLACE FUNCTION public.update_pre_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pre_registrations_updated_at
  BEFORE UPDATE ON public.pre_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pre_registrations_updated_at();

-- 코멘트 추가
COMMENT ON TABLE public.pre_registrations IS '서비스 사전등록 정보';
COMMENT ON COLUMN public.pre_registrations.id IS '고유 ID';
COMMENT ON COLUMN public.pre_registrations.name IS '신청자 이름';
COMMENT ON COLUMN public.pre_registrations.email IS '신청자 이메일 (unique)';
COMMENT ON COLUMN public.pre_registrations.phone IS '신청자 연락처';
COMMENT ON COLUMN public.pre_registrations.academy_name IS '학원명';
COMMENT ON COLUMN public.pre_registrations.agreed_to_marketing IS '마케팅 정보 수신 동의';
COMMENT ON COLUMN public.pre_registrations.registered_at IS '사전등록 일시';
