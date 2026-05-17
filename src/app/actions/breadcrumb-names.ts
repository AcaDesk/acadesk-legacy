'use server'

import { withServerAction } from '@/lib/server-action-helpers'

type BreadcrumbEntity =
  | 'student'
  | 'guardian'
  | 'class'
  | 'exam'
  | 'textbook'
  | 'consultation'
  | 'reportStudent'

const TABLE_BY_ENTITY: Record<
  BreadcrumbEntity,
  { table: string; column: string }
> = {
  student: { table: 'students', column: 'name' },
  guardian: { table: 'guardians', column: 'name' },
  class: { table: 'classes', column: 'name' },
  exam: { table: 'exams', column: 'name' },
  textbook: { table: 'textbooks', column: 'title' },
  consultation: { table: 'consultations', column: 'title' },
  reportStudent: { table: 'reports', column: '' },
}

export async function getBreadcrumbName(entity: BreadcrumbEntity, id: string) {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      if (entity === 'reportStudent') {
        const { data, error } = await serviceClient
          .from('reports')
          .select('students(name)')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single<{ students: { name: string } | null }>()
        if (error) throw error
        return data?.students?.name ?? null
      }

      const { table, column } = TABLE_BY_ENTITY[entity]
      const { data, error } = await serviceClient
        .from(table)
        .select(column)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single<Record<string, string | null>>()
      if (error) throw error
      return data?.[column] ?? null
    },
    { actionName: `getBreadcrumbName:${entity}`, defaultValue: null },
  )
}
