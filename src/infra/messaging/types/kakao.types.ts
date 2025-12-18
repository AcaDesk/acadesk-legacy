/**
 * Kakao Alimtalk Types for Solapi Integration
 *
 * 솔라피 API를 통한 카카오 알림톡 연동을 위한 타입 정의
 */

// ============================================================================
// Channel Types (채널 관련 타입)
// ============================================================================

/**
 * 카카오 채널 상태
 */
export type KakaoChannelStatus = 'pending' | 'active' | 'suspended'

/**
 * 카카오 채널 정보
 */
export interface KakaoChannel {
  /** 솔라피/카카오 채널 ID (pfId) */
  channelId: string
  /** 카카오톡 채널 검색 ID (@xxx) */
  searchId: string
  /** 채널 이름 */
  name: string
  /** 채널 상태 */
  status: KakaoChannelStatus
  /** 채널 카테고리 코드 */
  categoryCode?: string
  /** 인증 완료 시간 */
  verifiedAt?: Date
  /** 생성 시간 */
  dateCreated?: Date
}

/**
 * 카카오 채널 카테고리
 */
export interface KakaoChannelCategory {
  /** 카테고리 코드 */
  code: string
  /** 카테고리 이름 */
  name: string
}

/**
 * 카카오 채널 토큰 요청 데이터
 */
export interface KakaoChannelTokenRequest {
  /** 카카오톡 채널 검색 ID (@xxx) */
  searchId: string
  /** 대표자 전화번호 (인증용) */
  phoneNumber: string
}

/**
 * 카카오 채널 생성 요청 데이터
 */
export interface KakaoChannelCreateRequest extends KakaoChannelTokenRequest {
  /** 인증 토큰 (requestKakaoChannelToken에서 받은) */
  token: string
  /** 채널 카테고리 코드 */
  categoryCode: string
}

/**
 * 카카오 채널 토큰 응답
 */
export interface KakaoChannelTokenResponse {
  /** 성공 여부 */
  success: boolean
  /** 에러 메시지 */
  error?: string
}

// ============================================================================
// Template Types (템플릿 관련 타입)
// ============================================================================

/**
 * 템플릿 상태
 */
export type KakaoTemplateStatus =
  | 'pending'    // 대기 (등록 전)
  | 'inspecting' // 검수 중
  | 'approved'   // 승인됨
  | 'rejected'   // 반려됨
  | 'suspended'  // 중지됨

/**
 * 메시지 유형
 * - BA: 기본형
 * - EX: 부가정보형
 * - AD: 광고추가형
 * - MI: 복합형
 */
export type KakaoMessageType = 'BA' | 'EX' | 'AD' | 'MI'

/**
 * 강조 유형
 */
export type KakaoEmphasizeType = 'NONE' | 'TEXT' | 'IMAGE' | 'ITEM_LIST'

/**
 * 버튼 타입
 * - WL: 웹 링크
 * - AL: 앱 링크
 * - BK: 봇 키워드
 * - MD: 메시지 전달
 * - DS: 배송 조회
 * - BC: 상담톡 전환
 * - BT: 봇 전환
 * - AC: 채널 추가
 */
export type KakaoButtonType = 'WL' | 'AL' | 'BK' | 'MD' | 'DS' | 'BC' | 'BT' | 'AC'

/**
 * 카카오 버튼
 */
export interface KakaoButton {
  /** 버튼 타입 */
  buttonType: KakaoButtonType
  /** 버튼 이름 (최대 14자) */
  buttonName: string
  /** 모바일 웹 링크 (WL 타입 필수) */
  linkMo?: string
  /** PC 웹 링크 (WL 타입 선택) */
  linkPc?: string
  /** 안드로이드 앱 링크 (AL 타입 필수) */
  linkAnd?: string
  /** iOS 앱 링크 (AL 타입 필수) */
  linkIos?: string
}

/**
 * 퀵 리플라이 (빠른 답장)
 */
export interface KakaoQuickReply {
  /** 링크 타입 */
  linkType: 'WL' | 'AL' | 'BK' | 'BC' | 'BT'
  /** 이름 */
  name: string
  /** 모바일 웹 링크 */
  linkMo?: string
  /** PC 웹 링크 */
  linkPc?: string
  /** 안드로이드 앱 링크 */
  linkAnd?: string
  /** iOS 앱 링크 */
  linkIos?: string
}

/**
 * 템플릿 카테고리
 */
export interface KakaoTemplateCategory {
  /** 카테고리 코드 */
  code: string
  /** 카테고리 이름 */
  name: string
}

/**
 * 카카오 알림톡 템플릿 (DB 저장용)
 */
