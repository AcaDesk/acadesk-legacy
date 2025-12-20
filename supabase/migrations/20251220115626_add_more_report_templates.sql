-- 20251220115626_add_more_report_templates.sql
-- 추가 시스템 기본 리포트 템플릿

INSERT INTO public.report_templates (tenant_id, category, title, content, conditions, is_system, sort_order) VALUES

-- ============================================================================
-- 📝 총평 (summary) 추가
-- ============================================================================
(NULL, 'summary', '신입생 적응', '{studentName} 학생은 이번 달 학원에 잘 적응하고 있으며, 수업에 적극적으로 참여하고 있습니다.', NULL, true, 20),
(NULL, 'summary', '꾸준한 노력', '{studentName} 학생은 꾸준히 노력하는 모습이 인상적입니다. 출석률 {attendanceRate}%, 숙제 완료율 {homeworkRate}%로 성실하게 학습에 임하고 있습니다.', NULL, true, 21),
(NULL, 'summary', '전반적 향상', '{studentName} 학생은 이번 달 전반적으로 향상된 모습을 보였습니다. 평균 점수 {averageScore}점으로 지난달보다 {scoreChange}점 상승했습니다.',
  '{"scoreChange": {"direction": "improving", "threshold": 3}}', true, 22),
(NULL, 'summary', '우수한 성취', '{studentName} 학생은 평균 {averageScore}점으로 우수한 성취도를 보이고 있으며, 출석률과 숙제 완료율 모두 높은 수준을 유지하고 있습니다.',
  '{"averageScore": {"min": 85}, "attendanceRate": {"min": 90}}', true, 23),

-- ============================================================================
-- ✨ 잘한 점 (strengths) 추가
-- ============================================================================
(NULL, 'strengths', '자기주도 학습', '스스로 학습 계획을 세우고 실천하는 자기주도적 학습 태도가 돋보입니다.', NULL, true, 20),
(NULL, 'strengths', '질문 적극적', '수업 중 궁금한 점을 적극적으로 질문하며 이해하려는 노력이 인상적입니다.', NULL, true, 21),
(NULL, 'strengths', '또래 도움', '어려움을 겪는 친구들을 도와주며 함께 성장하는 모습이 보기 좋습니다.', NULL, true, 22),
(NULL, 'strengths', '오답 정리', '틀린 문제를 꼼꼼히 복습하고 오답 노트를 정리하는 습관이 좋습니다.', NULL, true, 23),
(NULL, 'strengths', '시간 관리', '수업 시간을 잘 활용하고 과제도 기한 내에 제출하는 시간 관리 능력이 뛰어납니다.',
  '{"homeworkRate": {"min": 95}}', true, 24),
(NULL, 'strengths', '성적 급상승', '전월 대비 {scoreChange}점 향상되어 눈에 띄는 성장을 보였습니다. 노력의 결과가 나타나고 있습니다.',
  '{"scoreChange": {"direction": "improving", "threshold": 10}}', true, 25),

-- ============================================================================
-- 📈 보완할 점 (improvements) 추가
-- ============================================================================
(NULL, 'improvements', '필기 습관', '수업 내용을 노트에 정리하는 습관을 기르면 복습할 때 도움이 됩니다.', NULL, true, 20),
(NULL, 'improvements', '오답 복습', '틀린 문제를 다시 풀어보는 습관을 들이면 실력 향상에 큰 도움이 됩니다.', NULL, true, 21),
(NULL, 'improvements', '예습 권장', '다음 수업 내용을 미리 훑어보면 수업 이해도가 높아질 것입니다.', NULL, true, 22),
(NULL, 'improvements', '질문하기', '모르는 부분은 수업 중에 바로 질문하면 더 효과적으로 학습할 수 있습니다.', NULL, true, 23),
(NULL, 'improvements', '규칙적 학습', '매일 일정한 시간에 공부하는 규칙적인 학습 습관을 만들어 보세요.', NULL, true, 24),
(NULL, 'improvements', '성적 하락 주의', '최근 성적이 다소 하락했습니다. 어려운 부분이 있다면 선생님과 상담해 주세요.',
  '{"scoreChange": {"direction": "declining", "threshold": 5}}', true, 25),

-- ============================================================================
-- 🎯 다음 목표 (nextGoals) 추가
-- ============================================================================
(NULL, 'nextGoals', '숙제 완료 90%', '다음 달에는 숙제 완료율 90% 이상을 목표로 합니다. 조금만 더 신경 쓰면 충분히 달성할 수 있습니다.',
  '{"homeworkRate": {"min": 70, "max": 89}}', true, 20),
(NULL, 'nextGoals', '평균 5점 향상', '다음 달에는 평균 점수 5점 향상을 목표로 기초부터 차근차근 다져보겠습니다.', NULL, true, 21),
(NULL, 'nextGoals', '취약 과목 집중', '취약한 과목에 집중하여 균형 잡힌 성적 향상을 목표로 합니다.', NULL, true, 22),
(NULL, 'nextGoals', '만점 도전', '현재 우수한 성적을 바탕으로 다음 시험에서는 만점에 도전해 봅니다.',
  '{"averageScore": {"min": 95}}', true, 23),
(NULL, 'nextGoals', '꾸준함 유지', '현재의 좋은 학습 습관과 성실한 태도를 계속 유지하는 것이 목표입니다.',
  '{"attendanceRate": {"min": 95}, "homeworkRate": {"min": 90}}', true, 24),
(NULL, 'nextGoals', '기초 다지기', '기본 개념을 탄탄히 다지는 것을 우선 목표로 하여 장기적인 성장을 도모합니다.',
  '{"averageScore": {"max": 70}}', true, 25);
