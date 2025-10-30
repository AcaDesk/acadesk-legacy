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
 * 보고서 ID로 학생 이름을 조회하는 함수
 */
async function getReportStudentName(reportId: string): Promise<string> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('reports')
      .select(`
        students (
          users (name)
        )
      `)
      .eq('id', reportId)
      .single()

    if (error || !data) {
      console.error('[Breadcrumb] Failed to fetch student name from report:', error)
      return reportId
    }

    // Type assertion for Supabase nested relationship
    const reportData = data as any
    const studentName = reportData?.students?.users?.name

    if (!studentName) {
      console.error('[Breadcrumb] Student name not found in report data')
      return reportId
    }

    return studentName
  } catch (err) {
    console.error('[Breadcrumb] Error fetching student name from report:', err)
    return reportId
  }
}

/**
 * 교재 ID로 교재명을 조회하는 함수
 */
async function getTextbookTitle(textbookId: string): Promise<string> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('textbooks')
      .select('title')
      .eq('id', textbookId)
      .single()

    if (error || !data) {
      console.error('[Breadcrumb] Failed to fetch textbook title:', error)
      return textbookId
    }

    return data.title
  } catch (err) {
    console.error('[Breadcrumb] Error fetching textbook title:', err)
    return textbookId
  }
}

/**
 * 상담 ID로 상담 제목을 조회하는 함수
 */
async function getConsultationTitle(consultationId: string): Promise<string> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('consultations')
      .select('title')
      .eq('id', consultationId)
      .single()

    if (error || !data) {
      console.error('[Breadcrumb] Failed to fetch consultation title:', error)
      return consultationId
    }

    return data.title
  } catch (err) {
    console.error('[Breadcrumb] Error fetching consultation title:', err)
    return consultationId
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
  '/attendance/daily': '일일 출석부',
  '/attendance/[id]': '출석 상세',

  // Classes (반)
  '/classes': '반 관리',
  '/classes/new': '반 등록',
  '/classes/[id]': getClassName,
  '/classes/[id]/edit': '반 수정',

  // Grades (성적)
  '/grades': '성적 관리',
  '/grades/entry': '성적 입력',
  '/grades/list': '성적 목록',
  '/grades/exams': '시험 목록',
  '/grades/exams/new': '시험 등록',
  '/grades/exams/[examId]': getExamName,
  '/grades/exams/[examId]/edit': '시험 수정',
  '/grades/exams/[examId]/bulk-entry': '성적 일괄 입력',
  '/grades/exam-templates': '시험 템플릿',
  '/grades/exam-templates/new': '시험 템플릿 등록',
  '/grades/exam-templates/[id]': '시험 템플릿 수정',
  '/grades/exam-templates/[id]/edit': '시험 템플릿 수정',
  '/grades/retests': '재시험 관리',

  // Todos (할 일)
  '/todos': '할 일 관리',
  '/todos/new': '할 일 등록',
  '/todos/templates': '할 일 템플릿',
  '/todos/templates/new': '할 일 템플릿 등록',
  '/todos/templates/[id]': '할 일 템플릿 수정',
  '/todos/templates/[id]/edit': '할 일 템플릿 수정',
  '/todos/verify': '할 일 검증',
  '/todos/planner': '할 일 계획',
  '/todos/stats': '할 일 통계',
  '/todos/[id]': '할 일 상세',
  '/todos/[id]/edit': '할 일 수정',

  // Homeworks (숙제)
  '/homeworks': '숙제 관리',
  '/homeworks/new': '숙제 출제',
  '/homeworks/submissions': '제출 현황',
  '/homeworks/[id]': '숙제 상세',
  '/homeworks/[id]/edit': '숙제 수정',

  // Textbooks (교재)
  '/textbooks': '교재 관리',
  '/textbooks/new': '교재 등록',
  '/textbooks/[id]': getTextbookTitle,
  '/textbooks/[id]/edit': '교재 수정',

  // Reports (보고서)
  '/reports': '리포트 관리',
  '/reports/bulk': '일괄 생성',
  '/reports/new': '개별 생성',
  '/reports/[id]': getReportStudentName,
  '/reports/[id]/edit': '보고서 수정',

  // Payments (결제)
  '/payments': '결제 관리',
  '/payments/new': '결제 등록',
  '/payments/[id]': '결제 상세',

  // Library (도서)
  '/library': '도서관',
  '/library/lendings': '대출 관리',
  '/library/lendings/new': '도서 대출',

  // Calendar (일정)
  '/calendar': '일정',
  '/calendar/new': '일정 등록',
  '/calendar/[id]': '일정 상세',

  // Consultations (상담)
  '/consultations': '상담 관리',
  '/consultations/new': '상담 등록',
  '/consultations/[id]': getConsultationTitle,
  '/consultations/[id]/edit': '상담 수정',

  // Settings (설정)
  '/settings': '설정',
  '/settings/academy': '학원 설정',
  '/settings/subjects': '과목 설정',
  '/settings/messaging-integration': '알림 서비스 연동',
  '/settings/message-templates': '메시지 템플릿',

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
  '/staff/new': '직원 등록',
  '/staff/[id]': '직원 상세',
  '/staff/[id]/edit': '직원 수정',

  // Notifications (알림)
  '/notifications': '알림',
  '/notifications/[id]': '알림 상세',

  // Kiosk (키오스크)
  '/kiosk': '키오스크',
  '/kiosk/login': '키오스크 로그인',
  '/kiosk/checkin': '출석 체크인',
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
