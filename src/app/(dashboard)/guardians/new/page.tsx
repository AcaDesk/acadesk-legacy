'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Users, UserPlus, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import {
  GuardianFormStandalone,
  type GuardianFormValues
} from '@/components/features/guardians/guardian-form'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface Student {
  id: string
  student_code: string
  users: {
    name: string
  } | null
}

export default function NewGuardianPage() {
  // 피처 플래그 상태 체크
  const featureStatus = FEATURES.guardianManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="보호자 추가" description="새로운 보호자 정보를 등록하고 학생과 연결하여 효과적인 학부모 관리를 할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="보호자 추가" reason="보호자 관리 시스템 업데이트가 진행 중입니다." />;
  }

  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

  useEffect(() => {
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_code,
          users (
            name
          )
        `)
        .is('deleted_at', null)
        .order('student_code')

      if (error) throw error
      setStudents(data as Student[])
    } catch (error) {
      console.error('학생 목록 조회 오류:', error)
    }
  }

  const onSubmit = async (data: GuardianFormValues) => {
    if (!currentUser) {
      toast({
        title: '인증 오류',
        description: '로그인 정보를 확인할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {

      // 1. users 테이블에 보호자 생성
      const { data: newUser, error: userCreateError } = await supabase
        .from('users')
        .insert({
          tenant_id: currentUser.tenantId,
          email: data.email || null,
          name: data.name,
          phone: data.phone,
          role_code: 'guardian',
        })
        .select()
        .maybeSingle()

      if (userCreateError || !newUser) {
        throw new Error(`사용자 레코드를 생성할 수 없습니다: ${userCreateError?.message}`)
      }

      // 2. guardians 테이블에 보호자 정보 저장
      const { data: newGuardian, error: guardianError } = await supabase
        .from('guardians')
        .insert({
          tenant_id: currentUser.tenantId,
          user_id: newUser.id,
          relationship: data.relationship,
        })
        .select()
        .maybeSingle()

      if (guardianError || !newGuardian) {
        throw new Error(`보호자 정보를 생성할 수 없습니다: ${guardianError?.message}`)
      }

      // 3. 선택된 학생들과 연결
      if (selectedStudents.length > 0) {
        const guardianStudentRecords = selectedStudents.map((studentId) => ({
          tenant_id: currentUser.tenantId,
          student_id: studentId,
          guardian_id: newGuardian.id,
          relationship: data.relationship,
          is_primary: false,
        }))

        const { error: linkError } = await supabase
          .from('guardian_students')
          .insert(guardianStudentRecords)

        if (linkError) {
          console.warn('학생 연결 오류:', linkError)
        }
      }

      toast({
        title: '보호자 추가 완료',
        description: `${data.name} 보호자가 추가되었습니다.`,
      })

      router.push('/guardians')
      router.refresh()
    } catch (error: any) {
      console.error('보호자 추가 오류:', error)
      toast({
        title: '보호자 추가 실패',
        description: error.message || '보호자를 추가하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/guardians" className="hover:text-foreground transition-colors">
              보호자 관리
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">새 보호자</span>
          </nav>

          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserPlus className="h-8 w-8" />
              보호자 추가
            </h1>
            <p className="text-muted-foreground">새로운 보호자 정보를 입력하세요</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>보호자 정보</CardTitle>
              <CardDescription>
                보호자의 기본 정보를 입력해주세요. 필수 항목은 * 표시되어 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Guardian Form */}
              <GuardianFormStandalone
                onSubmit={onSubmit}
                submitLabel="보호자 추가"
                loading={loading}
                onCancel={() => router.push('/guardians')}
              />

              {/* Student Selection */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="space-y-3 pt-6 border-t"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label>연결할 학생 선택 (선택사항)</Label>
                </div>

                <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto bg-muted/30">
                  {students.length > 0 ? (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {students.map((student, index) => (
                          <motion.div
                            key={student.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className="flex items-center space-x-3 p-2 rounded-md hover:bg-background transition-colors"
                          >
                            <Checkbox
                              id={`student-${student.id}`}
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={() => handleStudentToggle(student.id)}
                            />
                            <label
                              htmlFor={`student-${student.id}`}
                              className="text-sm font-medium leading-none cursor-pointer flex-1"
                            >
                              {student.users?.name || '이름 없음'}
                            </label>
                            <Badge variant="outline" className="text-xs">
                              {student.student_code}
                            </Badge>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">등록된 학생이 없습니다.</p>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {selectedStudents.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2"
                    >
                      <Badge variant="secondary" className="px-3 py-1">
                        {selectedStudents.length}명 선택됨
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageWrapper>
  )
}
