import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SolapiProvider } from './SolapiProvider'

describe('SolapiProvider.getKakaoChannelCategories', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the upstream category list sorted by category code', async () => {
    const provider = new SolapiProvider({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      senderPhone: '01012345678',
    })

    ;(provider as unknown as { messageService: { getKakaoChannelCategories: () => Promise<Array<{ code: string; name: string }>> } }).messageService = {
      getKakaoChannelCategories: vi.fn().mockResolvedValue([
        { code: '002', name: '교육/학원' },
        { code: '001', name: '음식점' },
        { code: '010', name: '부동산' },
      ]),
    }

    const result = await provider.getKakaoChannelCategories()

    expect(result).toEqual([
      { code: '001', name: '음식점' },
      { code: '002', name: '교육/학원' },
      { code: '010', name: '부동산' },
    ])
  })

  it('rethrows upstream errors', async () => {
    const provider = new SolapiProvider({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      senderPhone: '01012345678',
    })
    const expectedError = new Error('upstream failed')

    ;(provider as unknown as { messageService: { getKakaoChannelCategories: () => Promise<never> } }).messageService = {
      getKakaoChannelCategories: vi.fn().mockRejectedValue(expectedError),
    }

    await expect(provider.getKakaoChannelCategories()).rejects.toThrow('upstream failed')
  })
})

describe('SolapiProvider.sendAlimtalk', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes Alimtalk variable keys to Solapi format', async () => {
    const provider = new SolapiProvider({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      senderPhone: '01012345678',
    })
    const send = vi.fn().mockResolvedValue({ groupInfo: { groupId: 'group-1' } })

    ;(provider as unknown as { messageService: { send: typeof send } }).messageService = { send }

    const result = await provider.sendAlimtalk({
      to: '010-1111-2222',
      channelId: 'PF123',
      templateId: 'TPL123',
      variables: {
        학생명: '김학생',
        guardianName: '이보호자',
        '#{기간}': '4월',
      },
    })

    expect(result.success).toBe(true)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kakaoOptions: expect.objectContaining({
          variables: {
            '#{학생명}': '김학생',
            '#{보호자명}': '이보호자',
            '#{기간}': '4월',
          },
        }),
      })
    )
  })
})
