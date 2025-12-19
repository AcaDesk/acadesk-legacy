/**
 * 리포트 전송 에러 분류 및 사용자 친화적 메시지
 *
 * 에러 유형:
 * 1. structural: 구조적 문제 (설정/데이터) - 사용자가 직접 수정해야 함
 * 2. temporary: 일시적 문제 (네트워크/서버) - 다시 시도하면 해결될 수 있음
 * 3. recoverable: 복구 가능한 문제 - 조치 후 해결 가능 (예: 잔액 충전)
 */

export type ReportSendErrorType = 'structural' | 'temporary' | 'recoverable'

export interface ReportSendErrorInfo {
  type: ReportSendErrorType
  title: string
  description: string
  solution: string
  canRetry: boolean
  /** 문제 해결 페이지 링크 (선택) */
  helpLink?: string
}

/**
 * 에러 메시지를 분석하여 에러 정보를 반환
 */
export function classifyReportSendError(errorMessage: string): ReportSendErrorInfo {
  const lowerMessage = errorMessage.toLowerCase()

  // ============================================================
  // 1. 구조적 에러 (설정/데이터 문제)
  // ============================================================

  // 메시징 서비스 미설정
  if (
    lowerMessage.includes('메시징 서비스') ||
    lowerMessage.includes('메시징 설정') ||
    lowerMessage.includes('활성화된 메시징')
  ) {
    return {
      type: 'structural',
      title: '메시징 서비스 미설정',
      description: '문자 발송을 위한 메시징 서비스가 설정되어 있지 않습니다.',
      solution: '설정 > 메시징 설정에서 알리고 또는 솔라피 서비스를 연동하고 활성화해주세요.',
      canRetry: false,
      helpLink: '/settings/messaging',
    }
  }

  // 보호자 정보 없음
  if (
    lowerMessage.includes('보호자') &&
    (lowerMessage.includes('찾을 수 없') || lowerMessage.includes('없습니다'))
  ) {
    return {
      type: 'structural',
      title: '보호자 정보 없음',
      description: '해당 학생에게 등록된 보호자가 없거나, 모든 보호자의 연락처가 비어있습니다.',
      solution:
        '학생 관리 > 학생 상세 > 보호자 탭에서 보호자를 추가하고 전화번호를 입력해주세요.',
      canRetry: false,
      helpLink: '/students',
    }
  }

  // 전송 가능한 보호자 없음
  if (lowerMessage.includes('전송 가능한 보호자가 없습니다')) {
    return {
      type: 'structural',
      title: '전화번호 미등록',
      description: '보호자는 등록되어 있지만, 전화번호가 입력되어 있지 않습니다.',
      solution:
        '학생 관리 > 학생 상세 > 보호자 탭에서 보호자의 전화번호를 추가해주세요.',
      canRetry: false,
      helpLink: '/students',
    }
  }

  // 학원 정보 없음
  if (lowerMessage.includes('학원 정보')) {
    return {
      type: 'structural',
      title: '학원 정보 미설정',
      description: '학원 기본 정보가 설정되어 있지 않습니다.',
      solution: '설정 > 학원 정보에서 학원명과 연락처를 입력해주세요.',
      canRetry: false,
      helpLink: '/settings/academy',
    }
  }

  // 리포트 없음
  if (lowerMessage.includes('리포트') && lowerMessage.includes('찾을 수 없')) {
    return {
      type: 'structural',
      title: '리포트 없음',
      description: '전송하려는 리포트를 찾을 수 없습니다. 삭제되었거나 접근 권한이 없을 수 있습니다.',
      solution: '리포트 목록에서 해당 리포트가 존재하는지 확인해주세요.',
      canRetry: false,
    }
  }

  // 학생 없음
  if (lowerMessage.includes('학생') && lowerMessage.includes('찾을 수 없')) {
    return {
      type: 'structural',
      title: '학생 정보 없음',
      description: '해당 학생을 찾을 수 없습니다. 삭제되었거나 접근 권한이 없을 수 있습니다.',
      solution: '학생 목록에서 해당 학생이 존재하는지 확인해주세요.',
      canRetry: false,
    }
  }

  // ============================================================
  // 2. 복구 가능한 에러 (조치 후 해결 가능)
  // ============================================================

  // 잔액 부족
  if (
    lowerMessage.includes('잔액') ||
    lowerMessage.includes('포인트') ||
    lowerMessage.includes('충전')
  ) {
    return {
      type: 'recoverable',
      title: 'SMS 잔액 부족',
      description: 'SMS 발송을 위한 잔액이 부족합니다.',
      solution:
        '알리고 또는 솔라피 홈페이지에서 포인트를 충전한 후 다시 시도해주세요.',
      canRetry: true,
    }
  }

  // 발신번호 미등록
  if (
    lowerMessage.includes('발신번호') ||
    lowerMessage.includes('sender') ||
    lowerMessage.includes('발신자')
  ) {
    return {
      type: 'recoverable',
      title: '발신번호 미등록',
      description: 'SMS 발송에 사용할 발신번호가 등록되어 있지 않습니다.',
      solution:
        '알리고/솔라피 홈페이지에서 발신번호를 등록하고, 설정 페이지에서 발신번호를 입력해주세요.',
      canRetry: false,
      helpLink: '/settings/messaging',
    }
  }

  // API 키 문제
  if (
    lowerMessage.includes('api key') ||
    lowerMessage.includes('api_key') ||
    lowerMessage.includes('인증') ||
    lowerMessage.includes('401')
  ) {
    return {
      type: 'recoverable',
      title: 'API 인증 실패',
      description: '메시징 서비스 API 인증에 실패했습니다. API 키가 올바르지 않을 수 있습니다.',
      solution:
        '설정 > 메시징 설정에서 API 키가 올바르게 입력되어 있는지 확인해주세요.',
      canRetry: false,
      helpLink: '/settings/messaging',
    }
  }

  // ============================================================
  // 3. 일시적 에러 (네트워크/서버 문제)
  // ============================================================

  // 네트워크 오류
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('네트워크') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('시간 초과') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('enotfound')
  ) {
    return {
      type: 'temporary',
      title: '네트워크 오류',
      description: '메시지 서버와의 통신 중 일시적인 오류가 발생했습니다.',
      solution: '인터넷 연결을 확인한 후 잠시 후 다시 시도해주세요.',
      canRetry: true,
    }
  }

  // 서버 오류 (5xx)
  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503') ||
    lowerMessage.includes('504') ||
    lowerMessage.includes('서버 오류') ||
    lowerMessage.includes('server error')
  ) {
    return {
      type: 'temporary',
      title: '서버 일시적 오류',
      description: '메시지 발송 서버에 일시적인 오류가 발생했습니다.',
      solution: '잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의해주세요.',
      canRetry: true,
    }
  }

  // 단축 URL 생성 실패
  if (lowerMessage.includes('단축 url') || lowerMessage.includes('short url')) {
    return {
      type: 'temporary',
      title: '링크 생성 실패',
      description: '리포트 링크 생성 중 오류가 발생했습니다.',
      solution: '잠시 후 다시 시도해주세요.',
      canRetry: true,
    }
  }

  // ============================================================
  // 기본 에러 (분류 불가)
  // ============================================================
  return {
    type: 'temporary',
    title: '전송 실패',
    description: errorMessage,
    solution: '문제가 지속되면 관리자에게 문의해주세요.',
    canRetry: true,
  }
}

/**
 * 에러 타입에 따른 아이콘 이름 반환
 */
export function getErrorTypeIcon(type: ReportSendErrorType): string {
  switch (type) {
    case 'structural':
      return 'Settings2' // 설정 필요
    case 'recoverable':
      return 'Wrench' // 조치 필요
    case 'temporary':
      return 'RefreshCw' // 재시도 가능
    default:
      return 'AlertTriangle'
  }
}

/**
 * 에러 타입에 따른 색상 클래스 반환
 */
export function getErrorTypeColor(type: ReportSendErrorType): string {
  switch (type) {
    case 'structural':
      return 'text-orange-600' // 경고 (설정 필요)
    case 'recoverable':
      return 'text-blue-600' // 정보 (조치 필요)
    case 'temporary':
      return 'text-yellow-600' // 일시적 (재시도)
    default:
      return 'text-destructive'
  }
}

/**
 * 에러 타입 라벨
 */
export function getErrorTypeLabel(type: ReportSendErrorType): string {
  switch (type) {
    case 'structural':
      return '설정 필요'
    case 'recoverable':
      return '조치 필요'
    case 'temporary':
      return '일시적 오류'
    default:
      return '오류'
  }
}
