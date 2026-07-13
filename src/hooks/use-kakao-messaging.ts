/**
 * useKakaoMessaging Hook
 *
 * 카카오 알림톡 관련 상태와 로직을 관리하는 커스텀 훅
 * - 카카오 채널 연동 상태 확인
 * - 승인된 템플릿 로드
 *
 * 내부는 React Query 캐시를 사용한다:
 * - 채널 상태·템플릿 목록이 소비자(다이얼로그) 간 전역 공유되어 재조회가 사라진다
 * - 템플릿 캐시 키는 설정 페이지(KakaoTemplateList)와 공유 — 검수/등록 후 무효화가 즉시 반영된다
 * - checkChannel/loadTemplates 명령형 API는 기존 시맨틱 그대로 유지 (호출 시에만 조회)
 */

'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getKakaoChannelConfig,
  type KakaoUnavailableReason,
} from '@/app/actions/messaging/kakao-channel'
import { getKakaoTemplates, type KakaoTemplate } from '@/app/actions/messaging/kakao-templates'
import { queryKeys } from '@/lib/query-keys'

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

interface KakaoChannelState {
  isUsable: boolean
  unavailableReason: KakaoUnavailableReason | null
}

const CHANNEL_STALE_TIME = 5 * 60_000
const TEMPLATES_STALE_TIME = 60_000

async function fetchKakaoChannelState(): Promise<KakaoChannelState> {
  const result = await getKakaoChannelConfig()
  // Kakao is only usable when: Solapi provider + verified + channel configured
  const isUsable = !!(result.success && result.data?.isKakaoUsable)
  return {
    isUsable,
    unavailableReason: isUsable
      ? null
      : result.success
        ? (result.data?.unavailableReason ?? 'no_config')
        : null,
  }
}

async function fetchKakaoTemplates(): Promise<KakaoTemplate[]> {
  const result = await getKakaoTemplates()
  if (!result.success || !result.data) {
    throw new Error(result.error || '알림톡 템플릿 조회 실패')
  }
  return result.data
}

export function useKakaoMessaging(
  options: UseKakaoMessagingOptions = {}
): UseKakaoMessagingReturn {
  const { approvedOnly = true } = options
  const queryClient = useQueryClient()

  // enabled: false — checkChannel/loadTemplates 호출 시에만 조회 (기존 시맨틱).
  // 옵저버는 공유 캐시 갱신을 구독해 다른 소비자가 조회한 결과도 즉시 반영한다.
  const channelQuery = useQuery({
    queryKey: queryKeys.messaging.kakaoChannel(),
    queryFn: fetchKakaoChannelState,
    enabled: false,
    staleTime: CHANNEL_STALE_TIME,
  })

  const templatesQuery = useQuery({
    queryKey: queryKeys.messaging.kakaoTemplates(),
    queryFn: fetchKakaoTemplates,
    enabled: false,
    staleTime: TEMPLATES_STALE_TIME,
  })

  const checkChannel = useCallback(async (): Promise<boolean> => {
    try {
      const state = await queryClient.fetchQuery({
        queryKey: queryKeys.messaging.kakaoChannel(),
        queryFn: fetchKakaoChannelState,
        staleTime: CHANNEL_STALE_TIME,
      })
      return state.isUsable
    } catch (error) {
      console.error('[useKakaoMessaging] Failed to check Kakao channel:', error)
      return false
    }
  }, [queryClient])

  const filterTemplates = useCallback(
    (all: KakaoTemplate[]) =>
      approvedOnly ? all.filter((t) => t.status === 'approved') : all,
    [approvedOnly]
  )

  const loadTemplates = useCallback(async (): Promise<KakaoTemplate[]> => {
    try {
      const all = await queryClient.fetchQuery({
        queryKey: queryKeys.messaging.kakaoTemplates(),
        queryFn: fetchKakaoTemplates,
        staleTime: TEMPLATES_STALE_TIME,
      })
      return filterTemplates(all)
    } catch (error) {
      console.error('[useKakaoMessaging] Failed to load templates:', error)
      return []
    }
  }, [queryClient, filterTemplates])

  const reset = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.messaging.kakaoChannel() })
    queryClient.removeQueries({ queryKey: queryKeys.messaging.kakaoTemplates() })
  }, [queryClient])

  // 캐시에는 전체 목록을 저장하고 approvedOnly 필터는 소비자별로 파생
  const templates = useMemo(
    () => filterTemplates(templatesQuery.data ?? []),
    [templatesQuery.data, filterTemplates]
  )

  return {
    hasKakaoChannel: channelQuery.data?.isUsable ?? false,
    unavailableReason: channelQuery.data?.unavailableReason ?? null,
    isChannelChecked: channelQuery.isFetched || channelQuery.isError,
    isCheckingChannel: channelQuery.isFetching,
    templates,
    isLoadingTemplates: templatesQuery.isFetching,
    checkChannel,
    loadTemplates,
    reset,
  }
}
