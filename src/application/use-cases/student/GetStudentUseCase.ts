/**
 * Get Student Use Case
 * 학생 조회 유스케이스 - Application Layer
 */

import type { IStudentRepository, StudentFilters, FindStudentOptions } from '@/domain/repositories/IStudentRepository'
import type { Student } from '@/domain/entities/Student'
import type { StudentCode } from '@/domain/value-objects/StudentCode'
import { NotFoundError } from '@/lib/error-types'

export class GetStudentUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  /**
   * ID로 학생 조회
   */
  async getById(id: string, tenantId: string, options?: FindStudentOptions): Promise<Student | null> {
    return await this.studentRepository.findById(id, tenantId, options)
  }

  /**
   * ID로 학생 조회 (없으면 에러)
   */
  async getByIdOrThrow(id: string, tenantId: string, options?: FindStudentOptions): Promise<Student> {
    const student = await this.studentRepository.findById(id, tenantId, options)

    if (!student) {
      throw new NotFoundError('학생')
    }

    return student
  }

  /**
   * 학생 코드로 조회
   */
  async getByStudentCode(code: StudentCode, tenantId: string): Promise<Student | null> {
    return await this.studentRepository.findByStudentCode(code, tenantId)
  }

  /**
   * 테넌트의 모든 학생 조회
   */
  async getAllByTenant(
    tenantId: string,
    filters?: StudentFilters,
    options?: FindStudentOptions
  ): Promise<Student[]> {
    return await this.studentRepository.findAll(tenantId, filters, options)
  }

  /**
   * 학생 검색
   */
  async search(query: string, tenantId: string, limit?: number): Promise<Student[]> {
    return await this.studentRepository.search(query, tenantId, limit)
  }

  /**
   * 학년별 학생 수 조회
   */
  async getCountByGrade(tenantId: string): Promise<Record<string, number>> {
    return await this.studentRepository.countByGrade(tenantId)
  }

  /**
   * 학교별 학생 수 조회
   */
  async getCountBySchool(tenantId: string): Promise<Record<string, number>> {
    return await this.studentRepository.countBySchool(tenantId)
  }

  /**
   * 고유 학년 목록 조회
   */
  async getUniqueGrades(tenantId: string): Promise<string[]> {
    return await this.studentRepository.findUniqueGrades(tenantId)
  }

  /**
   * 고유 학교 목록 조회
   */
  async getUniqueSchools(tenantId: string): Promise<string[]> {
    return await this.studentRepository.findUniqueSchools(tenantId)
  }
}
