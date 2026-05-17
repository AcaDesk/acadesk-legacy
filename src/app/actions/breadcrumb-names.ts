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

export async function getBreadcrumbName(entity: BreadcrumbEntity, id: string) {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      switch (entity) {
        case 'student': {
          const { data, error } = await serviceClient
            .from('students')
            .select('name')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .maybeSingle<{ name: string | null }>()
          if (error) throw error
          return data?.name ?? null
        }
        case 'guardian': {
          const { data, error } = await serviceClient
            .from('guardians')
            .select('name')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .maybeSingle<{ name: string | null }>()
          if (error) throw error
          return data?.name ?? null
        }
        case 'class': {
          const { data, error } = await serviceClient
            .from('classes')
            .select('name')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .maybeSingle<{ name: string | null }>()
          if (error) throw error
          return data?.name ?? null
        }
        case 'exam': {
          const { data, error } = await serviceClient
            .from('exams')
            .select('name')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .maybeSingle<{ name: string | null }>()
          if (error) throw error
          return data?.name ?? null
        }
        case 'textbook': {
          const { data, error } = await serviceClient
            .from('textbooks')
            .select('title')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .maybeSingle<{ title: string | null }>()
          if (error) throw error
          return data?.title ?? null
        }
        case 'consultation': {
          const { data, error } = await serviceClient
            .from('consultations')
            .select('title')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .maybeSingle<{ title: string | null }>()
          if (error) throw error
          return data?.title ?? null
        }
        case 'reportStudent': {
          const { data, error } = await serviceClient
            .from('reports')
            .select('students(name)')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .maybeSingle<{ students: { name: string } | null }>()
          if (error) throw error
          return data?.students?.name ?? null
        }
      }
    },
    { actionName: `getBreadcrumbName:${entity}`, defaultValue: null },
  )
}
