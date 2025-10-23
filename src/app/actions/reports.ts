/**
 * Report Management Server Actions
 *
 * 리포트 생성 및 전송 Server Actions
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { ReportType } from '@/domain/entities/Report'
import { MessageChannel } from '@/domain/messaging/IMessageProvider'
import { GenerateStudentReportUseCase } from '@/application/use-cases/report/GenerateStudentReportUseCase'
import { SendReportUseCase } from '@/application/use-cases/report/SendReportUseCase'
import { ReportRepository } from '@/infrastructure/database/report.repository'
import { MessageLogRepository } from '@/infrastructure/database/message-log.repository'
import { SupabaseDataSource } from '@/infrastructure/data-sources/SupabaseDataSource'

// ============================================================================
// Validation Schemas
// ============================================================================

const generateReportSchema = z.object({
  studentId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['student_monthly', 'student_exam']),
  comment: z.string().optional(),
})

const sendReportSchema = z.object({
  reportId: z.string().uuid(),
  channel: z.enum(['sms', 'lms', 'kakao', 'email']),
  recipientName: z.string().min(1),
  recipientContact: z.string().min(1), // phone or email
  academyName: z.string().optional(),
  academyPhone: z.string().optional(),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 학생 리포트 생성
 *
 * @param input - 리포트 생성 파라미터
 * @returns Success or error
 */
export async function generateStudentReport(input: z.infer<typeof generateReportSchema>) {
  try {
    // 1. Validate input
    const validated = generateReportSchema.parse(input)

    // 2. Verify authentication and get tenant
    const { tenantId, userId } = await verifyStaff()

    // 3. Create service_role client
    const serviceClient = createServiceRoleClient()
    const dataSource = new SupabaseDataSource(serviceClient)

    // 4. Create repositories and use case
    const reportRepository = new ReportRepository(dataSource)
    const useCase = new GenerateStudentReportUseCase(reportRepository, dataSource)

    // 5. Execute use case
    const report = await useCase.execute({
      studentId: validated.studentId,
      startDate: validated.startDate,
      endDate: validated.endDate,
      type: validated.type as ReportType,
      generatedBy: userId,
      tenantId,
      comment: validated.comment,
    })

    // 6. Revalidate pages
    revalidatePath('/students')
    revalidatePath(`/students/${validated.studentId}`)

    return {
      success: true,
      error: null,
      data: {
        reportId: report.id,
        message: '리포트가 생성되었습니다',
      },
    }
  } catch (error) {
    console.error('[generateStudentReport] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      data: null,
    }
  }
}

/**
 * 리포트 전송 (SMS, LMS, 카카오톡, 이메일)
 *
 * @param input - 전송 파라미터
 * @returns Success or error
 */
export async function sendReport(input: z.infer<typeof sendReportSchema>) {
  try {
    // 1. Validate input
    const validated = sendReportSchema.parse(input)

    // 2. Verify authentication and get tenant
    const { tenantId, userId } = await verifyStaff()

    // 3. Create service_role client
    const serviceClient = createServiceRoleClient()
    const dataSource = new SupabaseDataSource(serviceClient)

    // 4. Create repositories and use case
    const reportRepository = new ReportRepository(dataSource)
    const messageLogRepository = new MessageLogRepository(dataSource)
    const useCase = new SendReportUseCase(reportRepository, messageLogRepository)

    // 5. Execute use case
    const response = await useCase.execute({
      reportId: validated.reportId,
      channel: validated.channel as MessageChannel,
      recipientName: validated.recipientName,
      recipientContact: validated.recipientContact,
      tenantId,
      senderId: userId,
      academyName: validated.academyName,
      academyPhone: validated.academyPhone,
    })

    return {
      success: response.success,
      error: response.error || null,
      data: response.success
        ? {
            messageId: response.messageId,
            cost: response.cost,
            message: '리포트가 전송되었습니다',
          }
        : null,
    }
  } catch (error) {
    console.error('[sendReport] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      data: null,
    }
  }
}

/**
 * 리포트 생성 + 전송 (원스톱)
 *
 * @param input - 생성 및 전송 파라미터
 * @returns Success or error
 */
export async function generateAndSendReport(
  input: z.infer<typeof generateReportSchema> & Omit<z.infer<typeof sendReportSchema>, 'reportId'>
) {
  try {
    // 1. Generate report
    const generateResult = await generateStudentReport({
      studentId: input.studentId,
      startDate: input.startDate,
      endDate: input.endDate,
      type: input.type,
      comment: input.comment,
    })

    if (!generateResult.success || !generateResult.data) {
      return generateResult
    }

    // 2. Send report
    const sendResult = await sendReport({
      reportId: generateResult.data.reportId,
      channel: input.channel,
      recipientName: input.recipientName,
      recipientContact: input.recipientContact,
      academyName: input.academyName,
      academyPhone: input.academyPhone,
    })

    return {
      success: sendResult.success,
      error: sendResult.error,
      data: {
        reportId: generateResult.data.reportId,
        messageId: sendResult.data?.messageId,
        cost: sendResult.data?.cost,
        message: '리포트가 생성 및 전송되었습니다',
      },
    }
  } catch (error) {
    console.error('[generateAndSendReport] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      data: null,
    }
  }
}

/**
 * 학생별 리포트 이력 조회
 *
 * @param studentId - 학생 ID
 * @returns 리포트 목록
 */
export async function getStudentReports(studentId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Query reports
    const { data, error } = await serviceClient
      .from('reports')
      .select('id, type, data, created_at')
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return {
      success: true,
      error: null,
      data: data || [],
    }
  } catch (error) {
    console.error('[getStudentReports] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      data: null,
    }
  }
}

/**
 * 메시지 전송 이력 조회
 *
 * @param studentId - 학생 ID (선택)
 * @param limit - 조회 개수
 * @returns 메시지 전송 이력
 */
export async function getMessageLogs(studentId?: string, limit: number = 50) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Query message logs
    let query = serviceClient
      .from('message_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (studentId) {
      query = query.eq('metadata->>studentId', studentId)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      error: null,
      data: data || [],
    }
  } catch (error) {
    console.error('[getMessageLogs] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      data: null,
    }
  }
}
