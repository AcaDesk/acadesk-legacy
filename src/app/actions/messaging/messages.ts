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
import { sendAlimtalk, sendMessage } from '@/lib/messaging/provider'
import { renderKakaoTemplatePreview } from '@/lib/kakao/kakao-variables'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 메시지 변수 치환 함수
 *
 * 지원 변수:
 * - {학생명}: 학생 이름
 * - {학생번호}: 학생 코드
 * - {학년}: 학년
 * - {학원명}: 학원 이름
 * - {보호자명}: 보호자 이름
 */
function replaceMessageVariables(
  template: string,
  variables: {
    studentName?: string
    studentCode?: string
    grade?: string
    academyName?: string
    guardianName?: string
  }
): string {
  let message = template

  if (variables.studentName) {
    message = message.replace(/\{학생명\}/g, variables.studentName)
  }
  if (variables.studentCode) {
    message = message.replace(/\{학생번호\}/g, variables.studentCode)
  }
  if (variables.grade) {
    message = message.replace(/\{학년\}/g, variables.grade)
  }
  if (variables.academyName) {
    message = message.replace(/\{학원명\}/g, variables.academyName)
  }
  if (variables.guardianName) {
    message = message.replace(/\{보호자명\}/g, variables.guardianName)
  }

  return message
}

function buildStudentMessageVariables(variables: {
  studentName: string
  studentCode: string
  grade: string
  academyName: string
  guardianName: string
}) {
  return {
    학생명: variables.studentName,
    학생번호: variables.studentCode,
    학년: variables.grade || '-',
    학원명: variables.academyName,
    보호자명: variables.guardianName,
  }
}

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
  message: z.string().optional().default(''),
  type: z.enum(['sms', 'lms', 'mms', 'kakao']),
  subject: z.string().optional(), // For LMS
  kakaoTemplateId: z.string().uuid().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'kakao') {
    if (!data.kakaoTemplateId) {
      ctx.addIssue({
        code: 'custom',
        message: '알림톡 발송에는 템플릿을 선택해야 합니다',
        path: ['kakaoTemplateId'],
      })
    }
    return
  }

  if (!data.message.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: '메시지 내용은 필수입니다',
      path: ['message'],
    })
  }
})

const directRecipientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '수신자 이름은 필수입니다'),
  phone: z.string().min(1, '수신자 전화번호는 필수입니다'),
  studentName: z.string().optional(),
})

const sendDirectMessagesSchema = z.object({
  recipients: z.array(directRecipientSchema).min(1, '최소 한 명의 수신자가 필요합니다'),
  message: z.string().optional().default(''),
  type: z.enum(['sms', 'lms', 'kakao']),
  subject: z.string().optional(),
  kakaoTemplateId: z.string().uuid().optional(),
  context: z.record(z.string(), z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'kakao') {
    if (!data.kakaoTemplateId) {
      ctx.addIssue({
        code: 'custom',
        message: '알림톡 발송에는 템플릿을 선택해야 합니다',
        path: ['kakaoTemplateId'],
      })
    }
    return
  }

  if (!data.message.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: '메시지 내용은 필수입니다',
      path: ['message'],
    })
  }
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
 * Create default sample templates
 */
