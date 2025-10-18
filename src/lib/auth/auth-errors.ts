/**
 * 인증 관련 커스텀 에러 클래스
 */

export enum AuthStageErrorCode {
  // 프로필 생성 관련
  PROFILE_CREATION_FAILED = 'PROFILE_CREATION_FAILED',
  PROFILE_ALREADY_EXISTS = 'PROFILE_ALREADY_EXISTS',

  // 원장 설정 관련
  OWNER_SETUP_FAILED = 'OWNER_SETUP_FAILED',
  OWNER_SETUP_ALREADY_COMPLETED = 'OWNER_SETUP_ALREADY_COMPLETED',

  // 초대 관련
  INVITE_INVALID = 'INVITE_INVALID',
  INVITE_EXPIRED = 'INVITE_EXPIRED',
  INVITE_ALREADY_ACCEPTED = 'INVITE_ALREADY_ACCEPTED',
  INVITE_ACCEPT_FAILED = 'INVITE_ACCEPT_FAILED',

  // 인증 상태 확인 관련
  AUTH_STAGE_CHECK_FAILED = 'AUTH_STAGE_CHECK_FAILED',
  UNEXPECTED_AUTH_STAGE = 'UNEXPECTED_AUTH_STAGE',

  // 일반적인 에러
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AuthStageError extends Error {
  constructor(
    public code: AuthStageErrorCode,
    message: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'AuthStageError'

    // 스택 트레이스 유지
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthStageError)
    }
  }
}

/**
 * RPC 에러를 AuthStageError로 변환
 */
export function parseRpcError(
  error: unknown,
  context: 'profile' | 'owner_setup' | 'invite' | 'auth_stage'
): AuthStageError {
  // 이미 AuthStageError인 경우
  if (error instanceof AuthStageError) {
    return error
  }

  // Supabase 에러인 경우
  const rpcError = error as { message?: string; code?: string }
  const message = rpcError?.message?.toLowerCase() || ''
  const code = rpcError?.code?.toLowerCase() || ''

  // 컨텍스트별 에러 분류
  if (context === 'profile') {
    if (message.includes('already exists')) {
      return new AuthStageError(
        AuthStageErrorCode.PROFILE_ALREADY_EXISTS,
        '프로필이 이미 존재합니다.',
        error
      )
    }
    return new AuthStageError(
      AuthStageErrorCode.PROFILE_CREATION_FAILED,
      '프로필 생성에 실패했습니다.',
      error
    )
  }

  if (context === 'owner_setup') {
    if (message.includes('already completed')) {
      return new AuthStageError(
        AuthStageErrorCode.OWNER_SETUP_ALREADY_COMPLETED,
        '학원 설정이 이미 완료되었습니다.',
        error
      )
    }
    return new AuthStageError(
      AuthStageErrorCode.OWNER_SETUP_FAILED,
      '학원 설정 중 오류가 발생했습니다.',
      error
    )
  }

  if (context === 'invite') {
    if (message.includes('invalid') || code.includes('invalid')) {
      return new AuthStageError(
        AuthStageErrorCode.INVITE_INVALID,
        '유효하지 않은 초대 코드입니다.',
        error
      )
    }
    if (message.includes('expired') || code.includes('expired')) {
      return new AuthStageError(
        AuthStageErrorCode.INVITE_EXPIRED,
        '초대 코드가 만료되었습니다.',
        error
      )
    }
    if (message.includes('already') || message.includes('used')) {
      return new AuthStageError(
        AuthStageErrorCode.INVITE_ALREADY_ACCEPTED,
        '이미 수락된 초대 코드입니다.',
        error
      )
    }
    return new AuthStageError(
      AuthStageErrorCode.INVITE_ACCEPT_FAILED,
      '초대 수락에 실패했습니다.',
      error
    )
  }

  if (context === 'auth_stage') {
    return new AuthStageError(
      AuthStageErrorCode.AUTH_STAGE_CHECK_FAILED,
      '인증 상태를 확인할 수 없습니다.',
      error
    )
  }

  // 네트워크 에러
  if (message.includes('network') || message.includes('fetch')) {
    return new AuthStageError(
      AuthStageErrorCode.NETWORK_ERROR,
      '네트워크 연결을 확인해주세요.',
      error
    )
  }

  // 인증 에러
  if (message.includes('unauthenticated') || code.includes('401')) {
    return new AuthStageError(
      AuthStageErrorCode.UNAUTHENTICATED,
      '로그인이 필요합니다.',
      error
    )
  }

  // 알 수 없는 에러
  return new AuthStageError(
    AuthStageErrorCode.UNKNOWN_ERROR,
    '알 수 없는 오류가 발생했습니다.',
    error
  )
}

