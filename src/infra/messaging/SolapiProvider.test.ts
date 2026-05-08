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

describe('SolapiProvider Kakao template management', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses the Solapi emphasizeSubTitle field when creating a TEXT-emphasis template', async () => {
    const provider = new SolapiProvider({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      senderPhone: '01012345678',
    })
    const createKakaoAlimtalkTemplate = vi.fn().mockResolvedValue({
      templateId: 'template-1',
      status: 'PENDING',
    })

    ;(provider as unknown as {
      messageService: { createKakaoAlimtalkTemplate: typeof createKakaoAlimtalkTemplate }
    }).messageService = { createKakaoAlimtalkTemplate }

    await provider.createKakaoAlimtalkTemplate({
      channelId: 'channel-1',
      name: '학습 리포트',
      content: '#{학생명} 리포트',
      categoryCode: '006001',
      emphasizeType: 'TEXT',
      emphasizeTitle: '리포트',
      emphasizeSubtitle: '도착',
    })

    expect(createKakaoAlimtalkTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        emphasizeTitle: '리포트',
        emphasizeSubTitle: '도착',
      })
    )
  })

  it('uses the Solapi emphasizeSubTitle field when updating a TEXT-emphasis template', async () => {
    const provider = new SolapiProvider({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      senderPhone: '01012345678',
    })
    const updateKakaoAlimtalkTemplate = vi.fn().mockResolvedValue({
      status: 'PENDING',
    })

    ;(provider as unknown as {
      messageService: { updateKakaoAlimtalkTemplate: typeof updateKakaoAlimtalkTemplate }
    }).messageService = { updateKakaoAlimtalkTemplate }

    await provider.updateKakaoAlimtalkTemplate('template-1', {
      emphasizeType: 'TEXT',
      emphasizeTitle: '리포트',
      emphasizeSubtitle: '수정',
    })

    expect(updateKakaoAlimtalkTemplate).toHaveBeenCalledWith(
      'template-1',
      expect.objectContaining({
        emphasizeTitle: '리포트',
        emphasizeSubTitle: '수정',
      })
    )
  })

  it('falls back to the official inspection REST API when the SDK method is unavailable', async () => {
    const provider = new SolapiProvider({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      senderPhone: '01012345678',
    })

    ;(provider as unknown as { messageService: object }).messageService = {}

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'INSPECTING' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await provider.requestKakaoAlimtalkTemplateInspection(
      'template-1',
      '빠른 검수 부탁드립니다.'
    )

    expect(result.status).toBe('inspecting')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.solapi.com/kakao/v2/templates/template-1/inspection',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('HMAC-SHA256 apiKey=test-key'),
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ comment: '빠른 검수 부탁드립니다.' }),
      })
    )
  })
})
