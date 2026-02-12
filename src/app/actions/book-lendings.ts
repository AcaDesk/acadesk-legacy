/**
 * Book Lending Server Actions
 *
 * 도서 대출 관련 모든 작업은 이 Server Action을 통해 실행됩니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { withServerAction, withServerActionVoid } from '@/lib/server-action-helpers'

export interface BookLending {
  id: string
  borrowed_at: string
  due_date: string
  returned_at: string | null
  notes: string | null
  reminder_sent_at: string | null
  textbooks: {
    title: string
    author: string | null
    barcode: string | null
    total_copies?: number
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

export interface BulkLendingResult {
  totalCount: number
  successCount: number
  failedCount: number
  results: Array<{
    textbookId: string
    textbookTitle: string
    success: boolean
    error?: string
    lendingId?: string
  }>
}

const createBookLendingSchema = z.object({
  studentId: z.string().uuid(),
  textbookId: z.string().uuid(),
  borrowedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
})

const createBulkBookLendingSchema = z.object({
  studentId: z.string().uuid(),
  items: z
    .array(
      z.object({
        textbookId: z.string().uuid(),
        borrowedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(50),
})

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
          textbooks (
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
 * 대출 등록 폼에 필요한 학생/교재 목록 조회
 */
export async function getBookLendingFormOptions() {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      const [{ data: students, error: studentsError }, { data: textbooks, error: textbooksError }] =
        await Promise.all([
          serviceClient
            .from('students')
            .select('id, student_code, name, users(name)')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .order('student_code', { ascending: true }),
          serviceClient
            .from('textbooks')
            .select('id, title, author, barcode, is_active, total_copies')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .eq('is_active', true)
            .order('title', { ascending: true }),
        ])

      if (studentsError) throw studentsError
      if (textbooksError) throw textbooksError

      const activeLendingsResult = await serviceClient
        .from('book_lendings')
        .select('textbook_id')
        .eq('tenant_id', tenantId)
        .is('returned_at', null)

      if (activeLendingsResult.error) throw activeLendingsResult.error

      const activeCountByTextbookId = new Map<string, number>()
      for (const row of activeLendingsResult.data || []) {
        const textbookId = row.textbook_id as string
        activeCountByTextbookId.set(
          textbookId,
          (activeCountByTextbookId.get(textbookId) || 0) + 1
        )
      }

      const studentOptions = (students || []).map((student) => ({
        id: student.id as string,
        studentCode: student.student_code as string,
        name:
          ((student.users as { name?: string } | null)?.name ||
            (student.name as string) ||
            '이름 없음'),
      }))

      const textbookOptions = (textbooks || []).map((textbook) => ({
        id: textbook.id as string,
        title: textbook.title as string,
        author: (textbook.author as string | null) || null,
        barcode: (textbook.barcode as string | null) || null,
        totalCopies: (textbook.total_copies as number | null) || 1,
        activeLendingCount: activeCountByTextbookId.get(textbook.id as string) || 0,
        availableCopies: Math.max(
          ((textbook.total_copies as number | null) || 1) -
            (activeCountByTextbookId.get(textbook.id as string) || 0),
          0
        ),
        isAvailable:
          ((textbook.total_copies as number | null) || 1) -
            (activeCountByTextbookId.get(textbook.id as string) || 0) >
          0,
      }))

      return {
        students: studentOptions,
        textbooks: textbookOptions,
      }
    },
    {
      actionName: 'getBookLendingFormOptions',
      defaultValue: { students: [], textbooks: [] },
    }
  )
}

/**
 * 도서 대출 등록
 */
export async function createBookLending(input: z.infer<typeof createBookLendingSchema>) {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      const validated = createBookLendingSchema.parse(input)

      if (validated.dueDate < validated.borrowedAt) {
        throw new Error('반납 예정일은 대출일 이후여야 합니다.')
      }

      const [studentResult, textbookResult, activeLendingResult] = await Promise.all([
        serviceClient
          .from('students')
          .select('id')
          .eq('id', validated.studentId)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .single(),
        serviceClient
          .from('textbooks')
          .select('id, is_active, total_copies')
          .eq('id', validated.textbookId)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .single(),
        serviceClient
          .from('book_lendings')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('textbook_id', validated.textbookId)
          .is('returned_at', null),
      ])

      if (studentResult.error || !studentResult.data) {
        throw new Error('유효한 학생을 찾을 수 없습니다.')
      }
      if (textbookResult.error || !textbookResult.data) {
        throw new Error('유효한 교재를 찾을 수 없습니다.')
      }
      if (!textbookResult.data.is_active) {
        throw new Error('비활성 교재는 대출할 수 없습니다.')
      }
      if (activeLendingResult.error) {
        throw activeLendingResult.error
      }
      const totalCopies = (textbookResult.data.total_copies as number | null) || 1
      const activeCount = (activeLendingResult.data || []).length
      if (activeCount >= totalCopies) {
        throw new Error(
          `대여 가능한 재고가 없습니다. (보유 ${totalCopies}권 / 대여중 ${activeCount}권)`
        )
      }

      const { data, error } = await serviceClient
        .from('book_lendings')
        .insert({
          tenant_id: tenantId,
          student_id: validated.studentId,
          textbook_id: validated.textbookId,
          borrowed_at: validated.borrowedAt,
          due_date: validated.dueDate,
          notes: validated.notes?.trim() || null,
        })
        .select('id')
        .single()

      if (error) throw error

      revalidatePath('/library/lendings')
      revalidatePath('/library')
      return { id: data.id as string }
    },
    {
      actionName: 'createBookLending',
      defaultValue: { id: '' },
    }
  )
}

