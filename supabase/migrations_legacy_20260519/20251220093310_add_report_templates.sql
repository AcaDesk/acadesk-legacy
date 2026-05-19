-- 20251220093310_add_report_templates.sql
-- 리포트 코멘트 템플릿 테이블

-- ============================================================================
-- 테이블 생성
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.report_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- 템플릿 메타데이터
  category        text NOT NULL CHECK (category IN ('summary', 'strengths', 'improvements', 'nextGoals')),
  title           text NOT NULL,           -- 칩 표시용 (짧은 제목)
  content         text NOT NULL,           -- 템플릿 본문 (변수 포함)
  conditions      jsonb DEFAULT NULL,      -- 조건 기반 추천용

  -- 스코프 제어
  is_system       boolean NOT NULL DEFAULT false,  -- true = 시스템 전역, false = 테넌트별
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      int NOT NULL DEFAULT 0,

  -- 감사 필드
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- ============================================================================
-- 인덱스
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_report_templates_tenant_category
  ON public.report_templates(tenant_id, category) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_report_templates_system
  ON public.report_templates(is_system) WHERE is_system = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_report_templates_active
  ON public.report_templates(is_active) WHERE deleted_at IS NULL;

-- ============================================================================
-- updated_at 트리거
-- ============================================================================

CREATE OR REPLACE TRIGGER set_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- RLS 정책
-- ============================================================================

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- 읽기: 시스템 템플릿은 모두에게, 테넌트 템플릿은 해당 테넌트에게만
CREATE POLICY report_templates_select ON public.report_templates
  FOR SELECT USING (
    is_system = true
    OR tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

-- 쓰기: 테넌트 템플릿만 수정 가능 (시스템 템플릿은 수정 불가)
CREATE POLICY report_templates_insert ON public.report_templates
  FOR INSERT WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
    AND is_system = false
  );

CREATE POLICY report_templates_update ON public.report_templates
  FOR UPDATE USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
    AND is_system = false
  );

CREATE POLICY report_templates_delete ON public.report_templates
  FOR DELETE USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
    AND is_system = false
  );

-- ============================================================================
-- 권한 부여
-- ============================================================================

GRANT SELECT ON TABLE public.report_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.report_templates TO authenticated;

-- ============================================================================
-- 시스템 기본 템플릿 (시드 데이터)
-- ============================================================================

INSERT INTO public.report_templates (tenant_id, category, title, content, conditions, is_system, sort_order) VALUES
-- 📝 총평 (summary)
(NULL, 'summary', '우수 출석', '{studentName} 학생은 이번 달 출석률 {attendanceRate}%로 매우 성실하게 수업에 참여했습니다.',
  '{"attendanceRate": {"min": 95}}', true, 1),
(NULL, 'summary', '양호 출석', '{studentName} 학생은 이번 달 출석률 {attendanceRate}%로 수업에 잘 참여했습니다.',
  '{"attendanceRate": {"min": 85, "max": 94}}', true, 2),
(NULL, 'summary', '출석 개선 필요', '{studentName} 학생의 이번 달 출석률이 {attendanceRate}%로, 더 꾸준한 참여가 필요합니다.',
  '{"attendanceRate": {"max": 84}}', true, 3),
(NULL, 'summary', '성적 향상', '{studentName} 학생은 전월 대비 평균 {scoreChange}점 향상되어 눈에 띄는 성장을 보였습니다.',
  '{"scoreChange": {"direction": "improving", "threshold": 5}}', true, 4),
(NULL, 'summary', '꾸준한 학습', '{studentName} 학생은 꾸준히 학습에 임하고 있습니다.', NULL, true, 10),
(NULL, 'summary', '종합 우수', '{studentName} 학생은 전반적으로 우수한 학습 태도와 성취도를 보이고 있습니다.',
  '{"averageScore": {"min": 90}}', true, 5),

-- ✨ 잘한 점 (strengths)
(NULL, 'strengths', '성적 우수', '전 과목에서 평균 {averageScore}점으로 우수한 성취도를 보이고 있습니다.',
  '{"averageScore": {"min": 90}}', true, 1),
