-- =====================================================
-- Add Extended Student Information Fields
-- Migration: 20251004200000
-- =====================================================

-- Add new columns to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS commute_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS marketing_source VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN students.birth_date IS '학생 생년월일 - 학년 자동 계산, 생일 이벤트 등에 활용';
COMMENT ON COLUMN students.gender IS '성별 - 통계 및 반 구성 참고용 (male, female, other)';
COMMENT ON COLUMN students.student_phone IS '학생 본인 연락처 - 고학년 직접 소통용';
COMMENT ON COLUMN students.profile_image_url IS '프로필 사진 URL - Supabase Storage 경로';
COMMENT ON COLUMN students.commute_method IS '등원 방법 (셔틀버스, 도보, 자가 등) - 안전한 등하원 관리용';
COMMENT ON COLUMN students.marketing_source IS '마케팅 경로 (지인 소개, 블로그, 간판 등) - 마케팅 효율 분석용';
COMMENT ON COLUMN students.notes IS '특이사항/메모 - 건강 문제, 성격, 학습 습관 등 강사가 알아야 할 내용';

-- Update guardians table to support additional emergency contact
ALTER TABLE guardians
ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS occupation VARCHAR(100),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add comments for guardians
COMMENT ON COLUMN guardians.emergency_phone IS '비상 연락처 - 주 보호자와 연락이 닿지 않을 경우를 대비';
COMMENT ON COLUMN guardians.occupation IS '직업 정보';
COMMENT ON COLUMN guardians.address IS '주소 정보';

-- Update users table to support address field
ALTER TABLE users
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create index for birth_date to support age-based queries
CREATE INDEX IF NOT EXISTS idx_students_birth_date ON students(birth_date);
CREATE INDEX IF NOT EXISTS idx_students_gender ON students(gender);
CREATE INDEX IF NOT EXISTS idx_guardians_deleted_at ON guardians(deleted_at);

-- Update guardian_students table to properly reference guardians
-- Note: The original schema may have used 'student_guardians' - we need to check the actual table name
-- If it's 'student_guardians', we should use that. If it's 'guardian_students', use that.
-- Let's handle both cases:

DO $$
BEGIN
  -- Add relation column if using student_guardians table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_guardians') THEN
    ALTER TABLE student_guardians
    ADD COLUMN IF NOT EXISTS relation VARCHAR(50);

    COMMENT ON COLUMN student_guardians.relation IS '학생과의 관계 (father, mother, grandfather, grandmother, uncle, aunt, other)';
  END IF;

  -- Add relation column if using guardian_students table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guardian_students') THEN
    ALTER TABLE guardian_students
    ADD COLUMN IF NOT EXISTS relation VARCHAR(50);

    COMMENT ON COLUMN guardian_students.relation IS '학생과의 관계 (father, mother, grandfather, grandmother, uncle, aunt, other)';
  END IF;
END $$;
