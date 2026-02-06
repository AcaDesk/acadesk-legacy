/**
 * Kakao Alimtalk Constants
 *
 * 카카오 알림톡 관련 상수 정의
 */

// ============================================================================
// Report Template Variables
// ============================================================================

/**
 * 리포트 발송 시 사용 가능한 템플릿 변수 목록
 */
export const KAKAO_REPORT_VARIABLES = [
  { key: '학생명', description: '학생 이름' },
  { key: '보호자명', description: '보호자 이름' },
  { key: '기간', description: '리포트 기간 (예: 2024.01.01 ~ 2024.01.31)' },
  { key: '출석률', description: '해당 기간 출석률 (%)' },
  { key: '숙제완료율', description: '해당 기간 숙제 완료율 (%)' },
  { key: '학원명', description: '학원 이름' },
  { key: '학원연락처', description: '학원 연락처' },
  { key: '종합평가', description: '선생님이 작성한 종합 평가 내용' },
] as const

export type KakaoReportVariable = (typeof KAKAO_REPORT_VARIABLES)[number]['key']

/**
 * 변수 키 목록만 추출
 */
export const KAKAO_REPORT_VARIABLE_KEYS = KAKAO_REPORT_VARIABLES.map((v) => v.key)

/**
 * 변수 포맷 문자열 (예: #{학생명})
 */
export function formatTemplateVariable(key: string): string {
  return `#{${key}}`
}

/**
 * 변수 설명 표시용 문자열 생성
 */
export function getVariableDescriptionString(): string {
  return KAKAO_REPORT_VARIABLES.map((v) => `#{${v.key}}`).join(', ')
}

// ============================================================================
// Template Limits
// ============================================================================

export const KAKAO_TEMPLATE_LIMITS = {
  /** 템플릿 이름 최대 길이 */
  NAME_MAX_LENGTH: 150,
  /** 템플릿 내용 최대 길이 */
  CONTENT_MAX_LENGTH: 1000,
  /** 강조 제목 최대 길이 */
  EMPHASIZE_TITLE_MAX_LENGTH: 23,
  /** 강조 부제목 최대 길이 */
  EMPHASIZE_SUBTITLE_MAX_LENGTH: 23,
  /** 버튼 이름 최대 길이 */
  BUTTON_NAME_MAX_LENGTH: 14,
  /** 최대 버튼 개수 */
  MAX_BUTTONS: 5,
  /** 부가정보 최대 길이 */
  EXTRA_CONTENT_MAX_LENGTH: 500,
  /** 광고 문구 최대 길이 */
  AD_CONTENT_MAX_LENGTH: 500,
} as const

// ============================================================================
// Button Types
// ============================================================================

export const KAKAO_BUTTON_TYPES = {
  WL: '웹링크',
  AL: '앱링크',
  BK: '봇키워드',
  MD: '메시지전달',
  DS: '배송조회',
  BC: '상담톡전환',
  BT: '봇전환',
  AC: '채널추가',
} as const

export type KakaoButtonType = keyof typeof KAKAO_BUTTON_TYPES
