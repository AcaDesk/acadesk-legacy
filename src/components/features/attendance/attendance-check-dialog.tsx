'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Loader2, Check, Clock, X, FileQuestion } from 'lucide-react'
import { ATTENDANCE_STATUSES, getAttendanceStatusInfo } from '@/lib/constants'

interface Student {
  id: string
  student_code: string
  users: {
    name: string
  } | null
}

interface AttendanceRecord {
  student_id: string
  status: string
  notes: string
  checked_at: string | null
}

interface AttendanceCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  sessionStartTime: string
  students: Student[]
  existingRecords: AttendanceRecord[]
  onSuccess: () => void
  onContactGuardian?: (studentId: string, studentName: string) => void
}

export function AttendanceCheckDialog({
  open,
  onOpenChange,
  sessionId,
  sessionStartTime,
  students,
  existingRecords,
  onSuccess,
  onContactGuardian,
}: AttendanceCheckDialogProps) {
  const [records, setRecords] = useState<Map<string, { status: string; notes: string }>>(new Map())
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

  // Check if class has started and calculate time since start
  const classStarted = new Date(sessionStartTime) < new Date()
  const minutesSinceStart = classStarted
    ? Math.floor((new Date().getTime() - new Date(sessionStartTime).getTime()) / 60000)
    : 0
  const AUTO_DETECT_THRESHOLD = 10 // minutes after class start to auto-flag absent students

  useEffect(() => {
    if (open) {
      // Initialize records from existing data
      const recordMap = new Map<string, { status: string; notes: string }>()

      students.forEach(student => {
        const existing = existingRecords.find(r => r.student_id === student.id)
        recordMap.set(student.id, {
          status: existing?.status || 'present',
          notes: existing?.notes || '',
        })
      })

      setRecords(recordMap)
    }
  }, [open, students, existingRecords])

  const handleStatusChange = (studentId: string, status: string) => {
    setRecords(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(studentId) || { status: 'present', notes: '' }
      newMap.set(studentId, { ...current, status })
      return newMap
    })
  }

  const handleNotesChange = (studentId: string, notes: string) => {
    setRecords(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(studentId) || { status: 'present', notes: '' }
      newMap.set(studentId, { ...current, notes })
      return newMap
    })
  }

  const handleSave = async () => {
    if (!currentUser) return

    setSaving(true)
    try {
      // Prepare records for upsert
      const recordsToSave = students.map(student => {
        const record = records.get(student.id) || { status: 'present', notes: '' }
        return {
          tenant_id: currentUser.tenantId,
          session_id: sessionId,
          student_id: student.id,
          status: record.status,
          notes: record.notes || null,
          checked_at: new Date().toISOString(),
        }
      })

      // Use upsert to handle both create and update
      const { error } = await supabase
        .from('attendance_records')
        .upsert(recordsToSave, {
          onConflict: 'session_id,student_id',
          ignoreDuplicates: false,
        })

      if (error) throw error

      toast({
        title: '출석 체크 완료',
        description: `${students.length}명의 출석이 저장되었습니다.`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving attendance:', error)
      toast({
        title: '저장 실패',
        description: error.message || '출석을 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <Check className="h-4 w-4" />
      case 'late':
        return <Clock className="h-4 w-4" />
      case 'absent':
        return <X className="h-4 w-4" />
      case 'excused':
        return <FileQuestion className="h-4 w-4" />
      default:
        return null
    }
  }

  // Detect students who need attention (not present and class started)
  const shouldAutoDetect = classStarted && minutesSinceStart >= AUTO_DETECT_THRESHOLD
  const studentsNeedingAttention = shouldAutoDetect
    ? students.filter((student) => {
        const record = records.get(student.id)
        return record?.status !== 'present' && record?.status !== 'excused'
      })
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>출석 체크</DialogTitle>
          <DialogDescription>
            학생별로 출석 상태를 선택하고 메모를 추가할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {/* Alert for students needing attention */}
        {studentsNeedingAttention.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                  미출석 학생 {studentsNeedingAttention.length}명
                </h4>
                <p className="text-sm text-yellow-700">
                  수업 시작 후 {minutesSinceStart}분이 경과했습니다. 다음 학생들이 아직 출석 체크되지 않았습니다.
                </p>
                <div className="mt-2 space-y-1">
                  {studentsNeedingAttention.map((student) => (
                    <div key={student.id} className="flex items-center justify-between text-sm">
                      <span className="text-yellow-900 font-medium">
                        {student.users?.name || '이름 없음'} ({student.student_code})
                      </span>
                      {onContactGuardian && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onContactGuardian(student.id, student.users?.name || '학생')}
                          className="h-7 text-xs"
                        >
                          보호자 연락
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto border rounded-lg">
          <div className="divide-y">
            {students.map((student) => {
              const record = records.get(student.id) || { status: 'present', notes: '' }
              const statusInfo = getAttendanceStatusInfo(record.status)

              return (
                <div key={student.id} className="p-4 space-y-3">
                  {/* Student Info and Status Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">
                        {student.users?.name || '이름 없음'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {student.student_code}
                      </span>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Quick Status Buttons */}
                    <div className="flex gap-2">
                      {Object.entries(ATTENDANCE_STATUSES).map(([key, { label }]) => (
                        <Button
                          key={key}
                          variant={record.status === key ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleStatusChange(student.id, key)}
                          className="gap-2"
                        >
                          {getStatusIcon(key)}
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <Textarea
                    placeholder="메모 (선택사항)"
                    value={record.notes}
                    onChange={(e) => handleNotesChange(student.id, e.target.value)}
                    className="text-sm min-h-[60px]"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          {Object.entries(ATTENDANCE_STATUSES).map(([key, { label, variant }]) => {
            const count = Array.from(records.values()).filter(r => r.status === key).length
            return (
              <div key={key} className="flex items-center gap-2">
                <Badge variant={variant}>{label}</Badge>
                <span>{count}명</span>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