/**
 * 도서 대출 일괄 등록 (1학생 + N교재)
 */
export async function createBulkBookLending(
  input: z.infer<typeof createBulkBookLendingSchema>
) {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      const validated = createBulkBookLendingSchema.parse(input)

      // 1. 학생 검증 (공통 1회)
      const { data: student, error: studentError } = await serviceClient
        .from('students')
        .select('id')
        .eq('id', validated.studentId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single()

      if (studentError || !student) {
        throw new Error('유효한 학생을 찾을 수 없습니다.')
      }

      // 2. 교재 일괄 조회
      const textbookIds = [...new Set(validated.items.map((item) => item.textbookId))]
      const { data: textbooksData, error: textbooksError } = await serviceClient
        .from('textbooks')
        .select('id, title, is_active, total_copies')
        .in('id', textbookIds)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      if (textbooksError) throw textbooksError

      const textbookMap = new Map(
        (textbooksData || []).map((t) => [t.id as string, t])
      )

      // 3. 대출 중 건수 일괄 조회
      const { data: activeLendings, error: activeLendingsError } = await serviceClient
        .from('book_lendings')
        .select('textbook_id')
        .in('textbook_id', textbookIds)
        .eq('tenant_id', tenantId)
        .is('returned_at', null)

      if (activeLendingsError) throw activeLendingsError

      const activeCountMap = new Map<string, number>()
      for (const lending of activeLendings || []) {
        const id = lending.textbook_id as string
        activeCountMap.set(id, (activeCountMap.get(id) || 0) + 1)
      }

      // 4. 항목별 순차 처리 (배치 내 소진 추적)
      const batchConsumed = new Map<string, number>()
      const results: BulkLendingResult['results'] = []

      for (const item of validated.items) {
        const textbook = textbookMap.get(item.textbookId)
        const title = (textbook?.title as string) || '알 수 없는 교재'

        try {
          if (item.dueDate < item.borrowedAt) {
            throw new Error('반납 예정일은 대출일 이후여야 합니다.')
          }

          if (!textbook) {
            throw new Error('유효한 교재를 찾을 수 없습니다.')
          }
          if (!textbook.is_active) {
            throw new Error('비활성 교재는 대출할 수 없습니다.')
          }

          const totalCopies = (textbook.total_copies as number | null) || 1
          const dbActiveCount = activeCountMap.get(item.textbookId) || 0
          const consumed = batchConsumed.get(item.textbookId) || 0
          const effectiveActive = dbActiveCount + consumed

          if (effectiveActive >= totalCopies) {
            throw new Error(
              `대여 가능한 재고가 없습니다. (보유 ${totalCopies}권 / 대여중 ${effectiveActive}권)`
            )
          }

          const { data, error } = await serviceClient
            .from('book_lendings')
            .insert({
              tenant_id: tenantId,
              student_id: validated.studentId,
              textbook_id: item.textbookId,
              borrowed_at: item.borrowedAt,
              due_date: item.dueDate,
              notes: item.notes?.trim() || null,
            })
            .select('id')
            .single()

          if (error) throw error

          batchConsumed.set(item.textbookId, consumed + 1)

          results.push({
            textbookId: item.textbookId,
            textbookTitle: title,
            success: true,
            lendingId: data.id as string,
          })
        } catch (error) {
          results.push({
            textbookId: item.textbookId,
            textbookTitle: title,
            success: false,
            error:
              error instanceof Error
                ? error.message
                : '알 수 없는 오류가 발생했습니다.',
          })
        }
      }

      revalidatePath('/library/lendings')
      revalidatePath('/library')

      const successCount = results.filter((r) => r.success).length
      const result: BulkLendingResult = {
        totalCount: results.length,
        successCount,
        failedCount: results.length - successCount,
        results,
      }
      return result
    },
    {
      actionName: 'createBulkBookLending',
      defaultValue: {
        totalCount: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
      } as BulkLendingResult,
    }
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
          textbooks (title),
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

      const book = lending.textbooks as unknown as { title: string } | null
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
          textbooks (title),
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
        const book = lending.textbooks as unknown as { title: string } | null
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
