/**
 * Solapi Error Translator
 *
 * Solapi API 에러를 사용자 친화적인 한국어 메시지로 변환합니다.
 */

/**
 * Solapi 에러 코드와 사용자 친화적인 메시지 매핑
 */
const SOLAPI_ERROR_MAP: Record<string, string> = {
  // 채널 관련 에러
  InvalidChannelSearchId:
    '채널 검색 ID가 올바르지 않습니다. @로 시작하는 정확한 ID를 입력해주세요.',
  ChannelNotFound:
    '해당 채널을 찾을 수 없습니다. 채널 검색 ID를 확인해주세요.',
  ChannelAlreadyRegistered: '이미 등록된 채널입니다.',
  ChannelNotVerified: '채널 인증이 완료되지 않았습니다.',
  PlusFriendRegiestFailed:
    '카카오톡 채널을 찾을 수 없습니다. 채널 "검색용 ID"(@아이디)를 다시 확인해주세요.',
  PlusFriendRegisterFailed:
    '카카오톡 채널을 찾을 수 없습니다. 채널 "검색용 ID"(@아이디)를 다시 확인해주세요.',
  SearchIdInUse:
    '이 검색용 ID는 이미 다른 계정에서 사용 중입니다. 기존 연동을 확인하거나 다른 채널을 등록해주세요.',

  // 인증 관련 에러
  TokenExpired:
    '인증 토큰이 만료되었습니다. 인증 메시지를 다시 요청해주세요.',
  InvalidToken:
    '인증 코드가 올바르지 않습니다. 카카오톡으로 받은 코드를 확인해주세요.',
  TokenNotFound: '인증 토큰을 찾을 수 없습니다. 인증 메시지를 다시 요청해주세요.',

  // 전화번호 관련 에러
  PhoneNumberNotRegistered:
    '입력한 전화번호가 채널 관리자로 등록되어 있지 않습니다.',
  InvalidPhoneNumber: '유효하지 않은 전화번호입니다. 형식을 확인해주세요.',

  // API 인증 에러
  InvalidCredentials: 'API 인증 정보가 올바르지 않습니다.',
  InvalidApiKey: 'API Key가 올바르지 않습니다.',
  InvalidApiSecret: 'API Secret이 올바르지 않습니다.',
  Unauthorized: 'API 인증에 실패했습니다. API 키를 확인해주세요.',

  // 요청 제한 에러
  RateLimitExceeded: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  TooManyRequests: '요청 횟수가 제한을 초과했습니다. 잠시 후 다시 시도해주세요.',

  // 템플릿 관련 에러
  TemplateNotFound: '템플릿을 찾을 수 없습니다.',
  TemplatePending: '템플릿 검수가 진행 중입니다.',
  TemplateRejected: '템플릿이 반려되었습니다.',
  InvalidTemplateCode: '유효하지 않은 템플릿 코드입니다.',

  // 발송 관련 에러
  InsufficientBalance: '잔액이 부족합니다. 충전 후 다시 시도해주세요.',
  MessageFailed: '메시지 발송에 실패했습니다.',
  RecipientNotFound: '수신자를 찾을 수 없습니다.',

  // 기타 에러
  InternalError: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  ServiceUnavailable: '서비스를 일시적으로 사용할 수 없습니다.',
  BadRequest: '잘못된 요청입니다. 입력값을 확인해주세요.',
}

/**
 * 에러 코드 패턴 매칭을 위한 정규식 패턴들
 */
const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /plusfriendregiestfailed|plusfriendregisterfailed|존재하지\s*않는\s*카카오톡\s*채널/i,
    message:
      '입력한 채널 검색 ID에 해당하는 카카오톡 채널을 찾지 못했습니다. 채널명 말고 "검색용 ID(@...)"를 입력했는지 확인해주세요.',
  },
  {
    pattern: /channel.*not.*found/i,
    message: '해당 채널을 찾을 수 없습니다. 채널 검색 ID를 확인해주세요.',
  },
  {
    pattern: /invalid.*token/i,
    message: '인증 코드가 올바르지 않습니다.',
  },
  {
    pattern: /token.*expired/i,
    message: '인증 토큰이 만료되었습니다. 다시 요청해주세요.',
  },
  {
    pattern: /phone.*not.*registered/i,
    message: '입력한 전화번호가 채널 관리자로 등록되어 있지 않습니다.',
  },
  {
    pattern: /unauthorized|authentication.*failed/i,
    message: 'API 인증에 실패했습니다. API 키를 확인해주세요.',
  },
  {
    pattern: /rate.*limit|too.*many/i,
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  },
  {
    pattern: /already.*registered|duplicate/i,
    message: '이미 등록된 항목입니다.',
  },
  {
    pattern: /search.*id.*in.*use|searchidinuse/i,
    message:
      '이 검색용 ID는 이미 다른 계정에서 사용 중입니다. 기존 연동을 확인하거나 다른 채널을 등록해주세요.',
  },
]

/**
 * 에러 객체에서 에러 코드 추출
 */
function extractErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  // 직접적인 code 필드
  if ('code' in error && typeof error.code === 'string') {
    return error.code
  }

  // Solapi 응답 구조
  if (
    'errorCode' in error &&
    typeof (error as Record<string, unknown>).errorCode === 'string'
  ) {
    return (error as Record<string, unknown>).errorCode as string
  }

  // 중첩된 에러 구조
  if ('error' in error && typeof error.error === 'object' && error.error !== null) {
    const nestedError = error.error as Record<string, unknown>
    if ('code' in nestedError && typeof nestedError.code === 'string') {
      return nestedError.code
    }
  }

  return null
}

/**
 * 에러 객체에서 메시지 추출
 */
function extractErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  // 직접적인 message 필드
  if ('message' in error && typeof error.message === 'string') {
    return error.message
  }

  // Solapi 응답 구조
  if (
    'errorMessage' in error &&
    typeof (error as Record<string, unknown>).errorMessage === 'string'
  ) {
    return (error as Record<string, unknown>).errorMessage as string
  }

  // Error 인스턴스
  if (error instanceof Error) {
    return error.message
  }

  return null
}

/**
 * Solapi 에러를 사용자 친화적인 메시지로 변환
 *
 * @param error - 변환할 에러 객체
 * @returns 사용자 친화적인 한국어 에러 메시지
 */
export function translateSolapiError(error: unknown): string {
  // 1. 에러 코드로 매핑 시도
  const errorCode = extractErrorCode(error)
  if (errorCode && SOLAPI_ERROR_MAP[errorCode]) {
    return SOLAPI_ERROR_MAP[errorCode]
  }

  // 2. 에러 메시지 추출
  const errorMessage = extractErrorMessage(error)

  if (errorMessage) {
    // 3. 메시지 자체가 에러 코드인 경우 (예: new Error("InvalidChannelSearchId"))
    if (SOLAPI_ERROR_MAP[errorMessage]) {
      return SOLAPI_ERROR_MAP[errorMessage]
    }

    // 4. 메시지 첫 토큰이 에러 코드인 경우 (예: "PlusFriendRegiestFailed: ...")
    const firstToken = errorMessage.split(/[:\s]/)[0]
    if (firstToken && SOLAPI_ERROR_MAP[firstToken]) {
      return SOLAPI_ERROR_MAP[firstToken]
    }

    // 5. 메시지 패턴 매칭 시도
    for (const { pattern, message } of ERROR_PATTERNS) {
      if (pattern.test(errorMessage)) {
        return message
      }
    }

    // 6. 한국어 메시지는 그대로 반환
    if (/[\uac00-\ud7af]/.test(errorMessage)) {
      return errorMessage
    }
  }

  // 7. 기본 메시지 반환
  return '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

/**
 * 부분 삭제 에러 여부 판단
 *
 * 원격(Solapi)에서의 채널 삭제는 실패했지만 로컬 DB에서는 삭제된 경우를 감지합니다.
 *
 * @param error - 확인할 에러 객체
 * @returns 부분 삭제 에러 여부
 */
export function isPartialDeletionError(error: unknown): boolean {
  const errorMessage = extractErrorMessage(error)
  const errorCode = extractErrorCode(error)

  if (!errorMessage && !errorCode) {
    return false
  }

  // 부분 삭제 관련 패턴
  const partialDeletionPatterns = [
    /remote.*delete.*fail/i,
    /solapi.*delete.*fail/i,
    /channel.*remove.*partial/i,
    /원격.*삭제.*실패/,
    /부분.*삭제/,
  ]

  if (errorMessage) {
    for (const pattern of partialDeletionPatterns) {
      if (pattern.test(errorMessage)) {
        return true
      }
    }
  }

  // 특정 에러 코드
  const partialDeletionCodes = [
    'PARTIAL_DELETE',
    'REMOTE_DELETE_FAILED',
    'SOLAPI_DELETE_FAILED',
  ]

  if (errorCode && partialDeletionCodes.includes(errorCode)) {
    return true
  }

  return false
}

/**
 * 재시도 가능한 에러인지 판단
 *
 * @param error - 확인할 에러 객체
 * @returns 재시도 가능 여부
 */
export function isRetryableError(error: unknown): boolean {
  const errorCode = extractErrorCode(error)
  const errorMessage = extractErrorMessage(error)

  // 재시도 가능한 에러 코드
  const retryableCodes = [
    'RateLimitExceeded',
    'TooManyRequests',
    'ServiceUnavailable',
    'InternalError',
    'ECONNRESET',
    'ETIMEDOUT',
  ]

  if (errorCode && retryableCodes.includes(errorCode)) {
    return true
  }

  // 재시도 가능한 에러 메시지 패턴
  const retryablePatterns = [
    /rate.*limit/i,
    /too.*many.*request/i,
    /service.*unavailable/i,
    /timeout/i,
    /temporary/i,
    /try.*again/i,
  ]

  if (errorMessage) {
    for (const pattern of retryablePatterns) {
      if (pattern.test(errorMessage)) {
        return true
      }
    }
  }

  return false
}
