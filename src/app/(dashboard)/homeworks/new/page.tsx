'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { BookCopy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { createHomework } from '@/app/actions/homeworks'
import { getErrorMessage } from '@/lib/error-handlers'
import { DatePicker } from '@ui/date-picker'
import { StudentSearch } from '@/components/features/students/student-search'
import { SubjectSelector } from '@/components/features/common/subject-selector'

export default function NewHomeworkPage() {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Form data
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    // Set default due date to 7 days from now
    const defaultDueDate = new Date()
    defaultDueDate.setDate(defaultDueDate.getDate() + 7)
    setDueDate(defaultDueDate)
  }, [])

  async function handleSubmit() {
    if (!title.trim()) {
      toast({
        title: '입력 오류',
        description: '숙제 제목을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (selectedStudents.length === 0) {
      toast({
        title: '학생 선택 필요',
        description: '최소 한 명의 학생을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (!dueDate) {
      toast({
        title: '마감일 필요',
        description: '숙제 마감일을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const result = await createHomework({
        studentIds: selectedStudents,
        title: title.trim(),
        description: description.trim() || undefined,
        subject: subject.trim() || undefined,
        priority,
        dueDate: dueDate.toISOString().split('T')[0],
      })

      if (!result.success) {
        throw new Error(result.error || '숙제 출제 실패')
      }

      toast({
        title: '숙제 출제 완료',
        description: `${selectedStudents.length}명의 학생에게 숙제가 출제되었습니다.`,
      })

      router.push('/homeworks')
    } catch (error) {
      console.error('Error creating homework:', error)
      toast({
        title: '출제 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">숙제 출제</h1>
          <p className="text-muted-foreground">학생들에게 집에서 해올 숙제를 출제합니다</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Student Selection */}
          <Card>
            <CardHeader>
              <CardTitle>학생 선택</CardTitle>
              <CardDescription>숙제를 받을 학생을 선택하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <StudentSearch
                mode="multiple"
                variant="checkbox-list"
                value={selectedStudents}
                onChange={setSelectedStudents}
                searchable={true}
                showSelectAll={true}
                showSelectedCount={true}
                placeholder="학생 검색..."
              />
            </CardContent>
          </Card>

          {/* Right: Homework Details */}
          <Card>
            <CardHeader>
              <CardTitle>숙제 정보</CardTitle>
              <CardDescription>숙제 내용을 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="숙제 제목"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="subject">과목</Label>
                <div className="mt-2">
                  <SubjectSelector
                    value={subject}
                    onChange={setSubject}
                    placeholder="과목 선택"
                    showColor={true}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="숙제 상세 설명 (옵션)"
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">우선순위</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) =>
                      setPriority(value as 'low' | 'normal' | 'high' | 'urgent')
                    }
                  >
                    <SelectTrigger id="priority" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">낮음</SelectItem>
                      <SelectItem value="normal">보통</SelectItem>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="urgent">긴급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dueDate">마감일 *</Label>
                  <div className="mt-2">
                    <DatePicker
                      value={dueDate}
                      onChange={setDueDate}
                      placeholder="마감일 선택"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  취소
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={submitting || selectedStudents.length === 0}
                >
                  <BookCopy className="h-4 w-4 mr-2" />
                  {submitting ? '출제 중...' : `${selectedStudents.length}명에게 출제`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
