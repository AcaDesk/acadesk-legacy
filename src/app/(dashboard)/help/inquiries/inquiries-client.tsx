'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { MessageCircle, Clock, CheckCircle, XCircle, Plus, AlertTriangle } from 'lucide-react'
import { InquiryDialog } from '@/components/layout/inquiry-dialog'
import { BugReportDialog } from '@/components/layout/bug-report-dialog'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Ticket {
  id: string
  ticket_type: 'inquiry' | 'bug_report' | 'feedback'
  category: string | null
  subject: string
  message: string
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  severity: string | null
  page: string | null
  response: string | null
  responded_at: string | null
  created_at: string
}

interface InquiriesClientProps {
  initialInquiries: Ticket[]
}

const typeLabels: Record<string, string> = {
  inquiry: '문의',
  bug_report: '버그 제보',
  feedback: '피드백',
}

const typeColors: Record<string, string> = {
  inquiry: 'bg-info/10 text-info',
  bug_report: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  feedback: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
}

export function InquiriesClient({ initialInquiries }: InquiriesClientProps) {
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            대기중
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-info/10 text-info border-info/20">
            <Clock className="h-3 w-3 mr-1" />
            처리중
          </Badge>
        )
      case 'resolved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            답변완료
          </Badge>
        )
      case 'closed':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            <XCircle className="h-3 w-3 mr-1" />
            종료
          </Badge>
        )
    }
  }

  const getTypeIcon = (type: Ticket['ticket_type']) => {
    switch (type) {
      case 'bug_report':
        return <AlertTriangle className="h-3.5 w-3.5" />
      default:
        return null
    }
  }

  return (
    <>
      <div className="flex justify-end gap-2 mb-6">
        <Button onClick={() => setBugReportOpen(true)} variant="outline">
          버그 제보
        </Button>
        <Button onClick={() => setInquiryOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          새 문의
        </Button>
      </div>

      <div className="space-y-4">
        {initialInquiries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">아직 문의 내역이 없습니다</p>
              <Button onClick={() => setInquiryOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                첫 문의하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          initialInquiries.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="secondary" className={typeColors[ticket.ticket_type]}>
                        {getTypeIcon(ticket.ticket_type)}
                        {typeLabels[ticket.ticket_type]}
                      </Badge>
                      {ticket.category && (
                        <Badge variant="secondary">{ticket.category}</Badge>
                      )}
                      {getStatusBadge(ticket.status)}
                    </div>
                    <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                    <CardDescription className="mt-1">
                      {formatDistanceToNow(new Date(ticket.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 문의 내용 */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {ticket.message}
                  </p>
                </div>

                {/* 답변 */}
                {ticket.response && (
                  <div className="border-l-4 border-primary pl-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>답변</span>
                      {ticket.responded_at && (
                        <span className="text-muted-foreground font-normal">
                          ·{' '}
                          {formatDistanceToNow(new Date(ticket.responded_at), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{ticket.response}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      <InquiryDialog open={inquiryOpen} onOpenChange={setInquiryOpen} />
      <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
    </>
  )
}
