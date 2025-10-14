/**
 * Base repository with common CRUD operations
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { QueryParams, PaginatedResponse, UUID } from '@/types/common'
import { QueryBuilder } from '@/lib/query-builder'
import { NotFoundError, DatabaseError } from '@/lib/errors'

export abstract class BaseRepository<T extends Record<string, unknown>> {
  protected queryBuilder: QueryBuilder<T>

  constructor(
    protected supabase: SupabaseClient,
    protected tableName: string
  ) {
    this.queryBuilder = new QueryBuilder<T>(supabase, tableName)
  }

  /**
   * Find all records with pagination and filters
   */
  async findAll(params: QueryParams = {}): Promise<PaginatedResponse<T>> {
    try {
      return await this.queryBuilder.paginate(params)
    } catch (error) {
      throw new DatabaseError(`Failed to fetch ${this.tableName}`, error)
    }
  }

  /**
   * Find a single record by ID
   */
  async findById(id: UUID): Promise<T> {
    try {
      const record = await this.queryBuilder.findById(id)
      if (!record) {
        throw new NotFoundError(this.tableName, id)
      }
      return record
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError(`Failed to fetch ${this.tableName} by ID`, error)
    }
  }

  /**
   * Find records by a specific field
   */
  async findBy(field: string, value: unknown): Promise<T[]> {
    try {
      return await this.queryBuilder.findBy(field, value)
    } catch (error) {
      throw new DatabaseError(`Failed to fetch ${this.tableName} by ${field}`, error)
    }
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      return await this.queryBuilder.create(data)
    } catch (error) {
      throw new DatabaseError(`Failed to create ${this.tableName}`, error)
    }
  }

  /**
   * Update a record
   */
  async update(id: UUID, data: Partial<T>): Promise<T> {
    try {
      return await this.queryBuilder.update(id, data)
    } catch (error) {
      throw new DatabaseError(`Failed to update ${this.tableName}`, error)
    }
  }

  /**
   * Soft delete a record
   */
  async softDelete(id: UUID): Promise<void> {
    try {
      await this.queryBuilder.softDelete(id)
    } catch (error) {
      throw new DatabaseError(`Failed to delete ${this.tableName}`, error)
    }
  }

  /**
   * Hard delete a record (use with caution)
   */
  async delete(id: UUID): Promise<void> {
    try {
      await this.queryBuilder.delete(id)
    } catch (error) {
      throw new DatabaseError(`Failed to permanently delete ${this.tableName}`, error)
    }
  }

  /**
   * Count records
   */
  async count(filters?: Record<string, unknown>): Promise<number> {
    try {
      return await this.queryBuilder.count(filters)
    } catch (error) {
      throw new DatabaseError(`Failed to count ${this.tableName}`, error)
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
