'use client'

import { Button } from '@ui/button'
import { Card, CardContent } from '@ui/card'
import { FileText, Send } from 'lucide-react'

interface KakaoIntegrationFooterCardsProps {
  onOpenTestSend: () => void
  onOpenSendHistory: () => void
  testEnabled: boolean
}

export function KakaoIntegrationFooterCards({
  onOpenTestSend,
  onOpenSendHistory,
  testEnabled,
}: KakaoIntegrationFooterCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">연동 테스트</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              카카오 알림톡 연동이 정상적으로 작동하는지 테스트해보세요.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenTestSend} disabled={!testEnabled}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            테스트 발송
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">발송 내역</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              알림톡 발송 내역을 확인할 수 있습니다.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenSendHistory}>
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            발송 내역 보기
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
