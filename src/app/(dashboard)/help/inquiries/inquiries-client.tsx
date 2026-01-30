'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { MessageCircle, Clock, CheckCircle, XCircle, Plus } from 'lucide-react'
import { InquiryDialog } from '@/components/layout/inquiry-dialog'
import { BugReportDialog } from '@/components/layout/bug-report-dialog'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Inquiry {
  id: string
  type: 'inquiry' | 'bug'
  category: string
  subject: string
  message: string
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  createdAt: string
  respondedAt?: string
  response?: string
}

interface InquiriesClientProps {
  initialInquiries: Inquiry[]
}

export function InquiriesClient({ initialInquiries }: InquiriesClientProps) {
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)
  const [inquiries] = useState<Inquiry[]>(initialInquiries)

  const getStatusBadge = (status: Inquiry['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            대기중
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            처리중
          </Badge>
        )
      case 'resolved':
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            답변완료
          </Badge>
        )
      case 'closed':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="h-3 w-3 mr-1" />
            종료
          </Badge>
        )
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
        {inquiries.length === 0 ? (
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
          inquiries.map((inquiry) => (
            <Card key={inquiry.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{inquiry.category}</Badge>
                      {getStatusBadge(inquiry.status)}
                    </div>
                    <CardTitle className="text-lg">{inquiry.subject}</CardTitle>
                    <CardDescription className="mt-1">
                      {formatDistanceToNow(new Date(inquiry.createdAt), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Inquiry Content */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {inquiry.message}
                  </p>
                </div>

                {/* Response */}
                {inquiry.response && (
                  <div className="border-l-4 border-primary pl-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>답변</span>
                      {inquiry.respondedAt && (
                        <span className="text-muted-foreground font-normal">
                          ·{' '}
                          {formatDistanceToNow(new Date(inquiry.respondedAt), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{inquiry.response}</p>
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
