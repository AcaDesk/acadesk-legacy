'use client'

import {
  BookOpen,
  MessageCircle,
  Monitor,
  Pencil,
  PlusCircle,
} from 'lucide-react'
import { Card } from '@ui/card'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { cn } from '@/lib/utils'
import type { AttendanceViewProps } from './attendance-mobile-view'

export function AttendanceDesktopView({
  students,
  allStudentsEmpty,
  contactPreparingStudentId,
  onUpdateStatus,
  onToggleSelfStudy,
  onToggleMakeupClass,
  onOpenContactDialog,
}: AttendanceViewProps) {
  return (
    <Card className="hidden md:flex flex-col flex-1 overflow-hidden rounded-md">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full caption-bottom text-sm table-fixed">
        <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
          <TableRow>
            <TableHead className="w-[22%]">학생 정보</TableHead>
            <TableHead className="w-[16%]">등/하원 시간</TableHead>
            <TableHead className="w-[36%] text-center">출결 상태 변경</TableHead>
            <TableHead className="w-[26%] text-right">추가 관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow
              key={`${student.studentId}-${student.classId}`}
              className="group"
            >
              <TableCell>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {student.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {student.school} {student.grade} • {student.className}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'font-mono text-sm font-semibold',
                        student.arrivalTime
                          ? 'text-foreground'
                          : 'text-muted-foreground/50'
                      )}
                    >
                      {student.arrivalTime || '--:--'}
                    </span>
                    {student.source === 'kiosk' && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded font-medium leading-none bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        title="키오스크 자동 등록"
                      >
                        <Monitor className="h-2.5 w-2.5" />
                        키오스크
                      </span>
                    )}
                    {student.source === 'manual' && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded font-medium leading-none bg-muted text-muted-foreground"
                        title="원장/강사 수동 처리"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                        수동
                      </span>
                    )}
                  </div>
                  {student.departureTime && (
                    <span className="font-mono text-xs text-muted-foreground">
                      ↓ {student.departureTime}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-center items-center gap-1 bg-muted p-1 rounded-lg w-fit mx-auto">
                  <button
                    onClick={() => onUpdateStatus(student, 'present')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                      student.status === 'present'
                        ? 'bg-card text-green-600 shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    출석
                  </button>
                  <button
                    onClick={() => onUpdateStatus(student, 'late')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                      student.status === 'late'
                        ? 'bg-card text-amber-600 shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    지각
                  </button>
                  <button
                    onClick={() => onUpdateStatus(student, 'early_leave')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                      student.status === 'early_leave'
                        ? 'bg-card text-orange-600 shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    조퇴
                  </button>
                  <button
                    onClick={() => onUpdateStatus(student, 'absent')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                      student.status === 'absent' || student.status === 'excused'
                        ? 'bg-card text-destructive shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {student.status === 'excused' ? '사유결석' : '결석'}
                  </button>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onToggleSelfStudy(student)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1',
                      student.isSelfStudy
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900'
                        : 'bg-card border-border text-muted-foreground hover:text-purple-600 hover:border-purple-200'
                    )}
                  >
                    <BookOpen className="h-3 w-3" /> 자습
                  </button>
                  <button
                    onClick={() => onToggleMakeupClass(student)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1',
                      student.isMakeupClass
                        ? 'bg-info/10 text-info border-info/20'
                        : 'bg-card border-border text-muted-foreground hover:text-info hover:border-info/20'
                    )}
                  >
                    <PlusCircle className="h-3 w-3" /> 보강
                  </button>
                  {(student.status === 'late' ||
                    student.status === 'absent' ||
                    student.status === 'excused') && (
                    <button
                      onClick={() => onOpenContactDialog(student)}
                      disabled={contactPreparingStudentId === student.studentId}
                      className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-info hover:bg-info/10 hover:border-info/20 transition-colors disabled:opacity-60"
                      title="보호자 연락"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </table>
        {students.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {allStudentsEmpty
              ? '등록된 학생이 없습니다.'
              : '검색 결과가 없습니다.'}
          </div>
        )}
      </div>
    </Card>
  )
}
