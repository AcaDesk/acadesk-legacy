'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import { Badge } from '@ui/badge'
import { Checkbox } from '@ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Search, Send, Users, MessageSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { sendMessages, getMessageTemplates } from '@/app/actions/messages'
import { getErrorMessage } from '@/lib/error-handlers'

interface Student {
  id: string
  student_code: string
  user_id: {
    name: string
  } | null
}

interface MessageTemplate {
  id: string
  name: string
  content: string
  type: 'sms'
  category: string
}

interface BulkMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMessageSent?: () => void
}

export function BulkMessageDialog({
  open,
  onOpenChange,
  onMessageSent,
}: BulkMessageDialogProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState('')
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadStudents()
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    filterStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, students])

  async function loadStudents() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select('id, student_code, user_id!inner(name)')
        .is('deleted_at', null)
        .order('student_code')

      if (error) throw error
      setStudents(data as unknown as Student[])
    } catch (error) {
      console.error('Error loading students:', error)
      toast({
        title: '학생 목록 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadTemplates() {
    try {
      const result = await getMessageTemplates()
      if (result.success && result.data) {
        // SMS 템플릿만 필터링
        setTemplates(result.data.filter(t => t.type === 'sms'))
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  function filterStudents() {
    if (!searchTerm) {
      setFilteredStudents(students)
      return
    }

    const search = searchTerm.toLowerCase()
    const filtered = students.filter(
      (s) =>
        s.user_id?.name?.toLowerCase().includes(search) ||
        s.student_code?.toLowerCase().includes(search)
    )
    setFilteredStudents(filtered)
  }

  function toggleStudent(studentId: string) {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  function toggleAll() {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)))
    }
  }

  function useTemplate(template: MessageTemplate) {
    setMessage(template.content)
  }

  async function handleSend() {
    if (selectedStudents.size === 0) {
      toast({
        title: '학생 선택 필요',
        description: '메시지를 받을 학생을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: '메시지 내용 필요',
        description: '전송할 메시지를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setSending(true)

    try {
      const result = await sendMessages({
        studentIds: Array.from(selectedStudents),
        message: message.trim(),
        type: 'sms',
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || '메시지 전송 실패')
      }

      toast({
        title: '메시지 전송 완료',
        description: `${result.data.successCount}건 성공, ${result.data.failCount}건 실패`,
      })

      // Reset form
      setSelectedStudents(new Set())
      setMessage('')
      onMessageSent?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error sending messages:', error)
      toast({
        title: '전송 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>일괄 메시지 전송</DialogTitle>
          <DialogDescription>
            학생 보호자에게 SMS/알림톡을 일괄 전송합니다
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Student Selection */}
          <div className="space-y-4">
            <div>
              <Label>수신 대상 선택</Label>
              <div className="mt-2 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="학생 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {selectedStudents.size}명 선택됨
                  </Badge>
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {selectedStudents.size === filteredStudents.length
                      ? '전체 해제'
                      : '전체 선택'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-2 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  로딩 중...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>학생이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => toggleStudent(student.id)}
                    >
                      <Checkbox
                        checked={selectedStudents.has(student.id)}
                        onCheckedChange={() => toggleStudent(student.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {student.user_id?.name || '이름 없음'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.student_code}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Message Composition */}
          <div className="space-y-4">
            <div>
              <Label>전송 방법</Label>
              <div className="mt-2 flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                <MessageSquare className="h-5 w-5" />
                <div>
                  <p className="font-medium text-sm">SMS/알림톡</p>
                  <p className="text-xs text-muted-foreground">문자 메시지로 전송됩니다</p>
                </div>
              </div>
            </div>

            {templates.length > 0 && (
              <div>
                <Label>템플릿 사용</Label>
                <div className="mt-2 space-y-2">
                  {templates.slice(0, 3).map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => useTemplate(template)}
                    >
                      <div>
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {template.content.substring(0, 50)}...
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="message">메시지 내용</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="SMS 내용 (최대 90자 권장, 초과 시 장문 SMS로 발송)"
                rows={8}
                className="mt-2"
                maxLength={1000}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {message.length}자
                  {message.length > 90 && ` / 장문 SMS (${Math.ceil(message.length / 90)}건으로 발송)`}
                </p>
                {message.length > 90 && (
                  <p className="text-xs text-orange-600">
                    90자 초과 시 요금이 추가될 수 있습니다
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSend} disabled={sending || selectedStudents.size === 0}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? '전송 중...' : `${selectedStudents.size}명에게 전송`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
