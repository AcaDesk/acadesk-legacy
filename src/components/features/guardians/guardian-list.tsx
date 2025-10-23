'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { GuardianTableImproved, type Guardian } from './guardian-table-improved'
import { getErrorMessage } from '@/lib/error-handlers'
import {
  createGetGuardiansWithDetailsUseCase,
  createDeleteGuardianUseCase,
} from '@/application/factories/guardianUseCaseFactory.client'

export function GuardianList() {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)

  const { toast } = useToast()

  // Load tenant ID
  useEffect(() => {
    async function loadTenantId() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (data?.tenant_id) {
          setTenantId(data.tenant_id)
        }
      }
    }
    loadTenantId()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tenantId) {
      loadGuardians()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  async function loadGuardians() {
    if (!tenantId) return

    try {
      setLoading(true)

      // Use Case를 통한 보호자 데이터 로드
      const useCase = createGetGuardiansWithDetailsUseCase()
      const { guardians: guardiansData, error } = await useCase.execute({ tenantId })

      if (error) throw error

      // GuardianWithDetails를 Guardian 형식으로 변환
      const formattedGuardians: Guardian[] = guardiansData.map((item) => ({
        id: item.guardian.id,
        relationship: item.guardian.relationship,
        users: item.userName
          ? {
              name: item.userName,
              email: item.userEmail,
              phone: item.userPhone,
            }
          : null,
        guardian_students: item.students.map((student) => ({
          relationship: student.relation || '',
          is_primary: student.isPrimary || false,
          students: {
            id: student.id,
            student_code: student.studentCode,
            users: {
              name: student.name,
            },
          },
        })),
      }))

      setGuardians(formattedGuardians)
    } catch (error) {
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 보호자를 삭제하시겠습니까?`)) {
      return
    }

    try {
      // Use Case를 통한 보호자 삭제
      const useCase = createDeleteGuardianUseCase()
      await useCase.execute(id)

      toast({
        title: '삭제 완료',
        description: `${name} 보호자가 삭제되었습니다.`,
      })

      loadGuardians()
    } catch (error) {
      toast({
        title: '삭제 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  return (
    <GuardianTableImproved
      data={guardians}
      loading={loading}
      onDelete={handleDelete}
    />
  )
}
