/**
 * useKakaoMessaging Hook
 *
 * 카카오 알림톡 관련 상태와 로직을 관리하는 커스텀 훅
 * - 카카오 채널 연동 상태 확인
 * - 승인된 템플릿 로드
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import {
  getKakaoChannelConfig,
  type KakaoUnavailableReason,
} from '@/app/actions/messaging/kakao-channel'
import { getKakaoTemplates, type KakaoTemplate } from '@/app/actions/messaging/kakao-templates'

interface UseKakaoMessagingOptions {
  /** 승인된 템플릿만 필터링할지 여부 (기본: true) */
  approvedOnly?: boolean
}

interface UseKakaoMessagingReturn {
  /** 카카오 채널 연동 여부 (= isKakaoUsable: provider=solapi + verified + channel) */
  hasKakaoChannel: boolean
  /** 알림톡 미사용 사유 (isKakaoUsable === false 일 때만 값 존재) */
  unavailableReason: KakaoUnavailableReason | null
  /** 채널 상태 확인 완료 여부 */
  isChannelChecked: boolean
  /** 채널 상태 확인 중 여부 */
  isCheckingChannel: boolean
  /** 알림톡 템플릿 목록 */
  templates: KakaoTemplate[]
  /** 템플릿 로딩 중 여부 */
  isLoadingTemplates: boolean
  /** 카카오 채널 연동 상태 확인 */
  checkChannel: () => Promise<boolean>
  /** 템플릿 목록 로드 */
  loadTemplates: () => Promise<KakaoTemplate[]>
  /** 상태 초기화 */
  reset: () => void
}

/** 알림톡 미사용 사유 → 사용자 안내 문구 */
export function getKakaoUnavailableLabel(
  reason: KakaoUnavailableReason | null
): string {
  switch (reason) {
    case 'no_config':
      return '메시지 발송 설정이 필요합니다'
    case 'provider_not_solapi':
      return '알림톡은 Solapi 연동 시에만 사용 가능합니다'
    case 'provider_not_verified':
      return 'API 인증이 필요합니다'
    case 'channel_not_registered':
      return '카카오 채널 등록이 필요합니다'
    default:
      return '채널 연동 필요'
  }
}

export function useKakaoMessaging(
  options: UseKakaoMessagingOptions = {}
): UseKakaoMessagingReturn {
  const { approvedOnly = true } = options

  // Channel state
  const [hasKakaoChannel, setHasKakaoChannel] = useState(false)
  const [unavailableReason, setUnavailableReason] =
    useState<KakaoUnavailableReason | null>(null)
  const [isChannelChecked, setIsChannelChecked] = useState(false)
  const [isCheckingChannel, setIsCheckingChannel] = useState(false)

  // Template state
  const [templates, setTemplates] = useState<KakaoTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // Refs for in-flight guards (avoid stale closure issues)
  const checkingRef = useRef(false)
  const loadingTemplatesRef = useRef(false)

  /**
   * 카카오 채널 연동 상태 확인
   */
  const checkChannel = useCallback(async (): Promise<boolean> => {
    if (checkingRef.current) return false
    checkingRef.current = true

    setIsCheckingChannel(true)
    try {
      const result = await getKakaoChannelConfig()
      // Kakao is only usable when: Solapi provider + verified + channel configured
      const isUsable = !!(result.success && result.data?.isKakaoUsable)
      setHasKakaoChannel(isUsable)
      setUnavailableReason(
        isUsable
          ? null
          : result.success
            ? (result.data?.unavailableReason ?? 'no_config')
            : null
      )
      return isUsable
    } catch (error) {
      console.error('[useKakaoMessaging] Failed to check Kakao channel:', error)
      setHasKakaoChannel(false)
      setUnavailableReason(null)
      return false
    } finally {
      setIsChannelChecked(true)
      setIsCheckingChannel(false)
      checkingRef.current = false
    }
  }, [])

  /**
   * 알림톡 템플릿 목록 로드
   */
  const loadTemplates = useCallback(async (): Promise<KakaoTemplate[]> => {
    if (loadingTemplatesRef.current) return []
    loadingTemplatesRef.current = true

    setIsLoadingTemplates(true)
    try {
      const result = await getKakaoTemplates()
      if (result.success && result.data) {
        const filteredTemplates = approvedOnly
          ? result.data.filter((t) => t.status === 'approved')
          : result.data
        setTemplates(filteredTemplates)
        return filteredTemplates
      }
      return []
    } catch (error) {
      console.error('[useKakaoMessaging] Failed to load templates:', error)
      return []
    } finally {
      setIsLoadingTemplates(false)
      loadingTemplatesRef.current = false
    }
  }, [approvedOnly])

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setHasKakaoChannel(false)
    setUnavailableReason(null)
    setIsChannelChecked(false)
    setIsCheckingChannel(false)
    setTemplates([])
    setIsLoadingTemplates(false)
  }, [])

  return {
    hasKakaoChannel,
    unavailableReason,
    isChannelChecked,
    isCheckingChannel,
    templates,
    isLoadingTemplates,
    checkChannel,
    loadTemplates,
    reset,
  }
}
