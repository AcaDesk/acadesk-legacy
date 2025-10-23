/**
 * TODO Template Management Server Actions
 *
 * TODO 템플릿 관리의 모든 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
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

const createTodoTemplateSchema = z.object({
  title: z.string().min(1, '과제명은 필수입니다'),
  description: z.string().optional(),
  subject: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  active: z.boolean().optional(),
})

const updateTodoTemplateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, '과제명은 필수입니다').optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  estimatedDurationMinutes: z.number().int().positive().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  active: z.boolean().optional(),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get all TODO templates
 *
 * @returns Template list or error
 */
export async function getTodoTemplates() {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = await createServiceRoleClient()

    // 3. Query templates
    const { data, error } = await supabase
      .from('todo_templates')
      .select('*')
      .eq('tenant_id', tenantId)
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
    console.error('[getTodoTemplates] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get a single TODO template by ID
 *
 * @param id - Template ID
 * @returns Template or error
 */
export async function getTodoTemplateById(id: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = await createServiceRoleClient()

    // 3. Query template
    const { data, error } = await supabase
      .from('todo_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('템플릿을 찾을 수 없습니다')
    }

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[getTodoTemplateById] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create a new TODO template
 *
 * @param input - Template data
 * @returns Created template or error
 */
export async function createTodoTemplate(
  input: z.infer<typeof createTodoTemplateSchema>
) {
  try {
    // 1. Validate input
    const validated = createTodoTemplateSchema.parse(input)

    // 2. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 3. Create service_role client
    const supabase = await createServiceRoleClient()

    // 4. Insert template
    const { data, error } = await supabase
      .from('todo_templates')
      .insert({
        tenant_id: tenantId,
        title: validated.title,
        description: validated.description || null,
        subject: validated.subject || null,
        day_of_week: validated.dayOfWeek ?? null,
        estimated_duration_minutes: validated.estimatedDurationMinutes ?? null,
        priority: validated.priority,
        active: validated.active ?? true, // Default to true
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // 5. Revalidate
    revalidatePath('/todos/templates')

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createTodoTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update a TODO template
 *
 * @param input - Template data with ID
 * @returns Updated template or error
 */
export async function updateTodoTemplate(
  input: z.infer<typeof updateTodoTemplateSchema>
) {
  try {
    // 1. Validate input
    const validated = updateTodoTemplateSchema.parse(input)

    // 2. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 3. Create service_role client
    const supabase = await createServiceRoleClient()

    // 4. Prepare update data (only include fields that were provided)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validated.title !== undefined) {
      updateData.title = validated.title
    }
    if (validated.description !== undefined) {
      updateData.description = validated.description || null
    }
    if (validated.subject !== undefined) {
      updateData.subject = validated.subject || null
    }
    if (validated.dayOfWeek !== undefined) {
      updateData.day_of_week = validated.dayOfWeek
    }
    if (validated.estimatedDurationMinutes !== undefined) {
      updateData.estimated_duration_minutes = validated.estimatedDurationMinutes
    }
    if (validated.priority !== undefined) {
      updateData.priority = validated.priority
    }
    if (validated.active !== undefined) {
      updateData.active = validated.active
    }

    // 5. Update template
    const { data, error } = await supabase
      .from('todo_templates')
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
      throw new Error('템플릿을 찾을 수 없습니다')
    }

    // 6. Revalidate
    revalidatePath('/todos/templates')
    revalidatePath(`/todos/templates/${validated.id}/edit`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateTodoTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete a TODO template (soft delete)
 *
 * @param id - Template ID
 * @returns Success or error
 */
export async function deleteTodoTemplate(id: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = await createServiceRoleClient()

    // 3. Soft delete (set deleted_at timestamp)
    const { error } = await supabase
      .from('todo_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    // 4. Revalidate
    revalidatePath('/todos/templates')

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[deleteTodoTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Toggle template active status
 *
 * @param id - Template ID
 * @returns Updated template or error
 */
export async function toggleTodoTemplateActive(id: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = await createServiceRoleClient()

    // 3. Get current status
    const { data: current, error: fetchError } = await supabase
      .from('todo_templates')
      .select('active')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!current) {
      throw new Error('템플릿을 찾을 수 없습니다')
    }

    // 4. Toggle active status
    const { data, error } = await supabase
      .from('todo_templates')
      .update({
        active: !current.active,
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

    // 5. Revalidate
    revalidatePath('/todos/templates')

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[toggleTodoTemplateActive] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
