'use client'

import { Suspense, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { StudentList } from '@/components/features/students/student-list'
import { StudentListSkeleton } from '@/components/features/students/student-list-skeleton'
import { AddStudentDialog } from '@/components/features/students/add-student-dialog'

export default function StudentsPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleStudentAdded = () => {
    // Trigger refresh of student list
    setRefreshKey(prev => prev + 1)
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">학생 관리</h1>
            <p className="text-muted-foreground">학생 정보 및 성적을 관리합니다</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            학생 추가
          </Button>
        </div>

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

        <AddStudentDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={handleStudentAdded}
        />
      </div>
    </PageWrapper>
  )
}
