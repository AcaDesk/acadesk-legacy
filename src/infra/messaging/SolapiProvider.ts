/**
 * Solapi SMS/LMS/Kakao Alimtalk Provider - Infrastructure Layer
 *
 * IMessageProvider 인터페이스 구현체 (솔라피 SDK 사용)
 * @see https://developers.solapi.com/sdk-list/Node.js
 */

import { SolapiMessageService } from 'solapi'
import {
  type IMessageProvider,
  type SendMessageRequest,
  type SendMessageResponse,
  type DeliveryStatusResponse,
  MessageChannel,
  DeliveryStatus,
} from '@/core/domain/messaging/IMessageProvider'
import type {
  KakaoChannel,
  KakaoChannelCategory,
  KakaoChannelTokenRequest,
  KakaoChannelTokenResponse,
  KakaoChannelCreateRequest,
  KakaoTemplateCategory,
  KakaoAlimtalkTemplate,
  CreateKakaoTemplateRequest,
  UpdateKakaoTemplateRequest,
  SendAlimtalkRequest,
  SendAlimtalkResponse,
  KakaoTemplateStatus,
  KakaoButton,
} from './types/kakao.types'

interface SolapiConfig {
  apiKey: string
  apiSecret: string
  senderPhone: string
}

export class SolapiProvider implements IMessageProvider {
  readonly channel: MessageChannel = MessageChannel.SMS
  readonly name: string = 'Solapi'

  private config: SolapiConfig
  private messageService: SolapiMessageService

  constructor(config?: Partial<SolapiConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.SOLAPI_API_KEY || '',
      apiSecret: config?.apiSecret || process.env.SOLAPI_API_SECRET || '',
      senderPhone: config?.senderPhone || process.env.SOLAPI_SENDER_PHONE || '',
    }

    // 설정 검증
    if (!this.config.apiKey || !this.config.apiSecret || !this.config.senderPhone) {
      console.warn(
        '[SolapiProvider] Missing configuration. Set SOLAPI_API_KEY, SOLAPI_API_SECRET, and SOLAPI_SENDER_PHONE'
      )
    }