/**
 * AuthStageError를 사용자 친화적인 메시지로 변환
 */
export function getAuthStageErrorMessage(error: AuthStageError): {
  title: string
  description: string
  canRetry: boolean
} {
  switch (error.code) {
    case AuthStageErrorCode.PROFILE_CREATION_FAILED:
      return {
        title: '프로필 생성 실패',
        description: '프로필을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.',
        canRetry: true,
      }

    case AuthStageErrorCode.PROFILE_ALREADY_EXISTS:
      return {
        title: '프로필이 이미 존재합니다',
        description: '이미 프로필이 생성되어 있습니다. 로그인을 시도해주세요.',
        canRetry: false,
      }

    case AuthStageErrorCode.OWNER_SETUP_FAILED:
      return {
        title: '학원 설정 실패',
        description: '학원 정보를 저장하는 중 오류가 발생했습니다. 입력 내용을 확인하고 다시 시도해주세요.',
        canRetry: true,
      }

    case AuthStageErrorCode.OWNER_SETUP_ALREADY_COMPLETED:
      return {
        title: '설정이 이미 완료되었습니다',
        description: '학원 설정이 이미 완료되어 있습니다. 대시보드로 이동합니다.',
        canRetry: false,
      }

    case AuthStageErrorCode.INVITE_INVALID:
      return {
        title: '유효하지 않은 초대 코드',
        description: '초대 코드를 다시 확인하거나, 학원 관리자에게 문의해주세요.',
        canRetry: false,
      }

    case AuthStageErrorCode.INVITE_EXPIRED:
      return {
        title: '초대 코드가 만료되었습니다',
        description: '초대 코드가 만료되었습니다. 학원 관리자에게 새로운 초대 코드를 요청해주세요.',
        canRetry: false,
      }

    case AuthStageErrorCode.INVITE_ALREADY_ACCEPTED:
      return {
        title: '이미 수락된 초대입니다',
        description: '이 초대는 이미 수락되었습니다. 로그인을 시도해주세요.',
        canRetry: false,
      }

    case AuthStageErrorCode.INVITE_ACCEPT_FAILED:
      return {
        title: '초대 수락 실패',
        description: '초대를 수락하는 중 오류가 발생했습니다. 다시 시도해주세요.',
        canRetry: true,
      }

    case AuthStageErrorCode.AUTH_STAGE_CHECK_FAILED:
      return {
        title: '인증 상태 확인 실패',
        description: '현재 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.',
        canRetry: true,
      }

    case AuthStageErrorCode.UNEXPECTED_AUTH_STAGE:
      return {
        title: '예상치 못한 상태',
        description: '현재 계정 상태를 확인할 수 없습니다. 고객센터에 문의해주세요.',
        canRetry: true,
      }

    case AuthStageErrorCode.UNAUTHENTICATED:
      return {
        title: '로그인이 필요합니다',
        description: '다시 로그인해주세요.',
        canRetry: false,
      }

    case AuthStageErrorCode.NETWORK_ERROR:
      return {
        title: '네트워크 오류',
        description: '네트워크 연결을 확인하고 다시 시도해주세요.',
        canRetry: true,
      }

    case AuthStageErrorCode.UNKNOWN_ERROR:
    default:
      return {
        title: '오류가 발생했습니다',
        description: error.message || '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        canRetry: true,
      }
  }
}
