'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar as CalendarIcon, Plus, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/ui/empty-state'
import type { Consultation } from '@/types/studentDetail.types'

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
  const supabase = createClient()

  const [consultations, setConsultations] = useState(initialConsultations)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [consultationDate, setConsultationDate] = useState<Date | undefined>()
  const [consultationType, setConsultationType] = useState('대면')
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
      const { data, error } = await supabase
        .from('consultations')
        .insert({
          student_id: studentId,
          consultation_date: formatDate(consultationDate, 'yyyy-MM-dd'),
          consultation_type: consultationType,
          content: consultationContent,
        })
        .select()
        .single()

      if (error) throw error

      const newConsultation = data as Consultation
      setConsultations([newConsultation, ...consultations])
      onConsultationAdded(newConsultation)
      setIsDialogOpen(false)
      setConsultationDate(undefined)
      setConsultationType('대면')
      setConsultationContent('')

      toast({
        title: '저장 완료',
        description: '상담 기록이 저장되었습니다.',
      })
    } catch (error) {
      console.error('Error saving consultation:', error)
      toast({
        title: '저장 오류',
        description: '상담 기록을 저장하는 중 오류가 발생했습니다.',
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
              <Select value={consultationType} onValueChange={setConsultationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="대면">대면</SelectItem>
                  <SelectItem value="전화">전화</SelectItem>
                  <SelectItem value="화상">화상</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
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
