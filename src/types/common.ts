/**
 * Common types used across the application
 */

export type UUID = string

export interface Timestamps {
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export interface TenantScoped {
  tenant_id: UUID
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface SortParams {
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface FilterParams {
  search?: string
  status?: string
  [key: string]: unknown
}

export type QueryParams = PaginationParams & SortParams & FilterParams

// Result type for operations
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

// Database record base type
export interface BaseRecord extends Timestamps {
  [key: string]: unknown
}

// Soft delete mixin
export interface SoftDeletable {
  deleted_at?: Date | null
  is_deleted: boolean
}
