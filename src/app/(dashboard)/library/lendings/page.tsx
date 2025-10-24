'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Search, Plus, BookOpen, Calendar, AlertCircle, CheckCircle, Send, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import Link from 'next/link'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface BookLending {
  id: string
  borrowed_at: string
  due_date: string
  returned_at: string | null
  notes: string | null
  reminder_sent_at: string | null
  books: {
    title: string
    author: string | null
    barcode: string | null
  } | null
  students: {
    id: string
    student_code: string
    users: {
      name: string
    } | null
  } | null
}

export default function BookLendingsPage() {
  // All Hooks must be called before any early returns
  const [lendings, setLendings] = useState<BookLending[]>([])
  const [filteredLendings, setFilteredLendings] = useState<BookLending[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue' | 'returned'>('active')
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadLendings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    filterLendings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterStatus, lendings])

  // Function definitions
  async function loadLendings() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('book_lendings')
        .select(`
          id,
          borrowed_at,
          due_date,
          returned_at,
          notes,
          reminder_sent_at,
          books (
            title,
            author,
            barcode
          ),
          students (
            id,
            student_code,
            users (name)
          )
        `)
        .order('borrowed_at', { ascending: false })

      if (error) throw error
      setLendings(data as unknown as BookLending[])
    } catch (error) {
      console.error('Error loading lendings:', error)
      toast({
        title: '데이터 로드 오류',
        description: '대출 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function filterLendings() {
    let filtered = lendings

    // Status filter
    const today = new Date().toISOString().split('T')[0]
    if (filterStatus === 'active') {
      filtered = filtered.filter((l) => !l.returned_at)
    } else if (filterStatus === 'overdue') {
      filtered = filtered.filter((l) => !l.returned_at && l.due_date < today)
    } else if (filterStatus === 'returned') {
      filtered = filtered.filter((l) => l.returned_at)
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((lending) => {
        const bookTitle = lending.books?.title?.toLowerCase() || ''
        const author = lending.books?.author?.toLowerCase() || ''
        const studentName = lending.students?.users?.name?.toLowerCase() || ''
        const studentCode = lending.students?.student_code?.toLowerCase() || ''
        const barcode = lending.books?.barcode?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()

        return (
          bookTitle.includes(search) ||
          author.includes(search) ||
          studentName.includes(search) ||
          studentCode.includes(search) ||
          barcode.includes(search)
        )
      })
    }

    setFilteredLendings(filtered)
  }

  async function handleReturn(lendingId: string) {
    try {
      const { error } = await supabase
        .from('book_lendings')
        .update({
          returned_at: new Date().toISOString().split('T')[0],
          return_condition: 'good',
        })
        .eq('id', lendingId)

      if (error) throw error

      toast({
        title: '반납 처리 완료',
        description: '도서가 반납 처리되었습니다.',
      })

      loadLendings()
    } catch (error) {
      console.error('Error returning book:', error)
      toast({
        title: '반납 처리 오류',
        description: '도서 반납 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  async function handleSendReminder(lending: BookLending) {
    try {
      // Log the reminder
      await supabase.from('notification_logs').insert({
        student_id: lending.students?.id,
        notification_type: 'sms',
        status: 'sent',
        message: `${lending.books?.title} 도서 반납일(${lending.due_date})이 도래했습니다.`,
        sent_at: new Date().toISOString(),
      })

      // Update reminder_sent_at
      await supabase
        .from('book_lendings')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', lending.id)

      toast({
        title: '알림 전송 완료',
        description: `${lending.students?.users?.name} 학생에게 반납 알림이 전송되었습니다.`,
      })

      loadLendings()
    } catch (error) {
      console.error('Error sending reminder:', error)
      toast({
        title: '알림 전송 오류',
        description: '알림 전송 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  async function handleBulkReminder() {
    const today = new Date().toISOString().split('T')[0]
    const overdueLendings = lendings.filter(
      (l) => !l.returned_at && l.due_date < today && !l.reminder_sent_at
    )

    if (overdueLendings.length === 0) {
      toast({
        title: '알림 대상 없음',
        description: '알림을 보낼 연체 도서가 없습니다.',
      })
      return
    }

    if (!confirm(`${overdueLendings.length}명에게 반납 알림을 전송하시겠습니까?`)) {
      return
    }

    try {
      for (const lending of overdueLendings) {
        await supabase.from('notification_logs').insert({
          student_id: lending.students?.id,
          notification_type: 'sms',
          status: 'sent',
          message: `${lending.books?.title} 도서 반납일(${lending.due_date})이 지났습니다. 반납 부탁드립니다.`,
          sent_at: new Date().toISOString(),
        })

        await supabase
          .from('book_lendings')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', lending.id)
      }

      toast({
        title: '일괄 알림 전송 완료',
        description: `${overdueLendings.length}명에게 반납 알림이 전송되었습니다.`,
      })

      loadLendings()
    } catch (error) {
      console.error('Error sending bulk reminder:', error)
      toast({
        title: '일괄 알림 전송 오류',
        description: '일괄 알림 전송 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  function getStatusBadge(lending: BookLending) {
    if (lending.returned_at) {
      return <Badge variant="outline" className="bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />반납 완료</Badge>
    }

    const today = new Date().toISOString().split('T')[0]
    const isOverdue = lending.due_date < today

    if (isOverdue) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />연체</Badge>
    }

    const daysUntilDue = Math.ceil(
      (new Date(lending.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilDue <= 3) {
      return <Badge variant="secondary" className="bg-yellow-50"><Calendar className="h-3 w-3 mr-1" />반납 임박 ({daysUntilDue}일)</Badge>
    }

    return <Badge variant="outline">대출 중</Badge>
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.libraryManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="도서 대출 관리" description="도서 대출 현황을 관리하고 연체 알림을 자동으로 전송할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="도서 대출 관리" reason="도서 대출 시스템 업데이트가 진행 중입니다." />;
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </PageWrapper>
    )
  }

  const stats = {
    total: lendings.length,
    active: lendings.filter((l) => !l.returned_at).length,
    overdue: lendings.filter((l) => {
      const today = new Date().toISOString().split('T')[0]
      return !l.returned_at && l.due_date < today
    }).length,
    returned: lendings.filter((l) => l.returned_at).length,
  }

  return (
    <PageWrapper
      title="도서 대출 관리"
      subtitle="도서 대출 현황을 관리하고 반납 알림을 전송하세요"
      actions={
        <div className="flex gap-2">
          {stats.overdue > 0 && (
            <Button variant="outline" onClick={handleBulkReminder}>
              <Send className="h-4 w-4 mr-2" />
              연체 알림 ({stats.overdue}건)
            </Button>
          )}
          <Button onClick={() => router.push('/library/lendings/new')}>
            <Plus className="h-4 w-4 mr-2" />
            대출 등록
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="도서명, 저자, 학생명, 바코드로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              전체 ({stats.total})
            </Button>
            <Button
              variant={filterStatus === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('active')}
            >
              대출 중 ({stats.active})
            </Button>
            <Button
              variant={filterStatus === 'overdue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('overdue')}
            >
              연체 ({stats.overdue})
            </Button>
            <Button
              variant={filterStatus === 'returned' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('returned')}
            >
              반납 완료 ({stats.returned})
            </Button>
          </div>
        </div>

        {/* Lendings Table */}
        <Card>
          <CardHeader>
            <CardTitle>대출 목록</CardTitle>
            <CardDescription>도서 대출 현황 및 반납 관리</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLendings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>표시할 대출 기록이 없습니다.</p>
                {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학생</TableHead>
                      <TableHead>도서</TableHead>
                      <TableHead>대출일</TableHead>
                      <TableHead>반납 예정일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>알림</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLendings.map((lending) => (
                      <TableRow key={lending.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {lending.students?.users?.name || '이름 없음'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {lending.students?.student_code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{lending.books?.title}</div>
                            {lending.books?.author && (
                              <div className="text-xs text-muted-foreground">
                                {lending.books.author}
                              </div>
                            )}
                            {lending.books?.barcode && (
                              <div className="text-xs text-muted-foreground">
                                #{lending.books.barcode}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(lending.borrowed_at).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(lending.due_date).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell>{getStatusBadge(lending)}</TableCell>
                        <TableCell>
                          {lending.reminder_sent_at ? (
                            <div className="text-xs text-muted-foreground">
                              {new Date(lending.reminder_sent_at).toLocaleDateString('ko-KR')}
                            </div>
                          ) : !lending.returned_at ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendReminder(lending)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              전송
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!lending.returned_at && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReturn(lending.id)}
                            >
                              반납 처리
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>전체 대출</CardDescription>
              <CardTitle className="text-3xl">{stats.total}건</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>대출 중</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{stats.active}건</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>연체</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.overdue}건</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>반납 완료</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.returned}건</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
