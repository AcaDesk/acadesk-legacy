'use client'

import { useQuery } from '@tanstack/react-query'
import { getStudentGuardians, getAvailableGuardians } from '@/app/actions/guardians'
import { queryKeys } from '@/lib/query-keys'

export interface LinkedGuardian {
  id: string
  user_id: string
  name: string
  phone: string
  email: string | null
  relationship: string
  address: string | null
  occupation: string | null
  relation: string
  is_primary_contact: boolean
  receives_notifications: boolean
  receives_billing: boolean
  can_pickup: boolean
}

export function useStudentGuardiansQuery(studentId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.students.guardians(studentId),
    queryFn: async (): Promise<LinkedGuardian[]> => {
      const result = await getStudentGuardians(studentId)
      if (!result.success || !result.data) {
        throw new Error(result.error || '보호자 목록 조회 실패')
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.data.map((sg: any) => ({
        id: sg.guardians?.id || '',
        user_id: sg.guardians?.user_id || '',
        name: sg.guardians?.users?.name || '',
        phone: sg.guardians?.users?.phone || '',
        email: sg.guardians?.users?.email || null,
        relationship: sg.guardians?.relationship || '',
        address: sg.guardians?.users?.address || null,
        occupation: sg.guardians?.users?.occupation || null,
        relation: sg.relation,
        is_primary_contact: sg.is_primary || false,
        receives_notifications: true,
        receives_billing: true,
        can_pickup: true,
      }))
    },
    enabled: enabled && !!studentId,
  })
}

export interface AvailableGuardian {
  id: string
  name: string
  phone: string
}

export function useAvailableGuardiansQuery(studentId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.students.availableGuardians(studentId),
    queryFn: async (): Promise<AvailableGuardian[]> => {
      const result = await getAvailableGuardians(studentId)
      if (!result.success || !result.data) {
        throw new Error(result.error || '보호자 목록 조회 실패')
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.data.map((g: any) => ({
        id: g.id,
        name: g.users?.name || '',
        phone: g.users?.phone || '',
      }))
    },
    enabled: enabled && !!studentId,
  })
}
