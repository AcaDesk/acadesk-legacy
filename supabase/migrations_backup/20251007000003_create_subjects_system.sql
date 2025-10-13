-- Subjects Management System
-- 과목을 체계적으로 관리하고 수업, 성적 등과 연동하는 시스템

-- 과목 테이블 생성
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- 과목 정보
  name TEXT NOT NULL, -- 과목명 (예: 수학, 영어, 과학)
  description TEXT, -- 과목 설명
  code TEXT, -- 과목 코드 (선택, 예: MATH, ENG)

  -- 시각적 속성
  color TEXT NOT NULL DEFAULT '#3b82f6', -- 대표 색상 (hex code)

  -- 정렬 및 활성화
  sort_order INTEGER DEFAULT 0, -- 정렬 순서
  active BOOLEAN DEFAULT true, -- 활성화 여부

  -- 메타데이터
  meta JSONB DEFAULT '{}'::jsonb,

  -- 감사 필드
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- 제약 조건
  CONSTRAINT subjects_name_tenant_unique UNIQUE (tenant_id, name, deleted_at),
  CONSTRAINT subjects_code_tenant_unique UNIQUE (tenant_id, code, deleted_at)
);

-- 인덱스
CREATE INDEX idx_subjects_tenant ON subjects(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_active ON subjects(tenant_id, active) WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_sort ON subjects(tenant_id, sort_order) WHERE deleted_at IS NULL;

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER set_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책 활성화
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 같은 테넌트의 데이터만 접근 가능
CREATE POLICY subjects_tenant_isolation ON subjects
  FOR ALL
  USING (tenant_id = (SELECT get_current_tenant_id()));

-- RLS 정책: owner, instructor는 과목 생성 가능
CREATE POLICY subjects_create ON subjects
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT get_current_tenant_id())
    AND get_current_user_role() IN ('owner', 'instructor')
  );

-- RLS 정책: owner, instructor는 과목 수정 가능
CREATE POLICY subjects_update ON subjects
  FOR UPDATE
  USING (get_current_user_role() IN ('owner', 'instructor'));

-- RLS 정책: owner만 과목 삭제 가능
CREATE POLICY subjects_delete ON subjects
  FOR DELETE
  USING (get_current_user_role() = 'owner');

-- classes 테이블에 subject_id 추가 (테이블이 존재하는 경우에만)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'classes'
  ) THEN
    -- subject_id 컬럼이 없으면 추가
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'classes'
        AND column_name = 'subject_id'
    ) THEN
      ALTER TABLE classes ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
      CREATE INDEX idx_classes_subject ON classes(subject_id) WHERE deleted_at IS NULL;
    END IF;
  END IF;
END$$;

-- 기본 과목 데이터 삽입 함수 (테넌트별)
CREATE OR REPLACE FUNCTION create_default_subjects(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO subjects (tenant_id, name, code, color, sort_order, active) VALUES
    (p_tenant_id, '수학', 'MATH', '#3b82f6', 1, true),      -- 파란색
    (p_tenant_id, '영어', 'ENG', '#10b981', 2, true),       -- 초록색
    (p_tenant_id, '국어', 'KOR', '#f59e0b', 3, true),       -- 주황색
    (p_tenant_id, '과학', 'SCI', '#8b5cf6', 4, true),       -- 보라색
    (p_tenant_id, '사회', 'SOC', '#ef4444', 5, true),       -- 빨간색
    (p_tenant_id, '코딩', 'CODE', '#06b6d4', 6, true)       -- 청록색
  ON CONFLICT (tenant_id, name, deleted_at) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 과목 통계 뷰 (간단 버전)
CREATE OR REPLACE VIEW subject_statistics AS
SELECT
  s.id,
  s.tenant_id,
  s.name,
  s.color,
  COUNT(DISTINCT c.id) AS class_count
FROM subjects s
LEFT JOIN classes c ON c.subject_id = s.id AND c.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.tenant_id, s.name, s.color;

COMMENT ON TABLE subjects IS '과목 마스터 테이블 - 학원의 모든 과목을 체계적으로 관리';
COMMENT ON COLUMN subjects.name IS '과목명 (예: 수학, 영어, 과학)';
COMMENT ON COLUMN subjects.color IS '과목의 시그니처 색상 (hex code) - 차트, 뱃지 등에서 일관되게 사용';
COMMENT ON COLUMN subjects.code IS '과목 코드 (선택) - 짧은 식별자';
COMMENT ON FUNCTION create_default_subjects(UUID) IS '테넌트에 기본 과목 데이터를 생성하는 헬퍼 함수';
COMMENT ON VIEW subject_statistics IS '과목별 통계 (수업 수, 학생 수)';
