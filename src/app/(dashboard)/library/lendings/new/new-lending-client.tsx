'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@ui/button'
import { Label } from '@ui/label'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { createBookLending } from '@/app/actions/book-lendings'
import { useToast } from '@/hooks/use-toast'

interface NewLendingClientProps {
  students: Array<{
    id: string
    name: string
    studentCode: string
  }>
  textbooks: Array<{
    id: string
    title: string
    author: string | null
    barcode: string | null
    isAvailable: boolean
  }>
}

function getTodayKST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

function getDefaultDueDate(startYmd: string): string {
  const [y, m, d] = startYmd.split('-').map(Number)
  const utcDate = new Date(Date.UTC(y, m - 1, d))
  utcDate.setUTCDate(utcDate.getUTCDate() + 14)
  return utcDate.toISOString().slice(0, 10)
}

export function NewLendingClient({ students, textbooks }: NewLendingClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const today = useMemo(() => getTodayKST(), [])
  const [studentId, setStudentId] = useState('')
  const [textbookId, setTextbookId] = useState('')
  const [borrowedAt, setBorrowedAt] = useState(today)
  const [dueDate, setDueDate] = useState(getDefaultDueDate(today))
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableTextbooks = useMemo(
    () => textbooks.filter((textbook) => textbook.isAvailable),
    [textbooks]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!studentId || !textbookId) {
      toast({
        title: '입력 확인 필요',
        description: '학생과 교재를 모두 선택하세요.',
        variant: 'destructive',
      })
      return
    }

    if (dueDate < borrowedAt) {
      toast({
        title: '날짜 확인 필요',
        description: '반납 예정일은 대출일 이후여야 합니다.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createBookLending({
        studentId,
        textbookId,
        borrowedAt,
        dueDate,
        notes: notes.trim() || undefined,
      })

      if (!result.success) {
        throw new Error(result.error || '대출 등록 실패')
      }

      toast({
        title: '대출 등록 완료',
        description: '교재 대출이 등록되었습니다.',
      })
      router.push('/library/lendings')
      router.refresh()
    } catch (error) {
      console.error('create lending error:', error)
      toast({
        title: '대출 등록 실패',
        description: '대출 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/library/lendings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">대출 등록</h1>
          <p className="text-muted-foreground">학생에게 교재 대출을 등록합니다.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>대출 정보</CardTitle>
            <CardDescription>필수 항목을 입력한 뒤 등록하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>학생</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="학생 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.studentCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>교재</Label>
                <Select value={textbookId} onValueChange={setTextbookId}>
                  <SelectTrigger>
                    <SelectValue placeholder="교재 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTextbooks.map((textbook) => (
                      <SelectItem key={textbook.id} value={textbook.id}>
                        {textbook.title}
                        {textbook.author ? ` / ${textbook.author}` : ''}
                        {textbook.barcode ? ` / #${textbook.barcode}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="borrowedAt">대출일</Label>
                <Input
                  id="borrowedAt"
                  type="date"
                  value={borrowedAt}
                  onChange={(e) => setBorrowedAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">반납 예정일</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">메모</Label>
              <Textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="대출 관련 참고사항이 있으면 입력하세요."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push('/library/lendings')}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '등록 중...' : '대출 등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
