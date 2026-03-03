/**
 * Dashboard Drilldown Data Server Action
 *
 * KPI 카드 클릭 시 상세 데이터를 조회합니다.
 */

'use server'

import { verifyStaffPermission } from '@/lib/auth/service-role-helpers'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getTodayKST } from '@/lib/utils'
import type { KPIPeriod } from './dashboard-kpi'

export type DrilldownWidgetId =
  | 'kpi-total-students'
  | 'kpi-attendance-rate'
  | 'kpi-average-score'
  | 'kpi-completion-rate'

export interface ClassStudentCount {
  class_name: string
  student_count: number
}

export interface StudentCompletionRate {
  student_name: string
  completed: number
  total: number
  rate: number
}

export interface StudentAttendance {
  student_name: string
  grade: string
  status: 'present' | 'late' | 'absent' | 'no-record'
}

export interface ExamScoreEntry {
  student_name: string
  average_score: number
  exam_count: number
}

export interface DrilldownData {
  widgetId: DrilldownWidgetId
  // kpi-total-students
  classCounts?: ClassStudentCount[]
  newStudentsCount?: number
  // kpi-attendance-rate
  attendanceList?: StudentAttendance[]
  // kpi-average-score
  scoreList?: ExamScoreEntry[]
  // kpi-completion-rate
  completionList?: StudentCompletionRate[]
}

export interface DrilldownDataResult {
  success: boolean
  error?: string
  data?: DrilldownData
}

export async function getDrilldownData(
  widgetId: DrilldownWidgetId,
  period: KPIPeriod = 'today'
): Promise<DrilldownDataResult> {
  try {
    const permissionResult = await verifyStaffPermission()
    if (!permissionResult.success || !permissionResult.data) {
      return { success: false, error: permissionResult.error || '권한이 없습니다.' }
    }

    const { tenant_id: tenantId } = permissionResult.data
    const supabase = createServiceRoleClient()
    const today = getTodayKST()

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

    if (widgetId === 'kpi-total-students') {
      const [classesResult, enrollmentsResult, newStudentsResult] = await Promise.allSettled([
        supabase
          .from('classes')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .order('name'),

        supabase
          .from('class_enrollments')
          .select('class_id')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .is('deleted_at', null),

        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .gte('created_at', `${startDate}T00:00:00+09:00`)
          .is('deleted_at', null),
      ])

      const classes = classesResult.status === 'fulfilled' ? classesResult.value.data || [] : []
      const enrollments = enrollmentsResult.status === 'fulfilled' ? enrollmentsResult.value.data || [] : []
      const newStudentsCount = newStudentsResult.status === 'fulfilled'
        ? (newStudentsResult.value.count ?? 0)
        : 0

      const countByClass = new Map<string, number>()
      for (const e of enrollments as { class_id: string }[]) {
        countByClass.set(e.class_id, (countByClass.get(e.class_id) || 0) + 1)
      }

      const classCounts: ClassStudentCount[] = (classes as { id: string; name: string }[])
        .map(c => ({ class_name: c.name, student_count: countByClass.get(c.id) || 0 }))
        .sort((a, b) => b.student_count - a.student_count)

      return { success: true, data: { widgetId, classCounts, newStudentsCount } }
    }

    if (widgetId === 'kpi-attendance-rate') {
      const [studentsResult, attendanceResult] = await Promise.allSettled([
        supabase
          .from('students')
          .select('id, grade, users!inner(name)')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .limit(50),

        supabase
          .from('attendance')
          .select('student_id, status')
          .eq('tenant_id', tenantId)
          .gte('attendance_date', startDate)
          .lte('attendance_date', today),
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const students: any[] = studentsResult.status === 'fulfilled' ? studentsResult.value.data || [] : []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attendanceRecords: any[] = attendanceResult.status === 'fulfilled' ? attendanceResult.value.data || [] : []

      // 학생별 출석 상태 집계
      const attendanceByStudent = new Map<string, string>()
      for (const r of attendanceRecords) {
        // 같은 학생의 최근 상태 중 present > late > absent 우선
        const current = attendanceByStudent.get(r.student_id)
        if (!current || (current === 'absent' && r.status !== 'absent') || r.status === 'present') {
          attendanceByStudent.set(r.student_id, r.status)
        }
      }

      const attendanceList: StudentAttendance[] = students
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          student_name: (s.users as any)?.name || 'Unknown',
          grade: s.grade || '',
          status: (attendanceByStudent.get(s.id) || 'no-record') as StudentAttendance['status'],
        }))
        .sort((a: StudentAttendance, b: StudentAttendance) => {
          const order: Record<string, number> = { absent: 0, 'no-record': 1, late: 2, present: 3 }
          return (order[a.status] || 0) - (order[b.status] || 0)
        })

      return { success: true, data: { widgetId, attendanceList } }
    }

    if (widgetId === 'kpi-average-score') {
      const scoresResult = await supabase
        .from('exam_scores')
        .select('percentage, students!inner(users!inner(name))')
        .eq('tenant_id', tenantId)
        .gte('created_at', `${startDate}T00:00:00+09:00`)
        .lte('created_at', `${today}T23:59:59+09:00`)
        .is('deleted_at', null)
        .limit(200)

      const scoresByStudent = new Map<string, { total: number; count: number }>()
      if (scoresResult.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const s of scoresResult.data as any[]) {
          const name = s.students?.users?.name || 'Unknown'
          const entry = scoresByStudent.get(name) || { total: 0, count: 0 }
          entry.total += s.percentage || 0
          entry.count++
          scoresByStudent.set(name, entry)
        }
      }

      const scoreList: ExamScoreEntry[] = Array.from(scoresByStudent.entries())
        .map(([student_name, { total, count }]) => ({
          student_name,
          average_score: Math.round(total / count),
          exam_count: count,
        }))
        .sort((a, b) => b.average_score - a.average_score)
        .slice(0, 15)

      return { success: true, data: { widgetId, scoreList } }
    }

    if (widgetId === 'kpi-completion-rate') {
      const todosResult = await supabase
        .from('student_todos')
        .select('completed_at, students!inner(users!inner(name))')
        .eq('tenant_id', tenantId)
        .gte('created_at', `${startDate}T00:00:00+09:00`)
        .lte('created_at', `${today}T23:59:59+09:00`)
        .is('deleted_at', null)
        .limit(500)

      const todosByStudent = new Map<string, { completed: number; total: number }>()
      if (todosResult.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const t of todosResult.data as any[]) {
          const name = t.students?.users?.name || 'Unknown'
          const entry = todosByStudent.get(name) || { completed: 0, total: 0 }
          entry.total++
          if (t.completed_at) entry.completed++
          todosByStudent.set(name, entry)
        }
      }

      const completionList: StudentCompletionRate[] = Array.from(todosByStudent.entries())
        .map(([student_name, { completed, total }]) => ({
          student_name,
          completed,
          total,
          rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        }))
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 15)

      return { success: true, data: { widgetId, completionList } }
    }

    return { success: false, error: '알 수 없는 위젯 ID입니다.' }
  } catch (error) {
    console.error('[getDrilldownData] Error:', error)
    return { success: false, error: '데이터 조회 중 오류가 발생했습니다.' }
  }
}
