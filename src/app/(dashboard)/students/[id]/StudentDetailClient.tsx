'use client'

import { useEffect, useState, useTransition } from 'react'
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
import { ConsultationTab } from '@/components/features/students/detail/ConsultationTab'
import { ManageClassesDialog } from '@/components/features/students/manage-classes-dialog'
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
  const [, startTransition] = useTransition()

  // router.refresh() 후 서버에서 내려오는 새 initialData를 로컬 state에 동기화.
  // useState는 mount 시점 값만 잡기 때문에, 이게 없으면 데이터 변경이 화면에 반영되지 않음.
  useEffect(() => {
    setStudent(initialData.student)
  }, [initialData.student])

  useEffect(() => {
    setConsultations(initialData.consultations)
  }, [initialData.consultations])

  const handleConsultationAdded = (consultation: Consultation) => {
    setConsultations([consultation, ...consultations])
  }

  const handleDataRefresh = async () => {
    startTransition(() => {
      router.refresh()
    })
  }

  const activeClassIds =
    student.class_enrollments
      ?.filter((ce) => ce.status === 'active')
      .map((ce) => ce.class_id)
      .filter(Boolean) ?? []

  return (
    <PageErrorBoundary pageName="학생 상세">
      <StudentDetailProvider
        value={{
          ...initialData,
          student,
          consultations,
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
          <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 border-b">
            <StudentHeader
              student={student}
              onStudentUpdate={setStudent}
              onClassDialogOpen={() => setClassDialogOpen(true)}
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="info">상세정보</TabsTrigger>
              <TabsTrigger value="grades">성적</TabsTrigger>
              <TabsTrigger value="schedule">시간표</TabsTrigger>
              <TabsTrigger value="attendance">출석</TabsTrigger>
              <TabsTrigger value="todos">TODO</TabsTrigger>
              <TabsTrigger value="consultations">상담</TabsTrigger>
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

            <TabsContent value="consultations" className="mt-0">
              <SectionErrorBoundary sectionName="상담 탭">
                <ConsultationTab
                  studentId={student.id}
                  consultations={consultations}
                  onConsultationAdded={handleConsultationAdded}
                />
              </SectionErrorBoundary>
            </TabsContent>
          </Tabs>

        {/* Dialogs */}
        <ManageClassesDialog
          open={classDialogOpen}
          onOpenChange={setClassDialogOpen}
          studentId={student.id}
          currentClassIds={activeClassIds as string[]}
          onSuccess={() => {
            setClassDialogOpen(false)
            handleDataRefresh()
          }}
        />
        </motion.div>
      </PageWrapper>
      </StudentDetailProvider>
    </PageErrorBoundary>
  )
}
