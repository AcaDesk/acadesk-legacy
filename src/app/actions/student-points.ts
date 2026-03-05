/**
 * Student Points & Activity Server Actions
 *
 * 학생 포인트 및 활동 로그 관련 Server Actions
 * (students.ts에서 분리됨)
 *
 * TODO: 포인트 시스템 구현 시 실제 테이블 쿼리로 변경 필요
 */

'use server'

import { verifyStaff } from '@/lib/auth/verify-permission'
import { verifyStaffPermission } from '@/lib/auth/service-role-helpers'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Point Balance
// ============================================================================

/**
 * 학생 포인트 잔액 조회
 *
 * ✅ Service Role 기반 구현 (RPC 대체)
 *
 * TODO: 포인트 시스템 구현 시 실제 테이블 쿼리로 변경 필요
 * 현재는 placeholder 로직 (0 반환)
 *
 * @param studentId - 학생 ID
 * @returns 포인트 잔액 또는 에러
 */
export async function getStudentPointBalance(studentId: string) {
  const requestId = crypto.randomUUID()

  try {
    console.log('[getStudentPointBalance] Request started:', {
      requestId,
      studentId,
    })

    // 1. Verify permissions
    const permissionResult = await verifyStaffPermission()
    if (!permissionResult.success || !permissionResult.data) {
      return {
        success: false,
        data: null,
        error: permissionResult.error || '권한이 없습니다.',
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tenant_id: _tenant_id } = permissionResult.data

    // 2. Service role로 포인트 조회
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _serviceClient = createServiceRoleClient()

    // TODO: 실제 구현 시 student_points 테이블에서 조회
    // const { data: pointsData } = await _serviceClient
    //   .from('student_points')
    //   .select('points')
    //   .eq('student_id', studentId)
    //   .eq('tenant_id', _tenant_id)
    //   .order('created_at', { ascending: false })
    //   .limit(1)
    //   .maybeSingle()

    // Placeholder: 항상 0 반환
    const balance = 0

    console.log('[getStudentPointBalance] Request completed:', {
      requestId,
      balance,
    })

    return {
      success: true,
      data: balance,
      error: null,
    }
  } catch (error) {
    console.error('[getStudentPointBalance] Error:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Point History
// ============================================================================

/**
 * 학생 포인트 이력 조회
 *
 * ✅ Service Role 기반 구현 (RPC 대체)
 *
 * TODO: 포인트 시스템 구현 시 실제 테이블 쿼리로 변경 필요
 * 현재는 placeholder 로직 (빈 배열 반환)
 *
 * @param studentId - 학생 ID
 * @param limit - 조회할 최대 개수 (기본: 20)
 * @returns 포인트 이력 배열 또는 에러
 */
export async function getStudentPointHistory(studentId: string, limit = 20) {
  const requestId = crypto.randomUUID()

  try {
    console.log('[getStudentPointHistory] Request started:', {
      requestId,
      studentId,
      limit,
    })

    // 1. Verify permissions
    const permissionResult = await verifyStaffPermission()
    if (!permissionResult.success || !permissionResult.data) {
      return {
        success: false,
        data: null,
        error: permissionResult.error || '권한이 없습니다.',
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tenant_id: _tenant_id } = permissionResult.data

    // 2. Service role로 포인트 이력 조회
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _serviceClient = createServiceRoleClient()

    // TODO: 실제 구현 시 student_point_history 테이블에서 조회
    // const { data: historyData } = await _serviceClient
    //   .from('student_point_history')
    //   .select(`
    //     id,
    //     point_type,
    //     point_label,
    //     points,
    //     reason,
    //     awarded_date,
    //     awarded_by_name,
    //     created_at
    //   `)
    //   .eq('student_id', studentId)
    //   .eq('tenant_id', _tenant_id)
    //   .order('awarded_date', { ascending: false })
    //   .limit(limit)

    // Placeholder: 빈 배열 반환
    const history: never[] = []

    console.log('[getStudentPointHistory] Request completed:', {
      requestId,
      count: history.length,
    })

    return {
      success: true,
      data: history,
      error: null,
    }
  } catch (error) {
    console.error('[getStudentPointHistory] Error:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Activity Logs
// ============================================================================

/**
 * Get student activity logs
 *
 * @param studentId - Student ID
 * @param limit - Number of logs to return (default: 50)
 * @returns List of activity logs or error
 */
export async function getStudentActivityLogs(studentId: string, limit = 50) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Query activity logs with activity type information
    const { data, error } = await supabase
      .from('student_activity_logs')
      .select(`
        *,
        ref_activity_types (
          label,
          icon,
          color
        )
      `)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getStudentActivityLogs] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
