'use client'

import {
  CheckCircle2,
  Clock,
  LogOut,
  XCircle,
  BookOpen,
  MessageCircle,
  PlusCircle,
} from 'lucide-react'
import { Card, CardContent } from '@ui/card'
import { Badge } from '@ui/badge'
import { cn } from '@/lib/utils'
import type { UIAttendanceStatus } from '@/core/types/attendance'

export interface StudentAttendance {
  id: string
  sessionId?: string
  studentId: string
  name: string
  school: string
  grade: string
  classId: string | null
  className: string
  status: UIAttendanceStatus | null
  arrivalTime?: string
  isSelfStudy: boolean
  isMakeupClass: boolean
}

export interface AttendanceViewProps {
  students: StudentAttendance[]
  allStudentsEmpty: boolean
  contactPreparingStudentId: string | null
  onUpdateStatus: (student: StudentAttendance, status: UIAttendanceStatus) => void
  onToggleSelfStudy: (student: StudentAttendance) => void
  onToggleMakeupClass: (student: StudentAttendance) => void
  onOpenContactDialog: (student: StudentAttendance) => void
}

export function AttendanceMobileView({
  students,
  allStudentsEmpty,
  contactPreparingStudentId,
  onUpdateStatus,
  onToggleSelfStudy,
  onToggleMakeupClass,
  onOpenContactDialog,
}: AttendanceViewProps) {
  return (
    <div className="block md:hidden space-y-4 flex-1 overflow-y-auto">
      {students.map((student) => (
        <Card
          key={`${student.studentId}-${student.classId}`}
          className={cn(
            'transition-all',
            !student.status && 'border-l-4 border-l-muted-foreground/30'
          )}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  {student.name}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({student.school} {student.grade})
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {student.className}
                </p>
              </div>
              {student.arrivalTime ? (
                <div className="text-right">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    등원 시간
                  </span>
                  <span className="text-lg font-mono font-semibold text-foreground">
                    {student.arrivalTime}
                  </span>
                </div>
              ) : (
                <Badge variant="secondary">미등원</Badge>
              )}
            </div>

            {/* Mobile Action Buttons (Grid) */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => onUpdateStatus(student, 'present')}
                className={cn(
                  'py-3 rounded-lg text-xs font-semibold transition-colors flex flex-col items-center justify-center gap-1',
                  student.status === 'present'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-muted text-muted-foreground border border-border'
                )}
              >
                <CheckCircle2 className="h-4 w-4" /> 출석
              </button>
              <button
                onClick={() => onUpdateStatus(student, 'late')}
                className={cn(
                  'py-3 rounded-lg text-xs font-semibold transition-colors flex flex-col items-center justify-center gap-1',
                  student.status === 'late'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-muted text-muted-foreground border border-border'
                )}
              >
                <Clock className="h-4 w-4" /> 지각
              </button>
              <button
                onClick={() => onUpdateStatus(student, 'early_leave')}
                className={cn(
                  'py-3 rounded-lg text-xs font-semibold transition-colors flex flex-col items-center justify-center gap-1',
                  student.status === 'early_leave'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-muted text-muted-foreground border border-border'
                )}
              >
                <LogOut className="h-4 w-4" /> 조퇴
              </button>
              <button
                onClick={() => onUpdateStatus(student, 'absent')}
                className={cn(
                  'py-3 rounded-lg text-xs font-semibold transition-colors flex flex-col items-center justify-center gap-1',
                  student.status === 'absent' || student.status === 'excused'
                    ? 'bg-destructive text-destructive-foreground shadow-md'
                    : 'bg-muted text-muted-foreground border border-border'
                )}
              >
                <XCircle className="h-4 w-4" /> {student.status === 'excused' ? '사유결석' : '결석'}
              </button>
            </div>

            {/* Additional Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <button
                onClick={() => onToggleSelfStudy(student)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
                  student.isSelfStudy
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900'
                    : 'bg-card border border-border text-muted-foreground'
                )}
              >
                <BookOpen className="h-3.5 w-3.5" /> 자습{' '}
                {student.isSelfStudy ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => onToggleMakeupClass(student)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
                  student.isMakeupClass
                    ? 'bg-info/10 text-info border border-info/20'
                    : 'bg-card border border-border text-muted-foreground'
                )}
              >
                <PlusCircle className="h-3.5 w-3.5" /> 보강{' '}
                {student.isMakeupClass ? 'ON' : 'OFF'}
              </button>
              {(student.status === 'absent' || student.status === 'excused' || student.status === 'late') && (
                <button
                  onClick={() => onOpenContactDialog(student)}
                  disabled={contactPreparingStudentId === student.studentId}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-info/10 text-info border border-info/20 flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> 알림
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {students.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          {allStudentsEmpty
            ? '등록된 학생이 없습니다.'
            : '검색 결과가 없습니다.'}
        </div>
      )}
    </div>
  )
}
