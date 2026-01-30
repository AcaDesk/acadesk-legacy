/**
 * Book Lending Server Actions
 *
 * 도서 대출 관련 모든 작업은 이 Server Action을 통해 실행됩니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { withServerAction, withServerActionVoid } from '@/lib/server-action-helpers'

export interface BookLending {
  id: string
  borrowed_at: string
  due_date: string
  returned_at: string | null
  notes: string | null
  reminder_sent_at: string | null
  books: {
    title: string
    author: string | null
    barcode: string | null
  } | null
  students: {
    id: string
    student_code: string
    users: {
      name: string
    } | null
  } | null
}

export interface BookLendingStats {
  total: number
  active: number
  overdue: number
  returned: number
}

/**
 * 도서 대출 목록 조회
 * @returns 대출 목록
 */
export async function getBookLendings() {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      const { data, error } = await serviceClient
        .from('book_lendings')
        .select(`
          id,
          borrowed_at,
          due_date,
          returned_at,
          notes,
          reminder_sent_at,
          books (
            title,
            author,
            barcode
          ),
          students (
            id,
            student_code,
            users (name)
          )
        `)
        .eq('tenant_id', tenantId)
        .order('borrowed_at', { ascending: false })

      if (error) throw error
      return (data || []) as unknown as BookLending[]
    },
    { actionName: 'getBookLendings', defaultValue: [] as BookLending[] }
  )
}

/**
 * 도서 반납 처리
 * @param lendingId - 대출 ID
 * @returns 성공 여부
 */
export async function returnBook(lendingId: string) {
  return withServerActionVoid(
    async ({ tenantId, serviceClient }) => {
      const { error } = await serviceClient
        .from('book_lendings')
        .update({
          returned_at: new Date().toISOString().split('T')[0],
          return_condition: 'good',
        })
        .eq('id', lendingId)
        .eq('tenant_id', tenantId)

      if (error) throw error

      revalidatePath('/library/lendings')
    },
    { actionName: 'returnBook' }
  )
}

/**
 * 반납 알림 전송
 * @param lending - 대출 정보
 * @returns 성공 여부
 */
export async function sendReminder(lending: BookLending) {
  return withServerActionVoid(
    async ({ tenantId, serviceClient }) => {
      // Log the reminder
      await serviceClient.from('notification_logs').insert({
        tenant_id: tenantId,
        student_id: lending.students?.id,
        notification_type: 'sms',
        status: 'sent',
        message: `${lending.books?.title} 도서 반납일(${lending.due_date})이 도래했습니다.`,
        sent_at: new Date().toISOString(),
      })

      // Update reminder_sent_at
      const { error } = await serviceClient
        .from('book_lendings')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', lending.id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      revalidatePath('/library/lendings')
    },
    { actionName: 'sendReminder' }
  )
}

/**
 * 연체 도서 일괄 알림 전송
 * @param lendings - 연체 대출 목록
 * @returns 성공 여부
 */
export async function sendBulkReminder(lendings: BookLending[]) {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      let sentCount = 0

      for (const lending of lendings) {
        try {
          await serviceClient.from('notification_logs').insert({
            tenant_id: tenantId,
            student_id: lending.students?.id,
            notification_type: 'sms',
            status: 'sent',
            message: `${lending.books?.title} 도서 반납일(${lending.due_date})이 지났습니다. 반납 부탁드립니다.`,
            sent_at: new Date().toISOString(),
          })

          await serviceClient
            .from('book_lendings')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', lending.id)
            .eq('tenant_id', tenantId)

          sentCount++
        } catch {
          console.error(`Failed to send reminder for lending ${lending.id}`)
        }
      }

      revalidatePath('/library/lendings')
      return sentCount
    },
    { actionName: 'sendBulkReminder', defaultValue: 0 }
  )
}
