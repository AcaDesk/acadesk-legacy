/**
 * Kakao Channel Server Actions Tests
 *
 * Tests for kakao-channel.ts server actions
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import { z } from 'zod'

// Mock modules before importing the actual module
vi.mock('@/lib/auth/verify-permission', () => ({
  verifyStaff: vi.fn(),
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock('@/infra/messaging/SolapiProvider', () => ({
  SolapiProvider: vi.fn(),
}))

// Import after mocks are set up
import {
  createKakaoChannel,
  removeKakaoChannel,
} from './kakao-channel'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { SolapiProvider } from '@/infra/messaging/SolapiProvider'

describe('kakao-channel server actions', () => {
  const mockTenantId = 'test-tenant-id'

  // Mock Supabase client helper
  function createMockSupabaseClient(overrides?: {
    selectData?: any
    selectError?: Error | null
    updateError?: Error | null
  }) {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockIs = vi.fn().mockReturnThis()
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: overrides?.selectData ?? null,
      error: overrides?.selectError ?? null,
    })
    const mockUpdate = vi.fn().mockReturnThis()

    // For update chain that ends without maybeSingle
    const mockUpdateChain = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({
        error: overrides?.updateError ?? null,
      }),
    }

    return {
      from: vi.fn((table: string) => {
        if (table === 'tenant_messaging_config') {
          return {
            select: mockSelect.mockReturnValue({
              eq: mockEq.mockReturnValue({
                is: mockIs.mockReturnValue({
                  maybeSingle: mockMaybeSingle,
                }),
              }),
            }),
            update: mockUpdate.mockReturnValue({
              eq: mockUpdateChain.eq.mockReturnValue({
                is: mockUpdateChain.is,
              }),
            }),
          }
        }
        if (table === 'kakao_alimtalk_templates') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }
        }
        return {
          select: mockSelect,
          update: mockUpdate,
        }
      }),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(verifyStaff as Mock).mockResolvedValue({ tenantId: mockTenantId })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createKakaoChannel validation', () => {
    it('should reject searchId without @ prefix', async () => {
      const mockSupabase = createMockSupabaseClient({
        selectData: {
          provider: 'solapi',
          solapi_api_key: 'test-key',
          solapi_api_secret: 'test-secret',
          solapi_sender_phone: '01012345678',
        },
      })
      ;(createServiceRoleClient as Mock).mockReturnValue(mockSupabase)

      const result = await createKakaoChannel({
        searchId: 'invalid_no_at', // Missing @ prefix
        phoneNumber: '01012345678',
        token: '123456',
        categoryCode: '001',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('@로 시작해야')
    })

    it('should reject invalid phoneNumber format', async () => {
      const mockSupabase = createMockSupabaseClient({
        selectData: {
          provider: 'solapi',
          solapi_api_key: 'test-key',
          solapi_api_secret: 'test-secret',
          solapi_sender_phone: '01012345678',
        },
      })
      ;(createServiceRoleClient as Mock).mockReturnValue(mockSupabase)

      const result = await createKakaoChannel({
        searchId: '@valid_channel',
        phoneNumber: '123-456-789', // Invalid format
        token: '123456',
        categoryCode: '001',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('휴대폰 번호 형식')
    })

    it('should reject phoneNumber with wrong prefix', async () => {
      const mockSupabase = createMockSupabaseClient({
        selectData: {
          provider: 'solapi',
          solapi_api_key: 'test-key',
          solapi_api_secret: 'test-secret',
          solapi_sender_phone: '01012345678',
        },
      })
      ;(createServiceRoleClient as Mock).mockReturnValue(mockSupabase)

      const result = await createKakaoChannel({
        searchId: '@valid_channel',
        phoneNumber: '02012345678', // Wrong prefix (02 instead of 010)
        token: '123456',
        categoryCode: '001',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('휴대폰 번호 형식')
    })

    it('should accept valid input format', async () => {
      const mockChannel = {
        channelId: 'test-channel-id',
        searchId: '@valid_channel',
        name: 'Test Channel',
        status: 'active',
        verifiedAt: new Date(),
      }

      const mockProvider = {
        createKakaoChannel: vi.fn().mockResolvedValue(mockChannel),
      }
      ;(SolapiProvider as unknown as Mock).mockImplementation(() => mockProvider)

      // Mock Supabase with complete chain for both select and update
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tenant_messaging_config') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          provider: 'solapi',
                          solapi_api_key: 'test-key',
                          solapi_api_secret: 'test-secret',
                          solapi_sender_phone: '01012345678',
                        },
                        error: null,
                      }),
                    }),
                  }),
                  is: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        provider: 'solapi',
                        solapi_api_key: 'test-key',
                        solapi_api_secret: 'test-secret',
                        solapi_sender_phone: '01012345678',
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            }
          }
          return {}
        }),
      }
      ;(createServiceRoleClient as Mock).mockReturnValue(mockSupabase)

      const result = await createKakaoChannel({
        searchId: '@valid_channel',
        phoneNumber: '01012345678',
        token: '123456',
        categoryCode: '001',
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockChannel)
    })
  })

  describe('removeKakaoChannel', () => {
    it('should fail when Solapi credentials are missing', async () => {
      // Mock: channel exists but no Solapi credentials
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tenant_messaging_config') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { kakao_channel_id: 'existing-channel-id' },
                      error: null,
                    }),
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      }
      ;(createServiceRoleClient as Mock).mockReturnValue(mockSupabase)

      // Second query for getSolapiProvider returns no credentials
      const mockSupabaseForProvider = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null, // No credentials
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }

      // Track call count to return different mocks
      let callCount = 0
      ;(createServiceRoleClient as Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) return mockSupabase
        return mockSupabaseForProvider
      })

      const result = await removeKakaoChannel()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Solapi API 설정이 없어')
    })

    it('should fail when Solapi API returns error', async () => {
      const mockProvider = {
        removeKakaoChannel: vi.fn().mockRejectedValue(new Error('Solapi API Error')),
      }
      ;(SolapiProvider as unknown as Mock).mockImplementation(() => mockProvider)

      // Return channel info for first query
      const mockSupabase = {
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data:
                    table === 'tenant_messaging_config'
                      ? {
                          kakao_channel_id: 'existing-channel-id',
                          provider: 'solapi',
                          solapi_api_key: 'test-key',
                          solapi_api_secret: 'test-secret',
                          solapi_sender_phone: '01012345678',
                        }
                      : null,
                  error: null,
                }),
              }),
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      provider: 'solapi',
                      solapi_api_key: 'test-key',
                      solapi_api_secret: 'test-secret',
                      solapi_sender_phone: '01012345678',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })),
      }
      ;(createServiceRoleClient as Mock).mockReturnValue(mockSupabase)

      const result = await removeKakaoChannel()

      expect(result.success).toBe(false)
      expect(result.error).toContain('채널 삭제에 실패')
    })

    it('should succeed when Solapi API succeeds', async () => {
      const mockProvider = {
        removeKakaoChannel: vi.fn().mockResolvedValue(undefined),
      }
      ;(SolapiProvider as unknown as Mock).mockImplementation(() => mockProvider)

      // Complex mock for multiple queries
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tenant_messaging_config') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        kakao_channel_id: 'existing-channel-id',
                        provider: 'solapi',
                        solapi_api_key: 'test-key',
                        solapi_api_secret: 'test-secret',
                        solapi_sender_phone: '01012345678',
                      },
                      error: null,
                    }),
                  }),
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          provider: 'solapi',
                          solapi_api_key: 'test-key',
                          solapi_api_secret: 'test-secret',
                          solapi_sender_phone: '01012345678',
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            }
          }
          if (table === 'kakao_alimtalk_templates') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            }
          }
          return {}
        }),
      }
      ;(createServiceRoleClient as Mock).mockReturnValue(mockSupabase)

      const result = await removeKakaoChannel()

      expect(result.success).toBe(true)
      expect(mockProvider.removeKakaoChannel).toHaveBeenCalledWith('existing-channel-id')
    })
  })

  describe('createChannelSchema validation (unit)', () => {
    const createChannelSchema = z.object({
      searchId: z
        .string()
        .min(1, '채널 검색 ID는 필수입니다')
        .regex(/^@/, '검색 ID는 @로 시작해야 합니다'),
      phoneNumber: z
        .string()
        .regex(/^010\d{8}$/, '올바른 휴대폰 번호 형식이 아닙니다 (예: 01012345678)'),
      token: z.string().min(1, '인증 토큰은 필수입니다'),
      categoryCode: z.string().min(1, '카테고리 선택은 필수입니다'),
    })

    it('should validate correct input', () => {
      const validInput = {
        searchId: '@test_channel',
        phoneNumber: '01012345678',
        token: '123456',
        categoryCode: '001',
      }

      const result = createChannelSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject searchId without @ prefix', () => {
      const invalidInput = {
        searchId: 'test_channel',
        phoneNumber: '01012345678',
        token: '123456',
        categoryCode: '001',
      }

      const result = createChannelSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('@로 시작해야')
      }
    })

    it('should reject phoneNumber with hyphens', () => {
      const invalidInput = {
        searchId: '@test_channel',
        phoneNumber: '010-1234-5678',
        token: '123456',
        categoryCode: '001',
      }

      const result = createChannelSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject phoneNumber with wrong length', () => {
      const invalidInput = {
        searchId: '@test_channel',
        phoneNumber: '0101234567', // 10 digits instead of 11
        token: '123456',
        categoryCode: '001',
      }

      const result = createChannelSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject phoneNumber not starting with 010', () => {
      const invalidInput = {
        searchId: '@test_channel',
        phoneNumber: '01112345678',
        token: '123456',
        categoryCode: '001',
      }

      const result = createChannelSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })
})
