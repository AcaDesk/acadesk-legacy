/**
 * Get Recent Class Sessions Use Case
 * 최근 수업 세션 조회 유스케이스
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'

export interface ClassSession {
  id: string
  session_date: string
  topic: string
  content: string | null
  homework_assigned: string | null
  class_id: string
}

export class GetRecentClassSessionsUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(classId: string, limit: number = 5): Promise<ClassSession[]> {
    const { data, error } = await this.dataSource
      .from('class_sessions')
      .select('*')
      .eq('class_id', classId)
      .order('session_date', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch class sessions: ${error.message}`)
    }

    if (!data || !Array.isArray(data)) {
      return []
    }

    return data.map((item: any) => ({
      id: item.id,
      session_date: item.session_date,
      topic: item.topic,
      content: item.content || null,
      homework_assigned: item.homework_assigned || null,
      class_id: item.class_id,
    }))
  }
}
