/**
 * IInvitationRepository
 * Invitation repository interface
 *
 * MVP: 현재 미사용 (추후 구현 예정)
 */

import type { Invitation } from '@/domain/entities/Invitation'
import type { InvitationToken } from '@/domain/value-objects/InvitationToken'
import type { Email } from '@/domain/value-objects/Email'

export interface IInvitationRepository {
  /**
   * Find invitation by ID
   */
  findById(id: string): Promise<Invitation | null>

  /**
   * Find invitation by token
   */
  findByToken(token: InvitationToken): Promise<Invitation | null>

  /**
   * Find invitations by tenant ID
   */
  findByTenantId(tenantId: string): Promise<Invitation[]>

  /**
   * Find invitations by email
   */
  findByEmail(email: Email): Promise<Invitation[]>

  /**
   * Validate invitation token
   */
  validateToken(token: InvitationToken): Promise<{
    valid: boolean
    invitation?: Invitation
    error?: string
  }>

  /**
   * Save invitation (create or update)
   */
  save(invitation: Invitation): Promise<Invitation>

  /**
   * Update invitation
   */
  update(invitation: Invitation): Promise<Invitation>

  /**
   * Delete invitation (soft delete)
   */
  delete(id: string): Promise<void>

  /**
   * Accept invitation
   */
  accept(id: string, userId: string): Promise<Invitation>

  /**
   * Reject invitation
   */
  reject(id: string): Promise<Invitation>

  /**
   * Expire old invitations (batch operation)
   */
  expireOldInvitations(): Promise<number>
}
