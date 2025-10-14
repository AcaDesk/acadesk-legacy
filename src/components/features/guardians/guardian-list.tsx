'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { GuardianTableImproved, type Guardian } from './guardian-table-improved'

export function GuardianList() {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadGuardians()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadGuardians() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('guardians')
        .select(`
          id,
          relationship,
          users (
            name,
            email,
            phone
          ),
          guardian_students (
            relationship,
            is_primary,
            students (
              id,
              student_code,
              users (
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Map Supabase data to Guardian type (handle array joins)
      const mappedData: Guardian[] = (data || []).map((item) => ({
        id: item.id,
        relationship: item.relationship,
        users: Array.isArray(item.users) && item.users.length > 0
          ? item.users[0]
          : null,
        guardian_students: (item.guardian_students || []).map((gs) => ({
          relationship: gs.relationship,
          is_primary: gs.is_primary,
          students: Array.isArray(gs.students) && gs.students.length > 0
            ? {
                id: gs.students[0].id,
                student_code: gs.students[0].student_code,
                users: Array.isArray(gs.students[0].users) && gs.students[0].users.length > 0
                  ? gs.students[0].users[0]
                  : null,
              }
            : null,
        })),
      }))

      setGuardians(mappedData)
    } catch (error) {
      console.error('Error loading guardians:', error)
      toast({
        title: '데이터 로드 오류',
        description: '보호자 목록을 불러오는 중 오류가 발생했습니다.',
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
      const { error } = await supabase.from('guardians').delete().eq('id', id)

      if (error) throw error

      toast({
        title: '삭제 완료',
        description: `${name} 보호자가 삭제되었습니다.`,
      })

      loadGuardians()
    } catch (error) {
      console.error('Error deleting guardian:', error)
      toast({
        title: '삭제 오류',
        description: '보호자를 삭제하는 중 오류가 발생했습니다.',
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
