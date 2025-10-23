/**
 * ConfirmStudentImportUseCase
 * 학생 Import 확정 실행 Use Case
 */

import type { IStudentImportRepository } from '@core/domain/repositories/IStudentImportRepository'
import type { StudentImportItem } from '@core/domain/entities/StudentImport'
import type { ImportConfirmResult } from '@core/domain/repositories/IStudentImportRepository'

/**
 * 학생 Import 확정 실행 Use Case
 * - 미리보기를 통과한 데이터를 실제로 DB에 반영
 * - 트랜잭션으로 원자성 보장
 */
export class ConfirmStudentImportUseCase {
  constructor(private readonly repository: IStudentImportRepository) {}

  async execute(
    items: StudentImportItem[],
    onDuplicate: 'skip' | 'update' = 'skip'
  ): Promise<ImportConfirmResult> {
    // 빈 배열 체크
    if (!items || items.length === 0) {
      throw new Error('Import할 데이터가 없습니다')
    }

    // 중복 처리 전략 검증
    if (onDuplicate !== 'skip' && onDuplicate !== 'update') {
      throw new Error('중복 처리 전략이 올바르지 않습니다')
    }

    // Repository를 통해 RPC 호출 (트랜잭션 실행)
    const result = await this.repository.confirm(items, onDuplicate)

    // 실패 시 에러 처리
    if (!result.success) {
      throw new Error(result.message || 'Import 실행에 실패했습니다')
    }

    return result
  }
}
