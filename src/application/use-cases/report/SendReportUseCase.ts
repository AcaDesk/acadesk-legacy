/**
 * Send Report Use Case - Application Layer
 *
 * 리포트 전송 (SMS, LMS, 카카오톡, 이메일 등)
 */

import { Report } from '@/domain/entities/Report'
import { IReportRepository } from '@/domain/repositories/IReportRepository'
import { IMessageLogRepository } from '@/domain/repositories/IMessageLogRepository'
import {
  IMessageProvider,
  MessageChannel,
  SendMessageRequest,
  SendMessageResponse,
  DeliveryStatus,
} from '@/domain/messaging/IMessageProvider'
import { getMessageProvider } from '@/infrastructure/messaging/MessageProviderFactory'
import { PDFGenerator } from '@/infrastructure/pdf/PDFGenerator'
import { NotFoundError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

export interface SendReportParams {
  reportId: string
  channel: MessageChannel
  recipientName: string
  recipientContact: string // phone or email
  tenantId: string
  senderId: string
  includePDF?: boolean // PDF 첨부 여부 (추후 구현)
  academyName?: string
  academyPhone?: string
}

/**
 * 리포트 전송 Use Case
 */
export class SendReportUseCase {
  constructor(
    private reportRepository: IReportRepository,
    private messageLogRepository: IMessageLogRepository
  ) {}

  async execute(params: SendReportParams): Promise<SendMessageResponse> {
    try {
      // 1. Report 조회
      const report = await this.reportRepository.findById(params.reportId)
      if (!report) {
        throw new NotFoundError('리포트')
      }

      // 2. 메시지 Provider 가져오기
      const provider = getMessageProvider(params.channel)

      // 3. 메시지 컨텐츠 생성
      const content = this.prepareMessageContent(report, params.channel)

      // 4. 메시지 전송
      const sendRequest: SendMessageRequest = {
        channel: params.channel,
        recipient: {
          name: params.recipientName,
          phone: params.channel === MessageChannel.SMS || params.channel === MessageChannel.LMS
            ? params.recipientContact
            : undefined,
          email: params.channel === MessageChannel.EMAIL
            ? params.recipientContact
            : undefined,
        },
        content,
        metadata: {
          tenantId: params.tenantId,
          studentId: report.studentId || undefined,
          reportId: report.id,
          senderId: params.senderId,
        },
      }

      const response = await provider.send(sendRequest)

      // 5. 메시지 로그 저장
      await this.messageLogRepository.create({
        tenantId: params.tenantId,
        channel: params.channel,
        provider: provider.name,
        recipientName: params.recipientName,
        recipientContact: params.recipientContact,
        messageSubject: content.subject,
        messageBody: content.body,
        messageId: response.messageId,
        status: response.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
        cost: response.cost,
        errorMessage: response.error,
        metadata: {
          studentId: report.studentId || undefined,
          reportId: report.id,
          senderId: params.senderId,
        },
        sentAt: response.success ? new Date() : undefined,
        failedAt: !response.success ? new Date() : undefined,
      })

      return response
    } catch (error) {
      logError(error, {
        useCase: 'SendReportUseCase',
        reportId: params.reportId,
        channel: params.channel,
      })

      // 실패 로그 저장
      await this.messageLogRepository.create({
        tenantId: params.tenantId,
        channel: params.channel,
        provider: 'Unknown',
        recipientName: params.recipientName,
        recipientContact: params.recipientContact,
        messageBody: '',
        status: DeliveryStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
        metadata: {
          reportId: params.reportId,
          senderId: params.senderId,
        },
        failedAt: new Date(),
      })

      throw error
    }
  }

  /**
   * 채널별 메시지 컨텐츠 준비
   * 전략: 링크형 메시지 (핵심 지표 + 리포트 링크)
   */
  private prepareMessageContent(report: Report, channel: MessageChannel) {
    // 환경변수에서 base URL 가져오기 (없으면 기본값)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://acadesk.site'

    switch (channel) {
      case MessageChannel.SMS:
        return {
          body: report.toSMSMessage(baseUrl),
        }

      case MessageChannel.LMS:
        return {
          subject: `[${report.data.academyName || 'Acadesk'}] ${report.data.studentName} 학습 리포트`,
          body: report.toLinkMessage(baseUrl),
        }

      case MessageChannel.KAKAO:
        // 카카오톡도 링크형으로 전환
        return {
          body: report.toLinkMessage(baseUrl),
          templateId: 'student_report', // 카카오톡 템플릿 ID
          variables: report.toKakaoVariables(),
        }

      case MessageChannel.EMAIL:
        // 이메일은 HTML 리포트 + 링크 하이브리드
        return {
          subject: `[${report.data.academyName || 'Acadesk'}] ${report.data.studentName} 학습 리포트`,
          body: report.toEmailHTML(),
        }

      default:
        return {
          body: report.toLinkMessage(baseUrl),
        }
    }
  }

  /**
   * PDF 생성 및 첨부 (추후 구현)
   */
  private async generatePDFAttachment(
    report: Report,
    academyName?: string,
    academyPhone?: string
  ) {
    const pdfBuffer = await PDFGenerator.generateReportPDF(report, {
      academyName,
      academyPhone,
    })

    const filename = PDFGenerator.generateFilename(report)

    // TODO: PDF를 Supabase Storage에 업로드하고 URL 반환
    // const pdfUrl = await this.uploadPDF(pdfBuffer, filename)

    return {
      filename,
      url: '', // Supabase Storage URL
    }
  }
}
