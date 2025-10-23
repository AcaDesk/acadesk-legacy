/**
 * TODO Template Server Actions
 *
 * 모든 TODO 템플릿 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 * 클라이언트에서 직접 Supabase CUD를 사용하지 않습니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { SupabaseDataSource } from '@infra/db/datasource/SupabaseDataSource'
import { TodoTemplateRepository } from '@infra/db/repositories/todo-template.repository'
import { TodoTemplate } from '@core/domain/entities/TodoTemplate'
import { Priority } from '@core/domain/value-objects/Priority'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Validation Schemas
// ============================================================================

const createTodoTemplateSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다'),
  description: z.string().optional(),
  subject: z.string().optional(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})

const updateTodoTemplateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, '제목은 필수입니다').optional(),
  description: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  estimatedDurationMinutes: z.number().int().positive().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  active: z.boolean().optional(),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get all TODO templates for current tenant
 *
 * @returns List of templates or error
 */
export async function getTodoTemplates() {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client for query
    const supabase = await createServiceRoleClient()

    // 3. Query templates
    const { data, error } = await supabase
      .from('todo_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('title', { ascending: true })

    if (error) throw error

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
 * Create a new TODO template
 *
 * @param input - Template data
 * @returns Created template or error
 */
export async function createTodoTemplate(
  input: z.infer<typeof createTodoTemplateSchema>
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Validate input
    const validated = createTodoTemplateSchema.parse(input)

    // 3. Create service_role client and repository
    const serviceClient = createServiceRoleClient()
    const dataSource = new SupabaseDataSource(serviceClient)
    const repository = new TodoTemplateRepository(dataSource)

    // 4. Create entity
    const template = TodoTemplate.create({
      tenantId,
      title: validated.title,
      description: validated.description ?? null,
      subject: validated.subject ?? null,
      estimatedDurationMinutes: validated.estimatedDurationMinutes ?? null,
      priority: Priority.fromString(validated.priority),
    })

    // 5. Save with service_role (bypasses RLS)
    const savedTemplate = await repository.save(template)

    // 6. Revalidate pages
    revalidatePath('/todos/templates')

    return {
      success: true,
      data: savedTemplate.toDTO(),
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
 * Update an existing TODO template
 *
 * @param input - Template update data
 * @returns Updated template or error
 */
export async function updateTodoTemplate(
  input: z.infer<typeof updateTodoTemplateSchema>
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Validate input
    const validated = updateTodoTemplateSchema.parse(input)

    // 3. Create service_role client and repository
    const serviceClient = createServiceRoleClient()
    const dataSource = new SupabaseDataSource(serviceClient)
    const repository = new TodoTemplateRepository(dataSource)

    // 4. Fetch existing template
    const existingTemplate = await repository.findById(validated.id)
    if (!existingTemplate) {
      return {
        success: false,
        data: null,
        error: '템플릿을 찾을 수 없습니다',
      }
    }

    // 5. Verify tenant ownership
    if (existingTemplate.tenantId !== tenantId) {
      return {
        success: false,
        data: null,
        error: '권한이 없습니다',
      }
    }

    // 6. Update entity
    const updatedTemplate = TodoTemplate.fromDatabase({
      id: existingTemplate.id,
      tenantId: existingTemplate.tenantId,
      title: validated.title ?? existingTemplate.title,
      description: validated.description !== undefined ? validated.description : existingTemplate.description,
      subject: validated.subject !== undefined ? validated.subject : existingTemplate.subject,
      estimatedDurationMinutes:
        validated.estimatedDurationMinutes !== undefined
          ? validated.estimatedDurationMinutes
          : existingTemplate.estimatedDurationMinutes,
      priority:
        validated.priority
          ? Priority.fromString(validated.priority)
          : existingTemplate.priority,
      active: validated.active ?? existingTemplate.active,
      createdAt: existingTemplate.createdAt,
      updatedAt: new Date(),
    })

    // 7. Save with service_role
    const savedTemplate = await repository.save(updatedTemplate)

    // 8. Revalidate pages
    revalidatePath('/todos/templates')
    revalidatePath('/todos/planner')

    return {
      success: true,
      data: savedTemplate.toDTO(),
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
 * Toggle template active status
 *
 * @param id - Template ID
 * @returns Updated template or error
 */
export async function toggleTodoTemplateActive(id: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client and repository
    const serviceClient = createServiceRoleClient()
    const dataSource = new SupabaseDataSource(serviceClient)
    const repository = new TodoTemplateRepository(dataSource)

    // 3. Fetch existing template
    const existingTemplate = await repository.findById(id)
    if (!existingTemplate) {
      return {
        success: false,
        data: null,
        error: '템플릿을 찾을 수 없습니다',
      }
    }

    // 4. Verify tenant ownership
    if (existingTemplate.tenantId !== tenantId) {
      return {
        success: false,
        data: null,
        error: '권한이 없습니다',
      }
    }

    // 5. Toggle active status
    const updatedTemplate = TodoTemplate.fromDatabase({
      id: existingTemplate.id,
      tenantId: existingTemplate.tenantId,
      title: existingTemplate.title,
      description: existingTemplate.description,
      subject: existingTemplate.subject,
      estimatedDurationMinutes: existingTemplate.estimatedDurationMinutes,
      priority: existingTemplate.priority,
      active: !existingTemplate.active,
      createdAt: existingTemplate.createdAt,
      updatedAt: new Date(),
    })

    // 6. Save with service_role
    const savedTemplate = await repository.save(updatedTemplate)

    // 7. Revalidate pages
    revalidatePath('/todos/templates')
    revalidatePath('/todos/planner')

    return {
      success: true,
      data: savedTemplate.toDTO(),
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

/**
 * Delete a TODO template (soft delete - sets active to false)
 *
 * @param id - Template ID
 * @returns Success or error
 */
export async function deleteTodoTemplate(id: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client and repository
    const serviceClient = createServiceRoleClient()
    const dataSource = new SupabaseDataSource(serviceClient)
    const repository = new TodoTemplateRepository(dataSource)

    // 3. Fetch existing template
    const existingTemplate = await repository.findById(id)
    if (!existingTemplate) {
      return {
        success: false,
        error: '템플릿을 찾을 수 없습니다',
      }
    }

    // 4. Verify tenant ownership
    if (existingTemplate.tenantId !== tenantId) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    // 5. Delete (soft delete via repository)
    await repository.delete(id)

    // 6. Revalidate pages
    revalidatePath('/todos/templates')
    revalidatePath('/todos/planner')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[deleteTodoTemplate] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Hard delete a TODO template (permanent deletion)
 *
 * ⚠️ Only for owner role, removes record from database permanently
 *
 * @param id - Template ID
 * @returns Success or error
 */
export async function hardDeleteTodoTemplate(id: string) {
  try {
    // 1. Verify owner role (only owners can hard delete)
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()
    const dataSource = new SupabaseDataSource(serviceClient)
    const repository = new TodoTemplateRepository(dataSource)

    // 3. Fetch existing template
    const existingTemplate = await repository.findById(id)
    if (!existingTemplate) {
      return {
        success: false,
        error: '템플릿을 찾을 수 없습니다',
      }
    }

    // 4. Verify tenant ownership
    if (existingTemplate.tenantId !== tenantId) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    // 5. Hard delete (direct database operation)
    const { error } = await serviceClient
      .from('todo_templates')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    // 6. Revalidate pages
    revalidatePath('/todos/templates')
    revalidatePath('/todos/planner')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[hardDeleteTodoTemplate] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
