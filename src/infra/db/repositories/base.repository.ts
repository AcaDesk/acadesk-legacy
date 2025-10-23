/**
 * Base repository with common CRUD operations
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@core/domain/data-sources/IDataSource'
import type { QueryParams, PaginatedResponse, UUID } from '@/core/types/common'
import { QueryBuilder } from '@/lib/query-builder'
import { NotFoundError, DatabaseError } from '@/lib/error-types'
import { SupabaseDataSource } from '../datasource/SupabaseDataSource'

export abstract class BaseRepository<T extends Record<string, unknown>> {
  protected queryBuilder: QueryBuilder<T>
  protected dataSource: IDataSource

  /**
   * Constructor
   * @param client - IDataSource 또는 SupabaseClient (하위 호환성)
   * @param tableName - 테이블 이름
   */
  constructor(
    client: IDataSource | SupabaseClient,
    protected tableName: string
  ) {
    // IDataSource 타입 체크 (duck typing)
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)

    this.queryBuilder = new QueryBuilder<T>(this.dataSource, tableName)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function' && typeof client.rpc === 'function'
  }

  /**
   * Find all records with pagination and filters
   */
  async findAll(params: QueryParams = {}): Promise<PaginatedResponse<T>> {
    try {
      return await this.queryBuilder.paginate(params)
    } catch (error) {
      throw new DatabaseError(`Failed to fetch ${this.tableName}`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * Find a single record by ID
   */
  async findById(id: UUID): Promise<T> {
    try {
      const record = await this.queryBuilder.findById(id)
      if (!record) {
        throw new NotFoundError(this.tableName)
      }
      return record
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError(`Failed to fetch ${this.tableName} by ID`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * Find records by a specific field
   */
  async findBy(field: string, value: unknown): Promise<T[]> {
    try {
      return await this.queryBuilder.findBy(field, value)
    } catch (error) {
      throw new DatabaseError(`Failed to fetch ${this.tableName} by ${field}`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      return await this.queryBuilder.create(data)
    } catch (error) {
      throw new DatabaseError(`Failed to create ${this.tableName}`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * Update a record
   */
  async update(id: UUID, data: Partial<T>): Promise<T> {
    try {
      return await this.queryBuilder.update(id, data)
    } catch (error) {
      throw new DatabaseError(`Failed to update ${this.tableName}`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * Soft delete a record
   */
  async softDelete(id: UUID): Promise<void> {
    try {
      await this.queryBuilder.softDelete(id)
    } catch (error) {
      throw new DatabaseError(`Failed to delete ${this.tableName}`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * Hard delete a record (use with caution)
   */
  async delete(id: UUID): Promise<void> {
    try {
      await this.queryBuilder.delete(id)
    } catch (error) {
      throw new DatabaseError(`Failed to permanently delete ${this.tableName}`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * Count records
   */
  async count(filters?: Record<string, unknown>): Promise<number> {
    try {
      return await this.queryBuilder.count(filters)
    } catch (error) {
      throw new DatabaseError(`Failed to count ${this.tableName}`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: UUID): Promise<boolean> {
    try {
      const record = await this.queryBuilder.findById(id)
      return record !== null
    } catch {
      return false
    }
  }
}
