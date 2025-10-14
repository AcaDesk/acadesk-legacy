'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { BookOpen, MoreVertical, Calendar as CalendarIcon } from 'lucide-react'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ClassEnrollment {
  id: string
  class_id: string
  status: string
  enrolled_at: string
  end_date: string | null
  withdrawal_reason: string | null
  notes: string | null
  classes: {
    id: string
    name: string
  } | null
}

interface ClassEnrollmentsListProps {
  enrollments: ClassEnrollment[]
  onUpdate: () => void
}

const enrollmentStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: '수강중', variant: 'default' },
  completed: { label: '수강종료', variant: 'secondary' },
  on_hold: { label: '휴원', variant: 'outline' },
  withdrawn: { label: '환불', variant: 'destructive' },
  transferred: { label: '반 이동', variant: 'outline' },
  pending: { label: '대기', variant: 'outline' },
}

const withdrawalReasons = [
  { code: 'schedule_conflict', label: '시간대 불가' },
  { code: 'academic_level', label: '수준 불일치' },
  { code: 'financial', label: '비용 부담' },
  { code: 'relocation', label: '이사' },
  { code: 'school_change', label: '학교 이전' },
  { code: 'health', label: '건강 문제' },
  { code: 'dissatisfaction', label: '불만족' },
  { code: 'personal', label: '개인 사정' },
  { code: 'other', label: '기타' },
]

export function ClassEnrollmentsList({
  enrollments,
  onUpdate,
}: ClassEnrollmentsListProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedEnrollment, setSelectedEnrollment] = useState<ClassEnrollment | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [withdrawalReason, setWithdrawalReason] = useState('')
  const [notes, setNotes] = useState('')

  const handleStatusChange = (enrollment: ClassEnrollment) => {
    setSelectedEnrollment(enrollment)
    setNewStatus(enrollment.status)
    setEndDate(enrollment.end_date ? new Date(enrollment.end_date) : undefined)
    setWithdrawalReason(enrollment.withdrawal_reason || '')
    setNotes(enrollment.notes || '')
    setStatusDialogOpen(true)
  }

  const handleSaveStatus = async () => {
    if (!selectedEnrollment) return

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        end_date: endDate ? formatDate(endDate, 'yyyy-MM-dd') : null,
        notes,
      }

      if (newStatus === 'withdrawn') {
        updateData.withdrawal_reason = withdrawalReason
      }

      const { error } = await supabase
        .from('class_enrollments')
        .update(updateData)
        .eq('id', selectedEnrollment.id)

      if (error) throw error

      toast({
        title: '상태 변경 완료',
        description: '수강 상태가 성공적으로 변경되었습니다.',
      })

      setStatusDialogOpen(false)
      onUpdate()
    } catch (error) {
      console.error('Error updating enrollment status:', error)
      toast({
        title: '상태 변경 실패',
        description: '수강 상태 변경 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>수강 중인 수업이 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">수강 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {enrollments.map((enrollment) => {
              const statusInfo = enrollmentStatusMap[enrollment.status] || {
                label: enrollment.status,
                variant: 'outline',
              }

              return (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {enrollment.classes?.name || '수업'}
                      </p>
                      <Badge variant={statusInfo.variant} className="text-xs shrink-0">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {enrollment.enrolled_at && (
                        <span>
                          등록일:{' '}
                          {formatDate(new Date(enrollment.enrolled_at), 'yyyy.MM.dd', {
                            locale: ko,
                          })}
                        </span>
                      )}
                      {enrollment.end_date && (
                        <>
                          <span>•</span>
                          <span>
                            종료일:{' '}
                            {formatDate(new Date(enrollment.end_date), 'yyyy.MM.dd', {
                              locale: ko,
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>수강 관리</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleStatusChange(enrollment)}>
                        상태 변경
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수강 상태 변경</DialogTitle>
            <DialogDescription>
              {selectedEnrollment?.classes?.name}의 수강 상태를 변경합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>상태</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(enrollmentStatusMap).map(([code, info]) => (
                    <SelectItem key={code} value={code}>
                      {info.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(newStatus === 'completed' ||
              newStatus === 'withdrawn' ||
              newStatus === 'on_hold') && (
              <div className="space-y-2">
                <Label>종료일</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate
                        ? formatDate(endDate, 'yyyy년 M월 d일', { locale: ko })
                        : '날짜 선택'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {newStatus === 'withdrawn' && (
              <div className="space-y-2">
                <Label>환불 사유</Label>
                <Select value={withdrawalReason} onValueChange={setWithdrawalReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="사유 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {withdrawalReasons.map((reason) => (
                      <SelectItem key={reason.code} value={reason.code}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                placeholder="추가 메모 (선택사항)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveStatus}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
