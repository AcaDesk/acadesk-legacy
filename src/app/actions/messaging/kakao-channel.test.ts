/**
 * Kakao Channel Server Actions Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('@/lib/auth/verify-permission', () => ({
  verifyStaff: vi.fn(),
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock('@/lib/messaging/get-solapi-provider', () => ({
  getSolapiProvider: vi.fn(),
}))

import { createKakaoChannel, removeKakaoChannel } from './kakao-channel'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getSolapiProvider } from '@/lib/messaging/get-solapi-provider'

function createSelectChain(data: Record<string, unknown> | null, error: Error | null = null) {
  const chain: Record<string, Mock> = {} as Record<string, Mock>
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error })
  return chain
}

function createMockSupabaseClient(overrides?: {
  configData?: Record<string, unknown> | null
  configError?: Error | null
  messagingUpdateError?: Error | null
  templateUpdateError?: Error | null
}) {
  const messagingUpdateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      is: vi.fn().mockResolvedValue({
        error: overrides?.messagingUpdateError ?? null,
      }),
    }),
  })

  const templateUpdateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      is: vi.fn().mockResolvedValue({
        error: overrides?.templateUpdateError ?? null,
      }),
    }),
  })

  return {
    client: {
      from: vi.fn((table: string) => {
        if (table === 'tenant_messaging_config') {
          return {
            select: vi.fn().mockReturnValue(
              createSelectChain(overrides?.configData ?? null, overrides?.configError ?? null)
            ),
            update: messagingUpdateMock,
          }
        }

        if (table === 'kakao_alimtalk_templates') {
          return {
            update: templateUpdateMock,
          }
        }

        return {}
      }),
    },
    messagingUpdateMock,
    templateUpdateMock,
  }
}

const mockCategories = [
  { code: '004001', name: '교육/학원' },
  { code: '001001', name: '음식점' },
]

function createSolapiError(errorCode: string, errorMessage: string) {
  return Object.assign(new Error(`${errorCode}: ${errorMessage}`), {
    name: 'ApiError',
    errorCode,
    errorMessage,
    httpStatus: 400,
    url: 'https://api.solapi.com/kakao/v2/channels',
  })
}

describe('kakao-channel server actions', () => {
  const mockTenantId = 'test-tenant-id'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    ;(verifyStaff as Mock).mockResolvedValue({ tenantId: mockTenantId })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createKakaoChannel', () => {
    it('rejects invalid searchId format', async () => {
      ;(getSolapiProvider as Mock).mockResolvedValue({ createKakaoChannel: vi.fn(), getKakaoChannelCategories: vi.fn().mockResolvedValue(mockCategories) })

      const result = await createKakaoChannel({
        searchId: 'invalid*id',
        phoneNumber: '01012345678',
        token: '123456',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('검색용 아이디 형식')
    })

    it('rejects invalid phoneNumber format', async () => {
      const result = await createKakaoChannel({
        searchId: '@validchannel',
        phoneNumber: '123-456-789',
        token: '123456',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('휴대폰 번호 형식')
    })

    it('creates a channel and saves config', async () => {
      const mockChannel = {
        channelId: 'test-channel-id',
        searchId: '@validchannel',
        name: 'Test Channel',
        status: 'active' as const,
        verifiedAt: new Date(),
      }
      const mockProvider = {
        createKakaoChannel: vi.fn().mockResolvedValue(mockChannel),
        getKakaoChannelCategories: vi.fn().mockResolvedValue(mockCategories),
      }
      const supabase = createMockSupabaseClient()

      ;(getSolapiProvider as Mock).mockResolvedValue(mockProvider)
      ;(createServiceRoleClient as Mock).mockReturnValue(supabase.client)

      const result = await createKakaoChannel({
        searchId: '@validchannel',
        phoneNumber: '01012345678',
        token: '123456',
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockChannel)
      expect(mockProvider.createKakaoChannel).toHaveBeenCalledWith({
        searchId: '@validchannel',
        phoneNumber: '01012345678',
        token: '123456',
        categoryCode: '004001',
      })
      expect(supabase.messagingUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          kakao_channel_id: 'test-channel-id',
          kakao_channel_search_id: '@validchannel',
          kakao_channel_name: 'Test Channel',
          kakao_channel_status: 'active',
        })
      )
    })

    it('returns translated Solapi error with original detail', async () => {
      const mockProvider = {
        createKakaoChannel: vi.fn().mockRejectedValue(createSolapiError('InvalidToken', 'token invalid')),
        getKakaoChannelCategories: vi.fn().mockResolvedValue(mockCategories),
      }

      ;(getSolapiProvider as Mock).mockResolvedValue(mockProvider)

      const result = await createKakaoChannel({
        searchId: '@validchannel',
        phoneNumber: '01012345678',
        token: '123456',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('인증 코드가 올바르지 않습니다')
      expect(result.error).toContain('token invalid')
    })

    it('recovers an already-registered remote channel and saves it locally', async () => {
      const existingChannel = {
        channelId: 'existing-channel-id',
        searchId: '@validchannel',
        name: 'Existing Channel',
        status: 'active' as const,
        verifiedAt: new Date(),
      }
      const mockProvider = {
        createKakaoChannel: vi.fn().mockRejectedValue(
          createSolapiError('SearchIdInUse', 'already registered')
        ),
        getKakaoChannels: vi.fn().mockResolvedValue([existingChannel]),
        getKakaoChannelCategories: vi.fn().mockResolvedValue(mockCategories),
      }
      const supabase = createMockSupabaseClient()

      ;(getSolapiProvider as Mock).mockResolvedValue(mockProvider)
      ;(createServiceRoleClient as Mock).mockReturnValue(supabase.client)

      const result = await createKakaoChannel({
        searchId: '@validchannel',
        phoneNumber: '01012345678',
        token: '123456',
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(existingChannel)
      expect(mockProvider.getKakaoChannels).toHaveBeenCalledTimes(1)
      expect(supabase.messagingUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          kakao_channel_id: 'existing-channel-id',
          kakao_channel_search_id: '@validchannel',
        })
      )
    })
  })

  describe('removeKakaoChannel', () => {
    it('fails when Solapi provider is unavailable', async () => {
      const supabase = createMockSupabaseClient({
        configData: { kakao_channel_id: 'existing-channel-id' },
      })

      ;(createServiceRoleClient as Mock).mockReturnValue(supabase.client)
      ;(getSolapiProvider as Mock).mockResolvedValue(null)

      const result = await removeKakaoChannel()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Solapi API 설정이 없어')
    })

    it('returns the validation error when remote deletion fails', async () => {
      const mockProvider = {
        removeKakaoChannel: vi.fn().mockRejectedValue(new Error('Solapi API Error')),
      }
      const supabase = createMockSupabaseClient({
        configData: { kakao_channel_id: 'existing-channel-id' },
      })

      ;(createServiceRoleClient as Mock).mockReturnValue(supabase.client)
      ;(getSolapiProvider as Mock).mockResolvedValue(mockProvider)

      const result = await removeKakaoChannel()

      expect(result.success).toBe(false)
      expect(result.error).toContain('채널 삭제에 실패')
    })

    it('removes the remote channel and clears local config', async () => {
      const mockProvider = {
        removeKakaoChannel: vi.fn().mockResolvedValue(undefined),
      }
      const supabase = createMockSupabaseClient({
        configData: { kakao_channel_id: 'existing-channel-id' },
      })

      ;(createServiceRoleClient as Mock).mockReturnValue(supabase.client)
      ;(getSolapiProvider as Mock).mockResolvedValue(mockProvider)

      const result = await removeKakaoChannel()

      expect(result.success).toBe(true)
      expect(mockProvider.removeKakaoChannel).toHaveBeenCalledWith('existing-channel-id')
      expect(supabase.messagingUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          kakao_channel_id: null,
          kakao_channel_search_id: null,
        })
      )
      expect(supabase.templateUpdateMock).toHaveBeenCalledTimes(1)
    })
  })
})
