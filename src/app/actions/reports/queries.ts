/**
 * Report Management Server Actions
 *
 * 리포트 CRUD 및 조회 Server Actions
 * 생성 로직은 reports/report-generation.ts 로 분리
 * 헬퍼 함수는 reports/report-helpers.ts 로 분리
 */

'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import type { ReportWithStudent, ReportSend, ReportRead } from '@/core/types/report.types'

// ============================================================================
// Report List Queries
// ============================================================================
//
// 생성 관련 Server Actions:
//   import { generateWeeklyReport, ... } from '@/app/actions/reports/report-generation'
// 헬퍼 함수:
//   import { ... } from '@/app/actions/reports/report-helpers'
//

/**
 * Get all reports with filters
 *
 * @param options - Filter options
 * @returns Report list or error
 */
export async function getReports(options?: {
  studentId?: string
  reportType?: string
  limit?: number
  period?: 'this_month' | 'last_month' | 'last_3_months' | 'all'
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('reports')
      .select(`
        id,
        report_type,
        period_start,
        period_end,
        content,
        generated_at,
        sent_at,
        students!inner (
          id,
          student_code,
          grade,
          users:user_id!inner (
            name,
            email
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .order('generated_at', { ascending: false })

    if (options?.studentId && options.studentId !== 'all') {
      query = query.eq('student_id', options.studentId)
    }

    if (options?.reportType && options.reportType !== 'all') {
      query = query.eq('report_type', options.reportType)
    }

    const now = new Date()
    const period = options?.period ?? 'this_month'
    if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      query = query.gte('generated_at', start)
    } else if (period === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      query = query.gte('generated_at', start).lt('generated_at', end)
    } else if (period === 'last_3_months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()
      query = query.gte('generated_at', start)
    }
    // 'all' → no date filter

    // period='all' 무제한 조회 방지 — 명시 limit이 없으면 상한 500 적용
    query = query.limit(options?.limit ?? 500)

    const { data, error } = await query

    if (error) {
      throw error
    }

    return {
      success: true as const,
      data: (data || []) as unknown as ReportWithStudent[],
      error: null,
    }
  } catch (error) {
    console.error('[getReports] Error:', error)
    return {
      success: false as const,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 단일 리포트 상세 + 발송/열람 이력 병렬 조회
 *
 * 클라이언트 측에서 RLS 정책이 부족해 직접 조회 시 빈 결과/에러가 발생하므로
 * service_role 로 한번에 묶어 반환.
 */
export async function getReportDetail(reportId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const [reportResult, sendsResult, readsResult] = await Promise.all([
      supabase
        .from('reports')
        .select(`
          id,
          report_type,
          period_start,
          period_end,
          content,
          generated_at,
          sent_at,
          students (
            id,
            student_code,
            grade,
            users (
              name,
              email
            )
          )
        `)
        .eq('id', reportId)
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      supabase
        .from('report_sends')
        .select(`
          id,
          recipient_name,
          recipient_phone,
          message_type,
          send_status,
          sent_at,
          send_error
        `)
        .eq('report_id', reportId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('sent_at', { ascending: false, nullsFirst: false }),
      supabase
        .from('report_reads')
        .select('id, report_send_id, user_type, read_at, pdf_downloaded, pdf_downloaded_at')
        .eq('report_id', reportId)
        .eq('tenant_id', tenantId)
        .order('read_at', { ascending: true }),
    ])

    if (reportResult.error) throw reportResult.error
    if (!reportResult.data) {
      throw new Error('리포트를 찾을 수 없습니다')
    }

    return {
      success: true as const,
      data: {
        report: reportResult.data as unknown as ReportWithStudent,
        sends: (sendsResult.data || []) as ReportSend[],
        reads: (readsResult.data || []) as ReportRead[],
      },
      error: null,
    }
  } catch (error) {
    console.error('[getReportDetail] Error:', error)
    return {
      success: false as const,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get students list for report filtering
 *
 * @returns Students list or error
 */
export async function getStudentsForFilter() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('students')
      .select('id, student_code, user_id!inner(name)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('student_code')

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getStudentsForFilter] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 리포트 단건 삭제
 *
 * @param reportId - 삭제할 리포트 ID
 * @returns Success or error
 */
export async function deleteReport(
  reportId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .eq('tenant_id', tenantId)

    if (error) throw error

    revalidatePath('/reports')

    return { success: true, error: null }
  } catch (error) {
    console.error('[deleteReport] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * 리포트 일괄 삭제
 *
 * @param reportIds - 삭제할 리포트 ID 배열
 * @returns Success or error
 */
export async function deleteReports(
  reportIds: string[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (reportIds.length === 0) {
      return { success: true, error: null }
    }

    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('reports')
      .delete()
      .in('id', reportIds)
      .eq('tenant_id', tenantId)

    if (error) throw error

    revalidatePath('/reports')

    return { success: true, error: null }
  } catch (error) {
    console.error('[deleteReports] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}
