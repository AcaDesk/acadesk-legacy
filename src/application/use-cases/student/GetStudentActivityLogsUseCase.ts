/**
 * Get Student Activity Logs Use Case
 * 학생 활동 로그 조회 유스케이스
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'

export interface ActivityLog {
  id: string
  activity_type: string
  activity_date: string
  title: string
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  ref_activity_types: {
    label: string
    icon: string | null
    color: string | null
  } | null
}

export class GetStudentActivityLogsUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(studentId: string, limit: number = 50): Promise<ActivityLog[]> {
    const { data, error } = await this.dataSource
      .from('student_activity_logs')
      .select(`
        id,
        activity_type,
        activity_date,
        title,
        description,
        metadata,
        created_at,
        ref_activity_types (
          label,
          icon,
          color
        )
      `)
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .order('activity_date', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch student activity logs: ${error.message}`)
    }

    if (!data || !Array.isArray(data)) {
      return []
    }

    // Transform data to match the expected type
    const transformedData = data.map((activity: any) => ({
      ...activity,
      ref_activity_types: Array.isArray(activity.ref_activity_types)
        ? activity.ref_activity_types[0] || null
        : activity.ref_activity_types,
    }))

    return transformedData as ActivityLog[]
  }
}
