'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { StudentHeader } from '@/components/features/students/detail/StudentHeader'
import { OverviewTab } from '@/components/features/students/detail/OverviewTab'
import { InfoTab } from '@/components/features/students/detail/InfoTab'
import { GradesTab } from '@/components/features/students/detail/GradesTab'
import { ScheduleTab } from '@/components/features/students/detail/ScheduleTab'
import { AttendanceTab } from '@/components/features/students/detail/AttendanceTab'
import { TodoTab } from '@/components/features/students/detail/TodoTab'
// import { LearningStatusTab } from '@/components/features/students/detail/LearningStatusTab' // TODO: Re-enable when migrated
// import { ActivityTab } from '@/components/features/students/detail/ActivityTab' // TODO: Re-enable when migrated
import { ConsultationTab } from '@/components/features/students/detail/ConsultationTab'
// import { ManageClassesDialog } from '@/components/features/students/manage-classes-dialog' // TODO: Re-enable when migrated
import { StudentDetailProvider } from '@/hooks/use-student-detail'
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'
import type { StudentDetailData, Consultation } from '@/core/types/studentDetail.types'

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

  const handleDataRefresh = async () => {
    router.refresh()
  }

  return (
    <PageErrorBoundary pageName="학생 상세">
      <StudentDetailProvider
        value={{
          ...initialData,
          refreshStudent: handleDataRefresh,
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
              <SectionErrorBoundary sectionName="개요 탭">
                <OverviewTab />
              </SectionErrorBoundary>
            </TabsContent>

            <TabsContent value="info" className="mt-0">
              <SectionErrorBoundary sectionName="상세정보 탭">
                <InfoTab />
              </SectionErrorBoundary>
            </TabsContent>

            <TabsContent value="grades" className="mt-0">
              <SectionErrorBoundary sectionName="성적 탭">
                <GradesTab />
              </SectionErrorBoundary>
            </TabsContent>

            <TabsContent value="schedule" className="mt-0">
              <SectionErrorBoundary sectionName="시간표 탭">
                <ScheduleTab />
              </SectionErrorBoundary>
            </TabsContent>

            <TabsContent value="attendance" className="mt-0">
              <SectionErrorBoundary sectionName="출석 탭">
                <AttendanceTab />
              </SectionErrorBoundary>
            </TabsContent>

            <TabsContent value="todos" className="mt-0">
              <SectionErrorBoundary sectionName="TODO 탭">
                <TodoTab />
              </SectionErrorBoundary>
            </TabsContent>

            {/* TODO: Re-enable when migrated */}
            {/* <TabsContent value="learning" className="mt-0">
              <SectionErrorBoundary sectionName="학습 탭">
                <LearningStatusTab />
              </SectionErrorBoundary>
            </TabsContent> */}

            <TabsContent value="consultations" className="mt-0">
              <SectionErrorBoundary sectionName="상담 탭">
                <ConsultationTab
                  studentId={student.id}
                  consultations={consultations}
                  onConsultationAdded={handleConsultationAdded}
                />
              </SectionErrorBoundary>
            </TabsContent>

            {/* TODO: Re-enable when migrated */}
            {/* <TabsContent value="activity" className="mt-0">
              <SectionErrorBoundary sectionName="활동 탭">
                <ActivityTab studentId={student.id} />
              </SectionErrorBoundary>
            </TabsContent> */}
          </Tabs>

        {/* Dialogs */}
        {/* TODO: Re-enable when migrated */}
        {/* <ManageClassesDialog
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
        /> */}
        </motion.div>
      </PageWrapper>
      </StudentDetailProvider>
    </PageErrorBoundary>
  )
}
