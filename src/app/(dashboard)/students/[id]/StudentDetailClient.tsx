'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StudentHeader } from '@/components/features/students/detail/StudentHeader'
import { OverviewTab } from '@/components/features/students/detail/OverviewTab'
import { InfoTab } from '@/components/features/students/detail/InfoTab'
import { GradesTab } from '@/components/features/students/detail/GradesTab'
import { ScheduleTab } from '@/components/features/students/detail/ScheduleTab'
import { AttendanceTab } from '@/components/features/students/detail/AttendanceTab'
import { TodoTab } from '@/components/features/students/detail/TodoTab'
import { LearningStatusTab } from '@/components/features/students/detail/LearningStatusTab'
import { ActivityTab } from '@/components/features/students/detail/ActivityTab'
import { ConsultationTab } from '@/components/features/students/detail/ConsultationTab'
import { ManageClassesDialog } from '@/components/features/students/manage-classes-dialog'
import { StudentDetailProvider } from '@/hooks/use-student-detail'
import type { StudentDetailData, Consultation } from '@/types/studentDetail.types'

interface StudentDetailClientProps {
  initialData: StudentDetailData
}

export function StudentDetailClient({
  initialData,
}: StudentDetailClientProps) {
  const router = useRouter()
  const [student, setStudent] = useState(initialData.student)
  const [consultations, setConsultations] = useState(initialData.consultations)
  const [activeTab, setActiveTab] = useState('overview')
  const [classDialogOpen, setClassDialogOpen] = useState(false)

  const handleConsultationAdded = (consultation: Consultation) => {
    setConsultations([consultation, ...consultations])
  }

  const handleDataRefresh = () => {
    router.refresh()
  }

  return (
    <StudentDetailProvider
      value={{
        ...initialData,
        onRefresh: handleDataRefresh,
      }}
    >
      <PageWrapper>
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Sticky Header - 학생 이름과 액션만 고정 */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 border-b">
            <StudentHeader
              student={student}
              onStudentUpdate={setStudent}
              onClassDialogOpen={() => setClassDialogOpen(true)}
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="info">상세정보</TabsTrigger>
              <TabsTrigger value="grades">성적</TabsTrigger>
              <TabsTrigger value="schedule">시간표</TabsTrigger>
              <TabsTrigger value="attendance">출석</TabsTrigger>
              <TabsTrigger value="todos">TODO</TabsTrigger>
              <TabsTrigger value="learning">학습</TabsTrigger>
              <TabsTrigger value="consultations">상담</TabsTrigger>
              <TabsTrigger value="activity">활동</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <OverviewTab />
            </TabsContent>

            <TabsContent value="info" className="mt-0">
              <InfoTab />
            </TabsContent>

            <TabsContent value="grades" className="mt-0">
              <GradesTab />
            </TabsContent>

            <TabsContent value="schedule" className="mt-0">
              <ScheduleTab />
            </TabsContent>

            <TabsContent value="attendance" className="mt-0">
              <AttendanceTab />
            </TabsContent>

            <TabsContent value="todos" className="mt-0">
              <TodoTab />
            </TabsContent>

            <TabsContent value="learning" className="mt-0">
              <LearningStatusTab />
            </TabsContent>

            <TabsContent value="consultations" className="mt-0">
              <ConsultationTab
                studentId={student.id}
                consultations={consultations}
                onConsultationAdded={handleConsultationAdded}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <ActivityTab studentId={student.id} />
            </TabsContent>
          </Tabs>

        {/* Dialogs */}
        <ManageClassesDialog
          open={classDialogOpen}
          onOpenChange={setClassDialogOpen}
          studentId={student.id}
          currentClassIds={
            student.class_enrollments
              ?.map((ce) => ce.class_id)
              .filter(Boolean) || []
          }
          onSuccess={() => {
            setClassDialogOpen(false)
            handleDataRefresh() // 서버 컴포넌트 다시 실행하여 최신 데이터 로드
          }}
        />
        </motion.div>
      </PageWrapper>
    </StudentDetailProvider>
  )
}
