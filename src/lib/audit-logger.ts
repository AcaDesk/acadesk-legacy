/**
 * Audit Logger
 * 보안 감사 로그 시스템
 *
 * 키오스크 인증, 중요 데이터 변경 등 보안 관련 이벤트를 기록합니다.
 */

type AuditEventType =
  | 'kiosk_login_attempt'
  | 'kiosk_login_success'
  | 'kiosk_login_failed'
  | 'kiosk_logout'
  | 'todo_completed'
  | 'todo_uncompleted'
  | 'unauthorized_access'

interface AuditLogEntry {
  event: AuditEventType
  timestamp: string
  tenantId?: string
  studentId?: string
  studentCode?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  success: boolean
  errorMessage?: string
}

/**
 * 감사 로그 기록
 *
 * 프로덕션 환경에서는 데이터베이스나 외부 로그 서비스로 전송
 * 개발 환경에서는 콘솔 출력
 */
export function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }

  // 환경에 따라 다른 처리
  const env = process.env.NEXT_PUBLIC_ENV || 'local'

  if (env === 'production') {
    // TODO: 프로덕션에서는 데이터베이스나 외부 서비스로 전송
    // 예: Sentry, DataDog, CloudWatch, 또는 Supabase 테이블
    console.log('[AUDIT]', JSON.stringify(logEntry))
  } else {
    // 개발/로컬에서는 콘솔 출력
    const emoji = logEntry.success ? '✅' : '❌'
    console.log(`${emoji} [AUDIT] ${logEntry.event}:`, {
      student: logEntry.studentCode || logEntry.studentId,
      success: logEntry.success,
      error: logEntry.errorMessage,
      metadata: logEntry.metadata,
    })
  }
}

/**
 * 키오스크 로그인 시도 기록
 */
export function logKioskLoginAttempt(params: {
  studentCode: string
  tenantId: string
  ipAddress?: string
  userAgent?: string
}): void {
  logAuditEvent({
    event: 'kiosk_login_attempt',
    tenantId: params.tenantId,
    studentCode: params.studentCode,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: true, // 시도 자체는 성공
  })
}

/**
 * 키오스크 로그인 성공 기록
 */
export function logKioskLoginSuccess(params: {
  studentId: string
  studentCode: string
  tenantId: string
  ipAddress?: string
  userAgent?: string
}): void {
  logAuditEvent({
    event: 'kiosk_login_success',
    tenantId: params.tenantId,
    studentId: params.studentId,
    studentCode: params.studentCode,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: true,
  })
}

/**
 * 키오스크 로그인 실패 기록
 */
export function logKioskLoginFailed(params: {
  studentCode: string
  tenantId: string
  reason: string
  ipAddress?: string
  userAgent?: string
}): void {
  logAuditEvent({
    event: 'kiosk_login_failed',
    tenantId: params.tenantId,
    studentCode: params.studentCode,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: false,
    errorMessage: params.reason,
  })
}

/**
 * 키오스크 로그아웃 기록
 */
export function logKioskLogout(params: {
  studentId: string
  studentCode: string
  tenantId?: string
}): void {
  logAuditEvent({
    event: 'kiosk_logout',
    tenantId: params.tenantId,
    studentId: params.studentId,
    studentCode: params.studentCode,
    success: true,
  })
}

/**
 * TODO 완료 기록
 */
export function logTodoCompleted(params: {
  todoId: string
  studentId: string
  tenantId?: string
}): void {
  logAuditEvent({
    event: 'todo_completed',
    tenantId: params.tenantId,
    studentId: params.studentId,
    success: true,
    metadata: {
      todoId: params.todoId,
    },
  })
}

/**
 * TODO 완료 취소 기록
 */
export function logTodoUncompleted(params: {
  todoId: string
  studentId: string
  tenantId?: string
}): void {
  logAuditEvent({
    event: 'todo_uncompleted',
    tenantId: params.tenantId,
    studentId: params.studentId,
    success: true,
    metadata: {
      todoId: params.todoId,
    },
  })
}

/**
 * 권한 없는 접근 시도 기록
 */
export function logUnauthorizedAccess(params: {
  studentId: string
  resourceType: string
  resourceId: string
  reason: string
}): void {
  logAuditEvent({
    event: 'unauthorized_access',
    studentId: params.studentId,
    success: false,
    errorMessage: params.reason,
    metadata: {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
    },
  })
}
