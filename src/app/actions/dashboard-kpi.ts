/**
 * Dashboard KPI Period Stats Server Action
 *
 * 기간별 KPI 통계를 조회합니다 (오늘 / 이번 주 / 이번 달).
 */

'use server'

import { unstable_cache } from 'next/cache'
import { verifyStaffPermission } from '@/lib/auth/service-role-helpers'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getTodayKST } from '@/lib/utils'
import type { DashboardStats } from '@/core/types/dashboard'

export type KPIPeriod = 'today' | 'week' | 'month'

export interface KPIStatsResult {
  success: boolean
  error?: string
  stats?: DashboardStats
}

/**
 * 기간별 KPI 통계 조회 (캐시: 5분 TTL, key=(tenantId, period, today))
 *
 * today를 키에 포함시켜 자정 경계에서 자동으로 새 캐시 entry로 분기됩니다.
 */
export async function getKPIStatsByPeriod(period: KPIPeriod): Promise<KPIStatsResult> {
  try {
    const permissionResult = await verifyStaffPermission()
    if (!permissionResult.success || !permissionResult.data) {
      return { success: false, error: permissionResult.error || '권한이 없습니다.' }
    }

    const { tenant_id: tenantId } = permissionResult.data
    const today = getTodayKST()

    return unstable_cache(
      () => computeKPIStats(tenantId, period, today),
      ['kpi-stats', tenantId, period, today],
      { revalidate: 300, tags: [`kpi:${tenantId}`] }
    )()
  } catch (error) {
    console.error('[getKPIStatsByPeriod] Error:', error)
    return { success: false, error: '데이터 조회 중 오류가 발생했습니다.' }
  }
}

async function computeKPIStats(
  tenantId: string,
  period: KPIPeriod,
  today: string
): Promise<KPIStatsResult> {
  try {
    const supabase = createServiceRoleClient()

    // 기간별 시작 날짜 계산
    let startDate: string
    if (period === 'today') {
      startDate = today
    } else if (period === 'week') {
      const d = new Date(today + 'T00:00:00+09:00')
      d.setDate(d.getDate() - 6)
      startDate = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
    } else {
      const [year, month] = today.split('-').map(Number)
      startDate = `${year}-${String(month).padStart(2, '0')}-01`
    }

    const thirtyDaysAgo = new Date(today + 'T00:00:00+09:00')
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [studentsResult, attendanceResult, avgScoreResult, completionRateResult] = await Promise.allSettled([
      // 전체 학생 수
      supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),

      // 기간 내 출석 데이터
      supabase
        .from('attendance')
        .select('student_id, status')
        .eq('tenant_id', tenantId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', today),

      // 기간 내 시험 점수
      supabase
        .from('exam_scores')
        .select('percentage')
        .eq('tenant_id', tenantId)
        .gte('created_at', `${startDate}T00:00:00+09:00`)
        .lte('created_at', `${today}T23:59:59+09:00`)
        .is('deleted_at', null),

      // 기간 내 할 일 완료율
      supabase
        .from('student_todos')
        .select('id, completed_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', `${startDate}T00:00:00+09:00`)
        .lte('created_at', `${today}T23:59:59+09:00`)
        .is('deleted_at', null),
    ])

    const totalStudents = studentsResult.status === 'fulfilled'
      ? (studentsResult.value.count ?? 0)
      : 0

    // 출석률 계산
    let todayAttendance = 0
    if (attendanceResult.status === 'fulfilled' && attendanceResult.value.data) {
      const records = attendanceResult.value.data
      const uniqueStudents = new Set(
        records
          .filter((r: { status: string }) => r.status === 'present' || r.status === 'late')
          .map((r: { student_id: string }) => r.student_id)
      )
      todayAttendance = uniqueStudents.size
    }

    // 평균 성적 계산
    let averageScore = 0
    if (
      avgScoreResult.status === 'fulfilled' &&
      avgScoreResult.value.data &&
      avgScoreResult.value.data.length > 0
    ) {
      const scores = avgScoreResult.value.data.map((s: { percentage: number }) => s.percentage || 0)
      averageScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
    }

    // 완료율 계산
    let completionRate = 0
    if (
      completionRateResult.status === 'fulfilled' &&
      completionRateResult.value.data &&
      completionRateResult.value.data.length > 0
    ) {
      const todos = completionRateResult.value.data
      const completed = todos.filter((t: { completed_at: string | null }) => t.completed_at !== null).length
      completionRate = Math.round((completed / todos.length) * 100)
    }

    return {
      success: true,
      stats: {
        totalStudents,
        activeClasses: 0,
        todayAttendance,
        pendingTodos: 0,
        totalReports: 0,
        unsentReports: 0,
        averageScore,
        completionRate,
      },
    }
  } catch (error) {
    console.error('[computeKPIStats] Error:', error)
    return { success: false, error: '데이터 조회 중 오류가 발생했습니다.' }
  }
}
