/**
 * Teaching Resources Management Server Actions
 *
 * 강사 공유 자료 관리의 모든 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Validation Schemas
// ============================================================================

const createResourceSchema = z.object({
  title: z.string().min(1, '자료명은 필수입니다'),
  description: z.string().optional(),
  category: z.enum(['teaching_material', 'worksheet', 'exam', 'reference', 'other']),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  fileType: z.string().optional(),
  externalUrl: z.string().url().optional(),
  isPublic: z.boolean().optional(),
  sharedWith: z.array(z.string().uuid()).optional(),
})

const updateResourceSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, '자료명은 필수입니다').optional(),
  description: z.string().optional().nullable(),
  category: z.enum(['teaching_material', 'worksheet', 'exam', 'reference', 'other']).optional(),
  subject: z.string().optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  isPublic: z.boolean().optional(),
  sharedWith: z.array(z.string().uuid()).optional().nullable(),
})

// ============================================================================
// Resource Management
// ============================================================================

/**
 * Get all teaching resources
 *
 * @param options - Filter options
 * @returns Resource list or error
 */
export async function getTeachingResources(options?: {
  category?: string
  subject?: string
  createdBy?: string
  isPublic?: boolean
  includeShared?: boolean
  limit?: number
}) {
  try {
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('teaching_resources')
      .select('*, users!teaching_resources_created_by_fkey(id, name)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (options?.category) {
      query = query.eq('category', options.category)
    }
    if (options?.subject) {
      query = query.eq('subject', options.subject)
    }
    if (options?.createdBy) {
      query = query.eq('created_by', options.createdBy)
    }
    if (options?.isPublic !== undefined) {
      query = query.eq('is_public', options.isPublic)
    }

    // If includeShared is true, filter for resources shared with current user
    if (options?.includeShared) {
      // Use OR: resources I created OR public resources OR shared with me
      query = query.or(
        `created_by.eq.${userId},is_public.eq.true,shared_with.cs.{${userId}}`
      )
    }

    query = query.order('created_at', { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getTeachingResources] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get a single teaching resource by ID
 *
 * @param id - Resource ID
 * @returns Resource or error
 */
export async function getTeachingResourceById(id: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('teaching_resources')
      .select('*, users!teaching_resources_created_by_fkey(id, name)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('자료를 찾을 수 없습니다')
    }

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[getTeachingResourceById] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create a new teaching resource
 *
 * @param input - Resource data
 * @returns Created resource or error
 */
export async function createTeachingResource(
  input: z.infer<typeof createResourceSchema>
) {
  try {
    const validated = createResourceSchema.parse(input)
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Validate that either fileUrl or externalUrl is provided
    if (!validated.fileUrl && !validated.externalUrl) {
      throw new Error('파일 또는 외부 링크 중 하나는 필수입니다')
    }

    const { data, error } = await supabase
      .from('teaching_resources')
      .insert({
        tenant_id: tenantId,
        title: validated.title,
        description: validated.description || null,
        category: validated.category,
        subject: validated.subject || null,
        grade_level: validated.gradeLevel || null,
        file_url: validated.fileUrl || null,
        file_name: validated.fileName || null,
        file_size: validated.fileSize ?? null,
        file_type: validated.fileType || null,
        external_url: validated.externalUrl || null,
        is_public: validated.isPublic ?? false,
        shared_with: validated.sharedWith || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/resources')

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createTeachingResource] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update a teaching resource
 *
 * @param input - Resource data with ID
 * @returns Updated resource or error
 */
export async function updateTeachingResource(
  input: z.infer<typeof updateResourceSchema>
) {
  try {
    const validated = updateResourceSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validated.title !== undefined) {
      updateData.title = validated.title
    }
    if (validated.description !== undefined) {
      updateData.description = validated.description
    }
    if (validated.category !== undefined) {
      updateData.category = validated.category
    }
    if (validated.subject !== undefined) {
      updateData.subject = validated.subject
    }
    if (validated.gradeLevel !== undefined) {
      updateData.grade_level = validated.gradeLevel
    }
    if (validated.externalUrl !== undefined) {
      updateData.external_url = validated.externalUrl
    }
    if (validated.isPublic !== undefined) {
      updateData.is_public = validated.isPublic
    }
    if (validated.sharedWith !== undefined) {
      updateData.shared_with = validated.sharedWith
    }

    const { data, error } = await supabase
      .from('teaching_resources')
      .update(updateData)
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('자료를 찾을 수 없습니다')
    }

    revalidatePath('/resources')
    revalidatePath(`/resources/${validated.id}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateTeachingResource] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete a teaching resource (soft delete)
 *
 * @param id - Resource ID
 * @returns Success or error
 */
export async function deleteTeachingResource(id: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Note: This does NOT delete the file from Storage
    // File cleanup should be done separately if needed
    const { error } = await supabase
      .from('teaching_resources')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    revalidatePath('/resources')

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[deleteTeachingResource] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Share a resource with specific users
 *
 * @param id - Resource ID
 * @param userIds - Array of user IDs to share with
 * @returns Updated resource or error
 */
export async function shareResource(id: string, userIds: string[]) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('teaching_resources')
      .update({
        shared_with: userIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('자료를 찾을 수 없습니다')
    }

    revalidatePath('/resources')
    revalidatePath(`/resources/${id}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[shareResource] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Make a resource public
 *
 * @param id - Resource ID
 * @param isPublic - Public status
 * @returns Updated resource or error
 */
export async function toggleResourcePublic(id: string, isPublic: boolean) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('teaching_resources')
      .update({
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('자료를 찾을 수 없습니다')
    }

    revalidatePath('/resources')
    revalidatePath(`/resources/${id}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[toggleResourcePublic] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get resources shared with the current user
 *
 * @returns Shared resources or error
 */
export async function getSharedWithMe() {
  try {
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('teaching_resources')
      .select('*, users!teaching_resources_created_by_fkey(id, name)')
      .eq('tenant_id', tenantId)
      .contains('shared_with', [userId])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getSharedWithMe] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get my resources (created by me)
 *
 * @returns My resources or error
 */
export async function getMyResources() {
  try {
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('teaching_resources')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('created_by', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getMyResources] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
