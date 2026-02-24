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
import type { ReportWithStudent } from '@/core/types/report.types'

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

    if (options?.limit) {
      query = query.limit(options.limit)
    }

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
