'use client'

import { useState } from 'react'
import {
  BookOpen,
  MessageCircle,
  PlusCircle,
  MoreHorizontal,
} from 'lucide-react'
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

const STATUS_LEFT_BORDER: Record<string, string> = {
  present: 'border-l-green-500',
  late: 'border-l-amber-500',
  early_leave: 'border-l-orange-500',
  absent: 'border-l-red-500',
  excused: 'border-l-red-500',
}

const STATUS_STYLES: {
  value: UIAttendanceStatus
  label: string
  active: string
}[] = [
  { value: 'present', label: '출석', active: 'bg-green-600 text-white' },
  { value: 'late', label: '지각', active: 'bg-amber-500 text-white' },
  { value: 'early_leave', label: '조퇴', active: 'bg-orange-500 text-white' },
  { value: 'absent', label: '결석', active: 'bg-destructive text-destructive-foreground' },
]

function StudentRow({
  student,
  contactPreparingStudentId,
  onUpdateStatus,
  onToggleSelfStudy,
  onToggleMakeupClass,
  onOpenContactDialog,
}: {
  student: StudentAttendance
  contactPreparingStudentId: string | null
  onUpdateStatus: AttendanceViewProps['onUpdateStatus']
  onToggleSelfStudy: AttendanceViewProps['onToggleSelfStudy']
  onToggleMakeupClass: AttendanceViewProps['onToggleMakeupClass']
  onOpenContactDialog: AttendanceViewProps['onOpenContactDialog']
}) {
  const [expanded, setExpanded] = useState(false)

  const statusKey = student.status === 'excused' ? 'excused' : student.status
  const borderClass = statusKey ? STATUS_LEFT_BORDER[statusKey] : 'border-l-muted-foreground/20'
  const showContactBtn = student.status === 'absent' || student.status === 'excused' || student.status === 'late'
  const hasFlags = student.isSelfStudy || student.isMakeupClass

  return (
    <div
      className={cn(
        'border-l-[3px] bg-card border-b border-border transition-colors',
        borderClass,
      )}
    >
      {/* 메인 행: 학생 정보 + 시간 */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">
            {student.name}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {student.grade} · {student.className}
          </span>
          {hasFlags && (
            <div className="flex gap-1 shrink-0">
              {student.isSelfStudy && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 leading-none">
                  자습
                </span>
              )}
              {student.isMakeupClass && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 leading-none">
                  보강
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-xs font-mono text-muted-foreground shrink-0 ml-2">
          {student.arrivalTime || '--:--'}
        </span>
      </div>

      {/* 출결 버튼 행 */}
      <div className="flex items-center gap-1.5 px-3 pb-2.5">
        <div className="flex gap-1 flex-1">
          {STATUS_STYLES.map(({ value, label, active }) => {
            const isActive =
              value === 'absent'
                ? student.status === 'absent' || student.status === 'excused'
                : student.status === value

            return (
              <button
                key={value}
                onClick={() => onUpdateStatus(student, value)}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all leading-none',
                  isActive
                    ? `${active} shadow-sm`
                    : 'bg-muted/60 text-muted-foreground active:scale-95'
                )}
              >
                {value === 'absent' && student.status === 'excused' ? '사유' : label}
              </button>
            )
          })}
        </div>

        {/* 더보기 버튼 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'p-1.5 rounded-md transition-colors shrink-0',
            expanded ? 'bg-muted text-foreground' : 'text-muted-foreground active:bg-muted'
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* 펼침 영역: 자습/보강/알림 */}
      {expanded && (
        <div className="flex gap-1.5 px-3 pb-2.5 pt-0">
          <button
            onClick={() => onToggleSelfStudy(student)}
            className={cn(
              'flex-1 py-1.5 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors',
              student.isSelfStudy
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                : 'bg-muted/60 text-muted-foreground'
            )}
          >
            <BookOpen className="h-3 w-3" />
            자습 {student.isSelfStudy ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => onToggleMakeupClass(student)}
            className={cn(
              'flex-1 py-1.5 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors',
              student.isMakeupClass
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                : 'bg-muted/60 text-muted-foreground'
            )}
          >
            <PlusCircle className="h-3 w-3" />
            보강 {student.isMakeupClass ? 'ON' : 'OFF'}
          </button>
          {showContactBtn && (
            <button
              onClick={() => onOpenContactDialog(student)}
              disabled={contactPreparingStudentId === student.studentId}
              className="flex-1 py-1.5 rounded-md text-[11px] font-semibold bg-info/10 text-info flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <MessageCircle className="h-3 w-3" />
              알림
            </button>
          )}
        </div>
      )}
    </div>
  )
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
    <div className="block md:hidden flex-1 overflow-y-auto -mx-3 sm:-mx-0">
      <div className="rounded-lg overflow-hidden border border-border sm:border">
        {students.map((student) => (
          <StudentRow
            key={`${student.studentId}-${student.classId}`}
            student={student}
            contactPreparingStudentId={contactPreparingStudentId}
            onUpdateStatus={onUpdateStatus}
            onToggleSelfStudy={onToggleSelfStudy}
            onToggleMakeupClass={onToggleMakeupClass}
            onOpenContactDialog={onOpenContactDialog}
          />
        ))}
        {students.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm bg-card">
            {allStudentsEmpty
              ? '등록된 학생이 없습니다.'
              : '검색 결과가 없습니다.'}
          </div>
        )}
      </div>
    </div>
  )
}
