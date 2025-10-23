/**
 * Guardian Repository Interface
 * 보호자 리포지토리 인터페이스
 */

import { Guardian } from '../entities/Guardian'

export interface GuardianWithDetails {
  guardian: Guardian
  userName: string | null
  userEmail: string | null
  userPhone: string | null
  students: Array<{
    id: string
    studentCode: string
    name: string
    relation: string | null
    isPrimary: boolean | null
  }>
}

export interface IGuardianRepository {
  /**
   * 보호자 상세 정보 조회 (users 및 students 포함)
   */
  findAllWithDetails(tenantId: string): Promise<GuardianWithDetails[]>

  /**
   * 보호자 삭제 (soft delete)
   */
  delete(id: string): Promise<void>
}
