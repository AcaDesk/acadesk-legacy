/**
 * Student Points & Activity Server Actions
 *
 * 학생 상벌점 및 활동 로그 관련 Server Actions
 * (students.ts에서 분리됨)
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { withServerAction, withServerActionVoid } from '@/lib/server-action-helpers'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Types
// ============================================================================

export interface PointType {
  code: string
  label: string
  category: 'reward' | 'penalty'
  default_points: number
  description: string | null
  sort_order: number
}

export interface PointHistoryEntry {
  id: string
  point_type: string
  point_label: string
  points: number
  reason: string | null
  awarded_date: string
  awarded_by_name: string | null
  created_at: string
}

// ============================================================================
// Point Types (reference data)
// ============================================================================

/**
 * 상벌점 유형 목록 조회 (활성 유형만)
 */
export async function getPointTypes() {
  return withServerAction(
    async ({ serviceClient }) => {
      const { data, error } = await serviceClient
        .from('ref_point_types')
        .select('code, label, category, default_points, description, sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data || []) as PointType[]
    },
    { actionName: 'getPointTypes', defaultValue: [] as PointType[] }
  )
}

// ============================================================================
// Point Balance
// ============================================================================

/**
 * 학생 상벌점 잔액 조회
 *
 * @param studentId - 학생 ID
 * @returns 포인트 잔액 (상점 합계 - 벌점 합계)
 */
export async function getStudentPointBalance(studentId: string) {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      const { data, error } = await serviceClient
        .from('student_points')
        .select('points')
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      if (error) throw error

      const balance = (data || []).reduce((sum, row) => sum + (row.points ?? 0), 0)
      return balance
    },
    { actionName: 'getStudentPointBalance', defaultValue: 0 }
  )
}

// ============================================================================
// Point History
// ============================================================================

/**
 * 학생 상벌점 이력 조회
 *
 * @param studentId - 학생 ID
 * @param limit - 조회할 최대 개수 (기본: 20)
 * @returns 상벌점 이력 배열
 */
export async function getStudentPointHistory(studentId: string, limit = 20) {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      const { data, error } = await serviceClient
        .from('student_points')
        .select(`
          id,
          point_type,
          points,
          reason,
          awarded_date,
          created_at,
          ref_point_types ( label ),
          users ( name )
        `)
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('awarded_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const history: PointHistoryEntry[] = (data || []).map((row) => {
        const pointType = row.ref_point_types as { label: string } | { label: string }[] | null
        const awardedBy = row.users as { name: string } | { name: string }[] | null
        const pointTypeRow = Array.isArray(pointType) ? pointType[0] : pointType
        const awardedByRow = Array.isArray(awardedBy) ? awardedBy[0] : awardedBy

        return {
          id: row.id,
          point_type: row.point_type,
          point_label: pointTypeRow?.label ?? row.point_type,
          points: row.points,
          reason: row.reason,
          awarded_date: row.awarded_date,
          awarded_by_name: awardedByRow?.name ?? null,
          created_at: row.created_at,
        }
      })

      return history
    },
    { actionName: 'getStudentPointHistory', defaultValue: [] as PointHistoryEntry[] }
  )
}

// ============================================================================
// Mutations
// ============================================================================

const awardPointSchema = z.object({
  studentId: z.string().uuid(),
  pointType: z.string().min(1),
  points: z.number().int().optional(),
  reason: z.string().trim().max(500).optional(),
  awardedDate: z.string().optional(),
})

export type AwardPointInput = z.infer<typeof awardPointSchema>

/**
 * 학생에게 상벌점 부여
 *
 * points를 지정하지 않으면 유형의 기본 점수를 사용합니다.
 */
export async function awardStudentPoints(input: AwardPointInput) {
  return withServerActionVoid(
    async ({ tenantId, userId, serviceClient }) => {
      const validated = awardPointSchema.parse(input)

      // 유형 검증 및 기본 점수 조회
      const { data: pointType, error: typeError } = await serviceClient
        .from('ref_point_types')
        .select('code, default_points')
        .eq('code', validated.pointType)
        .eq('active', true)
        .maybeSingle()

      if (typeError) throw typeError
      if (!pointType) {
        throw new Error('유효하지 않은 상벌점 유형입니다')
      }

      const points = validated.points ?? pointType.default_points

      const { error } = await serviceClient.from('student_points').insert({
        tenant_id: tenantId,
        student_id: validated.studentId,
        point_type: validated.pointType,
        points,
        reason: validated.reason || null,
        awarded_by: userId,
        awarded_date: validated.awardedDate || new Date().toISOString().split('T')[0],
      })

      if (error) throw error

      revalidatePath(`/students/${validated.studentId}`)
    },
    { actionName: 'awardStudentPoints' }
  )
}

/**
 * 상벌점 기록 삭제 (soft delete)
 */
export async function deleteStudentPoint(pointId: string, studentId: string) {
  return withServerActionVoid(
    async ({ tenantId, serviceClient }) => {
      const { error } = await serviceClient
        .from('student_points')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', pointId)
        .eq('tenant_id', tenantId)

      if (error) throw error

      revalidatePath(`/students/${studentId}`)
    },
    { actionName: 'deleteStudentPoint' }
  )
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
