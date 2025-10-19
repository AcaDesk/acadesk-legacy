/**
 * SupabaseUserRepository
 * Supabase implementation of IUserRepository
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IUserRepository } from '@/domain/repositories/IUserRepository'
import { User, type CreateUserProps, type UserRole, type ApprovalStatus } from '@/domain/entities/User'
import { Email } from '@/domain/value-objects/Email'

interface UserRow {
  id: string
  tenant_id: string | null
  email: string
  name: string
  phone: string | null
  role_code: UserRole | null
  onboarding_completed: boolean
  onboarding_completed_at: string | null
  approval_status: ApprovalStatus
  approval_reason: string | null
  approved_at: string | null
  approved_by: string | null
  settings: Record<string, unknown>
  preferences: Record<string, unknown>
  address: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export class UserRepository implements IUserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapToEntity(data as UserRow)
  }

  /**
   * Find user by email
   */
  async findByEmail(email: Email): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email.getValue())
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapToEntity(data as UserRow)
  }

  /**
   * Find users by tenant ID
   */
  async findByTenantId(tenantId: string): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'approved')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map((row) => this.mapToEntity(row as UserRow))
  }

  /**
   * Find pending users by tenant ID (for owner approval)
   */
  async findPendingByTenantId(tenantId: string): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map((row) => this.mapToEntity(row as UserRow))
  }

  /**
   * Save user (create or update)
   */
  async save(user: User): Promise<User> {
    const row = this.mapToRow(user)

    const { data, error } = await this.supabase
      .from('users')
      .upsert(row)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to save user: ${error?.message || 'Unknown error'}`)
    }

    return this.mapToEntity(data as UserRow)
  }

  /**
   * Update user
   */
  async update(user: User): Promise<User> {
    const row = this.mapToRow(user)

    const { data, error } = await this.supabase
      .from('users')
      .update(row)
      .eq('id', user.getId())
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to update user: ${error?.message || 'Unknown error'}`)
    }

    return this.mapToEntity(data as UserRow)
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`)
    }
  }

  /**
   * Check if email exists
   */
  async existsByEmail(email: Email): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email.getValue())
      .is('deleted_at', null)
      .single()

    return !error && !!data
  }

  /**
   * Approve user
   */
  async approve(id: string, approvedBy: string): Promise<User> {
    const user = await this.findById(id)
    if (!user) {
      throw new Error('User not found')
    }

    const approvedUser = user.approve(approvedBy)
    return this.update(approvedUser)
  }

  /**
   * Reject user
   */
  async reject(id: string, reason: string, rejectedBy: string): Promise<User> {
    const user = await this.findById(id)
    if (!user) {
      throw new Error('User not found')
    }

    const rejectedUser = user.reject(reason, rejectedBy)
    return this.update(rejectedUser)
  }

  /**
   * Map database row to User entity
   */
  private mapToEntity(row: UserRow): User {
    const props: CreateUserProps = {
      id: row.id,
      tenantId: row.tenant_id,
      email: Email.create(row.email),
      name: row.name,
      phone: row.phone,
      roleCode: row.role_code,
      onboardingCompleted: row.onboarding_completed,
      onboardingCompletedAt: row.onboarding_completed_at ? new Date(row.onboarding_completed_at) : null,
      approvalStatus: row.approval_status,
      approvalReason: row.approval_reason,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      approvedBy: row.approved_by,
      settings: row.settings || {},
      preferences: row.preferences || {},
      address: row.address,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    }

    return User.create(props)
  }

  /**
   * Map User entity to database row
   */
  private mapToRow(user: User): Partial<UserRow> {
    return {
      id: user.getId(),
      tenant_id: user.getTenantId(),
      email: user.getEmail().getValue(),
      name: user.getName(),
      phone: user.getPhone(),
      role_code: user.getRoleCode(),
      onboarding_completed: user.getOnboardingCompleted(),
      onboarding_completed_at: user.getOnboardingCompletedAt()?.toISOString() ?? null,
      approval_status: user.getApprovalStatus(),
      approval_reason: user.getApprovalReason(),
      approved_at: user.getApprovedAt()?.toISOString() ?? null,
      approved_by: user.getApprovedBy(),
      settings: user.getSettings(),
      preferences: user.getPreferences(),
      address: user.getAddress(),
      updated_at: new Date().toISOString(),
    }
  }
}
