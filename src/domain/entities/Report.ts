/**
 * Report Entity - Domain Layer
 *
 * 학생/클래스 리포트 엔티티
 * - 성적 리포트
 * - 출석 리포트
 * - 종합 리포트
 */

export enum ReportType {
  STUDENT_MONTHLY = 'student_monthly',    // 학생 월간 리포트
  STUDENT_EXAM = 'student_exam',          // 학생 시험 리포트
  CLASS_SUMMARY = 'class_summary',        // 클래스 요약
}

/**
 * 리포트 데이터 (JSON 저장)
 *
 * 스냅샷 원칙: 리포트 생성 시점의 데이터를 저장하여 재현 가능성 보장
 */
export interface ReportData {
  // 학생 정보
  studentName: string
  studentCode: string
  grade: string
  profileImageUrl?: string | null

  // 기간
  startDate: string
  endDate: string
  reportMonth: string // YYYY-MM 형식 (예: 2025-03)

  // 성적
  exams: Array<{
    name: string
    date: string
    score: number
    percentage: number
    classAverage?: number
    rank?: number
  }>
  avgScore: number

  // 출석
  attendanceRate: number
  totalDays: number
  presentDays: number
  lateDays: number
  absentDays: number

  // 숙제/과제
  homeworkRate: number
  totalTodos: number
  completedTodos: number

  // 성취율 (목표 대비)
  achievementRate?: number // 0~100 (목표 대비 달성률)

  // 성장 그래프 데이터 (최근 3~6개월 추이)
  chartPoints?: Array<{
    month: string // YYYY-MM
    avgScore: number
    attendanceRate: number
    homeworkRate: number
    achievementRate?: number
  }>

  // 과목별 상세
  subjects?: Array<{
    name: string
    score: number
    comment?: string
    nextGoal?: string
  }>

  // 상담
  consultations: Array<{
    date: string
    type: string
    summary: string
  }>

  // 종합 평가 (담임 코멘트)
  overallComment?: string

  // 다음 액션 (상담 제안 등)
  nextActions?: Array<{
    type: 'consultation' | 'supplementary' | 'purchase'
    title: string
    description?: string
    url?: string
  }>

  // 학원 정보 (문자 발송용)
  academyName?: string
  academyPhone?: string
  instructorName?: string // 담임 강사 이름
}

/**
 * Report 엔티티
 */
