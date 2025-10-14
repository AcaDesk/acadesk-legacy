-- =====================================================
-- 온보딩 워크플로우 및 직원 초대 시스템 구현
-- =====================================================

-- 1. users 테이블에 승인 및 온보딩 필드 추가
ALTER TABLE users
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 기존 사용자들은 자동 승인 및 온보딩 완료 처리
UPDATE users
SET approval_status = 'approved',
    approved_at = now(),
    onboarding_completed = true,
    onboarding_completed_at = now()
WHERE approval_status IS NULL OR approval_status = 'pending';

-- approval_status 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);

-- 승인 상태 참조 테이블 추가
INSERT INTO ref_status_codes (category, code, label, sort_order) VALUES
  ('approval', 'pending', 'Pending Approval', 1),
  ('approval', 'approved', 'Approved', 2),
  ('approval', 'rejected', 'Rejected', 3)
ON CONFLICT (category, code) DO NOTHING;

-- 2. 역할 코드 업데이트 (admin → owner)
UPDATE ref_roles
SET label = 'Owner', description = '학원 원장 - 모든 권한 및 학원 소유자'
WHERE code = 'admin';

-- instructor, assistant 역할의 설명 업데이트
UPDATE ref_roles
SET description = '강사 - 수업 관리 및 학생 지도'
WHERE code = 'instructor';

UPDATE ref_roles
SET description = '조교 - 제한적 권한, 출석 및 TODO 관리'
WHERE code = 'assistant';

-- 3. staff_invitations 테이블 생성
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  role_code VARCHAR(50) NOT NULL REFERENCES ref_roles(code),
  token VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT chk_staff_role CHECK (role_code IN ('instructor', 'assistant'))
);

-- 인덱스 생성
CREATE INDEX idx_staff_invitations_tenant_id ON staff_invitations(tenant_id);
CREATE INDEX idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX idx_staff_invitations_token ON staff_invitations(token);
CREATE INDEX idx_staff_invitations_status ON staff_invitations(status);
CREATE INDEX idx_staff_invitations_expires_at ON staff_invitations(expires_at);

-- 초대 상태 참조 테이블 추가
INSERT INTO ref_status_codes (category, code, label, sort_order) VALUES
  ('invitation', 'pending', 'Pending', 1),
  ('invitation', 'accepted', 'Accepted', 2),
  ('invitation', 'expired', 'Expired', 3),
  ('invitation', 'cancelled', 'Cancelled', 4)
ON CONFLICT (category, code) DO NOTHING;

-- updated_at 트리거 추가
CREATE TRIGGER update_staff_invitations_updated_at
  BEFORE UPDATE ON staff_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. 기존 트리거 함수 수정 (role이 owner인 경우에만 tenant 생성)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  user_role TEXT;
  invitation_record RECORD;
BEGIN
  -- 사용자 역할 가져오기
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'owner');

  -- 초대 토큰이 있는지 확인
  IF NEW.raw_user_meta_data->>'invitation_token' IS NOT NULL THEN
    -- 초대받은 직원인 경우
    SELECT * INTO invitation_record
    FROM staff_invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND status = 'pending'
      AND expires_at > now();

    IF FOUND THEN
      -- 초대받은 학원에 직원으로 등록
      INSERT INTO public.users (id, tenant_id, email, name, role_code, phone, approval_status, onboarding_completed)
      VALUES (
        NEW.id,
        invitation_record.tenant_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
        invitation_record.role_code,
        NEW.raw_user_meta_data->>'phone',
        'approved', -- 초대받은 직원은 자동 승인
        true -- 초대받은 직원은 온보딩 불필요
      );

      -- 초대 상태 업데이트
      UPDATE staff_invitations
      SET status = 'accepted',
          accepted_at = now(),
          accepted_by = NEW.id
      WHERE id = invitation_record.id;

      RETURN NEW;
    END IF;
  END IF;

  -- owner인 경우 tenant 생성
  IF user_role = 'owner' OR user_role = 'admin' THEN
    INSERT INTO public.tenants (name, slug)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'academy_name', 'My Academy'),
      LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'academy_name', NEW.id::text), ' ', '-'))
    )
    RETURNING id INTO new_tenant_id;

    -- owner 사용자 생성 (승인 대기 상태)
    INSERT INTO public.users (id, tenant_id, email, name, role_code, phone, approval_status)
    VALUES (
      NEW.id,
      new_tenant_id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
      'admin', -- 역할 코드는 기존대로 'admin' 사용 (owner로 표시하지만 코드는 admin)
      NEW.raw_user_meta_data->>'phone',
      'pending' -- 원장은 승인 대기 상태로 시작
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 초대 만료 처리 함수 (선택적으로 크론잡에서 실행)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE staff_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 6. RLS 정책 (개발 중에는 비활성화되어 있지만 참고용)
-- ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view invitations for their tenant"
--   ON staff_invitations FOR SELECT
--   USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- CREATE POLICY "Owners can create invitations for their tenant"
--   ON staff_invitations FOR INSERT
--   WITH CHECK (
--     tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
--     AND EXISTS (
--       SELECT 1 FROM users
--       WHERE id = auth.uid()
--       AND role_code = 'admin'
--     )
--   );

-- CREATE POLICY "Owners can update invitations for their tenant"
--   ON staff_invitations FOR UPDATE
--   USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- =====================================================
-- 마이그레이션 완료
-- =====================================================
