/**
 * SupabaseInvitationRepository
 * Supabase implementation of IInvitationRepository
 *
 * MVP: 현재 미사용 (추후 구현 예정)
 * 초대장 테이블과 RPC 함수가 데이터베이스에 없음
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@/domain/data-sources/IDataSource'
import type { IInvitationRepository } from '@/domain/repositories/IInvitationRepository'
import { Invitation, type CreateInvitationProps } from '@/domain/entities/Invitation'
import { InvitationToken } from '@/domain/value-objects/InvitationToken'
import { Email } from '@/domain/value-objects/Email'
import type { UserRole } from '@/domain/entities/User'
import { SupabaseDataSource } from '../data-sources/SupabaseDataSource'

interface InvitationRow {
  id: string
  tenant_id: string
  invited_by: string
  email: string
  role_code: UserRole
  token: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Supabase Invitation Repository
 *
 * ⚠️ MVP 단계에서는 사용하지 않음
 * 초대 기능 구현 시 활성화
 */
export class InvitationRepository implements IInvitationRepository {
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
   * Find invitation by ID
   */
  async findById(id: string): Promise<Invitation | null> {
    const { data, error } = await this.dataSource
      .from('invitations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapToEntity(data as InvitationRow)
  }

  /**
   * Find invitation by token
   */
  async findByToken(token: InvitationToken): Promise<Invitation | null> {
    const { data, error } = await this.dataSource
      .from('invitations')
      .select('*')
      .eq('token', token.getValue())
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapToEntity(data as InvitationRow)
  }

  /**
   * Find invitations by tenant ID
   */
  async findByTenantId(tenantId: string): Promise<Invitation[]> {
    const { data, error } = await this.dataSource
      .from('invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return (data as any[] || []).map((row: any) => this.mapToEntity(row as InvitationRow))
  }

  /**
   * Find invitations by email
   */
  async findByEmail(email: Email): Promise<Invitation[]> {
    const { data, error } = await this.dataSource
      .from('invitations')
      .select('*')
      .eq('email', email.getValue())
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return (data as any[] || []).map((row: any) => this.mapToEntity(row as InvitationRow))
  }

  /**
   * Validate invitation token
   */
  async validateToken(token: InvitationToken): Promise<{
    valid: boolean
    invitation?: Invitation
    error?: string
  }> {
    // RPC 함수를 사용하여 검증
    const result = await this.dataSource
      .rpc('validate_invitation_token', { _token: token.getValue() })

    const { data, error } = result as { data: any; error: Error | null }

    if (error || !data) {
      return {
        valid: false,
        error: '초대장 검증에 실패했습니다.',
      }
    }

    const validation = data as {
      valid: boolean
      reason?: string
      id?: string
      tenant_id?: string
      created_by?: string
      email?: string
      role_code?: UserRole
      token?: string
      status?: string
      expires_at?: string
      created_at?: string
    }

    if (!validation.valid) {
      const reason = validation.reason || 'unknown'
      let errorMessage = '유효하지 않은 초대 코드입니다.'

      if (reason === 'not_found') {
        errorMessage = '초대장을 찾을 수 없습니다.'
      } else if (reason === 'expired') {
        errorMessage = '초대장이 만료되었습니다.'
      } else if (reason.startsWith('status_')) {
        errorMessage = '이미 사용된 초대장입니다.'
      }

      return { valid: false, error: errorMessage }
    }

    // 초대장 객체 생성
    const invitation = Invitation.create({
      id: validation.id!,
      tenantId: validation.tenant_id!,
      invitedBy: validation.created_by!,
      email: Email.create(validation.email!),
      roleCode: validation.role_code!,
      token: InvitationToken.create(validation.token!),
      status: validation.status as 'pending' | 'accepted' | 'rejected' | 'expired',
      expiresAt: new Date(validation.expires_at!),
      createdAt: new Date(validation.created_at!),
    })

    return { valid: true, invitation }
  }

  /**
   * Save invitation (create or update)
   */
  async save(invitation: Invitation): Promise<Invitation> {
    const row = this.mapToRow(invitation)

    const { data, error } = await this.dataSource
      .from('invitations')
      .upsert(row)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to save invitation: ${error?.message || 'Unknown error'}`)
    }

    return this.mapToEntity(data as InvitationRow)
  }

  /**
   * Update invitation
   */
  async update(invitation: Invitation): Promise<Invitation> {
    const row = this.mapToRow(invitation)

    const { data, error } = await this.dataSource
      .from('invitations')
      .update(row)
      .eq('id', invitation.getId())
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to update invitation: ${error?.message || 'Unknown error'}`)
    }

    return this.mapToEntity(data as InvitationRow)
  }

  /**
   * Delete invitation (soft delete)
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.dataSource
      .from('invitations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete invitation: ${error.message}`)
    }
  }

  /**
   * Accept invitation
   */
  async accept(id: string, userId: string): Promise<Invitation> {
    const invitation = await this.findById(id)
    if (!invitation) {
      throw new Error('Invitation not found')
    }

    const acceptedInvitation = invitation.accept(userId)
    return this.update(acceptedInvitation)
  }

  /**
   * Reject invitation
   */
  async reject(id: string): Promise<Invitation> {
    const invitation = await this.findById(id)
    if (!invitation) {
      throw new Error('Invitation not found')
    }

    const rejectedInvitation = invitation.reject()
    return this.update(rejectedInvitation)
  }

  /**
   * Expire old invitations (batch operation)
   */
  async expireOldInvitations(): Promise<number> {
    const { data, error } = await this.dataSource
      .from('invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .is('deleted_at', null)
      .select('id')

    if (error) {
      console.error('Failed to expire old invitations:', error)
      return 0
    }

    return (data as any[] || []).length
  }

  /**
   * Map database row to Invitation entity
   */
  private mapToEntity(row: InvitationRow): Invitation {
    const props: CreateInvitationProps = {
      id: row.id,
      tenantId: row.tenant_id,
      invitedBy: row.invited_by,
      email: Email.create(row.email),
      roleCode: row.role_code,
      token: InvitationToken.create(row.token),
      status: row.status,
      expiresAt: new Date(row.expires_at),
      acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
      acceptedBy: row.accepted_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    }

    return Invitation.create(props)
  }

  /**
   * Map Invitation entity to database row
   */
  private mapToRow(invitation: Invitation): Partial<InvitationRow> {
    return {
      id: invitation.getId(),
      tenant_id: invitation.getTenantId(),
      invited_by: invitation.getInvitedBy(),
      email: invitation.getEmail().getValue(),
      role_code: invitation.getRoleCode(),
      token: invitation.getToken().getValue(),
      status: invitation.getStatus(),
      expires_at: invitation.getExpiresAt().toISOString(),
      accepted_at: invitation.getAcceptedAt()?.toISOString() ?? null,
      accepted_by: invitation.getAcceptedBy(),
      updated_at: new Date().toISOString(),
    }
  }
}
