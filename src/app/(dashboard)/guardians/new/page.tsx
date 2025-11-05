'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Label } from '@ui/label'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Users, UserPlus, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'motion/react'
import {
  GuardianFormStandalone,
  type GuardianFormValues
} from '@/components/features/guardians/guardian-form'
import { StudentSearch } from '@/components/features/students/student-search'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { createGuardian } from '@/app/actions/guardians'

export default function NewGuardianPage() {
  // All Hooks must be called before any early returns
  const [loading, setLoading] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const router = useRouter()
  const { toast } = useToast()

  const onSubmit = async (data: GuardianFormValues) => {
    setLoading(true)
    try {
      // Use Server Action
      const result = await createGuardian({
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        relationship: data.relationship,
        occupation: data.occupation || null,
        address: data.address || null,
        student_ids: selectedStudents,
      })

      if (!result.success) {
        throw new Error(result.error || '보호자 추가 실패')
      }

      toast({
        title: '보호자 추가 완료',
        description: `${data.name} 보호자가 추가되었습니다.`,
      })

      router.push('/guardians')
      router.refresh()
    } catch (error: unknown) {
      console.error('보호자 추가 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '보호자를 추가하는 중 오류가 발생했습니다.'
      toast({
        title: '보호자 추가 실패',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.guardianManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="보호자 추가" description="새로운 보호자 정보를 등록하고 학생과 연결하여 효과적인 학부모 관리를 할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="보호자 추가" reason="보호자 관리 시스템 업데이트가 진행 중입니다." />;
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

                <StudentSearch
                  mode="multiple"
                  variant="checkbox-list"
                  value={selectedStudents}
                  onChange={setSelectedStudents}
                  searchable={true}
                  showSelectAll={true}
                  showSelectedCount={true}
                  placeholder="학생 검색..."
                  emptyMessage="등록된 학생이 없습니다"
                />
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageWrapper>
  )
}
