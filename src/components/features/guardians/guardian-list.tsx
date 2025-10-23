'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { GuardianTableImproved, type Guardian } from './guardian-table-improved'
import { getErrorMessage } from '@/lib/error-handlers'
import { getGuardiansWithDetails, deleteGuardian } from '@/app/actions/guardians'

export function GuardianList() {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()

  useEffect(() => {
    loadGuardians()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadGuardians() {
    try {
      setLoading(true)

      // Server Action을 통한 보호자 데이터 로드
      const result = await getGuardiansWithDetails()

      if (!result.success || !result.data) {
        throw new Error(result.error || '보호자 목록을 불러올 수 없습니다')
      }

      // GuardianWithDetails를 Guardian 형식으로 변환
      const formattedGuardians: Guardian[] = result.data.map((item) => ({
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
      // Server Action을 통한 보호자 삭제
      const result = await deleteGuardian(id)

      if (!result.success) {
        throw new Error(result.error || '보호자 삭제 실패')
      }

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
