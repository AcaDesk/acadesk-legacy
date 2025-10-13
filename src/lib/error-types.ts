/**
 * Common Error Types
 *
 * 표준화된 에러 클래스로 일관성 있는 에러 처리를 제공
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * Authentication errors (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = '인증이 필요합니다') {
    super(message, 'AUTH_REQUIRED', 401)
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * Authorization/Permission errors (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = '권한이 없습니다') {
    super(message, 'FORBIDDEN', 403)
    Object.setPrototypeOf(this, AuthorizationError.prototype)
  }
}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = '리소스') {
    super(`${resource}를 찾을 수 없습니다`, 'NOT_FOUND', 404)
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>

  constructor(
    message: string = '입력값이 올바르지 않습니다',
    errors: Record<string, string[]> = {}
  ) {
    super(message, 'VALIDATION_ERROR', 400)
    this.errors = errors
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Database operation errors (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string = '데이터베이스 오류가 발생했습니다', originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500)

    // Preserve original error for logging
    if (originalError) {
      this.stack = originalError.stack
    }

    Object.setPrototypeOf(this, DatabaseError.prototype)
  }
}

/**
 * External service errors (502)
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string = '외부 서비스 연결에 실패했습니다'
  ) {
    super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502)
    Object.setPrototypeOf(this, ExternalServiceError.prototype)
  }
}

/**
 * Conflict errors (409) - e.g., duplicate records
 */
export class ConflictError extends AppError {
  constructor(message: string = '이미 존재하는 데이터입니다') {
    super(message, 'CONFLICT', 409)
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

/**
 * Rate limit errors (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429)
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Type guard to check if error is operational (expected error)
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}
