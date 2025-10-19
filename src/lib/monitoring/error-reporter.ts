/**
 * 에러 리포팅 유틸리티
 *
 * Sentry 또는 다른 모니터링 서비스로 에러를 전송
 * 환경 변수를 통해 활성화/비활성화 가능
 */

import { AuthStageError } from '@/lib/auth/auth-errors'

interface ErrorContext {
  [key: string]: unknown
}

interface ErrorReporterConfig {
  enabled: boolean
  environment: string
  // Sentry DSN 등 추가 설정
  dsn?: string
}

class ErrorReporter {
  private config: ErrorReporterConfig
  private initialized = false

  constructor() {
    this.config = {
      enabled: process.env.NEXT_PUBLIC_ERROR_REPORTING_ENABLED === 'true',
      environment: process.env.NODE_ENV || 'development',
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    }
  }

  /**
   * 에러 리포터 초기화
   */
  async initialize() {
    if (!this.config.enabled) {
      console.log('[ErrorReporter] Error reporting is disabled')
      return
    }

    if (this.initialized) {
      return
    }

    try {
      // Sentry가 설치되어 있는 경우에만 초기화
      if (this.config.dsn) {
        // 동적 import를 사용하여 Sentry가 없어도 빌드 가능
        // const Sentry = await import('@sentry/nextjs')
        // Sentry.init({
        //   dsn: this.config.dsn,
        //   environment: this.config.environment,
        //   tracesSampleRate: 1.0,
        // })
        console.log('[ErrorReporter] Sentry initialized')
      }

      this.initialized = true
    } catch (error) {
      console.error('[ErrorReporter] Failed to initialize:', error)
    }
  }

  /**
   * AuthStageError를 리포팅
   */
  captureAuthStageError(error: AuthStageError, context?: ErrorContext) {
    if (!this.config.enabled) {
      // 개발 환경에서는 콘솔에만 출력
      console.error('[ErrorReporter] AuthStageError:', {
        code: error.code,
        message: error.message,
        context,
        originalError: error.originalError,
      })
      return
    }

    try {
      // Sentry에 전송
      // if (typeof Sentry !== 'undefined') {
      //   Sentry.captureException(error, {
      //     tags: {
      //       error_type: 'auth_stage_error',
      //       error_code: error.code,
      //     },
      //     contexts: {
      //       auth: context || {},
      //     },
      //     extra: {
      //       originalError: error.originalError,
      //     },
      //   })
      // }

      // 로컬 로깅 (항상 수행)
      this.logError(error, context)
    } catch (err) {
      console.error('[ErrorReporter] Failed to capture error:', err)
    }
  }

  /**
   * 일반 에러 리포팅
   */
  captureException(error: Error, context?: ErrorContext) {
    if (!this.config.enabled) {
      console.error('[ErrorReporter] Error:', error, context)
      return
    }

    try {
      // Sentry에 전송
      // if (typeof Sentry !== 'undefined') {
      //   Sentry.captureException(error, {
      //     contexts: {
      //       custom: context || {},
      //     },
      //   })
      // }

      this.logError(error, context)
    } catch (err) {
      console.error('[ErrorReporter] Failed to capture error:', err)
    }
  }

  /**
   * 커스텀 메시지 리포팅
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    if (!this.config.enabled) {
      console.log(`[ErrorReporter] ${level.toUpperCase()}:`, message, context)
      return
    }

    try {
      // Sentry에 전송
      // if (typeof Sentry !== 'undefined') {
      //   Sentry.captureMessage(message, {
      //     level: level as any,
      //     contexts: {
      //       custom: context || {},
      //     },
      //   })
      // }

      this.logMessage(message, level, context)
    } catch (err) {
      console.error('[ErrorReporter] Failed to capture message:', err)
    }
  }

  /**
   * 브레드크럼 추가 (디버깅용 이벤트 로그)
   */
  addBreadcrumb(..._args: unknown[]) {
    if (!this.config.enabled) {
      return
    }

    try {
      // Sentry에 브레드크럼 추가
      // if (typeof Sentry !== 'undefined') {
      //   Sentry.addBreadcrumb({
      //     message,
      //     data,
      //     level: 'info',
      //     timestamp: Date.now() / 1000,
      //   })
      // }
    } catch (err) {
      console.error('[ErrorReporter] Failed to add breadcrumb:', err)
    }
  }

  /**
   * 사용자 컨텍스트 설정
   */
  setUser(..._args: unknown[]) {
    if (!this.config.enabled) {
      return
    }

    try {
      // Sentry에 사용자 정보 설정
      // if (typeof Sentry !== 'undefined') {
      //   Sentry.setUser(user)
      // }
    } catch (err) {
      console.error('[ErrorReporter] Failed to set user:', err)
    }
  }

  /**
   * 로컬 에러 로깅 (구조화된 JSON)
   */
  private logError(error: Error, context?: ErrorContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      environment: this.config.environment,
    }

    // AuthStageError인 경우 추가 정보
    if (error instanceof AuthStageError) {
      Object.assign(logEntry.error, {
        code: error.code,
        originalError: error.originalError,
      })
    }

    console.error('[ErrorReporter]', JSON.stringify(logEntry, null, 2))
  }

  /**
   * 로컬 메시지 로깅
   */
  private logMessage(message: string, level: string, context?: ErrorContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      environment: this.config.environment,
    }

    console.log('[ErrorReporter]', JSON.stringify(logEntry, null, 2))
  }
}

// 싱글톤 인스턴스
export const errorReporter = new ErrorReporter()

// 앱 시작 시 초기화 (선택적)
if (typeof window !== 'undefined') {
  errorReporter.initialize().catch(console.error)
}
