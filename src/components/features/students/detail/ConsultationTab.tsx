'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ui/dialog'
import { Calendar } from '@ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar as CalendarIcon, Plus, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { EmptyState } from '@ui/empty-state'
import type { Consultation } from '@/core/types/studentDetail.types'
import { createConsultation } from '@/app/actions/consultations'

interface ConsultationTabProps {
  studentId: string
  consultations: Consultation[]
  onConsultationAdded: (consultation: Consultation) => void
}

export function ConsultationTab({
  studentId,
  consultations: initialConsultations,
  onConsultationAdded,
}: ConsultationTabProps) {
  const { toast } = useToast()

  const [consultations, setConsultations] = useState(initialConsultations)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [consultationDate, setConsultationDate] = useState<Date | undefined>()
  const [consultationType, setConsultationType] = useState<'parent_meeting' | 'phone_call' | 'video_call' | 'in_person'>('in_person')
  const [consultationContent, setConsultationContent] = useState('')

  const handleSaveConsultation = async () => {
    if (!consultationDate || !consultationContent) {
      toast({
        title: '입력 오류',
        description: '상담 날짜와 내용을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    try {
      const result = await createConsultation({
        studentId: studentId,
        consultationDate: consultationDate.toISOString(),
        consultationType: consultationType,
        title: '상담 기록',
        summary: consultationContent,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || '상담 기록 생성 실패')
      }

      const newConsultation = result.data as Consultation
      setConsultations([newConsultation, ...consultations])
      onConsultationAdded(newConsultation)
      setIsDialogOpen(false)
      setConsultationDate(undefined)
      setConsultationType('in_person')
      setConsultationContent('')

      toast({
        title: '저장 완료',
        description: '상담 기록이 저장되었습니다.',
      })
    } catch (error) {
      console.error('Error saving consultation:', error)
      toast({
        title: '저장 오류',
        description: error instanceof Error ? error.message : '상담 기록을 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          상담 기록 추가
        </Button>
      </div>

      {consultations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={MessageSquare}
              title="상담 기록이 없습니다"
              description="학생과의 첫 상담 내용을 기록해보세요"
              action={
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 mt-4">
                  <Plus className="h-4 w-4" />
                  첫 상담 기록 추가하기
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {consultations.map((consultation) => (
            <Card key={consultation.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {formatDate(
                        new Date(consultation.consultation_date),
                        'yyyy년 M월 d일',
                        { locale: ko }
                      )}
                    </CardTitle>
                  </div>
                  <Badge variant="outline">{consultation.consultation_type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{consultation.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Consultation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상담 기록 추가</DialogTitle>
            <DialogDescription>
              학생과의 상담 내용을 기록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>상담 날짜</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !consultationDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {consultationDate
                      ? formatDate(consultationDate, 'yyyy년 M월 d일', { locale: ko })
                      : '날짜 선택'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={consultationDate}
                    onSelect={setConsultationDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>상담 유형</Label>
              <Select value={consultationType} onValueChange={(v) => setConsultationType(v as 'parent_meeting' | 'phone_call' | 'video_call' | 'in_person')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">대면 상담</SelectItem>
                  <SelectItem value="phone_call">전화 상담</SelectItem>
                  <SelectItem value="video_call">화상 상담</SelectItem>
                  <SelectItem value="parent_meeting">학부모 면담</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>상담 내용</Label>
              <Textarea
                placeholder="상담 내용을 입력하세요..."
                value={consultationContent}
                onChange={(e) => setConsultationContent(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveConsultation}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
