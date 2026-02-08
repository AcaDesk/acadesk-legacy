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

/** KST 기준 오늘 날짜 문자열 (YYYY-MM-DD) */
function getKSTDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
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
          returned_at: getKSTDateString(),
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
 * 반납 알림 전송 (서버에서 대출 정보를 재조회하여 무결성 보장)
 * @param lendingId - 대출 ID
 * @returns 성공 여부
 */
export async function sendReminder(lendingId: string) {
  return withServerActionVoid(
    async ({ tenantId, serviceClient }) => {
      // 서버에서 대출 정보 재조회 (클라이언트 데이터 불신)
      const { data: lending, error: fetchError } = await serviceClient
        .from('book_lendings')
        .select(`
          id, due_date, returned_at,
          books (title),
          students (id)
        `)
        .eq('id', lendingId)
        .eq('tenant_id', tenantId)
        .single()

      if (fetchError || !lending) {
        throw new Error('대출 정보를 찾을 수 없습니다.')
      }

      if (lending.returned_at) {
        throw new Error('이미 반납된 도서입니다.')
      }

      const book = lending.books as unknown as { title: string } | null
      const student = lending.students as unknown as { id: string } | null

      // Log the reminder
      const { error: logError } = await serviceClient.from('notification_logs').insert({
        tenant_id: tenantId,
        student_id: student?.id,
        notification_type: 'sms',
        status: 'sent',
        message: `${book?.title} 도서 반납일(${lending.due_date})이 도래했습니다.`,
        sent_at: new Date().toISOString(),
      })

      if (logError) throw logError

      // Update reminder_sent_at
      const { error: updateError } = await serviceClient
        .from('book_lendings')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', lendingId)
        .eq('tenant_id', tenantId)

      if (updateError) throw updateError

      revalidatePath('/library/lendings')
    },
    { actionName: 'sendReminder' }
  )
}

/**
 * 연체 도서 일괄 알림 전송 (서버에서 대출 정보를 재조회하여 무결성 보장)
 * @param lendingIds - 대출 ID 목록
 * @returns 전송 성공 건수
 */
export async function sendBulkReminder(lendingIds: string[]) {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      // 서버에서 대출 정보 일괄 재조회
      const { data: lendings, error: fetchError } = await serviceClient
        .from('book_lendings')
        .select(`
          id, due_date, returned_at, reminder_sent_at,
          books (title),
          students (id)
        `)
        .in('id', lendingIds)
        .eq('tenant_id', tenantId)

      if (fetchError) throw fetchError

      const today = getKSTDateString()
      // 서버에서 연체 + 미반납 + 미알림 조건 재검증
      const overdueLendings = (lendings || []).filter(
        (l) => !l.returned_at && l.due_date < today && !l.reminder_sent_at
      )

      let sentCount = 0

      for (const lending of overdueLendings) {
        const book = lending.books as unknown as { title: string } | null
        const student = lending.students as unknown as { id: string } | null

        const { error: logError } = await serviceClient.from('notification_logs').insert({
          tenant_id: tenantId,
          student_id: student?.id,
          notification_type: 'sms',
          status: 'sent',
          message: `${book?.title} 도서 반납일(${lending.due_date})이 지났습니다. 반납 부탁드립니다.`,
          sent_at: new Date().toISOString(),
        })

        if (logError) {
          console.error(`Failed to insert notification log for lending ${lending.id}:`, logError)
          continue
        }

        const { error: updateError } = await serviceClient
          .from('book_lendings')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', lending.id)
          .eq('tenant_id', tenantId)

        if (updateError) {
          console.error(`Failed to update reminder_sent_at for lending ${lending.id}:`, updateError)
          continue
        }

        sentCount++
      }

      revalidatePath('/library/lendings')
      return sentCount
    },
    { actionName: 'sendBulkReminder', defaultValue: 0 }
  )
}
