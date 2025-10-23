/**
 * Report Repository Implementation - Infrastructure Layer
 */

import { IReportRepository } from '@/domain/repositories/IReportRepository'
import { Report, ReportType } from '@/domain/entities/Report'
import { IDataSource } from '@/domain/data-sources/IDataSource'
import { DatabaseError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

export class ReportRepository implements IReportRepository {
  constructor(private dataSource: IDataSource) {}

  async findById(id: string): Promise<Report | null> {
    try {
      const { data, error } = await this.dataSource
        .from('reports')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return Report.fromDatabase(data)
    } catch (error) {
      logError(error, { repository: 'ReportRepository', method: 'findById', id })
      throw new DatabaseError('리포트 조회 실패')
    }
  }

  async findByStudentId(studentId: string, limit: number = 10): Promise<Report[]> {
    try {
      const { data, error } = await this.dataSource
        .from('reports')
        .select('*')
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return ((data as any[]) || []).map((row: any) => Report.fromDatabase(row))
    } catch (error) {
      logError(error, {
        repository: 'ReportRepository',
        method: 'findByStudentId',
        studentId,
      })
      return []
    }
  }

  async findByClassId(classId: string, limit: number = 10): Promise<Report[]> {
    try {
      const { data, error } = await this.dataSource
        .from('reports')
        .select('*')
        .eq('class_id', classId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return ((data as any[]) || []).map((row: any) => Report.fromDatabase(row))
    } catch (error) {
      logError(error, { repository: 'ReportRepository', method: 'findByClassId', classId })
      return []
    }
  }

  async findByType(type: ReportType, limit: number = 10): Promise<Report[]> {
    try {
      const { data, error } = await this.dataSource
        .from('reports')
        .select('*')
        .eq('type', type)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return ((data as any[]) || []).map((row: any) => Report.fromDatabase(row))
    } catch (error) {
      logError(error, { repository: 'ReportRepository', method: 'findByType', type })
      return []
    }
  }

  async save(report: Report): Promise<void> {
    try {
      const { error } = await this.dataSource.from('reports').insert(report.toDatabase())

      if (error) throw error
    } catch (error) {
      logError(error, { repository: 'ReportRepository', method: 'save', reportId: report.id })
      throw new DatabaseError('리포트 저장 실패')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.dataSource
        .from('reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      logError(error, { repository: 'ReportRepository', method: 'delete', id })
      throw new DatabaseError('리포트 삭제 실패')
    }
  }
}
