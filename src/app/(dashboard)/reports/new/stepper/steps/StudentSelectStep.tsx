'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { UserPlus, X } from 'lucide-react'
import { SelectStudentDialog } from '@/components/features/reports/select-student-dialog'
import { type SelectedStudent, getRecentStudents } from '../report-stepper-types'

interface Student {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  users: { name: string } | null
  class_enrollments?: Array<{ classes: { name: string } | null }>
}

interface StudentSelectStepProps {
  students: Student[]
  selectedStudent: SelectedStudent | null
  onSelect: (student: SelectedStudent) => void
  onClear: () => void
}

export function StudentSelectStep({ students, selectedStudent, onSelect, onClear }: StudentSelectStepProps) {
  const [showDialog, setShowDialog] = useState(false)

  const recentStudents = useMemo(() => getRecentStudents(), [])

  function handleStudentSelect(studentId: string, studentName: string) {
    const found = students.find((s) => s.id === studentId)
    if (!found) return

    onSelect({
      id: found.id,
      name: studentName,
      studentCode: found.student_code,
      grade: found.grade,
      classes:
        found.class_enrollments
          ?.map((e) => e.classes?.name)
          .filter((name): name is string => Boolean(name)) || [],
    })
  }

  function handleRecentClick(recent: SelectedStudent) {
    // Verify the student still exists in the list
    const found = students.find((s) => s.id === recent.id)
    if (found) {
      onSelect({
        ...recent,
        // Refresh name from server data
        name: found.users?.name || recent.name,
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>학생 선택</CardTitle>
        <CardDescription>리포트를 생성할 학생을 선택하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recent students */}
        {!selectedStudent && recentStudents.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">최근 선택한 학생</p>
            <div className="flex flex-wrap gap-2">
              {recentStudents.map((recent) => (
                <button
                  key={recent.id}
                  type="button"
                  onClick={() => handleRecentClick(recent)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border bg-muted/50 hover:bg-muted hover:border-muted-foreground/30 transition-all"
                >
                  <span className="font-medium">{recent.name}</span>
                  <span className="text-muted-foreground">{recent.studentCode}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selection state */}
        {selectedStudent ? (
          <div className="flex items-center justify-between p-4 rounded-lg border bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-xs">선택됨</Badge>
              <div>
                <div className="font-medium">{selectedStudent.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedStudent.studentCode}
                  {selectedStudent.grade && ` · ${selectedStudent.grade}`}
                  {selectedStudent.classes.length > 0 && ` · ${selectedStudent.classes.join(', ')}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
                변경
              </Button>
              <Button variant="ghost" size="icon" onClick={onClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-auto py-6 justify-start"
            onClick={() => setShowDialog(true)}
          >
            <UserPlus className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">학생 선택하기</div>
              <div className="text-sm text-muted-foreground">검색하여 학생을 선택하세요</div>
            </div>
          </Button>
        )}

        <SelectStudentDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          value={selectedStudent?.id}
          onSelect={handleStudentSelect}
          students={students.map((s) => ({
            id: s.id,
            student_code: s.student_code,
            name: s.users?.name || '이름 없음',
            grade: s.grade,
            school: s.school,
            classes:
              s.class_enrollments
                ?.map((e) => e.classes?.name)
                .filter((name): name is string => Boolean(name)) || [],
          }))}
          loading={false}
        />
      </CardContent>
    </Card>
  )
}
