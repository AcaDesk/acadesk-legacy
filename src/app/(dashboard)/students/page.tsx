'use client'

import { Suspense, useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { StudentList } from '@/components/features/students/student-list'
import { StudentListSkeleton } from '@/components/features/students/student-list-skeleton'
import { AddStudentWizard } from '@/components/features/students/add-student-wizard'
import { RoleGuard } from '@/components/auth/role-guard'
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'

export default function StudentsPage() {
  const router = useRouter()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleStudentAdded = () => {
    // Trigger refresh of student list
    setRefreshKey(prev => prev + 1)
  }

  return (
    <PageErrorBoundary pageName="학생 관리">
      <div className="space-y-6">
        {/* Header */}
        <section aria-label="페이지 헤더" className="animate-in fade-in-50 slide-in-from-top-2 duration-500">
          <PageHeader
          title="학생 관리"
          description="학생 정보 및 성적을 관리합니다"
          action={
            <RoleGuard allowedRoles={['owner', 'instructor']}>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/students/import')}>
                  <Upload className="mr-2 h-4 w-4" />
                  일괄 등록
                </Button>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  학생 추가
                </Button>
              </div>
            </RoleGuard>
          }
        />
      </section>

      {/* Student List */}
      <section aria-label="학생 목록" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
        <SectionErrorBoundary sectionName="학생 목록">
          <Card>
            <CardHeader>
              <CardTitle>전체 학생 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<StudentListSkeleton />}>
                <StudentList key={refreshKey} />
              </Suspense>
            </CardContent>
          </Card>
        </SectionErrorBoundary>
      </section>

      <AddStudentWizard
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleStudentAdded}
      />
    </div>
    </PageErrorBoundary>
  )
}
