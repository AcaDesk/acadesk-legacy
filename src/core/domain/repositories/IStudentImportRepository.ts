/**
 * IStudentImportRepository Interface
 * 학생 Import 관련 데이터 접근 인터페이스 (Dependency Inversion)
 */

import type { StudentImportItem } from '../entities/StudentImport'
import type { StudentImportPreview } from '../value-objects/StudentImportPreview'

export interface ImportConfirmResult {
  success: boolean
  message?: string
  summary?: {
    total: number
    created: number
    updated: number
    linksProcessed: number
    strategy: string
  }
}

/**
 * 학생 Import Repository 인터페이스
 */
export interface IStudentImportRepository {
  /**
   * Import 미리보기 (중복 검사, 유효성 검사)
   * @param items Import할 학생 데이터 배열
   * @returns 미리보기 결과 (신규/중복/오류 분류)
   */
  preview(items: StudentImportItem[]): Promise<StudentImportPreview>

  /**
   * Import 확정 실행 (트랜잭션)
   * @param items Import할 학생 데이터 배열
   * @param onDuplicate 중복 처리 전략 ('skip' | 'update')
   * @returns 실행 결과
   */
  confirm(
    items: StudentImportItem[],
    onDuplicate: 'skip' | 'update'
  ): Promise<ImportConfirmResult>
}
