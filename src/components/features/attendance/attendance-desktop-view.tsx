'use client'

import {
  BookOpen,
  MessageCircle,
  PlusCircle,
} from 'lucide-react'
import { Card } from '@ui/card'
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
    <Card className="hidden md:flex flex-col flex-1 overflow-hidden">
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-left border-collapse table-fixed">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[40%]" />
            <col className="w-[26%]" />
          </colgroup>
          <thead>
            <tr className="bg-muted/50 text-xs text-muted-foreground border-b border-border sticky top-0 z-10 backdrop-blur-sm">
              <th className="px-6 py-4 font-semibold">학생 정보</th>
              <th className="px-6 py-4 font-semibold">등원 시간</th>
              <th className="px-6 py-4 font-semibold text-center">
                출결 상태 변경
              </th>
              <th className="px-6 py-4 font-semibold text-right">추가 관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((student) => (
              <tr
                key={`${student.studentId}-${student.classId}`}
                className="hover:bg-muted/50 transition-colors group"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {student.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.school} {student.grade} • {student.className}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
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
                </td>
                <td className="px-6 py-4">
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
                </td>
                <td className="px-6 py-4 text-right">
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
                </td>
              </tr>
            ))}
          </tbody>
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
