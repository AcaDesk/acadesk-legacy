/**
 * Support Ticket Server Actions
 *
 * 문의, 버그 제보, 피드백 관련 서버 액션
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Resend } from 'resend'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Validation Schemas
// ============================================================================

const createTicketSchema = z.object({
  ticket_type: z.enum(['inquiry', 'bug_report', 'feedback']),
  category: z.string().optional(),
  subject: z.string().min(1, '제목은 필수입니다'),
  message: z.string().min(1, '내용은 필수입니다'),

  // 버그 제보 전용
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  page: z.string().optional(),
  steps_to_reproduce: z.string().optional(),
  browser: z.string().optional(),
})

// ============================================================================
// Email notification
// ============================================================================

const typeLabels: Record<string, string> = {
  inquiry: '문의',
  bug_report: '버그 제보',
  feedback: '피드백',
}

const severityLabels: Record<string, string> = {
  critical: '심각',
  high: '높음',
  medium: '보통',
  low: '낮음',
}

async function sendTicketNotification(
  ticket: z.infer<typeof createTicketSchema>,
  userEmail: string,
  userName: string,
) {
  const apiKey = process.env.RESEND_API_KEY
  const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL
  if (!apiKey || !notifyEmail) return

  const resend = new Resend(apiKey)
  const typeLabel = typeLabels[ticket.ticket_type] || ticket.ticket_type

  const details = [
    `유형: ${typeLabel}`,
    ticket.category ? `카테고리: ${ticket.category}` : null,
    ticket.severity ? `심각도: ${severityLabels[ticket.severity] || ticket.severity}` : null,
    ticket.page ? `발생 페이지: ${ticket.page}` : null,
    `제출자: ${userName} (${userEmail})`,
    '',
    `제목: ${ticket.subject}`,
    '',
    ticket.message,
    ticket.steps_to_reproduce ? `\n재현 방법:\n${ticket.steps_to_reproduce}` : null,
    ticket.browser ? `\n브라우저: ${ticket.browser}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    await resend.emails.send({
      from: 'Acadesk <noreply@acadesk.kr>',
      to: notifyEmail,
      subject: `[${typeLabel}] ${ticket.subject}`,
      text: details,
    })
  } catch (err) {
    // 이메일 실패해도 티켓 생성은 성공으로 처리
    console.error('Support notification email failed:', err)
  }
}

// ============================================================================
// Actions
// ============================================================================

/**
 * 문의/버그 제보/피드백 티켓 생성
 */
export async function createSupportTicket(
  data: z.infer<typeof createTicketSchema>
) {
  try {
    const { tenantId, userId, email, name } = await verifyStaff()
    const validated = createTicketSchema.parse(data)
    const supabase = createServiceRoleClient()

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        ticket_type: validated.ticket_type,
        category: validated.category || null,
        subject: validated.subject,
        message: validated.message,
        severity: validated.severity || null,
        page: validated.page || null,
        steps_to_reproduce: validated.steps_to_reproduce || null,
        browser: validated.browser || null,
      })
      .select('id')
      .single()

    if (error) throw error

    // 이메일 알림 (비동기, 실패해도 무시)
    sendTicketNotification(validated, email ?? '', name ?? '')

    revalidatePath('/help/inquiries')

    return { success: true, data: { id: ticket.id } }
  } catch (error) {
    console.error('createSupportTicket error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * 내 문의 내역 조회
 */
export async function getSupportTickets() {
  try {
    const { userId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: tickets ?? [] }
  } catch (error) {
    console.error('getSupportTickets error:', error)
    return { success: false, error: getErrorMessage(error), data: [] }
  }
}
