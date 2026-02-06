/**
 * Kakao Alimtalk Status Configuration
 *
 * 카카오 알림톡 관련 상태 및 타입 설정
 * - 템플릿 상태
 * - 채널 상태
 * - 메시지 타입 라벨
 */

import { Check, Clock, AlertCircle, XCircle, Settings2, X } from 'lucide-react'
import type { KakaoTemplateStatus, KakaoMessageType } from '@/infra/messaging/types/kakao.types'

// ============================================================================
// Template Status Configuration
// ============================================================================

export type TemplateStatusConfig = {
  label: string
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
  icon: typeof Check
}

export const kakaoTemplateStatusConfig: Record<KakaoTemplateStatus, TemplateStatusConfig> = {
  approved: { label: '승인됨', variant: 'default', icon: Check },
  inspecting: { label: '검수 중', variant: 'secondary', icon: Clock },
  pending: { label: '대기', variant: 'outline', icon: AlertCircle },
  rejected: { label: '반려됨', variant: 'destructive', icon: XCircle },
  suspended: { label: '중지됨', variant: 'destructive', icon: XCircle },
}

// ============================================================================
// Channel Status Configuration
// ============================================================================

export type ChannelStatus = 'active' | 'pending' | 'suspended'

export type ChannelStatusConfig = {
  label: string
  variant: 'default' | 'secondary' | 'destructive'
  icon: typeof Check
}

export const kakaoChannelStatusConfig: Record<ChannelStatus, ChannelStatusConfig> = {
  active: { label: '활성', variant: 'default', icon: Check },
  pending: { label: '대기', variant: 'secondary', icon: Settings2 },
  suspended: { label: '중지', variant: 'destructive', icon: X },
}

// ============================================================================
// Message Type Labels
// ============================================================================

export const kakaoMessageTypeLabels: Record<KakaoMessageType, string> = {
  BA: '기본형',
  EX: '부가정보형',
  AD: '광고추가형',
  MI: '복합형',
}

/**
 * Get message type label
 */
export function getMessageTypeLabel(messageType: KakaoMessageType): string {
  return kakaoMessageTypeLabels[messageType] || messageType
}
