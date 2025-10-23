'use client'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { MessageCircle, Clock, CheckCircle, XCircle, Plus } from 'lucide-react'
import { useState } from 'react'
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
  createdAt: Date
  respondedAt?: Date
  response?: string
}

export default function InquiriesPage() {
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)

  // 임시 데이터 (실제로는 API에서 가져와야 함)
  const [inquiries] = useState<Inquiry[]>([
    {
      id: '1',
      type: 'inquiry',
      category: '기능 문의',
      subject: '엑셀 내보내기 기능 문의',
      message: '학생 데이터를 엑셀로 내보낼 때 특정 필드만 선택할 수 있나요?',
      status: 'resolved',
      createdAt: new Date(2025, 9, 10),
      respondedAt: new Date(2025, 9, 11),
      response: '네, 가능합니다. 엑셀 내보내기 대화상자에서 "필드 선택" 옵션을 통해 원하는 필드만 선택하여 내보낼 수 있습니다.'
    },
    {
      id: '2',
      type: 'bug',
      category: '버그 제보',
      subject: '출석 체크 저장 오류',
      message: '출석 체크 후 저장 버튼을 클릭해도 간헐적으로 저장이 안 되는 현상이 있습니다.',
      status: 'in_progress',
      createdAt: new Date(2025, 9, 12),
    },
    {
      id: '3',
      type: 'inquiry',
      category: '사용법 문의',
      subject: '과제 템플릿 사용 방법',
      message: '과제 템플릿을 만들어두고 매주 반복해서 사용하고 싶습니다.',
      status: 'resolved',
      createdAt: new Date(2025, 9, 8),
      respondedAt: new Date(2025, 9, 9),
      response: 'TODO 관리 > 템플릿 관리 메뉴에서 템플릿을 생성하실 수 있습니다. 자세한 방법은 사용 가이드를 참고해주세요.'
    },
    {
      id: '4',
      type: 'inquiry',
      category: '결제 문의',
      subject: '플랜 업그레이드 문의',
      message: '현재 베이직 플랜을 사용 중인데 프로 플랜으로 업그레이드하고 싶습니다.',
      status: 'pending',
      createdAt: new Date(2025, 9, 13),
    },
  ])

  const getStatusBadge = (status: Inquiry['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          대기중
        </Badge>
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          처리중
        </Badge>
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          답변완료
        </Badge>
      case 'closed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <XCircle className="h-3 w-3 mr-1" />
          종료
        </Badge>
    }
  }

  return (
    <>
      <PageWrapper
        title="문의 내역"
        subtitle="내가 보낸 문의와 버그 제보를 확인하세요"
        icon={<MessageCircle className="w-6 h-6" />}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setBugReportOpen(true)} variant="outline">
              버그 제보
            </Button>
            <Button onClick={() => setInquiryOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              새 문의
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {inquiries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  아직 문의 내역이 없습니다
                </p>
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
                        {formatDistanceToNow(inquiry.createdAt, {
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
                      {inquiry.message}
                    </p>
                  </div>

                  {/* 답변 */}
                  {inquiry.response && (
                    <div className="border-l-4 border-primary pl-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>답변</span>
                        {inquiry.respondedAt && (
                          <span className="text-muted-foreground font-normal">
                            · {formatDistanceToNow(inquiry.respondedAt, {
                              addSuffix: true,
                              locale: ko,
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {inquiry.response}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </PageWrapper>

      {/* 다이얼로그들 */}
      <InquiryDialog open={inquiryOpen} onOpenChange={setInquiryOpen} />
      <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
    </>
  )
}