(NULL, 'strengths', '숙제 성실', '숙제 완료율 {homeworkRate}%로 학습 과제를 성실히 수행하고 있습니다.',
  '{"homeworkRate": {"min": 90}}', true, 2),
(NULL, 'strengths', '꾸준한 성장', '매달 꾸준히 성장하는 모습을 보여주고 있습니다.',
  '{"scoreChange": {"direction": "improving", "threshold": 3}}', true, 3),
(NULL, 'strengths', '적극적인 태도', '수업 중 적극적으로 참여하고 질문을 많이 합니다.', NULL, true, 10),
(NULL, 'strengths', '이해력 우수', '새로운 개념을 빠르게 이해하고 응용할 수 있습니다.', NULL, true, 11),
(NULL, 'strengths', '성실한 출석', '출석률 {attendanceRate}%로 수업에 성실히 참여하고 있습니다.',
  '{"attendanceRate": {"min": 95}}', true, 4),

-- 📈 보완할 점 (improvements)
(NULL, 'improvements', '기초 보강', '기본 개념 학습에 조금 더 시간을 투자하면 응용력이 향상될 것입니다.', NULL, true, 10),
(NULL, 'improvements', '숙제 관리', '숙제 완료율을 높이면 학습 효과가 더욱 좋아질 것입니다.',
  '{"homeworkRate": {"max": 70}}', true, 1),
(NULL, 'improvements', '집중력 향상', '수업 집중력을 조금 더 높이면 이해도가 향상될 것입니다.', NULL, true, 11),
(NULL, 'improvements', '복습 강화', '배운 내용을 꾸준히 복습하면 더 좋은 결과를 얻을 수 있습니다.', NULL, true, 12),
(NULL, 'improvements', '출석률 개선', '출석률을 높이면 수업 내용을 놓치지 않고 따라갈 수 있습니다.',
  '{"attendanceRate": {"max": 84}}', true, 2),

-- 🎯 다음 목표 (nextGoals)
(NULL, 'nextGoals', '상위권 유지', '현재의 우수한 성적을 유지하며 더 높은 목표에 도전해봅니다.',
  '{"averageScore": {"min": 90}}', true, 1),
(NULL, 'nextGoals', '약점 보완', '부족한 영역을 집중적으로 보완하여 균형 잡힌 성장을 목표로 합니다.',
  '{"scoreChange": {"direction": "declining"}}', true, 2),
(NULL, 'nextGoals', '출석률 목표', '다음 달에는 출석률 90% 이상을 목표로 합니다.',
  '{"attendanceRate": {"max": 89}}', true, 3),
(NULL, 'nextGoals', '숙제 완료 목표', '다음 달에는 숙제 완료율 80% 이상을 목표로 합니다.',
  '{"homeworkRate": {"max": 79}}', true, 4),
(NULL, 'nextGoals', '성적 향상 목표', '다음 달에는 평균 5점 이상 향상을 목표로 합니다.', NULL, true, 10),
(NULL, 'nextGoals', '학습 습관 형성', '꾸준한 학습 습관을 형성하여 장기적인 성장을 도모합니다.', NULL, true, 11);

-- ============================================================================
-- 코멘트
-- ============================================================================

COMMENT ON TABLE public.report_templates IS '리포트 코멘트 템플릿';
COMMENT ON COLUMN public.report_templates.category IS '템플릿 카테고리: summary(총평), strengths(강점), improvements(개선점), nextGoals(목표)';
COMMENT ON COLUMN public.report_templates.title IS '칩 UI에 표시될 짧은 제목';
COMMENT ON COLUMN public.report_templates.content IS '템플릿 본문. 변수 사용 가능: {studentName}, {attendanceRate}, {homeworkRate}, {averageScore}, {scoreChange}';
COMMENT ON COLUMN public.report_templates.conditions IS '조건 기반 추천을 위한 JSONB. 예: {"attendanceRate": {"min": 95}}';
COMMENT ON COLUMN public.report_templates.is_system IS 'true이면 시스템 기본 템플릿 (모든 테넌트에서 사용 가능, 수정 불가)';
