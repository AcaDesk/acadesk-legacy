/**
 * Save Report Use Case
 * 리포트 저장 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/client'
import { DatabaseError } from '@/lib/error-types'
import type { ReportData } from './GenerateMonthlyReportUseCase'

export class SaveReportUseCase {
  private supabase = createClient()

  async execute(
    reportData: ReportData,
    reportType: 'weekly' | 'monthly' = 'monthly'
  ) {
    const { data: studentData } = await this.supabase
      .from('students')
      .select('tenant_id')
      .eq('id', reportData.student.id)
      .single()

    if (!studentData) throw new DatabaseError('학생을 찾을 수 없습니다.')

    const { data, error } = await this.supabase
      .from('reports')
      .insert({
        tenant_id: studentData.tenant_id,
        student_id: reportData.student.id,
        report_type: reportType,
        period_start: reportData.period.start,
        period_end: reportData.period.end,
        content: reportData as unknown as Record<string, unknown>,
      })
      .select()
      .single()

    if (error) throw new DatabaseError('리포트 저장에 실패했습니다', error)

    return data
  }
}
