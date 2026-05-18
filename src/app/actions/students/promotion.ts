'use server'

import { revalidatePath } from 'next/cache'
import { verifyRole, verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

/**
 * 진급 후보 학생 조회 (활성 학생 전체)
 */
export async function getPromotionCandidates() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('students')
      .select('id, users!inner(name), grade, school')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('grade', { ascending: true })

    if (error) throw error

    const candidates = (data || []).map((s) => ({
      id: s.id,
      name: (s.users as unknown as { name: string })?.name || '이름 없음',
      grade: s.grade as string | null,
      school: s.school as string | null,
    }))

    return { success: true, data: candidates, error: null }
  } catch (error) {
    console.error('[getPromotionCandidates] Error:', error)
    return { success: false, data: null, error: getErrorMessage(error) }
  }
}

/**
 * 진급 실행 (학생 업데이트 + 변경 로그 기록)
 */
export async function executePromotion(
  changes: Array<{
    studentId: string
    studentName: string
    currentGrade: string | null
    nextGrade: string | null
    currentSchool: string | null
    nextSchool: string | null
    category: string
  }>,
  batchId: string
) {
  try {
    // 진급 일괄 처리는 학년·학교 정보를 대량 변경하는 작업이므로 owner/instructor 만 허용
    const { tenantId, userId } = await verifyRole(['owner', 'instructor'])
    const supabase = createServiceRoleClient()
    const now = new Date().toISOString()

    const results: Array<{ studentId: string; success: boolean; error?: string }> = []

    // 학생별 업데이트 + 로그 기록
    await Promise.all(
      changes.map(async (change) => {
        try {
          // 1. 학생 grade/school 업데이트
          const updateFields: Record<string, string | null> = { updated_at: now }
          if (change.nextGrade !== change.currentGrade) {
            updateFields.grade = change.nextGrade
          }
          if (change.nextSchool !== change.currentSchool) {
            updateFields.school = change.nextSchool
          }

          const { error: updateError } = await supabase
            .from('students')
            .update(updateFields)
            .eq('id', change.studentId)
            .eq('tenant_id', tenantId)

          if (updateError) throw updateError

          // 2. 변경 로그 기록
          const logEntries: Array<{
            tenant_id: string
            student_id: string
            change_type: string
            field_name: string
            old_value: string | null
            new_value: string | null
            batch_id: string
            changed_by: string
            changed_at: string
          }> = []

          if (change.nextGrade !== change.currentGrade) {
            logEntries.push({
              tenant_id: tenantId,
              student_id: change.studentId,
              change_type: change.category,
              field_name: 'grade',
              old_value: change.currentGrade,
              new_value: change.nextGrade,
              batch_id: batchId,
              changed_by: userId,
              changed_at: now,
            })
          }

          if (change.nextSchool !== change.currentSchool) {
            logEntries.push({
              tenant_id: tenantId,
              student_id: change.studentId,
              change_type: change.category,
              field_name: 'school',
              old_value: change.currentSchool,
              new_value: change.nextSchool,
              batch_id: batchId,
              changed_by: userId,
              changed_at: now,
            })
          }

          if (logEntries.length > 0) {
            const { error: logError } = await supabase
              .from('student_change_logs')
              .insert(logEntries)

            if (logError) {
              console.error(`[executePromotion] Log insert error for ${change.studentId}:`, logError)
            }
          }

          results.push({ studentId: change.studentId, success: true })
        } catch (err) {
          console.error(`[executePromotion] Failed for ${change.studentId}:`, err)
          results.push({ studentId: change.studentId, success: false, error: getErrorMessage(err) })
        }
      })
    )

    revalidatePath('/students')

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return {
      success: true,
      data: { results, successCount, failCount },
      error: null,
    }
  } catch (error) {
    console.error('[executePromotion] Error:', error)
    return { success: false, data: null, error: getErrorMessage(error) }
  }
}

/**
 * 특정 학생의 변경 이력 조회 (최근 50건)
 */
export async function getStudentChangeLogs(studentId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('student_change_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .order('changed_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('[getStudentChangeLogs] Error:', error)
    return { success: false, data: null, error: getErrorMessage(error) }
  }
}
