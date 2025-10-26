'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import { Checkbox } from '@ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Badge } from '@ui/badge'
import { Search, BookCopy, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { createHomework } from '@/app/actions/homeworks'
import { getErrorMessage } from '@/lib/error-handlers'
import { DatePicker } from '@ui/date-picker'

interface Student {
  id: string
  student_code: string
  user_id: {
    name: string
  } | null
}

export default function NewHomeworkPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form data
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadStudents()
    // Set default due date to 7 days from now
    const defaultDueDate = new Date()
    defaultDueDate.setDate(defaultDueDate.getDate() + 7)
    setDueDate(defaultDueDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      setFilteredStudents(data as unknown as Student[])
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

  async function handleSubmit() {
    if (!title.trim()) {
      toast({
        title: '입력 오류',
        description: '숙제 제목을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (selectedStudents.size === 0) {
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
        studentIds: Array.from(selectedStudents),
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
        description: `${selectedStudents.size}명의 학생에게 숙제가 출제되었습니다.`,
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
            <CardContent className="space-y-4">
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
                  {selectedStudents.size === filteredStudents.length ? '전체 해제' : '전체 선택'}
                </Button>
              </div>

              <div className="border rounded-lg p-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
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
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="예: 수학, 영어, 국어"
                  className="mt-2"
                />
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
                  disabled={submitting || selectedStudents.size === 0}
                >
                  <BookCopy className="h-4 w-4 mr-2" />
                  {submitting ? '출제 중...' : `${selectedStudents.size}명에게 출제`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
