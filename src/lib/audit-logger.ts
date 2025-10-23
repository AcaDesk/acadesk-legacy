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
 * 프로덕션 환경에서는 데이터베이스에 저장
 * 개발 환경에서는 콘솔 출력
 */
export function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }

  // 환경에 따라 다른 처리
  const env = process.env.NEXT_PUBLIC_ENV || 'local'

  if (env === 'production' || env === 'staging') {
    // 프로덕션/스테이징: 데이터베이스에 저장
    saveAuditLogToDatabase(logEntry).catch((error) => {
      // 로그 저장 실패시에도 앱은 계속 동작해야 함
      console.error('[AUDIT] Failed to save audit log:', error)
      console.log('[AUDIT] Fallback:', JSON.stringify(logEntry))
    })
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
 * Audit 로그를 데이터베이스에 저장 (내부 함수)
 * Service Role Key를 사용하여 RLS를 우회하고 직접 삽입
 */
async function saveAuditLogToDatabase(entry: AuditLogEntry): Promise<void> {
  try {
    // Service role key는 RLS를 우회할 수 있으므로 주의해서 사용
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase credentials not configured for audit logging')
    }

    // Service role 클라이언트는 동적 import로 가져옴 (서버 사이드에서만 사용)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { error } = await supabase.from('audit_logs').insert({
      tenant_id: entry.tenantId || null,
      event: entry.event,
      timestamp: entry.timestamp,
      student_id: entry.studentId || null,
      student_code: entry.studentCode || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      success: entry.success,
      error_message: entry.errorMessage || null,
      metadata: entry.metadata || {},
    })

    if (error) {
      throw error
    }
  } catch (error) {
    // 로그 저장 실패는 에러를 던져서 상위에서 처리
    throw new Error(`Failed to save audit log: ${error}`)
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
