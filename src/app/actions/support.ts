/**
 * Support Ticket Server Actions
 *
 * 문의, 버그 제보, 피드백 관련 서버 액션
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
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
// Actions
// ============================================================================

/**
 * 문의/버그 제보/피드백 티켓 생성
 */
export async function createSupportTicket(
  data: z.infer<typeof createTicketSchema>
) {
  try {
    const { tenantId, userId } = await verifyStaff()
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
