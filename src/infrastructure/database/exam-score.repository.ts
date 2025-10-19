/**
 * Supabase ExamScore Repository Implementation
 * 시험 성적 리포지토리의 Supabase 구현 - 인프라 레이어
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IExamScoreRepository, ExamScoreFilters, ExamScoreStats } from '@/domain/repositories/IExamScoreRepository'
import { ExamScore } from '@/domain/entities/ExamScore'
import { Score } from '@/domain/value-objects/Score'
import { DatabaseError, NotFoundError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

export class ExamScoreRepository implements IExamScoreRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<ExamScore | null> {
    try {
      const { data, error } = await this.supabase
        .from('exam_scores')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        logError(error, { repository: 'ExamScoreRepository', method: 'findById', id })
        throw new DatabaseError('성적을 조회할 수 없습니다', error)
      }

      return data ? this.mapToDomain(data) : null
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'ExamScoreRepository', method: 'findById' })
      throw new DatabaseError('성적을 조회할 수 없습니다')
    }
  }

  async findByIdOrThrow(id: string): Promise<ExamScore> {
    const examScore = await this.findById(id)
    if (!examScore) {
      throw new NotFoundError('성적')
    }
    return examScore
  }

  async findByExamId(examId: string, filters?: ExamScoreFilters): Promise<ExamScore[]> {
    try {
      let query = this.supabase
        .from('exam_scores')
        .select('*')
        .eq('exam_id', examId)
        .is('deleted_at', null)

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId)
      }

      if (filters?.minPercentage !== undefined) {
        query = query.gte('percentage', filters.minPercentage)
      }

      if (filters?.maxPercentage !== undefined) {
        query = query.lte('percentage', filters.maxPercentage)
      }

      const { data, error } = await query

      if (error) {
        logError(error, { repository: 'ExamScoreRepository', method: 'findByExamId' })
        throw new DatabaseError('시험 성적을 조회할 수 없습니다', error)
      }

      return (data || []).map(row => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'ExamScoreRepository', method: 'findByExamId' })
      throw new DatabaseError('시험 성적을 조회할 수 없습니다')
    }
  }

  async findByStudentId(studentId: string): Promise<ExamScore[]> {
    try {
      const { data, error } = await this.supabase
        .from('exam_scores')
        .select('*')
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        logError(error, { repository: 'ExamScoreRepository', method: 'findByStudentId' })
        throw new DatabaseError('학생 성적을 조회할 수 없습니다', error)
      }

      return (data || []).map(row => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'ExamScoreRepository', method: 'findByStudentId' })
      throw new DatabaseError('학생 성적을 조회할 수 없습니다')
    }
  }

  async findAll(tenantId: string, filters?: ExamScoreFilters, limit: number = 100): Promise<ExamScore[]> {
    try {
      let query = this.supabase
        .from('exam_scores')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (filters?.examId) {
        query = query.eq('exam_id', filters.examId)
      }

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId)
      }

      const { data, error } = await query

      if (error) {
        logError(error, { repository: 'ExamScoreRepository', method: 'findAll' })
        throw new DatabaseError('성적 목록을 조회할 수 없습니다', error)
      }

      return (data || []).map(row => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'ExamScoreRepository', method: 'findAll' })
      throw new DatabaseError('성적 목록을 조회할 수 없습니다')
    }
  }

  async findByExamAndStudent(examId: string, studentId: string): Promise<ExamScore | null> {
    try {
      const { data, error } = await this.supabase
        .from('exam_scores')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        logError(error, { repository: 'ExamScoreRepository', method: 'findByExamAndStudent' })
        throw new DatabaseError('성적을 조회할 수 없습니다', error)
      }

      return data ? this.mapToDomain(data) : null
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'ExamScoreRepository', method: 'findByExamAndStudent' })
      throw new DatabaseError('성적을 조회할 수 없습니다')
    }
  }

  async save(examScore: ExamScore): Promise<ExamScore> {
    try {
      const data = examScore.toPersistence()

      const { data: savedData, error } = await this.supabase
        .from('exam_scores')
        .upsert(data)
        .select()
        .single()

      if (error) {
        logError(error, { repository: 'ExamScoreRepository', method: 'save' })
        throw new DatabaseError('성적을 저장할 수 없습니다', error)
      }

      return this.mapToDomain(savedData)
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'ExamScoreRepository', method: 'save' })
      throw new DatabaseError('성적을 저장할 수 없습니다')
    }
  }

  async saveBulk(examScores: ExamScore[]): Promise<ExamScore[]> {
    try {
      const data = examScores.map(score => score.toPersistence())

      const { data: savedData, error } = await this.supabase
        .from('exam_scores')
        .upsert(data)
        .select()

      if (error) {
        logError(error, { repository: 'ExamScoreRepository', method: 'saveBulk' })
        throw new DatabaseError('성적을 일괄 저장할 수 없습니다', error)
      }

      return (savedData || []).map(row => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'ExamScoreRepository', method: 'saveBulk' })
      throw new DatabaseError('성적을 일괄 저장할 수 없습니다')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('exam_scores')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        logError(error, { repository: 'ExamScoreRepository', method: 'delete', id })
        throw new DatabaseError('성적을 삭제할 수 없습니다', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'ExamScoreRepository', method: 'delete' })
      throw new DatabaseError('성적을 삭제할 수 없습니다')
    }
  }

  async getStatsByExam(examId: string): Promise<ExamScoreStats> {
    try {
      const scores = await this.findByExamId(examId)
      return this.calculateStats(scores)
    } catch (error) {
      logError(error, { repository: 'ExamScoreRepository', method: 'getStatsByExam' })
      return this.emptyStats()
    }
  }

  async getStatsByStudent(studentId: string): Promise<ExamScoreStats> {
    try {
      const scores = await this.findByStudentId(studentId)
      return this.calculateStats(scores)
    } catch (error) {
      logError(error, { repository: 'ExamScoreRepository', method: 'getStatsByStudent' })
      return this.emptyStats()
    }
  }

  async findLowPerformers(examId: string, threshold: number): Promise<ExamScore[]> {
    try {
      const { data, error } = await this.supabase
        .from('exam_scores')
        .select('*')
        .eq('exam_id', examId)
        .lt('percentage', threshold)
        .is('deleted_at', null)
        .order('percentage', { ascending: true })

      if (error) {
        logError(error, { repository: 'ExamScoreRepository', method: 'findLowPerformers' })
        throw new DatabaseError('저성취자를 조회할 수 없습니다', error)
      }

      return (data || []).map(row => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'ExamScoreRepository', method: 'findLowPerformers' })
      throw new DatabaseError('저성취자를 조회할 수 없습니다')
    }
  }

  /**
   * Database row를 Domain Entity로 변환
   */
  private mapToDomain(row: Record<string, unknown>): ExamScore {
    const score = Score.create(
      row.score as number,
      row.total_points as number
    )

    return ExamScore.fromDatabase({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      examId: row.exam_id as string,
      studentId: row.student_id as string,
      score,
      feedback: row.feedback as string | null,
      isRetest: row.is_retest as boolean,
      retestCount: row.retest_count as number,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
    })
  }

  /**
   * 통계 계산
   */
  private calculateStats(scores: ExamScore[]): ExamScoreStats {
    if (scores.length === 0) {
      return this.emptyStats()
    }

    const passed = scores.filter(s => s.isPassed()).length
    const failed = scores.length - passed
    const totalPercentage = scores.reduce((sum, s) => sum + s.getPercentage(), 0)
    const averagePercentage = Math.round(totalPercentage / scores.length)

    const gradeDistribution = {
      A: scores.filter(s => s.getGrade() === 'A').length,
      B: scores.filter(s => s.getGrade() === 'B').length,
      C: scores.filter(s => s.getGrade() === 'C').length,
      D: scores.filter(s => s.getGrade() === 'D').length,
      F: scores.filter(s => s.getGrade() === 'F').length,
    }

    return {
      total: scores.length,
      passed,
      failed,
      averagePercentage,
      gradeDistribution,
    }
  }

  /**
   * 빈 통계
   */
  private emptyStats(): ExamScoreStats {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      averagePercentage: 0,
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
    }
  }
}