    // SDK 초기화
    this.messageService = new SolapiMessageService(this.config.apiKey, this.config.apiSecret)
  }

  /**
   * 메시지 전송
   */
  async send(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      // 채널 검증
      if (request.channel !== MessageChannel.SMS && request.channel !== MessageChannel.LMS) {
        throw new Error(
          `Unsupported channel: ${request.channel}. SolapiProvider only supports SMS and LMS.`
        )
      }

      // 수신자 전화번호 확인
      if (!request.recipient.phone) {
        throw new Error('Recipient phone number is required for SMS/LMS')
      }

      // 테스트 모드 확인 (개발 환경)
      const isTestMode = process.env.NODE_ENV === 'development'

      if (isTestMode) {
        console.log('[SolapiProvider TEST MODE] Message would be sent:', {
          sender: this.config.senderPhone,
          receiver: request.recipient.phone,
          body: request.content.body,
          channel: request.channel,
          metadata: request.metadata,
        })

        return {
          success: true,
          messageId: `TEST_SOLAPI_${Date.now()}`,
          cost: request.channel === MessageChannel.SMS ? 8 : 24,
          estimatedDelivery: new Date(Date.now() + 1000 * 30), // 30초 후
        }
      }

      // 메시지 타입 결정
      const messageType = this.determineMessageType(request.content.body, request.channel)

      // SDK를 사용한 메시지 발송
      const messageObject = {
        to: this.sanitizePhoneNumber(request.recipient.phone),
        from: this.sanitizePhoneNumber(this.config.senderPhone),
        text: request.content.body,
        ...(messageType === 'LMS' && request.content.subject
          ? { subject: request.content.subject }
          : {}),
      }

      // SDK send 메서드 호출
      const response = await this.messageService.send(messageObject)

      // 성공 응답 - groupInfo에서 groupId 추출
      if (!response.groupInfo?.groupId) {
        return {
          success: false,
          error: 'Solapi API did not return a group ID',
        }
      }

      return {
        success: true,
        messageId: response.groupInfo.groupId,
        cost: messageType === 'SMS' ? 8 : 24, // SMS: 8원, LMS: 24원 (예상)
      }
    } catch (error) {
      console.error('[SolapiProvider.send] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 잔액 조회
   */
  async checkBalance(): Promise<{ balance: number; currency: string }> {
    try {
      // 테스트 모드
      if (process.env.NODE_ENV === 'development') {
        return { balance: 100000, currency: 'KRW' }
      }

      // SDK getBalance 메서드 사용
      const balanceData = await this.messageService.getBalance()

      return {
        balance: balanceData.balance || 0,
        currency: 'KRW',
      }
    } catch (error) {
      console.error('[SolapiProvider.checkBalance] Error:', error)
      throw error
    }
  }

  /**
   * 전달 상태 조회
   */
  async getDeliveryStatus(messageId: string): Promise<DeliveryStatusResponse> {
    try {
      // 테스트 모드
      if (process.env.NODE_ENV === 'development') {
        return {
          status: DeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
        }
      }

      // SDK getMessages 메서드로 메시지 조회
      const messages = await this.messageService.getMessages({
        groupId: messageId,
      })

      // messageList는 Record<string, Message> 타입이므로 배열로 변환
      const messageArray = messages.messageList ? Object.values(messages.messageList) : []

      // 첫 번째 메시지의 상태 확인
      if (messageArray.length === 0) {
        return {
          status: DeliveryStatus.PENDING,
        }
      }

      const message: any = messageArray[0]

      // 상태 매핑
      switch (message.statusCode) {
        case 'PENDING':
        case 'SENDING':
          return { status: DeliveryStatus.PENDING }
        case 'SENT':
        case 'COMPLETE':
          return {
            status: DeliveryStatus.DELIVERED,
            deliveredAt: message.dateUpdated ? new Date(message.dateUpdated) : undefined,
          }
        case 'FAILED':
          return {
            status: DeliveryStatus.FAILED,
            failureReason: message.reason || message.statusMessage || '전송 실패',
          }
        default:
          return { status: DeliveryStatus.PENDING }
      }
    } catch (error) {
      console.error('[SolapiProvider.getDeliveryStatus] Error:', error)
      return {
        status: DeliveryStatus.FAILED,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 메시지 이력 조회 (새 기능)
   *
   * @param filters - 필터 옵션
   * @returns 메시지 목록
   */
  async getMessages(filters?: {
    limit?: number
    messageIds?: string[]
    groupId?: string
    startDate?: Date | string
    endDate?: Date | string
    type?: 'SMS' | 'LMS' | 'MMS'
  }) {
    try {
      // 테스트 모드
      if (process.env.NODE_ENV === 'development') {
        return {
          messageList: [],
          totalCount: 0,
        }
      }

      // SDK getMessages 메서드 사용
      const params: any = {}

      if (filters?.limit) params.limit = filters.limit
      if (filters?.messageIds) params.messageIds = filters.messageIds
      if (filters?.groupId) params.groupId = filters.groupId
      if (filters?.startDate) params.startDate = filters.startDate
      if (filters?.endDate) params.endDate = filters.endDate
      if (filters?.type) params.type = filters.type

      const result = await this.messageService.getMessages(params)

      // messageList는 Record<string, Message> 타입이므로 배열로 변환
      const messageArray = result.messageList ? Object.values(result.messageList) : []

      return {
        messageList: messageArray,
        totalCount: messageArray.length,
        nextKey: result.nextKey,
      }
    } catch (error) {
      console.error('[SolapiProvider.getMessages] Error:', error)
      throw error
    }
  }

  /**
   * 통계 조회 (새 기능)
   *
   * @param startDate - 시작 날짜
   * @param endDate - 종료 날짜
   * @returns 통계 데이터
   */
  async getStatistics(startDate?: Date | string, endDate?: Date | string) {
    try {
      // 테스트 모드
      if (process.env.NODE_ENV === 'development') {
        return {
          total: 0,
          success: 0,
          pending: 0,
          failed: 0,
        }
      }

      // SDK getStatistics 메서드 사용
      const params: any = {}

      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const result = await this.messageService.getStatistics(params)

      return result
    } catch (error) {
      console.error('[SolapiProvider.getStatistics] Error:', error)
      throw error
    }
  }

  /**
   * 메시지 타입 결정 (SMS vs LMS)
   */
  private determineMessageType(body: string, channel: MessageChannel): 'SMS' | 'LMS' {
    if (channel === MessageChannel.LMS) {
      return 'LMS'
    }

    // SMS는 90바이트 이내 (한글 45자, 영문 90자)
    const bytes = Buffer.byteLength(body, 'utf-8')
    return bytes <= 90 ? 'SMS' : 'LMS'
  }

  /**
   * 전화번호 정리 (하이픈 제거)
   * Solapi는 01012345678 형식 요구
   */
  private sanitizePhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, '')
  }

  // ============================================================================
  // Kakao Channel Management (카카오 채널 관리)
  // ============================================================================

  /**
   * 카카오 채널 인증 토큰 요청
   * 대표자 전화번호로 카카오톡 인증 메시지가 발송됨
   */
  async requestKakaoChannelToken(
    data: KakaoChannelTokenRequest
  ): Promise<KakaoChannelTokenResponse> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SolapiProvider TEST MODE] requestKakaoChannelToken:', data)
        return { success: true }
      }

      await this.messageService.requestKakaoChannelToken({
        searchId: data.searchId,
        phoneNumber: this.sanitizePhoneNumber(data.phoneNumber),
      })

      return { success: true }
    } catch (error) {
      console.error('[SolapiProvider.requestKakaoChannelToken] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '채널 토큰 요청 실패',
      }
    }
  }

  /**
   * 카카오 채널 카테고리 목록 조회
   */
  async getKakaoChannelCategories(): Promise<KakaoChannelCategory[]> {
    try {
      if (process.env.NODE_ENV === 'development') {
        return [
          { code: '001', name: '음식점' },
          { code: '002', name: '교육/학원' },
          { code: '003', name: '의료/건강' },
          { code: '004', name: '금융/보험' },
          { code: '005', name: '쇼핑/유통' },
        ]
      }

      const categories = await this.messageService.getKakaoChannelCategories()
      return categories.map((cat: any) => ({
        code: cat.code,
        name: cat.name,
      }))
    } catch (error) {
      console.error('[SolapiProvider.getKakaoChannelCategories] Error:', error)
      throw error
    }
  }

  /**
   * 카카오 채널 생성 (연동)
   */
  async createKakaoChannel(data: KakaoChannelCreateRequest): Promise<KakaoChannel> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SolapiProvider TEST MODE] createKakaoChannel:', data)
        return {
          channelId: `TEST_CHANNEL_${Date.now()}`,
          searchId: data.searchId,
          name: `테스트 채널 (${data.searchId})`,
          status: 'active',
          verifiedAt: new Date(),
        }
      }

      const result = await this.messageService.createKakaoChannel({
        searchId: data.searchId,
        phoneNumber: this.sanitizePhoneNumber(data.phoneNumber),
        token: data.token,
        categoryCode: data.categoryCode,
      })

      return {
        channelId: result.channelId,
        searchId: data.searchId,
        name: data.searchId, // createKakaoChannel response doesn't include name
        status: 'active',
        categoryCode: data.categoryCode,
        verifiedAt: new Date(),
      }
    } catch (error) {
      console.error('[SolapiProvider.createKakaoChannel] Error:', error)
      throw error
    }
  }

  /**
   * 등록된 카카오 채널 목록 조회
   */
  async getKakaoChannels(): Promise<KakaoChannel[]> {
    try {
      if (process.env.NODE_ENV === 'development') {
        return []
      }

      const response = await this.messageService.getKakaoChannels()
      return (response.channelList || []).map((ch: any) => ({
        channelId: ch.channelId,
        searchId: ch.searchId,
        name: ch.name,
        status: (ch.status?.toLowerCase() || 'active') as 'pending' | 'active' | 'suspended',
        categoryCode: ch.categoryCode,
        verifiedAt: ch.dateCreated ? new Date(ch.dateCreated) : undefined,
      }))
    } catch (error) {
      console.error('[SolapiProvider.getKakaoChannels] Error:', error)
      throw error
    }
  }

  /**
   * 카카오 채널 삭제 (연동 해제)
   * 연결된 모든 템플릿도 삭제됨
   */
  async removeKakaoChannel(channelId: string): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SolapiProvider TEST MODE] removeKakaoChannel:', channelId)
        return
      }

      await this.messageService.removeKakaoChannel(channelId)
    } catch (error) {
      console.error('[SolapiProvider.removeKakaoChannel] Error:', error)
      throw error
    }
  }

  // ============================================================================
  // Kakao Alimtalk Template Management (알림톡 템플릿 관리)
  // ============================================================================

  /**
   * 알림톡 템플릿 카테고리 목록 조회
   */
  async getKakaoAlimtalkTemplateCategories(): Promise<KakaoTemplateCategory[]> {
    try {
      if (process.env.NODE_ENV === 'development') {
        return [
          { code: '001001', name: '예약 안내' },
          { code: '001002', name: '배송 안내' },
          { code: '001003', name: '결제 안내' },
          { code: '001004', name: '회원 안내' },
          { code: '001005', name: '학습 안내' },
        ]
      }

      const categories = await this.messageService.getKakaoAlimtalkTemplateCategories()
      return categories.map((cat: any) => ({
        code: cat.code,
        name: cat.name,
      }))
    } catch (error) {
      console.error('[SolapiProvider.getKakaoAlimtalkTemplateCategories] Error:', error)
      throw error
    }
  }

  /**
   * 알림톡 템플릿 생성 (검수 요청)
   */
  async createKakaoAlimtalkTemplate(
    data: CreateKakaoTemplateRequest
  ): Promise<{ solapiTemplateId: string; status: KakaoTemplateStatus }> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SolapiProvider TEST MODE] createKakaoAlimtalkTemplate:', data)
        return {
          solapiTemplateId: `TEST_TPL_${Date.now()}`,
          status: 'inspecting',
        }
      }

      // Cast to any to avoid SDK type mismatch (discriminated union types)
      const templateRequest: any = {
        channelId: data.channelId,
        name: data.name,
        content: data.content,
        categoryCode: data.categoryCode,
        messageType: data.messageType || 'BA',
        emphasizeType: data.emphasizeType || 'NONE',
        securityFlag: data.securityFlag || false,
      }

      if (data.emphasizeTitle) templateRequest.emphasizeTitle = data.emphasizeTitle
      if (data.emphasizeSubtitle) templateRequest.emphasizeSubTitle = data.emphasizeSubtitle
      if (data.buttons && data.buttons.length > 0) templateRequest.buttons = data.buttons
      if (data.quickReplies && data.quickReplies.length > 0) templateRequest.quickReplies = data.quickReplies
      if (data.extraContent) templateRequest.extra = data.extraContent
      if (data.adContent) templateRequest.ad = data.adContent

      const result = await this.messageService.createKakaoAlimtalkTemplate(templateRequest)

      return {
        solapiTemplateId: result.templateId,
        status: this.mapTemplateStatus(result.status),
      }
    } catch (error) {
      console.error('[SolapiProvider.createKakaoAlimtalkTemplate] Error:', error)
      throw error
    }
  }

  /**
   * 알림톡 템플릿 목록 조회
   */
  async getKakaoAlimtalkTemplates(
    channelId: string,
    filters?: { status?: KakaoTemplateStatus; name?: string }
  ): Promise<Array<{
    solapiTemplateId: string
    name: string
    content: string
    status: KakaoTemplateStatus
    messageType: string
    buttons: KakaoButton[]
    dateCreated: Date
    dateUpdated: Date
  }>> {
    try {
      if (process.env.NODE_ENV === 'development') {
        return []
      }

      const params: any = { channelId }
      if (filters?.status) params.status = filters.status.toUpperCase()
      if (filters?.name) params.name = filters.name

      const result = await this.messageService.getKakaoAlimtalkTemplates(params)
      const templates = result.templateList || []

      return templates.map((tpl: any) => ({
        solapiTemplateId: tpl.templateId,
        name: tpl.name,
        content: tpl.content,
        status: this.mapTemplateStatus(tpl.status),
        messageType: tpl.messageType || 'BA',
        buttons: tpl.buttons || [],
        dateCreated: new Date(tpl.dateCreated),
        dateUpdated: new Date(tpl.dateUpdated),
      }))
    } catch (error) {
      console.error('[SolapiProvider.getKakaoAlimtalkTemplates] Error:', error)
      throw error
    }
  }

  /**
   * 알림톡 템플릿 상세 조회
   */
  async getKakaoAlimtalkTemplate(templateId: string): Promise<{
    solapiTemplateId: string
    name: string
    content: string
    status: KakaoTemplateStatus
    messageType: string
    emphasizeType: string
    emphasizeTitle?: string
    emphasizeSubtitle?: string
    buttons: KakaoButton[]
    rejectionReason?: string
    dateCreated: Date
    dateUpdated: Date
  }> {
    try {
      if (process.env.NODE_ENV === 'development') {
        return {
          solapiTemplateId: templateId,
          name: '테스트 템플릿',
          content: '#{학생명}님의 학습 리포트가 도착했습니다.',
          status: 'approved',
          messageType: 'BA',
          emphasizeType: 'NONE',
          buttons: [],
          dateCreated: new Date(),
          dateUpdated: new Date(),
        }
      }

      const result = await this.messageService.getKakaoAlimtalkTemplate(templateId)

      return {
        solapiTemplateId: result.templateId,
        name: result.name,
        content: result.content ?? '',
        status: this.mapTemplateStatus(result.status),
        messageType: result.messageType || 'BA',
        emphasizeType: result.emphasizeType || 'NONE',
        emphasizeTitle: result.emphasizeTitle ?? undefined,
        emphasizeSubtitle: result.emphasizeSubtitle ?? undefined,
        buttons: (result.buttons || []) as KakaoButton[],
        rejectionReason: result.comments?.[0]?.content ?? undefined,
        dateCreated: result.dateCreated,
        dateUpdated: result.dateUpdated,
      }
    } catch (error) {
      console.error('[SolapiProvider.getKakaoAlimtalkTemplate] Error:', error)
      throw error
    }
  }

  /**
   * 알림톡 템플릿 수정 (재검수 요청)
   */
  async updateKakaoAlimtalkTemplate(
    templateId: string,
    data: UpdateKakaoTemplateRequest
  ): Promise<{ status: KakaoTemplateStatus }> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SolapiProvider TEST MODE] updateKakaoAlimtalkTemplate:', {
          templateId,
          data,
        })
        return { status: 'inspecting' }
      }

      const updateData: any = {}
      if (data.name) updateData.name = data.name
      if (data.content) updateData.content = data.content
      if (data.categoryCode) updateData.categoryCode = data.categoryCode
      if (data.messageType) updateData.messageType = data.messageType
      if (data.emphasizeType) updateData.emphasizeType = data.emphasizeType
      if (data.emphasizeTitle) updateData.emphasizeTitle = data.emphasizeTitle
      if (data.emphasizeSubtitle) updateData.emphasizeSubtitle = data.emphasizeSubtitle
      if (data.buttons) updateData.buttons = data.buttons
      if (data.quickReplies) updateData.quickReplies = data.quickReplies
      if (data.extraContent) updateData.extra = data.extraContent
      if (data.adContent) updateData.ad = data.adContent
      if (typeof data.securityFlag === 'boolean') updateData.securityFlag = data.securityFlag

      const result = await this.messageService.updateKakaoAlimtalkTemplate(templateId, updateData)

      return {
        status: this.mapTemplateStatus(result.status),
      }
    } catch (error) {
      console.error('[SolapiProvider.updateKakaoAlimtalkTemplate] Error:', error)
      throw error
    }
  }

  /**
   * 알림톡 템플릿 삭제
   */
  async deleteKakaoAlimtalkTemplate(templateId: string): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SolapiProvider TEST MODE] deleteKakaoAlimtalkTemplate:', templateId)
        return
      }

      await this.messageService.removeKakaoAlimtalkTemplate(templateId)
    } catch (error) {
      console.error('[SolapiProvider.deleteKakaoAlimtalkTemplate] Error:', error)
      throw error
    }
  }

  // ============================================================================
  // Kakao Alimtalk Message Sending (알림톡 발송)
  // ============================================================================

  /**
   * 알림톡 메시지 발송
   */
  async sendAlimtalk(request: SendAlimtalkRequest): Promise<SendAlimtalkResponse> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SolapiProvider TEST MODE] sendAlimtalk:', request)
        return {
          success: true,
          messageId: `TEST_ATA_${Date.now()}`,
          groupId: `TEST_GROUP_${Date.now()}`,
          cost: 10,
          fallbackToSms: false,
        }
      }

      // 알림톡 메시지 객체 구성
      const messageObject: any = {
        to: this.sanitizePhoneNumber(request.to),
        from: this.sanitizePhoneNumber(request.senderPhone || this.config.senderPhone),
        type: 'ATA', // Alimtalk
        kakaoOptions: {
          pfId: request.channelId,
          templateId: request.templateId,
          disableSms: request.disableSms ?? false, // 기본: SMS fallback 활성화
        },
      }

      // 변수 치환
      if (request.variables && Object.keys(request.variables).length > 0) {
        messageObject.kakaoOptions.variables = request.variables
      }

      // 버튼 (템플릿 오버라이드)
      if (request.buttons && request.buttons.length > 0) {
        messageObject.kakaoOptions.buttons = request.buttons
      }

      // SDK send 메서드 호출
      const response = await this.messageService.send(messageObject)

      // 결과 확인
      const groupId = response.groupInfo?.groupId

      if (!groupId) {
        return {
          success: false,
          error: 'Solapi API did not return a group ID',
        }
      }

      // SMS fallback 발생 여부 확인 (실제로는 발송 후 상태 조회 필요)
      const fallbackToSms = false // TODO: 실제 발송 결과에서 확인

      return {
        success: true,
        messageId: groupId,
        groupId,
        cost: 10, // 알림톡 비용 (예상)
        fallbackToSms,
      }
    } catch (error) {
      console.error('[SolapiProvider.sendAlimtalk] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알림톡 발송 실패',
        errorCode: (error as any)?.code,
      }
    }
  }

  /**
   * 알림톡 대량 발송
   */
  async sendBulkAlimtalk(
    templateId: string,
    channelId: string,
    recipients: Array<{ to: string; variables?: Record<string, string> }>,
    options?: { disableSms?: boolean; senderPhone?: string }
  ): Promise<{
    success: boolean
    groupId?: string
    totalCount: number
    successCount: number
    failCount: number
  }> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SolapiProvider TEST MODE] sendBulkAlimtalk:', {
          templateId,
          channelId,
          recipients,
          options,
        })
        return {
          success: true,
          groupId: `TEST_BULK_GROUP_${Date.now()}`,
          totalCount: recipients.length,
          successCount: recipients.length,
          failCount: 0,
        }
      }

      const senderPhone = options?.senderPhone || this.config.senderPhone

      // 1. 그룹 생성 (returns groupId as string)
      const groupId = await this.messageService.createGroup()

      // 2. 메시지 배열 구성
      const messages = recipients.map((recipient) => ({
        to: this.sanitizePhoneNumber(recipient.to),
        from: this.sanitizePhoneNumber(senderPhone),
        type: 'ATA' as const,
        kakaoOptions: {
          pfId: channelId,
          templateId,
          disableSms: options?.disableSms ?? false,
          ...(recipient.variables && { variables: recipient.variables }),
        },
      }))

      // 3. 그룹에 메시지 추가
      await this.messageService.addMessagesToGroup(groupId, messages)

      // 4. 그룹 발송
      const response = await this.messageService.sendGroup(groupId)

      return {
        success: true,
        groupId: response.groupId,
        totalCount: response.count?.total || recipients.length,
        successCount: response.count?.registeredSuccess || 0,
        failCount: response.count?.registeredFailed || 0,
      }
    } catch (error) {
      console.error('[SolapiProvider.sendBulkAlimtalk] Error:', error)
      return {
        success: false,
        totalCount: recipients.length,
        successCount: 0,
        failCount: recipients.length,
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * 솔라피 템플릿 상태를 내부 상태로 매핑
   */
  private mapTemplateStatus(status: string): KakaoTemplateStatus {
    const statusMap: Record<string, KakaoTemplateStatus> = {
      PENDING: 'pending',
      INSPECTING: 'inspecting',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      SUSPENDED: 'suspended',
    }
    return statusMap[status?.toUpperCase()] || 'pending'
  }
}

/**
 * Provider 팩토리 함수
 */
export function createSolapiProvider(config?: Partial<SolapiConfig>): IMessageProvider {
  return new SolapiProvider(config)
}
