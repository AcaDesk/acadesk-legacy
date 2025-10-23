/**
 * StudentImportRepository
 * 학생 Import 관련 데이터 접근 구현체
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@core/domain/data-sources/IDataSource'
import type {
  IStudentImportRepository,
  ImportConfirmResult,
} from '@core/domain/repositories/IStudentImportRepository'
import type { StudentImportItem } from '@core/domain/entities/StudentImport'
import { StudentImportPreview } from '@core/domain/value-objects/StudentImportPreview'
import { DatabaseError } from '@/lib/error-types'
import { SupabaseDataSource } from '../data-sources/SupabaseDataSource'

export class StudentImportRepository implements IStudentImportRepository {
  private dataSource: IDataSource

  constructor(client: IDataSource | SupabaseClient) {
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function' && typeof client.rpc === 'function'
  }

  /**
   * Import 미리보기 (RPC 호출)
   */
  async preview(items: StudentImportItem[]): Promise<StudentImportPreview> {
    try {
      const jsonItems = items.map((item) => item.toJSON())

      const result = await this.dataSource.rpc('preview_student_import', {
        _items: jsonItems,
      })
      const { data, error } = result as { data: any; error: Error | null }

      if (error) {
        console.error('[StudentImportRepository.preview] RPC error:', error)
        throw new DatabaseError('미리보기를 가져올 수 없습니다')
      }

      if (!data) {
        throw new DatabaseError('미리보기 데이터가 없습니다')
      }

      return StudentImportPreview.fromRPCResult(data)
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err
      }
      console.error('[StudentImportRepository.preview] Unexpected error:', err)
      throw new DatabaseError('미리보기 중 오류가 발생했습니다')
    }
  }

  /**
   * Import 확정 실행 (RPC 호출)
   */
  async confirm(
    items: StudentImportItem[],
    onDuplicate: 'skip' | 'update' = 'skip'
  ): Promise<ImportConfirmResult> {
    try {
      const jsonItems = items.map((item) => item.toJSON())

      const result = await this.dataSource.rpc('confirm_student_import', {
        _items: jsonItems,
        _on_duplicate: onDuplicate,
      })
      const { data, error } = result as { data: any; error: Error | null }

      if (error) {
        console.error('[StudentImportRepository.confirm] RPC error:', error)
        throw new DatabaseError('Import 실행에 실패했습니다')
      }

      if (!data) {
        throw new DatabaseError('Import 결과 데이터가 없습니다')
      }

      return data as ImportConfirmResult
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err
      }
      console.error('[StudentImportRepository.confirm] Unexpected error:', err)
      throw new DatabaseError('Import 실행 중 오류가 발생했습니다')
    }
  }
}
