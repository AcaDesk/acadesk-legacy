import { createClient } from '@/lib/supabase/client'

/**
 * 동적 세그먼트의 실제 데이터를 가져오는 함수 타입
 */
type DynamicSegmentResolver = (segment: string) => Promise<string>

/**
 * 브래드크럼 설정 타입
 * - string: 정적 레이블
 * - DynamicSegmentResolver: 동적 데이터를 가져오는 함수
 */
type BreadcrumbConfig = Record<string, string | DynamicSegmentResolver>

/**
 * 학생 ID로 학생 이름을 조회하는 함수
 */
async function getStudentName(studentId: string): Promise<string> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('students')
      .select('name')
      .eq('id', studentId)
      .single()

    if (error || !data) {
      console.error('[Breadcrumb] Failed to fetch student name:', error)
      return studentId
    }

    return data.name
  } catch (err) {
    console.error('[Breadcrumb] Error fetching student name:', err)
    return studentId
  }
}

/**
 * 보호자 ID로 보호자 이름을 조회하는 함수
 */
async function getGuardianName(guardianId: string): Promise<string> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('guardians')
      .select('name')
      .eq('id', guardianId)
      .single()

    if (error || !data) {
      console.error('[Breadcrumb] Failed to fetch guardian name:', error)
      return guardianId
    }

    return data.name
  } catch (err) {
    console.error('[Breadcrumb] Error fetching guardian name:', err)
    return guardianId
  }
}

/**
 * 반 ID로 반 이름을 조회하는 함수
 */
async function getClassName(classId: string): Promise<string> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('classes')
      .select('name')
      .eq('id', classId)
      .single()

    if (error || !data) {
      console.error('[Breadcrumb] Failed to fetch class name:', error)
      return classId
    }

    return data.name
  } catch (err) {
    console.error('[Breadcrumb] Error fetching class name:', err)
    return classId
  }
}

/**
 * 시험 ID로 시험 이름을 조회하는 함수
 */
async function getExamName(examId: string): Promise<string> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('exams')
      .select('name')
      .eq('id', examId)
      .single()

    if (error || !data) {
      console.error('[Breadcrumb] Failed to fetch exam name:', error)
      return examId
    }

    return data.name
  } catch (err) {
    console.error('[Breadcrumb] Error fetching exam name:', err)
    return examId
  }
}

/**
 * 보고서 ID로 보고서 제목을 조회하는 함수
 */
async function getReportTitle(reportId: string): Promise<string> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('reports')
      .select('title')
      .eq('id', reportId)
      .single()

    if (error || !data) {
      console.error('[Breadcrumb] Failed to fetch report title:', error)
      return reportId
    }

    return data.title
  } catch (err) {
    console.error('[Breadcrumb] Error fetching report title:', err)
    return reportId
  }
}

/**
 * 브래드크럼 경로 매핑 설정
 *
 * - 정적 경로: { '/path': '레이블' }
 * - 동적 경로: { '/path/[id]': async (segment) => { ... } }
 */
export const BREADCRUMB_CONFIG: BreadcrumbConfig = {
  // Dashboard
  '/dashboard': '대시보드',

  // Students (학생)
  '/students': '학생 관리',
  '/students/new': '학생 등록',
  '/students/import': '학생 가져오기',
  '/students/[id]': getStudentName,
  '/students/[id]/edit': '학생 수정',

  // Guardians (보호자)
  '/guardians': '보호자 관리',
  '/guardians/new': '보호자 등록',
  '/guardians/[id]': getGuardianName,
  '/guardians/[id]/edit': '보호자 수정',

  // Attendance (출석)
  '/attendance': '출석 관리',
  '/attendance/[id]': '출석 상세',

  // Classes (반)
  '/classes': '반 관리',
  '/classes/[id]': getClassName,

  // Grades (성적)
  '/grades': '성적 관리',
  '/grades/list': '성적 목록',
  '/grades/exams': '시험 목록',
  '/grades/exams/new': '시험 등록',
  '/grades/exams/[examId]': getExamName,
  '/grades/exams/[examId]/bulk-entry': '성적 일괄 입력',
  '/grades/exam-templates': '시험 템플릿',
  '/grades/exam-templates/new': '시험 템플릿 등록',

  // Todos (할 일)
  '/todos': '할 일 관리',
  '/todos/new': '할 일 등록',
  '/todos/templates': '할 일 템플릿',
  '/todos/templates/new': '할 일 템플릿 등록',
  '/todos/verify': '할 일 검증',
  '/todos/planner': '할 일 계획',
  '/todos/stats': '할 일 통계',

  // Homeworks (숙제)
  '/homeworks': '숙제 관리',
  '/homeworks/new': '숙제 출제',
  '/homeworks/submissions': '제출 현황',

  // Textbooks (교재)
  '/textbooks': '교재 관리',
  '/textbooks/new': '교재 등록',

  // Reports (보고서)
  '/reports': '보고서',
  '/reports/list': '보고서 목록',
  '/reports/bulk': '보고서 대량 생성',
  '/reports/[id]': getReportTitle,

  // Payments (결제)
  '/payments': '결제 관리',

  // Library (도서)
  '/library': '도서관',
  '/library/lendings': '대출 관리',

  // Calendar (일정)
  '/calendar': '일정',

  // Consultations (상담)
  '/consultations': '상담 관리',

  // Settings (설정)
  '/settings': '설정',
  '/settings/subjects': '과목 설정',

  // Profile (프로필)
  '/profile': '내 프로필',

  // Help (도움말)
  '/help': '도움말',
  '/help/guide': '사용 가이드',
  '/help/inquiries': '문의하기',
  '/help/faq': 'FAQ',
  '/help/feedback': '피드백',

  // Staff (직원)
  '/staff': '직원 관리',

  // Notifications (알림)
  '/notifications': '알림',

  // Kiosk (키오스크)
  '/kiosk': '키오스크',
}

/**
 * 경로 패턴과 실제 경로를 매칭하는 함수
 *
 * @param pattern - 경로 패턴 (예: '/students/[id]')
 * @param path - 실제 경로 (예: '/students/123-abc-456')
 * @returns 매칭 여부
 */
export function matchPathPattern(pattern: string, path: string): boolean {
  const patternSegments = pattern.split('/').filter(Boolean)
  const pathSegments = path.split('/').filter(Boolean)

  if (patternSegments.length !== pathSegments.length) {
    return false
  }

  return patternSegments.every((patternSegment, i) => {
    const pathSegment = pathSegments[i]
    // [id], [examId] 등의 동적 세그먼트는 모든 값과 매칭
    return patternSegment.startsWith('[') || patternSegment === pathSegment
  })
}

/**
 * 경로 패턴에서 동적 세그먼트 값을 추출하는 함수
 *
 * @param pattern - 경로 패턴 (예: '/students/[id]/edit')
 * @param path - 실제 경로 (예: '/students/123-abc-456/edit')
 * @returns 동적 세그먼트 값 (예: '123-abc-456')
 */
export function extractDynamicSegment(pattern: string, path: string): string | null {
  const patternSegments = pattern.split('/').filter(Boolean)
  const pathSegments = path.split('/').filter(Boolean)

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i]
    if (patternSegment.startsWith('[')) {
      return pathSegments[i]
    }
  }

  return null
}
