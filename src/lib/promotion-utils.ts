/**
 * 진급 관리 유틸리티 (순수 함수)
 *
 * 학년 진급 로직, 학교 전환 판별, 진급 계획 생성 등
 */

// --- Types ---

export type PromotionCategory = 'normal' | 'school_transfer' | 'graduation' | 'no_grade'

export interface PromotionPlan {
  studentId: string
  studentName: string
  currentGrade: string | null
  currentSchool: string | null
  nextGrade: string | null
  nextSchool: string | null
  category: PromotionCategory
  selected: boolean
}

export interface PromotionCandidate {
  id: string
  name: string
  grade: string | null
  school: string | null
}

// --- Grade progression map ---

const GRADE_PROGRESSION: Record<string, string | null> = {
  '초1': '초2',
  '초2': '초3',
  '초3': '초4',
  '초4': '초5',
  '초5': '초6',
  '초6': '중1',
  '중1': '중2',
  '중2': '중3',
  '중3': '고1',
  '고1': '고2',
  '고2': '고3',
  '고3': null, // 졸업
}

// 학교 전환이 발생하는 학년
const SCHOOL_TRANSFER_GRADES = new Set<string>(['초6', '중3'])

/**
 * 다음 학년 반환
 * @returns 다음 학년 문자열, 졸업이면 null, 알 수 없는 학년이면 null
 */
export function getNextGrade(grade: string | null): string | null {
  if (!grade) return null
  return GRADE_PROGRESSION[grade] ?? null
}

/**
 * 진급 카테고리 판별
 */
export function getPromotionCategory(grade: string | null): PromotionCategory {
  if (!grade) return 'no_grade'
  if (grade === '고3') return 'graduation'
  if (SCHOOL_TRANSFER_GRADES.has(grade)) return 'school_transfer'
  if (grade in GRADE_PROGRESSION) return 'normal'
  return 'no_grade'
}

/**
 * 학생 배열로부터 진급 계획 생성
 */
export function buildPromotionPlans(students: PromotionCandidate[]): PromotionPlan[] {
  return students.map((s) => {
    const category = getPromotionCategory(s.grade)
    const nextGrade = getNextGrade(s.grade)

    return {
      studentId: s.id,
      studentName: s.name,
      currentGrade: s.grade,
      currentSchool: s.school,
      nextGrade,
      // 학교 전환 학생은 새 학교를 나중에 지정, 그 외는 기존 학교 유지
      nextSchool: category === 'school_transfer' ? null : s.school,
      category,
      // 졸업·학년미입력은 기본 미선택
      selected: category === 'normal' || category === 'school_transfer',
    }
  })
}

/**
 * 카테고리별 그룹핑
 */
export function groupByCategory(plans: PromotionPlan[]): Record<PromotionCategory, PromotionPlan[]> {
  const groups: Record<PromotionCategory, PromotionPlan[]> = {
    normal: [],
    school_transfer: [],
    graduation: [],
    no_grade: [],
  }
  for (const plan of plans) {
    groups[plan.category].push(plan)
  }
  return groups
}

/**
 * 학교 전환 학생을 현재 학년별로 그룹핑
 */
export function groupTransfersByCurrentGrade(
  plans: PromotionPlan[]
): Record<string, PromotionPlan[]> {
  const groups: Record<string, PromotionPlan[]> = {}
  for (const plan of plans) {
    if (plan.category !== 'school_transfer') continue
    const key = plan.currentGrade || '학년 미입력'
    if (!groups[key]) groups[key] = []
    groups[key].push(plan)
  }
  return groups
}

/**
 * 카테고리 한국어 레이블
 */
export function getCategoryLabel(category: PromotionCategory): string {
  const labels: Record<PromotionCategory, string> = {
    normal: '일반 진급',
    school_transfer: '학교 전환',
    graduation: '졸업',
    no_grade: '학년 미입력',
  }
  return labels[category]
}