export async function createDefaultTemplates() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const defaultTemplates = [
      {
        name: '출석 확인 알림',
        content: '안녕하세요 {보호자명}님, {학생명} 학생이 {학원명}에 출석하였습니다. 오늘도 즐거운 하루 보내세요!',
        type: 'sms' as const,
        category: 'attendance',
      },
      {
        name: '결석 안내',
        content: '안녕하세요 {보호자명}님, {학생명} 학생이 오늘 결석하였습니다. 혹시 특별한 사유가 있으신가요?',
        type: 'sms' as const,
        category: 'attendance',
      },
      {
        name: '월간 리포트 발송',
        content: '안녕하세요 {보호자명}님, {학생명} 학생의 이번 달 학습 리포트가 발송되었습니다. 확인 부탁드립니다.',
        type: 'sms' as const,
        category: 'report',
      },
      {
        name: '과제 미완료 안내',
        content: '{보호자명}님, {학생명} 학생의 이번 주 과제가 미완료 상태입니다. 확인 부탁드립니다.',
        type: 'sms' as const,
        category: 'todo',
      },
      {
        name: '수업 휴강 안내',
        content: '안녕하세요 {보호자명}님, {학원명}에서 알려드립니다. [날짜] 수업이 [사유]로 휴강됩니다. 양해 부탁드립니다.',
        type: 'sms' as const,
        category: 'event',
      },
      {
        name: '상담 일정 안내',
        content: '안녕하세요 {보호자명}님, {학생명} 학생과의 상담이 [날짜] [시간]에 예정되어 있습니다. 참석 부탁드립니다.',
        type: 'sms' as const,
        category: 'consultation',
      },
    ]

    const { data, error } = await supabase
      .from('message_templates')
      .insert(
        defaultTemplates.map(template => ({
          tenant_id: tenantId,
          ...template,
        }))
      )
      .select()

    if (error) throw error

    revalidatePath('/notifications')
    revalidatePath('/settings/message-templates')

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createDefaultTemplates] Error:', error)
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
    const { tenantId } = await verifyStaff()
    const validated = sendMessageSchema.parse(input)
    const supabase = createServiceRoleClient()
    let messageTemplate = validated.message

    if (validated.type === 'kakao' && validated.kakaoTemplateId && !messageTemplate.trim()) {
      const { data: template, error: templateError } = await supabase
        .from('kakao_alimtalk_templates')
        .select('content')
        .eq('id', validated.kakaoTemplateId)
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .is('deleted_at', null)
        .maybeSingle()

      if (templateError || !template) {
        throw new Error('승인된 알림톡 템플릿을 찾을 수 없습니다.')
      }

      messageTemplate = template.content
    }

    // Get academy info for template variables
    const { data: academy } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()

    const academyName = academy?.name || '학원'

    // Get student guardian information with student details
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        grade,
        users!inner (
          name
        ),
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
    type MessageLog = {
      tenant_id: string
      student_id: string
      session_id: null
      notification_type: string
      message: string
      subject: string | null
      status: string
      error_message: string | null
      sent_at: string
      kakao_template_id?: string
      fallback_type?: string
    }
    const logs: MessageLog[] = []

    type StudentWithGuardians = {
      id: string
      student_code: string
      grade: string | null
      users: { name: string } | null
      student_guardians: Array<{
        guardians: { users: { name: string; phone: string } | null } | null
      }>
    }

    // Process each student
    for (const student of students || []) {
      const typedStudent = student as unknown as StudentWithGuardians
      const studentName = typedStudent.users?.name || '학생'
      const studentCode = typedStudent.student_code || ''
      const grade = typedStudent.grade || ''

      // 대표 보호자(첫 번째)에게만 발송
      const guardians = typedStudent.student_guardians || []
      const primaryGuardian = guardians[0]

      if (!primaryGuardian?.guardians?.users) {
        failCount++
        logs.push({
          tenant_id: tenantId,
          student_id: typedStudent.id,
          session_id: null,
          notification_type: validated.type,
          message: validated.message,
          subject: validated.subject || null,
          status: 'failed',
          error_message: '보호자 정보가 없습니다',
          sent_at: new Date().toISOString(),
        })
        continue
      }

      const guardianUser = primaryGuardian.guardians.users
      const recipientPhone = guardianUser.phone
      const guardianName = guardianUser.name || '보호자'

      if (!recipientPhone) {
        failCount++
        logs.push({
          tenant_id: tenantId,
          student_id: typedStudent.id,
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

      // Replace template variables
      const variableMap = buildStudentMessageVariables({
        studentName,
        studentCode,
        grade,
        academyName,
        guardianName,
      })

      const personalizedMessage = validated.type === 'kakao'
        ? renderKakaoTemplatePreview(messageTemplate, variableMap)
        : replaceMessageVariables(validated.message, {
            studentName,
            studentCode,
            grade,
            academyName,
            guardianName,
          })

      const personalizedSubject = validated.subject
        ? replaceMessageVariables(validated.subject, {
            studentName,
            studentCode,
            grade,
            academyName,
            guardianName,
          })
        : undefined

      try {
        const result = validated.type === 'kakao'
          ? await sendAlimtalk({
              to: recipientPhone,
              templateId: validated.kakaoTemplateId!,
              variables: variableMap,
            })
          : await sendMessage({
              type: validated.type,
              to: recipientPhone,
              message: personalizedMessage,
              subject: personalizedSubject,
            })

        if (!result.success) {
          throw new Error(result.error || '발송 실패')
        }

        logs.push({
          tenant_id: tenantId,
          student_id: typedStudent.id,
          session_id: null,
          notification_type: validated.type,
          message: personalizedMessage,
          subject: personalizedSubject || null,
          status: 'sent',
          error_message: null,
          sent_at: new Date().toISOString(),
          ...(validated.type === 'kakao' && {
            kakao_template_id: validated.kakaoTemplateId,
            fallback_type: 'none',
          }),
        })

        successCount++
      } catch (error) {
        failCount++
        logs.push({
          tenant_id: tenantId,
          student_id: typedStudent.id,
          session_id: null,
          notification_type: validated.type,
          message: personalizedMessage,
          subject: personalizedSubject || null,
          status: 'failed',
          error_message: getErrorMessage(error),
          sent_at: new Date().toISOString(),
          ...(validated.type === 'kakao' && {
            kakao_template_id: validated.kakaoTemplateId,
            fallback_type: 'none',
          }),
        })
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

export async function sendDirectMessages(input: z.infer<typeof sendDirectMessagesSchema>) {
  try {
    const { tenantId } = await verifyStaff()
    const validated = sendDirectMessagesSchema.parse(input)
    const supabase = createServiceRoleClient()

    const { data: academy } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()

    const academyName = academy?.name || validated.context?.학원명 || '학원'
    let messageTemplate = validated.message

    if (validated.type === 'kakao' && validated.kakaoTemplateId && !messageTemplate.trim()) {
      const { data: template, error: templateError } = await supabase
        .from('kakao_alimtalk_templates')
        .select('content')
        .eq('id', validated.kakaoTemplateId)
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .is('deleted_at', null)
        .maybeSingle()

      if (templateError || !template) {
        throw new Error('승인된 알림톡 템플릿을 찾을 수 없습니다.')
      }

      messageTemplate = template.content
    }

    let successCount = 0
    let failCount = 0
    const logs: Array<{
      tenant_id: string
      student_id: null
      session_id: null
      notification_type: 'sms' | 'lms' | 'kakao'
      message: string
      subject: string | null
      status: 'sent' | 'failed'
      error_message: string | null
      sent_at: string
      kakao_template_id?: string
      fallback_type?: string
    }> = []

    for (const recipient of validated.recipients) {
      const variables = {
        학원명: academyName,
        보호자명: recipient.name,
        학생명: recipient.studentName || validated.context?.학생명 || validated.context?.학생이름 || '',
        ...validated.context,
      }

      const message = validated.type === 'kakao'
        ? renderKakaoTemplatePreview(messageTemplate, variables)
        : replaceMessageVariables(validated.message, {
            studentName: variables.학생명,
            academyName,
            guardianName: recipient.name,
          })

      try {
        const result = validated.type === 'kakao'
          ? await sendAlimtalk({
              to: recipient.phone,
              templateId: validated.kakaoTemplateId!,
              variables,
            })
          : await sendMessage({
              type: validated.type,
              to: recipient.phone,
              message,
              subject: validated.subject,
            })

        if (!result.success) {
          throw new Error(result.error || '발송 실패')
        }

        successCount++
        logs.push({
          tenant_id: tenantId,
          student_id: null,
          session_id: null,
          notification_type: validated.type,
          message,
          subject: validated.subject || null,
          status: 'sent',
          error_message: null,
          sent_at: new Date().toISOString(),
          ...(validated.type === 'kakao' && {
            kakao_template_id: validated.kakaoTemplateId,
            fallback_type: 'none',
          }),
        })
      } catch (error) {
        failCount++
        logs.push({
          tenant_id: tenantId,
          student_id: null,
          session_id: null,
          notification_type: validated.type,
          message,
          subject: validated.subject || null,
          status: 'failed',
          error_message: getErrorMessage(error),
          sent_at: new Date().toISOString(),
          ...(validated.type === 'kakao' && {
            kakao_template_id: validated.kakaoTemplateId,
            fallback_type: 'none',
          }),
        })
      }
    }

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
    console.error('[sendDirectMessages] Error:', error)
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

    type ReportWithGuardians = {
      students: {
        student_guardians: Array<{
          guardians: { users: { name: string; phone: string } | null } | null
        }>
      } | null
    }
    const typedReport = report as unknown as ReportWithGuardians

    // Send to all guardians
    const guardians = typedReport.students?.student_guardians || []
    let successCount = 0
    let failCount = 0

    for (const sg of guardians) {
      const guardianUser = sg.guardians?.users
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

    const typedStudents = todo.students as unknown as { users: { name: string; phone: string } | null } | null
    const studentUser = typedStudents?.users

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
