/**
 * Application-wide constants and enums
 */

// 학년
export const GRADES = [
  { value: '초1', label: '초등 1학년' },
  { value: '초2', label: '초등 2학년' },
  { value: '초3', label: '초등 3학년' },
  { value: '초4', label: '초등 4학년' },
  { value: '초5', label: '초등 5학년' },
  { value: '초6', label: '초등 6학년' },
  { value: '중1', label: '중등 1학년' },
  { value: '중2', label: '중등 2학년' },
  { value: '중3', label: '중등 3학년' },
  { value: '고1', label: '고등 1학년' },
  { value: '고2', label: '고등 2학년' },
  { value: '고3', label: '고등 3학년' },
] as const

export type GradeValue = typeof GRADES[number]['value']

// 보호자 관계
export const GUARDIAN_RELATIONSHIPS = [
  { value: 'father', label: '아버지' },
  { value: 'mother', label: '어머니' },
  { value: 'grandfather', label: '할아버지' },
  { value: 'grandmother', label: '할머니' },
  { value: 'uncle', label: '삼촌' },
  { value: 'aunt', label: '이모/고모' },
  { value: 'other', label: '기타' },
] as const

export type GuardianRelationship = typeof GUARDIAN_RELATIONSHIPS[number]['value']

// 보호자 관계 맵 헬퍼 함수
export function getGuardianRelationshipLabel(relationship: string | null | undefined): string {
  if (!relationship) return ''

  const relationshipMap: Record<string, string> = {
    'father': '아버지',
    'mother': '어머니',
    'grandfather': '할아버지',
    'grandmother': '할머니',
    'uncle': '삼촌',
    'aunt': '이모/고모',
    'other': '기타',
  }

  return relationshipMap[relationship] || relationship
}

/**
 * 학부모 표시 이름을 생성합니다.
 * 학원에서는 보통 학부모 성함을 직접 부르지 않고, "학생이름 + 관계"로 호칭합니다.
 * 예: "홍길동 어머니", "김철수 아버지"
 *
 * @param studentName - 학생 이름
 * @param relationship - 학부모와 학생의 관계
 * @param guardianName - 학부모 본인 이름 (관계가 없을 때 사용)
 * @returns 학부모 표시 이름
 */
export function getGuardianDisplayName(
  studentName: string | null | undefined,
  relationship: string | null | undefined,
  guardianName?: string | null | undefined
): string {
  // 학생 이름이 없으면 학부모 본인 이름 반환
  if (!studentName) {
    return guardianName || '보호자'
  }

  // 관계가 있으면 "학생이름 + 관계" 형식
  if (relationship) {
    const relationshipLabel = getGuardianRelationshipLabel(relationship)
    return `${studentName} ${relationshipLabel}`
  }

  // 관계가 없으면 학부모 본인 이름 반환
  return guardianName || studentName
}

// 기본 학교 목록 (tenant_codes 테이블이 없을 때 사용)
export const DEFAULT_SCHOOLS = [
  '서울초등학교',
  '강남중학교',
  '역삼고등학교',
  '선릉초등학교',
  '대치중학교',
  '개포고등학교',
] as const

// 학부모 등록 모드
export const GUARDIAN_MODES = {
  NEW: 'new',
  EXISTING: 'existing',
  SKIP: 'skip',
} as const

export type GuardianMode = typeof GUARDIAN_MODES[keyof typeof GUARDIAN_MODES]

// 출석 상태
export const ATTENDANCE_STATUSES = [
  { value: 'present', label: '출석', variant: 'default' as const },
  { value: 'late', label: '지각', variant: 'secondary' as const },
  { value: 'absent', label: '결석', variant: 'destructive' as const },
  { value: 'excused', label: '조퇴', variant: 'outline' as const },
] as const

export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number]['value']

// 출석 상태 맵 헬퍼 함수
export function getAttendanceStatusInfo(status: string) {
  const statusInfo = ATTENDANCE_STATUSES.find((s) => s.value === status)
  return statusInfo || { label: status, variant: 'secondary' as const }
}

// 요일
export const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'] as const

export type DayOfWeek = typeof DAYS_OF_WEEK[number]

// 사용자 역할
export const USER_ROLES = [
  { value: 'admin', label: '관리자' },
  { value: 'teacher', label: '강사' },
  { value: 'student', label: '학생' },
  { value: 'guardian', label: '보호자' },
] as const

export type UserRole = typeof USER_ROLES[number]['value']

// 학생 코드 생성
export function generateStudentCode(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(2) // 25
  const month = (now.getMonth() + 1).toString().padStart(2, '0') // 01-12

  // 더 안전한 랜덤 생성: timestamp(밀리초) + random
  // 같은 밀리초에 생성될 확률은 극히 낮음
  const timestamp = Date.now().toString().slice(-3) // 마지막 3자리 (000-999)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0') // 000-999

  return `S${year}${month}${timestamp}${random}` // S2510123456 (11자리)
}

// 기본 Tenant ID (개발용)
export const DEFAULT_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'

/**
 * UI/UX Design System Constants
 * 모든 페이지에서 일관된 UI/UX를 위한 상수들
 */

// 페이지 레이아웃
export const PAGE_LAYOUT = {
  // 페이지 상단 헤더 간격
  HEADER_SPACING: 'space-y-6',
  // 카드 그리드 간격
  GRID_GAP: 'gap-4',
  // 섹션 간 간격
  SECTION_SPACING: 'space-y-6',
} as const

// 카드 스타일
export const CARD_STYLES = {
  // 기본 카드
  DEFAULT: 'hover:shadow-md transition-shadow',
  // 클릭 가능한 카드
  INTERACTIVE: 'hover:shadow-md hover:border-primary/50 transition-all cursor-pointer',
  // 강조 카드
  HIGHLIGHT: 'border-primary/20 bg-primary/5',
  // 경고 카드
  WARNING: 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-800',
  // 위험 카드
  DANGER: 'border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800',
  // 성공 카드
  SUCCESS: 'border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800',
} as const

// 그리드 레이아웃
export const GRID_LAYOUTS = {
  // 통계 카드 그리드 (2-3열)
  STATS: 'grid gap-4 md:grid-cols-2 lg:grid-cols-3',
  // 4열 그리드
  QUAD: 'grid gap-4 md:grid-cols-2 lg:grid-cols-4',
  // 2열 그리드
  DUAL: 'grid gap-4 md:grid-cols-2',
  // 리스트 아이템
  LIST: 'space-y-3',
} as const

// 텍스트 스타일
export const TEXT_STYLES = {
  // 페이지 제목
  PAGE_TITLE: 'text-3xl font-bold',
  // 페이지 설명
  PAGE_DESCRIPTION: 'text-muted-foreground',
  // 섹션 제목
  SECTION_TITLE: 'text-xl font-semibold',
  // 카드 제목
  CARD_TITLE: 'text-base font-medium',
  // 레이블
  LABEL: 'text-sm font-medium',
  // 서브텍스트
  SUBTEXT: 'text-sm text-muted-foreground',
} as const

// 아이콘 크기
export const ICON_SIZES = {
  XS: 'h-3 w-3',
  SM: 'h-4 w-4',
  MD: 'h-5 w-5',
  LG: 'h-6 w-6',
  XL: 'h-8 w-8',
} as const
