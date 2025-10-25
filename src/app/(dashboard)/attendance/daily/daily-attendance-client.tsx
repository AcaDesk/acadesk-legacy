'use client'

import { useState } from 'react'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { RadioGroup, RadioGroupItem } from '@ui/radio-group'
import { Label } from '@ui/label'
import {
  Calendar as CalendarIcon,
  Check,
  X,
  Clock,
  Bell,
  Users,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SendMessageDialog } from '@/components/features/messaging/send-message-dialog'
import { cn } from '@/lib/utils'

interface Student {
  id: string
  student_code: string
  name: string
  grade: string
  phone: string
  guardian_name: string
  guardian_phone: string
  attendance_status: 'present' | 'absent' | 'late' | null
}

interface Class {
  id: string
  name: string
  time: string
  instructor: string
  students: Student[]
}

interface DailyAttendanceClientProps {
  classes: Class[]
}

export function DailyAttendanceClient({ classes: initialClasses }: DailyAttendanceClientProps) {
  const { toast } = useToast()
  const [classes, setClasses] = useState(initialClasses)
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(
    new Set(initialClasses.map(c => c.id))
  )
  const [saving, setSaving] = useState(false)

  // 메시지 발송 다이얼로그
  const [messageDialog, setMessageDialog] = useState<{
    open: boolean
    recipients: Array<{
      id: string
      name: string
      phone: string
      studentName?: string
    }>
    template: string
    context: Record<string, string>
  }>({
    open: false,
    recipients: [],
    template: '',
    context: {},
  })

  function toggleClass(classId: string) {
    setExpandedClasses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(classId)) {
        newSet.delete(classId)
      } else {
        newSet.add(classId)
      }
      return newSet
    })
  }

  function handleAttendanceChange(classId: string, studentId: string, status: 'present' | 'absent' | 'late') {
    setClasses(prev => prev.map(cls => {
      if (cls.id !== classId) return cls
      return {
        ...cls,
        students: cls.students.map(student => {
          if (student.id !== studentId) return student
          return { ...student, attendance_status: status }
        })
      }
    }))
  }

  function sendAbsentNotification(student: Student, classInfo: Class) {
    const now = new Date()
    setMessageDialog({
      open: true,
      recipients: [{
        id: student.id,
        name: student.guardian_name,
        phone: student.guardian_phone,
        studentName: student.name,
      }],
      template: 'attendance_absent',
      context: {
        학생이름: student.name,
        날짜: now.toLocaleDateString('ko-KR'),
        시간: classInfo.time,
      },
    })
  }

  function sendLateNotification(student: Student, classInfo: Class) {
    const now = new Date()
    setMessageDialog({
      open: true,
      recipients: [{
        id: student.id,
        name: student.guardian_name,
        phone: student.guardian_phone,
        studentName: student.name,
      }],
      template: 'attendance_late',
      context: {
        학생이름: student.name,
        시간: classInfo.time,
        지각시간: '10', // TODO: 실제 지각 시간 계산
      },
    })
  }

  async function handleSave() {
    setSaving(true)

    try {
      // TODO: 실제 출석 저장 API 호출
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: '저장 완료',
        description: '출석이 저장되었습니다.',
      })
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '출석 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // 통계 계산
  const totalStudents = classes.reduce((sum, cls) => sum + cls.students.length, 0)
  const presentCount = classes.reduce((sum, cls) =>
    sum + cls.students.filter(s => s.attendance_status === 'present').length, 0
  )
  const absentCount = classes.reduce((sum, cls) =>
    sum + cls.students.filter(s => s.attendance_status === 'absent').length, 0
  )
  const lateCount = classes.reduce((sum, cls) =>
    sum + cls.students.filter(s => s.attendance_status === 'late').length, 0
  )
  const notCheckedCount = totalStudents - presentCount - absentCount - lateCount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            일일 출석부
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-5 w-5 mr-2" />
          {saving ? '저장 중...' : '출석 저장'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              전체 학생
            </CardDescription>
            <CardTitle className="text-3xl">{totalStudents}명</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              출석
            </CardDescription>
            <CardTitle className="text-3xl text-green-600">{presentCount}명</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <X className="h-4 w-4" />
              결석
            </CardDescription>
            <CardTitle className="text-3xl text-red-600">{absentCount}명</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              지각
            </CardDescription>
            <CardTitle className="text-3xl text-orange-600">{lateCount}명</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>미체크</CardDescription>
            <CardTitle className="text-3xl text-muted-foreground">{notCheckedCount}명</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Classes */}
      <div className="space-y-4">
        {classes.map((classInfo) => {
          const isExpanded = expandedClasses.has(classInfo.id)
          const classPresent = classInfo.students.filter(s => s.attendance_status === 'present').length
          const classAbsent = classInfo.students.filter(s => s.attendance_status === 'absent').length
          const classLate = classInfo.students.filter(s => s.attendance_status === 'late').length
          const classNotChecked = classInfo.students.length - classPresent - classAbsent - classLate

          return (
            <Card key={classInfo.id}>
              <CardHeader>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleClass(classInfo.id)}
                >
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {classInfo.name}
                      <Badge variant="outline">{classInfo.students.length}명</Badge>
                    </CardTitle>
                    <CardDescription>
                      {classInfo.time} • 담당: {classInfo.instructor}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="default" className="bg-green-600">{classPresent}</Badge>
                      <Badge variant="default" className="bg-red-600">{classAbsent}</Badge>
                      <Badge variant="default" className="bg-orange-600">{classLate}</Badge>
                      {classNotChecked > 0 && (
                        <Badge variant="secondary">{classNotChecked}</Badge>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {classInfo.students.map((student) => (
                      <div
                        key={student.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border-2 transition-colors",
                          student.attendance_status === 'present' && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
                          student.attendance_status === 'absent' && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
                          student.attendance_status === 'late' && "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20",
                          !student.attendance_status && "border-muted"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {student.student_code} • {student.grade}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <RadioGroup
                            value={student.attendance_status || ''}
                            onValueChange={(value: any) =>
                              handleAttendanceChange(classInfo.id, student.id, value)
                            }
                            className="flex gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="present" id={`${student.id}-present`} />
                              <Label
                                htmlFor={`${student.id}-present`}
                                className="cursor-pointer text-green-700 dark:text-green-400 font-medium"
                              >
                                출석
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="absent" id={`${student.id}-absent`} />
                              <Label
                                htmlFor={`${student.id}-absent`}
                                className="cursor-pointer text-red-700 dark:text-red-400 font-medium"
                              >
                                결석
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="late" id={`${student.id}-late`} />
                              <Label
                                htmlFor={`${student.id}-late`}
                                className="cursor-pointer text-orange-700 dark:text-orange-400 font-medium"
                              >
                                지각
                              </Label>
                            </div>
                          </RadioGroup>

                          {student.attendance_status === 'absent' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendAbsentNotification(student, classInfo)}
                              className="ml-2"
                            >
                              <Bell className="h-4 w-4 mr-2" />
                              결석 알림
                            </Button>
                          )}

                          {student.attendance_status === 'late' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendLateNotification(student, classInfo)}
                              className="ml-2"
                            >
                              <Bell className="h-4 w-4 mr-2" />
                              지각 알림
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Message Dialog */}
      <SendMessageDialog
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog({ ...messageDialog, open })}
        recipients={messageDialog.recipients}
        defaultTemplate={messageDialog.template}
        context={messageDialog.context}
        onSuccess={() => {
          toast({
            title: '알림 전송 완료',
            description: '학부모님께 알림이 전송되었습니다.',
          })
        }}
      />
    </div>
  )
}