export interface KakaoAlimtalkTemplate {
  /** 로컬 DB ID */
  id: string
  /** 테넌트 ID */
  tenantId: string
  /** 솔라피 템플릿 ID */
  solapiTemplateId: string
  /** 카카오 승인 템플릿 코드 */
  kakaoTemplateCode?: string
  /** 채널 ID */
  channelId: string
  /** 템플릿 이름 */
  name: string
  /** 템플릿 내용 (변수 포함: #{변수명}) */
  content: string
  /** 카테고리 코드 */
  categoryCode: string
  /** 메시지 유형 */
  messageType: KakaoMessageType
  /** 강조 유형 */
  emphasizeType: KakaoEmphasizeType
  /** 강조 제목 (emphasizeType이 TEXT일 때) */
  emphasizeTitle?: string
  /** 강조 부제목 (emphasizeType이 TEXT일 때) */
  emphasizeSubtitle?: string
  /** 버튼 목록 (최대 5개) */
  buttons: KakaoButton[]
  /** 퀵 리플라이 목록 */
  quickReplies?: KakaoQuickReply[]
  /** 부가 정보 (EX, MI 타입) */
  extraContent?: string
  /** 광고 문구 (AD, MI 타입) */
  adContent?: string
  /** 템플릿 상태 */
  status: KakaoTemplateStatus
  /** 반려 사유 */
  rejectionReason?: string
  /** 보안 템플릿 여부 */
  securityFlag: boolean
  /** 검수 요청 시간 */
  inspectedAt?: Date
  /** 승인 시간 */
  approvedAt?: Date
  /** 생성 시간 */
  createdAt: Date
  /** 수정 시간 */
  updatedAt: Date
}

/**
 * 템플릿 생성 요청 데이터
 */
export interface CreateKakaoTemplateRequest {
  /** 채널 ID */
  channelId: string
  /** 템플릿 이름 */
  name: string
  /** 템플릿 내용 (변수: #{변수명}) */
  content: string
  /** 카테고리 코드 */
  categoryCode: string
  /** 메시지 유형 (기본: BA) */
  messageType?: KakaoMessageType
  /** 강조 유형 (기본: NONE) */
  emphasizeType?: KakaoEmphasizeType
  /** 강조 제목 */
  emphasizeTitle?: string
  /** 강조 부제목 */
  emphasizeSubtitle?: string
  /** 버튼 목록 */
  buttons?: KakaoButton[]
  /** 퀵 리플라이 목록 */
  quickReplies?: KakaoQuickReply[]
  /** 부가 정보 */
  extraContent?: string
  /** 광고 문구 */
  adContent?: string
  /** 보안 템플릿 여부 */
  securityFlag?: boolean
}

/**
 * 템플릿 수정 요청 데이터
 */
export type UpdateKakaoTemplateRequest = Partial<Omit<CreateKakaoTemplateRequest, 'channelId'>>

// ============================================================================
// Message Sending Types (메시지 발송 타입)
// ============================================================================

/**
 * 알림톡 발송 요청
 */
export interface SendAlimtalkRequest {
  /** 수신자 전화번호 */
  to: string
  /** 템플릿 ID (솔라피 템플릿 ID) */
  templateId: string
  /** 채널 ID (pfId) */
  channelId: string
  /** 변수 치환 (#{변수명}: 값) */
  variables?: Record<string, string>
  /** 버튼 (템플릿에 정의된 버튼 오버라이드) */
  buttons?: KakaoButton[]
  /** SMS 대체 발송 비활성화 (기본: false = SMS fallback 활성화) */
  disableSms?: boolean
  /** 발신자 번호 (SMS fallback용) */
  senderPhone?: string
}

/**
 * 알림톡 발송 응답
 */
export interface SendAlimtalkResponse {
  /** 성공 여부 */
  success: boolean
  /** 메시지 ID */
  messageId?: string
  /** 그룹 ID */
  groupId?: string
  /** 발송 비용 */
  cost?: number
  /** SMS fallback 발생 여부 */
  fallbackToSms?: boolean
  /** 에러 메시지 */
  error?: string
  /** 에러 코드 */
  errorCode?: string
}

/**
 * 알림톡 대량 발송 요청
 */
export interface SendBulkAlimtalkRequest {
  /** 템플릿 ID */
  templateId: string
  /** 채널 ID */
  channelId: string
  /** 수신자 목록 */
  recipients: Array<{
    /** 수신자 전화번호 */
    to: string
    /** 변수 치환 (수신자별 개인화) */
    variables?: Record<string, string>
  }>
  /** SMS 대체 발송 비활성화 */
  disableSms?: boolean
  /** 발신자 번호 (SMS fallback용) */
  senderPhone?: string
}

/**
 * 대량 발송 응답
 */
export interface SendBulkAlimtalkResponse {
  /** 전체 성공 여부 */
  success: boolean
  /** 총 발송 수 */
  totalCount: number
  /** 성공 수 */
  successCount: number
  /** 실패 수 */
  failCount: number
  /** 발송 결과 상세 */
  results: Array<{
    to: string
    success: boolean
    messageId?: string
    error?: string
  }>
}

// ============================================================================
// SMS Fallback Settings (SMS 대체 발송 설정)
// ============================================================================

/**
 * SMS Fallback 설정
 */
export interface KakaoFallbackSettings {
  /** 자동 SMS 대체 발송 활성화 */
  autoFallbackEnabled: boolean
  /** 수동 SMS 대체 발송 옵션 활성화 */
  manualFallbackEnabled: boolean
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * 템플릿 변수 추출 결과
 */
export interface TemplateVariable {
  /** 변수명 */
  name: string
  /** 템플릿 내 위치 */
  position: number
}

/**
 * 변수 치환 후 메시지
 */
export interface ResolvedMessage {
  /** 치환된 메시지 내용 */
  content: string
  /** 누락된 변수 목록 */
  missingVariables: string[]
}
