/**
 * 리포트 전송 에러 분류 및 사용자 친화적 메시지
 *
 * 에러 유형:
 * 1. structural: 구조적 문제 (설정/데이터) - 사용자가 직접 수정해야 함
 * 2. temporary: 일시적 문제 (네트워크/서버) - 다시 시도하면 해결될 수 있음
 * 3. recoverable: 복구 가능한 문제 - 조치 후 해결 가능 (예: 잔액 충전)
 *
 * 매칭 규칙: 더 구체적인 패턴을 먼저 검사합니다. 한 번 매칭되면 그 케이스로 확정.
 */

export type ReportSendErrorType = 'structural' | 'temporary' | 'recoverable'

export interface ReportSendErrorInfo {
  type: ReportSendErrorType
  title: string
  description: string
  solution: string
  canRetry: boolean
  helpLink?: string
}

export function classifyReportSendError(errorMessage: string): ReportSendErrorInfo {
  const msg = errorMessage.toLowerCase()
  const has = (s: string) => msg.includes(s.toLowerCase())

  // ============================================================
  // 1) 구조적 에러 (설정/데이터 — 사용자가 직접 수정)
  // ============================================================

  // 1-1. 보호자 연결 자체가 없음 (student_guardians 0건)
  if (has('학생에게 등록된 보호자가 없습니다')) {
    return {
      type: 'structural',
      title: '보호자가 등록되지 않았습니다',
      description: '이 학생에게 연결된 보호자가 한 명도 없어 리포트를 보낼 대상이 없습니다.',
      solution:
        '학생 관리 > 학생 상세 > 보호자 탭에서 보호자를 추가하고 전화번호를 입력한 뒤 다시 시도해주세요. (이름·전화번호 필수)',
      canRetry: false,
      helpLink: '/students',
    }
  }

  // 1-2. 보호자는 있으나 전화번호 누락
  if (
    has('보호자 전화번호가 등록되어 있지 않습니다') ||
    has('전송 가능한 보호자가 없습니다')
  ) {
    return {
      type: 'structural',
      title: '보호자 전화번호 미등록',
      description:
        '보호자는 등록되어 있지만 전화번호가 비어 있어 발송할 수 없습니다. (보호자 계정과 연결된 사용자 전화번호로도 자동 대체되지 못한 상태입니다.)',
      solution:
        '학생 관리 > 학생 상세 > 보호자 탭에서 해당 보호자를 편집해 전화번호를 입력해주세요.',
      canRetry: false,
      helpLink: '/students',
    }
  }

  // 1-3. 알림톡 템플릿 미선택
  if (has('알림톡 템플릿이 선택되지 않았습니다')) {
    return {
      type: 'structural',
      title: '알림톡 템플릿 미선택',
      description: '알림톡 채널을 선택했지만 사용할 템플릿을 지정하지 않았습니다.',
      solution: '발송 전 알림톡 템플릿을 선택하거나 채널을 SMS/LMS로 변경해주세요.',
      canRetry: false,
    }
  }

  // 1-4. 알림톡 템플릿 미승인/삭제
  if (
    has('알림톡 템플릿이 승인되지 않았') ||
    has('승인된 알림톡 템플릿을 찾을 수 없') ||
    has('승인된 템플릿만 발송할 수 있습니다') ||
    has('템플릿을 찾을 수 없습니다')
  ) {
    return {
      type: 'structural',
      title: '알림톡 템플릿 사용 불가',
      description:
        '선택한 알림톡 템플릿이 검수 승인되지 않았거나, 삭제·반려된 상태여서 발송할 수 없습니다.',
      solution:
        '설정 > 메시징 설정 > 알림톡 템플릿에서 상태가 "approved"인 다른 템플릿을 선택하거나, 카카오로 템플릿 검수를 다시 요청해주세요.',
      canRetry: false,
      helpLink: '/settings/messaging',
    }
  }

  // 1-5. 알림톡 변수 누락
  if (has('템플릿 변수가 누락')) {
    return {
      type: 'structural',
      title: '알림톡 템플릿 변수 누락',
      description:
        '선택한 알림톡 템플릿이 요구하는 변수 값이 비어 있어 발송할 수 없습니다.',
      solution:
        '리포트 내용(기간·출석률·숙제완료율 등) 또는 학원 정보가 빠지지 않았는지 확인해주세요. 누락된 변수명은 에러 본문에 표시됩니다: ' +
        errorMessage,
      canRetry: false,
    }
  }

  // 1-6. 카카오 채널 미연동
  if (
    has('카카오 채널이 연동되어 있지 않') ||
    has('알림톡은 솔라피')
  ) {
    return {
      type: 'structural',
      title: '카카오 채널 미연동',
      description: '알림톡 발송을 위한 카카오 비즈니스 채널이 연동되어 있지 않습니다.',
      solution:
        '설정 > 메시징 설정에서 솔라피 연동 후 카카오 채널을 추가하고 인증을 완료해주세요. (알림톡은 솔라피에서만 사용 가능)',
      canRetry: false,
      helpLink: '/settings/messaging',
    }
  }

  // 1-7. 메시징 서비스 미설정/미활성
  if (
    has('활성화된 메시징') ||
    has('메시징 서비스가 설정') ||
    has('메시징 설정을 가져오는 중')
  ) {
    return {
      type: 'structural',
      title: '메시징 서비스 미설정',
      description: '문자 발송을 위한 메시징 서비스(알리고/솔라피)가 설정되지 않았거나 비활성 상태입니다.',
      solution: '설정 > 메시징 설정에서 알리고 또는 솔라피 API 키를 등록하고 활성화 토글을 켜주세요.',
      canRetry: false,
      helpLink: '/settings/messaging',
    }
  }

  // 1-8. 발신번호 미등록
  if (has('발신번호') || has('발신자') || has('sender')) {
    return {
      type: 'recoverable',
      title: '발신번호 미등록',
      description: 'SMS/알림톡 발송에 사용할 발신번호가 등록되어 있지 않거나 인증되지 않았습니다.',
      solution:
        '알리고/솔라피 콘솔에서 발신번호 등록·인증을 완료한 뒤, 설정 > 메시징 설정에 동일한 번호를 입력해주세요.',
      canRetry: false,
      helpLink: '/settings/messaging',
    }
  }

  // 1-9. 학원 정보 없음
  if (has('학원 정보를 찾을 수 없') || (has('학원') && has('찾을 수 없'))) {
    return {
      type: 'structural',
      title: '학원 정보 미설정',
      description: '학원명 등 기본 정보가 설정되어 있지 않습니다. 메시지 본문 변수 치환에 실패합니다.',
      solution: '설정 > 학원 정보에서 학원명과 연락처를 입력한 뒤 다시 시도해주세요.',
      canRetry: false,
      helpLink: '/settings/academy',
    }
  }

  // 1-10. 리포트 자체를 찾을 수 없음
  if (has('리포트') && has('찾을 수 없')) {
    return {
      type: 'structural',
      title: '리포트 없음',
      description: '발송 대상 리포트를 찾을 수 없습니다. 삭제되었거나 다른 학원의 리포트일 수 있습니다.',
      solution: '리포트 목록을 새로고침한 뒤, 대상 리포트가 존재하는지 확인해주세요.',
      canRetry: false,
    }
  }

  // 1-11. 발송 정보 없음 (이미 생성된 report_sends row 조회 실패)
  if (has('발송 정보를 찾을 수 없') || has('알림톡 템플릿 정보가 없는 발송 건')) {
    return {
      type: 'structural',
      title: '발송 정보 없음',
      description: '발송 기록이 손상되었거나 조회되지 않습니다.',
      solution: '잠시 후 다시 시도하거나, 문제가 지속되면 관리자에게 문의해주세요. (해당 리포트를 새로 발송하셔도 됩니다.)',
      canRetry: true,
    }
  }

  // 1-12. 학생 없음
  if (has('학생') && has('찾을 수 없')) {
    return {
      type: 'structural',
      title: '학생 정보 없음',
      description: '해당 학생을 찾을 수 없습니다. 삭제되었거나 접근 권한이 없을 수 있습니다.',
      solution: '학생 목록에서 해당 학생이 존재하는지 확인해주세요.',
      canRetry: false,
      helpLink: '/students',
    }
  }

  // ============================================================
  // 2) 복구 가능한 에러 (외부 조치)
  // ============================================================

  // 2-1. 잔액 부족
  if (has('잔액') || has('포인트') || has('충전') || has('insufficient')) {
    return {
      type: 'recoverable',
      title: 'SMS 잔액 부족',
      description: '문자/알림톡 발송에 필요한 잔액(포인트)이 부족합니다.',
      solution:
        '알리고 또는 솔라피 홈페이지에서 포인트를 충전한 뒤 다시 시도해주세요.',
      canRetry: true,
    }
  }

  // 2-2. API 키/인증 실패
  if (
    has('api key') ||
    has('api_key') ||
    has('인증 실패') ||
    has('unauthorized') ||
    has('401') ||
    has('403')
  ) {
    return {
      type: 'recoverable',
      title: 'API 인증 실패',
      description: '메시징 서비스 API 인증에 실패했습니다. API 키가 잘못되었거나 만료되었을 수 있습니다.',
      solution: '설정 > 메시징 설정에서 API 키와 시크릿을 확인하고 다시 저장해주세요.',
      canRetry: false,
      helpLink: '/settings/messaging',
    }
  }

  // ============================================================
  // 3) 일시적 에러 (네트워크/서버)
  // ============================================================

  // 3-1. 네트워크
  if (
    has('network') ||
    has('네트워크') ||
    has('timeout') ||
    has('시간 초과') ||
    has('econnrefused') ||
    has('enotfound') ||
    has('etimedout')
  ) {
    return {
      type: 'temporary',
      title: '네트워크 오류',
      description: '메시지 서버와의 통신 중 일시적인 오류가 발생했습니다.',
      solution: '인터넷 연결을 확인한 뒤 잠시 후 다시 시도해주세요.',
      canRetry: true,
    }
  }

  // 3-2. 외부 서버 5xx
  if (
    has(' 500') ||
    has(' 502') ||
    has(' 503') ||
    has(' 504') ||
    has('서버 오류') ||
    has('server error') ||
    has('bad gateway')
  ) {
    return {
      type: 'temporary',
      title: '메시지 서버 오류',
      description: '알리고/솔라피 서버에 일시적인 오류가 발생했습니다.',
      solution: '잠시 후 다시 시도해주세요. 반복되면 알리고/솔라피 공지를 확인해주세요.',
      canRetry: true,
    }
  }

  // 3-3. 발송 레코드/단축 URL 생성 실패 (DB 측 일시 오류)
  if (
    has('발송 레코드 생성에 실패') ||
    has('단축 url 생성에 실패') ||
    has('short url') ||
    has('발송 레코드 처리 중')
  ) {
    return {
      type: 'temporary',
      title: '발송 준비 실패',
      description: '리포트 링크 또는 발송 기록을 생성하지 못했습니다. DB가 일시적으로 응답하지 않았을 수 있습니다.',
      solution: '잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의해주세요.',
      canRetry: true,
    }
  }

  // ============================================================
  // 기본 (분류 불가)
  // ============================================================
  return {
    type: 'temporary',
    title: '전송 실패',
    description: errorMessage || '알 수 없는 오류로 리포트를 전송하지 못했습니다.',
    solution: '다시 시도해도 같은 오류가 발생하면 관리자에게 위 메시지를 그대로 전달해주세요.',
    canRetry: true,
  }
}

export function getErrorTypeIcon(type: ReportSendErrorType): string {
  switch (type) {
    case 'structural':
      return 'Settings2'
    case 'recoverable':
      return 'Wrench'
    case 'temporary':
      return 'RefreshCw'
    default:
      return 'AlertTriangle'
  }
}

export function getErrorTypeColor(type: ReportSendErrorType): string {
  switch (type) {
    case 'structural':
      return 'text-orange-600'
    case 'recoverable':
      return 'text-info'
    case 'temporary':
      return 'text-yellow-600'
    default:
      return 'text-destructive'
  }
}

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
