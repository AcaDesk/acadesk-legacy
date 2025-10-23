/**
 * PreviewStudentImportUseCase
 * 학생 Import 미리보기 Use Case
 */

import type { IStudentImportRepository } from '@core/domain/repositories/IStudentImportRepository'
import type { StudentImportItem } from '@core/domain/entities/StudentImport'
import type { StudentImportPreview } from '@core/domain/value-objects/StudentImportPreview'

/**
 * 학생 Import 미리보기 Use Case
 * - 클라이언트에서 검증된 데이터를 받아 서버에서 중복 검사 수행
 * - DB에는 변경을 가하지 않음 (READ ONLY)
 */
export class PreviewStudentImportUseCase {
  constructor(private readonly repository: IStudentImportRepository) {}

  async execute(items: StudentImportItem[]): Promise<StudentImportPreview> {
    // 빈 배열 체크
    if (!items || items.length === 0) {
      throw new Error('Import할 데이터가 없습니다')
    }

    // Repository를 통해 RPC 호출
    const preview = await this.repository.preview(items)

    // 실패 시 에러 처리
    if (!preview.success) {
      throw new Error(preview.message || 'Import 미리보기에 실패했습니다')
    }

    return preview
  }
}
