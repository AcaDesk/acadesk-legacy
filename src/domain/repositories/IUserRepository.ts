/**
 * IUserRepository
 * User data repository interface
 */

import type { User } from '@/domain/entities/User'
import type { Email } from '@/domain/value-objects/Email'

export interface IUserRepository {
  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>

  /**
   * Find user by email
   */
  findByEmail(email: Email): Promise<User | null>

  /**
   * Find users by tenant ID
   */
  findByTenantId(tenantId: string): Promise<User[]>

  /**
   * Find pending users by tenant ID (for owner approval)
   */
  findPendingByTenantId(tenantId: string): Promise<User[]>

  /**
   * Save user (create or update)
   */
  save(user: User): Promise<User>

  /**
   * Update user
   */
  update(user: User): Promise<User>

  /**
   * Delete user (soft delete)
   */
  delete(id: string): Promise<void>

  /**
   * Check if email exists
   */
  existsByEmail(email: Email): Promise<boolean>

  /**
   * Approve user
   */
  approve(id: string, approvedBy: string): Promise<User>

  /**
   * Reject user
   */
  reject(id: string, reason: string, rejectedBy: string): Promise<User>
}
