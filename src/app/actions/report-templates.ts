/**
 * Report Template Server Actions
 *
 * 리포트 코멘트 템플릿 관리 Server Actions
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff, verifyPermission } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import type {
  ReportTemplate,
  ReportTemplateRow,
  ReportTemplateCategory,
  TemplateCondition,
  ReportContextData,
  CategoryTemplates,
  CreateReportTemplateInput,
  UpdateReportTemplateInput,
  ReportTemplateResult,
} from '@/core/types/report-template.types'

// ============================================================================
// Validation Schemas
// ============================================================================

const createReportTemplateSchema = z.object({
  category: z.enum(['summary', 'strengths', 'improvements', 'nextGoals']),
  title: z.string().min(1, '제목은 필수입니다').max(50, '제목은 50자 이내로 입력하세요'),
  content: z
    .string()
    .min(1, '내용은 필수입니다')
    .max(500, '내용은 500자 이내로 입력하세요'),
  conditions: z.any().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

const updateReportTemplateSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(['summary', 'strengths', 'improvements', 'nextGoals']).optional(),
  title: z.string().min(1).max(50).optional(),
  content: z.string().min(1).max(500).optional(),
  conditions: z.any().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * DB 행을 ReportTemplate 객체로 변환
 */
function mapRowToTemplate(row: ReportTemplateRow): ReportTemplate {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    category: row.category,
    title: row.title,
    content: row.content,
    conditions: row.conditions,
    isSystem: row.is_system,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * 조건이 컨텍스트와 매칭되는지 확인
 */
function matchesConditions(
  conditions: TemplateCondition | null,
  context: ReportContextData
): boolean {
  if (!conditions) return false

  // 출석률 체크
  if (conditions.attendanceRate) {
    const { min, max } = conditions.attendanceRate
    if (min !== undefined && context.attendanceRate < min) return false
    if (max !== undefined && context.attendanceRate > max) return false
  }

  // 숙제 완료율 체크
  if (conditions.homeworkRate) {
    const { min, max } = conditions.homeworkRate
    if (min !== undefined && context.homeworkRate < min) return false
    if (max !== undefined && context.homeworkRate > max) return false
  }

  // 평균 점수 체크
  if (conditions.averageScore) {
    const { min, max } = conditions.averageScore
    if (min !== undefined && context.averageScore < min) return false
    if (max !== undefined && context.averageScore > max) return false
  }

  // 성적 변화 체크
  if (conditions.scoreChange) {
    const { direction, threshold = 5 } = conditions.scoreChange
    const change = context.scoreChange

    if (direction === 'improving' && change < threshold) return false
    if (direction === 'declining' && change > -threshold) return false
    if (direction === 'stable' && Math.abs(change) >= threshold) return false
  }

  return true
}

// replaceTemplateVariables는 '@/core/types/report-template.types'에서 export됨

// ============================================================================
// Server Actions - Read
// ============================================================================

/**
 * 모든 템플릿 조회 (시스템 + 테넌트)
 * 카테고리별로 그룹화하여 반환
 */
export async function getReportTemplates(
  context?: ReportContextData
): Promise<ReportTemplateResult<CategoryTemplates[]>> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 시스템 템플릿 + 테넌트 템플릿 조회
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .or(`is_system.eq.true,tenant_id.eq.${tenantId}`)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    if (error) throw error

    const templates = ((data as ReportTemplateRow[]) || []).map(mapRowToTemplate)

    // 카테고리별 레이블/아이콘
    const categoryLabels: Record<ReportTemplateCategory, string> = {
      summary: '총평',
      strengths: '잘한 점',
      improvements: '보완할 점',
      nextGoals: '다음 목표',
    }

    const categoryIcons: Record<ReportTemplateCategory, string> = {
      summary: '📝',
      strengths: '✨',
      improvements: '📈',
      nextGoals: '🎯',
    }

    // 카테고리별 그룹화
    const categories: ReportTemplateCategory[] = [
      'summary',
      'strengths',
      'improvements',
      'nextGoals',
    ]

    const groupedTemplates: CategoryTemplates[] = categories.map((category) => {
      const categoryTemplates = templates.filter((t) => t.category === category)

      // 조건 매칭하여 추천 템플릿 분류
      const recommendedTemplates = context
        ? categoryTemplates.filter((t) => matchesConditions(t.conditions, context))
        : []

      return {
        category,
        label: categoryLabels[category],
        icon: categoryIcons[category],
        templates: categoryTemplates,
        recommendedTemplates,
      }
    })

    return {
      success: true,
      data: groupedTemplates,
      error: null,
    }
  } catch (error) {
    console.error('[getReportTemplates] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 테넌트 전용 템플릿만 조회 (관리 UI용)
 */
export async function getTenantReportTemplates(): Promise<
  ReportTemplateResult<ReportTemplate[]>
> {
  try {
    // 디버깅: 인증 완전 우회, 빈 배열 반환
    return {
      success: true,
      data: [],
      error: null,
    }
  } catch (error) {
    console.error('[getTenantReportTemplates] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 시스템 기본 템플릿만 조회
 */
export async function getSystemReportTemplates(): Promise<
  ReportTemplateResult<ReportTemplate[]>
> {
  try {
    // 디버깅: DB 호출도 완전히 우회
    return {
      success: true,
      data: [],
      error: null,
    }
  } catch (error) {
    console.error('[getSystemReportTemplates] Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Server Actions - CUD
// ============================================================================

/**
 * 테넌트 전용 템플릿 생성
 */
export async function createReportTemplate(
  input: CreateReportTemplateInput
): Promise<ReportTemplateResult<ReportTemplate>> {
  try {
    const validated = createReportTemplateSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        tenant_id: tenantId,
        category: validated.category,
        title: validated.title,
        content: validated.content,
        conditions: validated.conditions || null,
        is_system: false,
        is_active: validated.isActive ?? true,
        sort_order: validated.sortOrder ?? 0,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/settings/report-templates')
    revalidatePath('/reports')

    return {
      success: true,
      data: mapRowToTemplate(data as ReportTemplateRow),
      error: null,
    }
  } catch (error) {
    console.error('[createReportTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 테넌트 전용 템플릿 수정
 */
export async function updateReportTemplate(
  input: UpdateReportTemplateInput
): Promise<ReportTemplateResult<ReportTemplate>> {
  try {
    const validated = updateReportTemplateSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 수정할 필드만 준비
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validated.category !== undefined) updateData.category = validated.category
    if (validated.title !== undefined) updateData.title = validated.title
    if (validated.content !== undefined) updateData.content = validated.content
    if (validated.conditions !== undefined) updateData.conditions = validated.conditions
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive
    if (validated.sortOrder !== undefined) updateData.sort_order = validated.sortOrder

    const { data, error } = await supabase
      .from('report_templates')
      .update(updateData)
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .eq('is_system', false) // 시스템 템플릿은 수정 불가
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      throw new Error('템플릿을 찾을 수 없거나 수정 권한이 없습니다.')
    }

    revalidatePath('/settings/report-templates')
    revalidatePath('/reports')

    return {
      success: true,
      data: mapRowToTemplate(data as ReportTemplateRow),
      error: null,
    }
  } catch (error) {
    console.error('[updateReportTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 테넌트 전용 템플릿 삭제 (soft delete)
 */
export async function deleteReportTemplate(
  id: string
): Promise<ReportTemplateResult<null>> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('report_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_system', false) // 시스템 템플릿은 삭제 불가
      .is('deleted_at', null)

    if (error) throw error

    revalidatePath('/settings/report-templates')
    revalidatePath('/reports')

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[deleteReportTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 템플릿 활성화/비활성화 토글
 */
export async function toggleReportTemplateActive(
  id: string
): Promise<ReportTemplateResult<ReportTemplate>> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 현재 상태 조회
    const { data: current, error: fetchError } = await supabase
      .from('report_templates')
      .select('is_active')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_system', false)
      .is('deleted_at', null)
      .single()

    if (fetchError) throw fetchError

    if (!current) {
      throw new Error('템플릿을 찾을 수 없습니다.')
    }

    // 토글
    const { data, error } = await supabase
      .from('report_templates')
      .update({
        is_active: !current.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_system', false)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/settings/report-templates')
    revalidatePath('/reports')

    return {
      success: true,
      data: mapRowToTemplate(data as ReportTemplateRow),
      error: null,
    }
  } catch (error) {
    console.error('[toggleReportTemplateActive] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
