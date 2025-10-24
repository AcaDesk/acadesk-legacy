/**
 * Academy Management Server Actions
 *
 * 학원 정보 조회 및 수정
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

const academySchema = z.object({
  name: z.string().min(1, '학원명은 필수입니다'),
  business_number: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('유효한 이메일을 입력하세요').nullable().optional(),
  address: z.string().nullable().optional(),
  website: z.string().url('유효한 URL을 입력하세요').nullable().optional(),
  timezone: z.string().default('Asia/Seoul'),
  currency: z.string().default('KRW'),
  settings: z.record(z.string(), z.any()).nullable().optional(),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get academy (tenant) information
 *
 * @returns Academy data or error
 */
export async function getAcademyInfo() {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = await createServiceRoleClient()

    // 3. Fetch tenant info
    const { data: academy, error } = await serviceClient
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (error || !academy) {
      return {
        success: false,
        data: null,
        error: '학원 정보를 찾을 수 없습니다',
      }
    }

    return {
      success: true,
      data: academy,
      error: null,
    }
  } catch (error) {
    console.error('[getAcademyInfo] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update academy (tenant) information
 *
 * @param input - Academy data to update
 * @returns Success or error
 */
export async function updateAcademyInfo(
  input: Partial<z.infer<typeof academySchema>>
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Validate input
    const validated = academySchema.partial().parse(input)

    // 3. Create service_role client
    const serviceClient = await createServiceRoleClient()

    // 4. Update tenant info
    const { error: updateError } = await serviceClient
      .from('tenants')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId)

    if (updateError) {
      throw updateError
    }

    // 5. Revalidate pages
    revalidatePath('/settings')
    revalidatePath('/settings/academy')
    revalidatePath('/profile')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[updateAcademyInfo] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update academy operating hours
 *
 * @param operatingHours - Operating hours configuration
 * @returns Success or error
 */
export async function updateOperatingHours(operatingHours: Record<string, any>) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = await createServiceRoleClient()

    // 3. Get current settings
    const { data: currentTenant } = await serviceClient
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single()

    // 4. Merge with current settings
    const updatedSettings = {
      ...(currentTenant?.settings || {}),
      operating_hours: operatingHours,
    }

    // 5. Update settings
    const { error: updateError } = await serviceClient
      .from('tenants')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId)

    if (updateError) {
      throw updateError
    }

    // 6. Revalidate pages
    revalidatePath('/settings/academy')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[updateOperatingHours] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
