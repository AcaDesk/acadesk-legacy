/**
 * Common Error Handlers
 *
 * 에러를 사용자 친화적인 메시지로 변환하고 적절한 로깅을 제공
 */

import {
  isAppError,
  ValidationError,
} from './error-types'
import { ZodError, type ZodIssue } from 'zod'

/**
 * Error response structure for API routes
 */
export interface ErrorResponse {
  message: string
  code: string
  statusCode: number
  errors?: Record<string, string[]>
}

/**
 * Convert any error to a user-friendly message
 *
 * 이 함수는 모든 에러를 사용자 친화적인 메시지로 변환합니다.
 * 개발자를 위한 상세 로그는 자동으로 콘솔에 기록됩니다.
 */
export function getErrorMessage(error: unknown, context?: string): string {
  // 개발자를 위한 상세 로그 (항상 원본 에러 기록)
  console.error(
    `[Error${context ? ` in ${context}` : ''}]`,
    error instanceof Error ? error.message : error,
    error
  )

  // Known AppError types
  if (isAppError(error)) {
    return error.message
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const firstError = error.issues[0]
    return firstError?.message || '입력값이 올바르지 않습니다'
  }

  // Supabase errors
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    // Check for Supabase-specific error codes
    if ('code' in error) {
      const code = error.code as string

      // PostgreSQL Error Codes
      if (code === '23505') return '이미 존재하는 데이터입니다' // Unique violation
      if (code === '23503') return '참조된 데이터가 존재하지 않습니다' // Foreign key violation
      if (code === '23502') return '필수 입력값이 누락되었습니다' // Not null violation
      if (code === '42501') return '권한이 없습니다' // Insufficient privilege
      if (code === '42P01') return '테이블을 찾을 수 없습니다' // Undefined table

      // PostgREST Error Codes
      if (code === 'PGRST116') return '데이터를 찾을 수 없습니다' // No rows returned
      if (code === 'PGRST301') return '인증이 필요합니다' // JWT expired
      if (code === 'PGRST302') return '인증 정보가 올바르지 않습니다' // JWT invalid

      // HTTP Error Codes
      if (code === '403') return '이 작업을 수행할 권한이 없습니다'
      if (code === '404') return '요청한 리소스를 찾을 수 없습니다'
      if (code === '429') return '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요'
    }

    // Network errors
    if (error.message.includes('fetch failed') ||
        error.message.includes('Network request failed') ||
        error.message.includes('Failed to fetch')) {
      return '네트워크 연결을 확인해주세요'
    }

    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return '요청 시간이 초과되었습니다. 다시 시도해주세요'
    }

    return error.message
  }

  // Generic error
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch failed') ||
        error.message.includes('Network request failed') ||
        error.message.includes('Failed to fetch')) {
      return '네트워크 연결을 확인해주세요'
    }

    return error.message
  }

  // Unknown error type
  return '알 수 없는 오류가 발생했습니다'
}

/**
 * Convert error to API error response
 */
export function toErrorResponse(error: unknown): ErrorResponse {
  // Known AppError types
  if (isAppError(error)) {
    const response: ErrorResponse = {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    }

    if (error instanceof ValidationError && Object.keys(error.errors).length > 0) {
      response.errors = error.errors
    }

    return response
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {}

    error.issues.forEach((err: ZodIssue) => {
      const path = err.path.join('.')
      if (!errors[path]) {
        errors[path] = []
      }
      errors[path].push(err.message)
    })

    return {
      message: '입력값이 올바르지 않습니다',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      errors,
    }
  }

  // Database/Supabase errors
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const code = error.code as string
    let statusCode = 500

    // Map PostgreSQL error codes to HTTP status codes
    if (code === '23505') statusCode = 409 // Unique violation
    if (code === '23503') statusCode = 400 // Foreign key violation
    if (code === '23502') statusCode = 400 // Not null violation
    if (code === '42501') statusCode = 403 // Insufficient privilege
    if (code === '42P01') statusCode = 500 // Undefined table

    // Map PostgREST error codes to HTTP status codes
    if (code === 'PGRST116') statusCode = 404 // Not found
    if (code === 'PGRST301') statusCode = 401 // JWT expired
    if (code === 'PGRST302') statusCode = 401 // JWT invalid

    // Map HTTP error codes
    if (code === '403') statusCode = 403
    if (code === '404') statusCode = 404
    if (code === '429') statusCode = 429

    return {
      message: getErrorMessage(error),
      code,
      statusCode,
    }
  }

  // Generic error
  return {
    message: getErrorMessage(error),
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  }
}

/**
 * Log error with appropriate severity
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  const errorInfo = {
    message: getErrorMessage(error),
    timestamp: new Date().toISOString(),
    ...context,
  }

  // Operational errors - warning level
  if (isAppError(error) && error.isOperational) {
    console.warn('[Operational Error]', errorInfo, error)
    return
  }

  // Programming/system errors - error level
  console.error('[System Error]', errorInfo, error)

  // In production, send to error tracking service (Sentry, etc.)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service
    // Sentry.captureException(error, { extra: errorInfo })
  }
}

/**
 * Handle error in API route
 * Usage: return handleApiError(error)
 */
export function handleApiError(error: unknown, context?: Record<string, unknown>) {
  logError(error, context)
  const errorResponse = toErrorResponse(error)

  return Response.json(errorResponse, {
    status: errorResponse.statusCode,
  })
}

/**
 * Handle error in Server Action
 * Usage: return handleServerActionError(error)
 */
export function handleServerActionError(
  error: unknown,
  context?: Record<string, unknown>
): { success: false; error: string; code?: string } {
  logError(error, context)

  return {
    success: false,
    error: getErrorMessage(error),
    code: isAppError(error) ? error.code : 'INTERNAL_ERROR',
  }
}

/**
 * Wrap async function with error handling
 * Usage: const safeFunction = withErrorHandling(asyncFunction)
 */
export function withErrorHandling<
  TArgs extends unknown[],
  TReturn
>(
  fn: (...args: TArgs) => Promise<TReturn>,
  context?: Record<string, unknown>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args)
    } catch (error) {
      logError(error, { ...context, args })
      throw error
    }
  }
}
