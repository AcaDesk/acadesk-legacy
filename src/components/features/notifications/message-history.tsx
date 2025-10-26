'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Calendar } from '@ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'
import { CalendarIcon, RefreshCw, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getMessageHistory } from '@/app/actions/messages'
import { useToast } from '@/hooks/use-toast'
import { EmptyState } from '@ui/empty-state'
import { MessageSquare } from 'lucide-react'

interface MessageHistoryProps {
  className?: string
}

export function MessageHistory({ className }: MessageHistoryProps) {
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [messageType, setMessageType] = useState<'all' | 'SMS' | 'LMS' | 'MMS'>('all')
  const [limit, setLimit] = useState(20)
  const [dateRange, setDateRange] = useState<{
    from: Date
    to: Date
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  })

  const { toast } = useToast()

  useEffect(() => {
    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadMessages() {
    setLoading(true)
    try {
      const result = await getMessageHistory({
        limit,
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd'),
        type: messageType === 'all' ? undefined : messageType,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || '메시지 이력 조회 실패')
      }

      setMessages(result.data.messageList || [])
    } catch (error) {
      console.error('Error loading messages:', error)
      toast({
        title: '메시지 이력 조회 실패',
        description: error instanceof Error ? error.message : '메시지 이력을 불러올 수 없습니다',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(statusCode: string) {
    switch (statusCode) {
      case 'PENDING':
        return <Badge variant="secondary">대기중</Badge>
      case 'SENDING':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">발송중</Badge>
      case 'SENT':
      case 'COMPLETE':
        return <Badge variant="default" className="bg-green-100 text-green-800">성공</Badge>
      case 'FAILED':
        return <Badge variant="destructive">실패</Badge>
      default:
        return <Badge variant="outline">{statusCode}</Badge>
    }
  }

  function getTypeBadge(type: string) {
    switch (type) {
      case 'SMS':
        return <Badge variant="default">SMS</Badge>
      case 'LMS':
        return <Badge variant="default" className="bg-blue-600">LMS</Badge>
      case 'MMS':
        return <Badge variant="default" className="bg-purple-600">MMS</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Message Type */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">메시지 타입</label>
              <Select
                value={messageType}
                onValueChange={(value: any) => setMessageType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="LMS">LMS</SelectItem>
                  <SelectItem value="MMS">MMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limit */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">조회 개수</label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10개</SelectItem>
                  <SelectItem value="20">20개</SelectItem>
                  <SelectItem value="50">50개</SelectItem>
                  <SelectItem value="100">100개</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">조회 기간</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(dateRange.from, 'yy.MM.dd', { locale: ko })} -{' '}
                    {format(dateRange.to, 'yy.MM.dd', { locale: ko })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setDateRange({
                          from: new Date(new Date().setDate(new Date().getDate() - 1)),
                          to: new Date(),
                        })
                      }}
                    >
                      오늘
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setDateRange({
                          from: new Date(new Date().setDate(new Date().getDate() - 7)),
                          to: new Date(),
                        })
                      }}
                    >
                      최근 7일
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setDateRange({
                          from: new Date(new Date().setDate(new Date().getDate() - 30)),
                          to: new Date(),
                        })
                      }}
                    >
                      최근 30일
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Apply Button */}
            <div className="flex items-end">
              <Button onClick={loadMessages} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                조회
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">메시지 이력</CardTitle>
          <CardDescription>
            총 {messages.length}개의 메시지
          </CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="메시지 이력이 없습니다"
              description="조건을 변경하거나 메시지를 발송해보세요"
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>발송일시</TableHead>
                    <TableHead>타입</TableHead>
                    <TableHead>수신번호</TableHead>
                    <TableHead>메시지</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message: any, index) => (
                    <TableRow key={message.messageId || index}>
                      <TableCell className="text-sm">
                        {message.dateCreated
                          ? format(new Date(message.dateCreated), 'yy.MM.dd HH:mm', { locale: ko })
                          : '-'}
                      </TableCell>
                      <TableCell>{getTypeBadge(message.type)}</TableCell>
                      <TableCell className="font-mono text-sm">{message.to || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {message.text || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(message.statusCode)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
