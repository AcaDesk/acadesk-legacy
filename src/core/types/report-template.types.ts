/**
 * Report Template Types
 *
 * 리포트 코멘트 템플릿 관련 타입 정의
 */

// ============================================================================
// 카테고리 타입
// ============================================================================

/**
 * 템플릿 카테고리
 * - summary: 총평
 * - strengths: 잘한 점
 * - improvements: 보완할 점
 * - nextGoals: 다음 목표
 */
export type ReportTemplateCategory =
  | 'summary'
  | 'strengths'
  | 'improvements'
  | 'nextGoals'

/**
 * 카테고리 레이블 매핑
 */
export const CATEGORY_LABELS: Record<ReportTemplateCategory, string> = {
  summary: '총평',
  strengths: '잘한 점',
  improvements: '보완할 점',
  nextGoals: '다음 목표',
}

/**
 * 카테고리 아이콘 매핑
 */
export const CATEGORY_ICONS: Record<ReportTemplateCategory, string> = {
  summary: '📝',
  strengths: '✨',
  improvements: '📈',
  nextGoals: '🎯',
}

// ============================================================================
// 조건 타입
// ============================================================================

/**
 * 범위 조건 (min/max)
 */
export interface RangeCondition {
  min?: number
  max?: number
}

/**
 * 성적 변화 방향
 */
export type ScoreChangeDirection = 'improving' | 'declining' | 'stable'

/**
 * 성적 변화 조건
 */
export interface ScoreChangeCondition {
  direction: ScoreChangeDirection
  threshold?: number // 기본값: 5
}

/**
 * 템플릿 조건
 * 조건이 매칭되면 해당 템플릿이 추천됨
 */
export interface TemplateCondition {
  /** 출석률 조건 (%) */
  attendanceRate?: RangeCondition
  /** 숙제 완료율 조건 (%) */
  homeworkRate?: RangeCondition
  /** 평균 점수 조건 */
  averageScore?: RangeCondition
  /** 성적 변화 조건 */
  scoreChange?: ScoreChangeCondition
}

// ============================================================================
// 템플릿 타입
// ============================================================================

/**
 * 리포트 템플릿
 */
export interface ReportTemplate {
  id: string
  tenantId: string | null
  category: ReportTemplateCategory
  /** 칩 UI에 표시될 짧은 제목 */
  title: string
  /** 템플릿 본문 (변수 포함 가능) */
  content: string
  /** 조건 기반 추천용 */
  conditions: TemplateCondition | null
  /** 시스템 기본 템플릿 여부 */
  isSystem: boolean
  /** 활성화 여부 */
  isActive: boolean
  /** 정렬 순서 */
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/**
 * DB에서 조회한 템플릿 (snake_case)
 */
export interface ReportTemplateRow {
  id: string
  tenant_id: string | null
  category: ReportTemplateCategory
  title: string
  content: string
  conditions: TemplateCondition | null
  is_system: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ============================================================================
// 컨텍스트 데이터
// ============================================================================

/**
 * 리포트 컨텍스트 데이터
 * 변수 치환 및 조건 매칭에 사용
 */
export interface ReportContextData {
  /** 학생 이름 */
  studentName: string
  /** 출석률 (%) */
  attendanceRate: number
  /** 숙제 완료율 (%) */
  homeworkRate: number
  /** 평균 점수 */
  averageScore: number
  /** 전월 대비 점수 변화 */
  scoreChange: number
}

/**
 * 사용 가능한 변수 목록
 */
export const TEMPLATE_VARIABLES = [
  { key: '{studentName}', label: '학생 이름', example: '홍길동' },
  { key: '{attendanceRate}', label: '출석률 (%)', example: '95' },
  { key: '{homeworkRate}', label: '숙제 완료율 (%)', example: '88' },
  { key: '{averageScore}', label: '평균 점수', example: '85' },
  { key: '{scoreChange}', label: '점수 변화', example: '5' },
] as const

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 템플릿 변수를 실제 데이터로 치환
 */
export function replaceTemplateVariables(
  template: string,
  context: ReportContextData
): string {
  return template
    .replace(/{studentName}/g, context.studentName)
    .replace(/{attendanceRate}/g, String(context.attendanceRate))
    .replace(/{homeworkRate}/g, String(context.homeworkRate))
    .replace(/{averageScore}/g, String(context.averageScore))
    .replace(/{scoreChange}/g, String(Math.abs(context.scoreChange)))
}

// ============================================================================
// 그룹화된 템플릿
// ============================================================================

/**
 * 카테고리별 템플릿 그룹
 */
export interface CategoryTemplates {
  category: ReportTemplateCategory
  label: string
  icon: string
  /** 해당 카테고리의 모든 템플릿 */
  templates: ReportTemplate[]
  /** 조건에 매칭되어 추천되는 템플릿 */
  recommendedTemplates: ReportTemplate[]
}

// ============================================================================
// Server Action 입력/출력 타입
// ============================================================================

/**
 * 템플릿 생성 입력
 */
export interface CreateReportTemplateInput {
  category: ReportTemplateCategory
  title: string
  content: string
  conditions?: TemplateCondition | null
  isActive?: boolean
  sortOrder?: number
}

/**
 * 템플릿 수정 입력
 */
export interface UpdateReportTemplateInput {
  id: string
  category?: ReportTemplateCategory
  title?: string
  content?: string
  conditions?: TemplateCondition | null
  isActive?: boolean
  sortOrder?: number
}

/**
 * Server Action 결과
 */
export interface ReportTemplateResult<T> {
  success: boolean
  data: T | null
  error: string | null
}
