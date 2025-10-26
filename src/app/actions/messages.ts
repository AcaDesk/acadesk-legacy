/**
 * Message Server Actions
 *
 * 메시지 전송 및 템플릿 관리를 위한 Server Actions
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { sendMessage } from '@/lib/messaging/provider'

// ============================================================================
// Validation Schemas
// ============================================================================

const messageTemplateSchema = z.object({
  name: z.string().min(1, '템플릿 이름은 필수입니다'),
  content: z.string().min(1, '메시지 내용은 필수입니다'),
  type: z.enum(['sms']), // Email removed - SMS/알림톡 only
  category: z.enum(['general', 'report', 'todo', 'attendance', 'event', 'payment', 'consultation']),
})

const sendMessageSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, '최소 한 명의 학생을 선택해야 합니다'),
  message: z.string().min(1, '메시지 내용은 필수입니다'),
  type: z.enum(['sms', 'lms', 'mms']), // SMS, LMS, MMS only (no email, no 알림톡)
  subject: z.string().optional(), // For LMS
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get all message templates
 */
export async function getMessageTemplates() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getMessageTemplates] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create a message template
 */
export async function createMessageTemplate(
  input: z.infer<typeof messageTemplateSchema>
) {
  try {
    const { tenantId } = await verifyStaff()
    const validated = messageTemplateSchema.parse(input)
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        tenant_id: tenantId,
        name: validated.name,
        content: validated.content,
        type: validated.type,
        category: validated.category,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/notifications')
    revalidatePath('/settings/message-templates')

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createMessageTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update a message template
 */
export async function updateMessageTemplate(
  id: string,
  input: Partial<z.infer<typeof messageTemplateSchema>>
) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('message_templates')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/notifications')
    revalidatePath('/settings/message-templates')

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateMessageTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete a message template
 */
export async function deleteMessageTemplate(id: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('message_templates')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw error

    revalidatePath('/notifications')
    revalidatePath('/settings/message-templates')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[deleteMessageTemplate] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Send messages to students
 */
export async function sendMessages(input: z.infer<typeof sendMessageSchema>) {
  try {
    const { tenantId, userId } = await verifyStaff()
    const validated = sendMessageSchema.parse(input)
    const supabase = createServiceRoleClient()

    // Get student guardian information
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        student_guardians (
          guardians (
            users (
              name,
              phone
            )
          )
        )
      `)
      .in('id', validated.studentIds)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (studentsError) throw studentsError

    let successCount = 0
    let failCount = 0
    const logs: any[] = []

    // Process each student
    for (const student of students || []) {
      // Send to guardians
      const guardians = student.student_guardians || []

      for (const sg of guardians) {
        const guardian = sg.guardians as any
        const guardianUser = guardian?.users as { name: string; phone: string } | null
        if (!guardianUser) continue

        const recipientPhone = guardianUser.phone

        if (!recipientPhone) {
          failCount++
          logs.push({
            tenant_id: tenantId,
            student_id: student.id,
            session_id: null,
            notification_type: validated.type,
            message: validated.message,
            subject: validated.subject || null,
            status: 'failed',
            error_message: '보호자 전화번호 정보가 없습니다',
            sent_at: new Date().toISOString(),
          })
          continue
        }

        try {
          // 실제 SMS/LMS/MMS 발송
          const result = await sendMessage({
            type: validated.type,
            to: recipientPhone,
            message: validated.message,
            subject: validated.subject,
          })

          if (!result.success) {
            throw new Error(result.error || '발송 실패')
          }

          logs.push({
            tenant_id: tenantId,
            student_id: student.id,
            session_id: null,
            notification_type: validated.type,
            message: validated.message,
            subject: validated.subject || null,
            status: 'sent',
            error_message: null,
            sent_at: new Date().toISOString(),
          })

          successCount++
        } catch (error) {
          failCount++
          logs.push({
            tenant_id: tenantId,
            student_id: student.id,
            session_id: null,
            notification_type: validated.type,
            message: validated.message,
            subject: validated.subject || null,
            status: 'failed',
            error_message: getErrorMessage(error),
            sent_at: new Date().toISOString(),
          })
        }
      }
    }

    // Save notification logs
    if (logs.length > 0) {
      await supabase.from('notification_logs').insert(logs)
    }

    revalidatePath('/notifications')

    return {
      success: true,
      data: {
        successCount,
        failCount,
        total: successCount + failCount,
      },
      error: null,
    }
  } catch (error) {
    console.error('[sendMessages] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Send report notification
 */
export async function sendReportNotification(reportId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get report details
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        id,
        student_id,
        report_type,
        period_start,
        period_end,
        students (
          student_guardians (
            guardians (
              users (
                name,
                phone
              )
            )
          )
        )
      `)
      .eq('id', reportId)
      .eq('tenant_id', tenantId)
      .single()

    if (reportError || !report) throw new Error('리포트를 찾을 수 없습니다')

    // Create notification message
    const message = `새로운 학습 리포트가 생성되었습니다. 자녀의 학습 현황을 확인해주세요.`

    // Type assertion for student data
    const reportWithStudent = report as any

    // Send to all guardians
    const guardians = reportWithStudent.students?.student_guardians || []
    let successCount = 0
    let failCount = 0

    for (const sg of guardians) {
      const guardian = sg.guardians as any
      const guardianUser = guardian?.users as { phone: string } | null
      if (!guardianUser?.phone) {
        failCount++
        continue
      }

      try {
        // SMS 발송 (리포트 알림)
        const result = await sendMessage({
          type: 'sms',
          to: guardianUser.phone,
          message,
        })

        if (result.success) {
          successCount++
        } else {
          throw new Error(result.error || '발송 실패')
        }
      } catch (error) {
        console.error('[sendReportNotification] Send error:', error)
        failCount++
      }
    }

    // Update report sent_at
    if (successCount > 0) {
      await supabase
        .from('reports')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', reportId)
    }

    return {
      success: true,
      data: { successCount, failCount },
      error: null,
    }
  } catch (error) {
    console.error('[sendReportNotification] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Send todo reminder
 */
export async function sendTodoReminder(todoId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get todo details
    const { data: todo, error: todoError } = await supabase
      .from('student_todos')
      .select(`
        id,
        title,
        due_date,
        student_id,
        students (
          users (
            name,
            phone
          )
        )
      `)
      .eq('id', todoId)
      .eq('tenant_id', tenantId)
      .single()

    if (todoError || !todo) throw new Error('과제를 찾을 수 없습니다')

    const dueDate = new Date(todo.due_date).toLocaleDateString('ko-KR')
    const message = `[과제 알림] ${todo.title} - 마감: ${dueDate}`

    // Type assertion for todo with student data
    const todoWithStudent = todo as any
    const studentUser = todoWithStudent.students?.users as { name: string; phone: string } | null

    // Send SMS to student
    if (studentUser?.phone) {
      // 실제 SMS 발송
      const result = await sendMessage({
        type: 'sms',
        to: studentUser.phone,
        message,
      })

      // Log notification
      await supabase.from('notification_logs').insert({
        tenant_id: tenantId,
        student_id: todo.student_id,
        session_id: null,
        notification_type: 'sms',
        message,
        subject: null,
        status: result.success ? 'sent' : 'failed',
        error_message: result.success ? null : (result.error || '발송 실패'),
        sent_at: new Date().toISOString(),
      })
    }

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[sendTodoReminder] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get message history
 */
export async function getMessageHistory(filters?: {
  limit?: number
  startDate?: string
  endDate?: string
  type?: 'SMS' | 'LMS' | 'MMS'
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get messaging config
    const { data: config } = await supabase
      .from('tenant_messaging_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (!config) {
      return {
        success: false,
        data: null,
        error: '활성화된 메시징 서비스가 없습니다',
      }
    }

    // Create provider and get messages (currently only Solapi supports this)
    if (config.provider === 'solapi') {
      const { SolapiProvider } = await import('@/infra/messaging/SolapiProvider')
      const provider = new SolapiProvider({
        apiKey: config.solapi_api_key || '',
        apiSecret: config.solapi_api_secret || '',
        senderPhone: config.solapi_sender_phone || '',
      })

      const result = await provider.getMessages(filters)

      return {
        success: true,
        data: result,
        error: null,
      }
    }

    return {
      success: false,
      data: null,
      error: '현재 프로바이더는 메시지 이력 조회를 지원하지 않습니다',
    }
  } catch (error) {
    console.error('[getMessageHistory] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get message statistics
 */
export async function getMessageStatistics(filters?: {
  startDate?: string
  endDate?: string
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get messaging config
    const { data: config } = await supabase
      .from('tenant_messaging_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (!config) {
      return {
        success: false,
        data: null,
        error: '활성화된 메시징 서비스가 없습니다',
      }
    }

    // Create provider and get statistics (currently only Solapi supports this)
    if (config.provider === 'solapi') {
      const { SolapiProvider } = await import('@/infra/messaging/SolapiProvider')
      const provider = new SolapiProvider({
        apiKey: config.solapi_api_key || '',
        apiSecret: config.solapi_api_secret || '',
        senderPhone: config.solapi_sender_phone || '',
      })

      const result = await provider.getStatistics(filters?.startDate, filters?.endDate)

      return {
        success: true,
        data: result,
        error: null,
      }
    }

    return {
      success: false,
      data: null,
      error: '현재 프로바이더는 통계 조회를 지원하지 않습니다',
    }
  } catch (error) {
    console.error('[getMessageStatistics] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