export class Report {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly type: ReportType,
    public readonly studentId: string | null,
    public readonly classId: string | null,
    public readonly data: ReportData,
    public readonly generatedBy: string, // 생성자 (강사 ID)
    public readonly createdAt: Date,
  ) {}

  /**
   * 링크형 SMS 메시지 생성 (90자 이내)
   * 전략: 핵심 지표 + 링크로 간결하게
   */
  toSMSMessage(baseUrl?: string): string {
    const { studentName, avgScore, attendanceRate, achievementRate } = this.data
    const url = baseUrl ? `${baseUrl}/r/${this.id}` : `https://acadesk.site/r/${this.id}`

    return `[Acadesk] ${studentName} 학습리포트
평균 ${Math.round(avgScore)}점 / 출석 ${Math.round(attendanceRate)}% / 성취 ${Math.round(achievementRate || 0)}%
${url}`
  }

  /**
   * 링크형 LMS 메시지 생성 (2000자 이내)
   * 전략: 핵심 지표 + 링크 + 미리보기
   */
  toLinkMessage(baseUrl?: string): string {
    const {
      studentName,
      reportMonth,
      avgScore,
      attendanceRate,
      homeworkRate,
      achievementRate,
      academyName,
      academyPhone,
    } = this.data

    const url = baseUrl ? `${baseUrl}/r/${this.id}` : `https://acadesk.site/r/${this.id}`
    const month = reportMonth ? `${reportMonth.split('-')[1]}월` : '이번 달'

    return `[${academyName || 'Acadesk'}] ${month} 학습 리포트 도착 📚

안녕하세요, ${studentName} 학부모님!
${month} 학습 리포트를 확인하실 수 있습니다.

━━━━━━━━━━━━━━━━━━━━
📊 핵심 지표
━━━━━━━━━━━━━━━━━━━━
• 평균 성적: ${Math.round(avgScore)}점
• 출석률: ${Math.round(attendanceRate)}%
• 과제 완료율: ${Math.round(homeworkRate)}%
${achievementRate ? `• 목표 달성률: ${Math.round(achievementRate)}%\n` : ''}
━━━━━━━━━━━━━━━━━━━━

📱 상세 리포트 보기
${url}

※ 성장 그래프, 과목별 상세, 담임 코멘트 등을 확인하실 수 있습니다.

${academyPhone ? `문의: ${academyPhone}` : '문의사항은 학원으로 연락 주세요.'}`
  }

  /**
   * 리포트를 LMS 메시지 형식으로 변환 (2000자 이내)
   */
  toLMSMessage(): string {
    const {
      studentName,
      grade,
      startDate,
      endDate,
      avgScore,
      attendanceRate,
      homeworkRate,
      exams,
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      totalTodos,
      completedTodos,
      consultations,
      overallComment,
    } = this.data

    let message = `[${studentName} 학습 리포트]

📅 기간: ${startDate} ~ ${endDate}
🎓 학년: ${grade}

━━━━━━━━━━━━━━━━━━━━
📊 성적
━━━━━━━━━━━━━━━━━━━━
평균: ${avgScore}점

`

    // 최근 3개 시험
    const recentExams = exams.slice(0, 3)
    recentExams.forEach((exam) => {
      message += `• ${exam.name}: ${exam.percentage}%`
      if (exam.rank) {
        message += ` (${exam.rank}등)`
      }
      message += '\n'
    })

    message += `
━━━━━━━━━━━━━━━━━━━━
📅 출석
━━━━━━━━━━━━━━━━━━━━
출석률: ${attendanceRate}%
총 수업일: ${totalDays}일
출석: ${presentDays}일 / 지각: ${lateDays}일 / 결석: ${absentDays}일

━━━━━━━━━━━━━━━━━━━━
✏️ 숙제
━━━━━━━━━━━━━━━━━━━━
완료율: ${homeworkRate}%
총 ${totalTodos}개 중 ${completedTodos}개 완료
`

    // 상담 기록 (최근 2개)
    if (consultations.length > 0) {
      message += `
━━━━━━━━━━━━━━━━━━━━
💬 상담 기록
━━━━━━━━━━━━━━━━━━━━
`
      consultations.slice(0, 2).forEach((consult) => {
        message += `• ${consult.date} (${consult.type})\n  ${consult.summary}\n`
      })
    }

    // 종합 평가
    if (overallComment) {
      message += `
━━━━━━━━━━━━━━━━━━━━
💡 종합 평가
━━━━━━━━━━━━━━━━━━━━
${overallComment}
`
    }

    message += '\n문의사항은 학원으로 연락 주세요.'

    return message
  }

  /**
   * 카카오톡 템플릿 변수로 변환
   */
  toKakaoVariables(): Record<string, string> {
    return {
      studentName: this.data.studentName,
      grade: this.data.grade,
      period: `${this.data.startDate} ~ ${this.data.endDate}`,
      avgScore: this.data.avgScore.toString(),
      attendanceRate: this.data.attendanceRate.toString(),
      homeworkRate: this.data.homeworkRate.toString(),
      presentDays: this.data.presentDays.toString(),
      totalDays: this.data.totalDays.toString(),
    }
  }

  /**
   * 이메일 HTML 형식으로 변환 (추후 구현)
   */
  toEmailHTML(): string {
    // TODO: HTML 템플릿 적용
    return this.toLMSMessage()
  }

  /**
   * Factory: Database 데이터에서 Report 엔티티 생성
   */
  static fromDatabase(row: {
    id: string
    tenant_id: string
    type: ReportType
    student_id: string | null
    class_id: string | null
    data: ReportData
    generated_by: string
    created_at: string
  }): Report {
    return new Report(
      row.id,
      row.tenant_id,
      row.type,
      row.student_id,
      row.class_id,
      row.data,
      row.generated_by,
      new Date(row.created_at),
    )
  }

  /**
   * Database 저장용 데이터로 변환
   */
  toDatabase() {
    return {
      id: this.id,
      tenant_id: this.tenantId,
      type: this.type,
      student_id: this.studentId,
      class_id: this.classId,
      data: this.data,
      generated_by: this.generatedBy,
    }
  }
}
